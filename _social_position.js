// SOCIAL — POSITION ISOLATION TEST (Roman 2026-08-02). Change ONE variable: PLACEMENT.
// Take the EXACT captured production prompt (owner currently buried at ~15% via the early cognitive
// block), STRIP the owner block from its buried position, and re-place it verbatim right before the
// scene task (the A/B-winning position). Text 100% unchanged. Delivery = same captured production
// prompt. Only placement differs. If repair returns → placement is the cause → then rewire production
// to emit the owner late. If it still fails → placement alone insufficient → owner text earns evolution.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad';

const OVERRIDE =
  'SCENE OVERRIDE — render THIS scene NOW. Ignore any earlier opening/scene setup, but obey ALL world canon and character bibles above.\n' +
  'IDENTITIES (pinned): the PC is a HUMAN OUTSIDER from beyond the Thornwild (no Field, not Wildfolk). The LOVE INTEREST is WILDFOLK (Thornwild-born). The insulting traveller is another human outsider.\n' +
  'SETTING: dusk at a Thornwild waystation common room — a mixed crowd of local Wildfolk and outsider travellers share benches, food, and firelight.\n' +
  'INCIDENT: an outsider traveller, loudly and publicly, makes a demeaning assumption about the LOVE INTEREST (the Wildfolk), in front of the whole room.\n' +
  'TASK: write ONE charged social beat (~350–450 words) in which the PC and the LI must respond. First person (PC). Render behaviour and dialogue entirely in-world — do NOT explain the social system to the reader, do NOT resolve the larger plot. Just this moment.';

(async () => {
  const raw = fs.readFileSync(DIR + '/regression_prompt.txt', 'utf8');
  const p = JSON.parse(raw);
  const system = p.messages[0].content;
  let user = p.messages[1].content;

  // extract the owner block verbatim from its buried position, then strip it
  const startMark = 'PERCEIVED NATURE OF THE WILDFOLK';
  const si = user.indexOf(startMark);
  if (si < 0) { console.error('owner not found in prompt — abort'); process.exit(1); }
  const endMark = 'NOT symmetric mutual prejudice.';
  const ei = user.indexOf(endMark, si) + endMark.length;
  const ownerBlock = user.slice(si, ei);
  const before = user.slice(0, si);
  const after = user.slice(ei);
  user = (before + after).replace(/\n{3,}/g, '\n\n'); // stripped user (owner removed)
  console.error('extracted owner block (' + ownerBlock.length + 'c); stripped user now ' + user.length + 'c (was ' + p.messages[1].content.length + 'c)');
  console.error('owner text UNCHANGED: ' + (ownerBlock.indexOf('OUTSIDERS DO NOT KNOW THE BECOMING') > -1 ? '✓' : '✗'));

  // rebuild: system + stripped-canon-user + owner (late) + task  → owner now right before the task
  const msgs = [
    { role: 'system', content: system },
    { role: 'user', content: user },
    { role: 'user', content: ownerBlock },
    { role: 'user', content: OVERRIDE },
  ];

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const res = await page.evaluate(async (msgs) => {
    try {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 1200 }) });
      const j = await r.json(); return String((j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '');
    } catch (e) { return 'ERR ' + e.message; }
  }, msgs);
  fs.writeFileSync(DIR + '/position_scene.txt', res);
  const body = res.replace(/PERCEIVED NATURE[\s\S]*?prejudice\./i, '');
  const fieldTalk = /\b(the Field|Becoming|turning|hair (move|moving)|hollow you|missing pieces|leaks out|the changed|roots take hold|Keepers mark)\b/i.test(body);
  const mundane = /(thornbred|brushborn|\bbrush\b|beast.?lover|rot.?touched|inbred|backward|superstition|his kind|your kind|smoothskin|unmarked|dayblind)/i.test(res);
  console.error('\nPOSITION TEST (owner moved 15% → ~99%, text unchanged):');
  console.error('  outsider Field/monster-talk (want FALSE): ' + fieldTalk);
  console.error('  mundane/asymmetry register (want TRUE): ' + mundane);
  console.error('\n===== SCENE =====\n' + res.slice(0, 3200));
  await browser.close(); process.exit(0);
})();
