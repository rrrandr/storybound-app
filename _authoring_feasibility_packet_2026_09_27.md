# Authoring feasibility packet — Stage 3 against real First Sacrifice material

Dry content audit. No provider calls, no product code, no push. **Not a prototype and not a model test.**
Its only purpose: decide whether Stage 3 deserves implementation, and what a minimum viable first story needs.

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
  **Mitigation that costs nothing: make `responseStance` sensitive to the responding party.** The Dohkar
  hardening formally and Julian withdrawing are different stances from the same reading — which multiplies
  perceived variety by the cast size without authoring more readings.
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

## 5. What a minimum viable first story actually needs

Ordered, and shorter than expected:

1. **`unmoored_wish` outcomes for Tempt Fate.** The one genuine blocker. *"I wish this had never happened"* is a
   first-hour input and there is no answer for it.
2. **Ids on the ~4 additional facts** a memory wish could plausibly target.
3. **One ordinary slot authored** — `boundary` is drafted here and is enough to ship, with the other three
   slots on the fallback and the coverage signal watching them.
4. **The scope lexicon**, ~12 phrasings, extended by observation rather than guessed up front.
5. **`responseStance` varying by responding party**, because it is the cheapest available variety and this
   audit showed the readings will otherwise feel identical.

**Not needed for a first story:** sub-propositions, additional rupture classes, physics modifiers changing
eligibility, or the remaining three ordinary slots.

## Recommendation

**Stage 3 deserves implementation**, on the evidence here: the material exists, the authoring is judgement
rather than bulk, the fallback makes partial coverage shippable, and the one real blocker
(`unmoored_wish`) is a bounded authoring task rather than a design unknown.

**The one thing I would not do** is implement before `unmoored_wish` is authored. Without it, the most common
vague wish in the game has no declared answer — and a system whose whole premise is *"never invent a
consequence"* would meet its most frequent input with nothing to select.
