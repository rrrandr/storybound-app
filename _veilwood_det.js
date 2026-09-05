// DETERMINISTIC Veilwood sheet — NO planner. Hand-authored visualState + 4 phases → _renderOneShotSheet.
// Isolates the prompt changes: token weapon-lock, collapsed FF directive, Veilweave groin-blur, veilwoodEnvBlock,
// mated-pair growth. Cast is FORCED: Kael (First Favored, Veilweave, The Answer) vs Threxa + Orun (2 Kwisheen).
// Composition forces every feature into view (establishing veil → side-curtains → close blur/weapon → pullback trees+grass).
//   DRY (default): builds the prompt + prints weapon-lock/species/blocks. FREE. Verify before spending.
//   RENDER:  RUN=1 node _veilwood_det.js   → one paid 4-panel Ryo Toro sheet.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/veilwood_det';
const RUN = process.env.RUN === '1';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('console', m => { const t = m.text(); if (/\[ONESHOT\]|species anatomy|STYLE ANCHOR|Generation failed/i.test(t)) console.error('  >', t.slice(0, 150)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._buildOneShotSheetPrompt === 'function' && typeof window._renderOneShotSheet === 'function' && typeof window._characterWeaponLoadout === 'function', { timeout: 40000 });

  const result = await p.evaluate(async ({ RUN }) => {
    const s = window.state;
    // ---- deterministic state (no planner, no PC/LI bibles) ----
    s.storyId = 'veilwood-det';
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'adventure',
      dynamic: 'enemies_to_lovers', tone: 'Charged', intensity: 'Suggestive', fantasyRegion: 'the_veilwood',
      identity: { playerName: 'Kael', partnerName: 'Threxa', displayPlayerName: 'Kael', displayPartnerName: 'Threxa' }, pov: '3rd' };
    s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman'; s.fantasyRegion = 'the_veilwood';
    s.gender = 'Male'; s.loveInterest = 'Female'; s.authorPronouns = 'He/Him';
    s.protagonistName = 'Kael'; s.loveInterestName = 'Threxa';
    s._playerSpecies = 'First Favored'; s._liSpecies = 'Kwisheen';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic'; s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s.gnArtist = 'ryo_toro'; s._pcLookSkipped = true;
    window._devBypass = true; window._structuralPass = false; window._oneShotSheet = true; window.__cgAuthorTimeoutMs = 180000;
    // region contract → veilwood label + canonical white-veil anchor image
    s._stagedRegionContract = { regionLabel: 'the_veilwood', anchorImages: ['/assets/Fatelands/Veilwood-photo-wisps.png?v=20260402'] };

    // ---- visualState (FORCED cast) ----
    const visualState = {
      characters_present: ['protagonist', 'li'],           // token strings → exercise the token→species weapon-lock fix
      other_characters_present: [{ name: 'Orun', species: 'Kwisheen', gender: 'Male', wardrobe: 'a reef-scaled war-harness' }], // 2nd Kwisheen
      li_visibility: 'present',
      pc_wardrobe: 'the VEILWEAVE — a sheer, hooded, translucent leaf-vein garment that refracts him into several overlapping misregistered echoes of one body',
      li_wardrobe: 'a coral-and-shell harness, violet-toned tentacles',
      pc_weapon: null, li_weapon: null,                    // null → weapon lock must resolve via species (the fix)
      background: 'the Veilwood at dusk — pale WHITE mated-pair twisted trees, WHITE weeping veil-leaf canopy hanging in curtains, deep-crimson spiralgrass growing in twisted pairs, glowing moonpetals'
    };

    const shot = (distance, angle, blocking) => ({ distance, angle, blocking });
    const phase = (i, learning, sh, characters, beat) => ({
      phaseIdx: i, label: learning, _readerLearning: learning,
      characters_present: characters, props_present: [], entering_characters: [],
      li_visibility_phase: 'present', pc_posture: 'combat stance', pc_emotional_state: 'fierce focus',
      other_postures: null, proximity: 'engaged melee', _shot: sh, beat: beat
    });

    const phases = [
      phase(0, 'Orientation', shot('wide establishing shot', 'slightly_low', 'full figures small in frame'),
        ['protagonist', 'li', 'orun'],
        'WIDE ESTABLISHING: the Veilwood clearing at dusk — WHITE weeping veil-leaf canopies hang in receding layered curtains deep into the misty background, framed by pale MATED-PAIR twisted white trunks; deep-crimson spiralgrass in twisted pairs carpets the ground. In the clearing, KAEL, a First Favored wearing the sheer hooded translucent VEILWEAVE (his body refracted into several overlapping misregistered echoes), turns at bay as TWO Kwisheen — THREXA (female, violet tentacles) and ORUN (bearded male) — close in from both sides. Kael raises THE ANSWER, his double-ended hooked polearm.'),
      phase(1, 'Threat', shot('medium-wide shot', 'eye_level', 'framed by foreground veil-curtains'),
        ['protagonist', 'li', 'orun'],
        'Kael fights BENEATH hanging foreground SIDE-CURTAINS of white veil-leaf that drape into the left and right frame edges without hiding him. He sweeps THE ANSWER polearm to parry THREXA\'s barbed tide-trident as ORUN lunges with his trident from the other side — tentacles and hafts clash. The Veilweave still smears Kael into overlapping translucent echoes.'),
      phase(2, 'Decision', shot('close-up', 'dutch_tilt', 'tight two-shot'),
        ['protagonist', 'li'],
        'CLOSE, tight shot: THE ANSWER polearm (crescent HOOK one end, straight BLADE the other) locked hard against THREXA\'s trident, sparks flying. Kael\'s VEILWEAVE refraction is most visible here — several overlapping translucent copies of the same hooded body; over his groin the sheer cloth simply goes soft and out of focus (a diffuse haze, NOT a bright patch). Fury and focus on his face; Threxa snarls, tentacles flaring.'),
      phase(3, 'Consequence', shot('wide shot', 'slightly_high', 'full figures, deep background'),
        ['protagonist', 'li', 'orun'],
        'PULL BACK WIDE: the full Veilwood reads — MATURE mated-pair twisted white trunks (one nearby pair still mid-twist as a loose helix), WHITE weeping veil canopy filling the background, deep-crimson spiralgrass in twisted pairs underfoot, moonpetals glowing. KAEL stands over a downed ORUN, THE ANSWER polearm still in hand, as THREXA recoils, wounded. Kael\'s Veilweave echoes trail his motion.')
    ];
    const planMeta = { phases: phases, beats: [] };

    // ---- DRY diagnostics (free) ----
    const sceneText = window._sheetSceneText ? window._sheetSceneText(visualState, phases) : '';
    const loadout = window._characterWeaponLoadout(visualState, sceneText);
    const trueSp = window._trueSpeciesOnStage ? window._trueSpeciesOnStage(visualState) : null;
    const vwWearer = window._trueVeilweaveWearerSpecies ? window._trueVeilweaveWearerSpecies(visualState) : null;
    const prompt = window._buildOneShotSheetPrompt(visualState, phases, 0, planMeta);

    let sheetUrl = null, renderErr = null;
    if (RUN) {
      try { window._lastOneShotSheet = null; await window._renderOneShotSheet(visualState, phases, 0, planMeta); sheetUrl = window._lastOneShotSheet && window._lastOneShotSheet.url; }
      catch (e) { renderErr = e && e.message; }
    }
    return { loadout, trueSp, vwWearer, prompt, sheetUrl, renderErr,
      isCombat: window._isCombatScene ? window._isCombatScene(sceneText) : null,
      isVeilweave: window._isVeilweaveScene ? window._isVeilweaveScene(sceneText) : null };
  }, { RUN });

  // ---- report ----
  const P = result.prompt || '';
  const has = s => P.indexOf(s) !== -1;
  console.log('=== DETERMINISTIC VEILWOOD SHEET — dry checks ===');
  console.log('combat scene detected :', result.isCombat, '| veilweave scene detected:', result.isVeilweave);
  console.log('species on stage      :', JSON.stringify(result.trueSp), '| veilweave wearer:', result.vwWearer);
  console.log('WEAPON LOADOUT        :', JSON.stringify(result.loadout));
  console.log('block: VEILWOOD FOLIAGE           :', has('VEILWOOD FOLIAGE'));
  console.log('block: white weeping canopy       :', has('WHITE WEEPING CANOPY'));
  console.log('block: mated-pair growth (trunks) :', has('MATED PAIRS') || has('mated pair'));
  console.log('block: FIRST FAVORED one-weapon   :', has('exactly ONE signature weapon'));
  console.log('block: WEAPON LOCK section        :', has('WEAPON LOCK') || has('WEAPONS (locked'));
  console.log('block: Veilweave SOFT-FOCUS BLUR  :', has('SOFT-FOCUS BLUR'));
  console.log('block: Veilweave no-codpiece      :', has('codpiece'));
  console.log('prompt length         :', P.length, 'chars');
  fs.writeFileSync(path.join(OUT, 'prompt.txt'), P);
  console.log('prompt saved → ' + path.join(OUT, 'prompt.txt'));

  if (RUN) {
    if (result.sheetUrl && String(result.sheetUrl).indexOf('data:') === 0) {
      fs.writeFileSync(path.join(OUT, 'sheet.png'), Buffer.from(result.sheetUrl.split(',')[1], 'base64'));
      console.log('RENDER saved → ' + path.join(OUT, 'sheet.png'));
    } else { console.error('RENDER FAILED — ' + (result.renderErr || 'no url')); }
  } else {
    console.log('\nDRY RUN complete (no spend). Set RUN=1 to render.');
  }
  await b.close();
})().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(2); });
