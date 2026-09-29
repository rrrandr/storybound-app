# Approval sheet — First Sacrifice, Issue 1 opening

> **Editorial work complete and approved. Nothing implemented. No provider calls.**

---

# 1. Approved outcomes — all eight

| outcome | ask | class | temporal operation | cost |
|---|---|---|---|---|
| `unm.dohkar_demand_unmade` | `stop` | `history_rewrite` | `historical_replacement` | none |
| `unm.time_gives_way` | `undo` | `history_rewrite` | `historical_replacement` | **none — costless by decision** |
| `unm.the_accusation_unmade` | `escape`, accusation active | `history_rewrite` | `historical_replacement` | none |
| `unm.the_claim_unmade` | `escape`, **pre-accusation** | `history_rewrite` | `historical_replacement` | **none — costless by decision** |
| `unm.the_turning_forgotten` | `unseen` | `memory_perception` | — *(memory channel)* | none |
| `unm.the_custody_unremembered` | `silence` | `memory_perception` | — *(memory channel)* | `she_forgets_whose_it_is` |
| `unm.standing_dissolved` | `authority` | `identity_reputation` | `current_state_transition` | `escalation_invited` |
| `unm.the_shunning` | `solitude` | `relationship_social` | `additive_canon_change` | `undefended` |

**Plus five exact readings** — `assembly_forgets_twist`, `all_present_forget_twist`,
`institution_forgets_custody`, `julian_forgets_interrogation`, `dohkar_forgets_authority`.
*(`seren_forgets_price` is not an exact reading in this phase — the price has not been named.)*

> **On costless grants.** `unm.the_claim_unmade` erases three atoms for nothing, and that is **approved as
> correct**: Tempt Fate does not need an artificial price merely because the grant is large. **Its surviving
> pressure is explicit** — Julian's independent demand still brings row 4's notice and investigation, and the
> panel still constitutes itself at row 14.

---

# 2. Precision repairs applied at approval

**None changed eligibility, rank, temporal operation, target atoms, cost, duration, or coverage.**

| # | outcome | repair |
|---|---|---|
| 1 | `unm.the_shunning` | The established fact named "everyone present". It now names an **explicit sealed withdrawing roster** — `the_assembly`, `named:seren`, `named:julian`, `role:first_sacrifice_presiding_dohkar` — with **`pc:lirael` excluded as the OBJECT of the withdrawal.** No one withdraws from themselves. **Structural role logic, not an invoker exemption**, and no precedent for removing a party from a population they belong to. |
| 2 | `unm.the_claim_unmade` | The stale `unchanged[]` row generically implied the family accusation could coexist with this outcome. It now names **`accusation.family_demanded_remedy`** — a separate atom that can be active without an accusation — and records that **`accusation.family_accused` cannot arise here**, since `requiresInactive` makes the outcome ineligible whenever it is active. The `open[]` item *"what Julian makes of an agreement he never gave"* is replaced by the forward-looking **"whether Julian later makes a claim or an agreement of his own."** |
| 3 | `unm.the_custody_unremembered` | Its *Therefore* said *"the question of why simply does not arise"*, which §5b-iii contradicts. Corrected: the outcome makes **whose the Answer is** unrememberable; **the question *why did he hand it over* is untouched and remains askable.** The silence covers ownership and entrustment, and nothing else. *(The line had also been lost in an earlier splice; it is restored in its corrected form.)* |

---

# 3. Intentionally unsupported

**None. No ask is unserved, and no product gap is recorded.**

Three entries are blocked or withdrawn; **their ask-classes are covered by the approved outcomes**:

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

> **Final, not provisional.** The run asserts determinacy — no pair has more than one eligible outcome, so no
> selection falls to array order. Re-run after the three repairs: unchanged.

---

# 5. Decisions required

**None.** All eight outcomes are approved editorial canon. Both gaps are authored, the `escape` branches
partition by construction, and coverage is determinate.

---

# 6. Not done, deliberately

- **Ranking.** No rank is assigned. **It does not block anything** — rank is used only to choose among
  simultaneously eligible outcomes, and there are none.
- **Implementation.** Nothing is wired. Automatic extraction and outcome commitment remain disabled.
- **The late-Issue-1 phase matrix** — its own unit, unstarted.
