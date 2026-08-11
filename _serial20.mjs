// _serial20.mjs — Roman 2026-08-11. THE serialization experiment. Run the actual architecture 20 scenes with a
// deliberately DUMB selector (enumerate → drop repeats via cheap token-dedup → RANDOM pick). Does the simulator keep
// generating FRESH futures for 20 steps, or does the collapse reappear? Instrument every scene; localize first failure.
// Event-level (no prose) so a collapse costs pennies. If a random selector reaches 20, the ARCHITECTURE solved it.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, list DISTINCT irreversible events LICENSED by it, each a NEW fact (not restating anything already true). Do NOT rank/judge. Return STRICT JSON {"events":["<event>",...]} ~10 events.';
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT: '+(g.default_trajectory||'');}
function toks(s){return new Set(String(s||'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));}
function jac(a,b){const A=toks(a),B=toks(b);let i=0;A.forEach(w=>{if(B.has(w))i++;});return i/(A.size+B.size-i||1);}
function maxJac(e,list){let m=0;list.forEach(x=>{const j=jac(e,x);if(j>m)m=j;});return m;}
const DUP=0.5;
let facts=['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'];
let lastEvent='Julian publicly accepted blame for the forbidden wish.';
const committed=[]; const log=[];
fs.mkdirSync(DIR,{recursive:true});
console.log('=== SERIAL 20 — dumb random selector over the real architecture (no prose) ===\n');
for(let s=1;s<=20;s++){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+facts.slice(-11).map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+lastEvent+'\n\nReturn the JSON now.',1400,0.4);
 if(!g){console.log('scene '+s+' SIM ERR');break;}
 const events=((await call(ENUM_SYS,irText(g)+'\n\nReturn the JSON now.',900,0.8)||{}).events||[]).map(String);
 // DUMB SELECTOR: drop events that repeat any committed event or standing fact, then random-pick.
 const fresh=events.filter(e=>maxJac(e,committed)<DUP && maxJac(e,facts)<DUP);
 const forcedRepeat=fresh.length===0;
 const pool=forcedRepeat?events:fresh;
 const picked=pool[Math.floor(Math.random()*pool.length)]||events[0]||'(none)';
 committed.push(picked); facts.push(picked); lastEvent=picked;
 log.push({scene:s,total:events.length,fresh:fresh.length,forcedRepeat,picked});
 console.log('  scene '+String(s).padStart(2)+'  fresh '+String(fresh.length)+'/'+String(events.length)+(forcedRepeat?'  ⚠FORCED-REPEAT':'')+'  → '+picked.slice(0,70));
}
// momentum: distinct committed events
let distinct=0;const seen=[];committed.forEach(e=>{if(maxJac(e,seen)<DUP){distinct++;seen.push(e);}});
const firstCollapse=log.find(x=>x.forcedRepeat);
fs.writeFileSync(DIR+'/serial20_report.json',JSON.stringify({log,committed,distinct},null,2));
console.log('\nMOMENTUM: '+distinct+'/'+committed.length+' committed events are genuinely distinct.');
console.log('FRESH-OPTIONS curve: ['+log.map(x=>x.fresh).join(', ')+']');
console.log(firstCollapse?('FIRST FORCED-REPEAT (collapse) at scene '+firstCollapse.scene):'NO forced-repeat in 20 scenes — the architecture sustained fresh futures the whole way.');
console.log('READ: if fresh-options stays >0 and distinct≈20 → a DUMB selector reached 20 because the simulator kept generating new futures = ARCHITECTURE solved the collapse.');
process.exit(0);
