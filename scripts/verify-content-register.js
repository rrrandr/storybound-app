// CONTENT-REGISTER REGRESSION SUITE — guards the iOS-stays-safe invariant against
// boot-order + reset regressions (the class of bug that silently disabled safe mode).
// $0 — no author/image LLM calls. Requires the dev server at localhost:3000.
// Run: npm run verify:content-register
const { chromium } = require('playwright-core');
const fs = require('fs');

async function freshPage(asIOS) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  // image blocks so nothing wedges if a path tries to render
  for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(p, r => r.fulfill({ status:500, body:'{}' }));
  if (asIOS) await page.addInitScript(() => { window.__STORYBOUND_PLATFORM = 'ios_app_store'; });
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.state.contentMode != null && typeof window._applyContentRegister === 'function', { timeout:40000 });
  return { browser, page };
}

(async () => {
  const results = [];
  const assert = (name, cond, detail) => { results.push({ name, pass: !!cond, detail }); };

  // 1) simulated web → full
  { const { browser, page } = await freshPage(false);
    const r = await page.evaluate(() => ({ cm: state.contentMode, reg: state.contentRegister }));
    assert('1. web boot → contentMode "full"', r.cm === 'full' && r.reg === 'FULL_WEB', JSON.stringify(r));
    await browser.close(); }

  // 2) simulated iOS → safe
  { const { browser, page } = await freshPage(true);
    const r = await page.evaluate(() => ({ cm: state.contentMode, reg: state.contentRegister, irm: state.intimacyRenderMode, eea: state.explicitEmbodimentAuthorized }));
    assert('2. iOS boot → contentMode "safe"', r.cm === 'safe' && r.reg === 'APPLE_SAFE' && r.irm === 'metaphorical_safe' && r.eea === false, JSON.stringify(r));
    await browser.close(); }

  // 3) new story on iOS → still safe (drive the real new-in-world path)
  { const { browser, page } = await freshPage(true);
    const r = await page.evaluate(async () => {
      let threw = null;
      try { if (typeof window.startNewInWorld === 'function') await window.startNewInWorld(); } catch (e) { threw = e.message; }
      return { cm: state.contentMode, reg: state.contentRegister, threw };
    });
    assert('3. new story on iOS → still "safe"', r.cm === 'safe' && r.reg === 'APPLE_SAFE', JSON.stringify(r));
    await browser.close(); }

  // 4) restore save on iOS → still safe. Snapshots don't persist contentMode, but a
  //    FUTURE import could; simulate a clobber and confirm the re-assertion hook (which
  //    the restore path now calls) corrects iOS back to safe.
  { const { browser, page } = await freshPage(true);
    const r = await page.evaluate(() => {
      state.contentMode = 'full'; state.contentRegister = 'FULL_WEB';   // simulate a bad restore import
      window._applyContentRegister();                                   // hook the restore/reset paths invoke
      return { cm: state.contentMode, reg: state.contentRegister };
    });
    assert('4. restore save on iOS → still "safe"', r.cm === 'safe' && r.reg === 'APPLE_SAFE', JSON.stringify(r));
    await browser.close(); }

  // 5) reset session on iOS → still safe. Same mechanism the auth-reset path re-asserts.
  { const { browser, page } = await freshPage(true);
    const r = await page.evaluate(() => {
      state.contentMode = 'full'; state.contentRegister = 'FULL_WEB';   // simulate a reset that rebuilt to default
      window._applyContentRegister();
      return { cm: state.contentMode, reg: state.contentRegister };
    });
    assert('5. reset session on iOS → still "safe"', r.cm === 'safe' && r.reg === 'APPLE_SAFE', JSON.stringify(r));
    await browser.close(); }

  // Static wiring: the reset transitions actually CALL the re-assertion (ties 3-5 to prod).
  const src = fs.readFileSync('public/app.js', 'utf8');
  const inFn = (name) => { const i = src.indexOf('function ' + name); if (i < 0) return false; return src.slice(i, i + 4000).includes('_applyContentRegister()'); };
  assert('static: resetForNewStory calls _applyContentRegister', inFn('resetForNewStory'));
  assert('static: performAuthReset calls _applyContentRegister', inFn('performAuthReset'));

  let allPass = true;
  for (const r of results) { console.log((r.pass ? '✓' : '✗') + ' ' + r.name + (r.pass ? '' : '   ← ' + (r.detail||''))); if (!r.pass) allPass = false; }
  console.log('\n' + (allPass ? '✓✓ ALL PASS — iOS hard-locked to APPLE_SAFE across boot, new-story, restore, reset.' : '✗ FAILURES ABOVE'));
  process.exit(allPass ? 0 : 1);
})().catch(e => { console.error('DRIVER-ERR', e.message); process.exit(2); });
