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
 * ORCHESTRATION FLOW (NON-NEGOTIABLE)
 * =============================================================================
 *
 * 1. ChatGPT — Author Pass (ALWAYS RUNS)
 *    - Plot beats
 *    - Character psychology
 *    - Dialogue intent
 *    - Determine if intimacy occurs
 *    - Generate Erotic Scene Directive (if needed)
 *
 * 2. Specialist Renderer (OPTIONAL)
 *    - Called only if ESD allows
 *    - Renders embodied prose within constraints
 *
 * 3. ChatGPT — Integration Pass (ALWAYS RUNS)
 *    - Absorbs rendered scene
 *    - Applies consequences
 *    - Updates state
 *    - Enforces cliffhanger or completion
 *
 * This order MUST be enforced. No step may be skipped or reordered.
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

    // Default models
    PRIMARY_AUTHOR_MODEL: 'gpt-4o-mini',           // ChatGPT: DSP, normalization, veto, story logic, ESD
    RENDERER_MODEL: 'grok-4-fast-non-reasoning',   // Grok: Visual bible, visualization prompts ONLY
    SEX_RENDERER_MODEL: 'grok-4-fast-reasoning',   // Grok: Explicit scenes (ESD-gated, entitlement-checked)
    FATE_STRUCTURAL_MODEL: 'gpt-4o-mini',
    FATE_ELEVATION_MODEL: 'gpt-4o-mini',

    // Model allowlists (must match server-side)
    ALLOWED_PRIMARY_MODELS: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'],
    ALLOWED_RENDERER_MODELS: ['grok-4-fast-non-reasoning'],
    ALLOWED_SEX_RENDERER_MODELS: ['grok-4-fast-reasoning'],

    // Feature flags
    ENABLE_SPECIALIST_RENDERER: true,
    ENABLE_FATE_ELEVATION: true,

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
  // ROMANCE ENGINE (FRONTEND MIRROR)
  // ===========================================================================
  /**
   * The Romance Engine ensures emotionally specific, world-bound, non-generic
   * romantic narratives with proper pacing based on intensity.
   *
   * See /api/romance-engine.js for the authoritative server-side implementation.
   */

  const ROMANCE_MODES = {
    CASUAL: {
      name: 'Casual',
      description: 'Light, playful, restrained',
      intensityMapping: ['Clean'],
      constraints: {
        touch: 'light',
        flirtation: 'over fixation',
        sceneLength: 'shorter',
        humor: 'encouraged',
        physicality: 'implied, not lingered on',
        tension: 'minimal',
        payoff: 'quick resolution allowed'
      }
    },
    STANDARD: {
      name: 'Standard',
      description: 'Slow-burn, tension-forward',
      intensityMapping: ['Naughty', 'Erotic'],
      constraints: {
        touch: 'sustained tension',
        flirtation: 'denial and restraint',
        sceneLength: 'standard',
        humor: 'permitted as deflection',
        physicality: 'gradual escalation',
        tension: 'foregrounded',
        payoff: 'delayed, earned'
      }
    },
    HIGH_INTENSITY: {
      name: 'High-Intensity',
      description: 'Charged, visceral, erotic-leaning',
      intensityMapping: ['Dirty'],
      constraints: {
        touch: 'body awareness before thought',
        flirtation: 'heat and proximity',
        sceneLength: 'extended when warranted',
        humor: 'rare, tension-breaking only',
        physicality: 'explicit but purposeful',
        tension: 'desire creates conflict, not release',
        payoff: 'power shifts are sharper and more dangerous'
      }
    }
  };

  /**
   * Map eroticism level to romance mode.
   */
  function mapIntensityToRomanceMode(eroticismLevel) {
    for (const [modeKey, mode] of Object.entries(ROMANCE_MODES)) {
      if (mode.intensityMapping.includes(eroticismLevel)) {
        return modeKey;
      }
    }
    return 'STANDARD';
  }

  /**
   * Generate mode-specific behavior directives.
   */
  function generateModeDirectives(mode) {
    const directives = {
      CASUAL: `
CASUAL MODE ACTIVE:
- Light touch in all interactions
- Flirtation over fixation
- Shorter scenes, quicker beats
- Humor and ease are welcome
- Physicality implied, not lingered on
- Romantic tension is a whisper, not a shout`,

      STANDARD: `
STANDARD MODE ACTIVE:
- Slow burn pacing required
- Sustained tension across scenes
- Denial and restraint drive the narrative
- Gradual escalation only
- Emotional stakes must be foregrounded
- Payoff is earned, not given`,

      HIGH_INTENSITY: `
HIGH-INTENSITY MODE ACTIVE:
- Body awareness precedes thought
- Heat, proximity, involuntary reactions dominate
- Language may be explicit but must be purposeful
- Desire creates conflict, not release
- Power shifts are sharper and more dangerous
- Visceral, charged, erotic-leaning without being gratuitous`
    };

    return directives[mode] || directives.STANDARD;
  }

  /**
   * Build the complete Romance Engine directive for injection into prompts.
   */
  function buildRomanceEngineDirective({
    eroticismLevel,
    isOpening = false,
    privateLanguage = null,
    memoryContext = null
  }) {
    const romanceMode = mapIntensityToRomanceMode(eroticismLevel);
    const modeConfig = ROMANCE_MODES[romanceMode];

    let directive = `
================================================================================
ROMANCE ENGINE ACTIVE — MODE: ${modeConfig.name.toUpperCase()}
================================================================================

${generateModeDirectives(romanceMode)}

--------------------------------------------------------------------------------
CORE ROMANCE RULES (NON-NEGOTIABLE):
--------------------------------------------------------------------------------

1. EMOTIONAL POV FILTER
   All description must be filtered through: desire, resistance, longing, or unease.
   Neutral description is forbidden.

2. ASYMMETRICAL WANT
   The romantic leads must:
   - Want different things
   - Fear different losses
   - Misread the same moment differently
   Harmony kills romance. Misalignment creates it.

3. POWER MICRO-DYNAMICS
   Every interaction must contain a subtle power question:
   - Who risks more?
   - Who withholds?
   - Who controls timing or knowledge?
   Power should shift, often mid-scene.

4. SUBTEXT OVER DECLARATION
   Romantic meaning should appear through:
   silence, deflection, irritation, humor, timing, physical proximity.
   Declarations are rare and destabilizing.
`;

    // Opening-specific rules
    if (isOpening) {
      directive += `
--------------------------------------------------------------------------------
DIEGETIC WORLD SEEDING (OPENING SCENE):
--------------------------------------------------------------------------------

The opening MUST include:
- At least 6 world-specific details
- From at least 3 of these categories:
  * Slang or idioms
  * Institutions or power structures
  * Customs, taboos, or rules
  * Objects or materials unique to the world
  * Professions or social roles
  * Place-names implying a larger system

Rules:
- Do NOT explain these details
- Do NOT spotlight them
- Treat them as ordinary life
- If the opening could be moved to another world with only name changes, REWRITE IT

`;
    }

    // Private language context
    if (privateLanguage && privateLanguage.length > 0) {
      directive += `
--------------------------------------------------------------------------------
PRIVATE LANGUAGE (ACTIVE):
--------------------------------------------------------------------------------

Shared phrases in this story: ${privateLanguage.join(', ')}

Rules:
- Reference these naturally when appropriate
- Allow meaning to deepen with each use
- NEVER explain why they matter
- This language is a seal, not a signal

`;
    }

    // Memory gravity context
    if (memoryContext) {
      directive += `
--------------------------------------------------------------------------------
MEMORY AS GRAVITY (ACTIVE THREADS):
--------------------------------------------------------------------------------

${memoryContext.unspoken ? `Unspoken things: ${memoryContext.unspoken.join('; ')}` : ''}
${memoryContext.debts ? `Emotional debts: ${memoryContext.debts.join('; ')}` : ''}

Rules:
- Echo these forward without explicit recap
- Let them influence choices and reactions
- Romance deepens through remembered tension

`;
    }

    // Self-validation directive
    directive += `
--------------------------------------------------------------------------------
SELF-VALIDATION (MANDATORY, SILENT):
--------------------------------------------------------------------------------

Before finalizing output, internally verify:
${isOpening ? '- Does the opening seed a distinct world without exposition?' : ''}
- Is the romance driven by misalignment, not agreement?
- Is desire shown through action, not explanation?
- Does the pacing match the selected mode?
- Would this feel interchangeable with another story? (answer should be NO)
If any verification fails, revise before output.
Do not mention this validation in the output.
`;

    // Prohibitions
    directive += `
--------------------------------------------------------------------------------
PROHIBITIONS:
--------------------------------------------------------------------------------

${isOpening ? `- No generic openings (markets, taverns, neutral spaces) unless world-required
- No transplantable scenes` : ''}
- No neutral narration
- No technique explanations
- No instant emotional payoff
- Never explain process to reader
- Never spotlight world-building details
- Never use generic romantic tropes without subversion

--------------------------------------------------------------------------------
FINAL DIRECTIVE:
--------------------------------------------------------------------------------

Generate romance that feels:
- Inevitable
- Specific
- Charged
- Impossible to relocate

Apply this system fully and silently.
================================================================================
`;

    return directive;
  }

  /**
   * Create a romance state tracker for persistent memory across scenes.
   */
  function createRomanceState(initialEroticismLevel) {
    return {
      mode: mapIntensityToRomanceMode(initialEroticismLevel),
      eroticismLevel: initialEroticismLevel,
      sceneCount: 0,
      privateLanguage: [],
      memoryContext: {
        unspoken: [],
        debts: [],
        tensionMoments: [],
        powerShifts: []
      },

      updateEroticismLevel(newLevel) {
        this.eroticismLevel = newLevel;
        this.mode = mapIntensityToRomanceMode(newLevel);
      },

      recordScene(sceneData) {
        this.sceneCount++;
        if (sceneData.newPhrase) {
          this.privateLanguage.push(sceneData.newPhrase);
        }
        if (sceneData.unspoken) {
          this.memoryContext.unspoken.push(sceneData.unspoken);
        }
        if (sceneData.emotionalDebt) {
          this.memoryContext.debts.push(sceneData.emotionalDebt);
        }
        if (sceneData.tensionMoment) {
          this.memoryContext.tensionMoments.push(sceneData.tensionMoment);
        }
        if (sceneData.powerShift) {
          this.memoryContext.powerShifts.push(sceneData.powerShift);
        }
      },

      getDirective(isOpening = false) {
        return buildRomanceEngineDirective({
          eroticismLevel: this.eroticismLevel,
          isOpening,
          privateLanguage: this.privateLanguage.length > 0 ? this.privateLanguage : null,
          memoryContext: (this.memoryContext.unspoken.length > 0 || this.memoryContext.debts.length > 0)
            ? this.memoryContext : null
        });
      }
    };
  }

  // ===========================================================================
  // EROTIC INTENSITY SYSTEM (CLIENT-SIDE MIRROR)
  // ===========================================================================
  // Mirror of /api/erotic-intensity.js for frontend use
  // Eroticism is conveyed through sensation, implication, emotional tension, restraint
  // NEVER through explicit acts, genital focus, or pornographic mechanics

  const INTENSITY_TIERS = {
    TEASE: {
      name: 'Tease',
      emotionalState: 'Awareness, curiosity, the first flicker of want.',
      composition: 'Distance and awareness. Eyes meeting across space. The charged gap between bodies.',
      allowedFocus: ['Eye contact', 'Accidental touch', 'Voice changes', 'Awareness of being watched'],
      disallowed: ['Direct arousal statements', 'Descriptions below collarbone', 'Undressing']
    },
    CHARGED: {
      name: 'Charged',
      emotionalState: 'Acknowledged want. The pretense has cracked.',
      composition: 'Proximity and tension. Faces close, breath-distance apart. Hands at wrist, jaw, shoulder.',
      allowedFocus: ['Space between mouths', 'Hands that hover', 'Pulse points', 'Heat through fabric'],
      disallowed: ['Explicit arousal states', 'Hands below waist', 'Clothing removal beyond outer layer']
    },
    BRINK_OF_SEX: {
      name: 'Brink-of-Sex',
      emotionalState: 'The edge. One breath from crossing. Inevitable but not yet.',
      composition: 'Contact and threshold. Bodies pressed. Hands in hair, gripping fabric. The surrender.',
      allowedFocus: ['Surrender of control', 'Hands in hair/face/small of back', 'Mouths meeting', 'Fabric twisted/pushed aside'],
      disallowed: ['Explicit sexual acts', 'Genital focus', 'Full undressing', 'Pornographic framing']
    }
  };

  /**
   * Map player intensity setting to maximum allowed erotic tier.
   */
  function getMaxTierForIntensity(intensitySetting) {
    const mapping = {
      'Clean': null,           // No erotic tiers
      'Naughty': 'TEASE',      // Awareness and flirtation
      'Erotic': 'CHARGED',     // Acknowledged desire
      'Dirty': 'BRINK_OF_SEX'  // The edge
    };
    return mapping[intensitySetting] || 'TEASE';
  }

  /**
   * Get the appropriate tier for current scene context.
   */
  function selectTierForScene(intensitySetting, narrativePhase) {
    const maxTier = getMaxTierForIntensity(intensitySetting);
    if (!maxTier) return null;

    const tierOrder = ['TEASE', 'CHARGED', 'BRINK_OF_SEX'];
    const maxIndex = tierOrder.indexOf(maxTier);

    const phaseMapping = {
      'early': 0,        // TEASE
      'rising': 1,       // CHARGED (if allowed)
      'climactic': 2     // BRINK_OF_SEX (if allowed)
    };

    const phaseIndex = phaseMapping[narrativePhase] || 0;
    const selectedIndex = Math.min(phaseIndex, maxIndex);

    return tierOrder[selectedIndex];
  }

  /**
   * Build the erotic intensity directive for image visualization.
   * Returns composition guidance based on tier.
   */
  function buildImageIntensityDirective(intensitySetting, narrativePhase = 'early') {
    const tier = selectTierForScene(intensitySetting, narrativePhase);

    if (!tier) {
      return 'EROTIC INTENSITY: NONE. No erotic content. Characters may appear together without romantic/erotic tension.';
    }

    const tierConfig = INTENSITY_TIERS[tier];
    return `EROTIC INTENSITY: ${tierConfig.name.toUpperCase()}
${tierConfig.emotionalState}

COMPOSITION: ${tierConfig.composition}
ALLOWED: ${tierConfig.allowedFocus.join(', ')}
FORBIDDEN: ${tierConfig.disallowed.join(', ')}

Eroticism through posture, proximity, and restraint. NEVER through explicit display.`;
  }

  // ===========================================================================
  // ORCHESTRATION STATE
  // ===========================================================================

  /**
   * Create a fresh orchestration state for a story generation cycle.
   */
  function createOrchestrationState(eroticismLevel = 'Naughty') {
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
      errors: [],
      timing: {
        startTime: Date.now(),
        authorPassMs: 0,
        renderPassMs: 0,
        integrationPassMs: 0
      },
      // Romance Engine state
      romanceMode: mapIntensityToRomanceMode(eroticismLevel),
      romanceState: createRomanceState(eroticismLevel),
      isOpeningScene: false
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
     * - Generate Erotic Scene Directive (if needed)
     */

    state.phase = 'AUTHOR_PASS';
    if (onPhaseChange) onPhaseChange('AUTHOR_PASS');

    const authorStartTime = Date.now();

    try {
      const authorSystemPrompt = `${systemPrompt}

=== PRIMARY AUTHOR RESPONSIBILITIES ===
You are the PRIMARY AUTHOR. You have EXCLUSIVE authority over:
- Plot progression and what happens
- Character psychology and interiority
- Whether intimacy occurs in this scene
- Whether the scene should be interrupted

MONETIZATION CONSTRAINTS (NON-NEGOTIABLE):
- Access Tier: ${state.gateEnforcement.gateName}
- Effective Eroticism Level: ${state.gateEnforcement.effectiveEroticism}
- Completion Allowed: ${state.gateEnforcement.completionAllowed ? 'YES' : 'NO'}
- Cliffhanger Required: ${state.gateEnforcement.cliffhangerRequired ? 'YES' : 'NO'}

${state.gateEnforcement.effectiveEroticism === 'Erotic' || state.gateEnforcement.effectiveEroticism === 'Dirty' ? `
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

      const authorOutput = await callChatGPT(messages, 'PRIMARY_AUTHOR');
      state.authorOutput = authorOutput;

      // Check for ESD in author output
      const esdMatch = authorOutput.match(/\[ESD\]([\s\S]*?)\[\/ESD\]/);
      if (esdMatch) {
        state.esd = parseESD(esdMatch[1], state.gateEnforcement);
      }

      state.timing.authorPassMs = Date.now() - authorStartTime;

    } catch (err) {
      state.errors.push(`Author Pass failed: ${err.message}`);
      console.error('[ORCHESTRATION] Author Pass failed:', err);
      throw new Error(`ChatGPT Author Pass failed: ${err.message}`);
    }

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

        // Strip ESD block from output if present
        state.integrationOutput = state.integrationOutput.replace(/\[ESD\][\s\S]*?\[\/ESD\]/g, '').trim();

        // Handle Fate Stumbled
        if (state.fateStumbled) {
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
      // Use author output as fallback (strip ESD)
      state.integrationOutput = state.authorOutput.replace(/\[ESD\][\s\S]*?\[\/ESD\]/g, '').trim();
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
      errors: state.errors,
      timing: state.timing
    };
  }

  // ===========================================================================
  // PROMPT BUILDERS
  // ===========================================================================

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
    // Strip ESD block from author output
    const cleanAuthorOutput = authorOutput.replace(/\[ESD\][\s\S]*?\[\/ESD\]/g, '').trim();

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

    // Legacy compatibility
    callChat: callChatLegacy,
    callChatGPT,
    callSpecialistRenderer,

    // Fate Card processing
    processFateCard,

    // Utilities
    enforceMonetizationGates,
    validateESD,
    createOrchestrationState,

    // Romance Engine
    buildRomanceEngineDirective,
    createRomanceState,
    mapIntensityToRomanceMode,
    generateModeDirectives,
    ROMANCE_MODES: Object.freeze({ ...ROMANCE_MODES }),

    // Erotic Intensity System
    buildImageIntensityDirective,
    selectTierForScene,
    getMaxTierForIntensity,
    INTENSITY_TIERS: Object.freeze({ ...INTENSITY_TIERS }),

    // Configuration (read-only)
    CONFIG: Object.freeze({ ...CONFIG }),
    MONETIZATION_GATES: Object.freeze({ ...MONETIZATION_GATES })
  };

  console.log('[ORCHESTRATION] Storybound AI Orchestration Client initialized');

})(window);
