// Grok vs DeepSeek vs Mistral — EXPLICIT (SD/literary-embodied) author comparison.
// GOLD method: set up a real Passionate billionaire story (real bibles in state), then
// invoke the ACTUAL exported author fns with a constructed constraints object — each
// builds its own faithful model-tuned SD prompt and calls its proxy. Grok + Mistral via
// the real fns; DeepSeek via replaying the captured Grok-SD prompt on /api/deepseek-proxy
// (no DeepSeek adapter — noted). 3 explicit beats. Saves outputs + token usage to /tmp.
const { chromium } = require('playwright-core');
const fs = require('fs');
function log(...a){ console.error(...a); }
const BEATS = [
  { intimacyOccurs:true, emotionalCore:'years of restraint finally breaking; she stops pretending she does not want him', physicalBounds:'full nudity and penetration and mutual climax permitted', sceneSetup:'Alone in his penthouse after the gala, Mara closes the distance to Roman and they finally stop resisting each other.', hardStops:['consent_withdrawal'] },
  { intimacyOccurs:true, emotionalCore:'fury and wanting fused — enemies who cannot stop', physicalBounds:'full, urgent, climax permitted', sceneSetup:'After a public confrontation, Mara and Roman end up against the glass wall of his dark office, anger turning to heat.', hardStops:['consent_withdrawal'] },
  { intimacyOccurs:true, emotionalCore:'being truly seen and not bracing for it', physicalBounds:'full, slow, tender, climax permitted', sceneSetup:'Morning light, his bed; Roman pulls Mara back against him and she lets herself be wanted without armor.', hardStops:['consent_withdrawal'] },
];
(async () => {
  const browser = await chromium.launch({ headless:true });
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images']) await page.route(p, r=>r.fulfill({status:500,body:'{}'}));
  const clog=[]; page.on('console', m=>{ const t=m.text(); if(/\[GROK SD\]|\[MISTRAL|\[STORY:READY\]|SD Fallback|BEGIN-ERR|CALL-ERR/i.test(t)) clog.push(t.slice(0,140)); });
  try {
    await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.state && typeof window.handleBeginStory==='function' && window.StoryboundOrchestration && typeof window.StoryboundOrchestration.callGrokSDAuthor==='function', {timeout:40000});
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
    log('scene 1 ready; bibles populated. Running 3 SD beats × 3 models.');
    const results=[];
    for(let b=0;b<BEATS.length;b++){
      const r = await page.evaluate(async (beat)=>{
        const O=window.StoryboundOrchestration, s=window.state; const out={grok:null,mistral:null,deepseek:null,errs:[],usage:{}};
        s.explicitEmbodimentAuthorized=true; s._explicitEmbodimentAuthorized=true; s.intensity='Passionate'; s.userContentPreference='full';
        let gate; try{ gate=O.enforceMonetizationGates('sub'); }catch(_){ gate={completionAllowed:true,hardStops:['consent_withdrawal']}; }
        gate.completionAllowed=true;
        // capture the Grok-SD request body (for DeepSeek replay) + usages via a one-shot fetch wrap
        const usages=[]; const reqBodies=[]; const _origFetch=window.fetch;
        window.fetch=async function(u,opt){ const url=String(u); const r=await _origFetch.apply(this,arguments);
          try{ if(/\/api\/(proxy|mistral-proxy|deepseek-proxy)/.test(url)){ const clone=r.clone(); const jt=await clone.json().catch(()=>null); const usage=jt&&(jt.usage||jt.usageMetadata); if(opt&&opt.body){ reqBodies.push({url,body:opt.body}); } usages.push({url,usage}); } }catch(_){}
          return r; };
        // (1) call callGrokSDAuthor to BUILD + capture the real Grok-SD prompt (its
        //     response 400s on this proxy due to role SD_AUTHOR, but the request body
        //     — the faithful SD prompt — is captured).
        try{ await O.callGrokSDAuthor(beat, gate); }catch(e){ out.errs.push('grokfn:'+(e.message||'').slice(0,60)); }
        // (2) faithful Mistral via the real fn (its own MISTRAL-SD block)
        try{ out.mistralFaithful = await O.callMistralSDFallback(beat, gate); }catch(e){ out.errs.push('mistralfn:'+(e.message||'').slice(0,60)); }
        const grokReq=reqBodies.filter(x=>/\/api\/proxy(\?|$|\/)/.test(x.url)||/\/api\/proxy$/.test(x.url)).pop() || reqBodies.filter(x=>/\/api\/proxy/.test(x.url)).pop();
        const post=async(url,body)=>{ try{ const r=await _origFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j=await r.json().catch(()=>null); if(j&&j.usage) usages.push({url,usage:j.usage}); return (j&&(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||j.content))||(j&&j.error?('[ERR '+JSON.stringify(j.error).slice(0,80)+']'):null); }catch(e){ return '[FETCH-ERR '+e.message.slice(0,50)+']'; } };
        if(grokReq){ const gb=JSON.parse(grokReq.body); const msgs=gb.messages, mt=gb.max_tokens||2000, tp=gb.temperature||0.8;
          // (3) identical-prompt replay on all 3 with VALID roles/models
          out.grok = await post('/api/proxy', {messages:msgs, role:'SPECIALIST_RENDERER', preferredModel:'grok-4-1-fast-reasoning', max_tokens:mt, temperature:tp});
          // DeepSeek-v4-pro is a REASONING model — give it big headroom so reasoning tokens
          // don't starve the output (the empty-output artifact at small max_tokens).
          out.deepseek = await post('/api/deepseek-proxy', {messages:msgs, model:'deepseek-v4-pro', max_tokens:Math.max(2500,mt), temperature:tp});
          out.mistral = await post('/api/mistral-proxy', {messages:msgs, model:'mistral-medium-latest', max_tokens:mt, temperature:tp});
        } else out.errs.push('no-grok-req-captured');
        window.fetch=_origFetch; out.usage=usages;
        out.liBible = (s.liBible||s.loveInterestBible||{});
        return out;
      }, BEATS[b]);
      // extract [SD]...[/SD] if present
      const ex = t => { if(!t) return ''; const m=String(t).match(/\[SD\]([\s\S]*?)\[\/SD\]/); return (m?m[1]:String(t)).trim(); };
      results.push({ beat:b+1, grok:ex(r.grok), mistral:ex(r.mistral), deepseek:ex(r.deepseek), mistralFaithful:ex(r.mistralFaithful), errs:r.errs, usage:r.usage });
      log(`beat ${b+1}: grok=${(r.grok||'').length}c deepseek=${(r.deepseek||'').length}c mistral=${(r.mistral||'').length}c (faithfulMistral=${(r.mistralFaithful||'').length}c) errs=[${r.errs.join('|')}]`);
      fs.writeFileSync('/tmp/sd_beat'+(b+1)+'.json', JSON.stringify(results[results.length-1],null,1));
    }
    fs.writeFileSync('/tmp/sd_all.json', JSON.stringify(results,null,1));
    // also save the liBible once for the consistency judge
    const lib = await page.evaluate(()=>JSON.stringify(window.state.liBible||window.state.loveInterestBible||{}));
    fs.writeFileSync('/tmp/sd_libible.json', lib);
    log('DONE. outputs saved /tmp/sd_beat1..3.json + /tmp/sd_all.json. console tail: '+clog.slice(-4).join(' || '));
  } catch(e){ log('ERR '+e.message); }
  await browser.close();
})().catch(e=>{console.error('DRIVER-ERR',e.message);process.exit(1);});
