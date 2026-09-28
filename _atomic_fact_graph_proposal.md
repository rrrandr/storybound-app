# PROPOSED atomic fact graph — First Sacrifice, Issue 1 opening

> **PROPOSED EDITORIAL CANON, for approval only.** No code, no calls, no push. **The four revision outcomes
> remain blocked**; nothing is re-scoped, re-ranked, or re-run. Traces against this graph happen only after
> it exists and is approved.

---

# 0. Decision recorded (Roman, 2026-09-28)

### `mem.exact.seren_forgets_price` is NOT authorable in the Issue 1 opening

**`price_identified` will not be minted to make it fit.** The seed's own `requiredTruth` for this scene says
*"The price has not yet been named."* A fact that does not exist cannot be forgotten, and inventing one to
preserve an outcome would be authoring backwards from a draft.

**For this phase that wording has no exact target** and routes through the existing **no-exact-target /
Fate-chosen** path. It is not deleted from the design — it may become authorable in a later phase once the
price *is* named — but in the opening it is not an exact reading.

**The exact-reading set for the opening is therefore five, not six.** *(Recorded; the set is not renumbered
in this pass.)*

---

# 1. The rule that makes the graph safe

> ## A bundle is not ceaseable. Only atoms may appear in `ceases[]` or `establishes[]`.

The compound texts are preserved **verbatim** as read-only bundles — for the planner's routine "kept" check,
for author-facing readability, and so nothing downstream that references
`twist_manifested`/`interrogation_interrupted`/`the_answer_institutional`/`inquiry_authority_claimed` breaks.
But a bundle is a **view**, never a target. **There is no such thing as ceasing a parent**, so a parent cease
cannot mean "all children disappear" — the operation does not exist.

That single rule closes both defects the traces found: the cease can no longer be wider than the effect, and
a clause can no longer vanish by being adjacent to the one that was named.

## Dependencies are advisory, never operative

Every `depends_on` below tells an **author** what they must consider naming. **Nothing cascades at runtime.**

> **Ceasing an event does NOT remove its downstream choice, custody limit, venue, or authority claim.** Those
> cease only if the authored revision names them in its own closed set. A dependency is a prompt to the
> author and a checklist for review — never an automatic effect.

An author who ceases a fact and leaves a dependant unnamed has authored a world where an effect outlives its
cause. **That may be exactly right** — an accusation can outlive the event that prompted it — which is why it
must be a decision, not a default in either direction.

## Kinds

| kind | meaning |
|---|---|
| **event** | happened at a point in time; ceasing it says it did not happen in active canon |
| **state** | currently true; ceasing it says it is no longer true |
| **availability** | something is open, locked, or permitted; ceasing changes what may occur |

---

# 2. `bundle.twist_manifested`

> **Source, verbatim:** *"Seren's wish twisted because it was MISALIGNED — care performed for the assembly
> over the desire she actually held; the literal words were honoured (the whole assembly turned to look at
> Lirael) and the intent failed. Every First Favored present heard the loose note. This has already happened
> and is not re-staged."*

| atom | kind | source phrase | depends on |
|---|---|---|---|
| `twist.wish_misaligned` | **state** | *"Seren's wish twisted because it was MISALIGNED — care performed for the assembly over the desire she actually held"* | — |
| `twist.words_honoured` | **event** | *"the literal words were honoured"* | `twist.wish_misaligned` |
| `twist.assembly_turned` | **event** | *"(the whole assembly turned to look at Lirael)"* — population **`population.assembly`** | `twist.words_honoured` |
| `twist.intent_failed` | **event** | *"and the intent failed"* | `twist.wish_misaligned` |
| `twist.loose_note_heard` | **event** | *"Every First Favored present heard the loose note"* — population **`population.scene_present`** | `twist.wish_misaligned` |

**The approved populations land exactly on this sentence.** *"The whole assembly turned"* is
`population.assembly`; *"every First Favored present heard"* is `population.scene_present`. The seed was
already distinguishing them at clause level — the split makes it addressable rather than merely visible.

**`twist.words_honoured` and `twist.intent_failed` are separable and should stay separable.** The literal
honouring and the failure of intent are the two halves of the world's whole doctrine of misalignment. An
outcome that ceases one and not the other is not a mistake to be prevented; it is a scene.

---

# 3. `bundle.interrogation_interrupted`

> **Source, verbatim:** *"Julian, the Provast, has ALREADY questioned Lirael before the assembly — intimately,
> as an accusation through desirability — and the presiding Dohkar interrupted it as grossly inappropriate.
> Only then did her choice (run in shame or remain) arise. Not re-staged."*

| atom | kind | source phrase | depends on |
|---|---|---|---|
| `interr.julian_questioned_lirael` | **event** | *"Julian, the Provast, has ALREADY questioned Lirael before the assembly — intimately, as an accusation through desirability"* — audience **`population.assembly`** | — |
| `interr.dohkar_interrupted` | **event** | *"the presiding Dohkar interrupted it as grossly inappropriate"* | `interr.julian_questioned_lirael` |
| `interr.choice_arose` | **event** | *"Only then did her choice (run in shame or remain) arise"* | **both** of the above — *"only then"* names a conjunction, not a single cause |

**`interr.choice_arose` is the companion `unm.time_gives_way` could not name.** It now has a ref, and — per §1
— **it does not cease automatically** when the questioning does. An authored rewind must name it, or
deliberately leave a choice standing whose cause is gone.

## 3a. The run/remain choice as a current world state — proposed, with a qualification

You asked for a fact here **only if the seed supports treating it as a current world state rather than
narration.** The honest answer is that the seed supports it, but not as a fixed value.

> `131310`, `decision_consequence`: *"**Whatever the player chose in scene 1 must be VISIBLE here** — different
> witnesses, different judgement, different information available. If this scene reads the same either way,
> the choice was decorative."*

So: *the choice arising* is an event, already covered by `interr.choice_arose`. But **the choice having been
taken, with a result** is a current world state the seed **requires** to be visible in this scene.

| atom | kind | source | depends on |
|---|---|---|---|
| `lirael.scene1_disposition` | **state** | `decision_consequence` (131310) | `interr.choice_arose` |

**Its value is player-set, not seed-set** — a different kind of fact from every other atom here.

> **APPROVED 2026-09-28 as a SEALED PLAYER-CHOICE FACT — not a general mutable state field.** Closed values
> (the authored Scene-1 choices only); created only when that choice is accepted and sealed; **absent and
> unresolved before then, never defaulted**; bound to its originating `sceneUid` and choice record; and a
> later revision must list it explicitly as **unchanged, ceased, or replaced**.
>
> **Its value may never be guessed** from current UI, from later prose, or from an author's assumption — the
> sealed choice record is the only source. **And never inferred from ceasing `interr.choice_arose`**: the
> event that produced the choice and the disposition that resulted are separate atoms, and a cascade between
> them would silently rewrite what the player actually chose.

---

# 4. `bundle.the_answer_institutional`

> **Source, verbatim:** *"The Answer belongs to the Institution; Julian is its caretaker; Lirael holds it only
> for the questioning. It is not hers."*

| atom | kind | source phrase | depends on |
|---|---|---|---|
| `answer.owned_by_institution` | **state** | *"The Answer belongs to the Institution"* | — |
| `answer.julian_is_caretaker` | **state** | *"Julian is its caretaker"* | `answer.owned_by_institution` |
| `answer.lirael_holding_bounded` | **availability** | *"Lirael holds it only for the questioning. It is not hers."* | `answer.owned_by_institution` |

**This is the split that matters most.** The trace found that ceasing the compound id silently unbound
Lirael's possession. With atoms, `unm.custody_severed` can cease `answer.owned_by_institution` **and leave
`answer.lirael_holding_bounded` standing** — the Institution's claim ends and her holding stays limited.

The dependency is advisory precisely here: a bound on her possession is coherent whether or not anyone owns
the thing. **The split makes the safe reading expressible; it does not impose it.** Unbounding her holding
remains available as an authored grant — it simply has to be *named*, and priced.

---

# 5. `bundle.inquiry_authority_claimed`

> **Source, verbatim:** *"The presiding Dohkar asserted that the rite and the ruling on the Sacrificiant's
> conduct are his and named a formal inquiry (a Chayr and two Dohkars) as the venue; Julian agreed and
> publicly claimed authority to convene and preside over it. The inquiry is NOT yet opened (that is a later
> scene)."*

| atom | kind | source phrase | depends on |
|---|---|---|---|
| `auth.dohkar_claims_rite_and_ruling` | **state** | *"The presiding Dohkar asserted that the rite and the ruling on the Sacrificiant's conduct are his"* | — |
| `auth.venue_named_formal_inquiry` | **state** | *"named a formal inquiry (a Chayr and two Dohkars) as the venue"* | `auth.dohkar_claims_rite_and_ruling` |
| `auth.julian_claims_convene_preside` | **state** | *"Julian agreed and publicly claimed authority to convene and preside over it"* | `auth.venue_named_formal_inquiry` |
| `auth.inquiry_not_yet_opened` | **availability** | *"The inquiry is NOT yet opened (that is a later scene)"* | — |

**`auth.inquiry_not_yet_opened` is the same statement as the opening matrix's `inquiryOpened = false`
invariant**, reached independently from the seed text. Two derivations, one fact — worth noting as a
consistency check that passed.

**`unm.standing_dissolved` now becomes expressible as drafted:** cease `auth.julian_claims_convene_preside`
alone, leaving the Dohkar's assertion and the named venue intact — exactly what the entry's prose claimed and
its `ceases[]` contradicted.

---

# 6. `review_demanded` — proposed, and the distinction you asked for

## Seed evidence for the exact state

> `131354`, the `dohkar_preliminary_review` lane label: *"The presiding Dohkar (or another seated authority)
> applies PROCEDURAL PRESSURE toward a review of the Sacrificiant's conduct — he **DEMANDS, RECOMMENDS, CALLS
> FOR, or warns that a review will follow, and the assembly registers it.**"*
>
> And the limits: *"**A preliminary review may be DEMANDED here; it may not be CONVENED, SCHEDULED, or
> CONSTITUTED.**"*

**The seed draws the exact distinction requested, in its own capitals.**

| atom | kind | source | depends on | opening availability |
|---|---|---|---|---|
| `review.demanded_by_dohkar` | **event** | lane label (131354), `objectiveActor: 'the presiding Dohkar'` — pressure applied **on stage**, registered by `population.assembly` | `auth.dohkar_claims_rite_and_ruling` | **permitted** |
| `review.demanded_by_julian` | **event** | row 4 (131556) — *"Julian is named aloud as having demanded a review; he is NOT in the room"* — made **offstage** | — | **permitted** |
| `review.convened` | **event** | *"may not be CONVENED, SCHEDULED, or CONSTITUTED"* | `review.demanded` | **LOCKED in the opening** |

**`review.demanded` is not an opening-state fact.** It is false at scene start and becomes true only if the
`dohkar_preliminary_review` lane is played. That is the correct shape — and it is why the old draft's
`ceases: ['dohkar_preliminary_review']` was a category error: it named the **lane that can produce the fact**,
not the fact.

> **Corrected 2026-09-28.** `review.demanded` as first proposed **conflated two acts by two parties**:
> the presiding Dohkar's on-stage pressure in scene 2, and Julian's offstage demand revealed at row 4. They
> are separate events with separate actors and must be separate atoms — the Issue's whole route to its late
> spine runs through Julian's, and the editorial packet's `demand_authorship` proposition already made that
> authorship canon. Found by tracing `unm.proceeding_unmade`; see `_proceeding_unmade_trace.md` §4a.

The matrix predicate `reviewPending` reads `review.demanded_by_dohkar ∧ ¬review.convened ∧ ¬superseded`.

**Declaring `review.convened` as locked rather than omitting it** keeps the prohibition expressible. An
omitted fact cannot be checked against; a locked one can.

---

# 7. What this graph does and does not settle

## Settled, if approved

- Four compound truths become **seventeen atoms**, each narrow enough to cease alone.
- Bundles preserve the original text verbatim and stay **unceaseable**.
- `unm.standing_dissolved` and `unm.custody_severed` become **expressible as their prose already claimed**.
- `unm.proceeding_unmade` gets a real fact to cease.
- `unm.time_gives_way` gets a ref for its missing companion.

## NOT settled, and deliberately left open

1. **`lirael.scene1_disposition` introduces a runtime-valued fact class** (§3a). Approve or decline separately.
2. **`unm.proceeding_unmade` may still orphan the arc gate.** Atoms do not fix that — it is the substantive
   editorial question from the trace, and `the_open`'s `deferral_reason_key` still names preliminary process
   as the predecessor.
3. **No revision is re-traced here.** That is the next pass, against this graph, once approved.
4. Whether any of the four outcomes survives its trace at its drafted rank.

**The four revision outcomes remain blocked. No re-scope, no re-rank, no coverage rerun.**
