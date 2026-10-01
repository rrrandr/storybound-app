// PENDING-VS-ACTIVE ENTITY BOUNDARY CONTROL. Provider-free, no network, no model calls, $0.
//
// THE CONTRADICTION THIS FIXES: slice 1 claimed sealing writes no fact and activation is separate,
// yet also that a newly introduced entity becomes protected "the instant it seals". Both cannot
// hold if the protected register derives from ACTIVE canon — an entity the reader never saw would
// constrain future planning. The earlier control asserted the protected-at-seal claim and so
// PROVED the bug as if it were a feature.
//
// THE POLICY NOW ENFORCED:
//   sealed            pending entities live on the sealed proposal only — its author/retry/delivery
//   before activation NOT in the active ledger, NOT protected, NOT referenceable by later planning
//   on DELIVERED      admitted once, with their sealed ids; protected immediately thereafter
//   on MISSED/reject  never active, never protected; survive only with the proposal for recovery
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._sealProposal === 'function', { timeout: 20000 });

console.log('=== PENDING vs ACTIVE ENTITY BOUNDARY (no network, no model, $0) ===\n');
const ok = await page.evaluate(() => typeof window._processContinuationProposal === 'function'
  && typeof window._protectedRegisterIds === 'function');
t('the continuation slice is installed', ok === true);
if (!ok) { await browser.close(); console.log('\n' + pass + '/' + (pass + fail) + ' passed'); process.exit(1); }

const r = await page.evaluate(() => {
  const out = {};
  // EXPLICIT OPT-IN: the continuation schema is default OFF for release safety. A test runner
  // enables it deliberately; production never does.
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  window.state.storyId = 'story-pending-boundary';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;

  const julian = window._proposeNewEntity({ kind: 'named', label: 'Julian', aliases: ['the Provast'] });
  out.julianId = julian.ok ? julian.entity.id : null;
  const regCount = () => Object.keys(window._protectedRegisterIds()).length;
  const entCount = () => Object.keys((window.state._relationshipLedger || { entities: {} }).entities).length;
  const facts = () => window._ensureCommittedState().facts;

  const reply = (scene) => ({
    scene_purpose: 'Bring an outside authority onto her.',
    forward_pressure: 'A body she has no standing with is looking at her.',
    derivation: 'The player burned a settlement.',
    pressure_scope: 'durable',
    introduces: [
      { kind: 'institution', label: 'the Reach Commission', aliases: ['the Commission'],
        justification: 'Governance able to investigate a razing.',
        future_relevance: 'It will summon her and shape the inquiry.' },
      { kind: 'place', label: 'Aeryn’s Reach', aliases: ['the Reach'],
        justification: 'The settlement burned.', future_relevance: 'Its ruin is the evidence.' }
    ],
    existingRefs: [],
    canon_change: { tier: 2, targets: ['the Reach Commission'],
      content: 'The Reach Commission opens an investigation into the burning of Aeryn’s Reach.' }
  });

  // ══ 1. SEALED, NOT YET DELIVERED ══════════════════════════════════════
  window.state.turnCount = 20;
  window.state._scenePosture = { '20': { hash: 'ph-burn-20' } };
  out.regBeforeSeal = regCount(); out.entBeforeSeal = entCount();
  out.sealed = window._processContinuationProposal(reply(20), { scene: 20 });
  out.regAfterSeal = regCount(); out.entAfterSeal = entCount();
  out.factsAfterSeal = facts().length;

  const pendIds = out.sealed.introduced.map(e => e.id);
  out.pendIds = pendIds;
  // the sealed record carries them as pending
  const rec = window._resolveSealedProposal(out.sealed.sealedId);
  out.recPendingCount = (rec.pendingEntities || []).length;
  out.recPendingFrozen = Object.isFrozen(rec.pendingEntities);

  // (a) the DELIVERY path CAN resolve them (scoped to this proposal)
  const prose = 'Riders of the Commission were on the north road before the smoke thinned, and word '
    + 'came back that the Reach would be looked into.';
  out.deliveryAnchors = window._checkDeliveryAnchors(out.sealed.sealedId, prose, []);

  // (b) the ACTIVE resolver CANNOT see them (no pending argument)
  out.activeSeesCommission = window._deliveryAnchorAliases('the Reach Commission');
  out.activeSeesById = window._deliveryAnchorAliases(pendIds[0]);
  out.pendingInRegister = pendIds.filter(id => !!window._protectedRegisterIds()[id]);

  // (c) a LATER proposal cannot use a pending id as an existing reference
  out.laterRefAttempt = window._validateContinuationProposal({
    scene_purpose: 'x', forward_pressure: 'y', derivation: 'z',
    pressure_scope: 'durable',
    introduces: [], existingRefs: [pendIds[0]],
    canon_change: { tier: 2, targets: [pendIds[0]], content: 'c' } });

  // ══ 4. RETRY reuses the same pending entities and ids ═════════════════
  out.retry = window._processContinuationProposal(reply(20), { scene: 20 });
  out.retrySameSeal = out.retry.sealedId === out.sealed.sealedId;
  out.retrySameIds = JSON.stringify(out.retry.introduced.map(e => e.id)) === JSON.stringify(pendIds);
  out.entAfterRetry = entCount();
  out.sealedCountAfterRetry = Object.keys(window.state._sealedProposals.byId).length;

  // ══ 2. DELIVERED ACTIVATION ══════════════════════════════════════════
  out.activated = !!window._commitTransition(out.sealed.sealedId, 'scene20', 20);
  out.regAfterActivate = regCount(); out.entAfterActivate = entCount();
  out.activeSeesCommissionAfter = window._deliveryAnchorAliases('the Reach Commission');
  out.pendingInRegisterAfter = pendIds.filter(id => !!window._protectedRegisterIds()[id]);
  // now referenceable by later planning
  out.laterRefAfter = window._validateContinuationProposal({
    scene_purpose: 'x', forward_pressure: 'y', derivation: 'z',
    pressure_scope: 'durable',
    introduces: [], existingRefs: [pendIds[0]],
    canon_change: { tier: 3, targets: [pendIds[0]],
      content: 'The Commission is dissolved.',
      basis: { kind: 'player_action', ref: 'ph-burn-20', causal_chain: 'c' } } });
  // double activation must not duplicate the entities
  window._commitTransition(out.sealed.sealedId, 'scene20', 20);
  out.entAfterDoubleActivate = entCount();

  // ══ 3. MISSED / REJECTED DELIVERY ════════════════════════════════════
  window.state.turnCount = 21;
  window.state._scenePosture['21'] = { hash: 'ph-missed-21' };
  const missedReply = reply(21);
  missedReply.introduces = [{ kind: 'institution', label: 'the Hollow Assize',
    aliases: ['the Assize'], justification: 'j', future_relevance: 'f' }];
  missedReply.canon_change = { tier: 2, targets: ['the Hollow Assize'],
    content: 'The Hollow Assize convenes over the ruin.' };
  out.missedSealed = window._processContinuationProposal(missedReply, { scene: 21 });
  const missedId = out.missedSealed.introduced[0].id;
  out.missedPendingId = missedId;
  // prose that does NOT name it → anchors missing → no activation
  out.missedAnchors = window._checkDeliveryAnchors(out.missedSealed.sealedId,
    'She sat with the ash on her hands and nobody came at all that night.', []);
  out.missedActivated = (out.missedAnchors.verdict === 'anchor_missing')
    ? false : !!window._commitTransition(out.missedSealed.sealedId, 'scene21', 21);
  out.missedInRegister = !!window._protectedRegisterIds()[missedId];
  out.missedInLedger = !!(window.state._relationshipLedger.entities[missedId]);
  out.missedSealSurvives = !!window._resolveSealedProposal(out.missedSealed.sealedId);
  // and it must NOT block a later GENUINE introduction of the same name
  window.state.turnCount = 22;
  window.state._scenePosture['22'] = { hash: 'ph-genuine-22' };
  const genuine = reply(22);
  genuine.introduces = [{ kind: 'institution', label: 'the Hollow Assize',
    aliases: ['the Assize'], justification: 'j2', future_relevance: 'f2' }];
  genuine.canon_change = { tier: 2, targets: ['the Hollow Assize'],
    content: 'The Hollow Assize convenes at last.' };
  out.genuineLater = window._validateContinuationProposal(genuine);

  out.finalFactTexts = facts().map(f => f.fact);
  return out;
});

await browser.close();

console.log('\n1. SEALED BUT NOT DELIVERED — pending is invisible to active canon');
t('the proposal sealed', r.sealed.outcome === 'sealed', JSON.stringify(r.sealed.why));
t('two pending entities ride on the sealed record', r.recPendingCount === 2, 'count=' + r.recPendingCount);
t('  and they are frozen with it', r.recPendingFrozen === true);
t('the ACTIVE ledger did NOT grow', r.entAfterSeal === r.entBeforeSeal,
  r.entBeforeSeal + ' → ' + r.entAfterSeal);
t('the protected register did NOT grow', r.regAfterSeal === r.regBeforeSeal,
  r.regBeforeSeal + ' → ' + r.regAfterSeal);
t('no pending id is in the protected register', r.pendingInRegister.length === 0,
  JSON.stringify(r.pendingInRegister));
t('sealing wrote no fact', r.factsAfterSeal === 0, 'facts=' + r.factsAfterSeal);
console.log('   delivery anchors (scoped to this proposal): ' + r.deliveryAnchors.verdict);
t('the DELIVERY path CAN resolve its own pending entities',
  r.deliveryAnchors.verdict === 'anchors_present', JSON.stringify(r.deliveryAnchors.why));
t('the ACTIVE resolver cannot see them by name', r.activeSeesCommission.ok === false,
  JSON.stringify(r.activeSeesCommission));
t('the ACTIVE resolver cannot see them by id', r.activeSeesById.ok === false,
  JSON.stringify(r.activeSeesById));
t('a LATER proposal cannot use a pending id as an existingRef', r.laterRefAttempt.ok === false);
t('  and the rejection says it does not resolve',
  JSON.stringify(r.laterRefAttempt.why).indexOf('does not resolve') >= 0,
  JSON.stringify(r.laterRefAttempt.why));

console.log('\n4. RETRY reuses the same pending entities — no duplicate ids');
t('the retry returns the SAME sealed record', r.retrySameSeal === true);
t('  with the SAME pending ids', r.retrySameIds === true, JSON.stringify(r.pendIds));
t('  the active ledger still did not grow', r.entAfterRetry === r.entBeforeSeal,
  r.entBeforeSeal + ' → ' + r.entAfterRetry);
t('  and only one proposal exists', r.sealedCountAfterRetry === 1, 'sealed=' + r.sealedCountAfterRetry);

console.log('\n2. DELIVERED ACTIVATION — admitted once, then protected');
t('activation occurred', r.activated === true);
t('the entities entered the active ledger', r.entAfterActivate === r.entBeforeSeal + 2,
  r.entBeforeSeal + ' → ' + r.entAfterActivate);
t('the protected register grew by exactly two', r.regAfterActivate === r.regBeforeSeal + 2,
  r.regBeforeSeal + ' → ' + r.regAfterActivate);
t('both pending ids are NOW protected', r.pendingInRegisterAfter.length === 2,
  JSON.stringify(r.pendingInRegisterAfter));
t('the active resolver now sees it by name', r.activeSeesCommissionAfter.ok === true);
t('  with its sealed id preserved', r.activeSeesCommissionAfter.entityId === r.pendIds[0],
  r.activeSeesCommissionAfter.entityId + ' vs ' + r.pendIds[0]);
t('a later proposal CAN now reference it', r.laterRefAfter.ok === true, JSON.stringify(r.laterRefAfter.why));
t('  and altering it is derived as Tier 3', r.laterRefAfter.tier === 3, 'tier=' + r.laterRefAfter.tier);
t('double activation does NOT duplicate the entities',
  r.entAfterDoubleActivate === r.entAfterActivate,
  r.entAfterActivate + ' → ' + r.entAfterDoubleActivate);

console.log('\n3. MISSED DELIVERY — never active, never protected, never blocking');
t('the missed proposal sealed', r.missedSealed.outcome === 'sealed');
t('its anchors are missing from the prose', r.missedAnchors.verdict === 'anchor_missing',
  r.missedAnchors.verdict);
t('it was NOT activated', r.missedActivated === false);
t('its entity is NOT in the active ledger', r.missedInLedger === false);
t('its entity is NOT protected', r.missedInRegister === false);
t('the sealed proposal survives for recovery', r.missedSealSurvives === true);
t('and it does NOT block a later GENUINE introduction of the same name',
  r.genuineLater.ok === true, JSON.stringify(r.genuineLater.why));

console.log('\nLEDGER CONTENTS');
console.log('   ' + JSON.stringify(r.finalFactTexts));
t('exactly one fact was ever activated', r.finalFactTexts.length === 1,
  'facts=' + r.finalFactTexts.length);
t('  and no Hollow Assize text reached it',
  !r.finalFactTexts.some(x => /Hollow Assize/.test(x)));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
