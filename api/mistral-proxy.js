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
  'mistral-small-latest',
  'mistral-small-2603'    // Mistral Small 4 (119B/6.5B active, 256k ctx, $0.15/$0.60 per M) — author A/B (Roman 2026-07-30)
];

// SECURITY: server-side prompt-injection scrub on user-role messages.
const { sanitizeUserMessages } = require('./_sanitize-injection.js');

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
      messages: _rawMessages,
      model = 'mistral-medium-latest',
      role = 'SD_FALLBACK',
      temperature = 0.7,
      max_tokens = 500,
      // 'none' | 'low' | 'medium' | 'high'. 'none' is the documented way to request
      // MINIMAL reasoning with no thinking chunk — OMITTING the field is NOT the same
      // thing, so callers that need non-reasoning must send it explicitly.
      reasoning_effort,
      response_format             // e.g. { type: 'json_object' } — Mistral JSON mode
    } = req.body;
    // REASONING CONTRACT (2026-08-25). An explicitly supplied value must be valid: silently
    // coercing a typo to null used to mean the caller believed it had disabled reasoning while
    // the author-class default below could still switch it on.
    const _RE_ALLOWED = ['none', 'low', 'medium', 'high'];
    if (reasoning_effort !== undefined && reasoning_effort !== null
        && !_RE_ALLOWED.includes(String(reasoning_effort))) {
      return res.status(400).json({
        error: 'invalid_reasoning_effort',
        detail: `reasoning_effort must be one of ${_RE_ALLOWED.join('|')}`,
        received: String(reasoning_effort)
      });
    }
    // Structured output: only the shapes we understand are forwarded.
    if (response_format !== undefined && response_format !== null) {
      const _rfType = response_format && response_format.type;
      if (_rfType !== 'json_object') {
        return res.status(400).json({
          error: 'invalid_response_format',
          detail: "response_format.type must be 'json_object'",
          received: _rfType === undefined ? String(response_format) : String(_rfType)
        });
      }
    }

    // SECURITY: scrub user-role messages before any downstream code touches them.
    const messages = sanitizeUserMessages(_rawMessages, 'mistral');

    // ==========================================================================
    // VALIDATE REQUEST
    // ==========================================================================

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required',
        code: 'MISSING_MESSAGES'
      });
    }

    // ══════════════════════════════════════════════════════════════════════════════════
    //  CHARACTER_CANON_AUDITOR — A RECURRING PAID ROLE, GATED SERVER-SIDE
    //
    //  This role fires once per finalized scene that has canon to protect, so enabling it is a
    //  standing cost decision, not a per-call one. The gate is HERE, on an environment
    //  variable, because a flag the client owns is a flag anyone with a console can switch on:
    //  client state cannot be allowed to enable spend. Default OFF — absent means off.
    //
    //  The refusal is NAMED. A caller that gets this back must report auditor_not_enabled and
    //  must never read it as "no contradiction found": an unasked question has no answer, and
    //  the whole point of the role is that silence is not a pass.
    // ══════════════════════════════════════════════════════════════════════════════════
    // ONE flag governs BOTH roles. Enabling the auditor without repair would find
    // contradictions with no recovery; enabling repair without the auditor would have nothing
    // to repair against. They are a single capability and are gated as one.
    if (role === 'CHARACTER_CANON_AUDITOR' || role === 'CHARACTER_CANON_REPAIR') {
      const _enabled = String(process.env.SB_CANON_AUDITOR_ENABLED || '').trim() === '1';
      if (!_enabled) {
        console.warn('[MISTRAL-PROXY] ' + role + ' is not enabled on this deployment '
          + '(SB_CANON_AUDITOR_ENABLED is unset) — refusing, and this is NOT a compatible verdict');
        return res.status(403).json({
          error: 'Character canon auditing/repair is not enabled on this deployment',
          code: 'AUDITOR_NOT_ENABLED',
          verdict: 'auditor_not_enabled'
        });
      }
    }

    // Determine model — if not provided, select by role.
    // CHARACTER_CANON_AUDITOR pins mistral-small-latest: it is a character-psychology judgement,
    // and Mistral is where that work already lives. That is a REASONABLE INITIAL ROUTE chosen on
    // the portfolio evidence, NOT a completed evaluation of auditing quality — the portfolio A/B
    // measured psychology GENERATION, and judging compatibility is a different task.
    const requestedModel = model || (role === 'PROMPT_PREPROCESSOR' ? 'mistral-small-latest'
      : (role === 'CHARACTER_CANON_AUDITOR' || role === 'CHARACTER_CANON_REPAIR') ? 'mistral-small-latest'
      : 'mistral-medium-latest');

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

    let _effortUsed = null;
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: (() => {
        const body = { model: requestedModel, messages, temperature, max_tokens };
        // REASONING — allowlisted, never passed through raw. Reasoning tokens bill as
        // OUTPUT; on a ~100k-token author payload that is a few percent of scene cost.
        // Validated above, so an explicit value is always honoured here — including 'none',
        // which must survive the author-class default rather than being treated as absent.
        const _explicit = (reasoning_effort !== undefined && reasoning_effort !== null)
          ? String(reasoning_effort) : null;
        let effort = _explicit;
        // AUTHOR-CLASS DEFAULT (Roman 2026-08-21): scene authoring on Mistral gets reasoning
        // unless the caller says otherwise. Detected from the payload itself — the client
        // route that sends 2603 with the author system prompt is not yet located in app.js,
        // so keying on the prompt is the only reliable place to apply this today.
        const isAuthorClass = Array.isArray(messages) && messages.some(m =>
          m && m.role === 'system' && /STORYBOUND ARCHITECTURE LAWS/.test(String(m.content || '')));
        // Applies ONLY when the caller supplied nothing at all.
        if (_explicit === null && isAuthorClass && /mistral-small/.test(String(requestedModel))) {
          effort = 'high';
          console.log('[MISTRAL-PROXY] author-class payload — defaulting reasoning_effort=high');
        }
        if (effort) body.reasoning_effort = effort;   // includes the explicit 'none'
        if (response_format) body.response_format = response_format;
        _effortUsed = effort;
        return JSON.stringify(body);
      })()
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
        reasoning_effort: _effortUsed,
        // CACHE OBSERVABILITY (Roman 2026-08-21): the proxy previously discarded usage
        // entirely, so there was no way to tell whether ANY prompt caching occurred.
        // Surface whatever Mistral reports; a cached-token field appearing here is the
        // evidence needed before wiring a cache directive.
        usage: data.usage || null,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const u = data.usage || {};
      console.log('[MISTRAL-PROXY] usage ' + JSON.stringify(u) +
        (enrichedResponse._orchestration.reasoning_effort ? ' reasoning=' + enrichedResponse._orchestration.reasoning_effort : ''));
    } catch (_) {}

    return res.status(200).json(enrichedResponse);

  } catch (err) {
    console.error('[MISTRAL-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact Mistral API',
      details: err.message
    });
  }
};
