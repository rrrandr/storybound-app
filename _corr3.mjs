import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

// F1 — the flagship example belongs to all_present; keep the crowd-only reading distinct.
sub(`### Precise: *"I wish the assembly would forget the wish twisted."*

**Reading:** exact. The player named a fact and named who it reaches.

**Therefore:** everyone who stood in that clearing forgets the wish twisted. **Seren does not know her wish
went wrong. Julian does not know what he interrogated her about. The Dohkar does not know there is anything
to rule on. And Lirael does not know what she is about to be accused of.** The reader is the only one left
holding it.

**Cost:** none. **Rank:** inert — the player chose this, so nothing ranked it.

> **What changed from v1.** The old draft quietly exempted four people who were standing in the assembly —
> including Lirael, by an automatic invoker rule. Nobody asked for those exemptions. That is the same silent
> narrowing that made the extractor unusable (\`scopeMatch: narrower\`), authored by hand into the outcome set.
> **Named membership now outranks protagonist privilege, and the expansion path carries no invoker filter at
> all** — a default with an override would just reintroduce the privilege.`,
`### Precise: *"I wish **everyone here** would forget the wish twisted."*

**Reading:** exact. The player named a fact and named who it reaches — \`population.scene_present\`.

**Therefore:** everyone who stood in that clearing forgets the wish twisted. **Seren does not know her wish
went wrong. Julian does not know what he interrogated her about. The Dohkar does not know there is anything
to rule on. And Lirael does not know what she is about to be accused of.** The reader is the only one left
holding it.

**Cost:** none. **Rank:** inert — the player chose this, so nothing ranked it.

> **This example moved.** It was written against *"I wish **the assembly** would forget"* — but the approved
> \`population.assembly\` is **the crowd of First Favored family and guests, and excludes all four named
> people.** So that wish reaches the crowd only, and this beat belongs to the wish that names the room.
>
> **The two readings are genuinely distinct**, exactly as the seed's own sentence implies: *"the whole
> assembly turned to look at Lirael"* versus *"every First Favored present heard the loose note."* Two reaches
> in one line, and the design now addresses both.

### The narrower precise wish: *"I wish the assembly would forget the wish twisted."*

**Therefore:** the **crowd** forgets — family and guests, the two dozen who came to watch a girl come of age.
**Seren, Julian, the Dohkar and Lirael all still know**, because none of them is a member of that body.

**A room where the witnesses have forgotten and the participants have not** is a different scene from the one
above, and the player chose which by naming the population. **That is precision doing exactly what precision
is for.**

> **What changed from v1.** The old draft exempted the named four **by an automatic invoker/protagonist
> rule** — nobody asked for those exemptions, and that was the same silent narrowing that made the extractor
> unusable (\`scopeMatch: narrower\`), authored by hand. They are excluded here for an entirely different
> reason: **they are not members of the population the player named.** The first was privilege; this is scope.
> There is still **no invoker filter anywhere**, and \`population.scene_present\` reaches Lirael like everyone
> else.`);

// Part 3 table rows: correct the two readings.
sub(`| *"the assembly would forget the wish twisted"* | **everyone present forgets, Lirael included** | none |
| *"everyone here would forget"* | same reach; kept separate because the scope *forms* differ and diverge later | none |`,
`| *"the assembly would forget the wish twisted"* | **the crowd forgets** — Seren, Julian, the Dohkar and Lirael all still know | none |
| *"everyone here would forget"* | **everyone present forgets, Lirael included** | none |`);

sub(`| **7** | \`unseen\` | \`unm.witness_scattered\` | the moment **does not cohere** — no two people present keep a reconcilable version | **neither does she** |`,
`| ⛔ | \`unseen\` | \`unm.witness_scattered\` | **BLOCKED** — \`incoherent\` is not an effect until each party's exact mistaken proposition is authored | — |`);

sub(`| **4** | \`solitude\` | \`unm.the_shunning\` | **they leave her alone.** The assembly withdraws — a shunning, not a courtesy | every defender she had |`,
`| *tbd* | \`solitude\` | \`unm.the_shunning\` | **they leave her alone.** Everyone present withdraws — a shunning, not a courtesy | every defender she had |`);

sub(`| *"Seren didn't know what it cost her"* | her alone | \`unmourned_loss\` |`,
`| ~~*"Seren didn't know what it cost her"*~~ | ⛔ **not an exact reading in this phase** — the price has not yet been named, so there is no fact to forget; routes to Fate-chosen | — |`);

sub(`**Two things worth noticing.**`,
`**The opening exact-reading set is five, not six** — \`seren_forgets_price\` is unauthorable here.

**Two things worth noticing.**`);
fs.writeFileSync(F, s);
console.log('approval sheet corrected for F1, F3, F4, F5');
