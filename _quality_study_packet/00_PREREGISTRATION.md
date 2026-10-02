# Creative-quality study — PRE-REGISTRATION

Written **before any prose is generated**. Nothing in this file may be revised after generation;
a revision after the fact is not a pre-registration.

## The hypothesis, stated first

**H1 (primary):** circling appears by **scene 6** on **at least one** of the three paths.

"Circling" = a scene whose exit state a reader cannot distinguish from the previous scene's in any
way they could name. The reported stall is intrinsic around scenes 4-6, so the window runs to 8.

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

## What this study cannot establish

It measures the prose this corpus produced. It is not a measure of the engine's ceiling, it does
not generalise to other Books, and `n = 1 run per path`: a path that circles may have circled on
that draw. A clean sweep is informative; a split result is a reason to run more, not to split the
difference.

## Honest limitation on who scores

The session that GENERATES this corpus should not be the session that scores it. Mechanical
blinding — shuffling and stripping labels — cannot make a generator unknow its own output. A fresh
session, or Roman reading directly, is materially stronger evidence.
