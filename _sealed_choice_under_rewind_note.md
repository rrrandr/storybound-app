# The sealed Scene-1 choice under a time revision — decision note

> **No option is chosen here. No outcome is ranked. No coverage rerun.** `unm.time_gives_way` remains
> unresolved pending this decision.

---

# 0. Approved and recorded (Roman, 2026-09-28)

### The demand atoms — APPROVED

`review.demanded_by_dohkar` (on stage, witnessed by `population.assembly`, false at scene start, true only if
the lane is played) and `review.demanded_by_julian` (offstage, true in the opening, unknown to Lirael, named
aloud at row 4). **No generic `review.demanded` exists.**

### The active-canon invalidation rule — ADDED

> **Eligibility reads active canon, never a fact's historical existence.**

1. **Every outcome may declare `requiresActive[]`** — the fact refs that must be governing for it to be
   selectable.
2. **`ceases[]` makes dependent exact readings ineligible** for as long as that revision governs active canon.
3. **A later precise wish whose target is no longer active routes through the declared no-exact-target /
   Fate-chosen path.** It must never pretend to erase or alter an absent fact.
4. **Historical RECORD stays fully available to the reader** — and **never** makes a ceased fact eligible.
   The reader remembering something is not the world still holding it.

**This is one rule covering two cases that looked separate.** `mem.exact.seren_forgets_price` is ineligible in
the opening because `price_identified` is **not yet** active; `mem.exact.julian_forgets_interrogation` becomes
ineligible after `unm.time_gives_way` because its target is **no longer** active. Not-yet and no-longer are
the same condition read at different times, and both route to Fate-chosen.

**Consequence, flagged and owed:** coverage acquires a third dimension. It is no longer states × ask-classes
but states × ask-classes × **active-canon configuration**, because a revision removes exact readings from the
selectable set. Not computed in this pass.

---

# 1. Correction — my resolution was not the neutral one I called it

I proposed establishing `interr.choice_arose_from_twist` and described it as canon staying coherent while the
player's choice survived, contrasting it with a cascade that would have deleted the choice silently.

**The contrast was fair; the framing was not.** Supplying a new cause for a sealed player choice is **a new
authored claim about why the protagonist acted.** It is not bookkeeping, and it does not become neutral by
preserving the action. It preserves the *action* and rewrites the *reason* — and the reason is the part that
says who she is.

It is option 1 below. It should be chosen on its merits or not at all.

---

# 2. The three options

Cross-cutting question underneath all three: **does a rewind return agency to the player, or inherit it on
their behalf?** Options 1 and 3 inherit. Option 2 returns.

---

## Option 1 — preserve the disposition, with an explicitly authored Fate-continuity reason

`interr.choice_arose` stands; `interr.choice_arose_from_twist` is established as its active cause;
`lirael.scene1_disposition` unchanged.

| | |
|---|---|
| **Lirael knows** | that she ran, or that she stayed — and **why she did it, wrongly.** She has no memory of the questioning, so her account of her own motive is the authored replacement. She is certain, and she is mistaken. |
| **The reader knows** | both causes. They watched the questioning drive the choice and now read canon asserting something else. **The reader holds a discrepancy the protagonist cannot.** |
| **Future canon may rely on** | the disposition **and** a stated cause. Any later scene may cite why she stayed. **The least constrained option downstream.** |

**What it costs:** a false self-understanding installed in the protagonist by the engine rather than by an
authored dramatic beat. Under D2 a rupture may reach interior states **when the literal authored grant names
them** — so this is permissible only if the outcome *names* it. As drafted it did not; it arrived as a
side-effect of keeping the books balanced, which is the objection.

---

## Option 2 — cease the active disposition and present a new player choice in the revised scene

`interr.choice_arose` ceases; `lirael.scene1_disposition` ceases; the revised ceremony reaches the same
juncture and the player chooses again.

| | |
|---|---|
| **Lirael knows** | nothing of the prior choice. The moment is live and undecided. |
| **The reader knows** | that they chose once already, and are being asked again. **The most legible rewind of the three** — it is what a rewind means colloquially. |
| **Future canon may rely on** | the **new** disposition, sealed to the revised scene's uid. The prior one is historical only, per the invalidation rule. |

**The open sub-question that decides whether this is powerful or hollow:** may the player choose
**differently**? If yes, a rewind genuinely returns agency and *"time gives way"* delivers the most player
power in the design. If the choice is constrained to its prior value, it is theatre and should not be offered.

**What it costs:** it takes a decision back. That reads either as the truest expression of a rewind or as the
engine undoing work the player already did — and which it reads as is a product judgement, not a mechanical
one. Mechanically it is clean: a new choice seals a new fact bound to a new `sceneUid`, exactly as the sealed
fact constraints already require, and the `originScopeKey` inheritance still prevents Tempt recursion.

---

## Option 3 — preserve the disposition, mark its original cause **historical only**, invent no active cause

`interr.choice_arose` is marked historical — readable in RECORD, not governing CANON. No replacement cause is
established. `lirael.scene1_disposition` unchanged and active.

| | |
|---|---|
| **Lirael knows** | that she ran, or that she stayed. **She does not know why, and no active fact says.** |
| **The reader knows** | the real reason — and that it no longer governs. **The reader holds the only causal account of the protagonist's own decision.** |
| **Future canon may rely on** | the disposition **only**. Any scene needing *why* hits an open fact and **must leave it open**. No author may supply a cause without a new authored grant. |

**What it costs:** a permanent authoring constraint — an effect with no active cause, which every downstream
author must respect rather than resolve. **What it buys:** it invents nothing. It is the only option fully
consistent with the no-inference rule, since it declares the cause historical instead of replacing it.

It is also, for what it's worth, the option that makes the rewind *feel* like one: she did something and
cannot say why, and only the reader can.

---

# 3. Summary

| | Lirael's knowledge | reader's position | downstream freedom |
|---|---|---|---|
| **1 — authored replacement cause** | acts, and is **wrong** about why | holds a discrepancy | **most** free |
| **2 — new choice** | nothing prior; decides afresh | asked again, knowingly | free, on new facts |
| **3 — cause historical only** | acts, and **cannot say** why | holds the only account | **most** constrained |

**Each is coherent. None is the safe default**, and option 1 is not made safe by being the one that changes
least on paper — it changes the most about who Lirael thinks she is.

---

# 4. Blocked on this decision

- `unm.time_gives_way` stays unresolved.
- No re-ranking of any outcome.
- The remaining nine v2 outcomes still need the same discipline.
- Coverage's third dimension (§0) is unaddressed.
