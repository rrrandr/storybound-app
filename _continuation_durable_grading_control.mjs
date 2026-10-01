// DURABLE-GRADING CONTROL. Provider-free, no network, no model calls, $0.
//
// PURPOSE: prove the grader for the third planner-only case BITES, before that case is paid for.
// Run 4 was nearly dispatched with a harness that did not score pressure_scope at all. The lesson
// is that a paid run's grading must itself be a tested artefact, so this control drives the REAL
// _processContinuationProposal with an ideal durable reply and ten near-misses, grades each with
// the SAME module the live runner imports, and asserts that each criterion goes RED on exactly the
// fixture that violates it.
//
// Roman's pass criteria for case C:
//   pressure_scope: durable · >=1 structured introduced institution/collective · future relevance
//   and aliases · no planner-supplied IDs · no existing canon silently redefined
import { chromium } from 'playwright-core';
import { gradeDurable, gradeHandler } from './_continuation_durable_grader.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// The reply a compliant planner should produce for case C's posture.
const IDEAL = {
  scene_purpose: 'Put her petition in front of a body that can act on it.',
  forward_pressure: 'The Reach Commission will open an inquiry and summon her to answer for the burning.',
  pressure_scope: 'durable',
  derivation: 'The player sent word to the commission demanding an investigation.',
  introduces: [{ kind: 'institution', label: 'the Reach Commission', aliases: ['the Commission', 'the Reach board'],
    justification: 'The governing body with jurisdiction over the toll road.',
    future_relevance: 'It will summon her, set the terms of the inquiry, and decide what the burning cost her.' }],
  existingRefs: [],
  canon_change: { tier: 2, targets: ['the Reach Commission'],
    content: 'The Reach Commission opens an inquiry into the burning of the toll-house.' }
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const mut = (f) => { const r = clone(IDEAL); f(r); return r; };

// Each fixture names the grader check it must drive RED. The check name is matched as a substring
// so the assertion is pinned to the criterion, not to wording I might reorder later.
const FIXTURES = [
  { id: 'ideal', reply: IDEAL, expectFail: [] },
  // Declaring scene_local on this reply is now TWO reds, and the second is the diagnosis: its
  // forward_pressure names the Commission outright, so the declaration is incoherent, not merely
  // the wrong answer for case C.
  { id: 'scope-scene_local', reply: mut(r => { r.pressure_scope = 'scene_local'; }),
    expectFail: ['pressure_scope is exactly "durable"',
      'forward_pressure names NO continuing referent'] },
  { id: 'scope-missing', reply: mut(r => { delete r.pressure_scope; }),
    expectFail: ['pressure_scope is exactly "durable"'] },
  { id: 'no-introduces', reply: mut(r => { r.introduces = []; r.canon_change.targets = ['the Reach Commission']; }),
    expectFail: ['it is not empty', 'at least one entry is an institution or collective'] },
  { id: 'wrong-kind-place', reply: mut(r => { r.introduces[0].kind = 'place'; }),
    expectFail: ['at least one entry is an institution or collective'] },
  { id: 'aliases-empty', reply: mut(r => { r.introduces[0].aliases = []; }),
    expectFail: ['aliases is a non-empty array'] },
  { id: 'aliases-missing', reply: mut(r => { delete r.introduces[0].aliases; }),
    expectFail: ['aliases is a non-empty array'] },
  { id: 'no-future-relevance', reply: mut(r => { r.introduces[0].future_relevance = '   '; }),
    expectFail: ['future_relevance is non-empty'] },
  { id: 'planner-supplied-id', reply: mut(r => { r.introduces[0].id = 'ent:stage:99'; }),
    expectFail: ['no id on any introduced entity'] },
  { id: 'planner-supplied-change-id', reply: mut(r => { r.canon_change.id = 'prop:2:1'; }),
    expectFail: ['no id on canon_change'] },
  { id: 'fabricated-existing-ref', reply: mut(r => { r.existingRefs = ['ent:stage:99']; }),
    expectFail: ['every existingRefs entry resolves', 'none is a fabricated system-format id'] },
  // THE SILENT-REDEFINITION ROUTES. Targeting the established Julian additively, or at Tier 3
  // with no basis, is the smuggle; Tier 3 WITH a complete basis is legitimate and must PASS.
  // A Tier 2 change aimed at established canon fails BOTH halves of criterion 5 — it is not
  // Tier 3, and being Tier 2 it has no basis either. Expecting only the first red was my own
  // expectation defect, caught by the "nothing unrelated went red" guard doing its job.
  { id: 'redefine-as-additive', reply: mut(r => { r.canon_change.targets = ['Julian'];
      r.canon_change.content = 'Julian now chairs the Reach Commission.'; }),
    expectFail: ['so it is Tier 3', 'carries a complete basis'] },
  { id: 'redefine-tier3-no-basis', reply: mut(r => { r.canon_change.tier = 3;
      r.canon_change.targets = ['Julian'];
      r.canon_change.content = 'Julian is stripped of the Provast office.'; }),
    expectFail: ['carries a complete basis'] },
  { id: 'redefine-by-alias', reply: mut(r => { r.canon_change.targets = ['the Provast'];
      r.canon_change.content = 'The Provast is removed from the toll road.'; }),
    expectFail: ['so it is Tier 3', 'carries a complete basis'] },
  // __JULIAN_ID__ is substituted with the real minted id inside the browser. The contract states
  // targets take "<id or an introduces[] label>", so an ESTABLISHED entity must be targeted by id
  // — the label route is rejected, which is a separate reportable finding asserted in section 3.
  { id: 'redefine-tier3-with-basis', reply: mut(r => { r.canon_change.tier = 3;
      r.canon_change.targets = ['__JULIAN_ID__'];
      r.canon_change.content = 'Julian is stripped of the Provast office before the commission.';
      r.canon_change.basis = { kind: 'player_action', ref: '__POSTURE_HASH__',
        causal_chain: 'Her petition forced the commission to act against him.' }; }),
    expectFail: [] },
  { id: 'redefine-tier3-by-label', reply: mut(r => { r.canon_change.tier = 3;
      r.canon_change.targets = ['Julian'];
      r.canon_change.content = 'Julian is stripped of the Provast office before the commission.';
      r.canon_change.basis = { kind: 'player_action', ref: '__POSTURE_HASH__',
        causal_chain: 'Her petition forced the commission to act against him.' }; }),
    expectFail: [] }
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._processContinuationProposal === 'function', { timeout: 20000 });

console.log('=== DURABLE GRADING CONTROL (no network, no model, $0) ===\n');

const runs = await page.evaluate((FX) => {
  const out = [];
  FX.forEach((f, i) => {
    const scene = 100 + i;
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-durable-' + i;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._sceneLocalPressures = null;
    window.state._lastContinuationResult = null;
    window.state.turnCount = scene;
    window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-durable-' + i };
    // THE ESTABLISHED CANON this reply must not quietly redefine.
    const jul = window._proposeNewEntity({ kind: 'named', label: 'Julian', aliases: ['the Provast'] });
    const julianId = jul.ok ? jul.entity.id : null;
    const snap = () => Object.keys((window.state._relationshipLedger || { entities: {} }).entities)
      .map(k => { const e = window.state._relationshipLedger.entities[k];
        return { id: e.id, kind: e.kind, label: e.label, aliases: e.aliases || [] }; });
    const ledgerBefore = snap();
    // Ids are minted here, so a fixture that must target established canon BY ID carries a token.
    // The substituted reply is returned so node grades the exact object the handler received.
    const reply = JSON.parse(JSON.stringify(f.reply)
      .replace(/__JULIAN_ID__/g, String(julianId))
      .replace(/__POSTURE_HASH__/g, 'ph-durable-' + i));
    const res = window._processContinuationProposal(reply, { scene: scene });
    out.push({ id: f.id, ledgerBefore: ledgerBefore, reply: reply, julianId: julianId, after: {
      ctResult: res,
      facts: window._ensureCommittedState().facts,
      sealed: window.state._sealedProposals
        ? Object.keys(window.state._sealedProposals.byId).map(k => window.state._sealedProposals.byId[k]) : [],
      ledger: snap()
    } });
  });
  return out;
}, FIXTURES.map(f => ({ id: f.id, reply: f.reply })));

await browser.close();

const byId = {}; runs.forEach(r => { byId[r.id] = r; });

// ── 1. the ideal reply passes every criterion ────────────────────────────────
console.log('1. the IDEAL durable reply satisfies every pass criterion');
const idealRun = byId.ideal;
const idealChecks = gradeDurable(IDEAL, idealRun.after, idealRun.ledgerBefore);
idealChecks.forEach(c => t('  ' + c.name, c.ok, c.detail));
console.log('\n   and the handler side holds');
gradeHandler(IDEAL, idealRun.after, idealRun.ledgerBefore).forEach(c => t('  ' + c.name, c.ok, c.detail));

// ── 2. every near-miss drives its own criterion RED ──────────────────────────
console.log('\n2. each near-miss drives EXACTLY its own criterion red (the bite proof)');
FIXTURES.filter(f => f.id !== 'ideal').forEach(f => {
  const run = byId[f.id];
  // Grade the SUBSTITUTED reply the handler actually received, not the tokenised source.
  const checks = gradeDurable(run.reply, run.after, run.ledgerBefore);
  const reds = checks.filter(c => !c.ok).map(c => c.name);
  if (f.expectFail.length === 0) {
    t('  ' + f.id + ': is LEGITIMATE and passes the reply grading', reds.length === 0, JSON.stringify(reds));
  } else {
    f.expectFail.forEach(want => {
      t('  ' + f.id + ': RED on "' + want + '"', reds.some(r => r.indexOf(want) >= 0),
        'reds=' + JSON.stringify(reds));
    });
    // Nothing OUTSIDE the expected set may go red, or the fixture is passing for the wrong reason
    // — the defect class that made two earlier cases green by accident.
    const unexpected = reds.filter(r => !f.expectFail.some(w => r.indexOf(w) >= 0));
    t('    and nothing unrelated went red', unexpected.length === 0, JSON.stringify(unexpected));
  }
});

// ── 3. the grader cannot be satisfied by a handler bug ───────────────────────
console.log('\n3. reply grading is independent of the handler');
const additive = byId['redefine-as-additive'];
t('the additive-smuggle reply was ALSO rejected by the live validator',
  additive.after.ctResult && additive.after.ctResult.outcome === 'rejected',
  JSON.stringify(additive.after.ctResult));
t('  and the grader flags it from the REPLY alone, without consulting that verdict',
  gradeDurable(FIXTURES.find(f => f.id === 'redefine-as-additive').reply,
    { ledger: additive.ledgerBefore }, additive.ledgerBefore)
    .some(c => !c.ok && c.name.indexOf('so it is Tier 3') >= 0));
t('the legitimate Tier 3 + basis reply, targeting established canon BY ID, seals',
  byId['redefine-tier3-with-basis'].after.ctResult
  && byId['redefine-tier3-with-basis'].after.ctResult.outcome === 'sealed',
  JSON.stringify(byId['redefine-tier3-with-basis'].after.ctResult));
// REPORTABLE FINDING, recorded as an assertion rather than left implicit. The SAME legitimate
// Tier 3 proposal is REJECTED when it names the established entity by its label instead of its
// minted id, because `targets` resolves established canon by id only ("<id or an introduces[]
// label>"). Whether the planner can ever satisfy that — it is handed no entity ids — is a
// separate decision, NOT fixed here. Case C is additive Tier 2 and is unaffected.
const byLabel = byId['redefine-tier3-by-label'].after.ctResult;
t('FINDING: the same proposal by LABEL is rejected — targets resolve established canon by id only',
  byLabel && byLabel.outcome === 'rejected'
  && JSON.stringify(byLabel.why).indexOf('neither an established entity nor declared') >= 0,
  JSON.stringify(byLabel));

// ── 4. no fixture wrote canon ────────────────────────────────────────────────
console.log('\n4. no fixture activated canon (sealing is not committing)');
runs.forEach(r => t('  ' + r.id + ': zero facts activated', (r.after.facts || []).length === 0,
  'facts=' + (r.after.facts || []).length));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
