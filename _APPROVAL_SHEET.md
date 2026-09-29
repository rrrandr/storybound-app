# Approval sheet — First Sacrifice, Issue 1 opening

> **Editorial work complete. Nothing implemented. No provider calls.**

---

# 1. Approved outcomes

| outcome | ask | class | temporal operation | cost |
|---|---|---|---|---|
| `unm.the_turning_forgotten` | `unseen` | `memory_perception` | — *(memory channel)* | none |
| `unm.the_accusation_unmade` | `escape`, accusation active | `history_rewrite` | `historical_replacement` | none |
| `unm.time_gives_way` | `undo` | `history_rewrite` | `historical_replacement` | **none — approved costless** |
| `unm.dohkar_demand_unmade` | `stop` | `history_rewrite` | `historical_replacement` | none |

**Plus five exact readings** — `assembly_forgets_twist`, `all_present_forget_twist`,
`institution_forgets_custody`, `julian_forgets_interrogation`, `dohkar_forgets_authority`.
*(`seren_forgets_price` is not an exact reading in this phase — the price has not been named.)*

---

# 2. Awaiting approval — four traces, final and ready

| outcome | ask | class | temporal operation | cost |
|---|---|---|---|---|
| `unm.standing_dissolved` | `authority` | `identity_reputation` | `current_state_transition` | `escalation_invited` |
| `unm.the_shunning` | `solitude` | `relationship_social` | `additive_canon_change` | `undefended` |
| `unm.the_claim_unmade` | `escape`, **pre-accusation** | `history_rewrite` | `historical_replacement` | none |
| `unm.the_custody_unremembered` | `silence` | `memory_perception` | — *(memory channel)* | `she_forgets_whose_it_is` |

**Each carrier was audited before drafting. Neither new outcome uses the Answer to establish past guilt,
truth, or causation, and neither invents a capability.**

### The two `escape` branches have distinct jobs and never compete

| | `unm.the_accusation_unmade` | `unm.the_claim_unmade` |
|---|---|---|
| eligible when | a family accusation **is** active | a family accusation is **not** active |
| ceases | the family's public accusation | the Dohkar's claim to rule on her conduct, the venue he named, and Julian's agreement |
| leaves standing | **the remedy demand** — *no one says she did it, and they still want paying* | **nothing accusing her yet** — *and now no one has claimed the right to judge* |

**`requiresInactive: accusation.family_accused` is declared on `unm.the_claim_unmade`.** They are never both
eligible, so **they are never ranked or tie-broken against each other.**

---

# 3. Intentionally unsupported

**None. No ask is unserved, and no product gap is recorded.**

Three entries are blocked or withdrawn; **their ask-classes are covered by the outcomes above**:

| entry | state |
|---|---|
| `unm.the_answer_speaks` | **blocked** — the Answer may not establish past causation |
| `unm.witness_scattered` | **blocked** — `incoherent` is outside the closed disposition enum |
| `unm.custody_severed` | **withdrawn** — entrustment is office-bound |

---

# 4. Coverage — corrected 32-state domain

```
VALID STATE CELLS : 32          live exclusions: 0
SELECTION DOMAIN  : 32 × 7 = 224 (state, ask) pairs

COVERED   : 224 / 224           (16 via authored adjacency fallback)
UNCOVERED : 0

SELECTION DETERMINACY
  (state, ask) pairs with more than one eligible outcome : 0
  Every covered pair resolves to EXACTLY ONE outcome under declared eligibility.
```

| category | result |
|---|---|
| **fully covered** | **224 / 224 pairs.** All seven ask-classes resolve in all 32 states. |
| **partial** | three outcomes are eligible in **16/32** states each — `dohkar_demand_unmade` (live Dohkar demand), `the_accusation_unmade` (live family accusation), `the_claim_unmade` (**no** family accusation). **None leaves a pair uncovered**: `stop` falls through to `undo`, and the two `escape` branches partition the domain exactly. |
| **intentionally unsupported** | **0 cells, 0 ask-classes** |

> **This result is final, not provisional.** The run asserts selection determinacy: **no pair has more than
> one eligible outcome**, so no selection falls to array order. The earlier 224/224 figure was produced with
> an array-order winner in 16 cells and was **not** a valid coverage result; this one is.

---

# 5. Decisions still required from you

**One, and it is an approval rather than a design question:** approve or amend the four traces in §2.

**No other user-facing decision is outstanding.** The `escape` tie is gone by construction, both gaps are
authored, and coverage is determinate.

---

# 6. Not done, deliberately

- **Ranking.** No rank is assigned to any outcome. The set has never been ranked as a whole at its corrected
  amplitudes, and ranking it piecemeal is how the last ladder went wrong. **It does not block approval** —
  rank is used only to choose among simultaneously eligible outcomes, and there are none.
- **Implementation.** Nothing is wired. Automatic extraction and outcome commitment remain disabled.
- **The late-Issue-1 phase matrix** — its own unit, unstarted.
