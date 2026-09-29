# VALIDATOR TRIAGE — decision memo (2026-09-05)

Source: the six frozen stage-0 plans, their requests, the product's own fault text, the seed's
`sceneOne`, and the validator code (`app.js` 127747–127830, 128202–128260, 264849–265420). Every
rule was replayed on the six plans with a replica of the product's functions
(`_stage0_out/triage/triage.json`); the replica agrees with every product verdict. No code, prompt,
threshold or route was changed. No model was called.

**Blind state.** This memo names no plan and quotes no plan text. Per-plan detail, which is
key-linked, is in `_stage0_out/triage/triage_appendix.md` — **do not open it before the G3
verdicts are written.** One caveat: the earlier stage-0 report (§3) already quoted several beats
with arm attribution; a G3 reader who has read that section is arm-blind only partially.

---

## 1 · Classification of every rejection class

A = genuine planner/spec failure · B = deterministic validator false positive or bug · C = unresolved product policy

| # | fault class (product wording) | hits | class | why |
|---|---|---|---|---|
| 1 | `gives no "revelation_bridge"` / `first_mention undefined` | 7 (one arm only) | **A** | required keys omitted; the schema states them in plain text and the other arm produces them every time |
| 2 | `bridge never refers to the condition` — the Seren-type case | 2 | **B** | the check is stopword-free word overlap (`_portfolioContentWords`, any 4+ letter word, no stemming). The condition is *"someone's pain becomes nameable in public"*; a bridge about *avoiding naming the wound* shares no 4-letter word with it because `naming` ≠ `nameable`, while the same check **passes** other bridges on the words `being` and `someone` alone. It measures vocabulary, not connection, in both directions |
| 3 | `bridge never refers to the condition` — the Dohkar / named-offering case | 2 | **A, with a B rider** | the condition is *"an offering being named aloud"*; the bridges talk about authority of judgement and never about anything being named. Real. **But** in at least one of those plans the `visible_action` itself does engage the condition (it is about calling for the cost to be spoken) — the act is on-condition, only the planning-note sentence is off. The rule rejects a usable act because of a note the author never sees |
| 4 | `environment element … not grounded in the authoritative scene material` | 8 | **C** (see §2) | every failing element is a seed object with a qualifier appended (state, motion, or a new environmental fact). The two plans whose elements are bare seed nouns pass. The rule is "every content token must appear in the seed text", so any elaboration fails; whether that is the intended rule is the policy question |
| 5 | `environment_plus.beat does not name its own target` | 5 | **B** (4) / A (1) | `_namesTarget` takes the **last** content token as the head noun. For *"the deep-crimson carpet of braided spiralgrass"* that is `spiralgrass`, not `carpet`, so a beat about *the carpet* scores 1/5 or 2/7 and fails the 34% floor. Four of five failures are exactly this: the beat names the carpet, the rule looked for the grass. One beat genuinely names a different thing |
| 6 | `pc_opening_fusion.environment_target/axis does not match environment_plus` | 2 plans | **A** | the schema says *"the SAME string, verbatim"*; the plans pointed the fusion at a second object and a second axis |
| 7 | `pc_opening_fusion.beat is neither contact nor sensory juxtaposition [NO_CONTACT]` | 1 | **B** | the beat has fingers *dig into* the target; `dig` is not in `_FUSION_CONTACT`'s verb list. Vocabulary gap, not a missing interaction |
| 8 | `"Seren" is given an action in the opening beat AND a different first-mention beat` | 1 (would fire on 2 more by the same coverage test) | **A by the spec, C underneath** | the rule: if the opening names X, X's C+ act must be ≥60% covered by the opening. The seed's own opening event *is* Seren's act (E3/E4: she names her offering, then spends the wish on Lirael), so every plan opens on Seren, and any distinct Seren C+ beat collides. The one plan that passed did so by restating the opening as her C+ act. The spec is clear; whether Seren can ever have a C+ beat other than the opening itself is a design consequence worth deciding on purpose |

Totals across the six plans: A = 12 hits, B = 8, C = 8 (+2 latent under #8).
**With the B-class bugs fixed and #4 decided, the 14B plans' remaining faults are: two off-condition
bridge notes (#3), two fusion-target mismatches (#6), and one duplicate-appearance (#8).**

---

## 2 · The policy questions — yours to answer

### Q1 · Environment elaboration: what may `environment_elements` say about a seed-owned thing?

The seed names seven objects (`groundedObjects` O1–O7: the veil-canopy, the mated-pair trees, the
spiralgrass carpet, the gossamer band, the ceremonial sash, the Veilweave, the assembled people).
The planner is asked for "at least two concrete physical things … every element must be something
that authoritative description actually contains", and separately for an E+ beat that shows "what
the axis has MADE of" its target. The observed behaviour is that models write the *beat's* content
into the *inventory* — and the inventory check is token-exact.

Three distinguishable kinds appeared, and they should not be treated alike:

| kind | example shape (constructed from the seed, not quoted from a plan) | verdict proposed |
|---|---|---|
| **(a) bare seed object, paraphrased** | "the spiralgrass carpet"; "the trees' hanging leaf-curtains" | **allowed** — already passes |
| **(b) descriptive elaboration: a state or trace *of* a seed object, consistent with the seed** | "the carpet, pressed flat where the kneeling youth's weight sits" | **allowed as an E+ beat, not as an inventory entry** — it is what the beat field is for |
| **(c) a new environmental fact** | "the canopy swaying in the dawn breeze" (the seed has no wind; E+ forbids weather); "the carpet, untrampled" (the seed puts two dozen barefoot people on it) | **forbidden anywhere** — new set-dressing, and in the second case a contradiction |

**Recommended policy:** *the inventory names things the seed names; state, motion, history and
damage of those things belong in the E+ beat; nothing the seed does not contain (weather, light
conditions, blood, marks) may be introduced by either.* This keeps the existing rule's purpose —
the "gallery hallway" defence — without rejecting plans for putting a legitimate trace in the
wrong field.

**Minimum change under that answer:** validator — ground the *nominal head* of each element (the
text before a participial or relative clause: "where…", "crushed…", "swaying…", ", still…"),
and separately reject any element or beat token from a small **new-fact list** the seed rules out
(wind/breeze/rain, blood, light words beyond "dawn"). Prompt — one sentence: *"environment_elements
are nouns the seed names; put what has happened to them in environment_plus.beat."*
**Under the opposite answer** (elements must be verbatim seed nouns, elaboration forbidden even in
the beat): no validator change; add the same sentence to the prompt and accept that every model
will keep failing until it stops elaborating — the evidence says it will not.

### Q2 · What is `revelation_bridge` for, and should it gate?

It is declared "PLANNING ONLY — never reaches the author". Today it gates, through a word-overlap
proxy that fails "naming"/"nameable" and passes on "being". Four of the six 14B C+ rejections are
this rule; two of those four are the model's fault (#3), two are the rule's (#2).

**Recommended policy:** *the condition must be engaged by the ACT; the bridge is logged, not
gated.* The seed already authors a per-condition regex for exactly this
(`possible_pressures[].evidence_requires`, e.g. for "an offering being named aloud":
`offering|memory|sacrifice|cost|names? (it|her)`; for "someone's pain becomes nameable in public":
`wound|grief|the one she lost|bereave|pain|name (it|the loss)|aloud`). Apply it to
`visible_action` (optionally `visible_action + bridge`). Drop the truth-overlap half entirely: the
truth is delivered to the author verbatim from the record, so a bridge restating it adds nothing
and a bridge not restating it loses nothing.

**Minimum change:** replace the two `_shares(...)` tests at `app.js:264861` with the
`evidence_requires` regex over the act; keep the "no bridge at all" fault (#1) as is; log the
bridge for later human review. Under the opposite answer (keep gating on the bridge sentence):
at least add stopwords and stemming to `_portfolioContentWords` for this use — but it will still
be a vocabulary test.

### Q3 · The opening character's Character+ (rule #8)

Because the seed's opening event is Seren's, the current rule means **Seren's C+ beat must be the
opening beat**. That is coherent ("one beat, one source of truth") and it is what the spec says.
Decide it on purpose: **(i)** keep — then the prompt should say so in the CHARACTER+ CANDIDATES
block for whoever the opening stages, so the planner stops offering a second act; or **(ii)**
allow a distinct later C+ act for the opening character — then the coverage test must go.
Recommended: **(i)**, one prompt sentence, no validator change.

---

## 3 · Bugs that need no policy (fix regardless of answers)

- **#5 head noun** — `_namesTarget` should take the head of the noun phrase (the token before
  " of " when present; else the last token), or accept the first noun of the target. One line.
- **#7 contact verbs** — add `dig(s|ging)? into`, `sink(s)? into`, `curl(s)? around`, `knead`,
  `claw` to `_FUSION_CONTACT`. One regex.
- **#2 overlap metric** — resolved by the Q2 answer either way.

---

## 4 · Go / no-go rule for retesting 14B

Retest only 14B (8B is out on #1). Same harness, `PP_ROUTE=14b CAP=6`, six sequential samples,
≈ $0.025 at the provisional rate, $0.05 ceiling, Grok blocked, drafts applied to the working tree
for the run and reverted, dev server started and stopped.

| answers given | retest? | GO for stage 1 if |
|---|---|---|
| Q1 elaboration allowed (recommended) + Q2 act-gated (recommended) + §3 bugs fixed | **yes** | **≥ 4 of 6 plans ACCEPTED by the product**, and the remaining rejections are all class A with **no single A-fault class on more than 2 of 6**. Plus G3: no reader ranks the 14B median plan below the archived Small reference |
| Q1 strict (verbatim nouns only) + Q2 act-gated + §3 fixed | yes, but expect elements to keep failing | same numeric bar; if elements alone cause ≥ 3 rejections the result is "policy, not model" — report, do not iterate the prompt in the same session |
| Q2 keep bridge gating, whatever Q1 | **no** | on the present evidence the bridge rule rejects usable plans and passes empty ones; a retest measures the rule, not the planner |
| no changes at all | **no** | 0 of 3 accepted today; nothing would move |

A retest that reaches GO authorizes stage 1 exactly as written in the protocol (the route commit,
the $0 admission rehearsal with the Small mutation control), nothing more.

**What this memo does not do:** change any file under `public/` or `api/`, touch `_drafts/`,
alter a threshold, or dispatch a call. The appendix holds the per-plan evidence.
