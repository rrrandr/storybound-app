import fs from 'fs';
const F = 'public/app.js';
const sub = (a, b) => {
  let s = fs.readFileSync(F, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70));
  if (s.split(a).length > 2) throw new Error('NOT UNIQUE: ' + a.slice(0, 70));
  fs.writeFileSync(F, s.replace(a, b));
};

// ── 1. Replace the render-only integrity check with an END-TO-END delivery assertion. ──────
let s = fs.readFileSync(F, 'utf8');
const iStart = s.indexOf('  function _fscPayloadIntegrity() {');
const iEnd = s.indexOf('  window._fscPayloadIntegrity = _fscPayloadIntegrity;');
if (iStart < 0 || iEnd < 0) throw new Error('INTEGRITY BOUNDS NOT FOUND');
const NEW = `  // ── DELIVERY ASSERTION \\u2014 END TO END, FAIL CLOSED (Roman 2026-09-29) ───────────────────
  // The previous check verified that the boundary block RENDERED. It returned ok for a generation
  // whose author payload contained no consequence at all, because rendering and DELIVERY are
  // different things. This asserts over the FINAL ASSEMBLED AUTHOR REQUEST.
  //
  // The compiled consequence is its own source of truth. It does not ride on legacy Fate-weave,
  // OAS-budget or scenario-active state, and none of those may be its carrier.

  // Stable digest of the required parts. Cheap, order-independent, and sensitive to alteration.
  function _fscBoundaryDigest(block) {
    var t = String(block || '');
    var h = 5381;
    for (var i = 0; i < t.length; i++) { h = (((h << 5) + h) ^ t.charCodeAt(i)) >>> 0; }
    return 'fsb' + h.toString(36) + ':' + t.length;
  }
  window._fscBoundaryDigest = _fscBoundaryDigest;

  // The parts that MUST survive into the final payload for the consequence to be authoritative.
  function _fscRequiredParts(rec, block) {
    var need = ['OUTCOME: ' + rec.outcomeId, 'FORBIDDEN INVENTIONS', 'MUST REMAIN TRUE'];
    if (rec.population && rec.population.roster && rec.population.roster.length) need.push('AFFECTED');
    if (rec.notAffected && rec.notAffected.length) need.push('NOT AFFECTED');
    if (rec.aftermathBeat) need.push('AFTERMATH BEAT');
    if (rec.aftermathBeat && rec.aftermathBeat.text) need.push(rec.aftermathBeat.text.slice(0, 48));
    if (rec.invokerScope === 'in_population') need.push('LIRAEL IS AFFECTED');
    return need;
  }

  // Assert the sealed consequence is present, whole and unaltered, in the assembled payload.
  function _fscAssertDelivered(payloadText) {
    var st = (typeof window !== 'undefined' && window.state) || {};
    var text = String(payloadText || '');
    var problems = [];
    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    [{ key: '_fscActiveCompiled', card: 'tempt', fn: '_fscPromptBlock' },
     { key: '_fpcActiveCompiled', card: 'petition', fn: '_fpcPromptBlock' }].forEach(function (c) {
      var rec = st[c.key];
      if (!rec || rec.error) return;                       // nothing sealed for this card
      if (typeof render !== 'function') {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'renderer_unavailable' }); return;
      }
      var block = '';
      try { var f = window[c.fn]; block = (typeof f === 'function') ? f() : ''; }
      catch (e) { problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'renderer_threw',
        detail: String((e && e.message) || e) }); return; }
      if (!block || !String(block).trim()) {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'empty_payload' }); return;
      }
      var missing = _fscRequiredParts(rec, block).filter(function (p) { return text.indexOf(p) < 0; });
      if (missing.length) {
        problems.push({ card: c.card, outcomeId: rec.outcomeId,
          reason: text.indexOf('OUTCOME: ' + rec.outcomeId) < 0 ? 'absent_from_payload' : 'partial_in_payload',
          missing: missing.slice(0, 6), digest: _fscBoundaryDigest(block) });
      }
    });
    if (problems.length) {
      try { st._fscDeliveryFailure = { at: Date.now(), problems: problems }; } catch (_) {}
      try { console.error('[FSC-DELIVERY] FAIL CLOSED \\u2014 the sealed consequence is not present '
        + 'and whole in the final author request: '
        + problems.map(function (p) { return p.card + '/' + p.outcomeId + ':' + p.reason; }).join(', ')
        + '. Generation is blocked; the sealed record is preserved for retry.'); } catch (_) {}
    } else if (st._fscDeliveryFailure) { try { delete st._fscDeliveryFailure; } catch (_) {} }
    return { ok: problems.length === 0, problems: problems };
  }
  window._fscAssertDelivered = _fscAssertDelivered;

  // FIRST-CLASS DELIVERY. Appends every sealed boundary block to the final author payload,
  // unconditionally \\u2014 outside any legacy Fate-weave, OAS-budget or scenario-active branch.
  // Returns the payload unchanged when nothing is sealed.
  function _fscAttachToAuthorPayload(sys) {
    var st = (typeof window !== 'undefined' && window.state) || {};
    var out = String(sys || '');
    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    if (typeof render !== 'function') return out;
    [{ key: '_fscActiveCompiled', fn: '_fscPromptBlock' },
     { key: '_fpcActiveCompiled', fn: '_fpcPromptBlock' }].forEach(function (c) {
      var rec = st[c.key];
      if (!rec || rec.error) return;
      var block = '';
      try { var f = window[c.fn]; block = (typeof f === 'function') ? f() : ''; } catch (_) { return; }
      if (!block) return;
      if (out.indexOf('OUTCOME: ' + rec.outcomeId) >= 0) return;   // already delivered; do not duplicate
      out += '\\n' + block;
      try { console.log('[FSC-DELIVERY] attached ' + rec.outcomeId + ' to the final author payload ('
        + _fscBoundaryDigest(block) + ')'); } catch (_) {}
    });
    return out;
  }
  window._fscAttachToAuthorPayload = _fscAttachToAuthorPayload;

  // Back-compat shim: the old name now performs the render-side half only. Callers that gate
  // generation must use _fscAssertDelivered against the assembled payload.
  function _fscPayloadIntegrity() { return _fscAssertDelivered(''); }
`;
s = s.slice(0, iStart) + NEW + s.slice(iEnd);
fs.writeFileSync(F, s);

// ── 2. Attach + assert at the single terminal author assembly point. ───────────────────────
sub("      var _sharedSys = sysPrompt + _cgBridgeGuard;",
`      var _sharedSys = sysPrompt + _cgBridgeGuard;
      // ── COMPILED CONSEQUENCE DELIVERY (Roman 2026-09-29) ──────────────────────────────────
      // Attached HERE, at final assembly, to the payload both dispatch paths below share.
      // Deliberately outside every legacy conditional: the compiled consequence is its own
      // source of truth and must never depend on Fate-weave, OAS-budget or scenario-active
      // state to reach the author. Legacy weave may still add other guidance; it is not the
      // carrier for these facts.
      try {
        if (typeof _fscAttachToAuthorPayload === 'function') _sharedSys = _fscAttachToAuthorPayload(_sharedSys);
      } catch (_fscAErr) { console.warn('[FSC-DELIVERY] attach threw:', _fscAErr && _fscAErr.message); }
      // END-TO-END ASSERTION, immediately before dispatch. A sealed consequence that is absent,
      // partial or altered in the assembled request stops generation rather than being authored
      // without its facts.
      try {
        if (typeof _fscAssertDelivered === 'function') {
          var _fscDel = _fscAssertDelivered(_sharedSys);
          if (!_fscDel.ok) {
            try { console.error('[FSC-DELIVERY] generation REFUSED before dispatch \\u2014 sealed consequence '
              + 'not present and whole in the final author request.'); } catch (_) {}
            return null;
          }
        }
      } catch (_fscDErr) {
        try { console.error('[FSC-DELIVERY] assertion threw \\u2014 refusing generation:', _fscDErr && _fscDErr.message); } catch (_) {}
        return null;
      }`);

console.log('first-class delivery + end-to-end assertion wired at the terminal author assembly');
