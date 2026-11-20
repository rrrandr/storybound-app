// Actual browser bundle -> authenticated dispatch -> real OpenAI proxy -> local provider stub.
// No external browser request or real provider call is permitted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const {chromium}=require('playwright-core');
const auth=require('../api/_request-auth.js'),oldAdmission=auth.requireModelAccess;
auth.requireModelAccess=async(req,res)=>{if(req.headers.authorization!=='Bearer local-fixture'){res.status(401).json({error:'authentication_required'});return null;}return{id:'local-fixture'};};
const oldKey=process.env.OPENAI_API_KEY,oldFetch=globalThis.fetch;
process.env.OPENAI_API_KEY='local-no-provider-fixture';
const proxy=require('../api/chatgpt-proxy.js');
const wire=[],upstream=[],external=[];let mode='ok',groups=0,browser;
const pass=s=>{groups++;console.log('PASS '+s);};
globalThis.fetch=async(url,init)=>{
 assert.equal(url,'https://api.openai.com/v1/chat/completions','only the intercepted provider destination is allowed');
 const body=JSON.parse(init.body);upstream.push(body);
 if(mode==='error')return{ok:false,status:502,text:async()=>'{"error":{"message":"local injected failure"}}'};
 const content=body.operation==='ordinary-prose'?'Offline fixture prose.':'{"canon":"local fixture"}';
 return{ok:true,status:200,text:async()=>JSON.stringify({model:body.model,choices:[{message:{content,refusal:mode==='refusal'?'local decline':null},finish_reason:mode==='length'?'length':'stop'}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}})};
};
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/')){
  let raw='';for await(const c of req)raw+=c;
  const body=raw?JSON.parse(raw):{};wire.push({url:pathname,body,authorization:req.headers.authorization});
  res.setHeader('Content-Type','application/json');
  if(pathname==='/api/chatgpt-proxy'){
   const adapter={setHeader:(k,v)=>res.setHeader(k,v),status(n){res.statusCode=n;return this;},json(x){res.end(JSON.stringify(x));return this;},end(){res.end();}};
   return proxy({method:req.method,headers:req.headers,body},adapter);
  }
  // Explicit routing is observed locally; it never reaches a live Grok endpoint.
  if(pathname==='/api/proxy'){res.end('{"choices":[{"message":{"content":"explicit local fixture"}}]}');return;}
  res.writeHead(503);res.end('{}');return;
 }
 const file=path.resolve(root+'/public','.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+'/public/')){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{
 browser=await chromium.launch({headless:true});const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){external.push(u.origin);return route.abort();}return route.continue();});
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.state&&window.SB_MODEL_ROUTING&&window._setupMistralPost&&window._callTieredProvider);
 await page.evaluate(origin=>{delete window._sbRunConfig;delete state._sbRunConfig;state.fateMode='famous_fate';state.storyId='offline-famous-fixture';window.fetch=SB_REQUEST_AUTH.authenticatedFetch(window.fetch,async()=>({access_token:'local-fixture'}),()=>state.storyId,origin);},origin);
 const app=fs.readFileSync(root+'/public/app.js','utf8'),start=app.indexOf('  async function _ffGrokJSON('),end=app.indexOf('  // ── SHARED CANON CACHE',start);
 assert.ok(start>0&&end>start);await page.addScriptTag({content:app.slice(start,end)+'\nwindow.__localFFJSON=_ffGrokJSON;'});
 let before=wire.length;
 const canon=await page.evaluate(()=>window.__localFFJSON('Extract fictional canon as JSON.','Return a local fixture.',{maxTokens:200}));
 assert.equal(canon.canon,'local fixture');assert.equal(wire.length,before+1);assert.equal(wire.at(-1).body.model,'gpt-6-luna');assert.equal(wire.at(-1).body.response_format.type,'json_object');assert.equal(upstream.at(-1).max_completion_tokens,10000);assert.equal(upstream.at(-1).max_tokens,undefined);assert.equal(wire.at(-1).authorization,'Bearer local-fixture');
 pass('actual FF canon helper, without run config, reaches Luna through auth and the real proxy');
 const setup=await page.evaluate(async()=>{const r=await _setupMistralPost({messages:[{role:'user',content:'Return a JSON body bible.'}],max_tokens:600});return r.json();});
 assert.equal(setup._orchestration.model,'gpt-6-luna');assert.equal(wire.at(-1).url,'/api/chatgpt-proxy');assert.equal(upstream.at(-1).reasoning_effort,'medium');
 pass('actual setup adapter preserves the served model and reasoning headroom');
 before=wire.length;
 const tier=await page.evaluate(()=>_callTieredProvider('body-bible',[{role:'user',content:'Return a fictional appearance.'}],{max_tokens:800}));
 assert.equal(tier.provider,'openai');assert.equal(tier.attempt,1);assert.equal(wire.length,before+1);assert.equal(wire.at(-1).body.model,'gpt-6-luna');
 pass('actual tier policy uses one Luna attempt instead of the Mistral/Grok/mini cascade');
 // Exercise each legacy transport through the installed production wrapper, not a
 // hand-built imitation of the router's result. The server observes the final POST.
 for(const [url,extra] of [['/api/proxy',{preferredModel:'grok-4-1-fast-reasoning'}],['/api/mistral-proxy',{model:'ministral-8b-2512'}],['/api/anthropic-proxy',{model:'claude-haiku-5-5',system:'Keep this system instruction.'}],['/api/chatgpt-proxy',{model:'gpt-6.1-sol',operation:'aplot-initial'}],['/api/chatgpt-proxy',{model:'gpt-6.1-sol',operation:'rplot-initial'}]]){
  const reply=await page.evaluate(async({url,extra})=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...extra,messages:[{role:'user',content:'Return ordinary fictional story JSON.'}],role:'STRUCTURE_GENERATOR',max_tokens:32000,response_format:{type:'json_object'}})});return{status:r.status,data:await r.json()};},{url,extra});
  assert.equal(reply.status,200);assert.equal(wire.at(-1).url,'/api/chatgpt-proxy');assert.equal(upstream.at(-1).model,'gpt-6-luna');assert.equal(upstream.at(-1).max_completion_tokens,32000);assert.equal(upstream.at(-1).response_format.type,'json_object');assert.equal(reply.data.choices[0].message.content,reply.data.content);
  if(extra.system)assert.equal(upstream.at(-1).messages[0].content,extra.system);
 }
 pass('legacy transports and both plot operations arrive as Luna with JSON, 32k allowance and old consumer envelope intact');
 for(const content of ['scene-structure planner for the OPENING scene','Define a narrative skeleton for the next scene:','SCENE CONTINUATION (HARD)','INTIMACY SPECIALIST is mentioned in doctrine, not requested']){
  await page.evaluate(async content=>fetch('/api/proxy',{method:'POST',body:JSON.stringify({messages:[{role:'user',content}],role:'SPECIALIST_RENDERER',preferredModel:'grok-4.3',max_tokens:16000})}),content);
  assert.equal(wire.at(-1).body.model,'gpt-6-luna');
 }
 await page.evaluate(()=>fetch('/api/chatgpt-proxy',{method:'POST',body:JSON.stringify({messages:[{role:'user',content:'CONTINUITY ARCHITECT — GRAVITATIONAL STRUCTURE'}],role:'PRIMARY_AUTHOR',operation:'story-spine',model:'gpt-6-luna',max_tokens:14250})}));
 assert.equal(upstream.at(-1).model,'gpt-6.1-sol');assert.equal(upstream.at(-1).max_completion_tokens,14250);
 pass('opening, skeleton, ordinary prose and quoted intimacy doctrine stay Luna; declared spine stays Sol');
 await page.evaluate(()=>{state._explicitEmbodimentAuthorized=true;return fetch('/api/proxy',{method:'POST',body:JSON.stringify({role:'INTIMACY_SPECIALIST',messages:[{role:'user',content:'Authorized explicit rendering.'}],max_tokens:400})});});
 assert.equal(wire.at(-1).url,'/api/proxy');assert.equal(wire.at(-1).body.model,'grok-4.3');
 await page.evaluate(()=>fetch('/api/proxy',{method:'POST',body:JSON.stringify({role:'RENDERER',messages:[{role:'user',content:'Extract an ordinary visual bible.'}],max_tokens:400})}));
 assert.equal(wire.at(-1).body.model,'gpt-6-luna');
 await page.evaluate(()=>{state._explicitEmbodimentAuthorized=false;return fetch('/api/proxy',{method:'POST',body:JSON.stringify({role:'INTIMACY_SPECIALIST',messages:[{role:'user',content:'Classify a scene location.'}],max_tokens:400})});});assert.equal(wire.at(-1).body.model,'gpt-6-luna');
 pass('Grok requires explicit routing/authorization; a shared specialist role alone does not qualify');
 for(const outcome of ['length','refusal']){
  mode=outcome;assert.equal(await page.evaluate(()=>__localFFJSON('Return JSON.','Return a local fixture.',{})),null);
  before=wire.length;
  assert.equal(await page.evaluate(async()=>{try{await _callTieredProvider('body-bible',[{role:'user',content:'Return JSON.'}],{});return false;}catch(e){return e.code==='ALL_TIERS_EXHAUSTED';}}),true);
  assert.equal(wire.length,before+1);
 }mode='error';before=wire.length;
 const failed=await page.evaluate(async()=>{try{await _callTieredProvider('body-bible',[{role:'user',content:'Return a fictional appearance.'}],{});return null;}catch(e){return{code:e.code,attempts:e.attemptLog.length};}});
 assert.equal(failed.code,'ALL_TIERS_EXHAUSTED');assert.equal(failed.attempts,1);assert.equal(wire.length,before+1);mode='ok';
 pass('parseable truncation and refusal are rejected; a failed tier does not dispatch fallback models');
 await page.evaluate(()=>{state.fateMode='storybound';state.famousFate={enabled:true};return fetch('/api/mistral-proxy',{method:'POST',body:JSON.stringify({model:'ministral-8b-2512',messages:[{role:'user',content:'Non-Famous-Fate audit.'}],max_tokens:600})});});
 assert.equal(wire.at(-1).url,'/api/mistral-proxy');assert.equal(wire.at(-1).body.model,'ministral-8b-2512');
 pass('a stale Famous Fate object cannot change another story’s model assignment');
 console.log(`${groups}/${groups} browser/handler groups passed; external browser destinations blocked: ${external.length}; every provider response was a local stub.`);
}finally{await browser?.close();await new Promise(r=>server.close(r));auth.requireModelAccess=oldAdmission;globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
