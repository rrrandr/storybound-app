import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_unseen_escape_candidates.md',
`- **\`invokerExemption\` is required** (191251) — ⚠ **and the enum cannot express this case.** Lirael is outside
  the target population **by non-membership**, but \`status: exempt\` admits only reasons \`invoker_anchor\` or
  \`ambiguous_wording_consequence\`. **Neither means "not a member."** Recording \`invoker_anchor\` would assert
  the legacy default this design has withdrawn. **Schema gap, flagged, not worked around.**`,
`- **\`invokerExemption\`** (191251) — **RESOLVED by a proposed contract migration**, not by overloading the
  existing enum. New status **\`not_targeted_by_population\`** records that the invoker is outside the declared
  population **by ordinary set membership — not spared, never in scope**; new reason \`population_membership\`
  records the converse. \`invoker_anchor\` becomes legacy-read-only and is **never written.** Full migration:
  \`_contract_and_atom_pass.md\` §1b. **This candidate writes \`not_targeted_by_population\`.**`);

sub('_unseen_escape_candidates.md',
`**Every crowd entry carries \`suspicionFromResidue: true\`.** They know something happened and no longer know
it happened to her — which is favorable — **and they know the account no longer adds up**, which is not.`,
`**The collective entry carries \`suspicionFromResidue: true\`** — **one boolean, on one collective**, which is
the schema's own unit of account: *"EVERY party on the page gets an entry … and **each declared collective**"*
(191238), with both booleans required for every non-\`absent\` entry.

> **Audited and pinned (2026-09-28).** What is licensed is a **collective-level** state. **Differentiated
> individual states inside the crowd are not** — that is the line \`incoherent\` crossed and this does not.
> **The prose may not render this as individuals each privately suspecting**, and 191238's companion rule binds:
> *"Memory may NOT be inferred from gaze, silence, stillness, composure or presence."*

They know something happened and no longer know it happened to her — which is favorable — **and the account no
longer adds up**, which is not.`);

sub('_unseen_escape_candidates.md',
`**\`accusation.family_public\`** — declared from the lane the way \`review.demanded_by_dohkar\` was, source
\`app.js:131355\`:`,
`> ### ⛔ SUPERSEDED — the lane is split (2026-09-28)
> A disjunctive lane may not be targeted as one event. Two atoms are now declared —
> **\`accusation.family_accused\`** and **\`accusation.family_demanded_remedy\`** — and this rewrite ceases
> **\`accusation.family_accused\` only**, with \`accusation.family_demanded_remedy\` explicitly **unchanged**.
> The jurisdiction-challenge companion is conditional on that choice and would not arise had the remedy demand
> been chosen. See \`_contract_and_atom_pass.md\` §2. Original single-atom text below, superseded.

**\`accusation.family_public\`** — declared from the lane the way \`review.demanded_by_dohkar\` was, source
\`app.js:131355\`:`);

sub('_first_sacrifice_opening_approval_sheet.md',
`| *tbd* | \`escape\` | **candidate \`unm.the_accusation_unmade\`** | the family's public accusation **was never made**. Not innocence — the twist still stands, anyone with standing may accuse her tomorrow, and Julian's demand still brings row 4. | **none supported**, and none invented |`,
`| *tbd* | \`escape\` | **candidate \`unm.the_accusation_unmade\`** | the family's public **accusation** was never made. Not innocence — the twist stands, anyone with standing may accuse her tomorrow, Julian's demand still brings row 4, **and if they demanded remedy that demand survives: no one says she did it, and they still want paying.** | **none supported**, and none invented |`);
console.log('pass applied to both candidates and the sheet');
