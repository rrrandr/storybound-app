// Byte-identical payload, one flag differs. Arm A = as shipped. Arm B = reasoning_effort:"high".
import fs from 'fs';
const KEY=(fs.readFileSync('.env.local','utf8').match(/^MISTRAL_API_KEY=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');
const b=JSON.parse(fs.readFileSync('/tmp/author_payload.json','utf8'));
const flat=c=>Array.isArray(c)?c.filter(x=>x&&x.type==='text').map(x=>typeof x.text==='string'?x.text
  :(Array.isArray(x.text)?x.text.map(t=>t.text||'').join(''):'')).join(''):String(c||'');
const think=c=>Array.isArray(c)?c.filter(x=>x&&x.type==='thinking').map(x=>Array.isArray(x.thinking)
  ?x.thinking.map(t=>t.text||'').join(''):String(x.thinking||'')).join('\n'):'';
async function call(label,extra,maxTok){
  const body={model:b.model,messages:b.messages,temperature:b.temperature,
    max_tokens:maxTok||b.max_tokens,...extra};
  const t0=Date.now();
  let j=null;
  for(let att=1;att<=6;att++){
    const r=await fetch('https://api.mistral.ai/v1/chat/completions',{method:'POST',
      headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
    j=await r.json();
    if(!(j&&j.type==='rate_limited')) break;
    const w=att*45; console.log('  429 — waiting '+w+'s (attempt '+att+'/6)');
    await new Promise(z=>setTimeout(z,w*1000));
  }
  if(j.error||!j.choices){ console.log(label+' ERROR '+JSON.stringify(j).slice(0,240)); return null; }
  const c=j.choices[0].message.content, text=flat(c), reasoning=think(c), u=j.usage||{};
  const cost=(u.prompt_tokens||0)*0.15e-6+(u.completion_tokens||0)*0.60e-6;
  const rec={label,maxTokens:body.max_tokens,secs:Math.round((Date.now()-t0)/1000),usage:u,
    costUSD:+cost.toFixed(6),reasoningChars:reasoning.length,proseChars:text.length,
    finish:j.choices[0].finish_reason,reasoning,text};
  fs.writeFileSync('_validate_out/pair_'+label+'.json',JSON.stringify(rec,null,2));
  console.log('\n════ '+label+' ════');
  console.log('  max_tokens '+body.max_tokens+' · '+rec.secs+'s · finish='+rec.finish);
  console.log('  usage: '+JSON.stringify(u));
  console.log('  cost : $'+cost.toFixed(6)+'   thinking: '+reasoning.length+' chars   prose: '+text.length+' chars');
  ['market stall','folded note','passes the folded','pass'].forEach(k=>
    console.log('    "'+k+'" in prose: '+new RegExp(k,'i').test(text)));
  return rec;
}
await call('V2A_shipped',{});
await new Promise(z=>setTimeout(z,20000));
await call('V2B_thinking',{reasoning_effort:'high'});
