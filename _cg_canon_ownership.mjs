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

console.log('\n' + out.join('\n'));
console.log(`\n  uids   : A=${U.uidA} again=${U.uidAgain === U.uidA} B=${U.uidB}`);
console.log(`  own    : ${JSON.stringify(OWN.rows)}`);
console.log(`  foreign: panel=${uidC} seededUnder=${U.uidB} rows=${JSON.stringify(FOREIGN.rows)}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
