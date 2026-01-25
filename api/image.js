export const runtime = 'nodejs';

export const config = {
  maxDuration: 60
};

// ============================================================
// SIZE MAPPING - Normalize to OpenAI-supported dimensions
// ============================================================
function mapToOpenAISize(size, imageIntent) {
  // Book covers are always square for best typography composition
  if (imageIntent === 'book_cover') return '1024x1024';

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

function wrapBookCoverPrompt(basePrompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentObjects = []) {
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
  const basePrompt = `A prestige literary book cover. Square format.

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
Series: "Storybound Book I: ${poeticSubtitle}" — very small, quiet, subordinate. Near title or upper edge.
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

  // Phase 3B: Apply universal Storybound border
  return appendStoryboundBorder(basePrompt);
}

function wrapScenePrompt(basePrompt) {
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

// World Grammar Rules — world-specific visual constraints
// Phase 2b: Empty placeholder, not yet populated
const WORLD_GRAMMAR_RULES = {
  // Will contain: world (+ era) -> palette, texture, period markers
};

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
  const { title, authorName, dynamic, storyStyle, genre } = params;

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
  const basePrompt = `A prestige literary book cover. Square format. EMBLEM ARCHETYPE.

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
Series: "Storybound Book I: ${poeticSubtitle}" — very small, quiet, subordinate. Near title or upper edge.
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

  // Phase 3B: Apply universal Storybound border
  return appendStoryboundBorder(basePrompt);
}

// ============================================================
// PHASE 2b/3A: ARCHETYPE DISPATCH
// Routes prompt assembly based on archetype value.
// Phase 3A: EMBLEM archetype activated.
// Other archetypes route to canonical wrapBookCoverPrompt().
// ============================================================
function dispatchCoverPrompt(archetype, params) {
  const { prompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentFocalObjects } = params;

  // ============================================================
  // PHASE 3A: EMBLEM ARCHETYPE (ACTIVATED)
  // Route to emblem-specific prompt builder
  // To disable: change 'EMBLEM' check to false or remove this block
  // ============================================================
  if (archetype === 'EMBLEM') {
    return buildEmblemCoverPrompt(params);
  }

  // ============================================================
  // CANONICAL PATH (DEFAULT)
  // If archetype is null, undefined, or unrecognized, use canonical prompt builder
  // CANONICAL COVER SYSTEM — ACTIVE BY DESIGN
  // The canonical emotional gravity / focal anchor system is preserved.
  // ============================================================
  return wrapBookCoverPrompt(prompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentFocalObjects);
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    era
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Apply intent-specific prompt wrapping
  // Phase 2b: Book covers route through dispatchCoverPrompt (canonical path preserved)
  const isBookCover = imageIntent === 'book_cover';
  const isSetting = imageIntent === 'setting';
  const finalPrompt = isBookCover
    ? dispatchCoverPrompt(archetype, { prompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentFocalObjects, arousal, world, era })
    : wrapScenePrompt(prompt);

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
