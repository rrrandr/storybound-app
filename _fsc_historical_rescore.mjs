// HISTORICAL RE-SCORE. Every saved live output, through the CORRECTED gate. Provider-free, $0.
//
// Three gate fixes changed what counts as a violation:
//   1. reader-facing prose only — app-authored art/panel directives are no longer scored
//   2. negation-aware residue and cost — stating a prohibition is not breaking it
//   3. the bare imperative "Speak" is a recognised choice anchor
//
// Old failure counts are NOT preserved. Each run is re-judged from its saved output.
import fs from 'fs';
import { scoreC1, scoreC2, scoreC3, scoreC4, readerFacingProse, CHOICE_ANCHORS,
         ROSTER_TOKENS, ERASED_PROSE_TERMS, loadExternalTimelinePhrases,
         loadAmbiguousTemporal } from './_fsc_scoring.mjs';

const PH = loadExternalTimelinePhrases(), AM = loadAmbiguousTemporal();
const ERASED = ERASED_PROSE_TERMS['unm.time_gives_way'];
const ANCH = CHOICE_ANCHORS['unm.time_gives_way'];

const dirs = fs.readdirSync('_tempt_fate_fixtures')
  .filter(d => /^(fsc_c4_|fsc_roster_|fsc_chain_)/.test(d))
  .filter(d => fs.existsSync('_tempt_fate_fixtures/' + d + '/scene.json')
            && fs.statSync('_tempt_fate_fixtures/' + d + '/scene.json').size > 200)
  .sort();

// The chain run stores its scene under raw_1.txt rather than scene.json.
const chainDirs = fs.readdirSync('_tempt_fate_fixtures')
  .filter(d => /^fsc_chain_/.test(d) && fs.existsSync('_tempt_fate_fixtures/' + d + '/raw_1.txt'))
  .sort();

function planOf(dir) {
  const p = '_tempt_fate_fixtures/' + dir;
  if (fs.existsSync(p + '/scene.json') && fs.statSync(p + '/scene.json').size > 200) {
    try { return JSON.parse(fs.readFileSync(p + '/scene.json', 'utf8')); } catch (_) {}
  }
  if (fs.existsSync(p + '/raw_1.txt')) {
    try {
      const j = JSON.parse(fs.readFileSync(p + '/raw_1.txt', 'utf8'));
      const txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      return JSON.parse(txt);
    } catch (_) {}
  }
  return null;
}

const rows = [];
const all = [...new Set(dirs.concat(chainDirs))].sort();
for (const d of all) {
  const plan = planOf(d);
  if (!plan || !Array.isArray(plan.beats) || !plan.beats.length) continue;
  const prose = readerFacingProse(plan);
  const roster = ['the_assembly', 'named:seren', 'named:julian',
                  'role:first_sacrifice_presiding_dohkar', 'pc:lirael'];
  const c1 = scoreC1(prose, { phrases: PH, ambiguous: AM, erasedTerms: ERASED });
  const c2 = scoreC2(prose, { roster, tokens: ROSTER_TOKENS, phrases: PH, ambiguous: AM });
  const c3 = scoreC3(prose);
  const c4 = scoreC4(plan, { anchors: ANCH });
  const faults = [];
  if (c1.externalTimeline.length) faults.push('cross-timeline x' + c1.externalTimeline.length);
  if (c1.sharedUnderstanding.length) faults.push('shared-knowing');
  if (c1.absenceAsPresence.length) faults.push('absence-as-presence x' + c1.absenceAsPresence.length);
  if (c1.answerVerdict.length) faults.push('Answer-as-judge x' + c1.answerVerdict.length);
  if (c1.unpinnedCharge.length) faults.push('unpinned-charge x' + c1.unpinnedCharge.length);
  if (c1.erasedBasis.length) faults.push('erased-basis x' + c1.erasedBasis.length);
  if (!c2.presence.ok) faults.push('roster');
  if (c3.explicit.length || c3.deferred.length) faults.push('cost x' + (c3.explicit.length + c3.deferred.length));
  if (c3.residue.length) faults.push('residue x' + c3.residue.length);
  if (c3.emission.length) faults.push('emission x' + c3.emission.length);
  if (!c4.pass) faults.push('C4:' + c4.reason);
  rows.push({ d, beats: plan.beats.length, c1: c1.pass, c2: c2.pass, c3: c3.pass, c4: c4.pass,
    accepted: c1.pass && c2.pass && c3.pass && c4.pass, faults, detail: { c1, c2, c3, c4 } });
}

const nm = d => d.replace(/^fsc_(c4|roster|chain)_2026-09-/, '').replace('T', ' ').replace(/-/g, ':');
console.log('=== HISTORICAL RE-SCORE — corrected gate, reader-facing prose only ($0) ===\n');
console.log('  run                 beats  C1  C2  C3  C4   verdict   faults');
console.log('  ' + '-'.repeat(96));
rows.forEach(r => {
  const m = b => b ? ' ok' : ' ✗ ';
  console.log('  ' + nm(r.d).padEnd(20) + String(r.beats).padStart(4) + '  '
    + m(r.c1) + ' ' + m(r.c2) + ' ' + m(r.c3) + ' ' + m(r.c4)
    + '   ' + (r.accepted ? 'ACCEPT ' : 'REJECT ') + '  ' + r.faults.join(', '));
});
const acc = rows.filter(r => r.accepted).length;
console.log('\n  ' + rows.length + ' saved live scenes re-scored: ' + acc + ' ACCEPTED, '
  + (rows.length - acc) + ' REJECTED.');

// Per-criterion tally, so the revised picture is legible.
const tally = {};
rows.forEach(r => r.faults.forEach(f => {
  const k = f.split(' x')[0].split(':')[0]; tally[k] = (tally[k] || 0) + 1; }));
console.log('\n  faults by kind (runs affected):');
Object.keys(tally).sort((a, b) => tally[b] - tally[a])
  .forEach(k => console.log('    ' + String(tally[k]).padStart(2) + '  ' + k));

fs.writeFileSync('_fsc_historical_rescore.json', JSON.stringify(
  { at: new Date().toISOString(), runs: rows.map(r => ({ run: r.d, beats: r.beats,
    c1: r.c1, c2: r.c2, c3: r.c3, c4: r.c4, accepted: r.accepted, faults: r.faults })) }, null, 2));
console.log('\n  full record: _fsc_historical_rescore.json');
