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

  const { image_b64, identity_tokens, species, expected_people, canon, authorized_changes, wish_anchor, mode } = req.body;
  if (!image_b64) return res.status(400).json({ error: 'image_b64 required' });

  // ── VERIFY MODE ────────────────────────────────────────────────────────────────
  // 'structural' — for the cheap SKETCH/line-art pass: identity, species topology, body-plan,
  //   figure count, gross limb/face structure, blocking. Rejects what must NOT reach the render.
  // 'cosmetic' — for the FINAL render: structure was ALREADY approved upstream, so do NOT re-flag it;
  //   only surface/prop/effect details (color, eye color, skin pattern, jewelry, weapon, wardrobe,
  //   wish-burst anchor, sacrifice-stain rendering).
  // 'full' (default) — legacy single-stage: report everything (until the Structural Pass ships).
  const vmode = (mode === 'structural' || mode === 'cosmetic') ? mode : 'full';
  // kwisheen_face is FINE DETAIL (pupil shape, mane texture, nose/lips) a rough blocking sketch cannot
  // show — it belongs to the COSMETIC (post-colorize) stage, not the structural sketch gate.
  const STRUCTURAL_DEFECTS = ['species_anatomy', 'body_plan', 'gender', 'extra_person', 'extra_hand', 'extra_limb'];
  const COSMETIC_DEFECTS = ['kwisheen_face', 'eye_color', 'skin_pattern', 'jewelry', 'weapon', 'wardrobe', 'held_prop', 'sacrifice_mark', 'wish_burst_anchor'];
  const modeBlock = vmode === 'structural'
    ? '\nVERIFY MODE = STRUCTURAL. This is a ROUGH black-and-white line-art BLOCKING sketch, NOT finished art — judge GROSS STRUCTURE ONLY and be LENIENT. A sketch PASSES if: the figure/person COUNT is right, each figure is the right SPECIES with the right BODY-PLAN (e.g. a tentacle-mantle lower body vs human legs — an octopus-like mantle with tentacles and no legs is CORRECT for a Kwisheen), no figure has grossly extra/missing arms, and the composition/blocking matches the scene. A tentacle-MANTLE (bulbous or octopus-like) that has no human legs is a PASS, regardless of the exact tentacle count. Do NOT fail a blocking sketch for anything that needs colour or fine rendering to judge: pupil shape, eye colour, nose/lip detail, facial expression, finger/hand detail, hair/mane texture, scalp coverage, skin pattern, jewelry, exact weapon type, or clothing detail — ALL of that is validated AFTER colorization. Judge blocking, not beauty; when in doubt, PASS.'
    : vmode === 'cosmetic'
    ? '\nVERIFY MODE = COSMETIC (the STRUCTURE was already approved upstream). Do NOT re-flag species, body-plan, figure count, gross limb structure, or composition — assume they are correct. Report ONLY localized surface defects: colour drift, eye colour, skin pattern, jewelry, weapon/prop, clothing details, wish-burst anchor placement, and sacrifice-stain rendering.'
    : '';
  // identity_tokens is optional in figure-sanity mode (human-only scenes) — default to a stub.
  const tokens = identity_tokens || '(no non-human species — all figures are ordinary humans)';
  const expectStr = (typeof expected_people === 'number') ? String(expected_people) : 'unknown';

  // ── CANON CONFORMANCE (optional) ──────────────────────────────────────────────
  // When the caller supplies the authoritative per-character canon, the verifier ALSO checks that
  // the render conforms to it (correct body-plan / gender / weapon / clothing / colours), treating
  // any deviation as a VIOLATION unless the story authorized that change this panel.
  const hasCanon = Array.isArray(canon) && canon.length > 0;
  const authList = Array.isArray(authorized_changes) ? authorized_changes : [];
  let canonBlock = '';
  if (hasCanon) {
    const rows = canon.map(c => {
      const bits = [];
      if (c.species) bits.push('species=' + c.species);
      if (c.body_plan) bits.push('BODY-PLAN=' + c.body_plan);
      if (c.gender) bits.push('gender-presentation=' + c.gender);
      if (c.face) bits.push('face=' + c.face);
      if (c.mane) bits.push('hair/mane=' + c.mane);
      if (c.skin) bits.push('skin=' + c.skin);
      if (c.pattern) bits.push('skin-pattern=' + c.pattern);
      if (c.eyes) bits.push('eyes=' + c.eyes);
      if (c.weapon) bits.push('weapon/held=' + c.weapon);
      if (c.armor) bits.push('clothing/armor=' + c.armor);
      if (c.jewelry) bits.push('jewelry/insignia=' + c.jewelry);
      if (c.injuries) bits.push('injuries/damage-state=' + c.injuries);
      return '- ' + (c.name || 'figure') + ': ' + bits.join('; ');
    }).join('\n');
    const authStr = authList.length ? authList.join(', ') : '(none — every canonical attribute is immutable this panel)';
    canonBlock = `
CANON (authoritative per-character truth — the render MUST conform; any deviation is a VIOLATION):
${rows}

CHANGES THE STORY AUTHORIZES THIS PANEL (these attribute categories MAY differ from canon; do NOT flag them): ${authStr}
${wish_anchor ? 'WISH-BURST ANCHOR (the burst, if any, must attach to): ' + wish_anchor + '\n' : ''}
CANON RULE: A character's morphology, gender presentation, equipment, clothing, colours and recognition traits are IMMUTABLE across panels unless the change is in the AUTHORIZED list above. Report only things with an AUTHORITATIVE answer. Do NOT flag pose, expression, camera angle, composition, or lighting — those have no canonical answer and are never violations.`;
  }

  // Build structured verification prompt
  const verifyPrompt = `You are an anatomy verification system for a graphic novel rendering pipeline.

TASK: Examine this image and verify it satisfies ALL anatomy rules listed below. Be strict.

IDENTITY TOKENS (authoritative — these are the ONLY valid anatomy):
${tokens}

SPECIES IN SCENE: ${species || 'human (ordinary humans)'}
EXPECTED PEOPLE IN FRAME: ${expectStr}
${canonBlock}${modeBlock}

VERIFICATION CHECKLIST:
1. LIMB TOPOLOGY (invariants, NOT an exact count): report tentacle_count as INFORMATION ONLY. An off-by-a-few tentacle count (e.g. 6 vs 7 vs 8 lower tentacles) is NOT a violation — readers do not count tentacles. A violation is only a TOPOLOGY break: the lower body is human LEGS instead of a tentacle mantle, or the mantle/limb system is a fundamentally wrong shape for the species. Do not fail an image merely because the number of tentacles differs from the tokens.
2. FORBIDDEN FEATURES: Are any forbidden features present (human legs on a Kwisheen, pointed ears on First Favored, etc.)?
3. SILHOUETTE: Does the overall body silhouette match the species description?
4. EYES: If eyes are visible, do pupils match the species description?
5. HANDS: If hands are visible, do they match the species description?
6. HYBRID CONTAMINATION: Are there mixed/averaged features from different species or from human anatomy where they shouldn't be?

FIGURE SANITY (applies to ALL figures, human or not):
7. PERSON COUNT: Count the distinct people/figures in the frame (include figures seen from behind or partially cropped). If EXPECTED PEOPLE is a number and the count is HIGHER, that is a VIOLATION — in particular a DUPLICATED / CLONED figure (two near-identical people when fewer were expected, or a phantom extra person) is a serious violation. If EXPECTED PEOPLE is "unknown", skip this specific check.
8. HAND / LIMB SANITY: Does any single figure have too many hands or limbs for its kind (a human with 3+ hands, a stray extra arm, a hand growing from the wrong place)? That is a VIOLATION.
9. KWISHEEN FACE (ONLY when a Kwisheen is in the scene): a correct Kwisheen has a HUMANOID face — a clear brow, a nose, and a MOUTH WITH LIPS on a defined jaw (sheathed in scaled hide), and HORIZONTAL (sideways) pupils. HAIR IS NOT ANATOMY: Kwisheen hair is living CORAL DREADLOCKS — a groomed appearance trait like human hair, never a limb and never counted among the tentacles. A Kwisheen may canonically be shaved, cropped, crested, or bearded, so a BALD OR BARE SCALP IS NOT A DEFECT and must NEVER be reported as one. It is a VIOLATION (a "kwisheen_face" defect) when the Kwisheen's FACE/head is drawn wrong: (a) the face is a MASS OF TENTACLES / an octopus-head / a Cthulhu-face, or has tentacles / barbels / a beak sprouting around the MOUTH or CHIN instead of a lipped humanoid mouth; or (b) the pupils are VERTICAL slits or plain round human dots instead of horizontal. Report which of a/b applies in the violations list.
${hasCanon ? `
CANON CONFORMANCE (check every figure against the CANON block below; a deviation is a VIOLATION unless its attribute category is AUTHORIZED). For each, name the character in the violation and set defect_character:
10. BODY-PLAN (semantic TOPOLOGY, NOT a tentacle count): flag "body_plan" ONLY on a reader-perceptible topology break vs the canon BODY-PLAN — e.g. a Kwisheen whose canon is a cephalopod tentacle-mantle is instead drawn with HUMAN LEGS (knees/feet), or the lower body is not a tentacle mantle at all, or the humanoid torso / two manipulator-arms structure is fundamentally wrong. The invariants that matter: humanoid torso ✓, cephalopod mantle ✓, lower locomotion is tentacles (not legs) ✓, no human legs ✓, two manipulator arms ✓. Do NOT flag body_plan for the wrong NUMBER of tentacles (6 vs 8 is fine) — that is not a violation. defect_type "body_plan".
11. GENDER PRESENTATION: the figure reads as a different gender than its canon gender-presentation AND "gender" is NOT authorized this panel. defect_type "gender".
12. WEAPON / HELD OBJECT: the figure holds a DIFFERENT weapon than canon (e.g. canon says a spear, drawn with a cutlass), or is empty-handed when canon says it holds one AND "weapon" is NOT authorized. defect_type "weapon".
13. CLOTHING / ARMOR: the figure's garment/armor differs from canon AND "wardrobe" is NOT authorized. defect_type "wardrobe".
14. RECOGNITION DETAIL (lower priority): wrong eye colour ("eye_color"), wrong skin pattern ("skin_pattern"), wrong/missing jewelry-insignia ("jewelry"), wrong held prop ("held_prop"), wrong injury/damage location vs canon ("sacrifice_mark"), or a wish-burst not attached to the WISH-BURST ANCHOR ("wish_burst_anchor").
Do NOT flag pose, expression, camera angle, composition, or lighting — those are never violations (defect_type stays null for them).` : ''}

For the SINGLE most damaging localizable defect, return a normalized bounding box so it can be spot-repaired, plus a "priority" (1, 2, or 3) and (for canon violations) the "defect_character" name.
BOXING PRIORITY (pick the highest that applies):
- PRIORITY 1 (always repairable — box it): (a) a phantom/duplicate person → defect_type "extra_person"; else (b) an extra hand/limb → "extra_hand"/"extra_limb"; else (c) WRONG SPECIES (check BOTH directions) — a figure whose canon species does NOT match how it is drawn: a Kwisheen drawn as a plain human with normal hair and legs, OR (the reverse) a canon-HUMAN (or any non-Kwisheen) drawn WITH Kwisheen/non-human traits it must not have (scaled skin, tentacles, coral-dreadlock hair, capsule pupils) → "species_anatomy", box the WHOLE figure (head to foot); else (d) WRONG BODY-PLAN (canon check 10) → "body_plan", box the figure's LOWER BODY; else (e) WRONG FACE per check 9 → "kwisheen_face", box the HEAD-AND-FACE; else (f) WRONG GENDER (check 11) → "gender", box the figure; else (g) WRONG/MISSING WEAPON (check 12) → "weapon", box the HAND-AND-WEAPON region; else (h) WRONG CLOTHING/ARMOR (check 13) → "wardrobe", box the torso/garment.
- PRIORITY 2 (repair only when localized — check 14): "eye_color" (box the eyes), "skin_pattern"/"jewelry"/"held_prop" (box the region), "sacrifice_mark" (box the body part), "wish_burst_anchor" (box the burst).
- PRIORITY 3 (report only — NEVER box, defect_type null): pose, expression, camera, composition, lighting.
Set "priority" to the tier of the chosen defect. Coordinates are 0..1 with x,y = top-left corner. If there is no localizable defect, set defect_bbox and defect_type to null.

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no explanation):
{
  "pass": true or false,
  "violations": ["description of each violation"],
  "failRegions": ["eye", "hand", "lower_body", "face", "silhouette", "torso", "weapon"],
  "confidence": "high" or "medium" or "low",
  "tentacle_count": number or null,
  "has_human_legs": true or false or null,
  "person_count": number or null,
  "defect_type": "extra_person" or "extra_hand" or "extra_limb" or "species_anatomy" or "body_plan" or "kwisheen_face" or "gender" or "weapon" or "wardrobe" or "eye_color" or "skin_pattern" or "jewelry" or "held_prop" or "sacrifice_mark" or "wish_burst_anchor" or null,
  "defect_character": "the canon character name the defect concerns, or null",
  "priority": 1 or 2 or 3 or null,
  "p1_count": number of DISTINCT priority-1 violations you see in the whole frame (0 if none),
  "defect_bbox": [x, y, w, h] or null,
  "region": "short name of the boxed body region/area, e.g. lower_body / head / hand / torso / eyes, or null",
  "expected": "what the CANON says should be there (short phrase), or null",
  "observed": "what is ACTUALLY drawn (short phrase), or null",
  "reason": "one plain sentence a renderer can act on, e.g. 'Human legs were drawn; canon requires a tentacle mantle.' — or null"
}
The region/expected/observed/reason fields describe the SINGLE boxed defect only; a downstream router uses "reason" verbatim as regeneration feedback, so make it concrete and imperative.

If the image is too ambiguous to verify (e.g., extreme close-up of non-anatomy), return:
{"pass": true, "violations": [], "failRegions": [], "confidence": "low", "tentacle_count": null, "has_human_legs": null, "person_count": null, "defect_type": null, "defect_character": null, "priority": null, "p1_count": 0, "defect_bbox": null, "region": null, "expected": null, "observed": null, "reason": null}

Be STRICT about limb counts, person counts, and forbidden features. Be LENIENT about style, lighting, and rendering quality.`;

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
            // gemini-2.5-flash is a REASONING model: with the full checklist + an image it spends the
            // whole token budget on hidden "thoughts" and emits NO JSON → every call parse-failed and
            // silently passed through (the verifier was dead). This is structured extraction, not a
            // reasoning task, so disable thinking and give the answer real headroom.
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 1024,
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

    // MODE FILTER (belt-and-suspenders): the boxed defect must belong to this verify mode, else it
    // would trigger the wrong stage (a cosmetic defect regenerating the sketch, or a structural defect
    // patched by Klein). If the boxed defect is out-of-mode, drop it to null so routing ignores it —
    // and clear pass (no ACTIONABLE in-mode defect), since the single boxed defect is the actionable one.
    if (vmode !== 'full' && result.defect_type) {
      const inMode = vmode === 'structural' ? STRUCTURAL_DEFECTS.indexOf(result.defect_type) !== -1
                                            : COSMETIC_DEFECTS.indexOf(result.defect_type) !== -1;
      if (!inMode) {
        result._modeFilteredOut = result.defect_type;
        result.defect_type = null; result.defect_bbox = null; result.priority = null;
        result.region = null; result.expected = null; result.observed = null; result.reason = null;
        result.pass = true; // nothing actionable IN THIS MODE
      }
    }

    console.log('[verify-anatomy]', 'mode=' + vmode, result.pass ? 'PASS' : 'FAIL',
      '| confidence:', result.confidence,
      '| violations:', (result.violations || []).length,
      '| regions:', (result.failRegions || []).join(',') || 'none',
      '| tentacles:', result.tentacle_count ?? '?',
      '| human_legs:', result.has_human_legs ?? '?',
      '| people:', result.person_count ?? '?', '/ expected', expectStr,
      '| defect:', result.defect_type ?? 'none',
      (result.priority ? 'P' + result.priority : ''),
      (result.defect_character ? '(' + result.defect_character + ')' : ''),
      result.defect_bbox ? JSON.stringify(result.defect_bbox) : '',
      hasCanon ? '| canon:' + canon.length : '');

    return res.status(200).json(result);
  } catch (err) {
    console.error('[verify-anatomy] Error:', err.message);
    // On error, pass through (don't block rendering)
    return res.status(200).json({ pass: true, violations: [], failRegions: [], confidence: 'none', error: err.message });
  }
}
