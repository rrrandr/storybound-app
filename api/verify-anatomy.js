// Verify Anatomy — Vision model gate for GN panel correctness
// Sends generated panel + identity tokens to Gemini for structured verification.
// Returns: { pass, violations[], failRegions[] }

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini not configured' });

  const { image_b64, identity_tokens, species } = req.body;
  if (!image_b64) return res.status(400).json({ error: 'image_b64 required' });
  if (!identity_tokens) return res.status(400).json({ error: 'identity_tokens required' });

  // Build structured verification prompt
  const verifyPrompt = `You are an anatomy verification system for a graphic novel rendering pipeline.

TASK: Examine this image and verify it satisfies ALL anatomy rules listed below. Be strict.

IDENTITY TOKENS (authoritative — these are the ONLY valid anatomy):
${identity_tokens}

SPECIES IN SCENE: ${species || 'unknown'}

VERIFICATION CHECKLIST:
1. LIMB COUNT: Count all visible tentacles/limbs. Does the count match the identity tokens exactly?
2. FORBIDDEN FEATURES: Are any forbidden features present (human legs on Octofolk, pointed ears on First Favored, etc.)?
3. SILHOUETTE: Does the overall body silhouette match the species description?
4. EYES: If eyes are visible, do pupils match the species description?
5. HANDS: If hands are visible, do they match the species description?
6. HYBRID CONTAMINATION: Are there mixed/averaged features from different species or from human anatomy where they shouldn't be?

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no explanation):
{
  "pass": true or false,
  "violations": ["description of each violation"],
  "failRegions": ["eye", "hand", "lower_body", "face", "silhouette"],
  "confidence": "high" or "medium" or "low",
  "tentacle_count": number or null,
  "has_human_legs": true or false or null
}

If the image is too ambiguous to verify (e.g., extreme close-up of non-anatomy), return:
{"pass": true, "violations": [], "failRegions": [], "confidence": "low", "tentacle_count": null, "has_human_legs": null}

Be STRICT about limb counts and forbidden features. Be LENIENT about style, lighting, and rendering quality.`;

  try {
    // Strip data URL prefix if present
    const cleanB64 = image_b64.replace(/^data:image\/[^;]+;base64,/, '');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: verifyPrompt },
              { inlineData: { mimeType: 'image/png', data: cleanB64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('[verify-anatomy] Gemini error:', geminiRes.status, errText.slice(0, 500));
      // On API failure, pass through (don't block rendering)
      return res.status(200).json({ pass: true, violations: [], failRegions: [], confidence: 'none', error: 'verification unavailable' });
    }

    const geminiData = await geminiRes.json();
    const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let result;
    try {
      result = JSON.parse(textContent);
    } catch (_) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { result = JSON.parse(jsonMatch[0]); } catch (__) {}
      }
    }

    if (!result) {
      console.warn('[verify-anatomy] Could not parse Gemini response:', textContent.slice(0, 200));
      return res.status(200).json({ pass: true, violations: [], failRegions: [], confidence: 'none', error: 'parse failed' });
    }

    console.log('[verify-anatomy]', result.pass ? 'PASS' : 'FAIL',
      '| confidence:', result.confidence,
      '| violations:', (result.violations || []).length,
      '| regions:', (result.failRegions || []).join(',') || 'none',
      '| tentacles:', result.tentacle_count ?? '?',
      '| human_legs:', result.has_human_legs ?? '?');

    return res.status(200).json(result);
  } catch (err) {
    console.error('[verify-anatomy] Error:', err.message);
    // On error, pass through (don't block rendering)
    return res.status(200).json({ pass: true, violations: [], failRegions: [], confidence: 'none', error: err.message });
  }
}
