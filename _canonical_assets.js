// $0 CANONICAL VISUAL ASSET RULE — if a visual element has a canonical appearance, feed it to the
// renderer as a REFERENCE IMAGE (visual first, text second). Tiered registry + resolver so the adapter's
// canonical-asset decisions live in one declarative place. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/Users/romantsukerman/storybound-app/public/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._CANONICAL_VISUAL_ASSETS && typeof window._resolveCanonicalAssets === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const A = window._CANONICAL_VISUAL_ASSETS;
    // registry: the Tier-1 canonical assets are declared with tier + governs
    const tier1 = ['kwisheen_anatomy', 'wish_burst', 'manta_cloak', 'character_casting'].every(k => A[k] && A[k].tier === 1 && A[k].governs);
    const speciesGoverns = /body plan|proportions|tentacle/i.test(A.kwisheen_anatomy.governs);
    const burstHasBothOutcomes = !!(A.wish_burst.assetByOutcome && A.wish_burst.assetByOutcome.clean && A.wish_burst.assetByOutcome.twisted);
    const characterCastingDeclared = /harvested crop|Casting Library/i.test(A.character_casting.plumbing);

    // resolver: a twisted wish → the twisted burst emblem; clean → clean; rejected → none
    const twisted = window._resolveCanonicalAssets({ wishOutcome: 'twisted' });
    const clean = window._resolveCanonicalAssets({ wishOutcome: 'clean' });
    const rejected = window._resolveCanonicalAssets({ wishOutcome: 'rejected' });
    const burstResolved = twisted.some(a => a.id === 'wish_burst' && /Twisted/.test(a.path) && a.tier === 1)
      && clean.some(a => a.id === 'wish_burst' && /Clean/.test(a.path)) && !rejected.some(a => a.id === 'wish_burst');
    // manta wardrobe → the manta garment reference
    const manta = window._resolveCanonicalAssets({ wardrobe: 'a worn manta-cloak' });
    const mantaResolved = manta.some(a => a.id === 'manta_cloak' && /Manta_Cloak/.test(a.path));
    // both together
    const both = window._resolveCanonicalAssets({ wishOutcome: 'twisted', wardrobe: 'manta-cloak' });
    const bothResolved = both.length === 2 && both.some(a => a.id === 'wish_burst') && both.some(a => a.id === 'manta_cloak');
    // empty ctx → nothing
    const none = window._resolveCanonicalAssets({});
    const emptyIsNone = none.length === 0;
    // "borrow the graphic language" — labels say STYLE ONLY, not "recreate this image"
    const labelsAreStyleOnly = twisted.every(a => /STYLE ONLY|match the STYLE|not the (figure|wearer)/i.test(a.label)) && manta.every(a => /STYLE ONLY|not the wearer/i.test(a.label));

    return { tier1, speciesGoverns, burstHasBothOutcomes, characterCastingDeclared, burstResolved, mantaResolved, bothResolved, emptyIsNone, labelsAreStyleOnly,
      assets: { species: A.kwisheen_anatomy.asset, mantaAsset: A.manta_cloak.asset, burstClean: A.wish_burst.assetByOutcome.clean, burstTwisted: A.wish_burst.assetByOutcome.twisted } };
  });

  await browser.close();

  // the declared Tier-1 image assets must actually exist on disk (a registry pointing at missing files is a lie)
  const assetPaths = [R.assets.species, R.assets.mantaAsset, R.assets.burstClean, R.assets.burstTwisted];
  const allAssetsExist = assetPaths.every(p => p && fs.existsSync(DIR + p.replace(/^\//, '')));

  const checks = [
    ['registry: Tier-1 canonical assets declared with tier + governs (anatomy/burst/garment/character)', R.tier1],
    ['registry: species anatomy governs body-plan / proportions / tentacle topology', R.speciesGoverns],
    ['registry: the wish burst declares both clean + twisted emblems', R.burstHasBothOutcomes],
    ['registry: the recurring-character asset is declared (casting-sourced)', R.characterCastingDeclared],
    ['resolver: a twisted wish → the twisted burst emblem; clean → clean; rejected → none', R.burstResolved],
    ['resolver: a manta wardrobe → the manta garment reference', R.mantaResolved],
    ['resolver: burst + garment both resolve together', R.bothResolved],
    ['resolver: an empty context resolves to no references', R.emptyIsNone],
    ['CONDITIONING: labels say "match the STYLE only", not "recreate this image"', R.labelsAreStyleOnly],
    ['every declared Tier-1 image asset exists on disk (no dangling references)', allAssetsExist]
  ];

  let pass = 0, fail = 0;
  console.log('\n  CANONICAL VISUAL ASSET RULE — visual first, text second  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
