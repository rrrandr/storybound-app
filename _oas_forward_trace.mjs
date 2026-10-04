// WHERE DOES JULIAN'S HALF GO? Provider-free, $0. archive -> snapshot -> extractor -> planner.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, oasTurn, oasClosingBeat, OAS_TURNS, OAS_RESOLVE_MIN_BEAT }
  from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS } from './_fs_story_setup.mjs';
const b = await chromium.launch(); const page = await b.newPage();
let n = 0; const oasSizes = [];
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch(_){} return; }
  let raw=null; try { raw=req.postData(); } catch(_){}
  let sys=''; try { sys=String((JSON.parse(raw||'{}').messages||[])[0]?.content||''); } catch(_){}
  if (stageOf(sys) === 'oas') {
    // MEASURE THE REAL ASSEMBLED REQUEST — every message, as it would go on the wire.
    try {
      const b = JSON.parse(raw || '{}');
      const msgs = b.messages || [];
      oasSizes.push({ turn: n, msgs: msgs.length,
        chars: msgs.reduce((t, m) => t + String(m.content || '').length, 0),
        sys: String((msgs[0] || {}).content || '').length,
        rest: msgs.slice(1).reduce((t, m) => t + String(m.content || '').length, 0),
        max_tokens: b.max_tokens || b.maxTokens || null,
        model: b.preferredModel || b.grokModel || b.model || null,
        convId: b.convId || null });
      // SAVE EVERY TURN'S MESSAGES so consecutive requests can be diffed DIRECTLY, rather than
      // inferred from their lengths. "200 chars longer" does not prove the other 241,000 are
      // identical, which is exactly the assumption that has to be tested.
      try {
        fs.mkdirSync('_audit_out/oas/turns', { recursive: true });
        const tag = String(n).padStart(2, '0');
        fs.writeFileSync('_audit_out/oas/turns/user_' + tag + '.txt', String((msgs[1] || {}).content || ''));
        fs.writeFileSync('_audit_out/oas/turns/sys_' + tag + '.txt', String((msgs[0] || {}).content || ''));
      } catch (_) {}
    } catch (_) {}
    const body = n >= OAS_TURNS.length ? oasClosingBeat() : oasTurn(n); n++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:body})}); }
  try { await route.abort(); } catch(_){}
});
await page.goto('http://localhost:3000/', {waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>typeof window._advanceStagedScene==='function',{timeout:30000});
const def=await findFSDef(page); await launchFS(page,def); await unlockFS(page,'fwd-trace'); await finalizePreview(page);
await enterOAS(page,{settleMs:8000});
for (let i=0;i<OAS_RESOLVE_MIN_BEAT+3;i++){
  const st=await page.evaluate(()=>{const d=window.state.intimacyDialogue;return d?{a:!!d.active,r:!!d._resolving}:null;});
  if(!st||!st.a||st.r) break;
  // capture the LIVE turn entry on the first pass, before anything is torn down
  if (i===1) {
    const liveRaw = await page.evaluate(()=>{
      const d=window.state.intimacyDialogue||{};
      const h=Array.isArray(d.liTurnHistory)?d.liTurnHistory:[];
      return h.length ? JSON.stringify(h[h.length-1]).slice(0,400) : null; });
    console.log('LIVE liTurnHistory entry:\n  ' + liveRaw + '\n');
  }
  await page.evaluate(()=>{try{window._intimacyDialogueConsumeInput('I am still here.','I hold his gaze.');}catch(_){}});
  await page.waitForTimeout(3500);
}
const dl=Date.now()+60000;
while(Date.now()<dl){ const s=await page.evaluate(()=>{const d=window.state.intimacyDialogue;
  return !d || (!d.active && !d._resolving);}); if(s) break; await page.waitForTimeout(1000); }
const out = await page.evaluate(() => {
  const s = window.state;
  const snaps = s._oasSceneSnapshots || {};
  const keys = Object.keys(snaps);
  const chosen = keys.length ? snaps[String(keys.sort(function(a,c){return Number(c)-Number(a);})[0])] : null;
  const beats = (chosen && Array.isArray(chosen.beats)) ? chosen.beats : [];
  const archRecs = (s.scenes||[]).filter(r => r && r.oasArchive);
  const archBeats = archRecs.length ? (archRecs[archRecs.length-1].oasArchive.beats || []) : [];
  return {
    snapshotKeys: keys,
    snapshotIsDev: chosen ? !!chosen.isDev : null,
    snapshotBeatCount: beats.length,
    snapshotFirstBeat: beats.length ? JSON.stringify(beats[0]).slice(0, 380) : null,
    archiveRecords: archRecs.length,
    archiveBeatCount: archBeats.length,
    archiveFirstBeat: archBeats.length ? JSON.stringify(archBeats[0]).slice(0, 380) : null,
    extractorOutput: (typeof window._extractRecentOASExchangeLines === 'function')
      ? window._extractRecentOASExchangeLines(s, { limit: 4 }) : 'absent'
  };
});
console.log('=== REAL ASSEMBLED OAS REQUESTS ===');
console.log('  convIds: ' + JSON.stringify([...new Set(oasSizes.map(x => x.convId))]));
oasSizes.forEach(x => console.log('  turn ' + x.turn + '  msgs=' + x.msgs
  + '  total=' + x.chars + 'c  (sys ' + x.sys + ' + rest ' + x.rest + ')'
  + '  max_tokens=' + x.max_tokens + '  model=' + x.model));
fs.mkdirSync('_audit_out/oas', { recursive: true });
fs.writeFileSync('_audit_out/oas/sizes.json', JSON.stringify(oasSizes, null, 2));
console.log('');
console.log('SNAPSHOT keys: ' + JSON.stringify(out.snapshotKeys) + '  isDev=' + out.snapshotIsDev
  + '  beats=' + out.snapshotBeatCount);
console.log('  first snapshot beat: ' + out.snapshotFirstBeat);
console.log('\nARCHIVE records: ' + out.archiveRecords + '  beats=' + out.archiveBeatCount);
console.log('  first archive beat: ' + out.archiveFirstBeat);
console.log('\nEXTRACTOR OUTPUT (' + (Array.isArray(out.extractorOutput) ? out.extractorOutput.length : '?') + ' lines):');
(Array.isArray(out.extractorOutput) ? out.extractorOutput : []).forEach(l => console.log('  ' + l));
fs.mkdirSync('_audit_out/fwd', {recursive:true});
fs.writeFileSync('_audit_out/fwd/trace.json', JSON.stringify(out, null, 2));
await b.close();
