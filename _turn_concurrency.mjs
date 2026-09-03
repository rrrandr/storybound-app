// ══════════════════════════════════════════════════════════════════════════════════════════
//  TWO REAL CONTINUATION TURNS, INTERLEAVED AT THE ACTUAL SEQUENCE AWAIT
//
//  _attempt_interleave.mjs proves the ownership rule against a COPY of the seam. This drives the
//  production submit → buildScenePlan → author → post-author → FINAL_PROSE → mount path twice,
//  parking turn A inside the REAL `_cpCanonSequence` await while turn B runs to completion, then
//  releasing A. Every provider is intercepted; nothing is paid for.
//
//  The concurrency is forced by re-enabling the submit button, which the UI disables during a
//  turn. That guard is presentational; the hazard it hides is not.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import vm from 'node:vm';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 700) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const MUT = process.env.SB_MUT || '';

const PLANNER_REPLY = JSON.stringify({
  environment_anchor: 'the salt-stiffened ledger rope across the harbour counter',
  structural_pacing: 'compressed', narrative_density: 'medium', dialogue_ratio: 'balanced',
  beat_style: 'escalating', tension_rhythm: 'rising', interlocutor_placement: 'across the counter',
  li_texture_beat: 'he squares the ledger without being asked',
  pc_body_callback: 'decision', li_body_callback: 'opening', antagonist_body_callback: null,
  staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
  environment_plus: { target: 'the harbour counter', axis: 'use' }, fusion: null
});
const DISCLOSURE_REPLY = JSON.stringify({
  characters: [{ name: 'the presiding Dohkar', present: true, relationshipToPC: null, newLayer: null, vehicle: 'none' }],
  scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.0 },
  sceneState: { setting: 'the harbour office', charactersPresent: ['the presiding Dohkar'] }
});
const NORMALIZE_REPLY = JSON.stringify({
  normalized_text: 'I ask him to clear the manifest before the tide turns.',
  canonical_instruction: 'I ask him to clear the manifest before the tide turns.',
  confidence_level: 'high' });
const AUTHOR_PROSE =
  'The harbour office was colder than the street, and the ledger rope had gone stiff with salt.\n\n'
+ 'The presiding Dohkar performed a rite he had performed many times, and did not trouble to '
+ 'look as though it mattered.\n\nWhen I asked again he did not look up.';

// ── SERVED-SOURCE INSTRUMENTATION ──
// Each replacement must match exactly once; the mutated source must parse before it is served.
const POINTS = [
  // ── HARNESS ISOLATION, NOT A BEHAVIOUR CHANGE ──
  // A boot-time CHECKOUT_RETURN branch fires handleBeginStory on a timer, which clears the
  // pagination and zeroes turnCount. It landed between A's click and B's, so B stopped being a
  // continuation. The other driver already isolates this; this suite set the flag but never
  // installed the guard, which is why the block looked like a lifecycle property. Production
  // behaviour is untouched — the guard reads a flag only this harness sets.
  ['isolate:checkout-autobegin',
   "              } else if (typeof window.handleBeginStory === 'function') {\n                  window.handleBeginStory();",
   "              } else if (typeof window.handleBeginStory === 'function' && !window.__ctNoAutoBegin) {\n                  window.handleBeginStory();"],
  // ── AN ORDERED, NON-THROWING TRACE OF WHAT RESETS MID-STORY STATE ──
  // Each point records the operation, the state it saw, and who called it. This answers "which
  // function turns turnCount=3/pages=1 into turnCount=1/pages=0" by observation, not inference.
  ['t:resetStory',
   "  function _resetStoryState() {",
   "  function _resetStoryState() {\n    try { (window.__ilog = window.__ilog || []).push({ at: 'reset:story',"
   + " turnCount: (window.state || {}).turnCount, pages: (window.StoryPagination && window.StoryPagination.getPageUids ? window.StoryPagination.getPageUids().length : -1),"
   + " by: String(new Error().stack || '').split('\\n').slice(1, 4).join(' | ') }); } catch (_) {}"],
  ['t:resetEpoch',
   "  function _resetEpochState() {",
   "  function _resetEpochState() {\n    try { (window.__ilog = window.__ilog || []).push({ at: 'reset:epoch',"
   + " by: String(new Error().stack || '').split('\\n').slice(1, 3).join(' | ') }); } catch (_) {}"],
  ['t:pagesClear',
   "      function clear() {\n          pages = [];",
   "      function clear() {\n          try { (window.__ilog = window.__ilog || []).push({ at: 'pages:clear',"
   + " had: pages.length, turnCount: (window.state || {}).turnCount,"
   + " by: String(new Error().stack || '').split('\\n').slice(1, 4).join(' | ') }); } catch (_) {}\n          pages = [];"],
  ['t:beginStory',
   "  async function handleBeginStory() {",
   "  async function handleBeginStory() {\n    try { (window.__ilog = window.__ilog || []).push({ at: 'beginStory',"
   + " turnCount: (window.state || {}).turnCount,"
   + " by: String(new Error().stack || '').split('\\n').slice(1, 4).join(' | ') }); } catch (_) {}"],
  // ── EVERY PREAMBLE EXIT, WITH ITS PREDICATE VALUES ──
  // B enters the handler and returns before sanitizeShortInput. These name which branch,
  // and on what inputs, rather than leaving it to be reasoned about.
  ['pre:altPOV',
   "      // library, not generate another scene.\n      try {\n        if (typeof _isAltPOVEdition === 'function' && _isAltPOVEdition()) {\n          var _altCount = (typeof _getAltPOVParentSceneCount === 'function') ? _getAltPOVParentSceneCount() : 0;\n          if (_altCount > 0 && (state.turnCount || 0) >= _altCount) {\n            await _finishAltPOVEdition();\n            return;",
   "      // library, not generate another scene.\n      try {\n        if (typeof _isAltPOVEdition === 'function' && _isAltPOVEdition()) {\n          var _altCount = (typeof _getAltPOVParentSceneCount === 'function') ? _getAltPOVParentSceneCount() : 0;\n          if (_altCount > 0 && (state.turnCount || 0) >= _altCount) {\n            try { (window.__ilog = window.__ilog || []).push({ at: 'return:altPOV', clicks: (window.__clicks || 0) }); } catch (_) {}\n            await _finishAltPOVEdition();\n            return;"],
  ['pre:bakedGate',
   "              try { document.getElementById('submitBtn')?.click(); } catch (_) {}\n            })) {\n          return;",
   "              try { document.getElementById('submitBtn')?.click(); } catch (_) {}\n            })) {\n          try { (window.__ilog = window.__ilog || []).push({ at: 'return:bakedGenesisGate', clicks: (window.__clicks || 0) }); } catch (_) {}\n          return;"],
  ['pre:cliffhanger',
   "          try { if (typeof window._showIssueCliffhangerModal === 'function') window._showIssueCliffhangerModal(); } catch (_) {}\n          return;",
   "          try { (window.__ilog = window.__ilog || []).push({ at: 'return:issueCliffhanger', clicks: (window.__clicks || 0) }); } catch (_) {}\n          try { if (typeof window._showIssueCliffhangerModal === 'function') window._showIssueCliffhangerModal(); } catch (_) {}\n          return;"],
  ['pre:inFlightEnter',
   "      if (state._isAdvancingScene) {",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'pre:inFlightCheck', clicks: (window.__clicks || 0), isAdvancing: !!state._isAdvancingScene, age: state._advanceStartedAt ? (Date.now() - state._advanceStartedAt) : null }); } catch (_) {}\n      if (state._isAdvancingScene) {"],
  ['pre:inFlightReturn',
   "              console.warn('[SUBMIT] Blocked — scene advance already in flight');",
   "              try { (window.__ilog = window.__ilog || []).push({ at: 'return:advanceInFlight', clicks: (window.__clicks || 0), age: _lockAge }); } catch (_) {}\n              console.warn('[SUBMIT] Blocked — scene advance already in flight');"],
  ['pre:passed',
   "      let rawAct = sanitizeShortInput($('actionInput').value, 2000);",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'preamble:passed', clicks: (window.__clicks || 0) }); } catch (_) {}\n      let rawAct = sanitizeShortInput($('actionInput').value, 2000);"],
  // ── ORDERED PROBES ALONG B'S PATH THROUGH THE REAL HANDLER ──
  // A is parked inside the sequence, so anything logged after B's click belongs to B.
  ['b:inputs-guard',
   "      if(!rawAct && !rawDia) {",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:inputs-guard', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n      if(!rawAct && !rawDia) {"],
  ['b:lastAction',
   "      state.lastActionAt = Date.now();",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:lastAction', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n      state.lastActionAt = Date.now();"],
  ['b:safeword',
   "      window.updateSafeWordVisibility = updateSafeWordVisibility;",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:safeword', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n      window.updateSafeWordVisibility = updateSafeWordVisibility;"],
  ['b:recalibration',
   "      if (state._fateRecalibrationPending) state._fateRecalibrationPending = false; // consume",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:recalibration', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n      if (state._fateRecalibrationPending) state._fateRecalibrationPending = false; // consume"],
  ['b:carryForward',
   "      var _explicitCarryForwardDirective = '';",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:carryForward', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n      var _explicitCarryForwardDirective = '';"],
  ['b:sceneIdx',
   "      var _currentSceneIdx = state.turnCount || 0;",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:sceneIdx', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n      var _currentSceneIdx = state.turnCount || 0;"],
  ['b:debugGate',
   "      if (state.debugMode === true) {",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:debugGate', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n      if (state.debugMode === true) {"],
  ['b:formatScene',
   "          var _formattedScene = formatStory(raw);",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:formatScene', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n          var _formattedScene = formatStory(raw);"],
  ['b:stagedRouting',
   "          var _stagedRouting = (_isStagedMode() && state._stagedAwaitingProse);",
   "      try { (window.__ilog = window.__ilog || []).push({ at: 'b:stagedRouting', clicks: (window.__clicks || 0), turnCount: (window.state || {}).turnCount }); } catch (_) {}\n          var _stagedRouting = (_isStagedMode() && state._stagedAwaitingProse);"],
  ['click:enter',
   "  $('submitBtn')?.addEventListener('click', async () => {",
   "  $('submitBtn')?.addEventListener('click', async () => {\n"
   + "      try { (window.__ilog = window.__ilog || []).push({ at: 'click', n: (window.__clicks = (window.__clicks || 0) + 1),"
   + " turnCount: (window.state || {}).turnCount, pages: (window.StoryPagination.getPageUids() || []).length }); } catch (_) {}"],
  // 1. Park the FIRST attempt inside the real sequence await, and record what it minted.
  ['mint',
   "                var _pageAttemptC = _cpMintAttemptId();",
   "                var _pageAttemptC = _cpMintAttemptId();\n"
   + "                var _ilN = (window.__ilN = (window.__ilN || 0) + 1);\n"
   + "                try { (window.__ilog = window.__ilog || []).push({ at: 'mint', turn: _ilN, id: _pageAttemptC }); } catch (_) {}"],
  // THE HOLD IS INSIDE THE SEQUENCE, after its entry has been reached — not before the call.
  // Parking before the call proves only that the caller got there.
  // `_ilSeq` is a per-invocation LOCAL and the verdict must read IT, not window.__ilSeq: reading
  // the shared counter after the await gave A the value B had since written, so both attempts
  // returned 'compatible'. That is the identical read-after-await mistake this whole repair is
  // about, committed in the harness that was meant to detect it.
  ['park-inside-sequence',
   "  async function _cpCanonSequence(prose, model, opts) {\n    opts = opts || {};",
   "  async function _cpCanonSequence(prose, model, opts) {\n    opts = opts || {};\n"
   + "    var _ilSeq = (window.__ilSeq = (window.__ilSeq || 0) + 1);\n"
   + "    try { (window.__ilog = window.__ilog || []).push({ at: 'seq:entry', call: _ilSeq }); } catch (_) {}\n"
   + "    if (_ilSeq === 1) { try { window.__parked = true; } catch (_) {} await new Promise(function (r) { window.__releaseA = r; }); }"],
  // 2. Give the two turns DIFFERENT verdicts, so a crossover is visible rather than inferred.
  ['verdict-per-turn',
   "      out.publish = true; out.commit = true; out.semanticStatus = 'unresolved';\n      return out;",
   "      out.publish = true; out.commit = true;\n"
   + "      out.semanticStatus = (_ilSeq === 1) ? 'contradiction' : 'compatible';\n"
   + "      out.publishedWithConflict = (_ilSeq === 1);\n      return out;"],
  // 3. Record which attempt mounted which page.
  ['store',
   "                  _cpStoreSeqResult(state, _pageAttemptC, {",
   "                  try { (window.__ilog = window.__ilog || []).push({ at: 'store', id: _pageAttemptC }); } catch (_) {}\n"
   + "                  _cpStoreSeqResult(state, _pageAttemptC, {"],
  ['mount',
   "            StoryPagination.addPage(pageContent, true, undefined,",
   "            try { (window.__ilog = window.__ilog || []).push({ at: 'mount', id: _pageAttemptC,"
   + " uid: (window.StoryPagination.getPageUids() || []).length }); } catch (_) {}\n"
   + "            StoryPagination.addPage(pageContent, true, undefined,"],
  // 4. Record what each commit was handed, and for which page.
  ['commit',
   "          window._cpCommitScene({ sceneUid: sceneUid, ordinal: sceneNum,",
   "          var _ilArg = { sceneUid: sceneUid, ordinal: sceneNum,"],
  ['commit-call',
   "            delivered: _delivered, appeared: _appeared });",
   "            delivered: _delivered, appeared: _appeared };\n"
   + "          try { (window.__ilog = window.__ilog || []).push({ at: 'commit', uid: sceneUid,"
   + " pageAttempt: _pageAttempt, handed: _ilArg.semanticStatus === undefined ? '(absent)' : _ilArg.semanticStatus,"
   + " mapKeys: Object.keys(window.state._cpCanonSequenceResults || {}).length,"
   + " facets: (_ilArg.delivered || []).map(function (d) { return d.facet_id; }) }); } catch (_) {}\n"
   + "          window._cpCommitScene(_ilArg);"],
  // 5. The UI disables submit during a turn; the hazard under test is not presentational.
  ['unlock',
   "          submitBtn.classList.add('submitting');\n          submitBtn.disabled = true;",
   "          submitBtn.classList.add('submitting');\n          submitBtn.disabled = true;"
   + " try { if (window.__forceConcurrent) setTimeout(function () { submitBtn.disabled = false; }, 0); } catch (_) {}"],
];

// ── THE OLD DESIGN, REINTRODUCED (SB_OLD_SLOT=1) ──
// A passing arm is not proof unless the previous design fails it. This restores exactly what was
// removed: identity read from a shared scalar AFTER the await, and ONE result slot. It also parks
// B after it stores, so A can commit while B's result is the one sitting in that slot — the
// ordering under which the old code hands a page another turn's verdict.
const OLD_SLOT = process.env.SB_OLD_SLOT === '1';
const OLD = OLD_SLOT ? [
  ['old:mint-side-effect',
   "                var _pageAttemptC = _cpMintAttemptId();",
   "                var _pageAttemptC = _cpMintAttemptId(); window.state._cpAttemptId = _pageAttemptC;"],
  ['old:single-slot-store',
   "                  _cpStoreSeqResult(state, _pageAttemptC, {",
   "                  window.state._cpSharedSlot = ({"],
  ['old:stamp-from-shared',
   "                    attemptId: _pageAttemptC,",
   "                    attemptId: (window.state._cpAttemptId || null),"],
  ['old:park-after-store',
   "            pageContent += _formattedScene;",
   "            if (window.__parkAfterStore && !window.__bParked) { window.__bParked = true;"
   + " await new Promise(function (r) { window.__releaseB = r; }); }\n            pageContent += _formattedScene;"],
  ['old:page-from-shared',
   "              { cpAttemptId: (typeof _pageAttemptC !== 'undefined' ? _pageAttemptC : null) });",
   "              { cpAttemptId: (window.state._cpAttemptId || null) });"],
  ['old:single-slot-take',
   "            ? _cpTakeSeqResult(window.state, _pageAttempt) : null;",
   "            ? (window.state._cpSharedSlot || null) : null;"],
] : [];

let body = SRC;
const ALL = POINTS.concat(OLD);
const counts = ALL.map(([, from]) => body.split(from).length - 1);
ALL.forEach(([, from, to]) => { body = body.replace(from, to); });
if (MUT) {
  const [from, to] = MUT.split('@@TO@@');
  const n = body.split(from).length - 1;
  if (n !== 1) { console.error(`\n  MUTATION MARKER NOT UNIQUE: ${n}\n`); process.exit(2); }
  body = body.replace(from, to);
}
let perr = null;
try { new vm.Script(body, { filename: 'concurrency.js' }); } catch (e) { perr = String((e && e.message) || e); }

ok('C1 the instrumentation pre-flights clean — every point matching once, source still parses',
   counts.every(c => c === 1) && !perr, `counts=${JSON.stringify(counts)} perr=${perr}`);
if (!counts.every(c => c === 1) || perr) {
  console.log('\n' + out.join('\n') + `\n\n  ${pass} passed · ${fail} failed\n`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const escaped = [], calls = [], logs = [];
await installSession(page);
await page.addInitScript((oldSlot) => { window.__ctNoAutoBegin = true; window.__forceConcurrent = true;
  if (oldSlot) window.__parkAfterStore = true; }, OLD_SLOT);
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let payload = ''; try { payload = route.request().postData() || ''; } catch (_) {}
  calls.push({ path, payload });
  let reply = AUTHOR_PROSE;
  if (/CHARACTER_CANON_AUDITOR/.test(payload)) reply = '{"verdicts":[]}';
  else if (/charactersPresent|relationshipToPC/.test(payload)) reply = DISCLOSURE_REPLY;
  else if (/narrative skeleton|environment_anchor/i.test(payload)) reply = PLANNER_REPLY;
  else if (/normaliz/i.test(payload) || /canonical_instruction|normalized_text/.test(payload)) reply = NORMALIZE_REPLY;
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, content: reply,
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: reply } }] }) });
});
await page.route('**/app.js*', r => r.fulfill({ status: 200,
  contentType: 'application/javascript; charset=utf-8', body }));
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
page.on('console', m => { const x = m.text(); if (/CANON:SEQUENCE|CPLUS/i.test(x)) logs.push(x.slice(0, 200)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 180)));
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.__generateSceneSkeleton, { timeout: 60000 });

const minted = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'conc-4', turnCount: 3, scenes: ['a', 'b', 'c'], sceneSkeleton: null,
    issueNumber: 1, renderMode: 'literary', currentEngine: 'literary',
    fortunes: 9999999, access: 'sub', subscribed: true, tier: 'fling', intensity: 'Steamy',
    myUid: 'probe', _bakedSetupComplete: true, _bakedGenesisUnlocked: true,
    nextIssueAvailable: false, continuationPurchaseRequired: false });
  s._relationshipLedger = null;
  window.StoryPagination.addPage('<p>An earlier scene, already read.</p>', true, 'conc-prior', { invocationId: 'inv-prior' });
  await window.__generateSceneSkeleton('she pushes past the clerk', 'I need the manifest cleared.', {});
  const cp = ((s.sceneSkeleton || {}).character_plus || [])[0] || null;
  return cp ? { canonicalId: cp.canonicalId, facet_id: cp.facet_id, character: cp.character } : null;
});
ok('C2 a backend-minted C+ assignment exists — the turns have a facet to commit',
   !!minted && !!minted.facet_id, JSON.stringify(minted));

const fire = () => page.evaluate(() => {
  const a = document.getElementById('actionInput'), d = document.getElementById('dialogueInput');
  const b = document.getElementById('submitBtn');
  if (!b) return false;
  b.disabled = false;
  a.value = 'I ask him to clear the manifest before the tide turns.';
  if (d) d.value = 'You have done this a hundred times. Do it once more.';
  b.click();
  return true;
});

// ── TURN A: fired, then parked inside the real sequence await ──
await fire();
let parked = false;
for (let i = 0; i < 240; i++) {
  parked = await page.evaluate(() => window.__parked === true).catch(() => false);
  if (parked) break;
  await new Promise(r => setTimeout(r, 500));
}
ok('C3 ★ turn A reached the INSIDE of the real _cpCanonSequence and parked there',
   parked === true, `parked=${parked} log=${JSON.stringify(logs.slice(-4))}`);

// ── THE ISOLATION HELD, AND THE STATE IS STILL MID-STORY ──
const preB = await page.evaluate(() => ({
  log: window.__ilog || [],
  turnCount: (window.state || {}).turnCount,
  pages: (window.StoryPagination.getPageUids() || []).length }));
const clickIdx = preB.log.findIndex(x => x.at === 'click');
const afterClick = clickIdx >= 0 ? preB.log.slice(clickIdx + 1) : preB.log;
ok('C3b ★ no auto-begin, clearStoryForNewStart or pagination clear occurred after A\'s click',
   !afterClick.some(x => x.at === 'beginStory' || x.at === 'pages:clear'
                         || x.at === 'reset:story' || x.at === 'reset:epoch'),
   JSON.stringify(afterClick.map(x => x.at)));
// A increments turnCount before it reaches the seam, so 3 was the wrong expectation — what
// matters is that B is fired into a VALID continuation state, not a stale one.
ok('C3c ★ B is fired into a valid continuation state — turnCount advanced, one mounted page',
   preB.turnCount >= 4 && preB.pages === 1,
   `turnCount=${preB.turnCount} pages=${preB.pages}`);

// ── AGE THE LOCK PAST THE STALE THRESHOLD ──
// 552ms of serialization only proves rapid double-clicks are refused. The guard deliberately
// releases a lock older than 90s, so a long-running or stranded attempt is admitted alongside one
// still in flight — the exact overlap the ownership design must survive. Nothing in production
// changes: only the timestamp the guard reads moves, and `_isAdvancingScene` stays TRUE.
const aged = await page.evaluate(() => {
  const s = window.state;
  const before = { isAdvancing: !!s._isAdvancingScene, startedAt: s._advanceStartedAt || null };
  s._advanceStartedAt = Date.now() - 91000;
  return { before, after: { isAdvancing: !!s._isAdvancingScene, startedAt: s._advanceStartedAt },
           ageNow: Date.now() - s._advanceStartedAt };
});
const seqEntriesBeforeB = await page.evaluate(() => (window.__ilog || []).filter(x => x.at === 'seq:entry').length);
ok('C3d ★ ONLY the lock age changed — the in-flight lock is still live and A is still parked inside the sequence',
   aged.before.isAdvancing === true && aged.after.isAdvancing === true
   && aged.ageNow > 90000 && seqEntriesBeforeB === 1,
   JSON.stringify({ aged, seqEntriesBeforeB }));

// ── TURN B: admitted through the stale-lock escape, alongside A ──
await fire();
// B MUST FINISH ENTIRELY WHILE A IS STILL PARKED. Waiting only for B's mint and releasing then
// would allow a serial outcome — A resumes, and both finish afterwards — which proves nothing
// about overlap. B has to reach its sequence, store, mount and commit with __parked still true.
let bDone = false, parkedThroughout = true;
for (let i = 0; i < 360; i++) {
  const st = await page.evaluate(() => ({
    parked: window.__parked === true,
    log: (window.__ilog || []).map(x => x.at),
    seq: (window.__ilog || []).filter(x => x.at === 'seq:entry').length,
    store: (window.__ilog || []).filter(x => x.at === 'store').length,
    mount: (window.__ilog || []).filter(x => x.at === 'mount').length,
    commit: (window.__ilog || []).filter(x => x.at === 'commit').length,
  })).catch(() => null);
  if (!st) break;
  if (!st.parked) parkedThroughout = false;
  const need = OLD_SLOT
    ? (st.seq >= 2 && st.store >= 1)                       // B parks after storing
    : (st.seq >= 2 && st.store >= 1 && st.mount >= 1 && st.commit >= 1);
  if (need) { bDone = true; break; }
  await new Promise(r => setTimeout(r, 500));
}
const preRelease = await page.evaluate(() => (window.__ilog || []).slice());
ok('C4b ★ B reached its sequence, stored, mounted AND committed while A was still parked',
   bDone && parkedThroughout,
   `bDone=${bDone} parkedThroughout=${parkedThroughout} log=${JSON.stringify(preRelease.map(x => x.at))}`);

// ── ONLY NOW RELEASE A ──
await page.evaluate(() => {
  try { (window.__ilog = window.__ilog || []).push({ at: 'release:A' }); } catch (_) {}
  if (window.__releaseA) window.__releaseA();
});
ok('C4 ★ B was admitted through the stale-lock escape and minted its own attempt while A was still parked',
   preRelease.filter(x => x.at === 'mint').length >= 2, JSON.stringify(await page.evaluate(() => window.__ilog || [])).slice(0, 600)
   + ' logs=' + JSON.stringify(logs.slice(-5)));

// ── RELEASE A ──
for (let i = 0; i < 300; i++) {
  const n = await page.evaluate(() => (window.__ilog || []).filter(x => x.at === 'commit').length).catch(() => 0);
  if (n >= 2) break;
  await new Promise(r => setTimeout(r, 500));
}

if (OLD_SLOT) {
  for (let i = 0; i < 120; i++) {
    const n = await page.evaluate(() => (window.__ilog || []).filter(x => x.at === 'commit').length).catch(() => 0);
    if (n >= 1) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await page.evaluate(() => { if (window.__releaseB) window.__releaseB(); });
  for (let i = 0; i < 120; i++) {
    const n = await page.evaluate(() => (window.__ilog || []).filter(x => x.at === 'commit').length).catch(() => 0);
    if (n >= 2) break;
    await new Promise(r => setTimeout(r, 500));
  }
}

const R = await page.evaluate(() => {
  const s = window.state;
  const uids = window.StoryPagination.getPageUids() || [];
  const metas = uids.map(u => ({ uid: u,
    cpAttemptId: (window.StoryPagination.getPageMetaByUid(u) || {}).cpAttemptId || null }));
  return { ilog: window.__ilog || [], metas,
           leftInMap: Object.keys(s._cpCanonSequenceResults || {}) };
});
const mints = R.ilog.filter(x => x.at === 'mint');
const mounts = R.ilog.filter(x => x.at === 'mount');
const commits = R.ilog.filter(x => x.at === 'commit');
const idA = (mints.find(x => x.turn === 1) || {}).id;
const idB = (mints.find(x => x.turn === 2) || {}).id;

ok('C5 two turns each minted their own attempt id',
   !!idA && !!idB && idA !== idB, JSON.stringify(mints));
ok('C6 ★ each mounted page carries the id of the turn that produced it — A resumed AFTER B and still stamped A',
   mounts.length === 2
   && mounts.some(m => m.id === idA) && mounts.some(m => m.id === idB)
   && R.metas.some(m => m.cpAttemptId === idA) && R.metas.some(m => m.cpAttemptId === idB),
   `mounts=${JSON.stringify(mounts)} metas=${JSON.stringify(R.metas)}`);
ok('C7 ★ each commit took a result for its OWN page — no page was handed another turn\'s verdict',
   commits.length >= 2
   && commits.every(c => c.pageAttempt === idA || c.pageAttempt === idB)
   && new Set(commits.map(c => c.pageAttempt)).size === commits.length,
   JSON.stringify(commits));
ok('C8 ★ the two verdicts did not cross over — A\'s page took contradiction, B\'s took compatible',
   (() => {
     const cA = commits.find(c => c.pageAttempt === idA), cB = commits.find(c => c.pageAttempt === idB);
     return !!cA && !!cB && cA.handed === 'contradiction' && cB.handed === 'compatible';
   })(), JSON.stringify(commits));
// THE SCHEDULE ITSELF, IN ORDER. B completes end to end before A is released.
const order = R.ilog.map(x => x.at);
const firstOf = (t, from = 0) => { const i = order.indexOf(t, from); return i; };
const idxSeqB = (() => { let n = 0; for (let i = 0; i < order.length; i++) { if (order[i] === 'seq:entry' && ++n === 2) return i; } return -1; })();
const idxRelease = firstOf('release:A');
ok('C8b ★ the observed schedule is B seq → B store → B mount → B commit → release A → A mount → A commit',
   idxSeqB > 0 && idxRelease > idxSeqB
   && firstOf('store', idxSeqB) > idxSeqB && firstOf('store', idxSeqB) < idxRelease
   && firstOf('mount', idxSeqB) < idxRelease && firstOf('commit', idxSeqB) < idxRelease
   && firstOf('mount', idxRelease) > idxRelease && firstOf('commit', idxRelease) > idxRelease,
   JSON.stringify(order));
ok('C9 ★ every result was taken by its page — none left orphaned in the map',
   R.leftInMap.length === 0, JSON.stringify(R.leftInMap));
ok('C10 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));

console.log('\n' + out.join('\n'));
console.log(`\n  ORDERED TRACE (what reset A's mid-story state):`);
R.ilog.forEach(e => console.log(`    ${String(e.at).padEnd(12)} ${JSON.stringify(e).slice(0, 200)}`));
console.log(`\n  mints  : ${JSON.stringify(mints)}`);
console.log(`  mounts : ${JSON.stringify(mounts)}`);
console.log(`  commits: ${JSON.stringify(commits)}`);
console.log(`  metas  : ${JSON.stringify(R.metas)}`);
if (MUT) console.log(`  MUTATION applied`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
