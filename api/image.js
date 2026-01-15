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

  // ---- GEMINI PRIMARY ----
  if (!provider || provider === 'gemini') {
    try {
      console.log('[IMAGE] Trying Gemini...');
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'imagen-3.0-generate-002'}:predict?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '16:9'
            }
          })
        }
      );

      // Safe JSON parse
      const text = await geminiRes.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[IMAGE] Gemini returned non-JSON:', text.slice(0, 200));
        data = null;
      }

      if (geminiRes.ok && data) {
        // Handle multiple response shapes
        const base64 = data.predictions?.[0]?.bytesBase64Encoded;
        const uri = data.predictions?.[0]?.image_uri || data.generated_images?.[0]?.image_uri;

        if (base64) {
          console.log('[IMAGE] Gemini success (base64)');
          return res.json({ url: `data:image/png;base64,${base64}`, provider: 'Gemini' });
        }
        if (uri) {
          console.log('[IMAGE] Gemini success (uri)');
          return res.json({ url: uri, provider: 'Gemini' });
        }
      }
      console.log('[IMAGE] Gemini failed:', data?.error?.message || 'no image in response');
    } catch (err) {
      console.error('[IMAGE] Gemini error:', err.message);
    }
  }

  // ---- OPENAI FALLBACK ----
  try {
    console.log('[IMAGE] Trying OpenAI...');
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

    // Safe JSON parse
    const text = await openaiRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[IMAGE] OpenAI returned non-JSON:', text.slice(0, 200));
      data = null;
    }

    if (openaiRes.ok && data) {
      // Handle both url and b64_json response shapes
      const url = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (url) {
        console.log('[IMAGE] OpenAI success (url)');
        return res.json({ url, provider: 'OpenAI' });
      }
      if (b64) {
        console.log('[IMAGE] OpenAI success (base64)');
        return res.json({ url: `data:image/png;base64,${b64}`, provider: 'OpenAI' });
      }
    }
    console.log('[IMAGE] OpenAI failed:', data?.error?.message || 'no image in response');
  } catch (err) {
    console.error('[IMAGE] OpenAI error:', err.message);
  }

  // All providers failed
  console.error('[IMAGE] All providers failed');
  return res.status(502).json({ error: 'Image generation failed' });
}
