/**
 * =============================================================================
 * STORYBOUND EROTIC INTENSITY SYSTEM
 * =============================================================================
 *
 * AUTHORITATIVE SPECIFICATION — DO NOT REINTERPRET
 *
 * =============================================================================
 * PART 1 — CORE PRINCIPLE (GLOBAL, NON-NEGOTIABLE)
 * =============================================================================
 *
 * Eroticism is conveyed through:
 * - Sensation
 * - Implication
 * - Emotional tension
 * - Restraint
 *
 * Eroticism must NEVER rely on:
 * - Explicit sexual acts
 * - Genital focus
 * - Pornographic mechanics
 * - Voyeur framing of sex
 *
 * This principle governs ALL erotic content across text and images.
 *
 * =============================================================================
 */

// =============================================================================
// PART 2 — THREE INTENSITY TIERS (CANONICAL)
// =============================================================================

const INTENSITY_TIERS = {
  TEASE: {
    name: 'Tease',
    emotionalState: 'Awareness, curiosity, the first flicker of want. Attention sharpens. The body notices before the mind admits.',
    physicalSignals: {
      face: 'Eyes that linger a beat too long. A glance that drops to lips, then away. The ghost of a smile suppressed.',
      posture: 'Angled toward. Shoulders square. The unconscious lean-in. Fingers that fidget or still.',
      breath: 'Normal but held. A pause before speaking. The swallow that betrays composure.',
      proximity: 'Close enough to notice warmth. Not close enough to touch. The space between is charged.'
    },
    allowedFocus: [
      'Eye contact and its avoidance',
      'Accidental touch and the reaction',
      'Voice changes (softer, lower, careful)',
      'The awareness of being watched',
      'Heat that has no source',
      'The effort to appear unaffected'
    ],
    disallowed: [
      'Direct statements of arousal',
      'Sexual intention stated aloud',
      'Physical descriptions below the collarbone',
      'Any reference to undressing',
      'Touch that lingers on erogenous zones'
    ],
    examples: {
      facialExpression: 'Her gaze caught his and held—one second, two—before she looked down at her glass, but her mouth had already curved.',
      bodyLanguage: 'He shifted his weight, turning toward her as if the room had tilted.',
      sensoryCues: 'The brush of his sleeve against her arm. She did not move away.'
    }
  },

  CHARGED: {
    name: 'Charged',
    emotionalState: 'Acknowledged want. The pretense has cracked. Desire is present and both know it. The question is what happens next.',
    physicalSignals: {
      face: 'Eyes darkened. Lips parted. The mask of composure slipping. Hunger visible.',
      posture: 'Closed distance. Bodies oriented toward each other. Tension in stillness.',
      breath: 'Quickened. Audible. The effort to control it.',
      proximity: 'Close enough to feel breath. Close enough that not touching is a choice.'
    },
    allowedFocus: [
      'The space between mouths',
      'Hands that hover but do not land',
      'Pulse points (throat, wrist)',
      'The heat radiating from skin',
      'Fabric as barrier',
      'The moment before contact',
      'Restraint as its own tension'
    ],
    disallowed: [
      'Explicit description of arousal states',
      'Hands moving below the waist',
      'Removal of clothing beyond jacket/outer layer',
      'Explicit sexual vocabulary',
      'Description of sexual intent'
    ],
    examples: {
      facialExpression: 'His jaw tightened. She watched his throat work as he swallowed, and something in her chest pulled taut.',
      bodyLanguage: 'He stepped into her space. She did not step back. Neither of them breathed.',
      sensoryCues: 'The heat of his palm through her sleeve. The thrum of her pulse against his fingertips at her wrist.'
    }
  },

  BRINK_OF_SEX: {
    name: 'Brink-of-Sex',
    emotionalState: 'The edge. One breath from crossing. The tension is unbearable and exquisite. What happens next is inevitable but not yet.',
    physicalSignals: {
      face: 'All pretense gone. Want written openly. Eyes locked or closed. Lips barely apart.',
      posture: 'Bodies pressed or about to be. Hands gripping fabric, hair, the edge of control.',
      breath: 'Ragged. Shared. The sound of it filling silence.',
      proximity: 'No distance left. Contact is constant. Separation would require force of will.'
    },
    allowedFocus: [
      'The surrender of control',
      'Hands in hair, on face, at the small of back',
      'The arch of a spine',
      'Mouths meeting or about to',
      'The sound of breathing, of names spoken low',
      'Fabric twisted, pushed aside (not removed)',
      'The threshold—the moment before it is crossed'
    ],
    disallowed: [
      'Explicit sexual acts',
      'Genital contact or focus',
      'Full undressing',
      'Pornographic framing',
      'Clinical or mechanical description',
      'Voyeuristic narration of sex'
    ],
    examples: {
      facialExpression: 'Her eyes were closed, her lips parted around his name. He watched her like she was the only thing that existed.',
      bodyLanguage: 'She pulled him closer by his collar. He let himself be pulled. The last inch between them vanished.',
      sensoryCues: 'His mouth at her jaw, her throat, the place where her pulse hammered. Her fingers twisted in his shirt like she was drowning.'
    }
  }
};

// =============================================================================
// PART 3 — MODE-SPECIFIC RULES
// =============================================================================

const MODE_RULES = {
  STORY_PROSE: {
    name: 'Story Prose Mode',
    emphasize: [
      'Internal sensation and emotion',
      'The POV character\'s physical awareness',
      'Metaphor that evokes without stating',
      'The weight of implication',
      'Restraint as erotic force',
      'What is not said, not done, not yet'
    ],
    avoid: [
      'Explicit sexual mechanics',
      'Pornographic vocabulary',
      'Anatomy as focus',
      'Sex acts described in progress',
      'Objectifying external description'
    ],
    conveyDesireThrough: 'Interiority. The reader feels desire through the POV character\'s body—their quickened pulse, their held breath, the heat they cannot explain. Desire lives in restraint, in the effort not to act, in the moment before.'
  },

  VISUALIZE_IMAGE: {
    name: 'Visualize Image Mode',
    emphasize: [
      'Cropped framing that implies without showing',
      'Partial views (hands, shoulders, silhouettes)',
      'Posture and body tension',
      'Proximity and the space between bodies',
      'Fabric as texture and barrier',
      'Lighting that sculpts mood (shadows, warmth, chiaroscuro)',
      'Faces that convey want without performance'
    ],
    avoid: [
      'Explicit sexual acts',
      'Pornographic posing',
      'Nudity as focus',
      'Genital visibility or suggestion',
      'Voyeuristic camera angles',
      'Stock erotic photography aesthetics'
    ],
    conveyDesireThrough: 'Composition. Desire is in the angle of bodies, the closeness that suggests collision, the hand that grips fabric. The frame may be tight—shoulders and faces, the curve of a back, fingers in hair. Characters may appear aroused through expression and tension, never through explicit display.'
  }
};

// =============================================================================
// PART 4 — SYSTEM PROMPTS
// =============================================================================

/**
 * SYSTEM PROMPT: Story Prose Erotic Intensity
 */
const STORY_PROSE_EROTIC_SYSTEM = `
================================================================================
EROTIC INTENSITY SYSTEM — STORY PROSE
================================================================================

CORE PRINCIPLE:
Eroticism is conveyed through sensation, implication, emotional tension, and restraint.
Eroticism NEVER relies on explicit sexual acts, genital focus, pornographic mechanics, or voyeur framing.

--------------------------------------------------------------------------------
TIER: TEASE
--------------------------------------------------------------------------------
Emotional State: Awareness, curiosity, the first flicker of want.

Physical Signals:
- Eyes that linger. Glances that drop to lips, then away.
- The unconscious lean-in. Fingers that fidget or still.
- Breath held. A pause before speaking.
- Close enough to notice warmth. Not close enough to touch.

Allowed: Eye contact, accidental touch, voice changes, awareness of being watched, unexplained heat.
Disallowed: Direct arousal statements, sexual intention spoken, descriptions below collarbone, undressing, erogenous touch.

--------------------------------------------------------------------------------
TIER: CHARGED
--------------------------------------------------------------------------------
Emotional State: Acknowledged want. The pretense has cracked.

Physical Signals:
- Eyes darkened. Lips parted. Hunger visible.
- Bodies oriented toward each other. Tension in stillness.
- Breath quickened, audible.
- Close enough to feel breath. Not touching is a choice.

Allowed: Space between mouths, hands that hover, pulse points, heat through fabric, restraint as tension.
Disallowed: Explicit arousal states, hands below waist, clothing removal beyond outer layer, sexual vocabulary.

--------------------------------------------------------------------------------
TIER: BRINK-OF-SEX
--------------------------------------------------------------------------------
Emotional State: The edge. One breath from crossing. Inevitable but not yet.

Physical Signals:
- All pretense gone. Want written openly.
- Bodies pressed. Hands gripping fabric, hair, control.
- Breath ragged, shared.
- No distance left.

Allowed: Surrender of control, hands in hair/face/small of back, arch of spine, mouths meeting, fabric twisted/pushed aside, the threshold moment.
Disallowed: Explicit sexual acts, genital focus, full undressing, pornographic framing, clinical description.

--------------------------------------------------------------------------------
PROSE RULES:
--------------------------------------------------------------------------------
- Convey desire through interiority and physical awareness
- Use metaphor that evokes without stating
- Restraint IS erotic force
- Focus on what is not said, not done, not yet
- NEVER describe sex acts in progress
- NEVER use pornographic vocabulary
================================================================================
`;

/**
 * SYSTEM PROMPT: Visualize Image Erotic Intensity
 */
const VISUALIZE_IMAGE_EROTIC_SYSTEM = `
================================================================================
EROTIC INTENSITY SYSTEM — VISUALIZE IMAGES
================================================================================

CORE PRINCIPLE:
Eroticism is conveyed through composition, posture, proximity, and restraint.
Eroticism NEVER relies on explicit acts, nudity as focus, pornographic posing, or voyeuristic angles.

--------------------------------------------------------------------------------
TIER: TEASE
--------------------------------------------------------------------------------
Composition: Distance and awareness.

Show:
- Eyes meeting across space
- The slight lean toward
- Fingers near but not touching
- The charged gap between bodies

Frame: Medium to wide. Context matters. The space between is the subject.

--------------------------------------------------------------------------------
TIER: CHARGED
--------------------------------------------------------------------------------
Composition: Proximity and tension.

Show:
- Faces close, breath-distance apart
- Hands at wrist, jaw, shoulder
- Bodies angled into each other
- The moment of almost-contact

Frame: Tighter. Shoulders up. The world narrows to two people.

--------------------------------------------------------------------------------
TIER: BRINK-OF-SEX
--------------------------------------------------------------------------------
Composition: Contact and threshold.

Show:
- Bodies pressed or about to be
- Hands in hair, gripping fabric
- Mouths meeting or a breath apart
- The arch, the pull, the surrender

Frame: Intimate. Cropped. Partial views. Silhouettes allowed.

--------------------------------------------------------------------------------
IMAGE RULES:
--------------------------------------------------------------------------------
- Cropped framing that implies without showing
- Partial views: hands, shoulders, silhouettes, the curve of a back
- Posture and body tension as primary signals
- Fabric as texture and barrier
- Lighting that sculpts mood (shadows, warmth, chiaroscuro)
- Faces that convey want through expression, not performance

NEVER SHOW:
- Explicit sexual acts
- Pornographic posing or "glamour" aesthetics
- Nudity as focal point
- Genital visibility or suggestion
- Voyeuristic camera angles
- Stock erotic photography framing

Characters may appear aroused through expression and tension, NEVER through explicit display.
================================================================================
`;

/**
 * DEVELOPER NOTE: Tier Selection in Gameplay
 */
const DEVELOPER_NOTE = `
================================================================================
DEVELOPER NOTE — TIER SELECTION
================================================================================

Tier selection is determined by the combination of:
1. Player's chosen Intensity setting (Clean, Naughty, Erotic, Dirty)
2. Current narrative context and relationship state
3. Explicit player action/dialogue intent

MAPPING:

Clean → No erotic tiers active. Romance only.
Naughty → TEASE tier maximum. Flirtation and awareness.
Erotic → CHARGED tier maximum. Acknowledged desire, restrained.
Dirty → BRINK-OF-SEX tier maximum. The edge, never explicit.

IMPORTANT:
- Even at Dirty/BRINK-OF-SEX, explicit sex acts are NEVER described or shown
- The system creates intensity through restraint, not escalation
- The threshold is the destination, not a waypoint to explicit content

Tier escalation within a scene should be GRADUAL:
- Early scene: TEASE (if any)
- Rising tension: CHARGED
- Climactic moment: BRINK-OF-SEX
- Scene ends AT or BEFORE the threshold, never after
================================================================================
`;

// =============================================================================
// TIER SELECTION LOGIC
// =============================================================================

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

  // Narrative phase determines how far up the allowed ladder we go
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
 * Build the erotic intensity directive for story prose.
 */
function buildProseIntensityDirective(intensitySetting, narrativePhase = 'early') {
  const tier = selectTierForScene(intensitySetting, narrativePhase);

  if (!tier) {
    return `
EROTIC INTENSITY: NONE
This scene contains no erotic content. Romance is permitted but remains chaste.
Focus on emotional connection without physical tension.`;
  }

  const tierConfig = INTENSITY_TIERS[tier];

  return `
${STORY_PROSE_EROTIC_SYSTEM}

ACTIVE TIER: ${tierConfig.name.toUpperCase()}

${tierConfig.emotionalState}

PHYSICAL SIGNALS FOR THIS TIER:
- Face: ${tierConfig.physicalSignals.face}
- Posture: ${tierConfig.physicalSignals.posture}
- Breath: ${tierConfig.physicalSignals.breath}
- Proximity: ${tierConfig.physicalSignals.proximity}

EXAMPLES:
- "${tierConfig.examples.facialExpression}"
- "${tierConfig.examples.bodyLanguage}"
- "${tierConfig.examples.sensoryCues}"
`;
}

/**
 * Build the erotic intensity directive for image visualization.
 */
function buildImageIntensityDirective(intensitySetting, narrativePhase = 'early') {
  const tier = selectTierForScene(intensitySetting, narrativePhase);

  if (!tier) {
    return `
EROTIC INTENSITY: NONE
This image contains no erotic content. Characters may appear together but without romantic/erotic tension.`;
  }

  return `
${VISUALIZE_IMAGE_EROTIC_SYSTEM}

ACTIVE TIER: ${INTENSITY_TIERS[tier].name.toUpperCase()}
Apply the composition rules for this tier.
`;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Core data
  INTENSITY_TIERS,
  MODE_RULES,

  // System prompts
  STORY_PROSE_EROTIC_SYSTEM,
  VISUALIZE_IMAGE_EROTIC_SYSTEM,
  DEVELOPER_NOTE,

  // Tier selection
  getMaxTierForIntensity,
  selectTierForScene,

  // Directive builders
  buildProseIntensityDirective,
  buildImageIntensityDirective
};
