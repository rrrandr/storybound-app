import fs from 'fs';
const F = '_answer_custody_canon.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

// --- 1. Narrow the open consequence -------------------------------------------------
sub(`> **The act that put it in her hands is spent, and there is no entrusted holder to return it to.**

Julian's charge is vacant. The Institution holds title but **title is not custody** and this outcome confers
custody on no one. The Dohkar has authority over the rite and **explicitly none over the relic**.

**So at the end of the questioning a True Answer is in the hands of the woman whose conduct is being
questioned, and the order has no one standing to take it back.**

**This outcome does not resolve that**, and says so. **Nothing may infer a resolution from the silence** — not
a reversion to the Institution, not the Dohkar stepping in, not Julian resuming. A later scene must author it.`,
`> **When the questioning ends, Lirael's temporary authorization has expired and Julian no longer has charge.
> The Answer's title remains with the Institution, but the story has not yet established who may lawfully
> receive or recover this particular instance.**

### ⚠ Corrected 2026-09-29 — the previous wording overreached

It read: *"the order has **no one standing** to take it back."* **That is not established.** An entrustment
vacancy proves only that **Julian's** ceremonial charge is vacant. It **does not** erase the Institution's
title, and **nothing in the seed says that title carries no recovery authority** or that no other qualified
First Favored may be appointed or act.

**What the outcome establishes is a custody crisis, not abandonment.** The narrower statement above preserves
the possibility of a later lawful institutional response **without silently granting it or silently denying
it** — and it is already dramatic on its own terms: **an unreturned relic, a voided custodian, and no
presently declared handoff.**

**Nothing may be inferred either way** — not a reversion to the Institution, not the Dohkar stepping in, not
Julian resuming, and **not the absence of any of those.** A later scene must author it.`);

// --- 2. Cost: same narrowing ---------------------------------------------------------
sub(`**\`custody_unclaimed\`**, now meaning exactly: **no First Favored holds the ceremonial charge of this Answer.**
Not that the room is unsupervised — the rite proceeds under the Dohkar as before. **What is unattended is the
relic, and the person holding it is the accused.**`,
`**\`custody_unclaimed\`**, meaning exactly: **no First Favored presently holds the ceremonial charge of this
Answer.** Not that the room is unsupervised — the rite proceeds under the Dohkar as before. **Not that the
Institution has lost or waived its title, or its means of recovery.** What is unattended is **the charge**,
and the person holding the relic is the accused.`);

// --- 3. Split the handoff atom and declare the expiry --------------------------------
sub(`| **\`answer.handed_to_lirael_for_questioning\`** | **event** | the separately declared temporary act by which it is in her hands |`,
`| **\`answer.handed_to_lirael\`** | **event** | the act: the Answer was placed in Lirael's hands before the assembly |
| **\`answer.lirael_authorized_to_hold\`** | **availability** | **"Lirael is authorized to hold this Answer only through the questioning now before the assembly. The authorization lapses when that questioning ends."** — **the expiry is in the fact, not in the prose** |`);

sub(`**Lirael — and on one explicit basis: \`answer.handed_to_lirael_for_questioning\`, the completed act by which
it came into her hands for this questioning.**`,
`**Lirael — on \`answer.lirael_authorized_to_hold\`**, the declared authorization created by the handoff:
*"authorized to hold this Answer only through the questioning now before the assembly; the authorization
lapses when that questioning ends."*

> **The expiry is a term of the fact itself.** A completed handoff does not become temporary because prose
> calls it temporary — **the fact says what it authorizes and until when**, and it lapses by its own terms
> rather than by anyone remembering to end it.

> **Why two atoms and not one** — the same rule that split Julian's claim from his standing. Fused, a delta
> revoking her authorization mid-questioning would also un-happen the handoff, which is the mixed-atom defect
> corrected twice already. **\`answer.handed_to_lirael\` is historical and stays historical;
> \`answer.lirael_authorized_to_hold\` is the live term that can lapse or be revoked.**`);

sub(`| **\`answer.handed_to_lirael_for_questioning\`** | **a completed act.** It happened; ending a custody does not un-hand it. |`,
`| **\`answer.handed_to_lirael\`** | **a completed act.** It happened; ending a custody does not un-hand it. |
| **\`answer.lirael_authorized_to_hold\`** | **unchanged and still running** — this outcome ends Julian's charge, not her authorization. It lapses by its own declared term when the questioning ends. |`);

sub(`**Not** on the Dohkar's authority. **Not** on anyone's live custody, because there is none. **Her holding
rests on a historical act, not on a standing anyone currently holds** — which is precisely what makes it
temporary and precisely what makes its end a problem.`,
`**Not** on the Dohkar's authority. **Not** on anyone's live custody, because there is none. **Her holding
rests on a declared authorization with its own expiry**, not on a standing anyone currently holds — which is
what makes it temporary and what makes its end a problem.`);

fs.writeFileSync(F, s);
console.log('narrowed the open consequence; split the handoff atom with a declared expiry');
