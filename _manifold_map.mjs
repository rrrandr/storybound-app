// _manifold_map.mjs — Roman 2026-08-11. Map the possibility MANIFOLD of one IR as an instrument (no selector/taste).
// Sample licensed events independently, accumulate, cluster into distinct branches. Measure: SATURATION (does unique-
// branch count plateau, and at what N?), TOPOLOGY (how many distinct branches; redundancy = avg cluster size),
// STABILITY (do the same branches reappear in an independent run?). 2 IRs × 2 runs × ~60 events.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, list DISTINCT irreversible events LICENSED by this IR (preconditions already present), each establishing a NEW fact (not restating). Do NOT rank or judge quality. Return STRICT JSON {"events":["<event>", ...]} with about 10 events.';
const CLUS_SYS='Group these numbered scene events into DISTINCT dramatic problems (two events are the SAME branch if a reader would describe the same core unresolved problem, differing only in surface detail). Return STRICT JSON {"assignments":[<cluster index for event 0>, <for event 1>, ...same length as input...],"labels":["<short label per cluster index>"]}.';
async function call(sys,usr,mt,temp){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:temp,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT: '+(g.default_trajectory||'');}
const STATES=[
 {tag:'first_sacrifice',state:['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'],event:'Julian publicly accepted blame for the forbidden wish.'},
 {tag:'corporate_leak',state:['The whistleblower gave documents to a journalist.','The documents prove the CEO ordered the cover-up.',"The whistleblower's identity is in the file metadata.","The journalist's editor sits on the company board.",'The story publishes in 48 hours.',"The whistleblower's spouse works at the company."],event:'The whistleblower handed the documents to the journalist.'}
];
async function collectRun(ir){const events=[];for(let b=0;b<6;b++){const e=await call(ENUM_SYS,ir+'\n\nReturn the JSON now.',900,0.8);if(e&&e.events)events.push(...e.events.map(x=>String(x)));}return events;}
async function clusterAndCurve(events){const cl=await call(CLUS_SYS,'EVENTS:\n'+events.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',1200,0)||{assignments:[],labels:[]};const asg=cl.assignments||[];const seen=new Set();const curve=[];events.forEach((_,i)=>{if(asg[i]!=null)seen.add(asg[i]);if((i+1)%10===0)curve.push(seen.size);});return{unique:new Set(asg.filter(x=>x!=null)).size,curve,labels:cl.labels||[],n:events.length};}
fs.mkdirSync(DIR,{recursive:true});
console.log('=== POSSIBILITY MANIFOLD MAP (saturation · topology · stability, '+MODEL+') ===\n');
const rep={};
for(const s of STATES){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+s.state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+s.event+'\n\nReturn the JSON now.',1500,0.4);
 const ir=irText(g);
 const r1e=await collectRun(ir),r2e=await collectRun(ir);
 const r1=await clusterAndCurve(r1e),r2=await clusterAndCurve(r2e);
 const ov=await call('How many of the RUN-1 branch labels have a semantic equivalent in RUN-2 branch labels? Return STRICT JSON {"overlap":N,"r1":N,"r2":N}.','RUN-1:\n'+r1.labels.map(x=>'- '+x).join('\n')+'\n\nRUN-2:\n'+r2.labels.map(x=>'- '+x).join('\n')+'\n\nReturn the JSON now.',200,0)||{};
 rep[s.tag]={r1,r2,overlap:ov};
 console.log('── '+s.tag);
 console.log('   RUN1: '+r1.n+' events → '+r1.unique+' distinct branches   saturation curve (unique @ N=10,20,..): ['+r1.curve.join(', ')+']');
 console.log('   RUN2: '+r2.n+' events → '+r2.unique+' distinct branches   curve: ['+r2.curve.join(', ')+']');
 console.log('   STABILITY: '+(ov.overlap||'?')+' of RUN1\'s '+(ov.r1||r1.unique)+' branches reappear in RUN2 (of '+(ov.r2||r2.unique)+')');
 console.log('   RUN1 branches: '+r1.labels.join(' · '));
 console.log('');
}
fs.writeFileSync(DIR+'/manifold_report.json',JSON.stringify(rep,null,1));
console.log('READ: curve PLATEAUS → the state has a BOUNDED number of genuinely different continuations (objective property).');
console.log('High stability overlap → the branches are real structure, not sampling noise. Both → selector research is tractable.');
process.exit(0);
