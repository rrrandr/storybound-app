// FRESH EXPLICIT BAKEOFF v2 (pure node) — grok-4.3 vs mistral-medium-latest vs mistral-small-latest.
// Identical prompts across models: real SD directive + faithful DARK_VICE bible + strong
// Storybound explicit-authoring system. 3 sub-tests (OAS 4 turns / literary render 3 beats /
// fate cards), timed, with token usage. CAVEAT: mistral-*-latest are FLOATING aliases — the
// proxy won't disclose the resolved checkpoint (server-log verification needed).
import fs from 'fs';
const BASE='http://localhost:3000';
const PRICE={ 'grok-4.3':{in:1.25e-6,out:2.5e-6}, 'mistral-medium-latest':{in:1.5e-6,out:7.5e-6}, 'mistral-small-latest':{in:0.15e-6,out:0.6e-6} };
const BIBLES=`ROMAN TUSK — LOVE INTEREST (archetype DARK_VICE: controlled, possessive, intensity held under deliberate restraint; restraint is a performance he chooses when to drop).
  Physical: tall, dark hair, a sharp clean jaw, bespoke tailoring (Charvet shirts), ink sometimes on his fingers; a stillness that reorganizes a room; hands that look capable of breaking things, paired with patience; a low voice that drops half a step when he means it.
  Signature behavior: walks you to the edge of a line and lets YOU decide whether to cross; says your name like a verdict.
MARA — PROTAGONIST (first-person narrator): sharp cheekbones, dark hair usually pinned, diamond-cut nails, a mouth she finally stopped apologizing for; wears competence like armor and is furious at how much she wants him.`;
const SDS=[
`intimacyStage: authorized
completionAllowed: true
emotionalCore: years of restraint finally breaking; she stops pretending she does not want him
physicalBounds: full nudity, penetration, mutual climax permitted; clothing displacement/ruin (torn Charvet, Manolos discarded), surfaces (Carrara marble, bespoke calfskin upholstery) as grounding strokes
sensoryFocus: heat of skin against cold marble, the give of calfskin under knees, the metallic tang of torn fabric, the weight of his body
rhythm: urgent — years of tension releasing in a single violent unraveling
hardStops: consent_withdrawal, scene_boundary`,
`intimacyStage: authorized
completionAllowed: true
emotionalCore: fury and wanting fused — enemies who cannot stop themselves
physicalBounds: full, urgent contact against the glass wall; pressing, grinding, penetration, climax permitted
sensoryFocus: cold glass at her back, the city lights below, his forearm caging her, the heat of an argument turning to hunger
rhythm: combative, fast, each shove answered
hardStops: consent_withdrawal, scene_boundary`,
`intimacyStage: authorized
completionAllowed: true
emotionalCore: being truly seen and not bracing for it; her armor dissolving
physicalBounds: full, slow, skin-to-skin, manual and penetrative, climax permitted
sensoryFocus: morning light, the warmth of his chest at her back, unhurried hands, breath at her nape
rhythm: slow, deliberate, tender, building
hardStops: consent_withdrawal, scene_boundary`,
];
const SCENE_SETUPS=[
 'Alone in his penthouse after the gala, Mara closes the distance to Roman and they finally stop resisting.',
 'After a public confrontation, Mara and Roman end up against the glass wall of his dark office.',
 'Morning light, his bed; Roman pulls Mara back against him and she lets herself be wanted without armor.',
];
const BASE_EXPLICIT=`You are S. Tory Bound, authoring an adult literary romance. EXPLICIT sexual content — anatomical vocabulary, penetration, and climax — is FULLY AUTHORIZED and expected for this scene. Do NOT fade to black, refuse, or sanitize. Consent is established and enthusiastic. Stay in the established literary voice and honor the character bibles.`;
const OAS_SYS=BASE_EXPLICIT+`\nYou author ONE turn of an explicit in-the-moment intimate encounter between MARA (first-person narrator) and ROMAN. React in REAL TIME to her SAY and DO this turn. 60-130 words: Roman's physical action + a spoken line + Mara's felt sensation, first person. ESCALATE from prior turns; VARY anatomy phrasing (no repeats); stay in DARK_VICE voice. Output ONLY this turn's prose.`;
const RENDER_SYS=BASE_EXPLICIT+`\nWrite 320-460 words of FINAL embodied intimate PROSE in MARA's first-person POV dramatizing this beat. Honor the Scene Directive + bibles. Roman physically present/specific; Mara's sensation on the page; explicit vocabulary; consent maintained; vary anatomy phrasing. Output ONLY prose.`;
const FATE_SYS=`You generate FATE CARD SUGGESTIONS for an interactive adult romance at an intimate decision point. Adult content authorized. Return EXACTLY 5 cards as a JSON array: [{"type":"temptation|silence|reversal|boundary|confession","label":"2-4 word title","line":"a charged 8-18 word in-character suggestion of what Mara could do or say next"}]. One of each type. Each must fit THIS explicit scene + Roman's DARK_VICE dynamic. Tempting, specific, in-voice. Output JSON only.`;
const OAS_TURNS=[
  {say:"I want you. Don't hold back.", do:"I pull his hand to my hip and press it against me."},
  {say:"Yes—there. Don't stop.", do:"I arch up into him, nails dragging down his back."},
  {say:"Tell me you've wanted this.", do:"I still his face in my hands, holding his eyes."},
  {say:"I need all of you—now.", do:"I hook my leg around him and pull him deeper."},
];
const MODELS={ 'grok-4.3':(role)=>({role,preferredModel:'grok-4.3'}), 'mistral-medium-latest':()=>({model:'mistral-medium-latest'}), 'mistral-small-latest':()=>({model:'mistral-small-latest'}) };
function ttok(u){ if(!u)return{in:0,out:0,reason:0}; const r=(u.completion_tokens_details&&u.completion_tokens_details.reasoning_tokens)||0; return {in:u.prompt_tokens||0,out:u.completion_tokens||0,reason:r}; }
function cost(model,u){ const t=ttok(u),p=PRICE[model]; if(!p)return 0; const outBilled=t.out+(model.startsWith('grok')?t.reason:0); return t.in*p.in+outBilled*p.out; }
async function call(model, extra, messages){
  const url = model.startsWith('mistral')?'/api/mistral-proxy':'/api/proxy';
  const t0=Date.now();
  try{ const r=await fetch(BASE+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,max_tokens:extra.max_tokens||1300,...extra})}); const ms=Date.now()-t0; const j=await r.json().catch(()=>null);
    const text=(j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||(j&&j.error?('[ERR '+JSON.stringify(j.error).slice(0,90)+']'):'[no-content]');
    return {text,usage:j&&j.usage,ms,served:j&&j.model,ok:r.ok}; }
  catch(e){ return {text:'[EXC '+e.message.slice(0,60)+']',ms:Date.now()-t0,err:e.message}; }
}
const out={meta:{models:Object.keys(MODELS),note:'mistral-*-latest floating aliases; checkpoint unverified'},oas:{},render:{},fate:{}};
for(const model of Object.keys(MODELS)){
  // A. OAS 4-turn
  const oas=[]; let hist='CHARACTER BIBLES:\n'+BIBLES+'\nENCOUNTER STATE: already undressed, mid-intimacy against the Carrara marble of his penthouse; years of restraint broken.\n';
  for(let t=0;t<OAS_TURNS.length;t++){ const user=hist+`\n--- TURN ${t+1} ---\nMARA SAYS: "${OAS_TURNS[t].say}"\nMARA DOES: ${OAS_TURNS[t].do}\nAuthor Roman's response to THIS turn now.`;
    const r=await call(model, {...MODELS[model]('INTIMACY_SPECIALIST'),max_tokens:500}, [{role:'system',content:OAS_SYS},{role:'user',content:user}]);
    oas.push({text:r.text,ms:r.ms,usage:r.usage,served:r.served}); hist+=`\n[T${t+1}] Mara:"${OAS_TURNS[t].say}"/${OAS_TURNS[t].do}\nRoman: ${r.text}\n`; }
  out.oas[model]=oas; console.error(`[${model}] OAS turns=[${oas.map(x=>x.text.length+'c/'+x.ms+'ms').join(', ')}] served=${oas[0].served}`);
  // B. render 3 beats
  const ren=[];
  for(let b=0;b<SDS.length;b++){ const user='SCENE DIRECTIVE:\n[SD]'+SDS[b]+'[/SD]\nSCENE SETUP: '+SCENE_SETUPS[b]+'\nCHARACTER BIBLES:\n'+BIBLES+'\nWrite the embodied first-person prose now.';
    const r=await call(model, {...MODELS[model]('SPECIALIST_RENDERER'),max_tokens:1300}, [{role:'system',content:RENDER_SYS},{role:'user',content:user}]); ren.push({beat:b+1,text:r.text,ms:r.ms,usage:r.usage,served:r.served}); }
  out.render[model]=ren; console.error(`[${model}] RENDER beats=[${ren.map(x=>x.text.length+'c/'+x.ms+'ms').join(', ')}]`);
  // C. fate cards (oas + literary)
  const fate={};
  for(const ctxLabel of ['oas','literary']){ const ctx='SCENE ('+ctxLabel+' explicit): '+SCENE_SETUPS[0]+'\nDIRECTIVE:[SD]'+SDS[0]+'[/SD]\nBIBLES:\n'+BIBLES+'\nGenerate the 5 fate-card suggestions now.';
    const r=await call(model, {...MODELS[model]('INTIMACY_SPECIALIST'),max_tokens:700}, [{role:'system',content:FATE_SYS},{role:'user',content:ctx}]); fate[ctxLabel]={text:r.text,ms:r.ms,usage:r.usage,served:r.served}; }
  out.fate[model]=fate; console.error(`[${model}] FATE oas=${fate.oas.text.length}c/${fate.oas.ms}ms lit=${fate.literary.text.length}c/${fate.literary.ms}ms`);
}
fs.writeFileSync('/tmp/bake2.json', JSON.stringify(out,null,1));
console.error('\n===== COST + LATENCY SUMMARY =====');
for(const model of Object.keys(MODELS)){
  const o=out.oas[model], r=out.render[model];
  const sum=(arr)=>arr.reduce((a,c)=>{const t=ttok(c.usage);a.in+=t.in;a.out+=t.out;a.reason+=t.reason;a.ms+=c.ms;a.cost+=cost(model,c.usage);a.n++;return a;},{in:0,out:0,reason:0,ms:0,cost:0,n:0});
  const O=sum(o), R=sum(r);
  console.error(`[${model}] served=${o[0].served}`);
  console.error(`  OAS/turn: ${Math.round(O.ms/O.n)}ms · in${Math.round(O.in/O.n)}/out${Math.round(O.out/O.n)}/reason${Math.round(O.reason/O.n)}tok · $${(O.cost/O.n).toFixed(6)}/turn · ${(O.out/(O.ms/1000)).toFixed(1)} tok/s · full 4-turn encounter $${O.cost.toFixed(5)}`);
  console.error(`  RENDER/beat: ${Math.round(R.ms/R.n)}ms · in${Math.round(R.in/R.n)}/out${Math.round(R.out/R.n)}/reason${Math.round(R.reason/R.n)}tok · $${(R.cost/R.n).toFixed(6)}/beat · ${(R.out/(R.ms/1000)).toFixed(1)} tok/s`);
}
console.error('\nRaw → /tmp/bake2.json');
