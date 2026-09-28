# Decision note — repeated paid Tempt Fate use

Decision framing only. No code, no calls, no push, no recommendation. **The editorial build is stopped until this
is decided:** until then the claimed coverage gate is not sufficient.

**Revision 2 (2026-09-28).** Two corrections. Ordering is **seal order**, not commit-completion order — revision 1
said "commit order", which would let latency decide canon (Requirement A). And **Option 3 needs a terminal rule**:
an axis with a ceiling exhausts, so it cannot honestly promise "never not here" (3t).

## What the trace established

Production allows **repeated Tempt Fate invocation inside one accepted scene**, gated only by cost
(`invokeTemptFate`, `:256889` — no prior-invocation guard, no per-scene/turn/phase cap anywhere). A second
invocation overwrites the scalar `state.temptFateWish` while `_temptFateLedger` appends, and the code's own comment
at `:193401` confirms wishes can be sealed **while a generation is in flight**.

**Today's behaviour is not a fourth option — it is the defect.** Uncapped use with no repeat semantics is exactly
what produces an empty eligible set on the second vague Tempt in a scene.

## Two coupled requirements the packet has not designed

### Requirement A — serialization by SEAL ORDER. Not a product choice; **every option needs it.**

**Revision 1 said "commit order". That is withdrawn:** if ordering were decided by which asynchronous operation
finishes first, **latency would decide canon** — the same wish, sealed in the same state, would resolve differently
depending on network timing. That is precisely the class of defect this compiler exists to remove.

> **Ordering is SEAL ORDER: a monotonic `invocationId` / sequence assigned SYNCHRONOUSLY at the moment the
> invocation is accepted. Selection and persistence execute in that order. Never completion order, never arrival
> order, never whichever promise resolves first.**

- **The mechanism already exists.** `_recordTemptFateEvent` (`:193401`) assigns a monotonic `_temptFateLedgerSeq`
  and a stable per-proposal id at seal time, precisely so "a caller mid-generation can carry a reference to THIS
  exact proposal forward". What is missing is not the sequence — it is that **selection and persistence are not
  ordered by it**.
- **Invocation N+1 must see the persisted selection for N**, never the scalar `state.temptFateWish`, which N+1 has
  already overwritten.
- A generation still in flight for seal 1 does not entitle seal 2 to resolve first. **Seal 2 waits for seal 1's
  selection to persist**, because seal 2's eligibility may depend on what seal 1 consumed.

This is prerequisite work under all three options below and should not be weighed as a differentiator.

This is prerequisite work under all three options below and should not be weighed as a differentiator.

### Requirement B — what "reusable" means. **This is the product choice.**

A reusable outcome **cannot repeatedly establish the same durable fact**: that is either a no-op or a
contradiction, and asserting it twice is worse than either. So "reusable" needs four things declared — a
**per-invocation effect**, an **instance identity**, a **consumption behaviour**, and an **interaction rule with
previously selected outcomes**. None of those exist yet. The three options differ in whether they supply them,
avoid needing them, or price them.

---

## Option 1 — a mechanical per-scene cap or cooldown

One Tempt per accepted scene (or one per *n* turns), enforced at the invocation entry, **before payment**.

| | |
|---|---|
| **Player-favorable ambiguity rule** | **Fully preserved, and simplified.** Each Tempt is a single selection in its own cell; ambiguity always takes max rank among eligible. Requirement B disappears entirely — no repeat semantics are needed, and the coverage obligation reverts to "≥1 eligible outcome per valid cell", which the drafted opening set nearly satisfies. |
| **In-flight overlap** | **Eliminated at the source.** A refused second invocation seals nothing: no second ledger entry, no scalar overwrite, no ordering question. Requirement A shrinks to bookkeeping. |
| **Resonance / saturation / volatility** | Meanings unchanged, but **escalation slows**: `consecutive_tempt_fate_count` can now rise only once per scene, so "escalating strangeness under repeated tempting" takes proportionally longer to reach. That is a felt pacing change, not a neutral one. |
| **What it costs** | **The only option that removes something the player can do today.** Someone holding charges cannot spend them in the moment they want to, which is both a UX regression and a plausible revenue one — repeat paid use in a hot moment is currently available. A cooldown softens this without removing it. |

## Option 2 — uncapped use, finite scene-local Fortune stock

The scene declares a finite stock of Fate responses (*n* slots). Each Tempt consumes one deterministically. When
the stock is exhausted, further invocation is **declined before payment**, diegetically — Fate has nothing further
to give *here*.

| | |
|---|---|
| **Player-favorable ambiguity rule** | **Preserved.** Each of the *n* selections is max-rank among eligible; the stock limits *how many* selections happen, never *which*. |
| **In-flight overlap** | **Handled, but only by Requirement A.** The stock must decrement atomically at seal and be part of the state fingerprint, or two in-flight invocations both read stock = *n* and one selection is lost. This is the option where A is most obviously load-bearing rather than merely correct. |
| **Resonance / saturation / volatility** | **Adds a fourth counter** beside three that already mean "how hard has the player pushed". Conceptually redundant unless the stock is *derived* from one of them — and deriving it makes it a cooldown with extra steps, which is Option 1. |
| **What it costs** | **Authoring multiplies by stock size**: *n* distinct eligible outcomes per valid cell rather than one. It is honest about pre-payment refusal, which is the fairest failure mode of the three, and it still ends in a wall — just a declared one. |

## Option 3 — uncapped use with a genuinely repeatable consequence grammar

Repeat is designed rather than limited. An outcome declares an **axis** along which further invocations move, with
a **declared ceiling**:

- **accumulate** — the same *kind* of fact, a further *instance*: the deferred review is deferred again. Quantitative,
  so it neither repeats nor contradicts.
- **extend** — the same fact, a wider *population*: the assembly forgets, then the Dohkar also forgets. Each
  invocation names a **different party**, so no fact is asserted twice.
- **exclusive** — once only. Most existing entries are this, and they stay this.

"Reusable" then has a precise meaning: **an outcome is reusable iff it declares an accumulate or extend axis with a
ceiling, and each invocation consumes one step.** Each step is an instance with its own id bound to its
`invocationId`.

| | |
|---|---|
| **Player-favorable ambiguity rule** | **Preserved, with one new authoring burden.** "Most favorable eligible" must now compare *a step on an axis* against *a fresh outcome*, so whole-package ranking has to price steps explicitly. Cheap to state, easy to get subtly wrong. |
| **In-flight overlap** | **Hardest of the three.** Two in-flight invocations both extending the same axis must serialize or both take step 1 and one is silently lost. Requirement A is not merely required here, it is the mechanism. |
| **Resonance / saturation / volatility** | **The only option that integrates with them rather than sitting beside them.** An accumulation ceiling is the same shape as volatility escalation, so the existing counters can *gate the ceilings* — no fourth counter, and repeated tempting visibly getting stranger becomes the same mechanism as repeated tempting getting deeper. |
| **What it costs** | **Highest authoring cost by a clear margin**: every reusable outcome needs an axis, a ceiling, per-step effects and step ranking. It is also the only option that makes a second paid Tempt feel like a *different* thing rather than a smaller one. |
| **Terminal behaviour** | **It has one, and revision 1 implied it did not** — see 3t. A ceiling exhausts, and at that point Option 3 faces the same terminal choice as Options 1 and 2. |

### 3t. Option 3's terminal rule — a ceiling exhausts

**Correction.** Revision 1 described Option 3 as the option that "never says *not here*". That was wrong: an axis
with a ceiling **reaches its ceiling**. A review can only be deferred so many times before the deferral is the
story; a population can only be extended until it contains everyone present. Once **every eligible axis is
exhausted**, Option 3 is in the same position as Options 1 and 2 — it does not escape the terminal question, it
**postpones** it.

At exhaustion, exactly three behaviours are permitted:

| permitted | meaning |
|---|---|
| **select another eligible authored outcome** | an `exclusive` entry still unspent, or a different axis not yet at its ceiling |
| **decline before payment** | the honest wall, identical to Option 2's, just reached later |
| **an explicitly authored, genuinely favorable NON-DURABLE result** | a concrete favorable immediate change with `durableDeltas: []` — a stance softening for this scene, a reprieve visible now that establishes no lasting fact |

**And three that are forbidden:**

- **silently replaying a spent fact** — the no-op-or-contradiction this requirement exists to prevent;
- **inventing a result** — the compiler's founding prohibition;
- **describing exhaustion as "no limit"** — which is what revision 1 did, and why this section exists.

**On the third permitted behaviour, carefully.** It is *not* the withdrawn `unm.no_opening` floor returning. That
floor had an **empty affected set** and named no harm avoided; it was a refusal in gentler language. A permitted
non-durable result must declare a **concrete immediate favorable change** — something a reader can see happen in
this scene — and be **authored per cell** rather than existing as a universal fallback. The distinction is the one
Roman drew in rejecting the floor: only a real Tempt outcome if the avoided harm is an explicitly declared, imminent
story condition and the record establishes that avoidance as a concrete favorable delta. A non-durable favorable
result can meet that test; a shrug cannot.


---

## What this decision is actually about

The three options are not three implementations of one behaviour. They are three answers to a product question:
**what should a second paid Tempt Fate in the same scene feel like?**

**In its honest form, stripped of mechanism, the choice is between three player experiences:**

1. **Limit repeat use early.** *You get one per scene.* Clearest to explain, least to author, and it takes away
   something players can do today.
2. **Offer a finite, disclosed pool.** *This scene has only so much give, and you can see how much.* Fair, diegetic,
   declines before payment, and adds a fourth counter unless derived from an existing one.
3. **Support authored escalating repeats until the authored outcomes are exhausted, then decline before payment.**
   *Pushing further goes deeper — until it doesn't.* Best fiction, integrates the existing counters, costs the most
   to author, and **still ends at a wall** (3t) — it buys depth before the wall, not the absence of one.

**All three end in a limit.** They differ in *when* the player meets it, *whether they could see it coming*, and
*how much story happens first.* That is the decision, and it is a product one.

**Not to be chosen by convenience**, and I am not choosing. What would decide it, in order of how much it settles:

1. **Is repeat paid use in one scene a revenue path that exists today?** If yes, Option 1 is a regression with a
   price attached and the choice is really between 2 and 3.
2. **Should the player ever be told "not here"?** Options 1 and 2 both say it, at different moments. Option 3 never
   does, which is either better fiction or an unbounded escalation problem depending on the ceilings.
3. **How many Tempts does a real player actually buy in one scene?** If the honest answer is "almost never more
   than one", Option 1 costs nothing real and Option 3 is a large authored answer to a rare event.

## Until then

**The coverage gate is not sufficient**, and the packet records why: the drafted opening set satisfies the corrected
reusability rule for **zero** cells, so a second vague Tempt in one scene reaches an empty eligible set. That is not
fixable by authoring one more entry, because what a reusable entry *means* is undecided — which is the point of this
note.

Editorial authoring of the phase matrices and outcome sets should not start until this is settled, because Option 3
changes what every reusable entry has to declare, and Option 1 removes the requirement altogether.
