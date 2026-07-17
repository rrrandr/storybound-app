// $0 verification of the Kwisheen face-drift fixes (Roman 2026-07-17):
//   1. Pupil directive now ACCEPTS a horizontal slit (not only a pill) + rejects vertical.
//   2. verify-anatomy detects a "kwisheen_face" defect (octopus-mouth / bald / wrong eyes).
//   3. The hero Kwisheen contract + the Kwisheen face cut-in carry the humanoid-face lock
//      and the horizontal-slit accommodation.
const fs = require('fs');
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**', '**/api/verify-anatomy**'];

(async () => {
  // Static checks on the verifier (server file — not runtime).
  const verifySrc = fs.readFileSync(__dirname + '/api/verify-anatomy.js', 'utf8');
  const vHasFaceCheck = /KWISHEEN FACE/.test(verifySrc) && /octopus-head|mass of tentacles/i.test(verifySrc) && /bald/i.test(verifySrc);
  const vHasDefectType = /"kwisheen_face"/.test(verifySrc);
  const vBoxesHead = /box the Kwisheen's HEAD-AND-FACE region/i.test(verifySrc) || /HEAD-AND-FACE region/i.test(verifySrc);

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._buildStagedHeroPrompt === 'function' && typeof window._renderCutCloseup === 'function' && typeof window._repairStagedAnatomyKlein === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male'; s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode';
    s.picks = { world: 'Fantasy', identity: { playerName: 'Mira', partnerName: 'Vael' } };
    s._playerSpecies = 'human'; s._liSpecies = 'kwisheen'; s.worldInstanceId = 'face-fix-1';
    window._stagedFunnelBypass = true;
    s.kwisheenAppearance = { thal: { skin: 'ember red-orange', pattern: 'a fine reticulated lattice', iris: 'pale jade' } };
    const contract = window._buildStagedRegionContract({ visualState: { background: 'a torch-lit stone square at dusk' }, phases: [] }) || {};
    s._stagedRegionContract = contract;
    const heroPrompt = String(contract.textBlock || '');

    // Kwisheen face cut-in
    s._stagedActive = s._stagedActive || {};
    s._stagedActive.plan = { visualState: { background: 'a tidal grotto, Gloamwater Bay' } };
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('lips_pressed', 'dark', 'Thal', 'face', { background: 'a tidal grotto' }).catch(function () {});
    const cutPrompt = window._lastCloseupPrompt || '';

    return { heroPrompt, cutPrompt };
  });
  await browser.close();
  const { heroPrompt, cutPrompt } = R;

  const checks = [
    ['verify-anatomy has a KWISHEEN FACE check (octopus-head / bald)', vHasFaceCheck],
    ['verify-anatomy returns a "kwisheen_face" defect_type', vHasDefectType],
    ['verify-anatomy boxes the HEAD-AND-FACE region for repaint', vBoxesHead],
    ['hero Kwisheen contract keeps the humanoid-face lock (anti-Cthulhu)', /the FACE itself is HUMANOID/.test(heroPrompt) && /NOT a mass of tentacles|never a face made of tentacles/i.test(heroPrompt)],
    ['contract pupil accepts a HORIZONTAL slit, rejects vertical', /HORIZONTAL slit/i.test(heroPrompt) && /VERTICAL slit is WRONG|never a VERTICAL slit/i.test(heroPrompt)],
    ['Kwisheen face cut-in carries the humanoid-face lock', /HUMANOID scaled face/.test(cutPrompt) && /TENTACLE-DREADLOCKS/.test(cutPrompt)],
    ['Kwisheen face cut-in pupil accepts a HORIZONTAL slit', /pupil runs HORIZONTALLY/.test(cutPrompt) && /HORIZONTAL slit/i.test(cutPrompt)],
    ['Kwisheen face cut-in keeps locked colours (ember / jade)', /ember red-orange/.test(cutPrompt) && /pale jade/.test(cutPrompt)]
  ];

  let pass = 0, fail = 0;
  console.log('\n  KWISHEEN FACE-DRIFT FIX — pupil + Klein face-repair detection  ($0)\n  ' + '─'.repeat(62));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  ' + '─'.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
