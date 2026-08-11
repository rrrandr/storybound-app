// _manifold_crossmodel.mjs — Roman 2026-08-11. Is the possibility manifold a property of the STATE or of GPT-4o?
// Freeze ONE IR (gpt-4o). Enumerate branches from it with 4 frontier models (GPT-4o, Grok-4.3, Mistral-large,
// Claude-Opus-4.7). Merge, cluster into shared branches, measure: UNION size, CORE (found by all models), per-model
// coverage, model-UNIQUE branches. Converge → manifold belongs to the STATE (architectural). Diverge → belongs to the generator.
import fs from 'fs';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR, list DISTINCT irreversible events LICENSED by this IR (preconditions already present), each a NEW fact (not restating). Do NOT rank or judge. Output STRICT JSON ONLY (no prose, no code fences): {"events":["<event>", ...]} with about 10 events.';
function parseJSON(t){if(!t)return null;t=String(t).replace(/```[a-z]*/gi,'').replace(/```/g,'');try{return JSON.parse(t);}catch(e){}const m=t.match(/\{[\s\S]*\}/);if(m){try{return JSON.parse(m[0]);}catch(e){}}return null;}
async function post(url,body){for(let a=0;a<2;a++){try{const r=await fetch('http://localhost:3000'+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();return (d&&d.content)||(d&&d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||null;}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
const M={
 'gpt-4o':(sys,usr)=>post('/api/chatgpt-proxy',{messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:'gpt-4o',temperature:0.8,max_tokens:900,jsonMode:true}),
 'grok-4.3':(sys,usr)=>post('/api/proxy',{messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'SPECIALIST_RENDERER',preferredModel:'grok-4.3',temperature:0.8,max_tokens:900}),
 'mistral-lg':(sys,usr)=>post('/api/mistral-proxy',{messages:[{role:'system',content:sys},{role:'user',content:usr}],model:'mistral-large-latest',temperature:0.8,max_tokens:900}),
 'claude-haiku':(sys,usr)=>post('/api/anthropic-proxy',{system:sys,messages:[{role:'user',content:usr}],model:'claude-haiku-4-5',max_tokens:900})
};
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ')+'\nAUTOMATIC: '+(g.automatic_processes||[]).join(' · ')+'\nDEFAULT: '+(g.default_trajectory||'');}
const STATES=[
 {tag:'first_sacrifice',state:['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'],event:'Julian publicly accepted blame for the forbidden wish.'},
 {tag:'corporate_leak',state:['The whistleblower gave documents to a journalist.','The documents prove the CEO ordered the cover-up.',"The whistleblower's identity is in the file metadata.","The journalist's editor sits on the company board.",'The story publishes in 48 hours.',"The whistleblower's spouse works at the company."],event:'The whistleblower handed the documents to the journalist.'}
];
const CLUS_SYS='Group these numbered events into DISTINCT dramatic problems (same branch = same core unresolved problem). Return STRICT JSON {"assignments":[<cluster index per event, same length as input>],"labels":["<label per cluster>"]}.';
fs.mkdirSync(DIR,{recursive:true});
console.log('=== CROSS-MODEL MANIFOLD — is it a property of the STATE or of GPT-4o? ===\n');
const rep={};
for(const s of STATES){
 const g=parseJSON(await M['gpt-4o'](SIM_SYS,'CURRENT WORLD STATE:\n'+s.state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+s.event+'\n\nReturn the JSON now.'));
 const ir=irText(g);
 const evs=[];
 for(const name of Object.keys(M)){for(let b=0;b<2;b++){const r=parseJSON(await M[name](ENUM_SYS,ir+'\n\nReturn the JSON now.'));(r&&r.events||[]).forEach(e=>evs.push({model:name,text:String(e)}));}}
 const cl=parseJSON(await M['gpt-4o'](CLUS_SYS,'EVENTS:\n'+evs.map((e,i)=>i+'. '+e.text).join('\n')+'\n\nReturn the JSON now.'))||{assignments:[],labels:[]};
 const asg=cl.assignments||[],labels=cl.labels||[];
 const models=Object.keys(M);
 const branchModels={}; evs.forEach((e,i)=>{const c=asg[i];if(c==null)return;(branchModels[c]=branchModels[c]||new Set()).add(e.model);});
 const branches=Object.keys(branchModels);
 const union=branches.length;
 const core=branches.filter(c=>branchModels[c].size===models.length).length;
 const perModel={}; models.forEach(m=>perModel[m]=branches.filter(c=>branchModels[c].has(m)).length);
 const unique=branches.filter(c=>branchModels[c].size===1).length;
 rep[s.tag]={union,core,perModel,unique,labels:branches.map(c=>({label:labels[c]||c,models:[...branchModels[c]]}))};
 console.log('── '+s.tag+'   events='+evs.length+'   UNION branches='+union+'   CORE(all 4 models)='+core+'   model-UNIQUE='+unique);
 console.log('   per-model branch coverage: '+models.map(m=>m+' '+perModel[m]+'/'+union).join(' · '));
 branches.forEach(c=>console.log('     ['+[...branchModels[c]].map(m=>m.slice(0,4)).join(',')+'] '+(labels[c]||c)));
 console.log('');
}
fs.writeFileSync(DIR+'/crossmodel_report.json',JSON.stringify(rep,null,1));
console.log('READ: CORE≈UNION and every model covers most of UNION → manifold belongs to the STATE (architectural).');
console.log('Many model-UNIQUE branches / low per-model coverage → manifold belongs to the GENERATOR; selector research premature.');
process.exit(0);
