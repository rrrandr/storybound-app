// ═══ STAGE-STATE SUBSTRATE — REAL LIBRARY-CLICK PERSISTENCE PROOF (Roman 2026-09-14) ═══
// PART 1 of two corrections. The offline suite (_stage_state_substrate_control.mjs) proves the
// helpers' LOGIC against real extracted source in a sandbox. This file proves an accepted stage
// record survives the app's ACTUAL save -> close -> reload -> Library-CLICK-resume path, using
// ONLY real clicks — no window.continueStory() shortcut anywhere in this file.
//
// This file's first run (2026-09-14, earlier) found a REAL, reproducible defect: the Saved
// Stories row's "already the current story" fast path (renderVaultSavedStories(), two sibling
// instances) trusted "r.storyId === state.storyId" alone as proof the full snapshot was already
// in memory. It is not — boot sets state.storyId from localStorage immediately (~app.js:312162)
// without loading the rest of state, so after ANY fresh page load this branch silently skipped
// the real restore. FIXED in public/app.js: a new state._fullyHydratedStoryId marker, set only
// by continueStory()'s successful restore or a genuine fresh genesis in _resetStoryState(), is
// now required alongside the storyId match before either fast path fires.
//
// This file re-proves the fix directly: Save & Exit -> Library -> real Continue click, repeated
// TWICE in the same tab (with a real page.reload() between each cycle, since that reload is
// exactly what the bug required to manifest — a same-tab click with no intervening reload was
// never actually broken). Each cycle asserts stage-state history, the active stage, resolvable
// entities, and disambiguators all restore correctly via the real click alone.
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
page.on('console', m => { const t = m.text(); if (/Past _beginStoryInProgress guard|SCENE1|BeginStory\]|AUTHOR-FALLBACK|ERROR|error/i.test(t)) diagLogs.push(t.slice(0, 220)); });

await installSession(page);
await page.route('**/sb-test.localhost/**', async route => {
  const req = route.request();
  const accept = req.headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
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
  let content = '{}';
  if (kind === 'planner') {
    const env = JSON.parse(F.plannerReply(usr, null));
    const asked = /"stage_contract": \{|STAGE_CONTRACT RULES|STAGE_CONTRACT \(REQUIRED\)/.test(usr);
    const issued = [...usr.matchAll(/^\s+·\s+(\S+)\s*$/gm)].map(x => x[1]);
    if (asked) {
      const self = 'pc:self'; const other = issued.find(r => r !== self) || null;
      env.stage_contract = { v: 1,
        participants: [{ ref: self, presence: 'IN_PERSON' }].concat(other ? [{ ref: other, presence: 'ANTICIPATED' }] : []),
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
  else content = JSON.stringify(F.GENERIC);
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

const STORY_ID = 'stagepersist-' + Math.random().toString(36).slice(2, 8);
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

STEP = '2-begin';
let raceOutcome = null;
try {
  raceOutcome = await page.evaluate(() => Promise.race([
    window.handleBeginStory().then(() => 'resolved', e => 'rejected:' + String(e && e.message).slice(0, 160)),
    new Promise(x => setTimeout(() => x('timeout180s'), 180000)),
  ]));
} catch (_) {}
await page.waitForTimeout(4000);
const afterBegin = await page.evaluate(() => ({ screen: window._currentScreenId, pages: window.StoryPagination.getPageCount(), storyId: window.state.storyId }));
ok('STEP2 unseeded literary story reaches a mounted scene (race=' + raceOutcome + ')', afterBegin.screen === 'game' && afterBegin.pages > 0, JSON.stringify(afterBegin));
if (afterBegin.screen !== 'game') {
  console.log('  [DIAG] last 15 console lines: ' + JSON.stringify(diagLogs.slice(-15)));
  console.log('CANNOT PROCEED — no mounted story to attach a stage proposal to.');
  await browser.close(); process.exit(1);
}

await page.evaluate(() => {
  const n = window.StoryPagination.getPageCount();
  if (n > 0 && typeof window.StoryPagination.goToPage === 'function') window.StoryPagination.goToPage(n - 1, false);
  if (typeof window.showReaderPage === 'function') window.showReaderPage(2);
});
await page.waitForTimeout(1000);

// ── ACCEPT a real stage: participants, an issued object with ownership, an affordance, and
// two same-labeled entities to force present_disambiguators — against the REAL, running app. ──
STEP = '3-accept-stage-1';
const accept1 = await page.evaluate(() => {
  window._ensureStoryEntityAnchors();
  const j1 = window._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the elder scholar' });
  const j2 = window._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the stable hand' });
  const accepted = window._acceptStageProposal('s1', {
    present: ['pc', j1.entity.id, j2.entity.id],
    location: { location_ref: 'willow-clearing', issued_by: 'seed_authored', time_offset_from_prior_scene: 'continuous' },
    issued_objects: [{ object_id: 's:s1:O1', label: 'the ceremonial sash', owner_or_caretaker_ref: 'pc', held_by: 'pc', addressable_by: ['pc'] }],
    affordances: ['stay and answer', 'break away toward Julian'],
    source: 'persistence-proof'
  });
  return { j1id: j1.entity.id, j2id: j2.entity.id, accepted };
});
ok('STEP3 real accept succeeds against the live app', accept1.accepted.ok === true, JSON.stringify(accept1.accepted.why));
ok('STEP3 present_disambiguators populated for the two same-named entities before save', !!(accept1.accepted.ok && accept1.accepted.record.present_disambiguators[accept1.j1id] && accept1.accepted.record.present_disambiguators[accept1.j2id]));

// ── ARC-CONSTRAINT REGISTRY — REAL persistence check, same real app, same real save/reload/
// click cycle. This literary-control story has no seed (no arcConstraints array to bootstrap
// from), so a synthetic constraint is written directly, exercising the SAME real, persisted
// state fields (_arcConstraints/_committedStoryEvents/_arcConstraintDeferrals) the First-
// Sacrifice-scoped offline suite (_arc_constraint_registry_control.mjs) already proves correct
// against the real seed data. This proves the MECHANISM survives a real round trip; the offline
// suite proves the CONTENT (which story gets which lock) is correct. ──
STEP = '3b-arc-constraint-attempt';
const arcAttempt = await page.evaluate(() => {
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
  return window._attemptArcConstraintTarget('landmark', 'a_locked_place', 'The reader insists on going there now.');
});
ok('STEP3b a real attempt against a locked target is deferred, not discarded', arcAttempt.ok === true && arcAttempt.available === false, JSON.stringify(arcAttempt));
ok('STEP3b only the canon-approved reason key is exposed', arcAttempt.reason_key === 'preliminary_process_before_formal_inquiry');

function snapshotIssuedContent(rec) {
  return { location: rec.location, present: rec.present.slice().sort(), issued_objects: rec.issued_objects, affordances: rec.affordances, present_disambiguators: rec.present_disambiguators };
}

// ── THE REAL-CLICK CYCLE: Save & Exit -> real page reload (clears runtime) -> real Library
// navigation -> real click on the row's own "Continue" button -> read state back. NO
// window.continueStory() shortcut anywhere in this function. ──
async function realClickSaveCloseReopenCycle(pg, cycleLabel) {
  const saveVisible = await pg.evaluate(() => { const b = document.getElementById('storySaveExitBtn'); return !!(b && b.getClientRects().length > 0); });
  ok(cycleLabel + ' the real #storySaveExitBtn is visible', saveVisible);
  if (saveVisible) { await pg.click('#storySaveExitBtn'); await pg.waitForTimeout(2000); }
  ok(cycleLabel + ' close returns to the Library screen', (await pg.evaluate(() => window._currentScreenId)) === 'vaultLibraryScreen');

  await pg.reload({ waitUntil: 'commit' });
  ok(cycleLabel + ' page reload completes (runtime state genuinely cleared)', await waitForBoot(pg));
  const preClick = await pg.evaluate(() => ({ storyId: window.state.storyId, hydrated: window.state._fullyHydratedStoryId, hasStageState: !!window.state._stageState }));
  console.log('  [DIAG ' + cycleLabel + ' post-reload, pre-click] ' + JSON.stringify(preClick));

  await pg.click('#burgerBtn');
  await pg.waitForTimeout(400);
  await pg.click('.vault-tab[data-vault-section="Stories"]');
  await pg.waitForTimeout(300);
  await pg.click('.vault-nav[data-vault-section="SavedStories"]');
  await pg.waitForTimeout(600);
  const rowLocator = pg.locator('#vaultSavedStoriesList .vault-saved-story-row').first();
  const rowCount = await rowLocator.count();
  ok(cycleLabel + ' a saved-story row exists in the real Library UI', rowCount > 0);
  if (!rowCount) return null;

  // THE REAL CLICK — the exact affordance a reader uses. No internal function call.
  const continueBtn = rowLocator.getByRole('button', { name: 'Continue', exact: true });
  await continueBtn.click();
  await pg.waitForTimeout(1500);
  for (let i = 0; i < 20; i++) {
    const scr = await pg.evaluate(() => window._currentScreenId);
    if (scr === 'game' || scr === 'gnReader') break;
    await pg.waitForTimeout(1000);
  }
  await pg.waitForTimeout(1500);

  const after = await pg.evaluate(() => {
    const active = window._activeStageRecord ? window._activeStageRecord(window.state) : null;
    return {
      screen: window._currentScreenId,
      storyId: window.state.storyId,
      hasStageState: !!window.state._stageState,
      stageStateKeys: window.state._stageState ? Object.keys(window.state._stageState) : null,
      s1: window.state._stageState && window.state._stageState.s1,
      s2: window.state._stageState && window.state._stageState.s2,
      activeSceneKey: active && active.sceneKey,
      pcEntityResolvable: !!(window.state._relationshipLedger && window.state._relationshipLedger.entities && window.state._relationshipLedger.entities.pc),
      arcConstraint: window.state._arcConstraints && window.state._arcConstraints['test:a_locked_place'],
      arcDeferrals: window.state._arcConstraintDeferrals,
    };
  });
  ok(cycleLabel + ' the real Continue click (not a direct function call) restored the full snapshot', after.screen === 'game' || after.screen === 'gnReader', JSON.stringify({ screen: after.screen, storyId: after.storyId }));
  ok(cycleLabel + ' state._stageState round-tripped via the real click (this is exactly the bug that was fixed)', after.hasStageState, JSON.stringify(after));
  return after;
}

STEP = '4-cycle-1';
const cycle1 = await realClickSaveCloseReopenCycle(page, 'CYCLE1');
if (cycle1) {
  ok('CYCLE1 storyId matches the original story', cycle1.storyId === STORY_ID, cycle1.storyId);
  ok('CYCLE1 s1 exists and matches pre-save content exactly', !!cycle1.s1 && JSON.stringify(snapshotIssuedContent(cycle1.s1)) === JSON.stringify(snapshotIssuedContent(accept1.accepted.record)), JSON.stringify(cycle1.s1));
  ok('CYCLE1 s1 is the ACTIVE stage (never closed, this is still the live scene)', cycle1.activeSceneKey === 's1', cycle1.activeSceneKey);
  ok('CYCLE1 the pc entity is resolvable via _relationshipLedger after the real click', cycle1.pcEntityResolvable);
  ok('CYCLE1 both same-named entities\' disambiguators survived the real click', !!cycle1.s1 && cycle1.s1.present_disambiguators[accept1.j1id] && cycle1.s1.present_disambiguators[accept1.j2id]);
  ok('CYCLE1 the arc-constraint definition survives the real save/reload/click', !!cycle1.arcConstraint && cycle1.arcConstraint.constraint_id === 'test:a_locked_place', JSON.stringify(cycle1.arcConstraint));
  ok('CYCLE1 the deferral record survives, intent still verbatim', Array.isArray(cycle1.arcDeferrals) && cycle1.arcDeferrals.length === 1 && cycle1.arcDeferrals[0].requested_intent_text === 'The reader insists on going there now.', JSON.stringify(cycle1.arcDeferrals));
}

// Between cycles: accept a SECOND stage (supersedes s1 as active; s1 becomes history) so the
// second cycle proves history + a DIFFERENT active stage both restore correctly, not just a
// repeat of the same single record.
STEP = '4b-accept-stage-2';
const accept2 = await page.evaluate(() => {
  const accepted = window._acceptStageProposal('s2', { present: ['pc'], location: { location_ref: 'the-square', issued_by: 'planner_proposed_accepted', time_offset_from_prior_scene: 'short_break' }, affordances: ['walk on'], source: 'persistence-proof-cycle2' });
  return accepted;
});
ok('STEP4b a second stage (s2) accepts, superseding s1', accept2.ok === true, JSON.stringify(accept2.why));

STEP = '5-cycle-2';
const cycle2 = await realClickSaveCloseReopenCycle(page, 'CYCLE2');
if (cycle2) {
  ok('CYCLE2 storyId still matches the original story', cycle2.storyId === STORY_ID, cycle2.storyId);
  ok('CYCLE2 s1 (now history) survives, unmutated, alongside s2', !!cycle2.s1 && JSON.stringify(snapshotIssuedContent(cycle2.s1)) === JSON.stringify(snapshotIssuedContent(accept1.accepted.record)), JSON.stringify(cycle2.s1));
  ok('CYCLE2 s1 is no longer the active stage (superseded by s2)', cycle2.s1 && cycle2.s1.status === 'superseded' && cycle2.s1.lifecycle.closedReason === 'scene_advanced');
  ok('CYCLE2 s2 is now the ACTIVE stage', cycle2.activeSceneKey === 's2', cycle2.activeSceneKey);
  ok('CYCLE2 s2\'s content matches what was accepted before this cycle\'s save', !!cycle2.s2 && cycle2.s2.location && cycle2.s2.location.location_ref === 'the-square');
  ok('CYCLE2 the pc entity is STILL resolvable after a second real click', cycle2.pcEntityResolvable);
  ok('CYCLE2 the two-cycles-old disambiguators on s1 are still intact (never mutated by later activity)', !!cycle2.s1 && cycle2.s1.present_disambiguators[accept1.j1id] && cycle2.s1.present_disambiguators[accept1.j2id]);
  ok('CYCLE2 the arc-constraint definition still survives after a SECOND real click cycle', !!cycle2.arcConstraint && cycle2.arcConstraint.constraint_id === 'test:a_locked_place');
  ok('CYCLE2 the deferral record still survives, unmutated, after a SECOND real click cycle', Array.isArray(cycle2.arcDeferrals) && cycle2.arcDeferrals.length === 1 && cycle2.arcDeferrals[0].requested_intent_text === 'The reader insists on going there now.');
}

console.log('\n' + '='.repeat(60));
const passCount = rows.filter(r => r[1]).length, failCount = rows.length - passCount;
console.log(`STAGE-STATE LIBRARY-CLICK PERSISTENCE PROOF (real clicks only): ${rows.length} rows · ${passCount} passed · ${failCount} failed`);
console.log('NOTE: this file proves the Library-click restore path only. It makes no claim about');
console.log('the Issue-transition (startBook2) lifecycle — see _stage_state_issue_transition_proof.mjs.');
await browser.close();
process.exit(failCount ? 1 : 0);
