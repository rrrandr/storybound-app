# Tempt Fate — sixth pass: antagonist Body Bible scope bug fixed, not just diagnosed

2026-09-24 (session-dated 2026-09-23 per repo convention), sixth same-day pass. Roman (pass 4):
"Before authorizing the memory-erasure run, Claude should state plainly whether that function is
structurally bypassed by First Sacrifice's fixed seed data in this exact Scene A → Scene B path. If
it is, the live test can proceed and the defect should be logged separately. If it can execute
during this run, fix it first." No paid calls made.

## 1. Reachability could not be dry-proven either way — so the bug was fixed, not assumed bypassed

Traced `_generateAntagonistBodyBible`'s real caller: it fires unconditionally from the real CG
scaffold path (`app.js` ~232120-232128, inside `_completeStagedSceneFromScreenplay`'s scaffold-ensure
block) alongside the PC/LI Bibles, gated only by `!state.antagonistBodyBible`. The line immediately
above it calls `initAPlot({tier: _cgApTier})` (~232102-232108), itself gated only by
`!(state.aPlot && state.aPlot.goal)` — and grepping `STARTER_SEEDS`/`STARTER_PLANS`
(`app.js` 129426-130280) and `public/starter-scenes.js` turned up **zero** seed/Tier-0 fields for
`antagonistShape`/`aPlot` for `starter_first_sacrifice`, unlike the PC/LI Bibles' confirmed Tier-0
shortcut. That means `initAPlot()` genuinely runs for real, unstubbed First Sacrifice play, and
`state.aPlot.antagonistShape` is populated from a real generative response
(`gen.antagonistShape`, `app.js` ~64216) — not something dry-testable, since I cannot make a paid
call to see what the model would actually return.

Whether `_antagonistBibleEligible()` (shape A/B + named PERSON) then passes for First Sacrifice's
real antagonist is exactly the question a dry test cannot answer — the eligibility-gate comment
itself (`app.js`, now ~262701 after relocation) notes Shape-C ("external / systemic / off-page")
antagonists get no Bible by design, which is plausible for an institutional antagonist but not
provable without a live response. Given that genuine, unresolvable-by-dry-testing uncertainty, and
per Roman's own instruction ("an unbilled exception can still derail the test"), the correct action
was to fix the bug now rather than assert bypass on inconclusive evidence.

## 2. The fix

`_ANTAGONIST_ARCHETYPES` and `_ROMANCE_ARCHETYPES_FOR_EX` were `var`s local to `handleBeginStory`
(confirmed pass 5: a ~7300-line function, brace-matched to lines 262896-270219 pre-fix) — a sibling
scope of `_generateAntagonistBodyBibleUncached` (`app.js` ~262697), never visible to it regardless of
boot order. Confirmed both arrays are pure static reference data (archetype taxonomy tables) with no
closure dependency on `handleBeginStory`'s own local state — safe to relocate outward. Moved both
(verbatim, including their `window._X = _X` exports) to the shared outer scope, immediately before
`_generateAntagonistBodyBible`'s own declaration (now `app.js` ~262702/~262725), so the CG-path
generator resolves them directly. `handleBeginStory`'s own literary-mode inner generators — which
read the same two names — are unaffected: moving a variable outward in the scope chain never breaks
inward (closure) access, only the reverse. Left the 2026-06-01 relocation comment and eligibility-gate
comment in place inside `handleBeginStory`, with a new comment there pointing to the actual current
declaration site.

`node --check public/app.js`: clean. Confirmed exactly one declaration and one `window.` export of
each array remains (grep), both preceding both consumers (`_generateAntagonistBodyBible` at 262736,
`_generateAntagonistBodyBibleUncached` at 262745, `handleBeginStory` at 262944).

## 3. A test-methodology bug found and fixed along the way: stale accumulated console logs

The cost-audit script's antagonist-bible section reads `console_log.jsonl` via
`fs.readFileSync(...)` and regex-matches for the documented error text — but the script never
truncates that file between runs (`page.on('console', ...)` uses `fs.appendFileSync`, and
`fs.mkdirSync(OUT_DIR, {recursive:true})` does not clear existing files). The FIRST re-run after
applying the app.js fix still showed the old error matching — not because the fix failed, but
because the file had **6 accumulated occurrences** of the same `[ANT-BODY-BIBLE] generator errored`
line from this session's prior passes (3, 4, 5), and the regex matched leftover text from those,
not this run. Confirmed by clearing `_tempt_fate_memory_erasure_cost_audit_out/` and re-running from
a clean directory — this is standard practice for the harness's own artifact directory already, this
one script section (added in pass 4) had not been carrying it consistently since it was the one
section reading back its own historical log file for content, not tracked-call metadata.

## 4. Re-verified clean, with the real cascade now actually observed

With the fix in place and a clean output directory: `_generateAntagonistBodyBible()` no longer
throws. With this test's baseline (`antagonistShape:'A'`, forcing eligibility to exercise the
mechanism, same as pass 3/4), it now genuinely dispatches the real 3-tier cascade — identical shape
to the scaffold/PC/LI Bible roles (`ministral-8b-2512` → `grok-4-1-fast-reasoning` → `gpt-4o-mini`,
real tracked models confirmed via `gate.trackedCalls`, not asserted). Rewrote the antagonist-bible
test section from a reachability-only proof to the same `runIsolatedRole(...)` pattern used for
bible-pc/bible-li (`allowZeroReal: true`, since the eligibility gate could in principle also produce
a legitimate zero-dispatch shape for a different shape/subject).

**Cost-cap control: 23/23 passed** (was 24/24 pre-fix with the reachability-only section; net one
fewer check because that section's two bug-specific assertions were replaced by the two standard
`runIsolatedRole` assertions — not a regression, a correctly-simplified section now that the role
behaves like every other bible role).

**Revised enforced figure: $0.334112 combined** (was $0.328087 while the antagonist Bible was
correctly zero-cost under the bug; now correctly includes its real $0.006025 worst-case phase,
identical in shape to pass 3's original pre-bug-discovery estimate) — against the $0.40 combined
ceiling, $0.065888 of real headroom.

## Regression

`_tempt_fate_outcome_integration_control.mjs`: **70/70**, unaffected.
`_tempt_fate_memory_erasure_live_test_harness.mjs`: **30/30**, unaffected.
`_tempt_fate_memory_erasure_cost_audit.mjs`: **23/23** (was 24/24; see §4 — a correct
re-simplification, not a regression).

Cache-buster bumped: `public/index.html` `?v=20260924d-antagonist-bible-scope-fix`.

No paid calls, no live sample, no starter content altered, no outcome hand-authored, no images, no
forks used.
