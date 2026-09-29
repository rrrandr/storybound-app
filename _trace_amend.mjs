import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,50));
  fs.writeFileSync(f, s.split(a).join(b)); };

// Withdraw the overstated blocker where it was first recorded.
sub('_revision_fact_dependency_traces.md',
  '### BLOCKER — this may orphan the Issue\'s own arc gate',
  `### ~~BLOCKER — this may orphan the Issue\'s own arc gate~~ — **WITHDRAWN 2026-09-28**

> **This finding was overstated and is withdrawn.** \`deferral_reason_key\` is not part of the gate:
> \`_checkArcConstraint\` (app.js:206425–206430) turns solely on
> \`_isStoryEventCommitted('inquiry_opened')\`, and returns \`reason_key\` only on the failure path as
> explanatory copy. **No Issue-1 gate depends on the scene-2 review demand.** The route to the late spine
> runs through Julian's offstage demand and row 4, and survives this outcome intact. Full trace:
> \`_proceeding_unmade_trace.md\`. The original wording is kept below for the record.`);

// Correct the conflated atom in the graph proposal.
sub('_atomic_fact_graph_proposal.md',
  '| `review.demanded` | **event** | lane label (131354) — a demand made and registered by `population.assembly` | `auth.dohkar_claims_rite_and_ruling` (the standing to demand) | **permitted** |',
  `| \`review.demanded_by_dohkar\` | **event** | lane label (131354), \`objectiveActor: 'the presiding Dohkar'\` — pressure applied **on stage**, registered by \`population.assembly\` | \`auth.dohkar_claims_rite_and_ruling\` | **permitted** |
| \`review.demanded_by_julian\` | **event** | row 4 (131556) — *"Julian is named aloud as having demanded a review; he is NOT in the room"* — made **offstage** | — | **permitted** |`);

sub('_atomic_fact_graph_proposal.md',
  'The matrix predicate `reviewPending` reads `review.demanded ∧ ¬review.convened ∧ ¬superseded`.',
  `> **Corrected 2026-09-28.** \`review.demanded\` as first proposed **conflated two acts by two parties**:
> the presiding Dohkar's on-stage pressure in scene 2, and Julian's offstage demand revealed at row 4. They
> are separate events with separate actors and must be separate atoms — the Issue's whole route to its late
> spine runs through Julian's, and the editorial packet's \`demand_authorship\` proposition already made that
> authorship canon. Found by tracing \`unm.proceeding_unmade\`; see \`_proceeding_unmade_trace.md\` §4a.

The matrix predicate \`reviewPending\` reads \`review.demanded_by_dohkar ∧ ¬review.convened ∧ ¬superseded\`.`);

// Record the sealed-fact approval in the graph proposal.
sub('_atomic_fact_graph_proposal.md',
  '**Its value is player-set, not seed-set** — which makes it a different kind of fact from every other atom\nhere, all of which carry fixed seed values. **Flagged rather than smoothed over:** approving this means\napproving a declared fact whose value is bound at runtime. If you would rather not introduce that class of\nfact yet, the alternative is that `unm.time_gives_way` may not reach the disposition at all, and must say so.',
  `**Its value is player-set, not seed-set** — a different kind of fact from every other atom here.

> **APPROVED 2026-09-28 as a SEALED PLAYER-CHOICE FACT — not a general mutable state field.** Closed values
> (the authored Scene-1 choices only); created only when that choice is accepted and sealed; **absent and
> unresolved before then, never defaulted**; bound to its originating \`sceneUid\` and choice record; and a
> later revision must list it explicitly as **unchanged, ceased, or replaced**.
>
> **Its value may never be guessed** from current UI, from later prose, or from an author's assumption — the
> sealed choice record is the only source. **And never inferred from ceasing \`interr.choice_arose\`**: the
> event that produced the choice and the disposition that resulted are separate atoms, and a cascade between
> them would silently rewrite what the player actually chose.`);
console.log('amended: blocker withdrawn, atom split, sealed-fact approval recorded');
