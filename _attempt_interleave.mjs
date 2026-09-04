// ══════════════════════════════════════════════════════════════════════════════════════════
//  TWO CONCURRENT AUTHORING ATTEMPTS KEEP THEIR OWN IDENTITY
//
//  The attempt id was minted correctly and then read back out of mutable global state AFTER an
//  await. That is not identity: attempt A could await its canon sequence, attempt B could start
//  and overwrite the slot, and A would then stamp its result AND mount its page as B.
//
//  This holds A inside the sequence, lets B mint and finish, then releases A — and asserts each
//  attempt's result and page carry their own id, and that each verdict reaches only its own page.
//  Driven against the real sequence seam in served source; no model calls.
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

// A test-only harness around the REAL continuation seam. It runs the production statements —
// local mint, sequence await, _cpStoreSeqResult, addPage with the local — as a callable, so two
// of them can be interleaved deterministically. The statements are lifted verbatim from the
// served source below and asserted to still exist there.
const SEAM = `
window.__runAttempt = async function (label, hold) {
  var _pageAttemptC = _cpMintAttemptId();
  window.__minted = window.__minted || {}; window.__minted[label] = _pageAttemptC;
  if (hold) { await new Promise(function (r) { window.__release = r; }); }
  var _seqC = { stages: ['initial:contradiction'], semanticStatus: 'contradiction',
                publishedWithConflict: true, dispatches: 0, publish: true, commit: true,
                finalText: 'prose-' + label };
  _cpStoreSeqResult(window.state, _pageAttemptC, {
    storyId: String(window.state.storyId || ''),
    attemptId: _pageAttemptC,
    invocationSeq: (window.state._invocationSeq || null),
    proseFp: _cpProseFp('prose-' + label),
    consumed: false, sceneNumber: 4, stages: _seqC.stages.slice(),
    semanticStatus: label === 'A' ? 'contradiction' : 'compatible',
    publishedWithConflict: label === 'A',
    dispatches: 0, publish: true, commit: true
  });
  window.StoryPagination.addPage('<p>prose-' + label + '</p>', true, 'page-' + label,
    { cpAttemptId: _pageAttemptC });
  return _pageAttemptC;
};
`;

let body = SRC.replace("  function _cpNewAttemptId(s) {", SEAM + "\n  function _cpNewAttemptId(s) {");
if (MUT) {
  const [from, to] = MUT.split('@@TO@@');
  const n = body.split(from).length - 1;
  if (n !== 1) { console.error(`\n  MUTATION MARKER NOT UNIQUE: ${n}\n`); process.exit(2); }
  body = body.replace(from, to);
}
try { new vm.Script(body, { filename: 'interleave.js' }); }
catch (e) { console.error(`\n  MUTATED SOURCE DOES NOT PARSE: ${String((e && e.message) || e)}\n`); process.exit(2); }

// The seam this harness mirrors must still be the seam production uses.
ok('L0 production mints the attempt PURELY, into a local, before the await at both seams',
   SRC.includes('var _pageAttempt = _cpMintAttemptId();')
   && SRC.includes('var _pageAttemptC = _cpMintAttemptId();')
   && !SRC.includes('_cpNewAttemptId(null)'),
   'pure mint used at both seams');
ok('L1 production stores results in a MAP keyed by attempt, not one slot',
   SRC.includes('_cpStoreSeqResult(state, _pageAttempt,')
   && SRC.includes('_cpStoreSeqResult(state, _pageAttemptC,')
   && !/state\._cpCanonSequenceResult\s*=\s*\{/.test(SRC),
   'store calls present, no result ever assigned to the single slot');
ok('L2 production stamps the page with that same local, never with state._cpAttemptId',
   SRC.includes('cpAttemptId: (typeof _pageAttempt !== \'undefined\' ? _pageAttempt : null)')
   && SRC.includes('cpAttemptId: (typeof _pageAttemptC !== \'undefined\' ? _pageAttemptC : null)')
   && !SRC.includes('cpAttemptId: (state._cpAttemptId || null)'),
   'page metadata uses the locals');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const escaped = [];
await installSession(page);
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.route('**/app.js*', r => r.fulfill({ status: 200,
  contentType: 'application/javascript; charset=utf-8', body }));
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.__runAttempt && window._cpTakeSeqResult, { timeout: 60000 });

const R = await page.evaluate(async () => {
  const s = window.state;
  s.storyId = 'interleave-1';
  s._cpCanonSequenceResults = null;
  s._cpAttemptId = 'cpa:UNTOUCHED-SENTINEL';
  const mintedBefore = s._cpAttemptId;
  // A starts and PARKS inside its sequence.
  const pA = window.__runAttempt('A', true);
  await new Promise(r => setTimeout(r, 30));
  const mintedAfterA = s._cpAttemptId;
  // B runs to completion while A is parked — overwriting every shared slot A might read.
  const idB = await window.__runAttempt('B', false);
  const mintedAfterB = s._cpAttemptId;
  // Release A. If A reads identity from state now, it takes B's.
  window.__release();
  const idA = await pA;
  const meta = (u) => (window.StoryPagination.getPageMetaByUid(u) || {}).cpAttemptId || null;
  const results = Object.keys(s._cpCanonSequenceResults || {});
  return { idA, idB, minted: window.__minted, mintedBefore, mintedAfterA, mintedAfterB,
           pageA: meta('page-A'), pageB: meta('page-B'), results,
           resA: (s._cpCanonSequenceResults || {})[idA] || null,
           resB: (s._cpCanonSequenceResults || {})[idB] || null };
});

// The old form asserted the SHARED SLOT changed under A — that was the hazard. Minting is pure
// now, so the stronger claim is that minting touches no shared state at all: there is nothing
// for a concurrent attempt to overwrite.
const PURE = await page.evaluate(() => {
  const s = window.state;
  s._cpAttemptId = 'cpa:PURITY-SENTINEL';
  const a = window._cpMintAttemptId(), b = window._cpMintAttemptId();
  return { a, b, slotAfter: s._cpAttemptId };
});
ok('L3 ★ the two attempts minted DIFFERENT ids, and the SEAM mint writes nothing to shared state',
   R.idA && R.idB && R.idA !== R.idB
   && PURE.a !== PURE.b && PURE.slotAfter === 'cpa:PURITY-SENTINEL',
   JSON.stringify({ idA: R.idA, idB: R.idB, pure: PURE }));
ok('L4 ★ A\'s page carries A\'s id — not the id the shared slot held when A resumed',
   R.pageA === R.idA, `pageA=${R.pageA} idA=${R.idA} slotWhenAResumed=${R.mintedAfterB}`);
ok('L5 ★ B\'s page carries B\'s id',
   R.pageB === R.idB, `pageB=${R.pageB} idB=${R.idB}`);
ok('L6 ★ both results survive concurrently — a later attempt does not overwrite an earlier one before its page mounts',
   R.results.length === 2 && !!R.resA && !!R.resB,
   `results=${JSON.stringify(R.results)}`);
ok('L7 ★ each result carries its own attempt id and its own verdict',
   R.resA && R.resB && R.resA.attemptId === R.idA && R.resB.attemptId === R.idB
   && R.resA.semanticStatus === 'contradiction' && R.resB.semanticStatus === 'compatible',
   JSON.stringify({ a: R.resA && [R.resA.attemptId, R.resA.semanticStatus],
                    b: R.resB && [R.resB.attemptId, R.resB.semanticStatus] }));

// ── EACH VERDICT REACHES ONLY ITS OWN PAGE ──
const T = await page.evaluate(([idA, idB]) => {
  const s = window.state;
  const take = (uid) => {
    const m = window.StoryPagination.getPageMetaByUid(uid) || {};
    const r = window._cpTakeSeqResult(s, m.cpAttemptId || null);
    return r ? { attemptId: r.attemptId, semanticStatus: r.semanticStatus } : null;
  };
  const a = take('page-A'), b = take('page-B');
  const againA = take('page-A');                 // a second commit of the same page
  return { a, b, againA, left: Object.keys(s._cpCanonSequenceResults || {}) };
}, [R.idA, R.idB]);
ok('L8 ★ page A takes A\'s contradiction; page B takes B\'s compatible — no crossover',
   T.a && T.b && T.a.attemptId === R.idA && T.a.semanticStatus === 'contradiction'
   && T.b.attemptId === R.idB && T.b.semanticStatus === 'compatible',
   JSON.stringify(T));
ok('L9 ★ a second commit of the same page finds nothing — the result was taken, not merely flagged',
   T.againA === null && T.left.length === 0, JSON.stringify(T));
ok('L10 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));

console.log('\n' + out.join('\n'));
console.log(`\n  minted   : ${JSON.stringify(R.minted)}`);
console.log(`  pages    : A=${R.pageA} B=${R.pageB}`);
console.log(`  slot     : afterA=${R.mintedAfterA} afterB=${R.mintedAfterB}`);
console.log(`  takes    : ${JSON.stringify(T)}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
