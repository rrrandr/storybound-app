// GROK 4.3 EXTRACTOR COMPARISON — DRY PROOF. Zero provider dispatches; nothing paid.
//
// The question this comparison asks is "does a stronger model obey the SAME prompt", so the ONLY
// thing that may differ from the last paid Ministral replay is what the provider forces. This proof
// establishes that claim mechanically, against the LAST PAID RUN's own recorded request body — not
// against a rebuilt approximation of it. An earlier equivalence attempt compared an ESTIMATE to a
// measurement and proved nothing; the baseline here is
//   _tempt_fate_fixtures/extractor_only_2026-09-27_02-52-51/gate.jsonl
// which contains the literal body replay 3 sent.
//
// It proves FOUR things, and each is a separate failure mode:
//   1. REQUEST  — the translated body is byte-identical in prompt, temperature and max_tokens, and
//      differs in EXACTLY the four documented, provider-required ways. Enumerated by diffing keys,
//      so an undocumented fifth change fails this proof rather than riding along silently.
//   2. RESPONSE — the real production parser consumes a REAL /api/proxy (grok) envelope. The
//      extractor reads `data.content`, which /api/proxy never sets; it sets
//      choices[0].message.content. If that path did not already work, the comparison would return
//      "extractor returned no content" and be charged for nothing.
//   3. ONE ATTEMPT — a second provider request cannot leave, and the ceiling refuses a dispatch it
//      cannot afford BEFORE it is sent.
//   4. CONTAINMENT — no real provider request occurs anywhere in this proof.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { readFixture, buildContextInPage, installReservationRoute, makeLedger, tierCost }
  from './_tempt_outcome_extractor_runner_core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(__dirname, '_tempt_fate_fixtures', 'extractor_only_2026-09-27_02-52-51', 'gate.jsonl');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

// The REAL /api/proxy envelope for a reasoning grok model: the raw xAI body spread flat, plus the
// _orchestration block api/proxy.js appends. One shape, not a union — the same shape
// _canon_audit_proxy_nofallback_control.mjs already exercises against this proxy.
const REPORT = {
  delivered: true,
  changed: [{ subject: 'the assembly', whatChanged: 'no longer recalls why it convened' }],
  durability: [{ aspect: 'the gap', status: 'persists', note: 'nothing restores it' }],
  knowledgeStates: [{ character: 'the assembly', state: 'unaware', basis: 'the wish took hold' }],
  establishedEvidence: ['"The assembly stirs, uncertain."'],
  openPossibilities: [], requestedScope: 'everyone forgets', deliveredScope: 'the assembly forgets',
  scopeMatch: 'undetermined', scopeNote: 'Julian is not established either way',
  invalidatedPlans: [], ruptureClass: 'memory_perception',
  targetPopulation: 'everyone present',
  affectedKnowers: [{ name: 'the assembly', disposition: 'forgot', memoryAbsent: true,
    evidenceQuote: 'The assembly stirs, uncertain.' }],
  invokerExemption: { exempt: true, reason: 'invoker_anchor', note: 'default' },
  unaccountedParties: ['Julian']
};
const GROK_ENVELOPE = {
  id: 'dry-proof-not-a-real-id', object: 'chat.completion', model: 'grok-4.3',
  choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(REPORT) }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 2600, completion_tokens: 1180, total_tokens: 3780,
    completion_tokens_details: { reasoning_tokens: 640 } },
  _orchestration: { role: 'STRUCTURE_GENERATOR', model: 'grok-4.3', chainEntry: 'grok-4.3',
    resolvedModel: 'grok-4.3', reasoningEffort: 'high', upstreamAttempts: 1,
    isSpecialistRenderer: true, timestamp: new Date().toISOString() }
};

function baselineBody() {
  const lines = fs.readFileSync(BASELINE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const d = lines.find((l) => l.kind === 'dispatch' && l.requestBody && l.requestBody.messages);
  return d ? d.requestBody : null;
}

(async () => {
  console.log('=== GROK 4.3 EXTRACTOR COMPARISON — DRY PROOF (zero dispatches) ===\n');

  const base = baselineBody();
  console.log('=== 0. THE BASELINE IS THE LAST PAID RUN\'S OWN RECORDED REQUEST ===');
  ok(!!base, 'replay 3\'s literal request body was recovered from its gate log (not rebuilt)');
  ok(base && base.model === 'ministral-8b-2512' && base.temperature === 0.1 && base.max_tokens === 3200,
    'the baseline is the pinned Ministral body: model ministral-8b-2512, temperature 0.1, max_tokens 3200');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctxB.newPage();
  const warnings = [];
  page.on('console', (m) => { if (/no content|not JSON|TIERED/.test(m.text())) warnings.push(m.text()); });
  const gate = await installFailClosedNetworkGate(page, {
    logFile: path.join(__dirname, '_grok_cmp_dry_gate.jsonl'), blockImagePreparation: true
  });
  gate.allowRealPaths(['/api/mistral-proxy']);

  const ledger = makeLedger(0.050);
  const routeLog = [];
  const holder = { ledger, log: routeLog, translateToGrok: true, maxRequests: 1, stubGrokResponse: GROK_ENVELOPE };
  await installReservationRoute(page, holder);

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._tfoBuildExtractionContext && window._extractTemptOutcome
    && window._tfoBuildExtractorPrompt, { timeout: 30000 });

  const fx = readFixture();
  const built = await buildContextInPage(page, fx);
  gate.setPhase('grok-cmp-dry', 1);

  // ── 2. RESPONSE: the REAL production extractor consumes the REAL grok envelope ───────────────
  const got = await page.evaluate(async (c) => {
    try { return { ok: true, report: await window._extractTemptOutcome(c) }; }
    catch (e) { return { ok: false, err: String(e && e.message) }; }
  }, built.ctx);

  console.log('\n=== 1. REQUEST — byte-identical prompt, exactly four provider-required differences ===');
  const t = holder.translatedBody;
  ok(!!t, 'the translation ran and the exact outgoing body was captured');
  ok(!!base && !!t && JSON.stringify(t.messages) === JSON.stringify(base.messages),
    'the messages are BYTE-IDENTICAL to replay 3\'s (deep-equal on the recorded array, not a length or estimate check)');
  ok(!!t && t.messages && t.messages.length === 2 && t.messages[0].role === 'system' && t.messages[1].role === 'user'
    && t.messages[0].content.length > 2000,
    '...and they are the real two-message extractor prompt, not an empty or placeholder pair');
  ok(!!t && t.temperature === 0.1, 'temperature is UNCHANGED at 0.1');
  ok(!!t && t.max_tokens === 3200, 'max_tokens is UNCHANGED at 3200');
  ok(!!t && t.role === 'STRUCTURE_GENERATOR' && base && base.role === 'STRUCTURE_GENERATOR',
    'role is UNCHANGED at STRUCTURE_GENERATOR — the chain that already carries grok-4.3');
  ok(!!t && t._sbModelOverride === 'grok-4.3',
    'CHANGE 2: the model is pinned with _sbModelOverride (the allowlisted pin that names the RESOLVED model)');
  ok(!!t && t._noFallback === true,
    'CHANGE 3: _noFallback is sent, reducing the server chain to ONE entry');
  ok(!!t && !('model' in t), '...and the Mistral-only `model` key is GONE, not left to be ignored');
  ok(!!t && !('preferredModel' in t),
    '...and preferredModel is NOT sent — it would be reordered/resolved rather than pinned');
  ok(!!t && !('reasoningEffort' in t) && !('reasoning_effort' in t),
    'no reasoning effort is specified — the proxy\'s own default for this model stands, so this is not a fifth change');
  // THE ENUMERATION: any key difference beyond the documented set fails here.
  const bk = Object.keys(base || {}).sort(), tk = Object.keys(t || {}).sort();
  const removed = bk.filter((k) => !tk.includes(k)), added = tk.filter((k) => !bk.includes(k));
  console.log('    removed: ' + JSON.stringify(removed) + '   added: ' + JSON.stringify(added));
  ok(JSON.stringify(removed) === JSON.stringify(['model']),
    'EXACTLY ONE key was removed, and it is `model`');
  ok(JSON.stringify(added.sort()) === JSON.stringify(['_noFallback', '_sbModelOverride']),
    'EXACTLY TWO keys were added, and they are _noFallback and _sbModelOverride');
  const sameValued = bk.filter((k) => k !== 'model' && JSON.stringify(base[k]) === JSON.stringify(t[k]));
  ok(sameValued.length === bk.length - 1,
    'every other key retained its EXACT value — ' + sameValued.length + ' of ' + (bk.length - 1) + ' unchanged');
  ok(holder.translation && holder.translation.to.pathname === '/api/proxy'
    && holder.translation.from.pathname.indexOf('/api/mistral-proxy') !== -1,
    'CHANGE 1: the endpoint moved /api/mistral-proxy -> /api/proxy, recorded in the run report');
  ok(routeLog.some((e) => e.kind === 'reserved' && e.model === 'grok-4.3' && e.translated === true),
    '...and the reservation was taken against grok-4.3, not against the Mistral price');

  console.log('\n=== 2. RESPONSE — production\'s own parser consumes a REAL /api/proxy grok envelope ===');
  ok(got.ok, 'the REAL _extractTemptOutcome returned a report' + (got.ok ? '' : ' — it threw: ' + got.err));
  ok(got.ok && got.report && got.report.ruptureClass === 'memory_perception',
    '...parsed from choices[0].message.content, which is where /api/proxy puts it (the extractor reads data.content, and the Mistral branch\'s `d.content || d.choices[0].message.content` is what bridges it)');
  ok(got.ok && got.report && got.report.scopeMatch === 'undetermined' && Array.isArray(got.report.unaccountedParties),
    '...with the full contract intact through the flattener — no field lost in translation');
  ok(warnings.every((w) => !/returned no content/.test(w)),
    'no "returned no content" warning fired — the envelope was NOT silently unreadable');
  const preflight = await page.evaluate(() => {
    const f = window._flattenProviderContent;
    return { str: f('plain'), arr: f([{ type: 'text', text: 'a' }, { type: 'thinking', thinking: [{ text: 'r' }] }]) };
  });
  ok(preflight.str.text === 'plain' && preflight.arr.text === 'a' && preflight.arr.thinking === 'r',
    'the flattener also handles a BLOCK-ARRAY content with a reasoning block — text kept, reasoning separated, never pasted into the report');

  console.log('\n=== 3. ONE UPSTREAM ATTEMPT — the second request cannot leave, and the ceiling bites ===');
  const second = await page.evaluate(async (c) => {
    try { await window._extractTemptOutcome(c); return { threw: false }; }
    catch (e) { return { threw: true, err: String(e && e.message) }; }
  }, built.ctx);
  ok(second.threw, 'a SECOND extraction attempt failed rather than dispatching');
  ok(routeLog.some((e) => e.kind === 'blocked-over-request-cap'),
    '...blocked explicitly by the one-request cap, and the block is logged by reason');
  ok(routeLog.filter((e) => e.kind === 'reserved').length === 1,
    'exactly ONE reservation exists despite two attempts — the cap contains the client-side tier walk too');
  ok(routeLog.some((e) => e.kind === 'blocked-not-the-pinned-comparison' && /grok-4-1-fast/.test(String(e.model))),
    '...and the extractor\'s OWN tier 2 (grok-4-1-fast-reasoning on /api/proxy) was refused BY NAME — it is a different model and would have answered the comparison in grok-4.3\'s place');
  ok(!routeLog.some((e) => e.kind === 'reserved' && e.model !== 'grok-4.3'),
    '...so NOTHING but grok-4.3 was ever reserved in this mode');

  const tight = makeLedger(0.001);           // below grok-4.3's own bounded cost
  const r = tight.reserve('/api/proxy :: grok-4.3', 'grok-4.3');
  ok(!r.ok, 'a ceiling below the bounded cost REFUSES grok-4.3 before anything is sent (' + r.reason + ')');
  ok(tierCost('grok-4.3') !== null && Math.abs(tierCost('grok-4.3') - 0.0125) < 1e-9,
    'grok-4.3 is PRICED from the sourced rates: $' + tierCost('grok-4.3').toFixed(6) + ' bounded for 3600 in + 3200 out');

  console.log('\n=== 4. CONTAINMENT ===');
  const tracked = gate.trackedCalls ? gate.trackedCalls() : [];
  ok(tracked.length === 0 || tracked.every((c) => !c.real),
    'ZERO real provider requests left this proof (' + tracked.length + ' tracked, all stubbed or blocked)');
  ok(!holder.upstreamRaw, 'route.fetch was never reached — the stub short-circuited before any network call');

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('GROK COMPARISON DRY PROOF: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROOF ERROR:', e && e.stack || e); process.exit(2); });
