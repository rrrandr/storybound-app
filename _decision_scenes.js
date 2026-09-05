// DECISION-OWNERSHIP across 5 diverse scenes (Roman 2026-08-04). NOT "which field drove this" — but "does
// Storybound have ANYTHING even attempting to own this author decision?" Generate 5 real Scene-1s (2 Fatelands
// + 3 modern), capture prose + pcBodyBible + liBodyBible + aPlot for each, so decisions can be mapped to inputs.
// Then (offline) score the fixed decision-list per scene: Owned? / Candidate owner. Recurring UNOWNED = the spec.
// Setup mirrors the proven _consumption_probe path (reaches prose reliably). STOP at 5 (no indefinite gathering).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';
fs.mkdirSync(OUT, { recursive: true });

const SEEDS = [
  { label: 'Fatelands-FF',     world: 'Fantasy', flavor: 'first_favored', archetype: 'SPELLBINDER', dynamic: 'forbidden', li: 'Kael', pc: 'Sera' },
  { label: 'Fatelands-inhuman', world: 'Fantasy', flavor: 'the_inhuman', archetype: 'DARK_VICE', dynamic: 'enemies_to_lovers', li: 'Dorian', pc: 'Mara' },
  { label: 'Modern-armoredfox', world: 'billionaire', flavor: 'billionaire_modern', archetype: 'ARMORED_FOX', dynamic: 'second_chance', li: 'Ethan', pc: 'Clara' },
  { label: 'Modern-heartwarden', world: 'billionaire', flavor: 'billionaire_modern', archetype: 'HEART_WARDEN', dynamic: 'fake_relationship', li: 'Marcus', pc: 'Nadia' },
  { label: 'Modern-openvein',   world: 'billionaire', flavor: 'billionaire_modern', archetype: 'OPEN_VEIN', dynamic: 'enemies_to_lovers', li: 'Julian', pc: 'Priya' },
];

async function setup(page, seed) {
  await page.evaluate((seed) => {
    window.__scenes = [];
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(function (fn) { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    var s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = seed.world; s.world = seed.world; s.picks.flavor = seed.flavor; s.worldSubtype = seed.flavor; s.flavor = seed.flavor;
    s.picks.dynamic = seed.dynamic; s.dynamic = seed.dynamic;
    s.loveInterest = 'Male'; s.loveInterestName = seed.li; s.liGender = 'male';
    s.archetype = { primary: seed.archetype, modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = seed.pc; s.playerName = seed.pc; s.partnerName = seed.li;
    s.identity = { playerName: seed.pc, partnerName: seed.li, displayPlayerName: seed.pc, displayPartnerName: seed.li };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.setItem('sb_witnessed_fatelands_wish_ritual', '1'); } catch (_) {}
  }, seed);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const results = [];
  for (const seed of SEEDS) {
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images']) await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await setup(page, seed);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    const t0 = Date.now(); let prose = '';
    while (Date.now() - t0 < 300000) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
      if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 90000)) { prose = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
    }
    const snap = await page.evaluate(() => { const s = window.state || {}; return { pc: s.pcBodyBible || null, li: s.liBodyBible || null, aPlot: s.aPlot || null, openingTemp: s._openingTemperature || null }; });
    results.push({ seed: seed.label, seedCfg: seed, prose: prose, pcBodyBible: snap.pc, liBodyBible: snap.li, aPlot: snap.aPlot, openingTemp: snap.openingTemp });
    fs.writeFileSync(OUT + '/scene_' + seed.label + '.json', JSON.stringify(results[results.length - 1], null, 2));
    console.error('[' + seed.label + '] prose=' + (prose || '').length + 'c pc=' + (snap.pc ? 'Y' : 'N') + ' li=' + (snap.li ? 'Y' : 'N') + ' aPlot=' + (snap.aPlot ? 'Y' : 'N') + ' openingTemp=' + snap.openingTemp);
    await page.close();
  }
  fs.writeFileSync(OUT + '/all_scenes.json', JSON.stringify(results, null, 1));
  console.error('DONE decision_scenes — ' + results.length + ' scenes saved to ' + OUT);
  await browser.close(); process.exit(0);
})().catch(e => { console.error('DEC-ERR', e.message); process.exit(1); });
