// Regression guard for the FROZEN WITHHELD-CORE LENS bug (same class as the gate).
// buildLensDirectives(..., state.turnCount, ...) emits a turn-dependent midpoint
// resolution state machine (approaching -> "MUST resolve NOW, silence no longer
// valid"). It must NOT be frozen in _persistentDirectiveCache (keyed only on
// pov|explicitAuth|intensity); it must be emitted fresh every turn in sceneDirectives,
// or the midpoint-enforcement escalation never reaches the author.
// FAILS before the fix (lens frozen in cache); PASSES after.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').split('\n');
const cacheLine = src.find(l => l.includes('state._persistentDirectiveCache = `'));
const sceneLine = src.find(l => l.includes('let sceneDirectives = `'));
if (!cacheLine) { console.error('FAIL: persistent-cache assignment line not found'); process.exit(2); }
if (!sceneLine) { console.error('FAIL: sceneDirectives assignment line not found'); process.exit(2); }
if (cacheLine.includes('${lensEnforcement}')) {
  console.error('FAIL: lensEnforcement is still baked into state._persistentDirectiveCache — the midpoint-resolution escalation freezes and never reaches the author.');
  process.exit(1);
}
if (!sceneLine.includes('${lensEnforcement}')) {
  console.error('FAIL: lensEnforcement is not emitted per-turn in sceneDirectives — the Withheld-Core lens would silently vanish.');
  process.exit(1);
}
console.log('PASS: Withheld-Core lens emitted per-turn (not frozen in the persistent cache).');
