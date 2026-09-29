import fs from 'fs';
const F = '_first_sacrifice_editorial_packet_2026_09_28.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,60)); s = s.split(a).join(b); };

// --- §1 title + scope declaration -------------------------------------------------------
sub(`# 1. The opening coverage matrix, completed

## 1a. The seventh predicate`,
`# 1. The Issue 1 **opening** coverage matrix, completed

> ## Scope — DECLARED (Roman, 2026-09-28), closing Flag A
> **This matrix governs the Issue 1 OPENING phase only.** The alternative — one permissive table across all
> of Issue 1 — was rejected on the reasoning that it blurs distinct story phases together, and specifically
> **not** retained for producing a larger coverage number. **Late Issue 1 needs its own declared phase matrix
> and its own outcome set**, to be built separately; nothing in this packet models it.

## 1a. The seventh predicate`);

// --- §1a: add the invariants ------------------------------------------------------------
sub(`2⁷ = **128 raw cells**.`,
`## 1a-bis. Two of the seven are opening-phase **invariants**, not variables

The seed pins two predicates for every opening state (excerpts in §6.5):

| predicate | pinned to | seed basis |
|---|---|---|
| \`inquiryOpened\` | **false** | *"Early scenes may carry accusation, preliminary review… **never the convened inquiry itself**"*; *"The inquiry is NOT yet opened (that is a later scene)."* |
| \`interrogationOccurred\` | **true** | \`interrogation_interrupted\` is an \`aftermathTruth\` — *"has **ALREADY** questioned Lirael… Not re-staged."* |

So the opening domain is **not** 2⁷ = 128. It is **2⁵ = 32 reachable states** over the five free predicates
(\`accusationMade\`, \`reviewPending\`, \`custodyRevealed\`, \`assemblyStaged\`, \`jurisdictionChallengeMade\`); the
other 96 of the 128 violate an invariant and cannot occur in this phase. Both invariants stay *declared
predicates* rather than being deleted, because the late-Issue-1 matrix will need them as live variables.

2⁷ = 128 raw cells over the full predicate set; **32 reachable** once the invariants apply.`);

// --- §1b: resolved form -----------------------------------------------------------------
sub(`> **Flag A (open, and now the only one) — which scope does this matrix govern?** Reading 2 follows §1's own
> title and the seed's explicit "early scenes … never the convened inquiry itself"; it also makes the four
> late outcomes of §2 out-of-scope here, which is consistent with their being late. Reading 1 keeps one
> matrix for all of Issue 1 and lets the late entries do real work in it. §1e reports coverage for both.`,
`> **Flag A — RESOLVED (Roman, 2026-09-28): opening-scoped.** The §6.5 pin therefore **applies**, and the
> reading that produced 72 cells is discarded despite being the larger number.

**One consequence to state plainly: I4 becomes vacuous in this phase.** With \`inquiryOpened\` invariantly
false, \`reviewPending ∧ inquiryOpened\` can never hold, so I4 excludes **0** of the 32 reachable states. It
is not withdrawn — its evidence (§6.4) is the strongest in the packet — but it does no work here and must be
carried forward to the late-Issue-1 matrix, where both terms vary and it becomes load-bearing.

**\`I3\` is the only live exclusion in the opening matrix**, removing 8 of 32. **Valid opening cells: 24.**`);

// --- restriction_unnamed: phase extension ------------------------------------------------
sub(`- **Unchanged:** every party's knowledge; **the restrictions themselves remain in force** — stated explicitly
  so no later scene reads this as their removal.
- **Durable:** \`world_fact\`, \`bounded\` to this scene.
- **Open:** when the restrictions are named, and before whom.
- **Intrinsic cost:** none.
- **Stance:** \`stance.dohkar.formal_hardening\`.`,
`- **Unchanged:** every party's knowledge; **the restrictions themselves remain in force** — stated explicitly
  so no later scene reads this as their removal. This outcome does **not** imply the restrictions were
  **lifted, named, accepted, or understood by any non-participant**. Nobody outside the exchange learns
  anything; no party consents to anything; silence about a restriction is not agreement to it, and a
  restriction that goes unspoken is neither softened nor negotiated.
- **Durable:** \`world_fact\`, \`bounded\` to this scene.
- **Open:** when the restrictions are named, and before whom.
- **Intrinsic cost:** none.
- **Stance:** \`stance.dohkar.formal_hardening\`.
- **Phase:** **opening and late Issue 1** — extended to the opening 2026-09-28, see below.

> #### Phase extension to the opening — what changed, and what did not
> **Changed: nothing but the phase in which this entry may be selected.** Its eligibility *predicate* is
> untouched — \`accusationMade ∧ jurisdictionChallengeMade ∧ custodyRevealed\` already holds in the gap cell
> \`A··IC·J\`, so no term was added, widened, or relaxed to reach it. Its declared facts, affected parties,
> durability, intrinsic cost (none), rank (**8**) and wording anchors are all unchanged.
>
> **Why "the restriction remains unspoken" is compatible with the opening's hard limits.** The limits in
> \`dohkar_preliminary_review\` (§6.4) are prohibitions on *naming*: do not name who convenes the review, its
> date, its terms, The Open, a Chayr, or "two Dohkars". This outcome's entire content is that the restriction
> is **not named aloud in this scene**. It does not merely avoid tripping the limits — it is the same
> restraint the limits impose, turned into the player's relief. The opening may carry procedural pressure
> without constituting a proceeding; an unspoken restriction is pressure that has not yet been constituted.
>
> **What it must never become.** Because the relief is silence rather than removal, the authored prose may
> not let that silence read as resolution. The restriction is in force, unaltered, and the scene ends with it
> still owed.`);

fs.writeFileSync(F, s);
console.log('Flag A resolved in packet; restriction_unnamed phase extension documented');
