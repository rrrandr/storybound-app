import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';
const SRC = fs.readFileSync('public/app.js', 'utf8');
const b = await chromium.launch({ headless: true });
const c = await b.newContext(); const p = await c.newPage();
await installSession(p);
await p.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
await p.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
await p.route('**/api/**', r => /\/api\/config\b/.test(r.request().url())
  ? r.fulfill({ status:200, contentType:'application/json', body: configBody() })
  : r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
await p.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await p.waitForFunction(() => window._scene1StageContract && window.STARTER_STORIES, { timeout:120000 });
const R = await p.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
    archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael',
    loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male',
    playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', pov:'first_person',
    identity:{ playerName:'Lirael', partnerName:'Julian' },
    _starterId: def.id, is_starter_story: true, storyId: 'stageref' });
  const st = window._scene1StageContract(s);
  // and what the C+ SELECTOR produces for the same scene
  let sel = null;
  try { sel = window._selectCPlusCandidates ? window._selectCPlusCandidates(s, st) : null; } catch (e) { sel = { err: String(e.message) }; }
  return {
    ok: st && st.ok,
    onStage: (st.onStage || []).map(r => ({ id: r.id, label: r.label, kind: r.kind, source: r.source })),
    offStage: (st.offStage || []).map(r => ({ id: r.id, label: r.label })),
    selectorKeys: sel ? Object.keys(sel) : null,
    candidates: sel && Array.isArray(sel.candidates)
      ? sel.candidates.map(x => ({ id: x.id, label: x.label, providerOwner: x.providerOwner,
          structuredSourceId: x.structuredSourceId || null, roleInstanceId: x.role_instance_id || null,
          keys: Object.keys(x) })) : null,
  };
});
console.log(JSON.stringify(R, null, 2).slice(0, 3000));
await b.close();
