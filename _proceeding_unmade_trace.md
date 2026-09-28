# Focused editorial trace — `unm.proceeding_unmade`

> **Trace only.** No coverage rerun, no re-ranking, no implementation. The other three revision outcomes are
> untouched in this pass.

---

# 0. Decision recorded — `lirael.scene1_disposition` APPROVED as a sealed player-choice fact

**Not a general mutable state field.** Approved under five binding constraints:

| | |
|---|---|
| **closed values** | only the authored Scene-1 player choices. No other value is representable. |
| **creation** | created **only** when that choice is accepted and sealed |
| **before then** | **absent / unresolved — never defaulted.** Absence is a legible state, not a value. |
| **binding** | bound to its originating `sceneUid` **and** its choice record |
| **under revision** | a later revision must list it explicitly as **unchanged, ceased, or replaced** |

> **Its value must never be guessed from current UI or later prose.** Not from what the screen shows, not
> from what a later scene implies, not from what an author assumed while writing. The sealed choice record is
> the only source.
>
> **And never inferred from ceasing the interrogation.** `interr.choice_arose` and `lirael.scene1_disposition`
> are separate atoms. Ceasing the event that produced the choice says **nothing** about the disposition; a
> revision that means to touch it must name it. This is §1's advisory-dependency rule at its sharpest — the
> place where an inferred cascade would silently rewrite what the player actually chose.

---

# 1. The outcome as drafted

| | |
|---|---|
| **player wording** | *"Make it stop."* · *"Not now — please, not now."* |
| **ask-class** | `stop` |
| **drafted claim** | *"the review is not deferred — **it is unmade.** The demand the Dohkar put before the assembly ceases to have been made."* |
| **drafted rank** | **10**, zero cost |

---

# 2. Correction — my "orphans the arc gate" finding was overstated

The previous trace warned this outcome might orphan the story's route to `inquiry_opened`, on the strength of
`the_open`'s `deferral_reason_key: 'preliminary_process_before_formal_inquiry'`.

**`deferral_reason_key` is not part of the gate.** `_checkArcConstraint` (`app.js:206425–206430`):

```js
if (match.availability_state !== 'locked') return { available: true, ... };
var cond = match.unlock_condition;
if (cond && cond.type === 'committed_event_id' && _isStoryEventCommitted(cond.event_id)) {
  return { available: true, ..., unlockedBy: cond.event_id };
}
return { available: false, ..., reason_key: match.deferral_reason_key };
```

The gate is **solely** `_isStoryEventCommitted('inquiry_opened')`. `deferral_reason_key` is a string returned
**on the failure path**, to explain a lock to the caller. It is explanatory copy, never a precondition.

**So no arc constraint depends on preliminary process.** There is exactly one `arcConstraints` entry in the
seed (`starter_first_sacrifice:the_open`), and it turns on one committed event. **Finding withdrawn.**

---

# 3. Every Issue-1 gate that depends on preliminary process

| gate | what it actually requires | depends on the scene-2 review demand? |
|---|---|---|
| `the_open` availability | `inquiry_opened` committed (row 14) | **No** — §2 |
| row 4 — notice and restriction | the presiding Dohkar serves notice that her conduct is under investigation | **No** — §4 |
| row 5 — *"Julian quietly prevents the investigation"* | an investigation already existing, which **row 4** opens | **No**, transitively |
| rows 6–13 | the investigation running | **No**, transitively |
| row 14 — the inquiry convenes | *"The panel is constituted HERE for the first time; nothing earlier may have convened it"* | **No** — it forbids earlier convening, requires no earlier demand |

**No gate in Issue 1 reads the scene-2 demand.** The load-bearing gate is row 4, and §4 is why it holds.

---

# 4. The surviving route, named explicitly

**Row 4's own goal text carries it** (`app.js:131556`):

> *"NOTICE AND RESTRICTION — procedural pressure closes on Lirael and NOTHING is convened. The presiding
> Dohkar serves her formal notice that her conduct at the rite is under investigation, and states the
> restrictions she must keep while it runs. **Julian is named aloud as having demanded a review; he is NOT in
> the room.**"*

**The demand that drives Issue 1 is Julian's, made offstage, and it is not the demand this outcome ceases.**

The seed's own authoring comment confirms row 4 is the load-bearing step:

> *"this row keeps the early procedural pressure that scene 5 ('Julian quietly prevents the investigation')
> needs to already exist."*

The route to the late spine is therefore:

> **Julian's offstage demand → row 4 notice + investigation opened → row 5 Julian obstructs → rows 6–13 →
> row 14 inquiry convenes → `the_open` unlocks.**

Every step is independent of whether the presiding Dohkar applied pressure in scene 2.

**This also matches the editorial packet already drafted:** the proposition `demand_authorship` is *"that
**Julian** is the one who demanded the review of her conduct"* — authorship of the demand was already canon,
already Julian's, and already scheduled for later revelation.

## 4a. Required correction to the atomic graph

The proposed atom `review.demanded` **conflates two different acts by two different parties.** It must split:

| atom | kind | source | actor |
|---|---|---|---|
| `review.demanded_by_dohkar` | **event** | the scene-2 lane `dohkar_preliminary_review`, `objectiveActor: 'the presiding Dohkar'` — pressure applied **on stage** | the presiding Dohkar |
| `review.demanded_by_julian` | **event** | row 4 — *"Julian is named aloud as having demanded a review; he is NOT in the room"* | Julian, **offstage** |

**`unm.proceeding_unmade` ceases `review.demanded_by_dohkar` only.** Julian's demand is a separate act by a
separate party, not present in the scene, and is not named in the closed set.

---

# 5. The verdict, and the cost of it

## The outcome IS authorable. It is not the outcome that was drafted.

**Drafted claim:** *"the review is unmade."* **What the trace supports:** the Dohkar's demand ceases; **the
investigation still arrives at row 4 on Julian's demand.**

The player who says *"make it stop"* gets the procedural pressure lifted **off this scene** — real, and
permanent for the act that was made — and the matter still reaches her two rows later from a direction she
could not see. That is a coherent and, I think, a better outcome than the one drafted: **Fate stopped what
was in front of her, and what was behind her kept coming.** It is also the shape the story already wanted,
since the demand was Julian's all along.

## Three consequences, none applied in this pass

1. **The prose claim must change.** *"Nothing is scheduled, because nothing was ever called for"* is false —
   Julian called for one. The entry's `therefore` overstates its own reach.
2. **Rank 10 / zero cost is no longer obviously right.** The good is smaller than drafted, and there is an
   argument that arriving at row 4 to find Julian named as the demander is *worse* for her than the Dohkar's
   open pressure would have been. **Re-ranking is explicitly out of scope here.**
3. **`review.demanded_by_julian` must be declared** before this outcome can state what survives, since a
   revision must name the surviving route rather than leave it implied.

---

# 6. Established and open facts

### `establishes[]` — proposed

| fact | text |
|---|---|
| `review.dohkar_demand_unmade` | *No demand for a review of the Sacrificiant's conduct was made before the assembly by the presiding Dohkar.* |
| `review.demand_authorship_undisturbed` | *Julian's demand for a review stands, unmade and unaffected by this revision.* **Named explicitly so the surviving route is declared, not inferred from an absence.** |

### Explicitly unchanged — stated, not assumed

`auth.dohkar_claims_rite_and_ruling` · `auth.venue_named_formal_inquiry` · `auth.julian_claims_convene_preside`
· every `twist.*` atom · every `interr.*` atom · `lirael.scene1_disposition` · every `answer.*` atom.

### Must remain OPEN — not guessed

- Whether the Dohkar reaches for a demand he no longer made, and what he does when it is not there.
- **When and how Lirael learns a review was demanded anyway** — row 4's revelation is untouched by this
  revision and must not be pre-empted by it.
- Whether the absence of on-stage pressure changes who notices her at all in this scene.
- Whether anything else fills the scene's procedural space.

---

# 7. What this pass did and did not do

**Did:** withdrew an overstated blocker; established that no Issue-1 gate depends on the scene-2 demand;
named the surviving route from the seed's own text; split a conflated atom; approved
`lirael.scene1_disposition` under sealed-fact constraints.

**Did not:** re-rank, re-scope, rerun coverage, touch the other three revision outcomes, or implement
anything. `unm.time_gives_way`, `unm.custody_severed` and `unm.standing_dissolved` remain blocked and
untraced against the atomic graph.
