// BOUNDED E2E PROBE — one real Scene 1 of a Fatelands/Kwisheen story through the ACTUAL
// generator (_runCGScreenplayGen): real prose author + real _renderStagedPhaseImage (anchors
// auto-attached). COSTS REAL $ (body bibles + scaffold + author + a few renders, ~$0.3–0.8).
// Funnel bypass ON so the session's fixes reach the model. Captures prose + phase images.
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/e2e';

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => { const t = m.text(); if (/\[CG:SCREENPLAY|\[CG:SCAFFOLD|\[STAGED:|SCENE-CASE|status":"(SUCCESS|FAIL)|\[Gemini\] Error|FAVORED-SHIFT|SPECIES BY CHARACTER|author=|Generation failed/i.test(t)) console.error('  >', t.slice(0, 150)); });
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
      await Promise.race([gen, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('gen timeout 360s')); }, 360000); })]);
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
             kwLock: (function () { try { return s.kwisheenAppearance || {}; } catch (_) { return {}; } })() };
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
  console.log('  ' + '─'.repeat(60) + '\n');
  await browser.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
