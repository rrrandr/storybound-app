// TWO-SCENE PREFLIGHT. Provider-free, $0. NOT a planner sample, NOT a paid run.
//
// ROMAN'S TWO CONDITIONS FOR DISPATCH, and this control exists to satisfy both:
//   1. prove the REAL _commitScene path is reached;
//   2. prove no control is merely reimplementing the production logic.
//
// HOW CONDITION 1 IS MET WITHOUT SPENDING. _commitScene's only unavoidable cost is its RUNTIME
// COMMIT VERIFIER call. So the real window._commitScene is invoked and the verifier's HTTP request
// is intercepted at the network boundary: the request being ISSUED AT ALL is the proof the path was
// reached, and its prompt is inspected to prove the per-proposal contract and both refs travelled.
// Only the model's JUDGEMENT is a fixture. Everything else — the prompt build, the JSON parse, the
// slot check, the anchor pre-check, the adjudication loop, _commitTransition, activation — is the
// production code running.
//
// HOW CONDITION 2 IS MET. Section 6 audits this file and every sibling control for a reimplemented
// copy of the adjudication logic. That check exists because an earlier version of
// _per_proposal_delivery_control DID reimplement the loop in node, and a bite that broke the real
// legacy restriction left all of its behavioural assertions green.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// Scene 1's rendered prose. Contains the state_change event AND the continuation's own content, so
// each proposal has a verbatim citation available and neither borrows the other's.
const SCENE1_PROSE = 'She pressed her seal into the wax while the courier waited by the door. '
  + 'The sealed demand reached the clerk before the bell rang, and he did not look up as he took it. '
  + 'The Toll Road Commission received a formal demand to investigate the burning, entered in the '
  + 'book in a hand that did not shake. Outside, the road went on carrying its traffic as if nothing '
  + 'had been set in motion at all, and she stood a while listening to it.';

const browser = await chromium.launch();
const page = await browser.newPage();

// ── NETWORK BOUNDARY. Only the verifier is answered; anything else is aborted, so nothing can
//    reach a provider and no other stage can quietly contribute.
const seen = [];
let verifierReply = null;
await page.route('**/api/**', async (route) => {
  const req = route.request();
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = '';
  try { const j = JSON.parse(raw || '{}'); sys = String((j.messages || [])[0]?.content || ''); } catch (_) {}
  const isVerifier = /RUNTIME COMMIT verifier/.test(sys);
  seen.push({ url: req.url(), isVerifier, sys: isVerifier ? sys : '', raw: isVerifier ? (raw || '') : '' });
  if (isVerifier && verifierReply) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify(verifierReply) }) });
  }
  return route.abort();
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._commitScene === 'function'
  && typeof window._processContinuationProposal === 'function', { timeout: 20000 });

console.log('=== TWO-SCENE PREFLIGHT (provider-free, $0) ===\n');

// ── SCENE 1: seal both proposal kinds, exactly as production does ────────────
const scene1 = await page.evaluate(() => {
  const scene = 1;
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  delete window.state._starterId;
  window.state.storyId = 'story-twoscene';
  window.state.playerName = 'Wren';
  window.state.loveInterestName = 'Cassel';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._sceneLocalPressures = null;
  window.state.turnCount = scene;
  window.state._scenePosture = { '1': { hash: 'ph-two-1', choice: 'petition',
    action: 'I send sealed word to the commission that governs the toll road', dialogue: '' } };

  // The state_change proposal, sealed before prose, with its ref riding on _priorSceneStateChange.
  const scSeal = window._sealProposal({ kind: 'state_change', scene: scene,
    fact: 'The sealed demand reached the clerk before the bell rang.' });
  window.state._priorSceneStateChange = {
    event: 'The sealed demand reached the clerk before the bell rang.',
    proposalRef: scSeal ? scSeal.id : null, sceneProposed: scene };

  // The continuation proposal, sealed by the real handler.
  const ct = window._processContinuationProposal({
    scene_purpose: 'Put the demand before a body that can act on it.',
    forward_pressure: 'The Toll Road Commission will convene over the demand and summon her.',
    pressure_scope: 'durable',
    derivation: 'The player sent sealed word to the commission demanding an investigation.',
    introduces: [{ kind: 'institution', label: 'Toll Road Commission',
      aliases: ['the commission', 'the governing commission'],
      justification: 'The body the player addressed; it governs the toll road.',
      future_relevance: 'It will convene, summon her, and set the terms of the inquiry.' }],
    existingRefs: [],
    canon_change: { tier: 2, targets: ['Toll Road Commission'],
      content: 'The Toll Road Commission received a formal demand to investigate the burning.' }
  }, { scene: scene });

  const reg = window._protectedRegisterIds();
  return { scRef: scSeal ? scSeal.id : null, ctRef: ct.sealedId || null, ctOutcome: ct.outcome,
    authorBlock: window._continuationAuthorBlock(ct.sealedId, {
      scene_purpose: 'Put the demand before a body that can act on it.',
      forward_pressure: 'The Toll Road Commission will convene over the demand and summon her.' }),
    facts: window._ensureCommittedState().facts.length,
    registerLabels: Object.keys(reg).map(k => String(reg[k].label || '')),
    pendingForScene: window._pendingSealedForScene(scene).map(p => ({ id: p.id, kind: p.kind })) };
});

console.log('SCENE 1 — both proposal kinds sealed, nothing committed');
t('the state_change sealed', /^prop:1:\d+$/.test(scene1.scRef || ''), String(scene1.scRef));
t('the continuation sealed', scene1.ctOutcome === 'sealed' && /^prop:1:\d+$/.test(scene1.ctRef || ''),
  JSON.stringify([scene1.ctOutcome, scene1.ctRef]));
t('both are pending for scene 1', scene1.pendingForScene.length === 2,
  JSON.stringify(scene1.pendingForScene));
t('ZERO facts committed — scene 1 only seals', scene1.facts === 0, 'facts=' + scene1.facts);
t('the institution is NOT yet in the active register',
  scene1.registerLabels.indexOf('Toll Road Commission') === -1, JSON.stringify(scene1.registerLabels));
console.log('\n   the author block scene 1 would render:');
console.log('   ' + JSON.stringify(scene1.authorBlock));
t('the author block carries the sealed fact',
  (scene1.authorBlock || '').indexOf('Toll Road Commission received a formal demand') >= 0);
t('  and no machinery', !/ent:stage:|prop:\d+:\d+|pressure_scope|tier/.test(scene1.authorBlock || ''),
  JSON.stringify(scene1.authorBlock));

// ── SCENE 2: the REAL _commitScene, with only the verifier's reply stubbed ───
console.log('\nSCENE 2 — the REAL _commitScene adjudicates scene 1\'s pending proposals');
await page.evaluate(() => { window.state.turnCount = 2; });
verifierReply = {
  delivery: 'DELIVERED', dominant_replacement: 'none',
  transition_position: 30, first_irreversible_position: 30,
  tableau: { setting: 'the clerk\'s counter', charactersPresent: ['Wren'],
    protagonistStatus: 'waiting', decisiveChange: 'THE COMMISSION DISSOLVED THE ROAD',
    activeInterlocutor: null, protagonistAlone: true },
  per_proposal: [
    { ref: scene1.scRef, delivery: 'DELIVERED',
      evidence: 'The sealed demand reached the clerk before the bell rang' },
    { ref: scene1.ctRef, delivery: 'DELIVERED',
      evidence: 'The Toll Road Commission received a formal demand to investigate the burning' }
  ]
};
const after2 = await page.evaluate(async (prose) => {
  await window._commitScene(prose, window.state._priorSceneStateChange, 1);
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  return {
    facts: cs.facts.map(f => ({ fact: f.fact, ref: f.proposalRef, prov: f.provenanceLink,
      scene: f.committedAtScene })),
    committedThrough: cs._committedThroughScene,
    registerLabels: Object.keys(reg).map(k => String(reg[k].label || '')),
    activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
      .map(k => ({ id: k, label: reg[k].label, aliases: reg[k].aliases || [] })),
    adjudication: window.state._lastPerProposalAdjudication || null,
    pendingNow: window._pendingSealedForScene(1).map(p => p.id),
    sceneCard: window.state._sceneStateCard || null
  };
}, SCENE1_PROSE);

const verifierCalls = seen.filter(c => c.isVerifier);
console.log('   provider requests seen: ' + seen.length + ' (verifier: ' + verifierCalls.length + ')');
t('THE REAL _commitScene WAS REACHED — it issued a verifier request', verifierCalls.length === 1,
  'verifier requests=' + verifierCalls.length);
// PROVIDER endpoints only. The page also pings /api/config, /api/geo and /api/csp-report — ordinary
// infrastructure, all ABORTED by the route handler. Counting those as "contacted a provider" was my
// own assertion defect: nothing was fulfilled and no model was reachable.
const PROVIDER_RX = /\/api\/(proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy)/;
const providerCalls = seen.filter(c => PROVIDER_RX.test(c.url));
t('  the ONLY provider request was that verifier call',
  providerCalls.length === 1 && providerCalls[0].isVerifier,
  JSON.stringify(providerCalls.map(c => ({ url: c.url, verifier: c.isVerifier }))));
t('  every non-provider request was aborted, not answered',
  seen.filter(c => !PROVIDER_RX.test(c.url)).every(c => !c.isVerifier),
  JSON.stringify(seen.filter(c => !PROVIDER_RX.test(c.url)).map(c => c.url)));
const vsys = verifierCalls.length ? verifierCalls[0].sys : '';
const vraw = verifierCalls.length ? verifierCalls[0].raw : '';
t('  its prompt carries the PER-PROPOSAL contract',
  /PER-PROPOSAL DELIVERY \(judge EACH listed proposal INDEPENDENTLY/.test(vsys));
t('  demanding one entry per ref with verbatim evidence',
  /"per_proposal"/.test(vsys) && /must be a verbatim quote from the prose/.test(vsys));
t('  BOTH sealed refs were listed for judgement',
  vraw.indexOf(scene1.scRef) >= 0 && vraw.indexOf(scene1.ctRef) >= 0,
  'scRef=' + (vraw.indexOf(scene1.scRef) >= 0) + ' ctRef=' + (vraw.indexOf(scene1.ctRef) >= 0));
t('  and scene 1\'s prose was the text judged',
  vraw.indexOf('reached the clerk before the bell rang') >= 0);

console.log('\n   adjudication result');
console.log('   ' + JSON.stringify(after2.adjudication && after2.adjudication.verdicts));
t('both proposals were adjudicated', after2.adjudication
  && Object.keys(after2.adjudication.verdicts).length === 2,
  JSON.stringify(after2.adjudication));
t('  each by its own ref', after2.adjudication
  && !!after2.adjudication.verdicts[scene1.scRef] && !!after2.adjudication.verdicts[scene1.ctRef]);

console.log('\n   what became canon');
after2.facts.forEach(f => console.log('   fact: ' + JSON.stringify(f)));
t('exactly two facts committed', after2.facts.length === 2, 'facts=' + after2.facts.length);
t('  the state_change fact, by its own ref',
  after2.facts.some(f => f.ref === scene1.scRef
    && f.fact === 'The sealed demand reached the clerk before the bell rang.'),
  JSON.stringify(after2.facts));
t('  the CONTINUATION fact, by its own ref, byte-identical to the sealed content',
  after2.facts.some(f => f.ref === scene1.ctRef
    && f.fact === 'The Toll Road Commission received a formal demand to investigate the burning.'),
  JSON.stringify(after2.facts));
t('  both sealed-provenance', after2.facts.every(f => f.prov === 'sealed'),
  JSON.stringify(after2.facts.map(f => f.prov)));
t('  and attributed to scene 1, not scene 2', after2.facts.every(f => f.scene === 1),
  JSON.stringify(after2.facts.map(f => f.scene)));

console.log('\n   the active register');
console.log('   ' + JSON.stringify(after2.registerLabels));
t('THE INSTITUTION IS NOW ACTIVE — the continuation activated its OWN record',
  after2.registerLabels.indexOf('Toll Road Commission') >= 0, JSON.stringify(after2.registerLabels));
t('  exactly one entity activated', after2.activated.length === 1, JSON.stringify(after2.activated));
t('  with the SAME id the proposal minted',
  after2.activated.length === 1 && /^ent:stage:\d+$/.test(after2.activated[0].id),
  JSON.stringify(after2.activated));
t('  and the SAME aliases it sealed with',
  after2.activated.length === 1
  && JSON.stringify(after2.activated[0].aliases) === JSON.stringify(['the commission', 'the governing commission']),
  JSON.stringify(after2.activated.length ? after2.activated[0].aliases : null));

console.log('\n   verifier interpretation stayed out of canon');
const canonText = JSON.stringify(after2.facts) + JSON.stringify(after2.sceneCard);
t('the verifier tableau\'s decisiveChange is NOT in canon or the card',
  canonText.indexOf('DISSOLVED THE ROAD') === -1, canonText.slice(0, 200));
t('  the card is deterministic', !after2.sceneCard || after2.sceneCard.source === 'deterministic',
  JSON.stringify(after2.sceneCard && after2.sceneCard.source));

// ── WHAT THE NEXT PLANNER WOULD SEE ─────────────────────────────────────────
console.log('\n   what the NEXT planner reads');
const plannerView = await page.evaluate(() => {
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  return { facts: cs.facts.map(f => f.fact),
    register: Object.keys(reg).map(k => ({ label: reg[k].label, aliases: reg[k].aliases || [] })),
    resolvesByAlias: (function () { const v = window._deliveryAnchorAliases('the commission');
      return { ok: v.ok, id: v.entityId || null }; })(),
    resolvesByLabel: (function () { const v = window._deliveryAnchorAliases('Toll Road Commission');
      return { ok: v.ok, id: v.entityId || null }; })(),
    pendingLeft: window._pendingSealedForScene(1).length };
});
t('committed canon carries the continuation fact verbatim',
  plannerView.facts.indexOf('The Toll Road Commission received a formal demand to investigate the burning.') >= 0,
  JSON.stringify(plannerView.facts));
t('the institution is referencable by its declared alias',
  plannerView.resolvesByAlias.ok === true, JSON.stringify(plannerView.resolvesByAlias));
t('  and by its canonical label, to the same entity',
  plannerView.resolvesByLabel.ok === true
  && plannerView.resolvesByLabel.id === plannerView.resolvesByAlias.id,
  JSON.stringify([plannerView.resolvesByLabel, plannerView.resolvesByAlias]));
t('nothing remains pending for scene 1', plannerView.pendingLeft === 0,
  'pending=' + plannerView.pendingLeft);

// ── IDEMPOTENCY through the REAL path, twice more ────────────────────────────
console.log('\nIDEMPOTENCY — _commitScene run again on the same scene');
const before = after2.facts.length;
const repeat = await page.evaluate(async (prose) => {
  await window._commitScene(prose, window.state._priorSceneStateChange, 1);
  await window._commitScene(prose, window.state._priorSceneStateChange, 1);
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  return { facts: cs.facts.length, entities: Object.keys(reg).length,
    activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated').length,
    factRefs: cs.facts.map(f => f.proposalRef) };
}, SCENE1_PROSE);
const verifierCallsAfter = seen.filter(c => c.isVerifier).length;
t('the fact count is unchanged', repeat.facts === before,
  'before=' + before + ' after=' + repeat.facts);
t('  the entity count is unchanged', repeat.activated === 1, 'activated=' + repeat.activated);
t('  and the same two refs, no duplicates',
  new Set(repeat.factRefs).size === repeat.factRefs.length && repeat.factRefs.length === 2,
  JSON.stringify(repeat.factRefs));
t('  the verifier was NOT called again — the committedThrough guard short-circuits',
  verifierCallsAfter === 1, 'verifier calls total=' + verifierCallsAfter);
t('  (committedThroughScene recorded scene 1)', after2.committedThrough === 1,
  String(after2.committedThrough));

await browser.close();

// ── ANTI-REIMPLEMENTATION AUDIT ─────────────────────────────────────────────
console.log('\nNO CONTROL REIMPLEMENTS THE PRODUCTION LOGIC');
// MY FIRST VERSION OF THIS AUDIT WAS ITSELF THE DEFECT IT HUNTS. The marker
// /forEach\([^)]*\)\s*=>\s*\{[\s\S]{0,400}_commitTransition/ matched THIS FILE'S OWN audit code —
// a `forEach(([name, rx]) => {` with the string "_commitTransition" a few lines below — and so
// reported three controls as reimplementations. Proximity regexes over source are the same
// over-broad-scan defect as matching "TIER 2" inside a 227KB prompt. Replaced with two precise
// checks: an EXACT production expression that only a copy would contain, and a POSITIVE
// requirement that any control asserting adjudication calls a real entry point.
// BUILT FROM PARTS so the full expression never appears verbatim in this file. Spelled out as one
// literal, the audit matched ITSELF and reported this preflight as a reimplementation — the same
// self-matching trap that has bitten the comment-stripping scans in this codebase twice.
const LEGACY_RULE = "pp.kind === 'state_change'" + " && pp.id === o.legacyStateChangeRef";
const REAL_ENTRY_RX = /window\._(adjudicateSceneProposals|commitScene)\(/;
const CONTROLS = ['_two_scene_preflight.mjs', '_per_proposal_delivery_control.mjs',
  '_continuation_delivery_gap_control.mjs', '_seal_gate_control.mjs'];
CONTROLS.forEach(f => {
  const body = fs.readFileSync(f, 'utf8');
  t('  ' + f + ' contains no copy of the production legacy rule',
    body.indexOf(LEGACY_RULE) === -1, LEGACY_RULE);
  // A control that asserts on adjudication OUTCOMES must get them from the real loop.
  const assertsAdjudication = /no-legacy-verdict|per_proposal|verdicts\[/.test(body);
  if (assertsAdjudication) {
    t('  ' + f + ' asserts adjudication and so must call a REAL entry point',
      REAL_ENTRY_RX.test(body), 'no window._adjudicateSceneProposals / window._commitScene call');
  } else {
    t('  ' + f + ' does not assert adjudication outcomes (nothing to reimplement)', true);
  }
});
const self = fs.readFileSync('_two_scene_preflight.mjs', 'utf8');
t('this preflight calls the REAL _commitScene', /window\._commitScene\(/.test(self));
t('  and the REAL continuation handler', /window\._processContinuationProposal\(/.test(self));
t('  and never calls _commitTransition itself', !/window\._commitTransition\(/.test(self));
const ppd = fs.readFileSync('_per_proposal_delivery_control.mjs', 'utf8');
t('the per-proposal control drives the REAL adjudication loop',
  /window\._adjudicateSceneProposals\(/.test(ppd));

// ── THE PAID RUNNER CARRIES THE SAME FIXES ──────────────────────────────────
// Static, because running the two-scene runner costs money. Each assertion pins one of the four
// sequencing fixes the free chain control had to discover.
console.log('\nTHE PAID --two-scene RUNNER CARRIES THE FOUR FIXES');
const runner = fs.readFileSync('_continuation_live_eval.mjs', 'utf8');
t('1. it drives the real entry point _advanceStagedScene, not _runCGScreenplayGen',
  /window\._advanceStagedScene\(a, dlg\)/.test(runner));
t('   and the two-scene path no longer calls _runCGScreenplayGen',
  (function () {
    const i = runner.indexOf('const runTwoScene = async (C)');
    const body = i >= 0 ? runner.slice(i) : '';
    return i >= 0 && !/window\._runCGScreenplayGen\(/.test(body);
  })(), 'runTwoScene still calls _runCGScreenplayGen');
t('2. it sets the staged render mode gate', /renderMode = 'staged_story_mode'/.test(runner));
t('3. it READS scene 1 through to the say/do gate via the real beat advance',
  /window\._advanceStagedBeat\(\)/.test(runner) && /gateShown/.test(runner));
t('   resolving micro-decisions with the real resolver',
  /window\._resolveMicroDecision\(0\)/.test(runner));
t('   and NEVER sets gateShown or clears a submission latch itself',
  !/gateShown\s*=\s*true/.test(runner) && !/_stagedSubmitting\s*=\s*false/.test(runner),
  'the runner writes a gate flag directly');
t('4. it SERVES the memory extractor instead of aborting it',
  /stage === 'memory'/.test(runner) && /MEMORY_SKELETON/.test(runner));
t('   with the contract\'s own skeleton and no interpretation',
  /decisiveChange: null/.test(runner) && /characters: \[\]/.test(runner));
t('and under --live-verifier-only the planner and author are REPLAYED',
  /LIVE_VERIFIER_ONLY && \(stage === 'planner' \|\| stage === 'author'\)/.test(runner));
t('   leaving the verifier as the ONLY live provider call',
  /is the RUNTIME COMMIT VERIFIER/.test(runner)
  && /\(TWO_SCENE && LIVE_VERIFIER_ONLY\)\s*\n?\s*\? R_VERIFIER/.test(runner));

console.log('\nWHAT IS STUBBED, and it is exactly one thing');
console.log('   · the RUNTIME COMMIT VERIFIER\'s reply. Its request was issued by the real');
console.log('     _commitScene and intercepted at the network boundary; only the model\'s');
console.log('     JUDGEMENT is a fixture. The prompt build, parse, slot check, anchor pre-check,');
console.log('     adjudication loop, _commitTransition and activation are production code.');
console.log('   · the planner and author stages were NOT run: scene 1\'s seals are constructed');
console.log('     through the real sealing functions, and scene 1\'s prose is a fixture, so this');
console.log('     does NOT prove the funnel reaches _commitScene in a live run. That is what the');
console.log('     paid two-scene run measures.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
