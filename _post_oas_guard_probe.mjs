// WHICH GUARD STOPS THE RESUMED ADVANCE AFTER THE OAS? Provider-free, $0.
// Also: what does liTurnHistory actually hold? Read, not guessed.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, fsPlannerCaptured, AUTHOR as REPLAY_AUTHOR, MEMORY,
  verifierVerdict, refsFromVerifierRequest, oasTurn, oasClosingBeat, OAS_TURNS,
  OAS_RESOLVE_MIN_BEAT } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS } from './_fs_story_setup.mjs';

const b = await chromium.launch(); const page = await b.newPage();
const logs = []; let oasBeats = 0; let plannerSeen = 0;
page.on('console', m => { const x = m.text();
  if (/\[STAGED:SUBMIT\]|\[INTIMATE-INTERRUPT\]|\[SCENE-DECISION\]|\[INTIMACY|\[OAS|\[CG:|\[EVENT-FRAME/i.test(x)) logs.push(x); });
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch(_){} return; }
  let raw=null; try { raw=req.postData(); } catch(_){}
  let sys='', usr='';
  try { const j=JSON.parse(raw||'{}'); sys=String((j.messages||[])[0]?.content||''); usr=String((j.messages||[])[1]?.content||''); } catch(_){}
  const st=stageOf(sys);
  const give=(c)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:c})});
  if (st==='oas') { const body = oasBeats >= OAS_TURNS.length ? oasClosingBeat() : oasTurn(oasBeats); oasBeats++; return give(body); }
  if (st==='planner') { plannerSeen++; return give(fsPlannerCaptured()); }
  if (st==='author') return give(REPLAY_AUTHOR);
  if (st==='memory') return give(MEMORY);
  if (st==='verifier') return give(verifierVerdict(refsFromVerifierRequest(usr)));
  try { await route.abort(); } catch(_){}
});
await page.goto('http://localhost:3000/', {waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>typeof window._advanceStagedScene==='function',{timeout:30000});
const def=await findFSDef(page); await launchFS(page,def); await unlockFS(page,'guard-probe'); await finalizePreview(page);
await enterOAS(page,{settleMs:8000});
for (let i=0;i<OAS_RESOLVE_MIN_BEAT+3;i++){
  const st=await page.evaluate(()=>{const d=window.state.intimacyDialogue;return d?{a:!!d.active,r:!!d._resolving}:null;});
  if(!st||!st.a||st.r) break;
  await page.evaluate(()=>{try{window._intimacyDialogueConsumeInput('I am still here.','I hold his gaze.');}catch(_){}});
  await page.waitForTimeout(3500);
}
// LET PRODUCTION FINISH ITS ASYNCHRONOUS RESOLUTION. No flags cleared, no guards bypassed.
const dl=Date.now()+60000;
while(Date.now()<dl){
  const s=await page.evaluate(()=>{const d=window.state.intimacyDialogue;
    return {gone:!d, active:!!(d&&d.active), resolving:!!(d&&d._resolving)};});
  if (s.gone || (!s.active && !s.resolving)) break;
  await page.waitForTimeout(1000);
}
const settled = await page.evaluate(() => {
  const d = window.state.intimacyDialogue;
  const r = window.state._intimateInterruption;
  return {
    dialogue: d ? { active: !!d.active, resolving: !!d._resolving, beatCount: d.beatCount } : 'gone',
    interruptionPending: typeof window._intimateInterruptionPending === 'function'
      ? !!window._intimateInterruptionPending() : 'absent',
    interruptionRecord: r ? { submitted: !!r.submitted, storyId: r.storyId === window.state.storyId,
      sceneNum: r.sceneNum, hasFrame: !!r.frame, selectedSlot: r.selectedSlot } : null,
    sceneDecisionNeeded: typeof window._sceneDecisionNeeded === 'function' ? !!window._sceneDecisionNeeded() : 'absent',
    decision1: (window.state._sceneDecisions || {})['1'] || null,
    stagedSubmitting: window.state._stagedSubmitting === true,
    stagedActive: !!window.state._stagedActive
  };
});
console.log('AFTER RESOLUTION SETTLED:\n' + JSON.stringify(settled, null, 1));

// THE ACTUAL liTurnHistory SHAPE.
const shape = await page.evaluate(() => {
  const d = window.state.intimacyDialogue || {};
  const h = Array.isArray(d.liTurnHistory) ? d.liTurnHistory : [];
  return { len: h.length, types: h.map(x => typeof x),
    firstRaw: h.length ? JSON.stringify(h[0]).slice(0, 300) : null,
    keys: (h.length && typeof h[0] === 'object') ? Object.keys(h[0]) : null };
});
console.log('\nliTurnHistory SHAPE: ' + JSON.stringify(shape, null, 1));

// NOW ATTEMPT THE ADVANCE AND SEE WHICH GUARD SPEAKS.
const before = logs.length;
await page.evaluate(() => { try { window._advanceStagedScene('I turn away and walk.', 'Nothing.'); } catch (e) { console.log('[STAGED:SUBMIT] threw ' + e.message); } });
await page.waitForTimeout(6000);
console.log('\nGUARD LOGS FROM THE ADVANCE (' + (logs.length - before) + '):');
logs.slice(before).slice(0, 12).forEach(l => console.log('  · ' + l.slice(0, 190)));
console.log('\nplanner requests after the advance: ' + plannerSeen);
fs.mkdirSync('_audit_out/guard', { recursive: true });
fs.writeFileSync('_audit_out/guard/probe.json', JSON.stringify({ settled, shape, logs }, null, 2));
await b.close();
