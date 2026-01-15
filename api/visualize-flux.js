// Replicate FLUX Schnell - Serverless function for Storybound visualizations
// Vercel Serverless (Node.js runtime)

export const config = {
  maxDuration: 60 // 60 seconds for Replicate inference
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error('[visualize-flux] REPLICATE_API_TOKEN not configured');
    return res.status(500).json({ error: 'Replicate not configured' });
  }

  const { prompt, input = {} } = req.body;

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

  console.log('[visualize-flux] Starting prediction:', {
    promptLength: prompt.length,
    aspect_ratio: fluxInput.aspect_ratio,
    go_fast: fluxInput.go_fast
  });

  try {
    // Create prediction via Replicate HTTP API
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
      const errData = await createRes.json().catch(() => ({}));
      console.error('[visualize-flux] Replicate create failed:', errData);
      return res.status(502).json({ error: 'Replicate prediction failed to start' });
    }

    const prediction = await createRes.json();
    console.log('[visualize-flux] Prediction created:', prediction.id);

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2s = 60s max

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (!pollRes.ok) {
        console.error('[visualize-flux] Poll failed:', pollRes.status);
        continue;
      }

      result = await pollRes.json();
    }

    if (result.status === 'failed') {
      console.error('[visualize-flux] Prediction failed:', result.error);
      return res.status(502).json({ error: 'Image generation failed' });
    }

    if (result.status !== 'succeeded') {
      console.error('[visualize-flux] Prediction timed out');
      return res.status(504).json({ error: 'Image generation timed out' });
    }

    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    if (!imageUrl) {
      console.error('[visualize-flux] No output returned');
      return res.status(502).json({ error: 'No image returned' });
    }

    console.log('[visualize-flux] Success:', imageUrl.substring(0, 60) + '...');

    return res.status(200).json({
      image: imageUrl,
      output: result.output,
      provider: 'replicate-flux-schnell'
    });

  } catch (err) {
    console.error('[visualize-flux] Error:', err.message);
    return res.status(502).json({ error: 'Image generation failed' });
  }
}
