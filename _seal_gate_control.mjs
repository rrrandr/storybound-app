// SEAL-GATE CONTROL. Provider-free, no network, no model calls, $0.
//
// WHAT IT PROVES, before $0.20 is spent: the GATE PREDICATE — the expression the live runner
// evaluates at the author boundary to decide whether to release the expensive stage. Run 11 paid
// $0.0745 for an author call on a draw that never sealed, and the six boundary checks could not
// execute, so the author is now withheld until a continuation-kind seal exists.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// SCOPE, STATED HONESTLY. This control exercises the PREDICATE against real sealed-proposal states
// produced by the real _processContinuationProposal, plus the runner's mode refusals and its
// reservation arithmetic. It does NOT drive the whole browser funnel to an author request.
//
// I tried twice and both attempts produced FALSE GREENS. On the unseeded Corridor path the funnel
// never reaches the author under stubs — its upstream structure stages receive {content:''} from
// this harness and it stalls first — so the control reported "the author was never released" for a
// SEALING draw as readily as for a non-sealing one, which looks like the gate working and is not.
// On the seeded path the continuation handler never ran at all under stubs
// (_lastContinuationResult stayed null), so there was no seal either way. A stub-driven funnel is
// a harness project of its own; claiming funnel-level proof from it would claim what I had not
// shown.
//
// The funnel-level behaviour is instead observed WHERE IT IS REAL: the live run's DRAW LOG records,
// per draw, the handler outcome and whether the author gate released, and the runner asserts that
// the author was never dispatched without a seal. That is a live observation, not a stubbed one.
// ════════════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._processContinuationProposal === 'function', { timeout: 20000 });

console.log('=== SEAL-GATE CONTROL (no network, no model, $0) ===\n');

const r = await page.evaluate(() => {
  const out = {};
  let sc = 700;
  const reset = (tag) => {
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-gate-' + tag;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._sceneLocalPressures = null;
    window.state._lastContinuationResult = null;
    window.state.turnCount = sc;
    window.state._scenePosture = {}; window.state._scenePosture[String(sc)] = { hash: 'ph-gate-' + tag };
    return sc++;
  };
  // THE PREDICATE, byte-identical to the one the live runner evaluates at the author boundary.
  const GATE = () => {
    const st = (window.state && window.state._sealedProposals) || null;
    if (!st) return null;
    const rec = Object.keys(st.byId).map(k => st.byId[k])
      .filter(x => x && x.kind === 'continuation')[0] || null;
    return rec ? { id: rec.id, fact: String(rec.fact || '').slice(0, 80),
      pending: (rec.pendingEntities || []).length } : null;
  };

  const SEALING = {
    scene_purpose: 'Put the demand in front of a body that can act on it.',
    forward_pressure: 'The Toll Road Commission will convene over the demand and summon her.',
    pressure_scope: 'durable',
    derivation: 'The player sent sealed word to the commission demanding an investigation.',
    introduces: [{ kind: 'institution', label: 'Toll Road Commission',
      aliases: ['the commission', 'the governing commission'],
      justification: 'The body the player addressed; it governs the toll road.',
      future_relevance: 'It will convene, summon her, and set the terms of the inquiry.' }],
    existingRefs: [],
    canon_change: { tier: 2, targets: ['Toll Road Commission'],
      content: 'The Toll Road Commission receives a sealed demand for an investigation.' }
  };
  // Run 11's actual shape: a scene_local that names and relies on a continuing body.
  const NON_SEALING = {
    scene_purpose: 'Render the sending of the sealed demand.',
    forward_pressure: 'the commission now holds an active demand that will force responses',
    pressure_scope: 'scene_local', canon_change: null, introduces: [],
    branch_a: 'remain at the toll road to intercept the first reply from the commission'
  };
  const CLAIMS_DURABLE = { scene_purpose: 'Stage the petition.',
    forward_pressure: 'The commission will convene.',
    pressure_scope: 'durable', derivation: 'the player sent word',
    introduces: [], existingRefs: [], canon_change: null };

  // ── A. a virgin state: nothing sealed at all
  reset('A');
  out.gateVirgin = GATE();

  // ── B. the NON-SEALING reply
  reset('B');
  out.bResult = window._processContinuationProposal(NON_SEALING, { scene: window.state.turnCount });
  out.gateAfterNonSealing = GATE();

  // ── C. a reply CLAIMING durable with no identified referent
  reset('C');
  out.cResult = window._processContinuationProposal(CLAIMS_DURABLE, { scene: window.state.turnCount });
  out.gateAfterClaim = GATE();

  // ── D. garbage
  reset('D');
  out.dResult = window._processContinuationProposal({ nope: true }, { scene: window.state.turnCount });
  out.gateAfterJunk = GATE();

  // ── E. THE SEALING reply
  const sE = reset('E');
  out.eResult = window._processContinuationProposal(SEALING, { scene: sE });
  out.gateAfterSealing = GATE();

  // ── F. THE DISCRIMINATING CASE. A state_change seal present but NO continuation seal.
  //      Every scene seals a state_change for the commit gate — the live runs showed exactly
  //      sealedKinds=["state_change"] on a rejected continuation — so a predicate that merely
  //      asked "is anything sealed?" would release the author on every scene.
  //      It is sealed DIRECTLY here: a rejected continuation proposal seals nothing at all, so
  //      calling _processContinuationProposal cannot construct this state. My first version did
  //      exactly that and the fixture tested nothing (sealed=0).
  const sF = reset('F');
  window._sealProposal({ kind: 'state_change', scene: sF,
    fact: 'The scene reaches its exit state with the letter dispatched.' });
  window._processContinuationProposal(NON_SEALING, { scene: sF });
  out.fKinds = window.state._sealedProposals
    ? Object.keys(window.state._sealedProposals.byId).map(k => window.state._sealedProposals.byId[k].kind) : [];
  out.fAnySealed = out.fKinds.length;
  out.gateWithStateChangeOnly = GATE();
  return out;
});

await browser.close();

console.log('1. the gate predicate withholds the author unless a CONTINUATION seal exists');
t('virgin state → no release', r.gateVirgin === null, JSON.stringify(r.gateVirgin));
t('a REJECTED scene_local reply → no release', r.gateAfterNonSealing === null,
  JSON.stringify(r.gateAfterNonSealing));
t('  (the handler did refuse it)', r.bResult && r.bResult.outcome === 'rejected',
  JSON.stringify(r.bResult && r.bResult.outcome));
t('a reply CLAIMING durable with no referent → no release', r.gateAfterClaim === null,
  JSON.stringify(r.gateAfterClaim));
t('  (refused, so the gate trusts the STORE and not the claim)',
  r.cResult && r.cResult.outcome === 'rejected', JSON.stringify(r.cResult && r.cResult.outcome));
t('a garbage reply → no release', r.gateAfterJunk === null, JSON.stringify(r.gateAfterJunk));

console.log('\n2. and it DOES release on a valid durable seal');
t('the sealing reply sealed', r.eResult && r.eResult.outcome === 'sealed',
  JSON.stringify(r.eResult && r.eResult.why));
t('  the gate releases', !!(r.gateAfterSealing && r.gateAfterSealing.id),
  JSON.stringify(r.gateAfterSealing));
t('  reporting the sealed id and its pending entity',
  !!r.gateAfterSealing && /^prop:\d+:\d+$/.test(r.gateAfterSealing.id)
  && r.gateAfterSealing.pending === 1, JSON.stringify(r.gateAfterSealing));
t('  and the fact it will hand the author',
  !!r.gateAfterSealing && r.gateAfterSealing.fact.indexOf('Toll Road Commission') >= 0,
  JSON.stringify(r.gateAfterSealing && r.gateAfterSealing.fact));

console.log('\n3. THE DISCRIMINATING CASE — a state_change seal is not a continuation seal');
console.log('   kinds present: ' + JSON.stringify(r.fKinds));
t('something IS sealed on that scene', r.fAnySealed > 0, 'sealed=' + r.fAnySealed);
t('  and it is a state_change, which every scene has',
  r.fKinds.indexOf('state_change') >= 0, JSON.stringify(r.fKinds));
t('  but NO continuation seal', r.fKinds.indexOf('continuation') === -1, JSON.stringify(r.fKinds));
t('  so the gate still WITHHOLDS the author', r.gateWithStateChangeOnly === null,
  JSON.stringify(r.gateWithStateChangeOnly));
t('  (a predicate asking merely "is anything sealed?" would have released here)',
  r.fAnySealed > 0 && r.gateWithStateChangeOnly === null);

console.log('\n4. the runner refuses the mode combinations Roman separated');
const refuses = (args) => {
  try { execFileSync(process.execPath, ['_continuation_live_eval.mjs'].concat(args), { stdio: 'pipe' });
    return { refused: false, out: '' }; }
  catch (e) { return { refused: true, out: String((e.stderr || '') + (e.stdout || '')) }; }
};
const r1 = refuses(['--estimate-only', '--seal-gated', '--samples', '3', '--case', 'C-durable']);
t('--seal-gated with --samples is REFUSED', r1.refused && /different experiments/.test(r1.out),
  r1.out.slice(0, 160));
t('  the message explains both purposes',
  /path-rate DISTRIBUTION/.test(r1.out) && /tests the BOUNDARY/.test(r1.out), r1.out.slice(0, 220));
const r2 = refuses(['--estimate-only', '--seal-gated', '--planner-only', '--case', 'C-durable']);
t('--seal-gated with --planner-only is REFUSED', r2.refused && /would defeat it/.test(r2.out),
  r2.out.slice(0, 160));
const r3 = refuses(['--estimate-only', '--seal-gated']);
t('--seal-gated without a case is REFUSED', r3.refused && /needs exactly one --case/.test(r3.out),
  r3.out.slice(0, 160));

console.log('\n5. the reservation is the WORST case — three draws plus author and verifier');
const est = execFileSync(process.execPath,
  ['_continuation_live_eval.mjs', '--estimate-only', '--seal-gated', '--case', 'C-durable'],
  { encoding: 'utf8' });
t('three planner draws are reserved, not one', /3 planner draw\(s\) reserved/.test(est), est.slice(-400));
t('  totalling $0.183750', /TOTAL\s+: \$0\.183750/.test(est), est.slice(-300));
t('  with the author described as gated', /dispatched ONLY after a valid durable seal/.test(est));
t('  and $0.20 covers it', 0.18375 <= 0.20);

console.log('\n6. NOT PROVEN HERE — stated so it is not mistaken for coverage');
console.log('   · that the browser funnel actually issues an author request after a sealing draw.');
console.log('     Two stub-driven attempts produced FALSE GREENS (no author request at all, which');
console.log('     reads identically to a working gate), so that claim is not made from stubs.');
console.log('   · funnel-level gate behaviour is observed LIVE instead: the draw log records each');
console.log('     draw\'s handler outcome and gate verdict, and the runner asserts the author was');
console.log('     never dispatched without a seal.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
