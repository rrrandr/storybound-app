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
  'mistral-small-2603'    // Mistral Small 4 (119B/6.5B active, 256k ctx, $0.15/$0.60 per M) — author A/B (Roman 2026-07-23)
];

// ── QUOTA GOVERNOR BOOTSTRAP ──
// Constructed once per instance; the STATE it consults is in Postgres, shared by every
// instance. If Supabase is not configured the governor is absent and admission is skipped —
// that is a deployment fault and is logged loudly, not a silent bypass.
const { createGovernor } = require('./_mistral-governor.js');
const { supabaseStore } = require('./_mistral-governor-store.js');
let _govCached;
// ── AVAILABILITY IS MANDATORY, NOT BEST-EFFORT ──────────────────────────────
// This used to return null when Supabase was unconfigured or the client would not construct,
// and the caller skipped admission with `if (_gov)`. That is a PAID-CALL FAIL-OPEN: the one
// circumstance in which we know least about the budget was the circumstance in which we
// enforced nothing. Misconfiguration now produces a named 503 BEFORE dispatch, so a broken
// deployment refuses to spend rather than spending unmetered.
// It returns a reason instead of throwing so the handler can name the fault in the response.
function _getGovernor() {
  if (_govCached !== undefined) return _govCached;
  try {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('[MISTRAL-PROXY] GOVERNOR UNAVAILABLE — SUPABASE_URL/SERVICE_ROLE_KEY absent; refusing all Mistral dispatch');
      _govCached = { unavailable: 'supabase_config_absent' }; return _govCached;
    }
    const { createClient } = require('@supabase/supabase-js');
    _govCached = createGovernor(supabaseStore(createClient(url, key, { auth: { persistSession: false } })));
  } catch (e) {
    console.error('[MISTRAL-PROXY] GOVERNOR UNAVAILABLE — construction failed:', e && e.message);
    _govCached = { unavailable: 'governor_construction_failed', detail: String((e && e.message) || e) };
  }
  return _govCached;
}

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

    // ══════════════════════════════════════════════════════════════════════════
    //  QUOTA GOVERNOR — admission decided in the SHARED store, before dispatch
    //  Never sends an over-budget request; never substitutes a model; never holds
    //  this serverless invocation asleep waiting for capacity. A refusal returns
    //  immediately with typed metadata so the caller decides what to do.
    // ══════════════════════════════════════════════════════════════════════════
    const _gov = _getGovernor();
    // NO GOVERNOR, NO DISPATCH. Returned before the op id is even minted: there is nothing to
    // reserve against and no way to know what has been spent, so the only safe answer is to
    // refuse. Retry-After is offered because a deployment fault is usually transient from the
    // caller's side, but `terminal` is false and `governor:true` still tells every call site
    // that NO provider call was made — so no fallback fires.
    if (_gov && _gov.unavailable) {
      res.setHeader('Retry-After', '30');
      res.setHeader('X-Quota-Outcome', _gov.unavailable);
      return res.status(503).json({
        error: _gov.unavailable, governor: true, terminal: false,
        model: requestedModel,
        detail: _gov.detail || 'quota governor unavailable — refusing to dispatch unmetered',
        retry_after_ms: 30000, retry_tpm_ms: null, retry_rps_ms: null
      });
    }
    const _bodyOpId = (req.body && typeof req.body.operation_id === 'string') ? req.body.operation_id : null;
    const _opId = _bodyOpId ||
                  (`mq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`);
    let _admitted = null;
    if (_gov) {
      const _verdict = await _gov.admit({ model: requestedModel, messages, maxTokens: max_tokens, opId: _opId });
      if (_verdict.outcome !== 'admitted') {
        const _http = (_verdict.outcome === 'reservation_exceeds_model_allowance'
                    || _verdict.outcome === 'model_limits_not_configured') ? 507 : 429;
        const _retryAfterS = _verdict.retryAfterMs == null ? null : Math.max(1, Math.ceil(_verdict.retryAfterMs / 1000));
        // A capacity refusal carries Retry-After; a CONFIGURATION refusal does not, because
        // waiting never makes an over-sized request fit and offering a time would invite a
        // retry loop that can only fail again.
        if (_retryAfterS != null) res.setHeader('Retry-After', String(_retryAfterS));
        res.setHeader('X-Quota-Outcome', _verdict.outcome);
        console.warn(`[MISTRAL-PROXY] governor refused ${requestedModel}: ${_verdict.outcome}`
          + (_verdict.reserve ? ` reserve=${_verdict.reserve}` : '')
          + (_verdict.usedTokens != null ? ` used=${_verdict.usedTokens}` : ''));
        return res.status(_http).json({
          error: _verdict.outcome,
          governor: true,                 // the caller's signal that NO provider call was made
          terminal: _http === 507,        // configuration faults can never succeed on retry
          model: requestedModel,
          detail: _verdict.detail || null,
          reserved_tokens: _verdict.reserve ?? null,
          used_tokens: _verdict.usedTokens ?? null,
          limit_tpm: _verdict.limitTpm ?? null,
          retry_after_ms: _verdict.retryAfterMs ?? null,
          retry_tpm_ms: _verdict.retryTpmMs ?? null,
          retry_rps_ms: _verdict.retryRpsMs ?? null
        });
      }
      _admitted = _verdict;
    }

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
      // ── RELEASE ONLY WHAT IS PROVEN UNSPENT ──────────────────────────────
      // This released on EVERY non-2xx, which is not safe. A status only tells us the provider
      // did no work in the cases where refusal happens BEFORE generation:
      //   429 — rate limited at the gate; no tokens were produced. Release.
      //   400/401/403/404/422 — the request was rejected on its face (bad model, bad auth,
      //        malformed body). Generation never starts for these either. Release.
      //   5xx — proves nothing. A 502/503/504 can follow a request the provider SERVED and
      //        billed, whose response was lost in transit. Releasing would hand back capacity
      //        that was actually consumed and let the next caller overshoot the real limit.
      //        RETAIN; the reservation expires with the window.
      // The conservative direction here is to keep charging, so an ambiguous failure costs us
      // a little headroom rather than costing the account a limit breach.
      const _st = mistralResponse.status;
      const _provenUnspent = _st === 429 || _st === 400 || _st === 401 || _st === 403 || _st === 404 || _st === 422;
      if (_admitted && _provenUnspent) {
        try { await _gov.release({ opId: _opId, reason: 'provider_' + _st }); }
        catch (e) { console.warn('[MISTRAL-PROXY] reservation release failed:', e && e.message); }
      } else if (_admitted) {
        console.warn(`[MISTRAL-PROXY] provider ${_st} — RETAINING the reservation: a 5xx does not prove the request went unserved`);
      }
      // FORWARD THE PROVIDER'S RETRY METADATA. These headers were previously discarded, which
      // is why a 429 reached the client with no limit, no remaining and no reset — and why a
      // rate-limit diagnosis had to go to a dashboard.
      for (const h of ['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining',
                       'x-ratelimit-reset', 'ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset']) {
        const v = mistralResponse.headers.get(h);
        if (v != null) res.setHeader(h, v);
      }
      return res.status(mistralResponse.status).json({
        error: data.error?.message || 'Mistral API request failed',
        provider_status: mistralResponse.status,
        governor: false,               // the provider refused this, not the governor
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

    // RECONCILE: replace the deliberately-oversized reservation with the provider's own
    // number, handing the difference back to the bucket. A response with NO usage block
    // reconciles to null, which KEEPS the conservative charge until the window rolls past it —
    // unknown usage is never treated as zero usage.
    if (_gov && _admitted) {
      try {
        const _rec = await _gov.reconcile({ opId: _opId, usage: data.usage || null });
        console.log(`[MISTRAL-PROXY] quota reconcile op=${_opId} released=${_rec.released} held=${_rec.held} exact=${_rec.exact}`);
      } catch (e) { console.warn('[MISTRAL-PROXY] reconcile failed:', e && e.message); }
    }
    return res.status(200).json(enrichedResponse);

  } catch (err) {
    // A THROWN FETCH IS THE MOST AMBIGUOUS OUTCOME OF ALL: a socket that closed after the
    // provider began work looks identical to one that never opened. The reservation is
    // RETAINED and left to expire with the window — the same conservative direction as a 5xx.
    console.error('[MISTRAL-PROXY] Request failed (reservation RETAINED — transport failure does not prove the request went unserved):', err.message);
    return res.status(502).json({
      error: 'Failed to contact Mistral API',
      details: err.message
    });
  }
};
