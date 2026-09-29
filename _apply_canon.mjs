import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_custody_bound_basis_trace.md',
'> **One trace only. No ranking, no coverage run, no implementation.**',
`> ## ⛔ SUPERSEDED IN FULL — 2026-09-29
> **This trace grounded Lirael's holding in \`auth.dohkar_claims_rite_and_ruling\`. That is wrong.**
> **Julian — not the Dohkar — is the Answer's entrusted holder**, by virtue of his office; a Dohkar presiding
> at a First Sacrifice is **too junior to hold one**, and rite authority is not relic authority. This document
> committed the exact collapse it was written to fix, one layer over.
>
> Replaced by \`_answer_custody_canon.md\`, where the holding is founded on a **completed act** rather than on
> anyone's live authority. Retained for the record only.`);

// Retire the old atoms in the graph proposal.
sub('_atomic_fact_graph_proposal.md',
`| \`answer.julian_is_caretaker\` | **state** | *"Julian is its caretaker"* | \`answer.owned_by_institution\` |
| \`answer.lirael_holding_bounded\` | **availability** | *"Lirael holds it only for the questioning. It is not hers."* | \`answer.owned_by_institution\` |`,
`| ~~\`answer.julian_is_caretaker\`~~ | — | — | ⛔ **RETIRED 2026-09-29** → \`answer.entrusted_to_julian\` |
| ~~\`answer.lirael_holding_bounded\`~~ | — | — | ⛔ **RETIRED 2026-09-29** — fused an act with its limit |
| **\`answer.instance_identity\`** | **state** | this Answer is one specific, stable instance among many | — |
| **\`answer.entrusted_to_julian\`** | **state** | *"Julian is its caretaker"*, read under the 2026-09-29 canon: **ceremonial entrustment of this instance by virtue of office — not personal ownership** | \`answer.instance_identity\` |
| **\`answer.handed_to_lirael_for_questioning\`** | **event** | *"Lirael holds it only for the questioning"* — the **separately declared temporary act** | — |

> **Custody canon, 2026-09-29.** Four layers stay separate: **instance · title · entrustment · physical
> holding**, with **rite authority conferring none of them**. The Answer is entrusted to the highest-ranking
> First Favored for ceremonial and judgement rites; **a Dohkar presiding at a First Sacrifice is too junior**,
> and the presiding Dohkar has **no custodial authority over the relic**. See \`_answer_custody_canon.md\`.`);

// Update the final trace for custody_severed.
sub('_three_final_traces.md',
'# 2. `unm.custody_severed`',
`# 2. \`unm.custody_severed\` — ⛔ **RE-AUTHORED 2026-09-29, see \`_answer_custody_canon.md\` §2**

> **The table below is superseded.** Under the recorded custody canon, **Julian — not the Dohkar — holds the
> entrustment**, by virtue of office. The grant now ceases **\`answer.entrusted_to_julian\` alone**;
> \`answer.owned_by_institution\` stays **unchanged** because title and custody are different layers; and
> Lirael's holding is founded on **\`answer.handed_to_lirael_for_questioning\`**, a completed act, **not on any
> live authority**. The presiding Dohkar **gains nothing**. Original table retained for the record.`);
console.log('canon applied; prior custody basis superseded');
