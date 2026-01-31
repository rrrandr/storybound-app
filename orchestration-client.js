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
 * Grok (ESD AUTHOR — Erotic/Dirty ONLY):
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
 *    - For Erotic/Dirty: generates [CONSTRAINTS] for Grok
 *    - For Clean/Naughty: generates complete output
 *    - ON FAILURE: Gemini fallback (one attempt, no retries)
 *
 * 1B. Grok — ESD Authoring (Erotic/Dirty ONLY, CONDITIONAL)
 *    - Authors the Erotic Scene Directive
 *    - Receives constraints from ChatGPT
 *    - ON FAILURE: fateStumbled, continue with ChatGPT integration
 *
 * 2. Specialist Renderer (OPTIONAL)
 *    - Called only if ESD allows and entitlement permits
 *    - Renders embodied prose within ESD bounds
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

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  const CONFIG = {
    // API endpoints
    CHATGPT_PROXY: '/api/chatgpt-proxy',
    SPECIALIST_PROXY: '/api/proxy',
    GEMINI_PROXY: '/api/gemini-proxy',
    MISTRAL_PROXY: '/api/mistral-proxy',

    // Default models
    PRIMARY_AUTHOR_MODEL: 'gpt-4o-mini',           // ChatGPT: Plot, psychology, consent, limits, consequences
    FALLBACK_AUTHOR_MODEL: 'gemini-2.0-flash',     // Gemini: Fallback if ChatGPT fails (conservative)
    ESD_AUTHOR_MODEL: 'grok-4-fast-reasoning',     // Grok: ESD authoring for Erotic/Dirty ONLY (PRIMARY)
    ESD_FALLBACK_MODEL: 'mistral-medium-latest',   // Mistral: ESD fallback if Grok fails (FALLBACK ONLY)
    RENDERER_MODEL: 'grok-4-fast-non-reasoning',   // Grok: Visual bible, visualization prompts ONLY
    SEX_RENDERER_MODEL: 'grok-4-fast-reasoning',   // Grok: Explicit scenes (ESD-gated, entitlement-checked)
    FATE_STRUCTURAL_MODEL: 'gpt-4o-mini',
    FATE_ELEVATION_MODEL: 'gpt-4o-mini',

    // Model allowlists (must match server-side)
    ALLOWED_PRIMARY_MODELS: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'],
    ALLOWED_FALLBACK_MODELS: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    ALLOWED_ESD_AUTHOR_MODELS: ['grok-4-fast-reasoning'],
    ALLOWED_ESD_FALLBACK_MODELS: ['mistral-medium-latest', 'mistral-large-latest'],
    ALLOWED_RENDERER_MODELS: ['grok-4-fast-non-reasoning'],
    ALLOWED_SEX_RENDERER_MODELS: ['grok-4-fast-reasoning'],

    // Feature flags
    ENABLE_SPECIALIST_RENDERER: true,
    ENABLE_FATE_ELEVATION: true,
    ENABLE_GROK_ESD_AUTHORING: true,   // Grok authors ESD for Erotic/Dirty
    ENABLE_MISTRAL_ESD_FALLBACK: true, // Mistral fallback if Grok fails (Erotic/Dirty ONLY)

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

  const MONETIZATION_GATES = {
    free: {
      name: 'Voyeur Tease',
      allowedEroticism: ['Clean', 'Naughty'],
      completionAllowed: false,
      cliffhangerRequired: true,
      maxStoryLength: 'voyeur'
    },
    pass: {
      name: '$3 Story Pass',
      allowedEroticism: ['Clean', 'Naughty', 'Erotic'],
      completionAllowed: true,
      cliffhangerRequired: false,
      maxStoryLength: 'fling'
    },
    sub: {
      name: '$6 Subscription',
      allowedEroticism: ['Clean', 'Naughty', 'Erotic', 'Dirty'],
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
    // Inferred from maintaining Erotic/Dirty for consecutive turns
    const recentIntensity = data.intensityHistory.slice(-T.INTENSITY_SUSTAIN_TURNS);
    if (recentIntensity.length >= T.INTENSITY_SUSTAIN_TURNS) {
      const allHigh = recentIntensity.every(i => ['Erotic', 'Dirty'].includes(i));
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
      forcedInterruption: false,   // True if Erotic/Dirty scene was cut away due to renderer failure
      usedFallbackAuthor: false,   // True if Gemini was used instead of ChatGPT
      esdAuthoredByGrok: false,    // True if Grok authored the ESD
      esdAuthoredByMistral: false, // True if Mistral authored the ESD (Grok fallback)
      grokFailed: false,           // True if Grok ESD authoring failed
      mistralFailed: false,        // True if Mistral ESD fallback also failed
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
  function enforceMonetizationGates(accessTier, requestedEroticism) {
    const gate = MONETIZATION_GATES[accessTier];
    if (!gate) {
      console.warn(`[ORCHESTRATION] Unknown access tier: ${accessTier}, defaulting to 'free'`);
      return enforceMonetizationGates('free', requestedEroticism);
    }

    // Determine effective eroticism level
    let effectiveEroticism = requestedEroticism;
    if (!gate.allowedEroticism.includes(requestedEroticism)) {
      // Downgrade to highest allowed level
      const eroticismOrder = ['Clean', 'Naughty', 'Erotic', 'Dirty'];
      const requestedIndex = eroticismOrder.indexOf(requestedEroticism);

      for (let i = requestedIndex; i >= 0; i--) {
        if (gate.allowedEroticism.includes(eroticismOrder[i])) {
          effectiveEroticism = eroticismOrder[i];
          break;
        }
      }
    }

    return {
      accessTier,
      gateName: gate.name,
      requestedEroticism,
      effectiveEroticism,
      wasDowngraded: effectiveEroticism !== requestedEroticism,
      completionAllowed: gate.completionAllowed,
      cliffhangerRequired: gate.cliffhangerRequired,
      maxStoryLength: gate.maxStoryLength
    };
  }

  // ===========================================================================
  // ESD VALIDATION
  // ===========================================================================

  /**
   * Validate an Erotic Scene Directive before sending to specialist renderer.
   */
  function validateESD(esd) {
    if (!esd) return { valid: false, errors: ['ESD is null'] };

    const errors = [];
    const required = ['eroticismLevel', 'completionAllowed', 'hardStops'];

    for (const field of required) {
      if (!(field in esd)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (esd.eroticismLevel && !['Clean', 'Naughty', 'Erotic', 'Dirty'].includes(esd.eroticismLevel)) {
      errors.push(`Invalid eroticism level: ${esd.eroticismLevel}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // ===========================================================================
  // API CALLERS
  // ===========================================================================

  /**
   * Call ChatGPT (primary author).
   * ChatGPT is the ONLY model allowed to author plot, decide outcomes,
   * and generate ESDs.
   */
  async function callChatGPT(messages, role = 'PRIMARY_AUTHOR', options = {}) {
    const payload = {
      messages,
      role,
      model: options.model || CONFIG.PRIMARY_AUTHOR_MODEL,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1500
    };

    // Add JSON mode if requested
    if (options.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const res = await fetch(CONFIG.CHATGPT_PROXY, {
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

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('ChatGPT returned malformed response (no choices)');
      }

      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('ChatGPT request timed out');
      }
      throw err;
    }
  }

  /**
   * Call Renderer (Grok grok-4-fast-non-reasoning).
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
   * Call Sex Renderer (Grok grok-4-fast-reasoning).
   * ONLY called when:
   * 1. ESD is present AND valid
   * 2. ESD.eroticismLevel >= 'Erotic'
   * 3. User's entitlement allows it
   *
   * HARD GUARD: This function MUST NOT be called without ESD evaluation.
   */
  async function callSexRenderer(messages, esd, accessTier, options = {}) {
    // GUARD: ESD must be present
    if (!esd) {
      throw new Error('[SEX_RENDERER BLOCKED] No ESD provided. Renderer cannot be called without ESD evaluation.');
    }

    // GUARD: ESD must have valid eroticism level
    const eroticismLevel = esd.eroticismLevel || 'Clean';
    if (!['Erotic', 'Dirty'].includes(eroticismLevel)) {
      throw new Error(`[SEX_RENDERER BLOCKED] ESD eroticism level "${eroticismLevel}" does not require sex renderer.`);
    }

    // GUARD: Check user entitlement
    const gate = MONETIZATION_GATES[accessTier] || MONETIZATION_GATES.free;
    if (!gate.allowedEroticism.includes(eroticismLevel)) {
      throw new Error(`[SEX_RENDERER BLOCKED] User tier "${accessTier}" not entitled to "${eroticismLevel}" content.`);
    }

    console.log(`[SEX_RENDERER] ESD validated. Level: ${eroticismLevel}, Tier: ${accessTier}`);

    const payload = {
      messages,
      role: 'SEX_RENDERER',
      model: CONFIG.SEX_RENDERER_MODEL,
      temperature: options.temperature || 0.8,
      max_tokens: options.max_tokens || 1000,
      esd: esd  // Pass ESD for server-side validation
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
        throw new Error(`Sex Renderer API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Sex Renderer returned malformed response');
      }

      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Sex Renderer request timed out');
      }
      throw err;
    }
  }

  // Legacy alias for backward compatibility (routes to callSexRenderer with guards)
  async function callSpecialistRenderer(messages, esd, options = {}) {
    const accessTier = options.accessTier || 'free';
    return callSexRenderer(messages, esd, accessTier, options);
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
   * Call Grok as ESD Author (for Erotic/Dirty intensity ONLY).
   * Grok authors: anatomical explicitness, sensory vividness, physical embodiment.
   * ChatGPT retains: permission, limits, consequences, integration.
   *
   * FAILURE HANDLING: If Grok fails, set fateStumbled and continue with ChatGPT.
   */
  async function callGrokESDAuthor(constraints, gateEnforcement, options = {}) {
    console.log(`[GROK ESD] Authoring ESD for ${gateEnforcement.effectiveEroticism} intensity`);

    const esdPrompt = `You are the ESD AUTHOR for Storybound intimate scenes.

YOUR EXCLUSIVE DOMAIN:
- Anatomical explicitness and physical detail
- Sensory vividness (touch, taste, scent, sound)
- Physical embodiment and movement
- Rhythm and pacing of physical encounter

YOU DO NOT DECIDE:
- Whether intimacy occurs (ChatGPT decides this)
- Story consequences or emotional outcomes
- Character psychology or motivation
- Plot progression

CONSTRAINTS FROM PRIMARY AUTHOR (NON-NEGOTIABLE):
- Eroticism Level: ${gateEnforcement.effectiveEroticism}
- Completion Allowed: ${gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Emotional Core: ${constraints.emotionalCore || 'connection and desire'}
- Physical Bounds: ${constraints.physicalBounds || 'as established by story'}
- Hard Stops: ${(constraints.hardStops || ['consent_withdrawal']).join(', ')}

${!gateEnforcement.completionAllowed ? `
CRITICAL: Completion is FORBIDDEN by monetization tier.
Build tension, embodiment, sensation - but do NOT reach climax.
` : ''}

Generate an Erotic Scene Directive in this format:
[ESD]
eroticismLevel: ${gateEnforcement.effectiveEroticism}
completionAllowed: ${gateEnforcement.completionAllowed}
emotionalCore: <the feeling being rendered>
physicalBounds: <explicit physical actions allowed/forbidden>
sensoryFocus: <primary sensations to emphasize>
rhythm: <pacing - slow/building/urgent/suspended>
hardStops: consent_withdrawal, scene_boundary${!gateEnforcement.completionAllowed ? ', monetization_gate_completion_forbidden' : ''}
[/ESD]`;

    const messages = [
      { role: 'system', content: esdPrompt },
      { role: 'user', content: `Generate the ESD for this intimate moment.\n\nContext from Primary Author:\n${constraints.sceneSetup || 'An intimate encounter unfolds.'}` }
    ];

    const payload = {
      messages,
      role: 'ESD_AUTHOR',
      model: CONFIG.ESD_AUTHOR_MODEL,
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
        throw new Error(`Grok ESD Author API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Grok ESD Author returned malformed response');
      }

      console.log('[GROK ESD] ESD authored successfully');
      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Grok ESD Author request timed out');
      }
      throw err;
    }
  }

  /**
   * Call Mistral as ESD FALLBACK AUTHOR (for Erotic/Dirty intensity ONLY).
   * Called ONLY when Grok fails or is neutered.
   *
   * Mistral authors: anatomical explicitness, sensory vividness, physical embodiment.
   * Mistral does NOT: decide plot, escalation, consequences, or integration.
   *
   * FAILURE HANDLING: If Mistral fails, return null and trigger forced interruption.
   * NO RETRIES. ONE ATTEMPT ONLY.
   */
  async function callMistralESDFallback(constraints, gateEnforcement, options = {}) {
    console.log(`[MISTRAL ESD FALLBACK] Grok failed, attempting Mistral fallback for ${gateEnforcement.effectiveEroticism}`);

    const esdPrompt = `You are the FALLBACK ESD AUTHOR for Storybound intimate scenes.
The primary author failed. You must generate the Erotic Scene Directive.

YOUR EXCLUSIVE DOMAIN:
- Anatomical explicitness and physical detail
- Sensory vividness (touch, taste, scent, sound)
- Physical embodiment and movement
- Rhythm and pacing of physical encounter

YOU DO NOT DECIDE:
- Whether intimacy occurs (already decided)
- Story consequences or emotional outcomes
- Character psychology or motivation
- Plot progression

CONSTRAINTS (NON-NEGOTIABLE):
- Eroticism Level: ${gateEnforcement.effectiveEroticism}
- Completion Allowed: ${gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Emotional Core: ${constraints.emotionalCore || 'connection and desire'}
- Physical Bounds: ${constraints.physicalBounds || 'as established by story'}
- Hard Stops: ${(constraints.hardStops || ['consent_withdrawal']).join(', ')}

${!gateEnforcement.completionAllowed ? `
CRITICAL: Completion is FORBIDDEN by monetization tier.
Build tension, embodiment, sensation - but do NOT reach climax.
` : ''}

Generate an Erotic Scene Directive in this format:
[ESD]
eroticismLevel: ${gateEnforcement.effectiveEroticism}
completionAllowed: ${gateEnforcement.completionAllowed}
emotionalCore: <the feeling being rendered>
physicalBounds: <explicit physical actions allowed/forbidden>
sensoryFocus: <primary sensations to emphasize>
rhythm: <pacing - slow/building/urgent/suspended>
hardStops: consent_withdrawal, scene_boundary${!gateEnforcement.completionAllowed ? ', monetization_gate_completion_forbidden' : ''}
[/ESD]`;

    const messages = [
      { role: 'system', content: esdPrompt },
      { role: 'user', content: `Generate the ESD for this intimate moment.\n\nContext from Primary Author:\n${constraints.sceneSetup || 'An intimate encounter unfolds.'}` }
    ];

    const payload = {
      messages,
      role: 'ESD_FALLBACK',
      model: CONFIG.ESD_FALLBACK_MODEL,
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
        throw new Error(`Mistral ESD Fallback API Error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Mistral ESD Fallback returned malformed response');
      }

      console.log('[MISTRAL ESD FALLBACK] ESD authored successfully');
      return data.choices[0].message.content;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Mistral ESD Fallback request timed out');
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
   * @param {string} params.requestedEroticism - Requested intensity level
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
      requestedEroticism,
      storyContext,
      playerAction,
      playerDialogue,
      fateCard,
      systemPrompt,
      onPhaseChange
    } = params;

    const state = createOrchestrationState();

    // =========================================================================
    // PRE-FLIGHT: Enforce Monetization Gates
    // =========================================================================
    state.gateEnforcement = enforceMonetizationGates(accessTier, requestedEroticism);

    if (state.gateEnforcement.wasDowngraded) {
      console.log(`[ORCHESTRATION] Eroticism downgraded: ${requestedEroticism} → ${state.gateEnforcement.effectiveEroticism}`);
    }

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
     * For Erotic/Dirty: ChatGPT generates constraints, Grok authors ESD.
     * For Clean/Naughty: ChatGPT handles everything.
     */

    state.phase = 'AUTHOR_PASS';
    if (onPhaseChange) onPhaseChange('AUTHOR_PASS');

    const authorStartTime = Date.now();
    const isEroticOrDirty = ['Erotic', 'Dirty'].includes(state.gateEnforcement.effectiveEroticism);
    const useGrokForESD = isEroticOrDirty && CONFIG.ENABLE_GROK_ESD_AUTHORING;

    // Build system prompt - for Erotic/Dirty with Grok ESD, ChatGPT generates constraints instead of full ESD
    const authorSystemPrompt = `${systemPrompt}

=== PRIMARY AUTHOR RESPONSIBILITIES ===
You are the PRIMARY AUTHOR. You have EXCLUSIVE authority over:
- Plot progression and what happens
- Character psychology and interiority
- Whether intimacy occurs in this scene
- Whether the scene should be interrupted
- Permission, limits, and consequences

MONETIZATION CONSTRAINTS (NON-NEGOTIABLE):
- Access Tier: ${state.gateEnforcement.gateName}
- Effective Eroticism Level: ${state.gateEnforcement.effectiveEroticism}
- Completion Allowed: ${state.gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Cliffhanger Required: ${state.gateEnforcement.cliffhangerRequired ? 'YES' : 'NO'}

${useGrokForESD ? `
INTIMACY SCENE PROTOCOL (SPLIT AUTHORING):
For Erotic/Dirty content, you define CONSTRAINTS and a specialist will author the ESD.
If this beat includes intimate content, include a [CONSTRAINTS] block:
[CONSTRAINTS]
intimacyOccurs: true/false
emotionalCore: <the feeling driving this moment>
physicalBounds: <what is allowed and forbidden>
sceneSetup: <brief description of the intimate moment>
hardStops: <any specific limits - consent, boundaries, etc.>
[/CONSTRAINTS]

You retain authority over WHETHER intimacy occurs. The specialist only authors HOW it is rendered.
` : isEroticOrDirty ? `
INTIMACY SCENE PROTOCOL:
If this beat includes intimate content at Erotic or Dirty level, you MUST include
an [ESD] block in your response that specifies the constraints for embodied rendering.
Format:
[ESD]
eroticismLevel: ${state.gateEnforcement.effectiveEroticism}
completionAllowed: ${state.gateEnforcement.completionAllowed}
emotionalCore: <the feeling to render>
physicalBounds: <what is explicitly allowed and forbidden>
[/ESD]
` : ''}
${buildPreferenceBiasBlock()}
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

    try {
      authorOutput = await callChatGPT(messages, 'PRIMARY_AUTHOR');
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

    state.authorOutput = authorOutput;
    state.usedFallbackAuthor = usedFallback;

    // =========================================================================
    // PHASE 1B: Grok ESD Authoring (CONDITIONAL - Erotic/Dirty only)
    // With Mistral fallback if Grok fails
    // =========================================================================
    if (useGrokForESD && !usedFallback) {
      // Parse constraints from ChatGPT output
      const constraintsMatch = authorOutput.match(/\[CONSTRAINTS\]([\s\S]*?)\[\/CONSTRAINTS\]/);

      if (constraintsMatch) {
        const constraints = parseConstraints(constraintsMatch[1]);

        // Only call Grok if ChatGPT indicated intimacy occurs
        if (constraints.intimacyOccurs) {
          state.phase = 'ESD_AUTHORING';
          if (onPhaseChange) onPhaseChange('ESD_AUTHORING');

          let esdOutput = null;
          let grokSucceeded = false;

          // STEP 1: Attempt Grok (PRIMARY erotic author)
          try {
            const grokESDOutput = await callGrokESDAuthor(constraints, state.gateEnforcement);

            // Extract ESD from Grok output
            const esdMatch = grokESDOutput.match(/\[ESD\]([\s\S]*?)\[\/ESD\]/);
            if (esdMatch) {
              esdOutput = esdMatch[1];
              grokSucceeded = true;
              state.esdAuthoredByGrok = true;
              console.log('[ORCHESTRATION] Grok authored ESD successfully');
            } else {
              console.warn('[ORCHESTRATION] Grok output did not contain valid ESD block (neutered?)');
              state.grokFailed = true;
            }
          } catch (grokErr) {
            console.error('[ORCHESTRATION] Grok ESD authoring failed:', grokErr);
            state.errors.push(`Grok ESD failed: ${grokErr.message}`);
            state.grokFailed = true;
            state.esdAuthoredByGrok = false;
          }

          // STEP 2: If Grok failed, attempt Mistral ONCE (FALLBACK erotic author)
          // NO RETRIES. ONE ATTEMPT ONLY.
          if (!grokSucceeded && CONFIG.ENABLE_MISTRAL_ESD_FALLBACK) {
            console.log('[ORCHESTRATION] Grok failed — attempting Mistral fallback (ONE ATTEMPT)');

            try {
              const mistralESDOutput = await callMistralESDFallback(constraints, state.gateEnforcement);

              // Extract ESD from Mistral output
              const esdMatch = mistralESDOutput.match(/\[ESD\]([\s\S]*?)\[\/ESD\]/);
              if (esdMatch) {
                esdOutput = esdMatch[1];
                state.esdAuthoredByMistral = true;
                console.log('[ORCHESTRATION] Mistral fallback authored ESD successfully');
              } else {
                console.warn('[ORCHESTRATION] Mistral output did not contain valid ESD block');
                state.mistralFailed = true;
              }
            } catch (mistralErr) {
              console.error('[ORCHESTRATION] Mistral ESD fallback also failed:', mistralErr);
              state.errors.push(`Mistral ESD fallback failed: ${mistralErr.message}`);
              state.mistralFailed = true;
              state.esdAuthoredByMistral = false;
            }
          }

          // STEP 3: Parse ESD if either author succeeded
          if (esdOutput) {
            state.esd = parseESD(esdOutput, state.gateEnforcement);
          } else {
            // BOTH Grok and Mistral failed — force interruption, do NOT downgrade
            console.warn('[ORCHESTRATION] ALL erotic authors failed — fateStumbled, forced interruption required');
            state.fateStumbled = true;
            // forcedInterruption will be set in integration pass
          }
        }
      }
    } else if (!useGrokForESD) {
      // Original behavior: check for ESD in ChatGPT output
      const esdMatch = authorOutput.match(/\[ESD\]([\s\S]*?)\[\/ESD\]/);
      if (esdMatch) {
        state.esd = parseESD(esdMatch[1], state.gateEnforcement);
      }
    }

    state.timing.authorPassMs = Date.now() - authorStartTime;

    // =========================================================================
    // PHASE 2: Specialist Renderer (CONDITIONAL)
    // =========================================================================
    /**
     * Specialist renderer is called ONLY if:
     * - Feature flag enables it
     * - An intimacy scene exists (ESD was generated)
     * - Eroticism level warrants it (Erotic or Dirty)
     * - Monetization tier allows it
     *
     * The renderer:
     * - Receives ONLY the ESD (no plot context)
     * - Renders sensory embodiment within bounds
     * - NEVER decides outcomes or plot
     */

    const shouldCallRenderer = (
      CONFIG.ENABLE_SPECIALIST_RENDERER &&
      state.esd &&
      ['Erotic', 'Dirty'].includes(state.esd.eroticismLevel) &&
      !state.gateEnforcement.wasDowngraded
    );

    if (shouldCallRenderer) {
      state.phase = 'RENDER_PASS';
      if (onPhaseChange) onPhaseChange('RENDER_PASS');

      const renderStartTime = Date.now();

      // Validate ESD before sending
      const esdValidation = validateESD(state.esd);
      if (!esdValidation.valid) {
        console.warn('[ORCHESTRATION] Invalid ESD, skipping renderer:', esdValidation.errors);
        state.errors.push(`Invalid ESD: ${esdValidation.errors.join('; ')}`);
      } else {
        try {
          // Build renderer prompt from ESD only (no plot context)
          const rendererPrompt = buildRendererPrompt(state.esd);

          const messages = [
            { role: 'system', content: rendererPrompt.system },
            { role: 'user', content: rendererPrompt.user }
          ];

          state.rendererOutput = await callSpecialistRenderer(messages, state.esd);
          state.rendererCalled = true;
          state.timing.renderPassMs = Date.now() - renderStartTime;

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
        !state.esd ? 'no ESD' :
        state.gateEnforcement.wasDowngraded ? 'tier downgrade' :
        'eroticism level'
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

        // Strip ESD and CONSTRAINTS blocks from output if present
        state.integrationOutput = state.integrationOutput
          .replace(/\[ESD\][\s\S]*?\[\/ESD\]/g, '')
          .replace(/\[CONSTRAINTS\][\s\S]*?\[\/CONSTRAINTS\]/g, '')
          .trim();

        // =====================================================================
        // DETERMINISTIC CUT-AWAY: Erotic/Dirty with erotic author failure
        // =====================================================================
        // If intensity >= Erotic AND (renderer failed OR all erotic authors failed):
        // - Force in-story interruption (do NOT downgrade intensity)
        // - Do NOT allow ChatGPT to write softened erotic prose
        // - Do NOT retry or cascade beyond Mistral
        // =====================================================================
        const isEroticIntensity = ['Erotic', 'Dirty'].includes(state.gateEnforcement.effectiveEroticism);
        const allEroticAuthorsFailed = state.grokFailed && (state.mistralFailed || !CONFIG.ENABLE_MISTRAL_ESD_FALLBACK);

        if (isEroticIntensity && (state.rendererFailed || allEroticAuthorsFailed)) {
          const reason = allEroticAuthorsFailed ? 'all erotic authors (Grok+Mistral) failed' : 'renderer failed';
          console.log(`[ORCHESTRATION] DETERMINISTIC CUT-AWAY: Erotic/Dirty ${reason}, forcing interruption`);
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

      // Enforce cliffhanger if required
      if (state.gateEnforcement.cliffhangerRequired) {
        // Check if output already has a cliffhanger feel
        const hasCliffhanger = /\.{3}$|…$|\?\s*$|suspended|interrupted|moment hangs/i.test(state.integrationOutput);
        if (!hasCliffhanger) {
          state.integrationOutput += '\n\n[The moment hangs suspended, waiting...]';
        }
      }

      state.timing.integrationPassMs = Date.now() - integrationStartTime;

    } catch (err) {
      state.errors.push(`Integration Pass failed: ${err.message}`);
      console.error('[ORCHESTRATION] Integration Pass failed:', err);
      // Use author output as fallback (strip ESD and CONSTRAINTS)
      state.integrationOutput = state.authorOutput
        .replace(/\[ESD\][\s\S]*?\[\/ESD\]/g, '')
        .replace(/\[CONSTRAINTS\][\s\S]*?\[\/CONSTRAINTS\]/g, '')
        .trim();

      // DETERMINISTIC CUT-AWAY: Also applies on integration failure for Erotic/Dirty
      const isEroticIntensity = ['Erotic', 'Dirty'].includes(state.gateEnforcement.effectiveEroticism);
      const allEroticAuthorsFailed = state.grokFailed && (state.mistralFailed || !CONFIG.ENABLE_MISTRAL_ESD_FALLBACK);
      if (isEroticIntensity && (state.rendererFailed || state.esd || allEroticAuthorsFailed)) {
        console.log('[ORCHESTRATION] DETERMINISTIC CUT-AWAY: Integration failed for Erotic/Dirty, forcing interruption');
        state.forcedInterruption = true;

        // Record interruption for preference inference
        recordPreferenceSignal('INTERRUPTION_ENCOUNTERED', {});

        state.integrationOutput = state.integrationOutput.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim();
        state.integrationOutput += '\n\nThe moment shattered. Something pulled them back to reality—a sound, a hesitation, the world refusing to wait.';
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
      rendererUsed: state.rendererCalled && !state.rendererFailed,
      fateStumbled: state.fateStumbled,
      forcedInterruption: state.forcedInterruption,  // Erotic/Dirty cut-away due to author/renderer failure
      usedFallbackAuthor: state.usedFallbackAuthor,
      esdAuthoredByGrok: state.esdAuthoredByGrok,
      esdAuthoredByMistral: state.esdAuthoredByMistral,  // Mistral fallback was used for ESD
      grokFailed: state.grokFailed,
      mistralFailed: state.mistralFailed,
      errors: state.errors,
      timing: state.timing
    };
  }

  // ===========================================================================
  // PROMPT BUILDERS
  // ===========================================================================

  /**
   * Parse constraints from ChatGPT output (for split ESD authoring).
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
   * Parse ESD from author output.
   */
  function parseESD(esdText, gateEnforcement) {
    const esd = {
      eroticismLevel: gateEnforcement.effectiveEroticism,
      completionAllowed: gateEnforcement.completionAllowed,
      emotionalCore: null,
      physicalBounds: null,
      hardStops: ['consent_withdrawal', 'scene_boundary']
    };

    // Parse fields from ESD text
    const lines = esdText.trim().split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key && value) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
        if (normalizedKey === 'emotionalcore') esd.emotionalCore = value;
        if (normalizedKey === 'physicalbounds') esd.physicalBounds = value;
        if (normalizedKey === 'eroticismlevel') esd.eroticismLevel = value;
        if (normalizedKey === 'completionallowed') esd.completionAllowed = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
      }
    }

    // Enforce monetization constraints (ESD cannot override)
    if (!gateEnforcement.completionAllowed) {
      esd.completionAllowed = false;
      esd.hardStops.push('monetization_gate_completion_forbidden');
    }

    return esd;
  }

  /**
   * Build the prompt for the specialist renderer.
   * The renderer receives ONLY ESD content, NO plot context.
   */
  function buildRendererPrompt(esd) {
    return {
      system: `You are a SPECIALIST RENDERER for intimate scenes.

YOUR CONSTRAINTS (NON-NEGOTIABLE):
- You render SENSORY EMBODIMENT only
- You do NOT decide plot or outcomes
- You do NOT invent lore or change the story
- You write HOW IT FEELS, not WHAT HAPPENS

SCENE PARAMETERS:
- Eroticism Level: ${esd.eroticismLevel}
- Completion Allowed: ${esd.completionAllowed ? 'YES' : 'NO - you must NOT write completion'}
- Emotional Core: ${esd.emotionalCore || 'connection'}
- Physical Bounds: ${esd.physicalBounds || 'as established'}

HARD STOPS (if any of these occur, halt immediately):
${esd.hardStops.map(s => `- ${s}`).join('\n')}

${!esd.completionAllowed ? `
CRITICAL: Completion is FORBIDDEN. The scene must remain suspended.
Build tension, embodiment, sensation - but do NOT reach climax.
` : ''}

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
    // Strip ESD and CONSTRAINTS blocks from author output
    const cleanAuthorOutput = authorOutput
      .replace(/\[ESD\][\s\S]*?\[\/ESD\]/g, '')
      .replace(/\[CONSTRAINTS\][\s\S]*?\[\/CONSTRAINTS\]/g, '')
      .trim();

    return {
      system: `You are performing the INTEGRATION PASS for Storybound.

YOUR RESPONSIBILITIES:
- Seamlessly integrate the rendered intimate content into the narrative
- Maintain story continuity and voice
- Apply appropriate consequences
- You are the FINAL AUTHORITY on story state

CONSTRAINTS:
- Cliffhanger Required: ${gateEnforcement.cliffhangerRequired ? 'YES' : 'NO'}
- Completion Allowed: ${gateEnforcement.completionAllowed ? 'YES' : 'NO'}

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
Enforce consent and safety. Respect intensity ceilings.`;

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
  // EXPORTS
  // ===========================================================================

  window.StoryboundOrchestration = {
    // Main orchestration
    orchestrateStoryGeneration,

    // Model callers
    callChatGPT,              // Primary author (plot, psychology, limits, consequences)
    callGemini,               // Fallback author (if ChatGPT fails)
    callGrokESDAuthor,        // ESD author for Erotic/Dirty (PRIMARY)
    callMistralESDFallback,   // ESD fallback for Erotic/Dirty (if Grok fails)
    callSpecialistRenderer,   // Sex renderer (ESD-gated)

    // Legacy compatibility
    callChat: callChatLegacy,

    // Fate Card processing
    processFateCard,

    // Reader preference adaptation (session-scoped, deterministic)
    recordPreferenceSignal,     // Record user behavior signals
    inferReaderPreferences,     // Get current preference summary
    buildPreferenceBiasBlock,   // Get prompt injection text
    resetPreferenceData,        // Reset for new story

    // Utilities
    enforceMonetizationGates,
    validateESD,
    parseConstraints,
    createOrchestrationState,

    // Configuration (read-only)
    CONFIG: Object.freeze({ ...CONFIG }),
    MONETIZATION_GATES: Object.freeze({ ...MONETIZATION_GATES })
  };

  console.log('[ORCHESTRATION] Storybound AI Orchestration Client initialized');

})(window);
