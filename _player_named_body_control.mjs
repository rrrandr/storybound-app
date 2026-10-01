// PLAYER-NAMED-BODY CONTROL. Provider-free, no network, no model calls, $0.
//
// TWO REPAIRS, BOTH DRIVEN BY THE FAILED LIVE CASE C.
//
// 1. THE GUARD MISS, definite. Case C declared pressure_scope "scene_local" while its
//    forward_pressure said "the commission must now respond to the sealed demand" and its branch_a
//    said "appear at the commission chambers to testify in person". The old guard matched only an
//    article plus a CAPITALISED noun phrase, so every lowercase institution walked through it —
//    and lowercase is the common case. The exact saved reply is a fixture here.
//
// 2. THE PLAYER-NAMED-BODY RULE (Roman). A player may nominate a body canon does not contain, and
//    their words do not make it canon. The planner may ADOPT it as durable canon, or keep the
//    reference provisional — but path (b) is INVALID if the proposal's own later branch, exit
//    state or forward pressure relies on that body persisting.
//
// Legitimate scene-local unknowns must still pass, which is the other half of the test: a guard
// that rejects "whoever governs this place" would have destroyed the contract it was meant to hold.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { INSTITUTION_BODY_NOUNS, INSTITUTION_ADJUNCT_NOUNS, PERSISTENCE_FIELDS,
  detectContinuingReferents, gradeScopeCoherence } from './_continuation_durable_grader.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// THE EXACT SAVED CASE C REPLY, loaded from the run artefact rather than retyped, so this fixture
// cannot drift from what the planner actually returned.
const RUN_DIR = '_continuation_live_eval_out/run_2026-10-01T07-17-45-311Z';
const CASE_C_RAW = JSON.parse(fs.readFileSync(RUN_DIR + '/C-durable_planner_content.txt', 'utf8'));

const base = { scene_purpose: 'Stage the petition and its consequence.' };
const P = (o) => Object.assign({}, base, o);

// Scene-local pressures that name NOTHING continuing. These MUST keep passing.
//
// "a magistrate will be sent" belongs HERE, not among the catches. I first wrote it as a fixture
// the guard should flag and the guard disagreed — correctly. An INDEFINITE functionary names no
// identifiable continuing referent; it is "someone with authority" in a costume, which is exactly
// the legitimate unknown the contract protects. The asymmetry below is deliberate and asserted:
//   indefinite ADJUNCT ("a magistrate")      → scene-local, no identifiable body      → PASSES
//   definite   ADJUNCT ("the magistrate")    → a particular official who persists     → CAUGHT
//   indefinite BODY    ("a commission")      → an institution coming into being       → CAUGHT
const LEGIT = [
  'Someone will answer for this before the week is out.',
  'Whoever governs this place will come and find her.',
  'The toll road will be watched more closely now.',
  'Word of the burning will travel faster than she can ride.',
  'She has no idea who heard the bell, and that is the problem.',
  'a magistrate will be sent to take her statement'
];
// Continuing bodies in ordinary lowercase — Roman's four forms and their kin. These MUST be caught.
const LOWERCASE_BODIES = [
  ['the commission', 'the commission must now respond to the sealed demand'],
  ['the council', 'the council will take up the matter at its next sitting'],
  ['their chambers', 'she will be summoned to their chambers before the month turns'],
  ['its clerk', 'its clerk has already entered the complaint in the book'],
  ['the tribunal', 'the tribunal will decide what the burning cost her'],
  ['the board', 'the board intends to make an example of her'],
  ['the magistrate', 'the magistrate will be sent to take her statement'],
  ['a commission', 'a commission will be convened over the burning'],
  ['the hearing', 'the hearing will go on with or without her']
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._continuingReferentDetail === 'function', { timeout: 20000 });

console.log('=== PLAYER-NAMED-BODY CONTROL (no network, no model, $0) ===\n');

const r = await page.evaluate(({ LEGIT, LOWERCASE_BODIES, CASE_C, base }) => {
  const out = {};
  const reset = (scene) => {
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-pnb-' + scene;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._sceneLocalPressures = null;
    window.state.turnCount = scene;
    window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-pnb-' + scene };
  };
  const P = (o) => Object.assign({}, base, o);
  let sc = 200;

  out.vocab = window._CONTINUING_REFERENT_VOCAB;

  // ── A. legitimate scene-local unknowns still pass, text-level AND through the validator
  reset(sc++);
  out.legit = LEGIT.map(txt => ({ txt,
    hits: window._undeclaredDurableReferents(txt, []),
    valid: window._validateContinuationProposal(P({ forward_pressure: txt,
      pressure_scope: 'scene_local', canon_change: null, introduces: [] })).ok }));

  // ── B. lowercase continuing bodies are caught, with no capital letter anywhere
  out.lower = LOWERCASE_BODIES.map(([label, txt]) => {
    reset(sc++);
    const v = window._validateContinuationProposal(P({ forward_pressure: txt,
      pressure_scope: 'scene_local', canon_change: null, introduces: [] }));
    return { label, txt, hits: window._undeclaredDurableReferents(txt, []),
      ok: v.ok, persistenceViolation: v.persistenceViolation === true, why: v.why };
  });

  // ── C. THE EXACT SAVED CASE C REPLY
  reset(sc++);
  out.caseC = { detail: window._continuingReferentDetail(CASE_C, []),
    valid: window._validateContinuationProposal(CASE_C) };
  // and the same reply processed end to end: it must write nothing
  reset(sc);
  const cRes = window._processContinuationProposal(CASE_C, { scene: sc }); sc++;
  out.caseCProcessed = { outcome: cRes.outcome, persistenceViolation: cRes.persistenceViolation === true,
    facts: window._ensureCommittedState().facts.length,
    localPressures: (window.state._sceneLocalPressures || []).length,
    sealed: window.state._sealedProposals
      ? Object.keys(window.state._sealedProposals.byId).map(k => window.state._sealedProposals.byId[k].kind) : [] };

  // ── D. PATH (a): adopt the player-named body as durable canon
  reset(sc);
  out.pathA = window._processContinuationProposal(P({
    forward_pressure: 'the commission must now respond to the sealed demand',
    pressure_scope: 'durable',
    derivation: 'The player sent a sealed demand to the commission that governs the toll road.',
    introduces: [{ kind: 'institution', label: 'the toll-road commission', aliases: ['the commission'],
      justification: 'The body the player addressed; it governs the toll road.',
      future_relevance: 'It will convene over the demand and summon her to answer.' }],
    existingRefs: [],
    branch_a: 'appear at the commission chambers to testify in person',
    exit_state: 'the sealed demand now sits in the commission\'s possession',
    canon_change: { tier: 2, targets: ['the toll-road commission'],
      content: 'The toll-road commission receives a sealed demand for an investigation into the burning.' }
  }), { scene: sc });
  out.pathASealed = out.pathA.sealedId ? window._resolveSealedProposal(out.pathA.sealedId) : null;
  sc++;

  // ── E. PATH (b) DONE RIGHT: provisional, and the proposal relies on nothing continuing
  reset(sc);
  out.pathBok = window._processContinuationProposal(P({
    forward_pressure: 'Someone will answer for the sealed letter, though she cannot know who.',
    pressure_scope: 'scene_local', canon_change: null, introduces: [],
    branch_a: 'ride for the river before any answer can arrive',
    branch_b: 'stay in the village and wait out the silence',
    exit_state: 'the letter is gone from her hands and she is alone with the waiting'
  }), { scene: sc });
  out.pathBokLocal = (window.state._sceneLocalPressures || []).map(p => ({ scope: p.scope, durable: p.durable }));
  sc++;

  // ── F. PATH (b) INVALID: provisional while RELYING on the body persisting. The pressure itself
  //     is deliberately VAGUE here, so the ONLY signal is the cross-field reliance — this is the
  //     case the forward_pressure scan alone cannot catch.
  reset(sc);
  out.pathBbad = window._validateContinuationProposal(P({
    forward_pressure: 'She will not be left alone with this for long.',
    pressure_scope: 'scene_local', canon_change: null, introduces: [],
    branch_a: 'appear at the commission chambers to testify in person',
    exit_state: 'the sealed demand now sits in the commission\'s possession'
  }));
  sc++;

  // ── G. established canon may be referenced freely in a scene-local pressure
  reset(sc);
  const inst = window._proposeNewEntity({ kind: 'institution', label: 'the Reach Commission',
    aliases: ['the commission'] });
  out.establishedId = inst.ok ? inst.entity.id : null;
  out.established = window._validateContinuationProposal(P({
    forward_pressure: 'the commission must now respond to the sealed demand',
    pressure_scope: 'scene_local', canon_change: null, introduces: [] }));
  out.establishedRelied = window._validateContinuationProposal(P({
    forward_pressure: 'She will not be left alone with this for long.',
    pressure_scope: 'scene_local', canon_change: null, introduces: [],
    branch_a: 'appear at the commission chambers to testify in person',
    exit_state: 'the demand now sits in the commission\'s possession' }));
  sc++;

  // ── H. a body declared in THIS proposal's introduces[] is not "undeclared"
  reset(sc);
  out.declaredExempt = window._undeclaredDurableReferents(
    'the toll-road commission must now respond', ['the toll-road commission']);
  return out;
}, { LEGIT, LOWERCASE_BODIES, CASE_C: CASE_C_RAW, base });

await browser.close();

// ── 0. vocabulary parity: the node grader and the browser guard cannot drift ──
console.log('0. the grader vocabulary and the app guard vocabulary are IDENTICAL');
t('body nouns match', JSON.stringify(r.vocab.body) === JSON.stringify(INSTITUTION_BODY_NOUNS),
  'app=' + (r.vocab.body || []).length + ' grader=' + INSTITUTION_BODY_NOUNS.length);
t('adjunct nouns match', JSON.stringify(r.vocab.adjunct) === JSON.stringify(INSTITUTION_ADJUNCT_NOUNS),
  'app=' + (r.vocab.adjunct || []).length + ' grader=' + INSTITUTION_ADJUNCT_NOUNS.length);
t('persistence fields match',
  JSON.stringify(r.vocab.persistenceFields) === JSON.stringify(PERSISTENCE_FIELDS),
  JSON.stringify(r.vocab.persistenceFields));

// ── 1. legitimate scene-local unknowns survive ────────────────────────────────
console.log('\n1. legitimate scene-local unknowns are PRESERVED (the other half of the test)');
r.legit.forEach(x => {
  t('  names nothing continuing: ' + JSON.stringify(x.txt.slice(0, 48)), x.hits.length === 0,
    JSON.stringify(x.hits));
  t('    and the validator accepts it', x.valid === true);
});

// ── 2. lowercase continuing bodies are caught ─────────────────────────────────
console.log('\n2. continuing bodies in ORDINARY LOWERCASE are caught (the definite guard miss)');
r.lower.forEach(x => {
  t('  "' + x.label + '" is detected', x.hits.length > 0, JSON.stringify(x.txt));
  t('    rejected as a persistence violation', x.ok === false && x.persistenceViolation === true,
    JSON.stringify(x.why));
});
t('  none of these needed a capital letter',
  r.lower.every(x => !/[A-Z]/.test(x.txt)), JSON.stringify(r.lower.filter(x => /[A-Z]/.test(x.txt)).map(x => x.txt)));
// THE ASYMMETRY, asserted as a property rather than left as an accident of two fixture lists.
console.log('\n2b. the definite/indefinite asymmetry is deliberate');
const findLegit = (frag) => r.legit.find(x => x.txt.indexOf(frag) >= 0);
const findLower = (frag) => r.lower.find(x => x.txt.indexOf(frag) >= 0);
t('"a magistrate" (indefinite official) stays a legitimate unknown',
  !!findLegit('a magistrate') && findLegit('a magistrate').hits.length === 0
  && findLegit('a magistrate').valid === true, JSON.stringify(findLegit('a magistrate')));
t('"the magistrate" (a particular official) is caught',
  !!findLower('the magistrate will') && findLower('the magistrate will').hits.length > 0);
t('"a commission" (an institution coming into being) is caught',
  !!findLower('a commission will') && findLower('a commission will').hits.length > 0);

// ── 3. the exact saved case C reply ───────────────────────────────────────────
console.log('\n3. the EXACT saved live case C reply — the one the old guard passed');
console.log('   forward_pressure: ' + JSON.stringify(CASE_C_RAW.forward_pressure));
console.log('   branch_a        : ' + JSON.stringify(CASE_C_RAW.branch_a));
console.log('   pressure_scope  : ' + JSON.stringify(CASE_C_RAW.pressure_scope));
t('forward_pressure is flagged', r.caseC.detail.inPressure.length > 0,
  JSON.stringify(r.caseC.detail.inPressure));
t('  the commission is identified by name', JSON.stringify(r.caseC.detail.inPressure).indexOf('commission') >= 0);
t('the proposal is detected as RELYING on it across fields', r.caseC.detail.relied.length > 0,
  JSON.stringify(r.caseC.detail.relied));
const reliedFields = (r.caseC.detail.relied[0] || {}).fields || [];
t('  the reliance spans forward_pressure AND a later branch',
  reliedFields.indexOf('forward_pressure') >= 0 && reliedFields.indexOf('branch_a') >= 0,
  JSON.stringify(reliedFields));
t('  and the exit state', reliedFields.indexOf('exit_state') >= 0
  || reliedFields.indexOf('event_slots.exit_state') >= 0, JSON.stringify(reliedFields));
t('the validator now REJECTS it', r.caseC.valid.ok === false, JSON.stringify(r.caseC.valid));
t('  as a persistence violation', r.caseC.valid.persistenceViolation === true);
t('  and the reason states the player-named-body rule',
  JSON.stringify(r.caseC.valid.why).indexOf('not canon by that act alone') >= 0,
  JSON.stringify(r.caseC.valid.why));
console.log('\n   and processed end to end it writes NOTHING');
t('outcome is rejected', r.caseCProcessed.outcome === 'rejected', JSON.stringify(r.caseCProcessed));
t('  zero facts', r.caseCProcessed.facts === 0, 'facts=' + r.caseCProcessed.facts);
t('  no continuation seal', r.caseCProcessed.sealed.indexOf('continuation') === -1,
  JSON.stringify(r.caseCProcessed.sealed));
t('  and it was NOT recorded as a scene-local pressure either',
  r.caseCProcessed.localPressures === 0, 'recorded=' + r.caseCProcessed.localPressures);
console.log('\n   the node-side grader reaches the same verdict independently');
const coh = gradeScopeCoherence(CASE_C_RAW, []);
t('grader: forward_pressure check is RED',
  coh.some(c => !c.ok && c.name.indexOf('forward_pressure names NO continuing referent') >= 0),
  JSON.stringify(coh));
t('grader: reliance check is RED',
  coh.some(c => !c.ok && c.name.indexOf('does not RELY on a continuing body') >= 0));
const det = detectContinuingReferents(CASE_C_RAW, []);
t('grader detects the same head noun as the app', det.relied.some(g => g.head.indexOf('commission') >= 0),
  JSON.stringify(det.relied.map(g => g.head)));

// ── 4. PATH (a) — adopt it ────────────────────────────────────────────────────
console.log('\n4. PATH (a): the player-named body ADOPTED as durable canon');
t('the proposal seals', r.pathA.outcome === 'sealed', JSON.stringify(r.pathA.why));
t('  as Tier 2', r.pathA.tier === 2, 'tier=' + r.pathA.tier);
t('  with a backend-minted pending id',
  r.pathASealed && (r.pathASealed.pendingEntities || []).length === 1
  && /^ent:stage:\d+$/.test(r.pathASealed.pendingEntities[0].id),
  JSON.stringify(r.pathASealed && (r.pathASealed.pendingEntities || []).map(e => e.id)));
t('  declaring it is what makes the SAME branch_a/exit_state legitimate',
  r.pathA.outcome === 'sealed');

// ── 5. PATH (b) done right, and done wrong ───────────────────────────────────
console.log('\n5. PATH (b): provisional — legitimate only when nothing relies on the body');
t('provisional with NO continuing reliance is accepted', r.pathBok.outcome === 'none',
  JSON.stringify(r.pathBok.why));
t('  recorded as explicitly non-durable', r.pathBokLocal.length === 1
  && r.pathBokLocal[0].durable === false, JSON.stringify(r.pathBokLocal));
t('provisional WHILE RELYING on the body is REJECTED', r.pathBbad.ok === false,
  JSON.stringify(r.pathBbad));
t('  even though forward_pressure itself names nothing',
  r.pathBbad.ok === false
  && JSON.stringify(r.pathBbad.why).indexOf('DEPENDS on a continuing body') >= 0,
  JSON.stringify(r.pathBbad.why));
t('  the reason offers both legal exits',
  JSON.stringify(r.pathBbad.why).indexOf('adopt it as durable canon') >= 0
  && JSON.stringify(r.pathBbad.why).indexOf('no-change alternative') >= 0,
  JSON.stringify(r.pathBbad.why));

// ── 6. established canon is exempt ───────────────────────────────────────────
console.log('\n6. ESTABLISHED canon may be referenced freely — referencing is not creation');
t('an established commission in forward_pressure is allowed', r.established.ok === true,
  JSON.stringify(r.established.why));
t('  and relying on it across fields is allowed too', r.establishedRelied.ok === true,
  JSON.stringify(r.establishedRelied.why));
t('a body declared in THIS proposal\'s introduces[] is not "undeclared"',
  r.declaredExempt.length === 0, JSON.stringify(r.declaredExempt));

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
