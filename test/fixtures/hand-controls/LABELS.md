# Hand-anatomy control set (ground truth: Roman, 2026-07-22)

The first bad-hand recall dataset — and the evidence that **the vision models and prompting strategies evaluated here did not reliably
discriminate fine hand anatomy on this benchmark** (a narrow claim — not a universal ceiling). All are the panel-2 hand region of
sheet A4 (the original + 6 Klein/regen "repairs").

| Fixture | Truth |
|---|---|
| `reference_FINE` | FINE — two overlapping correct hands (the original) |
| `regen_FINE` | FINE — one normal hand |
| `baseline_MALFORMED` | MALFORMED |
| `s1_MALFORMED` | MALFORMED |
| `s2_MALFORMED` | MALFORMED |
| `s3_MALFORMED` | MALFORMED |
| `both_MALFORMED` | MALFORMED |

**Every automated judge failed this set:** the frozen verifier flagged all as malformed;
a purpose-built FP-adjudicator scored **4/7** (deterministically KEPT the fine `regen`, and
DROPPED malformed `s2`/`both`). Only the human eye was reliable. → **anatomy is HUMAN-IN-THE-LOOP; roadmap status CLOSED pending new model capability** — (surface for review, never auto-repair, never auto-adjudicate). Reuse this set to test
any future approach against BOTH sides of the confusion matrix.
