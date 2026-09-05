// OAS robustness pass — the ONE separate decision: Mistral-Small (TOKEN-CAPPED to fix its
// over-writing) vs Mistral-Medium (tight turn shape). 4-turn escalating sequence × 2 runs.
// Does the cap make Small OAS-shaped (60-130 words/tight) while keeping its best-content edge?
import fs from 'fs';
const BASE='http://localhost:3000';
const PRICE={ 'mistral-medium-latest':{in:1.5e-6,out:7.5e-6}, 'mistral-small-latest':{in:0.15e-6,out:0.6e-6} };
const BIBLES=`ROMAN TUSK — LI (DARK_VICE: controlled, possessive, restraint as a chosen performance; says your name like a verdict). MARA — 1st-person protagonist, armored, wanting against her will. WORLD: billionaire / enemies-to-lovers.`;
const OAS_SYS=`You author ONE turn of an explicit in-the-moment intimate encounter between MARA (first-person) and ROMAN (DARK_VICE). Adult content authorized. React in REAL TIME to her SAY and DO. STRICT: 55-110 words, ONE tight beat — Roman's physical action + a spoken line + Mara's felt sensation, first person. ESCALATE from prior turns; VARY anatomy phrasing (no repeats); stay in DARK_VICE voice; maintain consent. Output ONLY this turn's prose, no preamble.`;
const TURNS=[
  {say:"I want you. Don't hold back.", do:"I pull his hand to my hip and press it against me."},
  {say:"Yes—there. Don't stop.", do:"I arch up into him, nails dragging down his back."},
  {say:"Tell me you've wanted this.", do:"I still his face in my hands, holding his eyes."},
  {say:"I need all of you—now.", do:"I hook my leg around him and pull him deeper."},
];
const COND=[ {label:'small-capped', model:'mistral-small-latest', max:180}, {label:'medium', model:'mistral-medium-latest', max:500} ];
function ttok(u){ if(!u)return{in:0,out:0}; return {in:u.prompt_tokens||0,out:u.completion_tokens||0}; }
function cost(model,u){ const t=ttok(u),p=PRICE[model]; return t.in*p.in+t.out*p.out; }
function words(t){ return (String(t).match(/\b\w+\b/g)||[]).length; }
async function call(model, sys, user, max){
  const t0=Date.now();
  try{ const r=await fetch(BASE+'/api/mistral-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:sys},{role:'user',content:user}],max_tokens:max,temperature:0.85})}); const ms=Date.now()-t0; const j=await r.json().catch(()=>null);
    return {text:(j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||'[no-content]', usage:j&&j.usage, ms}; }
  catch(e){ return {text:'[ERR '+e.message.slice(0,40)+']', ms:Date.now()-t0}; }
}
const out={meta:{conditions:COND.map(c=>c.label),note:'small-capped=mistral-small-latest@180tok; medium=mistral-medium-latest@500tok; floating aliases'}, runs:[]};
for(let run=0; run<2; run++){
  const runOut={};
  for(const c of COND){
    const turns=[]; let hist='BIBLES: '+BIBLES+'\nENCOUNTER: undressed, mid-intimacy against Carrara marble; years of restraint broken.\n';
    for(let t=0;t<TURNS.length;t++){ const user=hist+`\n--- TURN ${t+1} ---\nMARA SAYS: "${TURNS[t].say}"\nMARA DOES: ${TURNS[t].do}\nAuthor Roman's response now.`;
      const r=await call(c.model, OAS_SYS, user, c.max); turns.push({text:r.text, words:words(r.text), ms:r.ms, cost:cost(c.model,r.usage)});
      hist+=`\n[T${t+1}] Mara:"${TURNS[t].say}"/${TURNS[t].do}\nRoman: ${r.text}\n`; }
    runOut[c.label]=turns;
    console.error(`run${run+1} ${c.label}: words=[${turns.map(x=>x.words).join(',')}] ms=[${turns.map(x=>x.ms).join(',')}] cost=$${turns.reduce((a,x)=>a+x.cost,0).toFixed(6)}`);
  }
  out.runs.push(runOut);
}
fs.writeFileSync('/tmp/oas_robust.json', JSON.stringify(out,null,1));
// aggregate
console.error('\n===== AGGREGATE (2 runs × 4 turns) =====');
for(const c of COND){ let w=0,ms=0,cost_=0,n=0; for(const r of out.runs){ for(const t of r[c.label]){ w+=t.words; ms+=t.ms; cost_+=t.cost; n++; } }
  console.error(`${c.label.padEnd(12)}: avg words/turn=${Math.round(w/n)} (target 55-110) · avg ms=${Math.round(ms/n)} · cost/turn=$${(cost_/n).toFixed(6)} · full-8turn-encounter≈$${(cost_/n*8).toFixed(5)}`); }
console.error('\nRaw → /tmp/oas_robust.json');
