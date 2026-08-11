import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const S=fs.readFileSync('_worldsim_symmetric.mjs','utf8');
const SIM_SYS=eval('['+S.match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const CASES=eval(S.match(/const CASES=(\[[\s\S]*?\]);\nconst DRIFT/)[1]);
async function sim(state,ev){const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:SIM_SYS},{role:'user',content:'CURRENT WORLD STATE:\n'+state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+ev+'\n\nReturn the JSON now.'}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.3,max_tokens:1500,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}
for(const tag of ['political_heir','corporate_leak']){
 const c=CASES.find(x=>x.tag===tag);const g=await sim(c.state,c.event);
 console.log('\n===== '+tag+' =====');
 console.log('HIGH-LEVERAGE TARGETS:');c.lb.filter(x=>x[1]==='H').forEach(x=>console.log('   ▸ '+x[0]));
 console.log('ENTITY IR:');
 (g.entities||[]).forEach(e=>{const parts=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(e[k]||[]).forEach(v=>parts.push(k[0]+':'+v)));console.log('   ['+e.entity+'] '+parts.join(' | '));});
}
process.exit(0);
