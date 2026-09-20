# Image Prompt — Visual Charge Directive Layer (2026-09-20)

Dry-built, dry-proven. No provider or image calls; no First Sacrifice render.

## Pipeline trace and injection point

Traced from a CG panel's structured output to the final image-provider prompt. The single
injection point every render path already funnels through is `_buildStagedHeroPrompt`
(app.js:203858), fed by `visualState._phaseChargeDirective` — set inside `_resolvePhaseVisualState`
(app.js:173148) via the already-live `_buildPhaseChargeDirective` (app.js:173253, the existing
"CHEMISTRY / CHARGE" block). Single panels (app.js:208513/214687) and 2x2 sheet quadrants
(app.js:209803+, one call per quadrant) both call `_resolvePhaseVisualState` with the identical
argument shape — so anything added there reaches both paths automatically, with no separate
wiring. Baked/precedent images (Scene 1's fixed package) never construct a prompt at all — a
different code path entirely, untouched by this change.

The CG author's schema already declares `social_staging_mode` and `attractionPresence`
(app.js:221775-221777, validated enums at app.js:227855-227871) — these are real, live,
already-consumed fields (they also drive an existing expression-intensity cap), not decorative.

## What was built

`_buildPhaseChargeDirective` gated the existing full-romance directive to
`social_staging_mode==='romance_eligible' || attractionPresence` in `{leaking, foreground}` — for
everything else it returned `''`. That's the actual gap: First Sacrifice's real Scene 2 sample
(`social_staging_mode:'adversarial'`, `attractionPresence:'none'`) got **no directive at all**,
despite being a charged public-accusation scene.

Added a second, narrower register, **RESTRAINED CHARGE** (`_buildRestrainedChargeDirective`,
app.js ~173322), fired only when the CG author's own structured output already signals something
above neutral:
- `attractionPresence === 'latent'` (a real, declared enum value, one notch below "leaking"), **or**
- `social_staging_mode` is `adversarial`/`professional`/`crowded_public`/`stranger_awkward`/
  `familial` **and** `sceneCharge.stake` names public-pressure, power, restraint, or
  attraction-adjacent content — checked against two vocabularies: the existing intensity-cap
  escalator's generic high-stakes list (app.js ~227665, reused for coherence between the two
  systems) **and** a new, purpose-built list matching what was actually asked for (public exposure,
  power/control, jealousy, forbidden attraction, awe, tenderness, danger) — added after testing
  against the real fixture showed the borrowed generic list alone (tuned for
  contract/diagnosis/breakup-class reveals) does not match First Sacrifice's real stake text at
  all.

Vocabulary is deliberately non-romantic (no "angled toward," no "leaning in," nothing implying
mutual pull) — held gaze or deliberately avoided gaze, correct social distance, one controlled
physical detail (jaw, hand, weight, stillness), charge sitting under the scene's real stakes
rather than replacing them. The directive text explicitly instructs the model **not** to pose the
pair as a couple.

## Safety

No new sanitizer was built — `sanitizeImagePrompt` (app.js:292266, now exposed on `window`) already
runs on the full assembled prompt before dispatch, with a semantic translation table
(`_IMAGE_SAFE_TRANSLATIONS`) and a hard-remove list (`_IMAGE_HARD_REMOVE`: bondage, explicit sexual
acts, fetish content, etc.) — confirmed still connected and effective (control §6: forbidden terms
removed, the new directive's own safe text survives the same pass untouched).

## Precedent / reuse

`_phaseFingerprint` (app.js:173368) never included `social_staging_mode`/`attractionPresence` at
all before this change — a pre-existing gap, not introduced here — but since the new directive's
output now depends on them (plus whether `sceneCharge.stake` hits either trigger vocabulary), three
new fingerprint keys (`ssm:`, `atp:`, `stk:`) were added so a scene whose charge computation changes
gets a fresh cache entry rather than silently reusing a stale image from before this change. Only
new/changed fingerprints are affected — no forced regeneration of anything already cached under an
unrelated key.

## Dry proof — `_image_visual_charge_directive_control.mjs`, 12/12

1. A neutral, unattracted, non-public-pressure scene gets no directive (either register).
2. The existing full-romance directive still fires unchanged (regression check).
3. **The real, unmodified First Sacrifice Scene 2 sample now gets RESTRAINED CHARGE** — previously
   got nothing at all. Confirmed non-romantic register, explicit no-couple-posing instruction, safe
   vocabulary only.
4. Guard: an adversarial scene with a genuinely mundane stake still gets nothing — not a blanket
   always-on for adversarial staging.
5. `attractionPresence:'latent'` alone is sufficient to fire the restrained register.
6. Forbidden explicit terms are removed by the real sanitizer even when mixed into the same prompt
   as the new directive; the directive's own text survives intact.
7. The 2x2 sheet call shape produces byte-identical directive output to the single-panel call shape
   for the real fixture (both call the same function with the same arguments).

## Status

Committed locally, not pushed. No provider or image calls made. First Sacrifice has not been
rendered. This closes the "image prompt gate" you named — the Julian-presence prose repair (see
`_scene2_li_presence_repair_authorization_2026_09_20.md`) remains separately unauthorized, and no
image spend should happen until you decide on that and this plumbing together.
