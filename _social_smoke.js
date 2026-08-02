// SOCIAL CONFABULATION EXPERIMENT — $0 SMOKE (Roman 2026-08-02).
// Drives the REAL handleBeginStory for 3 Thornwild shapes; STUBS /api/proxy (captures every
// real assembled prompt body, returns a permissive stub → $0, no author gen). Verifies:
//  - resolved PC/LI species, Thornwild state
//  - whether the live social slice (CROSS-CULTURAL LEXICON / Disfavored / asymmetry) is present
//    in the REAL assembled prompt as expected (shapes 1&3 yes, shape 2 no)
//  - that a REAL production prompt (not hand-built) is what would be sent.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/social_smoke.json';

const SHAPES = [
  { key: '1_outsiderPC_wildfolkLI', pc: 'Human',        li: 'Wilder', liGender: 'male',   expectSlice: true  },
  { key: '2_wildfolkPC_outsiderLI', pc: 'Wilder',       li: 'Human',  liGender: 'male',   expectSlice: false },
  { key: '3_favoredPC_wildfolkLI',  pc: 'First Favored',li: 'Wilder', liGender: 'male',   expectSlice: true  },
];

// markers of the LIVE social slice / social canon in the assembled prompt
const SOCIAL_MARKERS = [
  'CROSS-CULTURAL LEXICON', 'ASYMMETRY RULE', 'Unmarked', 'Dayblind', 'Thornbred',
  'Disfavored', 'OUTSIDER HUMANITY PRESERVATION', 'WILDFOLK RESPONSE TONE', 'Brushborn'
];

function setup(page, shape) {
  return page.evaluate((shape) => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy';
    s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    // Force region=the_thornwild via ancestry ALIAS (identityLock:false → species stays controlled by picks).
    s.fantasyRegion = 'the_thornwild'; s.picks.fantasyRegion = 'the_thornwild';
    s._cachedAncestryPlayer = { normalized: 'darkwood', raw: 'darkwood' };
    s._fantasyRegionOverrideApplied = false;
    s.picks.pcSpecies = shape.pc; s.picks.liSpecies = shape.li;
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = shape.liGender === 'male' ? 'Male' : 'Female'; s.loveInterestName = 'Dorian'; s.liGender = shape.liGender;
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Dorian';
    s.identity = { playerName: 'Mara', partnerName: 'Dorian', displayPlayerName: 'Mara', displayPartnerName: 'Dorian' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
  }, shape);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const results = [];
  for (const shape of SHAPES) {
    const page = await (await browser.newContext()).newPage();
    const bodies = [];
    // capture EVERY /api/proxy body; return a permissive stub ($0 — no real author gen)
    await page.route('**/api/proxy', async (route) => {
      try { bodies.push(route.request().postData() || ''); } catch (_) {}
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], content: '{"ok":true}' }) });
    });
    for (const pat of ['**/api/mistral-proxy', '**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/orchestrator', '**/api/anthropic-proxy', '**/api/chatgpt-proxy', '**/api/deepseek-proxy'])
      await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], content: '{"ok":true}' }) }));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await setup(page, shape);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    // let the setup+assembly run; author is stubbed so it won't produce prose, but the prompt IS assembled+sent
    await page.waitForTimeout(25000);
    const resolved = await page.evaluate(() => ({
      pcSpecies: window.state._playerSpecies || window.state.picks && window.state.picks.pcSpecies || null,
      liSpecies: window.state._liSpecies || null,
      fantasyRegion: window.state.fantasyRegion || null,
      sysPromptLen: (typeof window.state.sysPrompt === 'string') ? window.state.sysPrompt.length : 0,
    }));
    // find the largest captured body (the author call) + scan all bodies for social markers
    const sorted = bodies.slice().sort((a, b) => b.length - a.length);
    const biggest = sorted[0] || '';
    const allText = bodies.join('\n\n');
    try { fs.writeFileSync('/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/body_' + shape.key + '.txt', biggest); } catch (_) {}
    const OTHER = ['BECOMING FIELD', 'CANONICAL FORMS', 'THE RELIQUARY', 'THORNWILD', 'FIRST FAVORED', 'alignment-sense', 'Oath of the Root', 'Becoming'];
    const otherHits = OTHER.filter(m => allText.includes(m));
    console.error(`   thornwild-content present: [${otherHits.join(', ')}]`);
    const markerHits = SOCIAL_MARKERS.filter(m => allText.includes(m));
    const sliceInBiggest = SOCIAL_MARKERS.filter(m => biggest.includes(m));
    results.push({
      shape: shape.key, expectSlice: shape.expectSlice, resolved,
      proxyCalls: bodies.length, biggestBodyLen: biggest.length,
      socialMarkersAnywhere: markerHits, socialMarkersInAuthorPrompt: sliceInBiggest,
      slicePresent: markerHits.length > 0,
    });
    console.error(`[${shape.key}] pc=${resolved.pcSpecies} li=${resolved.liSpecies} region=${resolved.fantasyRegion} sysLen=${resolved.sysPromptLen} proxyCalls=${bodies.length} biggest=${biggest.length}c social=[${markerHits.join(',')}] expectSlice=${shape.expectSlice}`);
    await page.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.error('\nwrote ' + OUT);
  await browser.close(); process.exit(0);
})();
