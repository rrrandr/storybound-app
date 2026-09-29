import fs from 'fs';
const F = '_final_traces_and_gap_authoring.md';
const SEC = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/79822a26-4953-4e0a-b337-9520e623604d/scratchpad/custody_section.md';
let s = fs.readFileSync(F, 'utf8');
const a = s.indexOf('## 5b. `unm.the_custody_unremembered` — ask `silence` — PROPOSED');
const b = s.indexOf('# 6. Intentional product gaps');
if (a < 0 || b < 0) throw new Error('ANCHOR MISSING');
s = s.slice(0, a) + fs.readFileSync(SEC, 'utf8') + s.slice(b);

// Also record the approved gate on the_claim_unmade.
const g = '| `requiresActive[]` | `auth.dohkar_claims_rite_and_ruling` — invariant |';
if (!s.includes(g)) throw new Error('ANCHOR MISSING for gate');
s = s.split(g).join('| `requiresActive[]` | `auth.dohkar_claims_rite_and_ruling` — invariant |\n| **`requiresInactive[]`** | **`accusation.family_accused`** — **gate approved 2026-09-29.** This is the **pre-accusation** escape answer; `unm.the_accusation_unmade` is the active-family-accusation answer. **They are never ranked or tie-broken against each other**, because they are never both eligible. |');
fs.writeFileSync(F, s);
console.log('custody section replaced; claim_unmade gate recorded');
