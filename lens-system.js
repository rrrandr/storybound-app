/**
 * =============================================================================
 * CHARACTER DRIVE LENSES SYSTEM
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * Character Drive Lenses are system-level forces that shape behavior and tension.
 * They are NOT personality traits. They are structural forces that bias:
 * - Pacing
 * - Reveal timing
 * - Resistance vs availability
 * - Validation checks
 *
 * Lenses are NEVER exposed to the user by name.
 * Lenses manifest ONLY through character behavior.
 *
 * =============================================================================
 */

(function(window) {
  'use strict';

  // ===========================================================================
  // CANONICAL LENS DEFINITIONS (IMMUTABLE)
  // ===========================================================================

  /**
   * Each lens defines:
   * - id: System identifier
   * - tension: What narrative tension it creates
   * - failureMode: What it must NEVER do
   * - pacingBias: How it affects story pacing
   * - revealTiming: When reveals should occur (0-1 scale, where 1 = end)
   * - resistanceProfile: How resistance changes over story progress
   */
  const LENS_DEFINITIONS = {
    WITHHELD_CORE: {
      id: 'WITHHELD_CORE',
      tension: 'anticipation_around_revelation',
      failureMode: 'indefinite_withholding_without_progression',
      pacingBias: {
        delayMajorRevelation: true,
        minRevealProgress: 0.60,
        maxRevealProgress: 0.80,
        hintFrequency: 0.15  // Minor hints allowed before reveal
      },
      resistanceProfile: {
        initial: 0.8,
        decay: 'linear',
        floor: 0.3,
        floorAtProgress: 0.75
      },
      revealScheduling: {
        required: true,
        deadlineProgress: 0.85,
        warnIfMissing: true
      }
    },

    MORAL_FRICTION_ENGINE: {
      id: 'MORAL_FRICTION_ENGINE',
      tension: 'ethical_cost_on_choices',
      failureMode: 'pure_villain_or_pure_martyr',
      pacingBias: {
        costAfterVictory: true,
        maxCostFreeBeats: 2,
        costVariationRequired: true
      },
      resistanceProfile: {
        initial: 0.5,
        mode: 'oscillating',
        alignedResistance: 0.3,
        misalignedResistance: 0.7
      },
      revealScheduling: {
        required: false
      }
    },

    UNEXPECTED_COMPETENCE: {
      id: 'UNEXPECTED_COMPETENCE',
      tension: 'subverted_power_dynamics',
      failureMode: 'secretly_good_at_everything',
      pacingBias: {
        requireSetupBeforeReveal: true,
        minFailureBeforeCompetence: 1,
        competenceMustBeBounded: true,
        earlyDeploymentThreshold: 0.20  // Cannot deploy before this progress
      },
      resistanceProfile: {
        beforeReveal: 0.9,
        afterReveal: 0.2,
        revealIsDiscrete: true
      },
      revealScheduling: {
        required: true,
        minProgress: 0.20,
        warnIfEarly: true
      }
    },

    VOLATILE_MIRROR: {
      id: 'VOLATILE_MIRROR',
      tension: 'emotional_feedback_loops',
      failureMode: 'purely_reactive_without_baseline',
      pacingBias: {
        syncWithProtagonist: true,
        maxSyncDelay: 1,  // Beats after protagonist state change
        variationRequired: true,  // Echo, not copy
        invertForRogueTrickster: true  // Tease vs retreat
      },
      resistanceProfile: {
        mode: 'mirrored',
        coefficientSource: 'protagonist_emotional_openness'
      },
      revealScheduling: {
        required: false
      },
      requiresBaseline: true  // Must have independent motivation
    }
  };

  // ===========================================================================
  // ARCHETYPE × LENS COMPATIBILITY TABLE
  // ===========================================================================

  /**
   * Compatibility values:
   * - NATURAL: Lens fits archetype without special handling
   * - CONDITIONAL: Lens requires justification context
   * - FORBIDDEN: Lens contradicts archetype; requires explicit override
   */
  const COMPATIBILITY = {
    NATURAL: 'NATURAL',
    CONDITIONAL: 'CONDITIONAL',
    FORBIDDEN: 'FORBIDDEN'
  };

  /**
   * Maps Storybound archetypes to lens archetypes.
   * This allows the system to work with the existing ARCHETYPES in app.js.
   */
  const ARCHETYPE_MAPPING = {
    // Direct mappings to lens archetypes
    GUARDIAN: 'GUARDIAN_PROTECTOR',
    ROGUE: 'ROGUE_TRICKSTER',
    STRATEGIST: 'STRATEGIST_ARCHITECT',

    // Storybound archetypes mapped to closest lens archetype
    ROMANTIC: 'INNOCENT_SEEKER',      // Emotionally open, seeking connection
    CLOISTERED: 'MYSTIC_ORACLE',      // Reserved, knowing more than shown
    DANGEROUS: 'GUARDIAN_PROTECTOR',  // Protective through restraint
    SOVEREIGN: 'STRATEGIST_ARCHITECT', // Calculated, in control
    ENCHANTING: 'ROGUE_TRICKSTER',    // Deliberate charm, strategic allure
    DEVOTED: 'GUARDIAN_PROTECTOR',    // Protective attention
    BEAUTIFUL_RUIN: 'REBEL_FIREBRAND', // Values-driven conflict
    ANTI_HERO: 'REBEL_FIREBRAND'      // Self-restraint as rebellion
  };

  /**
   * Canonical compatibility table.
   * Rows = Lens Archetypes, Columns = Lenses
   */
  const COMPATIBILITY_TABLE = {
    GUARDIAN_PROTECTOR: {
      WITHHELD_CORE: COMPATIBILITY.CONDITIONAL,
      MORAL_FRICTION_ENGINE: COMPATIBILITY.NATURAL,
      UNEXPECTED_COMPETENCE: COMPATIBILITY.CONDITIONAL,
      VOLATILE_MIRROR: COMPATIBILITY.FORBIDDEN
    },
    ROGUE_TRICKSTER: {
      WITHHELD_CORE: COMPATIBILITY.NATURAL,
      MORAL_FRICTION_ENGINE: COMPATIBILITY.CONDITIONAL,
      UNEXPECTED_COMPETENCE: COMPATIBILITY.NATURAL,
      VOLATILE_MIRROR: COMPATIBILITY.CONDITIONAL  // Must invert, not echo
    },
    STRATEGIST_ARCHITECT: {
      WITHHELD_CORE: COMPATIBILITY.NATURAL,
      MORAL_FRICTION_ENGINE: COMPATIBILITY.NATURAL,
      UNEXPECTED_COMPETENCE: COMPATIBILITY.FORBIDDEN,
      VOLATILE_MIRROR: COMPATIBILITY.CONDITIONAL
    },
    REBEL_FIREBRAND: {
      WITHHELD_CORE: COMPATIBILITY.FORBIDDEN,
      MORAL_FRICTION_ENGINE: COMPATIBILITY.NATURAL,
      UNEXPECTED_COMPETENCE: COMPATIBILITY.CONDITIONAL,
      VOLATILE_MIRROR: COMPATIBILITY.NATURAL
    },
    INNOCENT_SEEKER: {
      WITHHELD_CORE: COMPATIBILITY.FORBIDDEN,
      MORAL_FRICTION_ENGINE: COMPATIBILITY.CONDITIONAL,
      UNEXPECTED_COMPETENCE: COMPATIBILITY.NATURAL,
      VOLATILE_MIRROR: COMPATIBILITY.CONDITIONAL
    },
    MYSTIC_ORACLE: {
      WITHHELD_CORE: COMPATIBILITY.NATURAL,
      MORAL_FRICTION_ENGINE: COMPATIBILITY.FORBIDDEN,
      UNEXPECTED_COMPETENCE: COMPATIBILITY.FORBIDDEN,
      VOLATILE_MIRROR: COMPATIBILITY.CONDITIONAL
    }
  };

  /**
   * Implicit conditions for CONDITIONAL assignments.
   */
  const CONDITIONAL_REQUIREMENTS = {
    'ROGUE_TRICKSTER:VOLATILE_MIRROR': {
      condition: 'mirror_must_invert',
      description: 'Mirror behavior must invert protagonist state, not echo it'
    },
    'STRATEGIST_ARCHITECT:VOLATILE_MIRROR': {
      condition: 'destabilization_arc',
      description: 'Strategist must be shown losing control before mirroring'
    },
    'GUARDIAN_PROTECTOR:WITHHELD_CORE': {
      condition: 'protective_secret',
      description: 'Secret must be withheld FOR protection, not from it'
    },
    'GUARDIAN_PROTECTOR:UNEXPECTED_COMPETENCE': {
      condition: 'non_combat_domain',
      description: 'Competence must be outside expected protective domain'
    },
    'REBEL_FIREBRAND:UNEXPECTED_COMPETENCE': {
      condition: 'establishment_skill',
      description: 'Competence must be in a domain the rebel ostensibly rejects'
    },
    'INNOCENT_SEEKER:MORAL_FRICTION_ENGINE': {
      condition: 'gradual_corruption',
      description: 'Friction must build gradually without destroying innocence instantly'
    },
    'INNOCENT_SEEKER:VOLATILE_MIRROR': {
      condition: 'preserve_identity',
      description: 'Mirroring must not subsume independent identity'
    },
    'MYSTIC_ORACLE:VOLATILE_MIRROR': {
      condition: 'reflect_truth',
      description: 'Mirror must reflect uncomfortable truths, not emotions'
    }
  };

  // ===========================================================================
  // ASSIGNMENT RULES
  // ===========================================================================

  const ASSIGNMENT_RULES = {
    maxLensesPerCharacter: 2,
    preferSingleLens: true,
    narrativeComplexityThreshold: 3,  // Chapters before second lens allowed

    // Sharing rules
    protagonistLoveInterestMayNotShare: true,
    volatileMirrorExemptFromSharing: true,  // VM references state, not shares lens

    // Conflict rules
    withheldCoreBlocksVolatileMirror: true,  // If protag has WC, LI cannot have VM

    // Visibility rules
    guidedFateLensesNeverDisplayed: true,
    userFacingDescriptionsOnly: true,

    // Story length requirements
    minChaptersForLensRequirement: 3,

    // Anti-repetition
    recentStoryWindow: 5,
    blockIdenticalCombinationInWindow: true,
    pacingVariationOnForcedRepetition: 0.15
  };

  // ===========================================================================
  // DETERMINISTIC ASSIGNMENT LOGIC
  // ===========================================================================

  /**
   * Generate a deterministic hash for lens assignment.
   * Uses archetype + genre + tone + story history to ensure reproducibility.
   */
  function hashForAssignment(archetype, genre, tone, storyHistory = []) {
    const input = `${archetype}:${genre}:${tone}:${storyHistory.length}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;  // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get the lens archetype for a Storybound archetype.
   */
  function getLensArchetype(storyboundArchetype) {
    return ARCHETYPE_MAPPING[storyboundArchetype] || 'INNOCENT_SEEKER';
  }

  /**
   * Check compatibility between an archetype and lens.
   */
  function checkCompatibility(storyboundArchetype, lensId) {
    const lensArchetype = getLensArchetype(storyboundArchetype);
    const table = COMPATIBILITY_TABLE[lensArchetype];
    if (!table) return COMPATIBILITY.CONDITIONAL;
    return table[lensId] || COMPATIBILITY.CONDITIONAL;
  }

  /**
   * Get available lenses for an archetype (excludes FORBIDDEN).
   */
  function getAvailableLenses(storyboundArchetype) {
    const lensArchetype = getLensArchetype(storyboundArchetype);
    const table = COMPATIBILITY_TABLE[lensArchetype];
    if (!table) return [];

    return Object.entries(table)
      .filter(([_, compat]) => compat !== COMPATIBILITY.FORBIDDEN)
      .map(([lensId, _]) => lensId);
  }

  /**
   * Get natural lenses for an archetype (NATURAL only).
   */
  function getNaturalLenses(storyboundArchetype) {
    const lensArchetype = getLensArchetype(storyboundArchetype);
    const table = COMPATIBILITY_TABLE[lensArchetype];
    if (!table) return [];

    return Object.entries(table)
      .filter(([_, compat]) => compat === COMPATIBILITY.NATURAL)
      .map(([lensId, _]) => lensId);
  }

  /**
   * Assign lenses deterministically based on story parameters.
   *
   * @param {Object} params
   * @param {string} params.protagonistArchetype - Storybound archetype ID
   * @param {string} params.loveInterestArchetype - Storybound archetype ID
   * @param {string} params.genre - Story genre
   * @param {string} params.tone - Story tone
   * @param {number} params.storyLength - Expected chapters
   * @param {Array} params.recentHistory - Recent archetype+lens combinations
   * @param {boolean} params.narrativeComplexityFlag - Allow second lens
   * @param {Object} params.overrides - Explicit override flags for FORBIDDEN
   *
   * @returns {Object} { protagonist: { lenses: [], meta: {} }, loveInterest: { lenses: [], meta: {} }, validation: {} }
   */
  function assignLenses(params) {
    const {
      protagonistArchetype,
      loveInterestArchetype,
      genre,
      tone,
      storyLength = 1,
      recentHistory = [],
      narrativeComplexityFlag = false,
      overrides = {}
    } = params;

    const result = {
      protagonist: { lenses: [], lensMeta: {} },
      loveInterest: { lenses: [], lensMeta: {} },
      validation: { errors: [], warnings: [] }
    };

    // Get available lenses for each character
    const protagonistAvailable = getAvailableLenses(protagonistArchetype);
    const loveInterestAvailable = getAvailableLenses(loveInterestArchetype);

    // Get natural lenses (preferred)
    const protagonistNatural = getNaturalLenses(protagonistArchetype);
    const loveInterestNatural = getNaturalLenses(loveInterestArchetype);

    // Generate deterministic selection
    const hash = hashForAssignment(protagonistArchetype, genre, tone, recentHistory);

    // Select protagonist lens (prefer natural)
    const protagonistPool = protagonistNatural.length > 0 ? protagonistNatural : protagonistAvailable;
    if (protagonistPool.length > 0) {
      const pLensIndex = hash % protagonistPool.length;
      const pLens = protagonistPool[pLensIndex];
      result.protagonist.lenses.push(pLens);
      result.protagonist.lensMeta[pLens] = createLensMeta(pLens, protagonistArchetype, 0);
    }

    // Select love interest lens (prefer natural, avoid sharing)
    let loveInterestPool = loveInterestNatural.length > 0 ? loveInterestNatural : loveInterestAvailable;

    // Filter out protagonist's lens (unless it's VOLATILE_MIRROR)
    const protagonistLens = result.protagonist.lenses[0];
    if (protagonistLens && ASSIGNMENT_RULES.protagonistLoveInterestMayNotShare) {
      if (protagonistLens !== 'VOLATILE_MIRROR' || !ASSIGNMENT_RULES.volatileMirrorExemptFromSharing) {
        loveInterestPool = loveInterestPool.filter(l => l !== protagonistLens);
      }
    }

    // Check WITHHELD_CORE → VOLATILE_MIRROR conflict
    if (protagonistLens === 'WITHHELD_CORE' && ASSIGNMENT_RULES.withheldCoreBlocksVolatileMirror) {
      loveInterestPool = loveInterestPool.filter(l => l !== 'VOLATILE_MIRROR');
    }

    // Select love interest lens
    if (loveInterestPool.length > 0 && storyLength >= ASSIGNMENT_RULES.minChaptersForLensRequirement) {
      const lLensIndex = (hash >> 4) % loveInterestPool.length;
      const lLens = loveInterestPool[lLensIndex];
      result.loveInterest.lenses.push(lLens);
      result.loveInterest.lensMeta[lLens] = createLensMeta(lLens, loveInterestArchetype, 0);
    }

    // Check for conditional requirements
    const protagonistLensArch = getLensArchetype(protagonistArchetype);
    const loveInterestLensArch = getLensArchetype(loveInterestArchetype);

    for (const lens of result.protagonist.lenses) {
      const compat = checkCompatibility(protagonistArchetype, lens);
      if (compat === COMPATIBILITY.CONDITIONAL) {
        const key = `${protagonistLensArch}:${lens}`;
        const requirement = CONDITIONAL_REQUIREMENTS[key];
        if (requirement) {
          result.protagonist.lensMeta[lens].conditionalRequirement = requirement;
        }
      }
    }

    for (const lens of result.loveInterest.lenses) {
      const compat = checkCompatibility(loveInterestArchetype, lens);
      if (compat === COMPATIBILITY.CONDITIONAL) {
        const key = `${loveInterestLensArch}:${lens}`;
        const requirement = CONDITIONAL_REQUIREMENTS[key];
        if (requirement) {
          result.loveInterest.lensMeta[lens].conditionalRequirement = requirement;
        }
      }
    }

    // Anti-repetition check
    if (recentHistory.length > 0) {
      const pCombo = `${protagonistArchetype}:${result.protagonist.lenses[0]}`;
      const lCombo = `${loveInterestArchetype}:${result.loveInterest.lenses[0]}`;

      const recentCombos = recentHistory.slice(-ASSIGNMENT_RULES.recentStoryWindow);

      if (recentCombos.includes(pCombo)) {
        result.validation.warnings.push({
          code: 'RECENT_REPETITION',
          character: 'protagonist',
          message: `Archetype+lens combination used in last ${ASSIGNMENT_RULES.recentStoryWindow} stories`,
          adjustment: 'pacing_variation_applied'
        });
        // Apply pacing variation
        for (const lens of result.protagonist.lenses) {
          if (result.protagonist.lensMeta[lens]) {
            result.protagonist.lensMeta[lens].pacingVariation = ASSIGNMENT_RULES.pacingVariationOnForcedRepetition;
          }
        }
      }

      if (recentCombos.includes(lCombo)) {
        result.validation.warnings.push({
          code: 'RECENT_REPETITION',
          character: 'love_interest',
          message: `Archetype+lens combination used in last ${ASSIGNMENT_RULES.recentStoryWindow} stories`
        });
        for (const lens of result.loveInterest.lenses) {
          if (result.loveInterest.lensMeta[lens]) {
            result.loveInterest.lensMeta[lens].pacingVariation = ASSIGNMENT_RULES.pacingVariationOnForcedRepetition;
          }
        }
      }
    }

    return result;
  }

  /**
   * Create lens metadata for a character.
   */
  function createLensMeta(lensId, archetype, storyProgress) {
    const lensDef = LENS_DEFINITIONS[lensId];
    if (!lensDef) return {};

    const meta = {
      assignedAt: Date.now(),
      storyProgressAtAssignment: storyProgress,
      revealScheduled: false,
      revealProgress: null,
      resistanceValue: lensDef.resistanceProfile?.initial || 0.5,
      costFreeStreak: 0,
      competenceRevealed: false,
      setupBeatsCompleted: 0
    };

    // Schedule reveal if required
    if (lensDef.revealScheduling?.required) {
      meta.revealScheduled = true;
      const min = lensDef.pacingBias?.minRevealProgress || 0.5;
      const max = lensDef.pacingBias?.maxRevealProgress || 0.8;
      meta.revealProgress = min + (Math.random() * (max - min));
    }

    return meta;
  }

  // ===========================================================================
  // BEHAVIORAL BIAS FUNCTIONS
  // ===========================================================================

  /**
   * Calculate current resistance value based on lens and story progress.
   */
  function calculateResistance(lensId, lensMeta, storyProgress, protagonistState = {}) {
    const lensDef = LENS_DEFINITIONS[lensId];
    if (!lensDef) return 0.5;

    const profile = lensDef.resistanceProfile;
    if (!profile) return 0.5;

    // Handle different resistance modes
    switch (profile.mode) {
      case 'oscillating':
        // For MORAL_FRICTION_ENGINE: depends on protagonist moral alignment
        const aligned = protagonistState.morallyAligned !== false;
        return aligned ? profile.alignedResistance : profile.misalignedResistance;

      case 'mirrored':
        // For VOLATILE_MIRROR: mirrors protagonist emotional openness
        return 1 - (protagonistState.emotionalOpenness || 0.5);

      default:
        // Linear decay (WITHHELD_CORE, UNEXPECTED_COMPETENCE before reveal)
        if (profile.decay === 'linear') {
          const progress = Math.min(storyProgress, profile.floorAtProgress || 1);
          const range = profile.initial - profile.floor;
          const decayProgress = progress / (profile.floorAtProgress || 1);
          return profile.initial - (range * decayProgress);
        }

        // Discrete reveal (UNEXPECTED_COMPETENCE)
        if (profile.revealIsDiscrete && lensMeta?.competenceRevealed) {
          return profile.afterReveal;
        }

        return profile.beforeReveal || profile.initial || 0.5;
    }
  }

  /**
   * Check if a reveal is gated at current progress.
   */
  function isRevealGated(lensId, lensMeta, storyProgress) {
    const lensDef = LENS_DEFINITIONS[lensId];
    if (!lensDef) return false;

    // WITHHELD_CORE: gates major revelation until 60-80%
    if (lensId === 'WITHHELD_CORE') {
      const minReveal = lensDef.pacingBias?.minRevealProgress || 0.60;
      return storyProgress < minReveal;
    }

    // UNEXPECTED_COMPETENCE: gates deployment until setup complete
    if (lensId === 'UNEXPECTED_COMPETENCE') {
      const threshold = lensDef.pacingBias?.earlyDeploymentThreshold || 0.20;
      const minFailures = lensDef.pacingBias?.minFailureBeforeCompetence || 1;

      if (storyProgress < threshold) return true;
      if ((lensMeta?.setupBeatsCompleted || 0) < minFailures) return true;
    }

    return false;
  }

  /**
   * Check if a cost is required after a victory beat.
   */
  function requiresCostAfterVictory(lensId, lensMeta) {
    const lensDef = LENS_DEFINITIONS[lensId];
    if (!lensDef) return false;

    if (lensId === 'MORAL_FRICTION_ENGINE') {
      const maxCostFree = lensDef.pacingBias?.maxCostFreeBeats || 2;
      return (lensMeta?.costFreeStreak || 0) >= maxCostFree;
    }

    return false;
  }

  /**
   * Get pacing modifiers for current lens state.
   */
  function getPacingModifiers(lensId, lensMeta, storyProgress) {
    const lensDef = LENS_DEFINITIONS[lensId];
    if (!lensDef) return {};

    const modifiers = {};
    const variation = lensMeta?.pacingVariation || 0;

    // Apply lens-specific pacing
    if (lensDef.pacingBias) {
      if (lensDef.pacingBias.delayMajorRevelation) {
        modifiers.delayRevelation = true;
        modifiers.minRevealProgress = (lensDef.pacingBias.minRevealProgress || 0.6) + variation;
      }

      if (lensDef.pacingBias.costAfterVictory) {
        modifiers.enforceCostAfterVictory = true;
        modifiers.maxCostFreeBeats = lensDef.pacingBias.maxCostFreeBeats;
      }

      if (lensDef.pacingBias.requireSetupBeforeReveal) {
        modifiers.requireSetup = true;
        modifiers.minSetupBeats = lensDef.pacingBias.minFailureBeforeCompetence;
      }

      if (lensDef.pacingBias.syncWithProtagonist) {
        modifiers.syncEmotionalBeats = true;
        modifiers.maxSyncDelay = lensDef.pacingBias.maxSyncDelay;
      }
    }

    return modifiers;
  }

  // ===========================================================================
  // VALIDATION FUNCTIONS
  // ===========================================================================

  /**
   * Validate lens assignment against rules.
   * Returns { valid: boolean, errors: [], warnings: [] }
   */
  function validateAssignment(assignment) {
    const result = { valid: true, errors: [], warnings: [] };

    const pLenses = assignment.protagonist?.lenses || [];
    const lLenses = assignment.loveInterest?.lenses || [];

    // REJECT: Both characters have zero lenses in longer stories
    // (Handled by caller based on story length)

    // REJECT: Protagonist and love interest share a lens
    for (const lens of pLenses) {
      if (lLenses.includes(lens) && lens !== 'VOLATILE_MIRROR') {
        result.valid = false;
        result.errors.push({
          code: 'SHARED_LENS',
          message: `Protagonist and love interest cannot share lens: ${lens}`
        });
      }
    }

    // REJECT: FORBIDDEN lens without override
    // (Handled during assignment)

    // REJECT: Two CONDITIONAL lenses without justification
    // (Check meta for conditionalRequirement)

    return result;
  }

  /**
   * Validate lens state during story generation.
   * Returns warnings for state checks.
   */
  function validateLensState(lensId, lensMeta, storyProgress) {
    const warnings = [];
    const lensDef = LENS_DEFINITIONS[lensId];
    if (!lensDef) return warnings;

    // WARN: WITHHELD_CORE with no reveal by 85%
    if (lensId === 'WITHHELD_CORE') {
      const deadline = lensDef.revealScheduling?.deadlineProgress || 0.85;
      if (storyProgress >= deadline && !lensMeta?.revealScheduled) {
        warnings.push({
          code: 'WITHHELD_CORE_NO_REVEAL',
          message: `Withheld Core has no reveal scheduled by ${deadline * 100}% progress`
        });
      }
    }

    // WARN: UNEXPECTED_COMPETENCE deployed early without setup
    if (lensId === 'UNEXPECTED_COMPETENCE') {
      const threshold = lensDef.pacingBias?.earlyDeploymentThreshold || 0.20;
      if (storyProgress < threshold && lensMeta?.competenceRevealed) {
        warnings.push({
          code: 'UNEXPECTED_COMPETENCE_EARLY',
          message: `Unexpected Competence deployed before ${threshold * 100}% progress without setup`
        });
      }
    }

    // WARN: MORAL_FRICTION_ENGINE with cost-free streak
    if (lensId === 'MORAL_FRICTION_ENGINE') {
      const maxCostFree = lensDef.pacingBias?.maxCostFreeBeats || 2;
      if ((lensMeta?.costFreeStreak || 0) >= maxCostFree) {
        warnings.push({
          code: 'MORAL_FRICTION_COSTLESS',
          message: `Moral Friction Engine has ${lensMeta.costFreeStreak}+ cost-free beats`
        });
      }
    }

    // WARN: VOLATILE_MIRROR without baseline
    if (lensId === 'VOLATILE_MIRROR' && lensDef.requiresBaseline) {
      if (!lensMeta?.baselineEstablished) {
        warnings.push({
          code: 'VOLATILE_MIRROR_NO_BASELINE',
          message: 'Volatile Mirror has no established independent baseline motivation'
        });
      }
    }

    return warnings;
  }

  /**
   * Full validation check before generation.
   * Returns { canGenerate: boolean, errors: [], warnings: [], fallbackRequired: boolean }
   */
  function validateBeforeGeneration(state) {
    const result = {
      canGenerate: true,
      errors: [],
      warnings: [],
      fallbackRequired: false
    };

    const pLenses = state.protagonist?.lenses || [];
    const lLenses = state.loveInterest?.lenses || [];
    const storyProgress = state.storyProgress || 0;

    // Check if both have zero lenses in longer story
    if (pLenses.length === 0 && lLenses.length === 0 && state.storyLength >= 3) {
      result.errors.push({
        code: 'NO_LENSES',
        message: 'Both characters have zero lenses in story with 3+ chapters'
      });
      result.canGenerate = false;
      result.fallbackRequired = true;
    }

    // Validate each lens state
    for (const lens of pLenses) {
      const meta = state.protagonist?.lensMeta?.[lens];
      const warnings = validateLensState(lens, meta, storyProgress);
      result.warnings.push(...warnings);
    }

    for (const lens of lLenses) {
      const meta = state.loveInterest?.lensMeta?.[lens];
      const warnings = validateLensState(lens, meta, storyProgress);
      result.warnings.push(...warnings);
    }

    return result;
  }

  // ===========================================================================
  // STATE UPDATE FUNCTIONS
  // ===========================================================================

  /**
   * Update lens meta after a story beat.
   */
  function updateLensMeta(lensMeta, lensId, beatType, storyProgress) {
    if (!lensMeta) return lensMeta;

    const updated = { ...lensMeta };

    switch (beatType) {
      case 'victory':
        if (lensId === 'MORAL_FRICTION_ENGINE') {
          updated.costFreeStreak = (updated.costFreeStreak || 0) + 1;
        }
        break;

      case 'cost':
        if (lensId === 'MORAL_FRICTION_ENGINE') {
          updated.costFreeStreak = 0;
        }
        break;

      case 'failure':
        if (lensId === 'UNEXPECTED_COMPETENCE') {
          updated.setupBeatsCompleted = (updated.setupBeatsCompleted || 0) + 1;
        }
        break;

      case 'competence_reveal':
        if (lensId === 'UNEXPECTED_COMPETENCE') {
          updated.competenceRevealed = true;
        }
        break;

      case 'core_reveal':
        if (lensId === 'WITHHELD_CORE') {
          updated.revealCompleted = true;
          updated.revealCompletedAt = storyProgress;
        }
        break;

      case 'baseline_established':
        if (lensId === 'VOLATILE_MIRROR') {
          updated.baselineEstablished = true;
        }
        break;
    }

    // Update resistance based on progress
    updated.resistanceValue = calculateResistance(lensId, updated, storyProgress);

    return updated;
  }

  // ===========================================================================
  // EXPORT PUBLIC API
  // ===========================================================================

  const LensSystem = {
    // Definitions (read-only)
    LENS_DEFINITIONS,
    COMPATIBILITY,
    COMPATIBILITY_TABLE,
    ASSIGNMENT_RULES,
    ARCHETYPE_MAPPING,
    CONDITIONAL_REQUIREMENTS,

    // Assignment
    assignLenses,
    checkCompatibility,
    getAvailableLenses,
    getNaturalLenses,
    getLensArchetype,

    // Behavioral bias
    calculateResistance,
    isRevealGated,
    requiresCostAfterVictory,
    getPacingModifiers,

    // Validation
    validateAssignment,
    validateLensState,
    validateBeforeGeneration,

    // State management
    createLensMeta,
    updateLensMeta
  };

  // Expose globally
  window.LensSystem = LensSystem;

  // Also expose for Node.js/CommonJS environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LensSystem;
  }

})(typeof window !== 'undefined' ? window : global);
