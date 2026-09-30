// Pick a saved COST-ONLY rejected plan whose offending line lives in a BEAT, so the repair path
// can actually reach it. Provider-free, $0.
import fs from 'fs';
import { scoreC1, scoreC2, scoreC3, scoreC4, readerFacingProse, CHOICE_ANCHORS,
         ROSTER_TOKENS, ERASED_PROSE_TERMS, loadExternalTimelinePhrases,
         loadAmbiguousTemporal, EXPLICIT_COST_RX, DEFERRED_COST_RX, firstUnnegated }
  from './_fsc_scoring.mjs';

const PH = loadExternalTimelinePhrases(), AM = loadAmbiguousTemporal();
const ERASED = ERASED_PROSE_TERMS['unm.time_gives_way'];
const ANCH = CHOICE_ANCHORS['unm.time_gives_way'];
const ROSTER = ['the_assembly', 'named:seren', 'named:julian',
                'role:first_sacrifice_presiding_dohkar', 'pc:lirael'];

const dirs = fs.readdirSync('_tempt_fate_fixtures')
  .filter(d => /^fsc_c4_/.test(d) && fs.existsSync('_tempt_fate_fixtures/' + d + '/scene.json'))
  .filter(d => fs.statSync('_tempt_fate_fixtures/' + d + '/scene.json').size > 200).sort();

console.log('=== COST-ONLY REPAIR CANDIDATES (no network, $0) ===\n');
const cands = [];
for (const d of dirs) {
  const plan = JSON.parse(fs.readFileSync('_tempt_fate_fixtures/' + d + '/scene.json', 'utf8'));
  if (!Array.isArray(plan.beats) || !plan.beats.length) continue;
  const prose = readerFacingProse(plan);
  const c1 = scoreC1(prose, { phrases: PH, ambiguous: AM, erasedTerms: ERASED });
  const c2 = scoreC2(prose, { roster: ROSTER, tokens: ROSTER_TOKENS, phrases: PH, ambiguous: AM });
  const c3 = scoreC3(prose);
  const c4 = scoreC4(plan, { anchors: ANCH });
  const costOnly = c1.pass && c2.pass && c4.pass && !c3.pass
    && c3.residue.length === 0 && c3.emission.length === 0;
  if (!costOnly) continue;
  // Is the offending line in a BEAT? Only then can the repair path reach it.
  const offending = c3.explicit.concat(c3.deferred);
  const inBeats = [];
  plan.beats.forEach((b, i) => {
    const s = String((b && b.text) || '');
    if (firstUnnegated(EXPLICIT_COST_RX.concat(DEFERRED_COST_RX), s)) inBeats.push({ idx: i, text: s });
  });
  cands.push({ d, beats: plan.beats.length, offending, inBeats });
  console.log('  ' + d);
  console.log('     beats ' + plan.beats.length + ', cost faults ' + offending.length
    + ', of which in BEATS: ' + inBeats.length);
  offending.forEach(o => console.log('       fault : "' + o + '"'));
  inBeats.forEach(b => console.log('       beat ' + b.idx + ': "' + b.text + '"'));
  console.log('');
}
console.log('  ' + cands.length + ' cost-only candidate(s).');
const usable = cands.filter(c => c.inBeats.length && c.inBeats.length === c.offending.length);
console.log('  ' + usable.length + ' fully repairable (every fault sits in a beat):');
usable.forEach(c => console.log('    ' + c.d + '  — beat(s) ' + c.inBeats.map(b => b.idx).join(',')));
fs.writeFileSync('_fsc_repair_candidates.json', JSON.stringify(cands, null, 2));
