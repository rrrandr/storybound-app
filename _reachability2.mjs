// _reachability2.mjs — reachability over the SATURATED branch set (fixes single-enum variance). Sample depth-1 to
// saturation → cluster to core branches → forward-simulate a representative of each → enumerate depth-2 (saturated) →
// cluster futures → per branch REACH (distinct futures) + UNIQUE (only via it) + DOMINANCE. Structural tree-openers, no taste.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, list DISTINCT irreversible events LICENSED by it, each a NEW fact. Do NOT rank/judge. Return STRICT JSON {"events":["<event>",...]}.';
const CLUS_SYS='Group numbered events into DISTINCT branches (same=same core problem). Return STRICT JSON {"assignments":[<idx per event, same length>],"labels":["<label>"],"reps":[<index of one representative event per cluster, in cluster-index order>]}.';
const CLUS2_SYS='Group numbered future-events into DISTINCT reachable future-states. Return STRICT JSON {"assignments":[<idx per event, same length>],"labels":["<label>"]}.';
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT: '+(g.default_trajectory||'');}
async function sampleEvents(ir,batches){const ev=[];for(let b=0;b<batches;b++){const r=await call(ENUM_SYS,ir+'\n\nReturn the JSON now.',900,0.8);(r&&r.events||[]).forEach(e=>ev.push(String(e)));}return ev;}
const S0={facts:['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'],event:'Julian publicly accepted blame for the forbidden wish.'};
fs.mkdirSync(DIR,{recursive:true});
console.log('=== REACHABILITY over SATURATED branch set (depth-2, no taste) ===\n');
const ir0=irText(await call(SIM_SYS,'CURRENT WORLD STATE:\n'+S0.facts.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+S0.event+'\n\nReturn the JSON now.',1500,0.4));
const d1raw=await sampleEvents(ir0,4);
const cl1=await call(CLUS_SYS,'EVENTS:\n'+d1raw.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',900,0)||{labels:[],reps:[]};
const reps=(cl1.reps||[]).map(i=>d1raw[i]).filter(Boolean);
const branches=cl1.labels||[];
console.log('DEPTH-1 core branches ('+branches.length+', from '+d1raw.length+' samples):');
branches.forEach((b,i)=>console.log('  '+i+'. '+b+'   → rep: '+(reps[i]||'?')));
console.log('');
const d2byBranch=[];
for(const rep of reps){
 const gi=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+S0.facts.concat([rep]).map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+rep+'\n\nReturn the JSON now.',1400,0.4);
 d2byBranch.push(await sampleEvents(irText(gi),2));
}
const flat=[];d2byBranch.forEach((fe,bi)=>fe.forEach(f=>flat.push({bi,f})));
const cl2=await call(CLUS2_SYS,'FUTURE-EVENTS:\n'+flat.map((x,i)=>i+'. '+x.f).join('\n')+'\n\nReturn the JSON now.',1800,0)||{assignments:[]};
const asg=cl2.assignments||[],lab2=cl2.labels||[];
const reach=reps.map(()=>new Set());const reachers={};
flat.forEach((x,i)=>{const c=asg[i];if(c==null)return;reach[x.bi].add(c);(reachers[c]=reachers[c]||new Set()).add(x.bi);});
const union=new Set(asg.filter(x=>x!=null)).size;
const rows=reps.map((e,bi)=>({branch:branches[bi]||('b'+bi),reach:reach[bi].size,unique:[...reach[bi]].filter(c=>reachers[c].size===1).length,dom:+(reach[bi].size/union).toFixed(2)})).sort((a,b)=>b.unique-a.unique||b.reach-a.reach);
console.log('Total distinct depth-2 futures (union): '+union+'\n');
console.log('DEPTH-1 BRANCH                                          REACH  UNIQUE  DOM');
rows.forEach(r=>console.log('  '+String(r.branch).slice(0,50).padEnd(52)+String(r.reach).padEnd(7)+String(r.unique).padEnd(8)+r.dom));
fs.writeFileSync(DIR+'/reachability2_report.json',JSON.stringify({branches,reps,union,rows,futures:lab2},null,2));
console.log('\nTREE-OPENER = high UNIQUE (futures only it reaches) &/or high DOM. Structural, no drama. → reachability2_report.json');
process.exit(0);
