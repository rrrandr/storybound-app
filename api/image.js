export const runtime = 'nodejs';

export const config = {
  maxDuration: 60
};

// ============================================================
// SIZE MAPPING - Normalize to OpenAI-supported dimensions
// ============================================================
function mapToOpenAISize(size, imageIntent) {
  // Book covers use portrait ratio (OpenAI-supported 1024x1536)
  if (imageIntent === 'book_cover') return '1024x1536';

  // OpenAI supports: 1024x1024, 1024x1536, 1536x1024, auto
  const [w, h] = (size || '1024x1024').split('x').map(Number);
  if (w > h) return '1536x1024';      // Landscape
  if (h > w) return '1024x1536';      // Portrait
  return '1024x1024';                  // Square / fallback
}

// ============================================================
// INTENT-BASED MODEL SELECTION
// Backend enforces model choice - frontend cannot override
// ============================================================
function getOpenAIModel(imageIntent) {
  // book_cover: Higher quality, supports typography (gpt-image-1.5)
  // scene_visualize: Fast, cheap, no text focus (gpt-image-1)
  if (imageIntent === 'book_cover') return 'gpt-image-1.5';
  return 'gpt-image-1';
}

// ============================================================
// PROMPT TEMPLATES - Intent-specific framing
// ============================================================

// ============================================================
// COVER GENERATION SYSTEM (REVISED)
// Mandatory decision sequence to prevent visual convergence
// ============================================================
// LEGACY STATUS: ACTIVE BY DESIGN (Phase 2b)
// This system remains the authoritative cover generation path.
// Phase 2b adds structural scaffolding only — no behavior change.
// ============================================================

// ============================================================
// PHASE 3B — STORYBOUND UNIVERSAL BORDER (FROZEN)
// This layer establishes global shelf identity.
// Do NOT modify, restyle, animate, or extend.
// Do NOT couple to archetypes, world grammar, or arousal.
// All future visual variation must occur BELOW this layer.
// Unfreeze only with explicit phase authorization.
// ============================================================

// ============================================================
// PHASE 3B: UNIVERSAL STORYBOUND BORDER & KEY ICON
// Applied to ALL cover types (legacy and archetype-specific)
// Toggle: Set to false to disable border/icon entirely
// ============================================================
const STORYBOUND_BORDER_ENABLED = true;

// Border and key icon prompt augmentation
// Appended to all cover prompts when enabled
const STORYBOUND_BORDER_PROMPT = `
STORYBOUND BRAND ELEMENTS (mandatory):
- BORDER: A thin, subtle border line running INSIDE the canvas edge on all four sides. The border should be uniform, visually quiet, and non-ornamental. Color should harmonize with the cover's palette — typically a muted tone that complements without competing. The border frames the composition but never dominates.
- KEY ICON: A small, quiet key or keyhole icon in the TOP-RIGHT corner. Scale: small and secondary. The icon should be restrained, almost a whisper — no glow, no sparkle, no animation. It marks this as a Storybound book without demanding attention.`;

// Helper to append border prompt when enabled
function appendStoryboundBorder(basePrompt) {
  if (!STORYBOUND_BORDER_ENABLED) return basePrompt;
  return basePrompt + STORYBOUND_BORDER_PROMPT;
}

// ============================================================
// STEP 1: EMOTIONAL GRAVITY (choose ONE)
// The single dominant emotional force driving the cover
// ============================================================
const EMOTIONAL_GRAVITY_OPTIONS = [
  'foreboding',
  'pressure',
  'yearning',
  'secrecy',
  'inevitability',
  'rebellion',
  'loss',
  'obsession'
];

function selectEmotionalGravity(tone, dynamic, genre) {
  const toneLower = (tone || '').toLowerCase();
  const dynamicLower = (dynamic || '').toLowerCase();
  const genreLower = (genre || '').toLowerCase();

  // Map story signals to emotional gravity
  if (toneLower.includes('dark') || toneLower.includes('horror')) {
    return Math.random() < 0.5 ? 'foreboding' : 'obsession';
  }
  if (dynamicLower.includes('forbidden') || dynamicLower.includes('secret')) {
    return Math.random() < 0.5 ? 'secrecy' : 'yearning';
  }
  if (dynamicLower.includes('enemy') || dynamicLower.includes('rival')) {
    return Math.random() < 0.5 ? 'pressure' : 'rebellion';
  }
  if (genreLower.includes('gothic') || genreLower.includes('paranormal')) {
    return Math.random() < 0.5 ? 'inevitability' : 'loss';
  }
  if (toneLower.includes('earnest') || toneLower.includes('poetic')) {
    return Math.random() < 0.5 ? 'yearning' : 'inevitability';
  }

  // Random selection for unmatched cases
  return EMOTIONAL_GRAVITY_OPTIONS[Math.floor(Math.random() * EMOTIONAL_GRAVITY_OPTIONS.length)];
}

// ============================================================
// STEP 2: FOCAL ANCHOR (choose ONE)
// Concrete object, shadow/fragment, or deliberate negative space
// ============================================================

// HARD BANNED - never use these
const BANNED_ANCHORS = [
  'envelope', 'envelopes', 'letter', 'letters',
  'rose', 'roses', 'flower', 'flowers', 'petals', 'bloom', 'blossom',
  'mystery object', 'mysterious object', 'unknown object',
  'art deco', 'art-deco', 'geometric pattern', 'deco ornament'
];

function isBannedAnchor(anchor) {
  const normalized = (anchor || '').toLowerCase();
  return BANNED_ANCHORS.some(banned => normalized.includes(banned));
}

// Genre-specific focal anchors (concrete objects or their shadows/fragments)
const FOCAL_ANCHORS = {
  contemporary: [
    'a cracked phone screen, face-down',
    'car keys abandoned on cold marble',
    'a stiletto heel, strap broken',
    'prescription bottle tipped on its side',
    'the silhouette of a hand pressing glass'
  ],
  fantasy: [
    'a crown half-consumed by ash',
    'a blade with frost creeping up the steel',
    'chains dissolving into starlight',
    'the shadow of wings across stone',
    'a throne shown only by the space it occupies'
  ],
  romantasy: [
    'a dagger wound through silk',
    'a bitten fruit with dark juice running',
    'antlers tangled with torn fabric',
    'the negative space of an absent crown',
    'a shattered mirror showing only fragments'
  ],
  historical: [
    'opera gloves with bloodied fingertips',
    'a pocket watch stopped mid-swing',
    'a dance card torn in half',
    'the shadow of a corset lacework',
    'empty space where a portrait was removed'
  ],
  paranormal: [
    'a fang impression in velvet',
    'smoke that almost forms a face',
    'bones arranged in an unfinished pattern',
    'the silhouette of something not quite human',
    'a doorway showing only void'
  ],
  dark: [
    'shattered handcuffs, one cuff still locked',
    'a leather collar with broken chain',
    'a blade edge catching the only light',
    'restraints reduced to shadow',
    'the negative space of a body recently present'
  ],
  scifi: [
    'a cracked visor reflecting dead stars',
    'neural cables severed and sparking',
    'dog tags fused together by heat',
    'the silhouette of a ship against void',
    'frost-traced handprints on glass'
  ],
  gothic: [
    'an iron key rusted mid-turn',
    'a raven skull on white lace',
    'a candle flame frozen, burning black',
    'the shadow of a manor spire',
    'an empty frame where something watched'
  ],
  suspense: [
    'a burner phone with one unread message',
    'a wedding ring beside a weapon',
    'a bloody thumbprint on glass',
    'the negative space of erased evidence',
    'a keyhole showing only darkness'
  ],
  crime: [
    'a signet ring in pooling liquid',
    'a blade clean on one side only',
    'scattered currency, denominations hidden',
    'the shadow of a figure in a doorway',
    'a briefcase, contents unseen, lid ajar'
  ]
};

// Deliberate negative space fallbacks
const NEGATIVE_SPACE_ANCHORS = [
  'the negative space where a figure stood',
  'an empty threshold leading to darkness',
  'the outline of something removed',
  'shadow without source across bare ground',
  'a doorway showing only void',
  'the impression left in disturbed ash',
  'fractured glass revealing nothing behind',
  'the space between two hands that do not touch'
];

function selectFocalAnchor(genre, recentAnchors = []) {
  const genreLower = (genre || '').toLowerCase();

  // Find matching genre pool
  let pool = FOCAL_ANCHORS.contemporary;
  for (const [key, items] of Object.entries(FOCAL_ANCHORS)) {
    if (genreLower.includes(key)) {
      pool = items;
      break;
    }
  }

  // Filter out recently used anchors
  const recentNormalized = recentAnchors.map(a => (a || '').toLowerCase());
  const available = pool.filter(anchor => {
    const anchorLower = anchor.toLowerCase();
    // Exclude if keywords overlap with recent
    return !recentNormalized.some(recent => {
      const recentWords = recent.split(/\s+/).filter(w => w.length > 3);
      return recentWords.some(word => anchorLower.includes(word));
    });
  });

  // If pool exhausted or anchor is banned, use negative space
  if (available.length === 0) {
    return NEGATIVE_SPACE_ANCHORS[Math.floor(Math.random() * NEGATIVE_SPACE_ANCHORS.length)];
  }

  const selected = available[Math.floor(Math.random() * available.length)];

  // Final safety check
  if (isBannedAnchor(selected)) {
    return NEGATIVE_SPACE_ANCHORS[Math.floor(Math.random() * NEGATIVE_SPACE_ANCHORS.length)];
  }

  return selected;
}

// ============================================================
// STEP 3: HUMAN PRESENCE (optional)
// If present: obscured, turned away, cropped, or silhouetted
// ============================================================
function getHumanPresenceDirective() {
  const options = [
    'If any human form appears: face must be turned away, cropped at jawline, or lost in shadow. No eye contact.',
    'Human presence allowed only as silhouette, partial limb, or back-turned figure. No posed portrait energy.',
    'Any figure must be obscured—by darkness, by frame edge, by their own posture. Never facing the viewer.',
    'No human figures. Only the traces they leave: a handprint, a shadow, an absence.'
  ];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================================
// STEP 4: VISUAL RESTRAINT
// Apply at least two: limited palette, asymmetry, occlusion, shallow depth
// ============================================================
function getVisualRestraintDirectives(emotionalGravity) {
  const restraints = [];

  // Palette restraint (always applied - brown is never default)
  const palettes = {
    foreboding: 'Palette: deep slate, bone white, and one accent of arterial red. NO brown.',
    pressure: 'Palette: cold steel grey, stark white, single point of heated amber. NO brown.',
    yearning: 'Palette: midnight blue, silver, muted gold. NO brown or sepia.',
    secrecy: 'Palette: shadow black, smoke grey, one thread of crimson. NO brown.',
    inevitability: 'Palette: storm purple, ash white, cold gold. NO brown.',
    rebellion: 'Palette: charcoal, blood orange, electric blue accent. NO brown.',
    loss: 'Palette: desaturated teal, bone white, faded rose. NO brown or warm tones.',
    obsession: 'Palette: deep burgundy, black, silver edge. NO brown.'
  };
  restraints.push(palettes[emotionalGravity] || 'Palette: 2-3 tones only, cool or jewel. Brown is NEVER the default.');

  // Composition restraints (randomly select 2)
  const compositionOptions = [
    'Composition: asymmetric balance. The focal point is off-center, weighted by negative space.',
    'Partial occlusion: the anchor object is partially hidden—by shadow, by frame, by another element.',
    'Shallow depth of field: background dissolves into soft abstraction, focus razor-sharp on anchor.',
    'Deliberate cropping: elements extend beyond frame edge, implying continuation.',
    'Textural restraint: one dominant texture only (smoke, silk, stone, glass). No visual clutter.'
  ];

  // Shuffle and take 2
  const shuffled = compositionOptions.sort(() => Math.random() - 0.5);
  restraints.push(shuffled[0]);
  restraints.push(shuffled[1]);

  return restraints.join('\n');
}

// ============================================================
// POETIC SUBTITLE GENERATOR
// Evocative phrases, not genre labels
// ============================================================
function generatePoeticSubtitle(genre, emotionalGravity) {
  const genreLower = (genre || '').toLowerCase();

  const subtitlesByEmotion = {
    foreboding: [
      'Where Shadows Keep Their Counsel',
      'A Reckoning Long Deferred',
      'What the Dark Remembers'
    ],
    pressure: [
      'A Knot That Will Not Yield',
      'Where Walls Have Weight',
      'The Silence Before Breaking'
    ],
    yearning: [
      'A Distance That Aches',
      'Where Wanting Takes Root',
      'The Space Between Almost'
    ],
    secrecy: [
      'What the Locked Room Holds',
      'A Truth Kept in Amber',
      'Where Whispers Are Currency'
    ],
    inevitability: [
      'What Was Always Coming',
      'A Fate Already Written',
      'Where All Roads Converge'
    ],
    rebellion: [
      'A Fire That Refuses',
      'Where Compliance Ends',
      'The First Act of Defiance'
    ],
    loss: [
      'What Remains After',
      'A Hollow Where Something Lived',
      'The Weight of What Was'
    ],
    obsession: [
      'A Fixation Without Remedy',
      'Where Devotion Becomes Hunger',
      'The Only Thought Left'
    ]
  };

  const pool = subtitlesByEmotion[emotionalGravity] || subtitlesByEmotion.yearning;
  return pool[Math.floor(Math.random() * pool.length)];
}

function wrapBookCoverPrompt(basePrompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentObjects = [], world = null, era = null, arousal = null) {
  const cleanTitle = (title || 'Untitled').trim();
  const cleanAuthor = (authorName || 'ANONYMOUS').toUpperCase().trim();

  // Extract tone from storyStyle (format: "Tone Genre")
  const tone = (storyStyle || '').split(' ')[0] || 'Earnest';

  // STEP 1: Select emotional gravity (ONE only)
  const emotionalGravity = selectEmotionalGravity(tone, dynamic, genre);

  // STEP 2: Select focal anchor (ONE only, no banned items)
  const focalAnchor = selectFocalAnchor(genre, recentObjects);

  // STEP 3: Human presence directive
  const humanPresence = getHumanPresenceDirective();

  // STEP 4: Visual restraint (palette + 2 composition rules)
  const visualRestraint = getVisualRestraintDirectives(emotionalGravity);

  // Generate poetic subtitle based on emotional gravity
  const poeticSubtitle = generatePoeticSubtitle(genre, emotionalGravity);

  // Build cover prompt with mandatory decision sequence
  const coverPrompt = `A prestige literary book cover. Square format.

EMOTIONAL GRAVITY: ${emotionalGravity}
This single emotion must permeate every visual choice. The cover should feel like this word made visible.

FOCAL ANCHOR (one object only):
${focalAnchor}
Render with deliberate lighting—shadow as important as illumination. The anchor occupies compositional weight but not necessarily center. It is the only concrete element.

${humanPresence}

VISUAL RESTRAINT (mandatory):
${visualRestraint}

TYPOGRAPHY:
Title: "${cleanTitle}" — typeset with weight and presence. The focal anchor may interact with letterforms: casting shadow onto them, threading behind them, or bleeding into their edges. Typography and object share physical space.
Series: "${modeLine}" — very small, quiet, subordinate. Near title or upper edge.
Author: ${cleanAuthor} — bold sans-serif, ALL CAPS, anchoring the bottom edge.

HARD BANS:
- NO roses, flowers, petals, or botanical clichés
- NO envelopes, letters, or correspondence
- NO Art Deco patterns (unless 1920s-1940s setting explicitly stated)
- NO brown as dominant or default (brown must be justified, never assumed)
- NO centered symmetry unless emotionally warranted
- NO faces looking at viewer, no posed portrait energy
- NO visual clutter, multiple objects, or busy compositions

The cover must feel quiet, strange, and inevitable. If uncertain between two choices, choose the more restrained option.

No gibberish text. No watermarks.`;

  // Phase 3C: Apply World Grammar (visual bias layer)
  const withWorldGrammar = applyWorldGrammar(coverPrompt, world, era);

  // Phase 3D: Apply Erotic Motif layer (gated by arousal)
  const withEroticMotif = applyEroticMotifLayer(withWorldGrammar, arousal, null, world);

  // Phase 4A: Composition Safety + Title Balance
  const withSafety = appendCompositionSafety(withEroticMotif, null);

  // Phase 4B: Material-Integrated Floating Typography
  const withTypography = applyTypographyInteractionLayer(withSafety, world, null);

  // Phase 3B: Apply universal Storybound border
  return appendStoryboundBorder(withTypography);
}

function wrapScenePrompt(basePrompt, meta = {}) {
  // ═══════════════════════════════════════════════════════════════════
  // 🔒 TONE VISUAL ONTOLOGY BYPASS — Return raw prompt, no cinematic wrapping
  // Tones with visual ontologies must not be overridden by scene wrapper
  // Tone style ALWAYS takes priority over Genre/World defaults
  // ═══════════════════════════════════════════════════════════════════
  const TONES_WITH_VISUAL_ONTOLOGY = ['Wry Confessional', 'WryConfession', 'Lurid Confessional', 'Ink Noir', 'Horror'];

  if (meta?.toneStyleLock || TONES_WITH_VISUAL_ONTOLOGY.includes(meta?.tone)) {
    console.log(`[IMAGE] Tone visual ontology (${meta?.tone}) — bypassing wrapScenePrompt, using raw prompt`);
    return basePrompt;
  }

  // Scene visualization: MOOD-FIRST, atmosphere over description
  // Single moment, tension prioritized, no portrait framing
  return `SCENE VISUALIZATION — MOOD-FIRST

Depict ONE MOMENT from this scene:
${basePrompt}

MANDATORY PRIORITIES (in order):
1. ATMOSPHERE — The emotional weight of the space. Light quality, air pressure, tension.
2. ENVIRONMENT — Architecture, weather, texture of the world pressing in.
3. POSTURE — If figures present, their body language and position in space. NOT faces.
4. DETAIL — One or two concrete objects that carry symbolic weight.

COMPOSITION RULES:
- Frame as if the camera is part of the scene, not observing from outside
- Figures should be mid-action, caught, or turned away — never posed
- NO direct eye contact with viewer. Faces optional; backs, silhouettes, partial views preferred.
- The environment should feel like a character: oppressive, indifferent, or watchful
- Depth of field should emphasize the emotionally weighted element

HARD BANS:
- NO smiling, no glamour, no beauty-shot framing
- NO camera-facing subjects, no "looking into camera"
- NO neutral or cheerful lighting that contradicts tension
- NO portrait orientation with centered face as subject

TONE CALIBRATION:
If the prose contains joy mixed with dread → lean toward dread.
If uncertainty exists between dramatic and quiet → choose quiet.
If multiple figures → focus on the space between them, not their faces.

Style: Cinematic, atmospheric, painterly. Color palette should match emotional register.
NO visible text, captions, titles, logos, or watermarks.`;
}

// ============================================================
// PHASE 2b: CANONICAL REGISTRIES (INERT PLACEHOLDERS)
// These structures exist for structural scaffolding only.
// They are NOT populated and NOT referenced by runtime logic.
// Will be populated and activated in Phase 3.
// ============================================================

// Canonical Implement Registry — closed vocabulary of valid objects per archetype
// Phase 2b: Empty placeholder, not yet populated
const CANONICAL_IMPLEMENT_REGISTRY = {
  // Will contain: archetype -> permitted implements mapping
};

// Tone/Arousal Matrix — combined bias lookup
// Phase 2b: Empty placeholder, not yet populated
const TONE_AROUSAL_MATRIX = {
  // Will contain: tone x arousal -> style modifiers mapping
};

// ============================================================
// PHASE 3C — WORLD GRAMMAR (FROZEN)
// Visual bias layer only (materials, lighting, texture, aesthetic).
// Do NOT add objects, archetypes, erotic content, or logic gates.
// Do NOT override tone or archetype behavior.
// All future variation must occur ABOVE (archetype)
// or BELOW (arousal / erotic motif layer).
// ============================================================

// ============================================================
// PHASE 3C: WORLD GRAMMAR RULES (ACTIVATED)
// Visual bias layer — changes how covers FEEL, not what they depict
// Applied after emotional gravity, before final emission
// ============================================================
const WORLD_GRAMMAR_RULES = {
  modern: {
    materials: 'glass, steel, concrete, neon, LCD glow, asphalt, chrome',
    lighting: 'harsh fluorescent, LED strip, phone-screen glow, streetlamp sodium',
    texture: 'smooth, reflective, industrial, synthetic',
    aesthetic: 'Urban edge, digital age tension, clinical or gritty modernity'
  },
  historical: {
    // Base historical (used when no era specified)
    materials: 'parchment, wax, iron, velvet, candlelight, oil paint, aged wood',
    lighting: 'candlelight, firelight, oil lamp, natural window light, chiaroscuro',
    texture: 'rough, aged, handcrafted, organic',
    aesthetic: 'Pre-industrial weight, tactile authenticity, time-worn elegance',
    // Era-specific overrides
    eras: {
      medieval: {
        materials: 'stone, iron, leather, parchment, tallow, rough-hewn wood',
        lighting: 'torchlight, hearth fire, grey castle light',
        aesthetic: 'Fortress weight, feudal austerity, religious iconography undertones'
      },
      renaissance: {
        materials: 'oil paint, gilt frame, marble, silk, blown glass, illuminated manuscript',
        lighting: 'Vermeer window light, golden hour, sfumato softness',
        aesthetic: 'Humanist elegance, mathematical proportion, rich but restrained'
      },
      victorian: {
        materials: 'gaslight, brass, mahogany, lace, daguerreotype, coal soot',
        lighting: 'gaslight flicker, fog-diffused, parlor shadow',
        aesthetic: 'Industrial Gothic, repressed tension, ornate decay'
      },
      regency: {
        materials: 'candlelight, muslin, watercolor, bone china, polished silver',
        lighting: 'soft morning light, ballroom chandelier, garden dapple',
        aesthetic: 'Restrained elegance, social precision, romantic classicism'
      }
    }
  },
  fantasy: {
    materials: 'enchanted metal, crystal, starlight, ancient stone, living wood, arcane ink',
    lighting: 'bioluminescence, moonlight, magical glow, aurora shimmer, ember light',
    texture: 'otherworldly, impossible, organic-crystalline hybrid',
    aesthetic: 'Secondary world weight, mythic resonance, magic as physics'
  },
  scifi: {
    materials: 'carbon fiber, hologram, plasma, zero-g liquid, neural mesh, void-black alloy',
    lighting: 'starfield, engine glow, cryosleep blue, warning-red alert, solar flare',
    texture: 'ultra-smooth, vacuum-sealed, radiation-scarred, nano-precise',
    aesthetic: 'Post-terrestrial isolation, technological sublime, cosmic indifference'
  }
};

// Apply World Grammar to a prompt — visual bias layer
// Returns original prompt unchanged if world is undefined/null
// For Historical world, era-specific overrides are merged if era is provided
function applyWorldGrammar(basePrompt, world, era) {
  // Backward compatibility: no modification when world is undefined/null
  if (!world) return basePrompt;

  const worldLower = world.toLowerCase();
  const grammar = WORLD_GRAMMAR_RULES[worldLower];

  // Unknown world: return unchanged
  if (!grammar) return basePrompt;

  // Build the grammar block
  let materials = grammar.materials;
  let lighting = grammar.lighting;
  let texture = grammar.texture;
  let aesthetic = grammar.aesthetic;

  // Historical era-specific overrides
  if (worldLower === 'historical' && era && grammar.eras) {
    const eraLower = era.toLowerCase();
    const eraGrammar = grammar.eras[eraLower];
    if (eraGrammar) {
      materials = eraGrammar.materials || materials;
      lighting = eraGrammar.lighting || lighting;
      texture = eraGrammar.texture || texture;
      aesthetic = eraGrammar.aesthetic || aesthetic;
    }
  }

  // Construct World Grammar block
  const worldGrammarBlock = `
WORLD GRAMMAR (${world.toUpperCase()}${era ? ' — ' + era.toUpperCase() : ''}):
- MATERIALS: Favor ${materials}
- LIGHTING: ${lighting}
- TEXTURE: ${texture}
- AESTHETIC: ${aesthetic}
World Grammar shapes visual atmosphere. It does NOT override focal anchor, emblem, or emotional gravity.`;

  return basePrompt + worldGrammarBlock;
}

// ============================================================
// PHASE 3D — EROTIC MOTIF LAYER (GATED)
// Symbolic erotic charge only. NO bodies, faces, or explicit acts.
// Activates ONLY when arousal === 'Steamy' || arousal === 'Passionate'
// Sits BELOW World Grammar, INSIDE the border.
// One-line rollback: return prompt unchanged in applyEroticMotifLayer()
// ============================================================

const EROTIC_MOTIF_REGISTRY = {
  DEFAULT: [
    'delicate restraints',
    'ornamental handcuffs',
    'silk bindings',
    'ribbon-like constraints',
    'polished metal fastenings'
  ],
  MASKS: [
    'porcelain mask with eyes painted shut',
    'lacquered ceremonial mask',
    'gilded blindfold mask'
  ],
  HARDWARE: [
    'world-appropriate handcuffs',
    'fine chain links',
    'engraved locking mechanism'
  ]
};

// Apply erotic motif layer — symbolic erotic adjacency only
// Returns prompt unchanged if arousal is not Erotic/Dirty
// ROLLBACK: Uncomment the next line to disable erotic motif layer entirely
// function applyEroticMotifLayer(prompt, arousal, archetype, world) { return prompt; }
function applyEroticMotifLayer(prompt, arousal, archetype, world) {
  // Gate: Only activate for Erotic or Dirty arousal levels
  if (arousal !== 'Steamy' && arousal !== 'Passionate') {
    return prompt;
  }

  // Select motif category based on context
  let motifPool;
  if (archetype === 'EMBLEM') {
    // Emblems favor hardware motifs (symbolic, centered)
    motifPool = EROTIC_MOTIF_REGISTRY.HARDWARE;
  } else if (Math.random() < 0.3) {
    // 30% chance of mask motif for variety
    motifPool = EROTIC_MOTIF_REGISTRY.MASKS;
  } else {
    motifPool = EROTIC_MOTIF_REGISTRY.DEFAULT;
  }

  const selectedMotif = motifPool[Math.floor(Math.random() * motifPool.length)];

  // Build restrained erotic motif clause
  const eroticMotifBlock = `

EROTIC MOTIF (symbolic only):
Integrate ${selectedMotif} as a subtle, restrained visual element.
This motif suggests secrecy and surrender without depicting bodies, faces, or explicit acts.
The motif harmonizes with the composition — it does NOT dominate or override the focal anchor/emblem.`;

  return prompt + eroticMotifBlock;
}

// ============================================================
// PHASE 4A — COMPOSITION SAFETY + TITLE BALANCE
// Enforces safe margins and typography-object harmony
// No archetype or behavior changes
// Inserted after World Grammar + Erotic Motif, before Border
// ============================================================
function appendCompositionSafety(prompt, archetype) {
  const safetyBlock = `

COMPOSITION SAFETY:
- Maintain a clear top margin for series and title text
- Maintain a clear bottom margin for author name
- No critical visual elements within the top 8% or bottom 10% of the frame
- All text must be fully visible and legible within image boundaries
- Avoid edge-cropping of letters, words, or decorative borders`;

  const titleBalance = archetype === 'THRESHOLD'
    ? `

TITLE BALANCE:
- Title must be prominent but not oversized relative to the threshold boundary
- The boundary element must remain clearly visible and meaningful
- Diegetic typography must integrate with the physical environment — carved, etched, or formed from material
- Avoid oversized text that overwhelms the composition or breaks diegetic immersion`
    : `

TITLE BALANCE:
- Title must be prominent but not oversized relative to the central object
- The symbolic object must remain clearly visible and meaningful
- Typography should integrate with lighting, texture, and surface
- Avoid oversized text that overwhelms the composition`;

  return prompt + safetyBlock + titleBalance;
}

// ============================================================
// PHASE 4B — MATERIAL-INTEGRATED FLOATING TYPOGRAPHY
// Expands typographic treatment beyond diegetic inscription.
// Typography interacts with world materials, motifs, and props.
// NOT a replacement for diegetic typography — an expansion.
// Inserted AFTER Composition Safety, BEFORE Border.
// No changes to archetype selection, world grammar, or erotic layers.
// ============================================================

// World-specific material palettes for typography construction
const TYPOGRAPHY_MATERIAL_GUIDANCE = {
  prehistoric: {
    materials: ['bone', 'flint', 'sinew', 'charcoal', 'sticks', 'ochre', 'ash'],
    descriptor: 'primordial, hand-formed, elemental'
  },
  historical: {
    materials: ['ink', 'vellum', 'carved stone dust', 'wax', 'cloth', 'thread'],
    descriptor: 'crafted, hand-lettered, tactile'
  },
  fantasy: {
    materials: ['runic light', 'enchanted metal', 'crystal', 'shadow', 'mist'],
    descriptor: 'arcane, luminous, otherworldly'
  },
  modern: {
    materials: ['neon', 'glass', 'steel', 'paper', 'smoke', 'rain'],
    descriptor: 'industrial, ambient, urban'
  },
  scifi: {
    materials: ['holographic light', 'plasma residue', 'carbon alloy', 'void-static', 'neural filament'],
    descriptor: 'post-terrestrial, synthetic, signal-born'
  }
};

// Physical interactions between typography and scene elements
const TYPOGRAPHY_INTERACTIONS = [
  'pierced by a scene object passing through a letterform',
  'woven with visible threads or filaments connecting strokes',
  'interrupted by cracks that fracture across letters and surface alike',
  'partially obscured by drifting fog, ash, or atmospheric haze',
  'tangled with cloth, ribbon, or fabric that drapes across strokes',
  'threaded through by a narrow object (arrow, thorn, wire, needle)',
  'dusted with particles settling on horizontal strokes',
  'casting material shadow onto the scene below',
  'emerging from the surface material as if pressed upward from within',
  'bound by fine lines (thread, chain, sinew, vine) that lash letters together'
];

// Liminal interactions specific to THRESHOLD archetype
const THRESHOLD_LIMINAL_INTERACTIONS = [
  'interrupted by a veil drifting across the letterforms',
  'split by doorway light that bleaches through the strokes',
  'disturbed by wind that scatters particles from letter edges',
  'fractured along a crack that runs through both threshold and title',
  'partially hidden behind a curtain that overlaps the text',
  'dusted with ash that settles unevenly across the letters',
  'caught in the liminal light — half the title illuminated, half in shadow',
  'threaded through the boundary surface, letters on both sides of the crossing'
];

// Apply Material-Integrated Floating Typography interaction layer
// Returns prompt unchanged if world is null/undefined (backward compatible)
function applyTypographyInteractionLayer(prompt, world, archetype) {
  // Backward compatibility: no modification when world is undefined/null
  if (!world) return prompt;

  const worldLower = world.toLowerCase();

  // Resolve material palette (fall back to modern if world unrecognized)
  const guidance = TYPOGRAPHY_MATERIAL_GUIDANCE[worldLower]
    || TYPOGRAPHY_MATERIAL_GUIDANCE.modern;

  // Select random material subset (2-3 materials)
  const shuffledMaterials = guidance.materials
    .slice()
    .sort(() => Math.random() - 0.5);
  const selectedMaterials = shuffledMaterials.slice(0, 2 + Math.floor(Math.random() * 2));

  // Select interaction type — THRESHOLD requires liminal interaction
  let interaction;
  if (archetype === 'THRESHOLD') {
    interaction = THRESHOLD_LIMINAL_INTERACTIONS[
      Math.floor(Math.random() * THRESHOLD_LIMINAL_INTERACTIONS.length)
    ];
  } else {
    interaction = TYPOGRAPHY_INTERACTIONS[
      Math.floor(Math.random() * TYPOGRAPHY_INTERACTIONS.length)
    ];
  }

  // Build the typography interaction block
  const typographyBlock = `

MATERIAL-INTEGRATED FLOATING TYPOGRAPHY:
- Letters may be composed of or evoke: ${selectedMaterials.join(', ')}
- Material quality: ${guidance.descriptor}
- Physical interaction: Typography is ${interaction}
- Typography floats within the scene — it is NOT a clean font overlay and NOT pasted flat onto the image plane
- Letters must respect composition margins (top/bottom fully visible)
- No partial cropping or extension beyond the glyph envelope
- Small physical interactions between scene elements and letterforms are encouraged`;

  return prompt + typographyBlock;
}

// Forbidden Library — blocklist validation
// Phase 2b: Empty placeholder, not yet populated
const FORBIDDEN_LIBRARY = {
  // Will contain: Set of forbidden objects/phrases
};

// Forbidden Library Validator — runtime validation function
// Phase 2b: Stub only, always passes
function validateAgainstForbiddenLibrary(object, promptFragments) {
  // Phase 2b: Structural stub — always returns valid
  // Will perform actual validation in Phase 3
  return { valid: true, reason: null };
}

// ============================================================
// PHASE 3A: EMBLEM ARCHETYPE (ACTIVATED)
// A symbolic mark, sigil, seal, crest, rune, keyhole, knot, glyph, or icon
// Represents fate, bond, taboo, power, or promise
// ============================================================

// Emblem-specific focal objects by emotional gravity
const EMBLEM_OBJECTS = {
  foreboding: [
    'a wax seal impressed with an unreadable sigil, cracked down the center',
    'a tarnished medallion bearing an eye that never blinks',
    'a keyhole rimmed in frost, darkness beyond',
    'an iron sigil branded into weathered wood'
  ],
  pressure: [
    'a seal pressed so deep the wax has fractured',
    'a crest where two symbols strain against each other',
    'a knot pulled impossibly tight, fibers visible',
    'a glyph etched into metal, edges sharp enough to cut'
  ],
  yearning: [
    'a locket clasp shaped like intertwined initials, slightly open',
    'a wax seal in deep crimson, still warm',
    'a ring impression left in soft metal',
    'two crescent moons almost touching, a sigil of near-union'
  ],
  secrecy: [
    'a seal bearing a symbol no archive contains',
    'a keyhole with no visible lock mechanism',
    'a sigil half-hidden beneath pooled shadow',
    'a medallion face-down, its meaning concealed'
  ],
  inevitability: [
    'a clock face with no hands, only a sigil at center',
    'a seal that has been broken and resealed, and broken again',
    'a rune carved into stone worn smooth by centuries',
    'an hourglass emblem, sand frozen mid-fall'
  ],
  rebellion: [
    'a crest slashed through with a single deliberate mark',
    'a seal shattered but its fragments still readable',
    'a sigil drawn in ash over an older, faded one',
    'a medallion with its chain severed'
  ],
  loss: [
    'an empty setting where a sigil-stone once sat',
    'a seal impression with nothing to seal',
    'a ring mark on velvet, the ring itself gone',
    'a keyhole filled with cold wax'
  ],
  obsession: [
    'a sigil carved and recarved until the surface is raw',
    'a seal pressed a dozen times, overlapping, frantic',
    'a medallion worn thin from constant touching',
    'a rune traced in blood that has long since dried black'
  ]
};

// Select emblem object based on emotional gravity
function selectEmblemObject(emotionalGravity) {
  const pool = EMBLEM_OBJECTS[emotionalGravity] || EMBLEM_OBJECTS.yearning;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Build EMBLEM archetype cover prompt
// Reuses canonical emotional gravity, visual restraint, typography
// Replaces focal anchor with emblem-specific object
// Centered, stable composition — no human presence
function buildEmblemCoverPrompt(params) {
  const { title, authorName, modeLine, dynamic, storyStyle, genre, world, era, arousal } = params;

  const cleanTitle = (title || 'Untitled').trim();
  const cleanAuthor = (authorName || 'ANONYMOUS').toUpperCase().trim();

  // Extract tone from storyStyle (format: "Tone Genre")
  const tone = (storyStyle || '').split(' ')[0] || 'Earnest';

  // REUSE: Select emotional gravity (canonical system)
  const emotionalGravity = selectEmotionalGravity(tone, dynamic, genre);

  // EMBLEM-SPECIFIC: Select symbolic emblem object
  const emblemObject = selectEmblemObject(emotionalGravity);

  // REUSE: Visual restraint (palette + 2 composition rules)
  const visualRestraint = getVisualRestraintDirectives(emotionalGravity);

  // REUSE: Poetic subtitle
  const poeticSubtitle = generatePoeticSubtitle(genre, emotionalGravity);

  // Build EMBLEM cover prompt — centered, stable, no human presence
  const emblemPrompt = `A prestige literary book cover. Square format. EMBLEM ARCHETYPE.

EMOTIONAL GRAVITY: ${emotionalGravity}
This single emotion must permeate every visual choice. The cover should feel like this word made visible.

EMBLEM (single symbolic object, centered):
${emblemObject}
Render with deliberate lighting—shadow as important as illumination. The emblem occupies the visual center, commanding but restrained. It is the ONLY element. No scene, no environment, no figures.

COMPOSITION: Centered and stable. The emblem floats in controlled negative space. Symmetry is permitted. The symbol carries all meaning.

NO HUMAN PRESENCE: No figures, no silhouettes, no hands, no traces of bodies. Only the emblem.

VISUAL RESTRAINT (mandatory):
${visualRestraint}

TYPOGRAPHY:
Title: "${cleanTitle}" — typeset with weight and presence. The emblem may cast shadow onto letterforms or sit behind them. Typography and emblem share physical space.
Series: "${modeLine}" — very small, quiet, subordinate. Near title or upper edge.
Author: ${cleanAuthor} — bold sans-serif, ALL CAPS, anchoring the bottom edge.

HARD BANS:
- NO roses, flowers, petals, or botanical clichés
- NO envelopes, letters, or correspondence
- NO faces, bodies, silhouettes, or human traces
- NO landscapes, rooms, or environmental elements
- NO multiple objects — emblem only
- NO brown as dominant or default

The cover must feel iconic, weighted with meaning, and utterly still. The emblem is fate made visible.

No gibberish text. No watermarks.`;

  // Phase 3C: Apply World Grammar (visual bias layer)
  const withWorldGrammar = applyWorldGrammar(emblemPrompt, world, era);

  // Phase 3D: Apply Erotic Motif layer (gated by arousal)
  const withEroticMotif = applyEroticMotifLayer(withWorldGrammar, arousal, 'EMBLEM', world);

  // Phase 4A: Composition Safety + Title Balance
  const withSafety = appendCompositionSafety(withEroticMotif, 'EMBLEM');

  // Phase 4B: Material-Integrated Floating Typography
  const withTypography = applyTypographyInteractionLayer(withSafety, world, 'EMBLEM');

  // Phase 3B: Apply universal Storybound border
  return appendStoryboundBorder(withTypography);
}

// ============================================================
// PHASE 3E-A: THRESHOLD ARCHETYPE (ACTIVATED)
// Typography as world — title is physically part of the scene
// Boundary imagery: doors, gates, curtains, cracks, passages
// Light crossing darkness, partial revelation, liminal space
// ============================================================

// Threshold-specific boundary surfaces by emotional gravity
const THRESHOLD_BOUNDARIES = {
  foreboding: [
    'a massive iron door, slightly ajar, darkness beyond',
    'a crack in ancient stone wall, light bleeding through',
    'heavy velvet curtains parted just enough to glimpse what waits',
    'a gate of twisted metal, rust weeping down its bars'
  ],
  pressure: [
    'a doorway too narrow, walls pressing in on either side',
    'a passage where ceiling meets floor in forced perspective',
    'a threshold worn smooth by countless crossings',
    'a gate straining against its hinges'
  ],
  yearning: [
    'a door left open to moonlight, invitation or trap',
    'a curtain stirring in unseen wind, almost revealing',
    'a window frame without glass, sky visible beyond',
    'a garden gate overgrown but still passable'
  ],
  secrecy: [
    'a hidden door, its outline barely visible in the wall',
    'a curtain that should not be there, covering nothing official',
    'a crack in the world, thin as a whisper',
    'a passage that maps do not show'
  ],
  inevitability: [
    'a door that has always been there, waiting',
    'a threshold marked by centuries of crossing',
    'a gate that opens only inward',
    'a passage with no return visible'
  ],
  rebellion: [
    'a door kicked open, splinters still falling',
    'a curtain torn aside, rings scattered',
    'a gate with its lock shattered',
    'a wall with a new opening, edges raw'
  ],
  loss: [
    'an empty doorframe, the door itself gone',
    'a threshold to a room that no longer exists',
    'a gate standing alone in an empty field',
    'a curtain faded to transparency'
  ],
  obsession: [
    'a door with scratches around the handle, desperate marks',
    'a threshold crossed so often the stone is grooved',
    'a gate whose bars have been gripped until polished',
    'a curtain pulled aside then released, again and again'
  ]
};

// Diegetic typography treatments — title is PART of the world
const DIEGETIC_TYPOGRAPHY = [
  'carved deeply into ancient stone, weathered but legible',
  'etched into wood like a ward or binding mark',
  'formed by cracks in the surface, as if the name broke through',
  'woven from spider silk or thread stretched across the threshold',
  'emerging from shadow, letterforms made of absence',
  'burned into the material, edges still darkened',
  'scratched into metal with desperate precision',
  'written in dust or ash, fragile but present',
  'formed by light falling through gaps, shadow-letters',
  'growing from the surface like lichen or frost-writing'
];

// Select threshold boundary based on emotional gravity
function selectThresholdBoundary(emotionalGravity) {
  const pool = THRESHOLD_BOUNDARIES[emotionalGravity] || THRESHOLD_BOUNDARIES.yearning;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Select diegetic typography treatment
function selectDiegeticTypography() {
  return DIEGETIC_TYPOGRAPHY[Math.floor(Math.random() * DIEGETIC_TYPOGRAPHY.length)];
}

// Build THRESHOLD archetype cover prompt
// Typography is a physical, diegetic element — NOT a font overlay
// Boundary imagery, liminal space, crossing/secrecy themes
function buildThresholdCoverPrompt(params) {
  const { title, authorName, modeLine, dynamic, storyStyle, genre, world, era, arousal } = params;

  const cleanTitle = (title || 'Untitled').trim();
  const cleanAuthor = (authorName || 'ANONYMOUS').toUpperCase().trim();

  // Extract tone from storyStyle (format: "Tone Genre")
  const tone = (storyStyle || '').split(' ')[0] || 'Earnest';

  // REUSE: Select emotional gravity (canonical system)
  const emotionalGravity = selectEmotionalGravity(tone, dynamic, genre);

  // THRESHOLD-SPECIFIC: Select boundary surface
  const boundaryElement = selectThresholdBoundary(emotionalGravity);

  // THRESHOLD-SPECIFIC: Select diegetic typography treatment
  const typographyTreatment = selectDiegeticTypography();

  // REUSE: Visual restraint (palette + 2 composition rules)
  const visualRestraint = getVisualRestraintDirectives(emotionalGravity);

  // REUSE: Poetic subtitle
  const poeticSubtitle = generatePoeticSubtitle(genre, emotionalGravity);

  // Build THRESHOLD cover prompt — liminal, typography as world
  const thresholdPrompt = `A prestige literary book cover. Square format. THRESHOLD ARCHETYPE.

EMOTIONAL GRAVITY: ${emotionalGravity}
This single emotion must permeate every visual choice. The cover should feel like this word made visible.

THRESHOLD (boundary/passage as focal element):
${boundaryElement}
Light and shadow divide the composition — one side revealed, one side hidden. The threshold itself is the subject. Something waits beyond, but we see only the boundary.

COMPOSITION: Liminal tension. The viewer stands at the edge of crossing. Partial revelation is mandatory — we glimpse, we do not see fully. The boundary dominates but does not close.

DIEGETIC TYPOGRAPHY (MANDATORY — THIS IS THE POINT):
The title "${cleanTitle}" must be ${typographyTreatment}.
The title is NOT a font overlay. It is a physical object or manifestation within the scene.
The letters participate in the world — they are carved, etched, formed, or grown from material.
Typography and environment share the same reality.

Series: "${modeLine}" — very small, scratched or faded into a surface nearby.
Author: ${cleanAuthor} — small, subordinate, can be etched or carved in a secondary surface.

NO HUMAN PRESENCE: No figures, no silhouettes, no hands, no faces. Only the threshold and what it divides.

VISUAL RESTRAINT (mandatory):
${visualRestraint}

HARD BANS:
- NO roses, flowers, petals, or botanical clichés
- NO envelopes, letters, or correspondence
- NO faces, bodies, silhouettes, or human traces
- NO flat overlay text, clean typographic labels, or floating captions
- NO neutral font treatment — title must be diegetic
- NO brown as dominant or default

The cover must feel liminal, charged with the tension of crossing. The title is not decoration — it is inscription, manifestation, or material fact.

No gibberish text. No watermarks.`;

  // Phase 3C: Apply World Grammar (visual bias layer)
  const withWorldGrammar = applyWorldGrammar(thresholdPrompt, world, era);

  // Phase 3D: Apply Erotic Motif layer (gated by arousal)
  const withEroticMotif = applyEroticMotifLayer(withWorldGrammar, arousal, 'THRESHOLD', world);

  // Phase 4A: Composition Safety + Title Balance (preserves diegetic rules)
  const withSafety = appendCompositionSafety(withEroticMotif, 'THRESHOLD');

  // Phase 4B: Material-Integrated Floating Typography (liminal interaction required for THRESHOLD)
  const withTypography = applyTypographyInteractionLayer(withSafety, world, 'THRESHOLD');

  // Phase 3B: Apply universal Storybound border
  return appendStoryboundBorder(withTypography);
}

// ============================================================
// PHASE 2b/3A/3E-A: ARCHETYPE DISPATCH
// Routes prompt assembly based on archetype value.
// Phase 3A: EMBLEM archetype activated.
// Phase 3E-A: THRESHOLD archetype activated.
// Other archetypes route to canonical wrapBookCoverPrompt().
// ============================================================
function dispatchCoverPrompt(archetype, params) {
  const { prompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentFocalObjects, world, era, arousal } = params;

  // ============================================================
  // PHASE 3A: EMBLEM ARCHETYPE (ACTIVATED)
  // Route to emblem-specific prompt builder
  // To disable: change 'EMBLEM' check to false or remove this block
  // ============================================================
  if (archetype === 'EMBLEM') {
    return buildEmblemCoverPrompt(params);
  }

  // ============================================================
  // PHASE 3E-A: THRESHOLD ARCHETYPE (ACTIVATED)
  // Route to threshold-specific prompt builder (diegetic typography)
  // To disable: comment out this block
  // ============================================================
  if (archetype === 'THRESHOLD') {
    return buildThresholdCoverPrompt(params);
  }

  // ============================================================
  // CANONICAL PATH (DEFAULT)
  // If archetype is null, undefined, or unrecognized, use canonical prompt builder
  // CANONICAL COVER SYSTEM — ACTIVE BY DESIGN
  // The canonical emotional gravity / focal anchor system is preserved.
  // Phase 3C: World and era passed for World Grammar layer
  // Phase 3D: Arousal passed for Erotic Motif layer
  // ============================================================
  return wrapBookCoverPrompt(prompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentFocalObjects, world, era, arousal);
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // imageIntent: 'book_cover' | 'scene_visualize' (default)
  // title, authorName, modeLine: Used for book cover typography
  // dynamic, storyStyle, genre: Story context for symbolic object selection
  // recentFocalObjects: Array of recently used focal objects (for diversity)
  // Phase 2b: archetype, arousal, world, era — structural scaffolding (not yet used)
  // tone: Story tone for Wry Confessional bypass
  const {
    prompt,
    provider,
    size = '1024x1024',
    imageIntent,
    title,
    authorName,
    modeLine,
    dynamic,
    storyStyle,
    genre,
    recentFocalObjects = [],
    // Phase 2b: New params (plumbing only, not yet affecting behavior)
    archetype,
    arousal,
    world,
    era,
    // Minimal Cover v1 quarantine flag
    _minimalV1,
    // Tone for visual ontology server-side bypass
    tone,
    // Tone style lock flag — when true, client has pre-applied tone ontology
    toneStyleLock,
    // Style authority metadata for debugging
    styleAuthority,
    styleExpectedTags
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔒 TONE VISUAL ONTOLOGY BYPASS — Priority over Genre/World styling
  // When toneStyleLock is true OR tone has visual ontology, send prompt DIRECTLY.
  // Skip ALL: wrapScenePrompt, normalization, defaults, post-processing.
  // Tone visual style ALWAYS overrides Genre styling for scene visualization.
  // ═══════════════════════════════════════════════════════════════════

  // Tones with visual ontologies that require server-side bypass
  const TONES_WITH_VISUAL_ONTOLOGY = ['Wry Confessional', 'WryConfession', 'Lurid Confessional', 'Ink Noir', 'Horror'];
  const hasToneOntology = TONES_WITH_VISUAL_ONTOLOGY.includes(tone);

  // DIAGNOSTIC: Log tone, intent, and style authority
  console.log('[IMAGE:DIAG] tone:', tone, '| imageIntent:', imageIntent, '| toneStyleLock:', toneStyleLock, '| styleAuthority:', styleAuthority);

  if ((toneStyleLock || hasToneOntology) && imageIntent !== 'book_cover') {
    console.log(`[IMAGE:TONE] ✓ BYPASS TRIGGERED — tone style lock active (${tone})`);
    console.log('[IMAGE:TONE] styleAuthority:', styleAuthority || 'Tone');
    console.log('[IMAGE:TONE] styleExpectedTags:', styleExpectedTags?.join(', ') || 'N/A');
    console.log('[IMAGE:TONE] Raw prompt (first 250 chars):', prompt.substring(0, 250));

    try {
      const openaiSize = mapToOpenAISize(size, imageIntent);
      const model = 'gpt-image-1'; // Fast model for scene visualization

      const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          prompt: prompt, // RAW prompt — tone ontology already applied client-side
          n: 1,
          size: openaiSize
        })
      });

      const openaiData = await openaiRes.json();

      if (!openaiRes.ok) {
        console.error('[IMAGE:TONE] OpenAI error:', openaiData.error?.message || openaiData);
        return res.status(openaiRes.status).json({
          error: openaiData.error?.message || 'OpenAI API error',
          _toneBypass: true,
          styleAuthority: styleAuthority || 'Tone'
        });
      }

      let imageUrl = openaiData.data?.[0]?.url || null;
      if (!imageUrl && openaiData.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${openaiData.data[0].b64_json}`;
      }

      if (!imageUrl) {
        console.error('[IMAGE:TONE] No image in response');
        return res.status(500).json({ error: 'No image generated', _toneBypass: true });
      }

      console.log(`[IMAGE:TONE] SUCCESS — ${tone} visual style generated`);
      return res.status(200).json({
        url: imageUrl,
        provider: 'OpenAI',
        model,
        intent: imageIntent,
        _toneBypass: true,
        styleAuthority: styleAuthority || 'Tone',
        styleExpectedTags: styleExpectedTags || []
      });

    } catch (err) {
      console.error('[IMAGE:TONE] Error:', err.message);
      return res.status(500).json({ error: err.message, _toneBypass: true });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔴 MINIMAL COVER v1 QUARANTINE — BACKEND BYPASS
  // When _minimalV1 is true, skip ALL enhancement layers
  // Pass prompt directly to OpenAI with no modifications
  // ═══════════════════════════════════════════════════════════════════
  if (_minimalV1) {
    console.log('[IMAGE:v1] MINIMAL COVER v1 — ALL backend enhancement bypassed');
    console.log('[IMAGE:v1] Raw prompt (first 100 chars):', prompt.substring(0, 100));

    // Direct call to OpenAI — no enhancement, no wrapping, no layers
    try {
      const openaiSize = mapToOpenAISize(size, imageIntent);
      const model = 'gpt-image-1'; // Use base model for minimal path

      // DIAGNOSTIC: Confirm request reaches OpenAI
      console.log('[IMAGE:v1] Sending request to OpenAI Images API');

      const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          prompt: prompt, // RAW prompt — no modification
          n: 1,
          size: openaiSize
        })
      });

      // DIAGNOSTIC: Confirm OpenAI responds
      console.log('[IMAGE:v1] OpenAI response status:', openaiRes.status);

      const openaiData = await openaiRes.json();

      // DIAGNOSTIC: Confirm response shape
      console.log('[IMAGE:v1] OpenAI response keys:', Object.keys(openaiData));
      if (openaiData.error) {
        console.log('[IMAGE:v1] OpenAI ERROR:', openaiData.error.message || openaiData.error);
      }

      if (!openaiRes.ok) {
        console.error('[IMAGE:v1] OpenAI error:', openaiData.error?.message || openaiData);
        return res.status(openaiRes.status).json({
          error: openaiData.error?.message || 'OpenAI API error',
          _minimalV1: true,
          diagnostics: {
            requestSent: true,
            openaiStatus: openaiRes.status,
            hasDataArray: Array.isArray(openaiData?.data),
            hasImage: Boolean(openaiData?.data?.[0]),
            hasUrl: Boolean(openaiData?.data?.[0]?.url),
            hasBase64: Boolean(openaiData?.data?.[0]?.b64_json),
            error: openaiData?.error?.message || null
          }
        });
      }

      let imageUrl = openaiData.data?.[0]?.url || null;

      if (!imageUrl && openaiData.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${openaiData.data[0].b64_json}`;
      }

      if (!imageUrl) {
        console.error('[IMAGE:v1] No image in response');
        return res.status(500).json({
          error: 'No image generated',
          _minimalV1: true,
          diagnostics: {
            requestSent: true,
            openaiStatus: openaiRes.status,
            hasDataArray: Array.isArray(openaiData?.data),
            hasImage: Boolean(openaiData?.data?.[0]),
            hasUrl: Boolean(openaiData?.data?.[0]?.url),
            hasBase64: Boolean(openaiData?.data?.[0]?.b64_json),
            error: null
          }
        });
      }

      console.log('[IMAGE:v1] SUCCESS — Image generated');
      return res.status(200).json({
        url: imageUrl,
        provider: 'OpenAI',
        model,
        intent: imageIntent,
        _minimalV1: true,
        diagnostics: {
          requestSent: true,
          openaiStatus: openaiRes.status,
          hasDataArray: Array.isArray(openaiData?.data),
          hasImage: Boolean(openaiData?.data?.[0]),
          hasUrl: Boolean(openaiData?.data?.[0]?.url),
          hasBase64: Boolean(openaiData?.data?.[0]?.b64_json),
          error: null
        }
      });

    } catch (err) {
      console.error('[IMAGE:v1] Error:', err.message);
      return res.status(500).json({
        error: err.message,
        _minimalV1: true,
        diagnostics: {
          requestSent: false,
          openaiStatus: null,
          hasDataArray: false,
          hasImage: false,
          hasUrl: false,
          hasBase64: false,
          error: err.message
        }
      });
    }
  }
  // ═══════════════════════════════════════════════════════════════════
  // LEGACY COVER SYSTEM BELOW — QUARANTINED (does not execute when v1)
  // ═══════════════════════════════════════════════════════════════════

  // Apply intent-specific prompt wrapping
  // Phase 2b: Book covers route through dispatchCoverPrompt (canonical path preserved)
  const isBookCover = imageIntent === 'book_cover';
  const isSetting = imageIntent === 'setting';
  const finalPrompt = isBookCover
    ? dispatchCoverPrompt(archetype, { prompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentFocalObjects, arousal, world, era })
    : wrapScenePrompt(prompt, { tone });

  console.log(`[IMAGE] Intent: ${imageIntent || 'scene_visualize'}, isBookCover: ${isBookCover}, isSetting: ${isSetting}, archetype: ${archetype || 'null (canonical)'}`);

  // ---- INTENT-BASED PROVIDER ROUTING (AUTHORITATIVE) ----
  // setting: Gemini primary → OpenAI fallback
  // scene/cover: OpenAI ONLY (skip Gemini entirely)
  // Gemini may ONLY be used for intent === 'setting'

  // ---- GEMINI PRIMARY (SETTING ONLY) ----
  // Using generateContent API (not predict) for Gemini 2.5 Flash image generation
  // CRITICAL: Gemini is ONLY allowed for setting images
  if (isSetting && (!provider || provider === 'gemini')) {
    try {
      console.log('[IMAGE] Trying Gemini 2.5 Flash via generateContent (setting intent)...');
      const geminiRes = await fetch(
        // Hardcoded model - do not allow frontend override
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `Generate an image: ${finalPrompt}` }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ['image'],
              responseMimeType: 'image/png'
            }
          })
        }
      );

      // Safe JSON parse
      const text = await geminiRes.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[IMAGE] Gemini non-JSON:', text.slice(0, 200));
        data = null;
      }

      if (geminiRes.ok && data) {
        // generateContent response format: candidates[0].content.parts[0].inlineData.data
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Find image part (inlineData with base64)
        const imagePart = parts.find(p => p.inlineData?.data);
        const base64 = imagePart?.inlineData?.data;

        // Legacy format support
        const legacyBase64 = data.predictions?.[0]?.bytesBase64Encoded;
        const uri = data.predictions?.[0]?.image_uri || data.generated_images?.[0]?.image_uri;

        if (base64) {
          console.log('[IMAGE] Gemini success (generateContent base64)');
          const mimeType = imagePart?.inlineData?.mimeType || 'image/png';
          return res.json({ url: `data:${mimeType};base64,${base64}`, provider: 'Gemini', intent: imageIntent });
        }
        if (legacyBase64) {
          console.log('[IMAGE] Gemini success (legacy base64)');
          return res.json({ url: `data:image/png;base64,${legacyBase64}`, provider: 'Gemini', intent: imageIntent });
        }
        if (uri) {
          console.log('[IMAGE] Gemini success (uri)');
          return res.json({ url: uri, provider: 'Gemini', intent: imageIntent });
        }
      }
      // Gemini failed - fall through to OpenAI (no retries, no user-visible error)
      console.log('[IMAGE] Gemini failed, falling back to OpenAI:', data?.error?.message || 'no image in response');
    } catch (err) {
      // Gemini error - fall through to OpenAI silently
      console.error('[IMAGE] Gemini error, falling back to OpenAI:', err.message);
    }
  }

  // ---- OPENAI FALLBACK ----
  try {
    // Intent-based model and size selection (backend enforced)
    const openaiModel = getOpenAIModel(imageIntent);
    const openaiSize = mapToOpenAISize(size, imageIntent);

    console.log(`[IMAGE] Trying OpenAI ${openaiModel} at ${openaiSize}...`);

    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: openaiModel,   // Backend-enforced based on intent
        prompt: finalPrompt,
        size: openaiSize,     // Mapped to valid OpenAI size
        n: 1
      })
    });

    // Safe JSON parse
    const text = await openaiRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[IMAGE] OpenAI non-JSON:', text.slice(0, 200));
      data = null;
    }

    if (openaiRes.ok && data) {
      const url = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (url) {
        console.log(`[IMAGE] OpenAI success (url) via ${openaiModel}`);
        return res.json({ url, provider: 'OpenAI', model: openaiModel, intent: imageIntent });
      }
      if (b64) {
        console.log(`[IMAGE] OpenAI success (b64) via ${openaiModel}`);
        return res.json({ url: `data:image/png;base64,${b64}`, provider: 'OpenAI', model: openaiModel, intent: imageIntent });
      }
    }
    console.log('[IMAGE] OpenAI failed:', data?.error?.message || 'no image');
  } catch (err) {
    console.error('[IMAGE] OpenAI error:', err.message);
  }

  // All providers failed
  console.error('[IMAGE] All providers failed');
  return res.status(502).json({ error: 'Image generation failed' });
}
