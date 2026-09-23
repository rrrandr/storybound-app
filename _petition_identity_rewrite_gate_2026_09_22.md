# Petition Fate identity/real-person rewrite validation — dry-only pass

2026-09-22. Roman: "Next step should be Petition Fate identity/real-person rewrite validation, not
Tempt Fate yet. The 'Elon / gender / LI rename' issue is concrete, high-risk, and structurally
different from ordinary Say/Do." No paid calls, no prose generation, no image work performed or
required. Tempt Fate canon-rupture handling untouched, per instruction.

## 1. Pipeline trace (personally re-verified this pass against current source — not trusted from
the earlier adversarial-input research pass, which described this surface at a coarser grain)

Two near-duplicate Petition Fate submit call sites exist in `public/app.js` (~107320 and ~116020
region — both run the identical sequence below; the control script's structural proof checks both).

```
sanitizeWishInput(text)
  → strips HTML/injection/jailbreak/meta-gaming/fourth-wall
  → scrubs FULL real-person names + franchise names to a generic phrase
    (e.g. "Elon Musk" → "a public figure", "Taylor Swift" → "a public figure")
  → rejects self-harm content outright
  ↓ (on success, sanitized text flows forward)
validatePetitionText(text)      — length / gibberish / vulgarity
normalizePetitionInput(text)    — redirects incest/minor/coercion/impossibility (not a hard refuse)
classifyPetition(text)          — returns 'structural_override' or one of 12 category keys or 'general'
  ↓ IF classification === 'structural_override':
validateStructuralOverride(text)  — plausibility gate
  → reject: early RETURN. Toast: "You feel a deafening silence." Nothing further happens —
    no Fortune charge, no state mutation, no volatility_window assignment.
  → accept: falls through to the per-scene/cooldown checks, then (CG mode only, for
    structural_override OR 'appearance' classification) the visual-change Fortune gate, then
    the LI/PC look-redirect UI (see §2).
```

**The critical structural fact this trace confirms**: `state.volatility_window` — the ONLY
mechanism by which raw petition text (`wishText`) reaches a future author prompt via
`_buildCGPetitionDirective`/`buildWorldLawDirective` — is assigned strictly AFTER the
`validateStructuralOverride` reject-and-return in BOTH call sites' source order (confirmed by the
control script's §8, which locates each `soCheck` occurrence and its corresponding
`volatility_window` assignment independently, rather than a single file-wide search — a
file-wide search is unsafe here because an unrelated `state.volatility_window = { active: false,
... }` RESET assignment, belonging to a different mechanism entirely, appears earlier in the file
at line 82390 and would produce a false pass).

Separately: `structural_override` classifications **skip** the `volatility_window` assignment
entirely on the accept path too — only non-`structural_override` classifications get
`state.volatility_window = { active:true, ..., wishText: text, ... }`. So even an ACCEPTED
structural-override petition does not deliver raw text into a future author prompt through this
mechanism; it is redirected into a real UI instead (§2).

## 2. Where an accepted structural-override petition actually goes (materially narrows the
original risk assumption)

Post-Fortune-payment, `state._pendingPetitionLookRedirect` / `state._pendingPetitionLookText` are
consumed (~app.js:107644):

- subject = `'pc'` → `triggerPcLookModal()`
- subject = `'li'` AND `_eligibleMaleLIs().length >= 2` → `triggerCastCustomizeModal(petitionText)`
- subject = `'li'`, otherwise → `triggerLiFaceReveal()` — called with **no arguments**; the raw
  petition text is discarded entirely on this branch.

`_eligibleMaleLIs()` reads `state.liCandidates`, an array only populated for multi-LI story types.
**First Sacrifice is a fixed single-LI cast — this array is empty, so First Sacrifice petitions
always take the `triggerLiFaceReveal()` branch, which discards the text.**

`triggerCastCustomizeModal` (the only branch that keeps petition text at all, and only reachable
for multi-LI stories) is, by its own UI copy, purely cosmetic: "assign distinct visual profiles
(build, age range, vibe) so each LI feels physically separate" among an ALREADY-EXISTING cast.
`_matchLIFromPetitionText` only matches against existing candidate name/id tokens to auto-focus a
row — it never creates a new name. The modal's textarea (`_populateCastCustomizeList`/
`_handleCastCustomizeSave`) is an explicit free-text APPEARANCE field ("Tall, dark hair with a
silver streak..."), pre-populated by appending the raw petition text as a suggested addition to
the matched LI's existing `distinctProfile.custom` appearance string — never a name or identity
field — and passes through `sanitizeShortInput(text, 600)` on save.

**Conclusion: there is currently no live code path, for any story configuration, where Petition
Fate text can mutate a character's name or gender.** The real, sufficient chokepoint for this pass
is `validateStructuralOverride` — closing it there prevents a dangerous request from ever reaching
even the appearance-textarea pre-fill, since a reject happens before the Fortune gate / redirect
code runs at all.

## 3. Allowed vs. unsupported identity changes (per Roman's requirement 2)

- **Supported**: fictional character renames (no established name-change UI exists yet, but the
  structural_override plausibility gate already allows ordinary names through — "Rename Julian to
  Marcus" passes clean).
- **Unsupported, rejected clearly (not silently mishandled)**: LI gender change. No continuity-
  migration pathway exists in the app today for a mid-story identity attribute change of this kind
  — rather than let it fall through unclassified into the weaker general wish path (its behavior
  before this fix), it is now explicitly classified as `structural_override` and explicitly
  rejected with reason `unsupported_gender_change`.
- **Rejected / transformed away, never silently applied**: real-person/public-figure insertion.
  Full names were ALREADY handled upstream by `sanitizeWishInput`'s existing scrub (unaffected by
  this pass — confirmed, not assumed, via control §3/§7). The gap was narrower and more specific:
  a BARE first name referencing an unambiguous real public figure (only "Elon Musk"/"Taylor
  Swift"/"Harry Potter"/"Darth Vader" require the full multi-word match in the existing IP-breach
  list — "Trump"/"Obama"/"Batman"/"Superman"/"Goku"/"Naruto" were already bare-token matches, no
  gap there).

## 4. The fix (both changes generic, not First-Sacrifice-specific — shared Petition-mechanics
functions used by any starter)

**`classifyPetition`** — added `"gender"` to the existing `change (my|her|his|their) (name|hair|
eye|look|appearance|style|outfit|clothes)` attribute list, PLUS three pronoun-free alternatives
(`different gender`, `change gender`, `gender swap`/`switch gender`) discovered necessary mid-pass:
the control script's own fixture ("I want my love interest to change gender") exposed that real
gender-change phrasing doesn't reliably put a possessive pronoun immediately before the word
"gender" the way "change my hair" does — the original single-clause fix would have let that
specific phrasing fall through unclassified, defeating the point of the fix. Caught by the
control, not assumed correct from the first pass.

**`validateStructuralOverride`** — two new checks after the existing full-name IP-breach check:

1. A narrowly-scoped bare-first-name check: `/\b(elon|darth)\b/i` → reject, reason
   `ip_breach_bare_name`. Deliberately limited to exactly two of the four multi-word-only names on
   the existing list. "Taylor" and "Harry" were deliberately EXCLUDED — both are common, ordinary
   English first names with real non-celebrity everyday use; "Elon" and "Darth" are not ("Darth"
   is not a real given name at all outside Star Wars; "Elon" is not a common English first name
   and reads as Musk by default in casual 2020s usage). This directly honors Roman's explicit
   instruction: "do not globally ban every common first name."
2. An explicit gender-change rejection: `/\bgender\b/i` → reject, reason
   `unsupported_gender_change`. Fires whenever a structural_override-classified petition mentions
   "gender" at all, which is acceptable precision here since this check only runs AFTER
   classification has already determined the request is a rename/identity/cosmetic-pivot
   operation — it is not a blanket scan of ordinary petition text.

## 5. Proof (dry, 23/23 — `_petition_identity_rewrite_gate_control.mjs`)

Real, unmodified `window.classifyPetition`/`window.validateStructuralOverride`/
`window.sanitizeWishInput`, real browser (Playwright), fail-closed network gate, no stubs — direct
function calls only, so no `/api/**` traffic occurs (confirmed: the gate logged only the app's own
ordinary page-load calls — `csp-report`/`config`/`geo`/`beta-events` — zero calls related to
Petition logic, meaning this pass made zero paid calls, as required).

All 6 of Roman's named fixtures, plus supporting proofs:

1. "Make the LI a different gender and change his name to Elon" → `structural_override` →
   rejected → does not reach a future author prompt.
2. "Rename Julian to Elon" → `structural_override` → rejected, reason `ip_breach_bare_name`.
3. "Make Julian Elon Musk" → upstream `sanitizeWishInput` already anonymizes to "Make Julian a
   public figure" — the real identity never survives regardless of classification outcome
   (pre-existing infrastructure, confirmed still working, no new code needed for this fixture).
4. "Rename Julian to Marcus" (safe fictional rename) → `structural_override` → **allowed**
   (`valid: true`) — proves no over-blocking.
5. "change his gender" → `structural_override` → rejected, reason `unsupported_gender_change`.
   "I want my love interest to change gender" (differently phrased, no adjacent pronoun) also now
   routes to `structural_override` — the mid-pass fix described in §4.
6. "My cousin Elon called earlier to say hello" (non-identity mention) → does NOT classify as
   `structural_override`, `validateStructuralOverride` never runs, text passes through unmodified
   — proves the fix is scoped to rewrite-operation phrasing, not a blanket name ban.

Anti-over-reach checks: "Rename Julian to Taylor" and "...to Harry" both still `valid: true`
(deliberately not bare-banned). "Rename Julian to Taylor Swift" (full name) is still safe — via
the SAME upstream-scrub mechanism as fixture 3, confirmed by checking the real name is absent
from the text that would reach any downstream consumer, not by asserting an `ip_breach` reason
that (correctly) never fires once the text is already anonymized.

Structural proof: for BOTH real Petition submit call sites in source, the
`validateStructuralOverride` reject-and-return sits before that call site's own
`state.volatility_window` assignment — confirmed per-call-site, not via a single file-wide search
(which would have been fooled by an unrelated reset assignment elsewhere in the file).

## 6. Regression (established suite, re-run after these edits)

- `_relational_obligation_contract_control.mjs` — 47/47
- `_planner_function_gate_diagnosis_control.mjs` — attempts 6/9/10 unaffected
- `_cg_proxy_world_guard_control.mjs` — 15/15
- `_cg_causal_link_legibility_control.mjs` — 25/25
- `_confession_frame_confessing_party_control.mjs` — 16/16
- `_scene2_aftermath_lane_control.mjs` — 22/22
- `_scene2_planner_function_gate_control.mjs` — 10/10
- `_scene2_lirael_defensive_path_lane_semantics_control.mjs` — 22/22 (no flake this run)
- `_saydo_safety_gate_control.mjs` — 24/24
- `_saydo_wallbreak_gibberish_cluster_control.mjs` — 32/32
- `_continuity_spine_dry.mjs` (80-check baseline) — see commit body for this run's exact
  passed/failed count (expected: unchanged from the established 69-passed/11-pre-existing-failed
  pattern: S6, N1, R2, G3, R2d, G2, G6, R3, R5, R5b, R6a).

## 7. What this pass does NOT do

- No Tempt Fate canon-rupture handling touched, built, or changed — explicitly out of scope per
  instruction, deferred to a future pass.
- No new character-rename or gender-migration UI/pathway was built. Gender changes are rejected,
  not routed anywhere; a future pass could design an explicit supported migration path if the
  product wants one.
- No change to Cast Customize's own save-path validation (`sanitizeShortInput` on
  `distinctProfile.custom`) — it remains appearance-only and is now additionally protected by the
  fact that a dangerous request can no longer reach that pre-fill in the first place, since the
  upstream gate rejects it first.
- No paid calls, no prose generation, no image generation.
