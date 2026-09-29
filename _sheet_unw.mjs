import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };
sub(`| ⛔ | \`unseen\` | \`unm.witness_scattered\` | **BLOCKED** — \`incoherent\` is not an effect until each party's exact mistaken proposition is authored | — |`,
`| *tbd* | \`unseen\` | \`unm.witness_scattered\` → **proposed replacement \`unm.unwitnessed\`** | everyone remembers exactly what they saw, and **none of it can be taken** — no account of the rite may be entered or heard from anyone who witnessed it | no witness may speak **for** her either |`);
fs.writeFileSync(F, s);
console.log('sheet row updated with the proposal');
