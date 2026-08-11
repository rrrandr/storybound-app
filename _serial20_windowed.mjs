// _serial20_windowed.mjs — Roman 2026-08-11. Planner A = WINDOWED pacing schedule. Every beat [floor,ceil]. Budget
// BLOCKS events achieving any beat whose window hasn't opened (floor>s) OR resolving a locked resolution. Selector drives
// toward the open beat; between beats it holds (on-premise complications). Does the arc finally pace across all 20?
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR and the current STORY GOAL, list DISTINCT irreversible events LICENSED by the IR, each a NEW fact. Prioritize events advancing the goal; also include complications. Return STRICT JSON {"events":["<event>",...]} ~10.';
const BUDGET_SYS='Given FORBIDDEN OUTCOMES (must NOT happen yet) and candidate EVENTS, return indices that would achieve, resolve, or substantially pre-empt ANY forbidden outcome. Strict. Return STRICT JSON {"blocked":[indices]}.';
const SELECT_SYS='Given candidate EVENTS and a STORY GOAL, return the index best advancing the goal (or -1) and whether it FULLY ACHIEVES it. Return STRICT JSON {"best":<idx or -1>,"achieves":true|false}.';
const RES_LOCKS=[{ob:'The ritual debt over Julian is resolved/collected/paid/lifted',u:18},{ob:'Julian is exonerated/cleared',u:18},{ob:'The true wish-maker is fully exposed/named/caught',u:19},{ob:'Julian abandons the conflict for a new life',u:99}];
const BEATS=[{m:'A reluctant alliance forms between Lirael and Julian',f:1,c:5},{m:'A real clue to the true wish-maker surfaces',f:3,c:7},{m:'Lirael and Julian come to genuinely trust each other',f:5,c:9},{m:'Lirael and Julian grow emotionally dependent',f:8,c:13},{m:'The true wish-maker becomes strongly suspected',f:11,c:15},{m:'Lirael and Julian nearly confess their feelings but stop short',f:14,c:17},{m:'Lirael and Julian are forced apart on a cliffhanger',f:18,c:20}];
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ');}
function toks(s){return new Set(String(s||'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));}
function jac(a,b){const A=toks(a),B=toks(b);let i=0;A.forEach(w=>{if(B.has(w))i++;});return i/(A.size+B.size-i||1);}
function mj(e,l){let m=0;l.forEach(x=>{const j=jac(e,x);if(j>m)m=j;});return m;}
let facts=['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','Lirael and Julian are near-strangers thrown together by the crisis.'];
let lastEvent='Julian publicly accepted blame for the forbidden wish.';const committed=[],logs=[];const done=BEATS.map(()=>false);
fs.mkdirSync(DIR,{recursive:true});
console.log('=== SERIAL 20 + WINDOWED SPINE ([floor,ceil] per beat) ===\n');
for(let s=1;s<=20;s++){
 const ai=BEATS.findIndex((b,i)=>!done[i]&&b.f<=s);const active=ai>=0?BEATS[ai]:null;
 const goal=active?active.m:'raise the stakes and complicate the current situation WITHOUT resolving the central conflict';
 const forbidden=RES_LOCKS.filter(o=>s<o.u).map(o=>o.ob).concat(BEATS.filter((b,i)=>b.f>s&&!done[i]).map(b=>b.m));
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+facts.slice(-12).map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+lastEvent+'\n\nReturn the JSON now.',1400,0.4);
 if(!g){console.log('s'+s+' SIM ERR');break;}
 const events=((await call(ENUM_SYS,irText(g)+'\n\nSTORY GOAL: '+goal+'\n\nReturn the JSON now.',900,0.7)||{}).events||[]).map(String);
 const bl=new Set(((await call(BUDGET_SYS,'FORBIDDEN OUTCOMES (must NOT happen yet):\n'+forbidden.map(o=>'- '+o).join('\n')+'\n\nEVENTS:\n'+events.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',300,0)||{blocked:[]}).blocked||[]));
 const survI=events.map((e,i)=>i).filter(i=>!bl.has(i)&&mj(events[i],committed)<0.5&&mj(events[i],facts)<0.5);
 const surv=survI.map(i=>events[i]);
 let picked,ach=false;
 if(active&&surv.length){const sel=await call(SELECT_SYS,'STORY GOAL: '+active.m+'\n\nEVENTS:\n'+surv.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',120,0)||{best:-1};if(sel.best>=0&&surv[sel.best]){picked=surv[sel.best];ach=!!sel.achieves;}else picked=surv[Math.floor(Math.random()*surv.length)];}
 else picked=surv[Math.floor(Math.random()*surv.length)]||events.find((e,i)=>!bl.has(i))||events[0]||'(none)';
 if(active&&ach)done[ai]=true;
 committed.push(picked);facts.push(picked);lastEvent=picked;
 const behind=active&&s>active.c;
 logs.push({scene:s,goal:active?active.m:'(hold)',blocked:bl.size,surv:survI.length,achieved:ach,behind,picked});
 console.log('  s'+String(s).padStart(2)+' '+(active?('['+(ach?'✓':(behind?'⚠late':'··'))+'] '):'[hold] ')+(active?active.m.slice(0,32):'complication').padEnd(34)+'→ '+picked.slice(0,50));
}
fs.writeFileSync(DIR+'/serial20_windowed_report.json',JSON.stringify({BEATS,RES_LOCKS,logs,committed},null,2));
const when=BEATS.map((b,i)=>{const L=logs.find(x=>x.achieved&&x.goal===b.m);return b.m.slice(0,28)+' @'+(L?L.scene:'—')+' (window '+b.f+'-'+b.c+')';});
console.log('\nBEAT LANDINGS:'); when.forEach(w=>console.log('  '+w));
console.log('READ: beats landing WITHIN their windows (not all at once) + finale @~20 = windowed spine paces the arc.');
process.exit(0);
