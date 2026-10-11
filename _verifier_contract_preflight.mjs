// VERIFIER CONTRACT PREFLIGHT. Provider-free, $0. No paid retry until this passes.
//
// WHY. Run 15's verifier made the CORRECT per-proposal judgement and the reply was still useless:
// finish_reason "length" at exactly 280 completion tokens, cut mid-'"tableau": {', so the greedy
// {…} salvage produced 832 chars that do not parse, _vP went null, and the legacy fallback took
// over. The contract could not be satisfied within its own token budget.
//
// THIS CONTROL ANSWERS ONE QUESTION: does a WORST-CASE two-proposal reply fit, and does the real
// parser consume it? It measures the serialized size against the configured max_tokens and drives
// the actual parse path, so the next paid run cannot repeat run 15.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
console.log('=== VERIFIER CONTRACT PREFLIGHT (provider-free, $0) ===\n');

// ── 1. THE CONSUMER AUDIT, asserted against the source ──────────────────────
// Every field is classified by whether anything but a console.log reads it.
console.log('1. consumer audit — what actually reads each verifier field');
const readsOutsideLog = (v) => {
  const lines = SRC.split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    if (!new RegExp('\\\\b' + v + '\\\\b').test(ln)) return;
    if (/^\s*\/\//.test(ln)) return;                 // comment
    if (/console\.(log|warn|error)/.test(ln)) return; // logging only
    if (new RegExp('var _delivery = .*' + v).test(ln)) return;   // the declaration line
    if (/_vP\.(tableau|dominant_replacement|transition_position|first_irreversible_position)/.test(ln)) return; // the parse line
    hits.push({ line: i + 1, text: ln.trim().slice(0, 90) });
  });
  return hits;
};
[['_tab (tableau)', '_tab'], ['_replacement (dominant_replacement)', '_replacement'],
 ['_txnPos (transition_position)', '_txnPos'], ['_firstIrrev (first_irreversible_position)', '_firstIrrev']
].forEach(([label, v]) => {
  const hits = readsOutsideLog(v).filter(h => h.line > 101000 && h.line < 101400);
  console.log('   ' + label + ': ' + (hits.length ? JSON.stringify(hits) : 'LOG-ONLY'));
  t('   ' + label + ' has no consumer beyond logging', hits.length === 0, JSON.stringify(hits));
});

console.log('\n   so the two Roman named are REMOVED from the requested contract');
t('tableau is no longer requested', !/tableau: \{ "setting"/.test(SRC));
t('dominant_replacement is no longer requested', !/dominant_replacement \(AUTHOR PRIORITY INDEX/.test(SRC));
t('  and the JSON example no longer shows them',
  /JSON: \{"delivery":"MISSED","transition_position":-1,"first_irreversible_position":-1\}/.test(SRC));
// KEPT DELIBERATELY: the position metrics are also log-only, but they are TELEMETRY Roman has
// relied on ("the pacing beat a reader actually feels"), they cost two integers, and dropping
// observability is a separate decision from fixing a capacity defect. Reported, not removed.
t('the position metrics are KEPT (telemetry, two integers)',
  /transition_position \(TRANSITION-POSITION METRIC/.test(SRC) && /first_irreversible_position \(PACING METRIC/.test(SRC));
t('slots_check is KEPT — it is genuinely consumed (forces MISSED)',
  /if \(_slotFail && _delivery === 'DELIVERED'\) \{ _delivery = 'MISSED'; \}/.test(SRC));
t('per_proposal is KEPT with verbatim evidence required',
  /PER-PROPOSAL DELIVERY \(judge EACH listed proposal INDEPENDENTLY/.test(SRC)
  && /must each be a verbatim quote from the prose/.test(SRC));
console.log('\n   and the per-proposal guard fields are REQUESTED');
t('each entry is asked for its own precondition_evidence',
  /"precondition_evidence": "<a VERBATIM substring of the SCENE PROSE showing the/.test(SRC));
t('  with the downgrade rule stated to the model',
  /whose "precondition_evidence" is empty is DOWNGRADED/.test(SRC)
  && /cannot have happened/.test(SRC));
t('each entry is asked for a reason naming the cause',
  /"reason": "delivered" \| "precondition_absent" \| "incomplete_rendering" \|/.test(SRC)
  && /"inconsistent"/.test(SRC));
t('  and the three non-delivery causes are defined',
  /"precondition_absent" = what it needed was not in the scene/.test(SRC)
  && /"incomplete_rendering" = it/.test(SRC)
  && /"inconsistent" = you cannot reconcile/.test(SRC));

// ── 2. THE BUDGET, measured against a worst-case reply ──────────────────────
console.log('\n2. does a WORST-CASE two-proposal reply fit the configured budget?');
const mt = SRC.match(/\], \{ max_tokens: (\d+), temperature: 0\.1 \}\);/);
const MAX_TOKENS = mt ? Number(mt[1]) : -1;
console.log('   configured max_tokens: ' + MAX_TOKENS);
// Roman specified "around 600-700", set BEFORE the precondition_evidence + reason fields existed.
// Those cost ~123 tokens on the pessimistic case (464 → 587), so 700 left 16% headroom. The bound
// is 900 and the DEVIATION IS DELIBERATE AND FLAGGED, not absorbed by relaxing the margin.
// The upper end moved from 1000 to 2400 when the contract was expanded with the milestone and
// prerequisite watch (Roman 2026-10-11). It is still a FIXED bound, and the headroom check below
// is what actually constrains it — not this range.
t('max_tokens is a fixed bound, and large enough for the guard fields',
  MAX_TOKENS >= 600 && MAX_TOKENS <= 1900, 'max_tokens=' + MAX_TOKENS);
t('  it exceeds the originally-stated 600-700 — recorded as a deviation',
  MAX_TOKENS > 700, 'max_tokens=' + MAX_TOKENS + ' (deliberate; see the comment at the call site)');

// A deliberately PESSIMISTIC reply: two proposals, long verbatim citations, full slots_check with
// long evidence in every slot, plus both position metrics and actual_exit_state.
const LONG = 'The Toll Road Commission received a formal demand to investigate the burning, entered '
  + 'in the book in a hand that did not shake, and the clerk did not look up as he took it from her.';
const WORST = {
  delivery: 'DELIVERED',
  transition_position: 42,
  first_irreversible_position: 42,
  // Each entry now carries its OWN precondition_evidence and a reason, per the guard added after
  // run 17. Both are long here, which is the pessimistic case for the budget.
  per_proposal: [
    { ref: 'prop:1234:1', delivery: 'DELIVERED', evidence: LONG,
      precondition_evidence: LONG, reason: 'delivered' },
    { ref: 'prop:1234:2', delivery: 'DELIVERED', evidence: LONG,
      precondition_evidence: LONG, reason: 'delivered' }
  ],
  slots_check: {
    precondition_evidence: LONG, actor_evidence: LONG, action_evidence: LONG,
    target_evidence: LONG, exit_state_evidence: LONG, occurred_this_scene: true
  },
  actual_exit_state: 'the sealed demand now sits in the commission\'s possession',
  // ── THE EXPANDED CONTRACT (Roman 2026-10-11) ──
  // The verifier now also answers about watched milestones and prerequisites. Entries whose
  // status would be "not_present" are OMITTED by the contract, so the pessimistic case is not
  // "every watched item" but "every watched item the model has something to say about" — taken
  // here as ALL of them, with long quotations, which is the worst a compliant reply can be.
  // The contract bounds the REPLY to at most 4 milestone and 3 prerequisite entries, and bounds
  // each entry: ONE quotation of at most 160 chars, bare names, and a scope of at most 80. The
  // pessimistic case is measured at exactly those limits.
  milestone_watch: [1, 2, 3, 4].map(function (i) {
    return { n: 10 + i, status: 'delivered_on_page', evidence: LONG.slice(0, 160),
             participants: ['Julian', 'the presiding Dohkar'],
             scope: 'the Chayr, two Dohkars and the assembled First Favored present at the rite'.slice(0, 80) };
  }),
  prereq_watch: [1, 2, 3].map(function (i) {
    return { id: 'prereq:some_named_condition_' + i, status: 'invalidated_on_page', evidence: LONG.slice(0, 160),
             participants: ['Julian'], scope: 'the whole assembly and the seated panel'.slice(0, 80) };
  })
};
const worstJson = JSON.stringify(WORST, null, 2);
// The app's own estimator: 4.0 chars/token (see _fsc_cost_guard.mjs).
const estTokens = Math.ceil(worstJson.length / 4);
console.log('   worst-case reply: ' + worstJson.length + ' chars ≈ ' + estTokens + ' tokens'
  + '  (includes ' + WORST.milestone_watch.length + ' milestone + ' + WORST.prereq_watch.length + ' prerequisite entries)');
t('the worst case fits inside max_tokens', estTokens < MAX_TOKENS,
  estTokens + ' tokens vs max_tokens ' + MAX_TOKENS);
t('  with at least 25% headroom', estTokens < MAX_TOKENS * 0.75,
  'headroom=' + Math.round((1 - estTokens / MAX_TOKENS) * 100) + '%');
// And the shape that FAILED: run 15's reply, with tableau and dominant_replacement restored.
const WITH_LEGACY = Object.assign({}, WORST, {
  dominant_replacement: 'relationship_dialogue',
  tableau: { setting: 'the commission chamber at dusk, braziers guttering', charactersPresent: ['Wren', 'the clerk'],
    protagonistStatus: 'waiting for an answer she cannot compel', decisiveChange: null,
    activeInterlocutor: 'the clerk', protagonistAlone: false }
});
const legacyTokens = Math.ceil(JSON.stringify(WITH_LEGACY, null, 2).length / 4);
console.log('   the SAME reply with tableau + dominant_replacement: ≈ ' + legacyTokens + ' tokens');
t('removing them saved real budget', legacyTokens > estTokens,
  'trimmed=' + estTokens + ' untrimmed=' + legacyTokens);
t('  and the untrimmed shape would NOT have fit the old 280 budget', legacyTokens > 280,
  legacyTokens + ' tokens vs the old 280 — which is why run 15 truncated');

// ── 3. THE REAL PARSER CONSUMES IT ──────────────────────────────────────────
console.log('\n3. the real parse + adjudication path consumes a worst-case reply');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._adjudicateSceneProposals === 'function', { timeout: 20000 });

const r = await page.evaluate(({ worstJson, LONG }) => {
  const out = {};
  const scene = 1300;
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  delete window.state._starterId;
  window.state.storyId = 'story-vcp';
  window.state.playerName = 'Wren';
  window.state.loveInterestName = 'Cassel';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state.turnCount = scene;
  window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-vcp' };
  const sc = window._sealProposal({ kind: 'state_change', scene: scene, fact: LONG });
  const ct = window._processContinuationProposal({
    scene_purpose: 'Put the demand before a body that can act.',
    forward_pressure: 'The Toll Road Commission will convene over the demand.',
    pressure_scope: 'durable', derivation: 'The player sent sealed word to the commission.',
    introduces: [{ kind: 'institution', label: 'Toll Road Commission',
      aliases: ['the commission', 'the governing commission'],
      justification: 'The body the player addressed.', future_relevance: 'It will convene.' }],
    existingRefs: [],
    canon_change: { tier: 2, targets: ['Toll Road Commission'], content: LONG }
  }, { scene: scene });
  out.refs = { sc: sc ? sc.id : null, ct: ct.sealedId || null };

  // THE REAL PARSE, exactly as _commitScene does it — including a markdown-fenced reply, which is
  // what run 15's model actually returned.
  const fenced = '```json\n' + worstJson + '\n```';
  const parse = (raw) => {
    let vP; try { vP = JSON.parse(raw); } catch (e) {
      const m = String(raw || '').match(/\{[\s\S]*\}/);
      if (m) { try { vP = JSON.parse(m[0]); } catch (_) {} }
    }
    return vP || null;
  };
  const vP = parse(fenced);
  out.parsedFenced = !!vP;
  out.hasPerProposal = !!(vP && Array.isArray(vP.per_proposal));
  // Point the refs at this scene's real ids, then drive the REAL adjudication loop.
  if (vP && Array.isArray(vP.per_proposal)) {
    vP.per_proposal[0].ref = out.refs.sc;
    vP.per_proposal[1].ref = out.refs.ct;
  }
  const pend = window._pendingSealedForScene(scene);
  const res = window._adjudicateSceneProposals(pend, vP && vP.per_proposal, LONG,
    { scene: scene, legacyDelivery: 'MISSED', legacyStateChangeRef: out.refs.sc });
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  out.verdicts = res.verdicts;
  out.facts = cs.facts.map(f => ({ ref: f.proposalRef, prov: f.provenanceLink }));
  out.activated = Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
    .map(k => ({ label: reg[k].label, aliases: reg[k].aliases || [] }));

  // AND THE TRUNCATED SHAPE run 15 actually produced must still fail CLOSED.
  const truncated = fenced.slice(0, 1002);
  out.truncatedParses = !!parse(truncated);

  // RUN 17'S EXACT SHAPE, through the real adjudicator: a per-proposal DELIVERED with an EMPTY
  // shared slots_check precondition. Before the guard this committed; it must now refuse.
  const scene2 = scene + 1;
  window.state.turnCount = scene2;
  window.state._scenePosture[String(scene2)] = { hash: 'ph-vcp-2' };
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._relationshipLedger = null;
  const sc2 = window._sealProposal({ kind: 'state_change', scene: scene2, fact: LONG });
  const pend2 = window._pendingSealedForScene(scene2);
  const res2 = window._adjudicateSceneProposals(pend2,
    [{ ref: sc2.id, delivery: 'DELIVERED', evidence: LONG }], LONG,
    { scene: scene2, sharedSlots: { precondition_evidence: '', occurred_this_scene: true },
      legacyDelivery: 'MISSED', legacyStateChangeRef: sc2.id });
  out.run17Shape = { verdict: res2.verdicts[sc2.id] || null,
    facts: window._ensureCommittedState().facts.length };
  return out;
}, { worstJson, LONG });
await browser.close();

t('a markdown-FENCED worst-case reply parses', r.parsedFenced === true);
t('  with per_proposal intact', r.hasPerProposal === true);
t('both proposals were adjudicated by their own refs',
  !!(r.verdicts[r.refs.sc] && r.verdicts[r.refs.ct]), JSON.stringify(Object.keys(r.verdicts)));
t('  both committed', r.facts.length === 2 && r.facts.every(f => f.prov === 'sealed'),
  JSON.stringify(r.facts));
t('  and the institution activated with its aliases',
  r.activated.length === 1 && (r.activated[0].aliases || []).length === 2,
  JSON.stringify(r.activated));
t('a TRUNCATED reply still does not parse — the failure mode stays fail-closed',
  r.truncatedParses === false, 'a truncated reply parsed, which would be worse than run 15');

console.log('\n4. RUN 17\'s EXACT SHAPE now refuses');
console.log('   ' + JSON.stringify(r.run17Shape));
t('a per-proposal DELIVERED with an EMPTY shared precondition is NOT committed',
  r.run17Shape.verdict && r.run17Shape.verdict.commit === false,
  JSON.stringify(r.run17Shape.verdict));
t('  flagged as a downgrade, source shared_slots_check',
  r.run17Shape.verdict && r.run17Shape.verdict.downgraded === true
  && r.run17Shape.verdict.preconditionSource === 'shared_slots_check',
  JSON.stringify(r.run17Shape.verdict));
t('  and nothing entered canon', r.run17Shape.facts === 0, 'facts=' + r.run17Shape.facts);

console.log('\n5. scope');
console.log('   This measures SERIALIZATION and PARSE capacity, not model behaviour. Run 15 already');
console.log('   showed the live verifier produces a correct per_proposal judgement; what it could');
console.log('   not do was fit it in 280 tokens. Whether a live reply now fits is the one thing the');
console.log('   next paid run measures.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
