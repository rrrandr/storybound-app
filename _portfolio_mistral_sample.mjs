// MISTRAL PORTFOLIO SAMPLE — DRIVES PRODUCTION, OWNS NOTHING.
//
// The first attempt at this file hand-copied the schema, the category list and the evidence rules,
// and so tested a contract production had already stopped sending: three subjects came back
// structurally invalid for reasons that were the harness's fault. The result was directional
// evidence about Mistral's psychology and NOTHING about the shipping contract.
//
// This file therefore contains no category list, no facet schema, no evidence field definitions,
// no prompt clauses and no validation logic. It sets up state, calls production's own
// _generatePendingPortfolios (which builds the prompt, dispatches, parses, validates and parks),
// and reports what production concluded. Every literal it needs is READ FROM PRODUCTION.
// _portfolio_sample_hygiene.mjs fails if any production-owned literal reappears here.
//
// usage: node _portfolio_mistral_sample.mjs --dry     free; aborts the batch, proves the request
//        SB_SAMPLE_AUTHORIZE=1 node _portfolio_mistral_sample.mjs    one paid call
import { chromium } from 'playwright-core';
import fs from 'fs';
import crypto from 'crypto';

const DRY = !process.env.SB_SAMPLE_AUTHORIZE;
// ── THE FREE SENTINEL ARM ──
// Proves the EVIDENCE PATH without a provider: production is handed a constructed response whose
// bytes this file already knows, so "the raw body was persisted intact" becomes checkable by
// hash rather than by trust. The live sample's psychology was lost because the page returned a
// character count and the browser then closed; nothing about that failure needed a paid call to
// find, and nothing about it needs one to prevent.
const SENTINEL = !!process.env.SB_SAMPLE_SENTINEL;
const SENTINEL_PHRASE = 'SENTINEL-8f3a91c2-evidence-marker';
let SENTINEL_CONTENT = null;
// LOSE_BODY reproduces the exact defect on purpose — the control that proves these assertions
// can fail. Without it they are decoration.
const LOSE_BODY = process.env.SB_SAMPLE_LOSE_BODY || '';
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

// The three subjects. Labels and scene evidence only — what a plan would supply. No schema.
const SUBJECTS = [
  { label: 'Mara Dunn',   note: 'present, interacting ordinary NPC' },
  { label: 'Tomas Reyne', note: 'absent but explicitly ANTICIPATED — the Waldorf-concierge class' },
  { label: 'Halden Roe',  note: 'recurring ordinary/emergent person with a standing function' },
];
const ROLE_PHRASE_CONTROL = 'the presiding Watchman';

// ── PRIOR SPEND: ONE LEDGER, NOT A RECOMPUTATION ──
// This used to be re-derived on every run from whichever result files happened to be on disk —
// and the file holding the last live call's usage is overwritten by the next run, so the guard
// would have silently forgotten a call that had actually been paid for. Every paid call is
// recorded once, with its measured usage, and the guard reads that.
const PRIOR = (() => {
  const L = JSON.parse(fs.readFileSync('_portfolio_spend_ledger.json', 'utf8'));
  const c = (x) => (x.prompt_tokens / 1e6) * L.rates[x.model].in
                 + (x.completion_tokens / 1e6) * L.rates[x.model].out;
  return { total: L.calls.reduce((n, x) => n + c(x), 0), calls: L.calls, RATES: L.rates };
})();

// ── THE AUTHORISED CEILING ──
// CAP_ADDITIONAL is unchanged: the same per-call worst case as last time (the request is in fact
// slightly smaller now that the category clauses are gone, so the real figure comes in under it).
// The CUMULATIVE figure is NOT the one authorised before the last call — that ceiling was computed
// from a conservative prior that predates a call which has since been made and paid for. The
// conservative prior therefore carries that call's measured cost, and the ceiling moves with it.
// Spending against a stale ceiling would be spending money that was reasoned about once and
// counted twice.
// Where the evidence lands. Written before any assertion runs; see the block after run().
const EV_RAW = '_portfolio_sample_raw.txt';
const EV_PARSED = '_portfolio_sample_evidence.json';

// REQUESTED, NOT YET GRANTED at the time of writing. Both figures moved for stated reasons and
// neither may be carried over from the last authorisation:
//   · the per-call worst case is $0.00739605. It rose from $0.00731745 because the prompt now
//     spells out every bound and states an obligation per field — the fix for the hidden-bound
//     defect costs input tokens — and then came back down when the worked examples were removed;
//   · the conservative prior now carries the second measured sample ($0.00228660), so the old
//     cumulative ceiling would count the same headroom twice.
const CAP_ADDITIONAL = 0.00739605;
const PRIOR_UPPER_BOUND = 0.02937445;   // 0.02708785 conservative + 0.00228660 measured
const CAP_CUMULATIVE = 0.03677050;      // PRIOR_UPPER_BOUND + CAP_ADDITIONAL

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultTimeout(120000);
const seen = { batch: [], aborted: 0, escaped: [], logs: [], rawResponse: null };
let mutateSrc = null;
const SRC = fs.readFileSync('public/app.js', 'utf8');
let mutTargets = null;
await page.route('**/app.js*', r => {
  let body = SRC;
  if (mutateSrc) { mutTargets = body.split(mutateSrc.from).length - 1; body = body.replace(mutateSrc.from, mutateSrc.to); }
  return r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body });
});
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) seen.escaped.push(r.url()); });
// ── A FAILED PAID CALL MUST BE DIAGNOSABLE ──
// The first production-path run failed with all three subjects unresolved and NOTHING recorded
// about why: the harness captured neither production's per-subject rejection reasons nor the raw
// response. A paid attempt that cannot be diagnosed is a paid attempt wasted, so both are captured
// now — before the next authorisation, not after it.
page.on('console', m => {
  const x = m.text();
  if (/PORTFOLIO:BATCH|ADMIT:PENDING|CPLUS:FACET/.test(x)) seen.logs.push(x.slice(0, 400));
});
page.on('response', async r => {
  try {
    if (!/mistral-proxy/.test(r.url())) return;
    seen.rawResponse = { status: r.status(), body: (await r.text()).slice(0, 60000) };
  } catch (_) {}
});
await page.route('**/api/**', async route => {
  const u = route.request().url();
  let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
  const isBatch = !!b && b.role === 'CHARACTER_PORTFOLIO';
  if (isBatch) {
    seen.batch.push({ url: u, sys, body: b });
    if (SENTINEL) {
      // Built from the SAME production contract the request was built from, so the response is
      // the shape production asks for rather than a shape this file remembers.
      const dims = CONTRACT.dimensions;
      const refs = [...sys.matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
      // The sentinel must satisfy the CRAFT contract too — third person, a mechanism rather than
      // a maxim, a named pressure in every prediction, and an exception that names the slot it
      // complicates and when. A sentinel that could not pass production's own gates would prove
      // the evidence path on a response production would reject.
      const TRUTH = [
        'She keeps a promise past the point where keeping it costs her something.',
        'She hears praise given to someone else as a verdict on her own standing.',
        'She answers a challenge by reciting procedure until the room gives up.',
        'She keeps score of who asked after her and who did not.',
        'Her habit of keeping score stops entirely with anyone who has already failed her and stayed.'];
      const PRED = [
        'Asked to withdraw a promise quietly, she repeats it aloud in front of witnesses.',
        'When a junior is thanked before her, she recites her seniority to a stranger.',
        'Once challenged on a ruling, she reads the clause aloud twice and waits.',
        'Offered help she did not ask for, she notes who offered and mentions it weeks later.',
        'When someone who failed her returns, she stops counting and gives without terms.'];
      const F = (d, i) => ({ dimension: d,
        canonical_truth: TRUTH[i],
        unique_prediction: PRED[i],
        not_explained_by: i === 4
          ? 'could be mistaken for the relationship facet, but that is the pattern this suspends'
          : 'not the neighbouring facet, which is about something else',
        applicability_conditions: [{ text: 'when pressure ' + i + ' is present', evidence_words: ['pressure', 'weight'] },
                                   { text: 'a second, different condition ' + i, evidence_words: ['second', 'other'] }],
        forbidden_restatements: [{ forbid: 'is predictable', why: SENTINEL_PHRASE + ' — the truth stated, not shown' }] });
      const content = JSON.stringify({ characterPortfolios: refs.map(r => ({
        subject_ref: r, identity_signature: SENTINEL_PHRASE + ' identity signature',
        facets: dims.map(F) })) });
      SENTINEL_CONTENT = content;
      const envelope = { id: 'sentinel', model: CONTRACT.model,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: content } }],
        usage: { prompt_tokens: 1111, completion_tokens: 2222, total_tokens: 3333 } };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope) });
    }
    if (DRY) return route.abort();     // the dry arm proves the REQUEST; it never invents a reply
    // ── PRE-DISPATCH SPEND GUARD ──
    // Enforced HERE, on the real outgoing bytes, because this is the last moment before money
    // moves. Unrounded throughout; the authorised figures are exact, not rounded for display.
    const M = PRIOR.RATES[b.model] || { in: 0.15, out: 0.60 };
    const inTok = Math.ceil(JSON.stringify(b).length / 4);
    const worst = (inTok / 1e6) * M.in + ((b.max_tokens || 0) / 1e6) * M.out;
    // The cumulative test uses the CONSERVATIVE prior, not the smaller figure recorded on disk:
    // the authorisation was computed from the conservative one, so spending the difference would
    // be spending money that was reasoned about but never granted.
    const cumWorst = Math.max(PRIOR.total, PRIOR_UPPER_BOUND) + worst;
    if (worst > CAP_ADDITIONAL + 1e-12 || cumWorst > CAP_CUMULATIVE + 1e-12) {
      console.error(`\n  ✗ ABORTING BEFORE DISPATCH: worst case $${worst.toFixed(8)} `
        + `(cumulative $${cumWorst.toFixed(8)}) exceeds the authorisation.\n`);
      seen.guardBlocked = true;
      return route.abort();
    }
    seen.worstCase = worst;
    if (seen.batch.length > 1) {       // exactly one attempt, enforced not hoped
      console.error('\n  ✗ ABORTING: a SECOND portfolio request was attempted.\n');
      seen.secondAttempt = true;
      return route.abort();
    }
    return route.continue();
  }
  seen.aborted++;
  return route.abort();
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._generatePendingPortfolios === 'function', { timeout: 30000 });

// Everything a claim below needs to name is read from production, never remembered here.
const CONTRACT = await page.evaluate(() => ({
  fields: window.__PORTFOLIO_SCHEMA_FIELDS,
  dimensions: window.__PORTFOLIO_CONTRAST_DIMENSIONS,
  categories: window.__CPLUS_FACET_CATEGORIES,
  model: window.__PORTFOLIO_BATCH_MODEL,
  ceiling: window.__PORTFOLIO_BATCH_HARD_CEILING,
}));

// ── DRIVE PRODUCTION ─────────────────────────────────────────────────────────────────────
const run = () => page.evaluate(async ({ SUBJECTS, ROLE_PHRASE_CONTROL }) => {
  const s = window.state;
  Object.assign(s, { storyId: 'sample-' + Math.random().toString(36).slice(2, 7),
    _relationshipLedger: null, _pendingAdmission: null,
    loveInterestName: 'Julian', partnerName: 'Julian', _starterId: null, aPlot: null });
  // The real capture seam decides who is payable; the control must be refused by it.
  const cands = SUBJECTS.concat([{ label: ROLE_PHRASE_CONTROL }]).map((x, i) => ({
    id: 'named:s' + i, label: x.label, aliases: [x.label],
    providerOwner: /^(the|a|an|her|his|their|its|my|your|our)\s/i.test(x.label)
      ? 'role phrase — not a name' : 'ordinary/emergent name-only' }));
  const payable = cands.filter(c => c.providerOwner === 'ordinary/emergent name-only');
  const man = window._captureAdmissionManifest(s, payable, { invocationId: 'inv-sample', lineage: 'L-sample' });
  if (!man) return { error: 'capture produced no manifest' };
  // PRODUCTION'S OWN GENERATOR. It builds the prompt, dispatches, parses, validates and parks.
  // TEST-ONLY RAW CAPTURE. Production exposes the untouched body through this hook alone; the
  // ordinary result carries codes and refs, never psychology.
  window.__portfolioRawHits = [];
  window.__portfolioRawCapture = function (x) { window.__portfolioRawHits.push(x); };
  const report = await window._generatePendingPortfolios({ invocationId: 'inv-sample' }, s);
  const store = window._pendingAdmissionStore(s);
  const rec = store && store.byInvocation['inv-sample'];
  const hits = window.__portfolioRawHits || [];
  return { rawCaptured: hits.length, rawLength: hits[0] ? String(hits[0].raw || '').length : 0,
           // THE BODY ITSELF. Returning only a length is what lost the first live sample: the
           // psychology existed for the lifetime of a closed browser and was never written down.
           rawBody: hits[0] ? String(hits[0].raw || '') : null,
           rawEnvelope: hits[0] && hits[0].data ? hits[0].data : null,
           providerMeta: hits[0] && hits[0].data ? { usage: hits[0].data.usage || null,
             finish_reason: (((hits[0].data.choices || [])[0]) || {}).finish_reason || null,
             model: hits[0].data.model || null } : null,
           manifest: (man.candidates || []).map(c => ({ label: c.label, ref: c.candidate_ref })),
           excluded: (man.excluded || []),
           payableLabels: payable.map(c => c.label),
           report,
           // The VERDICT comes from production's store, not from anything computed here.
           verdicts: (rec ? rec.candidates : []).map(c => ({ label: c.label, status: c.status,
             facets: (c.portfolio || []).length })) };
}, { SUBJECTS, ROLE_PHRASE_CONTROL });

console.log(`\n${'═'.repeat(84)}\nMISTRAL SAMPLE — PRODUCTION PATH ${DRY ? '(DRY: request proven, nothing spent)' : '(LIVE)'}\n${'═'.repeat(84)}\n`);
const R = await run();

// ══════════════════════════════════════════════════════════════════════════════════════════
//  EVIDENCE IS WRITTEN HERE — before a single assertion, before the browser can close.
//  The first live sample captured 16486 characters of psychology inside the page, returned the
//  NUMBER 16486 to Node, and closed the browser. The diagnosis survived; the thing the call was
//  bought for did not. Persistence is therefore not a reporting step at the end of the file, it
//  is the first thing that happens once the body exists.
// ══════════════════════════════════════════════════════════════════════════════════════════
const evidence = (() => {
  // LOSE_BODY is the control: it reproduces the original defect deliberately so the assertions
  // below can be shown to fail. 'length' persists a count instead of the body; 'drop' persists
  // nothing at all.
  const body = LOSE_BODY === 'drop' ? null
             : LOSE_BODY === 'length' ? String((R.rawBody || '').length)
             : R.rawBody;
  const wrote = { raw: false, parsed: false, bytes: 0, sha256: null };
  try {
    if (body != null) {
      fs.writeFileSync(EV_RAW, body);
      wrote.raw = true;
      wrote.bytes = Buffer.byteLength(body);
      wrote.sha256 = crypto.createHash('sha256').update(body).digest('hex');
    } else if (fs.existsSync(EV_RAW)) {
      fs.unlinkSync(EV_RAW);        // a stale file from a previous run must never look like evidence
    }
  } catch (e) { wrote.rawError = String(e && e.message); }
  try {
    fs.writeFileSync(EV_PARSED, JSON.stringify({
      // What the model actually authored, parsed — the portfolios themselves.
      portfolios: (function () { try { return JSON.parse(R.rawBody).characterPortfolios || null; }
                                 catch (_) { return null; } })(),
      // What production concluded about them, in production's own words.
      report: R.report || null,
      diagnostics: (R.report && R.report.diagnostics) || [],
      usage: (R.report && R.report.usage) || [],
      providerMeta: R.providerMeta || null,
      verdicts: R.verdicts || null,
      manifest: R.manifest || null,
      rawBytes: wrote.bytes, rawSha256: wrote.sha256,
      requestCensus: { dispatched: seen.batch.length, aborted: seen.aborted, escaped: seen.escaped.length },
    }, null, 2));
    wrote.parsed = true;
  } catch (e) { wrote.parsedError = String(e && e.message); }
  return wrote;
})();
const req = seen.batch[0];

console.log(' 1 · THE DISPATCHED REQUEST IS PRODUCTION\'S OWN');
t('1a: exactly one portfolio request was dispatched, by production',
  seen.batch.length === 1, `batch requests = ${seen.batch.length}`);
t('1b: it carries production\'s role, model and route — read from production, not remembered here',
  !!req && req.body.role === 'CHARACTER_PORTFOLIO' && req.body.model === CONTRACT.model
    && /mistral-proxy/.test(req.url),
  JSON.stringify(req && { role: req.body.role, model: req.body.model, url: req.url }));
t('1c: all three production-payable subjects are on the roster, and the role phrase is not',
  !!req && SUBJECTS.every(x => req.sys.indexOf(x.label) !== -1)
    && req.sys.indexOf(ROLE_PHRASE_CONTROL) === -1
    && R.payableLabels.length === 3,
  JSON.stringify({ payable: R.payableLabels, excluded: R.excluded }));
t('1d: the schema demands every per-facet field production declares',
  !!req && CONTRACT.fields.perFacet.every(f => req.sys.indexOf(f) !== -1),
  JSON.stringify(CONTRACT.fields.perFacet.filter(f => !req || req.sys.indexOf(f) === -1)));
t('1e: …every per-subject field, including the identity signature',
  !!req && CONTRACT.fields.perSubject.every(f => req.sys.indexOf(f) !== -1),
  JSON.stringify(CONTRACT.fields.perSubject.filter(f => !req || req.sys.indexOf(f) === -1)));
t(`1f: all ${CONTRACT.dimensions.length} positional slots are named — ${SUBJECTS.length} subjects × ${CONTRACT.dimensions.length} = ${SUBJECTS.length * CONTRACT.dimensions.length} slots to fill`,
  !!req && CONTRACT.dimensions.every(d => req.sys.indexOf(d) !== -1),
  JSON.stringify(CONTRACT.dimensions.filter(d => !req || req.sys.indexOf(d) === -1)));
t('1g: evidence_words is demanded and no model-authored pattern field appears',
  !!req && CONTRACT.fields.perCondition.every(f => req.sys.indexOf(f) !== -1)
    && CONTRACT.fields.forbiddenFromModels.every(f => req.sys.indexOf(f) === -1),
  JSON.stringify({ missing: CONTRACT.fields.perCondition.filter(f => !req || req.sys.indexOf(f) === -1),
                   forbiddenPresent: CONTRACT.fields.forbiddenFromModels.filter(f => req && req.sys.indexOf(f) !== -1) }));
// Field names and category names are READ from production, never quoted here — a harness that
// spells the contract out is asserting against its own memory of it.
const FIELD_DIM = CONTRACT.fields.perFacet[0];
// What must be absent is the VOCABULARY being offered, not every English word that happens to be
// a category name: the contrast instruction legitimately says "a pride beside a f" + "ear", and a
// bare word scan reports that as a taxonomy leak. So: the joined enum must not appear, and no
// category may appear in a JSON field position.
const CAT_ONLY = CONTRACT.categories.filter(c => CONTRACT.dimensions.indexOf(c) === -1);
const offersEnum = req ? req.sys.indexOf(CONTRACT.categories.join(' | ')) !== -1 : true;
const quotedCat = req ? CAT_ONLY.filter(c => req.sys.indexOf('"' + c + '"') !== -1) : CAT_ONLY;
const derivedLeak = req ? (CONTRACT.fields.derivedNotModelFacing || [])
  .filter(f => req.sys.indexOf('"' + f + '"') !== -1) : ['(no request)'];
t('1h: the model is offered ONE taxonomy — production\'s five named slots. The technical category ' +
  'enum is never presented and no category sits in a field position; two vocabularies is what ' +
  'cost the last sample a subject',
  !!req && CONTRACT.dimensions.every(d => req.sys.indexOf('"' + FIELD_DIM + '": "' + d + '"') !== -1)
    && !offersEnum && quotedCat.length === 0 && derivedLeak.length === 0,
  JSON.stringify({ offersEnum, quotedCat, derivedLeak }));
t('1i: the token allowance is production\'s ceiling for this chunk',
  !!req && req.body.max_tokens > 0 && req.body.max_tokens <= CONTRACT.ceiling,
  `max_tokens=${req && req.body.max_tokens} ceiling=${CONTRACT.ceiling}`);
t('1j: every non-portfolio request was aborted, and nothing escaped',
  seen.aborted > 0 && seen.escaped.length === 0,
  `aborted=${seen.aborted} escaped=${JSON.stringify(seen.escaped.slice(0, 2))}`);
t('1k: the structural verdict comes from production — this file computes none',
  Array.isArray(R.verdicts) && R.verdicts.length === 3 && !!R.report,
  JSON.stringify({ report: R.report && R.report.code, verdicts: R.verdicts }));
t('1m: production returns a NAMED diagnostic per unresolved subject — the summary is never the ' +
  'whole explanation',
  !R.report || R.report.ok
    || ((R.report.diagnostics || []).length === (R.report.unresolved || []).length
        && (R.report.diagnostics || []).every(d => d.code && d.stage)),
  JSON.stringify({ summary: R.report && R.report.code, diagnostics: R.report && R.report.diagnostics }));

console.log(`\n   dispatched request: ${req ? req.sys.length : 0} chars · max_tokens ${req && req.body.max_tokens}`);
if (req) fs.writeFileSync('_portfolio_sample_request.json', JSON.stringify(
  { sys: req.sys, model: req.body.model, role: req.body.role, max_tokens: req.body.max_tokens,
    temperature: req.body.temperature }, null, 2));

if (DRY) {
  // ── MUTATION CONTROL: without production's batch call there is no request at all ──
  mutateSrc = { from: 'var body = await _portfolioBatchCall(chunk, rec, s);',
                to:   'var body = null;' };
  seen.batch.length = 0;
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await p2.route('**/app.js*', r => {
    let body = SRC; mutTargets = body.split(mutateSrc.from).length - 1;
    return r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8',
                       body: body.replace(mutateSrc.from, mutateSrc.to) }); });
  await p2.route('**/api/**', async route => {
    let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    if (b && b.role === 'CHARACTER_PORTFOLIO') seen.batch.push({ url: route.request().url() });
    return route.abort(); });
  await p2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p2.waitForFunction(() => typeof window._generatePendingPortfolios === 'function', { timeout: 30000 });
  await p2.evaluate(async () => {
    const s = window.state;
    Object.assign(s, { storyId: 'mut', _relationshipLedger: null, _pendingAdmission: null });
    const m = window._captureAdmissionManifest(s, [{ id: 'named:x', label: 'Mara Dunn',
      aliases: ['Mara Dunn'], providerOwner: 'ordinary/emergent name-only' }],
      { invocationId: 'inv-mut', lineage: 'L-mut' });
    if (m) await window._generatePendingPortfolios({ invocationId: 'inv-mut' }, s);
  });
  await ctx2.close();
  t('1l: MUTATION — with production\'s batch call removed, NO request is dispatched at all',
    mutTargets === 1 && seen.batch.length === 0,
    `targets=${mutTargets} dispatched=${seen.batch.length}`);

  if (SENTINEL) {
    console.log('\n 2 · THE EVIDENCE PATH (free sentinel — no provider was contacted)');
    const want = SENTINEL_CONTENT || '';
    const exists = fs.existsSync(EV_RAW);
    const onDisk = exists ? fs.readFileSync(EV_RAW, 'utf8') : '';
    const shaOf = (x) => crypto.createHash('sha256').update(x).digest('hex');
    t('2a: the raw file EXISTS on disk after the run', exists, EV_RAW);
    t('2b: its byte length and SHA-256 match the intercepted body EXACTLY — not a summary, not a ' +
      'truncation, not a re-serialisation',
      exists && Buffer.byteLength(onDisk) === Buffer.byteLength(want) && shaOf(onDisk) === shaOf(want),
      JSON.stringify({ diskBytes: Buffer.byteLength(onDisk), wantBytes: Buffer.byteLength(want),
                       diskSha: shaOf(onDisk).slice(0, 16), wantSha: shaOf(want).slice(0, 16) }));
    t('2c: the sentinel text is present in the persisted body — the file holds the authored ' +
      'content, not an envelope wrapped around nothing',
      onDisk.indexOf(SENTINEL_PHRASE) !== -1, 'sentinel absent');
    t('2d: the persisted file parses on its own, without the harness that wrote it',
      (() => { try { return !!JSON.parse(onDisk).characterPortfolios; } catch (_) { return false; } })(),
      'unparseable');
    const ev = (() => { try { return JSON.parse(fs.readFileSync(EV_PARSED, 'utf8')); } catch (_) { return null; } })();
    t('2e: the PARSED portfolios are persisted — the thing a paid call is actually bought for',
      !!ev && Array.isArray(ev.portfolios) && ev.portfolios.length > 0
        && (ev.portfolios[0].facets || []).length === CONTRACT.fields.requiredFacetCount,
      JSON.stringify({ n: ev && ev.portfolios && ev.portfolios.length,
                       facets: ev && ev.portfolios && (ev.portfolios[0] || {}).facets
                               && ev.portfolios[0].facets.length }));
    t('2f: production\'s own diagnostics and verdicts are persisted beside them',
      !!ev && Array.isArray(ev.diagnostics) && !!ev.report && Array.isArray(ev.verdicts),
      JSON.stringify({ diagnostics: ev && ev.diagnostics, verdicts: ev && ev.verdicts }));
    t('2g: usage and finish_reason are persisted — so the next truncation question is arithmetic',
      !!ev && !!ev.providerMeta && ev.providerMeta.finish_reason === 'stop'
        && !!ev.providerMeta.usage && ev.providerMeta.usage.completion_tokens === 2222
        && Array.isArray(ev.usage) && ev.usage.length === 1,
      JSON.stringify(ev && ev.providerMeta));
    t('2h: the five slots came back and production derived the categories — no category was sent',
      !!ev && (ev.portfolios[0].facets || []).map(f => f.dimension).join(',')
                === CONTRACT.dimensions.join(',')
        && (ev.portfolios[0].facets || []).every(f => !('category' in f)),
      JSON.stringify((ev && ev.portfolios[0].facets || []).map(f => f.dimension)));
    console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed  (sentinel arm — $0.00 spent)\n`);
    await browser.close();
    process.exit(fail ? 1 : 0);
  }

  const inTok = Math.ceil((req ? JSON.stringify(req.body).length : 0) / 4);
  const M = PRIOR.RATES[CONTRACT.model];
  const worst = (inTok / 1e6) * M.in + ((req ? req.body.max_tokens : 0) / 1e6) * M.out;
  console.log(`\n${'─'.repeat(84)}\n COST — unrounded`);
  console.log(`   recorded so far, from the ledger (6 paid calls)          $${PRIOR.total.toFixed(8)}`);
  console.log(`   this call, worst case at max_tokens ${req && req.body.max_tokens}          $${worst.toFixed(8)}`);
  console.log(`   cumulative if billed to the ceiling, recorded prior      $${(PRIOR.total + worst).toFixed(8)}`);
  console.log(`   cumulative against the CONSERVATIVE prior (the guard)   $${(PRIOR_UPPER_BOUND + worst).toFixed(8)}`);
  console.log(`   authorised ceiling                                      $${CAP_CUMULATIVE.toFixed(8)}`);
  console.log(`\n  NOT RUN. The previous authorization is consumed; this needs a new one.`);
  console.log(`${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
  await browser.close();
  process.exit(fail ? 1 : 0);
}

// ── LIVE ─────────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('_portfolio_sample_result.json', JSON.stringify(
  { report: R.report, verdicts: R.verdicts, manifest: R.manifest,
    providerMeta: R.providerMeta, rawCaptured: R.rawCaptured,
    productionLogs: seen.logs, rawResponse: seen.rawResponse,
    requestCensus: { dispatched: seen.batch.length, aborted: seen.aborted, escaped: seen.escaped.length } },
  null, 2));
if (seen.guardBlocked) console.error('  the spend guard blocked dispatch — nothing was spent.');
if (seen.secondAttempt) console.error('  a second attempt was blocked — report this.');
console.log('\n  requests dispatched: ' + seen.batch.length + ' · aborted: ' + seen.aborted
  + ' · escaped: ' + seen.escaped.length);
console.log('  production verdicts: ' + JSON.stringify(R.verdicts));
console.log('  batch report: ' + JSON.stringify(R.report));
console.log('  provider meta: ' + JSON.stringify(R.providerMeta));
console.log('  raw captured: ' + R.rawCaptured + ' response(s), ' + R.rawLength + ' chars');
console.log('  diagnostics: ' + JSON.stringify((R.report && R.report.diagnostics) || []));
console.log('  production said:');
(seen.logs.length ? seen.logs : ['(nothing captured)']).slice(0, 8).forEach(l => console.log('    ' + l));
console.log('  worst case authorised: $' + CAP_ADDITIONAL.toFixed(8)
  + ' · this request\'s worst case: $' + (seen.worstCase || 0).toFixed(8));
console.log('  _portfolio_sample_result.json written.');
await browser.close();
process.exit(fail ? 1 : 0);
