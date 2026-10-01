// DETERMINISTIC DELIVERY PRE-CHECK CONTROL. Provider-free, no network, $0.
//
// The pre-check is ONE-WAY: it may only downgrade DELIVERED → MISSED, leaving the sealed proposal
// pending for recovery. It can never upgrade a verdict, substitute an alias, invent evidence, or
// alter the sealed fact.
//
// It is NOT a proper-name requirement: each anchor resolves to the CONTROLLED ALIAS SET on its
// entity register record, so "the Provast" satisfies an anchor on Julian and "the relic" satisfies
// one on the Answer.
//
// Six cases, each proving no ledger activation on failure and the sealed proposal surviving:
//   1 proper-name success   2 alias success   3 absent actor   4 absent target
//   5 evidence not verbatim 6 pronoun-only prose   7 no applicable concrete anchor
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
// Wait only on the pre-existing surface, so that an app WITHOUT the pre-check reports a clean
// failure instead of a timeout. (On the pre-repair build this control used to die in
// waitForFunction — a valid bite, but a useless diagnostic.)
await page.waitForFunction(() => typeof window._sealProposal === 'function'
  && typeof window._proposeNewEntity === 'function', { timeout: 20000 });

console.log('=== DETERMINISTIC DELIVERY PRE-CHECK (no network, $0) ===\n');

const installed = await page.evaluate(() => ({
  check: typeof window._checkDeliveryAnchors,
  aliases: typeof window._deliveryAnchorAliases
}));
console.log('INSTALLATION');
t('_checkDeliveryAnchors is installed', installed.check === 'function', 'typeof=' + installed.check);
t('_deliveryAnchorAliases is installed', installed.aliases === 'function', 'typeof=' + installed.aliases);
if (installed.check !== 'function' || installed.aliases !== 'function') {
  console.log('\n  the deterministic delivery pre-check is NOT present — every case below is unprovable.');
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' passed');
  process.exit(1);
}

const r = await page.evaluate(() => {
  const out = { cases: [] };
  window.state = window.state || {};
  window.state.storyId = 'story-anchor-control';
  window.state.turnCount = 5;
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;

  // ── register two entities through the REAL backend-minted path, each with a controlled alias set
  // NOTE: _STAGE_ALLOWED_ENTITY_KINDS is { named, role } — there is no object/artifact kind, so an
  // artifact is registered as `named` ("the Answer" is a named thing). Reported as a finding; not
  // worked around silently. An earlier version of this control passed kind:'object', the proposal
  // was REJECTED, and the dropped anchor made two cases pass for the wrong reason — hence the
  // fixture assertions below.
  const julian = window._proposeNewEntity({ kind: 'named', label: 'Julian', aliases: ['the Provast'] });
  const answer = window._proposeNewEntity({ kind: 'named', label: 'the Answer', aliases: ['the relic'] });
  out.julianOk = !!(julian && julian.ok);
  out.answerOk = !!(answer && answer.ok);
  out.julianWhy = julian && julian.why;
  out.answerWhy = answer && answer.why;
  out.julianId = out.julianOk ? julian.entity.id : null;
  out.answerId = out.answerOk ? answer.entity.id : null;
  out.julianAliases = window._deliveryAnchorAliases(out.julianId);

  let seq = 0;
  // Each case seals its OWN proposal (distinct posture → distinct invocation → distinct record),
  // then checks anchors, then attempts activation, then reports whether the proposal survived.
  function runCase(name, anchors, prose, evidence) {
    seq++;
    const scene = 100 + seq;
    window.state.turnCount = scene;
    window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-' + seq };
    const sealed = window._sealProposal({
      fact: 'Julian takes the Answer from Lirael before the assembly.', scene: scene, anchors: anchors });
    const chk = window._checkDeliveryAnchors(sealed.id, prose, evidence);
    // Simulate the production rule: only a non-failing check may proceed to activation.
    let activated = false;
    if (chk.verdict !== 'anchor_missing') {
      activated = !!window._commitTransition(sealed.id, 'anchor_case_' + seq, scene);
    }
    const cs = window._ensureCommittedState();
    out.cases.push({ name: name, verdict: chk.verdict, why: chk.why,
      perAnchor: (chk.perAnchor || []).map(a => a.role + ':' + a.status + (a.matchedAlias ? '(' + a.matchedAlias + ')' : '')),
      evidenceVerbatim: chk.evidenceVerbatim,
      activated: activated,
      ledgerHasIt: cs.facts.some(f => f.proposalRef === sealed.id),
      sealedSurvives: !!window._resolveSealedProposal(sealed.id),
      sealedFactIntact: window._resolveSealedProposal(sealed.id).fact === 'Julian takes the Answer from Lirael before the assembly.',
      anchorsIntact: JSON.stringify(window._resolveSealedProposal(sealed.id).anchors) === JSON.stringify(anchors.map(a => ({ role: a.role, ref: a.ref })))
    });
  }

  const A = [{ role: 'actor', ref: out.julianId }, { role: 'object', ref: out.answerId }];

  // 1 — PROPER NAMES present
  runCase('proper-name success', A,
    'Julian crossed the grass and took the Answer out of her hands while the assembly watched.',
    ['Julian crossed the grass', 'took the Answer out of her hands']);

  // 2 — ALIASES present, no proper name anywhere
  runCase('alias success (the Provast / the relic)', A,
    'The Provast crossed the grass and lifted the relic from her hands while the assembly watched.',
    ['The Provast crossed the grass', 'lifted the relic from her hands']);

  // 3 — ACTOR absent (object present)
  runCase('absent actor', A,
    'The relic lay on the spiralgrass where it had fallen, and nobody came forward to claim it.',
    ['The relic lay on the spiralgrass']);

  // 4 — TARGET/object absent (actor present)
  runCase('absent target object', A,
    'The Provast crossed the grass and spoke to her at length, and then the rite was closed.',
    ['The Provast crossed the grass']);

  // 5 — evidence NOT verbatim (both anchors present; the quote is paraphrased)
  runCase('evidence not verbatim', A,
    'Julian crossed the grass and took the Answer out of her hands while the assembly watched.',
    ['Julian seized the relic from her grasp']);

  // 6 — PRONOUN-ONLY prose
  runCase('pronoun-only prose', A,
    'He crossed the grass and took it out of her hands while they watched, and nobody spoke.',
    ['He crossed the grass']);

  // 7 — no applicable concrete anchor (refs resolve to nothing in the register)
  runCase('no applicable concrete anchor', [{ role: 'actor', ref: 'the weather' }],
    'The light changed over the clearing and the morning went on without anyone saying anything.',
    []);

  return out;
});

await browser.close();

const byName = {};
r.cases.forEach(c => { byName[c.name] = c; });

// FIXTURE ASSERTIONS FIRST. Without these, a rejected entity registration silently drops its
// anchor and two failure cases pass for the wrong reason — which is exactly what happened on the
// first run of this control.
console.log('FIXTURES — the register must actually have issued both entities');
t('Julian registered', r.julianOk === true, JSON.stringify(r.julianWhy));
t('the Answer registered', r.answerOk === true, JSON.stringify(r.answerWhy));
t('both anchors are sealed in every multi-anchor case',
  r.cases.filter(c => c.name !== 'no applicable concrete anchor')
    .every(c => c.perAnchor.length === 2),
  JSON.stringify(r.cases.map(c => c.name + '=' + c.perAnchor.length)));

console.log('\nregister: Julian=' + r.julianId + ' aliases=' + JSON.stringify(r.julianAliases.aliases));
t('the register yields a CONTROLLED alias set, not a bare name',
  r.julianAliases.ok === true && r.julianAliases.aliases.length === 2
  && r.julianAliases.aliases.indexOf('the Provast') >= 0, JSON.stringify(r.julianAliases));

console.log('\nSUCCESS CASES — activation allowed');
['proper-name success', 'alias success (the Provast / the relic)'].forEach(n => {
  const c = byName[n];
  console.log('  [' + n + '] verdict=' + c.verdict + ' anchors=' + JSON.stringify(c.perAnchor));
  t(n + ': verdict is anchors_present', c.verdict === 'anchors_present', c.verdict + ' ' + JSON.stringify(c.why));
  t('  ' + n + ': activation occurs', c.activated === true && c.ledgerHasIt === true);
});
t('an ALIAS alone satisfies the anchor — no proper name required',
  byName['alias success (the Provast / the relic)'].perAnchor.join(',').indexOf('the Provast') >= 0,
  JSON.stringify(byName['alias success (the Provast / the relic)'].perAnchor));

console.log('\nFAILURE CASES — downgrade, no activation, proposal survives');
['absent actor', 'absent target object', 'evidence not verbatim', 'pronoun-only prose'].forEach(n => {
  const c = byName[n];
  console.log('  [' + n + '] verdict=' + c.verdict + ' :: ' + (c.why[0] || ''));
  t(n + ': verdict is anchor_missing', c.verdict === 'anchor_missing', c.verdict);
  t('  ' + n + ': NO ledger activation', c.activated === false && c.ledgerHasIt === false);
  t('  ' + n + ': sealed proposal survives for recovery', c.sealedSurvives === true);
  t('  ' + n + ': the sealed fact is unaltered', c.sealedFactIntact === true);
  t('  ' + n + ': the sealed anchors are unaltered', c.anchorsIntact === true);
});
t('evidence-not-verbatim is reported as an evidence failure',
  byName['evidence not verbatim'].evidenceVerbatim === false
  && byName['evidence not verbatim'].why.join(' ').indexOf('verbatim') >= 0);
t('pronoun-only prose fails BOTH anchors (no alias substitution)',
  byName['pronoun-only prose'].perAnchor.filter(x => /absent/.test(x)).length === 2,
  JSON.stringify(byName['pronoun-only prose'].perAnchor));

console.log('\nINAPPLICABLE CASE — recorded as inapplicable, never as verification');
const inap = byName['no applicable concrete anchor'];
console.log('  verdict=' + inap.verdict + ' :: ' + (inap.why[inap.why.length - 1] || ''));
t('verdict is inapplicable, NOT anchors_present', inap.verdict === 'inapplicable', inap.verdict);
t('  it says so explicitly rather than implying delivery',
  inap.why.join(' ').indexOf('does not apply') >= 0 && inap.why.join(' ').indexOf('NOT asserted') >= 0,
  JSON.stringify(inap.why));
t('  the unresolvable ref is marked unanchorable',
  inap.perAnchor.join(',').indexOf('unanchorable') >= 0, JSON.stringify(inap.perAnchor));
t('  the sealed proposal survives', inap.sealedSurvives === true);

console.log('\nONE-WAY PROPERTY');
t('the checker never returns a verdict that could raise MISSED to DELIVERED',
  r.cases.every(c => ['anchors_present', 'anchor_missing', 'inapplicable'].indexOf(c.verdict) >= 0));
t('every sealed fact in every case is byte-intact', r.cases.every(c => c.sealedFactIntact === true));
t('every sealed anchor set in every case is intact', r.cases.every(c => c.anchorsIntact === true));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
