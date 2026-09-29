import fs from 'fs';
const S = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(S, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,60)); s = s.split(a).join(b); };

// --- Part 2a: the tie resolution, inserted before Part 3 --------------------------------
const PART2A = `---

## Part 2a — The rank-8 tie, resolved

**The tie was not acceptable and has been removed.** Two eligible outcomes sharing a rank means that when
both are available and nothing higher is, *favor stops deciding* and a seeded tie-break decides instead. For
Tempt that is already ruled out: Fate's danger lives in what was asked, never in how it was phrased, and a
coin-flip between two different consequences is exactly the hidden re-phrasing the policy forbids.

### The two packages, compared as wholes

| | \`unm.procedural_delay\` | \`unm.restriction_unnamed\` |
|---|---|---|
| **granted fact** | the preliminary review is **deferred** | the restrictions are **not named aloud** this scene |
| **the adverse thing itself** | **removed from this scene** and rescheduled | **fully in force, and its subject is named** — only its terms are withheld |
| **durability** | **\`persists\`** — the deferral is a real change to when it happens | **\`bounded\`** to this scene — it expires with the scene |
| **affected** | the review's timing | the public record for this scene only |
| **unchanged** | every party's knowledge and stance | every party's knowledge; **the restrictions themselves** |
| **open** | whether the delay reads as favor or as suspicion | when the restrictions are named, and before whom |
| **intrinsic cost** | none | none |
| **consumed** | once, while a review is scheduled and unheld | once, and the relief lapses at scene end |

**They are not equivalent, and not merely different in flavour.** They differ on two declared fields:

1. **Durability — \`persists\` vs \`bounded\`.** One moves an adverse event in the story's actual schedule. The
   other withholds a sentence for the length of one scene, after which nothing has changed.
2. **How much adverse material reaches the world.** \`procedural_delay\` keeps the proceeding out of the scene
   entirely. \`restriction_unnamed\` lets the investigation be named and withholds only its terms.

On both axes \`procedural_delay\` is strictly more favorable, with no compensating advantage on the other
side — same cost (none), same consumption shape. **So they take distinct ranks: \`procedural_delay\` stays 8;
\`restriction_unnamed\` moves to 5.**

### Where 5 comes from, rather than 7

Placed by the same comparison against every entry between, which is what puts it at the bottom rather than
just one step down:

- **vs rank 7 (\`julian_standing_questioned\`):** rank 7's good is structural and persists (his standing to
  question her is unsettled) even after paying a real cost. \`restriction_unnamed\`'s good is bounded and
  costless. Persisting-with-cost beats bounded-without, because the bounded one leaves nothing behind.
- **vs rank 6 (\`custody_unraised\`):** the close call, and the decisive one. Both withhold something for one
  scene at no cost. But rank 6 keeps a **fact out of the assembly's hands entirely** — custody is never
  raised. \`restriction_unnamed\` lets the fact in: the investigation is named in front of everyone, and only
  its terms stay unspoken. **Keeping a fact out beats softening how a fact lands.**
- **vs rank 4 (\`adverse_event_deferred\`):** rank 4 defers a named beat out of the scene; this one lets the
  adverse beat happen and mutes part of it. It ranks above 4 only because not being publicly bound in front
  of witnesses is real protection, where the floor's good is the smallest concrete thing available.

### The resulting ladder, and the standing rule

**10 · 9 · 8 · 7 · 6 · 5 · 4 — seven entries, seven distinct ranks, a total order with no ties.** The
ordering principle, now explicit: **how much of the adverse thing is kept out of the world, and for how long.**
Permanent denial to the record (10, 9) beats moving an event (8) beats unsettling authority at a cost (7)
beats keeping a fact out for a scene (6) beats muting a fact's terms for a scene (5) beats deferring one
named beat (4).

> **Standing rule for every Tempt set, opening and later: ties are resolved at authoring time, never at
> runtime.** If two proposed outcomes would share a rank, they are compared as complete packages before
> shipping and either given distinct ranks or shown to be genuinely interchangeable. A seeded tie-break is
> permitted only for outcomes that are player-equivalent in every declared field; it is never a way to ship
> an unmade decision. **The opening set never reaches one, because it has no ties.**

`;

const p3 = s.indexOf('# Part 3 — Player-authored outcomes, for contrast');
if (p3 < 0) throw new Error('ANCHOR MISSING Part 3');
s = s.slice(0, p3) + PART2A + s.slice(p3);

// --- The explicit precision sentence ----------------------------------------------------
sub(`**This is the agency guarantee, and it is worth stating as policy:** a vague wish is never twisted, never
refused, and never quietly downgraded. It is granted at the top of what Fate has on offer. What it loses is
**authorship**, not favor.`,
`**This is the agency guarantee, and it is worth stating as policy:** a vague wish is never twisted, never
refused, and never quietly downgraded. It is granted at the top of what Fate has on offer. What it loses is
**authorship**, not favor.

> **And the guarantee's other half, stated deliberately rather than left to emerge:** precise Tempt wording
> grants the player **control over the target and the scope — it does not guarantee a safer total package.**
> Any cost attached to a precise wish must be **intrinsic to that exact authored outcome**, arising from what
> was actually asked for, and never a penalty for having been precise. \`unmourned_loss\` is not a charge for
> clarity; it is what it means for Seren to forget what she paid. A player who asks precisely is buying
> control, and control includes the power to choose something that costs her.`);

// --- Decision table: item 2 replaced -----------------------------------------------------
sub(`| **2** | **Is the tie at 8 acceptable?** \`procedural_delay\` and \`restriction_unnamed\` are equal-ranked. | Ties matter: when both are eligible, something other than favor picks. If they are not player-equivalent, one must move. |`,
`| **2** | **Is \`unm.restriction_unnamed\` at rank 5 right?** The tie at 8 was wrong and is resolved in Part 2a: it differs from \`procedural_delay\` on durability (\`bounded\` vs \`persists\`) and on how much adverse material reaches the world, so it drops below \`custody_unraised\` to 5. | The re-rank is mine, from a package comparison. If you read "not publicly bound before witnesses" as worth more than "custody never raised", 5 and 6 swap. |`);

fs.writeFileSync(S, s);
console.log('Part 2a written; precision policy sentence added; decision 2 replaced');
