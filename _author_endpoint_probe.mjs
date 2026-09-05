// Zero-spend: which endpoint carries the author payload? Stub everything, record URLs.
import { chromium } from 'playwright-core';
const isAuthor = s => /STORYBOUND ARCHITECTURE LAWS/.test(s);
const seen = [];
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext()).newPage();
for (const u of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await p.route(u, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
await p.route('**/api/**', async route => {
  const r = route.request();
  if (r.method() !== 'POST') return route.continue();
  let bd = null; try { bd = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = bd.messages || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  if (msgs.length) seen.push({ url: new URL(r.url()).pathname, model: bd.model || '(none)', author: isAuthor(sys) });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, content: 'x', choices: [{ message: { content: 'x' } }], usage: null }) });
});
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForFunction(() => window.state && window.STARTER_STORIES, { timeout: 90000 });
await p.evaluate(() => {
  const s = window.state, d = (window.STARTER_STORIES || []).find(x => x && x.id === 'starter_first_sacrifice');
  s.picks = s.picks || {}; ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k => s.picks[k] = d[k]);
  Object.assign(s, { world: d.world, worldSubtype: d.worldSubtype, flavor: d.flavor, dynamic: d.dynamic, _starterId: d.id,
    is_starter_story: true, immutableTitle: d.title, archetype: { primary: d.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian', loveInterest: 'Male',
    liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true,
    fortunes: 9999999, _skipCorridorValidation: true, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' }, _pcLookSkipped: true, pcLookLocked: true,
    renderMode: 'literary', currentEngine: 'literary' });
  window._devBypass = true;
  if (typeof window.scheduleSpeculativePreload === 'function') window.scheduleSpeculativePreload = function () {};
});
await p.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 120000 && !seen.length; w += 3000) await p.waitForTimeout(3000);
await p.waitForTimeout(20000);
await b.close();
const authors = seen.filter(x => x.author);
console.log('  author calls:', authors.length);
for (const a of authors.slice(0, 4)) console.log(`    ${a.url}   model=${a.model}`);
console.log('  all endpoints:', [...new Set(seen.map(x => x.url))].join(', '));
