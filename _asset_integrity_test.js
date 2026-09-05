// ASSET-INTEGRITY INVARIANT TEST — $0, no generation. Proves the guard actually fires.
// A guard that has never been seen to fail is not a guard; it is a comment.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._verifyReferenceAssets === 'function'
    && typeof window._assertReferenceAssets === 'function'
    && typeof window._stageACanonRefs === 'function', { timeout: 40000 });

  // 1) HEALTHY: the real, just-repaired anchor set must verify clean.
  const healthy = await page.evaluate(async () => await window._verifyReferenceAssets(null));
  console.log(`1. healthy sweep     : ok=${healthy.ok} checked=${healthy.checked} missing=${healthy.missing.length}`);
  if (!healthy.ok) console.log('   ' + healthy.missing.map(m => m.species + ' slot ' + m.slot + ': ' + m.path).join('\n   '));

  // 2) BROKEN: point a required anchor at a file that does not exist → assert MUST throw.
  const broken = await page.evaluate(async () => {
    const sp = window._STAGED_SPECIES_CONTRACTS.kwisheen;
    const original = sp.anchorImages.slice();
    sp.anchorImages = ['/assets/Fatelands/DOES_NOT_EXIST_v9.jpg'].concat(original.slice(1));
    let threw = null;
    try { await window._assertReferenceAssets(['kwisheen']); }
    catch (e) { threw = String(e.message).split('\n')[0]; }
    // 3) and Stage A itself must refuse rather than quietly returning zero refs
    let stageAThrew = null, stageARefs = null;
    try { stageARefs = (await window._stageACanonRefs([{ name: 'Vael', species: 'Kwisheen' }], 'underwater')).length; }
    catch (e) { stageAThrew = String(e.message).split('\n')[0]; }
    // 4) explicit override must downgrade to a warning
    window._assetIntegrity = false;
    let overrideThrew = null;
    try { await window._assertReferenceAssets(['kwisheen']); } catch (e) { overrideThrew = String(e.message).split('\n')[0]; }
    window._assetIntegrity = undefined;
    sp.anchorImages = original;
    return { threw, stageAThrew, stageARefs, overrideThrew };
  });
  console.log(`2. missing anchor    : ${broken.threw ? 'THREW ✓' : 'DID NOT THROW ✗'}  ${broken.threw || ''}`);
  console.log(`3. Stage A refuses   : ${broken.stageAThrew ? 'THREW ✓' : 'returned ' + broken.stageARefs + ' refs ✗'}`);
  console.log(`4. override honoured : ${broken.overrideThrew ? 'THREW ✗ (should not)' : 'continued ✓'}`);

  const pass = healthy.ok && broken.threw && broken.stageAThrew && !broken.overrideThrew;
  console.log(`\n${pass ? 'PASS — the invariant fires, blocks Stage A, and respects its override.' : 'FAIL — see above.'}`);
  await browser.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
