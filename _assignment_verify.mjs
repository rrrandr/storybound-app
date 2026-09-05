// _assignment_verify.mjs — FREE static acceptance for the sceneAssignment refactor. No LLM calls.
import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window._selectSceneAssignment&&window._currentSceneNumber&&window.STARTER_PLANS,{timeout:40000});
const r=await p.evaluate(()=>{
  const out={}; const S=window.state;
  S.playerName='Lirael'; S.partnerName='Julian'; S.loveInterestName='Julian'; S._starterId='starter_first_sacrifice';
  // scene numbering
  S._isScene1Build=true;  out.sceneNum_scene1=window._currentSceneNumber(S);
  S._isScene1Build=false; S.turnCount=0; out.sceneNum_tc0=window._currentSceneNumber(S);
  S.turnCount=1;          out.sceneNum_tc1=window._currentSceneNumber(S);
  const plan=window.STARTER_PLANS['starter_first_sacrifice'];
  const orig=plan.scenes.slice();
  // A — structured plan scene with explicit fields
  plan.scenes=[{n:5,goal:'Lirael passes the folded note to her contact at the market stall.',
                setting:'market stall', participants:['Lirael','Carys'], props:['folded note'], exitState:'the contact has the note'}];
  out.A=window._selectSceneAssignment(S,5);
  // B — plan goal that names no place: setting must stay null, NOT invented
  plan.scenes=[{n:6,goal:'Lirael forces the gatekeeper to name the road Julian took with the relic.'}];
  out.B=window._selectSceneAssignment(S,6);
  // B2 — authored-style goal (the 0/20 shape)
  plan.scenes=[{n:7,goal:'The ceremony collapses into accusations; the PC tries to explain something she does not understand herself.'}];
  out.B2=window._selectSceneAssignment(S,7);
  // D — CORRIDOR: no plan at all, planner scene_mission is the source
  plan.scenes=[]; S._starterId=null; S._sceneMissionCurrent='Mara hands Dorian the signed resignation letter.';
  out.D=window._selectSceneAssignment(S,4);
  // D2 — no source at all → null (existing fallback behavior preserved)
  S._sceneMissionCurrent=null; S._scene1Mission=null; out.D2=window._selectSceneAssignment(S,4);
  plan.scenes=orig; S._starterId='starter_first_sacrifice';
  return out;
});
await b.close();
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+'  '+m);
console.log('\n════ SCENE ASSIGNMENT — STATIC ACCEPTANCE ════');
console.log('— canonical scene number —');
ok(r.sceneNum_scene1===1,'Scene 1 build → 1  (got '+r.sceneNum_scene1+')');
ok(r.sceneNum_tc0===2,'turnCount 0 → scene 2  (got '+r.sceneNum_tc0+')');
ok(r.sceneNum_tc1===3,'turnCount 1 → scene 3  (got '+r.sceneNum_tc1+')');
console.log('— A: structured plan scene —');
ok(r.A&&r.A.source==='plan-scene','source=plan-scene  (got '+(r.A&&r.A.source)+')');
ok(r.A&&r.A.setting==='market stall','setting supplied verbatim  (got '+JSON.stringify(r.A&&r.A.setting)+')');
ok(r.A&&!r.A._settingInferred,'setting NOT inferred (explicit wins)');
ok(r.A&&(r.A.participants||[]).join()==='Lirael,Carys','participants passed through');
ok(r.A&&(r.A.props||[]).join()==='folded note','props passed through');
ok(r.A&&r.A.stateChange==='the contact has the note','stateChange passed through');
console.log('— B: goal names no place —');
ok(r.B&&r.B.source==='plan-scene','B source=plan-scene');
ok(r.B&&!r.B.setting,'B setting stays NULL, not invented  (got '+JSON.stringify(r.B&&r.B.setting)+')');
ok(r.B2&&!r.B2.setting,'B2 (authored 0/20 shape) setting NULL  (got '+JSON.stringify(r.B2&&r.B2.setting)+')');
ok(r.B2&&!!r.B2.event,'B2 still carries the event to the author');
console.log('— D: Corridor —');
ok(r.D&&r.D.source==='scene-mission','source=scene-mission  (got '+(r.D&&r.D.source)+')');
ok(r.D&&/resignation letter/.test(r.D.event),'corridor event carried');
ok(r.D2===null,'no source → null (legacy fallback preserved)');
// participants dedupe (Roman 2026-08-16)
const b2=await (await import('playwright-core')).chromium.launch({headless:true});
const p2=await (await b2.newContext()).newPage();
await p2.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p2.waitForFunction(()=>window._selectSceneAssignment,{timeout:40000});
const dd=await p2.evaluate(()=>{const S=window.state;
  S.playerName='Mara'; S.partnerName='Dorian'; S.loveInterestName='Dorian'; S._starterId=null;
  S._sceneMissionCurrent='Mara hands Dorian the signed resignation letter in the elevator.';
  const a=window._selectSceneAssignment(S,2);
  S._starterId='starter_first_sacrifice';
  return a&&a.participants;});
await b2.close();
console.log('— participants dedupe —');
console.log('  '+(dd&&new Set(dd.map(x=>x.toLowerCase())).size===dd.length?'✅':'❌')+'  no case-insensitive duplicates  (got '+JSON.stringify(dd)+')');
