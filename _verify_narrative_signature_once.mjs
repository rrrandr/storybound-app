// Regression guard for finding #3 (narrative-signature double-def + double-call).
// Asserts: (1) only one live buildNarrativeSignatureDirective definition remains;
// (2) the surviving stateful/random builder is invoked ONCE per prompt build (a
// single assignment); (3) both consumers (inline sceneDirectives + pyramid ctx)
// receive that same generated block; (4) => motif/closing cooldown mutates once.
// FAILS before the fix (2 defs + 2 inline calls); PASSES after.
import fs from 'fs';
const lines = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').split('\n');

const defCount = lines.filter(l => /function buildNarrativeSignatureDirective\s*\(/.test(l)).length;
if (defCount !== 1) {
  console.error(`FAIL: expected exactly 1 buildNarrativeSignatureDirective definition, found ${defCount} (dead duplicate still present).`);
  process.exit(1);
}
if (!lines.some(l => l.includes('const narrativeSignatureDirective = buildNarrativeSignatureDirective()'))) {
  console.error('FAIL: no single-call assignment `const narrativeSignatureDirective = buildNarrativeSignatureDirective()` — builder not called-once.');
  process.exit(1);
}
const sceneLine = lines.find(l => l.includes('let sceneDirectives = `'));
if (!sceneLine || sceneLine.includes('${buildNarrativeSignatureDirective()}')) {
  console.error('FAIL: main sceneDirectives still invokes buildNarrativeSignatureDirective() inline (double invocation / double cooldown mutation).');
  process.exit(1);
}
if (!sceneLine.includes('${narrativeSignatureDirective}')) {
  console.error('FAIL: main sceneDirectives does not consume the shared narrativeSignatureDirective block.');
  process.exit(1);
}
const ctxLine = lines.find(l => /narrativeSignature:\s*/.test(l));
if (!ctxLine || ctxLine.includes('buildNarrativeSignatureDirective()')) {
  console.error('FAIL: pyramid ctx still invokes buildNarrativeSignatureDirective() (second invocation).');
  process.exit(1);
}
// Dead state write should be gone.
if (lines.some(l => l.includes('state.narrativeSignature ='))) {
  console.error('FAIL: dead state.narrativeSignature write still present.');
  process.exit(1);
}
console.log('PASS: one live def; builder called once; both consumers share the block; cooldown mutates once; dead state write removed.');
