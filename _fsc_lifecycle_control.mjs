// STAGE 3 OPENING COMPILER — FULL LIFECYCLE CONTROL.
// Provider-free. Drives the REAL live gate through the REAL generation funnel by loading the
// actual _runCGScreenplayGen gate block out of public/app.js — not a re-implementation.
//
// Proves the sequence the slice is not complete without:
//   real generation attempt -> failure -> reload -> static choice -> chosen continuation.
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const START = SRC.indexOf('// STAGE 3 — ISSUE 1 OPENING CONSEQUENCE COMPILER');
if (START < 0) { console.error('FATAL: compiler section not found'); process.exit(1); }
const win = {};
globalThis.window = win;
new Function('window', SRC.slice(START - 100))(win);

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
const reset = (f) => { win.state = Object.assign({ _fscDeltas: [], _fscCompiled: [] }, f || {}); };

// ── THE LIVE GATE, extracted verbatim from _runCGScreenplayGen. ────────────────────────────
// If the wiring in app.js changes, this extraction changes with it — the control cannot drift
// into testing a copy.
const GATE_START = SRC.indexOf("    // ── choice_pending LIVE GATE (Roman 2026-09-29)");
const GATE_END = SRC.indexOf("    try { state._stagedAuthoringSceneIndex =", GATE_START);
if (GATE_START < 0 || GATE_END < 0) { console.error('FATAL: live gate block not found in _runCGScreenplayGen'); process.exit(1); }
const GATE_SRC = SRC.slice(GATE_START, GATE_END);
const liveGate = new Function('state', '_fscGateGeneration', '_fscReplayAttempt', 'console', 'sceneIndex',
  GATE_SRC + '\n return "PROCEED";');
// Returns "PROCEED" if generation may run; null/undefined if the real gate returned early.
const runGate = (sceneIndex) => liveGate(win.state, win._fscGateGeneration, win._fscReplayAttempt,
  { warn() {}, log() {} }, sceneIndex);

// A provider-free stand-in for the generation itself. The GATE is real; only the model is not.
let generationCalls = 0;
function attemptGeneration(sceneIndex, { succeed }) {
  if (runGate(sceneIndex) !== 'PROCEED') return { blocked: true };
  generationCalls++;
  if (!succeed) return { failed: true };
  win._fscMarkReplayGenerated();
  return { plan: { sceneIndex } };
}

console.log('=== FULL LIFECYCLE: attempt → failure → reload → static choice → continuation ===\n');

// ── A. Normal play: no pending choice, generation proceeds ──────────────────────────────────
console.log('A. baseline');
reset();
t('gate permits generation with no pending choice', runGate(2) === 'PROCEED');

// ── B. The rewind seals, opening a real pending choice ──────────────────────────────────────
console.log('\nB. rewind seals and opens the choice');
reset({ _temptGuardActiveReservation: 'rsv-1' });
const compiled = win._fscCompileAndPersist('I wish this had never happened to me.');
t('rewind compiled', compiled.outcomeId === 'unm.time_gives_way');
t('one compiled consequence', win.state._fscCompiled.length === 1);
t('one canonical delta', win.state._fscDeltas.length === 1);
t('choice is pending', !!win._fscChoicePending());
t('choice is reachable, tier 1', win._fscChoiceReachable().tier === 1);

// ── C. COMPILE IDEMPOTENCY: a re-entered seal must not revise the world twice ───────────────
console.log('\nC. idempotency for one paid wish');
const again = win._fscCompileAndPersist('I wish this had never happened to me.');
t('re-compile returns the SAME record', again === compiled || again.outcomeId === compiled.outcomeId);
t('NO second compiled consequence', win.state._fscCompiled.length === 1, 'len=' + win.state._fscCompiled.length);
t('NO second canonical delta', win.state._fscDeltas.length === 1, 'len=' + win.state._fscDeltas.length);

// ── D. REAL GENERATION ATTEMPT that FAILS, through the live gate ────────────────────────────
console.log('\nD. real attempt → failure (bounded retry)');
generationCalls = 0;
const a1 = attemptGeneration(0, { succeed: false });
t('attempt 1 passed the gate and ran', a1.failed === true && generationCalls === 1);
t('attempt 1 did NOT mark the replay generated', !win.state._fscChoicePending.replayGenerated);
t('attempts counted', win.state._fscChoicePending.attempts === 1);
const a2 = attemptGeneration(0, { succeed: false });
const a3 = attemptGeneration(0, { succeed: false });
t('attempts 2 and 3 also ran', a2.failed && a3.failed && generationCalls === 3);
const a4 = attemptGeneration(0, { succeed: false });
t('attempt 4 is REFUSED by the bound', a4.blocked === true, JSON.stringify(a4));
t('generation was not called a 4th time', generationCalls === 3, 'calls=' + generationCalls);
t('retries recorded exhausted', win._fscReplayExhausted() === true);
t('the choice is STILL reachable after exhaustion', win._fscChoiceReachable().reachable === true);
t('now via tier 2', win._fscChoiceReachable().tier === 2);
t('failure created NO second delta', win.state._fscDeltas.length === 1);
t('failure created NO second compiled consequence', win.state._fscCompiled.length === 1);

// ── E. RELOAD: everything durable survives a full state round-trip ──────────────────────────
console.log('\nE. reload survival (JSON round-trip of the persisted state)');
const serialized = JSON.stringify(win.state);
win.state = JSON.parse(serialized);
const cpAfter = win._fscChoicePending();
t('pending choice survives reload', !!cpAfter);
t('retry exhaustion survives reload', win._fscReplayExhausted() === true);
t('compiled consequence survives reload', win.state._fscCompiled.length === 1
  && win.state._fscCompiled[0].outcomeId === 'unm.time_gives_way');
const rec = win.state._fscCompiled[0];
t('FROZEN ROSTER survives reload', rec.population && rec.population.roster.length === 5);
t('frozen roster still includes pc:lirael', rec.population.roster.indexOf('pc:lirael') >= 0);
t('invokerScope survives reload', rec.invokerScope === 'in_population');
t('memory effects survive reload', rec.memoryEffects.length === 2);
t('CANONICAL DELTA LOG survives reload', win.state._fscDeltas.length === 1);
t('delta temporalOperation survives', win.state._fscDeltas[0].temporalOperation === 'historical_replacement');
t('delta priorHistoryReplaced survives', !!win.state._fscDeltas[0].priorHistoryReplaced);
t('active canon still folds the delta after reload',
  win._fscIsActive('interr.julian_questioned_lirael') === false);
t('replacement fact still active after reload', win._fscIsActive('interr.no_questioning_occurred'));
t('continuation still refused after reload', runGate(3) !== 'PROCEED');

// ── F. STATIC IN-FICTION CHOICE (Tier 2): no model call, no charge, no delta ────────────────
console.log('\nF. static in-fiction fallback');
const deltasBefore = win.state._fscDeltas.length;
const compiledBefore = win.state._fscCompiled.length;
const fortuneBefore = (win.state.fortunes = 7);
const stat = win._fscStaticChoicePresentation();
t('static presentation is available', !!stat);
t('it creates NO delta', stat.createsDelta === false && win.state._fscDeltas.length === deltasBefore);
t('it charges NO Fortune', stat.chargesFortune === false && win.state.fortunes === fortuneBefore);
t('it creates NO second compiled consequence', win.state._fscCompiled.length === compiledBefore);
t('it offers BOTH original options', stat.options.length === 2);
t('both options genuinely available (neither disabled/preselected)',
  stat.options.every(o => o.value && o.label && o.disabled === undefined));
t('it presents the choice and nothing else (no prose/recap/continuation keys)',
  Object.keys(stat).sort().join(',') === 'chargesFortune,createsDelta,id,mode,options,prompt');
t('no model/failure/retry/recovery language reaches the reader',
  !/model|fail|retry|recover|error|generat/i.test(stat.prompt + JSON.stringify(stat.options)));
t('static path available AFTER reload as well as immediately after failure',
  win._fscChoiceReachable().viaStatic === true);

// ── G. The player chooses on the static path, and it seals normally ─────────────────────────
console.log('\nG. chosen continuation through the live path');
t('auto-select still refused', win._fscResolveChoice(null) === null);
t('continuation still refused before the choice', runGate(3) !== 'PROCEED');
const sealed = win._fscResolveChoice('run');
t('an explicit choice on the static path seals', !!sealed && sealed.value === 'run');
t('sealing created NO delta', win.state._fscDeltas.length === deltasBefore);
t('sealing charged NO Fortune', win.state.fortunes === fortuneBefore);
t('disposition bound to the replayed scene record',
  win.state._fsLiraelSceneOneDisposition && 'sealedTo' in win.state._fsLiraelSceneOneDisposition);
t('no pending choice remains', win._fscChoicePending() === null);
t('CONTINUATION NOW PROCEEDS through the live gate', runGate(3) === 'PROCEED');
generationCalls = 0;
const cont = attemptGeneration(3, { succeed: true });
t('a real continuation runs after the choice', !!cont.plan && generationCalls === 1);

// ── H. The player may choose DIFFERENTLY — no prior value is inherited ──────────────────────
console.log('\nH. the renewed choice is free');
reset({ _temptGuardActiveReservation: 'rsv-2', _fsLiraelSceneOneDisposition: { value: 'remain' } });
win._fscCompileAndPersist('I wish this had never happened to me.');
t('a second rewind opens a fresh pending choice', !!win._fscChoicePending());
t('no prior value is copied into the pending record',
  win.state._fscChoicePending.value === null);
const other = win._fscResolveChoice('run');
t('the player may choose the other branch', other.value === 'run');
t('the new value replaces the old disposition', win.state._fsLiraelSceneOneDisposition.value === 'run');

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
