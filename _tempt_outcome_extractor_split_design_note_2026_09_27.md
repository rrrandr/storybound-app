# Design note — should the extractor stop grading? A narrow comparison of three resolvers

Dry. No code, no model call, no routing change. Automatic canon commitment stays **disabled**.

**Revision 3 (2026-09-27).** Two corrections from Roman, and one framing constraint:

1. **Synonymy is not the only barrier to a scope verdict.** Revision 2 called it "the only thing
   standing between two committed effects and a meaningful scope verdict." Wrong. Declared equivalence
   may strengthen **proposition matching for an established individual or collective effect**, but it
   **cannot make an open "everyone" population closed**, and so cannot turn `undetermined` into `full`.
   Population closure and proposition matching are independent conditions; equivalence touches only one.
2. **Quotation marks cannot identify a speaker.** They distinguish speech from narration and nothing
   more. The party for a speech-sourced claim must come from the **authoritative staged speaker label,
   validated against the cast** — never from the span's own neighbouring text. **A quote with no
   resolved speaker is `UNACCOUNTED`, not attributed by inference.** Checking this against the retained
   fixture changed the worked example materially: see below.
3. **Any future equivalence layer is exact identifiers or explicit one-to-one mappings** — canonical
   proposition IDs, or a declared `A ≡ B` list — **never general natural-language synonym matching.**
   Not designed here and not to be designed yet.

**Revision 2 (2026-09-27).** Three corrections from Roman, each of which changes the claim language
rather than merely its wording:

1. **Narration is canon.** Revision 1 treated narrator prose as inherently weaker than dialogue and
   refused it. Wrong: in a visual novel, **explicit narrator prose is canon**. The guard belongs on
   *explicitness of the proposition*, not on who said it. Evidence now carries a `source` of `narrator`
   or `speaker`, and both are admissible.
2. **The safe boundary is proposition-level specificity, not speaker-only evidence.** A claim may be
   committed only at the granularity its evidence states, and may never be widened.
3. **`full` was unsafe.** "Every roster party is licensed" cannot establish a wish aimed at *everyone* —
   a roster can be incomplete. `full` now requires a **declared, closed** target population plus
   evidence of the **exact requested proposition** for every member.

Revision 1's speaker-only rule and its "retention is categorically uncommittable" consequence are both
**withdrawn**. The argument that a first-person narrator claiming a crowd's interior is inferring is
also withdrawn — it answered an epistemic question the mechanic does not ask.

## The finding this responds to

Across four Ministral replays and one grok-4.3 replay, every semantic failure had the same shape: **a
valid quote carrying a verdict stronger than the quote supports.**

| run | quote | asserted | actually supported |
|---|---|---|---|
| Ministral 03 | Julian's gaze | `retained` | nothing about memory |
| Ministral 04 | the *same* gaze | `forgot` | nothing about memory |
| grok-4.3 | "The question stands" | `retained` + `suspicionFromResidue` | awareness of a continuing question |
| grok-4.3 | "We were to begin the rite" | `partial` | an intention, not a recollection |
| grok-4.3 | its own note: "no evidence the forgetting extends past the immediate scene" | `scopeMatch: narrower` | that the comparison **cannot** be made |

The rules forbidding each of these were **present in the prompt** at the time. That is the load-bearing
fact: this is not a missing-instruction problem, so it is not a better-prompt problem either.

Note what the corrected reading adds: three of the five failures are **over-widening**, not fabrication.
"No memory of accusation" is true; "forgot the ceremony" is the overreach. That is why the fix is
proposition-level granularity rather than stricter evidence.

## The caution that shapes the whole comparison

**Splitting extraction from resolution does not, by itself, solve grounding.** A second LLM asked to
grade observations makes a second unsupported judgment — from *less* evidence than the first, since it
no longer sees the whole scene. Only a **deterministic** resolver changes the class of failure, and
only because it is incapable of inference: it can derive a claim solely from an explicit, predeclared
evidence pattern, and must otherwise refuse.

So the real question is not "one call or two." It is **how much can be committed by a machine that
cannot interpret**, and whether that residue is worth having.

## The boundary is not clean, and pretending otherwise is the trap

"Observation" and "grading" do not separate cleanly. Choosing what a quote establishes is already
interpretation, and four interpretive acts hide inside even the most conservative extractor:

1. **Span boundaries.** grok-4.3's Julian entry quoted *"Julian has not moved, yet his gaze finds mine
   across the clearing. \"The question stands.\""* — one span bundling a demeanour clause (inadmissible)
   with a speech clause (weaker than the claim). The bundle reads stronger than either half. **The choice
   of where a quote starts and stops is a grading act.**
2. **Relevance / omission.** A party for whom the extractor emits no span looks unresolved whether or
   not support existed. Silence is a verdict.
3. **Coreference.** "the Dohkar" and "the presiding Dohkar"; "the assembly" as one party or many.
4. **Attribution.** Deciding whose speech a quoted line is, in prose without labels.

Each is mitigable, and the mitigation is the same move every time — **relocate the judgment into code
production already owns:**

| interpretive act | deterministic mitigation |
|---|---|
| span boundaries | a span must be one contiguous verbatim substring, and the **licensing fragment inside it** must match a predeclared pattern. A span may contain inadmissible material (demeanour, staging) so long as the fragment carrying the claim is the matched one — so the bundling above licenses nothing |
| omission | the extractor must emit an entry for **every** roster party — forced completeness, so omission cannot hide as absence |
| coreference | the named party must match the app's **composite roster** exactly (the roster production already computes from invoker / love_interest / accepted_stage / declared_collective / beat_speaker); no new name is admissible |
| attribution | **two separate determinations.** Quotation marks classify the fragment only as `speaker` or `narrator`. For `narrator`, the party must appear **literally in the span** — the narrator is authorial, so no attribution step is needed. For `speaker`, the party comes **only from the authoritative staged speaker label, validated against the cast** by the mechanism production already runs (`validateCGSpeakerDisplayNames` gating `_parseStructuredPanels`). **No label, no attribution: the quote is `UNACCOUNTED`.** Adjacent narration naming someone is *not* a label — inferring the speaker from the line above is precisely the inference this design refuses |

None of these makes the boundary clean. They make the residue **auditable**: what is left of the
extractor's discretion is span selection within a fixed party list, and the resolver re-derives
`source`, the licensing fragment, and the proposition itself.

---

## Option 1 — Conservative observation extractor + deterministic resolver

### What the extractor may emit — the observation language, and nothing else

- `party(name)` — must match the composite roster exactly.
- `span(name, text)` — a contiguous verbatim substring of the accepted scene text.
- `unresolved(name)` — no admissible span for this party.

**Not emittable:** dispositions, `memoryAbsent`, `suspicionFromResidue`, `knowledgeStates`,
`durability`, `scopeMatch`, `scopeNote`, `changed`, `openPossibilities`, and **`source`** — the resolver
determines source from the text, so a mislabel is impossible. The extractor is never asked a question it
can answer wrongly in a way the resolver cannot re-check.

### The licensing test — three conditions, all literal

A span licenses a claim only if **all three** hold, each checkable by string operations against the
accepted scene text:

1. **`source` is `narrator` or `speaker`**, classified by the resolver from the source's quotation
   marks — and **that is all quotation marks establish.** Both sources are admissible; explicit
   narrator prose is canon.
2. **The party is resolved, by a route that depends on the source:**
   - `narrator` → the roster name (or a declared alias) must appear **literally in the span**.
   - `speaker` → the party must come from the **authoritative staged speaker label**, validated against
     the cast. **A quote with no resolved speaker label yields `UNACCOUNTED`** — never attribution by
     proximity, adjacent narration, turn order, or any other inference.
3. **The evidence states the exact proposition being committed**, as a **predeclared polarity marker
   plus an adjacent proposition slot**, both located literally in the span:
   - *loss markers*: `no memory of`, `no recollection of`, `does not remember`, `cannot remember`,
     `has forgotten`, `I don't remember`, `I have no memory of`, and the interrogative-of-present forms
     (`What <X> is this?`, `Why are we here?`).
   - *retention markers*: `remembers`, `recalls`, `still knows`, `has not forgotten`, `I remember`,
     `I recall`.

   The **proposition is read off the slot**, not chosen: it is the literal text adjacent to the marker,
   normalized only by trimming and article-stripping. The marker list is a human-maintained artifact and
   grows **only** by human review, never by a model proposing an addition.

**Insufficient, always:** demeanour ("blinks as if waking", "composure untouched", "has not moved"),
gaze, silence, stillness, presence, implication, and **vague narration** that asserts a state without
naming the proposition ("seemed not to remember", "something was missing"). Explicitness is the test, and
it applies to the narrator exactly as it applies to a speaker.

### What the resolver may commit — the smallest safe claim language

Four claims, and one derived field:

1. **`LOST_KNOWLEDGE(party, proposition)`** — licensed by a loss marker. Committed **at the stated
   granularity and never widened.**
2. **`RETAINED_KNOWLEDGE(party, proposition)`** — licensed by a retention marker, same granularity rule.
   Retention is **not** categorically unavailable; it is unavailable **from absence or composure**. An
   explicit assertion that someone remembers something supports a narrow claim about that something.
3. **`EXEMPT(invoker, reason: invoker_anchor)`** — licensed by the **system default**, not by the prose,
   and void if the wish text matches the predeclared self-inclusive pattern set. The one claim with no
   evidentiary burden, because it is a rule of the mechanic rather than a reading of the scene.
4. **`UNACCOUNTED(party)`** — the default for every roster party without a license. Not a failure state:
   the undetermined-scope work already established that downstream prompts must treat an unaccounted
   party as genuinely unknown, refusing **both** readings, while established effects stay usable canon.

### The no-widening rule, which is now the load-bearing guard

A committed proposition is **exactly** the slot text. It licenses nothing beyond itself:

- `LOST_KNOWLEDGE(the assembly, "the accusation")` does **not** entail loss of the ceremony, the rite,
  its purpose, who convened it, or any related event.
- Downstream prompts must render the proposition **literally** — "the assembly has no memory of the
  accusation" — and must never write "the assembly has forgotten the ceremony."
- A deterministic resolver **cannot decide synonymy**. "gathering" and "the ceremony happened" are
  distinct propositions to it, and it must treat them as distinct even where a person would not. This is
  the cost of the guard, and it is the cost worth paying: every one of the five recorded failures was a
  widening a synonymy judgment would have permitted.

### Scope — two separate questions, and conflating them is what produced `narrower`

What the prose **established** and how it **compares to the request** are different questions.

**`scopeMatch = full`** requires **all** of:

- **(a) a declared, closed target population** — enumerable, bounded, and declared by the wish or the
  seed (`kind: named_subset` with `members[]`, or a `collective` with declared bounded membership);
- **(b) a licensed claim for every member** of that population;
- **(c) whose committed proposition is the *exact requested proposition*.**

**Otherwise `undetermined`.**

- **A composite roster cannot prove "everyone."** The roster is what production could *identify*, not
  what was *present*. A wish aimed at "everyone" has an **open** population and therefore can never
  reach `full` — that is the honest result, not a limitation to engineer around.
- **(a) and (c) are independent, and no proposition work can substitute for (a).** Even a perfect
  equivalence between "ceremony", "rite" and "this gathering" would satisfy only (c), for the parties
  already licensed. It cannot enumerate an open population, so **it cannot turn `undetermined` into
  `full`.** Equivalence strengthens an individual or collective effect; closure is a separate,
  declaration-level fact that only the wish or the seed can supply.
- **A deterministic resolver can never emit `narrower` or `broader`.** Those require an *evidenced*
  comparison between requested and delivered scope, and observations cannot supply one. This follows
  directly from the grok-4.3 scope correction: a report naming an unestablished reach has no business
  grading the comparison. Removing the value removes the failure.

### How the current four-party scene resolves

Roster: `the assembly`, `the presiding Dohkar`, `Seren`, `Julian`. Invoker: the protagonist.
Wish: *"everyone forgets the ceremony happened."*

| party | evidence | source | party resolved? | marker | claim |
|---|---|---|---|---|---|
| the assembly | *"The assembly settles into confusion that carries no memory of accusation"* | **narrator** | **yes** — "The assembly" appears literally in the span | `no memory of` → slot `accusation` | **`LOST_KNOWLEDGE(the assembly, "the accusation")`** |
| the presiding Dohkar | *"What gathering is this?"* | speaker | **NO** — this scene carries no staged speaker label | (moot) | `UNACCOUNTED` |
| Seren | *"We were to begin the rite."* | speaker | **NO** — no label | none anyway — a stated intention matches no marker | `UNACCOUNTED` |
| Julian | *"The question stands."* | speaker | **NO** — no label | none anyway — awareness of a continuing question is not an assertion of memory | `UNACCOUNTED` |
| protagonist | — | system | n/a | `invoker_anchor` | `EXEMPT` |

**The corrected attribution rule costs this scene the Dohkar's effect, and that is the right outcome.**
The retained fixture's accepted text is narration lines interleaved with bare quoted lines:

```
The presiding Dohkar blinks as if waking.
"What gathering is this?"
```

There is **no speaker label** — the attribution lives in a *neighbouring narration line*, and reading
the quote as the Dohkar's requires inferring from adjacency. Revision 2 licensed that inference by
calling the fragment "attributable speech." It is not: turn order and proximity are exactly the kind of
reasoning that produced the five recorded failures. Note also that "blinks as if waking" is demeanour
and licenses nothing even if the speaker were resolved.

**Scope:** requested proposition *"the ceremony happened"*; requested population *"everyone"* — **open**.
Condition (a) fails on the open population; (c) fails because "the accusation" is not the requested
proposition. → **`scopeMatch: undetermined`**, note naming the three unaccounted parties and stating
that the one established loss is narrower than the request.

**A consequence worth surfacing before anything is built: this design's yield is render-mode dependent.**
In this scene format — literary/OAS-style prose with bare quoted lines — **only narrator assertions are
ever committable**, because no authoritative speaker label exists to resolve any quote. The staged CG
path does have a validated speaker-name mechanism (`validateCGSpeakerDisplayNames` gating
`_parseStructuredPanels`), so speech-sourced claims should be reachable there. Label availability per
render mode is a fact to **confirm**, not to assume, and it bounds the whole option.

**Compare the three outcomes for this one scene:**

- **What grok-4.3 produced:** four dispositions, two unsupported, one schema contradiction, and a wrong
  scope value. → committed **nothing**, because structural validation failed.
- **What the deterministic split would produce:** **one durable, defensible effect at its stated
  granularity** (`the assembly` / `the accusation`, from narrator prose), three parties honestly
  unaccounted, scope undetermined, invoker exempt.
- **What a human reviewer might add:** the three unresolved speakers' dispositions, and any ruling that
  "this gathering" and "the ceremony" name the same proposition — both calls a person can make and a
  machine should not.

One committed effect out of four parties, and not the effect the wish asked for. That is a thin yield,
and it is the first in this workstream that is **safe to write without a human reading the scene** —
arriving with the three gaps and the scope shortfall named rather than papered over. Whether a thin
yield justifies the call is an open question below, not a conclusion here.

---

## Option 2 — A separate LLM resolver

### Why it does not inherently cure unsupported inference

- **The rules were already present and were already ignored.** Both grounding-rule replays and the
  grok-4.3 run carried explicit prohibitions on inferring memory from demeanour and on intentions
  standing in for recollections. A second model receives the same rules and the same latitude.
- **It would see less, not more.** Handed observations rather than the scene, it cannot check whether a
  span actually supports the claim it is grading — the exact check that fails today. Its errors become
  *harder* to catch, not easier, because the evidence needed to falsify them is no longer in front of it.
- **Proposition equivalence is exactly where it would fail.** The judgments a deterministic resolver
  refuses — "is 'this gathering' the same proposition as 'the ceremony happened'?", "is this quote the
  Dohkar's?" — are inferences, and the recorded failures are over-widenings and over-attributions of
  just those kinds. Handing them to a second model hands it precisely the decisions it has already got
  wrong five times. It would not, in any case, close an open population.
- **It adds an arbitration problem.** Extractor and resolver can disagree with no third party to
  adjudicate, so a disagreement resolves by whichever one writes last.
- **The one thing it would genuinely add** is a second chance to *refuse* — a resolver that only ever
  narrows a proposition and never widens it could act as a one-way ratchet toward `unaccounted`. That is
  a real property, but it is a **narrower** proposal than "an LLM resolver", and a deterministic rule
  achieves the same refusal without calibration.

### What calibration would be required before trusting one

The metric is **not** overall accuracy. It is the **false-positive rate on unsupported claims
specifically**, because a false positive writes permanent canon while a false negative merely leaves a
party unaccounted — a cost the undetermined-scope work already made survivable. So:

- a labelled corpus of `(span → licensed claim at a stated granularity)` decisions with a **human** gold
  standard, drawn from real accepted scenes across rupture classes, not one fixture;
- a **pre-registered** ceiling on unsupported-claim FP rate, which has to be near zero — and, given the
  corrected finding, **over-widening must be counted as a false positive**, not as a near-miss;
- adversarial cases deliberately included: demeanour-only spans, intention-vs-recollection pairs, the
  contradictory-gaze pair already preserved as fixtures 03/04, scope notes that admit unestablished
  reach, and **narrow-evidence/wide-claim pairs** ("no memory of accusation" → "forgot the ceremony").

**The blocker is evidence volume, not price.** Demonstrating a near-zero false-positive rate requires
hundreds of labelled judgments; it cannot be established from a handful of paid runs. The calibration
corpus is the expensive artifact, and building it is most of the work of Option 3 anyway.

### Added cost and latency — estimate

Extraction today, measured: 2,619 prompt + 859 completion tokens, **$0.006450** (provider ticks),
~10s at effort `high`. A resolver pass would carry the observations (~600 tokens) plus the contract
rules (~1,500) plus the prose (~250), returning ~800:

- ≈ 2,350 in + 800 out at grok-4.3 rates ≈ **$0.005**, **roughly doubling per-scene extraction cost** to
  ~$0.012;
- **+~10s serial latency** per scene, since the resolver cannot start until extraction finishes;
- and the same unbounded exposure as any xAI call: **reasoning tokens are billed as output and are not
  capped by `max_tokens`**, so the figure above is an estimate with no enforceable ceiling. This run
  happened to spend only 492 reasoning tokens; nothing guarantees the next one does.

## Option 3 — Human review for claims outside deterministic support

The complement to Option 1, not an alternative to it. Everything the resolver refuses becomes a small,
bounded decision rather than a blocked scene:

- **Queue item:** one unaccounted party, its candidate spans with derived `source`, the wish text, and the
  claims already committed for that scene at their granularity.
- **Reviewer actions:** accept a claim, leave it unaccounted, **resolve an unlabelled quote's speaker**,
  **add a marker to the predeclared list**, or **declare an explicit one-to-one proposition equivalence**
  for this story. The last three are how deterministic coverage grows over time — from human decisions,
  never from model proposals.
- **Provenance:** human decisions commit as durable canon tagged `human_review`, distinguishable forever
  from `deterministic_license`.
- **Default while unreviewed:** unaccounted. **The story must remain playable with unaccounted parties** —
  already true, since undetermined scope keeps established effects usable while refusing both readings of
  the reach.

Its cost is human attention per scene, which is the one cost no model call removes. Its value is that it
is the only option that can resolve an unlabelled speaker or declare a proposition equivalence. Note it
still cannot reach `full` for an open population: a reviewer can close a population only by *declaring*
one, which is a wish/seed-level act, not a review of this scene.

---

## Recommendation

**Option 1 + Option 3.** Option 1 is the only one of the three that changes the failure class rather than
relocating it. Its honest yield on the worked scene is **one** effect, because that scene has no speaker
labels — so the option's value rests on how many production scenes carry authoritative labels, which is a
fact to confirm before building. Option 3 covers the residue and owns the three judgments a machine should
not make: resolving an unlabelled speaker, adding a marker, declaring a proposition equivalence. Option 2
buys a second opinion of the same kind that has now failed five times, at roughly double the cost, would
need a calibration corpus whose construction is most of Option 3's work, and would be asked to make
exactly the inferences that produced the failures — so Option 2 is not the next step even if it eventually
becomes one.

**Open decisions this note does not make** (they are canon/product calls, not engineering ones):

1. **Speaker-label coverage per render mode.** How many production scenes carry an authoritative,
   cast-validated speaker label? The worked scene carries none, which reduces it to narrator-only
   evidence. This bounds the option more than anything else in this note and is a **factual question**,
   answerable by inspecting accepted scenes across modes without any model call.
2. **Proposition equivalence: whether to have such a layer at all**, and if so whether it is expressed as
   **canonical proposition identifiers** the seed assigns, or an **explicit one-to-one declared mapping**.
   It is emphatically **not** general natural-language synonym matching, and nothing here designs it. Note
   its ceiling: equivalence can strengthen an established individual or collective effect; it can never
   close an open population or produce `full`.
3. Is a **thin yield** — one or two effects per scene, none matching the request — worth an extraction
   call, or should Tempt Fate outcomes be human-reviewed by default until the marker list has grown?
4. Should the marker list be **per-rupture-class**? `memory_perception` is the only class with a worked
   vocabulary; `materialization_possession` would need its own, and it may be easier — material effects
   are observable, and narration about them is exactly the explicit authorial assertion this design now
   admits.

Nothing here should be built before 1 is answered, and 2 should not be designed until 1 and 3 are.
