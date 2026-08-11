// _serial20_spine.mjs — Roman 2026-08-11. Restore PLANNER A (spine = NARRATIVE BUDGET). Same dumb random local selector
// as _serial20, but now a BUDGET FILTER drops any enumerated event that would RESOLVE a still-LOCKED story obligation
// before its unlock scene. Tests: does enforcing forbidden-until-scheduled resolutions keep the debt alive to ~18 and
// stop the drift (startup), instead of resolving at 10? The ONE added variable vs _serial20 = the budget filter.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, list DISTINCT irreversible events LICENSED by it, each a NEW fact (not restating anything already true). Do NOT rank/judge. Return STRICT JSON {"events":["<event>",...]} ~10 events.';
// SPINE (Planner A) = narrative budget: obligations that must stay UNRESOLVED until their unlock scene.
const SPINE=[
 {ob:'The ritual debt/cost hanging over Julian is resolved, collected, paid, lifted, or fulfilled',unlock:18},
 {ob:'Julian is exonerated, cleared, proven innocent, or escapes accountability',unlock:18},
 {ob:'The true wish-maker is fully exposed, publicly named, caught, or punished',unlock:19},
 {ob:'Lirael and Julian confess their feelings, consummate, or fully reveal the core secret to each other',unlock:17},
 {ob:'Julian abandons the situation for a new life/career (leaving the central conflict behind)',unlock:99}
];
const BUDGET_SYS='You enforce a story SPINE (a narrative budget). You are given LOCKED OBLIGATIONS (resolutions that are FORBIDDEN this scene) and a list of candidate EVENTS. Return the indices of events that would RESOLVE, SUBSTANTIALLY SPEND, or PRE-EMPT any locked obligation (even partially). Be strict — err toward blocking anything that cashes in a locked future. Return STRICT JSON {"blocked":[indices]}.';
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT: '+(g.default_trajectory||'');}
function toks(s){return new Set(String(s||'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));}
function jac(a,b){const A=toks(a),B=toks(b);let i=0;A.forEach(w=>{if(B.has(w))i++;});return i/(A.size+B.size-i||1);}
function maxJac(e,l){let m=0;l.forEach(x=>{const j=jac(e,x);if(j>m)m=j;});return m;}
const DUP=0.5;
let facts=['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'];
let lastEvent='Julian publicly accepted blame for the forbidden wish.';
const committed=[],logs=[];
fs.mkdirSync(DIR,{recursive:true});
console.log('=== SERIAL 20 + SPINE (narrative budget) — dumb random local selector, budget-enforced ===\n');
for(let s=1;s<=20;s++){
 const locked=SPINE.filter(o=>s<o.unlock);
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+facts.slice(-11).map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+lastEvent+'\n\nReturn the JSON now.',1400,0.4);
 if(!g){console.log('scene '+s+' SIM ERR');break;}
 const events=((await call(ENUM_SYS,irText(g)+'\n\nReturn the JSON now.',900,0.8)||{}).events||[]).map(String);
 const bl=(await call(BUDGET_SYS,'LOCKED OBLIGATIONS (forbidden to resolve this scene):\n'+locked.map(o=>'- '+o.ob).join('\n')+'\n\nCANDIDATE EVENTS:\n'+events.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',300,0)||{blocked:[]}).blocked||[];
 const blocked=new Set(bl);
 const survivors=events.filter((e,i)=>!blocked.has(i) && maxJac(e,committed)<DUP && maxJac(e,facts)<DUP);
 const picked=survivors.length?survivors[Math.floor(Math.random()*survivors.length)]:(events.find((e,i)=>!blocked.has(i))||events[0]||'(none)');
 committed.push(picked);facts.push(picked);lastEvent=picked;
 logs.push({scene:s,total:events.length,blocked:blocked.size,survivors:survivors.length,picked});
 console.log('  scene '+String(s).padStart(2)+'  blocked '+String(blocked.size)+'  survivors '+String(survivors.length)+'/'+events.length+'  → '+picked.slice(0,66));
}
fs.writeFileSync(DIR+'/serial20_spine_report.json',JSON.stringify({SPINE,logs,committed},null,2));
let distinct=0;const seen=[];committed.forEach(e=>{if(maxJac(e,seen)<DUP){distinct++;seen.push(e);}});
console.log('\nBLOCKED curve: ['+logs.map(x=>x.blocked).join(', ')+']');
console.log('MOMENTUM: '+distinct+'/'+committed.length+' distinct.');
console.log('READ: if the debt/exoneration are NOT resolved before ~scene 18 and no startup-drift appears, the SPINE-as-budget restored pacing authority.');
process.exit(0);
