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

  const R = await page.evaluate(async () => {
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

    // mark phase 1 as the wish phase (beat text has the invocation) and give a bleed beat to detect grammar
    plan.beats[2].text = 'Soren lifted his hands and spoke the formal words: Fate beneath the turning tide, I offer a year of my life.';
    plan.beats[3].text = 'The water warmed and the passage shuddered open — Fate’s answer.';

    window._buildStoryDirector(plan, 0);
    s._stagedActive = { plan: plan };
    const canon = plan._canon || {};
    const p2State = (plan.phases[2] && plan.phases[2]._state) || {};
    const panel0 = plan.phases[0]._panel, panel1 = plan.phases[1]._panel, panel2 = plan.phases[2]._panel;

    // hero prompt for phase 1 (the wish panel)
    const phaseVS1 = window._resolvePhaseVisualState(plan.visualState, plan.phases[1], plan.phases, plan.beats);
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const wishHeroPrompt = window._buildStagedHeroPrompt(phaseVS1, 0, plan) || '';

    // authored-panel validation: a panel missing dramaticQuestion/shotType/primary must be flagged INVALID
    const plan2 = JSON.parse(JSON.stringify({ visualState: plan.visualState, phases: plan.phases.map(p => ({ phaseIdx: p.phaseIdx, startBeat: p.startBeat, label: p.label, characters_present: p.characters_present, props_present: [], li_visibility_phase: 'absent' })), beats: plan.beats }));
    plan2.panels = [{ panelIdx: 0 /* missing dramaticQuestion, shotType, subjects, cast */ }, { panelIdx: 1 }, { panelIdx: 2 }];
    window._buildStoryDirector(plan2, 0);
    const failLoud = plan2._panelInvalid === true;

    // UNIFIED PIPELINE: a cut-in of the PC in the combat phase (beat 4) with a NEUTRAL beat
    // expression must still consume Canon + the tense scene register (no smiling in a crisis).
    const cutBeat = { idx: 4, closeup_target: 'protagonist', shot_type: 'face', expression_target: 'neutral' };
    const cutPanel = window._buildCutInPanel(plan, cutBeat, 'dark');
    window._lastCloseupPrompt = '';
    await window._renderPanel(cutPanel).catch(function () {});
    const cutPrompt = window._lastCloseupPrompt || '';
    const cutPanelType = cutPanel && cutPanel.type;
    const cutTense = !!(cutPanel && cutPanel.sceneCtx && cutPanel.sceneCtx.sceneTense);
    const cutHasCanon = !!(cutPanel && cutPanel.sceneCtx && cutPanel.sceneCtx.canon);

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
      heroPrompt,
      panel2ShotType: panel2 && panel2.shotType,
      panel2HierPrimary: panel2 && panel2.hierarchy && panel2.hierarchy.primary,
      panel1Grammar: (panel1 && panel1.grammarCues || []).join(' | '),
      panel0HasPerf: !!(panel0 && panel0.cast && panel0.cast.length && panel0.cast[0].performance),
      wishHeroPrompt, failLoud,
      cutPrompt, cutPanelType, cutTense, cutHasCanon
    };
  });
  await browser.close();
  const { canonKeys, soren, kael, p2SorenState, p2KaelState, heroPrompt, panel2ShotType, panel2HierPrimary, panel1Grammar, panel0HasPerf, wishHeroPrompt, failLoud, cutPrompt, cutPanelType, cutTense, cutHasCanon } = R;

  const checks = [
    ['Canon built for PC + Soren + Kael', canonKeys.includes('protagonist') && canonKeys.includes('soren') && canonKeys.includes('kael')],
    ['Soren = human, flagged NO tentacles', soren && soren.species === 'human' && soren.humanNoTentacles === true],
    ['Soren recognition traits include the manta-cloak', soren && (soren.recognitionTraits || []).some(t => /manta-cloak/i.test(t))],
    ['Kael = kwisheen with a distinct lock (tentacle mane)', kael && kael.species === 'kwisheen' && (kael.recognitionTraits || []).some(t => /tentacle-dreadlocks|six-tentacle/i.test(t))],
    ['Kael recognition includes the coral spear', kael && (kael.recognitionTraits || []).some(t => /spear/i.test(t))],
    ['Continuity: Soren still PINNED in phase 2 (carried from P0)', p2SorenState && p2SorenState.status === 'pinned'],
    ['Continuity: Soren injury persists into phase 2 (no heal happened)', p2SorenState && (p2SorenState.injuries || []).length > 0],
    ['Continuity: injury LOCATION is locked (side, not drifting)', p2SorenState && (p2SorenState.injuries || []).some(i => /side/i.test(i))],
    ['Relationship: Kael is trying_to_kill the protagonist', p2KaelState && p2KaelState.attitudeToward && p2KaelState.attitudeToward.protagonist === 'trying_to_kill'],
    ['Hero prompt stamps the CAST with all three distinct figures', /STORY DIRECTOR — PANEL \(HARD/.test(heroPrompt) && /Soren \[HUMAN/.test(heroPrompt) && /Kael \[KWISHEEN/.test(heroPrompt)],
    ['Hero prompt: Soren fully-HUMAN-no-tentacles + injury persists', /Soren[\s\S]{0,180}fully HUMAN — NO tentacles/.test(heroPrompt) && /INJURY \(persists until healed\)/.test(heroPrompt)],
    ['Panel spec: attack phase inferred shotType=combat', panel2ShotType === 'combat'],
    ['Panel spec: hierarchy assigns a primary subject', !!panel2HierPrimary],
    ['Panel spec: derived cast carries a performance object', panel0HasPerf === true],
    ['Wish grammar detected + expanded to PRAYER cue on the wish panel', /WISH \(visual grammar/.test(panel1Grammar) && /prayer/i.test(panel1Grammar)],
    ['Hero prompt (wish panel): STORY DIRECTOR — PANEL + DRAMATIC QUESTION + prayer', /STORY DIRECTOR — PANEL \(HARD/.test(wishHeroPrompt) && /DRAMATIC QUESTION/.test(wishHeroPrompt) && /clasped together or open and rising in supplication/.test(wishHeroPrompt)],
    ['Hero prompt: SHOT + HIERARCHY lines present', /SHOT \(/.test(wishHeroPrompt) && /HIERARCHY: primary=/.test(wishHeroPrompt)],
    ['BLOCKING: adversarial panel gets spatial blocking (distance, weapon-between, advancing)', /BLOCKING \(HARD/.test(heroPrompt) && /CLEAR fighting distance/.test(heroPrompt) && /ADVANCES on/.test(heroPrompt)],
    ['FAIL-LOUD: authored panels missing required fields are flagged invalid', failLoud === true],
    ['Unified pipeline: cut-in is a panel.type=cut_in', cutPanelType === 'cut_in'],
    ['Unified pipeline: cut-in carries Canon + detects the tense scene register', cutHasCanon === true && cutTense === true],
    ['Unified pipeline: cut-in renders through _renderPanel with identity + no-smile-in-crisis', /CHARACTER IDENTITY \(HARD/.test(cutPrompt) && /EMOTIONAL REGISTER \(HARD/.test(cutPrompt) && /NEVER be pleasant/.test(cutPrompt)]
  ];

  let pass = 0, fail = 0;
  console.log('\n  STORY DIRECTOR — phase 1 (Canon + Continuity)  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · canon: ' + canonKeys.join(', '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
