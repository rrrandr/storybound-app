// REPAIR PLANNER — milestone 2, component 1: CONFIDENCE via CORROBORATION.
// The frozen Verifier v1.0 is deliberately minimal (no confidence — adding it perturbed perception). So
// confidence is computed HERE, downstream, by corroboration: run the frozen verifier N times and measure
// per-defect AGREEMENT across runs. This turns the verifier's characterized non-determinism (blatant defects
// every run; borderline ones flicker) INTO the confidence signal — without ever touching perception.
// Consumes VerifierOutput {defects:[{class,panel,note}]} → emits RepairDecision {confidence, repair_method,
// policy, location(note-derived)}. (Roman's sequence: confidence first.)
import { classify } from './_two_channel_classifier.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(ROOT, 'test/fixtures/benchmark-A');
const PROXY = 'http://localhost:3000/api/gemini-proxy';
const N = 4;

// IQS locality → repair method. localized defect → Klein inpaint; structural → regenerate the panel.
const METHOD = { 'text-leak':'klein', 'anatomy':'klein', 'expression':'klein', 'background':'klein',
                 'species':'regen', 'continuity':'regen', 'burst':'regen', 'buoyancy':'regen' };
const tier = (k,n) => (k/n >= 0.75 ? 'high' : k/n >= 0.4 ? 'medium' : 'low');
const sleep = ms => new Promise(r=>setTimeout(r,ms));

// ---- Component 2: SEVERITY. One batched PRIORITIZER call per sheet — it rates already-confirmed defects,
// never re-detects (so it can't perturb the frozen verifier's findings). Downstream planner judgment. ----
const SEV_PROMPT = (scene, ds) => `You are the REPAIR PRIORITIZER for a Storybound 2x2 comic sheet. The defects below were ALREADY confirmed by the verifier — do NOT add, remove, or dispute them. Your ONLY job: rate how much each DEGRADES THE READER EXPERIENCE = severity.
SCENE: ${scene}
- high   = a reader immediately reads it as broken / AI-glitch: a caption or label lettered in, a character's NAME as signage, a tangled/melted/extra-finger hand in a FOCAL gesture, a duplicated person, a figure floating where gravity applies.
- medium = noticeable on a second look, not glaring.
- low    = easily missed / plausibly real set-dressing: garbled or unreadable BACKGROUND neon/signage in a city (real cities are full of unreadable signs), a minor imperfection on a background or partly-hidden hand.
DEFECTS:
${ds.map((d,i)=>`[${i}] ${d.class}, panel ${String(d.panel).replace('p','')}: ${d.location}`).join('\n')}
Output ONLY JSON {"severities":[{"i":<index>,"severity":"high|medium|low"}]}. No prose.`;

async function callProxy(text, imgPath){
  const body={ model:'gemini-2.5-flash', temperature:0, max_tokens:900, messages:[{role:'user',content:[
    {type:'text',text}, {type:'image',mime_type:'image/png',data:fs.readFileSync(imgPath).toString('base64')} ]}]};
  const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok) return null; const d=await r.json(); const t=d.content||d.choices?.[0]?.message?.content||'';
  try{ return JSON.parse(String(t).replace(/^```(?:json)?/i,'').replace(/```$/,'').trim()); }catch(_){ return null; }
}
async function scoreSeverity(imgPath, scene, decisions){
  if(!decisions.length) return decisions;
  const res=await callProxy(SEV_PROMPT(scene, decisions), imgPath);
  const map={}; (res?.severities||[]).forEach(s=>{ map[s.i]=s.severity; });
  return decisions.map((d,i)=>({...d, severity: map[i]||'medium'}));
}
// The confidence×severity gate decides WHETHER a defect is worth acting on in principle.
function decide(conf, sev){
  if(conf==='low')  return 'ignore';       // not real enough
  if(sev==='low')   return 'surface';      // real, but not worth a repair call (e.g. garbled background neon)
  if(conf==='high') return 'auto-repair';  // confident AND worth it
  return 'corroborate';                    // worth it, but confidence is only medium → confirm first
}

// ---- Component 3: REPAIR ECONOMICS (the third axis). Pure cost-benefit — no model call. ----
// SEPARATION OF CONCERNS (Roman): the MODEL is architecture (falsifiable, stable); the NUMBERS are POLICY
// (a product decision, tunable, NOT validated). Freeze the formula, never the numbers.
//
// ===== POLICY — PROVISIONAL PLACEHOLDERS. NOT architecture, NOT empirically validated. =====
// These WILL change with real API pricing, measured latency, user telemetry, and OBSERVED repair success
// rates. Versioned & swappable independently of the model below. Do not treat as facts about the world.
const POLICY = {
  version: 'policy-v0-placeholder',
  cost:     { klein:1, regen:8, verify:1 },   // relative units — replace with real $ / latency
  failP:    { klein:0.4, regen:0.25 },        // P(one attempt fails re-verify) — replace with MEASURED rates
  budget:   { klein:2, regen:1 },             // retry budget per method before escalation/giving up
  sevValue: { high:20, medium:6, low:1 },     // quality gain by severity (product weighting)
  confMult: { high:1, medium:0.6, low:0.2 },  // discount by how sure we are the defect is real
};
// ===== MODEL — STABLE / architectural.  worth = f(confidence, impact, repair_cost).  =====
// Locality → method is architectural (from IQS); every free parameter lives in POLICY above.
// DEFERRED 4th input (not built): repair SUCCESS PROBABILITY. A Klein that succeeds 95% ≠ one that succeeds
// 12%, so eventually  expected_gain = impact × confidence × P(success).  Awaits MEASURED per-method rates.
const LOCALIZED = new Set(['text-leak','anatomy','expression','background']);
const expCost = (method) => { const p=POLICY.failP[method], b=POLICY.budget[method];
  const attempts=(1-Math.pow(p,b+1))/(1-p); return +(attempts*(POLICY.cost[method]+POLICY.cost.verify)).toFixed(1); };

export function economics(cls, confidence, severity){
  const method = LOCALIZED.has(cls) ? 'klein' : 'regen';                                  // MODEL: locality → method
  const gain = +(POLICY.sevValue[severity]*POLICY.confMult[confidence]).toFixed(1);       // MODEL structure, POLICY numbers
  const cost = expCost(method);
  const worth = gain >= cost;                                                             // MODEL: worth = gain ≥ cost
  const escalate_to = (method==='klein' && gain >= expCost('regen')) ? 'regen' : null;    // cost-aware escalation
  return { method, gain, cost, worth, retry_budget:POLICY.budget[method], escalate_to, policy:POLICY.version };
}

// Consume the frozen verifier N times; agreement across runs = confidence.
export async function planRepairs(imgPath, scene, n=N){
  const runs=[]; for(let i=0;i<n;i++){ runs.push(await classify(imgPath, scene)); await sleep(800); }
  // per run: map defect-key (channel:class:panel) -> {instances, representative note}
  const perRun = runs.map(r=>{
    const m=new Map();
    for(const d of [...r.text, ...r.visual]){
      const key=`${d.channel}:${d.class}:p${d.panel}`;
      const e=m.get(key)||{n:0, note:d.note||d.text||''};
      e.n++; m.set(key,e);
    }
    return m;
  });
  const keys=new Set(perRun.flatMap(m=>[...m.keys()]));
  let decisions=[];
  for(const key of keys){
    const present=perRun.filter(m=>m.has(key));
    const k=present.length;
    const [channel,cls,panel]=key.split(':');
    const confidence=tier(k,n);
    const avgInst=+(present.reduce((a,m)=>a+m.get(key).n,0)/k).toFixed(1);
    decisions.push({ channel, class:cls, panel, agreement:`${k}/${n}`, confidence,
      avgInstances:avgInst, repair_method:METHOD[cls]||'review',
      location:present[0].get(key).note }); // location DERIVED from the note (planner-side, not perception)
  }
  // Component 2: score severity (one batched call).
  decisions = await scoreSeverity(imgPath, scene, decisions);
  // Components 2+3: combine confidence×severity into a gate, then let ECONOMICS have the final say —
  // an action that isn't cost-justified is downgraded to 'surface (uneconomical)' even if the gate passed.
  decisions = decisions.map(d=>{
    const gate = decide(d.confidence, d.severity);
    const econ = economics(d.class, d.confidence, d.severity);
    let action = gate;
    if((gate==='auto-repair' || gate==='corroborate') && !econ.worth) action = 'surface·uneconomical';
    return {...d, action, execution: econ};
  });
  const actOrd={'auto-repair':0,'corroborate':1,'surface':2,'surface·uneconomical':2,'ignore':3};
  decisions.sort((a,b)=> (actOrd[a.action]??9)-(actOrd[b.action]??9) || a.class.localeCompare(b.class) || String(a.panel).localeCompare(String(b.panel)));
  return decisions;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const A1='a human woman and a KWISHEEN (tentacle-bodied, coral-dreadlock hair, tentacles instead of legs, humanoid face) in drowned coral ruins, UNDERWATER — figures FLOAT. A red twisted X-burst may appear on at most one panel.';
  const A2='a human woman and a FIRST FAVORED (a near-human luminous humanoid, TWO legs, NO tentacles, ORDINARY ears — pointed ears would be WRONG) in a pale white weeping-willow forest, ON LAND — GRAVITY applies. A red twisted X-burst may appear on at most one panel.';
  const A3='two ORDINARY HUMANS (a woman in a leather jacket, a man in a suit) confront each other on a rain-slicked modern city street at dusk — neon signage, glass towers, a crowd of pedestrians. No fantasy, no creatures; gravity applies.';
  const A4='two ORDINARY HUMANS (Nora, a woman; Daniel, a man) in a heated but non-violent conversation across a table in a contemporary café interior — both present every panel, other patrons behind. A still dialogue beat: no action, no weapons, no magic, no burst, no SFX.';
  const FIXT=[
    {id:'A1 underwater', path:path.join(FIX,'A1_underwater_kwisheen.png'), scene:A1},
    {id:'A2 land/FF',    path:path.join(FIX,'A2_land_firstfavored.png'),  scene:A2},
    {id:'A3 urban',      path:path.join(FIX,'A3_urban_humans.png'),        scene:A3},
    {id:'A4 dialogue',   path:path.join(FIX,'A4_interior_dialogue.png'),   scene:A4}
  ];
  (async()=>{
    console.log(`REPAIR PLANNER — Component 1 (confidence/corroboration) + Component 2 (severity) | frozen Verifier v1.0 | N=${N}`);
    console.log(`GATE = confidence AND severity (orthogonal). action: conf low→ignore · sev low→surface · high+worth→auto-repair · med+worth→corroborate`);
    console.log(`HYPOTHESIS: A2 PHASE conf=high sev=high→auto-repair. A3 DANIEL high/high→auto-repair; garbled neon (DWOOOSE/ONEANS) high conf but LOW sev→SURFACE (not repaired); hands high/high→auto-repair; wobble-hand med→corroborate. A4 hands high/high→auto-repair. A1 clean.\n`);
    for(const f of FIXT){
      const ds=await planRepairs(f.path, f.scene, N);
      console.log(`### ${f.id} ###`);
      if(!ds.length){ console.log('  (no defects — clean)\n'); continue; }
      for(const d of ds) console.log(`  ${String(d.action).toUpperCase().padEnd(12)} conf=${d.confidence.padEnd(6)} sev=${String(d.severity).padEnd(6)} ${(d.class+'/'+d.channel).padEnd(18)} ${d.panel} (agree ${d.agreement}) → ${d.repair_method.padEnd(5)}  "${String(d.location).slice(0,34)}"`);
      console.log('');
    }
    console.log(`=== confidence = corroboration (is it real?); severity = prioritizer (is it worth it?); auto-repair needs BOTH ===`);
  })().catch(e=>{console.error('ERR',e);process.exit(1);});
}
