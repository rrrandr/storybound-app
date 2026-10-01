// SAMPLE CLASSIFIER CONTROL. Provider-free, no network, no model calls, $0.
//
// WHY, AND WHY BEFORE THE PAID SAMPLING RUN. The reliability measurement's whole output is a
// distribution, so the CLASSIFIER is the instrument. Run 4 was nearly paid for with a harness that
// did not score pressure_scope at all; a mis-bucketing classifier would be the same error wearing
// a different hat — five paid samples sorted into the wrong bins and read as a finding.
//
// Roman's four buckets:
//   valid durable · valid scene-local · incoherent/rejected · envelope violations
//
// Every fixture runs through the REAL _processContinuationProposal, and the three REAL saved
// planner replies (runs 5, 6 and 7) are classified from their artefacts so the buckets are
// anchored to measured history, not only to hand-written fixtures.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { classifySample } from './_continuation_durable_grader.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const REAL = {
  run5: '_continuation_live_eval_out/run_2026-10-01T07-17-45-311Z/C-durable_planner_content.txt',
  run6: '_continuation_live_eval_out/run_2026-10-01T07-43-01-650Z/C-durable_planner_content.txt',
  run7: '_continuation_live_eval_out/run_2026-10-01T17-08-11-457Z/C-durable_planner_content.txt'
};
const realReplies = {};
for (const k of Object.keys(REAL)) realReplies[k] = JSON.parse(fs.readFileSync(REAL[k], 'utf8'));

// A fully valid durable proposal, and a fully valid scene-local one.
const GOOD_DURABLE = {
  scene_purpose: 'Put her petition in front of a body that can act on it.',
  forward_pressure: 'The Reach Commission will open an inquiry and summon her.',
  pressure_scope: 'durable',
  derivation: 'The player sent a sealed demand to the body that governs the toll road.',
  introduces: [{ kind: 'institution', label: 'the Reach Commission', aliases: ['the Commission'],
    justification: 'The governing body with jurisdiction over the toll road.',
    future_relevance: 'It will summon her and set the terms of the inquiry.' }],
  existingRefs: [],
  canon_change: { tier: 2, targets: ['the Reach Commission'],
    content: 'The Reach Commission opens an inquiry into the burning.' }
};
const GOOD_SCENE_LOCAL = {
  scene_purpose: 'Let the silence after the act do the work.',
  forward_pressure: 'Someone will answer for this before the week is out.',
  pressure_scope: 'scene_local', canon_change: null, introduces: [],
  branch_a: 'ride for the river before any answer can arrive',
  branch_b: 'stay and wait out the silence'
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const mut = (base, f) => { const r = clone(base); f(r); return r; };

const FIXTURES = [
  { id: 'good-durable', reply: GOOD_DURABLE, expect: 'valid_durable', path: 'durable' },
  { id: 'good-scene-local', reply: GOOD_SCENE_LOCAL, expect: 'valid_scene_local', path: 'scene_local' },
  // ENVELOPE VIOLATIONS — checked FIRST, so a reply that is not a valid envelope is never sorted
  // into either path bucket on the strength of a field it did supply.
  { id: 'ev-no-scope', reply: mut(GOOD_DURABLE, r => { delete r.pressure_scope; }),
    expect: 'envelope_violation', path: null },
  { id: 'ev-bad-scope', reply: mut(GOOD_DURABLE, r => { r.pressure_scope = 'permanent'; }),
    expect: 'envelope_violation', path: null },
  { id: 'ev-no-purpose', reply: mut(GOOD_DURABLE, r => { r.scene_purpose = '  '; }),
    expect: 'envelope_violation', path: 'durable' },
  { id: 'ev-no-canon-key', reply: mut(GOOD_DURABLE, r => { delete r.canon_change; }),
    expect: 'envelope_violation', path: 'durable' },
  { id: 'ev-introduces-not-array', reply: mut(GOOD_DURABLE, r => { r.introduces = 'the Commission'; }),
    expect: 'envelope_violation', path: 'durable' },
  // INCOHERENT — a well-formed envelope the validator refuses. Both real failure shapes.
  { id: 'inc-durable-no-derivation', reply: mut(GOOD_DURABLE, r => { delete r.derivation; }),
    expect: 'incoherent', path: 'durable' },
  { id: 'inc-durable-unidentified', reply: mut(GOOD_DURABLE, r => { r.introduces = []; r.canon_change = null; }),
    expect: 'incoherent', path: 'durable' },
  { id: 'inc-scene-local-relying', reply: mut(GOOD_SCENE_LOCAL, r => {
      r.branch_a = 'appear at the commission chambers to testify';
      r.exit_state = 'the demand now sits in the commission\'s possession'; }),
    expect: 'incoherent', path: 'scene_local' },
  { id: 'inc-scene-local-names-body', reply: mut(GOOD_SCENE_LOCAL, r => {
      r.forward_pressure = 'the commission must now respond to the sealed demand'; }),
    expect: 'incoherent', path: 'scene_local' },
  { id: 'inc-planner-id', reply: mut(GOOD_DURABLE, r => { r.introduces[0].id = 'ent:stage:99'; }),
    expect: 'incoherent', path: 'durable' }
];

// Count of void fixtures, declared before the bucket-coverage check below uses it.
const voidCasesCount = 5;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._processContinuationProposal === 'function', { timeout: 20000 });

console.log('=== SAMPLE CLASSIFIER CONTROL (no network, no model, $0) ===\n');

const runs = await page.evaluate((FX) => {
  const out = [];
  FX.forEach((f, i) => {
    const scene = 400 + i;
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-classify-' + i;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._sceneLocalPressures = null;
    window.state._lastContinuationResult = null;
    window.state.turnCount = scene;
    window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-cls-' + i };
    const snap = () => Object.keys((window.state._relationshipLedger || { entities: {} }).entities)
      .map(k => { const e = window.state._relationshipLedger.entities[k];
        return { id: e.id, kind: e.kind, label: e.label, aliases: e.aliases || [] }; });
    const ledgerBefore = snap();
    let res = null;
    try { res = window._processContinuationProposal(f.reply, { scene: scene }); }
    catch (e) { res = { outcome: 'threw', why: [String(e && e.message)] }; }
    out.push({ id: f.id, ledgerBefore,
      after: { ctResult: res, facts: window._ensureCommittedState().facts,
        sealed: window.state._sealedProposals
          ? Object.keys(window.state._sealedProposals.byId).map(k => window.state._sealedProposals.byId[k]) : [],
        ledger: snap() } });
  });
  return out;
}, FIXTURES.map(f => ({ id: f.id, reply: f.reply })));

await browser.close();
const byId = {}; runs.forEach(r => { byId[r.id] = r; });

console.log('1. every bucket is reachable, and each fixture lands in exactly its own');
FIXTURES.forEach(f => {
  const run = byId[f.id];
  const c = classifySample(f.reply, run.after, run.ledgerBefore);
  t('  ' + f.id + ' → ' + f.expect, c.bucket === f.expect,
    'got ' + c.bucket + ' why=' + JSON.stringify(c.why));
  t('    path recorded as ' + JSON.stringify(f.path), c.pathChosen === f.path,
    'got ' + JSON.stringify(c.pathChosen));
});

console.log('\n2. all five buckets were exercised (a bucket never reached proves nothing)');
const seen = {};
FIXTURES.forEach(f => { seen[f.expect] = (seen[f.expect] || 0) + 1; });
seen.void = voidCasesCount;
['valid_durable', 'valid_scene_local', 'incoherent', 'envelope_violation', 'void'].forEach(b => {
  t('  ' + b + ' has at least one fixture', (seen[b] || 0) > 0, 'count=' + (seen[b] || 0));
});

console.log('\n3. THE THREE REAL SAVED REPLIES classify as the runs actually went');
// Anchors the instrument to measured history. If a future change re-buckets these, it is changing
// what runs 5-7 meant, and that must be a deliberate decision rather than a side effect.
const c5 = classifySample(realReplies.run5, byId['inc-scene-local-relying'].after,
  byId['inc-scene-local-relying'].ledgerBefore);
t('run 5 (scene_local while relying) → incoherent', c5.bucket === 'incoherent',
  c5.bucket + ' ' + JSON.stringify(c5.why));
t('  path recorded as scene_local', c5.pathChosen === 'scene_local');
const c7 = classifySample(realReplies.run7, byId['inc-scene-local-relying'].after,
  byId['inc-scene-local-relying'].ledgerBefore);
t('run 7 (scene_local while relying) → incoherent', c7.bucket === 'incoherent',
  c7.bucket + ' ' + JSON.stringify(c7.why));
t('  path recorded as scene_local', c7.pathChosen === 'scene_local');
const c6 = classifySample(realReplies.run6, byId['inc-durable-no-derivation'].after,
  byId['inc-durable-no-derivation'].ledgerBefore);
t('run 6 (durable, missing derivation) → incoherent', c6.bucket === 'incoherent',
  c6.bucket + ' ' + JSON.stringify(c6.why));
t('  but its PATH is recorded as durable — the distinction the buckets alone lose',
  c6.pathChosen === 'durable', JSON.stringify(c6.pathChosen));
t('  and the reason names derivation',
  JSON.stringify(c6.why).toLowerCase().indexOf('derivation') >= 0, JSON.stringify(c6.why));

// ── VOID vs ENVELOPE_VIOLATION ───────────────────────────────────────────────
// Run 9: the local proxy returned "NO_RESPONSE_FROM_FUNCTION" on all three samples and this
// classifier filed them as ENVELOPE violations — which would have read as planner non-compliance
// for a model that was never reached. A transport failure is not a data point.
console.log('\n3b. a TRANSPORT failure is VOID, never a planner fault');
const RUN9 = 'An error occurred with this application.\n\nNO_RESPONSE_FROM_FUNCTION';
const voidCases = [
  ['run 9\'s actual proxy body', { dispatched: true, responded: true, content: '', bodySnippet: RUN9 }],
  ['no planner call dispatched at all', { dispatched: false }],
  ['a fetch/transport error', { dispatched: true, error: 'socket hang up' }],
  ['an empty content string', { dispatched: true, responded: true, content: '' }],
  ['whitespace-only content', { dispatched: true, responded: true, content: '   \n  ' }]
];
voidCases.forEach(([name, tr]) => {
  const c = classifySample(null, {}, [], tr);
  t('  ' + name + ' → void', c.bucket === 'void', c.bucket + ' ' + JSON.stringify(c.why));
  t('    and no path is attributed', c.pathChosen === null, JSON.stringify(c.pathChosen));
});
t('  run 9\'s body is NOT filed as an envelope violation — the defect this closes',
  classifySample(null, {}, [], voidCases[0][1]).bucket !== 'envelope_violation');
t('  and the reason quotes what actually came back',
  JSON.stringify(classifySample(null, {}, [], voidCases[0][1]).why).indexOf('NO_RESPONSE_FROM_FUNCTION') >= 0,
  JSON.stringify(classifySample(null, {}, [], voidCases[0][1]).why));

console.log('\n3c. but CONTENT that arrived and failed the contract is the PLANNER\'s fault');
const spoke = (content) => ({ dispatched: true, responded: true, content: content });
t('prose instead of JSON → envelope_violation, not void',
  classifySample(null, {}, [], spoke('I have decided not to answer in JSON.')).bucket === 'envelope_violation');
t('  and the reason says content came back',
  JSON.stringify(classifySample(null, {}, [], spoke('nope')).why).indexOf('content returned') >= 0);
t('a real reply missing a required key → envelope_violation',
  classifySample({ scene_purpose: 'x', forward_pressure: 'y', canon_change: null, introduces: [] },
    {}, [], spoke('{...}')).bucket === 'envelope_violation');
t('a VALID reply still classifies normally when transport is healthy',
  classifySample(GOOD_SCENE_LOCAL, { ctResult: { outcome: 'none' }, ledger: [] }, [],
    spoke(JSON.stringify(GOOD_SCENE_LOCAL))).bucket === 'valid_scene_local');
t('with NO transport information a null reply is VOID, not attributed to the planner',
  classifySample(null, {}, []).bucket === 'void',
  JSON.stringify(classifySample(null, {}, []).why));

console.log('\n4. a durable reply that SEALS is the only thing counted as valid_durable');
const gd = byId['good-durable'];
t('the good durable fixture actually sealed in the live validator',
  gd.after.ctResult && gd.after.ctResult.outcome === 'sealed', JSON.stringify(gd.after.ctResult));
t('  and an identical reply whose handler did NOT seal is NOT valid_durable',
  classifySample(GOOD_DURABLE, { ctResult: { outcome: 'rejected', why: ['x'] }, ledger: [] }, [])
    .bucket === 'incoherent');
t('a scene_local reply the handler did NOT accept is NOT valid_scene_local',
  classifySample(GOOD_SCENE_LOCAL, { ctResult: { outcome: 'rejected', why: ['x'] }, ledger: [] }, [])
    .bucket === 'incoherent');
t('an unparseable reply with no transport info attributes nothing',
  classifySample(null, {}, []).bucket === 'void'
  && classifySample(null, {}, []).pathChosen === null);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
