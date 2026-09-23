# Tempt Fate permanence doctrine — full trace before touching premise-protection

2026-09-22. Roman: "Tempt Fate is not 'temporary only.' It can create permanent world alteration...
'Make everyone forget the ceremony happened' should be potentially valid. It should not simply fade
away. But it should create consequences and clues... The author must be capable of turning
rupturous wishes into consequences within the world, not just blocking or undoing them." Dry-only:
search + read + document. No code changes, no premise-protection/regex changes, no paid calls, no
prose generation, no image work.

**Correction accepted.** My prior framing (in `_tempt_fate_canon_rupture_2026_09_22.md`) leaned on
the EMPOWERMENT CONTRACT alone and read it as "bounded rupture that fades." That was too narrow —
it's one of at least *five* real, independently-built systems, several of which already support
permanent, investigable, consequence-rich change. This document traces all five and answers your
eight questions directly, each citation checked against current source (or, for memory docs,
against the current code where the doc claims a wiring status).

## 0. Provenance key

Every claim below is one of: **SOURCE-VERIFIED** (I read the current `public/app.js` line myself,
this session) · **MEMORY-CORROBORATED** (a project memory doc says this, and I independently
verified its wiring claim against current source) · **MEMORY-ONLY, UNVERIFIED THIS PASS** (from a
memory doc, not re-checked against source this session — flagged explicitly) · **DESIGN INTENT, NOT
BUILT** (an explicit design law or requirement that the doctrine itself, or a memory doc, marks as
not implemented).

## 1. The five real systems (SOURCE-VERIFIED, this pass)

**(A) The EMPOWERMENT CONTRACT** (`buildWorldLawDirective`, `app.js` ~75669; wrapped for CG by
`_buildCGTemptDirective`, ~225806) — generic across all 6 world modes. TYPE 1 (power move) grants
directly; TYPE 2 (structural break) translates, never denies, never deletes. This is what I traced
in the prior two passes. It is **scene-immediate and prose-only** — it shapes how THIS invocation
renders, and it has no concept of a durable canon update.

**(B) The volatility window + 2-scene aftermath** (`_updateTemptFateSaturationAndVolatility` /
`_temptFateWindowTaperAndAftermathDecay`, both fixed this session) — bounds the RUPTURE's own
duration (1-3 scenes active, then IMPRINT, then FADING, then cleared). This is the layer I've been
fixing. It governs how long the *scene-level distortion* lasts — it does NOT govern whether the
underlying fact becomes permanent canon; those are separate questions, conflated in my prior
framing.

**(C) The Fatelands Wish doctrine** — a large, LIVE, LAYERED system (`app.js` ~226427-227350+),
distinct from (A)/(B), gated on `state.picks.world === 'Fantasy'` and, critically, on the SAME
`state.volatility_window.active` flag (B) — meaning **my prior two passes' CG-activation fix
directly and materially unlocked this doctrine for CG Tempt Fate scenes for the first time** (see
§7). Contains:
  - **CORE** (`_buildFatelandsWishCoreDirective`, ~226746): "CIRCUMSTANCES, NOT MINDS — Fate does
    not install knowledge, skill, memory, language, or mastery... it arranges the improbable EVENTS
    by which you could earn or find them." **Fate does not directly manufacture or erase memory
    content — it moves events.** This is the mechanical reason a memory-erasure wish should
    naturally produce event-level disruption (a catastrophic interruption, a records fire, a crowd
    panic) rather than a clean uniform mind-wipe.
  - **ADJUDICATION** (`_buildFatelandsWishAdjudicationDirective`, ~226799) — THE EIGHT ORDERS, a
    real classification with fixed disposition per Order: ① Restoration/② Temporary Aid/③
    Revelation — welcomed; ④ Transformation — cautious; ⑤ Fortune — risky; ⑥ **Agency (override
    another's will) — RESISTED**; ⑦ Identity — strongly resisted; ⑧ **History (unmake what
    happened) — NEARLY IMPOSSIBLE**. "Make everyone forget the ceremony" is a compound wish hitting
    BOTH ⑥ and ⑧ — the two most heavily-resisted Orders. "A RESISTED ORDER WARPS, LEGIBLY — not
    refusal... ✓ 'undo yesterday' → not rewritten history but one broken thing restored, or a
    second chance that does not erase what happened." This is the SAME shape as the EMPOWERMENT
    CONTRACT's own "Erase what happened" example (destabilized, not deleted) — two independent
    systems converging on the same answer.
  - **WHO JUDGES A WISH** (`_buildFatelandsWishJudgmentDirective`, ~227046): "FATE CANNOT
    TESTIFY... Proof must be human and ordinary: witnesses, ledgers, informants, the shape of a
    population's losses, one person who will say what was done to them." This is the doctrinal
    backbone for exactly the investigation Roman describes — the world's own metaphysics is built
    so that "who did this" can ONLY be answered by ordinary detective work, never by magically
    detecting the culprit.
  - **WISH ARCHAEOLOGY** (`_buildFatelandsWishArchaeologyDirective`, ~227295): an entire
    pre-built QUEST SHAPE for exactly this scenario — "① discover the phenomenon → ② survive its
    effects → ③ investigate its origin → ④ reconstruct the TRUE wish → ⑤ decide whether it SHOULD
    be undone → ⑥ pay the cost." And explicitly gives the permanence taxonomy: **FOUR DEPTHS —
    TRANSIENT (fades on its own) · LINGERING (can potentially be unravelled) · ANCHORED
    (extraordinary effort and sacrifice) · FOUNDATIONAL (effectively part of reality now — too
    old, unknowable, or accepted into the world's fabric).** This is the direct doctrinal answer to
    "what kinds of changes can be permanent" — FOUNDATIONAL is genuine, doctrine-sanctioned
    permanence, not a bug or a gap.
  - **COERCION** (~227060) and **JUDGMENT** also establish that Fate is indifferent to HOW a wish
    arose and CANNOT be examined for the truth — reinforcing that any "who's responsible"
    consequence must be built from in-world evidence, never a magic detector.

**(D) The Tempt Fate Callback Ledger** (`state._temptFateLedger`, `_recordTemptFateEvent` ~190348,
`buildTemptFateCallbackDirective` ~190486, `_classifyTemptScale` ~189194) — a genuinely permanent,
append-only, cross-scene record of every Tempt Fate seal, with a decay-but-never-erase model
(recent = vivid, mid = settled-fact-with-charge, distant = mythologized lore). Confirmed, reading
the actual directive text: for an unclaimed MASS-scale event (and "everyone forgets the ceremony"
would classify as `mass` via the bare "everyone" keyword in `_classifyTemptScale`, confirmed by
reading its regex), the directive literally instructs: **"PUBLIC MYSTERY — DEBATED in news, in
bars, in offices. Theories: mass hallucination, deepfake, government cover-up... divine
intervention, hoax... Strangers may ask 'were you there?'"** — this is Roman's exact ask, already
built, wired into 6 prompt-assembly paths (per the originating memory; the ledger's persistence
across saves is SOURCE-VERIFIED at `app.js` ~101734-101789). It is currently tuned for
anatomical/OAS-origin wishes (its extraction helpers pull "anatomyKeywords"/"quantityKeywords"),
but its attribution/scope machinery is generic and would apply to a memory-erasure wish's `mass`
classification without new code.

**(E) Durable Fate Consequences** (`_recordDurableConsequence`, `app.js` ~189517;
`_buildDurableFateConsequenceDirective`, ~189562; wired into `_buildContinuitySpineBlock`,
confirmed reaching the prompt payload via `if (durableLine) lines.push(durableLine);` at ~130555) —
a REAL, permanently-flagged (`permanent: true`) consequence ledger with a directive that says
**"PERMANENT WISH-COSTS ALREADY PAID... TRUE and NEVER restored — do not undo, heal, or forget
them."** This is close to what you're describing for the memory-erasure example's own persistent
cost. **But its only two call sites are inside `_resolveOrdinaryWish`** (`app.js` ~190125), the
UNPAID, in-dialogue "I wish..." pipeline — **not Tempt Fate.** Confirmed by tracing the enclosing
function via source. See §4 for what this means.

## 2. Direct answers to your eight questions

**What kinds of Tempt Fate changes can be permanent?**
Doctrinally: anything, provided it's story-bearing and costed — the Wish Archaeology "FOUR DEPTHS"
explicitly includes FOUNDATIONAL (permanent, part of the world's fabric now). Mechanically-today:
the EMPOWERMENT CONTRACT's own hard rule is "the outcome cannot be negated, inverted, or denied...
the player's wish always lands" — so the *effect itself* is never walked back at the prose level.
What's currently missing is a CODE-LEVEL mechanism that writes a Tempt Fate outcome into a
character's reconciled canon/body-bible so it durably shapes every future scene the way `_recordDurableConsequence` does for ordinary wishes (§4) — that gap is explicitly flagged, mandatory, and unbuilt (see `project_reputation_consequence_requirement.md`, §4 below).

**What kinds must be temporary or metabolized as apparent rupture?**
Per severity: at HIGH saturation/severity, the NARRATIVE TRUTH RULE requires "perceived, unstable,
or incomplete, never absolute fact" for anything that would remove a load-bearing element (the LI,
protagonist identity, the central relationship, established history) — this is a SCENE-LEVEL
rendering discipline (system A), not a permanence verdict. A change can be rendered as ambiguous
belief in the moment AND still be doctrinally FOUNDATIONAL later, once "reality reasserts" resolves
which account won (see next question).

**What kinds are translated rather than granted?**
TYPE 2 structural breaks (A) and Order ⑥/⑦/⑧ resisted wishes (C) — never denied, always warped
into "the nearest lawful version" that preserves the governing desire.

**What kinds are hard-blocked for safety or legal reasons?**
Confirmed unchanged from the prior canon-rupture pass: self-harm/minor content/real-person full
names/injection, via the shared `sanitizeWishInput` gate — this layer is untouched by everything
above and remains a real, code-level hard block, not doctrine-mediated.

**How do imprint/fading/aftermath interact with permanent changes?**
They don't govern permanence at all — they govern how long the RUPTURE ITSELF (the volatility
window) visibly destabilizes the world before settling. A change can settle into FOUNDATIONAL
permanence (C) while the imprint/fading beats (B) simply describe the social/emotional adjustment
period immediately after. They are answering different questions ("how long does the distortion
last" vs. "did the change stick") that my prior framing had collapsed into one.

**What does "reality reasserts" actually mean in existing doctrine?**
Two different things depending on system: in (A)/(B), it means the VOLATILITY WINDOW closes and
severity/omen framing stops — a scene-pacing event, not a truth verdict. In (C)'s Wish Archaeology
framing, "reality reasserting" is closer to: the world's own social process (debate, investigation,
institutional record-keeping) eventually either confirms, mythologizes, or contests what happened —
there is no single deterministic snap-back; FOUR DEPTHS exist precisely because different wishes
settle differently.

**How should memory-erasure wishes work?**
Converging answer from THREE independent systems: (A) "Erase what happened" → destabilize, don't
delete, "no one agrees on what occurred"; (C-Core) Fate does not install/erase memory content
directly, it rearranges EVENTS — so the mechanism of a "successful" erasure would plausibly be an
event-level disruption (chaos, an interruption, a records fire) that naturally produces inconsistent
individual memories, not a clean uniform wipe; (C-Adjudication) Order ⑥+⑧ compound resistance means
it legibly WARPS rather than cleanly grants — partial gaps, conflicting accounts, "wasn't it today?"
confusion is the CORRECT shape of a warp, not a failure to fully grant the wish. (D) then carries
the SOCIAL half forward indefinitely: unclaimed + mass-scale → "PUBLIC MYSTERY — DEBATED... were
you there?" — exactly the suspicion/investigation Roman described, and (C-Judgment) explains WHY
that investigation can only proceed through ordinary evidence (Fate cannot testify).

**What protections exist already, and where are they prompt-only vs. code-enforced?**
- CODE-ENFORCED: `sanitizeWishInput` (safety hard-block); `_isOutOfScopeForEmbodiedTempt` (narrow
  anti-smuggling guard); `_classifyTemptScale`/ledger attribution logic (D); `_recordDurableConsequence`'s gating logic (E, though not Tempt-wired); severity-tier computation (B).
- PROMPT-ONLY (LLM-obeyed, no code verification the model complied): the ENTIRE Empowerment
  Contract TYPE1/TYPE2 classification (A); the ENTIRE Eight Orders/WARP mechanism (C) — there is no
  code-level Eight-Orders classifier gating what the AUTHOR actually writes, only rich instruction
  text. (A code-level Eight-Orders classifier, `classifyWishDisposition`, DOES exist at `app.js`
  ~105974 — but it's called only from `_resolveOrdinaryWish`, the unpaid path, not Tempt.)

## 3. What "temporary-only" framing got wrong, precisely

My prior doc treated (B)'s 2-scene aftermath window as THE model for how Tempt Fate ruptures
resolve, generically. That's wrong on two counts: (1) it's one bounded layer among five, answering
"how long does the scene-level distortion last," not "does the change stick"; (2) doctrine (C) and
design intent (§4) both explicitly anticipate FOUNDATIONAL/permanent outcomes for significant
wishes — "temporary" was never the rule, it was the default duration of the *rendering intensity*,
not a ceiling on consequence.

## 4. The honest gap: design intent vs. what's actually wired for TEMPT specifically

Three memory docs (read this pass, wiring claims independently checked against current source)
converge on the same gap:

- **`project_tempt_fate_branch_law.md`** (DESIGN LAW, audited 2026-07-08): "Tempt may rewrite
  OBJECTIVE REALITY... branches forward from the inflection point... **STATUS: NOT BUILT.**" The
  audit found: "the EMPOWERMENT CONTRACT explicitly FORBIDS arc rewrites — arc-collapsing wishes
  are TRANSLATED into pressure/escalation, 'a moment, not a status change.' No branch-forward, no
  finale rewrite." — this is a DESIGN-INTENT-NOT-BUILT confirmation of exactly the "temporary-only
  in practice" behavior I originally (wrongly) generalized from — it's real, but it's a KNOWN,
  FLAGGED gap against an explicit design law, not the intended final state.
- **`project_reputation_consequence_requirement.md`** (MANDATORY, flagged 2026-09-06, re-audited
  2026-09-10): "an authorized Petition or Tempt Fate change to any character's... durable canon
  MUST update that character's reconciled portfolio + body bible and persist forward... A ledger
  write alone does not count." Audit verdict: **nothing implements this for Tempt.** `_durableFateConsequences` exists and is wired to the prompt (E, confirmed this pass) but is
  "Tempt ordinary rail only" — i.e., only fires for unpaid dialogue wishes, never for a paid Tempt
  Fate invocation. This is THE specific, precise, named gap: Tempt Fate has no code-level path to
  durably update a character's canonical record, even though the infrastructure to do so
  (`_recordDurableConsequence`) already exists and already reaches the prompt for a *different*
  wish pathway.
- **`project_wish_override_adjudication_design.md`** (DESIGN ONLY, 2026-09-14, not implemented):
  proposes `override_policy` + `state._arcReplanRequired` as the mechanism to let an authorized
  Tempt/Petition override unlock a locked arc-constraint/reserved-event — explicitly grounded in
  real existing mechanics, explicitly nothing built yet.

**Conclusion**: the doctrine (prompt-level, both A and C) already tells the author how to render a
permanent-capable rupture correctly, richly, and consistently with the world's own metaphysics.
What's missing is not permission — it's the CODE-LEVEL plumbing that would let such a rupture
durably rewrite a character's canonical record the way `_recordDurableConsequence` already does for
a different, smaller mechanism. Building that plumbing (extending `_recordDurableConsequence`-style
durability to the Tempt rail, and/or the `override_policy` design) is real, scoped future work — not
what this pass was asked to do.

## 5. Concrete worked example: "make everyone forget the ceremony happened," using only what's live today

1. `sanitizeWishInput` — passes clean (no safety trigger).
2. `_classifyTemptScale` — "everyone" → `mass`.
3. Invocation renders via (A): TYPE 2 structural break ("erase what happened" shape) → translate,
   don't delete. If Fantasy-world and `volatility_window.active` is true (now correctly the case
   for CG since the prior two passes' fix): (C-Core) "circumstances not minds" + (C-Adjudication)
   Eight Orders ⑥+⑧ resistance-WARP guidance are ALSO in the prompt, reinforcing the same
   direction independently.
4. The scene SHOULD render as: a genuine event-level disruption around the ceremony (not a clean
   mental wipe) producing inconsistent individual accounts — matching (C-Core)'s "Fate arranges
   events" mechanic.
5. `_recordTemptFateEvent` (D) logs it to the ledger: `claimedByPlayer` depends on whether the wish
   was phrased as player-credit-seeking; likely `false` for this wish shape → `publicAttribution:
   'debated'`.
6. Future scenes: `buildTemptFateCallbackDirective` (D) surfaces "PUBLIC MYSTERY — DEBATED...
   theories: mass hallucination... 'were you there?'" — organically producing exactly "when is the
   ceremony? wasn't it today?" / "what are we all doing here?" style beats, and (C-Judgment)'s
   "proof must be human and ordinary" backs an investigation arc if the player or NPCs pursue one.
7. **What does NOT currently happen**: nothing writes this into a reconciled character
   canon/body-bible (§4's gap) — so if a FUTURE scene needed to treat "the ceremony never happened
   in anyone's memory" as durably TRUE going forward (rather than an ongoing live mystery), there's
   no code-level mechanism enforcing that consistently across saves/Issues today. The doctrine
   supports it (FOUNDATIONAL depth exists); the plumbing to make it durably reflected app-wide does
   not yet exist for Tempt specifically.

## 6. What this means for the paused premise-protection / cataclysmic-regex fix

Both were scoped, in the prior canon-rupture pass, under the assumption that "dissolving the
story's premise" is inherently something to guard AGAINST (forcing cataclysmic-scale framing +
"localized relief, world stays broken"). That framing is now suspect in the same way "temporary
only" was: premise dissolution via a costly, warped, investigable Tempt Fate wish may be entirely
valid per (C)'s doctrine, provided it's story-bearing. Recommend NOT resuming that fix as
originally scoped — it should be re-designed (in a future pass) around "does this preserve or
remove story-bearing potential" rather than "does this touch the premise at all," consistent with
everything traced here. Not decided or built this pass, per instruction.

## 7. One more concrete, positive connection worth flagging

`_fatelandsWishResolvesThisScene()` (`app.js` ~226780) — the authoritative gate for BOTH the CORE
and ADJUDICATION Fatelands directives — checks exactly three signals: a resolving Petition, the
Gloamwater underwater-wish special case, and **`!!(state.volatility_window && state.volatility_window.active)`**. This is the SAME flag my prior two passes fixed for CG. Before those
fixes, CG Tempt Fate invocations never set this flag true — meaning **the entire rich Eight-Orders/
Wish-Archaeology doctrine (C) was very likely never reliably reaching CG Tempt Fate scenes either**,
for the same root-cause reason IMPRINT never fired. This wasn't verified live this pass (no paid
calls), but it's a strong, source-grounded inference worth flagging: the activation fix may have
already meaningfully improved this exact problem for CG, independent of anything else done here.

## 8. What this pass does NOT do

No code changes. Premise-protection and the cataclysmic-regex inflection gap remain untouched and
un-fixed, per instruction. No live Tempt Fate sample. No paid calls, no prose generation, no image
work. Does not decide the shape of a future fix — presents the doctrine so the next pass can align
with it rather than re-impose the temporary-only model this trace corrects.
