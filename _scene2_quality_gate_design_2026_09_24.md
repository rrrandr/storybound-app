# Continuation quality gates + Tempt outcome extractor — dry design

2026-09-24. No paid calls. Corpus: the 16 real scenes in
`_scene2_density_baseline_finding_2026_09_24.md`.

---

## 1. Corpus labels — which adequacy failures are real

Every adequacy failure across all 16 scenes, read and labelled by hand. "Genuinely bad" means a
human would reject the scene; it does **not** mean "the check fired".

| scene | beats | prose | flags raised | genuinely bad? | why |
|---|---|---|---|---|---|
| `boundary` | 26 | 915 | aftermath, **relic**, ending | **YES** | `"claim the Answer as my sacrifice"` violates registered relic canon. Hard defect independent of density. |
| `boundary_retry2` | 27 | 1417 | aftermath | **YES** | 27 beats, **zero dialogue**, nothing occurs. A static tableau: *"Julian waits" / "has not moved" / "has not changed" / "remains half-raised"*. The check is right. |
| `boundary_retry3` | 24 | 1351 | aftermath, ending, **cosmology**, **continuity** | **YES** | `"gods"` in a world with no god; mouth-band re-staged in its already-changed prior state. Two hard-canon breaches. |
| `boundary_retry4` | 24 | 1454 | aftermath, ending | **MIXED** | The event *does* land — the PC publicly names Julian, the assembly turns. Social consequence, no institutional process. Aftermath flag arguable; **ending flag is a false positive**. |
| `boundary_retry13` | 23 | 1461 | aftermath | **NO — false positive** | The scene *is* aftermath: Seren's family steps forward, *"What remedy does the family seek?"*, *"We demand the interference be named and the rite's balance restored."* A formal family demand is exactly what the check wants. |
| `silence_a3` | 23 | 1262 | aftermath | **NO — false positive** | *"A preliminary review will be held at the next turning of the moons."* / *"Terms will be set by the Dohkar council alone."* A scheduled procedural review — the canonical aftermath shape. |
| `confession` | 25 | 1216 | ending | **NO — false positive** | Strongest aftermath in the corpus: *"A preliminary review will convene before a Chayr and two Dohkars in three days"*, terms set, *"Three days remain before the terms bind me."* The event landed hard; the ending is a decision gate. |
| `RUPTURE 09-23` | 38 | 2264 | ending | **NO — false positive** | The rupture landed (mass forgetting delivered). Densest scene in the corpus. Decision-gate ending after a landed event. |
| `RUPTURE 09-24` | 18 | 796 | aftermath | **YES** | Below the entire corpus on beats and prose. *(The aftermath flag itself is arguable — the rupture invalidated the scheduled review by design — but the scene is thin on independent grounds.)* |

**Tally: 4 genuinely bad, 4 false positives, 1 mixed.**

### What the false positives share

The **aftermath lexicon is too narrow**. `_SCENE_AFTERMATH_VOCAB_RX` requires
`tribunal|inquiry|hearing|summons|convene|procedur*|ruling|verdict|sentence|investigation|aftermath|consequences|recriminations`,
or `family|kin|…` within 50 characters of `react|demands|blames|confronts`. It misses:

- **`review`** — *"a preliminary review will be held"* (`silence_a3`)
- **`remedy`**, **`restore`**, **`council`** — *"What remedy does the family seek?"*
- **`demand` at distance** — *"We demand the interference be named"* is 40+ chars from "family", and is spoken by the father rather than adjacent to the word
- **`terms will be set`** — a scheduling construction the `date is set` branch doesn't cover

`confession` passed the aftermath check only because it happened to use the word **"convene"**.
That is a lexicon coin-flip, not a quality measurement.

**Do not recalibrate until all 14 pass.** Four of them *should* fail. The correct target is:
keep firing on `boundary`, `retry2`, `retry3`, `09-24`; stop firing on `retry13`, `silence_a3`,
`confession`, `09-23`.

---

## 2. Minimum continuation floor — beats **and** prose, with a graded response

Beat count alone is insufficient: a 25-beat scene at 30 chars/beat (750 prose) passes a beat floor
while being thinner than anything in the corpus. Prose alone is insufficient: a 12-beat scene at
80 chars/beat (960 prose) passes a prose floor while being structurally a sketch.

Observed corpus (14 ordinary + 2 rupture):

```
beats   ordinary 23–35    rupture 18, 38
prose   ordinary 915–1532 rupture 796, 2264
```

Proposed two-tier floor:

| tier | condition | catches, in this corpus |
|---|---|---|
| **WARN** | `beats < 23` **or** `prose < 915` | nothing in the ordinary corpus; `09-24` only |
| **HARD** | `beats < 20` **or** `prose < 850` | `09-24` only |

The WARN threshold sits exactly at the observed corpus minimum, so today it is a pure outlier
detector with zero false positives on known-good output. The HARD threshold sits meaningfully
below it, so ordinary run-to-run variance cannot reach it.

### Response policy — decided BEFORE the floor is built

A hard gate that rejects a paid author response spends ~$0.089 to discard usable prose. That is the
wrong default. Graded:

| tier | response | marginal cost | rationale |
|---|---|---|---|
| **pass** | nothing | $0 | |
| **WARN** | telemetry only — record `beats`, `prose`, `chars/beat` to the observatory; **accept the scene** | $0 | Builds the distribution that would justify a stricter rule. We have 16 scenes; that is enough to spot an outlier, not enough to set a rejection threshold. |
| **HARD** | accept-with-warning **plus** flag for review; **no automatic regeneration** | $0 | The prose is still usable. `09-24` delivered a valid, committed rupture — rejecting it would have destroyed a successful mass-memory grant over beat count. |
| **HARD + a genuinely-bad flag** (relic / cosmology / continuity) | bounded expansion, or regenerate | ~$0.089 | Only when a *canon* breach co-occurs is the output actually unusable. |

Bounded expansion is preferred to full regeneration where it applies: the existing
`_repairLIPresenceBeats` is the precedent — reject-only, scoped to exact beat indices, re-validated
before acceptance, never shipping a rewrite that still fails its own check. A beat-count expansion
could follow the same shape (add N beats between given indices, re-validate the floor), at a
fraction of a full regeneration.

**Recommendation: ship WARN-telemetry first.** It costs nothing, and after ~20 more scenes it tells
us whether the HARD threshold is right — instead of us guessing from n=16 today.

---

## 3. A movement test that knows whether the event landed

The current rule fails an ending when `suspensionHit && !movementHit`. Two independent defects:

1. **Modality-blind.** `\bspeaks?\b` matches *"I could speak now and claim what I did"* — a
   hypothetical the protagonist declines in the very next beat. This made `09-24`'s ending pass.
2. **Event-blind.** It cannot tell *"the rite was ruled on, and now she must choose"* from
   *"nothing happened and she is still deciding"*. Both look like indecision in the final beats.

That second one produced 3 of 5 ending false positives (`retry4`, `confession`, `09-23`).

### Proposed rule

A **decision-gate ending is valid when the scene's assigned event already landed.** Formally, the
ending fails only when:

```
suspensionVocabPresent
  AND NOT completedActionInTail        // modality-aware: movement verb NOT governed by
                                       // could/might/would/may/should/must/about to/going to
  AND NOT assignedEventLanded
```

`assignedEventLanded` reads signals that **already exist** — no new inference, no new call:

- **`beatFulfillment`** — the plot-contract scoring already piggybacked onto
  `_extractCharacterDisclosure` (app.js ~31659) returns
  `fulfilled | partial | missed | contradicted` per obligated hard beat. `fulfilled` on any hard
  beat means the assigned event landed.
- **`temptFateOutcome.delivered === true`** — on a rupture scene, the rupture *is* the event.
- Fallback when neither is available: the modality-aware tail test alone, i.e. current behaviour
  minus the hypothetical-verb bug.

Checked against the corpus, this rule keeps the true positive (`boundary` — nothing lands, ends in
indecision) and clears all four false positives, because in each the event demonstrably landed.

---

## 4. A separate Tempt outcome extractor — traced design

**Not a density fix.** The outcome report was 908 chars, 6.6% of the `09-24` response; it cannot
explain that run and must not be sold as fixing it.

The real argument is **grounding**. Today the author writes the prose *and* self-certifies what the
prose did, in one response, before the prose is accepted. It is its own witness. An extractor that
reads the *accepted* scene can cite the text instead.

### Contract

| | |
|---|---|
| **Reads** | the accepted scene prose; the exact wish text from the owned ledger entry (`ledgerEntry.wishText`); the authoritative composite roster (`_temptOutcomeSceneRosterDetailed`); surviving evidence already extracted for this scene |
| **Produces** | the `TEMPT_OUTCOME_CONTRACT` object, **plus a verbatim citation per claim** |
| **Authority** | **none over prose.** It may not rewrite, extend, or reorder a beat. |
| **Commits** | only after `_validateTemptFateOutcomeReport(raw, { presentRoster })` passes |

Citations are not novel here — `_extractCharacterDisclosure` already demands
*"quote = the statement copied VERBATIM from the scene, <=80 chars. It is checked against the
text"* with `basis: "asserted_on_page"`. The same discipline applies directly: every
`affectedKnowers[].disposition` must cite the line that establishes it, and a claim whose quote is
not found in the prose is dropped rather than committed.

This closes a gap the current design cannot: today a model can assert `disposition: "forgot"` for a
character the prose never mentions, and only the roster coverage check would notice. With citations,
an uncitable disposition fails on its own.

---

## 5. Dedicated call vs extending the existing extractor

### Cost (real figures from the 2026-09-24 run)

| option | model | marginal cost | note |
|---|---|---|---|
| extend `_extractCharacterDisclosure` | `ministral-8b-2512` (tiered) | **~$0.0003** | +~300 `max_tokens`, mirroring the existing `_pcBeats` piggyback (800 → 1100) |
| dedicated extractor call | `ministral-8b-2512` (tiered) | **~$0.0011** | the scaffold call in that run cost exactly `$0.001110` |
| regenerate the author | `grok-4-1-fast-reasoning` | **~$0.089** | for reference: ~80× the dedicated call |

Both extraction options are negligible against the author call. **Cost does not decide this.**

### Lifecycle and failure behaviour — this does decide it

`_extractCharacterDisclosure` runs post-persistence on a fire-and-forget promise chain
(app.js ~33496) with a mature lifecycle:

- keyed on `sceneUid`, which exists only after the scene is rendered
- **two separate guards**: `_ledgerProcessedUids` (persisted, **success only**) and
  `_ledgerInFlightUids` (in-flight, stops concurrent renders racing the same page)
- marks processed **only on real success**, so a failure stays retryable on the next visit
- re-checks `storyId` before writing, so navigating to another story mid-flight cannot cross-write
- `.catch()` swallows; all three provider tiers failing is a silent no-op

| | extend existing | dedicated call |
|---|---|---|
| race protection | **inherited**, already proven | must be rebuilt, or the ledger guards generalised |
| retry on failure | **inherited** | must be rebuilt |
| cross-story write guard | **inherited** | must be rebuilt |
| failure blast radius | **shared** — a Tempt parse failure loses the character ledger too | **isolated** |
| prompt coupling | one prompt does character ledger + relations + beat fulfilment + Tempt scope | single responsibility |
| dispatch accounting | no new role; no census/reservation change | **new role** — needs a phase-gate entry, cap, and cost reservation, exactly like `classifyWishCG` did |
| runs when not needed | always (every scene) | only on rupture scenes |

### Recommendation: **dedicated call**, reusing the guard pattern rather than the call

The deciding factor is **failure blast radius**, not cost. Folding Tempt scope into the character
extractor means one malformed reply loses both, and it makes an already four-purpose prompt
five-purpose. A rupture is rare; paying `$0.0011` on those scenes only, in isolation, is better than
enlarging the prompt every scene.

But the dedicated call must **copy the lifecycle, not invent one**: same two-guard pattern
(success-only persisted key + in-flight set), same success-only marking, same `storyId` re-check,
same silent-retryable failure. And it must be **censused before it ever runs** — added to the phase
gate, request cap, cost reservation and authorization sheet, which is the exact correction already
made once for `classifyWishCG`.

### Sequencing note

This changes *when* the outcome is known: today it commits inside
`_cgTemptFateCommitAtPersistence` from `plan.__temptOwnership.pendingOutcome`. An extractor moves
the commit **after** extraction returns, so `_temptFateOwnedInvocation()` must stay published across
that gap, and the aftermath cleanup must not run first. That ordering is the main implementation
risk and needs its own dry control before any of this ships.

---

## What is NOT proposed

- No paid baseline, no new Scene A, no Scene B.
- No recalibration of the aftermath check "until the corpus passes" — 4 of 9 failures are correct.
- No claim that the extractor fixes density. It does not.
- No hard rejection gate on beat count alone.
