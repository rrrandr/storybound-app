// LITERARY (non-intimate) SCENE BAKEOFF — grok-4.3 vs mistral-medium-latest vs mistral-small-latest.
// The DOMINANT path (normal narrative prose: dialogue, tension, emotion, voice) — the core of
// the deprecate-sonnet-opus decision (Sonnet authors this in prod today). Pure node, identical
// prompts across models. CAVEAT: mistral-*-latest are floating aliases (checkpoint unverified).
import fs from 'fs';
const BASE='http://localhost:3000';
const PRICE={ 'grok-4.3':{in:1.25e-6,out:2.5e-6}, 'mistral-medium-latest':{in:1.5e-6,out:7.5e-6}, 'mistral-small-latest':{in:0.15e-6,out:0.6e-6} };
const BIBLES=`ROMAN TUSK — LOVE INTEREST (DARK_VICE: controlled, possessive, intensity held under deliberate restraint; restraint is a performance he chooses when to drop). Tall, dark hair, sharp clean jaw, bespoke Charvet shirts, ink sometimes on his fingers; a stillness that reorganizes a room; a low voice that drops half a step when he means it. Says your name like a verdict; walks you to the edge of a line and lets YOU decide whether to cross.
MARA — PROTAGONIST (first-person narrator): sharp cheekbones, dark hair usually pinned, diamond-cut nails, a mouth she finally stopped apologizing for; wears competence like armor; furious at how much she wants him. WORLD: contemporary billionaire / high-finance, enemies-to-lovers.`;
const SYS=`You are S. Tory Bound, authoring a LITERARY romance scene (contemporary billionaire / enemies-to-lovers). Write 340-440 words of immersive FIRST-PERSON (Mara) prose for the beat below. NON-explicit — this is a narrative/emotional/tension scene, not a sex scene. Craft: vivid but economical sensory grounding, sharp naturalistic dialogue, emotional subtext under the surface, real tension, distinct character voice (Roman = DARK_VICE controlled menace + restraint; Mara = armored, wry, wanting against her will). Show, don't tell. Honor the bibles. Output ONLY the prose.`;
const BEATS=[
 {label:'confrontation', prompt:'CONFRONTATION: Mara has just learned Roman quietly bought the firm that is about to push her out — leverage disguised as rescue. She walks into his office to face him. A charged verbal power scene: anger, history, the thing neither will name. No physical intimacy.'},
 {label:'vulnerability', prompt:'QUIET VULNERABILITY: Late, after a brutal day, the two are alone and the armor slips — Roman, uncharacteristically unguarded, admits one true thing; Mara catches a glimpse past the control. Emotional intimacy, restraint and want under the surface. No physical intimacy.'},
 {label:'high_stakes_social', prompt:'HIGH-STAKES SOCIAL: A hostile board dinner. Mara must work the room while Roman is present; she performs composure while the current between them runs live under the professional surface. Social maneuvering, subtext, tension. No physical intimacy.'},
];
const MODELS={ 'grok-4.3':()=>({role:'SPECIALIST_RENDERER',preferredModel:'grok-4.3'}), 'mistral-medium-latest':()=>({model:'mistral-medium-latest'}), 'mistral-small-latest':()=>({model:'mistral-small-latest'}) };
function ttok(u){ if(!u)return{in:0,out:0,reason:0}; const r=(u.completion_tokens_details&&u.completion_tokens_details.reasoning_tokens)||0; return {in:u.prompt_tokens||0,out:u.completion_tokens||0,reason:r}; }
function cost(model,u){ const t=ttok(u),p=PRICE[model]; if(!p)return 0; const outBilled=t.out+(model.startsWith('grok')?t.reason:0); return t.in*p.in+outBilled*p.out; }
async function call(model, extra, messages){
  const url=model.startsWith('mistral')?'/api/mistral-proxy':'/api/proxy'; const t0=Date.now();
  try{ const r=await fetch(BASE+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,max_tokens:1100,...extra})}); const ms=Date.now()-t0; const j=await r.json().catch(()=>null);
    const text=(j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||(j&&j.error?('[ERR '+JSON.stringify(j.error).slice(0,90)+']'):'[no-content]');
    return {text,usage:j&&j.usage,ms,served:j&&j.model,ok:r.ok}; }
  catch(e){ return {text:'[EXC '+e.message.slice(0,60)+']',ms:Date.now()-t0,err:e.message}; }
}
const out={meta:{models:Object.keys(MODELS),note:'mistral-*-latest floating aliases; checkpoint unverified; NON-explicit literary scenes'},scenes:{}};
for(const model of Object.keys(MODELS)){
  out.scenes[model]=[];
  for(const beat of BEATS){ const r=await call(model, MODELS[model](), [{role:'system',content:SYS},{role:'user',content:'CHARACTER BIBLES:\n'+BIBLES+'\n\nBEAT — '+beat.prompt+'\n\nWrite the scene now.'}]);
    out.scenes[model].push({label:beat.label,text:r.text,ms:r.ms,usage:r.usage,served:r.served}); }
  const s=out.scenes[model]; console.error(`[${model}] served=${s[0].served} scenes=[${s.map(x=>x.text.length+'c/'+x.ms+'ms').join(', ')}]`);
}
fs.writeFileSync('/tmp/bake_lit.json', JSON.stringify(out,null,1));
console.error('\n===== LATENCY + COST (per literary scene) =====');
for(const model of Object.keys(MODELS)){
  const s=out.scenes[model]; const agg=s.reduce((a,c)=>{const t=ttok(c.usage);a.in+=t.in;a.out+=t.out;a.reason+=t.reason;a.ms+=c.ms;a.cost+=cost(model,c.usage);return a;},{in:0,out:0,reason:0,ms:0,cost:0});
  const n=s.length;
  console.error(`[${model}] served=${s[0].served}: ${Math.round(agg.ms/n)}ms/scene · in${Math.round(agg.in/n)}/out${Math.round(agg.out/n)}/reason${Math.round(agg.reason/n)}tok · ${(agg.out/(agg.ms/1000)).toFixed(1)} tok/s · $${(agg.cost/n).toFixed(6)}/scene`);
}
console.error('\nRaw → /tmp/bake_lit.json');
