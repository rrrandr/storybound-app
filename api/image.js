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
function wrapBookCoverPrompt(basePrompt, title, authorName, modeLine, dynamic, storyStyle, genre) {
  // AUTHORITATIVE BOOK COVER PROMPT TEMPLATE
  // Creates prestige book covers with symbolic objects and custom typography
  return `You are creating a **prestige book cover** for a Storybound story.

This is not a scene illustration.
This is not a poster.
This is a **designed book cover** that must feel intentional, authored, and contemporary.

---

## CORE CONCEPT

Create a **square (1:1) book cover** built around **one evocative symbolic object** that implies the emotional core of the story without depicting characters or explicit action.

The cover must rely on **implication, symbolism, and restraint**, not literal depiction.

---

## STORY CONTEXT

* **Relationship Dynamic:** ${dynamic || 'Romantic tension'}
* **Story Style:** ${storyStyle || 'Dark Romance'}
* **Genre / Setting:** ${genre || 'Contemporary'}
* **Story Mood:** ${basePrompt}
* **Title:** ${title || 'Untitled'}
* **Author Name:** ${authorName || 'ANONYMOUS'}
* **Series Line:** Storybound Book I – ${modeLine || 'A Novel'}

---

## SYMBOLIC OBJECT RULE (CRITICAL)

Select **one primary object** that:
* Belongs naturally to the story's **world and setting**
* Reflects the **relationship dynamic**
* Matches the **tone of the story style**

Examples by genre:
* Contemporary → fabric, letters, glass, flowers, personal items
* Sci-Fi / Dystopia → machinery, spacecraft, visors, holograms, debris
* Medieval / Fantasy → tapestry, blade, ring, heraldic symbol, scroll

⚠️ Do NOT use objects that clash tonally.

---

## COMPOSITION & AESTHETIC

* Minimalist, high negative space
* Controlled lighting with depth and shadow
* Prestige, bookstore-ready visual language
* **NO characters, faces, or bodies**
* No clutter, no collage effect

---

## TYPOGRAPHY RULES (EXTREMELY IMPORTANT)

### TITLE LETTERING
* The title must appear as **bespoke, custom-designed lettering**
* Never described as a "font"
* Letterforms may be slightly irregular, subtly asymmetrical
* Ornamented with **purposeful flourishes**
* Typography should **evoke the story's emotional dynamic**

### DIMENSIONAL INTERACTION (MANDATORY)
The symbolic object must **physically interact with the title lettering** by at least one of:
* Passing in front of or behind letters
* Casting realistic shadows onto letterforms
* Threading through a character or stroke
* Aligning with or echoing letter shapes

❌ Forbidden: title floating cleanly above the image with no interaction

---

## SERIES / MODE LINE

Text: **Storybound Book I – ${modeLine || 'A Novel'}**
* Very small, quiet, restrained
* Secondary to the title
* Placed either at the very top OR just beneath the title
* Uses a **different but compatible style** from the title

---

## AUTHOR NAME TREATMENT

* Display: **${(authorName || 'ANONYMOUS').toUpperCase()}**
* NO "by" prefix
* ALL CAPS
* Bold, modern sans-serif
* Clean, grounded, stable
* Placed across the bottom of the cover
* Acts as a visual anchor

---

## COLOR & MOOD

Color palette, materials, and lighting must align with the story's genre, style seriousness, and emotional temperature.

Avoid: garish saturation, cheesy glow effects, stock-photo lighting.

---

## FINAL OUTPUT

Create a single, cohesive book cover that:
* Would look at home on a modern romance / literary shelf
* Has unified object, typography, and world feel
* Title feels **designed for this story**, not reusable
* Suggests intimacy, tension, or consequence **without showing it**
* Contains NO gibberish text, watermarks, or extra elements`;
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
