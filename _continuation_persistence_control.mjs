// CONTINUATION PERSISTENCE CONTROL. Provider-free, no network, no model calls, $0.
//
// THE CONTRACT AMBIGUITY THIS CLOSES. The live Corridor run was not model disobedience: the planner
// correctly identified a new pressure — "will draw pursuit or response from whoever governs the
// toll" — but the envelope gave it nowhere to say whether that governing body is a deliberately
// unknown scene-local possibility or a CONTINUING institution. Both are legitimate; only the
// second may become canon. So `pressure_scope` now makes persistence explicit.
//
// Four fixtures, exactly the cases Roman specified:
//   1. an UNNAMED toll authority as legitimate scene-local pressure        → accepted, no canon
//   2. "establish the toll authority as a continuing institution"          → requires introduces[]
//   3. a durable institution named ONLY in forward_pressure                → rejected
//   4. a later proposal reusing an unnamed prior pressure as an entity     → rejected
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._validateContinuationProposal === 'function', { timeout: 20000 });

console.log('=== CONTINUATION PERSISTENCE (no network, no model, $0) ===\n');

const r = await page.evaluate(() => {
  const out = {};
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  delete window.state._starterId;
  window.state.storyId = 'story-persistence';
  window.state.playerName = 'Wren';
  window.state.loveInterestName = 'Cassel';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._sceneLocalPressures = null;
  window.state.turnCount = 6;
  window.state._scenePosture = { '6': { hash: 'ph-persist-6' } };
  const facts = () => window._ensureCommittedState().facts;
  const ents = () => (window.state._relationshipLedger || { entities: {} }).entities;

  const base = { scene_purpose: 'Stage the first irreversible act of rebellion against local authority.' };

  // ── 1. UNNAMED scene-local pressure — the exact shape the live planner produced
  out.one = window._processContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'The visible fire and spoken challenge will draw pursuit or response from whoever governs the toll.',
    pressure_scope: 'scene_local', canon_change: null, introduces: []
  }), { scene: 6 });
  out.oneFacts = facts().length;
  out.oneEnts = Object.keys(ents()).length;
  out.oneRecorded = (window.state._sceneLocalPressures || []).map(p => ({ scope: p.scope, durable: p.durable }));
  out.oneRegister = Object.keys(window._protectedRegisterIds()).length;

  // ── 2. DURABLE pressure with an EMPTY introduces — invalid
  out.twoMissing = window._validateContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'The Toll Assembly will convene over the burning and summon her by name.',
    pressure_scope: 'durable', canon_change: null, introduces: []
  }));
  // ── 2b. the same pressure, correctly declared
  window.state.turnCount = 7;
  window.state._scenePosture['7'] = { hash: 'ph-persist-7' };
  out.twoOk = window._processContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'The Toll Assembly will convene over the burning and summon her by name.',
    pressure_scope: 'durable', derivation: 'The player burned the toll-house.',
    introduces: [{ kind: 'institution', label: 'the Toll Assembly', aliases: ['the Assembly'],
      justification: 'The body with jurisdiction over the toll road.',
      future_relevance: 'It will summon her and set the terms of her answer.' }],
    existingRefs: [],
    canon_change: { tier: 2, targets: ['the Toll Assembly'],
      content: 'The Toll Assembly convenes over the burning of the toll-house.' }
  }), { scene: 7 });
  out.twoSealed = out.twoOk.sealedId ? window._resolveSealedProposal(out.twoOk.sealedId) : null;
  out.twoPendingIds = out.twoSealed ? (out.twoSealed.pendingEntities || []).map(e => e.id) : [];

  // ── 3. A DURABLE INSTITUTION NAMED ONLY IN forward_pressure, claimed scene_local
  out.three = window._validateContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'The Reach Commission will open an investigation into the burning within the week.',
    pressure_scope: 'scene_local', canon_change: null, introduces: []
  }));
  // 3b. the unnamed phrasing of the SAME idea must still pass
  out.threeUnnamed = window._validateContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'Someone with authority over the road will open an inquiry within the week.',
    pressure_scope: 'scene_local', canon_change: null, introduces: []
  }));
  // 3c. naming an ALREADY ESTABLISHED entity is allowed (reference, not creation)
  const cassel = window._proposeNewEntity({ kind: 'named', label: 'Cassel', aliases: ['the ferryman'] });
  out.casselId = cassel.ok ? cassel.entity.id : null;
  out.threeEstablished = window._validateContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'Cassel will have heard the bell by now and will be waiting at the ferry.',
    pressure_scope: 'scene_local', canon_change: null, introduces: []
  }));

  // ── 4. A LATER proposal reusing the UNNAMED prior pressure as an existing entity
  window.state.turnCount = 8;
  window.state._scenePosture['8'] = { hash: 'ph-persist-8' };
  // ISOLATION: persistence is checked BEFORE reference resolution and returns early, so this
  // fixture must SATISFY persistence (a declared referent) for the bad existingRefs to be the only
  // violation. An earlier version left introduces empty and so tripped the persistence check
  // instead, passing for the wrong reason.
  out.fourByRef = window._validateContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'They move against her.', pressure_scope: 'durable',
    derivation: 'd',
    introduces: [{ kind: 'institution', label: 'the River Court', justification: 'j', future_relevance: 'f' }],
    existingRefs: ['whoever governs the toll'],
    canon_change: { tier: 2, targets: ['the River Court'], content: 'c' } }));
  out.fourByTarget = window._validateContinuationProposal(Object.assign({}, base, {
    forward_pressure: 'They move against her.', pressure_scope: 'durable',
    derivation: 'd',
    introduces: [{ kind: 'institution', label: 'something else', justification: 'j', future_relevance: 'f' }],
    existingRefs: [],
    canon_change: { tier: 3, targets: ['whoever governs the toll'], content: 'c' } }));
  // the unnamed pressure never became resolvable
  out.fourResolvable = window._deliveryAnchorAliases('whoever governs the toll').ok;
  out.fourInRegister = Object.keys(window._protectedRegisterIds())
    .some(id => /governs the toll/i.test(String(window._protectedRegisterIds()[id].label || '')));
  return out;
});

await browser.close();

console.log('1. UNNAMED toll authority — legitimate scene-local pressure');
t('accepted as a no-change continuation', r.one.outcome === 'none', JSON.stringify(r.one));
t('  recorded as scene_local', r.one.outcome === 'none' && r.oneRecorded.length === 1
  && r.oneRecorded[0].scope === 'scene_local', JSON.stringify(r.oneRecorded));
t('  explicitly marked NOT durable', r.oneRecorded[0] && r.oneRecorded[0].durable === false);
t('  no fact, no entity, nothing in the register',
  r.oneFacts === 0 && r.oneEnts === 0 && r.oneRegister === 0,
  'facts=' + r.oneFacts + ' ents=' + r.oneEnts + ' register=' + r.oneRegister);

console.log('\n2. DURABLE pressure must declare its continuing referent');
t('durable + empty introduces is REJECTED', r.twoMissing.ok === false, JSON.stringify(r.twoMissing));
t('  flagged as a persistence violation', r.twoMissing.persistenceViolation === true);
t('  the reason names the requirement',
  JSON.stringify(r.twoMissing.why).indexOf('requires the continuing referent to be identified') >= 0,
  JSON.stringify(r.twoMissing.why));
t('the same pressure WITH a declared institution seals', r.twoOk.outcome === 'sealed',
  JSON.stringify(r.twoOk.why));
t('  as Tier 2', r.twoOk.tier === 2, 'tier=' + r.twoOk.tier);
t('  with a pending backend-minted id', r.twoPendingIds.length === 1
  && /^ent:stage:\d+$/.test(r.twoPendingIds[0]), JSON.stringify(r.twoPendingIds));

console.log('\n3. forward_pressure is never a second canon channel');
t('a durable institution named ONLY in forward_pressure is REJECTED', r.three.ok === false,
  JSON.stringify(r.three));
t('  flagged as a persistence violation', r.three.persistenceViolation === true);
t('  the reason names the undeclared referent',
  JSON.stringify(r.three.why).indexOf('Reach Commission') >= 0, JSON.stringify(r.three.why));
t('  and says forward_pressure is never a second canon channel',
  JSON.stringify(r.three.why).indexOf('never a second canon channel') >= 0);
t('the UNNAMED phrasing of the same idea still passes', r.threeUnnamed.ok === true,
  JSON.stringify(r.threeUnnamed.why));
t('naming an ALREADY ESTABLISHED entity is allowed', r.threeEstablished.ok === true,
  JSON.stringify(r.threeEstablished.why));

console.log('\n4. an unnamed prior pressure cannot be reused as an entity');
t('referencing it via existingRefs is REJECTED', r.fourByRef.ok === false);
t('  because it does not resolve',
  JSON.stringify(r.fourByRef.why).indexOf('does not resolve') >= 0, JSON.stringify(r.fourByRef.why));
t('targeting it in canon_change is REJECTED', r.fourByTarget.ok === false);
t('  because it is neither established nor declared here',
  JSON.stringify(r.fourByTarget.why).indexOf('neither an established entity nor declared') >= 0,
  JSON.stringify(r.fourByTarget.why));
t('it never became resolvable as canon', r.fourResolvable === false);
t('it never entered the protected register', r.fourInRegister === false);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
