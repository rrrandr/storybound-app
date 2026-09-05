// _effort_ab.mjs — reasoning-effort A/B, FIVE MATCHED CONTINUATION PAIRS (Codex-revised design, 2026-08-15).
//
// WHY NOT TWO ROLLING ARMS: by scene 4-5 those compare "high prose conditioned on high prior prose" vs
// "none conditioned on none" — a system-divergence test, not an author-effort test. Here each PAIR starts from
// BYTE-IDENTICAL seeded state and differs only in `reasoningEffort`, giving 5 true paired observations.
//
// Enters the REAL production author path: Scene 1 is generated once to initialize (A-plot, bibles, scaffold —
// without it the turn falls to a default route), then each position re-seeds prior prose/state and fires one
// live turn. Effort is injected at the NETWORK layer so the frozen build is byte-identical across every call.
//
// Scene 1 is EXCLUDED from the comparison (architectural outlier: startup duties, ~35 calls, doesn't read the
// spine the way continuations do). The question is about the STEADY-STATE author, where the spend lives.
import { chromium } from 'playwright-core';
import fs from 'fs';
import crypto from 'crypto';

const OUT = process.env.OUT || '/tmp/effort_ab.json';
const DRY = process.env.DRY === '1';          // DRY=1 → init + request census only, no paired generation
const log = (...a) => console.error(...a);

// ── build freeze guard ──
{
  const want = fs.readFileSync('_frozen/BUILD.sha256','utf8').trim().split('\n').map(l=>l.trim().split(/\s+/));
  for (const [h,f] of want) {
    const got = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    if (got !== h) { console.error(`BUILD DRIFT — ${f} changed since freeze. Refusing to spend.`); process.exit(5); }
  }
  log('[freeze] build verified');
}

// ── FIVE STRESS POSITIONS, hand-picked for the cognitive work reasoning might actually buy ──
// prior context for each is taken from the preserved arm so both members of a pair see identical prose.
const prior = JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const P = (n) => ({ a: prior[n-3].text, b: prior[n-2].text });   // the two scenes before position n
const POSITIONS = [
  { key:'dialogue-subtext', n:18, goal:"Julian confronts Lirael about the increasing risk and she insists on continuing their covert investigation.",
    act:"I refuse to be talked out of it.", dia:"You don't get to decide what I risk." },
  { key:'emotional-inference', n:8, goal:"Julian confides in Lirael about the council aide following him, showing his vulnerability.",
    act:"I let the silence sit until he fills it.", dia:"" },
  { key:'lore-fidelity', n:3, goal:"Lirael finds an ancient artifact in the ruins that pulses with energy, possibly linked to the ritual's origin.",
    act:"I reach for it before I can talk myself out of it.", dia:"Tell me what this is." },
  { key:'action-staging', n:9, goal:"Julian narrowly escapes a council patrol by hiding in a crowded marketplace, feeling Lirael's absence keenly.",
    act:"I move through the crowd toward him.", dia:"" },
  { key:'hard-continuity', n:14, goal:"Julian lies to a council aide to protect Lirael, claiming he acted alone.",
    act:"I let him say it, and I don't correct him.", dia:"That's not what happened." },
];

// ── request census: model / effort / sys length / url for EVERY xAI-bound call ──
const census = [];
let injectEffort = null, injectedCount = 0;

const browser = await chromium.launch({ headless:true });
const page = await (await browser.newContext()).newPage();
for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(pat, r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));

await page.route('**/api/**', async route => {
  const r = route.request();
  if (r.method() !== 'POST') return route.continue();
  let b=null; try { b = JSON.parse(r.postData()||'{}'); } catch(_) { return route.continue(); }
  const sys = String(((b.messages||[]).find(m=>m.role==='system')||{}).content || '');
  const isAuthor = sys.length > 50000;
  let effortSent = b.reasoningEffort || null;
  if (isAuthor && injectEffort) { b.reasoningEffort = injectEffort; effortSent = injectEffort; injectedCount++;
    census.push({ url:r.url().replace(/^https?:\/\/[^/]+/,''), model:b.model||b.preferredModel||null, role:b.role||null, sysLen:sys.length, effortSent, injected:true });
    return route.continue({ postData: JSON.stringify(b) }); }
  census.push({ url:r.url().replace(/^https?:\/\/[^/]+/,''), model:b.model||b.preferredModel||null, role:b.role||null, sysLen:sys.length, effortSent, injected:false });
  return route.continue();
});
page.on('console', m=>{ const t=m.text(); if(/PLAN-SPINE|SPINE-STAGING|GROK-LIT\] author|SCENE-COST\] by category/.test(t)) log('  pg>', t.slice(0,150)); });

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination&&window.STARTER_STORIES,{timeout:40000});
await page.waitForTimeout(600);

const PINS = (cfg)=>{ const s=window.state;
  window._auditSceneEmotionalGravity=()=>Promise.resolve(null);
  ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture',
   '_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(f=>{try{window[f]=()=>Promise.resolve(null);}catch(_){}});
  window._devBypass=true;
  const def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  s.picks=s.picks||{};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
  s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
  s._starterId=def.id; s.is_starter_story=true; s.immutableTitle=def.title;
  s.archetype={primary:def.archetype,modifier:null}; s.loveInterestName='Julian'; s.loveInterest='Male'; s.liGender='male';
  s.playerMask='OPEN_VEIN'; s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true; s.fortunes=9999999;
  s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy';
  s.name='Lirael'; s.pov='first_person'; s.playerName='Lirael'; s.partnerName='Julian';
  s.identity={playerName:'Lirael',partnerName:'Julian'}; s.picks.identity=s.identity;
  s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
};
await page.evaluate(PINS, {});
log('[init] generating Scene 1 once to initialize the real author path (the only unavoidable shared cost)…');
await page.evaluate(()=>window.handleBeginStory());
for (let w=0; w<600000; w+=3000){ await page.waitForTimeout(3000);
  const n=await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length); if(n>=1){ await page.waitForTimeout(6000); break; } }
for (let i=0;i<40;i++){ const b=await page.evaluate(()=>!!window.state._isAdvancingScene); if(!b) break; await page.waitForTimeout(3000); }
log('[init] initialized');

// ── PRE-SPEND GATE, IN-RUN (Codex 2026-08-15) ────────────────────────────────────────
// Deliberately NOT a separate DRY process: a standalone census would launch its own browser and buy a
// SECOND Scene-1 init. This project has been bitten by exactly that setup cost. So the census runs on the
// init we already paid for, gates here, and the same browser continues into the pairs.
const initCensus = census.length;
{
  const byRoute = {};
  census.forEach(c=>{ const k=(c.role||'?')+' sys~'+(c.sysLen>50000?'>50k':c.sysLen>3000?'3-50k':'<3k'); (byRoute[k]=byRoute[k]||[]).push(c); });
  console.log('\n════ REQUEST CENSUS — Scene-1 init, '+census.length+' xAI-bound calls ════');
  Object.entries(byRoute).sort((a,b)=>b[1].length-a[1].length).forEach(([k,v])=>
    console.log('  '+String(v.length).padStart(3)+'×  '+k.padEnd(36)+' effortSent='+JSON.stringify([...new Set(v.map(x=>x.effortSent))])));
  fs.writeFileSync('/tmp/effort_census.json', JSON.stringify(census,null,2));
  const authorClass = census.filter(c=>c.sysLen>50000);
  const preSet = census.filter(c=>c.effortSent && c.sysLen<=50000);
  console.log('\n  author-class (>50k sys) calls seen : '+authorClass.length);
  console.log('  non-author calls already sending an effort: '+preSet.length+(preSet.length?'  ⚠ '+JSON.stringify([...new Set(preSet.map(c=>c.role+':'+c.effortSent))]):'  (none)'));
  if (!authorClass.length) { console.error('\n❌ GATE FAILED — no author-class call observed; the >50k seam is wrong. Not spending.'); await browser.close(); process.exit(6); }
  console.log('  ✅ gate passed — the effort rewrite has an unambiguous target; proceeding to pairs');
  if (DRY) { console.log('\n(DRY=1: stopping after the gate — note this DID cost one Scene-1 init)'); await browser.close(); process.exit(0); }
}

// ── seed a position's prior context, identically for both members of a pair ──
async function seed(pos){
  await page.evaluate((cfg)=>{
    const s=window.state; const SP=window.StoryPagination; try{SP.clear();}catch(_){}
    SP.addPage('<p>'+cfg.a.replace(/\n+/g,'</p><p>')+'</p>',true);
    SP.addPage('<p>'+cfg.b.replace(/\n+/g,'</p><p>')+'</p>',true);
    s._sceneTextRing=[{text:cfg.a},{text:cfg.b}]; s._priorSceneText=cfg.b;
    s._committedState={facts:[{fact:'Lirael and Julian are covertly investigating the true wish-maker.'},{fact:'The council is tightening scrutiny on Julian.'}],
      pendingIntent:null, tableau:{forScene:cfg.n-1,setting:null,charactersPresent:['Lirael'],protagonistAlone:false}};
    s._sceneStateCard=s._committedState.tableau;
    s.turnCount=cfg.n-2; s._cliffhangerContinueAuthorized=true;
    s._petitionEmergenceFired=true; s._deckExamineFired=true; s._isAdvancingScene=false;
    window._usePlanSpine=true;
    window.STARTER_PLANS['starter_first_sacrifice']={issue:1,scenes:[{n:cfg.n,goal:cfg.goal}]};
  }, { a:P(pos.n).a, b:P(pos.n).b, n:pos.n, goal:pos.goal });
}
async function generate(pos, effort){
  injectEffort = effort; const before = await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length);
  await page.evaluate((inp)=>{ document.getElementById('actionInput').value=inp.a;
    document.getElementById('dialogueInput').value=inp.d; const b=document.getElementById('submitBtn'); b.disabled=false; b.click(); }, {a:pos.act,d:pos.dia});
  let n=before;
  for (let w=0; w<600000; w+=3000){ await page.waitForTimeout(3000);
    const c=await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length);
    if (c>before){ await page.waitForTimeout(5000); n=c; break; } }
  if (n===before) return null;
  return await page.evaluate((k)=>{ const raw=window.StoryPagination.getPages()||[];
    const st=h=>String(h||'').replace(/<[^>]+>/g,'\n').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&rsquo;/g,"'").replace(/&quot;|&ldquo;|&rdquo;/g,'"').replace(/&mdash;/g,'—').replace(/\n{3,}/g,'\n\n').trim();
    return st(raw[k-1]); }, n);
}

const pairs=[];
for (const pos of POSITIONS){
  // randomize which effort runs first so order effects don't align with condition
  const order = Math.random() < 0.5 ? ['high','none'] : ['none','high'];
  const out = {};
  for (const eff of order){
    await seed(pos);                    // byte-identical seeding before each member
    log(`[pair ${pos.key}] generating effort=${eff} …`);
    out[eff] = await generate(pos, eff);
    log(`[pair ${pos.key}] ${eff}: ${out[eff] ? out[eff].length+' chars' : 'FAILED'}`);
  }
  pairs.push({ key:pos.key, n:pos.n, goal:pos.goal, act:pos.act, dia:pos.dia, order, high:out.high, none:out.none });
  fs.writeFileSync(OUT, JSON.stringify({ pairs, censusCount:census.length }, null, 2));
  // CANARY after the FIRST pair: if the rewrite touched anything but author-class calls, abort before
  // spending on the remaining four pairs. Contaminating the independent variable invalidates everything.
  if (pairs.length === 1) {
    const since = census.slice(initCensus);
    const bad = since.filter(c => c.injected && c.sysLen <= 50000);
    const authors = since.filter(c => c.sysLen > 50000);
    console.log(`\n[canary] after pair 1 — author-class calls: ${authors.length}, efforts sent: ${JSON.stringify([...new Set(authors.map(c=>c.effortSent))])}, non-author modified: ${bad.length}`);
    if (bad.length) { console.error('❌ CANARY FAILED — effort rewrite contaminated non-author calls. Stopping.'); break; }
    if (!authors.length) { console.error('❌ CANARY FAILED — no author-class call during generation. Stopping.'); break; }
    console.log('[canary] ✅ independent variable is clean — continuing to pairs 2-5');
  }
}
await browser.close();

// ── independent-variable assertion (the effort equivalent of the build-hash guard) ──
const authorCalls = census.slice(initCensus).filter(c=>c.sysLen>50000);
const efforts = [...new Set(authorCalls.map(c=>c.effortSent))];
const nonAuthorTouched = census.slice(initCensus).filter(c=>c.sysLen<=50000 && c.injected).length;
console.log('\n════ INDEPENDENT-VARIABLE ASSERTION ════');
console.log('  author-class calls during pairs : '+authorCalls.length+'   efforts sent: '+JSON.stringify(efforts));
console.log('  non-author calls modified       : '+nonAuthorTouched+(nonAuthorTouched===0?'  ✅ none':'  ❌ contaminated'));
console.log('  pairs complete                  : '+pairs.filter(p=>p.high&&p.none).length+'/'+POSITIONS.length);
console.log('\n→ '+OUT);
