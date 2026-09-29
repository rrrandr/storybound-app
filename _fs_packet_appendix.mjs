import fs from 'fs';
const F = '_first_sacrifice_editorial_packet_2026_09_28.md';
let s = fs.readFileSync(F, 'utf8');

const APPENDIX = `

---

# 6. Evidence appendix for the invalid-cell rules (I1–I4)

Every excerpt below is verbatim from \`public/app.js\`, with its line. Each rule gets: the excerpt, the
**state transition it forbids**, and a verdict. I did not silently accept or rewrite any of the four.

## 6.1 I1 — \`inquiryOpened ∧ ¬accusationMade\` — **WITHDRAWN, no supporting excerpt**

I claimed the inquiry answers the accusation and so cannot precede it. Searching the seed for that ordering,
what I actually found orders the inquiry against the **preliminary process**, never against the accusation:

> \`the_open\` arcConstraint, lines 131137–131138:
> \`unlock_condition: { type: 'committed_event_id', event_id: 'inquiry_opened' }\`
> \`deferral_reason_key: 'preliminary_process_before_formal_inquiry'\`

**Forbidden transition (as claimed):** \`⟨am:F⟩ → ⟨am:F, io:T⟩\` — opening an inquiry with no charge on record.

**Verdict: WITHDRAWN.** The reason key names *preliminary process* as the predecessor, not *accusation*. The
seed's own ordering chain is preliminary-process → formal-inquiry. I have no predicate for "a review was
demanded and has since been superseded" — \`reviewPending\` means scheduled-and-unheld — so the supported
rule **cannot be expressed in the current seven predicates at all**. Reinstating it needs an eighth
predicate (\`reviewDemanded\`), which is a separate editorial decision. I am not adding one silently.

## 6.2 I2 — \`jurisdictionChallengeMade ∧ ¬interrogationOccurred\` — **WITHDRAWN, seed says the opposite**

> \`aftermathTruths\`, lines 131281–131286. The list's own header: *"structured seed ids for what is ALREADY
> TRUE at the top of this scene. The planner must return 'kept' for each; an objective that reverses one is
> rejected."*
> \`interrogation_interrupted\`: *"Julian, the Provast, has **ALREADY** questioned Lirael before the assembly
> — intimately, as an accusation through desirability — and the presiding Dohkar interrupted it as grossly
> inappropriate. Only then did her choice (run in shame or remain) arise. **Not re-staged.**"*

And the challenge's own reversal frame explicitly **separates** itself from the questioning:

> Line 131489: *"…reframing the accusation as his own to answer rather than Lirael's — a real jurisdictional
> contest over authority, **not another question put to Lirael**."*

**Forbidden transition (as claimed):** \`⟨int:F⟩ → ⟨int:F, jcm:T⟩\` — Julian contesting jurisdiction before
questioning her.

**Verdict: WITHDRAWN, twice over.** First, the rule is *vacuous*: \`interrogationOccurred\` is a fixed
aftermath truth, so \`¬interrogationOccurred\` never obtains and the rule excludes nothing real. Second, the
rule's stated rationale — that the challenge is *over the questioning he began* — is contradicted: the seed
frames the challenge as about the **accusation and who may rule**, pointedly not about the questioning.

## 6.3 I3 — \`jurisdictionChallengeMade ∧ ¬accusationMade\` — **UPHELD**

> Line 131356, \`julian_jurisdiction_challenge\` label: *"Julian challenges jurisdiction, **reframes the
> accusation** politically, or contests who has authority to rule."*
> Line 131489, its reversal event frame: *"Julian challenges the presiding Dohkar's jurisdiction,
> **reframing the accusation as his own to answer rather than Lirael's** — a real jurisdictional contest
> over authority."*

**Forbidden transition:** \`⟨am:F⟩ → ⟨am:F, jcm:T⟩\` — a jurisdiction challenge entering the record while no
accusation is on it.

**Verdict: UPHELD.** Both authored descriptions define the lane by its object, and that object is *the
accusation*. "Reframes the accusation" and "as his own to answer rather than Lirael's" are unintelligible
with nothing charged. This is close to definitional, not an inferred ordering. Removes 32 cells.

## 6.4 I4 — \`reviewPending ∧ inquiryOpened\` — **UPHELD, strongest evidence in the packet**

> Line 131354, \`dohkar_preliminary_review\` label: *"**HARD LIMITS, because the seed reserves the formal
> inquiry for LATE Issue 1**: do NOT name who convenes it, do NOT give a date or a timeframe, do NOT name The
> Open, a Chayr, or \\"two Dohkars\\", and do NOT set terms. **A preliminary review may be DEMANDED here; it
> may not be CONVENED, SCHEDULED, or CONSTITUTED.**"*
> Line 131652, row 14: *"THE INQUIRY CONVENES… The panel is constituted HERE for the first time; **nothing
> earlier may have convened it**."*
> Plus \`deferral_reason_key: 'preliminary_process_before_formal_inquiry'\` (§6.1).

**Forbidden transition:** \`⟨rp:T⟩ → ⟨rp:T, io:T⟩\` and \`⟨io:T⟩ → ⟨io:T, rp:T⟩\` — in either direction, a
pending preliminary review coexisting on the record with a constituted inquiry.

**Verdict: UPHELD.** The seed states the supersession directly and twice, in capitals, and enforces it with a
landmark lock. Removes 32 cells.

## 6.5 The rule the evidence produced that I had not proposed

Two excerpts already quoted pin two predicates to constants **for the opening**:

> Line 130927, world truth "LIRAEL'S FORMAL INQUIRY — WHERE AND WHEN": *"It is NOT yet convened, and its
> convening is LATE-ISSUE-1 content, not an early scene's. **Early scenes may carry accusation, preliminary
> review, political pressure, investigation, concealment, or flight — never the convened inquiry itself**,
> and never a scene staged at The Open before that point."*
> Line 131288, \`inquiry_authority_claimed\`: *"**The inquiry is NOT yet opened (that is a later scene).**"*
> Line 131286, \`interrogation_interrupted\`: *"has **ALREADY** questioned Lirael… **Not re-staged.**"*

**Forbidden transitions:** any opening state with \`inquiryOpened:T\`; any opening state with
\`interrogationOccurred:F\`.

This is the one rule with explicit, repeated, unambiguous seed backing — and I never proposed it. It is
**not applied by default**, because applying it silently would answer Flag A by fiat: it is only correct if
the matrix is opening-scoped. That is the decision now in front of you, and §1e prices both answers.

---
`;

// Replace §1e with the real, dual-scope result and append §6 before it.
const start = s.indexOf('## 1e. Gate status — NOT passing yet');
const end   = s.indexOf('# 2. Late-Issue-1 unmoored outcomes (proposed)');
if (start < 0 || end < 0) throw new Error('ANCHOR MISSING for §1e');

const NEW_1E = `## 1e. Coverage check — mechanical, and reported separately from approval

Run: \`node _fs_coverage_check.mjs\` (pure enumeration; no page, no provider). **Coverage is not approval.**
Every entry counted below is a draft awaiting your decision; a cell counts as covered when some drafted
outcome is eligible in it, regardless of whether that draft is approved.

**Excluded from both runs:** \`unm.adverse_event_deferred\` (rank 4). Its eligibility — "some adverse row
scheduled and unheld" — is not expressible in these seven predicates, which model only one adverse row
(\`reviewPending\`). Including it could only *add* coverage, so both figures are floors.

### Reading 1 — one matrix across Issue 1 (I3 + I4) — **72 valid cells**

| | |
|---|---|
| covered | **72 / 72** |
| uncovered | **0** |

Per-outcome reach, and where an outcome is the *only* eligible one:

| rank | outcome | cells | sole cover for |
|---|---|---|---|
| 10 | \`unm.band_unremarked\` | 24 | 3 |
| 9 | \`unm.witness_dispersal\` | 24 | — |
| 9 | \`unm.record_order_unread\` | 8 | — |
| 8 | \`unm.procedural_delay\` | 24 | 1 |
| 8 | \`unm.restriction_unnamed\` | 12 | — |
| 7 | \`unm.julian_standing_questioned\` | 24 | — |
| 6 | \`unm.custody_unraised\` | 36 | 4 |
| 6 | \`unm.hearer_unnamed\` | 16 | 3 |
| 5 | \`unm.absent_accuser_noted\` | 12 | — |

No entry is dead, and four carry cells nothing else reaches — including \`unm.hearer_unnamed\`, which
confirms Flag B's resolution mechanically: U2 is not merely valid, it is **only** reachable through that
entry.

### Reading 2 — matrix scoped to the opening (I3 + I4 + the §6.5 pin) — **24 valid cells**

Only the six opening-set entries are in scope; the four §2 entries are late by construction.

| | |
|---|---|
| covered | **23 / 24** |
| uncovered | **1** |

The single gap, in predicate order \`A I R I C A J\`:

| cell | reading |
|---|---|
| \`A··IC·J\` | accusation made · interrogation occurred · custody revealed · jurisdiction challenged · no assembly staged · no review pending |

**This gap is real and closable without new authoring.** Both \`unm.restriction_unnamed\` (rank 8) and
\`unm.hearer_unnamed\` (rank 6) are eligible in it; both are currently filed as late-Issue-1. Of the two,
\`unm.restriction_unnamed\` is the one compatible with the opening's HARD LIMITS — its whole content is that
the restriction is *not* named, which is exactly what §6.4's excerpt forbids naming early. **Proposed, not
applied:** if you take Reading 2, reclassify \`unm.restriction_unnamed\` to the opening set and the opening
matrix closes at 24/24.

### What this does *not* claim

The gate does not pass, because passing is not mine to declare. Under either reading the drafted entries
cover the domain (Reading 2 after one reclassification), but every entry, rank, stance and proposition id in
this packet is still **proposed editorial canon** awaiting approval. Full coverage by unapproved drafts is
coverage, not a gate.

`;

s = s.slice(0, start) + NEW_1E + s.slice(end);
const s2 = s.indexOf('# 5. Revised authoring volume, and what needs approval');
if (s2 < 0) throw new Error('ANCHOR MISSING for §5');
s = s.slice(0, s2) + APPENDIX.trimStart() + '\n' + s.slice(s2);

fs.writeFileSync(F, s);
console.log('appendix §6 written; §1e replaced with the dual-scope mechanical result');
