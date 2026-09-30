# Replacement design note: the pre-author continuation planner

**Status:** design note. No code. No provider call. No authorization requested.
`_invariantRuntimeV0` OFF. 2026-09-30.

Eighth of the planning thread, and it **replaces** the finite-catalogue path
(`candidate_authorship_decision_memo.md`, `catalogue_cost_and_bounds_note.md`,
`predeclared_successor_feasibility_spec.md` rev 1–3). Those solved the wrong problem: they required
someone — a setup model or Roman — to anticipate every meaningful branch in advance.

---

## 1. The requirement, restated

Grok must be able to carry a **radically changed** story forward in a reasonable, interesting way
without anyone supplying an if/then tree. After Lirael destroys a village, it may legitimately introduce
an investigation by wider First Favored governance, or Fatelands governance at Aeryn's Reach, **even
though neither was predeclared.**

The protection is therefore **not** "all routes must be predeclared." It is ordering and provenance:

1. plan the next durable development **before** prose;
2. record its source and exact change;
3. check it against established canon and both scaffolds;
4. have Grok render the **selected** plan;
5. **never** infer a durable event from prose afterward.

Every safety property this thread established survives that — because none of them ever depended on the
candidate set being finite. They depended on the *order*.

## 2. The finding: this is ~70% built and in production

`_validateLocalObjective` (`app.js:205991`) is already a **reject-only validator over a planner
proposal**, and the surrounding path is already the shape described above:

```
player Say/Do → _recordScenePosture (hashed, app.js:100472)
  → SCENE-SPINE planner call (per scene, already in production)
  → _validateLocalObjective (reject-only, returns why[], never rewrites)
  → state._sceneObjectives[n] { status:'accepted', postureHash, posture_read, stateChange }
  → _effectiveSceneRow.goal → consumers → author
```

It already: takes the player's actual action; requires `local_objective`, `posture_read`,
`local_objective_actor`; checks the actor is present and is an individual rather than a collective;
requires **every** reserved id be declared `untouched` and every aftermathTruth `kept`; enforces a
relational obligation; supersedes a stale objective when the posture hash changes; and is explicitly
*"mechanical, not a semantic-quality judgment."*

**Four things are missing**, and only the first is an architectural constraint rather than an addition:

| # | Gap | Where |
|---|---|---|
| 1 | **the roster is CLOSED** — `present` must be ⊆ seed roster + declared collectives, else *"present names someone outside the seed roster"* | `app.js:206005` |
| 2 | no durable **canon change** is declared or sealed — `state_change` is a scene-goal field, not a canon delta, and nothing commits it | — |
| 3 | `reserved`/`aftermath` checks are **withhold-only** — a reserved event can be kept untouched but never authorized | `app.js:206014-206020` |
| 4 | **seed-scoped** — `eff` comes from `_effectiveSceneRow`, null without a seed | `app.js:205876` |

Gap 1 is the single check that forbids Aeryn's Reach. Gap 2 is where `_commitStoryEvent` finally gets
its one caller.

## 3. The planner contract

**Inputs:** the player's action and Say/Do; current committed canon; the issue-wide scaffold
(`cgScaffold.issueArcs[i]` pressures, `rPlot.issuePressures[i]`); the story-wide scaffold (posts,
durable constraints); and unresolved pressures/open questions.

**Output, before prose — one structured continuation proposal:**

- `scene_purpose` — what this scene is for;
- `forward_pressure` — what pushes the story on, so it does not circle;
- `introduces[]` — **any newly introduced actor, institution or fact, declared explicitly as new**, each
  with a kind (`actor` / `institution` / `fact`) and a one-line justification;
- `canon_change` — the intended durable change, as a named delta, or `none`;
- `derivation` — why this follows from the current branch and the player's action;
- `existing_refs[]` — every already-canonical person, office or fact the proposal relies on, so §4 can
  check it asserts nothing new about them.

**Validation — reject-only, and reject for these:** contradiction with hard canon; forced restoration of
an obsolete route; unauthorized resolution of an open question; loss of player agency; unsupported
claims about **existing** named offices or characters.

**Explicitly NOT a rejection reason:** that a plausible new institution, actor, pursuit, consequence or
destination was not predeclared.

**Record:** the accepted proposal is source-stamped and **sealed before the author writes** — planner
model, reason, posture hash, canon digest, and the `canon_change` committed to the ledger.

**Render:** Grok receives the accepted continuation material and renders it. The existing acceptance gate
applies unchanged: render what was sealed, add no canon. Prose never creates or commits anything.

## 4. The validator inverts: closed-world containment → open-world provenance

This is the whole architectural move, and it is one change of question.

| | Today | Under this design |
|---|---|---|
| question asked | "does everything named already exist?" | "is anything **new** declared as new, and is anything **existing** silently redefined?" |
| new institution | **rejected** (outside roster) | **admitted** if declared in `introduces[]` with a justification |
| new claim about Julian's office | passes (he is in the roster) | **rejected** unless it is already canon — he is Provast, over every Chayr, next for First Dohkar |

So the line is: **new things are allowed; new claims about old things are not.** That is mechanically
checkable in exactly the style the current validator already uses, because the seed's cast and the
office ladder (`app.js:16721-16726`) are enumerable. It does not require semantic judgment.

Two disciplines carry over unchanged: the validator **never rewrites** a proposal
([[feedback_validators_never_write]]), and it stays mechanical rather than judging quality.

## 5. Comparison

| | Finite catalogue | Continuation planner |
|---|---|---|
| **anticipation required** | every meaningful branch, at setup or issue init | **none** |
| **catastrophe branch** | needs a predeclared escalation family, else empty set | planner proposes a fresh canon-compatible pressure |
| **Aeryn's Reach after a massacre** | impossible unless predeclared | **admissible** via `introduces[]` |
| **pre-prose canon control** | selection from a menu | **proposal → validation → seal**, same ordering |
| **prose cannot write canon** | structural | **structural, unchanged** |
| **provider calls** | **NEW** per epoch/paid unit, on top of the existing per-scene planner | **extends an existing per-scene call** — no new call |
| **worst-case cost** | ≤ 3 calls/unit ≈ $0.0588; ≈$0.53/story | a larger schema on a call that already runs; marginal |
| **failure mode** | thin menu silently removes routes | thin proposal is rejected and repaired, or the scene runs without a canon change |
| **who must be clever** | the setup model, in advance | the planner, in context |
| **scaffold role** | exhaustive menu | **broad directional constraint + story memory** |

The cost row is the decisive practical one, and it is evidence-backed: the SCENE-SPINE planner already
runs per scene in production — it appeared as stage 3 of the real generation funnel in
`_fsc_delivery_servedapp_control.mjs` (26KB, `role=STRUCTURE_GENERATOR`). The catalogue model added
calls; this one reshapes a call that already happens.

## 6. What this withdraws

- the finite catalogue, primary + predeclared successors, the §1 schema budget, depth, and the
  successor activation contract;
- the **overflow policy** and its decision (reject-before-charging) — there is no catalogue to overflow.
  *Generate-before-charging may still be worth keeping for a different reason: the paid boundary should
  not charge for a unit whose planning is broken. That is now a separate, smaller question;*
- the S3 **"unavailable because no predeclared ally/counterparty"** framing, per Roman. The test is not
  whether an ally was predeclared but **whether the planner can propose a fresh, canon-compatible
  pressure that makes the catastrophe branch move.** On the canon as written it plainly can — Julian is
  Provast *over every Chayr in the Veilwood* and next for First Dohkar (`starter-scenes.js:240`), so
  authority above a damaged local panel demonstrably exists, and wider Fatelands governance at Aeryn's
  Reach is available as a newly introduced institution.

**What survives unchanged:** the ordering (plan → validate → seal → render → verify); prose has no write
path to canon; validators reject and never rewrite; the acceptance gate; the branch board's
derived-vs-recorded status split as a way to *track* pressures (now not a finite set); the three named
boundaries; the cost-guard reservation discipline; and the **narrative-index separation prerequisite**,
which is untouched by this reframing — story-wide posts still advance on `issueIndexInRun`.

## 7. Smallest delta to build

1. **Lift the closed-roster check into a provenance check** (`app.js:206005`): admit a `present` entry
   that is declared in `introduces[]`; keep rejecting an undeclared stranger.
2. **Add the proposal fields** — `introduces[]`, `canon_change`, `derivation`, `existing_refs[]` — to the
   existing scene-spine schema. Prompt-schema work on a call that already runs.
3. **Add the existing-refs contradiction check** against the seed cast and office ladder. Mechanical.
4. **Add the seal**: commit `canon_change` via `_commitStoryEvent` before the author payload is built.
   This is its one caller, and it satisfies the standing write rule
   ([[project_branch_capable_continuation_contract]]) — selection chooses before prose, records its
   source, and the author renders an already-committed fact.
5. **Generalize past the seed** (gap 4) so original stories get the same path — required for the
   universal claim, not for a first slice.

Items 1–4 touch one planner, one validator and one commit site. No new planning system.

## 8. Proofs, provider-free

1. a proposal naming an **undeclared** stranger is rejected; the same proposal with it declared in
   `introduces[]` is admitted;
2. a proposal asserting a **new claim about an existing office** is rejected (e.g. Julian described as
   Chayr, or as *not* next for First Dohkar);
3. a proposal that would restore an obsolete route, resolve an open question, or remove player agency is
   rejected;
4. the validator **never mutates** the proposal — byte-identical in and out on both paths;
5. the seal precedes the author dispatch: the ledger entry exists before the payload is built, and the
   payload carries the fact;
6. prose asserting an unsealed durable event leaves the ledger unchanged;
7. `_commitStoryEvent` has exactly **one** caller (static scan);
8. no scene index participates in any of it.

## 9. Open questions

1. **Canon inflation.** If any scene may introduce an institution, canon grows monotonically and later
   scenes carry an ever-larger roster. Needs a budget, a consolidation rule, or a decay/backgrounding
   convention. Not solved here.
2. **Quality is still unproven, and now relocated.** The validator can check provenance and
   contradiction mechanically; it **cannot** judge whether a proposed pressure is interesting or
   thematically apt. That is claim B from the feasibility spec, and it still needs blind reading —
   restated as: *given a catastrophe branch, does the planner propose something a reader would find
   coherent and compelling?* The 3-state × 7-intent corpus and its three-way classification survive as
   the harness for exactly that, with the classification now testing the **planner's** judgment rather
   than a menu's contents.
3. **What may `canon_change` touch?** Introducing an institution is one thing; changing an established
   office-holder or killing a named character is another. Needs a tier rule.
4. **Narrative-index separation** remains a prerequisite for anything universal (§6).

No code, no provider call, no authorization requested.
