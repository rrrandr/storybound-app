import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_three_final_traces.md',
'| **`ceases[]`** | `answer.owned_by_institution` *(state)* · `answer.julian_is_caretaker` *(state)* |',
'| **`ceases[]`** | `answer.owned_by_institution` *(state)* · `answer.julian_is_caretaker` *(state)* · **`answer.lirael_holding_bounded`** *(state — added 2026-09-29; its basis was the Institution\'s title and may not be carried over)* |');

sub('_three_final_traces.md',
`| **\`establishes[]\`** | \`answer.owned_by_no_one\` — *No institution and no person holds a claim on the Answer.*<br>\`answer.no_caretaker\` — *No one holds the caretaker's role over it.* |`,
`| **\`establishes[]\`** | \`answer.owned_by_no_one\` — *No institution and no person holds title to the Answer.*<br>\`answer.no_caretaker\` — *No one holds the caretaker's charge over it.*<br>**\`answer.holding_bound_to_proceeding\`** — *Lirael holds the Answer only for the questioning now before the assembly. The presiding Dohkar's authority over the rite and over the ruling on the Sacrificiant's conduct governs her holding for its duration. It is not hers.* |`);

sub('_three_final_traces.md',
`| **\`unchanged[]\`** | **\`answer.lirael_holding_bounded\`** — *she holds it only for the questioning; it is not hers.* **The claim ends; the bound on her holding survives it.** · every other atom |`,
`| **\`unchanged[]\`** | **\`auth.dohkar_claims_rite_and_ruling\`** — *the rite and the ruling on the Sacrificiant's conduct are his* (\`131288\`). **This is the active basis of the new bound**, and this outcome does not touch it. · every other atom |
| **standing after** | **title: no one · caretaker's charge: no one · authority over the proceeding: the presiding Dohkar.** Nobody owns it and someone still governs the room; only the second kind of standing survives. |
| **what Lirael may do** | **may** hold it for the duration of the questioning and use it as the questioning requires. **May not** claim it, carry it away, or use it outside the questioning. |
| **authored open** | **when the questioning ends, her holding ends — and there is no one to relinquish it to.** No title, no caretaker, and the Dohkar's authority covers the proceeding rather than the keeping of a relic. **Stated as open; nothing may infer an answer from the silence.** |`);

sub('_three_final_traces.md',
'| **cost** | `custody_unclaimed` |',
'| **cost** | `custody_unclaimed` — **no one holds title or the caretaker\'s charge.** It does *not* mean the room is unsupervised: **what is unwatched is the relic, not the scene.** |');
console.log('custody trace corrected at source');
