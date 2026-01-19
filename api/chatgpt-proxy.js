/**
 * =============================================================================
 * STORYBOUND CHATGPT PROXY — PRIMARY AUTHOR ENDPOINT
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This endpoint handles all calls to ChatGPT (OpenAI models).
 * ChatGPT is the PRIMARY AUTHOR and has EXCLUSIVE authority over:
 *
 * - Plot progression
 * - Character interiority
 * - Dialogue intent
 * - Whether intimacy occurs
 * - Whether scenes are interrupted
 * - Monetization gate enforcement
 * - Erotic Scene Directive (ESD) generation
 *
 * ChatGPT ALWAYS runs:
 * - Before any specialist renderer
 * - After any specialist renderer (integration pass)
 *
 * ChatGPT is the FINAL AUTHORITY on story state.
 *
 * =============================================================================
 * WHY CHATGPT IS THE PRIMARY AUTHOR (DO NOT CHANGE)
 * =============================================================================
 *
 * The separation of AI responsibilities is INTENTIONAL:
 * - ChatGPT decides WHAT happens and WHETHER intimacy occurs
 * - Specialist renderers (Grok) only render HOW intimacy FEELS
 * - This prevents any single model from having unchecked authority
 * - Monetization gates are enforced by ChatGPT, not by renderers
 *
 * DO NOT merge these responsibilities. The separation is by design.
 *
 * =============================================================================
 */

const { validateModelForRole, getDefaultModel, ALLOWED_MODELS } = require('./orchestrator');

module.exports = async function handler(req, res) {
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

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error('[CHATGPT-PROXY] OPENAI_API_KEY not configured');
    return res.status(500).json({
      error: 'API key not configured',
      details: 'OPENAI_API_KEY environment variable is not set. ChatGPT (primary author) requires OpenAI API access.'
    });
  }

  try {
    const {
      messages,
      model,
      role = 'PRIMARY_AUTHOR',  // Which orchestration role is calling
      mode = 'solo',            // Story mode: solo, couple, stranger
      temperature = 0.7,
      max_tokens = 1500,
      response_format  // Optional: { type: 'json_object' } for structured output
    } = req.body;

    // ==========================================================================
    // VALIDATE REQUEST
    // ==========================================================================

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // ==========================================================================
    // MODEL VALIDATION — ENFORCE ALLOWLIST
    // ==========================================================================
    /**
     * Models must be explicitly allowlisted for each role.
     * This prevents:
     * - Silent model upgrades
     * - Unauthorized model substitutions
     * - Configuration errors
     */

    const requestedModel = model || getDefaultModel(role);

    try {
      validateModelForRole(requestedModel, role);
    } catch (validationError) {
      console.error('[CHATGPT-PROXY] Model validation failed:', validationError.message);
      return res.status(400).json({
        error: 'Model not allowed',
        details: validationError.message,
        allowedModels: ALLOWED_MODELS[role] || []
      });
    }

    console.log(`[CHATGPT-PROXY] Role: ${role}, Model: ${requestedModel}`);

    // ==========================================================================
    // ROLE-SPECIFIC SYSTEM PROMPTS
    // ==========================================================================

    let finalMessages = messages;

    if (role === 'NORMALIZATION') {
      const modeGuidance = {
        couple: `MODE: COUPLE - shared shorthand, playful recognition`,
        solo: `MODE: SOLO - projection, irony, internal gesture`,
        stranger: `MODE: STRANGER - ambiguous, mild distance or curiosity`
      };

      const normalizationSystemPrompt = {
        role: 'system',
        content: `You are a canonicalization layer. You extract INTENT from cultural references. You do NOT author prose.

OUTPUT FORMAT (choose one):
1. Single rewritten fragment (MAX 1 sentence, non-narrative)
2. Structured intent: { "tone": "...", "affect": "...", "gesture": "..." }

FORBIDDEN:
- Scene-setting
- Worldbuilding
- Plot advancement
- Multi-sentence output
- Narrative prose
- Story-like descriptions
- Explanations or commentary
- Naming copyrighted works or characters

${modeGuidance[mode] || modeGuidance.solo}

Prose realization is deferred to later stages. Output only the semantic kernel.`
      };
      finalMessages = [normalizationSystemPrompt, ...messages];
    }

    // ==========================================================================
    // CALL OPENAI API
    // ==========================================================================

    const requestBody = {
      model: requestedModel,
      messages: finalMessages,
      temperature: temperature,
      max_tokens: max_tokens
    };

    // Add response format if specified (for JSON mode)
    if (response_format) {
      requestBody.response_format = response_format;
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await openaiResponse.text();

    // Parse response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[CHATGPT-PROXY] Non-JSON response from OpenAI:', responseText.slice(0, 500));
      return res.status(502).json({
        error: 'Invalid response from OpenAI API',
        details: responseText.slice(0, 200)
      });
    }

    // Handle API errors
    if (!openaiResponse.ok) {
      console.error('[CHATGPT-PROXY] OpenAI API error:', data);
      return res.status(openaiResponse.status).json({
        error: data.error?.message || 'OpenAI API request failed',
        details: data
      });
    }

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[CHATGPT-PROXY] Malformed OpenAI response:', data);
      return res.status(502).json({
        error: 'Malformed response from OpenAI API',
        details: 'Response missing choices[0].message'
      });
    }

    // ==========================================================================
    // RETURN RESPONSE
    // ==========================================================================

    // Add metadata about the orchestration role
    const enrichedResponse = {
      ...data,
      _orchestration: {
        role: role,
        model: requestedModel,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json(enrichedResponse);

  } catch (err) {
    console.error('[CHATGPT-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact OpenAI API',
      details: err.message
    });
  }
}
