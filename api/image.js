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
// WORLD-AWARE SYMBOLIC OBJECT SELECTION (LOCKED)
// ============================================================
// Objects MUST belong to the story world. No modern items in fantasy.
// Track recent covers to avoid repetition.

let recentCoverObjects = [];
const MAX_RECENT_OBJECTS = 5;

function selectSymbolicObject(genre, storyStyle, dynamic, world) {
  const genreLower = (genre || '').toLowerCase();
  const styleLower = (storyStyle || '').toLowerCase();
  const dynamicLower = (dynamic || '').toLowerCase();
  const worldLower = (world || 'modern').toLowerCase();

  // WORLD-FIRST object pools - objects MUST belong to the world
  const worldObjects = {
    fantasy: [
      'a golden crown with a missing jewel', 'a thorned vine wrapped around a blade',
      'an ancient ring on velvet', 'a cracked crystal orb', 'a burning scroll',
      'a dragon scale pendant', 'a enchanted feather quill', 'a runic amulet',
      'a shattered magical mirror', 'an elven dagger on moonlit silk'
    ],
    scifi: [
      'a cracked helmet visor', 'a holographic pendant flickering',
      'circuitry intertwined with organic matter', 'a plasma-scorched insignia',
      'a data crystal pulsing with light', 'a mechanical heart exposed',
      'a star map etched in metal', 'a neural interface crown'
    ],
    historical: [
      'a wax-sealed letter', 'a pearl necklace on dark velvet',
      'opera gloves draped over a chair', 'a pocket watch frozen at midnight',
      'a cameo brooch on aged lace', 'a cavalry sword hilt',
      'a brass compass on parchment', 'a quill pen and inkwell'
    ],
    modern: [
      'a silk ribbon', 'an unsealed envelope', 'a shattered wine glass',
      'a wilting rose', 'a hotel key card', 'a lipstick mark on glass',
      'a broken phone screen', 'a gun beside a wedding ring',
      'a photograph torn in half', 'a signet ring on black leather'
    ],
    mythic: [
      'a golden apple on marble', 'a laurel wreath with thorns',
      'a thunderbolt frozen in crystal', 'a trident emerging from waves',
      'an olive branch wrapped in silk', 'a lyre with broken strings'
    ],
    paranormal: [
      'a crescent moon pendant', 'a broken mirror reflecting darkness',
      'a single black feather', 'a vial of crimson liquid',
      'a raven feather on lace', 'a candle guttering in darkness'
    ]
  };

  // Select pool based on world FIRST, then genre
  let pool = worldObjects.modern; // default

  // World takes priority
  for (const [key, items] of Object.entries(worldObjects)) {
    if (worldLower.includes(key)) {
      pool = items;
      break;
    }
  }

  // Fantasy/SciFi override if detected in genre/style
  if (genreLower.includes('fantasy') || styleLower.includes('fantasy') || genreLower.includes('romantasy')) {
    pool = worldObjects.fantasy;
  } else if (genreLower.includes('scifi') || genreLower.includes('sci-fi') || styleLower.includes('scifi')) {
    pool = worldObjects.scifi;
  } else if (genreLower.includes('paranormal') || styleLower.includes('paranormal')) {
    pool = worldObjects.paranormal;
  }

  // Filter out recently used objects
  const availablePool = pool.filter(obj => !recentCoverObjects.includes(obj));
  const finalPool = availablePool.length > 0 ? availablePool : pool;

  // Select based on dynamic mood
  let selected;
  if (dynamicLower.includes('forbidden') || dynamicLower.includes('enemy')) {
    selected = finalPool[Math.floor(Math.random() * Math.min(3, finalPool.length))];
  } else {
    selected = finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  // Track for non-repetition
  recentCoverObjects.push(selected);
  if (recentCoverObjects.length > MAX_RECENT_OBJECTS) {
    recentCoverObjects.shift();
  }

  return selected;
}

// ============================================================
// TONE-AWARE COVER STYLE MAPPING (LOCKED)
// ============================================================
// Covers MUST include decorative texture/pattern and Art Deco/Nouveau linework
// Tone determines visual weight, typography, and mood

function getToneCoverStyle(tone) {
  const toneLower = (tone || '').toLowerCase();

  // SATIRICAL / COMEDIC: Lighter, playful, NOT erotic/breathless
  if (toneLower.includes('satirical') || toneLower.includes('comedic') || toneLower.includes('wry')) {
    return {
      visualWeight: 'lighter visual weight, airy composition',
      mood: 'playful and whimsical tone, clever and witty',
      typography: 'clean sans-serif or simple hand-lettered typography with personality',
      elements: 'illustrative elements allowed (stylized motifs, caricature touches, cave-drawing simplicity)',
      texture: 'subtle Art Nouveau inspired organic curves and decorative borders',
      forbidden: 'Must NOT feel breathless, erotic, or overly romantic. No heavy shadows.'
    };
  }

  // EARNEST / POETIC / MYTHIC: Elegant, decorative, romantic but restrained
  if (toneLower.includes('earnest') || toneLower.includes('poetic') || toneLower.includes('mythic')) {
    return {
      visualWeight: 'balanced composition with elegant negative space',
      mood: 'romantic but restrained, timeless elegance',
      typography: 'elegant serif or Art Deco inspired display typography with dimensional presence',
      elements: 'decorative linework, flourishes, and ornamental details',
      texture: 'Art Deco geometric patterns or Art Nouveau organic linework as background texture',
      forbidden: 'Never flat or blank. Decorative elements must enhance, not overwhelm.'
    };
  }

  // DARK / HORROR: Heavy contrast, ominous, no playfulness
  if (toneLower.includes('dark') || toneLower.includes('horror')) {
    return {
      visualWeight: 'heavier contrast, dramatic chiaroscuro lighting',
      mood: 'ominous atmosphere, foreboding tension',
      typography: 'bold dramatic serif or gothic-inspired letterforms with weight and presence',
      elements: 'ominous patterning, sharp geometric Art Deco motifs, heavy shadows',
      texture: 'intricate dark Art Deco patterns or thorned Art Nouveau linework',
      forbidden: 'No playful elements, no whimsy, no lightness. Must feel serious and weighted.'
    };
  }

  // Default (Earnest-like)
  return {
    visualWeight: 'balanced composition with elegant negative space',
    mood: 'evocative atmosphere, literary presence',
    typography: 'elegant display typography with dimensional presence',
    elements: 'decorative linework and ornamental flourishes',
    texture: 'Art Deco inspired geometric patterns or Art Nouveau organic curves',
    forbidden: 'Never flat white or blank. Must have visual texture.'
  };
}

function wrapBookCoverPrompt(basePrompt, title, authorName, modeLine, dynamic, storyStyle, genre, world) {
  // Select symbolic object based on context - world-aware
  const symbolicObject = selectSymbolicObject(genre, storyStyle, dynamic, world);
  const cleanTitle = (title || 'Untitled').trim();
  const cleanAuthor = (authorName || 'ANONYMOUS').toUpperCase().trim();
  const cleanMode = modeLine || 'A Novel';

  // Extract tone from storyStyle (format: "Tone Genre")
  const tone = (storyStyle || '').split(' ')[0] || 'Earnest';
  const toneStyle = getToneCoverStyle(tone);
  const worldLower = (world || 'modern').toLowerCase();

  // WORLD-AWARE COLOR PALETTE - varies per world
  const worldPalettes = {
    fantasy: 'deep purples, burnished gold, forest greens, mystical blues',
    scifi: 'electric blues, chrome silver, neon accents, void black',
    historical: 'sepia tones, aged cream, burgundy, antique gold',
    modern: 'sophisticated blacks, clean whites, accent reds, urban grays',
    mythic: 'celestial golds, divine whites, deep ocean blues, marble textures'
  };
  let colorPalette = worldPalettes.modern;
  for (const [key, palette] of Object.entries(worldPalettes)) {
    if (worldLower.includes(key)) {
      colorPalette = palette;
      break;
    }
  }

  // HARD CONSTRAINTS for world-appropriate covers
  const worldConstraints = getWorldCoverConstraints(world);

  // Build tone-aware prestige book cover prompt
  return `A prestige book cover design, square format, ${toneStyle.visualWeight}.

MANDATORY: The cover MUST include decorative texture or pattern - never flat white or blank backgrounds.
Style inspiration: Art Deco geometric precision OR Art Nouveau organic linework (choose one, commit fully).
Background treatment: ${toneStyle.texture}

WORLD: ${world || 'Modern'} setting.
${worldConstraints}

Central focus: ${symbolicObject}, rendered with controlled dramatic lighting, depth, and shadow. The object occupies the visual center, elegant and evocative.

Color palette: ${colorPalette}. Must feel distinct from other covers.

Title typography: "${cleanTitle}" using ${toneStyle.typography}. The letterforms have dimensional presence. The symbolic object physically interacts with the title - either passing behind certain letters, casting realistic shadows onto the text, or threading through the letterforms. The title and object share the same physical space.

Series line: "Storybound Book I – ${cleanMode}" in very small, quiet type near the top or just beneath the title. Secondary and restrained.

Author credit: ${cleanAuthor} in bold modern sans-serif, ALL CAPS, placed across the bottom of the cover as a visual anchor. Clean and grounded.

Cover mood: ${toneStyle.mood}. ${toneStyle.elements}.

${toneStyle.forbidden}

No characters, no faces, no bodies, no clutter. Single cohesive composition suitable for a modern literary bookshelf. No gibberish text, no watermarks.`;
}

// WORLD-SPECIFIC COVER CONSTRAINTS (LOCKED)
function getWorldCoverConstraints(world) {
  const worldLower = (world || 'modern').toLowerCase();

  if (worldLower.includes('fantasy') || worldLower.includes('romantasy')) {
    return `FORBIDDEN in Fantasy: smartphones, modern cars, contemporary clothing, skyscrapers, electricity, plastic, digital screens.
REQUIRED: Medieval or magical aesthetics only. Objects must feel handcrafted or enchanted.`;
  }

  if (worldLower.includes('scifi') || worldLower.includes('sci-fi')) {
    return `FORBIDDEN in Sci-Fi: dead roses, wax-sealed letters, medieval weapons, horses, candles, quill pens.
REQUIRED: Futuristic or technological aesthetics. Objects should feel advanced, synthetic, or alien.`;
  }

  if (worldLower.includes('historical')) {
    return `FORBIDDEN in Historical: smartphones, modern technology, plastic, neon lights, contemporary fashion.
REQUIRED: Period-appropriate objects only. Craftsmanship and materials of the era.`;
  }

  if (worldLower.includes('mythic')) {
    return `FORBIDDEN in Mythic: modern mundane objects, technology, contemporary items.
REQUIRED: Classical or divine aesthetics. Objects should feel timeless, symbolic, legendary.`;
  }

  // Modern - no special constraints but avoid fantasy/historical objects
  return `REQUIRED: Contemporary aesthetics. Objects should feel current, urban, or sophisticated.
AVOID: Medieval weapons, magical items, ancient artifacts unless story-justified.`;
}

// ============================================================
// WORLD-AWARE SCENE PROMPTER (LOCKED)
// ============================================================
// Scenes MUST reflect the story world, not generic noir realism.
// Faces ARE allowed unless intensity forbids.
// Mood follows world + tone, NOT defaulting to dark/dreary.

function wrapScenePrompt(basePrompt, world, tone, intensity) {
  const worldLower = (world || 'modern').toLowerCase();
  const toneLower = (tone || 'earnest').toLowerCase();
  const intensityLower = (intensity || 'naughty').toLowerCase();

  // WORLD-SPECIFIC ENVIRONMENTAL CUES
  const worldEnvironments = {
    fantasy: 'medieval architecture, enchanted forests, castle halls, magical lighting, handcrafted clothing, leather and linen fabrics',
    scifi: 'sleek corridors, holographic displays, synthetic materials, neon accents, futuristic fashion, chrome and glass',
    historical: 'period-accurate interiors, candlelit rooms, ornate furnishings, era-appropriate clothing, natural materials',
    modern: 'contemporary settings, urban environments, modern fashion, clean lines, natural or artificial lighting',
    mythic: 'classical architecture, divine light, marble and gold, flowing robes, timeless elegance'
  };

  let envCues = worldEnvironments.modern;
  for (const [key, cues] of Object.entries(worldEnvironments)) {
    if (worldLower.includes(key)) {
      envCues = cues;
      break;
    }
  }

  // MOOD DERIVATION from tone - NOT defaulting to dark
  const moodMapping = {
    earnest: 'warm natural lighting, sincere atmosphere, emotional depth',
    poetic: 'soft diffused light, romantic atmosphere, lyrical beauty',
    mythic: 'dramatic divine lighting, epic grandeur, legendary presence',
    comedic: 'bright cheerful lighting, playful atmosphere, light-hearted',
    wryconfession: 'intimate soft lighting, confessional mood, honest vulnerability',
    dark: 'dramatic shadows, tension, ominous undertones',
    satirical: 'clear bright lighting, slightly exaggerated, witty tone'
  };

  let mood = moodMapping.earnest;
  for (const [key, m] of Object.entries(moodMapping)) {
    if (toneLower.includes(key)) {
      mood = m;
      break;
    }
  }

  // CHARACTER VISIBILITY RULES
  // Faces ARE allowed by default
  // Only restrict if intensity is "Brink-of-Sex" or explicit concealment needed
  let faceRules = 'Faces may be visible. Expressions should reflect emotion naturally, not glamour posing. Eye contact is allowed.';
  if (intensityLower === 'dirty' || intensityLower === 'brink-of-sex') {
    faceRules = 'Faces may be partially obscured or in soft focus. Emphasis on body language over facial detail.';
  }

  // WORLD-SPECIFIC CLOTHING RULES
  const clothingRules = {
    fantasy: 'Characters wear medieval-inspired or fantastical attire: tunics, cloaks, leather armor, flowing gowns. NO modern dresses, suits, or contemporary fashion.',
    scifi: 'Characters wear futuristic attire: jumpsuits, synthetic fabrics, tech-integrated clothing. NO medieval or historical clothing.',
    historical: 'Characters wear period-accurate clothing for the era. NO modern items whatsoever.',
    modern: 'Characters wear contemporary fashion appropriate to the scene.',
    mythic: 'Characters wear classical robes, draped fabrics, divine attire. NO modern clothing.'
  };

  let clothing = clothingRules.modern;
  for (const [key, c] of Object.entries(clothingRules)) {
    if (worldLower.includes(key)) {
      clothing = c;
      break;
    }
  }

  return `${basePrompt}

WORLD: ${world || 'Modern'} setting.
ENVIRONMENT: ${envCues}
CLOTHING: ${clothing}
MOOD: ${mood}

${faceRules}

Style: Cinematic illustration, atmospheric lighting, painterly.
DO NOT include any visible text, captions, titles, logos, or watermarks.
DO NOT default to dark, foggy, or oppressive unless the tone specifically calls for it.`;
}

// ============================================================
// SETTING VISUALIZE PROMPTER (LOCKED)
// ============================================================
// Setting images are STANDALONE WORLD VISTAS above story text
// NO faces, NO character close-ups - environment is the subject
// Must fall back to OpenAI if Gemini fails

function wrapSettingPrompt(basePrompt, world, tone) {
  const worldLower = (world || 'modern').toLowerCase();
  const toneLower = (tone || 'earnest').toLowerCase();

  // WORLD-SPECIFIC ENVIRONMENTAL VISTA CUES
  const worldVistas = {
    fantasy: 'enchanted castle on cliff, mystical forest clearing, ancient ruins with magical glow, dragon-lit mountain range',
    scifi: 'gleaming cityscape, orbital station view, alien landscape, neon-lit megacity streets',
    historical: 'grand ballroom interior, medieval castle courtyard, Victorian street scene, ancient temple',
    modern: 'sophisticated penthouse view, urban skyline at dusk, beach resort panorama, art gallery interior',
    mythic: 'Mount Olympus vista, divine temple garden, celestial throne room, ocean realm depths'
  };

  let vistaStyle = worldVistas.modern;
  for (const [key, style] of Object.entries(worldVistas)) {
    if (worldLower.includes(key)) {
      vistaStyle = style;
      break;
    }
  }

  // MOOD for setting image - derived from tone
  const moodMapping = {
    earnest: 'warm golden hour lighting, welcoming atmosphere',
    poetic: 'soft diffused light, romantic mist, dreamy quality',
    mythic: 'dramatic divine rays, epic grandeur, legendary scale',
    comedic: 'bright cheerful daylight, vibrant colors',
    wryconfession: 'intimate twilight, introspective mood',
    dark: 'dramatic shadows, moody atmosphere'
  };

  let moodStyle = moodMapping.earnest;
  for (const [key, m] of Object.entries(moodMapping)) {
    if (toneLower.includes(key)) {
      moodStyle = m;
      break;
    }
  }

  return `${basePrompt}

CRITICAL COMPOSITION RULES (MANDATORY):
- This MUST be a WORLD VISTA image: ${vistaStyle}
- Wide establishing shot, epic scale, environment is the subject
- If ANY human figure appears, they MUST be facing AWAY from viewer (silhouette only)
- ABSOLUTELY FORBIDDEN: Portraits, faces, characters looking at viewer, romantic poses, character close-ups

WORLD: ${world || 'Modern'} setting.
MOOD: ${moodStyle}

Style: Wide cinematic environment, atmospheric lighting, painterly illustration, 16:9 aspect ratio.
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

  // imageIntent: 'book_cover' | 'setting_visualize' | 'scene_visualize' (default)
  // title, authorName, modeLine: Used for book cover typography
  // dynamic, storyStyle, genre, world, tone, intensity: Story context
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
    world,
    tone,
    intensity
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Apply intent-specific prompt wrapping
  const isBookCover = imageIntent === 'book_cover';
  const isSetting = imageIntent === 'setting_visualize';

  let finalPrompt;
  if (isBookCover) {
    finalPrompt = wrapBookCoverPrompt(prompt, title, authorName, modeLine, dynamic, storyStyle, genre, world);
  } else if (isSetting) {
    finalPrompt = wrapSettingPrompt(prompt, world, tone);
  } else {
    finalPrompt = wrapScenePrompt(prompt, world, tone, intensity);
  }

  console.log(`[IMAGE] Intent: ${imageIntent || 'scene_visualize'}, isBookCover: ${isBookCover}, isSetting: ${isSetting}`);

  // ---- GEMINI PRIMARY (WITH AUTOMATIC FALLBACK) ----
  // If Gemini returns unsupported MIME or fails, automatically fall back to OpenAI
  let geminiSucceeded = false;
  if (!provider || provider === 'gemini') {
    try {
      console.log('[IMAGE] Trying Gemini Imagen 3...');
      const geminiRes = await fetch(
        // Hardcoded model - do not allow frontend override
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: {
              sampleCount: 1,
              // Setting images use 16:9 landscape, book covers use 1:1 square
              aspectRatio: isBookCover ? '1:1' : '16:9'
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
        const base64 = data.predictions?.[0]?.bytesBase64Encoded;
        const mimeType = data.predictions?.[0]?.mimeType || 'image/png';
        const uri = data.predictions?.[0]?.image_uri || data.generated_images?.[0]?.image_uri;

        // VALIDATE MIME TYPE - only accept standard image formats
        const supportedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const mimeSupported = supportedMimes.some(m => mimeType.toLowerCase().includes(m.split('/')[1]));

        if (base64 && mimeSupported) {
          console.log('[IMAGE] Gemini success (base64, MIME:', mimeType, ')');
          geminiSucceeded = true;
          return res.json({ url: `data:${mimeType};base64,${base64}`, provider: 'Gemini', intent: imageIntent });
        }
        if (uri) {
          console.log('[IMAGE] Gemini success (uri)');
          geminiSucceeded = true;
          return res.json({ url: uri, provider: 'Gemini', intent: imageIntent });
        }

        // Gemini returned data but MIME unsupported - log and fallback
        if (base64 && !mimeSupported) {
          console.warn('[IMAGE] Gemini returned unsupported MIME:', mimeType, '- falling back to OpenAI');
        }
      }
      console.log('[IMAGE] Gemini failed:', data?.error?.message || 'no image or unsupported format');
    } catch (err) {
      console.error('[IMAGE] Gemini error:', err.message, '- falling back to OpenAI');
    }
  }

  // DO NOT block rendering if Gemini partially succeeds - always try OpenAI fallback

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
