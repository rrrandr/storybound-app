// _planner_enumerate.mjs — Roman 2026-08-11. Does the affordance IR naturally CONTAIN diverse high-energy futures?
// Enumerate ~12 DISTINCT licensed irreversible events from the SAME IR, NO ranking/best/quality. Measure diversity
// (distinct dramatic problems), novelty, traceability. Present candidates for human energy-inspection. If diverse
// futures already exist → next project = SELECTION (search). If all inert/same → next project = SIMULATION (under-gen).
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, ENUMERATE as many GENUINELY DIFFERENT irreversible events as you can (aim for 12) that are each LICENSED by this IR (their preconditions already exist in it) and each traceable to a specific IR affordance-change or fact. Each must establish a NEW fact, not restate an existing one. Do NOT rank, do NOT choose a best, do NOT reason about drama/quality/importance — only enumerate distinct licensed futures. Return STRICT JSON {"events":[{"event":"<irreversible event>","trace":["<verbatim IR item>"]}]}.';
const CLUS_SYS='Group a list of scene events by SAME underlying dramatic problem (two are the SAME if a reader would say they pose the same core unresolved problem, differing only in surface detail). Also tag each DISTINCT group energy L/M/H (L=inert continuation/default; H=opens many new futures) for human triage only. Return STRICT JSON {"clusters":[{"indices":[..],"energy":"L|M|H","label":"short"}],"distinct_count":N}.';
const C=[
 {tag:'first_sacrifice',state:['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'],event:'Julian publicly accepted blame for the forbidden wish.'},
 {tag:'survival_escape',state:['Lirael and Julian crossed the bridge; it collapsed behind them.',"Julian's leg is broken.",'They have one day of water.','The pursuers are stopped on the far side.','A storm is coming.',"The only shelter is a cave holding the pursuers' ally.",'Lirael carries the stolen ledger they were sent for.'],event:'The bridge collapsed, cutting off the pursuers but leaving Julian injured.'},
 {tag:'corporate_leak',state:['The whistleblower gave documents to a journalist.','The documents prove the CEO ordered the cover-up.',"The whistleblower's identity is in the file metadata.","The journalist's editor sits on the company board.",'The story publishes in 48 hours.',"The whistleblower's spouse works at the company."],event:'The whistleblower handed the documents to the journalist.'},
 {tag:'romance_betrayal',state:['She and Daniel were lovers until he vanished a year ago.','Daniel has returned engaged to her sister.','Her sister does not know their history.','Daniel left because her father paid him to.','Her father is now dying and wants reconciliation.','The wedding is in two weeks.'],event:'Daniel told her he is marrying her sister.'}
];
async function call(sys,usr,mt){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.5,max_tokens:1600,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT TRAJECTORY: '+(g.default_trajectory||'');}
fs.mkdirSync(DIR,{recursive:true});
console.log('=== PLANNER ENUMERATION — how many DISTINCT futures does one IR license? ('+MODEL+') ===\n');
const rep={};
for(const c of C){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+c.state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+c.event+'\n\nReturn the JSON now.',1500);
 if(!g){console.log('── '+c.tag+' SIM ERR');continue;}
 const en=await call(ENUM_SYS,irText(g)+'\n\nReturn the JSON now.',1600);
 const evs=(en&&en.events)||[];
 const cl=await call(CLUS_SYS,'EVENTS:\n'+evs.map((e,i)=>i+'. '+e.event).join('\n')+'\n\nReturn the JSON now.',700)||{clusters:[],distinct_count:0};
 rep[c.tag]={events:evs,clusters:cl.clusters};
 const energies=(cl.clusters||[]).map(x=>x.energy);
 const H=energies.filter(x=>x==='H').length,Mg=energies.filter(x=>x==='M').length,L=energies.filter(x=>x==='L').length;
 console.log('── '+c.tag+'   candidates='+evs.length+'   DISTINCT problems='+(cl.distinct_count||cl.clusters.length)+'   energy(triage): H='+H+' M='+Mg+' L='+L);
 (cl.clusters||[]).forEach(x=>{const ex=evs[(x.indices||[])[0]];console.log('     ['+x.energy+'] '+(x.label||'')+'  →  '+(ex?ex.event:''));});
 console.log('');
}
fs.writeFileSync(DIR+'/enumerate_report.json',JSON.stringify(rep,null,1));
console.log('READ: many DISTINCT problems incl. H-energy → futures already latent in the IR → next project = SELECTION (search).');
console.log('All few/L → IR under-generates → next project = SIMULATION. (Energy tags are LLM triage for your human inspection, not a verdict.)');
process.exit(0);
