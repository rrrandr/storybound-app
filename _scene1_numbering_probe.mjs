// SCENE-1 NUMBERING PROBE — does Scene 1 select assignment 1, or assignment 2?
//
// _currentSceneNumber() reads:
//     if (s._isScene1Build === true) return 1;
//     return (s.turnCount || 0) + 2;
// and `_isScene1Build` has exactly ONE occurrence in the codebase — that read. With no
// writer anywhere, the early return can never fire, so the helper always returns
// turnCount + 2. If turnCount is 0 while Scene 1's floor directive is built, Scene 1 is
// planned from the plan's scene 2 row.
//
// Captured at the REAL execution point: the genuine _buildAuthorFloorDirective is invoked
// and the genuine _selectSceneAssignment is wrapped to record what number it was asked
// for and what it returned. Nothing is mocked except the network.
//
// usage: node _scene1_numbering_probe.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\//;
const attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  attempts.push(route.request().url().replace(/^https?:\/\/[^/]+/, ''));
  return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._buildAuthorFloorDirective
  && window._selectSceneAssignment && window._currentSceneNumber, { timeout: 40000 });

// Wrap the REAL selector to record (requested n) → (returned assignment).
await page.evaluate(() => {
  window.__asgLog = [];
  const orig = window._selectSceneAssignment;
  window._selectSceneAssignment = function (s, sceneNum) {
    const out = orig.apply(this, arguments);
    window.__asgLog.push({
      requested: sceneNum,
      returnedEvent: out && out.event ? String(out.event).slice(0, 70) : null,
      settingInferred: !!(out && out._settingInferred),
      participants: (out && out.participants) || null
    });
    return out;
  };
});

const scenario = (name, setup) => page.evaluate(({ setup }) => {
  const s = window.state;
  // reset the fields the probe cares about
  s._sceneAssignment = null; s._sceneMissionCurrent = null;
  s._starterId = null; s.is_starter_story = false;
  window.__asgLog = [];
  // eslint-disable-next-line no-new-func
  new Function('s', 'window', setup)(s, window);
  const before = {
    turnCount: s.turnCount,
    isScene1Build: s._isScene1Build,
    currentSceneNumber: window._currentSceneNumber(s)
  };
  let payload = '';
  try { payload = String(window._buildAuthorFloorDirective(s) || ''); } catch (e) { payload = 'THREW: ' + e.message; }
  const asg = s._sceneAssignment;
  // Which plan row does the selected event correspond to?
  let matchedRow = null;
  try {
    const plan = (window.STARTER_PLANS || {})[s._starterId] || null;
    if (plan && Array.isArray(plan.scenes) && asg && asg.event) {
      const hit = plan.scenes.find(p => p && p.goal && String(p.goal).slice(0, 40) === String(asg.event).slice(0, 40));
      matchedRow = hit ? hit.n : 'no-row-match';
    }
  } catch (_) {}
  return {
    ...before,
    log: window.__asgLog,
    selectedEvent: asg && asg.event ? String(asg.event).slice(0, 70) : null,
    matchedRow,
    mission: s._sceneMissionCurrent || null,
    payloadLen: payload.length,
    // does the assignment actually appear in the author payload?
    payloadCarriesAssignment: !!(asg && asg.event && payload.indexOf(String(asg.event).slice(0, 40)) !== -1)
  };
}, { setup });

const SEEDED = `
  s.storyId='probe1'; s.turnCount=0;
  s._starterId='starter_first_sacrifice'; s.is_starter_story=true;
  s.picks=s.picks||{}; s.name='Lirael'; s.playerName='Lirael';
  s.loveInterestName='Julian'; s.partnerName='Julian';
`;
const SEEDED_CONT = SEEDED + ' s.turnCount=1;';
const UNSEEDED = `
  s.storyId='probe3'; s.turnCount=0;
  s._starterId=null; s.is_starter_story=false;
  s.name='Ada'; s.playerName='Ada'; s.loveInterestName='Rue'; s.partnerName='Rue';
  s._sceneMissionCurrent=null;
`;

console.log(`\n${'═'.repeat(86)}\nSCENE-1 NUMBERING PROBE\n${'═'.repeat(86)}`);

const rows = [
  ['First Sacrifice — Scene 1', await scenario('s1', SEEDED)],
  ['First Sacrifice — 1st continuation (control)', await scenario('cont', SEEDED_CONT)],
  ['Unseeded / corridor — Scene 1', await scenario('uns', UNSEEDED)],
];

for (const [label, r] of rows) {
  console.log(`\n ${label}`);
  console.log(`   turnCount               : ${r.turnCount}`);
  console.log(`   _isScene1Build          : ${r.isScene1Build === undefined ? 'undefined (never set)' : r.isScene1Build}`);
  console.log(`   _currentSceneNumber()   : ${r.currentSceneNumber}`);
  console.log(`   assignment requested for: ${r.log.map(x => x.requested).join(', ') || '(selector not called)'}`);
  console.log(`   selected event          : ${r.selectedEvent || '(none)'}`);
  console.log(`   matches plan row n=     : ${r.matchedRow === null ? 'n/a (no plan)' : r.matchedRow}`);
  console.log(`   scene mission fallback  : ${r.mission || '(none)'}`);
  console.log(`   floor-directive length  : ${r.payloadLen}`);
  console.log(`   payload carries it      : ${r.payloadCarriesAssignment}`);
}

// ── verdict ──
const s1 = rows[0][1], cont = rows[1][1], uns = rows[2][1];
const verdict = (r, expected) => {
  if (!r.log.length) return 'NO ASSIGNMENT LOOKUP';
  const req = r.log[0].requested;
  if (req === expected && r.selectedEvent) return `CORRECT (requested ${req})`;
  if (req !== expected && r.selectedEvent) return `OFF BY ${req - expected} — requested ${req}, expected ${expected}`;
  if (req !== expected && !r.selectedEvent) return `OFF BY ${req - expected}, and no assignment found → fallback`;
  return `requested ${req}, no assignment found → fallback mission`;
};
console.log(`\n${'─'.repeat(86)}`);
console.log(` First Sacrifice Scene 1 : ${verdict(s1, 1)}`);
console.log(` First continuation      : ${verdict(cont, 2)}`);
console.log(` Unseeded Scene 1        : ${verdict(uns, 1)}`);
console.log(`\n network: ${attempts.length} request(s) intercepted, 0 issued.\n`);

await browser.close();
