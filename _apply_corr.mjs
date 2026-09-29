import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };
const BLOCK = '⛔ **`world_bent_in_public` is BLOCKED (2026-09-28)** — it asserted *"the assembly watched Fate move around her"*, i.e. **public perception of a history rewrite.** `history_rewrite` licenses `priorHistoryReplaced` and `survivingContradictions`; **neither is witnessing**, and `relationship_social` is the only class carrying a `witnesses` field. **This outcome currently has no supported intrinsic cost.**';

sub('_first_sacrifice_tempt_outcomes_v2.md',
'| **intrinsic cost** | **`world_bent_in_public`** — the assembly watched Fate move around her, in front of the exact body weighing whether she interfered with a rite |',
'| **intrinsic cost** | ' + BLOCK + ' |');

sub('_first_sacrifice_tempt_outcomes_v2.md',
'**Rank 9, not 10:** the bigger headline, deliberately below a costless one. `world_bent_in_public` is a real',
'> **The ranking argument below is void with the cost.** Re-derivation waits on a supported cost or its removal.\n\n**Rank 9, not 10:** the bigger headline, deliberately below a costless one. `world_bent_in_public` is a real');

sub('_mechanism_audit_ledger.md',
'| **cost** | `world_bent_in_public` — *"the assembly watched Fate move around her"* |',
'| **cost** | ' + BLOCK + ' |');

sub('_revision_outcomes_v3.md',
`- Whether any First Favored's alignment sense registers the bend.
- What Julian does in a world where he never asked.`,
`- ~~Whether any First Favored's alignment sense registers the bend.~~ **REMOVED 2026-09-28** — an open fact
  that invites an author to assert an unlicensed capability is that capability with a question mark.
  Alignment-sense reads **wish misalignment** (16620), not ruptures.
- What Julian does in a world where he never asked.`);

const SH = '_first_sacrifice_opening_approval_sheet.md';
sub(SH,
`**Cost:** \`world_bent_in_public\` — she is now the woman reality visibly moved around, in front of the exact
body deciding whether she interfered with a rite. **Rank:** *pending re-derivation.*`,
`**Cost:** ⛔ **none supported.** \`world_bent_in_public\` is blocked — it assumed the assembly *perceives* a
history rewrite, and no rupture class licenses that. **Rank:** *pending re-derivation.*`);

sub(SH,
`| *tbd* | \`undo\` | \`unm.time_gives_way\` | **time gives way**; the ceremony plays again without the interrogation, and **Lirael's Scene-1 choice returns, live and free to go the other way** | she is publicly the woman reality bends around |`,
`| *tbd* | \`undo\` | \`unm.time_gives_way\` | **time gives way**; the ceremony plays again without the interrogation, and **Lirael's Scene-1 choice returns, live and free to go the other way** | ⛔ **none supported** — \`world_bent_in_public\` blocked |`);

sub(SH,
`| ⛔ | \`unseen\` | — | **ASK-CLASS UNCOVERED.** \`unm.witness_scattered\` is blocked (F3) and \`unm.testimony_closed\` moved to precise-risk. No floor invented. | |`,
`| ⛔ | \`unseen\` | — | **UNCOVERED**, now **mapped to \`memory_perception\`** — the atom \`twist.assembly_turned\` already exists. No outcome drafted. | |`);

sub(SH,
`| ⛔ | \`escape\` | — | **ASK-CLASS UNCOVERED.** No floor invented. | |`,
`| ⛔ | \`escape\` | — | **UNCOVERED**, now **mapped to \`history_rewrite\`** (primary) / \`identity_reputation\` (secondary). No outcome drafted. | |`);

// Replace the precise-risk section with the withdrawal.
let s = fs.readFileSync(SH, 'utf8');
const a = s.indexOf("## Precise-risk — opt-in only, never Fate's choice");
const b = s.indexOf('# Part 3 — The six the player authors');
if (a < 0 || b < 0) throw new Error('ANCHOR MISSING for the precise-risk section');
s = s.slice(0, a) + `## ⛔ \`unm.testimony_closed\` — WITHDRAWN as a candidate (2026-09-28)

**Not blocked — withdrawn.** There is **no procedural/institutional rupture carrier** in the six-class
vocabulary. \`identity_reputation.recordsChanged\` governs *what records say*, not what a proceeding may
receive; \`other\` is a justification requirement, not a licence.

**It requires a new product mechanism and therefore leaves the current design.** Nothing in the opening set
waits on it.

---

` + s.slice(b);
fs.writeFileSync(SH, s);

sub('_unwitnessed_proposal.md',
`> **PROPOSED.** No ranking, no coverage computation, no implementation. Rev. 3 pins the three open details and
> **withdraws the favorability basis rev. 2 asserted**, which did not survive a source audit.`,
`> ## ⛔ WITHDRAWN AS A CANDIDATE — 2026-09-28
> **There is no procedural/institutional rupture carrier in the six-class vocabulary.**
> \`identity_reputation.recordsChanged\` governs what records *say*, not what a proceeding may *receive*, and
> \`other\` is a justification requirement rather than a licence. **This outcome requires a new product
> mechanism and therefore leaves the current design.**
>
> **Retained as a record of a design that needs a mechanism — not as a queued outcome.** Everything below
> remains accurate as specification and would be reusable if a procedural class is ever added.`);
console.log('corrections applied at source');
