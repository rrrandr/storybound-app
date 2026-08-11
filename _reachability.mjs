// _reachability.mjs — Roman 2026-08-11. Give "tree-opener" a MATHEMATICAL meaning: an event whose removal disconnects
// large portions of the reachable future graph. Build depth-2 reachability: IR0 → enumerate depth-1 events → forward-
// simulate each → enumerate depth-2 futures → cluster futures → per depth-1 event compute REACH (distinct futures it
// leads to) and UNIQUE (futures reachable ONLY through it). High UNIQUE/REACH = structural tree-opener. No taste.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, list DISTINCT irreversible events LICENSED by this IR, each a NEW fact (not restating). Do NOT rank/judge. Return STRICT JSON {"events":["<event>",...]}.';
const CLUS_SYS='Group these numbered future-events into DISTINCT reachable future-states (same = same core future situation). Return STRICT JSON {"assignments":[<cluster idx per event, same length>],"labels":["<label per cluster>"]}.';
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT: '+(g.default_trajectory||'');}
const S0={facts:['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'],event:'Julian publicly accepted blame for the forbidden wish.'};
fs.mkdirSync(DIR,{recursive:true});
console.log('=== REACHABILITY GRAPH — structural tree-openers (depth-2, no taste) ===\n');
const ir0=irText(await call(SIM_SYS,'CURRENT WORLD STATE:\n'+S0.facts.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+S0.event+'\n\nReturn the JSON now.',1500,0.4));
const d1=((await call(ENUM_SYS,ir0+'\n\nReturn the JSON now.',900,0.7)||{}).events||[]).slice(0,10).map(String);
console.log('DEPTH-1 events ('+d1.length+'):'); d1.forEach((e,i)=>console.log('  '+i+'. '+e)); console.log('');
// forward-simulate each d1 event → enumerate depth-2 futures
const d2byEvent=[];
for(const e of d1){
 const gi=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+S0.facts.concat([e]).map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+e+'\n\nReturn the JSON now.',1400,0.4);
 const fe=((await call(ENUM_SYS,irText(gi)+'\n\nReturn the JSON now.',800,0.7)||{}).events||[]).map(String);
 d2byEvent.push(fe);
}
// cluster all depth-2 futures into a common vocabulary
const flat=[]; d2byEvent.forEach((fe,ei)=>fe.forEach(f=>flat.push({ei,f})));
const cl=await call(CLUS_SYS,'FUTURE-EVENTS:\n'+flat.map((x,i)=>i+'. '+x.f).join('\n')+'\n\nReturn the JSON now.',1600,0)||{assignments:[],labels:[]};
const asg=cl.assignments||[],labels=cl.labels||[];
// per depth-1 event: set of reachable future-clusters; global cluster→{events that reach it}
const reach=d1.map(()=>new Set()); const clusterReachers={};
flat.forEach((x,i)=>{const c=asg[i];if(c==null)return;reach[x.ei].add(c);(clusterReachers[c]=clusterReachers[c]||new Set()).add(x.ei);});
const union=new Set(asg.filter(x=>x!=null)).size;
const rows=d1.map((e,ei)=>{const R=reach[ei];const uniq=[...R].filter(c=>clusterReachers[c].size===1).length;return{ei,event:e,reach:R.size,unique:uniq,dominance:+(R.size/union).toFixed(2)};}).sort((a,b)=>b.unique-a.unique||b.reach-a.reach);
console.log('Total distinct reachable futures (depth-2 union): '+union+'\n');
console.log('DEPTH-1 event                                          REACH  UNIQUE  DOMINANCE');
rows.forEach(r=>console.log('  '+r.event.slice(0,50).padEnd(52)+String(r.reach).padEnd(7)+String(r.unique).padEnd(8)+r.dominance));
fs.writeFileSync(DIR+'/reachability_report.json',JSON.stringify({d1,union,rows,labels},null,2));
console.log('\nTREE-OPENERS = high UNIQUE (removing them disconnects futures only they reach) and/or high DOMINANCE (reach most of the future).');
console.log('LEAVES = low reach/unique (dead ends). This is a GRAPH property — no drama/taste. Saved → reachability_report.json');
process.exit(0);
