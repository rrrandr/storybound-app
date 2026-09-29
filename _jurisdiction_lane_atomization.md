# Atomic-lane pass — `julian_jurisdiction_challenge`

> **Atomization and one draft-trace update only.** No outcome revisions, no ranks, no coverage, no
> implementation.

---

# 1. The three disjuncts, traced separately

## Source

**Lane label** (`app.js:131356`):
> *"Julian **challenges jurisdiction**, **reframes the accusation politically**, or **contests who has
> authority to rule**."*

**`signalRx`:** `jurisdiction | challenges? (?:the )?dohkar | contests? (?:his |the )?authority | reframes? | political(?:ly)?`

**The only authored event frame** (`app.js:131489`, `reversal`):
> *"Someone seizes control of who gets to rule here: **Julian challenges the presiding Dohkar's
> jurisdiction, reframing the accusation as his own to answer rather than Lirael's — a real jurisdictional
> contest over authority**, not another question put to Lirael."*

## Disjunct 1 — challenging jurisdiction · Disjunct 3 — contesting authority to rule

**These are not two events in this seed. The authored frame fuses them in one clause:** *"challenges the
presiding Dohkar's jurisdiction … **a real jurisdictional contest over authority**."* Jurisdiction and
authority-to-rule are named as the same contest, not as a sequence or a pair.

**Corroborated by how the lane is detected** (`app.js:9231`): a real sample matched this lane because *"its
`tactical_move` genuinely contained 'jurisdiction'"* — **one word, one act.** The `signalRx` alternatives are
phrasings of a single act for detection, **not a list of canonical events.**

→ **One atom.**

## Disjunct 2 — politically reframing the accusation

**The frame does not contain it.** It says *"reframing the accusation **as his own to answer rather than
Lirael's**"* — a participial clause naming a **consequence** of the challenge, and saying nothing about
political framing. The word *politically* appears **only in the lane label and the regex**, with **no
authored meaning anywhere in the seed.**

→ **Not atomized.** Declaring a `politically_reframed` atom would be inventing a distinction the source never
makes. **What the frame does give independent meaning to is the shift in who must answer**, which is a state,
not a manner.

---

# 2. Declared atoms — two, not three

| atom | kind | source phrase | depends on |
|---|---|---|---|
| **`challenge.jurisdiction_contested`** | **event** | *"Julian challenges the presiding Dohkar's jurisdiction … a real jurisdictional contest over authority"* (131489); label disjuncts 1 and 3 | **`auth.dohkar_claims_rite_and_ruling`** — you contest the jurisdiction someone has asserted |
| **`challenge.answerability_shifted_to_julian`** | **state** | *"reframing the accusation as his own to answer rather than Lirael's"* (131489) | `challenge.jurisdiction_contested` **and** some active charge against Lirael |

**Not declared:** any `politically_reframed` atom — §1, disjunct 2.

---

# 3. Which atoms depend on `accusation.family_accused`? — **Neither.**

## 3a. `challenge.jurisdiction_contested` — depends on the Dohkar, not the family

The frame names its object exactly: *"challenges **the presiding Dohkar's** jurisdiction."* **What is
contested is the Dohkar's assertion of authority** (`auth.dohkar_claims_rite_and_ruling`), not any accusation
by anyone. **No dependency on the family accusation.**

## 3b. `challenge.answerability_shifted_to_julian` — depends on *a* charge, and one exists invariantly

It requires **some** live charge against Lirael. It does **not** require the family's.

> **`app.js:131286`, `interrogation_interrupted`:** *"Julian, the Provast, has ALREADY questioned Lirael
> before the assembly — intimately, **as an accusation through desirability**."*

**The seed calls Julian's interrogation an accusation, and it is an opening-phase invariant.** So a charge
against Lirael is present in **every** reachable opening state.

**Corroborated by the family lane's own frame** (`app.js:131490`): the family's remedy demand *"redirect[s] the
confrontation **from Julian's accusation** to a new formal complaint"* — **the seed explicitly names Julian's
accusation as the one already in play** before the family acts.

→ **Neither atom depends on `accusation.family_accused`.**

---

# 4. Julian's formal-inquiry claim stays distinct — **and unaffected**

**`auth.julian_claims_convene_preside`** — *"Julian agreed and publicly claimed authority to convene and
preside over it"*, a clause of `inquiry_authority_claimed` (131288), concerning **the formal inquiry** and its
named venue.

| | |
|---|---|
| **it is not** | the jurisdiction challenge |
| **it concerns** | convening and presiding over the **late-Issue-1 formal inquiry** |
| **the challenge concerns** | the **presiding Dohkar's** jurisdiction over the matter **now** |
| **status here** | **unaffected by anything in this pass.** Not a companion of any accusation rewrite. |

**I conflated these two once; the separation is recorded so it cannot happen again.**

---

# 5. Draft-trace update — `unm.the_accusation_unmade`

## `ceases[]` — **the conditional companion is removed**

| atom | condition |
|---|---|
| **`accusation.family_accused`** | always — the selected atom |
| ~~a jurisdiction-challenge atom~~ | **NONE REQUIRED** — §3 |

**Ceasing the family's accusation orphans nothing.** The challenge contests the *Dohkar's* jurisdiction, and
the answerability shift rests on *Julian's* accusation — which is an opening invariant and untouched here.

**`challenge.jurisdiction_contested` and `challenge.answerability_shifted_to_julian` are listed in
`unchanged[]`**, explicitly, alongside `auth.julian_claims_convene_preside`.

**The escape outcome's closed set is now complete and needs no per-instance companion analysis.** The blocker
this pass existed to clear is cleared.

---

# 6. Consequence upstream — **I3 is in question**

**I3** — *`jurisdictionChallengeMade ∧ ¬accusationMade` is invalid* — was upheld on the reading that a
challenge presupposes **the family's** charge. **§3 shows that reading was wrong.**

The charge a jurisdiction challenge presupposes is satisfied **invariantly** by
`interr.julian_questioned_lirael`, the seed's *"accusation through desirability."* So a challenge can stand in
states where `accusationMade` is false, and **I3 excludes nothing real.**

### What follows, stated but not acted on

- **I3 was the only live exclusion in the opening matrix.** Without it the valid-cell count rises from **24**
  toward the full 32 reachable states.
- **Every coverage figure computed under I3 is stale.**
- **This is a matrix decision, not an outcome decision**, and it is yours.

> **Not recomputed, not re-ranked, not applied.** Flagged here because it was found here, and because a
> stale exclusion silently shrinking the domain is exactly the failure the audits exist to catch.

---

# 7. Status

| | |
|---|---|
| lane atomization | **2 atoms declared**, 1 disjunct deliberately not atomized |
| `unm.the_accusation_unmade` | **companion removed; closed set complete.** Still **blocked** pending approval — this pass did not approve it. |
| `auth.julian_claims_convene_preside` | distinct, unaffected, conflation recorded |
| new open item | **I3 is unsupported as written** (§6) — matrix decision, not taken here |

**No outcome revisions. No ranks. No coverage. No implementation.**
