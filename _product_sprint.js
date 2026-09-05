// PRODUCT-VALIDATION SPRINT (Roman 2026-08-02). Generate first, read as a reader, score later.
// One Fatelands/Thornwild story: real opening + 5 consecutive turns. Captures the author's prose per
// scene (the /api/proxy response of the heavy author call) + prompt sizes. NO code inspection here.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/sprint';
fs.mkdirSync(DIR, { recursive: true });

// Natural, minimal, forward-moving player moves — let the PLANNER carry progression, not me.
const TURNS = [
  'I ask the person beside me what this place is and why everyone is so afraid.',
  'I decide I want to understand the danger here, and I press for the truth.',
  'I choose to help, even though it puts me at risk, and I say so out loud.',
  'I try to leave this place — and I want to take them with me.',
  'I face whatever is coming instead of running from it.',
];

function setup(page) {
  return page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.fantasyRegion = 'the_thornwild'; s.picks.fantasyRegion = 'the_thornwild';
    s._cachedAncestryPlayer = { normalized: 'darkwood', raw: 'darkwood' }; s._fantasyRegionOverrideApplied = false;
    s.picks.pcSpecies = 'Human'; s.picks.liSpecies = 'Wilder';  // outsider PC learns the world; Wildfolk LI
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Kaelen'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Rowan'; s.playerName = 'Rowan'; s.partnerName = 'Kaelen';
    s.identity = { playerName: 'Rowan', partnerName: 'Kaelen', displayPlayerName: 'Rowan', displayPartnerName: 'Kaelen' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const authorCalls = []; // {reqLen, resp} for large (author) /api/proxy calls, in order
  await page.route('**/api/proxy', async (route) => {
    const body = route.request().postData() || '';
    if (body.length > 90000) { // author calls are ~200k; planners/classifiers are small
      const resp = await route.fetch(); const text = await resp.text();
      let content = text; try { const j = JSON.parse(text); content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || text; } catch (_) {}
      authorCalls.push({ reqLen: body.length, resp: content, at: Date.now() });
      console.error('  >> author call captured (req ' + body.length + 'c, resp ' + String(content).length + 'c)');
      await route.fulfill({ response: resp, body: text }); return;
    }
    await route.continue();
  });
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
    await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  page.on('console', m => { const t = m.text(); if (/BEGIN-ERR|ADVANCE-ERR|TIER-ROUTE/i.test(t)) console.error('  log>', t.slice(0, 110)); });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400); await setup(page);

  const waitIdle = async (label, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { await page.waitForTimeout(3000); const busy = await page.evaluate(() => !!(window.state._isAdvancingScene || window.state._stagedSubmitting || window.state._stagedAwaitingProse)); if (!busy && (Date.now() - t0) > 9000) return; } console.error('  ('+label+' hit maxMs)'); };

  console.error('[opening] generating…');
  const before0 = authorCalls.length;
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  await waitIdle('opening', 200000);
  console.error('  opening captured ' + (authorCalls.length - before0) + ' author call(s)');

  for (let i = 0; i < TURNS.length; i++) {
    const before = authorCalls.length;
    console.error('[turn ' + (i + 1) + '] "' + TURNS[i].slice(0, 50) + '…"');
    await page.evaluate((act) => {
      const setV = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
      setV('actionInput', act); setV('gnActionInput', act); setV('dialogueInput', ''); setV('gnDialogueInput', '');
      const b = document.getElementById('submitBtn'); if (b) { b.disabled = false; b.click(); }
    }, TURNS[i]);
    await waitIdle('turn' + (i + 1), 200000);
    console.error('  turn ' + (i + 1) + ' captured ' + (authorCalls.length - before) + ' author call(s)');
  }

  // Persist every captured author response in order; also a clean scene-per-file view (last big call per phase).
  fs.writeFileSync(DIR + '/all_author_calls.json', JSON.stringify(authorCalls.map(c => ({ reqLen: c.reqLen, respLen: (c.resp || '').length })), null, 2));
  authorCalls.forEach((c, idx) => fs.writeFileSync(DIR + '/call_' + String(idx + 1).padStart(2, '0') + '.txt', String(c.resp || '')));
  console.error('\nTOTAL author calls captured: ' + authorCalls.length + ' → ' + DIR);
  await browser.close(); process.exit(0);
})();
