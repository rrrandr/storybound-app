// FATELANDS MANIFESTATION LEDGER — REAL window.startBook2() ISSUE-TRANSITION FOLLOW-UP (Roman,
// 2026-09-20)
//
// Strengthens the prior proof's "Issue-index bump" (a manual state.issueIndexInRun increment) with
// the REAL production Book/Issue transition: window.startBook2() — the function that actually calls
// _resetStoryState() (the L3 reset), captures/carries specific ledgers by explicit snapshot, mints a
// genuinely new state.storyId, and bumps issueIndexInRun for real. Drives it via the app's OWN,
// already-existing, purpose-built headless test hook (window._book2TestBypass — documented in
// public/app.js as "startBook2's real Book-1→Book-2 continuity path can't be driven headless
// because [the DOM-heavy archive/cover/modal step] throws without a live page... proceeds through
// the REAL title/blurb/Scene-1 gen + carry"), the same real mechanism the pre-existing
// _stage_state_issue_transition_proof.mjs uses for a different piece of state. Not a reimplemented
// stub of startBook2 — the real function, real reset, real carry logic.
//
// Proves: an entity registered in the Fatelands manifestation ledger during "Book 1" survives the
// REAL startBook2() transition (a genuinely new storyId, issueIndexInRun incremented, _resetStoryState
// fired) with its entityId and CURRENT manifestation intact — then survives a REAL save + reload on
// top of that. No provider/image calls: all title/blurb/Scene-1 generation calls startBook2() makes
// are intercepted at the network boundary and answered with plain stubbed prose (this proof does not
// test Book 2's generated content, only whether the ledger survives the transition around it).
//
// usage: node _fatelands_manifestation_startbook2_control.mjs
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

console.log('\n' + '='.repeat(96) + '\nFATELANDS MANIFESTATION LEDGER — real window.startBook2() transition follow-up\n' + '='.repeat(96) + '\n');

async function waitForBoot(pg) {
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    try {
      await pg.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await pg.waitForFunction(() => window.state && window.startBook2 && window._fatelandsRegisterManifestation &&
        window.buildFatelandsManifestationLawDirective && window.saveAndExitStory && window.continueStory, null, { timeout: 60000 });
      await pg.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
      return true;
    } catch (_) { await pg.waitForTimeout(3000); }
  }
  return false;
}
ok('page boots with the real startBook2 + ledger functions exposed', await waitForBoot(page));
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

// ═══ Register a wish-crafted relic mid-Book-1, same as real play would ═══
const reg = await page.evaluate(() => window._fatelandsRegisterManifestation('sworn_blade', {
  displayName: "the Sworn Blade", capabilityCategory: 'wish_crafted_relic',
  manifestationId: 'twin_edged_promise_blade', form: 'a twin-edged ceremonial blade with a braided hilt — states form only',
  provenance: { kind: 'generated_expression' },
}));
ok('a wish-crafted relic is registered during "Book 1"', !!reg && reg.currentManifestationId === 'twin_edged_promise_blade', JSON.stringify(reg));
const grounded = await page.evaluate(() => window._fatelandsRecordManifestationChange('sworn_blade', {
  resultingManifestationId: 'folded_promise_ring', resultingForm: 'a folded steel ring worn at the throat — states form only',
  groundedIn: 'she needed it hidden, not brandished, once the betrothal became a secret', sceneOrBeat: 8,
}));
ok('a grounded manifestation change is recorded before the transition', !!grounded && grounded.currentManifestationId === 'folded_promise_ring');

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
    ledger: window.state._fatelandsManifestationLedger,
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
ok('the manifestation ledger ROW survived the REAL _resetStoryState() inside startBook2() — same entityId', !!ledgerAfter && !!ledgerAfter.sworn_blade && ledgerAfter.sworn_blade.entityId === 'sworn_blade', JSON.stringify(ledgerAfter && ledgerAfter.sworn_blade));
ok('the CURRENT recorded manifestation (the grounded change, not the original registration) survived the real transition', !!ledgerAfter && !!ledgerAfter.sworn_blade && ledgerAfter.sworn_blade.currentManifestationId === 'folded_promise_ring', ledgerAfter && ledgerAfter.sworn_blade && ledgerAfter.sworn_blade.currentManifestationId);

const postTransitionDirective = await page.evaluate(() => { window.state.turnCount = window.state.turnCount || 1; return window.buildFatelandsManifestationLawDirective(); });
ok('the shared directive surfaces the carried-forward manifestation immediately after the real transition (in the NEW Issue)', /folded steel ring/.test(postTransitionDirective), postTransitionDirective.slice(0, 300));

// ═══ THEN a real save + reload ON TOP of the real transition ═══
await page.evaluate(() => { try { window.saveAndExitStory(); } catch (_) {} });
await page.waitForTimeout(500);
const savedRaw = await page.evaluate(() => localStorage.getItem('sb_saved_story'));
let savedEntry = null;
try { const parsed = JSON.parse(savedRaw || 'null'); savedEntry = parsed && parsed.stateSnapshot && parsed.stateSnapshot._fatelandsManifestationLedger && parsed.stateSnapshot._fatelandsManifestationLedger.sworn_blade; } catch (_) {}
ok('the REAL save (after the real transition) persists the SAME ledger entity at its post-transition manifestation', !!savedEntry && savedEntry.currentManifestationId === 'folded_promise_ring', JSON.stringify(savedEntry));

await page.reload({ waitUntil: 'commit' });
ok('page reload completes', await waitForBoot(page));
await page.evaluate(async () => { try { await window.continueStory(); } catch (_) {} });
await page.waitForTimeout(700);
const finalDirective = await page.evaluate(() => (typeof window.buildFatelandsManifestationLawDirective === 'function') ? window.buildFatelandsManifestationLawDirective() : '__NO_FN__');
const finalLedgerEntry = await page.evaluate(() => window.state && window.state._fatelandsManifestationLedger && window.state._fatelandsManifestationLedger.sworn_blade);
ok('AFTER real startBook2() -> real save -> real reload/restore, the SAME registered entity and its post-transition CURRENT manifestation are still there', !!finalLedgerEntry && finalLedgerEntry.entityId === 'sworn_blade' && finalLedgerEntry.currentManifestationId === 'folded_promise_ring', JSON.stringify(finalLedgerEntry));
ok('the shared directive still surfaces it after the full real lifecycle (transition + save + reload)', /folded steel ring/.test(finalDirective), finalDirective.slice(0, 300));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

console.log('\n' + '-'.repeat(96));
console.log(' page error: ' + (err || 'none'));
console.log(' total model/proxy/image requests observed this run (all stubbed): ' + modelCalls);
console.log('\nFATELANDS MANIFESTATION LEDGER — startBook2() TRANSITION CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
const allPass = results.every(r => r.pass);
process.exitCode = allPass ? 0 : 1;
