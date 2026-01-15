// =======================================
// FORCE NODE RUNTIME (CRITICAL FOR VERCEL)
// =======================================
export const runtime = 'nodejs';

export const config = {
  maxDuration: 120 // seconds
};

// =======================================
// Utilities
// =======================================
class ProviderError extends Error {
  constructor(provider, message) {
    super(message);
    this.provider = provider;
  }
}

function logAttempt(provider, context, promptLength, status, detail) {
  const payload = {
    provider,
    context,
    promptLength,
    status,
    timestamp: new Date().toISOString()
  };
  if (detail) payload.detail = detail;
  console.log('[IMAGE]', JSON.stringify(payload));
}

// =======================================
// GEMINI (PRIMARY)
// =======================================
async function callGemini(prompt, width, height, model) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new ProviderError('Gemini', 'GOOGLE_API_KEY missing');

  logAttempt('Gemini', 'api-call', prompt.length, 'START');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model || 'imagen-3.0-generate-002'}:generateImages?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        number_of_images: 1,
        aspect_ratio: width > height ? '16:9' : '1:1'
      })
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ProviderError('Gemini', data.error?.message || res.status);
  }

  const url = data.generated_images?.[0]?.image_uri;
  if (!url) throw new ProviderError('Gemini', 'No image returned');

  logAttempt('Gemini', 'api-call', prompt.length, 'SUCCESS');
  return url;
}

// =======================================
// OPENAI (FALLBACK)
// =======================================
async function callOpenAI(prompt, size, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ProviderError('OpenAI', 'OPENAI_API_KEY missing');

  logAttempt('OpenAI', 'api-call', prompt.length, 'START');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-image-1',
      prompt,
      size,
      n: 1
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ProviderError('OpenAI', data.error?.message || res.status);
  }

  const url = data.data?.[0]?.url;
  if (!url) throw new ProviderError('OpenAI', 'No image returned');

  logAttempt('OpenAI', 'api-call', prompt.length, 'SUCCESS');
  return url;
}

// =======================================
// FLUX via REPLICATE (LAST RESORT)
// =======================================
async function callFlux(prompt, width, height) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new ProviderError('Flux', 'REPLICATE_API_TOKEN missing');

  logAttempt('Flux', 'api-call', prompt.length, 'START');

  const create = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
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

  if (!create.ok) {
    throw new ProviderError('Flux', 'Prediction create failed');
  }

  let result = await create.json();
  let attempts = 0;

  while (
    result.status !== 'succeeded' &&
    result.status !== 'failed' &&
    attempts < 60
  ) {
    await new Promise(r => setTimeout(r, 2000));
    attempts++;

    const poll = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      { headers: { Authorization: `Token ${token}` } }
    );

    result = await poll.json();
  }

  if (result.status !== 'succeeded') {
    throw new ProviderError('Flux', 'Prediction failed or timed out');
  }

  const url = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!url) throw new ProviderError('Flux', 'No image returned');

  logAttempt('Flux', 'api-call', prompt.length, 'SUCCESS');
  return url;
}

// =======================================
// MAIN HANDLER
// =======================================
export default async function handler(req, res) {
  // ---- CORS ----
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    prompt: rawPrompt,
    model,
    size = '1024x1024',
    context = 'visualize'
  } = req.body || {};

  if (!rawPrompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // ---- Prompt clamp (book-cover bias) ----
  const MAX_LEN = context === 'setting-shot' ? 280 : 700;
  const prompt =
    rawPrompt.length > MAX_LEN
      ? rawPrompt.slice(0, MAX_LEN)
      : rawPrompt;

  const [width, height] = size.split('x').map(Number);

  const providers = [
    { name: 'Gemini', fn: () => callGemini(prompt, width, height, model) },
    { name: 'OpenAI', fn: () => callOpenAI(prompt, size, model) },
    { name: 'Flux', fn: () => callFlux(prompt, width, height) }
  ];

  for (const p of providers) {
    try {
      logAttempt(p.name, context, prompt.length, 'ATTEMPT');
      const url = await p.fn();
      return res.json({ url, provider: p.name });
    } catch (err) {
      logAttempt(p.name, context, prompt.length, 'FAIL', err.message);
    }
  }

  console.error('[IMAGE] All providers failed');
  return res.status(502).json({ error: 'Image generation failed' });
}
