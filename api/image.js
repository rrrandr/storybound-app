// PASS 2E: Image proxy with provider-aware error handling
// Vercel Serverless Function (Node.js runtime)

export const config = {
  maxDuration: 120 // 120 seconds for Replicate inference
};

// PASS 2E: Provider-specific error class
class ProviderError extends Error {
  constructor(provider, message, context = {}) {
    super(message);
    this.provider = provider;
    this.context = context;
  }
}

// PASS 2E: Dev-only logging helper
function logProviderAttempt(provider, context, promptLength, status, error = null) {
  const logData = {
    provider,
    context,
    promptLength,
    status,
    timestamp: new Date().toISOString()
  };
  if (error) logData.error = error;
  console.log(`[IMAGE-PROXY] ${JSON.stringify(logData)}`);
}

// PASS 2E: FLUX PROVIDER via Replicate HTTP API
async function callFlux(prompt, width, height) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new ProviderError('Flux', 'REPLICATE_API_TOKEN not configured');
  }

  logProviderAttempt('Flux', 'api-call', prompt.length, 'STARTING');

  // Replicate HTTP API - create prediction
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
    const errData = await createRes.json().catch(() => ({}));
    logProviderAttempt('Flux', 'api-call', prompt.length, 'CREATE_FAILED', errData.detail || createRes.status);
    throw new ProviderError('Flux', `Replicate create failed: ${errData.detail || createRes.status}`);
  }

  const prediction = await createRes.json();
  logProviderAttempt('Flux', 'api-call', prompt.length, 'PREDICTION_CREATED', prediction.id);

  // Poll for completion
  let result = prediction;
  let attempts = 0;
  const maxAttempts = 60; // 60 * 2s = 120s max

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 2000)); // Poll every 2s
    attempts++;

    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Token ${token}` }
    });

    if (!pollRes.ok) {
      logProviderAttempt('Flux', 'api-call', prompt.length, 'POLL_FAILED', pollRes.status);
      throw new ProviderError('Flux', `Replicate poll failed: ${pollRes.status}`);
    }

    result = await pollRes.json();
  }

  if (result.status === 'failed') {
    logProviderAttempt('Flux', 'api-call', prompt.length, 'PREDICTION_FAILED', result.error);
    throw new ProviderError('Flux', `Replicate prediction failed: ${result.error}`);
  }

  if (result.status !== 'succeeded') {
    logProviderAttempt('Flux', 'api-call', prompt.length, 'TIMEOUT');
    throw new ProviderError('Flux', 'Replicate prediction timed out');
  }

  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!imageUrl) {
    logProviderAttempt('Flux', 'api-call', prompt.length, 'NO_OUTPUT');
    throw new ProviderError('Flux', 'Replicate returned no image');
  }

  logProviderAttempt('Flux', 'api-call', prompt.length, 'SUCCESS');
  return imageUrl;
}

// PASS 2E: PERCHANCE PROVIDER (placeholder - implement based on your setup)
async function callPerchance(prompt, width, height) {
  logProviderAttempt('Perchance', 'api-call', prompt.length, 'STARTING');

  // Perchance integration would go here
  // For now, throw to trigger fallback
  throw new ProviderError('Perchance', 'Perchance not yet configured');
}

// PASS 2E: GEMINI PROVIDER
async function callGemini(prompt, width, height, model) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new ProviderError('Gemini', 'GOOGLE_API_KEY not configured');
  }

  logProviderAttempt('Gemini', 'api-call', prompt.length, 'STARTING');

  const aspectRatio = width > height ? '16:9' : '1:1';

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
    const errData = await res.json().catch(() => ({}));
    logProviderAttempt('Gemini', 'api-call', prompt.length, 'FAILED', errData.error?.message || res.status);
    throw new ProviderError('Gemini', `Gemini failed: ${errData.error?.message || res.status}`);
  }

  const data = await res.json();
  const imageData = data.predictions?.[0]?.bytesBase64Encoded;

  if (!imageData) {
    logProviderAttempt('Gemini', 'api-call', prompt.length, 'NO_OUTPUT');
    throw new ProviderError('Gemini', 'Gemini returned no image');
  }

  logProviderAttempt('Gemini', 'api-call', prompt.length, 'SUCCESS');
  return `data:image/png;base64,${imageData}`;
}

// PASS 2E: OPENAI PROVIDER (LAST RESORT)
async function callOpenAI(prompt, size, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ProviderError('OpenAI', 'OPENAI_API_KEY not configured');
  }

  logProviderAttempt('OpenAI', 'api-call', prompt.length, 'STARTING');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-image-1',
      prompt,
      size: size || '1024x1024',
      n: 1
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    logProviderAttempt('OpenAI', 'api-call', prompt.length, 'FAILED', errData.error?.message || res.status);
    throw new ProviderError('OpenAI', `OpenAI failed: ${errData.error?.message || res.status}`);
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;

  if (!imageUrl) {
    logProviderAttempt('OpenAI', 'api-call', prompt.length, 'NO_OUTPUT');
    throw new ProviderError('OpenAI', 'OpenAI returned no image');
  }

  logProviderAttempt('OpenAI', 'api-call', prompt.length, 'SUCCESS');
  return imageUrl;
}

// PASS 2E: Main handler
export default async function handler(req, res) {
  // CORS headers (MANDATORY for all responses)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight handling (MANDATORY)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // PASS 2E: DEV-ONLY TEST HOOK
  if (req.query.test === 'flux') {
    console.log('[IMAGE-PROXY] TEST HOOK: Flux direct test');
    try {
      const testPrompt = 'A cinematic oil painting of mountains at dusk, dramatic clouds, painterly realism';
      const imageUrl = await callFlux(testPrompt, 1024, 1024);
      return res.json({ url: imageUrl, test: true, provider: 'flux' });
    } catch (err) {
      console.error('[IMAGE-PROXY] TEST HOOK FAILED:', err.message);
      return res.status(502).json({ error: 'Flux test failed', details: err.message });
    }
  }

  const { prompt: rawPrompt, provider, model, size = '1024x1024', context = 'unknown' } = req.body;

  if (!rawPrompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // PASS 2E: PROMPT LENGTH CLAMP (MAX 700 CHARACTERS)
  const MAX_PROMPT_LENGTH = 700;
  const prompt = rawPrompt.length > MAX_PROMPT_LENGTH
    ? rawPrompt.substring(0, MAX_PROMPT_LENGTH)
    : rawPrompt;

  if (rawPrompt.length > MAX_PROMPT_LENGTH) {
    console.log(`[IMAGE-PROXY] Prompt truncated: ${rawPrompt.length} -> ${MAX_PROMPT_LENGTH}`);
  }

  const [width, height] = size.split('x').map(Number);

  // PASS 2E: Provider chain with fallback
  // Order: Flux -> Perchance -> Gemini -> OpenAI
  const providerChain = [
    { name: 'Flux', fn: () => callFlux(prompt, width, height) },
    { name: 'Perchance', fn: () => callPerchance(prompt, width, height) },
    { name: 'Gemini', fn: () => callGemini(prompt, width, height, model) },
    { name: 'OpenAI', fn: () => callOpenAI(prompt, size, model) }
  ];

  // If specific provider requested, try it first but still fallback
  if (provider && provider !== 'auto') {
    const requestedIndex = providerChain.findIndex(p => p.name.toLowerCase() === provider.toLowerCase());
    if (requestedIndex > 0) {
      const [requested] = providerChain.splice(requestedIndex, 1);
      providerChain.unshift(requested);
    }
  }

  let lastError = null;
  const failedProviders = [];

  // PASS 2E: FALLBACK CHAIN EXECUTION
  for (const providerEntry of providerChain) {
    try {
      logProviderAttempt(providerEntry.name, context, prompt.length, 'ATTEMPTING');
      const imageUrl = await providerEntry.fn();

      // Success - return result
      return res.json({
        url: imageUrl,
        provider: providerEntry.name,
        promptLength: prompt.length,
        truncated: rawPrompt.length > MAX_PROMPT_LENGTH
      });
    } catch (err) {
      lastError = err;
      failedProviders.push({
        provider: providerEntry.name,
        error: err.message
      });
      logProviderAttempt(providerEntry.name, context, prompt.length, 'FAILED', err.message);
      // Continue to next provider
    }
  }

  // PASS 2E: ALL PROVIDERS FAILED - return 502 with generic message
  console.error('[IMAGE-PROXY] All providers failed:', JSON.stringify(failedProviders));

  return res.status(502).json({
    error: 'Image generation failed',
    // Do not expose provider-specific errors to client
    failedCount: failedProviders.length
  });
}
