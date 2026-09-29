import fs from 'fs';
const sub = (f, a, b) => { let s = fs.readFileSync(f, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0, 50));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_fs_coverage_check.mjs',
  "{ id: 'unm.standing_dissolved', rank: 5,  ask: 'authority', revision: true,  test: c => !c.jurisdictionChallengeMade },",
  "{ id: 'unm.standing_dissolved', rank: 5,  ask: 'authority', revision: true,  test: () => true },");

sub('_first_sacrifice_tempt_outcomes_v2.md',
  '| **eligibility** | `!jurisdictionChallengeMade` · consumed once |',
  '| **eligibility** | **always in the opening** · consumed once |');

sub('_first_sacrifice_tempt_outcomes_v2.md',
  '**Rank 5:** the biggest single headline in the set, ranked low **because the package is not the headline.**',
  `> **Eligibility corrected by the coverage check (§1a note).** This entry was drafted with a
> \`!jurisdictionChallengeMade\` gate, inherited from the Petition-era \`unm.julian_standing_questioned\`, where
> merely *doubting* standing only made sense before the challenge pre-empted it. The class-aware check found
> the consequence: a player asking *"who is he to question me?"* **after** the challenge had nothing eligible
> — 8 stranded pairs. At Tempt amplitude the gate is also simply wrong. A challenge contests who may rule and
> settles nothing; voiding the Provast's standing **after** one is live is more dramatic, not less, because it
> ends the contest by fiat. Gate removed.

**Rank 5:** the biggest single headline in the set, ranked low **because the package is not the headline.**`);
console.log('gate removed in both the check and the draft');
