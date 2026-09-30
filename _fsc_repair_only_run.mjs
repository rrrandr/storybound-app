// REPAIR-ONLY LIVE TEST. ONE author-revision call against a SAVED, genuinely rejected plan.
// No new scene generation — the rejected prose already exists on disk.
//
//     node _fsc_repair_only_run.mjs --authorize <usd> [--run <dir>] [--estimate-only]
//
// Exactly ONE request may reach the network: the fate-revision call. Everything else is aborted.
// The saved plan is loaded into the page, the consequence is sealed, the gate is run to confirm the
// rejection is real, the writer is asked to fix the named line, and the gate is run again.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';
import { estimateUsd, guardDispatch } from './_fsc_cost_guard.mjs';

const MODEL = 'grok-4-1-fast-reasoning';
const WISH = 'I want this to have never happened.';
const DEFAULT_RUN = 'fsc_c4_2026-09-29T22-50-35';   // cost-only, model's OWN invention, beat 23
const log = (...a) => console.log(...a);

const argv = process.argv.slice(2);
const ai = argv.indexOf('--authorize');
const AUTHORIZED = ai >= 0 ? Number(argv[ai + 1]) : 0;
const ri = argv.indexOf('--run');
const RUN = ri >= 0 ? argv[ri + 1] : DEFAULT_RUN;
const ESTIMATE_ONLY = argv.includes('--estimate-only');

log('=== REPAIR-ONLY LIVE TEST — one author-revision call, no new generation ===\n');
if (!ESTIMATE_ONLY && !(AUTHORIZED > 0)) {
  log('NO AUTHORIZATION. Pass --authorize <usd>, or --estimate-only. ZERO dispatch. ZERO spend.');
  process.exit(4);
}
const SRC = '_tempt_fate_fixtures/' + RUN;
if (!fs.existsSync(SRC + '/scene.json')) { log('No saved scene at ' + SRC); process.exit(2); }
const savedPlan = JSON.parse(fs.readFileSync(SRC + '/scene.json', 'utf8'));
log('SOURCE: ' + RUN + '  (' + savedPlan.beats.length + ' beats, saved rejected prose)');

const OUT = '_tempt_fate_fixtures/fsc_repair_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
let repairCalls = 0, aborted = 0;
const receipts = [];
page.on('response', async (res) => {
  if (res.url().indexOf('/api/proxy') < 0) return;
  try {
    const txt = await res.text();
    let usage = null; try { usage = (JSON.parse(txt).usage) || null; } catch (_) {}
    receipts.push({ status: res.status(),
      cost: usage && usage.cost_in_usd_ticks ? usage.cost_in_usd_ticks * 1e-10 : null,
      inTok: usage && usage.prompt_tokens, outTok: usage && usage.completion_tokens });
    fs.writeFileSync(path.join(OUT, 'raw_repair.txt'), txt);
  } catch (_) {}
});
await page.route('**/api/**', async (route) => {
  let body = null; try { body = route.request().postData(); } catch (_) {}
  const isRepair = body && /THE LINES TO REWRITE/.test(body);
  if (isRepair && repairCalls === 0 && !ESTIMATE_ONLY) {
    const est = estimateUsd(JSON.parse(body), MODEL).estimate;
    const g = guardDispatch(JSON.parse(body), { model: MODEL, cap: AUTHORIZED,
      remainingAuthorization: AUTHORIZED });
    if (!g.allowed) { log('  ✗ repair REFUSED pre-dispatch — ' + g.reason
      + ' (est $' + est.toFixed(6) + ' vs ceiling $' + AUTHORIZED.toFixed(6) + ')');
      aborted++; return route.abort(); }
    repairCalls++;
    log('  → REPAIR CALL permitted: ' + JSON.parse(body).messages
      .reduce((n, m) => n + String(m.content || '').length, 0).toLocaleString()
      + ' chars, est $' + est.toFixed(6));
    return route.continue();
  }
  if (isRepair && ESTIMATE_ONLY) {
    const est = estimateUsd(JSON.parse(body), MODEL).estimate;
    const chars = JSON.parse(body).messages.reduce((n, m) => n + String(m.content || '').length, 0);
    log('  ESTIMATE ONLY — repair payload ' + chars.toLocaleString() + ' chars, est $'
      + est.toFixed(6) + '. Nothing dispatched.');
    fs.writeFileSync(path.join(OUT, 'estimate.json'), JSON.stringify({ chars, estimate: est }, null, 2));
  }
  aborted++; return route.abort();
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscAttemptAuthorRevision === 'function', { timeout: 20000 });

const r = await page.evaluate(async (args) => {
  const o = {};
  const def = window.STARTER_STORIES.find(s => s.id === 'starter_first_sacrifice');
  await window._launchStarterStory(def);
  await new Promise(res => setTimeout(res, 1200));
  const rec = window._fscCompileAndPersist(args.wish, { source: 'repair_only' });
  o.outcomeId = rec && rec.outcomeId;

  // 1. Confirm the SAVED plan is genuinely rejected by the live gate.
  const before = window._fscAcceptProse(args.plan, 2);
  o.before = { accepted: before.accepted, failures: (before.failures || []) };
  o.failingBeats = window._fscFailingBeats(args.plan);
  const brief = window._fscBuildRepairBrief(args.plan);
  o.brief = brief ? { sys: brief.sys, usr: brief.usr, codes: brief.codes } : null;

  // 2. ONE repair call.
  let rev = null;
  try { rev = await window._fscAttemptAuthorRevision(args.plan, 2); }
  catch (e) { rev = { ok: false, reason: 'threw: ' + (e && e.message) }; }
  o.repair = { ok: rev.ok, reason: rev.reason || null, codes: rev.codes || null,
    repairedIdx: rev.repairedIdx || null, failuresAfter: rev.failures || null,
    marker: rev.ok ? rev.plan._fscRecovery : null };

  // 3. Re-gate explicitly, and show the replaced lines.
  if (rev.ok) {
    const after = window._fscAcceptProse(rev.plan, 2);
    o.after = { accepted: after.accepted, failures: after.failures || [] };
    o.replaced = (rev.repairedIdx || []).map(i => ({ idx: i,
      was: args.plan.beats[i].text, now: rev.plan.beats[i].text }));
    o.repairedBeats = rev.plan.beats.map(b => b.text);
  }
  o.originalIntact = args.plan.beats.every((b, i) => b.text === args.original[i]);
  return o;
}, { wish: WISH, plan: savedPlan, original: savedPlan.beats.map(b => b.text) });
await browser.close();

const measured = receipts.reduce((n, x) => n + (x.cost || 0), 0);
log('\nBEFORE — the saved plan against the live gate');
log('  accepted: ' + r.before.accepted);
r.before.failures.forEach(f => log('     ✗ ' + f.criterion + '/' + f.kind
  + (f.line ? ': "' + f.line.slice(0, 96) + '"' : '')));
log('  beats handed to the writer: '
  + (r.failingBeats || []).map(b => b.idx + ' [' + b.reasons.join(',') + ']').join('  '));

if (ESTIMATE_ONLY) {
  log('\n  ESTIMATE ONLY — nothing dispatched, $0 spent.');
  log('  evidence: ' + OUT);
  process.exit(0);
}

log('\nREPAIR');
log('  ' + (r.repair.ok ? 'ACCEPTED by the gate' : 'DISCARDED — ' + r.repair.reason));
(r.replaced || []).forEach(x => {
  log('  beat ' + x.idx);
  log('     was : "' + x.was + '"');
  log('     now : "' + x.now + '"');
});
if (r.after) {
  log('\nAFTER — the repaired plan against the same full gate');
  log('  accepted: ' + r.after.accepted);
  r.after.failures.forEach(f => log('     ✗ ' + f.criterion + '/' + f.kind
    + (f.line ? ': "' + f.line.slice(0, 96) + '"' : '')));
}
if (r.repair.failuresAfter && r.repair.failuresAfter.length) {
  log('  the repair still violated:');
  r.repair.failuresAfter.forEach(f => log('     ✗ ' + f.criterion + '/' + f.kind
    + (f.line ? ': "' + f.line.slice(0, 96) + '"' : '')));
}
log('\nACCOUNTING');
log('  repair calls permitted : ' + repairCalls + '   (' + aborted + ' others aborted)');
receipts.forEach((x, i) => log('  receipt ' + (i + 1) + ': status ' + x.status + '  '
  + (x.cost != null ? '$' + x.cost.toFixed(6) : 'no usage') + '  in ' + x.inTok + ' / out ' + x.outTok));
log('  MEASURED: $' + measured.toFixed(6) + '   vs ceiling $' + AUTHORIZED.toFixed(6)
  + '   ' + (measured <= AUTHORIZED ? '✓ within' : '⚠ OVER'));
log('  saved plan not mutated in place: ' + (r.originalIntact === true));
log('  marker: ' + JSON.stringify(r.repair.marker));

fs.writeFileSync(path.join(OUT, 'repair_result.json'), JSON.stringify(
  { source: RUN, authorized: AUTHORIZED, receipts, measured, result: r }, null, 2));
if (r.brief) fs.writeFileSync(path.join(OUT, 'repair_brief.txt'), r.brief.sys + '\n\n────────\n\n' + r.brief.usr);
log('\n  evidence: ' + OUT);
