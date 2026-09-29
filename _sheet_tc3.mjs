import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };
sub(`| *tbd* | \`unseen\` | \`unm.witness_scattered\` → **proposed replacement \`unm.testimony_closed\`** | everyone saw it and everyone remembers — and **the proceeding forming against her cannot take a word from any of them** about the ceremony, until the formal inquiry convenes. They may talk anywhere else. | no witness may speak **for** her either |`,
`| *tbd* | \`unseen\` | \`unm.witness_scattered\` → **proposed replacement \`unm.testimony_closed\`** | everyone saw it and everyone remembers — and **the proceeding forming against her cannot take a statement from any of them**, Lirael included, for as long as the closure stands. They may talk anywhere else. | no witness may speak for her — **and she cannot explain herself into it either** |`);
sub(`| **8** | \`escape\` | \`unm.the_answer_speaks\` | the Answer renders a reading that **exculpates her**, permanently on the record | it names **her own ward** as the source |`,
`| ⚠ | \`escape\` | \`unm.the_answer_speaks\` | **needs a source audit** — its grant assumes the Answer can attest retrospectively to a completed wish; the seed describes it only as a **live examination** instrument | it names **her own ward** as the source |`);
fs.writeFileSync(F, s);
console.log('sheet updated for rev 3 and the answer_speaks flag');
