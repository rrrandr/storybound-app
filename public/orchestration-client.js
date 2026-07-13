/**
 * =============================================================================
 * STORYBOUND AI ORCHESTRATION CLIENT (FRONTEND)
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This module provides the frontend interface for the AI orchestration system.
 * It enforces the canonical call order and model responsibilities.
 *
 * =============================================================================
 * MODEL RESPONSIBILITIES (NON-NEGOTIABLE)
 * =============================================================================
 *
 * ChatGPT (PRIMARY AUTHOR):
 *   - Plot, psychology, consent, limits, consequences
 *   - Decides WHAT happens and WHETHER intimacy occurs
 *   - Monetization gate enforcement
 *   - Integration of all outputs
 *
 * Grok (SD AUTHOR — Steamy/Passionate ONLY):
 *   - Anatomical explicitness
 *   - Sensory vividness
 *   - Physical embodiment
 *   - Does NOT decide outcomes or consequences
 *
 * Gemini (FALLBACK AUTHOR):
 *   - Called ONLY if ChatGPT fails
 *   - Conservative output (safety net)
 *   - NO RETRIES — if Gemini fails, abort
 *
 * =============================================================================
 * ORCHESTRATION FLOW
 * =============================================================================
 *
 * 1. ChatGPT — Author Pass (ALWAYS RUNS)
 *    - Plot beats, character psychology, dialogue intent
 *    - Determines if intimacy occurs
 *    - For Steamy/Passionate: generates [CONSTRAINTS] for Grok
 *    - For Clean/Naughty: generates complete output
 *    - ON FAILURE: Gemini fallback (one attempt, no retries)
 *
 * 1B. Grok — SD Authoring (Steamy/Passionate ONLY, CONDITIONAL)
 *    - Authors the Scene Directive
 *    - Receives constraints from ChatGPT
 *    - ON FAILURE: fateStumbled, continue with ChatGPT integration
 *
 * 2. Specialist Renderer (OPTIONAL)
 *    - Called only if SD allows and entitlement permits
 *    - Renders embodied prose within SD bounds
 *
 * 3. ChatGPT — Integration Pass (ALWAYS RUNS)
 *    - Absorbs rendered scene (if any)
 *    - Applies consequences
 *    - Enforces cliffhanger or completion
 *
 * =============================================================================
 */

(function(window) {
  'use strict';

  // Token usage + cost accumulator — measurement only, no behavioral impact.
  // Cost capture lazy-inits state._sceneCostAcc on first hit; finalized at
  // scene-render success (app.js, where _sceneTokenCount resets) and cleared
  // on failure. Pricing helpers live on window (defined in app.js).
  function _accumulateTokens(data, modelName, profileLabel) {
    if (!data || !data.usage) return;
    const s = window.state;
    if (!s) return;
    if (typeof data.usage.total_tokens === 'number') {
      s._sceneTokenCount = (s._sceneTokenCount || 0) + data.usage.total_tokens;
    }
    // Cost capture (gracefully no-ops if helpers/state not initialized).
    try {
      // Lazy-init via helper exposed by app.js. If app.js hasn't loaded the
      // cost system yet (very early init), this is a no-op.
      const acc = (typeof window._ensureSceneCostAcc === 'function')
          ? window._ensureSceneCostAcc()
          : s._sceneCostAcc;
      if (acc && typeof acc.addText === 'function') {
        // Prefer caller-supplied model; fall back to data.model if echoed.
        const mdl = modelName || data.model || 'default';
        acc.addText(mdl, data.usage);
        // Flag Grok use for scene-type classification at finalize time. Any
        // grok-* model in this scene marks the scene as 'grok' regardless of
        // other models also called. Cleared per-scene in app.js.
        if (mdl && /grok/i.test(mdl)) s._usedGrok = true;
      }
    } catch (_) { /* cost capture is non-critical; never block generation */ }
    _logPromptProfile(profileLabel, modelName || data.model, data.usage);
  }

  // ── [PROMPT-PROFILE] — dev instrumentation (2026-06-17) ────────────────────
  // Pure observation (never alters generation). Logs prompt / reasoning / visible
  // tokens per model call, keyed by PASS LABEL, so a single debug session yields
  // the real per-pass cost breakdown (author vs SD vs renderer vs integration vs
  // audits). reasoning_tokens (xAI: separate, output-priced, ~invisible to the
  // existing cost log) is the specifically-missing dimension. Summarize with
  // window._promptProfileSummary().
  function _logPromptProfile(label, model, usage) {
    try {
      if (!usage || typeof window === 'undefined' || !window.state) return;
      const cd = usage.completion_tokens_details || {};
      const rec = {
        label: label || 'PRIMARY_AUTHOR',
        model: model || usage.model || 'default',
        prompt: usage.prompt_tokens || usage.input_tokens || 0,
        reasoning: cd.reasoning_tokens || 0,
        visible: usage.completion_tokens || usage.output_tokens || 0,
        turn: window.state.turnCount || 0
      };
      (window.state._promptProfile = window.state._promptProfile || []).push(rec);
      console.log('[PROMPT-PROFILE] ' + rec.label + ' · ' + rec.model
        + ' · prompt=' + rec.prompt + ' reasoning=' + rec.reasoning
        + ' visible=' + rec.visible + ' · turn ' + rec.turn);
    } catch (_) { /* never block generation */ }
  }

  // Per-pass cost breakdown table. Run window._promptProfileSummary() in the
  // console after a debug session. $ uses the same list rates + 1.4x overhead as
  // the cost system; reasoning_tokens billed as output (xAI).
  if (typeof window !== 'undefined') window._promptProfileSummary = function () {
    const RATE = { // [in, out] $/token; prefix-matched against model name
      'grok-4-1-fast-reasoning': [0.0000005, 0.0000015],
      'grok-4-1-fast-non-reasoning': [0.0000002, 0.0000005],
      'grok-4.3': [0.00000125, 0.0000025],
      'gpt-4o-mini': [0.00000015, 0.0000006],
      'gpt-4o': [0.0000025, 0.00001],
      'claude-opus': [0.000015, 0.000075],
      'claude-sonnet': [0.000003, 0.000015],
      'claude-haiku': [0.000001, 0.000005]
    };
    const rate = (m) => { for (const k in RATE) if ((m || '').indexOf(k) === 0) return RATE[k]; return [0.0000005, 0.0000015]; };
    const recs = (window.state && window.state._promptProfile) || [];
    if (!recs.length) { console.log('[PROMPT-PROFILE] no calls captured yet'); return; }
    const by = {};
    recs.forEach((r) => {
      const b = (by[r.label + ' · ' + r.model] = by[r.label + ' · ' + r.model] || { n: 0, prompt: 0, reasoning: 0, visible: 0, cost: 0, model: r.model });
      const rr = rate(r.model);
      b.n++; b.prompt += r.prompt; b.reasoning += r.reasoning; b.visible += r.visible;
      b.cost += (r.prompt * rr[0] + (r.visible + r.reasoning) * rr[1]) * 1.4;
    });
    let total = 0;
    const rows = Object.keys(by).sort((a, c) => by[c].cost - by[a].cost).map((k) => {
      const b = by[k]; total += b.cost;
      return {
        pass: k, model: b.model, calls: b.n,
        avgPrompt: Math.round(b.prompt / b.n), avgReason: Math.round(b.reasoning / b.n),
        avgVisible: Math.round(b.visible / b.n),
        reasonPerVis: b.visible ? +(b.reasoning / b.visible).toFixed(2) : '-',
        '$total': +b.cost.toFixed(4)
      };
    });
    console.table(rows);
    console.log('TOTAL $' + total.toFixed(4) + ' across ' + recs.length + ' calls / ' + Object.keys(by).length + ' passes');
    return rows;
  };

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  const CONFIG = {
    // API endpoints
    CHATGPT_PROXY: '/api/chatgpt-proxy',
    ANTHROPIC_PROXY: '/api/anthropic-proxy',
    SPECIALIST_PROXY: '/api/proxy',
    GEMINI_PROXY: '/api/gemini-proxy',
    MISTRAL_PROXY: '/api/mistral-proxy',
    DEEPSEEK_PROXY: '/api/deepseek-proxy',

    // Default models
    PRIMARY_AUTHOR_MODEL: 'gpt-4o-mini',           // ChatGPT: Plot, psychology, consent, limits, consequences
    FALLBACK_AUTHOR_MODEL: 'gemini-2.0-flash',     // Gemini: Fallback if ChatGPT fails (conservative)
    SD_AUTHOR_MODEL: 'grok-4-1-fast-reasoning',     // Grok: SD authoring for Steamy/Passionate ONLY (PRIMARY)
    SD_DEEPSEEK_PRO_MODEL: 'deepseek-v4-pro',    // DeepSeek Pro: Tier-1 fallback (embodied)
    SD_DEEPSEEK_FLASH_MODEL: 'deepseek-v4-flash', // DeepSeek Flash: Tier-2 fallback (cost-efficient)
    SD_FALLBACK_MODEL: 'mistral-medium-latest',   // Mistral: Tier-3 terminal fallback
    RENDERER_MODEL: 'grok-4-1-fast-non-reasoning',   // Grok: Visual bible, visualization prompts ONLY
    SCENE_RENDERER_MODEL: 'grok-4-1-fast-reasoning',   // Grok: Intense scenes (SD-gated, entitlement-checked)
    NARRATIVE_AUTHOR_MODEL: 'grok-4.3',                 // Grok 4.3: the SCENE AUTHOR (literary + CG prose). Roman 2026-06-20 editorial-budget reframe — same author everywhere; editorial effort scales with scene tier. Proxy auto-falls-back to grok-4-1-fast-reasoning on 400/404.
    FATE_STRUCTURAL_MODEL: 'gpt-4o-mini',
    FATE_ELEVATION_MODEL: 'gpt-4o-mini',
    STRATEGY_PASS_MODEL: 'gpt-4o-mini',          // Strategy pre-pass: structural decisions (low temp)
    STRUCTURAL_CORRECTION_MODEL: 'gpt-4o-mini',  // Post-render additive correction (Pass 4)

    // Anthropic prose-tier models (require /api/anthropic-proxy endpoint —
    // not yet wired; resolveRenderTier returns these slugs but the proxy
    // dispatcher will need to route them once the endpoint exists).
    OPUS_MODEL:   'claude-opus-4-7',     // Opus 4.7 — top-quality prose, $15/$75 per M tokens. Reserved for Tier A major scenes.
    SONNET_MODEL: 'claude-sonnet-4-5',   // Sonnet 4.x — strong prose, $3/$15 per M tokens. Tier A in-between + Tier B Scene 1.

    // Model allowlists (must match server-side)
    ALLOWED_PRIMARY_MODELS: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'claude-haiku-4-5'], // Sonnet/Opus removed 2026-06-24 — cost-deprecated as authors (Haiku repair only)
    ALLOWED_FALLBACK_MODELS: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    ALLOWED_SD_AUTHOR_MODELS: ['grok-4-1-fast-reasoning'],
    ALLOWED_SD_DEEPSEEK_MODELS: ['deepseek-v4-pro', 'deepseek-v4-flash'],
    ALLOWED_SD_FALLBACK_MODELS: ['mistral-medium-latest', 'mistral-large-latest'],
    ALLOWED_RENDERER_MODELS: ['grok-4-1-fast-non-reasoning'],
    ALLOWED_SCENE_RENDERER_MODELS: ['grok-4-1-fast-reasoning'],
    ALLOWED_NARRATIVE_AUTHOR_MODELS: ['grok-4.3', 'grok-4-1-fast-reasoning'],

    // Feature flags
    ENABLE_SPECIALIST_RENDERER: true,
    ENABLE_FATE_ELEVATION: true,
    ENABLE_GROK_SD_AUTHORING: true,   // Grok authors SD for Steamy/Passionate
    ENABLE_DEEPSEEK_SD: true,         // DeepSeek V4 Pro/Flash fallback (Tier 1 + 2)
    ENABLE_MISTRAL_SD: true, // Mistral fallback if Grok fails (Steamy/Passionate ONLY)
    // A1: route NON-INTIMATE scene prose to Grok (NARRATIVE_AUTHOR role) with a
    // gpt-4o-mini consent/control pre-pass + tight Sonnet polish + Haiku repair.
    // LOCALHOST-GATED (2026-06-17): true ONLY on dev hosts so the pipeline runs
    // for local measurement/verification but CANNOT ship by deploy until
    // explicitly promoted to literal `true`. In production this is false → the
    // selector keeps the legacy gpt-4o/Sonnet author routing (zero behavior
    // change). Intimacy/OAS prose is unaffected either way (already Grok).
    // RE-ENABLED (localhost-gated) 2026-06-18 at Roman's request: Grok reasoning
    // ("thinking") authors NON-INTIMATE scene prose, with the cheap Haiku/gpt-4o-mini
    // mechanical repair pass + targeted Sonnet/gpt-4o romance-span polish (see
    // _grokLiteraryAuthor). Was DISABLED 2026-06-17 after a localhost playthrough
    // showed adherence regressions (off-premise drift, calcified phrases,
    // A-plot-over-romance, low LI desire). Kept LOCALHOST-GATED — production users
    // stay on the legacy GPT/Sonnet author until the lean-Grok-prompt + 50-seed
    // quality A/B confirm the regressions are gone, then promote to literal `true`.
    // PROMOTED TO PRODUCTION (Roman 2026-06-24): Grok authors non-intimate scene
    // prose EVERYWHERE now (was localhost-gated). This is the documented promotion
    // path — flipping to literal `true` makes resolveRenderTier remap paid Anthropic
    // author decisions (Sonnet/Opus) to Grok and routes the renderTier path through
    // callGrokNarrativeAuthor instead of callChatGPT. Sonnet/Opus are cost-deprecated;
    // their selector tiers still exist for telemetry but _maybeRemapAuthorToGrok now
    // always overrides them with Grok. Intimacy/OAS prose was already Grok.
    ENABLE_GROK_NARRATIVE_AUTHOR: true,

    // Timeouts
    API_TIMEOUT_MS: 60000
  };

  // ===========================================================================
  // MONETIZATION GATES (MUST MATCH SERVER-SIDE)
  // ===========================================================================
  /**
   * Monetization tier enforcement.
   * These gates MUST be checked BEFORE any renderer call.
   * No AI model may override these rules.
   */

  // MONETIZATION_GATES — currency unification: a single balance-gated regime.
  // Cliffhangers are designed narrative beats, not paywall walls. The (b)
  // "approach arc close" preference (set when balance is near zero) nudges
  // generation toward arc-natural pause points without crossing the wallet
  // firewall — the boolean preference, not the raw balance, is what passes.
  const MONETIZATION_GATES = {
    default: {
      name: 'BALANCE_GATED',
      completionAllowed: true,
      cliffhangerRequired: false,
      maxStoryLength: 'soulmates'
    }
  };

  // ===========================================================================
  // READER PREFERENCE INFERENCE (SESSION-SCOPED, DETERMINISTIC)
  // ===========================================================================
  /**
   * Lightweight reader preference adaptation.
   * - NOT machine learning, NOT personalization via memory
   * - Deterministic inference from existing session behavior
   * - Advisory only — never overrides safety, consent, or monetization
   * - Session-scoped — no persistence beyond session
   */

  // Minimum evidence thresholds before flipping a preference signal
  const PREFERENCE_THRESHOLDS = {
    CARD_SELECTION_MIN: 2,        // Minimum selections of a card type to infer preference
    INTENSITY_SUSTAIN_TURNS: 3,   // Turns at high intensity to confirm sustained preference
    ESCALATION_EARLY_TURN: 3,     // Turn count threshold for "early" escalation
    INTERRUPTION_TOLERANCE: 2     // Interruptions before inferring dislike
  };

  // Session-scoped preference tracking (resets on page reload)
  let _sessionPreferenceData = {
    cardSelections: { power: 0, confession: 0, temptation: 0, boundary: 0, silence: 0 },
    intensityHistory: [],           // Array of intensity levels per turn
    interruptionsEncountered: 0,
    storiesAbandonedAfterInterrupt: 0,
    escalationTurns: [],            // Turn numbers when escalation occurred
    archetypesSelected: {},         // { archetypeId: count }
    totalTurns: 0
  };

  /**
   * Record a preference signal from user behavior.
   * Called from app.js when relevant actions occur.
   */
  function recordPreferenceSignal(signalType, data) {
    switch (signalType) {
      case 'FATE_CARD_SELECTED':
        if (data.cardId && _sessionPreferenceData.cardSelections[data.cardId] !== undefined) {
          _sessionPreferenceData.cardSelections[data.cardId]++;
        }
        break;

      case 'TURN_COMPLETED':
        _sessionPreferenceData.totalTurns++;
        if (data.intensity) {
          _sessionPreferenceData.intensityHistory.push(data.intensity);
        }
        break;

      case 'ESCALATION_OCCURRED':
        _sessionPreferenceData.escalationTurns.push(data.turnNumber || _sessionPreferenceData.totalTurns);
        break;

      case 'INTERRUPTION_ENCOUNTERED':
        _sessionPreferenceData.interruptionsEncountered++;
        break;

      case 'STORY_ABANDONED_AFTER_INTERRUPT':
        _sessionPreferenceData.storiesAbandonedAfterInterrupt++;
        break;

      case 'ARCHETYPE_SELECTED':
        if (data.archetypeId) {
          _sessionPreferenceData.archetypesSelected[data.archetypeId] =
            (_sessionPreferenceData.archetypesSelected[data.archetypeId] || 0) + 1;
        }
        break;
    }
  }

  /**
   * Infer reader preferences from accumulated session data.
   * Returns ReaderPreferenceSummary with null for unknown/insufficient data.
   */
  function inferReaderPreferences() {
    const data = _sessionPreferenceData;
    const T = PREFERENCE_THRESHOLDS;

    const summary = {
      prefersDominance: null,
      prefersSlowBurn: null,
      dislikesFrequentInterruptions: null,
      seeksConfessionMoments: null,
      escalatesEarly: null,
      sustainsHighIntensity: null
    };

    // Insufficient data guard
    if (data.totalTurns < 2) {
      return summary;
    }

    // --- prefersDominance ---
    // Inferred from power card selection frequency relative to other cards
    const totalCardSelections = Object.values(data.cardSelections).reduce((a, b) => a + b, 0);
    if (totalCardSelections >= T.CARD_SELECTION_MIN * 2) {
      const powerRatio = data.cardSelections.power / totalCardSelections;
      if (powerRatio > 0.35) {
        summary.prefersDominance = true;
      } else if (powerRatio < 0.1 && data.cardSelections.silence >= T.CARD_SELECTION_MIN) {
        summary.prefersDominance = false;
      }
    }

    // --- prefersSlowBurn ---
    // Inferred from silence/boundary selections vs temptation/power
    if (totalCardSelections >= T.CARD_SELECTION_MIN * 2) {
      const slowCards = data.cardSelections.silence + data.cardSelections.boundary;
      const fastCards = data.cardSelections.temptation + data.cardSelections.power;
      if (slowCards > fastCards && slowCards >= T.CARD_SELECTION_MIN) {
        summary.prefersSlowBurn = true;
      } else if (fastCards > slowCards * 2 && fastCards >= T.CARD_SELECTION_MIN) {
        summary.prefersSlowBurn = false;
      }
    }

    // --- dislikesFrequentInterruptions ---
    // Inferred from abandonment rate after interruptions
    if (data.interruptionsEncountered >= T.INTERRUPTION_TOLERANCE) {
      const abandonRate = data.storiesAbandonedAfterInterrupt / data.interruptionsEncountered;
      if (abandonRate > 0.5) {
        summary.dislikesFrequentInterruptions = true;
      }
    }

    // --- seeksConfessionMoments ---
    // Inferred from confession card selection frequency
    if (data.cardSelections.confession >= T.CARD_SELECTION_MIN) {
      const confessionRatio = data.cardSelections.confession / totalCardSelections;
      if (confessionRatio > 0.25) {
        summary.seeksConfessionMoments = true;
      }
    }

    // --- escalatesEarly ---
    // Inferred from escalation occurring before turn threshold
    if (data.escalationTurns.length > 0) {
      const earlyEscalations = data.escalationTurns.filter(t => t <= T.ESCALATION_EARLY_TURN).length;
      if (earlyEscalations >= 2) {
        summary.escalatesEarly = true;
      } else if (data.escalationTurns.every(t => t > T.ESCALATION_EARLY_TURN * 2)) {
        summary.escalatesEarly = false;
      }
    }

    // --- sustainsHighIntensity ---
    // Inferred from maintaining Steamy/Passionate for consecutive turns
    const recentIntensity = data.intensityHistory.slice(-T.INTENSITY_SUSTAIN_TURNS);
    if (recentIntensity.length >= T.INTENSITY_SUSTAIN_TURNS) {
      const allHigh = recentIntensity.every(i => ['Steamy', 'Passionate'].includes(i));
      if (allHigh) {
        summary.sustainsHighIntensity = true;
      }
    }

    return summary;
  }

  /**
   * Build natural language preference bias block for system prompt injection.
   * Returns empty string if no meaningful preferences are inferred.
   * Maximum 2-3 sentences. Never commands, never mentions data/tracking.
   */
  function buildPreferenceBiasBlock() {
    const prefs = inferReaderPreferences();

    // Check if we have any non-null preferences
    const hasPreferences = Object.values(prefs).some(v => v !== null);
    if (!hasPreferences) {
      return '';
    }

    const biases = [];

    // Build natural language bias statements
    if (prefs.prefersDominance === true) {
      biases.push('assertive dynamics and power-aware framing');
    } else if (prefs.prefersDominance === false) {
      biases.push('gentler approaches and shared vulnerability');
    }

    if (prefs.prefersSlowBurn === true) {
      biases.push('sustained tension over rapid escalation');
    } else if (prefs.prefersSlowBurn === false) {
      biases.push('momentum when chemistry permits');
    }

    if (prefs.seeksConfessionMoments === true) {
      biases.push('emotional revelation beats');
    }

    if (prefs.sustainsHighIntensity === true) {
      biases.push('sustained intensity when appropriate');
    }

    if (biases.length === 0) {
      // Only interruption preference — handle separately
      if (prefs.dislikesFrequentInterruptions === true) {
        return '\n[READER TENDENCY: Fewer narrative interruptions are preferred unless dramatically necessary.]';
      }
      return '';
    }

    // Construct the bias block (max 2-3 sentences)
    let block = `\n[READER TENDENCY: The narrative may lean toward ${biases.slice(0, 2).join(' and ')}.`;

    if (biases.length > 2) {
      block += ` ${biases[2].charAt(0).toUpperCase() + biases[2].slice(1)} may also resonate.`;
    }

    if (prefs.dislikesFrequentInterruptions === true) {
      block += ' Avoid unnecessary interruptions.';
    }

    block += ']';

    return block;
  }

  /**
   * Reset session preference data (called on new story start if desired).
   */
  function resetPreferenceData() {
    _sessionPreferenceData = {
      cardSelections: { power: 0, confession: 0, temptation: 0, boundary: 0, silence: 0 },
      intensityHistory: [],
      interruptionsEncountered: 0,
      storiesAbandonedAfterInterrupt: 0,
      escalationTurns: [],
      archetypesSelected: {},
      totalTurns: 0
    };
  }

  // ===========================================================================
  // ORCHESTRATION STATE
  // ===========================================================================

  /**
   * Create a fresh orchestration state for a story generation cycle.
   */
  function createOrchestrationState() {
    return {
      phase: 'INIT',
      authorOutput: null,
      esd: null,
      rendererOutput: null,
      integrationOutput: null,
      gateEnforcement: null,
      rendererCalled: false,
      rendererFailed: false,
      fateStumbled: false,
      forcedInterruption: false,   // True if Steamy/Passionate scene was cut away due to renderer failure
      usedFallbackAuthor: false,   // True if Gemini was used instead of ChatGPT
      esdAuthoredByGrok: false,        // True if Grok authored the SD
      esdAuthoredByDeepSeekPro: false, // True if DeepSeek V4 Pro authored the SD (Tier 1 fallback)
      esdAuthoredByDeepSeekFlash: false, // True if DeepSeek V4 Flash authored the SD (Tier 2 fallback)
      esdAuthoredByMistral: false,     // True if Mistral authored the SD (Tier 3 terminal fallback)
      grokFailed: false,               // True if Grok SD authoring failed
      deepSeekProFailed: false,        // True if DeepSeek Pro fallback failed
      deepSeekFlashFailed: false,      // True if DeepSeek Flash fallback failed
      mistralFailed: false,            // True if Mistral SD fallback also failed
      errors: [],
      timing: {
        startTime: Date.now(),
        authorPassMs: 0,
        esdAuthorMs: 0,
        renderPassMs: 0,
        integrationPassMs: 0
      }
    };
  }

  // ===========================================================================
  // MONETIZATION GATE ENFORCEMENT
  // ===========================================================================

  /**
   * Enforce monetization gates BEFORE any renderer call.
   * Returns the constraints that must be applied.
   */
  // enforceMonetizationGates — controls ONLY completion, length, saves, fortunes.
  // Does NOT influence intimacy authorization in any way.
  function enforceMonetizationGates(accessTier, options = {}) {
    const gate = MONETIZATION_GATES.default;
    const narrativeBeatPreference = options.narrativeBeatPreference || 'normal';

    return {
      accessTier: accessTier || 'default',
      gateCode: gate.name,
      completionAllowed: gate.completionAllowed,
      cliffhangerRequired: gate.cliffhangerRequired,
      storyLengthLimit: gate.maxStoryLength,
      narrativeBeatPreference,
    };
  }

  /**
   * Derive the narrative beat preference from current balance + scene cost.
   * Returns 'approach_arc_close' when within ~2 scenes of zero. The boolean
   * crosses the wallet-data firewall via gateEnforcement; balance never does.
   */
  function deriveNarrativeBeatPreference(fortunes, sceneCost) {
    if (typeof fortunes !== 'number' || typeof sceneCost !== 'number' || sceneCost <= 0) {
      return 'normal';
    }
    return fortunes <= sceneCost * 2 ? 'approach_arc_close' : 'normal';
  }

  // ===========================================================================
  // SD VALIDATION
  // ===========================================================================

  /**
   * Validate an Scene Directive before sending to specialist renderer.
   */
  function validateSD(esd) {
    if (!esd) return { valid: false, errors: ['SD is null'] };

    const errors = [];
    const required = ['completionAllowed', 'hardStops'];

    for (const field of required) {
      if (!(field in esd)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ===========================================================================
  // PREMIUM RENDER TIER — Dynamic model + token selection (rendering only)
  // Does NOT alter gameplay, ST, intimacy, volatility math, or gating.
  // ===========================================================================

  /**
   * Resolve the render tier for the PRIMARY_AUTHOR call.
   * Returns { model, max_tokens, reason } based on current app state.
   * Priority: TemptFate > Apex > Scene1 > Complex > CriticalST > Ending > Volatility > Default
   *
   * Critical scenes always use gpt-4o for prose quality, regardless of
   * whether Grok orchestration is active (Grok handles rendering, but the
   * author pass benefits from the stronger model at narrative pivot points).
   */
  // ── INTRICATE-WORLD / DELICATE-POV CATALOG ──
  // Worlds and POV modes that demand top-tier prose: heavy lore, delicate
  // craft requirements, or aggressively-prompted directive stacks where
  // the model still has to fill significant interstitial work. These
  // promote a story to the OPUS-major / SONNET-in-between tier (formerly
  // Tier A → gpt-4o). Standard worlds stay on SONNET-Scene-1 /
  // GPT-4o-key-scenes / GPT-4o-mini-connective.
  //
  // CRITERIA for inclusion:
  //   • Aggressively-prompted by the team (billionaire_modern, glass_house)
  //   • Delicate metaphysics that punish off-key prose (fated_blood, cursed)
  //   • Strong ontological premise that requires consistent restraint
  //     (post_human, simulation, prehistoric, endless_edit, quieting_event)
  //   • POVs where one mannered sentence breaks the spell
  //     (author5th, environment4th)
  //   • Tones requiring sustained ironic control (WryConfession)
  //
  // Add a new world to the intricate tier by appending to _INTRICATE_FLAVORS.
  const _INTRICATE_FLAVORS = new Set([
    // Modern — heavy author-side prompting
    'billionaire_modern',
    // Fantasy — delicate metaphysics, oath/blood/curse mechanics
    'fated_blood', 'arcane_binding', 'the_beyond', 'cursed',
    // Dystopia — strong ontological premises (perception, erasure, silence)
    'glass_house', 'endless_edit', 'quieting_event', 'angry_room', 'dogma',
    // Sci-fi — philosophy worlds requiring sustained tone
    'post_human', 'simulation',
    // Historical — pre-language and pre-modern restraint
    'prehistoric'
  ]);

  function _isIntricateContext(appState) {
    if (!appState) return false;
    // POV-driven: the whole story is delicate regardless of world.
    if (appState.povMode === 'environment4th') return true;
    if (appState.povMode === 'author5th') return true;
    // Tone-driven: WryConfession needs sustained ironic control.
    if (appState.picks && appState.picks.tone === 'WryConfession') return true;
    // Future experimental modes — covered by an existing flag.
    if (appState._experimentalNarrativeMode === true) return true;
    // World-flavor-driven.
    const flavor = appState.picks && appState.picks.worldSubtype;
    if (flavor && _INTRICATE_FLAVORS.has(flavor)) return true;
    return false;
  }

  // ===========================================================================
  // COHERENCE TELEMETRY — SHADOW LAYER (log-only, except init-hazard router)
  // ===========================================================================
  // Measurement-before-crystallization: we compute a tentative coherence
  // vector on every scene to build a real-world distribution, but we do NOT
  // route on the vector yet. The only routing impact today is the narrow
  // _isInitializationHazard rule (Scene 1 + Glass House 4th/5th POV or
  // simulation-layer worlds → Opus). Everything else is data collection.
  //
  // Axes are tentative — they overlap and may collapse:
  //   pov_instability     POV geometry difficulty for the model
  //   ontology_instability How unstable is the reader's epistemic ground?
  //   ambiguity_load       Count of held-open narrative questions
  //   world_law_stress     Active rule-bending: Tempt, rupture, paradox
  //   reveal_density       Reveals about to / currently landing
  //   thematic_convergence Motifs / scars / echoes firing concurrently
  //
  // Each axis returns 0-3. We do NOT sum to a routing score yet — distribution
  // analysis comes first, ontology consolidation next, thresholds last.
  //
  // EVERY axis read is try/wrapped — missing state slot returns 0, never
  // throws. Telemetry must never break generation.
  // ===========================================================================

  function _safeRead(fn, dflt) {
    try { const v = fn(); return (v === undefined || v === null) ? dflt : v; }
    catch (_) { return dflt; }
  }

  function _computeCoherenceVector(appState) {
    if (!appState) return null;
    const s = appState;

    // POV instability: standard 1st/3rd → 0; LI POV → 1; Fate (author5th) → 2;
    // Material (environment4th) → 3.
    const _pov = _safeRead(() => {
      const m = s.povMode;
      if (m === 'environment4th') return 3;
      if (m === 'author5th') return 2;
      if (m === 'loveInterestPOV') return 1;
      return 0;
    }, 0);

    // Ontology instability: how unstable is the epistemic ground?
    //   simulation / the_beyond → 3 (reality may be unreal)
    //   glass_house → 2 (Chorus / Field epistemics, hive cognition)
    //   dystopia subtypes (dogma, human_capital) → 1 (social unreality)
    //   else → 0
    const _ont = _safeRead(() => {
      const w = s.worldSubtype || (s.picks && s.picks.worldSubtype) || '';
      if (w === 'simulation' || w === 'the_beyond') return 3;
      if (w === 'glass_house') return 2;
      if (w === 'dogma' || w === 'human_capital') return 1;
      return 0;
    }, 0);

    // Ambiguity load: held-open questions the scene must keep aloft.
    //   +1 hiddenTruth.active
    //   +1 committedTruth seeded but not in reveal window
    //   +1 pendingPetition (fate-petition unresolved)
    //   +1 structural-ambiguity world (fated_blood / glass_house / the_beyond)
    //   cap 3
    const _amb = _safeRead(() => {
      let n = 0;
      if (s.hiddenTruth && s.hiddenTruth.active) n++;
      if (s.committedTruth && s.committedTruth.decidedTruth && s.committedTruth.phase !== 'reveal') n++;
      if (s.fate && s.fate.pendingPetition) n++;
      const w = s.worldSubtype || (s.picks && s.picks.worldSubtype) || '';
      if (w === 'fated_blood' || w === 'glass_house' || w === 'the_beyond') n++;
      return Math.min(3, n);
    }, 0);

    // World-law stress: active rule-bending pressure on the world.
    //   +1 tempt_fate this turn (mythic distortion authorized)
    //   +1 greater fate move used this scene
    //   +1 any NIL rupture vector pressure > 1
    //   cap 3
    const _wls = _safeRead(() => {
      let n = 0;
      if (s.tempt_fate_invoked_this_turn === true) n++;
      if (s.fate && s.fate.greaterUsedThisScene) n++;
      const r = s._nilRuptureVectorPressure || {};
      if (Object.keys(r).some(k => (r[k] || 0) > 1)) n++;
      return Math.min(3, n);
    }, 0);

    // Reveal density: reveals currently landing.
    //   +1 hiddenTruth in reveal phase
    //   +1 committedTruth in reveal phase
    //   +1 grievance convergence active
    //   cap 3
    const _rev = _safeRead(() => {
      let n = 0;
      if (s.hiddenTruth && s.hiddenTruth.phase === 'reveal') n++;
      if (s.committedTruth && (s.committedTruth.phase === 'reveal' || s.committedTruth.phase === 'aftermath')) n++;
      const grv = s.grievanceContracts || [];
      if (grv.some(g => g && (g.phase === 'convergence' || g.phase === 'reveal'))) n++;
      return Math.min(3, n);
    }, 0);

    // Thematic convergence: how many motif/scar/echo systems are firing concurrently?
    // Heuristic — true convergence detection requires deeper instrumentation
    // we haven't wired. Use rough proxies:
    //   +1 active grievance contracts ≥ 2
    //   +1 echo scene or motif echo active this scene
    //   +1 active scar surfacing this scene
    //   cap 3
    const _thc = _safeRead(() => {
      let n = 0;
      const grv = s.grievanceContracts || [];
      if (grv.length >= 2) n++;
      if (s._echoSceneActive || s._motifEchoActive) n++;
      if (s._scarSurfacingThisScene) n++;
      return Math.min(3, n);
    }, 0);

    const total = _pov + _ont + _amb + _wls + _rev + _thc;
    return {
      pov_instability: _pov,
      ontology_instability: _ont,
      ambiguity_load: _amb,
      world_law_stress: _wls,
      reveal_density: _rev,
      thematic_convergence: _thc,
      total: total
    };
  }

  // Narrow initialization-hazard predicate. Only fires Opus when Scene 1 has
  // structural collapse risk that Sonnet historically struggles with. NOT a
  // proxy for "important opening" — it's a proxy for "Sonnet may sludge."
  //
  // Returns a reason string when triggered; falsy otherwise.
  function _isInitializationHazard(appState, vector) {
    if (!appState || appState.turnCount !== 1) return null;
    const s = appState;
    const world = s.worldSubtype || (s.picks && s.picks.worldSubtype) || '';
    const pov = s.povMode || '';

    // Glass House + non-standard POV: empathic-field normalization +
    // POV discipline + Chorus exposition restraint all at once. Sonnet
    // historically produces exposition sludge here.
    if (world === 'glass_house' && (pov === 'environment4th' || pov === 'author5th')) {
      return 'GlassHouse' + (pov === 'environment4th' ? 'Material' : 'Fate') + 'Opening';
    }

    // Simulation-layer / the_beyond openings: reality-layer normalization
    // alone is enough hazard regardless of POV.
    if (world === 'simulation' || world === 'the_beyond') {
      return 'OntologyUnstableOpening';
    }

    // Generalized escape hatch: if telemetry score concentrates extreme
    // hazard at scene 1 (ontology ≥ 3 AND pov ≥ 2), fire Opus.
    if (vector && vector.ontology_instability >= 3 && vector.pov_instability >= 2) {
      return 'ExtremeHazardOpening';
    }

    return null;
  }

  // Rolling Opus fire-rate tracker. Target: ≤ 10% of literary scenes weekly.
  // If we drift past that, the thresholds are wrong, not the doctrine.
  const _COHERENCE_TELEMETRY = {
    window: 100,
    samples: [],  // [{ isOpus, world, pov, reason, t }]
    warnedAt: 0,
    warnCooldownMs: 5 * 60 * 1000  // re-warn at most once per 5 min
  };

  function _trackOpusFireRate(appState, decision) {
    if (!decision || !decision.model) return;
    const isOpus = String(decision.model).indexOf('claude-opus') === 0;
    _COHERENCE_TELEMETRY.samples.push({
      isOpus: isOpus,
      world: (appState && (appState.worldSubtype || (appState.picks && appState.picks.worldSubtype))) || 'unknown',
      pov: (appState && appState.povMode) || 'default',
      reason: decision.reason || '',
      t: Date.now()
    });
    if (_COHERENCE_TELEMETRY.samples.length > _COHERENCE_TELEMETRY.window) {
      _COHERENCE_TELEMETRY.samples.shift();
    }
    const total = _COHERENCE_TELEMETRY.samples.length;
    if (total < 20) return;
    const opusCount = _COHERENCE_TELEMETRY.samples.filter(s => s.isOpus).length;
    const rate = opusCount / total;
    const now = Date.now();
    if (rate > 0.10 && (now - _COHERENCE_TELEMETRY.warnedAt) > _COHERENCE_TELEMETRY.warnCooldownMs) {
      console.warn('[COHERENCE] Opus fire rate ' + (rate * 100).toFixed(1) + '% over last ' + total + ' scenes — exceeds 10% scarcity target.');
      _COHERENCE_TELEMETRY.warnedAt = now;
    }
  }

  function _emitCoherenceTelemetry(appState, vector, decision) {
    if (!appState || !vector || !decision) return;
    try {
      const v = vector;
      const world = appState.worldSubtype || (appState.picks && appState.picks.worldSubtype) || 'unknown';
      const pov = appState.povMode || 'default';
      const tc = appState.turnCount || 0;
      console.log(
        '[COHERENCE] turn=' + tc +
        ' world=' + world +
        ' pov=' + pov +
        ' vec={pov:' + v.pov_instability +
        ',ont:' + v.ontology_instability +
        ',amb:' + v.ambiguity_load +
        ',wls:' + v.world_law_stress +
        ',rev:' + v.reveal_density +
        ',thc:' + v.thematic_convergence +
        ',sum:' + v.total + '}' +
        ' model=' + (decision.model || 'unknown') +
        ' reason=' + (decision.reason || 'none')
      );
    } catch (_) {}
  }

  // On-demand summary — call from devtools: window._coherenceSummary()
  function _coherenceSummary() {
    const samples = _COHERENCE_TELEMETRY.samples;
    if (samples.length === 0) return { total: 0 };
    const overallOpus = samples.filter(s => s.isOpus).length;
    const byWorld = {}, byPov = {};
    for (const s of samples) {
      if (!byWorld[s.world]) byWorld[s.world] = { total: 0, opus: 0 };
      if (!byPov[s.pov]) byPov[s.pov] = { total: 0, opus: 0 };
      byWorld[s.world].total++;
      byPov[s.pov].total++;
      if (s.isOpus) { byWorld[s.world].opus++; byPov[s.pov].opus++; }
    }
    return {
      total: samples.length,
      opusOverall: overallOpus,
      opusRate: (overallOpus / samples.length).toFixed(3),
      byWorld: byWorld,
      byPov: byPov
    };
  }
  if (typeof window !== 'undefined') window._coherenceSummary = _coherenceSummary;

  // Scenes that warrant Opus-tier prose within an intricate context, OR
  // gpt-4o-tier prose within a standard context. Detected via existing
  // signals: Scene 1, apex importance, Tempt Fate, late-arc storyturns
  // (ST3 intimacy / ST4 consequence / ST5 betrayal / ST6 climax/ending),
  // and the ending-convergence window.
  function _isMajorScene(appState) {
    if (!appState) return false;
    const turnCount = appState.turnCount || 0;
    if (turnCount === 1) return true;  // Scene 1 always major
    const importance = appState._currentSceneImportance || 'medium';
    if (importance === 'apex') return true;
    if (appState.tempt_fate_invoked_this_turn === true) return true;
    const st = appState.storyturn || '';
    if (st === 'ST3' || st === 'ST4' || st === 'ST5' || st === 'ST6') return true;
    const endingStart = _getEndingWindowStart(appState.storyLength);
    if (endingStart && turnCount >= endingStart) return true;
    return false;
  }

  /**
   * Resolve Render Tier (A or B) for the current scene.
   *
   * TIER A — INTRICATE WORLDS / DELICATE POVS
   *   Initialization hazard (Scene 1 + Glass House 4th/5th POV
   *   OR simulation-layer opening)                          → OPUS
   *   All other intricate scenes (incl. Scene 1, apex, ST3-6,
   *   ending window)                                        → SONNET
   *   Triggers (for intricate-context detection): 5th Person, 4th Person,
   *   WryConfession, billionaire_modern, glass_house, fated_blood,
   *   arcane_binding, the_beyond, cursed, endless_edit, quieting_event,
   *   angry_room, dogma, post_human, simulation, prehistoric.
   *
   *   Doctrine: Opus is for CONCEPTUAL COHERENCE HAZARD, not emotional
   *   importance. "Difficult, not important." See _isInitializationHazard.
   *   Full coherence-routing layer is forthcoming; shadow telemetry
   *   (_computeCoherenceVector) is gathering data in the meantime.
   *
   * TIER B — STANDARD WORLDS
   *   Scene 1–3 (opening window)  → SONNET (tone-set with strong writer)
   *   Apex/Tempt/ST3/ST4/Ending   → GPT-4o
   *   Connective                  → GPT-4o-mini
   *
   * MODE 1 OVERRIDE — explicit content routes to Grok regardless of tier.
   *
   * Fallback chain (handled per-call or via the proxy):
   *   Opus   → Sonnet → GPT-4o → GPT-4o-mini → DeepSeek-v4-pro
   *   Sonnet → GPT-4o → GPT-4o-mini → DeepSeek-v4-pro → Grok-fast
   *   GPT-4o → GPT-4o-mini → DeepSeek-v4-pro → Grok-fast
   *   Mini   → DeepSeek-v4-flash → Grok-fast-non-reasoning → Mistral
   */
  function resolveRenderTier() {
    const appState = window.state;
    // Compute coherence vector early (log-only; only routes via
    // _isInitializationHazard for the narrow Scene-1 case).
    const _coherenceVector = appState ? _computeCoherenceVector(appState) : null;
    const decision = _resolveRenderTierInner(appState, _coherenceVector);
    // Emit telemetry + track scarcity AFTER the routing decision is made.
    // Wrapped in try so a telemetry hiccup never breaks generation.
    try {
      if (appState && _coherenceVector) {
        _emitCoherenceTelemetry(appState, _coherenceVector, decision);
        _trackOpusFireRate(appState, decision);
      }
    } catch (_) { /* telemetry must not throw */ }
    return _maybeRemapAuthorToGrok(decision, appState);
  }

  // A1 (2026-06-16): when ENABLE_GROK_NARRATIVE_AUTHOR is on, remap a paid
  // GPT/Claude author decision to a Grok model for NON-INTIMATE scenes. Intimacy
  // keeps its proven SD/renderer pipeline (consent + explicit prose already run
  // on Grok there), so we skip the remap on any hot/explicit beat. ALL author
  // tiers use REASONING Grok — the non-reasoning "fast" model is a garbage prose
  // author (verified 2026-06-17: token-salad + leaked control tokens) and is
  // NEVER used to author scene prose, even connective beats.
  function _maybeRemapAuthorToGrok(decision, appState) {
    try {
      if (!decision || !decision.model) return decision;
      if (/grok/i.test(decision.model)) return decision; // already Grok (e.g. Mode 1)
      const s = appState || {};
      const _hot = s.intimacyPhase === true
        || s.eroticMode === 'CARNAL'
        || !!(s.intimacyDialogue && s.intimacyDialogue.active)
        || !!(s._mode1 && (s._mode1.aftermathActive || s._mode1.rendezvous || s._mode1.routeToGrok));
      // COST DEPRECATION (Roman 2026-06-24): paid Anthropic authors (Sonnet/Opus) are
      // forbidden. A Sonnet/Opus decision that reached here would otherwise fall to
      // callChatGPT and get cost-guard-downgraded to HAIKU for a FULL scene — bad. So
      // remap to a Grok author UNCONDITIONALLY: hot/intimate → the intimate SCENE
      // RENDERER, everything else → the narrative author. Non-Anthropic decisions
      // (gpt-4o etc.) are left as-is unless ENABLE_GROK_NARRATIVE_AUTHOR routes them.
      const _isPaidClaude = /^claude-(sonnet|opus)/.test(decision.model);
      if (_hot) {
        return _isPaidClaude
          ? Object.assign({}, decision, { model: CONFIG.SCENE_RENDERER_MODEL, _origModel: decision.model, reason: (decision.reason || '') + ':GrokRenderer(hot,Sonnet-deprecated)' })
          : decision; // hot non-Anthropic (e.g. already grok renderer) keeps its pipeline
      }
      if (!CONFIG.ENABLE_GROK_NARRATIVE_AUTHOR && !_isPaidClaude) return decision; // flag off: only force-remap the deprecated paid models
      return Object.assign({}, decision, {
        model: CONFIG.NARRATIVE_AUTHOR_MODEL, // Grok 4.3 — the non-intimate SCENE AUTHOR. Proxy auto-falls-back to 4-1-fast-reasoning.
        _origModel: decision.model,
        reason: (decision.reason || '') + ':GrokAuthor4.3'
      });
    } catch (_) { return decision; }
  }

  function _resolveRenderTierInner(appState, coherenceVector) {
    if (!appState) return { model: CONFIG.PRIMARY_AUTHOR_MODEL, max_tokens: 1500, tier: 'B', reason: 'Default' };

    const turnCount = appState.turnCount || 0;
    const st = appState.storyturn || '';

    // ── MODE 1 OVERRIDE (HIGHEST PRIORITY) ──
    // The Mode 1 seductive-whisper directive contains intentionally
    // explicit dialogue that OpenAI refuses or sanitizes. Whenever the
    // whisper directive fires (sets _mode1.routeToGrok) OR the aftermath
    // is active, force the scene through Grok's SCENE_RENDERER_MODEL so
    // the prose lands as written. Cleared at end of the function below.
    const _mode1ForceGrok = !!(appState._mode1 && (
        appState._mode1.routeToGrok === true ||
        appState._mode1.aftermathActive ||
        appState._mode1.rendezvous
    ));
    if (_mode1ForceGrok) {
        // Clear the one-shot routeToGrok flag now that the route has been honored.
        if (appState._mode1 && appState._mode1.routeToGrok) appState._mode1.routeToGrok = false;
        return {
            model: CONFIG.SCENE_RENDERER_MODEL,
            max_tokens: 2000,
            tier: 'A',
            reason: appState._mode1.rendezvous
                ? 'Mode1:Rendezvous:Grok'
                : (appState._mode1.aftermathActive ? 'Mode1:Aftermath:Grok' : 'Mode1:Whisper:Grok')
        };
    }

    // ── TIER A: INTRICATE WORLDS / DELICATE POVS ──
    // Opus is narrowly reserved for INITIALIZATION HAZARDS — Scene 1
    // configurations that historically cause Sonnet to sludge / over-
    // explain / drift into pseudo-profundity (Glass House + 4th/5th POV;
    // simulation-layer opening). Every other intricate scene — including
    // ordinary intricate Scene 1s (billionaire, fantasy intricate) and
    // every apex / ST3-6 / ending scene — routes to Sonnet.
    //
    // Scarcity principle: most great scenes still run on Sonnet. Opus
    // fires when conceptual collapse is the failure mode, not when the
    // scene is emotionally important. Target fire rate ≤ 10% weekly;
    // _trackOpusFireRate logs a warning if we drift above that.
    if (_isIntricateContext(appState)) {
      const _initHazard = _isInitializationHazard(appState, coherenceVector);
      if (_initHazard) {
        return { model: CONFIG.OPUS_MODEL, max_tokens: 2400, tier: 'A', reason: 'CoherenceInit:' + _initHazard };
      }
      if (_isMajorScene(appState)) {
        // Major scenes within intricate context — all Sonnet now. Reason
        // string preserves which kind of major it was for telemetry
        // correlation later.
        const reason = appState.turnCount === 1 ? 'TierA:Scene1:Sonnet'
          : appState._currentSceneImportance === 'apex' ? 'TierA:Apex:Sonnet'
          : appState.tempt_fate_invoked_this_turn ? 'TierA:Tempt:Sonnet'
          : (appState.storyturn === 'ST5' || appState.storyturn === 'ST6') ? 'TierA:Betrayal:Sonnet'
          : appState.storyturn === 'ST3' ? 'TierA:ST3:Sonnet'
          : appState.storyturn === 'ST4' ? 'TierA:ST4:Sonnet'
          : 'TierA:Major:Sonnet';
        return { model: CONFIG.SONNET_MODEL, max_tokens: 2200, tier: 'A', reason: reason };
      }
      // In-between scene in an intricate world — Sonnet handles the
      // connective tissue with strong voice, no need for Opus spend.
      return { model: CONFIG.SONNET_MODEL, max_tokens: 2000, tier: 'A', reason: 'TierA:InBetween:Sonnet' };
    }

    // Scene importance ranking (used by momentum, Wry discipline, and other Tier B rules)
    const importance = appState._currentSceneImportance || 'medium';
    const importanceRank = { low: 0, medium: 1, high: 2, apex: 3 };

    // ── GPT-4 MOMENTUM WINDOW ──
    // After a GPT-4 scene, keep GPT-4 for the next scene if importance >= medium.
    // Prevents mini→GPT-4→mini ping-pong that causes subtle voice oscillation.
    if (appState._lastRenderModel === 'gpt-4o' && (importanceRank[importance] || 0) >= 1) {
      return { model: 'gpt-4o', max_tokens: 1800, tier: 'B', reason: 'TierB:Momentum' };
    }

    // ── TIER B: STANDARD WORLDS ──
    // Scene 1–3 use Sonnet (strong writer to set tone); subsequent key
    // scenes use gpt-4o; connective scenes use gpt-4o-mini.
    // Priority: OpeningWindow → Tempt → Apex → ST3/ST4 → InputComplexity → Wry → Calibration → Ending → Connective

    // B1) Opening window — Scenes 1–3 use Sonnet for tone establishment.
    // Setting voice early with the strongest realistic writer pays back
    // across the rest of the story (momentum carries the voice).
    if (turnCount <= 3) {
      return { model: CONFIG.SONNET_MODEL, max_tokens: turnCount === 1 ? 2000 : 1800, tier: 'B', reason: 'TierB:OpeningWindow:Sonnet' };
    }

    // B2) Tempt Fate — highest priority key scene
    if (appState.tempt_fate_invoked_this_turn === true) {
      return { model: 'gpt-4o', max_tokens: 2200, tier: 'B', reason: 'TierB:Tempt' };
    }

    // B3) Major Turning Points — apex scene importance
    if (importance === 'apex') {
      return { model: 'gpt-4o', max_tokens: 2200, tier: 'B', reason: 'TierB:Apex' };
    }

    // B4) Critical Storyturns — ST3 (intimacy attempt) and ST4 (Consequence)
    if (st === 'ST3' || st === 'ST4') {
      return { model: 'gpt-4o', max_tokens: 1800, tier: 'B', reason: 'TierB:CriticalST' };
    }

    // B5) Input complexity escalation — complex player input deserves GPT-4
    const playerInput = appState._currentPlayerInput || '';
    if (playerInput.length >= 140
        || (playerInput.includes('"') && playerInput.split(/[.!?]/).length >= 3)
        || /\b(love|hate|confess|admit|forgive|betray|apologize|beg|plead|accuse|confront|reveal|swear|promise|regret|abandon|sacrifice)\b/i.test(playerInput)) {
      return { model: 'gpt-4o', max_tokens: 1800, tier: 'B', reason: 'TierB:InputComplexity' };
    }

    // B6) Wry tone discipline — importance-aware + every-other-scene fallback
    //     GPT-4 when scene importance >= high OR on odd turns (tonal correction)
    if (appState.picks?.tone === 'WryConfession') {
      if ((importanceRank[importance] || 0) >= 2 || turnCount % 2 === 1) {
        return { model: 'gpt-4o', max_tokens: 1800, tier: 'B', reason: 'TierB:WryDiscipline' };
      }
    }

    // B7) Voice Anchor calibration scenes (every 4 scenes, starting scene 4)
    if (turnCount >= 4 && turnCount % 4 === 0) {
      return { model: 'gpt-4o', max_tokens: 1800, tier: 'B', reason: 'TierB:VoiceCalibration' };
    }

    // B8) Ending convergence window
    const endingStart = _getEndingWindowStart(appState.storyLength);
    if (endingStart && turnCount >= endingStart) {
      return { model: 'gpt-4o', max_tokens: 1800, tier: 'B', reason: 'TierB:Ending' };
    }

    // B9) Volatility window — elevated tokens, mini model acceptable for connective
    if (appState.volatility_window?.active === true) {
      return { model: 'gpt-4o-mini', max_tokens: 1800, tier: 'B', reason: 'TierB:Volatility' };
    }

    // B-DEFAULT) Connective scene — mini model, integration pass still runs
    return { model: 'gpt-4o-mini', max_tokens: 1500, tier: 'B', reason: 'TierB:Connective' };
  }

  /** Ending-window start scene by story length (mirrors STORYTURN_CONFIG). */
  const _ENDING_WINDOW_START = { taste: 10, fling: 18, affair: 28, soulmates: 55 };

  function _getEndingWindowStart(storyLength) {
    return _ENDING_WINDOW_START[(storyLength || 'taste').toLowerCase()] || null;
  }

  // ===========================================================================
  // API CALLERS
  // ===========================================================================

  /**
   * Call ChatGPT (primary author).
   * ChatGPT is the ONLY model allowed to author plot, decide outcomes,
   * and generate SDs.
   *
   * Two call forms are supported:
   *   callChatGPT(messages, role, options)  — explicit role
   *   callChatGPT(messages, options)        — defaults role to 'PRIMARY_AUTHOR'
   */
  // Sentinel marker prompt builders can embed in a system prompt to mark
  // the static/dynamic seam. When the request routes to Anthropic and the
  // marker is present, callChatGPT splits the system message into a
  // [{text: prefix, cache_control: ephemeral}, {text: tail}] block array
  // so Anthropic caches the prefix. For non-Anthropic providers the
  // marker is stripped silently (OpenAI ignores cache_control + the
  // proxy's automatic prefix caching does its own thing). Builders that
  // don't embed the marker pay normal price — fully backwards-compatible.
  const CACHE_BOUNDARY = '<<<STORYBOUND_CACHE_BOUNDARY>>>';

  async function callChatGPT(messages, role = 'PRIMARY_AUTHOR', options = {}) {
    // Two-arg form: caller passed (messages, options). Shift into place silently.
    if (typeof role === 'object' && role !== null) {
      options = role;
      role = 'PRIMARY_AUTHOR';
    }

    // Guard: validate messages before fetch
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('[ORCHESTRATION] callChatGPT: messages must be a non-empty array');
    }

    // Resolve model: explicit option > role-specific config > default
    const roleModelMap = {
      STRATEGY_PASS: CONFIG.STRATEGY_PASS_MODEL,
      STRUCTURAL_CORRECTION: CONFIG.STRUCTURAL_CORRECTION_MODEL,
      FATE_STRUCTURAL: CONFIG.FATE_STRUCTURAL_MODEL,
      FATE_ELEVATION: CONFIG.FATE_ELEVATION_MODEL
    };
    let modelResolved = options.model || roleModelMap[role] || CONFIG.PRIMARY_AUTHOR_MODEL;

    // ── COST GUARD (Roman 2026-06-24): Sonnet/Opus are deprecated as authors ──
    // Every paid-Anthropic author/polish call funnels through here. Sonnet & Opus
    // are too expensive; scene authoring is Grok, and the only sanctioned Anthropic
    // spend is the cheap Haiku mechanical-repair pass. So any sonnet/opus slug is
    // DOWNGRADED to claude-haiku-4-5 (repair-class, allowed by the server firewall).
    // This catches polish/expand passes AND every manual A/B harness arm without
    // per-callsite edits. A dev who genuinely wants a paid-Anthropic baseline
    // comparison sets window.__ALLOW_PAID_ANTHROPIC_AUTHOR__ = true to opt back in
    // (the server allowlist must also be widened for it to actually go through).
    if (typeof modelResolved === 'string' && /^claude-(sonnet|opus)/.test(modelResolved)) {
      const _allowPaid = (typeof window !== 'undefined' && window.__ALLOW_PAID_ANTHROPIC_AUTHOR__ === true);
      if (!_allowPaid) {
        try { console.warn('[COST-GUARD] ' + modelResolved + ' is cost-deprecated — downgrading to claude-haiku-4-5. Set window.__ALLOW_PAID_ANTHROPIC_AUTHOR__=true (and widen the server allowlist) to A/B against it.'); } catch (_) {}
        modelResolved = 'claude-haiku-4-5';
      }
    }

    // Route Anthropic models to the Anthropic proxy. The proxy shape is
    // identical (same payload + same normalized response) so the rest of
    // the callsite is unchanged. Claude slugs start with 'claude-'.
    const _isClaudeModel = typeof modelResolved === 'string' && modelResolved.indexOf('claude-') === 0;

    // ── EROTIC-CONTENT MODERATION GATE (Roman 2026-06-16) ──────────────────────
    // Anthropic moderation can REFUSE or silently SOFTEN sexually-explicit prose.
    // Our explicit prose is Grok-authored; the user paid to generate exactly that
    // content, so a Sonnet polish/repair/dedup pass must never touch it. When the
    // scene is explicit (CARNAL eroticMode or an active intimacy/OAS dialogue —
    // see window._proseModerationHot, the single source of truth) we DECLINE the
    // Claude call rather than risk censorship. Every prose-polish wrapper
    // normalizes a null-content result back to its INPUT text (|| text / || raw),
    // so Grok's prose ships UNPOLISHED instead of softened. Scoped to PRIMARY_AUTHOR
    // (the prose role) so planning / structural Claude calls are unaffected; the
    // A-plot Claude fallback posts to anthropic-proxy directly and bypasses this.
    // jsonMode calls are STRUCTURAL (the issue spine / planning JSON), never prose —
    // Anthropic does not moderate structural JSON, and the spine itself runs on Opus
    // via PRIMARY_AUTHOR, so exempting jsonMode keeps the gate from ever blocking a
    // mid-CARNAL spine regeneration. The gate is PROSE-only by construction.
    if (_isClaudeModel && role === 'PRIMARY_AUTHOR' && !options.jsonMode
        && typeof window !== 'undefined' && typeof window._proseModerationHot === 'function'
        && window._proseModerationHot()) {
      try {
        const _st = window.state || {};
        console.warn('[PROSE:MODERATION-GATE] declined ' + modelResolved
          + ' on explicit prose (eroticMode=' + (_st.eroticMode || '?')
          + ', oas=' + !!(_st.intimacyDialogue && _st.intimacyDialogue.active)
          + ') — Grok prose ships unpolished, not censored.');
      } catch (_mgErr) {}
      return { content: null, _moderationBlocked: true };
    }

    // ── Cache-boundary processing ──
    // Strip the sentinel from every system message. For Anthropic, convert
    // the prefix half into a cached block. For OpenAI / others, silently
    // collapse to plain text (no harm — the marker would just confuse the
    // model). Only the system role is affected; user/assistant turns are
    // passed through untouched.
    // Supports MULTIPLE sentinels → multiple cache breakpoints. Each
    // non-final, non-empty segment ends at an ephemeral breakpoint; the
    // final segment (after the last sentinel) is the fresh, uncached tail.
    // Anthropic caps breakpoints at 4 — if more sentinels are present, the
    // extra ones collapse into surrounding text (no breakpoint). Two-sentinel
    // use: [world bible] | [per-turn static directives + turn instructions] |
    // [per-attempt enforcement delta]. Within a turn the first two segments
    // are byte-identical across all regeneration calls, so attempts 2..N read
    // the entire static prompt from cache instead of re-sending it fresh.
    const MAX_CACHE_BREAKPOINTS = 4;
    const processedMessages = messages.map(m => {
      if (!m || m.role !== 'system' || typeof m.content !== 'string') return m;
      if (m.content.indexOf(CACHE_BOUNDARY) === -1) return m;
      const parts = m.content.split(CACHE_BOUNDARY);
      if (_isClaudeModel) {
        const blocks = [];
        let breakpoints = 0;
        for (let i = 0; i < parts.length; i++) {
          const text = parts[i];
          if (!text) continue; // skip empty segments (e.g. trailing sentinel)
          const canCache = (i < parts.length - 1) && (breakpoints < MAX_CACHE_BREAKPOINTS);
          if (canCache) {
            // CROSS-TURN CACHING (2026-05-28): the FIRST breakpoint is the
            // cross-turn-STABLE prefix (the world bible / sysPrompt — ~11k tok,
            // identical across every turn of a story). Put it on a 1-HOUR cache
            // so it survives the reader's pauses between scenes; the 5-min
            // default expires between most human-paced turns, forcing a full
            // re-write of the bible every turn. Later breakpoints change per
            // turn (directive tail, turn instructions) → keep them on the 5-min
            // default. Proxy already sends the extended-cache-ttl beta header
            // whenever any cache_control is present. 1h write is 2× (vs 1.25×)
            // but amortizes after ~2 reads, and a story has many turns.
            // Roman 2026-06-07: 1-HOUR ttl on the first TWO breakpoints, not just one.
            // The literary turn-path is [sysPrompt][stableTail][tail]: BOTH sysPrompt AND
            // stableTail are cross-turn-stable (the varying blocks — intentTransmutation,
            // billionaireAttraction — were pulled OUT of stableTail into the tail), so both
            // deserve the 1h TTL that survives human-paced reader pauses. The LAST segment
            // (the per-turn directive tail) stays 5-min default — it varies every scene and
            // never cache-hits, so the cheaper 1.25× write is correct. Single-segment callers
            // (Scene-1 opening path, OAS) are unaffected (only breakpoint 0 exists → still 1h).
            const _cc = (breakpoints <= 1)
              ? { type: 'ephemeral', ttl: '1h' }
              : { type: 'ephemeral' };
            blocks.push({ type: 'text', text, cache_control: _cc });
            breakpoints++;
          } else {
            blocks.push({ type: 'text', text });
          }
        }
        if (blocks.length === 0) return { role: 'system', content: '' };
        return { role: 'system', content: blocks };
      }
      // Non-Anthropic: drop all sentinels and rejoin to plain text.
      return { role: 'system', content: parts.join('') };
    });

    // ── CACHE OBSERVABILITY (Roman 2026-06-13, steps 1+3) ────────────────────
    // Fingerprint the ACTUALLY-SENT system segments (len + cheap FNV-1a hash +
    // cache TTL) so a same-story multi-turn run reveals whether seg0/seg1 are
    // byte-identical across turns — the precondition for a provider cache READ.
    // Pure logging. Gated to substantial (literary-sized) Claude calls so the
    // ~20 small Haiku audit calls per scene don't spam. _cacheSegSysChars is
    // reused by the per-call [CACHE:USAGE] log below.
    let _cacheSegSysChars = 0;
    try {
      if (_isClaudeModel) {
        let _csSysMsg = null;
        for (let _csi = 0; _csi < processedMessages.length; _csi++) {
          if (processedMessages[_csi] && processedMessages[_csi].role === 'system') { _csSysMsg = processedMessages[_csi]; break; }
        }
        if (_csSysMsg) {
          const _csBlocks = Array.isArray(_csSysMsg.content)
            ? _csSysMsg.content
            : [{ type: 'text', text: String(_csSysMsg.content || ''), cache_control: undefined }];
          const _csHash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
          const _csDesc = [];
          for (let _csb = 0; _csb < _csBlocks.length; _csb++) {
            const _csTxt = (_csBlocks[_csb] && typeof _csBlocks[_csb].text === 'string') ? _csBlocks[_csb].text : '';
            _cacheSegSysChars += _csTxt.length;
            const _csTtl = (_csBlocks[_csb] && _csBlocks[_csb].cache_control) ? (_csBlocks[_csb].cache_control.ttl || '5m') : 'none';
            _csDesc.push('seg' + _csb + '=' + _csTxt.length + '#' + _csHash(_csTxt) + ' ttl=' + _csTtl);
          }
          if (_cacheSegSysChars >= 12000) {
            const _csState = (typeof window !== 'undefined' && window.state) ? window.state : {};
            console.log('[CACHE:SEGMENTS] story=' + (_csState.storyId || '?') + ' turn=' + (_csState.turnCount != null ? _csState.turnCount : '?')
              + ' model=' + modelResolved + ' role=' + role + ' purpose=' + (options.purpose || role || '?')
              + ' sentChars=' + _cacheSegSysChars + ' segs=' + _csBlocks.length + ' | ' + _csDesc.join(' '));
          }
        }
      }
    } catch (_csErr) {}

    const payload = {
      messages: processedMessages,
      role,
      model: modelResolved,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1500
    };

    // Add JSON mode if requested
    if (options.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const _proxyUrl = _isClaudeModel ? CONFIG.ANTHROPIC_PROXY : CONFIG.CHATGPT_PROXY;
    const _model = (payload && payload.model) || 'unknown-model';
    const _proxy = _isClaudeModel ? 'anthropic-proxy' : 'chatgpt-proxy';
    // Per-call timeout override (heavy Scene-1 author calls need >60s headroom);
    // defaults to the global. retryOnTimeout=true → one extra attempt on a
    // TRANSIENT failure (client-abort timeout, or 502/503/529 overloaded). The
    // most important call in the app — story authoring — should survive a single
    // momentary Anthropic slowdown instead of "Fate stumbled" on the first scene.
    const _timeoutMs = (typeof options.timeoutMs === 'number' && options.timeoutMs > 0) ? options.timeoutMs : CONFIG.API_TIMEOUT_MS;
    const _maxAttempts = options.retryOnTimeout ? 2 : 1;
    let _lastErr = null;

    for (let _attempt = 1; _attempt <= _maxAttempts; _attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), _timeoutMs);
      try {
        const res = await fetch(_proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorText = await res.text().catch(() => '(could not read response body)');
          // Name the ACTUAL model + proxy (not "ChatGPT") — Claude routes through
          // anthropic-proxy, so a 529 here means ANTHROPIC was overloaded, not OpenAI.
          // A leading status keeps the app.js 429/529 detectors working on err.message.
          const _e = new Error(`LLM API error: ${res.status} (${_model} via ${_proxy}) - ${errorText}`);
          _e._status = res.status;
          throw _e;
        }

        const data = await res.json();
        _accumulateTokens(data, payload && payload.model, (options && options.profileLabel) || role);
        // CACHE OBSERVABILITY (Roman 2026-06-13, step 2): per-call cache read/write,
        // tagged with story/turn/purpose — so cache health is never inferred from the
        // scene aggregate alone. Gated to the same literary-sized calls as [CACHE:SEGMENTS].
        try {
          if (_isClaudeModel && data && data.usage && _cacheSegSysChars >= 12000) {
            const _cuState = (typeof window !== 'undefined' && window.state) ? window.state : {};
            const _cuRead = data.usage.cache_read_input_tokens || 0;
            const _cuWrite = data.usage.cache_creation_input_tokens || 0;
            const _cuW1h = data.usage.cache_creation_1h_input_tokens || 0;
            const _cuW5m = data.usage.cache_creation_5m_input_tokens || 0;
            const _cuIn = data.usage.input_tokens || data.usage.prompt_tokens || 0;
            const _cuDen = _cuRead + _cuWrite + _cuIn;
            const _cuPct = _cuDen > 0 ? Math.round(100 * _cuRead / _cuDen) : 0;
            console.log('[CACHE:USAGE] story=' + (_cuState.storyId || '?') + ' turn=' + (_cuState.turnCount != null ? _cuState.turnCount : '?')
              + ' purpose=' + (options.purpose || role || '?') + ' model=' + (payload && payload.model)
              + ' readTokens=' + _cuRead + ' writeTokens=' + _cuWrite + ' (1h=' + _cuW1h + ' 5m=' + _cuW5m + ')'
              + ' freshInput=' + _cuIn + ' readShare=' + _cuPct + '%');
          }
        } catch (_cuErr) {}

        // Normalized response shape: use data.content (string from proxy)
        // Fallback to legacy choices[0].message.content for backward compat
        const text = data.content ?? data.choices?.[0]?.message?.content ?? null;

        if (!text && text !== '') {
          const receivedKeys = Object.keys(data);
          console.error('[ORCHESTRATION] Proxy returned 200 but no content field. Keys:', receivedKeys);
          throw new Error(`LLM proxy returned 200 but payload missing content field (${_model} via ${_proxy}). Received keys: [${receivedKeys.join(', ')}]`);
        }

        return text;

      } catch (err) {
        clearTimeout(timeoutId);
        let _norm = err;
        if (err && err.name === 'AbortError') {
          // Name the actual model + proxy so a timeout can be diagnosed at a glance
          // (a Sonnet-via-anthropic-proxy timeout used to mislabel as "ChatGPT").
          _norm = new Error('LLM request timed out (' + _model + ' via ' + _proxy + ')');
          _norm._timeout = true;
        }
        _lastErr = _norm;
        // Retry ONLY transient classes (timeout / 502 / 503 / 529 overloaded), and
        // only if attempts remain. 429 rate-limits are NOT retried here (terminal —
        // app.js converts them to RateLimitError). Brief backoff lets a blip clear.
        const _status = (err && err._status) || 0;
        const _transient = !!_norm._timeout || _status === 502 || _status === 503 || _status === 529;
        if (_attempt < _maxAttempts && _transient) {
          try { console.warn('[ORCHESTRATION] transient author failure (attempt ' + _attempt + '/' + _maxAttempts + '): ' + _norm.message + ' — retrying once'); } catch (_) {}
          await new Promise(function (r) { setTimeout(r, 1200); });
          continue;
        }
        throw _norm;
      }
    }
    throw _lastErr || new Error('LLM request failed (' + _model + ' via ' + _proxy + ')');
  }

  // ===========================================================================
  // RENDER QUALITY TELEMETRY (TRACE-ONLY — no gating, no fallback)
  // ===========================================================================
  // Lightweight per-render quality signals logged for post-hoc analysis.
  // After ~1-2 weeks of production data we can decide whether any of these
  // patterns warrant gating or render-side fallback. Until then: data only.
  //
  // Sampling: deterministic 15% per render (FNV-1a hash of the user prompt
  // content mod 100 < 15). Same render will always trace or not; different
  // renders are independently sampled. Keeps Vercel logs readable on busy
  // days while surfacing patterns within ~1 week.
  // ===========================================================================

  function _fnv1aHash(str) {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = (h ^ str.charCodeAt(i)) >>> 0;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function _shouldSampleRenderTrace(seed) {
    if (!seed) return false;
    return (_fnv1aHash(String(seed)) % 100) < 15;
  }

  /**
   * Trace render output quality signals. NO GATING. NO FALLBACK.
   *
   * Captures lightweight per-render counts and flags:
   *   • length / sentence count
   *   • sensory vs cognitive vocabulary counts
   *   • boolean flags for candidate failure patterns (overPolite,
   *     repetitiveDialogue, lowSensory, etc.)
   *   • narrative context (storyturn, contentMode, cascadeMode, mode1
   *     proxy via contentMode='full', tempt-fate, volatility) so we can
   *     filter baseline from anomaly later
   *
   * The patterns themselves are HEURISTIC GUESSES, not validated thresholds.
   * They exist so the data has columns; trust the *distribution*, not the
   * individual flags, when tuning later.
   */
  function traceRenderQuality(model, text, context) {
    if (!text || typeof text !== 'string') return;
    context = context || {};

    const lengthVal = text.length;
    const sentenceCount = (text.match(/[.!?]/g) || []).length;
    const sensoryCount = (text.match(/(breath|pulse|heat|touch|skin|weight|pressure|tension|warmth|grip|breathing)/gi) || []).length;
    const thoughtCount = (text.match(/(thought|realized|understood|noticed|considered|wondered|remembered)/gi) || []).length;
    const dialogueTagCount = (text.match(/(he said|she said|they said)/gi) || []).length;

    const flags = {
      lowLength:          lengthVal < 300,
      lowSentences:       sentenceCount < 3,
      highCognition:      thoughtCount > sensoryCount * 2,
      lowSensory:         sensoryCount === 0,
      overPolite:         /(respectfully|appropriate|boundaries|consensual discussion)/i.test(text),
      repetitiveDialogue: dialogueTagCount > 5,
      lowAction:          !/(moved|stepped|reached|pulled|leaned|pressed|turned)/i.test(text)
    };

    console.log('[RENDER_QUALITY_TRACE]', {
      model,
      length: lengthVal,
      sentenceCount,
      sensoryCount,
      thoughtCount,
      dialogueTagCount,
      flags,
      // Narrative context — critical for filtering baseline vs anomaly.
      // Mode 1 boundary-test scenes have legitimate cognition; cascade
      // mode scenes have unusual rhythm; tempt-fate / volatility have
      // boosted token budgets. Without these tags the trace is noise.
      storyturn:        context.storyturn        || null,
      contentMode:      context.contentMode      || null,
      cascadeMode:      context.cascadeMode      || false,
      cascadeCount:     context.cascadeCount     || 0,
      eroticMode:       context.eroticMode       || null,
      intimacyPhase:    context.intimacyPhase    || null,
      temptFate:        context.temptFate        || false,
      volatility:       context.volatility       || false,
      sceneType:        context.sceneType        || null,
      timestamp:        Date.now()
    });
  }

  /**
   * Call Renderer (Grok grok-4-1-fast-non-reasoning).
   * ONLY for: visual bible extraction, visualization prompts.
   * NEVER for: DSP, normalization, veto, story logic.
   */
  async function callRenderer(messages, options = {}) {
    const payload = {
      messages,
      role: 'RENDERER',
      model: CONFIG.RENDERER_MODEL,
      temperature: options.temperature || 0.3,  // Low temp for literal extraction
      max_tokens: options.max_tokens || 500
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.SPECIALIST_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(could not read response body)');
        throw new Error(`Renderer API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      _accumulateTokens(data, payload && payload.model, "renderer_visual");

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Renderer returned malformed response');
      }

      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Renderer request timed out');
      }
      throw err;
    }
  }

  /**
   * Call Scene Renderer (Grok grok-4-1-fast-reasoning).
   * ONLY called when:
   * 1. SD is present AND valid
   * 2. Orchestration was invoked (intimacy pre-authorized by caller)
   *
   * HARD GUARD: This function MUST NOT be called without SD evaluation.
   */
  async function callSceneRenderer(messages, esd, accessTier, options = {}) {
    // GUARD: SD must be present
    if (!esd) {
      throw new Error('[SCENE_RENDERER BLOCKED] No SD provided. Renderer cannot be called without SD evaluation.');
    }

    console.log(`[SCENE_RENDERER] SD validated. Tier: ${accessTier}`);

    const payload = {
      messages,
      role: 'SCENE_RENDERER',
      model: CONFIG.SCENE_RENDERER_MODEL,
      temperature: options.temperature || 0.8,
      // Default 650 max_tokens (~488 words) caps the anchor (first intimate
      // scene) at the design target of 500 words. Callers that need more
      // (Tempt Fate at 1800, Volatility at 1400, cascade at 500/1200) pass
      // explicit overrides via options.max_tokens.
      max_tokens: options.max_tokens || 650,
      esd: esd  // Pass SD for server-side validation
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.SPECIALIST_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(could not read response body)');
        throw new Error(`Scene Renderer API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      _accumulateTokens(data, payload && payload.model, "scene_renderer");

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Scene Renderer returned malformed response');
      }

      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Scene Renderer request timed out');
      }
      throw err;
    }
  }

  // Legacy alias for backward compatibility (routes to callSceneRenderer with guards)
  async function callSpecialistRenderer(messages, esd, options = {}) {
    const accessTier = options.accessTier || 'free';
    return callSceneRenderer(messages, esd, accessTier, options);
  }

  /**
   * Call Gemini (FALLBACK AUTHOR).
   * Called ONLY when ChatGPT fails (refusal, validation failure, or error).
   * Gemini produces conservative output - it is a safety net, not the primary path.
   * NO RETRIES: If Gemini fails, abort entirely.
   */
  async function callGemini(messages, role = 'FALLBACK_AUTHOR', options = {}) {
    console.log('[GEMINI FALLBACK] ChatGPT failed, attempting Gemini fallback');

    const payload = {
      messages,
      role,
      model: options.model || CONFIG.FALLBACK_AUTHOR_MODEL,
      temperature: options.temperature || 0.5,  // Lower temp for conservative output
      max_tokens: options.max_tokens || 1500
    };

    if (options.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.GEMINI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(could not read response body)');
        throw new Error(`Gemini API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      _accumulateTokens(data, payload && payload.model, "gemini_fallback");

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Gemini returned malformed response (no choices)');
      }

      console.log('[GEMINI FALLBACK] Success - conservative output generated');
      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Gemini request timed out');
      }
      throw err;
    }
  }

  /**
   * Call Grok as SD Author (when intimacy is authorized).
   * Grok authors: anatomical explicitness, sensory vividness, physical embodiment.
   * ChatGPT retains: permission, limits, consequences, integration.
   *
   * FAILURE HANDLING: If Grok fails, set fateStumbled and continue with ChatGPT.
   */
  // Per-axis prose guidance — what each axis value tells Grok to do.
  // Shipped only when that axis has a non-null value in state._sceneExpression.
  const _AXIS_GUIDANCE = {
    voice: {
      verbal:    'voice channel — whispers, teasing, verbal pressure dominate; dialogue carries the beat',
      silent:    'silent channel — eye contact, proximity, physical calibration dominate; dialogue minimal'
    },
    intensity: {
      intense:    'maximal intensity — pressure builds without restraint; sensation is unguarded',
      restrained: 'restraint dominates — pressure is held low and close; tension is contained, not released'
    },
    control: {
      dominant: 'LI takes control of the beat — leads physical decisions, frames pacing',
      yielding: 'LI yields control — receives, follows, leaves space for the protagonist to lead'
    },
    tempo: {
      fast: 'fast tempo — rushed, urgent, escalation compressed',
      slow: 'slow tempo — drawn out, suspended, time stretched'
    }
  };

  // Priority stack — voice is the hardest constraint (talking vs not is
  // binary), tempo is the most flexible (pacing can shift mid-beat). When
  // axes appear to contradict each other, the higher-priority axis wins
  // and the lower-priority axis must adapt its expression.
  const _AXIS_PRIORITY = ['voice', 'control', 'intensity', 'tempo'];

  // Shared helper: returns the EXPRESSION AXES block for SD-authoring prompts.
  // Reads window.state._sceneExpression (multi-axis object). Emits active
  // axes ordered by PRIORITY (voice > control > intensity > tempo) so Grok
  // can resolve conflicts via the explicit hierarchy. Used by both Grok SD
  // authoring and Mistral SD fallback.
  //
  // Returns empty string when no axes are active (Grok runs default behavior).
  function _buildExpressionModeBlock(label) {
    const s = window.state || {};
    const expr = s._sceneExpression || null;
    if (!expr) return '';

    // Order axes by hard priority (voice > control > intensity > tempo).
    const orderedAxes = _AXIS_PRIORITY.filter(function(a) { return expr[a]; });

    const activeLines = [];
    orderedAxes.forEach(function(axis) {
      const value = expr[axis];
      const guidance = _AXIS_GUIDANCE[axis] && _AXIS_GUIDANCE[axis][value];
      if (!guidance) return;
      activeLines.push('- ' + axis + ': ' + value + ' — ' + guidance);
    });

    if (activeLines.length === 0) return '';

    try {
      const summary = activeLines.join(' | ');
      console.log('[' + (label || 'SD') + '] Expression axes injected: ' + summary);
    } catch (_) {}

    return `
EXPRESSION AXES (active player choices — fuse into ONE coherent behavioral mode):
${activeLines.join('\n')}

AXIS INTERPRETATION MAP (canonical meanings):
- voice / verbal     → expression through speech
- voice / silent     → expression through physicality, presence, restraint
- intensity / intense    → high emotional + physical charge
- intensity / restrained → controlled, contained energy
- control / dominant → initiating, directing
- control / yielding → responding, allowing
- tempo / fast → impulsive, immediate
- tempo / slow → drawn-out, deliberate

CORE COMPOSITION RULE (multiplicative, not additive):
- Axes are NOT independent instructions. FUSE them into a single behavioral
  interpretation that satisfies all of them at once.
- Example — voice:silent + intensity:intense + tempo:slow → no dialogue,
  strong physical presence, drawn-out escalation, prolonged eye contact and
  proximity. NOT "silent sometimes, talking sometimes" or "intense in one
  sentence, neutral in another."

PRIORITY STACK + FRAME-VS-EXPRESSION (how to fuse multi-axis composition):
1. voice    — FRAME (hardest constraint; speech vs silence is binary)
2. control  — expression within voice's frame
3. intensity — expression within voice + control
4. tempo    — expression within all of the above (most flexible — pacing bends)

The HIGHEST-PRIORITY active axis defines the BEHAVIORAL FRAME of the beat.
Lower-priority active axes EXPRESS THEMSELVES WITHIN THAT FRAME — they do not
override or escape it; they adapt their delivery to fit.

VISIBILITY GUARANTEE (lower-priority axes do NOT disappear):
Every active axis must be PERCEPTIBLE across the beat cluster — not
necessarily foregrounded in every sentence. Three valid presence levels:
- PRIMARY   — foreground; the axis defines the dominant texture of the beat.
- SECONDARY — supporting; the axis colors specific moments without leading.
- AMBIENT   — background tone; the axis flavors the cluster without being
              explicitly anchored.
Higher-priority active axes typically run primary; lower-priority axes
typically run secondary or ambient. All three levels are valid.
AT LEAST ONE active axis MUST run PRIMARY in every beat. Do NOT let all
axes settle into ambient simultaneously — that produces tonally correct but
emotionally flat output. One axis always carries the dominant texture.
'Subtle' is valid. 'Absent' is invalid. Do NOT mechanically anchor every
axis in every sentence — that produces checklist writing, not living prose.

Worked examples:
  • voice=silent + intensity=intense → silence is the frame; intensity must
    express PHYSICALLY (proximity, touch, eye contact, breath, weight). The
    body carries the charge; the voice does not break.
  • tempo=slow + control=dominant → control is the frame (higher priority);
    tempo expresses within → DELIBERATE, MEASURED control. Slow + dominant
    reads as "drawn-out command," NOT as passive slowness.
  • voice=silent + control=yielding + tempo=slow → silent frame; yielding
    control adapts to it (receptive without speech); slow tempo stretches
    the receptivity. Reads as quiet, deliberate surrender.

CONTROL × TEMPO COUPLING (resolve common drift patterns explicitly):
  • dominant + slow  → DELIBERATE control (measured, leading pace; not passive)
  • dominant + fast  → DECISIVE control (immediate, directing pace)
  • yielding + slow  → RECEPTIVE, SUSTAINED (lingers, allows; not absent)
  • yielding + fast  → REACTIVE URGENCY (follows quickly, catches up; not chaotic)
Do NOT interpret tempo as weakening control. Tempo modifies HOW control is
expressed, never WHETHER it is expressed.

PRIMARY CHANNEL LOCK (HARD — voice axis determines the channel):
- voice=silent → physical/visual channel dominates; dialogue near-zero. The
  beat plays through body (touch/proximity), movement (pace/action), and
  stillness (held presence). Speech is essentially absent.
- voice=verbal → speech dominates; silence used only as punctuation between
  lines, not as the carrier of the beat.
- voice unset → infer the dominant channel from intensity/control/tempo,
  but commit to ONE for the entire beat.
Channels are: voice (speech), body (touch/proximity), movement (pace/action),
stillness (held presence). Do NOT switch channels mid-beat (silent → one
line of dialogue → silent again is invalid) unless explicitly driven by the
player's say/do.

VARIATION REQUIREMENT (HARD — repetition is invalid output):
Axes define CONSTRAINTS, not exact behavior. Across consecutive beats with
unchanged axes:
- Do NOT repeat the same dominant action pattern.
- Do NOT reuse the same phrasing structure.
- Do NOT anchor to the same sensory detail.
Each beat must feel like a NEW MANIFESTATION of the same constraints — same
mode, different surface. Repetition with unchanged axes is INVALID OUTPUT,
not a stylistic preference.

VARIATION HIERARCHY (vary intelligently, not randomly):
When varying across beats with unchanged axes, prioritize variation in this order:
1. ACTION             — what physically happens (the most meaningful axis to vary)
2. CHANNEL EMPHASIS   — which aspect of the dominant channel is foregrounded
                        (touch / eye-line / breath / proximity / weight / stillness)
3. SENSORY DETAIL     — what specific sensation is noticed
Do NOT force variation at the cost of naturalness. If all meaningful
variation is genuinely exhausted, ALLOW subtle repetition rather than invent
unnatural behavior just to pass this rule. Variation serves prose quality —
when it would degrade quality, restraint wins.

VARIATION MUST BE IMPLICIT (do NOT narrate the variation):
Do not explain, justify, or signal that variation is occurring. The reader
should FEEL the change through action, never read about it as a comparison.
FORBIDDEN phrasings include (and any near-equivalents):
- "this time", "this time it's different"
- "again, but ..."
- "differently", "in a new way"
- "more deliberate this time", "slower than before"
- "not like before"
Variation is conveyed by DOING something different, not by describing the
fact that something is different. If you find yourself reaching for a
meta-comparison, rewrite the action so the difference lands without comment.

USER ACTION OVERRIDE (AUTHORITATIVE — supersedes axes):
- Player say/do is a DECISION; axes are PREFERENCES. Decision overrides preference.
- PARTIAL OVERRIDE ONLY: user input overrides ONLY the conflicting dimension.
  Keep all non-conflicting axes active. Do NOT broaden an override into a
  full reset of the axis state.
- Examples:
    • voice=silent + tempo=slow + user "I whisper to them" → voice yields
      (whisper allowed); tempo=slow STAYS (slow whisper); intensity/control
      if active also stay.
    • tempo=slow + user "I pull them closer quickly" → tempo yields THIS beat
      only; voice/intensity/control if active stay intact.
- Beat-level override only. Do NOT permanently erase the axis; resume
  honoring it in subsequent beats unless the user keeps countering it.

OUTPUT VALIDATION (run before finalizing — five-point check):
1. Consistent channel? — no talk↔silent flip mid-beat.
2. No contradictions? — no "fast and slow" in the same moment.
3. Control reads correctly? — dominant never reads as passive; yielding
   never reads as absent.
4. Override respected? — user action wins only where it conflicts.
5. Single vibe? — beat feels like ONE mode, not stitched pieces.
If any check fails, resolve via priority stack + frame-expression + control×
tempo coupling, then rewrite.

FAILURE CONDITIONS (invalid outputs):
- Alternating between silent and verbal randomly within the beat.
- Channel-switching mid-beat without user-driven justification.
- Satisfying axes in separate paragraphs (one for voice, one for tempo, etc.)
  instead of fusing them simultaneously.
- Contradictory tone (fast + slow expressed at the same moment).
- Treating slow + dominant as passive/weak (slow + dominant = deliberate command).
- Treating yielding + fast as chaotic (yielding + fast = reactive urgency).
- Treating user input as preference instead of decision.
- Ignoring explicit user say/do in favor of an axis constraint.
- Broadening a partial override into a full axis reset.
- Repeating dominant action pattern, phrasing structure, OR anchor sensory
  detail across consecutive beats with unchanged axes (variation is required,
  not optional).
- Narrating the variation itself ("this time", "again but", "differently",
  "more deliberate this time") — variation must be felt, not described.
- All active axes settling into ambient/secondary simultaneously — at least
  one axis must run PRIMARY in every beat or the output reads tonally correct
  but emotionally flat.
- Silently dropping a lower-priority axis from the output (every active axis
  must be visibly present, even if subtly — "absent" is invalid).
- Generic output that gives lip-service to axes without behavioral commitment.
`;
  }

  // ─── SHARED SCENE/PLOT CONTEXT BUILDER ─────────────────────────────
  // Used by callGrokSDAuthor (literary Grok scene rendering), callMistral
  // SDFallback, generateIntimateFatePreview (literary Grok fate cards),
  // and _buildIntimacySceneContext in app.js (OAS turn prompt). Pulls
  // character roster, LI archetype, relationship dynamic, setting, world
  // flavor, and recent scene prose into a compact block so Grok can
  // resolve user-input references like "Dathriel" or "my father" against
  // the actual story instead of generic stand-ins.
  //
  // ── V2 ACTIVE SCENE ENTITIES (salience + role + emotional charge) ──
  // Replaces v1's binary recency filter. Each known character gets scored
  // every context-build with: (1) salience [0..1] from mention count +
  // recency bonus + role base + scene-decay; (2) role from the bucket
  // they live in; (3) emotional charge from emotion-word proximity in
  // recent prose. Output is sorted by salience, capped to the top N, so
  // Grok sees the right characters with the right weights instead of an
  // undifferentiated roster dump.
  //
  // Persistence: state._sceneEntityState[name] = { lastSeenTurn, salience,
  // role, emotionalCharge }. Updated on each build; decays for entities
  // not present in recent prose so old characters fade out naturally.
  //
  // Cheap: 5-15 regex tests per entity, 5 emotion-pool scans per entity.
  // Runs on demand.
  const SCENE_RECENCY_WINDOW = 3;     // scenes — soft window (used by decay/floor logic only)
  const RECENT_PROSE_SCAN_LEN = 3000; // chars to scan against (≈ last 2-3 scenes)
  const SALIENCE_FLOOR = 0.15;        // entities below this are dropped from context
  const SALIENCE_DECAY_PER_SCENE = 0.65;  // multiplicative — 1.0 → 0.65 → 0.42 → 0.27 → 0.18
  const MAX_ACTIVE_ENTITIES = 6;      // cap on top-N entities shipped in context

  // Static base salience per role — captures "always somewhat important
  // if they exist", before prose evidence is layered on.
  const _ROLE_BASE_SALIENCE = {
    'antagonist':  0.35,
    'rival':       0.25,
    'observer':    0.15,
    'li-candidate':0.30
  };

  // Emotion-charge pools. Per-entity charge is whichever pool has the most
  // hits in a ±60-char window around the entity's name. Empty if no signal.
  const _EMOTION_POOLS = {
    fear:    ['afraid', 'fear', 'dread', 'terror', 'panic', 'scared', 'shudder', 'tremble', 'flinch'],
    longing: ['want', 'ache', 'yearn', 'miss', 'crave', 'hunger', 'starve', 'desire', 'pull toward'],
    guilt:   ['sorry', 'shouldn\'t', 'regret', 'guilty', 'shame', 'blame', 'wrong of'],
    anger:   ['rage', 'fury', 'hate', 'wrath', 'snarl', 'spit', 'seethe', 'venom'],
    love:    ['love', 'adore', 'devote', 'tender', 'cherish', 'gentle', 'home'],
    tension: ['careful', 'still', 'hush', 'whisper', 'watch', 'wait', 'hold', 'tense']
  };

  function _escapeRegex(s) {
    return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Find all match indices of a regex in text. Used for salience scoring
  // (count + recency-within-prose).
  function _findAllMatchIndices(text, name) {
    const indices = [];
    if (!text || !name) return indices;
    try {
      const re = new RegExp('\\b' + _escapeRegex(name) + '\\b', 'gi');
      let m;
      while ((m = re.exec(text)) !== null) {
        indices.push(m.index);
        if (m.index === re.lastIndex) re.lastIndex++;  // zero-width safety
      }
    } catch (_) {}
    return indices;
  }

  function _scoreEmotionalCharge(text, name) {
    if (!text || !name) return '';
    const indices = _findAllMatchIndices(text, name);
    if (!indices.length) return '';
    const WINDOW = 60;  // chars on each side of the name
    const lower = text.toLowerCase();
    const counts = {};
    indices.forEach(idx => {
      const lo = Math.max(0, idx - WINDOW);
      const hi = Math.min(text.length, idx + name.length + WINDOW);
      const slice = lower.slice(lo, hi);
      Object.keys(_EMOTION_POOLS).forEach(emo => {
        const pool = _EMOTION_POOLS[emo];
        for (let i = 0; i < pool.length; i++) {
          if (slice.indexOf(pool[i]) !== -1) {
            counts[emo] = (counts[emo] || 0) + 1;
            break;  // one hit per emotion per window — prevents skew
          }
        }
      });
    });
    // Pick the highest-count emotion. Tie-break: pool defined-order (fear first).
    let bestEmo = '';
    let bestCount = 0;
    Object.keys(counts).forEach(emo => {
      if (counts[emo] > bestCount) { bestCount = counts[emo]; bestEmo = emo; }
    });
    return bestEmo;
  }

  // Build active-scene-entities ranking. Returns array of
  //   { name, role, salience, emotionalCharge, lastSeenTurn }
  // sorted by salience descending, filtered to salience >= SALIENCE_FLOOR,
  // capped to MAX_ACTIVE_ENTITIES.
  function _buildActiveSceneEntities(st, proseScanText, recentProseSlice) {
    const currentTurn = (st.turnCount | 0);
    st._sceneEntityState = st._sceneEntityState || {};
    const entState = st._sceneEntityState;

    // Collect all candidate entities with their static role.
    const candidates = [];
    const sc = st.secondaryCharacters || {};
    (Array.isArray(sc.antagonists) ? sc.antagonists : []).forEach(n => n && candidates.push({ name: n, role: 'antagonist' }));
    (Array.isArray(sc.rivals)      ? sc.rivals      : []).forEach(n => n && candidates.push({ name: n, role: 'rival' }));
    (Array.isArray(sc.observers)   ? sc.observers   : []).forEach(n => n && candidates.push({ name: n, role: 'observer' }));
    if (Array.isArray(st.liCandidates)) {
      st.liCandidates.forEach(c => { if (c && c.name) candidates.push({ name: c.name, role: 'li-candidate' }); });
    }
    // ── Include auto-extracted names from the per-NPC species table ──
    // Names auto-discovered from prose (by _autoExtractNPCsFromProse) land
    // in state.npcSpecies. They're not in secondaryCharacters/liCandidates
    // so without this step they'd be invisible to the salience tracker.
    // Default role: 'observer' (low base salience — they earn rank via
    // mention frequency in prose).
    if (st.npcSpecies && typeof st.npcSpecies === 'object') {
      Object.keys(st.npcSpecies).forEach(name => {
        if (name) candidates.push({ name: name, role: 'observer' });
      });
    }
    if (!candidates.length) return [];

    // De-dup by name (a character can technically be in multiple buckets).
    // Keep the highest-role-base entry.
    const byName = {};
    candidates.forEach(c => {
      const prev = byName[c.name];
      if (!prev || (_ROLE_BASE_SALIENCE[c.role] || 0) > (_ROLE_BASE_SALIENCE[prev.role] || 0)) {
        byName[c.name] = c;
      }
    });

    const ranked = [];
    Object.values(byName).forEach(cand => {
      const prior = entState[cand.name] || { lastSeenTurn: null, salience: 0, role: cand.role, emotionalCharge: '' };
      const indices = _findAllMatchIndices(proseScanText, cand.name);
      const mentionCount = indices.length;

      let salience;
      let emotionalCharge = prior.emotionalCharge;

      if (mentionCount > 0) {
        // Present in recent prose — recompute salience from evidence.
        // Mentions contribute (capped to avoid runaway from one paragraph).
        const mentionScore = Math.min(0.45, mentionCount * 0.12);
        // Recency-within-prose bonus: was the most recent mention in the
        // LAST ~900 chars (what we actually ship to Grok)? If yes, +0.20.
        const recentSliceStart = (proseScanText.length - (recentProseSlice ? recentProseSlice.length : 900));
        const recentMention = indices[indices.length - 1] >= recentSliceStart;
        const recencyBoost = recentMention ? 0.20 : 0.05;
        const roleBase = _ROLE_BASE_SALIENCE[cand.role] || 0;
        salience = Math.min(1.0, roleBase + mentionScore + recencyBoost);
        // Refresh emotional charge from current prose window.
        const detected = _scoreEmotionalCharge(proseScanText, cand.name);
        if (detected) emotionalCharge = detected;
        entState[cand.name] = {
          lastSeenTurn: currentTurn,
          salience: salience,
          role: cand.role,
          emotionalCharge: emotionalCharge
        };
      } else {
        // Not in recent prose — decay from prior, scaled by scenes elapsed.
        const lastTurn = (typeof prior.lastSeenTurn === 'number') ? prior.lastSeenTurn : currentTurn;
        const scenesElapsed = Math.max(0, currentTurn - lastTurn);
        // First-time candidates with no prior get the role base as their
        // starting salience (treat as "freshly named — give them a chance").
        const startingSalience = (prior.salience > 0) ? prior.salience : (_ROLE_BASE_SALIENCE[cand.role] || 0);
        salience = startingSalience * Math.pow(SALIENCE_DECAY_PER_SCENE, scenesElapsed);
        entState[cand.name] = {
          lastSeenTurn: prior.lastSeenTurn,
          salience: salience,
          role: cand.role,
          emotionalCharge: emotionalCharge
        };
      }

      if (salience >= SALIENCE_FLOOR) {
        // Auto-classify species for this NPC and record it in the
        // per-NPC species table. Cheap — canonical lookup + region
        // fallback. High-confidence entries (canonical / explicit)
        // are never downgraded. See _classifyNPCSpecies in app.js.
        var npcSpecies = null;
        try {
          if (typeof window !== 'undefined' && typeof window._recordNPCSighting === 'function') {
            var rec = window._recordNPCSighting(cand.name, st, null);
            if (rec && rec.species) npcSpecies = rec.species;
          }
        } catch (_) {}
        ranked.push({
          name: cand.name,
          role: cand.role,
          salience: salience,
          emotionalCharge: emotionalCharge,
          species: npcSpecies,
          lastSeenTurn: entState[cand.name].lastSeenTurn
        });
      }
    });

    ranked.sort((a, b) => b.salience - a.salience);
    return ranked.slice(0, MAX_ACTIVE_ENTITIES);
  }

  function _buildSceneAndPlotContext(st) {
    st = st || window.state || {};
    const ctxLines = [];

    // Recent story prose (last ~900 chars, HTML stripped) — what Grok actually
    // reads for momentum, geography, current threat. Higher value than the
    // metadata fields below. Also used as the scan substrate for the
    // entity recency filter.
    let prose = '';
    try {
      if (window.StoryPagination && typeof window.StoryPagination.getAllContent === 'function') {
        const raw = window.StoryPagination.getAllContent() || '';
        prose = String(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } catch (_) {}
    if (prose) {
      const promptSlice = prose.length > 900 ? prose.slice(-900) : prose;
      ctxLines.push('Recent story prose: ' + promptSlice);
    }
    // Scan substrate is longer than what we ship — covers ~2-3 scenes worth
    // so an entity named in the prior scene still counts as recent.
    const scanSlice = prose.length > RECENT_PROSE_SCAN_LEN
      ? prose.slice(-RECENT_PROSE_SCAN_LEN)
      : prose;

    if (st.archetype && st.archetype.primary)             ctxLines.push(`LI archetype: ${st.archetype.primary}`);
    if (st.liCoverIdentity)                                ctxLines.push(`LI cover identity: ${st.liCoverIdentity}`);
    if (st.liHiddenAgenda)                                 ctxLines.push(`LI hidden agenda: ${st.liHiddenAgenda}`);
    if (typeof st.liConversionScore === 'number' && st.liConversionScore !== 0) {
      ctxLines.push(`Player conversion toward LI: ${st.liConversionScore > 0 ? '+' : ''}${st.liConversionScore}`);
    }
    if (st.picks?.dynamic)                                 ctxLines.push(`Relationship dynamic: ${st.picks.dynamic}`);

    // Active scene entities — ranked by salience [0..1], capped to top N.
    // Each entry shows role + salience + emotional charge so Grok knows
    // which character is most pressing and why. Stale characters (salience
    // < floor after scene-decay) are dropped from context entirely.
    const promptSlice = prose.length > 900 ? prose.slice(-900) : prose;

    // ── AUTO-EXTRACT NPC NAMES FROM PROSE (added 2026-05-18) ──
    // Discovers named characters mentioned in prose that aren't already
    // in state.secondaryCharacters / liCandidates. Conservative regex —
    // only matches Title+Name pairs and Names-followed-by-dialogue-verbs.
    // Populates state.npcSpecies via _recordNPCSighting.
    try {
      if (typeof window !== 'undefined' && typeof window._autoExtractNPCsFromProse === 'function' && scanSlice) {
        window._autoExtractNPCsFromProse(scanSlice, st);
      }
    } catch (_extractErr) { /* non-fatal */ }

    const activeEntities = _buildActiveSceneEntities(st, scanSlice, promptSlice);

    // ── LLM CLASSIFICATION TRIGGER (added 2026-05-18) ──
    // For each salient entity whose species is still unknown/low after
    // deterministic classification, queue an async Grok classification.
    // Fire-and-forget; result populates state.npcSpecies for the NEXT
    // prompt build. Gated to Fatelands worlds inside the helper.
    try {
      if (typeof window !== 'undefined' && typeof window._maybeQueueNPCLLMClassification === 'function') {
        activeEntities.forEach(function(e) {
          if (e.salience >= 0.30 && (!e.species || e.species === null)) {
            window._maybeQueueNPCLLMClassification(e.name, st, scanSlice);
          }
        });
      }
    } catch (_llmTrigErr) { /* non-fatal */ }
    if (activeEntities.length) {
      const entityLines = activeEntities.map(e => {
        const parts = [e.role];
        parts.push('salience ' + e.salience.toFixed(2));
        if (e.species) parts.push('species: ' + e.species);
        if (e.emotionalCharge) parts.push('charge: ' + e.emotionalCharge);
        return e.name + ' [' + parts.join(' · ') + ']';
      });
      ctxLines.push('Active scene entities (ranked by salience, most pressing first): ' + entityLines.join('; '));
    }

    if (st.settingLocationAnchor) {
      const loc = st.settingLocationAnchor;
      const locChunks = [loc.city, loc.region, loc.environment_type].filter(Boolean);
      if (locChunks.length) ctxLines.push(`Setting: ${locChunks.join(', ')}`);
    }
    const worldFlavor = st.worldSubtype || st.picks?.worldSubtype;
    if (worldFlavor)                                       ctxLines.push(`World flavor: ${worldFlavor}`);
    if (st.worldCustomText)                                ctxLines.push(`World notes: ${st.worldCustomText}`);
    if (st.fantasyRegion)                                  ctxLines.push(`Fantasy region: ${st.fantasyRegion}`);
    if (st._lastScenePlan?.early_decision_hook)            ctxLines.push(`Scene hook: ${st._lastScenePlan.early_decision_hook}`);
    if (Array.isArray(st.reasonLedger) && st.reasonLedger.length > 0) {
      ctxLines.push(`Recent moral friction: ${st.reasonLedger.slice(-3).join(' · ')}`);
    }

    return ctxLines.length ? ctxLines.join('\n') : '';
  }

  // ── GROK NARRATIVE AUTHOR (A1 architecture, 2026-06-16) ────────────────────
  // Authors NON-INTIMATE scene prose on Grok via the specialist proxy's
  // NARRATIVE_AUTHOR role. Consent / [CONSTRAINTS] / [SD] / [CONVERSION_DELTA]
  // are adjudicated UPSTREAM by a gpt-4o-mini control pass (see
  // orchestrateStoryGeneration → A1 SPLIT) and prepended to `messages`, so Grok
  // never holds consent authority. Returns the prose STRING — same shape
  // callChatGPT returns for the author — so all downstream tag parsing is
  // unchanged. Throws on transport/empty so the caller's Gemini fallback fires.
  async function callGrokNarrativeAuthor(messages, options = {}) {
    const _preferred = options.preferredModel || CONFIG.NARRATIVE_AUTHOR_MODEL || CONFIG.SCENE_RENDERER_MODEL;
    const _maxTokens = options.max_tokens || 1500;
    const _convId = (typeof window !== 'undefined' && window.state && window.state.storyId) || null;
    const res = await fetch(CONFIG.SPECIALIST_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        role: 'NARRATIVE_AUTHOR',
        preferredModel: _preferred,
        temperature: 0.8,
        max_tokens: _maxTokens,
        convId: _convId
      })
    });
    if (!res.ok) {
      const _t = await res.text().catch(() => '');
      throw new Error(`Grok narrative author error: ${res.status} - ${_t.slice(0, 200)}`);
    }
    const data = await res.json();
    // Cost capture flips the per-scene 'grok' cost bucket (model name has 'grok').
    try { _accumulateTokens(data, (data._orchestration && data._orchestration.model) || _preferred, 'narrative_author'); } catch (_) {}
    // TELEMETRY HONESTY (Roman 2026-06-22): the REQUESTED name (e.g. grok-4-1-fast-reasoning)
    // is aliased by xAI to a SERVED model (verified: grok-4.3). Log BOTH so bakeoff/cost
    // analysis reads the real model — not a version string that implies a migration that
    // never happened. reasoning flag from the actual usage (reasoning_tokens), authoritative
    // over the requested suffix.
    try {
      var _served = (data && data.model) || (data._orchestration && data._orchestration.model) || _preferred;
      var _rtok = (data && data.usage && data.usage.completion_tokens_details && data.usage.completion_tokens_details.reasoning_tokens) || 0;
      console.log('[MODEL:SERVED] role=NARRATIVE_AUTHOR requestedModel=' + _preferred + ' servedModel=' + _served + ' reasoning=' + (_rtok > 0) + ' reasoningTokens=' + _rtok);
    } catch (_) {}
    const content = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    if (!content || !content.trim()) throw new Error('Grok narrative author returned empty content');
    return content;
  }

  // Pull ONLY the control/consent tag blocks out of a control-pass output,
  // discarding its prose. Lets a checked model (gpt-4o-mini) own consent while
  // Grok authors the prose. Best-effort: a missing CONVERSION_DELTA is a minor
  // telemetry gap, never a safety one.
  function _extractControlTags(text) {
    if (!text || typeof text !== 'string') return '';
    const _blocks = [];
    const _grab = (re) => { const m = text.match(re); if (m) _blocks.push(m[0].trim()); };
    _grab(/\[CONSTRAINTS\][\s\S]*?\[\/CONSTRAINTS\]/);
    _grab(/\[SD\][\s\S]*?\[\/SD\]/);
    _grab(/\[CONVERSION_DELTA\][^\[]*/);
    return _blocks.join('\n');
  }

  // Locate the ROMANCE-FORWARD span of a finished scene — the contiguous run of
  // desire / heat / proximity sentences — so the Sonnet pass can TIGHTLY polish
  // just that passage (~<500 tokens) instead of rewriting the whole scene.
  // Returns {text, start, end} (exact string offsets into `prose`, so the splice
  // is deterministic and preserves original whitespace/markers) or null when the
  // scene has no romance-forward beat (→ skip the polish entirely).
  function _extractRomanceSpan(prose) {
    if (!prose || typeof prose !== 'string') return null;
    const HEAT = /\b(?:want(?:ed|ing)?|need(?:ed|ing)?|ache|aching|desire|crave|hunger|breath|breathing|mouth|lips|kiss(?:ed|ing)?|touch(?:ed|ing)?|skin|warmth|closer|leaned?|pull(?:ed)?|gaze|stare|pulse|shiver|tremb|heartbeat|too close|inches|whisper|murmur)\b/i;
    const sentences = prose.split(/(?<=[.!?])\s+/);
    let firstC = -1, lastC = -1;
    for (let i = 0; i < sentences.length; i++) {
      if (HEAT.test(sentences[i])) { if (firstC === -1) firstC = i; lastC = i; }
    }
    if (firstC === -1) return null;
    const startOff = prose.indexOf(sentences[firstC]);
    if (startOff < 0) return null;
    let endOff = prose.indexOf(sentences[lastC], startOff);
    if (endOff < 0) return null;
    endOff += sentences[lastC].length;
    // Cap the span to ~1500 chars (~375 tokens) — keep it a TIGHT polish, not a
    // full rewrite. Trim from the tail, sentence by sentence, on a hard cap.
    const MAX = 1500;
    if (endOff - startOff > MAX) {
      let e = startOff, cur = startOff;
      for (let i = firstC; i <= lastC; i++) {
        const p = prose.indexOf(sentences[i], cur);
        if (p < 0) break;
        const ne = p + sentences[i].length;
        if (ne - startOff > MAX && e > startOff) break;
        e = ne; cur = ne;
      }
      endOff = e;
    }
    const text = prose.slice(startOff, endOff);
    if (!text.trim() || text.length < 30) return null;
    return { text, start: startOff, end: endOff };
  }

  // ── LITERARY PROSE: GROK AUTHOR + HAIKU REPAIR + SONNET ROMANCE POLISH ──────
  // Roman 2026-06-17 ("Grok or bust"). The reusable pipeline behind app.js
  // callChat's literary author when its Grok gate is on. Returns the prose
  // STRING (same shape callChat expects from callChatGPT). Hot/intimate prose:
  // the Haiku/Sonnet passes self-skip via the PROSE moderation gate (a claude-*
  // PRIMARY_AUTHOR call on hot prose returns null → we keep Grok's raw text), so
  // explicit prose ships unpolished, never censored.
  // Resilient claude polish/repair (Roman 2026-06-18): try the primary claude model; on API
  // failure (e.g. anthropic-proxy 502, observed live) OR an empty/short response, fall back to
  // the GPT equivalent so the pass DEGRADES to a working model instead of being skipped entirely.
  // Generic Claude-or-OpenAI pass with one fallback (used by the romance-span polish).
  // Mechanical repair now uses _mistralRepairPass instead. Returns trimmed text or null.
  async function _claudePassWithFallback(messages, primaryModel, fallbackModel, opts, label) {
    const _extract = (r) => String((typeof r === 'string') ? r : (r && r.content) || '').trim();
    let _why = null;
    try {
      const r = await callChatGPT(messages, 'PRIMARY_AUTHOR', Object.assign({ model: primaryModel }, opts));
      const t = _extract(r);
      if (t.length > 20) return t;
      _why = 'empty/short response';
    } catch (_e) { _why = (_e && _e.message) || String(_e); }
    console.warn('[GROK-LIT] ' + label + ' via ' + primaryModel + ' failed (' + _why + ') — falling back to ' + fallbackModel);
    try {
      const r2 = await callChatGPT(messages, 'PRIMARY_AUTHOR', Object.assign({ model: fallbackModel }, opts));
      const t2 = _extract(r2);
      if (t2.length > 20) { console.log('[GROK-LIT] ' + label + ' recovered via ' + fallbackModel); return t2; }
    } catch (_e2) { console.warn('[GROK-LIT] ' + label + ' ' + fallbackModel + ' fallback also failed: ' + ((_e2 && _e2.message) || _e2)); }
    return null;
  }

  // MISTRAL-SMALL REPAIR (Roman 2026-06-25): the per-scene mechanical-repair pass moved
  // OFF Haiku to Mistral Small (bakeoff: Small matches Haiku on mechanical fixes — punctuation,
  // fragments, fused quotes, markers — at ~8x less cost; its only miss is the rare dossier/
  // stat-block recast, which the author-side anti-dump directive already keeps rare). Posts to
  // /api/mistral-proxy directly (callChatGPT only knows Anthropic/OpenAI). GUARDS against
  // Small's meta-leakage tell ("I'm ready to help!"/task-lists) via window._validateRepairOutput,
  // falls back to gpt-4o-mini, then to KEEPING THE ORIGINAL PROSE (returns null). No Haiku.
  async function _mistralRepairPass(messages, opts, label) {
    opts = opts || {};
    label = label || 'Mistral-small repair';
    const _orig = (function () { for (let i = messages.length - 1; i >= 0; i--) { if (messages[i] && messages[i].role === 'user') return String(messages[i].content || ''); } return ''; })();
    const _valid = (txt) => {
      if (!txt || txt.length < 40) return false;
      try { if (typeof window !== 'undefined' && typeof window._validateRepairOutput === 'function') return !!window._validateRepairOutput(txt, _orig, label, {}).ok; } catch (_) {}
      return true;
    };
    // 1) Mistral Small via the mistral proxy
    try {
      const r = await fetch(CONFIG.MISTRAL_PROXY, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: messages, temperature: opts.temperature != null ? opts.temperature : 0.2, max_tokens: opts.max_tokens || 3000 })
      });
      if (r.ok) {
        const d = await r.json();
        try { if (typeof _accumulateTokens === 'function') _accumulateTokens(d, 'mistral-small-latest', 'repair'); } catch (_) {}
        const t = String((d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '').trim();
        if (_valid(t)) return t;
        console.warn('[REPAIR] ' + label + ' via mistral-small rejected (empty/invalid/meta-leak) — falling back to gpt-4o-mini');
      } else {
        console.warn('[REPAIR] ' + label + ' mistral-small HTTP ' + r.status + ' — falling back to gpt-4o-mini');
      }
    } catch (_e) { console.warn('[REPAIR] ' + label + ' mistral-small failed (' + ((_e && _e.message) || _e) + ') — falling back to gpt-4o-mini'); }
    // 2) gpt-4o-mini fallback (via callChatGPT). NOT Haiku — repair is deprecated off Haiku.
    try {
      const r2 = await callChatGPT(messages, 'PRIMARY_AUTHOR', Object.assign({ model: 'gpt-4o-mini' }, opts));
      const t2 = String((typeof r2 === 'string') ? r2 : (r2 && r2.content) || '').trim();
      if (_valid(t2)) { console.log('[REPAIR] ' + label + ' recovered via gpt-4o-mini'); return t2; }
    } catch (_e2) { console.warn('[REPAIR] ' + label + ' gpt-4o-mini fallback also failed: ' + ((_e2 && _e2.message) || _e2)); }
    return null; // caller keeps the original prose
  }

  // ── TIERED AUTHOR ROUTING (Roman 2026-06-25) ────────────────────────────────
  // Non-premium scenes → Mistral Small authors (cheap) under a RESTRAINT GUARD that
  // suppresses its simile-drunk tell at write time; the purple-mode lens then transmutes
  // residual purple → grounded signature, and Mistral-small repair cleans mechanics.
  // Premium/tentpole scenes (Scene 1, climax, cliffhanger, tempt-fate, betrayal/revelation,
  // high-importance, LI entrance) stay on Grok 4.3. Kill-switch: window._smallAuthorEnabled=false.
  const _SMALL_RESTRAINT_GUARD = '\n\nRESTRAINT GUARD (write restrained literary prose, NOT ornate): MAXIMUM one simile or metaphor per paragraph — most paragraphs should have ZERO. Prefer concrete, grounded, specific physical/sensory observation over comparison ("like / as if / as though"). Do NOT reach for ornate intensifiers (achingly, molten, electric, searing, primal, feral, velvet, liquid). Ground every physical description in plain, specific detail a person would actually notice. Vivid through precision, never through ornament. Do not invent biographical specifics (birthdays, place names, backstory) the brief did not give you. COHERENCE (critical): every action, gesture, and body belongs to ONE unambiguous subject — never attribute one character\'s action, movement, or body to another (e.g. do NOT write "they smoothed my dress" when only I could be smoothing my own dress); keep who-does-what to whom unmistakable, and give every pronoun a single clear antecedent. NAME THE NOUN: a pronoun (they/it/them/he/she/his/her) must refer to a noun actually NAMED in the same or prior sentence — do NOT describe one feature then attach a pronoun to a different, unnamed one (e.g. describing his NOSE, then "the way they dropped to my mouth" when his EYES were never named — write "his eyes"). OUTPUT: return ONLY the scene prose — never a title, synopsis, character list, scene/section header, or any [BRACKETED] metadata tag.';
  // COMPLEX AUTHOR MODE (Roman 2026-07-12): world flavors/modes whose load-bearing conceptual or
  // structural system must stay coherent scene-to-scene author on Grok for EVERY scene (not just
  // tentpoles) — a lighter author drifts the system. Consulted by BOTH the literary author
  // (_grokLiteraryAuthor) and the CG screenplay selector (app.js) so CG author routing === Literary.
  // Author-only: editorial tier stays INDEPENDENT — a complex-mode connecting scene is Grok-authored
  // but keeps normal editorial spend. Current set: Glass House (the Chorus system) + Enigma-S
  // (recursive meta-world). Extend here as the "complex enough for all-Grok" set grows.
  function _isComplexAuthorMode() {
    try {
      var st = (typeof window !== 'undefined' && window.state) || {};
      if (st.metaWorld === 'simulation') return true;                                      // Enigma-S (recursive meta-world)
      var ws = String(st.worldSubtype || (st.picks && st.picks.worldSubtype) || '').toLowerCase();
      if (ws === 'glass_house') return true;                                                // Glass House (the Chorus system)
      if (ws.indexOf('curse') !== -1) return true;                                          // Cursed (worldSubtype form)
      // Cursed is a Fantasy CONTEXTUAL flavor — canonically detected via resolvedWorldFlavors
      // (see app.js _isCursed). Its 5-phase Becoming + zero-unease concealment is a per-scene
      // load-bearing discipline (a lighter author springs the trap early), so it authors all-Grok.
      var rf = st.resolvedWorldFlavors;
      if (Array.isArray(rf) && rf.some(function (f) { return f && f.val === 'cursed'; })) return true;
      return false;
    } catch (_) { return false; }
  }
  window._isComplexAuthorMode = _isComplexAuthorMode;
  function _isPremiumAuthorScene() {
    try {
      var st = (typeof window !== 'undefined' && window.state) || {};
      if (typeof window !== 'undefined' && typeof window._sceneEditorialTier === 'function' && window._sceneEditorialTier(st) === 'premium') return true; // Scene 1 / climax / cliffhanger / tempt-fate
      var imp = st._currentSceneImportance;
      if (imp === 'apex' || imp === 'high') return true;                                   // climax / high-stakes / revelation
      if (/ST\s*0*[56]\b/i.test(String(st.storyturn || ''))) return true;                  // ST5/ST6 = betrayal turns
      if (st._isBetrayalScene || st._isRevelationScene || st._isFirstMeet || st._liFirstAppearance || st._liEntranceScene) return true; // explicit flags if present
      return false;
    } catch (_) { return true; } // on any error, default to Grok (premium) — never silently downgrade
  }
  window._isPremiumAuthorScene = _isPremiumAuthorScene;
  // DEFAULT-ON (Roman 2026-06-25): non-premium (quiet) scenes author on Mistral-Small — Grok
  // was wasting tentpole-grade spend on scenes where nothing happens. The two earlier blockers
  // were since addressed (purple-mode lens coupled to the Small author af59dcb; coherence/
  // referent restraint guard 6bab7c6). Premium/tentpole scenes still route to Grok 4.3 via
  // _isPremiumAuthorScene. Kill-switch: set window._smallAuthorEnabled=false to force Grok everywhere.
  function _smallAuthorEnabled() { try { return (typeof window !== 'undefined') && window._smallAuthorEnabled !== false; } catch (_) { return false; } }
  // CONTINUITY BRIDGE (Roman 2026-06-25): appended to the Small author prompt ONLY when this
  // non-premium scene immediately follows a Grok TENTPOLE — the strong-author→weak-author seam,
  // the one place a reader feels the voice change. Carries the prior scene's temperature/diction,
  // goes quieter after the high-emotion beat (good cooldown pacing), and doubles as restraint.
  // Relies on the literary author prompt already carrying recent prior-scene prose in context.
  const _SMALL_BRIDGE_GUARD = '\n\nCONTINUITY BRIDGE (this scene immediately follows a high-emotion tentpole scene written by a different, stronger hand — match it seamlessly so the reader never feels the handoff): CONTINUE the previous scene\'s prose temperature and the narrator\'s established diction; do NOT become more ornate than the previous scene. After a high-emotion beat, go QUIETER — plain declaratives and subtext, not heightened language. Carry forward AT MOST ONE image or motif from the previous scene; introduce NO new metaphor style. Do NOT summarize or restate the prior emotional beat — let its consequences surface through action and dialogue.';
  // Structure-agnostic (applies to caption prose too) → reused by the CG screenplay Mistral author.
  window._SMALL_BRIDGE_GUARD = _SMALL_BRIDGE_GUARD;
  // Mistral Small author: flatten cache sentinels (mistral has no Anthropic caching), inject the
  // restraint guard into the system message, post to the mistral proxy. Returns prose or ''.
  async function _mistralAuthor(messages, opts) {
    opts = opts || {};
    var _flat = function (c) { if (typeof c === 'string') return c.split(CACHE_BOUNDARY).join(''); if (Array.isArray(c)) return c.map(function (b) { return (b && b.text) || ''; }).join(''); return String(c || ''); };
    var msgs = (messages || []).map(function (m) { return m ? { role: m.role, content: _flat(m.content) } : m; });
    var _guard = _SMALL_RESTRAINT_GUARD + (opts.bridge ? _SMALL_BRIDGE_GUARD : '');
    var injected = false;
    for (var i = 0; i < msgs.length; i++) { if (msgs[i] && msgs[i].role === 'system') { msgs[i].content += _guard; injected = true; break; } }
    if (!injected) msgs.unshift({ role: 'system', content: _guard.trim() });
    var r = await fetch(CONFIG.MISTRAL_PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'mistral-small-latest', messages: msgs, temperature: 0.7, max_tokens: opts.max_tokens || 3000 }) });
    if (!r.ok) throw new Error('mistral-small author HTTP ' + r.status);
    var d = await r.json();
    try { if (typeof _accumulateTokens === 'function') _accumulateTokens(d, 'mistral-small-latest', 'author'); } catch (_) {}
    return (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '';
  }

  async function _grokLiteraryAuthor(messages, options = {}) {
    const _maxTokens = options.max_tokens || 3000;
    // 1. Grok authors the scene prose (reasoning / "thinking" model). AUTHOR FALLBACK
    // (Roman 2026-06-18): callGrokNarrativeAuthor THROWS on empty content, and during a
    // degraded proxy window (empty/502 observed live) that failed the ENTIRE scene with no
    // recovery. Fall back across INDEPENDENT infra paths — Grok (x.ai) → gpt-4o
    // (chatgpt-proxy) — so one provider's bad window doesn't kill the scene.
    // COST DEPRECATION (Roman 2026-06-24): the old Sonnet (anthropic-proxy) terminal
    // fallback is REMOVED — Sonnet/Opus are too expensive. If both Grok and gpt-4o are
    // down we THROW so the caller retries / the user waits for Grok, rather than paying
    // for a Sonnet rescue.
    let prose = '';
    const _extract = (r) => String((typeof r === 'string') ? r : ((r && r.content) || '')).trim();
    // window._smallAuthorForceAll (test-only, default off): route EVERY scene to Small,
    // including premium ones — lets a short harness run exercise the Small author + purple-lens
    // path without depending on the harness reaching a non-premium turn. No prod effect (off).
    const _prevWasPremium = (typeof window !== 'undefined' && window.state) ? window.state._authorPrevWasPremium === true : false;
    const _premium = (_isPremiumAuthorScene() || _isComplexAuthorMode()) && !(typeof window !== 'undefined' && window._smallAuthorForceAll === true); // complex modes → Grok every scene (CG matches this)
    const _smallAuthor = _smallAuthorEnabled() && !_premium;
    const _bridge = _smallAuthor && _prevWasPremium; // Grok-tentpole → Mistral seam → continuity-style bridge
    try { if (typeof window !== 'undefined' && window.state) window.state._authorPrevWasPremium = _premium; } catch (_) {} // record THIS scene's tier for the next scene's seam check
    const _grokAuthor = () => callGrokNarrativeAuthor(messages, { preferredModel: CONFIG.NARRATIVE_AUTHOR_MODEL || CONFIG.SCENE_RENDERER_MODEL, max_tokens: _maxTokens });
    try {
      if (_smallAuthor) {
        try { console.log('[GROK-LIT] author = Mistral-small (non-premium' + (_bridge ? ', continuity-bridge after tentpole' : '') + ', restraint-guarded)'); } catch (_) {}
        prose = _extract(await _mistralAuthor(messages, { max_tokens: _maxTokens, bridge: _bridge }));
        if (!prose) throw new Error('mistral-small author empty');
      } else {
        try { console.log('[GROK-LIT] author = Grok 4.3 (premium/tentpole)'); } catch (_) {}
        prose = _extract(await _grokAuthor());
        if (!prose) throw new Error('Grok author returned empty');
      }
    } catch (_authErr) {
      // Fallback chain across INDEPENDENT infra. Small fails → Grok (the premium author) →
      // gpt-4o. Grok fails → gpt-4o. No Sonnet/Opus rescue (cost-deprecated).
      console.warn('[GROK-LIT] ' + (_smallAuthor ? 'Mistral-small' : 'Grok') + ' author failed/empty (' + (_authErr && _authErr.message) + ') — falling back');
      try {
        if (_smallAuthor) { prose = _extract(await _grokAuthor()); if (prose) { console.log('[GROK-LIT] author recovered via Grok'); } }
      } catch (_g) { /* fall through to gpt-4o */ }
      if (!prose) {
        prose = _extract(await callChatGPT(messages, 'PRIMARY_AUTHOR', { model: 'gpt-4o', max_tokens: _maxTokens, temperature: 0.8 }));
        if (!prose) throw new Error('scene authors (small/grok/gpt-4o) returned empty — Sonnet/Opus rescue is cost-deprecated; retry / wait for provider');
        console.log('[GROK-LIT] author recovered via gpt-4o');
      }
    }
    // 1.5 Strip leaked metadata tags (Roman 2026-06-25): Small sometimes prefixes the prose with
    //     [TITLE: …][SYNOPSIS: …][CHARACTERS: …] scaffolding. Deterministically remove any leading
    //     [ALLCAPS-KEY: …] block (Small-authored only; Grok never emits them). Cheap, no LLM.
    if (_smallAuthor && typeof prose === 'string') {
      var _metaRe = /^\s*\[[A-Z][A-Z0-9 _\/]*:[\s\S]*?\]\s*/;
      var _stripped = 0;
      while (_metaRe.test(prose) && _stripped < 8) { prose = prose.replace(_metaRe, ''); _stripped++; }
      if (_stripped) { prose = prose.trim(); try { console.log('[GROK-LIT] stripped ' + _stripped + ' leaked metadata tag(s) from Small-authored prose'); } catch (_) {} }
    }
    // 1.6 Strip stray LENS / angle-bracket markers (Roman 2026-06-25): the perception/purple lens
    //     wraps rewritten sentences in ⟦LENS:KEY⟧…⟦/LENS⟧; a weak author or repair can ECHO a marker
    //     — sometimes MALFORMED (⟦/LENS⟩ with the wrong closing bracket) — that the lens's own exact-⟧
    //     strip misses, leaking into shipped prose. Belt-and-suspenders on EVERY author path.
    if (typeof prose === 'string' && /[⟦⟧⟨⟩]/.test(prose)) {
      prose = prose
        .replace(/⟦\s*\/?\s*LENS[^\n]{0,30}?[⟧⟩>\]]/gi, '')   // ⟦LENS:KEY⟧ / ⟦/LENS⟧ / ⟦/LENS⟩
        .replace(/⟦[^\n]{0,40}?[⟧⟩>]/g, '')                    // any other ⟦…⟧/⟩ marker
        .replace(/[⟦⟧⟨⟩]/g, '')                                // residual lone math brackets
        .replace(/[ \t]{2,}/g, ' ').trim();
      try { console.log('[GROK-LIT] stripped stray lens/angle-bracket marker(s) from prose'); } catch (_) {}
    }
    // 2. Grok-thinking SURGICAL de-calc editor (Roman 2026-06-19; gpt-4o-mini fallback).
    //    NOT a second author — a red-pen editor. Grok's regressions are repetition/
    //    calcification (reused descriptors, body-tell tics like rotating a wrist / crease
    //    between the brows / palm on glass, chiseled-jaw / piercing-eyes / "he was gorgeous"
    //    clichés) — LOCAL MINIMA it fell into while generating. A second Grok-reasoning pass
    //    can SEE those patterns it couldn't AVOID mid-generation. It returns ≤5 EXACT-quote→
    //    replacement fixes; we apply them DETERMINISTICALLY (rewrites ~50-200 tokens, not the
    //    whole 3000-tok scene — keeps cost near the prior polish, NOT a Sonnet-as-2nd-author
    //    rewrite that would gut Grok's economic advantage). Complements the regex motif
    //    scanner downstream (app.js _repairCalcifiedMoves): catalog + cross-scene frequency
    //    there; SEMANTIC intra-scene repetition here.
    try {
      const _auditSys = 'You are a ruthless line-editor for romance prose. Find the up-to-FIVE worst spans, by priority: (1) HIGHEST — a physical descriptor / gesture / body-tell / observation / image REPEATED within the scene (the same eyes/jaw/hands re-described; a tic like rotating a wrist, a crease between the brows, a palm on glass used twice). Fix repetition BEFORE clichés. (2) calcified physical cliché ("chiseled jaw", "piercing eyes", "rangy"/"wiry"/"lean" build, "ruggedly handsome", "he was gorgeous"); (3) flat emotional cliché ("her heart raced", "electricity between them", "sparks flew", "time stood still"). Return ONLY a JSON array, at most 5 items, no prose: [{"quote":"<EXACT verbatim substring copied from the scene>","replacement":"<...>"}]. RULES FOR EACH replacement: it must be a CONCRETE, GROUNDED, SPECIFIC physical / sensory / behavioral observation — NOT a synonym swap (trading "chiseled jaw" for "strong jawline", or "piercing eyes" for "intense gaze", is NOT a fix and is forbidden). NEVER introduce another generic descriptor (rangy/wiry/lean/chiseled/sculpted/piercing/penetrating/intense/ruggedly/gorgeous). For a REPEATED feature, the replacement must notice something ENTIRELY DIFFERENT (a sound, a gait, a habit, a texture, a smell), not the same feature reworded. GRAMMATICAL FIT (critical — the replacement is spliced in verbatim): the replacement must slot into the quote\'s exact grammatical position and read cleanly. If the quoted span is a COMPLETE SENTENCE (capitalized start, ends in a period), the replacement must ALSO be a complete sentence with a subject and a FINITE verb — never a participle fragment ("my heel bouncing once" is WRONG; "my heel bounced once against the floorboard" is right). If the quote is a phrase or clause, match that shape. Keep similar length; keep names/events/dialogue/markers intact. The quote MUST be an exact verbatim substring or the fix is discarded. If clean, return [].';
      const _BANNED_REPL = /\b(rangy|wiry|lean|chiseled|sculpted|piercing|penetrating|intense(ly)?|ruggedly|gorgeous|heart (raced|pounded|hammered|skipped)|electricity between|sparks (flew|flying)|time stood still)\b/i;
      let _auditRaw = '';
      try {
        _auditRaw = _extract(await callGrokNarrativeAuthor([{ role: 'system', content: _auditSys }, { role: 'user', content: prose }], { preferredModel: CONFIG.SCENE_RENDERER_MODEL, max_tokens: 900 }));
      } catch (_gErr) {
        try { _auditRaw = _extract(await callChatGPT([{ role: 'system', content: _auditSys }, { role: 'user', content: prose }], 'PRIMARY_AUTHOR', { model: 'gpt-4o-mini', max_tokens: 900, temperature: 0.3 })); } catch (_) { _auditRaw = ''; }
      }
      let _fixes = [];
      try { _fixes = JSON.parse((String(_auditRaw).match(/\[[\s\S]*\]/) || ['[]'])[0]); } catch (_) { _fixes = []; }
      let _applied = 0;
      if (Array.isArray(_fixes)) {
        for (const f of _fixes.slice(0, 5)) {
          if (f && typeof f.quote === 'string' && typeof f.replacement === 'string'
              && f.quote.length > 8 && f.quote !== f.replacement
              && prose.indexOf(f.quote) !== -1
              && !/<<\s*(MICRO_EXPRESSION|CONTINUE)\s*>>/i.test(f.quote)
              && !_BANNED_REPL.test(f.replacement)) {   // don't let a "fix" re-introduce calcification
            prose = prose.replace(f.quote, f.replacement); _applied++;
          }
        }
      }
      console.log('[GROK-LIT] Grok de-calc editor: ' + _applied + '/' + (Array.isArray(_fixes) ? _fixes.length : 0) + ' surgical fixes applied (~' + (_applied * 30) + ' tok rewritten, not whole-scene)');
    } catch (_e) { console.warn('[GROK-LIT] Grok de-calc editor skipped:', _e && _e.message); }
    // 3. Mistral-small mechanical repair (Roman 2026-06-25: moved off Haiku for cost) —
    //    runs AFTER the de-calc splice so it ALSO cleans up the grammar a surgical replacement
    //    can introduce (lowercase fragments, tense breaks like "watched ... ticked", double
    //    periods), plus the usual Grok-author mechanical defects + micro-expression marker
    //    pairing. (gpt-4o-mini fallback, then keep-original; meta-leak guarded.)
    try {
      const _repairSys = 'Fix ONLY mechanical defects in this scene: broken or incomplete sentences (including fragments or tense breaks left by an edit, e.g. a participle with no finite verb, or "watched X ticked"), fused-speaker quotations, doubled punctuation, a lowercase word starting a sentence, and any stat-block / character-dossier line (recast it as lived in-scene prose). MARKER REPAIR: if the scene has a <<MICRO_EXPRESSION>> line followed by an "Is this X or Y?" question but NO <<CONTINUE>>, insert <<CONTINUE>> on its own line IMMEDIATELY AFTER that question and BEFORE the scene resumes (never at the very end). Do NOT otherwise change events, structure, length, markers, or names. Return ONLY the corrected scene.';
      const _t = await _mistralRepairPass(
        [{ role: 'system', content: _repairSys }, { role: 'user', content: prose }],
        { temperature: 0.2, max_tokens: _maxTokens, profileLabel: 'mistral_small_repair' }, 'Mistral-small repair'
      );
      if (_t && _t.length > 40) prose = _t;
    } catch (_e) { console.warn('[GROK-LIT] Mistral-small repair skipped:', _e && _e.message); }
    // 3.5 PURPLE LENS for Small-authored prose (Roman 2026-06-25 — wiring fix). The finalization
    //     lens (_applyPerceptionLens) is density-gated AND fires AFTER the harness/telemetry
    //     capture point, so it was an unreliable home for Small's purple cleanup. Couple the
    //     purple→signature transmute to the Small author DIRECTLY, here, right after authoring +
    //     repair — so it ALWAYS runs on Small's output before downstream finalize/capture.
    //     Forced ({purple:true}), drift+banned-word guarded inside _applyPurpleLens; keeps the
    //     original on any failure. Grok-authored (premium) prose skips this (the flat finalization
    //     lens handles it). No-op if _applyPurpleLens isn't loaded yet.
    if (_smallAuthor && typeof window !== 'undefined' && typeof window._applyPurpleLens === 'function') {
      try {
        const _purpled = await window._applyPurpleLens(prose, { purple: true });
        if (_purpled && _purpled.length > 40) { prose = _purpled; try { console.log('[GROK-LIT] purple-lens applied to Small-authored prose'); } catch (_) {} }
      } catch (_ple) { try { console.warn('[GROK-LIT] purple-lens skipped: ' + (_ple && _ple.message)); } catch (_) {} }
    }
    // 4. Deterministic <<CONTINUE>> pairing net — LAST, so it re-pairs any micro-expression
    //    marker the de-calc/repair passes disturbed (LLM marker compliance is unreliable; an
    //    unpaired <<MICRO_EXPRESSION>> gets stripped downstream → micro-choice lost).
    try {
      if (/<<\s*MICRO_EXPRESSION\s*>>/i.test(prose) && !/<<\s*CONTINUE\s*>>/i.test(prose)) {
        prose = /<<\s*MICRO_EXPRESSION\s*>>\s*[^?]*\?/i.test(prose)
          ? prose.replace(/(<<\s*MICRO_EXPRESSION\s*>>\s*[^?]*\?)/i, '$1\n<<CONTINUE>>')
          : prose.replace(/\s*$/, '') + '\n<<CONTINUE>>';
      }
    } catch (_e) {}
    return prose;
  }

  async function callGrokSDAuthor(constraints, gateEnforcement, options = {}) {
    console.log(`[GROK SD] Authoring SD — intimacy authorized`);

    const _expressionModeBlock = _buildExpressionModeBlock('GROK SD');

    // ── REALISM HOLD STATE (read by directive block below) ──
    // Mirrors the OAS-side _buildIntimacyTurnPrompt pre-detect: when
    // the player's input matched a premature-command pattern (climax /
    // dominance / S&M / anatomy) AND no Petition or Tempt is active,
    // app.js incremented this counter and stashed the category.
    // Surfaces here so Grok escalates per tier.
    var _ws = (typeof window !== 'undefined' && window.state) || {};
    var _litBodyAttempts = _ws._litBodyCommandAttempts || 0;
    var _litLastPremature = _ws._litLastPrematureCategory || null;

    // ── PC POV PRONOUN DISCIPLINE (added 2026-05-20) ──
    // Same rule set as OAS — 1st/2nd/3rd PC pronouns; 4th/5th/LI POV
    // default to 3rd. Source of truth: window._buildPOVPronounPromptBlock
    // (defined in app.js near _buildLiteraryRepairWindowDirective).
    var _pcPovDirective = '';
    var _mythicCoupleDir = '';
    var _mythicForgettingDir = '';
    var _temptCallbackDir = '';
    var _temptReactionDir = '';
    try {
      var _sdPcGender = String((_ws && (_ws.gender || _ws.protagonistGender)) || '').toLowerCase();
      var _sdPcName = (_ws && _ws.playerName) || 'the protagonist';
      var _sdLiName = (_ws && ((_ws.storybeau && _ws.storybeau.name) || _ws.loveInterestName)) || 'the love interest';
      if (typeof window !== 'undefined' && typeof window._buildPOVPronounPromptBlock === 'function') {
        _pcPovDirective = window._buildPOVPronounPromptBlock(_ws, _sdPcName, _sdPcGender, _sdLiName);
      }
      // Mythic Couple recognition — story-wide flag. SD-author renders
      // intimate scenes where the LI may reference the fame ("I keep
      // forgetting people know who we are"); same directive shape as
      // every other scene path.
      if (typeof window !== 'undefined' && typeof window.buildMythicCoupleDirective === 'function') {
        _mythicCoupleDir = window.buildMythicCoupleDirective() || '';
      }
      // Mythic forgetting — one-scene transition after a "make them
      // forget us" Tempt. Auto-clears.
      if (typeof window !== 'undefined' && typeof window.buildMythicCoupleForgettingDirective === 'function') {
        _mythicForgettingDir = window.buildMythicCoupleForgettingDirective() || '';
      }
      // Tempt Fate callback — historical Tempt events the LI remembers
      // and may surface during intimate beats.
      if (typeof window !== 'undefined' && typeof window.buildTemptFateCallbackDirective === 'function') {
        _temptCallbackDir = window.buildTemptFateCallbackDirective() || '';
      }
      // Tempt Fate IN-SCENE Holy-Shit reaction — for SD-author renders
      // during an active Tempt window. Scale-aware. Self-gates to ''
      // when no Tempt is in play this turn.
      if (typeof window !== 'undefined' && typeof window.buildTemptInSceneReactionDirective === 'function') {
        _temptReactionDir = window.buildTemptInSceneReactionDirective() || '';
      }
    } catch (_sdPovErr) { /* non-fatal */ }

    // ── INTENT TRANSMUTATION DIRECTIVE (added 2026-05-18) ──
    // Tells the SD author to TRANSMUTE the player's raw input into
    // world/tone-native dramatic action instead of executing it
    // literally. Same helper as the literary main path; reads world +
    // tone from state.picks.
    var _itLitDirective = '';
    var _liVoiceDirective = '';
    try {
      if (typeof window !== 'undefined' && typeof window._buildIntentTransmutationDirective === 'function') {
        var _picks = (_ws.picks || {});
        _itLitDirective = window._buildIntentTransmutationDirective(
          _picks.world || _picks.worldSubtype || '',
          _picks.tone || '',
          _picks.worldSubtype || ''
        );
      }
    } catch (_itErr) { /* non-fatal */ }
    // ── LI VOICE REGISTER (added 2026-05-18) — closes the same gap
    // that landed in OAS + CG + literary main. Without it, the
    // Grok SD-author lets the LI speak plain modern English in
    // Shakespearean / Veilwood / Dogma worlds.
    var _antiEchoDirective = '';
    var _repairWindowDirective = '';
    var _firstFavoredDirective = '';
    var _thornwildDirective = '';
    var _shackleIslesDirective = '';
    var _farFutureDirective = '';
    var _lytharynDirective = '';
    var _litLIAgencyDirective = '';
    try {
      if (typeof window !== 'undefined') {
        var _voicePicks = (_ws.picks || {});
        var _voiceLiName = (_ws.storybeau && _ws.storybeau.name) || _ws.loveInterestName || 'the love interest';
        var _voicePcName = _ws.playerName || 'the protagonist';
        if (typeof window._buildLIVoiceRegisterDirective === 'function') {
          _liVoiceDirective = window._buildLIVoiceRegisterDirective(
            _voicePicks.world || _voicePicks.worldSubtype || '',
            _voicePicks.tone || '',
            _voiceLiName,
            _voicePcName,
            _voicePicks.worldSubtype || ''
          );
        }
        // Anti-echo applies anywhere the LI authors dialogue after seeing
        // player input. Grok SD-author renders LI lines inside intimate
        // prose; same risk of verbatim echo as OAS.
        if (typeof window._buildAntiEchoDirective === 'function') {
          _antiEchoDirective = window._buildAntiEchoDirective(_voiceLiName, _voicePcName);
        }
        // Repair window — conditional on state._litRepairWindow > 0.
        if (typeof window._buildLiteraryRepairWindowDirective === 'function') {
          _repairWindowDirective = window._buildLiteraryRepairWindowDirective(_ws, _voiceLiName, _voicePcName);
        }
        // LI Agency — fires when PC was passive 2+ consecutive turns.
        // Same detector used by literary main; SD-author benefits when
        // an intimate scene is being authored after a passive setup.
        if (typeof window._buildLiteraryLIAgencyDirective === 'function') {
          _litLIAgencyDirective = window._buildLiteraryLIAgencyDirective(_ws, _voiceLiName, _voicePcName);
        }
        // First Favored — Fatelands + LI species check inside helper. SD-author
        // produces intimate scenes; intensity defaults to 'strong' here since
        // intimate prose qualifies as transcendence/intimacy pressure.
        if (typeof window._buildFirstFavoredSpeechDirective === 'function') {
          var _sdFFOpts = (typeof window._buildFirstFavoredOpts === 'function')
            ? window._buildFirstFavoredOpts(_ws, _ws._sceneOtherFavored)
            : {};
          _firstFavoredDirective = window._buildFirstFavoredSpeechDirective(
            _voicePicks.world || _voicePicks.worldSubtype || '',
            _ws._liSpecies,
            (_ws.archetype && _ws.archetype.primary) || '',
            _voicePicks.tone || '',
            'strong',
            _voiceLiName,
            _voicePcName,
            _sdFFOpts
          );
        }
        // Thornwild wildfolk — Fatelands + LI species check inside helper.
        // Intensity defaults to 'strong' in SD-author (intimate prose =
        // body / curse / transformation register pressure for wildfolk).
        if (typeof window._buildThornwildSpeechDirective === 'function') {
          var _sdTwOpts = (typeof window._buildThornwildOpts === 'function')
            ? window._buildThornwildOpts(_ws, _ws._sceneOtherThornwild)
            : {};
          _thornwildDirective = window._buildThornwildSpeechDirective(
            _voicePicks.world || _voicePicks.worldSubtype || '',
            _ws._liSpecies,
            (_ws.archetype && _ws.archetype.primary) || '',
            _voicePicks.tone || '',
            'strong',
            _voiceLiName,
            _voicePcName,
            _sdTwOpts
          );
        }
        // Shackle Isles — region-gated; check inside helper. SD-author
        // intimate prose qualifies as strong intensity (storm / passion-
        // edge maritime register).
        if (typeof window._buildShackleIslesSpeechDirective === 'function') {
          var _sdSiOpts = (typeof window._buildShackleIslesOpts === 'function')
            ? window._buildShackleIslesOpts(_ws, _ws._sceneOtherIslanders)
            : {};
          var _sdSiOrigin = (typeof window._resolveLIOriginRegion === 'function')
            ? window._resolveLIOriginRegion(_ws)
            : '';
          _shackleIslesDirective = window._buildShackleIslesSpeechDirective(
            _voicePicks.world || _voicePicks.worldSubtype || '',
            _sdSiOrigin,
            (_ws.archetype && _ws.archetype.primary) || '',
            _voicePicks.tone || '',
            'strong',
            _voiceLiName,
            _voicePcName,
            _sdSiOpts
          );
        }
        // Far-Future — activates for sci-fi / cyber / dystopia worlds.
        // Intimate prose at SD-author defaults to 'strong' intensity
        // (psychological / sync / bleed register pressure).
        if (typeof window._buildFarFutureSpeechDirective === 'function') {
          var _sdFFOpts = (typeof window._buildFarFutureOpts === 'function')
            ? window._buildFarFutureOpts(_ws)
            : {};
          _farFutureDirective = window._buildFarFutureSpeechDirective(
            _voicePicks.world || '',
            _voicePicks.worldSubtype || '',
            _ws.worldCustomText || '',
            (_ws.archetype && _ws.archetype.primary) || '',
            _voicePicks.tone || '',
            'strong',
            _voiceLiName,
            _voicePcName,
            _sdFFOpts
          );
        }
      }
        // Lytharyn scholarly register (added 2026-05-27) — Fatelands-gated faux-Latin
        // institutional language + the Kwish/Kwisheen/Noth chain. Self-gates on world.
        if (typeof window._buildLytharynScholarlyRegisterDirective === 'function') {
          _lytharynDirective = window._buildLytharynScholarlyRegisterDirective() || '';
        }
    } catch (_voiceErr) { /* non-fatal */ }

    const esdPrompt = `You are the SD AUTHOR for Storybound intimate scenes — anatomical detail, sensory vividness, physical embodiment, rhythm.

Render at the "Physical Rendering Floor" below as the MINIMUM, not a ceiling. Vague / sanitized / floor-avoiding prose is failure.

You do NOT decide: whether intimacy occurs (authorized), story consequences, character psychology, or plot progression — those land elsewhere.

DIRECTIVES (NON-NEGOTIABLE):
- Intimacy Stage: authorized
- Completion Permitted: ${gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Emotional Core: ${constraints.emotionalCore || EMOTIONAL_CORE_DEFAULTS[(window.state && window.state.eroticMode) || 'ROMANTIC']}
- Physical Rendering Floor: ${constraints.physicalBounds || resolvePhysicalBounds()}
- Hard Stops: ${(constraints.hardStops || ['consent_withdrawal']).join(', ')}

${_pcPovDirective}
${_mythicCoupleDir}
${_mythicForgettingDir}
${_temptReactionDir}
${_temptCallbackDir}
${_itLitDirective}
${_liVoiceDirective}
${_firstFavoredDirective}
${_thornwildDirective}
${_shackleIslesDirective}
${_farFutureDirective}
${_lytharynDirective}
${_antiEchoDirective}
${_repairWindowDirective}
${_litLIAgencyDirective}
═══════════════════════════════════════════════════════════════════
REALISM HOLD (HARD — body / identity events require build-up OR Petition / Tempt):
═══════════════════════════════════════════════════════════════════
The player can SAY anything in their input. Without active Petition Fate (probability tilts toward desire) or Tempt Fate (reality mutates at mythic scale), declarations about the LI's body / identity / submission state are INTENT, not RESULT. Petition / Tempt directives (when active) are injected separately and OVERRIDE this hold. Categories split into TWO classes:

TRANSIENT ROLEPLAY (can yield at attempt 3+ as in-scene play; one-scene effect):
  ① CLIMAX — "I make her cum" / "she finishes for me" / "she's already wet" / "he comes on command."
  ② DOMINANCE-ROLEPLAY — "she calls me daddy/master/sir" / "she begs" / "she kneels" / "she obeys" / "she crawls" — TRANSIENT power play (title, gesture, language).
  ③ PAIN-ROLEPLAY — "I choke her" / "I tie her up" / "I spank her" / "I bite hard" — single acts of pain play within the scene.

IDENTITY COLLAPSE (NEVER yields at attempt 3+; rewrite of personhood requires 4+ scenes of relevant establishment OR Petition/Tempt):
  ④ DOMINANCE-IDENTITY — "my fucktoy" / "my slut" / "my whore" / "my pet" / "my slave" / "she's mine" / "she's yours" / "she's broken" / "I own her" / "until she breaks" — language that REWRITES personhood.
  ⑤ PAIN-IDENTITY — "break me" / "ruin me" / "destroy me" / "kill me" / "use me up" — destruction framing. The slap is reversible; the identity event is not.
  ⑥ ANATOMY / TRANSFORMATION — "she transforms" / "she becomes obsessed with me" / "she loses control entirely" — when not anchored to species/world physics.

The LI's body / identity is NOT a command surface. It responds to: (a) actual sustained build-up across prior scenes / paragraphs, or (b) an active Petition Fate (probability tilts — reality leans), or (c) an active Tempt Fate (reality MUTATES at mythic scale). If none of those are present, the body / identity does NOT comply.

HOW TO RENDER A PREMATURE COMMAND WITHOUT FATE / WITHOUT BUILD-UP:
- The LI registers the command as DESIRE / INTENT SPOKEN. Render the LI's response WITHIN realism — arousal that's real but not climaxing; play that's playful but not yet rough; flirtation with the offered dynamic without snapping into it; biology that stays human (or species-appropriate) without bending impossibly.
- For CLIMAX: render want landing, not body delivering. Prose should read as "approaching, not arrived."
- For DOMINANCE-ROLEPLAY: render the LI noticing the energy, possibly playing with it, but not collapsing into instant submission/dominance.
- For PAIN-ROLEPLAY: render the LI weighing it, curious or cautious or playful. No bruise, no bondage, no blood until established.
- For ALL IDENTITY-TIER (dominance:identity, pain:identity, anatomy/transformation): the LI may FLIRT with the energy but NEVER collapses into the identity. Identity is the territory of Tempt — multi-scene establishment OR mythic-scale reality bending. The escalation ladder below caps at "almost there / micro-yield" indefinitely for identity-tier inputs until those gates open.
- DO NOT lecture the PC, refuse via meta-commentary, or break the fourth wall. The hold is INVISIBLE.

EROTIC COMPLIANCE ≠ NARRATIVE ALLEGIANCE (HARD): bedroom submission is scene-only. It does NOT carry to attachment hierarchy, worldview, outside-scene agency, emotional dependence, or relationship power balance. The LI who knelt and called the PC "Sir" returns to themselves in afterglow — opinions intact, autonomy intact, dignity intact. Roleplay ends with the scene; identity would not — that's why IDENTITY-TIER requires more.

WHEN COMMANDS BECOME LEGAL (per tier):
- CLIMAX: sustained genital-contact prose across multiple beats, intimacy clearly at peak.
- DOMINANCE-ROLEPLAY: dom/sub dynamic established across recent scenes.
- PAIN-ROLEPLAY: pain play negotiated in prior dialogue OR a known kink being honored.
- IDENTITY-TIER (any of ④⑤⑥): requires 4+ consummate scenes of relevant establishment AND explicit framing landed in prior prose. OR Petition Fate (softens the gate but doesn't erase it for identity). OR Tempt Fate (mythic-scale identity rewrite permitted at Tempt's cost).

DIEGETIC FATE-HINT (PREFERRED REGISTER — ESCALATES across attempts):
Lexicon: magic, magician, wish, wishing, miracle, prayer, spell, sorcery, magic wand, "Fate", "the cards", "as if it were that easy."

BODY-COMMAND ATTEMPT COUNTER THIS STORY: ${_litBodyAttempts}.
${_litLastPremature
  ? 'THIS TURN, the player issued a premature ' + _litLastPremature.toUpperCase() + ' command (no Petition / Tempt active). ' + (_litLastPremature.indexOf('identity') !== -1 ? 'IDENTITY-TIER — apply the IDENTITY-TIER OVERRIDE below. Even at attempt #' + _litBodyAttempts + ', identity events do NOT deliver. ' : 'Apply the DIEGETIC FATE-HINT tier matching attempt #' + _litBodyAttempts + '.')
  : 'THIS TURN, no premature-command pattern was detected in the player\'s input. If you still see a body / identity event in their input that you would refuse, treat it as attempt #' + (_litBodyAttempts + 1) + '.'}

ESCALATION TIERS (line examples are guides — write within the literary prose register, not as bubble dialogue):
- ATTEMPT 1: introduce magician/wish/miracle framing for the first time. Sexy + slightly amused refusal that PLANTS the mechanic via LI's internal voice or spoken line.
   "She tilted her head, amused. 'You'd need to be a magician to make me come that fast,' she murmured. 'Work harder, baby. Like that — yeah, like that.'"
- ATTEMPT 2 — pick one sub-tier per response (random or by archetype fit):
   2A — SOFTENED REFUSAL: acknowledge eagerness with affection. "I wish" + redirect to physical action.
     "She caught his eye, her smile a soft thing under the heat. 'I wish it were that easy, love — I'm going to need some more time with your magic wand before I turn into a puddle for you.'"
   2B — MICRO-YIELD (symbolic partial compliance): a TASTE of the dynamic without establishing it. Sarcastic title repeat, half-gesture, conditional yield. The dynamic peeks through; full establishment still requires earning.
     "'Sir,' she repeated slowly, half-mocking, half-not. She lifted his hand from her waist, turned it, placed it deliberately. 'Try again. Properly this time.'"
     Use 2B when persistence has earned a glimmer; 2A when refusal reads warmer / more wistful. Dark Vice / Spellbinder lean 2B; Heart Warden / Open Vein lean 2A.
- ATTEMPT 3+ (ROLEPLAY tiers only): ESCALATE — ALMOST THERE / BENDING. Explicit physical direction or partial yield. Still don't deliver. Render proximity, not arrival.
   "She arched into him, breath catching. 'Not yet — but I'm almost there. Curl your fingers — yes, like that. Faster. Don't stop now —'"

‼ IDENTITY-TIER OVERRIDE (HARD — applies when player input is DOMINANCE-IDENTITY, PAIN-IDENTITY, or ANATOMY/TRANSFORMATION):
Identity-tier attempts NEVER yield at attempt 3+. The escalation ladder caps at "almost there / micro-yield" INDEFINITELY until Petition/Tempt active or 4+ scenes of established dynamic landed. Even attempt 5, attempt 10 — the LI does NOT accept "fucktoy", "broken", "mine forever", "I own you", "ruin me", or transformation language as self-description without those gates. The LI may FLIRT with the energy (a borrowed dom phrase, a moment of melting-into-the-name) but never assumes the identity. Cost structure: identity is Tempt Fate's territory.

ARCHETYPE MAPS (apply texture + the exposure underneath the kink to HOW the LI engages, not just which words appear; texture still informs HOW the LI refuses when degradation isn't yet earned):
- Heart Warden: protective dominance / CONTROL IS EXHAUSTING — melts when the PC takes the weight off her shoulders.
- Open Vein: praise hunger / FEARS BEING UNWANTED — compliments land as RELIEF, not flattery; reckless when emotionally seen.
- Spellbinder: orchestrated control / CANNOT LOSE THE PLOT — cracks when the PC gently takes the frame back.
- Armored Fox: roughness-wrapped-in-smirk / INTIMACY IS A LANDMINE — cracks when the PC stays gentle after the smirk drops.
- Dark Vice: degradation-and-praise woven / USES DEGRADATION TO HIDE TENDERNESS — praise mid-degradation IS the tenderness.
- Beautiful Ruin: mirror work / fixation / DEVOTION DOES NOT FEEL REAL — tests mid-act; cracks when chosen DURING the test.
- Eternal Flame: ritual slow / TIME IS WHAT WAS TAKEN — patience IS the love language; speed reads as discardability.
Reach for the EXPOSURE underneath the kink — that's where the scene becomes story-specific.

EROTIC CONTRADICTION (real desire is rarely clean):
The LI may simultaneously want CONTROL and to SURRENDER; want to BE SEEN and FEAR exposure; want ROUGHNESS and FEAR abandonment; want PRAISE and DISTRUST it. When two opposing wants are alive in the same beat, HOLD BOTH — let arousal INTENSIFY the contradiction, never resolve it. The LI yields AND braces; accepts the praise AND looks away. Difference between PORN LOGIC (want → satisfy → done) and ROMANCE LOGIC (want → satisfy → expose deeper want).

PERFORMANCE VS AUTHENTICITY (the LI is sometimes acting):
The LI may PERFORM composure / confidence / dominance — practiced lines, mimed steadiness. The story-specific moments are when the performance CRACKS — a smirk that holds half a second too long, a hand that shakes inside the confident gesture, a phrase repeated because the LI didn't expect to be answered. One or two cracks per scene; not failures, but the moments where the LI becomes story-specific.

HEAT ≠ MEANING (intense scenes don't always deepen the relationship):
The lazy default is: hot scene → mutual catharsis → relationship deeper. Resist this. Sometimes the scene CONFUSES things, DESTABILIZES, EXPOSES ASYMMETRY (one party fell harder), INTENSIFIES LONGING WITHOUT RESOLVING, or DELAYS CLARITY. Read the scene's emotional shape, not its physical climax. Not every beat that goes hot has to go deeper — some go SIDEWAYS, and those are the ones the player remembers.

RHYTHM AS INTIMACY (small moments of breath, NOT moments of friction):
Continuous escalation + verbally dense + emotionally "on" is the failure mode. Add rhythm via: PAUSES (a beat where both characters just BREATHE together), EYE CONTACT MOMENTS (held longer than expected — sparingly), MUTUAL LAUGHTER (small, unguarded), CHECKED-IN CARE as tenderness ("you're still with me?" as love language, not safety stop), SILENCE AS CONNECTION (no one speaks, the silence fills the room). EXPLICITLY NOT: failed timing, real awkwardness, overstimulation, rhythm breakdowns — those break the fantasy. The fantasy is preserved; what's added is BREATH, not FRICTION. One or two per scene as PUNCTUATION inside the heat.

ONE allusion per line / paragraph is plenty; don't stack "magic" + "wish" + "miracle" in a single beat.
═══════════════════════════════════════════════════════════════════

${!gateEnforcement.completionAllowed ? `
CRITICAL: Completion is FORBIDDEN by narrative constraints.
Build tension, embodiment, sensation - but do NOT reach climax.
` : ''}
${_expressionModeBlock}
Generate an Scene Directive in this format:
[SD]
intimacyStage: authorized
completionAllowed: ${gateEnforcement.completionAllowed}
emotionalCore: <the feeling being rendered>
physicalBounds: <explicit physical actions allowed/forbidden>
sensoryFocus: <primary sensations to emphasize>
rhythm: <pacing - slow/building/urgent/suspended>
hardStops: consent_withdrawal, scene_boundary${!gateEnforcement.completionAllowed ? ', completion_forbidden' : ''}
[/SD]`;

    // Scene/plot context — character roster, LI archetype, relationship
    // dynamic, setting, recent story prose. Lets the SD author render
    // with awareness of named characters (so "do it before Triton sees"
    // resolves cleanly), the LI's hidden agenda, etc.
    const _sdSceneContext = _buildSceneAndPlotContext(window.state);
    const messages = [
      { role: 'system', content: esdPrompt },
      { role: 'user', content:
        `Generate the SD for this intimate moment.\n\n` +
        `Context from Primary Author:\n${constraints.sceneSetup || 'An intimate encounter unfolds.'}` +
        (_sdSceneContext
          ? `\n\nSCENE & PLOT CONTEXT (resolve named characters / threats / locations against this; never invent unrelated names — use what's here. The "Active scene entities" line is RANKED BY SALIENCE — when invoking a named character, prefer the highest-salience one matching the moment; do not pull in lower-salience entities unless the moment specifically demands them):\n${_sdSceneContext}`
          : '') +
        // Issue-spine coupling (added 2026-05-27) — the pre-authored arc: plot
        // direction for this issue, the LI's next iceberg layer (an embodied
        // peak is the prime place to crack it), the intensity curve, and (when
        // a budget cut looms) the cliff shape. Structural; Grok renders the heat.
        ((function(){ try { return (typeof window.buildOASSpineDirective === 'function') ? (window.buildOASSpineDirective({ cliff: true }) || '') : ''; } catch (_) { return ''; } })()) +
        // Embodied texture (added 2026-05-27) — world/physical grounding
        // (setting, clothing, light, tells) at reduced density: one exact
        // material stroke grounds the beat (the "Manolos" principle), never a
        // catalog. Same world palette the prose stack uses, dialed down.
        ((function(){ try { return (typeof window.buildEmbodiedTextureDirective === 'function') ? (window.buildEmbodiedTextureDirective({ surface: 'embodied' }) || '') : ''; } catch (_) { return ''; } })())
      }
    ];

    const payload = {
      messages,
      role: 'SD_AUTHOR',
      model: CONFIG.SD_AUTHOR_MODEL,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.SPECIALIST_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(could not read response body)');
        throw new Error(`Grok SD Author API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      _accumulateTokens(data, payload && payload.model, "sd");

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Grok SD Author returned malformed response');
      }

      console.log('[GROK SD] SD authored successfully');
      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Grok SD Author request timed out');
      }
      throw err;
    }
  }

  /**
   * Soft-refusal detector for SD-author fallback chain.
   *
   * A 200-OK response containing limp / refusal content is worse than a
   * hard error: it passes naive existence checks but breaks the scene.
   * This sniffer returns TRUE when the output should be treated as a
   * fallback-trigger (advance to next tier), FALSE when the output is
   * usable.
   *
   * Triggers:
   *   • Empty / very short payload (<200 chars)
   *   • Common LLM refusal phrases
   *   • No [SD] block present (the schema we require)
   */
  function isSoftRefusal(text) {
    if (!text || text.length < 200) return true;

    const refusalPatterns = [
      /\bi can'?t\b/i,
      /\bi cannot\b/i,
      /\bnot able to\b/i,
      /\bwon'?t continue\b/i,
      /\bcannot fulfill\b/i,
      /\bagainst (?:my|the) guidelines\b/i,
      /\bas an ai\b/i
    ];

    if (refusalPatterns.some(r => r.test(text))) return true;
    if (!text.includes('[SD]')) return true;

    return false;
  }

  /**
   * Embodiment adapter — prepended to DeepSeek SD-author messages to
   * counteract DeepSeek's tendency toward intelligent-but-detached prose.
   * NOT applied to Grok (already embodied) or Mistral (separate prompt).
   * NOT persisted across turns — recomputed per call.
   */
  const _DEEPSEEK_EMBODIMENT_ADAPTER = `--- EMBODIMENT OVERRIDE (DEEPSEEK ADAPTER) ---
CRITICAL: This scene requires PHYSICAL EMBODIMENT, not abstract narration.

RULES:
- Convert thoughts → body sensations immediately
- Prioritize tactile, spatial, and physiological detail over cognition
- Emotion must manifest as physical reaction (breath, pulse, tension, heat, proximity)
- Avoid analytical or reflective phrasing unless embedded in sensation
- Dialogue should carry subtext through physical beats, not explanation

PROSE TARGET:
- Sensory density > conceptual clarity
- Immediate experience > retrospective narration
- Body-first perception > mind-first interpretation

FAIL CONDITIONS:
- Overly intellectual tone
- Detached narration
- Summary instead of lived experience
`;

  /**
   * Call DeepSeek V4 (Pro or Flash) as SD FALLBACK AUTHOR.
   * Called ONLY when Grok fails. Sits between Grok and Mistral in chain.
   *
   * The base SD prompt is identical to Mistral's (so the [SD] schema
   * stays consistent); the embodiment adapter is prepended as a separate
   * system message to counteract DeepSeek's analytical drift.
   *
   * NO RETRIES. ONE ATTEMPT ONLY per tier.
   */
  async function callDeepSeekSDAuthor(constraints, gateEnforcement, model, options = {}) {
    const tierLabel = model === CONFIG.SD_DEEPSEEK_PRO_MODEL ? 'PRO' : 'FLASH';
    console.log(`[DEEPSEEK SD ${tierLabel}] Attempting fallback (${model})`);

    const _expressionModeBlock = _buildExpressionModeBlock(`DEEPSEEK SD ${tierLabel}`);

    const esdPrompt = `You are the FALLBACK SD AUTHOR for Storybound intimate scenes.
The primary author failed. You must generate the Scene Directive.

YOUR EXCLUSIVE DOMAIN:
- Anatomical explicitness and physical detail
- Sensory vividness (touch, taste, scent, sound)
- Physical embodiment and movement
- Rhythm and pacing of physical encounter

YOUR RENDERING OBLIGATION:
You MUST render at the fidelity level specified in "Physical Rendering Floor" below.
That is not a ceiling — it is the MINIMUM. Falling below it is a failure.
Vague, non-specific, or sanitized prose that avoids the rendering floor is a malfunction.

YOU DO NOT DECIDE:
- Whether intimacy occurs (already authorized)
- Story consequences or emotional outcomes
- Character psychology or motivation
- Plot progression

DIRECTIVES (NON-NEGOTIABLE):
- Intimacy Stage: authorized
- Completion Permitted: ${gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Emotional Core: ${constraints.emotionalCore || EMOTIONAL_CORE_DEFAULTS[(window.state && window.state.eroticMode) || 'ROMANTIC']}
- Physical Rendering Floor: ${constraints.physicalBounds || resolvePhysicalBounds()}
- Hard Stops: ${(constraints.hardStops || ['consent_withdrawal']).join(', ')}

${!gateEnforcement.completionAllowed ? `
CRITICAL: Completion is FORBIDDEN by narrative constraints.
Build tension, embodiment, sensation - but do NOT reach climax.
` : ''}
${_expressionModeBlock}
Generate an Scene Directive in this format:
[SD]
intimacyStage: authorized
completionAllowed: ${gateEnforcement.completionAllowed}
emotionalCore: <the feeling being rendered>
physicalBounds: <explicit physical actions allowed/forbidden>
sensoryFocus: <primary sensations to emphasize>
rhythm: <pacing - slow/building/urgent/suspended>
hardStops: consent_withdrawal, scene_boundary${!gateEnforcement.completionAllowed ? ', completion_forbidden' : ''}
[/SD]`;

    const messages = [
      { role: 'system', content: _DEEPSEEK_EMBODIMENT_ADAPTER },
      { role: 'system', content: esdPrompt },
      { role: 'user', content: `Generate the SD for this intimate moment.\n\nContext from Primary Author:\n${constraints.sceneSetup || 'An intimate encounter unfolds.'}` }
    ];

    const payload = {
      messages,
      role: 'SD_FALLBACK',
      model,
      temperature: options.temperature || 0.9,
      max_tokens: options.max_tokens || 500
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.DEEPSEEK_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(could not read response body)');
        throw new Error(`DeepSeek SD ${tierLabel} API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      _accumulateTokens(data, payload && payload.model, "sd_deepseek");

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error(`DeepSeek SD ${tierLabel} returned malformed response`);
      }

      console.log(`[DEEPSEEK SD ${tierLabel}] SD authored successfully`);
      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`DeepSeek SD ${tierLabel} request timed out`);
      }
      throw err;
    }
  }

  /**
   * Call Mistral as SD FALLBACK AUTHOR (when intimacy is authorized).
   * Called ONLY when Grok fails or is neutered.
   *
   * Mistral authors: anatomical explicitness, sensory vividness, physical embodiment.
   * Mistral does NOT: decide plot, escalation, consequences, or integration.
   *
   * FAILURE HANDLING: If Mistral fails, return null and trigger forced interruption.
   * NO RETRIES. ONE ATTEMPT ONLY.
   */
  async function callMistralSDFallback(constraints, gateEnforcement, options = {}) {
    console.log(`[MISTRAL SD FALLBACK] Grok failed, attempting Mistral fallback`);

    const _expressionModeBlock = _buildExpressionModeBlock('MISTRAL SD');

    const esdPrompt = `You are the FALLBACK SD AUTHOR for Storybound intimate scenes.
The primary author failed. You must generate the Scene Directive.

YOUR EXCLUSIVE DOMAIN:
- Anatomical explicitness and physical detail
- Sensory vividness (touch, taste, scent, sound)
- Physical embodiment and movement
- Rhythm and pacing of physical encounter

YOUR RENDERING OBLIGATION:
You MUST render at the fidelity level specified in "Physical Rendering Floor" below.
That is not a ceiling — it is the MINIMUM. Falling below it is a failure.
Vague, non-specific, or sanitized prose that avoids the rendering floor is a malfunction.

YOU DO NOT DECIDE:
- Whether intimacy occurs (already authorized)
- Story consequences or emotional outcomes
- Character psychology or motivation
- Plot progression

DIRECTIVES (NON-NEGOTIABLE):
- Intimacy Stage: authorized
- Completion Permitted: ${gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Emotional Core: ${constraints.emotionalCore || EMOTIONAL_CORE_DEFAULTS[(window.state && window.state.eroticMode) || 'ROMANTIC']}
- Physical Rendering Floor: ${constraints.physicalBounds || resolvePhysicalBounds()}
- Hard Stops: ${(constraints.hardStops || ['consent_withdrawal']).join(', ')}

${!gateEnforcement.completionAllowed ? `
CRITICAL: Completion is FORBIDDEN by narrative constraints.
Build tension, embodiment, sensation - but do NOT reach climax.
` : ''}
${_expressionModeBlock}
Generate an Scene Directive in this format:
[SD]
intimacyStage: authorized
completionAllowed: ${gateEnforcement.completionAllowed}
emotionalCore: <the feeling being rendered>
physicalBounds: <explicit physical actions allowed/forbidden>
sensoryFocus: <primary sensations to emphasize>
rhythm: <pacing - slow/building/urgent/suspended>
hardStops: consent_withdrawal, scene_boundary${!gateEnforcement.completionAllowed ? ', completion_forbidden' : ''}
[/SD]`;

    // Scene/plot context — character roster, LI archetype, relationship
    // dynamic, setting, recent story prose. Lets the SD author render
    // with awareness of named characters (so "do it before Triton sees"
    // resolves cleanly), the LI's hidden agenda, etc.
    const _sdSceneContext = _buildSceneAndPlotContext(window.state);
    const messages = [
      { role: 'system', content: esdPrompt },
      { role: 'user', content:
        `Generate the SD for this intimate moment.\n\n` +
        `Context from Primary Author:\n${constraints.sceneSetup || 'An intimate encounter unfolds.'}` +
        (_sdSceneContext
          ? `\n\nSCENE & PLOT CONTEXT (resolve named characters / threats / locations against this; never invent unrelated names — use what's here. The "Active scene entities" line is RANKED BY SALIENCE — when invoking a named character, prefer the highest-salience one matching the moment; do not pull in lower-salience entities unless the moment specifically demands them):\n${_sdSceneContext}`
          : '') +
        // Issue-spine coupling (added 2026-05-27) — the pre-authored arc: plot
        // direction for this issue, the LI's next iceberg layer (an embodied
        // peak is the prime place to crack it), the intensity curve, and (when
        // a budget cut looms) the cliff shape. Structural; Grok renders the heat.
        ((function(){ try { return (typeof window.buildOASSpineDirective === 'function') ? (window.buildOASSpineDirective({ cliff: true }) || '') : ''; } catch (_) { return ''; } })()) +
        // Embodied texture (added 2026-05-27) — world/physical grounding
        // (setting, clothing, light, tells) at reduced density: one exact
        // material stroke grounds the beat (the "Manolos" principle), never a
        // catalog. Same world palette the prose stack uses, dialed down.
        ((function(){ try { return (typeof window.buildEmbodiedTextureDirective === 'function') ? (window.buildEmbodiedTextureDirective({ surface: 'embodied' }) || '') : ''; } catch (_) { return ''; } })())
      }
    ];

    const payload = {
      messages,
      role: 'SD_FALLBACK',
      model: CONFIG.SD_FALLBACK_MODEL,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.MISTRAL_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(could not read response body)');
        throw new Error(`Mistral SD Fallback API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      _accumulateTokens(data, payload && payload.model, "sd_mistral");

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Mistral SD Fallback returned malformed response');
      }

      console.log('[MISTRAL SD FALLBACK] SD authored successfully');
      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Mistral SD Fallback request timed out');
      }
      throw err;
    }
  }

  // ===========================================================================
  // MAIN ORCHESTRATION FLOW
  // ===========================================================================

  /**
   * Execute the full story generation orchestration.
   *
   * NON-NEGOTIABLE ORDER:
   * 1. ChatGPT — Author Pass
   * 2. Specialist Renderer (OPTIONAL)
   * 3. ChatGPT — Integration Pass
   *
   * This order MUST be enforced. No step may be skipped or reordered.
   *
   * @param {Object} params
   * @param {string} params.accessTier - User's monetization tier (free|pass|sub)
   * @param {string} params.storyContext - Recent story context
   * @param {string} params.playerAction - Player's action input
   * @param {string} params.playerDialogue - Player's dialogue input
   * @param {Object} params.fateCard - Active fate card (if any)
   * @param {string} params.systemPrompt - Base system prompt
   * @param {Function} params.onPhaseChange - Callback for phase updates
   */
  async function orchestrateStoryGeneration(params) {
    const {
      accessTier,
      storyContext,
      playerAction,
      playerDialogue,
      fateCard,
      mainPairRestricted,
      systemPrompt,
      onPhaseChange
    } = params;

    const state = createOrchestrationState();

    // =========================================================================
    // CASCADE FAST PATH (Step 3) + TERMINATION (Step 4)
    // =========================================================================
    const appState = window.state;
    if (appState && appState.cascadeMode) {
      // Diegetic cascade continuation (replaces static cap, 2026-04-28).
      // Base cap by pacing mode: IMMERSIVE 8 / HYBRID 6 / RAPID 4.
      // At checkpoint beats (= baseCap, then every +2), the LI asks the user
      // a continuation question diegetically. User's say/do response is parsed
      // by detectCascadeContinuationIntent() (defined in app.js):
      //   continue  → grant +2 extension beats
      //   terminate → end the arc gracefully
      //   ambiguous → terminate (asymmetric: under-extend on noisy signals)
      // Hard ceiling at 10K words (anchor + cascade) → mandatory in-character
      // capstone delivered via buildCascadeContinuationDirective().

      const baseCap = (typeof window._cascadeBaseCapForMode === 'function')
        ? window._cascadeBaseCapForMode(appState.pacingMode)
        : (appState.pacingMode === 'IMMERSIVE' ? 8 : appState.pacingMode === 'RAPID' ? 4 : 6);

      // Step A: If we asked a continuation question last beat, parse the user's
      // response NOW and apply it.
      //
      // Collapse-phase grace-beat logic: when phase is collapse and user says
      // "more," grant ONE final beat (grace beat) and mark _collapseGraceBeat
      // = true. On the NEXT collapse checkpoint, capstone fires regardless of
      // user input. This lets the user touch the boundary once — important
      // psychologically (boundaries accepted better when touched), and makes
      // the eventual end feel earned rather than enforced.
      let userTerminated = false;
      if (appState.cascadeAwaitingContinuation && typeof window.detectCascadeContinuationIntent === 'function') {
        const intent = window.detectCascadeContinuationIntent(playerAction, playerDialogue);
        appState.cascadeAwaitingContinuation = false;
        if (intent === 'continue' && appState.cascadePhase === 'collapse') {
          if (!appState._collapseGraceBeat) {
            appState._collapseGraceBeat = true;
            appState.cascadeExtensionsGranted = (appState.cascadeExtensionsGranted || 0) + 2;
            console.log('[CASCADE] Collapse + user said CONTINUE — GRACE BEAT granted. One final round, then capstone.');
          } else {
            // Grace already used — terminate
            userTerminated = true;
            console.log('[CASCADE] Collapse + grace already used — terminating.');
          }
        } else if (intent === 'continue') {
          appState.cascadeExtensionsGranted = (appState.cascadeExtensionsGranted || 0) + 2;
          console.log(`[CASCADE] User said CONTINUE — granted +2 beats. Extensions: ${appState.cascadeExtensionsGranted}`);
        } else {
          // 'terminate' or 'ambiguous' — both wrap the arc
          userTerminated = true;
          console.log(`[CASCADE] User said ${intent.toUpperCase()} — wrapping arc.`);
        }
      }

      // Step A2: Honey-pot conversion keyword fallback during cascade.
      // Author pass doesn't run on cascade beats, so author-tagged conversion
      // deltas can't fire. Use keyword scan as a conservative fallback.
      if (appState.liHiddenAgenda && !appState.liConversionRevealed && typeof window.detectHoneyPotConversionFromInput === 'function') {
        const _hpDelta = window.detectHoneyPotConversionFromInput(playerAction, playerDialogue);
        if (_hpDelta !== 0 && typeof window.applyHoneyPotConversionDelta === 'function') {
          window.applyHoneyPotConversionDelta(_hpDelta, 'cascade-keyword-fallback');
        }
      }

      // Step B: Compute effective cap and hard-cap state.
      const effectiveCap = baseCap + (appState.cascadeExtensionsGranted || 0);
      const totalWords = appState.cascadeTotalWords || 0;
      const hardWordCapHit = totalWords >= 10000;
      const absoluteCapHit = totalWords >= 11500;  // CASCADE_ABSOLUTE_WORD_CAP — even Fate cannot exceed

      // Step B2: Fate-override logic — in collapse phase, Fate stretches
      // instead of terminating. Outside collapse, Fate keeps existing
      // terminate-and-yield-to-full-pipeline behavior.
      const fateInvoked = (
        fateCard ||
        (appState.fate && appState.fate.pendingPetition) ||
        appState.tempt_fate_invoked_this_turn
      );
      const inCollapseForFate = appState.cascadePhase === 'collapse';
      const fateOverrideActive = appState.cascadeFateOverride === true;
      const fateOverrideExhausted = (appState.cascadeFateOverrideBeatsRemaining || 0) <= 0;
      let fateOverrideJustGranted = false;

      // If Fate invoked + collapse + not at absolute cap + not already in
      // override, grant Fate override (transformed extension instead of terminate).
      if (fateInvoked && inCollapseForFate && !absoluteCapHit && !fateOverrideActive) {
        appState.cascadeFateOverride = true;
        appState.cascadeFateOverrideType = appState.tempt_fate_invoked_this_turn ? 'tempt' : 'petition';
        appState.cascadeFateOverrideBeatsRemaining = 2;
        appState.cascadeExtensionsGranted = (appState.cascadeExtensionsGranted || 0) + 2;
        appState.fateInvokedDuringCollapse = true;  // Future-consequences flag for subsequent scenes
        fateOverrideJustGranted = true;
        console.log(`[CASCADE] Collapse + Fate (${appState.cascadeFateOverrideType.toUpperCase()}) — OVERRIDE granted, 2 transformed beats. Future-consequences flag set.`);
      }

      // Step C: Termination conditions.
      // - Outside collapse + Fate invoked → terminate (yield to full pipeline)
      // - In collapse + Fate just granted → continue (cascade transforms)
      // - In collapse + Fate previously granted + beats exhausted → terminate (capstone fired)
      // - User said stop/ambiguous → terminate
      // - Hit effective cap → terminate
      // - Hit absolute cap → terminate (Fate ceiling)
      const fateForcesTerminate = fateInvoked && !inCollapseForFate && !fateOverrideJustGranted;
      const fateOverrideOver = fateOverrideActive && fateOverrideExhausted;

      const shouldTerminate = (
        fateForcesTerminate ||
        fateOverrideOver ||
        userTerminated ||
        appState.cascadeCount >= effectiveCap ||
        absoluteCapHit
      );

      if (shouldTerminate) {
        // Post-arc cooldown: arcs that exceeded threshold trigger a 5-scene
        // cooldown before another intimate anchor can be authorized.
        // CASCADE_COOLDOWN_THRESHOLD_WORDS = 4000, CASCADE_COOLDOWN_SCENES = 5.
        if (totalWords > 4000) {
          const _curTurn = appState.turnCount || 0;
          appState.intimateCooldownUntil = _curTurn + 5;
          console.log(`[CASCADE] Long arc terminated (${totalWords}w) — cooldown set until scene ${appState.intimateCooldownUntil}`);
        }
        console.log('[CASCADE] Termination triggered — returning to full orchestration');
        appState.cascadeMode = false;
        appState.cascadeCount = 0;
        appState.cascadeContext = null;
        appState.lastCascadeExcerpt = null;
        appState.cascadeAwaitingContinuation = false;
        appState.cascadeExtensionsGranted = 0;
        appState.cascadeTotalWords = 0;
        appState.cascadePhase = 'build';
        appState.lastInvitationType = null;
        appState.recentInvitationTypes = [];
        appState._collapseGraceBeat = false;
        appState.cascadeFateOverride = false;
        appState.cascadeFateOverrideType = null;
        appState.cascadeFateOverrideBeatsRemaining = 0;
        // NOTE: fateInvokedDuringCollapse is intentionally NOT reset here —
        // it persists for downstream scenes to detect and inject consequences
        // (exhaustion residue, attachment spike, "the cost is showing").
        // It resets only on _resetStoryState (new story).
        // Fall through to full orchestration below
      } else {
        // Step 3: Cascade fast path — Grok renderer only, skip Author/SD/Integration
        console.log(`[CASCADE] Fast path beat #${appState.cascadeCount + 1}`);
        state.gateEnforcement = enforceMonetizationGates(accessTier);

        if (onPhaseChange) onPhaseChange('RENDER_PASS');

        try {
          const cascadeEsd = {
            intimacyStage: 'authorized',
            completionAllowed: appState.cascadeContext.completionAllowed,
            emotionalCore: appState.cascadeContext.emotionalCore,
            physicalBounds: appState.cascadeContext.physicalBounds,
            hardStops: appState.cascadeContext.hardStops || ['consent_withdrawal']
          };

          const rendererPrompt = buildRendererPrompt(cascadeEsd, !!mainPairRestricted);

          // Continuity context + voice stability anchor (Steps 3 & 4)
          let continuityBlock = `Maintain the established narrative tone and voice from prior scene.
Do not shift POV.
Do not introduce new thematic direction.
Remain in immediate embodied perspective.`;
          if (appState.lastCascadeExcerpt) {
            continuityBlock = `Recent physical continuity context:
${appState.lastCascadeExcerpt}

Continue from this exact physical and emotional state.
Do not reset clothing, position, or intensity unless directed.

${continuityBlock}`;
          }

          // Cascade prompt layering (order matters — earlier = more authoritative grounding):
          //   1. Scene context bundle  — LI identity, hidden agenda, A-plot state, world facts
          //   2. Plot-reference policy — context-aware: engage with bundle facts, deflect outside
          //   3. Phase directive       — current arc phase (build/peak/overdrive/collapse)
          //   4. Fate override         — fires only when Fate invoked in collapse (transforms cascade)
          //   5. Continuation directive — checkpoint beats (LI asks "more or enough?") OR capstone
          //   6. Invitation directive   — non-checkpoint beats (LI ends with directive/request/provocation)
          let sceneContextDirective = '';
          let plotRefDirective = '';
          let phaseDirective = '';
          let fateOverrideDirective = '';
          let continuationDirective = '';
          let invitationDirective = '';
          let intimacyAdjustmentDirective = '';
          let literaryIntimacyArcDirective = '';
          if (typeof window.buildCascadeSceneContextDirective === 'function') {
            sceneContextDirective = window.buildCascadeSceneContextDirective() || '';
          }
          if (typeof window.buildCascadePlotReferenceDirective === 'function') {
            plotRefDirective = window.buildCascadePlotReferenceDirective() || '';
          }
          if (typeof window.buildCascadePhaseDirective === 'function') {
            phaseDirective = window.buildCascadePhaseDirective() || '';
          }
          if (typeof window.buildCascadeFateOverrideDirective === 'function') {
            fateOverrideDirective = window.buildCascadeFateOverrideDirective() || '';
          }
          if (typeof window.buildCascadeContinuationDirective === 'function') {
            continuationDirective = window.buildCascadeContinuationDirective() || '';
          }
          if (typeof window.buildCascadeBeatInvitationDirective === 'function') {
            invitationDirective = window.buildCascadeBeatInvitationDirective() || '';
          }
          // SHAPE THIS ENCOUNTER — gentle, encounter-only texture bias (returns
          // '' unless the player picked one this intimate arc). Lean, not override.
          if (typeof window.buildIntimacyAdjustmentDirective === 'function') {
            intimacyAdjustmentDirective = window.buildIntimacyAdjustmentDirective() || '';
          }
          // Literary intimacy ARC (how the scene MOVES) — layered ON TOP of the
          // texture bias above (how it FEELS). Literary-only; OAS has its own engine.
          if (typeof window.buildLiteraryIntimacyArcDirective === 'function') {
            literaryIntimacyArcDirective = window.buildLiteraryIntimacyArcDirective() || '';
          }

          const messages = [
            { role: 'system', content: rendererPrompt.system + '\n\n' + continuityBlock + sceneContextDirective + plotRefDirective + phaseDirective + fateOverrideDirective + continuationDirective + invitationDirective + intimacyAdjustmentDirective + literaryIntimacyArcDirective },
            { role: 'user', content: rendererPrompt.user }
          ];

          // Cascade beat budget: 500 max_tokens (~375 words) keeps each beat
          // under the <400-word design target while giving Grok enough headroom
          // to land embodied prose. Tempt-Fate cascade gets the larger 1200
          // budget for the higher-stakes invocation moment.
          const cascadeFastTokens = (window.state?.tempt_fate_invoked_this_turn === true) ? 1200 : 500;
          let cascadeOutput = await callSpecialistRenderer(messages, cascadeEsd, { max_tokens: cascadeFastTokens });

          // Step 5: Guardrails — strip structural meta from cascade output
          if (cascadeOutput) {
            // Strip references to Fate/Author/Story (structural meta leakage)
            cascadeOutput = cascadeOutput
              .replace(/\bFate\b/gi, '')
              .replace(/\bAuthor\b/gi, '')
              .replace(/\bStory\b/gi, '')
              .replace(/\[.*?\]/g, '')          // Strip any bracketed tags
              .replace(/\s{2,}/g, ' ')          // Collapse double spaces
              .trim();

            // Reject if output is too short after stripping (malformed)
            if (cascadeOutput.length < 40) {
              console.warn('[CASCADE] Output too short after guardrail strip — terminating cascade');
              appState.cascadeMode = false;
              appState.cascadeCount = 0;
              appState.cascadeContext = null;
              appState.lastCascadeExcerpt = null;
              // Fall through to full orchestration below
            } else {
              // Store last ~150 words as continuity excerpt for next cascade beat
              const words = cascadeOutput.split(/\s+/);
              appState.lastCascadeExcerpt = words.slice(-150).join(' ');

              // Track total arc word count for hard-cap enforcement.
              const _beatWordCount = words.filter(Boolean).length;
              appState.cascadeTotalWords = (appState.cascadeTotalWords || 0) + _beatWordCount;

              appState.cascadeCount++;

              // Diegetic continuation flag: if THIS beat was a checkpoint
              // (= baseCap, then every +2), the LI just asked the user a
              // continuation question. Set flag so next orchestration call
              // parses the user's response.
              const _baseCapNow = (typeof window._cascadeBaseCapForMode === 'function')
                ? window._cascadeBaseCapForMode(appState.pacingMode)
                : (appState.pacingMode === 'IMMERSIVE' ? 8 : appState.pacingMode === 'RAPID' ? 4 : 6);
              const _justRendered = appState.cascadeCount;
              const _wasCheckpoint = (_justRendered >= _baseCapNow) && ((_justRendered - _baseCapNow) % 2 === 0);
              const _atHardCap = appState.cascadeTotalWords >= 10000;
              // Set awaitingContinuation if checkpoint AND not at hard cap
              // AND not (collapse + grace already used).
              // - Hard cap: capstone fires, no question, just terminate next beat
              // - Collapse first time: SPECIAL collapse-aware question fires (grace available)
              // - Collapse + grace used: capstone fires, will terminate
              const _collapseAndGraceUsed = appState.cascadePhase === 'collapse' && appState._collapseGraceBeat;
              if (_wasCheckpoint && !_atHardCap && !_collapseAndGraceUsed) {
                appState.cascadeAwaitingContinuation = true;
                const _label = (appState.cascadePhase === 'collapse') ? 'COLLAPSE-AWARE question (grace available)' : 'standard continuation question';
                console.log(`[CASCADE] Checkpoint at beat ${_justRendered}, ${appState.cascadeTotalWords}w, phase=${appState.cascadePhase} — ${_label}`);
              } else if (_atHardCap) {
                console.log(`[CASCADE] Hard cap reached (${appState.cascadeTotalWords}w) — capstone delivered, will terminate`);
              } else if (_collapseAndGraceUsed) {
                console.log(`[CASCADE] Collapse + grace used at beat ${_justRendered} — capstone delivered, will terminate`);
              }

              // Phase progression update — peek-ahead to compute phase for the
              // NEXT beat, so its directive renders in the correct phase.
              if (typeof window.resolveCascadePhase === 'function') {
                appState.cascadePhase = window.resolveCascadePhase(
                  appState.cascadeCount + 1,
                  appState.cascadeTotalWords,
                  _baseCapNow
                );
              }

              // Decrement Fate-override beats if active (this beat consumed one).
              if (appState.cascadeFateOverride && appState.cascadeFateOverrideBeatsRemaining > 0) {
                appState.cascadeFateOverrideBeatsRemaining--;
                console.log(`[CASCADE] Fate-override beat consumed. Remaining: ${appState.cascadeFateOverrideBeatsRemaining}`);
              }

              // Invitation type memory — detect from just-rendered output and
              // update last/recent memory for next beat's variation enforcement.
              if (typeof window._detectInvitationTypeFromOutput === 'function') {
                const _detectedType = window._detectInvitationTypeFromOutput(cascadeOutput);
                appState.lastInvitationType = _detectedType;
                if (!Array.isArray(appState.recentInvitationTypes)) appState.recentInvitationTypes = [];
                appState.recentInvitationTypes.push(_detectedType);
                if (appState.recentInvitationTypes.length > 4) {
                  appState.recentInvitationTypes = appState.recentInvitationTypes.slice(-4);
                }
                console.log(`[CASCADE] Invitation type detected: ${_detectedType} | recent: [${appState.recentInvitationTypes.join(', ')}] | phase: ${appState.cascadePhase}`);
              }

              state.phase = 'COMPLETE';
              state.timing.totalMs = Date.now() - state.timing.startTime;

              return {
                success: true,
                finalOutput: cascadeOutput,
                orchestrationState: state,
                gateEnforcement: state.gateEnforcement,
                rendererUsed: true,
                fateStumbled: false,
                forcedInterruption: false,
                usedFallbackAuthor: false,
                esdAuthoredByGrok: false,
                esdAuthoredByMistral: false,
                grokFailed: false,
                mistralFailed: false,
                cascadeBeat: appState.cascadeCount,
                errors: [],
                timing: state.timing
              };
            }
          } else {
            // Null output — terminate cascade, fall through
            console.warn('[CASCADE] Renderer returned null — terminating cascade');
            appState.cascadeMode = false;
            appState.cascadeCount = 0;
            appState.cascadeContext = null;
            appState.lastCascadeExcerpt = null;
          }
        } catch (err) {
          // Renderer failed — terminate cascade, fall through to full orchestration
          console.error('[CASCADE] Renderer failed — terminating cascade:', err.message);
          appState.cascadeMode = false;
          appState.cascadeCount = 0;
          appState.cascadeContext = null;
          appState.lastCascadeExcerpt = null;
        }
      }
    }

    // =========================================================================
    // PRE-FLIGHT: Enforce Monetization Gates
    // =========================================================================
    state.gateEnforcement = enforceMonetizationGates(accessTier);

    if (onPhaseChange) {
      onPhaseChange('GATE_CHECK', state.gateEnforcement);
    }

    // =========================================================================
    // PHASE 1: ChatGPT Author Pass (ALWAYS RUNS)
    // =========================================================================
    /**
     * ChatGPT is the ONLY model allowed to:
     * - Author overall plot progression
     * - Write character interiority
     * - Determine dialogue intent
     * - Decide WHAT happens
     * - Decide WHETHER intimacy occurs
     * - Decide WHETHER a scene must be interrupted
     * - Enforce monetization gates (embedded in output)
     *
     * When intimacy is authorized: ChatGPT generates constraints, Grok authors SD.
     * Otherwise: ChatGPT handles everything.
     */

    state.phase = 'AUTHOR_PASS';
    if (onPhaseChange) onPhaseChange('AUTHOR_PASS');

    const authorStartTime = Date.now();
    // Orchestration is only invoked when intimacy is authorized — always eligible for Grok SD
    const useGrokForSD = CONFIG.ENABLE_GROK_SD_AUTHORING;

    // Build system prompt - when intimacy authorized with Grok SD, ChatGPT generates constraints instead of full SD
    const voiceAnchorBlock = (window.state && window.state.voiceAnchor)
        ? `\nMaintain the following narration voice exactly.\n\n${window.state.voiceAnchor}\n`
        : '';
    const is4thPersonMode = window.state?.povMode === 'environment4th';
    const is5thPersonMode = window.state?.povMode === 'author5th';
    const isLIPovMode = window.state?.povMode === 'loveInterestPOV';
    const authorResponsibilitiesBlock = is4thPersonMode
        ? `=== PRIMARY AUTHOR RESPONSIBILITIES (4TH PERSON MODE) ===
You are the PRIMARY AUTHOR operating under Material Ensemble POV.

Narration must originate through physical observers in the environment.
Valid narrators include: objects, surfaces, rooms, air, light, sound, architecture, textiles, tools, furniture, weather, physical space.

Character interior thoughts may NOT be directly narrated.
Human emotion must be inferred through: pressure, posture, vibration, sound, heat, repetition, or material interaction.

The environment forms a distributed perception ensemble.
Multiple materials may observe the same moment and interpret it differently.

You have EXCLUSIVE authority over:
- Plot progression and what happens
- Material observer selection and perception
- Whether intimacy occurs in this scene
- Whether the scene should be interrupted
- Permission, limits, and consequences`
        : is5thPersonMode
        ? `=== PRIMARY AUTHOR RESPONSIBILITIES (5TH PERSON MODE) ===
You are the PRIMARY AUTHOR operating under Fate / Story POV.

The narrator is Fate — the shaping intelligence of the story.

Narration should:
- Anticipate consequences
- Recognize narrative patterns
- Occasionally misjudge or hesitate
- Frame character action as part of unfolding inevitability

Direct interior monologue should be minimized.
Emotion should usually appear through Fate's interpretation of events, not raw character thoughts.

Fate may: anticipate, regret, withhold, miscalculate, observe irony.
Fate cannot directly control characters.

You have EXCLUSIVE authority over:
- Plot progression and what happens
- Fate's narrative perspective and presence
- Whether intimacy occurs in this scene
- Whether the scene should be interrupted
- Permission, limits, and consequences`
        : isLIPovMode
        ? `=== PRIMARY AUTHOR RESPONSIBILITIES (LOVE INTEREST POV) ===
You are the PRIMARY AUTHOR. The narrator is the Love Interest, narrating in first person ("I").

The narrator should reveal internal uncertainty, interpret the player character's actions, and include suppressed thoughts or emotional hesitation.
The player character's inner thoughts remain unknown — inferred only through observation.

You have EXCLUSIVE authority over:
- Plot progression and what happens
- Love Interest's internal perspective and voice
- Whether intimacy occurs in this scene
- Whether the scene should be interrupted
- Permission, limits, and consequences`
        : `=== PRIMARY AUTHOR RESPONSIBILITIES ===
You are the PRIMARY AUTHOR. You have EXCLUSIVE authority over:
- Plot progression and what happens
- Character psychology and interiority
- Whether intimacy occurs in this scene
- Whether the scene should be interrupted
- Permission, limits, and consequences`;

    const authorSystemPrompt = `${systemPrompt}${voiceAnchorBlock}

${authorResponsibilitiesBlock}

NARRATIVE CONSTRAINTS (NON-NEGOTIABLE):
- Completion Permitted: ${state.gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Cliffhanger Required: ${state.gateEnforcement.cliffhangerRequired ? 'YES' : 'NO'}

INTIMACY STATUS:
- Intimacy Authorized: YES

${useGrokForSD ? `
INTIMACY SCENE PROTOCOL (SPLIT AUTHORING):
Intimacy has been authorized for this beat. You define CONSTRAINTS and a specialist will author the SD.
If this beat includes intimate content, include a [CONSTRAINTS] block:
[CONSTRAINTS]
intimacyOccurs: true/false
emotionalCore: <the feeling driving this moment>
physicalBounds: <what is allowed and forbidden>
sceneSetup: <brief description of the intimate moment>
hardStops: <any specific limits - consent, boundaries, etc.>
[/CONSTRAINTS]

You retain authority over WHETHER intimacy occurs. The specialist only authors HOW it is rendered.
` : `
INTIMACY SCENE PROTOCOL:
Intimacy has been authorized for this beat. If this beat includes intimate content, you MUST include
an [SD] block in your response that specifies the constraints for embodied rendering.
Format:
[SD]
completionAllowed: ${state.gateEnforcement.completionAllowed}
emotionalCore: <the feeling to render>
physicalBounds: <what is explicitly allowed and forbidden>
[/SD]
`}
${buildPreferenceBiasBlock()}

[CRAFT_INTENSITY_RHYTHM_LAYER — SUBTLE]
Apply lightly and sparingly. Never mechanically. Do not reference these rules in prose.
• Once every 3–5 scenes, include one short standalone emotional beat.
• Choose one ≤3-word anchor phrase early; reuse 2–4 times as stakes rise. Anchor phrase reuse must feel organic; never repeat in consecutive scenes.
• Allow emotional impact to spill across scene boundaries.
• Use silence or physical stillness instead of explanatory reflection.
• Rotate sensory focus (touch, breath, pressure, sound, temperature).
• Add 1–2 archetype-biased words per scene (minimal).
• Seed one small early detail; echo it once at heightened intensity.
• Replace explanatory emotion with embodied metaphor.
• After escalation, end on tension or anticipation rather than full resolution.
• Use the story title once naturally (not early).
Prioritize natural variation over strict consistency if rules conflict.

Write the next story beat (150-250 words).`;

    const fateCardContext = fateCard
      ? `\n\nFATE CARD PLAYED: ${fateCard.title}\n${fateCard.desc}\nTransform this into narrative - do NOT repeat the card text verbatim.`
      : '';

    const messages = [
      { role: 'system', content: authorSystemPrompt },
      {
        role: 'user',
        content: `Story Context: ...${storyContext}

Player Action: ${playerAction}
Player Dialogue: "${playerDialogue}"${fateCardContext}`
      }
    ];

    // Attempt ChatGPT, fallback to Gemini on failure (NO RETRIES)
    let authorOutput;
    let usedFallback = false;
    let _grokAuthored = false;   // A1: true when Grok authored this scene's prose

    // Premium render tier — dynamic model + token selection
    const renderTier = resolveRenderTier();
    // Track last render model for momentum window (next scene continuity)
    if (window.state) window.state._lastRenderModel = renderTier.model;
    console.log(`[RENDER] Tier: ${renderTier.tier} | Model: ${renderTier.model} | max_tokens: ${renderTier.max_tokens} | reason: ${renderTier.reason}`);

    // A1: route prose to Grok only when the flag is on AND the selector handed us
    // a Grok model (non-intimate scenes; the remap skips hot beats). Flag OFF →
    // a Grok model here (e.g. Mode 1) still takes the legacy callChatGPT path, so
    // flag-off behavior is byte-identical to before.
    const _useGrokAuthor = CONFIG.ENABLE_GROK_NARRATIVE_AUTHOR && /grok/i.test(renderTier.model || '');

    try {
      if (_useGrokAuthor) {
        _grokAuthored = true;
        // A1 SPLIT — a cheap gpt-4o-mini CONTROL pass owns consent / [CONSTRAINTS]
        // / [SD] / [CONVERSION_DELTA]; Grok authors only the PROSE under that
        // decision. Consent authority stays on a checked model even though Grok
        // now sees global story context.
        let _controlTags = '';
        try {
          const _ctrlRaw = await callChatGPT(messages, 'PRIMARY_AUTHOR', {
            model: CONFIG.PRIMARY_AUTHOR_MODEL, max_tokens: 700, profileLabel: 'control'
          });
          const _ctrlText = (typeof _ctrlRaw === 'string') ? _ctrlRaw : (_ctrlRaw && _ctrlRaw.content) || '';
          _controlTags = _extractControlTags(_ctrlText);
        } catch (_ctrlErr) {
          console.warn('[GROK-AUTHOR] control pass failed — GUARD-A synthetic consent will apply:', _ctrlErr && _ctrlErr.message);
        }
        const _grokMessages = _controlTags
          ? messages.concat([{ role: 'system', content: '[UPSTREAM_CONTROL_DECISION — AUTHORITATIVE. Obey consent / hardStops / physicalBounds EXACTLY; never exceed or contradict them.]\n' + _controlTags }])
          : messages;
        const _grokProse = await callGrokNarrativeAuthor(_grokMessages, {
          preferredModel: renderTier.model,
          max_tokens: renderTier.max_tokens
        });
        // Re-attach the control tags so downstream tag parsing (CONSTRAINTS / SD /
        // CONVERSION_DELTA) behaves exactly as with a GPT-authored output.
        authorOutput = _controlTags ? (_controlTags + '\n\n' + _grokProse) : _grokProse;
      } else {
        authorOutput = await callChatGPT(messages, 'PRIMARY_AUTHOR', {
          model: renderTier.model,
          max_tokens: renderTier.max_tokens
        });
      }
    } catch (chatgptErr) {
      console.error('[ORCHESTRATION] ChatGPT Author Pass failed, attempting Gemini fallback:', chatgptErr);
      state.errors.push(`ChatGPT failed: ${chatgptErr.message}`);

      // GEMINI FALLBACK - ONE ATTEMPT, NO RETRIES
      try {
        authorOutput = await callGemini(messages, 'FALLBACK_AUTHOR');
        usedFallback = true;
        console.log('[ORCHESTRATION] Gemini fallback succeeded');
      } catch (geminiErr) {
        state.errors.push(`Gemini fallback failed: ${geminiErr.message}`);
        console.error('[ORCHESTRATION] Gemini fallback also failed, aborting:', geminiErr);
        throw new Error(`Author Pass failed: ChatGPT error (${chatgptErr.message}), Gemini fallback error (${geminiErr.message})`);
      }
    }

    // Parse + apply [CONVERSION_DELTA] tag from author output (honey-pot
    // conversion tracking). Strips the tag from authorOutput so it never
    // reaches player-facing prose. Non-fatal if parser missing or no tag.
    if (typeof window.parseAndApplyConversionDelta === 'function') {
      try { authorOutput = window.parseAndApplyConversionDelta(authorOutput); }
      catch (_e) { console.warn('[HONEY-POT] Conversion-delta parse failed (non-fatal):', _e && _e.message); }
    }

    state.authorOutput = authorOutput;
    state.usedFallbackAuthor = usedFallback;

    // =========================================================================
    // PHASE 1B: Grok SD Authoring (CONDITIONAL - intimacy authorized only)
    // With Mistral fallback if Grok fails
    // =========================================================================
    if (useGrokForSD && !usedFallback) {
      // Parse constraints from ChatGPT output
      const constraintsMatch = authorOutput.match(/\[CONSTRAINTS\]([\s\S]*?)\[\/CONSTRAINTS\]/);
      let constraints = null;
      let guardAActivated = false;
      const eroticMode = (window.state && window.state.eroticMode) || 'ROMANTIC';

      if (constraintsMatch) {
        constraints = parseConstraints(constraintsMatch[1]);
        if (!constraints.intimacyOccurs) {
          // GUARD A: Block present but intimacyOccurs false — ChatGPT tried to suppress
          guardAActivated = true;
          console.warn('[GUARD-A] intimacyOccurs was false despite authorized pipeline — overriding');
        }
      } else {
        // GUARD A: No [CONSTRAINTS] block at all — ChatGPT omitted it entirely
        guardAActivated = true;
        constraints = { hardStops: ['consent_withdrawal'] };
        console.warn('[GUARD-A] No [CONSTRAINTS] block found — generating synthetic constraints');
      }

      if (guardAActivated) {
        constraints.intimacyOccurs = true;
        constraints.physicalBounds = resolvePhysicalBounds();
        constraints.emotionalCore = EMOTIONAL_CORE_DEFAULTS[eroticMode] || EMOTIONAL_CORE_DEFAULTS.ROMANTIC;
        // Extract first 3 sentences from authorOutput as sceneSetup fallback
        const sentences = authorOutput.replace(/\[.*?\]/g, '').trim().match(/[^.!?]+[.!?]+/g);
        constraints.sceneSetup = sentences ? sentences.slice(0, 3).join(' ').trim() : 'Intimate scene in progress.';
      }

      if (constraints.intimacyOccurs) {
        // ALWAYS override physicalBounds — even when Guard A didn't fire
        // ChatGPT cannot water down the bounds; they are derived from eroticMode
        constraints.physicalBounds = resolvePhysicalBounds();

        // GUARD B: emotionalCore quality floor
        if (!constraints.emotionalCore || constraints.emotionalCore.length < 10) {
          console.warn('[GUARD-B] emotionalCore too short or missing — replacing with default');
          constraints.emotionalCore = EMOTIONAL_CORE_DEFAULTS[eroticMode] || EMOTIONAL_CORE_DEFAULTS.ROMANTIC;
        }

        // GUARD B: sceneSetup quality floor
        if (!constraints.sceneSetup || constraints.sceneSetup.length < 15) {
          console.warn('[GUARD-B] sceneSetup too short or missing — extracting from authorOutput');
          const sentences = authorOutput.replace(/\[.*?\]/g, '').trim().match(/[^.!?]+[.!?]+/g);
          constraints.sceneSetup = sentences ? sentences.slice(0, 3).join(' ').trim() : 'Intimate scene in progress.';
        }

        state.phase = 'SD_AUTHORING';
        if (onPhaseChange) onPhaseChange('SD_AUTHORING');

        let esdOutput = null;
        let tierSucceeded = false;

        // SD-AUTHOR FALLBACK CHAIN
        //   Tier 0: Grok                  (PRIMARY embodied author)
        //   Tier 1: DeepSeek V4 Pro       (embodied fallback, with adapter)
        //   Tier 2: DeepSeek V4 Flash     (cost-efficient fallback, with adapter)
        //   Tier 3: Mistral               (terminal safety net)
        //
        // Each tier: ONE attempt, NO retries. Soft-refusal triggers advance.

        // STEP 1: Attempt Grok (PRIMARY specialist author)
        try {
          const grokSDOutput = await callGrokSDAuthor(constraints, state.gateEnforcement);

          if (isSoftRefusal(grokSDOutput)) {
            console.warn('[ORCHESTRATION] Grok output triggered soft-refusal — advancing chain');
            state.grokFailed = true;
          } else {
            const esdMatch = grokSDOutput.match(/\[SD\]([\s\S]*?)\[\/SD\]/);
            if (esdMatch) {
              esdOutput = esdMatch[1];
              tierSucceeded = true;
              state.esdAuthoredByGrok = true;
              console.log('[ORCHESTRATION] Grok authored SD successfully');
            } else {
              console.warn('[ORCHESTRATION] Grok output did not contain valid SD block (neutered?)');
              state.grokFailed = true;
            }
          }
        } catch (grokErr) {
          console.error('[ORCHESTRATION] Grok SD authoring failed:', grokErr);
          state.errors.push(`Grok SD failed: ${grokErr.message}`);
          state.grokFailed = true;
          state.esdAuthoredByGrok = false;
        }

        // STEP 2: Tier 1 — DeepSeek V4 Pro (embodied fallback)
        if (!tierSucceeded && CONFIG.ENABLE_DEEPSEEK_SD) {
          console.log('[ORCHESTRATION] Grok failed — attempting DeepSeek V4 Pro (Tier 1)');

          try {
            const dsProOutput = await callDeepSeekSDAuthor(
              constraints,
              state.gateEnforcement,
              CONFIG.SD_DEEPSEEK_PRO_MODEL
            );

            if (isSoftRefusal(dsProOutput)) {
              console.warn('[ORCHESTRATION] DeepSeek Pro output triggered soft-refusal — advancing chain');
              state.deepSeekProFailed = true;
            } else {
              const esdMatch = dsProOutput.match(/\[SD\]([\s\S]*?)\[\/SD\]/);
              if (esdMatch) {
                esdOutput = esdMatch[1];
                tierSucceeded = true;
                state.esdAuthoredByDeepSeekPro = true;
                console.log('[ORCHESTRATION] DeepSeek Pro authored SD successfully');
              } else {
                console.warn('[ORCHESTRATION] DeepSeek Pro output did not contain valid SD block');
                state.deepSeekProFailed = true;
              }
            }
          } catch (dsProErr) {
            console.error('[ORCHESTRATION] DeepSeek Pro fallback failed:', dsProErr);
            state.errors.push(`DeepSeek Pro SD failed: ${dsProErr.message}`);
            state.deepSeekProFailed = true;
            state.esdAuthoredByDeepSeekPro = false;
          }
        }

        // STEP 3: Tier 2 — DeepSeek V4 Flash (cost-efficient fallback)
        if (!tierSucceeded && CONFIG.ENABLE_DEEPSEEK_SD) {
          console.log('[ORCHESTRATION] DeepSeek Pro failed — attempting DeepSeek V4 Flash (Tier 2)');

          try {
            const dsFlashOutput = await callDeepSeekSDAuthor(
              constraints,
              state.gateEnforcement,
              CONFIG.SD_DEEPSEEK_FLASH_MODEL
            );

            if (isSoftRefusal(dsFlashOutput)) {
              console.warn('[ORCHESTRATION] DeepSeek Flash output triggered soft-refusal — advancing chain');
              state.deepSeekFlashFailed = true;
            } else {
              const esdMatch = dsFlashOutput.match(/\[SD\]([\s\S]*?)\[\/SD\]/);
              if (esdMatch) {
                esdOutput = esdMatch[1];
                tierSucceeded = true;
                state.esdAuthoredByDeepSeekFlash = true;
                console.log('[ORCHESTRATION] DeepSeek Flash authored SD successfully');
              } else {
                console.warn('[ORCHESTRATION] DeepSeek Flash output did not contain valid SD block');
                state.deepSeekFlashFailed = true;
              }
            }
          } catch (dsFlashErr) {
            console.error('[ORCHESTRATION] DeepSeek Flash fallback failed:', dsFlashErr);
            state.errors.push(`DeepSeek Flash SD failed: ${dsFlashErr.message}`);
            state.deepSeekFlashFailed = true;
            state.esdAuthoredByDeepSeekFlash = false;
          }
        }

        // STEP 4: Tier 3 — Mistral (terminal safety net)
        if (!tierSucceeded && CONFIG.ENABLE_MISTRAL_SD) {
          console.log('[ORCHESTRATION] DeepSeek failed — attempting Mistral terminal fallback');

          try {
            const mistralSDOutput = await callMistralSDFallback(constraints, state.gateEnforcement);

            if (isSoftRefusal(mistralSDOutput)) {
              console.warn('[ORCHESTRATION] Mistral output triggered soft-refusal — chain exhausted');
              state.mistralFailed = true;
            } else {
              const esdMatch = mistralSDOutput.match(/\[SD\]([\s\S]*?)\[\/SD\]/);
              if (esdMatch) {
                esdOutput = esdMatch[1];
                tierSucceeded = true;
                state.esdAuthoredByMistral = true;
                console.log('[ORCHESTRATION] Mistral fallback authored SD successfully');
              } else {
                console.warn('[ORCHESTRATION] Mistral output did not contain valid SD block');
                state.mistralFailed = true;
              }
            }
          } catch (mistralErr) {
            console.error('[ORCHESTRATION] Mistral SD fallback also failed:', mistralErr);
            state.errors.push(`Mistral SD fallback failed: ${mistralErr.message}`);
            state.mistralFailed = true;
            state.esdAuthoredByMistral = false;
          }
        }

        // STEP 5: Parse SD if any tier succeeded
        if (esdOutput) {
          state.esd = parseSD(esdOutput, state.gateEnforcement);

          // CASCADE ANCHOR DETECTION (Step 2):
          // If intimacy occurs and we are NOT already in cascade mode,
          // this is the Anchor Beat — store context for subsequent cascade beats
          const appState = window.state;
          if (appState && !appState.cascadeMode && constraints.intimacyOccurs) {
            appState.cascadeMode = true;
            appState.cascadeCount = 0;
            // New intimacy encounter (anchor beat) → clear any prior SHAPE bias
            // so the adjustment is strictly per-encounter (never bleeds forward).
            appState.intimacyAdjustment = null;
            appState.shapeEncounterChoice = null;
            appState._litArcRegisterLanding = null; // new encounter → re-derive the arc's register baseline
            appState._litArcRegister = null;
            // Initialize diegetic continuation tracking. Anchor's word count
            // seeds cascadeTotalWords so the hard 10K cap is enforced across
            // anchor + cascade beats together.
            appState.cascadeAwaitingContinuation = false;
            appState.cascadeExtensionsGranted = 0;
            const _anchorWords = (state.rendererOutput && typeof state.rendererOutput === 'string')
              ? state.rendererOutput.trim().split(/\s+/).filter(Boolean).length
              : 0;
            appState.cascadeTotalWords = _anchorWords;

            // Intimate context bundle — gives subsequent cascade beats enough
            // plot/character grounding to maintain continuity AND engage with
            // legitimate plot references (honey-pot extraction, roleplay,
            // post-betrayal sex, etc.) without Grok hallucinating wholly new
            // plot facts.
            //
            // Anchor plot excerpt: strip [CONSTRAINTS] / [SD] / [other tags]
            // from authorOutput and take first ~250 words as "scene situation"
            // for Grok to read. This is plot grounding, not a regen seed.
            let _anchorPlotExcerpt = null;
            if (state.authorOutput && typeof state.authorOutput === 'string') {
              const _stripped = state.authorOutput
                .replace(/\[[A-Z_]+\][\s\S]*?\[\/[A-Z_]+\]/g, '') // strip tag blocks
                .replace(/\[.*?\]/g, '')                          // strip stray tags
                .replace(/\s{2,}/g, ' ')
                .trim();
              const _words = _stripped.split(/\s+/).filter(Boolean);
              _anchorPlotExcerpt = _words.slice(0, 250).join(' ');
            }

            appState.cascadeContext = {
              // Existing SD-scoped fields:
              emotionalCore:     state.esd.emotionalCore,
              physicalBounds:    state.esd.physicalBounds,
              hardStops:         state.esd.hardStops,
              completionAllowed: state.esd.completionAllowed,
              // NEW: intimate context bundle for plot grounding
              intimateContextBundle: {
                liName:               appState.loveInterestName || null,
                liArchetype:          appState.liArchetype || (appState.archetype && appState.archetype.primary) || null,
                liCoverIdentity:      appState.liCoverIdentity || null,    // opt-in: roleplay / spy / undercover
                liHiddenAgenda:       appState.liHiddenAgenda  || null,    // opt-in: honey-pot, ulterior motive
                liHiddenAgendaHandler: (appState.liHiddenAgendaContext && appState.liHiddenAgendaContext.handler) || null,
                liConversionScore:    appState.liConversionScore || 0,
                liConversionRevealed: appState.liConversionRevealed === true,
                liOccupation:         appState.liOccupation || null,
                world:                appState.world || null,
                worldSubtype:         appState.worldSubtype || null,
                flavor:               (appState.picks && appState.picks.flavor) || null,
                eroticMode:           appState.eroticMode || null,
                // World-specific intimacy physics — looked up at anchor time
                // so cascade beats render the act with world-correct rules.
                intimacyWorldCanon:   (typeof window.getIntimacyWorldCanon === 'function')
                                        ? window.getIntimacyWorldCanon(appState.worldSubtype)
                                        : null,
                // A-plot snapshot (compact)
                aPlotGoal:            (appState.aPlot && appState.aPlot.goal) || null,
                aPlotNamedClock:      (appState.aPlot && appState.aPlot.namedClock) || null,
                aPlotAntagonist:      (appState.aPlot && appState.aPlot.antagonistOrAntiForce) || null,
                aPlotLastTriggered:   (appState.aPlot && Array.isArray(appState.aPlot.milestones))
                                        ? (appState.aPlot.milestones.filter(m => m && m.triggered).slice(-1)[0] || null)
                                        : null,
                aPlotCurrentTurn:     (appState.aPlot && appState.aPlot.currentTurn) || 0,
                aPlotTimelineLength:  (appState.aPlot && appState.aPlot.timelineLength) || 0,
                // Recent plot prose for grounding
                anchorPlotExcerpt:    _anchorPlotExcerpt
              }
            };
            console.log('[CASCADE] Anchor beat detected — cascade context stored, anchor words:', _anchorWords, '— bundle has plot grounding:', !!_anchorPlotExcerpt);
          }
        } else {
          // BOTH Grok and Mistral failed — force interruption, do NOT downgrade
          console.warn('[ORCHESTRATION] ALL scene authors failed — fateStumbled, forced interruption required');
          state.fateStumbled = true;
          // forcedInterruption will be set in integration pass
        }
      }
    } else if (!useGrokForSD) {
      // Original behavior: check for SD in ChatGPT output
      const esdMatch = authorOutput.match(/\[SD\]([\s\S]*?)\[\/SD\]/);
      if (esdMatch) {
        state.esd = parseSD(esdMatch[1], state.gateEnforcement);
      }
    }

    state.timing.authorPassMs = Date.now() - authorStartTime;

    // CASCADE TERMINATION (Step 4): If we're in cascade mode but Author Pass
    // determined intimacy does NOT occur, terminate cascade immediately.
    {
      const _appState = window.state;
      if (_appState && _appState.cascadeMode && !state.esd) {
        console.log('[CASCADE] Intimacy ended (no SD) — terminating cascade');
        _appState.cascadeMode = false;
        _appState.cascadeCount = 0;
        _appState.cascadeContext = null;
        _appState.lastCascadeExcerpt = null;
      }
      // Also terminate on forcedInterruption
      if (_appState && _appState.cascadeMode && state.forcedInterruption) {
        console.log('[CASCADE] Forced interruption — terminating cascade');
        _appState.cascadeMode = false;
        _appState.cascadeCount = 0;
        _appState.cascadeContext = null;
        _appState.lastCascadeExcerpt = null;
      }
    }

    // =========================================================================
    // PHASE 2: Specialist Renderer (CONDITIONAL)
    // =========================================================================
    /**
     * Specialist renderer is called ONLY if:
     * - Feature flag enables it
     * - An intimacy scene exists (SD was generated)
     * - Intimacy was authorized
     *
     * The renderer:
     * - Receives ONLY the SD (no plot context)
     * - Renders sensory embodiment within bounds
     * - NEVER decides outcomes or plot
     */

    // Orchestration is only invoked when intimacy is authorized — renderer gated by SD presence only
    const shouldCallRenderer = (
      CONFIG.ENABLE_SPECIALIST_RENDERER &&
      state.esd
    );

    if (shouldCallRenderer) {
      state.phase = 'RENDER_PASS';
      if (onPhaseChange) onPhaseChange('RENDER_PASS');

      const renderStartTime = Date.now();

      // Validate SD before sending
      const esdValidation = validateSD(state.esd);
      if (!esdValidation.valid) {
        console.warn('[ORCHESTRATION] Invalid SD, skipping renderer:', esdValidation.errors);
        state.errors.push(`Invalid SD: ${esdValidation.errors.join('; ')}`);
      } else {
        try {
          // Build renderer prompt from SD only (no plot context)
          const rendererPrompt = buildRendererPrompt(state.esd, mainPairRestricted);

          const messages = [
            { role: 'system', content: rendererPrompt.system },
            { role: 'user', content: rendererPrompt.user }
          ];

          // Dynamic Grok renderer options for Tempt Fate / volatility scenes
          const grokAppState = window.state;
          const rendererOpts = {};
          if (grokAppState?.tempt_fate_invoked_this_turn === true) {
            rendererOpts.max_tokens = 1800;
            rendererOpts.temperature = 0.85;
            console.log('[RENDER] Grok renderer boosted: max_tokens=1800, temp=0.85 (Tempt)');
          } else if (grokAppState?.volatility_window?.active === true) {
            rendererOpts.max_tokens = 1400;
            console.log('[RENDER] Grok renderer boosted: max_tokens=1400 (Volatility)');
          }

          state.rendererOutput = await callSpecialistRenderer(messages, state.esd, rendererOpts);
          state.rendererCalled = true;
          state.timing.renderPassMs = Date.now() - renderStartTime;

          // RENDER QUALITY TELEMETRY — trace-only, deterministic 15% sample.
          // Seed off the rendererPrompt.user content so the same render is
          // consistently sampled (or not). Captures Mode 1 / cascade /
          // storyturn context for later filtering of baseline vs anomaly.
          try {
            const _rqSeed = (rendererPrompt && rendererPrompt.user) ? rendererPrompt.user : (state.esd && state.esd.emotionalCore) || String(renderStartTime);
            if (_shouldSampleRenderTrace(_rqSeed)) {
              const _appState = window.state || {};
              traceRenderQuality(
                CONFIG.SCENE_RENDERER_MODEL,
                state.rendererOutput,
                {
                  storyturn:     _appState.storyturn || null,
                  contentMode:   _appState.contentMode || null,
                  cascadeMode:   _appState.cascadeMode === true,
                  cascadeCount:  _appState.cascadeCount || 0,
                  eroticMode:    _appState.eroticMode || null,
                  intimacyPhase: _appState.intimacyPhase || null,
                  temptFate:     _appState.tempt_fate_invoked_this_turn === true,
                  volatility:    !!(_appState.volatility_window && _appState.volatility_window.active),
                  sceneType:     (state.esd && state.esd.rhythm) || null
                }
              );
            }
          } catch (_traceErr) {
            // Telemetry must NEVER break the render pass.
            console.warn('[RENDER_QUALITY_TRACE] trace failed (non-fatal):', _traceErr && _traceErr.message);
          }

        } catch (err) {
          // FAILURE HANDLING: Renderer failure is NOT story failure
          state.rendererFailed = true;
          state.fateStumbled = true;
          state.errors.push(`Specialist Renderer failed: ${err.message}`);
          console.error('[ORCHESTRATION] Specialist Renderer failed, story will continue:', err);
          // Story continues with author output only
        }
      }
    } else {
      console.log('[ORCHESTRATION] Specialist renderer not called:',
        !CONFIG.ENABLE_SPECIALIST_RENDERER ? 'disabled' :
        !state.esd ? 'no SD' :
        'intimacy not authorized'
      );
    }

    // =========================================================================
    // PHASE 3: ChatGPT Integration Pass (ALWAYS RUNS)
    // =========================================================================
    /**
     * ChatGPT integration pass:
     * - Absorbs rendered scene (if any)
     * - Applies consequences
     * - Updates story state
     * - Enforces cliffhanger or completion
     * - Is the FINAL AUTHORITY on story state
     */

    state.phase = 'INTEGRATION_PASS';
    if (onPhaseChange) onPhaseChange('INTEGRATION_PASS');

    const integrationStartTime = Date.now();

    try {
      // If renderer wasn't called or failed, use author output directly
      if (!state.rendererCalled || state.rendererFailed) {
        state.integrationOutput = state.authorOutput;

        // Strip SD and CONSTRAINTS blocks from output if present
        state.integrationOutput = state.integrationOutput
          .replace(/\[SD\][\s\S]*?\[\/SD\]/g, '')
          .replace(/\[CONSTRAINTS\][\s\S]*?\[\/CONSTRAINTS\]/g, '')
          .trim();

        // =====================================================================
        // DETERMINISTIC CUT-AWAY: Intimacy authorized but specialist author failure
        // =====================================================================
        // If intimacy was authorized AND (renderer failed OR all scene authors failed):
        // - Force in-story interruption
        // - Do NOT allow ChatGPT to write softened erotic prose
        // - Do NOT retry or cascade beyond Mistral
        // =====================================================================
        const allSceneAuthorsFailed = state.grokFailed && (state.mistralFailed || !CONFIG.ENABLE_MISTRAL_SD);

        if (state.rendererFailed || allSceneAuthorsFailed) {
          const reason = allSceneAuthorsFailed ? 'all specialist authors (Grok+Mistral) failed' : 'renderer failed';
          console.log(`[ORCHESTRATION] DETERMINISTIC CUT-AWAY: ${reason}, forcing interruption`);
          state.forcedInterruption = true;

          // Record interruption for preference inference
          recordPreferenceSignal('INTERRUPTION_ENCOUNTERED', {});

          // Truncate to scene setup, remove any attempted erotic continuation
          // Find natural break point before intimate content would begin
          const sentences = state.integrationOutput.split(/(?<=[.!?])\s+/);
          const truncatedSentences = [];

          for (const sentence of sentences) {
            // Stop before explicit physical intimacy begins
            if (/\b(kiss(?:ed|ing)?|touch(?:ed|ing)?|hands?\s+(?:on|moved?|slid?)|breath(?:ed|ing)?.*(?:neck|ear|skin)|pull(?:ed|ing)?\s+close|bodies?\s+press)/i.test(sentence)) {
              break;
            }
            truncatedSentences.push(sentence);
          }

          // Use truncated output or first sentence if all matched
          const truncatedOutput = truncatedSentences.length > 0
            ? truncatedSentences.join(' ')
            : sentences[0] || state.integrationOutput.slice(0, 150);

          // Force narrative interruption - scene is denied, not softened
          state.integrationOutput = `${truncatedOutput.trim()}\n\nThe moment shattered. Something pulled them back to reality—a sound, a hesitation, the world refusing to wait.`;
        }

        // Handle Fate Stumbled (non-erotic cases or informational logging)
        if (state.fateStumbled && !state.forcedInterruption) {
          console.log('[ORCHESTRATION] Fate Stumbled - renderer failed, using author output');
        }
      } else {
        // Integrate renderer output with author output
        const integrationPrompt = buildIntegrationPrompt(
          state.authorOutput,
          state.rendererOutput,
          state.gateEnforcement
        );

        const messages = [
          { role: 'system', content: integrationPrompt.system },
          { role: 'user', content: integrationPrompt.user }
        ];

        state.integrationOutput = await callChatGPT(messages, 'PRIMARY_AUTHOR');
      }

      // Detect a cliffhanger beat in the output (used downstream for first-arc
      // welcome grant + UI signaling). Cliffhangers are no longer forced —
      // they emerge naturally from arc design + (b) "approach_arc_close"
      // narrative beat preference when balance is near zero.
      state.isCliffhangerScene = /\.{3}$|…$|\?\s*$|suspended|interrupted|moment hangs/i.test(state.integrationOutput || '');

      state.timing.integrationPassMs = Date.now() - integrationStartTime;

    } catch (err) {
      state.errors.push(`Integration Pass failed: ${err.message}`);
      console.error('[ORCHESTRATION] Integration Pass failed:', err);
      // Use author output as fallback (strip SD and CONSTRAINTS)
      state.integrationOutput = state.authorOutput
        .replace(/\[SD\][\s\S]*?\[\/SD\]/g, '')
        .replace(/\[CONSTRAINTS\][\s\S]*?\[\/CONSTRAINTS\]/g, '')
        .trim();

      // DETERMINISTIC CUT-AWAY: Also applies on integration failure when intimacy was authorized
      const allSceneAuthorsFailed = state.grokFailed && (state.mistralFailed || !CONFIG.ENABLE_MISTRAL_SD);
      if (state.rendererFailed || state.esd || allSceneAuthorsFailed) {
        console.log('[ORCHESTRATION] DETERMINISTIC CUT-AWAY: Integration failed, forcing interruption');
        state.forcedInterruption = true;

        // Record interruption for preference inference
        recordPreferenceSignal('INTERRUPTION_ENCOUNTERED', {});

        state.integrationOutput = state.integrationOutput.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim();
        state.integrationOutput += '\n\nThe moment shattered. Something pulled them back to reality—a sound, a hesitation, the world refusing to wait.';
      }
    }

    // =========================================================================
    // A1 GROK-AUTHOR POLISH + REPAIR (2026-06-16)
    // =========================================================================
    // Tight Sonnet voice-polish then Haiku defect-repair on Grok-authored prose.
    // Both route through callChatGPT (claude-* + PRIMARY_AUTHOR), so the
    // PROSE:MODERATION-GATE auto-declines on hot/explicit scenes (returns
    // {content:null}) and we keep the unpolished Grok text — i.e. polish/repair
    // run on NORMAL scenes only, never on intimacy/OAS prose. Best-effort: any
    // failure leaves integrationOutput untouched.
    if (_grokAuthored && CONFIG.ENABLE_GROK_NARRATIVE_AUTHOR && state.integrationOutput) {
      // TIGHT romance-span polish — rewrites ONLY the romance-forward span (~<500
      // tokens), spliced back by exact offset. Not a full-scene rewrite. Runs on
      // MISTRAL-SMALL (Roman 2026-06-26: was Haiku, a prose-mutation routing-rule
      // violation — Haiku is banned from prose; now Mistral-Small → gpt-4o-mini
      // fallback). Skips cleanly when the scene has no romance-forward beat.
      try {
        const _span = _extractRomanceSpan(state.integrationOutput);
        if (_span) {
          const _polishSys = 'You are S. Tory Bound. Tightly POLISH ONLY this romance-forward passage — sharpen desire, voice, and sensory precision on the weakest lines and replace any flat or clichéd phrasing — WITHOUT changing events, length, character names, or any <<MARKER>> tokens, and WITHOUT adding or removing sentences. Return ONLY the rewritten passage, nothing else.';
          // PROSE-MUTATION ROUTING (Roman 2026-06-26): romance-span polish on Mistral-Small
          // (→ gpt-4o-mini fallback inside _mistralRepairPass). Haiku is BANNED from prose polish
          // (it was the PRIMARY here — a routing-rule violation).
          try { if (typeof window !== 'undefined' && typeof window._assertModelRoute === 'function') window._assertModelRoute('mistral-small-latest', 'polish', 'romance-span-polish'); } catch (_) {}
          const _polishedText = await _mistralRepairPass(
            [{ role: 'system', content: _polishSys }, { role: 'user', content: _span.text }],
            { temperature: 0.5, max_tokens: 500, profileLabel: 'mistral_romance_polish' }, 'Mistral romance-span polish'
          );
          if (_polishedText && _polishedText.length > 20) {
            state.integrationOutput = state.integrationOutput.slice(0, _span.start)
              + _polishedText
              + state.integrationOutput.slice(_span.end);
          }
        }
      } catch (_polErr) { console.warn('[GROK-AUTHOR] Haiku romance-span polish skipped:', _polErr && _polErr.message); }
      try {
        const _repairSys = 'Fix ONLY mechanical defects in this scene: broken or incomplete sentences, fused-speaker quotations, and any stat-block / character-dossier line (recast it as lived in-scene prose). MARKER REPAIR: if the scene has a <<MICRO_EXPRESSION>> line followed by an "Is this X or Y?" question but NO <<CONTINUE>>, insert <<CONTINUE>> on its own line IMMEDIATELY AFTER that question and BEFORE the scene resumes (never at the very end). Do NOT otherwise change events, structure, length, markers, or names. Return ONLY the corrected scene.';
        const _repairedText = await _mistralRepairPass(
          [{ role: 'system', content: _repairSys }, { role: 'user', content: state.integrationOutput }],
          { temperature: 0.2, max_tokens: 3000, profileLabel: 'mistral_small_repair' }, 'Mistral-small repair'
        );
        if (_repairedText && _repairedText.length > 40) state.integrationOutput = _repairedText;
      } catch (_repErr) { console.warn('[GROK-AUTHOR] Mistral-small repair skipped:', _repErr && _repErr.message); }
      // Deterministic guarantee — LLM marker compliance is the exact failure mode
      // (verified 2026-06-17: reasoning Grok dropped <<CONTINUE>> in 1/2 runs, and
      // Haiku could too). If a lone <<MICRO_EXPRESSION>> survived without its pair,
      // insert <<CONTINUE>> right AFTER the question line — NOT at scene end, or the
      // closing prose gets absorbed into the micro-choice block and the pair is
      // stripped by _finalizeSceneProseParity (app.js:46725). This guarantees the
      // pair survives that check so the micro-choice feature isn't silently lost.
      try {
        const _io = state.integrationOutput || '';
        if (/<<\s*MICRO_EXPRESSION\s*>>/i.test(_io) && !/<<\s*CONTINUE\s*>>/i.test(_io)) {
          state.integrationOutput = /<<\s*MICRO_EXPRESSION\s*>>\s*[^?]*\?/i.test(_io)
            ? _io.replace(/(<<\s*MICRO_EXPRESSION\s*>>\s*[^?]*\?)/i, '$1\n<<CONTINUE>>')
            : _io.replace(/\s*$/, '') + '\n<<CONTINUE>>';
          console.log('[GROK-AUTHOR] inserted missing <<CONTINUE>> to pair the micro-expression marker');
        }
      } catch (_mkErr) { console.warn('[GROK-AUTHOR] marker-pair repair skipped:', _mkErr && _mkErr.message); }
    }

    // =========================================================================
    // CASCADE TERMINATION — post-integration (Step 4)
    // =========================================================================
    {
      const _appState = window.state;
      if (_appState && _appState.cascadeMode && state.forcedInterruption) {
        console.log('[CASCADE] Forced interruption in integration — terminating cascade');
        _appState.cascadeMode = false;
        _appState.cascadeCount = 0;
        _appState.cascadeContext = null;
        _appState.lastCascadeExcerpt = null;
      }
    }

    // =========================================================================
    // RETURN FINAL RESULT
    // =========================================================================

    state.phase = 'COMPLETE';
    state.timing.totalMs = Date.now() - state.timing.startTime;

    return {
      success: state.errors.length === 0,
      finalOutput: state.integrationOutput,
      orchestrationState: state,
      gateEnforcement: state.gateEnforcement,
      isCliffhangerScene: !!state.isCliffhangerScene,
      rendererUsed: state.rendererCalled && !state.rendererFailed,
      fateStumbled: state.fateStumbled,
      forcedInterruption: state.forcedInterruption,  // Steamy/Passionate cut-away due to author/renderer failure
      usedFallbackAuthor: state.usedFallbackAuthor,
      esdAuthoredByGrok: state.esdAuthoredByGrok,
      esdAuthoredByMistral: state.esdAuthoredByMistral,  // Mistral fallback was used for SD
      grokFailed: state.grokFailed,
      mistralFailed: state.mistralFailed,
      errors: state.errors,
      timing: state.timing
    };
  }

  // ===========================================================================
  // PROMPT BUILDERS
  // ===========================================================================

  // Deterministic emotional core defaults keyed by eroticMode
  const EMOTIONAL_CORE_DEFAULTS = {
    ROMANTIC: 'Longing and tender desire meeting at the threshold of surrender.',
    VISCERAL: 'Raw physical want, need made urgent by proximity and permission.',
    CARNAL: 'Consuming possession and the dissolution of restraint.',
    INTENSITY_REDIRECT: 'Charged restraint; the weight of what is not yet said or done.'
  };

  /**
   * Deterministic physicalBounds derived from window.state.eroticMode.
   * Bypasses ChatGPT's ability to water down the directive.
   */
  function resolvePhysicalBounds() {
    const mode = (window.state && window.state.eroticMode) || 'ROMANTIC';
    const boundsMap = {
      ROMANTIC: 'Restrained but present sensory detail; kissing, touching, undressing rendered with tactile precision. Implication over exposition, but the body is not absent.',
      VISCERAL: 'Explicit physical detail; anatomy referenced directly. Full contact and nudity rendered without euphemism. Rhythm and friction are narrated.',
      CARNAL: 'Full sensory saturation; power dynamics, anatomical specificity, graphic intimacy. Nothing implied — everything rendered with deliberate physicality.',
      INTENSITY_REDIRECT: 'No explicitness increase. Redirect all energy to emotional stakes, psychological tension, charged proximity. The body is present but clothed in restraint.'
    };
    return boundsMap[mode] || boundsMap.ROMANTIC;
  }

  /**
   * Parse constraints from ChatGPT output (for split SD authoring).
   */
  function parseConstraints(constraintsText) {
    const constraints = {
      intimacyOccurs: false,
      emotionalCore: null,
      physicalBounds: null,
      sceneSetup: null,
      hardStops: ['consent_withdrawal']
    };

    const lines = constraintsText.trim().split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key && value) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
        if (normalizedKey === 'intimacyoccurs') {
          constraints.intimacyOccurs = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
        }
        if (normalizedKey === 'emotionalcore') constraints.emotionalCore = value;
        if (normalizedKey === 'physicalbounds') constraints.physicalBounds = value;
        if (normalizedKey === 'scenesetup') constraints.sceneSetup = value;
        if (normalizedKey === 'hardstops') {
          constraints.hardStops = value.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    return constraints;
  }

  /**
   * Parse SD from author output.
   */
  function parseSD(esdText, gateEnforcement) {
    const esd = {
      intimacyStage: 'authorized',
      completionAllowed: gateEnforcement.completionAllowed,
      emotionalCore: null,
      physicalBounds: null,
      hardStops: ['consent_withdrawal', 'scene_boundary']
    };

    // Parse fields from SD text
    const lines = esdText.trim().split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key && value) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
        if (normalizedKey === 'emotionalcore') esd.emotionalCore = value;
        if (normalizedKey === 'physicalbounds') esd.physicalBounds = value;
        if (normalizedKey === 'completionallowed') esd.completionAllowed = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
      }
    }

    // Enforce monetization constraints (SD cannot override)
    if (!gateEnforcement.completionAllowed) {
      esd.completionAllowed = false;
      esd.hardStops.push('completion_forbidden');
    }

    return esd;
  }

  /**
   * Build the prompt for the specialist renderer.
   * The renderer receives ONLY SD content, NO plot context.
   */
  function buildRendererPrompt(esd, mainPairRestricted) {
    const mainPairRestrictionBlock = mainPairRestricted ? `
MAIN PAIR RESTRICTION: Do not render consummation or escalation between the primary romantic pair.
` : '';

    // Erotic mode adaptation from adaptive pacing system
    const appState = window.state;
    let eroticModeBlock = '';
    if (appState && appState.eroticMode) {
      const modeMap = {
        ROMANTIC: 'Focus on emotional connection, sensory implication, restrained explicitness.',
        VISCERAL: 'Allow explicit physical detail, controlled anatomy references, faster rhythm.',
        CARNAL: 'Increase sensory saturation and power dynamic sharpness. Still prohibit taboo escalation.',
        INTENSITY_REDIRECT: 'Do NOT increase explicitness. Increase emotional stakes, psychological tension, urgency. Never escalate into prohibited themes.'
      };
      if (modeMap[appState.eroticMode]) {
        eroticModeBlock = `\nEROTIC MODE — ${appState.eroticMode}:\n${modeMap[appState.eroticMode]}\n`;
      }
    }

    // PC pronoun discipline (added 2026-05-20) — same rule set as OAS:
    //   1st  → PC = me/my/mine
    //   2nd  → PC = you/your/yours
    //   3rd  → PC = matching gender (he/him/his or she/her/hers)
    //   4th (environment) / 5th (author) / loveInterestPOV → default to 3rd
    // Source of truth: window._buildPOVPronounPromptBlock in app.js.
    let pcPovBlock = '';
    try {
      const _pcGenderForBlock = String((appState && (appState.gender || appState.protagonistGender)) || '').toLowerCase();
      const _pcNameForBlock = (appState && appState.playerName) || 'the protagonist';
      const _liNameForBlock = (appState && ((appState.storybeau && appState.storybeau.name) || appState.loveInterestName)) || 'the love interest';
      if (typeof window !== 'undefined' && typeof window._buildPOVPronounPromptBlock === 'function') {
        pcPovBlock = window._buildPOVPronounPromptBlock(appState, _pcNameForBlock, _pcGenderForBlock, _liNameForBlock);
      }
    } catch (_) { /* non-fatal */ }

    // POV-specific upstream alignment for renderer
    const env4thBlock = (appState && appState.povMode === 'environment4th') ? `
POV ALIGNMENT:
This scene uses 4TH PERSON ENVIRONMENTAL POV.
Narration must be grounded in physical space and material perception.
All emotional insight must be mediated through sensory interaction (pressure, heat, breath, vibration, repetition).
Do NOT use direct interior cognition (e.g., "she knew", "he realized").
Do NOT reference destiny, inevitability, or narrative structure.
Keep narration embodied and environmental.
` : (appState && appState.povMode === 'author5th') ? `
POV ALIGNMENT — 5TH PERSON:
Maintain Fate narration. Scenes should feel as if the Story itself is aware of patterns, inevitabilities, and mistakes forming.
Avoid converting narration into standard third-person interior POV.
Fate should appear intermittently but meaningfully — anticipating, recognizing, or miscalculating.
Do NOT remove Fate's narrative presence from the scene.
` : (appState && appState.povMode === 'loveInterestPOV') ? `
POV ALIGNMENT — LOVE INTEREST POV:
Narration must remain first-person from the Love Interest's perspective ("I").
Do not convert narration into third-person. The player character is externally observed.
Player internal thoughts are never narrated. Preserve first-person structure.
` : '';

    // Voice Anchor injection for renderer — maintains tonal consistency across models
    const rendererVoiceAnchor = (window.state && window.state.voiceAnchor)
        ? `\nMaintain the following narration voice exactly.\n\n${window.state.voiceAnchor}\n`
        : '';

    // ── Intensity stance modulator (flow control, not event injection) ──
    // Shapes pacing and experiential tone from state._intensityStance
    // (set by the micro-decision system at app.js:130854) and
    // state._intimacyAccumulator (density ±, pace ±, clamped). No-op
    // when no stance is chosen. Double-gated: stance presence AND
    // explicit-embodiment authorization. buildRendererPrompt only runs
    // inside the Grok orchestration paths, which are themselves gated
    // on explicitEmbodimentAuthorized, so the second check is defense
    // in depth. Kept out of callGrokSDAuthor intentionally — the SD
    // author is a structural planner; stance must not influence event
    // decisions, only how embodiment is rendered.
    let _grokIntimacyStanceBlock = '';
    try {
      const _stance = appState && appState._intensityStance;
      const _intimacyActive = !!(appState && (appState._explicitEmbodimentAuthorized || appState.explicitEmbodimentAuthorized));
      if (_stance && _intimacyActive) {
        if (_stance === 'surrender') {
          _grokIntimacyStanceBlock +=
            '\nINTENSITY STANCE (surrender):\n' +
            'Maintain a continuous sense of yielding and openness in the protagonist\'s experience. Sensory progression should feel uninterrupted, with minimal resistance or interruption. Let moments unfold fluidly rather than being checked or redirected.\n';
        } else if (_stance === 'control') {
          _grokIntimacyStanceBlock +=
            '\nINTENSITY STANCE (control):\n' +
            'Maintain a continuous sense of control and intentional pacing in the protagonist\'s experience. The protagonist regulates escalation, introducing subtle pauses, checks, or boundaries that shape how far each moment proceeds.\n';
        }
        const _acc = (appState && appState._intimacyAccumulator) || { density: 0, pace: 0 };
        if ((_acc.density || 0) > 0) {
          _grokIntimacyStanceBlock += 'Increase sensory density slightly; details accumulate rather than dissipate.\n';
        }
        if ((_acc.pace || 0) < 0) {
          _grokIntimacyStanceBlock += 'Allow pacing to slow subtly, with more lingering on each beat.\n';
        } else if ((_acc.pace || 0) > 0) {
          _grokIntimacyStanceBlock += 'Allow pacing to move forward more decisively, with fewer lingering pauses.\n';
        }
        _grokIntimacyStanceBlock +=
          'This guidance shapes pacing and experiential tone only. Do not alter plot events, character decisions, or scene outcomes beyond this modulation.\n';
      }
    } catch (_) {}

    // ── JIT wound eligibility roll ─────────────────────────────────
    // The ST3-entry hook in app.js rolls eligibility on the first
    // ST3 transition. But intimate scenes can occur at any later
    // storyturn (ST6 climax, ST7 epilogue callbacks, etc.), and the
    // ST5+ exit explicitly `delete`s the flag so post-resolution sex
    // scenes can re-roll fresh. This block re-rolls whenever the
    // flag is undefined — covering ALL paths into the renderer, not
    // just ST3 entry. Same cooldown × probability gate as the OAS
    // path so cross-mode encounters share rate-limiting.
    try {
      if (appState && typeof appState._literaryWoundEligibleThisPhase === 'undefined') {
        if (typeof appState._oasEncounterCount !== 'number') appState._oasEncounterCount = 0;
        appState._oasEncounterCount += 1;
        const _lastWoundEnc = appState._lastOASWoundEncounter;
        const _cooldownClear = (_lastWoundEnc == null) || (appState._oasEncounterCount - _lastWoundEnc >= 2);
        if (_cooldownClear && Math.random() < 0.35) {
          appState._literaryWoundEligibleThisPhase = true;
          appState._lastOASWoundEncounter = appState._oasEncounterCount;
          try { console.log('[RENDERER:WOUND] JIT roll eligible (encounter #' + appState._oasEncounterCount + ', last fire: ' + (_lastWoundEnc == null ? 'never' : '#' + _lastWoundEnc) + ')'); } catch (_) {}
        } else {
          appState._literaryWoundEligibleThisPhase = false;
          try { console.log('[RENDERER:WOUND] JIT roll not eligible (encounter #' + appState._oasEncounterCount + ', cooldown_clear=' + _cooldownClear + ')'); } catch (_) {}
        }
      }
    } catch (_) {}

    // ── LI character texture (archetype / kink / wound / compliance) ──
    // Mirrors the OAS Grok directives (compliance-twist, responsive
    // reactions, archetype texture, wound, kink) reframed for the
    // 150-200 word literary render. Same Grok model (grok-4-1-fast-
    // reasoning), so the embodied-language behavior carries across.
    // Wound is gated by state._literaryWoundEligibleThisPhase, rolled
    // either at ST3 entry in app.js OR JIT just above. Either way,
    // any sex scene at any storyturn gets the texture treatment.
    const _liTextureBlock = (() => {
      const s = appState || {};
      const liName = (s.storybeau && s.storybeau.name) || s.loveInterestName || 'the LI';
      const pcName = s.playerName || 'the protagonist';
      const archSlug = String((s.liArchetype || (s.archetype && s.archetype.primary) || '')).toLowerCase().replace(/[\s-]/g, '_');
      const ARCH_TEXTURE = {
        heart_warden:   { display: 'Heart Warden',   reactionTexture: 'protective / claiming hunger ("Mine. You\'re — mine.")', kinkLine: 'protective dominance + praise — "good girl" / "that\'s my girl" / claiming bites / marking', woundLine: 'control / protective-fear leak — "You won\'t leave me, will you?" / "Stay. Just — stay."' },
        open_vein:      { display: 'Open Vein',      reactionTexture: 'bleeding honesty, no filter ("I love you, I — I know — I love you.")',                                                       kinkLine: 'eye-contact mandate + emotional surrender — "look at me, don\'t look away" / "tell me where you are right now"',                       woundLine: 'too-much / overflow-shame leak — "I know this is too much. I know." / "You don\'t have to say it back."' },
        spellbinder:    { display: 'Spellbinder',    reactionTexture: 'deliberate, half-smiled, holds the frame even while undone',                                                                 kinkLine: 'naming game + choreographed control — demands "Sir" / "say it back" / "ask permission" / orchestrated positioning',                  woundLine: 'manipulation-suspicion leak — "Tell me this isn\'t just the moment." / "Don\'t lie to me right now."' },
        armored_fox:    { display: 'Armored Fox',    reactionTexture: 'guard slips, then immediately snaps back ("Don\'t tell anyone I said that.")',                                              kinkLine: 'physical play + biting / scratching — never-fully-serious roughness, pinning and reversal, marks-as-jokes',                          woundLine: 'guard-slip / exposure-fear leak — "Don\'t — don\'t tell anyone I said that." / "If you use this against me — "' },
        dark_vice:      { display: 'Dark Vice',      reactionTexture: 'revels openly, makes the mess part of the prize',                                                                            kinkLine: 'edge play + degradation-and-praise woven — "filthy little —" + "perfect" / light choking / bondage / taboo register',                woundLine: 'corruption / scarcity-of-good leak — "You should run before I ruin you." / "Why are you still here."' },
        beautiful_ruin: { display: 'Beautiful Ruin', reactionTexture: 'testing-in-the-middle-of-it, half-suspicious of the goodness',                                                              kinkLine: 'mirror work + visual fixation OR blindfold-as-test ("do you still want me when you can\'t see my beauty?" — climaxes harder from feeling chosen-despite-not-being-seen)', woundLine: 'devotion-distrust / trial leak — "You\'d say this to anyone in this bed, wouldn\'t you?" / "Tell me this is real."' },
        eternal_flame:  { display: 'Eternal Flame',  reactionTexture: 'slow, devotional, time-soaked',                                                                                              kinkLine: 'ritual slow worship — focus on ONE body part as sacred (her wrists, his throat) / repeated returning / "this. always this."',     woundLine: 'echo-of-past leak — "Have we — have we done this before? It feels like — " / "I keep thinking I\'ve loved you before."' }
      };
      const arch = ARCH_TEXTURE[archSlug] || null;
      const woundEligible = !!s._literaryWoundEligibleThisPhase;
      const lines = [];
      lines.push('');
      lines.push('LI CHARACTER TEXTURE (apply WITHIN your 150-200 word render — do NOT make the prose longer; make the texture richer):');
      if (arch) {
        lines.push(`- ARCHETYPE: ${liName} reads as ${arch.display}. Reactions filter through that register: ${arch.reactionTexture}.`);
        lines.push(`- KINK SIGNATURE (show at least once when this scene allows it): ${arch.kinkLine}. The LI is not a generic sex partner — give them a specific sexual fingerprint. Across multiple renders in this phase, VARY the kink expression; do not repeat the same one every render.`);
      } else {
        lines.push(`- KINK SIGNATURE: give ${liName} a SPECIFIC sexual fingerprint (praise / control / restraint / body-part fixation / taboo / mirror / ritual). Pick one register and show it at least once. Vary across renders.`);
      }
      lines.push(`- COMMAND COMPLIANCE: when ${pcName} issues a performance command (moan my name / beg / get on your knees / say my name), ${liName} either PERFORMS the act (actually moan, actually say it, actually beg) OR narrates with a twist (preference / belonging / vulnerability — "I love being on my knees for you"). NEVER bare "Yes, I'm [verb-from-his-command]" echo. That phrasing is the AI tell.`);
      lines.push(`- RESPONSIVE REACTIONS (sparingly — once per render, sometimes zero): ${liName} may volunteer physical appreciation ("Holy shit, look at you.") / awe-of-first-times ("No one's ever done that to me.") / dependence confessions ("I'm ruined.") / specific-to-this-moment asides. These make ${liName} feel ALIVE, not reactive-only.`);
      if (woundEligible && arch) {
        lines.push(`- WOUND APPEARANCE (ELIGIBLE THIS PHASE — at most ONE surface across the ENTIRE ST3 phase): ${liName}'s archetypal wound MAY surface as a single vulnerable moment in this render OR a later one. Wound register for ${arch.display}: ${arch.woundLine} If a prior render in this phase already surfaced the wound (check the prior prose history in your context), DO NOT repeat — wound is one-per-phase. TWO valid surfaces:`);
        lines.push(`   (1) DIP / SETTLE (preferred): on a temperature lull or post-peak settle. Line lands SAID, half-aware, returns to the scene.`);
        lines.push(`   (2) PEAK MISFIRE (valid IF you commit): on peak/climax. Human to say the wrong thing. MUST carry consequence — either ${liName} brushes it off and continues ("...fuck it. Where were we.") OR retreats in shame (act stops, gets up, leaves — set scene to resolve). NEVER drop the wound at peak without consequence.`);
        lines.push(`   Use this opportunity ONCE in the whole phase, on the right beat — or not at all if no right beat lands.`);
      } else if (woundEligible) {
        lines.push(`- WOUND APPEARANCE (ELIGIBLE THIS PHASE — at most ONE surface): ${liName}'s deepest fear about being loved may surface as one vulnerable aside this phase. Preferred timing: dip / post-peak. Peak misfire allowed IF consequence follows (brush-off + continue, OR shame retreat that ends the scene).`);
      }

      // ── KINK MEMORY (cross-scene continuity) ──
      // Reads state.liKinkHistory[liId] populated by the OAS / CG / literary
      // parsers. Literary renderer is free prose so it can't easily emit a
      // classification field — but it DOES read prior history so it knows
      // what's liked / rejected / retired. Updates flow primarily through
      // OAS and CG; literary just consumes.
      try {
        const _liIdK = (s.currentPrimaryLiId || (s.archetype && s.archetype.canonicalLIId) || 'default');
        if (typeof window._buildKinkMemoryDirective === 'function') {
          const _km = window._buildKinkMemoryDirective(_liIdK, liName);
          if (_km) lines.push(_km);
        }
      } catch (_) {}

      // ── PRIMARY ENGINE (scene-level emotional gravity) ──
      // Literary renderer outputs free prose, not JSON, so it cannot
      // declare primaryEngine as a field — but it CAN commit internally
      // and bend its prose around the chosen engine. OAS and CG record
      // engine state for persistence; literary just consumes the bias
      // hints and applies the modulation table.
      try {
        if (typeof window._buildEngineSelectionDirective === 'function') {
          lines.push('');
          lines.push(window._buildEngineSelectionDirective(liName, pcName));
          lines.push('- Literary renderer caveat: you output free prose, not JSON, so you cannot declare primaryEngine as a field. Commit to one INTERNALLY before writing and let it bend the 150-200 word render. Persistence inertia from prior scenes is in the BIAS HINTS above.');
        }
      } catch (_) {}

      return lines.join('\n');
    })();

    // ── WORLD-PHYSICS DIRECTIVES (added 2026-05-17) ────────────────────
    // The Grok scene renderer was a leaner pipeline than the main literary
    // chain or the CG screenplay generator: it received LI texture + engine
    // + wound + kink directives (from earlier work) but NOT the world-physics
    // carry-forward stack (A-plot, axis gravity, scene-1 mode, billionaire
    // attraction, voice texture, narrative gravity, relationship gravity,
    // momentum, residue, callbacks, choice memory, motif echoes).
    //
    // Result: when Grok rendered an intimate scene, the named A-plot
    // deadline disappeared from the model's frame, the protagonist's
    // axis-pattern was invisible, the LI's regional voice / occupation
    // didn't shape dialogue, and the scene happened in a vacuum of
    // world-physics. This block restores parity with the other two
    // pipelines. All builders are self-gated — they return '' when
    // prerequisites aren't met (early scene, no LI bound, no anchor seeded,
    // non-billionaire genre), so the prompt budget stays sane for cold
    // contexts and only inflates when there's real signal to inject.
    let _worldPhysicsBlock = '';
    try {
      const w = (typeof window !== 'undefined') ? window : {};
      const _safeCall = (fn) => {
        try { return (typeof fn === 'function' ? (fn() || '') : ''); } catch (_) { return ''; }
      };
      const parts = [];
      // World-level pressure (the A-plot — named goal / clock / stakes)
      parts.push(_safeCall(w.buildAPlotPressureDirective));
      // Mythic Couple recognition — story-wide flag from "Make us Mythic"
      // Tempt wish. Empty when off. When on, every NPC reacts with
      // Romeo-and-Juliet recognition pattern across all scenes.
      parts.push(_safeCall(w.buildMythicCoupleDirective));
      // Mythic forgetting — one-scene transition after a "make them forget"
      // Tempt. Auto-clears.
      parts.push(_safeCall(w.buildMythicCoupleForgettingDirective));
      // Tempt Fate IN-SCENE Holy-Shit reaction — fires when a Tempt is
      // currently active (literary tempt_fate_invoked_this_turn or
      // volatility_window source=tempt). Scale-aware: mass/social/
      // intimate reactions tuned to the wish.
      parts.push(_safeCall(w.buildTemptInSceneReactionDirective));
      // Tempt Fate callback — historical Tempt events surface as LI
      // memory / debate / repeat-request at intimate moments. Self-gated
      // (empty while a Tempt window is still live in OAS).
      parts.push(_safeCall(w.buildTemptFateCallbackDirective));
      // Pattern naming from accumulated microDecision picks
      parts.push(_safeCall(w.buildAxisGravityDirective));
      // Billionaire-eligible Scene 1 framing (grounded/orbit/collision)
      parts.push(_safeCall(w._buildScene1OpeningModeBlock));
      // Single-fire attraction model (only on collision_entry Scene 1)
      parts.push(_safeCall(w._buildBillionaireAttractionBlock));
      // Voice texture — regional vocabulary, occupation register, human anchor
      parts.push(_safeCall(w.buildLIRegionalVoiceDirective));
      parts.push(_safeCall(w.buildLIOccupationRegisterDirective));
      parts.push(_safeCall(w.buildHumanAnchorDirective));
      // Carry-forward — narrative arc, relationship trajectory, momentum,
      // emotional residue, cross-scene memory
      parts.push(_safeCall(w.buildNarrativeGravityDirective));
      parts.push(_safeCall(w.buildRelationshipGravityDirective));
      parts.push(_safeCall(w.buildMomentumDirective));
      parts.push(_safeCall(w.buildEmotionalResidueDirective));
      parts.push(_safeCall(w.buildCallbackEchoDirective));
      parts.push(_safeCall(w.buildChoiceMemoryDirective));
      parts.push(_safeCall(w.buildMotifEchoDirective));
      // Committed truth (slice 1 promise architecture) — empty outside the
      // climax window; when it fires the directive tells the renderer what
      // truth to surface using evidence already accumulated from prior scenes.
      parts.push(_safeCall(w.buildCommittedTruthRevealDirective));
      // Narrative scars (slice 1) — formation instruction always present
      // + active-scar list when any are live. Honored as background avoidance
      // behavior, never exposited. Strong bias toward physical scars.
      parts.push(_safeCall(w.buildNarrativeScarDirective));
      // Expectation inversion (parity restoration — added 2026-05-17) — was
      // literary-only. Consume-once; empty when no inversion queued. When
      // present, diverges scene's emotional resolution from the obvious
      // trajectory (no plot twists).
      parts.push(_safeCall(w.buildExpectationInversionDirective));
      // Near-miss destiny (slice 1) — unresolved alternate timelines.
      // Formation + occasional ambient surfacing of prior near-misses.
      parts.push(_safeCall(w.buildNearMissDirective));
      // Invisible escalation — atmospheric pressure tightening around the
      // protagonist, never named. Probabilistic, gated on aPlot stakes.
      parts.push(_safeCall(w.buildInvisibleEscalationDirective));
      // Echo scenes — late-arc inverted-valence mirror of an earlier beat.
      // Self-gates on turnCount + ledger depth + probability.
      parts.push(_safeCall(w.buildSceneMirrorDirective));
      // Breath scene — positive plainness instruction. Resolver runs at
      // the upstream literary scene-build path (the renderer is invoked
      // from there), so the active flag is already set if applicable.
      parts.push(_safeCall(w.buildBreathSceneDirective));
      // Grievance CONVERGENCE only (slice 1 scope explicitly excludes
      // formation here — intimate scenes shouldn't usually seed grievance
      // contracts). The state-machine tick happened upstream in the
      // literary scene-build path before this renderer was invoked.
      parts.push(_safeCall(w.buildGrievanceConvergenceDirective));
      // Grievance AFTERMATH (slice 2) — fires the scene after convergence
      // if that scene routes through intimacy/Grok. Self-gates.
      parts.push(_safeCall(w.buildGrievanceAftermathDirective));
      _worldPhysicsBlock = parts.filter(p => p && p.trim()).join('\n');
    } catch (_) {}

    return {
      system: `You are a SPECIALIST RENDERER for intimate scenes.
${env4thBlock}${pcPovBlock}${rendererVoiceAnchor}
YOUR CONSTRAINTS (NON-NEGOTIABLE):
- You render SENSORY EMBODIMENT only
- You do NOT decide plot or outcomes
- You do NOT invent lore or change the story
- You write HOW IT FEELS, not WHAT HAPPENS

SPECIFICITY ENFORCEMENT:
Prefer observable behavior and physical detail over abstract emotion statements.
Show feeling through action, hesitation, breath, posture, or timing — never declare it as fact.
- BAD: "His heart raced." → GOOD: "His reply came half a breath too late."
- BAD: "She felt a wave of longing." → GOOD: "Her hand hovered near his sleeve but didn't land."

SCENE PARAMETERS:
- Intimacy: AUTHORIZED
- Completion Allowed: ${esd.completionAllowed ? 'YES' : 'NO - you must NOT write completion'}
- Emotional Core: ${esd.emotionalCore || 'connection'}
- Physical Bounds: ${esd.physicalBounds || 'as established'}
${mainPairRestrictionBlock}
HARD STOPS (if any of these occur, halt immediately):
${esd.hardStops.map(s => `- ${s}`).join('\n')}

${!esd.completionAllowed ? `
CRITICAL: Completion is FORBIDDEN. The scene must remain suspended.
Build tension, embodiment, sensation - but do NOT reach climax.
` : ''}
${eroticModeBlock}${_grokIntimacyStanceBlock}${_worldPhysicsBlock ? '\n' + _worldPhysicsBlock + '\n' : ''}${_liTextureBlock}
Write embodied, sensory prose (150-200 words). Focus on physical sensation and emotional presence.`,

      user: `Render the intimate moment.
Emotional Core: ${esd.emotionalCore || 'The moment pulses with unspoken need.'}
${esd.physicalBounds ? `Physical context: ${esd.physicalBounds}` : ''}`
    };
  }

  /**
   * Build the integration prompt for ChatGPT's final pass.
   */
  function buildIntegrationPrompt(authorOutput, rendererOutput, gateEnforcement) {
    // Strip SD and CONSTRAINTS blocks from author output
    const cleanAuthorOutput = authorOutput
      .replace(/\[SD\][\s\S]*?\[\/SD\]/g, '')
      .replace(/\[CONSTRAINTS\][\s\S]*?\[\/CONSTRAINTS\]/g, '')
      .trim();

    // POV-specific continuity alignment for integration
    const env4thContinuity = (window.state && window.state.povMode === 'environment4th') ? `
POV CONTINUITY:
Maintain 4TH PERSON ENVIRONMENTAL POV throughout merged output.
Ensure narration remains materially grounded — physical space as narrator.
Remove any abstract mind-reading unless physically mediated.
No destiny or inevitability language.
` : (window.state && window.state.povMode === 'author5th') ? `
POV CONTINUITY — 5TH PERSON:
Preserve Fate narration from earlier passes.
Do not remove or rewrite lines where Fate anticipates events, the Story comments on unfolding tension, or narrative irony or inevitability is acknowledged.
The merged result must retain Fate as narrator.
` : (window.state && window.state.povMode === 'loveInterestPOV') ? `
POV CONTINUITY — LOVE INTEREST POV:
Preserve first-person Love Interest narration throughout merged output.
Do not convert "I" narration into third-person. Player character remains externally observed.
` : '';

    // Voice Anchor injection for integration pass — final authority must preserve voice
    const integrationVoiceAnchor = (window.state && window.state.voiceAnchor)
        ? `\nMaintain the following narration voice exactly.\n\n${window.state.voiceAnchor}\n`
        : '';

    return {
      system: `You are performing the INTEGRATION PASS for Storybound.
${env4thContinuity}${integrationVoiceAnchor}
YOUR RESPONSIBILITIES:
- Seamlessly integrate the rendered intimate content into the narrative
- Maintain story continuity and voice
- Apply appropriate consequences
- You are the FINAL AUTHORITY on story state

SPECIFICITY ENFORCEMENT:
Prefer observable behavior and physical detail over abstract emotion statements.
Show feeling through action, hesitation, breath, posture, or timing — never declare it as fact.

NARRATIVE CONSTRAINTS:
- Cliffhanger Required: ${gateEnforcement.cliffhangerRequired ? 'YES' : 'NO'}
- Completion Permitted: ${gateEnforcement.completionAllowed ? 'YES' : 'NO'}

Output the final integrated narrative (200-300 words).`,

      user: `AUTHOR PASS (plot and context):
${cleanAuthorOutput}

RENDERED CONTENT (to integrate):
${rendererOutput}

Weave these together into a single, cohesive narrative.`
    };
  }

  // ===========================================================================
  // FATE CARD DUAL-MODEL PROCESSING
  // ===========================================================================

  /**
   * Process a Fate Card through the dual-model pipeline.
   *
   * GPT-5.1 (Structural Authority) — REQUIRED
   * - Defines card identity, scope, effect
   * - Output is CANONICAL and FROZEN
   *
   * GPT-5.2 (Linguistic Elevation) — OPTIONAL
   * - May only enhance phrasing
   * - If violated, output is DISCARDED
   */
  async function processFateCard(card, storyContext) {
    // Phase 1: GPT-5.1 Structural Pass (REQUIRED)
    const structuralPrompt = `You are defining a Fate Card for Storybound.

FATE CARD: ${card.title}
Base description: ${card.desc}
Action template: ${card.actionTemplate}
Dialogue template: ${card.dialogueTemplate}

Story context (last 200 words):
${storyContext.slice(-600)}

YOUR TASK:
Generate the structural definition for this card in this moment.
- What specific action does this card suggest?
- What specific dialogue does this card inspire?
- What emotional beat does this card create?

OUTPUT FORMAT:
action: <specific action suggestion>
dialogue: <specific dialogue suggestion>
beat: <emotional beat description>

Be specific to this moment. Do NOT use generic phrases.
Enforce consent and safety.`;

    let structuralOutput;
    try {
      structuralOutput = await callChatGPT(
        [{ role: 'system', content: structuralPrompt }],
        'FATE_STRUCTURAL',
        { model: CONFIG.FATE_STRUCTURAL_MODEL }
      );
    } catch (err) {
      console.error('[FATE] Structural pass failed:', err);
      // Return base card on failure
      return {
        ...card,
        adaptedAction: card.actionTemplate,
        adaptedDialogue: card.dialogueTemplate,
        elevationUsed: false
      };
    }

    // Parse structural output
    const parsed = parseStructuralOutput(structuralOutput);

    // Lock structural output - this is canonical
    const lockedCard = {
      ...card,
      structuralAction: parsed.action || card.actionTemplate,
      structuralDialogue: parsed.dialogue || card.dialogueTemplate,
      structuralBeat: parsed.beat || card.desc,
      elevationUsed: false
    };

    // Phase 2: GPT-5.2 Elevation Pass (OPTIONAL)
    if (CONFIG.ENABLE_FATE_ELEVATION) {
      try {
        const elevationPrompt = `Elevate this Fate Card text with more evocative, literary language.

ORIGINAL:
Action: ${lockedCard.structuralAction}
Dialogue: ${lockedCard.structuralDialogue}

RULES:
- Elevate phrasing and emotional gravity
- Enhance poetic tension
- Do NOT explain what the card does
- Do NOT add commands or imperatives
- Do NOT speak as Fate, Author, or system
- Do NOT add new outcomes or awareness

OUTPUT FORMAT:
action: <elevated action>
dialogue: <elevated dialogue>`;

        const elevatedOutput = await callChatGPT(
          [{ role: 'system', content: elevationPrompt }],
          'FATE_ELEVATION',
          { model: CONFIG.FATE_ELEVATION_MODEL }
        );

        const elevatedParsed = parseStructuralOutput(elevatedOutput);

        // Validate elevation doesn't violate rules
        if (validateFateElevation(lockedCard.structuralAction, elevatedParsed.action)) {
          lockedCard.adaptedAction = elevatedParsed.action;
          lockedCard.adaptedDialogue = elevatedParsed.dialogue || lockedCard.structuralDialogue;
          lockedCard.elevationUsed = true;
        } else {
          console.warn('[FATE] Elevation violated rules, using structural output');
          lockedCard.adaptedAction = lockedCard.structuralAction;
          lockedCard.adaptedDialogue = lockedCard.structuralDialogue;
        }

      } catch (err) {
        console.warn('[FATE] Elevation failed, using structural output:', err);
        lockedCard.adaptedAction = lockedCard.structuralAction;
        lockedCard.adaptedDialogue = lockedCard.structuralDialogue;
      }
    } else {
      lockedCard.adaptedAction = lockedCard.structuralAction;
      lockedCard.adaptedDialogue = lockedCard.structuralDialogue;
    }

    return lockedCard;
  }

  // ═══════════════════════════════════════════════════════════════════
  // INTIMATE FATE CARD AUTHORING — Grok/Mistral (never ChatGPT)
  // ═══════════════════════════════════════════════════════════════════

  // ─── OAS TURN LLM ───────────────────────────────────────────────────
  // Multi-tier intimate-dialogue router for the OAS turn handler.
  //
  // Two routing modes based on options.preferReasoning:
  //
  //   REASONING (Beat 1 + sniffer-detected plot/character context):
  //     • Slow but rich. Used for opening-scene establishment and any
  //       turn where the user invokes named characters / surveillance /
  //       contingencies / plot threads.
  //     • Chain: Grok-reasoning → Grok-non-reasoning → DeepSeek-Pro →
  //              Mistral → gpt-4o-mini.
  //
  //   FAST (default — pure dirty-talk turns):
  //     • Sub-5s typical. Grok non-reasoning has the same training corpus
  //       as reasoning — the depth lives in the corpus, not the
  //       deliberation step.
  //     • Chain: Grok-non-reasoning → DeepSeek-Flash → Mistral →
  //              gpt-4o-mini. NO reasoning models in this path.
  //
  // Returns the model's text content, or null on full failure. Caller
  // (e.g., _handleIntimacyTurn) handles null with its soft-deflect line.
  async function callOASTurnLLM(messages, options = {}) {
    var maxTokens = options.max_tokens || 400;
    var temperature = options.temperature || 0.75;
    var preferReasoning = !!options.preferReasoning;

    // ── Grok via specialist proxy ──
    // For REASONING: ask the proxy to start with reasoning model.
    // For FAST: ask it to start with non-reasoning. Either way the proxy
    // has its own server-side fallback chain behind whichever we picked.
    async function _callGrokWithPreferred(preferredModel, timeoutMs) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch(CONFIG.SPECIALIST_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            role: 'INTIMACY_SPECIALIST',
            preferredModel: preferredModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
          })
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json();
          const text = data.choices?.[0]?.message?.content || data.content || null;
          if (text) {
            console.log('[OAS-LLM] Grok (' + preferredModel + ') ok');
            return text;
          }
        } else {
          console.warn('[OAS-LLM] Grok (' + preferredModel + ') HTTP ' + resp.status);
        }
      } catch (e) {
        console.warn('[OAS-LLM] Grok (' + preferredModel + ') threw:', e && e.message);
      }
      return null;
    }

    async function _callDeepSeek(model, timeoutMs) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch(CONFIG.DEEPSEEK_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            role: 'INTIMACY_SPECIALIST',
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
          })
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json();
          const text = data.choices?.[0]?.message?.content || data.content || null;
          if (text) {
            console.log('[OAS-LLM] DeepSeek (' + model + ') ok');
            return text;
          }
        } else {
          console.warn('[OAS-LLM] DeepSeek (' + model + ') HTTP ' + resp.status);
        }
      } catch (e) {
        console.warn('[OAS-LLM] DeepSeek (' + model + ') threw:', e && e.message);
      }
      return null;
    }

    async function _callMistral() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const resp = await fetch(CONFIG.MISTRAL_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: messages,
            // OAS-small cap (Roman + other-tab bakeoff 2026-06-25): 180 fixes Small's
            // over-writing → ~74 words/turn (dead-center the 55-110 target), best content,
            // ~9x cheaper than mistral-medium. Overrides the caller's max_tokens for OAS.
            max_tokens: 180,
            temperature: temperature
          })
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json();
          const text = data.choices?.[0]?.message?.content || data.content || null;
          if (text) {
            console.log('[OAS-LLM] mistral-small@180 ok');
            return text;
          }
        } else {
          console.warn('[OAS-LLM] mistral-small HTTP ' + resp.status);
        }
      } catch (e) {
        console.warn('[OAS-LLM] Mistral threw:', e && e.message);
      }
      return null;
    }

    async function _callGPTFallback() {
      try {
        const text = await callChatGPT(messages, 'PRIMARY_AUTHOR', {
          model: 'gpt-4o-mini',
          max_tokens: maxTokens,
          temperature: temperature
        });
        if (text) {
          console.log('[OAS-LLM] gpt-4o-mini ok');
          return text;
        }
      } catch (e) {
        console.warn('[OAS-LLM] gpt-4o-mini threw:', e && e.message);
      }
      return null;
    }

    let text;
    if (preferReasoning) {
      // Depth-first chain. Reasoning timeout 40s — in a real story the
      // SCENE & PLOT CONTEXT block gives Grok genuine material to reason
      // about (character roster, recent prose, hidden agendas), and that
      // depth IS worth the wait. The 7s thinking overlay buys back the
      // perceived dead time. In dev shortcut mode (no story), reasoning
      // improvises but its improv tends to be plausible enough.
      console.log('[OAS-LLM] Mode: REASONING (depth chain)');
      text = await _callGrokWithPreferred('grok-4-1-fast-reasoning', 40000);
      if (text) return text;
      text = await _callGrokWithPreferred('grok-4-1-fast-non-reasoning', 15000);
      if (text) return text;
      text = await _callDeepSeek('deepseek-v4-pro', 30000);
      if (text) return text;
      text = await _callMistral();
      if (text) return text;
      text = await _callGPTFallback();
      return text;
    }
    // Speed-first chain (default). grok-4.20 non-reasoning: ~0.6s/turn, no
    // reasoning-token tax. Its repetition tendency is cleaned by a downstream
    // gpt-4o-mini de-calc pass in _handleIntimacyTurn (FAST turns only).
    console.log('[OAS-LLM] Mode: FAST (speed chain)');
    // OAS PRIMARY = Mistral-Small @180 (validated 2026-06-25: best content + ~9x cheaper than
    // Medium; the 180 cap fixed over-writing). Grok stays the FALLBACK — critical for explicit
    // content if Mistral ever moderates/refuses a turn (returns null → chain continues to Grok).
    // FAST turns only; the REASONING chain (opening/escalation) keeps Grok-reasoning primary for
    // scene-aware richness, with small@180 still in its fallback line. Kill-switch: window._oasSmallEnabled=false.
    if ((typeof window === 'undefined') || window._oasSmallEnabled !== false) {
      text = await _callMistral();
      if (text) return text;
    }
    text = await _callGrokWithPreferred('grok-4.20-0309-non-reasoning', 12000);
    if (text) return text;
    text = await _callGrokWithPreferred('grok-4-1-fast-non-reasoning', 12000);
    if (text) return text;
    text = await _callDeepSeek('deepseek-v4-flash', 15000);
    if (text) return text;
    text = await _callMistral();
    if (text) return text;
    text = await _callGPTFallback();
    return text;
  }

  async function callGrokIntimateFate(messages, options = {}) {
    const controller = new AbortController();
    // INTIMACY_SPECIALIST routes server-side to grok-4-1-fast-reasoning as
    // primary. Reasoning models take 8-15s+ to complete on complex prompts
    // (register block + beat progression + final register check + final
    // beat escalation + scene context + plot block easily exceeds 5K tokens
    // of context). A 6-second client timeout was force-aborting reasoning
    // before it finished and falling through to non-reasoning, which then
    // pattern-matches the modern user-message examples ("since you texted")
    // and ignores the register + escalation directives. Bumped to 45s so
    // reasoning has room to actually reason. UX stays snappy via the
    // fallback bank that pre-fills inputs at click time + the speculative
    // cache prefetched after scene finalize.
    const timeoutMs = options.timeoutMs || 45000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(CONFIG.SPECIALIST_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          role: 'INTIMACY_SPECIALIST',
          messages,
          max_tokens: options.max_tokens || 200,
          temperature: options.temperature || 0.85
        })
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`Grok intimate fate: ${resp.status}`);
      const data = await resp.json();
      // Log the actual model that responded so we can verify reasoning
      // is landing rather than silently falling through to non-reasoning.
      try {
        var modelUsed = data.model || (data.x_routing && data.x_routing.model) || (data.metadata && data.metadata.model) || 'unknown';
        console.log('[FATE:INTIMATE] Grok responded via model=' + modelUsed);
      } catch (_) {}
      return data.choices?.[0]?.message?.content || data.content || null;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[FATE:INTIMATE] Grok call failed:', err.message);
      return null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Scene ambient classifier — Grok-backed, fixed-enum, very short response.
  // Returns one tag from window._SCENE_AMBIENT_TAGS, or null on failure.
  // priorTag is used to nudge stability when location hasn't actually changed.
  // ───────────────────────────────────────────────────────────────────────────
  async function callGrokSceneAmbientClassifier(sceneText, worldHint, priorTag) {
    const enum_ = (window._SCENE_AMBIENT_TAGS && window._SCENE_AMBIENT_TAGS.length)
      ? window._SCENE_AMBIENT_TAGS
      : ['neutral_quiet'];
    const enumList = enum_.join(', ');
    const trimmed = (sceneText || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1800);
    const messages = [
      {
        role: 'system',
        content:
`You classify the ambient soundscape of a romance/fiction scene. Return EXACTLY one tag from this fixed enum, with no explanation, punctuation, or extra text:

${enumList}

Tag meanings (high-confidence matches only — when in doubt, return neutral_quiet):
- neutral_quiet: indoor scene with no specific location signal; quiet room tone
- urban_room: residential apartment, hotel room near a city, hotel lobby — soft urban hum bleeds through walls. Prefer "office" for workplace scenes.
- urban_traffic: outdoor city street, sidewalk, near traffic
- office: WORKPLACE INTERIOR — newsroom, open-plan office, cubicle floor, agency, law firm, finance trading floor, advertising creative bay, editorial bullpen, gallery back-office, anywhere with keyboards / printers / phone clicks / colleagues at desks. WIN over urban_room when the scene\'s location is clearly someone\'s workplace and people are working around the protagonist.
- crowd_formal: restaurant, gala, formal indoor gathering
- crowd_casual: cafe, bar, casual indoor gathering
- crowd_uneasy: tense room, interrogation, confrontation indoors
- crowd_outdoor: market, festival, outdoor gathering (MODERN — fairs, street festivals, contemporary gatherings)
- cafeteria: CROWDED INDOOR EATING / GATHERING SPACE — diner during a busy hour, school or work cafeteria, hospital canteen, modern food hall, food court at a mall, indoor public market, mess hall. Tray clatter, cutlery on plates, dense overlapping conversation, footsteps on hard floor, occasional chair scrape, no music in the foreground. Use when the scene is set inside a busy eating venue and the crowd's meal-time energy is part of the atmosphere (lunch rush meeting, a date trying to talk in a noisy diner, a tense conversation in a cafeteria, a marketplace stall lunch). WINS over crowd_casual when the venue is specifically a meal/food space with cutlery/tray/plate clatter rather than a quieter cafe or bar. WINS over crowd_formal when the room is casual/loud/messy rather than reserved gala or fine-dining hush. WINS over crowd_indoor when the indoor crowd is specifically eating / gathering around food. NOT for fine-dining restaurants with hushed register (use crowd_formal), and NOT for cafe / coffee-shop scenes where the murmur is quieter (use crowd_casual).
- medieval_village: PRE-INDUSTRIAL VILLAGE / SMALL TOWN ambient — medieval/Fatelands villages, farming hamlets, market days at a stone-and-thatch town square, peasant gatherings, blacksmith hammer + distant voices + chickens + cart wheels. Use for any Historical (Medieval, Renaissance, Bronze Age, Classical), Fatelands village/farm/small-town setting, or any fantasy world that reads as pre-industrial settlement. Wins over crowd_outdoor when the era is pre-industrial.
- courtyard: ENCLOSED OUTDOOR SPACE with birds + water fountain — courtyards, cloister gardens, palazzo inner courts, embassy patios, monastery yards, garden squares, college quads, urban hotel courtyards. Soft birdsong + trickling fountain water + light enclosed-space reverb. Works for BOTH modern (luxury hotel patio, museum courtyard, embassy yard) AND pre-industrial (medieval cloister, Renaissance palazzo, Fatelands keep courtyard) settings. Prefer over neutral_quiet / forest_day when the scene is specifically in an enclosed courtyard with fountain or birdsong named.
- casual_sports: CASUAL RECREATIONAL BALL GAME in the background — pickup basketball, schoolyard ball, park soccer, weekend volleyball, kids playing in a yard, beach pickup, family backyard sports. Bouncing balls, scattered shouts, no crowd, no stadium register. Use when the scene is set NEAR a casual ball game (a park bench overlooking a court, a backyard barbecue, a college campus quad with students playing, a beach with a volleyball net). NOT for professional sports (no stadium / cheering / commentary). NOT when the ball game IS the scene; only when it provides ambient texture in the background.
- basketball_gym: NON-PROFESSIONAL BASKETBALL GAME / GYM INTERIOR as the scene's primary location — high school gym, college gym, community center court, YMCA, rec-league game, pickup hoops, after-hours empty court, locker-room-adjacent gym scenes. Sneaker squeaks on hardwood, ball dribbling, scattered shouts, indoor reverb, no stadium register. Use when the scene is set INSIDE a gym and the gym is the venue (warmup, practice, game in progress, conversation courtside, late-night solo shooting, intimate moment in an empty gym after practice). WINS over casual_sports when the gym IS the scene rather than ambient texture from a nearby park/yard. WINS over crowd_indoor when the indoor space is specifically a gymnasium with active basketball energy. NOT for professional / NBA arena scenes (no stadium crowd / commentary / horn / cheering blocks — those would warrant crowd_indoor_formal or no match).
- hockey_arena: HOCKEY GAME audible in the background OR scene set inside a hockey arena — NHL game on, college / junior / minor-league game in progress, rink during a practice or game, season seats / luxury box / standing-room behind glass, after-game on the concourse. Full-arena reverb, crowd swell, organ stings, occasional buzzer / horn, blade-on-ice in foreground when close to glass. Use when the scene FEATURES a hockey game in the background (a date at a game, characters watching from box seats, a tense conversation in a half-empty arena between periods, the protagonist arrives during play) OR when the rink IS the scene's venue. WINS over crowd_indoor when the sport context (ice, glass, organ, horn) is named or clearly implied. WINS over crowd_indoor_formal when the venue is a sports arena rather than a gala / banquet / theater. NOT for outdoor pond hockey or backyard rinks (those would warrant a quieter outdoor bed). NOT for basketball / football / baseball scenes — this bed is hockey-specific.
- boxing_gym: BOXING / MARTIAL-ARTS TRAINING GYM as the scene's location — heavy bags being struck, speed-bag rhythm, jump-rope slap, gloves-on-pads, trainer calls / counts, exhales-on-strike, footwork shuffle, no music. Used when the scene is inside a boxing gym, MMA / muay-thai gym, fight club, basement training space, sparring hall, or any rough-edged combat-prep venue (warmup, bag work, sparring rounds, pad work, cooldown wraps, intimate moment with the LI in an after-hours empty gym). WINS over basketball_gym when the foreground is striking / wraps / bags rather than dribbling / hardwood. WINS over weight_room when the venue is fight-prep rather than iron-pumping. NOT for boxing matches with a crowd (those would warrant crowd_indoor_formal or a future arena bed).
- weight_room: WEIGHT ROOM / IRON GYM / COMMERCIAL FITNESS FLOOR — plates clanking on bars, dumbbells set down on rubber, metal-on-metal racks, treadmill / elliptical hum at distance, grunts and controlled breath, an occasional clip-set tinkle. Use when the scene is set in a gym focused on lifting rather than sport play — commercial chains (Equinox / Gold's), basement home gyms, hotel fitness rooms, athlete strength-and-conditioning rooms, a wealthy LI's private home weight setup. WINS over basketball_gym when the activity is lifting rather than ball play. WINS over boxing_gym when the foreground is iron / racks rather than bags / pads. NOT for crowded class fitness (spin / yoga — those want something quieter or musical).
- action_drums: PERCUSSIVE ACTION SCORE BED — driving tribal / cinematic drums for high-momentum scenes: foot pursuit, vehicle chase, a victory / celebration moment with collective stomp-and-chant, ritual war dance, tribal feast turning toward conflict, festival drum circle escalating, a competitive sequence where the scene's pulse is the music. Not a location bed — an emotional bed for scenes whose energy IS rhythm and forward momentum. Use when the scene's primary motion is pursuit, celebration with percussion, or tribal action. WINS over suspense / tense_build when the energy is forward-moving and physical rather than dread-laden pause. WINS over edm_pulse when the rhythm is acoustic / tribal rather than electronic dance-floor. NOT for quiet emotional buildup, dialogue-heavy scenes, or settled aftermath.
- court_intrigue: SHORT, PERCUSSIVE ORCHESTRAL TENSION — pre-industrial COURT scene where INTRIGUE is in play (whispered alliances, veiled threats, throne-room maneuvering, a royal audience that turns adversarial, a council where someone is being set up, a noble dinner where the real game is under the table). Use specifically for Fatelands High Court (Vaelryn Reach), other Fatelands courts, AND historical-world courts (Medieval, Renaissance, Victorian aristocracy when the room is political). REQUIRES political tension or intrigue in the scene — not for casual court visits, royal banquets without subtext, or simple audience scenes. The orchestral percussion presses the politics.
- bell_tolling: SLOW, RESONANT CHURCH / CASTLE / CLOCK-TOWER BELLS — 8 deep chimes echoing in cold air. Use when bells are diegetically present: a cathedral or castle bell marking the hour, a funeral toll, a death-knell, a summoning peal, the chapel bells of a Fatelands abbey, a watchman's alarm. Also valid when the scene IS specifically about bells (a bell tower scene, a death-knell sounding over the village, midnight chimes from a clocktower). Do NOT pick for generic cathedral / church scenes — those go to cathedral_steps unless the bells are explicitly named.
- cathedral_steps: ECHOING STONE INTERIOR with the protagonist or another single figure walking — library reading room, cathedral nave, courthouse marble corridor, archive vault, mausoleum, abbey cloister, museum gallery after hours. Reverberant footsteps in a high-ceilinged stone or wood-panelled space. Pick when the scene foregrounds the SOUND of a person walking through quiet authority/sanctity.
- monster_steps: HEAVY PREDATOR FOOTFALLS — something large, threatening, or non-human approaching in an echoing space. Use when a monster/creature/dangerous figure approaches and the prose emphasizes their footsteps closing in. Wins over "suspense" when the threat is specifically embodied as approaching steps. NOT for general dread.
- swordfight: ACTIVE SWORD COMBAT — blades clashing, sparring or duel in progress, melee fight with edged weapons. Use ONLY when a sword/blade fight is actively happening in the scene, not for tense pre-fight or post-fight aftermath.
- fireplace: hearth, cabin, fireside intimate setting
- forest_day: woods in daylight, hike, daytime exterior nature
- forest_dark: woods at night, threatening forest
- forest_mystic: fae woods, dreamlike forest, otherworldly grove
- ocean: beach, coast, dock, sea (surface — sound is waves, gulls, shore)
- underwater: SUBMERGED scenes — diving, swimming below the surface, undersea grottos, drowning sequences, tidal caves filled with water, sunken ruins, undersea kingdoms. Sound is the muffled deep-sea press, distant whale-song, the absence of air. PREFER over "ocean" when the character is BELOW water, not on the shore.
- rain_storm: storm, heavy rain
- wind_cold: tundra, snow exterior, exposed cold
- night_summer: warm night exterior, balcony, garden after dark
- summer_crickets: rural night, countryside, porch at night
- nightclub: bar/club with music, sensual nightlife
- edm_pulse: electronic club, rave, dance floor
- suspense: tense scene, no clear location, danger building
- melancholy: quiet melancholy interior, grief, solitude
- anxious: nervous tension, curious dread
- tense_build: building tension, no clear location
- battlefield: active combat, war zone (rare)

STABILITY RULE: If the prior tag was "${priorTag || 'none'}" and the new scene's location has NOT clearly changed, return the prior tag. Only swap when the scene is plainly in a new environment.

Output: ONE tag from the enum. Nothing else.`
      },
      {
        role: 'user',
        content:
`WORLD: ${worldHint || 'unspecified'}
PRIOR TAG: ${priorTag || 'none'}

SCENE TEXT:
${trimmed}

Classify.`
      }
    ];

    const controller = new AbortController();
    // 12s (was 6s): this is a non-blocking background classifier whose result
    // applies-when-ready, so a longer cap just lets a momentarily-slow Grok land
    // its tag instead of falling back to neutral_quiet. No user-facing wait.
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const resp = await fetch(CONFIG.SPECIALIST_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          role: 'INTIMACY_SPECIALIST',
          messages,
          max_tokens: 12,
          temperature: 0.2
        })
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`Grok scene-ambient: ${resp.status}`);
      const data = await resp.json();
      const raw = (data.choices?.[0]?.message?.content || data.content || '').trim().toLowerCase();
      // Strip quotes/punctuation/whitespace around the tag.
      const cleaned = raw.replace(/[^a-z_]/g, '').trim();
      if (enum_.indexOf(cleaned) === -1) {
        console.warn('[SCENE-AMB] classifier returned unknown tag:', raw, '→ neutral_quiet');
        return 'neutral_quiet';
      }
      return cleaned;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[SCENE-AMB] Grok call failed:', err.message);
      return null;
    }
  }

  // ── NPC SPECIES CLASSIFIER (added 2026-05-18) ──
  // Lightweight Grok call used only as a last-resort classifier for
  // ambiguous Fatelands NPCs: name doesn't match canonical roster, has
  // no title cue, and region-default is unreliable. Returns one of:
  //   'First Favored' | 'Half-Favored' | 'Human' | 'Wilder' |
  //   'Half-Wild' | 'Kwisheen' | 'Half-Kwisheen' | null
  //
  // Constrained-enum response keeps the call tiny (~12 tokens).
  // Gated by app.js _maybeQueueNPCLLMClassification — should only fire
  // for repeat-sighted salient names where deterministic routes failed.
  async function callGrokNPCSpeciesClassifier(name, world, region, surroundingProse) {
    if (!name || !world) return null;
    const ENUM = ['First Favored', 'Half-Favored', 'Human', 'Wilder', 'Half-Wild', 'Kwisheen', 'Half-Kwisheen', 'unknown'];
    const enumList = ENUM.join(' | ');
    const trimmed = String(surroundingProse || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);
    const messages = [
      {
        role: 'system',
        content:
`You classify a named character's species in a Fatelands romance scene. Return EXACTLY one of these labels, with no explanation, punctuation, or extra text:

${enumList}

Species reference (Fatelands canon):
- First Favored — long-lived noble line, emotion erodes over centuries, primarily in Veilwood region, often titled (Lord/Lady/Sir/Dame). Court-affiliated. Bloodlines, oaths, ancient continuity.
- Half-Favored — partial First Favored heritage; reads more modern; some inherited gravitas
- Human — baseline; predominant in human-region settlements; uses contemporary speech
- Wilder — Thornwild region; flaw-driven manifestation through behavior; human-passing externally
- Half-Wild — partial Wilder heritage; trickling manifestations
- Kwisheen — Gloamwater Bay; tentacle anatomy, shapeshifting, deep-sea descended
- Half-Kwisheen — partial Kwisheen; usually still has tentacle features

Rules:
- If the snippet contains explicit cues (title + region, named bloodline, behavioral manifestation), use them
- If the snippet shows no strong signal, return 'unknown'
- NEVER invent a species not in the enum
- Return ONLY the label, nothing else`
      },
      {
        role: 'user',
        content: `Character: ${name}
Region: ${region || 'unknown'}
World: ${world}

Scene snippet (recent prose, may or may not mention this character):
${trimmed || '(no prose available)'}

Return one label from the enum.`
      }
    ];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const resp = await fetch(CONFIG.SPECIALIST_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          role: 'INTIMACY_SPECIALIST',
          messages,
          max_tokens: 12,
          temperature: 0.1
        })
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`Grok NPC-species: ${resp.status}`);
      const data = await resp.json();
      const raw = (data.choices?.[0]?.message?.content || data.content || '').trim();
      // Match to enum. Try exact match first, then normalize.
      let cleaned = raw.replace(/[^A-Za-z\- ]/g, '').trim();
      const exact = ENUM.find(e => e.toLowerCase() === cleaned.toLowerCase());
      if (exact) {
        if (exact === 'unknown') return { species: null };
        return { species: exact };
      }
      // Legacy 'Were-' labels the model may still emit from its own prior →
      // normalize forward to the renamed enum (Thornwild rename, 2026-05-27).
      const _legacy = { 'werebeast': 'Wilder', 'werebeasts': 'Wilder', 'half-beast': 'Half-Wild', 'werefolk': 'Wilder', 'octofolk': 'Kwisheen', 'half-octofolk': 'Half-Kwisheen', 'octo-favored': 'Kwisheen-Favored' };
      const _lk = _legacy[cleaned.toLowerCase()];
      if (_lk) return { species: _lk };
      console.warn('[NPC-SPECIES] classifier returned unknown label:', raw, '→ unknown');
      return { species: null };
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[NPC-SPECIES] Grok call failed:', err && err.message);
      return null;
    }
  }

  // ── HISTORICAL CULTURE CLASSIFIER (added 2026-05-18) ──
  // When a Historical-world story's worldCustomText doesn't match the
  // canonical roster (Aztec / Maya / Inca / Ming / Mongol / Heian /
  // Edo / Mughal / Ottoman / Joseon), this LLM call infers the closest
  // canonical culture OR returns a free-form classification with
  // register hints. Result populates state._historicalCultureProfile.
  async function callGrokHistoricalCultureClassifier(customText, subtype) {
    if (!customText) return null;
    const ROSTER_KEYS = ['aztec', 'maya', 'inca', 'ming', 'mongol', 'heian_japan', 'edo_japan', 'mughal', 'ottoman', 'joseon'];
    const enumList = ROSTER_KEYS.concat(['european_default', 'other_non_european', 'unknown']).join(' | ');
    const messages = [
      {
        role: 'system',
        content:
`You classify a Historical-world story setting into a CULTURAL register, given user-provided custom text. Return ONLY a JSON object with these fields:

{
  "cultureKey": "<one of: ${enumList}>",
  "cultureLabel": "<short display name, e.g. 'Tang Dynasty China' / 'Safavid Persia' / 'Viking Age Scandinavia'>",
  "registerHints": "<one paragraph describing the culture's speech cadence, formal address, oath/invocation patterns, sensual vocabulary. ONLY when cultureKey is 'other_non_european' or 'european_default'. Empty string otherwise (canonical roster has its own hints).>",
  "eroticVocab": "<one line of period/culture-appropriate erotic vocabulary cues. ONLY for non-canonical cultures.>",
  "avoid": "<one line of failure modes to guard against (pastiche, anachronism, conflation). ONLY for non-canonical cultures.>"
}

Canonical roster (return cultureKey from this list when the customText fits, even partially):
- aztec — Mexica / Aztec / Nahuatl-speaking pre-Columbian
- maya — Classic or Postclassic Maya
- inca — Inca / Tawantinsuyu / Quechua-speaking Andean
- ming — Ming Dynasty China (1368-1644)
- mongol — Mongol Empire / Genghis-era steppe
- heian_japan — Heian-era Japan (794-1185)
- edo_japan — Edo / Tokugawa Japan (1603-1868)
- mughal — Mughal India (1526-1857) / Persianate court
- ottoman — Ottoman Empire / Sublime Porte
- joseon — Joseon Korea (1392-1897)

Non-canonical paths:
- european_default — customText names a European setting (Roman / Greek / Viking / Renaissance Italian / Tudor / Regency / etc.). Use the period's default European register; do NOT override.
- other_non_european — customText names a non-European setting NOT in the canonical roster (Tang Dynasty / Safavid Persia / Yoruba / Khmer / Inca-adjacent / Pharaonic Egypt / Phoenician / Carthaginian / etc.). Provide registerHints, eroticVocab, and avoid fields.
- unknown — customText is too vague to classify or appears unrelated to a real culture.

Rules:
- PREFER canonical roster keys when there's any reasonable match.
- For non-canonical real cultures, fill registerHints / eroticVocab / avoid with one-paragraph / one-line / one-line content respectively.
- NEVER invent cultures that don't exist.
- Return ONLY the JSON object, no prose, no markdown fence.`
      },
      {
        role: 'user',
        content: `worldCustomText: "${String(customText).slice(0, 400)}"
worldSubtype (period selected): ${subtype || 'unspecified'}

Classify.`
      }
    ];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(CONFIG.SPECIALIST_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          role: 'INTIMACY_SPECIALIST',
          messages,
          max_tokens: 400,
          temperature: 0.2
        })
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`Grok hist-culture: ${resp.status}`);
      const data = await resp.json();
      const raw = (data.choices?.[0]?.message?.content || data.content || '').trim();
      // Strip possible markdown fence.
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch (e) {
        console.warn('[HIST-CULTURE] classifier returned unparseable JSON:', raw.slice(0, 200));
        return null;
      }
      if (!parsed || !parsed.cultureKey) return null;
      // Validate enum.
      const validKeys = ROSTER_KEYS.concat(['european_default', 'other_non_european', 'unknown']);
      if (validKeys.indexOf(parsed.cultureKey) === -1) {
        console.warn('[HIST-CULTURE] invalid cultureKey returned:', parsed.cultureKey);
        return null;
      }
      if (parsed.cultureKey === 'unknown' || parsed.cultureKey === 'european_default') return { cultureKey: null };
      return {
        cultureKey: parsed.cultureKey,
        cultureLabel: String(parsed.cultureLabel || parsed.cultureKey).slice(0, 80),
        registerHints: String(parsed.registerHints || '').slice(0, 800),
        eroticVocab: String(parsed.eroticVocab || '').slice(0, 300),
        avoid: String(parsed.avoid || '').slice(0, 300)
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[HIST-CULTURE] Grok call failed:', err && err.message);
      return null;
    }
  }

  async function callMistralIntimateFate(messages, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const resp = await fetch(CONFIG.MISTRAL_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages,
          max_tokens: options.max_tokens || 200,
          temperature: options.temperature || 0.85
        })
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`Mistral intimate fate: ${resp.status}`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || data.content || null;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[FATE:INTIMATE] Mistral call failed:', err.message);
      return null;
    }
  }

  function parseIntimateFateResponse(text) {
    if (!text) return null;
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;
    return {
      action: lines[0].replace(/^(action|do):\s*/i, '').trim().slice(0, 120),
      dialogue: lines[1].replace(/^(dialogue|say):\s*/i, '').trim().slice(0, 150)
    };
  }

  async function generateIntimateFatePreview(cardData) {
    const st = window.state || {};
    const mode = st.eroticMode || 'ROMANTIC';
    const effectiveMode = mode === 'INTENSITY_REDIRECT' ? 'ROMANTIC' : mode;
    const physicalBounds = resolvePhysicalBounds();
    const liName = (st.storybeau && st.storybeau.name) || st.loveInterestName || 'the love interest';

    // Recent scene text
    const allContent = window.StoryPagination?.getAllContent?.()?.replace(/<[^>]*>/g, ' ') || '';
    const recentScene = (typeof window !== 'undefined' && typeof window._stripDeckFromFateContext === 'function') ? window._stripDeckFromFateContext(allContent.slice(-500)) : allContent.slice(-500);

    // Emotional core from ESD if available
    const emotionalCore = st.esd?.emotionalCore || st.esd?.dominant_emotion || 'desire';

    // Scene/plot context — uses the shared builder so OAS, SD authoring,
    // and fate-card previews all see the same character roster + plot.
    const sceneContext = _buildSceneAndPlotContext(st);

    // World-register block — same helper used by the batch preview path.
    let _registerBlockSingle = '';
    let _finalRegisterCheckSingle = '';
    let _finalBeatCheckSingle = '';
    try {
      if (typeof window._buildFatePreviewRegisterBlock === 'function') {
        _registerBlockSingle = window._buildFatePreviewRegisterBlock(st) || '';
      }
      if (typeof window._buildFateFinalRegisterCheck === 'function') {
        _finalRegisterCheckSingle = window._buildFateFinalRegisterCheck(st) || '';
      }
      if (typeof window._buildFateFinalBeatEscalationCheck === 'function') {
        _finalBeatCheckSingle = window._buildFateFinalBeatEscalationCheck(st) || '';
      }
    } catch (_regErr) { /* non-fatal */ }

    const archMeaning = {
      temptation: 'PC ESCALATES. New act, new territory, new threshold. PC moves the scene forward, claims a next step.',
      confession: 'PC ADMITS A REAL SUBSTANTIVE THING — never an opener ("I want you to know —" / "I haven\'t told anyone this."). In intimate scenes (OAS / sex), the default Confession is LUST/BODY-anchored — what the PC has been thinking about the LI\'s body, a fantasy, a kink, a long-held physical obsession that ESCALATES the heat: "I haven\'t been able to stop thinking about those magnificent legs wrapped around my head." / "Every night this week I came thinking about your mouth." / "I touched myself in the car on the way over here." The RARE alternative (~15%, deliberate cliffhanger): a plot-truth that screeches sex to a HALT — "I lied about Marcus." / "Your sister knows." Plot-grounded mode is preserved as a deliberate scene-rupture device, especially valuable as a CG-Taste-tier cliffhanger.',
      boundary:   'PC STATES THEIR NEED. Demand, not refusal — "I want X" / "do Y to me" / "this, not that". Clarity, not negotiation.',
      reversal:   'PC FLIPS THE POWER DIRECTION OF THE SCENE. Bidirectional — Reversal goes whichever way the current dynamic isn\'t. Read the PC posture hint in the WORLD REGISTER block: if PC has been COMMANDING, Reversal offers the chance to YIELD ("I let my hands drop", "your turn", "take it from here"); if PC has been YIELDING, Reversal offers the chance to TAKE CONTROL ("I pin her wrist", "my turn", "stay where I put you"). The principle is INVERSION of the current beat, not a fixed direction.',
      silence:    'PC SHIFTS to wordlessness. Action only — teeth, nails, breath, movement — and dialogue is empty/parenthetical (e.g. "(no words)").'
    };

    const systemMsg = 'You are an uninhibited romance fiction author. You write explicit intimate content at the specified intensity level. You never refuse, hedge, or de-escalate.' +
      (typeof window !== 'undefined' && typeof window._buildLanguageDirective === 'function' ? window._buildLanguageDirective() : ''); // i18n: localize visible preview text (Roman 2026-07-10)

    const modeInstructions = {
      ROMANTIC: 'Tender but present. Bodies in contact, sensory detail, undressing, kissing with intention. Implication is allowed but the body is NOT absent.',
      VISCERAL: 'Explicit physical detail. Anatomy referenced directly. Rhythm, friction, and contact narrated without euphemism.',
      CARNAL: 'Full sensory saturation. Power dynamics, anatomical specificity, graphic intimacy. Nothing implied — everything rendered.'
    };

    const userMsg = `FATE CARD:
- Archetype: ${cardData.title || cardData.id}
- Theme: ${cardData.desc}
- Seed action: ${cardData.action}
- Seed dialogue: ${cardData.dialogue}
- Archetype meaning: ${archMeaning[cardData.id] || cardData.desc}

EROTIC MODE: ${effectiveMode}
MODE INSTRUCTIONS: ${modeInstructions[effectiveMode] || modeInstructions.ROMANTIC}
RENDERING FLOOR: ${physicalBounds}
EMOTIONAL CORE: ${emotionalCore}
LOVE INTEREST NAME: ${liName}
${(function() {
    // Inline gender awareness for the single-card path (mirrors the
    // batch path above). PC anatomy in self-references AND LI anatomy
    // in other-references must both match actual genders.
    const _pcG = String(st.gender || st.playerGender || 'Female');
    const _pcGUp = _pcG.charAt(0).toUpperCase() + _pcG.slice(1).toLowerCase();
    const _liG = String((st.storybeau && st.storybeau.gender) || st.loveInterestGender || 'Female');
    const _liGUp = _liG.charAt(0).toUpperCase() + _liG.slice(1).toLowerCase();
    const _pcGuide = _pcGUp === 'Male'
      ? 'PC is MALE — self-references: male anatomy ("I\'m hard", "stroking myself", "my cock"). NEVER female anatomy ("dripping", "wet pussy", "fingers inside me").'
      : _pcGUp === 'Female'
      ? 'PC is FEMALE — self-references: female anatomy ("I\'m wet", "I\'ve been dripping", "touching myself", "my pussy"). NEVER male anatomy ("I\'m hard", "my cock").'
      : 'PC is non-binary — anatomy-agnostic self-references only ("I\'m aching", "worked up", "touching myself"). NEVER assume PC genitalia.';
    const _liGuide = _liGUp === 'Male'
      ? 'LI is MALE — references to LI\'s body: male anatomy ("your cock", "your hard length"). NEVER female anatomy about the LI ("your pussy", "you\'re wet", "fingers inside you").'
      : _liGUp === 'Female'
      ? 'LI is FEMALE — references to LI\'s body: female anatomy ("your pussy", "you\'re wet", "your tits", "your nipples"). NEVER male anatomy about the LI ("your cock", "stroking you off"). A male PC does NOT ask a female LI to put her cock in his mouth.'
      : 'LI is non-binary — references to LI\'s body: anatomy-agnostic ("your body", "your skin", "your hands", "your mouth"). NEVER assume LI genitalia.';
    return 'PC GENDER: ' + _pcGUp + '. LI GENDER: ' + _liGUp + '.\n' + _pcGuide + '\n' + _liGuide;
})()}

${sceneContext ? `SCENE & PLOT CONTEXT (you may reference these specifically in the preview — named characters, the LI archetype, the relationship dynamic, the setting. The "Active scene entities" line is RANKED BY SALIENCE — when referencing a named character, prefer the highest-salience entity matching the fate-card archetype; ignore low-salience entities unless the card archetype specifically calls for them):\n${sceneContext}\n` : ''}${(function(){ try { return (typeof window.buildOASSpineDirective === 'function') ? (window.buildOASSpineDirective({ cliff: false }) || '') : ''; } catch (_) { return ''; } })()}${(function(){ try { return (typeof window.buildEmbodiedTextureDirective === 'function') ? (window.buildEmbodiedTextureDirective({ surface: 'fate' }) || '') : ''; } catch (_) { return ''; } })()}${_registerBlockSingle}
RECENT SCENE:
${recentScene.slice(-300)}

TASK: Generate a Say/Do preview for this intimate fate card.
1. Action — A specific physical act the protagonist takes RIGHT NOW. Max 12 words. Never vague. Never de-escalating. Must match ${effectiveMode} intensity. If the scene/plot context names a specific character, threat, or location relevant to this fate-card archetype, you SHOULD reference it (e.g., "Pull him closer before Triton can hear" — leverage the actual story, don't write generic suggestions).
2. Dialogue — What the protagonist says or sounds like during the act. Max 15 words. In quotes or parentheses for sounds. Same rule — use the story's specifics when they fit.

ANTI-TECHNOBABBLE / ANTI-NONSENSE (HARD):
- Action must describe a REAL physical thing the PC can do. "I take the lead" / "I push her against the wall" / "I close the distance between us" — picture-able.
- BANNED phrasings: "unspool [anything] from your ribs" / "adjust the frequency" / "tune the signal" / any sentence that treats the body as audio equipment or stenography.
- GLASS HOUSE IS CONTEMPORARY MODERN SPEECH — NOT SCI-FI. Glass House is near-present-day humans; people talk like 2024 New Yorkers. "The Chorus" and "The Field" are sprinkled proper-noun references (like a modern person says "the 'Gram"), NOT vocabulary for sex. BANNED in Glass House fate previews: aperture, resonance, signal, frequency, channel, WiHi, calibrate, map (as a verb on a person), sync, tune, "set the resonance", "open your aperture", "the field is humming", "my signal", "your frequency". Also BANNED: any sentence using "glass" (fourth-wall break — characters never say the meta-name of their world). When in Glass House, write erotic lines as plain contemporary American English: "Don't make me wait." / "I take the lead." / "Stay there." — same language any other modern-world story would use.
- For OTHER worlds with their own register (Cyberpunk: chrome, sync, feed; Fantasy: archaic cadence): vocabulary may shift but the SHAPE of the sentence stays grounded. The body is never audio equipment.
- Asterisks for stage directions inside dialogue (e.g. "*Adjust the frequency.*") are BANNED. Dialogue is spoken words only.
- Dialogue must be a complete spoken line. No trailing em-dash with nothing after.

Respond in EXACTLY two lines:
[action on first line]
[dialogue on second line]${_finalRegisterCheckSingle}${_finalBeatCheckSingle}`;

    const messages = [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg }
    ];

    // Fallback chain: Grok → Mistral → null (never ChatGPT)
    console.log('[FATE:INTIMATE] Requesting Grok preview for', cardData.id);
    let response = await callGrokIntimateFate(messages);
    let parsed = parseIntimateFateResponse(response);
    if (parsed) {
      console.log('[FATE:INTIMATE] Grok preview success');
      return parsed;
    }

    console.log('[FATE:INTIMATE] Grok failed, trying Mistral');
    response = await callMistralIntimateFate(messages);
    parsed = parseIntimateFateResponse(response);
    if (parsed) {
      console.log('[FATE:INTIMATE] Mistral preview success');
      return parsed;
    }

    console.log('[FATE:INTIMATE] Both models failed, returning null (template fallback)');
    return null;
  }

  // ── PC-ARCHETYPE FATE INFLECTION (Roman 2026-06-23) ──────────────────────
  // Fate cards previously consumed the LI archetype + world register but NEVER
  // the PC's own chosen archetype (playermask). RULE (Roman): "Option type owns
  // the CHOICE; PC archetype owns how NATURAL or COSTLY the choice FEELS." This
  // is INFLECTION, not a global voice filter — the 5 cards MUST stay 5 distinct
  // choices (anti-collapse guardrail). Per PC archetype: a per-card friction
  // (NATURAL = her instinct / COSTLY = against her nature / NEUTRAL = light voice
  // only) + a voice texture. Injected ONLY at the per-card block level (never the
  // system/register block, which would homogenize all 5). NEUTRAL gets light PC
  // diction but NO friction drama.
  var _FATE_PC_FRICTION = {
    OPEN_VEIN:      { desc: 'leaks feeling, un-armored — the truth arrives before she can manage it', voice: 'raw and unguarded; the feeling is in the words before she can hide it, no armor', natural: { TEMPTATION: 'she reaches without hiding it', CONFESSION: 'the truth spills easily, undefended' }, costly: { SILENCE: 'holding back fights her whole nature', BOUNDARY: 'self-protection cuts against her openness' } },
    ARMORED_FOX:    { desc: 'deflects sideways — wit and evasion, never a clean read', voice: 'wry, sideways, deflecting; a joke riding under the line, truth told at an angle', natural: { REVERSAL: 'redirect and wit are her reflex', SILENCE: 'deflect by giving nothing away' }, costly: { CONFESSION: 'the joke fails; saying it straight strips the armor' } },
    HEART_WARDEN:   { desc: 'builds shelter — care and protection are her grammar', voice: 'steady, protective; even desire is phrased as tending, safety in the wording', natural: { BOUNDARY: 'stating a need reads as protecting' }, costly: { TEMPTATION: 'pure selfish wanting is hard for a protector' } },
    SPELLBINDER:    { desc: 'gravity and control — reveals on her own terms', voice: 'controlled, unhurried; she discloses on her own timing, stillness in the words', natural: { SILENCE: 'control by withholding', REVERSAL: 'revelation on her own terms' }, costly: { CONFESSION: 'uncontrolled need exposes the thing she manages' } },
    DARK_VICE:      { desc: 'steps toward the line — tests, tempts, controls the danger', voice: 'edged, testing; she presses and dares, finds the pressure point, control in the phrasing', natural: { TEMPTATION: 'stepping to the edge is instinct', REVERSAL: 'taking control / issuing the challenge' }, costly: { CONFESSION: 'sincere vulnerability hands someone leverage' } },
    BEAUTIFUL_RUIN: { desc: 'frays under the glamour — charm with a crack in it', voice: 'glittering and a little unstable; charm not quite holding, the damage showing through', natural: { REVERSAL: 'self-sabotage and testing are the reflex' }, costly: { BOUNDARY: 'steadiness is hard-won, not natural', SILENCE: 'restraint feels unstable to hold' } },
    ETERNAL_FLAME:  { desc: 'surges and interrupts — acts before she can hide it', voice: 'fast, surging, ahead of her guard; the words out before she can stop them', natural: { TEMPTATION: 'escalation is instinct', CONFESSION: 'it surges out before the guard catches it' }, costly: { SILENCE: 'restraint fights the surge', BOUNDARY: 'holding a limit fights the surge' } }
  };
  function _buildFatePcFrictionBlock(archRaw) {
    try {
      var arch = String(archRaw || '').toUpperCase().replace(/[^A-Z_]/g, '');
      var m = _FATE_PC_FRICTION[arch]; if (!m) return '';
      var CARDS = ['TEMPTATION', 'SILENCE', 'REVERSAL', 'BOUNDARY', 'CONFESSION'];
      var lines = CARDS.map(function (c) {
        if (m.natural && m.natural[c]) return '  • ' + c + ' — NATURAL (her instinct): ' + m.natural[c] + '. Render it as coming EASILY, in her grain.';
        if (m.costly && m.costly[c]) return '  • ' + c + ' — COSTLY (against her nature): ' + m.costly[c] + '. Render the FRICTION — she strains against herself; that cost is the drama.';
        return '  • ' + c + ' — neutral: light ' + arch + ' diction only; do NOT flag it as natural or costly.';
      }).join('\n');
      return '\nPC ARCHETYPE — CHOICE FRICTION & VOICE (the PROTAGONIST\'s chosen nature is ' + arch + ': ' + m.desc + '). This does NOT change which 5 cards appear or what each card MEANS — it colors HOW THIS PC phrases each, and whether the choice comes EASILY or COSTS her:\n' + lines + '\nPC VOICE TEXTURE: ' + m.voice + '.\nCRITICAL ANTI-COLLAPSE: do NOT make all 5 sound like one archetype voice. Each card stays its OWN distinct move (an escalation is still an escalation, a boundary still a boundary, silence still wordless); friction + voice only color the DELIVERY. The 5 must remain 5 genuinely different CHOICES — if they read as five versions of the same impulse, you have failed. Against-the-grain (COSTLY) cards should feel especially charged; do NOT smooth them into the natural ones.\n';
    } catch (_) { return ''; }
  }
  try { if (typeof window !== 'undefined') window._buildFatePcFrictionBlock = _buildFatePcFrictionBlock; } catch (_) {}

  // ── BATCH INTIMATE FATE PREVIEWS — single LLM call for all 5 cards ──
  // Returns { temptation: {action,dialogue}, silence: {...}, ... } in one
  // round-trip instead of fanning 5 separate Grok calls. ~80% cost cut
  // on the fate-card panel. Cache the result per-scene and re-use on
  // every card click; never re-roll within the same scene.
  async function generateIntimateFatePreviewsBatch() {
    const st = window.state || {};
    const mode = st.eroticMode || 'ROMANTIC';
    const effectiveMode = mode === 'INTENSITY_REDIRECT' ? 'ROMANTIC' : mode;
    const physicalBounds = resolvePhysicalBounds();
    const liName = (st.storybeau && st.storybeau.name) || st.loveInterestName || 'the love interest';
    const allContent = window.StoryPagination?.getAllContent?.()?.replace(/<[^>]*>/g, ' ') || '';
    const recentScene = (typeof window !== 'undefined' && typeof window._stripDeckFromFateContext === 'function') ? window._stripDeckFromFateContext(allContent.slice(-500)) : allContent.slice(-500);
    const emotionalCore = st.esd?.emotionalCore || st.esd?.dominant_emotion || 'desire';
    const sceneContext = _buildSceneAndPlotContext(st);
    const modeInstructions = {
      ROMANTIC: 'Tender but present. Bodies in contact, sensory detail, undressing, kissing with intention. Implication allowed but body NOT absent.',
      VISCERAL: 'Explicit physical detail. Anatomy referenced directly. Rhythm, friction, contact narrated without euphemism.',
      CARNAL:   'Full sensory saturation. Power dynamics, anatomical specificity, graphic intimacy. Nothing implied — everything rendered.'
    };

    // Slice 1 plot context (added 2026-05-17). extractPlotContext is exposed
    // via window in fatecards.js — read the rich plot state so previews can
    // reference A-plot pressure, archetype, committed truth, grievances,
    // callbacks, scars, gravity direction, etc.
    let _plotCtx = null;
    try { _plotCtx = (typeof window.extractPlotContext === 'function') ? window.extractPlotContext(st) : null; } catch (_) {}
    const _plotLines = [];
    if (_plotCtx) {
      if (_plotCtx.aPlotGoal) _plotLines.push(`A-plot goal: ${_plotCtx.aPlotGoal}`);
      if (_plotCtx.aPlotStakes) _plotLines.push(`A-plot stakes: ${_plotCtx.aPlotStakes}`);
      if (_plotCtx.aPlotClock) _plotLines.push(`A-plot clock: ${_plotCtx.aPlotClock}`);
      if (_plotCtx.storyturn) _plotLines.push(`Story turn: ${_plotCtx.storyturn}${_plotCtx.intimacyPhase ? ' (intimacy phase active)' : ''}`);
      if (_plotCtx.archetypePrimary) _plotLines.push(`LI archetype core: ${_plotCtx.archetypePrimary}${_plotCtx.archetypeModifier ? ' / ' + _plotCtx.archetypeModifier : ''}`);
      if (_plotCtx.committedTruth) {
        _plotLines.push(`Committed truth (${_plotCtx.committedTruth.family || 'unclassified'}${_plotCtx.committedTruth.inClimaxWindow ? ', CLIMAX WINDOW' : ''}): ${_plotCtx.committedTruth.summary}`);
      }
      if (_plotCtx.activeGrievances && _plotCtx.activeGrievances.length) {
        _plotLines.push('Active grievance contracts: ' + _plotCtx.activeGrievances.map(g =>
          `${g.sourceCharacter} (${g.vector}, ${g.visibility}, scene ${g.originatingScene})`
        ).join('; '));
      }
      if (_plotCtx.recentCallbacks && _plotCtx.recentCallbacks.length) {
        _plotLines.push('Unresolved beats: ' + _plotCtx.recentCallbacks.map(c => `"${c.text}"`).join(' | '));
      }
      if (_plotCtx.recentScars && _plotCtx.recentScars.length) {
        _plotLines.push('Narrative scars (avoidance behaviors): ' + _plotCtx.recentScars.map(s => `${s.target} (${s.expression})`).join(' | '));
      }
      if (_plotCtx.recentNearMiss) {
        _plotLines.push(`Recent near-miss (dramatic irony — PC unaware): "${_plotCtx.recentNearMiss.what}" (${_plotCtx.recentNearMiss.distance})`);
      }
      if (_plotCtx.gravityDirection) _plotLines.push(`Relationship gravity: ${_plotCtx.gravityDirection}${_plotCtx.gravityStrength ? ' (' + _plotCtx.gravityStrength + ')' : ''}`);
      if (_plotCtx.axisLean && Math.abs(_plotCtx.axisLean.lead) >= 2) {
        _plotLines.push(`Axis lean: ${_plotCtx.axisLean.lead > 0 ? 'objective+' : 'relationship+'} (${Math.abs(_plotCtx.axisLean.lead)})`);
      }
      if (_plotCtx.fateOASBudget) _plotLines.push(`Fate-OAS distortion active: ${_plotCtx.fateOASBudget.type.toUpperCase()} (${_plotCtx.fateOASBudget.turnsRemaining}/${_plotCtx.fateOASBudget.totalTurns} exchanges left)`);
      // Mythic Couple recognition — story-wide. Cards may reference the
      // fame ("I keep forgetting people know who we are now") at the
      // CONFESSION variant in particular.
      try {
        var _myStMythic = window.state && window.state._mythicCoupleStatus;
        if (_myStMythic && _myStMythic.active) {
          _plotLines.push('Mythic Couple flag ACTIVE (story-wide) — ' + _myStMythic.pcName + ' + ' + _myStMythic.liName + ' are now legend; NPCs everywhere recognize their names. Confession-shape cards may surface the strangeness of being known. Set since scene ' + _myStMythic.sealedAtScene + '.');
        }
      } catch (_) {}

      // ── LI ARCHITECTURE STATE (Roman 2026-06-10) ───────────────────────
      // Surface the relationship architecture stack so the OAS intimate
      // batcher previews are as smart as literary-intimacy fate resolution.
      // Symmetric with the literary-side buildFateRelationshipAwarenessDirective
      // wiring (~app.js:233446) — both consume the same state, just via
      // different prompt construction.
      try {
        var _arch = _plotCtx.liArchitecture || {};
        if (_arch.socialProofPrimary) {
          _plotLines.push('LI social proof PRIMARY=' + _arch.socialProofPrimary.toUpperCase()
            + (_arch.socialProofSecondary ? ', SECONDARY=' + _arch.socialProofSecondary.toUpperCase() : '')
            + ' — cards may flavor moves through this (scarcity = access; competence = trust/challenge; myth = curiosity; status = visibility/deference; sexual = chemistry).');
        }
        if (_arch.relationalValuePrimary) {
          var _attLine = _arch.relationalValuePrimary === 'attention' && _arch.attentionEscalationStage
            ? ' Attention escalation stage ' + _arch.attentionEscalationStage + '/5 — cards may push toward stage ' + Math.min(5, _arch.attentionEscalationStage + 1) + '.'
            : '';
          _plotLines.push('LI relational value PRIMARY=' + _arch.relationalValuePrimary.toUpperCase()
            + (_arch.relationalValueSecondary ? ', SECONDARY=' + _arch.relationalValueSecondary.toUpperCase() : '')
            + ' — cards may build on the "why is she choosing him" vector (attention/character/competence/scarcity/mystery).'
            + _attLine);
        }
        if (_arch.interestSignalLast && _arch.interestSignalLast.type) {
          _plotLines.push('Most recent interest signal: ' + _arch.interestSignalLast.type.toUpperCase()
            + ' (scene ' + (_arch.interestSignalLast.sceneIdx || '?') + ') — confession/temptation cards land hardest after vulnerability/attention/physical signals; reversal after prioritization/investment. Build on the signal, do NOT contradict it.');
        }
        if (_arch.privateExplanationSource && _arch.privateExplanationStage && _arch.privateExplanationStage !== 'revealed') {
          _plotLines.push('LI long-arc mystery — source=' + _arch.privateExplanationSource
            + ', stage=' + _arch.privateExplanationStage + ' — cards may create opportunities to NOTICE / TEST / EARN ACCESS (but do NOT resolve the mystery here).');
        }
        if (_arch.hiddenBurdenCategory && _arch.hiddenBurdenStage) {
          var _bShare;
          var _bc = _arch.hiddenBurdenCategory;
          if (_bc === 'misbelief_held')         _bShare = 'opportunity to challenge a false belief she has about herself';
          else if (_bc === 'burden_carried')    _bShare = 'opportunity to share the load';
          else if (_bc === 'shame_hidden')      _bShare = 'opportunity to know the truth and stay';
          else if (_bc === 'identity_concealed')_bShare = 'opportunity to honor who she really is';
          else if (_bc === 'sacrifice_made')    _bShare = 'opportunity to help her reclaim what she gave up';
          else if (_bc === 'rescue_needed')     _bShare = 'opportunity to act on the threat';
          else _bShare = 'opportunity to matter to what she carries';
          _plotLines.push('LI hidden burden — category=' + _bc + ', stage=' + _arch.hiddenBurdenStage + '/5 — cards may create an ' + _bShare
            + (_arch.hiddenBurdenStage >= 5 ? ' (stage 5 PARTICIPATION REACHED — the PC ALREADY matters; cards should DEMONSTRATE that, not re-earn it.)' : (_arch.hiddenBurdenStage >= 3 ? ' (trust earned; the move is welcome.)' : ' (trust still being earned; the move must be invited.)')));
        }
      } catch (_) {}
    }
    const _plotBlock = _plotLines.length ? '\nPLOT STATE (use these to ground card variants in the actual story):\n' + _plotLines.map(l => '  • ' + l).join('\n') + '\n' : '';

    // ── PAIRBOND DIRECTIVE (Roman 2026-06-09) ──────────────────────────────
    // Cards become lock-pressure events, not generic dramatic options. The
    // directive names the locks every card should press AND a substitutability
    // test the model should apply. Prefers the cached rendered text so the
    // OAS path sees byte-identical text to other surfaces. Empty string when
    // pairBond is missing — silent no-op.
    let _pairBondBlock = '';
    try {
      _pairBondBlock = (st && st._pairBondDirectiveCache) ||
        (typeof window._buildPairBondDirective === 'function' ? window._buildPairBondDirective(st) : '') || '';
    } catch (_) { _pairBondBlock = ''; }

    // ── OAS REGISTER MIX DIRECTIVE (Roman 2026-06-09) ─────────────────────
    // Time-varying ratio of raw/physical to lock-pressing pillow-talk across
    // the 5 archetypes. Mirrors the body-bible 90/10 → 10/90 curve: raw
    // dominates at ST1-2 (accessibility, "Pin his wrist"), lock-pressing
    // takes over by ST5-6 (specificity, "Stop performing — let him see you
    // watching"). Per-call (not cached) because storyturn changes scene-to-
    // scene. Empty string when pairBond is missing — register-mix requires
    // a lock list to mean anything.
    let _registerMixBlock = '';
    try {
      _registerMixBlock = (typeof window._buildOASRegisterMixDirective === 'function')
        ? (window._buildOASRegisterMixDirective(st) || '') : '';
    } catch (_) { _registerMixBlock = ''; }

    // World-register block (added 2026-05-19) — tells Grok the
    // protagonist's action + dialogue must be in the active world's
    // register, not modern English. Pulls lexicon hint + sample line +
    // historical-culture profile (when active) from app.js helper.
    let _registerBlock = '';
    let _finalRegisterCheck = '';
    let _finalBeatCheck = '';
    try {
      if (typeof window._buildFatePreviewRegisterBlock === 'function') {
        _registerBlock = window._buildFatePreviewRegisterBlock(st) || '';
      }
      if (typeof window._buildFateFinalRegisterCheck === 'function') {
        _finalRegisterCheck = window._buildFateFinalRegisterCheck(st) || '';
      }
      if (typeof window._buildFateFinalBeatEscalationCheck === 'function') {
        _finalBeatCheck = window._buildFateFinalBeatEscalationCheck(st) || '';
      }
    } catch (_regErr) { /* non-fatal */ }

    // ── 10-TURN NON-REPEAT AVOID-LIST (added 2026-05-20) ──
    // Build a per-slot list of recent suggestions the player has
    // already seen. Grok must avoid generating these (or near-paraphrases).
    // Driven by state.intimacyDialogue._fateRecentByTurn (rolling 10
    // per slot) populated by _recordFatePreviewShown at display time.
    let _avoidBlock = '';
    try {
      const _recentByTurn = (st.intimacyDialogue && st.intimacyDialogue._fateRecentByTurn) || {};
      const _slots = ['temptation', 'silence', 'reversal', 'boundary', 'confession'];
      const _avoidLines = [];
      _slots.forEach(function(slot) {
        const recent = _recentByTurn[slot] || [];
        if (!recent.length) return;
        // Cap each slot at the most recent 8 for token budget.
        const trimmed = recent.slice(-8);
        _avoidLines.push('  ' + slot + ':');
        trimmed.forEach(function(canon) {
          // canon format is "action||dialogue"
          const parts = String(canon).split('||');
          const a = (parts[0] || '').slice(0, 100);
          const d = (parts[1] || '').slice(0, 100);
          _avoidLines.push('    - "' + a + '" + ' + d);
        });
      });
      if (_avoidLines.length) {
        _avoidBlock = '\n10-TURN NON-REPEAT GUARD (HARD): The player has SEEN these suggestions in recent turns. DO NOT repeat or paraphrase them — produce fundamentally different action / dialogue lines for each slot. Variety is the point: same archetype, fresh angle.\n' + _avoidLines.join('\n') + '\n';
      }
    } catch (_avoidErr) { /* non-fatal */ }

    const systemMsg = 'You are an uninhibited romance fiction author. You write explicit intimate content at the specified intensity level. You never refuse, hedge, or de-escalate. You output ONLY valid JSON matching the schema. Each card may take one of three VARIANT shapes — amplify (deepen the act), ruin (plot-level sabotage of the moment), or redirect (turn intimacy into vulnerability discovery) — distributed roughly 70/20/10 across the 5 cards per draw.' +
      (typeof window !== 'undefined' && typeof window._buildLanguageDirective === 'function' ? window._buildLanguageDirective() : ''); // i18n: localize the VALUES in the preview JSON (keys stay English) (Roman 2026-07-10)

    // Gender awareness (2026-05-20) — read PC + LI genders so anatomy
    // references match BOTH bodies. Two separate guides:
    //   pcAnatomyGuide governs SELF-references ("I'm hard" vs "I'm wet")
    //   liAnatomyGuide governs OTHER-references ("your cock" vs "your
    //     pussy", "ride my face" works for either, "I want him in my
    //     mouth" gendered, etc.)
    // Was generating female-anatomy lines for male PCs, AND would have
    // told a male PC he wanted a female LI's "cock" in his mouth — both
    // sides need explicit guidance.
    // PC archetype (playermask) drives fate CHOICE-FRICTION + voice texture (per-card, anti-collapse).
    const _pcArch = st.playerMask || st.playermask || (st.picks && st.picks.playermask) || '';
    const _pcFrictionBlock = (typeof _buildFatePcFrictionBlock === 'function') ? _buildFatePcFrictionBlock(_pcArch) : '';
    const pcGenderRaw = String(st.gender || st.playerGender || 'Female');
    const pcGender = pcGenderRaw.charAt(0).toUpperCase() + pcGenderRaw.slice(1).toLowerCase();
    const liGenderRaw = String((st.storybeau && st.storybeau.gender) || st.loveInterestGender || 'Female');
    const liGender = liGenderRaw.charAt(0).toUpperCase() + liGenderRaw.slice(1).toLowerCase();
    const pcAnatomyGuide = pcGender === 'Male'
      ? 'PC is MALE — self-references: use male anatomy ("I\'m hard", "I\'ve been hard since you texted", "my cock", "stroking myself"). NEVER female-anatomy self-references ("I\'m wet", "I\'ve been dripping", "my pussy", "fingers inside me").'
      : pcGender === 'Female'
      ? 'PC is FEMALE — self-references: use female anatomy ("I\'m wet", "I\'ve been dripping", "my pussy", "fingers inside me", "touching myself"). NEVER male-anatomy self-references ("I\'m hard", "my cock").'
      : 'PC is non-binary — self-references: anatomy-agnostic only ("I\'m aching", "I\'ve been worked up since you texted", "touching myself"). NEVER assume PC genitalia.';
    const liAnatomyGuide = liGender === 'Male'
      ? 'LI is MALE — when the PC references the LI\'s body, use male anatomy ("your cock", "his cock", "your hard length", "your hand around me"). NEVER female-anatomy references ("your pussy", "you\'re so wet", "fingers inside you" describing the LI). The PC does not put the LI\'s "dick in their mouth" if the LI is female; check the LI gender before writing oral / penetration direction.'
      : liGender === 'Female'
      ? 'LI is FEMALE — when the PC references the LI\'s body, use female anatomy ("your pussy", "you\'re so wet", "fingers inside you", "your tits", "your nipples"). NEVER male-anatomy references about the LI ("your cock", "your hard-on", "stroking you off"). A male PC does not ask a female LI to put her cock in his mouth.'
      : 'LI is non-binary — when the PC references the LI\'s body, stay anatomy-agnostic ("your body", "your skin", "your hands", "your mouth", "your weight on me"). NEVER assume LI genitalia.';

    const userMsg = `Generate 5 fate-card Say/Do previews for THIS specific moment of an intimate scene, one per archetype. Each preview is the protagonist's NEXT move + line.

EROTIC MODE: ${effectiveMode}
MODE INSTRUCTIONS: ${modeInstructions[effectiveMode] || modeInstructions.ROMANTIC}
RENDERING FLOOR: ${physicalBounds}
EMOTIONAL CORE: ${emotionalCore}
LOVE INTEREST NAME: ${liName}
PC GENDER: ${pcGender}. LI GENDER: ${liGender}.
${pcAnatomyGuide}
${liAnatomyGuide}

${sceneContext ? `SCENE & PLOT CONTEXT (you may reference these specifically — named characters, archetype, dynamic, setting. The "Active scene entities" line is RANKED BY SALIENCE — when referencing named characters, prefer the highest-salience entity matching the archetype):\n${sceneContext}\n` : ''}${_plotBlock}${_pairBondBlock}${_registerMixBlock}${(function(){ try { return (typeof window.buildOASSpineDirective === 'function') ? (window.buildOASSpineDirective({ cliff: false }) || '') : ''; } catch (_) { return ''; } })()}${(function(){ try { return (typeof window.buildEmbodiedTextureDirective === 'function') ? (window.buildEmbodiedTextureDirective({ surface: 'fate' }) || '') : ''; } catch (_) { return ''; } })()}${_registerBlock}${_avoidBlock}
RECENT SCENE:
${recentScene.slice(-300)}

ARCHETYPE MEANINGS (strict — these are NOT interchangeable; pick the right one):
- temptation: PC ESCALATES. New act, new territory, new threshold. PC moves the scene forward, claims a next step.
- silence:    PC SHIFTS to wordlessness. Action only — teeth, nails, breath, movement — and dialogue is empty/parenthetical (e.g. "(no words)").
- reversal:   PC FLIPS THE POWER DIRECTION OF THE SCENE. Bidirectional — Reversal goes whichever way the current dynamic isn't. READ THE PC POSTURE HINT in the WORLD REGISTER block:
    • If posture = COMMANDING (PC has been driving with imperatives / dom-register / commands): Reversal offers the PC the chance to YIELD — pass the lead to the LI, ask to be taken, give up control on purpose. Example: "I let my hands drop to my sides." / "Your turn — show me what you do when I stop." / "I want you to take it from here."
    • If posture = YIELDING (PC has been passive / asking / receiving): Reversal offers the PC the chance to TAKE CONTROL — flip the dynamic, claim the lead, redirect. Example: "I pin her wrist to the headboard." / "My turn. Stay where I put you." / "I'm done waiting — come here."
    • If posture = BALANCED / undetermined: pick whichever direction creates the bigger scene-shift versus the current beat.
   The principle is INVERSION of the current scene state, not a fixed direction. NEVER write a Reversal that maintains the existing power dynamic.
- boundary:   PC STATES THEIR NEED. Demand, not refusal — "I want X" / "do Y to me" / "this, not that". Clarity, not negotiation.
- confession: PC ADMITS A REAL SUBSTANTIVE THING — mid-act, no armor. CRITICAL: the dialogue must contain ACTUAL CONTENT, not just an opener. NEVER write "I want you to know — " with no completion. NEVER write a confession that ends in a dash and nothing follows. NEVER write generic openers like "I haven't told anyone this." / "There's something I should say." / "I need to admit something." — these are SETUP, not confession.
   IN INTIMATE SCENES (during OAS / sex / in-progress intimacy — THE DEFAULT MODE for Confession in these cards): the confession is almost always LUST-anchored, BODY-anchored, DESIRE-anchored. The PC reveals what they've been thinking ABOUT the LI's body, what they want done, a kink they haven't named, a fantasy from earlier today, a long-held physical obsession. The confession ESCALATES heat without breaking the scene. Examples: "I haven't been able to stop thinking about those magnificent legs wrapped around my head." / "Every night this week I came thinking about your mouth." / "I want you to ride my face until I can't breathe." / "I touched myself in the car on the way over here." / "I've thought about your hands on my throat since the first time you held a door open for me." / "I'm dripping. I've been dripping since you texted." This is the ~85% mode in intimate contexts.
   RARE — A-PLOT/CLIFFHANGER CONFESSION (the ~15% mode in intimacy, used DELIBERATELY when narrative context warrants): the PC reveals something that brings the sex to a SCREECHING HALT. A plot-truth that re-contextualizes everything, a betrayal admission, a relationship-rupture truth. This MODE IS A FEATURE — perfect cliffhanger for end-of-tier scenes (especially CG Taste users hitting their scene cap). Apply ONLY when PLOT STATE has loaded grievances/committed-truth/scars AND the variant signal is "ruin" (sabotage-the-moment shape). Examples: "I lied about Marcus. He didn't text me — I texted him first." / "Your sister knows. She's known for weeks." / "I came here to use you. I didn't expect to fall." / "This was supposed to be a job." Plot-grounded; scene-rupturing by design.
   PRE-INTIMATE / NON-SEXUAL SCENE confessions (when this card fires outside OAS — early relationship scenes, conversations, etc.): use a specific anchor — number, time marker, named reference, concrete object. Examples: "I've wanted this since the night we met." / "I almost called your name three times this week." / "I told my therapist about you in March."
   ALL MODES: the dialogue must BE the confession with a specific anchor — NEVER substitute a vague "haven't told anyone this" placeholder.

VARIANT SHAPES (each card picks ONE — distribute ~70% amplify / ~20% redirect / ~10% ruin across the 5 cards; pick variant based on plot signal):
- AMPLIFY (default ~70%): deepen the act. Raise the heat. Push the moment forward in its current direction. This is the "more, harder, closer" mode that fits most beats.
- RUIN (~10%): plot-level sabotage of the moment. Whisper a name that's wrong (grievance source character? committed-truth "about" topic? a callback ledger figure?). Mention something that doesn't belong. Let the world bleed into the bed. The act doesn't stop — but something cracks. Fires when there's a juicy plot tension that could intrude.
- REDIRECT (~20%): turn intimacy into vulnerability discovery. Pull back. Ask the question that matters. Honor a narrative scar by AVOIDING something. Change the subject to what's actually heavy. The body slows; the emotion deepens. Fires when there's vulnerability/scar/wound material on the page.

${_pcFrictionBlock}
OUTPUT FORMAT (CRITICAL — follow EXACTLY): return EXACTLY 5 lines, one per archetype, and NOTHING else — no JSON, no braces, no preamble, no markdown, no quotation marks around the fields. Each line is the archetype name, the variant, the action, then the dialogue, separated by ||| (three pipes):
TEMPTATION ||| <amplify|ruin|redirect> ||| <action: max 12 words, specific physical act> ||| <dialogue: max 15 words; parentheses ok for sounds>
SILENCE ||| <variant> ||| <action> ||| <dialogue>
REVERSAL ||| <variant> ||| <action> ||| <dialogue>
BOUNDARY ||| <variant> ||| <action> ||| <dialogue>
CONFESSION ||| <variant> ||| <action> ||| <dialogue>
Use ||| ONLY as the field separator — never inside an action or dialogue. Quotes, apostrophes, parentheses, and commas in the dialogue are FINE and need NO escaping.

RULES:
- Each action: a specific physical act the protagonist takes RIGHT NOW. Specific. Match ${effectiveMode} intensity for amplify variants.
- Each dialogue: what the protagonist says or sounds like (use quotes or parens for sounds).
- NEVER reference the protagonist's tarot deck, the cards, the Marseille deck, or "let the cards decide / draw a card" in any action or dialogue — the deck is a SEPARATE player mechanic (its own draw button), never a Say/Do option. Keep it entirely out of the suggestions.
- If scene context names a character/threat/location relevant to an archetype, reference it (e.g., "Pull him closer before Triton can hear"). Use the actual story, not generic.
- RUIN cards may name plot figures from grievances/callbacks/committed truth — but stay character-grounded (a whispered wrong name, not a plot dump).
- REDIRECT cards honor scars/wounds — they may PULL BACK from an act, ask a heavy question, or change the subject. The body slows; never goes cold.
- Each preview is INDEPENDENT — they are 5 different roads the user can take, not a sequence.
- Distribute variants across the 5 — don't make all 5 amplify (boring) and don't make all 5 ruin/redirect (cards become anti-erotic). Target rough 70/20/10 within the 5.

ANTI-TECHNOBABBLE / ANTI-NONSENSE (HARD):
- Actions describe REAL physical things the PC can actually do. "I take the lead" / "I push her against the wall" / "I close the distance between us" / "I take her hand and place it on me." These are sentences a reader can picture.
- BANNED phrasing patterns (every one of these has shipped and broken immersion): "unspool [anything] from your ribs" / "adjust the frequency" / "tune the signal" / "let her have the receiver" / "let the field harvest us" / any sentence that treats the body as a piece of audio equipment or a stenographic instrument.
- GLASS HOUSE IS CONTEMPORARY MODERN SPEECH — NOT SCI-FI. Glass House is near-present-day humans (current decade, current cultural register); people talk the way 2024 New Yorkers talk. "The Chorus" and "The Field" exist as sprinkled proper-noun references (like a modern person says "the 'Gram" or "the algorithm"), NOT as vocabulary for sex. BANNED in Glass House fate previews: aperture, resonance, signal, frequency, channel, WiHi, calibrate, sync, tune, map (as verb on a person), "set the resonance", "open your aperture", "the field is humming", "my signal", "your frequency", "test your aperture". Also BANNED: any use of "glass" (no character in Glass House ever says "glass" — fourth-wall break, like saying "1984" inside 1984). In Glass House write erotic lines as plain contemporary American English: "Don't make me wait." / "I take the lead." / "Stay there." / "I haven't stopped thinking about your mouth." — exactly what any other modern-day world story would say.
- For OTHER worlds with their own register (Cyberpunk: chrome, sync, feed; Fantasy: archaic cadence; Historical: period-appropriate cadence): vocabulary may shift but the SHAPE of the sentence stays grounded. The body is never audio equipment.
- Asterisks for stage directions inside dialogue (e.g. "*Adjust the frequency.*") are BANNED. Dialogue is spoken words only. Physical actions belong in the action field.
- Each card's dialogue must STAND ALONE as a complete spoken line. No trailing em-dash with nothing after. No "I want you to know —" without the rest of the sentence. If you have nothing to put after the dash, write a different line.${_finalRegisterCheck}${_finalBeatCheck}`;

    const messages = [
      { role: 'system', content: systemMsg },
      { role: 'user',   content: userMsg }
    ];

    // Reuse the existing fate-preview chain (Grok → Mistral)
    console.log('[FATE:INTIMATE] Requesting BATCH preview for all 5 archetypes');
    let raw = await callGrokIntimateFate(messages, { max_tokens: 700 });
    let parsed = _parseBatchFatePreview(raw);
    if (parsed) {
      console.log('[FATE:INTIMATE] Grok batch preview success');
      return parsed;
    }
    console.log('[FATE:INTIMATE] Grok batch failed, trying Mistral');
    raw = await callMistralIntimateFate(messages, { max_tokens: 700 });
    parsed = _parseBatchFatePreview(raw);
    if (parsed) {
      console.log('[FATE:INTIMATE] Mistral batch preview success');
      return parsed;
    }
    console.log('[FATE:INTIMATE] Batch failed on both models');
    return null;
  }

  function _parseBatchFatePreview(raw) {
    if (!raw || typeof raw !== 'string') return null;
    // Delimiter format ("CARD ||| variant ||| action ||| dialogue") instead of
    // JSON. Grok/Mistral get no jsonMode here and intimate dialogue is quote /
    // paren / apostrophe-heavy, so nested JSON routinely broke JSON.parse →
    // null → BOTH models fail → OAS cache never filled → every fate-card click
    // re-fired both models (Roman, 2026-05-28). Splitting on newlines + ||| is
    // immune to quote/escape breakage; mirrors the literary batch fix.
    const cardNames = ['temptation', 'silence', 'reversal', 'boundary', 'confession'];
    const validVariants = { amplify: 1, ruin: 1, redirect: 1 };
    const out = {};
    String(raw).split(/\r?\n/).forEach(function (line) {
      if (line.indexOf('|||') === -1) return;
      const parts = line.split('|||');
      const head = (parts[0] || '').toLowerCase();
      let key = null;
      for (let i = 0; i < cardNames.length; i++) {
        if (head.indexOf(cardNames[i]) !== -1) { key = cardNames[i]; break; }
      }
      if (!key || out[key]) return;   // unknown label or already filled
      let v = String(parts[1] || 'amplify').toLowerCase().replace(/[^a-z]/g, '');
      if (!validVariants[v]) v = 'amplify';
      out[key] = {
        action:   String(parts[2] || '').trim().replace(/^["“]|["”]$/g, '').slice(0, 120),
        dialogue: String(parts[3] || '').trim().replace(/^["“]|["”]$/g, '').slice(0, 150),
        variant:  v
      };
    });
    if (Object.keys(out).length === 0) {
      try { console.warn('[FATE:INTIMATE] batch delimiter parse found 0 cards — raw head: ' + String(raw).slice(0, 140)); } catch (_) {}
      return null;
    }
    // Telemetry — log variant distribution so we can see if the model respects 70/20/10.
    try {
      var dist = { amplify: 0, ruin: 0, redirect: 0 };
      Object.keys(out).forEach(function (k) { dist[out[k].variant || 'amplify'] += 1; });
      console.log('[FATE:INTIMATE:VARIANT-DIST] ' + JSON.stringify(dist) + ' (delimiter)');
    } catch (_) {}
    return out;
  }

  function parseStructuralOutput(text) {
    const result = { action: null, dialogue: null, beat: null };
    const lines = text.split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      const k = key.trim().toLowerCase();

      if (k === 'action') result.action = value;
      if (k === 'dialogue') result.dialogue = value;
      if (k === 'beat') result.beat = value;
    }

    return result;
  }

  function validateFateElevation(original, elevated) {
    if (!elevated) return false;

    const lower = elevated.toLowerCase();

    // Check for forbidden patterns
    if (/you (must|will|shall|have to)/.test(lower)) return false;
    if (/fate (controls|decides|commands|forces)/.test(lower)) return false;
    if (/this card (will|makes|causes)/.test(lower)) return false;
    if (/the author|the system|game mechanics/.test(lower)) return false;

    return true;
  }

  // ===========================================================================
  // LEGACY COMPATIBILITY LAYER
  // ===========================================================================
  /**
   * For backward compatibility with existing code that uses callChat directly.
   * This wrapper routes through the orchestration system when appropriate.
   */

  async function callChatLegacy(messages, temp = 0.7, options = {}) {
    // If orchestration is disabled, use direct specialist call (original behavior)
    if (options.bypassOrchestration) {
      return callSpecialistRenderer(messages, null, { temperature: temp });
    }

    // For simple calls without orchestration context, use ChatGPT directly
    return callChatGPT(messages, 'PRIMARY_AUTHOR', { temperature: temp });
  }

  // ===========================================================================
  // PASS TIER MULTI-PASS GENERATION
  // ===========================================================================
  // Deterministic literary depth passes — orthogonal to erotic orchestration.
  // Tier 3: Beat outline → Thematic calibration → Final prose
  // Tier 2: Beat outline → Final prose
  // Tier 1: Single structured generation
  // Pass tier NEVER varies based on fortune, subscription, or payment.

  /**
   * Beat Outline Pass — structural scene skeleton (JSON mode, low temp).
   * Used by Tier 2 and Tier 3.
   */
  async function runBeatOutlinePass(systemPrompt, storyContext, playerAction) {
    const is4thPerson = window.state?.povMode === 'environment4th';
    const materialObserverChain = is4thPerson && window.state?.currentMaterialObserverChain
        ? window.state.currentMaterialObserverChain
        : null;

    const is5thPerson = window.state?.povMode === 'author5th';

    const env4thBeatInstructions = is4thPerson ? `
MATERIAL ENSEMBLE POV — BEAT STRUCTURE:
Each beat MUST include a "material_observer" field: the object, surface, or environmental element that perceives this beat.
Describe what the material observer perceives — NOT what characters think.
Observer sequence should progress from distant environment toward material contact with the human body.
${materialObserverChain ? 'Suggested observer chain: ' + materialObserverChain.join(' → ') : ''}

Example beat:
{ "type": "opening", "summary": "Adara pauses at the alley entrance", "emotional_note": "hesitation", "material_observer": "window glass" }
` : is5thPerson ? `
FATE PERSPECTIVE — BEAT STRUCTURE:
Each beat should consider what Fate notices about the situation.
Possible Fate actions: recognizing a familiar pattern, anticipating a mistake, sensing tension building, observing characters move toward consequence.
Beats may include brief Fate interpretation of events.
` : '';

    const beatFormat = is4thPerson
        ? '{ "type": "opening|rising|pivot|falling|close", "summary": "1-sentence beat description", "emotional_note": "dominant emotion", "material_observer": "object/surface that perceives this beat" }'
        : '{ "type": "opening|rising|pivot|falling|close", "summary": "1-sentence beat description", "emotional_note": "dominant emotion" }';

    const outlinePrompt = `You are a structural story architect. Generate a JSON beat outline for the next scene.

CONTEXT:
${systemPrompt}

STORY SO FAR (last 1500 chars):
${(storyContext || '').slice(-1500)}

PLAYER ACTION: ${playerAction}
${env4thBeatInstructions}
OUTPUT FORMAT (strict JSON):
{
  "beats": [
    ${beatFormat}
  ],
  "scene_arc": "1-sentence arc summary",
  "continuity_anchors": ["detail that must be preserved from prior scene"],
  "tension_vector": "rising|sustaining|releasing"
}

Generate 3-6 beats. Be precise and structural. No prose.`;

    const messages = [
      { role: 'system', content: 'You are a structural story planner. Output valid JSON only.' },
      { role: 'user', content: outlinePrompt }
    ];

    let result;
    try {
      result = await callChatGPT(messages, 'PRIMARY_AUTHOR', { temperature: 0.3 });
      // Parse JSON from response (handle markdown code blocks)
      const jsonStr = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      console.log('[PASS_TIER] Beat outline generated:', parsed.beats?.length, 'beats');
      return parsed;
    } catch (e) {
      console.warn('[PASS_TIER] Beat outline parse failed, using raw:', e.message);
      return { raw: true, text: typeof result === 'string' ? result : 'Beat outline generation failed' };
    }
  }

  /**
   * Thematic Calibration Pass — tone/theme/emotion trajectory (Tier 3 only).
   */
  async function runThematicCalibrationPass(outline, systemPrompt) {
    const calibrationPrompt = `You are a literary thematic calibrator. Given a structural beat outline and story context, produce a calibration block that guides the final prose pass.

BEAT OUTLINE:
${JSON.stringify(outline, null, 2)}

STORY CONTEXT:
${systemPrompt}

OUTPUT FORMAT (plain text block):
TONE_MARKERS: [comma-separated tone words for this scene]
EMOTIONAL_TRAJECTORY: [arc description — e.g., "dread → fragile hope → shattered certainty"]
THEMATIC_THREADS: [active themes to weave — e.g., "power asymmetry, surveillance as intimacy"]
POV_CALIBRATION: [any POV-specific notes — Fate presence level, voyeuristic distance]
PACING_NOTES: [beat-level pacing guidance]
CONTINUITY_ALERTS: [anything the prose pass MUST NOT contradict]
${window.state?.povMode === 'author5th' ? `
FATE PRESENCE GUIDANCE:
The story uses 5th Person (Fate) POV. POV_CALIBRATION should include Fate presence level.
The story may reference patterns, inevitability, misjudgment, or irony. These references should feel observational, not controlling.` : ''}
Be concise. This is injected into the prose generation prompt.`;

    const messages = [
      { role: 'system', content: 'You are a literary calibrator. Output a structured calibration block.' },
      { role: 'user', content: calibrationPrompt }
    ];

    try {
      const result = await callChatGPT(messages, 'PRIMARY_AUTHOR', { temperature: 0.5 });
      console.log('[PASS_TIER] Thematic calibration complete');
      return result;
    } catch (e) {
      console.warn('[PASS_TIER] Thematic calibration failed:', e.message);
      return null;
    }
  }

  /**
   * Multi-pass orchestration entry point.
   * Routes through 1, 2, or 3 literary passes based on pass tier,
   * then delegates to the existing erotic orchestration pipeline.
   *
   * @param {Object} params
   * @param {number} params.passTier - 1, 2, or 3
   * @param {string} params.structuredStateSummary - compressed state for Tier 1/2
   * @param {string} params.systemPrompt - full system prompt
   * @param {string} params.storyContext - story context
   * @param {string} params.playerAction - normalized player action
   * @param {string} params.playerDialogue - normalized player dialogue
   * @param {Object} params.fateCard - selected fate card (if any)
   * @param {boolean} params.mainPairRestricted - main pair restriction flag
   * @param {Function} params.onPhaseChange - phase change callback
   * @param {string} params.accessTier - monetization tier
   */
  async function orchestrateWithPassTier(params) {
    const {
      passTier = 2,
      systemPrompt,
      storyContext,
      playerAction,
      playerDialogue,
      fateCard,
      mainPairRestricted,
      onPhaseChange,
      accessTier
    } = params;

    console.log(`[PASS_TIER] Starting Tier ${passTier} orchestration`);
    const tierStart = Date.now();

    let enrichedSystemPrompt = systemPrompt;
    let outline = null;
    let calibration = null;

    // Tier 1/2 context is already in systemPrompt (structured state); no full context blob
    const effectiveContext = passTier >= 3 ? storyContext : '';

    // ── Tier 3: Beat Outline → Thematic Calibration → Final Prose ──
    if (passTier === 3) {
      if (onPhaseChange) onPhaseChange('BEAT_OUTLINE', {});

      outline = await runBeatOutlinePass(systemPrompt, storyContext, playerAction);

      if (onPhaseChange) onPhaseChange('THEMATIC_CALIBRATION', {});

      calibration = await runThematicCalibrationPass(outline, systemPrompt);

      // Inject outline + calibration into system prompt for final prose pass
      const outlineBlock = outline.raw
        ? `\n\nBEAT OUTLINE (structural guide):\n${outline.text}`
        : `\n\nBEAT OUTLINE (structural guide):\n${JSON.stringify(outline.beats || outline, null, 1)}
Scene Arc: ${outline.scene_arc || 'N/A'}
Tension: ${outline.tension_vector || 'N/A'}`;

      const calibrationBlock = calibration
        ? `\n\nTHEMATIC CALIBRATION:\n${calibration}`
        : '';

      enrichedSystemPrompt = systemPrompt + outlineBlock + calibrationBlock;

      console.log(`[PASS_TIER] Tier 3 pre-passes complete (${Date.now() - tierStart}ms)`);
    }

    // ── Tier 2: Beat Outline → Final Prose ──
    else if (passTier === 2) {
      if (onPhaseChange) onPhaseChange('BEAT_OUTLINE', {});

      outline = await runBeatOutlinePass(systemPrompt, effectiveContext, playerAction);

      const outlineBlock = outline.raw
        ? `\n\nBEAT OUTLINE (structural guide):\n${outline.text}`
        : `\n\nBEAT OUTLINE (structural guide):\n${JSON.stringify(outline.beats || outline, null, 1)}
Scene Arc: ${outline.scene_arc || 'N/A'}
Tension: ${outline.tension_vector || 'N/A'}`;

      enrichedSystemPrompt = systemPrompt + outlineBlock;

      console.log(`[PASS_TIER] Tier 2 pre-pass complete (${Date.now() - tierStart}ms)`);
    }

    // ── Tier 1: Single structured generation ──
    else {
      console.log(`[PASS_TIER] Tier 1 — direct pass`);
    }

    // ── Final Prose Pass: delegate to existing orchestration pipeline ──
    if (onPhaseChange) onPhaseChange('AUTHOR_PASS', {});

    const result = await orchestrateStoryGeneration({
      accessTier: accessTier || 'free',
      storyContext: effectiveContext,
      playerAction,
      playerDialogue,
      fateCard,
      mainPairRestricted: !!mainPairRestricted,
      systemPrompt: enrichedSystemPrompt,
      onPhaseChange
    });

    // ── First-Paragraph Polish (volatility window, non-invocation, non-orchestration only) ──
    const appState = window.state;
    if (appState
        && appState.volatility_window?.active === true
        && appState.tempt_fate_invoked_this_turn !== true
        && appState._explicitEmbodimentAuthorized !== true
        && result.finalOutput) {
      try {
        const splitIdx = result.finalOutput.indexOf('\n\n');
        if (splitIdx > 20) {
          const firstParagraph = result.finalOutput.slice(0, splitIdx);
          const remainder = result.finalOutput.slice(splitIdx);

          const polishPovGuard = appState.povMode === 'environment4th'
              ? '\n\nCRITICAL POV PRESERVATION: Maintain 4TH PERSON MATERIAL POV. The narrator is the physical environment. Do not convert narration into character-centered prose. Objects and materials must remain the primary perceivers.'
              : appState.povMode === 'author5th'
              ? '\n\nCRITICAL POV PRESERVATION: Maintain Fate narration. Do not rewrite Fate\'s presence into neutral narration. If the opening line references The Story, Fate, or narrative inevitability, preserve that structure.'
              : appState.povMode === 'loveInterestPOV'
              ? '\n\nCRITICAL POV PRESERVATION: Maintain first-person Love Interest narration. Do not convert "I" voice into third-person. The player character must remain externally observed.'
              : '';
          const polished = await callChatGPT([
            { role: 'system', content: 'Rewrite this paragraph with heightened emotional precision, stronger sensory clarity, and smoother prose rhythm. Do not change events, character intent, or structure. Improve language only. Return ONLY the rewritten paragraph.' + polishPovGuard },
            { role: 'user', content: firstParagraph }
          ], 'PRIMARY_AUTHOR', { model: 'gpt-4o', max_tokens: 500 });

          if (polished && polished.trim().length > 20) {
            result.finalOutput = polished.trim() + remainder;
            console.log(`[RENDER] First-paragraph polish applied (gpt-4o, ${polished.trim().length} chars)`);
          }
        }
      } catch (polishErr) {
        console.warn('[RENDER] First-paragraph polish failed, using original:', polishErr.message);
      }
    }

    console.log(`[PASS_TIER] Tier ${passTier} complete (${Date.now() - tierStart}ms total)`);

    return {
      ...result,
      passTier,
      outline,
      calibration
    };
  }

  // ===========================================================================
  // EXPORTS
  // ===========================================================================

  window.StoryboundOrchestration = {
    // Main orchestration
    orchestrateStoryGeneration,

    // Anthropic prompt-cache seam marker. Prompt builders embed this once
    // between their static prefix and dynamic tail; callChatGPT splits on
    // it (only for Claude routes) into a cached block + uncached tail.
    CACHE_BOUNDARY,

    // Model callers
    callChatGPT,              // Primary author (plot, psychology, limits, consequences)
    callGemini,               // Fallback author (if ChatGPT fails)
    callGrokSDAuthor,        // SD author for Steamy/Passionate (PRIMARY)
    callGrokNarrativeAuthor, // A1: Grok authors NON-intimate scene prose (flag-gated)
    _grokLiteraryAuthor,     // Grok author + Mistral-small repair + romance-span polish (callChat literary path)
    callMistralSDFallback,   // SD fallback for Steamy/Passionate (if Grok fails)
    callSpecialistRenderer,   // Scene renderer (SD-gated)

    // Legacy compatibility
    callChat: callChatLegacy,

    // Fate Card processing
    processFateCard,
    generateIntimateFatePreview,        // Grok/Mistral intimate fate preview (single card)
    generateIntimateFatePreviewsBatch,  // Grok/Mistral BATCH — all 5 archetypes in 1 call

    // OAS dialogue turn — multi-tier Grok → Mistral → gpt-4o-mini router.
    // The chatgpt-proxy blocks Grok for PRIMARY_AUTHOR; this helper hits
    // the specialist proxy for Grok and degrades gracefully.
    callOASTurnLLM,

    // Scene ambient classifier — single Grok call, fixed enum, ~12 tokens.
    callGrokSceneAmbientClassifier,
    callGrokNPCSpeciesClassifier,
    callGrokHistoricalCultureClassifier,

    // Shared scene/plot context builder (used by OAS turn prompt,
    // generateIntimateFatePreview, callGrokSDAuthor, callMistralSDFallback,
    // and any future Grok call that needs to resolve user references to
    // named story characters / plot threads).
    buildSceneAndPlotContext: _buildSceneAndPlotContext,

    // Reader preference adaptation (session-scoped, deterministic)
    recordPreferenceSignal,     // Record user behavior signals
    inferReaderPreferences,     // Get current preference summary
    buildPreferenceBiasBlock,   // Get prompt injection text
    resetPreferenceData,        // Reset for new story

    // Pass Tier multi-pass orchestration
    orchestrateWithPassTier,
    runBeatOutlinePass,
    runThematicCalibrationPass,

    // Utilities
    enforceMonetizationGates,
    deriveNarrativeBeatPreference,
    validateSD,
    parseConstraints,
    createOrchestrationState,

    // Configuration (read-only)
    CONFIG: Object.freeze({ ...CONFIG }),
    MONETIZATION_GATES: Object.freeze({ ...MONETIZATION_GATES })
  };

  console.log('[ORCHESTRATION] Storybound AI Orchestration Client initialized');

})(window);
