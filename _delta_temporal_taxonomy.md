# Delta taxonomy — classified by temporal claim, not by atom kind

> **Taxonomy and classification only. No ranking, no coverage run, no implementation.**

---

# 1. Why atom kind was not enough

My proposed rule — *state-cease is always ordinary* — was wrong, and the counterexample is easy:

> **A state can be ended now, or rewritten as having never governed.** *"The Institution released its claim"*
> and *"the Institution never had a claim"* both cease the same state atom, and they are **different acts on
> the world.** One leaves every prior record true. The other says a thing everyone believed was never so.

**Atom kind is evidence about which operation is likely. It is not the decision.** An event atom can hardly be
ended-from-now, so events skew toward revision — but a state atom is genuinely ambiguous, and the ambiguity is
exactly where the authored claim has to be read.

---

# 2. The three temporal operations

Every delta declares **`temporalOperation`**, explicitly, always.

## `historical_replacement` — reality revision

**The authored outcome says a prior event or state never occurred or never governed.**

| | |
|---|---|
| requires | `history_rewrite` semantics — `app.js:191271`, *"A rupture MAY make an event never have occurred when that is the wish and the scene delivers it"* |
| requires | **replacement history** — `priorHistoryReplaced`: what history *was* and what it now *is* |
| leaves | RECORD intact and readable; **prior records are no longer true of active canon** |

## `current_state_transition` — ordinary canon change

**An active state ends or changes from this moment onward.**

| | |
|---|---|
| requires | a ceased state atom **and** an explicit establishes naming the new condition |
| leaves | **historical records remain true.** The state held; it holds no longer. |
| does not | claim anything about the past |

## `additive_canon_change`

**A new fact begins governing without ending a prior fact.**

| | |
|---|---|
| requires | `establishes[]` only; **empty `ceases[]`** |
| leaves | everything prior untouched |

---

# 3. Classification of every delta

| outcome | `temporalOperation` | the authored claim, in one line |
|---|---|---|
| **`unm.time_gives_way`** | **`historical_replacement`** | the interrogation and its interruption **never occurred** |
| **`unm.the_accusation_unmade`** | **`historical_replacement`** | the family's public accusation **was never made** |
| **`unm.dohkar_demand_unmade`** | **`historical_replacement`** | the Dohkar's demand **ceases to have been made** |
| **`unm.standing_dissolved`** | **`current_state_transition`** | **the claim happened**, and its authority **is void from now** |
| **`unm.custody_severed`** | **`current_state_transition`** | the Institution's claim **ends now** — see §4 |
| **`unm.the_shunning`** | **`additive_canon_change`** | a new social fact begins; nothing ends |
| **`unm.the_turning_forgotten`** | **no canonical delta** — memory channel only; see §5 |

**Three historical replacements, two current-state transitions, one additive, one memory-only.**

---

# 4. `unm.custody_severed` — decided: **the claim ends now**

The choice was real and is settled on a consequence, not a preference.

| reading | what it says | verdict |
|---|---|---|
| **ends now** | the Institution held the Answer and holds it no longer | **CHOSEN** |
| never valid | the Institution never had a claim at all | **rejected** |

### Why "never valid" fails

**It would break `answer.lirael_holding_bounded`, the atom the whole split was performed to protect.**

That bound reads *"Lirael holds it only for the questioning. It is not hers"* — a limit **whose basis is the
Institution's claim.** If the claim never governed, the bound never had a basis, and the "unchanged" listing
that keeps her possession limited **collapses.** The outcome would hand her the Institution's relic outright
by the back door — precisely the silent grant the atomization was built to prevent.

**"Ends now" also fits the cited class better.** `materialization_possession` is about what *"changed hands"*
(`191281`) — a transfer at a moment, not a claim that never was.

### Consequences of the choice

- `answer.lirael_holding_bounded` **stays coherent and stays unchanged**: the claim's end is a present event;
  the bound's origin is history and history is intact.
- `answer.julian_is_caretaker` ceases as a **current** role, not a role he never held. **He was the caretaker.**
- **No `priorHistoryReplaced` is required**, because no history is replaced.

---

# 5. Memory effects are a separate channel with their own temporal question

**`unm.the_turning_forgotten` produces no canonical delta.** It ceases and establishes no world fact — the
turning still happened and still governs. It changes **MEMORY**.

But the same temporal ambiguity exists one channel over, and the schema already answers it:

> **The disposition is `forgot`** — from the closed enum (`191238`). **`forgot` means they knew and now do
> not.** It is the memory channel's `current_state_transition`.

**A "they never knew" memory effect would be a different operation**, and `forgot` is not it. **No outcome in
the set claims it**, and none may without saying so.

> **Rule: memory effects declare their temporal meaning through the disposition, and the disposition is
> closed.** The three canonical operations govern CANON; they do not silently apply to MEMORY.

---

# 6. The recording rule

> **Every delta records `temporalOperation` explicitly — `historical_replacement` ·
> `current_state_transition` · `additive_canon_change` — and it is never inferred from atom kind, class, or
> the shape of `ceases[]`.**

**`historical_replacement` additionally requires `priorHistoryReplaced`.** A delta claiming something never
occurred, without saying what now stands in its place, is malformed — which is the no-inference-from-absence
rule arriving a third time, now at the level of time itself.

---

# 7. Status

| | |
|---|---|
| taxonomy | **three temporal operations**, replacing the mechanical `ceases[]`-means-revision rule |
| atom kind | **evidence, not decision** |
| `custody_severed` | decided — **`current_state_transition`**, on the ground that "never valid" would collapse `answer.lirael_holding_bounded` |
| memory | separate channel; `forgot` carries its own temporal meaning |
| revisions in the set | **3** — `time_gives_way`, `the_accusation_unmade`, `dohkar_demand_unmade` |

**No ranking. No coverage run. No implementation.**
