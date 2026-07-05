// Replicate FLUX Schnell - Serverless function for Storybound visualizations
// Vercel Serverless (Node.js runtime)

export const config = {
  maxDuration: 60 // 60 seconds for Replicate inference
};

// SECURITY: server-side prompt-injection scrub (CJS via default-import interop).
import _sanitizeInjectionMod from './_sanitize-injection.js';
const { stripInjectionFromText } = _sanitizeInjectionMod;

export default async function handler(req, res) {
  // CORS headers (MANDATORY for all responses)
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error('[visualize-flux] REPLICATE_API_TOKEN not configured');
    return res.status(500).json({ error: 'Replicate not configured' });
  }

  // Mode B: Poll prediction status
  if (req.method === 'GET') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Prediction ID required' });
    }

    try {
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (!pollRes.ok) {
        console.error('[visualize-flux] Poll failed:', pollRes.status);
        return res.status(pollRes.status).json({ error: 'Failed to fetch prediction status' });
      }

      const result = await pollRes.json();
      const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

      return res.status(200).json({
        id: result.id,
        status: result.status,
        image: imageUrl || null,
        output: result.output || null,
        error: result.error || null,
        provider: 'replicate-flux-schnell'
      });

    } catch (err) {
      console.error('[visualize-flux] Poll error:', err.message);
      return res.status(502).json({ error: 'Failed to poll prediction' });
    }
  }

  // Mode A: Create prediction
  if (req.method === 'POST') {
    const { prompt: _rawPrompt, input = {} } = req.body;
    // SECURITY: scrub the user-typed prompt before forwarding to FLUX.
    const prompt = typeof _rawPrompt === 'string' ? stripInjectionFromText(_rawPrompt) : _rawPrompt;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    // Default input parameters for FLUX Schnell
    const fluxInput = {
      prompt,
      go_fast: input.go_fast ?? true,
      num_outputs: input.num_outputs ?? 1,
      aspect_ratio: input.aspect_ratio ?? '16:9',
      output_format: input.output_format ?? 'webp',
      output_quality: input.output_quality ?? 80,
      num_inference_steps: 4 // Schnell uses 4 steps
    };

    console.log('[visualize-flux] Creating prediction:', {
      promptLength: prompt.length,
      aspect_ratio: fluxInput.aspect_ratio,
      go_fast: fluxInput.go_fast
    });

    try {
      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: '5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637',
          input: fluxInput
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => '');
        let errData; try { errData = JSON.parse(errText); } catch (_) { errData = { raw: errText.slice(0, 500) }; }
        console.error('[visualize-flux] Replicate create failed:', createRes.status, errData?.detail || errData?.error || errData?.raw || errData);
        return res.status(502).json({
          error: 'Replicate prediction failed to start',
          detail: errData?.detail || errData?.error || null,
          status: createRes.status
        });
      }

      const prediction = await createRes.json();
      console.log('[visualize-flux] Prediction created:', prediction.id);

      return res.status(200).json({
        id: prediction.id,
        status: prediction.status
      });

    } catch (err) {
      console.error('[visualize-flux] Create error:', err.message);
      return res.status(502).json({ error: 'Failed to create prediction' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
