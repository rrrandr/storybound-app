# Decision note — repeated paid Tempt Fate use

Decision framing only. No code, no calls, no push, no recommendation. **The editorial build is stopped until this
is decided:** until then the claimed coverage gate is not sufficient.

## What the trace established

Production allows **repeated Tempt Fate invocation inside one accepted scene**, gated only by cost
(`invokeTemptFate`, `:256889` — no prior-invocation guard, no per-scene/turn/phase cap anywhere). A second
invocation overwrites the scalar `state.temptFateWish` while `_temptFateLedger` appends, and the code's own comment
at `:193401` confirms wishes can be sealed **while a generation is in flight**.

**Today's behaviour is not a fourth option — it is the defect.** Uncapped use with no repeat semantics is exactly
what produces an empty eligible set on the second vague Tempt in a scene.

## Two coupled requirements the packet has not designed

### Requirement A — serialization. Not a product choice; **every option needs it.**

- Selection must be **ordered by `invocationId`** and each selected consequence **persisted before authoring**.
- **Invocation N+1 must see the committed selection for N** — never the stale scalar `state.temptFateWish`, which
  the second invocation has already overwritten.
- In-flight overlap must resolve by commit order, not arrival order, because a generation can be mid-flight when
  the next wish seals.

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

---

## What this decision is actually about

The three options are not three implementations of one behaviour. They are three answers to a product question:
**what should a second paid Tempt Fate in the same scene feel like?**

- Option 1: *you get one per scene* — clearest to explain, least to author, takes something away.
- Option 2: *the scene has only so much give* — fair, diegetic, ends in a declared wall, adds a counter.
- Option 3: *pushing further goes deeper* — best fiction, integrates the existing counters, costs the most.

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
