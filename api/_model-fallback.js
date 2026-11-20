'use strict';
// Invoked only after each handler's authentication, entitlement and admission.
// This adapter never calls another application endpoint or changes story/wallet state.
const policy=require('../public/model-fallback-policy.js');
const URLS={openai:'https://api.openai.com/v1/chat/completions',anthropic:'https://api.anthropic.com/v1/messages',grok:'https://api.x.ai/v1/chat/completions',mistral:'https://api.mistral.ai/v1/chat/completions'};
const KEYS={openai:'OPENAI_API_KEY',anthropic:'ANTHROPIC_API_KEY',grok:'XAI_API_KEY',mistral:'MISTRAL_API_KEY'};
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function providerOf(url){if(url.includes('anthropic.com'))return'anthropic';if(url.includes('googleapis.com'))return'gemini';if(url.includes('x.ai'))return'grok';if(url.includes('mistral.ai'))return'mistral';if(url.includes('deepseek.com'))return'deepseek';return'openai';}
function text(blocks){return typeof blocks==='string'?blocks:(Array.isArray(blocks)?blocks.filter(x=>x&&['text','output_text'].includes(x.type)).map(x=>x.text||'').join(''):'');}
function imageToAnthropic(block){
 const u=typeof block.image_url==='string'?block.image_url:block.image_url?.url;
 const m=/^data:([^;]+);base64,([\s\S]+)$/.exec(u||'');
 return{type:'image',source:m?{type:'base64',media_type:m[1],data:m[2]}:{type:'url',url:u}};
}
function openAIContent(content){
 if(typeof content==='string')return content;
 if(!Array.isArray(content))throw new Error('unsupported_message_content');
 return content.map(b=>{
  if(b.type==='text')return{type:'text',text:b.text};
  if(b.type==='image_url')return b;
  if(b.type==='image')return{type:'image_url',image_url:{url:b.source?.type==='base64'?`data:${b.source.media_type};base64,${b.source.data}`:b.source?.url}};
  throw new Error('unsupported_message_block:'+b.type);
 });
}
function canonicalRequest(url,body){
 const provider=providerOf(url);let messages;
 if(provider==='anthropic'){
  messages=[];if(body.system)messages.push({role:'system',content:text(body.system)});
  for(const m of body.messages||[])messages.push({...m,content:openAIContent(m.content)});
 }else if(provider==='gemini'){
  messages=[];if(body.systemInstruction)messages.push({role:'system',content:(body.systemInstruction.parts||[]).map(x=>x.text||'').join('\n')});
  for(const m of body.contents||[])messages.push({role:m.role==='model'?'assistant':'user',content:(m.parts||[]).map(x=>x.inlineData?{type:'image_url',image_url:{url:`data:${x.inlineData.mimeType};base64,${x.inlineData.data}`}}:{type:'text',text:x.text||''})});
 }else messages=body.messages||[];
 return{provider,model:body.model||decodeURIComponent(/\/models\/([^:]+)/.exec(url)?.[1]||''),messages,
  cap:Number(body.max_completion_tokens||body.max_tokens||body.generationConfig?.maxOutputTokens)||1500,
  format:body.response_format||(body.output_config?.format?{type:'json_schema',json_schema:{schema:body.output_config.format.schema}}:null),effort:body.reasoning_effort||body.output_config?.effort||'medium'};
}
function backupRequest(c,model,cap){
 const provider=policy.profiles[model]?.provider;if(!URLS[provider])throw new Error('backup_provider_unconfigured');
 let body={model};
 if(provider==='anthropic'){
  body.max_tokens=cap;body.output_config={effort:cap<6000?'low':(['low','medium','high'].includes(c.effort)?c.effort:'high')};
  const system=c.messages.filter(m=>m.role==='system'||m.role==='developer').map(m=>text(m.content));
  body.messages=c.messages.filter(m=>m.role!=='system'&&m.role!=='developer').map(m=>({role:m.role,content:typeof m.content==='string'?m.content:m.content.map(b=>b.type==='image_url'?imageToAnthropic(b):b)}));
  if(c.format?.type==='json_schema')body.output_config.format={type:'json_schema',schema:c.format.json_schema.schema};
  else if(c.format?.type==='json_object')system.push('Return exactly one valid JSON object, with no Markdown fences or commentary.');
  if(system.length)body.system=system.join('\n\n');
 }else{
  body.messages=c.messages;body[/^gpt-6/.test(model)?'max_completion_tokens':'max_tokens']=cap;
  if(/^gpt-6/.test(model))body.reasoning_effort=cap<6000?'low':c.effort;
  if(c.format)body.response_format=c.format;
 }
 return{provider,url:URLS[provider],body};
}
function normalize(data,provider){
 if(provider==='anthropic'){
  const u=data?.usage;return{model:data?.model,content:text(data?.content),stop:data?.stop_reason,
   refusal:data?.stop_reason==='refusal',rawUsage:u,usage:u&&finite(u.input_tokens)&&finite(u.output_tokens)?{prompt_tokens:u.input_tokens+(u.cache_read_input_tokens||0)+(u.cache_creation_input_tokens||0),completion_tokens:u.output_tokens,total_tokens:u.input_tokens+(u.cache_read_input_tokens||0)+(u.cache_creation_input_tokens||0)+u.output_tokens}:null};
 }
 if(provider==='gemini'){
  const c=data?.candidates?.[0],u=data?.usageMetadata;return{model:data?.modelVersion,content:(c?.content?.parts||[]).filter(x=>!x.thought).map(x=>x.text||'').join(''),stop:c?.finishReason,refusal:!!data?.promptFeedback?.blockReason||['SAFETY','RECITATION','PROHIBITED_CONTENT'].includes(c?.finishReason),usage:u&&finite(u.promptTokenCount)&&finite(u.candidatesTokenCount)?{prompt_tokens:u.promptTokenCount,completion_tokens:u.candidatesTokenCount,total_tokens:u.totalTokenCount||u.promptTokenCount+u.candidatesTokenCount}:null};
 }
 const c=data?.choices?.[0];return{model:data?.model,content:c?.message?.content||'',stop:c?.finish_reason,refusal:!!c?.message?.refusal||c?.finish_reason==='content_filter',usage:data?.usage||null};
}
function failureFor(status,n,format){
 if(status<200||status>=300)return'http_'+status;
 if(n.refusal)return'refusal';
 if(['length','max_tokens','MAX_TOKENS'].includes(n.stop))return'truncated';
 if(!text(n.content).trim())return'empty';
 if(/^\s*(?:I(?:’|')m sorry[^\n]{0,60}[,.]?\s*)?I (?:cannot|can(?:’|')t|am unable to) (?:assist(?: you)? with|help(?: you)? (?:with|write|generate|create|produce)|fulfil(?:l)? (?:that|this)|comply with|provide that|generate that)/i.test(text(n.content)))return'refusal';
 if(format){try{const j=JSON.parse(text(n.content));if(format.type==='json_object'&&(!j||typeof j!=='object'||Array.isArray(j)))return'invalid_json';}catch{return'invalid_json';}}
 return null;
}
function receipt(model,n,status,reserve){
 const u=n.usage;let input=u?.prompt_tokens,completion=u?.completion_tokens,total=u?.total_tokens;
 if(!finite(input)||!finite(completion)||finite(total)&&total<input+completion){
  const noGeneration=[400,401,403,404,413,422,429].includes(status);
  return{usage:u||null,knownCostUsd:noGeneration?0:null,heldUsd:noGeneration?0:reserve};
 }
 const reasoning=u.completion_tokens_details?.reasoning_tokens;
 const output=finite(total)?Math.max(completion,total-input):completion+(policy.profiles[model]?.provider==='grok'&&finite(reasoning)?reasoning:0);
 const r=policy.rates(model,input);let inputUsd=r?input*r.input/1e6:null;
 if(r&&n.rawUsage){
  const raw=n.rawUsage,read=raw.cache_read_input_tokens||0,write=raw.cache_creation_input_tokens||0;
  const oneHour=raw.cache_creation?.ephemeral_1h_input_tokens||0;
  inputUsd=((input-read-write)*r.input+read*r.input*0.1+(write-oneHour)*r.input*1.25+oneHour*r.input*2)/1e6;
 }
 if(r&&u.prompt_tokens_details){
  const read=u.prompt_tokens_details.cached_tokens||0,write=u.prompt_tokens_details.cache_write_tokens||0;
  if(!finite(read)||!finite(write)||read+write>input)return{usage:u,knownCostUsd:null,heldUsd:reserve};
  inputUsd=((input-read-write)*r.input+read*r.cached+write*r.input*1.25)/1e6;
 }
 if(finite(u.cost_in_usd_ticks)&&u.cost_in_usd_ticks>0)return{usage:u,knownCostUsd:u.cost_in_usd_ticks*1e-10,heldUsd:0};
 return{usage:u,knownCostUsd:r?inputUsd+output*r.output/1e6:null,heldUsd:r?0:reserve};
}
function envelope(n,provider,meta,originalData){
 if(provider==='anthropic')return{...originalData,model:n.model,content:[{type:'text',text:text(n.content)}],stop_reason:n.stop==='stop'?'end_turn':n.stop,usage:n.usage?{input_tokens:n.usage.prompt_tokens,output_tokens:n.usage.completion_tokens}:null,_fallback:meta};
 if(provider==='gemini')return{...originalData,modelVersion:n.model,candidates:[{content:{parts:[{text:text(n.content)}]},finishReason:n.stop==='stop'?'STOP':n.stop}],usageMetadata:n.usage?{promptTokenCount:n.usage.prompt_tokens,candidatesTokenCount:n.usage.completion_tokens,totalTokenCount:n.usage.total_tokens}:null,_fallback:meta};
 return{...originalData,model:n.model,choices:[{message:{role:'assistant',content:text(n.content),refusal:n.refusal?'refused':null},finish_reason:['end_turn','STOP'].includes(n.stop)?'stop':n.stop}],usage:n.usage,_fallback:meta};
}
async function fetchWithModelFallback(url,init,options={}){
 const env=options.env||process.env,fetchImpl=options.fetch||globalThis.fetch,log=options.log||console;
 if(options.noFallback===true||env.MODEL_FALLBACK_DISABLED==='1')return fetchImpl(url,init);
 const original=JSON.parse(init.body),c=canonicalRequest(String(url),original);
 const context={operation:options.operation,explicit:options.explicit===true};
 const plan=policy.plan(c.model,c.messages,c.cap,context);
 const enabled=options.noFallback!==true&&env.MODEL_FALLBACK_DISABLED!=='1';
 // Honor an already admitted hard cap. Client values may tighten, never raise it.
 const maxUsd=options.maxCostUsd==null?Infinity:Number(options.maxCostUsd);
 if(enabled&&(Number.isNaN(maxUsd)||maxUsd<0||!plan.bounded||!Number.isFinite(plan.reservedUsd)||plan.reservedUsd>maxUsd))return new Response(JSON.stringify({error:'fallback_budget_refused',_upstreamDispatched:false}),{status:402,headers:{'Content-Type':'application/json'}});
 const attempts=[];let data=null,n=null,status=0,headers=new Headers(),lastReason=null;
 const timeoutMs=options.timeoutMs||(c.cap<=3000?18000:Math.max(30000,Math.min(120000,Math.ceil(c.cap/90*1000)+20000)));
 const dispatch=async(provider,model,target,opts,reserve)=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let response,parsed=null,reason=null,sent=false,t0=Date.now();
  try{
   // Explicit cancellation never starts a new paid attempt. An attempt timeout
   // is separate and may recover through the backup.
   if(init.signal?.aborted)throw new Error('caller_cancelled');
   const signal=init.signal?AbortSignal.any([controller.signal,init.signal]):controller.signal;
   sent=true;response=await fetchImpl(target,{...opts,signal});status=response.status;headers=new Headers(response.headers||{});
   parsed=await (typeof response.json==='function'?response.json():response.text().then(JSON.parse)).catch(()=>null);n=normalize(parsed,provider);reason=failureFor(status,n,c.format);
  }catch(e){status=init.signal?.aborted?499:502;n={content:'',usage:null};reason=init.signal?.aborted?'caller_cancelled':controller.signal.aborted?'timeout':'transport_failure';}
  finally{clearTimeout(timer);}
  const priced=sent?receipt(model,n,status,reserve):{usage:null,knownCostUsd:0,heldUsd:0},attempt={provider,model,status,reason,dispatched:sent,latencyMs:Date.now()-t0,...priced};
  attempts.push(attempt);data=parsed;lastReason=reason;
  return !reason;
 };
 const ok=await dispatch(c.provider,policy.canonical(c.model),url,init,plan.primaryEstimate.usd);
 if(!ok&&enabled&&lastReason!=='caller_cancelled'&&!init.signal?.aborted){
  let b;
  try{b=backupRequest(c,plan.backup,plan.backupCap);}catch(e){lastReason=e.message;}
  const key=b&&(env[KEYS[b.provider]]||(b.provider==='grok'?env.GROK_API_KEY:null));
  const primaryExposure=(attempts[0].knownCostUsd||0)+attempts[0].heldUsd;
  if(primaryExposure+plan.backupEstimate.usd>Math.min(maxUsd,plan.reservedUsd)+1e-12){b=null;lastReason='fallback_budget_exhausted';}
  if(b&&key){
   log.warn('[MODEL:FALLBACK] '+c.model+' -> '+plan.backup+' ('+lastReason+')');
   const h={'Content-Type':'application/json'};
   if(b.provider==='anthropic'){h['x-api-key']=key;h['anthropic-version']='2023-06-01';}else h.Authorization='Bearer '+key;
   await dispatch(b.provider,plan.backup,b.url,{method:'POST',headers:h,body:JSON.stringify(b.body)},plan.backupEstimate.usd);
  }else lastReason=lastReason||'backup_not_configured';
 }
 const succeeded=!lastReason,meta={primary:policy.canonical(c.model),backup:plan.backup,used:attempts.length===2,servedModel:succeeded?(n.model||attempts.at(-1).model):null,
  attempts,reservedUsd:plan.reservedUsd,knownCostUsd:attempts.reduce((v,a)=>v+(a.knownCostUsd||0),0),heldUsd:attempts.reduce((v,a)=>v+a.heldUsd,0),reason:lastReason};
 // Failed/partial content is never returned as a usable success.
 const body=succeeded?(attempts.length===1?{...data,_fallback:meta}:envelope({...n,model:n.model||attempts.at(-1).model},c.provider,meta,{})):{error:'model_attempts_exhausted',_fallback:meta};
 return new Response(JSON.stringify(body),{status:succeeded?200:(status>=400?status:502),headers:{'Content-Type':'application/json',...(headers.get('request-id')?{'request-id':headers.get('request-id')}:{} )}});
}
function primaryUsage(data){
 const a=data?._fallback?.attempts?.[0];
 if(!a)return data?.usage||null;
 if(a.usage)return a.usage;
 if(a.knownCostUsd===0&&a.heldUsd===0)return{prompt_tokens:0,completion_tokens:0,total_tokens:0};
 return null;
}
function configuredPairs(env=process.env){return{enabled:env.MODEL_FALLBACK_DISABLED!=='1',sol:{primary:'gpt-6.1-sol',backup:'claude-sonnet-5-5',ready:!!env.OPENAI_API_KEY&&!!env.ANTHROPIC_API_KEY},luna:{primary:'gpt-6-luna',backup:'claude-haiku-5-5',ready:!!env.OPENAI_API_KEY&&!!env.ANTHROPIC_API_KEY},grok:{primary:'grok-4.3',backup:'mistral-large-4',ready:!!(env.XAI_API_KEY||env.GROK_API_KEY)&&!!env.MISTRAL_API_KEY}};}
module.exports={fetchWithModelFallback,configuredPairs,primaryUsage,policy,canonicalRequest,backupRequest,normalize,failureFor,receipt};
