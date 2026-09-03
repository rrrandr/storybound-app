# FROZEN ACCEPTANCE MATRIX v1 — the six open paths

Frozen 2026-09-03 against `public/app.js` @ `ec595e116abb9f2e` (commit `3caaf39`).
Every entry point below was read in source, not inferred. Where something is unknown it says so.

**Standing rules for every row.** A claim is proven only through its real production entry point,
with (a) a positive control that still passes and (b) a mutation control **observed to fail**.
Assertions name exact `{canonicalId, facet_id, pageId}` — never `some(...)`. No paid dispatch, no
feature enablement. See `feedback_controls_must_bite`.

---

## 1 · Generated (unseeded) continuations

| | |
|---|---|
| **Entry point** | `#submitBtn` handler (`app.js:292473`) → standard branch (`302994`) → `FINAL_PROSE` (`303017`) |
| **Final artifact** | `pageContent` mounted by `StoryPagination.addPage(..., { cpAttemptId })` |
| **Identity owner** | the mounted page's `cpAttemptId`, minted locally at the seam |
| **Failure behavior** | `_sceneStageContract` returns `fault: 'no authoritative stage: scene N has neither a seed sceneOne nor an assignment row'` (`126810`) → C+ refused, **scene proceeds** |
| **Proof path** | `_continuation_turn_driver.mjs` for the seeded case; an unseeded twin does not exist yet |

**The gap.** An unseeded story reaches `126809` with no `seed.sceneOne` and no `_asg`, so there is
no authoritative stage and no owned facts. Presence must NOT be inferred from a roster
(`named:mara` from the string "Mara" is a slug, not an identity) and facts must NOT be parsed back
out of prose (that is reading our own output as evidence).

**Acceptance:** an authoritative stage + owned-fact source exists for scene N of an unseeded story,
issued by refs with explicit presence modes, and a real unseeded continuation commits a verified
manifestation for a named `{canonicalId, facet_id}`. Until then C+ stays fail-closed.
**Open decision:** whether this requires a new planning call. If so it is designed and priced
(exact call count, unrounded worst-case ceiling) before any dispatch.

---

## 2 · CG / staged rendering

| | |
|---|---|
| **Entry point** | `_renderStagedScene(plan, heroImagePromise)` (`app.js:209733`) |
| **Final artifact** | the rendered panel set; prose is `plan.beats[].text` joined (`209775`) |
| **Identity owner** | `plan.__sceneUid` — content-addressed, minted fresh per finalized output (`_cgSceneUidFor`, `32197`) |
| **Failure behavior** | unknown — untested |
| **Proof path** | none exists |

**The gap.** CG skips `StoryPagination` entirely (`32106`), so there is **no page metadata carrier**
for an attempt id. The commit calls `_updateCharacterDisclosureLedgerForCurrent(prose, plan.__sceneUid)`
(`209777`), so the sequence result — keyed by attempt — has nothing on the CG side to match against.
`plan.__sceneUid` is the natural carrier: it is per-output and already survives re-render.

**Acceptance:** the canon sequence runs on the CG final-prose path; the result is owned by the
plan/panel that produced it; a CG scene commits a verified manifestation for a named
`{canonicalId, facet_id}`; and a stale result from another plan cannot reach it. Tested through
`_renderStagedScene`, not helpers.

---

## 3 · Book 2 / new-world

| | |
|---|---|
| **Entry point** | `window.startBook2` (`98628`) — same cast · `window.startNewInWorld` (`98962`) — new story |
| **Final artifact** | the carried `_relationshipLedger` / `_characterDisclosureLedger` under the new `storyId` |
| **Identity owner** | `_priorStoryIdForCarry` (captured pre-reset) + `_relLedgerCarryAdopt` (binds on first read) |
| **Failure behavior** | no authoritative link → **nothing carried**, new story opens with nobody known |
| **Proof path** | `_issue2_carry.mjs` (8·0) covers startBook2 only |

**The gap.** `startNewInWorld` is untested. The two paths must be provably distinct: same-cast carry
versus genuine reset. A later re-mint of `storyId` after the carry is covered by the adopt flag and
has a forced-remint control, but only on the startBook2 path.

**Acceptance:** `startNewInWorld` carries **nothing**, proven by the same identity-pinned assertions;
`startBook2` carries only identities with an authoritative continuity link; a re-mint after the
transition is survived on both. Mutation control: removing the adopt flag with a forced second mint
must lose the ledger.

---

## 4 · Cross-story memory

**STOP BEFORE IMPLEMENTATION.** This is a product-policy decision, not an engineering one, and the
policy question is presented separately. Nothing is built until it is answered.

Three questions that must be answered first:
1. **What identity may persist across genuinely distinct stories?** A character the reader created?
   A canonical seed figure? Nothing?
2. **When is it user-authorized?** Silent linking is not acceptable — two unrelated stories sharing
   a name is not evidence they share a person.
3. **How is it forgotten?** A memory with no delete path is a liability.

**Non-negotiable:** never silently link unrelated characters. The existing story stamp
(`_relLedger` rebuilds when `L.storyId !== sid`) is the current, correct default: no leakage.

---

## 5 · Auditor / repair

| | |
|---|---|
| **Entry point** | `_cpCanonSequence` at `FINAL_PROSE` — Scene 1 (`269886`), continuation (`303131`) |
| **Final artifact** | `semanticStatus` / `publishedWithConflict` on the committed manifestation |
| **Identity owner** | per-attempt result map, taken by the page's `cpAttemptId` |
| **Failure behavior** | dormant: server 403 `AUDITOR_NOT_ENABLED` + client hint false → publish + commit, prose byte-identical, **0 dispatches** |
| **Proof path** | `_canon_sequence_wiring.mjs` (11·0), `_continuation_turn_driver.mjs` (20·0), `_turn_concurrency.mjs` (15·0 healthy / 11·4 old-design control) |

**Stays dormant.** Before requesting paid authorization: exact call count per scene, unrounded
worst-case ceiling (input bytes + full output ceiling at published rates), measured latency, and
observed repair behavior on a real contradiction. Grok reasoning tokens are billed **outside**
`max_tokens` — any ceiling that ignores that is wrong.

---

## 6 · Live prose quality

| | |
|---|---|
| **Entry point** | the same authored paths; the difference is a **real** author response, not a fixture |
| **Final artifact** | the mounted page the reader sees |
| **Identity owner** | n/a — this is a quality question, not an ownership one |
| **Failure behavior** | n/a |
| **Proof path** | **none. Every author response in all 19 suites is a fixture.** |

Nothing proven so far says the writing is good. It says the machinery delivers what it claims to
deliver. The evaluation must be **preregistered and blinded**: scores and the A/B/tie verdict
written before reveal, paired and function-matched, ties hunted rather than avoided
(`feedback_comparative_blind_evaluation`, `feedback_pre_register_verdict`).

---

## Order of work

1. Generated continuations — the stage/fact source, or a priced design if it needs a call
2. CG — canon ownership through the real panel/render commit
3. Book 2 / new-world — separate carry from reset
4. Cross-story memory — **policy first, present and stop**
5. Auditor/repair + live prose — harnesses only, dormant, priced before any request

One path at a time. Only green scoped units are committed. The 839 unrelated dirty/untracked
files stay untouched.
