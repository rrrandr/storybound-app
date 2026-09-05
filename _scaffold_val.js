// B — SCAFFOLD-PATH validation. Generates several varied literary Scene-1s through the REAL scaffold
// path (handleBeginStory), then checks: (F1) no X-or-Y axis-shape question leaks into MAIN prose
// (widget question excluded), (widget) the micro-decision widget still carries its option text,
// (F2) opener fidelity — onboarding case gets the verbatim tarot-deck opener, no deck→clutch malform.
// Attributes any leak by layer. Reloads between cases (two handleBeginStory in one session wedges).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/scaffold_val.json';
function log(...a){ console.error(...a); }

// storyCount 0 = Story 1 (onboarding → deck mandate verbatim). 5 = Story 6 (out of window, no deck).
const CASES = [
  { name:'billionaire-affair (Story6, no-deck)', world:'billionaire', flavor:'affair', subtype:'billionaire_modern', dynamic:'enemies_to_lovers', li:'Dorian', liG:'Male', arch:'DARK_VICE', pc:'Mara', storyCount:5, expectDeck:false },
  { name:'fantasy-soulmates (Story6, no-deck)',  world:'fantasy',     flavor:'soulmates', subtype:'high_court',       dynamic:'forbidden_love',    li:'Kaelen', liG:'Male', arch:'HEART_WARDEN', pc:'Elowen', storyCount:5, expectDeck:false },
  { name:'billionaire ONBOARDING (Story1, deck)', world:'billionaire', flavor:'affair', subtype:'billionaire_modern', dynamic:'enemies_to_lovers', li:'Dorian', liG:'Male', arch:'DARK_VICE', pc:'Mara', storyCount:0, expectDeck:true },
];

// axis-shape question detector (the widget's forbidden shape leaking into prose)
const XY_RE = /[""“]?[A-Z][^.\n?]{5,90}(?:—\s*or|\bor\b)[^.\n?]{2,70}\?[""”]?/g;
function xyQuestions(text){ return (text.match(XY_RE)||[]).map(s=>s.replace(/\n/g,' ').trim()).filter(q=>/\bor\b/.test(q)); }
function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }

async function genCase(page, cfg) {
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function', { timeout:40000 });
  await page.waitForTimeout(500);
  await page.evaluate((cfg)=>{
    try { localStorage.setItem('sb_user_story_count', String(cfg.storyCount)); } catch(_){}
    ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger'].forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
    window.__scenes=[];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity=function(pr){ try{ if(typeof pr==='string'&&pr.length>120) window.__scenes.push({text:pr}); }catch(_){} return Promise.resolve(null); };
    const s=window.state; window._devBypass=true; window._forceAudits=true;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{}; s.picks.world=cfg.world; s.picks.flavor=cfg.flavor; s.picks.dynamic=cfg.dynamic; s.picks.worldSubtype=cfg.subtype; s.picks.playermask='OPEN_VEIN';
    s.world=cfg.world; s.worldSubtype=cfg.subtype; s.flavor=cfg.subtype; s.dynamic=cfg.dynamic;
    s.loveInterest=cfg.liG; s.loveInterestName=cfg.li; s.liGender=cfg.liG.toLowerCase();
    s.archetype={primary:cfg.arch,modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.storyLength=cfg.flavor; s.tier=cfg.flavor; s.intensity='Steamy';
    s.name=cfg.pc; s.pov='first_person'; s.turnCount=0;
    s.playerName=cfg.pc; s.partnerName=cfg.li;
    s.identity={playerName:cfg.pc,partnerName:cfg.li,displayPlayerName:cfg.pc,displayPartnerName:cfg.li};
    s.picks.identity={playerName:cfg.pc,partnerName:cfg.li,displayPlayerName:cfg.pc,displayPartnerName:cfg.li};
    try { const p=document.getElementById('playerNameInput'); if(p)p.value=cfg.pc; const l=document.getElementById('partnerNameInput'); if(l)l.value=cfg.li; } catch(_){}
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s.series_id=null; s.issueIndexInRun=1; s._prefMemory={};  // fresh reader — scaffold widget SHOULD render
  }, cfg);
  await page.evaluate(async ()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  // wait for scene 1
  const t0=Date.now(); let done=false, lastLen=-1, stable=0;
  while (Date.now()-t0 < 300000) {
    await page.waitForTimeout(3000);
    const st=await page.evaluate(()=>{ const a=window.__scenes||[], last=a[a.length-1]||{}; const s=window.state;
      return { n:a.length, busy:!!(s._isAdvancingScene||s._stagedSubmitting), len:(last.text||'').length }; });
    if (st.n>=1 && !st.busy && st.len>150){ if(st.len===lastLen){ stable+=3000; if(stable>=6000){ done=true; break; } } else { lastLen=st.len; stable=0; } }
  }
  const cap = await page.evaluate(()=>{ const a=window.__scenes||[]; const s=window.state;
    // authoritative: the RENDERED prose the reader sees (post all _result enforcement/scrub)
    let dom='';
    try { const el=document.getElementById('storyPagesContainer')||document.getElementById('storyText')||document.getElementById('storyContent'); dom = el ? (el.innerText||el.textContent||'') : ''; } catch(_){}
    return { text:(a[a.length-1]||{}).text||'', domText:dom, widgetQ: s._microDecisionLibraryQuestion||s._scene1PressureAxis||'', suppressed:!!s._scene1MicroSuppressed, sig:s.scene1DirectnessSignal||null }; });
  return { done, cap };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const scrubLogs = [];
  page.on('console', m=>{ const t=m.text();
    if (/AXIS-SHAPE-SCRUB/i.test(t)) { scrubLogs.push(t.slice(0,220)); log('  scrub>', t.slice(0,150)); }
    else if (/BEGIN-ERR|GEN-FAIL:.*DRAFT|SCENE1:SCAFFOLD.*micro|DEMAND-HINT|SCENE 1 MANDATED/i.test(t)) log('  ..', t.slice(0,120)); });

  const results = [];
  for (const cfg of CASES) {
    log(`\n[B] case: ${cfg.name} …`);
    const _scrubBefore = scrubLogs.length;
    let r; try { r = await genCase(page, cfg); } catch(e){ r = { done:false, err:e.message }; }
    const scrubCount = scrubLogs.length - _scrubBefore;
    const text = (r.cap && r.cap.text) || '';           // audit-hook capture (can be PRE-scrub)
    const dom  = (r.cap && r.cap.domText) || '';         // RENDERED prose the reader sees (post-scrub) — authoritative
    const widgetQ = (r.cap && r.cap.widgetQ) || '';
    const scanText = dom.length > 150 ? dom : text;
    const allXY = xyQuestions(scanText);
    // leaks = X-or-Y questions in prose that are NOT the widget question
    const leaks = allXY.filter(q => norm(q) !== norm(widgetQ) && norm(q).indexOf(norm(widgetQ).slice(0,20)) < 0);
    const auditLeaks = xyQuestions(text).filter(q => norm(q) !== norm(widgetQ) && norm(q).indexOf(norm(widgetQ).slice(0,20)) < 0);
    const opener = text.replace(/^\s*\[[^\]]*\]\s*/gm,'').trim().slice(0,160);
    const deckOpener = /great-grandmother'?s?\s+(old\s+)?tarot deck|hand (tightened|tightens) around/i.test(text.slice(0,400));
    const clutchMalform = /clasp on the clutch|didn'?t remember bringing it/i.test(text.slice(0,300)) && !deckOpener;
    const rec = {
      case: cfg.name, generated: !!r.done && text.length>150,
      widgetPresent: !!widgetQ, widgetQuestion: widgetQ,
      allXY_count: allXY.length, leaks, leak_count: leaks.length,
      expectDeck: cfg.expectDeck, deckOpenerPresent: deckOpener, deckMalform: clutchMalform,
      scrubCount, domScanned: dom.length > 150, auditLeakCount: auditLeaks.length, opener
    };
    results.push(rec);
    log(`   gen=${rec.generated} widget="${widgetQ.slice(0,40)}" scrubFired=${scrubCount} DOMleaks(survived)=${rec.leak_count} [auditHookLeaks=${auditLeaks.length}] deckOpener=${deckOpener}`);
    if (rec.leak_count) rec.leaks.forEach(l=>log(`     LEAK: ${l.slice(0,80)}`));
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  log('\n=== B SCAFFOLD-PATH VALIDATION ===');
  let pass = true;
  for (const r of results) {
    const f1 = r.leak_count === 0;
    const widget = r.widgetPresent;
    const f2 = r.expectDeck ? (r.deckOpenerPresent && !r.deckMalform) : true;
    const ok = r.generated && f1 && widget && f2;
    if (!ok) pass = false;
    log(`  ${ok?'✓':'✗'}  ${r.case}`);
    log(`       gen=${r.generated}  widget=${widget?'present':'MISSING'}  F1(no-leak)=${f1?'clean':'LEAK×'+r.leak_count}  ${r.expectDeck?('F2(deck)='+(f2?'verbatim':'MALFORMED')):'F2=n/a'}`);
  }
  log(`\nWROTE ${OUT}`);
  log(`RESULT: ${pass ? '✓ B PASS — no X-or-Y prose leak, widgets present, opener fidelity holds' : '✗ B FAIL — inspect JSON (leak attributed by case)'}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
