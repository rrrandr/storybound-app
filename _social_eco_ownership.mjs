// SOCIAL ECOSYSTEM OWNERSHIP — free, no model calls.
//
// The defect: `_socialEcosystem` was memoized on state and cleared NOWHERE — two references in
// the whole file, neither a reset — so a second story in the same session inherited the FIRST
// story's recurring circle. Harmless-looking while a "member" is a role noun crossed with a
// function; not harmless at all once these slots mint canonical character identities, because
// the relationship ledger re-validates storyId on every read and would discard its own entities
// while this cache kept handing out the stale slots that minted them.
//
// usage: node _social_eco_ownership.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nSOCIAL ECOSYSTEM — one story's circle may never become another's\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  // Every call is ANSWERED rather than aborted: an aborted request stalls handleBeginStory long
  // before it reaches the definitions we need. The content is irrelevant here — this suite makes
  // no claim about story output, only about who owns the social circle — but the ENVELOPE shape
  // must be one the real proxy can produce, or the client discards it and stalls anyway.
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const out = JSON.stringify({ ok: true });
    const envelope = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model: b && b.model, usage:{}, _orchestration:{},
          choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  // ── WHY A STORY MUST BE STARTED FIRST (2026-08-28) ──
  // _resolveSocialEcosystem, _ALLY_FUNCTIONS and _socialEcoRecord are all defined INSIDE
  // handleBeginStory() — no scope closes between its declaration and theirs — so on a bare page
  // load none of them exist. We do not need the story to SUCCEED, only for execution to reach
  // their definitions, so the run is raced against a timeout and every API call is refused.
  // (This is also why the ownership stamp is safe by construction: the module cannot be defined,
  // let alone resolve a circle, before _resetStoryState has minted a storyId.)
  await page.waitForFunction(() => typeof window.handleBeginStory === 'function', { timeout:60000 });
  await page.evaluate(() => {
    const s = window.state;
    Object.assign(s, { world:'modern', worldSubtype:'city', flavor:'slow_burn', dynamic:'friends_to_lovers',
      name:'Ava', playerName:'Ava', loveInterestName:'Ben', partnerName:'Ben', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'epic', tier:'epic', access:'sub',
      subscribed:true, fortunes:9999999, intensity:'Steamy', pov:'first_person',
      identity:{ playerName:'Ava', partnerName:'Ben' }, renderMode:'literary', myUid:'probe' });
    s.picks = s.picks || {}; s.picks.identity = s.identity; s._skipCorridorValidation = true;
    try { window.handleBeginStory(); } catch (_) {}
  });
  await page.waitForFunction(() => typeof window._resolveSocialEcosystem === 'function'
    && typeof window._socialEcoRecord === 'function', { timeout:120000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    const base = { storyLength: 'epic', tier: 'epic', archetype: { primary: 'OPEN_VEIN' } };
    const sig = m => (m || []).map(x => x.role + '→' + x.fnKey).join(' | ');
    const out = {};

    // ── A: a story resolves its circle and it is stamped with that story's id ──
    Object.assign(s, base, { storyId: 'story-A', _socialEcosystem: null, _allyFunctionPick: null });
    out.aMembers = sig(window._resolveSocialEcosystem(s));
    out.aRecord  = window._socialEcoRecord(s);
    // stable WITHIN one story — the memo must still memoize
    out.aAgain   = sig(window._resolveSocialEcosystem(s));

    // ── B: a different story must NOT inherit it ──
    s.storyId = 'story-B';
    out.bMembers = sig(window._resolveSocialEcosystem(s));
    out.bRecordStory = (window._socialEcoRecord(s) || {}).storyId;

    // ── save/restore, MATCHING stamp: the circle survives ──
    const savedB = JSON.parse(JSON.stringify(window._socialEcoRecord(s)));
    s._socialEcosystem = savedB; s._allyFunctionPick = null;
    out.bRestored = sig(window._resolveSocialEcosystem(s));

    // ── save/restore, MISMATCHED stamp: discarded ──
    s._socialEcosystem = JSON.parse(JSON.stringify(savedB));
    s._socialEcosystem.storyId = 'story-Z';
    out.mismatched = sig(window._resolveSocialEcosystem(s));
    out.mismatchedStory = (window._socialEcoRecord(s) || {}).storyId;

    // ── legacy UNSTAMPED value (a bare array, as it used to be stored) ──
    s._socialEcosystem = [{ role: 'a ghost from the last story', fnKey: 'BRAKE', fn: { key:'BRAKE', label:'', effect:'', moves:[] } }];
    out.legacy = sig(window._resolveSocialEcosystem(s));
    out.legacyRecordIsStamped = !!(window._socialEcoRecord(s) || {}).v;

    // ── NO storyId: mutate nothing, mint nothing ──
    s.storyId = ''; s._socialEcosystem = null; s._allyFunctionPick = null;
    out.noStory = window._resolveSocialEcosystem(s);
    out.noStoryRecord = window._socialEcoRecord(s);
    out.noStoryPick = s._allyFunctionPick;

    // ── A → B → A: returning to A legitimately rebuilds, and B never kept A's slots ──
    s.storyId = 'story-A'; s._socialEcosystem = null; s._allyFunctionPick = null;
    out.aReturn = sig(window._resolveSocialEcosystem(s));
    out.aReturnStory = (window._socialEcoRecord(s) || {}).storyId;
    out.aReturnCount = (window._socialEcoRecord(s) || {}).slots.length;

    // ── the derived pick never outlives its circle ──
    s.storyId = 'story-A'; s._socialEcosystem = null; s._allyFunctionPick = null;
    window._resolveAllyFunction(s);
    const pickA = s._allyFunctionPick;
    s.storyId = 'story-C';
    window._resolveSocialEcosystem(s);          // discards A's circle
    out.pickClearedOnDiscard = s._allyFunctionPick === null || s._allyFunctionPick === undefined;
    out.pickA = pickA;

    // ── the reset layer reaches it ──
    Object.assign(s, base, { storyId: 'story-D' });
    window._resolveSocialEcosystem(s);
    const beforeReset = !!window._socialEcoRecord(s);
    let reachable = null;
    try { reachable = /state\._socialEcosystem = null/.test(String(window.__resetSrcProbe || '')); } catch (_) {}
    out.beforeReset = beforeReset;
    return out;
  });

  console.log(' 1 · OWNERSHIP');
  t('1a: a story resolves a circle and it is stamped with that story id',
    !!R.aMembers && (R.aRecord || {}).storyId === 'story-A' && (R.aRecord || {}).v === 1,
    JSON.stringify({ members: R.aMembers, rec: R.aRecord && { v: R.aRecord.v, storyId: R.aRecord.storyId } }));
  t('1b: …and it still MEMOIZES within that story — role/function selection is unchanged',
    R.aAgain === R.aMembers, JSON.stringify([R.aMembers, R.aAgain]));

  console.log('\n 2 · THE DEFECT ITSELF');
  t('2a: STORY A\'S CIRCLE DOES NOT ENTER STORY B', R.bMembers !== R.aMembers,
    JSON.stringify({ A: R.aMembers, B: R.bMembers }));
  t('2b: …and B\'s record is stamped to B, not carried from A',
    R.bRecordStory === 'story-B', String(R.bRecordStory));

  console.log('\n 3 · SAVE / RESTORE');
  t('3a: a restored circle whose stamp MATCHES survives intact',
    R.bRestored === R.bMembers, JSON.stringify([R.bMembers, R.bRestored]));
  t('3b: a restored circle stamped to ANOTHER story is discarded and rebuilt',
    R.mismatchedStory === 'story-B' && R.mismatched !== '', JSON.stringify(R.mismatchedStory));
  t('3c: an UNSTAMPED legacy value is discarded once and replaced by a stamped record',
    !/ghost from the last story/.test(R.legacy) && R.legacyRecordIsStamped, JSON.stringify(R.legacy));

  console.log('\n 4 · FAIL CLOSED');
  t('4a: with NO storyId the resolver returns nothing',
    Array.isArray(R.noStory) && R.noStory.length === 0, JSON.stringify(R.noStory));
  t('4b: …and mutates nothing — no record minted, no pick minted',
    !R.noStoryRecord && !R.noStoryPick,
    JSON.stringify({ rec: R.noStoryRecord, pick: R.noStoryPick }));

  console.log('\n 5 · A → B → A');
  t('5a: returning to story A rebuilds under A\'s own ownership',
    R.aReturnStory === 'story-A', String(R.aReturnStory));
  t('5b: …with no duplicate slots — one circle, not two concatenated',
    R.aReturnCount >= 2 && R.aReturnCount <= 4, String(R.aReturnCount));

  console.log('\n 6 · THE DERIVED PICK NEVER OUTLIVES ITS CIRCLE');
  t('6a: _allyFunctionPick is cleared when the circle it came from is discarded',
    R.pickClearedOnDiscard, JSON.stringify({ pickA: R.pickA }));

  console.log('\n 7 · THE RESET LAYER REACHES IT');
  t('7a: the per-story reset clears the ecosystem AND its derived pick',
    /state\._socialEcosystem = null/.test(SRC) && /state\._allyFunctionPick = null/.test(SRC),
    'both must be reset in _resetStoryState, beside _sceneEntityState');
  t('7b: …in the SAME layer as the roster that carries the identical defect',
    (() => {
      const i = SRC.indexOf('state._sceneEntityState = {}');
      const j = SRC.indexOf('state._socialEcosystem = null');
      return i > 0 && j > i && (j - i) < 1200;
    })(), 'the ecosystem reset must sit with the per-story narrative memory it belongs to');
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
