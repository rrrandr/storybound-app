// _render_arm.js — THIN arm renderer for the blind A/B (Roman 2026-08-12).
//
// WHY NOT A PURE-NODE RENDERER: the literary turn has NO callable entry point — it is ~700 lines inline
// in the submit click handler (app.js:272997+) reading its inputs from the DOM, and the app itself drives
// a turn by setting inputs + clicking (app.js:123936). Re-implementing prompt assembly in Node would create
// a FOURTH prompt-build path (see project_prompt_path_divergence) and we would be A/B-testing a harness
// author instead of Storybound's. So the browser stays — but ONLY as the module runtime.
//
// REMOVED vs _blind_ab.js: scene-detection side-channel, page counting heuristics, re-click loop, probe
// waits, CG paths, continuation-window arms, HOTFAST, staged mode, entity/continuity capture.
// KEPT: the real production author + editorial stack, the seed/canon, the spine injection point.
// ADDED: immediate per-scene persistence; ONE click per scene, never a re-click on a timer.
//
//   MOCK=1 node _render_arm.js                 # FREE — proves 20 inputs → 20 persisted outputs
//   SPINE=gen  node _render_arm.js             # paid arm 1
//   SPINE=hand node _render_arm.js             # paid arm 2
const { chromium } = require('playwright-core');
const fs = require('fs');

const SPINE  = (process.env.SPINE || 'gen').toLowerCase();
const TARGET = parseInt(process.env.TARGET, 10) || 20;
const MOCK   = process.env.MOCK === '1';
const MOCK_MS= parseInt(process.env.MOCK_MS, 10) || 1500;
const OUT    = process.env.OUT || `/tmp/arm_${SPINE}.json`;
const SCENE_TIMEOUT = parseInt(process.env.SCENE_TIMEOUT, 10) || 600000;
const PAGE_MIN = 1200;

// ── REASONING-EFFORT OVERRIDE (Roman 2026-08-12) ──────────────────────────────────────
// EFFORT=none|low|high injects `reasoningEffort` into the outgoing author request AT THE
// NETWORK LAYER. api/proxy.js:176 already honors body.reasoningEffort; app.js never sends it, so
// the proxy's model-NAME regex (:174) silently defaults grok-4.3 to 'high' — ~24% of spend.
// Doing this in the harness rather than in app.js keeps the FROZEN BUILD byte-identical across arms:
// the only difference between effort arms is one field added in flight.
const EFFORT = (process.env.EFFORT || '').toLowerCase();
if (EFFORT && !['none','low','high'].includes(EFFORT)) { console.error('EFFORT must be none|low|high'); process.exit(1); }

// ── BUILD FREEZE GUARD ────────────────────────────────────────────────────────────────
// Two agents have been editing app.js. A comparison is only valid if every arm ran the same bytes,
// so verify against the snapshot taken at freeze time and REFUSE to spend if the build moved.
if (process.env.REQUIRE_FROZEN !== '0') {
  try {
    const want = fs.readFileSync('_frozen/BUILD.sha256','utf8').trim().split('\n')
      .map(l=>l.trim().split(/\s+/)).map(([h,f])=>({h,f}));
    const crypto = require('crypto');   // this file is CommonJS — top-level `await import()` makes it ambiguous
    for (const {h,f} of want) {
      const got = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
      if (got !== h) { console.error(`BUILD DRIFT — ${f} changed since freeze.\n  frozen: ${h}\n  now:    ${got}\nRefusing to spend; re-freeze or restore.`); process.exit(5); }
    }
    console.error('[freeze] build verified identical to _frozen/BUILD.sha256');
  } catch (e) { console.error('BUILD FREEZE CHECK FAILED: ' + e.message + ' (set REQUIRE_FROZEN=0 to bypass)'); process.exit(5); }
}
if (!['gen','hand'].includes(SPINE)) { console.error('SPINE must be gen|hand'); process.exit(1); }

let SPINE_PLAN = null;
if (SPINE === 'gen') {
  const rep = JSON.parse(fs.readFileSync(process.env.GENSPINE || '_worldsim_out2/serial20_windowed_report.json','utf8'));
  if (!Array.isArray(rep.committed) || rep.committed.length < 20) { console.error('generated spine incomplete'); process.exit(1); }
  SPINE_PLAN = { issue:1, scenes: rep.committed.slice(0,20).map((e,i)=>({ n:i+1, goal:String(e) })) };
}

const INPUTS = [
  { a:"I stand my ground instead of backing down.", d:"I'm not going to pretend this doesn't matter." },
  { a:"I push for the truth about what he's really doing here.", d:"Tell me what you actually want from me." },
  { a:"I follow the thread I'm not supposed to notice.", d:"" },
  { a:"I confront him with what I found.", d:"I know what you've been hiding. Don't lie to me." },
  { a:"I let my guard down for a moment, then catch myself.", d:"This can't happen. You know that." },
  { a:"I make a choice that costs me something.", d:"If this is the price, I'll pay it." },
  { a:"I refuse the easy way out he offers.", d:"I don't want your help. I want the truth." },
  { a:"I close the distance between us.", d:"Stop talking." },
  { a:"I pull back, suddenly afraid of how much I want this.", d:"I shouldn't be here." },
  { a:"I decide to fight back on my own terms.", d:"They picked the wrong person to corner." },
  { a:"I expose the secret I've been protecting.", d:"You should know the truth about me before this goes further." },
  { a:"I test whether I can trust him with everything.", d:"Prove it. Right now." },
  { a:"I walk into the danger instead of away from it.", d:"I'm done waiting for it to come to me." },
  { a:"I let him see how much it hurt.", d:"You don't get to disappear and come back like nothing happened." },
  { a:"I make the move I've been afraid to make.", d:"I'm tired of pretending I don't feel this." },
  { a:"I face the consequence I've been dreading.", d:"Whatever happens next, I did this with my eyes open." },
  { a:"I refuse to be anyone's secret.", d:"If you want me, you want all of it. In the open." },
  { a:"I force the confrontation to a head.", d:"Choose. Now." },
  { a:"I stand at the threshold of the decision that changes everything.", d:"Tell me this was real." },
];

const log = (...a) => console.error(...a);
const scenes = [];
function persist(done){
  const body = { spine:SPINE, target:TARGET, capturedScenes:scenes.length, complete:!!done, mock:MOCK, scenes };
  fs.writeFileSync(done ? OUT : OUT + '.partial', JSON.stringify(body, null, 2));
}

(async () => {
  const browser = await chromium.launch({ headless:true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  if (MOCK) await page.route('**/api/__mock_delay*', async r => { await new Promise(x=>setTimeout(x,MOCK_MS)); await r.fulfill({status:200,contentType:'application/json',body:'{}'}); });
  // Inject reasoningEffort in flight — app.js untouched, frozen build preserved.
  let effortInjected = 0;
  if (EFFORT) await page.route('**/api/proxy', async route => {
    const r = route.request();
    if (r.method() !== 'POST') return route.continue();
    try {
      const b = JSON.parse(r.postData() || '{}');
      const sys = String(((b.messages||[]).find(m=>m.role==='system')||{}).content || '');
      // Author calls only — the big prose payload. Leave specialist//repair passes on their own routing.
      if (sys.length > 50000) { b.reasoningEffort = EFFORT; effortInjected++;
        return route.continue({ postData: JSON.stringify(b) }); }
    } catch (_) {}
    return route.continue();
  });
  // COST CAPTURE: the '[SCENE-COST] by category:' line carries the dollar breakdown and was previously cut by
// the 180-char truncation, so runs could not self-report spend. Log it in FULL and accumulate a running total.
let costTotal=0, costScenes=0;
// FULL console trail to disk. The selective filter below is for human readability, but it made the scene-8
// stall undiagnosable: the scene generated, hard-failed the tension gate, was accepted and BILLED, then never
// mounted — and every line between SCENE-COST and the mount was filtered away. Unfiltered capture means the
// next stall is diagnosable from the artifact instead of costing another run.
const RAWLOG = (process.env.OUT || `/tmp/arm_${SPINE}.json`) + '.console.log';
try { fs.writeFileSync(RAWLOG, ''); } catch(_){}
page.on('console', m => { try { fs.appendFileSync(RAWLOG, m.text() + '\n'); } catch(_){} });
page.on('pageerror', e => { try { fs.appendFileSync(RAWLOG, '[PAGEERROR] ' + (e && e.message) + '\n' + ((e&&e.stack)||'') + '\n'); } catch(_){} });
page.on('console', m => { const t=m.text();
    if (/SCENE-COST\] by category/.test(t)) {
      log('  pg>', t);
      const ds=(t.match(/\$[0-9.]+/g)||[]).map(x=>parseFloat(x.slice(1)));
      if (ds.length){ const sub=ds.reduce((a,b)=>a+b,0); costTotal+=sub; costScenes++; log(`  [cost] scene≈$${sub.toFixed(4)}  running=$${costTotal.toFixed(2)} over ${costScenes} scenes (mean $${(costTotal/costScenes).toFixed(3)})`); }
      return;
    }
    if (/PLAN-SPINE|SPINE-STAGING|GROK-LIT\] author|TENSION GATE|MODEL-ROUTE:PROSE|SCENE-COST\] LLM|MOCK|RENDER/.test(t)) log('  pg>', t.slice(0,180)); });
// AUTHOR-BOUNDARY CAPTURE — proves the spine reaches the author on THIS run, off the wire. Checked after the
// first turn and the run ABORTS if absent, so a broken authority path costs one scene instead of twenty.
const authorSys=[];
page.on('request', r => {
  if (!/\/api\//.test(r.url()) || r.method()!=='POST') return;
  try { const b=JSON.parse(r.postData()||'{}'); const s=(b.messages||[]).find(m=>m.role==='system');
        if (s && String(s.content).length>3000) authorSys.push(String(s.content)); } catch(_){}
});

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout:40000 });
  await page.waitForTimeout(800);

  await page.evaluate((cfg) => {
    ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger'].forEach(k=>localStorage.removeItem(k));
    const s = window.state;
    // Neutralize the telemetry audits: each does a callChat that contends for the prose lock (and costs money).
    window._auditSceneEmotionalGravity = () => Promise.resolve(null);
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture',
     '_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(f=>{ try{ window[f]=()=>Promise.resolve(null); }catch(_){} });
    window._devBypass = true;
    const def = (window.STARTER_STORIES||[]).find(d=>d && d.id==='starter_first_sacrifice');
    s.picks = s.picks || {};
    s.picks.world=def.world; s.picks.worldSubtype=def.worldSubtype; s.picks.pressure=def.pressure; s.picks.flavor=def.flavor;
    s.picks.tone=def.tone; s.picks.pov=def.pov; s.picks.length=def.length; s.picks.dynamic=def.dynamic;
    s.picks.pcSpecies=def.pcSpecies; s.picks.liSpecies=def.liSpecies;
    s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
    s._starterId=def.id; s.is_starter_story=true; s._starterStoryFreeInput=true;
    s.immutableTitle=def.title; s.storyTitle=def.title;
    s.archetype={primary:def.archetype,modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.loveInterest='Male'; s.loveInterestName='Julian'; s.liGender='male';
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.picks.playermask='OPEN_VEIN';
    // Ungated tier — taste/free is the preview slice and silently returns at the paywall.
    s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true; s.fortunes=9999999;
    s.previewActive=false; s.previewProductId=null; s._skipCorridorValidation=true;
    s.intensity='Steamy'; s.name='Lirael'; s.pov='first_person'; s.turnCount=0;
    s.playerName='Lirael'; s.partnerName='Julian';
    s.identity={playerName:'Lirael',partnerName:'Julian',displayPlayerName:'Lirael',displayPartnerName:'Julian'};
    s.picks.identity=s.identity;
    try{ const p=document.getElementById('playerNameInput'); if(p)p.value='Lirael'; const l=document.getElementById('partnerNameInput'); if(l)l.value='Julian'; }catch(_){}
    s._pcLookSkipped=true; s.pcLookLocked=true;
    s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    // THE ONE VARIABLE.
    window._usePlanSpine = true;
    if (cfg.spine && cfg.spine.scenes) window.STARTER_PLANS['starter_first_sacrifice'] = cfg.spine;
    console.log('[RENDER] spine=' + (cfg.spine ? 'generated ('+cfg.spine.scenes.length+')' : 'hand-authored STARTER_PLANS'));

    if (cfg.mock) {   // FREE path: no LLM. Commit through the same store the app uses.
      const SP=window.StoryPagination; try{ SP.clear(); }catch(_){}
      document.getElementById('submitBtn').addEventListener('click', function(e){
        e.stopImmediatePropagation(); e.preventDefault();
        if (s._isAdvancingScene) { window.__dbl=(window.__dbl||0)+1; console.log('[MOCK] DOUBLE-CLICK — BUG'); return; }
        s._isAdvancingScene=true; s._advanceStartedAt=Date.now();
        fetch('/api/__mock_delay').then(()=>{ SP.addPage('<p>MOCK scene '+(SP.getPageCount()+1)+' '+'x'.repeat(1600)+'</p>', true);
          s.turnCount=(s.turnCount||0)+1; s._isAdvancingScene=false; console.log('[MOCK] committed page '+SP.getPageCount()); });
      }, true);
    }
  }, { spine: SPINE_PLAN, mock: MOCK });

  const ok = await page.evaluate(()=>!!(window._usePlanSpine===true && window.STARTER_PLANS['starter_first_sacrifice']));
  if (!ok) { log('RENDER-ERR spine not installed'); await browser.close(); process.exit(1); }

  // Authoritative committed-scene count: the page store the app writes EVERY scene to
  // (scene 1 at app.js:251327, turns likewise). Short pages (title/interstitial) filtered by length.
  const count = () => page.evaluate((MIN)=>{
    const SP=window.StoryPagination; const raw=(SP&&SP.getPages)?(SP.getPages()||[]):[];
    return raw.map(h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).filter(t=>t.length>MIN).length;
  }, PAGE_MIN);
  const readPage = (k) => page.evaluate(({k,MIN})=>{
    const SP=window.StoryPagination; const raw=(SP&&SP.getPages)?(SP.getPages()||[]):[];
    const st=h=>String(h||'').replace(/<[^>]+>/g,'\n').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
      .replace(/&#39;|&rsquo;/g,"'").replace(/&quot;|&ldquo;|&rdquo;/g,'"').replace(/&mdash;/g,'—')
      .replace(/\n{3,}/g,'\n\n').replace(/[ \t]+/g,' ').trim();
    return raw.map(st).filter(t=>t.replace(/\s+/g,' ').length>MIN)[k-1]||'';
  }, {k,MIN:PAGE_MIN});

  // Wait for the committed count to exceed `from`. ONE click per scene — never a re-click on a timer.
  async function waitFor(from, label){
    const t0=Date.now(); let last=-1, stable=0;
    while (Date.now()-t0 < SCENE_TIMEOUT){
      await page.waitForTimeout(2500);
      const n=await count();
      if (n>from){ if(n===last){ stable+=2500; if(stable>=5000) return n; } else { last=n; stable=0; } }
      if ((Date.now()-t0) % 60000 < 2600) log(`    [${label}] committed=${n} t+${Math.round((Date.now()-t0)/1000)}s`);
    }
    const fin=await count();
    if (fin>from){ log(`    [${label}] timeout but committed=${fin} — instrument lag, accepting`); return fin; }
    return null;
  }

  log(`[render] spine=${SPINE} target=${TARGET}${MOCK?' (MOCK — free)':''}`);
  await page.evaluate((mock)=>{ if(!mock) window.handleBeginStory(); else document.getElementById('submitBtn').click(); }, MOCK);
  let n = await waitFor(0, 'scene1');
  if (!n){ log('[render] scene 1 never committed — stopping'); persist(false); await browser.close(); process.exit(2); }
  scenes.push({ n:1, text: await readPage(1), action:'(begin)', dialogue:'' });
  persist(false);
  log(`[render] scene 1 committed  len=${scenes[0].text.length}`);

  for (let k=2; k<=TARGET; k++){
    const inp = INPUTS[k-2] || INPUTS[INPUTS.length-1];
    const before = n;
    await page.evaluate((args)=>{
      const s=window.state;
      // One-shot gates the harness must clear each turn (paywall flag is consumed in a finally, app.js:123890).
      s._cliffhangerContinueAuthorized = true;
      s._petitionEmergenceFired = true; s._petitionEmergenceArmed = false;
      s._deckExamineFired = true; s._deckExamineArmed = false;
      try{ if(typeof s._deckExamineSubmitGateCleanup==='function'){ s._deckExamineSubmitGateCleanup(); s._deckExamineSubmitGateCleanup=null; } }catch(_){}
      try{ if(typeof s._petitionEmergenceSubmitGateCleanup==='function'){ s._petitionEmergenceSubmitGateCleanup(); s._petitionEmergenceSubmitGateCleanup=null; } }catch(_){}
      try{ if(typeof window.closeZoomedCard==='function') window.closeZoomedCard(); }catch(_){}
      document.getElementById('actionInput').value = args.a;
      document.getElementById('dialogueInput').value = args.d;
      const b=document.getElementById('submitBtn'); if(b){ b.disabled=false; b.click(); }
    }, inp);
    n = await waitFor(before, 'scene'+k);
    if (!n){ log(`[render] scene ${k} never committed — stopping with ${scenes.length} scenes persisted`); persist(false); break; }
    scenes.push({ n:k, text: await readPage(n), action:inp.a, dialogue:inp.d });
    persist(false);                                   // ← immediate; a reap costs minutes, not the arm
    // FAIL FAST at the author boundary (gen arm only — the hand spine names no places, so the compiler is
    // inert for it by design and its goals are state phases the old path already carried).
    if (k===2 && SPINE==='gen' && !MOCK){
      const hit = authorSys.filter(t=>/SPINE EVENT — MUST STAGE/.test(t));
      log(`[boundary] author payloads with the verbatim SPINE EVENT block: ${hit.length}/${authorSys.length}`);
      if (!hit.length){ log('[boundary] ABORT — the spine never reached the author. Not spending 18 more scenes.'); persist(false); await browser.close(); process.exit(4); }
    }
    log(`[render] scene ${k} committed  len=${scenes[scenes.length-1].text.length}  (${scenes.length}/${TARGET})`);
  }

  const dbl = MOCK ? await page.evaluate(()=>window.__dbl||0) : 0;
  await browser.close();
  persist(scenes.length === TARGET);
  log(`\n[render] DONE spine=${SPINE} scenes=${scenes.length}/${TARGET} → ${scenes.length===TARGET?OUT:OUT+'.partial'}`);
  if (costScenes) log(`[render] MEASURED SPEND: $${costTotal.toFixed(2)} over ${costScenes} scenes (mean $${(costTotal/costScenes).toFixed(3)}/scene)  [app self-report; excludes reasoning tokens — reconcile vs xAI console]`);
  if (EFFORT) log(`[render] reasoningEffort='${EFFORT}' injected into ${effortInjected} author call(s)`);
  if (MOCK){
    const pass = scenes.length===TARGET && dbl===0;
    log(`[MOCK] double-clicks=${dbl}  persisted=${scenes.length}/${TARGET}  ${pass?'✅ CLEAN — 20 inputs → 20 persisted outputs':'❌ FAILED'}`);
    process.exitCode = pass?0:2;
  }
})().catch(e=>{ log('RENDER-FATAL '+(e&&e.message)); persist(false); process.exit(3); });
