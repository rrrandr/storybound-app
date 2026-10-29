# Applied — the chosen crisis, its props and its decision survive (literary)

**Applied to `public/app.js` 2026-10-27.** Provider-free. Cache-buster bumped to
`?v=20261027a-opening-object-optional` (`public/index.html:2552`). **Not committed, not pushed, not
deployed.** 11 hunks, +137 / −66 lines, all inside the regions named below. No new classifier, no
pool rewrite, no paid call, no literary-quality claim.

Supersedes the proposals in `_nf_opening_crisis_patch_proposal.md` (superseded) and
`_nf_opening_crisis_patch_proposal_v2.md` (the plan this implements, with the four corrections
applied during implementation rather than in another proposal round).

---

## 1 · Compulsory object treatment removed — without installing a prohibition

**One shared definition, at module scope, read before any prompt is built** (app.js:63051, above
`HOOK_CRISIS_OBJECTS`):

```js
var _PS_OBJECT_REQUIRED_TYPES = ['object'];
var _PS_OBJECT_OPTIONAL_TYPES = ['emotional', 'relational', 'social', 'physical', 'atmospheric',
                                 'erotic', 'moral', 'survival', 'procedural', 'institutional'];
function _psRequiresObject(t) { … }
```

`institutional` and `procedural` are **optional**, not required: a board voting her out and a rite
going wrong are events, not documents that must arrive. `object` is the only type that requires
one, because there the pressure *is* the thing. An unspecified/legacy type is optional too — the
old back-compat branch routed it to the object path, which was itself a compulsion.

app.js:295731 now **reads** that definition instead of declaring a second, shorter one:
```diff
-        var _PS_NONOBJECT_TYPES = ['emotional', 'relational', 'social', 'atmospheric', 'erotic', 'moral', 'survival'];
-        var _psObjectRequired = !(_PS_NONOBJECT_TYPES.indexOf(_psType) >= 0);
+        var _psObjectRequired = (typeof _psRequiresObject === 'function') ? _psRequiresObject(_psType) : false;
```

**Five instruction sites reconciled**, each now conditional and each permissive in both
directions:

| site | was | is |
|---|---|---|
| 291754 STRUCTURE (HARD) | `The hook still exists (keep it)` — unconditional | hook discussed only "WHERE THIS SCENE HAS AN EXTERNAL HOOK AT ALL", with "there may be none, and none is to be introduced to fill the slot" |
| 291778 the deferred-LI twin | same sentence | same treatment; the LI clause untouched |
| 63133 `_buildHookCrisisSteer` | `HOOK OBJECT MUST CARRY THE CRISIS (HARD)` | `IF THIS SCENE USES A HOOK OBJECT, IT CARRIES THE CRISIS` + `THERE MAY BE NO OBJECT AT ALL` |
| 292794 / 292821 / 292876 REQ 1, REQ 3, the `hook_object` field | three different hand-typed type lists, none containing `physical` | rendered from the shared constants; "REQUIRED only when pressure_source_type is object … for every other type an object is OPTIONAL" |
| 296408 the author's object bullet | rendered always; with no hook it printed `(choose a concrete object that fits)` | three outcomes: required → mandated; optional prop → **offered**; no object → **no line** |
| 296488 the author's decision line | `The decision MUST turn on the hook object` always | mandated only for `object` pressure; otherwise the decision acts on the pressure **and may act through the prop** |

**Optional does not become forbidden.** With `hook_object: "her ring"` on relational pressure the
author block now carries:

> `• PROP IN THE SCENE (available, not required): "her ring". It is here and you may use it wherever it serves — including in the closing decision, if acting on it is genuinely how she acts on the pressure. It is NOT the subject of the opening and it does not have to appear at all.`

and:

> `↳ The decision acts on the PRESSURE SOURCE itself, and it MAY act through "her ring" — giving it back, setting it down, refusing it — when that is genuinely how she acts on the pressure. … Do NOT introduce an object so that there is something to decide on, and do NOT steer around the prop that is already here.`

`the board` is gone from the decision line's failure list; it forbade the decision an active board
vote produces.

---

## 2 · The diagnostics no longer write

**app.js:295731, the procedural-hook block.** Was: on a vocabulary match, replace the planner's
object with a pool pick and rewrite every beat naming it. Now: log + a `_validatorReports` entry.
**No replacement object, no manufactured opening, no rewritten decision, and no deletion of the
planner's hook** — a keyword match is not grounds for removing metadata either.

The two manufactured strings are gone from the file (they survive only inside the comment that
records what they were):
```diff
-  if (plan.opening_beat)  plan.opening_beat  = _scrubBeat(plan.opening_beat,  'It arrives without warning — ' + _cleanHook + ' — and she cannot make it mean anything safe.');
-  if (plan.decision_beat) plan.decision_beat = _scrubBeat(plan.decision_beat, 'Reach for it — ' + _cleanHook + ' — or refuse to.');
-  if (Array.isArray(plan.rising_beats)) plan.rising_beats = plan.rising_beats.map(…).filter(Boolean);
```

**app.js:295757, the HOT-opening shape gate.** Its reading goes to `_validatorReports`; the
in-motion premise replacement is now opt-in behind `window._openingShapePenOff === false` — the
same shape `_repairHotOpening`'s pen already had. Default: `[HOOK:SHAPE] VALIDATE-ONLY … the
plan's opening and decision stand.`

---

## 3 · The cooldown bans treatment, not topics

**app.js:62970.** The word list is gone. No subject is forbidden — a hearing, a merger, a
settlement, a takeover, a board, a vote, a company may all appear. What is forbidden is the
**detached procedural setup**: a matter pending elsewhere, on a schedule, to be answered later.
Three tests replace it, and none of them mentions a room:

1. **Already irreversible** — cannot be un-happened by filing a form, attending a date, or winning
   an argument later.
2. **It lands on her, not on an entity** — *"It does not matter whether the people doing it are in
   the room, on a screen, or a continent away."*
3. **She must answer it, and the answer costs.**

> `So: a hearing that strips her of something AS IT HAPPENS passes; a hearing set for next month does not. A takeover she is watching land on her, remotely, in real time, passes; a takeover to be negotiated does not.`

The existing "the antagonist is a PERSON acting on her life" clause is kept. The cooldown's firing
condition (the procedural-run history / billionaire onboarding threshold) is unchanged.

---

## 4 · The closing boundary kept; one example deleted

**app.js:296488.** Only the object-dependent example is removed, and **nothing replaces it** — no
"NO returning to look at anything again":
```diff
- NO trailing reflection, NO description, NO "I looked at the ' + (hookObject || 'thing') + ' again," NO restating the stakes.
+ NO trailing reflection, NO description, NO restating the stakes.
```
The last-prose boundary and the `<<EXPANSION_A>>…<<END_EXPANSION>>` appendix rule are untouched.

**One exemplar** also changed, per the decision already given: `"the summons is being read aloud as
she walks in"` → `"the vote against her is being counted while she is still speaking"`. The other
two HOT exemplars are unchanged.

---

## Verification — `node _nf_opening_crisis_delivery.mjs`

Production's initialized, exported `window._buildScene1Scaffold`, entered through
`handleBeginStory` so its closure installs, then called directly. The OPENING_PLANNER reply is a
**labelled fixture** whose refs, lens operations, contact verbs and affordances are copied out of
the dispatched prompt. The PC body bible's `current_crisis` is each case's own crisis. Every other
`/api/**` request is aborted.

**Coverage, from this run only (the output directory is cleared at start):**

| | |
|---|---|
| literary author blocks produced | **15 / 15** |
| CG early exits (empty block) | **5 / 5** |
| planner requests dispatched | **16** (15 delivery + 1 staging probe) |
| of those, skeleton repair calls | **0** |
| author requests dispatched | **0** |
| `/api/**` aborted | 23, none escaped |

`author requests dispatched: 0` is a measurement, not an omission: this harness calls the scaffold
builder directly, so the complete outgoing author **request** is never assembled. What is captured
is the complete author **instruction block** the scaffold returns — the artifact this path
contributes to that request — written in full to
`_nf_crisis_delivery_out/author_<world>__<case>.txt`, 20.5–21.0 KB each.

**Per case (5 crises × 3 literary arms — two on engine COLLISION, one on SHARED_HISTORY so the
shape gate actually applies — plus 5 CG arms), all eight checks pass:**

| case | type | hook sent | hook on state after | object compulsion |
|---|---|---|---|---|
| quiet betrayal + optional ring | `relational` | `her ring` | **`her ring`** | absent; prop offered and permitted in the decision |
| active corporate dispossession | `institutional` | `the board vote` | **`the board vote`** | absent |
| physical crisis | `physical` | `null` | `null` | absent; no invent-an-object fallback |
| **the pressure IS an object** (positive control) | `object` | a sealed envelope… | unchanged | **present — mandate remains** |
| deferred summons (negative control) | `procedural` | `a summons` | **`a summons`** | absent |

Checks, each case: the chosen crisis reaches the author · the chosen opening beat verbatim · the
chosen decision verbatim · the planner's own hook unchanged · object compulsion absent unless the
pressure IS an object · an optional prop still offered, not erased · an optional prop not
forbidden from the decision either · where the pressure IS an object, the mandate remains.

**Both controls bite.** The SHARED_HISTORY arm exists because `_hotOpeningShapeFail` returns
`null` on COLLISION, so without it the validate-only change would be applied and never exercised.
On that arm the gate fires and reports:

> `[HOOK:TEMP] intended=HOT actual=COLD reason=opening prop is an information container ("board")`
> `[HOOK:SHAPE] VALIDATE-ONLY (default) — opening prop is an information container ("board"). Reporting, not rewriting; the plan's opening and decision stand. Restore with window._openingShapePenOff = false.`

and the plan's hook, beat and decision all survive it. The procedural diagnostic fires on exactly
the two cases that were previously swapped, and reports instead:

> `[HOOK:PROCEDURAL] "the board vote" reads as a financial/legal document (pressure=institutional, objectRequired=false) — REPORTED, NOT REPLACED. The plan's own hook, opening and decision stand.`

For `pressure_source_type: 'object'` the mandate sweep still reports
*object introduction mandated · decision mandated onto an object · choice anchored to a hook*. For
every other type it reports *no object mandate of any known shape* — swept over the complete
block against eight mandate patterns, not only the three that were edited.

**The deferred summons is preserved, and that is not a claim that it is a good HOT plan.** Its own
beat and decision now reach the author instead of being replaced by
`It arrives without warning — … — or refuse to.` Whether a hearing next Tuesday is a hot opening is
a question for the shape diagnostic's report and for reading the prose; this change only stops the
machinery from silently substituting a different plot.

**The planner requests this run dispatched (10):**

| | |
|---|---|
| unconditional `The hook still exists (keep it)` | **0 / 10** |
| unconditional `HOOK OBJECT MUST CARRY THE CRISIS` | **0 / 10** |
| conditional replacement present | 5 / 10 (the steer returns `''` when the crisis family is STATUS_DESTRUCTION or unset) |
| `THERE MAY BE NO OBJECT AT ALL` stated | 5 / 10 |
| object required only for type `object` | **10 / 10** |
| institutional/procedural named as EVENTS, not documents | **10 / 10** |
| a future summons taught as a HOT exemplar | **0 / 10** |
| A-PLOT DOMAIN COOLDOWN | 0 / 10 — it lives on the A-plot generator request (app.js:63858), not this one |

**Source sweep** for remaining unconditional object language outside comments returns two lines,
both conditional at runtime: app.js:292886 (`If hook_object is non-null, name it with a number /
name / quoted line`) and app.js:296498 (the mandate, now inside the
`hookObject && _psObjectRequired` branch).

---

## The unseeded staging conflict — verified, not fixed

Measured on a separate unseeded arm (the delivery arm supplies a mission, so its stage resolves
before the planner and this path does not run there): **1 request dispatched, and that one request
both tells the planner it is solo and demands a `stage_contract.participants` list.**

* app.js:291814 — on the planner-owned path the preliminary stage is hard-coded to the
  protagonist alone.
* app.js:291898 — `_soloStage` is computed from that preliminary stage and baked into the
  **dispatched** template (the "no one else is here", "NOT another person" clauses).
* app.js:293707 — `_soloStage` is recomputed only **after** the reply is ingested, when the
  planner's own `stage_contract` may have added participants.

So obeying the template makes a second person impossible, and declaring one contradicts the
template it was given. This is why a best-friend-wearing-his-cologne opener could not be expressed
on that path, and why the earlier harness reached for a seed. **No seed is used now** — every
delivery case runs the ordinary unseeded path.

This is a staging-ordering defect, not object compulsion, and it is **not changed here**. The
ordinary offstage-LI rule is untouched and is not the cause: 11/11 requests carry it, and it
concerns the LI only, not everyone else.

## Still open

* **CG is not cleared.** `_buildScene1Scaffold` returning `''` proves only that the literary
  builder is skipped. CG's own opening machinery
  (`_completeStagedSceneFromScreenplay`, app.js:~250195, via `_buildCGScaffold` app.js:238678) is a
  separate path and a separate verification task.
* **The next place the chosen crisis is undone — same defect class, different rule, not changed
  here.** On the SHARED_HISTORY arm (the gate at app.js:296266 covers SHARED_HISTORY /
  LOOMING_PRESENCE / a billionaire subtype) two vocabulary detectors fire and inject the
  `INSTITUTIONAL → EMBODIED REFRAME (HARD)` directive, which tells the author the material
  "must NOT be the ENGINE of Scene 1 … NOT on a briefing / audit / board vote / institution /
  packet". Measured:
  * `[A-PLOT:INSTITUTIONAL-GRAVITY] fail terms=[board]` — the active board vote trips on the single
    word *board*. The crisis text still reaches the author, accompanied by an instruction not to
    let it be the engine.
  * `[RESOURCE-BLEED] fail terms=[stop the bleeding]` — a literal haemorrhage is classified as
    money draining, so the **physical** crisis gets the institutional reframe too. A clean false
    positive.

  The same gate also re-rolls `plan.pc_career` and `plan.opening_setting` on a vocabulary match
  (app.js:296276, 296283). Neither re-roll fired here (career `ceramicist`, setting `a studio back
  room`), so nothing is claimed about them beyond their existence. This is an adjacent defect and a
  separate decision; it is reported, not fixed.
* No prose has been generated or judged. Passing delivery checks demonstrates preservation only.

---

# ROUND 2 — applied 2026-10-27

Five further changes, all provider-free, none committed or deployed. The round-1 object-handling
fixes are closed and untouched: the shared definitions, the removed swaps, the preserved closing
boundary and the scaffold controls are all left exactly as they were.

## 1 · The institutional-gravity / resource-bleed gate reports only

**app.js:296276.** Three writing behaviours on a keyword match are now reporting-only, behind the
same opt-in shape the other pens use (`window._institutionalReframePenOff = false` restores them):

* the **career re-roll** — it overwrote `plan.pc_career` from a pool;
* the **setting re-roll** — it overwrote `plan.opening_setting` from a pool;
* the **reframe flag** — it set `state._scene1InstitutionalReframe`, which injected
  `INSTITUTIONAL → EMBODIED REFRAME (HARD)`: *"That material is BACKGROUND TEXTURE ONLY — it must
  NOT be the ENGINE of Scene 1."*

What the gate was matching on, measured before the change:

| case | detector | terms |
|---|---|---|
| active corporate dispossession | `[A-PLOT:INSTITUTIONAL-GRAVITY] fail` | `board` |
| physical crisis (literal haemorrhage) | `[RESOURCE-BLEED] fail` | `stop the bleeding` |

Explicit story assignments and player choices are left as they are — the gate no longer rewrites
anything. It now logs and files a `_validatorReports` entry:

> `[SCENE1:INSTITUTIONAL-REFRAME] VALIDATE-ONLY (default) — terms=[stop the bleeding]. The chosen crisis stands; no reframe directive is injected.`

## 2 · Props are optional in both directions

`It is NOT the subject of the opening and it does not have to appear at all` is gone, and so is
`do NOT steer around the prop that is already here` (at the author) and `do NOT steer around a
prop that is already there` (at the planner). The affirmative permission is wider than before:

> `• PROP IN THE SCENE (available, never required): "her ring". Use it wherever it genuinely serves — as the focus of the opening, somewhere in the middle, through the closing decision, or not at all. Mentioning it is not required and avoiding it is not required either.`

## 3 · The cooldown no longer requires completed damage

`ALREADY IRREVERSIBLE` is removed. Test (1) is now about immediacy, and says explicitly that the
catastrophe may still be preventable and a suspicion need not become a fact:

> `(1) HAPPENING NOW, NOT PENDING — the pressure is live in this scene, not scheduled, filed, or awaiting a determination elsewhere. It does NOT have to be finished, inevitable, or already lost: she may well be able to stop it, and a suspicion does not have to become a proven fact. What is ruled out is the protagonist waiting on a process that will resolve somewhere else.`

Test (2) now reads "what is at stake is HERS" rather than "what is taken, exposed, broken".

## 4 · The pending roster is no longer treated as a confirmed solo scene

**app.js:291898 / 293284 / 293269 / 293707.** On the planner-owned path the preliminary stage is
the protagonist alone by construction, because the planner has not answered yet. `_soloStage` is
now withheld while the roster is `pending`, so the request no longer asserts "no one else is here"
before the planner has established who is. Nothing is weakened: `_soloStage` is recomputed from
the **confirmed** stage once `stage_contract` is ingested, and the solo validators
(`SOLO_BODY` / `SOLO_LIVE_MESSAGE` / the staged-cast check) run against that confirmed roster
exactly as before, with a new line recording the moment:

> `[SCENE1:STAGE:CONFIRMED] solo=<x> onStage=[…] — confirmed staging restrictions apply from here`

While pending, the roster block says what it actually knows, and points at the existing contract
rather than at a special seed or an extra call:

> `THIS ROSTER IS NOT YET CLOSED. It lists who is ALREADY known to be in the room; this opening has no authored stage, so YOUR stage_contract.participants is what establishes the rest of it. Anyone you declare IN_PERSON there is physically present and must also appear in staged_characters — and nobody outside your own declaration may act, speak, arrive or be touched.`

The ordinary offstage-LI default is untouched; it concerns the love interest and does not exclude
supporting characters.

## 5 · The complete outgoing author request, captured at the transport

`node _nf_opening_author_request_capture.mjs`. Drives the real `handleBeginStory` and intercepts
the author request **as it is dispatched**, writing the whole system + user message to disk and
then aborting it, so nothing is sent.

A measurement error found and fixed here: the opening prose call goes out as
`role=STRUCTURE_GENERATOR` and **does not set `author: true`** — only continuations do. A first
census using that flag as the test captured nothing while four author requests went past it. The
test is now the scaffold block's own closing-boundary line, which is unique to this request.
Unrecognised model doors are aborted rather than answered, after an earlier pass answered one with
`{}` and let a downstream chain run on `{}` as prose.

**Captured: 4 complete requests, 139.0–140.0 KB system + 85.2–120.6 KB user.** Doors: 24 upstream
generator doors answered from five labelled minimal fixtures (0 unmatched), 0 aborted, none
escaped, nothing dispatched.

| case | crisis present | opening beat verbatim | decision verbatim | countermanding instruction |
|---|---|---|---|---|
| active corporate dispossession | 6/6 words | ✓ | ✓ | **none** |
| physical crisis (literal bleeding) | 6/6 | ✓ | ✓ | **none** |
| quiet betrayal + optional ring | 6/6 | ✓ | ✓ | **none** |
| the pressure IS an object (control) | 5/5 | ✓ | ✓ | object mandate present — correctly |

Swept for ten countermanding patterns, not only the edited ones: the institutional reframe, the
"must NOT be the ENGINE of Scene 1" sentence, both object mandates, the invent-an-object fallback,
`It is NOT the subject of the opening`, `do NOT steer around the prop`, the object-dependent
closing example, `ALREADY IRREVERSIBLE`, and `no one else is here`.

## The scaffold-block arm, re-run after these changes

`node _nf_opening_crisis_delivery.mjs`: **15 / 15 literary blocks**, 5 CG early exits,
16 planner requests, **0 skeleton repair calls**, 23 `/api/**` aborted, none escaped, all delivery
checks pass. The mandate sweep reports *no object mandate of any known shape* on every case except
the three `object`-pressure positive controls, where it correctly reports all three mandates. The
institutional reframe no longer appears in any block.

## Coverage, stated plainly

**CG contributes nothing to delivery coverage.** Its five early exits are counted separately and
are not evidence about CG. `_completeStagedSceneFromScreenplay` (app.js:~250195) has not been
captured, and CG remains unchecked.

---

# ROUND 3 — applied 2026-10-27

Two surviving contradictions closed. 4 hunks, +13 / −5 lines. Cumulative since the start:
20 hunks, +229 / −94. Cache-buster → `?v=20261027b-pending-roster-pressure`. Not committed, not
deployed. The round-1 and round-2 fixes are closed and untouched.

## 0 · Baseline completed, and `public/app.js` restored

The baseline swap finished and the file was restored **byte-identical** (`cmp`) before any round-3
edit, and `node --check` clean. Both artifact sets are preserved:

* `scratchpad/skel_baseline.txt` + `scratchpad/author_request_out_BASELINE/` — the **pre-fix** file
* `scratchpad/skel_patched.txt`, `scratchpad/skel_round3.txt`, `_nf_author_request_out/` — the patched file

**The regression suite's actual result: 405 passed · 3 failed on BOTH sides.** The three are
`X14-8`, `X14-10`, `X14-11` — the disclosure-commit verdict handoff — and they fail identically
on the pre-fix file. **They are pre-existing, not regressions.** No older suite result is being
counted; both numbers come from runs made in this session, against the pre-fix file and against
the round-2 patched file.

**A third run, after the round-3 edits, ABORTED and is not a result** (and a fourth found a real
regression — see ROUND 4). It stopped at assertion 130
with a Playwright navigation timeout (`navigating to "http://localhost:3000/", waiting until
"commit"`), almost certainly contention from a delivery-harness run hitting the same dev server at
the same time — the server was serving 200 immediately afterwards. It is recorded as
`scratchpad/skel_round3.txt` and is **not** counted as a pass or a fail. The clean re-run is
`scratchpad/skel_round3b.txt`, and it found a real regression — 32 new failures. See ROUND 4.

## 1 · The pending-roster change finished everywhere it is expressed

**app.js:293021.** The `staged_characters` template still carried the closed form — `PREFILLED AND
FIXED`, `Do NOT add a person`, and, when only the protagonist was listed, `never by introducing
someone` — in the same request as the later block saying the roster was not yet closed. The closed
form is the one that reads as law, so a supporting character still could not be brought in.

The template now has two forms. **Confirmed staging keeps its exact-set enforcement word for word,
unchanged.** Pending staging says what is actually true:

> `THE ROWS ABOVE ARE WHO IS ALREADY KNOWN TO BE PRESENT — not the finished cast. … YOUR stage_contract.participants decides the room, and this array must MIRROR it exactly … If the scene needs a supporting character present, declare them in stage_contract and add their row here — that is how a person is brought in, and it is the only way. … Anyone in neither list is NOT in the room … The love interest is OFF-STAGE by default and is not to be staged here; that is about HIM, and it does not mean the protagonist is alone.`

## 2 · The author-opening rules reconciled at source

Four sites, each edited in place. **No new overriding paragraph was added.**

| site | was | is |
|---|---|---|
| app.js:284733 (OPENING RULE, hot branch) | `a PERSON acting on the protagonist by sentence 1–2` | `immediate pressure that is personally consequential for the protagonist, landing by sentence 1–2` — may be a person, and equally her own body failing, a physical emergency in her hands, a deadline or force bearing down, or a discovery she makes in this moment |
| app.js:284736 | `Character presence should be immediate … must not delay interaction or tension` | immediate `WHERE THIS SCENE HAS OTHER CHARACTERS IN IT`; where no one else is present the pressure is carried by her own action, body and stakes — `do not manufacture an interaction to satisfy this line` |
| app.js:31734 (hot-crisis prose directive) | `The FIRST SENTENCE'S SUBJECT is a PERSON doing something … NOT … the protagonist reflecting / remembering / noticing / feeling` | the first sentence puts her inside live, personally consequential pressure; a person OR her body failing OR an emergency under her hands OR a clock running out OR `a discovery she is making AS THE SENTENCE HAPPENS`. Still ruled out: place, weather, light, abstraction, and `RECOLLECTING or PROCESSING something that happened elsewhere` — `noticing counts only when the noticing IS the event, never when she is reviewing what she already knows` |
| app.js:284040 (EARLY ENERGY BIAS) | `include a line of dialogue, a character action, or a direct interaction` | `something must be HAPPENING to or around the protagonist — a line of dialogue, a character action (her own counts), a direct interaction, or live physical pressure on her` |

## Verification — the two required cases, through the blocked transport

`node _nf_opening_author_request_capture.mjs` — 6 cases, **6 complete author requests captured**
(140.1–140.9 KB system + 83.3–120.6 KB user), each aborted after capture. 0 unmatched upstream
doors, 0 aborted, none escaped, nothing dispatched.

**A genuinely solo physical crisis.** Issued refs `["pc:self"]`, declared IN_PERSON `["pc:self"]`.
The request carries `ONLY NADIA IS PHYSICALLY PRESENT` and `NOBODY ELSE ACTS IN THIS SCENE` —
correct, because this roster is **confirmed** solo — and Julian is offstage. No surviving demand
for another person: the crisis, beat and decision are all present verbatim and the regression scan
is clean.

**A supporting character present, the LI absent.** Admitted through the existing identity
machinery and nothing else — a relationship-ledger entity, which is what `_cpIssuedRefs` reads.
Measured:

* issued refs: `["pc:self","named:mira"]` — **a second ref was issued**
* the planner declared both IN_PERSON in its own `stage_contract`, and `staged_characters` mirrored it
* the plan was **accepted**, and the confirmed author request states:
  `• PHYSICALLY PRESENT: Nadia, Mira`
* `ONLY NADIA IS PHYSICALLY PRESENT` is **absent** from this request (it is present in the solo one)
* `Julian is offstage` — the LI default held while a supporting character was on stage

So pending → confirmed staging admits a supporting character, exact-set enforcement survives
confirmation (`Do NOT materialise anyone not physically present`), and **LI absent no longer means
protagonist alone**. No special seed, no extra planner call, no preloaded confirmed cast.

### The remaining limitation, named

A second ref is issued only because something put an entity in the relationship ledger. On a story
where nothing has — a cold corridor start with no seed cast and an empty ledger — `_cpIssuedRefs`
returns `['pc:self']` alone, and the planner then has no ref with which to declare anybody, however
open the roster wording is. **Removing the solo wording does not by itself make a supporting
character eligible on such a story; the issuance does.** That is a separate change to
`_cpIssuedRefs` / the admission path and is not made here.

## Scope of the scan, stated honestly

The pattern scan is a **regression check for known wording** — the specific strings found to
countermand a chosen crisis, now sixteen of them including the four fixed this round. A clean scan
means none of *those* has returned. It is **not** proof that a ~225,000-character request contains
no contradiction anywhere; two of them survived the ten-pattern version of this scan and were
found by reading.

## Still unverified

**CG.** `_buildScene1Scaffold` returns `''` for CG and its five early exits are reported
separately; they are not delivery coverage and say nothing about CG.
`_completeStagedSceneFromScreenplay` (app.js:~250195) has not been captured. CG remains unchecked.


---

# ROUND 4 — a regression I introduced, found by the existing suite, and fixed

## What broke

The clean re-run after round 3 came back **373 passed · 35 failed** against 405 · 3. Thirty-two of
the thirty-five were new, all in **PART S — SOLO STAGE CONTRACT**, and they are the contract for
exactly the case under discussion:

```
   eligible cast     : ["Lirael"]
  ✓ S1 the solo stage really is narrator-only
  ✗ S1 a narrator-only plan is ACCEPTED and reaches the author      author=0
  ✗ S2 narrator-only template contains NO interlocutor_placement field
  ✗ S6 the planner receives the authoritative solo-stage directive
  ✗    solo: "a clerk calls from outside" is rejected before Grok
  ✗    solo: a live message arriving mid-scene is rejected before Grok
  …
```

PART S's solo arm **is** the pending path. Withholding the solo instructions from every pending
roster took them away from a narrator-only opening on which no second person could ever be
declared — so the request asked for `interlocutor_placement`, carried no solo directive, and
stopped rejecting two-person pressure before the author.

**My own harness was green while those 32 assertions were red.** 15/15 scaffold blocks, 6/6 author
requests, every delivery check passing. It tests preservation of a chosen crisis; it does not test
the solo contract, and it never would have found this. That is what the existing suite is for.

## The fix: pending is two situations, and only one of them is open

A pending roster where the **only issued ref is the protagonist** is already solo — the contract
has not come back, but nobody else can be in it. A pending roster where **some other ref was
issued** is genuinely open, and that is the only case where asserting "no one else is here"
pre-empts a legitimate declaration. The issuance (`_s1IssuedRefs`) is computed before the request,
so the distinction is available exactly where it is needed:

```js
var _stageOpenRoster = !!(_stage && _stage.pending)
  && Array.isArray(_s1IssuedRefs)
  && _s1IssuedRefs.filter(function (r) { return String(r) !== PC_IDENTITY_REF; }).length > 0;
var _soloStage = !_stageOpenRoster && _eligibleCast.length === 1;
```

with a line that states which case it is:

> `[SCENE1:STAGE:PENDING] roster ALREADY SOLO — issued refs [pc:self] · nobody else is eligible, so the solo instructions apply now`
> `[SCENE1:STAGE:PENDING] roster OPEN — issued refs [pc:self, named:mira] · solo instructions withheld until the contract is confirmed`

This satisfies both constraints without weakening either: a genuinely solo opening keeps every
solo instruction and every pre-author rejection, and an opening where a supporting character is
eligible is no longer told that nobody else is present. Cache-buster →
`?v=20261027c-open-roster-eligibility`.

It also moves the limitation named in round 3 out of the report and into the code: **eligibility is
what decides whether a supporting character can be staged.** A story whose relationship ledger and
seed cast are both empty issues `pc:self` alone, its roster is correctly not open, and no roster
wording changes that. Changing `_cpIssuedRefs` / the admission path remains a separate change.


## Round 4 — verified

**Regression suite: 405 passed · 3 failed** (`scratchpad/skel_round4.txt`) — exactly the baseline,
only the three pre-existing `X14` disclosure-commit assertions. PART S is fully green, including
`planner reqs: 1 · author reqs: 1` and `C+ delivered: ["Lirael"]`, which were `author reqs: 0` and
`[]` when it was broken.

Both harnesses re-run after the eligibility gate changed which branch they take:

| | |
|---|---|
| author requests captured | **6 / 6**, 140.3–141.3 KB system + 80.6–120.1 KB user |
| chosen crisis / beat / decision present verbatim | 6 / 6 |
| known-wording regression scan clean | 6 / 6 (object mandate present on the `object` control, correctly) |
| scaffold-block arm | 15 / 15 literary blocks, 0 repair calls, all delivery checks pass |

Both staging branches behave as intended in the fresh captures:

| | solo-physical | supporting-present |
|---|---|---|
| `ONLY NADIA IS PHYSICALLY PRESENT` | present (correct — confirmed solo) | **absent** |
| `NOBODY ELSE ACTS IN THIS SCENE` | present | **absent** |
| `• PHYSICALLY PRESENT:` | `Nadia` | **`Nadia, Mira`** |
| LI | `Julian is offstage` | `Julian is offstage` |

Cumulative diff since the start: **20 hunks, +255 / −93 lines** in `public/app.js`, plus the
cache-buster (measured against `scratchpad/app.js.prepatch`, not against `git HEAD`, which also
holds a large amount of unrelated uncommitted work). Not committed, not pushed, not deployed.

---

# ROUND 5 — the two outstanding review findings

5 hunks, +104 / −14. Cumulative since the start: **23 hunks, +351 / −99**. Cache-buster →
`?v=20261027e-conditional-presence`. Not committed, not deployed. The crisis-preservation and
optional-prop fixes, and the repaired regression, are closed and untouched.

## The mode-selection trace, which changes what the first finding means

`state.storyMode` **as production set it on this path: `null`.** `applyInferredStoryMode()`
(app.js:276340) hard-sets `state.storyMode = 'participatory'` for every story —
*"All stories default to participatory; no flip based on inference"* — and the only route to
`'literary'` is the reader choosing **Mindful** on `#storyModeLiterary` (`index.html:1988`).

Both offending blocks gate on `state.storyMode === 'literary'` **exclusively**:

* `_litMode` (app.js:283958) → TENSION REQUIREMENT, OPENING PRESSURE (the 120-word rule), ESCALATION RULE
* `${state.storyMode === 'literary' ? … : …}` (app.js:284833) → FIRST SECTION RULES, which contains the first-line demand and the solitary-activity prohibition

Elsewhere production uses the wide predicate
`storyMode === 'literary' || renderMode === 'literary' || storyModality === 'literary'`
(app.js:30495, 61149, 101865). So a literary-format story on the default toggle takes the
**participatory** branch. The harness was faithful: it reproduced the shipped default. This is not
a mode-selection artifact to be configured away, which is why the fix below keys on **who is
actually on the page** rather than on the mode.

## 1 · The surviving author-opening demands

Five instructions, all in that block, all edited in place. No new overriding paragraph.

| site | was | is |
|---|---|---|
| 284875 FIRST LINE | `Another character must address the protagonist directly.` | known-solo → `NOBODY ELSE IS ON THE PAGE … nothing may address her`, pressure on her body / hands / procedure / clock / a discovery as it happens. Otherwise **conditional**: `WHERE ANOTHER CHARACTER IS ON THE PAGE (check the staged roster in this request) … WHERE THE ROSTER IS THE PROTAGONIST ALONE: nothing may address her` |
| 284072 OPENING PRESSURE | `Within first 120 words, another character must react to or address the player.` | `the pressure must ESCALATE on the player`; from another character where one is on the page, from the situation / body / place / clock where the roster is the player alone, and `no second character is to be introduced to supply it` |
| 284878 FORBIDDEN | `✗ The protagonist alone performing a private task, ritual, or preparation` | dropped entirely when solo is known; otherwise qualified — `WHEN THE STAGED ROSTER PUTS SOMEONE ELSE ON THE PAGE. Where the roster is the protagonist alone, her own action under live pressure IS the opening and is not a fault.` |
| 284877 FORBIDDEN | `✗ … sensory buildup before another character speaks or acts` | `before the pressure is on the page` |
| 284879 FORBIDDEN | `✗ Atmospheric scene-setting before interaction` | `before the pressure is on the page` |
| 284884 FIRST LINE MUST | three options, two of which need a second person | the list now states that the first two require another character on the roster, and adds a fourth: `the protagonist's own body or her own act under live pressure` |

**The last two were found by reading the fresh capture, not by the pattern scan.** The scan carried
the three strings named in review; these two expressed the same assumption in different words, in
the same list, and the scan went straight past them. They are now in it.

### Why conditional rather than only solo-gated

The prose prompt (`introPrompt`, app.js:284726) is built roughly 13,000 lines before the Scene-1
stage resolves (`_buildScene1Scaffold`, app.js:297535), so a resolved flag does not exist when
these lines render. Two mechanisms close that gap:

* **Early eligibility.** A scene is already known solo when no issued identity could physically
  appear in it, and the issuance is available from the start. `_openingIsKnownSolo` answers from
  the resolved stage where it exists, and from eligibility before that; anything genuinely unknown
  returns false and every rule keeps its existing behaviour.
* **Conditional phrasing.** Where the answer is legitimately not yet known — a supporting
  character is eligible and the planner has not yet chosen — the rule is stated against the staged
  roster that travels in the same request, instead of assuming someone is there. That is what
  makes the "eligible but the planner chose solo" case correct, and it is why the rule is
  conditional rather than merely gated.

## 2 · Eligibility is distinct identities, not reference-string inequality

`_stageOpenRoster` previously opened the roster for **any** ref other than the literal `pc:self`.
The rule is now one function, `_openingEligibleOthers`, used by both the stage resolution and the
prose prompt so they cannot drift. It excludes the protagonist, **any alias of her**, **the love
interest while he is offstage by default**, and anyone the resolved stage has already barred from
presence — and it reports its exclusions:

> `[SCENE1:STAGE:PENDING] roster ALREADY SOLO — issued [pc:self, named:julian] · eligible to appear [nobody] · excluded pc:self (the protagonist); named:julian (the love interest, offstage by default) · nobody else is eligible, so the solo instructions apply now`

**Availability is never obligation.** An open roster permits a supporting character; it does not
require one, and the log says so: `staging a supporting character is PERMITTED, not required`.

### A bug in my own round-2 code, found on the way

`[SCENE1:STAGE:CONFIRMED] solo=false onStage=[Nadia]` — a one-person confirmed stage reporting
not-solo, because the confirmation line re-consulted `_stage.pending`, which the re-resolved
contract still reported. Once the planner's contract has been ingested the roster is closed by
definition, so it is now simply `_soloStage = _eligibleCast.length === 1`.

## The targeted checks — failing before, passing after

Same harness, same fixtures, `node _nf_opening_author_request_capture.mjs`, 8 cases.

| check | before | after |
|---|---|---|
| ledger holds only the offstage LI → roster ALREADY SOLO | ✗ got OPEN | ✓ |
| ledger holds an alias of the protagonist → roster ALREADY SOLO | ✗ got OPEN | ✓ |
| eligible supporting character → roster OPEN | ✓ | ✓ |
| eligible supporting character, planner declines → OPEN, and the request is accepted | ✓ roster, ✗ demands | ✓ |
| solo physical crisis → no instruction demands another person | ✗ all three | ✓ |
| offstage-LI case → no instruction demands another person | ✗ all three | ✓ |
| PC-alias case → no instruction demands another person | ✗ all three | ✓ |
| **14 failures → 0** | | |

One of those "after" passes required tightening a check rather than the instruction: the
solitary-activity phrase is still present in the conditional form, so the check now fails only on
the **unconditional** form (the phrase without the roster exemption following it). Restore the flat
wording and it fails again.

The resulting complete request, solo case, verbatim:

> `FIRST LINE (NON-NEGOTIABLE):`
> `The protagonist is already inside live pressure, and NOBODY ELSE IS ON THE PAGE — the room is hers alone, so nothing may address her. The first sentence puts that pressure on her: her own body failing or fighting her, an emergency under her hands, a procedure going wrong, a clock running out on her, or a discovery she is making as the sentence happens.`
> `Within the first 120 words the pressure must ESCALATE on the player … NOBODY ELSE IS ON THE PAGE in this scene, so that escalation comes from the situation, the body, the place or the clock, and NO second character is to be introduced to supply it.`

## Explicitly unresolved

**Fresh-story supporting-character admission.** Every positive case here puts the identity in the
relationship ledger by hand. That demonstrates the *staging* path — issuance → declaration →
confirmation → `• PHYSICALLY PRESENT: Nadia, Mira` — and demonstrates **nothing** about whether a
fresh story's own creation/admission path ever supplies such an identity. On a story with an empty
ledger and no seed cast, `_cpIssuedRefs` returns `['pc:self']` and no supporting character is
eligible at all. **Unresolved until the real creation/admission path is traced.**

**CG.** Unverified. `_completeStagedSceneFromScreenplay` has not been captured.

**The scan.** A regression check for known wording — eighteen strings now. Two findings this round
came from reading a captured request, which is the third time that has happened. A clean scan is
not proof of no contradiction.

## Regression suite, round 5

Two runs, and the distinction matters:

* **Covering patches 13–17** (`scratchpad/skel_round5.txt`): **405 passed · 3 failed** — the same
  three pre-existing `X14` disclosure-commit assertions, nothing new. PART S green.
* **Covering the final file** (patches 13–18, i.e. including the two instructions found by reading
  the capture): `scratchpad/skel_final.txt`. That run started after those edits; its result is
  reported on its own rather than inherited from the run above, because the earlier run could not
  have seen them.

Both are now in, against the final file:

* **Regression suite, final file** (`scratchpad/skel_final.txt`): **405 passed · 3 failed** — the
  same three pre-existing `X14` disclosure-commit assertions and nothing else. PART S green.
* **Capture harness, final file**: 8 cases, **27 author requests captured** (each aborted after
  capture), 54 upstream doors answered from the five labelled fixtures, 0 unmatched, 0 aborted,
  none escaped — **all checks pass**, including the two added for patch 18.

### The two newest checks were proven to bite

They were written alongside their fix, so passing proved nothing on its own. Applied to the
**preserved pre-fix capture** (`scratchpad/author_request_out_BASELINE/`), all five solo-demand
checks FIRE; against the final capture all five are clean:

| check | pre-fix capture | final capture |
|---|---|---|
| `Atmospheric scene-setting before interaction` | **FIRES** | clean |
| `FIRST LINE MUST` list offers no solo-valid option | **FIRES** | clean |
| solitary activity forbidden, unconditional | **FIRES** | clean |
| another character must ADDRESS her, unconditional | **FIRES** | clean |
| another character must REACT within 120 words, unconditional | **FIRES** | clean |

An earlier bookkeeping slip is left on the record: for a short while this file claimed the captures
had been regenerated against the final file when they had not. They have been now, and the claim
above is the measured one.

---

# FRESH-STORY SUPPORTING-CHARACTER ADMISSION — traced, not filled

Three provider-free runs, in sequence. Nothing hand-populated in the fresh-story case, and nothing
implemented from the proposal at the end.

## The three runs

| run | result |
|---|---|
| regression suite (`scratchpad/skel_round6.txt`) | **405 passed · 3 failed** — the three pre-existing `X14` disclosure-commit assertions. Not inherited; this is its own run. |
| admission trace (`_nf_social_slot_out/TRACE.json`) | the chain stops at the FIRST step. See below. |
| capture, incl. the new fresh case | 9 cases, **30 author requests captured**, 0 aborted, none escaped, all checks pass |

## The fresh-start chain, step by step

**Did the premise select its best friend? NO — and this is the first missing connection.**

A fresh story, empty relationship ledger, A-plot goal *"find out whether her best friend has been
sleeping with her fiance"*, antagonist *"the best friend"*. The circle it resolved:

```
slots resolved: 2
  • a personal assistant   fn=ACCELERATOR  slotKind=personal_assistant  slotId=a_personal_assistant#1  entityId=null
  • a sibling              fn=PROTECTOR    slotKind=null kinship=sibling slotId=a_sibling#1             entityId=null
best-friend slot selected : false     matching slots: []
```

No best friend. No substitute was accepted — a sibling and a personal assistant are not stand-ins.
Two independent reasons, both in `_resolveSocialEcosystem` (app.js:301847-301854):

1. **Selection never reads the premise.** `rolePool = _resolveSocialRolesPool(s)` is keyed by
   WORLD; `roles = _rotatingExemplars(roleKey, rolePool, castSize)` draws from it by ROTATION, 2
   of 7 at the `taste` tier. The A-plot is not consulted at any point, even though its antagonist
   is literally "the best friend".
2. **This world's pool has no close friend in it.** The story resolves to the `billionaire` pool:
   `'a personal assistant', 'a sibling', 'an old college friend', 'a colleague', 'a member of his staff the PC befriends', 'an old friend from before the money', 'a cousin'`.
   Of the ten pools, **only `modern` contains `'a close friend'`**. The billionaire pool's two
   friend-shaped entries route through the generic `\bfriend\b → friend` catch-all, never to
   `close_friend` (`SOCIAL_ROLE_PHRASE`, app.js:34004-34058).

**Did that person acquire an identity? NO — and it could not have.** `entityId: null` on every
slot, by design (app.js:301995: *"NOT an entity yet. Materialisation is lazy"*). The bridge that
would do it, `_materializeSocialSlot` (app.js:302036), has exactly one occurrence in the file —
its own definition. **Zero callers.** That is the second missing connection, downstream of the
first.

**Did the identity reach the planner's issued roster? NO.** Observed in the request production
actually dispatched, not from a private call — `_cpIssuedRefs` is private, is not on `window`, and
the probe reports that as an absence rather than as an empty roster:

```
FRESH story, premise requires a best friend, nothing registered
  staging: issued refs ["pc:self"] · declared IN_PERSON ["pc:self"]
  pending-roster decision is ALREADY SOLO — got ALREADY SOLO
```

**Later staging and author delivery: not reached, and therefore not evidence of anything.** The
chain stopped at step one. Where a `named:` identity DOES exist, staging and delivery work — that
is the `supporting-present` case (`• PHYSICALLY PRESENT: Nadia, Mira`, LI offstage) — but that
case hand-populates the ledger and says nothing about a fresh story.

**Component evidence, labelled as such and not used above:** the probe's manual
`_materializeSocialSlot` call never ran, because the premise never produced a best-friend slot to
call it on. Nothing was filled in to complete the demonstration.

## Available vs already introduced — the tracking already exists

No new field. Production says so itself at app.js:33616:

> `RELATIONSHIP LEDGER (3A) — a SIBLING of _characterDisclosureLedger, not an extension of it. That store tracks per-character disclosure and appearance … different epistemics (who knows an edge is not who has met a character)`

* `state._relationshipLedger.entities[id]` — the identity EXISTS. Availability.
* `state._characterDisclosureLedger.byEntity[canonicalId]` (app.js:31976, 31994) — what the reader
  has been told, written by `_updateCharacterDisclosureLedgerForCurrent(pageProse, pageUid)`
  (app.js:35080) from the **published page prose after the page commits** (called at app.js:14354).

Same canonical id space, two stores, two lifetimes. Registering an identity therefore cannot imply
the reader has met the character. One caveat for any change here: the disclosure updater DEFERS for
a baked opening (`[LEDGER:ADMIT] baked opening — character-memory extractor deferred … authored
ledgerSeeds are the record`), so "introduced" comes from authored seeds on that path, not from
extraction.

## The smallest implementation proposal — NOT IMPLEMENTED

Three connections, all through machinery that already exists. No new subsystem, no new field, no
new store.

**(1) Let the premise participate in role selection.** In `_resolveSocialEcosystem`, at the point
`roles` is computed (app.js:301854): route the A-plot's named supporting person through the
EXISTING `_relRolePhraseRoute`, and where it resolves to a social kind, seat that role as the first
member of the circle in place of one rotated draw. The remaining slots rotate exactly as now.
*Preserves:* the phrase-keyed slot-id derivation (so ids stay stable across save/restore), and
`slotKindUnresolved` — a phrase that routes to nothing is still refused and mints nobody
(app.js:302132: *"refusing to materialise a character from an unclassified role"*).
*Does not:* add to any pool, override the rotation for the other slots, or coerce an unroutable
phrase into a kind.
*A question for you, not a decision I should make:* whether the non-`modern` pools should also gain
a close-friend entry. Routing the premise's own phrase makes that unnecessary for the
premise-required person, but it stays true that nine of ten worlds cannot ROTATE one in.

**(2) Register that one identity before issuance.** In `_buildScene1Scaffold`, immediately before
`_s1IssuedRefs = _cpIssuedRefs(state)` (app.js:291851): call the existing
`_materializeSocialSlot(slotId)` for the premise-required slot ONLY.
*Preserves:* every existing safeguard — the unmapped-slot refusal, the cached-id verification
against the ledger before reuse, the slot-derived id (so a retry or restore yields the same person,
never a second one), and `_cpIsIssuedRef` as the gate on what may be issued.
*Does not:* register the rest of the circle. The other slots stay lazy, which is the documented
intent.

**(3) Presence stays the planner's choice.** Nothing to add — already built and verified. An issued
`role:` id makes the pending roster OPEN (`staging a supporting character is PERMITTED, not
required`), the planner may declare the person or decline, and the love-interest exclusion keeps him
physically absent either way.

The checkpoint that would settle it: that chain reaching the dispatched planner and author requests
with transport blocked, in the `fresh-best-friend` case, with `issued refs` containing a
`role:…:social:…` id and `• PHYSICALLY PRESENT` naming the friend — with no hand-populated ledger
anywhere.

**Unverified, unchanged:** CG, and generated-prose quality.

---

# CORRECTION — the fresh-story test was bypassing the path it was investigating

## What was wrong with my test

The fixture supplied `aPlot.antagonist` and `aPlot.antagonistShape: 'PERSON'`. **Production reads
neither of those for identity.** It reads `aPlot.antagonistOrAntiForce` (the reference prose) and
`aPlot.antagonistSubject.kind`, and on `kind === 'PERSON'` it mints a canonical identity through
`_relPlotRoleEntity` (app.js:65995-66012). `antagonistShape` is a different field entirely — one
letter, A/B/C, naming the antagonist's relation to the wound.

Worse, **pre-setting `state.aPlot` short-circuited the whole setup**, so the mint block never ran
at all. The earlier conclusion — "the chain stops at step one" — was an artifact of that, not a
finding about production.

## Corrected: a production-shaped A-plot reply through the real path

The fresh cases now pre-set no A-plot. The A-PLOT GENERATOR door is answered with a labelled
fixture **in the production response shape** (`antagonistOrAntiForce`, `antagonistSubject: {kind:
'PERSON', proper_name}`, `goal`, `namedClock`, `stakesIfFail`, `stakesIfWin`, `milestones` with the
count read out of the request), and production parses, validates, corrects and mints by itself.

### The chain, measured

```
[A-PLOT] generated via Grok-4.1-reasoning (7ms)
[A-PLOT] First-attempt validation failed: [specificity_missing_measurable_variable,
                                           specificity_missing_functional_place]
canonical identity minted : plot:aplot_…:primary_antagonist
reached ISSUED REFS       : YES  (issued: ["pc:self", "plot:aplot_…:primary_antagonist"])
pending-roster decision   : OPEN
```

(My fixture's goal was not specific enough on the first pass, so production ran its own correction
path and then produced a usable A-plot. Reported because it happened, not because it was intended.)

Two fresh cases, both with the LI physically absent:

| | planner DECLINES to stage her | planner STAGES her |
|---|---|---|
| canonical identity minted | YES | YES |
| reached `ISSUED REFS` | YES | YES |
| pending roster | OPEN | OPEN |
| `• PHYSICALLY PRESENT` | `Nadia` | **`Nadia, Mira`** |
| named in the author request | yes (as plot context) | yes |
| `Julian is offstage` | yes | yes |

**For the case where the required person IS the A-plot antagonist, there is no missing connection.**
Identity creation → issuance → an open roster → the planner's free choice of presence → delivery to
the author request, with the love interest still absent. It works end to end on production's own
path, and the earlier report of a break was my fixture's fault.

## The proposal is withdrawn

My social-slot insertion would have been wrong in two ways the review named, and the measurement
confirms both:

1. **It would have created a second identity for one person.** The antagonist already has
   `plot:aplot_…:primary_antagonist`; registering "the best friend" again through a social slot
   would mint `role:…:social:…` for the same woman.
2. **The social circle is not a neutral registry.** `_buildSocialEcosystemDirective`
   (app.js:301513) ships a `HARD INVARIANT: EVERY member is fundamentally ON THE PC'S SIDE — even a
   Brake / Skeptic / Rival-Voice / Truth-Teller acts FROM loyalty, NEVER as a second antagonist`.
   Routing a suspected betrayer through it would tell the author she is fundamentally loyal. In the
   corrected run no `SOCIAL ECOSYSTEM` block appears in the request at all, so nothing asserted
   loyalty about Mira — which is the correct outcome and the one the insertion would have broken.

**No pool expansion either.** "An old college friend" or "a bond-sister" can be someone's closest
friend; a missing literal `close friend` entry is a vocabulary gap in the ROTATION pool, not a
storytelling prohibition. Withdrawn.

## The two cases, kept distinct

* **The required person already has an identity** — the A-plot antagonist, the love interest, seed
  cast, FF canon cast. **Reuse it.** Demonstrated above, working.
* **A genuinely unregistered supporting person is required** — someone who is not the antagonist,
  not the LI and not in any seed. That case is **still unestablished**, and it is a question about
  allies, not about antagonists or suspects. What is factual about it: `_materializeSocialSlot`
  (app.js:302036) has zero callers, and social slots carry `entityId: null` by design. What is NOT
  established: that this blocks any real story, since the premise-required person in the case
  actually tested already had an identity by another route. Identifying that connection is separate
  work and needs its own premise — one whose required person is an ally rather than the opposition.

## Corrected bookkeeping

**10 cases, 30 captured author requests.** The fresh case reached solo staging and produced three
author requests; the friend was absent from that delivery because the planner declined to stage her,
**not** because the pipeline stopped.

## Regression state

`public/app.js` is unchanged since the round-6 suite run (`scratchpad/skel_round6.txt`,
**405 passed · 3 failed**, the three pre-existing `X14` assertions). Everything in this section is
harness-side. Identity availability and published introduction remain the two separate stores
documented above. **CG and generated-prose quality: unverified.**

---

# CORRECTED BOOKKEEPING, REAL ASSERTIONS, AND THE ALLY CASE

## Bookkeeping, corrected

The artifacts that supported the antagonist checkpoint contained **11 cases / 33 captured author
requests**, and three things about that run must be stated with it:

* **The A-plot repair FAILED and was soft-passed.** `[A-PLOT] SOFT-PASS (repair failed, kept
  anyway): specificity_missing_measurable_variable, specificity_missing_functional_place — a
  flawed A-plot still feeds the antagonist…`. The first attempt was rejected, the correction
  attempt was rejected **again**, and the existing fallback kept it.
* **Other setup calls were blocked, not answered**: 24 unmatched `PRIMARY_AUTHOR` /
  `STRUCTURE_GENERATOR` doors aborted. The run is not a complete successful fresh-story setup.
* **Both planner choices were scripted test branches.** "Declines to stage her" and "stages her"
  are fixture branches. Nothing here shows a live model choosing well, or choosing at all.

What the run does establish, narrowly: **the identity → issuance → staging → author-request
connection for a PERSON A-plot antagonist.** No production change is justified for that path, and
the social-slot insertion stays withdrawn.

## The observations are now assertions

The mint → issued-ref → delivered-presence chain no longer prints; it asserts and fails:

```
identity chain:   [the A-plot repair FAILED and was SOFT-PASSED by the existing fallback]
  ✓ a canonical identity is minted for the A-plot PERSON antagonist   — plot:aplot_…:primary_antagonist
  ✓ that identity reaches the ISSUED REFS of the dispatched planner request
  ✓ the delivered roster is "Nadia, Mira"   — got "Nadia, Mira"
  ✓ the love interest stays physically absent
```

## The ally case — ONE focused run, and it fails

Premise: a hot crisis whose opening requires a supporting ally who is **neither the antagonist nor
the love interest**, with no seeded and no pre-injected identity — *her private photographs are
going up on the venue screen while her closest friend tries to get her out of the room*. The
antagonist is somebody else entirely (the ex who kept the photographs), so nothing can be satisfied
by substituting him. No ledger was populated, no social slot was registered, no mechanism was
prescribed before observing.

```
  ✓ a canonical identity is minted for the A-plot PERSON antagonist   — plot:aplot_…:primary_antagonist
  ✗ the required ALLY has an identity of her own in the issued roster
        — non-PC, non-antagonist refs issued: []
  ✗ the required ALLY reaches the delivered roster   — got ""
  log [SCENE1:STAGED:INVALID] staged character "Dalia" is not part of this scene's fixed cast
      [Nadia] — the planner may not add, rename or invent a person
  ✗ NO AUTHOR REQUEST WAS DISPATCHED for this case
```

The refusal is **correct behaviour** — a planner may not invent a person. The gap is upstream of it.

### The first missing connection

**The premise has nowhere to name a required supporting person, so nothing can mint an identity for
one.** Specifically:

* The A-plot response schema (app.js:63930-63960) carries **no ally or supporting-cast field at
  all**: `goal`, `namedClock`, `antagonistOrAntiForce`, `antagonistSubject`, `antagonistShape`,
  `antagonistPersonalTie`, the stakes and wound fields, `milestones`. The opposition has a
  declaration slot; an ally has none.
* `_relPlotRoleEntity(aPlotId, role, opts)` (app.js:34234) is already **generic in its role key**,
  and is called in exactly **one** place with exactly **one** key: `'primary_antagonist'`
  (app.js:66004).
* The only other mechanism that could mint such a person — the social circle's
  `_materializeSocialSlot` — has zero callers, and is the wrong instrument anyway: it asserts
  `EVERY member is fundamentally ON THE PC'S SIDE` (app.js:301513).

So: identities exist for the antagonist, the love interest, seed cast and FF canon cast. For an
ordinary ally the opening requires, there is no route at all.

### The only fix I am proposing — nothing else

**One optional declaration on the A-plot, mirroring the antagonist's exactly, minted by the same
function at the same point.**

* *Schema (app.js:~63951):* one reference-prose field for a supporting person the opening requires,
  plus one `{kind, proper_name}` subject classification beside it — the same pair the antagonist
  already has, with the same `PERSON | GROUP | INSTITUTION | FORCE` vocabulary.
* *Mint (app.js:65995, the existing block):* when that subject is a `PERSON`, call the existing
  `_relPlotRoleEntity(aPlot.id, 'required_ally', { label, properName, provenance: 'aplot_required_ally' })`.
  One more role key through machinery that already works.
* *Nothing downstream changes.* `_cpIsIssuedRef` already accepts `plot:` refs; issuance already
  reads ledger entities; the roster already opens; the planner already chooses presence or declines
  it; the love-interest exclusion already holds; and the character disclosure ledger still decides
  separately whether the reader has met her — **being available to appear and having appeared in
  published prose stay two different facts in two different stores.**
* *Scope limits, deliberately:* the field is OPTIONAL and absent means nothing is minted, exactly
  as a GROUP / INSTITUTION / FORCE antagonist mints nothing today. ONE required person, not a cast.
  No loyalty is asserted about her — characterization stays with the A-plot, not with the
  ally-function table. The social circle is not touched and no pool is expanded.

**What this proposal does NOT establish:** that a live A-plot generator would populate such a field
well, or at all. That is model behaviour and is untested. The run above also soft-passed its A-plot
repair, so even the fixture path is not a clean setup.

## State

`public/app.js` is unchanged by any of this — the last source edits were the round-6 block and
identity fixes, covered by `scratchpad/skel_round6.txt` (**405 passed · 3 failed**, the three
pre-existing `X14`). Latest harness run: **12 cases / 33 captures**, 35 `/api/**` aborted, none
escaped, 3 failures — the ally case's two assertions and its refusal, which are the finding.
**CG and generated-prose quality: unverified.**

---

# THE BOUNDED SUPPORTING-PERSON DECLARATION — applied

4 hunks, **+98 / −0** (purely additive). Cumulative since the start: **32 hunks, +463 / −107**.
Cache-buster → `?v=20261027g-required-support`. Not committed, not deployed. No social-circle
expansion, no new character subsystem, no pool change.

## What was added

**1 · An optional declaration on the A-plot response** (app.js:~63951), beside the antagonist's:

> `"requiredSupportPerson": "OPTIONAL, and null unless the OPENING ITSELF cannot be staged without them: ONE supporting person the opening requires on the page who is NEITHER the antagonist NOR the love interest … Null is the normal answer; most openings need nobody here and a companion must not be invented to fill this field."`
> `"requiredSupportSubject": { "kind": "PERSON | GROUP | INSTITUTION | FORCE …", "proper_name": … }`

**2 · The copy and classification** (app.js:~65975). `aPlot` is assembled by explicit field copy,
so without this the declaration never arrived — the first run of the patch reported `NOTHING` for
every case because of exactly that. The pair is now copied and classified by **the same
`_normalizeAntagonistSubject`** the antagonist uses, so the kind vocabulary and the
PERSON-needs-a-reference rule cannot drift apart. A declaration that will not classify is
**dropped, never coerced** into a PERSON. `_aPlotEmptySchema` carries both fields so a restored
save has them.

**3 · The guarded mint** (app.js:~66030), immediately after the antagonist's, using the same
minter under a different role key:

* **the protagonist, the love interest, or the already-minted antagonist → REFUSED.** The
  downstream love-interest exclusion protects *presence*, not identity; a second identity for him
  under a plot role would walk straight past it.
* **a unique existing ledger identity → REUSED**, nothing minted.
* **an ambiguous name → REFUSED** (via the exported `_relMatchByName`, which is production's own
  unique-match rule). Guessing is how one character's psychology lands on another.
* otherwise → `_relPlotRoleEntity(aPlot.id, 'required_support', { … provenance: 'aplot_required_support' })`.

## The claim, kept narrow

This supplies **identity and availability**. Nothing else:

* the author profile starts `status: 'pending'` with `cPlusFacets: []` (`_relEnsureAuthorProfile`,
  app.js:34269) — **no psychology and no Character+ is implied or supplied**;
* the A-plot characterization path continues to handle the **antagonist** specifically, and is
  untouched;
* **the planner still owns staging** — an issued ref makes her available, never present;
* the **character disclosure ledger** still separately records whether the reader has met her, so
  availability and published introduction remain two facts in two stores;
* **absence creates nobody.** No opening is required to have a companion.

## Verification — `node _nf_opening_author_request_capture.mjs`

16 cases, **48 author requests captured**, 0 escaped, **all checks pass**.

| control | result |
|---|---|
| **connected Dalia** | `required supporting person is a PERSON — canonical identity plot:aplot_…:required_support` · in `ISSUED REFS` · identity **BELONGS TO Dalia** (matched by label in the ledger) · **not** the antagonist ref · delivered roster **`Nadia, Dalia`** · `Julian is offstage` |
| **no declaration** | outcome `NOTHING` · no `required_support` ref issued · solo opening unchanged |
| **names the protagonist** | `REFUSED — it names the protagonist` · nothing issued |
| **names the love interest** | `REFUSED — it names the love interest, who is offstage by default and may not acquire a second identity under a plot role` · nothing issued |
| **names the antagonist** | `REFUSED — it names the antagonist, who already has an identity` · nothing issued |
| **already has an identity** | `REUSED, nothing minted` — resolved to `named:dalia` |

The ally assertion was also tightened as required: it no longer accepts "some non-PC,
non-antagonist ref exists". It resolves the ref **production's ledger** gives Dalia, uses *that
same ref* in the scripted stage declaration with a matching staged row, asserts the ref's ledger
label is hers, and asserts separately that it is not the antagonist's. A missing ref fails
explicitly; nothing is substituted.

Two harness faults were fixed to get there, both of which had been masking the measurement: the
stage declaration and the staged row disagreed (so production refused the plan for self-
contradiction rather than for the absent identity), and once the ref resolved, Dalia was added to
`staged_characters` twice (`staged character "Dalia" is listed twice`).

**The reuse control pre-populates the ledger, and that is labelled where it appears.** On a
genuinely fresh story no non-PC / non-LI / non-antagonist identity exists yet, so the reuse branch
is unreachable without prior state. It is component evidence for that branch, not fresh-story
evidence.

## Still not established

* **That a live A-plot generator would populate the new field well, or at all.** Model behaviour,
  untested. The fixture runs also continue to soft-pass their A-plot repair
  (`SOFT-PASS (repair failed, kept anyway)`), so these are not clean setups.
* **Dalia's psychology or Character+.** Out of scope by design, and a separate issue.
* **CG and generated-prose quality.** Unverified.

---

# THE IDENTITY-OWNERSHIP HOLE — closed

## What was wrong with the first guard

It treated `proper_name || reference prose` as an **exact name**. With no `proper_name` it compared
the whole descriptive sentence, so a failed exact lookup of prose became permission to create a new
person. Three source-level declarations walked straight through it:

| declaration | what happened |
|---|---|
| `"Julian, who is somewhere in the building"`, `proper_name: null` | a SECOND identity for the love interest, eligible for staging despite the presence exclusion |
| existing Dalia, `"Dalia, her closest friend"`, `proper_name: null` | a second Dalia |
| reference naming Julian, `proper_name: "Dalia"` | the disagreement undetected, identity accepted |

## The fix — reconcile the person, judge the resolved id

* **The subject** is the proper name when given; otherwise the **leading proper-noun token** of the
  reference (its shape is `<Name>, <role clause>`); otherwise the whole reference as a role phrase,
  which is how a legitimately unnamed person still resolves to nobody and is still created.
* Every candidate goes through **one** resolver built on the machinery that already exists: the PC
  and LI ids (`_relPcId` / `_relLiId`, including a first-name match) and then the ledger's own
  unique-match rule (`_relMatchByName`).
* **Ownership is judged on the resolved canonical id**, not on display-name equality: the PC id, the
  LI id, or `antagonistSubject.canonicalId` → REFUSED.
* **Ambiguous → REFUSED.** **Proper name and reference resolving to different people → REFUSED** as
  a disagreement; neither is minted.
* Resolves to an existing identity → **REUSED**. Resolves to nobody → **minted**.

The fix is NOT "refuse every declaration without `proper_name`" — there is a control for a
legitimately unnamed supporting person, and she is still created.

## Verification — 21 cases, 63 author requests, all checks pass

| control | result |
|---|---|
| **BYPASS 1** — reference names the LI, `proper_name: null` | `REFUSED — it resolves to the love interest` · no `required_support` issued · **`Julian` absent from the ISSUED roster** · **absent from the DELIVERED roster** (`Nadia`) |
| **BYPASS 2** — existing Dalia, `proper_name: null` | `REUSED, nothing minted` → `named:dalia` · **no SECOND identity minted** |
| **BYPASS 3** — reference names Julian, `proper_name: "Dalia"` | `REFUSED — the proper name and the reference name different people ("Dalia" vs "Julian")` · `Julian` absent from both rosters |
| **legitimately UNNAMED person** | `MINTED` · identity belongs to her by ledger label · delivered roster `Nadia, the friend who came with her…` |
| **connected Dalia** | `MINTED` · belongs to Dalia · not the antagonist ref · delivered roster **`Nadia, Dalia`** · LI offstage |
| no declaration / PC / antagonist / existing-person | `NOTHING` / `REFUSED` / `REFUSED` / `REUSED`, all unchanged |

**The LI bypass is demonstrated closed through issuance and staging, not through a refusal log** —
`Julian is absent from the ISSUED roster` and `absent from the DELIVERED roster` are separate
assertions on the dispatched request.

One observation, not a defect: on BYPASS 1 the LI's id came back as
`ent:the one who draws them forward` rather than a `named:` id, because the story had no named LI
entity yet. The comparison still resolved correctly and the refusal fired; the id shape is just
worth knowing.

## Instruction wording

`most openings need nobody here` is removed — it asserted a preference for solitary openings that
nothing supports. The field now reads only: *"Declare a supporting person when the opening requires
one; otherwise null. Do not invent someone to fill this field."*

## Regression runs, kept distinct

* **Round 7** (`scratchpad/skel_round7.txt`), covering the declaration patch: **405 passed · 3
  failed** — the three pre-existing `X14` assertions.
* **Round 8** (`scratchpad/skel_round8.txt`), covering this reconciliation: reported on its own.
  The round-7 run started before this fix and cannot speak to it.

---

# CLOSING THE SUPPORTING-PERSON CHECKPOINT

## The staging gap, closed at the gate

`_openingEligibleOthers` changed the solo/open DECISION, but the original `_s1IssuedRefs` still
reached `_cpIngestGeneratedStage`, so a planner declaring the retired reference IN_PERSON was
accepted (`ok: true`, no rejections) and the re-resolved stage put it on the page.

**app.js:~146305** now refuses, where the planner's stage is accepted, any participant declared
**IN_PERSON** whose reference resolves **through supersession** to someone barred from physical
presence. It joins the existing `rejected` list, so the whole contract is refused before
re-resolution:

```
[CPLUS:STAGE] refused IN_PERSON for 1 participant(s) barred from physical presence:
  role:old_ally (li_is_offstage_and_may_not_be_staged_in_person:resolves_to:named:julian)
[SCENE1:STAGE:PLANNER-OWNED:FAULT] whole_contract_rejected
[SCENE1:ABORT] refusing to author Scene 1 without it
```

**Only IN_PERSON is restricted.** `ANTICIPATED` / `RECALLED` / `REPORTED` are untouched, so an
offstage person can still be mentioned, remembered and waited for.

## The combined presence test — a fragility found while verifying

Reading `state._scene1LIOnStage` alone was not production's own test. That flag is set to
`undefined` at one point to force a re-pick (app.js:84686), so a legitimate on-stage opening could
reach the gate with it cleared. Both the gate and `_openingEligibleOthers` now use the combined
form production uses at app.js:170614 — the flag **or** `scene1Presence === 'ONSTAGE'` on
`romanceEnginePlan` / `pairDynamic`. The fixture uses production's own `_TEST_liOnstage` switch
rather than hand-setting the flag.

## Controls

| control | result |
|---|---|
| retired LI reference declared **IN_PERSON**, Dalia eligible | refused before the author · `the author was NOT reached` · the refusal names the restriction |
| LI declared **RECALLED** | **accepted** · author reached · roster `["Nadia","Dalia"]` |
| LI **legitimately on stage** | **accepted** · author reached |
| ordinary **Dalia** delivery | unchanged — `Nadia, Dalia`, LI offstage |

**34 cases, 99 captured author requests, all checks pass.** Nothing dispatched; no process left
running afterwards.

## Regressions

| run | covers | result |
|---|---|---|
| `skel_round7.txt` | the declaration | 405 passed · 3 failed |
| `skel_round8.txt` | the first reconciliation | 405 passed · 3 failed |
| `skel_final2.txt` | explicit subject + shared ownership | 405 passed · 3 failed |
| `skel_close.txt` | **the presence gate and the combined test** | **405 passed · 3 failed** |

The three are `X14-8`, `X14-10`, `X14-11` — the disclosure-commit verdict handoff — failing
identically on the **pre-fix** file (`skel_baseline.txt`). **Pre-existing, no new regressions.**

## Two residuals, flagged and not decided

* **A staged label can carry the love interest's name.** On the legitimate on-stage arm the roster
  reads `["Nadia","Dalia","the one who came in with her"]` — he is present under the retired
  reference's own label rather than his name. Correct behaviour, misleading line.
* **`canonical_ref` is unreachable by design today.** The A-plot request carries no reference list,
  so every citation is refused on availability as well as on its own merits. `_aplotOfferedRefs`
  is the one place to populate if that changes.

## Still outside this work

CG coverage. Generated-prose quality. Whether a live A-plot generator populates the new
declaration well — these runs soft-pass their A-plot repair, so they are not clean setups.

---

# CHECKPOINT CLOSED AND FROZEN — 2026-10-28

## The continuation regression the opening gate introduced, and its fix

`_cpIngestGeneratedStage` serves the CONTINUATION skeleton as well as the opening. The presence
gate read SCENE-1 presence settings without consulting the function's own `sceneNum` parameter, so
an otherwise valid love-interest IN_PERSON contract for a later scene was refused whenever
`scene1Presence` was ABSENT — and the continuation caller (app.js:100979) stores `null` when
ingestion rejects. "He is not in the opening" is not "he is never in the story."

**app.js:~146305** is now scoped `if (Number(sceneNum) === 1)`. Later scenes follow their own
presence rules; the opening flag was NOT relaxed to make them pass.

Through the real continuation caller — `window.__generateSceneSkeleton` (app.js:100454), planner
reply intercepted, every other `/api/**` aborted — what PRODUCTION STORED:

```
scene 2  stored: ["pc:IN_PERSON","named:julian:IN_PERSON"]   report {ok:true, rejected:[]}
scene 3  stored: ["pc:IN_PERSON","named:julian:IN_PERSON"]   report {ok:true, rejected:[]}
```

The same contract, scene by scene, on the production function:

```
sceneNum 1 → ok=false  whole_contract_rejected  ["named:julian:li_is_offstage_and_may_not_be_staged_in_person"]
sceneNum 2 → ok=true   no rejections
sceneNum 3 → ok=true   no rejections
```

Harness: `_nf_continuation_presence_check.mjs`. Two false passes had to be cleared first — the
fixture's ref parser matched `"<COPIED VERBATIM from ISSUED REFS>"` inside the RESPONSE SCHEMA
instead of the actual roster, and the roster is in the SYSTEM message while the parser read only
the user message. Until both were fixed the arm declared no love interest at all and was asserting
acceptance of a PC-only contract, which the gate accepts either way.

## Final state

| | |
|---|---|
| `public/app.js` | **36 hunks, +745 / −108** vs `app.js.prepatch` |
| cache-buster | `?v=20261028c-presence-gate-scene1` |
| opening harness | **34 cases, 99 captured author requests, all checks pass** |
| continuation harness | all checks pass |
| regression suite, final file | **405 passed · 3 failed** — `X14-8`, `X14-10`, `X14-11`, failing identically on the pre-fix baseline |
| git | **not committed, not pushed, not deployed** |

## WHAT THIS ESTABLISHES — narrowly

Supporting-character admission, and the tested opening and continuation presence rules, work
**through the production callers with intercepted replies**.

## WHAT IT DOES NOT ESTABLISH

* That **live planning chooses the right cast.** Every planner choice in these runs was scripted by
  a fixture.
* That the **prose delivers the hot crisis.** No prose was generated; the author request was
  captured and aborted.
* That **CG works.** `_completeStagedSceneFromScreenplay` was never reached in any run here.

Also unverified: whether a live A-plot generator populates `requiredSupportPerson` well — every run
here soft-passed its A-plot repair, so none is a clean setup for that question.

## Left alone deliberately

Staged-label cleanup (a present love interest can appear under a retired reference's label rather
than his name) and the `canonical_ref` branch that is unreachable while the A-plot request carries
no reference list. Both are recorded above; neither is a defect in what was fixed.

**FROZEN.** No further identity-system expansion in this checkpoint. The prompt-consolidation work
that follows is a separate problem and does not reopen this one.
