# CG Repair Contract (v1)

> The **rules of a valid repair**, defined *before* localization and execution so those cannot evolve toward
> inconsistent goals. This is a **hard gate**: do not implement localization until this contract exists,
> because without it a bounding box has no objective — a region *for what*?

A repair takes a sheet with a planner-approved defect and a chosen method (Klein inpaint / conditioned regen)
and must produce a result that satisfies every clause below. The arbiter of success is **not** the repair
tool — it is the **frozen [`Verifier v1.0`](./verifier-contract.md)**, re-run on the output. The repair tool
never grades its own work.

## 1. The success test — what counts as "fixed"

A repair **succeeds** iff, re-running the frozen verifier (via the same N-run **corroboration** used for
confidence, `_repair_planner.mjs`) on the repaired artifact:

1. **The targeted defect is gone** — it no longer appears above its original confidence tier, and
2. **No new defect is introduced anywhere on the sheet** — the post-repair defect set, minus the target, is a
   subset of the pre-repair set. Nothing new at `medium`+ confidence.

Success is defined by the *independent* verifier agreeing the defect is gone and nothing broke — never by the
repairer asserting it. This is the closed loop: `detect → decide → repair → **verify**`.

## 2. The non-regression invariant (safety) — a repair can NEVER make the sheet worse

A repair is **committed only if it passes §1**. If it fails — the defect survives **or** a new defect
appears — the attempt is **discarded and the original artifact retained**. The pipeline's worst case is
"defect unrepaired," never "sheet degraded." This is the single most important guarantee; everything else is
optimization within it.

## 3. Collateral bounds — what a repair may not touch

**Klein (localized):**
- MAY modify only *within the defect's bounding region* plus a small feather margin.
- MUST NOT alter composition/framing, any other character, the cast roster, the palette, or the art
  style/line-weight; MUST leave all other regions of the panel effectively unchanged.
- Enforced two ways: (a) the frozen verifier reports **no new defect** (§1.2 — e.g. a Klein that warped a
  neighbor trips `anatomy`/`continuity`); (b) a pixel-diff outside the feathered region stays under the
  `collateralDiff` policy bound.

**Regen (structural):**
- Replaces the whole panel, so it MUST preserve **continuity with the clean sibling panels** — same cast
  roster, same character identities (face / hair / build / wardrobe / colour), same setting, same art style —
  conditioned on those clean siblings (roster / face-master as continuity state).
- Success additionally requires the verifier reports **no new cross-panel `continuity` defect** vs. the clean
  siblings. A regen that fixes the target but re-casts the character has failed §1.2.

## 4. Style-drift tolerance

The repaired region must read as the *same drawing*: line weight, rendering, palette, and character design
match the surrounding sheet. Hard drift (a repaired face in a different style, a recoloured character) is a
`continuity`/`species` defect the frozen verifier already catches (§1.2). Sub-defect drift is bounded by the
`styleDrift` policy threshold. **Model:** must not drift. **Policy:** how much is tolerable.

## 5. Exhaustion & escalation

- **Klein exhausted** = it has consumed its retry budget (`POLICY.budget.klein`) without passing §1. On
  exhaustion: escalate to **regen** *iff* economics says a regen pays off for this defect
  (`economics().escalate_to === 'regen'`); otherwise **give up → surface** (ship the defect, flag for human
  review — never loop).
- **Regen exhausted** = `POLICY.budget.regen` attempts without passing §1 → **give up → surface**. No further
  escalation (regen is the most expensive method).
- Every failed attempt (including one that introduced a regression, then rolled back per §2) consumes budget.

## 6. Model vs. Policy (same discipline as the planner)

- **MODEL (stable / architectural, contract-v1):** the frozen verifier is the arbiter (§1); non-regression +
  rollback (§2); Klein-in-region / regen-preserves-siblings (§3); must-not-drift (§4); exhaustion → escalate-
  if-worth → surface (§5). These are the *rules*.
- **POLICY (tunable — `policy-v0-placeholder`, shared with `_repair_planner.mjs`):** retry budgets,
  `collateralDiff` bound, `styleDrift` tolerance, and the "confidence tier a defect must drop below to count
  as gone." These **numbers** change with real success-rate and cost telemetry; the rules do not.

## 7. What this unblocks

Localization now has a **well-posed objective**: find the *minimal* region such that a Klein edit inside it
can make the target defect pass §1 **without** violating the §3 collateral bounds. Execution has an
acceptance test (§1) and a safety net (§2). Verification is just the frozen verifier, re-run. Only now does
"find the bounding box" become a defined engineering problem.

Related: `verifier-contract.md`, `repair-planner.md`, `image-quality-spec.md`, `measurement-discipline.md`,
`benchmark-A.md`.
