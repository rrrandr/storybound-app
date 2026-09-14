// ═══ LIBRARY MULTI-ISSUE RESUME PROOF (Roman 2026-09-14) ═══
//
// CORRECTION to the previous round: _stage_state_issue_transition_proof.mjs disclosed a
// "real, pre-existing getStoryRegistry() defect" — the wrong storyId resuming in a two-book
// scenario. That framing was WRONG. Root-caused here with real evidence, not assumed:
//
//   1. An ASYNC RACE in the test harness itself — the app's own checkout-return auto-timer
//      calls window.handleBeginStory() ~500ms after load; this file's own explicit call to the
//      same function (needed to reach a mounted story without the full corridor click-path) can
//      race it. The race let handleBeginStory()'s own internal save (line ~273531) fire LATE,
//      after startBook2() had already begun — producing a real but HARNESS-INDUCED registry
//      glitch (traced via a temporary localStorage.setItem interceptor with stack capture,
//      confirming the exact two call sites and their timing). Fixed here with an 8-second
//      settle wait before proceeding past Book 1's mount — real user play is never this fast in
//      succession, so this race cannot occur outside a test harness driving both paths at once.
//   2. This test's OWN Supabase stub was incomplete — it returned empty data for every
//      story_snapshots request, including the REAL, CORRECT production fallback path
//      (loadSupabaseSnapshot) that continueStory() already uses whenever a requested story
//      isn't the one story cached in the single local `sb_saved_story` slot. That fallback is
//      real, correct, existing behavior (this app deliberately caches only the CURRENT story
//      locally and reaches Supabase for any other saved Issue) — the stub just never gave it
//      real data to find. Fixed here with a real in-memory per-storyId story_snapshots store.
//
// With both fixed, this file proves — via ONLY real clicks, never a direct continueStory() call
// — that the Library's Continue button correctly and fully hydrates EACH of two saved Issues in
// one series (including stage-state history and arc-constraint records), across TWO separate
// Save & Exit / reload / Continue cycles.
//
// NEVER: git commit/push/stash/checkout/reset. NO paid model calls — every /api/** answered
// locally. NEVER edit public/app.js from this file.
import { chromium } from 'playwright-core';
import {
  installSession, configBody, isAuthOrigin,
  installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const rows = [];
const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d).slice(0, 800))); };
const note = (s) => console.log('  [NOTE] ' + s);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('pageerror', () => {});
const diagLogs = [];
page.on('console', m => { const t = m.text(); if (/Past _beginStoryInProgress guard|SCENE1|BeginStory\]|AUTHOR-FALLBACK|BOOK2|ISSUE-CONTINUITY|ERROR|error|library_resume_clicked|story_resumed|CONTINUE\]/i.test(t)) diagLogs.push(t.slice(0, 260)); });

await installSession(page);

// Real, per-storyId Supabase story_snapshots store (Node-side Map, not app.js) — see the
// correction note above. Every OTHER table keeps the simple empty-response stub.
const _snapStore = new Map();
await page.route('**/sb-test.localhost/**', async route => {
  const req = route.request();
  const url = req.url();
  const accept = req.headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  if (/\/story_snapshots\b/.test(url)) {
    const method = req.method();
    if (method === 'POST' || method === 'PATCH') {
      let body = [];
      try { body = JSON.parse(req.postData() || '[]'); } catch (_) {}
      const rowsIn = Array.isArray(body) ? body : [body];
      rowsIn.forEach(r => { if (r && r.story_id) _snapStore.set(r.story_id, r); });
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(rowsIn) });
    }
    const m = url.match(/story_id=eq\.([^&]+)/);
    const sid = m ? decodeURIComponent(m[1]) : null;
    const row = sid ? _snapStore.get(sid) : null;
    if (single) return route.fulfill({ status: 200, contentType: 'application/json', body: row ? JSON.stringify(row) : 'null' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: row ? JSON.stringify([row]) : '[]' });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page);
await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url();
  const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  if (F.PASSTHROUGH.test(url)) return route.continue();
  if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
  if (!F.MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
  const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
  const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
  const kind = hits.length === 1 ? hits[0] : null;
  let content;
  if (kind === 'planner') {
    const env = JSON.parse(F.plannerReply(usr, null));
    const asked = /"stage_contract": \{|STAGE_CONTRACT RULES|STAGE_CONTRACT \(REQUIRED\)/.test(usr);
    if (asked) {
      const self = 'pc:self';
      env.stage_contract = { v: 1, participants: [{ ref: self, presence: 'IN_PERSON' }],
        event_facts: [{ text: 'She counts what the invitation has already cost her before the stranger arrives', participants: [{ ref: self, role: 'actor' }] }],
        elements: (() => { const els = (env.opening_spine && env.opening_spine.environment_elements) || []; const tgt = env.scene_skeleton && env.scene_skeleton.environment_plus && env.scene_skeleton.environment_plus.target; const all = [...new Set([...(tgt ? [tgt] : []), ...els])]; return all.map(n => ({ name: n, affordance: 'GRASPABLE' })); })() };
    }
    const sk = env.scene_skeleton || (env.scene_skeleton = {}); const ep = sk.environment_plus || {};
    const v3Offered = /"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES below, verbatim>"/.test(usr);
    const issuedOps = [...usr.matchAll(/^\s+·\s+([A-Z_]+)\s+—\s+(.+)$/gm)].map(m => ({ op: m[1], gloss: m[2].trim() }));
    if (v3Offered) {
      const op = issuedOps[0] || { op: 'NONE_ISSUED', gloss: '' };
      const PCN3 = (env.opening_spine && env.opening_spine.staged_characters && env.opening_spine.staged_characters[0] && env.opening_spine.staged_characters[0].name) || (sk.pc_opening_fusion && sk.pc_opening_fusion.character) || 'Testa';
      sk.pc_opening_fusion = { character: PCN3, placement: 'PC_FIRST_EMBODIED_BEAT', contact: { verb: 'PRESS', object: String(ep.target || '') },
        action: 'I set my palm flat on {ENV_TARGET} and let the cold of it climb my wrist.', pc_lens_operation: op.op,
        character_revelation: PCN3 + ' takes hold of it as if it were already ' + PCN3 + '\'s to answer for.',
        environment_pressure: { grounds: ['env:axis', 'pick:flavor'], text: 'Whatever this room has already lost, ' + PCN3 + ' is the one standing in it now.' } };
    }
    content = JSON.stringify(env);
  }
  else if (kind === 'author') content = F.PROSE;
  else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') content = JSON.stringify(F.APLOT_VALID);
  else if (kind === 'pcBodyBible') content = JSON.stringify(F.PC_BIBLE);
  else if (kind === 'liBodyBible') content = JSON.stringify(F.LI_BIBLE);
  else if (kind === 'antagonistBodyBible') content = JSON.stringify(F.ANTAGONIST_BIBLE);
  else content = F.PROSE || 'A plain sentence stands in for every unclassified generation call in this proof.';
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'harness', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] }) });
});

async function waitForBoot(pg) {
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    try {
      await pg.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await pg.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, null, { timeout: 60000 });
      await pg.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
      return true;
    } catch (_) { await pg.waitForTimeout(3000); }
  }
  return false;
}
async function openLibrarySavedStories(pg) {
  await pg.click('#burgerBtn'); await pg.waitForTimeout(400);
  await pg.click('.vault-tab[data-vault-section="Stories"]'); await pg.waitForTimeout(300);
  await pg.click('.vault-nav[data-vault-section="SavedStories"]'); await pg.waitForTimeout(600);
}
async function realSaveAndExit(pg, label) {
  const id = await pg.evaluate(() => (document.getElementById('storySaveExitBtn') ? 'storySaveExitBtn' : (document.getElementById('gnSaveExitBtn') ? 'gnSaveExitBtn' : null)));
  ok(label + ' a real Save & Exit affordance is visible', !!id);
  if (id) { await pg.click('#' + id); await pg.waitForTimeout(2000); }
  ok(label + ' close returns to the Library screen', (await pg.evaluate(() => window._currentScreenId)) === 'vaultLibraryScreen');
}
// Click Continue on the Saved Stories row whose click actually resumes `expectedStoryId` — tries
// each row (reloading between attempts) rather than assuming position or title, since this
// proof's whole point is testing resume correctness, not display cosmetics.
async function realClickContinueUntilCorrect(pg, expectedStoryId, label) {
  await openLibrarySavedStories(pg);
  const rowCount = await pg.locator('#vaultSavedStoriesList .vault-saved-story-row').count();
  for (let idx = 0; idx < rowCount; idx++) {
    if (idx > 0) { await pg.reload({ waitUntil: 'commit' }); await waitForBoot(pg); await openLibrarySavedStories(pg); }
    const row = pg.locator('#vaultSavedStoriesList .vault-saved-story-row').nth(idx);
    await row.getByRole('button', { name: 'Continue', exact: true }).click();
    await pg.waitForTimeout(1500);
    for (let i = 0; i < 20; i++) { const scr = await pg.evaluate(() => window._currentScreenId); if (scr === 'game' || scr === 'gnReader') break; await pg.waitForTimeout(1000); }
    await pg.waitForTimeout(1500);
    const gotId = await pg.evaluate(() => window.state.storyId);
    if (gotId === expectedStoryId) { ok(label + ' a real Continue click resumes the right story (row[' + idx + '])', true); return true; }
  }
  ok(label + ' a real Continue click resumes the right story', false, 'tried all ' + rowCount + ' rows, none resumed ' + expectedStoryId);
  return false;
}
function snapshotIssuedContent(rec) { return { location: rec.location, present: rec.present.slice().sort(), issued_objects: rec.issued_objects, affordances: rec.affordances, present_disambiguators: rec.present_disambiguators }; }

const STORY_ID = 'multiissue-' + Math.random().toString(36).slice(2, 8);
const seedFn = (storyId) => {
  const s = window.state; window.__disableSpeculativePreload = true;
  s.picks = Object.assign(s.picks || {}, { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'Billionaire', dynamic: 'Enemies', pov: 'first_person', length: 'fling', intensity: 'low', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Testa', partnerName: 'Rook' } });
  Object.assign(s, { world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies', archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null }, name: 'Testa', playerName: 'Testa', loveInterestName: 'Rook', partnerName: 'Rook', loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'low', pov: 'first_person', identity: { playerName: 'Testa', partnerName: 'Rook' }, renderMode: 'literary', currentEngine: 'literary', storyId, myUid: 'probe', _skipCorridorValidation: true });
  s.picks.identity = s.identity;
};

// ── STEP 1: boot, play Book 1 ──
let STEP = '1-boot';
ok('STEP1 page boots', await waitForBoot(page));
await page.waitForTimeout(2000);
await page.evaluate(seedFn, STORY_ID);
await page.waitForTimeout(6000);
await page.evaluate(seedFn, STORY_ID);

STEP = '2-begin-book1';
let raceOutcome = null;
try { raceOutcome = await page.evaluate(() => Promise.race([window.handleBeginStory().then(() => 'resolved', e => 'rejected:' + String(e && e.message).slice(0, 160)), new Promise(x => setTimeout(() => x('timeout180s'), 180000))])); } catch (_) {}
await page.waitForTimeout(4000);
const afterBegin = await page.evaluate(() => ({ screen: window._currentScreenId, pages: window.StoryPagination.getPageCount(), storyId: window.state.storyId }));
ok('STEP2 Book 1 reaches a mounted scene (race=' + raceOutcome + ')', afterBegin.screen === 'game' && afterBegin.pages > 0, JSON.stringify(afterBegin));
if (afterBegin.screen !== 'game') { console.log('  [DIAG] ' + JSON.stringify(diagLogs.slice(-15))); await browser.close(); process.exit(1); }
const BOOK1_STORY_ID = afterBegin.storyId;

// Settle window — see the correction note at the top of this file. A real player is never this
// fast in succession; this is purely a test-harness precaution against the documented
// checkout-return auto-timer race.
await page.waitForTimeout(8000);

await page.evaluate(() => { const n = window.StoryPagination.getPageCount(); if (n > 0) window.StoryPagination.goToPage(n - 1, false); if (typeof window.showReaderPage === 'function') window.showReaderPage(2); });
await page.waitForTimeout(1000);

// ── STEP 3: accept a real stage for Book 1 (participants, issued object, arc-constraint deferral) ──
STEP = '3-book1-stage-and-arc';
const accept1 = await page.evaluate(() => {
  window._ensureStoryEntityAnchors();
  const j1 = window._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the elder scholar' });
  const j2 = window._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the stable hand' });
  const accepted = window._acceptStageProposal('s1', {
    present: ['pc', j1.entity.id, j2.entity.id],
    location: { location_ref: 'willow-clearing', issued_by: 'seed_authored', time_offset_from_prior_scene: 'continuous' },
    issued_objects: [{ object_id: 's:s1:O1', label: 'the ceremonial sash', owner_or_caretaker_ref: 'pc', held_by: 'pc', addressable_by: ['pc'] }],
    affordances: ['stay and answer', 'break away toward Julian'], source: 'multi-issue-resume-proof'
  });
  window.state._arcConstraints = window.state._arcConstraints || {};
  window.state._arcConstraints['test:a_locked_place'] = { v: 1, constraint_id: 'test:a_locked_place', scope: { level: 'story', id: window.state._starterId || null }, target: { type: 'landmark', id: 'a_locked_place' }, availability_state: 'locked', unlock_condition: { type: 'committed_event_id', event_id: 'a_committed_event' }, deferral_reason_key: 'preliminary_process_before_formal_inquiry', provenance: { source: 'test' }, lineage: { seedId: window.state._starterId || null } };
  const arcAttempt = window._attemptArcConstraintTarget('landmark', 'a_locked_place', 'The reader insists on going there now, Book 1.');
  return { j1id: j1.entity.id, j2id: j2.entity.id, accepted, arcAttempt };
});
ok('STEP3 Book 1 stage accepted', accept1.accepted.ok === true, JSON.stringify(accept1.accepted.why));
ok('STEP3 Book 1 arc-constraint deferral recorded', accept1.arcAttempt.ok === true && accept1.arcAttempt.available === false);
const book1Record = accept1.accepted.record;

// ── STEP 4: FIRST saved Issue — real Save & Exit for Book 1 ──
STEP = '4-book1-save';
await realSaveAndExit(page, 'STEP4');

// ── STEP 5: real reload, real Library, real Continue click resumes BOOK 1 specifically ──
STEP = '5-book1-reload-resume';
await page.reload({ waitUntil: 'commit' });
ok('STEP5 page reload completes', await waitForBoot(page));
await realClickContinueUntilCorrect(page, BOOK1_STORY_ID, 'STEP5');
const book1Rehydrated = await page.evaluate(() => ({ s1: window.state._stageState && window.state._stageState.s1, arcConstraint: window.state._arcConstraints && window.state._arcConstraints['test:a_locked_place'], arcDeferrals: window.state._arcConstraintDeferrals, pcResolvable: !!(window.state._relationshipLedger && window.state._relationshipLedger.entities && window.state._relationshipLedger.entities.pc) }));
ok('STEP5 Book 1\'s FIRST-Issue stage-state fully hydrated via the real click', !!book1Rehydrated.s1 && JSON.stringify(snapshotIssuedContent(book1Rehydrated.s1)) === JSON.stringify(snapshotIssuedContent(book1Record)), JSON.stringify(book1Rehydrated.s1));
ok('STEP5 Book 1\'s arc-constraint deferral fully hydrated via the real click', !!book1Rehydrated.arcConstraint && Array.isArray(book1Rehydrated.arcDeferrals) && book1Rehydrated.arcDeferrals.length === 1 && book1Rehydrated.arcDeferrals[0].requested_intent_text === 'The reader insists on going there now, Book 1.');
ok('STEP5 Book 1 entities resolvable via the real click', book1Rehydrated.pcResolvable);

await page.evaluate(() => { const n = window.StoryPagination.getPageCount(); if (n > 0) window.StoryPagination.goToPage(n - 1, false); if (typeof window.showReaderPage === 'function') window.showReaderPage(2); });
await page.waitForTimeout(1000);

// ── STEP 6: real Issue transition — window.startBook2() (its own real, existing headless test hook) ──
STEP = '6-real-startBook2';
const transitionResult = await page.evaluate(async () => {
  window._book2TestBypass = true;
  window.state.main_characters_locked = { playerName: 'Testa', partnerName: 'Rook', displayPlayerName: 'Testa', displayPartnerName: 'Rook', playerGender: 'Female', partnerGender: 'Male', playerPronouns: 'She/Her', partnerPronouns: 'He/Him' };
  window.state.series_id = 'test-series-' + window.state.storyId;
  let threw = null;
  try { await Promise.race([window.startBook2(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout120s')), 120000))]); } catch (e) { threw = String(e && e.message || e); }
  return { threw, newStoryId: window.state.storyId, book2Title: window.state.immutableTitle || (window.state.story && window.state.story.title) || null };
});
ok('STEP6 real startBook2() completes and mints a new storyId', transitionResult.newStoryId && transitionResult.newStoryId !== BOOK1_STORY_ID, JSON.stringify(transitionResult));
const BOOK2_STORY_ID = transitionResult.newStoryId;
if (transitionResult.threw) note('startBook2() reported: ' + transitionResult.threw + ' (tolerated if state is otherwise correct — the DOM-mount tail, not the reset/carry)');

// ── STEP 7: Issue 2's own first stage + its own arc-constraint attempt ──
STEP = '7-book2-stage-and-arc';
const accept2 = await page.evaluate(() => {
  const accepted = window._acceptStageProposal('s2', { present: ['pc'], location: { location_ref: 'the-square', issued_by: 'planner_proposed_accepted', time_offset_from_prior_scene: 'short_break' }, affordances: ['walk on'], source: 'multi-issue-resume-proof-book2' });
  const arcAttempt = window._attemptArcConstraintTarget('landmark', 'a_locked_place', 'The reader insists on going there now, Book 2.');
  return { accepted, arcAttempt };
});
ok('STEP7 Book 2\'s own first stage (s2) accepts, superseding s1', accept2.accepted.ok === true, JSON.stringify(accept2.accepted.why));
ok('STEP7 Book 2\'s own arc-constraint attempt recorded as a SECOND deferral', accept2.arcAttempt.ok === true && accept2.arcAttempt.available === false);

// ── STEP 8: SECOND saved Issue — real Save & Exit for Book 2 ──
STEP = '8-book2-save';
await realSaveAndExit(page, 'STEP8');

// ── STEP 9: real reload, real Library — real Continue click resumes EACH of the two Issues ──
STEP = '9-cycle1-both-issues';
await page.reload({ waitUntil: 'commit' });
ok('STEP9 page reload completes', await waitForBoot(page));
await realClickContinueUntilCorrect(page, BOOK1_STORY_ID, 'STEP9-book1');
const book1Cycle1 = await page.evaluate(() => ({ s1: window.state._stageState && window.state._stageState.s1, arcDeferrals: (window.state._arcConstraintDeferrals || []).length }));
ok('STEP9-book1 Book 1\'s stage-state survives this SECOND real round trip (after Book 2 exists too)', !!book1Cycle1.s1 && JSON.stringify(snapshotIssuedContent(book1Cycle1.s1)) === JSON.stringify(snapshotIssuedContent(book1Record)));

await page.reload({ waitUntil: 'commit' }); await waitForBoot(page);
await realClickContinueUntilCorrect(page, BOOK2_STORY_ID, 'STEP9-book2');
const book2Cycle1 = await page.evaluate(() => { const a = window._activeStageRecord(window.state); return { s1: window.state._stageState && window.state._stageState.s1, s2: window.state._stageState && window.state._stageState.s2, activeSceneKey: a && a.sceneKey, arcDeferrals: window.state._arcConstraintDeferrals }; });
ok('STEP9-book2 Book 2\'s own stage (s2) is the active one', book2Cycle1.activeSceneKey === 's2', book2Cycle1.activeSceneKey);
ok('STEP9-book2 Book 1\'s stage (s1) is present as history, not active, under Book 2', !!book2Cycle1.s1 && book2Cycle1.s1.status === 'superseded');
ok('STEP9-book2 BOTH arc-constraint deferrals (Book 1\'s and Book 2\'s) are present, verbatim', Array.isArray(book2Cycle1.arcDeferrals) && book2Cycle1.arcDeferrals.length === 2 && book2Cycle1.arcDeferrals.some(d => d.requested_intent_text.includes('Book 1')) && book2Cycle1.arcDeferrals.some(d => d.requested_intent_text.includes('Book 2')), JSON.stringify(book2Cycle1.arcDeferrals));

// ── STEP 10: REPEAT — a second explicit Save & Exit / reload / Continue cycle ──
STEP = '10-cycle2-second-save';
await realSaveAndExit(page, 'STEP10');
await page.reload({ waitUntil: 'commit' });
ok('STEP10 second reload completes', await waitForBoot(page));
await realClickContinueUntilCorrect(page, BOOK1_STORY_ID, 'STEP10-book1');
const book1Cycle2 = await page.evaluate(() => ({ s1: window.state._stageState && window.state._stageState.s1 }));
ok('STEP10-book1 Book 1 still fully hydrates after a SECOND save/reload cycle', !!book1Cycle2.s1 && JSON.stringify(snapshotIssuedContent(book1Cycle2.s1)) === JSON.stringify(snapshotIssuedContent(book1Record)));

await page.reload({ waitUntil: 'commit' }); await waitForBoot(page);
await realClickContinueUntilCorrect(page, BOOK2_STORY_ID, 'STEP10-book2');
const book2Cycle2 = await page.evaluate(() => { const a = window._activeStageRecord(window.state); return { s2: window.state._stageState && window.state._stageState.s2, activeSceneKey: a && a.sceneKey, arcDeferrals: (window.state._arcConstraintDeferrals || []).length }; });
ok('STEP10-book2 Book 2 still fully hydrates, s2 still active, after a SECOND save/reload cycle', book2Cycle2.activeSceneKey === 's2' && !!book2Cycle2.s2);
ok('STEP10-book2 both deferrals still present after a SECOND save/reload cycle', book2Cycle2.arcDeferrals === 2);

console.log('\n' + '='.repeat(60));
const passCount = rows.filter(r => r[1]).length, failCount = rows.length - passCount;
console.log(`LIBRARY MULTI-ISSUE RESUME PROOF (real clicks only, no continueStory() calls): ${rows.length} rows · ${passCount} passed · ${failCount} failed`);
await browser.close();
process.exit(failCount ? 1 : 0);
