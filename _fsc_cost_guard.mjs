import fallbackPolicy from './public/model-fallback-policy.js';
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
// Conservative constants, each biased against us. (Restored — an earlier edit of mine removed
// this block while rewriting the rate table, which would have thrown ReferenceError on the first
// estimate. Caught by running it, not by reading it.)
export const CHARS_PER_TOKEN = 4.0;   // observed 4.46 on a real payload; 4.0 over-counts by ~11%
export const REASONING_MULT  = 1.5;   // reasoning tokens are NOT bounded by max_tokens
export const SAFETY_MARGIN   = 1.2;   // applied on top of everything above
export const ASSUME_NO_CACHE = true;  // cached_tokens was 192 of 56,499 — assume zero
// When a body declares no completion budget we must NOT assume a small one. The real CG author
// dispatch (public/app.js, `max_tokens: 8000`) is the budget actually in play on this path.
export const UNKNOWN_MAX_TOKENS = 8000;

// VERIFIED RATES, copied from public/app.js TEXT_PRICING (the authoritative in-repo table).
// WIDENED 2026-10-05 (Codex): the table held only three Grok entries, so WORST_RATE was the Grok
// rate — and gpt-4o is 2x input / 4x output ABOVE it, gpt-4-turbo 8x / 12x. gpt-4o is the TERMINAL
// AUTHOR FALLBACK, so the guard UNDER-reserved precisely when a fallback fired. Keeping GPT and
// Mistral available as fallbacks means pricing them, not excluding them.
export const RATES = {
  'grok-4-1-fast-reasoning':      { in: 0.00000125, out: 0.0000025 },
  'grok-4-1-fast-non-reasoning':  { in: 0.00000125, out: 0.0000025 },
  'grok-4.20-0309-non-reasoning': { in: 0.00000125, out: 0.0000025 },
  'grok-4.3':                     { in: 0.00000125, out: 0.0000025 },
  'gpt-4o-mini':                  { in: 0.00000015, out: 0.0000006 },
  // gpt-6-luna — $0.10 in / $0.50 out per MTok, the same figures api/cplus-editor.js
  // EDITOR_CONFIGS.general and api/sol-scene-test.js RATES already price it at, from
  // developers.openai.com/api/docs/models/gpt-6-luna. PRICED BECAUSE IT IS NOW ROUTABLE:
  // the provider-free drive capture reported `PRIMARY_AUTHOR estimate $Infinity` for it,
  // which in a PAID run means guardDispatch refuses every Luna author call — the guard
  // correctly blocks what it cannot price. One rate row, no behaviour change for any other
  // model. NOTE: on this model reasoning is billed INSIDE completion, so an `out` figure
  // sized from visible prose alone understates it; the caller's allowance is what to reserve
  // against, which is what guardDispatch already does.
  'gpt-6-luna':                   { in: 0.0000001,  out: 0.0000005 },
  'gpt-4o':                       { in: 0.0000025,  out: 0.00001   },
  'gpt-4-turbo':                  { in: 0.00001,    out: 0.00003   },
  'mistral-small-latest':         { in: 0.00000015, out: 0.0000006 },
  'mistral-small-2603':           { in: 0.00000015, out: 0.0000006 },
  'ministral-8b-2512':            { in: 0.00000015, out: 0.00000015 },
  // Mistral Medium 3.5 — $1.50 in / $7.50 out per M, read from Mistral's own pricing page
  // (docs.mistral.ai/inference/pricing, 2026-10-13), which lists the concrete identifier as
  // mistral-medium-3-5-26-04. THIS KEY IS THE ALIAS, because api/mistral-proxy.js's allowlist
  // admits only 'mistral-medium-latest' and not the pinned version — so the figure assumes the
  // alias resolves to Medium 3.5 on this account. That assumption is the one remaining risk in
  // the price, and it is stated rather than hidden.
  // PRICING IT DOES NOT MAKE IT DISPATCHABLE: api/_mistral-governor.js still has no row for it,
  // and a model absent from that table is refused. The account's TPM/RPS from
  // https://admin.mistral.ai/plateforme/limits is the outstanding blocker.
  'mistral-medium-latest':        { in: 0.0000015,  out: 0.0000075 },
  // Claude Haiku 4.5 — $1 in / $5 out per M, read from Anthropic's own pricing table
  // (platform.claude.com/docs/en/about-claude/pricing, 2026-10-13). PINNED identifier, not an
  // alias: api/anthropic-proxy.js allowlists exactly this one model, so there is no resolution
  // ambiguity of the kind mistral-medium-latest still carries. 200k context; this experiment's
  // prompt is ~86k. Cache-write/hit and batch rates exist and are NOT modelled here, so a cached
  // or batched call would cost LESS than this reservation, never more.
  'claude-haiku-4-5-20251001':    { in: 0.000001,   out: 0.000005 },
  // Claude Sonnet 5.5 — $2 in / $10 out per M (platform.claude.com pricing table, 2026-10-13).
  // A DATELESS id that is its own pinned snapshot, per the models overview, so naming it is not
  // an alias assumption. 1M context, 128k max output. Adaptive thinking is on by default and its
  // tokens bill as OUTPUT, so the guard's reasoning multiplier matters more here than for Haiku.
  'claude-sonnet-5-5':            { in: 0.000002,   out: 0.00001 },
  // Mistral Medium 3.5, PINNED — same published $1.50/$7.50 as the alias row above, but keyed to
  // an identifier whose resolution is known rather than assumed.
  'mistral-medium-3-5-26-04':     { in: 0.0000015,  out: 0.0000075 },
  // ── THE TWO MODELS THE LITERARY CHAIN REACHES THAT THIS TABLE WAS MISSING ──────────────
  // (Roman 2026-11-12.) MEASURED, not supposed: a provider-free drive of The First Taste
  // assembled PRIMARY_AUTHOR on gpt-6.1-sol (R-plot, A-plot, issue spine) and
  // STRUCTURE_GENERATOR on claude-haiku-5-5 (the Anthropic fallback rung on the Body Bibles).
  // Neither had a row, so estimateUsd returned Infinity for both and guardDispatch refused
  // them — correctly, since it cannot price what it has no rate for, but the effect was that a
  // paid literary run halted at the R-plot with the whole authorization unspent. The gap was in
  // the TABLE, not in the policy, and the policy is unchanged: anything still absent is refused.
  //
  // gpt-6.1-sol — $2.00 in / $10.00 out per MTok. Two in-repo sources agree: api/sol-scene-test.js
  // RATES (the route's own table, which prices its per-call cap from these figures) and the
  // cache-write note in api/cplus-editor.js ("$2.50/MTok ... against a $2.00 input rate").
  // A REASONING MODEL: its reasoning tokens are billed INSIDE completion, so the allowance the
  // caller sends is what to reserve against — which is what estimateUsd already does.
  'gpt-6.1-sol':                  { in: 0.000002,   out: 0.00001 },
  // claude-haiku-5-5 — TIERED BY PROMPT LENGTH, and the tier boundary matters here because the
  // Body Bible prompts measured 38,434 and 58,636 chars (well under) while a late-issue author
  // prompt runs past 500,000 chars (well over). $0.10/$0.50 per MTok at or below 100,000 INPUT
  // TOKENS; $0.50/$2.50 above it (platform.claude.com/docs/en/about-claude/pricing).
  // THIS REPO DISAGREED WITH ITSELF: _nf_pilot_run2.mjs carried the correct tiered pair, while
  // _nf_note_recovery_quote.mjs labelled the ABOVE-tier $0.50/$2.50 as the "<=100k" rate. The
  // published table settles it; the base tier here is the low one and the high tier is reached
  // through tierAt, so a long prompt is never priced at the short-prompt rate.
  'claude-haiku-5-5':             { in: 0.0000001,  out: 0.0000005,
                                    tierAt: 100000,
                                    aboveTier: { in: 0.0000005, out: 0.0000025 } }
};

// The most expensive rate in the verified table. NO LONGER a fallback for unknown models — those
// are refused — and kept only to report the table's upper bound. (Restored: the same edit that
// widened RATES dropped it, which broke an importer.)
export const WORST_RATE = {
  in:  Math.max(...Object.values(RATES).map(r => r.in)),
  out: Math.max(...Object.values(RATES).map(r => r.out))
};

// MODELS THE APP CAN ROUTE TO WHOSE RATE IS PUBLISHED NOWHERE IN THIS REPO. A dispatch resolving
// to one of these CANNOT be bounded, so it is REFUSED with a reason rather than silently priced at
// some other model's rate. api/mistral-proxy.js:103 defaults to mistral-medium-latest, so this is
// a reachable path, not a hypothetical.
export const UNPRICED_MODELS = [
  // mistral-medium-latest REMOVED 2026-10-13: its rate is now published above, sourced from
  // Mistral's pricing page. It is still not dispatchable — the governor has no limits row — but
  // that is an ADMISSION gap, not a pricing one, and conflating the two understated what was known.
  'mistral-large-latest', 'mistral-small'
];

// HOW A DISPATCH'S EFFECTIVE MODEL IS DECIDED, including proxy defaults:
//   · api/proxy.js _resolveGrokModel collapses EVERY grok-* name to grok-4.3 (same rate).
//   · api/chatgpt-proxy.js uses getDefaultModel(role); api/orchestrator.js DEFAULT_MODELS are all
//     gpt-4o-mini or Grok, both priced above.
//   · api/mistral-proxy.js defaults to mistral-medium-latest, which is UNPRICED.
// THE ENDPOINT DECIDES FIRST, because each proxy picks its own model chain — an explicit name in
// the body does NOT settle what the Grok endpoint will actually call. (Codex 2026-10-05: the
// previous version trusted the body name ahead of the endpoint and ignored overrides entirely, so
// an unpriced _sbModelOverride was silently reserved at grok-4.3 rates.)
//
// Overrides api/proxy.js honours, read from its own source:
//   req.body._sbModelOverride, restricted to _SB_MODEL_OVERRIDES = [grok-4.3, grok-4.6, grok-4.7]
//   process.env.SB_FORCE_AUTHOR_MODEL as a server-side fallback when no body override is present
// grok-4.6 and grok-4.7 are EXPERIMENT-ONLY models with no published rate in this repo, so a
// dispatch carrying them cannot be bounded and must be refused rather than priced as 4.3.
export const SB_MODEL_OVERRIDES = ['grok-4.3', 'grok-4.6', 'grok-4.7'];

export function resolveModel(requested, url, body) {
  const name = String(requested || '').trim();
  const endpoint = String(url || '');
  const b = body || {};
  const bodyOverride = b._sbModelOverride ? String(b._sbModelOverride) : null;
  // The server-side override is only visible to this guard when the harness is told about it; it
  // is named here so an unknown one is refused rather than assumed absent.
  const envOverride = (typeof process !== 'undefined' && process.env
    && process.env.SB_FORCE_AUTHOR_MODEL) ? String(process.env.SB_FORCE_AUTHOR_MODEL) : null;

  if (/\/api\/proxy/.test(endpoint)) {
    const ov = bodyOverride || envOverride;
    if (ov) {
      if (SB_MODEL_OVERRIDES.indexOf(ov) === -1) {
        return { model: null, how: 'an _sbModelOverride/SB_FORCE_AUTHOR_MODEL of "' + ov
          + '" is not in api/proxy.js _SB_MODEL_OVERRIDES, so what it resolves to is unknown' };
      }
      return { model: ov, how: 'model override "' + ov + '" honoured by api/proxy.js' };
    }
    return { model: 'grok-4.3',
      how: 'api/proxy.js _resolveGrokModel collapses every name to 4.3 absent an override' };
  }
  // The isolated Anthropic calibration route serves ONE allowlisted model, so the name in the
  // body is the model served — there is no chain and no default to fall back to. Without this
  // branch the guard could not resolve the endpoint at all and refused every dispatch to it.
  if (/anthropic-proxy/.test(endpoint)) {
    return name && name !== '(unspecified)'
      ? { model: name, how: 'explicit model on the isolated anthropic calibration route' }
      : { model: null, how: 'api/anthropic-proxy.js requires an explicit allowlisted model' };
  }
  // ── THE DEEPSEEK ENDPOINT RESOLVES ITS OWN MODEL (Roman 2026-11-07) ─────────────────────
  // MEASURED at scene 17: the SD fallback chain dispatched to /api/deepseek-proxy and this
  // function had no branch for that endpoint, so the call fell through to the no-recognised-
  // endpoint case and the guard reported "SD_FALLBACK estimates $Infinity" — pricing by the ROLE
  // LABEL instead of by the model. The run halted with $2.73 still available.
  //
  // THE ACTUAL MODEL IS NOW RESOLVED; NO RATE IS INVENTED. deepseek-v4-pro / -flash remain
  // unpriced in RATES, so such a dispatch is STILL refused — but refused as "no published rate
  // exists for deepseek-v4-pro", which names a model somebody can price or exclude, rather than
  // as an unbounded role. The unknown-model refusal is deliberately left intact.
  if (/deepseek-proxy/.test(endpoint)) {
    return name && name !== '(unspecified)'
      ? { model: name, how: 'explicit model on the deepseek endpoint' }
      : { model: null, how: 'api/deepseek-proxy.js requires an explicit model; none was sent' };
  }
  if (/mistral-proxy/.test(endpoint)) {
    return name && name !== '(unspecified)'
      ? { model: name, how: 'explicit model on the mistral endpoint' }
      : { model: 'mistral-medium-latest', how: 'api/mistral-proxy.js:103 default' };
  }
  if (/chatgpt-proxy/.test(endpoint)) {
    return name && name !== '(unspecified)'
      ? { model: name, how: 'explicit model on the chatgpt endpoint' }
      : { model: 'gpt-4o-mini', how: 'chatgpt-proxy role default (DEFAULT_MODELS)' };
  }
  // NO RECOGNISED ENDPOINT. A bare name cannot say which chain will run, so it is used only as a
  // best effort and reported as such; an unpriced one still refuses downstream.
  if (name && name !== '(unspecified)') {
    return { model: name, how: 'body model with no recognised endpoint — routing not established' };
  }
  return { model: null, how: 'no model in the body and no proxy default could be resolved' };
}

export function estimateUsd(body, model, url) {
  const res = resolveModel(model || (body && body.model), url, body);
  if (body && body._noFallback !== true && fallbackPolicy.profiles[res.model]) {
    const chain = fallbackPolicy.plan(res.model, body.messages || [],
      Number(body.max_completion_tokens || body.max_tokens) || UNKNOWN_MAX_TOKENS,
      {operation:body.operation,explicit:body.contentClass==='explicit'||body.role==='INTIMACY_SPECIALIST'||body.role==='SD_FALLBACK'});
    return {bounded:chain.bounded, estimate:chain.reservedUsd, model:res.model,
      resolvedBy:res.how+'; includes the server backup', primaryEstimate:chain.primaryEstimate,
      backupEstimate:chain.backupEstimate, fallbackPlan:chain};
  }

  const chars = (body.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
  // THE DENSER CLAUDE 5 TOKENIZER. chars/4.0 held for Grok, Mistral and Haiku 4.5 (the same frozen
  // 345,504-char prompt billed 87,110 input tokens => 3.97 chars/token). The Claude 5 family uses
  // the newer tokenizer introduced with Opus 4.7, and that IDENTICAL prompt billed 130,457 input
  // tokens on claude-sonnet-5-5 => 2.65 chars/token. Pricing a Claude 5 call at chars/4 understated
  // it by 51% and the real cost came in ABOVE the reservation, which is the one direction this
  // guard must never fail in. 2.6 sits just under that ONE observation so it over-counts on this
  // prompt — but it remains an APPROXIMATION, not a guaranteed upper bound: a single sample
  // establishes nothing universal, and a different prompt (denser markup, other scripts, more
  // rare tokens) can tokenize below 2.6 chars/token and under-reserve again. Where a model's real
  // usage for a specific frozen request is already known, price from THAT, not from this.
  const cpt = /^claude-(sonnet|opus|haiku|fable|mythos)-5/.test(String(model || '')) ? 2.6
    : CHARS_PER_TOKEN;
  const promptTokens = Math.ceil(chars / cpt);
  const maxOut = Number(body.max_tokens) || UNKNOWN_MAX_TOKENS;
  const outTokens = Math.ceil(maxOut * REASONING_MULT);

  // FAIL CLOSED WHEN THE COST CANNOT BE BOUNDED. Previously an unlisted model fell to WORST_RATE,
  // which is only the Grok rate — so an expensive fallback was UNDER-reserved and dispatched. Now
  // such a dispatch is refused with a reason (Codex 2026-10-05).
  if (!res.model) {
    return { bounded: false, estimate: Infinity, model: null, resolvedBy: res.how,
      refuseReason: 'the effective model could not be resolved (' + res.how + '), so this '
        + 'dispatch cannot be priced' };
  }
  if (UNPRICED_MODELS.indexOf(res.model) !== -1) {
    return { bounded: false, estimate: Infinity, model: res.model, resolvedBy: res.how,
      refuseReason: 'no published rate exists in this repo for "' + res.model + '" (resolved by '
        + res.how + '), so this dispatch cannot be bounded' };
  }
  const rRow = RATES[res.model];
  if (!rRow) {
    return { bounded: false, estimate: Infinity, model: res.model, resolvedBy: res.how,
      refuseReason: '"' + res.model + '" is not in the verified rate table (resolved by '
        + res.how + '); refusing rather than applying another model\'s rate' };
  }
  // ── A TIERED RATE IS PRICED AT THE TIER THIS PROMPT ACTUALLY FALLS IN ───────────────────
  // Only claude-haiku-5-5 carries one today. The boundary is on INPUT TOKENS, and crossing it
  // raises BOTH the input and the output rate fivefold, so pricing a 150k-token prompt at the
  // short-prompt rate would understate it by 5x — the one direction this guard must never fail
  // in. A row with no tierAt behaves exactly as before.
  const r = (rRow.tierAt && promptTokens > rRow.tierAt && rRow.aboveTier)
    ? { in: rRow.aboveTier.in, out: rRow.aboveTier.out, tierApplied: 'above ' + rRow.tierAt + ' input tokens' }
    : { in: rRow.in, out: rRow.out, tierApplied: rRow.tierAt ? 'at or below ' + rRow.tierAt + ' input tokens' : null };
  const raw = promptTokens * r.in + outTokens * r.out;
  const estimate = raw * SAFETY_MARGIN;
  return { bounded: true, estimate, raw, promptChars: chars, promptTokens, outTokens,
    model: res.model, resolvedBy: res.how, rates: r,
    explicitMaxTokens: Number(body.max_tokens) || null,
    assumptions: { CHARS_PER_TOKEN: cpt, REASONING_MULT, SAFETY_MARGIN, ASSUME_NO_CACHE } };
}

// ── CHAINED RESERVATION (Roman 2026-09-30) ────────────────────────────────────────────────────
// The recovery path is allowed ONE author-revision call. A one-call cap at admission plus an
// unreserved second call is not a cap at all, so BOTH calls are reserved before the first network
// request. If the initial scene passes, the repair reservation is released; if it is rejected, the
// repair spends its already-reserved share and cannot exceed it.
//
// The repair prompt is far smaller than the scene prompt — the compact brief, the failing lines and
// the plain-language guidance — but it is reserved at a deliberately generous worst case, not at a
// typical one.
export const REPAIR_MAX_BEATS = 40;        // the schema targets ~25-30; 40 is headroom
export const REPAIR_MAX_BEAT_CHARS = 200;  // a narration beat is one sentence
export const REPAIR_BRIEF_CHARS = 1200;    // the longest authored brief is ~1,013
export const REPAIR_GUIDANCE_CHARS = 2400; // every guidance clause at once
export const REPAIR_SYS_CHARS = 800;
export const REPAIR_MAX_TOKENS = 600;      // what _fscAttemptAuthorRevision requests

export function repairWorstCaseChars() {
  return REPAIR_SYS_CHARS + REPAIR_BRIEF_CHARS + REPAIR_GUIDANCE_CHARS
       + (REPAIR_MAX_BEATS * REPAIR_MAX_BEAT_CHARS);
}
export function estimateRepairUsd(model) {
  return estimateUsd({ messages: [{ role: 'system', content: 'x'.repeat(repairWorstCaseChars()) }],
                       max_tokens: REPAIR_MAX_TOKENS, model: model }, model);
}

// Open a reservation covering the WHOLE chain. Nothing is dispatched unless this returns ok.
export function openChainReservation(body, { model, cap, remainingAuthorization }) {
  const initial = estimateUsd(body, model);
  const repair = estimateRepairUsd(model);
  const total = initial.estimate + repair.estimate;
  const r = { initial: initial.estimate, repair: repair.estimate, total,
              detail: { initial, repair }, model,
              cap: cap == null ? null : cap,
              remaining: remainingAuthorization == null ? null : remainingAuthorization,
              repairState: 'reserved', spent: 0 };
  if (cap != null && total > cap)
    return { ok: false, reason: 'chain_over_run_cap', reservation: r };
  if (remainingAuthorization != null && total > remainingAuthorization)
    return { ok: false, reason: 'chain_over_remaining_authorization', reservation: r };
  return { ok: true, reservation: r };
}
// The initial scene passed the gate: the repair will not happen, so give its share back.
export function releaseRepairReservation(r) {
  if (!r || r.repairState !== 'reserved') return { released: 0, repairState: r && r.repairState };
  r.repairState = 'released';
  return { released: r.repair, repairState: 'released', remainingReserved: r.initial };
}
// The initial scene was rejected: the repair spends its reserved share and may not exceed it.
export function consumeRepairReservation(r, actualEstimate) {
  if (!r) return { allowed: false, reason: 'no_reservation' };
  if (r.repairState === 'released')
    return { allowed: false, reason: 'repair_reservation_released' };
  if (r.repairState === 'consumed')
    return { allowed: false, reason: 'repair_already_consumed' };
  if (actualEstimate > r.repair)
    return { allowed: false, reason: 'repair_exceeds_reservation',
             reserved: r.repair, needed: actualEstimate };
  r.repairState = 'consumed';
  return { allowed: true, reserved: r.repair, using: actualEstimate };
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
  // STALE SINCE 2026-10-05 and failing: these two asserted the OLD behaviour, where an unlisted
  // model fell back to WORST_RATE and was priced. That fallback was deliberately removed because
  // WORST_RATE is only the Grok rate, so a dearer model was UNDER-reserved and dispatched anyway.
  // The contract now is to refuse. Asserting the current, stronger behaviour instead.
  t('an UNKNOWN model is REFUSED, not priced at some other model\'s rate',
    unknownModel.bounded === false && unknownModel.estimate === Infinity);
  t('and the refusal says why rather than failing silently',
    /not in the verified rate table|could not be resolved/.test(unknownModel.refuseReason || ''));
  // The denser Claude 5 tokenizer, measured on the frozen literary prompt (345,504 chars):
  // Haiku 4.5 billed 87,110 input tokens, Sonnet 5.5 billed 130,457 for the SAME text.
  const c5 = estimateUsd(mk(345504, 2400), 'claude-sonnet-5-5', '/api/anthropic-proxy');
  t('a Claude 5 model is priced on the denser tokenizer, not chars/4',
    c5.promptTokens >= 130457, c5.promptTokens + ' tokens');
  t('and that reservation now covers the real billed cost',
    c5.estimate >= 130457 * 0.000002 + 2400 * 0.00001, '$' + c5.estimate.toFixed(6));

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

  // ── CHAINED RESERVATION ─────────────────────────────────────────────────────────────────────
  console.log('\nJ. CHAINED RESERVATION — both calls reserved before the first request');
  const REAL = mk(248000, 8000);                       // a real scene payload
  const rep = estimateRepairUsd(MODEL);
  console.log('    repair worst case: ' + repairWorstCaseChars().toLocaleString() + ' chars, '
    + REPAIR_MAX_TOKENS + ' completion → $' + rep.estimate.toFixed(6));
  const chainTotal = estimateUsd(REAL, MODEL).estimate + rep.estimate;
  console.log('    initial $' + estimateUsd(REAL, MODEL).estimate.toFixed(6)
    + ' + repair $' + rep.estimate.toFixed(6) + ' = CHAIN $' + chainTotal.toFixed(6));
  t('the repair is reserved at a worst case, not a typical case',
    repairWorstCaseChars() > 10000, String(repairWorstCaseChars()));
  t('the chain total exceeds the single-call estimate',
    chainTotal > estimateUsd(REAL, MODEL).estimate);

  console.log('\n  PATH 1 — the initial scene PASSES, the repair share is released');
  const p1 = openChainReservation(REAL, { model: MODEL, cap: 0.15, remainingAuthorization: 0.5 });
  t('the chain is admitted under a covering ceiling', p1.ok === true, JSON.stringify(p1.reason));
  t('  both shares are recorded', p1.reservation.initial > 0 && p1.reservation.repair > 0);
  const rel = releaseRepairReservation(p1.reservation);
  t('  releasing returns the repair share', Math.abs(rel.released - rep.estimate) < 1e-9);
  t('  and only the initial share stays reserved',
    Math.abs(rel.remainingReserved - p1.reservation.initial) < 1e-9);
  t('  a released reservation cannot then fund a repair',
    consumeRepairReservation(p1.reservation, 0.001).allowed === false);
  t('    for the stated reason',
    consumeRepairReservation(p1.reservation, 0.001).reason === 'repair_reservation_released');

  console.log('\n  PATH 2 — the initial scene is REJECTED, the repair spends its reserved share');
  const p2 = openChainReservation(REAL, { model: MODEL, cap: 0.15, remainingAuthorization: 0.5 });
  const use = consumeRepairReservation(p2.reservation, rep.estimate);
  t('the repair is funded from the existing reservation', use.allowed === true);
  t('  it spends no more than was reserved', use.using <= use.reserved);
  t('  and it can be consumed only ONCE',
    consumeRepairReservation(p2.reservation, rep.estimate).allowed === false);
  t('    for the stated reason',
    consumeRepairReservation(p2.reservation, rep.estimate).reason === 'repair_already_consumed');
  const overRes = openChainReservation(REAL, { model: MODEL, cap: 0.15, remainingAuthorization: 0.5 });
  t('a repair that would exceed its share is REFUSED',
    consumeRepairReservation(overRes.reservation, rep.estimate * 3).allowed === false);
  t('    naming the overrun',
    consumeRepairReservation(overRes.reservation, rep.estimate * 3).reason === 'repair_exceeds_reservation');

  console.log('\n  PATH 3 — the CHAIN exceeds the ceiling: ZERO dispatch');
  // A ceiling that covers the initial call ALONE but not the chain must refuse everything.
  const justInitial = estimateUsd(REAL, MODEL).estimate + (rep.estimate / 2);
  const p3 = openChainReservation(REAL, { model: MODEL, cap: justInitial, remainingAuthorization: 0.5 });
  t('a ceiling that covers only the first call REFUSES the chain', p3.ok === false);
  t('  naming the chain, not the single call', p3.reason === 'chain_over_run_cap', p3.reason);
  t('  and the single-call guard WOULD have allowed it — the hole this closes',
    guardDispatch(REAL, { model: MODEL, cap: justInitial }).allowed === true);
  const p3b = openChainReservation(REAL, { model: MODEL, cap: 10, remainingAuthorization: justInitial });
  t('the same holds against the remaining authorization', p3b.ok === false
    && p3b.reason === 'chain_over_remaining_authorization');

  let chainDispatches = 0, chainSpent = 0;
  function chainedRunner(cap, remaining) {
    const res = openChainReservation(REAL, { model: MODEL, cap: cap, remainingAuthorization: remaining });
    if (!res.ok) return { dispatched: 0, reason: res.reason };
    chainDispatches++; chainSpent += res.reservation.initial;          // initial call
    const rejected = true;                                            // simulate a gate rejection
    if (rejected) {
      const c = consumeRepairReservation(res.reservation, rep.estimate);
      if (c.allowed) { chainDispatches++; chainSpent += rep.estimate; }
    }
    return { dispatched: 2, spent: chainSpent };
  }
  const blocked = chainedRunner(justInitial, 0.5);
  t('an over-cap chain produces ZERO dispatch and ZERO spend',
    blocked.dispatched === 0 && chainDispatches === 0 && chainSpent === 0);
  const ran = chainedRunner(0.15, 0.5);
  t('a covered chain dispatches BOTH calls within the reservation',
    ran.dispatched === 2 && chainDispatches === 2 && chainSpent <= 0.15,
    '$' + chainSpent.toFixed(6));

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
  process.exit(fail === 0 ? 0 : 1);
}
