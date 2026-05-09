/**
 * =============================================================================
 * STORYBOUND DEEPSEEK PROXY — SD FALLBACK ENDPOINT (TIER 1 + TIER 2)
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This endpoint handles fallback calls to DeepSeek when Grok (the specialist
 * renderer) fails for Scene Directive authoring. Sits between Grok and
 * Mistral in the SD fallback chain:
 *
 *   Grok (PRIMARY)
 *     ↓ on failure / soft-refusal
 *   DeepSeek V4 Pro (TIER 1 — embodied fallback)
 *     ↓ on failure / soft-refusal
 *   DeepSeek V4 Flash (TIER 2 — non-critical fallback)
 *     ↓ on failure / soft-refusal
 *   Mistral (TIER 3 — terminal safety net)
 *
 * DeepSeek is NOT a primary author. It renders within constraints set upstream.
 * Embodiment adapter is injected client-side before the call (orchestration-client.js).
 *
 * =============================================================================
 */

const ALLOWED_DEEPSEEK_MODELS = [
  'deepseek-v4-pro',
  'deepseek-v4-flash'
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    console.error('[DEEPSEEK-PROXY] DEEPSEEK_API_KEY not configured');
    return res.status(500).json({
      error: 'API key not configured',
      details: 'DEEPSEEK_API_KEY environment variable is not set.'
    });
  }

  try {
    const {
      messages,
      model = 'deepseek-v4-pro',
      role = 'SD_FALLBACK',
      temperature = 0.9,
      max_tokens = 500
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required',
        code: 'MISSING_MESSAGES'
      });
    }

    const requestedModel = model;

    if (!ALLOWED_DEEPSEEK_MODELS.includes(requestedModel)) {
      console.error(`[DEEPSEEK-PROXY] Model "${requestedModel}" not in allowlist.`);
      return res.status(400).json({
        error: 'Model not allowed',
        code: 'MODEL_VALIDATION_FAILED',
        requestedModel,
        allowedModels: ALLOWED_DEEPSEEK_MODELS
      });
    }

    console.log(`[DEEPSEEK-PROXY] Role: ${role}, Model: ${requestedModel}`);

    const dsResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: requestedModel,
        messages,
        temperature,
        max_tokens
      })
    });

    const responseText = await dsResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[DEEPSEEK-PROXY] Non-JSON response from DeepSeek:', responseText.slice(0, 500));
      return res.status(502).json({
        error: 'Invalid response from DeepSeek API',
        details: responseText.slice(0, 200)
      });
    }

    if (!dsResponse.ok) {
      console.error('[DEEPSEEK-PROXY] DeepSeek API error:', data);
      return res.status(dsResponse.status).json({
        error: data.error?.message || 'DeepSeek API request failed',
        details: data
      });
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[DEEPSEEK-PROXY] Malformed DeepSeek response:', data);
      return res.status(502).json({
        error: 'Malformed response from DeepSeek API',
        details: 'Response missing choices[0].message'
      });
    }

    const enrichedResponse = {
      ...data,
      _orchestration: {
        role,
        model: requestedModel,
        provider: 'deepseek',
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json(enrichedResponse);

  } catch (err) {
    console.error('[DEEPSEEK-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact DeepSeek API',
      details: err.message
    });
  }
};
