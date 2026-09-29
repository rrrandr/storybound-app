import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

const V = '_answer_visibility_contact_and_risk.md';

// Insert the terminology block before the boundary table.
sub(V, '## The correct boundary',
`## 1a. Terminology — two roles, never conflated

| term | meaning |
|---|---|
| **apparent physical holder** | the person **visibly holding** the Answer |
| **alignment subject** | the person whose **inner alignment the Answer is actually responding to** |

| declared contact | the relationship between them |
|---|---|
| \`answer.julian_active_contact: absent\` | **the apparent physical holder IS the alignment subject** |
| **active contact declared as materially affecting the manifestation** | **do NOT infer that the apparent holder is the alignment subject** |
| **the effect of contact is not authored** | **the form is non-probative for consequence selection** |

> **Why the split is required.** Saying *"the Answer responds to the current holder"* and then admitting
> Julian can influence it through concealed contact makes the base rule and its exception contradict each
> other. **Separating the roles keeps the normal handoff rule intact while making Julian's interference
> legible** — the exception narrows *who the subject is*, rather than breaking the rule about what the relic
> does.

## The correct boundary`);

sub(V,
'| **visibly change shape** in the current holder\'s hands according to their inner alignment | tell observers whether the holder is **factually right** |',
'| **visibly change shape** in the **apparent physical holder\'s** hands, according to the **alignment subject\'s** inner alignment | tell observers whether the alignment subject is **factually right** |');
sub(V,
'| — clear belief / clear purpose → a straight, sharp blade | tell them whether the holder is **guilty** |',
'| — clear belief / clear purpose → a straight, sharp blade | tell them whether they are **guilty** |');
sub(V,
'| — uncertainty → a scythe at one end, a mace at the other | tell them whether the holder is **lying about the past** |',
'| — uncertainty → a scythe at one end, a mace at the other | tell them whether they are **lying about the past** |');

sub(V,
'> **While Julian\'s active contact is present, the Answer\'s shape is NOT a clean readout of Lirael alone.**',
`> **While Julian's active contact is present, the Answer's shape is NOT a clean readout of Lirael alone.**
> **Lirael is then the apparent physical holder, and who the alignment subject is may not be inferred.**`);

sub(V,
'| **Lirael can be read through the Answer** — read, not proven; by people, not by the relic.',
'| **Lirael can be read through the Answer** — read, not proven; by people, not by the relic; **and only while she is the alignment subject, not merely the apparent physical holder.**'.replace(/^\| /,'- ').replace(/ \|$/,''));

// Lore file.
const L = '_answer_lore_and_silence_reopened.md';
sub(L,
`**It responds to the present holder's inner alignment**, and it responds by **changing shape**:

| the holder | the shape |`,
`**It responds to the alignment subject's inner alignment** — normally the apparent physical holder, but see
the contact layer — and it responds by **changing shape**:

| the alignment subject | the shape |`);
sub(L,
'| the Answer | **not a lie detector**; shape-responds to the **present holder\'s** alignment |',
'| the Answer | **not a lie detector**; shape-responds to the **alignment subject\'s** alignment — normally, but not always, the **apparent physical holder** |');

sub('_atomic_fact_graph_proposal.md',
'> causation, factual guilt, or who caused the twist.** It **shape-responds to the present holder\'s alignment**:',
'> causation, factual guilt, or who caused the twist.** It **shape-responds to the alignment subject\'s alignment** — normally the **apparent physical holder**, but not where Julian\'s concealed contact materially affects it:');
console.log('terminology normalized');
