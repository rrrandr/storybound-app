import fs from 'fs';
const F = '_first_sacrifice_editorial_packet_2026_09_28.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,60)); s = s.split(a).join(b); };

sub(`| declared invalid-cell rules | **4** | §1b |
| valid cells | **60** (was estimated 20–35) | §1b |`,
`| declared invalid-cell rules | **2 upheld** (I1, I2 withdrawn) | §1b, §6 |
| valid cells | **72** (Reading 1) or **24** (Reading 2) — 60 was wrong | §1b, §1e |`);

sub(`| **party-stance profiles** | **8 proposed** | §4 |`,
`| **party-stance profiles** | **9 proposed** (+1 Chayr, Flag E) | §4 |`);

sub(`| **total authored entries** | **~71** | ~9 reusable engine-wide |

**~71, up from ~60.** The rise is honest: the late set is four outcomes rather than the two I guessed, the
Chayr needed a profile nobody had counted, and the valid-cell count nearly doubled once enumerated instead of
estimated.`,
`| **total authored entries** | **~72** | ~9 reusable engine-wide |

**~72, up from ~60.** The rise is honest: the late set is four outcomes rather than the two I guessed, the
Chayr now needs two profiles nobody had counted, and the valid-cell count grew once enumerated instead of
estimated. Note the direction of the correction on cells: withdrawing I1 and I2 **enlarged** the domain to 72
under Reading 1. The estimate did not merely firm up; it was wrong in both the count and the rules under it.`);

sub(`| flag | decision |
|---|---|
| **A** | Are invalid-cell rules I1–I4 correct readings of the plan's ordering? If any pair can co-occur, the matrix grows. |
| **B** | Is U2 (accused but never questioned) reachable? I covered it rather than assume it away; declaring it invalid instead removes one outcome's justification. |
| **C** | Is \`unm.absent_accuser_noted\` correctly ranked **lowest**? It has the strongest headline and a real cost. A hardened Julian may be desirable drama rather than a player cost — your call, not a mechanical one. |
| **D** | Are the id boundaries right, especially splitting \`demand_authorship\` from the *manner* of the demand? Merging them lets one wish do more. |
| **E** | Should the Chayr have a second, non-\`indifferent\` profile so drastic turns can reach it? |
| **F** | Should \`stance.assembly.turning\` come back for scenes where the crowd turns? |`,
`| flag | decision | status |
|---|---|---|
| **A** | I1–I4 audited against seed text in §6: **I1 and I2 withdrawn, I3 and I4 upheld.** The evidence produced a stronger, unproposed rule (§6.5) whose applicability turns on one question I cannot answer from the seed: **does this matrix govern the opening only, or all of Issue 1?** | **OPEN — the one remaining item** |
| **B** | U2 valid and covered. \`unm.hearer_unnamed\` is mechanically confirmed as its sole cover (§1e). | resolved 2026-09-28 |
| **C** | \`antagonist_hardened\` is a player cost; the package ranks low. Good drama ≠ favorable to Lirael. | resolved 2026-09-28 |
| **D** | Authorship stays separate from manner. | resolved 2026-09-28 |
| **E** | Yes — the Chayr acts on parties (row 14 reads Julian's answer back to him), so \`stance.chayr.record_read_back\` is added, **late-Issue-1 only**. | resolved 2026-09-28 |
| **F** | \`stance.assembly.turning\` stays out. The only seed text pairing the assembly with "turned" is the wish's literal fulfilment, not a change of allegiance. | resolved 2026-09-28 |`);

sub(`- **The coverage gate is not claimed to pass.** §1e shows no uncovered region is unaddressed by this draft;
  mechanical enumeration of all 60 valid cells against the ten entries has not been run.`,
`- **The coverage gate is not claimed to pass**, though the mechanical check has now been run (§1e) and the
  drafted entries do cover the domain: 72/72 under Reading 1, 23/24 under Reading 2 with a named single-entry
  fix. That is **coverage by unapproved drafts**, which is not a gate. Approval of the entries, and an answer
  to Flag A, are what would turn it into one.`);

fs.writeFileSync(F, s);
console.log('§5 updated');
