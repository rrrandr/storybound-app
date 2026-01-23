/**
 * =============================================================================
 * STORYBOUND ROMANCE ENGINE
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This module defines the Romance Engine system for generating emotionally
 * specific, world-bound, non-generic romantic narratives with proper pacing.
 *
 * The engine operates through:
 * - Mode selection based on intensity
 * - Core rules applied universally
 * - Mode-specific behavioral constraints
 * - Silent self-validation before output
 *
 * =============================================================================
 */

// =============================================================================
// ROMANCE MODE DEFINITIONS
// =============================================================================

/**
 * Romance modes determine pacing, language, and physicality constraints.
 * Mode selection is REQUIRED and must happen at generation start.
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
 * This ensures consistency between monetization constraints and romance pacing.
 */
function mapIntensityToRomanceMode(eroticismLevel) {
  for (const [modeKey, mode] of Object.entries(ROMANCE_MODES)) {
    if (mode.intensityMapping.includes(eroticismLevel)) {
      return modeKey;
    }
  }
  // Default to STANDARD if unknown
  return 'STANDARD';
}

// =============================================================================
// CORE ROMANCE RULES (APPLY TO ALL MODES)
// =============================================================================

/**
 * Core rules that apply universally regardless of mode.
 * These rules are NON-NEGOTIABLE and must be enforced in every generation.
 */
const CORE_ROMANCE_RULES = {
  /**
   * Rule 1: Diegetic World Seeding (Opening Scene Only)
   * The opening must contain world-specific details that ground the romance.
   */
  DIEGETIC_WORLD_SEEDING: {
    name: 'Diegetic World Seeding',
    appliesTo: 'opening',
    minimumDetails: 6,
    minimumCategories: 3,
    categories: [
      'slang_or_idioms',
      'institutions_or_power_structures',
      'customs_taboos_or_rules',
      'unique_objects_or_materials',
      'professions_or_social_roles',
      'place_names_implying_larger_system'
    ],
    rules: [
      'Do NOT explain these details',
      'Do NOT spotlight them',
      'Treat them as ordinary life',
      'If the opening could be moved to another world with only name changes, rewrite it'
    ]
  },

  /**
   * Rule 2: Emotional POV Filter
   * All description must be filtered through emotional lenses.
   */
  EMOTIONAL_POV_FILTER: {
    name: 'Emotional POV Filter',
    lenses: ['desire', 'resistance', 'longing', 'unease'],
    prohibition: 'Neutral description is forbidden',
    requirement: 'Every descriptive passage must carry emotional weight from the POV character'
  },

  /**
   * Rule 3: Asymmetrical Want
   * Romance requires misalignment, not harmony.
   */
  ASYMMETRICAL_WANT: {
    name: 'Asymmetrical Want',
    requirements: [
      'Romantic leads must want different things',
      'Romantic leads must fear different losses',
      'Romantic leads must misread the same moment differently'
    ],
    principle: 'Harmony kills romance. Misalignment creates it.'
  },

  /**
   * Rule 4: Power Micro-Dynamics
   * Every interaction contains a subtle power question.
   */
  POWER_MICRO_DYNAMICS: {
    name: 'Power Micro-Dynamics',
    questions: [
      'Who risks more?',
      'Who withholds?',
      'Who controls timing or knowledge?'
    ],
    requirement: 'Power should shift, often mid-scene'
  },

  /**
   * Rule 5: Subtext Over Declaration
   * Meaning emerges through indirection.
   */
  SUBTEXT_OVER_DECLARATION: {
    name: 'Subtext Over Declaration',
    channels: [
      'silence',
      'deflection',
      'irritation',
      'humor',
      'timing',
      'physical proximity'
    ],
    requirement: 'Declarations are rare and destabilizing'
  }
};

// =============================================================================
// PRIVATE LANGUAGE SYSTEM
// =============================================================================

/**
 * Private Language Rule
 * As the bond develops, introduce shared phrases or references.
 * Meaning accrues over time. Never explain why they matter.
 * This language is a seal, not a signal.
 */
const PRIVATE_LANGUAGE_RULES = {
  name: 'Private Language',
  timing: 'As bond develops',
  actions: [
    'Introduce shared phrases or references',
    'Allow meaning to accrue over time',
    'Never explain why they matter'
  ],
  principle: 'This language is a seal, not a signal'
};

/**
 * Track private language elements for a story.
 * Returns a structure for managing shared phrases.
 */
function createPrivateLanguageTracker() {
  return {
    sharedPhrases: [],
    sharedReferences: [],
    originScenes: {}, // Maps phrase -> scene where it originated
    usageCount: {},   // Maps phrase -> number of times referenced

    addPhrase(phrase, originScene) {
      if (!this.sharedPhrases.includes(phrase)) {
        this.sharedPhrases.push(phrase);
        this.originScenes[phrase] = originScene;
        this.usageCount[phrase] = 0;
      }
    },

    recordUsage(phrase) {
      if (this.usageCount[phrase] !== undefined) {
        this.usageCount[phrase]++;
      }
    },

    getActiveLanguage() {
      return this.sharedPhrases.filter(p => this.usageCount[p] > 0);
    }
  };
}

// =============================================================================
// MEMORY AS GRAVITY SYSTEM
// =============================================================================

/**
 * Memory as Gravity Rule
 * Past interactions must echo forward, influence choices, and surface without recap.
 * Romance deepens through remembered tension.
 */
const MEMORY_GRAVITY_RULES = {
  name: 'Memory as Gravity',
  requirements: [
    'Past interactions must echo forward',
    'Past interactions must influence choices',
    'Past interactions must surface without recap'
  ],
  principle: 'Romance deepens through remembered tension'
};

/**
 * Track memory gravity elements for a story.
 * Returns a structure for managing emotional echoes.
 */
function createMemoryGravityTracker() {
  return {
    tensionMoments: [],      // Key tension points to echo
    unspokenThings: [],      // Things left unsaid
    physicalBoundaries: [],  // Boundaries tested or respected
    powerShifts: [],         // Moments where power changed hands
    emotionalDebts: [],      // Things owed, denied, or postponed

    addTensionMoment(moment, sceneIndex) {
      this.tensionMoments.push({ moment, sceneIndex, echoed: false });
    },

    addUnspoken(thing, sceneIndex) {
      this.unspokenThings.push({ thing, sceneIndex, resolved: false });
    },

    addBoundary(boundary, sceneIndex, status) {
      this.physicalBoundaries.push({ boundary, sceneIndex, status });
    },

    addPowerShift(from, to, sceneIndex, trigger) {
      this.powerShifts.push({ from, to, sceneIndex, trigger });
    },

    addEmotionalDebt(debt, sceneIndex) {
      this.emotionalDebts.push({ debt, sceneIndex, paid: false });
    },

    getUnresolvedThreads() {
      return {
        unspoken: this.unspokenThings.filter(u => !u.resolved),
        debts: this.emotionalDebts.filter(d => !d.paid),
        tensionToEcho: this.tensionMoments.filter(t => !t.echoed)
      };
    }
  };
}

// =============================================================================
// SELF-VALIDATION SYSTEM
// =============================================================================

/**
 * Self-Validation Pass (Mandatory, Silent)
 * Before final output, internally verify all criteria.
 * If any answer is no, revise before output.
 */
const SELF_VALIDATION_QUESTIONS = [
  {
    id: 'world_seeding',
    question: 'Does the opening seed a distinct world without exposition?',
    appliesTo: 'opening'
  },
  {
    id: 'misalignment_driven',
    question: 'Is the romance driven by misalignment, not agreement?',
    appliesTo: 'all'
  },
  {
    id: 'desire_shown',
    question: 'Is desire shown through action, not explanation?',
    appliesTo: 'all'
  },
  {
    id: 'pacing_match',
    question: 'Does the pacing match the selected mode?',
    appliesTo: 'all'
  },
  {
    id: 'specificity',
    question: 'Would this feel interchangeable with another story?',
    appliesTo: 'all',
    desiredAnswer: false // This one should be NO
  }
];

/**
 * Generate validation directive for AI to self-check.
 */
function generateValidationDirective(isOpening = false) {
  const applicableQuestions = SELF_VALIDATION_QUESTIONS.filter(
    q => q.appliesTo === 'all' || (isOpening && q.appliesTo === 'opening')
  );

  return `
SELF-VALIDATION (MANDATORY, SILENT):
Before finalizing output, internally verify:
${applicableQuestions.map(q => `- ${q.question}`).join('\n')}
If any verification fails, revise before output.
Do not mention this validation in the output.`;
}

// =============================================================================
// PROHIBITIONS
// =============================================================================

/**
 * Hard prohibitions that apply to all romance generation.
 */
const PROHIBITIONS = {
  openings: [
    'No generic openings (markets, taverns, neutral spaces) unless world-required',
    'No neutral narration',
    'No transplantable scenes'
  ],
  narrative: [
    'No technique explanations',
    'No instant emotional payoff',
    'No harmony without preceding tension'
  ],
  general: [
    'Never explain process to reader',
    'Never spotlight world-building details',
    'Never use generic romantic tropes without subversion'
  ]
};

// =============================================================================
// MODE-SPECIFIC DIRECTIVES GENERATOR
// =============================================================================

/**
 * Generate mode-specific behavior directives for the AI.
 */
function generateModeDirectives(mode) {
  const modeConfig = ROMANCE_MODES[mode];
  if (!modeConfig) {
    throw new Error(`Unknown romance mode: ${mode}`);
  }

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

  return directives[mode];
}

// =============================================================================
// COMPLETE ROMANCE ENGINE DIRECTIVE BUILDER
// =============================================================================

/**
 * Build the complete Romance Engine directive for injection into prompts.
 * This is the primary export used by the orchestrator.
 */
function buildRomanceEngineDirective({
  eroticismLevel,
  isOpening = false,
  worldType = null,
  memoryContext = null,
  privateLanguage = null
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

  // Add opening-specific rules
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

  // Add private language context if provided
  if (privateLanguage && privateLanguage.sharedPhrases.length > 0) {
    directive += `
--------------------------------------------------------------------------------
PRIVATE LANGUAGE (ACTIVE):
--------------------------------------------------------------------------------

Shared phrases in this story: ${privateLanguage.sharedPhrases.join(', ')}

Rules:
- Reference these naturally when appropriate
- Allow meaning to deepen with each use
- NEVER explain why they matter
- This language is a seal, not a signal

`;
  }

  // Add memory context if provided
  if (memoryContext) {
    const unresolved = memoryContext.getUnresolvedThreads();
    if (unresolved.unspoken.length > 0 || unresolved.debts.length > 0) {
      directive += `
--------------------------------------------------------------------------------
MEMORY AS GRAVITY (ACTIVE THREADS):
--------------------------------------------------------------------------------

Unspoken things: ${unresolved.unspoken.map(u => u.thing).join('; ') || 'none'}
Emotional debts: ${unresolved.debts.map(d => d.debt).join('; ') || 'none'}

Rules:
- Echo these forward without explicit recap
- Let them influence choices and reactions
- Romance deepens through remembered tension

`;
    }
  }

  // Add validation directive
  directive += generateValidationDirective(isOpening);

  // Add prohibitions
  directive += `

--------------------------------------------------------------------------------
PROHIBITIONS:
--------------------------------------------------------------------------------

${isOpening ? PROHIBITIONS.openings.map(p => `- ${p}`).join('\n') : ''}
${PROHIBITIONS.narrative.map(p => `- ${p}`).join('\n')}
${PROHIBITIONS.general.map(p => `- ${p}`).join('\n')}

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

// =============================================================================
// ROMANCE STATE MANAGEMENT
// =============================================================================

/**
 * Create a complete romance state tracker for a story.
 * This maintains private language, memory gravity, and mode consistency.
 */
function createRomanceState(initialEroticismLevel) {
  return {
    mode: mapIntensityToRomanceMode(initialEroticismLevel),
    eroticismLevel: initialEroticismLevel,
    sceneCount: 0,
    privateLanguage: createPrivateLanguageTracker(),
    memoryGravity: createMemoryGravityTracker(),

    /**
     * Update mode if eroticism level changes.
     */
    updateEroticismLevel(newLevel) {
      this.eroticismLevel = newLevel;
      this.mode = mapIntensityToRomanceMode(newLevel);
    },

    /**
     * Record a new scene and update trackers.
     */
    recordScene(sceneData) {
      this.sceneCount++;

      if (sceneData.newPhrase) {
        this.privateLanguage.addPhrase(sceneData.newPhrase, this.sceneCount);
      }

      if (sceneData.phrasesUsed) {
        sceneData.phrasesUsed.forEach(p => this.privateLanguage.recordUsage(p));
      }

      if (sceneData.tensionMoment) {
        this.memoryGravity.addTensionMoment(sceneData.tensionMoment, this.sceneCount);
      }

      if (sceneData.unspoken) {
        this.memoryGravity.addUnspoken(sceneData.unspoken, this.sceneCount);
      }

      if (sceneData.boundaryTested) {
        this.memoryGravity.addBoundary(
          sceneData.boundaryTested.boundary,
          this.sceneCount,
          sceneData.boundaryTested.status
        );
      }

      if (sceneData.powerShift) {
        this.memoryGravity.addPowerShift(
          sceneData.powerShift.from,
          sceneData.powerShift.to,
          this.sceneCount,
          sceneData.powerShift.trigger
        );
      }

      if (sceneData.emotionalDebt) {
        this.memoryGravity.addEmotionalDebt(sceneData.emotionalDebt, this.sceneCount);
      }
    },

    /**
     * Get the directive for the current state.
     */
    getDirective(isOpening = false) {
      return buildRomanceEngineDirective({
        eroticismLevel: this.eroticismLevel,
        isOpening,
        memoryContext: this.memoryGravity,
        privateLanguage: this.privateLanguage
      });
    }
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Mode configuration
  ROMANCE_MODES,
  mapIntensityToRomanceMode,

  // Core rules (for reference/documentation)
  CORE_ROMANCE_RULES,
  PRIVATE_LANGUAGE_RULES,
  MEMORY_GRAVITY_RULES,
  PROHIBITIONS,

  // Directive builders
  buildRomanceEngineDirective,
  generateModeDirectives,
  generateValidationDirective,

  // State management
  createRomanceState,
  createPrivateLanguageTracker,
  createMemoryGravityTracker,

  // Validation
  SELF_VALIDATION_QUESTIONS
};
