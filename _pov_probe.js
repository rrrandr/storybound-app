// POV PROBE (Roman 2026-07-23) — generate ONE literary Scene 1 in each of 4th & 5th person,
// capture the prose + the app's own [4thPerson]/[5thPerson] validator console output, dump for
// _pov_audit.js. CHEAP: 2 Scene-1 gens (no continuation unless CONTINUE=1). Requires localhost:3000.
//   node _pov_probe.js            → /tmp/pov_probe.json   (2 scenes)
//   BASELINE=1 node _pov_probe.js → same, label as baseline
const { chromium } = require('playwright-core');
const fs = require('fs');
// RATE CHECK (Roman 2026-07-24): 8 VARIED plots (dynamic × archetype × POV × LI-gender), all
// billionaire world (robust). Variety across plots + stochastic aPlot gen → a real transform RATE,
// not a 2-scene spot check. Natural classifier (Option A forces disabled in setup).
const MODES = [
  { key:'r1', povMode:'author5th',      pick:'Fifth',  dynamic:'enemies_to_lovers', arch:'DARK_VICE',      li:'Male',   label:'5th·enemies·DarkVice' },
  { key:'r2', povMode:'environment4th', pick:'Fourth', dynamic:'second_chance',     arch:'BEAUTIFUL_RUIN', li:'Male',   label:'4th·2ndchance·Ruin' },
  { key:'r3', povMode:'author5th',      pick:'Fifth',  dynamic:'forbidden_love',    arch:'DARK_VICE',      li:'Male',   label:'5th·forbidden·DarkVice' },
  { key:'r4', povMode:'environment4th', pick:'Fourth', dynamic:'slow_burn',         arch:'BEAUTIFUL_RUIN', li:'Female', label:'4th·slowburn·Ruin' },
  { key:'r5', povMode:'author5th',      pick:'Fifth',  dynamic:'second_chance',     arch:'DARK_VICE',      li:'Male',   label:'5th·2ndchance·DarkVice' },
  { key:'r6', povMode:'environment4th', pick:'Fourth', dynamic:'enemies_to_lovers', arch:'BEAUTIFUL_RUIN', li:'Male',   label:'4th·enemies·Ruin' },
  { key:'r7', povMode:'author5th',      pick:'Fifth',  dynamic:'slow_burn',         arch:'DARK_VICE',      li:'Female', label:'5th·slowburn·DarkVice' },
  { key:'r8', povMode:'environment4th', pick:'Fourth', dynamic:'forbidden_love',    arch:'DARK_VICE',      li:'Male',   label:'4th·forbidden·DarkVice' }
];
const OUT = process.env.OUT || '/tmp/pov_probe.json';
const log = (...a) => console.error(...a);

// TRANSFORMATION JUDGE (Roman 2026-07-24) — the longitudinal measure tied to the new "earned ending"
// contract, NOT word count. Post-hoc, observational: reads the captured scene, judges whether the
// SITUATION materially changed between first line and last. Touches nothing in generation.
const JUDGE_SYS = 'You are a story-structure analyst. Read this Scene 1 opening. Judge ONLY whether the SITUATION MATERIALLY TRANSFORMED between the first line and the last: by the end, is the protagonist or their circumstances DIFFERENT than at the start — something discovered, a new pressure introduced, an unexpected complication, or an understanding altered — and does the ending decision arise BECAUSE of that change? Or did nothing significant change (only more description / atmosphere / interiority piled up around a static situation)? Be strict: added texture is NOT transformation. Return ONLY JSON: {"transformation":"yes"|"no","opening_state":"<=8 words: where the protagonist/situation starts","ending_state":"<=8 words: where it ends","decision_depends_on_change":"yes"|"no","justification":"one sentence"}';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const scenes = [];
  for (const m of MODES) {
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    const povLogs = [];
    const lenLogs = [];
    const diagLogs = [];   // scaffold / gen / error breadcrumbs — to LOCATE a stall on NO SCENE
    page.on('pageerror', e => diagLogs.push('PAGEERROR: ' + ((e && e.message) || e)));
    page.on('console', c => {
      const t = c.text();
      if (/\b(5thPerson|4thPerson|FateVoice|LoveInterestPOV|POV-PROBE|POV_REGIME|env4|pov-4th)\b/i.test(t)) povLogs.push(t.slice(0, 260));
      // length/temperature telemetry — the exact production path (classifier → temp → range → profile)
      if (/SCENE1:LENGTH-GUIDANCE|OPENING:TEMP|SCENE1:FF-LENGTH-FLOOR|HOTFAST|SCENE1:PROMPT-SIZES|DECK_MANDATE|SCENE1-FRAME|SCENE-FRAME|STATE_CHANGE:MARKER/i.test(t)) lenLogs.push(t.slice(0, 260));
      // stall breadcrumbs: scaffold pre-pass, gen milestones, errors
      if (/SCAFFOLD|SCENE1:|BEGIN-ERR|\berror\b|\bERR\b|\bfail|throw|unhandled|timeout|abort|\[GEN|callChat/i.test(t)) diagLogs.push(t.slice(0, 200));
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(500);
    await page.evaluate((cfg) => {
      window.__scenes = [];
      window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
      ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
      const s = window.state; window._devBypass = true; window._forceAudits = true;
      // OPTION A (Roman 2026-07-24): disable the two ARTIFICIAL HOT forces so the PRODUCTION
      // temperature classifier actually runs — (1) the localhost dev override, (2) the billionaire-
      // onboarding force. Everything else identical (deck mandate uses a separate counter, stays ON).
      // (1) dev override is read as window._forceHotOpener — settable directly:
      window._forceHotOpener = false;
      // (2) onboarding is an INTERNAL local-binding call (window override is ignored), so defeat it
      // at its DATA SOURCE: it returns onboarding=true while localStorage.sb_flavor_history[key] < 2.
      // Seeded below AFTER worldSubtype is set (the key derives from it).
      s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
      s.picks = s.picks || {};
      s.picks.world = 'billionaire'; s.world = 'billionaire'; s.picks.flavor = 'billionaire_modern'; s.worldSubtype = 'billionaire_modern'; s.flavor = 'billionaire_modern';
      s.picks.dynamic = cfg.dynamic; s.dynamic = cfg.dynamic;
      s.loveInterest = cfg.li; s.loveInterestName = 'Dorian'; s.liGender = (cfg.li === 'Female' ? 'female' : 'male');
      s.archetype = { primary: cfg.arch, modifier: null, bound: false };
      s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
      s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Dorian';
      s.identity = { playerName: 'Mara', partnerName: 'Dorian', displayPlayerName: 'Mara', displayPartnerName: 'Dorian' };
      s.picks.identity = s.identity;
      try { var pIn = document.getElementById('playerNameInput'); if (pIn) pIn.value = 'Mara'; var lIn = document.getElementById('partnerNameInput'); if (lIn) lIn.value = 'Dorian'; } catch (_) {}
      s._pcLookSkipped = true; s.pcLookLocked = true;
      s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
      // THE POV UNDER TEST — set both the picks string and the derived flag (syncPovDerivedFlags isn't exposed).
      s.picks.pov = cfg.pick; s.povMode = cfg.povMode;
      s.turnCount = 0;
      // Seed flavor history so _isBillionaireOnboarding() returns FALSE (returning-user state) →
      // no onboarding HOT force → classifier rolls naturally. Compute the exact key from live state.
      try {
        var _fk = (typeof window._flavorVarietyKey === 'function') ? window._flavorVarietyKey(s) : null;
        var _hist = {};
        if (_fk) _hist[_fk] = ['seed1', 'seed2', 'seed3'];
        // defensive: also seed the raw normalized subtype in case the key differs
        _hist['billionairemodern'] = ['seed1', 'seed2', 'seed3'];
        localStorage.setItem('sb_flavor_history', JSON.stringify(_hist));
        console.log('[POV-PROBE] seeded sb_flavor_history key=' + _fk + ' → onboarding=' + (typeof window._isBillionaireOnboarding === 'function' ? window._isBillionaireOnboarding(s) : '?'));
      } catch (_) {}
      try { console.log('[POV-PROBE] povMode=' + s.povMode + ' picks.pov=' + s.picks.pov); } catch (_) {}
    }, m);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    const t0 = Date.now(); let text = null; let lastSt = null;
    while (Date.now() - t0 < 240000) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length, flags: { adv: !!s._isAdvancingScene, sub: !!s._stagedSubmitting, awaiting: !!s._stagedAwaitingProse } }; });
      lastSt = st;
      // grab prose as soon as it exists — even if a busy flag stays stuck (grace after 45s), so a
      // stuck _stagedAwaitingProse can't masquerade as NO SCENE
      if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 45000)) { text = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
    }
    // LENGTH VALIDATION INSTRUMENTATION (Roman 2026-07-24) — read the production values the
    // classifier→temperature→range→profile chain actually produced, so a short result is
    // self-diagnosing (classifier chose X · range was Y · profile Z · Grok returned N) without a rerun.
    const lenMeta = await page.evaluate(() => {
      const s = window.state || {};
      const r = s._targetSceneLengthRange || null;
      const temp = s._openingTemperature || null;
      return {
        openingTemperature: temp,
        targetRangeMin: r ? r.minWords : null,
        targetRangeMax: r ? r.maxWords : null,
        // the profile the CALLER selected (mirrors app.js: HOT_CRISIS → hot, else reflective)
        directiveProfile: temp === 'HOT_CRISIS' ? 'hot' : 'reflective',
        // completion signal: the mandated deck closer the scene must end on (the "scene over" terminus)
        mandatedCloser: s._sceneOneMandatedCloser || null,
        // the PLANNED state_change (Scene-1 IR) — to check manually if it's consequential vs merely present
        scene1Compressed: (s.aPlot && s.aPlot.scene1Compressed) || null
      };
    });
    const cleanText = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = (cleanText.match(/\b[\w']+\b/g) || []).length;
    // Post-hoc transformation judge (the primary success measure — situation change, not word count).
    let transformation = null;
    if (text && cleanText) {
      transformation = await page.evaluate(async (payload) => {
        try {
          const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const j = await r.json();
          const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || (j && j.content) || '';
          let o = null; try { o = JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) {}
          return o || { raw: String(c).slice(0, 300) };
        } catch (e) { return { error: String((e && e.message) || e) }; }
      }, { messages: [{ role: 'system', content: JUDGE_SYS }, { role: 'user', content: cleanText.slice(0, 6000) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 300 });
    }
    const povMode = await page.evaluate(() => window.state.povMode);
    scenes.push({ povMode, label: m.label, text: cleanText, wordCount, ...lenMeta, transformation, lengthTelemetry: lenLogs, diag: diagLogs, lastState: lastSt, appPovVerdicts: povLogs });
    const inRange = (lenMeta.targetRangeMin != null && wordCount >= lenMeta.targetRangeMin && wordCount <= lenMeta.targetRangeMax);
    log('[' + m.key + '] words=' + wordCount + ' · temp=' + lenMeta.openingTemperature + ' · range=' + lenMeta.targetRangeMin + '-' + lenMeta.targetRangeMax + ' · profile=' + lenMeta.directiveProfile + ' · IN-RANGE=' + inRange + (wordCount && lenMeta.targetRangeMin && wordCount < lenMeta.targetRangeMin ? ' ⚠ UNDER FLOOR' : '') + (text ? '' : ' · NO SCENE'));
    if (transformation) log('   TRANSFORMED=' + (transformation.transformation || transformation.raw || transformation.error || '?') + (transformation.opening_state ? ' | ' + transformation.opening_state + ' → ' + transformation.ending_state : '') + (transformation.justification ? ' | ' + transformation.justification : ''));
    if (!text) { log('   NO-SCENE last busy-state: ' + JSON.stringify(lastSt) + '  · last diag breadcrumbs: ' + JSON.stringify(diagLogs.slice(-8))); }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ scenes }, null, 1));

  // ═══ SCORECARD (Roman 2026-07-24 rate check) ═══
  const rows = scenes.map(s => ({
    label: s.label || s.povMode,
    slot: (s.lengthTelemetry || []).some(l => /STATE_CHANGE:MARKER\] rendered=true/.test(l)),
    slotDropped: (s.lengthTelemetry || []).some(l => /STATE_CHANGE:MARKER\] rendered=false/.test(l)),
    transformed: !!(s.transformation && s.transformation.transformation === 'yes'),
    dep: !!(s.transformation && s.transformation.decision_depends_on_change === 'yes'),
    forces: !!(s.scene1Compressed && s.scene1Compressed.forces_choice),
    words: s.wordCount || 0,
    temp: s.openingTemperature,
    gotScene: !!(s.text && s.text.length > 200)
  }));
  const n = rows.length, made = rows.filter(r => r.gotScene);
  const nm = made.length || 1;
  const sum = f => made.filter(f).length;
  log('\n═══════════════ SCORECARD (' + made.length + '/' + n + ' scenes generated) ═══════════════');
  rows.forEach(r => log('  ' + (!r.gotScene ? '⚠ NO-SCENE' : (r.transformed ? '✅' : '❌')) + ' ' + r.label.padEnd(26) + ' slot=' + (r.slot ? 'Y' : (r.slotDropped ? 'DROP' : '-')) + ' transformed=' + (r.transformed ? 'Y' : 'N') + ' dep=' + (r.dep ? 'Y' : 'N') + ' forces=' + (r.forces ? 'Y' : 'N') + ' words=' + r.words + ' temp=' + (r.temp || '?')));
  log('  ────────── rates (of ' + made.length + ' generated) ──────────');
  log('  slot rendered mid-scene: ' + sum(r => r.slot) + '/' + made.length);
  log('  TRANSFORMED:             ' + sum(r => r.transformed) + '/' + made.length);
  log('  decision-dependent:      ' + sum(r => r.dep) + '/' + made.length);
  log('  forces_choice present:   ' + sum(r => r.forces) + '/' + made.length);
  log('  avg words:               ' + Math.round(made.reduce((a, r) => a + r.words, 0) / nm));
  const failNoSlot = made.filter(r => !r.slot && !r.transformed).length;
  const failWeakEvent = made.filter(r => r.slot && !r.transformed).length;
  log('  ── failure split ── slot-dropped-fails=' + failNoSlot + ' · slot-rendered-but-weak-event=' + failWeakEvent);
  log('\nWROTE ' + OUT + '  → score with: node _pov_audit.js ' + OUT);
})().catch(e => { console.error('PROBE-ERR', e.message); process.exit(1); });
