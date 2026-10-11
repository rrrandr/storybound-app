// ── THE CAPTURED SCENE, REPLAYED THROUGH THE PRODUCTION COMMIT PATH ($0, provider-free) ─────
// Not a helper harness: this calls the shipped window._commitScene with the REAL captured prose and
// a REAL captured proposal, serves the verifier reply shape the paid run actually produced, and then
// drives the shipped planner builder to show the sealed fact arriving in the NEXT planner request.
// Measured source: _fs_live_out/run_2026-10-10T13-32-11-777Z, story Scene 4 (CG scene 3), where the
// verifier said DELIVERED, the slot check PASSED with a verbatim exit quote, and the per-proposal
// evidence was a paraphrase - so nothing committed and COMMITTED WORLD STATE stayed [] all run.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

// The prose exactly as the run committed it.
const fin = JSON.parse(fs.readFileSync(
  '_fs_live_out/run_2026-10-10T13-32-11-777Z/final.json', 'utf8'));
const PROSE = String(fin.texts[2].text);                    // CG scene 3 = story Scene 4
const VERBATIM_EXIT = 'While the inquiry proceeds you will remain under supervision.';
const PARAPHRASE = 'The Dohkar placed Lirael under supervision while the inquiry proceeds.';

// The proposal the planner actually produced for that scene, from the captured fixture.
const cap = JSON.parse(fs.readFileSync('_runner_fixtures/paid_replay.json', 'utf8'));
const capturedPlan = JSON.parse(JSON.parse(
  cap.byMatch['SCENE-SPINE planner|local_objective'].body).choices[0].message.content);

// The verifier reply shape from the run: DELIVERED, paraphrased per-proposal evidence, and a slot
// check that affirms the occurrence with a verbatim exit quote.
const verifierReply = (opts) => JSON.stringify({
  model: 'ministral-8b-2512', resolvedModel: 'ministral-8b-2512', upstreamAttempts: 1,
  choices: [{ message: { content: JSON.stringify({
    delivery: 'DELIVERED',
    slots_check: {
      occurred_this_scene: opts.occurred,
      precondition_evidence: VERBATIM_EXIT,
      actor_evidence: 'The presiding Dohkar steps forward, voice cutting through the grass.',
      action_evidence: 'THE PRESIDING DOHKAR: "Lirael, your conduct at this rite is under investigation."',
      target_evidence: 'The words land like a hand on my shoulder.',
      exit_state_evidence: opts.exitQuote
    },
    per_proposal: [{ ref: opts.ref, delivery: 'DELIVERED', reason: 'delivered',
      evidence: PARAPHRASE, precondition_evidence: VERBATIM_EXIT }]
  }) } }],
  usage: { prompt_tokens: 9000, completion_tokens: 300, cached_tokens: 0, cost_in_usd_ticks: 0 }
});

console.log('=== CAPTURED SCENE REPLAYED THROUGH THE PRODUCTION COMMIT PATH ($0) ===\n');
const browser = await chromium.launch();
const page = await browser.newPage();

let verifierOpts = { occurred: true, exitQuote: VERBATIM_EXIT, ref: 'prop:4:1' };
const plannerRequests = [];
await page.route('**/api/**', async (route) => {
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String((body.messages || [])[0]?.content || '');
  if (/RUNTIME COMMIT verifier/i.test(sys)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: verifierReply(verifierOpts) });
  }
  if (/SCENE-SPINE planner/i.test(sys)) {
    plannerRequests.push((body.messages || []).map(m => String(m.content || '')).join('\n'));
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ model: 'grok-4.3', resolvedModel: 'grok-4.3', upstreamAttempts: 1,
        choices: [{ message: { content: JSON.stringify(capturedPlan) } }],
        usage: { prompt_tokens: 100, completion_tokens: 10, cached_tokens: 0, cost_in_usd_ticks: 0 } }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._commitScene === 'function'
  && typeof window._ensureCommittedState === 'function', { timeout: 30000 });
t('the shipped window._commitScene is present', true);

// Drive the REAL commit path with the REAL proposal and prose.
const commit = async (ref, sceneNum) => page.evaluate(async (v) => {
  window._committedStateV0 = true;
  const cs = window._ensureCommittedState();
  cs.facts = []; cs.pendingIntent = { proposed: v.plan.state_change }; cs._committedThroughScene = null;
  try { window.state._sealedProposals = { seq: 0, byId: {}, byInvocation: {} }; } catch (_) {}
  const sealed = window._sealProposal({ kind: 'state_change', fact: v.plan.state_change,
    scene: v.sceneNum, anchors: null });
  const proposal = Object.assign({}, v.plan, {
    event: v.plan.state_change, proposalRef: (sealed && sealed.id) || v.ref, kind: 'state_change'
  });
  await window._commitScene(v.prose, proposal, v.sceneNum);
  const out = window._ensureCommittedState();
  return {
    sealedRef: window.__replaySealedRef || null,
    facts: (out.facts || []).map(f => (typeof f === 'string' ? f : (f && (f.text || f.fact || JSON.stringify(f))))),
    pendingIntent: out.pendingIntent ? {
      proposed: String(out.pendingIntent.proposed || '').slice(0, 60),
      lastStatus: out.pendingIntent.lastStatus || null,
      lastReason: out.pendingIntent.lastReason || null
    } : null
  };
}, { prose: PROSE, plan: capturedPlan, ref, sceneNum });

// ── 1. THE MEASURED CASE NOW COMMITS ────────────────────────────────────────────────────────
verifierOpts = { occurred: true, exitQuote: VERBATIM_EXIT, ref: 'prop:4:1' };
const good = await commit('prop:4:1', 4);
console.log('      committed facts -> ' + JSON.stringify(good.facts));
console.log('      pendingIntent   -> ' + JSON.stringify(good.pendingIntent));
t('the intended sealed fact ENTERS committed state', good.facts.length >= 1, JSON.stringify(good));
t('and the pending intent is cleared, not left as a debt',
  good.pendingIntent === null || !good.pendingIntent.proposed, JSON.stringify(good.pendingIntent));

// ── 2. AND IT REACHES THE NEXT PLANNER REQUEST ──────────────────────────────────────────────
plannerRequests.length = 0;
const planned = await page.evaluate(async () => {
  try {
    if (typeof window._generateLiteraryPlotContract !== 'function') return 'no planner fn';
    await window._generateLiteraryPlotContract('', '', null, null);
    return 'ok';
  } catch (e) { return 'threw: ' + String(e && e.message); }
});
const withFact = plannerRequests.filter(r => /COMMITTED WORLD STATE/.test(r)
  && !/COMMITTED WORLD STATE[^\n]*\[\]/.test(r));
console.log('      planner requests captured: ' + plannerRequests.length + ' (' + planned + ')');
if (plannerRequests.length) {
  const m = plannerRequests[0].match(/COMMITTED WORLD STATE[^\n]{0,220}/);
  console.log('      ' + (m ? m[0] : 'no COMMITTED WORLD STATE line'));
}
t('the committed fact REACHES the next planner request (not an empty list)',
  withFact.length >= 1, 'captured ' + plannerRequests.length + ' request(s)');

// ── 3. A CONTRADICTORY SHARED SLOT CHECK MUST NOT COMMIT ────────────────────────────────────
verifierOpts = { occurred: false, exitQuote: VERBATIM_EXIT, ref: 'prop:5:1' };
const contra = await commit('prop:5:1', 5);
console.log('      contradictory   -> facts=' + JSON.stringify(contra.facts)
  + ' pending=' + JSON.stringify(contra.pendingIntent));
t('occurred_this_scene=false does NOT commit, even with a verbatim exit quote',
  contra.facts.length === 0, JSON.stringify(contra));
t('and it is NOT recorded as unverifiable - the check said it did not occur',
  !contra.pendingIntent || contra.pendingIntent.lastReason !== 'evidence_unverifiable',
  JSON.stringify(contra.pendingIntent));

// ── 4. NO VERBATIM QUOTE ANYWHERE -> UNVERIFIED, AND NAMED AS SUCH ──────────────────────────
verifierOpts = { occurred: true, exitQuote: PARAPHRASE, ref: 'prop:6:1' };
const unver = await commit('prop:6:1', 6);
console.log('      unverifiable    -> facts=' + JSON.stringify(unver.facts)
  + ' pending=' + JSON.stringify(unver.pendingIntent));
t('with no verbatim quote anywhere nothing commits',
  unver.facts.length === 0, JSON.stringify(unver));
t('and the pending intent records evidence_unverifiable, not verified non-delivery',
  !!(unver.pendingIntent && unver.pendingIntent.lastReason === 'evidence_unverifiable'),
  JSON.stringify(unver.pendingIntent));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
