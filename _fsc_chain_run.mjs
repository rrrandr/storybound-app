// LIVE REJECTION-AND-REPAIR CHAIN. ONE initial author call + AT MOST ONE author-revision call.
// No fallback beyond the single repair. Hard ceiling enforced by a chained reservation opened
// before the first request.
//
//     node _fsc_chain_run.mjs --authorize <usd>
//
// EXACTLY TWO requests may reach the network, each checked against its own reserved share:
//   1. the terminal author scene request
//   2. the fate-revision request, only if the gate rejected the scene
// Every other request the page attempts is ABORTED.
//
// This drives the two production functions in the production order — _runCGScreenplayGen, then
// _fscAttemptAuthorRevision on a __fateRejected result — which is exactly what the production
// caller does. It does not drive the outer UI flow; that wiring is covered statically by
// _fsc_acceptance_gate_control.mjs.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';
import { openChainReservation, releaseRepairReservation, consumeRepairReservation,
         estimateUsd, estimateRepairUsd, repairWorstCaseChars, REPAIR_MAX_TOKENS }
  from './_fsc_cost_guard.mjs';

const WISH = 'I want this to have never happened.';
const EXPECT = 'unm.time_gives_way';
const MODEL = 'grok-4-1-fast-reasoning';
const log = (...a) => console.log(...a);

const argv = process.argv.slice(2);
const ai = argv.indexOf('--authorize');
const AUTHORIZED = ai >= 0 ? Number(argv[ai + 1]) : 0;
log('=== LIVE CHAIN — one scene call + at most one repair call ===\n');
if (!(AUTHORIZED > 0)) {
  log('NO AUTHORIZATION. Pass --authorize <usd>. ZERO dispatch. ZERO spend.');
  process.exit(4);
}
log('AUTHORIZED HARD CEILING: $' + AUTHORIZED.toFixed(6) + '   (no fallback beyond one repair)\n');

const OUT = '_tempt_fate_fixtures/fsc_chain_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(OUT, { recursive: true });

// ── Reserve the chain from the REAL payload before anything opens a socket ────────────────────
// Harvested with every call aborted, exactly as the preflight does.
const probe = await chromium.launch();
const ppage = await probe.newPage();
const probed = [];
await ppage.route('**/api/**', async (r) => {
  let b = null; try { b = r.request().postData(); } catch (_) {}
  if (b) probed.push(b);
  try { await r.abort(); } catch (_) {}
});
await ppage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await ppage.waitForFunction(() => typeof window._launchStarterStory === 'function', { timeout: 20000 });
await ppage.evaluate(async (wish) => {
  const def = window.STARTER_STORIES.find(s => s.id === 'starter_first_sacrifice');
  await window._launchStarterStory(def);
  await new Promise(r => setTimeout(r, 1500));
  window._fscCompileAndPersist(wish, { source: 'chain_probe' });
  for (const idx of [2, 3, 1]) {
    try { await Promise.race([window._runCGScreenplayGen(idx, '', ''), new Promise(r => setTimeout(r, 35000))]); } catch (_) {}
  }
}, WISH);
await probe.close();
const MARK = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i];
const authored = probed.filter(b => {
  let m = null; try { m = (JSON.parse(b).messages || []).length; } catch (_) {}
  return m === 2 && MARK.reduce((n, rx) => n + (rx.test(b) ? 1 : 0), 0) >= 2;
}).sort((a, b) => b.length - a.length);
if (!authored.length) { log('PROBE FAILED — no author request harvested. $0 spent.'); process.exit(2); }
const realBody = JSON.parse(authored[0]);

const chain = openChainReservation(realBody, { model: MODEL, cap: AUTHORIZED,
  remainingAuthorization: AUTHORIZED });
log('CHAIN RESERVATION (pre-dispatch, no network)');
log('  initial author call      $' + chain.reservation.initial.toFixed(6)
  + '   (' + (realBody.messages || []).reduce((n, m) => n + String(m.content || '').length, 0).toLocaleString() + ' chars)');
log('  one author-revision call $' + chain.reservation.repair.toFixed(6)
  + '   (worst case ' + repairWorstCaseChars().toLocaleString() + ' chars / ' + REPAIR_MAX_TOKENS + ' out)');
log('  ── CHAIN TOTAL           $' + chain.reservation.total.toFixed(6)
  + '   vs ceiling $' + AUTHORIZED.toFixed(6));
fs.writeFileSync(path.join(OUT, 'reservation.json'), JSON.stringify(chain, null, 2));
if (!chain.ok) {
  log('\n  REFUSED BEFORE DISPATCH — ' + chain.reason + '. ZERO dispatch. ZERO spend.');
  process.exit(3);
}
log('  RESERVED — both calls fit.\n');

// ── The live run. Exactly two requests may pass; all others abort. ────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();
let sceneCalls = 0, repairCalls = 0, aborted = 0;
const receipts = [];

page.on('response', async (res) => {
  if (res.url().indexOf('/api/proxy') < 0) return;
  try {
    const txt = await res.text();
    let usage = null; try { usage = (JSON.parse(txt).usage) || null; } catch (_) {}
    receipts.push({ status: res.status(),
      cost: usage && usage.cost_in_usd_ticks ? usage.cost_in_usd_ticks * 1e-10 : null,
      promptTokens: usage && usage.prompt_tokens, completionTokens: usage && usage.completion_tokens,
      bytes: txt.length });
    fs.writeFileSync(path.join(OUT, 'raw_' + receipts.length + '.txt'), txt);
  } catch (_) {}
});

await page.route('**/api/**', async (route) => {
  const req = route.request();
  let body = null; try { body = req.postData(); } catch (_) {}
  if (!body) { aborted++; return route.abort(); }
  let msgs = null, tag = '';
  try { const j = JSON.parse(body); msgs = (j.messages || []).length; tag = String(j.roleTag || j.role || ''); } catch (_) {}
  const isScene = msgs === 2 && MARK.reduce((n, rx) => n + (rx.test(body) ? 1 : 0), 0) >= 2
    && /"max_tokens":\s*8000/.test(body);
  const isRepair = /THE LINES TO REWRITE/.test(body) || /fate-revision/.test(tag);

  if (isRepair && repairCalls === 0) {
    const est = estimateUsd(JSON.parse(body), MODEL).estimate;
    const c = consumeRepairReservation(chain.reservation, est);
    if (!c.allowed) {
      log('  ✗ repair request REFUSED against its reservation — ' + c.reason);
      aborted++; return route.abort();
    }
    repairCalls++;
    log('  → REPAIR CALL permitted: est $' + est.toFixed(6) + ' of $' + c.reserved.toFixed(6) + ' reserved');
    return route.continue();
  }
  if (isScene && sceneCalls === 0) {
    const est = estimateUsd(JSON.parse(body), MODEL).estimate;
    if (est > chain.reservation.initial * 1.05) {
      log('  ✗ scene request REFUSED — est $' + est.toFixed(6) + ' exceeds its reserved share');
      aborted++; return route.abort();
    }
    sceneCalls++;
    log('  → SCENE CALL permitted: est $' + est.toFixed(6));
    return route.continue();
  }
  aborted++; return route.abort();
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscAcceptProse === 'function', { timeout: 20000 });

log('RUNNING — story launch, seal, one scene call, gate, then repair if rejected');
const result = await page.evaluate(async (args) => {
  const o = { steps: [] };
  const def = window.STARTER_STORIES.find(s => s.id === 'starter_first_sacrifice');
  await window._launchStarterStory(def);
  await new Promise(r => setTimeout(r, 1500));
  const rec = window._fscCompileAndPersist(args.wish, { source: 'chain_run' });
  o.outcomeId = rec && rec.outcomeId;
  o.steps.push('sealed ' + o.outcomeId);

  let plan = null;
  try { plan = await Promise.race([window._runCGScreenplayGen(2, '', ''),
    new Promise(r => setTimeout(() => r({ __timeout: true }), 150000))]); }
  catch (e) { o.genError = String(e && e.message); }
  o.initial = plan ? (plan.__fateRejected ? 'fate_rejected'
    : plan.__staleRejected ? 'stale_rejected'
    : plan.__timeout ? 'timeout'
    : (Array.isArray(plan.beats) ? 'accepted' : 'no_plan')) : 'null';
  o.steps.push('initial: ' + o.initial);
  o.rejectedFailures = (plan && plan.failures) || null;

  if (plan && plan.__fateRejected) {
    const rejected = (window.state._fscRejectedScenes || []).slice(-1)[0];
    o.rejectedBeats = rejected && rejected.rawPlan && rejected.rawPlan.beats
      ? rejected.rawPlan.beats.map(b => b.text) : null;
    o.failingBeats = rejected ? window._fscFailingBeats(rejected.rawPlan) : null;
    const brief = rejected ? window._fscBuildRepairBrief(rejected.rawPlan) : null;
    o.repairBrief = brief ? { sys: brief.sys, usr: brief.usr, codes: brief.codes } : null;
    let rev = null;
    try { rev = await window._fscAttemptAuthorRevision(rejected && rejected.rawPlan, 2); }
    catch (e) { rev = { ok: false, reason: 'threw: ' + (e && e.message) }; }
    o.repair = { ok: rev.ok, reason: rev.reason || null, codes: rev.codes || null,
      repairedIdx: rev.repairedIdx || null,
      failuresAfter: rev.failures || null,
      marker: rev.ok ? rev.plan._fscRecovery : null,
      repairedBeats: rev.ok ? rev.plan.beats.map(b => b.text) : null };
    o.steps.push('repair: ' + (rev.ok ? 'ACCEPTED' : 'rejected (' + rev.reason + ')'));
  } else if (o.initial === 'accepted') {
    o.steps.push('no repair needed');
  }
  o.recoveryLog = window.state._fscRecoveryLog || [];
  o.mounted = !!(window.state._stagedActive && window.state._stagedActive.plan);
  o.domLeak = /author_revision|rejected|C1\/|C3\/|acceptance/i.test(document.body.innerText || '');
  return o;
}, { wish: WISH });
await browser.close();

// ── Accounting ────────────────────────────────────────────────────────────────────────────────
const measured = receipts.reduce((n, r) => n + (r.cost || 0), 0);
log('\nACCOUNTING');
log('  requests permitted : scene ' + sceneCalls + ', repair ' + repairCalls
  + '   (' + aborted + ' others aborted)');
receipts.forEach((r, i) => log('  receipt ' + (i + 1) + ': status ' + r.status
  + '  ' + (r.cost != null ? '$' + r.cost.toFixed(6) : 'no usage')
  + '  in ' + (r.promptTokens || '?') + ' / out ' + (r.completionTokens || '?')));
log('  MEASURED TOTAL     : $' + measured.toFixed(6)
  + '   vs reserved $' + chain.reservation.total.toFixed(6)
  + '   vs ceiling $' + AUTHORIZED.toFixed(6));
log('  ' + (measured <= AUTHORIZED ? '✓ within the hard ceiling' : '⚠ OVER THE CEILING'));
if (result.initial === 'accepted') {
  const rel = releaseRepairReservation(chain.reservation);
  log('  repair reservation RELEASED ($' + rel.released.toFixed(6) + ' unspent)');
}

log('\nOUTCOME');
result.steps.forEach(s => log('  · ' + s));
if (result.rejectedFailures) {
  log('  initial rejection:');
  result.rejectedFailures.forEach(f => log('     ✗ ' + f.criterion + '/' + f.kind
    + (f.line ? ': "' + f.line.slice(0, 90) + '"' : '')));
}
if (result.failingBeats) {
  log('  failing beats handed to the writer: '
    + result.failingBeats.map(b => b.idx + ' [' + b.reasons.join(',') + ']').join('  '));
}
if (result.repair) {
  log('  repair: ' + (result.repair.ok ? 'ACCEPTED by the gate' : 'DISCARDED — ' + result.repair.reason));
  if (result.repair.ok) {
    log('  lines replaced: ' + result.repair.repairedIdx.join(', '));
    result.repair.repairedIdx.forEach(i => {
      log('     was : "' + (result.rejectedBeats[i] || '').slice(0, 100) + '"');
      log('     now : "' + (result.repair.repairedBeats[i] || '').slice(0, 100) + '"');
    });
    log('  marker: ' + JSON.stringify(result.repair.marker));
  } else if (result.repair.failuresAfter && result.repair.failuresAfter.length) {
    result.repair.failuresAfter.forEach(f => log('     ✗ still ' + f.criterion + '/' + f.kind
      + (f.line ? ': "' + f.line.slice(0, 90) + '"' : '')));
  }
}
log('  nothing mounted: ' + (result.mounted === false));
log('  no DOM leak    : ' + (result.domLeak === false));

fs.writeFileSync(path.join(OUT, 'chain_result.json'), JSON.stringify(
  { authorized: AUTHORIZED, reservation: chain.reservation, receipts, measured, result }, null, 2));
if (result.repairBrief) fs.writeFileSync(path.join(OUT, 'repair_brief.txt'),
  result.repairBrief.sys + '\n\n────────\n\n' + result.repairBrief.usr);
log('\n  evidence: ' + OUT);
log('  NO VERDICT RENDERED HERE. C1/C3 are human calls against the sealed record.');
