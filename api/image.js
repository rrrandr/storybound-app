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
// WORLD-AWARE SYMBOLIC OBJECT SELECTION (B. COVER FIX)
// ============================================================
// Objects must be plausible in the story world
// Modern objects forbidden in non-modern worlds

function selectSymbolicObject(genre, storyStyle, dynamic, modeLine) {
  const genreLower = (genre || '').toLowerCase();
  const styleLower = (storyStyle || '').toLowerCase();
  const dynamicLower = (dynamic || '').toLowerCase();
  const worldLower = (modeLine || '').toLowerCase();

  // Determine world type from modeLine
  const isFantasy = worldLower.includes('fantasy') || styleLower.includes('fantasy') || styleLower.includes('romantasy');
  const isHistorical = worldLower.includes('historical') || worldLower.includes('medieval') || worldLower.includes('regency') || worldLower.includes('victorian');
  const isSciFi = worldLower.includes('sci-fi') || worldLower.includes('scifi') || worldLower.includes('space');
  const isDystopia = worldLower.includes('dystopia');
  const isPostApoc = worldLower.includes('apocalyptic') || worldLower.includes('post-apocalyptic');
  const isModern = !isFantasy && !isHistorical && !isSciFi && !isDystopia && !isPostApoc;

  // World-appropriate object pools (NO WORLD LEAKAGE)
  const worldObjects = {
    fantasy: [
      'a golden crown with a missing jewel',
      'a thorned vine wrapped around a blade',
      'an ancient ring on velvet',
      'a cracked crystal orb',
      'a burning scroll with arcane text',
      'a chalice tipped on its side, wine spilling',
      'a dagger wreathed in smoke',
      'a glowing rune-etched pendant',
      'a crown of thorns and flowers intertwined',
      'an ancient key of ornate iron'
    ],
    historical: [
      'a wax-sealed letter',
      'a pearl necklace on dark velvet',
      'opera gloves draped over a chair',
      'a pocket watch frozen at midnight',
      'a quill beside spilled ink',
      'a cameo brooch on lace',
      'a pressed flower in a leather journal',
      'a candle guttering beside love letters',
      'a fan half-opened on silk',
      'a signet ring pressed into wax'
    ],
    scifi: [
      'a cracked helmet visor reflecting stars',
      'a holographic pendant flickering',
      'circuitry intertwined with organic matter',
      'a data chip catching light',
      'a pilot\'s insignia on scorched fabric',
      'a vial of glowing liquid',
      'a broken navigation display',
      'a single spent energy cell'
    ],
    dystopia: [
      'a resistance token',
      'a cracked surveillance lens',
      'a forbidden book with torn pages',
      'shattered identity chip',
      'a wilting flower in concrete crack',
      'handwritten note on recycled paper',
      'a mask discarded on grey fabric'
    ],
    postapoc: [
      'a weathered photograph of before',
      'a hand-forged blade',
      'a gas mask with cracked lens',
      'wildflowers growing through ruins',
      'a faded map marked with routes',
      'a salvaged compass',
      'two bullets and a ring'
    ],
    modern: [
      'a silk ribbon',
      'an unsealed envelope',
      'a shattered wine glass',
      'a wilting rose',
      'a hotel key card',
      'a lipstick mark on glass',
      'a broken phone screen',
      'a photograph torn in half',
      'car keys on a bar counter',
      'a wedding ring beside divorce papers'
    ]
  };

  // Tone-modified pools for dark/gothic
  const darkObjects = {
    fantasy: ['a bloodied crown', 'a blade catching candlelight', 'a cracked dark mirror', 'a raven feather on black velvet'],
    historical: ['a mourning locket', 'bloodstained gloves', 'a poisoned chalice', 'a black veil on a grave'],
    modern: ['shattered handcuffs', 'a bloodied rose', 'a mask on black silk', 'a gun beside a wedding ring']
  };

  // Select base pool by world
  let pool;
  if (isFantasy) pool = worldObjects.fantasy;
  else if (isHistorical) pool = worldObjects.historical;
  else if (isSciFi) pool = worldObjects.scifi;
  else if (isDystopia) pool = worldObjects.dystopia;
  else if (isPostApoc) pool = worldObjects.postapoc;
  else pool = worldObjects.modern;

  // Apply dark/gothic tone modifier
  const isDark = styleLower.includes('dark') || styleLower.includes('horror') || styleLower.includes('gothic');
  if (isDark) {
    const darkPool = isFantasy ? darkObjects.fantasy :
                     isHistorical ? darkObjects.historical :
                     isModern ? darkObjects.modern : null;
    if (darkPool && Math.random() < 0.6) {
      pool = darkPool;
    }
  }

  // Select based on dynamic mood (first items tend to be more dramatic)
  if (dynamicLower.includes('forbidden') || dynamicLower.includes('enemy') || dynamicLower.includes('dangerous')) {
    return pool[Math.floor(Math.random() * Math.min(3, pool.length))];
  }

  return pool[Math.floor(Math.random() * pool.length)];
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

function wrapBookCoverPrompt(basePrompt, title, authorName, modeLine, dynamic, storyStyle, genre) {
  // Select symbolic object based on context (world-aware to prevent modern leakage)
  const symbolicObject = selectSymbolicObject(genre, storyStyle, dynamic, modeLine);
  const cleanTitle = (title || 'Untitled').trim();
  const cleanAuthor = (authorName || 'ANONYMOUS').toUpperCase().trim();
  const cleanMode = modeLine || 'A Novel';

  // Extract tone from storyStyle (format: "Tone Genre")
  const tone = (storyStyle || '').split(' ')[0] || 'Earnest';
  const toneStyle = getToneCoverStyle(tone);

  // Determine world constraint for cover
  const worldLower = (modeLine || '').toLowerCase();
  const isFantasy = worldLower.includes('fantasy');
  const isHistorical = worldLower.includes('historical') || worldLower.includes('medieval') || worldLower.includes('regency') || worldLower.includes('victorian');
  const isSciFi = worldLower.includes('sci-fi') || worldLower.includes('scifi');

  let worldConstraint = '';
  if (isFantasy) {
    worldConstraint = 'WORLD CONSTRAINT: Fantasy setting. NO modern objects (phones, cars, contemporary items). Materials: metal, leather, silk, stone, crystal, flame.';
  } else if (isHistorical) {
    worldConstraint = 'WORLD CONSTRAINT: Historical setting. NO anachronistic objects. Period-appropriate materials only: wax, parchment, silk, velvet, pearl, brass.';
  } else if (isSciFi) {
    worldConstraint = 'WORLD CONSTRAINT: Sci-fi setting. Futuristic materials: holographics, circuitry, sleek metals, glowing elements.';
  }

  // Build tone-aware prestige book cover prompt
  return `A prestige book cover design, square format, ${toneStyle.visualWeight}.

MANDATORY: The cover MUST include decorative texture or pattern - never flat white or blank backgrounds.
Style inspiration: Art Deco geometric precision OR Art Nouveau organic linework (choose one, commit fully).
Background treatment: ${toneStyle.texture}

${worldConstraint}

Central focus: ${symbolicObject}, rendered with controlled dramatic lighting, depth, and shadow. The object occupies the visual center, elegant and evocative.

Title typography: "${cleanTitle}" using ${toneStyle.typography}. The letterforms have dimensional presence. The symbolic object physically interacts with the title - either passing behind certain letters, casting realistic shadows onto the text, or threading through the letterforms. The title and object share the same physical space.

Series line: "Storybound Book I – ${cleanMode}" in very small, quiet type near the top or just beneath the title. Secondary and restrained.

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
    genre
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Apply intent-specific prompt wrapping
  const isBookCover = imageIntent === 'book_cover';
  const finalPrompt = isBookCover
    ? wrapBookCoverPrompt(prompt, title, authorName, modeLine, dynamic, storyStyle, genre)
    : wrapScenePrompt(prompt);

  console.log(`[IMAGE] Intent: ${imageIntent || 'scene_visualize'}, isBookCover: ${isBookCover}`);

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
