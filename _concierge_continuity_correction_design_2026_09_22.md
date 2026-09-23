# Concierge Continuity-Correction — Design Doc (2026-09-22, revised, dry only)

Roman, after the Say/Do safety-gate work: "when a user writes a complaint about the game, like
something is buggy or the AI forgot the plot, maybe that should open the concierge or the bug
report panel? ... It would be great if the concierge could play that role in Storybound, and leave
bug reporting for actual bugs." Then, on revision: "add this to the same adversarial-input agenda,
but don't mix it into the Say/Do sanitization pass. It's a different surface: OOC correction and
complaint handling, not in-character input... The design principle sounds right: the Concierge
should not become a magic 'rewrite the story because I said so' channel. It should verify against
ledgers, then either correct forward, explain, or route a real bug report."

This is a design document only. No code changes, no provider calls, nothing implemented. It exists
to settle the shape of the feature before any build work starts, and is committed as a design
artifact — it does not authorize building any of it. It is tracked on the same adversarial-input
agenda as the Say/Do safety-gate work but is explicitly a **separate surface and a separate
implementation pass**: Say/Do handles in-character input (including routing meta/game complaints
away from canon, now real as of this session's wall-break detector); the Concierge handles explicit,
out-of-character reader correction, continuity objections, and bug-report intent.

## 1. Surface separation (required constraint)

- **Say/Do** (`gnActionInput`/`gnDialogueInput`, the Submit handler) now has its own wall-breaking/
  meta detector (`_detectWallBreakSignal`, shipped this session) that keeps obvious app/game/model/
  interface references out of canon with a graceful, non-authored placeholder. This is sufficient
  for *routing meta/complaint language away from the story* — it is not, and is not meant to be, a
  continuity-correction tool. It does not read the ledger, does not verify anything, and does not
  change any committed fact.
- **The Concierge** is the surface for a reader who deliberately steps outside the story to raise a
  correction, a continuity objection, or a bug — either by proactively summoning it, or by being
  offered it after Say/Do detects a meta/complaint pattern (a handoff, not an overlap: Say/Do's own
  detector still fires first and keeps the literal text out of canon regardless of what happens
  next).
- These stay implemented as two separate passes with two separate proof surfaces. Nothing in this
  document proposes merging their detection logic.

## 2. What "Concierge" currently is (traced directly, not assumed)

Two unrelated systems share the name:

- **Onboarding whisper + Library panel** (`_renderConciergeWhisper`, `_paintConciergeWhisper`,
  `_initLibraryConcierge`/`_exitLibraryConcierge`) — hint bubbles and library navigation. Not
  conversational, not relevant here.
- **The conversational Concierge** ("gold-bell summon," persona at `app.js:327033`) — a real chat
  feature, deliberately the one place in the app where OOC address is the intended mode ("a
  polished host... staff at a high-end establishment, not a character performing narration").
  Per-turn: `_buildContextBlock()` (327485) gives it *shallow* story-config awareness (world,
  archetype, dynamic, pov, turn count, current screen) plus a keyword-matched FAQ block
  (`_buildConciergeFaqBlock`, 116805) and topic patterns (`_CONCIERGE_TOPIC_PATTERNS`, 327109). It
  does **not** read the scene ledger, the relational ledger, or any committed plot fact today — it
  knows what kind of story this is, not what happened in it.
- **Non-personalization rule** (`feedback_concierge_nonpersonalization`): the Concierge must never
  reference past user behavior or imply recognition of the user. Written for a different concern
  (don't make the host feel like surveillance). This feature needs an explicit, deliberate
  carve-out, not a silent violation: reading this story's own committed facts, on the reader's own
  explicit request, to check a specific continuity claim is not behavioral tracking — recommend
  narrowing the rule's stated scope (cross-session behavioral profiling stays forbidden) rather than
  quietly treating this as an exception.

## 3. What already exists to build on (generic, not First-Sacrifice-specific)

- `_sceneLedgerGet(s, false)` → `{entries}` — chronological ground truth, including `oas_interrupt`
  (Fate-card/Say-Do) commits.
- `_extractRecentOASExchangeLines(s, {limit: N})` — already extracts recent exchange text for
  author handoff; directly reusable as "the history slices" this feature needs to check against.
- `_relLedger(false)` — the relationship ledger.
- `state._scenePlotContract` — `{aftermathTruths, reservedConstraints, hardBeats, stateChange}`,
  the structured per-scene commitment record this session extended repeatedly. `aftermathTruths`
  specifically is exactly "facts already committed that future scenes must not contradict" — the
  natural place a claim is *checked against*, and the natural place a verified correction is
  *written to*.
- The seed's own `worldTruths` (`_activeSeed(s)`) — canon facts already delivered to authors today.
- `_captureBugReportContext()` (116528) + the real, working bug-report panel
  (`bugReportDescription`/`bugReportSubmitBtn`, `/api/bug-report`, rate-limited 3/24h) — reused as-is
  for genuine bugs and for the ambiguous branch's escalation path (§5).

None of this is First-Sacrifice-specific; every accessor above is a generic Storybound mechanism.

## 4. Verification comes before correction (required constraint)

Before any correction is even considered, the Concierge must check the claim against real,
structured story data — never accept a reader's claim at face value, and never let the model's own
judgment of the reader's sincerity substitute for a lookup. Concretely: a continuity claim is
checked against `_sceneLedgerGet`'s entries, `_relLedger`, `state._scenePlotContract.aftermathTruths`
/`reservedConstraints`, and the seed's `worldTruths` — the same structured channels this session's
own causal-legibility and relational-obligation work already treats as ground truth. If the claim
cannot be resolved against these sources, it is **not** treated as confirmed by default — see the
ambiguous branch below.

## 5. Three-way branch (required constraint)

- **Reader appears correct** — the ledger/aftermath-truth data genuinely shows the claimed fact was
  established (or contradicts what's currently being written). Only this branch reaches §6.
- **Reader appears wrong** — the structured data shows the story never established what they think,
  or shows the opposite. The Concierge says so plainly, in its own OOC voice, quoting or
  paraphrasing the actual committed fact so it reads as verified rather than defensive. Nothing
  about the story changes. This is also the primary anti-abuse case (§7).
- **Ambiguous** — the structured data doesn't clearly resolve the claim either way (a real
  possibility — not everything a reader might ask about is tracked as a structured fact). The
  Concierge says so honestly, and **either** asks the reader a clarifying question **or** creates a
  reviewable bug/continuity note (reusing `_captureBugReportContext()`'s existing pipeline) for
  human review — never a story rewrite, never a guess presented as a verified correction.

## 6. Branch-forward, never silent retroactive edits (required constraint)

Per this project's own Tempt Fate design law (`project_tempt_fate_branch_law`): branch-forward,
never retroactive. The same law applies here for the same reason — silently editing an
already-displayed page the reader has already formed an opinion of is a much larger trust violation
than a forgotten detail ever was.

A verified correction (from the "reader appears correct" branch) is written into
`state._scenePlotContract`'s `aftermathTruths` as a newly-committed fact — the same structured shape
`_buildPlotContractDirective` already delivers to every author call as a HARD, binding constraint.
The *next* generated scene inherits it and is obligated to honor it. Already-displayed prose is not
touched.

**The one explicit exception, and it must stay explicit**: a reader may separately choose to
regenerate or replay an already-written scene through whatever regenerate/replay flow the app
already exposes for that purpose. That is a deliberate, opt-in action the reader takes on their own
— it is not something the correction flow triggers, suggests as the default, or performs silently
on the reader's behalf. The Concierge's own output in the "reader appears correct" branch is limited
to the forward-binding fact and an OOC acknowledgment; it never itself initiates a regenerate/replay
action.

## 7. Abuse resistance (required new section)

A continuity-correction feature that trusts the player's claim by default is a *worse* risk than
building nothing, for a reason specific to this project: this session spent an entire day building
gates that exist precisely to stop a player from talking the story into an outcome it shouldn't
reach on its own — the relational-obligation gate, the causal-legibility mechanism, the Tempt Fate
Empowerment Contract, the Say/Do safety gate. A "tell the Concierge it forgot something and it will
fix the story" feature is a direct, unguarded bypass of every one of those if it believes the claim
at face value. Explicit rules, not aspirations:

- **Do not blindly believe "you forgot X."** Every claim resolves through §4's verification step
  against real structured data before anything is written. A claim that cannot be verified is
  ambiguous (§5), never accepted by default.
- **The correction flow must not become a side door around Tempt Fate, Petition Fate, canon gates,
  safety rules, or paid-call authorization.** Concretely: a "correction" cannot introduce a fact
  that amounts to an unauthorized wish-grant (that's what Petition/Tempt Fate exist to adjudicate,
  under their own rules — a correction path is not a second, unguarded wish mechanic); cannot
  override anything the Say/Do safety gate, the relational-obligation gate, or the causal-legibility
  mechanism would otherwise refuse; and — if any part of a verified correction's *own* verification
  or write-back path ever needs a real model/provider call — that call follows the exact same
  explicit-authorization discipline every paid call in this project already requires. The Concierge
  cannot grant itself permission to spend.
- **Do not let a reader smuggle new canon through a fake correction.** "You forgot that Julian is
  actually working for the Institution" is a claim to verify, not a fact to accept because it was
  phrased as a correction. If nothing in the ledger/aftermath-truth data supports it, it is either
  wrong (§5, explained) or ambiguous (§5, deferred) — it is never written as a fact solely because
  the reader asserted it confidently or repeatedly. A rate-limit/cooldown on repeated claim attempts
  is worth adding for exactly this reason (also useful against a reader probing many claims to map
  what the ledger does and doesn't track) — sized when this is actually built, not designed here.

## 8. Hard boundary — the Concierge never writes story prose (required constraint)

Per `feedback_single_prose_owner` (only Author + Editor write prose) and
`feedback_validators_never_write` (a validator that rewrites is a competing author): the Concierge's
role stops at OOC acknowledgment and at writing a **structured fact** (`aftermathTruths`-shaped),
never at generating replacement narrative text itself. A wrong "correction" delivered as actual
story text is indistinguishable from real canon by the time the reader sees it — keeping the write
surface to structured, checked facts keeps this feature auditable the same way `aftermathTruths`
already is.

## 9. Actual bugs (required constraint, reaffirmed)

Genuine bugs route to the existing, already-working bug-report mechanism (§3) — not folded into
story canon, not handled by the continuity-verification logic at all. This is pure routing; no new
capture or backend logic is proposed.

## 10. Generic, not First-Sacrifice-specific

Every accessor cited in §3, the bug-report panel, and the Concierge's own architecture in §2 are
already Storybound-wide. No part of this design depends on Fatelands vocabulary or First Sacrifice's
own lane data.

## 11. Open questions / explicit non-goals

- **Not in scope**: retroactive editing of already-displayed pages outside the explicit opt-in
  regenerate/replay flow named in §6.
- **Not in scope**: the Concierge inventing a correction from its own judgment without a ledger
  match — the ambiguous branch always defers, never guesses.
- **Open**: should a verified correction also get a diegetic echo (a character subtly registering
  it on the page) in addition to the silent forward-binding fact? If wanted, it should be the same
  kind of directive `_buildPlotContractDirective` already renders, not a Concierge-authored special
  case — an author-side dramatization decision, not an OOC one.
- **Open**: the specific cooldown/rate-limit shape for repeated claims (§7) — flagged as needed, not
  sized.
- **Open**: `_captureBugReportContext()` does not currently include ledger/continuity data. If an
  ambiguous continuity complaint escalates to a bug/continuity note, the note would be missing
  exactly the context a human reviewer would want — worth a small, separate extension when this is
  actually built.

## 12. Proposed dry build order (not started, marked clearly as order only)

1. A dry control proving the three-way branch classification against real, already-committed
   ledger data from this session's own successful Fate-card attempts — read-only against existing
   accessors, no new code needed to prove this.
2. The Say/Do → Concierge handoff trigger (offer, not auto-open, when the wall-break detector fires
   on a plot-memory-complaint-shaped input) — reuses the detector already shipped, adds only the
   UI offer.
3. Extend `_CONCIERGE_TOPIC_PATTERNS` with the continuity-check topic for the proactive-summon
   entry point.
4. The `aftermathTruths` write path for a verified correction — reusing, not extending, the
   existing `_scenePlotContract` shape.
5. The abuse-resistance checks from §7, built and proven BEFORE step 4 is ever live-tested — they
   are a precondition of step 4, not a follow-up to it.
6. Only after 1-5 are dry-proven: one paid dry run confirming a verified correction actually changes
   the next generated scene's behavior, under the same tight rules and the same explicit
   authorization every other paid test in this project requires.

## Status

Design only. No code changes. No provider calls. Nothing in this document has been built. Committed
as a design artifact for the adversarial-input agenda, tracked separately from the Say/Do
sanitization implementation work.
