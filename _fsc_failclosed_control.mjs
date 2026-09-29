// FAIL-CLOSED CONTROL. Provider-free.
// Proves that when a sealed consequence cannot be rendered, generation is REFUSED — zero
// dispatch — and the sealed record survives intact for retry.
//
// Drives the REAL gate block extracted verbatim from _runCGScreenplayGen, so this cannot drift
// into testing a copy of the wiring.
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const S = SRC.indexOf('// STAGE 3 — ISSUE 1 OPENING CONSEQUENCE COMPILER');
if (S < 0) { console.error('FATAL: compiler section not found'); process.exit(1); }
const win = {}; globalThis.window = win;
new Function('window', SRC.slice(S - 100))(win);

// Extract BOTH live gate blocks from the real generation funnel.
const G0 = SRC.indexOf("    // ── choice_pending LIVE GATE (Roman 2026-09-29)");
const G1 = SRC.indexOf("    try { state._stagedAuthoringSceneIndex =", G0);
if (G0 < 0 || G1 < 0) { console.error('FATAL: live gate block not found'); process.exit(1); }
const GATE_SRC = SRC.slice(G0, G1);
if (GATE_SRC.indexOf('_fscPayloadIntegrity') < 0) {
  console.error('FATAL: the integrity gate is NOT present in _runCGScreenplayGen — wiring missing');
  process.exit(1);
}
const liveGate = new Function('state', '_fscGateGeneration', '_fscReplayAttempt',
  '_fscPayloadIntegrity', 'console', 'sceneIndex', GATE_SRC + '\n return "PROCEED";');

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
const quiet = { warn() {}, error() {}, log() {} };

let dispatches = 0;
function attemptGeneration(sceneIndex) {
  const r = liveGate(win.state, win._fscGateGeneration, win._fscReplayAttempt,
    win._fscPayloadIntegrity, quiet, sceneIndex);
  if (r !== 'PROCEED') return { blocked: true };
  dispatches++;                       // ONLY reached if the gate let generation begin
  return { dispatched: true };
}
const reset = () => { win.state = { _fscDeltas: [], _fscCompiled: [], _fpcCompiled: [] }; dispatches = 0; };

console.log('=== FAIL CLOSED: a sealed consequence that cannot be rendered stops generation ===\n');

console.log('A. baseline — a healthy sealed consequence proceeds');
reset();
win._fscCompileAndPersist('I want to disappear.');
t('integrity ok when the payload renders', win._fscPayloadIntegrity().ok === true);
t('generation proceeds', attemptGeneration(2).dispatched === true);
t('one dispatch', dispatches === 1);

console.log('\nB. TEMPT — renderer unavailable');
reset();
const sealedTempt = win._fscCompileAndPersist('I want to disappear.');
const realRender = win._fscRenderBoundary;
win._fscRenderBoundary = undefined;                       // simulate the renderer going missing
const integ = win._fscPayloadIntegrity();
t('integrity FAILS', integ.ok === false);
t('reason is renderer_unavailable', integ.problems[0].reason === 'renderer_unavailable', JSON.stringify(integ.problems));
t('the failing card is identified', integ.problems[0].card === 'tempt');
t('the sealed outcome id is named in the problem', integ.problems[0].outcomeId === 'unm.the_turning_forgotten');
const r1 = attemptGeneration(2);
t('GENERATION IS REFUSED', r1.blocked === true);
t('ZERO dispatches', dispatches === 0, 'dispatches=' + dispatches);
t('no empty/partial payload was emitted then proceeded', dispatches === 0);

console.log('\n  — sealed record preserved for retry —');
t('compiled consequence still present', win.state._fscCompiled.length === 1);
t('outcome id intact', win.state._fscCompiled[0].outcomeId === 'unm.the_turning_forgotten');
t('frozen roster intact', win.state._fscCompiled[0].population.roster.length === 5);
t('memory effects intact', win.state._fscCompiled[0].memoryEffects.length === 1);
t('active compiled record still points at it', win.state._fscActiveCompiled === sealedTempt);
t('render failure recorded for the recovery surface', !!win.state._fscRenderFailure);
t('failure record names the reason', win.state._fscRenderFailure.problems[0].reason === 'renderer_unavailable');
t('NO delta was appended by the failure', win.state._fscDeltas.length === 0);
t('NO second compiled consequence', win.state._fscCompiled.length === 1);

console.log('\n  — retry after recovery —');
win._fscRenderBoundary = realRender;                      // renderer comes back
t('integrity recovers', win._fscPayloadIntegrity().ok === true);
t('failure record cleared on recovery', !win.state._fscRenderFailure);
const r2 = attemptGeneration(2);
t('generation now PROCEEDS on retry', r2.dispatched === true);
t('exactly one dispatch, after recovery', dispatches === 1);
t('the SAME sealed consequence was carried, not a recompiled one',
  win.state._fscCompiled.length === 1 && win.state._fscActiveCompiled === sealedTempt);

console.log('\nC. PETITION — renderer unavailable');
reset();
win._fpcCompileAndPersist('let something go my way', { guaranteedFirst: true }, {});
win._fscRenderBoundary = undefined;
const integP = win._fscPayloadIntegrity();
t('integrity FAILS for a sealed petition', integP.ok === false);
t('the failing card is petition', integP.problems[0].card === 'petition', JSON.stringify(integP.problems));
t('petition payload returns empty rather than partial', win._fpcPromptBlock() === '');
t('GENERATION IS REFUSED', attemptGeneration(2).blocked === true);
t('ZERO dispatches', dispatches === 0);
t('sealed petition consequence preserved', win.state._fpcCompiled.length === 1);
t('its roster is intact', win.state._fpcActiveCompiled.population.roster.length === 1);
t('its aftermath beat is intact', !!win.state._fpcActiveCompiled.aftermathBeat.text);
win._fscRenderBoundary = realRender;
t('petition recovers and proceeds', attemptGeneration(2).dispatched === true);

console.log('\nD. renderer THROWS rather than being absent');
reset();
win._fscCompileAndPersist('I want to disappear.');
win._fscRenderBoundary = function () { throw new Error('boom'); };
const integT = win._fscPayloadIntegrity();
t('integrity FAILS on a throwing renderer', integT.ok === false);
t('reason is renderer_threw', integT.problems[0].reason === 'renderer_threw', JSON.stringify(integT.problems[0]));
t('GENERATION IS REFUSED', attemptGeneration(2).blocked === true);
t('ZERO dispatches', dispatches === 0);
t('sealed record preserved through a throw', win.state._fscCompiled.length === 1);
win._fscRenderBoundary = realRender;

console.log('\nE. renderer returns a PARTIAL payload');
reset();
win._fscCompileAndPersist('I want to disappear.');
win._fscRenderBoundary = function () { return '\nOUTCOME: unm.the_turning_forgotten\n'; };  // no FORBIDDEN INVENTIONS
const integPart = win._fscPayloadIntegrity();
t('integrity FAILS on a partial payload', integPart.ok === false);
t('reason is partial_payload', integPart.problems[0].reason === 'partial_payload', JSON.stringify(integPart.problems[0]));
t('GENERATION IS REFUSED on partial', attemptGeneration(2).blocked === true);
t('ZERO dispatches', dispatches === 0);
win._fscRenderBoundary = realRender;

console.log('\nF. no sealed consequence at all is NOT a failure');
reset();
t('integrity ok with nothing sealed', win._fscPayloadIntegrity().ok === true);
t('ordinary generation proceeds', attemptGeneration(2).dispatched === true);
t('one dispatch', dispatches === 1);

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
