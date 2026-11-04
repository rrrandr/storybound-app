import { createClient as sbCreateClient } from '@supabase/supabase-js';

/**
 * THE CHARACTER+ EDITOR'S ONLY DOOR TO A PROVIDER.
 *
 * Every spending protection the client used during the experiments — a module-scope position
 * counter, a per-tab allowance, a boolean activation flag — protects nothing. A reload resets it,
 * a second tab doubles it, and anyone can edit it. So the editor does NOT go through /api/proxy,
 * which performs no user authentication at all. It comes here, where:
 *
 *   · THE ACCOUNT COMES FROM THE SESSION TOKEN, never from the body.
 *   · ENTITLEMENT IS CHECKED: the account must own the story. A correctly-formatted operation id
 *     proves only that the client can format an id.
 *   · QUOTA AND RESERVATION ARE ATOMIC. One SQL function takes a per-account advisory lock,
 *     counts the 24h window and inserts the reservation in a single transaction. The earlier
 *     count-then-insert pair raced: two requests with DIFFERENT operation ids could both take the
 *     last free slot, and the unique key did nothing about it.
 *   · A PRICED USD RESERVATION IS PERSISTED BEFORE FORWARDING, and retained on any unknown
 *     outcome. The earlier version stored a status and a Fortune price and called that a
 *     reservation; there was no monetary amount in it anywhere.
 *   · USAGE IS STRICTLY VALIDATED, never coerced. `Number(null)` is 0, which would have turned a
 *     missing usage block into a free call.
 *   · REASONING TOKENS ARE BILLED. Grok reports them separately and charges them as output;
 *     pricing completion_tokens alone under-reports every reasoning call.
 *   · THE MODEL IS PINNED HERE. The client cannot choose it, override it, or ask for a fallback.
 *   · THE SPENDING POLICY MUST BE CONFIGURED. Without it this route refuses.
 *
 * WHAT IS DELIBERATELY ABSENT: any default allowance. The $0.23 figure from the bounded
 * experiments was an experiment ceiling, not a production policy, and the 0F/60-per-day figures
 * are a PROPOSAL I made, not an approved policy. With the env vars unset this route returns 503
 * policy_not_configured and the feature stays inert, which is the correct state until the price
 * is actually decided.
 */

// ── SERVER-PINNED MODEL. Not a default, not a preference, not overridable. ────────────────────
const EDITOR_MODEL = 'grok-4.3';
const XAI_URL = 'https://api.x.ai/v1/chat/completions';

// Verified rates (USD per token) for the pinned model.
const RATE_IN = 1.25e-6;
const RATE_OUT = 2.5e-6;

// Reservation arithmetic, matching EssentialBeatCheck.ebReserveUsd so the quote the client sees
// and the amount the server holds are computed the same way.
const CHARS_PER_TOKEN = 4.0;
const REASONING_MULT = 1.5;
const SAFETY_MARGIN = 1.2;

// Hard structural bounds. Not a spending policy — they stop a malformed or hostile request from
// becoming an expensive one even once a policy IS configured.
const MAX_INPUT_CHARS = 120000;
const MAX_OUTPUT_TOKENS = 2400;
const UPSTREAM_TIMEOUT_MS = 120000;

/**
 * THE ADMISSION DECISION, AS A PURE FUNCTION.
 * Every refusal is a decision about whether this request may cost money, and each is checked
 * BEFORE any IO. The ordering here is the security property, not an implementation detail.
 */
export function editorAdmission(input) {
  const { env = {}, accountId = null, body = {} } = input || {};

  // ── 0. THE KILL SWITCH ────────────────────────────────────────────────────────────────────
  // CPLUS_EDITOR_ENABLED=false (or 0/off/no) turns editor dispatch off AT THE SERVER, with no
  // redeploy and no code change. It stops only this feature: story generation is untouched, and
  // NOTHING in cplus_editor_operations or cplus_editor_story_claims is deleted or altered — the
  // accounting records and the story claims survive, so turning it back on resumes cleanly and
  // the audit trail stays intact. Checked before the policy gate so it works whatever else is
  // configured. (Setting CPLUS_EDITOR_DAILY_CAP=0 also refuses every pass, but as a side effect
  // of the quota; this flag states the intent.)
  const enabled = String(env.CPLUS_EDITOR_ENABLED == null ? 'true' : env.CPLUS_EDITOR_ENABLED)
    .trim().toLowerCase();
  if (enabled === 'false' || enabled === '0' || enabled === 'off' || enabled === 'no') {
    return { ok: false, status: 503, error: 'feature_disabled',
      detail: 'CPLUS_EDITOR_ENABLED is off. Editor dispatch is disabled; story generation is '
        + 'unaffected and no accounting record was changed.' };
  }

  // 1. POLICY, so an unconfigured deployment cannot be probed into spending.
  const priceRaw = env.CPLUS_EDITOR_PRICE_FORTUNES;
  if (priceRaw == null || priceRaw === '') {
    return { ok: false, status: 503, error: 'policy_not_configured',
      detail: 'CPLUS_EDITOR_PRICE_FORTUNES is unset. The Character+ editor has no approved '
        + 'production spending policy, so this route refuses rather than invent an allowance.' };
  }
  const priceFortunes = Number(priceRaw);
  if (!Number.isFinite(priceFortunes) || priceFortunes < 0) {
    return { ok: false, status: 500, error: 'policy_invalid',
      detail: 'CPLUS_EDITOR_PRICE_FORTUNES must be a non-negative number' };
  }
  const capRaw = env.CPLUS_EDITOR_DAILY_CAP;
  if (capRaw == null || capRaw === '') {
    return { ok: false, status: 503, error: 'policy_not_configured',
      detail: 'CPLUS_EDITOR_DAILY_CAP is unset. A price without a volume cap is not a policy.' };
  }
  const dailyCap = Number(capRaw);
  if (!Number.isInteger(dailyCap) || dailyCap < 0) {
    return { ok: false, status: 500, error: 'policy_invalid',
      detail: 'CPLUS_EDITOR_DAILY_CAP must be a non-negative integer' };
  }

  // 2. IDENTITY, from the verified session.
  if (!accountId) return { ok: false, status: 401, error: 'authentication_required' };
  if (body.userId && String(body.userId) !== String(accountId)) {
    return { ok: false, status: 409, error: 'identity_mismatch',
      detail: 'the body names a different account than the session' };
  }

  // 3. SCOPE. Idempotency is only meaningful if the operation names what it is paying for.
  const { operationId, storyId, scene, revisionId, system, user, maxTokens } = body;
  if (!operationId || typeof operationId !== 'string') {
    return { ok: false, status: 400, error: 'operation_id_required',
      detail: 'without an operation id a retry is a second charge' };
  }
  if (!storyId || scene == null || !revisionId) {
    return { ok: false, status: 400, error: 'operation_scope_required',
      detail: 'storyId, scene and revisionId identify the pass and bind its idempotency' };
  }
  // THE SPELLING OF THE ID IS NOT AN ENTITLEMENT. This only rejects an id pointed at different
  // work than the request describes; whether the account may spend on this STORY is checked
  // against the stories table inside cplus_editor_admit, not here.
  const expectedOperationId = ['cplus-editor', String(accountId), String(storyId),
    'scene' + String(scene), String(revisionId)].join(':');
  if (operationId !== expectedOperationId) {
    return { ok: false, status: 409, error: 'operation_mismatch',
      detail: 'the operation id does not describe this account, story, scene and revision' };
  }

  // 4. SHAPE AND HARD BOUNDS.
  if (typeof system !== 'string' || typeof user !== 'string' || !system.trim() || !user.trim()) {
    return { ok: false, status: 400, error: 'request_required' };
  }
  if ((system.length + user.length) > MAX_INPUT_CHARS) {
    return { ok: false, status: 413, error: 'request_too_large',
      detail: `assembled request is ${system.length + user.length} chars; the cap is ${MAX_INPUT_CHARS}` };
  }

  const outCap = Math.min(MAX_OUTPUT_TOKENS, Math.max(600, Number(maxTokens) || 1200));
  return { ok: true, priceFortunes, dailyCap, expectedOperationId,
    model: EDITOR_MODEL, outCap,
    // THE RESERVATION, priced from the request we are actually about to send. Reasoning output is
    // billed as output by this provider, so the ceiling assumes it.
    reservedUsd: reserveUsd(system.length + user.length, outCap) };
}

export function reserveUsd(inputChars, outCap) {
  const inTok = Math.ceil(inputChars / CHARS_PER_TOKEN);
  const outTok = Math.ceil(outCap * REASONING_MULT);
  return (inTok * RATE_IN + outTok * RATE_OUT) * SAFETY_MARGIN;
}

/**
 * STRICT USAGE VALIDATION — no coercion, and reasoning tokens counted.
 *
 * `Number(null)` is 0, so coercing a missing usage block produced a $0.00 call that looked
 * settled. A usage block is either complete and finite or it is UNKNOWN, and an unknown outcome
 * retains its reservation.
 *
 * REASONING: this provider reports `completion_tokens_details.reasoning_tokens` and bills them as
 * output. The established normalization is to trust the arithmetic rather than the field names —
 * when total − prompt exceeds completion, the difference is reasoning that completion omitted.
 */
export function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return { ok: false, why: 'no usage block in the provider response' };
  }
  const pick = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0) ? v : null;
  const inTok = pick(usage.prompt_tokens);
  const completion = pick(usage.completion_tokens);
  if (inTok === null || completion === null) {
    return { ok: false, why: 'prompt_tokens or completion_tokens is missing or not a finite '
      + 'number — the call is UNRESOLVED, not free' };
  }
  const total = pick(usage.total_tokens);
  const reported = pick(usage.completion_tokens_details
    && usage.completion_tokens_details.reasoning_tokens);
  let reasoning = reported === null ? 0 : reported;
  let basis = reported === null ? 'completion_tokens only (no reasoning reported)'
    : 'completion_tokens + reported reasoning_tokens';
  if (total !== null) {
    const impliedOut = total - inTok;
    if (impliedOut >= completion) {
      const gap = impliedOut - completion;
      // The provider's own total is authoritative: whatever it bills beyond completion is
      // reasoning that completion did not include.
      if (gap > reasoning) {
        reasoning = gap;
        basis = 'completion_tokens + (total − prompt − completion) as reasoning';
      }
    } else {
      return { ok: false, why: `incoherent usage: total ${total} < prompt ${inTok} + completion `
        + `${completion}` };
    }
  }
  const outTok = completion + reasoning;
  return { ok: true, inTok, outTok, completion, reasoning, basis,
    usd: inTok * RATE_IN + outTok * RATE_OUT };
}

// ── THE HANDLER, WITH ITS IO INJECTABLE SO THE REAL THING CAN BE EXERCISED ───────────────────
// The integration suite runs THIS function with a fake database and fetch, so the admission
// sequence, the settlement writes and the replay path are executed rather than grepped for.
export function createHandler(deps = {}) {
  const createClient = deps.createClient || sbCreateClient;
  const doFetch = deps.fetch || ((...a) => globalThis.fetch(...a));
  const env = deps.env || process.env;
  const log = deps.log || console;

  return async function handler(req, res) {
    const origin = (req.headers && req.headers.origin) || '';
    const allowedOrigin = origin === 'https://storybound.love'
      || origin === 'https://www.storybound.love'
      || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    // POLICY GATE, before any IO at all.
    // KILL SWITCH AND POLICY GATE, before any IO.
    {
      const pre = editorAdmission({ env, accountId: 'unknown', body: {} });
      if (!pre.ok && (pre.error === 'feature_disabled' || pre.error === 'policy_not_configured'
        || pre.error === 'policy_invalid')) {
        return res.status(pre.status).json({ error: pre.error, detail: pre.detail });
      }
    }

    const sbUrl = env.SUPABASE_URL;
    const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const xaiKey = env.XAI_API_KEY || env.GROK_API_KEY;
    if (!sbUrl || !sbKey) return res.status(500).json({ error: 'server_not_configured' });
    if (!xaiKey) return res.status(500).json({ error: 'provider_not_configured' });

    // THE ACCOUNT COMES FROM THE TOKEN.
    const auth = (req.headers && req.headers.authorization) || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'authentication_required' });
    const authClient = createClient(sbUrl, env.SUPABASE_ANON_KEY || sbKey);
    const { data: authData, error: authErr } = await authClient.auth.getUser(token);
    const accountId = authData && authData.user && authData.user.id;
    if (authErr || !accountId) return res.status(401).json({ error: 'invalid_session' });

    const verdict = editorAdmission({ env, accountId, body: req.body || {} });
    if (!verdict.ok) {
      log.warn(`[cplus-editor] refused ${verdict.error} (session=${accountId})`);
      return res.status(verdict.status).json({ error: verdict.error, detail: verdict.detail });
    }
    const { operationId, storyId, scene, revisionId, system, user, obligations } = req.body || {};
    const { priceFortunes, dailyCap, outCap, reservedUsd } = verdict;

    const supabase = createClient(sbUrl, sbKey);

    // ── ATOMIC ADMISSION: entitlement, quota and the priced reservation, in one transaction ──
    const { data: admitData, error: admitErr } = await supabase.rpc('cplus_editor_admit', {
      p_operation_id: operationId, p_account_id: accountId, p_story_id: String(storyId),
      p_scene: Number(scene), p_revision_id: String(revisionId), p_model: EDITOR_MODEL,
      p_obligations: Array.isArray(obligations) ? obligations : null,
      p_price_fortunes: priceFortunes, p_reserved_usd: reservedUsd, p_daily_cap: dailyCap
    });
    if (admitErr) {
      log.error('[cplus-editor] admission failed:', admitErr.message);
      return res.status(500).json({ error: 'admission_unavailable' });
    }
    const adm = Array.isArray(admitData) ? admitData[0] : admitData;
    if (!adm || !adm.outcome) return res.status(500).json({ error: 'admission_unavailable' });

    if (adm.outcome === 'replay') {
      // THE WHOLE STORED OUTCOME, truncation flag and status included. Omitting truncated let a
      // replayed partial reply look complete.
      return res.status(200).json({ ok: adm.existing_status === 'settled', replayed: true,
        status: adm.existing_status, content: adm.existing_reply || null,
        truncated: adm.existing_truncated === true,
        usage: { prompt_tokens: adm.existing_usage_in, completion_tokens: adm.existing_usage_out },
        costUsd: adm.existing_cost_usd, chargedFortunes: adm.existing_charged,
        detail: adm.detail || null });
    }
    if (adm.outcome === 'mismatch') return res.status(409).json({ error: 'operation_mismatch' });
    if (adm.outcome === 'forbidden') {
      return res.status(403).json({ error: 'not_entitled', detail: adm.detail,
        entitlement: adm.entitlement || null });
    }
    if (adm.outcome === 'capped') {
      return res.status(429).json({ error: 'daily_cap_reached', detail: adm.detail,
        cap: dailyCap, usedToday: adm.used_today });
    }
    if (adm.outcome !== 'admitted') {
      return res.status(500).json({ error: 'admission_unexpected', detail: String(adm.outcome) });
    }

    // ── CHARGE, through the existing authenticated wallet. 0 is a configured policy: no charge. ─
    let charged = 0;
    if (priceFortunes > 0) {
      const { data: chargeResult, error: chargeErr } = await supabase
        .rpc('consume_fortunes_v3', {
          p_operation_id: operationId, p_user_id: accountId, p_amount: priceFortunes,
          p_context: 'cplus_editor', p_story_id: String(storyId), p_scene_idx: Number(scene),
          p_metadata: { model: EDITOR_MODEL, revision: String(revisionId) }
        });
      const r = Array.isArray(chargeResult) ? chargeResult[0] : chargeResult;
      if (chargeErr || !r || r.ok === false) {
        await supabase.from('cplus_editor_operations').update({ status: 'refused',
          retained_usd: 0,
          refusal: (r && r.source) || (chargeErr && chargeErr.message) || 'charge_failed'
        }).eq('operation_id', operationId);
        return res.status(402).json({ error: 'insufficient_fortunes',
          detail: (r && r.source) || 'the wallet refused this pass', charged: 0 });
      }
      charged = priceFortunes;
    }

    // ── ONE UPSTREAM CALL. No fallback chain, no retry, no second model. ─────────────────────
    let status = 0, body = null, failure = null;
    const t0 = Date.now();
    try {
      const upstream = await doFetch(XAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiKey}` },
        body: JSON.stringify({ model: EDITOR_MODEL, max_tokens: outCap,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
      status = upstream.status;
      body = await upstream.json().catch(() => null);
    } catch (e) {
      failure = String((e && e.message) || e);
    }
    const ms = Date.now() - t0;

    const choice = body && body.choices && body.choices[0];
    const content = (choice && choice.message && choice.message.content) || null;
    const truncated = !!(choice && choice.finish_reason === 'length');
    const u = normalizeUsage(body && body.usage);
    const settled = status === 200 && !!content && u.ok;

    // ── SETTLE. An unknown outcome RETAINS the priced reservation. ───────────────────────────
    const { error: setErr } = await supabase.from('cplus_editor_operations').update({
      status: settled ? 'settled' : 'unresolved',
      reply: content, truncated,
      usage_in: u.ok ? u.inTok : null,
      usage_out: u.ok ? u.outTok : null,
      usage_reasoning: u.ok ? u.reasoning : null,
      cost_usd: u.ok ? u.usd : null,
      cost_basis: u.ok ? u.basis : null,
      charged_fortunes: charged,
      // Settled → nothing retained. Unresolved → the full reservation stays held, because an
      // exposure that disappears from the ledger is an unmeasured one.
      retained_usd: settled ? 0 : reservedUsd,
      http_status: status, latency_ms: ms,
      refusal: settled ? null : (failure || u.why || `status ${status}`
        + (content ? '' : ', no content'))
    }).eq('operation_id', operationId);

    // A SETTLEMENT WRITE THAT FAILED IS NOT A SETTLED CALL. Saying nothing here would leave the
    // row 'reserved' forever while the caller believed the pass was accounted for.
    if (setErr) {
      log.error(`[cplus-editor] SETTLEMENT WRITE FAILED op=${operationId}: ${setErr.message} `
        + `— the row remains 'reserved' and its $${reservedUsd.toFixed(6)} stays retained`);
      return res.status(500).json({ ok: false, error: 'settlement_write_failed',
        detail: setErr.message, retainedUsd: reservedUsd, retryable: false,
        // The content is returned anyway when we have it: the money was spent either way, and
        // discarding a good reply because the bookkeeping write failed wastes it twice.
        content: settled ? content : null, truncated });
    }

    if (!settled) {
      log.warn(`[cplus-editor] unresolved op=${operationId} status=${status} `
        + `${failure || u.why || ''} — $${reservedUsd.toFixed(6)} retained`);
      return res.status(status >= 400 ? status : 502).json({
        ok: false, status, error: 'editor_unresolved',
        detail: failure || u.why || null, truncated,
        chargedFortunes: charged, retainedUsd: reservedUsd,
        retryable: false      // the caller publishes the original prose; it never retries
      });
    }
    return res.status(200).json({ ok: true, content, truncated,
      // 'authoritative' = an existing ownership record named this account.
      // 'registration'  = no record existed and the story id was registered on first contact.
      // Reported distinctly because they are NOT the same guarantee.
      entitlement: adm.entitlement || null,
      usage: { prompt_tokens: u.inTok, completion_tokens: u.completion,
        reasoning_tokens: u.reasoning, billed_output_tokens: u.outTok },
      costUsd: u.usd, costBasis: u.basis, reservedUsd,
      chargedFortunes: charged, model: EDITOR_MODEL, latencyMs: ms });
  };
}

export default createHandler();
