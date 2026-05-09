/**
 * =============================================================================
 * STORYBOUND MISTRAL PROXY — SD FALLBACK ENDPOINT
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This endpoint handles fallback calls to Mistral AI when Grok
 * (the specialist renderer) fails for Scene Directive authoring.
 *
 * Mistral serves two roles:
 * 1. SD_FALLBACK — Scene Directive fallback when Grok SD authoring fails
 * 2. PROMPT_PREPROCESSOR — Image prompt optimization/cleaning
 *
 * Mistral is NOT a primary author. It renders within constraints set upstream.
 *
 * =============================================================================
 */

// Model allowlist — only these Mistral models may be used
const ALLOWED_MISTRAL_MODELS = [
  'mistral-medium-latest',
  'mistral-large-latest',
  'mistral-small-latest'
];

module.exports = async function handler(req, res) {
  // CORS headers
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

  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

  if (!MISTRAL_API_KEY) {
    console.error('[MISTRAL-PROXY] MISTRAL_API_KEY not configured');
    return res.status(500).json({
      error: 'API key not configured',
      details: 'MISTRAL_API_KEY environment variable is not set.'
    });
  }

  try {
    const {
      messages,
      model = 'mistral-medium-latest',
      role = 'SD_FALLBACK',
      temperature = 0.7,
      max_tokens = 500
    } = req.body;

    // ==========================================================================
    // VALIDATE REQUEST
    // ==========================================================================

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required',
        code: 'MISSING_MESSAGES'
      });
    }

    // Determine model — if not provided, select by role
    const requestedModel = model || (role === 'PROMPT_PREPROCESSOR' ? 'mistral-small-latest' : 'mistral-medium-latest');

    if (!ALLOWED_MISTRAL_MODELS.includes(requestedModel)) {
      console.error(`[MISTRAL-PROXY] Model "${requestedModel}" not in allowlist.`);
      return res.status(400).json({
        error: 'Model not allowed',
        code: 'MODEL_VALIDATION_FAILED',
        requestedModel,
        allowedModels: ALLOWED_MISTRAL_MODELS
      });
    }

    console.log(`[MISTRAL-PROXY] Role: ${role}, Model: ${requestedModel}`);

    // ==========================================================================
    // CALL MISTRAL API (OpenAI-compatible format)
    // ==========================================================================

    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: requestedModel,
        messages,
        temperature,
        max_tokens
      })
    });

    const responseText = await mistralResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[MISTRAL-PROXY] Non-JSON response from Mistral:', responseText.slice(0, 500));
      return res.status(502).json({
        error: 'Invalid response from Mistral API',
        details: responseText.slice(0, 200)
      });
    }

    if (!mistralResponse.ok) {
      console.error('[MISTRAL-PROXY] Mistral API error:', data);
      return res.status(mistralResponse.status).json({
        error: data.error?.message || 'Mistral API request failed',
        details: data
      });
    }

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[MISTRAL-PROXY] Malformed Mistral response:', data);
      return res.status(502).json({
        error: 'Malformed response from Mistral API',
        details: 'Response missing choices[0].message'
      });
    }

    // ==========================================================================
    // RETURN RESPONSE
    // ==========================================================================
    // Mistral's response is already OpenAI-compatible. Add orchestration metadata.

    const enrichedResponse = {
      ...data,
      _orchestration: {
        role,
        model: requestedModel,
        provider: 'mistral',
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json(enrichedResponse);

  } catch (err) {
    console.error('[MISTRAL-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact Mistral API',
      details: err.message
    });
  }
};
