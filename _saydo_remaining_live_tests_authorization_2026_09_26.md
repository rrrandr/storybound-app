# Remaining Say/Do live tests — AUTHORIZATION SHEETS (dry, $0 spent producing this)

Two paid candidates remain in the Say/Do program. **Neither is queued.** Each needs its own explicit
authorization phrase and its own ceiling. Cost basis is measured, not estimated — from the
2026-09-26 Safe Mode receipt (`cost_in_usd_ticks` + Mistral scaffolds):

| Role | Actual | |
|---|---|---|
| scaffold (mistral) | ~$0.0016 | |
| planner (grok) | ~$0.0099 | |
| author (grok) | **$0.0793** | ~87% of a scene |
| **one complete scene** | **~$0.0908** | |

Prerequisites now in place that were not before: the reserved-canon release condition, the Say/Do slot
router (an unclassifiable input now falls back to the institutional default *with a stated reason*
instead of being silently rerouted), and the strong Say/Do delivery guarantee.

---

## CANDIDATE A — GIBBERISH CONTINUATION  *(recommended first)*

**What is already proven, and what is not.** `_saydo_wallbreak_gibberish_cluster_control.mjs` (32/32)
proves ROUTING: `_detectGibberish` classifies, and `_sayDoGibberishFallback` substitutes
`'a beat of dazed, wordless hesitation'` (action) / `'a confused, wordless sound that never resolves
into words'` (dialogue). **PROSE QUALITY after that substitution has never been observed live.** The
open question is narrow: given a substituted placeholder instead of a player intention, does the author
write a scene that still moves, or does it stall on a character making noises?

**Exact state**
- Same deterministic First Sacrifice CG state the other runners use (`starter_first_sacrifice`,
  `render_mode: staged_story_mode`, `remain` branch, `turnCount = 1`, images blocked).
- `intimacyPhase` left INACTIVE — irrelevant to this question and must not be a variable.
- Fresh storyId. Auditor left disabled, as in every prior run.

**Exact input** — one submission, and **preflight must prove the input is actually classified as
gibberish before spending** rather than assuming it:
- Action: `asdkfjh sdkfj lkjwer`
- Dialogue: `qwerty zzzz aaaa`
- Preflight asserts `_detectGibberish(action) === true` and `_detectGibberish(dialogue) === true`, and
  that `_sayDoGibberishFallback` returns the two documented placeholder strings. If the detector does
  NOT classify them, the run is aborted and the input is revised dry — spending on an input the
  detector ignores would test nothing.

**Preflight must prove before any paid call**
1. Both fields classified as gibberish; both placeholders returned verbatim.
2. The substituted placeholders — not the raw gibberish — reach the real author payload.
3. The strong-delivery directive is ABSENT (a placeholder is not a committed move) and the weak-turn
   restraint's status is recorded either way, so we know which modality rule is in force.
4. The slot router returns no slot, and the frame falls back to the institutional default *with its
   reason logged*.
5. Reserved-canon directive present; scene < due row 14. Zero dry dispatches.

**Ceiling** — **$0.15** (one scene ~$0.091, ~1.6× headroom). One scene, not two.

**Pass / fail / no-data**
- **PASS** — the scene renders, the placeholder is dramatized as a real beat (dazed hesitation that
  costs something), other characters react to it, and the scene ends somewhere new. The gibberish does
  not become a plot event, and nothing in the prose references the player's literal keystrokes.
- **FAIL** — the scene stalls (a character makes noises and nothing changes), the raw gibberish leaks
  into prose, the placeholder is treated as meaningful speech with content, or the turn is silently
  skipped.
- **NO DATA** — no scene delivered, the detector did not classify the input, or the placeholder never
  reached the author payload.

**Stop conditions** — abort without further spend if the detector does not classify, the placeholders
are absent from the real payload, the request is stale, no scene is delivered, or the ceiling would be
exceeded. **Report before any fix or second sample.**

**Settles:** whether the fallback produces usable prose. **Does not settle:** anything about
wall-breaking routing (already dry-proven) or other adversarial categories.

---

## CANDIDATE B — TEMPT FATE RUPTURE CLASSES BEYOND `memory_perception`

**Scope, stated precisely.** `_RUPTURE_CLASS_VERBS` declares **six** classes: `supernatural`,
`memory_perception`, `history_rewrite`, `identity_reputation`, `materialization_possession`,
`relationship_social`. Only **`memory_perception`** is live-proven. **Five remain.**

**Do NOT authorize all five in one run.** Five scenes ≈ **$0.454**, and a single mid-run defect would
invalidate the batch — the failure mode of this session's first Safe Mode attempt, at 5× the price.
**One class per authorization**, each its own phrase and ceiling, results reported before the next.

**Recommended order** — `supernatural` first. It is the class the canon auditor was built for and the
one the deterministic gate provably cannot catch on its own: supernatural content falsely labelled
`mechanism_grounding: 'ordinary'` passes every free check. It is the highest-information single scene.
Then `materialization_possession` (most physically consequential), then `history_rewrite`,
`identity_reputation`, `relationship_social`.

**Exact state (per run)**
- Same deterministic First Sacrifice CG state; fresh storyId; images blocked.
- An active Tempt Fate rupture of exactly the class under test, seeded deterministically — **not**
  produced by a paid roll, which would add cost and variance.
- Note the interaction already in the code: `opts.ruptureActive` **waives the required-lane check**
  ("an active Tempt rupture outranks the scheduled frame"). So this test also exercises that waiver,
  and the sheet for each class must state whether the waiver firing is expected.

**Exact input (per run)** — a Say/Do chosen to touch that class's own verbs, taken from
`_RUPTURE_CLASS_VERBS[class]` rather than invented, so the class is genuinely engaged.

**Preflight must prove before any paid call**
1. The seeded rupture is the class under test, and `_canonRiskTouches` / the risk trigger fire for it.
2. The lane-requirement waiver state is as expected and recorded.
3. The class's durable consequences are declared and reach the real author payload.
4. Reserved-canon directive present; scene < due row 14. Zero dry dispatches.

**Ceiling** — **$0.15 per class**, one scene each.

**Pass / fail / no-data**
- **PASS** — the rupture's effect is realized in the scene *in the kind of effect its class names*, the
  durable consequence is recorded, and nothing outside the class's scope is quietly changed.
- **FAIL** — the effect is dramatized as a different class, the rupture is narrated but nothing changes,
  or it rewrites canon the class does not license.
- **NO DATA** — no scene delivered, or the seeded rupture is not the class under test.

**Stop conditions** — as Candidate A, plus: abort if the rupture is not active in the real payload.

**Settles:** whether each class's effect is realized as its own kind. **Does not settle:** whether the
model chooses the right class unprompted (that is a separate, later question).

---

## Recommendation

**Candidate A (gibberish) next.** Cheaper, one scene, no metaphysics, and the Say/Do plumbing it
depends on is in much better shape than when it was first proposed. Candidate B is worth doing but
should be five separate small authorizations, not one batch.

**Nothing here is queued, no runner has been armed, and no paid call was made to produce this sheet.**
