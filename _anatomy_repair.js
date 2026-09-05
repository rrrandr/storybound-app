// $0 headless test of the Klein anatomy spot-repair CLIENT logic.
// Routes /api/verify-anatomy (scripted) + all image endpoints (fake capture) — no real spend.
const { chromium } = require('playwright-core');
const TINY = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const IMG = 'data:image/png;base64,' + TINY;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const captured = [];
  let verifyResp = { pass: true };
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    captured.push({ url, body });
    if (/verify-anatomy/.test(url)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifyResp) });
    }
    // any image-gen endpoint (callBFLKontext) → return a fake image so the path completes
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: IMG, image: TINY, imageUrl: IMG, data: TINY }) });
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._repairStagedAnatomyKlein === 'function' && typeof window._buildKleinMaskFromBbox === 'function' && typeof window._expectedFigureCount === 'function', { timeout: 40000 });

  const out = [];
  const t = (name, pass, detail) => out.push({ name, pass: !!pass, detail: detail || '' });

  // ── pure helpers ──
  const fc = await page.evaluate(() => {
    const solo = window._expectedFigureCount({ other_characters_present: [] }, { li_visibility_phase: 'absent', characters_present: ['protagonist'] });
    const couple = window._expectedFigureCount({ other_characters_present: [] }, { li_visibility_phase: 'revealed', characters_present: ['protagonist', 'li'] });
    const withOther = window._expectedFigureCount({ other_characters_present: [{ name: 'Elara' }] }, { li_visibility_phase: 'revealed', characters_present: ['protagonist', 'li', 'Elara'] });
    const otherNotInPhase = window._expectedFigureCount({ other_characters_present: [{ name: 'Bram' }] }, { li_visibility_phase: 'absent', characters_present: ['protagonist'] });
    return { solo, couple, withOther, otherNotInPhase };
  });
  t('expectedFigureCount: solo (LI absent, no others) = 1', fc.solo === 1, 'got ' + fc.solo);
  t('expectedFigureCount: LI present = 2', fc.couple === 2, 'got ' + fc.couple);
  t('expectedFigureCount: + named other staged in phase = 3', fc.withOther === 3, 'got ' + fc.withOther);
  t('expectedFigureCount: other NOT in this phase is not counted = 1', fc.otherNotInPhase === 1, 'got ' + fc.otherNotInPhase);

  const mask = await page.evaluate(() => {
    const m = window._buildKleinMaskFromBbox([0.1, 0.1, 0.3, 0.4]);
    const bad = window._buildKleinMaskFromBbox(null);
    return { ok: typeof m === 'string' && m.startsWith('data:image/png') && m.length > 500, bad };
  });
  t('buildKleinMaskFromBbox: valid bbox → PNG data URL', mask.ok, '');
  t('buildKleinMaskFromBbox: null bbox → null (no throw)', mask.bad === null, 'got ' + mask.bad);

  // ── verify request shape (figure-sanity mode runs on a HUMAN scene + sends expected_people) ──
  captured.length = 0;
  verifyResp = { pass: false, defect_type: 'extra_person', defect_bbox: [0.6, 0.2, 0.3, 0.6], person_count: 2, confidence: 'high', violations: ['duplicate person'] };
  const vres = await page.evaluate(async (img) => {
    const s = window.state; s._playerSpecies = 'Human'; s._liSpecies = 'Human'; window._verifyEnabled(true);
    const v = await window._verifyPanelAnatomy(img, 'medium_shot', false, { expectedPeople: 1 });
    return v;
  }, IMG);
  const vReq = captured.find(c => /verify-anatomy/.test(c.url));
  t('verify runs on a HUMAN scene in figure-mode (not skipped)', vres && !vres.skipped && vres.pass === false, 'skipped=' + (vres && vres.skipped));
  t('verify request sends expected_people', vReq && vReq.body && vReq.body.expected_people === 1, 'body.expected_people=' + (vReq && vReq.body && vReq.body.expected_people));
  t('verify surfaces defect_type + defect_bbox + person_count', vres && vres.defect_type === 'extra_person' && Array.isArray(vres.defect_bbox) && vres.person_count === 2, '');

  // ── repair gating: CLEAN → null (pays nothing) ──
  captured.length = 0; verifyResp = { pass: true };
  const rClean = await page.evaluate(async (img) => await window._repairStagedAnatomyKlein(img, { expectedPeople: 1, camera: 'medium_shot' }), IMG);
  t('repair: clean verify → returns null (no Klein call)', rClean === null && !captured.some(c => c.body && c.body.mask), '');

  // ── repair gating: SPECIES defect (not removal-class) → null ──
  captured.length = 0; verifyResp = { pass: false, defect_type: 'species_anatomy', defect_bbox: null, confidence: 'high' };
  const rSpecies = await page.evaluate(async (img) => await window._repairStagedAnatomyKlein(img, { expectedPeople: 1, camera: 'medium_shot' }), IMG);
  t('repair: species defect (no bbox) → null (routes to GN inpaint, not Klein removal)', rSpecies === null && !captured.some(c => c.body && c.body.mask), '');

  // ── repair success path: extra_person + bbox → Klein call WITH mask + klein model ──
  captured.length = 0; verifyResp = { pass: false, defect_type: 'extra_person', defect_bbox: [0.55, 0.15, 0.35, 0.7], person_count: 2, confidence: 'high', violations: ['duplicate person'] };
  await page.evaluate(async (img) => await window._repairStagedAnatomyKlein(img, { expectedPeople: 1, camera: 'medium_shot' }), IMG);
  const kleinReq = captured.find(c => c.body && c.body.mask);
  t('repair: extra_person defect → a Klein inpaint request WAS made carrying a mask', !!kleinReq, kleinReq ? 'mask len ' + String(kleinReq.body.mask).length : 'NO masked request');
  t('repair: the Klein request used the klein model (flux-2-klein-9b)', !!(kleinReq && /klein/i.test(String(kleinReq.body.model || ''))), kleinReq ? 'model=' + kleinReq.body.model : '');

  await browser.close();
  let pass = 0, fail = 0;
  console.log('\n  KLEIN ANATOMY SPOT-REPAIR  ($0)\n  ' + '─'.repeat(58));
  for (const r of out) { r.pass ? pass++ : fail++; console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : '')); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
