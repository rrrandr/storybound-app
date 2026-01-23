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
// SERVER-AUTHORITATIVE FLAGS (SOURCE OF TRUTH)
// =============================================================================

/**
 * Authoritative generation flags.
 * The server is the ONLY source of truth for these values.
 * The client may mirror and react, but may NOT override.
 */
const AUTHORITATIVE_FLAGS = {
  // Lens enforcement toggle - when false, lens system is bypassed
  LENS_ENFORCEMENT_ENABLED: {
    key: 'lensEnforcementEnabled',
    default: true,
    description: 'Controls whether Character Drive Lenses affect generation'
  }
};

/**
 * Server-side flag state.
 * This is the canonical source - client state must sync from this.
 */
const _serverFlagState = {
  lensEnforcementEnabled: true
};

/**
 * Get the authoritative value of a flag.
 * This is the ONLY valid way to read flag state for generation decisions.
 */
function getAuthoritativeFlag(flagKey) {
  const flagDef = Object.values(AUTHORITATIVE_FLAGS).find(f => f.key === flagKey);
  if (!flagDef) {
    console.warn(`[FLAGS] Unknown flag requested: ${flagKey}`);
    return false;
  }
  return _serverFlagState[flagKey] ?? flagDef.default;
}

/**
 * Set a flag value (server-side only).
 * This should ONLY be called by server logic, never from client requests.
 */
function setAuthoritativeFlag(flagKey, value) {
  const flagDef = Object.values(AUTHORITATIVE_FLAGS).find(f => f.key === flagKey);
  if (!flagDef) {
    console.error(`[FLAGS] Attempted to set unknown flag: ${flagKey}`);
    return false;
  }
  const oldValue = _serverFlagState[flagKey];
  _serverFlagState[flagKey] = Boolean(value);
  console.log(`[FLAGS] ${flagKey}: ${oldValue} → ${_serverFlagState[flagKey]}`);
  return true;
}

/**
 * Validate client-provided flag intent against server authority.
 * Client may express intent, but server decides.
 * Returns { valid: boolean, serverValue: any, clientAttemptedOverride: boolean }
 */
function validateFlagIntent(flagKey, clientIntent) {
  const serverValue = getAuthoritativeFlag(flagKey);

  // Client attempting to override server authority
  if (clientIntent !== undefined && clientIntent !== serverValue) {
    console.warn(`[FLAGS] Client attempted to override ${flagKey}: client=${clientIntent}, server=${serverValue}. Server wins.`);
    return {
      valid: false,
      serverValue,
      clientAttemptedOverride: true
    };
  }

  return {
    valid: true,
    serverValue,
    clientAttemptedOverride: false
  };
}

/**
 * Get all authoritative flag values for client sync.
 * This is how the client receives the current server state.
 */
function getAuthoritativeFlagsSnapshot() {
  const snapshot = {};
  for (const flagDef of Object.values(AUTHORITATIVE_FLAGS)) {
    snapshot[flagDef.key] = _serverFlagState[flagDef.key] ?? flagDef.default;
  }
  return Object.freeze(snapshot);
}

// =============================================================================
// CHARACTER DRIVE LENS BEHAVIORAL BIAS
// =============================================================================

/**
 * Lens definitions for server-side behavioral bias enforcement.
 * These are structural forces, not prose instructions.
 */
const LENS_BIAS_RULES = {
  WITHHELD_CORE: {
    pacingDirective: 'DELAY_MAJOR_REVELATION',
    minRevealProgress: 0.60,
    maxRevealProgress: 0.80,
    hintAllowed: true,
    structuralNote: 'Character conceals critical truth; create anticipation through incompleteness'
  },
  MORAL_FRICTION_ENGINE: {
    pacingDirective: 'ENFORCE_COST_AFTER_VICTORY',
    maxCostFreeBeats: 2,
    structuralNote: 'Every significant choice carries ethical weight; no clean victories'
  },
  UNEXPECTED_COMPETENCE: {
    pacingDirective: 'GATE_COMPETENCE_REVEAL',
    requireSetupFailure: true,
    earlyDeploymentForbidden: true,
    minProgressForReveal: 0.20,
    structuralNote: 'Competence must be preceded by underestimation or failure in that domain'
  },
  VOLATILE_MIRROR: {
    pacingDirective: 'SYNC_EMOTIONAL_BEATS',
    maxSyncDelay: 1,
    mustHaveBaseline: true,
    invertForRogue: true,
    structuralNote: 'Emotional state reflects/inverts protagonist; requires independent baseline'
  }
};

/**
 * Build lens bias directives for the author prompt.
 * Returns structural pacing instructions, NOT prose guidance.
 *
 * @param {Object} lensBias - Lens bias data from client
 * @param {number} storyProgress - Current story progress (0-1)
 * @returns {string} Structural directives for the author
 */
function buildLensBiasDirectives(lensBias, storyProgress) {
  if (!lensBias || (!lensBias.protagonist?.lenses?.length && !lensBias.loveInterest?.lenses?.length)) {
    return '';
  }

  const directives = [];

  // Process protagonist lenses
  if (lensBias.protagonist?.lenses?.length > 0) {
    for (const lensId of lensBias.protagonist.lenses) {
      const rule = LENS_BIAS_RULES[lensId];
      if (!rule) continue;

      const meta = lensBias.protagonist.lensMeta?.[lensId] || {};

      switch (rule.pacingDirective) {
        case 'DELAY_MAJOR_REVELATION':
          if (storyProgress < rule.minRevealProgress) {
            directives.push(`PROTAGONIST PACING: Major character revelation is GATED until ${Math.round(rule.minRevealProgress * 100)}% progress. Minor hints only.`);
          } else if (storyProgress >= rule.minRevealProgress && !meta.revealCompleted) {
            directives.push(`PROTAGONIST PACING: Character revelation window OPEN (${Math.round(rule.minRevealProgress * 100)}-${Math.round(rule.maxRevealProgress * 100)}%).`);
          }
          break;

        case 'ENFORCE_COST_AFTER_VICTORY':
          if ((meta.costFreeStreak || 0) >= rule.maxCostFreeBeats) {
            directives.push(`PROTAGONIST PACING: Character has had ${meta.costFreeStreak}+ cost-free beats. Next significant action MUST carry ethical cost or compromise.`);
          }
          break;

        case 'GATE_COMPETENCE_REVEAL':
          if (!meta.competenceRevealed) {
            if (storyProgress < rule.minProgressForReveal) {
              directives.push(`PROTAGONIST PACING: Unexpected capability reveal FORBIDDEN before ${Math.round(rule.minProgressForReveal * 100)}% progress.`);
            } else if ((meta.setupBeatsCompleted || 0) < 1) {
              directives.push(`PROTAGONIST PACING: Character must experience failure or underestimation BEFORE competence reveal.`);
            }
          }
          break;
      }
    }
  }

  // Process love interest lenses
  if (lensBias.loveInterest?.lenses?.length > 0) {
    for (const lensId of lensBias.loveInterest.lenses) {
      const rule = LENS_BIAS_RULES[lensId];
      if (!rule) continue;

      const meta = lensBias.loveInterest.lensMeta?.[lensId] || {};
      const archetype = lensBias.loveInterestArchetype;
      const isRogue = archetype === 'ROGUE' || archetype === 'ENCHANTING';

      switch (rule.pacingDirective) {
        case 'DELAY_MAJOR_REVELATION':
          if (storyProgress < rule.minRevealProgress) {
            directives.push(`LOVE INTEREST PACING: Major revelation is GATED. Create anticipation through gaps and incompleteness.`);
          }
          break;

        case 'SYNC_EMOTIONAL_BEATS':
          if (isRogue && rule.invertForRogue) {
            directives.push(`LOVE INTEREST PACING: Emotional response must INVERT protagonist state (tease vs retreat, advance vs withdrawal).`);
          } else {
            directives.push(`LOVE INTEREST PACING: Emotional beats sync within 1 beat of protagonist state change.`);
          }
          if (!meta.baselineEstablished) {
            directives.push(`LOVE INTEREST PACING: Establish independent motivation baseline before reactive mirroring.`);
          }
          break;

        case 'ENFORCE_COST_AFTER_VICTORY':
          if ((meta.costFreeStreak || 0) >= rule.maxCostFreeBeats) {
            directives.push(`LOVE INTEREST PACING: Character needs ethical friction. Next choice must carry weight.`);
          }
          break;

        case 'GATE_COMPETENCE_REVEAL':
          if (!meta.competenceRevealed && storyProgress < rule.minProgressForReveal) {
            directives.push(`LOVE INTEREST PACING: Hidden capability must remain hidden until setup complete.`);
          }
          break;
      }
    }
  }

  if (directives.length === 0) {
    return '';
  }

  return `
CHARACTER DRIVE LENS PACING (STRUCTURAL - NOT PROSE GUIDANCE):
${directives.join('\n')}
These are mechanical constraints, not personality descriptions.
`;
}

/**
 * Validate lens state before generation.
 * Returns { canGenerate: boolean, warnings: string[] }
 */
function validateLensState(lensBias, storyProgress) {
  const result = { canGenerate: true, warnings: [] };

  if (!lensBias) return result;

  // Check for WITHHELD_CORE without scheduled reveal near deadline
  if (lensBias.protagonist?.lenses?.includes('WITHHELD_CORE')) {
    const meta = lensBias.protagonist.lensMeta?.WITHHELD_CORE || {};
    if (storyProgress >= 0.85 && !meta.revealScheduled && !meta.revealCompleted) {
      result.warnings.push('WITHHELD_CORE: No revelation scheduled by 85% progress');
    }
  }

  // Check for VOLATILE_MIRROR without baseline
  if (lensBias.loveInterest?.lenses?.includes('VOLATILE_MIRROR')) {
    const meta = lensBias.loveInterest.lensMeta?.VOLATILE_MIRROR || {};
    if (!meta.baselineEstablished) {
      result.warnings.push('VOLATILE_MIRROR: No independent baseline motivation established');
    }
  }

  // Check for MORAL_FRICTION_ENGINE cost-free streak
  const checkFriction = (character, label) => {
    if (lensBias[character]?.lenses?.includes('MORAL_FRICTION_ENGINE')) {
      const meta = lensBias[character].lensMeta?.MORAL_FRICTION_ENGINE || {};
      if ((meta.costFreeStreak || 0) >= 3) {
        result.warnings.push(`MORAL_FRICTION_ENGINE (${label}): ${meta.costFreeStreak}+ consecutive cost-free actions`);
      }
    }
  };
  checkFriction('protagonist', 'protagonist');
  checkFriction('loveInterest', 'love interest');

  return result;
}

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
 */
function createOrchestrationState() {
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
    errors: []              // Accumulated errors
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
  lensBias,           // Character Drive Lens bias data (optional)
  storyProgress,      // Current story progress 0-1 (optional)
  clientFlagIntent,   // Client's understanding of flags (for validation)
  callChatGPT,        // Function to call ChatGPT
  callSpecialist,     // Function to call specialist renderer
  onPhaseChange       // Callback for UI updates
}) {
  const state = createOrchestrationState();

  // ==========================================================================
  // PRE-FLIGHT: Validate Authoritative Flags (SERVER IS SOURCE OF TRUTH)
  // ==========================================================================
  const lensEnforcementFlag = validateFlagIntent(
    'lensEnforcementEnabled',
    clientFlagIntent?.lensEnforcementEnabled
  );

  // Store authoritative flag values in state for response
  state.authoritativeFlags = getAuthoritativeFlagsSnapshot();

  if (lensEnforcementFlag.clientAttemptedOverride) {
    state.errors.push({
      code: 'FLAG_OVERRIDE_DENIED',
      message: 'Client attempted to override lensEnforcementEnabled; server authority applied'
    });
  }

  // ==========================================================================
  // PRE-FLIGHT: Enforce Monetization Gates
  // ==========================================================================
  state.gateEnforcement = enforceMonetizationGates(accessTier, requestedEroticism);

  if (onPhaseChange) {
    onPhaseChange('GATE_CHECK', state.gateEnforcement);
  }

  // ==========================================================================
  // PRE-FLIGHT: Validate Lens State (ONLY IF FLAG ENABLED)
  // ==========================================================================
  // Server flag determines whether lens enforcement runs
  const lensEnforcementEnabled = lensEnforcementFlag.serverValue;

  if (lensEnforcementEnabled && lensBias) {
    const lensValidation = validateLensState(lensBias, storyProgress || 0);
    if (lensValidation.warnings.length > 0) {
      console.warn('[LENS SYSTEM] Generation warnings:', lensValidation.warnings);
      state.lensWarnings = lensValidation.warnings;
    }
  } else if (!lensEnforcementEnabled) {
    console.log('[FLAGS] Lens enforcement DISABLED by server authority');
    state.lensEnforcementSkipped = true;
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
      lensBias: lensEnforcementEnabled ? lensBias : null,  // Server flag gates lens inclusion
      storyProgress: storyProgress || 0,
      lensEnforcementEnabled  // Pass flag for logging/debugging
    });

    const authorResult = await callChatGPT(authorPrompt, 'PRIMARY_AUTHOR');

    state.authorOutput = authorResult.storyText;
    state.esd = authorResult.esd || null;

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
    // SERVER-AUTHORITATIVE FLAGS: Client must sync from this
    authoritativeFlags: state.authoritativeFlags,
    lensEnforcementSkipped: state.lensEnforcementSkipped || false
  };
}

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

/**
 * Build the prompt for ChatGPT's Author Pass.
 * This prompt instructs ChatGPT on its exclusive responsibilities.
 */
function buildAuthorPrompt({
  storyContext,
  playerAction,
  playerDialogue,
  fateCard,
  gateEnforcement,
  lensBias,
  storyProgress
}) {
  // Build lens bias directives (structural, not prose)
  const lensBiasDirectives = buildLensBiasDirectives(lensBias, storyProgress || 0);

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
${lensBiasDirectives}
If an intimacy scene occurs at Erotic or Dirty level, you MUST generate an Erotic Scene Directive (ESD) in your response. The ESD will be passed to a specialist renderer.

OUTPUT FORMAT:
Return a JSON object with:
{
  "storyText": "The narrative text for this beat",
  "intimacyOccurs": boolean,
  "esd": { ... } or null
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

  // Server-authoritative flags
  AUTHORITATIVE_FLAGS,
  getAuthoritativeFlag,
  setAuthoritativeFlag,
  validateFlagIntent,
  getAuthoritativeFlagsSnapshot,

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

  // Character Drive Lens bias
  LENS_BIAS_RULES,
  buildLensBiasDirectives,
  validateLensState,

  // Fate Cards
  processFateCard,
  validateFateElevation,
  FATE_ELEVATION_RULES,

  // Prompt builders
  buildAuthorPrompt,
  buildIntegrationPrompt
};
