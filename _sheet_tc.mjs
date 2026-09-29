import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };
sub(`| *tbd* | \`unseen\` | \`unm.witness_scattered\` → **proposed replacement \`unm.unwitnessed\`** | everyone remembers exactly what they saw, and **none of it can be taken** — no account of the rite may be entered or heard from anyone who witnessed it | no witness may speak **for** her either |`,
`| *tbd* | \`unseen\` | \`unm.witness_scattered\` → **proposed replacement \`unm.testimony_closed\`** | everyone saw it and everyone remembers — and **the proceeding forming against her cannot take a word from any of them** about the ceremony, until the formal inquiry convenes. They may talk anywhere else. | no witness may speak **for** her either |`);
fs.writeFileSync(F, s);
console.log('sheet row updated');
