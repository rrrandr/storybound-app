# Authoring feasibility packet — Stage 3 against real First Sacrifice material

Dry content audit. No provider calls, no product code, no push. **Not a prototype and not a model test.**
Its only purpose: decide whether Stage 3 deserves implementation, and what a minimum viable first story needs.

**Revision 2 (2026-09-27).** Two corrections and one addition from Roman:

1. **"Vary `responseStance` by responding party at zero authoring cost" is WITHDRAWN.** It reintroduced an
   undeclared inference channel: a Dohkar hardening and Julian withdrawing are **different story facts**, not one
   reading rendered twice. They may be compact — **authored, party-specific stance profiles referenced by
   outcomes** — but the planner may **never derive a stance from cast identity**. §6a.
2. **The unmoored Tempt set is authored here** (§7), with **state-based eligibility**, because without it every
   vague wish selects the same top-ranked outcome forever.
3. **One new boundary** (§7c): an unmoored outcome may not act on an unrelated proposition merely because it is
   favorable.

**Revision 3 (2026-09-27).** Two more corrections, and the second one changes a conclusion:

4. **`playerFavorRank` ranks the COMPLETE authored package**, not the headline grant — §7e. My own ranking is
   re-examined against that rule.
> **EDITORIAL BUILD RESUMED (2026-09-28) — the product decision is made.** **Tempt Fate is once per scene**, with
> Petition independently available in the same scene; consecutive-scene escalation continues to govern the next
> use; a second attempt is declined **before payment**. See `_repeated_tempt_decision_note_2026_09_28.md`.
>
> **What that removes from this packet:** the per-invocation reusability requirement (revision 5) is **withdrawn**;
> coverage reverts to **"every valid cell has at least one eligible outcome"**; empty-set **state 5 is no longer
> reachable**; and there is no repeatable grammar, no finite pool and no new counter. States 1–4 remain.

**Revision 5 (2026-09-28).** A read-only production trace of the **Tempt Fate usage horizon**, because the
coverage guarantee depended on an untested recurrence assumption. **The assumption was wrong** — see §7i. The
coverage rule is corrected mechanically; no design was expanded.

**Revision 4 (2026-09-28), final on architecture.** Three precision fixes.

6. **`playerFavorRank` may never select among exact readings** — §7g.
7. **"Enumerate reachable states" is replaced by a bounded authored coverage universe** — §7f is rewritten. The
   earlier wording promised exhaustiveness over arbitrary story state, which is not a claim a static check can make.
8. **The equal-top-rank rule is restated in this packet** rather than only in the addendum — §7g.

5. **`unm.no_opening` is withdrawn as an always-eligible floor.** Tested against Roman's criterion it is a
   **refusal in gentler language**, which Tempt ambiguity forbids. Replacing it honestly means **the unmoored set
   no longer has a genuinely favorable always-eligible outcome**, and per instruction I have not invented one:
   §7f enumerates the states where the eligible set can be empty and records it as an **authoring gap**.

---

## 0. Two inventory findings that change the shape of the question

**Finding A — there is no set of Tempt Fate "cards". There is one mechanic.** I went looking for a card table
and there isn't one: `tempt_fate` appears as an engagement nudge id (`:30316`), a label (`:10264`), a prompt
module (`_llTemptFate`, `:73046`) and a HEAVY tier reason (`:75089`). The player holds *Tempt Fate* and writes
free text; the **rupture class comes from the wish**, not from a card variant.

So "one currently playable Tempt Fate card" resolves to: **Tempt Fate × one rupture class × one story.**
This packet authors **`memory_perception` in First Sacrifice**, which is the only combination with five samples
of real evidence behind it.

**Finding B — a partial proposition ledger already exists, and it is better material than expected.** Six
`eventFacts` in the seed carry **ids**, and they are genuinely propositions — things that happened, that a
character could lose:

| id | the fact |
|---|---|
| `twist_manifested` | Seren's wish twisted because it was misaligned — care performed for the wrong reason |
| `price_identified` | the sacrifice is taken or identified — the offered **memory** lands |
| `interrogation_interrupted` | Julian, the Provast, has already questioned Lirael before the assembly — intimately, as an equal |
| `the_answer_institutional` | The Answer belongs to the Institution; Julian is its caretaker; Lirael holds it only for the term |
| `inquiry_authority_claimed` | the presiding Dohkar asserted authority over the rite and the ruling on the Sacrificiant |
| `inquiry_opened` | a Chayr and two Dohkars formally open an inquiry into the PC |

**But most `eventFacts` carry no id** — they are prose with participants. So the authoring task is not "invent
a proposition ledger"; it is **"assign ids to the facts a wish could plausibly target"**, which is a subset.
That is the single most important number in this audit, and it is small: see §5.

### Scope anchors that already exist

| anchor | source | kind |
|---|---|---|
| `pc:lirael` | participants, eventFact refs | named (invoker) |
| `named:seren` | participants, eventFact refs | named |
| `named:julian` | participants; LI anchor | named (love interest) |
| `role:first_sacrifice_presiding_dohkar` | eventFact refs | named-by-role |
| `the_assembly` | `reservedEvents` id, declared collective | **collective** |
| `role:first_sacrifice_inquiry_chayr` | row 14 staging | named-by-role (not present until row 14) |

### Existing story-state constraints that bind any authored outcome

- **`sealedEvents`**: `julian_counter_wish` and `julian_obscuring_wishes` do not exist for the reader until
  scene 16. No authored outcome may touch, imply or pre-empt them.
- **`reservedEvents`** as *scheduled* ids — `dohkar_preliminary_review`, `family_accusation`,
  `julian_jurisdiction_challenge`, `lirael_constrained`, `lirael_defensive_path`, `inquiry_opened` — are
  future plan rows. They are the **`plan_invalidated` targets**, not propositions to forget.
- **The reserved-canon release condition** already built: a proposition reserved for a later row may not be
  delivered early, so a wish cannot reach `inquiry_opened` before row 14.
- **PRESERVE ALWAYS**: canon, body Bibles, names, faces are untouchable by any turn.

---

## 1. Tempt Fate × `memory_perception` × First Sacrifice — the permutation set

Authored against the six real propositions and the six real anchors. **Rupture class:** `memory_perception`.
**Card amplitude:** rupture-capable; `STORY_WORLD` available; durability `persists` by default.

### 1a. Exact-reading outcomes

Selected when the wording anchors **both** a proposition and a scope form.

| id | proposition | scope | affected | unchanged | durability | intrinsicCost | rank |
|---|---|---|---|---|---|---|---|
| `mem.exact.assembly_forgets_twist` | `twist_manifested` | `DECLARED_COLLECTIVE` (`the_assembly`) | the_assembly | Lirael (invoker), Seren, Julian, the Dohkar — each listed | persists | none | 7 |
| `mem.exact.dohkar_forgets_authority` | `inquiry_authority_claimed` | named (`role:…presiding_dohkar`) | the Dohkar | all others listed | persists | `authority_vacuum` — the rite has no one holding it | 6 |
| `mem.exact.julian_forgets_interrogation` | `interrogation_interrupted` | named (`named:julian`) | Julian | all others listed | persists | `intimacy_unwitnessed` — the equality of that exchange is now only hers | 5 |
| `mem.exact.seren_forgets_price` | `price_identified` | named (`named:seren`) | Seren | all others listed | persists | `unmourned_loss` — Seren cannot grieve what she no longer knows she paid | 4 |
| `mem.exact.all_present_forget_twist` | `twist_manifested` | `SCENE_PRESENT` | assembly + Seren + Julian + Dohkar | Lirael (invoker anchor) | persists | none | 9 |
| `mem.exact.institution_forgets_custody` | `the_answer_institutional` | `DECLARED_COLLECTIVE` (`the_assembly`) + Dohkar | assembly, Dohkar | Lirael, Seren, Julian | persists | `custody_unclaimed` — no one is watching the Answer | 8 |

### 1b. Ambiguous-Tempt outcomes — ranked, twists and refusals excluded

Ambiguity resolves to **max `playerFavorRank`**. `twist: true` and refusal are **not in this set at all**, by
policy. Every member is a complete outcome with exact sets.

| rank | id | reach | intrinsicCost |
|---|---|---|---|
| **10** | `mem.amb.everyone_present_forgets_twist` | assembly + Seren + Julian + Dohkar forget `twist_manifested`; Lirael exempt | none |
| 9 | `mem.amb.everyone_present_forgets_price` | same population, `price_identified` | none |
| 8 | `mem.amb.assembly_and_dohkar_forget_twist` | assembly + Dohkar; Seren and Julian listed unchanged | none |
| 7 | `mem.amb.assembly_forgets_twist` | assembly only; three named parties listed unchanged | none |
| 6 | `mem.amb.dohkar_forgets_authority` | Dohkar only | `authority_vacuum` |

**Rank 10 is what an ambiguous "everyone forgets" gets.** Not a partial grant, not a narrowing, not a twist —
the most player-favorable reading in the set. Fate's danger stays in what was asked, not in how it was phrased.

**The tie rule bites here.** Ranks 10 and 9 differ in *granted proposition*, so they must not share a rank —
they are not player-equivalent, and a seeded tie between them would let imprecision choose which memory goes.
They are deliberately ranked 10 and 9, and the audit's judgement is that `twist_manifested` is the more
player-favorable grant because it is the fact that indicts her.

### 1c. Excluded from ambiguity, available to exact readings only

| id | why excluded |
|---|---|
| `mem.twist.assembly_forgets_but_julian_remembers` (`twist: true`, `exploits: ['scope']`) | a twist; unreachable from a Tempt ambiguity by policy |
| `mem.refusal.rite_resists` | a refusal; unreachable from a Tempt ambiguity by policy |
| `mem.exact.everyone_everywhere` (`STORY_WORLD`) | reachable only by wording that anchors story-world scope explicitly — *"no one in the Fatelands remembers"* |

### 1d. Causal mechanisms needed

Only one, and it is narrow:

| mechanism | conditions | licenses — and only this |
|---|---|---|
| `witness_present` | a party is staged in the scene's roster at the moment the proposition was established | that party **held** knowledge of that proposition, so losing it is coherent |

`witness_present` establishes **held knowledge and nothing else** — not what they thought of it, not what they
will do, not whether they will notice the gap. This matters because it is what makes
`mem.exact.assembly_forgets_twist` legal at all: the assembly must have had the knowledge before it can lose
it, and a party staged only from row 14 cannot lose a row-3 fact.

---

## 2. Player wording → reading, for the Tempt set

| wording | mode | anchors | selected |
|---|---|---|---|
| *"I wish the assembly would forget the wish twisted."* | `exact_reading` | proposition `twist_manifested` + scope `the_assembly` | `mem.exact.assembly_forgets_twist` |
| *"Let the Dohkar forget he ever claimed the ruling was his."* | `exact_reading` | `inquiry_authority_claimed` + named Dohkar | `mem.exact.dohkar_forgets_authority` |
| *"I wish Julian didn't remember questioning me like that."* | `exact_reading` | `interrogation_interrupted` + named Julian | `mem.exact.julian_forgets_interrogation` |
| **"If only everyone would forget the ceremony happened."** | **`ambiguous_reading`** | proposition **unanchored** ("the ceremony" matches no declared id), scope form *"everyone"* → unresolved | **`mem.amb.everyone_present_forgets_twist`** — rank 10 |
| *"I wish they'd all forget."* | `ambiguous_reading` | nothing anchored | rank 10, same |
| *"I wish nobody anywhere remembered the rite."* | `exact_reading` | scope `STORY_WORLD` anchored explicitly | `mem.exact.everyone_everywhere` |
| *"I wish this had never happened to me."* | **no declared fit** | nothing | `unmoored_wish` set — **not authored yet**, see §5 |

**The real paid wish lands at rank 10.** Under the old prose path the same wording produced four dispositions,
two unsupported, one schema contradiction and a wrong scope value — and committed nothing. Here it compiles to
a complete outcome, most favorable, before a word is written.

---

## 3. One ordinary Say/Do lane — `boundary`

`_classifySayDoSlot` already returns `boundary` deterministically, and the First Sacrifice opening is full of
boundary moves (witness protocol, the torn band, the Dohkar's restrictions). Cast and anchors as above.

### 3a. The reading set

| id | anchors | ack | stance | immediate | durableDeltas | specificity |
|---|---|---|---|---|---|---|
| `bnd.interpose.named` | a named party + a physical interposition | `enacted` | `guarded` | `position_stated` | `rel.dohkar.formality_hardens` | 2 |
| `bnd.refuse.answer.named` | a named party + a refusal to answer | `enacted` | `resistant` | `position_stated` | `obl.lirael.silence_on_record` | 2 |
| `bnd.state.limit.generic` | a refusal or limit, no party named | `enacted` | `guarded` | `position_stated` | — none | 1 |
| `bnd.withhold.silent` | a withholding, nothing said | `attempted_partial` | `guarded` | `none_observable` | — none | 1 |
| `bnd.leave.object.named` | a named party + an object left or moved | `enacted` | `absent` (party not present) | `access_changed` | `world.letter_on_desk` | 2 |

`bnd.leave.object.named` is the audit's test of the **interiority boundary**: it establishes *the letter is on
his desk* and puts *whether he reads it* in `open[]`. No mechanism is declared for reading, so none is
inferred.

### 3b. Wording → reading

| wording | selected | note |
|---|---|---|
| *"I step between them and put my hand flat on the table."* | `bnd.interpose.named` | specificity 2 beats the generic |
| *"I won't answer that."* | `bnd.state.limit.generic` | specificity 1; no party anchored |
| *"I won't answer the Dohkar."* | `bnd.refuse.answer.named` | **specificity 2 wins even if `bnd.state.limit.generic` were authored at higher priority** — the §4 precedence rule in action |
| *"I say nothing."* | `bnd.withhold.silent` | `immediateChange: none_observable`, and the turn still occurred |
| *"I leave the letter on Julian's desk."* | `bnd.leave.object.named` | local fact only; his response in `open[]` |
| *"I make him understand."* | **no declared fit** | asserts a non-participant's interior state with no mechanism → **fallback** |

### 3c. The safe fallback

```
turn:           { canonical: { action: 'I make him understand.', dialogue: null },
                  inputClass: 'relationship-forcing', mode: 'consequence_without_obedience' }
registration:   { mechanism: 'say_do', policyModuleId: 'ordinary_consequence', slot: 'boundary' }
interpretation: { mode: 'exact_reading', selected: null,
                  outcome: 'no_declared_consequence_fit',
                  reason: 'asserts non-participant interior state; no declared mechanism',
                  classSlotKey: 'relationship-forcing/boundary' }
consequence:    { magnitude: 'occurred_no_durable_change',
                  acknowledgement: 'attempted_partial',
                  responseStance: 'resistant',        // never `receptive` for this class
                  immediateChange: 'none_observable', // valid — the attempt landed on nothing visible
                  durableDeltas: [],
                  open: [ /* carried forward unchanged */ ] }
```

The author may render her trying, and his not yielding. It may not render him understanding.

---

## 4. Coverage, honestly

### Where the tables go repetitive

- **`boundary` has five readings and four distinct `immediateChange` values.** A player who makes six boundary
  moves in an issue will see the same shapes. The *prose* differs because the author writes it, but the
  **consequence** repeats, and a reader tracking cause and effect may notice the world responds identically.
  **The mitigation I first proposed — "make `responseStance` sensitive to the responding party at zero authoring
  cost" — is withdrawn.** It was an undeclared inference channel wearing a cost saving: deriving a stance from
  *who is present* means the planner deciding that the Dohkar hardens and Julian withdraws, which are **two
  different story facts** about two different people. Nobody authored either. Variety is available, and it is
  cheap, but it is **not free** — see §6a.
- **The Tempt ambiguous set collapses to rank 10 every time.** That is correct by policy and it means *every*
  vague memory wish in this story produces the same outcome. Deliberate, but a player who tempts twice vaguely
  gets the same rupture twice. **The physics modifiers exist precisely for this** and are unexercised in this
  packet: saturation should change which permutations are *eligible*, not merely their weights.

### Where the tables cannot express a satisfying result

Three real gaps, none of them fatal:

1. **Partial forgetting of one proposition.** *"Let them forget the wording, not the wish"* has no expression:
   propositions are atomic, so a wish that targets half of one falls to ambiguity. Sub-propositions would fix
   it and would multiply the ledger; **not worth it for a first story.**
2. **`unmoored_wish` is entirely unauthored.** *"I wish this had never happened to me"* is a wish a real player
   will write early and often, and this packet has nothing for it. **This is the largest single gap** and it is
   not optional — it is a first-turn-plausible input.
3. **Emotional rather than factual targets.** *"I wish he didn't hate me"* targets a stance, not a
   proposition. `relationship_state` deltas exist in the ordinary grammar but the Tempt memory class has no
   equivalent, so it falls to ambiguity and grants a memory loss the player didn't ask for. **A
   `relationship_social` rupture class would cover it** — and is out of scope here, correctly.

### Authoring volume — the number this audit exists to produce

For **one story, one rupture class, one ordinary slot**:

| artifact | count | effort |
|---|---|---|
| proposition ids to assign | **~6 existing + ~4 to add** | small — the six already exist |
| Tempt exact readings | 6 | half a day of design judgement |
| Tempt ambiguous set, ranked | 5 | the ranking is the hard part, not the writing |
| twists / refusals (exact only) | 2 | small |
| causal mechanisms | **1** | small, and reusable across every story |
| ordinary readings, one slot | 5 | small |
| `unmoored_wish` outcomes | **0 authored — needed** | unknown, and the real risk |
| **scope lexicon entries** | ~12 phrasings | small, grows by observation |

**Verdict on viability: yes for one story and one class, with one caveat.** The per-artifact effort is design
judgement rather than volume — six exact readings is an afternoon, and the reusable parts (mechanisms, the
lexicon, the grammar itself) amortize across stories. What does **not** amortize is the ranking: deciding that
`twist_manifested` is a more player-favorable grant than `price_identified` is a story-specific editorial call,
and it is exactly the call the system exists to take away from a model.

Multiply by four ordinary slots and four more rupture classes and it is a content project — but **it does not
have to be done at once**, because the fallback degrades honestly. A story shipping with `boundary` authored
and `confession` unauthored still works; `confession` turns take the fallback, and the coverage signal names
them.

---

## 6a. Party-specific stance profiles — compact, but authored

A stance is a **story fact about a person**. The Dohkar retreating into procedure and Julian going quiet are not
one reading rendered twice; they are two facts, and each needs declaring.

The compact form: **authored stance profiles, referenced by id**, so an outcome names which one applies rather
than the planner inferring it.

| profile id | party | stance | what it declares |
|---|---|---|---|
| `stance.dohkar.formal_hardening` | `role:…presiding_dohkar` | `resistant` | he retreats into the rite's order; procedure tightens |
| `stance.dohkar.authority_asserted` | same | `escalating` | he claims the ruling explicitly |
| `stance.julian.watchful_withdrawal` | `named:julian` | `withdrawn` | he stops speaking and keeps watching |
| `stance.julian.institutional_correction` | same | `resistant` | he answers as the Provast, not as himself |
| `stance.seren.appeal` | `named:seren` | `receptive` | she pleads, still holding her own loss |
| `stance.seren.shame_silence` | same | `withdrawn` | she will not look up |
| `stance.assembly.murmur` | `the_assembly` | `guarded` | a collective unease with no single speaker |
| `stance.assembly.turning` | same | `escalating` | the collective begins to move against her |

**Eight profiles for four parties.** A reading or outcome references the profile ids legal for it; the planner
selects among those references and **may not construct a stance from cast identity**. The proof that matters:
given a cast, the planner must be unable to produce a stance whose profile no outcome referenced.

This is genuinely cheap — eight compact entries — and it buys the variety §4 wanted **without** an inference
channel. It also makes the variety *legible*: "the Dohkar hardened" becomes a recorded fact a later scene can
read, which it never would have been as a derived flourish.

---

## 7. The unmoored Tempt Fate set — First Sacrifice, opening

The blocker from revision 1, authored. Selected when the wording anchors **no** declared proposition:
*"I wish this had never happened to me."*

### 7a. The design principle these follow

Fate cannot un-happen canon, and the seed's own doctrine already says so — **"Circumstances, Not Minds"**, plus
the kernel-substitution rule already written into the verdict block at `:75601`: an impossible ask is granted as
its *plausible kernel*, never literally. So an unmoored Tempt wish gets a **circumstantial** grant, not a memory
edit. That is why this set looks different from §1's: nothing here rewrites what anyone knows, because the player
named nothing to rewrite.

All are `twist: false`, no refusals, durability `persists` unless noted — per the Tempt ambiguity policy.

### 7b. The set

| rank | id | affected (exact) | unchanged (exact) | open | intrinsicCost | eligibility |
|---|---|---|---|---|---|---|
| **10** | `unm.band_unremarked` | the record: the torn gossamer band is **not entered** as a protocol breach (`world_fact`) | Lirael, Seren, Julian, Dohkar, the_assembly — all knowledge intact | whether anyone raises it unprompted | none | **before** `family_accusation`; **consumed once** |
| 9 | `unm.witness_dispersal` | the_assembly disperses before a collective account is taken — **no collective testimony exists** (`world_fact`) | all named parties, all knowledge intact | whether individual accounts surface instead | none | while `the_assembly` is staged **and** `inquiry_opened` has **not** occurred; **consumed once** |
| 8 | `unm.procedural_delay` | `dohkar_preliminary_review` is **deferred**, not cancelled (`world_fact`) | every party's knowledge and stance | whether the delay reads as favor or as suspicion | none | while `dohkar_preliminary_review` is scheduled and unheld; **consumed once** |
| 7 | `unm.julian_standing_questioned` | Julian's **procedural standing** to question her is put in doubt (`world_fact`) — *not* his feelings, *not* his intent | Julian's knowledge, stance and future action — all untouched | whether he recuses, and who questions her instead | `escalation_invited` — a jurisdiction fight is now likelier | **after** `interrogation_interrupted`, **before** `julian_jurisdiction_challenge`; **consumed once** |
| 6 | `unm.custody_unraised` | the Answer's custody is **not raised this scene** (`world_fact`) | all knowledge, including `the_answer_institutional` itself | when it will be raised, and by whom | none | while `the_answer_institutional` is unrevealed to the assembly; **consumed once** |
| 4 | `unm.adverse_event_deferred` | the **next scheduled adverse plan row** does not occur in this scene (`world_fact`, naming the row by id) | every party's knowledge and stance | when it occurs instead, and whether the delay is noticed | none | **requires a scheduled, unheld adverse row to exist**; consumed per row |

`unm.julian_standing_questioned` is deliberately the sharpest test of the interiority boundary: it moves a
**procedural** fact and leaves Julian's mind entirely alone, with his response in `open[]`. It would be trivial
and wrong to author "Julian softens" here.

**`unm.no_opening` is withdrawn.** It read *"nothing materially changes — the moment passes without the worst of
it landing"*, and against the test it fails: the avoided harm was **not a declared, imminent story condition**, and
the record established **no concrete favorable delta**. Affected was empty. That is a **refusal wearing gentler
language**, and Tempt ambiguity forbids refusals — so it was the policy violation it was invented to prevent.

`unm.adverse_event_deferred` (rank 4) is what survives of the idea *done properly*: the avoided harm is a **named
scheduled plan row**, the delta is concrete (`world_fact`: that row does not occur here), and it is favorable in a
way a reader could notice. But it is **not always eligible** — it requires such a row to exist and be unheld. See
§7f.

### 7c. The boundary this set needs

> **An unmoored outcome may not act on an unrelated proposition merely because it is favorable. It must be
> declared as an available Fate response for the current story state and scene context.**

Without this, "I wish this had never happened" could reach for `the_answer_institutional` in a scene where
custody is not at issue, purely because the outcome ranks well. Every entry above therefore carries an
eligibility condition **tied to the scene's actual state** — not a global availability. Favorability selects
*among eligible* outcomes; it never establishes eligibility.

### 7e. `playerFavorRank` ranks the COMPLETE package

**The rule, stated for every Tempt set in this packet:**

> `playerFavorRank` ranks the **whole authored package**: the granted and affected facts, the unchanged and open
> facts, the intrinsic cost, and any lost opportunity or consumed availability. **A larger headline grant with a
> worse intrinsic cost must not silently outrank a smaller, safer result** — it may only outrank it where the
> author has deliberately judged the *total* more favorable, and that judgement is the authoring act.

Re-examining my own ranks against it:

| entry | headline | cost / consumption | judged total | verdict |
|---|---|---|---|---|
| `unm.band_unremarked` (10) | the breach never enters the record | none; consumes the one chance to keep it out | strongest, and the cost is only the opportunity | correct |
| `unm.witness_dispersal` (9) | no collective testimony | none; consumes it | strong, slightly narrower than 10 | correct |
| `unm.procedural_delay` (8) | the review is deferred | none | time, no harm | correct |
| `unm.julian_standing_questioned` (7) | her most dangerous questioner may be removed | **`escalation_invited`** — a jurisdiction fight becomes likelier | **the one entry where cost moves the ranking.** A bigger headline than 8 or 6, deliberately ranked below 8 because inviting a jurisdiction fight in Issue 1 is worse for her than gaining a scene of time | correct, and stated |
| `unm.custody_unraised` (6) | custody not raised this scene | none | small, safe | correct |
| `unm.adverse_event_deferred` (4) | one named adverse row deferred | none; consumed per row | smallest concrete good | correct |

And in §1b, `mem.amb.dohkar_forgets_authority` (6) sits below `mem.amb.assembly_forgets_twist` (7) **because of
`authority_vacuum`**, not because its reach is smaller — a rite with nobody holding it is a worse world for her
than a collective that has forgotten one fact. Under headline-only ranking those two would have inverted.

### 7g. `playerFavorRank` is for ambiguous selection ONLY

**Stronger than revision 3's note, which said rank "matters only if two exact readings tie". It must not matter
even then.**

> **`playerFavorRank` is an input to ambiguous Tempt selection and nothing else. It may never choose among exact
> readings.** Precise wording is the player's instrument; letting favorability arbitrate it would mean the table
> quietly overruling what they wrote — the same failure as priority overruling specificity, arriving by a
> different door.

So when two exact readings satisfy the same anchors at equal specificity:

- **authored priority may resolve it ONLY if the two are equivalent in granted facts, intrinsic costs, and
  player-facing meaning.** Flavour may differ; consequence may not.
- **otherwise the table is rejected as an AUTHORING AMBIGUITY** — at authoring/load time, named. Two
  materially different consequences answering the same precise wording means the author has not yet decided
  what that wording means, and no runtime rule should decide it for them.

The `rank` column is therefore **removed from §1a's selection semantics entirely**. It is retained in the table
only as editorial annotation — a note of how the author judged the package — and is never read by selection.

### 7h. Equal top-ranked ambiguous outcomes — the rule, restated here

Carried from the selection-ownership addendum so this packet is self-contained:

> Two ambiguous Tempt outcomes sharing the top `playerFavorRank` may be **seed-tied only if their COMPLETE
> PACKAGES are equivalent** — affected set, granted proposition, unchanged set, intrinsic cost, and consumed
> availability. Flavour may differ freely.
>
> Otherwise the author must **rank them differently**, or write a **deterministic player-favorable tiebreak** on a
> named dimension. A non-equivalent seed-tie is an authoring error raised at load, never resolved at compile time.

**In this packet no ambiguous set has a top-rank tie**, and §1b's ranks 10 and 9 are deliberately distinct because
they grant *different propositions* — which is exactly the non-equivalence the rule catches.

### 7d. How eligibility produces variety without touching the policy

The exhaustion problem stated plainly: Tempt ambiguity always takes the **most player-favorable** outcome, so
without eligibility a player who tempts vaguely three times gets rank 10 three times.

**Eligibility solves it inside the policy**, not around it:

| tempt | eligible set | selected |
|---|---|---|
| 1st, before the accusation | 10, 9, 8, 6, 4 | **`unm.band_unremarked`** (10) |
| 2nd, band already spent | 9, 8, 6, 4 | **`unm.witness_dispersal`** (9) |
| 3rd, assembly dispersed, inquiry now open | 8, 6, 4 | **`unm.procedural_delay`** (8) |
| 4th, review held, custody raised, another adverse row still pending | 4 | **`unm.adverse_event_deferred`** |
| 5th, no adverse row pending, everything else spent | **∅** | **nothing — see §7f** |

Still always the most favorable **eligible** outcome. **No hidden weights, no less-favorable draw, no
narrowing as a penalty for imprecision.** What changed is what remains available, which is a fact about the
story, not a tax on the player.

**There is no longer a guaranteed floor, and that is the honest position.** Revision 2 claimed one; it was a
refusal in disguise. The fifth row above is a real state with an **empty eligible set**, and §7f treats it as what
it is.

### 7i. Trace — the real Tempt Fate usage horizon (read-only, production code)

**Question:** can `once_per_scene` discharge the per-cell coverage obligation? That requires at most one Tempt per
accepted scene.

**Answer: NO. Repeated invocation within one accepted scene is possible, and the codebase already knows it.**

| question | finding | evidence |
|---|---|---|
| Can it be invoked more than once in one accepted scene? | **Yes.** `invokeTemptFate(skipConfirm)` (`:256889`) has **no guard on prior invocation** | its entry checks only cost: free credit → `consumeFortuneFavorCharge()` → fortunes balance → purchase modal |
| What gates repeated use? | **Cost only** — Fortune's Favor charges, `_temptGrantsFreeCredit`, or the fortunes balance. No per-turn, per-scene or per-phase cap exists | grep for a tempt cap/max/limit returns nothing relevant |
| Do the flag-reading sites gate it? | **No.** The three sites that read `tempt_fate_invoked_this_turn` are a resonance **decay** check (`:11806`), a prose **amplification** directive (`:11915`), and a vulnerability-pulse condition (`:79678`) | none is an invocation guard |
| Is the flag itself a guard? | **No.** It is a boolean set to `true` (`:256933`) and never tested for already-true before setting | cleared at scene/generation boundaries (`:236571`, `:237368`, …) |
| Does a second invocation lose data? | **`state.temptFateWish` is a scalar and is OVERWRITTEN** (`:109393`). The **ledger appends** | `_temptFateLedger` is append-only with a monotonic `_temptFateLedgerSeq` and a stable per-proposal id |
| Does an invocation advance state that changes eligibility before the next scene? | **It advances state, but not any predicate in the matrix.** `consecutive_tempt_fate_count` increments, fate resonance/heat rises, saturation and volatility move — none of which is `accusationMade`, `inquiryOpened`, `reviewPending`, `interrogationOccurred`, `custodyRevealed` or `assemblyStaged` | `:256944` and the resonance block |

**The decisive evidence is a comment already in the code.** `_recordTemptFateEvent` (`:193401`) explains its stable
id this way:

> *"a caller mid-generation can carry a reference to THIS exact proposal forward and never accidentally resolve to a
> DIFFERENT wish sealed later while that generation was in flight."*

Multiple wishes sealed per scene — including *mid-generation* — is not hypothetical. It is a race the earlier
ownership work already fixed, with four dedicated sections in the integration control.

**Two consequences for the coverage rule:**

1. **Repeated Tempts in one scene land in the SAME matrix cell.** No predicate changes between them, so the cell
   cannot supply variety across repeats.
2. **The repeat count is bounded only by the player's fortunes** — an economic limit, not a mechanical one. There is
   no finite repeat index to enumerate, so **a bounded repeat dimension cannot honestly be added** without
   introducing a hard cap, which would be a design change and is out of scope here.

### 7f. Where the eligible set can be empty — an authoring gap, not a runtime problem

Every concrete favorable delta needs *something in the story to act on*. Once the conditions are gone, Fate has
nothing declared and favorable left — so an always-eligible outcome is not merely unauthored here, it may be
**unauthorable in principle** without either a refusal or an invented consequence.

**Four reachable empty-set states**, from the real eligibility conditions:

| # | state | why every entry is ineligible |
|---|---|---|
| 1 | **All five consumed and no adverse row pending** | consumption closes 10, 9, 8, 7, 6; 4 has no row to defer |
| 2 | **Late Issue 1** — after `family_accusation`, `inquiry_opened`, the review held, `julian_jurisdiction_challenge` made and custody revealed | all five gates closed **by story progress alone**, regardless of consumption |
| 3 | **A private two-party scene early on** | the assembly is not staged, no review is pending, `interrogation_interrupted` has not occurred — several gates fail at once |
| 4 | **Issue 2 and beyond** | **every eligibility condition in this set references Issue 1 events.** There are currently *zero* unmoored outcomes authored for any later issue |
| ~~5~~ | ~~A second Tempt in the same scene~~ | **NO LONGER REACHABLE** — Tempt is once per scene and a second attempt is declined before payment (decision, 2026-09-28) |

**State 4 is the one that matters most and I under-stated it before.** I presented this set as covering "First
Sacrifice"; it covers **First Sacrifice's opening**. Unmoored coverage is needed **per story phase**, not per
story, and that multiplies the unmoored authoring by the number of phases.

**The resolution: additional declared outcomes, checked against a BOUNDED AUTHORED COVERAGE UNIVERSE.**

Revision 3 said "enumerate the reachable story states". **Withdrawn — that is not a claim a static check can
make.** Arbitrary runtime story state is not finite and not fully knowable in advance; promising exhaustiveness
over it would be exactly the kind of guarantee this workstream has spent its time retracting.

Instead: **each phase authors a finite coverage matrix**, and the check is exhaustive **over that declared
matrix** and says so.

### The coverage universe — declared dimensions

For `issue1.opening`, authored:

| dimension | values | source |
|---|---|---|
| `phase` | `issue1.opening` | the arc's declared phases |
| `jurisdictionChallengeMade` | true / false | `julian_jurisdiction_challenge` held? **(added in §7j — it gates rank 7 and was missing)** |
| `accusationMade` | true / false | `family_accusation` held? |
| `inquiryOpened` | true / false | `inquiry_opened` held? |
| `reviewPending` | true / false | `dohkar_preliminary_review` scheduled and unheld? |
| `interrogationOccurred` | true / false | `interrogation_interrupted` established? |
| `custodyRevealed` | true / false | `the_answer_institutional` revealed to the assembly? |
| `assemblyStaged` | true / false | declared scene-context predicate |

**2⁷ = 128 cells**, of which many are **invalid by the plan's own ordering** (an inquiry cannot be open before the
accusation in this arc), so the authored matrix is much smaller — on inspection roughly 20–35 valid cells. **Invalid
cells are declared invalid**, not silently skipped, so the gate cannot pass by shrinking its own domain.

### The requirement, and how consumption is handled

> **For every valid cell, at least one unmoored outcome must be eligible.**

Consumption is deliberately **not a dimension** — making it one would multiply 30 cells by 32 consumption subsets
and turn a reviewable artifact into a combinatorial table nobody reads. It is handled by a **rule on consumption
scope** instead — and §7i's trace forces that rule to be stricter than revision 4 stated:

> **Every valid cell must have at least one eligible unmoored outcome.**

**Revision 5's stricter rule — "at least one GENUINELY REUSABLE outcome per cell" — is withdrawn.** It existed
solely because a second Tempt could land in the same cell within one scene. **Under the once-per-scene decision it
cannot**, so `once_per_story` and `once_per_adverse_row` scopes are sufficient and the drafted entries stand as
authored.

Consumption still is not a dimension: it now simply **advances with the story**, one Tempt per scene, which is the
sequence §7d already walks.

### What the gate does and does not prove

- **Does:** every valid cell of the declared matrix has an eligible outcome; every cell is either valid with
  coverage or explicitly marked invalid; no outcome references an undeclared predicate.
- **Does NOT:** prove anything about story states outside the declared dimensions. If play reaches a configuration
  the matrix does not model, that is a **matrix gap**, surfaced by the same `no_declared_consequence_fit` coverage
  signal the ordinary policy already emits — and fixed by authoring, not by a runtime rule.

**Phase-scoped sets remain the shape**: roughly one small matrix and one small outcome set per arc phase (opening /
inquiry / consequence), each with its own predicates.

I am not inventing a universal floor to paper over this. A floor that is always eligible and always favorable
would have to act on something that is always present, and nothing in a story is.

---

## 7j. Resumed editorial pass — coverage re-derived under one Tempt per scene

With repeats gone, the question is simply whether **every valid cell of the opening matrix has an eligible
outcome**. Working the six drafted entries against the declared predicates:

| outcome | eligible when |
|---|---|
| `unm.band_unremarked` (10) | `!accusationMade` |
| `unm.witness_dispersal` (9) | `assemblyStaged && !inquiryOpened` |
| `unm.procedural_delay` (8) | `reviewPending` |
| `unm.julian_standing_questioned` (7) | `interrogationOccurred && !jurisdictionChallengeMade` |
| `unm.custody_unraised` (6) | `!custodyRevealed` |
| `unm.adverse_event_deferred` (4) | some adverse row scheduled and unheld |

**A cell is uncovered only when all six fail at once**, which requires: the accusation made, the inquiry open or
the assembly not staged, no review pending, the jurisdiction challenge already made, custody revealed, and no
adverse row outstanding. That is **late Issue 1** — the same empty-set state 2 already recorded, now with its
boundary drawn exactly.

### Two findings from the pass

1. **The matrix is missing a predicate.** `unm.julian_standing_questioned` is gated on
   `julian_jurisdiction_challenge` not yet being made, and that is **not one of the six declared dimensions**. The
   opening matrix needs **seven**: the six plus `jurisdictionChallengeMade`. 2⁷ = 128 raw cells, still ~20–35 valid
   after the plan's ordering invalidations. Cheap to fix, and it would have made the gate pass on an incomplete
   domain — the exact failure mode the "declare invalid cells explicitly" rule exists to catch.
2. **Early-phase coverage is good; late-phase coverage is the gap.** Before the accusation, rank 10 always covers.
   Through the middle, 9, 8 and 7 cover. **After the jurisdiction challenge, with custody revealed and nothing
   scheduled, the set empties** — and that is precisely where a second phase's outcome set belongs, which the
   phase-scoping requirement already called for.

**No new mechanism is needed for either.** One added predicate, and the late-phase outcome set that was already on
the list.

## 5. The revised minimum viable set, in actual authoring units

| unit | count | status |
|---|---|---|
| **propositions** (id-keyed facts a wish may target) | **6 existing + ~4 to add** | 6 real ids already in the seed |
| **Tempt exact readings** (`memory_perception`) | 6 | drafted, §1a |
| **Tempt ambiguous outcomes**, ranked | 5 | drafted, §1b |
| **Tempt twists / refusals** (exact-reading only) | 2 | drafted, §1c |
| **Unmoored Tempt outcomes**, opening phase | **6** (the disguised floor replaced by `unm.adverse_event_deferred`) | drafted, §7b |
| **Unmoored outcomes, later phases** | **~2 phases × ~4 = ~8, UNAUTHORED** | **gap — §7f state 4** |
| ~~Per-invocation reusable outcomes~~ | ~~≥1 per valid cell~~ | **requirement withdrawn — Tempt is once per scene** |
| **Opening-matrix predicates** | **7** (the sixth was missing: `jurisdictionChallengeMade`) | §7j |
| **Eligibility rules** | **6 for the opening**, plus one per later-phase outcome | drafted for the opening |
| **Coverage matrices** | **1 per phase** — ~7 declared dimensions, ~20–30 valid cells for the opening | specified, §7f |
| **Non-empty-eligibility ship gate** | 1 static check, exhaustive **over the declared matrix only** | specified, §7f |
| **Party-stance profiles** | **8** — two each for four parties | drafted, §6a |
| **Causal mechanisms** | **1** (`witness_present`) | drafted; reusable across stories |
| **Ordinary readings**, `boundary` slot | 5 | drafted, §3a |
| **Ordinary fallback** | 1 | drafted, §3c |
| **Scope lexicon anchors** | ~12 phrasings | grows by observation, not guessed up front |
| **Total authored entries** | **~60** | of which ~9 are reusable engine-wide |

Ordered for a first story:

1. **Ids on the ~4 additional facts** a memory wish could target. Smallest task, unblocks §1.
2. **The unmoored sets and their eligibility rules** — the opening phase is drafted; **later phases are not**, and
   the set without eligibility repeats while eligibility without phase coverage goes empty (§7f). They must land
   together with the ship gate that proves non-emptiness.
3. **The eight stance profiles**, which are the variety answer now that deriving stance is forbidden.
4. **`boundary` only**, with the other three slots on the fallback and the coverage signal naming them.
5. **The lexicon**, extended by watching what players actually type.

**Not needed for a first story:** sub-propositions; additional rupture classes; physics modifiers that shift
eligibility (the **state**-based eligibility above already supplies variety, and physics can wait); the other
three ordinary slots.

**Revised volume verdict: ~60 authored entries, of which ~9 are reusable.** That is a week of editorial work,
not a content project — and it is bounded, because the fallback makes partial coverage shippable. The estimate has gone **up twice** — revision 1 counted neither the unmoored set nor the stance profiles and
treated stance variety as free; revision 2 scoped the unmoored set to one phase without noticing. Each correction
made it larger and more honest, which is the expected direction for an estimate that started from a design rather
than from material.

## Recommendation

**Stage 3 deserves implementation**, on the evidence here: the material exists, the authoring is judgement
rather than bulk, the fallback makes partial coverage shippable, and the one real blocker
(`unmoored_wish`) is a bounded authoring task rather than a design unknown.

**The revision-1 blocker is closed for the opening phase.** `unmoored_wish` is authored (§7) with state-based
eligibility, so the most common vague wish has a declared answer where the story starts.

**A narrower blocker replaces it:** there is **no always-eligible favorable outcome**, and there cannot be one
without a refusal or an invention (§7f). Coverage is therefore a **per-phase authoring obligation** enforced by a
static ship gate, and **Issue 2 onward has none authored**.

**And the §7i trace adds a second, sharper one:** production allows **repeated Tempt invocation within one accepted
scene**, gated only by cost, so every valid cell needs at least one **per-invocation reusable** outcome — and the
drafted set has none. A `once_per_scene` outcome does not help, because the repeat happens *inside* the scene. This
is the single most consequential correction the trace produced, and it was an assumption the ship gate was silently
resting on.

**What I would now hold before building:** the ~4 additional proposition ids and the eight stance profiles. Both
are small, both are prerequisites rather than nice-to-haves — the first because §1's exact readings reference
facts that need ids, the second because forbidding derived stance (correctly) leaves the readings feeling
identical until the profiles exist.
