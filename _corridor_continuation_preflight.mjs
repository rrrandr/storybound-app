// CORRIDOR CONTINUATION PREFLIGHT. Provider-free, no network, no model calls, $0.
//
// WHY. The two-case live run was valid evidence for the ENVELOPE but not for dynamic canon: both
// cases returned the seed's row-2 objective ("Land the Dohkar's formal questioning…") because
// First Sacrifice scene 2 has an AUTHORED row, and `_usePlanSpine` means the plan wins outright
// where a matching scene exists. Case B was mis-targeted — the planner behaved correctly and the
// experiment could not distinguish "won't propose" from "shouldn't propose here".
//
// This preflight is the zero-cost gate for the NEXT run. It proves, before anything is billed:
//   1. the chosen test story has NO matching authored objective (no seed, no plan, no row);
//   2. the authored-spine language is ABSENT from the assembled planner prompt;
//   3. the continuation path is ACTIVE (flag, schema in prompt, handler wired);
//   4. the two seal kinds cannot collide.
//
// It is also the preflight the live runner should refuse to dispatch without.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const fixtures = JSON.parse(fs.readFileSync('_fsc_stage_fixtures.json', 'utf8'));
const AUTHOR_MARKERS = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
  /screenplay-native|cinematic-romance writer|prose author/i];
const marks = (s) => AUTHOR_MARKERS.reduce((n, rx) => n + (rx.test(s) ? 1 : 0), 0);
const sysOf = (raw) => { try { const j = JSON.parse(raw || '{}'); const m = (j.messages || [])[0];
  return typeof (m && m.content) === 'string' ? m.content : ''; } catch (_) { return ''; } };

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
const gate = await installFailClosedNetworkGate(page);
const stub = (req) => {
  const raw = (() => { try { return req.postData(); } catch (_) { return null; } })();
  const s = sysOf(raw);
  calls.push({ raw: raw || '', sys: s, marks: marks(s) });
  if (marks(s) >= 2) return { content: fixtures.authorGrok.content };
  if (/SCENE-SPINE planner|SCENE planner/.test(s)) return { content: fixtures.scenePlanner.content };
  if (/BODY BIBLE/.test(s)) return { content: fixtures.pcBodyBible.content };
  return { content: '' };
};
['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy'].forEach(p => gate.stub(p, stub));

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._processContinuationProposal === 'function', { timeout: 20000 });

console.log('=== CORRIDOR CONTINUATION PREFLIGHT (no network, no model, $0) ===\n');

const r = await page.evaluate(() => {
  const out = {};
  window._continuationProposalSchema = true;          // explicit opt-in
  window.state = window.state || {};

  // ── A CORRIDOR / ORIGINAL STORY: no starter id at all, so no seed and no plan.
  delete window.state._starterId;
  window.state.storyId = 'corridor-preflight-' + Date.now();
  window.state.world = 'Fatelands';
  window.state.worldSubtype = 'arcane_binding';
  window.state.picks = { flavor: 'Arcane Binding', world: 'Fatelands' };
  window.state.storyLength = 'fling';
  window.state.playerName = 'Wren';
  window.state.loveInterestName = 'Cassel';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._activeContinuationSeal = null;
  window.state._lastContinuationResult = null;
  window.state.turnCount = 4;
  window.state._scenePosture = { '4': { hash: 'ph-corridor-4', choice: 'burn',
    action: 'I burn the toll-house and ride for the river.', dialogue: 'Let them answer for it.' } };

  // 1. NO AUTHORED OBJECTIVE
  out.starterId = window.state._starterId === undefined ? 'undefined' : String(window.state._starterId);
  out.activeSeed = (typeof window._activeSeed === 'function') ? window._activeSeed(window.state) : 'NO_FN';
  out.activePlan = (typeof window._activePlan === 'function') ? window._activePlan(window.state) : 'NO_FN';
  out.effectiveRow = (typeof window._effectiveSceneRow === 'function')
    ? window._effectiveSceneRow(window.state, 4) : 'NO_FN';

  // 3. CONTINUATION PATH ACTIVE
  out.enabled = window._continuationSchemaEnabled();
  out.hasHandler = typeof window._processContinuationProposal === 'function';
  out.hasBlock = typeof window._continuationAuthorBlock === 'function';
  out.hasAnchors = typeof window._checkDeliveryAnchors === 'function';

  // 4. SEAL KINDS CANNOT COLLIDE — same scene, same posture, both kinds
  const sc = window._sealProposal({ kind: 'state_change', fact: 'A state change event.', scene: 4 });
  const ct = window._sealProposal({ kind: 'continuation', fact: 'A continuation fact.', scene: 4 });
  out.scId = sc && sc.id; out.ctId = ct && ct.id;
  out.scKind = sc && sc.kind; out.ctKind = ct && ct.kind;
  out.distinctSeals = !!sc && !!ct && sc.id !== ct.id;
  out.scFact = sc && sc.fact; out.ctFact = ct && ct.fact;
  // and each kind's idempotency is still per kind
  out.scAgain = window._sealProposal({ kind: 'state_change', fact: 'ignored', scene: 4 }).id;
  out.ctAgain = window._sealProposal({ kind: 'continuation', fact: 'ignored', scene: 4 }).id;
  // reset for the funnel run
  window.state._sealedProposals = null;
  return out;
});

console.log('1. THE TEST STORY HAS NO AUTHORED OBJECTIVE');
t('no _starterId is set (a Corridor/original story)', r.starterId === 'undefined', r.starterId);
t('_activeSeed returns null', r.activeSeed === null, JSON.stringify(r.activeSeed));
t('_activePlan returns null', r.activePlan === null, JSON.stringify(r.activePlan));
t('_effectiveSceneRow returns null — no row owns this scene', r.effectiveRow === null,
  JSON.stringify(r.effectiveRow));

console.log('\n3. THE CONTINUATION PATH IS ACTIVE');
t('the opt-in flag is enabled', r.enabled === true);
t('the handler, author block and anchor check are present',
  r.hasHandler && r.hasBlock && r.hasAnchors, JSON.stringify(r));

console.log('\n4. THE TWO SEAL KINDS CANNOT COLLIDE');
console.log('   state_change=' + r.scId + ' (' + r.scKind + ')  continuation=' + r.ctId + ' (' + r.ctKind + ')');
t('both kinds seal at the same scene+posture as DISTINCT records', r.distinctSeals === true,
  r.scId + ' vs ' + r.ctId);
t('  each keeps its own fact', r.scFact === 'A state change event.' && r.ctFact === 'A continuation fact.',
  JSON.stringify([r.scFact, r.ctFact]));
t('  state_change idempotency is still per kind', r.scAgain === r.scId, r.scAgain + ' vs ' + r.scId);
t('  continuation idempotency is still per kind', r.ctAgain === r.ctId, r.ctAgain + ' vs ' + r.ctId);

// ── drive the real funnel (network stubbed) and inspect the assembled planner prompt
await page.evaluate(async () => {
  try { await Promise.race([
    window._runCGScreenplayGen(1, 'I burn the toll-house and ride for the river.', 'Let them answer for it.'),
    new Promise(res => setTimeout(res, 60000))]); } catch (_) {}
});
const after = await page.evaluate(() => ({
  ctResult: window.state._lastContinuationResult,
  facts: window._ensureCommittedState().facts.length
}));
await browser.close();

const planner = calls.filter(c => /SCENE-SPINE planner|SCENE planner/.test(c.sys)).pop() || null;
const author = calls.filter(c => c.marks >= 2).pop() || null;
const P = planner ? planner.raw : '';

console.log('\n2. THE AUTHORED-SPINE LANGUAGE IS ABSENT FROM THE PLANNER PROMPT');
t('a planner request was assembled', !!planner);
const SPINE_LANG = [
  ['authored story spine', /authored story spine/i],
  ['scheduled objective', /SCHEDULED OBJECTIVE/],
  ['must still be true', /MUST STILL BE TRUE for the reader/i],
  ['scene exit state', /SCENE EXIT STATE/],
  ['reserved canon block', /RESERVED CANON — NOT YET/]
];
SPINE_LANG.forEach(([name, rx]) => {
  const m = P.match(rx);
  t('  no "' + name + '" in the prompt', !m, m ? 'found "' + m[0] + '"' : '');
});
t('  the reader\'s own action IS present', /I burn the toll-house and ride for the river/.test(P));

console.log('\n   and the continuation contract IS present');
t('the CONTINUATION ENVELOPE schema is in the planner prompt',
  /CONTINUATION ENVELOPE \(REQUIRED/.test(P));
t('  with the null-is-normal guidance', /null is the NORMAL answer/.test(P));
t('  and the no-manufacturing prohibition',
  /Do NOT invent a durable fact merely to fill the envelope/.test(P));

console.log('\n   the funnel reached the author with a stubbed planner reply');
t('an author request was assembled', !!author);
t('the handler ran on the (fixture) planner reply', !!after.ctResult, JSON.stringify(after.ctResult));
t('  and the stubbed reply, lacking an envelope, is an envelope VIOLATION — not a silent none',
  !!after.ctResult && after.ctResult.outcome === 'rejected'
  && JSON.stringify(after.ctResult.why).indexOf('envelope:') >= 0,
  JSON.stringify(after.ctResult));
t('  nothing was activated', after.facts === 0, 'facts=' + after.facts);

console.log('\nREADINESS FOR THE NEXT LIVE RUN');
const ready = fail === 0;
console.log('  ' + (ready ? 'READY — a Corridor story with no authored objective and an active continuation path.'
  : 'NOT READY — ' + fail + ' precondition(s) unmet; do not dispatch.'));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
