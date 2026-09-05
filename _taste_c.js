// C — TASTE AUDIT. Drives one Literary billionaire Affair to ~scene 5, exercises the upgraded
// preference-chain payoffs in clean real prose, and captures the actual payoff asides + scene prose
// so taste (natural story vs UI quiz) can be judged. Read-only judgment after; no fixes in-run.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/taste_c.json';
function log(...a){ console.error(...a); }
const INPUTS = [
  { a: "I hold his gaze instead of looking away.",           d: "You don't get to decide what this is." },
  { a: "I let myself notice how close he's standing.",       d: "" },
  { a: "I press for what he's really after.",                d: "Tell me the truth. All of it." },
  { a: "I close the last of the distance between us.",       d: "Stop pretending you don't feel this." },
];

async function triggerAside(page, kind, arg) {
  // create a node in the story container, call the reveal fn, wait for the async AI aside, capture it.
  return await page.evaluate(async (args) => {
    const cont = document.getElementById('storyPagesContainer') || document.getElementById('storyText') || document.body;
    const node = document.createElement('div'); node.className = 'sme-resolved scene1-micro-expr taste-probe'; cont.appendChild(node);
    try {
      if (args.kind === 'demand_hint') window._revealDemandHintExpansion(node, args.arg);
      else if (args.kind === 'reverie_linger') window._revealReverieExpansion(node, {});
      else if (args.kind === 'reverie_focus') window._revealReverieSkipBeat(node);
    } catch (e) { return { err: e.message }; }
    return { ok: true };
  }, { kind, arg });
}
async function readAside(page, sel) {
  return await page.evaluate((sel) => { const els = [...document.querySelectorAll(sel)]; const e = els[els.length-1]; return e ? (e.innerText || e.textContent || '') : ''; }, sel);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  page.on('console', m=>{ const t=m.text(); if (/DEMAND-HINT-EXPANSION|REVERIE|REVERIE-SKIP|GOAL-RELATIONSHIP|AXIS-SHAPE-SCRUB|GR-FIRST-PROBE|isAxisProbeScene/i.test(t)) log('  >', t.slice(0,140)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function' && typeof window._revealDemandHintExpansion==='function' && typeof window._getProbeCadenceForCurrentStory==='function', { timeout:40000 });
  await page.waitForTimeout(600);

  await page.evaluate(()=>{
    window.__scenes=[];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity=function(pr){ try{ if(typeof pr==='string'&&pr.length>150) window.__scenes.push({text:pr,turn:window.state.turnCount||0}); }catch(_){} return Promise.resolve(null); };
    const s=window.state; window._devBypass=true; window._forceAudits=true;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{}; s.picks.world='billionaire'; s.picks.flavor='affair'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='billionaire_modern'; s.picks.playermask='OPEN_VEIN';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.loveInterestName='Dorian'; s.liGender='male';
    s.archetype={primary:'DARK_VICE',modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.storyLength='affair'; s.tier='affair'; s.intensity='Steamy';
    s.name='Mara'; s.pov='first_person'; s.turnCount=0; s.playerName='Mara'; s.partnerName='Dorian';
    s.identity={playerName:'Mara',partnerName:'Dorian',displayPlayerName:'Mara',displayPartnerName:'Dorian'};
    s.picks.identity=s.identity;
    try { const p=document.getElementById('playerNameInput'); if(p)p.value='Mara'; const l=document.getElementById('partnerNameInput'); if(l)l.value='Dorian'; } catch(_){}
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s.series_id=null; s.issueIndexInRun=1; s._prefMemory={};
  });

  const out = { cadence:null, scenes:[], demandHint:{}, reverie:{}, goalRel:{}, notes:[] };
  out.cadence = await page.evaluate(()=>{ try{ return window._getProbeCadenceForCurrentStory(); }catch(_){ return null; } });

  // ── Scene 1 ──
  log('[C] Scene 1 …');
  await page.evaluate(async ()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  { const t0=Date.now(); let ll=-1,st=0; while(Date.now()-t0<300000){ await page.waitForTimeout(3000); const s=await page.evaluate(()=>{const a=window.__scenes||[],l=a[a.length-1]||{},x=window.state;return{n:a.length,busy:!!(x._isAdvancingScene||x._stagedSubmitting),len:(l.text||'').length};}); if(s.n>=1&&!s.busy&&s.len>150){ if(s.len===ll){st+=3000;if(st>=6000)break;}else{ll=s.len;st=0;} } } }
  const s1 = await page.evaluate(()=>{ const a=window.__scenes||[]; const s=window.state; return { text:(a[0]||{}).text||'', widgetQ: s._microDecisionLibraryQuestion||'' }; });
  out.scenes.push({ n:1, text:s1.text }); out.demandHint.widgetQuestion = s1.widgetQ;

  // Answer Demand/Hint = DIRECT + trigger the immediate expansion
  await page.evaluate(()=>{ try{ window._recordScene1Directness(true); }catch(_){} });
  await triggerAside(page, 'demand_hint', true);
  await page.waitForTimeout(7000);
  out.demandHint.directExpansion = await readAside(page, '.demand-hint-expansion');
  out.demandHint.sig = await page.evaluate(()=>window.state.scene1DirectnessSignal);
  // also capture the SUBTLE variant for comparison
  await triggerAside(page, 'demand_hint', false);
  await page.waitForTimeout(7000);
  const dhAsides = await page.evaluate(()=>[...document.querySelectorAll('.demand-hint-expansion')].map(e=>e.innerText||''));
  out.demandHint.subtleExpansion = dhAsides.length>1 ? dhAsides[dhAsides.length-1] : '';

  // ── advance scenes 2..5 ──
  async function advance(inp){ const before=await page.evaluate(()=>(window.__scenes||[]).length); await page.evaluate(async (a)=>{ const s=window.state; s._petitionEmergenceFired=true; s._isAdvancingScene=false; const ai=document.getElementById('actionInput'),di=document.getElementById('dialogueInput'),b=document.getElementById('submitBtn'); if(ai)ai.value=a.a; if(di)di.value=a.d; if(b){b.disabled=false;b.click();} },inp); const t0=Date.now();let ll=-1,st=0; while(Date.now()-t0<300000){ await page.waitForTimeout(3000); const s=await page.evaluate(()=>{const a=window.__scenes||[],l=a[a.length-1]||{},x=window.state;return{n:a.length,busy:!!(x._isAdvancingScene||x._stagedSubmitting),len:(l.text||'').length};}); if(s.n>before&&!s.busy&&s.len>150){ if(s.len===ll){st+=3000;if(st>=6000)break;}else{ll=s.len;st=0;} } } return await page.evaluate(()=>{const a=window.__scenes||[];const l=a[a.length-1]||{};return{text:l.text||'',turn:l.turn};}); }
  for (let sc=2; sc<=5; sc++){ log(`[C] Scene ${sc} …`); const r=await advance(INPUTS[sc-2]||INPUTS[INPUTS.length-1]); out.scenes.push({ n:sc, text:r.text, turn:r.turn }); }

  // ── Reverie payoffs (both poles) — trigger on a scene node ──
  await triggerAside(page, 'reverie_linger'); await page.waitForTimeout(7000);
  out.reverie.lingerExpansion = await readAside(page, '.reverie-expansion');
  await triggerAside(page, 'reverie_focus'); await page.waitForTimeout(1500);
  out.reverie.focusBeat = await readAside(page, '.reverie-skip-beat');

  // ── Goal/Relationship bridge — set a relationship-lean resolution, read the NEXT scene's opening ──
  await page.evaluate(()=>{ const s=window.state; s._priorMicroDecisionResolution={ chosen:'him', rejected:'the deal', signal:'relationship+', atScene:(s.turnCount||0) }; });
  out.goalRel.bridgeDirective = await page.evaluate(()=>{ try{ return typeof window._buildGoalRelationshipBridgeDirective==='function' ? window._buildGoalRelationshipBridgeDirective(window.state) : ''; }catch(_){ return ''; } });
  { log('[C] GR bridge scene …'); const r=await advance(INPUTS[3]); out.goalRel.nextSceneAfterRelChoice = r.text; }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  log('\n=== C TASTE CAPTURE COMPLETE ===');
  log('cadence.axis: '+JSON.stringify(out.cadence&&out.cadence.axis));
  log('scenes captured: '+out.scenes.length);
  log('DH widget: '+JSON.stringify(out.demandHint.widgetQuestion));
  log('DH direct expansion: '+JSON.stringify((out.demandHint.directExpansion||'').slice(0,120)));
  log('DH subtle expansion: '+JSON.stringify((out.demandHint.subtleExpansion||'').slice(0,120)));
  log('Reverie linger: '+JSON.stringify((out.reverie.lingerExpansion||'').slice(0,120)));
  log('Reverie focus: '+JSON.stringify((out.reverie.focusBeat||'').slice(0,120)));
  log('GR bridge directive present: '+!!out.goalRel.bridgeDirective);
  log(`WROTE ${OUT}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
