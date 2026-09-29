import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

// Packet §1b: I3 verdict flips.
sub('_first_sacrifice_editorial_packet_2026_09_28.md',
'| **I3** | `jurisdictionChallengeMade ∧ ¬accusationMade` | `julian_jurisdiction_challenge` label + reversal frame | **UPHELD** — §6.3 |',
'| **I3** | `jurisdictionChallengeMade ∧ ¬accusationMade` | ~~label + reversal frame~~ — the charge is **Julian\'s interrogation**, an opening invariant | ⛔ **WITHDRAWN 2026-09-28** — `_i3_withdrawal.md` |');

sub('_first_sacrifice_editorial_packet_2026_09_28.md',
'**`I3` is the only live exclusion in the opening matrix**, removing 8 of 32. **Valid opening cells: 24.**',
`> ### ⛔ SUPERSEDED 2026-09-28 — I3 withdrawn
> I3 was upheld on the reading that a jurisdiction challenge presupposes **the family's** charge. It does
> not: the seed calls Julian's interrogation *"an accusation through desirability"* (131286) and the family
> lane speaks of redirecting the confrontation *"from **Julian's** accusation"* (131490). That charge is an
> opening invariant, so **I3 excluded no valid state** — it would have made the matrix "covered" by excluding
> a real scene.
>
> **There are now ZERO live exclusions. Valid opening cells: 32.** The domain is defined entirely by its two
> invariants. **All prior coverage figures are stale.** Original claim below, superseded.

~~**\`I3\` is the only live exclusion in the opening matrix**, removing 8 of 32. **Valid opening cells: 24.**~~`);

// Sheet: stale coverage block.
sub('_first_sacrifice_opening_approval_sheet.md',
`\`\`\`
VALID STATE CELLS : 24
ASK-CLASSES       : 7
SELECTION DOMAIN  : 168 (state, ask) pairs

COVERED   : 168 / 168
UNCOVERED : 0
DEAD ENTRIES: none
resolved via an authored fallback: 24
\`\`\``,
`> ### ⛔ ALL FIGURES BELOW ARE STALE (2026-09-28)
> **I3 is withdrawn** — it excluded no valid state once Julian's interrogation-as-accusation is accounted
> for. The opening domain is **32 valid cells, zero live exclusions**, and the selection domain is
> **32 × 7 = 224 pairs**. Nothing has been recomputed, and three outcomes are blocked or withdrawn besides.
> **Do not quote these numbers.** See \`_i3_withdrawal.md\`.

\`\`\`
VALID STATE CELLS : 24        ← STALE, now 32
ASK-CLASSES       : 7
SELECTION DOMAIN  : 168       ← STALE, now 224

COVERED   : 168 / 168         ← STALE, not recomputed
UNCOVERED : 0                 ← STALE
DEAD ENTRIES: none
resolved via an authored fallback: 24
\`\`\``);
console.log('I3 withdrawal applied to the packet and the sheet');
