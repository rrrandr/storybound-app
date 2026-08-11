// _density.mjs — Roman 2026-08-11. THE BETWEEN test. For each milestone gap, can the simulator generate enough
// DISTINCT, CONCRETE, RELATIONSHIP-CHANGING bridge scenes to fill the slots (not "they talk again")? Enumerate the
// bridge space (saturated), dedup, classify concrete-vs-summary + advances-relationship + already-achieves-target.
// USABLE bridge density vs slots needed = whether the "between" is rich. If sparse → prose collapse returns later.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR and a BRIDGE GOAL, enumerate DISTINCT CONCRETE scene-events — specific moments a reader WATCHES HAPPEN (e.g. "she quietly gives him half her bread", "he lies to the guard to cover for her") — that each deepen the relationship a step toward the goal WITHOUT fully achieving it yet. NOT relationship-summaries ("they grow closer"). Return STRICT JSON {"events":["<concrete scene-event>",...]} ~10.';
const CLS_SYS='For each event classify: "concrete" = a specific action/moment a reader watches happen (NOT a summary like "they grow closer"/"trust deepens"); "advances" = it deepens the Lirael–Julian relationship; "achieves" = it already fully constitutes the TARGET milestone. Return STRICT JSON {"tags":[{"concrete":bool,"advances":bool,"achieves":bool}]}.';
async function call(sys,usr,mt,t){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ');}
function toks(s){return new Set(String(s||'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));}
function jac(a,b){const A=toks(a),B=toks(b);let i=0;A.forEach(w=>{if(B.has(w))i++;});return i/(A.size+B.size-i||1);}
function dedup(list){const out=[];list.forEach(e=>{let dup=false;out.forEach(o=>{if(jac(e,o)>0.5)dup=true;});if(!dup)out.push(e);});return out;}
const GAPS=[
 {tag:'Alliance→Trust',slots:3,from:'a reluctant alliance',to:'genuine mutual trust',
  facts:['Lirael and Julian formed a reluctant alliance to find the true wish-maker.','They barely know each other and each has reasons to distrust the other.','The ritual debt still hangs over Julian.','The council watches Julian closely.','A hidden journal hinting at the true wish-maker just surfaced.'],event:'Lirael and Julian formed a reluctant alliance.'},
 {tag:'Dependence→Almost-confession',slots:7,from:'emotional dependence',to:'nearly confessing their feelings',
  facts:['Lirael and Julian have grown emotionally dependent on each other after several close calls.','They are being surveilled by the council.','The true wish-maker is strongly suspected to run a hidden network.','The ritual debt is still unresolved and the deadline nears.','Neither has admitted their feelings; both feel the pull.','They are increasingly isolated, with only each other to rely on.'],event:'Lirael came to depend on Julian emotionally during a crisis.'}
];
fs.mkdirSync(DIR,{recursive:true});
console.log('=== EVENT-DENSITY of the BETWEEN (bridge scenes per milestone gap) ===\n');
const rep={};
for(const G of GAPS){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+G.facts.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+G.event+'\n\nReturn the JSON now.',1400,0.4);
 const ir=irText(g);
 let raw=[];for(let b=0;b<4;b++){const r=await call(ENUM_SYS,ir+'\n\nBRIDGE GOAL: move from "'+G.from+'" toward "'+G.to+'" — concrete scene-events, do NOT fully achieve the goal.\n\nReturn the JSON now.',900,0.85);(r&&r.events||[]).forEach(e=>raw.push(String(e)));}
 const distinct=dedup(raw);
 const tags=(await call(CLS_SYS,'TARGET milestone: '+G.to+'\n\nEVENTS:\n'+distinct.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.',900,0)||{tags:[]}).tags||[];
 const usable=distinct.filter((e,i)=>tags[i]&&tags[i].concrete&&tags[i].advances&&!tags[i].achieves);
 rep[G.tag]={slots:G.slots,raw:raw.length,distinct:distinct.length,usable};
 console.log('── '+G.tag+'   slots-to-fill='+G.slots+'   distinct='+distinct.length+'   USABLE concrete bridge scenes='+usable.length+(usable.length>=G.slots?'  ✅ dense enough':'  ⚠ SPARSE'));
 usable.slice(0,8).forEach(e=>console.log('     · '+e.slice(0,88)));
 console.log('');
}
fs.writeFileSync(DIR+'/density_report.json',JSON.stringify(rep,null,2));
console.log('READ: USABLE ≥ slots (distinct, concrete, relationship-advancing, not-yet-achieving) → the between is RICH → prose run earned.');
console.log('USABLE < slots → sparse → the author would stretch few events into many scenes → scene-5/6 returns in prose. Fix structure first.');
process.exit(0);
