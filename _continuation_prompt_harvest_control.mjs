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
  // PERSISTENCE vocabulary (2026-10-01). `pressure_scope` is a PLANNER-side declaration that
  // decides whether anything becomes canon. The author is told the scene's purpose and pressure
  // and nothing about the bookkeeping, so these strings must not appear in an author payload at
  // all. Verified unique to this machinery: no other app text produces them.
  ['persistence field names', /pressure_scope|scene_local|_sceneLocalPressures/],
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
      // IDENTITY, NOT COUNT. The ledger bootstraps PC/LI anchors and this prep already proposed
      // Julian, so "zero entities" is the wrong measure — a count delta has burned me twice.
      // Snapshot the register's exact id set and require it UNCHANGED across the proposal.
      const regBefore = Object.keys(window._protectedRegisterIds()).sort().join('|');
      out.res = window._processContinuationProposal(
        Object.assign({}, base, { pressure_scope: 'scene_local', canon_change: null, introduces: [] }), { scene: 30 });
      out.localRegisterUnchanged = Object.keys(window._protectedRegisterIds()).sort().join('|') === regBefore;
      out.localPressures = (window.state._sceneLocalPressures || [])
        .map(p => ({ scope: p.scope, durable: p.durable }));
    } else if (sc === 'tier2') {
      out.res = window._processContinuationProposal(Object.assign({}, base, {
        pressure_scope: 'durable',
        introduces: [{ kind: 'institution', label: 'the Reach Commission', aliases: ['the Commission'],
          justification: 'Governance able to investigate a razing.',
          future_relevance: 'It will summon her and shape the inquiry.' }],
        existingRefs: [],
        canon_change: { tier: 2, targets: ['the Reach Commission'],
          content: 'The Reach Commission opens an investigation into the burning of the Reach.' }
      }), { scene: 30 });
    } else {
      out.res = window._processContinuationProposal(Object.assign({}, base, {
        pressure_scope: 'durable',
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
t('  it demands ALL FIVE keys, every scene',
  /CONTINUATION ENVELOPE \(REQUIRED — all five keys, every scene\)/.test(P));
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

// ── HARVEST OF THE CONTRACT CHANGE (Roman 2026-10-01) ────────────────────────────────────────
// The Corridor run was a CONTRACT AMBIGUITY: the planner correctly identified a continuing
// pressure but the envelope gave it nowhere to say whether that referent is a deliberately
// unknown scene-local possibility or a continuing institution. `pressure_scope` closes that.
// Roman's gate: the change must be HARVESTED against the real assembled payload — the same
// evidence standard the envelope itself was held to — before any planner-only dispatch.
// Every assertion below reads the actual planner `sys` string that the funnel built, not the
// prompt-builder source.
console.log('\nA2. HARVEST — the PERSISTENCE distinction reaches the real planner payload');
t('pressure_scope is a REQUIRED envelope key',
  /"pressure_scope": "scene_local" or "durable" \(REQUIRED/.test(P));
t('  and it points at the PERSISTENCE section', /\(REQUIRED — see PERSISTENCE below\)/.test(P));
t('the PERSISTENCE section is present',
  /PERSISTENCE — the distinction that decides whether anything becomes canon:/.test(P));
t('  "scene_local" is defined as naming NO continuing referent',
  /"scene_local": forward_pressure names NO continuing referent/.test(P));
t('  with the planner\'s own Corridor phrasing as a legitimate example',
  /whoever governs this place will come/.test(P));
t('  explicitly called a legitimate, common answer',
  /deliberately unknown, and that is a legitimate/.test(P) && /common answer/.test(P));
t('  creating NO canon, unusable by later scenes',
  /It creates NO canon/.test(P) && /later scenes may NOT treat it as an existing thing/.test(P));
t('  "durable" is defined as depending on a CONTINUING identifiable referent',
  /"durable": the pressure depends on a CONTINUING identifiable actor, institution, faction, place/.test(P));
t('  which MUST be declared with kind, aliases and future_relevance',
  /MUST declare that referent in "introduces"/.test(P) && /kind, aliases and future_relevance/.test(P));
t('  and a durable pressure with an empty introduces is called invalid',
  /A durable pressure with an empty "introduces" is invalid/.test(P));
t('the rule that closes the leak is stated verbatim',
  /forward_pressure is NEVER a second canon channel/.test(P));
// ── THE PLAYER-NAMED-BODY RULE (Roman 2026-10-01), harvested against the real payload ─────────
// Live case C declared scene_local while branching into "the commission chambers". The contract
// said nothing about a body the PLAYER names, so this adds the rule and the harvest proves it
// arrives. No paid rerun until these assertions are green.
// Whitespace-NORMALISED view. The contract is hand-wrapped prose, so a regex that encodes where
// the line breaks fall tests my wrapping, not the rule's presence — and the `||` fallbacks I first
// wrote to cope with that made each assertion weaker than it looked. One normalisation, then every
// check below is a single strict match on the real assembled payload.
const Pn = P.replace(/\s+/g, ' ');
t('the PLAYER-NAMED-BODY rule is present',
  /A BODY THE PLAYER NAMES IS NOT CANON BY THAT ACT/.test(Pn));
t('  it grants the player the right to name one',
  /The reader may address or name a commission, council, court, house or office that canon does not yet contain/.test(Pn));
t('  while denying that this establishes it', /Their words do not establish it/.test(Pn));
t('  it offers exactly two explicit paths',
  /MUST choose one of exactly two paths, explicitly/.test(Pn)
  && /\(a\) ADOPT IT/.test(Pn) && /\(b\) KEEP IT PROVISIONAL/.test(Pn));
t('  path (a) requires kind, aliases and future_relevance',
  /\(a\) ADOPT IT — "pressure_scope": "durable", and declare it in "introduces" with kind, aliases and future_relevance/.test(Pn));
t('  path (b) forbids later treatment as established',
  /\(b\) KEEP IT PROVISIONAL — "pressure_scope": "scene_local"\. It is then NOT established, and no later scene may treat it as an existing entity/.test(Pn));
t('  path (b) is declared INVALID when the proposal relies on the body',
  /PATH \(b\) IS INVALID IF THIS PROPOSAL ITSELF RELIES ON THAT BODY PERSISTING/.test(Pn));
t('  naming the reliance fields exactly',
  /If your "branch_a", "branch_b", "exit_state" or "forward_pressure" assumes it will convene, respond, summon, hold, rule or still exist in a later scene/.test(Pn));
t('  and offering the no-change alternative as the other legal exit',
  /you must take path \(a\) — or return a coherent no-change alternative that does not depend on it at all/.test(Pn));
t('  the contradiction is named as rejectable',
  /Naming that body across several fields while declaring "scene_local" is a contradiction and will be rejected/.test(Pn));
// THE HYPOTHESIS FROM RUN 5, answered IN THE CONTRACT rather than assumed away: the planner may
// have read the no-invention rule as forbidding adoption. The contract now says it does not.
t('  adoption is explicitly distinguished from inventing a durable fact',
  /Adopting a body the PLAYER named is NOT "inventing a durable fact"/.test(Pn));
t('  and the no-invention rule is scoped to manufactured changes only',
  /forbids manufacturing a change the player's action did not make; it never asks you to decline structuring one the player's action actually requires/.test(Pn));
t('  LOWERCASE referents are named as continuing too, with case C\'s own words',
  /This applies in LOWERCASE too: "the commission", "the council", "their chambers", "its clerk" are continuing referents exactly as much as "the Reach Commission" is/.test(Pn));
t('  with the either/or spelled out',
  /Either it is unnamed and scene_local, or it is named and/.test(P) && /declared in introduces/.test(P));
t('the PERSISTENCE section sits INSIDE the envelope block (not appended elsewhere)',
  P.indexOf('PERSISTENCE — the distinction') > P.indexOf('CONTINUATION ENVELOPE (REQUIRED')
  && P.indexOf('PERSISTENCE — the distinction') < P.indexOf('MOST SCENES ADVANCE PRESSURE'),
  'env=' + P.indexOf('CONTINUATION ENVELOPE (REQUIRED') + ' pers=' + P.indexOf('PERSISTENCE — the distinction')
  + ' most=' + P.indexOf('MOST SCENES ADVANCE PRESSURE'));
t('the five envelope keys appear in contract order',
  (function () { var k = ['"scene_purpose"', '"forward_pressure"', '"pressure_scope"', '"canon_change"', '"introduces"'];
    var at = k.map(function (s) { return P.indexOf(s); });
    return at.every(function (n) { return n >= 0; })
      && at.every(function (n, i) { return i === 0 || n > at[i - 1]; }); })(),
  JSON.stringify(['"scene_purpose"', '"forward_pressure"', '"pressure_scope"', '"canon_change"', '"introduces"']
    .map(function (s) { return [s, P.indexOf(s)]; })));

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
// This is the route the live Corridor run actually took — a legitimate scene_local pressure. The
// scope declaration is planner bookkeeping; none of it may reach the author or the ledger.
FORBIDDEN_ANYWHERE.forEach(([name, rx]) => {
  const m = AN.match(rx);
  t('  NO ' + name + ' in the scene_local author payload', !m, m ? 'found "' + m[0] + '"' : '');
});
t('  the scene_local pressure was recorded as explicitly non-durable',
  hN.prep.localPressures && hN.prep.localPressures.length === 1
  && hN.prep.localPressures[0].scope === 'scene_local' && hN.prep.localPressures[0].durable === false,
  JSON.stringify(hN.prep.localPressures));
t('  and the protected register is byte-identical before and after',
  hN.prep.localRegisterUnchanged === true);

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
