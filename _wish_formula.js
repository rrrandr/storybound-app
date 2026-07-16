// $0 verification of the regional formal public-wish forms + the "first wish uses the
// formal statement" wiring for a first Fatelands story. No paid endpoints.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._buildFormalPublicWishDirective === 'function' && window._REGIONAL_WISH_FORMULAS, { timeout: 40000 });

  const R = await page.evaluate(() => {
    const F = window._REGIONAL_WISH_FORMULAS;
    const dir = (k) => window._buildFormalPublicWishDirective(k) || '';
    return {
      regionCount: Object.keys(F).length,
      gloam: dir('gloamwater_bay'),
      gloamSpaced: dir('Gloamwater Bay'),      // normalization
      unknown: dir('nowhere-land'),            // → interregional fallback
      verge: dir('the_ashen_verge'),
      thornwild: dir('the_thornwild'),
      veilwood: dir('the_veilwood'),
      allHaveParts: Object.keys(F).every(k => F[k].formal && F[k].short && F[k].witness && F[k].fear && F[k].name),
      allPlaceholders: Object.keys(F).every(k => /WISH\]/i.test(F[k].formal) && /\[SACRIFICE\]/.test(F[k].formal)),
    };
  });
  await browser.close();

  const checks = [
    ['all 9 regional forms + interregional fallback defined, fully populated', R.regionCount >= 9 && R.allHaveParts && R.allPlaceholders],
    ['Gloamwater → The Tidal Asking (five-element structure)', /FORMAL PUBLIC-WISH FORM — The Tidal Asking/.test(R.gloam) && /five felt parts — INVOCATION/.test(R.gloam) && /STANDING/.test(R.gloam) && /PETITION/.test(R.gloam) && /OFFERING/.test(R.gloam) && /SUBMISSION/.test(R.gloam) && /turning tide/.test(R.gloam)],
    ['region key normalizes ("Gloamwater Bay" == "gloamwater_bay")', R.gloamSpaced === R.gloam && R.gloam.length > 0],
    ['unknown region → interregional Open Form of Fate fallback', /The Open Form of Fate/.test(R.unknown)],
    ['Ashen Verge = Anchored Wish (Fold/oath, NOT martial)', /The Anchored Wish/.test(R.verge) && /the Fold/.test(R.verge) && /NOT a martial society/.test(R.verge)],
    ['Thornwild = Cursed Asking (a wish cannot lift the curse)', /The Cursed Asking/.test(R.thornwild) && /wish CANNOT lift a curse/.test(R.thornwild)],
    ['Veilwood = First Favored Declaration (direct desire, not evasive)', /The First Favored Declaration/.test(R.veilwood) && /DIRECT and unsubtle/.test(R.veilwood)],
    ['forms never phrase the offer as a completed trade / Fate-compelling', /NEVER phrase the offer as a completed trade/.test(R.gloam) && /NEVER imply the formula compels Fate/.test(R.gloam)],
    ['first-wish weight: full form for a new reader', /the FIRST public wish a new reader sees should be spoken in the full, weighty form/.test(R.gloam)],
  ];
  let pass = 0, fail = 0;
  console.log('\n  REGIONAL FORMAL WISH FORMS  ($0)\n  ' + '─'.repeat(58));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
