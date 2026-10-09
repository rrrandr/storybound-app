import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const a = `  function _fscPromptBlock() {
    var st = window.state; var rec = st && st._fscActiveCompiled;
    if (!rec || rec.error) return '';
    return _fscRenderBoundary(rec, { cardLabel: 'TEMPT FATE' });
  }`;
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
const b = `  function _fscPromptBlock() {
    var st = window.state; var rec = st && st._fscActiveCompiled;
    if (!rec || rec.error) return '';
    // ONE REFERENCE. Resolved through window, exactly as the Petition block does, so the
    // integrity check and the actual render path can never disagree about which renderer is in
    // play. Using the closure copy here meant a renderer swapped or broken at runtime would be
    // invisible to _fscPayloadIntegrity while still governing the payload.
    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    if (typeof render !== 'function') {
      try { console.error('[FSC] shared boundary renderer unavailable \\u2014 sealed tempt consequence cannot be rendered'); } catch (_) {}
      return '';
    }
    return render(rec, { cardLabel: 'TEMPT FATE' });
  }`;
fs.writeFileSync(F, s.replace(a, b));
console.log('Tempt block now resolves the renderer through window, matching Petition');
