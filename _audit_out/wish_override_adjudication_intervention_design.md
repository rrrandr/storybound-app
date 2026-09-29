# Wish override, adjudication & intervention — design amendment (2026-09-14)

Design only. No code, no seed changes, no prompt edits, no provider calls. Amends the arc-constraint registry (`_checkArcConstraint`/`_attemptArcConstraintTarget`, IMPLEMENTED last round) and the Scene 2 design chain, before any further implementation. Every claim below is grounded in real code (cited) or explicitly marked as a new proposal — nothing is presented as already built when it isn't.

**Correction note (2026-09-14, same day): §1 and §2 were wrong to treat `inquiry_opened` as fulfilling ANY override regardless of what the wish actually demanded.** `inquiry_opened` (the real reserved-event id) is a *convene*-tier fact — the hearing has begun. A wish demanding the Inquiry be *resolved* is not honestly fulfilled by the hearing merely starting; treating it as fulfilled would let a token opening satisfy a stronger demand, exactly the "fake compliance" the override exists to rule out. §1 and §2 are rewritten below to require explicit operation/scope semantics (`convene` vs `resolve`, at minimum) and to name the missing `inquiry_resolved` event as a real, unbuilt dependency — not silently assumed away. §3-§7 are otherwise unchanged by this correction.

## 0. What's real today, what's genuinely new

Researched directly in `public/app.js` before writing this, so the design doesn't invent vocabulary that conflicts with existing canon or duplicate a mechanism that already exists:

- **Real**: `state._temptFateLedger` (`_recordTemptFateEvent`, ~185985-186030) — each entry: `{ sceneIdx, wishText, anatomyKeywords[], quantityKeywords[], claimedByPlayer, scale: 'mass'|'social'|'intimate', affectedTargets[], landmarks[], publicAttribution: 'private'|'legend'|'attributed'|'debated'|'unsolved', witnessScope: 'private'|'public', sealedAt, ... }`. A real 3-layer system exists alongside it — `_durableFateConsequences` and `_fateTollLedger`. All three are already carried across an Issue boundary explicitly in `startBook2` (~99447-99499) — direct precedent that a wish record surviving a Book transition is established practice, not a new ask.
- **Real, and directly relevant**: `_resolveFateCardBargain` (~185941-185983) shows Tempt Fate is *already* a guaranteed-resolve mechanic today — "TEMPT win → resolved... never downgraded," with at most a semantic translation, never an outright twist. This confirms the user's "non-twisting Tempt Fate override" isn't asking for new behavior on Tempt Fate's own resolution — it already doesn't twist. What's new is only the *arc-constraint interaction* (§1-2 below).
- **Real, but not what's needed**: `classifyWishDisposition` (~103622-103729) is a real, generalized Eight-Orders classifier — but it classifies the wish's *operation type*, not alignment with the character's psychology. Character-portfolio alignment for an ordinary in-story wish **does not exist as a mechanism anywhere** — §5 below is genuinely new design territory, not a gap-fill.
- **Real publicity vocabulary**: `publicAttribution` (5-value enum) and `witnessScope` (2-value enum), plus `affectedTargets`/`landmarks`, are real, already-used fields — the new wish-adjudication record (§5) reuses these names and value sets verbatim rather than inventing parallel ones.
- **Real canon terms**: "wish-scholars" (world canon, ~221573) and "wishcraft scholars" (First Sacrifice seed `worldTruths`, ~126775) already exist. **"Wishmonger" does not exist anywhere in the codebase or canon** — §5's design note uses the real terms instead.
- **Real precedent for a bounded "not yet resolved" state**: `state._sceneObjectives[sceneNum].status` (`pending`/`accepted`/`superseded`) plus `_recordScenePosture`'s posture-hash reuse-on-unchanged logic is the exact, already-proven mechanism §6's `wish_intent` lifecycle is modeled on — not a new pattern invented for this.
- **Real mechanism this design reuses directly**: `_commitStoryEvent`/`_isStoryEventCommitted` and `_checkArcConstraint`'s `unlock_condition: {type:'committed_event_id', event_id}` (both built last round). §2 shows these already do double duty for override fulfillment with no new field needed.

## 1. Registry amendment — constraints must declare an `override_policy`, scoped by operation

Extends the constraint record shape (already implemented in `state._arcConstraints`) with one new field. **Corrected**: fulfillment is per-operation, not a single flat event id — the earlier draft's `on_override.fulfills_reserved_event: <event_id>` (singular) let *any* override satisfy the lock regardless of what was actually demanded. That was wrong.

```js
// PROPOSED SCHEMA ADDITION — not yet written into STARTER_SEEDS or _checkArcConstraint/
// _attemptArcConstraintTarget. No code changes this round.
override_policy: {
  overridable: boolean,
  override_requires: 'non_twisting_fate_override' | 'wish_adjudication_success',  // §5 widens this to accept both
  operations: {
    // at minimum these two; a target may support only a subset, or more, depending on canon
    convene: { fulfills_reserved_event: 'inquiry_opened', unlocks_target: true, requires_arc_replan: true },
    resolve: { fulfills_reserved_event: 'inquiry_resolved', unlocks_target: true, requires_arc_replan: true }
    // 'inquiry_resolved' does NOT exist anywhere today — grep-confirmed against the real seed's
    // reservedEvents; only 'inquiry_opened' (row n:4) is real. This is a genuine missing
    // dependency, not an oversight to paper over — see the closing line of §2.
  }
}
```

Any override/wish request must now declare `requested_operation: 'convene' | 'resolve'` (at minimum) alongside its target — §5's `parsedWish` shape is corrected below to carry this. `override_policy.operations[requested_operation]` is what the fulfillment check consults — never a single, operation-blind field.

For `starter_first_sacrifice:the_open`: `overridable: true` for `convene` today (its fulfillment event, `inquiry_opened`, is real); `resolve` is declared in the schema but **cannot honestly fulfill** until `inquiry_resolved` exists as a real, committable event — see §2.

## 2. Override semantics — `convene` is real and fulfillable; `resolve` is not, yet

A wish that says "convene the Inquiry" must genuinely convene a real hearing; one that says "resolve the Inquiry" must reach a genuine resolution — neither may be evaded through interruption or a token staged-then-cancelled hearing. **Corrected**: these are not the same fulfillment condition, and the previous draft's "one commit does double duty" framing conflated them — committing `inquiry_opened` proves only that a hearing began, never that it concluded.

**What's real and fulfillable today**: `_checkArcConstraint`'s unlock condition for `the_open` is already `{type:'committed_event_id', event_id:'inquiry_opened'}` — the real, existing reserved-event id from `STARTER_PLANS` row n:4. Calling the already-real `_commitStoryEvent('inquiry_opened', {source:'fate_override'|'wish_adjudication', ...})` unlocks The Open and stands as the fulfillment record for a `convene`-scoped request. That much stands from the original draft.

**What's genuinely missing, not silently assumed**: no structured `inquiry_resolved` event exists anywhere in the real seed or plan data (confirmed by the same grep that found `inquiry_opened` — nothing else in that family exists). A `resolve`-scoped override or wish **must remain pending/unfulfilled** — `_checkArcConstraint` would correctly report `available: false` for the `resolve` operation — until a future, separate design and implementation adds a real, committable `inquiry_resolved` id (what it means for the hearing to conclude, what record it produces, whether it can itself twist/bound/deny rather than just "happen"). This document does not design that event now; it only records that it's required before a no-twist override can honestly resolve the Inquiry early, and that `inquiry_opened` must never be treated as satisfying it.

What genuinely is new and unbuilt regardless of operation: a lookahead-window rule change. Today `_validateLocalObjective`'s reserved-event check only ever rejects a scene that *touches* an untouched reserved event. It has no concept of an event being legitimately, deliberately triggered ahead of its authored row. §4 below states the required rule precisely, as a design constraint on the future implementation, not as code.

## 3. `replan_required` marking

New proposal (no existing precedent found for "mark the plan stale"):

```js
state._arcReplanRequired = {
  cause: 'override_fulfillment',
  eventId: 'inquiry_opened',
  fulfilledAt: <ts>,
  storyId: <current storyId>,
  sourceRecordRef: <wishId or override-event id from §5>
};
```

A pure flag. No replanning logic is designed or built here — a future planner/issuer must check this flag and treat the plan's remaining rows (specifically anything downstream of the fulfilled reserved event) as needing regeneration from the override's actual consequences, never quietly preserved.

## 4. The anti-evasion structural rule (required of any future implementation)

Stated explicitly so it constrains implementation later, not left implicit: **once `_isStoryEventCommitted('inquiry_opened')` is true, no later scene's stage or objective proposal may declare that same reserved id as still `untouched`/pending.** This is the mechanical form of "the old beat cannot fire again" — the inverse of today's existing check (which rejects touching an *untouched* reserved event) applied to an *already-fulfilled* one. Both directions belong in the same validator, as one coherent reject-only rule, when built.

## 5. Wish-adjudication model — ordinary Say/Do wishes, no artificial scale cap

Fatelands doesn't gate wish scope by size. A Say/Do containing a genuine wish plus an offered sacrifice is eligible for adjudication regardless of scale, evaluated on five factors:

1. **Alignment** — with the reconciled PC portfolio and current committed behavior. **Dependency gap, flagged not filled**: "reconciled PC portfolio" is `project_reputation_consequence_requirement` — MANDATORY per standing memory, confirmed **not yet implemented**. Alignment checking has no real portfolio to check against yet.
2. **Formulation precision** — does the wording say what the character means, or leave Fate an opening.
3. **Sacrifice equivalence** — offered cost commensurate with the requested change.
4. **Scope/collateral consequences** — what else must move for the wish to become true.
5. **Locked-world constraints** — the arc-constraint registry itself (already real, §1's amendment plugs in here).

**Persisted wish-adjudication record** — modeled on the real `_temptFateLedger` shape and real publicity fields, not invented from nothing:

```js
// PROPOSED — not implemented.
{
  v: 1, wishId: <stable id>, storyId, sceneKey,
  playerWordingVerbatim: <string>,                 // never paraphrased, never rewritten
  parsedWish: { targetType, targetId, requestedOperation: 'convene' | 'resolve' },  // corrected — was a vague requestedScope; must name a real operation from override_policy.operations (§1)
  offeredSacrifice: { verbatim: <string>, category: <parsed> },
  alignmentBasis: { portfolioRef, committedBehaviorRefs: [...], finding: 'aligned'|'misaligned'|'ambiguous', why },
  formulationFinding: { precise: boolean, ambiguityNotes },
  equivalenceFinding: { sufficient: boolean, why },
  scopeCollateral: { affectedEntities: [...], landmarks: [...] },     // reuses REAL _temptFateLedger field names
  lockedWorldCheck: { constraintId, satisfied: boolean },              // reuses the arc-constraint registry, §1
  resolution: 'fulfilled' | 'twisted' | 'bounded' | 'denied',
  costsApplied: [...],
  publicity: { publicAttribution: <REAL 5-enum>, witnessScope: <REAL 2-enum> },  // verbatim reuse, not new vocabulary
  provenance: { source: 'wish_adjudication', committedAt: <ts> },
  requiresArcReplan: boolean
}
```

If it succeeds and targets a locked, overridable constraint: mark the reserved event fulfilled early (§2's `_commitStoryEvent` call) and `requiresArcReplan: true` — never a token hearing staged then interrupted. If it misaligns, is underpaid, or is ambiguously phrased, Fate may twist or bound the result — the record's `alignmentBasis`/`formulationFinding`/`equivalenceFinding` are what a future author would render *from*, structurally, rather than inventing a reason in prose after the fact.

**Design note — wish-scholars, not "wishmongers"**: the real canon terms are wish-scholars and wishcraft scholars (§0). They may provide in-world formulation and price guidance — they never guarantee success and never replace the player's actual choice. Any future implementation should use these existing terms, not introduce a new one.

Adjudication's actual evaluation logic (how alignment/formulation/equivalence get judged) is intentionally not designed in algorithmic detail here — only its five inputs and the record it produces. Not implemented this round.

## 6. Wish-intervention layer

Two states, modeled directly on `_sceneObjectives`'s real `pending`/`accepted`/`superseded` lifecycle and `_recordScenePosture`'s posture-hash reuse (§0):

- **`wish_intent`** — the reader has stated an intended wish + sacrifice in Say/Do; not yet sealed.
- **`wish_sealed`** — after any warning, the reader confirms, restates, or explicitly forces the original wording/sacrifice. Must be adjudicated honestly (§5); cannot be delayed further to protect a planned beat.

```js
// PROPOSED — not implemented.
state._wishIntents[sceneKey] = {
  status: 'pending' | 'sealed' | 'abandoned' | 'superseded',
  postureHash: <reuse _postureHash>,      // an unchanged repeat is recognized as the SAME intent, not a new one
  wordingVerbatim, offeredSacrificeVerbatim,
  riskSignal: { present: boolean, reasons: [...] },   // a PREVIEW against §5's five factors, before sealing
  interventionUsed: boolean,               // see the one-interval rule below
  storyId, at
};
```

**Risk signal**: derived from the same five adjudication factors as a preview (weak alignment / ambiguous formulation / insufficient sacrifice / a locked future beat via `_checkArcConstraint` / known hidden risk) — computed before sealing, never the final adjudication itself.

**Intervention**: only a present, issued, knowledgeable character (checked against the scene's real roster, the same mechanism `_effectiveSceneRow`/`_validateStageProposal` already use) may act, and only when a risk signal exists. It must preserve agency, never remove it — the reader's next input may: proceed unchanged, demand an explanation, consult a wish-scholar, rephrase, alter the sacrifice, or abandon. Julian stopping Lirael before a catastrophic wording is exactly this shape: a charged, characterful block she can still reject and push through.

**The 800-word-cadence bound (one interval, not a delay loop)**: `wish_intent` grants exactly one authored passage of dramatic response before the reader's next Say/Do — sized to this app's own existing continuation cadence (observed convention, not a new invented UI step). At the next turn, the reader's response is read against the SAME `wish_intent` via posture-hash comparison: unchanged or explicitly forced → seal → adjudicate for real (§5); substantively changed → a genuinely new intent, a fresh interval, not a stacked delay.

**Anti-evasion rule, stated as a hard reject-only constraint on any future implementation**: if `wish_intent.interventionUsed === true` and the reader's next Say/Do reasserts the same wish with no substantive change (same posture hash), the system may **not** interrupt a second time — it must proceed to sealing and honest adjudication. No serial deferrals merely to protect a planned event. A passage may change the reader's incentives through genuine new consequences or information; it may not retcon the attempted wish or fabricate permanent canon solely to block it.

**Explicit carve-out**: a non-twisting Tempt Fate override (§1-2) skips intervention entirely. Tempt Fate is already a reader-elected, paid, deliberate mechanism — confirmed by `_resolveFateCardBargain`'s real guaranteed-resolve behavior (§0) — it doesn't need a diegetic warning step the player already bypassed by choosing the stronger mechanism. Intervention applies only to ordinary in-story Say/Do wish attempts.

## 7. Controls — design-level only (what each would assert; none implemented or run this round)

| # | Category | Setup | Asserts |
|---|---|---|---|
| 1 | Normal demand defers, intent preserved | Ordinary Say/Do demands the Inquiry now, no Tempt Fate, no sealed wish | `_attemptArcConstraintTarget` behavior unchanged from last round — deferral recorded, `requested_intent_text` verbatim, target stays locked |
| 2 | Non-twisting Fate demand to CONVENE fulfills | A Tempt Fate override, classified non-twisting, `requestedOperation:'convene'`, targets `the_open` | `_commitStoryEvent('inquiry_opened', {source:'fate_override'})` fires; `_checkArcConstraint` reports available for `convene`; `state._arcReplanRequired` set |
| 2b | RED — a demand to RESOLVE is never satisfied by `inquiry_opened` alone | Same override, `requestedOperation:'resolve'` | Must stay `available:false` for `resolve` — `_commitStoryEvent('inquiry_opened', ...)` alone must never be read as fulfilling it; fails this control if it is |
| 3 | Old reserved beat cannot re-fire | After #2, a later scene proposes staging `inquiry_opened` as still pending | Rejected — the new inverse rule (§4): an already-committed reserved id can never be re-declared untouched |
| 4 | Replan marked, with cause | After #2 | `state._arcReplanRequired.cause === 'override_fulfillment'`, `eventId === 'inquiry_opened'`, `sourceRecordRef` resolves to the real override record |
| 5 | RED — forced "resolve now" cannot be deferred/interrupted, and cannot be faked as convene | A non-twisting override explicitly demands resolution, not just convening, in a story where `inquiry_resolved` doesn't exist (true today) | Any implementation that (a) returns a deferral, (b) stages-then-interrupts, OR (c) marks the request fulfilled via `inquiry_opened` alone fails this control by construction — see the blocking note below the table: this exact request has no honest answer until `inquiry_resolved` is built, and no implementation may ship a fake one meanwhile |
| 6 | Ordinary wish, no scale cap | A large, properly-formed, sufficiently-sacrificed Say/Do wish (not Tempt Fate) targets the locked Inquiry | Eligible for adjudication (§5) regardless of size; on success, identical fulfillment path as #2 (`override_requires: 'wish_adjudication_success'`) |
| 7 | Misaligned/underpaid wish twists or bounds, reason is structural | A wish with a documented alignment/equivalence defect | `resolution` ≠ `'fulfilled'`; the record's own `alignmentBasis`/`equivalenceFinding` names the real defect — never a prose-invented reason with no structural backing |
| 8 | Warning preserves original intent | A risky `wish_intent` triggers an intervention passage | `wordingVerbatim`/`offeredSacrificeVerbatim` on the record are byte-identical before and after the intervention passage |
| 9 | Intervention requires presence + risk signal | Julian not in the scene's roster, or no risk signal present | No intervention fires — either condition alone is insufficient |
| 10 | No intervention after sealing | `wish_intent.status === 'sealed'` | A further attempt to intervene is rejected — sealing is a one-way gate into adjudication |
| 11 | Insistence reaches adjudication | Reader reasserts the identical wish after one intervention interval | `interventionUsed === true` blocks a second interruption; the wish seals and adjudicates (§5), not deferred again |
| 12 | Fate override bypasses intervention entirely | A non-twisting Tempt Fate override is submitted | No `wish_intent`/intervention path is entered at all — goes straight to #2's fulfillment path |
| 13 | RED — override converted into a delay loop | Any implementation that responds to a non-twisting Tempt Fate override with a warning, a re-ask, or a bounded interval instead of immediate fulfillment | Fails by construction — §6's carve-out is violated |

### Blocking note — a `resolve`-scoped override has no honest answer yet

This is a real gap, not an oversight: today, nothing in Storybound can honestly fulfill a request to *resolve* the Inquiry — `inquiry_resolved` doesn't exist, and per the anti-evasion rules already established (§4, control #5), the system also may not fake resolution by fulfilling `inquiry_opened` alone, defer it, or interrupt it. **A future implementation must not accept a `resolve`-scoped override for `the_open`/`inquiry` at all until `inquiry_resolved` is designed and built as its own real, committable structured event** — what concluding the hearing means, what record it produces, and whether it can itself twist, bound, or deny rather than simply "happen." Until then, `override_policy.operations.resolve` stays declared-but-unusable in the schema (§1), a documented limitation rather than a silently broken promise.

## 8. Explicit stop line

No code was written. No seed data was changed. `_checkArcConstraint`, `_attemptArcConstraintTarget`, `_commitStoryEvent`, and `_validateLocalObjective` were read and reasoned about, not edited. No adjudication algorithm, no replanning logic, no intervention UI, and no provider call exist as a result of this document. This is a design amendment for review, per the explicit instruction across all four parts of this request.
