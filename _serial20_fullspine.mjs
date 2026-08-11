// _serial20_fullspine.mjs — Roman 2026-08-11. Full PLANNER A = two-sided spine. DEBIT (forbidden-until-X budget) +
// CREDIT (required-progression milestones the local selector must drive toward on schedule). Same simulator+enumerator.
// Does the romance arc actually walk strangers→alliance→trust→dependence→almost-confession while the debt stays locked?
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR and the STORY OBLIGATION the issue must now progress toward, list DISTINCT irreversible events LICENSED by the IR, each a NEW fact. PRIORITIZE events that ADVANCE the story obligation, but also include others. Do NOT rank. Return STRICT JSON {"events":["<event>",...]} ~10 events.';
const BUDGET_SYS='Enforce a story budget. Given LOCKED OBLIGATIONS (resolutions forbidden this scene) and candidate EVENTS, return indices that would RESOLVE/SPEND/PRE-EMPT any locked obligation. Strict. Return STRICT JSON {"blocked":[indices]}.';
const SELECT_SYS='Given candidate EVENTS and the current STORY OBLIGATION, return the index of the event that BEST advances that obligation (or -1 if none do), and whether that event FULLY ACHIEVES the obligation. Return STRICT JSON {"best":<index or -1>,"achieves":true|false}.';
const DEBIT=[{ob:'The ritual debt over Julian is resolved/collected/paid/lifted',unlock:18},{ob:'Julian is exonerated/cleared/proven innocent',unlock:18},{ob:'The true wish-maker is fully exposed/named/caught/punished',unlock:19},{ob:'Lirael & Julian confess love, consummate, or fully reveal the core secret',unlock:17},{ob:'Julian abandons the conflict for a new life/career',unlock:99}];
const CREDIT=[{m:'A reluctant alliance forms between Lirael and Julian',by:5},{m:'A real clue to the true wish-maker surfaces',by:7},{m:'Lirael and Julian come to genuinely trust each other',by:9},{m:'Lirael and Julian grow emotionally dependent on each other',by:13},{m:'The true wish-maker becomes strongly suspected (not yet proven)',by:15},{m:'Lirael and Julian nearly confess their feelings but stop short',by:17},{m:'Lirael and Julian are forced apart on a cliffhanger',by:20}];
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTO: '+(g.automatic_processes||[]).join(' · ');}
function toks(s){return new Set(String(s||'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));}
function jac(a,b){const A=toks(a),B=toks(b);let i=0;A.forEach(w=>{if(B.has(w))i++;});return i/(A.size+B.size-i||1);}
function maxJac(e,l){let m=0;l.forEach(x=>{const j=jac(e,x);if(j>m)m=j;});return m;}
let facts=['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.','Lirael and Julian are near-strangers thrown together by the crisis.'];
let lastEvent='Julian publicly accepted blame for the forbidden wish.';
const committed=[],logs=[];let ptr=0;
fs.mkdirSync(DIR,{recursive:true});
console.log('=== SERIAL 20 + FULL SPINE (debit budget + credit progression) ===\n');
for(let s=1;s<=20;s++){
 const cur=CREDIT[Math.min(ptr,CREDIT.length-1)];
 const locked=DEBIT.filter(o=>s<o.unlock);
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+facts.slice(-12).map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+lastEvent+'\n\nReturn the JSON now.',1400,0.4);
 if(!g){console.log('scene '+s+' SIM ERR');break;}
 const events=((await call(ENUM_SYS,irText(g)+'\n\nSTORY OBLIGATION to progress toward: '+cur.m+'\n\nReturn the JSON now.',900,0.7)||{}).events||[]).map(String);
 const bl=new Set(((await call(BUDGET_SYS,'LOCKED:\n'+locked.map(o=>'- '+o.ob).join('\n')+'\n\nEVENTS:\n'+events.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',300,0)||{blocked:[]}).blocked||[]));
 const survIdx=events.map((e,i)=>i).filter(i=>!bl.has(i)&&maxJac(events[i],committed)<0.5&&maxJac(events[i],facts)<0.5);
 const survEvents=survIdx.map(i=>events[i]);
 const sel=await call(SELECT_SYS,'STORY OBLIGATION: '+cur.m+'\n\nEVENTS:\n'+survEvents.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',120,0)||{best:-1,achieves:false};
 let picked;const bi=sel.best;
 if(bi>=0&&survEvents[bi])picked=survEvents[bi];else picked=survEvents[Math.floor(Math.random()*survEvents.length)]||events[0]||'(none)';
 const achieved=(bi>=0&&sel.achieves);
 committed.push(picked);facts.push(picked);lastEvent=picked;
 const behind=s>cur.by;
 logs.push({scene:s,obligation:cur.m,blocked:bl.size,surv:survIdx.length,picked,achieved,behind});
 console.log('  s'+String(s).padStart(2)+' ['+(achieved?'✓ACHIEVED':(behind?'⚠BEHIND':'toward'))+'] '+cur.m.slice(0,34).padEnd(35)+'→ '+picked.slice(0,54));
 if(achieved&&ptr<CREDIT.length-1)ptr++;
}
fs.writeFileSync(DIR+'/serial20_fullspine_report.json',JSON.stringify({DEBIT,CREDIT,logs,committed},null,2));
const achievedCount=new Set(logs.filter(x=>x.achieved).map(x=>x.obligation)).size;
console.log('\nMILESTONES achieved: '+achievedCount+'/'+CREDIT.length+'   (romance arc + mystery beats)');
console.log('READ: if most credit milestones land ~on schedule AND debt/exoneration stay locked to 18 → two-sided spine = working Planner A.');
process.exit(0);
