# Prompt consolidation — audit and proposed change list

**Read-only. No production file has been changed. No provider contacted.**
Evidence: the complete assembled requests captured from real runs —
`_nf_eight_attempt3_out/requests.json` (opening planner, 91,220 chars) and
`_nf_rec4_out/requests.json` (continuation planner 28,287 chars; continuation author 453,090 chars).
First Sacrifice is the evidence here, not the definition of Storybound; each proposal below is
checked against what it would do to a different story.

## Scope finding first

Both demonstrated conflicts are **opening-planner only**. The continuation author request contains
none of `OFFSTAGE / REMEMBERED`, `NOT physically present`, `ONE PHYSICAL ANCHOR`, `80/20`, or
`do NOT apply a target`. That narrows the blast radius and means the continuation thinness is not
explained by these two.

## Conflict 1 — relationship weighting, opening planner

| | |
|---|---|
| **A, char 1,038** | "…which governs this prompt. **Do NOT apply a target R-plot/A-plot split** to it and do NOT reweight it toward 'the two of them'" |
| **B, char 2,020** | "the normal ≈ 60% R-plot / 40% A-plot split applies. **(This is Scene 1 — the 80/20 relationship-weighting applies.** …the beats must put the reader's attention on HER and the relationship…)" |
| **delivered to** | the opening planner, both unconditionally, 1,000 characters apart |
| **source of B** | `public/app.js:291767` — `_twoEngineProportionCompact('scaffold')` plus the appended Scene-1 sentence |
| **source of A** | the Scene-1 established-scene override block, emitted for a seeded fixed Scene 1 |

**Proposed:** at the source of B, suppress the weighting sentence when the established-scene
override is active, rather than appending a third instruction about which to obey.

**What survives:** a non-seeded opening still receives the 80/20 Scene-1 weighting; a seeded fixed
Scene 1 is governed by its staging, which is what override A already says.

**CREATIVE POLICY — for Roman, not for me:** which should win for a seeded Scene 1? Override A says
the staging governs, and I believe that is the intent, but B was added deliberately and this is a
weighting decision about your own book, so I am not deciding it.

## Conflict 2 — the love interest is present and offstage in the same request

Ten statements about Julian in the opening-planner request:

| char | says | presence |
|---|---|---|
| 5,213 | "established roster: Lirael, **Julian**, Seren, the presiding Dohkar … NAME and STAGE all of them" | present |
| 5,529 | "Julian — the love interest — **appears in person this scene** (first collision)" | present |
| 7,817 | "Julian is **OFFSTAGE / REMEMBERED** this scene … **NOT physically present**" | **offstage** |
| 8,231 | "**THE ONE PHYSICAL ANCHOR** … his face. No second feature; **NO height+build+eyes+hair+mouth cluster**" | **offstage** |
| 51,015 | "FACING = SELF (engine=COLLISION, **pre-meet**): she has **not yet met Julian**" | pre-meet |
| 51,278 | "Do NOT make her want to know / understand / wonder about Julian yet; **she has no relationship to him**" | pre-meet |
| 56,908 | required output: `{ "name": "Julian", "presence": "IN_PERSON" }` | present |
| 74,369 | "These are the only people **physically present**" — list includes Julian | present |
| 75,177 | "Julian modes permitted: **IN_PERSON** · (here in the room) — seed.cast ∩ sceneOne.present" | present |

**Six present, two offstage, two pre-meet.**

**Root cause — one predicate, `_liOnPageThisScene` at `public/app.js:285912`.** It reads
`s.sceneSkeleton.staged_characters` to decide presence. At opening-planner assembly time there is
no skeleton — the planner is being asked to *produce* it — so it falls through to:

```js
if (turn <= 0) { … (s.pairDynamic && s.pairDynamic.scene1Presence)
               || (s.romanceEnginePlan && s.romanceEnginePlan.scene1Presence) … }
```

the **romance engine's general default** for Scene 1 ("rarely on-page in Scene 1"), and it never
consults the seeded `sceneOne.present` roster that actually fixes this scene — the very roster the
same request prints at char 75,177. Returning false then emits the whole offstage payload at
`app.js:286208`.

*This is inferred from the gate plus the emitted text, not from an observed return value: the
offstage block is reachable only when that predicate is false.*

**Why it matters for the writing.** The offstage branch does not merely mislabel him. It
**demands** exactly one charged physical anchor and **forbids** the height/build/eyes/hair/mouth
cluster. A model obeying it writes a one-feature sketch of a character who is on stage for the
first time. **Some of the thin physical establishment may therefore be obedience to an
inappropriate instruction rather than inability.** How much of the literary failure this explains
is NOT established.

### The offstage rule is an intentional pacing default, and stays

Correcting my own framing: this rule is not obsolete and nothing here treats it as such. Giving
the reader time to inhabit the protagonist's life before the love interest arrives is a deliberate
choice about the experience Storybound offers, and it does not need defending by appeal to what
most romance novels do. The defect is narrower and different: **an explicit exception should have
REPLACED the default, and instead both were delivered.**

Three things the prompt currently conflates, which must stay distinct:

| axis | the rule |
|---|---|
| **Physical presence** | Ordinarily the LI does **not** enter Scene 1. This is the default and it is preserved. |
| **Narrative relevance** | He may be mentioned, discussed, or met through correspondence or an established memory. **None of those implies an entrance, and none is mandatory.** |
| **Relationship progression** | Even when he IS present, the scene need not rush attraction, intimacy or romantic significance. First Sacrifice can include Julian without making the ceremony principally about meeting him. |

**Broad physical establishment belongs to the LI's first meaningful ON-PAGE appearance**, not to
Scene 1 by default, and **an earlier mention does not use it up.**

### That requirement is already implemented correctly — and depends on the same predicate

`_resolveAppearanceMode` at `public/app.js:285963`:

```js
// LI = establish the FIRST scene he is physically on-page; keep his values available until then.
if (!s._apprEstablished.li) {
  mode.li = 'establish';
  if (_liOnPageThisScene(s)) s._apprEstablished.li = true;  // offstage → values stay available
}
```

The lock flips **only** when the LI is actually on-page, so a mention leaves the introduction
unspent. The design already matches the requirement. What breaks it is the same predicate, in both
directions:

* predicate wrongly **false** on a scene where he IS staged → the offstage restrictions are
  delivered instead of the establishment payload (the measured First Sacrifice case);
* predicate wrongly **true** on a scene where he is only mentioned → the lock flips and **a mention
  consumes the introduction**, which is exactly the outcome you ruled out.

One predicate therefore governs both *which rule is delivered* and *whether a mention spends the
introduction*. Fixing it is the whole fix.

### Proposed change

**Resolve presence ONCE, before the request is assembled, and deliver only the applicable rule.**
`_liOnPageThisScene` becomes an explicit precedence rather than a skeleton read with a romance-
engine fallback:

1. **Explicit staging for this scene** — a committed skeleton's `staged_characters`, or, when there
   is no skeleton yet because the planner is being asked to produce one, the seeded
   `sceneOne.present` roster. *(This is the missing step; it is why the predicate answered wrongly
   for a seeded fixed Scene 1.)*
2. **The story premise or an explicit user choice**, where one is recorded.
3. **Otherwise the default: absent from Scene 1.**

Then the assembler emits the offstage block **or** the establishment block, never both.

**What this must NOT become:** a mandatory Scene-2 entrance. The default is "not in Scene 1", not
"in Scene 2". Nothing here schedules an arrival, and nothing makes a mention, a letter or a
remembered moment obligatory.

**What survives:** the offstage payload keeps working wherever the LI genuinely is offstage,
including its anti-dump purpose, which the 2026-06-24 comment records as a measured fix. The
in-person establishment path is untouched. A non-seeded story behaves exactly as it does today,
because step 1 finds nothing and step 3 applies.

**Generic check:** the rule change is about *resolving* presence, not about who is present, so a
story that never stages its LI in Scene 1 sees no difference. A story whose premise or whose reader
explicitly puts him there gets the establishment payload instead of restrictions written for his
absence — which is the correct behaviour for any story, not a First Sacrifice accommodation.

**CREATIVE POLICY — for Roman:** which sources count as an "explicit exception" at step 2? Seeded
staging is clear. Whether a reader-set premise or a corridor choice should also override the
default is a product decision about how much the reader may change the opening, and I am not
deciding it.

## Not a conflict — correctly scoped, listed so it is not "fixed"

Char 6,208, "Choose 3-5 CORE attraction anchors … hair / lips / eyes / smile / curves" is about
**the protagonist's own appearance**, not the LI's. It matched a feature-cluster pattern while
being a different subject and a different rule. No change proposed.

## Duplication and size, measured

| request | chars | verbatim long-sentence repetition |
|---|---|---|
| opening planner | 91,220 | 1,560 chars — **1.7%**, 10 sentences |
| continuation planner | 28,287 | — |
| continuation author | **453,090** | 17,645 chars — **3.9%**, 91 sentences |

The opening planner carries **53** prohibition/mandate keywords (`NEVER`/`DO NOT`/`MUST`/`ALWAYS`/
`HARD`). Context markers present and doing work: cast/staging 17, world lore 13, bibles 8, prior
scenes 5.

The headline is not the opening planner. **The continuation author request is 453,090 characters**
— roughly 102,000 estimated tokens at the measured 4.45 chars/token — with the same guidance
repeated up to four times, e.g. ×4 "ANY LIMIT STATED IN THE REASON BELOW STILL APPLIES — do not
treat this as unconditional." and ×3 of an entire EMOTIONAL PHYSICS block.

**No reduction target is proposed.** Repetition is 3.9% of that request; removing all of it would
change almost nothing about its size. The size question is separate from the contradiction
question and I have not audited it.

## Deliberately not touched

Bibles, lore, prior decisions, custody, character knowledge and scene assignments are measured
above as **context**, not bloat, and nothing here proposes removing any of them. The creative
requirements — broad physical establishment of consequential characters, recurring psychological
needs, revealing appraisal, C+/E+/Fusion, meaningful progression — are preserved; conflict 2's fix
exists precisely to stop an instruction that *suppresses* physical establishment from firing on a
present character. Useful exemplars and intentional literary/CG differences are untouched.

## Status

Nothing changed. The frozen eight-scene experiment and all failed-run artifacts are preserved
unmodified; any cleaned prompt would be a separately labelled revision, not that experiment.

**The 502 remains unexplained and unrelated.** Nothing in this audit bears on it, and I am not
claiming prompt conflicts caused it.

---

# Addendum — the HOT CRISIS OPENER, and why openers become summonses

**The requirement, preserved as intent.** The opening should dramatize trouble **already happening
to the protagonist** — not deliver an unexplained object that promises trouble later. The range is
wide and need not be public spectacle: a career collapsing in front of her; private photographs
being displayed; someone taking control of her company; her best friend smelling of her fiancé's
cologne. The last is as hot as the first: the evidence is ambiguous, but **her experience of the
relationship has already changed.** The pattern is a *dramatic relationship* — a present
disruption matters personally, she must respond, the response costs something — **not a compulsory
sentence shape.**

This is compatible with the offstage-LI default. An absent love interest does not require an
emotionally empty opening, and does not justify a mystery envelope to manufacture plot.

## Evidence provenance — stated before any claim

| | |
|---|---|
| **Source inspection** | all five findings below, in `public/app.js` |
| **Blocked capture** | the assembled opening-planner request (`_nf_eight_attempt3_out`), built by production, never answered |
| **Generated prose** | the ten-scene First Sacrifice manuscript (`_nf_paid_run_PRESERVED`) |
| **NOT available** | any generated billionaire opener carrying planner fields. `_ab_writing_out/frozen_*.json` contain no `hook_object`, `pressure_source_type`, `opening_beat` or `HOT_CRISIS`. **The billionaire path below is source inspection only.** |

And First Sacrifice is weak evidence for this defect class in particular: canon FF takes
`_ffCanonOwnsOpening`, which **skips** the crisis pool and the in-motion repair, so FS never
exercises most of what follows.

## 1. The object requirement is optional in the schema and unconditional in the repair

`_PS_NONOBJECT_TYPES` at `app.js:295693` decides whether an object is required:

```js
var _PS_NONOBJECT_TYPES = ['emotional','relational','social','atmospheric','erotic','moral','survival'];
var _psObjectRequired = !(_PS_NONOBJECT_TYPES.indexOf(_psType) >= 0);  // empty/legacy → object path
```

The **later** shape gate honours it (`app.js:295747`): `if (_hg.fail && (_ffCanonOwns ||
!_psObjectRequired))` → skip, with the comment *"forcing an object-arrival premise onto an
emotional scene is the procedural attractor we are removing."*

The **earlier** HARD PROCEDURAL-HOOK BLOCK (`app.js:295706`) does not:

```js
if (hookObject && typeof _isProceduralHook === 'function' && _isProceduralHook(hookObject)) { … }
```

No `_psObjectRequired` guard. If the planner returned any object on a non-object scene, this block
fires, and its remedy is `_pickNonProceduralHook(state)` — **a selector that returns a different
object, never no object.** Two repairs in the same function disagree about whether the scene needs
an object at all.

**Proposed:** gate the procedural block on `_psObjectRequired` exactly as the shape gate is, and
when the pressure is non-object, **null the hook rather than swapping it**. One condition added at
`app.js:295706`; no new instruction text.

## 2. The temperature classifier measures grammatical motion, not changed circumstances

`_openingTempVerdict` at `app.js:5473`:

```js
if (mSig > 0) {                 // ANY in-motion verb, capped at 2
  var hot = d + mSig;           // d = distress nouns
  return (hot >= 2 && hot >= a) ? 'HOT_CRISIS' : …
}
```

With **two motion verbs and zero distress nouns**, `hot = 0 + 2 = 2` → `HOT_CRISIS`. A summons
being carried in and read aloud is motion; nothing about her situation has changed. The v2 comment
records the correct intent — stopping live confrontations from scoring COLD — but in-motion credit
alone now clears the bar.

**Proposed:** in-motion credit should **qualify** a distress signal rather than substitute for one
— require `d >= 1` before motion contributes, so live action amplifies a real disruption instead of
creating one. This keeps the v2 fix (an embodied confrontation still scores HOT, because it carries
both) and stops pure procedure-in-motion.

**CREATIVE POLICY — for Roman:** "her best friend smells of her fiancé's cologne" carries no
distress noun and little motion. It is HOT by your definition and would score COLD under both the
current rule and my proposal. A noun/verb classifier may be the wrong instrument for this; I am not
proposing a replacement without your view.

## 3. The procedural repair manufactures the exact failure it exists to prevent

`app.js:295725`:

```js
plan.opening_beat  = 'It arrives without warning — ' + _cleanHook + ' — and she cannot make it mean anything safe.';
plan.decision_beat = 'Reach for it — ' + _cleanHook + ' — or refuse to.';
```

The remedy for "your hook is too procedural" is **an object arriving** and **accept-or-refuse the
object**. This is the summons shape, injected by the repair.

**Proposed:** delete both fallback strings. When a beat is still procedural after the hook swap,
**drop the beat and let the planner's `pressure_source` carry the opening** (the path the schema
already describes for non-object pressure) rather than substituting an arrival premise. Removal at
source, not another override.

## 4. Four different lists disagree about which pressures need an object

| where | non-object types | omits |
|---|---|---|
| schema enum, `app.js:292837` | 11 types incl. **`physical`**, `social` | — |
| PRESSURE SOURCE text, `292757` | emotional/relational/social/atmospheric/erotic/moral/survival | **`physical`** |
| `hook_object` field text, `292839` | emotional/relational/atmospheric/erotic/moral/survival | **`physical`, `social`** |
| runtime `_PS_NONOBJECT_TYPES`, `295693` | emotional/relational/social/atmospheric/erotic/moral/survival | **`physical`** |

`physical` is offered as a legitimate pressure type and excluded from **every** non-object list, so
a model that correctly types a bodily crisis as `physical` is routed to the object path and told to
pick a token. `social` is non-object at runtime but omitted from the field's own ban text.

**Proposed:** one shared constant, emitted into both instruction strings and used by the runtime,
with `physical` and `social` both non-object. Three hand-maintained lists collapse to one.

## 5. The vocabulary ban cannot tell an active takeover from paperwork about a meeting

`_PROCEDURAL_HOOK_RE` at `app.js:288501` bans tokens: `vesting|shares|shareholder|stock|equity|
merger|acquisition|board (seat|meeting|vote)|audit|summons|asset freeze|…`

"Someone is taking control of her company" — expressed as the acquisition closing, the board vote
happening now, her shares moving — matches. "A letter about a board meeting next Tuesday" matches
identically. The regex tests **subject matter**, while the thing it is trying to catch is **shape**:
an object that defers the crisis. A billionaire story is thereby forbidden from naming its own
crisis in its own vocabulary.

**Proposed:** stop treating the vocabulary as the test. The shape test already exists
(`_isContainerArrivalHook` + the receipt-verb check); make *that* the gate and retire
`_PROCEDURAL_HOOK_RE` from the hook-swap decision, keeping it at most as a logged diagnostic.
A takeover in progress then passes; a document awaiting inspection still fails.

## Scope: literary and CG are not covered at all

`_hotOpeningShapeFail` at `app.js:288547` begins:

```js
if (!romanceForward) return null;   // SHARED_HISTORY | LOOMING_PRESENCE | /billionaire/i
```

**Fatelands and literary openings are never shape-tested.** They are still subject to the
unconditional vocabulary ban and the "It arrives without warning" repair (finding 3), which is the
worst combination: the check that would catch a deferred crisis is skipped, and the repair that
manufactures one still runs.

## What is NOT proposed

No ban on letters, documents or objects — they remain legitimate when naturally involved; the
distinction is dramatizing the crisis versus postponing it behind a prop. No new opener library, no
additional emphatic instruction, no new repair stage, no blanket bans. The offstage-LI default and
explicit starter staging are untouched, and nothing here makes the crisis revolve around an
unfamiliar LI.

## A correction to the earlier audit

I reported **3.9% verbatim repetition** in the continuation author request. That is a measure of
*byte-identical long sentences* and nothing more. It is **not** a measurement of semantic
redundancy, of irrelevant content, or of how much of that request is doing no work — and I should
not have presented it in a section about prompt size as though it bore on either.

---

# CORRECTION — the HOT-crisis addendum above is superseded

**2026-10-27.** Two scope claims in the addendum are wrong and two of its proposed fixes were
rejected on evidence. Do not act on the addendum; see
**`_nf_opening_crisis_patch_proposal.md`**, which restates the defects with executed evidence and
carries the bounded patch proposal.

* `_hotOpeningShapeFail` does **not** exclude literary or all Fatelands stories. Applicability is
  by engine/subtype and is identical for literary and CG: `COLLISION` → the gate never applies;
  `SHARED_HISTORY` / `LOOMING_PRESENCE` → it applies. The real failed run's engine was `COLLISION`.
* First Sacrifice is **not** Famous Fate. `_ffCanonShapeAuthoritative` tests
  `fateMode === 'famous_fate'`; the run logged `[FF-CANON-AUTH] false reason=nonff` and received
  the generic crisis pool. FS is direct evidence for this path.
* "Require a distress noun before motion contributes" — **withdrawn.** All six controls, including
  an active takeover, score `COLD_DISRUPTION` today; the requirement would still reject a quiet
  betrayal. No classifier change is proposed, and the classifier's only writing consumer has its
  pen off by default.
* "Make `_isContainerArrivalHook` + the receipt-verb check the gate" — **withdrawn.** It fails an
  active board vote on the token `"board"` and `I check his pulse; it is gone` on `"check"`.
