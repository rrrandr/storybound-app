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

### `requiresActive[]`
`review.demanded_by_dohkar` — see §2; eligibility already guarantees it.

### `ceases[]`
`review.demanded_by_dohkar`

### Invalidated while this revision governs
**None.** No exact reading targets the demand.

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

# 4. RESOLVED — `unm.time_gives_way` · ask-class `undo`

> **Sealed-choice decision: OPTION 2 (Roman, 2026-09-28).** A genuine new player choice, **with permission to
> choose differently.** That is what makes *"time gives way"* a real Fate power rather than bookkeeping or an
> unexplained alteration of Lirael's character. The old choice stays in RECORD as witnessed history; it no
> longer governs active canon. Option 1's authored replacement cause is **withdrawn.**

### `requiresActive[]`
`interr.julian_questioned_lirael` — there is no questioning to unmake if none governs.

### `ceases[]`
| atom | why it is named |
|---|---|
| `interr.julian_questioned_lirael` | the grant itself |
| `interr.dohkar_interrupted` | an interruption of a questioning that never happened is incoherent |
| `interr.choice_arose` | the juncture is reopened, so the prior arising no longer governs |
| **`lirael.scene1_disposition`** | **the active disposition ceases.** Named explicitly per the sealed-fact rule — never inferred from ceasing its cause. |

### `establishes[]`
| fact | text |
|---|---|
| `interr.no_questioning_occurred` | *Julian did not question Lirael before the assembly. No such questioning took place in active canon.* |
| `interr.no_interruption_occurred` | *The presiding Dohkar interrupted nothing.* |
| `ceremony.replayed_unquestioned` | *The rite played through a second time, and no questioning of the Sacrificiant's guide occurred in it.* |
| **`lirael.choice_pending`** | *A choice is required of Lirael and has not been made.* |

### `lirael.choice_pending` — the rules that make it safe

> **No prior value is copied, constrained, or silently inherited. The player may choose differently.**

- **Until the player chooses, active canon holds `choice_pending` and nothing else.** No author may infer
  **run, remain, shame, resolve, or motive** — not from the prior scene, not from tone, not from what the
  reader saw.
- **On choosing**, `lirael.scene1_disposition` is sealed anew, bound to the **replayed** scene's uid and its
  own choice record. The prior instance is historical only.
- **Future canon reads only the new choice**, once made.

### `memoryEffects[]` — stated, never defaulted
`{ pc:lirael, interr.julian_questioned_lirael, not_retained }` ·
`{ pc:lirael, lirael.scene1_disposition, not_retained }` ·
and the questioning `not_retained` across **`population.scene_present`**, expanded with **no invoker
filter** per D1.

**Lirael has no memory of the ceased interrogation or of the old choice.** Stated here because the rule is
that such memory exists only when an authored outcome **grants** it — silence means absence, and absence is
not a grant.

### RECORD and the Tempt scope key
**The reader keeps the old scene**, readable in the archive, marked as revised. Per the active-canon rule,
their memory of it never makes a ceased fact eligible.

**The replayed scene inherits the original Tempt scope key**, so the new choice **does not reopen Tempt Fate
for that causal moment.** A rewind buys a second decision, never a second Fate intervention.

### Invalidated while this revision governs
**`mem.exact.julian_forgets_interrogation`** — its target no longer governs, so it is ineligible and its
wording routes through the Fate-chosen path. Not deleted; unselectable.

### Explicitly unchanged
every `twist.*` · every `auth.*` · every `answer.*` · every `review.*`

### Open — not to be guessed
- **The new choice's value.** Pending is a state, not a placeholder for the old answer.
- ~~Whether any First Favored's alignment sense registers the bend.~~ **REMOVED 2026-09-28** — an open fact
  that invites an author to assert an unlicensed capability is that capability with a question mark.
  Alignment-sense reads **wish misalignment** (16620), not ruptures.
- What Julian does in a world where he never asked.
- Whether what passed between them exists at all now — the exact reading's `intimacy_unwitnessed` cost has
  no referent in the revised canon.

### `choice_pending` — RESOLVED as an interaction contract (2026-09-28)
Both open questions are answered in `_choice_pending_contract_and_nine_audit.md` Part A. In brief: the replay
generates **up to** the choice and no further; while pending, **no continuation scene may be generated and no
planner may infer disposition, motive or aftermath**; both original options stay genuinely available; on
choosing, the disposition seals against the replayed scene uid and the gate clears; and on close, reload or
inaction the player **returns to the same unresolved choice** — never auto-selected, expired, or defaulted.

**Durability needs no new mechanism:** `choice_pending` is established by an appended revision and active
canon is derived by folding that log, so it survives a reload like any other revision. A stored flag would be
a second source of truth and would drift.

**`player_decision_required` does not conflict** — it is prompt text appended to the author's constraints
(`app.js:100482`), persisted nowhere and blocking nothing. `choice_pending` is the enforcement layer that
directive never had.

---

# 5. Trace — `unm.custody_severed` · ask-class `silence`

### `requiresActive[]`
`answer.owned_by_institution` — a claim that does not govern cannot be severed.

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

### Invalidated while this revision governs
**`mem.exact.institution_forgets_custody`** — it makes every party present forget *that the Answer was ever
the Institution's*. Once ownership no longer governs, **there is no active fact to forget**, so the reading is
ineligible and its wording routes through the Fate-chosen path.

**The same pattern for the third time**, now with a rule that covers it: `seren_forgets_price` (not yet
active), `julian_forgets_interrogation` (no longer active), and this one. **Three of the six exact readings
are conditional on active canon** — which means the exact set was never as static as it was drafted, and the
remaining-nine pass must declare `requiresActive[]` for each.

### Sealed fact
**`lirael.scene1_disposition` — UNCHANGED.** Listed explicitly; this outcome touches no timeline.

### Open
- Who reaches for it first.
- Whether the Institution disputes a vacancy it cannot remember conceding.
- **What a bounded holding of an unowned thing means in practice** — deliberately unresolved; the bound
  survives, and what it now binds her to is a story question.

---

# 6. Trace — `unm.standing_dissolved` · ask-class `authority`

### `requiresActive[]`
`auth.julian_claims_convene_preside` — a claim he has not made cannot be voided.

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

### Invalidated while this revision governs
**None** — and the near miss is worth recording. `mem.exact.dohkar_forgets_authority` looks like a casualty,
because it was drafted against the **compound** `inquiry_authority_claimed`. Under the atomic graph its real
target is `auth.dohkar_claims_rite_and_ruling`, which this outcome leaves standing, so it **remains
eligible**.

**That only holds because the exact readings get re-targeted to atoms.** Any exact reading still pointing at a
bundle would be invalidated by any revision touching any clause of it — a bundle-shaped blast radius. **Add to
the remaining-nine pass: every exact reading must name atoms, never bundles.**

### Sealed fact
**`lirael.scene1_disposition` — UNCHANGED.** Listed explicitly.

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

**All four are now traced**, each with `requiresActive[]`, a closed `ceases[]`, a non-empty
`establishes[]`, an explicit sealed-fact listing, and a declared invalidation set.

### Owed before any ranking

1. ~~The sealed-choice decision~~ — **resolved 2026-09-28 as Option 2.**
2. ~~The remaining nine outcomes~~ — **audited 2026-09-28**, atoms and `requiresActive[]` declared for all
   thirteen. Five findings raised there (F1–F5) are owed before ranking; see
   `_choice_pending_contract_and_nine_audit.md` Part B.
3. ~~A set-level rule for outcome-invalidates-outcome~~ — **done**: the active-canon invalidation rule.
4. ~~The two new demand atoms need approval~~ — **approved 2026-09-28.**
5. **Coverage's third dimension** — states × ask-classes × active-canon configuration, since a revision
   removes exact readings from the selectable set.
6. Only then: re-rank all thirteen complete packages, then rerun coverage.

**No rank assigned. No coverage rerun. No implementation.**
