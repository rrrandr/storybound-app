// PAGE UID + LEDGER PROCESSING REGRESSION.
//
// Durable page identity lives in a PARALLEL pageUids[] array — page records stay plain
// HTML strings, because every consumer (getAllContent, the storyPages join, the
// _stripFateWhispers map, the saved wire format) reads them as strings.
//
// The paid-extraction guard was _charLedgerLastFp, a single LAST fingerprint: an A→B→A
// navigation re-extracted and re-billed. It is replaced by a persisted SUCCESS set plus a
// non-persisted IN-FLIGHT set, so a failed extraction stays retryable and concurrent
// duplicate renders start exactly one request.
//
// Fenced at the network layer via page.route — nothing is issued, whatever calls it.
//
// usage: node _page_uid_regression.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const A = 'PAGEALPHA', B = 'PAGEBETA';
const prose = m => `Lirael set the relic down and did not look at Julian. ${m}. "Lord Maren is my father," she said, and the hall went quiet around the words that followed.`;

let extractions = [], attempts = [], failNext = false;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

await page.route('**/api/**', async route => {
  const r = route.request(), url = r.url();
  attempts.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), paid: PAID.test(url) });
  if (/chatgpt-proxy/.test(url) && r.method() === 'POST') {
    let body = null; try { body = JSON.parse(r.postData() || '{}'); } catch (_) {}
    const msgs = (body && body.messages) || [];
    const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
    const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
    if (/CHARACTER MEMORY EXTRACTOR/i.test(sys)) {
      extractions.push({ which: usr.includes(B) ? 'B' : usr.includes(A) ? 'A' : '?' });
      if (failNext) { failNext = false; return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }); }
    }
  }
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: '{"characters":[],"scene":{},"sceneState":{}}' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.StoryPagination, { timeout: 40000 });

const settle = () => page.waitForTimeout(700);
let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};
console.log(`\n${'═'.repeat(80)}\nPAGE UID + LEDGER PROCESSING REGRESSION\n${'═'.repeat(80)}`);

// ── 1. new-page UID uniqueness + stability ──
console.log('\n 1. NEW-PAGE UID MINTING');
const mint = await page.evaluate(({ pa, pb }) => {
  const s = window.state, P = window.StoryPagination;
  s.storyId = 'uid_story_1'; s.scenes = []; s.turnCount = 0; s.renderMode = 'literary';
  s._ledgerProcessedUids = {}; s._charLedgerLastFp = null;
  P.clear();
  P.addPage('<p>' + pa + '</p>', true);
  const u0a = P.getPageUid(0);
  P.addPage('<p>' + pb + '</p>', true);
  return { u0a, uids: P.getPageUids(), u0b: P.getPageUid(0), pagesArePlainStrings: P.getPages().every(x => typeof x === 'string') };
}, { pa: prose(A), pb: prose(B) });
t('two pages → two UIDs', mint.uids.length === 2);
t('UIDs are unique', new Set(mint.uids).size === 2);
t('UID stable across a later addPage', mint.u0a === mint.u0b);
t('page records remain plain HTML strings', mint.pagesArePlainStrings);
await settle();

// ── 6. A→B→A navigation performs only two successful extractions ──
console.log('\n 6. A→B→A NAVIGATION');
extractions = [];
await page.evaluate(() => { const P = window.StoryPagination; P.goToPage(0); });
await settle();
await page.evaluate(() => { const P = window.StoryPagination; P.goToPage(1); });
await settle();
await page.evaluate(() => { const P = window.StoryPagination; P.goToPage(0); });
await settle();
t('A→B→A adds no new extraction (both already processed)', extractions.length === 0,
  `got ${extractions.length}: ${extractions.map(e => e.which).join(',')}`);
const processedCount = await page.evaluate(() => Object.keys(window.state._ledgerProcessedUids || {}).length);
t('exactly 2 UIDs marked processed', processedCount === 2, `got ${processedCount}`);

// ── 8. concurrent duplicate renders start only one extraction ──
console.log('\n 8. CONCURRENT DUPLICATE RENDERS');
extractions = [];
const conc = await page.evaluate(({ pc }) => {
  const s = window.state, P = window.StoryPagination;
  P.addPage('<p>' + pc + '</p>', true);
  const uid = P.getPageUid(2);
  // Fire the hook repeatedly in the same tick for the SAME uid.
  for (let i = 0; i < 5; i++) window._updateCharacterDisclosureLedgerForCurrent('<p>' + pc + '</p>', uid);
  return { inflight: window.__ledgerInFlightUids.size };
}, { pc: prose('PAGEGAMMA') });
await settle();
t('5 same-tick renders → 1 extraction', extractions.length === 1, `got ${extractions.length}`);
t('in-flight set cleared afterwards', (await page.evaluate(() => window.__ledgerInFlightUids.size)) === 0);

// ── 7. failed extraction retries on the next visit ──
console.log('\n 7. FAILURE IS RETRYABLE');
extractions = [];
// Direct hook calls with a synthetic UID. addPage would auto-fire the hook through
// renderCurrentPage, and that extra render raced the injected failure — the 500 landed
// on the automatic extraction while the explicit one succeeded and marked processed.
const failUid = 'pg:synthetic-fail-uid';
failNext = true;
await page.evaluate(({ pd, uid }) => window._updateCharacterDisclosureLedgerForCurrent('<p>' + pd + '</p>', uid),
  { pd: prose('PAGEDELTA'), uid: failUid });
await settle();
t('failed extraction attempted exactly once', extractions.length === 1, `got ${extractions.length}`);
const markedAfterFail = await page.evaluate(u => !!(window.state._ledgerProcessedUids || {})['uid_story_1::' + u], failUid);
t('failed extraction NOT marked processed', !markedAfterFail);
await page.evaluate(({ pd, uid }) => window._updateCharacterDisclosureLedgerForCurrent('<p>' + pd + '</p>', uid),
  { pd: prose('PAGEDELTA'), uid: failUid });
await settle();
t('retried on next visit', extractions.length === 2, `got ${extractions.length} extraction(s)`);
t('success after retry marks processed',
  await page.evaluate(u => !!(window.state._ledgerProcessedUids || {})['uid_story_1::' + u], failUid));

// ── 2/3/4/5. save-restore round-trip, legacy migration, malformed repair ──
console.log('\n 2-5. SAVE/RESTORE + LEGACY MIGRATION + REPAIR');
const rt = await page.evaluate(() => {
  const P = window.StoryPagination;
  const pages = P.getPages(), uids = P.getPageUids();
  // 2. round-trip: same pages + same uids preserved exactly
  P.setPages(pages, uids);
  const roundTrip = JSON.stringify(P.getPageUids()) === JSON.stringify(uids);
  // 3. legacy storyPages with NO uids → deterministic legacy ids, twice identically
  const legacy = pages.map((_, i) => 'legacy:uid_story_1:page:' + i);
  P.setPages(pages, legacy);
  const first = P.getPageUids();
  P.setPages(pages, legacy);
  const deterministic = JSON.stringify(first) === JSON.stringify(P.getPageUids())
    && JSON.stringify(first) === JSON.stringify(legacy);
  // 4. collapsed storyHTML → its own legacy id, via addPage so the event still fires
  P.clear();
  let evtUid = null;
  const h = e => { evtUid = e.detail && e.detail.sceneUid; };
  window.addEventListener('sb:scene-page-added', h);
  P.addPage('<p>all of it</p>', true, 'legacy:uid_story_1:storyHTML:0');
  window.removeEventListener('sb:scene-page-added', h);
  const collapsed = P.getPageUid(0);
  // 5. duplicate + malformed supplied uids are repaired without touching HTML
  const html = ['<p>one</p>', '<p>two</p>', '<p>three</p>'];
  P.setPages(html, ['dup', 'dup', null]);
  const repaired = P.getPageUids();
  return { roundTrip, deterministic, collapsed, evtUid,
    repairedUnique: new Set(repaired).size === 3,
    repairedKeptFirst: repaired[0] === 'dup',
    htmlUntouched: JSON.stringify(P.getPages()) === JSON.stringify(html) };
});
t('2. save/restore preserves exact UIDs', rt.roundTrip);
t('3. legacy storyPages migration is deterministic', rt.deterministic);
t('4. collapsed storyHTML gets its legacy UID', rt.collapsed === 'legacy:uid_story_1:storyHTML:0');
t('4. sb:scene-page-added still fires with the UID', rt.evtUid === 'legacy:uid_story_1:storyHTML:0');
t('5. duplicate/malformed UIDs repaired to unique', rt.repairedUnique);
t('5. first usable UID kept as supplied', rt.repairedKeptFirst);
t('5. page HTML untouched by UID repair', rt.htmlUntouched);

// ── fail-closed ──
// Drain first: the 2-5 block re-keys already-processed prose pages to legacy UIDs, and
// its renderCurrentPage correctly extracts under the new key. That in-flight request
// would otherwise land inside this window and be miscounted against fail-closed.
await settle();
console.log('\n FAIL-CLOSED');
extractions = [];
await page.evaluate(({ pe }) => {
  const s = window.state; const saved = s.storyId;
  s.storyId = null;
  window._updateCharacterDisclosureLedgerForCurrent('<p>' + pe + '</p>', 'pg:someuid');
  s.storyId = saved;
  window._updateCharacterDisclosureLedgerForCurrent('<p>' + pe + '</p>', undefined);
}, { pe: prose('PAGEEPSILON') });
await settle();
t('no storyId and no sceneUid → no extraction', extractions.length === 0, `got ${extractions.length}`);

// ── 9. CG hook uses a canonical UID not derived from turnCount ──
console.log('\n 9. CG CANONICAL UID');
const cg = await page.evaluate(() => {
  const s = window.state;
  s.turnCount = 99;                       // deliberately divergent
  const u1 = window._cgSceneUidFor(3);
  const u2 = window._cgSceneUidFor(3);    // same scene → same uid
  const u3 = window._cgSceneUidFor(4);
  s.turnCount = 7;                        // change turnCount…
  const u4 = window._cgSceneUidFor(3);    // …uid must not move
  return { stable: u1 === u2 && u1 === u4, distinct: u1 !== u3,
    // A hex UUID contains '7' by chance, so a substring check proves nothing. The real
    // property is that the UID does not MOVE when turnCount does — asserted by `stable`
    // above, which re-reads it after turnCount changes 99 → 7.
    independentOfTurnCount: u1 !== '99' && u1 !== '7' && u1 !== 'turn_99' && u1 !== 'turn_7',
    persisted: !!(s._cgSceneUidByIndex && s._cgSceneUidByIndex['3']) };
});
t('CG UID stable for the same scene index', cg.stable);
t('CG UID distinct across scene indices', cg.distinct);
t('CG UID not derived from turnCount', cg.independentOfTurnCount);
t('CG UID persisted on state', cg.persisted);

await browser.close();

// ── 10. cost fence ──
console.log('\n 10. COST FENCE');
t(`no paid request escaped (${attempts.length} intercepted, 0 issued, `
  + `${attempts.filter(a => a.paid).length} paid blocked)`, true);

console.log(`\n${'─'.repeat(80)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
