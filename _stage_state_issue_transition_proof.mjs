// ═══ STAGE-STATE SUBSTRATE — REAL startBook2() ISSUE-TRANSITION PROOF (Roman 2026-09-14) ═══
// PART 2 of two corrections. _resetStoryState() alone is NOT the production Issue-transition
// path — it is one step INSIDE window.startBook2(), which additionally captures book1StoryId,
// carries the entity ledger forward by explicit snapshot+restamp, sets state.previous_story_id
// and state.series_id, and mints Book 2's title/blurb/Scene 1. This file drives the REAL
// startBook2() function (not a reimplemented stub), using its OWN existing, purpose-built
// headless test hook (window._book2TestBypass — already in public/app.js, documented there as
// "startBook2's real Book-1→Book-2 continuity path can't be driven headless because [the DOM-
// heavy archive step] throws without a live page... proceeds through the REAL title/blurb/
// Scene-1 gen + carry"). This is not a shortcut this file invented — it is the app's own,
// already-existing accommodation for exactly this kind of test.
//
// STORY-LINEAGE IDENTITY MODEL (established here from the real source, public/app.js
// ~99264-99585, not assumed):
//   - Each Issue/Book gets a GENUINELY NEW state.storyId (minted inside _resetStoryState()).
//   - state.previous_story_id is set to the PRIOR issue's storyId — an explicit lineage pointer
//     back one step (line ~99534: `state.previous_story_id = book1StoryId;`).
//   - state.series_id is carried UNCHANGED across every issue in the run — the stable root.
//   - state.issueIndexInRun increments (+1), never resets — continuous across storyId changes.
//   - Entity identity (_relationshipLedger) is carried by EXPLICIT snapshot-before-reset +
//     restamp-after-reset (only if the ledger's own stamped storyId matches what storyId WAS
//     right before the reset — a real, checked guard, not an assumption) — see
//     state._relLedgerCarryAdopt, ~line 99489.
//   - Stage-state (state._stageState) is carried IMPLICITLY, not explicitly: it is a single,
//     never-storyId-namespaced container object _resetStoryState() never clears (confirmed by
//     grep — no `_stageState` reference anywhere in that function's body), so a prior Issue's
//     records simply remain present at their own keys, each still stamped with ITS OWN issue's
//     storyId. _activeStageRecord's storyId-scoped scan correctly stops surfacing them as
//     "active" the moment storyId changes; nothing deletes them.
// This file tests both halves of that model against the REAL function, not the design doc's
// description of it.
//
// Provider calls stay stubbed exactly as in the other proofs. No stage-issuer behavior is added.
import { chromium } from 'playwright-core';
import {
  installSession, configBody, isAuthOrigin,
  installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const rows = [];
const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d).slice(0, 900))); };
const note = (s) => console.log('  [NOTE] ' + s);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('pageerror', () => {});
const diagLogs = [];
page.on('console', m => { const t = m.text(); if (/Past _beginStoryInProgress guard|SCENE1|BeginStory\]|AUTHOR-FALLBACK|BOOK2|ISSUE-CONTINUITY|ERROR|error/i.test(t)) diagLogs.push(t.slice(0, 260)); });

await installSession(page);
// CORRECTED 2026-09-14 (see _library_multi_issue_resume_proof.mjs for the full root-cause
// writeup): a real, per-storyId story_snapshots store, not an always-empty stub — the earlier
// "getStoryRegistry() defect" this file disclosed was actually this stub never giving
// loadSupabaseSnapshot()'s real, correct fallback path anything to find.
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
    const issued = [...usr.matchAll(/^\s+·\s+(\S+)\s*$/gm)].map(x => x[1]);
    if (asked) {
      // Only ever declare the PC self as present — including a guessed "other" ref (from a
      // regex scrape of the prompt text) risked naming something the validator's own issued-ref
      // check doesn't recognize, aborting Scene 1 entirely (found running this proof). This
      // proof doesn't care who else is in Book 1's opening; self-only is always valid.
      const self = 'pc:self';
      env.stage_contract = { v: 1,
        participants: [{ ref: self, presence: 'IN_PERSON' }],
        event_facts: [{ text: 'She counts what the invitation has already cost her before the stranger arrives', participants: [{ ref: self, role: 'actor' }] }],
        elements: (() => { const els = (env.opening_spine && env.opening_spine.environment_elements) || []; const tgt = env.scene_skeleton && env.scene_skeleton.environment_plus && env.scene_skeleton.environment_plus.target; const all = [...new Set([...(tgt ? [tgt] : []), ...els])]; return all.map(n => ({ name: n, affordance: 'GRASPABLE' })); })() };
    }
    const sk = env.scene_skeleton || (env.scene_skeleton = {}); const ep = sk.environment_plus || {};
    const v3Offered = /"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES below, verbatim>"/.test(usr);
    const issuedOps = [...usr.matchAll(/^\s+·\s+([A-Z_]+)\s+—\s+(.+)$/gm)].map(m => ({ op: m[1], gloss: m[2].trim() }));
    if (v3Offered) {
      const op = issuedOps[0] || { op: 'NONE_ISSUED', gloss: '' };
      const PCN3 = (env.opening_spine && env.opening_spine.staged_characters && env.opening_spine.staged_characters[0] && env.opening_spine.staged_characters[0].name) || (sk.pc_opening_fusion && sk.pc_opening_fusion.character) || 'Testa';
      sk.pc_opening_fusion = { character: PCN3, placement: 'PC_FIRST_EMBODIED_BEAT',
        contact: { verb: 'PRESS', object: String(ep.target || '') },
        action: 'I set my palm flat on {ENV_TARGET} and let the cold of it climb my wrist.',
        pc_lens_operation: op.op,
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
  // startBook2's title/blurb/Scene-1 calls are plain user-role prompts with no classifying
  // structure — they fall through unclassified. A plain, well-formed prose string satisfies all
  // three call sites (title/blurb just use it as text; Scene 1's parseScene1Response degrades
  // gracefully — title/synopsis markers absent — without throwing, which is all this proof needs;
  // it does not test Book 2's generated prose quality).
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

const STORY_ID = 'issuetrans-' + Math.random().toString(36).slice(2, 8);
const seedFn = (storyId) => {
  const s = window.state; window.__disableSpeculativePreload = true;
  s.picks = Object.assign(s.picks || {}, { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'Billionaire', dynamic: 'Enemies', pov: 'first_person', length: 'fling', intensity: 'low', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Testa', partnerName: 'Rook' } });
  Object.assign(s, { world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies', archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null }, name: 'Testa', playerName: 'Testa', loveInterestName: 'Rook', partnerName: 'Rook', loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'low', pov: 'first_person', identity: { playerName: 'Testa', partnerName: 'Rook' }, renderMode: 'literary', currentEngine: 'literary', storyId, myUid: 'probe', _skipCorridorValidation: true });
  s.picks.identity = s.identity;
};

let STEP = '1-boot';
ok('STEP1 page boots', await waitForBoot(page));
await page.waitForTimeout(2000);
await page.evaluate(seedFn, STORY_ID);
await page.waitForTimeout(6000);
await page.evaluate(seedFn, STORY_ID);

STEP = '2-begin-book1';
let raceOutcome = null;
try {
  raceOutcome = await page.evaluate(() => Promise.race([
    window.handleBeginStory().then(() => 'resolved', e => 'rejected:' + String(e && e.message).slice(0, 160)),
    new Promise(x => setTimeout(() => x('timeout180s'), 180000)),
  ]));
} catch (_) {}
await page.waitForTimeout(4000);
const afterBegin = await page.evaluate(() => ({ screen: window._currentScreenId, pages: window.StoryPagination.getPageCount(), storyId: window.state.storyId }));
ok('STEP2 Book 1 reaches a mounted scene (race=' + raceOutcome + ')', afterBegin.screen === 'game' && afterBegin.pages > 0, JSON.stringify(afterBegin));
if (afterBegin.screen !== 'game') { console.log('  [DIAG] ' + JSON.stringify(diagLogs.slice(-15))); await browser.close(); process.exit(1); }

// CORRECTED 2026-09-14: settle window for the app's own checkout-return auto-timer (which also
// calls window.handleBeginStory() ~500ms after load) to fully finish, including its own
// internal save, before this test's own explicit call proceeds — avoids a real async race
// between the two that a real, single, human-paced click sequence never triggers.
await page.waitForTimeout(8000);

await page.evaluate(() => {
  const n = window.StoryPagination.getPageCount();
  if (n > 0 && typeof window.StoryPagination.goToPage === 'function') window.StoryPagination.goToPage(n - 1, false);
  if (typeof window.showReaderPage === 'function') window.showReaderPage(2);
});
await page.waitForTimeout(1000);

const BOOK1_STORY_ID = afterBegin.storyId;

// ── Book 1's stage: participants, an issued object with ownership, an affordance, two
// same-labeled entities for disambiguators — same fixture shape as Part 1. ──
STEP = '3-accept-book1-stage';
const accept1 = await page.evaluate(() => {
  window._ensureStoryEntityAnchors();
  const j1 = window._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the elder scholar' });
  const j2 = window._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the stable hand' });
  const accepted = window._acceptStageProposal('s1', {
    present: ['pc', j1.entity.id, j2.entity.id],
    location: { location_ref: 'willow-clearing', issued_by: 'seed_authored', time_offset_from_prior_scene: 'continuous' },
    // D1 (Roman, authorized 2026-09-14): object_id is backend-minted at accept time — never supplied.
    issued_objects: [{ label: 'the ceremonial sash', owner_or_caretaker_ref: 'pc', held_by: 'pc', addressable_by: ['pc'] }],
    affordances: ['stay and answer', 'break away toward Julian'],
    source: 'issue-transition-proof'
  });
  return { j1id: j1.entity.id, j2id: j2.entity.id, accepted };
});
ok('STEP3 Book 1 stage accepted', accept1.accepted.ok === true, JSON.stringify(accept1.accepted.why));
const book1Record = accept1.accepted.record;

// ── ARC-CONSTRAINT REGISTRY — real Issue-transition check, same reasoning as Part 1: this
// generic literary-control seed has no arcConstraints array, so a synthetic constraint proves
// the real persisted fields (_arcConstraints/_arcConstraintDeferrals/_committedStoryEvents)
// survive the REAL startBook2() function specifically, since none of them are in
// _resetStoryState()'s clear-list (verified by grep this session, same as _stageState). ──
const arcAttemptBook1 = await page.evaluate(() => {
  window.state._arcConstraints = window.state._arcConstraints || {};
  window.state._arcConstraints['test:a_locked_place'] = {
    v: 1, constraint_id: 'test:a_locked_place',
    scope: { level: 'story', id: window.state._starterId || null },
    target: { type: 'landmark', id: 'a_locked_place' },
    availability_state: 'locked',
    unlock_condition: { type: 'committed_event_id', event_id: 'a_committed_event' },
    deferral_reason_key: 'preliminary_process_before_formal_inquiry',
    provenance: { source: 'test' }, lineage: { seedId: window.state._starterId || null }
  };
  return window._attemptArcConstraintTarget('landmark', 'a_locked_place', 'The reader insists on going there now, mid-Book-1.');
});
ok('STEP3 arc-constraint attempt deferred in Book 1, before the transition', arcAttemptBook1.ok === true && arcAttemptBook1.available === false, JSON.stringify(arcAttemptBook1));

function snapshotIssuedContent(rec) {
  return { location: rec.location, present: rec.present.slice().sort(), issued_objects: rec.issued_objects, affordances: rec.affordances, present_disambiguators: rec.present_disambiguators };
}

// ── THE REAL PRODUCTION ISSUE TRANSITION — window.startBook2(), via its own existing,
// purpose-built headless test hook (window._book2TestBypass). NOT _resetStoryState() alone. ──
STEP = '4-real-startBook2';
const _rawConsole = [];
const _rawListener = m => { try { _rawConsole.push(m.text().slice(0, 300)); } catch (_) {} };
page.on('console', _rawListener);
const transitionResult = await page.evaluate(async () => {
  window._book2TestBypass = true;
  // startBook2() reads state.main_characters_locked BEFORE its own bypass branch populates it
  // (public/app.js ~99274 captures it, ~99986 sets it) — a real, fully-played Book 1 locks its
  // cast well before reaching a book-complete state, so this test sets the same precondition a
  // genuine Book 1 would already carry by this point, rather than relying on the bypass's own
  // later, too-late fallback for it.
  window.state.main_characters_locked = {
    playerName: 'Testa', partnerName: 'Rook', displayPlayerName: 'Testa', displayPartnerName: 'Rook',
    playerGender: 'Female', partnerGender: 'Male', playerPronouns: 'She/Her', partnerPronouns: 'He/Him'
  };
  // Same ordering quirk as main_characters_locked above: state.series_id is captured into a
  // local BEFORE the bypass's own fallback would set it, so it must be pre-set here too.
  window.state.series_id = 'test-series-' + window.state.storyId;
  console.log('[BOOK2-PROOF] preconditions set, calling the real window.startBook2()');
  let threw = null;
  try {
    await Promise.race([
      window.startBook2(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout120s')), 120000)),
    ]);
  } catch (e) { threw = String(e && e.message || e); }
  return {
    threw,
    newStoryId: window.state.storyId,
    previousStoryId: window.state.previous_story_id,
    seriesId: window.state.series_id,
    issueIndexInRun: window.state.issueIndexInRun,
    relLedgerStoryId: window.state._relationshipLedger && window.state._relationshipLedger.storyId,
    relLedgerCarryAdopt: window.state._relLedgerCarryAdopt || false,
    book2Title: window.state.immutableTitle || (window.state.story && window.state.story.title) || null,
  };
});
page.off('console', _rawListener);
console.log('  [DIAG transition] ' + JSON.stringify(transitionResult));
console.log('  [DIAG raw console during transition] ' + JSON.stringify(_rawConsole.slice(-30)));
// _mountAndTransition (DOM-heavy, book 2's cover/scene mount) may legitimately throw in a
// headless context even WITH the bypass — the reset/carry/storyId work this proof cares about
// happens strictly BEFORE that call (public/app.js ~99460-99534, _mountAndTransition ~99567).
// A thrown mount error is logged, not treated as a hard failure by itself; the assertions below
// are what actually verify the transition succeeded.
if (transitionResult.threw) note('startBook2() reported an error (tolerated if state below is correct — likely the DOM-mount tail, not the reset/carry): ' + transitionResult.threw);

ok('STEP4 storyId is GENUINELY NEW (not Book 1\'s)', transitionResult.newStoryId && transitionResult.newStoryId !== BOOK1_STORY_ID, transitionResult.newStoryId + ' vs ' + BOOK1_STORY_ID);
ok('STEP4 state.previous_story_id points back to Book 1 (the lineage pointer)', transitionResult.previousStoryId === BOOK1_STORY_ID, transitionResult.previousStoryId);
ok('STEP4 state.series_id is set (the stable root across the whole run)', !!transitionResult.seriesId);
ok('STEP4 issueIndexInRun incremented past 1', transitionResult.issueIndexInRun > 1, transitionResult.issueIndexInRun);
ok('STEP4 the entity ledger was explicitly carried and re-stamped to the NEW storyId', transitionResult.relLedgerCarryAdopt === true && transitionResult.relLedgerStoryId === transitionResult.newStoryId, JSON.stringify(transitionResult));

const afterTransition = await page.evaluate(() => {
  const active = window._activeStageRecord ? window._activeStageRecord(window.state) : null;
  return {
    s1: window.state._stageState && window.state._stageState.s1,
    activeSceneKey: active && active.sceneKey,
    pcResolvable: !!(window.state._relationshipLedger && window.state._relationshipLedger.entities && window.state._relationshipLedger.entities.pc),
    arcConstraint: window.state._arcConstraints && window.state._arcConstraints['test:a_locked_place'],
    arcDeferrals: window.state._arcConstraintDeferrals,
  };
});
ok('STEP4 old stage (s1) is CLOSED with reason=issue_boundary (same _resetStoryState hook fires inside startBook2)', !!afterTransition.s1 && afterTransition.s1.lifecycle.closedReason === 'issue_boundary' && afterTransition.s1.lifecycle.closedAt != null, JSON.stringify(afterTransition.s1 && afterTransition.s1.lifecycle));
ok('STEP4 s1\'s issued content is byte-identical, untouched by the real transition', !!afterTransition.s1 && JSON.stringify(snapshotIssuedContent(afterTransition.s1)) === JSON.stringify(snapshotIssuedContent(book1Record)));
ok('STEP4 s1 is still stamped with BOOK 1\'s storyId (its own history, not rewritten)', !!afterTransition.s1 && afterTransition.s1.storyId === BOOK1_STORY_ID, afterTransition.s1 && afterTransition.s1.storyId);
ok('STEP4 no active physical stage under the NEW Issue\'s storyId', afterTransition.activeSceneKey == null, afterTransition.activeSceneKey);
ok('STEP4 established identities (pc anchor) remain resolvable after the real transition — the carried ledger, not a fresh empty one', afterTransition.pcResolvable);
ok('STEP4 the arc-constraint definition survives the real startBook2() transition — not in _resetStoryState()\'s clear-list', !!afterTransition.arcConstraint && afterTransition.arcConstraint.constraint_id === 'test:a_locked_place', JSON.stringify(afterTransition.arcConstraint));
ok('STEP4 the deferral recorded in Book 1 survives the real transition into the new Issue, verbatim', Array.isArray(afterTransition.arcDeferrals) && afterTransition.arcDeferrals.length === 1 && afterTransition.arcDeferrals[0].requested_intent_text === 'The reader insists on going there now, mid-Book-1.', JSON.stringify(afterTransition.arcDeferrals));
ok('STEP4 the two Julian entities from Book 1 are STILL the same ids in the carried ledger', await page.evaluate((ids) => !!(window.state._relationshipLedger && window.state._relationshipLedger.entities[ids[0]] && window.state._relationshipLedger.entities[ids[1]]), [accept1.j1id, accept1.j2id]));

// ── Issue 2's own first stage — s1's object must NOT be addressable without reissuance ──
STEP = '5-issue2-first-stage';
const issue2Accept = await page.evaluate(() => window._acceptStageProposal('s2', { present: ['pc'], source: 'issue-transition-proof-issue2' }));
ok('STEP5 Issue 2\'s own first stage accepts', issue2Accept.ok === true, JSON.stringify(issue2Accept.why));
ok('STEP5 Issue 2\'s stage carries no issued_objects — Book 1\'s object (' + (book1Record.issued_objects[0] && book1Record.issued_objects[0].object_id) + ') not addressable without reissuance', issue2Accept.ok && issue2Accept.record.issued_objects.length === 0);
ok('STEP5 the active stage is now Issue 2\'s own (s2)', (await page.evaluate(() => { const a = window._activeStageRecord(window.state); return a && a.sceneKey; })) === 's2');

// ── SUBSEQUENT REAL LIBRARY REOPEN — real Save & Exit click, real reload, real Continue click.
// Reuses Part 1's now-fixed real-click mechanism (state._fullyHydratedStoryId). ──
STEP = '6-save-close-real';
console.log('  [DIAG pre-save] ' + JSON.stringify(await page.evaluate(() => ({ storyId: window.state.storyId, stageStateKeys: window.state._stageState ? Object.keys(window.state._stageState) : null }))));
const saveVisible = await page.evaluate(() => { const b = document.getElementById('storySaveExitBtn') || document.getElementById('gnSaveExitBtn'); return !!(b && b.getClientRects().length > 0); });
ok('STEP6 a real Save & Exit affordance is visible after the transition', saveVisible);
const _saveLogs = [];
const _saveListener = m => { const t = m.text(); if (/Snapshot saved|Save failed/i.test(t)) _saveLogs.push(t.slice(0, 200)); };
page.on('console', _saveListener);
if (saveVisible) {
  const id = await page.evaluate(() => (document.getElementById('storySaveExitBtn') ? 'storySaveExitBtn' : 'gnSaveExitBtn'));
  await page.click('#' + id);
  await page.waitForTimeout(2000);
}
page.off('console', _saveListener);
console.log('  [DIAG save evidence] ' + JSON.stringify(_saveLogs));
ok('STEP6 close returns to the Library screen', (await page.evaluate(() => window._currentScreenId)) === 'vaultLibraryScreen');

STEP = '7-reload-and-real-click-reopen';
await page.reload({ waitUntil: 'commit' });
ok('STEP7 page reload completes', await waitForBoot(page));
const postReloadDiag = await page.evaluate(() => ({ storyId: window.state.storyId, hydrated: window.state._fullyHydratedStoryId, hasStageState: !!window.state._stageState, hasSavedStoryFn: (typeof window.hasSavedStory === 'function') ? window.hasSavedStory() : 'n/a' }));
console.log('  [DIAG STEP7 post-reload, pre-click] ' + JSON.stringify(postReloadDiag));
await page.click('#burgerBtn');
await page.waitForTimeout(400);
await page.click('.vault-tab[data-vault-section="Stories"]');
await page.waitForTimeout(300);
await page.click('.vault-nav[data-vault-section="SavedStories"]');
await page.waitForTimeout(600);
// Two rows exist by this point — Book 1's (autosaved during normal play, before the
// transition) and Book 2's (saved by STEP6's click). Select by TITLE, never by position:
// picking .first() here found this exact bug (it resumed Book 1, not Book 2 — the Supabase
// fallback for Book 1's id then CSP-violated in this headless context, discovered while
// debugging, unrelated to stage-state itself, and left in this comment rather than hidden).
const allRows = page.locator('#vaultSavedStoriesList .vault-saved-story-row');
const rowCount = await allRows.count();
ok('STEP7 at least one saved-story row exists', rowCount > 0, rowCount);
note('STEP7 saved-story rows present: ' + rowCount + ' (Book 1 + Book 2, expected once both have been saved at least once)');
const allRowTexts = await allRows.allTextContents();
console.log('  [DIAG STEP7 row texts] ' + JSON.stringify(allRowTexts));
// SEPARATE, PRE-EXISTING DEFECT FOUND HERE (disclosed, not fixed — out of scope for this
// registry task): in this two-book same-tab scenario, both Saved Stories rows displayed the
// IDENTICAL title/scene-count text ("Fate Begins to Weave0 scenes..." for both) — title-based
// row selection, which worked when only one story existed, is unreliable here. Rather than
// guess at list ordering (a prior guess of .first() already found a DIFFERENT wrong-row bug
// this session), this self-verifies: try each row in turn, reload between attempts, and accept
// only the one that actually resumes Book 2's real storyId.
async function openLibrarySavedStories(pg) {
  await pg.click('#burgerBtn');
  await pg.waitForTimeout(400);
  await pg.click('.vault-tab[data-vault-section="Stories"]');
  await pg.waitForTimeout(300);
  await pg.click('.vault-nav[data-vault-section="SavedStories"]');
  await pg.waitForTimeout(600);
}
let resumedCorrectly = false;
for (let idx = 0; idx < rowCount && !resumedCorrectly; idx++) {
  if (idx > 0) {
    await page.reload({ waitUntil: 'commit' });
    await waitForBoot(page);
    await openLibrarySavedStories(page);
  }
  const preClickHydrated = await page.evaluate(() => ({ storyId: window.state.storyId, hydrated: window.state._fullyHydratedStoryId }));
  console.log('  [DIAG row[' + idx + '] pre-click] ' + JSON.stringify(preClickHydrated));
  const _loopClickLogs = [];
  const _loopListener = m => { try { _loopClickLogs.push(m.text().slice(0, 200)); } catch (_) {} };
  page.on('console', _loopListener);
  const row = page.locator('#vaultSavedStoriesList .vault-saved-story-row').nth(idx);
  const continueBtn = row.getByRole('button', { name: 'Continue', exact: true });
  await continueBtn.click();
  await page.waitForTimeout(1500);
  page.off('console', _loopListener);
  console.log('  [DIAG row[' + idx + '] click console (BETA/CONTINUE only)] ' + JSON.stringify(_loopClickLogs.filter(l => /BETA|CONTINUE|library_resume/i.test(l))));
  for (let i = 0; i < 20; i++) {
    const scr = await page.evaluate(() => window._currentScreenId);
    if (scr === 'game' || scr === 'gnReader') break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);
  const gotStoryId = await page.evaluate(() => window.state.storyId);
  note('STEP7 row[' + idx + '] Continue click resumed storyId=' + gotStoryId);
  if (gotStoryId === transitionResult.newStoryId) resumedCorrectly = true;
}
ok('STEP7 a real Continue click resumes Book 2 specifically (tried each ambiguous row until confirmed correct)', resumedCorrectly);
console.log('  [DIAG STEP7 post-click screen] ' + JSON.stringify(await page.evaluate(() => ({ screen: window._currentScreenId, storyId: window.state.storyId, hasStageState: !!window.state._stageState }))));
const finalState = await page.evaluate(() => {
  const active = window._activeStageRecord ? window._activeStageRecord(window.state) : null;
  return {
    storyId: window.state.storyId,
    previousStoryId: window.state.previous_story_id,
    s1: window.state._stageState && window.state._stageState.s1,
    s2: window.state._stageState && window.state._stageState.s2,
    activeSceneKey: active && active.sceneKey,
    pcResolvable: !!(window.state._relationshipLedger && window.state._relationshipLedger.entities && window.state._relationshipLedger.entities.pc),
    arcConstraint: window.state._arcConstraints && window.state._arcConstraints['test:a_locked_place'],
    arcDeferrals: window.state._arcConstraintDeferrals,
  };
});
ok('STEP7 the NEW Issue (not Book 1) resumed via the real click', finalState.storyId === transitionResult.newStoryId, finalState.storyId + ' vs ' + transitionResult.newStoryId);

// RETRACTED 2026-09-14: the earlier version of this section disclosed what it called a "real,
// pre-existing getStoryRegistry() defect" and skipped the assertions below. That was wrong —
// see the two correction notes above (8s settle + real per-storyId Supabase stub). With both
// fixed, this reopen restores correctly and these assertions run for real, not skipped.
ok('STEP7 the arc-constraint definition survives a real save/reload/Library-click AFTER the real transition', !!finalState.arcConstraint && finalState.arcConstraint.constraint_id === 'test:a_locked_place');
ok('STEP7 the deferral recorded before the transition survives this final real round trip, verbatim', Array.isArray(finalState.arcDeferrals) && finalState.arcDeferrals.length === 1 && finalState.arcDeferrals[0].requested_intent_text === 'The reader insists on going there now, mid-Book-1.');
ok('STEP7 lineage pointer survives the real save/reopen', finalState.previousStoryId === BOOK1_STORY_ID);
ok('STEP7 s1 is STILL immutable, closed history after a real save/reopen', !!finalState.s1 && finalState.s1.lifecycle.closedReason === 'issue_boundary' && JSON.stringify(snapshotIssuedContent(finalState.s1)) === JSON.stringify(snapshotIssuedContent(book1Record)));
ok('STEP7 no active physical stage that is s1 after the real reopen', finalState.activeSceneKey !== 's1', finalState.activeSceneKey);
ok('STEP7 the active stage is s2 (Issue 2\'s own, freshly issued)', finalState.activeSceneKey === 's2', finalState.activeSceneKey);
ok('STEP7 s1\'s object is NOT addressable in s2 without explicit reissuance, after the real reopen', !!finalState.s2 && finalState.s2.issued_objects.length === 0 && JSON.stringify(finalState.s2).indexOf(book1Record.issued_objects[0].object_id) === -1);
ok('STEP7 established identity (pc) remains resolvable after the real reopen', finalState.pcResolvable);

console.log('\n' + '='.repeat(60));
const passCount = rows.filter(r => r[1]).length, failCount = rows.length - passCount;
console.log(`STAGE-STATE REAL ISSUE-TRANSITION PROOF (startBook2, not _resetStoryState alone): ${rows.length} rows · ${passCount} passed · ${failCount} failed`);
await browser.close();
process.exit(failCount ? 1 : 0);
