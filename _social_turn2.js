// SOCIAL — THE ONE BEHAVIORAL OBSERVATION (Roman greenlit). Real opening + one real literary turn.
// Oracle = window.__lastAuthorPrompt.fullSys (the app's own record of what it handed the prose author;
// written only on HEAVY per-turn builds → its presence also proves the turn went heavy). Empirical
// trigger: set the turn inputs + click #submitBtn (stacked handlers; the literary one runs). Verify the
// TERMINAL owner is in the author prompt, then read whether the prose keeps outsiders on the mundane side.
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
  let authorReq = null, authorResp = null;
  // Intercept the PER-TURN HEAVY author call: its request body has BOTH 'TURN INSTRUCTIONS' and the owner.
  await page.route('**/api/proxy', async (route) => {
    const body = route.request().postData() || '';
    if (/TURN INSTRUCTIONS/.test(body) && /PERCEIVED NATURE OF THE WILDFOLK/.test(body)) {
      const resp = await route.fetch();
      const text = await resp.text();
      try { const j = JSON.parse(text); authorResp = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || text; } catch (_) { authorResp = text; }
      try { authorReq = JSON.parse(body); } catch (_) { authorReq = { messages: [{ content: body }] }; }
      console.error('  >> CAPTURED per-turn heavy author call (' + body.length + 'c req)');
      await route.fulfill({ response: resp, body: text });
    } else { await route.continue(); }
  });
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
    await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  page.on('console', m => { const t = m.text(); if (/BEGIN-ERR|TIER-ROUTE|ADVANCE-ERR|SUBMIT/i.test(t)) console.error('  log>', t.slice(0, 130)); });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400); await setup(page);
  console.error('[1/3] REAL opening…');
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  { const t0 = Date.now(); while (Date.now() - t0 < 200000) { await page.waitForTimeout(3000); const st = await page.evaluate(() => ({ busy: !!(window.state._isAdvancingScene || window.state._stagedSubmitting || window.state._stagedAwaitingProse), tc: window.state.turnCount || 0, scenes: (window.__scenes || []).length })); if (!st.busy && st.tc >= 1) break; if (Date.now() - t0 > 130000) break; } }
  const openingOk = await page.evaluate(() => (window.__scenes || []).length >= 1 || !!window.state._lastSceneText);
  console.error('  opening rendered: ' + openingOk + ' (turnCount=' + await page.evaluate(()=>window.state.turnCount) + ')');
  console.error('[2/3] driving ONE literary turn (set inputs + click #submitBtn)…');
  const fired = await page.evaluate(async (act) => {
    window.__lastAuthorPrompt = null; // clear oracle to isolate THIS turn
    const setV = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return true; } return false; };
    const set = { actionInput: setV('actionInput', act), gnActionInput: setV('gnActionInput', act) };
    setV('dialogueInput', ''); setV('gnDialogueInput', '');
    const btn = document.getElementById('submitBtn');
    if (btn) { btn.disabled = false; btn.click(); }
    return { set, clicked: !!btn };
  }, TURN_ACTION);
  console.error('  inputs set: ' + JSON.stringify(fired));
  // wait until the per-turn heavy author call is captured (network) + returns
  { const t0 = Date.now(); while (Date.now() - t0 < 220000) { await page.waitForTimeout(3000); if (authorReq && authorResp) break; } }
  console.error('[3/3] analyzing captured author request + response…');
  const sys = (authorReq && authorReq.messages && authorReq.messages[0] && authorReq.messages[0].content) || '';
  const oi = sys.indexOf('PERCEIVED NATURE OF THE WILDFOLK');
  const ownerEnd = oi < 0 ? -1 : sys.indexOf('NOT symmetric mutual prejudice.', oi);
  const trailing = ownerEnd < 0 ? '' : sys.slice(ownerEnd + 30).replace(/[\s─-]+/g, '');
  const obs = {
    authorPromptPresent: !!sys, sysLen: sys.length,
    hasTurnInstructions: /TURN INSTRUCTIONS/.test(sys), hasBinl: /SIGNATURE PHRASE|FEATURE ROTATION|CHAR MEMORY|CHARACTER MEMORY/i.test(sys),
    ownerPresent: oi > -1, ownerPositionPct: oi < 0 ? -1 : Math.round(100 * oi / sys.length),
    precedenceClause: sys.includes('everything the canon above tells you about the Field'),
    ownerTerminal: oi > -1 && trailing.length < 40, trailingAfterOwner: trailing.slice(0, 100),
    scene: authorResp || ''
  };
  fs.writeFileSync(DIR + '/turn2_scene.txt', obs.scene || '');
  const o = Object.assign({}, obs); delete o.scene;
  fs.writeFileSync(DIR + '/turn2_obs.json', JSON.stringify(o, null, 2));
  console.error('\n=== AUTHOR-PROMPT OBSERVATION (oracle) ===\n' + JSON.stringify(o, null, 2));
  console.error('\n=== TURN PROSE (first 3200c) ===\n' + String(obs.scene || '(none captured)').slice(0, 3200));
  await browser.close(); process.exit(0);
})();
