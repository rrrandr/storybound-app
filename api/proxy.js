/**
 * =============================================================================
 * STORYBOUND SPECIALIST RENDERER PROXY — GROK ENDPOINT
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This endpoint handles calls to the SPECIALIST RENDERER (Grok).
 *
 * =============================================================================
 * SPECIALIST RENDERER CONSTRAINTS (NON-NEGOTIABLE)
 * =============================================================================
 *
 * The specialist renderer (Grok) is used for SENSORY EMBODIMENT ONLY.
 *
 * It may be called ONLY if:
 * - An intimacy scene exists AND
 * - Eroticism level warrants it (Erotic or Dirty) AND
 * - The selected provider is contractually allowed
 *
 * It may ONLY receive:
 * - A fully-specified Erotic Scene Directive (ESD)
 * - No global story context beyond what is embedded in the ESD
 *
 * It may NOT:
 * - Decide plot
 * - Invent lore
 * - Change outcomes
 * - Override stops
 * - Complete a scene if forbidden
 * - Write cliffhangers
 * - Reference monetization, Fate, or system rules
 *
 * The specialist renderer NEVER decides "how far things go."
 * It renders HOW IT FEELS, within bounds.
 *
 * =============================================================================
 * WHY GROK IS A SPECIALIST RENDERER (DO NOT CHANGE)
 * =============================================================================
 *
 * ChatGPT is the PRIMARY AUTHOR. It decides:
 * - WHAT happens
 * - WHETHER intimacy occurs
 * - Whether scenes are interrupted
 *
 * Grok only renders the sensory experience within constraints set by ChatGPT.
 * This separation ensures no single model has unchecked authority.
 *
 * =============================================================================
 */

// =============================================================================
// MODEL ALLOWLIST — PINNED VERSIONS (NO AUTO-UPGRADES)
// =============================================================================
/**
 * Allowlisted Grok models for specialist rendering.
 * RENDERER: grok-4-1-fast-non-reasoning (visual bible, visualization prompts ONLY)
 * INTIMACY_SPECIALIST: grok-4-1-fast-reasoning (explicit scenes, ESD-gated)
 *
 * HARD RULE: Grok must NEVER be called for DSP, normalization, veto, or story logic.
 */
const ALLOWED_GROK_MODELS = [
  'grok-4.20-0309-non-reasoning', // OAS author primary (fast, no reasoning-token tax; cleaned by gpt-4o-mini)
  'grok-4-1-fast-non-reasoning',  // RENDERER primary + INTIMACY_SPECIALIST fallback
  'grok-4-1-fast-reasoning',      // INTIMACY_SPECIALIST primary
  'grok-4.3'                      // Universal fallback if 4-1 names get renamed/deprecated
];

/**
 * Per-role MODEL FALLBACK CHAIN — server-side resilience for xAI model
 * renames or temporary unavailability. The proxy tries each model in
 * order; if xAI returns a model-related error (400 / 404 — typically
 * "model not found"), it falls through to the next. Auth (401/403),
 * quota (429), and 5xx responses fail fast — no retry, they're not
 * model-name issues.
 *
 * Primary models are the cheapest/best fit for the role. Fallbacks are
 * progressively more general so we still get a response if xAI changes
 * its public model list under us.
 */
const ROLE_MODEL_CHAIN = {
  INTIMACY_SPECIALIST: [
    'grok-4.20-0309-non-reasoning',  // primary — fast OAS author (de-repeated downstream by gpt-4o-mini)
    'grok-4-1-fast-reasoning',       // fallback 1 — reasoning model (opt-in depth turns; aliases to 4.3)
    'grok-4-1-fast-non-reasoning',   // fallback 2
    'grok-4.3'                        // fallback 3 — universal
  ],
  SPECIALIST_RENDERER: [
    'grok-4.20-0309-non-reasoning',
    'grok-4-1-fast-reasoning',
    'grok-4-1-fast-non-reasoning',
    'grok-4.3'
  ],
  RENDERER: [
    'grok-4-1-fast-non-reasoning',   // NOTE: resolves to grok-4.3; 'non-reasoning' is NOT a cheaper SKU.
    //   Visual extraction is a UTILITY task and should default to Mistral Small (migration pending).
    'grok-4-1-fast-reasoning',       // fallback 1
    'grok-4.3'                        // fallback 2
  ],
  // STRUCTURE_GENERATOR — structured JSON output for plot scaffolds when
  // OpenAI + Anthropic both fail. Added 2026-05-21 in response to a real
  // outage where gpt-4o-mini returned empty content twice in a row and
  // the user's story shipped without an A-plot. Grok is a different
  // provider entirely (xAI), so an OpenAI/Anthropic dual-outage doesn't
  // affect it. No ESD validation required for this role (structured
  // JSON, not erotic narrative).
  STRUCTURE_GENERATOR: [
    'grok-4-1-fast-reasoning',
    'grok-4-1-fast-non-reasoning',
    'grok-4.3'
  ],
  // NARRATIVE_AUTHOR — Grok authors NON-INTIMATE scene PROSE (A1 architecture,
  // 2026-06-16). This is the one Grok role that DOES receive global story
  // context. The author/renderer firewall is preserved IN SPIRIT: consent,
  // limits, [CONSTRAINTS] and [SD] are adjudicated UPSTREAM by a gpt-4o-mini
  // control pass on /api/chatgpt-proxy (see orchestrateStoryGeneration → A1
  // SPLIT) BEFORE Grok is called, so Grok never holds consent authority — it
  // only renders prose under a decision a checked model already made. No ESD
  // required (this is prose, not ESD-gated explicit rendering; explicit beats
  // still route through INTIMACY_SPECIALIST/SPECIALIST_RENDERER). Gated
  // client-side by CONFIG.ENABLE_GROK_NARRATIVE_AUTHOR (default ON as of 2026-08-16).
  // VERIFIED 2026-07-28: grok-4-1-fast-reasoning is the SAME reasoning model as grok-4.3 (both emit
  // reasoning_content, both ~10-13s on a trivial prompt, both slow/hang-prone on the ~80k-token prose
  // prompt) — so it is USELESS as an immediate fallback from a reasoning primary (it just hangs again,
  // wasting a whole hang-guard timeout). The only genuinely-DIFFERENT, fast literary fallback is the
  // NON-reasoning model. So: reasoning primary → FAST non-reasoning fallback → (last-resort) the reasoning
  // alias (kept only so a client requesting it still validates). Author-quality choice (which reasoning
  // model / Grok 4.5 / Mistral) is deferred — this only fixes the fallback ORDER.
  NARRATIVE_AUTHOR: [
    'grok-4.3',                      // primary — reasoning tentpole author (client forces this via preferredModel)
    'grok-4-1-fast-non-reasoning',   // fallback 1 — genuinely different FAST author when the reasoning model hangs
    'grok-4-1-fast-reasoning'        // fallback 2 — reasoning alias of 4.3; last resort only (redundant, rarely reached)
  ]
};

// xAI status codes that indicate "try the next model in the chain".
// 400 = "model not found" / "invalid model". 404 = same in some routes.
// Everything else (401/403/429/5xx) fails fast.
const RETRY_NEXT_MODEL_STATUSES = new Set([400, 404]);

// ── UPSTREAM HANG GUARD (2026-07-28) ──────────────────────────────────────────
// THE BUG this fixes: a HUNG xAI request never becomes an error, so the per-role
// fallback chain (which only advances on 400/404) NEVER executes — the proxy waits
// forever and the whole continuation hangs indefinitely (observed: grok-4.3 on the
// ~80k-token HEAVY prose prompt stalling >420s; real users on tentpole scenes hit
// the same unrecoverable hang). FIX: an AbortController timeout converts a hang into
// a retryable condition that ADVANCES THE EXISTING CHAIN. Model-agnostic — the routing
// table decides WHICH literary models fill the chain; this only bounds each attempt.
// The chain stays literary-only (Grok→Grok→…); on full exhaustion the handler fails
// LOUDLY (never silently substitutes a non-literary author) — see the !selectedModel guard.
// Timeout is a CONFIGURABLE constant, sized from OBSERVED latency (2026-07-28): healthy grok-4.3
// authoring of the full ~80k-token prose prompt completes in ~13-23s; the failure mode is an
// INTERMITTENT indefinite hang (>230s). Confirmed over a batch: healthy reasoning-author calls top out
// ~26s; true hangs are caught >120s. The distribution is bimodal with a huge gap, so 90s sits far above
// any healthy completion (~3.5x the observed p100 → no legitimately-slow gen is cut → no unintended
// fallback) yet bounds each hang tightly — important because ONE continuation makes several Grok calls
// (author + renderer + repair), so a smaller per-call bound keeps the worst-case (multiple passes hang)
// from stacking. Retune from the per-call latency logged below ([SPECIALIST-PROXY] latency=…) if healthy
// tentpole scenes are ever seen above ~50s.
const XAI_CALL_TIMEOUT_MS = Number(process.env.XAI_CALL_TIMEOUT_MS) || 90000;

// ── GROK 4.3 MODEL/EFFORT RESOLUTION (Roman 2026-07-30) ──────────────────────
// xAI retired the Grok-4-Fast tier (2026-05-15): grok-4-1-fast-non-reasoning /
// grok-4-1-fast-reasoning / grok-4.20-*-non-reasoning are gone — every call now
// resolves to grok-4.3, and the ONLY real lever is reasoning.effort (none|low|
// medium|high), all at the same token price. The chains still carry the legacy
// names (they encode the *intent* — reasoning vs not — and keep preferredModel
// matching working), but we translate to the live model + an EXPLICIT effort so
// behavior is intended, not left to the opaque redirect. non-reasoning intent →
// 'none' (skips the reasoning phase: fewer output tokens, lower latency, fewer of
// the 80k-prompt hangs); reasoning intent → 'high'. A client may override per call
// with body.reasoningEffort (used by the per-scene effort routing + the author A/B).
function _resolveGrokModel(name, overrideEffort) {
  const n = String(name || '');
  let effort = (/non-reasoning|4\.20/.test(n)) ? 'none' : 'high';
  const OK = { none: 1, low: 1, medium: 1, high: 1 };
  if (overrideEffort && OK[String(overrideEffort)]) effort = String(overrideEffort);
  return { model: 'grok-4.3', effort };
}

/**
 * Validate that the requested model is allowed.
 * Throws an error if the model is not in the allowlist.
 */
function validateGrokModel(model) {
  if (!ALLOWED_GROK_MODELS.includes(model)) {
    throw new Error(
      `Disallowed specialist model: "${model}". ` +
      `Allowed models: ${ALLOWED_GROK_MODELS.join(', ')}`
    );
  }
  return true;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

// SECURITY: server-side prompt-injection scrub on user-role messages.
// The sanitizer file is CommonJS; in ESM we default-import then destructure
// so it works across Node versions without relying on named-import interop.
import _sanitizeInjectionMod from './_sanitize-injection.js';
const { sanitizeUserMessages } = _sanitizeInjectionMod;

export default async function handler(req, res) {
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

  const XAI_API_KEY = process.env.XAI_API_KEY;

  if (!XAI_API_KEY) {
    console.error('[SPECIALIST-PROXY] XAI_API_KEY not configured');
    return res.status(500).json({
      error: 'API key not configured',
      details: 'XAI_API_KEY environment variable is not set. Specialist renderer requires xAI API access.'
    });
  }

  try {
    const {
      messages: _rawMessages,
      model,
      temperature = 0.7,
      max_tokens = 1000,
      role = 'SPECIALIST_RENDERER',  // Orchestration role
      esd = null,  // Erotic Scene Directive (required for specialist rendering)
      convId = null  // xAI conversation id → x-grok-conv-id header, maximizes prompt-cache hits across requests
    } = req.body;
    // SECURITY: scrub user-role messages before any downstream code touches them.
    const messages = sanitizeUserMessages(_rawMessages, 'grok');

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
     * Model selection based on role:
     * - RENDERER: grok-4-1-fast-non-reasoning (visual bible, visualization ONLY)
     * - INTIMACY_SPECIALIST: grok-4-1-fast-reasoning (explicit scenes, ESD required)
     *
     * HARD RULE: Grok must NEVER be called for DSP, normalization, veto, or story logic.
     */

    // AUTHOR-equivalent roles must NEVER hit Grok proxy - reject immediately
    const AUTHOR_ROLES = [
      'AUTHOR', 'PRIMARY_AUTHOR', 'FATE_STRUCTURAL', 'FATE_ELEVATION',
      'NORMALIZATION', 'VETO_NORMALIZATION', 'DSP_NORMALIZATION'
    ];

    if (AUTHOR_ROLES.includes(role)) {
      console.error(`[SPECIALIST-PROXY] REJECTED: Role "${role}" is AUTHOR-equivalent and must use /api/chatgpt-proxy, not Grok.`);
      return res.status(400).json({
        error: 'WRONG_ENDPOINT',
        detail: `Role "${role}" is an AUTHOR role and must use /api/chatgpt-proxy. Grok proxy is for RENDERER and INTIMACY_SPECIALIST only.`
      });
    }

    // Role → model fallback chain.
    let modelChain = ROLE_MODEL_CHAIN[role];
    if (!Array.isArray(modelChain) || modelChain.length === 0) {
      return res.status(400).json({
        error: 'INVALID_ROLE',
        detail: `Unknown role: "${role}". Valid Grok roles: RENDERER, INTIMACY_SPECIALIST, SPECIALIST_RENDERER. AUTHOR roles use /api/chatgpt-proxy.`
      });
    }
    // Optional client override — if preferredModel is in the allowlist
    // AND in the role's chain, reorder the chain to start with it. Lets
    // the client (e.g., OAS turn router) request reasoning vs non-
    // reasoning Grok per-turn while still keeping the full fallback
    // chain behind it.
    const preferredModel = req.body && req.body.preferredModel;
    if (preferredModel && modelChain.includes(preferredModel)) {
      modelChain = [preferredModel].concat(modelChain.filter(m => m !== preferredModel));
      console.log(`[SPECIALIST-PROXY] Client preferredModel: ${preferredModel} → chain reordered.`);
    }

    // Enforce model allowlist on every chain entry (paranoia — if someone
    // edits ROLE_MODEL_CHAIN without updating ALLOWED_GROK_MODELS, fail loud).
    for (const m of modelChain) {
      if (!ALLOWED_GROK_MODELS.includes(m)) {
        console.error(`[SPECIALIST-PROXY] Chain model "${m}" not in allowlist.`);
        return res.status(500).json({ error: `Chain misconfigured: "${m}" not in allowlist` });
      }
    }

    console.log(`[SPECIALIST-PROXY] Role: ${role}, Model chain: ${modelChain.join(' → ')}`);

    // ==========================================================================
    // ESD VALIDATION (required for INTIMACY_SPECIALIST)
    // ==========================================================================
    /**
     * INTIMACY_SPECIALIST requires valid ESD. The renderer should only receive ESD content,
     * not raw plot context. RENDERER (visual extraction) does not require ESD.
     */

    if ((role === 'INTIMACY_SPECIALIST' || role === 'SPECIALIST_RENDERER') && esd) {
      // Validate ESD has required fields
      const requiredFields = ['eroticismLevel', 'completionAllowed', 'hardStops'];
      for (const field of requiredFields) {
        if (!(field in esd)) {
          console.warn(`[SPECIALIST-PROXY] ESD missing required field: ${field}`);
        }
      }

      // Check completion constraints
      if (!esd.completionAllowed) {
        console.log('[SPECIALIST-PROXY] Completion forbidden by ESD, renderer will be cut off before completion');
      }
    }

    // ==========================================================================
    // CALL XAI API — with per-role model fallback chain.
    // Walk the chain: try each model in order. On model-related 4xx
    // (400/404 — typically "model not found"), fall through to next.
    // On any other error (auth, quota, 5xx), fail fast — those aren't
    // model-name issues and retrying the next model won't help.
    // ==========================================================================

    let xaiResponse = null;
    let responseText = '';
    let data = null;
    let selectedModel = null;
    let lastErrorStatus = 0;
    let lastErrorData = null;
    // Per-request override of the hang-guard timeout (for tuning/verification); defaults to the constant.
    const _xaiTimeoutMs = Number(req.body && req.body.__xaiTimeoutMs) || XAI_CALL_TIMEOUT_MS;

    for (let i = 0; i < modelChain.length; i++) {
      const tryModel = modelChain[i];
      console.log(`[SPECIALIST-PROXY] Trying model ${i + 1}/${modelChain.length}: ${tryModel}`);
      // xAI prompt caching is automatic; a STABLE x-grok-conv-id across requests
      // maximizes cache hits on the shared prompt prefix (xAI-recommended).
      const _xaiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      };
      if (convId) _xaiHeaders['x-grok-conv-id'] = String(convId);
      // Resolve the (legacy-named) chain entry → live grok-4.3 + explicit reasoning.effort.
      const _grok = _resolveGrokModel(tryModel, req.body && req.body.reasoningEffort);
      const _xaiBody = {
        model: _grok.model,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
        reasoning: { effort: _grok.effort }
      };
      // Belt-and-suspenders cache hint: OpenAI-compatible APIs (xAI included) route
      // prompt-cache lookups by this stable key. Harmless if the upstream ignores it;
      // pairs with x-grok-conv-id to maximize prefix-cache hits across a story's scenes.
      if (convId) _xaiBody.prompt_cache_key = String(convId);
      // Bound this attempt so a HUNG upstream advances the chain instead of waiting forever.
      const _callStart = Date.now();
      const _ac = new AbortController();
      const _timer = setTimeout(() => _ac.abort(), _xaiTimeoutMs);
      try {
        xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: _xaiHeaders,
          body: JSON.stringify(_xaiBody),
          signal: _ac.signal
        });
        responseText = await xaiResponse.text();
      } catch (fetchErr) {
        clearTimeout(_timer);
        const _elapsed = Date.now() - _callStart;
        const _timedOut = fetchErr && (fetchErr.name === 'AbortError');
        // A timeout (hang) OR a transient network error → retryable: advance to the next
        // literary model in the chain. This is the core reliability fix — a hang is no
        // longer an infinite wait; it becomes a fast fallback to the next Grok author.
        console.warn(`[SPECIALIST-PROXY] Model ${tryModel} ${_timedOut ? 'TIMED OUT' : 'FETCH ERROR'} after ${_elapsed}ms${_timedOut ? ' (>' + _xaiTimeoutMs + 'ms hang guard) — advancing chain' : ': ' + (fetchErr && fetchErr.message) + ' — advancing chain'}`);
        lastErrorStatus = _timedOut ? 504 : 502;
        lastErrorData = { error: { message: _timedOut ? `xAI call for ${tryModel} exceeded ${_xaiTimeoutMs}ms (hang guard tripped)` : `xAI fetch failed for ${tryModel}: ${fetchErr && fetchErr.message}` } };
        continue; // next model in the literary-only chain
      }
      clearTimeout(_timer);
      console.log(`[SPECIALIST-PROXY] latency=${Date.now() - _callStart}ms model=${_grok.model} effort=${_grok.effort} (chain="${tryModel}") status=${xaiResponse.status}`);
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(`[SPECIALIST-PROXY] Non-JSON response from xAI for model ${tryModel}:`, responseText.slice(0, 500));
        return res.status(502).json({
          error: 'Invalid response from xAI API',
          details: responseText.slice(0, 200)
        });
      }
      if (xaiResponse.ok) {
        selectedModel = tryModel;
        console.log(`[SPECIALIST-PROXY] ✓ Model ${tryModel} succeeded`);
        break;
      }
      // Non-OK — decide whether to try next model in chain.
      lastErrorStatus = xaiResponse.status;
      lastErrorData = data;
      console.warn(`[SPECIALIST-PROXY] Model ${tryModel} returned ${xaiResponse.status}: ${data && data.error ? (data.error.message || JSON.stringify(data.error)) : '(no error message)'}`);
      if (!RETRY_NEXT_MODEL_STATUSES.has(xaiResponse.status)) {
        // Auth (401/403), quota (429), or server error (5xx) — not a
        // model-availability issue. Fail fast.
        console.error('[SPECIALIST-PROXY] Non-retryable status — failing fast.');
        return res.status(xaiResponse.status).json({
          error: (data && data.error && data.error.message) || 'xAI API request failed',
          details: data
        });
      }
      // Otherwise: retryable. Continue to next model in chain.
    }

    if (!selectedModel) {
      console.error('[SPECIALIST-PROXY] Entire model chain exhausted. Last error:', lastErrorData);
      return res.status(lastErrorStatus || 502).json({
        error: 'All Grok models in fallback chain failed',
        details: lastErrorData,
        chainTried: modelChain
      });
    }

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[SPECIALIST-PROXY] Malformed xAI response:', data);
      return res.status(502).json({
        error: 'Malformed response from xAI API',
        details: 'Response missing choices[0].message'
      });
    }

    // ==========================================================================
    // POST-PROCESS: Apply Hard Stops if ESD specifies
    // ==========================================================================
    /**
     * If the ESD specifies that completion is forbidden, we may need to
     * truncate the output if the renderer attempted to complete the scene.
     *
     * This is a safeguard — the renderer should respect constraints, but
     * we enforce at the API level as well.
     */

    if (esd && !esd.completionAllowed) {
      const content = data.choices[0].message.content;
      // Check for completion indicators and truncate if needed
      const completionIndicators = [
        /\bcame\b.*\btogether\b/i,
        /\bclimax\b/i,
        /\bfinished\b.*\b(inside|together)\b/i,
        /\breleased?\b.*\b(everything|all)\b/i
      ];

      for (const pattern of completionIndicators) {
        if (pattern.test(content)) {
          console.warn('[SPECIALIST-PROXY] Detected completion in output when forbidden, truncating');
          // Truncate at the completion indicator
          const match = content.match(pattern);
          if (match && match.index) {
            const truncated = content.substring(0, match.index).trim();
            if (truncated.length > 100) {
              data.choices[0].message.content = truncated + '\n\n[The moment stretches, suspended...]';
            }
          }
          break;
        }
      }
    }

    // ==========================================================================
    // RETURN RESPONSE
    // ==========================================================================

    // Add metadata about the orchestration role
    const enrichedResponse = {
      ...data,
      _orchestration: {
        role: role,
        model: selectedModel,
        isSpecialistRenderer: true,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json(enrichedResponse);

  } catch (err) {
    console.error('[SPECIALIST-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact xAI API',
      details: err.message
    });
  }
}
