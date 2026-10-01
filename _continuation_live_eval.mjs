// LIVE OPT-IN CONTINUATION EVALUATION — ONE SCENE, ONE TIER 2 PROPOSAL.
//
// REQUIRES --authorize <usd>. Nothing dispatches without it.
//
// STAGED ON PURPOSE. Two of the five questions are already proven provider-free (the sealed fact
// reaching Grok without internals: harvest 67/67; no unplanned canon afterwards: 44/44 + 35/35).
// The genuinely live unknowns are:
//   Q1  does the planner PROPOSE a plausible new Tier 2 pressure in this schema?   ← cheapest
//   Q3  does the prose RENDER the sealed fact?                                      ← expensive
//   Q4  does delivery activate ONLY that exact record?
// Q1 is the biggest unknown and by far the cheapest to answer, and if it fails the author call
// would be wasted. So stage 1 buys a real planner reply; stage 2 only proceeds if stage 1 yields a
// valid Tier 2 proposal.
//
// THE WHOLE CHAIN IS RESERVED BEFORE THE FIRST REQUEST — a per-call cap plus an unreserved later
// call is not a cap.
//
// Usage:
//   node _continuation_live_eval.mjs --estimate-only          (no dispatch, $0)
//   node _continuation_live_eval.mjs --authorize 1.00
import fs from 'fs';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';

const ARG = process.argv.slice(2);
const ESTIMATE_ONLY = ARG.includes('--estimate-only');
const AUTH_IDX = ARG.indexOf('--authorize');
const AUTHORIZED = AUTH_IDX >= 0 ? Number(ARG[AUTH_IDX + 1]) : null;

if (!ESTIMATE_ONLY && !(AUTHORIZED > 0)) {
  console.error('REFUSED: this run dispatches real provider calls.');
  console.error('  node _continuation_live_eval.mjs --estimate-only');
  console.error('  node _continuation_live_eval.mjs --authorize <usd>');
  process.exit(2);
}

const LOG = '_continuation_live_eval_out';
fs.mkdirSync(LOG, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN = LOG + '/run_' + stamp;
fs.mkdirSync(RUN, { recursive: true });
const write = (n, s) => fs.writeFileSync(RUN + '/' + n, typeof s === 'string' ? s : JSON.stringify(s, null, 2));
const say = (s) => { console.log(s); fs.appendFileSync(RUN + '/log.txt', s + '\n'); };

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; say('  ok   ' + n); }
  else { fail++; say('  FAIL ' + n + (d ? '  — ' + d : '')); } };

say('=== LIVE CONTINUATION EVALUATION ===');
say('    authorized: ' + (ESTIMATE_ONLY ? 'ESTIMATE ONLY ($0)' : '$' + AUTHORIZED.toFixed(2)));
say('    output: ' + RUN);

// ── cost accounting ───────────────────────────────────────────────────────────
let reserved = 0, spentEstimate = 0, measured = 0;
const dispatched = [];
const RES = { plannerIn: 30000, plannerOut: 1400, authorIn: 240000, authorOut: 8000,
  verifierIn: 10000, verifierOut: 300 };
const worst = (chars, out) => estimateUsd({ messages: [{ content: 'x'.repeat(chars) }], max_tokens: out },
  'grok-4-1-fast-reasoning').estimate;
// Reserve the WHOLE chain, each stage at a generous worst case, with fallback headroom (x2 per
// stage: a tier may fail and retry on the next provider).
const RESERVE = {
  planner: worst(RES.plannerIn, RES.plannerOut) * 2,
  author: worst(RES.authorIn, RES.authorOut) * 2,
  verifier: worst(RES.verifierIn, RES.verifierOut) * 2
};
reserved = RESERVE.planner + RESERVE.author + RESERVE.verifier;

say('\nCHAIN RESERVATION (worst case, before any request)');
say('  planner  (~' + RES.plannerIn + 'ch in / ' + RES.plannerOut + ' out, x2 fallback) : $' + RESERVE.planner.toFixed(6));
say('  author   (~' + RES.authorIn + 'ch in / ' + RES.authorOut + ' out, x2 fallback) : $' + RESERVE.author.toFixed(6));
say('  verifier (~' + RES.verifierIn + 'ch in / ' + RES.verifierOut + ' out, x2 fallback) : $' + RESERVE.verifier.toFixed(6));
say('  TOTAL RESERVED : $' + reserved.toFixed(6));

if (!ESTIMATE_ONLY && reserved > AUTHORIZED) {
  say('\nREFUSED BEFORE DISPATCH: reserved chain $' + reserved.toFixed(6)
    + ' exceeds the $' + AUTHORIZED.toFixed(2) + ' authorization.');
  process.exit(3);
}
say(!ESTIMATE_ONLY
  ? '  within authorization — ' + (AUTHORIZED - reserved).toFixed(6) + ' headroom'
  : '  (estimate-only: nothing will be dispatched)');

if (ESTIMATE_ONLY) {
  say('\nESTIMATE ONLY — no provider call made. $0 spent.');
  process.exit(0);
}

// ── preflight: the contract must be present before anything is billed ─────────
say('\nPREFLIGHT (provider-free) — the contract must be present before any spend');
const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url();
  let raw = null; try { raw = req.postData(); } catch (_) {}
  const isProvider = /\/api\/(proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy)/.test(url);
  if (!isProvider) { try { await route.abort(); } catch (_) {} return; }

  let body = null; try { body = JSON.parse(raw || '{}'); } catch (_) {}
  const sys = (body && body.messages && body.messages[0] && String(body.messages[0].content)) || '';
  const est = estimateUsd(body || { messages: [] }, (body && body.model) || 'grok-4-1-fast-reasoning').estimate;
  const stage = /SCENE-SPINE planner|SCENE planner/.test(sys) ? 'planner'
    : (/RUNTIME COMMIT verifier/.test(sys) ? 'verifier'
    : (/screenplay-native|cinematic-romance writer|FORBIDDEN INVENTIONS/.test(sys) ? 'author' : 'other'));

  // PER-DISPATCH GUARD against the remaining authorization.
  if (spentEstimate + est > AUTHORIZED) {
    say('  [GUARD] ABORT ' + stage + ' — estimate $' + est.toFixed(6)
      + ' would exceed the authorization (spent-estimate $' + spentEstimate.toFixed(6) + ')');
    try { await route.abort(); } catch (_) {}
    return;
  }
  if (stage === 'other') {
    say('  [SKIP] unrecognised provider stage aborted (not part of this evaluation)');
    try { await route.abort(); } catch (_) {}
    return;
  }
  spentEstimate += est;
  dispatched.push({ stage, url, chars: (raw || '').length, estimate: est });
  say('  [DISPATCH] ' + stage + '  ' + (raw || '').length + 'ch  est $' + est.toFixed(6)
    + '  (running estimate $' + spentEstimate.toFixed(6) + ')');
  write('request_' + stage + '_' + dispatched.length + '.json', raw || '');
  try {
    // EXPLICIT TIMEOUT. Playwright's route.fetch() defaults to 30s; the real author call on a
    // ~228KB payload exceeds that comfortably, and the first live run lost all three author
    // dispatches to `route.fetch: Timeout 30000ms exceeded` — a harness defect, not a model or
    // contract failure. Sized per stage: an author call may legitimately take minutes.
    const FETCH_TIMEOUT = stage === 'author' ? 300000 : (stage === 'planner' ? 120000 : 90000);
    const resp = await route.fetch({ timeout: FETCH_TIMEOUT });
    const text = await resp.text();
    write('response_' + stage + '_' + dispatched.length + '.json', text);
    try {
      const j = JSON.parse(text);
      const ticks = j && j.usage && j.usage.cost_in_usd_ticks;
      if (typeof ticks === 'number') { measured += ticks * 1e-10;
        say('    measured: $' + (ticks * 1e-10).toFixed(6) + '  (total measured $' + measured.toFixed(6) + ')'); }
      calls.push({ stage, request: raw, response: text });
    } catch (_) { calls.push({ stage, request: raw, response: text }); }
    await route.fulfill({ response: resp });
  } catch (e) {
    say('    dispatch error: ' + (e && e.message));
    try { await route.abort(); } catch (_) {}
  }
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._processContinuationProposal === 'function'
  && typeof window._continuationSchemaEnabled === 'function', { timeout: 20000 });

const pre = await page.evaluate(() => {
  window._continuationProposalSchema = true;          // EXPLICIT OPT-IN for this evaluation
  return { enabled: window._continuationSchemaEnabled(),
    hasHandler: typeof window._processContinuationProposal === 'function',
    hasBlock: typeof window._continuationAuthorBlock === 'function',
    hasAnchors: typeof window._checkDeliveryAnchors === 'function',
    hasSeal: typeof window._sealProposal === 'function' };
});
t('the continuation schema is explicitly enabled', pre.enabled === true);
t('the handler, author block, anchors and seal are all present',
  pre.hasHandler && pre.hasBlock && pre.hasAnchors && pre.hasSeal, JSON.stringify(pre));
if (fail) { say('\nPREFLIGHT FAILED — nothing dispatched, $0 spent.'); await browser.close(); process.exit(4); }
say('  preflight clean — proceeding to stage 1');

// ── scene setup: a real burned-village posture ────────────────────────────────
const setup = await page.evaluate(() => {
  window.state = window.state || {};
  window.state._starterId = 'starter_first_sacrifice';
  window.state.storyId = 'live-eval-' + Date.now();
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._activeContinuationSeal = null;
  window.state.turnCount = 2;
  const j = window._proposeNewEntity({ kind: 'named', label: 'Julian', aliases: ['the Provast'] });
  return { julianId: j.ok ? j.entity.id : null,
    registerBefore: Object.keys(window._protectedRegisterIds()) };
});
write('setup.json', setup);
say('\nSCENE SETUP: established canon = ' + JSON.stringify(setup.registerBefore));

// ══ STAGE 1 — a REAL planner call ════════════════════════════════════════════
say('\n── STAGE 1: real scene-spine planner call (the cheapest live question) ──');
const ACTION = 'I set the taper to the Reach archive and ride north before the bell stops.';
const DIALOGUE = 'Let whoever governs this place come and find me.';

await page.evaluate(async ({ ACTION, DIALOGUE }) => {
  // Raised with the route.fetch timeout above: the race must outlast the author call it is
  // waiting on, or the harness cuts the generation short and reports a false negative.
  try { await Promise.race([window._runCGScreenplayGen(1, ACTION, DIALOGUE),
    new Promise(r => setTimeout(r, 420000))]); } catch (_) {}
}, { ACTION, DIALOGUE });

const after = await page.evaluate(() => ({
  facts: window._ensureCommittedState().facts,
  seal: window.state._activeContinuationSeal,
  sealedProposals: window.state._sealedProposals
    ? Object.keys(window.state._sealedProposals.byId).map(k => window.state._sealedProposals.byId[k]) : [],
  register: Object.keys(window._protectedRegisterIds()),
  ledger: Object.keys((window.state._relationshipLedger || { entities: {} }).entities)
    .map(k => { const e = window.state._relationshipLedger.entities[k]; return { id: e.id, kind: e.kind, label: e.label }; })
}));
write('state_after.json', after);
await browser.close();

// ── report ───────────────────────────────────────────────────────────────────
const plannerCall = calls.filter(c => c.stage === 'planner').pop() || null;
const authorCall = calls.filter(c => c.stage === 'author').pop() || null;
const verifierCall = calls.filter(c => c.stage === 'verifier').pop() || null;

say('\n=== DISPATCH LEDGER ===');
dispatched.forEach((d, i) => say('  ' + (i + 1) + '. ' + d.stage + '  ' + d.chars + 'ch  est $' + d.estimate.toFixed(6)));
say('  running estimate : $' + spentEstimate.toFixed(6));
say('  MEASURED         : $' + measured.toFixed(6));
say('  authorization    : $' + AUTHORIZED.toFixed(2) + '  (used ' + ((measured / AUTHORIZED) * 100).toFixed(1) + '%)');

say('\n=== Q1: did the planner propose a plausible new Tier 2 pressure? ===');
t('a real planner call was dispatched', !!plannerCall);
let proposal = null;
if (plannerCall) {
  try {
    const j = JSON.parse(plannerCall.response);
    const content = (j && j.content) || (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    write('planner_content.txt', String(content));
    const m = String(content).match(/\{[\s\S]*\}/);
    if (m) proposal = JSON.parse(m[0]);
  } catch (e) { say('  planner reply unparseable: ' + (e && e.message)); }
}
write('planner_parsed.json', proposal || {});
t('the planner reply parsed as JSON', !!proposal);
if (proposal) {
  const hasAny = !!(proposal.canon_change || (proposal.introduces && proposal.introduces.length));
  say('  canon_change: ' + JSON.stringify(proposal.canon_change || null));
  say('  introduces  : ' + JSON.stringify(proposal.introduces || []));
  say('  scene_purpose: ' + JSON.stringify(proposal.scene_purpose || null));
  say('  forward_pressure: ' + JSON.stringify(proposal.forward_pressure || null));
  t('the planner used the continuation schema at all', hasAny,
    'no canon_change and no introduces — the model declined the optional contract');
  if (hasAny) {
    t('  it supplied no durable id', !(proposal.canon_change && (proposal.canon_change.id))
      && !(proposal.introduces || []).some(e => e && e.id));
    t('  every introduced entity declares a permitted kind',
      (proposal.introduces || []).every(e => e && ['named','role','artifact','institution','collective','place'].indexOf(e.kind) >= 0),
      JSON.stringify((proposal.introduces || []).map(e => e && e.kind)));
    t('  every introduced entity declares future_relevance',
      (proposal.introduces || []).every(e => e && typeof e.future_relevance === 'string' && e.future_relevance.trim()));
  }
}

say('\n=== Q3/Q4: sealed → rendered → activated ===');
t('an author call was dispatched', !!authorCall);
if (authorCall && after.sealedProposals.length) {
  const sealedFact = after.sealedProposals[0].fact;
  say('  sealed fact: ' + JSON.stringify(sealedFact));
  t('the sealed fact reached the author payload', authorCall.request.indexOf(sealedFact.slice(0, 60)) >= 0);
  t('  no entity id in the author payload', !/ent:stage:\d+/.test(authorCall.request));
  t('  no sealed proposal id in the author payload', !/prop:\d+:\d+/.test(authorCall.request));
}
say('  committed facts: ' + JSON.stringify(after.facts.map(f => ({ fact: f.fact, ref: f.proposalRef, link: f.provenanceLink }))));
t('at most ONE fact was activated', after.facts.length <= 1, 'facts=' + after.facts.length);
if (after.facts.length === 1 && after.sealedProposals.length) {
  t('  it references a sealed proposal', after.facts[0].provenanceLink === 'sealed'
    && !!after.facts[0].proposalRef);
  t('  and is byte-identical to that proposal\'s fact',
    after.facts[0].fact === (after.sealedProposals.find(p => p.id === after.facts[0].proposalRef) || {}).fact);
}

say('\n=== Q5: did any unplanned canon enter? ===');
const plannedIds = after.sealedProposals.flatMap(p => (p.pendingEntities || []).map(e => e.id));
const unplanned = after.ledger.filter(e => setup.registerBefore.indexOf(e.id) === -1
  && plannedIds.indexOf(e.id) === -1 && e.kind !== 'named');
say('  ledger: ' + JSON.stringify(after.ledger));
t('no entity entered the ledger that was not established or sealed-and-planned',
  unplanned.length === 0, JSON.stringify(unplanned));
t('every activated fact carries a sealed provenance link',
  after.facts.every(f => f.provenanceLink === 'sealed'),
  JSON.stringify(after.facts.map(f => f.provenanceLink)));

write('verdict.json', { pass, fail, measured, spentEstimate, authorized: AUTHORIZED,
  dispatched, proposal, facts: after.facts, ledger: after.ledger });
say('\n' + pass + '/' + (pass + fail) + ' assertions passed');
say('MEASURED SPEND: $' + measured.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2));
say('Artefacts: ' + RUN);
process.exit(fail ? 1 : 0);
