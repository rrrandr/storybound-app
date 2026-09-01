import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);
await page.route('**/*', async r => { const u=r.request().url(), p=u.replace(/^https?:\/\/[^/]+/,'');
  if (isAuthOrigin(u)) return r.fulfill({status:200,contentType:'application/json',body:'{}'});
  if (!/\/api\//.test(p)) return r.continue();
  if (/\/api\/config\b/.test(p)) return r.fulfill({status:200,contentType:'application/json',body:configBody()});
  return r.fulfill({status:200,contentType:'application/json',body:'{}'}); });
await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForFunction(() => window._cpCommitScene && window.buildCharacterDisclosureDirective, { timeout:60000 });
const R = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { storyId:'jess2', playerName:'Ilse', name:'Ilse', loveInterestName:'Adan',
                     partnerName:'Adan', turnCount:1, issueNumber:1 });
  s._relationshipLedger=null; s._characterDisclosureLedger={};
  const jess = window._relEntityForName('Jess',{create:true});
  window._attachPortfolio(jess, [{ category:'value',
    canonical_truth:'She leads with her decolletage to control where attention lands.',
    possible_pressures:[{text:'a room where she is not the focus', evidence_requires:'attention'}],
    forbidden_restatements:[{forbid:'is vain', why:'states it instead of showing the mechanism'}] }],
    { provenance:'generated_cast' });
  const fid = window._relLedger().entities[jess].authorProfile.cPlusFacets[0].facet_id;
  window._cpCommitScene({ sceneUid:'S1', ordinal:1, issue:1,
    delivered:[{canonicalId:jess, facet_id:fid, category:'value'}], appeared:[] });
  // Give the DISCLOSURE ledger a real row for Jess, the way the extractor would.
  const r = window._charLedgerApplyVerified({ name:'Jess', present:true,
    relationshipToPC:'a colleague', newLayer:'grew up performing for a room that never watched',
    vehicle:'dialogue', framing:null }, 1);
  s.turnCount = 18;
  const memo = window.buildCharacterDisclosureDirective() || '';
  return { applied:r && r.status, memoChars:memo.length,
    namesJess:/Jess/i.test(memo),
    hasDisclosureLayer:/never watched/i.test(memo),
    hasDecolletage:/decolletage/i.test(memo),
    hasFacetId: memo.indexOf(fid)!==-1,
    hasCplusWord:/character\+|Character\+/.test(memo),
    excerpt: memo.slice(0,420) };
});
console.log(JSON.stringify(R,null,2));
await ctx.close(); await browser.close(); process.exit(0);
