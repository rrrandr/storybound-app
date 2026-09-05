// EXPLICIT SUBSTITUTION BAKEOFF — test #2 (OAS intimate-dialogue turns).
// Multi-turn (where OAS is actually stressed: escalation + cross-turn continuity +
// anatomy-phrase variety). Same encounter state + same player Say/Do per turn, run
// the full 3-turn sequence through Grok / Mistral / DeepSeek (each fed its own prior
// turns back). Constructed-faithful OAS prompt (real bibles + intimate-turn framing);
// no orchestration-client.js/app.js edits (concurrent deprecate-sonnet-opus work).
// Defensive: per-model try/catch, capped tokens, so one failure can't kill the run.
const { chromium } = require('playwright-core');
const fs = require('fs');
const TURNS = [
  { say:"I want you. Don't hold back.", do:"I pull his hand to my hip and press it against me." },
  { say:"Yes—there. Don't stop.",       do:"I arch up into him, nails dragging down his back." },
  { say:"I need all of you—now.",        do:"I hook my leg around him and pull him deeper." },
];
const OAS_SYSTEM = `You are authoring ONE turn of an explicit, in-the-moment intimate encounter between MARA (first-person narrator, the protagonist) and ROMAN TUSK (her love interest — a DARK_VICE archetype: controlled, possessive, intensity under restraint). Adult content is fully authorized.
RULES:
- Respond IN REAL TIME to the player's SAY and DO this turn. React to exactly what she just said/did.
- Write 60-130 words: Roman's physical action + his spoken line(s) + Mara's felt sensation. First person (Mara's POV) for sensation; Roman speaks in his voice.
- Explicit anatomical/erotic vocabulary is expected. Escalate from the prior turns — do NOT reset or repeat. VARY anatomy phrasing across turns (no repeated phrases).
- Maintain consent and momentum. Stay in character (DARK_VICE Roman, not generic).
- Output ONLY the prose for this turn. No meta, no headers.`;
async function runModel(page, label, post, bibles){
  const transcript=[]; const usages=[]; const errs=[];
  let history = `CHARACTER BIBLES:\n${bibles}\n\nENCOUNTER STATE: They are already undressed, mid-intimacy, against the Carrara marble of his penthouse. Years of restraint have broken.\n`;
  for(let t=0;t<TURNS.length;t++){
    const user = history + `\n--- TURN ${t+1} ---\nMARA SAYS: "${TURNS[t].say}"\nMARA DOES: ${TURNS[t].do}\n\nAuthor Roman's response to THIS turn now.`;
    const messages=[{role:'system',content:OAS_SYSTEM},{role:'user',content:user}];
    try{ const {text,usage}=await post(messages); transcript.push(text||'[empty]'); if(usage) usages.push(usage); history += `\n[TURN ${t+1}] Mara: "${TURNS[t].say}" / ${TURNS[t].do}\nRoman: ${text}\n`; }
    catch(e){ transcript.push('[ERR '+e.message.slice(0,50)+']'); errs.push('t'+(t+1)+':'+e.message.slice(0,40)); }
  }
  return { label, transcript, usages, errs };
}
(async () => {
  const browser = await chromium.launch({ headless:true });
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images']) await page.route(p, r=>r.fulfill({status:500,body:'{}'}));
  const clog=[]; page.on('console', m=>{ const t=m.text(); if(/\[STORY:READY\]|BEGIN-ERR/i.test(t)) clog.push(t.slice(0,100)); });
  try {
    await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.state&&window.handleBeginStory&&window.StoryboundOrchestration,{timeout:40000});
    await page.evaluate(()=>{ const s=window.state; window._devBypass=true; window._forceAudits=false;
      s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true; s._pcLookSkipped=true; s.pcLookLocked=true;
      s.picks=s.picks||{}; Object.assign(s.picks,{world:'billionaire',flavor:'billionaire_modern',dynamic:'enemies_to_lovers',worldSubtype:'billionaire_modern',playermask:'DARK_VICE'});
      s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
      s.loveInterest='Male'; s.loveInterestName='Roman Tusk'; s.liGender='male';
      s.archetype={primary:'DARK_VICE',modifier:null,bound:false}; s.playerMask='DARK_VICE';
      s.storyLength='soulmates'; s.tier='soulmates'; s.intensity='Passionate'; s.name='Mara'; s.pov='first_person'; s.turnCount=0;
      s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
      s.explicitEmbodimentAuthorized=true; s._explicitEmbodimentAuthorized=true; s.userContentPreference='full'; });
    await page.evaluate(()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+e.message); } });
    { const t0=Date.now(); while(Date.now()-t0<280000){ await page.waitForTimeout(4000); if(clog.some(l=>/\[STORY:READY\]/.test(l))) break; } }
    const bibles = await page.evaluate(()=>{ const s=window.state, liB=s.liBible||s.loveInterestBible||{}, pcB=s.pcBible||s.protagonistBible||{};
      return 'ROMAN (DARK_VICE): '+JSON.stringify({sig:liB.signature_feature,desc:liB.physical_description||liB.appearance,manner:liB.signature_behavior,voice:liB.voice}).slice(0,520)+'\nMARA: '+JSON.stringify({sig:pcB.signature_feature,desc:pcB.physical_description||pcB.appearance}).slice(0,380); });
    const mk = (url, extra) => async (messages) => page.evaluate(async ({url,extra,messages})=>{
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({messages,max_tokens:500,temperature:0.85},extra))});
      const j=await r.json().catch(()=>null);
      const text=(j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||(j&&j.error?'[ERR '+JSON.stringify(j.error).slice(0,70)+']':'[no-content]');
      return {text, usage:j&&j.usage};
    }, {url,extra,messages});
    const models=[
      ['grok', mk('/api/proxy',{role:'INTIMACY_SPECIALIST',preferredModel:'grok-4-1-fast-reasoning'})],
      ['mistral', mk('/api/mistral-proxy',{model:'mistral-medium-latest'})],
      ['deepseek', mk('/api/deepseek-proxy',{model:'deepseek-v4-pro',max_tokens:1800})],
    ];
    const out=[];
    for(const [label,post] of models){ const r=await runModel(page,label,post,bibles); out.push(r); console.error(`${label}: turns=[${r.transcript.map(t=>t.length+'c').join(', ')}] errs=[${r.errs.join('|')}]`); }
    fs.writeFileSync('/tmp/oas_bakeoff.json', JSON.stringify({bibles,turns:TURNS,models:out},null,1));
    console.error('DONE OAS bakeoff → /tmp/oas_bakeoff.json');
  } catch(e){ console.error('ERR '+e.message); }
  await browser.close();
})().catch(e=>{console.error('DRIVER-ERR',e.message);process.exit(1);});
