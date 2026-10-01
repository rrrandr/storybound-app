// CONTINUATION PROMPT HARVEST. Provider-free: every request is served a fixed stub by the shared
// fail-closed gate, so nothing leaves the machine and no model is called.
//
// Drives the REAL browser funnel and harvests the two assembled payloads that matter:
//   1. the final SCENE-SPINE PLANNER request
//   2. the TERMINAL AUTHOR request
// then asserts the boundary against those real strings, not against reconstructions.
//
// Also acts as a PREFLIGHT: the assertions here fail if the planner schema or the author-boundary
// material is absent, so a future paid dispatch cannot happen with the contract missing.
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

// TWO SCANS, deliberately different in scope.
//
// (1) WHOLE PAYLOAD — strings unique to this machinery. These may not appear anywhere in a 227KB
//     author prompt, because nothing else in the app produces them.
const FORBIDDEN_ANYWHERE = [
  ['entity id', /ent:stage:\d+/],
  ['sealed proposal id', /prop:\d+:\d+/],
  ['posture hash', /ph-[a-z0-9-]+/],
  ['basis vocabulary', /causal_chain|declared_high_authority|fate_outcome|player_action/],
  ['validator language', /SMUGGLING|anchor_missing|provenanceLink|does not resolve/],
  ['register/schema field names', /protectedRegister|existingRefs|canon_change|introduces\[|pendingEntities/],
  ['verifier-only field names', /decisiveChange|dominant_replacement|slots_check/]
];
// (2) CONTINUATION BLOCK ONLY — generic words that legitimately occur elsewhere in the app, so a
//     whole-payload scan would false-positive. Verified pre-existing and unrelated: "TIER 2" is
//     provider-tier routing (`TIER 2: ministral-8b-2512`), and `DELIVERED ASSIGNMENTS` /
//     `DELIVERED IN MOTION` are the CG stage-delivery vocabulary. Scoping to the block is the
//     honest test of "my block leaks nothing".
const FORBIDDEN_IN_BLOCK = [
  ['tier', /tier/i], ['basis', /basis/i], ['targets', /targets/i],
  ['delivery verdict', /DELIVERED|PARTIAL|MISSED/], ['tableau', /tableau/i],
  ['protected/register', /protected|register/i]
];
// Extract just the continuation block from a payload.
const blockOf = (payload) => {
  const i = payload.indexOf('CONTINUATION — ALREADY TRUE');
  if (i < 0) return '';
  const tail = payload.slice(i);
  const j = tail.indexOf('\\n\\n');
  return j > 0 ? tail.slice(0, j) : tail.slice(0, 600);
};

const harvest = async (scenario) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const calls = [];
  const gate = await installFailClosedNetworkGate(page);
  const stub = (req) => {
    const raw = (() => { try { return req.postData(); } catch (_) { return null; } })();
    const s = sysOf(raw);
    calls.push({ url: req.url(), raw: raw || '', sys: s, marks: marks(s), bytes: (raw || '').length });
    if (marks(s) >= 2) return { content: fixtures.authorGrok.content };
    if (/SCENE-SPINE planner|SCENE planner/.test(s)) return { content: fixtures.scenePlanner.content };
    if (/BODY BIBLE/.test(s)) return { content: fixtures.pcBodyBible.content };
    return { content: '' };
  };
  ['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy'].forEach(p => gate.stub(p, stub));

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._processContinuationProposal === 'function', { timeout: 20000 });

  const prep = await page.evaluate((sc) => {
    const out = {};
    // EXPLICIT OPT-IN: the continuation schema is default OFF for release safety. A test runner
    // enables it deliberately; production never does.
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    window.state._starterId = 'starter_first_sacrifice';
    window.state.storyId = 'story-harvest-' + sc;
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._activeContinuationSeal = null;
    window.state.turnCount = 30;
    window.state._scenePosture = { '30': { hash: 'ph-harvest-30', choice: 'burn',
      action: 'I burn the Reach and ride north', dialogue: '' } };

    const julian = window._proposeNewEntity({ kind: 'named', label: 'Julian', aliases: ['the Provast'] });
    out.julianId = julian.ok ? julian.entity.id : null;

    const base = { scene_purpose: 'Bring an outside authority onto her.',
      forward_pressure: 'A body she has no standing with is now looking at her.',
      derivation: 'The player burned a settlement.' };

    if (sc === 'none') {
      // THE ENVELOPE IS NOW REQUIRED: a no-change continuation supplies a real purpose and
      // pressure with an explicit null change and an explicit empty introduces. Omitting the keys
      // entirely is an envelope VIOLATION, not a no-change scene — proven in
      // _continuation_envelope_control.mjs.
      out.res = window._processContinuationProposal(
        Object.assign({}, base, { canon_change: null, introduces: [] }), { scene: 30 });
    } else if (sc === 'tier2') {
      out.res = window._processContinuationProposal(Object.assign({}, base, {
        introduces: [{ kind: 'institution', label: 'the Reach Commission', aliases: ['the Commission'],
          justification: 'Governance able to investigate a razing.',
          future_relevance: 'It will summon her and shape the inquiry.' }],
        existingRefs: [],
        canon_change: { tier: 2, targets: ['the Reach Commission'],
          content: 'The Reach Commission opens an investigation into the burning of the Reach.' }
      }), { scene: 30 });
    } else {
      out.res = window._processContinuationProposal(Object.assign({}, base, {
        introduces: [], existingRefs: [out.julianId],
        canon_change: { tier: 3, targets: [out.julianId],
          content: 'Julian is stripped of the Provast office before the assembly.',
          basis: { kind: 'player_action', ref: 'ph-harvest-30',
            causal_chain: 'The reader’s burning forced the office to act against him.' } }
      }), { scene: 30 });
    }
    out.seal = window.state._activeContinuationSeal;
    // committed canon the NEXT planner should see: activate only in the 'delivered' scenario
    if (sc === 'tier2-delivered') {
      window._commitTransition(out.res.sealedId, 'scene30', 30);
      out.facts = window._ensureCommittedState().facts.map(f => f.fact);
    }
    return out;
  }, scenario === 'tier2-delivered' ? 'tier2' : scenario);

  if (scenario === 'tier2-delivered') {
    await page.evaluate(() => { window._commitTransition(window.state._activeContinuationSeal.sealedId, 'scene30', 30); });
  }

  // Pass the reader's REAL action/dialogue. An earlier version passed empty strings, so the
  // "player action reaches the planner" assertion failed on the harness rather than the code.
  await page.evaluate(async () => {
    try { await Promise.race([
      window._runCGScreenplayGen(1, 'I burn the Reach and ride north', 'Let them come for me.'),
      new Promise(r => setTimeout(r, 25000))]); } catch (_) {}
  });
  const facts = await page.evaluate(() => window._ensureCommittedState().facts.map(f => f.fact));
  await browser.close();

  const planner = calls.filter(c => /SCENE-SPINE planner|SCENE planner/.test(c.sys)).pop() || null;
  const author = calls.filter(c => c.marks >= 2).pop() || null;
  return { prep, planner, author, facts, callCount: calls.length, unstubbed: gate ? null : null };
};

console.log('=== CONTINUATION PROMPT HARVEST (no network, no model, $0) ===\n');

// ───────────────────────────────────────────── TIER 2
const h2 = await harvest('tier2');
console.log('TIER 2 — funnel reached ' + h2.callCount + ' stages; planner=' + (h2.planner ? h2.planner.bytes + 'B' : 'none')
  + ' author=' + (h2.author ? h2.author.bytes + 'B' : 'none'));

console.log('\nA. PREFLIGHT — the planner request carries the continuation contract');
t('a scene-spine planner request was assembled', !!h2.planner);
const P = h2.planner ? h2.planner.sys : '';
t('the CONTINUATION ENVELOPE schema is present', /CONTINUATION ENVELOPE \(REQUIRED/.test(P));
t('  it offers all six entity kinds',
  /named\|role\|artifact\|institution\|collective\|place/.test(P));
t('  it forbids planner-supplied ids', /NEVER supply an id/.test(P));
t('  it requires future_relevance on an addition', /future_relevance/.test(P));
t('  it defines Tier 2 vs Tier 3', /TIER 2 = additive/.test(P) && /TIER 3 = alters established canon/.test(P));
t('  it requires a Tier 3 basis', /TIER 3 ALSO REQUIRES "basis"/.test(P));
t('  it forbids presenting a protected change as additive',
  /may NOT be presented as additive/.test(P));
// UPDATED with the envelope redesign: omission is no longer offered, because the envelope is
// REQUIRED on every opt-in reply. The property that matters now is that a NULL change is declared
// normal, so the planner is never pressured to manufacture a durable fact.
t('  a null change is declared the NORMAL answer',
  /null is the NORMAL answer/.test(P) && /MOST SCENES ADVANCE PRESSURE WITHOUT CHANGING DURABLE CANON/.test(P));
t('  and manufacturing a change to fill the envelope is forbidden',
  /Do NOT invent a durable fact merely to fill the envelope/.test(P));
t('the event-slots contract is still present (unchanged)', /STRUCTURED EVENT HANDOFF/.test(P));

console.log('\nB. PREFLIGHT — the planner receives its decision inputs');
const PU = h2.planner ? h2.planner.raw : '';
t('the player\'s own action reaches the planner', /I burn the Reach and ride north/.test(PU),
  'posture action absent');
t('committed canon reaches the planner', /COMMITTED WORLD STATE/.test(PU));
t('issue/story scaffold pressure reaches the planner',
  /PRESSURE|pressureVectors|issuePressures|THESIS|thesis/i.test(PU));

console.log('\nC. the TIER 2 author payload carries ONLY reader-facing material');
t('a terminal author request was assembled', !!h2.author);
const A2 = h2.author ? h2.author.raw : '';
t('the sealed fact reaches the author',
  /The Reach Commission opens an investigation into the burning of the Reach\./.test(A2));
t('  under an already-true heading', /CONTINUATION — ALREADY TRUE/.test(A2));
t('  with the scene purpose', /This scene exists to: Bring an outside authority onto her\./.test(A2));
t('  and the forward pressure', /Forward pressure: A body she has no standing with/.test(A2));
FORBIDDEN_ANYWHERE.forEach(([name, rx]) => {
  const m = A2.match(rx);
  t('  NO ' + name + ' anywhere in the author payload', !m, m ? 'found "' + m[0] + '"' : '');
});
const B2 = blockOf(A2);
console.log('   continuation block (' + B2.length + 'B): ' + JSON.stringify(B2.slice(0, 100)));
t('  the continuation block was located', B2.length > 0);
FORBIDDEN_IN_BLOCK.forEach(([name, rx]) => {
  const m = B2.match(rx);
  t('  NO ' + name + ' in the continuation block', !m, m ? 'found "' + m[0] + '"' : '');
});
t('  the pending entity\'s own id never appears',
  !new RegExp(h2.prep.res.introduced[0].id).test(A2), h2.prep.res.introduced[0].id);
t('  no unproposed alternative appears', !/Hollow Assize|Northern Court/.test(A2));

console.log('\nD. a PENDING Tier 2 proposal is confined to its own path');
t('the pending entity is not in the active ledger yet (sealing wrote no fact)',
  h2.facts.length === 0, JSON.stringify(h2.facts));
t('the author carrier holds reader-facing fields only',
  Object.keys(h2.prep.seal.readerFacing).sort().join(',') === 'forward_pressure,scene_purpose',
  JSON.stringify(Object.keys(h2.prep.seal.readerFacing)));
t('  and carries no tier/targets/basis', !/tier|targets|basis/.test(JSON.stringify(h2.prep.seal)));

console.log('\nE. no post-prose verifier data leaks into either prompt');
// Field names unique to the verifier contract. The bare words DELIVERED/tableau are deliberately
// NOT tested whole-payload: both are pre-existing, unrelated app vocabulary (verified above).
const VERIFIER_LEAK = [['decisiveChange', /decisiveChange/], ['dominant_replacement', /dominant_replacement/],
  ['slots_check', /slots_check/], ['protagonistStatus', /protagonistStatus/],
  ['transition_position', /transition_position/], ['first_irreversible_position', /first_irreversible_position/]];
VERIFIER_LEAK.forEach(([name, rx]) => {
  t('planner payload has no ' + name, !rx.test(PU), (PU.match(rx) || [''])[0]);
  t('author payload has no ' + name, !rx.test(A2), (A2.match(rx) || [''])[0]);
});

// ───────────────────────────────────────────── NONE
const hN = await harvest('none');
console.log('\nF. NONE — no canon block, ordinary continuation preserved');
t('the proposal resolved to none', hN.prep.res.outcome === 'none', hN.prep.res.outcome);
t('  no seal carrier was set', hN.prep.seal === null);
const AN = hN.author ? hN.author.raw : '';
t('an author request was still assembled', !!hN.author);
t('  it carries NO continuation block', !/CONTINUATION — ALREADY TRUE/.test(AN));
t('  and no continuation fact text', !/Reach Commission opens an investigation/.test(AN));
t('  while ordinary author directives remain', hN.author && hN.author.marks >= 2,
  'marks=' + (hN.author && hN.author.marks));
t('  the ledger is empty', hN.facts.length === 0, JSON.stringify(hN.facts));

// ───────────────────────────────────────────── TIER 3
const h3 = await harvest('tier3');
console.log('\nG. TIER 3 — a protected change delivers its fact, never its basis');
t('the Tier 3 proposal sealed', h3.prep.res.outcome === 'sealed', JSON.stringify(h3.prep.res.why));
t('  derived as Tier 3', h3.prep.res.tier === 3, 'tier=' + h3.prep.res.tier);
const A3 = h3.author ? h3.author.raw : '';
t('the sealed fact reaches the author',
  /Julian is stripped of the Provast office before the assembly\./.test(A3));
t('  the posture hash does NOT', !/ph-harvest-30/.test(A3));
t('  the causal chain does NOT', !/forced the office to act against him/.test(A3));
t('  the basis kind does NOT', !/player_action/.test(A3));
t('  Julian\'s entity id does NOT', !new RegExp(h3.prep.julianId).test(A3), h3.prep.julianId);

// ───────────────────────────────────────── DELIVERED
const hD = await harvest('tier2-delivered');
console.log('\nH. DELIVERED — the exact active fact is what later planner context receives');
t('exactly one fact activated', hD.facts.length === 1, JSON.stringify(hD.facts));
t('  it is byte-identical to the sealed content',
  hD.facts[0] === 'The Reach Commission opens an investigation into the burning of the Reach.',
  hD.facts[0]);
const PD = hD.planner ? hD.planner.raw : '';
t('the planner\'s COMMITTED WORLD STATE carries that exact fact',
  PD.indexOf('The Reach Commission opens an investigation into the burning of the Reach.') >= 0);
t('  and carries no pending-entity id', !/ent:stage:/.test(PD), (PD.match(/ent:stage:\d+/) || [''])[0]);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
