// Regression guard for the FROZEN INTIMACY GATE bug (root cause #1).
// The turn-dependent erotic-gating directive must NOT be baked into the
// persistent directive cache (which is keyed only on povMode|explicitAuth|
// intensity and never invalidated on scene/gate/cooldown state). It must be
// emitted fresh every turn in sceneDirectives, beside buildIntimacyProgressionDirective().
// FAILS before the fix (gate frozen in cache); PASSES after.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').split('\n');
const cacheLine = src.find(l => l.includes('state._persistentDirectiveCache = `'));
const sceneLine = src.find(l => l.includes('let sceneDirectives = `'));
if (!cacheLine) { console.error('FAIL: persistent-cache assignment line not found'); process.exit(2); }
if (!sceneLine) { console.error('FAIL: sceneDirectives assignment line not found'); process.exit(2); }
if (cacheLine.includes('${eroticGatingDirective}')) {
  console.error('FAIL #1: eroticGatingDirective is still baked into state._persistentDirectiveCache — the frozen-gate contradiction is present.');
  process.exit(1);
}
if (!sceneLine.includes('${eroticGatingDirective}')) {
  console.error('FAIL #1: eroticGatingDirective is not emitted per-turn in sceneDirectives — the gate would silently vanish.');
  process.exit(1);
}
console.log('PASS #1: intimacy gate emitted per-turn (not frozen in the persistent cache).');
