import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

// ---- 2. Canonical delta model ---------------------------------------------------------
sub('_reality_revision_design_note.md',
`# 4. Active canon is derived, never stored

**Never store "current truth" as a mutable blob.** Fold it:

> \`activeCanon()\` = base declared facts, with every revision applied in ascending \`seq\` order,
> each removing its \`ceases\` and adding its \`establishes\`.

The **active world revision** is the highest-\`seq\` entry in the log.`,
`# 4. Active canon is derived, never stored

**Never store "current truth" as a mutable blob.** Fold it:

> \`activeCanon()\` = base declared facts, with every **canonical delta** applied in ascending \`seq\` order,
> each removing its \`ceases\` and adding its \`establishes\`.

## 4a. Two kinds of delta (amended 2026-09-28)

The append-only log holds **canonical deltas**. They are not all revisions:

| delta | shape | what it is |
|---|---|---|
| **reality revision** | has a non-empty \`ceases[]\` (and a mandatory \`establishes[]\`) | something that governed no longer does — the world is **revised** |
| **additive / revelatory canon change** | \`establishes[]\` only | something now governs that did not — the world **gains** a fact |

**An additive change is NOT a revision, and must not be dressed as one.** An earlier proposal here was to give
it an empty \`ceases[]\` so it would fit the existing type. That was **type-driven modelling, not design**: it
would have labelled every new fact a rewrite of reality, made "revision" mean nothing in particular, and made
the count of revisions useless as a signal of how much a story had been unmade.

The distinction is real and worth keeping sharp. **Revising is taking something back; revealing is not.**
\`unm.the_answer_speaks\` puts a reading on the record that was never there — nothing is taken back, and the
player who cast it did not unmake the world.

**Everything else in this note applies to both kinds**: immutable RECORD, closed sets, no inference from
absence, atoms only, explicit memory, derived canon, forward citation. Only \`ceases[]\` distinguishes them.

The **active world revision** is the highest-\`seq\` entry in the log.`);

// ---- 6. F4 restored to the status; F2 corrected; F3 blocked; F5 approved ---------------
sub('_choice_pending_contract_and_nine_audit.md',
`**Proposed:** it is a revision record with **\`ceases: []\`** and a non-empty \`establishes[]\`. The existing
prohibition is one-directional — *empty \`establishes\` alongside a non-empty \`ceases\` is malformed* — and its
converse is legitimate. **One channel, no new machinery.**

Consequence, stated: **additive outcomes are revisions too**, so the count is **five of seven** unmoored
outcomes creating revisions, not four. Revisions are less rare than the design assumed.`,
`> ### Corrected 2026-09-28 — my proposal was rejected, and rightly
> I proposed making it a revision with an empty \`ceases[]\` so it would fit the existing type. **That is
> type-driven modelling, not design.** It would have called every new fact a rewrite of reality, and made
> "revision" stop meaning anything in particular.

**The model is amended instead.** The log holds **canonical deltas**:

| delta | shape | what it is |
|---|---|---|
| **reality revision** | non-empty \`ceases[]\` | something that governed no longer does |
| **additive / revelatory canon change** | \`establishes[]\` only | something now governs that did not |

**\`unm.the_answer_speaks\` is an additive canon change, not a revision.** Nothing is taken back; a reading
that was never on the record is now on it. **Revising is taking something back; revealing is not.**

So the count stands at **four of seven** unmoored outcomes creating revisions, plus one additive delta.
Revisions stay as rare as the design assumed — which is what makes them mean something.`);

sub('_choice_pending_contract_and_nine_audit.md',
`**Not resolved in this pass.** Either \`incoherent\` gets declared semantics, or the outcome is re-authored in
terms of \`forgotten\`.`,
`### ⛔ \`unm.witness_scattered\` is BLOCKED (2026-09-28)

**A vague label cannot alter minds.** \`incoherent\` is not an effect until its content is authored. Two ways
forward, both editorial:

1. **Author each affected party's exact mistaken or fragmented proposition** — what *this* person now believes
   happened, named per party. That is a large authoring job: it is a separate false belief for every member of
   \`population.scene_present\`, and \`population.assembly\` is a collective that cannot hold individual
   beliefs, so the outcome may not even be expressible at that reach.
2. **Re-author the outcome as a defined forgetting effect** — \`forgotten\`, which already has semantics, at
   whatever reach is dramatically right.

**Blocked until one is chosen.** It may not be ranked, counted in coverage, or presented for approval
meanwhile.`);

sub('_choice_pending_contract_and_nine_audit.md',
`Also: its \`establishes\` fact should be renamed from \`shunned_by_assembly\` — the assembly is now a narrower
body than the outcome's actual reach. **Proposed: \`lirael.shunned_by_all_present\`.**`,
`**APPROVED 2026-09-28**, and the established fact is renamed \`shunned_by_assembly\` →
**\`lirael.shunned_by_all_present\`** — "assembly" is now a narrower body than the outcome's actual reach, and
a fact named after the wrong population is the same class of error as an outcome scoped to one.`);
console.log('model amended; F2 corrected, F3 blocked, F5 approved');
