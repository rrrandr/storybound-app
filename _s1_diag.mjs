// DIAGNOSTIC — which endpoints does handleBeginStory call, in what order, and where does
// it stop? Used only to design the real harness's mocks. Everything fenced locally.
import { chromium } from 'playwright-core';

const seen = [];
const PROSE = 'The hall smelled of cold ash. '.repeat(40);
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext()).newPage();
await p.route('**/api/**', async r => {
  const u = r.request().url().replace(/^https?:\/\/[^/]+/, '');
  let body = null; try { body = JSON.parse(r.request().postData() || '{}'); } catch (_) {}
  const sys = String(((body && body.messages || []).find(m => m.role === 'system') || {}).content || '');
  seen.push({ u, role: body && body.role, model: body && body.model, sys: sys.slice(0, 70).replace(/\s+/g, ' ') });
  return r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: PROSE, choices: [{ message: { content: PROSE } }] }) });
});
const logs = [];
p.on('console', m => { const t = m.text(); if (t.length < 200) logs.push(t); });
p.on('pageerror', e => logs.push('PAGEERROR: ' + String(e.message).slice(0, 150)));

await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });

const out = await p.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  window._devBypass = true;
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  s.world = def.world; s.worldSubtype = def.worldSubtype; s.flavor = def.flavor; s.dynamic = def.dynamic;
  s._starterId = def.id; s.is_starter_story = true; s.immutableTitle = def.title;
  s.archetype = { primary: def.archetype, modifier: null };
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  s.loveInterest = 'Male'; s.liGender = 'male'; s.playerMask = 'OPEN_VEIN';
  s.storyLength = 'fling'; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true;
  s.fortunes = 9999999; s.previewActive = false; s._skipCorridorValidation = true;
  s.intensity = 'Steamy'; s.pov = 'first_person';
  s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.picks.identity = s.identity;
  s._pcLookSkipped = true; s.pcLookLocked = true;
  s.renderMode = 'literary'; s.currentEngine = 'literary'; s.storyId = 'diag';
  try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 40000))]); }
  catch (e) { return { threw: String(e.message).slice(0, 200) }; }
  return { scenes: (s.scenes || []).length, tc: s.turnCount,
           pages: window.StoryPagination.getPageCount(),
           titleShown: !!s._titlePageShown, staged: !!s._stagedAwaitingProse };
});
await b.close();

console.log('\n=== ENDPOINTS CALLED (in order) ===');
seen.forEach((x, i) => console.log(`  ${i}: ${x.u}  role=${x.role || '-'} model=${x.model || '-'}  sys="${x.sys}"`));
console.log('\n=== RESULT ===');
console.log(' ', JSON.stringify(out));
console.log('\n=== LAST 30 CONSOLE LINES ===');
logs.slice(-30).forEach(l => console.log('  ' + l.slice(0, 150)));
