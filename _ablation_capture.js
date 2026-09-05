// ABLATION — PHASE 1: CAPTURE ONLY (Roman 2026-08-04). Build the harness + capture the REAL frozen author
// prompt. NO prose gens (author call is STUBBED). Setup gens (bible/aPlot/planner) run once to build the real
// fullSys. Freeze: fixed seed/world/PC/LI/archetype/opening. Author call identified by matching its system
// content against window.__lastAuthorPrompt.fullSys (the app's OWN oracle — NOT the largest-request heuristic
// that burned us before). Saves fullSys + user + pcBodyBible + liBodyBible + aPlot so Phase 2 can derive
// A/A'/B/C/D/E/F by pure string-deletion on this ONE frozen prompt. Shows Roman the strip-plan before any prose gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ablation';
fs.mkdirSync(DIR, { recursive: true });

// FROZEN seed (Fatelands / First-Favored literary S1). Everything pinned; opening forced HOT for a rich baseline.
const SEED = { world: 'Fantasy', flavor: 'first_favored', archetype: 'SPELLBINDER', dynamic: 'forbidden', li: 'Kael', pc: 'Sera' };

async function setup(page, seed) {
  await page.evaluate((seed) => {
    var s = window.state;
    window._devBypass = true; window._forceAudits = false;
    window._forceHotOpener = false;                // FREEZE opening (matches proven-working diag path); same for all variants
    window.__dumpAuthorPrompt = true;              // so window.__lastAuthorPrompt = {meta, fullSys} is populated
    window._isBillionaireOnboarding = function () { return false; };
    // Author-call capture + STUB (spend zero prose gens). Identify by matching system === __lastAuthorPrompt.fullSys.
    window.__capturedAuthor = null;
    var _of = window.fetch;
    window.fetch = async function (url, opts) {
      var u = (typeof url === 'string' ? url : (url && url.url) || '');
      if (/\/api\/proxy/.test(u) && opts && opts.body && !window.__capturedAuthor) {
        try {
          var b = JSON.parse(opts.body); var role = b.role || ''; var msgs = b.messages || [];
          var sysM = msgs.filter(function (m) { return m.role === 'system'; })[0];
          var sysC = sysM && (typeof sysM.content === 'string' ? sysM.content : '');
          // Identify the PROSE AUTHOR by a CONTENT SIGNATURE (not a size heuristic): role NARRATIVE_AUTHOR +
          // system begins with the architecture-laws header. The editorial NARRATIVE_AUTHOR pass starts with
          // "You are a ruthless line-editor" — excluded by the prefix. Capture the ACTUAL sent system (sysC).
          if (role === 'NARRATIVE_AUTHOR' && sysC && sysC.replace(/^\s+/, '').indexOf('═══ STORYBOUND ARCHITECTURE LAWS') === 0) {
            var userM = msgs.filter(function (m) { return m.role === 'user'; }).pop();
            window.__capturedAuthor = { fullSys: sysC, user: (userM && userM.content) || '', role: role, model: b.preferredModel || b.model || '', temperature: b.temperature, max_tokens: b.max_tokens };
            // STUB: no real prose gen fires.
            return new Response(JSON.stringify({ choices: [{ message: { content: '[[STUB — author call captured, not generated]]' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        } catch (_) {}
      }
      return _of.apply(this, arguments);
    };
    // FREEZE the seed (mirrors _consumption_probe setup)
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
    try { var fk = window._flavorVarietyKey ? window._flavorVarietyKey(s) : null; var h = {}; if (fk) h[fk] = ['a', 'b', 'c']; localStorage.setItem('sb_flavor_history', JSON.stringify(h)); } catch (_) {}
    try { localStorage.setItem('sb_witnessed_fatelands_wish_ritual', '1'); } catch (_) {}
  }, seed);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
    await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400);
  await setup(page, SEED);
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });

  const t0 = Date.now(); let cap = null;
  while (Date.now() - t0 < 240000) {
    await page.waitForTimeout(2500);
    cap = await page.evaluate(() => window.__capturedAuthor || null);
    const busy = await page.evaluate(() => { const s = window.state; return !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse); });
    if (cap) break;
    if (Date.now() - t0 > 20000 && !busy && !cap) { /* keep waiting; setup gens can be slow */ }
  }
  if (!cap) { console.error('CAPTURE FAILED — no author call intercepted in 240s'); await browser.close(); process.exit(1); }

  const snap = await page.evaluate(() => { const s = window.state || {}; return { pc: s.pcBodyBible || null, li: s.liBodyBible || null, aPlot: s.aPlot || null, openingTemp: s._openingTemperature || null }; });
  fs.writeFileSync(DIR + '/fullSys.txt', cap.fullSys);
  fs.writeFileSync(DIR + '/user.txt', cap.user);
  fs.writeFileSync(DIR + '/capture.json', JSON.stringify({ meta: { role: cap.role, model: cap.model, temperature: cap.temperature, max_tokens: cap.max_tokens, openingTemp: snap.openingTemp, seed: SEED }, pcBodyBible: snap.pc, liBodyBible: snap.li, aPlot: snap.aPlot }, null, 2));
  console.error('CAPTURED author prompt: fullSys=' + cap.fullSys.length + ' chars, user=' + (cap.user || '').length + ' chars, model=' + cap.model + ' temp=' + cap.temperature + ' openingTemp=' + snap.openingTemp);
  console.error('pcBodyBible fields: ' + (snap.pc ? Object.keys(snap.pc).join(', ') : 'NULL'));
  console.error('Saved to ' + DIR);
  await browser.close(); process.exit(0);
})().catch(e => { console.error('CAPTURE-ERR', e.message); process.exit(1); });
