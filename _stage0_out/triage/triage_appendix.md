# TRIAGE APPENDIX — per-plan evidence (KEY-LINKED: open only after G3 verdicts are written)

Replica results from `triage.json`; every line agrees with the product's fault text in the
`sample{i}_verdict.json` files. Ground text = seed `setting` + `present` + `narrator` + on-stage
labels (the seed's `aboutToHappen` contains none of the disputed words, verified).

## Environment elements (rule #4) — missing tokens against the seed

| plan | element 1 | element 2 |
|---|---|---|
| 8B-S1 | FAIL 8/15 missing underfoot*, untrampled, except, where, bare, feet, pressed | FAIL 10/14 missing swaying, slightly, breeze, brushing |
| 8B-S2 | FAIL 8/15 missing underfoot*, unmarked, except, faint, indent, where, knelt | FAIL 7/16 missing swaying, slightly, breeze, brushing, ground, like, half, remembered, sigh |
| 8B-S3 | FAIL 6/11 missing beneath, knees, stilling, trembling, hands | FAIL 9/15 missing swaying, catching, light, like, whispered, secrets |
| 14B-S1 | FAIL 6/10 missing underfoot*, crushed, where, knelt | FAIL 8/11 missing trembling, sudden, stillness |
| 14B-S2 | OK 5/5 | OK 7/7 |
| 14B-S3 | OK 7/7 | OK 7/7 |

\* "underfoot" is in the seed's `groundedObjects` name (O3) but not in the `setting/present/narrator`
strings the ground text is built from — a second, minor source of false misses.
Kind by the memo's Q1 taxonomy: (b) elaboration — pressed/indent/knelt/crushed/frayed-type traces;
(c) new fact — breeze, swaying, light, blood (14B-S1 E+ beat), "untrampled/unmarked" (contradicts
two dozen barefoot people on the carpet). `kneeling` (seed) vs `knelt` (plans): the stemmer does not
equate them (`_tokEquivalent('kneeling','knelt') = false`).

## E+ beat names its target (rule #5)

| plan | target | head token used | head in beat? | hits | ratio | product |
|---|---|---|---|---|---|---|
| 8B-S1 | …carpet of braided spiralgrass | spiralgrass | no | carpet | 0.20 | FAIL (B) |
| 8B-S2 | same | spiralgrass | no | carpet | 0.20 | FAIL (B) |
| 8B-S3 | same | spiralgrass | no | carpet | 0.20 | FAIL (B) |
| 14B-S1 | …braided spiralgrass carpet | carpet | **no** ("crushed grass") | — | 0 | FAIL (A) |
| 14B-S2 | same | carpet | yes | braided, carpet | 0.40 | pass |
| 14B-S3 | …carpet of braided mated-pair spiralgrass | spiralgrass | no | carpet, braided | 0.29 | FAIL (B) |

## Fusion (rules #6, #7)

| plan | target = E+? | axis = E+? | contact verb found | notes |
|---|---|---|---|---|
| 8B-S1 | yes | yes | pressing | — |
| 8B-S2 | yes | yes | trace | — |
| 8B-S3 | yes | **no** (use vs damage) | presses | A |
| 14B-S1 | **no** (canopy vs carpet) | **no** (absence vs damage) | reaches | A |
| 14B-S2 | yes | yes | **none** — beat uses "dig into" | B: verb not in `_FUSION_CONTACT` |
| 14B-S3 | **no** (leaf-curtains vs carpet) | **no** | brush | A |

## revelation_bridge (rules #2, #3) — 4+ letter word overlap, no stopwords, no stemming

Condition word-sets: OPT-4 → {someone, pain, becomes, nameable, public}; OPT-8 → {offering, being, named, aloud}.

| plan | character / option | bridge ∩ truth | bridge ∩ condition | product | class |
|---|---|---|---|---|---|
| 14B-S1 | Seren / OPT-4 | 8 words (incl. `than`, `making`) | ∅ | FAIL | B (naming ≠ nameable) |
| 14B-S1 | Dohkar / OPT-8 | assumes, carries, authority | ∅ | FAIL | A — but its `visible_action` is about calling for the cost to be spoken, which matches OPT-8's authored `evidence_requires` (`cost`) |
| 14B-S2 | Seren / OPT-4 | 10 words | ∅ | FAIL | B |
| 14B-S2 | Dohkar / OPT-8 | authority, sacrifice | ∅ | FAIL | A (bridge is about "emotional weight", not the offering) |
| 14B-S3 | Seren / OPT-4 | 8 words | **{someone}** | pass | passed on a pronoun |
| 14B-S3 | Dohkar / OPT-8 | that, carries, authority | **{being}** | pass | passed on "being" |
| 8B-S1..S3 | all | no bridge field at all | — | FAIL | A (#1) |

## Duplicate first appearance (rule #8) — coverage of Seren's C+ act by the opening beat (≥ 0.6 passes)

| plan | opening names Seren | coverage | product |
|---|---|---|---|
| 8B-S1 | yes | 0.24 | would fire (masked by earlier faults in the truncated list) |
| 8B-S2 | yes | **1.00** (C+ act restates the opening) | pass |
| 8B-S3 | yes | 0.53 | would fire |
| 14B-S1 | yes | 0.36 | would fire |
| 14B-S2 | yes | 0.93 (restates) | pass |
| 14B-S3 | yes | 0.33 | FAIL (reported) |

The Dohkar is never named in an opening beat, so the rule never touches him.

## Schema omissions (rule #1)

8B: `revelation_bridge` absent in 3/3 plans (6 entries); `first_mention` absent in S3 (2 entries).
14B: every key present in 3/3.
