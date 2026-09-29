import fs from 'fs';
const F = '_answer_contact_rule_revised.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

sub(`| condition | |
|---|---|
| **physical separation** | Julian is **physically separated** from the Answer |
| **supervised handling** | the Answer's handling is **supervised such that concealed contact is impossible** |`,
`| condition | meaning |
|---|---|
| **physical separation** | Julian is established **not to be in physical contact** with the Answer. |
| **supervised handling** | Handling is **supervised such that concealed contact is impossible**. |

**Either condition establishes that the apparent physical holder is the alignment subject.** They are
alternatives, not a pair to be satisfied together.`);

fs.writeFileSync(F, s);
console.log('reliance table repaired with an explicit header and both conditions named');
