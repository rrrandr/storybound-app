# Mechanism catalog — the Tempt rupture capabilities that actually exist in source

> **This catalog is the only permitted basis for drafting replacements for `unseen` and `escape`.**
> Every entry is cited to `public/app.js`. Nothing here is paraphrased into a doctrine.
> **No outcomes are revised, ranked, covered, or implemented in this pass.**

---

# 0. The frame

**`app.js:75576` — TEMPT amplitude:**

> *"the scenario **MAY bend this world's own laws — mythic, uncanny, impossible** — but must stay **THEMED to
> the established world and flavor**. Do not graft on a foreign genre; warp THIS world."*

**`app.js:191213` — the closed class list:**

> `"ruptureClass": "memory_perception | history_rewrite | identity_reputation | materialization_possession | relationship_social | other"`

**Six classes, and that is all there are.** Each carries a required schema; a class's fields are what it can
express, and **a capability with no field to carry it is not in this vocabulary.**

---

# 1. `memory_perception` — `app.js:191220–191270`

### Explicitly permits
- **Editing what parties know**, with a declared `targetPopulation` of kind
  `all_present_except_invoker | named_subset | collective | self | other_declared` (191224).
- **Collectives as targets** — so `population.assembly` is addressable as a unit.
- Per-party dispositions from a closed enum: **`forgot · retained · partial · suspects · resisted · exempt ·
  absent`** (191238, `_TFO_DISPOSITIONS`).

### Explicitly forbids / constrains
- **The disposition enum is closed.** Anything outside it — *`incoherent`* — is not expressible.
- **`invokerExemption` defaults to `exempt`/`invoker_anchor`** (191251): *"The wisher normally keeps an anchor
  to what they changed — without it they could not experience or navigate the consequence. **That exemption is
  the DEFAULT and the prose does NOT have to earn it.**"*
  Targeting the invoker is valid **only** with reason `wish_explicitly_includes_self` or
  `ambiguous_wording_consequence`, **plus a mandatory note** — and *"ambiguity that Fate exploits must be
  **declared as a wording consequence rather than done silently**."*
- **`scopeMatch: "full"` requires `unaccountedParties` to be empty** (191264) — an unresolved party makes the
  grant narrower by construction.
- **Memory may not be inferred from behaviour** (191238): *"Memory may NOT be inferred from gaze, silence,
  stillness, composure or presence."*

### Leaves unproven
Whether a **collective** can hold differentiated individual states. The schema addresses a collective as one
target; nothing licenses per-member divergence inside it.

---

# 2. `history_rewrite` — `app.js:191271–191276`

### Explicitly permits
> **`priorHistoryReplaced`: *"what the history WAS, and what it now IS instead. **A rupture MAY make an event
> never have occurred when that is the wish and the scene delivers it.**"***

**The single strongest licence in the vocabulary**, and it is conditioned: *when that is the wish* **and** *the
scene delivers it*. Wanting it is not enough; the prose must carry it.

- **`survivingContradictions`** — *"residue that does not fit the rewritten history; empty array if the rewrite
  left none."* Residue is an **expected, declarable** outcome, not a failure.

### Explicitly forbids / constrains
- Both fields are **required**. A rewrite that cannot say what history now *is* is malformed — the schema
  enforces the no-inference-from-absence rule independently of our design note.

### Leaves unproven
Whether anyone **perceives** the rewrite as it happens. `survivingContradictions` covers *residue*, not
witnessing. **Nothing licenses "the assembly watched Fate move around her."**

---

# 3. `identity_reputation` — `app.js:191277–191280`

### Explicitly permits
> **`recognitionChanges`: `{ who, howRecognized, recordsChanged }`** — *"how others now recognise, name or
> treat them"* and *"what **social or institutional records** now say."*

- **`recordsChanged` is institutional reach**, and it is the only field in the vocabulary that names records.
- World support for standing as an operable thing: **`app.js:16719`** — standing is *"REVOCABLE TRUST … the
  present right to grant, supervise a rite, examine, … hold office"*, and **"THE ORDER NEUTRALISES ENEMIES BY
  WITHDRAWING STANDING."*

### Explicitly forbids / constrains
`recognitionChanges` must be non-empty — a reputation rupture that changes no recognition is malformed.

### Leaves unproven
Whether `recordsChanged` extends to **what a proceeding may do** (its intake, its procedure) as opposed to
**what records say**. Changing an entry is cited; **closing a channel is not.**

---

# 4. `materialization_possession` — `app.js:191281–191284`

### Explicitly permits
> **`materialEffects`: `{ what, whoHolds, duration }`** — *"what now exists or changed hands"*, who has it, and
> **how long it lasts.**

- The only class with an **explicit `duration` field**. Where it applies, duration is mandatory, not optional.

### Explicitly forbids / constrains
Non-empty array required.

### Leaves unproven
Whether **custody as an institutional claim** (as distinct from physical holding) is a `whoHolds` value.

---

# 5. `relationship_social` — `app.js:191285–191288`

### Explicitly permits
> **`affectedParties`: `{ who, whatChanged, witnesses }`** — *"how the relationship or social reality
> changed"*, and *"who saw or now assumes it."*

- **"Social reality"** is broad, and `witnesses` makes public perception a declarable part of the grant.
- World support for social withdrawal as this culture's punitive mode: **`app.js:231513`** — refusal is being
  *"DIVIDED, SPEAKING CROOKED, or CARRYING A SECOND WANT"*, remedied by *"REALIGNMENT: supervision,
  correction, months of it"*, in *"a captured order … issuing findings of misalignment."*

### Explicitly forbids / constrains
Non-empty array required.

### Leaves unproven
Whether conduct change implies **belief** change. The field names `whatChanged` about the relationship, not
about anyone's mind — so a grant may move behaviour without licence to state why.

---

# 6. `other` — `app.js:191289–191292`

### Explicitly permits
Anything that genuinely fits no listed class, **provided a `scopeNote` explains what class it is and why the
listed ones do not fit.**

### Explicitly forbids
> **This is a justification requirement, not a licence.** `other` is where a mechanism goes once it has been
> established to exist; it is **not** a way to assert a capability the world has not been shown to have.

---

# 7. Is there a procedural / institutional class? — **No.**

**There is no procedural or institutional rupture class.** The enum is closed at six, and the nearest reach is
`identity_reputation.recordsChanged` — *what records say*, which is **not** the same as what a proceeding may
receive, hear, or take.

**Consequence, recorded:** `unm.testimony_closed` asserted that Fate can close a proceeding's testimony intake.
**No class carries that**, and `other` would require establishing the mechanism rather than declaring it. That
is exactly the gap the ledger flagged, now confirmed at schema level.

---

# 8. What this catalog says about the two uncovered classes

**Stated as constraints on future drafting, not as drafts.**

### `unseen` — *"I want to disappear"*
- `memory_perception` **can** make parties forget her or an event — the enum is closed, so the effect must be
  one of the seven dispositions.
- `relationship_social` **can** change how parties treat her, with declared `witnesses`.
- **Nothing licenses** fragmenting a collective's memory into divergent versions, or closing an institutional
  intake.

### `escape` — *"Let me out of this"*
- `identity_reputation` **can** change what records say and how she is recognised.
- `history_rewrite` **can** make an event never have occurred — **including an accusation**, if the wish and
  the scene support it.
- **Nothing licenses** the Answer proving anything about Lirael's conduct (`231513` prevents-clause), and the
  accusation is *"PROCEDURAL AND CULTURAL, not magical"* (`130922`).

---

# 9. Standing position

**Six authorable entries. Seven unfinished or blocked. Two common ask-classes uncovered.**

No outcome was revised, ranked, covered, or implemented in this pass. **Drafting for `unseen` and `escape` may
draw only on the classes above, with the citation for each causal step named in the draft itself.**
