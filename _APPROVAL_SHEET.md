# Approval sheet — First Sacrifice, Issue 1 opening

> **Editorial work complete. Nothing implemented. No provider calls.**

---

# 1. Approved outcomes

| outcome | ask | class | temporal operation | cost |
|---|---|---|---|---|
| `unm.the_turning_forgotten` | `unseen` | `memory_perception` | — *(memory channel)* | none |
| `unm.the_accusation_unmade` | `escape` | `history_rewrite` | `historical_replacement` | none |
| `unm.time_gives_way` | `undo` | `history_rewrite` | `historical_replacement` | **none — approved costless** |
| `unm.dohkar_demand_unmade` | `stop` | `history_rewrite` | `historical_replacement` | none |

**Plus five exact readings** — `assembly_forgets_twist`, `all_present_forget_twist`,
`institution_forgets_custody`, `julian_forgets_interrogation`, `dohkar_forgets_authority`.
*(`seren_forgets_price` is not an exact reading in this phase — the price has not been named.)*

# 2. Awaiting your approval — final traces, ready

| outcome | ask | class | temporal operation | cost |
|---|---|---|---|---|
| `unm.standing_dissolved` | `authority` | `identity_reputation` | `current_state_transition` | `escalation_invited` |
| `unm.the_shunning` | `solitude` | `relationship_social` | `additive_canon_change` | `undefended` |

# 3. Awaiting your approval — newly authored, closing the two gaps

| outcome | ask | class | carrier audited first | cost |
|---|---|---|---|---|
| `unm.the_claim_unmade` | `escape`, pre-accusation | `history_rewrite` | ceases the Dohkar's claim to rule on her conduct | none |
| `unm.the_custody_unremembered` | `silence` | `memory_perception` | makes the custody facts unrememberable; **facts still govern** | **`she_forgets_it_is_not_hers`** |

**Neither uses the Answer to establish past guilt, truth, or causation. Neither invents a capability.**

---

# 4. Intentionally unsupported

**None.** Both gaps had supported carriers and are drafted. **No product gap is recorded, and no ask is
unserved.**

Three entries are blocked or withdrawn, but **their ask-classes are covered** by the outcomes above:

| entry | state |
|---|---|
| `unm.the_answer_speaks` | **blocked** — the Answer may not establish past causation |
| `unm.witness_scattered` | **blocked** — `incoherent` is outside the closed disposition enum |
| `unm.custody_severed` | **withdrawn** — entrustment is office-bound |

---

# 5. Coverage — corrected 32-state domain

```
VALID STATE CELLS : 32        live exclusions: 0
SELECTION DOMAIN  : 32 × 7 = 224 (state, ask) pairs

COVERED   : 224 / 224     (16 via authored adjacency fallback)
UNCOVERED : 0
```

| category | result |
|---|---|
| **fully covered** | **224 / 224 pairs**; all seven ask-classes resolve in all 32 states |
| **partial** | two outcomes are eligible in **16/32** states — `unm.dohkar_demand_unmade` (needs a live Dohkar demand) and `unm.the_accusation_unmade` (needs a live family accusation). **Neither leaves a pair uncovered**: `stop` falls through to `undo`, and `escape` has `unm.the_claim_unmade` in the other 16. |
| **intentionally unsupported** | **0 cells, 0 ask-classes** |

---

# 6. The one user-facing decision still required

> ### Two `escape` outcomes are eligible in the same 16 states, and nothing chooses between them.

Where a family accusation is live, **both `unm.the_accusation_unmade` and `unm.the_claim_unmade` qualify.**
The coverage run picked one only by array order — **which is exactly the runtime tie the standing rule
forbids.**

They are genuinely different grants:

| | `unm.the_accusation_unmade` | `unm.the_claim_unmade` |
|---|---|---|
| ceases | the family's public accusation | the Dohkar's claim to rule on her conduct **+ the named venue + Julian's agreement** |
| leaves | **the remedy demand standing** — *no one says she did it, and they still want paying* | **the accusation standing** — *she is accused, and no one has claimed the right to judge it* |
| reach | one event | three atoms |

**This needs an authored answer before either ships**, and there are two honest shapes:

1. **Rank them** — a total order, decided now, as the standing rule requires.
2. **Gate `unm.the_claim_unmade` to `¬accusationMade`** — making it strictly the pre-accusation branch.
   Coverage stays 224/224; the two never compete.

**My recommendation: option 2.** It is what the outcome was authored for, it removes the tie by construction
rather than by adjudication, and it leaves ranking to a pass that ranks the whole set at once.

---

# 7. Not done, and deliberately

- **Ranking.** No rank is assigned to any outcome. The set has never been ranked as a whole at its corrected
  amplitudes, and doing it piecemeal is how the last ladder went wrong.
- **Implementation.** Nothing is wired. Automatic extraction and outcome commitment remain disabled.
- The **late-Issue-1 phase matrix** — its own unit, unstarted.
