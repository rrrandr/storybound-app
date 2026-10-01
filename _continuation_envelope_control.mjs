// CONTINUATION ENVELOPE + REAL-PARSER CONTROL. Provider-free, no network, no model calls, $0.
//
// WHY THIS EXISTS. The first live run reported the planner declining the optional schema. Auditing
// the contract end to end showed something more basic was also true: the fields could not have
// survived even a perfectly compliant reply.
//   • request schema  — the planner call sets NO json_schema and NO tool schema (the app uses only
//                       free-form response_format json_object, and not on this call), so nothing
//                       structurally excludes keys;
//   • parser          — `JSON.parse(_scContent)` preserves unknown keys;
//   • WHITELIST       — `_stateChange` is built by copying a FIXED LIST of named fields, so every
//                       continuation key is silently dropped at that boundary;
//   • HANDLER         — `_processContinuationProposal` was NEVER CALLED from the planner path.
// So the handler now receives the RAW parsed reply, and this control proves a raw reply's envelope
// survives to the sealed-proposal path.
//
// THE ENVELOPE is required on every opt-in reply: nonempty scene_purpose, nonempty
// forward_pressure, a canon_change key that MAY be null, and introduces as an array that MAY be
// empty. `null` + `[]` is the NORMAL answer — the planner is never pressured to invent a fact.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// A RAW planner reply, exactly as JSON.parse would hand it over: the existing contract's keys PLUS
// the continuation envelope. Shape-faithful to the real grok-4.3 reply captured in the live run
// (same keys, same nesting), with the envelope added.
const RAW_WITH_CHANGE = {
  tactical_move: 'An outside body takes an interest in the burning.',
  state_change_precondition: 'No authority beyond the college has acted',
  state_change: 'Riders of a governing commission arrive on the north road',
  forces_choice: 'forces Lirael to choose between answering them and running further',
  branch_a: 'answer them', branch_b: 'run further',
  posture_read: 'The reader burned the archive and rode north, defiant.',
  local_objective: 'Let an outside authority put its first question to her.',
  local_objective_actor: 'Lirael',
  present: ['pc:lirael'],
  reserved: { price_identified: 'untouched', inquiry_opened: 'untouched' },
  aftermath: { the_answer_institutional: 'kept' },
  event_slots: { precondition: 'x', actor: 'Lirael', action: 'answers', target: 'the riders', exitState: 'y' },
  // ── the continuation envelope
  scene_purpose: 'Bring a consequence back onto her from outside the college.',
  forward_pressure: 'A body she has no standing with is now looking at her.',
  derivation: 'The player burned a settlement and rode toward its governance.',
  introduces: [{ kind: 'institution', label: 'the Reach Commission', aliases: ['the Commission'],
    justification: 'Governance able to investigate a razing.',
    future_relevance: 'It will summon her and shape the inquiry.' }],
  existingRefs: [],
  canon_change: { tier: 2, targets: ['the Reach Commission'],
    content: 'The Reach Commission opens an investigation into the burning of the Reach.' }
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._processContinuationProposal === 'function', { timeout: 20000 });

console.log('=== CONTINUATION ENVELOPE + REAL PARSER (no network, no model, $0) ===\n');

const r = await page.evaluate(({ RAW_WITH_CHANGE }) => {
  const out = {};
  window._continuationProposalSchema = true;   // explicit opt-in
  window.state = window.state || {};
  window.state.storyId = 'story-envelope';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._activeContinuationSeal = null;
  const facts = () => window._ensureCommittedState().facts;
  const ents = () => (window.state._relationshipLedger || { entities: {} }).entities;

  // ── THE REAL PARSER. Serialize the raw reply and parse it exactly as the planner path does
  // (`JSON.parse(_scContent)`), so the envelope is proven to survive real serialization +
  // parsing rather than being handed over as a live object.
  const wire = JSON.stringify({ content: JSON.stringify(RAW_WITH_CHANGE) });
  const envelope = JSON.parse(JSON.parse(wire).content);
  out.survivedKeys = ['scene_purpose', 'forward_pressure', 'derivation', 'introduces',
    'existingRefs', 'canon_change'].filter(k => Object.prototype.hasOwnProperty.call(envelope, k));
  out.canonChangeSurvived = envelope.canon_change && envelope.canon_change.content;
  out.introducesSurvived = Array.isArray(envelope.introduces) && envelope.introduces.length;

  // ── 1. NO-CHANGE CONTINUATION: real purpose/pressure, explicit null + []
  window.state.turnCount = 50;
  window.state._scenePosture = { '50': { hash: 'ph-env-50' } };
  out.noChange = window._processContinuationProposal({
    scene_purpose: 'Let her sit in the silence after the fire.',
    forward_pressure: 'Nobody has come for her yet, and that is worse than if they had.',
    canon_change: null, introduces: []
  }, { scene: 50 });
  out.noChangeFacts = facts().length;
  out.noChangeSeal = window.state._activeContinuationSeal;
  out.noChangeSealedCount = Object.keys((window.state._sealedProposals || { byId: {} }).byId).length;
  out.noChangeEntCount = Object.keys(ents()).length;

  // ── 2. ENVELOPE VIOLATIONS are rejected as violations, not silently "none"
  out.vMissingPurpose = window._validateContinuationProposal({
    forward_pressure: 'p', canon_change: null, introduces: [] });
  out.vMissingPressure = window._validateContinuationProposal({
    scene_purpose: 'p', canon_change: null, introduces: [] });
  out.vMissingChangeKey = window._validateContinuationProposal({
    scene_purpose: 'p', forward_pressure: 'q', introduces: [] });
  out.vIntroducesNotArray = window._validateContinuationProposal({
    scene_purpose: 'p', forward_pressure: 'q', canon_change: null, introduces: 'nope' });
  out.vEmptyPurpose = window._validateContinuationProposal({
    scene_purpose: '   ', forward_pressure: 'q', canon_change: null, introduces: [] });
  // the OLD optional shape — no envelope at all — is now a violation, not 'none'
  out.vNoEnvelope = window._validateContinuationProposal({ tactical_move: 'x', state_change: 'y' });

  // ── 3. A VALID TIER 2 from the REAL-PARSED reply seals and reaches the author boundary
  window.state.turnCount = 51;
  window.state._scenePosture['51'] = { hash: 'ph-env-51' };
  out.tier2 = window._processContinuationProposal(envelope, { scene: 51 });
  out.tier2Seal = window.state._activeContinuationSeal;
  out.tier2Block = window._continuationAuthorBlock(out.tier2.sealedId,
    out.tier2Seal ? out.tier2Seal.readerFacing : {});
  out.tier2FactsAfterSeal = facts().length;
  const rec = out.tier2.sealedId ? window._resolveSealedProposal(out.tier2.sealedId) : null;
  out.tier2SealedFact = rec ? rec.fact : null;
  out.tier2PendingIds = rec ? (rec.pendingEntities || []).map(e => e.id) : [];
  out.tier2PendingInLedger = out.tier2PendingIds.filter(id => !!ents()[id]);
  // delivery → activation
  out.tier2Anchors = window._checkDeliveryAnchors(out.tier2.sealedId,
    'Riders of the Commission came up the north road before the smoke had thinned.', []);
  out.tier2Activated = !!window._commitTransition(out.tier2.sealedId, 'scene51', 51);
  out.tier2FactsAfter = facts().map(f => ({ fact: f.fact, ref: f.proposalRef, link: f.provenanceLink }));
  return out;
}, { RAW_WITH_CHANGE });

await browser.close();

console.log('A. the envelope survives REAL serialization + the real parse');
t('all six continuation keys survive JSON round-trip', r.survivedKeys.length === 6,
  JSON.stringify(r.survivedKeys));
t('  canon_change.content survives', !!r.canonChangeSurvived, String(r.canonChangeSurvived));
t('  introduces survives as a populated array', r.introducesSurvived === 1,
  'len=' + r.introducesSurvived);

console.log('\nB. NO-CHANGE continuation — purpose and pressure, zero ledger activity');
t('outcome is none', r.noChange.outcome === 'none', JSON.stringify(r.noChange));
t('  it was NOT an envelope violation', r.noChange.why.length === 0, JSON.stringify(r.noChange.why));
t('  nothing was sealed', r.noChange.sealedId === null && r.noChangeSealedCount === 0,
  'count=' + r.noChangeSealedCount);
t('  no entity was minted', r.noChangeEntCount === 0, 'entities=' + r.noChangeEntCount);
t('  the ledger is empty', r.noChangeFacts === 0, 'facts=' + r.noChangeFacts);
t('  no author carrier was set', r.noChangeSeal === null);

console.log('\nC. envelope VIOLATIONS are rejected as violations, not as "none"');
[['missing scene_purpose', r.vMissingPurpose, 'scene_purpose is missing'],
 ['missing forward_pressure', r.vMissingPressure, 'forward_pressure is missing'],
 ['absent canon_change key', r.vMissingChangeKey, 'canon_change key absent'],
 ['introduces not an array', r.vIntroducesNotArray, 'introduces is not an array'],
 ['whitespace-only scene_purpose', r.vEmptyPurpose, 'scene_purpose is missing or empty'],
 ['no envelope at all (the old optional shape)', r.vNoEnvelope, 'envelope:']
].forEach(([name, res, needle]) => {
  t(name + ' is rejected', res.ok === false && res.outcome === 'rejected', JSON.stringify(res));
  t('  flagged as an envelope violation', res.envelopeViolation === true);
  t('  with a specific reason', JSON.stringify(res.why).indexOf(needle) >= 0, JSON.stringify(res.why));
});

console.log('\nD. a VALID Tier 2 from the real-parsed reply seals and reaches the author');
t('the proposal sealed', r.tier2.outcome === 'sealed', JSON.stringify(r.tier2.why));
t('  derived as Tier 2', r.tier2.tier === 2, 'tier=' + r.tier2.tier);
t('  the sealed fact is the reply\'s canon_change.content',
  r.tier2SealedFact === 'The Reach Commission opens an investigation into the burning of the Reach.',
  String(r.tier2SealedFact));
t('  one pending entity, with a backend id', r.tier2PendingIds.length === 1
  && /^ent:stage:\d+$/.test(r.tier2PendingIds[0]), JSON.stringify(r.tier2PendingIds));
t('  it is NOT in the active ledger at seal time', r.tier2PendingInLedger.length === 0,
  JSON.stringify(r.tier2PendingInLedger));
t('  sealing wrote no fact', r.tier2FactsAfterSeal === 0, 'facts=' + r.tier2FactsAfterSeal);
console.log('   author block: ' + JSON.stringify(r.tier2Block));
t('the author block carries the sealed fact',
  r.tier2Block.indexOf('The Reach Commission opens an investigation') >= 0);
t('  and the reader-facing purpose/pressure',
  r.tier2Block.indexOf('Bring a consequence back onto her') >= 0
  && r.tier2Block.indexOf('A body she has no standing with') >= 0);
t('  and no machinery', !/ent:stage:|prop:|tier|basis|targets|canon_change/i.test(r.tier2Block));
t('delivery anchors are satisfied', r.tier2Anchors.verdict === 'anchors_present',
  JSON.stringify(r.tier2Anchors.why));
t('activation yields exactly one sealed-provenance fact',
  r.tier2FactsAfter.length === 1 && r.tier2FactsAfter[0].link === 'sealed'
  && !!r.tier2FactsAfter[0].ref, JSON.stringify(r.tier2FactsAfter));

console.log('\nE. the handler is actually WIRED into the planner path  [STATIC]');
const SRC = fs.readFileSync('public/app.js', 'utf8');
const calls = (SRC.match(/_processContinuationProposal\(/g) || []).length;
t('_processContinuationProposal has a call site, not just a definition', calls >= 2,
  'occurrences=' + calls);
t('  it is called with the RAW parsed reply, not the whitelisted _stateChange',
  /_processContinuationProposal\(_scP,/.test(SRC));
t('  and it sits after _priorSceneStateChange is set (pre-author)',
  SRC.indexOf('_processContinuationProposal(_scP,') > SRC.indexOf('state._priorSceneStateChange = _stateChange'));
// Strip `//` comment lines before scanning: an earlier form matched the word "json_schema" inside
// my OWN explanatory comment above the wire. Same self-trip as the _sceneStateCard scan — a
// source-text assertion must exclude prose that merely discusses the thing it forbids.
const CODE = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
t('the planner call still sets no json_schema or tool schema (code, not comments)',
  !/json_schema/.test(CODE) && !/\btools:\s*\[/.test(CODE),
  (CODE.match(/json_schema|tools:\s*\[/) || [''])[0]);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
