// All production code; provider responses and account IO are local fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),F=require('../api/_model-fallback.js'),P=F.policy;
let groups=0;const pass=x=>{groups++;console.log('PASS '+x);};
const env={OPENAI_API_KEY:'fixture-openai',ANTHROPIC_API_KEY:'fixture-anthropic',XAI_API_KEY:'fixture-grok',MISTRAL_API_KEY:'fixture-mistral',SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',CPLUS_EDITOR_PRICE_FORTUNES:'1',CPLUS_EDITOR_DAILY_CAP:'10'};
const messages=[{role:'system',content:'Keep the scene, canon, C+, picturability, admiration, and Fate beats intact.'},{role:'user',content:'Write the next scene in the same voice.'}];
const reply=(model,content='A complete local scene.',status=200,extra={})=>new Response(JSON.stringify(model.startsWith('claude-')?{model,content:[{type:'text',text:content}],stop_reason:'end_turn',usage:{input_tokens:10,output_tokens:20},...extra}:{model,choices:[{message:{content},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:20,total_tokens:30},...extra}),{status});
const invoke=async(primary,responses,opts={})=>{const calls=[];const provider=P.profiles[primary].provider,url={openai:'https://api.openai.com/v1/chat/completions',grok:'https://api.x.ai/v1/chat/completions',anthropic:'https://api.anthropic.com/v1/messages',mistral:'https://api.mistral.ai/v1/chat/completions'}[provider];
 const body=provider==='anthropic'?{model:primary,max_tokens:6000,system:messages[0].content,messages:[messages[1]]}:{model:primary,messages,max_tokens:6000};
 const response=await F.fetchWithModelFallback(url,{method:'POST',body:JSON.stringify(body)}, {env,log:{warn(){}},...opts,fetch:async(u,i)=>{calls.push({url:u,body:JSON.parse(i.body)});const next=responses.shift();assert.ok(next,'unexpected third provider call');if(next instanceof Error)throw next;return next;}});
 return{calls,response,body:await response.json()};};
for(const [primary,backup,operation]of [['gpt-6-luna','claude-haiku-5-5'],['gpt-6.1-sol','claude-sonnet-5-5','story-spine'],['grok-4.3','mistral-large-4'],['claude-haiku-5-5','gpt-6-luna'],['claude-sonnet-5-5','gpt-6.1-sol','story-spine']]){
 const r=await invoke(primary,[reply(primary,'',503,{usage:null}),reply(backup)],{operation});assert.equal(r.calls.length,2);assert.equal(r.body._fallback.servedModel,backup);assert.equal(r.body._fallback.used,true);assert.equal(r.body._fallback.attempts[0].reason,'http_503');assert.ok(r.body._fallback.heldUsd>0);assert.ok(r.body._fallback.knownCostUsd>0);
 const received=r.calls[1].body;
 if(backup.startsWith('claude-')){assert.ok(received.system.includes(messages[0].content));assert.equal(received.messages[0].content,messages[1].content);assert.equal(received.temperature,undefined);assert.equal(received.output_config.effort,'medium');}
 else assert.deepEqual(received.messages,messages);
}
pass('all three approved pairs and reverse Anthropic routes cross real provider adapters with the original instructions intact');
for(const [label,response]of [['rate limit',reply('gpt-6-luna','',429)],['refusal',reply('gpt-6-luna','',200,{choices:[{message:{content:'',refusal:'provider declined'},finish_reason:'stop'}]})],['empty',reply('gpt-6-luna','')],['truncated',reply('gpt-6-luna','partial',200,{choices:[{message:{content:'partial'},finish_reason:'length'}]})],['malformed',new Response('not JSON',{status:200})],['transport',new Error('injected network failure')]]){
 const r=await invoke('gpt-6-luna',[response,reply('claude-haiku-5-5')]);assert.equal(r.calls.length,2,label);assert.equal(r.response.status,200);assert.equal(r.body._fallback.servedModel,'claude-haiku-5-5');
 if(label==='rate limit')assert.equal(r.body._fallback.heldUsd,0);
}
pass('outages, rate limits, refusal, empty/malformed/truncated replies and transport failures trigger exactly one backup');
const healthy=await invoke('gpt-6-luna',[reply('gpt-6-luna')]);assert.equal(healthy.calls.length,1);assert.equal(healthy.body._fallback.used,false);assert.equal(healthy.body._fallback.heldUsd,0);
const exhausted=await invoke('gpt-6-luna',[reply('gpt-6-luna','partial',503),reply('claude-haiku-5-5','also partial',503)]);assert.equal(exhausted.calls.length,2);assert.equal(exhausted.response.status,503);assert.equal(exhausted.body.choices,undefined);assert.equal(exhausted.body._fallback.servedModel,null);
const narration=await invoke('gpt-6-luna',[reply('gpt-6-luna',"I can't help staring at his hands.")]);assert.equal(narration.calls.length,1);assert.equal(narration.response.status,200);
const effort=F.backupRequest(F.canonicalRequest('https://api.openai.com/v1/chat/completions',{model:'gpt-6.1-sol',messages,max_tokens:14000,reasoning_effort:'xhigh'}),'claude-sonnet-5-5',14000);assert.equal(effort.body.output_config.effort,'high');
pass('healthy calls use one model; two failed attempts return no publishable partial text and never recurse');
let calls=0;const denied=await F.fetchWithModelFallback('https://api.openai.com/v1/chat/completions',{body:JSON.stringify({model:'gpt-6-luna',messages,max_tokens:6000})},{env,maxCostUsd:0.000001,fetch:async()=>{calls++;throw Error('must not dispatch');}});assert.equal(denied.status,402);assert.equal(calls,0);
const low=P.plan('gpt-6-luna',[{role:'user',content:'a'.repeat(90000)}],6000),high=P.plan('gpt-6-luna',[{role:'user',content:'a'.repeat(110000)}],6000);assert.ok(high.backupEstimate.usd>low.backupEstimate.usd*3);assert.ok(high.reservedUsd>high.primaryEstimate.usd+0.05);
pass('both attempts are priced before dispatch, including Haiku’s long-input tier; an insufficient cap sends nothing');
let sent=0;const timed=await F.fetchWithModelFallback('https://api.openai.com/v1/chat/completions',{body:JSON.stringify({model:'gpt-6-luna',messages,max_tokens:6000})},{env,timeoutMs:5,log:{warn(){}},fetch:async(u,i)=>{sent++;if(sent===1)return new Promise((_,reject)=>i.signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}));return reply('claude-haiku-5-5');}});assert.equal(sent,2);assert.equal((await timed.json())._fallback.attempts[0].reason,'timeout');
pass('a timed-out primary is aborted before backup starts');
const jsonBody={model:'gpt-6-luna',messages,max_tokens:6000,response_format:{type:'json_schema',json_schema:{name:'scene',schema:{type:'object',properties:{beat:{type:'string'}},required:['beat'],additionalProperties:false}}}};
const schema=P.plan(jsonBody.model,messages,6000),adapted=F.backupRequest(F.canonicalRequest('https://api.openai.com/v1/chat/completions',jsonBody),schema.backup,schema.backupCap);assert.deepEqual(adapted.body.output_config.format.schema,jsonBody.response_format.json_schema.schema);
const vision=[{role:'user',content:[{type:'text',text:'Preserve this image.'},{type:'image_url',image_url:{url:'data:image/png;base64,YWJj'}}]}];const visionAdapt=F.backupRequest(F.canonicalRequest('https://api.openai.com/v1/chat/completions',{...jsonBody,messages:vision}),'claude-haiku-5-5',6000);assert.equal(visionAdapt.body.messages[0].content[1].source.data,'YWJj');assert.ok(P.plan('gpt-6-luna',vision,6000).bounded);
pass('structured-output schemas and image blocks survive provider translation without truncating context');
// Real protected handler: an unauthenticated caller can never reach either provider.
const auth=require('../api/_request-auth.js'),oldAuth=auth.requireModelAccess,oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY,oldBackup=process.env.ANTHROPIC_API_KEY;
process.env.OPENAI_API_KEY='fixture-openai';process.env.ANTHROPIC_API_KEY='fixture-anthropic';
auth.requireModelAccess=async(req,res)=>{if(req.headers.authorization!=='Bearer fixture'){res.status(401).json({error:'authentication_required'});return null;}return{id:'fixture'};};
const proxy=require('../api/chatgpt-proxy.js');const response=()=>({code:0,result:null,setHeader(){},status(n){this.code=n;return this;},json(x){this.result=x;return this;},end(){}});
try{
 calls=0;globalThis.fetch=async()=>{calls++;return calls===1?reply('gpt-6-luna','',429):reply('claude-haiku-5-5');};
 const rejected=response();await proxy({method:'POST',headers:{},body:{model:'gpt-6-luna',role:'PRIMARY_AUTHOR',messages,max_tokens:6000}},rejected);assert.equal(rejected.code,401);assert.equal(calls,0);
 const accepted=response();await proxy({method:'POST',headers:{authorization:'Bearer fixture'},body:{model:'gpt-6-luna',role:'PRIMARY_AUTHOR',messages,max_tokens:6000}},accepted);assert.equal(accepted.code,200);assert.equal(calls,2);assert.equal(accepted.result.model,'claude-haiku-5-5');assert.equal(accepted.result._orchestration.model,'claude-haiku-5-5');assert.equal(accepted.result.content,'A complete local scene.');assert.equal(accepted.result._fallback.used,true);
 pass('the actual protected proxy returns the backup through its normal consumer shape; authentication failure never dispatches');
 const grokHandler=(await import('../api/proxy.js')).default;
 const oldGrok=process.env.XAI_API_KEY,oldMistral=process.env.MISTRAL_API_KEY;
 process.env.XAI_API_KEY='fixture-grok';process.env.MISTRAL_API_KEY='fixture-mistral';
 try{
  let upstream=0;globalThis.fetch=async(url,init)=>{upstream++;if(upstream===1){assert.equal(url,'https://api.x.ai/v1/chat/completions');return new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(Error('injected timeout')),{once:true}));}assert.equal(url,'https://api.mistral.ai/v1/chat/completions');return reply('mistral-large-4');};
  const res=response();await grokHandler({method:'POST',headers:{authorization:'Bearer fixture'},body:{role:'INTIMACY_SPECIALIST',messages,max_tokens:400,__xaiTimeoutMs:5}},res);
  assert.equal(res.code,200,JSON.stringify(res.result));assert.equal(upstream,2);assert.equal(res.result._fallback.attempts[0].reason,'timeout');assert.equal(res.result._orchestration.model,'mistral-large-4');
 }finally{if(oldGrok===undefined)delete process.env.XAI_API_KEY;else process.env.XAI_API_KEY=oldGrok;if(oldMistral===undefined)delete process.env.MISTRAL_API_KEY;else process.env.MISTRAL_API_KEY=oldMistral;}
 pass('the real Grok handler’s primary timeout leaves the backup alive and records Mistral as the serving model');

}finally{auth.requireModelAccess=oldAuth;globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldBackup===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=oldBackup;}
// Actual editor factory, including its admission, single charge, settlement and replay.
const {createHandler}=await import('../api/cplus-editor.js');
for(const contentClass of ['general','explicit']){
 let charges=0,reservations=0,network=0,row=null,storedAdmit=null;
 const db={auth:{getUser:async()=>({data:{user:{id:'account'}},error:null})},rpc:async(name,args)=>{
  if(name==='cplus_editor_admit'){reservations++;storedAdmit=args;if(row)return{data:{outcome:'replay',existing_status:row.status,existing_reply:row.reply,existing_truncated:row.truncated,existing_cost_usd:row.cost_usd,existing_charged:1},error:null};return{data:{outcome:'admitted',entitlement:'authoritative'},error:null};}
  assert.equal(name,'consume_fortunes_v3');charges++;return{data:{ok:true},error:null};
 },from:()=>({update:value=>({eq:async()=>{row=value;return{error:null};}})})};
 const handler=createHandler({env,createClient:()=>db,log:{log(){},warn(){},error(){}},fetch:async(u,i)=>{network++;const b=JSON.parse(i.body);if(network===1)return reply(b.model,'',429);assert.equal(b.model,contentClass==='general'?'claude-haiku-5-5':'mistral-large-4');return reply(b.model,'{"decisions":[]}');}});
 const req={method:'POST',headers:{authorization:'Bearer fixture',origin:'https://www.storybound.love'},body:{operationId:'cplus-editor:account:book:scene1:rev:craft',storyId:'book',scene:1,revisionId:'rev',contentClass,system:messages[0].content,user:messages[1].content,obligations:[],maxTokens:2400}};
 const res=response();await handler(req,res);assert.equal(res.code,200,JSON.stringify(res.result));assert.equal(network,2);assert.equal(charges,1);assert.equal(reservations,1);assert.equal(res.result.model,contentClass==='general'?'claude-haiku-5-5':'mistral-large-4');assert.equal(row.status,'settled');assert.equal(row.retained_usd,0);assert.ok(storedAdmit.p_reserved_usd>row.cost_usd);
 const again=response();await handler(req,again);assert.equal(again.code,200);assert.equal(again.result.replayed,true);assert.equal(network,2);assert.equal(charges,1);
}
pass('actual craft/picturability editor paths reserve both attempts, charge once, settle the backup, and replay without another dispatch or debit');
const missing={_fallback:{attempts:[{status:503,usage:null,knownCostUsd:null,heldUsd:0.01}]},usage:{prompt_tokens:10,completion_tokens:20}};
assert.equal(F.primaryUsage(missing),null);
assert.equal(F.primaryUsage({_fallback:{attempts:[{status:429,usage:null,knownCostUsd:0,heldUsd:0}]}}).prompt_tokens,0);
const {makeSettlement}=await import('../_nf_cost_settlement.mjs');const ledger=makeSettlement(1);const row=ledger.record({stage:'author',model:'gpt-6-luna',estimate:0.1,fallback:{servedModel:'claude-haiku-5-5',attempts:[{model:'gpt-6-luna',knownCostUsd:null,heldUsd:0.03,reason:'timeout'},{model:'claude-haiku-5-5',knownCostUsd:0.01,heldUsd:0,usage:{input_tokens:100,output_tokens:100}}]}});
assert.equal(row.usd,0.01);assert.equal(row.heldUsd,0.03);assert.equal(ledger.totals().settled,0.01);assert.equal(ledger.totals().heldUnknown,0.03);assert.equal(ledger.totals().remaining,0.96);
pass('a backup receipt cannot release the primary quota hold; the real run ledger retains unknown exposure separately from settled backup cost');
console.log(`${groups}/${groups} fallback groups passed; no live account, wallet or provider contacted.`);
