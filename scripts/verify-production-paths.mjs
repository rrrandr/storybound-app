// Production defaults and receiving boundaries. Every provider request is mocked locally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const app = read('public/app.js');
const cut = (source, start, end) => {
  const i = source.indexOf(start);
  assert.ok(i >= 0, `missing start: ${start}`);
  const j = source.indexOf(end, i + start.length);
  assert.ok(j > i, `missing end: ${end}`);
  return source.slice(i, j);
};
let groups = 0;
const pass = message => { groups++; console.log('PASS ' + message); };
const quiet = {log(){},warn(){},error(){}};
const w = {};
vm.runInNewContext(read('public/model-routing.js'), { window:w });
const router = w.SB_MODEL_ROUTING;
const spineBody = {role:'STRUCTURE_GENERATOR', model:'gpt-6-luna', max_completion_tokens:14250,
  messages:[{role:'system',content:'CONTINUITY ARCHITECT — GRAVITATIONAL STRUCTURE'}]};
const route = router.resolve('/api/sol-scene-test', spineBody);
assert.equal(route.endpoint, '/api/chatgpt-proxy');
router.conform(spineBody, route.route, route.op);
assert.equal(spineBody.operation, 'story-spine');
assert.equal(spineBody.model, 'gpt-6.1-sol');
assert.equal(spineBody.max_tokens, 14250);
assert.equal(spineBody.max_completion_tokens, undefined);
const policy = require('../api/orchestrator.js');
assert.equal(policy.validateModelForRole(spineBody.model, spineBody.role, spineBody.operation),true);
for (const op of [undefined,'ordinary-prose','continuation-skeleton']) {
  assert.throws(()=>policy.validateModelForRole('gpt-6.1-sol','PRIMARY_AUTHOR',op));
}
pass('Sol spine uses the production proxy with scoped server permission and its allowance');

const skeletonSource = cut(app,'      var _SKEL_CANDIDATES = [','      try { state._skeletonRouteLog =');
const candidates = [];
const skeletonReply = async response => {
 const c = {window:{},console:quiet,fetch:async(url,init)=>{
   candidates.push({url,body:JSON.parse(init.body)});
   return {ok:true,status:200,json:async()=>response};
 }, _skelMsgs:[{role:'user',content:'Define a narrative skeleton for the next scene:'}]};
 return vm.runInNewContext('(async()=>{'+skeletonSource+';return result;})()',c);
};
assert.equal(await skeletonReply({content:'{"structural_pacing":"urgent"}',finish_reason:'stop'}),'{"structural_pacing":"urgent"}');
assert.equal(candidates.length,1);
assert.equal(candidates[0].url,'/api/chatgpt-proxy');
assert.equal(candidates[0].body.model,'gpt-6-luna');
assert.equal(candidates[0].body.max_tokens,10000);
assert.equal(candidates[0].body.reasoning_effort,'medium');
assert.equal(await skeletonReply({content:'{"valid":"looking"}',finish_reason:'length'}),null);
assert.equal(await skeletonReply({content:'{"valid":"looking"}',refusal:'declined'}),null);
assert.equal(candidates.length,3,'exactly one attempt for each outcome');
assert.equal(router.resolve(candidates[0].url,candidates[0].body).op,'CONTINUATION_SKELETON');
pass('default scaffold dispatch is Luna without run config, with no smaller fallback or truncated acceptance');

// Drive the real production handler using the conformed client body, including a deployed host.
const originalFetch = globalThis.fetch;
const oldKey = process.env.OPENAI_API_KEY;
const oldEnv = process.env.VERCEL_ENV;
process.env.OPENAI_API_KEY = 'offline-contract-placeholder';
process.env.VERCEL_ENV = 'production';
let forwarded = 0;
// This suite isolates the upstream body contract after admission. The full verified-session
// and real-SQL admission boundary is exercised over HTTP by verify-audit-fixes.mjs.
const requestAuth = require('../api/_request-auth.js');
const oldAdmission = requestAuth.requireModelAccess;
requestAuth.requireModelAccess = async function(req) {
 assert.equal(req.headers.authorization, 'Bearer admitted-contract-fixture');
 return {id:'contract-fixture'};
};
const proxy = require('../api/chatgpt-proxy.js');
globalThis.fetch = async (url, init) => {
 forwarded++;
 assert.equal(url,'https://api.openai.com/v1/chat/completions');
 const body = JSON.parse(init.body);
 assert.equal(body.model,'gpt-6.1-sol');
 assert.equal(body.max_completion_tokens,14250);
 assert.equal(body.max_tokens,undefined);
 return {ok:true,status:200,text:async()=>JSON.stringify({model:'gpt-6.1-sol',
   choices:[{message:{content:'{"spine":"accepted"}'},finish_reason:'stop'}],
   usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}})};
};
try {
 const res={code:null,result:null,setHeader(){},status(n){this.code=n;return this;},json(x){this.result=x;return this;},end(){}};
 await proxy({method:'POST',headers:{host:'storybound.example',authorization:'Bearer admitted-contract-fixture'},body:spineBody},res);
 assert.equal(res.code,200,JSON.stringify(res.result));
 assert.equal(res.result.content,'{"spine":"accepted"}');
 assert.equal(res.result.model,'gpt-6.1-sol');
 assert.equal(res.result.finish_reason,'stop');
 assert.equal(forwarded,1);
 // Exercise the actual consumer of the normalized response, through its failure boundary.
 const consumer = cut(app,'        var _solUp =','        _scaffoldAttempts.push(');
 const c={_solJson:res.result,raw:null};
 vm.runInNewContext(consumer,c);
 assert.equal(c.raw,'{"spine":"accepted"}');
 assert.throws(()=>vm.runInNewContext(consumer,{_solJson:{...res.result,finish_reason:'length'}}),/truncated/);
 assert.throws(()=>vm.runInNewContext(consumer,{_solJson:{...res.result,refusal:'declined'}}),/refused/);
 pass('production handler admits the spine and its real consumer reads the normalized response');
} finally {
 requestAuth.requireModelAccess = oldAdmission;
 globalThis.fetch=originalFetch;
 if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;
 if(oldEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnv;
}

const helpers = cut(app,'  function _sbNarrationTense(',"  var _LI_ADMIRE_AREAS =");
const h={window:{},console:quiet};
vm.createContext(h);vm.runInContext(helpers,h);
const past='I was at the door. I looked back. He turned. I kept the deck. I noticed the light.';
const present='I am at the door. I look back. He turns. I keep the deck. I notice the light.';
const first=h.window._sbBuildTemptCloser({_priorSceneText:past},'1st','she','her');
assert.match(first,/I realized.*I slid.*I noticed/s);
assert.match(first,/static shock reminded me/);
assert.match(h.window._sbBuildTemptCloser({_priorSceneText:present},'1st','she','her'),/I realize.*I slide.*I notice/s);
assert.match(h.window._sbBuildTemptCloser({_sceneTextRing:[{text:past}]},'2nd','he','his'),/You realized.*you slid.*you noticed/s);
for(const token of ['Petition Fate','Tempt Fate','Great-grandma','blood-red sky','arcing up?','static shock'])assert.ok(first.includes(token),token);
const cgCall=cut(app,'      var _closerS3 = _sbBuildTemptCloser(state, _povS3,','      state._sceneThreeMandatedCloser =');
const litCall=cut(app,'            var _closerS3 = _sbBuildTemptCloser(state, _povLM,','            state._sceneThreeMandatedCloser =');
for(const [code,povKey,subjKey,possKey] of [[cgCall,'_povS3','_subjS3','_possS3'],[litCall,'_povLM','_subjLM','_possLM']]) {
 const c={state:{_priorSceneText:past},_sbBuildTemptCloser:h.window._sbBuildTemptCloser,[povKey]:'1st',[subjKey]:'she',[possKey]:'her'};
 vm.runInNewContext(code,c);assert.equal(c._closerS3,first);
}
pass('both actual writing-path call sites deliver the same tense-aware closer and all onboarding beats');

const sceneHelper = cut(app,'  function _sceneBeingBuilt(', '  try { if (typeof window');
const stampContext={window:{StoryPagination:{getPages:()=>['scene 1','scene 2']}},
  state:{storyId:'story-a',issueIndexInRun:1,turnCount:1},
  _omenKey:'accepted',_omenTemp:'warm',_omenPressure:1,_omenCat:'animal',Date};
vm.createContext(stampContext);vm.runInContext(sceneHelper,stampContext);
const stampStart=app.indexOf('state._omenAssigned = { storyId:');
const stampEnd=app.indexOf(';',stampStart)+1;
vm.runInContext(app.slice(stampStart,stampEnd),stampContext);
const assignment=stampContext.state._omenAssigned;
assert.equal(assignment.scene,3,'published page count defeats lagging turnCount=1');
assert.equal(assignment.storyId,'story-a');
assert.equal(assignment.issueIndexInRun,1);
const valid={storyId:'story-a',issueIndexInRun:1,_omenAssigned:assignment};
assert.equal(h.window._sbOmenAssignmentForScene(valid,3),assignment);
for(const [state,scene] of [[valid,4],[{...valid,storyId:'story-b'},3],[{...valid,issueIndexInRun:2},3],
 [{...valid,_omenAssigned:{scene:3,category:'animal'}},3]])assert.equal(h.window._sbOmenAssignmentForScene(state,scene),null);
// Both actual publication blocks must decline stale evidence, even with omen-like vocabulary.
const blocks=[...app.matchAll(/var _omAs = _sbOmenAssignmentForScene\(state, [^;]+;/g)];
assert.equal(blocks.length,2);
for(const block of blocks){
 const audit=app.slice(block.index,app.indexOf('} catch (_omenAuditErr)',block.index));
 let audited=0;
 const c={state:valid,_omenPublishedSceneC:4,_publishedForLedger:'An animal. That was odd.',pageContent:'An animal. That was odd.',
 _sbOmenAssignmentForScene:h.window._sbOmenAssignmentForScene,_sbOmenChannelAudit(){audited++;return {ok:true};},console:quiet};
 vm.runInNewContext(audit,c);assert.equal(audited,0);
 if(audit.includes('_omenPublishedSceneC')){c._omenPublishedSceneC=3;vm.runInNewContext(audit,c);assert.equal(audited,1);}
}
pass('publication audits only the current story, issue, and scene; stale and legacy assignments stay unjudged');

const runner=read('_nf_literary_playthrough.mjs');
const start=runner.indexOf('const _editorFetchGuard = ');
const end=runner.indexOf('} : null;',start)+9;
let outbound=0;
const guard={_SB_OFFLINE:true,_SB_MODEL_ORIGIN:'http://localhost:3991',_editorEgressAttempts:0,_editorEgress:[],
 process:{env:{SB_EDITOR_DIRECT:'1'}},console:quiet,globalThis:{fetch(){outbound++;throw Error('unexpected outbound');}},URL,Date};
vm.createContext(guard);vm.runInContext(runner.slice(start,end)+'\nthis.guard=_editorFetchGuard;',guard);
await assert.rejects(guard.guard('https://api.openai.com/v1/chat/completions',{}),/SB_OFFLINE overrides SB_EDITOR_DIRECT/);
assert.equal(outbound,0);
pass('offline overrides direct editor access before fetch');
console.log(`${groups}/${groups} production boundary groups passed. No provider contacted.`);
