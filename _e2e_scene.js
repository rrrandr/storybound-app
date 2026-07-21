// BOUNDED E2E PROBE — one real Scene 1 of a Fatelands/Kwisheen story through the ACTUAL
// generator (_runCGScreenplayGen): real prose author + real _renderStagedPhaseImage (anchors
// auto-attached). COSTS REAL $ (body bibles + scaffold + author + a few renders, ~$0.3–0.8).
// Funnel bypass ON so the session's fixes reach the model. Captures prose + phase images.
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/e2e';

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => { const t = m.text(); if (/\[CG:SCREENPLAY|\[CG:SCAFFOLD|\[STAGED:|\[CASTING|\[STORYBOARD|\[CANON-REPAIR|\[ANATOMY-REPAIR|\[VERIFY\]|SCENE-CASE|status":"(SUCCESS|FAIL)|\[Gemini\] Error|FAVORED-SHIFT|SPECIES BY CHARACTER|author=|Generation failed/i.test(t)) console.error('  >', t.slice(0, 200)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._runCGScreenplayGen === 'function', { timeout: 40000 });

  const res = await page.evaluate(async () => {
    const s = window.state;
    // ── Fatelands / Kwisheen story state (mirrors a fresh init) ──
    s.storyId = 'e2e-kwisheen-1';
    s.picks = {
      world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'fantasy',
      dynamic: 'forbidden', tone: 'Charged', intensity: 'Steamy',
      identity: { playerName: 'Mira', partnerName: 'Vael', displayPlayerName: 'Mira', displayPartnerName: 'Vael' },
      pov: '1st'
    };
    s.povMode = 'normal';
    s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.fantasyRegion = 'gloamwater_bay';
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s.storyLength = 'affair'; s.tier = 'affair';
    s.contentMode = 'explicit';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s.gnArtist = s.gnArtist || 'ender_bond';
    s._pcLookSkipped = true; // dodge the PC-Look modal await (no user in headless)
    window._devBypass = true;
    window._stagedFunnelBypass = true; // fixes reach the model
    window._structuralPass = true; // (A) integration run — sketch→verify→colorize→cosmetic-klein
    window.__cgAuthorTimeoutMs = 180000; // give slow reasoning-model gen more time (providers degraded)

    // ── TWISTING-WISH VALIDATION (Roman 2026-07-18): force the scene's wish to WARP so the regen
    //    validates the RED twisted burst + the non-diegetic composition (characters must NOT react to
    //    it) + the sacrifice shadow-hand. NOTE: _resetStoryState wipes _openFateBargains on a fresh
    //    story, so a bargain injection does NOT survive — the _wishTwisted flag is only ever READ,
    //    never reset, so it DOES survive. Set the flag (precedence-2 override → _sdWishOutcome='twisted').
    s._wishTwisted = true; // precedence-2 override → _sdWishOutcome='twisted'; survives _resetStoryState (never reset)

    // ── COMBAT SCENARIO — a KWISHEEN combatant on-stage so the Many-Tide Method is
    //    actually depicted (prior run drew a human raider; no Kwisheen combat shown).
    //    Also exercises the Klein species-repaint fallback if the raider mis-renders as human.
    s._sceneWant = "survive the Kwisheen raider's Many-Tide assault and keep Vael alive";
    s.currentCrisis = 'a hostile KWISHEEN raider ambushes Mira and Vael in the drowned coral ruins and fights the Many-Tide way: a spear-tentacle threatening high, a cutlass-tentacle hooking low, a long dagger held back for the killing thrust, other tentacles anchoring against the current and controlling terrain — the visible spear is the feint. Vael, herself Kwisheen, answers in kind, tentacle against tentacle in the drift.';
    s.aPlot = { goal: "survive the Kwisheen raider's Many-Tide ambush in the drowned ruins", antagonistOrAntiForce: 'a hostile Kwisheen raider fighting the Many-Tide way (spear-tentacle high, cutlass-tentacle low, a hidden dagger for the killing thrust — no ranged weapons)', namedClock: "before the raider's hidden dagger finds Mira" };

    // ── INSTRUMENT: record per-render anchor decision + prompt markers, in call order ──
    window.__probeRenders = [];
    var _origGen = window.generateImageWithFallback;
    window.generateImageWithFallback = function (opts) {
      try {
        var anchors = (window._gnSpeciesAnchorPaths || []).map(function (a) { return String((a && a.path) || a); });
        var pr = (opts && opts.prompt) || '';
        // only record the hero phase renders (context 'visualize', scene intent), skip closeups/mutations
        window.__probeRenders.push({
          ctx: (opts && opts.context) || '',
          intent: (opts && opts.intent) || '',
          kwisheenAnchor: anchors.some(function (a) { return /Kwisheen/i.test(a); }),
          anchorFiles: anchors.map(function (a) { return a.split('/').pop(); }),
          allHumanClarifier: /human legs \(NOT tentacles\)/.test(pr),
          speciesByChar: /render each character in their OWN species/.test(pr)
        });
      } catch (_) {}
      return _origGen.apply(this, arguments);
    };

    var err = null;
    try {
      // Full commit+render path (prose→state.scenes, phase images→_stagedHeroCache).
      var gen = window._completeStagedSceneFromScreenplay(0, '', '');
      await Promise.race([gen, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('gen timeout 540s')); }, 540000); })]);
    } catch (e) { err = e && e.message; }
    // Closeups render INSIDE phaseImagesPromise.then(...) — they only START once ALL phase images
    // finish, and gen resolves after just firstReady. A fixed wait races the phase renders and
    // captures 0 closeups. Poll until the plan's cut_to_closeup beats have all landed (or a cap).
    var _expectCuts = 0;
    try { var _pl0 = s._stagedActive && s._stagedActive.plan; if (_pl0 && Array.isArray(_pl0.beats)) _expectCuts = _pl0.beats.filter(function (b) { return b && b.cut_to_closeup; }).length; } catch (_) {}
    if (_expectCuts === 0) {
      await new Promise(function (r) { setTimeout(r, 45000); }); // no cuts queued (or plan not ready) — base settle
    } else {
      var _pollStart = Date.now(), _pollCap = 200000, _cuNow = 0;
      while (Date.now() - _pollStart < _pollCap) {
        try { var _cu = s._stagedActive && s._stagedActive.beatCloseupUrls; _cuNow = _cu ? Object.keys(_cu).filter(function (k) { return String(_cu[k] || '').startsWith('data:'); }).length : 0; } catch (_) {}
        if (_cuNow >= _expectCuts) break; // all queued closeups have rendered
        await new Promise(function (r) { setTimeout(r, 2000); });
      }
      await new Promise(function (r) { setTimeout(r, 3000); }); // brief settle after the last one lands
    }

    var prose = (s.scenes && s.scenes[0] && s.scenes[0].text) || '';
    var imgs = [];
    var seen = {};
    function pushImg(u) { if (u && String(u).startsWith('data:') && !seen[u]) { seen[u] = 1; imgs.push(u); } }
    try { Object.keys(s._stagedHeroCache || {}).forEach(function (k) { pushImg(s._stagedHeroCache[k] && s._stagedHeroCache[k].imageUrl); }); } catch (_) {}
    try { var pu = s._stagedActive && s._stagedActive.phaseImageUrls; if (pu) Object.keys(pu).forEach(function (k) { pushImg(pu[k]); }); } catch (_) {}
    var heroImgCount = imgs.length;
    var expectedCuts = 0;
    try { var _plc = s._stagedActive && s._stagedActive.plan; if (_plc && Array.isArray(_plc.beats)) expectedCuts = _plc.beats.filter(function (b) { return b && b.cut_to_closeup; }).length; } catch (_) {}
    var closeups = [];
    try { var cu = s._stagedActive && s._stagedActive.beatCloseupUrls; if (cu) Object.keys(cu).forEach(function (k) { var u = cu[k]; if (u && String(u).startsWith('data:')) closeups.push(u); }); } catch (_) {}
    // Per-phase plan metadata (whose species, LI visibility) for correlating with renders.
    var phaseMeta = [];
    try {
      var _plan = s._stagedActive && s._stagedActive.plan;
      if (_plan && Array.isArray(_plan.phases)) _plan.phases.forEach(function (ph) {
        phaseMeta.push({ phaseIdx: ph.phaseIdx, li_visibility_phase: ph.li_visibility_phase || null,
          characters_present: ph.characters_present || [], label: ph.label || '' });
      });
    } catch (_) {}
    var heroRenders = (window.__probeRenders || []).filter(function (r) { return r.intent === 'scene' && r.ctx === 'visualize'; });

    // Plan-derived evidence: beat count, the Scene-1 axis micro-decision, wardrobe grounding.
    var beatCount = 0, microDecision = null, wardrobe = null, bespokeAxis = '';
    try {
      var _plan = s._stagedActive && s._stagedActive.plan;
      if (_plan) {
        beatCount = Array.isArray(_plan.beats) ? _plan.beats.length : 0;
        var _md = _plan.microDecision || null;
        if (!_md && Array.isArray(_plan.beats)) { for (var i = 0; i < _plan.beats.length; i++) { if (_plan.beats[i] && _plan.beats[i].microDecision) { _md = _plan.beats[i].microDecision; break; } } }
        if (_md) microDecision = { prompt: _md.prompt || '', options: (_md.options || []).map(function (o) { return { text: o.text, signal: o.signal }; }) };
        var _vs = _plan.visualState || {};
        wardrobe = { pc: _vs.pc_wardrobe || '', li: _vs.li_wardrobe || '',
          others: (_vs.other_characters_present || []).map(function (o) { return { name: o.name, wardrobe: o.wardrobe || '', species: o.species || '' }; }) };
      }
      bespokeAxis = String(s._bespokeScene1Axis || '');
    } catch (_) {}

    return { err: err, proseLen: prose.length, prose: prose, imgCount: imgs.length, imgs: imgs,
             liSpecies: s._liSpecies, region: s.fantasyRegion, author: s._lastCGAuthor || null,
             hasStagedActive: !!s._stagedActive, heroCacheKeys: Object.keys(s._stagedHeroCache || {}).length,
             phaseMeta: phaseMeta, heroRenders: heroRenders, allRenders: window.__probeRenders || [],
             beatCount: beatCount, microDecision: microDecision, wardrobe: wardrobe, bespokeAxis: bespokeAxis,
             heroImgCount: heroImgCount, closeups: closeups, closeupCount: closeups.length, expectedCuts: expectedCuts,
             kwLock: (function () { try { return s.kwisheenAppearance || {}; } catch (_) { return {}; } })(),
             canonRepairLog: (function () { try { return window._canonRepairLog || []; } catch (_) { return []; } })(),
             pipelineTrace: (function () { try { return window._pipelineTrace || []; } catch (_) { return []; } })() };
  });

  console.log('\n  E2E SCENE 1 — Fatelands / Kwisheen');
  console.log('  ' + '─'.repeat(60));
  console.log('  error: ' + (res.err || 'none'));
  console.log('  prose length: ' + res.proseLen + ' chars | author: ' + res.author);
  console.log('  stagedActive: ' + res.hasStagedActive + ' | heroCache keys: ' + res.heroCacheKeys);
  console.log('  hero phase images: ' + res.heroImgCount + ' | closeup inserts: ' + res.closeupCount + '/' + res.expectedCuts + ' queued | total: ' + (res.heroImgCount + res.closeupCount));
  console.log('  kwisheen appearance lock: ' + JSON.stringify(res.kwLock || {}));
  (res.closeups || []).forEach(function (u, i) { try { require('fs').writeFileSync(OUTDIR + '/scene1_closeup' + i + '.png', Buffer.from(String(u).split(',')[1], 'base64')); } catch (_) {} });
  console.log('  images captured (hero): ' + res.imgCount);
  console.log('  ── phase plan ──');
  (res.phaseMeta || []).forEach(function (p) { console.log('    phase ' + p.phaseIdx + ': li=' + p.li_visibility_phase + ' | chars=[' + (p.characters_present || []).join(',') + '] | ' + p.label); });
  console.log('  ── hero renders (anchor decision) ──');
  (res.heroRenders || []).forEach(function (r, i) { console.log('    render ' + i + ': kwisheenAnchor=' + r.kwisheenAnchor + ' allHumanClarifier=' + r.allHumanClarifier + ' speciesByChar=' + r.speciesByChar + ' | anchors=[' + r.anchorFiles.join(',') + ']'); });
  console.log('  ── beat count: ' + res.beatCount + ' (target 20–30, floor 18) ──');
  console.log('  ── scene-1 axis ──');
  console.log('    bespokeAxis: ' + (res.bespokeAxis || '(none)'));
  if (res.microDecision) { console.log('    microDecision.prompt: ' + res.microDecision.prompt); (res.microDecision.options || []).forEach(function (o) { console.log('      • "' + o.text + '" signal=' + o.signal); }); }
  else { console.log('    microDecision: (none emitted)'); }
  console.log('  ── wardrobe grounding ──');
  if (res.wardrobe) {
    console.log('    pc_wardrobe: ' + (res.wardrobe.pc || '(BLANK — would default to artist ref)'));
    console.log('    li_wardrobe: ' + (res.wardrobe.li || '(blank/absent)'));
    (res.wardrobe.others || []).forEach(function (o) { console.log('    ' + o.name + ' [' + o.species + ']: ' + (o.wardrobe || '(blank)')); });
  }
  fs.writeFileSync(path.join(OUTDIR, 'scene1_prose.txt'), res.prose || '(empty)');
  var saved = 0;
  (res.imgs || []).forEach(function (u, i) {
    try { if (String(u).startsWith('data:')) { fs.writeFileSync(path.join(OUTDIR, 'scene1_img' + i + '.png'), Buffer.from(String(u).split(',')[1], 'base64')); saved++; } } catch (_) {}
  });
  console.log('  saved: ' + saved + ' images + prose → ' + OUTDIR);

  // ── CANON-REPAIR SCORECARD (Klein canon-conformance) ─────────────────────────
  var log = res.canonRepairLog || [];
  console.log('  ── canon-repair scorecard ──');
  if (!log.length) {
    console.log('    no defects detected this scene (verifier passed every panel, or canon absent)');
  } else {
    // Per-panel breakdown.
    var byPhase = {};
    log.forEach(function (e) { var p = (e.phase == null ? -1 : e.phase); (byPhase[p] = byPhase[p] || []).push(e); });
    Object.keys(byPhase).map(Number).sort(function (a, b) { return a - b; }).forEach(function (p) {
      var es = byPhase[p];
      var repaired = es.filter(function (e) { return e.outcome === 'repaired'; });
      var reported = es.filter(function (e) { return e.outcome !== 'repaired'; });
      var line = '    panel ' + p + ': ' + (repaired.length ? 'repaired [' + repaired.map(function (e) { return e.type + (e.character ? ':' + e.character : ''); }).join(', ') + ']' : 'no repairs');
      if (reported.length) line += ' | reported-only [' + reported.map(function (e) { return e.type + '(' + e.outcome + ')'; }).join(', ') + ']';
      var maxP1 = Math.max.apply(null, es.map(function (e) { return e.p1_count || 0; }));
      if (maxP1 > 1) line += ' | ⚠ ' + maxP1 + ' P1 defects (regen-budget signal)';
      console.log(line);
    });
    // Totals + repairs-per-panel.
    var totalRepairs = log.filter(function (e) { return e.outcome === 'repaired'; }).length;
    var panels = res.heroImgCount || Object.keys(byPhase).length || 1;
    console.log('    ── totals ── repairs=' + totalRepairs + ' across ' + panels + ' panels = ' + (totalRepairs / panels).toFixed(2) + ' repairs/panel (goal: → 0 as upstream conditioning improves)');
    // Oscillation: the SAME defect type+character recurring on ≥2 panels = generator fighting Klein.
    var sig = {};
    log.filter(function (e) { return e.outcome === 'repaired'; }).forEach(function (e) { var k = e.type + '|' + (e.character || '?'); (sig[k] = sig[k] || new Set()).add(e.phase); });
    var osc = Object.keys(sig).filter(function (k) { return sig[k].size >= 2; });
    if (osc.length) {
      console.log('    ⚠ OSCILLATION — same defect repaired on multiple panels (needs UPSTREAM fix, not permanent downstream correction):');
      osc.forEach(function (k) { console.log('        ' + k + ' → panels ' + Array.from(sig[k]).sort().join(', ')); });
    } else {
      console.log('    ✓ no oscillation — no single defect recurred across panels');
    }
  }

  // ── STRUCTURAL-PASS INTEGRATION TRACE + DASHBOARD (A / verifier calibration) ──
  // Classify each rejected-sketch reason: REAL structural (bad generation) vs VERIFIER DISAGREEMENT
  // (calibration noise — count/shape/detail the structural stage shouldn't judge). Distinguishes
  // "paying for retries because of bad generation" from "verifier asking the wrong question".
  var STRUCT_RX = /\bleg|feet|knee|tail|mermaid|contaminat|human.*(scale|tentacle)|(scale|tentacle).*human|extra.*(arm|limb)|too many|manipulator arm|missing.*(arm|limb)|mass of tentacles|no mantle|octopus-head|wrong species|figure count|person count/i;
  var CALIB_RX = /\bcount|number of|about (six|two)|\d+ ?(tentacle|arm)|tentacle.{0,14}(shape|curl|number)|pupil|mane|scalp|facial detail|hair texture|skin pattern|capsule/i;
  function classify(reasons) {
    var struct = [], calib = [];
    (reasons || []).forEach(function (r) { if (STRUCT_RX.test(r)) struct.push(r); else if (CALIB_RX.test(r)) calib.push(r); else struct.push(r); });
    return { struct: struct, calib: calib };
  }
  var trace = res.pipelineTrace || [];
  console.log('  ── structural-pass integration trace ──');
  if (!trace.length) {
    console.log('    (no structural-pass panels — flag off, or all panels fell back to one-shot)');
  } else {
    trace.forEach(function (t) { t._c = classify(t.structural.defects); });
    trace.sort(function (a, b) { return a.phase - b.phase; }).forEach(function (t) {
      console.log('    panel ' + t.phase + ':');
      console.log('      sketch accepted: ' + (t.structural.resolved ? 'attempt ' + t.structural.attempts : 'NEVER (best-of-' + t.structural.attempts + ')') +
        ' | final structurally clean: ' + (t.structuralEntropy === 0 ? 'yes ✓' : 'NO ⚠'));
      if (t._c.struct.length) console.log('      REAL structural (bad generation): ' + t._c.struct.slice(0, 3).join(' / '));
      if (t._c.calib.length) console.log('      VERIFIER DISAGREEMENT (calibration noise): ' + t._c.calib.slice(0, 3).join(' / '));
      console.log('      colorize: ' + t.colorize.count + ' (recolorize ' + t.colorize.recolorize + ') | contract: ' + t.colorize.contract +
        ' | entropy: ' + (t.entropyStatus === 'measured' ? (t.structuralEntropy + ' (measured)' + (t.structuralEntropy === 0 ? ' ✓' : ' ⚠')) : 'unknown (' + t.entropyStatus + ')'));
      console.log('      cosmetic: defects [' + (t.cosmetic.defects.join(', ') || 'none') + '] → Klein repaired [' + (t.cosmetic.kleinRepairs.join(', ') || 'none') + ']');
      console.log('      calls: lineart ' + t.calls.lineart + ' / structVerify ' + t.calls.structVerify + ' / colorize ' + t.calls.colorize +
        ' | ms total ' + (t.ms.total || 0));
    });
    var n = trace.length, sum = function (f) { return trace.reduce(function (a, t) { return a + f(t); }, 0); };
    var avg = function (f) { return (sum(f) / n).toFixed(2); };
    var needKlein = sum(function (t) { return t.cosmetic.kleinRepairs.length > 0 ? 1 : 0; });
    var needRetry = sum(function (t) { return t.structural.attempts > 1 ? 1 : 0; });
    var needRecolor = sum(function (t) { return t.colorize.recolorize > 0 ? 1 : 0; });
    var cleanThrough = sum(function (t) { return (t.structural.attempts === 1 && t.colorize.recolorize === 0 && t.cosmetic.kleinRepairs.length === 0) ? 1 : 0; });
    console.log('  ── DASHBOARD (baseline, n=' + n + ' panels) ──');
    console.log('    sketch accepted 1st try:       ' + sum(function (t) { return (t.structural.resolved && t.structural.attempts === 1) ? 1 : 0; }) + '/' + n);
    console.log('    sketch accepted (ever):        ' + sum(function (t) { return t.structural.resolved ? 1 : 0; }) + '/' + n);
    console.log('    structural entropy:            measured-0 ' + sum(function (t) { return (t.entropyStatus === 'measured' && t.structuralEntropy === 0) ? 1 : 0; }) +
      ' | >0 ' + sum(function (t) { return (t.entropyStatus === 'measured' && t.structuralEntropy > 0) ? 1 : 0; }) +
      ' | unknown ' + sum(function (t) { return t.entropyStatus !== 'measured' ? 1 : 0; }) + '  (never assume 0)');
    console.log('    avg structural retries/panel:  ' + avg(function (t) { return t.structural.attempts - 1; }));
    console.log('    avg REAL-structural flags/pnl: ' + avg(function (t) { return t._c.struct.length; }) + '  ← bad generation');
    console.log('    avg VERIFIER-DISAGREE flags/pnl: ' + avg(function (t) { return t._c.calib.length; }) + '  ← calibration (target → 0)');
    console.log('  ── REPAIR AVOIDANCE (the metric being optimized — fewer panels need any repair) ──');
    console.log('    needed structural retry:       ' + needRetry + '/' + n);
    console.log('    needed recolorize:             ' + needRecolor + '/' + n);
    console.log('    needed Klein:                  ' + needKlein + '/' + n);
    console.log('    clean through (no repair):     ' + cleanThrough + '/' + n + '  ← repair-avoidance rate ' + (100 * cleanThrough / n).toFixed(0) + '%');
    console.log('    avg image-calls/panel (cost):  ' + avg(function (t) { return t.calls.lineart + t.calls.colorize; }) + ' render + ' + avg(function (t) { return t.calls.structVerify; }) + ' verify');
    console.log('    avg total ms/panel:            ' + avg(function (t) { return t.ms.total || 0; }));
  }
  console.log('  ' + '─'.repeat(60) + '\n');
  await browser.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
