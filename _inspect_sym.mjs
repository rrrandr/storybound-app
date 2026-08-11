import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const SIM_SYS=fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1];
const SYS=eval('['+SIM_SYS+'].join("\\n")');
async function sim(state,ev){const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:SYS},{role:'user',content:'CURRENT WORLD STATE:\n'+state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+ev+'\n\nReturn the JSON now.'}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.3,max_tokens:1400,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}
const g=await sim(['Lirael and Julian crossed the bridge; it collapsed behind them.',"Julian's leg is broken.",'They have one day of water.','The pursuers are stopped on the far side.','A storm is coming.',"The only shelter is a cave holding the pursuers' ally.",'Lirael carries the stolen ledger they were sent for.'],'The bridge collapsed, cutting off the pursuers but leaving Julian injured.');
console.log('ENTITIES computed:');
(g.entities||[]).forEach(e=>{console.log('  ['+e.entity+']');['easier','harder','newly_possible','newly_impossible'].forEach(k=>{(e[k]||[]).forEach(v=>console.log('      '+k+': '+v));});});
console.log('\nPRESSURE_GRAPH pressures:');
const flat=(gg,o)=>{o=o||[];(gg||[]).forEach(n=>{if(n&&typeof n==='object'){if(n.pressure)o.push(n.pressure);flat(n.children,o);}});return o;};
flat(g.pressure_graph).forEach(p=>console.log('  · '+p));
process.exit(0);
