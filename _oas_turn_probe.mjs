import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, oasBeat } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS } from './_fs_story_setup.mjs';
const b = await chromium.launch(); const page = await b.newPage();
let served = 0; const logs = [];
page.on('console', m => { const x = m.text();
  if (/\[INTIMACY|\[OAS/i.test(x)) logs.push(x); });
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch(_){} return; }
  let raw=null; try { raw=req.postData(); } catch(_){}
  let sys=''; try { sys=String((JSON.parse(raw||'{}').messages||[])[0]?.content||''); } catch(_){}
  if (stageOf(sys) === 'oas') { served++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:oasBeat({})})}); }
  try { await route.abort(); } catch(_){}
});
await page.goto('http://localhost:3000/', {waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>typeof window._advanceStagedScene==='function',{timeout:30000});
const def=await findFSDef(page); await launchFS(page,def); await unlockFS(page,'turn-probe'); await finalizePreview(page);
await enterOAS(page,{settleMs:9000});
const d1 = await page.evaluate(() => {
  const d = window.state.intimacyDialogue;
  return d ? { active: d.active, phase: d.phase, resolving: !!d._resolving,
    beats: (d.beats||[]).length, authoredFrame: !!d._authoredFrame,
    keys: Object.keys(d).slice(0,24) } : null;
});
console.log('after enterOAS, state.intimacyDialogue =', JSON.stringify(d1, null, 1));
console.log('oas requests served so far:', served);
const r1 = await page.evaluate(() => {
  try { return window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); }
  catch (e) { return 'threw: ' + e.message; }
});
await page.waitForTimeout(6000);
const d2 = await page.evaluate(() => {
  const d = window.state.intimacyDialogue;
  return d ? { active: d.active, phase: d.phase, beats: (d.beats||[]).length } : null;
});
console.log('consume returned:', JSON.stringify(r1));
console.log('after one turn:', JSON.stringify(d2), 'oas served:', served);
console.log('\nrecent OAS log lines:');
logs.slice(-14).forEach(l => console.log('  · ' + l.slice(0,170)));
await b.close();
