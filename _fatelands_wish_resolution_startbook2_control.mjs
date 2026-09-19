// FATELANDS WISH-RESOLUTION LEDGER — REAL window.startBook2() ISSUE-TRANSITION + SAVE/RELOAD
// CONTROL (Roman, 2026-09-20)
//
// Direct clone of _fatelands_manifestation_startbook2_control.mjs's technique, adapted for the new
// generic wish-resolution ledger. The prior dry control (_fatelands_wish_resolution_ledger_control.mjs)
// proved persistence/Issue-transition survival STRUCTURALLY (the real saveStorySnapshot/
// _resetStoryState/startBook2 source text never references the ledger key). Real review flagged
// that as weaker than a live round trip. This is the named, real-browser acceptance test that
// closes that gap: the REAL production Book/Issue transition — window.startBook2() — via the app's
// own existing, purpose-built headless test hook (window._book2TestBypass), the same real function
// the sibling manifestation-ledger control already drives. Not a reimplemented stub: the real
// _fatelandsRegisterWishResolution, _fatelandsUpdateWishResolutionStatus,
// buildFatelandsWishResolutionLedgerDirective, startBook2, saveAndExitStory, continueStory.
//
// Proves: a wish resolution registered (then updated, e.g. active -> arrested) during "Book 1"
// survives the REAL startBook2() transition (a genuinely new storyId, issueIndexInRun incremented,
// _resetStoryState fired) with its wishId and CURRENT status/effectGrammar intact — then survives a
// REAL save + reload on top of that. No provider/image calls: all title/blurb/Scene-1 generation
// calls startBook2() makes are intercepted at the network boundary and answered with plain stubbed
// prose (this proof does not test Book 2's generated content, only whether the ledger survives the
// transition around it). Requires a running dev server on :3000 (this session found one already
// running: `vercel dev --listen 3000`) — a named, real-browser acceptance test, not an incidental
// health-check probe.
//
// usage: node _fatelands_wish_resolution_startbook2_control.mjs
import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 900) : '')); };

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const MODEL_RE = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy|image)\b/;
let modelCalls = 0;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('console', () => {});

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });
await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  const p = url.split('?')[0];
  if (PASSTHROUGH.test(url)) {
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  const stub = Object.keys(LOCAL_STUB).find(x => p.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL_STUB[stub]) });
  if (MODEL_RE.test(p)) {
    modelCalls++;
    // startBook2's title/blurb/Scene-1 calls are plain user-role prompts with no classifying
    // structure — a well-formed plain prose string satisfies all three call sites (title/blurb use
    // it as text directly; Scene-1's parseScene1Response degrades gracefully without the [TITLE:]/
    // [SYNOPSIS:] markers, which is all this proof needs — it does not test Book 2's prose quality).
    const content = 'A quiet street, and a promise neither of them had said aloud yet, waiting to be kept or broken.';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'harness', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }], image: null }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

console.log('\n' + '='.repeat(96) + '\nFATELANDS WISH-RESOLUTION LEDGER — real window.startBook2() transition control\n' + '='.repeat(96) + '\n');

async function waitForBoot(pg) {
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    try {
      await pg.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await pg.waitForFunction(() => window.state && window.startBook2 && window._fatelandsRegisterWishResolution &&
        window._fatelandsUpdateWishResolutionStatus && window.buildFatelandsWishResolutionLedgerDirective &&
        window.saveAndExitStory && window.continueStory, null, { timeout: 60000 });
      await pg.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
      return true;
    } catch (_) { await pg.waitForTimeout(3000); }
  }
  return false;
}
ok('page boots with the real startBook2 + wish-resolution ledger functions exposed', await waitForBoot(page));
await page.waitForTimeout(1000);

// ═══ SETUP: an ordinary Fatelands Fantasy "Book 1" in progress, past the setup gate ═══
const BOOK1_STORY_ID = await page.evaluate(() => {
  const s = window.state;
  s.picks = Object.assign(s.picks || {}, {
    world: 'Fantasy', worldSubtype: 'the_veilwood', tone: 'Yearning', flavor: 'Forbidden',
    dynamic: 'Fated', pov: 'first_person', length: 'fling', intensity: 'low',
    archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
  });
  Object.assign(s, {
    world: 'Fantasy', fantasyRegion: 'the_veilwood', archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
    access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'low', pov: 'first_person',
    renderMode: 'literary', currentEngine: 'literary', turnCount: 8, book_complete: false,
    storyId: 'book1-' + Math.random().toString(36).slice(2, 8), myUid: 'probe', _skipCorridorValidation: true,
    immutableTitle: 'The Sash and the Sworn', backCoverSynopsis: 'placeholder — not under test here',
  });
  s.picks.identity = s.identity;
  delete s.fateMode;
  return s.storyId;
});
ok('an ordinary Fatelands Fantasy "Book 1" story is seeded (world=Fantasy, not a starter, not Famous Fate)', !!BOOK1_STORY_ID);

// ═══ Register a wish resolution mid-Book-1, same as real play would (real First Sacrifice shape) ═══
const reg = await page.evaluate(() => window._fatelandsRegisterWishResolution('seren_wish', {
  wishingEntityId: 'seren',
  statedWish: 'the one Lirael lost (deliberately unnamed in-scene)',
  sacrificeCost: 'the memory of the night her mother sang her to sleep before the fever took her voice',
  alignmentStatus: 'misaligned',
  alignmentBasis: { kind: 'unattributed_narrative_recognition' },
  resolutionClass: 'ordinary_misaligned_wish',
  effectGrammar: ['quiet_pull', 'unsettling_recognition'],
  status: 'active',
}));
ok('a wish resolution is registered during "Book 1"', !!reg && reg.wishingEntityId === 'seren' && reg.status === 'active', JSON.stringify(reg));
const updated = await page.evaluate(() => window._fatelandsUpdateWishResolutionStatus('seren_wish', {
  status: 'arrested',
  effectGrammar: ['quiet_pull', 'unsettling_recognition', 'unexplained_arrest'],
  publicConsequence: 'The presiding Dohkar publicly charged Seren; the rite\'s weight turned toward Lirael as the one who must conduct it.',
}));
ok('the wish resolution is updated (active -> arrested, effect grammar extended) before the transition', !!updated && updated.status === 'arrested' && updated.effectGrammar.includes('unexplained_arrest'));

// ═══ THE REAL PRODUCTION TRANSITION — window.startBook2(), via its own real headless test hook ═══
const beforeModelCalls = modelCalls;
const transition = await page.evaluate(async () => {
  window._book2TestBypass = true;
  // startBook2() reads state.main_characters_locked and state.series_id BEFORE its own bypass
  // branch would populate them (captured into locals near the top of the function) — set the same
  // preconditions a fully-played Book 1 would already carry by this point.
  window.state.main_characters_locked = {
    playerName: 'Lirael', partnerName: 'Julian', displayPlayerName: 'Lirael', displayPartnerName: 'Julian',
    playerGender: 'Female', partnerGender: 'Male', playerPronouns: 'She/Her', partnerPronouns: 'He/Him',
  };
  window.state.series_id = 'series-' + window.state.storyId;
  let threw = null;
  try {
    await Promise.race([
      window.startBook2(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout90s')), 90000)),
    ]);
  } catch (e) { threw = String((e && e.message) || e); }
  return {
    threw,
    newStoryId: window.state.storyId,
    issueIndexInRun: window.state.issueIndexInRun,
    ledger: window.state._fatelandsWishResolutionLedger,
  };
});
const modelCallsDuringTransition = modelCalls - beforeModelCalls;
console.log('  [DIAG] transition result: ' + JSON.stringify({ threw: transition.threw, newStoryId: transition.newStoryId, issueIndexInRun: transition.issueIndexInRun }));
console.log('  [DIAG] model/proxy calls made during the real transition (all stubbed, zero real spend): ' + modelCallsDuringTransition);
// _mountAndTransition (the DOM-heavy Book-2 cover/scene mount) may legitimately throw headless even
// WITH the bypass — the reset/carry/storyId work this proof cares about happens strictly BEFORE
// that call. A thrown mount tail is tolerated; the assertions below are what actually verify it.
if (transition.threw) console.log('  [NOTE] startBook2() reported an error (tolerated if the ledger below is correct — likely the DOM-mount tail, not the reset/carry): ' + transition.threw);

ok('the real startBook2() transition produced a GENUINELY NEW storyId (a real new Issue, not a no-op)', transition.newStoryId && transition.newStoryId !== BOOK1_STORY_ID, transition.newStoryId + ' vs ' + BOOK1_STORY_ID);
ok('issueIndexInRun advanced past 1 (the real Issue-transition bump, not a manual field edit)', transition.issueIndexInRun > 1, transition.issueIndexInRun);
const ledgerAfter = transition.ledger;
ok('the wish-resolution ledger ROW survived the REAL _resetStoryState() inside startBook2() — same wishId', !!ledgerAfter && !!ledgerAfter.seren_wish && ledgerAfter.seren_wish.wishId === 'seren_wish', JSON.stringify(ledgerAfter && ledgerAfter.seren_wish));
ok('the CURRENT recorded status (the updated "arrested", not the original "active") survived the real transition', !!ledgerAfter && !!ledgerAfter.seren_wish && ledgerAfter.seren_wish.status === 'arrested', ledgerAfter && ledgerAfter.seren_wish && ledgerAfter.seren_wish.status);
ok('the CURRENT recorded effectGrammar (including the later-added unexplained_arrest) survived the real transition', !!ledgerAfter && !!ledgerAfter.seren_wish && Array.isArray(ledgerAfter.seren_wish.effectGrammar) && ledgerAfter.seren_wish.effectGrammar.includes('unexplained_arrest'), JSON.stringify(ledgerAfter && ledgerAfter.seren_wish && ledgerAfter.seren_wish.effectGrammar));

const postTransitionDirective = await page.evaluate(() => { window.state.turnCount = window.state.turnCount || 1; return window.buildFatelandsWishResolutionLedgerDirective(); });
ok('the shared directive surfaces the carried-forward wish resolution immediately after the real transition (in the NEW Issue)', /seren_wish/.test(postTransitionDirective) && /unexplained_arrest/.test(postTransitionDirective), postTransitionDirective.slice(0, 400));

// ═══ THEN a real save + reload ON TOP of the real transition ═══
await page.evaluate(() => { try { window.saveAndExitStory(); } catch (_) {} });
await page.waitForTimeout(500);
const savedRaw = await page.evaluate(() => localStorage.getItem('sb_saved_story'));
let savedEntry = null;
try { const parsed = JSON.parse(savedRaw || 'null'); savedEntry = parsed && parsed.stateSnapshot && parsed.stateSnapshot._fatelandsWishResolutionLedger && parsed.stateSnapshot._fatelandsWishResolutionLedger.seren_wish; } catch (_) {}
ok('the REAL save (after the real transition) persists the SAME wish resolution at its post-transition status', !!savedEntry && savedEntry.status === 'arrested', JSON.stringify(savedEntry));

await page.reload({ waitUntil: 'commit' });
ok('page reload completes', await waitForBoot(page));
await page.evaluate(async () => { try { await window.continueStory(); } catch (_) {} });
await page.waitForTimeout(700);
const finalDirective = await page.evaluate(() => (typeof window.buildFatelandsWishResolutionLedgerDirective === 'function') ? window.buildFatelandsWishResolutionLedgerDirective() : '__NO_FN__');
const finalLedgerEntry = await page.evaluate(() => window.state && window.state._fatelandsWishResolutionLedger && window.state._fatelandsWishResolutionLedger.seren_wish);
ok('AFTER real startBook2() -> real save -> real reload/restore, the SAME registered wish and its post-transition status are still there', !!finalLedgerEntry && finalLedgerEntry.wishId === 'seren_wish' && finalLedgerEntry.status === 'arrested', JSON.stringify(finalLedgerEntry));
ok('the shared directive still surfaces it after the full real lifecycle (transition + save + reload)', /seren_wish/.test(finalDirective) && /unexplained_arrest/.test(finalDirective), finalDirective.slice(0, 400));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

console.log('\n' + '-'.repeat(96));
console.log(' page error: ' + (err || 'none'));
console.log(' total model/proxy/image requests observed this run (all stubbed): ' + modelCalls);
console.log('\nFATELANDS WISH-RESOLUTION LEDGER — startBook2() TRANSITION CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
const allPass = results.every(r => r.pass);
process.exitCode = allPass ? 0 : 1;
