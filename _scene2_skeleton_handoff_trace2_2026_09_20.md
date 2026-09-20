# Scene 2 Continuity + Canon — Trace and Fix, Part 2 (2026-09-20)

Roman, after reading retry-3's PDF read-through: "Retry 3 is not a prose-quality near miss. It
failed on immediate continuity and canon ingestion." Three findings, each traced against real code
and real data (not assumed), each fixed dry.

## Finding 1 — Scene 1's concrete end-state exists and IS wired in real production; the REPLAY SCRIPT was the actual gap

The real, canonical Scene 1 package (`public/starter-scenes.js`,
`STARTER_SCENE1.starter_first_sacrifice.emitted`) states, verbatim:

- `openState.pcCondition`: "mouth-band torn away, ceremonial sash still on, publicly accused,
  holding The Answer..."
- `obligations`: "Julian... has ALREADY questioned her before the assembly... It happened; it is
  not re-staged."

This is real, already-authored continuity data — not missing. `_hydrateBakedStoryState(pkg)`
(`public/app.js` ~138010) sets `state._bakedEmitted = pkg.emitted` and is called from the real
display path (~137761), when the baked Scene 1 is shown — well before any player interaction.
`STARTER_PLANS.starter_first_sacrifice.scenes[n=2].aftermathSource === 'baked_emitted'`, so the
Scene 2 planner's OPEN ROW code (~99518) already has a gate written for exactly this data.

**Confirmed by direct dry probe** (setting `state._bakedEmitted` the same way `_hydrateBakedStoryState`
would, then running the real, stubbed pipeline through to the planner dispatch): when populated,
the planner's prompt correctly receives "mouth-band torn away", "her condition now", and the "not
re-staged" obligations, verbatim.

**The actual gap: `_scene2_repair_replay_sample.mjs`** — the script used for all three real retries —
never called the equivalent of `_hydrateBakedStoryState` (it isn't exposed on `window`, and the
script's own state setup never reproduced its one load-bearing effect). `state._bakedEmitted` stayed
`null` across retries 1, 2, AND 3. This is a real replay-harness bug, not a confirmed production bug
— but it means all three retries' planners ran on an artificially impoverished prompt, and retry-3's
mouth-band continuity break is at least partly an artifact of that gap, not proof production would
do the same for a real player.

**Fix:** `_scene2_repair_replay_sample.mjs` now mirrors the one field that matters:
`state._bakedEmitted = window._bakedScene1For('starter_first_sacrifice').emitted`, set alongside the
existing scaffold seeding, before Submit.

## Finding 2 — the live OAS exchange never reaches the Scene 2 planner, in the harness OR real production

Confirmed by direct code trace: the Scene 2 planner's OPEN ROW prompt-building code
(`_generateLiteraryPlotContract`, `app.js` ~99513-99560) never read `state.intimacyDialogue` at all
— only the final submitted action/dialogue line via `_recordScenePosture`, with zero summary of what
was actually said during the live flirty back-and-forth (Julian's actual reply, her actual response).

A first fix attempt read `state.intimacyDialogue.liTurnHistory` directly — this was wrong.
`_resolveIntimacyScene` (`app.js` ~199380), the function that ends the OAS scene and hands off to
Submit, sets `state.intimacyDialogue = null` before the planner ever runs — confirmed by direct
dry-run diagnostic (the live object is already gone by the time the planner's code executes), true
in both the test harness and real production, since `_resolveIntimacyScene` is production code, not
harness-specific.

The correct, already-existing, durable source: `_resolveIntimacyScene` also builds
`state._oasSceneSnapshots[sceneIdx]` (~app.js 199290-199335) — an archive built from
`d._oasArchiveBuilder` *before* the null-out, specifically so Back-nav can replay the OAS scene
later. Each archived beat carries `pcSay`/`pcDo`/`liDialogue`/`liAction` — exactly the shape needed.
This mechanism already existed; the planner simply never read it.

**Fix:** the OPEN ROW planner prompt now reads the most recent `state._oasSceneSnapshots` entry and
renders its last 3 beats as a "RECENT OAS EXCHANGE" block, inserted before the reader's Say/Do line
— mirrors, in shape, the Fate-card generator's own pre-existing `_authoredOASBlock` precedent
(`orchestration-client.js` ~6753), which already does the equivalent for Fate-card previews (reading
`liTurnHistory` directly, since that function runs *before* `_resolveIntimacyScene` nulls it — timing
difference explains why the Fate-card generator never hit this bug and the planner did).

## Finding 3 — the Fate-card generator has zero worldTruths/canon channel

`orchestration-client.js`'s `generateIntimateFatePreviewsBatch()` (the function that produced "I
want you to burn for me, as the First-Favored did for the old gods") and its sibling
`generateIntimateFatePreview()` (single-card path) — confirmed by direct code trace across their
full prompt-building bodies — have no call to `_activeSeed`, no reference to `worldTruths`, and no
Fatelands-specific cosmology guard anywhere.

This matches an existing, disclosed, not-yet-wired canon fact (session memory
`project_fatelands_oaths_and_idioms.md`, Roman 2026-09-19): "there is no God in the Fatelands, only
Fate... real-world religious idioms are off-canon," with a confirmed replacement set ("Fate drag you
to The Hole", "Thank Fate", "twisted" for "damned"). The memory itself named the precedent to follow:
the existing DIEGETIC WORLD NAMING pattern for Glass House — a static "GLASS HOUSE IS CONTEMPORARY
MODERN SPEECH... BANNED in Glass House fate previews: aperture, resonance..." block that already
ships, unconditionally present in the prompt text (not runtime-gated; the model applies it by
matching the active world).

**Fix:** a parallel "FATELANDS HAS NO GOD, ONLY FATE" block added to both fate-preview prompt
builders, banning god/gods/goddess/deity/deities/divine/heaven/hell/pray/blessed/cursed/damned and
naming the real in-world replacements, matching the Glass House block's exact shape and placement.

## New reject-only detectors (generic mechanism, story contributes specific canon)

Two additions to `_detectSceneAdequacyFailure` (`app.js`, near `STARTER_PROTECTED_RELICS`):

- **`STARTER_COSMOLOGY_BANS`** / `_detectFatelandsCosmologyViolation` — per-starter regex ban list;
  First Sacrifice's entry bans the same religious-vocabulary set as the prompt-level fix. Checks
  BOTH Fate-card preview text and generated scene prose. Inert for any starter with no registered
  entry — not First-Sacrifice-specific plumbing.
- **`STARTER_ESTABLISHED_OBJECT_STATES`** / `_detectEstablishedStateReversion` — per-starter registry
  of objects whose already-established state a new scene's OPENING beats must not silently restage.
  First Sacrifice's entry: the mouth-band, `priorState: 'removed'`, sourced from the same canonical
  `emitted.openState.pcCondition` text Finding 1 traces. Scoped deliberately narrow (opening beats
  only) — the specific, evidenced failure shape (restaging an already-happened removal as if it were
  new), not a general "no object may ever be mentioned again" rule.

Both are reject-only, telemetry-style, generic-shaped, and folded into `_detectSceneAdequacyFailure`'s
existing verdict alongside the earlier aftermath/relic/ending checks.

## Not built — retread-detection for the pre-OAS accusation

Roman's third validation ask ("fail if Scene 2 reopens/retreads the pre-OAS accusation") is not
encoded as a new reject-only detector. Judging whether a scene "retreads" prior content is a semantic
comparison, not reliably regex-doable, and a weak detector here risks being ad hoc/fragile in the
same way an earlier, too-narrow vocabulary check had to be widened this session. Addressed instead at
the prompt level: Finding 1's "not re-staged" obligations and Finding 2's live-exchange block both
now reach the planner, which is where the actual re-treading originated. Disclosed, not force-fit.

## Proof

13/13 dry, `_openrow_planner_worldtruths_control.mjs` (unaffected, re-run green). 15/15 dry, new
`_scene2_continuity_canon_control.mjs`:
- RED:MOUTHBAND — retry-3's real delivered beats are flagged by `_detectEstablishedStateReversion`.
- RED:COSMOLOGY — the real leaked Fate-card text is flagged by `_detectFatelandsCosmologyViolation`.
- GREEN — a synthetic consequences-shaped scene on the same Boundary posture clears both new checks
  and the pre-existing aftermath-signal check.
- GENERIC — an unregistered starterId is unaffected by both mechanisms, even against the real
  retry-3 fixture and real religious vocabulary.
- PROMPT:OAS — the real open-row planner dispatch (same Boundary/Say-Do reproduction as prior
  controls) now includes RECENT OAS EXCHANGE, sourced from the real `_oasSceneSnapshots` archive,
  alongside IMMUTABLE AFTERMATH (Finding 1's fix) coexisting correctly.
- HARNESS — confirms the replay script's fix via source inspection.

Root causes A, B, C's existing controls (8/8, 12/12, 13/13) re-run green — none of today's additions
touch the author-side prompt builders those cover.

## Status

Dry, committed, generic. No provider or image calls made in this pass. Retry-3's own report has been
corrected in place (`_scene2_capability_retry3_report_2026_09_20.md`) — it no longer claims
priorities 1-3 "passed cleanly." Per Roman's explicit instruction, no further paid retry until these
fixes are in place and proven — which they now are; a fourth retry, if and when authorized
separately, would be the first real test of a planner that has canon, live-exchange history, and
world-truth grounding all reaching it before it invents an event.
