// $0 CAST AUTHORITY (Storyboard v3) — the panel's narrative TYPE owns its cast. A Character Introduction
// is SOLO (only the introduced character), so the renderer cannot collapse it into a two-shot face-off and
// the identity harvest gets a clean frame. Verifies typing, the solo-cast cut, and the hero-prompt roster
// narrowing. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [], logs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { const t = m.text(); if (/\[PANEL-AUTHORITY\]|\[PANEL-SPEC\]/.test(t)) logs.push(t); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildStoryDirector === 'function' && typeof window._buildStagedHeroPrompt === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-cast'; s._playerSpecies = 'human'; s._liSpecies = ''; s._openFateBargains = [];
    const plan = {
      visualState: { background: 'flooded coral ruins', other_characters_present: [{ name: 'Kresh', species: 'kwisheen', position: 'a raider', role: 'antagonist' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kresh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [
        { idx: 0, kind: 'narration', text: 'Kresh corners me against the broken pillars, spear-tentacle raised.' },
        { idx: 1, kind: 'narration', text: 'Behind her the coral seam splits into a hidden passage.' },
        { idx: 2, kind: 'narration', text: '"Fate beneath the turning tide." Kresh voices the wish.' },
        { idx: 3, kind: 'narration', text: 'The coral grows, sealing the passage shut.' },
        { idx: 4, kind: 'narration', text: 'Fight or flee — I have to choose.' }
      ]
    };
    window._buildStoryDirector(plan, 0);

    const panels = plan._panels || [];
    const intro = panels.filter(p => p.narrativePanelType === 'character_introduction');
    const events = panels.filter(p => p.narrativePanelType === 'event');
    const introPanel = intro[0] || null;

    // every panel is typed
    const allTyped = panels.length > 0 && panels.every(p => ['character_introduction', 'event', 'scene'].includes(p.narrativePanelType));
    // exactly one introduction (once-per-issue), and it lines up with the reserved establishing flag
    const oneIntro = intro.length === 1 && introPanel && introPanel.establishing === true;
    // CAST AUTHORITY: the introduction cast is SOLO — one member, the introduced character, NOT the protagonist
    const ck = introPanel ? (introPanel.cast || []).map(c => c.key) : [];
    const soloCast = introPanel && ck.length === 1 && ck[0] !== 'protagonist' && /kresh|raider|kwisheen/.test(ck[0]);
    // a non-introduction panel keeps its full cast (authority narrows ONLY introductions)
    const nonIntro = panels.filter(p => p.narrativePanelType !== 'character_introduction');
    const othersKeepCast = nonIntro.some(p => (p.cast || []).length >= 2);
    // event panels typed where the event is primary
    const eventTyped = events.length >= 1 && events.every(p => p.eventLed === true);

    // PANEL AUTHORITY — the authoritative cast (computed in _resolvePhaseVisualState) must EXCLUDE the
    // protagonist on an introduction, and the hero prompt must emit the SOLO directive + narrow the roster.
    let heroOK = false, introDirective = false, soloDirective = false, authExcludesPc = false, pcInCastFalse = false;
    if (introPanel) {
      const phase = plan.phases.find(p => p._panel === introPanel) || plan.phases.find(p => p._establishing);
      if (phase) {
        const rvs = window._resolvePhaseVisualState(plan.visualState, phase, plan.phases, plan.beats);
        authExcludesPc = Array.isArray(rvs._phaseAuthoritativeCast) && rvs._phaseAuthoritativeCast.indexOf('protagonist') === -1 && rvs._phaseAuthoritativeCast.length >= 1;
        pcInCastFalse = rvs._phasePcInCast === false;
        rvs.camera = 'over_shoulder_pc';   // worst case: the PC-POV camera that used to summon the protagonist
        s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
        const hero = window._buildStagedHeroPrompt(rvs, 0, plan) || '';
        introDirective = /CHARACTER INTRODUCTION \(HARD/.test(hero) && /caught MID-ACTION/.test(hero);
        soloDirective = /PANEL AUTHORITY — SOLO PANEL \(HARD/.test(hero) && /the protagonist is ABSENT/.test(hero);
        const introName = introPanel.hierarchy && introPanel.hierarchy.primary;
        heroOK = introDirective && introName && hero.indexOf(introName) !== -1;
      }
    }

    return { panelCount: panels.length, allTyped, oneIntro, soloCast, othersKeepCast, eventTyped, introDirective, soloDirective, authExcludesPc, pcInCastFalse, heroOK, introCast: ck };
  });

  await browser.close();
  R.authorityLogged = logs.some(t => /\[PANEL-AUTHORITY\]/.test(t));
  R.panelSpecLogged = logs.some(t => /\[PANEL-SPEC\]/.test(t) && /character_introduction\(estab\)/.test(t));
  R.soloClean = logs.some(t => /\[PANEL-AUTHORITY\].*✓ solo clean/.test(t)) && !logs.some(t => /\[PANEL-AUTHORITY\].*VIOLATION/.test(t));

  const checks = [
    ['every panel is typed (character_introduction | event | scene)', R.allTyped],
    ['exactly ONE Character Introduction, aligned with the reserved establishing shot (once-per-issue)', R.oneIntro],
    ['CAST AUTHORITY: the introduction cast is SOLO — the introduced character only, NOT the protagonist', R.soloCast],
    ['non-introduction panels keep their full cast (authority narrows ONLY introductions)', R.othersKeepCast],
    ['event panels are typed where the event is primary (eventLed)', R.eventTyped],
    ['PANEL AUTHORITY: the authoritative cast EXCLUDES the protagonist on an introduction', R.authExcludesPc],
    ['PANEL AUTHORITY: _phasePcInCast === false on the solo introduction', R.pcInCastFalse],
    ['hero prompt emits the action-driven CHARACTER INTRODUCTION directive (mid-action, not a portrait)', R.introDirective],
    ['hero prompt emits the SOLO PANEL directive (protagonist ABSENT, pipeline-wide)', R.soloDirective],
    ['PANEL AUTHORITY AUDIT logged for the panel ([PANEL-AUTHORITY])', R.authorityLogged],
    ['PANEL AUTHORITY AUDIT reports ✓ SOLO CLEAN under a worst-case OTS camera (no PC re-summon)', R.soloClean],
    ['PANEL-SPEC diagnostic shows narrativePanelType per panel (input visibility)', R.panelSpecLogged],
    ['hero prompt builds with the introduced character present', R.heroOK]
  ];

  let pass = 0, fail = 0;
  console.log('\n  CAST AUTHORITY — narrative panel type owns the cast  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · panels=' + R.panelCount + ' introCast=[' + (R.introCast || []).join(', ') + ']');
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
