// Guard (Fable CG audit — A3-F2): the LITERARY speculative preload must NOT fire in CG/staged mode.
// CG's advance path (_completeStagedSceneFromScreenplay) never calls tryCommitSpeculativeScene, so a
// literary scene generated in CG can never commit → 100% discard (real API spend) AND its discard/
// timeout is recorded into sb_spec_ledger, corrupting the literary speculation win-rate. Both the
// funnel (scheduleSpeculativePreload) and the ledger-recording gen (preloadNextScene) must gate on CG.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

function region(startNeedle, len) {
  const i = src.indexOf(startNeedle);
  return i < 0 ? '' : src.slice(i, i + len);
}
const preload = region('async function preloadNextScene()', 1600);
const schedule = region('function scheduleSpeculativePreload()', 900);

A(!!preload, 'preloadNextScene not found');
A(!!schedule, 'scheduleSpeculativePreload not found');

// Both must bail early in CG mode via the canonical helper.
const cgGate = "if (typeof _isCGRenderMode === 'function' && _isCGRenderMode()) return;";
A(preload.includes(cgGate), 'preloadNextScene missing the CG/staged gate');
A(schedule.includes(cgGate), 'scheduleSpeculativePreload missing the CG/staged gate');

// The preload gate must sit ABOVE the ledger-recording work (before the in-flight/valid guards it
// already had), so no sb_spec_ledger event can be emitted in CG.
A(preload.indexOf(cgGate) < preload.indexOf('state.isPreloadingNextScene'), 'CG gate not placed before preload proceeds');

// Behaviour-neutral for literary: the gate keys ONLY on CG render mode (no other new early-return).
A(/_isCGRenderMode\(\)\) return;/.test(preload), 'CG gate not keyed strictly on render mode');

if (fail) process.exit(1);
console.log('PASS: literary speculative preload (funnel + gen) gated off in CG/staged mode — no wasted uncommittable gen, no sb_spec_ledger pollution; literary path unchanged.');
