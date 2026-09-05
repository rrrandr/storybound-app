// H0 — HARNESS FIDELITY. Observable: does my harness generate state.pcBodyBible (the Character+ bible),
// and is it mask-differentiated? Capture it for OPEN_VEIN vs ARMORED_FOX. Interpretation:
//   null/empty  → harness never builds the bible (fidelity gap) OR production issue
//   identical   → generator isn't mask-driven (product issue: Character+ not steering the bible)
//   different   → bible IS generated + mask-driven → failure is downstream (delivery/influence)
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/h0';
fs.mkdirSync(DIR, { recursive: true });
const MASKS = ['OPEN_VEIN', 'ARMORED_FOX'];

function setup(page, mask) {
  return page.evaluate((mask) => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s._cachedAncestryPlayer = { normalized: 'darkwood', raw: 'darkwood' }; s._fantasyRegionOverrideApplied = false;
    s.picks.pcSpecies = 'Human'; s.picks.liSpecies = 'Wilder';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Kaelen'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.playerMask = mask; s.playermask = mask;
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Rowan'; s.playerName = 'Rowan'; s.partnerName = 'Kaelen';
    s.identity = { playerName: 'Rowan', partnerName: 'Kaelen', displayPlayerName: 'Rowan', displayPartnerName: 'Kaelen' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.setItem('sb_witnessed_fatelands_wish_ritual', '1'); } catch (_) {}
  }, mask);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const out = {};
  for (const mask of MASKS) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    // let /api/proxy through (real) so the bible actually generates; block only images
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
      await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    let cap = { mask };
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
      cap.hasGenFn = await page.evaluate(() => typeof window._generatePCBodyBible === 'function');
      await page.waitForTimeout(300); await setup(page, mask);
      await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) {} });
      // poll for the bible to populate
      { const t0 = Date.now(); while (Date.now() - t0 < 100000) { await page.waitForTimeout(3000); const has = await page.evaluate(() => !!window.state.pcBodyBible); if (has) break; } }
      cap.bible = await page.evaluate(() => window.state.pcBodyBible || null);
      cap.playerMaskResolved = await page.evaluate(() => window.state.playerMask || window.state.playermask || null);
    } catch (e) { cap.err = e.message; }
    out[mask] = cap;
    fs.writeFileSync(DIR + '/bible_' + mask + '.json', JSON.stringify(cap.bible || {}, null, 2));
    console.error('[' + mask + '] genFn=' + cap.hasGenFn + ' | pcBodyBible=' + (cap.bible ? 'PRESENT (' + Object.keys(cap.bible).length + ' keys)' : 'NULL') + ' | mask=' + cap.playerMaskResolved);
    if (cap.bible) { console.error('   signature_behavior: ' + JSON.stringify(cap.bible.signature_behavior || cap.bible.signatureBehavior || '(none)').slice(0, 120)); console.error('   core_contradiction: ' + JSON.stringify(cap.bible.core_contradiction || '(none)').slice(0, 120)); console.error('   emotional_weather: ' + JSON.stringify(cap.bible.emotional_weather || '(none)').slice(0, 120)); }
    await ctx.close(); await new Promise(r => setTimeout(r, 3000));
  }
  fs.writeFileSync(DIR + '/summary.json', JSON.stringify(out, null, 2));
  console.error('DONE h0'); await browser.close(); process.exit(0);
})();
