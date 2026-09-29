# PROPOSED replacement for `unm.witness_scattered` — `unm.testimony_closed` (rev. 3, final)

> **PROPOSED.** No ranking, no coverage computation, no implementation. Rev. 3 pins the three open details and
> **withdraws the favorability basis rev. 2 asserted**, which did not survive a source audit.

---

# 1. The source audit — both halves failed

Rev. 2 justified player favor with: *"the evidence against her is overwhelmingly witness-borne; what would
clear her is the Answer's reading."* **Neither half is supported by the seed.**

### Half A — "evidence against her is overwhelmingly witness-borne" — **FALSE**

There is **physical evidence, and the story already has a beat about hiding it.** The mouth-band is a real
object with tracked state (`app.js:9132`, `id: 'mouth_band'`, `priorState: 'removed'`) that **Lirael tore off
mid-Scene-1**, and an authored landed action exists for concealing it:

> `app.js:9307` — *"Lirael folds the torn mouth-band into her sash"* · exit state: *"Lirael has concealed her
> reason…"*

The `lirael_defensive_path` lane likewise offers *"conceals a specific fact, **object**, or admission."* So the
evidentiary picture includes at least one physical item **in her own possession**, and the design treats
concealing it as a live player move. **Witness testimony is not the whole case against her, and the seed never
says it is.**

### Half B — "what would clear her is the Answer's reading" — **UNSUPPORTED**

The Answer's only described capability is **live examination**, not retrospective attestation:

> `app.js:231366` — *"acuity is measured in a **controlled examination**… a Dohkar or Chayr holds the Answer
> and speaks a sequence of **INCOMPLETE wish formulations** — no sacrifice is ever named or offered, so nothing
> completes… the Answer makes each real misalignment **visible to the examiners**."*

It makes misalignment visible **as it is being spoken, in an examination**. **Nothing in the seed says it can
attest to who caused a completed wish to twist hours ago.** Rev. 2 asserted a forensic capability the world
has not been given.

> ### ⚠ This finding reaches past this outcome
> **`unm.the_answer_speaks` (ask-class `escape`) rests on the same unsupported capability.** Its whole grant is
> *"the Answer renders a reading that places the misalignment in Seren's own intent."* If the Answer cannot
> attest retrospectively, that outcome is inventing a world capability, not using one. **Flagged as a separate
> item; not revised here.**

### What replaces the claim

**Nothing asserts a balance of evidence.** The favorability case is rebuilt in §6 on what the closure
*actually does*, and the balance of evidence is moved into `open[]` where it belongs.

---

# 2. The ask, correctly classified

**Unmoored, Fate-chosen.** *"I want to disappear"* anchors no declared fact and no scope. It reads as
ask-class `unseen`, and **Fate selects this procedural closure as its interpretation.** These words never
guarantee this outcome. The player is owed the ask-class, not the result.

---

# 3. The additive procedural fact — `rite.witness_testimony_closed`

### 3a. Channel
The **review and investigation of the Sacrificiant's conduct at the rite** — the proceeding demanded in this
scene and formalised at row 4 as notice that *"her conduct at the rite is under investigation."* The seed
names no institutional archive, so no archive is invented.

### 3b. Witness scope — an **exact roster sealed at seal time**

> **Not "its witnesses."** The roster is **expanded from `population.scene_present` through its declared rule
> at seal, and frozen into the delta as an explicit list of party refs.** It is never re-derived, never
> re-interpreted later, and never widened by a reading of the word *witness*.

Which, per the approved definitions, is `population.assembly` **plus** `named:seren`, `named:julian`,
`role:first_sacrifice_presiding_dohkar`, **and `pc:lirael`.**

> **Lirael is in the roster, and this is not an oversight.** `population.scene_present` contains her, there is
> no invoker filter anywhere, and D1 governs. **So she cannot put her own account into the proceeding either.**
>
> **The spine already wanted this.** Row 4's authored end state is: *"END with Lirael formally under
> investigation, supervised, and **still unable to explain herself**."* The closure supplies a mechanism for
> the exact condition the plan already specifies. That is consonance with the spine, not a collision with it.

### 3c. `endsWhen: inquiry_opened` — **a condition, not an expiry**

**There is no guaranteed end.** The closure ends **if and when** `inquiry_opened` is committed. **If no inquiry
ever opens, the closure remains active in canon indefinitely.** It does not lapse, time out, or decay.

It does not bind the formal inquiry itself: a Chayr and two Dohkars are a different body with its own
authority, and Fate's reach into one intake does not follow the matter into The Open.

### 3d. Interaction with a later delta touching the inquiry — **declared, never inferred**

**A later reality revision that ceases or prevents `inquiry_opened` does not thereby end, extend, or make
permanent this closure.** Nothing about `rite.witness_testimony_closed` follows from what happens to its end
condition. Per the no-inference-from-absence rule, **such a revision must name this fact explicitly** in its
own closed set as **unchanged, ceased, or replaced.**

- Names it **unchanged** → the closure is now permanent in practice, and **that permanence is an authored
  choice with a visible author.**
- Names it **ceased** → the closure ends, and the delta says so.
- Says nothing → **the delta is malformed** and may not be sealed.

### 3e. Everything else about the fact

**Source scope:** testimony concerning **the ceremony**, from the sealed roster. Not physical evidence — **the
mouth-band is untouched and remains in her possession and concealable.** Not documents. Not the Answer. Not
testimony about anything else. Not anyone outside the roster.

**Witnesses keep everything.** Memory untouched and complete; they remain free to speak of the ceremony
**anywhere outside that proceeding.**

**No sides.** It bars testimony that would **accuse** and testimony that would **exculpate**, equally.

**Delta kind:** additive / revelatory — `establishes[]` only, **no `ceases[]`, not a revision.**
**`requiresActive[]`:** `twist.loose_note_heard`.
**`memoryEffects[]`:** **empty.** No mind is altered. *(This is what closes F3.)*

---

# 4. The player-facing *therefore*

**Everyone saw it. Everyone remembers it. And the thing deciding about her cannot ask any of them.**

Not the family who watched, not the guests, not Seren, not Julian, not the Dohkar who presided — **and not
Lirael.** They can talk about it anywhere else, to anyone, all they like. What none of them can do is say it
*into the proceeding.*

**She has not vanished, and nobody has forgotten her. She has become a matter that proceeding cannot take
statements about** — including from her.

---

# 5. Affected · unchanged · open

**Affected:** the review and investigation's intake of witness testimony about the ceremony, from the sealed
roster, for as long as the closure stands.

**Unchanged — stated, not assumed:** every party's memory in full · every `twist.*`, `interr.*`, `answer.*`,
`auth.*`, `review.*` atom — **the demand stands and the investigation runs**, it simply cannot call the people
who were there · `lirael.scene1_disposition` · **the mouth-band, its concealment, and every physical or
documentary channel** · **rumour**, which the spine needs at row 7 (*"Rumors spread through the city; the PC's
reputation collapses"*) — **what she bought is procedural silence, not social silence.**

**Open:**
- **Whether the case against her can be made without witnesses at all** — the seed does not settle the balance
  of evidence, and §1 withdrew the claim that it does. This is genuinely open, and it is the largest thing the
  player cannot know when they spend.
- **Whether the closure ever ends.** If no inquiry opens, it does not. Persistence is a live possibility, not
  an edge case.
- Whether the proceeding advances on the band, the rite's order, or something else.
- What the Dohkar does with an investigation he cannot take statements into.
- What Julian makes of his own account being closed with everyone else's.
- **Flagged interaction:** row 5 is *"Julian quietly prevents the investigation from uncovering the truth."*
  This narrows what that investigation could have drawn from witnesses, so his obstruction has less to do on
  that channel. The row does not break — other surfaces remain — but the interaction is real and the player
  bought it.

**Intrinsic cost:** **`undefendable_by_witness`** — no witness may speak **for** her, **and she may not speak
for herself into the proceeding.** The closure is total and takes no side.

---

# 6. The favorability case, rebuilt on what is actually supported

**Not asserted:** that the case against her is witness-borne, or that some other evidence would clear her.
Both were withdrawn in §1, and the balance of evidence now sits in `open[]`.

**What is supported, and sufficient:** a proceeding aimed at her **cannot take a statement from any of the
roughly two dozen people who watched it happen, nor from the three named participants**, for a duration that
may never end. That is a large, concrete, durable impediment to the one process forming against her, and it
holds regardless of what the rest of the evidentiary picture turns out to contain.

**What it costs is equally concrete**, and includes something rev. 2 never said: **she cannot explain herself
into that proceeding either.** Her ward cannot say she never touched the wish; the Dohkar cannot say her hands
were where they should be; and Lirael cannot give her own account. **The seed's own row 4 ends with her
"still unable to explain herself"** — this outcome is the mechanism for that condition, and the player is the
one who chose it.

**So the package is a real trade with a real unknown at its centre**, not a calculated advantage: she has
silenced every mouth that could have accused her, including the one that could have defended her, and **she
cannot know whether the case needed those mouths at all.**

**Rank: not assigned.**

---

# 7. If approved

- Replace `unm.witness_scattered` with `unm.testimony_closed` in the outcome set and the approval sheet.
- The `unseen` ask-class keeps its own answer; no fallback engaged, no class stranded.
- **F3 closes.**
- **Separately owed, raised by §1:** `unm.the_answer_speaks` rests on an unsupported Answer capability and
  needs its own source audit.
