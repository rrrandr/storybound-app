// Real Continue, real controls, actual static bundle; all external and API IO blocked.
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');const require=createRequire(import.meta.url);const {chromium}=require('playwright-core');
const loaded=JSON.parse(fs.readFileSync(process.env.SB_RESTORE_FIXTURE || root+'/scripts/fixtures/restore-scene2.json'));
const fixture=loaded.storage ? JSON.parse(loaded.storage.sb_saved_story) : loaded;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const p=path.resolve(root+'/public','.'+(pathname==='/'?'/index.html':pathname));if(!p.startsWith(root+'/public/')){res.writeHead(403);res.end();return}try{const d=fs.readFileSync(p);res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'application/octet-stream');res.end(d)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;let groups=0;const pass=x=>{groups++;console.log('PASS '+x)};
async function fresh({ios=false,fired=false,sealed=false}={}){
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue()});
 const saved=structuredClone(fixture);saved.stateSnapshot._petitionEmergenceFired=fired;if(sealed)saved.stateSnapshot.fate.pendingPetition={text:'To hear an honest answer.',classification:'general'};
 await page.addInitScript(({saved,ios})=>{if(ios)window.__STORYBOUND_PLATFORM='ios_app_store';localStorage.setItem('sb_saved_story',JSON.stringify(saved));localStorage.setItem('sb_current_story_id',saved.storyId)},{saved,ios});
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof window.continueStory==='function'&&window.state&&window.SB_CPLUS_FRAMES);
 return {context,page,saved};
}
try{
 browser=await chromium.launch({headless:true});
 for(const fired of [false,true]){
  const {context,page,saved}=await fresh({fired});
  await page.evaluate(async id=>{await window.continueStory(id)},saved.storyId);
  const restored=await page.evaluate(()=>({pending:state._petitionOnboardingRequired,gate:typeof state._petitionEmergenceSubmitGateCleanup==='function',fired:state._petitionEmergenceFired,story:state._fullyHydratedStoryId}));
  assert.equal(restored.story,saved.storyId);assert.equal(restored.pending,true);assert.equal(restored.gate,true);
  const initialAttempt = await page.evaluate(()=>state._cpAttemptId||null);
  await page.evaluate(()=>{window.__auditSubmitBubble=0;document.getElementById('submitBtn').addEventListener('click',()=>window.__auditSubmitBubble++);document.getElementById('actionInput').value='Ask for an answer.';document.getElementById('dialogueInput').value='Tell me.';document.getElementById('submitBtn').click()});
  await page.evaluate(()=>{state.fate.pendingPetition={};document.getElementById('submitBtn').click();state.fate.pendingPetition=null;});
  const blocked=await page.evaluate(()=>({bubble:window.__auditSubmitBubble,attempt:state._cpAttemptId||null,free:state._petitionGrantsFreeCredit}));assert.equal(blocked.bubble,0);assert.equal(blocked.attempt,initialAttempt);assert.equal(blocked.free,true);
  pass('real Continue preserves mandatory Petition before sealing (animation fired='+fired+')');
  await page.evaluate(()=>{const el=document.getElementById('petitionInput');el.value='To hear an honest answer.';el.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('btnSealPetition').click()});
  await page.waitForFunction(()=>!!state.fate?.pendingPetition?.text,{timeout:10000});
  await page.evaluate(()=>document.getElementById('submitBtn').click());assert.equal(await page.evaluate(()=>window.__auditSubmitBubble),1);
  pass('real wish controls seal the wish; Submit then reaches its normal handler');
  await context.close();
 }
 const sealed=await fresh({sealed:true,fired:true});await sealed.page.evaluate(async id=>window.continueStory(id),sealed.saved.storyId);assert.equal(await sealed.page.evaluate(()=>state._petitionOnboardingRequired),false);assert.equal(await sealed.page.evaluate(()=>typeof state._petitionEmergenceSubmitGateCleanup==='function'),false);await sealed.context.close();pass('already sealed Petition does not trap a reopened story');
 const ios=await fresh({ios:true});assert.equal(await ios.page.evaluate(()=>state.contentRegister),'APPLE_SAFE');await ios.page.evaluate(async id=>window.continueStory(id),ios.saved.storyId);assert.equal(await ios.page.evaluate(()=>state.contentRegister),'APPLE_SAFE');assert.equal(await ios.page.evaluate(()=>state.contentMode),'safe');await ios.context.close();pass('iOS boot -> real Continue of a full-web save remains APPLE_SAFE');
 // End with a reader page, credit the real shared settlement function, then persist/reopen it.
 const {context,page,saved}=await fresh({sealed:true});await page.evaluate(async id=>window.continueStory(id),saved.storyId);
 const outcome=await page.evaluate(async()=>{
  const passage="Helen's shoulders stayed square beneath a charcoal blazer as she looked at the headline instead of me because it was easier to read.";
  state._cplusBeatLedger={characters:{'named:helen_macbrayne':{name:'Helen MacBrayne',role:'supporting',beats:[{beatIndex:1,scene:3,status:'due',frameId:'easier-thing'}]}}};
  StoryPagination.addPage('<p>'+passage+'</p>',true);
  const result=SB_CPLUS_FRAMES.markDeliveredFromPage(state._cplusBeatLedger,String(StoryPagination.getPages().at(-1)),3,[{characterId:'named:helen_macbrayne',beatIndex:1,passage,reveals:'She avoids her daughter by choosing the readable headline.'}]);
  if(typeof window.__saveStorySnapshot==='function')await window.__saveStorySnapshot();
  return {result,save:JSON.parse(localStorage.getItem('sb_saved_story'))};
 });
 assert.equal(outcome.result[0].status,'delivered');assert.equal(outcome.save.stateSnapshot._cplusBeatLedger.characters['named:helen_macbrayne'].beats[0].status,'delivered');
 await page.evaluate(async id=>window.continueStory(id),saved.storyId);assert.equal(await page.evaluate(()=>state._cplusBeatLedger.characters['named:helen_macbrayne'].beats[0].status),'delivered');await context.close();pass('Helen C+ settlement survives the actual snapshot and reopen path');
 console.log(`\n${groups}/${groups} browser groups passed; all external URLs aborted and all API requests locally refused.`);
}finally{await browser?.close();await new Promise(r=>server.close(r))}
