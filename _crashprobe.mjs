import { chromium } from 'playwright-core';
import fs from 'fs';
const SRC = fs.readFileSync('public/app.js', 'utf8');
const b = await chromium.launch({ headless: true });
const c = await b.newContext(); const p = await c.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + String(e.message).slice(0, 300)));
p.on('crash', () => errs.push('PAGE CRASHED'));
await p.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
await p.route('**/api/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
await p.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await p.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:60000 });
let out = null;
try {
  out = await p.evaluate(async () => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, { world:def.world, name:'Lirael', playerName:'Lirael', loveInterestName:'Julian',
      partnerName:'Julian', playerMask:'OPEN_VEIN', storyLength:'fling', pov:'first_person',
      identity:{ playerName:'Lirael', partnerName:'Julian' }, _starterId: def.id,
      is_starter_story:true, storyId:'crashprobe', _skipCorridorValidation:true });
    const t0 = Date.now();
    const st = window._scene1StageContract(s);
    const t1 = Date.now();
    const man = window._cpFactManifest(st, s);
    const t2 = Date.now();
    let beginErr = null;
    try { await Promise.race([window.handleBeginStory(),
      new Promise((_, rj) => setTimeout(() => rj(new Error('begin timeout 45s')), 45000))]); }
    catch (e) { beginErr = String((e && e.message) || e).slice(0, 200); }
    return { stageMs: t1 - t0, manifestMs: t2 - t1, ok: st && st.ok, facts: man.facts.length,
             fingerprint: man.fingerprint, refFaults: (st.refFaults || []).length,
             beginErr: beginErr, beginMs: Date.now() - t2 };
  });
} catch (e) { errs.push('EVAL THREW ' + String(e.message).slice(0, 200)); }
console.log(JSON.stringify({ out, errs }, null, 1).slice(0, 1200));
await b.close();
