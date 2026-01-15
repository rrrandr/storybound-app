// FORCE NODE RUNTIME (IMPORTANT)
export const runtime = 'nodejs';

export const config = {
  maxDuration: 30 // keep this short and safe
};

export default async function handler(req, res) {
  // ------------------------
  // CORS (MANDATORY)
  // ------------------------
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ------------------------
  // INPUT
  // ------------------------
  const {
    prompt: rawPrompt,
    size = '1024x1024',
    model
  } = req.body || {};

  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Clamp prompt length (keeps providers happy)
  const MAX_PROMPT_LENGTH = 700;
  const prompt =
    rawPrompt.length > MAX_PROMPT_LENGTH
      ? rawPrompt.slice(0, MAX_PROMPT_LENGTH)
      : rawPrompt;

  const [width, height] = size.split('x').map(Number);

  // ------------------------
  // 1️⃣ GEMINI (PRIMARY)
  // ------------------------
  try {
    const geminiKey = process.env.GOOGLE_API_KEY;
    if (!geminiKey) {
      throw new Error('GOOGLE_API_KEY not set');
    }

    const aspectRatio = width > height ? '16:9' : '1:1';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || 'imagen-3.0-generate-002'}:predict?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio
          }
        })
      }
    );

    if (geminiRes.ok) {
      const data = await geminiRes.json();
      const imageBase64 = data?.predictions?.[0]?.bytesBase64Encoded;

      if (imageBase64) {
        return res.status(200).json({
          provider: 'gemini',
          url: `data:image/png;base64,${imageBase64}`,
          truncated: rawPrompt.length > MAX_PROMPT_LENGTH
        });
      }
    }

    console.warn('[IMAGE] Gemini returned no image, falling back');
  } catch (err) {
    console.warn('[IMAGE] Gemini failed:', err.message);
  }

  // ------------------------
  // 2️⃣ OPENAI (FALLBACK)
  // ------------------------
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not set');
    }

    const openaiRes = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-image-1',
          prompt,
          size,
          n: 1
        })
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(errText);
    }

    const data = await openaiRes.json();
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('OpenAI returned no image');
    }

    return res.status(200).json({
      provider: 'openai',
      url: imageUrl,
      truncated: rawPrompt.length > MAX_PROMPT_LENGTH
    });

  } catch (err) {
    console.error('[IMAGE] OpenAI failed:', err.message);
  }

  // ------------------------
  // ❌ ALL FAILED
  // ------------------------
  return res.status(502).json({
    error: 'Image generation failed'
  });
}
