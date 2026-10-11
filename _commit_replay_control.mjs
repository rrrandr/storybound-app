// ── THE CAPTURED SCENE, REPLAYED THROUGH THE PRODUCTION COMMIT PATH ($0, provider-free) ─────
// CORRECTED. The first version of this control took its prose from the latest run's story Scene 4
// but its PROPOSAL from _runner_fixtures/paid_replay.json - a different scene from a different run,
// about Seren's family demanding remedy, an event that prose does not contain. It also substituted
// hand-picked actor/action citations for the verifier's real ones. Both made the "proof" worthless.
// Everything below now comes from ONE scene of ONE run:
//   wire/032_res.json  the planner proposal, with its own event_slots
//   wire/037_res.json  the verifier response, used VERBATIM - no substitutions
//   final.json         the prose the verifier actually judged
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};
const D = '_fs_live_out/run_2026-10-10T13-32-11-777Z';
const unfence = (x) => String(x || '').replace(/^```json\s*/i, '').replace(/```\s*$/, '');

const PLAN = JSON.parse(unfence(
  JSON.parse(fs.readFileSync(D + '/wire/032_res.json', 'utf8')).choices[0].message.content));
const VERIF = JSON.parse(unfence(
  JSON.parse(fs.readFileSync(D + '/wire/037_res.json', 'utf8')).choices[0].message.content));
const PROSE = String(JSON.parse(fs.readFileSync(D + '/final.json', 'utf8')).texts[2].text);
const REF = VERIF.per_proposal[0].ref;                       // 'prop:3:3', as captured
const es = PLAN.event_slots || {};
const SLOTS = {
  precondition: String(es.precondition || '').trim(), actor: String(es.actor || '').trim(),
  action: String(es.action || '').trim(), target: String(es.target || '').trim(),
  exitState: String(es.exit_state || '').trim()
};

console.log('=== THE CAPTURED SCENE THROUGH THE PRODUCTION COMMIT PATH ($0) ===\n');
console.log('  proposal (032_res): ' + PLAN.state_change);
console.log('  required target   : ' + (SLOTS.target || '(none)'));
console.log('  verifier (037_res): delivery=' + VERIF.per_proposal[0].delivery
  + ' occurred_this_scene=' + VERIF.slots_check.occurred_this_scene + '\n');

const browser = await chromium.launch();
const page = await browser.newPage();
let reply = null;
const plannerRequests = [];
await page.route('**/api/**', async (route) => {
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String((body.messages || [])[0]?.content || '');
  if (/RUNTIME COMMIT verifier/i.test(sys)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ model: 'ministral-8b-2512', resolvedModel: 'ministral-8b-2512',
        upstreamAttempts: 1, choices: [{ message: { content: JSON.stringify(reply) } }],
        usage: { prompt_tokens: 9000, completion_tokens: 300, cached_tokens: 0, cost_in_usd_ticks: 0 } }) });
  }
  if (/SCENE-SPINE planner/i.test(sys)) {
    plannerRequests.push((body.messages || []).map(m => String(m.content || '')).join('\n'));
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ model: 'grok-4.3', resolvedModel: 'grok-4.3', upstreamAttempts: 1,
        choices: [{ message: { content: JSON.stringify(PLAN) } }],
        usage: { prompt_tokens: 100, completion_tokens: 10, cached_tokens: 0, cost_in_usd_ticks: 0 } }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._commitScene === 'function'
  && typeof window._sealProposal === 'function', { timeout: 30000 });
t('the shipped window._commitScene and window._sealProposal are present', true);

// The anchors production seals with, derived from the proposal's own slots - not null.
const commit = (sceneNum) => page.evaluate(async (v) => {
  window._committedStateV0 = true;
  const cs = window._ensureCommittedState();
  cs.facts = []; cs.pendingIntent = { proposed: v.plan.state_change }; cs._committedThroughScene = null;
  try {
    var _seq = Math.max(0, Number(String(v.ref).split(':')[2] || 1) - 1);
    window.state._sealedProposals = { seq: _seq, byId: {}, byInvocation: {} };
  } catch (_) {}
  // Exactly production's call for a state_change: no anchors are supplied there.
  const sealed = window._sealProposal({ kind: 'state_change', fact: v.plan.state_change,
    milestone: '', scene: v.sceneNum });
  const proposal = Object.assign({}, v.plan, {
    event: v.plan.state_change, proposalRef: (sealed && sealed.id) || null,
    kind: 'state_change', slots: v.slots
  });
  await window._commitScene(v.prose, proposal, v.sceneNum);
  const out = window._ensureCommittedState();
  return {
    sealedRef: (sealed && sealed.id) || null,
    sealedAnchors: (sealed && Array.isArray(sealed.anchors)) ? sealed.anchors.length : null,
    sealedKeys: sealed ? Object.keys(sealed).sort().join(',') : null,
    facts: (out.facts || []).map(f => (typeof f === 'string' ? f : (f && (f.text || f.fact || '')))),
    pending: out.pendingIntent ? { lastStatus: out.pendingIntent.lastStatus || null,
      lastReason: out.pendingIntent.lastReason || null } : null
  };
}, { prose: PROSE, plan: PLAN, slots: SLOTS, sceneNum: 3, ref: REF });

// ── 1. THE ACTUAL CAPTURED RESPONSE, UNALTERED ──────────────────────────────────────────────
reply = VERIF;
const real = await commit(3);
console.log('  sealed ref: ' + real.sealedRef + ' (captured ref: ' + REF + ')');
console.log('  facts: ' + JSON.stringify(real.facts) + '  pending: ' + JSON.stringify(real.pending));
t('the sealed ref matches the ref the captured verifier reported',
  real.sealedRef === REF, real.sealedRef + ' vs ' + REF);
console.log('  sealed record: anchors=' + real.sealedAnchors + ' fields=' + real.sealedKeys);
t('the sealed record has NO anchors, as production seals a state_change',
  real.sealedAnchors === 0, 'anchors=' + real.sealedAnchors);
// The citations stitch two NON-ADJACENT passages, dropping "The words land like a hand on my
// shoulder." between them. That is genuinely not verbatim, so the honest outcome is a refusal.
t('the ACTUAL captured case does NOT commit — its citations are not verbatim',
  real.facts.length === 0, JSON.stringify(real.facts));
t('and it is classified as an unverifiable CITATION, not as the event not happening',
  !!(real.pending && /unverifiable/.test(String(real.pending.lastReason))),
  JSON.stringify(real.pending));

// ── 2. THE SAME PATH WITH CONTIGUOUS CITATIONS (CONSTRUCTED, AND LABELLED AS SUCH) ──────────
// Identical in every other respect; only the evidence strings are replaced with spans that appear
// contiguously in the prose, to show the commit path works when the verifier cites properly.
const contiguous = JSON.parse(JSON.stringify(VERIF));
const ACTOR = 'The presiding Dohkar steps forward, voice cutting through the grass.';
const ACTION = 'THE PRESIDING DOHKAR: "Lirael, your conduct at this rite is under investigation."';
const TARGET = 'The words land like a hand on my shoulder.';
contiguous.per_proposal[0].evidence = ACTION;
contiguous.slots_check.actor_evidence = ACTOR;
contiguous.slots_check.action_evidence = ACTION;
contiguous.slots_check.target_evidence = TARGET;
reply = contiguous;
plannerRequests.length = 0;
const good = await commit(3);
console.log('\n  [constructed contiguous citations]');
console.log('  facts: ' + JSON.stringify(good.facts));
t('with CONTIGUOUS citations the intended fact commits',
  good.facts.length === 1 && good.facts[0] === PLAN.state_change,
  JSON.stringify(good.facts) + ' vs ' + PLAN.state_change);

await page.evaluate(async () => {
  try { await window._generateLiteraryPlotContract('', '', null, null); } catch (_) {}
});
const committedLine = (r) => {
  const m = String(r).match(/COMMITTED WORLD STATE[^\n]*/);
  return m ? m[0] : '';
};
const exact = plannerRequests.filter(r => committedLine(r).indexOf(PLAN.state_change) !== -1);
const line = plannerRequests.length
  ? (plannerRequests[0].match(/COMMITTED WORLD STATE[^\n]{0,200}/) || [''])[0] : '';
console.log('  ' + line);
t('the EXACT intended fact text appears IN the COMMITTED WORLD STATE line of the next planner request',
  exact.length >= 1, 'captured ' + plannerRequests.length + ' request(s); line: ' + line);

// ── 2b. A COMPLIANT MULTI-SPAN RESPONSE (CONSTRUCTED) COMMITS ───────────────────────────────
// The captured 037 citation joined two separated passages. Under the corrected contract the same
// support is supplied as an ARRAY of contiguous spans. Each is checked on its own; nothing here
// splits the captured string.
const spans = JSON.parse(JSON.stringify(VERIF));
spans.per_proposal[0].evidence = [
  'THE PRESIDING DOHKAR: "Lirael, your conduct at this rite is under investigation."',
  'THE PRESIDING DOHKAR: "The Provast has demanded a review of your actions."'
];
spans.slots_check.actor_evidence = spans.per_proposal[0].evidence;
spans.slots_check.action_evidence = spans.per_proposal[0].evidence;
spans.slots_check.target_evidence = 'The words land like a hand on my shoulder.';
reply = spans;
const multi = await commit(3);
console.log('\n  [constructed COMPLIANT multi-span response]');
console.log('  facts: ' + JSON.stringify(multi.facts));
t('a multi-span response whose every span verifies COMMITS the intended fact',
  multi.facts.length === 1 && multi.facts[0] === PLAN.state_change, JSON.stringify(multi.facts));

// 2c. AND A STITCHED STRING IS STILL REFUSED - nothing splits it to make it fit.
const stitched = JSON.parse(JSON.stringify(spans));
const joined = spans.per_proposal[0].evidence.join('\\n\\n');
stitched.per_proposal[0].evidence = joined;
stitched.slots_check.actor_evidence = joined;
stitched.slots_check.action_evidence = joined;
stitched.slots_check.exit_state_evidence = joined;
reply = stitched;
const stitchRes = await commit(3);
t('the same support JOINED into one string is still refused everywhere',
  stitchRes.facts.length === 0, JSON.stringify(stitchRes.facts));

// ── 3. A REQUIRED TARGET THAT IS NOT CITED MUST BLOCK THE SHARED FALLBACK ───────────────────
const noTarget = JSON.parse(JSON.stringify(contiguous));
noTarget.per_proposal[0].evidence = 'a paraphrase that appears nowhere in this scene at all';
noTarget.slots_check.target_evidence = '';
reply = noTarget;
const blocked = await commit(3);
console.log('\n  [required target not cited] facts: ' + JSON.stringify(blocked.facts));
t('a required target with no citation blocks the shared fallback',
  SLOTS.target ? blocked.facts.length === 0 : true,
  'target required=' + JSON.stringify(SLOTS.target) + ' facts=' + JSON.stringify(blocked.facts));

// ── 4. NO REPORT FOR THE REF IS NOT A FINDING OF NON-DELIVERY ───────────────────────────────
const unreported = JSON.parse(JSON.stringify(contiguous));
unreported.per_proposal = [];
reply = unreported;
const unrep = await commit(3);
console.log('  [no per-proposal report] pending: ' + JSON.stringify(unrep.pending));
t('an absent per-proposal report is recorded as unreported, not as verified non-delivery',
  unrep.facts.length === 0
  && !!(unrep.pending && String(unrep.pending.lastReason) === 'unreported'),
  JSON.stringify(unrep.pending));

// ── 5. AN UNEXPECTED STATUS IS INDETERMINATE, NOT NON-DELIVERY ──────────────────────────────
const weird = JSON.parse(JSON.stringify(spans));
weird.per_proposal[0].delivery = 'SOMETHING_ELSE';
reply = weird;
const odd = await commit(3);
console.log('  [unexpected status] pending: ' + JSON.stringify(odd.pending));
t('an unexpected delivery status commits nothing and is not called non-delivery',
  odd.facts.length === 0
  && !!(odd.pending && String(odd.pending.lastStatus).toUpperCase() !== 'MISSED'
        && String(odd.pending.lastReason || '') !== 'verified_not_delivered'),
  JSON.stringify(odd.pending));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
