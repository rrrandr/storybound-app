// RETRY / ESCALATION LOOP — the planner orchestration that ties the pipeline together.
// On each attempt: localize → execute → verify(§1). ACCEPT commits; ROLLBACK discards the candidate and the
// original is retained (MONOTONIC — `current` only advances on an accept). Klein retries up to its budget
// (growing the mask each try — the A4 result showed FLUX-on-a-tight-crop is often too weak); on exhaustion it
// escalates to regen ONLY if economics said regen pays off, else surfaces. Every dependency is INJECTED so
// the control flow is unit-testable with stubs and production-wireable with the real components.
export async function repairDefect({ imagePath, scene, defect, decision, preSet, deps }){
  const { localize, execute, verify, regen, log=()=>{} } = deps;
  const targetKey = `${defect.class}:p${defect.panel}`;
  const kleinBudget = decision.execution.retry_budget ?? 2;
  const regenBudget = decision.execution.regen_budget ?? 1;
  const escalateTo  = decision.execution.escalate_to;      // 'regen' | null
  let current = imagePath;                                 // MONOTONIC: replaced ONLY on an accepted candidate
  const trail = [];

  if(decision.execution.method === 'klein'){
    for(let attempt=1; attempt<=kleinBudget; attempt++){
      const box = await localize(current, defect, attempt);          // mask (grown on retry — see stub/adapter)
      const candidate = await execute(current, box, defect, attempt);
      const v = await verify(preSet, candidate, targetKey, scene);
      trail.push({ stage:'klein', attempt, mask_area_percent: box.mask_area_percent, accept: v.accept });
      log(`klein #${attempt} mask=${box.mask_area_percent}% → ${v.accept?'ACCEPT':'rollback'}`);
      if(v.accept) return { status:'repaired', method:'klein', attempts:attempt, image:candidate, trail };
      // rollback: discard candidate; `current` unchanged (never degraded)
    }
    if(escalateTo !== 'regen'){
      log(`klein exhausted; regen NOT economical → surface`);
      return { status:'surfaced', reason:'klein exhausted; regen not economical', image:current, trail };
    }
    log(`klein exhausted → escalate to regen (economical)`);
  }

  // regen path: either the chosen method, or Klein escalated to it
  for(let attempt=1; attempt<=regenBudget; attempt++){
    const candidate = await regen(current, defect, attempt);
    const v = await verify(preSet, candidate, targetKey, scene);
    trail.push({ stage:'regen', attempt, accept: v.accept });
    log(`regen #${attempt} → ${v.accept?'ACCEPT':'rollback'}`);
    if(v.accept) return { status:'repaired', method:'regen', attempts:attempt, image:candidate, trail };
  }
  log(`all attempts failed → surface (original retained)`);
  return { status:'surfaced', reason:'all repair attempts failed', image:current, trail };
}

// ---- control-flow validation (stubbed deps script the accept/rollback sequence) ----
if(import.meta.url===`file://${process.argv[1]}`){
  const ORIGINAL='ORIG.png';
  const stub = (verifyScript) => { let i=0; return {
    localize: async (_img,_d,attempt)=>({ box_px:[0,0,10,10], mask_area_percent: +(4*attempt).toFixed(1) }), // grows per attempt
    execute:  async (_img,_b,_d,attempt)=>`cand@klein${attempt}`,
    regen:    async (_img,_d,attempt)=>`cand@regen${attempt}`,
    verify:   async ()=>({ accept: verifyScript[i++] ?? false }),
  }; };
  const D_esc   = { execution:{ method:'klein', retry_budget:2, escalate_to:'regen', regen_budget:1 } };
  const D_noesc = { execution:{ method:'klein', retry_budget:2, escalate_to:null } };
  const D_regen = { execution:{ method:'regen', retry_budget:2, regen_budget:1 } };
  const defect = { class:'anatomy', panel:2 };
  const run = (verifyScript, decision) => repairDefect({ imagePath:ORIGINAL, scene:'', defect, decision, preSet:[], deps:stub(verifyScript) });

  const CASES = [
    { name:'klein accepts on 1st try',        script:[true],           decision:D_esc,   expect:{status:'repaired',method:'klein',attempts:1, image:'cand@klein1'} },
    { name:'klein accepts on RETRY (2nd)',    script:[false,true],     decision:D_esc,   expect:{status:'repaired',method:'klein',attempts:2, image:'cand@klein2'} },
    { name:'klein exhausted → regen accepts', script:[false,false,true],decision:D_esc,  expect:{status:'repaired',method:'regen',attempts:1, image:'cand@regen1'} },
    { name:'klein exhausted, NOT economical', script:[false,false],    decision:D_noesc, expect:{status:'surfaced', image:ORIGINAL} },
    { name:'everything fails → surface',      script:[false,false,false],decision:D_esc, expect:{status:'surfaced', image:ORIGINAL} },
    { name:'method=regen from the start',     script:[true],           decision:D_regen, expect:{status:'repaired',method:'regen',attempts:1} },
  ];
  (async()=>{
    console.log('RETRY / ESCALATION LOOP — control-flow validation (stubbed execute/verify)\n');
    let allPass=true;
    for(const c of CASES){
      const r = await run(c.script, c.decision);
      const ok = Object.entries(c.expect).every(([k,val])=> r[k]===val);
      // monotonicity: a surfaced result MUST return the untouched original
      const mono = r.status!=='surfaced' || r.image===ORIGINAL;
      const pass = ok && mono; if(!pass) allPass=false;
      console.log(`  ${pass?'PASS':'FAIL'}  ${c.name.padEnd(34)} → ${r.status}/${r.method||'—'} attempts=${r.attempts||'-'} img=${r.image}${mono?'':'  ✗MONOTONICITY'}`);
    }
    console.log(`\n=== ${allPass?'ALL CONTROL-FLOW CASES PASS ✓ — retry→escalate→surface + monotonic (original retained until an accept)':'FAIL ✗'} ===`);
  })().catch(e=>{console.error('ERR',e);process.exit(1);});
}
