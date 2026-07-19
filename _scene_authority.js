// $0 SCENE AUTHORITY — SFX authority (an SFX only renders when the action is DEPICTED), Living World (narrated
// groups get established), prop authority (no invented significant objects), and the underwater anti-planting
// directive. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildGraphicTypography === 'function' && typeof window._detectLivingWorldGroups === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    // ── SFX AUTHORITY ──
    const gt = window._buildGraphicTypography('he SLAMS the hilt into her jaw, the strike connecting', {}, {});
    const contract = window._graphicTypographyContract(gt);
    const sfxConditional = /render this ONLY IF/i.test(contract) && /visible impact|actually collid/i.test(contract) && /OMIT this text/i.test(contract) && /never a genre default/i.test(contract);
    // a beat with NO depicted action verb → no SFX category → no SFX line at all
    const gtNone = window._buildGraphicTypography('she considers the distant city, uncertain', {}, {});
    const noSfx = !(gtNone.sfx && gtNone.sfx.text);

    // ── LIVING WORLD detection ──
    const groups = window._detectLivingWorldGroups('Three raiders wait behind the pillars while a patrol circles the outer ring.');
    const lwOk = groups.indexOf('raiders') !== -1 && groups.indexOf('patrol') !== -1;
    const lwEmpty = window._detectLivingWorldGroups('The two of them drift alone in the silent ruin.').length === 0;

    // ── build a plan (underwater, kwisheen, a sacrifice + a group beat) ──
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-scene'; s._playerSpecies = 'human'; s._liSpecies = 'kwisheen'; s._openFateBargains = [];
    const plan = {
      visualState: { background: 'flooded coral ruins underwater', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider', role: 'antagonist' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [
        { idx: 0, kind: 'narration', text: 'Kesh corners me; three raiders wait behind the pillars.' },
        { idx: 1, kind: 'narration', text: '"Fate beneath the turning tide." Kesh offers a favored tentacle as the price.' },
        { idx: 2, kind: 'narration', text: 'The coral shifts around us.' },
        { idx: 3, kind: 'narration', text: 'Fight or flee.' }
      ]
    };
    window._buildStoryDirector(plan, 0);
    const panels = plan._panels || [];
    // some panel detected the group
    const anyLivingWorld = panels.some(p => Array.isArray(p.livingWorld) && p.livingWorld.length);
    // a sacrifice panel exists and its grammar is a STAIN, not a reaching hand
    const sacPanel = panels.find(p => p.sacrifice);
    const sacIsStain = sacPanel && (sacPanel.grammarCues || []).some(c => /SHADOW-STAIN/i.test(c) && /NOT a hand or arm reaching/i.test(c));

    // ── hero prompt: SCENE AUTHORITY + underwater NO GROUND PLANE ──
    const phase = plan.phases.find(p => p._establishing) || plan.phases[0];
    const rvs = window._resolvePhaseVisualState(plan.visualState, phase, plan.phases, plan.beats);
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const hero = window._buildStagedHeroPrompt(rvs, 0, plan) || '';
    const sceneAuthority = /SCENE AUTHORITY \(HARD/.test(hero) && /a NEW significant object is a hallucination/.test(hero);
    const noGroundPlane = /NO GROUND PLANE UNDER THEM/.test(hero) && /SUSPENDED in mid-water/.test(hero);
    // notation integration reached the burst style
    const burstIntegrated = /INTEGRATION \(HARD — it must belong to the illustration/.test(window._WISH_BURST_TWISTED || '');

    return { sfxConditional, noSfx, lwOk, lwEmpty, anyLivingWorld, sacIsStain, sceneAuthority, noGroundPlane, burstIntegrated };
  });

  await browser.close();

  const checks = [
    ['SFX AUTHORITY: an SFX renders ONLY if its action is DEPICTED (else OMIT; never a genre default)', R.sfxConditional],
    ['SFX AUTHORITY: a beat with no depicted action → no SFX at all', R.noSfx],
    ['LIVING WORLD: narrated groups (raiders, patrol) are detected', R.lwOk],
    ['LIVING WORLD: a two-person-alone beat detects no group', R.lwEmpty],
    ['LIVING WORLD: the panel spec carries the detected group', R.anyLivingWorld],
    ['SACRIFICE: the grammar is a shadow-STAIN (absence), NOT a hand/arm reaching in', R.sacIsStain],
    ['PROP AUTHORITY: the hero prompt declares SCENE AUTHORITY (no invented significant objects)', R.sceneAuthority],
    ['UNDERWATER: the hero prompt forbids the ground plane / demands suspension', R.noGroundPlane],
    ['NOTATION INTEGRATION: the burst style requires it belong to the illustration (not a sticker)', R.burstIntegrated]
  ];

  let pass = 0, fail = 0;
  console.log('\n  SCENE AUTHORITY — SFX / living-world / props / buoyancy  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
