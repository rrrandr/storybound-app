import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

// Candidate A: remove the residue cost.
let s = fs.readFileSync('_unseen_escape_candidates.md','utf8');
const a = s.indexOf('## A7. Cost — `residual_suspicion`, and it comes from the class\'s own field');
const b = s.indexOf('## A8. Prevents checked');
if (a < 0 || b < 0) throw new Error('ANCHOR MISSING for A7');
s = s.slice(0, a) + `## A7. Cost — **NONE. \`residual_suspicion\` is REMOVED (2026-09-28)**

**Schema legality was not semantic support.** \`suspicionFromResidue\` is legal on a collective entry, but that
establishes only that it can be **reported**. The mechanism catalog licenses \`memory_perception\` to **edit
what parties know**, with a declared population and a disposition from the closed enum. **It does not license
authoring a residue-suspicion effect as a designed cost.**

**And a mechanical point settles it independently:** \`disposition\` is **singular per party**. The enum
contains \`suspects\` as a *different* disposition, not an addition to \`forgot\`. **An outcome cannot author
the crowd as both.** This one chose forgetting.

> **This is a costless crowd-memory change, and that is not a weaker outcome.** \`unm.dohkar_demand_unmade\`
> and \`unm.the_accusation_unmade\` are costless too. The limits in §A5 — she is still present, the twist stays
> known, the four named retain everything — do the work a cost was reaching for.

Full reasoning: \`_compiler_contract_boundary.md\` §3.

` + s.slice(b);
fs.writeFileSync('_unseen_escape_candidates.md', s);

// Candidate A: replace the migration note with the native field.
sub('_unseen_escape_candidates.md',
`- **\`invokerExemption\`** (191251) — **RESOLVED by a proposed contract migration**, not by overloading the
  existing enum. New status **\`not_targeted_by_population\`** records that the invoker is outside the declared
  population **by ordinary set membership — not spared, never in scope**; new reason \`population_membership\`
  records the converse. \`invoker_anchor\` becomes legacy-read-only and is **never written.** Full migration:
  \`_contract_and_atom_pass.md\` §1b. **This candidate writes \`not_targeted_by_population\`.**`,
`- **\`invokerExemption\`** (191251) — **not used, and not extended.** Growing the extractor's enum would be
  migration by accretion into a retrospective reading contract. The compiler has a **native** field instead:
  \`invokerScope: in_population | not_in_population | exempted_by_grant\`, with a declared lossy mapping to the
  report contract. **This candidate writes \`not_in_population\`** — Lirael is not in the crowd, and that is
  scope, not sparing. See \`_compiler_contract_boundary.md\` §2a.`);

// Candidate B: correct the companion atom.
sub('_unseen_escape_candidates.md',
`| **\`auth.julian_claims_convene_preside\`** ⚠ **conditional companion** | **only if \`jurisdictionChallengeMade\` is active.**`,
`| ⚠ **WRONG ATOM — corrected 2026-09-28.** \`auth.julian_claims_convene_preside\` is Julian's claim to convene the formal inquiry, **not** the jurisdiction challenge, which is a separate event from lane \`julian_jurisdiction_challenge\` (131356). And **that lane is disjunctive too** — challenges jurisdiction / reframes the accusation / contests who has authority — so the companion cannot be named precisely until it is split. See \`_compiler_contract_boundary.md\` §4a. | **only if \`jurisdictionChallengeMade\` is active.**`);

// Sheet: reflect the costless outcome.
sub('_first_sacrifice_opening_approval_sheet.md',
`| *tbd* | \`unseen\` | **candidate \`unm.the_turning_forgotten\`** | the crowd forgets **that the assembly turned to look at her** — and nothing else. She is still standing there; the twist is still known; Seren, Julian, the Dohkar and Lirael all still remember the turning. **Not invisibility.** | \`residual_suspicion\` — they keep the loose note and lose the moment that explained it |`,
`| *tbd* | \`unseen\` | **candidate \`unm.the_turning_forgotten\`** | the crowd forgets **that the assembly turned to look at her** — and nothing else. She is still standing there; the twist is still known; Seren, Julian, the Dohkar and Lirael all still remember the turning. **Not invisibility.** | **none** — the residue cost was removed as schema-legal but unlicensed |`);
console.log('boundary pass applied');
