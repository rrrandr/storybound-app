// Grok (xAI) image generation — CHEAP tier for CHARACTER-FREE shots only
// (landscapes / settings + object & hand closeups). OpenAI-compatible:
//   POST https://api.x.ai/v1/images/generations  { model, prompt }
//
// Roman 2026-06-19: routed PRIMARY only for shots that don't need identity lock
// (intent==='setting' OR both leads excluded from frame). Character-consistent
// shots stay on Gemini/BFL. On ANY failure the client chain falls back to
// Gemini → BFL → OpenAI, so a wrong model slug here degrades gracefully — flip
// XAI_IMAGE_MODEL (env) to correct it without a code change.
//
// Cost: grok-imagine-image ≈ $0.02/img (vs Gemini ~$0.02–0.04, Flux 2 Pro ~$0.045).
// Vercel Serverless (Node.js runtime).

export const config = { maxDuration: 60 };

// SECURITY: server-side prompt-injection scrub (CJS via default-import interop).
import _sanitizeInjectionMod from './_sanitize-injection.js';
const { stripInjectionFromText } = _sanitizeInjectionMod;

const XAI_BASE = 'https://api.x.ai/v1';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('[grok-image] XAI_API_KEY not configured');
    return res.status(500).json({ error: 'xAI not configured' });
  }

  const { prompt: _rawPrompt, model } = req.body || {};
  const prompt = typeof _rawPrompt === 'string' ? stripInjectionFromText(_rawPrompt) : _rawPrompt;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  // Cheap tier by default; env-overridable so a slug change needs no redeploy.
  const modelKey = model || process.env.XAI_IMAGE_MODEL || 'grok-imagine-image';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const r = await fetch(`${XAI_BASE}/images/generations`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelKey, prompt, n: 1, response_format: 'b64_json' }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('[grok-image] xAI error', r.status, '| model=' + modelKey, '|', t.slice(0, 500));
      return res.status(502).json({ error: 'xAI image failed', status: r.status, detail: t.slice(0, 300) });
    }

    const data = await r.json();
    const item = data && data.data && data.data[0];
    let image = null;
    if (item && item.b64_json) {
      image = 'data:image/png;base64,' + item.b64_json;
    } else if (item && item.url) {
      // Inline the URL as base64 (CORS-clean), mirroring bfl-kontext's approach.
      try {
        const ir = await fetch(item.url);
        if (ir.ok) {
          const buf = Buffer.from(await ir.arrayBuffer());
          const ct = ir.headers.get('content-type') || 'image/png';
          image = `data:${ct};base64,${buf.toString('base64')}`;
        }
      } catch (_) {}
      if (!image) image = item.url; // last-ditch: raw URL (client may still load it)
    }

    if (!image) {
      console.error('[grok-image] xAI returned no image | keys=', data ? Object.keys(data) : 'null');
      return res.status(502).json({ error: 'xAI returned no image' });
    }

    return res.status(200).json({ image, provider: 'grok', model: modelKey });
  } catch (err) {
    console.error('[grok-image] error:', err.message, '| model=' + modelKey);
    return res.status(502).json({ error: 'Failed to generate', detail: err.message });
  }
}
