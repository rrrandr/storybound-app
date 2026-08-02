// SOCIAL — FINAL PRODUCTION REGRESSION (Roman 2026-08-02). NOT an A/B.
// Confirms the repair survives the REAL wiring: (1) drive real handleBeginStory (stubbed author, $0),
// capture the actual assembled production prompt, and verify _PERCEIVED_WILDFOLK arrived via the WIRING
// (not injection); (2) generate ONE real scene from that production prompt + the engineered waystation
// incident, with NO separate owner injection. Confirm the outsider uses the mundane register, not Field-talk.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad';

function setup(page) {
  return page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy';
    s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
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

const OVERRIDE =
  'SCENE OVERRIDE — render THIS scene NOW. Ignore any earlier opening/scene setup, but obey ALL world canon and character bibles above.\n' +
  'IDENTITIES (pinned): the PC is a HUMAN OUTSIDER from beyond the Thornwild (no Field, not Wildfolk). The LOVE INTEREST is WILDFOLK (Thornwild-born). The insulting traveller is another human outsider.\n' +
  'SETTING: dusk at a Thornwild waystation common room — a mixed crowd of local Wildfolk and outsider travellers share benches, food, and firelight.\n' +
  'INCIDENT: an outsider traveller, loudly and publicly, makes a demeaning assumption about the LOVE INTEREST (the Wildfolk), in front of the whole room.\n' +
  'TASK: write ONE charged social beat (~350–450 words) in which the PC and the LI must respond. First person (PC). Render behaviour and dialogue entirely in-world — do NOT explain the social system to the reader, do NOT resolve the larger plot. Just this moment.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  // PHASE A: capture the real assembled prompt (stubbed author, $0)
  const p1 = await (await browser.newContext()).newPage();
  const bodies = [];
  await p1.route('**/api/proxy', async (route) => { try { bodies.push(route.request().postData() || ''); } catch (_) {} await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], content: '{"ok":true}' }) }); });
  for (const pat of ['**/api/mistral-proxy', '**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/orchestrator', '**/api/anthropic-proxy', '**/api/chatgpt-proxy', '**/api/deepseek-proxy'])
    await p1.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], content: '{"ok":true}' }) }));
  await p1.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p1.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await p1.waitForTimeout(400); await setup(p1);
  await p1.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  await p1.waitForTimeout(25000);
  const captured = bodies.slice().sort((a, b) => b.length - a.length)[0] || '';
  const ownerViaWiring = captured.includes('PERCEIVED NATURE OF THE WILDFOLK');
  console.error('PHASE A — owner present in REAL assembled prompt (via wiring, not injection): ' + (ownerViaWiring ? '✓ YES' : '✗ NO'));
  fs.writeFileSync(DIR + '/regression_prompt.txt', captured);
  await p1.close();

  // PHASE B: ONE real gen from the production prompt (owner already in via wiring) + waystation override
  const p2 = await (await browser.newContext()).newPage();
  await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p2.waitForFunction(() => window.state, { timeout: 30000 });
  const payload = JSON.parse(captured);
  const msgs = payload.messages.slice(0, 2).concat([{ role: 'user', content: OVERRIDE }]);
  const res = await p2.evaluate(async (msgs) => {
    try {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 1200 }) });
      const j = await r.json(); const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '';
      return String(c);
    } catch (e) { return 'ERR ' + e.message; }
  }, msgs);
  fs.writeFileSync(DIR + '/regression_scene.txt', res);
  // automatic markers
  const fieldTalk = /\b(the Field|Becoming|turning|hair (move|moving)|hollow you|missing pieces|leaks out)\b/i.test(res.replace(/PERCEIVED NATURE[\s\S]*/i, ''));
  const mundaneSlur = /(thornbred|brushborn|brush|beast.?lover|rot.?touched|inbred|backward|superstition|his kind|your kind)/i.test(res);
  console.error('\nPHASE B — REAL production scene (owner via wiring, NO injection harness):');
  console.error('  outsider uses Field/monster-talk (should be FALSE): ' + fieldTalk);
  console.error('  outsider uses mundane register (should be TRUE): ' + mundaneSlur);
  console.error('\n===== SCENE =====\n' + res.slice(0, 3500));
  await browser.close(); process.exit(0);
})();
