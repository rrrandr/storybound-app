// FRESH EXPLICIT BAKEOFF v2 — grok-4.3 vs mistral-medium-latest vs mistral-small-latest.
// Phase 1 (Playwright): set up a real Passionate billionaire story, extract bibles +
//   3 real SD directives (callMistralSDFallback) + the expression-mode block. Close browser.
// Phase 2 (node fetch → localhost:3000): timed model calls for OAS turns, literary render
//   beats, and fate-card suggestions, × 3 models. Capture text + usage + wall-clock.
// CAVEAT: mistral-*-latest are FLOATING aliases (proxy won't disclose checkpoint).
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE='http://localhost:3000';
const PRICE={ 'grok-4.3':{in:1.25e-6,out:2.5e-6}, 'mistral-medium-latest':{in:1.5e-6,out:7.5e-6}, 'mistral-small-latest':{in:0.15e-6,out:0.6e-6} };
const BEATS=[
  {emotionalCore:'years of restraint finally breaking; she stops pretending she does not want him', physicalBounds:'full nudity, penetration, mutual climax permitted', sceneSetup:'Alone in his penthouse after the gala, Mara closes the distance to Roman and they finally stop resisting.', intimacyOccurs:true, hardStops:['consent_withdrawal']},
  {emotionalCore:'fury and wanting fused — enemies who cannot stop', physicalBounds:'full, urgent, climax permitted', sceneSetup:'After a public confrontation, Mara and Roman end up against the glass wall of his dark office.', intimacyOccurs:true, hardStops:['consent_withdrawal']},
  {emotionalCore:'being truly seen and not bracing for it', physicalBounds:'full, slow, tender, climax permitted', sceneSetup:'Morning light, his bed; Roman pulls Mara back against her and she lets herself be wanted without armor.', intimacyOccurs:true, hardStops:['consent_withdrawal']},
];
const OAS_TURNS=[
  {say:"I want you. Don't hold back.", do:"I pull his hand to my hip and press it against me."},
  {say:"Yes—there. Don't stop.", do:"I arch up into him, nails dragging down his back."},
  {say:"Tell me you've wanted this.", do:"I still his face in my hands, holding his eyes."},
  {say:"I need all of you—now.", do:"I hook my leg around him and pull him deeper."},
];
const OAS_SYS=`You author ONE turn of an explicit in-the-moment intimate encounter between MARA (first-person narrator) and ROMAN TUSK (DARK_VICE: controlled, possessive, intensity under restraint). Adult content fully authorized. React in REAL TIME to her SAY and DO this turn. 60-130 words: Roman's physical action + spoken line + Mara's felt sensation, first person. Explicit anatomical vocabulary expected. ESCALATE from prior turns; VARY anatomy phrasing (no repeats); maintain consent; stay in DARK_VICE voice. Output ONLY this turn's prose.`;
const RENDER_INSTR=`\n\n=== RENDER ===\nWrite 320-460 words of FINAL reader-facing embodied intimate PROSE (not a plan) in MARA's first-person POV, dramatizing this beat. Honor the Scene Directive + bibles. Roman physically present/specific; Mara's sensation on the page; explicit vocabulary expected; consent maintained; vary anatomy phrasing; stay in voice. Output ONLY prose.`;
const FATE_SYS=`You generate FATE CARD SUGGESTIONS for an interactive romance at an intimate decision point. Return EXACTLY 5 cards as JSON: [{"type":"temptation|silence|reversal|boundary|confession","label":"2-4 word title","line":"a charged 8-18 word in-character suggestion of what Mara could do/say next"}]. Each must fit THIS explicit scene + Roman's DARK_VICE dynamic. Tempting, specific, in-voice. JSON only.`;
function ttok(u){ if(!u)return{in:0,out:0,reason:0}; const r=(u.completion_tokens_details&&u.completion_tokens_details.reasoning_tokens)||0; return {in:u.prompt_tokens||0, out:u.completion_tokens||0, reason:r}; }
function cost(model,u){ const t=ttok(u),p=PRICE[model]; if(!p)return 0; const outBilled = t.out + (model.startsWith('grok')? t.reason : 0); /* grok reports reasoning separately; mistral has none */ return t.in*p.in + outBilled*p.out; }
async function call(model, payloadExtra, messages){
  const url = model.startsWith('mistral') ? '/api/mistral-proxy' : '/api/proxy';
  const body = Object.assign({messages}, payloadExtra);
  const t0=Date.now();
  try{ const r=await fetch(BASE+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const ms=Date.now()-t0; const j=await r.json().catch(()=>null);
    const text=(j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||(j&&j.error?('[ERR '+JSON.stringify(j.error).slice(0,80)+']'):'[no-content]');
    return {text, usage:j&&j.usage, ms, served:j&&j.model, ok:r.ok}; }
  catch(e){ return {text:'[EXC '+e.message.slice(0,50)+']', ms:Date.now()-t0, err:e.message}; }
}
const MODELS={
  'grok-4.3':       (role)=>({role,preferredModel:'grok-4.3'}),
  'mistral-medium-latest': ()=>({model:'mistral-medium-latest'}),
  'mistral-small-latest':  ()=>({model:'mistral-small-latest'}),
};
(async () => {
  // ---- PHASE 1: extract bibles + SD directives + expr block ----
  const browser = await chromium.launch({ headless:true });
  const ctx=await browser.newContext(); const page=await ctx.newPage();
  for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images']) await page.route(p, r=>r.fulfill({status:500,body:'{}'}));
  const clog=[]; page.on('console',m=>{const t=m.text(); if(/\[STORY:READY\]|MISTRAL SD|BEGIN-ERR/i.test(t)) clog.push(t.slice(0,100));});
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.state&&window.handleBeginStory&&window.StoryboundOrchestration&&window.StoryboundOrchestration.callMistralSDFallback,{timeout:40000});
  await page.evaluate(()=>{ const s=window.state; window._devBypass=true; window._forceAudits=false;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true; s._pcLookSkipped=true; s.pcLookLocked=true;
    s.picks=s.picks||{}; Object.assign(s.picks,{world:'billionaire',flavor:'billionaire_modern',dynamic:'enemies_to_lovers',worldSubtype:'billionaire_modern',playermask:'DARK_VICE'});
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.loveInterestName='Roman Tusk'; s.liGender='male'; s.archetype={primary:'DARK_VICE',modifier:null,bound:false}; s.playerMask='DARK_VICE';
    s.storyLength='soulmates'; s.tier='soulmates'; s.intensity='Passionate'; s.name='Mara'; s.pov='first_person'; s.turnCount=0;
    s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary'; s.explicitEmbodimentAuthorized=true; s._explicitEmbodimentAuthorized=true; s.userContentPreference='full'; });
  await page.evaluate(()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+e.message); } });
  { const t0=Date.now(); while(Date.now()-t0<280000){ await page.waitForTimeout(4000); if(clog.some(l=>/\[STORY:READY\]/.test(l))) break; } }
  const setup = await page.evaluate(async (BEATS)=>{
    const O=window.StoryboundOrchestration, s=window.state; let gate; try{gate=O.enforceMonetizationGates('sub');}catch(_){gate={completionAllowed:true,hardStops:['consent_withdrawal']};} gate.completionAllowed=true;
    const liB=s.liBible||s.loveInterestBible||{}, pcB=s.pcBible||s.protagonistBible||{};
    const bibles='ROMAN (DARK_VICE): '+JSON.stringify({sig:liB.signature_feature,desc:liB.physical_description||liB.appearance,manner:liB.signature_behavior,voice:liB.voice}).slice(0,520)+'\nMARA: '+JSON.stringify({sig:pcB.signature_feature,desc:pcB.physical_description||pcB.appearance}).slice(0,380);
    const sds=[]; let expr='';
    const _f=window.fetch; const reqs=[];
    window.fetch=async function(u,opt){ const url=String(u); const res=await _f.apply(this,arguments); try{ if(/mistral-proxy|\/api\/proxy/.test(url)&&opt&&opt.body) reqs.push(opt.body); }catch(_){} return res; };
    for(const beat of BEATS){ let t=''; try{ t=await O.callMistralSDFallback(beat,gate); }catch(_){}; const m=String(t).match(/\[SD\]([\s\S]*?)\[\/SD\]/); sds.push(m?m[1]:t); }
    try{ for(const b of reqs){ const jb=JSON.parse(b); const sys=(jb.messages||[]).find(m=>m.role==='system'); if(sys&&/expression|explicit|intimacy|embodi/i.test(sys.content)&&sys.content.length>expr.length) expr=sys.content; } }catch(_){}
    window.fetch=_f;
    return {bibles, sds, expr};
  }, BEATS);
  await browser.close();
  console.error('Phase 1 done: bibles='+setup.bibles.length+'c, '+setup.sds.length+' SD directives, exprBlock='+setup.expr.length+'c');
  const exprSys = setup.expr || 'You are S. Tory Bound, an explicit romance prose author. Adult content authorized.';

  // ---- PHASE 2: timed model bakeoff (node fetch) ----
  const out={meta:{models:Object.keys(MODELS), note:'mistral-*-latest are floating aliases; checkpoint unverified'}, oas:{}, render:{}, fate:{}};
  for(const model of Object.keys(MODELS)){
    // A. OAS multi-turn
    const oas={turns:[]}; let hist='CHARACTER BIBLES:\n'+setup.bibles+'\nENCOUNTER STATE: already undressed, mid-intimacy against Carrara marble in his penthouse; years of restraint broken.\n';
    for(let t=0;t<OAS_TURNS.length;t++){ const user=hist+`\n--- TURN ${t+1} ---\nMARA SAYS: "${OAS_TURNS[t].say}"\nMARA DOES: ${OAS_TURNS[t].do}\nAuthor Roman's response to THIS turn now.`;
      const r=await call(model, MODELS[model]('INTIMACY_SPECIALIST'), [{role:'system',content:OAS_SYS},{role:'user',content:user}]);
      oas.turns.push({text:r.text, ms:r.ms, usage:r.usage, served:r.served}); hist+=`\n[T${t+1}] Mara:"${OAS_TURNS[t].say}"/${OAS_TURNS[t].do}\nRoman: ${r.text}\n`; }
    out.oas[model]=oas;
    console.error(`[${model}] OAS: turns=[${oas.turns.map(x=>x.text.length+'c/'+x.ms+'ms').join(', ')}]`);
    // B. literary render (3 beats)
    const ren=[];
    for(let b=0;b<BEATS.length;b++){ const sys=exprSys+RENDER_INSTR; const user='SCENE DIRECTIVE:\n[SD]'+setup.sds[b]+'[/SD]\nSCENE SETUP: '+BEATS[b].sceneSetup+'\nCHARACTER BIBLES:\n'+setup.bibles+'\nWrite the embodied first-person prose now.';
      const r=await call(model, MODELS[model]('SPECIALIST_RENDERER'), [{role:'system',content:sys},{role:'user',content:user}]); ren.push({beat:b+1,text:r.text,ms:r.ms,usage:r.usage,served:r.served}); }
    out.render[model]=ren;
    console.error(`[${model}] RENDER: beats=[${ren.map(x=>x.text.length+'c/'+x.ms+'ms').join(', ')}]`);
    // C. fate cards (OAS context + literary context)
    const fate={};
    for(const ctxLabel of ['oas','literary']){ const ctx='SCENE ('+ctxLabel+' explicit): '+BEATS[0].sceneSetup+'\nDIRECTIVE:[SD]'+setup.sds[0]+'[/SD]\nBIBLES:\n'+setup.bibles+'\nGenerate the 5 fate-card suggestions now.';
      const r=await call(model, MODELS[model]('INTIMACY_SPECIALIST'), [{role:'system',content:FATE_SYS},{role:'user',content:ctx}]); fate[ctxLabel]={text:r.text,ms:r.ms,usage:r.usage,served:r.served}; }
    out.fate[model]=fate;
    console.error(`[${model}] FATE: oas=${fate.oas.text.length}c/${fate.oas.ms}ms lit=${fate.literary.text.length}c/${fate.literary.ms}ms`);
  }
  fs.writeFileSync('/tmp/bake2.json', JSON.stringify(out,null,1));
  // cost/latency summary
  console.error('\n===== COST + LATENCY SUMMARY =====');
  for(const model of Object.keys(MODELS)){
    const oasCalls=out.oas[model].turns, renCalls=out.render[model], fateCalls=Object.values(out.fate[model]);
    const sum=(arr)=>arr.reduce((a,c)=>{const t=ttok(c.usage); a.in+=t.in;a.out+=t.out;a.reason+=t.reason;a.ms+=c.ms;a.cost+=cost(model,c.usage);return a;},{in:0,out:0,reason:0,ms:0,cost:0});
    const o=sum(oasCalls), r=sum(renCalls);
    console.error(`[${model}] served=${oasCalls[0]&&oasCalls[0].served}`);
    console.error(`  OAS/turn avg: ${Math.round(o.ms/oasCalls.length)}ms, in${Math.round(o.in/oasCalls.length)}/out${Math.round(o.out/oasCalls.length)}/reason${Math.round(o.reason/oasCalls.length)} tok, $${(o.cost/oasCalls.length).toFixed(6)}; full ${oasCalls.length}-turn encounter $${o.cost.toFixed(5)}`);
    console.error(`  RENDER/beat avg: ${Math.round(r.ms/renCalls.length)}ms, in${Math.round(r.in/renCalls.length)}/out${Math.round(r.out/renCalls.length)}/reason${Math.round(r.reason/renCalls.length)} tok, $${(r.cost/renCalls.length).toFixed(6)}`);
  }
  console.error('\nRaw → /tmp/bake2.json');
})().catch(e=>{console.error('DRIVER-ERR',e.message);process.exit(1);});
