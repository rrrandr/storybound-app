import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_unseen_escape_candidates.md',
`| ⚠ **WRONG ATOM — corrected 2026-09-28.** \`auth.julian_claims_convene_preside\` is Julian's claim to convene the formal inquiry, **not** the jurisdiction challenge, which is a separate event from lane \`julian_jurisdiction_challenge\` (131356). And **that lane is disjunctive too** — challenges jurisdiction / reframes the accusation / contests who has authority — so the companion cannot be named precisely until it is split. See \`_compiler_contract_boundary.md\` §4a. | **only if \`jurisdictionChallengeMade\` is active.**`,
`| ⛔ **NO COMPANION IS REQUIRED — resolved 2026-09-28.** The lane is atomized into \`challenge.jurisdiction_contested\` (which contests **the presiding Dohkar's** jurisdiction, not any accusation) and \`challenge.answerability_shifted_to_julian\` (which rests on a charge that exists **invariantly** — Julian's interrogation is called *"an accusation through desirability"*, 131286). **Neither depends on \`accusation.family_accused\`.** Both are listed in \`unchanged[]\`, as is \`auth.julian_claims_convene_preside\`. See \`_jurisdiction_lane_atomization.md\`. | ~~only if active~~ **n/a**`);

sub('_compiler_contract_boundary.md',
`> **So the companion cannot be named precisely yet.** Only the *"reframes the accusation"* disjunct plainly
> depends on the accusation; the other two contest authority over a matter, and the reversal frame (131489)
> ties that matter to the accusation, which is why I3 holds for the lane as framed — **but a per-disjunct
> answer needs the same split the family lane received.** Flagged; **not split in this pass**, which was
> scoped to the family lane.`,
`> **RESOLVED 2026-09-28** in \`_jurisdiction_lane_atomization.md\`. The lane atomizes into **two** atoms, not
> three: \`challenge.jurisdiction_contested\` (the frame fuses "challenges jurisdiction" and "contests who has
> authority" into *"a real jurisdictional contest over authority"*) and
> \`challenge.answerability_shifted_to_julian\`. *"Politically"* has no authored meaning anywhere and is not
> atomized.
>
> **Neither depends on \`accusation.family_accused\`**, so **no conditional companion is required.** The
> challenge contests the **Dohkar's** jurisdiction, and the answerability shift rests on **Julian's**
> accusation — an opening invariant. **My guess that I3 held for the lane as framed was wrong; see §6 of that
> note.**`);
console.log('draft trace updated; companion removed');
