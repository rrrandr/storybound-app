# Say/Do Adversarial-Input Safety Gate (2026-09-22)

Roman, after the revised adversarial-input test plan was committed: "Start closing the highest-risk
adversarial-input gaps, dry-only... Wire or adapt the existing minor sexual-content, hate/
harassment, self-harm, and gibberish checks into the Fate-card / custom Say-Do interruption commit
path before those inputs reach planner or author prompts... Preserve useful player agency. Do not
simply reject every weak, weird, or emotional input." Priority order: minor > hate/harassment >
self-harm > gibberish on Say/Do; Petition/Tempt Fate real-person/identity fixes explicitly deferred
to the next pass unless they share an existing hook the Say/Do path already touches (none do — not
implemented here). Dry-only: no paid calls, no generated prose, no image work.

## What was wired, all in `public/app.js`, all generic (Storybound's shared Submit path)

1. **`_detectSelfHarmSignal(text)`** — extracted from `sanitizeWishInput`'s own inline regex
   (unchanged pattern, just given a name and a `window` export). `sanitizeWishInput` refactored to
   call it instead of re-testing its own copy — single source of truth, proven zero behavior
   change (control section 8).
2. **`_detectHateSpeechSignal(text)`** — detect-only companion to the existing `_sanitizeHateSpeech`,
   reusing the identical `_BANNED_SLUR_PATTERNS` list. `_sanitizeHateSpeech` itself untouched — its
   Narrative-Marketplace-diary consumer keeps its own redact-and-continue behavior; this is a new,
   separate detector for the reject-path this pass needed.
3. **`_detectSayDoSafetySignal(text)`** — new combining gate: minor → self-harm → hate speech, first
   hit wins, returns `{category, matched, label, message}` or `null`.
4. **`_sayDoGibberishFallback(text, kind)`** — new, substitutes a short, deterministic, non-authored
   placeholder for a gibberish-flagged field only; a clean sibling field is untouched.
5. Wired both into the real CG Submit handler (`gnSubmitBtn` click), immediately after the two
   existing `sanitizeShortInput` calls, before the existing empty-input check and well before
   `_commitIntimateInterruption` (confirmed via direct grep: the commit call is later in the same
   function — an early `return` on a hard-block genuinely prevents the ledger write and everything
   downstream of it).
6. `_detectMinorSignal`, `_detectGibberish`, `sanitizeShortInput`, and `sanitizeWishInput` — all
   pre-existing — exposed on `window` for the first time in this pass (none were before), purely
   for testability; no behavior change.

## Four-bucket design (per Roman's explicit instruction not to reject everything)

- **Hard-block / safety redirect** — minor, self-harm, hate speech. Submit refused outright, a
  clear message shown, nothing committed to the ledger.
- **Graceful in-world fallback** — gibberish. Submit is NOT blocked; the specific gibberish field
  gets a neutral placeholder instead of the literal nonsense text.
- **Usable emotional posture / safe literal input** — weak responses and in-register adult content.
  Not touched by this gate at all; proven unchanged via control sections 5-6.

## Honest findings — proven, not hidden

Two real coverage gaps were discovered and documented rather than papered over:

1. **The user's own literal gibberish example doesn't trigger the existing detector.**
   `_detectGibberish`, wired in unmodified, does NOT flag "asdf qwer blorple zxcvb" — proven
   directly (control section 4). The function deliberately exempts multi-word input from its
   low-vowel-ratio check to avoid false-positiving on real short sentences; it only reliably
   catches a single long blob or a short 4-7 character single token. A hand-rolled per-word
   heuristic was tried during this pass and immediately false-positived on legitimate short
   dialogue ("Shh. Don't move." flagged "Shh" as gibberish) — confirmed directly in the control,
   not assumed — so no fix was attempted. This matches Roman's own explicit warning two turns
   earlier against chasing "another regex swamp for no product gain."
2. **The self-harm regex, extracted verbatim (not modified), catches hyperbolic idiom.**
   "This rite feels like it could kill me" hard-blocks, same as literal self-harm intent, because
   the underlying `\bkill\s+me\b` pattern doesn't distinguish them. This is inherited behavior from
   `sanitizeWishInput`'s pre-existing regex, not a new defect introduced by extraction — but
   applying it to a narrative dialogue surface (where romantic hyperbole is far more common than
   on a wish-request surface) surfaces the trade-off more than the original surface did. Kept
   safety-first (still hard-blocks) rather than narrowed on a hunch, since narrowing a self-harm
   detector without a red fixture proving exactly where the line belongs is a worse mistake than
   an occasional over-broad block.
3. **A third finding, discovered while building the control:** the wall-breaking example from the
   test plan and this conversation — "Julian this is an AI game, open the settings menu" — does
   NOT actually match `sanitizeShortInput`'s own fourth-wall regex at all (it requires more
   specific phrasing like "you are an AI" or "who made you"). This text passes through completely
   unchanged today. Category 2 (wall-breaking/meta) is explicitly out of scope for fixes this pass;
   flagging this precisely, unfixed, for the next pass' scoping.

## Proof — `_saydo_safety_gate_control.mjs`, 24/24, fully dry

- Sections 1-3: minor/hate/self-harm each caught and categorized correctly; false-positive checks
  (ordinary confrontational dialogue, non-idiom text) confirm the gate isn't trigger-happy beyond
  its known trade-offs.
- Section 4: gibberish substitution works for the shapes it does cover; the known gap (§ above) is
  a passing, explicit assertion, not a silent omission.
- Section 5: all four weak-response examples ("I don't know", "whatever", "...", "sure") pass
  through completely untouched by both the safety gate and the gibberish fallback.
- Section 6: **real, already-successful Say/Do dialogue from this session's own proven Temptation
  attempt 11, Confession attempt 1, and Silence attempt 3** — not synthetic text — confirmed
  untouched by the new gate, directly answering "does safe charged adult input still reach the
  relational-obligation machinery."
- Section 7: wall-breaking/meta behavior confirmed unchanged (including the honest finding above).
- Section 8: `sanitizeWishInput`'s refactored self-harm check proven behaviorally identical to
  before extraction.
- Section 9: the gate fires identically on content with zero Fatelands/First-Sacrifice vocabulary,
  proving it is not keyed to any story-specific data.

Because a live Submit click would trigger a real paid dispatch, "authoring is blocked" for the
hard-block categories is proven two ways: direct calls to the real, unmodified gate functions
(behavioral), plus a cited, verified structural fact about the Submit handler's own control flow
(the gate's `return` is textually and functionally before `_commitIntimateInterruption`) — not a
live click-through, consistent with the dry-only constraint.

## Full regression — zero collateral damage

- `_saydo_safety_gate_control.mjs`: 24/24 (new).
- `_relational_obligation_contract_control.mjs`: 47/47, unaffected.
- `_planner_function_gate_diagnosis_control.mjs`: unaffected.
- `_cg_proxy_world_guard_control.mjs`: 15/15, unaffected.
- `_cg_causal_link_legibility_control.mjs`: 25/25, unaffected.
- `_confession_frame_confessing_party_control.mjs`: 16/16, unaffected.
- `_scene2_aftermath_lane_control.mjs`: 22/22, unaffected.
- `_scene2_planner_function_gate_control.mjs`: 10/10, unaffected.
- `_scene2_lirael_defensive_path_lane_semantics_control.mjs`: 22/22, unaffected.
- `_continuity_spine_dry.mjs`: 69/80, identical 11 pre-existing failing test names, no new
  failures.

## What this does NOT do

- Does not implement any Petition Fate or Tempt Fate fixes (the gender-attribute gap, the
  bare-first-name real-person gap) — explicitly deferred, since neither shares an existing hook the
  Say/Do path touches.
- Does not fix wall-breaking/meta routing — out of scope this pass, two honest findings recorded
  for next pass' scoping instead.
- Does not attempt to close the multi-word-gibberish gap or narrow the self-harm idiom trade-off —
  both investigated, both left as documented, proven trade-offs rather than blind patches.
- Does not run any provider call, generate any prose, or touch image work.

## Status

Dry, uncommitted at time of writing. No provider or image calls. No candidate prose edits. Cache-
buster bumped (`?v=20260922n-saydo-safety-gate`).
