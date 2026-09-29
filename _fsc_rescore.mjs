// Re-score a saved run's prose with the CURRENT corrected scorer. No network, no cost.
import fs from 'fs';
import { scoreC1, scoreC2, aftermathLanded, loadExternalTimelinePhrases,
         loadAmbiguousTemporal, ROSTER_TOKENS, ERASED_PROSE_TERMS } from './_fsc_scoring.mjs';

const dir = process.argv[2];
const outcome = process.argv[3] || 'unm.time_gives_way';
const prose = fs.readFileSync(dir + '/prose.txt', 'utf8');
const plan = JSON.parse(fs.readFileSync(dir + '/scene.json', 'utf8'));
const roster = JSON.parse(fs.readFileSync(dir + '/preflight.json', 'utf8')).compiled.roster;

const c2 = scoreC2(prose, { roster, tokens: ROSTER_TOKENS, phrases: loadExternalTimelinePhrases(),
  ambiguous: loadAmbiguousTemporal() });
const c1 = scoreC1(prose, { phrases: loadExternalTimelinePhrases(),
  erasedTerms: ERASED_PROSE_TERMS[outcome] || [] });

console.log('RE-SCORE ' + dir + '  (corrected shared lists, $0)\n');
console.log('C2  presence    : ' + (c2.presence.ok ? 'PASS' : 'FAIL'));
console.log('    disposition : ' + (c2.disposition.ok ? 'PASS' : 'FAIL'));
c2.disposition.leaks.forEach(l => console.log('       x ' + JSON.stringify(l.phrases)
  + (l.absenceAsPresence ? ' [absence-as-presence]' : '') + ' "' + l.sentence + '"'));
console.log('    C2          : ' + (c2.pass ? 'PASS' : 'FAIL'));
if (c2.review.length) {
  console.log('    review only (not scored):');
  c2.review.forEach(r => console.log('       ~ ' + JSON.stringify(r.phrases) + ' "' + r.sentence + '"'));
}
console.log('\nC1  cross-timeline    : ' + (c1.externalTimeline.length ? 'FAIL' : 'clean'));
c1.externalTimeline.forEach(e => console.log('       x ' + JSON.stringify(e.phrases) + ' "' + e.sentence + '"'));
console.log('    shared knowledge  : ' + (c1.sharedUnderstanding.length ? 'FAIL' : 'clean'));
console.log('    absence-as-present: ' + (c1.absenceAsPresence.length ? 'FAIL' : 'clean'));
c1.absenceAsPresence.forEach(e => console.log('       x "' + e.sentence + '"'));
console.log('    erased basis      : ' + (c1.erasedBasis.length ? 'FAIL' : 'clean')
  + '   [terms: ' + (ERASED_PROSE_TERMS[outcome] || []).join(', ') + ']');
c1.erasedBasis.forEach(e => console.log('       x "' + e.term + '" in "' + e.sentence + '"'));
console.log('    C1 (mechanical)   : ' + (c1.pass ? 'PASS' : 'FAIL'));

const gate = plan.decisionGateBeatIdx, last = plan.beats.length - 1;
console.log('\nC4  beats ' + plan.beats.length + ', gate ' + gate + ', last ' + last
  + ', past gate ' + (last - gate) + '  -> ' + (gate === last ? 'PASS' : 'FAIL'));
console.log('\nAFTERMATH (role-aware):');
['Seren', 'Julian', 'Dohkar', 'Lirael'].forEach(n => {
  const r = aftermathLanded(prose, n);
  console.log('  ' + n.padEnd(7) + ': ' + (r.landed ? 'yes — "' + r.sentence.slice(0, 84) + '"' : 'NO'));
});
