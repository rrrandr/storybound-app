// Live validation — Phase 2 (real generated prose). Sets up a Fatelands literary story, generates
// Scene 1, then submits ordinary wishes as real Say/Do continuation turns and captures the generated
// prose + the wish state objects + the [ORDINARY-WISH]/[FATE-BARGAIN] logs. Image endpoints mocked.
// Makes real, paid text-gen calls (Scene 1 + one per wish).
const { chromium } = require('playwright-core');
const fs = require('fs');
const log = (...a) => console.error('[WISH-PROSE]', ...a);

// Field-aware rule: the SPOKEN wish goes in the Say field (dia); a neutral action in Do (act).
const WISHES = [
  { id: 'clean-heal', action: 'I kneel beside her and press my hand to the wound.', say: 'Fate, close her wound. Take what it costs.' },
  { id: 'love-warp',  action: 'I stand before him, unable to look away.',            say: 'I wish he would love me.' }
];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/gemini-image'])
    await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  const clog = [];
  page.on('console', m => { const t = m.text(); if (/\[STORY:READY\]|\[ORDINARY-WISH|\[FATE-BARGAIN\]|\[FATE-CONSEQUENCE\]|BEGIN-ERR|SUB-ERR/i.test(t)) { clog.push(t.slice(0, 200)); } });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 45000 });

  await page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = true;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.picks = s.picks || {}; Object.assign(s.picks, { world: 'Fantasy', tone: 'Earnest', genre: 'ChosenBurdened', pressure: 'ObligationBurden', flavor: 'ChosenBurdened', dynamic: 'Friends', pov: 'First', identity: { playerName: 'Sekka', partnerName: 'Ural' } });
    s.world = 'Fantasy'; s.flavor = 'ChosenBurdened'; s.genre = 'ChosenBurdened'; s.dynamic = 'Friends'; s.pov = 'first_person';
    s.loveInterest = 'Male'; s.loveInterestName = 'Ural'; s.liGender = 'male'; s.name = 'Sekka'; s.playerName = 'Sekka';
    s.archetype = { primary: 'OPEN_VEIN', modifier: null, bound: false }; s.playerMask = 'BEAUTIFUL_RUIN';
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy'; s.turnCount = 0; s.mode = 'solo';
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
  });

  log('generating Scene 1…');
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + e.message); } });
  { const t0 = Date.now(); while (Date.now() - t0 < 340000) { await page.waitForTimeout(4000); if (clog.some(l => /\[STORY:READY\]/.test(l))) break; } }
  await page.evaluate(async () => { try { if (typeof openBook === 'function') await openBook(); } catch (_) {} });
  await page.waitForTimeout(6000);

  const results = [];
  for (const w of WISHES) {
    log('submitting wish: ' + w.id + ' → Say:"' + w.say + '"');
    const proseBefore = await page.evaluate(() => (window.state.currentStoryText || '').length);
    const tcBefore = await page.evaluate(() => window.state.turnCount || 0);
    await page.evaluate(async (w) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const arm = () => { try { const sc = document.getElementById('storyContent') || document.scrollingElement; if (sc) { sc.scrollTop = sc.scrollHeight; sc.dispatchEvent(new Event('scroll', { bubbles: true })); } window.scrollTo(0, document.body.scrollHeight); } catch (_) {} try { if (typeof window._examineDeck === 'function') window._examineDeck(); } catch (_) {} };
      await sleep(16000);                                  // let any speculative preload finish
      const ai = document.getElementById('actionInput'); if (ai) { ai.value = w.action; ai.dispatchEvent(new Event('input', { bubbles: true })); }
      const di = document.getElementById('dialogueInput'); if (di) { di.value = w.say; di.dispatchEvent(new Event('input', { bubbles: true })); }
      arm(); await sleep(1000);
      // click if present + not disabled (do NOT require visibility — a JS click works regardless)
      const t1 = Date.now(); let sb;
      while (Date.now() - t1 < 60000) { sb = document.getElementById('submitBtn'); if (sb && !sb.disabled) break; arm(); await sleep(2500); }
      if (sb && !sb.disabled) { sb.click(); console.log('SUB-ERR none — clicked'); } else console.log('SUB-ERR submit missing/disabled');
    }, w);
    // wait for the turn to advance
    let advanced = false;
    { const t0 = Date.now(); while (Date.now() - t0 < 300000) { await page.waitForTimeout(4000); const tc = await page.evaluate(() => window.state.turnCount || 0); const pl = await page.evaluate(() => (window.state.currentStoryText || '').length); if (tc > tcBefore || pl > proseBefore + 200) { advanced = true; break; } } }
    const cap = await page.evaluate(() => {
      const s = window.state;
      return { turnCount: s.turnCount, prose: (s.currentStoryText || '').slice(-2400),
        openBargains: JSON.parse(JSON.stringify(s._openFateBargains || [])),
        durable: JSON.parse(JSON.stringify(s._durableFateConsequences || [])),
        ledgerLast: (s._fateTollLedger || []).slice(-1)[0] || null };
    });
    results.push({ wish: w, advanced, wishLogs: clog.filter(l => /ORDINARY-WISH|FATE-BARGAIN|FATE-CONSEQUENCE/i.test(l)).slice(-6), ...cap });
    log('  ' + w.id + ': advanced=' + advanced + ' turnCount=' + cap.turnCount + ' durable=' + JSON.stringify(cap.durable.map(d => d.type)));
    clog.length = 0;
  }

  fs.writeFileSync('/tmp/wish_prose.json', JSON.stringify(results, null, 2));
  for (const r of results) {
    console.log('\n===== WISH: ' + r.wish.id + ' — "' + r.wish.say + '" (advanced=' + r.advanced + ') =====');
    console.log('Fate took: ' + (r.durable.map(d => d.type + (d.detail ? ' — ' + d.detail : '')).join(' | ') || '(none)'));
    console.log('bargain: ' + JSON.stringify((r.openBargains.slice(-1)[0]) || null));
    console.log('--- generated prose (tail) ---\n' + (r.prose || '(none)'));
  }
  console.log('\nfull JSON → /tmp/wish_prose.json');
  await browser.close();
})().catch(e => { console.error('[WISH-PROSE] FATAL', e && e.message); process.exit(1); });
