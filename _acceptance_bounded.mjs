// ══════════════════════════════════════════════════════════════════════════════════════════
//  BOUNDED SCENE-1 ACCEPTANCE HARNESS
//
//  Rubric: _acceptance_rubric_frozen.md (committed BEFORE this file could dispatch anything).
//
//  EXACTLY THREE paid dispatches are ever permitted:
//      1. one Mistral CHARACTER_PORTFOLIO generation
//      2. one Mistral Scene-1 opening planner
//      3. one Grok author call
//  Option composition is BACKEND-ONLY and dispatches nothing. Every other model request —
//  setup, bibles, A-plot, scaffold, canonicalizer, sheets, r-plot, subplots, the post-author
//  lane, auditors, retries and fallbacks — is aborted at the wire and counted by bucket.
//
//  MODES
//    MODE=dry (default)  spends NOTHING. Portfolio and planner are answered locally; the author
//                        REQUEST is captured and never dispatched. Purpose: measure the real
//                        production author payload so a worst case can be priced.
//    MODE=live           requires ACCEPT_CEILING (unrounded dollars) AND ACCEPT_OK=1. The three
//                        permitted calls reach their providers; a SECOND attempt at any of them
//                        is blocked, not answered; every raw response is persisted the moment it
//                        arrives; the run stops after the author.
//
//  THE DRY PORTFOLIO IS A WORST CASE, NOT A SAMPLE. Its every field is generated at the MAXIMUM
//  length production's own PORTFOLIO_BOUNDS permit, read out of the running page rather than
//  copied into this file. A payload measured from a typical reply would under-price the run.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const MODE = process.env.MODE === 'live' ? 'live' : 'dry';
const LIVE = MODE === 'live';
const DIR = LIVE ? '_acceptance_live' : '_acceptance_dry';
fs.mkdirSync(DIR, { recursive: true });
const W = (n, s) => fs.writeFileSync(`${DIR}/${n}`, s);

// ── AUTHORISATION GATE ────────────────────────────────────────────────────────────────────
// A live run cannot start without an explicit unrounded ceiling. The ceiling is not decoration:
// it is compared against the real outgoing bytes immediately before each dispatch.
const CEILING = Number(process.env.ACCEPT_CEILING || 0);
if (LIVE && (!(CEILING > 0) || process.env.ACCEPT_OK !== '1')) {
  console.log('REFUSED: MODE=live requires ACCEPT_OK=1 and ACCEPT_CEILING=<unrounded dollars>.');
  process.exit(2);
}

// Official rates, per-million tokens. grok-4.3 doubles above a 200k prompt (docs.x.ai/docs/models);
// the acceptance payload is far below that, and the guard asserts it rather than assuming it.
const RATES = {
  'grok-4.3':             { in: 1.25, out: 2.50, tierAt: 200000, inHi: 2.50, outHi: 5.00 },
  'mistral-small-latest': { in: 0.15, out: 0.60 },
};
const rateFor = (model, promptTokens) => {
  const r = RATES[model] || RATES['mistral-small-latest'];
  return (r.tierAt && promptTokens >= r.tierAt) ? { in: r.inHi, out: r.outHi } : { in: r.in, out: r.out };
};

// Empirical chars→tokens for this prompt family, from an archived REAL grok-4.3 author call:
// 385,347 request chars ↔ 86,904 prompt_tokens = 4.434 chars/token. The pricing below uses a
// deliberately pessimistic 3.6 so an estimate that drifts drifts toward over-reserving.
const CALIBRATED_CPT = 385347 / 86904;
const PESSIMISTIC_CPT = 3.6;

const MODEL_API = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;
const PLANNER_SIG = /scene-structure planner for the OPENING scene/;
const AUTHOR_SIG  = /STORYBOUND ARCHITECTURE LAWS/;

const census = [];               // every model request, permitted or not
const raw = {};                  // persisted immediately on arrival
let portfolioDone = false, plannerDone = false, authorDone = false;
let authorCapture = null, offeredOptions = [], spent = 0;
const note = (o) => { census.push(o); };

// ── THE MAX-LENGTH PORTFOLIO (dry only) ───────────────────────────────────────────────────
// Built from the contract the page is running, so it is the shape production asks for and the
// size production would at worst accept.
function maxPortfolio(contract, sys) {
  const B = {};
  (contract.bounds || []).forEach(b => {
    const k = b.field + ':' + b.kind;
    if (B[k] === undefined || b.value > B[k]) B[k] = (b.kind === 'range') ? b.max : b.value;
  });
  const cap = (f, d) => B[f + ':max'] || d;
  const pad = (n, seed) => {                       // n chars of plausible clause-shaped prose
    let s = seed;
    const filler = ' and she does it again the next time the same weight arrives at her door';
    while (s.length < n) s += filler;
    return s.slice(0, n).replace(/\s\S*$/, '');    // never cut mid-word
  };
  const refs = [...String(sys).matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
  const dims = contract.dimensions || [];
  const facet = (d, i) => ({
    dimension: d,
    canonical_truth: pad(cap('canonical_truth', 150), 'She keeps a promise past the point where keeping it costs her'),
    unique_prediction: pad(cap('unique_prediction', 160), 'Asked to withdraw it quietly, she repeats it aloud before witnesses'),
    not_explained_by: pad(cap('not_explained_by', 160), 'Not the neighbouring facet, which concerns a different pressure entirely'),
    applicability_conditions: [0, 1].map(j => ({
      text: pad(cap('text', 80), 'when the cost of keeping it becomes visible to the room ' + i + j),
      evidence_words: Array.from({ length: B['evidence_words:max'] || 8 }, (_, k) => 'evidenceword' + i + j + k),
    })),
    forbidden_restatements: Array.from({ length: B['forbidden_restatements:max'] || 2 }, (_, j) => ({
      forbid: pad(cap('forbid', 130), 'is loyal|is steadfast|is dependable|keeps her word' + j),
      why: pad(cap('why', 110), 'states the truth instead of showing it under pressure'),
    })),
  });
  return JSON.stringify({ characterPortfolios: refs.map(r => ({
    subject_ref: r,
    identity_signature: pad(cap('identity_signature', 160), 'She is the only one here who treats a promise as a debt with interest'),
    misreading_guardrails: Array.from({ length: B['misreading_guardrails:max'] || 4 }, (_, j) => ({
      forbid: pad(cap('forbid', 130), 'is cold|is aloof|is distant|is unfeeling' + j),
      why: pad(cap('why', 110), 'reads restraint as absence of feeling, which inverts her'),
    })),
    facets: dims.map(facet),
  })) });
}

const envelope = (model, content) => JSON.stringify({
  id: 'dry-local', model,
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
  usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, _dry: true },
});

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await installSession(page);

await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (/\/api\/(geo|csp-report|beta-events)\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });

  let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const msgs = (body && body.messages) || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');

  if (!MODEL_API.test(path)) {
    // Entitlement and story endpoints are NOT model calls and cost nothing; they must answer
    // truthfully enough for the purchase to complete, which is what the session above is for.
    const stub = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                   '/api/verify-subscription': { success: true, subscribed: true, tier: 'sub' },
                   '/api/claim-issue-number': { success: true, issueNumber: 1 },
                   '/api/refund-fortune': { success: true },
                   '/api/grant-welcome-milestone': { success: true },
                   '/api/record-legal-acceptance': { success: true },
                   '/api/stories': { success: true, stories: [] } };
    const k = Object.keys(stub).find(x => path.startsWith(x));
    if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stub[k]) });
    note({ path, bucket: 'NON-MODEL-BLOCKED', dispatched: false });
    return route.abort();
  }

  const isPortfolio = !!body && body.role === 'CHARACTER_PORTFOLIO';
  const isPlanner   = PLANNER_SIG.test(sys);
  const isAuthor    = AUTHOR_SIG.test(sys);
  const bucket = isPortfolio ? 'PORTFOLIO' : isPlanner ? 'PLANNER' : isAuthor ? 'AUTHOR' : 'OTHER-MODEL';

  // ── AFTER THE AUTHOR, NOTHING ELSE MAY SPEND ──
  if (authorDone) { note({ path, bucket: 'BLOCKED-AFTER-AUTHOR', wouldHaveBeen: bucket, dispatched: false }); return route.abort(); }

  // ── NO RETRY, NO FALLBACK, NO REPAIR ──
  const already = (isPortfolio && portfolioDone) || (isPlanner && plannerDone) || (isAuthor && authorDone);
  if (already) { note({ path, bucket: 'SECOND-ATTEMPT-BLOCKED', wouldHaveBeen: bucket, dispatched: false }); return route.abort(); }

  if (bucket === 'OTHER-MODEL') {
    note({ path, bucket: 'OTHER-MODEL-BLOCKED', model: body && body.model, sysHead: sys.slice(0, 90), dispatched: false });
    return route.abort();
  }

  // ══ AUTHOR ══
  if (isAuthor) {
    const rec = { path, bucket, model: body && body.model, preferredModel: body && body.preferredModel,
      role: body && body.role, max_tokens: body && body.max_tokens, reasoningEffort: body && body.reasoningEffort,
      messageCount: msgs.length, sysChars: sys.length, usrChars: usr.length,
      totalChars: JSON.stringify(body).length };
    if (!LIVE) {
      authorCapture = rec; authorDone = true;
      note({ ...rec, dispatched: false, kind: 'AUTHOR-DRY-CAPTURED' });
      W('author_request.json', JSON.stringify({ ...rec, system: sys, user: usr }, null, 2));
      console.log(`   [AUTHOR-DRY] captured, NOT dispatched — model=${rec.preferredModel || rec.model} max_tokens=${rec.max_tokens} chars=${rec.totalChars}`);
      return route.abort();
    }
  }

  // ══ DRY: answer portfolio + planner locally ══
  if (!LIVE) {
    if (isPortfolio) {
      const contract = await page.evaluate(() => ({
        dimensions: window.__PORTFOLIO_CONTRAST_DIMENSIONS, bounds: window.__PORTFOLIO_BOUNDS,
        model: window.__PORTFOLIO_BATCH_MODEL }));
      const content = maxPortfolio(contract, sys);
      portfolioDone = true;
      note({ path, bucket, dispatched: false, kind: 'PORTFOLIO-DRY-LOCAL', replyChars: content.length,
             sysChars: sys.length, requestedMaxTokens: body && body.max_tokens });
      W('portfolio_local_reply.json', content);
      console.log(`   [PORTFOLIO-DRY] answered locally at max bounds — ${content.length} chars, no spend`);
      return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(contract.model, content) });
    }
    if (isPlanner) {
      offeredOptions = [...usr.matchAll(/option_id: (OPT-\d+)/g)].map(m => m[1])
        .concat([...sys.matchAll(/option_id: (OPT-\d+)/g)].map(m => m[1]));
      plannerDone = true;
      W('planner_request.json', JSON.stringify({ sysChars: sys.length, usrChars: usr.length, offeredOptions,
        model: body && body.model, max_tokens: body && body.max_tokens, system: sys, user: usr }, null, 2));
      const content = await page.evaluate(() => (window.__acceptanceDryPlannerReply || null));
      note({ path, bucket, dispatched: false, kind: 'PLANNER-DRY-LOCAL', offered: offeredOptions.length,
             sysChars: sys.length, usrChars: usr.length });
      console.log(`   [PLANNER-DRY] answered locally — ${offeredOptions.length} option ids offered, no spend`);
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: envelope('mistral-small-latest', content || '{}') });
    }
  }

  // ══ LIVE: the pre-dispatch spend guard, on the real outgoing bytes ══
  const model = (isAuthor ? (body.preferredModel || body.model) : body.model) || 'mistral-small-latest';
  const inTok = Math.ceil(JSON.stringify(body).length / PESSIMISTIC_CPT);
  const r = rateFor(model, inTok);
  const worst = (inTok / 1e6) * r.in + ((body.max_tokens || 0) / 1e6) * r.out;
  if (spent + worst > CEILING) {
    note({ path, bucket, dispatched: false, kind: 'CEILING-REFUSED', worst, spentBefore: spent, ceiling: CEILING });
    console.log(`   ✗ CEILING REFUSED ${bucket}: worst ${worst} + spent ${spent} > ${CEILING}`);
    return route.abort();
  }
  spent += worst;
  const t0 = Date.now();
  let resp, text;
  try { resp = await route.fetch({ timeout: 300000 }); text = await resp.text(); }
  catch (e) { note({ path, bucket, dispatched: 'ATTEMPTED', error: String(e && e.message).slice(0, 120) }); try { return route.abort(); } catch (_) { return; } }
  const ms = Date.now() - t0;
  // PERSIST IMMEDIATELY — before any assertion, before anything can throw.
  raw[bucket] = text;
  W(`${bucket.toLowerCase()}_raw.txt`, text);
  let usage = null; try { const j = JSON.parse(text); usage = j.usage || (j._orchestration && j._orchestration.usage) || null; } catch (_) {}
  W(`${bucket.toLowerCase()}_meta.json`, JSON.stringify({ model, max_tokens: body.max_tokens, status: resp.status(), ms, usage, worstReserved: worst }, null, 2));
  note({ path, bucket, dispatched: true, model, max_tokens: body.max_tokens, status: resp.status(), ms, usage, worstReserved: worst });
  if (isPortfolio) portfolioDone = true;
  if (isPlanner) plannerDone = true;
  if (isAuthor) { authorDone = true; authorCapture = { model, max_tokens: body.max_tokens, usage }; }
  console.log(`   [${bucket}] dispatched model=${model} status=${resp.status()} ${ms}ms`);
  return route.fulfill({ response: resp, body: text });
});

const logs = [], allLogs = [];
page.on('console', m => { const t = m.text();
  if (allLogs.length < 4000) allLogs.push(t.slice(0, 300));
  if (/CPLUS|PORTFOLIO|SCENE1|GROUNDED|OPTION|ADMIT|GROK-LIT|MODEL:SERVED|AUTHOR/.test(t)) logs.push(t.slice(0, 300)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 200)));

console.log(`\n${'═'.repeat(94)}\nBOUNDED SCENE-1 ACCEPTANCE — MODE=${MODE}${LIVE ? ` · ceiling $${CEILING}` : ' · SPENDS NOTHING'}\n${'═'.repeat(94)}\n`);
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 60000 });

// Record the author route's CONFIGURED facts from the page, not from memory.
const routeFacts = await page.evaluate(() => {
  const C = (window.StoryboundOrchestration && window.StoryboundOrchestration.CONFIG) || {};
  return { narrativeAuthorModel: C.NARRATIVE_AUTHOR_MODEL || null,
           allowedAuthorModels: C.ALLOWED_NARRATIVE_AUTHOR_MODELS || null,
           specialistProxy: C.SPECIALIST_PROXY || null,
           smallAuthorEnabled: window._smallAuthorEnabled !== false,
           premiumScene: (typeof window._isPremiumAuthorScene === 'function') ? null : 'fn-absent',
           portfolioModel: window.__PORTFOLIO_BATCH_MODEL || null,
           portfolioMaxTokens: window.__PORTFOLIO_MAX_TOKENS || null };
});
console.log(' configured author route :', JSON.stringify(routeFacts));

const kickoff = await page.evaluate(async () => {
  try {
    // The corridor is a UI flow; a headless acceptance run seeds the same picks the corridor
    // would have produced and calls the same production entry point. Entitlement is NOT forced
    // here — the authenticated session and the real purchase path are left to do their job.
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    if (!def) return { started: false, error: 'starter_first_sacrifice absent' };
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
      _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
      archetype: { primary: def.archetype, modifier: null },
      name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
      loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN',
      storyLength: 'fling', tier: 'fling', intensity: 'Steamy', pov: 'first_person',
      // Entitlement is NOT the subject of this run and is satisfied the same way the proven
      // isolated harness satisfies it. The C+ chain, not the paywall, is what is being accepted.
      access: 'sub', subscribed: true, fortunes: 9999999,
      identity: { playerName: 'Lirael', partnerName: 'Julian' },
      renderMode: 'literary', currentEngine: 'literary',
      storyId: 'acceptance-' + Date.now(), myUid: 'acceptance' });
    s.picks.identity = s.identity;
    s._skipCorridorValidation = true;
    window.__err = null;
    window.__run = window.handleBeginStory().catch(e => { window.__err = String(e && e.message).slice(0, 240); });
    return { started: true, starter: def.id };
  } catch (e) { return { started: false, error: String(e && e.message).slice(0, 200) }; }
}).catch(e => ({ started: false, error: String(e && e.message).slice(0, 200) }));
console.log(' kickoff                 :', JSON.stringify(kickoff));

const DEADLINE = Date.now() + 480000;
while (!authorDone && Date.now() < DEADLINE) await new Promise(r => setTimeout(r, 500));
await new Promise(r => setTimeout(r, 2000));

const state = await page.evaluate(() => {
  const s = window.state || {};
  return { cpCoverage: s._scene1CPlusCoverage || null,
           cpOptions: (s._cpOptions || []).map(o => o.option_id),
           skeletonFatal: s._scene1SkeletonFatal || null,
           err: window.__err || null };
}).catch(() => ({}));

W('census.json', JSON.stringify(census, null, 2));
W('logs.txt', logs.join('\n'));
W('logs_all.txt', allLogs.join('\n'));
W('state.json', JSON.stringify(state, null, 2));

// ── PRICING (dry) ─────────────────────────────────────────────────────────────────────────
let pricing = null;
if (!LIVE && authorCapture) {
  const chars = authorCapture.totalChars;
  const model = authorCapture.preferredModel || authorCapture.model || routeFacts.narrativeAuthorModel;
  const est = (cpt) => {
    const inTok = Math.ceil(chars / cpt);
    const r = rateFor(model, inTok);
    return { cpt, inTok, inCost: (inTok / 1e6) * r.in,
             outCeilingCost: ((authorCapture.max_tokens || 0) / 1e6) * r.out,
             total: (inTok / 1e6) * r.in + ((authorCapture.max_tokens || 0) / 1e6) * r.out };
  };
  pricing = { model, requestChars: chars, maxTokens: authorCapture.max_tokens,
              calibrated: est(CALIBRATED_CPT), pessimistic: est(PESSIMISTIC_CPT) };
  W('pricing.json', JSON.stringify(pricing, null, 2));
}

const disp = census.filter(c => c.dispatched === true);
console.log(`\n${'─'.repeat(94)}`);
console.log(` model requests seen   : ${census.length}`);
console.log(` DISPATCHED (paid)     : ${disp.length}  [${disp.map(c => c.bucket).join(', ') || 'none'}]`);
const byBucket = census.reduce((a, c) => { const k = c.kind || c.bucket; a[k] = (a[k] || 0) + 1; return a; }, {});
Object.keys(byBucket).sort().forEach(k => console.log(`   ${k.padEnd(28)} ${byBucket[k]}`));
console.log(` begin-story error     : ${JSON.stringify(state.err)}`);
console.log(` C+ coverage           : ${JSON.stringify(state.cpCoverage)}`);
console.log(` backend options       : ${JSON.stringify(state.cpOptions)}`);
if (pricing) {
  console.log(`\n AUTHOR REQUEST (dry, not dispatched)`);
  console.log(`   model               : ${pricing.model}`);
  console.log(`   request chars       : ${pricing.requestChars}`);
  console.log(`   output ceiling      : max_tokens=${pricing.maxTokens}`);
  console.log(`   calibrated  ${pricing.calibrated.inTok} in-tok → $${pricing.calibrated.total}`);
  console.log(`   pessimistic ${pricing.pessimistic.inTok} in-tok → $${pricing.pessimistic.total}`);
}
console.log(`${'─'.repeat(94)}\n artifacts → ${DIR}/\n`);

await ctx.close().catch(() => {});
await browser.close().catch(() => {});
process.exit(0);
