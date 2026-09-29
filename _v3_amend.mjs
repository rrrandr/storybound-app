import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,50));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_revision_outcomes_v3.md',
`**Resolution, proposed:** \`interr.choice_arose\` is **not ceased**. Its cause is **replaced** by
\`interr.choice_arose_from_twist\`, and \`lirael.scene1_disposition\` is listed **UNCHANGED**. She still ran or
still remained, and the reason is now the twist itself rather than a questioning that no longer happened.

**Canon stays coherent, the player's choice survives, and no cascade was inferred.** This is the graph's
advisory-dependency rule producing a *better* answer than a cascade would have: a cascade would have deleted
the choice silently.`,
`> ### ⛔ UNRESOLVED — the proposed resolution below is withdrawn as framed (2026-09-28)
>
> I proposed establishing \`interr.choice_arose_from_twist\` as the replacement cause and called it canon
> staying coherent while the player's choice survived. **Supplying a new cause for a sealed player choice is a
> new authored claim about why the protagonist acted.** It is not bookkeeping and does not become neutral by
> preserving the action — it preserves the *action* and rewrites the *reason*, and the reason is the part
> that says who she is.
>
> It is **option 1** of three, in \`_sealed_choice_under_rewind_note.md\`, and awaits a product decision.
> **\`unm.time_gives_way\` is not resolved.** Original text kept below for the record.

~~**Resolution, proposed:**~~ \`interr.choice_arose\` is **not ceased**. Its cause is **replaced** by
\`interr.choice_arose_from_twist\`, and \`lirael.scene1_disposition\` is listed **UNCHANGED**. She still ran or
still remained, and the reason is now the twist itself rather than a questioning that no longer happened.`);

sub('_revision_outcomes_v3.md',
`### Set-level interaction — **flagged, not resolved**
**\`mem.exact.julian_forgets_interrogation\` becomes unauthorable after this revision**, exactly as
\`seren_forgets_price\` is unauthorable in the opening: it names a fact that no longer governs. **The first
case of one outcome invalidating another**, and the corrected set needs a rule for it.`,
`### Set-level interaction — **RESOLVED by the active-canon invalidation rule (2026-09-28)**
\`mem.exact.julian_forgets_interrogation\` becomes **ineligible** after this revision — it names a fact that no
longer governs active canon — and routes through the no-exact-target / Fate-chosen path. It is not deleted
from the design; it is unselectable for as long as the revision governs.

**One rule covers both cases.** \`seren_forgets_price\` is ineligible because its target is **not yet** active;
this is ineligible because its target is **no longer** active. Same condition, read at different times.
Full rule: \`_sealed_choice_under_rewind_note.md\` §0.`);

sub('_revision_outcomes_v3.md',
`### Owed before any ranking

1. **The remaining nine outcomes** are still in their v2 form and need the same discipline.
2. **A set-level rule for outcome-invalidates-outcome** (§4) — new, and unaddressed by anything so far.
3. **\`review.demanded_by_julian\` and the two new demand atoms need approval** as authored canon.
4. Only then: re-rank all thirteen complete packages, then rerun coverage.`,
`**Except \`unm.time_gives_way\`**, whose closed set is valid but whose treatment of the sealed Scene-1 choice
is an open product decision — see \`_sealed_choice_under_rewind_note.md\`.

### Owed before any ranking

1. **The sealed-choice decision** for \`unm.time_gives_way\`. **Blocking.**
2. **The remaining nine outcomes** are still in their v2 form and need the same discipline.
3. ~~A set-level rule for outcome-invalidates-outcome~~ — **done**: the active-canon invalidation rule.
4. ~~The two new demand atoms need approval~~ — **approved 2026-09-28.**
5. **Coverage's third dimension** — states × ask-classes × active-canon configuration, since a revision
   removes exact readings from the selectable set.
6. Only then: re-rank all thirteen complete packages, then rerun coverage.`);
console.log('v3 amended: time_gives_way reopened, invalidation rule applied, owed list updated');
