// ══════════════════════════════════════════════════════════════════════════════════════════
//  CG CANON OWNERSHIP — the plan that made the panels owns the verdict
//
//  CG never mounts a StoryPagination page, so the attempt id the literary path reads out of
//  page metadata had nothing to ride on. `plan.__sceneUid` already is a per-finalized-output
//  identity: stable across a re-render of the same plan, different for a replacement plan at
//  the same index. It is now the attempt/result owner on this path.
//
//  Driven through `window._updateCharacterDisclosureLedgerForCurrent` — the same commit
//  `_renderStagedScene` calls — with a CG uid. Every provider intercepted; nothing dispatched.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import vm from 'node:vm';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 620) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const MUT = process.env.SB_MUT || '';
let body = SRC;
if (MUT) {
  const [from, to] = MUT.split('@@TO@@');
  const n = body.split(from).length - 1;
  if (n !== 1) { console.error(`\n  MUTATION MARKER NOT UNIQUE: ${n}\n`); process.exit(2); }
  body = body.replace(from, to);
  try { new vm.Script(body, { filename: 'cg.js' }); }
  catch (e) { console.error(`\n  MUTATED SOURCE DOES NOT PARSE: ${e && e.message}\n`); process.exit(2); }
}

const DOHKAR = 'role:first_sacrifice_presiding_dohkar';
const DISCLOSURE = JSON.stringify({
  characters: [{ name: 'the presiding Dohkar', present: true, relationshipToPC: null, newLayer: null, vehicle: 'none' }],
  scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.0 },
  sceneState: { setting: 'the harbour office', charactersPresent: ['the presiding Dohkar'] } });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const escaped = [];
await installSession(page);
await page.addInitScript(() => { window.__ctNoAutoBegin = true; });
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, content: DISCLOSURE,
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: DISCLOSURE } }] }) });
});
await page.route('**/app.js*', r => r.fulfill({ status: 200,
  contentType: 'application/javascript; charset=utf-8', body }));
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._cgSceneUidFor && window._cpStoreSeqResult, { timeout: 60000 });

// ── 1. THE UID IS A REAL PER-OUTPUT IDENTITY ──
const U = await page.evaluate(() => {
  const s = window.state; s.storyId = 'cgown-1'; s._cgSceneUidByIndex = null;
  const planA = { beats: [{ text: 'He performs the rite without looking up.' }] };
  const uidA = window._cgSceneUidFor(0, planA);
  const uidAgain = window._cgSceneUidFor(0, planA);          // same plan re-rendered
  const planB = { beats: [{ text: 'A different scene entirely, at the same index.' }] };
  const uidB = window._cgSceneUidFor(0, planB);              // replacement at the same index
  return { uidA, uidAgain, uidB, stamped: planA.__sceneUid };
});
ok('CG1 a re-render of the SAME plan keeps its uid — the identity is the finalized output',
   U.uidA && U.uidA === U.uidAgain && U.stamped === U.uidA, JSON.stringify(U));
ok('CG2 ★ a REPLACEMENT plan at the same index gets a different uid — this is what stops cross-panel leakage',
   U.uidB && U.uidB !== U.uidA, JSON.stringify(U));
ok('CG3 the uid is namespaced cg:, which is how the commit recognises a CG output',
   /^cg:/.test(String(U.uidA)) && /^cg:/.test(String(U.uidB)), `${U.uidA} | ${U.uidB}`);

// ── 2. A VERDICT STORED UNDER THE PLAN'S UID REACHES ITS OWN COMMIT ──
const commitWith = (uid, seed) => page.evaluate(async ([u, sd, dohkar]) => {
  const s = window.state;
  s.storyId = 'cgown-1';
  s._cpCanonSequenceResults = null;
  s._relationshipLedger = null;
  const L = window._relLedger(true) || (s._relationshipLedger =
    { v: 1, storyId: s.storyId, processed: {}, entities: {}, edges: {}, seq: 0 });
  L.entities[dohkar] = { id: dohkar, kind: 'role', label: 'the presiding Dohkar',
                         aliases: ['the presiding Dohkar'] };
  s.sceneSkeleton = { _cpSceneNumber: 2, _cpAttemptId: 'cpa:cg', character_plus: [
    { character: 'the presiding Dohkar', canonicalId: dohkar,
      facet_id: 'gen:dohkar:v1:worldview', option_id: 'OPT-1', mode: 'IN_PERSON',
      verification_target: 'performs the rite', source: 'backend_continuation' }] };
  s._cpDirectedBeats = [{ facet_id: 'gen:dohkar:v1:worldview', visibleAction: null,
                          verificationTarget: 'performs the rite', pcInterpretation: 'x' }];
  if (sd) {
    window._cpStoreSeqResult(s, String(sd.key), { storyId: s.storyId, attemptId: String(sd.key),
      invocationSeq: null, proseFp: 'cg', consumed: false, sceneNumber: 2,
      stages: ['initial:contradiction'], semanticStatus: sd.status,
      publishedWithConflict: sd.status === 'contradiction', dispatches: 0, publish: true, commit: true });
  }
  await window._updateCharacterDisclosureLedgerForCurrent(
    'The harbour office was cold. The presiding Dohkar performs the rite, and did not look up.', u);
  for (let i = 0; i < 160; i++) {
    const LL = window._relLedger(false);
    const e = LL && LL.entities && LL.entities[dohkar];
    const c = e && e.cplusContinuity;
    if (c && c.manifestations && c.manifestations.length) {
      return { rows: c.manifestations.map(m => ({ facet_id: m.facet_id, semanticStatus: m.semanticStatus,
                                                  publishedWithConflict: m.publishedWithConflict })),
               left: Object.keys(s._cpCanonSequenceResults || {}) };
    }
    await new Promise(r => setTimeout(r, 25));
  }
  return { rows: [], left: Object.keys(s._cpCanonSequenceResults || {}) };
}, [uid, seed, DOHKAR]);

const OWN = await commitWith(U.uidA, { key: U.uidA, status: 'contradiction' });
ok('CG4 ★ a verdict stored under the plan\'s OWN uid reaches that commit — exact facet, conflict recorded',
   OWN.rows.some(r => r.facet_id === 'gen:dohkar:v1:worldview'
     && r.semanticStatus === 'contradiction' && r.publishedWithConflict === true),
   JSON.stringify(OWN));
ok('CG5 …and it was taken, not left orphaned',
   OWN.left.length === 0, JSON.stringify(OWN.left));

// ── 3. THE CONTROL: ANOTHER PLAN'S VERDICT MUST NOT REACH THIS ONE ──
const uidC = await page.evaluate(() => {
  const s = window.state; s.storyId = 'cgown-1';
  return window._cgSceneUidFor(1, { beats: [{ text: 'A third finalized output, its own panel set.' }] });
});
const FOREIGN = await commitWith(uidC, { key: U.uidB, status: 'contradiction' });
ok('CG6 ★ a verdict belonging to a DIFFERENT plan does not reach this panel set — no cross-panel leakage',
   FOREIGN.rows.length > 0
   && FOREIGN.rows.every(r => r.semanticStatus !== 'contradiction' && r.publishedWithConflict !== true),
   JSON.stringify(FOREIGN));
ok('CG7 …and that arm is not vacuous — the facet WAS committed, it simply carries no borrowed verdict',
   FOREIGN.rows.some(r => r.facet_id === 'gen:dohkar:v1:worldview'), JSON.stringify(FOREIGN.rows));

// ── 4. THE FALLBACK IS LOAD-BEARING ──
ok('CG8 ★ production resolves a CG output\'s identity from its own uid, since there is no page metadata',
   SRC.includes("if (!_pageAttempt && String(sceneUid || '').indexOf('cg:') === 0) _pageAttempt = String(sceneUid);"),
   'cg uid fallback present at the commit');
ok('CG9 ★ the sequence runs on the CG path before the commit, and never moves the pen there',
   SRC.includes("var _cgSeq = await _cpCanonSequence(_cgLedgerProse, _cgModel, { sceneUid: String(_cgUid) });")
   && !/_cgSeq\.finalText/.test(SRC),
   'sequence present; finalText never applied on the CG path');
ok('CG10 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));


// ══ 5. THE INTEGRATED ARM — THROUGH THE REAL `_renderStagedScene` ══
//  CG8/CG9 above are source assertions and the arms before them drive the COMMIT directly. Neither
//  executes the block where CG actually runs the sequence and stores its result. This one invokes
//  production's own renderer and witnesses the order.
const CGPOINTS = [
  ['cg:seq-entry',
   "                var _cgSeq = await _cpCanonSequence(_cgLedgerProse, _cgModel, { sceneUid: String(_cgUid) });",
   "                try { (window.__cglog = window.__cglog || []).push({ at: 'cg:seq', uid: String(_cgUid), len: String(_cgLedgerProse||'').length }); } catch (_) {}\n"
   + "                var _cgSeq = await _cpCanonSequence(_cgLedgerProse, _cgModel, { sceneUid: String(_cgUid) });"],
  ['cg:store',
   "                _cpStoreSeqResult(state, String(_cgUid), {",
   "                try { (window.__cglog = window.__cglog || []).push({ at: 'cg:store', uid: String(_cgUid) }); } catch (_) {}\n"
   + "                _cpStoreSeqResult(state, String(_cgUid), {"],
];
// the commit trace needs the arg named, exactly as the other drivers do
const CGPRE = [
  ['cg:commit-arg', "          window._cpCommitScene({ sceneUid: sceneUid, ordinal: sceneNum,",
   "          var _ctArg = { sceneUid: sceneUid, ordinal: sceneNum,"],
  ['cg:commit-close', "            delivered: _delivered, appeared: _appeared });",
   "            delivered: _delivered, appeared: _appeared };\n"
   + "          try { (window.__cglog = window.__cglog || []).push({ at: 'cg:commit', uid: sceneUid,"
   + " pageAttempt: _pageAttempt, handed: _ctArg.semanticStatus,"
   + " facets: (_ctArg.delivered || []).map(function (d) { return d.facet_id; }) }); } catch (_) {}\n"
   + "          window._cpCommitScene(_ctArg);"],
];

const integrated = async (kill) => {
  const pts = CGPRE.concat(CGPOINTS).concat(kill ? [['cg:kill',
    "            if (_cgUid && typeof _cpCanonSequence === 'function'\n                && typeof _cpBuildEstablishedCanon === 'function' && typeof _cpStoreSeqResult === 'function') {",
    "            if (false) {"]] : []);
  let b2 = SRC;
  const cts = pts.map(([, from]) => b2.split(from).length - 1);
  pts.forEach(([, from, to]) => { b2 = b2.replace(from, to); });
  let e2 = null;
  try { new vm.Script(b2, { filename: 'cgint.js' }); } catch (e) { e2 = String(e && e.message); }
  if (!cts.every(c => c === 1) || e2) return { aborted: true, cts, e2 };

  const c2 = await browser.newContext();
  const pg = await c2.newPage();
  await installSession(pg);
  await pg.addInitScript(() => { window.__ctNoAutoBegin = true; });
  await pg.route('**/*', async route => {
    const u = route.request().url(); const pth = u.replace(/^https?:\/\/[^/]+/, '');
    if (isAuthOrigin(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (!/\/api\//.test(pth)) return route.continue();
    if (/\/api\/config\b/.test(pth)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, content: DISCLOSURE,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: DISCLOSURE } }] }) });
  });
  await pg.route('**/app.js*', r => r.fulfill({ status: 200,
    contentType: 'application/javascript; charset=utf-8', body: b2 }));
  pg.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  await pg.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pg.waitForFunction(() => window.state && window._renderStagedScene && window._cgSceneUidFor, { timeout: 60000 });

  const res = await pg.evaluate(async (dohkar) => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
      worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
      loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
      storyId: 'cgint-1', turnCount: 3, scenes: ['a','b','c'], issueNumber: 1,
      renderMode: 'staged_story_mode', _cgSceneUidByIndex: null });
    s._relationshipLedger = null; s._cpCanonSequenceResults = null;
    const L = window._relLedger(true) || (s._relationshipLedger =
      { v: 1, storyId: s.storyId, processed: {}, entities: {}, edges: {}, seq: 0 });
    L.entities[dohkar] = { id: dohkar, kind: 'role', label: 'the presiding Dohkar',
      aliases: ['the presiding Dohkar'] };
    // A backend-minted assignment, exactly as the continuation path produces one.
    s.sceneSkeleton = { _cpSceneNumber: 3, _cpAttemptId: 'cpa:cgint', character_plus: [
      { character: 'the presiding Dohkar', canonicalId: dohkar, facet_id: 'gen:dohkar:v1:worldview',
        option_id: 'OPT-1', mode: 'IN_PERSON', verification_target: 'performs the rite',
        source: 'backend_continuation' }] };
    s._cpDirectedBeats = [{ facet_id: 'gen:dohkar:v1:worldview', visibleAction: null,
      verificationTarget: 'performs the rite', pcInterpretation: 'x' }];

    const BEAT = 'The harbour office was cold. The presiding Dohkar performs the rite, and did not look up.';
    const plan = { beats: [{ text: BEAT, speaker: null }], phases: [], low_fidelity: true };
    plan.__sceneUid = window._cgSceneUidFor(2, plan);
    const beatBefore = plan.beats[0].text;
    let threw = null;
    try { window._renderStagedScene(plan, null); } catch (e) { threw = String((e && e.message) || e); }
    for (let i = 0; i < 240; i++) {
      const lg = window.__cglog || [];
      if (lg.some(x => x.at === 'cg:commit')) break;
      await new Promise(r => setTimeout(r, 25));
    }
    const LL = window._relLedger(false);
    const ent = LL && LL.entities && LL.entities[dohkar];
    const cont = ent && ent.cplusContinuity;
    return { threw, log: window.__cglog || [], uid: plan.__sceneUid,
             beatBefore, beatAfter: plan.beats[0].text,
             rows: (cont && cont.manifestations || []).map(m => ({ facet_id: m.facet_id,
               semanticStatus: m.semanticStatus, publishedWithConflict: m.publishedWithConflict })) };
  }, DOHKAR);
  await c2.close().catch(() => {});
  return { aborted: false, cts, ...res };
};

const INT = await integrated(false);
const tags = (INT.log || []).map(x => x.at);
ok('CG11 the integrated arm pre-flights clean — every point matching once, source parses',
   !INT.aborted, `counts=${JSON.stringify(INT.cts)} err=${INT.e2}`);
ok('CG12 ★ the real _renderStagedScene ran the sequence, stored under plan.__sceneUid, then committed — in that order',
   tags.indexOf('cg:seq') !== -1 && tags.indexOf('cg:store') !== -1 && tags.indexOf('cg:commit') !== -1
   && tags.indexOf('cg:seq') < tags.indexOf('cg:store')
   && tags.indexOf('cg:store') < tags.indexOf('cg:commit'),
   `threw=${INT.threw} log=${JSON.stringify(INT.log)}`);
ok('CG13 ★ the commit resolved its attempt from the plan\'s own uid',
   (() => { const c = (INT.log || []).find(x => x.at === 'cg:commit');
            return !!c && c.pageAttempt === INT.uid && c.uid === INT.uid; })(),
   JSON.stringify((INT.log || []).find(x => x.at === 'cg:commit')));
ok('CG14 ★ the exact facet committed from the rendered panel set',
   (INT.rows || []).some(r => r.facet_id === 'gen:dohkar:v1:worldview'), JSON.stringify(INT.rows));
ok('CG15 ★ the rendered beat bytes are unchanged — finalText never touched the panels',
   INT.beatBefore === INT.beatAfter, `before=${(INT.beatBefore||'').length}B after=${(INT.beatAfter||'').length}B`);

// ── THE CONTROL: disable the CG sequence block ──
const KILLED = await integrated(true);
const kTags = (KILLED.log || []).map(x => x.at);
ok('CG16 ★ disabling the CG sequence block stops the sequence and the store — while the panel still renders and still commits',
   !KILLED.aborted && kTags.indexOf('cg:seq') === -1 && kTags.indexOf('cg:store') === -1
   && kTags.indexOf('cg:commit') !== -1 && !KILLED.threw,
   `counts=${JSON.stringify(KILLED.cts)} log=${JSON.stringify(KILLED.log)}`);
ok('CG17 ★ …and that exact facet then commits UNRESOLVED, with no conflict',
   (KILLED.rows || []).some(r => r.facet_id === 'gen:dohkar:v1:worldview'
     && r.semanticStatus !== 'contradiction' && r.publishedWithConflict !== true),
   JSON.stringify(KILLED.rows));
console.log(`  integrated : ${JSON.stringify(tags)} uid=${INT.uid}`);
console.log(`  rows       : ${JSON.stringify(INT.rows)}`);
console.log(`  killed     : ${JSON.stringify(kTags)} rows=${JSON.stringify(KILLED.rows)}`);

console.log('\n' + out.join('\n'));
console.log(`\n  uids   : A=${U.uidA} again=${U.uidAgain === U.uidA} B=${U.uidB}`);
console.log(`  own    : ${JSON.stringify(OWN.rows)}`);
console.log(`  foreign: panel=${uidC} seededUnder=${U.uidB} rows=${JSON.stringify(FOREIGN.rows)}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
