// SHEET DEFECT-DISTRIBUTION BATCH (Phase 1 of the failure-isolation experiment).
// Runs the validated Kwisheen combat scene's screenplay ONCE, then RE-RENDERS the same one-shot sheet N times
// (fixed visualState+phases) to isolate RENDER variance. Emits N full 2x2 sheets for defect categorization —
// the base rate + per-class distribution + the load-bearing LOCALIZED:STRUCTURAL ratio. ~N×$0.15 + one scene.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/sheet_defect_batch3';
const N = parseInt(process.env.N || '8', 10);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('console', m => { const t = m.text(); if (/\[ONESHOT\]|species anatomy anchor|canonical asset|\[STAGED:RENDER\] Phase images|Generation failed/i.test(t)) console.error('  >', t.slice(0, 150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._completeStagedSceneFromScreenplay === 'function' && typeof window._renderOneShotSheet === 'function', { timeout: 40000 });

  console.log('SHEET DEFECT BATCH — Kwisheen combat, N=' + N + ' renders of the same sheet');
  const res = await p.evaluate(async ({ N }) => {
    const s = window.state;
    s.storyId = 'e2e-kwisheen-batch';
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'fantasy',
      dynamic: 'forbidden', tone: 'Charged', intensity: 'Steamy',
      identity: { playerName: 'Mira', partnerName: 'Vael', displayPlayerName: 'Mira', displayPartnerName: 'Vael' }, pov: '1st' };
    s.povMode = 'normal'; s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.fantasyRegion = 'gloamwater_bay'; s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen'; s.storyLength = 'affair'; s.tier = 'affair';
    s.contentMode = 'explicit'; s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = []; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s.gnArtist = s.gnArtist || 'ender_bond'; s._pcLookSkipped = true;
    window._devBypass = true; window._stagedFunnelBypass = true;
    window._structuralPass = false; window._oneShotSheet = true; window.__cgAuthorTimeoutMs = 180000;
    s._wishTwisted = true;
    s._sceneWant = "survive the tentacled Kwisheen raider's Many-Tide assault";
    s.currentCrisis = 'a hostile tentacle-bodied KWISHEEN raider — humanoid torso, coral-dreadlock hair, six lower tentacles, capsule-pupil eyes — ambushes Mira in the drowned coral ruins and fights the Many-Tide way: a spear-tentacle high, a cutlass-tentacle low, a long dagger held back for the killing thrust. The raider is unmistakably a Kwisheen, close in frame.';
    s.aPlot = { goal: "survive the tentacled Kwisheen raider's Many-Tide ambush", antagonistOrAntiForce: 'a tentacle-bodied Kwisheen raider (coral-dreadlock hair, six lower tentacles, capsule pupils) fighting the Many-Tide way', namedClock: "before the raider's hidden dagger finds Mira" };

    // 1) run the screenplay ONCE → capture a fixed plan (visualState + phases).
    var err = null;
    try {
      var gen = window._completeStagedSceneFromScreenplay(0, '', '');
      await Promise.race([gen, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('gen timeout')); }, 300000); })]);
    } catch (e) { err = e && e.message; }
    var plan = s._stagedActive && s._stagedActive.plan;
    if (!plan || !plan.visualState || !Array.isArray(plan.phases)) return { err: 'no usable plan (' + (err || '') + ')' };

    var sheets = [];
    // the screenplay already rendered sheet #1 — capture it
    try { if (window._lastOneShotSheet && window._lastOneShotSheet.url) sheets.push(window._lastOneShotSheet.url); } catch (_) {}
    // 2) re-render the SAME sheet until we have N
    for (var i = sheets.length; i < N; i++) {
      try {
        window._lastOneShotSheet = null;
        await window._renderOneShotSheet(plan.visualState, plan.phases, 0, plan);
        var u = window._lastOneShotSheet && window._lastOneShotSheet.url;
        sheets.push(u || 'ERR:no-sheet');
      } catch (e) { sheets.push('ERR:' + (e && e.message)); }
    }
    return { err: err, region: s.fantasyRegion, proseLen: (s.scenes && s.scenes[0] && s.scenes[0].text || '').length,
      phaseTypes: plan.phases.map(function (ph) { return ph._readerLearning || ph.label || '?'; }),
      pcWardrobe: (plan.visualState.pc_wardrobe || ''), sheets: sheets };
  }, { N });

  if (res.err && (!res.sheets || !res.sheets.length)) { console.error('FAILED — ' + res.err); await b.close(); process.exit(1); }
  console.log('  scene ok · prose ' + res.proseLen + ' chars · phases [' + (res.phaseTypes || []).join(' → ') + ']');
  console.log('  pc_wardrobe: ' + res.pcWardrobe);
  var saved = 0;
  (res.sheets || []).forEach(function (u, i) {
    if (typeof u === 'string' && u.indexOf('data:') === 0) {
      try { fs.writeFileSync(path.join(OUT, 'sheet' + (i + 1) + '.png'), Buffer.from(u.split(',')[1], 'base64')); saved++; }
      catch (_) {}
    } else { console.warn('  sheet ' + (i + 1) + ': ' + u); }
  });
  console.log('  saved ' + saved + '/' + N + ' sheets → ' + OUT);
  await b.close();
})().catch(function (e) { console.error('BATCH ERROR:', e); process.exit(2); });
