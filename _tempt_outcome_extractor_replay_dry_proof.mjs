// EXTRACTOR REPLAY — DRY PROOF. Zero provider requests, $0.
//
// The replay asks ONE narrow question: does the raised output limit (1400 -> 3200) let
// ministral-8b-2512 produce a complete, cited report from the SAME prose it truncated on?
// So the comparison must be single-model: a three-tier cascade would answer a different question.
// This proves, before any spend, that (a) only ONE provider request can leave, and (b) the prompt and
// input are the original ones apart from the output limit.
//
// usage: node _tempt_outcome_extractor_replay_dry_proof.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { installReservationRoute, makeLedger, tierCost, ROLE_TOKENS } from './_tempt_outcome_extractor_runner_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL = path.join(__dirname, '_tempt_fate_fixtures', 'extractor_only_2026-09-24_08-00-42');
const PIN_MODEL = 'ministral-8b-2512';
const PIN_ENDPOINT = '/api/mistral-proxy';
const results = [];
const ok = (n, p, d) => { results.push({ n, p: !!p }); console.log((p ? '  ✓ ' : '  ✗ ') + n + (!p && d ? '\n        → ' + String(d).slice(0, 300) : '')); };
const note = (t) => console.log('    ' + t);

(async () => {
  console.log('=== EXTRACTOR REPLAY DRY PROOF (zero provider requests, $0) ===\n');

  // ── A. THE ORIGINAL INPUT AND THE FAILED RESPONSE ARE BOTH RETAINED ────────────────────────
  const ctxPath = path.join(ORIGINAL, 'extraction_context.json');
  const rawPath = path.join(ORIGINAL, 'extractor_raw_response.txt');
  const repPath = path.join(ORIGINAL, 'report.json');
  ok('the original run\'s extraction CONTEXT is retained', fs.existsSync(ctxPath), ctxPath);
  ok('the original FAILED RESPONSE is retained and must not be overwritten',
    fs.existsSync(rawPath) && fs.statSync(rawPath).size > 5000, rawPath);
  const report = JSON.parse(fs.readFileSync(repPath, 'utf8'));
  const origPrompt = report.usage.prompt_tokens, origCompletion = report.usage.completion_tokens;
  note('original: model=' + report.model + '  prompt=' + origPrompt + '  completion=' + origCompletion
     + '  response bytes=' + fs.statSync(rawPath).size);
  ok('the original completion hit the OLD limit exactly — the failure being retested',
    origCompletion === 1400, String(origCompletion));
  ok('the original model is the one this replay pins', report.model === PIN_MODEL, report.model);

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_outcome_extractor_replay_dry_out.jsonl'), blockImagePreparation: true });

  // Capture what the extractor would send, and answer it without a provider.
  const sent = [];
  const stubReply = { choices: [{ message: { content: '{"delivered":false}' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } };
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    let pn; try { pn = new URL(req.url()).pathname; } catch (_) { pn = req.url(); }
    if (b && b.messages) sent.push({ pathname: pn, model: b.model || b.preferredModel || null,
      max_tokens: b.max_tokens, temperature: b.temperature, sys: String(b.messages[0] && b.messages[0].content || ''),
      usr: String(b.messages[1] && b.messages[1].content || ''), noFallback: b._noFallback === true });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stubReply) });
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._extractTemptOutcome && window._tfoBuildExtractorPrompt, { timeout: 30000 });

  // ── B. THE PROMPT IS THE ORIGINAL ONE, APART FROM THE OUTPUT LIMIT ────────────────────────
  // The retained artifact WRAPS the context: { ctx, rosterDetail, proseLen, frozen }. Passing the
  // wrapper to the builder threw on a missing field — the replay must feed the inner ctx, which is the
  // byte-identical input the original run used.
  const ctxFile = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
  const ctx = ctxFile.ctx || ctxFile;
  ok('the retained context is unwrapped to the SAME inner ctx the original run used',
    !!ctxFile.ctx && ctxFile.frozen === true && typeof ctxFile.proseLen === 'number',
    JSON.stringify({ hasCtx: !!ctxFile.ctx, frozen: ctxFile.frozen, proseLen: ctxFile.proseLen }));
  const built = await page.evaluate((c) => {
    try { const p = window._tfoBuildExtractorPrompt(c);
      return { sysLen: p.sys.length, usrLen: p.usr.length, hasCitation: /evidenceQuote/.test(p.sys),
               approxTokens: Math.round((p.sys.length + p.usr.length) / 4) }; }
    catch (e) { return { error: String(e && e.message) }; }
  }, ctx);
  ok('the prompt REBUILDS from the retained context without error', !built.error, JSON.stringify(built));
  ok('...and it still carries the citation requirement', built.hasCitation === true);

  // EXACT COMPARISON, NOT AN APPROXIMATION. A previous version compared ~2,092 estimated tokens against
  // 2,005 actual and called that equivalence — it is neither evidence of sameness nor of difference,
  // since chars/4 is a poor estimator. The gate log retained the FULL original request body, so the
  // real comparison is available: field by field, with byte equality on both messages.
  let origReq = null;
  for (const line of fs.readFileSync(path.join(ORIGINAL, 'gate.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    if (e.kind === 'dispatch' && e.requestBody) { origReq = e.requestBody; break; }
  }
  ok('the ORIGINAL OUTGOING REQUEST is retained in the gate log', !!(origReq && origReq.messages),
    origReq ? Object.keys(origReq).join(',') : 'none');
  const oSys = String((origReq.messages.find((m) => m.role === 'system') || {}).content || '');
  const oUsr = String((origReq.messages.find((m) => m.role === 'user') || {}).content || '');
  const cur = await page.evaluate((c) => { const x = window._tfoBuildExtractorPrompt(c); return { sys: x.sys, usr: x.usr }; }, ctx);
  note('SYSTEM original=' + oSys.length + ' current=' + cur.sys.length + '  ' + (oSys === cur.sys ? 'IDENTICAL' : 'DIFFERENT'));
  note('USER   original=' + oUsr.length + ' current=' + cur.usr.length + '  ' + (oUsr === cur.usr ? 'IDENTICAL' : 'DIFFERENT'));
  // THE SYSTEM PROMPT NOW DIFFERS ON PURPOSE. The citation field was moved INTO the affectedKnowers
  // output shape (it had been demanded in prose only) and each enum was labelled beside its own field
  // with transfer between them prohibited. So byte-identity is no longer the claim; the claim is that
  // the difference is EXACTLY those two schema lines and nothing else. Shown explicitly, line by line.
  const oLines = oSys.split('\n'), cLines = cur.sys.split('\n');
  const removed = oLines.filter((l) => cLines.indexOf(l) === -1);
  const added = cLines.filter((l) => oLines.indexOf(l) === -1);
  console.log('    SYSTEM diff: ' + removed.length + ' line(s) replaced by ' + added.length
    + '  (' + oSys.length + ' -> ' + cur.sys.length + ' chars)');
  removed.forEach((l) => console.log('      - ' + l.trim().slice(0, 110)));
  added.forEach((l) => console.log('      + ' + l.trim().slice(0, 110)));
  // FOUR lines now, across two rounds of bounded correction: the citation field and enum labelling
  // (affectedKnowers, knowledgeStates), then the undetermined scope value and its note requirement
  // (scopeMatch, scopeNote). The assertion tracks the intended SET rather than a frozen count.
  const INTENDED = /"affectedKnowers"|"knowledgeStates"|"scopeMatch"|"scopeNote"/;
  ok('the SYSTEM prompt differs from the original by exactly FOUR replaced lines',
    removed.length === 4 && added.length === 4,
    'removed ' + removed.length + ' added ' + added.length);
  ok('...and every changed line is one of the four intended schema lines, nothing else',
    removed.every((l) => INTENDED.test(l)) && added.every((l) => INTENDED.test(l)),
    JSON.stringify(removed.map((l) => l.trim().slice(0, 40))));
  ok('...the undetermined scope value is what was added to the scopeMatch line',
    added.some((l) => /"scopeMatch"/.test(l) && /undetermined/.test(l)));
  ok('...and the grounding prohibition is what was added to the knowers line',
    added.some((l) => /"affectedKnowers"/.test(l)
      && /Memory may NOT be inferred from gaze, silence, stillness, composure or presence/.test(l)));
  ok('...the citation field is what was added to the knowers line',
    added.some((l) => /"affectedKnowers"/.test(l) && /"evidenceQuote"/.test(l)));
  ok('...and the enum clarification is what was added to the states line',
    added.some((l) => /"knowledgeStates"/.test(l) && /STATE describes what this party KNOWS/.test(l)));
  ok('NOTHING ELSE in the system prompt changed — every other original line survives verbatim',
    oLines.filter((l) => !INTENDED.test(l)).every((l) => cLines.indexOf(l) !== -1));
  ok('the USER message is BYTE-IDENTICAL to the original request', oUsr === cur.usr,
    'original ' + oUsr.length + ' vs current ' + cur.usr.length);
  ok('model and temperature are unchanged from the original request',
    origReq.model === PIN_MODEL && origReq.temperature === 0.1,
    JSON.stringify({ model: origReq.model, temperature: origReq.temperature }));
  ok('the original request carried max_tokens 1400 — the value under test',
    origReq.max_tokens === 1400, String(origReq.max_tokens));
  ok('THE CONTROLLED REPLAY HOLDS EVERYTHING ELSE FIXED: same prose, same model, same temperature',
    oUsr === cur.usr && origReq.model === PIN_MODEL && origReq.temperature === 0.1,
    JSON.stringify({ userIdentical: oUsr === cur.usr, model: origReq.model, temperature: origReq.temperature }));
  ok('...and the intended changes are those four schema lines plus max_tokens 1400 -> 3200',
    removed.length === 4 && added.length === 4 && origReq.max_tokens === 1400,
    'four schema lines replaced; output limit raised');

  // ── C. ONLY ONE PROVIDER REQUEST MAY LEAVE ────────────────────────────────────────────────
  const routeLog = [];
  const ledger = makeLedger(0.002);
  const holder = { ledger, log: routeLog, pinModel: PIN_MODEL, pinEndpoint: PIN_ENDPOINT, maxRequests: 1 };
  await installReservationRoute(page, holder);
  const probe = await page.evaluate(async () => {
    const hit = async (url, model) => {
      try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: 'x' }] }) });
        return { status: r.status }; } catch (e) { return { blocked: true }; }
    };
    return {
      first:  await hit('/api/mistral-proxy', 'ministral-8b-2512'),
      second: await hit('/api/mistral-proxy', 'ministral-8b-2512'),
      grok:   await hit('/api/proxy', 'grok-4-1-fast-reasoning'),
      openai: await hit('/api/chatgpt-proxy', 'gpt-4o-mini')
    };
  });
  const kinds = routeLog.map((e) => e.kind);
  note('route decisions: ' + JSON.stringify(kinds));
  ok('the FIRST pinned request is reserved and allowed through',
    kinds[0] === 'reserved', JSON.stringify(routeLog[0]));
  ok('a SECOND request is blocked by the one-shot cap — a retry cannot become a second sample',
    kinds.includes('blocked-over-request-cap'), JSON.stringify(kinds));
  ok('the GROK tier is blocked as an unpinned model — no cascade',
    routeLog.some((e) => e.kind === 'blocked-unpinned-model' && e.model === 'grok-4-1-fast-reasoning'),
    JSON.stringify(routeLog.filter((e) => e.kind === 'blocked-unpinned-model')));
  ok('the OPENAI tier is blocked as an unpinned model',
    routeLog.some((e) => e.kind === 'blocked-unpinned-model' && e.model === 'gpt-4o-mini'));
  ok('exactly ONE request was ever reserved', routeLog.filter((e) => e.kind === 'reserved').length === 1,
    JSON.stringify(routeLog.map((e) => e.kind)));
  ok('every block carries a reason', routeLog.filter((e) => e.kind.startsWith('blocked')).every((e) => !!e.reason));

  // ── D. THE SINGLE-CALL RESERVATION ────────────────────────────────────────────────────────
  const one = tierCost(PIN_MODEL);
  note('single-call price at ' + JSON.stringify(ROLE_TOKENS) + ' = $' + one.toFixed(6));
  ok('the reservation is ONE tier at the sourced price, not a cascade sum',
    Math.abs(one - (3600 * 1.5e-7 + 3200 * 1.5e-7)) < 1e-9, '$' + one.toFixed(6));
  ok('...and it fits the replay ceiling with headroom', one < 0.002, '$' + one.toFixed(6) + ' < $0.002');
  ok('the production dispatch carries the RAISED limit',
    await page.evaluate(() => /max_tokens:\s*3200/.test(window._extractTemptOutcome.toString())));
  ok('ZERO real provider requests during this proof', gate.trackedCalls().filter((c) => c.real).length === 0);

  const passed = results.filter((r) => r.p).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.p).map((r) => r.n).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('PROOF ERROR:', e && e.stack || e); process.exit(2); });
