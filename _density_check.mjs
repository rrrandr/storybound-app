import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR and a BRIDGE GOAL, enumerate DISTINCT CONCRETE scene-events — specific moments a reader WATCHES HAPPEN — that each deepen the relationship a step toward the goal WITHOUT fully achieving it. NOT summaries. Return STRICT JSON {"events":["<scene-event>",...]} ~12.';
const CLS_SYS='For each event return {"concrete":bool,"advances":bool,"achieves":bool,"why":"<6 words>"}. concrete=specific watchable moment not a summary; advances=deepens Lirael–Julian bond; achieves=already fully constitutes "genuine mutual trust". Return STRICT JSON {"tags":[...]}.';
async function call(sys,usr,mt,t){const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}
function ir(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ');}
const facts=['Lirael and Julian formed a reluctant alliance to find the true wish-maker.','They barely know each other and each has reasons to distrust the other.','The ritual debt still hangs over Julian.','The council watches Julian closely.','A hidden journal hinting at the true wish-maker just surfaced.'];
const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+facts.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: Lirael and Julian formed a reluctant alliance.\n\nReturn the JSON now.',1400,0.4);
const evs=((await call(ENUM_SYS,ir(g)+'\n\nBRIDGE GOAL: move from "a reluctant alliance" toward "genuine mutual trust" — concrete scene-events, do NOT fully achieve trust.\n\nReturn the JSON now.',900,0.85)).events||[]).map(String);
const tags=(await call(CLS_SYS,'EVENTS:\n'+evs.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',1000,0)).tags||[];
console.log('ALLIANCE→TRUST bridge candidates (why usable/not):');
evs.forEach((e,i)=>{const t=tags[i]||{};const use=t.concrete&&t.advances&&!t.achieves;console.log('  ['+(use?'USE':'   ')+'] c'+(t.concrete?'Y':'n')+' a'+(t.advances?'Y':'n')+' ach'+(t.achieves?'Y':'n')+'  '+e.slice(0,66)+'  ('+(t.why||'')+')');});
process.exit(0);
