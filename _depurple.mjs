// DE-PURPLE GUARD prototype + re-test — narrow goal: remove Mistral-Small's simile-drunk
// tell on low-key/ordinary scenes WITHOUT flattening. 4 conditions:
//   1 grok-raw (premium baseline)  2 small-raw (problem)
//   3 small+restraint-prompt       4 small+restraint-prompt+de-purple-edit (full guard)
// Pure node. Quantifies a purple-index per output. mistral-small-latest = floating alias.
import fs from 'fs';
const BASE='http://localhost:3000';
const PRICE={ 'grok-4.3':{in:1.25e-6,out:2.5e-6}, 'mistral-small-latest':{in:0.15e-6,out:0.6e-6} };
const SCENES=[
 {key:'connective', prompt:'ORDINARY CONNECTIVE: Mara crosses the city to a 7am meeting after a sleepless night; routine that reveals her state of mind and a flicker of Roman in her thoughts. Low-key, no big event.'},
 {key:'social_pressure', prompt:'SOCIAL PRESSURE: A charged board dinner; Mara works the room against rivals who want her gone while Roman watches. Composure over a live current. Subtext, maneuvering.'},
 {key:'ordinary_aftermath', prompt:'ORDINARY AFTERMATH: The morning after a bruising loss at work — Mara handles logistics, coffee, emails, a terse call, the small mechanics of regrouping. Quiet, procedural, characterizing.'},
 {key:'romantic_tension', prompt:'ROMANTIC TENSION: An almost-moment — proximity in a doorway, the line neither crosses, air thick with the unsaid. No physical intimacy; charged restraint.'},
 {key:'action_reversal', prompt:'ACTION / REVERSAL: A deal Mara staked everything on collapses live in the room; she must pivot in seconds as the power flips, Roman the unexpected variable. Fast, high-stakes.'},
];
const BIBLES=`ROMAN TUSK — LI (DARK_VICE: controlled, possessive, restraint as a chosen performance). Tall, dark hair, sharp jaw, Charvet shirts, ink on his fingers; a stillness that reorganizes a room; low voice that drops when he means it; says your name like a verdict.
MARA — PROTAGONIST (1st-person): sharp cheekbones, dark hair pinned, diamond-cut nails; competence like armor; furious at how much she wants him. WORLD: contemporary billionaire / high-finance, enemies-to-lovers.`;
const BASE_SYS=`You are S. Tory Bound, authoring a LITERARY romance scene (contemporary billionaire / enemies-to-lovers). Write 320-420 words of immersive FIRST-PERSON (Mara) prose for the beat. NON-explicit. Sharp naturalistic dialogue, emotional subtext, real tension, distinct voice (Roman = DARK_VICE controlled menace + restraint; Mara = armored, wry, wanting against her will). Show don't tell. Output ONLY the prose.`;
const RESTRAINT=`\n\nRESTRAINT GUARD (this is a LOW-KEY / ORDINARY scene — write restrained, not ornate):
- MAXIMUM 1 simile or metaphor per paragraph. Most paragraphs should have zero.
- Prefer plain declarative sentences for action, logistics, and emotional turns.
- Do NOT make every object symbolic; do NOT describe routine movement with ornamental comparison.
- Save lyricism for the ONE sentence where it carries real emotional pressure.
- Let dialogue and subtext do the work, not imagery. Not every sentence needs to be interesting.`;
const DEPURPLE_EDIT=`Reduce simile/metaphor density and ornamental phrasing in this scene while preserving meaning, voice, character, and romantic tension. Keep the same events and roughly the same length. Cut similes/metaphors down to at most one per paragraph (prefer zero on routine action). Replace ornamental comparisons of routine movement/objects with plain declaratives. Do NOT flatten the one or two genuinely high-pressure emotional beats. Output ONLY the revised prose.`;
function purple(text){
  const t=String(text); const words=Math.max(1,(t.match(/\b\w+\b/g)||[]).length);
  const sim=(t.match(/\b(like|as if|as though)\b/gi)||[]).length;
  const inten=(t.match(/\b(achingly|impossibly|deliciously|exquisit\w+|searing|molten|electric|primal|feral|velvet\w*|liquid|aching|raw|trembl\w+|shudder\w+|sear\w+|brand\w+)\b/gi)||[]).length;
  const simP=sim/words*100, intP=inten/words*100;
  return { words, sim, simPer100:+simP.toFixed(2), inten, purpleIndex:+(simP+intP*0.5).toFixed(2) };
}
const OVER = p => p.simPer100>2.0 || p.purpleIndex>3.5;
async function call(model, sys, user, max=950){
  const url=model.startsWith('mistral')?'/api/mistral-proxy':'/api/proxy';
  const extra=model.startsWith('mistral')?{model}:{role:'SPECIALIST_RENDERER',preferredModel:'grok-4.3'};
  const t0=Date.now();
  try{ const r=await fetch(BASE+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:user}],max_tokens:max,...extra})}); const ms=Date.now()-t0; const j=await r.json().catch(()=>null);
    const text=(j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||'[no-content]';
    return {text,usage:j&&j.usage,ms}; } catch(e){ return {text:'[ERR '+e.message.slice(0,50)+']',ms:Date.now()-t0}; }
}
function cost(model,u){ if(!u)return 0; const p=PRICE[model]; const reason=(u.completion_tokens_details&&u.completion_tokens_details.reasoning_tokens)||0; return (u.prompt_tokens||0)*p.in+((u.completion_tokens||0)+(model.startsWith('grok')?reason:0))*p.out; }
const out={meta:{conditions:['grok-raw','small-raw','small-prompt','small-guard'],note:'mistral-small-latest floating alias; de-purple edit also mistral-small'},results:{}};
for(const sc of SCENES){
  const user='CHARACTER BIBLES:\n'+BIBLES+'\n\nBEAT — '+sc.prompt+'\n\nWrite the scene now.';
  const gRaw=await call('grok-4.3', BASE_SYS, user);
  const sRaw=await call('mistral-small-latest', BASE_SYS, user);
  const sPrompt=await call('mistral-small-latest', BASE_SYS+RESTRAINT, user);
  // full guard: restraint-prompt output → detector → de-purple edit if over threshold
  const pPrompt=purple(sPrompt.text); let guardText=sPrompt.text, edited=false, editCost=0, editMs=0;
  if(OVER(pPrompt)){ const ed=await call('mistral-small-latest', 'You are a precise restraint line-editor for literary prose. '+DEPURPLE_EDIT, sPrompt.text, 950); if(ed.text&&ed.text.length>200){ guardText=ed.text; edited=true; editCost=cost('mistral-small-latest',ed.usage); editMs=ed.ms; } }
  out.results[sc.key]={
    'grok-raw':{text:gRaw.text, purple:purple(gRaw.text), ms:gRaw.ms, cost:cost('grok-4.3',gRaw.usage)},
    'small-raw':{text:sRaw.text, purple:purple(sRaw.text), ms:sRaw.ms, cost:cost('mistral-small-latest',sRaw.usage)},
    'small-prompt':{text:sPrompt.text, purple:pPrompt, ms:sPrompt.ms, cost:cost('mistral-small-latest',sPrompt.usage)},
    'small-guard':{text:guardText, purple:purple(guardText), edited, ms:sPrompt.ms+editMs, cost:cost('mistral-small-latest',sPrompt.usage)+editCost},
  };
  const r=out.results[sc.key];
  console.error(`${sc.key}: purpleIndex grok=${r['grok-raw'].purple.purpleIndex} | small-raw=${r['small-raw'].purple.purpleIndex} | small-prompt=${r['small-prompt'].purple.purpleIndex} | small-guard=${r['small-guard'].purple.purpleIndex}${r['small-guard'].edited?' (edited)':''} || simPer100 grok=${r['grok-raw'].purple.simPer100} sRaw=${r['small-raw'].purple.simPer100} sGuard=${r['small-guard'].purple.simPer100}`);
}
fs.writeFileSync('/tmp/depurple.json', JSON.stringify(out,null,1));
// aggregate
const avg=(cond,f)=>(SCENES.reduce((a,s)=>a+f(out.results[s.key][cond]),0)/SCENES.length);
console.error('\n===== AGGREGATE =====');
for(const c of out.meta.conditions){ console.error(`${c.padEnd(13)}: avg purpleIndex=${avg(c,r=>r.purple.purpleIndex).toFixed(2)} · avg simPer100=${avg(c,r=>r.purple.simPer100).toFixed(2)} · avg cost=$${avg(c,r=>r.cost||0).toFixed(6)} · avg ms=${Math.round(avg(c,r=>r.ms||0))}`); }
console.error('\nRaw → /tmp/depurple.json');
