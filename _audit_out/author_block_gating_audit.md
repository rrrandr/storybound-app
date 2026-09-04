# Author-payload block gating audit (source + captured route)

Scope: free, read-only. No prompt changes, no model changes, no scaffolding, no live calls.
Evidence: `public/app.js` source at HEAD + the existing block census in
`_audit_out/routing_audit.json` (labels/bytes/hashes only — no prose stored).

## 0. Correction to earlier size attribution

The census segments the payload label-line → next-label-line. Segments named
`END X` therefore hold the material that FOLLOWS block X, not block X itself.
Two figures I reported earlier were misattributed:

| Block | Reported earlier | Actual |
|---|---|---|
| STORY SCAFFOLD | 29,233 B | **458 B** (`STORY SCAFFOLD` 79 + `ISSUE ARCS:` 379) |
| SCENE 1 MANDATED FRAME | 5,951 B header / 47,423 B | **5,950 B**, and the 47,422 B belongs to the enclosing onboarding block |

Captured author payload: system 157,651 B + user 212,324 B = **369,975 B**.
(The earlier 326,742 B total came from a different capture; the two are not
reconciled and I am not treating either as superseding the other.)

## 1. SCENE 1 ONBOARDING ORCHESTRATION — **accidentally unconditional**

- Call site: `app.js:256413`, inside `handleBeginStory` (`app.js:253542`).
- `var _s1i = buildScene1IntroPrompt(...); if (_s1i) _scene1Appendix = ...`
- `buildScene1IntroPrompt` (`app.js:152574`) has **no early return** anywhere
  between its head and its single `return \`Write Scene 1 of this story. ...\``
  at `app.js:153296`. Verified by scanning that whole range for
  `return ''|""|null|;` — zero hits.
- Therefore `_s1i` is always a non-empty string and the `if (_s1i)` guard is
  never false. The block is Scene-1-scoped only because its caller is
  `handleBeginStory`; there is no onboarding-count, world, or mode gate.
- Size: census idx 41–43 = 18,159 + 5,950 + 47,422 = **71,531 B** —
  33.7% of the user prompt and the single largest block in the payload.

## 2. SCENE 1 MANDATED FRAME — **conditionally relevant, but the condition is bypassed on every non-production host**

- Emitted inside the block above, at `app.js:153087`, as
  `_shouldMandateSceneOneDeckFrame() ? (function(){...})() : ''`.
- `_shouldMandateSceneOneDeckFrame` (`app.js:22548`) in evaluation order:
  1. `window._forceDeckMandate === true/false` → forced;
  2. `storyId.startsWith('exp_')` → OFF;
  3. `state.fateMode === 'famous_fate'` → OFF;
  4. **`_isQaHost()` → ON, returning before any onboarding check**;
  5. `!state.fateAnchorPresent` → OFF;
  6. `count = _getStoriesOnboardedCount(); return count === 0 || count === 2`.
- `_isQaHost()` (`app.js:7745`) is true for `localhost`, `127.0.0.1`, **and any
  `*.vercel.app` host**. So the documented "first 3 stories" scope (step 6) is
  reached only on the production domain; on localhost and on every Vercel
  preview deployment the frame is unconditionally ON.
- Size: **5,950 B**.

## 3. FATELANDS FIRST-STORY WISH DEMONSTRATION — **conditionally relevant; second gate is tautological; first gate bypassed in dev**

- Builder `_buildFatelandsWishDemoOpenerDirective` (`app.js:59228`), emitted at
  `app.js:59242`. Two guards:
  1. `!_fatelandsWishDemoActive(s)` → `''`
  2. `s._openingTemperature !== 'HOT_CRISIS'` → `''`
- `_fatelandsWishDemoActive` (`app.js:57606`): requires
  `picks.world === 'Fantasy'`, `!s.turnCount` (Scene 1 only), and
  `!localStorage['sb_witnessed_fatelands_wish_ritual'] || isDevMode()`.
- `isDevMode()` (`app.js:6507`) is true on `localhost`/`127.0.0.1`/`*.local`/
  `window.__DEV__` — so the "first-ever Fatelands story" condition is bypassed
  in dev, which is the state the capture ran under.
- **Guard 2 is not independent.** `_pickOpeningTemperature` (`app.js:57619`)
  sets `_openingTemperature = 'HOT_CRISIS'` precisely when
  `_fatelandsWishDemoActive(s)` is true (`app.js:57626-57628`). Guard 1 true
  implies guard 2 true unless `_openingTemperature` was already set to
  something else by an earlier caller. The "double gate" is one gate.
- Size: **42,928 B** — the last block of the user prompt.

## 4. FATELANDS — WISH ADJUDICATION — **accidentally unconditional at story scope**

- Builder at `app.js:219266`; internal gate
  `var _aOn = !!force || _FATELANDS_WISH_RESOLVE_RX.test(String(sceneText||''));`
- Call site `app.js:220905` passes `force = _wplWishInPlay`
  (`app.js:220845` = `_wplUnderwaterWish || _cgPetitionResolved || _wplVolatile`)
  and `sceneText = _ltScene`.
- **`_ltScene` is not the scene.** With the spine signal off (default —
  `window._canonGateSpineSignal !== true`), `app.js:220861` gives
  `_ltScene = _ltBase = state.currentCrisis + ' ' + aPlot.antagonistOrAntiForce + ' ' + aPlot.goal`
  — a **story-level** string that is identical for every scene of the story.
- `_FATELANDS_WISH_RESOLVE_RX` (`app.js:219056`) matches, among others,
  `sacrific\w*`, `the price`, `grant(ed|s|ing)`, `fate (took|demands|refus…)`.
  For a story whose crisis/goal text contains any of those words — "First
  Sacrifice" being the obvious case — the block's own header claim ("loads
  only when the scene RESOLVES a wish") is false: it loads on **every scene**
  of that story.
- The same `_ltScene` feeds `_wishDepicted` (`app.js:220870`) and the WISH
  AUTHORING CORE block, so the same story-scope leak applies there.
- Sizes: adjudication **21,175 B**, core **6,365 B**.
- Not separately instrumented: which of `force` vs. regex actually fired in the
  captured run. Source makes the regex path the likely one, but I did not prove
  it and am not asserting it.

## 5. STORY SCAFFOLD / END SCAFFOLD — **conditionally relevant, and near-empty here**

- `_renderCGScaffoldBlock` (`app.js:215626`) returns `''` when
  `state.cgScaffold` is falsy. Two call sites: `buildLiteraryScaffoldDirective`
  (`app.js:215730`) and the system-prompt builder (`app.js:217307`).
- In the captured run the block rendered **458 B** — only `runThesis`-class
  fields and one `ISSUE ARCS:` line survived the per-field `if`s. The 29,232 B
  attributed to it earlier is unrelated trailing system-prompt material.

## Summary

| Block | Bytes | Classification |
|---|---|---|
| Scene 1 onboarding orchestration | 71,531 | accidentally unconditional (no gate; only its caller scopes it) |
| Fatelands first-story wish demonstration | 42,928 | conditionally relevant; 2nd gate tautological; 1st bypassed on dev hosts |
| Fatelands wish adjudication (+ core) | 21,175 (+6,365) | accidentally unconditional at story scope — gated on story text, not scene text |
| Scene 1 mandated frame | 5,950 | conditionally relevant; onboarding-count scope bypassed on localhost and *.vercel.app |
| Story scaffold | 458 | conditionally relevant; already near-empty |

None of the four is *required* in the strict sense of "the scene cannot be
authored without it". The two largest — 114 KB combined, 31% of the payload —
enter through a missing gate and a self-satisfying gate respectively.
