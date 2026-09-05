// Headless A/B: Grok-HEAVY (cold+warm) vs Mistral-HEAVY vs Grok-LITE on the SAME real prompts.
// Drives the LIVE app at localhost:3000 via system Chrome; sets up a Fatelands story (mirrors Roman's
// run), generates Scene 1 (captures the HEAVY prompt), best-effort advances to Scene 2 (captures LITE),
// then runs window._authorModelABTest(). Saves cost table + prose to /tmp. Mocks image endpoints so no
// image spend. Makes the story-gen calls + 3-4 A/B model calls (real, paid).
const { chromium } = require('playwright-core');
const fs = require('fs');
const log = (...a) => console.error('[HARNESS]', ...a);

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/gemini-image'])
    await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  const clog = [];
  page.on('console', m => { const t = m.text(); if (/\[STORY:READY\]|\[AB\]|\[TIER-ROUTE\]|\[CACHE:ROUTE\]|BEGIN-ERR|SUB-ERR|LITE-CAP/i.test(t)) { clog.push(t.slice(0, 220)); log(t.slice(0, 200)); } });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function' && typeof window._authorModelABTest === 'function', { timeout: 45000 });
  log('app ready');

  // Set up a Fatelands literary story (mirror Roman's run: Fantasy / ChosenBurdened / Friends / First / fling).
  await page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.picks = s.picks || {}; Object.assign(s.picks, { world: 'Fantasy', tone: 'Earnest', genre: 'ChosenBurdened', pressure: 'ObligationBurden', flavor: 'ChosenBurdened', dynamic: 'Friends', pov: 'First', identity: { playerName: 'Sekka', partnerName: 'Ural' } });
    s.world = 'Fantasy'; s.flavor = 'ChosenBurdened'; s.genre = 'ChosenBurdened'; s.dynamic = 'Friends'; s.pov = 'first_person';
    s.loveInterest = 'Male'; s.loveInterestName = 'Ural'; s.liGender = 'male'; s.name = 'Sekka'; s.playerName = 'Sekka';
    s.archetype = { primary: 'OPEN_VEIN', modifier: null, bound: false, canonicalLIId: null, boundAtScene: null }; s.playerMask = 'BEAUTIFUL_RUIN';
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy'; s.turnCount = 0; s.mode = 'solo';
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
  });

  log('generating Scene 1 (captures HEAVY prompt)…');
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + e.message); } });
  { const t0 = Date.now(); while (Date.now() - t0 < 320000) { await page.waitForTimeout(4000); if (clog.some(l => /\[STORY:READY\]/.test(l))) break; } }
  // HEAVY prompt = the real assembled system prompt on state.sysPrompt (~78k prose-stack; the
  // cache-relevant chunk Scene 1 + every HEAVY continuation reuse). Window-readable — no capture needed.
  const heavyChars = await page.evaluate(() => {
    try {
      const sys = window.state && window.state.sysPrompt;
      if (sys && sys.length > 5000) { window.state._lastHeavyAuditPrompt = { system: sys, act: 'She steps toward him, choosing to stay.', dia: '', turn: 1 }; return sys.length; }
      return 0;
    } catch (e) { return 0; }
  });
  log('HEAVY prompt (state.sysPrompt) chars =', heavyChars);
  // LITE not captured this run (deck gate blocks a headless Scene-2 submit on story 1). Grok-LITE
  // will be skipped; the two key questions (Grok-HEAVY cache benefit + Mistral-HEAVY) use HEAVY only.

  log('running _authorModelABTest()…');
  const res = await page.evaluate(async () => { try { return await window._authorModelABTest(); } catch (e) { return { error: e.message }; } });

  fs.writeFileSync('/tmp/author_model_ab.json', JSON.stringify(res, null, 2));
  if (res && res.rows) {
    const table = res.rows.filter(r => !r.error).map(r => ({ config: r.label, served: r.served, prompt_tok: r.promptTok, cached_tok: r.cachedTok, out_tok: r.outTok, cost_usd: r.costUsd, ms: r.ms, prose_chars: r.chars }));
    console.log('\n=== COST TABLE ===\n' + JSON.stringify(table, null, 2));
    res.rows.forEach(r => { if (r.text) fs.writeFileSync('/tmp/ab_' + r.label.replace(/[^a-z0-9]+/gi, '_') + '.txt', r.text); });
    console.log('\nProse written to /tmp/ab_*.txt');
  } else {
    console.log('\n=== RESULT ===\n' + JSON.stringify(res, null, 2));
  }
  await browser.close();
})().catch(e => { console.error('[HARNESS] FATAL', e && e.message); process.exit(1); });
