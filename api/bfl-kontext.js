// BFL Kontext — Serverless function for FLUX image generation/editing via Black Forest Labs API
// Vercel Serverless (Node.js runtime)
// Supports: text-to-image (Kontext Pro) and image editing (Kontext Pro + input_image)

export const config = {
  maxDuration: 60
};

const BFL_BASE = 'https://api.bfl.ml/v1';

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
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    try {
      const pollRes = await fetch(`${BFL_BASE}/get_result?id=${encodeURIComponent(id)}`, {
        headers: { 'X-Key': apiKey }
      });

      if (!pollRes.ok) {
        console.error('[bfl-kontext] Poll failed:', pollRes.status);
        return res.status(pollRes.status).json({ error: 'Failed to fetch task status' });
      }

      const result = await pollRes.json();
      // BFL status: "Ready", "Pending", "Error", "Request Moderated", "Content Moderated"
      const bflStatus = result.status;
      let normalizedStatus = 'processing';
      if (bflStatus === 'Ready') normalizedStatus = 'succeeded';
      else if (bflStatus === 'Error' || bflStatus === 'Request Moderated' || bflStatus === 'Content Moderated') normalizedStatus = 'failed';

      const imageUrl = result.result?.sample || null;

      return res.status(200).json({
        id: result.id || id,
        status: normalizedStatus,
        image: imageUrl,
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
    const { prompt, model, width, height, steps, guidance, output_format, seed } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    // Collect input images: input_image, input_image_2 ... input_image_8
    // Accepts base64 strings OR URLs (BFL handles both)
    const inputImageKeys = ['input_image', 'input_image_2', 'input_image_3', 'input_image_4',
                            'input_image_5', 'input_image_6', 'input_image_7', 'input_image_8'];
    const hasAnyImage = inputImageKeys.some(k => !!req.body[k]);

    // Determine endpoint: editing (has input images) vs text-to-image
    const modelKey = model || (hasAnyImage ? 'flux-kontext-pro' : 'flux-pro-1.1-ultra');
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
    console.log('[bfl] Creating task:', {
      model: modelKey,
      imageCount,
      promptLength: prompt.length
    });

    try {
      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => '');
        let errData;
        try { errData = JSON.parse(errText); } catch (_) { errData = { raw: errText.slice(0, 500) }; }
        console.error('[bfl-kontext] BFL create failed:', createRes.status, errData);
        return res.status(502).json({
          error: 'BFL task failed to start',
          detail: errData?.detail || errData?.message || errData?.error || null,
          status: createRes.status
        });
      }

      const task = await createRes.json();
      console.log('[bfl-kontext] Task created:', task.id);

      return res.status(200).json({
        id: task.id,
        status: 'processing'
      });

    } catch (err) {
      console.error('[bfl-kontext] Create error:', err.message);
      return res.status(502).json({ error: 'Failed to create BFL task' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
