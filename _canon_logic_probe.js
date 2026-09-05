// $0 LOGIC PROBE — exercises the canon-conformance helpers in the real app context.
// No image gen, no paid API: only calls window._canonAuthorizedChanges + window._expectedCanonForPanel.
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._canonAuthorizedChanges === 'function' && typeof window._expectedCanonForPanel === 'function', { timeout: 40000 });

  const out = await page.evaluate(() => {
    const R = {};
    const A = window._canonAuthorizedChanges;
    // 1) authorization gate
    R.plain      = Object.keys(A({ _panel: {} }, 'She swims toward the gate, spear ready.', ''));
    R.transform  = Object.keys(A({ _panel: {} }, 'The wish takes her — she becomes a man mid-breath.', ''));
    R.wishPanel  = Object.keys(A({ _panel: { wishOutcome: 'clean' } }, 'The burst answers.', ''));
    R.dropWeapon = Object.keys(A({ _panel: {} }, 'She drops the spear and reaches out.', ''));
    R.stripArmor = Object.keys(A({ _panel: {} }, 'His cloak is torn away in the surge.', ''));
    R.prevBeat   = Object.keys(A({ _panel: {} }, 'She stands over him.', 'She transforms, scales rippling into a new shape.'));

    // 2) canon-block builder against a synthetic plan._canon + phase
    window.state._liSpecies = 'Kwisheen';
    window.state.kwisheenAppearance = {}; // fresh lock
    const planMeta = {
      _canon: {
        protagonist: { key: 'protagonist', displayName: 'Mira', role: 'protagonist', species: 'human',
          garment: 'linen tunic', weapon: '', morphology: { genderPresentation: 'female', speciesTopology: 'ordinary human' }, recognitionTraits: ['a throat talisman'] },
        kesh: { key: 'kesh', displayName: 'Kesh', role: 'love_interest', species: 'kwisheen',
          garment: 'shell-studded loincloth and beaded wraps', weapon: 'spear',
          morphology: { genderPresentation: 'androgynous', speciesTopology: 'tentacle lower body', facialTopology: 'scaled humanoid', mane: 'tentacle-dreadlocks' },
          recognitionTraits: ['a bone spear', 'a shell torc'] }
      },
      phases: [], beats: []
    };
    const phase = { phaseIdx: 0, characters_present: ['protagonist', 'li'], _panel: {},
      _state: { protagonist: { holding: '', injuries: [] }, kesh: { holding: 'spear', injuries: ['bleeding wound on the tentacle'] } } };
    planMeta.phases = [phase];
    const cb = window._expectedCanonForPanel({}, phase, planMeta);
    R.canon_chars = cb ? cb.chars.map(c => ({ name: c.name, species: c.species, body_plan: !!c.body_plan, gender: c.gender, weapon: c.weapon, jewelry: c.jewelry, injuries: c.injuries })) : null;
    R.canon_kesh_bodyplan = cb ? (cb.chars.find(c => c.name === 'Kesh') || {}).body_plan : null;
    R.canon_authorized = cb ? cb.authorized : null;
    return R;
  });

  const P = (name, cond) => console.log((cond ? '  PASS ' : '  FAIL ') + name);
  console.log('── authorization gate ──');
  P('plain beat authorizes nothing', out.plain.length === 0);
  P('transformation → gender+body_plan', out.transform.includes('gender') && out.transform.includes('body_plan'));
  P('granted wish panel → gender+body_plan', out.wishPanel.includes('gender') && out.wishPanel.includes('body_plan'));
  P('drop weapon → weapon', out.dropWeapon.includes('weapon'));
  P('torn cloak → wardrobe', out.stripArmor.includes('wardrobe'));
  P('transformation in PREVIOUS beat still authorizes', out.prevBeat.includes('gender'));
  console.log('── canon-block builder ──');
  P('two characters resolved (Mira + Kesh)', out.canon_chars && out.canon_chars.length === 2);
  P('Kesh has a locked body_plan', !!out.canon_kesh_bodyplan);
  P('Kesh weapon = spear (from phase._state.holding)', out.canon_chars && (out.canon_chars.find(c => c.name === 'Kesh') || {}).weapon === 'spear');
  P('Kesh jewelry harvested (shell torc)', out.canon_chars && /torc/.test(((out.canon_chars.find(c => c.name === 'Kesh') || {}).jewelry) || ''));
  P('Kesh injury carried (tentacle wound)', out.canon_chars && /tentacle/.test(((out.canon_chars.find(c => c.name === 'Kesh') || {}).injuries) || ''));
  P('plain phase authorizes nothing', out.canon_authorized && out.canon_authorized.length === 0);
  console.log('body_plan token:', JSON.stringify(out.canon_kesh_bodyplan));
  if (errs.length) console.log('PAGE ERRORS:', errs.join(' | '));
  await browser.close();
})();
