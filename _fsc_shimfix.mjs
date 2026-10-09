import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const a = `  // Back-compat shim: the old name now performs the render-side half only. Callers that gate
  // generation must use _fscAssertDelivered against the assembled payload.
  function _fscPayloadIntegrity() { return _fscAssertDelivered(''); }`;
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
const b = `  // RENDER-SIDE PRECHECK. Runs at the generation funnel, BEFORE assembly exists, so it cannot
  // assert delivery — it catches an unrenderable consequence early and cheaply. Delivery itself is
  // asserted by _fscAssertDelivered against the assembled payload immediately before dispatch.
  // The two are deliberately separate: an earlier version conflated them and asserted delivery
  // against an empty string, which blocks every generation that has a sealed consequence.
  function _fscPayloadIntegrity() {
    var st = (typeof window !== 'undefined' && window.state) || {};
    var problems = [];
    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    [{ key: '_fscActiveCompiled', card: 'tempt', fn: '_fscPromptBlock' },
     { key: '_fpcActiveCompiled', card: 'petition', fn: '_fpcPromptBlock' }].forEach(function (c) {
      var rec = st[c.key];
      if (!rec || rec.error) return;
      if (typeof render !== 'function') {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'renderer_unavailable' }); return;
      }
      var out = '';
      try { var f = window[c.fn]; out = (typeof f === 'function') ? f() : ''; }
      catch (e) { problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'renderer_threw',
        detail: String((e && e.message) || e) }); return; }
      if (!out || !String(out).trim()) {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'empty_payload' });
      } else if (String(out).indexOf('FORBIDDEN INVENTIONS') < 0 || String(out).indexOf('OUTCOME:') < 0) {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'partial_payload' });
      }
    });
    if (problems.length) {
      try { st._fscRenderFailure = { at: Date.now(), problems: problems }; } catch (_) {}
      try { console.error('[FSC-INTEGRITY] FAIL CLOSED \\u2014 a sealed consequence could not be rendered: '
        + problems.map(function (p) { return p.card + '/' + p.outcomeId + ':' + p.reason; }).join(', ')
        + '. Generation is blocked; the sealed record is preserved for retry.'); } catch (_) {}
    } else if (st._fscRenderFailure) { try { delete st._fscRenderFailure; } catch (_) {} }
    return { ok: problems.length === 0, problems: problems };
  }`;
fs.writeFileSync(F, s.replace(a, b));
console.log('render-side precheck restored as its own function');
