// CONTINUATION FLAG GATE CONTROL. Provider-free, no network, no model calls, $0.
//
// RELEASE SAFETY. The continuation schema can cause DYNAMIC CANON PROPOSALS, so it must not be
// live before a funded live evaluation of planner behaviour. It is EXPLICIT OPT-IN:
// `window._continuationProposalSchema === true`. Undefined means the existing planner contract.
//
// Both directions are proven in ONE run, deliberately, so the pair cannot drift apart:
//   A. PRODUCTION DEFAULT (flag untouched) — a planner reply carrying proposal-shaped fields
//      cannot be received, sealed, activated or delivered, and the planner prompt is unchanged.
//   B. EXPLICIT OPT-IN — the schema reaches the planner and the sealed material reaches the author.
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

// A planner reply that DOES carry proposal-shaped fields. Under production defaults every one of
// them must be inert.
const PROPOSAL_SHAPED = {
  scene_purpose: 'Bring an outside authority onto her.',
  forward_pressure: 'A body she has no standing with is looking at her.',
  derivation: 'The player burned a settlement.',
    pressure_scope: 'durable',
  introduces: [{ kind: 'institution', label: 'the Reach Commission', aliases: ['the Commission'],
    justification: 'Governance able to investigate a razing.',
    future_relevance: 'It will summon her and shape the inquiry.' }],
  existingRefs: [],
  canon_change: { tier: 2, targets: ['the Reach Commission'],
    content: 'The Reach Commission opens an investigation into the burning of the Reach.' }
};

const run = async (optIn) => {
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

  const out = await page.evaluate(({ optIn, reply }) => {
    const o = {};
    window.state = window.state || {};
    // PRODUCTION DEFAULT PATH deliberately does NOT touch the flag at all.
    if (optIn) window._continuationProposalSchema = true;
    o.flagValue = String(window._continuationProposalSchema);
    o.enabled = window._continuationSchemaEnabled();

    window.state._starterId = 'starter_first_sacrifice';
    window.state.storyId = 'story-flag-' + (optIn ? 'optin' : 'default');
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._activeContinuationSeal = null;
    window.state.turnCount = 40;
    window.state._scenePosture = { '40': { hash: 'ph-flag-40', choice: 'burn',
      action: 'I burn the Reach and ride north', dialogue: '' } };

    const entBefore = Object.keys((window.state._relationshipLedger || { entities: {} }).entities).length;
    o.res = window._processContinuationProposal(reply, { scene: 40 });
    o.seal = window.state._activeContinuationSeal;
    o.facts = window._ensureCommittedState().facts.map(f => f.fact);
    o.sealedCount = Object.keys((window.state._sealedProposals || { byId: {} }).byId).length;
    o.entAfter = Object.keys((window.state._relationshipLedger || { entities: {} }).entities).length;
    o.entDelta = o.entAfter - entBefore;
    o.commissionResolvable = window._deliveryAnchorAliases('the Reach Commission').ok;
    // PRECISE property: is the PENDING entity's own id in the active ledger? A raw entity-count
    // delta is the wrong measure — _relLedger(true) bootstraps the PC/LI anchors, so minting
    // pending ids legitimately grows the ledger by 2 without admitting anything proposed.
    const ents = (window.state._relationshipLedger || { entities: {} }).entities;
    o.pendingIds = (o.res.introduced || []).map(e => e.id);
    o.pendingIdsInLedger = o.pendingIds.filter(id => !!ents[id]);
    o.ledgerKinds = Object.keys(ents).map(k => ents[k].kind).sort();
    // try to activate whatever may exist — must be impossible when disabled
    o.activateAttempt = o.res.sealedId ? !!window._commitTransition(o.res.sealedId, 'flag', 40) : false;
    o.factsAfterActivate = window._ensureCommittedState().facts.map(f => f.fact);
    return o;
  }, { optIn, reply: PROPOSAL_SHAPED });

  await page.evaluate(async () => {
    try { await Promise.race([
      window._runCGScreenplayGen(1, 'I burn the Reach and ride north', 'Let them come.'),
      new Promise(r => setTimeout(r, 25000))]); } catch (_) {}
  });
  await browser.close();

  const planner = calls.filter(c => /SCENE-SPINE planner|SCENE planner/.test(c.sys)).pop() || null;
  const author = calls.filter(c => c.marks >= 2).pop() || null;
  return { out, plannerSys: planner ? planner.sys : '', authorRaw: author ? author.raw : '',
    hasPlanner: !!planner, hasAuthor: !!author };
};

console.log('=== CONTINUATION FLAG GATE (no network, no model, $0) ===\n');

// ───────────────────────────────── A. PRODUCTION DEFAULT
const D = await run(false);
console.log('A. PRODUCTION DEFAULT — flag untouched (value: ' + D.out.flagValue + ')');
t('the flag is undefined', D.out.flagValue === 'undefined', D.out.flagValue);
t('_continuationSchemaEnabled() is false', D.out.enabled === false);

console.log('\n   a proposal-shaped reply is INERT');
t('the handler reports disabled', D.out.res.disabled === true, JSON.stringify(D.out.res));
t('  outcome is none', D.out.res.outcome === 'none', D.out.res.outcome);
t('  NOTHING was sealed', D.out.res.sealedId === null && D.out.sealedCount === 0,
  'sealedId=' + D.out.res.sealedId + ' count=' + D.out.sealedCount);
t('  NO entity was minted', D.out.entDelta === 0, 'delta=' + D.out.entDelta);
t('  the institution is not resolvable', D.out.commissionResolvable === false);
t('  NO author carrier was set', D.out.seal === null);
t('  the ledger is empty', D.out.facts.length === 0, JSON.stringify(D.out.facts));
t('  activation was not even possible', D.out.activateAttempt === false);
t('  the ledger is still empty after the attempt', D.out.factsAfterActivate.length === 0,
  JSON.stringify(D.out.factsAfterActivate));

console.log('\n   the PROMPTS are unchanged');
t('a planner request was assembled', D.hasPlanner === true);
t('  it carries NO continuation schema', !/CONTINUATION ENVELOPE \(REQUIRED/.test(D.plannerSys),
  'schema present under default');
t('  the pre-existing event-slots contract is intact', /STRUCTURED EVENT HANDOFF/.test(D.plannerSys));
t('an author request was assembled', D.hasAuthor === true);
t('  it carries NO continuation block', !/CONTINUATION — ALREADY TRUE/.test(D.authorRaw));
t('  and no proposal fact text', !/Reach Commission opens an investigation/.test(D.authorRaw));

// ───────────────────────────────── B. EXPLICIT OPT-IN
const O = await run(true);
console.log('\nB. EXPLICIT OPT-IN — flag set to true by the runner');
t('_continuationSchemaEnabled() is true', O.out.enabled === true);
t('the same reply now SEALS', O.out.res.outcome === 'sealed', JSON.stringify(O.out.res.why));
t('  one proposal exists', O.out.sealedCount === 1, 'count=' + O.out.sealedCount);
console.log('   ledger kinds after mint: ' + JSON.stringify(O.out.ledgerKinds)
  + ' (PC/LI anchors are bootstrapped by _relLedger(true), not proposed)');
t('  the pending entity is NOT in the active ledger',
  O.out.pendingIds.length === 1 && O.out.pendingIdsInLedger.length === 0,
  'pending=' + JSON.stringify(O.out.pendingIds) + ' inLedger=' + JSON.stringify(O.out.pendingIdsInLedger));
t('  and not yet resolvable as active canon', O.out.commissionResolvable === false);
t('  the author carrier IS set', !!O.out.seal && !!O.out.seal.sealedId);
t('  sealing wrote no fact', O.out.facts.length === 0, JSON.stringify(O.out.facts));

console.log('\n   the schema and author boundary are reached');
t('the planner carries the continuation schema',
  /CONTINUATION ENVELOPE \(REQUIRED/.test(O.plannerSys));
t('  with all six entity kinds', /named\|role\|artifact\|institution\|collective\|place/.test(O.plannerSys));
t('  and the Tier 3 basis requirement', /TIER 3 ALSO REQUIRES "basis"/.test(O.plannerSys));
t('the author carries the sealed fact',
  /The Reach Commission opens an investigation into the burning of the Reach\./.test(O.authorRaw));
t('  under the already-true heading', /CONTINUATION — ALREADY TRUE/.test(O.authorRaw));
t('  and still no entity id', !/ent:stage:\d+/.test(O.authorRaw),
  (O.authorRaw.match(/ent:stage:\d+/) || [''])[0]);
t('  and still no posture hash', !/ph-flag-40/.test(O.authorRaw));

console.log('\nC. the two directions genuinely differ');
t('the planner schema is present ONLY under opt-in',
  /CONTINUATION ENVELOPE/.test(O.plannerSys) && !/CONTINUATION ENVELOPE/.test(D.plannerSys));
t('the author block is present ONLY under opt-in',
  /CONTINUATION — ALREADY TRUE/.test(O.authorRaw) && !/CONTINUATION — ALREADY TRUE/.test(D.authorRaw));
t('sealing happens ONLY under opt-in', O.out.sealedCount === 1 && D.out.sealedCount === 0);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
