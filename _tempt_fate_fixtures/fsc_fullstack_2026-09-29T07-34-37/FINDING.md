# Full-stack run — HALTED BEFORE DISPATCH. $0.00 spent.

> Authorized, ceiling $0.25. **Nothing was dispatched**, because the payload that would have been
> sent does not contain the compiled consequence. Paying to test that would have measured nothing.

---

# What happened

**Phase 1 — harvest, zero spend.** The app was driven through real generation with **every `/api/`
call aborted**, so nothing left the machine. It attempted **25 provider calls**; all were aborted.

| | |
|---|---|
| compiled | `unm.the_turning_forgotten`, roster all five, `invokerScope: in_population`, aftermath beat present |
| payload integrity | **ok** — the block renders correctly |
| largest captured author body | **195,589 bytes** — the real production directive stack |
| **compiled consequence present in it** | **NO** |

**Phase 2 was not entered.**

---

# The finding

Grepping the captured production payload:

| marker | occurrences |
|---|---|
| `FATE SCENARIO WEAVE` | **0** |
| `AMPLITUDE (TEMPT)` | **0** |
| `PRESELECTED CONSEQUENCE` | **0** |
| `EFFECT BOUNDARY` | **0** |
| `AFTERMATH` | **0** |

**The entire Fate weave directive is missing from the assembled payload — not merely my block.**
`buildFateScenarioWeaveDirective()` produced nothing, so everything inside it, including the
compiled consequence, went with it.

---

# What I can and cannot conclude

**Cannot distinguish, from this evidence, between two explanations:**

1. **A production integration gap** — the compiled consequence rides inside a directive that only
   appears when the Fate *weave state* is active, and the compiler does not set that state.
2. **A harness seeding gap** — the real Tempt flow sets weave state (ledger entry, OAS budget init)
   that my harvest did not, so the directive correctly produced nothing for a scene with no active
   Fate scenario.

**I am not guessing which.** Both are plausible and they have different fixes.

---

# What IS established regardless

> **`_fscPayloadIntegrity` verifies that the block RENDERS. It does not verify that the block
> REACHES the assembled payload.**

Integrity returned `ok` for a generation whose author payload contained **no consequence at all**.
That is the same class of defect the fail-closed work just addressed, one layer further out: a
sealed consequence can be perfectly renderable and still never arrive in front of the model.

**This gap is real in production under either explanation above**, and it is the next thing to fix.

---

# Accounting

| | |
|---|---|
| dispatched | **0** |
| **spent** | **$0.00** of the $0.25 ceiling |
| app calls attempted during harvest | 25, **all aborted** |
| evidence | `captured_requests.json`, `largest_captured_body.json`, `prompt_block.txt` |

**No verdict against the pre-registered criteria is recorded**, because no scene was generated. The
previous minimal-prompt result stands as diagnostic evidence and is not superseded.

**Remaining authorization is intact** — the ceiling was never drawn against.
