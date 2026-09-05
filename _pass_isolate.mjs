// FREE — no generation. Feeds Arm R's raw Scene 1 through each post-author pass
// individually and diffs. Identifies which pass makes which edit.
import { chromium } from 'playwright-core';
import fs from 'fs';
const raw = fs.readFileSync('_validate_out/authority_audit_R/raw_author_1.txt','utf8')
  .replace(/^\[(CHARACTERS|TITLE|SYNOPSIS)[^\]]*\]\s*/gm,'').trim();
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/image', r => r.fulfill({status:500,body:'{}'}));
await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForFunction(() => window.state && window.STARTER_STORIES, { timeout:90000 });
const out = await page.evaluate(async (raw) => {
  const s = window.state;
  const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k=> s.picks=(s.picks||{}), 0);
  s.picks=s.picks||{}; Object.assign(s,{world:def.world,worldSubtype:def.worldSubtype,flavor:def.flavor,
    dynamic:def.dynamic,_starterId:def.id,is_starter_story:true,name:'Lirael',playerName:'Lirael',
    loveInterestName:'Julian',partnerName:'Julian',loveInterest:'Male',liGender:'male',
    pov:'first_person',renderMode:'literary',turnCount:0});
  const PASSES = ['_famousFateContractCheck','_repairBodyBibleDump','_repairCalcifiedMoves',
                  '_repairHotOpening','_repairInterlocutorPicturability','_repairNonEnglishLeak',
                  '_repairPCPicturability','_repairLISocialProof','_cheapLineEdit','_reflowSceneDialogueLLM'];
  const res = [];
  for (const p of PASSES) {
    const fn = window[p];
    if (typeof fn !== 'function') { res.push({p, status:'NOT EXPORTED'}); continue; }
    // reset one-shot flags so each pass gets a fair attempt
    delete s._bodyDumpRepairDone; delete s._hotRenderRepairDone; delete s._liSocialProofEstablished;
    let after = raw, err = null;
    try { after = await fn(raw); } catch(e) { err = String(e).slice(0,120); }
    after = (typeof after === 'string') ? after : raw;
    res.push({ p, status: err ? 'THREW: '+err : (after===raw ? 'no-op' : 'CHANGED'),
               before: raw.length, after: after.length, text: after===raw ? '' : after });
  }
  return res;
}, raw);
fs.writeFileSync('_validate_out/pass_isolate.json', JSON.stringify(out,null,1));
for (const r of out) console.log(`  ${r.p.padEnd(32)} ${r.status.padEnd(12)} ${r.before||''}->${r.after||''}`);
await browser.close();
