import fs from 'fs';
const F = '_APPROVAL_SHEET.md';
let s = fs.readFileSync(F, 'utf8');
const a = '**Each carrier was audited before drafting. Neither new outcome uses the Answer to establish past guilt,\ntruth, or causation, and neither invents a capability.**';
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
s = s.split(a).join(a + `

### Scope basis for \`unm.the_custody_unremembered\`

> **The sealed population includes Lirael; therefore she receives the same memory effect as every other
> member. No invoker exemption applies.**

**Membership is the only basis.** D1 removes an automatic exemption; **it does not create a second rule that
adds a party whenever an ask would otherwise be ineffective.** That the subject would remain raisable if she
retained the knowledge is **editorial rationale for choosing \`population.scene_present\`** over the narrower
crowd — **never an independent targeting basis.**`);
fs.writeFileSync(F, s);
console.log('approval sheet updated with the corrected scope basis');
