import fs from 'fs';
const F = '_answer_lore_and_silence_reopened.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

sub(`**The custody reading is dissolved.** Nothing about ownership or charge is at stake — Julian is entrusted, she
is authorized, and the authorization expires on its own terms. **What the player is actually exposed to is
§3: the shape in her hands is testifying about her right now.**`,
`**The custody reading is dissolved.** Nothing about ownership or charge is at stake — Julian is entrusted, she
is authorized, and the authorization expires on its own terms. **What the player is actually exposed to is
§3: the shape in her hands changes with her present alignment, and people may see it and draw conclusions.**
Not a verdict, and not testimony — **an exposure to other people's inference.**`);

sub(`**Decision yours.** If \`silence\` should be covered, the ask itself may need re-reading — what a player means
by *"don't bring it up"* when the thing in her hands is a mirror is a different question from custody, and
worth asking before anything is drafted.`,
`**Decision yours.** If \`silence\` should be covered, the ask itself may need re-reading — what a player means
by *"don't bring it up"* when the object in her hands visibly changes with her own clarity is a different
question from custody, and worth asking before anything is drafted.

> **And a further complication now stands between the ask and any answer:** per
> \`_answer_visibility_contact_and_risk.md\`, **the shape may not be relied on at all unless
> \`answer.julian_active_contact\` is declared.** An outcome built on what the form shows would have to declare
> it — which is one more reason not to draft one yet.`);

fs.writeFileSync(F, s);
console.log('residual verdict-framing removed');
