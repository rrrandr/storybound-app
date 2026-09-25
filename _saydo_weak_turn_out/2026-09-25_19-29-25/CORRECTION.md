# CORRECTION to this run's verdict (2026-09-25)

`RESULT.md` and every artifact beside it are preserved UNCHANGED. This note supersedes the verdict
in `RESULT.md`, which was too generous in three places.

## Corrected verdict: MECHANISM PASS, SAMPLE FAIL

| | |
|---|---|
| **Weak-turn restraint mechanism** | **PASS.** Both planner and author received it, verified at the wire, and Lirael made no invented decision. |
| **Input acknowledgement** | **FAIL.** The dialogue `I don't know.` was converted into silence and interiority. It was never spoken, attempted, muffled, or visibly received by anyone. Preserving the *posture* is not the same as registering the *utterance*, and `RESULT.md` called this only "questionable". |
| **Canon cleanliness** | **FAIL.** Not "one concern". |
| **Overall sample** | **FAIL/MIXED — not an accepted scene.** The narrow capability was demonstrated; the pre-registered scene criteria were not met. |

## The canon failure is the PLANNER's, not author drift

`RESULT.md` framed this as the scene "pulling the inquiry forward". That misattributes it. The
**planner** proposed the formal late-Issue-1 inquiry while labelling it a "preliminary review",
carrying the seed's exact reserved markers:

- **The Open** — the venue canon reserves for the convened inquiry
- **a Chayr and two Dohkars** — the inquiry's exact stated composition
- **a scheduled convening** — "in three days"

The author merely executed an invalid plan faithfully. This is a **planner / objective-gate
failure**, and the fix belongs there, not in authoring guidance.

## Preservation and accounting were incomplete

- `accepted_plan.json` contains **`null`**, despite preservation being required. The runner read
  `state._acceptedPlannerProposal` after generation cleanup had already released it. The accepted
  normalized proposal for this run is **not recoverable** and will not be reconstructed — inventing
  fields that were never retained would be worse than the gap.
- `report.json` records **three** real calls; `RESULT.md` said two. Three is correct. The third is
  the **scaffold** call, which the runner classified as neither planner nor author and therefore
  never reserved against the ceiling separately. The ceiling held regardless ($0.011707 realized),
  but an unreserved role is an accounting hole, not a rounding detail.

## What was NOT done

Nothing was re-run and nothing was regenerated. The corrections that follow are dry-only, in
`public/app.js` and the runner, and are proven without spending.
