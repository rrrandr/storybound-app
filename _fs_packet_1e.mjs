import fs from 'fs';
const F = '_first_sacrifice_editorial_packet_2026_09_28.md';
let s = fs.readFileSync(F, 'utf8');

const start = s.indexOf('## 1e. Coverage check');
const end   = s.indexOf('# 2. Late-Issue-1 unmoored outcomes (proposed)');
if (start < 0 || end < 0) throw new Error('ANCHOR MISSING');

const NEW = `## 1e. Coverage check — opening-scoped, mechanical, reported separately from approval

Run: \`node _fs_coverage_check.mjs\` (pure enumeration; no page, no provider, no model).
**Coverage is not approval.** Every entry counted is proposed editorial canon awaiting your decision; a cell
counts as covered when some drafted outcome is eligible in it, approved or not.

\`\`\`
scope       : Issue 1 OPENING only (Flag A resolved 2026-09-28)
invariants  : inquiryOpened=false, interrogationOccurred=true  (seed-pinned, §6.5)
free preds  : 5 → 32 reachable opening states
  I3 LIVE    removes 8
  I4 VACUOUS removes 0   (retained for the late matrix)

VALID CELLS : 24
COVERED     : 24 / 24
UNCOVERED   : 0
\`\`\`

| rank | outcome | cells | sole cover for | |
|---|---|---|---|---|
| 10 | \`unm.band_unremarked\` | 8 | — | |
| 9 | \`unm.witness_dispersal\` | 12 | — | |
| 8 | \`unm.procedural_delay\` | 12 | — | |
| 8 | \`unm.restriction_unnamed\` | 4 | **1** | *phase extension* |
| 7 | \`unm.julian_standing_questioned\` | 16 | **1** | |
| 6 | \`unm.custody_unraised\` | 12 | **1** | |

**Excluded:** \`unm.adverse_event_deferred\` (rank 4) — its eligibility ("some adverse row scheduled and
unheld") is not expressible in these predicates, which model one adverse row. It can only *add* coverage, so
24/24 is a floor.

### Reading the result honestly

- **The opening matrix now closes: 24 of 24.** The gap \`A··IC·J\` found in the previous run is covered, and
  \`unm.restriction_unnamed\` is its **sole** cover — the phase extension was load-bearing, not cosmetic.
- **Three entries each hold exactly one cell alone.** The set has no redundancy at its edges: removing any of
  \`unm.restriction_unnamed\`, \`unm.julian_standing_questioned\` or \`unm.custody_unraised\` reopens a hole.
- **Two reach-numbers shrank for a structural reason, not an authoring one.** \`unm.witness_dispersal\`
  (\`assemblyStaged ∧ ¬inquiryOpened\`) and \`unm.julian_standing_questioned\`
  (\`interrogationOccurred ∧ ¬jurisdictionChallengeMade\`) each carry a conjunct that the invariants make
  constantly true. Within this phase they reduce to \`assemblyStaged\` and \`¬jurisdictionChallengeMade\`. Their
  eligibility text is **left as written**, because those conjuncts become live again in the late matrix.
- **The domain shrank by 75%, from 128 nominal to 32 reachable.** That is the cost of the scope decision and
  it was accepted knowingly: a smaller, phase-true domain over a larger permissive one.

### What this does *not* claim

The coverage gate is **not** claimed to pass. Full coverage by unapproved drafts is coverage, not a gate.
What is now established is narrower and worth stating exactly: *given* the declared opening scope, the
declared invariants, and I3 as the single live exclusion, the six drafted opening entries leave no reachable
opening state without an eligible outcome. Approval of those entries remains outstanding.

**Still owed, and explicitly out of scope here:** the late-Issue-1 phase matrix and its outcome set,
including the four §2 entries, which this packet drafts but does not place in a domain.

`;

s = s.slice(0, start) + NEW + s.slice(end);
fs.writeFileSync(F, s);
console.log('§1e replaced with the opening-scoped result');
