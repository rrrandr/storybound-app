import fs from 'fs';
const sub = (f,a,b,opt) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) { if (opt) return console.log('  (skip) ' + f); throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55)); }
  fs.writeFileSync(f, s.split(a).join(b)); };

// Atomic graph: retire the mixed atom, declare the split.
sub('_atomic_fact_graph_proposal.md',
'| `auth.julian_claims_convene_preside` | **state** | *"Julian agreed and publicly claimed authority to convene and preside over it"* | `auth.venue_named_formal_inquiry` |',
`| ~~\`auth.julian_claims_convene_preside\`~~ | ~~state~~ | — | ⛔ **RETIRED 2026-09-28 — mixed atom, split below** |
| **\`auth.julian_claimed_convene_preside\`** | **event** | *"Julian agreed and **publicly claimed**"* — the act, before the assembly | \`auth.venue_named_formal_inquiry\` |
| **\`auth.julian_standing_to_convene\`** | **state** | *"**authority to convene and preside** over it"* — whether that claim presently carries authority | \`auth.julian_claimed_convene_preside\` |

> **Split required 2026-09-28.** The clause carries **an act and a condition**. One mixed atom cannot be
> marked \`unchanged\` while part of its meaning changes — \`unm.standing_dissolved\` leaves the claim standing
> and voids the standing, which is two facts. See \`_three_final_traces.md\` §1a.`);

// v3 / v2: point standing_dissolved at the split.
sub('_revision_outcomes_v3.md',
'`auth.julian_claims_convene_preside` — **alone**',
'~~`auth.julian_claims_convene_preside`~~ → **`auth.julian_standing_to_convene`** (the current state) **alone**. The historical act `auth.julian_claimed_convene_preside` is **unchanged** — Reading B approved 2026-09-28. See `_three_final_traces.md` §1.', true);

sub('_first_sacrifice_tempt_outcomes_v2.md',
'| **ceases** | `inquiry_authority_claimed` |',
'| **ceases** | **`auth.julian_standing_to_convene`** — the current state only. The historical act **`auth.julian_claimed_convene_preside` is unchanged.** Reading B, 2026-09-28. |', true);

// Sheet: the three rows.
const SH = '_first_sacrifice_opening_approval_sheet.md';
sub(SH,
'| *tbd* | `authority` | `unm.standing_dissolved` | Julian\'s standing over this rite is not doubted — **void** | a jurisdictional war she started |',
'| *tbd* | `authority` | `unm.standing_dissolved` | **the room remembers him claiming it, and the claim is worth nothing.** The claim stands in history; the standing behind it is void. | a jurisdictional war she started |', true);
sub(SH,
'| **5** | `authority` | `unm.standing_dissolved` | Julian\'s standing over this rite is not doubted — **void** | a jurisdictional war she started |',
'| *tbd* | `authority` | `unm.standing_dissolved` | **the room remembers him claiming it, and the claim is worth nothing.** The claim stands in history; the standing behind it is void. | a jurisdictional war she started |', true);
console.log('split applied');
