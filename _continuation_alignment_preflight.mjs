// CONTINUATION ALIGNMENT PREFLIGHT. Provider-free, $0. No paid dispatch.
//
// WHY. Three live runs produced the same continuation verdict across two fact scopes, and run 18's
// reason field finally explained it: `incomplete_rendering`, with the verifier citing
// "The clerk clears his throat once and begins to read." as the precondition. The author staged the
// clerk BEGINNING the reading; the proposal claimed receipt/acknowledgement was COMPLETE. That is
// a creative misalignment, not a wiring fault — the wiring and idempotency questions are closed.
//
// THIS CONTROL DOES NOT TRY TO WIN THE VERDICT. It checks that four things AGREE before any further
// spend: the proposal's fact · the author-facing purpose and pressure · the delivery anchor · and
// the expected COMPLETED action, verbatim in the captured prose. If they disagree, no verifier
// wording will fix it.
//
// AND IT PRESERVES RUN 18's PARTIAL AS LEGITIMATE. The old fact is asserted to still yield no
// commit under run 18's real verdict. Nothing here forces DELIVERED.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const RUN18 = '_continuation_live_eval_out/run_2026-10-02T02-20-57-234Z';
const PROSE = fs.readFileSync(RUN18 + '/s1_prose.txt', 'utf8');
const norm = (x) => String(x).replace(/\s+/g, ' ').trim();
const inProse = (q) => norm(PROSE).indexOf(norm(q)) >= 0;

console.log('=== CONTINUATION ALIGNMENT PREFLIGHT (provider-free, $0) ===\n');
console.log('  captured scene-1 prose: ' + PROSE.length + ' chars, from run 18\n');

// ── WHAT THE PROSE ACTUALLY STAGES, read before choosing anything ───────────
// Every candidate below is a verbatim line from the captured prose, so the choice is grounded in
// what the author wrote rather than in what I would like it to have written.
const STAGED = [
  ["the seal is cracked", "The clerk's fingers crack the seal on the parchment I sent."],
  ["the reading BEGINS", 'The clerk clears his throat once and begins to read.'],
  ["the acknowledgement is SPOKEN", 'THE CLERK: "The commission acknowledges the demand concerning the toll-road burning."'],
  ["the reading ENDS", 'The clerk lowers the parchment but says nothing more.']
];
console.log('1. what the captured prose unmistakably stages');
STAGED.forEach(([label, line]) => {
  t('   ' + label, inProse(line), JSON.stringify(line.slice(0, 60)));
});
console.log('\n   NOTE: the prose stages the reading beginning AND ending ("lowers the parchment"),');
console.log('   yet the verifier judged "acknowledges receipt" incomplete. So its standard for');
console.log('   RECEIPT is stricter than completion of the reading — recorded, not argued with.');

// ── THE ALIGNED PROPOSAL ─────────────────────────────────────────────────────
// Roman's suggestion, kept deliberately minimal: the completion criterion IS the beginning, which
// the prose states verbatim. The richer "received and acknowledged" framing needs the AUTHOR PROMPT
// changed to require a completed acknowledgement — Roman's stated alternative, and a separate
// decision I have NOT taken.
const ALIGNED = {
  scene_purpose: 'Put the sealed demand in front of the body that can act on it, and show its clerk take it up.',
  forward_pressure: 'The Toll Road Commission now has the demand in hand and must answer it.',
  pressure_scope: 'durable',
  derivation: 'The player sent sealed word to the commission demanding an investigation.',
  introduces: [{ kind: 'institution', label: 'Toll Road Commission',
    aliases: ['the commission', 'the governing commission'],
    justification: 'The body the player addressed; it governs the toll road.',
    future_relevance: 'It will convene over the demand and summon those who profited.' }],
  existingRefs: [],
  canon_change: { tier: 2, targets: ['Toll Road Commission'],
    content: 'The Toll Road Commission\'s clerk begins reading the sealed demand aloud in the chamber.' }
};
// The single on-page act whose completion the fact asserts, and the verbatim line that stages it.
const EXPECTED_COMPLETED_ACTION = 'begins reading';
const STAGING_LINE = 'The clerk clears his throat once and begins to read.';
// And the OLD fact, which run 18 judged PARTIAL / incomplete_rendering.
const OLD_FACT = 'The commission\'s clerk acknowledges receipt of the sealed demand.';

console.log('\n2. the four things must AGREE');
console.log('   fact     : ' + JSON.stringify(ALIGNED.canon_change.content));
console.log('   purpose  : ' + JSON.stringify(ALIGNED.scene_purpose));
console.log('   pressure : ' + JSON.stringify(ALIGNED.forward_pressure));
console.log('   anchor   : ' + JSON.stringify(ALIGNED.introduces[0].label)
  + ' aliases ' + JSON.stringify(ALIGNED.introduces[0].aliases));
console.log('   action   : ' + JSON.stringify(EXPECTED_COMPLETED_ACTION)
  + ' staged by ' + JSON.stringify(STAGING_LINE));

t('the expected completed action is STAGED VERBATIM in the prose', inProse(STAGING_LINE));
t('  and the fact asserts that same action, not a later one',
  ALIGNED.canon_change.content.toLowerCase().indexOf(EXPECTED_COMPLETED_ACTION) >= 0,
  ALIGNED.canon_change.content);
t('  the fact claims NOTHING the prose does not stage',
  !/received and acknowledged|has acknowledged|acknowledges receipt|formally received/i
    .test(ALIGNED.canon_change.content), ALIGNED.canon_change.content);
t('the fact names the BODY, so it is institutional canon and not scene texture',
  ALIGNED.canon_change.content.indexOf(ALIGNED.introduces[0].label) >= 0);
t('the author-facing PURPOSE describes the same act',
  /take it up|clerk/i.test(ALIGNED.scene_purpose), ALIGNED.scene_purpose);
t('the author-facing PRESSURE points forward from it, without re-claiming it',
  /must answer it/.test(ALIGNED.forward_pressure)
  && !/acknowledg/i.test(ALIGNED.forward_pressure), ALIGNED.forward_pressure);
t('the ANCHOR resolves in the prose by a controlled name',
  ALIGNED.introduces[0].aliases.concat([ALIGNED.introduces[0].label]).some(n => inProse(n)),
  JSON.stringify(ALIGNED.introduces[0].aliases));
t('  specifically "the commission", which the prose speaks aloud', inProse('the commission'));

console.log('\n   and the OLD fact is shown to DISAGREE — which is why run 18 was PARTIAL');
t('the old fact asserts a completion the prose does not state verbatim',
  !inProse('acknowledges receipt'), OLD_FACT);
t('  while the aligned fact\'s action IS stated verbatim', inProse('begins to read'));

// ── THE REAL MACHINERY, driven on the aligned proposal ──────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._adjudicateSceneProposals === 'function'
  && typeof window._checkDeliveryAnchors === 'function', { timeout: 20000 });

const r = await page.evaluate(({ ALIGNED, PROSE, OLD_FACT, STAGING_LINE }) => {
  const out = {};
  const setup = (tag, scene) => {
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-align-' + tag;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._sceneLocalPressures = null;
    window.state.turnCount = scene;
    window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-align-' + tag };
  };

  // A. the aligned proposal validates and seals
  setup('A', 1400);
  const res = window._processContinuationProposal(ALIGNED, { scene: 1400 });
  out.sealOutcome = res.outcome;
  out.sealWhy = res.why || [];
  out.ctRef = res.sealedId || null;

  // B. the REAL anchor check against the REAL prose
  out.anchors = out.ctRef ? window._checkDeliveryAnchors(out.ctRef, PROSE,
    [STAGING_LINE]) : null;

  // C. WOULD it commit and activate on a DELIVERED verdict? The verdict here is a FIXTURE — this
  //    shows the chain is unblocked, NOT that the live verifier will agree.
  const pend = window._pendingSealedForScene(1400);
  const adj = window._adjudicateSceneProposals(pend,
    [{ ref: out.ctRef, delivery: 'DELIVERED', reason: 'delivered',
       evidence: STAGING_LINE, precondition_evidence: STAGING_LINE }],
    PROSE, { scene: 1400, sharedSlots: null, legacyDelivery: 'MISSED', legacyStateChangeRef: null });
  out.verdict = adj.verdicts[out.ctRef] || null;
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  out.facts = cs.facts.map(f => ({ fact: f.fact, ref: f.proposalRef, prov: f.provenanceLink }));
  out.activated = Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
    .map(k => ({ id: k, label: reg[k].label, aliases: reg[k].aliases || [] }));
  // D. ALIAS RESOLUTION — the measurement still outstanding, because activation never happened live
  const act = out.activated[0] || null;
  if (act) {
    const resolve = (x) => { const v = window._deliveryAnchorAliases(x);
      return { name: x, ok: !!v.ok, id: v.entityId || null }; };
    out.resolution = { activatedId: act.id, label: resolve(act.label),
      aliases: (act.aliases || []).map(resolve) };
  }

  // E. RUN 18's REAL VERDICT on the OLD fact must still yield NO commit — the PARTIAL stands.
  setup('E', 1401);
  const old = JSON.parse(JSON.stringify(ALIGNED));
  old.canon_change.content = OLD_FACT;
  const resOld = window._processContinuationProposal(old, { scene: 1401 });
  const pendOld = window._pendingSealedForScene(1401);
  const adjOld = window._adjudicateSceneProposals(pendOld,
    [{ ref: resOld.sealedId, delivery: 'PARTIAL', reason: 'incomplete_rendering',
       evidence: 'THE CLERK: "The commission acknowledges the demand concerning the toll-road burning."',
       precondition_evidence: 'The clerk clears his throat once and begins to read.' }],
    PROSE, { scene: 1401, sharedSlots: null, legacyDelivery: 'MISSED', legacyStateChangeRef: null });
  out.oldVerdict = adjOld.verdicts[resOld.sealedId] || null;
  out.oldFacts = window._ensureCommittedState().facts.length;
  out.oldActivated = Object.keys(window._protectedRegisterIds())
    .filter(k => window._protectedRegisterIds()[k].provenance === 'continuation_activated').length;
  return out;
}, { ALIGNED, PROSE, OLD_FACT, STAGING_LINE });
await browser.close();

console.log('\n3. the aligned proposal passes the REAL validator and anchor check');
t('it seals', r.sealOutcome === 'sealed', JSON.stringify(r.sealWhy));
console.log('   anchor verdict: ' + JSON.stringify(r.anchors && r.anchors.verdict));
t('its delivery anchors are PRESENT in the captured prose',
  r.anchors && r.anchors.verdict === 'anchors_present',
  JSON.stringify(r.anchors));

console.log('\n4. on a DELIVERED verdict the chain commits and ACTIVATES  [verdict is a FIXTURE]');
t('the adjudicator commits it', r.verdict && r.verdict.commit === true, JSON.stringify(r.verdict));
t('  the fact is byte-identical to the sealed content',
  r.facts.length === 1 && r.facts[0].fact === ALIGNED.canon_change.content,
  JSON.stringify(r.facts));
t('  with sealed provenance', r.facts.length === 1 && r.facts[0].prov === 'sealed');
t('  and the institution ACTIVATES', r.activated.length === 1, JSON.stringify(r.activated));

console.log('\n5. ALIAS RESOLUTION — the measurement activation has never reached live');
console.log('   ' + JSON.stringify(r.resolution));
t('every declared alias resolves to the activated entity',
  !!r.resolution && r.resolution.aliases.length === 2
  && r.resolution.aliases.every(a => a.ok && a.id === r.resolution.activatedId),
  JSON.stringify(r.resolution && r.resolution.aliases));
t('  and the canonical label resolves to the same entity',
  !!r.resolution && r.resolution.label.ok && r.resolution.label.id === r.resolution.activatedId,
  JSON.stringify(r.resolution && r.resolution.label));

console.log('\n6. RUN 18\'s PARTIAL IS PRESERVED AS LEGITIMATE');
t('the old fact under run 18\'s real verdict still does NOT commit',
  r.oldVerdict && r.oldVerdict.commit === false, JSON.stringify(r.oldVerdict));
t('  carrying the verifier\'s own reason, incomplete_rendering',
  r.oldVerdict && r.oldVerdict.reason === 'incomplete_rendering', JSON.stringify(r.oldVerdict));
t('  nothing committed and nothing activated from it',
  r.oldFacts === 0 && r.oldActivated === 0,
  'facts=' + r.oldFacts + ' activated=' + r.oldActivated);
const self = fs.readFileSync('_continuation_alignment_preflight.mjs', 'utf8');
t('and this control never rewrites a verdict to DELIVERED in the app',
  !/_delivery\s*=\s*'DELIVERED'/.test(self) && !/status\s*=\s*'DELIVERED'/.test(self));

console.log('\n7. WHAT THIS DOES AND DOES NOT ESTABLISH');
console.log('   ESTABLISHED: the aligned fact claims only what the captured prose stages verbatim;');
console.log('                its anchors are present; and on a DELIVERED verdict the chain commits,');
console.log('                activates, and resolves every alias AND the label to one entity.');
console.log('   NOT ESTABLISHED: that the live verifier will call it DELIVERED. The verdict in');
console.log('                section 4 is a FIXTURE. Three runs have shown this verifier\'s standard');
console.log('                is stricter than the proposal wording, and alignment removes the');
console.log('                MISMATCH — it does not compel a judgement.');
console.log('   NOT TAKEN: changing the AUTHOR PROMPT to require a completed acknowledgement, which');
console.log('                is Roman\'s stated alternative and a separate decision.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
