// Validation gen for the meta-audit fixes (2026-07-14). Drives the LIVE app at localhost:3000 via system
// Chrome. Sets up a Fatelands literary HOT story with a forced NON-HUMAN LI, generates Scene 1, then
// advances to a Scene-2 connecting scene (passing the deck gate via _examineDeck). Captures the console
// flags + prose that prove each fix landed in OUTPUT, not just code:
//   (a) cold-open  → [OPENING:TEMP] HOT + hot render (not cold), no HOT-RENDER:REPAIR band-aid needed
//   (e) species    → [SPECIES:PREGEN] fires pre-gen + LI species anatomy present in Scene-1 prose
//   (c) under-desc → [GEN-FAIL:LI/PC/SETTING:FINAL] ✓ (silhouette anchors + place established)
//   (A) routing    → [TIER-ROUTE] scene 2 → HEAVY prompt (literary connecting scene forced heavy)
// Image endpoints mocked (no image spend). Makes Scene-1 + Scene-2 text gen calls (real, paid).
const { chromium } = require('playwright-core');
const fs = require('fs');
const log = (...a) => console.error('[VALIDATE]', ...a);

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/gemini-image'])
    await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));

  const RX = /\[OPENING:TEMP|\[SPECIES:PREGEN\]|\[GEN-FAIL:(LI|PC|SETTING)-?DESCRIPTION?:FINAL\]|\[GEN-FAIL:SETTING:FINAL\]|\[LI-DESC:FIRST-PASS\]|\[HOT-RENDER|\[HOT-CRISIS|\[TIER-ROUTE\]|\[STORY:READY\]|BEGIN-ERR|\[VAL\]|\[OPENING:TEMP:v2\]/i;
  const cap = [];
  page.on('console', m => { const t = m.text(); if (RX.test(t)) { cap.push(t.slice(0, 260)); log(t.slice(0, 200)); } });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 45000 });
  log('app ready');

  await page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    window._forceHotOpener = true;                                   // (a) force HOT opener
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.picks = s.picks || {}; Object.assign(s.picks, { world: 'Fantasy', tone: 'Earnest', genre: 'ChosenBurdened', pressure: 'ObligationBurden', flavor: 'ChosenBurdened', dynamic: 'Friends', pov: 'First', identity: { playerName: 'Sekka', partnerName: 'Ural' } });
    s.world = 'Fantasy'; s.flavor = 'ChosenBurdened'; s.genre = 'ChosenBurdened'; s.dynamic = 'Friends'; s.pov = 'first_person';
    s.loveInterest = 'Male'; s.loveInterestName = 'Ural'; s.liGender = 'male'; s.name = 'Sekka'; s.playerName = 'Sekka';
    s.resolvedWorldFlavors = [{ val: 'the_inhuman' }];               // (e) force a NON-HUMAN LI
    s.archetype = { primary: 'OPEN_VEIN', modifier: null, bound: false, canonicalLIId: null, boundAtScene: null }; s.playerMask = 'BEAUTIFUL_RUIN';
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy'; s.turnCount = 0; s.mode = 'solo';
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
  });

  log('generating Scene 1 (HOT, non-human LI)…');
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + e.message); } });
  { const t0 = Date.now(); while (Date.now() - t0 < 340000) { await page.waitForTimeout(4000); if (cap.some(l => /\[STORY:READY\]/.test(l))) break; } }
  await page.waitForTimeout(4000);

  const s1 = await page.evaluate(() => {
    const st = window.state || {};
    const dom = (document.getElementById('storyContent') || {}).textContent || '';
    return { liSpecies: st._liSpecies, liSource: st._liSpeciesSource, pcSpecies: st._playerSpecies, temp: st._openingTemperature,
             prose: (st.currentStoryText || dom || '').slice(0, 6000),
             settingChk: (typeof window._settingDescriptionCheck === 'function') ? window._settingDescriptionCheck(st.currentStoryText || dom || '') : null };
  });
  log('Scene1: LI species=' + s1.liSpecies + ' (' + s1.liSource + ') · temp=' + s1.temp + ' · prose ' + (s1.prose || '').length + 'c');

  // Advance to Scene 2 (connecting scene) to exercise (A) routing. Pass the deck gate via _examineDeck,
  // and — since the module-scoped prose lock isn't reachable from page scope — settle a fixed window for
  // the post-Scene-1 speculative preload, then wait for the submit button to actually re-enable (re-arming
  // the deck gate each poll), mirroring the built-in FF-HARNESS advance (~app.js:128883).
  log('advancing to Scene 2 (connecting → should route HEAVY)…');
  try {
    await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const arm = () => { try { const sc = document.getElementById('storyContent') || document.scrollingElement; if (sc) { sc.scrollTop = sc.scrollHeight; sc.dispatchEvent(new Event('scroll', { bubbles: true })); } window.scrollTo(0, document.body.scrollHeight); } catch (_) {} try { if (typeof window._examineDeck === 'function') window._examineDeck(); } catch (_) {} };
      try { if (typeof openBook === 'function') await openBook(); } catch (_) {}
      await sleep(18000);                          // let the speculative preload acquire + finish its lock
      arm(); await sleep(1500);
      const ai = document.getElementById('actionInput'); if (ai) { ai.value = 'I step toward him, choosing to stay.'; ai.dispatchEvent(new Event('input', { bubbles: true })); }
      const di = document.getElementById('dialogueInput'); if (di) { di.value = ''; di.dispatchEvent(new Event('input', { bubbles: true })); }
      arm(); await sleep(800);
      const t1 = Date.now(); let sb = document.getElementById('submitBtn');
      while (Date.now() - t1 < 90000) { sb = document.getElementById('submitBtn'); if (sb && sb.offsetParent !== null && !sb.disabled) break; arm(); await sleep(2500); }
      if (sb && sb.offsetParent !== null && !sb.disabled) { sb.click(); console.log('[VAL] scene-2 submit clicked'); }
      else console.log('BEGIN-ERR scene2 submit gated after wait disabled=' + (sb ? sb.disabled : 'no-btn') + ' visible=' + (sb ? (sb.offsetParent !== null) : 'no-btn'));
    });
    { const t0 = Date.now(); while (Date.now() - t0 < 260000) { await page.waitForTimeout(4000); const tc = await page.evaluate(() => (window.state && window.state.turnCount) || 0); if (tc >= 1) break; } }
  } catch (e) { log('scene-2 advance failed:', e.message); }
  await page.waitForTimeout(3000);
  const tc = await page.evaluate(() => (window.state && window.state.turnCount) || 0);
  log('after advance: turnCount=' + tc);

  const out = { captures: cap, scene1: s1, turnCountAfter: tc };
  fs.writeFileSync('/tmp/validate_fixes.json', JSON.stringify(out, null, 2));
  if (s1.prose) fs.writeFileSync('/tmp/validate_scene1.txt', s1.prose);

  // Verdict summary
  const has = rx => cap.some(l => rx.test(l));
  const tierHeavy = cap.filter(l => /\[TIER-ROUTE\]/.test(l)).map(l => l.replace(/^.*?(\[TIER-ROUTE\])/, '$1'));
  console.log('\n===== VALIDATION VERDICT =====');
  console.log('(a) cold-open  : [OPENING:TEMP] HOT=' + has(/\[OPENING:TEMP.*HOT_CRISIS/i) + ' · HOT-RENDER:REPAIR fired=' + has(/HOT-RENDER:REPAIR/i) + ' (repair firing = still cold first draft)');
  console.log('(e) species    : [SPECIES:PREGEN]=' + has(/\[SPECIES:PREGEN\]/i) + ' · LI=' + s1.liSpecies + ' · anatomy-in-prose=' + /tentacl|pupil|weave-script|chromatophore|feeler|non-human|luminous|scale|inhuman/i.test(s1.prose || ''));
  console.log('(c) under-desc : LI-final=' + (cap.find(l => /GEN-FAIL:LI-DESCRIPTION:FINAL/.test(l)) || '?').slice(0,90) + '\n                 PC-final=' + (cap.find(l => /GEN-FAIL:PC-DESCRIPTION:FINAL/.test(l)) || '?').slice(0,90) + '\n                 SETTING =' + (cap.find(l => /GEN-FAIL:SETTING:FINAL/.test(l)) || '?').slice(0,90) + '\n                 settingChk=' + JSON.stringify(s1.settingChk));
  console.log('(A) routing    : turnCount=' + tc + ' · TIER-ROUTE lines=' + JSON.stringify(tierHeavy));
  console.log('\nfull JSON → /tmp/validate_fixes.json · Scene-1 prose → /tmp/validate_scene1.txt');
  await browser.close();
})().catch(e => { console.error('[VALIDATE] FATAL', e && e.message); process.exit(1); });
