# Population-definition audit — "the assembly", First Sacrifice opening

> **Read-only audit.** No outcome is re-ranked or rewritten in this pass. No code, no calls, no push.

---

# 0. Decision recorded (Roman, 2026-09-28) — revisions may cease aftermath truths

**A literal, authored Tempt reality revision MAY cease declared `aftermathTruth` facts.** The planner's
routine "kept" rule is a planner rule; **it is not an immunity rule for Fate.**

**No generic one-fact limit. No default protected-fact list.** My proposed bound in
`_first_sacrifice_tempt_outcomes_v2.md` §4 — *"at most one aftermath truth per revision, and
`the_answer_institutional` off-limits to `undo`"* — is **withdrawn.**

**The safeguard is explicitness instead:**

> Every revision must declare the **complete closed set** of fact refs it ceases, **including any required
> causal companions**. Future canon derives from that appended revision; old records remain untouched.

### What "causal companions" obliges, concretely

This is a real authoring burden, not a formality, and **no drafted outcome currently satisfies it.**

`unm.time_gives_way` declares `ceases: ['interrogation_interrupted']`. But that aftermath truth ends:
*"**Only then did her choice** (run in shame or remain) **arise.**"* If the interrogation never occurred,
the choice it produced has no cause — so **whatever fact carries that choice is a required companion and must
be named in the same closed set**, or the revision leaves an effect standing without its cause.

**Every revision-creating outcome therefore needs a companion analysis before approval:**
`unm.time_gives_way`, `unm.proceeding_unmade`, `unm.custody_severed`, `unm.standing_dissolved`. Each currently
names one fact ref and has not been traced for dependents. **Recorded as owed work, not done in this pass.**

---

# 1. Does "the assembly" have a canonical roster definition?

## **No.** There is exactly one definition in the codebase, and it is a label.

`public/app.js:131306`:

```js
collectives: [{ id: 'the_assembly', label: 'the assembly' }],
```

That is the **only** occurrence of the identifier `the_assembly` anywhere in the source. It carries an id and
a display label. **It has no roster, no membership rule, and no size.**

Its authoring comment defines what the construct is *for*, and the definition is mechanical:

> *"COLLECTIVE SCENE PRESENCE — a structured, seed-authored counterpart to the free-text `presentGroups`…
> **Distinct from `roster`/`stage.participants` (individual, named cast) by design**: a collective may supply
> public pressure/reaction/context, but is **NEVER eligible to be `local_objective_actor`, never gets dialogue
> attribution, never gets a facet, never grounds a Character+/relationship event — it structurally cannot,
> since it is never added to roster or stage.participants**."*

**What that comment does and does not settle.** It establishes that the collective and the named cast are
disjoint **as identifiers**, and why. It does **not** by itself say whether Seren, Julian, the Dohkar or
Lirael stand fictionally *within* the crowd — a person can be in a crowd while their id is tracked
separately. So the mechanical definition alone cannot answer the question, and an authored definition is
required.

---

# 2. Every authoritative use, and what it shows

| line | text | reads the named four as |
|---|---|---|
| 130956 | *"the assembled First Favored themselves — **family and guests**, barefoot"* | — (defines the crowd's content) |
| 131083 | setting: *"roughly **two dozen** First Favored…"* | — (gives a size) |
| 131084 | `present:` *"SEREN, kneeling… A senior DOHKAR presiding… JULIAN at the edge of the gathering… **The assembled First Favored family and guests.**"* | **separate** — enumerated individually, then the crowd |
| 131259 / 131298 / 131517 / 131558 | `presentGroups: ['…assembly (**unnamed**, no dialogue)']` | **separate** — the group is defined as *unnamed* |
| 130989 | Julian: *"a peer **the assembly defers to** in his presence"* | **separate** — one does not defer to oneself |
| 131033 | Lirael: *"a person **the assembly has quietly placed beneath it**"* | **separate** — placed beneath a body is to be outside it |
| 131075 | *"Seren abandons the practiced wish **in front of** the whole assembly"* | **separate** — she faces it |
| 131080 | *"The presiding Dohkar… perceives the finer misalignment **sooner than the assembly**"* | **separate** — explicitly contrasted |
| 131253 | *"Seren names her offering aloud… and **the assembly settles**"* | **separate** — it is her audience |
| 131286 | *"Julian… has ALREADY questioned Lirael **before the assembly**"* | **separate** — in front of it |
| 131309 | `decision_axis:` *"claim the interference openly vs **let the assembly keep its assumption**"* | **separate** — and decisively so |
| 131425 | *"Lirael… **addresses the assembly**"*, target `"the assembly"` | **separate** — one addresses a body one is not in |
| 131490 | *"Seren's family… **step out of the assembly**"* | **separate** — stepping out is what membership makes possible |
| 131285 | *"the whole assembly turned to look at Lirael"* … *"**Every First Favored present** heard the loose note"* | **see §3 — this line is the key** |

**Thirteen uses read the named four as outside the assembly. None reads them as inside it.**

`131309` is the sharpest. The scene's declared decision axis is *claim the interference openly vs let the
assembly keep its assumption*. **The assembly holds an assumption Lirael knows to be false.** If Lirael were a
member, that axis is incoherent — a body cannot keep an assumption from someone who is part of it and knows
better. The whole scene's choice is built on the crowd being a separate knower.

---

# 3. The seed already distinguishes two populations, in one sentence

`twist_manifested` switches reach mid-sentence, and the switch is deliberate:

> *"the literal words were honoured (**the whole assembly turned to look at Lirael**) and the intent failed.
> **Every First Favored present** heard the loose note."*

**"The whole assembly turned to look at Lirael"** — she is the *object* of the turn, not part of what turned.
Then the sentence widens to **"every First Favored present"** to say who heard, because the hearing reached
people the turning did not describe.

So two populations already exist in the seed, unnamed as such:

| | reach |
|---|---|
| **the assembly** | the assembled First Favored family and guests — ~two dozen, unnamed, no dialogue, the audience |
| **everyone present** | the assembly **plus** Seren, Julian, the presiding Dohkar, and Lirael |

**This resolves the design question without weakening D1.** D1 says that where Lirael belongs to a named
population she takes the literal effect, with no invoker filter. That still holds exactly. The audit's finding
is about *which* population she belongs to: she is in **everyone present** and not in **the assembly**.

**And it un-collapses the two exact readings.** `_first_sacrifice_tempt_outcomes_v2.md` §2 recorded
`mem.exact.assembly_forgets_twist` and `mem.exact.all_present_forget_twist` as co-extensive in this scene. On
this evidence **they are not, and never were** — they reach the crowd and the room respectively, which is the
distinction the two scope forms were built to carry. *(Not corrected in this pass; recorded as owed.)*

---

# 4. Proposed authored definition — **REQUIRES EDITORIAL APPROVAL**

Proposed as authored canon. **Not an inference from who happens to be staged** — the staging evidence is what
motivates it, but the definition below is an editorial act and must be approved as one.

```
population.assembly
  id            : the_assembly
  label         : the assembly
  content       : the assembled First Favored family and guests
  approx size   : two dozen
  members       : UNNAMED. No named cast member is a member of this population.
  excluded      : pc:lirael, named:seren, named:julian,
                  role:first_sacrifice_presiding_dohkar  — each staged individually
  relation      : the assembly is the AUDIENCE and the PUBLIC of the rite. Named cast
                  address it, are judged by it, defer to it, or are placed beneath it.
  entry/exit    : a member may STEP OUT of the assembly and become an actor
                  (seed precedent: Seren's family, line 131490). Stepping out does
                  not add them to roster or stage.participants.

population.scene_present
  id            : scene_present
  label         : everyone present
  content       : population.assembly + every staged named participant
  members       : the_assembly, pc:lirael, named:seren, named:julian,
                  role:first_sacrifice_presiding_dohkar
  seed basis    : "Every First Favored present heard the loose note" (131285)
```

### What approval of this would change

| | |
|---|---|
| *"the assembly would forget the wish twisted"* | reaches **the crowd only** — Seren, Julian, the Dohkar and Lirael all still know |
| *"everyone here would forget"* | reaches **the room** — all four included, **Lirael included**, per D1 |
| every ✦ roster in the v2 draft | splits along that line rather than all resolving to the room |

**This partly restores the v1 reach for one entry — and for a completely different reason.** v1 exempted the
named four by an **unauthored invoker/protagonist rule**, which was the defect. This excludes them because
**they are not members of the population the player named**, which is a fact about the population, approved
explicitly. The first was privilege; the second is scope. **D1 is untouched:** there is still no invoker
filter anywhere, and any population that does contain Lirael reaches her.

---

# 5. Owed, and not done in this pass

1. **The companion analysis** for all four revision-creating outcomes (§0).
2. **Re-scoping the ✦ rosters** in `_first_sacrifice_tempt_outcomes_v2.md` once the definition is approved,
   and correcting the co-extension note in §2.
3. **Re-running coverage** after that re-scope.

**`mem.exact.assembly_forgets_twist` remains unapprovable until `population.assembly` is approved** — which is
exactly the constraint that prompted this audit.
