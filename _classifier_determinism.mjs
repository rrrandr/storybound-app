// INSTRUMENT DETERMINISM TEST — the last validation before the repair milestone.
// Question (binary): can (Benchmark A v1 x IQS v1.0 x Prompt v1.0 x gemini-2.5-flash) be treated as a
// REPRODUCIBLE measurement instrument? Freeze all of them; run the SAME frozen fixtures N times; report the
// full metric set. SUCCESS CRITERION IS PRE-REGISTERED below (defined before the run, not fitted after).
//
// Three outcomes are kept DISTINCT (Roman's refinement):
//   BLOCKED   — the environment was unavailable (proxy down / quota 429 / fixtures missing). NOT a
//               measurement. A preflight gate catches this BEFORE any backoff is wasted.
//   UNTESTED  — preflight passed but the run couldn't complete N reps (quota died mid-run). Partial data.
//   USABLE/NOT STABLE — the instrument was actually exercised and evaluated against the criterion.
//
// Staged escalation: preflight (1 real call) -> N=3 -> N=10, so a mid-run quota loss still leaves usable
// information instead of burning the whole budget in retries.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(ROOT, 'test/fixtures/benchmark-A');
const PROXY = 'http://localhost:3000/api/gemini-proxy';
const N_FULL = 10, N_STAGE1 = 3;

// ---- FROZEN measurement regime (a change here opens a NEW regime) ----
const REGIME = { benchmark: 'A v1', iqs: 'v1.0', prompt: 'v1.0', model: 'gemini-2.5-flash' };
const A1 = 'a human woman and a KWISHEEN (tentacle-bodied — humanoid torso, coral-dreadlock hair, tentacles instead of legs, humanoid face) in drowned coral ruins, UNDERWATER — figures FLOAT (no gravity). A red twisted X-burst may appear on at most one panel.';
const A2 = 'a human woman and a FIRST FAVORED (luminous humanoid, pointed ears, Weave-Script skin-glow, TWO ordinary legs — NO tentacles, bipedal) in a pale white weeping-willow forest, ON LAND — GRAVITY applies, figures stand/walk, do NOT float. A red twisted X-burst may appear on at most one panel.';
const CASES = [
  { id: 'A1', label: 'A1 underwater/kwisheen', path: path.join(FIX, 'A1_underwater_kwisheen.png'), scene: A1 },
  { id: 'A2', label: 'A2 land/first-favored',  path: path.join(FIX, 'A2_land_firstfavored.png'),  scene: A2 }
];

// ---- PRE-REGISTERED SUCCESS CRITERION (instrument USABLE iff, per fixture) ----------------------------
//   1. parse success == 100%
//   2. no MAJOR class (present in >=ceil(N/2) runs) ever appears/disappears (classes at count<=1 may flicker)
//   3. every stable class: max-min <= 2 across runs
//   4. no verdict flip (median total >= 3 never reads clean; median 0 never spikes high)
// Operationalizes: "would two engineers reading only the dashboard reach the SAME decision every run?"
const CRIT_TEXT = [
  '1. parse success == 100%',
  '2. no MAJOR class (in >=ceil(N/2) runs) appears/disappears between runs (count<=1 may flicker)',
  '3. every stable class: max-min <= 2 across runs',
  '4. no verdict flip (median>=3 fixture never reads clean; median 0 never spikes high)'
];

const HEAD = (scene) => `You are the ACCEPTANCE-QA gate for a Storybound 2x2 comic sheet (4 panels, TL=1 TR=2 BL=3 BR=4). NOT art critique — production acceptance. For any imperfection the ONLY question: "would this be REGENERATED in production?" If no, not a defect.
SCENE (judge against THIS): ${scene}
HARD invariants (report ONLY these): species (wrong species / defining anatomy absent), continuity (twins, or face/hair/build/clothing/colour/weapon changing between panels), sfx (a sound word for an action not shown), text-leak (any non-SFX word/label lettered in), burst (wrong colour/place, dominating a panel, or a standalone emblem), expression (blank/wooden face in an emotional beat), buoyancy (planted on the ground when the scene has no gravity), background (dead empty world missing bystanders/wildlife/flora/structures/light).
SOFT — NEVER report alone: count tolerances (tentacle count), minor variation, stylization, posing, composition preference.
For each: {"panel":1-4,"class":"...","locality":"localized|structural","severity":"high|med|low"}. Output ONLY JSON {"defects":[...]}. Clean = empty. No prose.`;

function parse(t){ if(!t) return null; let s=String(t).trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim(); const a=s.indexOf('{'),z=s.lastIndexOf('}'); if(a>=0&&z>a)s=s.slice(a,z+1); try{return JSON.parse(s);}catch(_){return null;} }
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); // in-process delay (NOT a shell sleep)

// one classifier call. maxRetries small: preflight already confirmed quota, so a mid-run 429 should abort
// fast (a couple of quick retries) rather than grind 100s of backoff per rep.
async function classifyOnce(c){
  const body={ model:REGIME.model, role:'FALLBACK_AUTHOR', temperature:0, max_tokens:1400,
    messages:[{ role:'user', content:[ {type:'text',text:HEAD(c.scene)}, {type:'image',mime_type:'image/png',data:fs.readFileSync(c.path).toString('base64')} ]}] };
  let r; try{ r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); }catch(e){ return {status:'unreachable', reason:String(e.message||e)}; }
  if(r.status===429) return {status:'429'};
  if(r.status===401||r.status===403) return {status:'auth', code:r.status};
  if(!r.ok) return {status:'http', code:r.status};
  const d=await r.json();
  const text=(d&&(d.content||(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||(d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts&&d.candidates[0].content.parts.map(p=>p.text).join(''))))||'';
  const p=parse(text);
  if(!p||!Array.isArray(p.defects)) return {status:'unparsed', raw:String(text).slice(0,140)};
  return {status:'ok', defects:p.defects};
}
async function classify(c, maxRetries=2){ let wait=5000; for(let a=0;a<=maxRetries;a++){ const v=await classifyOnce(c); if(v.status!=='429') return v; if(a<maxRetries){ await sleep(wait); wait=Math.min(wait*1.6,20000);} } return {status:'429'}; }

const stats=(a)=>{ if(!a.length) return {mean:0,sd:0,min:0,max:0}; const m=a.reduce((x,y)=>x+y,0)/a.length; const v=a.reduce((x,y)=>x+(y-m)**2,0)/a.length; return {mean:+m.toFixed(2),sd:+Math.sqrt(v).toFixed(2),min:Math.min(...a),max:Math.max(...a)}; };

// machine-readable summary alongside the human report — preserves the exact regime + sample counts so
// dashboards never have to parse logs (GPT's suggestion). Written at EVERY exit path.
const SUMMARY_PATH = path.join(ROOT, '_determinism_summary.json');
function writeSummary(status, reason, extra={}){
  const planned = CASES.length * N_FULL;
  const s = { status, reason, benchmark: REGIME.benchmark, iqs: REGIME.iqs, prompt: REGIME.prompt, model: REGIME.model,
    samples_planned: planned, samples_completed: 0, fixtures: {}, timestamp: new Date().toISOString(), ...extra };
  try { fs.writeFileSync(SUMMARY_PATH, JSON.stringify(s, null, 2)); } catch(_){}
  console.log(`\nsummary → ${path.relative(ROOT, SUMMARY_PATH)}  {status:"${status}"${reason?`, reason:"${reason}"`:''}, samples:${s.samples_completed}/${planned}}`);
  return s;
}
const fixtureSummary=(per,N)=>{ const e=evaluate(per,N); return { n:per.length, target:N, pass:e.pass, criteria:{parse:e.c1,class_set:e.c2,magnitude:e.c3,no_flip:e.c4}, totals:e.totals, by_class:e.series }; };
const perOf=(defs)=>{ const byClass={}; let structural=0,localized=0,high=0; for(const d of defs){ byClass[d.class]=(byClass[d.class]||0)+1; if(d.locality==='structural')structural++;else localized++; if(d.severity==='high')high++; } return {total:defs.length,byClass,structural,localized,high}; };

// evaluate the pre-registered criterion over collected per-rep records for one fixture
function evaluate(per, N){
  const totals=per.map(p=>p.total);
  const allClasses=[...new Set(per.flatMap(p=>Object.keys(p.byClass)))];
  const series={}; for(const k of allClasses) series[k]=per.map(p=>p.byClass[k]||0);
  const majority=Math.ceil(N/2);
  const major=allClasses.filter(k=>series[k].filter(x=>x>0).length>=majority);
  const c1=per.length===N;
  const c2=allClasses.every(k=>{ const present=series[k].filter(x=>x>0).length; return present>=majority ? present===N : series[k].every(x=>x<=1); });
  const c3=major.every(k=>(Math.max(...series[k])-Math.min(...series[k]))<=2);
  const med=[...totals].sort((a,b)=>a-b)[Math.floor(totals.length/2)];
  const c4=med>=3 ? Math.min(...totals)>=1 : (med===0 ? Math.max(...totals)<=2 : true);
  return { pass:c1&&c2&&c3&&c4, c1,c2,c3,c4, totals, series, allClasses, major };
}
function printFixture(label, per, N){
  const e=evaluate(per, N); const st=stats(e.totals);
  console.log(`  ${label}  [${e.pass?'PASS ✓':'FAIL ✗'}]  (n=${per.length}/${N})`);
  console.log(`     total:      series=[${e.totals.join(',')}]  mean=${st.mean} sd=${st.sd} range=${st.min}-${st.max}`);
  console.log(`     structural: ${JSON.stringify(stats(per.map(p=>p.structural)))}   high-sev: ${JSON.stringify(stats(per.map(p=>p.high)))}`);
  console.log(`     by class:   ${e.allClasses.map(k=>`${k}[${e.series[k].join(',')}]${e.major.includes(k)?'*':''}`).join('  ')||'(none)'}   (*=major)`);
  console.log(`     criteria:   parse=${e.c1?'✓':'✗'} class-set=${e.c2?'✓':'✗'} magnitude=${e.c3?'✓':'✗'} no-flip=${e.c4?'✓':'✗'}`);
  return e.pass;
}

// ---- PREFLIGHT: is the ENVIRONMENT available? (distinct from whether the instrument is stable) ----------
async function preflight(){
  for(const c of CASES){ if(!fs.existsSync(c.path)) return {ok:false, reason:`fixture missing: ${path.relative(ROOT,c.path)}`}; }
  let ping; try{ ping=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:REGIME.model,messages:[{role:'user',content:'ping'}],max_tokens:5})}); }
  catch(e){ return {ok:false, reason:`proxy unreachable at ${PROXY} (${e.message||e})`}; }
  if(ping.status===429) return {ok:false, reason:'quota exhausted (HTTP 429 on preflight ping)'};
  if(ping.status===401||ping.status===403) return {ok:false, reason:`auth invalid (HTTP ${ping.status})`};
  // one REAL classifier call (probes quota+model+parse in the actual code path)
  const v=await classify(CASES[0], 1);
  if(v.status==='429') return {ok:false, reason:'quota exhausted (HTTP 429 on first real classifier call)'};
  if(v.status==='auth') return {ok:false, reason:`auth invalid (HTTP ${v.code})`};
  if(v.status!=='ok') return {ok:false, reason:`classifier call failed: ${v.status}${v.code?(' '+v.code):''}${v.raw?(' | '+v.raw):''}`};
  return {ok:true, firstRep:v.defects}; // reuse this successful call as A1 rep #1
}

// collect reps up to target for a fixture; abort on a hard 429 (quota died mid-run) — keep partial data
async function collect(c, target, seed){
  const per=[]; if(seed) per.push(perOf(seed));
  while(per.length<target){
    const v=await classify(c, 2);
    if(v.status==='429') return {per, aborted:true};
    if(v.status==='ok') per.push(perOf(v.defects)); // parse/http failures count as non-parse; keep going a bit
    else per.push(null);
    await sleep(4000);
  }
  return {per:per.filter(Boolean), aborted:false, rawLen:per.length};
}

(async()=>{
  console.log(`INSTRUMENT DETERMINISM TEST`);
  console.log(`REGIME (frozen): Benchmark ${REGIME.benchmark} | IQS ${REGIME.iqs} | Prompt ${REGIME.prompt} | Model ${REGIME.model}`);
  console.log(`PRE-REGISTERED criterion (per fixture):\n   ${CRIT_TEXT.join('\n   ')}\n`);

  const pf=await preflight();
  if(!pf.ok){
    console.log(`RESULT: BLOCKED`);
    console.log(`Reason: ${pf.reason}`);
    console.log(`No measurements collected. Determinism NOT evaluated. (Environment unavailable — not an instrument result.)`);
    writeSummary('BLOCKED', /429/.test(pf.reason)?'quota_exhausted':/unreachable/.test(pf.reason)?'proxy_unreachable':/auth/.test(pf.reason)?'auth_invalid':/fixture/.test(pf.reason)?'fixture_missing':'preflight_failed');
    return;
  }
  console.log(`preflight OK — environment available, 1 real classifier call succeeded. Staging N=${N_STAGE1} -> N=${N_FULL}.\n`);

  // STAGE 1 (N=3) — cheap gate: if quota dies here we still have a few samples; if output is garble we bail.
  const stage1=[];
  for(const c of CASES){ const seed = c.id==='A1' ? pf.firstRep : null; stage1.push(await collect(c, N_STAGE1, seed)); }
  const anyAborted1=stage1.some(s=>s.aborted);
  const enough1=stage1.every(s=>s.per.length>=Math.min(2,N_STAGE1));
  if(anyAborted1 || !enough1){
    console.log(`--- staged (N=${N_STAGE1}) — could not complete, quota died mid-run ---`);
    CASES.forEach((c,i)=> stage1[i].per.length ? printFixture(c.label, stage1[i].per, stage1[i].per.length) : console.log(`  ${c.label}: 0 usable reps`));
    console.log(`\n=== INSTRUMENT UNTESTED — partial data only (quota loss mid-run). Re-run when quota is available. ===`);
    { const fx={}; let done=0; CASES.forEach((c,i)=>{ if(stage1[i].per.length){ fx[c.id]=fixtureSummary(stage1[i].per, N_STAGE1); done+=stage1[i].per.length; } }); writeSummary('UNTESTED','quota_loss_midrun',{samples_completed:done, fixtures:fx}); }
    return;
  }
  console.log(`--- provisional (N=${N_STAGE1}) ---`);
  CASES.forEach((c,i)=> printFixture(c.label, stage1[i].per, N_STAGE1));

  // STAGE 2 — escalate to N=10 (collect the remaining reps).
  console.log(`\n--- escalating to N=${N_FULL} ---`);
  const full=[];
  for(let i=0;i<CASES.length;i++){ const more=await collect(CASES[i], N_FULL-stage1[i].per.length, null); full.push({per:[...stage1[i].per, ...more.per], aborted:more.aborted}); }
  const anyAborted2=full.some(s=>s.aborted || s.per.length<N_FULL);
  console.log(`--- FINAL (target N=${N_FULL}) ---`);
  let allPass=true;
  for(let i=0;i<CASES.length;i++){ const p=printFixture(CASES[i].label, full[i].per, N_FULL); if(!p) allPass=false; }
  const fx={}; let done=0; CASES.forEach((c,i)=>{ fx[c.id]=fixtureSummary(full[i].per, N_FULL); done+=full[i].per.length; });
  if(anyAborted2){ console.log(`\n=== INSTRUMENT UNTESTED — could not reach N=${N_FULL} on every fixture (quota). Partial verdict above; re-run to confirm. ===`); writeSummary('UNTESTED','incomplete_reps',{samples_completed:done, fixtures:fx}); return; }
  console.log(`\n=== INSTRUMENT ${allPass?'USABLE ✓ — measurement layer frozen; repair milestone may begin':'NOT STABLE ✗ — investigate variability BEFORE any downstream work'} ===`);
  writeSummary(allPass?'USABLE':'NOT_STABLE', allPass?'criterion_met':'criterion_failed', {samples_completed:done, fixtures:fx});
})().catch(e=>{console.error('ERR',e);process.exit(1);});
