// _manifold_stability.mjs — Roman 2026-08-11. Stability with a FIXED branch vocabulary (classify, don't re-cluster).
// Run A → cluster once → vocabulary V. Run B (independent) → assign each event to a V-branch or NEW. Stability =
// how much of B falls inside V (coverage) + how few genuinely-new branches B discovers. Decoupled from cluster granularity.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, list DISTINCT irreversible events LICENSED by this IR, each a NEW fact (not restating). Do NOT rank/judge. Return STRICT JSON {"events":["<event>",...]} ~10 events.';
const CLUS_SYS='Group these numbered events into DISTINCT dramatic problems (same branch = same core unresolved problem). Return STRICT JSON {"labels":["<short branch label>",...]} — the deduplicated branch list only.';
const ASSIGN_SYS='You are given a fixed BRANCH VOCABULARY (numbered) and a list of EVENTS. Assign each event to the index of the branch it belongs to, or -1 if NO branch fits it. Return STRICT JSON {"assignments":[<index or -1 per event, same length>]}.';
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT: '+(g.default_trajectory||'');}
async function collect(ir,n){const ev=[];for(let b=0;b<n;b++){const e=await call(ENUM_SYS,ir+'\n\nReturn the JSON now.',900,0.8);if(e&&e.events)ev.push(...e.events.map(String));}return ev;}
const STATES=[
 {tag:'first_sacrifice',state:['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'],event:'Julian publicly accepted blame for the forbidden wish.'},
 {tag:'corporate_leak',state:['The whistleblower gave documents to a journalist.','The documents prove the CEO ordered the cover-up.',"The whistleblower's identity is in the file metadata.","The journalist's editor sits on the company board.",'The story publishes in 48 hours.',"The whistleblower's spouse works at the company."],event:'The whistleblower handed the documents to the journalist.'}
];
fs.mkdirSync(DIR,{recursive:true});
console.log('=== MANIFOLD STABILITY (fixed vocabulary, '+MODEL+') ===\n');
const rep={};
for(const s of STATES){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+s.state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+s.event+'\n\nReturn the JSON now.',1500,0.4);
 const ir=irText(g);
 const A=await collect(ir,4);
 const V=(await call(CLUS_SYS,'EVENTS:\n'+A.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',600,0)||{labels:[]}).labels||[];
 const B=await collect(ir,4);
 const asg=(await call(ASSIGN_SYS,'BRANCH VOCABULARY:\n'+V.map((l,i)=>i+'. '+l).join('\n')+'\n\nEVENTS:\n'+B.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',700,0)||{assignments:[]}).assignments||[];
 const inV=asg.filter(x=>x>=0).length, news=B.filter((_,i)=>asg[i]===-1);
 const hit=new Set(asg.filter(x=>x>=0)).size;
 let newBranches=0,newLabels=[];
 if(news.length){const nl=(await call(CLUS_SYS,'EVENTS:\n'+news.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',400,0)||{labels:[]}).labels||[];newBranches=nl.length;newLabels=nl;}
 rep[s.tag]={V,coverage:inV+'/'+B.length,hit:hit+'/'+V.length,newBranches,newLabels};
 console.log('── '+s.tag);
 console.log('   vocabulary V (run A): '+V.length+' branches → '+V.join(' · '));
 console.log('   run B: '+inV+'/'+B.length+' events fell INSIDE V ('+Math.round(100*inV/B.length)+'% coverage)');
 console.log('   V branches hit by B: '+hit+'/'+V.length+'   NEW branches B discovered beyond V: '+newBranches+(newLabels.length?' ('+newLabels.join(' · ')+')':''));
 console.log('');
}
fs.writeFileSync(DIR+'/manifold_stability_report.json',JSON.stringify(rep,null,1));
console.log('READ: high coverage + few new branches → the manifold is STABLE structure (V captures it); an independent run');
console.log('stays inside the same ~10 branches. Then selector research is over a real, bounded, stable candidate space.');
process.exit(0);
