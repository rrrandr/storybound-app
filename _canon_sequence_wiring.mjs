// ══════════════════════════════════════════════════════════════════════════════════════════
//  _cpCanonSequence IS WIRED — AND IS DORMANT-SAFE
//
//  audit → repair → verify existed, was tested, and had NO CALLER ANYWHERE. This proves it now
//  runs at FINAL_PROSE (the last authoritative prose before presentation — after the post-author
//  passes, before the page mounts), that it spends nothing while the capability is off, and that
//  what it concludes reaches the memory store instead of every beat recording `unresolved`.
//
//  The seam matters: after the mount the reader has seen the page, and a repair there would be a
//  competing author rewriting delivered prose.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 620) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const MUT = process.env.SB_MUT || '';
let body = SRC, targets = null;
if (MUT) {
  const [from, to] = MUT.split('@@TO@@');
  targets = body.split(from).length - 1;
  if (targets !== 1) { console.error(`\n  MUTATION MARKER NOT UNIQUE: ${targets}\n`); process.exit(2); }
  body = body.replace(from, to);
}

const browser = await chromium.launch({ headless: true });
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
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.route('**/app.js*', r => r.fulfill({ status: 200,
  contentType: 'application/javascript; charset=utf-8', body }));
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
page.on('console', m => { const x = m.text(); if (/CANON:SEQUENCE|AUDITOR/i.test(x)) logs.push(x.slice(0, 260)); });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._cpCanonSequence, { timeout: 60000 });

// ══ 1. IT HAS A PRODUCTION CALLER AT ALL ══
// Count INVOCATIONS: `_cpCanonSequence(` appears in the definition and at each call. The export
// line has no paren and never counted, so subtracting it under-reported callers by one.
const INVOCATIONS = body.split('_cpCanonSequence(').length - 1;
const DEFN = body.split('async function _cpCanonSequence(').length - 1;
const CALLERS = INVOCATIONS - DEFN;
ok('Q1 ★ _cpCanonSequence has a PRODUCTION call site — not only a definition and an export',
   CALLERS >= 1, `invocations=${INVOCATIONS} definition=${DEFN} → callers=${CALLERS}`);
ok('Q2 ★ …and that call site is at FINAL_PROSE, before StoryPagination.addPage, not after the mount',
   (() => {
     const seq = body.indexOf('var _seq = await _cpCanonSequence(');
     const fin = body.indexOf("site: 'FINAL_PROSE'");
     const add = body.indexOf('StoryPagination.addPage(formatStory(text), true, undefined,');
     return seq > 0 && fin > 0 && add > 0 && seq > fin && seq < add;
   })(), 'ordering: FINAL_PROSE → sequence → addPage');

// ══ 2. DORMANT: IT RUNS, CONCLUDES, AND SPENDS NOTHING ══
const D = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'canonseq-1', turnCount: 3, scenes: ['a', 'b', 'c'] });
  s._relationshipLedger = null;
  const stage = window._sceneStageContract(s, 4);
  if (!stage || !stage.ok) return { stageFault: stage && stage.fault };
  const model = window._cpBuildEstablishedCanon(stage, {});
  const prose = 'The harbour office was colder than the street. He weighed the ledger and said nothing.';
  const r = await window._cpCanonSequence(prose, model, { sceneUid: 'canonseq-uid-1' });
  return { subjects: (model.entries || []).length, stages: r.stages, dispatches: r.dispatches,
           publish: r.publish, commit: r.commit, semanticStatus: r.semanticStatus,
           textUnchanged: r.finalText === prose };
});
ok('Q3 the fixture has real canon subjects — a sequence over an empty model would prove nothing',
   !D.stageFault && D.subjects > 0, JSON.stringify(D));
ok('Q4 ★ while the capability is OFF the sequence spends NOTHING',
   D.dispatches === 0, `dispatches=${D.dispatches} stages=${JSON.stringify(D.stages)}`);
ok('Q5 ★ …and it still publishes and commits — enforcement off must not block the reader',
   D.publish === true && D.commit === true, `publish=${D.publish} commit=${D.commit}`);
ok('Q6 ★ …and the author\'s words are returned untouched — the pen never moved',
   D.textUnchanged === true, `textUnchanged=${D.textUnchanged}`);
ok('Q7 it records a real verdict rather than silence',
   typeof D.semanticStatus === 'string' && D.semanticStatus.length > 0
   && Array.isArray(D.stages) && D.stages.length > 0,
   `status=${D.semanticStatus} stages=${JSON.stringify(D.stages)}`);

// ══ 3. THE VERDICT REACHES THE COMMIT ══
const C = await page.evaluate(() => {
  const s = window.state;
  s._cpCanonSequenceResult = { sceneNumber: 4, stages: ['initial:contradiction', 'dormant_no_repair'],
                               semanticStatus: 'contradiction', publishedWithConflict: true,
                               dispatches: 0, publish: true, commit: true };
  // _relLedger(true) returns null unless a story is established, so give it one.
  s.storyId = s.storyId || 'canonseq-1';
  const L = window._relLedger(true) || (s._relationshipLedger =
    { v: 1, storyId: s.storyId, processed: {}, entities: {}, edges: {}, seq: 0 }) && window._relLedger(true);
  const id = 'ent:seqtest';
  L.entities[id] = { id, kind: 'named', label: 'Seq Test', aliases: ['Seq Test'] };
  window._cpCommitScene({ sceneUid: 'seq-uid-9', ordinal: 4, issue: 1,
    semanticStatus: s._cpCanonSequenceResult.semanticStatus, published: true,
    delivered: [{ canonicalId: id, facet_id: 'f:seq', category: 'value', verified: true }], appeared: [] });
  const c = (window._relLedger(false).entities[id] || {}).cplusContinuity;
  return { manifestations: (c && c.manifestations) || [] };
});
// SCOPE, STATED: this arm hands _cpCommitScene the verdict directly, so it proves the STORE
// keeps a contradiction rather than flattening it. It does NOT prove production's own threading
// at the disclosure commit site — removing that line leaves these two green. That threading, and
// the execution of the FINAL_PROSE call site itself, still need a runtime witness.
ok('Q8 the STORE records a CONTRADICTION verdict when given one, rather than flattening it to "unresolved"',
   C.manifestations.some(m => m.facet_id === 'f:seq' && m.semanticStatus === 'contradiction'),
   JSON.stringify(C.manifestations).slice(0, 320));
ok('Q9 …and publishing it anyway is remembered as publishedWithConflict — the reader HAS seen it',
   C.manifestations.some(m => m.facet_id === 'f:seq' && m.publishedWithConflict === true),
   JSON.stringify(C.manifestations).slice(0, 320));

ok('Q10 no request was made to the auditor or repair role while dormant',
   !calls.some(c => /CHARACTER_CANON_AUDITOR|CHARACTER_CANON_REPAIR/.test(c.payload || '')),
   JSON.stringify(calls.map(c => c.path)));
ok('Q11 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));

console.log('\n' + out.join('\n'));
console.log(`\n  NOT PROVEN HERE: that production's FINAL_PROSE call site EXECUTES, and that the`);
console.log(`  disclosure commit threads the verdict — both are source-level only so far.`);
console.log(`\n  dormant run : stages=${JSON.stringify(D.stages)} dispatches=${D.dispatches} status=${D.semanticStatus}`);
console.log(`  commit      : ${JSON.stringify(C.manifestations).slice(0, 220)}`);
if (MUT) console.log(`  MUTATION: targets=${targets}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
