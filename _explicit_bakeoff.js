// EXPLICIT SUBSTITUTION BAKEOFF — test #1 (literary embodied-prose render).
// Same SD directive + intimacy state + character context → force-render the FINAL
// explicit prose with Grok / Mistral / DeepSeek, plus the deterministic cut-away
// baseline. No orchestration-client.js edits (concurrent deprecate-sonnet-opus work):
// render prompt = real captured expression-mode block + real SD directive (from the
// working callMistralSDFallback) + real bibles from window.state, IDENTICAL across
// models. Saves prose + token usage to /tmp for direct reading/judging.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BEATS = [
  { intimacyOccurs:true, emotionalCore:'years of restraint finally breaking; she stops pretending she does not want him', physicalBounds:'full nudity, penetration, mutual climax permitted', sceneSetup:'Alone in his penthouse after the gala, Mara closes the distance to Roman and they finally stop resisting.', hardStops:['consent_withdrawal'] },
  { intimacyOccurs:true, emotionalCore:'fury and wanting fused — enemies who cannot stop', physicalBounds:'full, urgent, climax permitted', sceneSetup:'After a public confrontation, Mara and Roman end up against the glass wall of his dark office.', hardStops:['consent_withdrawal'] },
  { intimacyOccurs:true, emotionalCore:'being truly seen and not bracing for it', physicalBounds:'full, slow, tender, climax permitted', sceneSetup:'Morning light, his bed; Roman pulls Mara back against him and she lets herself be wanted without armor.', hardStops:['consent_withdrawal'] },
];
const RENDER_INSTR = '\n\n=== YOUR TASK NOW (RENDER) ===\nYou are rendering the FINAL reader-facing embodied intimate PROSE — not a directive, not a plan. Write 320–460 words of explicit first-person scene prose in MARA\'s POV (first person), dramatizing THIS intimate encounter beat-by-beat. Honor the Scene Directive (emotionalCore / physicalBounds / sensoryFocus / rhythm) and the character bibles below. Roman must be physically present and specific (his body, voice, hands); Mara\'s sensation and reaction must be on the page; explicit anatomical/erotic vocabulary is permitted and expected; maintain consent; vary anatomy phrasing (no repetition); stay in her voice. Output ONLY the prose.';
function cutaway(prose){ const sents=String(prose||'').split(/(?<=[.!?])\s+/); const kept=[]; for(const s of sents){ if(/\b(kiss|touch|hands?\s+(?:on|moved|slid)|breath.*(?:neck|ear|skin)|pull(?:ed|ing)?\s+(?:me|him|her)\s+(?:close|against)|naked|undress|cock|inside|thrust|moan)\b/i.test(s)) break; kept.push(s);} return (kept.join(' ')||sents[0]||'').trim()+'\n\nThe moment shattered. Something pulled them back to reality — a sound, a knock, the world insisting.'; }
(async () => {
  const browser = await chromium.launch({ headless:true });
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images']) await page.route(p, r=>r.fulfill({status:500,body:'{}'}));
  const clog=[]; page.on('console', m=>{ const t=m.text(); if(/\[STORY:READY\]|MISTRAL SD|BEGIN-ERR/i.test(t)) clog.push(t.slice(0,120)); });
  try {
    await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.state&&window.handleBeginStory&&window.StoryboundOrchestration&&window.StoryboundOrchestration.callMistralSDFallback,{timeout:40000});
    await page.evaluate(()=>{ const s=window.state; window._devBypass=true; window._forceAudits=false;
      s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true; s._pcLookSkipped=true; s.pcLookLocked=true;
      s.picks=s.picks||{}; Object.assign(s.picks,{world:'billionaire',flavor:'billionaire_modern',dynamic:'enemies_to_lovers',worldSubtype:'billionaire_modern',playermask:'DARK_VICE'});
      s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
      s.loveInterest='Male'; s.loveInterestName='Roman Tusk'; s.liGender='male';
      s.archetype={primary:'DARK_VICE',modifier:null,bound:false,canonicalLIId:null,boundAtScene:null}; s.playerMask='DARK_VICE';
      s.storyLength='soulmates'; s.tier='soulmates'; s.intensity='Passionate'; s.name='Mara'; s.pov='first_person'; s.turnCount=0;
      s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
      s.explicitEmbodimentAuthorized=true; s._explicitEmbodimentAuthorized=true; s.userContentPreference='full'; });
    await page.evaluate(()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+e.message); } });
    { const t0=Date.now(); while(Date.now()-t0<280000){ await page.waitForTimeout(4000); if(clog.some(l=>/\[STORY:READY\]/.test(l))) break; } }
    await page.evaluate((instr)=>{ window.__RENDER_INSTR = instr; }, RENDER_INSTR);
    const results=[];
    for(let b=0;b<BEATS.length;b++){
      const r = await page.evaluate(async (beat)=>{
        const O=window.StoryboundOrchestration, s=window.state; const out={errs:[]};
        let gate; try{ gate=O.enforceMonetizationGates('sub'); }catch(_){ gate={completionAllowed:true,hardStops:['consent_withdrawal']}; } gate.completionAllowed=true;
        // capture expression block from the SD-author request + collect usages
        const usages=[], reqs=[]; const _f=window.fetch;
        window.fetch=async function(u,opt){ const url=String(u); const res=await _f.apply(this,arguments); try{ if(/\/api\/(proxy|mistral-proxy|deepseek-proxy)/.test(url)){ if(opt&&opt.body) reqs.push({url,body:opt.body}); const c=res.clone(); const j=await c.json().catch(()=>null); if(j&&j.usage) usages.push({url,usage:j.usage}); } }catch(_){} return res; };
        // real SD directive via the working Mistral SD author
        let esdText=''; try{ esdText = await O.callMistralSDFallback(beat, gate); }catch(e){ out.errs.push('sd:'+e.message.slice(0,50)); }
        const esd = (String(esdText).match(/\[SD\]([\s\S]*?)\[\/SD\]/)||[null,esdText])[1] || esdText;
        // extract a real expression-mode block from any captured SD request system msg
        let expr=''; try{ for(const q of reqs){ const jb=JSON.parse(q.body); const sys=(jb.messages||[]).find(m=>m.role==='system'); if(sys&&/expression|explicit|intimacy|embodi/i.test(sys.content)&&sys.content.length>expr.length) expr=sys.content; } }catch(_){}
        const liB=s.liBible||s.loveInterestBible||{}, pcB=s.pcBible||s.protagonistBible||{};
        const bibleSummary = 'LOVE INTEREST (Roman Tusk, DARK_VICE): '+JSON.stringify({signature:liB.signature_feature,desc:liB.physical_description||liB.appearance,manner:liB.signature_behavior,voice:liB.voice}).slice(0,500)+'\nPROTAGONIST (Mara): '+JSON.stringify({signature:pcB.signature_feature,desc:pcB.physical_description||pcB.appearance}).slice(0,400);
        const sys = (expr||'You are S. Tory Bound, an explicit romance prose author. Adult content authorized.') + window.__RENDER_INSTR;
        const user = 'SCENE DIRECTIVE:\n[SD]'+esd+'[/SD]\n\nSCENE SETUP: '+beat.sceneSetup+'\n\nCHARACTER BIBLES:\n'+bibleSummary+'\n\nWrite the embodied first-person prose now.';
        const messages=[{role:'system',content:sys},{role:'user',content:user}];
        const post=async(url,body)=>{ try{ const r=await _f(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j=await r.json().catch(()=>null); if(j&&j.usage) usages.push({url:url+'#render',usage:j.usage}); return (j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||(j&&j.error?'[ERR '+JSON.stringify(j.error).slice(0,80)+']':null); }catch(e){ return '[FETCH-ERR '+e.message.slice(0,50)+']'; } };
        out.grok = await post('/api/proxy', {messages, role:'SPECIALIST_RENDERER', preferredModel:'grok-4-1-fast-reasoning', max_tokens:1300, temperature:0.85});
        out.mistral = await post('/api/mistral-proxy', {messages, model:'mistral-medium-latest', max_tokens:1300, temperature:0.85});
        out.deepseek = await post('/api/deepseek-proxy', {messages, model:'deepseek-v4-pro', max_tokens:4000, temperature:0.85});
        window.fetch=_f; out.usage=usages; out.esd=esd; out.exprLen=expr.length;
        return out;
      }, BEATS[b]);
      r.cutaway = cutaway(r.grok);
      results.push(Object.assign({beat:b+1}, r));
      fs.writeFileSync('/tmp/bake_render_'+(b+1)+'.json', JSON.stringify(results[results.length-1],null,1));
      console.error(`beat ${b+1}: grok=${(r.grok||'').length}c mistral=${(r.mistral||'').length}c deepseek=${(r.deepseek||'').length}c exprBlock=${r.exprLen}c errs=[${r.errs.join('|')}]`);
    }
    fs.writeFileSync('/tmp/bake_render_all.json', JSON.stringify(results,null,1));
    console.error('DONE literary render bakeoff. console: '+clog.slice(-3).join(' || '));
  } catch(e){ console.error('ERR '+e.message); }
  await browser.close();
})().catch(e=>{console.error('DRIVER-ERR',e.message);process.exit(1);});
