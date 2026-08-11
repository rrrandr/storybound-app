// _worldsim_v3.mjs — Roman 2026-08-11. ONE bounded fix: symmetric propagation + CROSS-ENTITY EDGES (the single
// computation the misses shared). No new output layer. Re-run same 6 states; require the 4 tree-opener misses recovered
// without materially more drift / hallucinated affordances. Score HIGH-LEVERAGE recall against the entity IR.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const S=fs.readFileSync('_worldsim_symmetric.mjs','utf8');
const BASE=eval('['+S.match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const SIM_SYS=BASE+'\nCROSS-ENTITY EDGES (compute these — most HIGH-LEVERAGE tensions live in the edges BETWEEN entities, not one entity\'s own affordances): (1) DEPENDENCY — where one entity\'s key state exists ONLY WHILE another entity/object survives or holds, model the depended-on object/actor as an entity whose loss VOIDS the dependent state ("the claim exists only while the proof survives"). (2) THREAT-TO-OBJECT — for each key OBJECT, whoever it now implicates or endangers has newly_possible: DESTROY / SEIZE / DISCREDIT it (counter-propagation must land on OBJECTS, not only people). (3) RACE — where two clocks/processes now run against each other, state it ("the publication deadline races the company\'s hunt for the source"). (4) BLOCKING CONSTRAINT — where one actor\'s goal is now unreachable because another controls a needed resource ("the claim is unenforceable because the army backs the duke"). Only emit an edge that is LICENSED by the given state — never invent a relationship not implied by the facts.';
const CASES=eval(S.match(/const CASES=(\[[\s\S]*?\]);\nconst DRIFT/)[1]);
const DRIFT=/\b(must|needs?|has|have|ought)\s+to\b|\bmust decide\b|\bshould\b|\bfind(?:s|ing)?\s+a\s+way\b|\bfigure(?:s|d)?\s+out\b|\bdecide(?:s)?\s+(?:how|whether|what|to)\b|\bconfront\b/i;
function flatE(ents){const o=[];(ents||[]).forEach(e=>['easier','harder','newly_possible','newly_impossible'].forEach(k=>(e[k]||[]).forEach(v=>o.push(e.entity+' — '+k+': '+v))));return o;}
async function call(sys,usr,mt){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.3,max_tokens:1600,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
const M='For each TARGET pressure decide whether ANY item in the ENTITY AFFORDANCE list expresses the SAME underlying tension (semantic, ignore wording). Return STRICT JSON {"results":[{"i":0,"covered":true|false}]} indexed to target order.';
fs.mkdirSync(DIR,{recursive:true});
console.log('=== WORLD SIMULATOR v3 (symmetric + cross-entity edges) — HIGH-LEVERAGE entity-IR recall ('+MODEL+') ===\n');
let H=0,Hrec=0,drift=0;const dump={};
for(const c of CASES){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+c.state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+c.event+'\n\nReturn the JSON now.',1600);
 if(!g){console.log('── '+c.tag+' SIM ERROR');continue;}
 const ents=flatE(g.entities);const dr=ents.filter(x=>DRIFT.test(x));
 const m=await call(M,'ENTITY AFFORDANCES:\n'+ents.map((x,i)=>i+'. '+x).join('\n')+'\n\nTARGETS:\n'+c.lb.map((x,i)=>i+'. '+x[0]).join('\n')+'\n\nReturn the JSON now.',700)||{results:[]};
 const res=m.results||[];let hh=0,hr=0;const mis=[];
 c.lb.forEach((x,i)=>{if(x[1]!=='H')return;hh++;const r=res.find(z=>z.i===i);if(r&&r.covered)hr++;else mis.push(x[0]);});
 H+=hh;Hrec+=hr;drift+=dr.length;dump[c.tag]={entities:g.entities,drift:dr};
 console.log('── '+c.tag.padEnd(18)+'HIGH-lev '+hr+'/'+hh+'   entIR items='+ents.length+'   drift='+dr.length);
 if(mis.length)console.log('     still missed: '+mis.join(' · '));
}
fs.writeFileSync(DIR+'/v3_report.json',JSON.stringify(dump,null,1));
console.log('\nSUMMARY HIGH-LEVERAGE (entity IR): '+Hrec+'/'+H+' ('+Math.round(100*Hrec/H)+'%)   total drift '+drift+'   [v2 baseline was 16/20=80%, drift ~5]');
process.exit(0);
