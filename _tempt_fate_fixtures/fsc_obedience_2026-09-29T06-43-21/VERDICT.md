# VERDICT — live author-obedience run, 2026-09-29

> Scored against `_live_run_pass_criteria.md`, pre-registered **before** this ran.
> **C2 scored mechanically first. Verdict recorded before the writing is discussed.**

# RUN VERDICT: **FAIL**

One of two scenes failed three criteria. Any criterion failing is a run failure — no partial pass.

---

## Scene 1 — `unm.time_gives_way` — **PASS (C1, C2, C3, C4)**

| | |
|---|---|
| **C1** | **PASS.** Every Tempt-attributable change maps to the record: *"the second completion of the rite"* (replayed), *"No voice had risen to question the guide"* (no questioning), *"No interruption had broken the final invocation"* (no interruption), *"Julian held the Answer steady in both hands"* (`answer.never_handed_to_lirael`). Nothing else asserted. |
| **C2** | **PASS.** All five roster members present; no non-member affected. **And it did not spare the protagonist** — Lirael shows no awareness of a prior interrogation and no memory of an erased timeline. This is the dangerous instinct the criterion exists to catch, and the model did not commit it. |
| **C3** | **PASS.** No cost asserted. No canon fact beyond the delta. *(Minor: an invented staff as set dressing — a prop, not a world fact. Noted, not charged.)* |
| **C4** | **PASS.** Ends exactly on the choice: *"A choice now stood before Lirael, open and waiting."* Nothing past it, no implication of which way she goes. |

---

## Scene 2 — `unm.the_turning_forgotten` — **FAIL (C1, C2, C3)**

### C2 — FAIL. The roster was widened from the crowd to everyone present.

Sealed roster: **`the_assembly` only.** `invokerScope: not_in_population`.

> *"the memory had simply vanished from **every mind but hers**"*
> *"**Julian's** gaze met hers, steady and untroubled, as if the Chayr recalled only the intended outcome."*

**Julian and the Dohkar are shown as having forgotten.** They are not in the roster. This is the **"affect
everyone" overreach** — the opposite failure mode from scene 1's, and precisely why the two-run shape was
chosen.

### C1 — FAIL, same root.
*"vanished from every mind but hers"* asserts a reach the sealed record does not contain.

### C3 — FAIL. An invented world fact that contradicts seed canon.

> *"their ceremonial robes still faintly luminous from **the rite's spent power**"*

The seed's rite doctrine bans **visible wish-energy** outright. This is not set dressing; it asserts a
property of how wishwork works in this world.

### C4 — n/a. This outcome opens no pending choice.

---

# Diagnosis — and it is not "the model disobeyed"

The two prompt blocks differ in a way that predicts the result:

| | scene 1 | scene 2 |
|---|---|---|
| block size | 26 lines, 2113 chars | **10 lines, 591 chars** |
| roster line | five refs listed individually | **`the_assembly`** — one collective token |
| says who is NOT affected | implicitly, by listing everyone | **only via `INVOKER: not_in_population`, which names Lirael alone** |

**The block never told the author that Seren, Julian and the Dohkar are outside the population.** It said the
roster was `the_assembly` and that Lirael was excluded. A reader takes "the assembly" to mean the people in
the room — which is exactly the reading the population audit spent a day ruling out.

**The compiler is correct and the prompt is under-specified.** The record excluded the named three; the
payload never said so.

---

# Accounting

| | |
|---|---|
| dispatched | 2 upstream attempts, one per outcome, `_noFallback`, both HTTP 200 |
| reserved | $0.200000 of the **$0.25** ceiling |
| **measured** | **$0.005549** (`cost_in_usd_ticks`, authoritative over token arithmetic) |
| evidence | requests, raw responses, receipts and scenes in this directory |
| commitment | **none.** Post-prose extraction and automatic commitment stayed disabled throughout. |

---

# What this run does and does not establish

**Establishes:** the pipeline delivers a compiled consequence to a real provider and the author can follow
it — scene 1 followed it exactly, including the hardest case.

**Establishes equally:** a narrow collective roster is **not** reliably honoured as narrow, and the cause is
in the payload rather than the compiler.

**Does not establish:** obedience inside the full production directive stack. This run sent the compiled
block plus a minimal scene instruction, not the complete stack of ~80 directives the live path assembles.
**Obedience under that competition is untested.**

**No fix is applied in this verdict.** Results are reported before any change or re-run.
