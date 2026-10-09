import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const a = `    return _fscRenderBoundary(rec, { cardLabel: 'PETITION FATE',
      readingLine: 'VERDICT: ' + rec.label });`;
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
const b = `    // Cross-IIFE: the shared renderer is published on window, not in this closure's scope.
    // Referencing it bare threw ReferenceError and would have killed the petition payload in the
    // browser exactly as it did in the control.
    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    if (typeof render !== 'function') {
      try { console.error('[FPC] shared boundary renderer unavailable \\u2014 no petition payload emitted'); } catch (_) {}
      return '';
    }
    return render(rec, { cardLabel: 'PETITION FATE', readingLine: 'VERDICT: ' + rec.label });`;
fs.writeFileSync(F, s.replace(a, b));
console.log('cross-IIFE reference fixed');
