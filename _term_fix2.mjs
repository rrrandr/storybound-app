import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_answer_visibility_contact_and_risk.md',
'- **Lirael can be read through the Answer** — read, not proven; by people, not by the relic.',
'- **Lirael can be read through the Answer** — read, not proven; by people, not by the relic; **and only while she is the alignment subject, not merely the apparent physical holder.**');

const L = '_answer_lore_and_silence_reopened.md';
sub(L,
`**It responds to the present holder's inner alignment**, and it responds by **changing shape**:

| the holder | the shape |`,
`**It responds to the alignment subject's inner alignment** — normally the **apparent physical holder**, but
see the contact layer — and it responds by **changing shape**:

| the alignment subject | the shape |`);
sub(L,
"| the Answer | **not a lie detector**; shape-responds to the **present holder's** alignment |",
"| the Answer | **not a lie detector**; shape-responds to the **alignment subject's** alignment — normally, but not always, the **apparent physical holder** |");

sub('_atomic_fact_graph_proposal.md',
"> causation, factual guilt, or who caused the twist.** It **shape-responds to the present holder's alignment**:",
"> causation, factual guilt, or who caused the twist.** It **shape-responds to the alignment subject's alignment** — normally the **apparent physical holder**, but not where Julian's concealed contact materially affects it:");
console.log('terminology normalized across all four files');
