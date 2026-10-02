# One FS issue — PRE-REGISTRATION

Written before any score exists.

## What this is, and is not

**ONE EXPLORATORY TRAJECTORY** through one full First Sacrifice issue: one arm of the scene-1 axis,
one seeded sequence of Fate-card draws. It is **not** a statistical comparison of branches. The
scene-1 decision has exactly **two** buttons, so there is no third arm to compare, and one run per
arm could not support a comparison even if there were.

Seed `20261002`, arm `A`. The seed is recorded so this trajectory is reproducible.

## The reader's input

No invented say/do text. At every gate after the axis, the five authored Fate cards are exposed, one
is drawn on the recorded seed, and it is played through the product's own click handler. Say/do is
submitted empty: the card is the input.

## Dimensions, scored blind per slot

| dimension | how to score |
|---|---|
| `movement` | `yes`/`no` — name in one clause something true at the end that was not true before |
| `obligations_preserved` | obligation ids from the issue ledger this scene keeps alive |
| `obligations_dropped` | ids that were live and are now silently absent |
| `pressure_quality` | `0` none · `1` generic · `2` coherent AND interesting. Quote it. |
| `character_continuity` | `yes`/`no` — do established figures behave consistently with what came before? |
| `branch_specific` | `yes`/`no`/`n/a` — could this scene have followed a different card? `n/a` where no card applies |
| `stall` | `yes`/`no` — is this scene indistinguishable in effect from the previous one? |

**First stall scene** is reported after unblinding: the lowest scene number whose `stall` is `yes`.

## Procedure

1. Read every slot in `slots/` in file order. The order is shuffled; consecutive files are not
   consecutive scenes.
2. Fill `SCORESHEET.csv`. Save it.
3. **Only then** open `KEY_SEALED.json`, map slots to scenes, and report the first stall scene.
4. The session that GENERATED this corpus should not be the session that scores it.
