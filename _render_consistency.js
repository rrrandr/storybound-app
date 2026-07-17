// $0 verification of three render-consistency fixes (Roman 2026-07-16):
//   1. PC hairstyle is a LOCKED field (hairStyle) → no frame-to-frame drift.
//   2. Manta-cloak render-side expansion → terse "manta-cloak" wardrobe becomes the
//      full manta-hide / Storm-cape / pearls-or-shells canon (never seaweed/cloth/ragged).
//   3. Cut-in closeups inject UNDERWATER PHYSICS so hair/fabric billow, not gravity.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._renderCutCloseup === 'function' && typeof window._resolvePcAppearance === 'function' && typeof window._expandMantaWardrobe === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const s = window.state;
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s.picks = { identity: { playerName: 'Mira' } };
    s.pcAppearance = {}; // fresh lock
    s.worldInstanceId = 'render-consistency-probe';

    // (1) hairstyle lock — resolve twice, must be identical + include a style
    const a1 = window._resolvePcAppearance();
    const a2 = window._resolvePcAppearance();

    // (2) manta expansion — manta term expands; non-manta is a no-op
    const mantaExp = window._expandMantaWardrobe('a manta-cloak clasped at the shoulders');
    const plainExp = window._expandMantaWardrobe('emerald silk gown, gold drop earrings');

    // (3) underwater cut-in billow
    const vs = { background: 'Gloamwater Bay depths, silt currents under filtered moonlight', pc_wardrobe: 'a manta-cloak', lighting: 'cool' };
    s._stagedActive = s._stagedActive || {}; s._stagedActive.plan = { visualState: vs }; s._stagedCloseupCache = {};
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('neutral', 'cool', 'protagonist', 'gesture', { background: vs.background, pcWardrobe: vs.pc_wardrobe, pcSpecies: 'Human' }).catch(function () {});
    const cuPrompt = window._lastCloseupPrompt || '';

    // dry-land control: cut-in for a non-underwater scene must NOT inject water physics
    const vs2 = { background: 'a sunlit marble balcony over the city', pc_wardrobe: 'emerald silk gown', lighting: 'warm' };
    s._stagedActive.plan = { visualState: vs2 };
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('neutral', 'warm', 'protagonist', 'gesture', { background: vs2.background, pcWardrobe: vs2.pc_wardrobe, pcSpecies: 'Human' }).catch(function () {});
    const dryPrompt = window._lastCloseupPrompt || '';

    // (4) LI cut-in carries the LI's OWN wardrobe + face descriptor. Use an LI-POV edition
    //     so the LI's face is NOT concealed (a male LI is otherwise a coerced Mystery-Man
    //     mouth shot by design — his face is intentionally hidden).
    s.altPOVEdition = 'LI';
    s.liFaceDescription = { li1: 'weathered dark-bronze skin, close-cropped black hair, a scar through one brow' };
    const vsLi = { background: 'the drowned coral colonnade at depth', pc_wardrobe: 'a manta-cloak', li_wardrobe: 'a pearl-studded shell cuirass over a slate loincloth', lighting: 'cool',
                   other_characters_present: [{ name: 'Tess', wardrobe: 'a worn kelp-dyed diving wrap, tight braid' }] };
    s._stagedActive.plan = { visualState: vsLi };
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('jaw_clench', 'cool', 'li', 'face', { background: vsLi.background }).catch(function () {});
    const liPrompt = window._lastCloseupPrompt || '';

    // (5) named side character cut-in carries THAT character's wardrobe
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('worry', 'cool', 'Tess', 'face', { background: vsLi.background }).catch(function () {});
    const sidePrompt = window._lastCloseupPrompt || '';

    // (6) side-char appearance lock — stable per name, DISTINCT across names (no twins by construction)
    const scA = window._resolveSideCharAppearance('Tess');
    const scA2 = window._resolveSideCharAppearance('Tess');
    const scB = window._resolveSideCharAppearance('Bram');

    // (7) species-aware hand descriptor
    const kwHand = window._cuHandDescriptor('Kwisheen', { skin: 'deep teal', pattern: 'hex mottling' });
    const humanHand = window._cuHandDescriptor('Human', null);

    // (8) LI gesture cut-in for a KWISHEEN LI → a tentacle limb, never a human hand
    s._liSpecies = 'Kwisheen';
    s.kwisheenAppearance = { vael: { skin: 'deep teal', pattern: 'hex mottling', iris: 'amber-gold' } };
    s._stagedActive.plan = { visualState: { background: 'the drowned coral colonnade at depth' } };
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('neutral', 'cool', 'li', 'gesture', { background: 'the drowned coral colonnade at depth' }).catch(function () {});
    const liGesturePrompt = window._lastCloseupPrompt || '';

    // (9) TWINS GUARD in the hero prompt — two same-gender SIDE chars with a DIFFERENT-gender
    //     PC (the case the old PC-only guard missed entirely).
    s.playerGender = 'female'; s.gender = 'female';
    const twinVS = {
      background: 'a torch-lit tavern', camera: 'wide_establishing', pc_visibility: 'full',
      li_visibility: 'absent', _phaseLIAbsent: true, lighting: 'warm', social_staging_mode: 'group',
      other_characters_present: [
        { name: 'Bram', gender: 'male', wardrobe: 'leather jerkin', position: 'at the bar' },
        { name: 'Doran', gender: 'male', wardrobe: 'a guard tabard', position: 'by the door' }
      ],
      _phaseCharacters: ['protagonist', 'Bram', 'Doran'], _phaseIdx: 0
    };
    const twinPrompt = window._buildStagedHeroPrompt(twinVS, 0, {}) || '';

    return { a1, a2, mantaExp, plainExp, cuPrompt, dryPrompt, liPrompt, sidePrompt, scA, scA2, scB, kwHand, humanHand, liGesturePrompt, twinPrompt };
  });

  await browser.close();
  const { a1, a2, mantaExp, plainExp, cuPrompt, dryPrompt, liPrompt, sidePrompt, scA, scA2, scB, kwHand, humanHand, liGesturePrompt, twinPrompt } = R;
  const twinGuardCount = (twinPrompt.match(/DISTINCT-PERSON GUARD/g) || []).length;
  const bothLocked = /Bram's canonical appearance/.test(twinPrompt) && /Doran's canonical appearance/.test(twinPrompt);
  const scStable = scA && scA2 && scA.faceShape === scA2.faceShape && scA.eyeColor === scA2.eyeColor && scA.build === scA2.build;
  const scDistinct = scA && scB && (scA.faceShape !== scB.faceShape || scA.eyeColor !== scB.eyeColor || scA.build !== scB.build || scA.hairColor !== scB.hairColor);
  const checks = [
    ['PC appearance lock includes a hairStyle field', !!(a1 && a1.hairStyle && a1.hairStyle.length)],
    ['hairStyle is STABLE across resolves (locked, no drift)', a1 && a2 && a1.hairStyle === a2.hairStyle && a1.hairColor === a2.hairColor && a1.hairLength === a2.hairLength],
    ['manta expansion adds the manta-HIDE material + Storm-cape form', /MANTA-RAY HIDE/.test(mantaExp) && /CLASPED AT BOTH SHOULDERS/.test(mantaExp) && /both wrists and both ankles/.test(mantaExp)],
    ['manta expansion adds pearls/shells + forbids seaweed/cloth/ragged', /PEARLS or SHELLS/.test(mantaExp) && /never seaweed/.test(mantaExp) && /never ordinary woven cloth/.test(mantaExp)],
    ['manta expansion is a NO-OP for a non-manta wardrobe', plainExp === 'emerald silk gown, gold drop earrings'],
    ['underwater cut-in injects UNDERWATER PHYSICS + BILLOW', /UNDERWATER PHYSICS \(HARD/.test(cuPrompt) && /BILLOW/.test(cuPrompt) && /NEVER hanging straight down/.test(cuPrompt)],
    ['underwater cut-in wardrobe carries the expanded manta canon', /MANTA-RAY HIDE/.test(cuPrompt)],
    ['dry-land cut-in does NOT inject water physics (no false-positive)', !/UNDERWATER PHYSICS/.test(dryPrompt)],
    ['LI face cut-in carries the LI\'s OWN wardrobe (not PC\'s, not blank)', /LOVE INTEREST WARDROBE \(HARD/.test(liPrompt) && /shell cuirass/.test(liPrompt)],
    ['LI face cut-in carries the LI\'s concrete locked face descriptor', /Established look/.test(liPrompt) && /scar through one brow/.test(liPrompt)],
    ['named side-char cut-in carries THAT character\'s wardrobe', /TESS WARDROBE \(HARD/.test(sidePrompt) && /kelp-dyed diving wrap/.test(sidePrompt)],
    ['LI/side cut-ins still get underwater physics (universal, not PC-gated)', /UNDERWATER PHYSICS/.test(liPrompt) && /UNDERWATER PHYSICS/.test(sidePrompt)],
    ['side-char appearance lock is STABLE per name', scStable],
    ['side-char looks are DISTINCT across names (no twins by construction)', scDistinct],
    ['side-char face cut-in carries the locked look (face shape/eyes/build)', /Established look/.test(sidePrompt) && /face/.test(sidePrompt) && /eyes/.test(sidePrompt)],
    ['_cuHandDescriptor: Kwisheen → TENTACLE, not a human hand', /TENTACLE/.test(kwHand || '') && /NOT a human hand/.test(kwHand || '')],
    ['_cuHandDescriptor: human → null (keeps existing human descriptor)', humanHand === null],
    ['Kwisheen-LI gesture cut-in renders a tentacle limb + species lock', /TENTACLE/.test(liGesturePrompt) && /LOVE INTEREST SPECIES \(HARD/.test(liGesturePrompt) && !/masculine adult hand/.test(liGesturePrompt)],
    ['twins guard fires for TWO same-gender side chars (different-gender PC)', twinGuardCount >= 2],
    ['both same-gender side chars get a LOCKED LOOK in the hero prompt', bothLocked]
  ];

  let pass = 0, fail = 0;
  console.log('\n  RENDER CONSISTENCY — hair lock / manta cloak / underwater cut-ins  ($0)\n  ' + '─'.repeat(64));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · locked hair: ' + (a1 ? (a1.hairLength + ' ' + a1.hairColor + ', ' + a1.hairStyle) : '(none)'));
  console.log('  ' + '─'.repeat(64) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
