// PROVE THE SPEND LEDGER. Provider-free, $0. No playwright, no dispatch.
//
// This control exists because of a specific, already-committed defect: ministral-8b returns no
// `cost_in_usd_ticks`, and runs 15 and 16 therefore reported MEASURED $0.000000 for a verifier call
// that had really billed. "No receipt" was being read as "no cost". Roman's correction was that a
// receiptless dispatch is UNMEASURED and ESTIMATED, never $0. Every check below guards against that
// reading coming back.
//
// It also pins the per-stage reservation to the app's own verifier token cap. That pairing has
// drifted once: the reservation was computed at 300 output tokens while `max_tokens` had been
// raised, so the one stage a verifier-only run pays for was under-reserved.
import fs from 'fs';
import { R_PLANNER, R_AUTHOR, R_VERIFIER, R_SCENE, makeSpendLedger, reservationLines }
  from './_live_spend_ledger.mjs';
import { estimateUsd } from './_fsc_cost_guard.mjs';

let pass = 0, fail = 0;
const lines = [];
const say = (s) => { lines.push(s); };
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== SPEND LEDGER CONTROL (provider-free, $0) ===\n');

// ── 1. THE RESERVATIONS ─────────────────────────────────────────────────────
console.log('1. the per-stage reservation is one definition, and it is pessimistic');
t('every stage reserves a positive amount',
  R_PLANNER > 0 && R_AUTHOR > 0 && R_VERIFIER > 0);
t('a live scene is exactly planner + author + verifier',
  Math.abs(R_SCENE - (R_PLANNER + R_AUTHOR + R_VERIFIER)) < 1e-12, 'R_SCENE=' + R_SCENE);
t('the author dominates the scene reservation (it is the stage to tighten)',
  R_AUTHOR > R_PLANNER + R_VERIFIER,
  'author=' + R_AUTHOR.toFixed(6) + ' others=' + (R_PLANNER + R_VERIFIER).toFixed(6));
// THE PAIRING THAT DRIFTED ONCE. The verifier reservation is computed at the app's own max_tokens;
// raising the cap in app.js without raising the reservation turns this red.
const appSrc = fs.readFileSync('public/app.js', 'utf8');
const vCapMatch = appSrc.match(/_callTieredProvider\('runtimeCommitVerifier'[\s\S]*?max_tokens:\s*(\d+)/);
const vCap = vCapMatch ? Number(vCapMatch[1]) : null;
t('the app\'s runtime-commit-verifier cap is readable', vCap !== null, 'no max_tokens found');
const atCap = vCap === null ? null : estimateUsd(
  { messages: [{ content: 'x'.repeat(10000) }], max_tokens: vCap }, 'grok-4-1-fast-reasoning').estimate;
t('the verifier reservation tracks that cap (' + vCap + ' tokens)',
  atCap !== null && Math.abs(atCap - R_VERIFIER) < 1e-12,
  'app cap ' + vCap + ' -> $' + (atCap === null ? '?' : atCap.toFixed(6))
  + ' but R_VERIFIER = $' + R_VERIFIER.toFixed(6));
t('the reservation lines name all three stages and the scene total',
  (reservationLines().join('\n').match(/planner|author|verifier|one live scene/g) || []).length >= 4);

// ── 2. A RECEIPTED DISPATCH ─────────────────────────────────────────────────
console.log('\n2. a receipted dispatch is MEASURED from the receipt, not from the estimate');
{
  const L = makeSpendLedger(say);
  // 123456789 ticks x 1e-10 = $0.0123456789. The estimate passed in is a deliberately absurd $99:
  // if the ledger ever prefers the estimate over a real receipt, that shows up immediately.
  const r = L.recordCost('author', JSON.stringify({ usage: { cost_in_usd_ticks: 123456789 } }),
    99.0, 'grok-4-1-fast-reasoning');
  t('the call is reported receipted', r.receipted === true);
  t('measured comes from the receipt, NOT the $99 estimate',
    Math.abs(L.measuredTotal() - 0.0123456789) < 1e-12, 'measured=' + L.measuredTotal());
  t('nothing is recorded as unmeasured', L.unreceipted.length === 0);
  t('exposure equals the receipt', Math.abs(L.exposure() - 0.0123456789) < 1e-12);
}

// ── 3. A RECEIPTLESS DISPATCH — THE DEFECT ──────────────────────────────────
console.log('\n3. a RECEIPTLESS dispatch is UNMEASURED and ESTIMATED — never $0');
{
  const L = makeSpendLedger(say);
  const r = L.recordCost('verifier', JSON.stringify({ choices: [{ message: { content: '{}' } }] }),
    0.0078, 'ministral-8b-2512');
  t('the call is reported receiptless', r.receipted === false);
  t('measured stays $0 — there was no receipt to measure', L.measuredTotal() === 0);
  t('but it is RECORDED, with its model and estimate',
    L.unreceipted.length === 1 && L.unreceipted[0].model === 'ministral-8b-2512'
    && Math.abs(L.unreceipted[0].estimate - 0.0078) < 1e-12);
  t('TOTAL EXPOSURE IS NOT $0 — this is the run-15/16 defect',
    L.exposure() > 0 && Math.abs(L.exposure() - 0.0078) < 1e-12, 'exposure=' + L.exposure());
  const rep = L.spendReport(0.05);
  t('the report states measured $0 AND unmeasured $0.0078 separately',
    rep.measured === 0 && Math.abs(rep.unmeasured - 0.0078) < 1e-12 && rep.receiptless === 1);
  const txt = lines.join('\n');
  t('the printed report says the figure is an ESTIMATE, not a receipt',
    /ESTIMATE, not a receipt/.test(txt));
  t('the printed line for the call says NOT $0 in words', /this is NOT \$0/.test(txt));
  t('the report never prints TOTAL EXPOSURE as $0.000000',
    !/TOTAL EXPOSURE\s*:\s*\$0\.000000/.test(txt),
    txt.split('\n').filter(l => /EXPOSURE/.test(l)).join(' | '));
}

// ── 4. MIXED, AND THE ARITHMETIC ────────────────────────────────────────────
console.log('\n4. mixed receipts: exposure is measured + unmeasured, both reported');
{
  const L = makeSpendLedger(say);
  L.recordCost('planner', JSON.stringify({ usage: { cost_in_usd_ticks: 20000000 } }), 0.0176, 'grok');
  L.recordCost('author', JSON.stringify({ usage: { cost_in_usd_ticks: 300000000 } }), 0.126, 'grok');
  L.recordCost('verifier', JSON.stringify({ bad: true }), 0.0078, 'ministral-8b-2512');
  const rep = L.spendReport(0.20);
  t('measured sums only the two receipts',
    Math.abs(rep.measured - 0.032) < 1e-12, 'measured=' + rep.measured);
  t('unmeasured holds only the receiptless one',
    Math.abs(rep.unmeasured - 0.0078) < 1e-12 && rep.receiptless === 1);
  t('exposure is the sum of both', Math.abs(rep.exposure - 0.0398) < 1e-12, 'exposure=' + rep.exposure);
  t('exposure is never less than measured', rep.exposure >= rep.measured);
}

// ── 5. THE MODEL IS NAMED EVEN WHEN THE CALLER DOES NOT NAME IT ─────────────
console.log('\n5. a receiptless call still names its model when the response carries one');
{
  const L = makeSpendLedger(say);
  L.recordCost('verifier', JSON.stringify({ _orchestration: { model: 'ministral-8b-2512' } }), 0.0078);
  t('the model is recovered from the response',
    L.unreceipted[0].model === 'ministral-8b-2512', L.unreceipted[0].model);
  const L2 = makeSpendLedger(say);
  L2.recordCost('verifier', 'not json at all', 0.0078);
  t('an unparseable response is still recorded as unmeasured, model "unknown"',
    L2.unreceipted.length === 1 && L2.unreceipted[0].model === 'unknown' && L2.exposure() > 0);
}

// ── 6. NO SECOND DEFINITION OF THE MONEY ────────────────────────────────────
console.log('\n6. the reservation has exactly one definition in the repo');
{
  // The needle is built from halves so this scan cannot match its own source line.
  const needle = 'worst(' + '240000, 8000)';
  const owners = fs.readdirSync('.')
    .filter(f => /\.mjs$/.test(f))
    .filter(f => fs.readFileSync(f, 'utf8')
      .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n').includes(needle));
  t('only _live_spend_ledger.mjs computes the author reservation',
    owners.length === 1 && owners[0] === '_live_spend_ledger.mjs', 'owners: ' + JSON.stringify(owners));
  const le = fs.readFileSync('_continuation_live_eval.mjs', 'utf8');
  t('the live eval IMPORTS the reservation rather than redefining it',
    /import \{[^}]*R_AUTHOR[^}]*\} from '\.\/_live_spend_ledger\.mjs'/.test(le)
    && !/^const R_AUTHOR\s*=/m.test(le));
}

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
fs.writeFileSync('_audit_out/spend_ledger_report.txt', lines.join('\n') + '\n');
process.exit(fail ? 1 : 0);
