export const runtime = 'nodejs';

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, provider, size = '1024x1024', model } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    // ---- GEMINI PRIMARY ----
    if (!provider || provider === 'gemini') {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model || 'imagen-3.0-generate-002'}:generateImages?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            number_of_images: 1,
            aspect_ratio: '16:9'
          })
        }
      );

      const data = await geminiRes.json();
      if (geminiRes.ok && data?.generated_images?.[0]?.image_uri) {
        return res.json({ url: data.generated_images[0].image_uri, provider: 'Gemini' });
      }
    }

    // ---- OPENAI FALLBACK ----
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'gpt-image-1',
        prompt,
        size,
        n: 1
      })
    });

    const data = await openaiRes.json();
    if (openaiRes.ok && data?.data?.[0]?.url) {
      return res.json({ url: data.data[0].url, provider: 'OpenAI' });
    }

    throw new Error('No image returned');

  } catch (err) {
    console.error('[IMAGE] Fatal error:', err);
    return res.status(502).json({ error: 'Image generation failed' });
  }
}
