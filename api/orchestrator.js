/**
 * =============================================================================
 * STORYBOUND AI ORCHESTRATION ENGINE
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This module enforces the canonical model roles and orchestration order for
 * Storybound's multi-model AI architecture.
 *
 * =============================================================================
 * ROMANCE ENGINE INTEGRATION
 * =============================================================================
 *
 * The Romance Engine is integrated into the orchestration flow to ensure:
 * - Mode-appropriate pacing (CASUAL, STANDARD, HIGH-INTENSITY)
 * - Core romance rules enforcement (asymmetrical want, power dynamics, etc.)
 * - Private language and memory gravity tracking
 * - Self-validation before output
 *
 * See /api/romance-engine.js for full specification.
 *
 * =============================================================================
 * WHY THIS ARCHITECTURE EXISTS (DO NOT COLLAPSE)
 * =============================================================================
 *
 * Storybound uses MULTIPLE AI models with STRICT SEPARATION OF AUTHORITY:
 *
 * 1. ChatGPT (PRIMARY AUTHOR — ALWAYS CALLED)
 *    - ONLY model allowed to author plot progression
 *    - ONLY model allowed to determine if intimacy occurs
 *    - ONLY model allowed to enforce monetization gates
 *    - ONLY model allowed to generate Erotic Scene Directives (ESD)
 *    - Runs BEFORE any specialist renderer
 *    - Runs AFTER any specialist renderer (integration pass)
 *    - FINAL AUTHORITY on story state
 *
 * 2. Specialist Renderer (e.g., Grok) — CONDITIONAL
 *    - Purpose: Sensory embodiment ONLY
 *    - May ONLY receive a fully-specified ESD
 *    - May NEVER decide plot, invent lore, or change outcomes
 *    - NEVER decides "how far things go"
 *    - Renders HOW IT FEELS, within bounds
 *
 * 3. Fate Cards — Dual-Model Split
 *    - GPT-5.1: Structural authority (REQUIRED)
 *    - GPT-5.2: Linguistic elevation (OPTIONAL, discardable)
 *
 * DO NOT MERGE THESE RESPONSIBILITIES. The separation is intentional.
 *
 * =============================================================================
 */

// =============================================================================
// ROMANCE ENGINE IMPORT
// =============================================================================

const {
  buildRomanceEngineDirective,
  createRomanceState,
  mapIntensityToRomanceMode,
  ROMANCE_MODES
} = require('./romance-engine');

// =============================================================================
// EROTIC INTENSITY SYSTEM IMPORT
// =============================================================================

const {
  buildProseIntensityDirective,
  selectTierForScene,
  getMaxTierForIntensity,
  INTENSITY_TIERS
} = require('./erotic-intensity');

// =============================================================================
// MODEL ALLOWLISTS — PINNED VERSIONS (NO AUTO-UPGRADES)
// =============================================================================

/**
 * Allowlisted models for each role.
 * Models must be explicitly listed here to be used.
 * This prevents silent upgrades from breaking story constraints.
 */
const ALLOWED_MODELS = {
  // ChatGPT models for primary authoring (DSP, normalization, veto, story logic, ESD)
  PRIMARY_AUTHOR: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4'
  ],

  // Normalization roles - ALWAYS use OpenAI, NEVER Grok
  NORMALIZATION: [
    'gpt-4o-mini'
  ],

  VETO_NORMALIZATION: [
    'gpt-4o-mini'
  ],

  DSP_NORMALIZATION: [
    'gpt-4o-mini'
  ],

  // Renderer model for visual bible extraction and visualization prompts ONLY
  RENDERER: [
    'grok-4-fast-non-reasoning'
  ],

  // Sex renderer model for explicit scenes (ESD-gated, entitlement-checked)
  SEX_RENDERER: [
    'grok-4-fast-reasoning'
  ],

  // Fate Card structural authority
  FATE_STRUCTURAL: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo'
  ],

  // Fate Card linguistic elevation
  FATE_ELEVATION: [
    'gpt-4o',
    'gpt-4o-mini'
  ]
};

// Default models for each role
const DEFAULT_MODELS = {
  PRIMARY_AUTHOR: 'gpt-4o-mini',
  NORMALIZATION: 'gpt-4o-mini',
  VETO_NORMALIZATION: 'gpt-4o-mini',
  DSP_NORMALIZATION: 'gpt-4o-mini',
  RENDERER: 'grok-4-fast-non-reasoning',        // Visual bible, visualization prompts ONLY
  SEX_RENDERER: 'grok-4-fast-reasoning',        // Explicit scenes (ESD-gated)
  FATE_STRUCTURAL: 'gpt-4o-mini',
  FATE_ELEVATION: 'gpt-4o-mini'
};

// =============================================================================
// MONETIZATION GATES — LOCKED RULES (NON-NEGOTIABLE)
// =============================================================================

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

// =============================================================================
// EROTIC SCENE DIRECTIVE (ESD) SCHEMA
// =============================================================================

/**
 * The ESD is the ONLY interface between ChatGPT and any specialist renderer.
 * The renderer NEVER receives:
 * - Raw user input
 * - Monetization tier UI
 * - Freeform prompts
 *
 * The renderer ONLY receives:
 * - ESD JSON
 * - Rendering instructions
 * - Hard stop rules
 */
const ESD_SCHEMA = {
  required: [
    'sceneId',           // Unique identifier for this scene
    'eroticismLevel',    // Clean | Naughty | Erotic | Dirty
    'completionAllowed', // Boolean - can scene reach completion?
    'interruptionPoint', // If completion forbidden, where to cut off
    'participants',      // Array of participant descriptors (no lore)
    'setting',           // Scene environment (no plot context)
    'emotionalCore',     // The feeling to render (not the outcome)
    'physicalBounds',    // What is explicitly allowed/forbidden
    'duration',          // Target word count
    'hardStops'          // Conditions that MUST halt rendering
  ],
  forbidden: [
    'plotContext',       // Renderer must not know plot
    'storyHistory',      // Renderer must not know previous events
    'monetizationTier',  // Renderer must not know payment status
    'userPreferences',   // Renderer receives only ESD constraints
    'fateCardContext',   // Renderer must not interact with Fate system
    'globalState'        // Renderer sees only this scene
  ]
};

/**
 * Validate an ESD before sending to specialist renderer.
 * Returns { valid: boolean, errors: string[] }
 */
function validateESD(esd) {
  const errors = [];

  // Check required fields
  for (const field of ESD_SCHEMA.required) {
    if (!(field in esd)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check forbidden fields are not present
  for (const field of ESD_SCHEMA.forbidden) {
    if (field in esd) {
      errors.push(`Forbidden field present: ${field} (renderer must not receive this)`);
    }
  }

  // Validate eroticism level
  if (esd.eroticismLevel && !['Clean', 'Naughty', 'Erotic', 'Dirty'].includes(esd.eroticismLevel)) {
    errors.push(`Invalid eroticism level: ${esd.eroticismLevel}`);
  }

  // Validate hard stops exist
  if (esd.hardStops && (!Array.isArray(esd.hardStops) || esd.hardStops.length === 0)) {
    errors.push('ESD must include at least one hard stop condition');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create an empty/default ESD structure.
 * ChatGPT populates this during the Author Pass.
 */
function createEmptyESD() {
  return {
    sceneId: null,
    eroticismLevel: 'Clean',
    completionAllowed: false,
    interruptionPoint: null,
    participants: [],
    setting: null,
    emotionalCore: null,
    physicalBounds: {
      allowed: [],
      forbidden: []
    },
    duration: 200,
    hardStops: ['consent_withdrawal', 'scene_boundary']
  };
}

// =============================================================================
// MODEL SELECTION GUARDRAILS
// =============================================================================

/**
 * Validate that a model is allowed for a given role.
 * Throws an error if the model is not in the allowlist.
 *
 * This prevents:
 * - Silent model upgrades
 * - Unauthorized model substitutions
 * - Configuration errors
 */
function validateModelForRole(model, role) {
  const allowlist = ALLOWED_MODELS[role];
  if (!allowlist) {
    throw new Error(`Unknown role: ${role}`);
  }

  if (!allowlist.includes(model)) {
    throw new Error(
      `Disallowed model "${model}" for role "${role}". ` +
      `Allowed models: ${allowlist.join(', ')}`
    );
  }

  return true;
}

/**
 * Get the default model for a role.
 */
function getDefaultModel(role) {
  const model = DEFAULT_MODELS[role];
  if (!model) {
    throw new Error(`No default model configured for role: ${role}`);
  }
  return model;
}

// =============================================================================
// MONETIZATION GATE ENFORCEMENT
// =============================================================================

/**
 * Enforce monetization gates BEFORE any renderer call.
 * Returns the constraints that must be applied.
 *
 * This function is called by the orchestrator to determine:
 * - What eroticism level is allowed
 * - Whether completion is permitted
 * - Whether a cliffhanger is required
 */
function enforceMonetizationGates(accessTier, requestedEroticism) {
  const gate = MONETIZATION_GATES[accessTier];
  if (!gate) {
    // Default to most restrictive
    console.warn(`Unknown access tier: ${accessTier}, defaulting to 'free'`);
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

/**
 * Check if specialist renderer should be called.
 * Renderer is ONLY called if:
 * - An intimacy scene exists AND
 * - Eroticism level warrants it (Erotic or Dirty) AND
 * - The selected provider is contractually allowed
 */
function shouldCallSexRenderer(esd, gateEnforcement) {
  // No ESD means no intimacy scene
  if (!esd || !esd.sceneId) {
    return { shouldCall: false, reason: 'No intimacy scene defined' };
  }

  // Check eroticism level
  const rendererLevels = ['Erotic', 'Dirty'];
  if (!rendererLevels.includes(esd.eroticismLevel)) {
    return {
      shouldCall: false,
      reason: `Eroticism level ${esd.eroticismLevel} does not require specialist renderer`
    };
  }

  // Check if tier allows this eroticism level
  if (gateEnforcement.wasDowngraded) {
    return {
      shouldCall: false,
      reason: `Eroticism downgraded from ${gateEnforcement.requestedEroticism} to ${gateEnforcement.effectiveEroticism} due to tier restrictions`
    };
  }

  return { shouldCall: true, reason: 'Specialist renderer authorized' };
}

// =============================================================================
// ORCHESTRATION STATE
// =============================================================================

/**
 * Orchestration state for a single story generation cycle.
 * Tracks the three-phase flow: Author → Renderer → Integration
 * Includes Romance Engine state for pacing and memory tracking.
 */
function createOrchestrationState(eroticismLevel = 'Naughty') {
  return {
    phase: 'AUTHOR_PASS',  // AUTHOR_PASS | RENDER_PASS | INTEGRATION_PASS
    authorOutput: null,     // ChatGPT's initial output
    esd: null,              // Generated ESD (if intimacy occurs)
    rendererOutput: null,   // Specialist renderer output (if called)
    integrationOutput: null,// Final integrated output
    gateEnforcement: null,  // Monetization gate results
    rendererCalled: false,  // Whether specialist was invoked
    rendererFailed: false,  // Whether specialist failed
    fateStumbled: false,    // Whether Fate Stumbled was triggered
    errors: [],             // Accumulated errors

    // Romance Engine state
    romanceMode: mapIntensityToRomanceMode(eroticismLevel),
    romanceState: createRomanceState(eroticismLevel),
    isOpeningScene: false   // Set to true for first scene
  };
}

// =============================================================================
// FATE CARD DUAL-MODEL ORCHESTRATION
// =============================================================================

/**
 * Fate Card processing follows a strict dual-model split:
 *
 * GPT-5.1 (Structural Authority) — REQUIRED
 * - Defines card identity, scope, and effect
 * - Defines action/dialogue seeds
 * - Enforces consent, safety, and intensity ceilings
 * - Output is CANONICAL and FROZEN
 *
 * GPT-5.2 (Linguistic Elevation) — OPTIONAL
 * - May only be called AFTER GPT-5.1 output is locked
 * - May elevate phrasing, emotional gravity, tension
 * - May NOT explain, command, or imply control
 * - May NOT add outcomes or awareness
 * - If violated, output is DISCARDED and GPT-5.1 text is used
 *
 * There is NO live improvisation.
 */

/**
 * Fate Card elevation rules that GPT-5.2 must follow.
 * If any are violated, the elevation is discarded.
 */
const FATE_ELEVATION_RULES = {
  forbidden: [
    'explain',           // No explanation of what card does
    'command',           // No imperative/command forms
    'imply_control',     // No suggestion that Fate controls player
    'add_outcomes',      // No new outcomes beyond GPT-5.1
    'add_awareness',     // No meta-awareness injection
    'speak_as_fate',     // Card cannot speak as Fate entity
    'speak_as_author',   // Card cannot speak as Author entity
    'speak_as_system'    // Card cannot use system voice
  ],
  allowed: [
    'elevate_phrasing',   // Better word choice
    'increase_gravity',   // More emotional weight
    'enhance_tension',    // Heighten dramatic tension
    'poetic_language'     // Metaphor, imagery
  ]
};

/**
 * Validate GPT-5.2 elevation output against rules.
 * Returns { valid: boolean, violations: string[] }
 */
function validateFateElevation(originalText, elevatedText) {
  const violations = [];
  const lower = elevatedText.toLowerCase();

  // Check for forbidden patterns
  if (/you (must|will|shall|have to)/.test(lower)) {
    violations.push('command');
  }
  if (/fate (controls|decides|commands|forces)/.test(lower)) {
    violations.push('imply_control');
  }
  if (/this card (will|makes|causes)/.test(lower)) {
    violations.push('explain');
  }
  if (/the author|the system|game mechanics/.test(lower)) {
    violations.push('speak_as_system');
  }

  // Check if outcomes were added (new named entities or actions)
  const originalWords = new Set(originalText.toLowerCase().split(/\s+/));
  const elevatedWords = elevatedText.toLowerCase().split(/\s+/);
  const newWords = elevatedWords.filter(w => !originalWords.has(w) && w.length > 5);

  // Too many new substantial words might indicate added outcomes
  if (newWords.length > originalWords.size * 0.5) {
    violations.push('add_outcomes');
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Process a Fate Card through the dual-model pipeline.
 * Returns the final card text (GPT-5.1 if elevation fails).
 */
async function processFateCard(card, callGPT51, callGPT52 = null) {
  // Phase 1: GPT-5.1 Structural Authority (REQUIRED)
  const structuralOutput = await callGPT51(card);

  if (!structuralOutput) {
    throw new Error('GPT-5.1 structural pass failed - Fate Card cannot be generated');
  }

  // Lock structural output - this is canonical
  const lockedStructure = {
    ...card,
    structuralText: structuralOutput,
    elevatedText: null,
    elevationUsed: false
  };

  // Phase 2: GPT-5.2 Linguistic Elevation (OPTIONAL)
  if (callGPT52) {
    try {
      const elevatedOutput = await callGPT52(structuralOutput);

      if (elevatedOutput) {
        const validation = validateFateElevation(structuralOutput, elevatedOutput);

        if (validation.valid) {
          lockedStructure.elevatedText = elevatedOutput;
          lockedStructure.elevationUsed = true;
        } else {
          console.warn(
            `Fate Card elevation discarded due to violations: ${validation.violations.join(', ')}`
          );
          // GPT-5.1 text is used as fallback
        }
      }
    } catch (err) {
      console.warn('GPT-5.2 elevation failed, using GPT-5.1 output:', err.message);
      // Non-fatal - GPT-5.1 text is used
    }
  }

  return lockedStructure;
}

// =============================================================================
// MAIN ORCHESTRATION FLOW
// =============================================================================

/**
 * Execute the full story generation orchestration.
 *
 * NON-NEGOTIABLE ORDER:
 * 1. ChatGPT — Author Pass
 * 2. Specialist Renderer (OPTIONAL)
 * 3. ChatGPT — Integration Pass
 *
 * This order MUST be enforced. No step may be skipped or reordered.
 */
async function orchestrateStoryGeneration({
  accessTier,
  requestedEroticism,
  storyContext,
  playerAction,
  playerDialogue,
  fateCard,
  callChatGPT,        // Function to call ChatGPT
  callSpecialist,     // Function to call specialist renderer
  onPhaseChange,      // Callback for UI updates
  isOpeningScene = false, // Romance Engine: is this the opening scene?
  romanceState = null     // Romance Engine: persistent state across scenes
}) {
  const state = createOrchestrationState(requestedEroticism);
  state.isOpeningScene = isOpeningScene;

  // Use provided romance state or the freshly created one
  if (romanceState) {
    state.romanceState = romanceState;
    state.romanceMode = romanceState.mode;
  }

  // ==========================================================================
  // PRE-FLIGHT: Enforce Monetization Gates
  // ==========================================================================
  state.gateEnforcement = enforceMonetizationGates(accessTier, requestedEroticism);

  if (onPhaseChange) {
    onPhaseChange('GATE_CHECK', state.gateEnforcement);
  }

  // ==========================================================================
  // PHASE 1: ChatGPT Author Pass (ALWAYS RUNS)
  // ==========================================================================
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

  try {
    const authorPrompt = buildAuthorPrompt({
      storyContext,
      playerAction,
      playerDialogue,
      fateCard,
      gateEnforcement: state.gateEnforcement,
      romanceState: state.romanceState,
      isOpeningScene: state.isOpeningScene
    });

    const authorResult = await callChatGPT(authorPrompt, 'PRIMARY_AUTHOR');

    state.authorOutput = authorResult.storyText;
    state.esd = authorResult.esd || null;

    // Record romance metadata if present (for memory gravity tracking)
    if (authorResult.romanceMetadata && state.romanceState) {
      state.romanceState.recordScene(authorResult.romanceMetadata);
    }

  } catch (err) {
    state.errors.push(`Author Pass failed: ${err.message}`);
    throw new Error(`ChatGPT Author Pass failed: ${err.message}`);
  }

  // ==========================================================================
  // PHASE 2: Specialist Renderer (CONDITIONAL)
  // ==========================================================================
  /**
   * Specialist renderer is called ONLY if:
   * - An intimacy scene exists (ESD was generated)
   * - Eroticism level warrants it (Erotic or Dirty)
   * - Monetization tier allows it
   *
   * The renderer:
   * - Receives ONLY the ESD (no plot context)
   * - Renders sensory embodiment within bounds
   * - NEVER decides outcomes or plot
   */
  const renderDecision = shouldCallSexRenderer(state.esd, state.gateEnforcement);

  if (renderDecision.shouldCall) {
    state.phase = 'RENDER_PASS';
    if (onPhaseChange) onPhaseChange('RENDER_PASS');

    // Validate ESD before sending to renderer
    const esdValidation = validateESD(state.esd);
    if (!esdValidation.valid) {
      state.errors.push(`Invalid ESD: ${esdValidation.errors.join('; ')}`);
      // Fall through to integration without renderer output
    } else {
      try {
        // Apply completion constraints from monetization gates
        if (!state.gateEnforcement.completionAllowed) {
          state.esd.completionAllowed = false;
          state.esd.hardStops.push('monetization_gate_completion_forbidden');
        }

        state.rendererOutput = await callSpecialist(state.esd, 'SEX_RENDERER');
        state.rendererCalled = true;

      } catch (err) {
        // FAILURE HANDLING: Renderer failure is NOT story failure
        state.rendererFailed = true;
        state.fateStumbled = true;
        state.errors.push(`Specialist Renderer failed: ${err.message}`);
        console.error('Specialist renderer failed, ChatGPT will recover:', err.message);
        // Story continues without renderer output
      }
    }
  } else {
    console.log(`Specialist renderer skipped: ${renderDecision.reason}`);
  }

  // ==========================================================================
  // PHASE 3: ChatGPT Integration Pass (ALWAYS RUNS)
  // ==========================================================================
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

  try {
    const integrationPrompt = buildIntegrationPrompt({
      authorOutput: state.authorOutput,
      rendererOutput: state.rendererOutput,
      rendererCalled: state.rendererCalled,
      rendererFailed: state.rendererFailed,
      gateEnforcement: state.gateEnforcement,
      fateStumbled: state.fateStumbled
    });

    const integrationResult = await callChatGPT(integrationPrompt, 'PRIMARY_AUTHOR');

    state.integrationOutput = integrationResult.storyText;

    // Apply cliffhanger if required by monetization
    if (state.gateEnforcement.cliffhangerRequired && !integrationResult.hasCliffhanger) {
      // Force cliffhanger ending
      state.integrationOutput += '\n\n[Scene interrupted — the moment hangs suspended...]';
    }

  } catch (err) {
    state.errors.push(`Integration Pass failed: ${err.message}`);
    // Use author output as fallback
    state.integrationOutput = state.authorOutput;
  }

  // ==========================================================================
  // RETURN FINAL STATE
  // ==========================================================================
  return {
    success: state.errors.length === 0,
    finalOutput: state.integrationOutput,
    orchestrationState: state,
    gateEnforcement: state.gateEnforcement,
    rendererUsed: state.rendererCalled && !state.rendererFailed,
    fateStumbled: state.fateStumbled,
    errors: state.errors,

    // Romance Engine state for persistence across scenes
    romanceState: state.romanceState,
    romanceMode: state.romanceMode
  };
}

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

/**
 * Build the prompt for ChatGPT's Author Pass.
 * This prompt instructs ChatGPT on its exclusive responsibilities.
 * Includes Romance Engine directives for proper pacing and tension.
 */
function buildAuthorPrompt({
  storyContext,
  playerAction,
  playerDialogue,
  fateCard,
  gateEnforcement,
  romanceState = null,
  isOpeningScene = false,
  narrativePhase = 'early' // 'early' | 'rising' | 'climactic'
}) {
  // Build Romance Engine directive
  const romanceDirective = romanceState
    ? romanceState.getDirective(isOpeningScene)
    : buildRomanceEngineDirective({
        eroticismLevel: gateEnforcement.effectiveEroticism,
        isOpening: isOpeningScene
      });

  // Build Erotic Intensity directive for prose (tier-aware)
  const eroticIntensityDirective = buildProseIntensityDirective(
    gateEnforcement.effectiveEroticism,
    narrativePhase
  );

  return {
    systemPrompt: `You are the PRIMARY AUTHOR for Storybound.

YOUR EXCLUSIVE RESPONSIBILITIES (no other model may do these):
- Author overall plot progression
- Write character interiority and psychology
- Determine dialogue intent
- Decide WHAT happens in the scene
- Decide WHETHER intimacy occurs
- Decide WHETHER a scene must be interrupted

MONETIZATION CONSTRAINTS (NON-NEGOTIABLE):
- Access Tier: ${gateEnforcement.gateName} (${gateEnforcement.accessTier})
- Allowed Eroticism: ${gateEnforcement.effectiveEroticism}
- Completion Allowed: ${gateEnforcement.completionAllowed}
- Cliffhanger Required: ${gateEnforcement.cliffhangerRequired}

${romanceDirective}

${eroticIntensityDirective}

If an intimacy scene occurs at Erotic or Dirty level, you MUST generate an Erotic Scene Directive (ESD) in your response. The ESD will be passed to a specialist renderer.

OUTPUT FORMAT:
Return a JSON object with:
{
  "storyText": "The narrative text for this beat",
  "intimacyOccurs": boolean,
  "esd": { ... } or null,
  "romanceMetadata": {
    "newPhrase": null or "shared phrase introduced",
    "tensionMoment": null or "description of key tension",
    "unspoken": null or "thing left unsaid",
    "powerShift": null or { "from": "character", "to": "character", "trigger": "what caused it" }
  }
}`,
    userPrompt: `Story Context: ${storyContext}
Player Action: ${playerAction}
Player Dialogue: ${playerDialogue}
${fateCard ? `Fate Card Played: ${fateCard.title} - ${fateCard.desc}` : ''}

Write the next story beat (150-250 words).`
  };
}

/**
 * Build the prompt for ChatGPT's Integration Pass.
 * This prompt handles post-scene integration and state updates.
 */
function buildIntegrationPrompt({
  authorOutput,
  rendererOutput,
  rendererCalled,
  rendererFailed,
  gateEnforcement,
  fateStumbled
}) {
  let rendererContext = '';

  if (rendererCalled && !rendererFailed && rendererOutput) {
    rendererContext = `
SPECIALIST RENDERER OUTPUT (integrate this sensory content):
${rendererOutput}`;
  } else if (rendererFailed) {
    rendererContext = `
NOTE: The specialist renderer failed. Fate Stumbled.
Continue the scene with appropriate gravity, acknowledging the interruption narratively.`;
  }

  return {
    systemPrompt: `You are performing the INTEGRATION PASS for Storybound.

YOUR RESPONSIBILITIES:
- Absorb any specialist renderer output into the narrative
- Apply consequences of the scene
- Update relationship state
- Enforce cliffhanger if required by tier
- You are the FINAL AUTHORITY on story state

MONETIZATION CONSTRAINTS:
- Cliffhanger Required: ${gateEnforcement.cliffhangerRequired}
- Completion Allowed: ${gateEnforcement.completionAllowed}

${fateStumbled ? 'FATE STUMBLED: Handle the interruption gracefully in the narrative.' : ''}

OUTPUT FORMAT:
Return a JSON object with:
{
  "storyText": "The integrated narrative text",
  "consequences": ["list of story consequences"],
  "relationshipUpdates": {},
  "hasCliffhanger": boolean
}`,
    userPrompt: `AUTHOR PASS OUTPUT:
${authorOutput}
${rendererContext}

Integrate the scene and finalize the story beat.`
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Core orchestration
  orchestrateStoryGeneration,
  createOrchestrationState,

  // Model validation
  validateModelForRole,
  getDefaultModel,
  ALLOWED_MODELS,
  DEFAULT_MODELS,

  // ESD handling
  validateESD,
  createEmptyESD,
  ESD_SCHEMA,

  // Monetization gates
  enforceMonetizationGates,
  shouldCallSexRenderer,
  MONETIZATION_GATES,

  // Fate Cards
  processFateCard,
  validateFateElevation,
  FATE_ELEVATION_RULES,

  // Prompt builders
  buildAuthorPrompt,
  buildIntegrationPrompt,

  // Romance Engine (re-exported for convenience)
  buildRomanceEngineDirective,
  createRomanceState,
  mapIntensityToRomanceMode,
  ROMANCE_MODES,

  // Erotic Intensity System (re-exported for convenience)
  buildProseIntensityDirective,
  selectTierForScene,
  getMaxTierForIntensity,
  INTENSITY_TIERS
};
