import fs from 'fs';
const F = '_first_sacrifice_editorial_packet_2026_09_28.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a, b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70)); s = s.split(a).join(b); };

// ---- §1b: replaced by the evidence audit -------------------------------------------------
sub(`| rule | invalid when | why |
|---|---|---|
| **I1** | \`inquiryOpened ∧ ¬accusationMade\` | the inquiry answers the accusation; it cannot precede it |
| **I2** | \`jurisdictionChallengeMade ∧ ¬interrogationOccurred\` | Julian challenges jurisdiction *over* the questioning he already began |
| **I3** | \`jurisdictionChallengeMade ∧ ¬accusationMade\` | there is no jurisdiction to contest before a charge exists |
| **I4** | \`reviewPending ∧ inquiryOpened\` | the preliminary review is what the inquiry supersedes; both cannot be live |

Counting: I1 removes 32; I2 removes 32; I3 removes 32; I4 removes 32, with overlaps. **Valid cells: 60** of
128 — larger than the 20–35 I estimated in the feasibility packet, because I had been estimating rather than
enumerating. The estimate is corrected here.

> **Flag A — invalid-cell rules need approval.** I1–I4 are readings of the plan's ordering, not statements
> the seed makes explicitly. If any of the four can legitimately co-occur in this story, the matrix grows.`,
`| rule | invalid when | seed support | verdict |
|---|---|---|---|
| **I1** | \`inquiryOpened ∧ ¬accusationMade\` | none for *this* ordering | **WITHDRAWN** — §6.1 |
| **I2** | \`jurisdictionChallengeMade ∧ ¬interrogationOccurred\` | the seed says the opposite | **WITHDRAWN** — §6.2 |
| **I3** | \`jurisdictionChallengeMade ∧ ¬accusationMade\` | \`julian_jurisdiction_challenge\` label + reversal frame | **UPHELD** — §6.3 |
| **I4** | \`reviewPending ∧ inquiryOpened\` | \`dohkar_preliminary_review\` HARD LIMITS + \`deferral_reason_key\` | **UPHELD** — §6.4 |

**I asked for evidence and two of my four rules did not survive it.** §6 gives the exact excerpt for each.
I1 was a plausible ordering I never found stated; I2 is contradicted by the seed, which fixes the
interrogation as *already complete* before the scene opens. Both are withdrawn rather than rewritten.

The evidence also produced a rule I had not proposed, **stronger than I1 and I4 together** — the seed pins
\`inquiryOpened\` false and \`interrogationOccurred\` true for every opening state (§6.5). Whether that pin
applies depends on the matrix's scope, which the packet has never actually declared:

| reading | rules in force | valid cells |
|---|---|---|
| **1 — one matrix across Issue 1** | I3, I4 | **72** of 128 |
| **2 — matrix scoped to the opening**, as §1's title says | I3, I4, and the §6.5 pin | **24** of 128 |

So the headline number is not 60 under either reading. 60 was arithmetic over two rules that do not hold.

> **Flag A (open, and now the only one) — which scope does this matrix govern?** Reading 2 follows §1's own
> title and the seed's explicit "early scenes … never the convened inquiry itself"; it also makes the four
> late outcomes of §2 out-of-scope here, which is consistent with their being late. Reading 1 keeps one
> matrix for all of Issue 1 and lets the late entries do real work in it. §1e reports coverage for both.`);

// ---- Decision B: U2 stands -----------------------------------------------------------------
sub(`> **Flag B — U2 needs a ruling.**`, `> **Flag B — RESOLVED (Roman, 2026-09-28): U2 is valid and stays covered.** Original wording kept below.
> **Flag B — U2 needs a ruling.**`);

// ---- Decision C: antagonist_hardened is a player cost --------------------------------------
sub(`> naming her accuser) but is ranked lowest because \`antagonist_hardened\` is a real cost in Issue 1. If you`,
`> **Flag C — RESOLVED (Roman, 2026-09-28): \`antagonist_hardened\` is a player COST, and this package ranks
> low.** Hardening Julian is good drama, and good drama is not the same as favorable to Lirael. The player
> spent Fortune and the world answered by making her principal antagonist harder to move; that is a price,
> and rank must price it. It is not reclassified as a benefit on the strength of being interesting.
>
> naming her accuser) but is ranked lowest because \`antagonist_hardened\` is a real cost in Issue 1. If you`);

// ---- Decision D: authorship stays separate from manner -------------------------------------
sub(`2. **\`demand_authorship\` ≠ the manner of the demand.**`,
`2. **\`demand_authorship\` ≠ the manner of the demand.** *(Flag D — RESOLVED, Roman 2026-09-28: keep the
   split. Merging them would let one wish buy both the fact and its reading.)*`);

// ---- Decision E: second Chayr profile, scoped ----------------------------------------------
sub(`| \`stance.chayr.procedural\` | \`role:first_sacrifice_inquiry_chayr\` | \`indifferent\` | the Chayr treats her as a matter before it, not a person |`,
`| \`stance.chayr.procedural\` | \`role:first_sacrifice_inquiry_chayr\` | \`indifferent\` | the Chayr treats her as a matter before it, not a person |
| **\`stance.chayr.record_read_back\`** | same | \`escalating\` | he reads a party's own earlier answer back to them and lets it stand |`);

sub(`**Changed from the feasibility draft:**`,
`> **Flag E — RESOLVED (Roman, 2026-09-28): yes, the Chayr can respond to drastic turns, so he gets a second
> profile.** The seed stages him acting, not merely presiding: row 14 carries the beat *"The Chayr reads
> Julian's own earlier answer back to him without comment"* with the Chayr as \`actor\` and Julian as
> \`target\`. A party who can do that to Julian can do it to Lirael, so \`indifferent\` alone was too thin.
> **Scope limit, from the same seed text:** both Chayr profiles are **late-Issue-1 only**. He is \`REPORTED\`
> (not present) in row 5, \`IN_PERSON\` from row 14, and \`dohkar_preliminary_review\` forbids early scenes
> from so much as *naming* "a Chayr". Neither profile may be selected in an opening-scene turn.

**Changed from the feasibility draft:**`);

// ---- Decision F: turning stays out, with the reason ----------------------------------------
sub(`> **Flag F — dropping \`stance.assembly.turning\`** leaves the assembly with only \`guarded\`. If a scene needs a`,
`> **Flag F — RESOLVED (Roman, 2026-09-28): \`stance.assembly.turning\` stays out; the seed does not support
> it.** I checked the one place the seed puts "the assembly" and "turned" in the same sentence — the
> \`twist_manifested\` aftermath truth: *"the literal words were honoured (the whole assembly turned to look
> at Lirael)"*. That is a head-turn, the wish's literal fulfilment, not a change of allegiance. The only
> other authored reaction is \`dohkar_preliminary_review\`'s *"and the assembly registers it"* — registering
> is not turning. The assembly keeps \`guarded\` until seed text gives the crowd a side.
>
> **Flag F (original wording) — dropping \`stance.assembly.turning\`** leaves the assembly with only \`guarded\`. If a scene needs a`);

fs.writeFileSync(F, s);
console.log('packet patched: decisions B, C, D, E, F applied; §1b replaced by the evidence audit');
