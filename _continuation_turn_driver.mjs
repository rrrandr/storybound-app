// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE REAL CONTINUATION TURN — buildScenePlan → author → post-author → FINAL_PROSE → addPage
//
//  Scene 1 cannot stand in for this. The continuation path is where a backend-minted
//  Character+ facet actually commits, so it is the only path where a canon verdict has
//  somewhere to land. This drives the production turn by clicking #submitBtn, with every
//  model call intercepted, and observes the seam rather than reading source.
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
const AUTHOR_PROSE =
  'The harbour office was colder than the street, and the ledger rope had gone stiff with salt.\n\n'
+ 'The presiding Dohkar performed a rite he had performed many times, and did not trouble to '
+ 'look as though it mattered. I watched him do it and said nothing at all.\n\n'
+ 'When I asked again he did not look up. The ledger stayed exactly where it was.';

// The trace points. Injected into the SERVED source; every claim below is an observation.
const T = (tag, extra) => "try { (window.__ctTrace = window.__ctTrace || []).push({ at: '" + tag +
  "'" + (extra || '') + " }); } catch (_) {}";
// PATH TRACE. Two attempts at this driver ended in handleBeginStory with an empty seam trace.
// Rather than guess at UI state a third time, these say which branch the click actually takes.
const PATH = [
  ['click:enter',
   "  $('submitBtn')?.addEventListener('click', async () => {",
   "  $('submitBtn')?.addEventListener('click', async () => {\n      " + "try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'click:enter', turnCount: (window.state||{}).turnCount, pages: (window.StoryPagination && window.StoryPagination.getPageUids) ? window.StoryPagination.getPageUids().length : -1 }); } catch (_) {}"],
  ['begin:enter',
   "  async function handleBeginStory() {",
   "  async function handleBeginStory() {\n    try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'begin:enter', turnCount: (window.state||{}).turnCount, stack: String(new Error('who-called-begin').stack || '').split('\\n').slice(1, 7).join(' | ') }); } catch (_) {}"],
  ['click:inputs',
   "      let rawAct = sanitizeShortInput($('actionInput').value, 2000);",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'click:inputs' }); } catch (_) {}\n      let rawAct = sanitizeShortInput($('actionInput').value, 2000);"],
  // ISOLATION, NOT A CHANGE TO THE CODE UNDER TEST. A boot-time CHECKOUT_RETURN auto-begin fires
  // handleBeginStory on a timer, aborts Scene 1, and resets the fixture mid-turn. It is an
  // unrelated path; the stack trace at begin:enter named it (app.js:11686).
  ['isolate:checkout-autobegin',
   "              } else if (typeof window.handleBeginStory === 'function') {\n                  window.handleBeginStory();",
   "              } else if (typeof window.handleBeginStory === 'function' && !window.__ctNoAutoBegin) {\n                  window.handleBeginStory();"],
  ['p1@292729',
   "      if (typeof window._sniffAndRouteExplicit === 'function') {",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'p1@292729' }); } catch (_) {}\n      if (typeof window._sniffAndRouteExplicit === 'function') {"],
  ['p2@296141',
   "      if (state._fateRecalibrationPending) state._fateRecalibrationPending = false; // consume",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'p2@296141' }); } catch (_) {}\n      if (state._fateRecalibrationPending) state._fateRecalibrationPending = false; // consume"],
  ['p3@296949',
   "      var _explicitCarryForwardDirective = '';",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'p3@296949' }); } catch (_) {}\n      var _explicitCarryForwardDirective = '';"],
  ['p4@299212',
   "      var _currentSceneIdx = state.turnCount || 0;",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'p4@299212' }); } catch (_) {}\n      var _currentSceneIdx = state.turnCount || 0;"],
  ['p5@300785',
   "      if (state.debugMode === true) {",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'p5@300785' }); } catch (_) {}\n      if (state.debugMode === true) {"],
  ['q@inputs-guard',
   "      if(!rawAct && !rawDia) {",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'q@inputs-guard', act: String(rawAct||'').length, dia: String(rawDia||'').length }); } catch (_) {}\n      if(!rawAct && !rawDia) {"],
  ['q@293343',
   "      state.lastActionAt = Date.now();",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'q@293343' }); } catch (_) {}\n      state.lastActionAt = Date.now();"],
  ['q@293777',
   "      window.updateSafeWordVisibility = updateSafeWordVisibility;",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'q@293777' }); } catch (_) {}\n      window.updateSafeWordVisibility = updateSafeWordVisibility;"],
  ['q@294502',
   "      function buildLocationMemoryDirective() {",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'q@294502' }); } catch (_) {}\n      function buildLocationMemoryDirective() {"],
  ['q@295207',
   "      function computeSceneGovernance() {",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'q@295207' }); } catch (_) {}\n      function computeSceneGovernance() {"],
  ['q@295804',
   "          if (isMainPairIntimacyScene) {",
   "      try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'q@295804' }); } catch (_) {}\n          if (isMainPairIntimacyScene) {"],
  ['turn:multipass-branch',
   "          } else if (MULTI_PASS_ENABLED && state.turnCount > 0 && !explicitEmbodimentAuthorized) {",
   "          } else if (MULTI_PASS_ENABLED && state.turnCount > 0 && !explicitEmbodimentAuthorized) {\n              try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'turn:multipass' }); } catch (_) {}"],
  ['turn:standard-branch',
   "            pageContent += _formattedScene;",
   "            try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'turn:standard' }); } catch (_) {}\n            pageContent += _formattedScene;"],
];

const POINTS = [
  ['seq:before',
   "                  var _seqC = await _cpCanonSequence(raw, _seqModelC, { sceneUid: 'scene:' + _seqSceneC });",
   "                  " + T('seq:before', ", len: String(raw||'').length") +
   "\n                  var _seqC = await _cpCanonSequence(raw, _seqModelC, { sceneUid: 'scene:' + _seqSceneC });"],
  ['seq:after',
   "            } catch (_seqCErr) {",
   "            " + T('seq:after', ", len: String(raw||'').length, result: (window.state && window.state._cpCanonSequenceResult) || null") +
   "\n            } catch (_seqCErr) {"],
  ['mount',
   "            StoryPagination.addPage(pageContent, true, undefined,",
   "            " + T('mount') + "\n            StoryPagination.addPage(pageContent, true, undefined,"],
  ['commit',
   "          window._cpCommitScene({ sceneUid: sceneUid, ordinal: sceneNum,",
   "          var _ctArg = { sceneUid: sceneUid, ordinal: sceneNum,"],
  ['commit-call',
   "            delivered: _delivered, appeared: _appeared });",
   "            delivered: _delivered, appeared: _appeared };\n"
   + "          try { (window.__ctTrace = window.__ctTrace || []).push({ at: 'commit',"
   + " handed: _ctArg.semanticStatus === undefined ? '(absent)' : _ctArg.semanticStatus,"
   + " delivered: (_ctArg.delivered || []).map(function (d) { return { cid: d.canonicalId, fid: d.facet_id }; }) }); } catch (_) {}\n"
   + "          window._cpCommitScene(_ctArg);"],
];
// A contradiction raised where PRODUCTION raises one — inside the sequence, not by this test.
const VERDICT = ['verdict',
  "      out.publish = true; out.commit = true; out.semanticStatus = 'unresolved';\n      return out;",
  "      out.publish = true; out.commit = true; out.semanticStatus = 'contradiction';\n"
  + "      out.publishedWithConflict = true;\n      return out;"];
const KILL_SEQ = ['kill-seq',
  "              if (typeof _cpCanonSequence === 'function' && typeof _cpBuildEstablishedCanon === 'function') {\n                var _seqSceneC",
  "              if (false) {\n                var _seqSceneC"];
const KILL_HANDOFF = ['kill-handoff',
  "            semanticStatus: (_seqFits && _seqRes.semanticStatus) || 'unresolved',", "            "];

// Per-arm auditor intent, read by the route.
const AUDIT = { subject: null, devRef: null };
const auditAsked = [];

const browser = await chromium.launch({ headless: true });

async function turn(extra, label) {
  const pts = PATH.concat(POINTS).concat(extra || []);
  let body = SRC;
  const counts = pts.map(([, from]) => body.split(from).length - 1);
  pts.forEach(([, from, to]) => { body = body.replace(from, to); });
  let perr = null;
  try { new vm.Script(body, { filename: 'ct.js' }); } catch (e) { perr = String((e && e.message) || e); }
  if (perr || !counts.every(c => c === 1)) return { aborted: true, counts, perr, label };

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const calls = [], escaped = [], logs = [];
  await installSession(page);
  await page.route('**/*', async route => {
    const url = route.request().url();
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (!/\/api\//.test(path)) return route.continue();
    if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    let payload = ''; try { payload = route.request().postData() || ''; } catch (_) {}
    calls.push({ path, payload });
    // THREE REAL SHAPES, chosen by what the caller asked for. A union that satisfies none is how
    // an "intercepted" run silently stops exercising the path it claims to test.
    let reply = AUTHOR_PROSE;
    // AUDITOR FIRST. Its payload embeds the canon view, which contains planner vocabulary like
    // `environment_anchor`; matched later, the planner branch claimed it and the audit degraded
    // to `unknown` while auditAsked stayed empty.
    if (/CHARACTER_CANON_AUDITOR/.test(payload)) {
      // BUILT FROM THE REQUEST, NOT GUESSED. A hand-written subject_ref that the model never
      // offered is rejected as unknown_subject_ref, and the whole audit degrades to `unknown` —
      // which is what silently made the first three finding-7 arms agree with each other.
      const refs = Array.from(new Set(payload.match(/(?:pc|named|role|plot|cand):[A-Za-z0-9_.:-]+/g) || []));
      const subj = refs.find(r => r === AUDIT.subject) || refs[0] || AUDIT.subject;
      reply = JSON.stringify({ verdicts: [Object.assign(
        { subject_ref: subj, verdict: 'possible_development', reason_code: null },
        AUDIT.devRef ? { development_ref: AUDIT.devRef } : {})] });
      auditAsked.push({ subj, refs: refs.slice(0, 4) });
    }
    else if (/charactersPresent|relationshipToPC/.test(payload)) reply = DISCLOSURE_REPLY;
    else if (/narrative skeleton|environment_anchor/i.test(payload)) reply = PLANNER_REPLY;
    // THE INPUT NORMALIZER. Handing it prose made JSON.parse fail and the turn exited between
    // 293343 and 293777 — the bisection's answer. It gets its own real shape.
    else if (/normaliz/i.test(payload) || /canonical_instruction|normalized_text/.test(payload)) {
      reply = JSON.stringify({ normalized_text: 'I ask him to clear the manifest before the tide turns.',
                               canonical_instruction: 'I ask him to clear the manifest before the tide turns.',
                               confidence_level: 'high' });
    }
    else if (/Return ONLY a JSON|"type"\s*:\s*"json_object"/i.test(payload)) reply = '{}';
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, content: reply,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: reply } }] }) });
  });
  await page.route('**/app.js*', r => r.fulfill({ status: 200,
    contentType: 'application/javascript; charset=utf-8', body }));
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  page.on('console', m => { const x = m.text(); if (/CANON:SEQUENCE|CPLUS|SKELETON|SCENE/i.test(x)) logs.push(x.slice(0, 220)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 200)));
  // __rawSnap is harness-installed; without it the endpoint blocks are skipped entirely and the
  // de-duplication regression counts nothing.
  await page.addInitScript(() => { window.__ctNoAutoBegin = true; window.__rawSnap = []; });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.state && window.__generateSceneSkeleton, { timeout: 60000 });

  const minted = await page.evaluate(async () => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
      worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
      loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
      storyId: 'ctdrv-4', turnCount: 3, scenes: ['a', 'b', 'c'], sceneSkeleton: null,
      issueNumber: 1, renderMode: 'literary', currentEngine: 'literary',
      fortunes: 9999999, access: 'sub', subscribed: true, tier: 'fling',
      intensity: 'Steamy', myUid: 'probe',
      // THE BAKED-STARTER SETUP GATE. Without this the first continuation on a starter story runs
      // _unlockBakedGenesis → handleBeginStory in setup-only mode, and the turn never happens.
      // The path trace showed exactly that: click:enter → begin:enter with turnCount already 3.
      _bakedSetupComplete: true, _bakedGenesisUnlocked: true, nextIssueAvailable: false,
      continuationPurchaseRequired: false });
    s._relationshipLedger = null;
    // THE APP MUST BE MID-STORY, NOT AT THE DOOR. With no mounted page the submit button routes
    // to handleBeginStory and the turn never happens — the first run of this driver aborted in
    // Scene 1 and recorded an empty trace.
    try {
      window.StoryPagination.addPage('<p>An earlier scene, already read.</p>', true, 'ctdrv-prior', { invocationId: 'inv-prior' });
    } catch (_) {}
    try { if (typeof window.showScreen === 'function') window.showScreen('storyReader'); } catch (_) {}
    try { document.getElementById('coverView') && (document.getElementById('coverView').style.display = 'none'); } catch (_) {}
    // Production's own planner call — this is what mints the assignment the turn will carry.
    await window.__generateSceneSkeleton('she pushes past the clerk', 'I need the manifest cleared.', {});
    const cp = ((s.sceneSkeleton || {}).character_plus || [])[0] || null;
    return cp ? { character: cp.character, canonicalId: cp.canonicalId, facet_id: cp.facet_id,
                  option_id: cp.option_id, pages: window.StoryPagination.getPageUids().length } : null;
  });

  const clicked = await page.evaluate(() => {
    const a = document.getElementById('actionInput'), d = document.getElementById('dialogueInput');
    const b = document.getElementById('submitBtn');
    if (!a || !b) return { ok: false, why: 'no submit UI: action=' + !!a + ' btn=' + !!b };
    a.value = 'I ask him to clear the manifest before the tide turns.';
    if (d) d.value = 'You have done this a hundred times. Do it once more.';
    b.click();
    return { ok: true };
  });

  let trace = [];
  for (let i = 0; i < 240; i++) {
    trace = await page.evaluate(() => window.__ctTrace || []).catch(() => []);
    if (trace.some(x => x.at === 'commit')) break;
    await new Promise(r => setTimeout(r, 500));
  }
  const store = await page.evaluate(() => {
    const L = window._relLedger(false); const r = {};
    Object.keys((L && L.entities) || {}).forEach(k => {
      const e = L.entities[k], c = e && e.cplusContinuity;
      if (!c || !Array.isArray(c.manifestations) || !c.manifestations.length) return;
      r[k] = c.manifestations.map(m => ({ facet_id: m.facet_id, verification: m.verification,
                                          semanticStatus: m.semanticStatus,
                                          publishedWithConflict: m.publishedWithConflict }));
    });
    return r;
  }).catch(() => ({}));
  const rawSnap = await page.evaluate(() =>
    (window.__rawSnap || []).filter(x => x && (x.site === 'FINAL_PROSE' || x.site === 'DELIVERED'))
      .map(x => x.site)).catch(() => []);
  await ctx.close().catch(() => {});
  return { aborted: false, counts, minted, clicked, trace, store, rawSnap, calls, escaped, logs, label };
}

// ══ HEALTHY: the verdict is raised inside the sequence and must reach the exact facet ══
const H = await turn([VERDICT], 'healthy');
ok('D1 the arm pre-flights clean — every replacement once, source parses',
   !H.aborted, `counts=${JSON.stringify(H.counts)} perr=${H.perr}`);
ok('D2 the turn UI was reachable and the real submit handler ran',
   H.clicked && H.clicked.ok, JSON.stringify(H.clicked));
ok('D3 a backend-minted C+ assignment existed for this continuation',
   !!H.minted && !!H.minted.canonicalId && !!H.minted.facet_id, JSON.stringify(H.minted));
if (H.aborted) { console.log(`\n  ARM ABORTED (pre-flight): counts=${JSON.stringify(H.counts)} perr=${H.perr}\n`); }
H.trace = H.trace || []; H.store = H.store || {}; H.rawSnap = H.rawSnap || []; H.escaped = H.escaped || [];
const tags = (H.trace || []).map(x => x.at);
ok('D4 ★ the continuation FINAL_PROSE seam EXECUTED — sequence, then mount, in order',
   tags.indexOf('seq:before') !== -1 && tags.indexOf('seq:after') !== -1
   && tags.indexOf('mount') !== -1
   && tags.indexOf('seq:before') < tags.indexOf('seq:after')
   && tags.indexOf('seq:after') < tags.indexOf('mount'),
   `trace=${JSON.stringify(tags)} logs=${JSON.stringify((H.logs || []).slice(-6))}`);
ok('D5 ★ the prose length is unchanged across the sequence — the pen never moved',
   (() => { const b = H.trace.find(x => x.at === 'seq:before'), a = H.trace.find(x => x.at === 'seq:after');
            return !!b && !!a && b.len === a.len; })(),
   JSON.stringify(H.trace.filter(x => /seq:/.test(x.at))));
const hCommit = (H.trace || []).find(x => x.at === 'commit');
ok('D6 ★ the contradiction raised inside the sequence reached the real disclosure commit',
   !!hCommit && hCommit.handed === 'contradiction', JSON.stringify(hCommit));
const hRow = H.minted ? H.store[H.minted.canonicalId] : null;
ok('D7 ★ the EXACT minted {canonicalId, facet_id} recorded publishedWithConflict',
   !!hRow && !!H.minted && hRow.some(m => m.facet_id === H.minted.facet_id
     && m.semanticStatus === 'contradiction' && m.publishedWithConflict === true),
   `minted=${H.minted && H.minted.canonicalId}/${H.minted && H.minted.facet_id} row=${JSON.stringify(hRow)} store=${JSON.stringify(H.store).slice(0, 300)}`);
ok('D8 ★ exactly ONE FINAL_PROSE and ONE DELIVERED endpoint snapshot per continuation',
   H.rawSnap.filter(x => x === 'FINAL_PROSE').length === 1
   && H.rawSnap.filter(x => x === 'DELIVERED').length === 1,
   JSON.stringify(H.rawSnap));
ok('D9 nothing escaped to a paid provider', (H.escaped || []).length === 0,
   JSON.stringify((H.escaped || []).slice(0, 3)));

// ══ CONTROL A: disable the served sequence block ══
const A = await turn([VERDICT, KILL_SEQ], 'kill-seq');
A.trace = A.trace || []; A.store = A.store || {};
const aTags = (A.trace || []).map(x => x.at);
const aRow = H.minted ? A.store[H.minted.canonicalId] : null;
ok('D10 ★ disabling the served sequence block stops its EXECUTION and leaves no conflict on that facet',
   !A.aborted && aTags.indexOf('seq:before') === -1 && aTags.indexOf('mount') !== -1
   && (!aRow || !aRow.some(m => m.publishedWithConflict === true)),
   `counts=${JSON.stringify(A.counts)} trace=${JSON.stringify(aTags)} row=${JSON.stringify(aRow)}`);

// ══ CONTROL B: keep the contradiction, remove only the handoff ══
const B = await turn([VERDICT, KILL_HANDOFF], 'kill-handoff');
B.trace = B.trace || []; B.store = B.store || {};
const bTags = (B.trace || []).map(x => x.at);
const bCommit = (B.trace || []).find(x => x.at === 'commit');
const bRow = H.minted ? B.store[H.minted.canonicalId] : null;
ok('D11 ★ removing ONLY the handoff: the sequence still runs, but that facet\'s verdict is absent',
   !B.aborted && bTags.indexOf('seq:before') !== -1
   && !!bCommit && bCommit.handed !== 'contradiction'
   && (!bRow || !bRow.some(m => m.semanticStatus === 'contradiction')),
   `counts=${JSON.stringify(B.counts)} trace=${JSON.stringify(bTags)} commit=${JSON.stringify(bCommit)} row=${JSON.stringify(bRow)}`);


// ══════════════════════════════════════════════════════════════════════════════════════════
//  FINDING 7 — FACET-SPECIFIC DEVELOPMENT AUTHORISATION, ON THE VERDICT-TO-COMMIT PATH
//
//  `_cpDevelopmentAuthorized` read opposite to its own comment: `!fid ||` returned TRUE for a
//  verdict naming NO facet, so any authored development for that subject authorised an unnamed
//  change. Downstream that keeps `worst` at `compatible`, and a development nobody wrote down
//  commits as accepted canon instead of the contradiction it is.
//
//  Proven here through the same real turn: audit verdict → worst → sequence → disclosure commit
//  → the exact facet's manifestation. Not the helper in isolation.
// ══════════════════════════════════════════════════════════════════════════════════════════
const MINT = H.minted;
// A TEST-ONLY AUTHORED DEVELOPMENT. Seed canon is not rewritten to exercise this.
const DEV_STAGE = (facetRef) => ['dev-stage',
  "                  var _seqC = await _cpCanonSequence(raw, _seqModelC, { sceneUid: 'scene:' + _seqSceneC });",
  "                  try { window.state._cpStageForAudit = { stageAuthority: { ok: true, canonDevelopments: ["
  + "{ subject_ref: '" + MINT.canonicalId + "', facet_ref: " + (facetRef ? "'" + facetRef + "'" : 'null')
  + ", operation: 'complicates' }] } }; } catch (_) {}\n"
  + "                  var _seqC = await _cpCanonSequence(raw, _seqModelC, { sceneUid: 'scene:' + _seqSceneC });"];
// The auditor is switched on CLIENT-side only, so the real parse → authorise → worst chain runs.
const AUDIT_ON = ['audit-on',
  "    try { return (typeof window !== 'undefined') && window.__cpCanonAuditorEnabled === true; } catch (_) { return false; }",
  "    return true;"];

const devArm = async (verdictDevRef, authoredFacetRef, extra) => {
  AUDIT.subject = MINT.canonicalId; AUDIT.devRef = verdictDevRef;
  auditAsked.length = 0;
  return turn([AUDIT_ON, DEV_STAGE(authoredFacetRef)].concat(extra || []), 'dev');
};

// (1) The verdict names NO facet, while a development for that subject exists.
const N = await devArm(null, MINT.facet_id);
const nCommit = (N.trace || []).find(x => x.at === 'commit');
const nRow = (N.store || {})[MINT.canonicalId];
ok('D12 ★ a development naming NO facet is NOT authorised — it commits as a contradiction on the exact facet',
   !N.aborted && !!nCommit && nCommit.handed === 'contradiction'
   && !!nRow && nRow.some(m => m.facet_id === MINT.facet_id && m.publishedWithConflict === true),
   `counts=${JSON.stringify(N.counts)} commit=${JSON.stringify(nCommit)} row=${JSON.stringify(nRow)}`);

// (2) THE DISCRIMINATION. Same path, verdict names the AUTHORISED facet → covered, no conflict.
const Y = await devArm(MINT.facet_id, MINT.facet_id);
const yCommit = (Y.trace || []).find(x => x.at === 'commit');
const yRow = (Y.store || {})[MINT.canonicalId];
ok('D13 ★ …while a development naming the AUTHORISED facet IS covered — no contradiction, no conflict flag',
   !Y.aborted && !!yCommit && yCommit.handed !== 'contradiction'
   && (!yRow || !yRow.some(m => m.publishedWithConflict === true)),
   `commit=${JSON.stringify(yCommit)} row=${JSON.stringify(yRow)}`);

// (3) THE INVERSION, RESTORED. The no-facet case must stop being a contradiction.
const INV = ['invert', "        return !!fid && d.facet_ref === fid;", "        return !fid || d.facet_ref === fid;"];
const I = await devArm(null, MINT.facet_id, [INV]);
const iCommit = (I.trace || []).find(x => x.at === 'commit');
const iRow = (I.store || {})[MINT.canonicalId];
ok('D14 ★ restoring `!fid ||` makes that same unnamed development commit as ACCEPTED canon — the defect, reproduced end to end',
   !I.aborted && !!iCommit && iCommit.handed !== 'contradiction'
   && (!iRow || !iRow.some(m => m.publishedWithConflict === true)),
   `counts=${JSON.stringify(I.counts)} commit=${JSON.stringify(iCommit)} row=${JSON.stringify(iRow)}`);

// ══ STALE / CROSS-PAGE RESULT CONTROLS ══
//  The commit no longer COMPARES a shared slot — it LOOKS UP the result by the id the page
//  carries, and takes it. So these seed the map directly, keyed either by this page's own id or
//  by another attempt's, and let the real sequence run so the page has a genuine id.
const seedMap = (key, over) => ['seed-map',
  "            pageContent += _formattedScene;",
  "            try { _cpStoreSeqResult(window.state, " + key + ", Object.assign({"
  + " storyId: String(window.state.storyId || ''), attemptId: " + key + ","
  + " invocationSeq: (window.state._invocationSeq || null), proseFp: 'seeded', consumed: false,"
  + " sceneNumber: 4, stages: ['initial:contradiction'], semanticStatus: 'contradiction',"
  + " publishedWithConflict: true, dispatches: 0, publish: true, commit: true }, " + over + ")); } catch (_) {}\n"
  + "            pageContent += _formattedScene;"];
const readArm = (r) => {
  const c = (r.trace || []).find(x => x.at === 'commit');
  const row = ((r.store || {})[MINT.canonicalId]) || null;
  return { c, row, aborted: r.aborted, counts: r.counts,
           leaked: (!!c && c.handed === 'contradiction')
                   || (!!row && row.some(m => m.publishedWithConflict === true)) };
};

// (1) ANOTHER attempt's result, keyed by an id this page does not carry.
const W = readArm(await turn([seedMap("'cpa:SOME-OTHER-TURN'", '{}')], 'other-attempt'));
ok('D15 ★ a result belonging to ANOTHER attempt is never found — this page\'s facet stays unresolved',
   !W.aborted && !W.leaked && !!W.row && W.row.some(m => m.facet_id === MINT.facet_id),
   `counts=${JSON.stringify(W.counts)} commit=${JSON.stringify(W.c)} row=${JSON.stringify(W.row)}`);
ok('D16 …and the arm is not vacuous — the facet WAS committed, it simply carries no borrowed verdict',
   !!W.row && W.row.some(m => m.facet_id === MINT.facet_id), `row=${JSON.stringify(W.row)}`);

// (2) Same story, same scene, same INHERITED invocation — a different attempt at that scene.
const R2 = readArm(await turn([seedMap("'cpa:PREVIOUS-ATTEMPT-SAME-SCENE'",
  '{ sceneNumber: 4, invocationSeq: (window.state._invocationSeq || null) }')], 'same-scene-retry'));
ok('D17 ★ same story, scene AND invocation — a DIFFERENT attempt at that scene still does not apply',
   !R2.aborted && !R2.leaked && !!R2.row && R2.row.some(m => m.facet_id === MINT.facet_id),
   `counts=${JSON.stringify(R2.counts)} commit=${JSON.stringify(R2.c)} row=${JSON.stringify(R2.row)}`);

// (3) THE POSITIVE CONTROL: the same seed keyed by THIS page's own id must apply. Without it the
//     three above would pass against a lookup that never finds anything.
const P2 = readArm(await turn([seedMap('_pageAttemptC', '{}')], 'matching'));
ok('D18 ★ …while the SAME verdict keyed by THIS page\'s own attempt id DOES apply — the lookup discriminates, it does not just refuse',
   !P2.aborted && !!P2.c && P2.c.handed === 'contradiction'
   && !!P2.row && P2.row.some(m => m.facet_id === MINT.facet_id && m.publishedWithConflict === true),
   `counts=${JSON.stringify(P2.counts)} commit=${JSON.stringify(P2.c)} row=${JSON.stringify(P2.row)}`);

// (4) Already taken by an earlier commit of this page.
const C2 = readArm(await turn([seedMap('_pageAttemptC', '{ consumed: true }')], 'already-consumed'));
ok('D19 ★ a result already marked consumed is not applied, even keyed to this page',
   !C2.aborted && !C2.leaked, `commit=${JSON.stringify(C2.c)} row=${JSON.stringify(C2.row)}`);

// (5) THE LOOKUP ITSELF IS LOAD-BEARING: make it ignore the page id and take whatever is there.
const U = readArm(await turn([
  seedMap("'cpa:SOME-OTHER-TURN'", '{}'),
  // Take the SEEDED entry (stored after the real one) and relax the equality too — otherwise the
  // control is defeated by the other half of the guard and proves nothing.
  ['blind-lookup',
   "            ? _cpTakeSeqResult(window.state, _pageAttempt) : null;",
   "            ? _cpTakeSeqResult(window.state, (function (k) { return k[k.length - 1] || null; })(Object.keys(window.state._cpCanonSequenceResults || {}))) : null;"],
  ['relax-equality',
   "            && !!_seqRes.attemptId && !!_pageAttempt\n            && String(_seqRes.attemptId) === String(_pageAttempt);",
   "            ;"],
], 'blind-lookup'));
ok('D20 ★ making the lookup ignore the page id lets another attempt\'s contradiction reach this facet — the keying is what prevents it',
   !U.aborted && !!U.c && U.c.handed === 'contradiction'
   && !!U.row && U.row.some(m => m.facet_id === MINT.facet_id && m.publishedWithConflict === true),
   `counts=${JSON.stringify(U.counts)} commit=${JSON.stringify(U.c)} row=${JSON.stringify(U.row)}`);
console.log(`  otherAttempt : ${JSON.stringify(W.c)}`);
console.log(`  sameSceneRetry: ${JSON.stringify(R2.c)}`);
console.log(`  matching     : ${JSON.stringify(P2.c)}`);
console.log(`  consumed     : ${JSON.stringify(C2.c)}`);
console.log(`  blindLookup  : ${JSON.stringify(U.c)}`);

console.log(`  devNoFacet stages: ${JSON.stringify(((N.trace||[]).find(x => x.at === 'seq:after')||{}).result)}`);
console.log(`  devNoFacet calls : ${JSON.stringify((N.calls||[]).map(c => c.path))}`);
console.log(`  auditorAsked     : ${(N.calls||[]).filter(c => /CANON_AUDITOR/.test(c.payload||'')).length} lastSubj=${JSON.stringify(auditAsked.slice(-1))}`);
console.log(`  devNoFacet : ${JSON.stringify(nCommit)} row=${JSON.stringify(nRow)}`);
console.log(`  devMatched : ${JSON.stringify(yCommit)}`);
console.log(`  inverted   : ${JSON.stringify(iCommit)}`);

console.log('\n' + out.join('\n'));
console.log(`\n  minted   : ${JSON.stringify(H.minted)}`);
console.log(`  trace    : ${JSON.stringify(H.trace)}`);
console.log(`  commit   : ${JSON.stringify(hCommit)}`);
console.log(`  facetRow : ${JSON.stringify(hRow)}`);
console.log(`  rawSnap  : ${JSON.stringify(H.rawSnap)}`);
console.log(`  killSeq  : ${JSON.stringify(aTags)} row=${JSON.stringify(aRow)}`);
console.log(`  noHandoff: ${JSON.stringify(bCommit)} row=${JSON.stringify(bRow)}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
