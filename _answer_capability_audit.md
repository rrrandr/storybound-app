# `unm.the_answer_speaks` — source audit of the Answer's capability
## and the reclassification of `unm.testimony_closed`

> **Audit and reclassification only. No re-ranking, no coverage run, no implementation.**

---

# 1. `unm.testimony_closed` — reclassified as **precise-risk**, opt-in

**Not approved as the answer to ambiguous wording.** It permanently silences accusation *and* defense while
the evidence balance is explicitly unknown — so it cannot honestly be selected under the rule that ambiguous
Tempt wording resolves in the player's favor. **A bargain whose benefit depends on an unknown is not favor.**

| | |
|---|---|
| **class** | **precise-risk** — reachable **only** by wording that explicitly asks to **close, suppress, or bar testimony or proceedings** about the rite |
| **example wording** | *"Let no one be able to testify about the rite."* · *"Bar the proceeding from taking statements."* · *"Shut the inquiry's mouth."* |
| **never reachable from** | *"I want to disappear"*, or any other unanchored wording |
| **legible cost, stated at the point of choosing** | **it silences Lirael's defense as well as the accusation, and potentially indefinitely** — `endsWhen: inquiry_opened` is a condition, not a guarantee |

Everything specified in rev. 3 stands: the sealed roster, the named channel, the conditional end, the declared
interaction with a later delta, the empty `memoryEffects[]`. **Only its reachability changes.** This is the
precision policy working exactly as written — *precise wording buys control, not safety* — and this outcome is
now something a player can only walk into deliberately, having been told what it costs.

## 1a. The `unseen` ask-class is **UNCOVERED**

**Marked uncovered. No floor is invented to fill it.**

*"I want to disappear"* currently has **no authored answer** whose complete package is demonstrably
player-favorable from declared facts. The honest state is a gap, and a manufactured floor would be the
`unm.no_opening` mistake repeated — a disguised refusal, or worse, a bad bargain dressed as a grant.

**Consequence, stated:** coverage is now known-incomplete. **It is not recomputed in this pass**, and any
figure from the last run is stale.

---

# 2. The Answer — what the source actually says

My rev. 3 audit concluded the Answer's capability was **unsupported**. **That was wrong**, and the correction
matters more than the error: the capability is supported, and it still does not do what the outcome needs.

### 2a. The capability exists, and it is institutional

> **`app.js:16620`** — *"relic: **The Answer** … mechanic: **The Answer passively tests ALIGNMENT — whether the
> wisher's desire, intention, sacrifice and deepest self all point at one truth.** Only TRUE ANSWERS carry this
> intent-reactive enchantment and **may serve as the Witness or be used in an official rite.**"*

So: it **passively** tests (no examination required), it tests **the wisher's** alignment, and it **may serve
as the Witness** in an official rite. A First Sacrifice is an official rite, and `the_answer_institutional`
places the Answer in Lirael's hands at the scene. **There is a real institutional attestation role here**, and
rev. 3's flat "unsupported" was too strong.

### 2b. But it tests **the wisher**, and the wisher was Seren

The Answer reads **Seren's** desire, intention, sacrifice and deepest self. It has nothing to say about
**Lirael's conduct**, which is what the proceeding is about. *Was the wish misaligned?* — it can attest. *Did
Lirael interfere?* — a different question about a different person.

### 2c. And the seed forecloses the exculpation outright

> **`app.js:231513`** — *"a True Answer, **which cannot be lied to, will confirm a manufactured desire as
> genuine, because by then it IS genuine.** Alignment is not virtue; it only means the whole self points one
> way, including a self that has been carefully turned."*
>
> And the bracketed prevents-clause on the same line: *"**[prevents: … the assumption that the alignment-sense
> or The Answer can expose a manufactured desire — neither can.]**"*

**This is the seed pre-emptively forbidding exactly the inference the outcome is built on.**

If Lirael *had* shaped Seren's desire beforehand, the Answer would read it as genuine. So a reading that
*"places the misalignment in Seren's own intent"* is **consistent with Lirael's innocence and with her guilt
alike.** It cannot distinguish them, and the seed says so in a clause written to stop precisely this.

**And the accusation was never magical anyway:**

> **`app.js:130922`** — *"**NO touch transfers, bends, contaminates or redirects a wish.** The non-interference
> rule is **PROCEDURAL AND CULTURAL, not magical.**"*

Lirael could not have caused the twist by contact. What she is accused of is **procedural and cultural**
influence — coaching, shaping, manipulating a desire — which is the one thing the Answer explicitly cannot
detect.

---

# 3. Verdict — `unm.the_answer_speaks` is BLOCKED

**Its grant is unauthorable as written.** *"The Answer renders a reading that exculpates her"* asserts a
capability the seed names and then explicitly denies. This is the same category of invented capability as
rev. 2's forensic claim, and the invention sits in the outcome's core, not its prose.

**What the Answer could honestly put on the record**, if the outcome is re-authored:

- That the wish **was** misaligned, and in which axis — but *"every First Favored present heard the loose
  note"*, so this is **already known** and adds nothing.
- That Seren's desire **read as genuine** — which is true of a shaped desire too, and so is **not
  exculpatory**, and a well-informed Dohkar would say so.

**Neither is a "genuine way out", which is what rank 8 was paying for.** The outcome must be re-authored on a
capability the world actually has, or dropped.

### And the `escape` ask-class goes with it

*"Let me out of this"* had exactly one answer. **`escape` is now UNCOVERED too** — marked, not filled. No
replacement is proposed in this pass; proposing one is the next editorial unit, and it needs a mechanism
audited *before* it is written into an outcome rather than after.

---

# 4. The pattern worth naming

**Three outcomes have now failed the same way**, and it is not a coincidence:

| outcome | invented capability |
|---|---|
| `unm.witness_scattered` | a memory effect (`incoherent`) whose content was never authored |
| `unm.the_answer_speaks` | a forensic reading the seed explicitly forbids |
| `unm.testimony_closed` (rev. 2) | a balance of evidence the seed never states |

**Each was written by reasoning from the desired player experience back to a mechanism, and assuming the world
would supply one.** The seed is unusually well defended against that — it carries explicit prevents-clauses —
but only if it is consulted **before** the outcome is drafted.

**Proposed working rule, for the remaining set and the uncovered classes:**

> **Audit the mechanism first. An outcome may not assert a world capability until a seed citation for it has
> been produced — and the search must include the prevents-clauses, which is where this world keeps its
> refusals.**

---

# 5. Status

| | |
|---|---|
| `unm.testimony_closed` | **reclassified precise-risk**, opt-in, legible cost. Retained. |
| `unm.witness_scattered` | **blocked** (F3) and now **unreplaced** — its proposed replacement moved classes |
| `unm.the_answer_speaks` | **BLOCKED** — grant unauthorable |
| ask-class `unseen` | **UNCOVERED**, no floor invented |
| ask-class `escape` | **UNCOVERED**, no floor invented |
| coverage | **known-incomplete and stale.** Not recomputed. |

**Owed:** genuinely favorable authored answers for `unseen` and `escape`, each with its mechanism audited
first. **No ranking, no coverage run, no implementation.**
