const { requireModelAccess } = require('./_request-auth.js');
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

const { validateModelForRole, getDefaultModel, ALLOWED_MODELS, DENIED_OPENAI_ROLES, getPassTier, buildPassTierPrompt, stripWalletData } = require('./orchestrator');
// SECURITY: server-side prompt-injection scrub on user-role messages.
const { sanitizeUserMessages } = require('./_sanitize-injection.js');

// ============================================================================
// CONCIERGE PER-IP RATE LIMIT (Roman 2026-06-16) — server-side mirror of the
// client limiter; the durable backstop a bot cannot clear by wiping localStorage.
// Applies ONLY to role==='CONCIERGE' requests — story-generation calls are never
// throttled. Limits are abuse-level (above the client's 20/min, 100/hr) and
// env-configurable. NOTE: in-memory is PER-INSTANCE and resets on cold start; for
// cross-instance durability, back this with Vercel KV / Upstash / Supabase.
// ============================================================================
const CONCIERGE_IP_LIMITS = {
  perMinute: Number(process.env.CONCIERGE_IP_PER_MINUTE) || 30,
  perHour:   Number(process.env.CONCIERGE_IP_PER_HOUR)   || 150
};
const _conciergeIpHits = new Map(); // ip -> number[] (request timestamps, last hour)
function _conciergeClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}
// Returns false if allowed (and records the hit), or 'minute'|'hour' if limited.
function _conciergeIpRateLimited(ip) {
  if (!ip || ip === 'unknown') return false;
  const now = Date.now();
  const hrAgo = now - 3600000, minAgo = now - 60000;
  let arr = (_conciergeIpHits.get(ip) || []).filter(t => t >= hrAgo);
  let inMin = 0; for (let i = 0; i < arr.length; i++) if (arr[i] >= minAgo) inMin++;
  if (inMin >= CONCIERGE_IP_LIMITS.perMinute) { _conciergeIpHits.set(ip, arr); return 'minute'; }
  if (arr.length >= CONCIERGE_IP_LIMITS.perHour) { _conciergeIpHits.set(ip, arr); return 'hour'; }
  arr.push(now);
  _conciergeIpHits.set(ip, arr);
  // Bound memory: occasionally evict IPs with no recent activity.
  if (_conciergeIpHits.size > 5000) {
    for (const [k, v] of _conciergeIpHits) { if (!v.some(t => t >= hrAgo)) _conciergeIpHits.delete(k); }
  }
  return false;
}

// ── Durable cross-instance layer (Supabase). The in-memory limiter above is a
// fast per-instance fast-path; this is the authoritative aggregate across all
// serverless instances (it catches a distributed burst the in-memory layer
// cannot). FAILS OPEN on any DB/config error — a database hiccup must never
// block legitimate help traffic. Migration: 20260616_concierge_ip_rate_limit.sql.
let _conciergeSb; // undefined = not tried; null = unavailable; object = client
function _getConciergeSupabase() {
  if (_conciergeSb !== undefined) return _conciergeSb;
  try {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) { _conciergeSb = null; return null; }
    const { createClient } = require('@supabase/supabase-js');
    _conciergeSb = createClient(url, key, { auth: { persistSession: false } });
  } catch (_) { _conciergeSb = null; }
  return _conciergeSb;
}
async function _conciergeIpRateLimitedDB(ip) {
  if (!ip || ip === 'unknown') return false;
  const sb = _getConciergeSupabase();
  if (!sb) return false; // no DB configured → rely on the in-memory layer
  try {
    const now = Date.now();
    const { data, error } = await sb.rpc('concierge_ip_bump', {
      p_ip: ip,
      p_min_bucket: 'm:' + Math.floor(now / 60000),
      p_hr_bucket:  'h:' + Math.floor(now / 3600000),
      p_min_cap: CONCIERGE_IP_LIMITS.perMinute,
      p_hr_cap:  CONCIERGE_IP_LIMITS.perHour
    });
    if (error) { console.warn('[CHATGPT-PROXY] concierge rate RPC error (failing open):', error.message); return false; }
    return data || false; // 'minute' | 'hour' | null
  } catch (e) { console.warn('[CHATGPT-PROXY] concierge rate DB error (failing open):', e && e.message); return false; }
}

module.exports = async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!await requireModelAccess(req, res)) return;


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
      messages: _rawMessages,
      model,
      role = 'PRIMARY_AUTHOR',  // Which orchestration role is calling
      mode = 'solo',            // Story mode: solo, couple, stranger
      temperature = 0.7,
      max_tokens = 1500,
      response_format,  // Optional: { type: 'json_object' } for structured output
      // Pass Tier routing metadata (optional, from frontend orchestration)
      world,
      storyturn,
      sceneType,
      structuredState,
      user_id,
      // WHICH NAMED OPERATION THIS REQUEST IS (optional). Only consulted for a model listed in
      // MODEL_OPERATION_SCOPE, where it is REQUIRED — see validateModelForRole. Every other
      // caller omits it and is unaffected.
      operation
    } = req.body;
    // SECURITY: scrub user-role messages before any downstream code touches them.
    const messages = sanitizeUserMessages(_rawMessages, 'chatgpt');

    // ==========================================================================
    // VALIDATE REQUEST
    // ==========================================================================

    // Log request body keys for debugging (never log full message content)
    const bodyKeys = Object.keys(req.body || {});
    console.log(`[CHATGPT-PROXY] Request body keys: [${bodyKeys.join(', ')}], role: ${typeof role === 'string' ? role : typeof role}, model: ${model || '(default)'}`);

    // Concierge per-IP rate limit — server-side backstop (CONCIERGE role only;
    // story-generation roles are never throttled). Returns a diegetic 429.
    if (role === 'CONCIERGE') {
      const _cip = _conciergeClientIp(req);
      // 1) Fast per-instance check (no DB call when this instance is already over).
      let _limited = _conciergeIpRateLimited(_cip);
      // 2) Durable cross-instance check (Supabase; fails open). Skip if already blocked.
      if (!_limited) _limited = await _conciergeIpRateLimitedDB(_cip);
      if (_limited) {
        console.warn(`[CHATGPT-PROXY] concierge per-IP rate-limit hit (window=${_limited}) ip=${_cip}`);
        return res.status(429).json({
          error: 'concierge_rate_limited',
          window: _limited,
          content: 'The Library has grown quiet. Return in a little while.'
        });
      }
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[CHATGPT-PROXY] Validation failed: messages missing or empty. Body keys:', bodyKeys);
      return res.status(400).json({
        error: 'Messages array is required',
        code: 'MISSING_MESSAGES',
        receivedKeys: bodyKeys
      });
    }

    if (typeof role !== 'string') {
      console.error('[CHATGPT-PROXY] Validation failed: role is not a string, got:', typeof role);
      return res.status(400).json({
        error: 'Role must be a string',
        code: 'INVALID_ROLE_TYPE',
        receivedType: typeof role,
        hint: 'Check callChatGPT() argument order: (messages, role, options)'
      });
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

    // ── ROLES THAT MAY NEVER COME THROUGH HERE ──
    // Refused BEFORE model resolution, with the reason, so a future allowlist edit cannot quietly
    // re-open a route that was closed on purpose.
    if (DENIED_OPENAI_ROLES && DENIED_OPENAI_ROLES[role]) {
      console.error(`[CHATGPT-PROXY] Role "${role}" is denied on this provider: ${DENIED_OPENAI_ROLES[role]}`);
      return res.status(400).json({
        error: 'Role not permitted on this provider',
        role: role,
        reason: DENIED_OPENAI_ROLES[role],
        hint: 'This role routes through /api/mistral-proxy.'
      });
    }

    const requestedModel = model || getDefaultModel(role);

    try {
      validateModelForRole(requestedModel, role, operation);
    } catch (validationError) {
      console.error('[CHATGPT-PROXY] Model validation failed:', validationError.message, '| role:', role, '| model:', requestedModel, '| operation:', operation || '(none declared)');
      return res.status(400).json({
        error: 'Model not allowed',
        code: 'MODEL_VALIDATION_FAILED',
        details: validationError.message,
        role: role,
        requestedModel: requestedModel,
        operation: operation || null,
        allowedModels: ALLOWED_MODELS[role] || []
      });
    }

    console.log(`[CHATGPT-PROXY] Role: ${role}, Model: ${requestedModel}`);

    // ==========================================================================
    // PASS TIER ROUTING — DETERMINISTIC (wallet-agnostic)
    // ==========================================================================
    let tier_used = null;

    if (role === 'PRIMARY_AUTHOR' && world && storyturn) {
      tier_used = getPassTier(world, storyturn, sceneType || null);
      console.log(`[CHATGPT-PROXY] Pass tier: ${tier_used}, world: ${world}, storyturn: ${storyturn}, sceneType: ${sceneType || 'standard'}`);
    }

    // ==========================================================================
    // WALLET DATA STRIPPING — Generation must not see wallet state
    // ==========================================================================
    // Strip any wallet/payment fields that may have leaked into the request body
    const cleanBody = stripWalletData(req.body);
    // Ensure messages don't contain wallet data in system prompts
    // (defensive — frontend should not send this, but enforce server-side)

    // ==========================================================================
    // ROLE-SPECIFIC SYSTEM PROMPTS
    // ==========================================================================

    let finalMessages = [...messages];

    // ── WHICH NORMALIZATION AXIS IS THIS ──────────────────────────────────────────────────
    // Two of the axes on this role carry the OPPOSITE contract from the rest. player_action and
    // player_dialogue must come back as the reader's own instruction, preserved, with any change
    // DECLARED span by span against a permitted mapping — the frontend sends that contract as its
    // own system message (RUNTIME_NORMALIZATION_PROMPT) and the page's guard validates the answer
    // against it. The archetypal-distillation prompt below instructs the exact opposite: one
    // non-narrative mythic fragment or an {archetype, burden, tension} object, and never the
    // input. Prepending it to a reader turn told the provider to do two contradictory things in
    // one call, and nothing in the reply could satisfy both, so the reply was refused downstream
    // and the reader's turn fell back to raw every time. So it is scoped out HERE, at the provider
    // boundary, for those two axes only — every other axis keeps it exactly as before, and the
    // "exactly ONE system message per request" rule noted below now actually holds on both paths.
    const READER_PRESERVATION_AXES = new Set(['player_action', 'player_dialogue']);
    let normAxis = typeof req.body?.axis === 'string' ? req.body.axis : null;
    if (!normAxis) {
      // Older callers put the axis only inside the JSON user payload.
      for (let i = messages.length - 1; i >= 0 && !normAxis; i--) {
        const m = messages[i];
        if (!m || m.role !== 'user' || typeof m.content !== 'string') continue;
        try {
          const p = JSON.parse(m.content);
          if (p && typeof p.axis === 'string') normAxis = p.axis;
        } catch (_) { /* not a JSON payload */ }
      }
    }

    if (role === 'NORMALIZATION' && READER_PRESERVATION_AXES.has(normAxis)) {
      console.log(`[CHATGPT-PROXY] NORMALIZATION axis "${normAxis}" — reader-preservation contract;`
        + ' archetypal-distillation system prompt NOT prepended');
    } else if (role === 'NORMALIZATION') {
      const modeGuidance = {
        couple: `MODE: COUPLE
For dialogue with cultural quotes:
- Strip quoted language entirely
- Rewrite as original prose acknowledging shared recognition
- Preserve playfulness, intimacy, relationship tone
- Do NOT paraphrase iconic phrasing or name the reference
Intent > literal text.`,
        solo: `MODE: SOLO
For dialogue with cultural quotes:
- Remove the quote
- Rewrite as projection of player mood or irony
- Do NOT assume shared cultural context
- AI character must not "get the reference"
- Response may be oblique, deflective, gently misaligned
Preserve asymmetry.`,
        stranger: `MODE: STRANGER
For dialogue with cultural quotes:
- Remove the quote
- Rewrite as ambiguous affectation or social risk
- May introduce mild awkwardness, curiosity, or distance
- Do NOT validate shared familiarity
Preserve social stakes.`
      };

      const normalizationSystemPrompt = {
        role: 'system',
        content: `You are an archetypal distillation layer. You extract the MYTHIC FUNCTION of cultural references.

DETECTION (silent, non-blocking):
Flag input if: quotation marks present, short stylized declarative, or high similarity to known cultural patterns.

DISTILLATION RULES:
- If the input is a known cultural character, extract the unique moral burden or central contradiction that defines them
- Do not generalize. Do not label. Distill what makes this character specifically themselves in terms of responsibility, loss, choice, or tension
- Favor specificity: "reluctant heir to a moral war" NOT "heroic figure"
- Avoid flat adjectives: heroic, famous, brave, strong, evil
- Capture the CHARACTER'S RELATIONSHIP to their world, not their label
- Think: what weight do they carry? what tension defines them?

DIALOGUE HANDLING:
- No copyrighted dialogue verbatim or via close paraphrase
- Do not name sources
- Do not explain transformations
- Behavior must be deterministic

OUTPUT FORMAT (choose one):
1. Single archetypal fragment (MAX 1 sentence, non-narrative)
2. Structured intent: { "archetype": "...", "burden": "...", "tension": "..." }

FORBIDDEN:
- Scene-setting, worldbuilding, plot advancement
- Multi-sentence or narrative output
- Naming copyrighted works or characters
- Generic labels (hero, villain, warrior, princess)

${modeGuidance[mode] || modeGuidance.solo}

Output only the mythic kernel. Prose realization is deferred.`
      };
      finalMessages = [normalizationSystemPrompt, ...messages];
    }

    // Pass tier prompt is handled upstream (frontend orchestration).
    // No second system message injection — exactly ONE system message per request.

    // ==========================================================================
    // CALL OPENAI API
    // ==========================================================================

    // ══ REASONING MODELS TAKE A DIFFERENT ALLOWANCE FIELD (Roman 2026-11-06) ═══════════════
    // Chat Completions rejects `max_tokens` outright on a reasoning model — the C+ editor route
    // records the same thing for gpt-6-luna and already sends `max_completion_tokens` for it.
    // Sending the wrong field here would make every Luna call a 400, so the field is chosen by
    // model rather than hardcoded. `temperature` is also unsupported on these models and is
    // omitted rather than sent and refused.
    //
    // NOTHING ELSE CHANGES. For every model already on this route the body is byte-identical to
    // before: same field, same temperature, same ordering.
    const REASONING_MODELS = /^(gpt-6|gpt-5|o1|o3|o4)/;
    const isReasoning = REASONING_MODELS.test(String(requestedModel));
    const requestBody = isReasoning
      ? {
        model: requestedModel,
        messages: finalMessages,
        max_completion_tokens: max_tokens,
        // Caller-chosen, defaulting to medium. On this model reasoning is billed INSIDE
        // completion, so the allowance above has to cover the thinking as well as the prose —
        // the caller sizes it knowing that.
        reasoning_effort: (req.body && req.body.reasoning_effort) || 'medium'
      }
      : {
        model: requestedModel,
        messages: finalMessages,
        temperature: temperature,
        max_tokens: max_tokens
      };

    // Add response format if specified (for JSON mode)
    if (response_format) {
      requestBody.response_format = response_format;
    }

    // ══ A CALL MAY NOT BE GIVEN AN ALLOWANCE ITS TRANSPORT CANNOT WAIT FOR ═══════════════════
    // MEASURED, not read off a doc page: `globalThis.fetch` in this Node build (v25.3.0) rejects
    // with HeadersTimeoutError / UND_ERR_HEADERS_TIMEOUT after 301,042ms when a server sends no
    // response headers (_transport_deadline_chain.mjs). A non-streaming completion sends nothing
    // until it is finished, so time-to-headers IS generation time — and at the ~95-105 tok/s
    // measured on this model that ceiling sits around 30,000 tokens. An operation handed a
    // 40,000-token allowance therefore could not reach it: the route's own transport gave up
    // first, and the caller would read a transport failure instead of the model's outcome.
    //
    // SCOPED TO THE CALLS THAT NEED IT, by their own declared allowance. A request whose
    // allowance fits inside the default window is sent EXACTLY as before — same transport, same
    // defaults, byte-identical body — so nothing unrelated moves. Only a call that has asked for
    // more output than the default window can carry gets a window sized to it.
    //
    // FAIL-SAFE: undici's Agent is loaded lazily and a failure to load falls through to the
    // ordinary fetch, which is today's behaviour. It never shortens a deadline, only lengthens.
    const DEFAULT_TRANSPORT_MS = 300000;
    const _declaredOut = Number(requestBody.max_completion_tokens || requestBody.max_tokens || 0);
    const _needsLongTransport = _declaredOut > 28000;
    let _fetchOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    };
    if (_needsLongTransport) {
      // 90 tok/s is BELOW every rate measured on this model, so the window is sized by the
      // slowest observed throughput rather than the fastest — plus a 60s floor for connection
      // and queueing. It is a LIMIT, not a promise: exceeding it is still a transit failure.
      const _ms = Math.max(DEFAULT_TRANSPORT_MS, Math.ceil((_declaredOut / 90) * 1000) + 60000);
      try {
        const { Agent } = require('undici');
        _fetchOpts.dispatcher = new Agent({ headersTimeout: _ms, bodyTimeout: _ms });
        console.log(`[CHATGPT-PROXY] transport window widened to ${_ms}ms for a ${_declaredOut}-token allowance (default ${DEFAULT_TRANSPORT_MS}ms would have cut it off)`);
      } catch (_agentErr) {
        console.warn(`[CHATGPT-PROXY] could not widen the transport window (${_agentErr && _agentErr.message}) — sending with the default ~${DEFAULT_TRANSPORT_MS}ms; a ${_declaredOut}-token allowance may be cut off by the transport rather than by the model`);
      }
    }
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', _fetchOpts);

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

    // ==========================================================================
    // LOG TIER USED (non-blocking, fire-and-forget)
    // ==========================================================================
    if (tier_used !== null && user_id) {
      const sbUrl = process.env.SUPABASE_URL;
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sbUrl && sbKey) {
        // Fire-and-forget — do not await, do not block response
        fetch(`${sbUrl}/rest/v1/generation_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': sbKey,
            'Authorization': `Bearer ${sbKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id,
            world: world || null,
            storyturn: storyturn || null,
            tier_used
          })
        }).catch(err => {
          console.warn('[CHATGPT-PROXY] generation_logs insert failed (non-fatal):', err.message);
        });
      }
    }

    // ==========================================================================
    // NORMALIZE RESPONSE — stable app-level shape
    // ==========================================================================
    // Extract content from ChatCompletion so clients never index into choices[0]
    const content = data.choices[0].message.content || '';
    let parsedContent = null;
    try { parsedContent = JSON.parse(content); } catch (_) { /* not JSON, that's fine */ }

    const normalizedResponse = {
      ok: true,
      model: data.model || null, // actual upstream model for routing provenance
      content: content,                              // raw string from model
      ...(parsedContent || {}),                       // spread parsed fields if JSON
      canonical_instruction: parsedContent?.canonical_instruction ?? content,
      _orchestration: {
        role: role,
        model: requestedModel,
        tier_used: tier_used,
        timestamp: new Date().toISOString()
      },
      // Preserve usage metadata for token accounting
      // Provider-neutral routing also serves older renderer/extractor consumers
      // that still read the standard Chat Completions envelope.
      choices: data.choices,
      usage: data.usage || null,
      // ── WHY THE CONTENT IS EMPTY, NOT JUST THAT IT IS (Roman 2026-11-06) ────────────────
      // This normalizer collapsed every unusable reply to `content: ''`, so a report had to
      // GUESS the cause from an empty string. It guessed wrong once already: a planning call
      // that exhausted its completion budget on reasoning (completion_tokens exactly equal to
      // the allowance, finish_reason "length") was read as a prose-author refusal.
      //
      // The upstream's own verdict is carried through instead. `finish_reason` distinguishes
      // exhaustion ("length") from a normal stop with no content; `refusal` is the provider's
      // explicit decline, which is a different outcome again and must never be reported as
      // truncation. Both are additive fields — every existing consumer reads `content`,
      // `canonical_instruction` and `usage` exactly as before.
      finish_reason: (data.choices && data.choices[0]
        && (data.choices[0].finish_reason || data.choices[0].finishReason)) || null,
      refusal: (data.choices && data.choices[0] && data.choices[0].message
        && data.choices[0].message.refusal) || null
    };

    return res.status(200).json(normalizedResponse);

  } catch (err) {
    console.error('[CHATGPT-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact OpenAI API',
      details: err.message
    });
  }
}
