// SOCIAL — PER-TURN PRODUCTION REGRESSION (Roman 2026-08-02). Main path only.
// Real opening + ONE real turn via window._advanceStagedScene. Intercepts the TURN author prompt,
// asserts the INVARIANT (the constraining owner is the TERMINAL behavioral instruction of the system
// message — nothing meaningful after it), then scores the generated turn.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad';

const TURN_ACTION = 'We push in out of the dusk cold to the crowded waystation common room — Wildfolk and outsider travellers packed along the benches. An outsider traveller by the fire looks my companion over and, loud enough for the whole room, makes a demeaning assumption about them for being Wildfolk.';

function setup(page) {
  return page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.fantasyRegion = 'the_thornwild'; s.picks.fantasyRegion = 'the_thornwild';
    s._cachedAncestryPlayer = { normalized: 'darkwood', raw: 'darkwood' }; s._fantasyRegionOverrideApplied = false;
    s.picks.pcSpecies = 'Human'; s.picks.liSpecies = 'Wilder';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Dorian'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Dorian';
    s.identity = { playerName: 'Mara', partnerName: 'Dorian', displayPlayerName: 'Mara', displayPartnerName: 'Dorian' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const calls = []; // {sys, user} for every /api/proxy NARRATIVE_AUTHOR call
  await page.route('**/api/proxy', async (route) => {
    try { const b = JSON.parse(route.request().postData() || '{}'); if (b && b.messages) calls.push({ role: b.role, sys: (b.messages[0] && b.messages[0].content) || '', user: (b.messages.slice(-1)[0] || {}).content || '' }); } catch (_) {}
    await route.continue(); // real grok
  });
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
    await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  page.on('console', m => { const t = m.text(); if (/BEGIN-ERR|STAGED|advanceStaged/i.test(t)) console.error('  log>', t.slice(0, 120)); });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function' && typeof window._advanceStagedScene === 'function', { timeout: 40000 });
  await page.waitForTimeout(400); await setup(page);
  console.error('[1/3] generating REAL opening…');
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  // wait for opening to finish
  { const t0 = Date.now(); while (Date.now() - t0 < 180000) { await page.waitForTimeout(3000); const st = await page.evaluate(() => ({ busy: !!(window.state._isAdvancingScene || window.state._stagedSubmitting || window.state._stagedAwaitingProse), tc: window.state.turnCount || 0, scenes: (window.__scenes || []).length })); if (!st.busy && st.tc >= 1) break; if (Date.now() - t0 > 120000) break; } }
  const openingCalls = calls.length;
  console.error('  opening done (' + openingCalls + ' proxy calls so far)');
  console.error('[2/3] driving ONE real turn via _advanceStagedScene…');
  await page.evaluate(async (act) => { try { await window._advanceStagedScene(act, ''); } catch (e) { console.log('ADVANCE-ERR ' + (e && e.message)); } }, TURN_ACTION);
  { const t0 = Date.now(); while (Date.now() - t0 < 180000) { await page.waitForTimeout(3000); const st = await page.evaluate(() => ({ busy: !!(window.state._isAdvancingScene || window.state._stagedSubmitting || window.state._stagedAwaitingProse), tc: window.state.turnCount || 0 })); if (!st.busy && st.tc >= 1 && (Date.now() - t0) > 8000) break; } }
  // find the TURN author call (has TURN INSTRUCTIONS in system, appeared after the opening)
  const turnCalls = calls.slice(openingCalls).filter(c => /TURN INSTRUCTIONS/.test(c.sys) && c.sys.length > 20000);
  const turn = turnCalls[turnCalls.length - 1] || calls.slice(openingCalls).sort((a,b)=>b.sys.length-a.sys.length)[0];
  console.error('[3/3] verifying invariant + scoring…');
  let verdict = { found: !!turn };
  if (turn) {
    const sys = turn.sys;
    const oi = sys.indexOf('PERCEIVED NATURE OF THE WILDFOLK');
    const prec = sys.includes('everything the canon above tells you about the Field');
    const tail = sys.slice(oi < 0 ? 0 : oi);
    const afterOwner = sys.slice(oi < 0 ? sys.length : (oi + tail.length)); // content after owner block
    // INVARIANT: owner present, precedence present, owner is TERMINAL (nothing substantive after it in system)
    const ownerEnd = oi < 0 ? -1 : sys.indexOf('NOT symmetric mutual prejudice.', oi);
    const trailing = ownerEnd < 0 ? 'N/A' : sys.slice(ownerEnd + 30).replace(/[\s─-]+/g, '');
    verdict = { present: oi > -1, positionPct: oi < 0 ? -1 : Math.round(100 * oi / sys.length), precedenceClause: prec, terminal: trailing.length < 40, trailingAfterOwner: trailing.slice(0, 120), sysLen: sys.length, userTail: turn.user.slice(0, 120) };
  }
  const scene = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || window.state._lastSceneText || ''; });
  fs.writeFileSync(DIR + '/turn_scene.txt', scene);
  fs.writeFileSync(DIR + '/turn_verdict.json', JSON.stringify(verdict, null, 2));
  console.error('\n=== INVARIANT ===\n' + JSON.stringify(verdict, null, 2));
  console.error('\n=== TURN SCENE (first 3000c) ===\n' + String(scene).slice(0, 3000));
  await browser.close(); process.exit(0);
})();
