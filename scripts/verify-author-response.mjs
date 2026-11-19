import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const app=fs.readFileSync(root+'/public/app.js','utf8');
const client=fs.readFileSync(root+'/public/orchestration-client.js','utf8');
const cut=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);};
const fn=cut(app,'  async function _authorFullScenePolicy(', '  window._authorFullScenePolicy =');
const classifier=cut(client,'  function sbClassifyProseAttempt(', '  // Does this rung');
const classes=cut(client,'  var SB_OPERATION_CLASS =', '  // ── WHAT COUNTS AS BALKING');
const scenarios=[
 {id:'complete',ok:true,status:200,data:{content:'The complete scene.',finish_reason:'stop'},valid:true},
 {id:'truncated-normalized',ok:true,status:200,data:{content:'I reached for the',finish_reason:'length'},valid:false},
 {id:'truncated-raw',ok:true,status:200,data:{choices:[{message:{content:'I reached for the'},finish_reason:'length'}]},valid:false},
 {id:'refused-with-content',ok:true,status:200,data:{content:'A refusal with text.',refusal:'declined',finish_reason:'stop'},valid:false},
 {id:'filtered-with-content',ok:true,status:200,data:{content:'Partial text.',finish_reason:'content_filter'},valid:false},
 {id:'http-error-with-content',ok:false,status:400,data:{content:'Request error.',error:'invalid_request'},valid:false}
];
let failures=0;
for(const scenario of scenarios){
 const c={window:{},console:{log(){},warn(){},error(){}},_fullSceneCacheEligible:()=>false,fetch:async()=>({ok:scenario.ok,status:scenario.status,json:async()=>scenario.data})};
 c.window._sbProseArchitecture=()=>({lunaAuthorsEverything:true,proseAuthorModel:'gpt-6-luna'});
 vm.createContext(c);vm.runInContext(classifier+classes,c);
 c.window._sbClassifyProseAttempt=c.sbClassifyProseAttempt;c.window._sbOperationClass=c.sbOperationClass;
 vm.runInContext(fn,c);
 const result=await c._authorFullScenePolicy([{role:'user',content:'Write the scene.'}],{roleTag:'literary-scene'});
 const accepted=!!result?.text&&!result.failed;
 const pass=accepted===scenario.valid;
 if(!pass)failures++;
 console.log((pass?'PASS ':'FAIL ')+scenario.id+': accepted='+accepted+', expected='+scenario.valid);
}
// Exercise the real bounded fallback loop with each provider's own reply envelope.
const fallbackContext={window:{},console:{log(){},warn(){},error(){}},_fullSceneCacheEligible:()=>false};
vm.createContext(fallbackContext);
const chainStart=client.indexOf('  var SB_PROSE_CHAIN = [');
const chainEnd=client.indexOf('\n  ];',chainStart)+6;
vm.runInContext(classifier+classes+client.slice(chainStart,chainEnd)
  +cut(client,'  function sbRungFits(', '  // ── THE RECORD'),fallbackContext);
fallbackContext.window._sbProseArchitecture=()=>({lunaAuthorsEverything:true,proseAuthorModel:'gpt-6-luna'});
fallbackContext.window._sbOperationClass=fallbackContext.sbOperationClass;
fallbackContext.window._sbClassifyProseAttempt=fallbackContext.sbClassifyProseAttempt;
fallbackContext.window._sbProseChain=fallbackContext.SB_PROSE_CHAIN;
fallbackContext.window._sbRungFits=fallbackContext.sbRungFits;
let calls=0;
fallbackContext.fetch=async()=>{
 const replies=[{content:'Luna partial',finish_reason:'length'},
  {content:'Haiku partial',stop_reason:'max_tokens'},
  {choices:[{message:{content:'Complete fallback scene.'},finish_reason:'stop'}]}];
 assert.ok(calls<replies.length,'fallback loop is bounded');
 const data=replies[calls++];return {ok:true,status:200,json:async()=>data};
};
vm.runInContext(fn,fallbackContext);
const completed=await fallbackContext._authorFullScenePolicy([{role:'user',content:'Write the scene.'}],{roleTag:'literary-scene'});
assert.equal(completed.text,'Complete fallback scene.');assert.equal(calls,3);
console.log('PASS bounded fallback rejects both partial replies and accepts only the complete result');
console.log('No provider contacted. Failures='+failures);
process.exitCode=failures?1:0;
