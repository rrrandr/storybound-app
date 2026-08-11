// _worldsim_ir_test.mjs — Roman 2026-08-11. Is the pressure_graph a lossy re-expression of the entity IR?
// Score load-bearing recall against (A) the ENTITY AFFORDANCES vs (B) the pressure_graph. If A >> B on high-leverage,
// the pressure graph is a lossy LLM re-generation and the planner should be fed the entity IR directly.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const S=fs.readFileSync('_worldsim_symmetric.mjs','utf8');
const SIM_SYS=eval('['+S.match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const CASES=eval(S.match(/const CASES=(\[[\s\S]*?\]);\nconst DRIFT/)[1]);
function flatP(g,o){o=o||[];(g||[]).forEach(n=>{if(n&&typeof n==='object'){if(n.pressure)o.push(n.pressure);flatP(n.children,o);}});return o;}
function flatE(ents){const o=[];(ents||[]).forEach(e=>['easier','harder','newly_possible','newly_impossible'].forEach(k=>(e[k]||[]).forEach(v=>o.push(e.entity+' — '+k+': '+v))));return o;}
async function call(sys,usr,mt){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.3,max_tokens:1500,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
const M='For each TARGET pressure decide whether it is expressed by ANY item in list A (ENTITY AFFORDANCES) and separately whether by ANY item in list B (PRESSURES). Semantic match, ignore wording. Return STRICT JSON {"results":[{"i":0,"in_A":true|false,"in_B":true|false}]} indexed to the target order.';
fs.mkdirSync(DIR,{recursive:true});
console.log('=== IR TEST: entity affordances (A) vs pressure_graph (B) — load-bearing recall ('+MODEL+') ===\n');
let HA=0,HB=0,Htot=0,A=0,B=0,tot=0;const rep={};
for(const c of CASES){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+c.state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+c.event+'\n\nReturn the JSON now.',1500);
 if(!g){console.log('── '+c.tag+' SIM ERROR');continue;}
 const ents=flatE(g.entities),press=flatP(g.pressure_graph);
 const m=await call(M,'LIST A (ENTITY AFFORDANCES):\n'+ents.map((x,i)=>i+'. '+x).join('\n')+'\n\nLIST B (PRESSURES):\n'+press.map((x,i)=>i+'. '+x).join('\n')+'\n\nTARGETS:\n'+c.lb.map((x,i)=>i+'. '+x[0]).join('\n')+'\n\nReturn the JSON now.',900)||{results:[]};
 const res=m.results||[];
 let ha=0,hb=0,ht=0,a=0,b=0,t=0;const lostByGraph=[];
 c.lb.forEach((x,i)=>{const r=res.find(z=>z.i===i)||{};t++;if(r.in_A)a++;if(r.in_B)b++;if(x[1]==='H'){ht++;if(r.in_A)ha++;if(r.in_B)hb++;if(r.in_A&&!r.in_B)lostByGraph.push(x[0]);}});
 HA+=ha;HB+=hb;Htot+=ht;A+=a;B+=b;tot+=t;rep[c.tag]={entCount:ents.length,pressCount:press.length,lostByGraph};
 console.log('── '+c.tag.padEnd(18)+'HIGH-lev  entities(A) '+ha+'/'+ht+'   pressures(B) '+hb+'/'+ht+'    [entIR items='+ents.length+']');
 if(lostByGraph.length)console.log('     in ENTITIES but LOST by pressure_graph: '+lostByGraph.join(' · '));
}
fs.writeFileSync(DIR+'/ir_test_report.json',JSON.stringify(rep,null,1));
console.log('\nSUMMARY HIGH-LEVERAGE:  entity-IR '+HA+'/'+Htot+' ('+Math.round(100*HA/Htot)+'%)   pressure-graph '+HB+'/'+Htot+' ('+Math.round(100*HB/Htot)+'%)');
console.log('OVERALL:  entity-IR '+A+'/'+tot+'   pressure-graph '+B+'/'+tot);
console.log('If entity-IR >> pressure-graph on high-leverage → the pressure graph is a LOSSY re-expression; feed the planner the entity IR.');
process.exit(0);
