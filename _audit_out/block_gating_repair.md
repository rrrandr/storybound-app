# Author-payload gating repair — three gates, proven through the real builder

Follow-on to `author_block_gating_audit.md`. No models changed, no prompts changed beyond
the three gates, no live dispatch. `app.js` sha256[0:16] recorded with the run below.

## The three repairs

### 1. Onboarding scope now applies in every environment
`_shouldMandateSceneOneDeckFrame` (`public/app.js:22548`) returned `true` unconditionally
once `_isQaHost()` was true — and `_isQaHost()` covers `localhost`, `127.0.0.1` **and every
`*.vercel.app` host**. The documented "first 3 stories" rule (`count === 0 || count === 2`)
was therefore unreachable outside the production domain, and the mandated frame shipped on
every story in dev and on every preview deploy.

The QA-host branch is removed. The story-count rule now decides everywhere. Dev/QA testing
keeps a lever: `window._forceDeckMandate = true` is still checked at the top of the function,
so opting in is explicit rather than ambient.

### 2. Wish adjudication now depends on a per-scene signal, never text

New `_fatelandsWishResolvesThisScene(state)` (`public/app.js:219255`) — the single
authority, reading state only, no prose:

| signal | scene-scoped because |
|---|---|
| `_resolveCGPendingPetition()` non-null | it returns null and clears the petition unless `resolvedAtScene === turnCount` (`app.js:218255`) |
| underwater wish live | derived from the CURRENT `fantasyRegion` resolving to `gloamwater_bay` with a human present |
| `state.volatility_window.active` | the window decays through `remaining_scenes` |

`_buildFatelandsWishAdjudicationDirective` now gates on `!!force || _fatelandsWishResolvesThisScene()`.
The `_FATELANDS_WISH_RESOLVE_RX.test(sceneText)` arm is gone.

**This is why it mattered.** Four call sites fed that regex a *story-level* string. Three of
them (`app.js:255910`, `300512`, `305425`) passed no `force` at all, so the regex was the
only gate — and the Scene-1 site additionally concatenated `state.immutableTitle` and
`picks.synopsis`. `_FATELANDS_WISH_RESOLVE_RX` matches `\bsacrific\w*`. The story is titled
*The First Sacrifice*, so the ~21 KB block loaded on **every scene of the story because of
its title**. The B2 arm below proves the story text is unchanged and only the rule moved:
production's own emission log still reports `openWithoutSpine=true` (the old signal would
still fire) while the gate now reads `closed`.

No signal was invented. These three were already the codebase's per-scene wish authorities —
they are exactly the terms of `_wplWishInPlay`, which the CG call site already passed as `force`.

### 3. The wish-demonstration gate is no longer tautological
`_buildFatelandsWishDemoOpenerDirective` (`app.js:59212`) tested
`_openingTemperature !== 'HOT_CRISIS'` immediately after testing `_fatelandsWishDemoActive(s)`.
`_pickOpeningTemperature` sets `_openingTemperature = 'HOT_CRISIS'` **precisely when**
`_fatelandsWishDemoActive(s)` is true (`app.js:57626`), so the first guard caused the second
to pass. Replaced with the one thing this guard can independently decide:

```js
if (s._openingTemperature && s._openingTemperature !== 'HOT_CRISIS') return '';
```

Some *other* authority (e.g. the A-plotectomy COLD override) having pinned a non-hot opening
is a real, independent fact. An unset temperature is no longer treated as a rejection.

## Proof — `_block_gating_proof.mjs`, 48 assertions, 0 failed

Ten runs of the **real** Scene-1 path (`window.handleBeginStory` → real prompt assembly →
real `/api/proxy` dispatch, intercepted). Every arm asserts `escaped === 0` and
`authorCalls === 1`: nothing left the fence, and each measurement comes from one real
outgoing author payload. The planner/A-plot/scaffold responders are sliced at load time out
of the committed `_scene1_skeleton_delivery.mjs` preamble rather than re-written, so this
harness and that suite cannot drift into two different fixtures wearing one name.

| arm | declared condition | block |
|---|---|---|
| A1 | build-time onboard count 2 → rule says ON | MANDATED FRAME **present** |
| A2 | build-time onboard count 4 → past onboarding | **absent** |
| A3 | count 4, **pre-fix QA bypass restored** | **present** ← control bites |
| B1 | volatility window active this scene | WISH ADJUDICATION **present**, `gate=OPEN` |
| B2 | no per-scene signal (title still says Sacrifice) | **absent**, `gate=closed`, `openWithoutSpine=true` |
| B3 | no signal, **pre-fix story-text regex restored** | **present** ← control bites |
| C1 | demo active, opening temperature unpinned | WISH DEMONSTRATION **present** |
| C2 | COLD pinned by another authority | **absent** |
| C3 | COLD pinned, **pre-fix tautological gate restored** | **absent** — agrees with C2 |
| N0 | identical staging to B2 | noise-floor null arm |

Each verdict is cross-checked against **production's own decision record**, not only against
block presence: `[DECK_MANDATE] ON/OFF — story onboard count=N` and
`[EMIT] WISH_ADJUDICATION gate=OPEN/closed`.

Every control enforces `targets === 1` (exactly one site restored), asserts the served bytes
actually changed, and parses the mutated source with `vm.Script` before serving it.

**The onboarding counter moves mid-run.** `_incrementStoriesOnboardedOnce()` bumps
`sb_stories_onboarded` once per story *before* the Scene-1 prompt is assembled, so the value
the gate reads is start+1. The arms are staged by what the gate will see; both reads are
printed under each arm.

### Byte figures

Exact block sizes, measured in the payload that carried them:

| block | bytes | how bounded |
|---|---|---|
| SCENE 1 MANDATED FRAME | **5,997** | its own `═══ END SCENE 1 MANDATED FRAME ═══` banner |
| FATELANDS — WISH ADJUDICATION | **20,894** | production's own builder, forced (the text is static) |
| FATELANDS FIRST-STORY WISH DEMONSTRATION | **42,928** | banner → end of user prompt (rotation-variable) |

Whole-payload deltas are **confounded** — each arm is a fresh story with its own exemplar
rotation. A null arm (N0, staged identically to B2) measures that noise floor at
**9,609 B**, so:

| comparison | Δ payload | verdict |
|---|---|---|
| deck A1 → A2 | −4,793 B | **within noise — not attributable** |
| adj B1 → B2 | 18,430 B | above noise |
| demo C1 → C2 | 52,044 B | above noise |
| A3 (pre-fix) vs A2 | −9,314 B | within noise |
| B3 (pre-fix) vs B2 | +31,217 B | above noise |

The attributable per-block figure is the exact table above; the whole-payload column carries
±9,609 B of unrelated rotation and should not be quoted as the saving.

**What this removes from a Fatelands Scene 1 that resolves no wish: 20,894 B, always.** For
every later scene of such a story the same 20,894 B was also loading, and no longer does.
The 5,997 B frame now stops after the third story instead of never stopping in dev/preview.

## What was NOT changed
- `_buildFatelandsWishCoreDirective` reads the same story-level `_ltScene` through
  `_FATELANDS_WISH_PRESENT_RX` and has the same shape of leak. It is a different block
  (6,365 B) and was outside this repair's scope; flagging it, not touching it.
- The SCENE 1 ONBOARDING ORCHESTRATION wrapper (71,531 B, no gate at all) is untouched —
  it needs a policy decision about *when* onboarding orchestration should apply, not a
  gate repair.

---

# Part 2 — Scene 1 onboarding orchestration (the 71 KB wrapper)

**Decision (Roman, 2026-09-04): onboarding orchestration applies to stories 1 and 3 only —
the existing count rule `0 || 2` — in every environment.**

## 4. One explicit onboarding predicate

`_scene1OnboardingActive()` (`public/app.js:22498`), with `_scene1OnboardingStartCount()`
beside it. It is **not** derived from `_shouldMandateSceneOneDeckFrame()`: that function
answers a different question (should this scene's first and last sentences be dictated) and
carries its own overrides. Its development override is its own separate flag,
`window._forceScene1Onboarding` — nothing about `_forceDeckMandate` moves it.

The wrapper is gated at `app.js:256470`:

```js
var _s1i = buildScene1IntroPrompt(...);                       // still called, every story
var _s1OnbOn = _scene1OnboardingActive();
if (_s1i && _s1OnbOn) _scene1Appendix = '…ONBOARDING ORCHESTRATION…' + _s1i;
else if (_s1i) console.log('[S1_ONBOARDING] orchestration text withheld … (N B)');
```

**The function is still called on every story.** It is invoked for its side effects as much as
its text: it sets `_scene1OpeningPatternId` (and saves the opening fingerprint),
`_scene1LIOnStage`, the micro-expression axis, and
`_sceneOneMandatedOpener`/`_sceneOneMandatedCloser`, which `_enforceScene1MandatedFrame` and
the micro-expression hydrator read afterwards. Skipping the call to save the bytes would have
silently disabled that machinery for stories 2 and 4+. Only the *text* is gated.

## 5. The count was read one story too late — corrected

`_incrementStoriesOnboardedOnce()` bumps `sb_stories_onboarded` from **inside a Scene-1
directive builder** (`app.js:22116`), i.e. part-way through prompt assembly. Any live read
after that point returns the story-start count **plus one**.

`_shouldMandateSceneOneDeckFrame` was doing exactly that. Its documented rule
`count === 0 || count === 2` was therefore landing on **stories 2 and 4**, not the stories 1
and 3 it describes. Observed directly: with `sb_stories_onboarded = 1` at boot, production
logged `[DECK_MANDATE] ON — story onboard count=2`.

Both rules now read `_scene1OnboardingStartCount()`, which prefers the `_onboardingStoryOrdinal`
that `_incrementStoriesOnboardedOnce` already stashes for this exact reason (`ordinal - 1` is
the story-start count) and falls back to the live count before the bump.

**This is a behaviour change, and it is the point of the fix:** the deck onboarding ritual now
fires on the player's 1st and 3rd stories instead of their 2nd and 4th.

It was also *necessary*, not incidental. The mandated frame is emitted **inside** the
orchestration wrapper. With the two rules one apart they disagreed on every story, so the
frame was built and then withheld — the first full run after gating the wrapper failed three
deck assertions for exactly that reason. `_onboardingStoryOrdinal` is cleared in
`_resetStoryState` so the next story cannot inherit the previous story's number.

## 6. Proof — 84 assertions, 0 failed

Seventeen real Scene-1 runs. New arms:

| arm | story-start count | host | result |
|---|---|---|---|
| D0 | 0 → Story 1 | localhost | **present** |
| D1 | 1 → Story 2 | localhost | **absent** |
| D2 | 2 → Story 3 | localhost | **present** |
| D3 | 3 → past onboarding | localhost | **absent** |
| D4 | 0 | **`sb-preview-proof.vercel.app`** | **present** — identical to D0 |
| D5 | 1 | **`sb-preview-proof.vercel.app`** | **absent** — identical to D1 |
| D6 | 3, **pre-fix ungated append** | localhost | **present** ← control bites |

D4/D5 are served under a real `*.vercel.app` origin, so `location.hostname` inside the page is
genuinely a preview host and `_isQaHost()` is genuinely true there — the arm asserts both
before comparing. No host exemption exists.

Also asserted: a deck frame can never be present while the wrapper is absent (they read one
count now), and the onboarding verdict is logged from its own predicate with its own reason.

The A3 control had to be widened. Restoring the QA-host bypass alone can no longer express the
frame, because the wrapper gate would withhold it — so that control now restores **both**
pre-fix behaviours, with each target independently required to match exactly once.

### Byte figures

| block | bytes | how bounded |
|---|---|---|
| SCENE 1 MANDATED FRAME | 5,997 | its own END banner |
| FATELANDS — WISH ADJUDICATION | 20,894 | production's builder, forced (static text) |
| FATELANDS FIRST-STORY WISH DEMONSTRATION | 42,928 | banner → end of user prompt |
| SCENE 1 ONBOARDING ORCHESTRATION | 72,931 | banner → next top-level block, including the frame it nests |

**The saving is not 73 KB.** On an *included* story (1 and 3) the deck mandate is on too, so
the wrapper carries the mandated-frame branch and is ~73 KB — that is the intended payload,
now correctly scoped rather than universal. On an *excluded* story that branch was never going
to render, so what is actually removed is the mandate-free intro: production reports
**33,247 B withheld on D1 and 33,161 B on D3** — its own count, stable to within 0.3% across
two excluded stories. Quoting 73 KB as the saving would be reading the wrong arm.

## 7. Frozen evaluation artifacts no longer churn

`_auditor_eval_blinded.mjs` rewrote `_audit_out/eval_blind_pack.json` and `eval_sealed_key.json`
on every run, stamping a fresh `builtAt` into the working tree each time the suite executed. An
audit artifact that moves because a test ran is one nobody can tell has been tampered with.

The timestamp churn is reverted, and `writeFrozen()` now compares content with `builtAt`
excluded and **writes only when the substance differs**, carrying the prior timestamp over
otherwise. Two new assertions (E5a, E5b) fail if a no-op run touches either file. Verified:
after the entire regression sweep both files are clean in `git status`.

---

## Run record

- `public/app.js` sha256[0:16] = **e06958b61ac78ea0**
- `node --check public/app.js` → OK · cache-buster `?v=20260904b-onboarding-scope`
- target lines present: `_scene1OnboardingActive` = YES · `var count = _scene1OnboardingStartCount()` = YES
- old lines absent: QA-host deck bypass · `_aOn = !!force || _FATELANDS_WISH_RESOLVE_RX` · ungated `if (_s1i)` append

### Full regression, this revision

| suite | result |
|---|---|
| `_block_gating_proof` (new) | **84 · 0** |
| `_scene1_skeleton_delivery` | 369 · 0 |
| `_pending_admission` | 66 · 0 |
| `_cplus_scheduler` | 58 · 0 |
| `_cplus_multifacet` | 52 · **1** (pre-existing) |
| `_cplus_eligibility` | 46 · **1** (pre-existing) |
| `_cplus_canon_auditor` | 40 · 0 |
| `_cplus_canon_wiring` | 33 · 0 |
| `_cplus_continuity_store` | 32 · 0 |
| `_cplus_canon_projection` · `_cplus_canon_repair` | 29 · 0 each |
| `_cplus_disclosure_bridge` | 22 · 0 |
| `_cplus_canon_gate` | 21 · 0 |
| `_continuation_turn_driver` | 20 · 0 |
| `_cplus_development_authorizer` · `_continuation_cplus_realpath` · `_generated_stage_contract` | 19 · 0 each |
| `_cg_canon_ownership` | 17 · 0 |
| `_turn_concurrency` | 15 · 0 |
| `_cplus_resurfacing` · `_issue2_carry` | 14 · 0 each |
| `_xai_usage_ledger` | 12 · 0 |
| `_auditor_eval_blinded` | 11 · 0 (was 9; +E5a/E5b) |
| `_canon_sequence_wiring` · `_attempt_interleave` | 11 · 0 each |
| `_canon_snapshot_scope` | 9 · 0 |
| `_auditor_eval_dry` | 7 · 0 |
| `_cplus_option_contract` | 6 · 0 |
| `npm run verify:*` (scene1, content-register, causal, geo, sacred, baked, economy) | all PASS |

`_cplus_multifacet` 52·1 and `_cplus_eligibility` 46·1 were verified pre-existing by stashing
`public/app.js` back to HEAD (`b3eb7505474937f5`) and re-running: identical counts.

After the complete sweep, `_audit_out/eval_blind_pack.json` and `eval_sealed_key.json` are
clean in `git status`.

No live call was made at any point.
