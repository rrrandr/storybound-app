// _world_sim_stress2.mjs — v2: concreteness forced + branching over ALL pressures + a concretizer for the recursion.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy', MODEL='gpt-4o', DEPTH=6;
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=[
 'You are a WORLD SIMULATOR. NOT a storyteller/planner/author. You never choose scenes, rank drama, interpret psychology, or realize goals. Given CURRENT WORLD STATE and LAST IRREVERSIBLE EVENT, compute ONLY how the world objectively changed — physics, not story.',
 'Output STRICT JSON: { "new_facts":[...], "affordance_changes":["<cap> (gained|lost|costly|available)"], "automatic_processes":[...], "default_trajectory":"...", "pressure_graph":[ {"pressure":"<unresolved STATE, never an action>","children":[ same shape ]} ] }',
 'CONCRETENESS (HARD — this is what makes a world have FUTURE): every fact and pressure must name a SPECIFIC actor, object, place, or institution. BAN abstract theme-labels. BAD (delete these): "community perception is unresolved" / "trust is affected" / "the future of the rite" / "social standing" / "the situation is unresolved". GOOD: "the true wish-maker is still unnamed and now unobserved" / "the council holds grounds to sentence Julian" / "the rite\x27s cost is defaulting onto Julian" / "a rival house can now press its claim". If you cannot point to a specific actor/object/institution for a pressure, DELETE it.',
 'SIDEWAYS: prefer pressures that reach THIRD PARTIES already present, INSTITUTIONS/rules, RESOURCES/objects, and the physical SETTING — not only the principals named in the event.',
 'HARD: physics only; ENUMERATE never RANK; STATES not ACTIONS; no protagonist/scene/story.'
].join('\n');
async function call(sys,usr,mt){ for(let a=0;a<2;a++){ try{ const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.4,max_tokens:mt,jsonMode:true})}); const d=await r.json(); const c=(d&&d.content)||(d.choices&&d.choices[0].message.content); return JSON.parse(c.match(/\{[\s\S]*\}/)[0]); }catch(e){ if(a) return null; await new Promise(x=>setTimeout(x,1500)); } } }
const sim=(state,ev)=>call(SIM_SYS,'CURRENT WORLD STATE:\n'+state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+ev+'\n\nReturn the JSON now.',1100);
const CONC_SYS='You are a mechanical CONCRETIZER (a stand-in for a planner). Given ONE unresolved pressure (a state of the world), return the single concrete irreversible EVENT that resolves it — past tense, one clause, naming a specific actor/object. Return STRICT JSON {"event":"..."}. No drama, no ranking.';
async function concretize(p){ const r=await call(CONC_SYS,'UNRESOLVED PRESSURE: '+p+'\nReturn the JSON now.',80); return (r&&r.event)||('An event resolved: '+p); }
function flat(g,out){ out=out||[]; (g||[]).forEach(n=>{ if(n&&typeof n==='object'){ if(n.pressure) out.push(n.pressure); flat(n.children,out);} else if(typeof n==='string') out.push(n); }); return out; }
function toks(s){return new Set(String(s||'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));}
function jac(a,b){const A=toks(a),B=toks(b);let i=0;A.forEach(w=>{if(B.has(w))i++;});return i/(A.size+B.size-i||1);}
function nov(p,anc){let m=0;anc.forEach(a=>{const j=jac(p,a);if(j>m)m=j;});return 1-m;}
const SEEDS=[
 {tag:'DRAMA:blame',event:'Julian publicly accepts blame for the forbidden wish.',state:["A youth's forbidden wish misfired during the rite.",'Lirael halted the rite before it completed.']},
 {tag:'DRAMA:bridge',event:'The bridge collapses while Lirael and Julian are mid-crossing.',state:['They were fleeing pursuers across a gorge.']},
 {tag:'DRAMA:abdicate',event:'The queen unexpectedly abdicates before the assembled houses.',state:['The realm was stable under her rule.']},
 {tag:'DRAMA:alibi',event:'The detective discovers the victim lied about their alibi.',state:['A murder is under investigation.']},
 {tag:'MUNDANE:power',event:'The power goes out across the area.',state:['An ordinary evening at home.']},
 {tag:'MUNDANE:train',event:'She misses her train.',state:['She was travelling to an appointment.']},
 {tag:'MUNDANE:wallet',event:'He loses his wallet.',state:['An ordinary day out in the city.']},
 {tag:'MUNDANE:package',event:'A package arrives at the door.',state:['An ordinary afternoon at home.']}
];
fs.mkdirSync(DIR,{recursive:true});
console.log('=== WORLD SIMULATOR v2 (concreteness forced + concretizer) — depth '+DEPTH+', '+MODEL+' ===\n');
const rep={};
for(const s of SEEDS){ let state=[...s.state],ev=s.event; const anc=[],steps=[];
 for(let d=0;d<DEPTH;d++){ const g=await sim(state,ev); if(!g){steps.push({d,error:1});break;} const ps=flat(g.pressure_graph); if(!ps.length){steps.push({d,exhausted:1});break;}
  const scored=ps.map(p=>({p,n:nov(p,anc)})).sort((a,b)=>b.n-a.n); const ch=scored[0];
  steps.push({d,count:ps.length,best:+ch.n.toFixed(2),chosen:ch.p,loop:ch.n<0.35});
  anc.push(...ps); state=[...state,...((g.new_facts)||[])].slice(-14); ev=await concretize(ch.p); }
 rep[s.tag]=steps; const cnts=steps.filter(x=>x.count).map(x=>x.count); const avg=cnts.length?(cnts.reduce((a,b)=>a+b,0)/cnts.length).toFixed(1):'0';
 const novs=steps.filter(x=>x.best!=null).map(x=>x.best); const mn=novs.length?Math.min(...novs):0; const loops=steps.filter(x=>x.loop).length;
 const reached=steps.filter(x=>!x.error&&!x.exhausted).length; const collapse=cnts.some(c=>c<=1)||mn<0.2;
 const v=steps.some(x=>x.exhausted)?'EXHAUSTED@'+reached:collapse?'COLLAPSE':(reached>=DEPTH&&avg>=4?'HEALTHY':'WEAK');
 console.log('── '+s.tag.padEnd(16)+v+'  (depth '+reached+'/'+DEPTH+' · avg-pressures '+avg+' · min-novelty '+mn+' · loops '+loops+')');
 steps.forEach(x=>{ if(x.chosen)console.log('     d'+x.d+' pressures='+x.count+' nov='+x.best+(x.loop?' LOOP':'')+' → '+x.chosen.slice(0,74)); else console.log('     d'+x.d+' '+(x.exhausted?'EXHAUSTED':'error')); });
 console.log('');
}
fs.writeFileSync(DIR+'/stress2_report.json',JSON.stringify(rep,null,1));
console.log('HEALTHY = full depth, avg-pressures ≥4, novelty never <0.2. Saved → '+DIR+'/stress2_report.json');
process.exit(0);
