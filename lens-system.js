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
    pacingVariationOnForcedRepetition: 0.15,

    // Persistence
    localStorageKey: 'storybound_lens_history',
    maxHistoryEntries: 10  // 2x window for safety margin
  };

  // ===========================================================================
  // PERSISTENT LENS HISTORY (ANTI-REPETITION)
  // ===========================================================================

  /**
   * Load lens history from localStorage.
   * Returns array of archetype+lens combo strings.
   */
  function loadLensHistory() {
    try {
      const stored = localStorage.getItem(ASSIGNMENT_RULES.localStorageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      // Validate entries are strings
      return parsed.filter(entry => typeof entry === 'string');
    } catch (e) {
      console.warn('[LENS SYSTEM] Failed to load lens history:', e);
      return [];
    }
  }

  /**
   * Save lens history to localStorage with FIFO eviction.
   */
  function saveLensHistory(history) {
    try {
      // Enforce max entries (FIFO eviction)
      const trimmed = history.slice(-ASSIGNMENT_RULES.maxHistoryEntries);
      localStorage.setItem(ASSIGNMENT_RULES.localStorageKey, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[LENS SYSTEM] Failed to save lens history:', e);
    }
  }

  /**
   * Record a new archetype+lens combination in persistent history.
   */
  function recordLensCombo(archetypeLensPair) {
    const history = loadLensHistory();
    history.push(archetypeLensPair);
    saveLensHistory(history);
  }

  /**
   * Get recent combos within the anti-repetition window.
   */
  function getRecentCombos() {
    const history = loadLensHistory();
    return history.slice(-ASSIGNMENT_RULES.recentStoryWindow);
  }

  /**
   * Check if a combo is blocked by anti-repetition.
   */
  function isComboBlocked(archetypeLensPair) {
    const recent = getRecentCombos();
    return recent.includes(archetypeLensPair);
  }

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
   * GUARANTEES at least one lens per character. Empty arrays are NOT allowed.
   *
   * @param {Object} params
   * @param {string} params.protagonistArchetype - Storybound archetype ID
   * @param {string} params.loveInterestArchetype - Storybound archetype ID
   * @param {string} params.genre - Story genre
   * @param {string} params.tone - Story tone
   * @param {number} params.storyLength - Expected chapters
   * @param {boolean} params.narrativeComplexityFlag - Allow second lens
   * @param {Object} params.overrides - Explicit override flags for FORBIDDEN
   * @param {boolean} params._isFallback - Internal: true if this is a fallback call
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
      narrativeComplexityFlag = false,
      overrides = {},
      _isFallback = false
    } = params;

    const result = {
      protagonist: { lenses: [], lensMeta: {} },
      loveInterest: { lenses: [], lensMeta: {} },
      validation: { errors: [], warnings: [], fallbackUsed: _isFallback }
    };

    // Load persistent history for anti-repetition
    const recentCombos = getRecentCombos();

    // Get available lenses for each character
    let protagonistAvailable = getAvailableLenses(protagonistArchetype);
    let loveInterestAvailable = getAvailableLenses(loveInterestArchetype);

    // Get natural lenses (preferred)
    let protagonistNatural = getNaturalLenses(protagonistArchetype);
    let loveInterestNatural = getNaturalLenses(loveInterestArchetype);

    // ANTI-REPETITION: Filter out blocked combos BEFORE selection
    if (!_isFallback && recentCombos.length > 0) {
      // Filter protagonist pools
      const filterBlocked = (pool, archetype) => {
        return pool.filter(lens => !recentCombos.includes(`${archetype}:${lens}`));
      };

      const filteredProtagNatural = filterBlocked(protagonistNatural, protagonistArchetype);
      const filteredProtagAvailable = filterBlocked(protagonistAvailable, protagonistArchetype);

      // Use filtered pools if they have options, otherwise keep original
      if (filteredProtagNatural.length > 0) {
        protagonistNatural = filteredProtagNatural;
      } else if (filteredProtagAvailable.length > 0) {
        protagonistAvailable = filteredProtagAvailable;
        protagonistNatural = []; // Force use of available pool
      }
      // If all are blocked, keep original pool (forced repetition with variation)

      const filteredLINatural = filterBlocked(loveInterestNatural, loveInterestArchetype);
      const filteredLIAvailable = filterBlocked(loveInterestAvailable, loveInterestArchetype);

      if (filteredLINatural.length > 0) {
        loveInterestNatural = filteredLINatural;
      } else if (filteredLIAvailable.length > 0) {
        loveInterestAvailable = filteredLIAvailable;
        loveInterestNatural = [];
      }
    }

    // Generate deterministic selection
    const hash = hashForAssignment(protagonistArchetype, genre, tone, recentCombos);

    // Select protagonist lens (prefer natural)
    let protagonistPool = protagonistNatural.length > 0 ? protagonistNatural : protagonistAvailable;

    // GUARANTEE: Protagonist MUST have a lens
    if (protagonistPool.length === 0) {
      // Fallback: use ALL lenses (ignore FORBIDDEN for this character)
      protagonistPool = Object.keys(LENS_DEFINITIONS);
      console.warn('[LENS SYSTEM][FALLBACK] Protagonist pool empty, using all lenses');
    }

    const pLensIndex = hash % protagonistPool.length;
    const pLens = protagonistPool[pLensIndex];
    result.protagonist.lenses.push(pLens);
    result.protagonist.lensMeta[pLens] = createLensMeta(pLens, protagonistArchetype, 0);

    // Check if protagonist combo was forced (all options blocked)
    const pCombo = `${protagonistArchetype}:${pLens}`;
    if (recentCombos.includes(pCombo)) {
      result.validation.warnings.push({
        code: 'FORCED_REPETITION',
        character: 'protagonist',
        message: 'All non-blocked options exhausted; pacing variation applied'
      });
      result.protagonist.lensMeta[pLens].pacingVariation = ASSIGNMENT_RULES.pacingVariationOnForcedRepetition;
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

    // GUARANTEE: Love interest MUST have a lens (if story length warrants)
    if (loveInterestPool.length === 0) {
      // Fallback: use ALL lenses except protagonist's
      loveInterestPool = Object.keys(LENS_DEFINITIONS).filter(l => l !== protagonistLens);
      console.warn('[LENS SYSTEM][FALLBACK] Love interest pool empty, using fallback pool');
    }

    // Select love interest lens
    if (loveInterestPool.length > 0) {
      const lLensIndex = (hash >> 4) % loveInterestPool.length;
      const lLens = loveInterestPool[lLensIndex];
      result.loveInterest.lenses.push(lLens);
      result.loveInterest.lensMeta[lLens] = createLensMeta(lLens, loveInterestArchetype, 0);

      // Check if LI combo was forced
      const lCombo = `${loveInterestArchetype}:${lLens}`;
      if (recentCombos.includes(lCombo)) {
        result.validation.warnings.push({
          code: 'FORCED_REPETITION',
          character: 'love_interest',
          message: 'All non-blocked options exhausted; pacing variation applied'
        });
        result.loveInterest.lensMeta[lLens].pacingVariation = ASSIGNMENT_RULES.pacingVariationOnForcedRepetition;
      }
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

    // FINAL GUARANTEE: Both characters must have lenses
    if (result.protagonist.lenses.length === 0 || result.loveInterest.lenses.length === 0) {
      console.error('[LENS SYSTEM][CRITICAL] Assignment produced empty lens array - this should never happen');
      result.validation.errors.push({
        code: 'EMPTY_LENS_ARRAY',
        message: 'Critical: lens assignment failed to produce valid lenses'
      });
    }

    return result;
  }

  /**
   * Fallback assignment with relaxed constraints.
   * Called when primary assignment fails validation.
   */
  function assignLensesFallback(params) {
    console.log('[LENS SYSTEM][FALLBACK] Triggering fallback assignment');
    return assignLenses({ ...params, _isFallback: true });
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
   * On REJECT, triggers fallback reassignment.
   * Returns { valid: boolean, errors: [], warnings: [], assignment: Object }
   */
  function validateAssignment(assignment, originalParams) {
    const result = { valid: true, errors: [], warnings: [], assignment: assignment };

    const pLenses = assignment.protagonist?.lenses || [];
    const lLenses = assignment.loveInterest?.lenses || [];

    // REJECT: Empty lens arrays are NEVER allowed
    if (pLenses.length === 0) {
      result.valid = false;
      result.errors.push({
        code: 'EMPTY_PROTAGONIST_LENS',
        message: 'Protagonist must have at least one lens'
      });
    }

    if (lLenses.length === 0) {
      result.valid = false;
      result.errors.push({
        code: 'EMPTY_LOVE_INTEREST_LENS',
        message: 'Love interest must have at least one lens'
      });
    }

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

    // On REJECT: Trigger fallback reassignment
    if (!result.valid && originalParams) {
      console.warn('[LENS SYSTEM][FALLBACK] Validation failed, triggering fallback:', result.errors);
      const fallbackResult = assignLensesFallback(originalParams);

      // Validate fallback result (non-recursive - no originalParams)
      const fallbackValidation = validateAssignment(fallbackResult, null);

      if (fallbackValidation.valid) {
        result.valid = true;
        result.assignment = fallbackResult;
        result.warnings.push({
          code: 'FALLBACK_USED',
          message: 'Primary assignment failed; fallback assignment applied'
        });
      } else {
        // Fallback also failed - this is a critical error
        console.error('[LENS SYSTEM][CRITICAL] Fallback assignment also failed');
        result.errors.push({
          code: 'FALLBACK_FAILED',
          message: 'Both primary and fallback assignment failed'
        });
      }
    }

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
   * On REJECT: Triggers fallback reassignment. Generation NEVER proceeds without valid lenses.
   * Returns { canGenerate: boolean, errors: [], warnings: [], state: Object }
   */
  function validateBeforeGeneration(state, assignmentParams) {
    const result = {
      canGenerate: true,
      errors: [],
      warnings: [],
      state: state  // May be modified by fallback
    };

    let pLenses = state.protagonist?.lenses || [];
    let lLenses = state.loveInterest?.lenses || [];
    const storyProgress = state.storyProgress || 0;

    // REJECT: Empty lens arrays are NEVER allowed
    let needsFallback = false;

    if (pLenses.length === 0) {
      result.errors.push({
        code: 'EMPTY_PROTAGONIST_LENS',
        message: 'Protagonist has no lenses'
      });
      needsFallback = true;
    }

    if (lLenses.length === 0) {
      result.errors.push({
        code: 'EMPTY_LOVE_INTEREST_LENS',
        message: 'Love interest has no lenses'
      });
      needsFallback = true;
    }

    // On REJECT: Trigger fallback reassignment
    if (needsFallback && assignmentParams) {
      console.warn('[LENS SYSTEM][FALLBACK] Pre-generation validation failed, triggering fallback');
      const fallbackResult = assignLensesFallback(assignmentParams);

      // Apply fallback to state
      if (fallbackResult.protagonist.lenses.length > 0 && fallbackResult.loveInterest.lenses.length > 0) {
        result.state = {
          ...state,
          protagonist: fallbackResult.protagonist,
          loveInterest: fallbackResult.loveInterest
        };
        pLenses = fallbackResult.protagonist.lenses;
        lLenses = fallbackResult.loveInterest.lenses;

        result.warnings.push({
          code: 'FALLBACK_APPLIED',
          message: 'Empty lenses detected; fallback assignment applied'
        });
        result.errors = [];  // Clear errors since fallback succeeded
      } else {
        // Fallback also produced empty arrays - critical failure
        result.canGenerate = false;
        result.errors.push({
          code: 'CRITICAL_LENS_FAILURE',
          message: 'Fallback assignment failed; generation blocked'
        });
        console.error('[LENS SYSTEM][CRITICAL] Cannot proceed without lenses');
        return result;
      }
    } else if (needsFallback && !assignmentParams) {
      // No params to retry with - block generation
      result.canGenerate = false;
      result.errors.push({
        code: 'NO_FALLBACK_PARAMS',
        message: 'Lenses missing and no fallback parameters available'
      });
      console.error('[LENS SYSTEM][CRITICAL] Cannot proceed without lenses and no fallback available');
      return result;
    }

    // Validate each lens state (warnings only - do not block)
    for (const lens of pLenses) {
      const meta = result.state.protagonist?.lensMeta?.[lens];
      const warnings = validateLensState(lens, meta, storyProgress);
      result.warnings.push(...warnings);
    }

    for (const lens of lLenses) {
      const meta = result.state.loveInterest?.lensMeta?.[lens];
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
    assignLensesFallback,
    checkCompatibility,
    getAvailableLenses,
    getNaturalLenses,
    getLensArchetype,

    // Persistent anti-repetition
    loadLensHistory,
    saveLensHistory,
    recordLensCombo,
    getRecentCombos,
    isComboBlocked,

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
