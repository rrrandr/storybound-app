// COLD SCENE 1 — COST MEASUREMENT RUN (Roman 2026-09-04)
//
// One cold Scene 1 from the committed branch, run to measure cost and nothing else.
//
// PRODUCTION DEFAULTS ARE THE POINT. This does NOT run on localhost: the audit sample gate
// (app.js:7756) runs the telemetry audits FULL on localhost/127 and samples at 5% everywhere
// else, so a localhost run would bill ~$0.05/scene of audits a real user never triggers. The
// page is served under a production hostname, so isDevMode() and _isQaHost() are both FALSE
// and every dev override — forced HOT opener, the Fatelands wish-demo bypass, full audits —
// is off exactly as it is for a real user.
//
//   node _cold_scene1_cost_run.mjs           → DRY rehearsal, network fenced, $0
//   node _cold_scene1_cost_run.mjs --real    → REAL dispatch to real providers, REAL MONEY
//
// The ledger records token counts and pricing metadata only. No prose is retained.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { makeSession } from './_test_session_env.mjs';

const REAL = process.argv.includes('--real');
const ORIGIN = 'https://storybound.love';
const DEV = 'http://localhost:3000';
const SRC_HASH = (await import('node:crypto')).createHash('sha256')
  .update(fs.readFileSync('public/app.js')).digest('hex').slice(0, 16);

// Dry-mode responders come from the committed Scene-1 suite's fixture preamble, never a
// second hand-written copy. Unused in --real.
let FIX = null, PROSE = null;
if (!REAL) {
  const SUITE = fs.readFileSync('_scene1_skeleton_delivery.mjs', 'utf8').split('\n');
  const LAUNCH = SUITE.findIndex(l => /^let browser = await chromium\.launch/.test(l));
  if (LAUNCH < 600) throw new Error('fixture slice boundary moved — refusing to guess');
  const p = './_cost_fixture_slice.mjs';
  fs.writeFileSync(p, SUITE.slice(0, LAUNCH).join('\n')
    + '\nexport { plannerReply, scaffoldReply, APLOT_VALID, GENERIC as APLOT_GENERIC, REQUEST_KINDS };\n');
  try { FIX = await import(p + '?t=' + Date.now()); } finally { try { fs.unlinkSync(p); } catch (_) {} }
  const hp = await import('./_hook_fixture_prose.mjs');
  PROSE = hp.buildScene1Prose(hp.NONTOKEN_A);
}

// ── THE REAL CONFIG DECIDES EVERYTHING, SO READ IT FIRST ──
// api/config reports has_XAI_API_KEY and, crucially, proxyUrl — model calls do NOT go to
// /api/proxy on this server, they go to an EXTERNAL proxy origin. Faking config (the shared
// test fixture reports has_XAI_API_KEY:false) would reroute the author off Grok and price a
// pipeline we are not running. So config is served real, and the session is seeded under the
// storage key derived from the REAL Supabase project ref — otherwise supabase-js finds no
// session, the issue purchase is correctly refused, and nothing dispatches at all.
const CFG = await (await fetch(DEV + '/api/config')).json();
const SB_ORIGIN = new URL(CFG.supabaseUrl).origin;
const SB_KEY = 'sb-' + new URL(CFG.supabaseUrl).hostname.split('.')[0] + '-auth-token';
const PROXY_ORIGIN = CFG.proxyUrl ? new URL(CFG.proxyUrl).origin : null;
if (!PROXY_ORIGIN) throw new Error('config reports no proxyUrl — refusing to guess where model calls go');
console.log(`config: proxy=${PROXY_ORIGIN} xaiKey=${CFG.has_XAI_API_KEY} supabase=${SB_ORIGIN}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultTimeout(300000); page.setDefaultNavigationTimeout(300000);
// Seed the session before any page script runs, under the real project's storage key.
// The token is a dummy; the endpoint that would validate it is stubbed below. All the client
// needs is a token PRESENT, which is what production requires before it will sell the issue.
await page.addInitScript(({ key, s }) => {
  try { window.localStorage.setItem(key, JSON.stringify(s)); } catch (_) {}
}, { key: SB_KEY, s: makeSession() });
// ══════════════════════════════════════════════════════════════════════════════════════
//  HARNESS-ONLY FETCH OBSERVER (Roman 2026-09-04)
//  Lives in this file, is injected into the test page via addInitScript, and exists nowhere
//  in any shipped file. Production is untouched: the pacing gate and the in-payload callSite
//  field have both been reverted, and app.js/orchestration-client.js are byte-identical to
//  the committed tree.
//
//  WHY IT HAS TO BE AT fetch. The in-payload field covered 8 of 49 dispatches, because 41 of
//  them are raw fetch() calls in app.js that never touch callChatGPT. fetch is the only place
//  every dispatch is visible.
//
//  IT MUTATES NOTHING. It reads the URL, the body's byte length, role and model, and a
//  stack-derived call chain — then calls native fetch with the ORIGINAL arguments. No header,
//  no body key, no role, no routing, no retry, no timing change.
// ══════════════════════════════════════════════════════════════════════════════════════
// Route-flag override for dry verification only. Production default is 'small'; this proves
// the flag actually reaches the dispatch and that reasoning_effort is dropped for Ministral.
if (process.env.PP_ROUTE) await page.addInitScript((r) => { window._preprocessorRoute = r; }, process.env.PP_ROUTE);
await page.addInitScript(() => {
  window.__fetchObs = [];
  try {
    var native = window.fetch.bind(window);
    var MODEL_RX = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
    window.fetch = function (input, init) {
      try {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (MODEL_RX.test(url)) {
          var body = (init && init.body) || '';
          var parsed = null; try { parsed = JSON.parse(String(body)); } catch (_) {}
          // A single frame is not an identity: callChat (app.js:271622) fans many logical
          // callers through one line. Keep a short chain so the caller behind a dispatcher
          // is visible. Frames without a .js filename (this wrapper) drop out naturally.
          var frames = String(new Error().stack || '').split('\n').slice(1);
          var chain = [];
          for (var i = 0; i < frames.length && chain.length < 4; i++) {
            var m = frames[i].match(/([\w.-]+\.js)[^)\s]*?:(\d+):(\d+)/);
            if (m) chain.push(m[1] + ':' + m[2]);
          }
          window.__fetchObs.push({
            seq: window.__fetchObs.length,
            path: String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0],
            bodyBytes: (function () { try { return new TextEncoder().encode(String(body)).length; } catch (_) { return null; } })(),
            role: (parsed && (parsed.role || parsed.profileLabel)) || null,
            model: (parsed && parsed.model) || null,
            jsonMode: !!(parsed && parsed.response_format),
            reasoningEffort: (parsed && parsed.reasoning_effort) || null,
            responseFormat: (parsed && parsed.response_format && parsed.response_format.type) || null,
            maxTokens: (parsed && parsed.max_tokens) || null,
            chain: chain.join('<-') || null,
            at: Date.now()
          });
        }
      } catch (_) {}
      return native(input, init);          // ORIGINAL arguments, untouched
    };
  } catch (_) {}
});

// ── NO CHECKOUT-RETURN RESUME (Roman 2026-09-04) ──
// The first live run logged "[BOOT] Found unresumed purchase intent" and then a SECOND
// handleBeginStory() from the CHECKOUT_RETURN branch at app.js:11686, which fires on a 500 ms
// timer and re-enters the flow underneath the one already running. Clear the intent keys
// before any page script runs so the app takes its ordinary cold-start path.
await page.addInitScript(() => {
  try {
    ['sb_baked_pending_entry','sb_ff_pending_entry','sb_pre_checkout_fortunes']
      .forEach(k => window.localStorage.removeItem(k));
    Object.keys(window.localStorage)
      .filter(k => k.indexOf('sb_pending_op_') === 0)
      .forEach(k => window.localStorage.removeItem(k));
  } catch (_) {}
});

const modelCalls = [], escaped = [], logs = [], forwardFailures = [];

// ══════════════════════════════════════════════════════════════════════════════════════
//  NETWORK-BOUNDARY ACCOUNTING
//  The in-app ledger in orchestration-client.js saw 1 of 48 dispatches in rehearsal: most
//  model calls are issued by direct fetches in app.js that never reach its cost-capture
//  function. A ledger that misses 47 calls cannot produce an exact dispatch count, so the
//  authoritative record is taken HERE, at the wire, where every call is visible by
//  construction and no code path can opt out.
//
//  COUNTS AND PRICING METADATA ONLY. `usage`, the model id, and the role label are read out
//  of the response; the generated text is never copied, stored, or written to disk.
// ══════════════════════════════════════════════════════════════════════════════════════
// ── PRODUCTION'S OWN ROLE → MODEL TABLE, READ NOT REMEMBERED ──
// The dry envelope must be the SHAPE the real proxy returns, model id included: a mock that
// omits a field the real response carries is how a ledger passes rehearsal and then cannot
// attribute a single /api/proxy call in the paid run.
const PROXY_SRC = fs.readFileSync('api/proxy.js', 'utf8');
const ROLE_MODEL = (() => {
  const out = {};
  for (const m of PROXY_SRC.matchAll(/^\s{2}([A-Z_]+):\s*\[\s*\n\s*'([^']+)'/gm)) out[m[1]] = m[2];
  return out;
})();
if (!ROLE_MODEL.NARRATIVE_AUTHOR) throw new Error('could not read the role→model table from api/proxy.js — refusing to guess');

// ── THE PERMITTED CENSUS, FROZEN BEFORE DISPATCH ──
// Recorded from the dry rehearsal and read here, so "unexpected" is defined in advance rather
// than judged after the money is spent. Two tiers, deliberately different:
//   UNEXPECTED PROVIDER  → refuse the call and stop the run. This is the spend-safety case:
//                          a provider nobody authorized must not be paid.
//   unexpected route/role→ allow, but flag loudly. Real responses legitimately steer the
//                          pipeline down branches the fixtures never reached; refusing those
//                          would guarantee the run fails and waste what it already spent.
// The distinction is a judgement call and is reported as one.
const CENSUS = JSON.parse(fs.readFileSync('_audit_out/permitted_call_census.json', 'utf8'));
const PERMITTED_PROVIDERS = new Set(CENSUS.providers);
const PERMITTED_ROUTES = new Set(CENSUS.routes);
const PERMITTED_PAIRS = new Set(Object.keys(CENSUS.byRouteAndRole));
const novelPairs = [], refusedProviders = [];
let stopRun = false;
// Every URL this harness actually fetches. The assertion that no model request reaches the
// live site is made against THIS, not against the page's requests: the page always addresses
// storybound.love and it is this redirection that must be proven.
const dispatchTargets = [];

const CEILING = Number(process.env.CEILING || 45);
let ceilingRefusals = 0;
const wire = [];
function _num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
function providerOf(model) {
  const m = String(model || '').toLowerCase();
  if (/grok/.test(m)) return 'xai';
  if (/mistral|magistral|ministral|codestral|pixtral/.test(m)) return 'mistral';
  if (/^(gpt|o1|o3|o4|chatgpt)/.test(m)) return 'openai';
  if (/gemini/.test(m)) return 'google';
  if (/deepseek/.test(m)) return 'deepseek';
  return null;
}
function findUsage(o, depth) {
  if (!o || typeof o !== 'object' || (depth || 0) > 4) return null;
  if (o.usage && typeof o.usage === 'object') return o.usage;
  for (const k of Object.keys(o)) {
    if (k === 'messages' || k === 'choices' && depth === undefined) { /* still search choices */ }
    const v = o[k];
    if (v && typeof v === 'object') { const u = findUsage(v, (depth || 0) + 1); if (u) return u; }
  }
  return null;
}
function recordWire(url, reqBody, respJson, meta) {
  meta = meta || {};
  // TIMESTAMP, REQUEST SIZE AND RESPONSE HEADERS. Three separate questions in this work —
  // when did the two 429s fire, how big were they, and what did the rate-limit headers say —
  // could not be answered because none of it was captured. Recorded now, always.
  // Every proxy in this app has its own envelope. The Mistral proxy forwards Mistral's usage
  // BOTH at the top level and under _orchestration.usage; the xAI proxy nests differently.
  // Search all of them rather than assuming one shape — and when nothing is found, say so.
  const model = (respJson && respJson.model)
             || (respJson && respJson._orchestration && respJson._orchestration.model)
             || (reqBody && reqBody.model) || null;
  const u = findUsage(respJson) || {};
  const pd = u.prompt_tokens_details || u.input_tokens_details || {};
  const cd = u.completion_tokens_details || u.output_tokens_details || {};
  const rec = {
    n: wire.length,
    endpoint: new URL(url).pathname,
    label: (reqBody && (reqBody.role || reqBody.profileLabel)) || null,
    callSite: (reqBody && reqBody.callSite) || null,
    model,
    // A dispatch with no resolvable provider is NAMED as unresolved on its endpoint, never
    // bucketed as 'unknown' beside real providers — an unattributed call is a hole in the
    // ledger and has to look like one.
    provider: providerOf(model) || ('unresolved' + new URL(url).pathname),
    promptTokens: _num(u.prompt_tokens != null ? u.prompt_tokens : u.input_tokens),
    cachedTokens: _num(pd.cached_tokens),
    visibleTokens: _num(u.completion_tokens != null ? u.completion_tokens : u.output_tokens),
    reasoningTokens: _num(cd.reasoning_tokens),
    usageKeys: Object.keys(u),
  };
  rec.at = Date.now();
  rec.startedAt = meta.startedAt ?? null;
  rec.reqBytes = (() => { try { return Buffer.byteLength(JSON.stringify(reqBody || {}), 'utf8'); } catch (_) { return null; } })();
  // Only rate/limit-relevant headers are kept — never auth, cookies, or anything identifying.
  rec.rateHeaders = (() => {
    const h = meta.headers || {};
    const keep = {};
    Object.keys(h).forEach(k => { if (/^(x-)?ratelimit|^retry-after$/i.test(k)) keep[k] = h[k]; });
    return Object.keys(keep).length ? keep : null;
  })();
  rec.httpStatus = meta.status ?? null;
  rec.parseError = meta.parseErr || null;
  rec.respBytes = meta.bytes ?? null;
  rec.missing = ['promptTokens','visibleTokens'].filter(k => rec[k] === null);
  // A call that failed at the transport is NOT a call with unknown usage — it is a failed
  // call, and conflating the two is how three 307 redirects looked like a Mistral
  // instrumentation gap. Both stay UNKNOWN for cost; only one is a defect in the ledger.
  rec.transportOk = rec.httpStatus === 200 && !rec.parseError;
  wire.push(rec);
  console.log(`  wire#${String(rec.n).padStart(2)} ${rec.provider.padEnd(8)} ${String(rec.label || '?').slice(0,24).padEnd(24)} ${String(rec.model).slice(0,20).padEnd(20)}` +
    ` @${rec.callSite || '-'} p=${rec.promptTokens ?? 'UNK'} c=${rec.cachedTokens ?? 'UNK'} v=${rec.visibleTokens ?? 'UNK'} r=${rec.reasoningTokens ?? 'UNK'}` +
    ` http=${rec.httpStatus ?? '-'}${rec.transportOk ? '' : ' ← TRANSPORT FAILURE'}`);
  return rec;
}
let realDispatches = 0;

// EVERYTHING under the production origin is served by the local dev server — including
// /api/**, so in --real the production serverless functions execute and really call the
// providers with the real keys. /api/config is NEVER faked: the test config reports
// has_XAI_API_KEY:false, which would reroute the author off Grok and measure a different
// pipeline than the one we are pricing.
await page.route(ORIGIN + '/**', async r => {
  const u = new URL(r.request().url());
  const target = DEV + u.pathname + u.search;
  const req = r.request();
  // Quota endpoint is stubbed in both modes: it is billing bookkeeping against Supabase,
  // not model routing, and a failure there aborts the scene for a reason unrelated to cost.
  if (u.pathname.startsWith('/api/consume-fortune')) {
    return r.fulfill({ status: 200, contentType: 'application/json',
                       body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
  }
  const isModel = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/.test(u.pathname);
  if (isModel) return modelRoute(r);
  if (false) {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const m = (b && b.messages) || [];
    const sys = String((m.find(x => x.role === 'system') || {}).content || '');
    const usr = String((m.find(x => x.role === 'user') || {}).content || '');
    const hits = FIX.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
    let out = JSON.stringify(FIX.APLOT_GENERIC);
    if (hits.length === 1) {
      const k = hits[0];
      if (k === 'author') out = PROSE;
      else if (k === 'planner') out = FIX.plannerReply(usr, null);
      else if (k === 'scaffold') { const _r = (sys + usr).match(/subject_ref:\s*(\S+)/);
                                   out = JSON.stringify(FIX.scaffoldReply(_r ? _r[1] : null, null)); }
      else if (k === 'aplotGenerator' || k === 'aplotCorrection') out = JSON.stringify(FIX.APLOT_VALID);
    }
    modelCalls.push({ path: u.pathname, kind: hits.join('+') || 'UNNAMED', model: b && b.model });
    const env = /mistral-proxy/.test(u.pathname)
      ? { id: 'dry', object: 'chat.completion', model: b && b.model, usage: {}, _orchestration: {},
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: out } }] }
      : { ok: true, content: out, choices: [{ message: { content: out } }] };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env) });
  }
  if (isModel) { realDispatches++; modelCalls.push({ path: u.pathname, kind: 'REAL', model: null }); }
  let res;
  try {
    res = await fetch(target, {
      method: req.method(), headers: req.headers(),
      body: ['GET','HEAD'].includes(req.method()) ? undefined : req.postData(),
    });
  } catch (e) {
    // A forwarding failure must be visible, not fatal: an unhandled throw in a route handler
    // kills the run with a stack trace that reads like an app fault.
    forwardFailures.push({ path: u.pathname, err: String(e && e.message) });
    return r.fulfill({ status: 502, contentType: 'application/json',
                       body: JSON.stringify({ error: 'forward_failed' }) });
  }
  const body = Buffer.from(await res.arrayBuffer());
  return r.fulfill({ status: res.status,
                     contentType: res.headers.get('content-type') || 'text/html', body });
});
// Supabase itself is never contacted: identity is seeded, and the one endpoint that would
// charge the wallet is stubbed. This is billing/identity, orthogonal to model routing.
// ── "NO ROWS" MUST LOOK LIKE NO ROWS ──
// This stub used to answer '{}'. supabase-js hands that back as a TRUTHY data object, so the
// boot-time deferred-intent lookup at app.js:12583 found a "row", took the CHECKOUT_RETURN
// branch, and fired a second handleBeginStory() on a 500 ms timer underneath the one already
// running — which is what reset the access state mid-measurement. An empty ARRAY is what a
// PostgREST query with no matching rows actually returns, and .maybeSingle() reduces it to
// null. The app was behaving correctly; the harness was lying to it.
await page.route(SB_ORIGIN + '/**', r => {
  const m = r.request().method();
  if (m === 'GET' || m === 'HEAD') {
    return r.fulfill({ status: 200, contentType: 'application/json',
                       headers: { 'content-range': '*/0' }, body: '[]' });
  }
  return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});

// ── THE MODEL BOUNDARY ──
async function modelRoute(r) {
  // RPS compliance is a property of when requests START. recordWire runs after the response
  // lands, so gaps measured there are completion gaps and can be shorter than the start
  // spacing — that is what made a correctly paced run look 3 ms non-compliant.
  const startedAt = Date.now();
  let b = null; try { b = JSON.parse(r.request().postData() || '{}'); } catch (_) {}
  const url = r.request().url();
  if (REAL) {
    // ── HARNESS-SIDE DISPATCH CEILING ──
    // No provider-side spend cap was set for this run, and rehearsal showed production
    // retrying PRIMARY_AUTHOR 20 times against responses it rejected. A retry storm on the
    // Grok author — hundreds of KB of prompt, reasoning tokens no request parameter bounds —
    // is the one way this run becomes expensive by accident. Past the ceiling the runner
    // refuses the call rather than paying for it; refusals are counted and reported, and a
    // run that hits the ceiling is reported as CEILING-STOPPED, never as a completed scene.
    // ── PRE-DISPATCH CENSUS CHECK ──
    const _path = new URL(url).pathname;
    const _role = (b && (b.role || b.profileLabel)) || '?';
    const _pair = _path + '|' + _role;
    if (!PERMITTED_ROUTES.has(_path)) {
      refusedProviders.push({ endpoint: _path, role: _role, why: 'route not in permitted census' });
      stopRun = true;
      return r.fulfill({ status: 503, contentType: 'application/json',
                         body: JSON.stringify({ error: 'unpermitted_route' }) });
    }
    if (!PERMITTED_PAIRS.has(_pair)) novelPairs.push(_pair);
    if (stopRun) {
      return r.fulfill({ status: 503, contentType: 'application/json',
                         body: JSON.stringify({ error: 'run_stopped' }) });
    }
    if (realDispatches >= CEILING) {
      ceilingRefusals++;
      return r.fulfill({ status: 503, contentType: 'application/json',
                         body: JSON.stringify({ error: 'harness_dispatch_ceiling' }) });
    }
    realDispatches++;
    // route.fetch() performs the REAL request and hands back the response, so the usage
    // block can be read before the page sees it. route.continue() would dispatch it too but
    // leave the body unreadable, and the count would again come from in-app instrumentation
    // that demonstrably misses most calls.
    // ── THE DESTINATION MUST BE NAMED ──
    // route.fetch() with no url re-issues the request to its ORIGINAL url, and it bypasses
    // this handler's own routes. The page origin is storybound.love, which is a LIVE site:
    // the first real run therefore sent its model dispatches to production and got 307s back
    // for the Mistral route, which is why three calls reported no usage and the author never
    // ran. Point it explicitly at the local dev server so the LOCAL proxy handlers execute.
    const target = DEV + new URL(url).pathname + new URL(url).search;
    dispatchTargets.push(target);
    const resp = await r.fetch({ url: target });
    const buf = await resp.body();
    let j = null, parseErr = null;
    try { j = JSON.parse(buf.toString('utf8')); } catch (e) { parseErr = String(e && e.message); }
    recordWire(url, b, j, { status: resp.status(), parseErr, bytes: buf.length, headers: resp.headers(), startedAt });
    modelCalls.push({ path: new URL(url).pathname, kind: 'REAL', model: b && b.model });
    return r.fulfill({ response: resp, body: buf });
  }
  const m = (b && b.messages) || [];
  const sys = String((m.find(x => x.role === 'system') || {}).content || '');
  const usr = String((m.find(x => x.role === 'user') || {}).content || '');
  const hits = FIX.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
  let out = JSON.stringify(FIX.APLOT_GENERIC);
  if (hits.length === 1) {
    const k = hits[0];
    if (k === 'author') out = PROSE;
    else if (k === 'planner') out = FIX.plannerReply(usr, null);
    else if (k === 'scaffold') { const _r = (sys + usr).match(/subject_ref:\s*(\S+)/);
                                 out = JSON.stringify(FIX.scaffoldReply(_r ? _r[1] : null, null)); }
    else if (k === 'aplotGenerator' || k === 'aplotCorrection') out = JSON.stringify(FIX.APLOT_VALID);
  }
  modelCalls.push({ path: new URL(url).pathname, kind: hits.join('+') || 'UNNAMED', model: b && b.model });
  // A synthetic usage block, so the accounting path itself is exercised in rehearsal rather
  // than first meeting a real response during a paid run.
  const _role = (b && b.role) || null;
  const _dryModel = (b && b.model) || ROLE_MODEL[_role] || null;
  const env = { ok: true, content: out, model: _dryModel,
                _orchestration: { role: _role, model: _dryModel, provider: 'dry' },
                usage: { prompt_tokens: 1, completion_tokens: 1,
                         prompt_tokens_details: { cached_tokens: 0 },
                         completion_tokens_details: { reasoning_tokens: 0 } },
                choices: [{ message: { content: out } }] };
  recordWire(url, b, env, { status: 200, parseErr: null, bytes: JSON.stringify(env).length, headers: {}, startedAt });
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env) });
}
await page.route(PROXY_ORIGIN + '/**', modelRoute);

// Fonts and the supabase-js CDN bundle are static assets, not model traffic.
const STATIC = /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|use\.typekit\.net|p\.typekit\.net/;
page.on('request', r => {
  const u = r.url();
  if (!/^https?:\/\//.test(u)) return;
  if (u.startsWith(ORIGIN) || u.startsWith(DEV) || u.startsWith(SB_ORIGIN) || u.startsWith(PROXY_ORIGIN)) return;
  if (STATIC.test(u)) return;
  escaped.push(u);
});
page.on('console', m => { const x = m.text();
  if (/Profile hydrated\./.test(x)) page.evaluate(() => { window.__hydrationSeen = true; }).catch(() => {});
  logs.push(x.slice(0, 260)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 200)));

console.log(`\n${REAL ? '★ REAL DISPATCH — THIS SPENDS MONEY' : 'DRY REHEARSAL — network fenced, $0'}`);
console.log(`app.js sha256[0:16] = ${SRC_HASH} · origin = ${ORIGIN}\n`);

await page.goto(ORIGIN + '/', { waitUntil: 'commit', timeout: 120000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 180000 });

// ── LET PROFILE HYDRATION FINISH FIRST ──
// Hydration lands asynchronously and reported "Subscribed: false | Fortunes: 0" AFTER the
// run had staged its access state, overwriting it. Waiting for the log line means the staged
// values are the last word rather than the first.
await page.waitForFunction(() => window.__hydrationSeen === true, { timeout: 120000 })
  .catch(() => console.log('  (no hydration marker within 120s — continuing; access state may race)'));

const out = await page.evaluate(async () => {
  const s = window.state;
  // ── PRODUCTION DEFAULTS, ASSERTED NOT ASSUMED ──
  const overrides = ['_forceAudits','_forceDeckMandate','_forceScene1Onboarding','_forceHotOpener',
                     '_canonGateSpineSignal','_armA50','_forceMandateOff','_auditSampleRate']
    .filter(k => typeof window[k] !== 'undefined' && typeof window[k] !== 'function');
  const env = { host: location.hostname,
                isDevMode: typeof window.isDevMode === 'function' ? window.isDevMode() : null,
                overridesPresent: overrides };
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor,
    dynamic: def.dynamic, archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling',
    tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'Steamy',
    pov: 'first_person', identity: { playerName: 'Lirael', partnerName: 'Julian' },
    renderMode: 'literary', currentEngine: 'literary',
    storyId: 'coldcost-' + Date.now(), myUid: 'costprobe',
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
  s.picks.identity = s.identity; s._skipCorridorValidation = true;
  // ONE BEGIN, AND THE HARNESS KNOWS IF THERE WERE MORE. A second entry from any boot path
  // is a measurement fault, not a detail: it re-enters the flow with different access state.
  window.__beginCalls = 0;
  const _origBegin = window.handleBeginStory;
  window.handleBeginStory = function () { window.__beginCalls++; return _origBegin.apply(this, arguments); };
  const t0 = Date.now();
  let threw = null;
  try { await window.handleBeginStory(); } catch (e) { threw = String(e && e.message); }
  // ── handleBeginStory RESOLVES BEFORE THE SCENE IS DONE ──
  // It returned in ~0.5s while dispatches were still in flight, so a ledger read here would
  // have counted a fraction of the run and called it the cost of a scene. Wait until the call
  // ledger has been STABLE for a stretch, i.e. nothing new dispatched, rather than guessing a
  // duration. Reported as `settled` so a timeout can never be mistaken for completion.
  const SETTLE_MS = 12000, MAX_MS = 900000;
  let lastLen = -1, lastChange = Date.now(), settled = false;
  while (Date.now() - t0 < MAX_MS) {
    const n = ((window.__fetchObs) || []).length;
    if (n !== lastLen) { lastLen = n; lastChange = Date.now(); }
    else if (Date.now() - lastChange > SETTLE_MS) { settled = true; break; }
    await new Promise(r => setTimeout(r, 1000));
  }
  s._skipCorridorValidation = false;
  return { env, threw, settled, dispatchesAtSettle: lastLen, wallMs: Date.now() - t0,
           beginCalls: window.__beginCalls,
           accessDecision: (s._lastAccessDecision && s._lastAccessDecision.decisionId) || null,
           hydratedSubscribed: s.subscribed, hydratedFortunes: s.fortunes,
           // COUNTS AND PRICING METADATA ONLY — no prose crosses this boundary.
           obs: (window.__fetchObs || []).slice(),
           xai: window._xaiLedgerReport ? window._xaiLedgerReport() : null,
           proseChars: (s.currentSceneText || '').length };
});

console.log(`host=${out.env.host} isDevMode=${out.env.isDevMode} overrides=${JSON.stringify(out.env.overridesPresent)}`);
console.log(`wall=${(out.wallMs / 1000).toFixed(1)}s  prose=${out.proseChars} chars (length only; text not retained)`);
console.log(`settled=${out.settled} (false = timed out, NOT complete) · observer dispatches at settle=${out.dispatchesAtSettle}`);
console.log(`handleBeginStory entries: ${out.beginCalls}${out.beginCalls === 1 ? '' : '  ← RACE: more than one begin, measurement invalid'} · subscribed=${out.hydratedSubscribed} fortunes=${out.hydratedFortunes}`);
if (out.threw) console.log(`THREW: ${out.threw}`);
console.log(`escaped-origin requests: ${escaped.length}`);
console.log(`dispatch ceiling: ${CEILING} · refusals after ceiling: ${ceilingRefusals}` + (ceilingRefusals ? '  ← CEILING-STOPPED, this is NOT a completed scene' : ''));
console.log(`forward failures: ${forwardFailures.length}` + (forwardFailures.length ? ' → ' + JSON.stringify(forwardFailures.slice(0,4)) : ''));
console.log(`model endpoint hits observed by the runner: ${modelCalls.length}` + (REAL ? ` (real dispatches ${realDispatches})` : ''));

// ── THE AUTHORITATIVE RECORD IS THE WIRE ──
const XAI = { lo: { input: 1.25e-6, cached: 0.20e-6, output: 2.50e-6 },
              hi: { input: 2.50e-6, cached: 0.40e-6, output: 5.00e-6 }, tierAt: 200000 };
const byProv = {};
let xaiCost = 0, xaiExact = true, xaiIncomplete = 0, unpriced = 0;
for (const r of wire) {
  const p = byProv[r.provider] = byProv[r.provider] || { calls: 0, prompt: 0, cached: 0, visible: 0, reasoning: 0, incomplete: 0 };
  p.calls++; if (r.missing.length) p.incomplete++;
  p.prompt += r.promptTokens || 0; p.cached += r.cachedTokens || 0;
  p.visible += r.visibleTokens || 0; p.reasoning += r.reasoningTokens || 0;
  if (r.provider === 'xai') {
    if (r.missing.length) { xaiIncomplete++; xaiExact = false; continue; }
    const t = r.promptTokens >= XAI.tierAt ? XAI.hi : XAI.lo;
    const ck = r.cachedTokens !== null, cch = ck ? r.cachedTokens : 0;
    r.cost = Math.max(0, r.promptTokens - cch) * t.input + cch * t.cached
           + ((r.visibleTokens || 0) + (r.reasoningTokens || 0)) * t.output;
    xaiCost += r.cost; if (!ck) xaiExact = false;
  } else { unpriced++; }
}
console.log(`\n════ WIRE LEDGER — ${wire.length} dispatches (authoritative: counted at the network boundary) ════`);
for (const [prov, p] of Object.entries(byProv)) {
  console.log(`  ${prov.padEnd(9)} calls=${String(p.calls).padStart(3)}  prompt=${p.prompt.toLocaleString().padStart(9)}` +
              `  cached=${p.cached.toLocaleString().padStart(8)}  visible=${p.visible.toLocaleString().padStart(7)}` +
              `  reasoning=${p.reasoning.toLocaleString().padStart(7)}` + (p.incomplete ? `  NO-USAGE=${p.incomplete}` : ''));
}
console.log(`\n  xAI cost:  ${'$' + xaiCost.toFixed(6)}   exact=${xaiExact}   xAI calls missing usage=${xaiIncomplete}`);
console.log(`  non-xAI dispatches priced: 0 of ${unpriced} — rates not quoted from memory; reconcile from provider dashboards`);
console.log(`  ALL-IN: ${unpriced ? 'PARTIAL — xAI $' + xaiCost.toFixed(6) + ' + ' + unpriced + ' unpriced non-xAI call(s)' : '$' + xaiCost.toFixed(6)}`);
fs.writeFileSync('_audit_out/cold_scene1_wire' + (REAL ? '' : '_dry') + '.json', JSON.stringify({
  mode: REAL ? 'real' : 'dry', appJsSha: SRC_HASH, at: new Date().toISOString(), origin: ORIGIN,
  env: out.env, settled: out.settled, wallMs: out.wallMs, threw: out.threw,
  dispatchCount: wire.length, byProvider: byProv, xaiCost, xaiCostIsExact: xaiExact,
  xaiCallsMissingUsage: xaiIncomplete, unpricedNonXaiCalls: unpriced,
  reconciliation: 'PROVISIONAL — not yet reconciled against xAI console usage',
  dispatchCeiling: CEILING, ceilingRefusals, ceilingStopped: ceilingRefusals > 0,
  dispatchTargetsAllLocal: dispatchTargets.every(t => t.startsWith(DEV)), dispatchTargetCount: dispatchTargets.length,
  novelRouteRolePairs: [...new Set(novelPairs)], refusedProviders, observer: out.obs,
  calls: wire }, null, 2));
console.log(`  written → _audit_out/cold_scene1_wire${REAL ? '' : '_dry'}.json`);

// ════ PROOF CHECKS ════
let pass = 0, fail = 0;
const chk = (name, ok, detail) => { ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '   — ' + detail : ''}`); };
const OBS = out.obs || [];
const authorCalls = wire.filter(r => /NARRATIVE_AUTHOR/.test(String(r.label || '')));
const unresolved = wire.filter(r => String(r.provider).startsWith('unresolved'));
const transportBad = wire.filter(r => !r.transportOk);
console.log('\n════ MEASUREMENT-PATH PROOF ════');
chk('exactly one handleBeginStory entry (no boot-time auto-begin race)', out.beginCalls === 1, `entries=${out.beginCalls}`);
chk('access state survived hydration', out.hydratedSubscribed === true && (out.hydratedFortunes || 0) > 0,
    `subscribed=${out.hydratedSubscribed} fortunes=${out.hydratedFortunes}`);
chk('the flow REACHES THE AUTHOR (NARRATIVE_AUTHOR dispatched)', authorCalls.length >= 1, `author dispatches=${authorCalls.length}`);
chk('every model dispatch was intercepted — nothing reached an unrouted origin', escaped.length === 0, `escaped=${escaped.length}`);
chk('every dispatch completed at the transport (200 + parseable body)', transportBad.length === 0,
    transportBad.length ? JSON.stringify(transportBad.slice(0, 3).map(r => ({ e: r.endpoint, http: r.httpStatus }))) : '');
chk(REAL ? 'NO model request reached storybound.love' : 'DRY: nothing was dispatched to any live endpoint',
    REAL ? (dispatchTargets.length > 0 && dispatchTargets.every(t => t.startsWith(DEV)))
         : (dispatchTargets.length === 0 && realDispatches === 0),
    `targets=${dispatchTargets.length} realDispatches=${realDispatches}`);
chk('no unpermitted provider or route was paid for', refusedProviders.length === 0);
chk('every dispatch is attributed to a provider', unresolved.length === 0,
    unresolved.length ? `${unresolved.length} unresolved` : '');
// ── ATTRIBUTION COVERAGE — the point of this run ──
chk('the harness observer saw every dispatch the wire saw', OBS.length === wire.length,
    `observer=${OBS.length} wire=${wire.length}`);
chk('EVERY dispatch carries a stack-derived call chain', OBS.every(o => !!o.chain),
    `withChain=${OBS.filter(o => o.chain).length} of ${OBS.length}`);
console.log(`\n${fail === 0 ? 'PROOF GREEN' : 'PROOF INCOMPLETE'}: ${pass} passed, ${fail} failed`);

console.log('\n──── decision / retry log lines ────');
logs.filter(l => /SCENE1|ABORT|RETRY|retry|PAGEERROR|AUDIT|BeginStory|gate|Gate|refus|blocked|purchase|paywall|fortun/i.test(l)).slice(0, 25).forEach(l => console.log('  ' + l));
console.log('\n──── escaped-origin requests ────');
[...new Set(escaped)].slice(0, 12).forEach(u => console.log('  ' + u.slice(0, 120)));

await browser.close();
