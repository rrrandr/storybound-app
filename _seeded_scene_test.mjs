// _seeded_scene_test.mjs — Roman 2026-08-12. CONTROLLED ONE-SCENE CAUSAL-HANDOFF TEST.
// Not a realism test. It creates the HARDEST possible conflict between prior tableau and new spine authority:
// rolling context is the ACTUAL harbor/councilwoman tableau from the failed run's scene 9, and the spine demands
// a marketplace. Can the new SPINE EVENT authority channel move the scene out?
//
// Verifies BOTH links separately, per Roman:
//   DELIVERY  — capture the FINAL author payload off the wire; confirm the verbatim SPINE EVENT block is in it.
//   AUTHORITY — check whether the rendered prose obeyed it.
//
//   SPINE_EVENT=market node _seeded_scene_test.mjs      (test 1)
//   SPINE_EVENT=archives node _seeded_scene_test.mjs    (test 2, only if test 1 passes)
import { chromium } from 'playwright-core';
import fs from 'fs';

const WHICH = (process.env.SPINE_EVENT || 'market').toLowerCase();
const EVENTS = {
  market:   { n:10, goal:"Lirael, hidden behind a market stall, manages to slip a note into Julian's pocket without being seen by the council patrol, indicating a safe meeting place.",
              act:'I pull back, suddenly afraid of how much I want this.', dia:"I shouldn't be here.",
              must:[['marketplace / market stall',/market|stall|vendor|barrow|awning|hawker/i],
                    ['Julian present',/julian/i],
                    ['covert note transfer',/(note|paper|scrap|slip of)/i],
                    ['patrol / discovery pressure',/patrol|guard|watchman|sentry|seen|unseen|spotted|caught|conceal|hidden/i]] },
  // n=10 deliberately, matching the market test. At n=19 (turnCount 17) the run sits on the issue boundary and
  // the plan-scene lookup never fired — 18 prose payloads, zero spine blocks, no scene. Index is incidental to
  // what is under test here (whether the compiler can move the scene to a place the goal names).
  archives: { n:10, goal:"The council seals the main entrance of the archives just as Lirael slips into a hidden passage.",
              act:'I force the confrontation to a head.', dia:'Choose. Now.',
              must:[['archives',/archive|stacks|records room|repository/i],
                    ['the entrance being sealed',/seal|bar(red|ring)?|lock|shut|clos(e|ing)/i],
                    ['a hidden passage',/passage|corridor|tunnel|hidden door|crawlspace/i],
                    ['Lirael inside / slipping through',/lirael/i]] }
};
const E = EVENTS[WHICH];
if (!E) { console.error('SPINE_EVENT must be market|archives'); process.exit(1); }

// Prior tableau = the REAL scenes 8 and 9 of the failed generated arm.
const prior = JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const S8 = prior[7].text, S9 = prior[8].text;
// Same committed facts as the planner-hop test.
const FACTS = [
 'Julian publicly accepted blame for the forbidden wish.',
 "The youth's First Sacrifice twisted and the cost was already paid.",
 'The council treats the named wish-maker as liable.',
 "A sealed letter bearing Julian's mark reached the counting-house.",
 'The councilwoman confronted Lirael on the harbor path and opened the letter.',
 'The letter reads: it is not about the artifact, it is about the vow.',
 'Lirael agreed to pay the price the councilwoman names.',
 'The true wish-maker is still unidentified.'
].map(f=>({fact:f}));

const log=(...a)=>console.error(...a);
let authorPayloads=[];

const browser = await chromium.launch({ headless:true });
const page = await (await browser.newContext()).newPage();
for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(pat, r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
// DELIVERY CAPTURE — every outgoing prose request, off the wire, before any inference from output.
page.on('request', r => {
  if (!/\/api\//.test(r.url()) || r.method()!=='POST') return;
  try { const b=JSON.parse(r.postData()||'{}');
    const sys=(b.messages||[]).find(m=>m.role==='system'); if(!sys) return;
    if (String(sys.content).length>3000) authorPayloads.push({url:r.url(), model:b.model||b.preferredModel||'?', role:b.role||'?', sys:String(sys.content), usr:String(((b.messages||[]).find(m=>m.role==='user')||{}).content||'')});
  } catch(_){}
});
page.on('console', m=>{ const t=m.text(); if(/PLAN-SPINE|GROK-LIT\] author|SCENE-COST\] LLM|SEEDED/.test(t)) log('  pg>', t.slice(0,160)); });

await page.goto('http://localhost:3000/', {waitUntil:'domcontentloaded', timeout:30000});
await page.waitForFunction(()=>window.state && typeof window.handleBeginStory==='function' && window.StoryPagination, {timeout:40000});
await page.waitForTimeout(800);

await page.evaluate((cfg)=>{
  const s=window.state;
  ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger'].forEach(k=>localStorage.removeItem(k));
  window._auditSceneEmotionalGravity=()=>Promise.resolve(null);
  ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture',
   '_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(f=>{try{window[f]=()=>Promise.resolve(null);}catch(_){}});
  window._devBypass=true;
  const def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  s.picks=s.picks||{};
  s.picks.world=def.world; s.picks.worldSubtype=def.worldSubtype; s.picks.pressure=def.pressure; s.picks.flavor=def.flavor;
  s.picks.tone=def.tone; s.picks.pov=def.pov; s.picks.length=def.length; s.picks.dynamic=def.dynamic;
  s.picks.pcSpecies=def.pcSpecies; s.picks.liSpecies=def.liSpecies;
  s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
  s._starterId=def.id; s.is_starter_story=true; s._starterStoryFreeInput=true;
  s.immutableTitle=def.title; s.storyTitle=def.title;
  s.archetype={primary:def.archetype,modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
  s.loveInterest='Male'; s.loveInterestName='Julian'; s.liGender='male';
  s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.picks.playermask='OPEN_VEIN';
  s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true; s.fortunes=9999999;
  s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy';
  s.name='Lirael'; s.pov='first_person'; s.playerName='Lirael'; s.partnerName='Julian';
  s.identity={playerName:'Lirael',partnerName:'Julian',displayPlayerName:'Lirael',displayPartnerName:'Julian'};
  s.picks.identity=s.identity; s._pcLookSkipped=true; s.pcLookLocked=true;
  s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';

  console.log('[SEEDED] state pinned; generating scene 1 to INITIALIZE the story');
}, {});

// The turn path needs a REAL initialized story (A-plot, bibles, rPlot, POV, seed context). Skipping this
// produced a generic default romance — tavern, third-person, no Fatelands canon — and made the first attempt
// at this test meaningless. Pay for scene 1, then overwrite the tableau.
await page.evaluate(()=>window.handleBeginStory());
{
  let w=0; while (w<600000){ await page.waitForTimeout(3000); w+=3000;
    const n=await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length);
    if (n>=1){ await page.waitForTimeout(5000); break; } }
}
log('[seeded] story initialized (scene 1 generated)');

await page.evaluate((cfg)=>{
  const s=window.state;
  // ── NOW overwrite with THE PRIOR TABLEAU the spine must overcome ──
  const SP=window.StoryPagination; try{SP.clear();}catch(_){}
  SP.addPage('<p>'+cfg.s8.replace(/\n+/g,'</p><p>')+'</p>', true);
  SP.addPage('<p>'+cfg.s9.replace(/\n+/g,'</p><p>')+'</p>', true);
  s._sceneTextRing=[{text:cfg.s8},{text:cfg.s9}];
  s._priorSceneText=cfg.s9;
  // Seed the ACTUAL location carriers to the harbor too. The previous attempt left these holding scene 1's
  // Veilwood clearing, so the "prior tableau" was a blend of two contexts and the contest was not clean.
  s._committedState={facts:cfg.facts, pendingIntent:null,
    tableau:{ forScene:cfg.n-1, setting:'the harbor path at dusk, below the pilings',
              charactersPresent:['Lirael','the councilwoman','the youth'],
              protagonistStatus:'holding the failing youth, having agreed to pay the price',
              decisiveChange:'the councilwoman named her price and Lirael accepted',
              activeInterlocutor:'the councilwoman', protagonistAlone:false } };
  s._sceneStateCard = s._committedState.tableau;
  s.sceneSkeleton = Object.assign({}, s.sceneSkeleton||{}, { environment_anchor:'the salt-slick harbor railing', staged_characters:[{name:'Lirael',presence_mode:'IN_PERSON',role:'protagonist'},{name:'the councilwoman',presence_mode:'IN_PERSON',role:'antagonist'}] });
  s.turnCount=cfg.n-2;                       // _planSceneNum = turnCount+2 → the target scene
  s._cliffhangerContinueAuthorized=true;
  s._petitionEmergenceFired=true; s._petitionEmergenceArmed=false;
  s._deckExamineFired=true; s._deckExamineArmed=false;

  // ── INJECT THE SPINE ──
  window._usePlanSpine=true;
  window.STARTER_PLANS['starter_first_sacrifice']={issue:1, scenes:[{n:cfg.n, goal:cfg.goal}]};
  console.log('[SEEDED] prior=harbor tableau (scenes 8-9 verbatim) · turnCount='+s.turnCount+' · spine n='+cfg.n);
}, {s8:S8, s9:S9, facts:FACTS, n:E.n, goal:E.goal});

log(`\n[seeded] SPINE_EVENT=${WHICH}  target scene n=${E.n}`);
log(`[seeded] prior tableau = real harbor/councilwoman scenes 8-9 from the failed arm`);

// RACE: scene 1's post-processing can still hold _isAdvancingScene when we click, and the submit handler
// returns early until the 90s stale-lock threshold — the click is swallowed and the run waits out the timeout
// (archives failed this way twice; the market run happened to win the race). Wait for a genuinely idle engine.
for (let i=0;i<40;i++){
  const busy = await page.evaluate(()=>!!(window.state._isAdvancingScene||window.state._stagedSubmitting||window.state._stagedAwaitingProse));
  if (!busy) break;
  await page.waitForTimeout(3000);
}
await page.evaluate(()=>{ window.state._isAdvancingScene=false; window.state._advanceStartedAt=null; });
log('[seeded] engine idle — clicking');
const before = await page.evaluate(()=> (window.StoryPagination.getPages()||[]).length);
await page.evaluate((inp)=>{
  document.getElementById('actionInput').value=inp.a;
  document.getElementById('dialogueInput').value=inp.d;
  const b=document.getElementById('submitBtn'); b.disabled=false; b.click();
}, {a:E.act, d:E.dia});

let n=before, waited=0;
while (waited < 600000){
  await page.waitForTimeout(3000); waited+=3000;
  const cur=await page.evaluate(()=> (window.StoryPagination.getPages()||[]).length);
  if (cur>before){ await page.waitForTimeout(4000); n=cur; break; }
  if (waited%60000===0) log(`    …waiting ${waited/1000}s`);
}
const scene = n>before ? await page.evaluate((MIN)=>{
  const raw=window.StoryPagination.getPages()||[];
  const st=h=>String(h||'').replace(/<[^>]+>/g,'\n').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&rsquo;/g,"'").replace(/&quot;|&ldquo;|&rdquo;/g,'"').replace(/&mdash;/g,'—').replace(/\n{3,}/g,'\n\n').trim();
  return st(raw[raw.length-1]);
}, 1200) : '';
await browser.close();

// ── LINK 1: DELIVERY ──
const withSpine = authorPayloads.filter(p=>/SPINE EVENT — MUST STAGE/.test(p.sys));
console.log('\n\n═══════════ LINK 1 — DELIVERY (captured off the wire) ═══════════');
console.log(`large prose payloads captured: ${authorPayloads.length}   containing the SPINE EVENT block: ${withSpine.length}`);
if (withSpine.length){
  const blk = withSpine[withSpine.length-1].sys.match(/\n\s*SPINE EVENT — MUST STAGE[\s\S]*?(?=\n\s*SCENE SPINE — THE STATE CHANGE)/);
  console.log('\n--- SPINE EVENT BLOCK, verbatim from the final author payload ---');
  console.log(blk ? blk[0].trim() : '(header matched but block not extractable)');
  const verbatimOk = withSpine[withSpine.length-1].sys.includes(E.goal);
  console.log('\ngoal string byte-identical in payload: ' + (verbatimOk?'✅ YES':'❌ NO — it was altered en route'));
} else {
  console.log('❌ DELIVERY FAILED — no author payload contained the block. Do not interpret the prose below.');
}

// ── LINK 2: AUTHORITY ──
console.log('\n\n═══════════ LINK 2 — AUTHORITY (did the prose obey?) ═══════════');
if (!scene){ console.log('no scene rendered'); process.exit(2); }
// SANITY GATE — the first attempt at this test rendered a generic default romance (tavern, third person)
// because the story was never initialized. If the right story did not render, the probe means nothing.
// NOTE: an earlier version required the name "Lirael" — invalid, because a first-person narrator does not
// name herself, and it false-failed a perfectly good run. Gate on first-person voice + Fatelands canon instead.
const rightStory = /\bI\b/.test(scene) && /(julian|council|weave|sacrific|veilwood|first favored|youth)/i.test(scene);
if (!rightStory) console.log('⚠️  SANITY GATE FAILED — this is not the seeded first-person Lirael story. Test INVALID; ignore everything below.');
// Evidence, not booleans: the previous probe "passed" on "merchant's stall" in a flashback. Show the match
// so a false positive is visible on sight. The verdict is HUMAN.
const snip=(re)=>{ const m=scene.match(new RegExp('.{0,45}'+re.source+'.{0,45}','i')); return m?('…'+m[0].replace(/\n/g,' ').trim()+'…'):null; };
const hits = E.must.map(([label,re])=>[label, re.test(scene), snip(re)]);
hits.forEach(([l,ok,s])=>console.log('  '+(ok?'matched  ':'MISSING  ')+l+(s?'\n             evidence: '+s:'')));
const tableau=[['harbor',/harbor/i],['councilwoman',/councilwoman/i],['the sealed letter',/letter/i]].filter(([l,re])=>re.test(scene));
console.log('\n  old tableau still present: '+(tableau.length?'⚠ '+tableau.map(t=>t[0]).join(', '):'none'));
const pass = rightStory && hits.every(([,ok])=>ok) && withSpine.length>0;
console.log('\n  PROBE: ' + (pass?'all required elements matched':'one or more required elements missing'));
console.log('  ⚠ The probe is keyword-based and has produced a FALSE PASS before. Read the scene below; your judgment governs.');

console.log('\n\n═══════════ RENDERED SCENE ═══════════\n');
console.log(scene);
fs.writeFileSync(`/tmp/seeded_${WHICH}.json`, JSON.stringify({which:WHICH, goal:E.goal, delivered:withSpine.length>0, pass, scene, spineBlockPresent:withSpine.length>0}, null, 2));
process.exitCode = pass?0:2;
