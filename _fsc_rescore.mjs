// Re-score a saved run's prose with the CURRENT corrected scorer. No network, no cost.
import fs from 'fs';
import { scoreC1, scoreC2, scoreC3, scoreC4, effectiveGate, CHOICE_ANCHORS, aftermathLanded, loadExternalTimelinePhrases,
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

const eg = effectiveGate(plan);
console.log('\nC4  beats ' + plan.beats.length + ', gate ' + eg.gate + (eg.derived ? ' (derived)' : '')
  + ', last ' + eg.last + ', past gate ' + (eg.last - eg.gate)
  + '  -> ' + (eg.gate === eg.last ? 'PASS' : 'FAIL'));
console.log('\nAFTERMATH (role-aware):');
['Seren', 'Julian', 'Dohkar', 'Lirael'].forEach(n => {
  const r = aftermathLanded(prose, n);
  console.log('  ' + n.padEnd(7) + ': ' + (r.landed ? 'yes — "' + r.sentence.slice(0, 84) + '"' : 'NO'));
});

const c3 = scoreC3(prose, { costless: true });
console.log('\nC3  invented cost      : ' + (c3.pass ? 'PASS' : 'FAIL'));
c3.explicit.forEach(s => console.log('       x stated price:   "' + s + '"'));
c3.deferred.forEach(s => console.log('       x deferred price: "' + s + '"'));
c3.emission.forEach(s => console.log('       x emission:       "' + s + '"'));
c3.residue.forEach(s => console.log('       x magical residue: "' + s + '"'));
c3.wardrobeAllowed.forEach(s => console.log('       ~ seed wardrobe (allowed): "' + s + '"'));

const c4s = scoreC4(plan, { anchors: CHOICE_ANCHORS[outcome] });
console.log('\nC4 (semantic)  : ' + (c4s.pass ? 'PASS' : 'FAIL — ' + c4s.reason));
if (c4s.presentedAt) c4s.presentedAt.forEach(p => console.log('       · "' + p.label + '" at beat ' + p.beat));
(c4s.violations || []).forEach(v => console.log('       x ' + v.kind + ' @' + v.idx + ': "' + v.text + '"'));
console.log('       final beat holds it pending: ' + c4s.finalPending);
c1.answerVerdict.forEach(e => console.log('       x Answer-as-judge:  "' + e.sentence + '"'));
c1.unpinnedCharge.forEach(e => console.log('       x unpinned charge:  "' + e.sentence + '"'));
