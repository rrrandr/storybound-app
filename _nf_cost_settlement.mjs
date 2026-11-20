// ══════════════════════════════════════════════════════════════════════════════════════════
// COST SETTLEMENT for the selected providers. The inherited ledger recognises only xAI's
// cost_in_usd_ticks, so an Anthropic or OpenAI-family receipt stayed an UNPRICED estimate and the
// remaining allowance was never reconciled against real charges. This converts actual usage at
// the applicable rates, keeps usage-derived costs distinct from estimates, and settles the
// allowance as: ceiling − settled − outstanding reservations − held unknown exposure.
// Pure arithmetic. Contacts nothing.
// ══════════════════════════════════════════════════════════════════════════════════════════

// Rates are per token. Anthropic Haiku 5.5 is priced BY PROMPT LENGTH, which is why it needs a
// function rather than a constant: $0.10/$0.50 per MTok up to 100,000 input tokens, $0.50/$2.50
// above it (recorded in api/anthropic-proxy.js when the model was last admitted).
import { RATES as SHARED_RATES } from './_fsc_cost_guard.mjs';

export const RATE_TABLE = {
  // ── CACHE RATES ADDED FOR BOTH TIERS (Roman 2026-11-12) ────────────────────────────────
  // Without them a cache-bearing Haiku receipt took the `haveCacheRates` refusal below and was
  // HELD as unresolved exposure rather than settled — correct while the rates were missing, and
  // wrong once they are published. Anthropic's table gives the long-context tier directly:
  // write $0.625/MTok, read $0.05/MTok (platform.claude.com/docs/en/about-claude/pricing).
  // Those are 1.25x and 0.1x that tier's $0.50 input rate, which is the same pair of ratios the
  // base tier takes: write $0.125/MTok, read $0.01/MTok against $0.10 input.
  'claude-haiku-5-5': (inTok) => (inTok > 100000
    ? { in: 0.50e-6, out: 2.50e-6, tier: '>100k', cacheWrite: 0.625e-6, cacheRead: 0.05e-6 }
    : { in: 0.10e-6, out: 0.50e-6, tier: '<=100k', cacheWrite: 0.125e-6, cacheRead: 0.01e-6 }),
  // ── SOL'S CACHE RATES (Roman 2026-11-12) ───────────────────────────────────────────────
  // MEASURED CONSEQUENCE OF NOT HAVING THEM: the 2026-11-02 Sol author receipt carried
  // cache_write_tokens 88,555, took the refusal below, and $0.197876 of real charge was recorded
  // as unresolved. This run puts Sol on the R-plot, the A-plot and the issue spine, which share a
  // prompt prefix, so cache-bearing Sol receipts are expected rather than hypothetical.
  //
  // THE WRITE RATE IS PUBLISHED IN THIS REPO: api/cplus-editor.js states "a standard 30-minute
  // write is $2.50/MTok on gpt-6.1-sol against a $2.00 input rate".
  //
  // THE READ RATE IS NOT, so none is assumed. Reads are priced at the FULL INPUT RATE, which
  // means a Sol receipt that read from cache settles slightly HIGH — the safe direction, and the
  // basis line below says so rather than implying a discount was applied. Replace this with the
  // published figure when there is one; do not infer it from another model's discount.
  'gpt-6.1-sol': () => ({ in: 2.0e-6, out: 10.0e-6, tier: 'flat',
    cacheWrite: 2.50e-6, cacheRead: 2.0e-6, cacheReadIsInputRate: true }),
  // ── gpt-6-luna, ADMITTED 2026-11-08 WITH ITS CACHE RATES ────────────────────────────────
  // THE DEFECT THIS FIXES. Luna became the prose author, and this table had no row for it — so
  // every one of the sixteen paid Luna prose calls was recorded as `heldUnknown` and I went on
  // to report, wrongly, that "no Luna receipt exists". The receipts were in the saved responses
  // the whole time; what was missing was a rate and a cache-aware calculation here.
  //
  // The figures are the ones api/cplus-editor.js EDITOR_CONFIGS.general and
  // _fsc_cost_guard.RATES already price Luna at: $0.10 in / $0.50 out per MTok. The CACHE rates
  // are the ones the editor route records: a write at 1.25x the input rate, a read at a tenth of
  // it. Reasoning bills INSIDE completion on this family, so `completion_tokens` is already the
  // billable output and must not have reasoning added to it.
  'gpt-6-luna': () => ({ in: 0.10e-6, out: 0.50e-6, tier: 'flat',
    cacheWrite: 1.25e-7, cacheRead: 1e-8 }),
};

// ── THE SHARED RATE TABLE IS THE FALLBACK (Roman 2026-11-08) ────────────────────────────────
// RATE_TABLE above holds the models that need a FUNCTION — a prompt-length tier, or cache rates.
// Everything else this project can dispatch is already priced, once, in _fsc_cost_guard.RATES,
// which is copied from public/app.js TEXT_PRICING. Looking there instead of duplicating rows is
// what keeps the two from drifting.
//
// WHY THIS MATTERS AND NOT JUST FOR LUNA: the scene-19 relaunch attempt held SEVEN of nine calls
// as "outcome unknown" purely because this table had no row for gpt-4o-mini or
// ministral-8b-2512 — ordinary supporting models with published rates sitting in the repo. That
// is the same defect as the Luna one, with the same consequence: real charges recorded as
// unresolved, and a remaining allowance that drifts further from the truth with every run.
//
// A CACHE-BEARING RECEIPT FOR A MODEL WITH NO CACHE RATES STILL HOLDS. The fallback supplies
// in/out only, so a receipt reporting cache activity on one of these models is still refused
// rather than priced at an incomplete rate — which is the correct answer, not a gap to paper over.
function rateFor(model) {
  const own = RATE_TABLE[model];
  if (own) return own;
  const shared = SHARED_RATES && SHARED_RATES[model];
  if (!shared) return null;
  return () => ({ in: shared.in, out: shared.out, tier: 'shared_table' });
}

// ONE receipt → one settled charge, or an explicit refusal to settle.
// Anthropic reports input_tokens/output_tokens with thinking ALREADY inside output.
// OpenAI-family reports prompt_tokens/completion_tokens, with reasoning_tokens OUTSIDE
// completion on some models — added only when the totals prove it.
export function settle(usage, model) {
  const u = usage || null;
  if (!u) return { settled: false, why: 'no usage returned', usd: null };
  // The provider's own cost figure always wins when it exists (xAI ticks are 1e-10 USD).
  if (typeof u.cost_in_usd_ticks === 'number') {
    return { settled: true, source: 'provider_cost_field', usd: u.cost_in_usd_ticks * 1e-10 };
  }
  // ── A CACHE-BEARING RECEIPT IS NOT SETTLED FROM THIS TABLE (Roman 2026-11-02) ───────────
  // MEASURED: the 2026-11-02 Sol author receipt carried `cached_tokens: 0` AND
  // `cache_write_tokens: 88555`. Only the READ fields were being tested for anywhere, so this
  // function priced all 88,558 prompt tokens at the plain input rate and the result was recorded
  // as a SETTLED charge of $0.197876 — an incomplete calculation presented as a real charge.
  //
  // Cache WRITES are not free and this table has no rate for them, so the honest outcome is to
  // refuse: the receipt is preserved and the amount is classified as unresolved exposure, which
  // `holdExposure` makes the ledger do. An authoritative provider cost (`cost_in_usd_ticks`,
  // handled above) still wins whenever one is present — refusing here is the fallback, not a
  // preference for ignorance.
  const cacheFields = ['cache_read_input_tokens', 'cache_creation_input_tokens'];
  const detailCacheFields = ['cached_tokens', 'cache_write_tokens', 'cache_creation_tokens'];
  const seen = [];
  for (const k of cacheFields) if (Number(u[k]) > 0) seen.push(k + '=' + u[k]);
  for (const k of detailCacheFields) {
    const v = Number((u.prompt_tokens_details || {})[k]);
    if (v > 0) seen.push('prompt_tokens_details.' + k + '=' + v);
  }
  // ── A CACHE-BEARING RECEIPT IS NOW PRICED WHERE THE RATES EXIST (Roman 2026-11-08) ────────
  // The refusal above was correct while this table had no cache rates: pricing a write at the
  // plain input rate UNDERSTATES the bill, and an incomplete calculation presented as a settled
  // charge is worse than an honest hold. But refusing is only right when the rates are missing.
  // Where a model's row carries `cacheWrite`/`cacheRead`, the receipt is priced in full — the
  // same arithmetic api/cplus-editor.js `normalizeUsage` already does:
  //   write tokens are INSIDE prompt_tokens, so they are priced at the write rate INSTEAD of
  //   the input rate, never in addition to it; read tokens likewise at the read rate.
  // A model whose row has no cache rates still HOLDS, with the same wording as before.
  if (seen.length) {
    const probe = rateFor(model);
    const probeRate = probe ? probe(anthroInTok(u)) : null;
    const haveCacheRates = !!(probeRate
      && typeof probeRate.cacheWrite === 'number' && typeof probeRate.cacheRead === 'number');
    if (!haveCacheRates) {
      return { settled: false, usd: null, holdExposure: true, cacheFieldsSeen: seen,
        why: 'receipt reports cache activity (' + seen.join(', ') + ') and no cache rates are '
          + 'configured for ' + model + '; no authoritative provider cost was supplied, so the '
          + 'amount is UNRESOLVED rather than settled at an incomplete rate' };
    }
  }

  const anthro = Number.isFinite(u.input_tokens) && Number.isFinite(u.output_tokens);
  const openai = Number.isFinite(u.prompt_tokens) && Number.isFinite(u.completion_tokens);
  if (!anthro && !openai) return { settled: false, why: 'usage lacks token counts', usd: null };
  const inTok = anthro ? u.input_tokens : u.prompt_tokens;
  let outTok = anthro ? u.output_tokens : u.completion_tokens;
  let reasoning = 0, reasoningOutside = false;
  if (openai) {
    reasoning = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0;
    reasoningOutside = Number.isFinite(u.total_tokens)
      && (u.total_tokens - u.prompt_tokens - u.completion_tokens) === reasoning && reasoning > 0;
    if (reasoningOutside) outTok += reasoning;
  }
  const rateFn = rateFor(model);
  if (!rateFn) return { settled: false, why: 'no rate for model ' + model, usd: null,
    inTok, outTok, holdExposure: true };
  const r = rateFn(inTok);
  // ── THE CACHE SPLIT, where the model's row supplies rates for it ──────────────────────────
  // Writes and reads are PORTIONS OF prompt_tokens, so each is priced at its own rate instead
  // of the input rate. Anthropic reports them as top-level fields, OpenAI inside
  // prompt_tokens_details; both shapes are read so neither provider is silently mispriced.
  const det = u.prompt_tokens_details || {};
  const cachedIn = Number(det.cached_tokens) > 0 ? Number(det.cached_tokens)
    : (Number(u.cache_read_input_tokens) > 0 ? Number(u.cache_read_input_tokens) : 0);
  const cacheWrite = Number(det.cache_write_tokens) > 0 ? Number(det.cache_write_tokens)
    : (Number(det.cache_creation_tokens) > 0 ? Number(det.cache_creation_tokens)
      : (Number(u.cache_creation_input_tokens) > 0 ? Number(u.cache_creation_input_tokens) : 0));
  const hasCacheRates = typeof r.cacheWrite === 'number' && typeof r.cacheRead === 'number';
  const plainIn = Math.max(0, inTok - cachedIn - cacheWrite);
  const inputUsd = hasCacheRates
    ? (plainIn * r.in + cacheWrite * r.cacheWrite + cachedIn * r.cacheRead)
    : (inTok * r.in);
  return { settled: true, source: 'usage_derived', usd: inputUsd + outTok * r.out,
    inTok, outTok, reasoning, reasoningOutside, tier: r.tier, rate: r,
    // STATED ON THE ROW so a ledger line can say how the input was priced without re-deriving
    // it, and so a cache SAVING is never claimed where none occurred.
    plainInTok: plainIn, cachedInTok: cachedIn, cacheWriteTok: cacheWrite,
    cacheBasis: hasCacheRates
      ? ('writes at the published write rate, reads at '
         + (r.cacheReadIsInputRate
            ? 'the FULL INPUT RATE (no read discount is published for this model, so this settles HIGH)'
            : 'the published read rate')
         + (cachedIn === 0 ? ' — NOTE: this receipt read NOTHING from cache' : ''))
      : 'no cache rates configured for this model; all input priced as plain input' };
}

// prompt_tokens / input_tokens, whichever this provider reports — needed before the full
// normalisation below so the cache-rate probe can call a prompt-length-tiered rate function.
function anthroInTok(u) {
  const a = Number(u && u.input_tokens);
  if (Number.isFinite(a)) return a;
  const o = Number(u && u.prompt_tokens);
  return Number.isFinite(o) ? o : 0;
}

// ── THE ALLOWANCE, RECONCILED ─────────────────────────────────────────────────────────────
// settled      — charges computed from real usage (or the provider's own cost field)
// estimated    — pre-dispatch reservations for calls that returned NO usable receipt
// heldUnknown  — dispatches whose outcome is unknown (no response, unpriceable model). HELD, so
//                the allowance is never credited back for a call that may have billed.
// ── ONE CUMULATIVE LEDGER (Roman 2026-11-08) ──────────────────────────────────────────────
// `prior` carries the position this run INHERITS: charges already calculated from earlier runs'
// receipts, and holds from earlier runs that were never resolved. Without it, each run reported
// its own ceiling and its own remainder as if it were the whole story — which is exactly how
// "remaining $2.148630" came to be quoted for a story that had already spent $1.5.
//
// The ceiling passed in is the REMAINING admission allowance for THIS run. The prior figures are
// reported alongside it so the cumulative position is visible, and they are NOT subtracted twice.
export function makeSettlement(ceilingUsd, prior) {
  const rows = [];
  const PRIOR = { calculated: Number((prior && prior.calculated) || 0),
    held: Number((prior && prior.held) || 0),
    note: (prior && prior.note) || null };
  return {
    get rows() { return rows.slice(); },
    get prior() { return Object.assign({}, PRIOR); },
    record({ stage, model, estimate, usage, noResponse, why, fallback }) {
      if (fallback && Array.isArray(fallback.attempts) && fallback.attempts.length <= 2
          && fallback.attempts.every(a => (a.knownCostUsd === null || (Number.isFinite(a.knownCostUsd) && a.knownCostUsd >= 0)) && Number.isFinite(a.heldUsd) && a.heldUsd >= 0)) {
        let known = 0, held = 0;
        for (const [index, attempt] of fallback.attempts.entries()) {
          if (attempt.knownCostUsd !== null) {
            known += attempt.knownCostUsd;
            rows.push({stage:stage + ':attempt' + (index + 1), model:attempt.model, kind:'settled', usd:attempt.knownCostUsd, source:'server_provider_usage', detail:attempt});
          }
          if (attempt.heldUsd > 0) {
            held += attempt.heldUsd;
            rows.push({stage:stage + ':attempt' + (index + 1), model:attempt.model, kind:'heldUnknown', usd:null, estimate:attempt.heldUsd, why:attempt.reason || 'missing receipt'});
          }
        }
        return {stage,model:fallback.servedModel || model,kind:held > 0 ? 'heldUnknown' : 'settled',usd:known,heldUsd:held,attempts:fallback.attempts};
      }
      if (noResponse) {
        rows.push({ stage, model, kind: 'heldUnknown', usd: null, estimate, why: why || 'no response' });
        return rows[rows.length - 1];
      }
      const s = settle(usage, model);
      rows.push(s.settled
        ? { stage, model, kind: 'settled', usd: s.usd, source: s.source, detail: s }
        : { stage, model, kind: s.holdExposure ? 'heldUnknown' : 'estimated',
            usd: null, estimate, why: s.why,
            // CARRIED ON THE ROW so a ledger line can state WHY without re-deriving it. A row
            // that is held for cache activity must be distinguishable from one held because no
            // usage came back at all — those are different facts about the same dollar.
            usageReceived: !!usage,
            cacheFieldsSeen: s.cacheFieldsSeen || null });
      return rows[rows.length - 1];
    },
    totals() {
      const sum = (k) => rows.filter((r) => r.kind === k)
        .reduce((n, r) => n + (r.kind === 'settled' ? r.usd : (r.estimate || 0)), 0);
      const settled = sum('settled'), estimated = sum('estimated'), heldUnknown = sum('heldUnknown');
      return { ceilingUsd, settled, estimated, heldUnknown,
        committed: settled + estimated + heldUnknown,
        remaining: ceilingUsd - (settled + estimated + heldUnknown),
        // THE CUMULATIVE VIEW, carried forward rather than recomputed per run.
        prior: Object.assign({}, PRIOR),
        cumulativeCalculated: PRIOR.calculated + settled,
        cumulativeHeld: PRIOR.held + heldUnknown,
        counts: { settled: rows.filter((r) => r.kind === 'settled').length,
          estimated: rows.filter((r) => r.kind === 'estimated').length,
          heldUnknown: rows.filter((r) => r.kind === 'heldUnknown').length } };
    },
    report(say) {
      const t = this.totals();
      say('\nSETTLEMENT');
      say('  SETTLED from real usage : $' + t.settled.toFixed(6) + '  (' + t.counts.settled + ' calls)');
      say('  ESTIMATED, no receipt   : $' + t.estimated.toFixed(6) + '  (' + t.counts.estimated + ' calls)');
      say('  HELD, outcome unknown   : $' + t.heldUnknown.toFixed(6) + '  (' + t.counts.heldUnknown + ' calls)');
      say('  committed against the allowance: $' + t.committed.toFixed(6) + ' of $' + t.ceilingUsd.toFixed(6));
      say('  REMAINING               : $' + t.remaining.toFixed(6));
      if (t.prior.calculated > 0 || t.prior.held > 0) {
        say('\n  CUMULATIVE, carried forward from earlier runs:');
        say('    prior calculated charges : $' + t.prior.calculated.toFixed(6));
        say('    prior unresolved holds   : $' + t.prior.held.toFixed(6));
        if (t.prior.note) say('    ' + t.prior.note);
        say('    CUMULATIVE calculated    : $' + t.cumulativeCalculated.toFixed(6));
        say('    CUMULATIVE held          : $' + t.cumulativeHeld.toFixed(6));
      }
      if (t.estimated > 0 || t.heldUnknown > 0) {
        say('  NOTE: only the SETTLED figure is a charge. The other two are reservations, and the');
        say('        held amount is never credited back — a dispatch with no receipt may have billed.');
      }
      return t;
    },
  };
}

// Standalone control — no network.
if (import.meta.url === `file://${process.argv[1]}`) {
  const t = (n, c, d) => console.log('  ' + (c ? '✓' : '✗') + ' ' + n + (c ? '' : '  — ' + d));
  console.log('COST SETTLEMENT CONTROL (no network, $0)\n');
  // Anthropic, above the 100k tier — the tier this test's packets land in.
  const h = settle({ input_tokens: 165000, output_tokens: 4200 }, 'claude-haiku-5-5');
  t('Haiku 165k/4.2k settles at the >100k tier', h.settled && h.tier === '>100k', JSON.stringify(h));
  t('  = $' + h.usd.toFixed(6), Math.abs(h.usd - (165000 * 0.5e-6 + 4200 * 2.5e-6)) < 1e-9, String(h.usd));
  const hLow = settle({ input_tokens: 40000, output_tokens: 1000 }, 'claude-haiku-5-5');
  t('the SAME model prices differently below 100k input', hLow.tier === '<=100k', JSON.stringify(hLow));
  // Sol
  const s = settle({ prompt_tokens: 91540, completion_tokens: 1200, total_tokens: 93020,
    completion_tokens_details: { reasoning_tokens: 280 } }, 'gpt-6.1-sol');
  t('Sol settles, and reasoning OUTSIDE completion is added once',
    s.settled && s.reasoningOutside && s.outTok === 1480, JSON.stringify(s));
  // xAI provider field still wins
  const x = settle({ cost_in_usd_ticks: 89793500 }, 'grok-4.3');
  t('an xAI cost field still wins over arithmetic',
    x.settled && Math.abs(x.usd - 0.00897935) < 1e-9, JSON.stringify(x));
  // refusals
  t('no usage = not settled', settle(null, 'claude-haiku-5-5').settled === false, '');
  const noRate = settle({ input_tokens: 10, output_tokens: 10 }, 'some-unpriced-model');
  t('an unpriced model is HELD, not settled and not free',
    noRate.settled === false && noRate.holdExposure === true, JSON.stringify(noRate));
  // allowance reconciliation
  const st = makeSettlement(3.0);
  st.record({ stage: 'author', model: 'claude-haiku-5-5', estimate: 0.14,
    usage: { input_tokens: 165000, output_tokens: 4200 } });
  st.record({ stage: 'background', model: 'grok-4.3', estimate: 0.01, usage: null });
  st.record({ stage: 'author', model: 'claude-haiku-5-5', estimate: 0.14, noResponse: true, why: 'ECONNRESET' });
  const tot = st.totals();
  t('the allowance is settled + estimated + held, and held is not credited back',
    tot.counts.settled === 1 && tot.counts.estimated === 1 && tot.counts.heldUnknown === 1
      && Math.abs(tot.remaining - (3.0 - (tot.settled + 0.01 + 0.14))) < 1e-9, JSON.stringify(tot));
  st.report((m) => console.log(m));

  // ══ THE LUNA ROW AND THE CACHE-AWARE CALCULATION (added 2026-11-08) ══════════════════════
  console.log('\nLUNA, WITH CACHE RATES');
  // THE REAL RECEIPT from the preserved run, scene 2 (r28). Pasted verbatim rather than
  // recomputed, so this control is anchored to a receipt that actually billed.
  const R28 = { prompt_tokens: 108795, completion_tokens: 10255, total_tokens: 119050,
    prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 108792, audio_tokens: 0 },
    completion_tokens_details: { reasoning_tokens: 8569, audio_tokens: 0,
      accepted_prediction_tokens: 0, rejected_prediction_tokens: 0 } };
  const L = settle(R28, 'gpt-6-luna');
  t('a cache-bearing Luna receipt now SETTLES instead of being held',
    L.settled === true && L.usd > 0, JSON.stringify(L));
  // Writes priced at the write rate INSTEAD of input; reasoning already inside completion.
  const expect28 = 108792 * 1.25e-7 + 3 * 1.0e-7 + 10255 * 5.0e-7;
  t('  = $' + L.usd.toFixed(6) + ' — writes at 1.25x input, reasoning NOT added twice',
    Math.abs(L.usd - expect28) < 1e-9, L.usd + ' vs ' + expect28);
  t('  reasoning is INSIDE completion on this family, so outTok stays completion_tokens',
    L.outTok === 10255 && L.reasoningOutside === false, JSON.stringify({ out: L.outTok }));
  t('  the input split is stated, so a cache saving is never implied where none happened',
    L.cacheWriteTok === 108792 && L.cachedInTok === 0
      && /read NOTHING from cache/.test(L.cacheBasis), L.cacheBasis);
  // A write priced as plain input would UNDERSTATE the bill — the reason the old code refused.
  const naive = 108795 * 1.0e-7 + 10255 * 5.0e-7;
  t('  and pricing writes as plain input WOULD have understated it by $'
    + (L.usd - naive).toFixed(6), L.usd > naive, String(L.usd - naive));
  // A cache READ must be cheaper than plain input, or the read rate is not being applied.
  const withRead = settle({ prompt_tokens: 100000, completion_tokens: 1000,
    prompt_tokens_details: { cached_tokens: 90000, cache_write_tokens: 0 } }, 'gpt-6-luna');
  const allPlain = settle({ prompt_tokens: 100000, completion_tokens: 1000 }, 'gpt-6-luna');
  t('a receipt that READS from cache settles cheaper than the same tokens as plain input',
    withRead.settled && allPlain.settled && withRead.usd < allPlain.usd,
    JSON.stringify({ read: withRead.usd, plain: allPlain.usd }));
  // A model with NO cache rates still holds, exactly as before — the refusal was right there.
  const anthroCache = settle({ input_tokens: 120000, output_tokens: 2000,
    cache_creation_input_tokens: 119000 }, 'claude-haiku-5-5');
  t('a cache-bearing receipt for a model with NO cache rates is still HELD, not settled at an '
    + 'incomplete rate',
    anthroCache.settled === false && anthroCache.holdExposure === true
      && /no cache rates are configured/.test(anthroCache.why), JSON.stringify(anthroCache));
  // And an unknown model is still held.
  t('an unpriced model is still HELD even with a clean receipt',
    settle({ prompt_tokens: 10, completion_tokens: 10 }, 'nope').holdExposure === true, '');

  // ── THE SIXTEEN PAID LUNA CALLS, RECONCILED ────────────────────────────────────────────────
  // The whole point of the row: the calls that were held as unknown now settle. Read from the
  // preserved bundle if it is present, so this control reconciles the real history rather than
  // asserting it would.
  try {
    const fsx = await import('node:fs');
    const BD = '/Users/romantsukerman/storybound-diag/_preserved/'
      + 'ISSUE1_LIRAEL_18SCENE_2026-11-08/runs/run_2026-11-07T08-00-27-375Z_24441';
    if (fsx.existsSync(BD)) {
      let n = 0, usd = 0, held = 0;
      for (const f of fsx.readdirSync(BD)) {
        if (!/^response_r\d+_PRIMARY_AUTHOR_200\.json$/.test(f)) continue;
        const d = JSON.parse(fsx.readFileSync(BD + '/' + f, 'utf8'));
        if (d.servedModel !== 'gpt-6-luna' || !d.receipt) continue;
        const r = settle(d.receipt, 'gpt-6-luna');
        if (r.settled) { n++; usd += r.usd; } else held++;
      }
      // THE ASSERTION IS "NONE STILL HELD", not a count I guessed. It is 34, not the 16 prose
      // calls: PRIMARY_AUTHOR also carries the integration pass and other Luna operations in
      // that run. Pinning 16 would have been asserting my own expectation over the data.
      t('every saved Luna receipt in the preserved bundle now settles — ' + n + ' calls, $'
        + usd.toFixed(6) + ', none held',
        n > 0 && held === 0, JSON.stringify({ settled: n, stillHeld: held }));
    } else {
      console.log('  — preserved bundle not present; skipped the historical reconciliation');
    }
  } catch (e) { console.log('  — historical reconciliation skipped: ' + e.message); }
}
