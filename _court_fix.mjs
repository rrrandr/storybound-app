import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

const R = '_answer_contact_rule_revised.md';

sub(R,
`## 2a. The court case — the reading is of the holder

**In a court or hearing setting, where Julian cannot secretly maintain contact, the physical holder is the
alignment subject.**

This is the important consequence, and it points the other way from the caution I had been accumulating: **the
relic is dependable precisely where it matters most.** A formal proceeding is the setting least compatible
with surreptitious contact, so it is the setting where the manifestation most reliably reads the person
holding it.`,
`## 2a. The probative condition — separation or supervision, **not the setting**

> ### ⚠ Tightened 2026-09-29 — I made the setting do the work
> I wrote that *"in a court or hearing setting… the physical holder is the alignment subject."* **A formal
> proceeding is not itself a magical guarantee that Julian lacks contact.** Rooms do not exclude him; **facts
> about the handling do.**

**The manifestation is probative only where the scene establishes one of these:**

| condition | |
|---|---|
| **physical separation** | Julian is **physically separated** from the Answer |
| **supervised handling** | the Answer's handling is **supervised such that concealed contact is impossible** |

**Court testimony is a likely staging for that condition — not a substitute for it.** A hearing is where such
separation or supervision is most naturally arranged and most naturally shown, which makes it the obvious
place to establish the condition. **It never establishes it by itself**, and a scene that asserts probative
force from the venue alone has skipped the step.`);

sub(R,
'| **an outcome may rely on the manifestation** | **only when the scene explicitly establishes the relevant physical-contact condition** |',
'| **an outcome may rely on the manifestation** | **only when the scene explicitly establishes physical separation, or supervision making concealed contact impossible.** The venue never substitutes for that. |');

sub(R,
`**The declaration requirement stands, with its trigger corrected:** \`answer.julian_active_contact\` must be
established for the form to be relied on. **Undeclared is still not "absent."** What has changed is that
**establishing it is now a normal, reachable thing for a scene to do** — in a formal proceeding it is close to
the default — rather than a near-impossible precondition.`,
`**The declaration requirement stands, with its trigger corrected:** \`answer.julian_active_contact\` must be
established for the form to be relied on. **Undeclared is still not "absent."** What has changed is that
**establishing it is a normal, reachable thing for a scene to do** — a hearing is where separation or
supervised handling is most naturally arranged and shown — rather than a near-impossible precondition.
**But it is the separation or the supervision that is established, never the venue.**`);

sub(R,
'| court / hearing setting | **the physical holder is the alignment subject** |',
'| probative condition | **physical separation, or supervision making concealed contact impossible.** A court or hearing is a likely **staging** for it, **never a substitute** for establishing it. |');

sub('_answer_visibility_contact_and_risk.md',
`> **Consequence:** in a court or hearing setting, where he cannot secretly maintain contact, **the physical
> holder is the alignment subject.** The section below stands, read under this narrowing.`,
`> **Consequence:** the manifestation is probative **only where the scene establishes physical separation, or
> supervised handling that makes concealed contact impossible.** A formal proceeding is **not itself** a
> guarantee that Julian lacks contact — it is a **likely staging** for that condition, never a substitute for
> establishing it. The section below stands, read under this narrowing.`);

sub('_answer_lore_and_silence_reopened.md',
'| control channel | **surreptitious physical contact ONLY**; no remote channel, and a wish is not a second path. In a court or hearing setting **the physical holder is the alignment subject.** See `_answer_contact_rule_revised.md`. |',
'| control channel | **surreptitious physical contact ONLY**; no remote channel, and a wish is not a second path. The form is probative **only where the scene establishes physical separation or supervised handling** — a hearing is a likely staging, never a substitute. See `_answer_contact_rule_revised.md`. |');
console.log('court language tightened');
