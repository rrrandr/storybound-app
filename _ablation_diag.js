// DIAGNOSTIC: why did author-prompt capture fail? Mirror _consumption_probe's WORKING setup (reaches prose),
// add __dumpAuthorPrompt + a proxy TRACE. Log every /api/proxy call (role, sys length, sys-head), whether
// window.__lastAuthorPrompt ever sets, and prefix-match status. Stub big author-like calls to avoid prose spend.
const { chromium } = require('playwright-core');
const fs = require('fs');
const SEED = { world: 'Fantasy', flavor: 'first_favored', archetype: 'SPELLBINDER', dynamic: 'forbidden', li: 'Kael', pc: 'Sera' };

async function setup(page, seed) {
  await page.evaluate((seed) => {
    window.__trace = [];
    window.__dumpAuthorPrompt = true;
    var _of = window.fetch;
    window.fetch = async function (url, opts) {
      var u = (typeof url === 'string' ? url : (url && url.url) || '');
      if (/\/api\/proxy/.test(u) && opts && opts.body) {
        var role = '', syslen = 0, head = '', lapSet = !!(window.__lastAuthorPrompt && window.__lastAuthorPrompt.fullSys), pfx = false;
        try {
          var b = JSON.parse(opts.body); role = b.role || b.preferredModel || b.model || '';
          var sysM = (b.messages || []).filter(function (m) { return m.role === 'system'; })[0];
          var sysC = sysM && typeof sysM.content === 'string' ? sysM.content : '';
          syslen = sysC.length; head = sysC.slice(0, 46).replace(/\s+/g, ' ');
          if (lapSet) { var f = window.__lastAuthorPrompt.fullSys; pfx = sysC.length >= f.length && sysC.slice(0, f.length) === f; }
        } catch (_) {}
        window.__trace.push({ t: Date.now(), role: role, syslen: syslen, head: head, lapSet: lapSet, pfx: pfx });
        // Stub the author-like call (prefix match) to avoid prose spend; let everything else through.
        if (pfx) return new Response(JSON.stringify({ choices: [{ message: { content: '[[STUB]]' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return _of.apply(this, arguments);
    };
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
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => { const t = m.text(); if (/BEGIN-ERR|SCENE\]|error|Error|throw|TIER-ROUTE|MULTI-PASS|LEGACY/.test(t)) console.error('  PAGE> ' + t.slice(0, 160)); });
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
    await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400);
  await setup(page, SEED);
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });

  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    await page.waitForTimeout(5000);
    const st = await page.evaluate(() => { const s = window.state; return { lap: !!(window.__lastAuthorPrompt && window.__lastAuthorPrompt.fullSys), nProxy: (window.__trace || []).length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), turn: s.turnCount }; });
    console.error(`  [${Math.round((Date.now()-t0)/1000)}s] lapSet=${st.lap} nProxy=${st.nProxy} busy=${st.busy} turn=${st.turn}`);
    if (st.lap && st.nProxy > 0) { const anyPfx = await page.evaluate(() => (window.__trace||[]).some(x=>x.pfx)); if (anyPfx) break; }
  }
  const trace = await page.evaluate(() => window.__trace || []);
  console.error('\n=== PROXY TRACE (' + trace.length + ' calls) ===');
  trace.forEach((c, i) => console.error(`  ${i} role=${(c.role||'?').slice(0,22).padEnd(22)} syslen=${String(c.syslen).padStart(6)} lapSet=${c.lapSet?'Y':'n'} pfx=${c.pfx?'MATCH':'-'}  "${c.head}"`));
  const lap = await page.evaluate(() => window.__lastAuthorPrompt ? window.__lastAuthorPrompt.fullSys.length : null);
  console.error('\n__lastAuthorPrompt.fullSys length: ' + lap);
  await browser.close(); process.exit(0);
})().catch(e => { console.error('DIAG-ERR', e.message); process.exit(1); });
