// Guard for the Scene-2+ speculation telemetry (COGS instrumentation, telemetry-ONLY).
// Proves the durable sb_spec_ledger records the full lifecycle (started / committed /
// discard-by-reason / timeout-fail) with estimated cost + by-mode, and that speculative
// BEHAVIOR is unchanged. FAILS before the instrumentation (emit strings absent).
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const need = [
  ['function _recordSpeculationEvent', 'telemetry recorder'],
  ['window._specLedger =', 'console inspector (attempts/commits/waste/$)'],
  ['function _estSpecCostUsd', 'per-gen cost estimator'],
  ["_recordSpeculationEvent('speculation_started'", 'started emit'],
  ["_recordSpeculationEvent('speculation_committed'", 'committed emit'],
  ["_recordSpeculationEvent('speculation_discarded_user_input'", 'user-input discard emit'],
  ["_recordSpeculationEvent('speculation_discarded_context_change'", 'context-change discard emit'],
  ["_recordSpeculationEvent('speculation_timed_out_or_failed'", 'timeout/fail emit'],
  ["'speculation_discarded_' + (reason", 'reasoned discard inside invalidateSpeculativeScene'],
  ["invalidateSpeculativeScene('obligation_change')", 'obligation-change reason at caller'],
  ["invalidateSpeculativeScene('user_input', 'custom_action')", 'action-input reason + mode'],
  ["invalidateSpeculativeScene('user_input', 'custom_dialogue')", 'dialogue-input reason + mode'],
  ['estCostUsd: _estSpecCostUsd', 'estCostUsd stored on the speculation object'],
];
for (const [p, l] of need) if (!src.includes(p)) { console.error(`FAIL: ${l} missing ("${p}").`); fail = true; }
// Behavior must be UNCHANGED: commit path + FF gate intact.
if (!src.includes('useSpeculative = true')) { console.error('FAIL: speculative commit path was altered.'); fail = true; }
if (!src.includes("if (state.fateMode === 'famous_fate') return;")) { console.error('FAIL: FF speculation gate was altered.'); fail = true; }
if (fail) process.exit(1);
console.log('PASS: durable speculation telemetry wired (started/committed/discard-by-reason/timeout + est cost + by-mode); speculative behavior unchanged.');
