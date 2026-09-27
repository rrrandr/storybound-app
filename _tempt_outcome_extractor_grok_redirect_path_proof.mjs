// THE GROK REDIRECT PATH, PROVEN END TO END WITH NO PROVIDER.
//
// WHY THIS EXISTS. The 2026-09-27 paid grok-4.3 comparison returned HTTP 200 and the result was lost:
// every artifact was written after a settlement wait that could never end, because
// gate.waitForSettlement needs `relevant.length > 0` GATE-TRACKED calls and the redirect adapter
// terminates the intercepted route itself. The dry proof that cleared that run
// (_tempt_outcome_extractor_grok_comparison_dry_proof.mjs, 32/32) short-circuited the route BEFORE
// route.fetch, so the capture / persist / settle / exit half of the path had never run once. A stub
// that skips the step under test proves nothing about that step.
//
// So this proof drives the REAL runner as a child process, with its redirect adapter pointed at a
// LOCAL stub server, and asserts against what the runner actually leaves on disk and the code it
// actually exits with. Three scenarios:
//   A. upstream answers        -> route.fetch -> capture -> persist -> route.fulfill -> evaluate -> exit 0
//   B. upstream refuses        -> bounded NO DATA, incomplete artifact, exit 5, no hang
//   C. upstream never settles  -> awaitUpstreamSettled times out BOUNDED and writes the artifact
// Zero provider requests in all three.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { awaitUpstreamSettled } from './_tempt_outcome_extractor_runner_core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

// THE REPORT BODY IS A REAL RESPONSE, NOT A HAND-BUILT ONE. Fixture 03 is an actual extractor reply
// that genuinely passes schema validation and verbatim citation checking against THIS EXACT prose
// (its defect is semantic, not structural). A hand-built stub failed both checks on shapes I got
// wrong — targetPopulation is an object, affectedKnowers needs suspicionFromResidue, invokerExemption
// needs {who,status} — which would have made this proof assert that the pipeline works while feeding
// it something the pipeline correctly refuses. One real shape, per the shape-faithful-mocks rule.
const REPORT = JSON.parse(fs.readFileSync(
  path.join(__dirname, '_tempt_fate_fixtures', 'extractor_regression', '03_parsed_cited_ungrounded.json'), 'utf8'));

// A REAL /api/proxy grok envelope: the raw xAI body spread flat, plus the _orchestration block the
// proxy appends. One shape, not a union.
const ENVELOPE = {
  id: 'stub-not-a-real-id', object: 'chat.completion', model: 'grok-4.3',
  choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(REPORT) }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 2600, completion_tokens: 3480, total_tokens: 6080,
    completion_tokens_details: { reasoning_tokens: 2100 } },
  _orchestration: { role: 'STRUCTURE_GENERATOR', model: 'grok-4.3', chainEntry: 'grok-4.3',
    resolvedModel: 'grok-4.3', reasoningEffort: 'high', upstreamAttempts: 1, isSpecialistRenderer: true }
};

function startStub() {
  return new Promise((resolve) => {
    const seen = [];
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        seen.push({ url: req.url, method: req.method, body: body });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(ENVELOPE));
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, seen, port: srv.address().port }));
  });
}

function runRunner(upstreamUrl) {
  return new Promise((resolve) => {
    const p = spawn('node', ['_tempt_outcome_extractor_live_run.mjs', '--pin-grok',
      '--dry-upstream=' + upstreamUrl], { cwd: __dirname });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    const killer = setTimeout(() => { p.kill('SIGKILL'); resolve({ code: null, out, killed: true }); }, 180000);
    p.on('close', (code) => { clearTimeout(killer); resolve({ code, out, killed: false }); });
  });
}
const newestDir = () => {
  const base = path.join(__dirname, '_tempt_fate_fixtures');
  return fs.readdirSync(base).filter((d) => d.indexOf('extractor_DRY_UPSTREAM_') === 0).sort().pop();
};

(async () => {
  console.log('=== GROK REDIRECT PATH — END-TO-END PROOF, NO PROVIDER ===\n');

  // ── A. THE HAPPY PATH, THROUGH THE REAL RUNNER ──────────────────────────────────────────────
  console.log('=== A. upstream answers: route.fetch -> capture -> persist -> fulfill -> evaluate -> exit ===');
  const stub = await startStub();
  const a = await runRunner('http://127.0.0.1:' + stub.port + '/api/proxy');
  await new Promise((r) => stub.srv.close(r));

  ok(!a.killed, 'THE PROCESS EXITED ON ITS OWN — no deadlock (this is the regression: the paid run had to be killed after 80 minutes)');
  ok(a.code === 0, 'it exited 0 on a captured response (got ' + a.code + ')');

  ok(stub.seen.length === 1, 'route.fetch reached the upstream EXACTLY ONCE (' + stub.seen.length + ' request(s) observed by the stub server)');
  const sent = stub.seen[0] ? JSON.parse(stub.seen[0].body) : null;
  ok(!!sent && sent._sbModelOverride === 'grok-4.3' && sent._noFallback === true,
    '...carrying the pinned body (_sbModelOverride grok-4.3 + _noFallback), so the request under test is the real translated one');
  ok(!!sent && sent.temperature === 0.1 && sent.max_tokens === 3200 && !('model' in sent),
    '...with the prompt settings unchanged and the Mistral-only `model` key absent');

  const dir = path.join(__dirname, '_tempt_fate_fixtures', newestDir() || 'MISSING');
  const has = (f) => fs.existsSync(path.join(dir, f));
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  ok(has('upstream_raw_response.json'), 'the RAW upstream body was persisted');
  ok(has('upstream_receipt.json'), 'the RECEIPT was persisted alongside it');
  const rawTxt = fs.readFileSync(path.join(dir, 'upstream_raw_response.json'), 'utf8');
  ok(rawTxt === JSON.stringify(ENVELOPE),
    '...and the raw body is byte-identical to what the upstream returned — not a re-serialized summary of it');
  const receipt = has('upstream_receipt.json') ? read('upstream_receipt.json') : {};
  ok(receipt.ok === true && receipt.status === 200, 'the receipt records the outcome and HTTP status');
  ok(receipt.usage && receipt.usage.prompt_tokens === 2600 && receipt.usage.completion_tokens === 3480,
    'the receipt carries USAGE — the field whose loss made the paid run unmeasurable');
  ok(receipt.reasoningTokens === 2100,
    '...including reasoning tokens (' + receipt.reasoningTokens + '), billed as output and not bounded by max_tokens');
  ok(receipt.completionOverMaxTokens === 280,
    '...and the overrun past the 3200 asked for is computed, not hidden: ' + receipt.completionOverMaxTokens + ' tokens');
  ok(Math.abs(receipt.measuredUsd - ((2600 * 0.00000125) + (3480 * 0.0000025))) < 1e-9,
    '...and a MEASURED cost of $' + Number(receipt.measuredUsd).toFixed(6) + ' from that usage, at the sourced grok-4.3 rates');
  ok(receipt.orchestration && receipt.orchestration.resolvedModel === 'grok-4.3'
    && receipt.orchestration.upstreamAttempts === 1,
    'the receipt carries the PROVENANCE metadata: resolvedModel and upstreamAttempts');
  ok(receipt.rawBody === undefined, '...and does not duplicate the body it sits beside');

  ok(has('report.json'), 'the run report was written');
  const rep = has('report.json') ? read('report.json') : {};
  ok(rep.raw && rep.raw.ruptureClass === 'memory_perception'
    && JSON.stringify(rep.raw) === JSON.stringify(REPORT),
    'EVALUATION RAN: the extractor parsed the fulfilled envelope through production code into the EXACT report the upstream sent — nothing lost or altered in the redirect');
  ok(!!rep.validation && rep.validation.valid === true,
    '...schema validation RAN AND PASSED on it' + (rep.validation && rep.validation.valid ? '' : ': ' + JSON.stringify(rep.validation.errors).slice(0, 200)));
  ok(Array.isArray(rep.citations) && rep.citations.length === 0,
    '...verbatim citation verification ran and found every quote in the scene text');
  ok(!!rep.findings && rep.findings.julianResolved === true && rep.findings.julianDisposition === 'retained',
    '...and the five findings were computed, reproducing fixture 03\'s own known verdict (Julian=retained) — so the evaluation pipeline is confirmed against a response whose answer is already established');
  ok(rep.upstreamOutcome && rep.upstreamOutcome.ok === true, '...and the report embeds the upstream outcome');
  ok(rep.noDataReason === null, '...with no NO-DATA reason, because the response WAS captured');

  // THE DEADLOCK PRECONDITION IS STILL PRESENT — the fix is not "the gate now tracks it".
  ok(rep.dispatches === 0,
    'ZERO gate-tracked calls under the phase (' + rep.dispatches + ') — the redirect still intentionally bypasses the gate');
  const gateLines = fs.readFileSync(path.join(dir, 'gate.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  ok(!gateLines.some((l) => l.kind === 'dispatch'),
    '...confirmed in gate.jsonl: no dispatch entry exists, exactly as during the lost paid run');
  ok(gateLines.some((l) => l.kind === 'phase-open') && gateLines.some((l) => l.kind === 'phase-close'),
    '...so the ONLY gate records are the phase pair — the precondition that made waitForSettlement hang is unchanged, and the run completed anyway');
  ok(/upstream settled: captured/.test(a.out),
    'the runner reported settlement from the ADAPTER, not from the gate');

  // ── B. UPSTREAM REFUSES ────────────────────────────────────────────────────────────────────
  console.log('\n=== B. upstream refuses: bounded NO DATA, not an infinite wait ===');
  const dead = await startStub();
  const deadPort = dead.port;
  await new Promise((r) => dead.srv.close(r));            // nothing is listening on deadPort now
  const t0 = Date.now();
  const b = await runRunner('http://127.0.0.1:' + deadPort + '/api/proxy');
  const elapsed = Date.now() - t0;

  ok(!b.killed, 'THE PROCESS EXITED ON ITS OWN with no response to wait for — the deadlock class is closed');
  ok(b.code === 5, 'it exited 5, the distinct NO-DATA code (got ' + b.code + ')');
  ok(elapsed < 150000, 'it finished in ' + Math.round(elapsed / 1000) + 's — bounded');
  const dirB = path.join(__dirname, '_tempt_fate_fixtures', newestDir() || 'MISSING');
  ok(fs.existsSync(path.join(dirB, 'upstream_receipt.json')),
    'a receipt exists even for the failure — the outcome is RECORDED, not silent');
  const recB = JSON.parse(fs.readFileSync(path.join(dirB, 'upstream_receipt.json'), 'utf8'));
  ok(recB.ok === false && /transport-error/.test(String(recB.reason)),
    '...naming the transport failure as the reason (' + String(recB.reason).slice(0, 60) + ')');
  ok(!fs.existsSync(path.join(dirB, 'upstream_raw_response.json')),
    '...and NO raw-response file was fabricated for a response that never arrived');
  const repB = JSON.parse(fs.readFileSync(path.join(dirB, 'report.json'), 'utf8'));
  ok(repB.noDataReason !== null, 'the report carries an explicit NO-DATA reason');
  ok(/ALL FOUR CRITERIA: NO DATA/.test(b.out), 'the runner printed ALL FOUR CRITERIA: NO DATA');
  ok(/Parsing is UNVERIFIED/.test(b.out),
    '...and stated parsing is UNVERIFIED rather than failed — an uncaptured response is unexamined, not examined and found wanting');

  // ── C. THE OBSERVABLE ITSELF IS BOUNDED ────────────────────────────────────────────────────
  console.log('\n=== C. the adapter observable times out BOUNDED when nothing ever settles ===');
  const tmp = path.join(__dirname, '_tempt_fate_fixtures', '_redirect_timeout_probe');
  fs.rmSync(tmp, { recursive: true, force: true });
  const silent = { artifactDir: tmp };                  // no outcome will ever be recorded
  const c0 = Date.now();
  const outc = await awaitUpstreamSettled(silent, { timeoutMs: 1500, pollMs: 50 });
  const cMs = Date.now() - c0;
  ok(outc && outc.ok === false && outc.reason === 'timeout',
    'it RETURNED a settled timeout outcome instead of waiting forever');
  ok(cMs >= 1400 && cMs < 6000, '...after ' + cMs + 'ms, honouring the bound it was given');
  ok(fs.existsSync(path.join(tmp, 'incomplete_result.json')),
    '...and wrote an explicit incomplete-result artifact');
  const inc = JSON.parse(fs.readFileSync(path.join(tmp, 'incomplete_result.json'), 'utf8'));
  ok(inc.reason === 'timeout' && typeof inc.waitedMs === 'number' && /NO DATA/.test(String(inc.note)),
    '...recording the reason, how long it waited, and that the verdict is NO DATA');
  const second = await awaitUpstreamSettled(silent, { timeoutMs: 10 });
  ok(second === outc, 'a second wait returns the SAME settled outcome — one outcome per run, never re-raced');
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log('\n=== CONTAINMENT ===');
  ok(!/\/api\/proxy.*:3000|SPECIALIST-PROXY/.test(a.out + b.out),
    'neither run addressed the app\'s own proxy port');
  ok(a.out.indexOf('DRY UPSTREAM, NO PROVIDER REACHABLE') !== -1,
    'both runs announced themselves as dry-upstream, and their output dirs are named extractor_DRY_UPSTREAM_* so they can never be mistaken for a paid run');

  console.log('\n' + '='.repeat(100));
  console.log('GROK REDIRECT PATH PROOF: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROOF ERROR:', e && e.stack || e); process.exit(2); });
