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
// COVER MOTIF MEMORY - Prevents repetition across covers
// ============================================================
// Lightweight in-memory tracking of last 3 cover concept keywords
// Resets on server restart (intentional - no persistence needed)
const _recentCoverMotifs = [];
const MAX_RECENT_MOTIFS = 3;

function trackCoverMotif(motif) {
  // Extract key concept from motif string
  const concept = motif.replace(/^(a|an|the)\s+/i, '').split(/\s+/)[0].toLowerCase();
  _recentCoverMotifs.unshift(concept);
  if (_recentCoverMotifs.length > MAX_RECENT_MOTIFS) {
    _recentCoverMotifs.pop();
  }
}

function getRecentMotifsNegativeBlock() {
  if (_recentCoverMotifs.length === 0) return '';
  return `\nDO NOT REUSE THESE RECENT CONCEPTS: ${_recentCoverMotifs.join(', ')}.`;
}

// ============================================================
// COVER NEGATIVE CONCEPT BLOCK (CRITICAL)
// ============================================================
// Hard constraints against device-centric and single-object symbolism
const COVER_NEGATIVE_CONCEPTS = `
NEGATIVE CONCEPT CONSTRAINTS (MANDATORY FOR COVERS):
- NO phones, smartphones, screens, tablets, or digital devices as central objects
- NO shattered glass or broken screens as symbolic elements
- NO single-object symbolism that reads as literal rather than evocative
- NO isolated modern devices floating in negative space
- PREFER atmospheric environments over isolated props
- PREFER human presence (silhouettes, hands, partial figures) over cold objects
- PREFER environmental mood (lighting, shadow, texture) over single focal items`;

// ============================================================
// MODERN WORLD COVER CONSTRAINTS
// ============================================================
// Modern covers emphasize atmosphere and human presence, NOT devices
const MODERN_COVER_CONSTRAINTS = `
MODERN WORLD VISUAL EMPHASIS:
- Emphasize atmosphere, mood, and environmental tension
- Human presence preferred: silhouettes against city lights, hands reaching, figures in shadow
- Environmental storytelling: luxurious interiors, dramatic lighting, weather effects
- Emotional texture over literal props
- If objects appear, they should be personal (jewelry, keys, letters) not technological`;

// Symbolic object selection based on genre/style/dynamic
// UPDATED: Removed device-centric items, tracks recent motifs
function selectSymbolicObject(genre, storyStyle, dynamic, isModernWorld = false) {
  const genreLower = (genre || '').toLowerCase();
  const styleLower = (storyStyle || '').toLowerCase();
  const dynamicLower = (dynamic || '').toLowerCase();

  // Genre-based object pools - DEVICE-FREE versions
  // Removed: broken phone screen, screens, tablets, glass displays
  // Added: atmospheric and personal alternatives
  const objects = {
    contemporary: ['a silk ribbon', 'an unsealed envelope', 'a wilting rose', 'a vintage key on velvet', 'a lipstick mark on glass', 'a champagne flute catching light'],
    fantasy: ['a golden crown with a missing jewel', 'a thorned vine wrapped around a blade', 'an ancient ring on velvet', 'a cracked crystal orb', 'a burning scroll'],
    romantasy: ['a crown of thorns and flowers', 'a dagger wreathed in smoke', 'a glowing rune-etched ring', 'a chalice tipped on its side'],
    historical: ['a wax-sealed letter', 'a pearl necklace on dark velvet', 'opera gloves draped over a chair', 'a pocket watch frozen at midnight'],
    paranormal: ['a crescent moon pendant', 'a mirror reflecting candlelight', 'a single black feather', 'a vial of crimson liquid'],
    dark: ['a thorn-wrapped rose', 'a bloodied petal', 'a mask on black silk', 'a blade catching candlelight'],
    scifi: ['a cracked helmet visor', 'a holographic pendant flickering', 'a star map on parchment', 'alien flora in crystalline case'],
    gothic: ['a wilting flower in a cracked vase', 'an ornate key on a grave', 'a candle guttering in darkness', 'a raven feather on lace'],
    suspense: ['a torn photograph', 'a wedding ring on black velvet', 'a bloodstained letter', 'a key in shadow'],
    crime: ['a signet ring on black leather', 'scattered playing cards and a bullet', 'a knife on white linen', 'a burning photograph'],
    billionaire: ['a diamond bracelet on dark marble', 'a champagne cork mid-flight', 'a handwritten note on luxury stationery', 'a silk tie draped over crystal'],
    modern: ['city lights reflected in rain', 'hands reaching across shadow', 'a silhouette against floor-to-ceiling windows', 'ambient luxury and tension']
  };

  // For modern worlds, prefer atmospheric/human presence options
  if (isModernWorld) {
    // If billionaire or modern genre, use modern pool
    if (genreLower.includes('billionaire') || genreLower.includes('contemporary')) {
      const modernPool = [...objects.modern, ...objects.billionaire];
      // Filter out recently used motifs
      const filtered = modernPool.filter(obj => {
        const concept = obj.replace(/^(a|an|the)\s+/i, '').split(/\s+/)[0].toLowerCase();
        return !_recentCoverMotifs.includes(concept);
      });
      const pool = filtered.length > 0 ? filtered : modernPool;
      const selected = pool[Math.floor(Math.random() * pool.length)];
      trackCoverMotif(selected);
      return selected;
    }
  }

  // Find matching genre
  let pool = objects.contemporary; // default
  for (const [key, items] of Object.entries(objects)) {
    if (genreLower.includes(key) || styleLower.includes(key)) {
      pool = items;
      break;
    }
  }

  // Filter out recently used motifs
  const filteredPool = pool.filter(obj => {
    const concept = obj.replace(/^(a|an|the)\s+/i, '').split(/\s+/)[0].toLowerCase();
    return !_recentCoverMotifs.includes(concept);
  });
  const finalPool = filteredPool.length > 0 ? filteredPool : pool;

  // Select based on dynamic mood
  let selected;
  if (dynamicLower.includes('forbidden') || dynamicLower.includes('enemy')) {
    selected = finalPool[Math.floor(Math.random() * Math.min(2, finalPool.length))];
  } else if (dynamicLower.includes('slow') || dynamicLower.includes('friend')) {
    selected = finalPool[Math.floor(Math.random() * finalPool.length)];
  } else {
    selected = finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  // Track selected motif
  trackCoverMotif(selected);
  return selected;
}

// ============================================================
// TONE-AWARE COVER STYLE MAPPING (LOCKED)
// ============================================================
// Covers MUST include decorative texture/pattern and Art Deco/Nouveau linework
// Tone determines visual weight, typography, and mood

function getToneCoverStyle(tone, intensity) {
  const toneLower = (tone || '').toLowerCase();
  const intensityLower = (intensity || 'naughty').toLowerCase();

  // Intensity-based heat modifier
  // Clean: fully restrained, no suggestion
  // Naughty: subtle tension, implied warmth
  // Erotic: warmer palette, heightened mood
  // Dirty: intense atmosphere, dramatic contrast
  const heatModifier = {
    clean: { warmth: 'cool and restrained', tension: 'none', palette: 'muted, desaturated' },
    naughty: { warmth: 'subtle warmth', tension: 'implied tension', palette: 'rich but controlled' },
    erotic: { warmth: 'warm and inviting', tension: 'palpable tension', palette: 'deep saturated tones' },
    dirty: { warmth: 'intense heat', tension: 'charged atmosphere', palette: 'bold contrast, deep shadows' }
  };
  const heat = heatModifier[intensityLower] || heatModifier.naughty;

  // SATIRICAL / COMEDIC: Lighter, playful, NOT erotic/breathless
  if (toneLower.includes('satirical') || toneLower.includes('comedic') || toneLower.includes('wry')) {
    return {
      visualWeight: 'lighter visual weight, airy composition',
      mood: 'playful and whimsical tone, clever and witty',
      typography: 'clean sans-serif or simple hand-lettered typography with personality',
      elements: 'illustrative elements allowed (stylized motifs, caricature touches, cave-drawing simplicity)',
      texture: 'subtle Art Nouveau inspired organic curves and decorative borders',
      forbidden: 'Must NOT feel breathless, erotic, or overly romantic. No heavy shadows.',
      heat: heat
    };
  }

  // EARNEST / POETIC / MYTHIC: Elegant, decorative, romantic but restrained
  if (toneLower.includes('earnest') || toneLower.includes('poetic') || toneLower.includes('mythic')) {
    return {
      visualWeight: 'balanced composition with elegant negative space',
      mood: `romantic with ${heat.tension}, timeless elegance`,
      typography: 'elegant serif or Art Deco inspired display typography with dimensional presence',
      elements: 'decorative linework, flourishes, and ornamental details',
      texture: 'Art Deco geometric patterns or Art Nouveau organic linework as background texture',
      forbidden: 'Never flat or blank. Decorative elements must enhance, not overwhelm.',
      heat: heat
    };
  }

  // DARK / HORROR: Heavy contrast, ominous, no playfulness
  if (toneLower.includes('dark') || toneLower.includes('horror')) {
    return {
      visualWeight: 'heavier contrast, dramatic chiaroscuro lighting',
      mood: `ominous atmosphere, ${heat.tension}, foreboding`,
      typography: 'bold dramatic serif or gothic-inspired letterforms with weight and presence',
      elements: 'ominous patterning, sharp geometric Art Deco motifs, heavy shadows',
      texture: 'intricate dark Art Deco patterns or thorned Art Nouveau linework',
      forbidden: 'No playful elements, no whimsy, no lightness. Must feel serious and weighted.',
      heat: heat
    };
  }

  // Default (Earnest-like)
  return {
    visualWeight: 'balanced composition with elegant negative space',
    mood: `evocative atmosphere with ${heat.tension}, literary presence`,
    typography: 'elegant display typography with dimensional presence',
    elements: 'decorative linework and ornamental flourishes',
    texture: 'Art Deco inspired geometric patterns or Art Nouveau organic curves',
    forbidden: 'Never flat white or blank. Must have visual texture.',
    heat: heat
  };
}

function wrapBookCoverPrompt(basePrompt, title, authorName, modeLine, dynamic, storyStyle, genre, intensity, worldSubtype) {
  const cleanTitle = (title || 'Untitled').trim();
  const cleanAuthor = (authorName || 'ANONYMOUS').toUpperCase().trim();

  // Extract tone and world from modeLine/storyStyle for series line
  const tone = (storyStyle || '').split(' ')[0] || 'Earnest';
  const toneStyle = getToneCoverStyle(tone, intensity);

  // Extract world from modeLine (format: "Era World" or "World Tone")
  const modeLineParts = (modeLine || 'Modern').split(' ');
  const world = modeLineParts[modeLineParts.length - 1] || 'Modern';

  // Detect modern world (affects cover emphasis)
  const worldLower = (world || '').toLowerCase();
  const subtypeLower = (worldSubtype || '').toLowerCase();
  const genreLower = (genre || '').toLowerCase();
  const isModernWorld = worldLower === 'modern' || genreLower.includes('billionaire') || subtypeLower.includes('contemporary');

  // Select symbolic object based on context (passes isModernWorld for atmosphere emphasis)
  const symbolicObject = selectSymbolicObject(genre, storyStyle, dynamic, isModernWorld);

  // Generate elegant atmospheric series line (replaces "Storybound Book: N")
  const seriesLine = generateAtmosphericSeriesLine(world, genre, tone, worldSubtype);

  // Build world context from worldSubtype if present
  const worldContext = worldSubtype ? `${worldSubtype} ` : '';

  // Era-appropriate material constraints based on world
  const isHistorical = worldLower === 'historical' || subtypeLower.includes('medieval') || subtypeLower.includes('victorian') || subtypeLower.includes('regency') || subtypeLower.includes('roaring');
  const isOccult = worldLower === 'paranormal' || worldLower === 'occult' || genreLower.includes('paranormal');
  const isFantasy = worldLower === 'fantasy' || worldLower === 'romantasy';

  // Era-appropriate materials
  let eraConstraints = '';
  if (isHistorical || isOccult) {
    eraConstraints = `
ERA-APPROPRIATE MATERIALS ONLY: candlelight, wood, stone, fabric, iron, parchment, leather, velvet, lace, brass, copper, wax seals, quills, inkwells.`;
  } else if (isFantasy) {
    eraConstraints = `
ERA-APPROPRIATE MATERIALS ONLY: ancient metals, crystalline elements, organic materials, stone, wood, enchanted objects, mythical textures.`;
  }

  // Modern world emphasis: atmosphere over devices
  const modernConstraints = isModernWorld ? MODERN_COVER_CONSTRAINTS : '';

  // Get recent motifs negative block
  const recentMotifsBlock = getRecentMotifsNegativeBlock();

  // Build tone-aware prestige book cover prompt with intensity-driven heat
  return `A prestige book cover design, square format, ${toneStyle.visualWeight}.

TYPOGRAPHY SAFE ZONE (MANDATORY):
All text elements (title, series line, author name) MUST be placed within the inner 80% of the cover.
Enforce a 10% margin on ALL sides - no text may touch or approach the edges.
The image may extend edge-to-edge, but typography stays safely inset.

MANDATORY: The cover MUST include decorative texture or pattern - never flat white or blank backgrounds.
Style inspiration: Art Deco geometric precision OR Art Nouveau organic linework (choose one, commit fully).
Background treatment: ${toneStyle.texture}

Central focus: ${symbolicObject}, rendered with controlled dramatic lighting, depth, and shadow. The object occupies the visual center, elegant and evocative.

Title typography: "${cleanTitle}" using ${toneStyle.typography}. The letterforms have dimensional presence. The symbolic object physically interacts with the title - either passing behind certain letters, casting realistic shadows onto the text, or threading through the letterforms. The title and object share the same physical space. MUST be placed within the safe zone.

Series line: "${seriesLine}" in very small, quiet type near the top or just beneath the title. Secondary and restrained. MUST be within the safe zone.

Author credit: ${cleanAuthor} in bold modern sans-serif, ALL CAPS, placed across the bottom of the cover as a visual anchor. Clean and grounded. MUST be within the safe zone - do not crowd the bottom edge.

Cover mood: ${toneStyle.mood}. ${toneStyle.elements}. Color palette: ${toneStyle.heat.palette}. Atmosphere: ${toneStyle.heat.warmth}. Lighting and composition evoke ${worldContext}${genre || 'contemporary'} ${dynamic || 'romantic tension'} atmosphere.
${eraConstraints}

ABSOLUTELY FORBIDDEN - HARD BANS:
- NO modern objects: phones, smartphones, screens, tablets, laptops, computers, glass displays, LED lights, neon signage, digital devices, electronics, modern vehicles, cars, motorcycles
- NO modern clothing: t-shirts, jeans, sneakers, modern suits, hoodies, contemporary fashion
- NO contemporary architecture: skyscrapers, glass buildings, modern interiors
- NO plastic, chrome, or synthetic materials
- NO modern typography or sans-serif fonts in the scene itself
- NO text touching or near edges - all typography MUST respect the 10% safe zone

${toneStyle.forbidden}
${COVER_NEGATIVE_CONCEPTS}${modernConstraints}${recentMotifsBlock}

No characters, no faces, no bodies, no clutter. Single cohesive composition suitable for a modern literary bookshelf. No gibberish text, no watermarks.`;
}

/**
 * Generate an elegant atmospheric series line from story context.
 * Replaces "Storybound Book: N" with a publication-ready sentence.
 *
 * @param {string} world - Story world (e.g., Modern, Fantasy, Historical)
 * @param {string} genre - Story genre (e.g., Billionaire, Noir, Heist)
 * @param {string} tone - Story tone (e.g., Earnest, Dark, Satirical)
 * @param {string} worldSubtype - Optional world flavor (e.g., Victorian, Cyberpunk)
 * @returns {string} - A single elegant atmospheric sentence
 */
function generateAtmosphericSeriesLine(world, genre, tone, worldSubtype) {
  // Normalize inputs
  const w = (world || 'Modern').toLowerCase();
  const g = (genre || 'Romance').toLowerCase();
  const t = (tone || 'Earnest').toLowerCase();
  const sub = (worldSubtype || '').toLowerCase();

  // World essence phrases
  const worldEssence = {
    modern: 'ambition and hidden truths',
    historical: 'tradition and forbidden desire',
    fantasy: 'magic and impossible choices',
    scifi: 'starlight and uncharted futures',
    dystopia: 'rebellion and desperate hope',
    postapocalyptic: 'survival and redemption',
    paranormal: 'shadow and supernatural longing',
    supernatural: 'the veil between worlds'
  };

  // Genre implication phrases
  const genreImplication = {
    billionaire: 'power and obsession',
    crimesyndicate: 'loyalty and blood',
    noir: 'secrets and moral ruin',
    heist: 'trust and betrayal',
    espionage: 'deception and impossible stakes',
    political: 'ambition and dangerous alliances',
    romance: 'passion and surrender'
  };

  // Tone descriptors
  const toneDescriptor = {
    earnest: 'yearning',
    wryconfession: 'bittersweet',
    satirical: 'wickedly sharp',
    dark: 'shadowed',
    horror: 'haunting',
    mythic: 'fated',
    comedic: 'irresistible',
    surreal: 'dreamlike',
    poetic: 'achingly beautiful'
  };

  // Get values with fallbacks
  const essence = worldEssence[w] || 'passion and consequence';
  const implication = genreImplication[g] || 'desire and destiny';
  const descriptor = toneDescriptor[t] || 'compelling';

  // Subtype modifier (if present)
  const subtypePhrase = sub ? `${sub.charAt(0).toUpperCase() + sub.slice(1)} ` : '';

  // Deterministic pattern selection based on inputs
  const patternSeed = (w.length + g.length + t.length) % 5;

  const patterns = [
    `A Storybound tale of ${descriptor} ${implication}`,
    `A Storybound story where ${essence} shapes everything`,
    `A Storybound novel of ${subtypePhrase}${essence}`,
    `A Storybound journey through ${descriptor} ${essence}`,
    `A Storybound tale set in a world of ${implication}`
  ];

  return patterns[patternSeed];
}

function wrapScenePrompt(basePrompt, isAuthoritative = false) {
  // AUTHORITY CHECK: If prompt comes from buildStructuredVisualizePrompt, it's already complete
  // NEUTRALIZED for authoritative prompts - pass through without modification
  if (isAuthoritative) {
    console.log('[IMAGE] Authoritative scene_visualize prompt - skipping server-side wrapper');
    return basePrompt; // No-op - prompt already complete from client authority
  }

  // Scene visualization: Atmosphere, characters, environment - NO text
  // CRITICAL: Avoid silhouettes and noir imagery unless explicitly modern/urban
  // This only applies to NON-authoritative prompts (legacy or manual)
  return `${basePrompt}

Style: Cinematic illustration, atmospheric lighting, painterly.
MANDATORY: Show visible faces and identifiable figures - NO anonymous silhouettes.
FORBIDDEN: Shadowy figures, backlit anonymity, noir aesthetics (unless prompt explicitly requests urban/modern).
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

  // imageIntent: 'book_cover' | 'setting' | 'scene_visualize' (default)
  // isSetting: explicit boolean for setting image routing
  // authoritativePrompt: if true, prompt came from buildStructuredVisualizePrompt (client authority)
  // title, authorName, modeLine: Used for book cover typography
  // dynamic, storyStyle, genre: Story context for symbolic object selection
  // intensity: Arousal level (Clean, Naughty, Erotic, Dirty) for cover restraint
  // world, worldSubtype: World flavor detail (e.g., Medieval, Victorian) for visual styling
  // tone: Story tone for atmosphere
  const {
    prompt,
    provider,
    size = '1024x1024',
    imageIntent,
    isSetting,
    authoritativePrompt,
    title,
    authorName,
    modeLine,
    dynamic,
    storyStyle,
    genre,
    intensity,
    world,
    worldSubtype,
    tone
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // DEV ASSERTION: Verify intent/isSetting consistency
  if (process.env.NODE_ENV !== 'production') {
    if (imageIntent === 'setting' && isSetting !== true) {
      console.error('[DEV ASSERT: IMAGE_ROUTING] Server received intent=setting but isSetting!=true');
    }
    if (isSetting === true && imageIntent !== 'setting') {
      console.error('[DEV ASSERT: IMAGE_ROUTING] Server received isSetting=true but intent!=setting');
    }
  }

  // ROUTING PRIORITY: isSetting FIRST, then book_cover, then default
  // Setting images bypass book cover logic entirely
  const isSettingImage = isSetting === true || imageIntent === 'setting';
  const isBookCover = !isSettingImage && imageIntent === 'book_cover';

  // Apply intent-specific prompt wrapping
  // AUTHORITY: authoritativePrompt=true means prompt came from buildStructuredVisualizePrompt (client authority)
  let finalPrompt;
  if (isSettingImage) {
    // Setting images: use prompt as-is (already structured in client)
    finalPrompt = prompt;
    console.log(`[IMAGE] SETTING IMAGE - bypassing book cover logic`);
  } else if (isBookCover) {
    finalPrompt = wrapBookCoverPrompt(prompt, title, authorName, modeLine, dynamic, storyStyle, genre, intensity, worldSubtype);
  } else {
    // scene_visualize: pass authoritativePrompt flag to skip server-side wrapping
    finalPrompt = wrapScenePrompt(prompt, authoritativePrompt === true);
  }

  console.log(`[IMAGE] Intent: ${imageIntent || 'scene_visualize'}, isSetting: ${isSetting}, isSettingImage: ${isSettingImage}, isBookCover: ${isBookCover}`);

  // ---- GEMINI PRIMARY ----
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
        const uri = data.predictions?.[0]?.image_uri || data.generated_images?.[0]?.image_uri;

        if (base64) {
          console.log('[IMAGE] Gemini success (base64)');
          return res.json({ url: `data:image/png;base64,${base64}`, provider: 'Gemini', intent: imageIntent });
        }
        if (uri) {
          console.log('[IMAGE] Gemini success (uri)');
          return res.json({ url: uri, provider: 'Gemini', intent: imageIntent });
        }
      }
      console.log('[IMAGE] Gemini failed:', data?.error?.message || 'no image');
    } catch (err) {
      console.error('[IMAGE] Gemini error:', err.message);
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
