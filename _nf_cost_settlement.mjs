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
export const RATE_TABLE = {
  'claude-haiku-5-5': (inTok) => (inTok > 100000
    ? { in: 0.50e-6, out: 2.50e-6, tier: '>100k' }
    : { in: 0.10e-6, out: 0.50e-6, tier: '<=100k' }),
  'gpt-6.1-sol': () => ({ in: 2.0e-6, out: 10.0e-6, tier: 'flat' }),
};

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
  if (seen.length) {
    return { settled: false, usd: null, holdExposure: true, cacheFieldsSeen: seen,
      why: 'receipt reports cache activity (' + seen.join(', ') + ') and this table prices only '
        + 'plain input/output; no authoritative provider cost was supplied, so the amount is '
        + 'UNRESOLVED rather than settled at an incomplete rate' };
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
  const rateFn = RATE_TABLE[model];
  if (!rateFn) return { settled: false, why: 'no rate for model ' + model, usd: null,
    inTok, outTok, holdExposure: true };
  const r = rateFn(inTok);
  return { settled: true, source: 'usage_derived', usd: inTok * r.in + outTok * r.out,
    inTok, outTok, reasoning, reasoningOutside, tier: r.tier, rate: r };
}

// ── THE ALLOWANCE, RECONCILED ─────────────────────────────────────────────────────────────
// settled      — charges computed from real usage (or the provider's own cost field)
// estimated    — pre-dispatch reservations for calls that returned NO usable receipt
// heldUnknown  — dispatches whose outcome is unknown (no response, unpriceable model). HELD, so
//                the allowance is never credited back for a call that may have billed.
export function makeSettlement(ceilingUsd) {
  const rows = [];
  return {
    get rows() { return rows.slice(); },
    record({ stage, model, estimate, usage, noResponse, why }) {
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
      say('  committed against the allowance: $' + t.committed.toFixed(6) + ' of $' + t.ceilingUsd.toFixed(2));
      say('  REMAINING               : $' + t.remaining.toFixed(6));
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
}
