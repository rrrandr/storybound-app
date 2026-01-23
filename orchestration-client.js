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
      errors: [],
      timing: {
        startTime: Date.now(),
        authorPassMs: 0,
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
  // CHARACTER DRIVE LENS BIAS (CLIENT-SIDE)
  // ===========================================================================

  /**
   * Lens pacing rules for client-side directive building.
   * Mirrors server-side LENS_BIAS_RULES for consistency.
   */
  const LENS_PACING_RULES = {
    WITHHELD_CORE: {
      minRevealProgress: 0.60,
      maxRevealProgress: 0.80
    },
    MORAL_FRICTION_ENGINE: {
      maxCostFreeBeats: 2
    },
    UNEXPECTED_COMPETENCE: {
      minProgressForReveal: 0.20,
      minSetupBeats: 1
    },
    VOLATILE_MIRROR: {
      maxSyncDelay: 1
    }
  };

  /**
   * Build lens bias directives for the author prompt (client-side).
   * Returns structural pacing instructions, NOT prose guidance.
   */
  function buildLensBiasDirectivesClient(lensBias, storyProgress) {
    if (!lensBias) return '';

    const directives = [];
    const progress = storyProgress || 0;

    // Process protagonist lenses
    if (lensBias.protagonist?.lenses?.length > 0) {
      for (const lensId of lensBias.protagonist.lenses) {
        const rule = LENS_PACING_RULES[lensId];
        if (!rule) continue;

        const meta = lensBias.protagonist.lensMeta?.[lensId] || {};

        if (lensId === 'WITHHELD_CORE' && progress < rule.minRevealProgress) {
          directives.push(`PROTAGONIST: Major revelation GATED until ${Math.round(rule.minRevealProgress * 100)}% progress.`);
        }

        if (lensId === 'MORAL_FRICTION_ENGINE' && (meta.costFreeStreak || 0) >= rule.maxCostFreeBeats) {
          directives.push(`PROTAGONIST: Character needs ethical friction. Next choice must carry cost.`);
        }

        if (lensId === 'UNEXPECTED_COMPETENCE' && !meta.competenceRevealed) {
          if (progress < rule.minProgressForReveal || (meta.setupBeatsCompleted || 0) < rule.minSetupBeats) {
            directives.push(`PROTAGONIST: Hidden capability must remain hidden until setup complete.`);
          }
        }
      }
    }

    // Process love interest lenses
    if (lensBias.loveInterest?.lenses?.length > 0) {
      const archetype = lensBias.loveInterestArchetype;
      const isRogue = archetype === 'ROGUE' || archetype === 'ENCHANTING';

      for (const lensId of lensBias.loveInterest.lenses) {
        const rule = LENS_PACING_RULES[lensId];
        if (!rule) continue;

        const meta = lensBias.loveInterest.lensMeta?.[lensId] || {};

        if (lensId === 'WITHHELD_CORE' && progress < (rule.minRevealProgress || 0.6)) {
          directives.push(`LOVE INTEREST: Major revelation GATED. Create anticipation.`);
        }

        if (lensId === 'VOLATILE_MIRROR') {
          if (isRogue) {
            directives.push(`LOVE INTEREST: Emotional response must INVERT protagonist state.`);
          } else {
            directives.push(`LOVE INTEREST: Emotional beats sync with protagonist state.`);
          }
          if (!meta.baselineEstablished) {
            directives.push(`LOVE INTEREST: Establish independent motivation before reactive mirroring.`);
          }
        }

        if (lensId === 'MORAL_FRICTION_ENGINE' && (meta.costFreeStreak || 0) >= (rule.maxCostFreeBeats || 2)) {
          directives.push(`LOVE INTEREST: Character needs ethical friction.`);
        }
      }
    }

    if (directives.length === 0) return '';

    return `
=== CHARACTER PACING CONSTRAINTS (STRUCTURAL) ===
${directives.join('\n')}
These are mechanical gates, not personality guidance.
`;
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
      lensBias,           // Character Drive Lens bias data (optional)
      storyProgress,      // Current story progress 0-1 (optional)
      systemPrompt,
      onPhaseChange
    } = params;

    const state = createOrchestrationState();

    // =========================================================================
    // PRE-FLIGHT: Enforce Monetization Gates
    // =========================================================================
    state.gateEnforcement = enforceMonetizationGates(accessTier, requestedEroticism);

    // =========================================================================
    // PRE-FLIGHT: Build Lens Bias Directives
    // =========================================================================
    let lensBiasDirectives = '';
    if (lensBias && window.LensSystem) {
      // Validate lens state before generation
      // Get assignment params from state for fallback (if available)
      const assignmentParams = lensBias._assignmentParams || null;

      const lensValidation = window.LensSystem.validateBeforeGeneration({
        protagonist: lensBias.protagonist,
        loveInterest: lensBias.loveInterest,
        storyProgress: storyProgress || 0,
        storyLength: 3  // Assume minimum for validation
      }, assignmentParams);

      // CRITICAL: Generation is BLOCKED if validation fails and fallback fails
      if (!lensValidation.canGenerate) {
        console.error('[LENS SYSTEM][CRITICAL] Generation blocked:', lensValidation.errors);
        throw new Error('Lens validation failed: ' + lensValidation.errors.map(e => e.message).join('; '));
      }

      // Apply updated state if fallback was used
      if (lensValidation.state && lensValidation.state.protagonist) {
        lensBias.protagonist = lensValidation.state.protagonist;
        lensBias.loveInterest = lensValidation.state.loveInterest;
        console.log('[LENS SYSTEM][FALLBACK] Updated lens state applied');
      }

      if (lensValidation.warnings.length > 0) {
        console.warn('[LENS SYSTEM] Warnings:', lensValidation.warnings);
      }

      // Build pacing directives for each active lens
      lensBiasDirectives = buildLensBiasDirectivesClient(lensBias, storyProgress || 0);
    }

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
${lensBiasDirectives}
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

    // Configuration (read-only)
    CONFIG: Object.freeze({ ...CONFIG }),
    MONETIZATION_GATES: Object.freeze({ ...MONETIZATION_GATES })
  };

  console.log('[ORCHESTRATION] Storybound AI Orchestration Client initialized');

})(window);
