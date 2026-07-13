// Regression guard: materialEnsembleDirective embeds state.currentMaterialObserverChain,
// which selectMaterialObserverChain() regenerates EVERY turn (Math.random). It must NOT be
// frozen in _persistentDirectiveCache (keyed pov|explicitAuth|intensity) or the observer chain
// never rotates — contradicting the directive's own "avoid repeating" order. Emit per-turn.
// FAILS before the fix (frozen in cache); PASSES after.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').split('\n');
const cacheLine = src.find(l => l.includes('state._persistentDirectiveCache = `'));
const sceneLine = src.find(l => l.includes('let sceneDirectives = `'));
if (!cacheLine || !sceneLine) { console.error('FAIL: anchor line(s) not found'); process.exit(2); }
if (cacheLine.includes('${materialEnsembleDirective}')) {
  console.error('FAIL: materialEnsembleDirective is still baked into the persistent cache — the observer chain freezes.');
  process.exit(1);
}
if (!sceneLine.includes('${materialEnsembleDirective}')) {
  console.error('FAIL: materialEnsembleDirective is not emitted per-turn in sceneDirectives.');
  process.exit(1);
}
console.log('PASS: material-ensemble POV directive emitted per-turn (observer chain not frozen).');
