import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

const V = '_answer_visibility_contact_and_risk.md';

sub(V, '# 3. New layer — apparent possession is not control',
`# 3. New layer — apparent possession is not control

> ### ⚠ REVISED 2026-09-29 — see \`_answer_contact_rule_revised.md\`
> **Surreptitious physical contact is the ONLY control channel. Julian has no remote channel.** If another
> person is physically holding the Answer and he is not in contact, **its enchantment obeys that holder's
> alignment**. He may attempt a wish, but **a normal wish cannot overcome the Answer's far more intricate
> enchantment or redirect its response away from the physical holder** — and **a wish aimed at the relic is
> neither an interference path nor a reason to treat the manifestation as non-probative.**
>
> **Consequence:** in a court or hearing setting, where he cannot secretly maintain contact, **the physical
> holder is the alignment subject.** The section below stands, read under this narrowing.`);

sub(V,
`| **the effect of contact is not authored** | **the form is non-probative for consequence selection** |`,
`| **the effect of contact is not authored** | **the form is non-probative for consequence selection** |

> **Trigger corrected 2026-09-29:** non-probative follows from **the contact condition being unestablished** —
> **not** from the possibility of interference, and **not** from a wish having been aimed at the relic. An
> attempted wish that fails leaves the reading exactly as sound as it was.`);

sub('_answer_lore_and_silence_reopened.md',
'| new layer | **active contact/control** — apparent possession is not control; see `_answer_visibility_contact_and_risk.md` |',
`| new layer | **active contact/control** — apparent possession is not control; see \`_answer_visibility_contact_and_risk.md\` |
| control channel | **surreptitious physical contact ONLY**; no remote channel, and a wish is not a second path. In a court or hearing setting **the physical holder is the alignment subject.** See \`_answer_contact_rule_revised.md\`. |`);
console.log('contact revision applied');
