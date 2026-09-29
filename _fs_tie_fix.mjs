import fs from 'fs';
const S = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(S, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,60)); s = s.split(a).join(b); };

// --- 1. Re-rank restriction_unnamed 8 -> 5, and rewrite its fairness paragraph ------------
sub(`### Rank 8 — \`unm.restriction_unnamed\`  *(extended to the opening 2026-09-28)*`,
    `### Rank 5 — \`unm.restriction_unnamed\`  *(extended to the opening 2026-09-28; re-ranked from 8, see Part 2a)*`);

sub(`**Why rank 8 is fair:** identical in weight to \`unm.procedural_delay\` and for the same reason — real relief,
no cost, no permanence. It is not ranked with 9 or 10 because **nothing is denied to the record**; the
restriction is fully intact, only unvoiced. A tie at 8 is correct here: the two are genuinely
player-equivalent, differing in flavor rather than in favor.`,
`**Why rank 5 is fair:** this is the entry that lets the most adverse material through. The investigation
**is** named aloud; the restrictions **are** fully in force; the relief is bounded to this scene and expires
with it. Compare rank 6, where a fact never reaches the assembly at all. Here the fact reaches them — only
its terms are withheld. It sits above the floor because not being publicly bound in front of witnesses is
genuine protection, and below everything else because it is the least of the protections on offer.

*(This entry was drafted at rank 8, tied with \`unm.procedural_delay\`. The tie was wrong and is resolved in
Part 2a.)*`);

// --- 2. Re-order: move the entry to its ranked position, after custody_unraised ----------
const startR = s.indexOf('### Rank 5 — `unm.restriction_unnamed`');
const endR   = s.indexOf('### Rank 7 — `unm.julian_standing_questioned`');
if (startR < 0 || endR < 0) throw new Error('ANCHOR MISSING for reorder');
const block = s.slice(startR, endR);
s = s.slice(0, startR) + s.slice(endR);
const anchor4 = s.indexOf('### Rank 4 — `unm.adverse_event_deferred`');
if (anchor4 < 0) throw new Error('ANCHOR MISSING rank 4');
s = s.slice(0, anchor4) + block + s.slice(anchor4);

fs.writeFileSync(S, s);
console.log('restriction_unnamed re-ranked to 5 and moved into ladder position');
