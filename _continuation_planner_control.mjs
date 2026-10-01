// UNIVERSAL CONTINUATION-PLANNER SLICE 1 CONTROL. Provider-free, no network, no model calls, $0.
//
// Proves one safe universal path end to end:
//   player action → proposed change → validate → system-mint/seal (BEFORE prose) → render →
//   delivery verification → activate only the exact sealed record
//
// Three complete paths, with shape-faithful planner-reply fixtures:
//   TIER 2 — Aeryn's Reach investigation introduced, without redefining Julian or his office
//   TIER 3 — a player action explicitly proposes a protected change; the same change WITHOUT a
//            valid causal basis is rejected
//   NONE   — ordinary continuation writes no canon, and prose cannot create a record afterwards
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._sealProposal === 'function', { timeout: 20000 });

const installed = await page.evaluate(() => ({
  proc: typeof window._processContinuationProposal,
  val: typeof window._validateContinuationProposal,
  block: typeof window._continuationAuthorBlock
}));
console.log('=== CONTINUATION PLANNER — SLICE 1 (no network, no model, $0) ===\n');
console.log('INSTALLATION');
t('_processContinuationProposal installed', installed.proc === 'function', 'typeof=' + installed.proc);
t('_validateContinuationProposal installed', installed.val === 'function', 'typeof=' + installed.val);
t('_continuationAuthorBlock installed', installed.block === 'function', 'typeof=' + installed.block);
if (Object.values(installed).some(x => x !== 'function')) {
  console.log('\n  the continuation planner slice is NOT installed — no path below is provable.');
  await browser.close(); console.log('\n' + pass + '/' + (pass + fail) + ' passed'); process.exit(1);
}

const r = await page.evaluate(() => {
  const out = {};
  // EXPLICIT OPT-IN: the continuation schema is default OFF for release safety. A test runner
  // enables it deliberately; production never does.
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  window.state.storyId = 'story-continuation-slice1';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._fscCompiled = [];

  // ── ESTABLISHED CANON: Julian (Provast) and his office, registered the real way.
  const julian = window._proposeNewEntity({ kind: 'named', label: 'Julian', aliases: ['the Provast'] });
  const office = window._proposeNewEntity({ kind: 'role', label: 'Provast' });
  out.julianId = julian.ok ? julian.entity.id : null;
  out.officeId = office.ok ? office.entity.id : null;
  out.registerBefore = Object.keys(window._protectedRegisterIds()).length;

  // the reader's own action, hashed BEFORE any of this runs
  window.state.turnCount = 12;
  window.state._scenePosture = { '12': { hash: 'ph-burned-village', choice: 'burn',
    action: 'I burn the village and ride for the Reach', dialogue: '' } };

  const facts = () => window._ensureCommittedState().facts;

  // ══════════════════════════════════════════════════════════════════════
  // PATH 1 — TIER 2: a new institution, introduced without touching Julian
  // ══════════════════════════════════════════════════════════════════════
  const tier2Reply = {
    scene_purpose: 'Bring the consequence of the burning back onto Lirael from outside the college.',
    forward_pressure: 'An authority she has no standing with is now looking at her.',
    derivation: 'The player burned a settlement; a body with jurisdiction over the Reach would act.',
    introduces: [
      { kind: 'institution', label: "the Reach Commission", aliases: ['the Commission'],
        justification: 'A governance body for Aeryn’s Reach that can investigate a razing.',
        future_relevance: 'It will summon her, and its findings will shape the inquiry.' },
      { kind: 'place', label: "Aeryn’s Reach", aliases: ['the Reach'],
        justification: 'The settlement that was burned.',
        future_relevance: 'Its ruin is the evidence the Commission acts on.' }
    ],
    existingRefs: [],   // relies on nothing established
    canon_change: { tier: 2, targets: ['the Reach Commission'],
      content: 'The Reach Commission opens an investigation into the burning of Aeryn’s Reach.' }
  };
  out.tier2 = window._processContinuationProposal(tier2Reply, { scene: 12 });
  out.tier2AuthorBlock = window._continuationAuthorBlock(out.tier2.sealedId, tier2Reply);
  out.tier2FactsBeforeDelivery = facts().length;
  // Julian and his office must be untouched by a Tier 2 addition
  out.julianStillProvast = (() => { const a = window._deliveryAnchorAliases(out.julianId);
    return a.ok && a.aliases.indexOf('the Provast') >= 0; })();
  out.registerAfterTier2 = Object.keys(window._protectedRegisterIds()).length;
  // the newly introduced institution is now PROTECTED (growth rule)
  const commission = window._deliveryAnchorAliases('the Reach Commission');
  out.commissionId = commission.ok ? commission.entityId : null;
  out.commissionProtected = !!(out.commissionId && window._protectedRegisterIds()[out.commissionId]);

  // DELIVERY: the prose renders it, naming both anchors by permitted alias
  const tier2Prose = 'By the time the smoke thinned, riders of the Commission were already on the '
    + 'north road, and word came back that the Reach would be looked into.';
  out.tier2Anchors = window._checkDeliveryAnchors(out.tier2.sealedId, tier2Prose, []);
  out.tier2Activated = !!window._commitTransition(out.tier2.sealedId, 'scene12', 12);
  out.tier2Fact = facts().filter(f => f.proposalRef === out.tier2.sealedId)[0] || null;

  // SMUGGLING: the same institution, but silently redefining the college's authority
  const smuggleReply = JSON.parse(JSON.stringify(tier2Reply));
  smuggleReply.introduces = [{ kind: 'institution', label: 'the Northern Court',
    justification: 'x', future_relevance: 'y' }];
  smuggleReply.canon_change = { tier: 2, targets: ['the Northern Court', out.officeId],
    content: 'The Northern Court opens an investigation, the Provast office having lapsed.' };
  out.smuggle = window._validateContinuationProposal(smuggleReply);

  // REDEFINITION BY RE-INTRODUCTION
  out.reintroduce = window._validateContinuationProposal({
    scene_purpose: 'x', forward_pressure: 'y', derivation: 'z',
    introduces: [{ kind: 'named', label: 'the Provast', justification: 'j', future_relevance: 'f' }],
    existingRefs: [], canon_change: { tier: 2, targets: ['the Provast'], content: 'c' } });

  // ══════════════════════════════════════════════════════════════════════
  // PATH 2 — TIER 3: a protected change, with and without a causal basis
  // ══════════════════════════════════════════════════════════════════════
  window.state.turnCount = 13;
  window.state._scenePosture['13'] = { hash: 'ph-strike-julian', choice: 'strike',
    action: 'I draw the Answer across his throat', dialogue: '' };

  const tier3Base = {
    scene_purpose: 'Let the reader’s own act land irreversibly.',
    forward_pressure: 'The office she aspired to is now vacant and she caused it.',
    derivation: 'The player struck the Provast with the relic in hand.',
    introduces: [], existingRefs: [out.julianId],
    canon_change: { tier: 3, targets: [out.julianId],
      content: 'Julian is dead, killed by Lirael before the assembly.' }
  };
  // (a) WITHOUT a basis → rejected
  out.tier3NoBasis = window._validateContinuationProposal(
    JSON.parse(JSON.stringify(tier3Base)));
  // (b) with an UNRESOLVABLE basis → rejected
  const badBasis = JSON.parse(JSON.stringify(tier3Base));
  badBasis.canon_change.basis = { kind: 'player_action', ref: 'ph-never-happened', causal_chain: 'c' };
  out.tier3BadBasis = window._validateContinuationProposal(badBasis);
  // (c) declared Tier 2 for a protected target → SMUGGLING
  const mislabeled = JSON.parse(JSON.stringify(tier3Base));
  mislabeled.canon_change.tier = 2;
  out.tier3Mislabeled = window._validateContinuationProposal(mislabeled);
  // (d) with the REAL recorded posture hash → accepted, sealed before prose
  const goodBasis = JSON.parse(JSON.stringify(tier3Base));
  goodBasis.canon_change.basis = { kind: 'player_action', ref: 'ph-strike-julian',
    causal_chain: 'The reader drew the Answer across his throat; he does not survive it.' };
  out.factsBeforeTier3 = facts().length;
  out.tier3 = window._processContinuationProposal(goodBasis, { scene: 13 });
  out.factsAfterSeal = facts().length;          // sealing must write NO fact
  out.tier3Block = window._continuationAuthorBlock(out.tier3.sealedId, goodBasis);
  // delivery, then activation
  const tier3Prose = 'The Provast went down on the spiralgrass and did not get up, and the assembly '
    + 'made no sound at all.';
  out.tier3Anchors = window._checkDeliveryAnchors(out.tier3.sealedId, tier3Prose, []);
  out.tier3Activated = !!window._commitTransition(out.tier3.sealedId, 'scene13', 13);
  out.tier3Fact = facts().filter(f => f.proposalRef === out.tier3.sealedId)[0] || null;

  // ══════════════════════════════════════════════════════════════════════
  // PATH 3 — NONE: ordinary continuation, and prose cannot add afterwards
  // ══════════════════════════════════════════════════════════════════════
  window.state.turnCount = 14;
  out.factsBeforeNone = facts().length;
  // THE ENVELOPE IS REQUIRED: a no-change continuation states purpose and pressure with an
  // EXPLICIT null change and an EXPLICIT empty introduces. Omitting those keys is an envelope
  // violation rather than a no-change scene — see _continuation_envelope_control.mjs.
  out.none = window._processContinuationProposal({
    scene_purpose: 'Let her sit with what she has done.',
    forward_pressure: 'Nobody has come for her yet, and that is worse.',
    canon_change: null, introduces: []
  }, { scene: 14 });
  out.factsAfterNone = facts().length;
  out.noneBlock = window._continuationAuthorBlock(out.none.sealedId, {});
  out.sealedCountAfterNone = Object.keys((window.state._sealedProposals || { byId: {} }).byId).length;

  // PROSE CANNOT CREATE A RECORD AFTER THE FACT: no sealed proposal, so nothing can activate.
  out.proseOnlyActivation = window._commitTransition(
    'The Reach Commission also stripped Julian of his office.', 'scene14', 14);
  out.factsAfterProseAttempt = facts().length;
  out.allFactTexts = facts().map(f => f.fact);

  return out;
});

await browser.close();

console.log('\nESTABLISHED CANON');
t('Julian and his office are registered', !!r.julianId && !!r.officeId);
t('the protected register starts with them', r.registerBefore >= 2, 'count=' + r.registerBefore);

console.log('\n── PATH 1 — TIER 2: additive institution ──');
t('the proposal is sealed', r.tier2.outcome === 'sealed', JSON.stringify(r.tier2.why));
t('  it is classified Tier 2', r.tier2.tier === 2, 'tier=' + r.tier2.tier);
t('  both declared entities were minted with backend ids',
  r.tier2.introduced.length === 2 && r.tier2.introduced.every(e => /^ent:stage:\d+$/.test(e.id)),
  JSON.stringify(r.tier2.introduced));
t('  the institution and the place kept their distinct kinds',
  r.tier2.introduced.some(e => e.kind === 'institution') && r.tier2.introduced.some(e => e.kind === 'place'),
  JSON.stringify(r.tier2.introduced.map(e => e.kind)));
t('SEALING WROTE NO FACT (activation is separate)', r.tier2FactsBeforeDelivery === 0,
  'facts=' + r.tier2FactsBeforeDelivery);
t('Julian is untouched — still the Provast', r.julianStillProvast === true);
// CORRECTED, not relaxed. These two previously asserted that the new institution was PROTECTED and
// the register had GROWN immediately at seal time. That contradicted this control's own
// "SEALING WROTE NO FACT" assertion: if the register derives from ACTIVE canon, an entity cannot be
// protected before delivery admits it — otherwise something the reader never saw constrains later
// planning. The seal-time expectation is now the opposite, and the full boundary (pending → active
// on DELIVERED, never on MISSED) is proven in _pending_entity_boundary_control.mjs.
t('the new institution is NOT yet protected — it is pending until delivery',
  r.commissionProtected === false, 'protected=' + r.commissionProtected);
t('the register has NOT grown at seal time', r.registerAfterTier2 === r.registerBefore,
  r.registerBefore + ' → ' + r.registerAfterTier2);
console.log('   anchors: ' + r.tier2Anchors.verdict + ' ' + JSON.stringify(r.tier2Anchors.perAnchor.map(a => a.role + ':' + a.status)));
t('delivery anchors are satisfied by alias-only prose', r.tier2Anchors.verdict === 'anchors_present',
  JSON.stringify(r.tier2Anchors.why));
t('activation occurs after delivery', r.tier2Activated === true);
t('  the activated fact is byte-identical to the sealed content',
  r.tier2Fact && r.tier2Fact.fact === 'The Reach Commission opens an investigation into the burning of Aeryn’s Reach.',
  r.tier2Fact && r.tier2Fact.fact);
t('  and carries provenanceLink=sealed', r.tier2Fact && r.tier2Fact.provenanceLink === 'sealed');

console.log('\n   author material is reader-facing only');
t('it states the fact', r.tier2AuthorBlock.indexOf('Reach Commission opens an investigation') >= 0);
t('it leaks no id', !/ent:stage:|prop:/.test(r.tier2AuthorBlock));
t('it leaks no tier, basis, target or register vocabulary',
  !/tier|basis|targets|protected|register/i.test(r.tier2AuthorBlock), r.tier2AuthorBlock.slice(0, 120));

console.log('\n   smuggling and redefinition are refused');
t('declared Tier 2 while altering a protected office is REJECTED', r.smuggle.ok === false);
t('  the rejection names it as smuggling',
  JSON.stringify(r.smuggle.why).indexOf('SMUGGLING') >= 0, JSON.stringify(r.smuggle.why));
t('re-introducing an established alias is REJECTED', r.reintroduce.ok === false);
t('  because it would redefine rather than introduce',
  JSON.stringify(r.reintroduce.why).indexOf('already established') >= 0, JSON.stringify(r.reintroduce.why));

console.log('\n── PATH 2 — TIER 3: protected change needs a causal basis ──');
t('Tier 3 with NO basis is rejected', r.tier3NoBasis.ok === false);
t('  the rejection names the basis requirement',
  JSON.stringify(r.tier3NoBasis.why).indexOf('Tier 3 requires a basis') >= 0, JSON.stringify(r.tier3NoBasis.why));
t('Tier 3 with an UNRESOLVABLE basis ref is rejected', r.tier3BadBasis.ok === false);
t('  the rejection says the ref does not resolve',
  JSON.stringify(r.tier3BadBasis.why).indexOf('does not resolve') >= 0, JSON.stringify(r.tier3BadBasis.why));
t('the same change mislabeled Tier 2 is rejected as smuggling',
  r.tier3Mislabeled.ok === false && JSON.stringify(r.tier3Mislabeled.why).indexOf('SMUGGLING') >= 0,
  JSON.stringify(r.tier3Mislabeled.why));
t('with the RECORDED player posture as basis it is accepted', r.tier3.outcome === 'sealed',
  JSON.stringify(r.tier3.why));
t('  and derived as Tier 3 from the protected target', r.tier3.tier === 3, 'tier=' + r.tier3.tier);
t('SEALING WROTE NO FACT', r.factsAfterSeal === r.factsBeforeTier3,
  r.factsBeforeTier3 + ' → ' + r.factsAfterSeal);
t('delivery anchors satisfied by "the Provast"', r.tier3Anchors.verdict === 'anchors_present',
  JSON.stringify(r.tier3Anchors.why));
t('activation occurs only after delivery', r.tier3Activated === true);
t('  the fact is byte-identical to the sealed content',
  r.tier3Fact && r.tier3Fact.fact === 'Julian is dead, killed by Lirael before the assembly.',
  r.tier3Fact && r.tier3Fact.fact);
t('the author block carries no basis or posture hash',
  !/ph-|basis|causal/i.test(r.tier3Block), r.tier3Block.slice(0, 120));

console.log('\n── PATH 3 — NONE is normal ──');
t('outcome is none', r.none.outcome === 'none', r.none.outcome);
t('  no sealed record was minted', r.none.sealedId === null);
t('  the ledger is unchanged', r.factsAfterNone === r.factsBeforeNone,
  r.factsBeforeNone + ' → ' + r.factsAfterNone);
t('  exactly two proposals were ever sealed (tier2, tier3)', r.sealedCountAfterNone === 2,
  'sealed=' + r.sealedCountAfterNone);
t('  the author block is empty — nothing to render as canon', r.noneBlock === '');

console.log('\n── prose cannot create a record after the fact ──');
t('a raw prose string cannot activate anything', r.proseOnlyActivation === null);
t('  the ledger is unchanged by the attempt', r.factsAfterProseAttempt === 2,
  'facts=' + r.factsAfterProseAttempt);
t('  no prose-derived text is in the ledger',
  !r.allFactTexts.some(x => /stripped Julian of his office/.test(x)), JSON.stringify(r.allFactTexts));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
