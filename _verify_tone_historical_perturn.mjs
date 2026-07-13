// Regression guard: buildHistoricalReferenceDirective() (Fatelands, trigger-gated by
// tempt/fate-card/awareness/stance per turn) must NOT ride the cached turnToneEnforcement
// block (frozen-cache class). It must be emitted per-turn in sceneDirectives; tone+wry stay
// cached. FAILS before the fix (historical in cached tone block); PASSES after.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').split('\n');
const toneLine = src.find(l => l.includes('const turnToneEnforcement =')); // first hit = main continuation path
const sceneLine = src.find(l => l.includes('let sceneDirectives = `'));
if (!toneLine || !sceneLine) { console.error('FAIL: anchor line(s) not found'); process.exit(2); }
if (toneLine.includes('buildHistoricalReferenceDirective')) {
  console.error('FAIL: buildHistoricalReferenceDirective() still rides the cached turnToneEnforcement — its trigger-gated output freezes.');
  process.exit(1);
}
if (!sceneLine.includes('buildHistoricalReferenceDirective')) {
  console.error('FAIL: buildHistoricalReferenceDirective() is not emitted per-turn in sceneDirectives.');
  process.exit(1);
}
console.log('PASS: historical-reference directive emitted per-turn (not frozen in the cached tone block).');
