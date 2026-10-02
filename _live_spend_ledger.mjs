// THE SINGLE DEFINITION OF WHAT A LIVE STAGE COSTS, AND OF HOW SPEND IS REPORTED.
//
// Two things used to live inside _continuation_live_eval.mjs, where a second runner could not
// reach them without copying them:
//
//   1. THE PER-STAGE WORST-CASE RESERVATION. These are the numbers an authorization request is
//      quoted from. Two runners with two copies can disagree, and then one of them asks Roman to
//      authorize a figure the other would not honour. There is now one copy.
//
//   2. THE RECEIPT LEDGER. ministral-8b returns no `cost_in_usd_ticks`, so a dispatch with no
//      receipt was reported as $0.000000 in runs 15 and 16 while it had in fact billed. Roman's
//      rule: a missing receipt is UNMEASURED and ESTIMATED, never free. That rule is implemented
//      once here.
//
// WHY _continuation_live_eval.mjs STILL HOLDS ITS OWN LEDGER: it imports the reservations below —
// the money-critical half, provably unchanged against four recorded estimate-only baselines — but
// its ledger is NOT migrated in this change. `recordCost` only runs after a dispatch, so a
// migration there cannot be verified by any free test, and the script it lives in is the one that
// has spent real money on nineteen runs. Changing it blind to save a duplicate would be trading a
// proven path for a tidier one. This module's ledger is the implementation the NEW runner uses, and
// `_live_spend_ledger_control.mjs` proves its behaviour against receipted and receiptless
// responses. When a paid run next exercises the live eval, that is the moment to migrate it.
import { estimateUsd } from './_fsc_cost_guard.mjs';

// A worst-case stage: `chars` of prompt, `out` output tokens, on the most expensive model in the
// chain. Deliberately pessimistic — a reservation that can be exceeded is not a reservation.
const worst = (chars, out) => estimateUsd(
  { messages: [{ content: 'x'.repeat(chars) }], max_tokens: out },
  'grok-4-1-fast-reasoning').estimate;

// THE FALLBACK MULTIPLIER IS 1, on measured evidence: the two-case run dispatched exactly one call
// per stage with no tier fallback, so a x2 was reserving for a contingency that did not occur.
//
// RAISED 30000 -> 45000 CHARS on measurement (Roman 2026-10-02). The live FS planner capture
// recorded the real request: system 17,255 + user 19,357 = 36,612 chars, 8,352 prompt tokens,
// max_tokens 1200, 589 completion. The old 30,000-char shape was taken from the SYNTHETIC story's
// planner and under-reserved the FS one by about 6,600 chars:
//
//     reserved at 30,000 chars : $0.017550
//     the real request estimated: $0.019130   <- ABOVE the reservation
//     actually measured          : $0.013438
//
// Spend came in under both, so nothing overran. The defect is in the bound, not the bill: a
// reservation the real request can exceed is not a reservation, and at a ceiling of exactly
// $0.017550 the capture's own pre-dispatch budget check would have BLOCKED the call and the run
// would have produced nothing. 45,000 chars carries ~23% margin over the measured request; 1400
// output tokens stays above both the app's 1200 cap and the 589 actually returned.
export const R_PLANNER = worst(45000, 1400);
// 240k chars / 8k out. The author is 83% of a scene's reservation and the only stage never yet
// measured more than twice, which is why Roman held it untightened.
export const R_AUTHOR = worst(240000, 8000);
// TRACKS THE VERIFIER'S max_tokens. This read 300 — the value from before `per_proposal` existed —
// and so under-reserved the one stage a verifier-only run actually pays for. 900 is the current cap.
export const R_VERIFIER = worst(10000, 900);

// ONE FULL SCENE, LIVE: planner decides, author writes, verifier adjudicates the previous scene's
// proposals. The memory extractor is replayed in every runner and reserves nothing.
export const R_SCENE = R_PLANNER + R_AUTHOR + R_VERIFIER;

export const reservationLines = () => ([
  '  planner  : $' + R_PLANNER.toFixed(6),
  '  author   : $' + R_AUTHOR.toFixed(6),
  '  verifier : $' + R_VERIFIER.toFixed(6),
  '  one live scene = $' + R_SCENE.toFixed(6)
]);

// ── THE RECEIPT LEDGER ──────────────────────────────────────────────────────
// `say` is the caller's logger, so a run's spend lines land in that run's own log.
export function makeSpendLedger(say) {
  const unreceipted = [];        // [{ stage, model, estimate }]
  let measured = 0;              // sum of real receipts
  const unmeasuredTotal = () => unreceipted.reduce((n, u) => n + u.estimate, 0);

  const modelOf = (text) => {
    try {
      const j = JSON.parse(text);
      return (j && j._orchestration && j._orchestration.model) || (j && j.model) || null;
    } catch (_) { return null; }
  };

  // A receipt is `usage.cost_in_usd_ticks`, in units of 1e-10 USD. No receipt is NOT no cost.
  const recordCost = (stage, text, est, model) => {
    let ticks = null;
    try { const j = JSON.parse(text); ticks = j && j.usage && j.usage.cost_in_usd_ticks; } catch (_) {}
    if (typeof ticks === 'number') {
      const usd = ticks * 1e-10;
      measured += usd;
      say('        measured $' + usd.toFixed(6) + ' (receipted; total measured $'
        + measured.toFixed(6) + ')');
      return { receipted: true, usd };
    }
    const m = model || modelOf(text) || 'unknown';
    unreceipted.push({ stage, model: m, estimate: est });
    say('        NO RECEIPT from ' + m + ' — UNMEASURED, estimated $' + est.toFixed(6)
      + ' (this is NOT $0; total unmeasured $' + unmeasuredTotal().toFixed(6) + ')');
    return { receipted: false, usd: null, estimate: est };
  };

  // A DISPATCHED CALL THAT NEVER CAME BACK. The FS corpus run dispatched the author, the fetch
  // threw, and the runner recorded "transit_error" without telling the ledger — so a request that
  // may well have reached the provider was booked as $0. That is the same defect as reading a
  // missing receipt as free, in a different code path: the request left, and whether it billed is
  // not knowable from here. It is UNMEASURED exposure with its estimate, never zero.
  const recordDispatchedNoResponse = (stage, est, why, model) => {
    const m = model || 'unknown';
    unreceipted.push({ stage, model: m, estimate: est, noResponse: true, why: why || 'transit error' });
    say('        NO RESPONSE from ' + m + ' (' + (why || 'transit error') + ') — the request was'
      + ' DISPATCHED, so this is UNMEASURED, estimated $' + est.toFixed(6)
      + ' (NOT $0; total unmeasured $' + unmeasuredTotal().toFixed(6) + ')');
    return { receipted: false, usd: null, estimate: est, noResponse: true };
  };

  const exposure = () => measured + unmeasuredTotal();

  const spendReport = (authorized) => {
    const un = unmeasuredTotal(), ex = exposure();
    say('\nSPEND');
    say('  MEASURED (receipts): $' + measured.toFixed(6));
    if (unreceipted.length) {
      const noResp = unreceipted.filter(u => u.noResponse).length;
      say('  UNMEASURED         : $' + un.toFixed(6) + ' estimated across ' + unreceipted.length
        + ' call(s) with no receipt'
        + (noResp ? ' — ' + noResp + ' of them never returned at all' : ''));
      unreceipted.forEach(u => say('      · ' + u.stage + ' on ' + u.model
        + ' — estimated $' + u.estimate.toFixed(6)
        + (u.noResponse ? '  [DISPATCHED, NO RESPONSE: ' + (u.why || 'transit error') + ']' : '')));
    } else {
      say('  UNMEASURED         : none — every dispatch returned a receipt');
    }
    say('  TOTAL EXPOSURE     : $' + ex.toFixed(6)
      + (authorized ? ' of $' + Number(authorized).toFixed(2)
        + '  (' + ((ex / Number(authorized)) * 100).toFixed(1) + '%)' : ''));
    if (unreceipted.length) {
      say('  NOTE: the unmeasured figure is an ESTIMATE, not a receipt. Real spend for those');
      say('        calls is whatever the provider billed, and is not knowable from this run.');
    }
    return { measured, unmeasured: un, exposure: ex, receiptless: unreceipted.length };
  };

  return { recordCost, recordDispatchedNoResponse, modelOf, spendReport, unreceipted,
    unmeasuredTotal, measuredTotal: () => measured, exposure };
}
