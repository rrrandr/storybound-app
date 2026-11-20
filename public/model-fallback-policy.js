// Server and offline-budget policy for one primary plus one cross-provider backup.
// Published standard rates checked 2026-11-20; no cached-input discount is assumed.
(function(root){
  'use strict';
  var profiles={
    'gpt-6-luna':{provider:'openai',input:0.10,cached:0.01,output:0.50,context:1050000,tier:272000,above:[0.20,0.75,0.02]},
    'gpt-6.1-sol':{provider:'openai',input:2,cached:0.10,output:10,context:1050000,tier:272000,above:[4,15,0.20]},
    'claude-haiku-5-5':{provider:'anthropic',input:0.10,cached:0.01,output:0.50,context:1000000,tier:100000,above:[0.50,2.50,0.05]},
    'claude-sonnet-5-5':{provider:'anthropic',input:2,cached:0.10,output:10,context:1000000},
    'grok-4.6':{provider:'grok',input:2,output:6,context:500000,tier:200000,above:[4,12]},
    'grok-4.7':{provider:'grok',input:2,output:6,context:500000,tier:200000,above:[4,12]},
    'claude-haiku-4-5-20251001':{provider:'anthropic',input:1,output:5,context:200000},
    'grok-4.3':{provider:'grok',input:1.25,cached:0.20,output:2.50,context:1000000,tier:200000,above:[2.50,5,0.40]},
    'mistral-large-4':{provider:'mistral',input:0.70,cached:0.07,output:2.10,context:1000000},
    'gpt-4o-mini':{provider:'openai',input:0.15,output:0.60,context:128000},
    'gpt-4o':{provider:'openai',input:2.50,output:10,context:128000},
    'gpt-4-turbo':{provider:'openai',input:10,output:30,context:128000},
    'gpt-4':{provider:'openai',input:30,output:60,context:8192},
    'mistral-small-latest':{provider:'mistral',input:0.15,output:0.60,context:256000},
    'mistral-small-2603':{provider:'mistral',input:0.15,output:0.60,context:256000},
    'ministral-8b-2512':{provider:'mistral',input:0.15,output:0.15,context:256000},
    'ministral-3b-2512':{provider:'mistral',input:0.10,output:0.10,context:256000},
    'mistral-medium-latest':{provider:'mistral',input:1.50,output:7.50,context:256000},
    'mistral-medium-3-5-26-04':{provider:'mistral',input:1.50,output:7.50,context:256000},
    'deepseek-v4-pro':{provider:'deepseek',input:1.32,cached:0.044,output:3.96,context:1000000},
    'deepseek-v4-flash':{provider:'deepseek',input:0.30,cached:0.006,output:1.20,context:1000000},
    'gemini-2.5-flash':{provider:'gemini',input:0.30,output:2.50,context:1000000}
  };
  function canonical(model){
    if(/^grok-4-1|^grok-4\.20/.test(model||''))return 'grok-4.3';
    if(/^gemini-(1\.5|2\.0)-flash/.test(model||''))return 'gemini-2.5-flash';
    return String(model||'');
  }
  function backupFor(model,context){
    model=canonical(model);context=context||{};
    if(model==='gpt-6.1-sol')return 'claude-sonnet-5-5';
    if(model==='claude-sonnet-5-5')return /^(story-spine|aplot-initial|rplot-initial)$/.test(context.operation||'')?'gpt-6.1-sol':'gpt-6-luna';
    if(/^grok-/.test(model))return 'mistral-large-4';
    if(/^claude-/.test(model))return 'gpt-6-luna';
    if(/^(mistral|ministral|deepseek)/.test(model))return context.explicit?'grok-4.3':'gpt-6-luna';
    if(/^gpt-/.test(model))return 'claude-haiku-5-5';
    if(/^gemini-/.test(model))return 'gpt-6-luna';
    return null;
  }
  function rates(model,input){var p=profiles[canonical(model)];if(!p)return null;return p.tier&&input>p.tier?{input:p.above[0],output:p.above[1],cached:p.above[2]??p.above[0]}:{input:p.input,output:p.output,cached:p.cached??p.input};}
  function outputCap(model,cap){return /^(gpt-6|claude-)/.test(model)?Math.max(4096,cap):cap;}
  function utf8(s){return typeof Buffer!=='undefined'?Buffer.byteLength(s,'utf8'):new TextEncoder().encode(s).length;}
  function estimate(model,messages,cap){
    model=canonical(model);var p=profiles[model];if(!p)return {bounded:false,model:model,usd:Infinity};
    // A successful response cannot bill more than its context window in input.
    // UTF-8 bytes plus per-message framing conservatively bound text tokens;
    // image inputs reserve the entire context rather than guessing image tokens.
    var serialized=JSON.stringify(messages||[]),multimodal=/"(?:image_url|image|input_image|inlineData)"/.test(serialized);
    var input=multimodal?p.context:Math.min(p.context,utf8(serialized)+256*((messages||[]).length+1));
    var r=rates(model,input),out=Math.ceil(Number(cap)||0);
    if(out<=0||out>128000)return{bounded:false,model:model,usd:Infinity};
    // Grok reports reasoning outside the visible cap. Reserve its full context
    // allowance rather than pretending a multiplier bounds hidden reasoning.
    var billedOut=p.provider==='grok'?p.context:out;
    return{bounded:true,model:model,inputTokens:input,outputTokens:billedOut,usd:(input*r.input*(p.provider==='anthropic'?2:p.provider==='openai'?1.25:1)+billedOut*r.output)/1e6};
  }
  function plan(model,messages,cap,context){
    model=canonical(model);var backup=backupFor(model,context),primary=estimate(model,messages,cap),backupCap=outputCap(backup,Number(cap)||0);
    var secondary=backup?estimate(backup,messages,backupCap):{bounded:false,usd:Infinity};
    return{primary:model,backup:backup,primaryCap:Number(cap),backupCap:backupCap,primaryEstimate:primary,backupEstimate:secondary,
      bounded:primary.bounded&&secondary.bounded,reservedUsd:primary.usd+secondary.usd};
  }
  var policy={profiles:profiles,canonical:canonical,backupFor:backupFor,rates:rates,outputCap:outputCap,estimate:estimate,plan:plan};
  if(typeof module!=='undefined'&&module.exports)module.exports=policy;
  else root.SB_MODEL_FALLBACK=policy;
})(typeof globalThis!=='undefined'?globalThis:this);
