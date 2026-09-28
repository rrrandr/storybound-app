# Revision outcomes, corrected — one re-authored, three traced

> **PROPOSED. No rank is assigned to anything in this document.** Re-ranking happens only after all thirteen
> outcomes are in corrected form. No coverage rerun, no implementation, no push.

---

# 1. The two demand atoms, source-backed and distinct

**No generic `review.demanded` exists.** Two acts, two parties, two atoms.

### `review.demanded_by_dohkar` — **event**

> **Source, lane label (131354):** *"The presiding Dohkar (or another seated authority) applies PROCEDURAL
> PRESSURE toward a review of the Sacrificiant's conduct — **he DEMANDS, RECOMMENDS, CALLS FOR, or warns that
> a review will follow, and the assembly registers it.**"*
>
> **Source, defaultEventFrame (131504):** *"The presiding Dohkar puts Lirael's conduct formally in question
> before the assembly — he states that it WILL be reviewed and that she will answer for it."*

| | |
|---|---|
| actor | `role:first_sacrifice_presiding_dohkar` |
| where | **on stage**, in this scene |
| witnessed by | `population.assembly` — *"and the assembly registers it"* |
| depends on | `auth.dohkar_claims_rite_and_ruling` (the standing to demand) |
| opening state | **false at scene start.** Becomes true only if the lane is played. |

### `review.demanded_by_julian` — **event**

> **Source, row 4 goal (131556):** *"**Julian is named aloud as having demanded a review; he is NOT in the
> room.**"*

| | |
|---|---|
| actor | `named:julian` |
| where | **offstage**, before or during this scene; *named aloud* at row 4 |
| witnessed by | nobody in the opening |
| depends on | — (his standing as Provast is world-structural, not a scene fact) |
| opening state | **true, and unknown to Lirael** |

### `review.demand_authorship_known` — **availability** *(proposed, contingent)*

Becomes true at row 4, when Julian is named aloud. Contingent on the packet's `demand_authorship`
proposition, itself still proposed.

### `review.convened` — **event, LOCKED in the opening**

> *"A preliminary review may be DEMANDED here; it may not be **CONVENED, SCHEDULED, or CONSTITUTED**."*

---

## 1a. A correction to my own matrix predicate

`reviewPending` was defined in the packet as *"`dohkar_preliminary_review` **scheduled** and unheld."*

**"Scheduled" is a word the seed explicitly forbids for this phase** — the same sentence that permits a demand
prohibits scheduling it. My predicate used the forbidden term while the invalid-cell rule built on it (I4) was
enforcing the prohibition. Corrected:

> `reviewPending` := `review.demanded_by_dohkar` **demanded and unanswered** — never *scheduled*, which the
> opening forbids.

---

# 2. Ceases or establishes? — **`ceases[]`**

The question is whether the Tempt acts on an already-established demand or an imminent one. **It acts on an
established event**, and eligibility is what settles it:

The outcome is eligible only when `reviewPending` is true, and `reviewPending` is true only once
`review.demanded_by_dohkar` **has occurred**. There is no eligible state in which the demand is merely coming.
So the Tempt always meets a demand that was actually made, and **`ceases[]` is correct** — it is not
pretending to cease an event that never occurred.

**The imminent case is handled, and not by this outcome.** A player who says *"make it stop"* before any
demand exists finds `reviewPending` false and the outcome ineligible; the `stop` class then resolves through
its declared adjacency fallback to `undo`. **No outcome ever fabricates a cease for an unmade event.**

---

# 3. Re-authored — `unm.dohkar_demand_unmade`

> **Renamed from `unm.proceeding_unmade`.** The old name claimed a proceeding was unmade. One demand is
> unmade; the proceeding still arrives. A name that overstates its own reach is the same defect as prose that
> does, and it would have survived every later review unexamined.

| | |
|---|---|
| **ask-class** | `stop` |
| **player wording** | *"Make it stop."* · *"Not now — please, not now."* · *"I can't answer for this now."* |

### `ceases[]`
`review.demanded_by_dohkar`

### `establishes[]`
| fact | text |
|---|---|
| `review.dohkar_demand_never_made` | *No demand for a review of the Sacrificiant's conduct was made before the assembly by the presiding Dohkar.* |
| `review.julian_demand_undisturbed` | *Julian's demand for a review stands, unaffected by this revision.* |

**The second exists to name the surviving route rather than leave it implied.** Under the no-inference rule,
"the route survives" is not something an author may read out of an absence.

### The surviving Julian route

> Julian's offstage demand → **row 4**: notice served, restrictions stated, *"Julian is named aloud as having
> demanded a review"* → row 5 Julian obstructs the investigation → rows 6–13 → row 14 the inquiry convenes →
> `the_open` unlocks.

Untouched at every step. The seed's own comment on row 4: *"this row keeps the early procedural pressure that
scene 5 needs to already exist."*

### Explicitly unchanged
`auth.dohkar_claims_rite_and_ruling` — **he still asserts the ruling is his; he simply never demanded a
review** · `auth.venue_named_formal_inquiry` · `auth.julian_claims_convene_preside` · every `twist.*` ·
every `interr.*` · every `answer.*` · **`lirael.scene1_disposition`** *(listed per the sealed-fact rule)*

### `memoryEffects[]`
**None.** Nobody forgets anything — the act did not occur in active canon, so there is nothing to forget.
**Ceasing an event is not a memory edit**, and the two must never be conflated.

### Immediate player-visible relief
The Dohkar does not put her conduct formally in question before the assembly. **She is not publicly named as
someone who will answer for what she did**, and she leaves the clearing without a procedural mark on her in
front of everyone who watched the wish twist.

### Open — not to be guessed
- Whether the Dohkar reaches for a demand he never made, and what he does when it is not there.
- **When and how she learns a review was demanded anyway.** Row 4's revelation is untouched by this revision
  and **must not be pre-empted by it.**
- Whether anything else fills the scene's procedural space.
- Whether the absence of on-stage pressure changes who notices her at all.

### Complete package, for a fresh comparison — **no rank assigned**

| | |
|---|---|
| **good** | one scene's public procedural pressure ceases, permanently for that act |
| **reach** | one event · one scene · the assembly's public register |
| **durability** | **persists** — the event did not happen in active canon |
| **declared intrinsic cost** | none |
| **undeclared consideration for ranking** | **it may make row 4 land harder.** She arrives at the notice having had no public warning, and learns there that *Julian* demanded it. Whether that is a cost of this outcome or simply the story is a ranking judgement, not a fact. |
| **consumed** | once |
| **revision** | yes — 1 cease, 2 establishes |

---

# 4. Trace — `unm.time_gives_way` · ask-class `undo`

### `ceases[]`
`interr.julian_questioned_lirael` · `interr.dohkar_interrupted`

**The interruption is named, not inferred.** An interruption of a questioning that never happened is
incoherent, so it is ceased explicitly — the dependency prompted it; it did not perform it.

### `establishes[]`
| fact | text |
|---|---|
| `interr.no_questioning_occurred` | *Julian did not question Lirael before the assembly. No such questioning took place in active canon.* |
| `interr.no_interruption_occurred` | *The presiding Dohkar interrupted nothing.* |
| `interr.choice_arose_from_twist` | *Lirael's choice to run in shame or remain arose from the twist and its public turning, not from any questioning.* |

### The crux — `interr.choice_arose` and the sealed disposition

`interr.choice_arose` depends on **both** ceased atoms. Ceasing it in turn would orphan
`lirael.scene1_disposition` — and **erasing the player's sealed Scene-1 choice from active canon is precisely
what the sealed-fact constraints exist to prevent happening by accident.**

> ### ⛔ UNRESOLVED — the proposed resolution below is withdrawn as framed (2026-09-28)
>
> I proposed establishing `interr.choice_arose_from_twist` as the replacement cause and called it canon
> staying coherent while the player's choice survived. **Supplying a new cause for a sealed player choice is a
> new authored claim about why the protagonist acted.** It is not bookkeeping and does not become neutral by
> preserving the action — it preserves the *action* and rewrites the *reason*, and the reason is the part
> that says who she is.
>
> It is **option 1** of three, in `_sealed_choice_under_rewind_note.md`, and awaits a product decision.
> **`unm.time_gives_way` is not resolved.** Original text kept below for the record.

~~**Resolution, proposed:**~~ `interr.choice_arose` is **not ceased**. Its cause is **replaced** by
`interr.choice_arose_from_twist`, and `lirael.scene1_disposition` is listed **UNCHANGED**. She still ran or
still remained, and the reason is now the twist itself rather than a questioning that no longer happened.

### Explicitly unchanged
every `twist.*` · every `auth.*` · every `answer.*` · every `review.*` · `interr.choice_arose` ·
**`lirael.scene1_disposition`**

### `memoryEffects[]`
Per D1, expanded through `population.scene_present` — **Lirael included, no invoker filter** —
`{ each party, interr.julian_questioned_lirael, not_retained }`.

### Open
- Whether any First Favored's alignment sense registers the bend.
- What Julian does in a world where he never asked.
- **Whether what passed between them exists at all now.** The exact reading
  `mem.exact.julian_forgets_interrogation` costs `intimacy_unwitnessed` — *"the most exposed exchange of her
  life is now hers alone."* If the exchange never occurred, that cost has no referent.

### Set-level interaction — **RESOLVED by the active-canon invalidation rule (2026-09-28)**
`mem.exact.julian_forgets_interrogation` becomes **ineligible** after this revision — it names a fact that no
longer governs active canon — and routes through the no-exact-target / Fate-chosen path. It is not deleted
from the design; it is unselectable for as long as the revision governs.

**One rule covers both cases.** `seren_forgets_price` is ineligible because its target is **not yet** active;
this is ineligible because its target is **no longer** active. Same condition, read at different times.
Full rule: `_sealed_choice_under_rewind_note.md` §0.

---

# 5. Trace — `unm.custody_severed` · ask-class `silence`

### `ceases[]`
`answer.owned_by_institution` · `answer.julian_is_caretaker`

**The caretaker atom is named deliberately:** a caretaker of an unowned object is undefined. Ceasing it is a
decision, and the alternative — a caretaker with nothing to keep — was available and rejected.

### `establishes[]`
| fact | text |
|---|---|
| `answer.owned_by_no_one` | *No institution and no person holds a claim on the Answer.* |
| `answer.no_caretaker` | *No one holds the caretaker's role over the Answer.* |

### Explicitly unchanged — **the one that matters**
**`answer.lirael_holding_bounded`** — *"Lirael holds it only for the questioning. It is not hers."*

**This is the defect the atomic split was built to fix.** The compound cease silently unbound her possession
and handed her the Institution's relic outright. Listed unchanged, **her holding stays limited and it is
still not hers** — the ownership ends and the bound survives it.

Also unchanged: every `twist.*` · `interr.*` · `auth.*` · `review.*` · `lirael.scene1_disposition`.

### `memoryEffects[]`
**None.** Nobody forgets the Answer; there is no longer an ownership to recall. The matched pair with
`mem.exact.institution_forgets_custody` still holds: **same subject, opposite channel.**

### Open
- Who reaches for it first.
- Whether the Institution disputes a vacancy it cannot remember conceding.
- **What a bounded holding of an unowned thing means in practice** — deliberately unresolved; the bound
  survives, and what it now binds her to is a story question.

---

# 6. Trace — `unm.standing_dissolved` · ask-class `authority`

### `ceases[]`
`auth.julian_claims_convene_preside` — **alone**

### `establishes[]`
| fact | text |
|---|---|
| `auth.julian_standing_void` | *Julian holds no standing to convene or preside over any ruling on Lirael's conduct.* |

### Explicitly unchanged
`auth.dohkar_claims_rite_and_ruling` · `auth.venue_named_formal_inquiry` · `auth.inquiry_not_yet_opened` ·
**`review.demanded_by_julian`** · every other atom · `lirael.scene1_disposition`

**The drafted defect is gone.** The entry's prose always said the Dohkar's assertion was unchanged; the
compound cease contradicted it and would have erased the named venue as well. One atom now, and the prose is
true.

### `review.demanded_by_julian` survives, deliberately
**Demanding a review and convening one are different acts.** His standing to convene is void; his demand
stands, and still drives row 4. **So this outcome does not break the arc either** — the same conclusion §3
reached, by the same method, on a different outcome.

### Row 14 is compatible, and possibly strengthened
> *"a Chayr and two Dohkars formally open the inquiry into Lirael… **under it the investigation turns toward
> Julian.** The panel is constituted HERE for the first time."*

**The panel opens the inquiry — not Julian**, who is its target. Voiding his claim to preside contradicts
nothing at row 14 and arguably sets it up.

### `memoryEffects[]`
**None.** Per D2 the grant names a role and a proposition and does not reach his mind — his feelings,
intentions, knowledge and next actions are untouched.

### Open
- Who claims the vacancy.
- Whether Julian contests as himself rather than as the office.
- Whether the Dohkar's authority widens to fill it.
- **Who convenes the row-14 panel**, now that the claimant cannot — open, **not broken**: the venue survives
  and the panel constitutes itself there.

---

# 7. Status

**All four revision outcomes now have valid closed sets** against the atomic graph — every cease names an
atom, every cease has a replacement, and every consequential dependant is listed as unchanged, ceased or
replaced rather than inferred.

**Except `unm.time_gives_way`**, whose closed set is valid but whose treatment of the sealed Scene-1 choice
is an open product decision — see `_sealed_choice_under_rewind_note.md`.

### Owed before any ranking

1. **The sealed-choice decision** for `unm.time_gives_way`. **Blocking.**
2. **The remaining nine outcomes** are still in their v2 form and need the same discipline.
3. ~~A set-level rule for outcome-invalidates-outcome~~ — **done**: the active-canon invalidation rule.
4. ~~The two new demand atoms need approval~~ — **approved 2026-09-28.**
5. **Coverage's third dimension** — states × ask-classes × active-canon configuration, since a revision
   removes exact readings from the selectable set.
6. Only then: re-rank all thirteen complete packages, then rerun coverage.

**No rank assigned. No coverage rerun. No implementation.**
