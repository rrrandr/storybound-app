import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

// Supersede the two-kind proposal in the final traces.
sub('_three_final_traces.md',
`### Proposed refinement — **requires your decision, not applied**

> **Ceasing an \`event\` atom → reality revision. Ceasing a \`state\` or \`availability\` atom → ordinary canon
> change. \`establishes[]\` only → additive / revelatory.**

**Both classifications are given below so nothing is silently reclassified.** Under the current rule 4 of 6
deltas are revisions; under the refinement, **2** are — \`time_gives_way\` and \`accusation_unmade\`, the two that
genuinely un-happen events.`,
`### ⛔ SUPERSEDED 2026-09-28 — atom kind is not enough

My proposed rule (*state-cease is always ordinary*) was **wrong**. **A state can be ended now, or rewritten as
having never governed** — *"the Institution released its claim"* and *"the Institution never had a claim"*
cease the same atom and are different acts on the world.

**Replaced by three temporal operations**, declared explicitly on every delta:
\`historical_replacement\` · \`current_state_transition\` · \`additive_canon_change\`.
**Atom kind is evidence, not the decision.** Full taxonomy: \`_delta_temporal_taxonomy.md\`.`);

// Update the per-trace classifications.
sub('_three_final_traces.md',
'| **classification** | **revision** under the current rule · **ordinary canon change** under the §0b refinement |',
'| **`temporalOperation`** | **`current_state_transition`** — the claim happened and still happened; its authority is void **from now**. No history is replaced, so no `priorHistoryReplaced` is required. |');

sub('_three_final_traces.md',
'| **classification** | **revision** under the current rule · **ordinary canon change** under the §0b refinement — **both ceased atoms are states, and neither un-happens an event** |',
'| **`temporalOperation`** | **`current_state_transition`** — **decided**: the Institution\'s claim **ends now**, not "was never valid". The "never valid" reading would collapse `answer.lirael_holding_bounded`, whose basis is that claim, and hand her the relic outright by the back door. See `_delta_temporal_taxonomy.md` §4. |');

sub('_three_final_traces.md',
'| **classification** | **ADDITIVE** under both rules — **the only one of the three that is unambiguous** |',
'| **`temporalOperation`** | **`additive_canon_change`** — a new social fact begins governing; nothing ends |');

sub('_three_final_traces.md',
`| outcome | class | ceases | duration | classification |
|---|---|---|---|---|
| \`unm.custody_severed\` | \`materialization_possession\` | 2 **states** | \`persists\` | revision *(current)* / ordinary *(refined)* |
| \`unm.standing_dissolved\` | \`identity_reputation\` | 1 **state** | \`persists\` | revision *(current)* / ordinary *(refined)* |
| \`unm.the_shunning\` | \`relationship_social\` | **none** | \`persists\` | **additive**, unambiguously |`,
`| outcome | class | ceases | duration | \`temporalOperation\` |
|---|---|---|---|---|
| \`unm.custody_severed\` | \`materialization_possession\` | 2 states | \`persists\` | **\`current_state_transition\`** |
| \`unm.standing_dissolved\` | \`identity_reputation\` | 1 state | \`persists\` | **\`current_state_transition\`** |
| \`unm.the_shunning\` | \`relationship_social\` | none | \`persists\` | **\`additive_canon_change\`** |`);

sub('_three_final_traces.md',
`**Open for you:** the §0b taxonomy refinement — event-cease vs state-cease. Until it is decided, the current
mechanical rule stands and two of these three are labelled revisions.`,
`**Taxonomy resolved** — three temporal operations, declared per delta, never inferred. See
\`_delta_temporal_taxonomy.md\`.`);

// Reality-revision note: record the taxonomy.
sub('_reality_revision_design_note.md',
`## 4a. Two kinds of delta (amended 2026-09-28)`,
`## 4a-bis. Three temporal operations (amended 2026-09-28, superseding the two-kind split below)

**Every delta declares \`temporalOperation\` explicitly. It is never inferred from atom kind, class, or the
shape of \`ceases[]\`.**

| operation | the authored claim |
|---|---|
| **\`historical_replacement\`** | a prior event or state **never occurred or never governed**. Requires \`history_rewrite\` semantics **and** \`priorHistoryReplaced\`. |
| **\`current_state_transition\`** | an active state **ends or changes from this moment onward**. **Historical records remain true.** |
| **\`additive_canon_change\`** | a new fact begins governing **without ending a prior fact**. |

**Why kind alone failed:** a state can be **ended now** or **rewritten as never having governed** — the same
ceased atom, two different acts on the world. Full taxonomy and classifications:
\`_delta_temporal_taxonomy.md\`.

## 4a. Two kinds of delta (amended 2026-09-28)`);
console.log('temporal taxonomy applied');
