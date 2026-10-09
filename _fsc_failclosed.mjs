import fs from 'fs';
const F = 'public/app.js';
const sub = (a, b) => {
  let s = fs.readFileSync(F, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70));
  if (s.split(a).length > 2) throw new Error('NOT UNIQUE: ' + a.slice(0, 70));
  fs.writeFileSync(F, s.replace(a, b));
};

// ── 1. Payload integrity check. A sealed consequence MUST reach the author intact. ─────────
sub("  window._fscRenderBoundary = _fscRenderBoundary;",
`  window._fscRenderBoundary = _fscRenderBoundary;

  // ── PAYLOAD INTEGRITY \\u2014 FAIL CLOSED (Roman 2026-09-29) ─────────────────────────────────
  // A compiled consequence that cannot be rendered must STOP generation. Emitting nothing and
  // letting the author proceed recreates the exact failure this compiler exists to prevent: an
  // accepted, paid Fate intervention with no authoritative consequence in the prompt, leaving the
  // model to invent one. Silence is not a safe degradation here.
  //
  // Distinguishes three states:
  //   no sealed consequence        -> ok (nothing to carry)
  //   sealed + full payload        -> ok
  //   sealed + empty/partial/threw -> NOT ok, block generation, preserve the record for retry
  function _fscPayloadIntegrity() {
    var s = (typeof window !== 'undefined' && window.state) || {};
    var problems = [];
    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    var cards = [
      { key: '_fscActiveCompiled', card: 'tempt',    fn: '_fscPromptBlock' },
      { key: '_fpcActiveCompiled', card: 'petition', fn: '_fpcPromptBlock' }
    ];
    cards.forEach(function (c) {
      var rec = s[c.key];
      if (!rec || rec.error) return;               // nothing sealed for this card
      if (typeof render !== 'function') {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'renderer_unavailable' });
        return;
      }
      var out = '';
      try {
        var f = (typeof window !== 'undefined') && window[c.fn];
        out = (typeof f === 'function') ? f() : '';
      } catch (e) {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'renderer_threw',
                        detail: String((e && e.message) || e) });
        return;
      }
      if (!out || !String(out).trim()) {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'empty_payload' });
      } else if (String(out).indexOf('FORBIDDEN INVENTIONS') < 0
              || String(out).indexOf('OUTCOME:') < 0) {
        problems.push({ card: c.card, outcomeId: rec.outcomeId, reason: 'partial_payload' });
      }
    });
    if (problems.length) {
      // Recorded for the retry/recovery surface. The sealed consequence itself is NEVER cleared.
      try { s._fscRenderFailure = { at: Date.now(), problems: problems }; } catch (_) {}
      try { console.error('[FSC-INTEGRITY] FAIL CLOSED \\u2014 a sealed consequence could not be rendered: '
        + problems.map(function (p) { return p.card + '/' + p.outcomeId + ':' + p.reason; }).join(', ')
        + '. Generation is blocked; the sealed record is preserved for retry.'); } catch (_) {}
    } else if (s._fscRenderFailure) {
      try { delete s._fscRenderFailure; } catch (_) {}
    }
    return { ok: problems.length === 0, problems: problems };
  }
  window._fscPayloadIntegrity = _fscPayloadIntegrity;`);

// ── 2. The Petition renderer-unavailable path no longer returns a bare empty string as if it
//      were a normal "nothing to say". It records the failure; integrity blocks generation.
sub(`    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    if (typeof render !== 'function') {
      try { console.error('[FPC] shared boundary renderer unavailable \\u2014 no petition payload emitted'); } catch (_) {}
      return '';
    }`,
`    var render = (typeof window !== 'undefined') && window._fscRenderBoundary;
    if (typeof render !== 'function') {
      // NOT a safe empty return. A sealed petition consequence exists and cannot be carried;
      // _fscPayloadIntegrity turns this into a blocked generation rather than a silent scene.
      try { console.error('[FPC] shared boundary renderer unavailable \\u2014 sealed petition consequence cannot be rendered'); } catch (_) {}
      return '';
    }`);

// ── 3. Gate generation on payload integrity, in the same single funnel. ───────────────────
sub("    try { state._stagedAuthoringSceneIndex =",
`    // ── PAYLOAD INTEGRITY GATE \\u2014 FAIL CLOSED ──────────────────────────────────────────
    // Runs before any generation work. If a sealed Tempt or Petition consequence cannot be
    // rendered into the author payload, no scene is generated: the alternative is a paid
    // intervention authored with no consequence in front of the model.
    try {
      if (typeof _fscPayloadIntegrity === 'function') {
        var _fscInt = _fscPayloadIntegrity();
        if (!_fscInt.ok) {
          try { console.error('[FSC-GATE] generation REFUSED \\u2014 sealed consequence could not be rendered. '
            + 'The invocation and its consequence are preserved; retry once the renderer is available.'); } catch (_) {}
          return null;
        }
      }
    } catch (_fscIErr) {
      // The integrity check itself failing is also a fail-closed condition.
      try { console.error('[FSC-GATE] integrity check threw \\u2014 refusing generation:', _fscIErr && _fscIErr.message); } catch (_) {}
      return null;
    }
    try { state._stagedAuthoringSceneIndex =`);

console.log('fail-closed payload integrity wired into the generation funnel');
