import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

sub(`| ⚠ | \`escape\` | \`unm.the_answer_speaks\` | **needs a source audit** — its grant assumes the Answer can attest retrospectively to a completed wish; the seed describes it only as a **live examination** instrument | it names **her own ward** as the source |`,
`| ⛔ | \`escape\` | \`unm.the_answer_speaks\` | **BLOCKED — grant unauthorable.** The seed's own prevents-clause: *"the assumption that the alignment-sense or The Answer can expose a manufactured desire — neither can."* A reading placing the misalignment in Seren's intent is consistent with Lirael's innocence **and** her guilt. | — |
| ⛔ | \`escape\` | — | **ASK-CLASS UNCOVERED.** No floor invented. | |`);

sub(`| *tbd* | \`unseen\` | \`unm.witness_scattered\` → **proposed replacement \`unm.testimony_closed\`** | everyone saw it and everyone remembers — and **the proceeding forming against her cannot take a statement from any of them**, Lirael included, for as long as the closure stands. They may talk anywhere else. | no witness may speak for her — **and she cannot explain herself into it either** |`,
`| ⛔ | \`unseen\` | — | **ASK-CLASS UNCOVERED.** \`unm.witness_scattered\` is blocked (F3) and \`unm.testimony_closed\` moved to precise-risk. No floor invented. | |`);

sub(`# Part 3 — The six the player authors`,
`## Precise-risk — opt-in only, never Fate's choice

| wording that reaches it | outcome | therefore | its legible cost |
|---|---|---|---|
| *"Let no one be able to testify about the rite."* · *"Bar the proceeding from taking statements."* | \`unm.testimony_closed\` | no statement about the ceremony may be taken from anyone who was there — a sealed roster including Lirael — into the review of her conduct, until the inquiry convenes **if it ever does** | **it silences her defense as well as the accusation, potentially for good** |

**This is the precision policy at its sharpest.** The outcome is a real and powerful bargain, but its benefit
depends on an evidence balance the seed never states — so it cannot be what Fate hands someone who only said
*"I want to disappear."* **A player may walk into it deliberately, having been told what it costs. They may
not be walked into it.**

---

# Part 3 — The six the player authors`);
fs.writeFileSync(F, s);
console.log('sheet updated: two classes uncovered, precise-risk section added');
