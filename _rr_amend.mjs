import fs from 'fs';
const F = '_reality_revision_design_note.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,60)); s = s.split(a).join(b); };

sub(`| \`ceases\` | explicit list of **declared fact refs** that stop governing future canon |
| \`establishes\` | explicit list of facts that begin governing |`,
`| \`ceases\` | **closed set** of declared fact refs that stop governing future canon |
| \`establishes\` | **closed set** of replacement facts that now govern — **MANDATORY, never empty for a cease** |`);

sub(`## 3c. What a revision may never do`,
`## 3b-bis. No replacement may be inferred from an absence (amended 2026-09-28)

**A revision declares both closed sets. Neither author nor planner may infer the replacement state from what
is missing.**

Ceasing \`interrogation_interrupted\` does **not** establish *"the ceremony replayed without interrogation."*
It establishes nothing at all. The replacement must be named — along with **every causal companion** required
for active canon to remain coherent.

Two consequences, both found by tracing real outcomes:

1. **A compound fact cannot be ceased atomically.** Three of the four seed \`aftermathTruths\` assert several
   things in one paragraph. Ceasing such an id ceases every clause, including ones the outcome never meant to
   touch — which is **D2's widening-by-implication**, committed by the cease rather than by the grant. Facts
   must be decomposed to clause level before a revision may name them.
2. **An absence can silently grant.** \`the_answer_institutional\` carries *"Lirael holds it only for the
   questioning"*. Cease the whole id and nothing bounds her holding any more — a far larger grant than the
   outcome claimed, arrived at by omission. The closed set must state the replacement either way.

Full traces: \`_revision_fact_dependency_traces.md\`.

## 3c. What a revision may never do`);

sub(`6. Alter another revision. Revisions are as immutable as scenes.`,
`6. Alter another revision. Revisions are as immutable as scenes.
7. **Cease anything without establishing its replacement.** An empty \`establishes\` alongside a non-empty
   \`ceases\` is malformed, not minimal.
8. **Cease a lane id, an objective template, or any other non-fact.** Only declared fact refs may be ceased.`);

sub(`## How a named population reconciles with an explicit roster`,
`## Approved populations (2026-09-28)

| id | content | members |
|---|---|---|
| \`population.assembly\` | the collective crowd of First Favored family and guests | **excludes** \`pc:lirael\`, \`named:seren\`, \`named:julian\`, \`role:first_sacrifice_presiding_dohkar\` |
| \`population.scene_present\` | that collective **plus** those four named present people | all five refs |

**No headcount is canon** — the seed gives only the prose approximation *"roughly two dozen"*, which is not
stored. **At seal each population expands through its declared rule** into the exact roster / collective
reference the outcome uses.

**This is scope, not privilege.** The exclusion is a fact about who the crowd *is*, approved explicitly — not
a protagonist rule. There is still no invoker filter anywhere, and \`population.scene_present\` reaches Lirael
like everyone else.

## How a named population reconciles with an explicit roster`);

fs.writeFileSync(F, s);
console.log('reality-revision note amended: establishes[] mandatory, populations approved');
