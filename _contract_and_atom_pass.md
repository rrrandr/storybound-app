# Contract-and-atom pass — invoker field migration, collective-cost audit, lane split

> **Both candidates remain PROPOSED and BLOCKED.** No ranks, no coverage, no implementation.

---

# 1. `unm.the_turning_forgotten` — invoker field

## 1a. `invoker_anchor` is not written, and nothing is worked around

**Non-membership is not encoded as `invoker_anchor`.** Doing so would write the legacy default back into every
record the moment the design withdrew it — and it would make "exempt" mean two incompatible things: *spared
from a grant that reached her* and *never in the grant's scope at all.*

## 1b. Proposed compiler-contract migration

**Current** (`app.js:191251–191262`):

```
invokerExemption: { who, status: "exempt" | "targeted",
                    reason: "invoker_anchor" | "wish_explicitly_includes_self" | "ambiguous_wording_consequence",
                    note }
  — status "exempt"   requires reason invoker_anchor | ambiguous_wording_consequence
  — status "targeted" requires reason wish_explicitly_includes_self | ambiguous_wording_consequence + note
```

**Proposed** — two additions, no removals, **exemption never overloaded to mean scope**:

| addition | meaning | when written |
|---|---|---|
| **status `not_targeted_by_population`** | the invoker is **outside the declared target population by ordinary set membership**. Not spared — **never in scope.** | the sealed roster does not contain the invoker |
| **reason `population_membership`** (for status `targeted`) | the invoker is **inside** the declared population, and membership alone is the reason | the sealed roster contains the invoker, with no self-naming phrase |

### Why both, and not just the first

They are the two halves of the same rule. Without the second, a membership-based *targeting* would have to
borrow `ambiguous_wording_consequence` — asserting that Fate exploited an ambiguity when it merely expanded a
set. **The compiler rule says no extra self-naming phrase is required; the record must be able to say that.**

### Migration

- **Existing records are untouched** and keep their current meaning. This is additive.
- **The compiler never writes `invoker_anchor`.** That value becomes legacy-read-only — recognised when
  reading old records, never produced.
- **`exempt` is written only when an authored outcome explicitly grants an exemption**, which is the standing
  compiler rule.

### For this candidate

`population.assembly` excludes `pc:lirael`, so: **`status: not_targeted_by_population`**. She is not exempt.
She is not in the crowd. **The record now says which.**

---

## 1c. `suspicionFromResidue` on a collective — **audit result: schema-legal, and it stays**

**The schema explicitly contemplates collectives as entries** (`app.js:191238`):

> *"EVERY party on the page gets an entry: the love interest, every named character present, and **each
> declared collective** — silent ones included."*

And the validator requires both booleans for every non-`absent` entry, collectives included:

> `return typeof k.memoryAbsent === 'boolean' && typeof k.suspicionFromResidue === 'boolean';`

**So a collective must carry a `suspicionFromResidue` value, and `true` is a legal one.** The cost is not
removed.

### But the distinction the audit was for is real, and is now pinned

| permitted | forbidden |
|---|---|
| **one collective-level state** for `the_assembly` — the schema's own unit of account | **differentiated individual states** inside the crowd |

**This is exactly the line `incoherent` crossed and this cost does not.** `incoherent` required each unnamed
person to hold a *different* wrong version — individual mental content, never authored. `suspicionFromResidue`
is a single boolean on a single collective entry.

**Authoring constraint, recorded:** the prose may not render this as individuals each privately suspecting.
It is the crowd's collective unease, and 191238's companion rule binds here too — *"Memory may NOT be inferred
from gaze, silence, stillness, composure or presence."*

### One structural note, raised rather than buried

**This schema is a *report* contract** — it describes what an extractor read out of a delivered scene. This
design is using it as the **authoring** vocabulary. That is a deliberate and, I think, correct move: it means
an authored outcome is expressible in exactly the terms its delivery will be checked in.

**But it has never been declared**, and the two uses are not identical — a report field says *what happened*,
an authored field says *what must happen*. **Flagged for a decision; nothing in this pass depends on it.**

---

# 2. `unm.the_accusation_unmade` — lane split

## 2a. The seed supports two distinct events

**The lane's own detector separates them** (`app.js:131355`):

```
/\b(seren'?s family|her family|his family
   |publicly accuses?|formal(?:ly)? accus\w*                       ← accusation signals
   |demands? (?:remedy|restitution|compensation|redress)|blood[- ]price  ← remedy signals
  )\b/i
```

**Two signal families, not one.** And the authored `boundary` frame (`131490`) treats the remedy demand as its
own act: *"they step out of the assembly and **publicly demand remedy** for what the wish cost Seren,
redirecting the confrontation from Julian's accusation to **a new formal complaint**."*

**They are also independent in kind:** accusing attributes **fault**; demanding remedy claims a **debt**.
Either can occur without the other.

## 2b. The two declared atoms

| atom | kind | source phrase |
|---|---|---|
| **`accusation.family_accused`** | **event** | *"Seren's family (or another party with standing) **publicly accuses Lirael**"* |
| **`accusation.family_demanded_remedy`** | **event** | *"…**or demands remedy** for the twisted wish"* — restitution, compensation, redress, or blood-price |

## 2c. The rewrite ceases **exactly one**: `accusation.family_accused`

**Chosen, not left open.** *"Let me out of this"* asks to be out from under **a charge**, and the charge is the
attribution of fault. A remedy demand is a claim for payment — a different thing to be under.

### `ceases[]`
`accusation.family_accused`

### `establishes[]`
| fact | text |
|---|---|
| `accusation.family_never_accused` | *No public accusation of responsibility for the twisted wish was made against Lirael by Seren's family or by any party with standing.* |
| `survivingContradictions` | **empty** — permitted (191274); no memory is edited and nothing was set in motion by an accusation that did not occur |

### Conditional companion — **now tied to the chosen atom**

**`auth.julian_claims_convene_preside` is a companion only because `accusation.family_accused` is the ceased
atom.** The challenge frame reads *"reframes **the accusation**"* (131489), and I3 makes a challenge
presuppose a charge. **So: if a jurisdiction challenge is live, it must be named** — ceased, or declared
unchanged with a stated reason.

> **Had the remedy demand been chosen instead, this companion would not arise at all** — a challenge
> presupposes a charge, not a debt. The companion is a property of the choice, which is why the choice had to
> be made first.

## 2d. The limit this split exposes — and it improves the outcome

**`accusation.family_demanded_remedy` is explicitly UNCHANGED.**

If the family demanded remedy, **that demand still stands.** She can be free of the accusation and still owe
what was claimed. **No one says she did it, and they still want paying** — which is a sharper and more honest
outcome than the undifferentiated version, and it exists only because the lane was split.

Everything else from the prior draft's "what remains open" holds unchanged: no innocence, no immunity, no
mental state altered, Julian's demand untouched and row 4 still arriving.

---

# 3. `escape` before any accusation — **left uncovered**

**Not covered in this pass, by instruction and on the merits.** With `requiresActive:
accusation.family_accused`, a player who says *"let me out of this"* before anyone has accused her has no
answer.

**That is an honest uncovered subcase.** It stays uncovered until a separate source-backed outcome exists.
**No fallback is declared and no floor is invented.**

---

# 4. Status

| | |
|---|---|
| `unm.the_turning_forgotten` | **proposed, blocked.** Invoker field no longer overloaded — pending approval of the contract migration (§1b). Cost retained, schema-cited, and pinned to collective level. |
| `unm.the_accusation_unmade` | **proposed, blocked.** Lane split into two declared atoms; one chosen; companion conditional on the choice; the remedy demand explicitly survives. |
| `escape`, pre-accusation | **uncovered**, deliberately |
| new open item | the report-vs-authoring contract question (§1c), flagged |

**No ranks. No coverage. No implementation.**
