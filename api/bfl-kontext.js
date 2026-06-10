// BFL Kontext — Serverless function for FLUX image generation/editing via Black Forest Labs API
// Vercel Serverless (Node.js runtime)
// Supports: text-to-image (Kontext Pro) and image editing (Kontext Pro + input_image)

export const config = {
  maxDuration: 120
};

const BFL_BASE = 'https://api.bfl.ai/v1';

// SECURITY: server-side prompt-injection scrub (CJS via default-import interop).
import _sanitizeInjectionMod from './_sanitize-injection.js';
const { stripInjectionFromText } = _sanitizeInjectionMod;

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const apiKey = process.env.BFL_API_KEY;
  console.log('[bfl] BFL_API_KEY configured:', !!apiKey);
  if (!apiKey) {
    console.error('[bfl] BFL_API_KEY not configured');
    return res.status(500).json({ error: 'BFL not configured' });
  }

  // Mode B: Poll task result
  // Prefer the `polling_url` returned by BFL on task creation (BFL recommends
  // this — they may shard polling across regions). Falls back to the legacy
  // `?id=` form for backward compatibility with in-flight client polls that
  // started before this change.
  if (req.method === 'GET') {
    const { id, polling_url } = req.query;
    if (!id && !polling_url) {
      return res.status(400).json({ error: 'Task ID or polling_url required' });
    }

    // Validate any provided polling_url is BFL-domain — refuse arbitrary URLs.
    let pollEndpoint;
    if (polling_url) {
      try {
        const u = new URL(polling_url);
        if (!/(^|\.)bfl\.(ai|ml)$/.test(u.hostname)) {
          return res.status(400).json({ error: 'Invalid polling_url host' });
        }
        pollEndpoint = u.toString();
      } catch (_) {
        return res.status(400).json({ error: 'Malformed polling_url' });
      }
    } else {
      pollEndpoint = `${BFL_BASE}/get_result?id=${encodeURIComponent(id)}`;
    }

    try {
      const pollRes = await fetch(pollEndpoint, {
        headers: {
          'Accept': 'application/json',
          'X-Key': apiKey
        }
      });

      if (!pollRes.ok) {
        const pollErrText = await pollRes.text().catch(() => '');
        console.error('[bfl-kontext] Poll failed:', pollRes.status, '| body:', pollErrText.slice(0, 1000));
        return res.status(pollRes.status).json({ error: 'Failed to fetch task status', status: pollRes.status, detail: pollErrText.slice(0, 500) });
      }

      const result = await pollRes.json();
      // BFL status: "Ready", "Pending", "Error", "Request Moderated", "Content Moderated"
      const bflStatus = result.status;
      let normalizedStatus = 'processing';
      if (bflStatus === 'Ready') normalizedStatus = 'succeeded';
      else if (bflStatus === 'Error' || bflStatus === 'Request Moderated' || bflStatus === 'Content Moderated') normalizedStatus = 'failed';

      const imageUrl = result.result?.sample || null;

      // ─────────────────────────────────────────────────────────────────
      // BFL delivers via `delivery.us2.bfl.ai` which does NOT send
      // Access-Control-Allow-Origin. The client previously received the
      // raw URL and tried to load it with crossOrigin=anonymous (for the
      // blank-image probe and any canvas/WebGL paths). The browser then
      // hard-failed the load — and the blank-image probe interprets a
      // load error as "blank", causing valid BFL renders to be discarded
      // and the chain to fall through to a degraded Gemini fallback.
      //
      // Fix: when a successful image URL is returned, fetch it server-
      // side and inline it as a base64 data URL. Same-origin → no CORS.
      // The endpoint already authenticates — adding an outbound fetch
      // here keeps the flow opaque to the client and removes the CORS
      // surface entirely. Roughly 1–2 MB per image; fits in the response.
      // ─────────────────────────────────────────────────────────────────
      // Inline-as-base64 path. On success the client receives a self-
      // contained data URL — no extra HTTP roundtrip, no CORS surface.
      // On failure (oversized image, fetch timeout, transient network
      // error from server → BFL CDN), fall through to the same-origin
      // /api/img-proxy URL so the client can still display the image
      // without hitting BFL directly.
      let resolvedImage = null;
      if (normalizedStatus === 'succeeded' && imageUrl) {
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            const ct = imgRes.headers.get('content-type') || 'image/png';
            resolvedImage = `data:${ct};base64,${buf.toString('base64')}`;
            console.log('[bfl-kontext] Inlined as base64 (', buf.length, 'bytes,', ct, ')');
          } else {
            console.warn('[bfl-kontext] Image inline fetch failed:', imgRes.status, '— routing through /api/img-proxy.');
          }
        } catch (inlineErr) {
          console.warn('[bfl-kontext] Image inline fetch threw:', inlineErr.message, '— routing through /api/img-proxy.');
        }
        // Fallback: same-origin proxy URL. Image is fetched again at
        // display time but at least it's CORS-clean.
        if (!resolvedImage) {
          resolvedImage = '/api/img-proxy?url=' + encodeURIComponent(imageUrl);
        }
      }

      return res.status(200).json({
        id: result.id || id,
        status: normalizedStatus,
        image: resolvedImage,
        error: normalizedStatus === 'failed' ? (bflStatus || 'BFL task failed') : null,
        provider: 'bfl'
      });

    } catch (err) {
      console.error('[bfl-kontext] Poll error:', err.message);
      return res.status(502).json({ error: 'Failed to poll task' });
    }
  }

  // Mode A: Create task
  if (req.method === 'POST') {
    const { prompt: _rawPrompt, model, width, height, steps, guidance, output_format, seed } = req.body;
    // SECURITY: scrub the user-typed prompt before forwarding to BFL.
    const prompt = typeof _rawPrompt === 'string' ? stripInjectionFromText(_rawPrompt) : _rawPrompt;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    // Collect input images: input_image, input_image_2 ... input_image_8
    // Accepts base64 strings OR URLs (BFL handles both)
    const inputImageKeys = ['input_image', 'input_image_2', 'input_image_3', 'input_image_4',
                            'input_image_5', 'input_image_6', 'input_image_7', 'input_image_8'];
    const hasAnyImage = inputImageKeys.some(k => !!req.body[k]);

    // Determine endpoint: editing (has input images) vs text-to-image
    const modelKey = model || (hasAnyImage ? 'flux-2-pro' : 'flux-2-pro');
    const endpoint = `${BFL_BASE}/${modelKey}`;

    const payload = { prompt };

    // Pass through all input images
    for (const k of inputImageKeys) {
      if (req.body[k]) payload[k] = req.body[k];
    }

    if (!hasAnyImage) {
      // Text-to-image: prompt + dimensions
      payload.width = width || 1024;
      payload.height = height || 1024;
    }

    // Optional parameters
    if (steps) payload.steps = steps;
    if (guidance) payload.guidance = guidance;
    payload.output_format = output_format || 'png';
    if (seed != null) payload.seed = seed;

    const imageCount = inputImageKeys.filter(k => !!req.body[k]).length;
    const payloadStr = JSON.stringify(payload);

    // ── Pre-request logging ──
    console.log('[bfl] Creating task:', {
      model: modelKey,
      endpoint,
      promptLength: prompt.length,
      imageCount,
      payloadBytes: payloadStr.length
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for BFL create
      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: payloadStr,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!createRes.ok) {
        // ── Full failure logging — BFL often returns useful error text even on 502 ──
        const rawText = await createRes.text().catch(() => '');
        console.error('[bfl-kontext] BFL create error: status=' + createRes.status + ' | body=' + rawText.slice(0, 1000));
        let errData;
        try { errData = JSON.parse(rawText); } catch (_) { errData = { raw: rawText.slice(0, 1000) }; }
        console.error('[bfl-kontext] BFL create failed:', {
          status: createRes.status,
          model: modelKey,
          imageCount,
          promptLength: prompt.length,
          errData
        });
        return res.status(502).json({
          error: 'BFL task failed to start',
          detail: errData?.detail || errData?.message || errData?.error || rawText.slice(0, 500) || null,
          status: createRes.status
        });
      }

      const task = await createRes.json();
      console.log('[bfl-kontext] Task created:', task.id, '(' + modelKey + ')', task.polling_url ? '(polling_url returned)' : '(no polling_url — using id fallback)');

      return res.status(200).json({
        id: task.id,
        polling_url: task.polling_url || null,
        status: 'processing'
      });

    } catch (err) {
      console.error('[bfl-kontext] Create error:', err.message, { model: modelKey, imageCount, promptLength: prompt.length });
      return res.status(502).json({ error: 'Failed to create BFL task', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
