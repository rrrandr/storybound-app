/**
 * =============================================================================
 * HAIKU FIRE COUNTER — passive, isolated instrumentation (Roman 2026-06-25)
 * =============================================================================
 *
 * PURPOSE: measure ACTUAL Haiku (`claude-haiku-4-5`) usage by callsite during a
 * normal playthrough, so model-replacement decisions (Mistral Small bakeoffs) are
 * driven by real spend instead of static estimates. The static analysis flagged the
 * CONDITIONAL per-scene repair bucket (_cheapLineEdit / _haikuLineEdit / reflow) as
 * the biggest unknown — it swings modeled cost ~$0.30→$0.85/story depending on how
 * often detectors trip. This counter measures that trip rate empirically.
 *
 * DESIGN (zero behavior change — read carefully before editing):
 *   • Wraps window.fetch ONCE. For every /api/anthropic-proxy call (Haiku-only since
 *     the server allowlist was locked down) it captures a stack trace + the system-
 *     prompt fingerprint at request time, and reads token usage from a CLONE of the
 *     response. The ORIGINAL response/promise is returned untouched to the caller.
 *   • NO extra model calls, NO prompt changes, NO routing changes, NO callsite edits.
 *     Attribution is by JS stack frame (app.js is unminified, so real function names
 *     survive) with a system-prompt fingerprint tiebreaker for the shared repair/
 *     polish wrappers.
 *   • Log is in-memory + debounced-mirrored to localStorage (non-disposable key) so a
 *     multi-reload playthrough accumulates.
 *
 * USAGE:
 *   window._haikuFireReport()   → console.table + ranked summary; returns the object.
 *   window._haikuFireReset()    → clears the log (memory + localStorage).
 *   window._haikuFireLog        → raw fire array (for ad-hoc inspection).
 *
 * Cost model (Haiku): in $1/M, out $5/M, cache-read $0.10/M, cache-write ~$1.25/M.
 * =============================================================================
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__haikuFireShimInstalled) return;
  window.__haikuFireShimInstalled = true;

  var LS_KEY = 'sb_haiku_fire_log';     // NON-disposable (not sb_exrot_off_*) → survives the LS headroom sweep
  var MAX_ENTRIES = 5000;
  var PRICE = { in: 1e-6, out: 5e-6, cacheRead: 1e-7, cacheWrite5m: 1.25e-6, cacheWrite1h: 2e-6 };

  // ── load any prior log (multi-reload playthrough) ──
  var _log = [];
  try { var prior = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); if (Array.isArray(prior)) _log = prior.slice(-MAX_ENTRIES); } catch (_) {}
  window.__haikuFireLog = _log;
  window._haikuFireLog = _log;

  var _saveTimer = null;
  function _persist() {
    if (_saveTimer) return;
    _saveTimer = setTimeout(function () {
      _saveTimer = null;
      try { localStorage.setItem(LS_KEY, JSON.stringify(_log.slice(-MAX_ENTRIES))); } catch (_) {}
    }, 1500);
  }

  // ── attribution: classify a fire from its stack + system-prompt fingerprint ──
  // Ordered fingerprint rules FIRST (deterministic; split the shared _claudePassWithFallback
  // repair/polish wrappers), then function-name rules. Unknowns record their top app frame.
  var SYSFP_RULES = [
    { test: /^Tightly POLISH ONLY this romance-forward|Tightly POLISH ONLY/i, label: 'grok_author_romance_polish', cat: 'per-scene polish', shipped: true, cond: true },
    // both repair prompts start "Fix ONLY mechanical defects" — split by stack below
    { test: /^Fix ONLY mechanical defects/i, label: '__REPAIR__', cat: 'per-scene repair', shipped: true, cond: false }
  ];
  // fn-name → classification. First matching frame wins.
  var FN_RULES = [
    // per-scene repair (the unconditional one — used as the SCENE COUNT denominator)
    { fn: '_grokLiteraryAuthor', label: 'grok_lit_haiku_repair', cat: 'per-scene repair', shipped: true, cond: false },
    // conditional per-scene repairs (THE measurement target)
    { fn: '_repairCalcifiedMoves', label: 'haiku_line_edit:calcified', cat: 'conditional repair', shipped: true, cond: true },
    { fn: '_repairInterlocutorPicturability', label: 'haiku_line_edit:picturability', cat: 'conditional repair', shipped: true, cond: true },
    { fn: '_haikuLineEdit', label: 'haiku_line_edit', cat: 'conditional repair', shipped: true, cond: true },
    { fn: '_cheapLineEdit', label: 'cheap_line_edit', cat: 'conditional repair', shipped: true, cond: true },
    { fn: '_reflowSceneDialogueLLM', label: 'reflow', cat: 'conditional repair', shipped: true, cond: true },
    // scene-1 only
    { fn: '_repairHotOpening', label: 'hot_opening_repair', cat: 'scene-1 repair', shipped: true, cond: true },
    { fn: '_genBespokeScene1Axis', label: 'bespoke_scene1_axis', cat: 'scene-1 prose', shipped: true, cond: false },
    // setup — bibles / plot / scaffold (load-bearing JSON)
    { fn: '_generatePCBodyBible', label: 'pc_body_bible', cat: 'setup', shipped: true, cond: false },
    { fn: '_generateLIBodyBible', label: 'li_body_bible', cat: 'setup', shipped: true, cond: false },
    { fn: '_generateAntagonistBodyBible', label: 'antagonist_body_bible', cat: 'setup', shipped: true, cond: true },
    { fn: '_generatePairBond', label: 'pair_bond', cat: 'setup', shipped: true, cond: false },
    { fn: '_generateRPlot', label: 'r_plot', cat: 'setup', shipped: true, cond: false },
    { fn: '_buildScene1Scaffold', label: 'scene1_scaffold', cat: 'setup', shipped: true, cond: false },
    { fn: '_doScaffoldCall', label: 'scene1_scaffold', cat: 'setup', shipped: true, cond: false },
    { fn: '_buildCGScaffold', label: 'issue_spine_scaffold', cat: 'setup', shipped: true, cond: false },
    { fn: '_compressAPlotForScene1', label: 'aplot_compress_scene1', cat: 'setup', shipped: true, cond: false },
    { fn: '_physicalCanonDecalcifyGate', label: 'physical_canon_decalcify', cat: 'setup(reroll)', shipped: true, cond: true },
    { fn: '_behavioralCanonDecalcifyGate', label: 'behavioral_canon_decalcify', cat: 'setup(reroll)', shipped: true, cond: true },
    { fn: 'generateAPlot', label: 'aplot_json_repair', cat: 'setup(json-repair)', shipped: true, cond: true },
    // audits / classifiers (telemetry only — DON'T affect shipped output)
    { fn: '_auditSceneEmotionalGravity', label: 'audit:emotional_gravity', cat: 'audit', shipped: false, cond: false },
    { fn: '_extractAndRecordScene1SignaturePhrases', label: 'classify:signature_phrases', cat: 'classifier', shipped: false, cond: false },
    { fn: '_classifyConflictFamily', label: 'classify:conflict_family', cat: 'classifier', shipped: false, cond: false },
    { fn: '_auditRPlotShape', label: 'audit:rplot_shape', cat: 'audit', shipped: false, cond: false },
    { fn: '_auditWoundLIIntegration', label: 'audit:wound_li_swap', cat: 'audit', shipped: false, cond: false },
    { fn: '_classifyLITexture', label: 'classify:li_texture', cat: 'classifier', shipped: false, cond: false },
    { fn: '_classifyArchetypeManifestation', label: 'classify:archetype', cat: 'classifier', shipped: false, cond: false },
    { fn: '_auditSpineThesesAgainstRPlot', label: 'audit:spine_theses', cat: 'audit', shipped: false, cond: false },
    { fn: '_auditSpineCausalChain', label: 'audit:spine_causal', cat: 'audit', shipped: false, cond: false },
    { fn: '_auditSceneAgainstRPlot', label: 'audit:scene_vs_rplot', cat: 'audit', shipped: false, cond: false }
  ];

  function _parseFrames(stack) {
    // returns ordered list of {fn, loc} for app.js / orchestration-client.js frames
    var out = [];
    var lines = String(stack || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (L.indexOf('app.js') === -1 && L.indexOf('orchestration-client.js') === -1) continue;
      // chrome: "    at _fnName (http://host/app.js?v=...:12345:6)"  /  firefox: "_fnName@http://.../app.js:..."
      var m = L.match(/at\s+([^\s(]+)\s*\(/) || L.match(/^\s*([^@\s]+)@/);
      var fn = m ? m[1] : '';
      var locM = L.match(/(app\.js|orchestration-client\.js)[^:]*:(\d+):(\d+)/);
      out.push({ fn: fn, loc: locM ? (locM[1] + ':' + locM[2]) : '' });
    }
    return out;
  }

  function _classify(stack, sysFp) {
    var frames = _parseFrames(stack);
    var hasGrokLit = frames.some(function (f) { return f.fn === '_grokLiteraryAuthor'; });
    // 1) deterministic system-prompt rules (split shared wrappers)
    for (var i = 0; i < SYSFP_RULES.length; i++) {
      var r = SYSFP_RULES[i];
      if (r.test.test(sysFp)) {
        if (r.label === '__REPAIR__') {
          return hasGrokLit
            ? { label: 'grok_lit_haiku_repair', cat: 'per-scene repair', shipped: true, cond: false }
            : { label: 'integration_haiku_repair', cat: 'per-scene repair', shipped: true, cond: false };
        }
        return { label: r.label, cat: r.cat, shipped: r.shipped, cond: r.cond };
      }
    }
    // 2) function-name rules (first matching frame, in priority order)
    for (var j = 0; j < FN_RULES.length; j++) {
      for (var k = 0; k < frames.length; k++) {
        if (frames[k].fn === FN_RULES[j].fn) {
          return { label: FN_RULES[j].label, cat: FN_RULES[j].cat, shipped: FN_RULES[j].shipped, cond: FN_RULES[j].cond };
        }
      }
    }
    // 3) unknown — record the top app frame so the map can be refined
    var top = frames.length ? (frames[0].fn || frames[0].loc || '?') : '?';
    return { label: 'unknown:' + top, cat: 'unknown', shipped: null, cond: false, frames: frames.slice(0, 4) };
  }

  function _hostMode() {
    var h = '';
    try { h = (window.location && window.location.hostname) || ''; } catch (_) {}
    var isLocal = h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || /\.local$/.test(h) || window.__DEV__ === true;
    var rate = (typeof window._auditSampleRate === 'number') ? window._auditSampleRate : 0.05;
    return { host: h || '(unknown)', isLocal: isLocal, auditSampleRate: isLocal ? 1.0 : rate };
  }

  // ── the fetch wrapper (transparent passthrough) ──
  var _origFetch = window.fetch.bind(window);
  window.fetch = function (resource, init) {
    var url = '';
    try { url = (typeof resource === 'string') ? resource : (resource && resource.url) || ''; } catch (_) {}
    if (url.indexOf('/api/anthropic-proxy') === -1) return _origFetch(resource, init);

    // capture request-time context (cheap, synchronous)
    var stack = '';
    try { throw new Error('haiku-trace'); } catch (e) { stack = e.stack || ''; }
    var model = '', sysFp = '', maxTok = 0;
    try {
      var bodyStr = (init && init.body) || (typeof resource === 'object' && resource.body) || '';
      if (bodyStr && typeof bodyStr === 'string') {
        var b = JSON.parse(bodyStr);
        model = b.model || '';
        maxTok = b.max_tokens || 0;
        if (Array.isArray(b.messages)) {
          var sys = b.messages.find(function (m) { return m && m.role === 'system'; });
          if (sys) {
            var c = sys.content;
            sysFp = (typeof c === 'string') ? c : (Array.isArray(c) && c[0] && c[0].text) || '';
            sysFp = String(sysFp).slice(0, 140);
          }
        }
      }
    } catch (_) {}

    var p = _origFetch(resource, init);
    // fire-and-forget logging from a CLONE — never touches the caller's promise/response
    try {
      p.then(function (res) {
        try {
          var clone = res.clone();
          clone.json().then(function (data) {
            var u = (data && data.usage) || {};
            var cls = _classify(stack, sysFp);
            _log.push({
              t: Date.now(),
              label: cls.label, cat: cls.cat, shipped: cls.shipped, cond: cls.cond,
              model: model, maxTok: maxTok, ok: !!res.ok, status: res.status,
              inTok: u.input_tokens || u.prompt_tokens || 0,
              outTok: u.output_tokens || u.completion_tokens || 0,
              cacheRead: u.cache_read_input_tokens || 0,
              cacheWrite: u.cache_creation_input_tokens || 0,
              cacheWrite1h: u.cache_creation_1h_input_tokens || 0,
              storyId: (function () { try { return (window.state && window.state.storyId) || ''; } catch (_) { return ''; } })(),
              turn: (function () { try { return (window.state && window.state.turnCount) || 0; } catch (_) { return 0; } })(),
              fp: sysFp,
              frames: cls.frames || undefined
            });
            if (_log.length > MAX_ENTRIES) _log.splice(0, _log.length - MAX_ENTRIES);
            _persist();
          })['catch'](function () {});
        } catch (_) {}
      }, function () {});
    } catch (_) {}
    return p; // original promise, untouched
  };

  function _cost(e) {
    var cw1h = e.cacheWrite1h || 0;
    var cw5m = Math.max(0, (e.cacheWrite || 0) - cw1h);
    return (e.inTok || 0) * PRICE.in
      + (e.outTok || 0) * PRICE.out
      + (e.cacheRead || 0) * PRICE.cacheRead
      + cw5m * PRICE.cacheWrite5m
      + cw1h * PRICE.cacheWrite1h;
  }

  window._haikuFireReset = function () {
    _log.length = 0;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    console.log('[HAIKU-FIRE] log cleared.');
    return true;
  };

  window._haikuFireReport = function (opts) {
    opts = opts || {};
    var rows = _log.slice();
    if (opts.storyId) rows = rows.filter(function (e) { return e.storyId === opts.storyId; });
    if (!rows.length) { console.log('[HAIKU-FIRE] no calls logged yet. Play a scene or two, then re-run _haikuFireReport().'); return { fires: 0 }; }

    var byLabel = {};
    var total = { fires: 0, inTok: 0, outTok: 0, cacheRead: 0, cost: 0, failures: 0 };
    rows.forEach(function (e) {
      var k = e.label || 'unknown';
      var g = byLabel[k] || (byLabel[k] = { label: k, cat: e.cat, shipped: e.shipped, cond: e.cond, fires: 0, inTok: 0, outTok: 0, cacheRead: 0, cost: 0, fail: 0 });
      var c = _cost(e);
      g.fires++; g.inTok += e.inTok || 0; g.outTok += e.outTok || 0; g.cacheRead += e.cacheRead || 0; g.cost += c; if (!e.ok) g.fail++;
      total.fires++; total.inTok += e.inTok || 0; total.outTok += e.outTok || 0; total.cacheRead += e.cacheRead || 0; total.cost += c; if (!e.ok) total.failures++;
    });

    var arr = Object.keys(byLabel).map(function (k) { return byLabel[k]; }).sort(function (a, b) { return b.cost - a.cost; });

    // scene denominator = unconditional per-scene repair fires (one per literary scene)
    var sceneFires = (byLabel['grok_lit_haiku_repair'] ? byLabel['grok_lit_haiku_repair'].fires : 0)
      + (byLabel['integration_haiku_repair'] ? byLabel['integration_haiku_repair'].fires : 0);
    var condFires = arr.filter(function (g) { return g.cat === 'conditional repair'; }).reduce(function (n, g) { return n + g.fires; }, 0);
    var storyIds = {}; rows.forEach(function (e) { if (e.storyId) storyIds[e.storyId] = 1; });
    var nStories = Object.keys(storyIds).length || 1;
    var mode = _hostMode();

    console.log('%c═══ HAIKU FIRE REPORT ═══', 'color:#c9a24e;font-weight:bold');
    console.log('host=' + mode.host + ' · ' + (mode.isLocal ? 'LOCAL/DEV (audits @ 100%)' : 'PROD-like (audits @ ' + (mode.auditSampleRate * 100) + '%)')
      + ' · stories seen=' + nStories + ' · scenes (per-scene-repair fires)=' + sceneFires);
    console.table(arr.map(function (g) {
      return {
        callsite: g.label,
        category: g.cat,
        fires: g.fires,
        'per_scene': sceneFires ? (g.fires / sceneFires).toFixed(2) : '—',
        in_tok: g.inTok,
        out_tok: g.outTok,
        cache_rd: g.cacheRead,
        '$_total': '$' + g.cost.toFixed(4),
        '$_per_fire': '$' + (g.cost / g.fires).toFixed(4),
        shipped: g.shipped === null ? '?' : (g.shipped ? 'Y' : 'N (telemetry)'),
        conditional: g.cond ? 'Y' : '',
        fails: g.fail || ''
      };
    }));

    var top = arr.slice(0, 3).map(function (g) { return g.label + ' $' + g.cost.toFixed(4) + ' (' + (total.cost ? Math.round(100 * g.cost / total.cost) : 0) + '%)'; });
    console.log('TOTAL Haiku: ' + total.fires + ' fires · $' + total.cost.toFixed(4)
      + (nStories ? ' · $' + (total.cost / nStories).toFixed(4) + '/story' : ''));
    console.log('ROW-2 conditional-repair trip rate: ' + condFires + ' fires / ' + sceneFires + ' scenes = '
      + (sceneFires ? (condFires / sceneFires).toFixed(2) + ' per scene' : 'n/a (no scenes yet)'));
    console.log('TOP SPEND: ' + (top.join('  ·  ') || '—'));
    var unk = arr.filter(function (g) { return g.cat === 'unknown'; });
    if (unk.length) console.warn('[HAIKU-FIRE] ' + unk.length + ' unknown callsite(s) — refine FN_RULES with their top frames:', unk.map(function (g) { return g.label; }));

    return { total: total, byLabel: arr, sceneFires: sceneFires, condTripRate: sceneFires ? condFires / sceneFires : null, nStories: nStories, mode: mode };
  };

  console.log('[HAIKU-FIRE] counter installed. Play, then run window._haikuFireReport(). Reset with window._haikuFireReset().');
})();
