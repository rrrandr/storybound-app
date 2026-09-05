// PRODUCTION-PATH COMPARISON — grok-4.3 vs mistral-small-latest, routes A/B/C.
// A = raw direct author. B = author + deterministic repairs (picturability + calcified-move).
// C = B + polish (Perception/Signature Lens). Browser-based (repairs are client-side, read
// state, call proxies); manual faithful bibles to skip the crash-prone full story gen.
// CAVEAT: mistral-small-latest is a floating alias (checkpoint unverified). Single run.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE='http://localhost:3000';
const SCENES=[
 {key:'connective', prompt:'ORDINARY CONNECTIVE: A small in-between beat — Mara crosses the city to a 7am meeting after a sleepless night, the routine of it revealing her state of mind and a flicker of Roman in her thoughts. Low-key, characterizing, no big event.'},
 {key:'social_pressure', prompt:'SOCIAL PRESSURE: A charged board dinner; Mara works the room against rivals who want her gone, while Roman watches from across the table. Composure over a live current. Subtext, maneuvering.'},
 {key:'vulnerability', prompt:'QUIET VULNERABILITY: Late, alone, the armor slips — Roman admits one true thing, uncharacteristically unguarded; Mara catches a glimpse past the control. Restraint and want under the surface.'},
 {key:'romantic_tension', prompt:'ROMANTIC TENSION: An almost-moment — proximity in a doorway, the line neither crosses, the air thick with everything unsaid. No physical intimacy; pure charged restraint.'},
 {key:'action_reversal', prompt:'ACTION / REVERSAL: A deal Mara has staked everything on collapses live in the room; she must pivot in seconds as the power flips, Roman the unexpected variable. Fast, high-stakes.'},
];
const SYS=`You are S. Tory Bound, authoring a LITERARY romance scene (contemporary billionaire / enemies-to-lovers). Write 320-420 words of immersive FIRST-PERSON (Mara) prose for the beat. NON-explicit. Craft: economical sensory grounding, sharp naturalistic dialogue, emotional subtext, real tension, distinct voice (Roman = DARK_VICE controlled menace + restraint; Mara = armored, wry, wanting against her will). Show don't tell. Output ONLY the prose.`;
const BIBLES=`ROMAN TUSK — LOVE INTEREST (DARK_VICE: controlled, possessive, restraint as a chosen performance). Tall, dark hair, sharp clean jaw, bespoke Charvet shirts, ink on his fingers; a stillness that reorganizes a room; low voice that drops half a step when he means it; says your name like a verdict.
MARA — PROTAGONIST (1st-person): sharp cheekbones, dark hair pinned, diamond-cut nails, a mouth she stopped apologizing for; competence like armor; furious at how much she wants him. WORLD: contemporary billionaire / high-finance, enemies-to-lovers.`;
(async () => {
  const browser = await chromium.launch({ headless:true });
  const ctx=await browser.newContext(); const page=await ctx.newPage();
  for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images']) await page.route(p, r=>r.fulfill({status:500,body:'{}'}));
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.state && window._repairCalcifiedMoves && window._applyPerceptionLens && window._repairInterlocutorPicturability,{timeout:40000});
  // ---- manual faithful state (NO handleBeginStory → no crash) ----
  await page.evaluate(()=>{ const s=window.state; window._devBypass=true; window._forceAudits=false;
    s.subscribed=true; s.fortunes=9999999; s.access='sub';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.loveInterestName='Roman Tusk'; s.liGender='male'; s.name='Mara'; s.pov='first_person';
    s.archetype={primary:'DARK_VICE',modifier:null,bound:true}; s.playerMask='DARK_VICE';
    s.storyLength='soulmates'; s.tier='soulmates'; s.intensity='Steamy'; s.turnCount=3;
    s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s.liBible={ signature_feature:'a stillness that reorganizes a room', physical_description:'tall, dark hair, sharp clean jaw, bespoke Charvet shirts, ink sometimes on his fingers', signature_behavior:'walks you to the edge of a line and lets you decide whether to cross; says your name like a verdict', voice:'low, dropping half a step when he means it', eye_color:'dark', hair:'dark' };
    s.pcBible={ signature_feature:'diamond-cut nails', physical_description:'sharp cheekbones, dark hair pinned, a mouth she stopped apologizing for', stress_tic:'nails drumming once before she stops herself' };
    s.loveInterestBible=s.liBible; s.protagonistBible=s.pcBible;
  });
  async function author(model, sys, user){
    return page.evaluate(async ({model,sys,user})=>{
      const url=model.startsWith('mistral')?'/api/mistral-proxy':'/api/proxy';
      const extra=model.startsWith('mistral')?{model}:{role:'SPECIALIST_RENDERER',preferredModel:'grok-4.3'};
      const t0=performance.now();
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:user}],max_tokens:1000,...extra})});
      const j=await r.json().catch(()=>null); const ms=performance.now()-t0;
      const text=(j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||'[no-content]';
      return {text, ms:Math.round(ms), usage:j&&j.usage};
    }, {model,sys,user});
  }
  // run repairs in-browser; report which changed the text + timing
  async function applyRoute(stages, text){
    return page.evaluate(async ({stages,text})=>{
      const log=[]; let cur=text;
      for(const fn of stages){ if(typeof window[fn]!=='function'){ log.push(fn+':missing'); continue; }
        const before=cur; const t0=performance.now();
        try{ const out=await window[fn](cur); if(typeof out==='string'&&out.length>40) cur=out; }catch(e){ log.push(fn+':err'); }
        log.push(fn+(cur!==before?':CHANGED':':nochange')+'/'+Math.round(performance.now()-t0)+'ms'); }
      return {text:cur, log};
    }, {stages,text});
  }
  const REPAIRS_B=['_repairLIPicturability','_repairPCPicturability','_repairInterlocutorPicturability','_repairCalcifiedMoves'];
  const POLISH_C=['_applyPerceptionLens'];
  const out={meta:{models:['grok-4.3','mistral-small-latest'],routes:'A=raw,B=+deterministic repairs,C=+lens polish',note:'mistral-small-latest floating alias; manual bibles'}, results:{}};
  for(const model of out.meta.models){ out.results[model]={};
    for(const sc of SCENES){
      const user='CHARACTER BIBLES:\n'+BIBLES+'\n\nBEAT — '+sc.prompt+'\n\nWrite the scene now.';
      const A=await author(model, SYS, user);
      const B=await applyRoute(REPAIRS_B, A.text);
      const C=await applyRoute(POLISH_C, B.text);
      out.results[model][sc.key]={ A:A.text, B:B.text, C:C.text, authorMs:A.ms, usage:A.usage, Blog:B.log, Clog:C.log };
      console.error(`[${model}] ${sc.key}: A=${A.text.length}c/${A.ms}ms | B repairs: ${B.log.join(' ')} | C lens: ${C.log.join(' ')}`);
    }
  }
  fs.writeFileSync('/tmp/prodpath.json', JSON.stringify(out,null,1));
  console.error('\nDONE → /tmp/prodpath.json');
  await browser.close();
})().catch(e=>{console.error('DRIVER-ERR',e.message);process.exit(1);});
