// $0 verification of the Story Director phase 1 — Canon sheets + Recognition Traits +
// Continuity Supervisor (identity/species/injury/relationship lock). Paid endpoints blocked.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._buildStoryDirector === 'function' && typeof window._buildStagedHeroPrompt === 'function' && typeof window._resolvePhaseVisualState === 'function' && typeof window._buildStagedRegionContract === 'function', { timeout: 40000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male'; s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode';
    s.picks = { world: 'Fantasy', identity: { playerName: 'Mira', partnerName: '' } };
    s._playerSpecies = 'human'; s._liSpecies = 'human'; s.worldInstanceId = 'sd-1';
    s.aPlot = { goal: 'survive', antagonistOrAntiForce: 'Kael the raider' };
    window._stagedFunnelBypass = true;

    const plan = {
      visualState: {
        background: 'the drowned coral ruins of Gloamwater Bay',
        pc_wardrobe: 'a smooth charcoal manta-cloak over a linen tunic',
        li_wardrobe: '',
        other_characters_present: [
          { name: 'Soren', gender: 'male', species: 'human', wardrobe: 'a tattered manta-cloak', position: 'pinned by a spear, bleeding from his side' },
          { name: 'Kael', gender: 'male', species: 'kwisheen', wardrobe: 'coral spear, shell armor', position: 'attacking, a raider' }
        ]
      },
      phases: [
        { phaseIdx: 0, startBeat: 0, label: 'ambush', characters_present: ['protagonist', 'Soren'], props_present: [], li_visibility_phase: 'absent' },
        { phaseIdx: 1, startBeat: 2, label: 'wish', characters_present: ['protagonist', 'Soren'], props_present: [], li_visibility_phase: 'absent' },
        { phaseIdx: 2, startBeat: 4, label: 'attack', characters_present: ['protagonist', 'Kael', 'Soren'], props_present: [], li_visibility_phase: 'absent' }
      ],
      beats: [
        { idx: 0, kind: 'narration', text: 'Soren floated pinned between coral and stone, blood threading from his side.' },
        { idx: 1, kind: 'narration', text: 'The current pulled at my manta-cloak.' },
        { idx: 2, kind: 'narration', text: 'Soren began the formal words of the wish.' },
        { idx: 3, kind: 'narration', text: 'The water warmed for a breath.' },
        { idx: 4, kind: 'narration', text: "Kael's spear swung wide, forcing me back." },
        { idx: 5, kind: 'narration', text: 'I braced against the arch.' }
      ]
    };

    window._buildStoryDirector(plan, 0);
    s._stagedActive = { plan: plan };
    const canon = plan._canon || {};
    const p2State = (plan.phases[2] && plan.phases[2]._state) || {};

    // hero prompt for phase 2 (all three present)
    const phaseVS = window._resolvePhaseVisualState(plan.visualState, plan.phases[2], plan.phases, plan.beats);
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const heroPrompt = window._buildStagedHeroPrompt(phaseVS, 0, plan) || '';

    return {
      canonKeys: Object.keys(canon),
      soren: canon['soren'] || null,
      kael: canon['kael'] || null,
      p2SorenState: p2State['soren'] || null,
      p2KaelState: p2State['kael'] || null,
      heroPrompt
    };
  });
  await browser.close();
  const { canonKeys, soren, kael, p2SorenState, p2KaelState, heroPrompt } = R;

  const checks = [
    ['Canon built for PC + Soren + Kael', canonKeys.includes('protagonist') && canonKeys.includes('soren') && canonKeys.includes('kael')],
    ['Soren = human, flagged NO tentacles', soren && soren.species === 'human' && soren.humanNoTentacles === true],
    ['Soren recognition traits include the manta-cloak', soren && (soren.recognitionTraits || []).some(t => /manta-cloak/i.test(t))],
    ['Kael = kwisheen with a distinct lock (tentacle mane)', kael && kael.species === 'kwisheen' && (kael.recognitionTraits || []).some(t => /tentacle-dreadlocks|six-tentacle/i.test(t))],
    ['Kael recognition includes the coral spear', kael && (kael.recognitionTraits || []).some(t => /spear/i.test(t))],
    ['Continuity: Soren still PINNED in phase 2 (carried from P0)', p2SorenState && p2SorenState.status === 'pinned'],
    ['Continuity: Soren injury persists into phase 2 (no heal happened)', p2SorenState && (p2SorenState.injuries || []).length > 0],
    ['Relationship: Kael is trying_to_kill the protagonist', p2KaelState && p2KaelState.attitudeToward && p2KaelState.attitudeToward.protagonist === 'trying_to_kill'],
    ['Hero prompt stamps CAST IDENTITY with all three distinct figures', /CAST IDENTITY \(HARD/.test(heroPrompt) && /Soren \[HUMAN/.test(heroPrompt) && /Kael \[KWISHEEN/.test(heroPrompt)],
    ['Hero prompt: Soren fully-HUMAN-no-tentacles + injury persists', /Soren[\s\S]{0,180}fully HUMAN — NO tentacles/.test(heroPrompt) && /INJURY \(persists until healed\)/.test(heroPrompt)]
  ];

  let pass = 0, fail = 0;
  console.log('\n  STORY DIRECTOR — phase 1 (Canon + Continuity)  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · canon: ' + canonKeys.join(', '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
