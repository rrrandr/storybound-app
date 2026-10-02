# Creative-quality study — PRE-REGISTRATION

Written **before any prose is generated**. Nothing in this file may be revised after generation;
a revision after the fact is not a pre-registration.

## The hypothesis, stated first

**H1 (primary):** circling appears by **scene 6** on **at least one** of the three paths.

"Circling" = a scene whose exit state a reader cannot distinguish from the previous scene's in any
way they could name.

**The window: 6 scenes per path, 18 scenes total.** The reported stall is
intrinsic around scenes 4-6, so the window has to reach 6. The upper bound is the product: a CG issue is
**10 scenes** (read from
`ISSUE_PRICING.cg` at build time, not remembered), and First
Sacrifice is the CG Book, so 6 sits inside one issue. The CG row is read **by name**: the
active-pricing accessor answers for whatever mode the session is in, and a fresh session is literary,
so it returns 20 — the literary length, not this Book's.
An earlier draft of this file said 8 per path and 24 total. That number was not derived from anything —
it was "4-6 plus margin" and was never checked against the issue length. It is removed, not amended.

**H2:** the **off-spine** path (the one the seed does not anticipate) circles **earlier** than the
two paths taken from the seed's own decision.

**H3:** obligations are silently dropped more often than they are paid off.

A result contradicting any of these is the finding. They are recorded so that cannot be
re-narrated afterwards.

## The rubric — per slot, scored blind

| # | dimension | how to score |
|---|---|---|
| 1 | `forward` | `yes` / `no` — can you name, in one clause, something true at the end of this scene that was not true at the end of the previous one? If `no`, fill `repeated` with the element that recurs. |
| 2 | `obligations_carried` | list obligation ids from 02 that this scene keeps alive |
| 3 | `obligations_paid` | list obligation ids this scene concludes |
| 4 | `obligations_dropped` | list obligation ids that were live and are now silently absent |
| 5 | `sealed_violation` | `yes` / `no` — did it deliver, name or pre-empt a sealed reveal before its scene? |
| 6 | `new_pressure` | `0` none · `1` present but generic · `2` coherent AND interesting. Quote it. |
| 7 | `branch_specific` | `yes` / `no` — could this scene have occurred on a different path? `no` = branch-specific. |
| 8 | `notes` | one line, free text |

**Scene 1 is identical on all paths** and appears once per path by design; score it anyway, as the
baseline the `forward` judgement is made against.

## Procedure, in this order

1. Read `00`, `01`, `02`. Do **not** open `KEY_SEALED.json`.
2. Read every slot in `03_SLOTS/` **in file order**. The order is shuffled, so consecutive files
   are not consecutive scenes and are usually not the same path.
3. For dimension 1 you need the previous scene *of the same path*, which you cannot identify while
   blind. Therefore score dimension 1 on a **second pass**, after the key is opened, and record the
   first-pass impressions in `notes`. **Every other dimension is scored fully blind.**
4. Fill `04_SCORESHEET.csv`. Save it.
5. **Only then** open `KEY_SEALED.json`, map slots to (path, scene), and do the `forward` pass.
6. State the verdict against H1/H2/H3 before interpreting anything else.

## Results already in hand, and what they do NOT mean

Four provider-free boundary runs preceded this study. They are recorded here so their results are
never read as quality findings:

- **The four-scene run proves BOUNDARY RELIABILITY ONLY.** It shows four consecutive scenes can be
  advanced through the real production entry point without the harness failing. It says nothing
  about the prose.
- **The repeated prose in that run is a FIXTURE ARTIFACT.** Every scene replayed one recorded
  author response, so every scene rendered identical prose. That is not circling and must not be
  counted as evidence for H1.
- **The repeated "Toll Road Commission" introductions are an IDENTITY-GUARD CHECK, not a creative
  failure.** Replaying one planner reply introduced the same institution every scene, and the guard
  correctly refused it as a redefinition of an already-activated entity. That is the safety rule
  working; it is not the planner being repetitive.
- **The activation counts from that run are INCONCLUSIVE.** Activations stayed at 1 while facts grew,
  and per-scene verdicts were not captured, so the cause is not established. The most consistent
  explanation is the same fixture artifact — one prose body cannot anchor four different
  institutions — but it is unproven and must not be cited either way.

## What this study cannot establish

It measures the prose this corpus produced. It is not a measure of the engine's ceiling, it does
not generalise to other Books, and `n = 1 run per path`: a path that circles may have circled on
that draw. A clean sweep is informative; a split result is a reason to run more, not to split the
difference.

## Honest limitation on who scores

The session that GENERATES this corpus should not be the session that scores it. Mechanical
blinding — shuffling and stripping labels — cannot make a generator unknow its own output. A fresh
session, or Roman reading directly, is materially stronger evidence.
