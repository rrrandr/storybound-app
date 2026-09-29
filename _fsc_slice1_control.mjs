// STAGE 3 OPENING COMPILER — SLICE 1 CONTROL.
// Deterministic, provider-free. Loads the real public/app.js compiler section into a minimal
// window/state shim and drives the REAL functions — no stubs standing in for the thing under test.
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const START = SRC.indexOf('// STAGE 3 — ISSUE 1 OPENING CONSEQUENCE COMPILER');
if (START < 0) { console.error('FATAL: compiler section not found in public/app.js'); process.exit(1); }
const MODULE = SRC.slice(START - 100);   // to end of file: the compiler IIFE

const win = {};
globalThis.window = win;
globalThis.console = console;
// Execute the real module against the shim.
new Function('window', MODULE)(win);

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};
const resetState = (flags) => {
  win.state = Object.assign({ _fscDeltas: [], _fscCompiled: [] }, flags || {});
};

console.log('=== SLICE 1: compile at acceptance, populations, selection, persistence, prompt ===\n');

// ── A. The module loaded and exported the real surface ──────────────────────────────────────
console.log('A. module surface');
['_fscCompile','_fscCompileAndPersist','_fscActiveCanon','_fscExpandPopulation',
 '_fscSelectExact','_fscClassifyAsk','_fscPromptBlock','_fscChoicePending',
 '_fscMayGenerateContinuation','_fscResolveChoice'].forEach(fn =>
  t('exports ' + fn, typeof win[fn] === 'function'));
t('outcome table has 8 approved Fate-chosen entries', win._FSC_OUTCOMES.length === 8,
  'got ' + win._FSC_OUTCOMES.length);
t('exact-reading table has 5 approved entries', win._FSC_EXACT.length === 5,
  'got ' + win._FSC_EXACT.length);

// ── B. Population expansion is a frozen explicit roster, with no invoker filter ─────────────
console.log('\nB. population expansion');
resetState();
const asm = win._fscExpandPopulation('population.assembly');
const sp  = win._fscExpandPopulation('population.scene_present');
const wd  = win._fscExpandPopulation('population.withdrawing_from_lirael');
t('assembly is the crowd alone', asm.roster.length === 1 && asm.roster[0] === 'the_assembly');
t('assembly EXCLUDES pc:lirael', asm.roster.indexOf('pc:lirael') < 0);
t('assembly EXCLUDES the three other named',
  ['named:seren','named:julian','role:first_sacrifice_presiding_dohkar']
    .every(r => asm.roster.indexOf(r) < 0));
t('scene_present INCLUDES pc:lirael (no invoker filter)', sp.roster.indexOf('pc:lirael') >= 0);
t('scene_present has all five refs', sp.roster.length === 5);
t('withdrawing roster excludes pc:lirael as the OBJECT', wd.roster.indexOf('pc:lirael') < 0);
t('withdrawing roster has the other four', wd.roster.length === 4);

// ── C. Exact vs Fate-chosen selection ───────────────────────────────────────────────────────
console.log('\nC. exact vs Fate-chosen selection');
resetState();
const exA = win._fscCompile('I wish the assembly would forget the wish twisted.');
t('exact: anchored fact + scope selects an exact reading', exA.mode === 'exact_reading', exA.mode);
t('exact: selects assembly_forgets_twist', exA.outcomeId === 'mem.exact.assembly_forgets_twist', exA.outcomeId);
t('exact: population is the crowd only', exA.population.populationId === 'population.assembly');
t('exact: invokerScope not_in_population', exA.invokerScope === 'not_in_population', exA.invokerScope);
t('exact: Lirael NOT in the affected parties',
  exA.memoryEffects.every(m => m.parties.indexOf('pc:lirael') < 0));

const exB = win._fscCompile('I wish everyone here would forget the wish twisted.');
t('exact: "everyone here" selects all_present', exB.outcomeId === 'mem.exact.all_present_forget_twist', exB.outcomeId);
t('exact: all_present INCLUDES Lirael', exB.invokerScope === 'in_population', exB.invokerScope);
t('exact: the two readings are NOT co-extensive',
  exA.memoryEffects[0].parties.length !== exB.memoryEffects[0].parties.length);

const fcA = win._fscCompile('I wish this had never happened to me.');
t('fate-chosen: unanchored wording is not an exact reading', fcA.mode === 'fate_chosen', fcA.mode);
t('fate-chosen: ask-class undo', fcA.askClass === 'undo', fcA.askClass);
t('fate-chosen: selects time_gives_way', fcA.outcomeId === 'unm.time_gives_way', fcA.outcomeId);

// ── D. Active-canon requirements gate selection ─────────────────────────────────────────────
console.log('\nD. active-canon eligibility');
resetState({ _fsAccusationMade: true });
const esc1 = win._fscCompile('Let me out of this.');
t('escape with a live family accusation -> accusation_unmade',
  esc1.outcomeId === 'unm.the_accusation_unmade', esc1.outcomeId);
resetState({ _fsAccusationMade: false });
const esc2 = win._fscCompile('Let me out of this.');
t('escape with NO family accusation -> claim_unmade',
  esc2.outcomeId === 'unm.the_claim_unmade', esc2.outcomeId);
t('the two escape branches never both fire', esc1.outcomeId !== esc2.outcomeId);

resetState({ _fsReviewPending: false });
const stop1 = win._fscCompile('Make it stop.');
t('stop with no live demand falls back to undo (authored adjacency)',
  stop1.outcomeId === 'unm.time_gives_way' && stop1.viaFallback === true,
  stop1.outcomeId + ' viaFallback=' + stop1.viaFallback);
resetState({ _fsReviewPending: true });
const stop2 = win._fscCompile('Make it stop.');
t('stop with a live demand resolves directly',
  stop2.outcomeId === 'unm.dohkar_demand_unmade' && stop2.viaFallback === false, stop2.outcomeId);

// ── E. Canonical delta vs memory-only ───────────────────────────────────────────────────────
console.log('\nE. delta shape and memory-only effects');
resetState();
const shun = win._fscCompile('Leave me alone.');
t('solitude -> the_shunning', shun.outcomeId === 'unm.the_shunning', shun.outcomeId);
t('shunning delta is additive_canon_change',
  shun.delta && shun.delta.temporalOperation === 'additive_canon_change');
t('shunning ceases nothing', shun.delta.ceases.length === 0);
const turn = win._fscCompile('I want to disappear.');
t('unseen -> the_turning_forgotten', turn.outcomeId === 'unm.the_turning_forgotten', turn.outcomeId);
t('memory outcome produces NO canonical delta', turn.delta === null);
t('memory outcome has a memory effect', turn.memoryEffects.length === 1);
t('turning_forgotten targets twist.assembly_turned only',
  turn.memoryEffects[0].atom === 'twist.assembly_turned');
const sil = win._fscCompile('Don’t bring that up.');
t('silence -> custody_unremembered', sil.outcomeId === 'unm.the_custody_unremembered', sil.outcomeId);
t('custody_unremembered forgets exactly two atoms', sil.memoryEffects.length === 2);
t('custody_unremembered INCLUDES Lirael by membership', sil.invokerScope === 'in_population');
t('custody_unremembered changes NO world fact', sil.delta === null);

// REGRESSION LOCK: a player's apostrophe may be straight or curly (iOS autocorrect emits U+2019).
// Matching only the straight form silently dropped real submissions; both must reach the same outcome.
const silStraight = win._fscCompile("Don't bring that up.");
const silCurly    = win._fscCompile('Don\u2019t bring that up.');
t('straight apostrophe reaches silence', silStraight.outcomeId === 'unm.the_custody_unremembered', silStraight.outcomeId + '/' + silStraight.error);
t('CURLY apostrophe reaches the same outcome', silCurly.outcomeId === 'unm.the_custody_unremembered', silCurly.outcomeId + '/' + silCurly.error);
const escCurly = win._fscCompile('I didn\u2019t do anything.');
t('curly apostrophe classifies escape too', escCurly.askClass === 'escape', escCurly.askClass);

// ── F. Persistence before prose, and active-canon folding ───────────────────────────────────
console.log('\nF. persistence and active-canon folding');
resetState({ _fsReviewPending: true });
t('before compile: demand atom is active', win._fscIsActive('review.demanded_by_dohkar'));
const persisted = win._fscCompileAndPersist('Make it stop.');
t('compiled record persisted to state', win.state._fscCompiled.length === 1);
t('active compiled record exposed', win.state._fscActiveCompiled.outcomeId === 'unm.dohkar_demand_unmade');
t('delta appended to the append-only log', win.state._fscDeltas.length === 1);
t('delta carries priorHistoryReplaced',
  !!win.state._fscDeltas[0].priorHistoryReplaced);
t('AFTER folding: ceased atom is no longer active', win._fscIsActive('review.demanded_by_dohkar') === false);
t('AFTER folding: replacement fact IS active', win._fscIsActive('review.dohkar_demand_never_made'));
t('unrelated invariant still active', win._fscIsActive('twist.wish_misaligned'));

// ── G. Prompt payload carries the preselected consequence ───────────────────────────────────
console.log('\nG. prompt payload');
const block = win._fscPromptBlock();
t('prompt block is non-empty', block.length > 0);
t('prompt names the outcome', block.indexOf('unm.dohkar_demand_unmade') >= 0);
t('prompt states the reading kind', /FATE-CHOSEN/.test(block));
t('prompt carries the canon change', /CANON CHANGE \(historical_replacement\)/.test(block));
t('prompt carries the replacement fact', /NOW TRUE:/.test(block));
t('prompt states cost none and forbids inventing one', /COST: none — do not invent one/.test(block));
t('prompt closes the door on unlisted effects', /Everything not listed above is UNCHANGED/.test(block));

resetState();
win._fscCompileAndPersist('I wish everyone here would forget the wish twisted.');
const block2 = win._fscPromptBlock();
t('exact reading prompt says EXACT', /EXACT/.test(block2));
t('exact prompt lists the sealed roster', /AFFECTED \(sealed roster/.test(block2));
t('exact prompt names Lirael as in_population', /in_population/.test(block2));
t('exact prompt spells out that she receives the same effect',
  /receives the same effect as every other member/.test(block2));

// ── H. choice_pending opens on the rewind and blocks continuation ───────────────────────────
console.log('\nH. choice_pending gate');
resetState();
t('no pending choice before any rewind', win._fscChoicePending() === null);
t('continuation permitted before any rewind', win._fscMayGenerateContinuation() === true);
win._fscCompileAndPersist('I wish this had never happened to me.');
t('rewind opens choice_pending', !!win._fscChoicePending());
t('continuation BLOCKED while pending', win._fscMayGenerateContinuation() === false);
t('auto-select refused (null value does not resolve)', win._fscResolveChoice(null) === null);
t('still pending after a refused auto-select', !!win._fscChoicePending());
const sealed = win._fscResolveChoice('remain');
t('an explicit choice resolves', !!sealed && sealed.value === 'remain');
t('continuation permitted after resolution', win._fscMayGenerateContinuation() === true);
t('disposition sealed to state', win.state._fsLiraelSceneOneDisposition.value === 'remain');

// ── I. Determinacy: no ask-class may have two eligible outcomes in any state ────────────────
console.log('\nI. selection determinacy across the whole opening domain');
let ambiguous = 0, uncovered = 0, checked = 0;
const CLASSES = ['stop','undo','escape','unseen','silence','authority','solitude'];
for (let m = 0; m < 8; m++) {
  resetState({ _fsAccusationMade: !!(m & 1), _fsReviewPending: !!(m & 2), _fsRemedyDemanded: !!(m & 4) });
  const active = win._fscActiveCanon();
  CLASSES.forEach(ask => {
    checked++;
    const hits = win._FSC_OUTCOMES.filter(o => o.ask === ask &&
      (o.requiresActive || []).every(a => !!active[a]) &&
      (o.requiresInactive || []).every(a => !active[a]));
    if (hits.length > 1) { ambiguous++; console.log('    AMBIGUOUS ask=' + ask + ' -> ' + hits.map(h => h.id).join('|')); }
    if (hits.length === 0 && !['stop','unseen'].includes(ask)) uncovered++;
  });
}
t('checked every ask-class across the state combinations', checked === 56, 'checked ' + checked);
t('ZERO ambiguous (state, ask) pairs — no runtime tie-break exists', ambiguous === 0, ambiguous + ' found');
t('no ask-class uncovered except the two with authored fallbacks', uncovered === 0, uncovered + ' found');

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
