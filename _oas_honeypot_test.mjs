// OAS HONEY-POT ADAPTER — free tests. No model calls.
//
// The adapter exists because the literary buildHoneyPotBehaviorDirective() cannot go near
// OAS: its first statement is _kickoffHoneyPotIfReady(), which reaches a paid
// /api/chatgpt-proxy agenda generation, and its output instructs the model to emit
// [CONVERSION_DELTA] — a tag parsed ONLY after the literary author pass, so from an
// intimacy microturn it would print into the LI's visible dialogue.
//
// So the tests are mostly negative: what must NOT be in the block, and what must NOT happen
// when it runs. Extracted from source and evaluated standalone — no browser, no network.
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');

// Pull the adapter out of the IIFE by source span so the test exercises the REAL function
// rather than a copy that can drift away from it.
const start = SRC.indexOf('  function buildOASHoneyPotBlock(opts) {');
const end = SRC.indexOf('\n  window.buildOASHoneyPotBlock', start);
if (start < 0 || end < 0) { console.error('FAIL — adapter not found in public/app.js'); process.exit(2); }
const buildOASHoneyPotBlock = new Function('window', SRC.slice(start, end) + '\n  return buildOASHoneyPotBlock;')({});

const AGENDA = {
  agendaType: 'EXTRACTION',
  handler: 'The Pale Marshal of the Ninth Fold',
  conversionCriteria: ['player shares the cipher', 'player names their patron'],
  redemptionPath: 'LI burns the dossier and runs',
  sacrificePath: 'LI files a doctored report',
  betrayalPath: 'LI hands the player over at the Ascendant Staircase',
  revealMoment: 'when the Circlet is opened in act four',
};
const live = extra => ({ state: Object.assign({
  liHiddenAgenda: 'Extract the location of the Folded Fate from the player',
  liHiddenAgendaContext: AGENDA, liConversionScore: 0, liCoverIdentity: 'a wandering archivist',
}, extra || {}) });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};

console.log(`\n${'═'.repeat(76)}\nOAS HONEY-POT ADAPTER — free tests\n${'═'.repeat(76)}`);

// ── 1. GATING. Every gate the literary builder has, minus the kickoff. ──
console.log('\n GATING — returns empty unless a live, unrevealed agenda exists');
t('no state',            buildOASHoneyPotBlock.call(null) === '' || buildOASHoneyPotBlock() === '');
t('no agenda',           run({ state: {} }) === '');
t('no agenda context',   run({ state: { liHiddenAgenda: 'x' } }) === '');
t('already revealed',    run(live({ liConversionRevealed: true })) === '');
t('live agenda emits',   run(live()).length > 0);

// ── 2. LEAKS. The five things the user ruled out, checked as strings. ──
console.log('\n LEAKS — none of the author-only material may appear at any score');
const all = [-10, -5, -3, -1, 0, 1, 3, 4, 6, 7, 10].map(n => run(live({ liConversionScore: n })));
const anyHas = rx => all.filter(o => rx.test(o)).length;
t('no [CONVERSION_DELTA] tag',   anyHas(/CONVERSION_DELTA/i) === 0);
t('no numeric score',            anyHas(/-?\d+\s*\/\s*10|score[:\s]+-?\d/i) === 0);
t('no raw conversionCriteria',   anyHas(/cipher|name their patron|patron/i) === 0);
t('no reveal timing',            anyHas(/revealMoment|Circlet is opened|act four/i) === 0);
t('no future branches',          anyHas(/redemption|sacrifice|betrayal|Ascendant Staircase|doctored report|burns the dossier/i) === 0);
t('no agendaType label',         anyHas(/EXTRACTION|SABOTAGE|VENDETTA|INHERITANCE/) === 0);
t('no prose/narrator directive', anyHas(/prose|narrat|paragraph|scene must|write the/i) === 0);

// ── 3. MOTIVE DUPLICATION. The LI projection already ships PRIVATE LI MOTIVE. ──
console.log('\n DUPLICATION — the raw agenda is withheld unless this REPLACES that field');
const dflt = run(live()), withMotive = run(live(), { includeMotive: true });
t('default omits raw agenda',    !/Extract the location/.test(dflt));
t('default omits handler',       !/Pale Marshal/.test(dflt));
t('includeMotive adds agenda',   /Extract the location/.test(withMotive));
t('includeMotive marks it confidential', /confidential/i.test(withMotive));

// ── 4. STANCE. Bands must track the literary builder, as words not numbers. ──
console.log('\n STANCE — five distinct bands, reusing the literary thresholds');
const stances = new Set(all.map(o => (o.match(/Where they stand right now: (.+)\./) || [])[1]));
t('five distinct stance bands',  stances.size === 5, `got ${stances.size}: ${[...stances].map(s => s.slice(0, 28)).join(' | ')}`);
t('on-mission at low score',     /on mission/.test(run(live({ liConversionScore: -5 }))));
t('decided at high score',       /decided for the player/.test(run(live({ liConversionScore: 9 }))));

// ── 5. SIDE EFFECTS. The whole reason this is not the literary builder. ──
console.log('\n SIDE EFFECTS — none, and no reachability to the paid path');
const src = SRC.slice(start, end);
t('never calls _kickoffHoneyPotIfReady', !/_kickoffHoneyPotIfReady/.test(src));
t('never calls generateHoneyPotAgenda',  !/generateHoneyPotAgenda/.test(src));
t('no fetch / network',                  !/fetch\s*\(|XMLHttpRequest|api\//.test(src));
t('writes no state',                     !/(?:window\.)?st(?:ate)?\.\w+\s*=(?!=)/.test(src));
const s1 = live(); const a = run(s1), b = run(s1);
t('idempotent across two calls', a === b && JSON.stringify(s1.state) === JSON.stringify(live().state));

// ── 6. CONFIDENTIALITY LAW must be present in every emitted block. ──
console.log('\n CONFIDENTIALITY — the never-confess instruction is unconditional');
t('all blocks forbid revealing', all.every(o => /not permission to reveal/.test(o)));
t('all blocks forbid confessing', all.every(o => /confess/.test(o)));

// ── 7. COST ──
const lens = all.map(o => o.length);
const avg = Math.round(lens.reduce((x, y) => x + y, 0) / lens.length);
console.log(`\n COST — ${Math.min(...lens)}–${Math.max(...lens)} chars (avg ${avg} ≈ ${Math.round(avg / 4)} tokens)`);
console.log(`        with motive: ${withMotive.length} chars ≈ ${Math.round(withMotive.length / 4)} tokens`);

console.log(`\n${'─'.repeat(76)}\n  ${pass} passed · ${fail} failed\n`);
console.log(run(live({ liConversionScore: 3 })).split('\n').map(l => '   │ ' + l).join('\n') + '\n');
process.exit(fail ? 1 : 0);

// Re-binds the adapter's `window` for each case — the function reads window.state.
function run(win, opts) {
  const f = new Function('window', SRC.slice(start, end) + '\n  return buildOASHoneyPotBlock;')(win);
  return f(opts);
}
