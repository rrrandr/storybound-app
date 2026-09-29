// PRE-DISPATCH COST GUARD. Provider-free, no network.
//
// The $0.06 sub-cap was breached because the runner checked cost AFTER dispatch. Cost is only
// knowable from the response, so the guard must work from what IS knowable before it: prompt size,
// the requested completion budget, and the model's published rates.
//
// DELIBERATELY PESSIMISTIC. It will sometimes refuse a call that would have fitted. That is the
// correct direction for a hard cap: an over-estimate costs a refused run, an under-estimate costs
// real money. Historical observed cost is NEVER used as an upper bound — the breached run measured
// $0.0827 while the previous comparable call measured $0.0549, so yesterday's figure would have
// cleared a call that then overran.

// Rates copied from public/app.js TEXT_PRICING (verified against a real receipt: predicted
// $0.0813 vs measured $0.0827 on 56,499 prompt + 4,298 completion tokens).
export const RATES = {
  'grok-4-1-fast-reasoning':     { in: 0.00000125, out: 0.0000025 },
  'grok-4-1-fast-non-reasoning': { in: 0.00000125, out: 0.0000025 },
  'grok-4.3':                    { in: 0.00000125, out: 0.0000025 }
};

// Conservative constants, each biased against us.
export const CHARS_PER_TOKEN = 4.0;   // observed 4.46 on a real payload; 4.0 over-counts by ~11%
export const REASONING_MULT  = 1.5;   // reasoning tokens are NOT bounded by max_tokens
export const SAFETY_MARGIN   = 1.2;   // applied on top of everything above
export const ASSUME_NO_CACHE = true;  // cached_tokens was 192 of 56,499 — assume zero
// When a body declares no completion budget we must NOT assume a small one. The real CG author
// dispatch (public/app.js, `max_tokens: 8000`) is the budget actually in play on this path.
export const UNKNOWN_MAX_TOKENS = 8000;

// An unknown model is priced at the MOST expensive rate in the table, never at a default.
export const WORST_RATE = {
  in:  Math.max(...Object.values(RATES).map(r => r.in)),
  out: Math.max(...Object.values(RATES).map(r => r.out))
};

export function estimateUsd(body, model) {
  const r = RATES[model] || RATES[body && body.model] || WORST_RATE;
  const chars = (body.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
  const promptTokens = Math.ceil(chars / CHARS_PER_TOKEN);
  const maxOut = Number(body.max_tokens) || UNKNOWN_MAX_TOKENS;
  const outTokens = Math.ceil(maxOut * REASONING_MULT);
  const raw = promptTokens * r.in + outTokens * r.out;
  const estimate = raw * SAFETY_MARGIN;
  return { estimate, raw, promptChars: chars, promptTokens, outTokens,
    rates: r, assumptions: { CHARS_PER_TOKEN, REASONING_MULT, SAFETY_MARGIN, ASSUME_NO_CACHE } };
}

// THE GUARD. Returns { allowed, reason, estimate, ... }. A runner must not dispatch on allowed=false.
export function guardDispatch(body, { model, cap, remainingAuthorization }) {
  const e = estimateUsd(body, model);
  if (cap != null && e.estimate > cap) {
    return { allowed: false, reason: 'over_run_cap', estimate: e.estimate, cap, detail: e };
  }
  if (remainingAuthorization != null && e.estimate > remainingAuthorization) {
    return { allowed: false, reason: 'over_remaining_authorization',
      estimate: e.estimate, remainingAuthorization, detail: e };
  }
  return { allowed: true, estimate: e.estimate, detail: e };
}

// Standalone control.
if (import.meta.url === `file://${process.argv[1]}`) {
  let pass = 0, fail = 0;
  const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
    else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
  const MODEL = 'grok-4-1-fast-reasoning';
  const mk = (chars, maxOut) => ({ messages: [{ role: 'system', content: 'x'.repeat(chars) }],
    max_tokens: maxOut, model: MODEL });

  console.log('=== PRE-DISPATCH COST GUARD CONTROL (no network, $0) ===\n');

  console.log('A. calibration against the real breached call');
  const real = estimateUsd(mk(252045, 8000), MODEL);
  console.log('    252,045 chars / max_tokens 8000  → estimate $' + real.estimate.toFixed(6));
  t('estimate EXCEEDS the $0.06 sub-cap that was breached', real.estimate > 0.06,
    '$' + real.estimate.toFixed(6));
  t('estimate is above the $0.082655 actually measured — conservative, not tuned to fit',
    real.estimate > 0.082655, '$' + real.estimate.toFixed(6));

  console.log('\nB. the guard REFUSES the call that breached the cap');
  const g1 = guardDispatch(mk(252045, 8000), { model: MODEL, cap: 0.06 });
  t('dispatch NOT allowed', g1.allowed === false);
  t('reason is over_run_cap', g1.reason === 'over_run_cap', g1.reason);

  console.log('\nC. historical observed cost is NOT treated as an upper bound');
  const prior = estimateUsd(mk(206124, 8000), MODEL);
  t('the earlier $0.054898 call also estimates ABOVE its measured cost',
    prior.estimate > 0.054898, '$' + prior.estimate.toFixed(6));
  t('and would ALSO have been refused at a $0.06 cap',
    guardDispatch(mk(206124, 8000), { model: MODEL, cap: 0.06 }).allowed === false);
  console.log('    (deliberate: an over-estimate costs a refused run; an under-estimate costs money)');

  console.log('\nD. remaining-authorization gate, independent of the run cap');
  const g2 = guardDispatch(mk(252045, 8000), { model: MODEL, cap: 10, remainingAuthorization: 0.041385 });
  t('refused against the remaining authorization', g2.allowed === false);
  t('reason is over_remaining_authorization', g2.reason === 'over_remaining_authorization', g2.reason);

  console.log('\nE. a genuinely small call is allowed');
  const small = mk(4000, 600);
  const g3 = guardDispatch(small, { model: MODEL, cap: 0.06, remainingAuthorization: 0.041385 });
  t('small call allowed', g3.allowed === true, JSON.stringify(g3.reason));
  t('its estimate is well under the cap', g3.estimate < 0.01, '$' + g3.estimate.toFixed(6));

  console.log('\nF. ZERO DISPATCH and ZERO SPEND on an over-cap payload');
  let dispatches = 0, spent = 0;
  function runnerAttempt(body, cap, remaining) {
    const g = guardDispatch(body, { model: MODEL, cap, remainingAuthorization: remaining });
    if (!g.allowed) return { dispatched: false, reason: g.reason, estimate: g.estimate };
    dispatches++; spent += g.estimate;            // only reachable past the guard
    return { dispatched: true };
  }
  const over = runnerAttempt(mk(252045, 8000), 0.06, 0.041385);
  t('over-cap payload produced ZERO dispatch', over.dispatched === false && dispatches === 0);
  t('over-cap payload produced ZERO spend', spent === 0);
  t('the refusal names the cap breach', over.reason === 'over_run_cap', over.reason);
  const ok = runnerAttempt(mk(4000, 600), 0.06, 0.041385);
  t('a compliant payload still dispatches', ok.dispatched === true && dispatches === 1);

  console.log('\nG. assumptions are all biased against us');
  t('chars-per-token under-counts real 4.46', CHARS_PER_TOKEN < 4.46);
  t('output budget multiplied for unbounded reasoning tokens', REASONING_MULT > 1);
  t('a safety margin is applied on top', SAFETY_MARGIN > 1);
  t('prompt caching is assumed absent', ASSUME_NO_CACHE === true);
  t('the real CG author budget (max_tokens 8000) is the unknown-budget floor',
    UNKNOWN_MAX_TOKENS === 8000);

  console.log('\nH. missing fields do not weaken the guard');
  const noBudget = { messages: [{ role: 'system', content: 'x'.repeat(252045) }], model: MODEL };
  t('a body with NO max_tokens still estimates at the 8000 floor',
    estimateUsd(noBudget, MODEL).estimate === real.estimate,
    '$' + estimateUsd(noBudget, MODEL).estimate.toFixed(6));
  t('and is still refused at the $0.06 cap',
    guardDispatch(noBudget, { model: MODEL, cap: 0.06 }).allowed === false);
  const unknownModel = estimateUsd(mk(252045, 8000), 'some-model-we-have-never-priced');
  t('an UNKNOWN model is priced at the worst rate in the table, not a default',
    unknownModel.rates.in === WORST_RATE.in && unknownModel.rates.out === WORST_RATE.out);
  t('an unknown model is never cheaper than the known one',
    unknownModel.estimate >= real.estimate);

  // The simulated runner above proves the guard's logic. This proves the REAL paid runner is
  // actually gated by it — an unused guard would pass every assertion above and still overspend.
  console.log('\nI. the REAL paid runner is gated, in the right order');
  const src = (await import('node:fs')).readFileSync('_fsc_roster_compliance_run.mjs', 'utf8');
  const iGuard = src.indexOf('guardDispatch(body');
  const iRefuse = src.indexOf('REFUSED BEFORE DISPATCH');
  const iExit = src.indexOf('process.exit(3)');
  const iFetch = src.indexOf('await fetch(PROXY');
  t('the runner imports the guard', /from '\.\/_fsc_cost_guard\.mjs'/.test(src));
  t('it calls guardDispatch on the real body', iGuard > 0);
  t('the guard runs BEFORE the upstream fetch', iGuard > 0 && iFetch > 0 && iGuard < iFetch,
    'guard@' + iGuard + ' fetch@' + iFetch);
  t('refusal exits BEFORE the upstream fetch', iExit > 0 && iExit < iFetch,
    'exit@' + iExit + ' fetch@' + iFetch);
  t('the refusal path is reachable from the guard', iRefuse > iGuard && iRefuse < iFetch);
  const rem = src.match(/const REMAINING = ([\d.]+)/);
  t('remaining authorization is currently ZERO — no paid run is possible without a new figure',
    !!rem && Number(rem[1]) === 0, rem ? rem[1] : 'not declared');
  t('with REMAINING=0 the guard refuses even a trivial payload',
    guardDispatch(mk(10, 10), { model: MODEL, cap: 0.06, remainingAuthorization: 0 }).allowed === false);

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
  process.exit(fail === 0 ? 0 : 1);
}
