// READ-BASED audit — capture a handful of FULL literary Scene-1 openings (deck mandate OFF, so the
// tarot line doesn't front every crisis) for an HONEST human read: readability/coherence, therefore/but
// causal structure, and whether the crisis lands as RELATIONAL (a charged person) vs PLOT/logistics
// (a document/deal/decision). No regex scoring — the JSON is for reading.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/read_val.json';
const N = parseInt(process.env.N || '4', 10);
function log(...a){ console.error(...a); }

async function genOne(page) {
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function', { timeout:40000 });
  await page.waitForTimeout(400);
  const relLogs = [];
  const onLog = m => { const t=m.text(); if (/\[AXIS:SCHEDULE\]|\[AXIS:SCHEDULE:ERROR\]|\[PREWRITE\]|\[LI-DESIRE-INTRO\]|\[LI-FIRST-CONVO\]|\[AXIS-EXPANSION/.test(t)) relLogs.push(t.slice(0,300)); };
  page.on('console', onLog);
  await page.evaluate(()=>{
    window.__lastProse='';
    try { window._forceDeckMandate = false; } catch(_){}   // DECK MANDATE OFF — no forced tarot opener
    try { if (typeof window._forceMandateOff==='function') window._forceMandateOff(); } catch(_){}
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity=function(pr){ try{ if(typeof pr==='string'&&pr.length>150) window.__lastProse=pr; }catch(_){} return Promise.resolve(null); };
    const s=window.state; window._devBypass=true; window._forceAudits=true; window._forceDeckMandate=false;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{}; s.picks.world='billionaire'; s.picks.flavor='affair'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='billionaire_modern'; s.picks.playermask='OPEN_VEIN';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.liGender='male';
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.storyLength='affair'; s.tier='affair'; s.intensity='Steamy';
    s.pov='first_person'; s.turnCount=0;
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s.series_id=null; s.issueIndexInRun=1; s._prefMemory={};
  });
  await page.evaluate(async ()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  const t0=Date.now(); let last=-1, stable=0;
  while(Date.now()-t0<300000){ await page.waitForTimeout(4000);
    const st=await page.evaluate(()=>({ hasAplot:!!(window.state.aPlot&&window.state.aPlot.goal), len:(window.__lastProse||'').length }));
    if (st.hasAplot && st.len>200){ if(st.len===last){ stable++; if(stable>=3) break; } else { last=st.len; stable=0; } }
  }
  await page.waitForTimeout(8000);  // let the fire-and-forget prewrite cache-population finish (2 grok calls)
  const out = await page.evaluate(()=>{ const s=window.state;
    const clean = x => String(x||'').replace(/\[[A-Z][^\]]*\]/g,'').replace(/\n{3,}/g,'\n\n').trim();
    return {
      shape: (s.aPlot&&s.aPlot.storyShapeLabel)||null,
      subtype: (s.aPlot&&s.aPlot.storyShapeSubtype)||null,
      goal: (s.aPlot&&s.aPlot.goal)||'',
      crisisEvent: (s.pcBodyBible&&s.pcBodyBible.current_crisis&&s.pcBodyBible.current_crisis.event)||'',
      liComplication: (s.pcBodyBible&&s.pcBodyBible.current_crisis&&s.pcBodyBible.current_crisis.li_complication)||'',
      liRole: (s.pcBodyBible&&s.pcBodyBible.current_crisis&&s.pcBodyBible.current_crisis.li_load_bearing_role)||'',
      liName: s.loveInterestName||'', pcName: s.playerName||s.name||'',
      prewrite: (s._scene1PrewrittenExpansions ? 'PRESENT (prewritten, revealed on click)' : 'MISSING → click-time fallback'),
      liDesireScene: (s._liDesireIntroScene==null?null:(s._liDesireIntroScene+1)),
      liConvoScene: (s._liFirstConvoScene==null?null:(s._liFirstConvoScene+1)),
      prose: clean(window.__lastProse||'')
    };
  });
  page.off('console', onLog);
  out.relLogs = relLogs;
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const rows = [];
  for (let i=0;i<N;i++){ log(`[READ] opening ${i+1}/${N} …`); let r; try{ r=await genOne(page); }catch(e){ r={err:e.message}; } rows.push(r);
    log(`  shape=${r.shape} (${r.subtype||'-'}) · goal: ${String(r.goal||'').slice(0,120)} · prose ${String(r.prose||'').length}c`); }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  log(`\nWROTE ${OUT} — ${rows.filter(r=>r.prose).length} full scenes captured for reading.`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
