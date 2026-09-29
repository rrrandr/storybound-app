import fs from 'fs';
// Keep the packet and the check consistent with the re-rank. Eligibility predicates are untouched.
const P = '_first_sacrifice_editorial_packet_2026_09_28.md';
let p = fs.readFileSync(P, 'utf8');
const sub = (s,a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,60)); return s.split(a).join(b); };

p = sub(p, '### `unm.restriction_unnamed` — rank 8',
`### \`unm.restriction_unnamed\` — rank 5

> **Re-ranked from 8 (2026-09-28).** It was drafted tied with \`unm.procedural_delay\`; the tie was rejected,
> because two eligible outcomes at one rank means favor stops deciding and a seeded tie-break decides instead.
> Compared as complete packages the two differ on two declared fields — durability (\`bounded\` vs \`persists\`)
> and how much adverse material reaches the world — with no compensating advantage, so they take distinct
> ranks. Full comparison in \`_first_sacrifice_opening_approval_sheet.md\` §2a. **Eligibility, facts, affected
> and unchanged sets, cost and wording anchors are all unchanged by the re-rank.**`);

p = sub(p, '| 8 | `unm.restriction_unnamed` | 4 | **1** | *phase extension* |',
           '| 5 | `unm.restriction_unnamed` | 4 | **1** | *phase extension* |');
fs.writeFileSync(P, p);

const C = '_fs_coverage_check.mjs';
let c = fs.readFileSync(C, 'utf8');
c = sub(c, `{ id:'unm.restriction_unnamed',        rank:8,`, `{ id:'unm.restriction_unnamed',        rank:5,`);
fs.writeFileSync(C, c);
console.log('packet and coverage check synced to rank 5');
