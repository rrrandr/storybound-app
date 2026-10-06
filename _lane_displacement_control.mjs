// PLAYER-CHOICE DISPLACEMENT AND THE NULL AFTERMATH LANE. Provider-free, $0.
//
// The planner prompt permits chosen_aftermath_lane: null when a RECORDED, SEED-DECLARED displacing
// choice defers or replaces the scheduled frame (~app.js:195982). The gate rejected null unless a
// Tempt Fate rupture was active, so a planner obeying its own instructions was rejected. The gate
// now receives the SAME authoritative decision the prompt uses.
//
// These exercise the PRODUCTION functions in the page — _detectPlannerFunctionGap and
// _recordedChoiceDisplacesFrame — not copies.
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS, finalizePreview } from './_fs_story_setup.mjs';
import { setupStageOf, SETUP_RESPONSES } from './_reader_setup_fixtures.mjs';
import { isProviderEndpoint } from './_replay_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
// A REAL STORY MUST BE LOADED: _effectiveSceneRow needs a baked plan before it can return the
// scene row that carries the production lane menu. Without it the control would be testing stub
// lanes with no signalRx, and the mismatch and content checks would silently not apply.
await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();
  if (/\/api\/config/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  if (!isProviderEndpoint(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, fortunesRemaining: 9999, entitled: true, storypassEligible: true }) });
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}
  const st = setupStageOf(sys);
  if (st && SETUP_RESPONSES[st]) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: JSON.stringify(SETUP_RESPONSES[st]) }) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._detectPlannerFunctionGap === 'function', { timeout: 30000 });
await page.evaluate(() => { window.state.profileId = 'p'; window.state.fortunes = 9999;
  window.state.storypassEligible = true; window.state.subscribed = true;
  window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
const def = await findFSDef(page); await launchFS(page, def);
await unlockFS(page, 'lane-displacement'); await finalizePreview(page);

// A proposal that is otherwise VALID: a concrete consequence, a real actor, a real exit state.
// Only chosen_aftermath_lane varies across the cases below.
const PROPOSAL = {
  tactical_move: 'Lirael walks out of the clearing before the Dohkar can call his review, and the assembly watches her go.',
  event: 'Lirael leaves the rite in front of everyone, and the scheduled review is deferred because she is no longer there to answer.',
  forces_choice: 'The Dohkar must send for her or proceed without her.',
  precondition: 'Lirael chose to run rather than stay and answer.',
  aftermathObligations: 'The Dohkar must either summon her back or rule in her absence; her standing is now a matter of record either way.',
  slots: { actor: 'Lirael', action: 'walks out of the clearing', target: 'the presiding Dohkar',
    exitState: 'Lirael has left the rite and the review is deferred.' }
};
// THE REAL LANE MENU, read out of production via _effectiveSceneRow — the same source the gate
// call uses. Stub lanes carry no signalRx, so the mismatch and content checks would silently not
// apply, and the test would be measuring its own objects.
const LANES = await page.evaluate(() => {
  const row = (typeof window._effectiveSceneRow === 'function')
    ? window._effectiveSceneRow(window.state, 2) : null;
  const lanes = (row && Array.isArray(row.aftermathLanes)) ? row.aftermathLanes : null;
  return lanes ? lanes.map(l => ({ id: l.id, hasSignal: !!l.signalRx })) : null;
});
console.log('  real lane menu: ' + JSON.stringify(LANES));
if (!LANES || !LANES.length) {
  console.log('  *** could not read the production lane menu — refusing to test against stubs ***');
  await browser.close(); process.exit(1);
}
const LANE_IDS = LANES.map(l => l.id);

const realLanes = () => {
  const row = (typeof window._effectiveSceneRow === 'function')
    ? window._effectiveSceneRow(window.state, 2) : null;
  return (row && Array.isArray(row.aftermathLanes)) ? row.aftermathLanes : [];
};
const gate = (opts, laneId) => page.evaluate(([p, o, lane]) => {
  const row = (typeof window._effectiveSceneRow === 'function')
    ? window._effectiveSceneRow(window.state, 2) : null;
  const lanes = (row && Array.isArray(row.aftermathLanes)) ? row.aftermathLanes : [];
  const sc = Object.assign({}, p, { chosenAftermathLane: lane });
  const r = window._detectPlannerFunctionGap(sc, Object.assign({
    requiresAftermath: true, aftermathLanes: lanes,
    requiredLaneId: 'dohkar_preliminary_review'
  }, o));
  return { rejected: !!r.rejected, reason: r.reason || null };
}, [PROPOSAL, opts, laneId]);

console.log('=== 1. DECLARED "run" DISPLACEMENT + A NULL LANE ===');
{
  const r = await gate({ choiceDisplaced: true, displacementChoice: 'run' }, null);
  t('an otherwise-valid null-lane proposal PASSES the lane check', r.rejected === false,
    r.reason || '');
}
console.log('');
console.log('=== 2. "remain" WITH THE SAME PROPOSAL ===');
{
  // "remain" is not a declared displacing choice, so the gate is NOT told it was displaced.
  const r = await gate({ choiceDisplaced: false, displacementChoice: 'remain' }, null);
  t('the SAME null-lane proposal STILL FAILS under "remain"', r.rejected === true, r.reason || '');
  t('and it fails for the lane, not for something else',
    /chosen_aftermath_lane/.test(r.reason || ''), r.reason || '');
}
console.log('');
console.log('=== 3. AN UNSUPPORTED / SELF-CLAIMED DISPLACEMENT ===');
{
  // The planner asserts displacement inside its own reply. The gate must ignore that: the flag
  // comes only from _recordedChoiceDisplacesFrame, never from the proposal.
  const r = await page.evaluate(([p]) => {
    const sc = Object.assign({}, p, { chosenAftermathLane: null,
      displaced: true, frame_displaced: true, lane_posture_modulation: 'her action replaced it' });
    const row = window._effectiveSceneRow(window.state, 2);
    const out = window._detectPlannerFunctionGap(sc, { requiresAftermath: true,
      aftermathLanes: (row && row.aftermathLanes) || [], requiredLaneId: 'dohkar_preliminary_review' });
    return { rejected: !!out.rejected, reason: out.reason || null };
  }, [PROPOSAL]);
  t('a planner\'s SELF-CLAIMED displacement earns no exemption', r.rejected === true, r.reason || '');
}
console.log('');
console.log('=== 4. AN EMPTY CONSEQUENCE STILL FAILS ===');
{
  const r = await page.evaluate(() => {
    const sc = { tactical_move: '', event: '', forces_choice: '', precondition: '',
      aftermathObligations: '', chosenAftermathLane: null, slots: {} };
    const out = window._detectPlannerFunctionGap(sc, { requiresAftermath: true,
      aftermathLanes: (window._effectiveSceneRow(window.state, 2) || {}).aftermathLanes || [],
      requiredLaneId: 'dohkar_preliminary_review',
      choiceDisplaced: true, displacementChoice: 'run' });
    return { rejected: !!out.rejected, reason: out.reason || null };
  });
  // THIS GATE DELIBERATELY DECLINES TO JUDGE AN ABSENT PROPOSAL — app.js:9236 is
  //   if (!combined) return { rejected: false };  // do not reject on absence of data itself
  // That predates this change and is identical with and without displacement, so the exemption
  // did not open it. The emptiness check lives in the CONTINUATION ENVELOPE validator, asserted
  // just below.
  t('this gate does not judge an empty proposal — unchanged by the exemption',
    r.rejected === false, r.reason || '');
  const sameWithout = await page.evaluate(() => {
    const sc = { tactical_move: '', event: '', forces_choice: '', chosenAftermathLane: null };
    const out = window._detectPlannerFunctionGap(sc, { requiresAftermath: true,
      aftermathLanes: (window._effectiveSceneRow(window.state, 2) || {}).aftermathLanes || [],
      requiredLaneId: 'dohkar_preliminary_review' });
    return !!out.rejected;
  });
  t('and it behaves IDENTICALLY without displacement, so nothing was weakened',
    sameWithout === false);
  // WHERE THE EMPTY CHECK ACTUALLY LIVES: the continuation envelope.
  const env = await page.evaluate(() => {
    if (typeof window._validateContinuationProposal !== 'function') return { missing: true };
    const bad = window._validateContinuationProposal({ scene_purpose: '', forward_pressure: '',
      introduces: [], pressure_scope: 'scene_local' });
    const good = window._validateContinuationProposal({ scene_purpose: 'Turn the questioning into a claim.',
      forward_pressure: 'The demand must be answered somewhere.', canon_change: null,
      introduces: [], pressure_scope: 'scene_local' });
    return { badOk: !!bad.ok, badWhy: (bad.why || []).slice(0, 2), goodOk: !!good.ok };
  });
  if (env.missing) { t('the continuation envelope validator is reachable', false, 'not exported'); }
  else {
    console.log('  envelope on an EMPTY proposal: ok=' + env.badOk + ' why=' + JSON.stringify(env.badWhy));
    t('AN EMPTY CONSEQUENCE IS REJECTED by the envelope validator, where that check lives',
      env.badOk === false);
    t('and a complete envelope still passes it', env.goodOk === true);
  }
}
console.log('');
console.log('=== 5. TEMPT FATE BEHAVIOUR IS UNCHANGED ===');
{
  const a = await gate({ ruptureActive: true }, null);
  t('an active rupture still permits a null lane', a.rejected === false, a.reason || '');
  const b = await gate({ ruptureActive: false, choiceDisplaced: false }, null);
  t('and with neither rupture nor displacement, null is still refused', b.rejected === true,
    b.reason || '');
}
console.log('');
console.log('=== 6. A DECLARED LANE IS STILL CONTENT-CHECKED ===');
{
  // The displacement exemption must not become a general waiver: a WRONG lane still fails, and a
  // lane whose event does not instantiate it still fails.
  const wrong = await gate({ choiceDisplaced: true, displacementChoice: 'run' }, 'family_accusation');
  t('a lane that CONTRADICTS the required one still fails, even under displacement',
    wrong.rejected === true, wrong.reason || '');
  const bogus = await gate({ choiceDisplaced: true, displacementChoice: 'run' }, 'not_a_lane');
  t('a lane OUTSIDE the menu still fails under displacement', bogus.rejected === true,
    bogus.reason || '');
  const inert = await page.evaluate(() => {
    const sc = { tactical_move: 'She hesitates and says nothing.', event: 'She hesitates.',
      forces_choice: 'Nothing is forced.', precondition: 'x',
      aftermathObligations: 'Something may happen later.',
      chosenAftermathLane: 'dohkar_preliminary_review', slots: { action: 'hesitates', exitState: 'unchanged' } };
    const out = window._detectPlannerFunctionGap(sc, { requiresAftermath: true,
      aftermathLanes: (window._effectiveSceneRow(window.state, 2) || {}).aftermathLanes || [],
      requiredLaneId: 'dohkar_preliminary_review',
      choiceDisplaced: true, displacementChoice: 'run' });
    return { rejected: !!out.rejected, reason: out.reason || null };
  });
  t('a declared lane whose event does not instantiate it still fails', inert.rejected === true,
    inert.reason || '');
}
console.log('');
console.log('=== 7. THE DECISION SOURCE IS THE SEED, NOT THE PLANNER ===');
{
  const src = await page.evaluate(() => {
    const out = {};
    out.fnExists = typeof window._recordedChoiceDisplacesFrame === 'function';
    if (!out.fnExists) return out;
    // _sceneDecisionNeeded requires d.storyId === state.storyId, so a decision without it reads
    // as "no recorded choice" — which is what my first version measured.
    const sid = window.state.storyId || 'test-story';
    window.state.storyId = sid;
    window.state._sceneDecisions = { '1': { choice: 'run', label: 'run in shame', storyId: sid } };
    window.state._bakedEmitted = { axes: { displacingChoices: ['run'] } };
    out.run = window._recordedChoiceDisplacesFrame(window.state, { laneId: 'dohkar_preliminary_review' });
    window.state._sceneDecisions = { '1': { choice: 'remain', label: 'remain and see', storyId: sid } };
    out.remain = window._recordedChoiceDisplacesFrame(window.state, { laneId: 'dohkar_preliminary_review' });
    window.state._bakedEmitted = { axes: {} };
    window.state._sceneDecisions = { '1': { choice: 'run', label: 'run in shame', storyId: sid } };
    out.noSeedDeclaration = window._recordedChoiceDisplacesFrame(window.state, { laneId: 'dohkar_preliminary_review' });
    return out;
  });
  console.log('  run  -> ' + JSON.stringify(src.run));
  console.log('  remain -> ' + JSON.stringify(src.remain));
  console.log('  seed declares nothing -> ' + JSON.stringify(src.noSeedDeclaration));
  t('"run" displaces, because the SEED declares it', src.run && src.run.displaces === true);
  t('"remain" does NOT displace', src.remain && src.remain.displaces === false);
  t('and with no seed declaration, nothing displaces',
    src.noSeedDeclaration && src.noSeedDeclaration.displaces === false,
    'ending the OAS is never what displaces the frame — only the recorded choice');
}

await browser.close();
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
