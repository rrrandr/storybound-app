// Real HTTP handlers and browser request wrapper, backed by executable Postgres functions.
// No external request or paid provider is permitted in this suite.
import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const require=createRequire(import.meta.url);
const { PGlite }=require('@electric-sql/pglite');
const db=new PGlite();
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TABLE profiles(id uuid PRIMARY KEY, fortunes integer NOT NULL DEFAULT 0, is_subscriber boolean DEFAULT false,
 bonus_tempt_charges integer DEFAULT 0, stripe_customer_id text, legal_ip text, legal_user_agent text);
 CREATE TABLE fortune_operations(operation_id text PRIMARY KEY,user_id uuid NOT NULL,context text,amount integer,
 story_id text,status text DEFAULT 'unverified',balance_after integer,created_at timestamptz DEFAULT now());
 CREATE TABLE fortune_ledger(user_id uuid,amount integer CHECK(amount>0),direction text CHECK(direction IN ('credit','debit')),
 context text,story_id text,balance_after integer,source_endpoint text,metadata jsonb,operation_id text);
 CREATE FUNCTION grant_welcome_milestone(uuid,text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 GRANT EXECUTE ON FUNCTION grant_welcome_milestone(uuid,text) TO anon,authenticated;
 INSERT INTO profiles VALUES('${owner}',90,false,1,'cus_owner',null,null),('${other}',0,false,0,'cus_other',null,null);
 INSERT INTO fortune_operations(operation_id,user_id,context,amount,story_id,status,balance_after)
 VALUES('paid','${owner}','issue',10,'book','succeeded',90);`);
await db.exec(fs.readFileSync(root+'/supabase/migrations/20261118220000_audit_boundaries.sql','utf8'));
await db.exec(`CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);INSERT INTO auth.users VALUES('${owner}'),('${other}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
 CREATE TABLE story_library_versions(id text PRIMARY KEY,profile_id uuid);
 INSERT INTO story_library_versions VALUES('owned-book','${owner}');`);
const cplusOld=fs.readFileSync(root+'/supabase/migrations/20261016_cplus_editor_operations.sql','utf8')
 .replace('select profile_id from public.story_library_versions where id::text = $1','select author_id from public.story_library_versions where id::text = $1');
await db.exec(cplusOld);
const editorAdmit=(id,user)=>db.query('select * from cplus_editor_admit($1,$2,$3,1,$4,$5,$6,0,0.001,10)',[id,user,'owned-book','revision','gpt-6-luna','[]']);
await assert.rejects(()=>editorAdmit('broken-owner',owner),/author_id/);
await db.exec(fs.readFileSync(root+'/supabase/migrations/20261118223000_cplus_owner_column.sql','utf8'));
assert.equal((await editorAdmit('fixed-owner',owner)).rows[0].outcome,'admitted');
assert.equal((await editorAdmit('wrong-owner',other)).rows[0].outcome,'forbidden');
assert.equal((await db.query("select * from cplus_editor_admit('local-draft',$1,'unpublished-local-book',1,'revision','gpt-6-luna','[]',0,0.001,10)",[owner])).rows[0].outcome,'admitted');

let checks=0;const pass=label=>{checks++;console.log('PASS '+label)};
pass('production C+ ownership failure reproduced in Postgres; repaired lookup admits owner and refuses another account');
let providerCalls=0, authReads=0;const stripeCalls=[];let failAdmission=false;
function createClient(){return {auth:{async getUser(token){authReads++;return token==='valid-token'?{data:{user:{id:owner}},error:null}:{data:{user:null},error:{message:'invalid'}}}},async rpc(name,args){
 if(name==='admit_model_request'&&failAdmission)return {data:null,error:{message:'unavailable'}};
 if(['admit_model_request','refund_fortunes_v4','consume_tempt_charge_v1'].includes(name)){
  try{const vals=Object.values(args),params=vals.map((_,i)=>'$'+(i+1)).join(',');const {rows}=await db.query('select public.'+name+'('+params+') as result',vals);return{data:rows[0].result,error:null}}catch(e){return{data:null,error:{message:e.message}}}
 }
 if(name==='record_tempt_failure'||name==='grant_welcome_milestone')return {data:[{source:'granted',fortunes:110,attempt_count:2,bonus_tempt_charges:1}],error:null};
 throw Error('unmocked RPC '+name);
 },from(table){
 const filters=[];let patch=null,cols='*';const q={select(c){cols=c||'*';return q},eq(k,v){filters.push([k,v]);return q},update(p){patch=p;return q},async exec(){
  assert.ok(['profiles','fortune_operations'].includes(table),'unexpected table '+table);
  const vals=[];let sql=patch?'UPDATE '+table+' SET '+Object.keys(patch).map(k=>{vals.push(patch[k]);return k+'=$'+vals.length}).join(','):'SELECT '+cols+' FROM '+table;
  if(filters.length)sql+=' WHERE '+filters.map(([k,v])=>{vals.push(v);return k+'=$'+vals.length}).join(' AND ');
  if(patch)sql+=' RETURNING *';const {rows}=await db.query(sql,vals);return{data:rows[0]||null,error:null};
 },single(){return q.exec()},maybeSingle(){return q.exec()},then(a,b){return q.exec().then(a,b)}};return q;
 }}}
const stripe={billingPortal:{sessions:{async create(x){stripeCalls.push(x);return{url:'https://billing.stripe.test/fixture'}}}}};
const env={SUPABASE_URL:'https://database.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',SUPABASE_ANON_KEY:'fixture-only',STRIPE_SECRET_KEY:'fixture-only',OPENAI_API_KEY:'fixture-only'};
const quiet={log(){},warn(){},error(){}};
const fakeFetch=async(url)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions');providerCalls++;return{ok:true,status:200,text:async()=>JSON.stringify({model:'gpt-6.1-sol',choices:[{message:{content:'{}'},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1}})}};
const ctx=vm.createContext({process:{env},console:quiet,fetch:fakeFetch,setTimeout,clearTimeout,AbortController,Buffer,URL,URLSearchParams});
function loadCjs(file){const m={exports:{}};const source=fs.readFileSync(root+'/api/'+file,'utf8');vm.runInContext('(function(require,module,exports){'+source+'\n})',ctx,{filename:file})((spec)=>spec==='@supabase/supabase-js'?{createClient}:spec==='./_request-auth.js'?auth:require(root+'/api/'+spec),m,m.exports);return m.exports;}
const auth=loadCjs('_request-auth.js');
async function loadEsm(file){const mod=new vm.SourceTextModule(fs.readFileSync(root+'/api/'+file,'utf8'),{context:ctx,identifier:file});await mod.link(async spec=>{
 const value=spec==='@supabase/supabase-js'?{createClient}:spec==='./_request-auth.js'?{default:auth}:spec==='../lib/stripe.js'?{stripe}:spec==='./_model-fallback.js'?{default:require(root+'/api/_model-fallback.js')}:spec==='./_sanitize-injection.js'?{default:require(root+'/api/_sanitize-injection.js')}:null;
 assert.ok(value,'unmocked import '+spec);return new vm.SyntheticModule(Object.keys(value),function(){for(const[k,v]of Object.entries(value))this.setExport(k,v)},{context:ctx});
 });await mod.evaluate();return mod.namespace.default;}
const handlers={};
for(const f of ['refund-fortune','billing-portal','consume-tempt-charge','record-tempt-failure','grant-welcome-milestone','record-legal-acceptance'])handlers[f]=await loadEsm(f+'.js');
for(const f of ['chatgpt-proxy','proxy','mistral-proxy','deepseek-proxy','gemini-proxy','anthropic-proxy'])handlers[f]=f==='proxy'?await loadEsm(f+'.js'):loadCjs(f+'.js');
const server=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;req.body=JSON.parse(body||'{}');const send={setHeader:(...a)=>res.setHeader(...a),status(n){res.statusCode=n;return this},json(v){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v))},end(){res.end()},send(v){res.end(v)}};
 try{await handlers[req.url.split('/').pop()](req,send)}catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}))}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const request=async(endpoint,body={},token=null)=>{const r=await fetch(origin+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return{status:r.status,body:await r.json()}};
try{
 for(const endpoint of Object.keys(handlers)){const r=await request(endpoint,{userId:other,amount:1000000,operationId:'never-paid'});assert.equal(r.status,401,endpoint);}
 assert.equal(providerCalls,0);assert.equal(stripeCalls.length,0);assert.equal(authReads,0);pass('all twelve protected handlers refuse anonymous HTTP before privileged IO');
 for(const endpoint of Object.keys(handlers)){assert.equal((await request(endpoint,{userId:other},'valid-token')).status,403,endpoint)}
 assert.equal(providerCalls,0);pass('all protected handlers reject cross-account IDs');
 assert.equal((await request('billing-portal',{supabaseUserId:owner},'bad-token')).status,401);pass('an invalid bearer token cannot reach billing');
 const client={window:{},URL,Headers,Response};vm.createContext(client);vm.runInContext(fs.readFileSync(root+'/public/request-auth.js','utf8'),client);
 const authenticated=client.window.SB_REQUEST_AUTH.authenticatedFetch(fetch,async()=>({access_token:'valid-token'}),()=> 'book',origin);
 let leaked=null;
 const isolated=client.window.SB_REQUEST_AUTH.authenticatedFetch(async(input,init)=>{leaked=init?.headers;return new Response('{}')},async()=>({access_token:'valid-token'}),()=> 'book',origin);
 await isolated('https://other.invalid/api/chatgpt-proxy',{method:'POST'});assert.equal(leaked?.get?.('Authorization'),undefined);
 let anonymousWireCalls=0;const loggedOut=client.window.SB_REQUEST_AUTH.authenticatedFetch(async()=>{anonymousWireCalls++;throw Error('unexpected anonymous dispatch')},async()=>null,()=> 'book',origin);
 assert.equal((await loggedOut(origin+'/api/refund-fortune',{method:'POST'})).status,401);assert.equal(anonymousWireCalls,0);pass('browser wrapper neither leaks a session to other origins nor dispatches a logged-out protected request');

 const billing=await authenticated(origin+'/api/billing-portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({supabaseUserId:owner})});assert.equal(billing.status,200);assert.equal(stripeCalls[0].customer,'cus_owner');pass('real browser request wrapper -> HTTP -> verified owner -> billing portal');
 assert.equal((await request('refund-fortune',{operationId:'invented',amount:1000000},'valid-token')).status,403);
 assert.equal((await request('refund-fortune',{operationId:'paid',amount:1000000},'valid-token')).status,409);pass('refund requires an existing verified payment and rejects an inflated amount');
 const pair=await Promise.all([request('refund-fortune',{operationId:'paid',amount:10},'valid-token'),request('refund-fortune',{operationId:'paid',amount:10},'valid-token')]);assert.ok(pair.every(x=>x.status===200));assert.equal(pair.filter(x=>!x.body.duplicate).length,1);
 assert.equal((await db.query('select fortunes from profiles where id=$1',[owner])).rows[0].fortunes,100);assert.equal((await db.query("select count(*)::int n from fortune_ledger where operation_id='refund:paid'")).rows[0].n,1);pass('concurrent refund/replay executes real SQL and credits exactly once with one ledger entry');
 await db.exec(`INSERT INTO fortune_operations(operation_id,user_id,context,amount,story_id,status,balance_after) VALUES('rollback','${owner}','issue',10,'book','succeeded',100);
 CREATE FUNCTION reject_test_credit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.operation_id='refund:rollback' THEN RAISE EXCEPTION 'fixture rollback'; END IF; RETURN NEW; END $$;
 CREATE TRIGGER reject_test_credit BEFORE INSERT ON fortune_ledger FOR EACH ROW EXECUTE FUNCTION reject_test_credit();`);
 assert.equal((await request('refund-fortune',{operationId:'rollback',amount:10},'valid-token')).status,503);
 assert.equal((await db.query('select fortunes from profiles where id=$1',[owner])).rows[0].fortunes,100);
 assert.equal((await db.query("select status from fortune_operations where operation_id='rollback'")).rows[0].status,'succeeded');await db.exec('DROP TRIGGER reject_test_credit ON fortune_ledger');
 assert.equal((await request('refund-fortune',{operationId:'rollback',amount:10},'valid-token')).status,200);pass('failed refund transaction rolls back credit and receipt; the same operation retries safely');
 for(const endpoint of ['record-tempt-failure','grant-welcome-milestone','record-legal-acceptance']){const r=await request(endpoint,{storyId:'book',sceneIdx:2,reason:'failure',milestone:'day2'},'valid-token');assert.equal(r.status,200,JSON.stringify(r))}pass('legitimate account mutations still reach their server operations');
 const charges=await Promise.all(['a','b'].map(operationId=>request('consume-tempt-charge',{operationId},'valid-token')));assert.equal(charges.filter(x=>x.body.ok).length,1);assert.equal((await db.query('select bonus_tempt_charges from profiles where id=$1',[owner])).rows[0].bonus_tempt_charges,0);
 const won=charges[0].body.ok?'a':'b';const replay=await request('consume-tempt-charge',{operationId:won},'valid-token');assert.equal(replay.body.duplicate,true);assert.equal(replay.body.ok,true);pass('two concurrent Tempt spends share one remaining charge; successful retry is idempotent');
 const body={role:'PRIMARY_AUTHOR',model:'gpt-6.1-sol',operation:'story-spine',max_tokens:14250,messages:[{role:'user',content:'Return JSON.'}]};
 const model=await authenticated(origin+'/api/chatgpt-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(model.status,200);assert.equal(providerCalls,1);pass('authenticated browser -> HTTP -> durable admission -> mocked provider succeeds');
 failAdmission=true;assert.equal((await request('chatgpt-proxy',body,'valid-token')).status,503);assert.equal(providerCalls,1);failAdmission=false;pass('unavailable admission fails closed before provider dispatch');
 await db.query('update profiles set fortunes=0,is_subscriber=false where id=$1',[owner]);
 assert.equal((await request('chatgpt-proxy',body,'valid-token')).status,403);assert.equal(providerCalls,1);
 await db.query("insert into fortune_operations(operation_id,user_id,amount,story_id,status,balance_after) values('active-book',$1,10,'book','succeeded',0)",[owner]);
 const paidStory=await request('chatgpt-proxy',{...body,storyId:'book'},'valid-token');assert.equal(paidStory.status,200); // a distinct, unrefunded purchase owns this story
 await db.query("update fortune_operations set status='refunded' where operation_id='active-book'");
 assert.equal((await request('chatgpt-proxy',{...body,storyId:'book'},'valid-token')).status,403);pass('zero-balance account needs a non-refunded story payment; refunded purchases do not authorize generation');
 await db.query('update profiles set fortunes=1 where id=$1',[owner]);await db.query("update model_request_windows set hits=120 where user_id=$1 and bucket like 'm:%'",[owner]);
 const before=providerCalls;assert.equal((await request('chatgpt-proxy',body,'valid-token')).status,429);assert.equal(providerCalls,before);pass('durable per-account cap blocks an otherwise entitled model request');
 const grants=(await db.query("select has_function_privilege('anon','public.grant_welcome_milestone(uuid,text)','EXECUTE') a,has_function_privilege('authenticated','public.refund_fortunes_v4(uuid,text,integer)','EXECUTE') b,has_function_privilege('service_role','public.refund_fortunes_v4(uuid,text,integer)','EXECUTE') c")).rows[0];assert.equal(grants.a,false);assert.equal(grants.b,false);assert.equal(grants.c,true);pass('direct anonymous RPC cannot bypass HTTP identity checks; service role remains admitted');
 for(const name of ['admit_model_request(uuid,text)','consume_tempt_charge_v1(uuid,text)'])assert.equal((await db.query('select has_function_privilege($1,$2,$3) allowed',['anon','public.'+name,'EXECUTE'])).rows[0].allowed,false);pass('all new money/admission RPCs are non-public');
 const frames={window:{}};vm.createContext(frames);vm.runInContext(fs.readFileSync(root+'/public/cplus-frames.js','utf8'),frames);const F=frames.window.SB_CPLUS_FRAMES;
 const passage="Helen's shoulders stayed square beneath a charcoal blazer as she looked at the headline instead of me because it was easier to read.";
 const settle=(text,page=text,role='supporting',name='Helen MacBrayne')=>{const l={characters:{x:{name,role,beats:[{beatIndex:1,scene:2,status:'due',frameId:'easier-thing'}]}}};return F.markDeliveredFromPage(l,page,2,[{characterId:'x',beatIndex:1,passage:text,reveals:'avoidance'}])[0]};
 assert.equal(settle("Helen MacBrayne's portrait hung above the desk.").status,'still due');assert.equal(settle('Helen MacBrayne looked at the headline instead of her daughter.').status,'delivered');assert.equal(settle(passage).status,'delivered');assert.equal(settle(passage,'Removed on publication.').status,'still due');assert.equal(settle('Helen wondered whether Dani would ever come home.',undefined,'pc','Dani MacBrayne').status,'still due');assert.equal(settle('My mother took my bag before I could set it down.',undefined,'pc','Dani MacBrayne').status,'still due');assert.equal(settle('I have a smile I use just for the screen.',undefined,'pc','Dani MacBrayne').status,'delivered');pass('real C+ settlement credits Helen acting, refuses a removed quote and incidental PC mentions');
 console.log(`\n${checks}/${checks} boundary groups passed; zero external provider calls (${providerCalls} local provider fixtures).`);
}finally{await new Promise(r=>server.close(r));await db.close()}
