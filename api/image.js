// FORCE NODE RUNTIME (CRITICAL)
export const runtime = 'nodejs';

// Vercel function config
export const config = {
  maxDuration: 120 // seconds
};

// ----------------------------------
// Provider error wrapper
// ----------------------------------
class ProviderError extends Error {
  constructor(provider, message) {
    super(message);
    this.provider = provider;
  }
}

// ----------------------------------
// Logging helper (server-side only)
// ----------------------------------
function log(provider, stage, detail) {
  console.log(`[IMAGE] ${provider} | ${stage}`, detail || '');
}

// ----------------------------------
// GEMINI (PRIMARY)
// ----------------------------------
async function callGemini(prompt, width, height, model) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new ProviderError('Gemini', 'GOOGLE_API_KEY not set');
  }

  const aspectRatio = width > height ? '16:9' : '1:1';

  log('Gemini', 'START');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || 'imagen-3.0-generate-002'}:predict?key=${apiKey}`,
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

  if (!res.ok) {
    const text = await res.text();
    throw new ProviderError('Gemini', `HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const imageBase64 = data?.predictions?.[0]?.bytesBase64Encoded;

  if (!imageBase64) {
    throw new ProviderError('Gemini', 'No image returned');
  }

  log('Gemini', 'SUCCESS');
  return `data:image/png;base64,${imageBase64}`;
}

// ----------------------------------
// OPENAI (FALLBACK)
// ----------------------------------
async function callOpenAI(prompt, size, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ProviderError('OpenAI', 'OPENAI_API_KEY not set');
  }

  log('OpenAI', 'START');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-image-1',
      prompt,
      size,
      n: 1
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ProviderError('OpenAI', `HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const imageUrl = data?.data?.[0]?.url;

  if (!imageUrl) {
    throw new ProviderError('OpenAI', 'No image returned');
  }

  log('OpenAI', 'SUCCESS');
  return imageUrl;
}

// ----------------------------------
// FLUX / REPLICATE (LAST RESORT)
// ----------------------------------
async function callFlux(prompt, width, height) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new ProviderError('Flux', 'REPLICATE_API_TOKEN not set');
  }

  log('Flux', 'START');

  // Create prediction
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: '4f5b1200e42d5c980a35d92a96ec5afaf488429a88eae732d9e21559a30b0c88',
      input: {
        prompt,
        width: width || 1024,
        height: height || 1024,
        num_outputs: 1,
        guidance_scale: 3.5,
        num_inference_steps: 28
      }
    })
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new ProviderError('Flux', `Create failed: ${text}`);
  }

  let prediction = await createRes.json();

  // Poll
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Token ${token}` } }
    );

    if (!pollRes.ok) {
      throw new ProviderError('Flux', 'Poll failed');
    }

    prediction = await pollRes.json();

    if (prediction.status === 'succeeded') {
      const output = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;

      if (!output) {
        throw new ProviderError('Flux', 'No image returned');
      }

      log('Flux', 'SUCCESS');
      return output;
    }

    if (prediction.status === 'failed') {
      throw new ProviderError('Flux', prediction.error || 'Prediction failed');
    }
  }

  throw new ProviderError('Flux', 'Timed out');
}

// ----------------------------------
// MAIN HANDLER
// ----------------------------------
export default async function handler(req, res) {
  // CORS (safe, simple)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    prompt: rawPrompt,
    model,
    size = '1024x1024'
  } = req.body || {};

  if (!rawPrompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Clamp prompt length (platform-safe)
  const MAX_PROMPT_LENGTH = 700;
  const prompt =
    rawPrompt.length > MAX_PROMPT_LENGTH
      ? rawPrompt.slice(0, MAX_PROMPT_LENGTH)
      : rawPrompt;

  const [width, height] = size.split('x').map(Number);

  const providers = [
    { name: 'Gemini', fn: () => callGemini(prompt, width, height, model) },
    { name: 'OpenAI', fn: () => callOpenAI(prompt, size, model) },
    { name: 'Flux', fn: () => callFlux(prompt, width, height) }
  ];

  for (const p of providers) {
    try {
      const url = await p.fn();
      return res.json({
        url,
        provider: p.name,
        truncated: rawPrompt.length > MAX_PROMPT_LENGTH
      });
    } catch (err) {
      console.error(`[IMAGE] ${p.name} FAILED:`, err.message);
      // try next provider
    }
  }

  // Nothing worked
  return res.status(502).json({
    error: 'Image generation failed'
  });
}
