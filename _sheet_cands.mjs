import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };
sub(`| ⛔ | \`unseen\` | — | **UNCOVERED**, now **mapped to \`memory_perception\`** — the atom \`twist.assembly_turned\` already exists. No outcome drafted. | |`,
`| *tbd* | \`unseen\` | **candidate \`unm.the_turning_forgotten\`** | the crowd forgets **that the assembly turned to look at her** — and nothing else. She is still standing there; the twist is still known; Seren, Julian, the Dohkar and Lirael all still remember the turning. **Not invisibility.** | \`residual_suspicion\` — they keep the loose note and lose the moment that explained it |`);
sub(`| ⛔ | \`escape\` | — | **UNCOVERED**, now **mapped to \`history_rewrite\`** (primary) / \`identity_reputation\` (secondary). No outcome drafted. | |`,
`| *tbd* | \`escape\` | **candidate \`unm.the_accusation_unmade\`** | the family's public accusation **was never made**. Not innocence — the twist still stands, anyone with standing may accuse her tomorrow, and Julian's demand still brings row 4. | **none supported**, and none invented |`);
fs.writeFileSync(F, s);
console.log('sheet updated with both candidates');
