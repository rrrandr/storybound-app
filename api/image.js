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
// COVER DIVERSITY ENFORCEMENT (CRITICAL)
// Prevents visual convergence on dead roses, brown palettes, art deco
// ============================================================

// BANNED focal objects - never use these as fallbacks
const BANNED_FOCAL_OBJECTS = [
  'rose', 'roses', 'envelope', 'envelopes', 'letter', 'letters',
  'book', 'books', 'glassware', 'wine glass', 'champagne', 'goblet',
  'chalice', 'dead flower', 'wilting flower', 'dried flower'
];

// ABSENCE-BASED FALLBACKS - when no strong object exists
// Prefer shadow, absence, silhouette, fracture over cliché objects
const ABSENCE_FALLBACKS = [
  'a human silhouette dissolving into mist at the edges',
  'an empty chair with a single shaft of light across it',
  'a fractured mirror reflecting nothing but void',
  'the shadow of an absent figure across a threshold',
  'a doorway leading into pure darkness',
  'torn fabric floating in empty space',
  'a hand-shaped impression in disturbed dust',
  'the negative space where something was removed',
  'a crack running through marble, revealing darkness beneath',
  'smoke frozen mid-dissipation, no source visible'
];

// Normalize object text for comparison
function normalizeObjectText(text) {
  return (text || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
}

// Check if object is banned
function isBannedObject(objectText) {
  const normalized = normalizeObjectText(objectText);
  return BANNED_FOCAL_OBJECTS.some(banned => normalized.includes(banned));
}

// Symbolic object selection with diversity enforcement
function selectSymbolicObject(genre, storyStyle, dynamic, recentObjects = []) {
  const genreLower = (genre || '').toLowerCase();
  const styleLower = (storyStyle || '').toLowerCase();
  const dynamicLower = (dynamic || '').toLowerCase();

  // Genre-based object pools - REFRESHED to avoid clichés
  const objects = {
    contemporary: ['a silk blindfold knotted loosely', 'a cracked smartphone screen showing unread messages', 'car keys on marble', 'a designer heel with a broken strap', 'a smudged lipstick tube', 'a hotel keycard beside scattered pills'],
    fantasy: ['a crown half-buried in ash', 'a blade with a serpent hilt', 'an ancient coin bearing an unknown face', 'a crystalline tear frozen mid-fall', 'chains made of solidified starlight'],
    romantasy: ['a crown pierced by thorns', 'a dagger dripping with honey', 'a rune-marked apple bitten once', 'wings folded around an empty throne'],
    historical: ['opera gloves with torn fingertips', 'a pocket watch stopped at an intimate hour', 'a dance card with one name scratched out', 'a mourning brooch containing hair'],
    paranormal: ['a crescent moon reflected in spilled ink', 'a fang embedded in velvet', 'a spirit flame hovering above an open palm', 'bones arranged in a love pattern'],
    dark: ['shattered handcuffs on concrete', 'a leather mask cast aside', 'a blade still warm from use', 'a collar with a broken chain'],
    scifi: ['a cracked visor reflecting stars', 'a neural implant trailing wires', 'two pilots' dog tags tangled together', 'a stasis pod with frost-traced handprints'],
    gothic: ['an iron key bleeding rust', 'a raven skull on white lace', 'a candle flame burning black', 'a mourning veil caught on thorns'],
    suspense: ['a burner phone with one unread text', 'a gun beside a wedding ring', 'a bloody thumbprint on glass', 'a briefcase left open and empty'],
    crime: ['a signet ring in a pool of blood', 'scattered diamonds on leather', 'a knife clean on one side only', 'a passport with a corner torn off']
  };

  // Find matching genre
  let pool = objects.contemporary; // default
  for (const [key, items] of Object.entries(objects)) {
    if (genreLower.includes(key) || styleLower.includes(key)) {
      pool = items;
      break;
    }
  }

  // Normalize recent objects for comparison
  const recentNormalized = recentObjects.map(normalizeObjectText);

  // Filter pool to exclude recently used objects (last 5)
  const availablePool = pool.filter(obj => {
    const objNormalized = normalizeObjectText(obj);
    // Exclude if similar to any recent object
    return !recentNormalized.some(recent => {
      // Check for keyword overlap
      const recentWords = recent.split(/\s+/);
      const objWords = objNormalized.split(/\s+/);
      return recentWords.some(word => word.length > 3 && objWords.includes(word));
    });
  });

  // If pool is exhausted, use absence fallbacks
  if (availablePool.length === 0) {
    return ABSENCE_FALLBACKS[Math.floor(Math.random() * ABSENCE_FALLBACKS.length)];
  }

  // Select from available pool
  let selectedObject;
  if (dynamicLower.includes('forbidden') || dynamicLower.includes('enemy')) {
    selectedObject = availablePool[Math.floor(Math.random() * Math.min(2, availablePool.length))];
  } else {
    selectedObject = availablePool[Math.floor(Math.random() * availablePool.length)];
  }

  // Final safety check - if somehow banned, use absence
  if (isBannedObject(selectedObject)) {
    return ABSENCE_FALLBACKS[Math.floor(Math.random() * ABSENCE_FALLBACKS.length)];
  }

  return selectedObject;
}

// ============================================================
// TONE-AWARE COVER STYLE MAPPING (UPDATED)
// ============================================================
// Art Deco is now RESTRICTED - only allowed for specific genres
// Brown/sepia palettes are OPT-IN only, not default

// Genres that justify Art Deco backgrounds
const ART_DECO_JUSTIFIED_GENRES = ['historical', 'gatsby', '1920s', '1930s', 'noir', 'crime', 'jazz age'];

// Check if Art Deco is justified by genre
function isArtDecoJustified(genre) {
  const genreLower = (genre || '').toLowerCase();
  return ART_DECO_JUSTIFIED_GENRES.some(g => genreLower.includes(g));
}

// Get alternative background styles (non-Art Deco)
function getAlternativeTexture(tone) {
  const toneLower = (tone || '').toLowerCase();

  if (toneLower.includes('satirical') || toneLower.includes('comedic')) {
    return 'bold color blocking, pop art influences, or clean minimalist gradients';
  }
  if (toneLower.includes('dark') || toneLower.includes('horror')) {
    return 'deep atmospheric gradients, smoke textures, or fractured marble patterns';
  }
  if (toneLower.includes('mythic') || toneLower.includes('fantasy')) {
    return 'celestial gradients, constellation patterns, or otherworldly luminescence';
  }
  // Default: elegant but not Art Deco
  return 'subtle texture gradients, soft fabric-like patterns, or watercolor washes';
}

function getToneCoverStyle(tone, genre) {
  const toneLower = (tone || '').toLowerCase();
  const artDecoAllowed = isArtDecoJustified(genre);

  // SATIRICAL / COMEDIC: Lighter, playful, NOT erotic/breathless
  if (toneLower.includes('satirical') || toneLower.includes('comedic') || toneLower.includes('wry')) {
    return {
      visualWeight: 'lighter visual weight, airy composition',
      mood: 'playful and whimsical tone, clever and witty',
      typography: 'clean sans-serif or simple hand-lettered typography with personality',
      elements: 'illustrative elements allowed (stylized motifs, caricature touches, bold shapes)',
      texture: artDecoAllowed
        ? 'subtle Art Nouveau inspired organic curves and decorative borders'
        : getAlternativeTexture(tone),
      colorDirective: 'Vibrant, saturated colors. NO brown, sepia, or muted earth tones.',
      forbidden: 'Must NOT feel breathless, erotic, or overly romantic. No heavy shadows. NO brown/sepia palettes.'
    };
  }

  // EARNEST / POETIC / MYTHIC: Elegant, decorative, romantic but restrained
  if (toneLower.includes('earnest') || toneLower.includes('poetic') || toneLower.includes('mythic')) {
    return {
      visualWeight: 'balanced composition with elegant negative space',
      mood: 'romantic but restrained, timeless elegance',
      typography: 'elegant serif with dimensional presence',
      elements: 'decorative linework, flourishes, and ornamental details',
      texture: artDecoAllowed
        ? 'Art Deco geometric patterns or Art Nouveau organic linework'
        : getAlternativeTexture(tone),
      colorDirective: 'Rich jewel tones, deep blues, emeralds, or silver/gold metallics. Avoid defaulting to brown.',
      forbidden: 'Never flat or blank. NO default brown/sepia - only if explicitly warranted by era.'
    };
  }

  // DARK / HORROR: Heavy contrast, ominous, no playfulness
  if (toneLower.includes('dark') || toneLower.includes('horror')) {
    return {
      visualWeight: 'heavier contrast, dramatic chiaroscuro lighting',
      mood: 'ominous atmosphere, foreboding tension',
      typography: 'bold dramatic serif or gothic-inspired letterforms with weight and presence',
      elements: 'ominous patterning, heavy shadows, sharp edges',
      texture: artDecoAllowed
        ? 'intricate dark Art Deco patterns or thorned Art Nouveau linework'
        : 'deep blacks, crimson accents, fractured textures, or smoke gradients',
      colorDirective: 'Deep blacks, blood reds, midnight blues. Silver over gold. NO warm brown tones.',
      forbidden: 'No playful elements, no whimsy, no lightness. NO sepia or nostalgic warmth.'
    };
  }

  // Default (Earnest-like)
  return {
    visualWeight: 'balanced composition with elegant negative space',
    mood: 'evocative atmosphere, literary presence',
    typography: 'elegant display typography with dimensional presence',
    elements: 'decorative linework and ornamental flourishes',
    texture: artDecoAllowed
      ? 'Art Deco inspired geometric patterns or Art Nouveau organic curves'
      : getAlternativeTexture(tone),
    colorDirective: 'Cool or jewel tones preferred. Brown/sepia only if historical 1920s-1940s.',
    forbidden: 'Never flat white or blank. Must have visual texture. NO default to brown palettes.'
  };
}

// ============================================================
// POETIC SUBTITLE GENERATOR (PART C)
// Converts genre + tone into evocative phrases, not labels
// ============================================================

function generatePoeticSubtitle(genre, tone) {
  const genreLower = (genre || '').toLowerCase();
  const toneLower = (tone || '').toLowerCase();

  // Poetic templates organized by genre family
  const subtitleTemplates = {
    scifi: [
      'A Voyage Beyond the Known',
      'Where Stars Dare Not Follow',
      'An Odyssey in the Void',
      'A Tale Etched in Starlight',
      'Beyond the Edge of Forever'
    ],
    fantasy: [
      'A Tale of Crowns and Shadows',
      'Where Magic Bleeds True',
      'An Enchantment Unbound',
      'A Legend Reawakened',
      'Where Ancient Powers Stir'
    ],
    romantasy: [
      'A Love Forged in Firelight',
      'Where Hearts and Kingdoms Collide',
      'A Passion Woven in Myth',
      'An Enchantment of the Heart',
      'Where Desire Meets Destiny'
    ],
    contemporary: [
      'A Modern Entanglement',
      'Where Desire Finds Its Edge',
      'An Affair of Consequence',
      'A Dance of Wanting',
      'Where Boundaries Dissolve'
    ],
    historical: [
      'A Scandal of the Age',
      'Where Propriety Meets Passion',
      'An Arrangement Most Dangerous',
      'A Secret of the Season',
      'Where Honor Bends to Heart'
    ],
    paranormal: [
      'A Darkness That Yearns',
      'Where Shadows Take Form',
      'An Immortal Reckoning',
      'A Haunting of the Heart',
      'Where the Veil Grows Thin'
    ],
    dark: [
      'A Descent into Wanting',
      'Where Pain Becomes Pleasure',
      'An Obsession Unspoken',
      'A Corruption of the Soul',
      'Where Mercy Finds No Purchase'
    ],
    gothic: [
      'A Manor of Secrets',
      'Where Beauty Hides the Blade',
      'An Inheritance of Shadows',
      'A Whisper from the Crypt',
      'Where the Dead Still Long'
    ],
    suspense: [
      'A Game of Dangerous Wants',
      'Where Trust Becomes Weapon',
      'An Alibi for Desire',
      'A Betrayal in Waiting',
      'Where Every Kiss Is Calculated'
    ],
    crime: [
      'A Deal Sealed in Blood',
      'Where Power Takes What It Wants',
      'An Empire of Desire',
      'A Debt That Cannot Be Paid',
      'Where Loyalty Is Currency'
    ],
    mythic: [
      'A Myth Woven in Flesh',
      'Where Gods Once Loved',
      'An Echo of Divine Flame',
      'A Legend in the Making',
      'Where Fate Writes in Fire'
    ]
  };

  // Find matching genre pool
  let pool = subtitleTemplates.contemporary; // default
  for (const [key, templates] of Object.entries(subtitleTemplates)) {
    if (genreLower.includes(key)) {
      pool = templates;
      break;
    }
  }

  // Tone-influenced selection (darker tones get later/edgier entries)
  let index = Math.floor(Math.random() * pool.length);
  if (toneLower.includes('dark') || toneLower.includes('horror')) {
    index = Math.min(pool.length - 1, Math.floor(Math.random() * 2) + 3); // Prefer edgier
  } else if (toneLower.includes('satirical') || toneLower.includes('comedic')) {
    index = Math.floor(Math.random() * 2); // Prefer lighter
  }

  return pool[index];
}

function wrapBookCoverPrompt(basePrompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentObjects = []) {
  // Select symbolic object with diversity enforcement
  const symbolicObject = selectSymbolicObject(genre, storyStyle, dynamic, recentObjects);
  const cleanTitle = (title || 'Untitled').trim();
  const cleanAuthor = (authorName || 'ANONYMOUS').toUpperCase().trim();

  // Extract tone from storyStyle (format: "Tone Genre")
  const tone = (storyStyle || '').split(' ')[0] || 'Earnest';

  // Generate poetic subtitle instead of label
  const poeticSubtitle = generatePoeticSubtitle(genre, tone);

  // Get tone style with genre awareness for Art Deco restrictions
  const toneStyle = getToneCoverStyle(tone, genre);

  // Determine background style directive
  const artDecoAllowed = isArtDecoJustified(genre);
  const backgroundDirective = artDecoAllowed
    ? 'Style inspiration: Art Deco geometric precision OR Art Nouveau organic linework (choose one, commit fully).'
    : 'Style inspiration: Modern literary aesthetic. NO Art Deco patterns unless explicitly warranted by 1920s-1940s setting.';

  // Build tone-aware prestige book cover prompt
  return `A prestige book cover design, square format, ${toneStyle.visualWeight}.

MANDATORY: The cover MUST include decorative texture or pattern - never flat white or blank backgrounds.
${backgroundDirective}
Background treatment: ${toneStyle.texture}
${toneStyle.colorDirective}

Central focus: ${symbolicObject}, rendered with controlled dramatic lighting, depth, and shadow. The object occupies the visual center, elegant and evocative.

Title typography: "${cleanTitle}" using ${toneStyle.typography}. The letterforms have dimensional presence. The symbolic object physically interacts with the title - either passing behind certain letters, casting realistic shadows onto the text, or threading through the letterforms. The title and object share the same physical space.

Series line: "Storybound Book I: ${poeticSubtitle}" in very small, quiet type near the top or just beneath the title. Secondary and restrained.

Author credit: ${cleanAuthor} in bold modern sans-serif, ALL CAPS, placed across the bottom of the cover as a visual anchor. Clean and grounded.

Cover mood: ${toneStyle.mood}. ${toneStyle.elements}. Color palette and lighting evoke ${genre || 'contemporary'} ${dynamic || 'romantic tension'} atmosphere.

${toneStyle.forbidden}

No characters, no faces, no bodies, no clutter. Single cohesive composition suitable for a modern literary bookshelf. No gibberish text, no watermarks.`;
}

function wrapScenePrompt(basePrompt) {
  // Scene visualization: Atmosphere, characters, environment - NO text
  return `${basePrompt}

Style: Cinematic illustration, atmospheric lighting, painterly.
DO NOT include any visible text, captions, titles, logos, or watermarks.`;
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
    recentFocalObjects = []
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Apply intent-specific prompt wrapping
  const isBookCover = imageIntent === 'book_cover';
  const isSetting = imageIntent === 'setting';
  const finalPrompt = isBookCover
    ? wrapBookCoverPrompt(prompt, title, authorName, modeLine, dynamic, storyStyle, genre, recentFocalObjects)
    : wrapScenePrompt(prompt);

  console.log(`[IMAGE] Intent: ${imageIntent || 'scene_visualize'}, isBookCover: ${isBookCover}, isSetting: ${isSetting}`);

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
