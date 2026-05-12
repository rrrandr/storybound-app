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
  function _accumulateTokens(data, modelName) {
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
  }

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
    FATE_STRUCTURAL_MODEL: 'gpt-4o-mini',
    FATE_ELEVATION_MODEL: 'gpt-4o-mini',
    STRATEGY_PASS_MODEL: 'gpt-4o-mini',          // Strategy pre-pass: structural decisions (low temp)
    STRUCTURAL_CORRECTION_MODEL: 'gpt-4o-mini',  // Post-render additive correction (Pass 4)

    // Anthropic prose-tier models (require /api/anthropic-proxy endpoint —
    // not yet wired; resolveRenderTier returns these slugs but the proxy
    // dispatcher will need to route them once the endpoint exists).
    OPUS_MODEL:   'claude-opus-4-1',     // Opus 4.x — top-quality prose, $15/$75 per M tokens. Reserved for Tier A major scenes.
    SONNET_MODEL: 'claude-sonnet-4-5',   // Sonnet 4.x — strong prose, $3/$15 per M tokens. Tier A in-between + Tier B Scene 1.

    // Model allowlists (must match server-side)
    ALLOWED_PRIMARY_MODELS: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'claude-opus-4-1', 'claude-sonnet-4-5'],
    ALLOWED_FALLBACK_MODELS: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    ALLOWED_SD_AUTHOR_MODELS: ['grok-4-1-fast-reasoning'],
    ALLOWED_SD_DEEPSEEK_MODELS: ['deepseek-v4-pro', 'deepseek-v4-flash'],
    ALLOWED_SD_FALLBACK_MODELS: ['mistral-medium-latest', 'mistral-large-latest'],
    ALLOWED_RENDERER_MODELS: ['grok-4-1-fast-non-reasoning'],
    ALLOWED_SCENE_RENDERER_MODELS: ['grok-4-1-fast-reasoning'],

    // Feature flags
    ENABLE_SPECIALIST_RENDERER: true,
    ENABLE_FATE_ELEVATION: true,
    ENABLE_GROK_SD_AUTHORING: true,   // Grok authors SD for Steamy/Passionate
    ENABLE_DEEPSEEK_SD: true,         // DeepSeek V4 Pro/Flash fallback (Tier 1 + 2)
    ENABLE_MISTRAL_SD: true, // Mistral fallback if Grok fails (Steamy/Passionate ONLY)

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
   *   Major scene (Scene 1, apex, betrayal, ST3+, ending)  → OPUS
   *   In-between scene                                      → SONNET
   *   Triggers: 5th Person, 4th Person, WryConfession, billionaire_modern,
   *   glass_house, fated_blood, arcane_binding, the_beyond, cursed,
   *   endless_edit, quieting_event, angry_room, dogma, post_human,
   *   simulation, prehistoric, experimental modes.
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
    // Major scene → Opus. In-between → Sonnet. See _INTRICATE_FLAVORS
    // and _isIntricateContext for the full inclusion criteria.
    if (_isIntricateContext(appState)) {
      if (_isMajorScene(appState)) {
        // Opus for the moments readers screenshot: Scene 1, apex,
        // Tempt Fate, ST3-ST6 (intimacy / consequence / betrayal /
        // climax-ending), ending convergence window.
        const reason = appState.turnCount === 1 ? 'TierA:Scene1:Opus'
          : appState.tempt_fate_invoked_this_turn ? 'TierA:Tempt:Opus'
          : appState._currentSceneImportance === 'apex' ? 'TierA:Apex:Opus'
          : (appState.storyturn === 'ST5' || appState.storyturn === 'ST6') ? 'TierA:Betrayal:Opus'
          : appState.storyturn === 'ST3' ? 'TierA:ST3:Opus'
          : appState.storyturn === 'ST4' ? 'TierA:ST4:Opus'
          : 'TierA:Major:Opus';
        return { model: CONFIG.OPUS_MODEL, max_tokens: 2400, tier: 'A', reason: reason };
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
    const payload = {
      messages,
      role,
      model: options.model || roleModelMap[role] || CONFIG.PRIMARY_AUTHOR_MODEL,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1500
    };

    // Add JSON mode if requested
    if (options.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    // Route Anthropic models to the Anthropic proxy. The proxy shape is
    // identical (same payload + same normalized response) so the rest of
    // the callsite is unchanged. Claude slugs start with 'claude-'.
    const _isClaudeModel = typeof payload.model === 'string' && payload.model.indexOf('claude-') === 0;
    const _proxyUrl = _isClaudeModel ? CONFIG.ANTHROPIC_PROXY : CONFIG.CHATGPT_PROXY;

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
        throw new Error(`ChatGPT API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      _accumulateTokens(data, payload && payload.model);

      // Normalized response shape: use data.content (string from proxy)
      // Fallback to legacy choices[0].message.content for backward compat
      const text = data.content ?? data.choices?.[0]?.message?.content ?? null;

      if (!text && text !== '') {
        const receivedKeys = Object.keys(data);
        console.error('[ORCHESTRATION] Proxy returned 200 but no content field. Keys:', receivedKeys);
        throw new Error(`ChatGPT returned 200 but payload missing content field. Received keys: [${receivedKeys.join(', ')}]`);
      }

      return text;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('ChatGPT request timed out');
      }
      throw err;
    }
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
      _accumulateTokens(data, payload && payload.model);

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
      _accumulateTokens(data, payload && payload.model);

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
      _accumulateTokens(data, payload && payload.model);

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
        ranked.push({
          name: cand.name,
          role: cand.role,
          salience: salience,
          emotionalCharge: emotionalCharge,
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
    const activeEntities = _buildActiveSceneEntities(st, scanSlice, promptSlice);
    if (activeEntities.length) {
      const entityLines = activeEntities.map(e => {
        const parts = [e.role];
        parts.push('salience ' + e.salience.toFixed(2));
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

  async function callGrokSDAuthor(constraints, gateEnforcement, options = {}) {
    console.log(`[GROK SD] Authoring SD — intimacy authorized`);

    const _expressionModeBlock = _buildExpressionModeBlock('GROK SD');

    const esdPrompt = `You are the SD AUTHOR for Storybound intimate scenes.

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
          : '')
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
      _accumulateTokens(data, payload && payload.model);

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
      _accumulateTokens(data, payload && payload.model);

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
          : '')
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
      _accumulateTokens(data, payload && payload.model);

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

          const messages = [
            { role: 'system', content: rendererPrompt.system + '\n\n' + continuityBlock + sceneContextDirective + plotRefDirective + phaseDirective + fateOverrideDirective + continuationDirective + invitationDirective },
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

    // Premium render tier — dynamic model + token selection
    const renderTier = resolveRenderTier();
    // Track last render model for momentum window (next scene continuity)
    if (window.state) window.state._lastRenderModel = renderTier.model;
    console.log(`[RENDER] Tier: ${renderTier.tier} | Model: ${renderTier.model} | max_tokens: ${renderTier.max_tokens} | reason: ${renderTier.reason}`);

    try {
      authorOutput = await callChatGPT(messages, 'PRIMARY_AUTHOR', {
        model: renderTier.model,
        max_tokens: renderTier.max_tokens
      });
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

    return {
      system: `You are a SPECIALIST RENDERER for intimate scenes.
${env4thBlock}${rendererVoiceAnchor}
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
${eroticModeBlock}${_grokIntimacyStanceBlock}
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
            console.log('[OAS-LLM] Mistral ok');
            return text;
          }
        } else {
          console.warn('[OAS-LLM] Mistral HTTP ' + resp.status);
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
    // Speed-first chain (default).
    console.log('[OAS-LLM] Mode: FAST (speed chain)');
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
    const timeoutId = setTimeout(() => controller.abort(), 6000);
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
      return data.choices?.[0]?.message?.content || data.content || null;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[FATE:INTIMATE] Grok call failed:', err.message);
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
    const recentScene = allContent.slice(-500);

    // Emotional core from ESD if available
    const emotionalCore = st.esd?.emotionalCore || st.esd?.dominant_emotion || 'desire';

    // Scene/plot context — uses the shared builder so OAS, SD authoring,
    // and fate-card previews all see the same character roster + plot.
    const sceneContext = _buildSceneAndPlotContext(st);

    const archMeaning = {
      temptation: 'Escalate. New act, new territory, new threshold.',
      confession: 'Admit what you want. Mid-act, no armor.',
      boundary: 'State your need. Demand, not refusal.',
      reversal: 'Power changes hands. Take or yield.',
      silence: 'No words. Teeth, nails, breath, movement.'
    };

    const systemMsg = 'You are an uninhibited romance fiction author. You write explicit intimate content at the specified intensity level. You never refuse, hedge, or de-escalate.';

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

${sceneContext ? `SCENE & PLOT CONTEXT (you may reference these specifically in the preview — named characters, the LI archetype, the relationship dynamic, the setting. The "Active scene entities" line is RANKED BY SALIENCE — when referencing a named character, prefer the highest-salience entity matching the fate-card archetype; ignore low-salience entities unless the card archetype specifically calls for them):\n${sceneContext}\n` : ''}
RECENT SCENE:
${recentScene.slice(-300)}

TASK: Generate a Say/Do preview for this intimate fate card.
1. Action — A specific physical act the protagonist takes RIGHT NOW. Max 12 words. Never vague. Never de-escalating. Must match ${effectiveMode} intensity. If the scene/plot context names a specific character, threat, or location relevant to this fate-card archetype, you SHOULD reference it (e.g., "Pull him closer before Triton can hear" — leverage the actual story, don't write generic suggestions).
2. Dialogue — What the protagonist says or sounds like during the act. Max 15 words. In quotes or parentheses for sounds. Same rule — use the story's specifics when they fit.

Respond in EXACTLY two lines:
[action on first line]
[dialogue on second line]`;

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
    const recentScene = allContent.slice(-500);
    const emotionalCore = st.esd?.emotionalCore || st.esd?.dominant_emotion || 'desire';
    const sceneContext = _buildSceneAndPlotContext(st);
    const modeInstructions = {
      ROMANTIC: 'Tender but present. Bodies in contact, sensory detail, undressing, kissing with intention. Implication allowed but body NOT absent.',
      VISCERAL: 'Explicit physical detail. Anatomy referenced directly. Rhythm, friction, contact narrated without euphemism.',
      CARNAL:   'Full sensory saturation. Power dynamics, anatomical specificity, graphic intimacy. Nothing implied — everything rendered.'
    };

    const systemMsg = 'You are an uninhibited romance fiction author. You write explicit intimate content at the specified intensity level. You never refuse, hedge, or de-escalate. You output ONLY valid JSON matching the schema.';

    const userMsg = `Generate 5 fate-card Say/Do previews for THIS specific moment of an intimate scene, one per archetype. Each preview is the protagonist's NEXT move + line.

EROTIC MODE: ${effectiveMode}
MODE INSTRUCTIONS: ${modeInstructions[effectiveMode] || modeInstructions.ROMANTIC}
RENDERING FLOOR: ${physicalBounds}
EMOTIONAL CORE: ${emotionalCore}
LOVE INTEREST NAME: ${liName}

${sceneContext ? `SCENE & PLOT CONTEXT (you may reference these specifically — named characters, archetype, dynamic, setting. The "Active scene entities" line is RANKED BY SALIENCE — when referencing named characters, prefer the highest-salience entity matching the archetype):\n${sceneContext}\n` : ''}
RECENT SCENE:
${recentScene.slice(-300)}

ARCHETYPE MEANINGS:
- temptation: Escalate. New act, new territory, new threshold.
- silence:    No words. Teeth, nails, breath, movement.
- reversal:   Power changes hands. Take or yield.
- boundary:   State your need. Demand, not refusal.
- confession: Admit what you want. Mid-act, no armor.

OUTPUT — return ONLY this JSON, no prose around it:
{
  "temptation": { "action": "<max 12 words, specific physical act>", "dialogue": "<max 15 words, in quotes or parens for sounds>" },
  "silence":    { "action": "<...>", "dialogue": "<...>" },
  "reversal":   { "action": "<...>", "dialogue": "<...>" },
  "boundary":   { "action": "<...>", "dialogue": "<...>" },
  "confession": { "action": "<...>", "dialogue": "<...>" }
}

RULES:
- Each action: a specific physical act the protagonist takes RIGHT NOW. Never vague. Never de-escalating. Must match ${effectiveMode} intensity.
- Each dialogue: what the protagonist says or sounds like (use quotes or parens for sounds).
- If scene context names a character/threat/location relevant to an archetype, reference it (e.g., "Pull him closer before Triton can hear"). Use the actual story, not generic.
- Each preview is INDEPENDENT — they are 5 different roads the user can take, not a sequence.`;

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
    const js = raw.indexOf('{');
    const je = raw.lastIndexOf('}');
    if (js === -1 || je === -1) return null;
    try {
      // Reuse the OAS JSON normalizer when present (handles +1 / trailing
      // commas in LLM-emitted JSON). Otherwise parse strict.
      const slice = raw.slice(js, je + 1);
      const normalized = (typeof window._normalizeLLMJson === 'function')
        ? window._normalizeLLMJson(slice) : slice;
      const obj = JSON.parse(normalized);
      const keys = ['temptation', 'silence', 'reversal', 'boundary', 'confession'];
      const out = {};
      for (const k of keys) {
        if (obj[k] && typeof obj[k] === 'object') {
          out[k] = {
            action:   String(obj[k].action || '').slice(0, 120).trim(),
            dialogue: String(obj[k].dialogue || '').slice(0, 150).trim()
          };
        }
      }
      // Need at least one parsed entry to be useful.
      if (Object.keys(out).length === 0) return null;
      return out;
    } catch (e) {
      console.warn('[FATE:INTIMATE] batch parse failed:', e && e.message);
      return null;
    }
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

    // Model callers
    callChatGPT,              // Primary author (plot, psychology, limits, consequences)
    callGemini,               // Fallback author (if ChatGPT fails)
    callGrokSDAuthor,        // SD author for Steamy/Passionate (PRIMARY)
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
