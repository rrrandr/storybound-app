# SEED CALIBRATION — decision memo (no code, no seed edit) · 2026-09-06

Scope: two questions surfaced by retest #2 under contract v2 — (1) which of the presiding
Dohkar's facts may establish which of his conditions, and (2) whether the ceremonial sash is
present in the scene. Sources: the First Sacrifice seed (`public/app.js` `sceneOne` at
~126318–126460: `groundedObjects`, `roleInstances[].cPlusFacets`, `eventFacts`, `setting`,
`present`, `narrator`, `aboutToHappen`; `visualCanon` at ~126480), the option composer
(`app.js:128560–128630`), and the twelve 14B plans (`_stage0_out/retest_14b`, `retest2_14b_v2`).
**Nothing here is edited. Every alternative is written so it can be applied as a seed change alone.**

---

## 1 · The Dohkar: condition ↔ fact linkage

### What the seed authors today

Two facts about him (`eventFacts`, both `role: actor`):

- **E5** — "holds the rite to its fixed order — invocation, then sacrifice, then desire — and calls
  for the cost to be spoken before the miracle"
- **E6** — "trained, perceives the finer misalignment sooner than the assembly and reacts to the
  wording as it lands"

Five facets, each with two pressures and an `evidence_requires` pattern. An option is offered
only when a pressure's pattern matches a fact **about him** (`_cpComposeOptions`: word match
AND ownership). What that yields for this scene:

| facet | pressure (condition) | `evidence_requires` | matches | offered as |
|---|---|---|---|---|
| ritual contempt | a rite he has performed many times | `rite\|liturgy\|ceremon\|the same way\|generations\|invocation` | E5 ("rite", "invocation") | OPT-6 |
| ritual contempt | a procedural step nobody checks | `order\|step\|clause\|procedur\|protocol\|decorum` | E5 ("order") | OPT-7 |
| sacrificial arrogance | an offering being named aloud | `offering\|memory\|sacrifice\|cost\|names? (?:it\|her)` | E5 ("sacrifice", "cost") | OPT-8 |
| sacrificial arrogance | a cost he judges too small for what is being asked | `cost\|price\|small\|paid\|enough\|offering` | E5 ("cost") | OPT-9 |
| peer jealousy | (both pressures) | `Julian\|observer\|…` / `younger\|youth\|…` | nothing about him | — |
| compulsive pedagogy | a youth performing a rite for the first time | `Seren\|youth\|first time\|first sacrifice\|kneel` | E3/E4 are Seren's, not his | — |
| compulsive pedagogy | an error a child could still be shown how to fix | `error\|wrong\|mistake\|blur\|imprecis\|correct` | E4 is Seren's | — |
| kindness to the poor | (both pressures) | `barefoot\|…` / `beneath\|edge\|…` | roster/place facts are not pressure-eligible | — |

**E6 establishes nothing.** Every one of the four offered options rests on E5 alone. Yet E6 is the
fact the planner keeps reaching for: in retest #2 four of six plans cited `enacts_evidence_id: E6`
for OPT-8, and the acts were "fingers tighten / tap once — his signal to halt / traces the
correction in the air before Seren finishes the wrong word". Under the contract those are correctly
rejected: the act enacts a fact that does not establish the cited condition. Under the canon they
are exactly what a presiding Dohkar does when a wish misaligns under his ear.

### The canon behind the choice

`aboutToHappen` (4): "The trained ones (you, the presiding Dohkar, Julian) perceive the finer
misalignment sooner." Then (5): the PC is the sealed supervisor and is forbidden to interfere.
So a Dohkar who moves first on the misalignment is not being diligent — he is stepping into the
supervisor's office. That is the sacrificial-arrogance truth verbatim: "In questions of sacrifice
he assumes his judgement carries an authority that other people have not earned." E6 is therefore
the *natural* evidence for that facet; the seed simply never linked it.

### Alternatives (each a seed-only change)

| | change | effect | risk |
|---|---|---|---|
| **A · add a third pressure to `sacrificial_arrogance`** | `{ text: 'a wish misaligning under his ear before the supervisor has ruled', evidence_requires: 'misalign\|wording\|sooner\|perceiv\|reacts?' }` | E6 establishes it → a new option (OPT-10) is offered; the acts 14B already writes (halting, correcting first) become **valid**, bound to E6, under the truth they actually express; act gate satisfied by "misalign/wording/sooner" | none to the other facets: the pattern shares no word with contempt/pedagogy patterns; guardrails already scope per facet |
| B · widen OPT-8's pattern | append `\|misalign\|wording` to "an offering being named aloud" | E6 also establishes OPT-8 | conflates two conditions under one label — "an offering being named aloud" would be provable by a fact about misalignment; the condition text stops meaning what it says |
| C · give E6 a second participant (`pc:lirael`, role `target`) and leave patterns alone | E6 becomes joint | no option changes; the planner still cannot bind E6; it only widens ownership | solves nothing |
| D · leave as is | E6 stays engagement-only ("reacts to the wording") | every Dohkar plan that enacts the obvious fact keeps failing; the only passing acts must be about the offering or the cost (E5), which 14B produced 0 times in 12 plans | the retest keeps measuring a seed gap as a planner fault |

**Recommendation: A.** It is authored canon (the supervisor rule already written in
`aboutToHappen` 4–5), it is scoped to the facet the behaviour actually reveals, and it does not
weaken the existing conditions. Note the forbidden restatement already on that facet
("assumes his judge?ment|arrogant about sacrifice|believes he alone (knows|decides)") continues to
apply, so the truth still cannot be stated outright.

Expected effect on the frozen plans (not run, read off the fault lists): the four `E6` binding
faults clear only if the plan had cited the new option; they cited OPT-8, so the *frozen* plans
do not move. A future plan that picks the new option with the same act would pass the binding
and the act gate. The three "act never engages the condition" faults on OPT-8 are unaffected —
under A they simply stop being the only road open to the planner.

**Also worth knowing before deciding:** pedagogy's pressures can never be established in this
scene, because the only error-shaped facts (E3/E4) are Seren's and ownership-gated. If the
intended Dohkar beat is teaching-by-correction, that needs a Dohkar-owned fact
("the Dohkar names the slip before Seren finishes it", role actor) — a separate authoring choice,
not proposed here.

---

## 2 · The sash: is it in the scene?

### What the seed says

- `groundedObjects` O5: "the officiating Sacrificiant's one ornamented ceremonial sash",
  now `owner_ref: 'pc', head: 'sash'`. The block's own comment claims "every one of these is
  already named in the setting / present / narrator text below."
- **It is not.** `setting`, `present` and `narrator` name the band (O4), the Veilweave (O6), the
  canopy, the trees, the carpet, the assembled people — never a sash (checked by token; "sash"
  is absent from the ground text). The sash exists only in `visualCanon.PC` ("the same sheer
  gossamer tunic as everyone + ONE ornamented ceremonial SASH (never robes)") and in the world
  text at ~126385 ("THE SACRIFICIANT SEAL — worn by whoever supervises …").

So the sash is canon and it is *worn by Lirael in this scene* (she is the officiating
Sacrificiant), but the scene text the validators ground against never mentions it. Under the
corrected contract a valid `O5` id is now grounded by identity, so the mismatch no longer rejects
plans — but it still matters in two ways: (i) the author's scene material never introduces the
sash, so a plan built on it asks the author to stage an object the reader has not been shown;
(ii) 14B put the sash on the **Dohkar** in three of six plans ("his ceremonial sash", "tapping
his sash"). The possessive check catches "the Dohkar's sash"; it does not catch "his sash".

### Alternatives (seed-only)

| | change | effect | risk |
|---|---|---|---|
| **A · name it in `narrator`** | after "As the officiating Sacrificiant your mouth is ceremonially COVERED…": add one clause — "…and you wear the one ornamented ceremonial sash of the office; nobody else here does." | the sash enters the ground text, the author's scene material, and the fact corpus (E7 is narrator-owned → PC); the ownership sentence gives the possessive check and the author an explicit rule | +~90 B on the planner request and the author payload; none structural |
| B · move it to `present` | add to the PC's line in `present` | same grounding; `present` describes bodies on stage, which is the right register | `present` is currently the roster text; adding costume to it blurs a field the stage contract parses for presence — prefer A |
| C · drop O5 from `groundedObjects` | the sash stays visual canon only | no plan can cite it; 14B's fondness for it (6/6 plans touched the sash somewhere) turns into ungrounded-prop faults | loses a genuinely canon, PC-owned object that is the best handle for the "sealed supervisor" beat |
| D · leave as is | grounded by identity, absent from text | plans may build E+ and the fusion on an object the author was never shown | the exact "author overrules the plan" failure that started the C+ work |

**Recommendation: A**, with the ownership clause. It costs one sentence, makes the seed's own
comment true, and gives the residual "his sash" leak a text rule the author reads. If you take A,
also consider whether `visualCanon.PC` should say the sash is **not** worn by the Dohkar (a
presiding Dohkar's dress is unspecified today, which is what let three plans dress him in one).

---

## 3 · What this memo does not decide

- Whether the Dohkar's *other* facets (jealousy, kindness) should be establishable in Scene 1 —
  none of their patterns can match a fact about him here, so they are offered nowhere. That is
  consistent with the seed's design (kindness is a later beat) and is not a defect.
- Anything about the planner model. After the three corrections the frozen plans still fail on
  planner content (the 18-plan replay in `planner_contract_v2_corrections.md`); the two seed
  changes above remove the two places where the seed, not the planner, was the reason.

**Decision needed:** 1A (new arrogance pressure established by E6) and 2A (sash named in
`narrator`, with ownership). Both are one-line seed edits; neither is made here.
