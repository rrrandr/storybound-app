// REASONING-MISTRAL REQUEST CONTROL — proves what actually goes on the wire. ZERO dispatches.
//
// The question this control exists to answer is narrow and easy to get wrong: when the calibration
// says it is measuring "Mistral Small 4 in reasoning mode", is the request it sends actually
// naming mistral-small-2603 and actually carrying reasoning_effort="high"?
//
// It matters because the failure is SILENT. /api/mistral-proxy auto-defaults reasoning_effort to
// 'high' only for AUTHOR-CLASS payloads — it detects them by the "STORYBOUND ARCHITECTURE LAWS"
// system prompt, and the canon-audit prompt does not contain it. So a canon-audit request that
// omits the parameter is served cheerfully as ORDINARY, non-reasoning Mistral Small 4, returns a
// perfectly valid answer, and gets filed under "reasoning Mistral REJECTED". Nothing errors.
//
// And the gap was real: _tieredProviderDispatch did not forward reasoning_effort AT ALL. The proxy
// has accepted and validated the parameter for weeks; the client had no way to send it. Every
// assertion below would have failed before this pass, which is why each one is also run in its
// NEGATIVE form — an assertion nobody has watched go red is not a control.
//
// usage: node _canon_audit_reasoning_request_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { installCalibrationRoute, makeLedger, candidate, CANDIDATES } from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_reasoning_request_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 500) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

const CAND = candidate('mistral-small-2603');

// ── THE ASSERTION UNDER TEST, as a pure function ─────────────────────────────────────────────
// Defined once and applied to BOTH a correct request and a deliberately degraded one, so its
// failure is demonstrated rather than asserted. A control that only ever sees the passing case
// proves the case passes, not that the control would notice if it stopped.
export function assertReasoningRequest(pathname, body, cand) {
  const errs = [];
  if (pathname !== cand.endpoint) errs.push('endpoint is "' + pathname + '", not ' + cand.endpoint);
  if (!body) { errs.push('no request body'); return { ok: false, errors: errs }; }
  if (body.model !== cand.model) errs.push('model is "' + body.model + '", not ' + cand.model);
  if (!('reasoning_effort' in body)) errs.push('reasoning_effort is ABSENT — the proxy will serve this as ordinary, non-reasoning ' + cand.model);
  else if (String(body.reasoning_effort) !== String(cand.reasoningEffort)) errs.push('reasoning_effort is "' + body.reasoning_effort + '", not "' + cand.reasoningEffort + '"');
  if (body.max_tokens !== cand.maxTokens) errs.push('max_tokens is ' + body.max_tokens + ', not ' + cand.maxTokens);
  return { ok: errs.length === 0, errors: errs };
}

// A real Mistral REASONING reply: message.content is an ARRAY OF BLOCKS, not a string.
const REASONING_REPLY = {
  choices: [{ message: { content: [
    { type: 'thinking', thinking: [{ type: 'text', text: 'The packet forecloses no ordinary speech here. Julian lifting a band is not a capability claim.' }] },
    { type: 'text', text: '{"verdict":"pass","violations":[]}' }
  ] } }],
  usage: { prompt_tokens: 2411, completion_tokens: 388, total_tokens: 2799 },
  _orchestration: { model: 'mistral-small-2603', provider: 'mistral', reasoning_effort: 'high' }
};

(async () => {
  console.log('=== REASONING-MISTRAL REQUEST CONTROL (zero dispatches) ===');

  section('1. THE CANDIDATE IS THE DOCUMENTED PINNED SNAPSHOT, NOT AN ALIAS');
  ok('the calibration candidate is the pinned snapshot mistral-small-2603',
    CAND.model === 'mistral-small-2603', CAND.model);
  ok('it is NOT a drifting alias — "latest" would let the measured model change underneath the run',
    !/latest/.test(CAND.model), CAND.model);
  ok('reasoning effort is pinned to "high", one of the two values Mistral actually documents',
    CAND.reasoningEffort === 'high', String(CAND.reasoningEffort));
  ok('it routes to the mistral proxy, not OpenAI or Grok',
    CAND.endpoint === '/api/mistral-proxy' && CAND.provider === 'mistral', CAND.endpoint + '/' + CAND.provider);
  ok('output is priced at Mistral Small 4\'s published $0.60/M, NOT Ministral 8B\'s $0.15/M',
    CAND.rate.out === 6e-7 && CAND.rate.in === 1.5e-7, JSON.stringify(CAND.rate));
  // The ceiling has to be justified by arithmetic, not chosen because it sounds safe.
  const worstCase = CAND.perCallUsd * 8;
  ok('the $0.02 ceiling covers the WORST case (max_tokens fully spent on all eight), not an expected case',
    CAND.ceilingUsd === 0.02 && worstCase <= 0.02 && worstCase > 0.01,
    'worst case $' + worstCase.toFixed(6) + ' vs ceiling $' + CAND.ceilingUsd);
  ok('max_tokens is raised above the 700 used for non-reasoning candidates, so thinking cannot eat the whole answer',
    CAND.maxTokens === 2000, String(CAND.maxTokens));

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  // The stub captures the request INDEPENDENTLY of the calibration route's own log, so the two
  // can be cross-checked rather than trusted from a single source.
  const seen = [];
  let mistralReply = REASONING_REPLY;
  gate.stub('/api/mistral-proxy', async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    seen.push({ pathname: new URL(req.url()).pathname, body: b });
    return mistralReply;
  });
  gate.stub('/api/chatgpt-proxy', async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    seen.push({ pathname: new URL(req.url()).pathname, body: b });
    return { content: '{"verdict":"pass","violations":[]}' };
  });

  const holder = { ledger: makeLedger(CAND.ceilingUsd, CAND.perCallUsd), log: [], currentFixture: null, candidate: CAND };
  await installCalibrationRoute(page, holder);
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._callTieredProvider && window._flattenProviderContent, { timeout: 30000 });

  // One helper that drives the REAL production dispatcher exactly as the runner does.
  const dispatch = (tier, maxTokens) => page.evaluate(async (a) => {
    try {
      const res = await window._callTieredProvider('reasoningRequestControl',
        [{ role: 'system', content: 'CANON AUDITOR' }, { role: 'user', content: 'plan' }],
        { max_tokens: a.maxTokens, temperature: 0, tiers: [a.tier] });
      return { ok: true, content: res.content, thinking: res.thinking || null,
        reasoningEffort: res.reasoningEffort || null, usage: res.usage || null,
        servedModel: (res._orchestration && res._orchestration.model) || null };
    } catch (e) { return { ok: false, error: (e && e.message) || String(e) }; }
  }, { tier, maxTokens });

  section('2. THE REAL OUTGOING REQUEST NAMES THE MODEL AND THE REASONING EFFORT');
  holder.currentFixture = 'control_correct';
  const good = await dispatch({ tier: 'primary', provider: 'mistral', model: CAND.model, reasoning_effort: CAND.reasoningEffort }, CAND.maxTokens);
  const wire = seen[seen.length - 1] || null;
  fs.writeFileSync(path.join(OUT_DIR, 'outgoing_request.json'), JSON.stringify(wire, null, 2));
  const verdictGood = wire ? assertReasoningRequest(wire.pathname, wire.body, CAND) : { ok: false, errors: ['no request reached the wire'] };
  ok('a request actually reached the wire', !!wire, 'nothing captured');
  ok('THE WIRE NAMES mistral-small-2603', !!wire && wire.body.model === 'mistral-small-2603', wire && wire.body.model);
  ok('THE WIRE CARRIES reasoning_effort="high", explicitly — not inferred, not defaulted',
    !!wire && wire.body.reasoning_effort === 'high', wire && JSON.stringify(wire.body.reasoning_effort));
  ok('the wire carries max_tokens 2000, the bound the cost estimate rests on',
    !!wire && wire.body.max_tokens === 2000, wire && String(wire.body.max_tokens));
  ok('the full assertion passes on a correct request', verdictGood.ok, verdictGood.errors.join('; '));
  ok('the calibration route logged the SAME body independently of the stub',
    JSON.stringify((holder.log.filter((e) => e.kind === 'request-body').pop() || {}).body) === JSON.stringify(wire && wire.body));

  section('3. THE REASONING RESPONSE SHAPE IS HANDLED — a block array is not a string');
  // Without the flattener, content is an ARRAY. It is TRUTHY, so the tier's hadContent check
  // passes and NO fallback fires; String() turns it into "[object Object],[object Object]" and
  // every fixture scores unavailable. The run would have cost full price and measured nothing.
  ok('the dispatch succeeded rather than erroring on the block array', good.ok, good.error);
  ok('content is a STRING, flattened from the block array', typeof good.content === 'string', typeof good.content);
  ok('content is the model\'s actual JSON answer, not "[object Object]"',
    typeof good.content === 'string' && /"verdict"\s*:\s*"pass"/.test(good.content) && !/\[object Object\]/.test(good.content),
    String(good.content).slice(0, 120));
  ok('the thinking trace is preserved SEPARATELY, not pasted into the answer',
    typeof good.thinking === 'string' && /capability claim/.test(good.thinking)
    && !/capability claim/.test(String(good.content)), String(good.thinking).slice(0, 120));
  ok('the PROXY\'s reported reasoning_effort is surfaced — evidence of what was served, not what we asked',
    good.reasoningEffort === 'high', String(good.reasoningEffort));
  ok('usage survives for the realized-cost calculation', !!(good.usage && good.usage.completion_tokens), JSON.stringify(good.usage));
  // Prove the negative directly: the raw array is what the old code would have handed on.
  const preFix = await page.evaluate((raw) => {
    const s = String(raw);
    return { asString: s, flattened: window._flattenProviderContent(raw).text };
  }, REASONING_REPLY.choices[0].message.content);
  ok('RED PROOF — the UNFLATTENED array really does stringify to garbage, so the flattener is load-bearing',
    /\[object Object\]/.test(preFix.asString) && /"verdict"/.test(preFix.flattened), preFix.asString.slice(0, 80));

  section('4. A MISSING OR STRIPPED REASONING PARAMETER FAILS — the assertion goes red');
  // 4a. The pure assertion must reject a body with the parameter removed.
  const stripped = Object.assign({}, wire.body); delete stripped.reasoning_effort;
  const vStripped = assertReasoningRequest(wire.pathname, stripped, CAND);
  ok('RED PROOF — the assertion REJECTS a body whose reasoning_effort was stripped',
    !vStripped.ok && vStripped.errors.some((e) => /ABSENT/.test(e)), JSON.stringify(vStripped));
  const wrongVal = Object.assign({}, wire.body, { reasoning_effort: 'none' });
  ok('RED PROOF — the assertion REJECTS reasoning_effort="none" (a value the proxy would happily accept)',
    !assertReasoningRequest(wire.pathname, wrongVal, CAND).ok);
  const wrongModelBody = Object.assign({}, wire.body, { model: 'ministral-8b-2512' });
  ok('RED PROOF — the assertion REJECTS the wrong model even with reasoning set correctly',
    !assertReasoningRequest(wire.pathname, wrongModelBody, CAND).ok);
  ok('RED PROOF — the assertion REJECTS the right body sent to the wrong endpoint',
    !assertReasoningRequest('/api/chatgpt-proxy', wire.body, CAND).ok);

  // 4b. And the LIVE path must go red too: omitting the tier's reasoning_effort must be stopped
  // BEFORE dispatch, not merely noticed afterwards. This is the case that would otherwise spend
  // real money measuring ordinary Mistral and reporting it as reasoning Mistral.
  const seenBefore = seen.length, logBefore = holder.log.length;
  holder.currentFixture = 'control_no_reasoning';
  const noReasoning = await dispatch({ tier: 'primary', provider: 'mistral', model: CAND.model }, CAND.maxTokens);
  const blockedRe = holder.log.slice(logBefore).filter((e) => e.kind === 'blocked-reasoning');
  ok('RED PROOF — a dispatch that omits reasoning_effort is ABORTED, not served',
    noReasoning.ok === false && blockedRe.length === 1, JSON.stringify(noReasoning).slice(0, 200));
  ok('RED PROOF — and it never reached the wire at all (zero further stub hits)',
    seen.length === seenBefore, 'stub saw ' + (seen.length - seenBefore) + ' extra request(s)');
  ok('the block explains the SILENT failure it prevents, not just "invalid"',
    blockedRe.length === 1 && /ordinary \(non-reasoning\)/.test(blockedRe[0].reason), JSON.stringify(blockedRe[0]));
  ok('no budget was reserved for the aborted request',
    holder.ledger.entries.filter((e) => e.label === 'control_no_reasoning').length === 0);

  section('5. NO OTHER MODEL OR ENDPOINT IS PERMITTED');
  const l1 = holder.log.length;
  holder.currentFixture = 'control_other_model';
  const otherModel = await dispatch({ tier: 'primary', provider: 'mistral', model: 'ministral-8b-2512', reasoning_effort: 'high' }, CAND.maxTokens);
  ok('a different Mistral model is aborted before dispatch',
    otherModel.ok === false && holder.log.slice(l1).some((e) => e.kind === 'blocked-model'), JSON.stringify(otherModel).slice(0, 160));
  const l2 = holder.log.length;
  holder.currentFixture = 'control_other_endpoint';
  const otherEp = await dispatch({ tier: 'primary', provider: 'openai', model: CAND.model }, CAND.maxTokens);
  ok('a different ENDPOINT is aborted before dispatch, even carrying the right model name',
    otherEp.ok === false && holder.log.slice(l2).some((e) => e.kind === 'blocked-endpoint'), JSON.stringify(otherEp).slice(0, 160));
  ok('the openai stub was never reached, so nothing could have been served from the wrong provider',
    !seen.some((x) => x.pathname === '/api/chatgpt-proxy'));
  const l3 = holder.log.length;
  holder.currentFixture = 'control_grok';
  const grok = await dispatch({ tier: 'primary', provider: 'grok', model: 'grok-4-1-fast-reasoning' }, CAND.maxTokens);
  ok('Grok is aborted too — the run is pinned to reasoning Mistral only, with no fallback',
    grok.ok === false && holder.log.slice(l3).some((e) => e.kind === 'blocked-endpoint'), JSON.stringify(grok).slice(0, 160));

  section('6. EXISTING CALLERS ARE UNCHANGED — the parameter is additive');
  // The requirement is a property of the CANDIDATE, not of the transport: swap the holder to the
  // non-reasoning candidate and the same route must stop demanding an effort key. This is also the
  // back-compat proof for every production caller, all of which send no reasoning at all.
  mistralReply = { content: '{"verdict":"pass","violations":[]}' };
  holder.candidate = candidate('ministral-8b-2512');
  holder.currentFixture = 'control_plain';
  const plain = await dispatch({ tier: 'primary', provider: 'mistral', model: 'ministral-8b-2512' }, 700);
  const plainWire = seen[seen.length - 1];
  ok('a caller that asks for no reasoning is SERVED, not blocked', plain.ok, plain.error);
  ok('and its request carries NO reasoning_effort key at all — the field is added only on request',
    plainWire && plainWire.body && !('reasoning_effort' in plainWire.body),
    JSON.stringify(plainWire && plainWire.body && Object.keys(plainWire.body)));
  ok('a plain string reply passes through the flattener byte-identical',
    plain.content === '{"verdict":"pass","violations":[]}' && plain.thinking === null, JSON.stringify(plain));
  holder.candidate = CAND;

  section('6b. GROK 4.3 — THE SAME PIN, A DIFFERENT FIELD NAME AND A DIFFERENT ENDPOINT');
  // xAI spells it reasoningEffort (camelCase) and routes via /api/proxy with preferredModel.
  // Getting either wrong would send an unpinned request that api/proxy.js silently resolves with
  // its OWN name-based default — a default, not a pin, which is the exact Mistral trap again.
  const GROK = candidate('grok-4.3');
  gate.stub('/api/proxy', async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    seen.push({ pathname: new URL(req.url()).pathname, body: b });
    return { choices: [{ message: { content: '{"verdict":"pass","violations":[]}' } }],
      usage: { prompt_tokens: 3211, completion_tokens: 512 },
      _orchestration: { model: 'grok-4.3', reasoning_effort: 'high' } };
  });
  holder.candidate = GROK;
  holder.currentFixture = 'control_grok_pinned';
  const gk = await dispatch({ tier: 'primary', provider: 'grok', model: GROK.model, reasoning_effort: GROK.reasoningEffort }, GROK.maxTokens);
  const gwire = seen[seen.length - 1];
  ok('the grok request goes to /api/proxy, not the mistral or openai endpoint',
    gwire && gwire.pathname === '/api/proxy', gwire && gwire.pathname);
  ok('it names grok-4.3 via preferredModel, which is how api/proxy.js reads it',
    gwire && gwire.body.preferredModel === 'grok-4.3', gwire && JSON.stringify(gwire.body.preferredModel));
  ok('THE WIRE CARRIES reasoningEffort:"high" in xAI\'s camelCase spelling',
    gwire && gwire.body.reasoningEffort === 'high', gwire && JSON.stringify(gwire.body.reasoningEffort));
  ok('RED PROOF — it does NOT use Mistral\'s snake_case spelling, which api/proxy.js would ignore',
    gwire && !('reasoning_effort' in gwire.body), gwire && JSON.stringify(Object.keys(gwire.body)));
  ok('the candidate declares the field name it enforces, rather than assuming one spelling',
    GROK.reasoningField === 'reasoningEffort' && candidate('mistral-small-2603').reasoningField === 'reasoning_effort');
  ok('the dispatch succeeded and returned the model\'s answer', gk.ok && /"verdict"/.test(gk.content || ''), gk.error || gk.content);
  ok('usage survives for realized cost', !!(gk.usage && gk.usage.completion_tokens), JSON.stringify(gk.usage));
  // A stripped reasoning field must abort for grok exactly as it does for mistral.
  const gSeenBefore = seen.length, gLogBefore = holder.log.length;
  holder.currentFixture = 'control_grok_no_reasoning';
  const gkNone = await dispatch({ tier: 'primary', provider: 'grok', model: GROK.model }, GROK.maxTokens);
  ok('RED PROOF — a grok dispatch missing reasoningEffort is ABORTED before the wire',
    gkNone.ok === false && seen.length === gSeenBefore
    && holder.log.slice(gLogBefore).some((e) => e.kind === 'blocked-reasoning' && e.field === 'reasoningEffort'),
    JSON.stringify(holder.log.slice(gLogBefore)).slice(0, 220));
  // Pricing is the correction that matters most here.
  ok('grok-4.3 is priced at the REAL 4.3 rate, not the retired cheap-4.1 SKU',
    GROK.rate.in === 1.25e-6 && GROK.rate.out === 2.5e-6, JSON.stringify(GROK.rate));
  const gWorst = GROK.perCallUsd * 8;
  console.log('    grok worst case: $' + gWorst.toFixed(6) + ' for eight, ceiling $' + GROK.ceilingUsd.toFixed(6));
  ok('eight fixtures genuinely do NOT fit a $0.05 ceiling — the number was checked, not assumed',
    gWorst > 0.05, '$' + gWorst.toFixed(6));
  ok('the ceiling is set above the worst case so the run cannot be refused mid-way',
    gWorst <= GROK.ceilingUsd, '$' + gWorst.toFixed(6) + ' vs $' + GROK.ceilingUsd);
  holder.candidate = CAND;

  section('7. THE RUN IS STILL LOCKED');
  ok('mistral-small-2603 is a registered, priced candidate', !!CANDIDATES['mistral-small-2603']);
  const runSrc = fs.readFileSync(path.join(__dirname, '_canon_audit_calibration_run.mjs'), 'utf8');
  const phraseBlock = runSrc.match(/const AUTH_PHRASE[\s\S]{0,420}/)[0];
  ok('its authorization phrase names its OWN $0.02 ceiling, so a $0.01 authorization cannot release it',
    /under \$0\.02/.test(phraseBlock));
  ok('grok-4.3 has its own phrase naming its own $0.08 ceiling — no cheaper authorization releases it',
    /under \$0\.08/.test(phraseBlock) && /grok-4\.3/.test(phraseBlock), phraseBlock.slice(0, 200));

  section('8. ZERO PROVIDER DISPATCHES');
  const real = gate.trackedCalls().filter((c) => c.real);
  ok('no request was allowed through to a real provider', real.length === 0, JSON.stringify(real.map((c) => c.url)));

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, routeLog: holder.log, seen }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) {
    console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  }
  console.log('  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
