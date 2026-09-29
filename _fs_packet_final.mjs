import fs from 'fs';
const F = '_first_sacrifice_editorial_packet_2026_09_28.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,60)); s = s.split(a).join(b); };

sub(`| declared invalid-cell rules | **2 upheld** (I1, I2 withdrawn) | §1b, §6 |
| valid cells | **72** (Reading 1) or **24** (Reading 2) — 60 was wrong | §1b, §1e |`,
`| declared invalid-cell rules | **2 upheld** (I1, I2 withdrawn); **1 live** in this phase | §1b, §6 |
| opening-phase invariants | **2** (\`inquiryOpened\`, \`interrogationOccurred\`) | §1a-bis |
| valid cells — **Issue 1 opening** | **24** of 32 reachable (60 was wrong) | §1b, §1e |`);

sub(`| **unmoored outcomes — late Issue 1** | **4 proposed** | §2 |`,
`| **unmoored outcomes — late Issue 1** | **4 proposed**, 1 also opening-eligible | §2 |`);

sub(`| **A** | I1–I4 audited against seed text in §6: **I1 and I2 withdrawn, I3 and I4 upheld.** The evidence produced a stronger, unproposed rule (§6.5) whose applicability turns on one question I cannot answer from the seed: **does this matrix govern the opening only, or all of Issue 1?** | **OPEN — the one remaining item** |`,
`| **A** | **Opening-scoped.** The §6.5 invariants apply; the 72-cell Issue-1 reading is discarded, explicitly not retained for its larger coverage number. I4 is vacuous in this phase and carried forward. \`unm.restriction_unnamed\` extended to the opening by **phase only** — predicate, facts, cost, rank and anchors unchanged. | resolved 2026-09-28 |`);

sub(`- **The coverage gate is not claimed to pass**, though the mechanical check has now been run (§1e) and the
  drafted entries do cover the domain: 72/72 under Reading 1, 23/24 under Reading 2 with a named single-entry
  fix. That is **coverage by unapproved drafts**, which is not a gate. Approval of the entries, and an answer
  to Flag A, are what would turn it into one.`,
`- **The coverage gate is not claimed to pass.** The mechanical check has been run opening-scoped (§1e) and
  closes at **24/24**, but that is **coverage by unapproved drafts**, which is not a gate. Approval of the
  entries is what would turn it into one. All six flags are now resolved; none of the content is.
- **The late-Issue-1 phase matrix does not exist.** Its predicates, invariants, invalid-cell rules and
  outcome domain are unwritten. The four §2 entries are drafted but sit in no declared domain, and I4 is
  parked waiting for it. This is the next editorial unit, not a loose end in this one.`);

// Update the §6.5 close, which still describes the scope question as open.
sub(`This is the one rule with explicit, repeated, unambiguous seed backing — and I never proposed it. It is
**not applied by default**, because applying it would answer Flag A by fiat: it is only correct if
the matrix is opening-scoped. That is the decision now in front of you, and §1e prices both answers.`,
`This is the one rule with explicit, repeated, unambiguous seed backing — and I never proposed it.

**Now applied.** Flag A was resolved opening-scoped on 2026-09-28, which is the condition under which this
rule is correct. Both pins are declared in §1a-bis as opening-phase **invariants** rather than folded into
the invalid-cell rules, so that the late-Issue-1 matrix can restore them as free variables without having to
unpick an exclusion. Applying them cut the reachable domain from 128 nominal states to 32.`);

fs.writeFileSync(F, s);
console.log('§5 and §6.5 finalised');
