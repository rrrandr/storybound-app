# GENERIC STORY ENGINE — SHARED AUTHOR PATH AUDIT + THE SMALLEST CONTINUITY SPINE · 2026-09-06

Scope (Roman's priority reset): any story path — starter, generated/corridor, assignment-owned,
continuation, Issue boundary, Library copy — must produce prose that remembers characters,
authorized changes, deeds and reputation, advances plot, and does not loop. No predefined casts, no
canon parsed out of prose, authoritative state + page identity only, already-read pages preserved,
fail-closed where identity/fact data is absent. This document is the implementation audit, the
plan, and the record of what was built dry (no provider calls, no routing or model change).

## 1 · The live author paths — with every caller shown

"Shared" below means proven by call sites, not by the helper looking generic. Lines are `public/app.js`
unless prefixed `orch:` (`public/orchestration-client.js`).

| # | path | assembly (author system prompt) | author call site(s) | reaches which story paths | page commit (the moment a page becomes "read") |
|---|---|---|---|---|---|
| 1 | **Literary continuation — heavy** (the prose author, Grok; `_useLite` is false because LIT-LITE is deprecated/unreachable, 70285, and `_promptTier` routes HEAVY/GROK, 301235–301245) | `let fullSys = _sysForTurn + _persistentStableTail + _CACHE_SENTINEL + _buildAuthorFloorDirective(state) + … + sceneDirectives + …` (301279; `sceneDirectives` 298360; inline `_binl_*` blocks 301206–301230) | 302070 (main: `fullSys + skeletonBlock + beatBlock + sceneIntentBlock`), 302044 (legacy single-pass fallback, `fullSys`) | corridor, assignment-owned, seeded starters from Scene 2, Issue 2+ (same handler after `_mountAndTransition`) | 304034 `StoryPagination.addPage(pageContent…)` inside the `submitBtn` click handler (293436); `turnCount++` at 303128 |
| 2 | **Literary continuation — multi-pass pass 2** | `_pass2Sys = state.sysPrompt + _pass2SysSentinel + _skelMP + _persistentCache + …` (301998) | 302009 | same as #1 when the multi-pass branch fires | same as #1 |
| 3 | **Speculative preload** (the "second author": pre-authors the next scene; skipped by `window.__disableSpeculativePreload`, 305773) | its OWN assembly: `state.sysPrompt + _specCacheSentinel + \`\n\n${turnPOVContract}…\`` (306030) — does **not** include `sceneDirectives` or any `_binl_*` | 306097 (and the phase-driven variant above it) | same stories as #1 whenever preload is on | its result is committed through #1's commit when adopted |
| 4 | **Literary Scene 1** (corridor / Famous Fate) | frozen Scene-1 request `_s1Frozen.system/user` (267932; template 256087 "OPENING RULE") — a different builder from #1 (measured 2026-08-15) | 267932 | corridor Scene 1 only | 254472 / 270758 `addPage` inside `handleBeginStory` (253702); `turnCount = 1` |
| 5 | **Baked starter Scene 1** | none — verbatim prose from `starter-scenes.js` | none | the three starters | 134671 `addPage` in `_renderBakedScene1` ("display now, commit at unlock") |
| 6 | **CG / staged screenplay author** | `_buildCGScreenplaySystemPrompt()` (216764) + user prompt (220282) | 224178+ via `StoryboundOrchestration.callChatGPT` | any story in `renderMode === 'staged_story_mode'` | 225088 `state.scenes.push` in `_completeStagedSceneFromScreenplay` |
| 7 | **SD author** (staged mode, Grok) + **Mistral SD fallback** | `orch:3077 callGrokSDAuthor` template (joins `_pcPovDirective`, `_mythicCoupleDir`… at orch:3290) with `_buildSceneAndPlotContext(audience:'author')` (orch:3405); fallback has its own template (orch:3652+) | orch:3077, orch:3652 | staged stories | via #6 |
| 8 | **OAS intimacy exchange** (an interface inside an already-authored scene; no `turnCount` bump) | `_buildIntimacyTurnPrompt` (188900) → `parts.push(...)` | 192155 | any story that enters OAS | none (appends to the current page) |
| 9 | **Issue boundary** | no author of its own: `_mountAndTransition` (98830) mounts the Book-2 opening, then #1 continues | — | continuation issues | 98837 `state.scenes.push` + `turnCount = 1`; the carry object `_carriedRel` (99026) is built before `_resetStoryState` and restored after |
| 10 | **Forbidden Library copy** | no generation; `library_entries` rows (title, author, scene_count, word_count, world, …) plus the story snapshot | — | published stories | persistence only |

**What every path already had in common:** `state` itself (the whole-state snapshot is what saves
spread), `_currentSceneNumber(state)` (126773) as the one scene identity, `_selectSceneAssignment`
(128276) as the one "what happens this scene" authority, `StoryPagination` page uids
(`addPage` mints one per page, 13237; `getCurrentPageUid`), and the authoritative event ledgers:
`_durableFateConsequences` (Tempt costs, 184085), `_temptFateLedger` (with `witnessScope`,
`publicAttribution`, `callbackCount`), `_mythicCoupleStatus`, `canonicalLI`, `_resolvePcIdentity`.

**What no path had:** a record of *which pages have been read and what happened on them* that is
not prose. `state.scenes[]` exists but is prose (title/synopsis/text) and is not written by the
literary continuation at all (only by Scene 1, CG, baked, issue-open). The only cross-scene
"what happened" signal reaching the author was prose (`_sceneTextRing`, `_priorSceneText` via
`buildSceneContinuationDirective`, 98291) and per-scene directives that reset every turn. That is
the structural reason the same conversation can recur: nothing authoritative told the author which
beats were already spent.

## 2 · The smallest common spine (built)

**A. Scene ledger** — `state._sceneLedger = { storyId, entries[] }`, append-only, entries frozen,
one per committed page. Written at *every* page-commit site in §1 (#1 304034, #4 254472/270758,
#5 134671, #6 225088, #9 98837). Entry = `{ n, sceneNumber, issue, kind, pageUid, event,
eventSource, setting, participants, act, dia, card, changes[], committedAt }` — sourced from the
scene assignment, the reader's Say/Do, the Petition/Tempt card and the durable-consequence ids
recorded during the page. **No prose is read.** Scene key rule: `_sceneLedgerStamp` runs once
before the heavy assembly (captures scene number, assignment, act/dia, card, durable count) and
`_sceneLedgerCommit` consumes it at the page commit; other commit sites pass what they know
explicitly. A ledger under another `storyId` is never read (fail-closed); re-stamping is an explicit
act at the Issue boundary (`_sceneLedgerRestamp`).

**B. Spine block** — `_buildContinuitySpineBlock(state)` → `STORY LEDGER (authoritative …)`:
`WHO` (PC from `_resolvePcIdentity`, LI only if `canonicalLI.committed`), `ALREADY HAPPENED`
(last six pages: event — reader did — reader said — [Tempt Fate]/[Petition] — [permanent change
recorded]; older pages counted, not listed), the existing `_buildDurableFateConsequenceDirective()`
(previously built but **unwired**; now delivered on every path), and `NOW: page N — reach a
dramatic state not on the list`. Empty string when there is no ledger and no durable change
(fail-closed), never prints an unresolved name, capped at 2,200 chars, deterministic.

**C. Wiring** — the block is appended in the volatile tail of every assembly in §1 that authors
prose: heavy `fullSys` (right after `_buildAuthorFloorDirective`, i.e. after the cache sentinel so
the cached prefix is untouched), pass-2 `_pass2Sys`, the speculative assembly, the CG screenplay
system prompt, the SD author template and the Mistral SD fallback template, and the OAS prompt.
Scene 1 (#4) and baked (#5) receive nothing — the ledger is empty there by construction.

**D. Persistence** — in-story saves already carry it (whole-state snapshot). Issue boundary:
`_carriedRel` now also carries `_sceneLedgerJson`, `_durableJson`, `_temptLedgerJson`,
`_mythicJson`, restored inside the same story-id-guarded branch that restores the relationship
ledger (re-stamped to the new id). `_resetStoryState` clears the ledger and the key.

## 3 · Data sources available to all paths (used) and deliberately not used

| used | why it is authoritative |
|---|---|
| `_selectSceneAssignment` event/source/setting/participants | the single per-scene authority the Author already receives |
| reader `act` / `dia` at the turn; Petition/Tempt card flags | the reader's own input — the strongest possible event |
| `_durableFateConsequences` ids + `_buildDurableFateConsequenceDirective` | Fate's permanent record (provenance-stamped) |
| `_resolvePcIdentity`, `canonicalLI.committed` | the identity commits |
| `_currentSceneNumber`, `StoryPagination` page uid, `issueIndexInRun` | page/scene identity |

| **not used** | why |
|---|---|
| `_sceneTextRing`, `_priorSceneText`, `state.scenes[].text` | prose — parsing canon out of prose is out of scope |
| `_sceneEntityState`, `_relationshipLedger` entities | model-extracted from prose (a paid pass) — derived, not authoritative; may join later as *aliases only* |
| `state.aPlot.milestones[].triggered` | self-fires on a scene counter, verified against nothing (momentum audit) — listing them would assert events that may not have happened |
| `_sceneStateCard` / `_commitScene` verdicts | paid verifier output; useful later as *evidence*, not as the ledger's source |

## 4 · Non-goals (this pass)

No predefined casts or starter canon. No prose parsing. No new provider call, no routing or model
change, no prompt-tier change. No change to Scene-1 builders or to contract v2 (parked). No
reputation *semantics* beyond delivering the ledgers that exist (deed-level reputation is
prerequisite 4b in `starter_identity_lifecycle.md`). No verifier or skeleton change. No Library
injection (persistence only). No repetition *detection* over prose — the spine makes the spent
beats authoritative; whether the author obeys is what the pilot measures.

## 5 · Test plan

**Dry (built, `_continuity_spine_dry.mjs`, zero provider calls):** U1–U11 unit on the real page
(fail-closed empty block; frozen entries; identity only when committed; stamp→commit key flow with
the Tempt card; durable-change attribution; immutability + single commit per page; story-id
isolation; cap and recency; restamp for the issue carry; issue tagging; canonical NOW number).
S1–S5 static proof that every author assembly carries the block and every page-commit site writes
the ledger. D1–D6: a continuation turn driven through the real `submitBtn` handler with the author
stubbed and every other `/api/**` POST answered `{}` locally — proves the block is in the actual
heavy author system prompt with the page-1 event and reader act, after the cache sentinel, and that
the stubbed scene commits page 2 with the reader's act.

**3-scene real-prose pilot (NOT run; needs a go and ~3 author calls ≈ $0.35):** one corridor story
(no seed), scenes 1–3 with fixed reader inputs, author on, spec preload off. Pre-registered
checks: (a) `_crossscene_legibility.mjs` pair repetition for 1→2 and 2→3 must not be "same
dramatic state"; (b) scene 3 must not restage the scene-2 assignment event (blind read, one
question); (c) a durable consequence recorded at scene 2 must be honored, not undone, in scene 3;
(d) payload capture shows the ledger listed p1 and p2 before scene 3. Control arm: same inputs
with `window._buildContinuitySpineBlock = () => ''` (block off). Two arms, blind, sealed.

## 6 · What still needs real prose evidence

Whether the author *obeys* an authoritative "already happened" list (the momentum audit found the
author trades global pacing for local coherence); whether six recent pages is the right window;
whether the reader's Say/Do line helps or leaks; whether the OAS path benefits or is confused by
a page list inside a single scene. None of that can be settled without the pilot.

## 7 · Results of the dry suite (2026-09-06, `_validate_out/continuity_spine_dry.log`) — 31 / 31

- **U1–U11** green on the real page: empty block on a fresh story; frozen entries; identity only when
  committed; stamp→commit key flow with the Tempt card; durable-change attribution and the
  previously unwired durable directive now rendered; immutability and single commit per page;
  story-id isolation; cap 2,200 chars with recency; restamp for the issue carry; issue tags;
  canonical NOW number.
- **S1–S5** green: block present at heavy `fullSys`, pass-2, speculative, CG screenplay system prompt,
  OAS prompt, SD author and Mistral SD fallback; ledger written at all six page-commit sites; the
  stamp precedes the heavy assembly; the issue boundary carries and re-stamps.
- **D1–D6** green: a real continuation turn through the `submitBtn` handler with the author stubbed
  and every other `/api/**` POST answered locally with the proxy's single shape (`{content:'{}'}`)
  — 18 pre-pass posts answered, none forwarded — produced a 203 k-char heavy author system prompt
  containing the block after the cache sentinel, naming page 1's event and the reader's act; the
  stubbed scene then committed under the same number with the reader's act and the key consumed.

**Observation for the pilot (not changed here — adjacent):** `handleBeginStory` sets
`turnCount = 1` after Scene 1 (254628) and `_currentSceneNumber` is `turnCount + 2`, so the first
continuation authored after a real Scene 1 is numbered **3** (the suite reproduced this: "1 page
read … NOW: page 3"). Archived live logs show the first continuation as "scene number: 2", but
those runs were harness-seeded with `turnCount = 0`. Whether production numbers the second page 2
or 3 decides which plan row `_selectSceneAssignment` fetches; the 3-scene pilot should log it.
The ledger stores the canonical number as given and does not paper over it.

## 8 · Exact diff (this task only; the parked v2 work is untouched)

`_audit_out/continuity_spine_task.diff` — pre-edit copies vs working tree: **23 hunks, +162 / −5
lines** (the five removed lines are the three rewritten assembly expressions and the two script
tags). New files: `_continuity_spine_dry.mjs`, this memo, the log/json. Cache-busters:
`app.js?v=20260906a-scene-ledger`, `orchestration-client.js?v=20260906a-scene-ledger`.
No provider was called; no routing, tier or model changed; nothing committed.

## 9 · Review response (2026-09-06) — planned vs shown, controls, reachable paths, claims, numbering

### 9.1 Planned vs shown — which committed fields are safe
| field | safe to tell the next author it HAPPENED? | why |
|---|---|---|
| page uid / scene number / issue (`StoryPagination` uid minted at `addPage`) | **yes** | written only after the page is displayed |
| reader `act` / `dia` (from the scene key stamped before the pass, consumed at that page's commit) | **yes** | the reader's own input; the key is bound to story id and scene number, so an aborted attempt's inputs never attach to a later page (R1/R2, U4d) |
| Petition / Tempt card | **yes** | the reader played it on that turn |
| durable-consequence ids recorded during the page (`_durableFateConsequences`) | **yes, as "Fate recorded"** | Fate's own permanent record with provenance |
| verifier-committed fact (`state._committedState.facts[]`, written by `_commitScene` only when a declared state change was DELIVERED and slot-checked against the prose) | **yes, as "verified on the page"** | the runtime's own evidence-grounded verdict; already a production pass |
| scene-assignment `event` / `setting` / `participants` | **no — planned context only** | a plan, not evidence; kept in the entry as `plannedEvent` for diagnostics and **never rendered** (U2b, S6) |
| skeleton, milestones, prose rings, entity store | **omitted** | plan / self-firing / prose-derived |

The block therefore says "ALREADY READ … what is listed here HAPPENED" only about the reader's
acts, the cards, Fate's record and verified facts. It never restates a beat.

### 9.2 Red controls (all through the real `submitBtn` handler, author stubbed, everything else local)
- **R1 abort** (author HTTP 500 through the whole fallback chain, 3 calls): no page, no entry, count unchanged.
- **R2 retry** with a different act: one page, one entry, the new act, the aborted act nowhere, key consumed; the payload listed page 1 with the reader's act and the verified fact and no planned text.
- **R3 speculative discard** (stale context hash): the app logged the mismatch, the real author ran, one page + one entry, the draft text never displayed, spec cleared.
- **R4/R5** entries are one-to-one with displayed pages, in page-uid order, numbered 1,2,3,4.
- **U6/U9b/U10b** duplicate commit returns the existing entry; replaying the issue carry twice is idempotent; the next issue appends without touching earlier pages.
- **Speculative adoption**: the preload did not store a draft in the dry run (gated), so adoption is **unproven**; a preloaded draft can only reach the ledger through the same `addPage` commit as a real page.

### 9.3 Reachable prose paths — proof type
| path | proof | result |
|---|---|---|
| heavy literary continuation (grok → mistral → gpt-4o chain) | executable capture (R2c, R6a) | block present, facts only |
| CG screenplay system prompt | executable (builder run, C1) | present |
| SD author (`/api/proxy`, grok-4-1-fast-reasoning) | executable capture (C2) | present |
| Mistral SD fallback (`/api/mistral-proxy`) | executable capture (C3) | present |
| OAS intimacy turn (`/api/mistral-proxy`) | executable capture (C4) | present |
| speculative preload assembly | **static only** (S1); adoption unproven | — |
| multi-pass pass 2 | **static only** (S1); unreachable dry | — |
| literary Scene 1 | not wired by design (ledger empty) | — |
| **baked Scene 1** | **excluded** — verbatim prose, no prompt; the ledger records the page, nothing is delivered | — |
| Library copy | persistence only | — |

### 9.4 What reaches the author today — and nothing more
`WHO: PC <name> · LI <name>` (only when committed); per page: `reader did: …`, `reader said: "…"`,
`[Tempt Fate played]` / `[Petition made]`, `[Fate recorded a permanent change]`, `verified on the
page: <fact>`; the existing `PERMANENT WISH-COSTS ALREADY PAID` directive; `NOW: page N`.
**Not** an identity or reputation solution: no portfolio reconciliation, no body-bible update, no
per-deed reputation, no epithet. Those remain unimplemented (see `starter_identity_lifecycle.md`).

### 9.5 Numbering — investigated, executable: FUNCTIONAL BLOCKER (not repaired)
- `_currentSceneNumber` = `turnCount + 2` while building a continuation.
- **Inline literary Scene 1** (the in-function author path, site B ~270907) writes no `turnCount`
  → first continuation = scene 2 → `_selectSceneAssignment` fetches plan row **2**. Correct (N2, R5).
- **Baked starter unlock** (`_commitBakedScene`: `if (!(turnCount>0)) turnCount = 1`) → first
  continuation = scene **3** → plan row **3 "THE PRICE AND THE THRESHOLD"** is fetched and row 2
  **"THE TWIST" is skipped** — proven by executing the real functions against `STARTER_PLANS` (N1, N3).
- The same `turnCount = 1` write follows the **background-pregenerated Scene-1 path** (site A,
  ~254643, unconditional after its branches), the **Issue-open mount** (98837) and the CG/GN
  renderer (229585) — static; the Issue case has no plan rows but the ledger/NOW number inherits it.
- Consequence: the starter (launch) path and any background-pregenerated story skip a plan row
  on the first continuation. Nothing here was changed; this is Roman's decision (which write is
  canonical: the Scene-1 `turnCount = 1`, or the `+2` rule).

### 9.6 Go / no-go for the three-scene pilot
**NO-GO until the numbering decision is made.** The corridor inline path numbers correctly and a
corridor-only pilot would not touch plan rows, but the launch path (baked starters) selects the
wrong row, and the ledger's NOW line inherits the same number, so a pilot would measure a story
that skipped a beat. Pilot design when unblocked: same seed and inputs, spec preload off, arm A
block off (`window._buildContinuitySpineBlock = () => ''`) vs arm B on, three scenes, judged on
irreversible advancement per page and repeated exchanges across pages, blind, separately
authorized (~3 author calls per arm). No provider calls, routing/model changes, prompt-style
expansion or commit were made in this review pass; suite 44/45 with the one FAIL being the
blocker check itself.

## 10 · Numbering repair (2026-09-06, Roman's decision: the first continuation after ANY Scene 1 is scene 2)

**Invariant.** `state.turnCount` = **completed continuation turns**. Mounting or committing any Scene 1
(inline literary, background-pregenerated, baked, CG, issue opening) leaves it at 0. The literary path
increments after each continuation commits (`turnCount++`, ~303291), so while a continuation is being
built the scene is `turnCount + 2` — the existing canonical formula, retained because it is correct
under the invariant (`_assignment_verify.mjs`: tc 0 → 2, tc 1 → 3). CG/staged advance bumps the counter
**before** generating (scene index, 0-based) and runs the same plot contract, so during a staged
generation the scene number is the index + 1: `_runCGScreenplayGen` now sets
`state._stagedAuthoringSceneIndex` for its duration (cleared in `finally`) and `_currentSceneNumber`
honors it. No other consumer of the formula changed.

**Writers reconciled (Scene-1 entry left the counter at 1 → now 0):**
| writer | function | before | after |
|---|---|---|---|
| baked starter unlock | `_commitBakedScene` | `if (!(turnCount>0)) turnCount = 1` | no write (stays 0) |
| background-pregenerated Scene 1 mount | `handleBeginStory` site A (~254643) | `turnCount = 1` | `turnCount = 0` |
| issue opening | `_mountAndTransition` (~98837) | `turnCount = 1` | `turnCount = 0` |
| GN renderer Scene 1 (legacy graphic-novel; no live setter of that render mode found) | `_renderGNFromPanels` | `turnCount = 1` | `turnCount = 0` |
| GN advance (post-render) | `_advanceGNScene` | `_gnSceneIndex + 1` | `_gnSceneIndex` |
| couple-mode resume / partner poll | `loadCoupleTurns`, `startCouplePolling` | `turn_index + 1` | `turn_index` (0-based index of the scene shown) |

**Consumers reconciled (structurally tied to the writers):** `_isAtPreviewStop` — "stop after scene N"
now compares scenes displayed (`turnCount + 1`) to `at`, preserving the documented paywall point
(Famous Fate trial stops after exactly three scenes; the CG/staged advance (`nextSceneIdx = turnCount+1`),
the Petition/Tempt unlock thresholds (`turn < 1` / `< 2` after display), the Gap-2 guard (`turnCount > 0`
= a prior story's progress leaked into a new one) and the baked "display now, commit at unlock" design all
already assumed the invariant and are unchanged. The CG ledger commit passes its own scene number.

**Consumers deliberately NOT changed (documented-scene drift, prompt-affecting, out of scope — now
uniform across all Scene-1 paths):** literary build-time `turnCount === 1` "entry to Scene 2" story-gravity
resolution (~301203; fires at the Scene-3 build), the intimacy "never in Scene 2 (turnCount===1)" validator
(~151555), the Scene-3 indulgence one-shot (`=== 2`, ~303288), the Scene-2 intro vision (`=== 2`, ~304386),
GN `=== 1` gravity (~227132). Each fires one scene later than its comment says on every path, exactly as it
already did on the inline literary path. Dev-only writers (`turnCount = 8`, `= 20`) untouched. Persisted
saves written before this change with a Scene-1-only story at `turnCount = 1` resume as they were saved;
nothing decrements on resume (static: no `--`/`-=` anywhere), so retry/resume cannot double-decrement or
return to scene 1.

**Controls (all free):** red control = the pre-repair log (`_validate_out/continuity_spine_dry_prerepair.log`,
N3 FAIL: row 3 selected). After repair, `_continuity_spine_dry.mjs` **53/53**: N1 baked unlock → tc 0 →
scene 2 → row 2 "THE TWIST"; N2 CG seam index 1 → 2/row 2, index 2 → 3/row 3, index 0 → 1, cleared → literary
rule; N3 second continuation → 3/row 3; N4 issue start → 2; N5 preview stop after exactly three scenes;
N6 no Scene-1 writer begins at 1, no decrement anywhere; N7 wrapper sets/clears in `finally`; R2d/R5b the
NOW line agrees with the committed page on each turn (2, then 3) and `turnCount` is 2 after three pages.
`_assignment_verify.mjs` all green; `verify:baked` 120/120 (its assertion "turnCount becomes 1" replaced by
the invariant); `verify:scene1` PASS. Cache-buster `app.js?v=20260906b-scene-numbering`.

**Remaining pilot gate.** Numbering is no longer a blocker. What remains before the three-scene pilot is
only the separate authorization and its design (§9.6): same seed and inputs, preload off, block off vs on,
three scenes, blind judgement of irreversible advancement and repeated exchanges. Speculative adoption and
the multi-pass second pass remain proven static-only. No provider call, routing, model or prompt-style
change was made; nothing is committed.

## 11 · Backward compatibility of the numbering repair (2026-09-06) — audit + one-time normalization

**The hole.** A save written before the repair by a baked unlock, a background-pregenerated Scene 1, an
issue opening or CG stored a Scene-1-only story as `turnCount = 1`; resumed after the repair it would
still build scene 3 and skip plan row 2.

**Durable structured evidence available in every save (`saveStorySnapshot`, `continueStory`):**
`stateSnapshot` = whole state (so `turnCount`, `scenes[]`, `_sceneLedger`, `_committedState`,
`renderMode`, `issueIndexInRun`), `storyPages[]` + `storyPageUids[]` (per page, since 2026-05-31),
`storyHTML` (whole story as one blob — the only page record in older saves), and the denormalized
`turn_count` column (written from `turnCount`, read only for list display). **No save-schema version
marker existed** (only ad-hoc value migrations such as legacy species names), so one was introduced:
`state._turnCountSchema = 2` on every new story (`_resetStoryState`) and on every evaluated resume.

**Discriminator, by entry form (class a = pre-repair Scene-1-only stored as 1; class b = genuine first
continuation completed, legitimately 1):**
| form | class a evidence | class b evidence |
|---|---|---|
| inline literary Scene 1 | not affected (stored 0) | pages 2, scenes 1 |
| background-pregenerated literary Scene 1 | pages 1, scenes 1 | pages 2, scenes 1 (continuations add pages, never `scenes`) |
| baked starter (literary or CG format) after unlock | pages 1 (the baked page), scenes 1 | literary: pages 2 · CG: scenes 2 (CG adds no pages) |
| issue opening (Book 2) | pages 1, scenes 1 (pagination and `scenes` reset at the transition) | pages 2 |
| CG Scene 1 | pages 0–1, scenes 1 | scenes 2 |
| pre-2026-05-31 single-blob save (`storyHTML` only) | pages unknown | pages unknown → **ambiguous** |

`displayed = ledger entries when a scene ledger exists for this story, else max(storyPages.length,
scenes.length)`. **Normalize iff `turnCount === 1` and `displayed === 1` and no verifier-committed
fact exists.** That is unambiguous for every per-page save. Deliberately left as saved: `displayed > 1`
(class b); `turnCount ≥ 2` legacy saves (consistently offset since scene 2 — re-numbering would replay
the plan row the reader just read); the single-blob legacy form (ambiguous — reported, untouched). The
pre-checkout `storybound_pending_story` payload carries `turnCount` but no page evidence; it is followed
either by a snapshot resume (normalized there) or by `handleBeginStory`, whose Gap-2 guard wipes a
positive count for a new story, so it is not a separate hole.

**Built (`_normalizeLegacyTurnCount`, hooked in `continueStory` after the snapshot is applied and the
pages are restored, both branches):** idempotent via the schema stamp; records
`_turnCountMigration { turnCountBefore, turnCountAfter, evidence, applied, reason }` so a rollback can
restore the prior value and no second pass can correct twice; pages are never touched.
Controls M1–M14 (68/68 suite): class a on literary, baked, issue forms → 0; class b on literary (2 pages)
and CG (2 scenes) → stays 1; ambiguous blob → stays 1, stamped, reason says ambiguous; mid-story
legacy → untouched; verifier fact → untouched; ledger authority; second pass no-op (0, not −1); born-at-
schema-2 never evaluated; static hook order (assign → pages → normalize) and single stamp writer.
Numbering proof and the existing suites re-run green after this: spine 68/68, assignment verifier all
green, `verify:baked` all checks, `verify:scene1` PASS.

**Residual:** owners of pre-2026-05-31 single-blob saves at exactly `turnCount = 1` keep the old
value (cannot be told apart); the safest UX for them is nothing automatic — they resume as they were.

## 12 · The five "Scene 2/3" consumers — factual inventory (not fixed)

Evaluation moments under the invariant: literary **build time** → scene k has `turnCount = k−2`;
literary **pre-increment post-processing** → `k−2`; literary **post-increment** (after
`turnCount++` at ~303311) → `k−1`; CG **generation time** (bump-before) → `k−1`.

| site | condition | moment | semantic scene it now fires on | verdict |
|---|---|---|---|---|
| `_validateScene2Plus(raw, { sceneIndex: state.turnCount })` intimacy gate `sceneIndex === 1` (~303679) | post-increment | k−1 = 1 → **Scene 2** | **correct** under the invariant (the repair fixed it on the baked/pregenerated paths, where it used to skip Scene 2 and flag Scene 3) |
| checkout cleanup `turnCount === 1` (~303352) | post-increment | after Scene 2 (first handler-authored scene) | comment stale ("after Scene 1"); behavior acceptable; used to never fire on the 1-based paths |
| story-gravity one-shot "entry to Scene 2" `turnCount === 1` (~301219) | build time | k−2 = 1 → **Scene 3 build** | **fires one scene late** (before the repair it was correct on the 1-based paths, late on inline) |
| Scene-3 indulgence one-shot `turnCount === 2` (~303304) | pre-increment | k−2 = 2 → **Scene 4** | **fires one scene late** |
| Scene-2 intro vision `turnCount === 2` (~304402) | post-increment | k−1 = 2 → **after Scene 3** | **fires one scene late** |
| CG Petition/Tempt emergence gates `=== 1` / `=== 2` (`_showStagedDecisionGate`) | CG generation (bump-before) | Scene 2 / Scene 3 | correct |
| legacy GN gravity gate `=== 1` (`_buildGNPanelPrompt`) | GN generation | Scene 2 under GN's own convention | correct; GN writers were left on their convention (no live setter of that render mode; it never calls the plot contract) |

Three consumers fire one scene late on every path now (they already did on the inline path). Each
is a one-line semantic fix (`=== 0` at build time, `=== 1` pre-increment / post-increment
respectively) but each changes prompt content or a one-shot onboarding beat, so they are reported
here and not changed. Also noted: the commit-scene verifier's fallback `_prevNum = (turnCount||1)−1`
(used only when a proposal lacks `sceneProposed`) labels the previous scene one low.

## 13 · Reconciled compatibility invariant + the three consumers fixed (2026-09-06)

**The contradiction, confirmed structurally.** The verifier (`_commitScene`) consumes the plot
contract's declared state change. The plot contract runs for CG Scene 1 and for every continuation
plan, so a Scene-1 fact can be committed at the Scene-2 *plan*, before any Scene 2 is displayed — and
an aborted Scene-2 attempt verifies its proposal against Scene 1's page, which can leave a fact labeled
scene 2 with only one page shown. Facts therefore prove nothing about display. The previous guard
("no verifier fact") kept `turnCount = 1` for exactly the affected class.

**Red control, then correction.** `_validate_out/continuity_spine_dry_red_facts_consumers.log`: with
the guard in place, literary and baked Scene-1-only saves at 1 with one displayed page and a Scene-1
fact (keyed by `committedAtScene` 1, 0, by `sourceEvent` only, or even labeled 2) all stayed at 1 —
MF1–MF5 FAIL. The guard was removed; facts are recorded as diagnostics only. Green: MF1–MF5 PASS, all
other compatibility controls re-run (M1–M14) PASS.

**Reconciled invariant (the only one used):**
`turnCount` = completed continuation turns. On resume, if the save is not yet schema 2:
`displayed = sceneLedger.entries.length (when a ledger exists for this story) else max(storyPages.length,
scenes.length)`; **normalize 1 → 0 iff `turnCount === 1` and `displayed === 1`**; otherwise leave as
saved. Stamp schema 2 either way; record before/after and evidence. Only saves without a `storyPages`
array (pre-2026-05-31 single blob) are ambiguous, and they are left untouched and marked. Page count is
the whole proof; no other field participates.

**The three late consumers — fixed on the shared literary path, red/green:**
| consumer | old test | moment | new test | red (before) | green (after) |
|---|---|---|---|---|---|
| story-gravity opening emphasis "Scene 2" | `turnCount === 1` | build | `_currentSceneNumber(state) === 2` | block on the Scene-3 build, absent on Scene 2 (G1 FAIL) | on Scene 2 (G1), not Scene 3 (G2, gravity still set: G2a) |
| Scene-3 indulgence one-shot | `turnCount === 2` (pre-increment) | pre-increment | `_currentSceneNumber(state) === 3` | flag set after Scene 4 (G6/G7 FAIL) | after Scene 3 (G6), not 2 (G5), not 4 (G7) |
| Scene-2 intro vision | `turnCount === 2` (post-increment) | post-increment | `(turnCount + 1) === 2` | fired after Scene 3 (G3/G4 FAIL) | after Scene 2 (G3), not 3 (G4) |
No prompt text was changed; only the scene tests. CG's own gates (bump-before, `turnCount === 1/2`
during generation) were already correct and are untouched. **Legacy GN renderer exemption,
documented:** `renderMode` is never assigned `'graphic_novel'`/`'graphic'`/`'gn'` anywhere in the
codebase (no setter found), the GN path never calls the plot contract, and its generation-time gate
reads `turnCount` as the index being generated; its two writers keep that convention and the static
control N6 exempts them by an explicit marker comment.

**Suites after all of the above:** spine dry suite **80/80** (`_validate_out/continuity_spine_dry.log`),
assignment verifier all green, `verify:baked` 120/120, `verify:scene1` PASS. Diff
`_audit_out/continuity_spine_task.diff`: 37 hunks, +260/−17 (plus the verifier assertion and the harness).

**Pilot conditions that remain:** (1) Roman's separate authorization (~3 author calls per arm);
(2) the design as written in §9.6 — same seed and inputs, speculative preload off, arm A block off vs
arm B block on, three scenes, blind judgement of irreversible advancement per page and repeated
exchanges across pages; (3) known limits carried into the pilot: speculative adoption and multi-pass
pass 2 proven static-only; pre-2026-05-31 single-blob saves not normalized; the durable-consequence
directive is delivered but no reputation or portfolio reconciliation exists yet. No provider call,
routing, model or prompt-content change was made; nothing is committed.
