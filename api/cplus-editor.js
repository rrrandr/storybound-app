import { createClient as sbCreateClient } from '@supabase/supabase-js';
import { editionForRequest } from './_edition.js';

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

// ══ SERVER-PINNED MODELS, SELECTED BY DECLARED CONTENT CLASS (Roman 2026-11-04) ══════════════
// gpt-6-luna becomes the C+ repair editor FOR GENERAL PROSE, on the measured comparison: on the
// preserved Sol opening it made the most of the requested repair, used the appearance canon the
// delivery fix had just made available, and cost $0.0035 against grok-4.3's $0.0235.
//
// GROK KEEPS THE EXPLICIT PROSE. `_proseModerationHot` (app.js) exists because a model that
// moderates will refuse or silently soften sexually explicit prose the reader paid to generate —
// which is why the Claude polish path DECLINES rather than edits. The C+ editor REWRITES prose,
// so routing a CARNAL or live-intimacy scene to an OpenAI model would reintroduce exactly that
// harm. Explicit scenes stay on grok-4.3.
//
// THE PIN IS NARROWED, NOT REMOVED, AND THIS IS THE HONEST COST OF IT. The earlier invariant was
// "the client cannot choose the model". It now chooses between TWO server-defined
// configurations by declaring the scene's content class, and it cannot name a model, a provider,
// a rate or an allowance. A client that mis-declares gets the other pinned configuration —
// priced, reserved and capped as that configuration, so a false declaration can make a call more
// expensive but never unpriced. THE FIELD IS REQUIRED: an absent or unrecognized class is
// refused rather than guessed, because guessing wrong on an explicit scene is the one outcome
// this gate exists to prevent.
const EDITOR_CONFIGS = {
  general: {
    model: 'gpt-6-luna',
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    // $0.10 / $0.50 per MTok — developers.openai.com/api/docs/models/gpt-6-luna
    rateIn: 1e-7, rateOut: 5e-7,
    // Chat Completions on a reasoning model: max_tokens is rejected outright.
    capField: 'max_completion_tokens',
    effort: 'medium',
    // ── THE TESTED ALLOWANCE IS DELIVERED, NOT MERELY PERMITTED (Roman 2026-11-04) ───────
    // `editorPassOnFinalizedDraft` asks for max(900, 420 × obligations + 400) — 2,080 for four
    // obligations, a figure sized for a model whose output is all visible prose. Clamping to
    // min(6000, 2080) admitted that 2,080 unchanged, so the 6,000 "cap" delivered nothing: the
    // successful Luna call used 3,984 output tokens and would have been TRUNCATED. On this
    // model reasoning is billed inside completion, so the caller's figure is not an allowance
    // for the same thing. The floor equals the ceiling here: general prose always gets 6,000,
    // and the reservation is computed from what is actually sent.
    floorOutputTokens: 6000,
    maxOutputTokens: 6000,
    // $2.50/MTok for a standard 30-minute cache WRITE — ABOVE the $0.10 input rate, so pricing
    // writes at the input rate understates the bill rather than being conservative.
    // developers.openai.com/api/docs/guides/prompt-caching
    rateCacheWrite: 1.25e-7,
    // $0.01/MTok for a cache READ — a 10x discount on the $0.10 input rate.
    // developers.openai.com/api/docs/models/gpt-6-luna. The saved Luna call had ZERO reads so
    // this changes nothing retrospectively; it matters for every production settlement after it.
    rateCacheRead: 1e-8
  },
  explicit: {
    model: 'grok-4.3',
    url: 'https://api.x.ai/v1/chat/completions',
    keyEnv: 'XAI_API_KEY',
    rateIn: 1.25e-6, rateOut: 2.5e-6,
    capField: 'max_tokens',
    effort: null,
    // GROK'S ALLOWANCE IS UNCHANGED: the caller's figure, floored at 600 and clamped at 2,400,
    // exactly as before this selection existed.
    floorOutputTokens: 600,
    maxOutputTokens: 2400,
    // No published xAI cache-write rate is configured, so writes stay at the input rate and the
    // receipt says so rather than implying a verified figure.
    rateCacheWrite: null,
    rateCacheRead: null
  }
};
// Retained names so every reader of the original comments still resolves. The explicit
// configuration is the incumbent one.
const EDITOR_MODEL = EDITOR_CONFIGS.explicit.model;
const XAI_URL = EDITOR_CONFIGS.explicit.url;
const RATE_IN = EDITOR_CONFIGS.explicit.rateIn;
const RATE_OUT = EDITOR_CONFIGS.explicit.rateOut;

export function editorConfigFor(contentClass) {
  const k = String(contentClass || '');
  return Object.prototype.hasOwnProperty.call(EDITOR_CONFIGS, k) ? EDITOR_CONFIGS[k] : null;
}

// ── THE EDITION DECISION LIVES IN ONE PLACE (Roman 2026-11-08) ─────────────────────────────
// `editionForRequest` is api/_edition.js, imported here and by /api/config, so what a client
// may be SHOWN and what this route will PRODUCE are the same function. It is re-exported for
// the provider-free controls, which assert the gate against this module.
export { editionForRequest, platformForRequest, channelForRequest, deploymentChannel } from './_edition.js';

// Reservation arithmetic, matching EssentialBeatCheck.ebReserveUsd so the quote the client sees
// and the amount the server holds are computed the same way.
const CHARS_PER_TOKEN = 4.0;
const REASONING_MULT = 1.5;
const SAFETY_MARGIN = 1.2;

// Hard structural bounds. Not a spending policy — they stop a malformed or hostile request from
// becoming an expensive one even once a policy IS configured.
const MAX_INPUT_CHARS = 120000;
// Per configuration now (see EDITOR_CONFIGS). The constant is the floor the explicit path keeps.
const MAX_OUTPUT_TOKENS = EDITOR_CONFIGS.explicit.maxOutputTokens;
const UPSTREAM_TIMEOUT_MS = 120000;

/**
 * THE ADMISSION DECISION, AS A PURE FUNCTION.
 * Every refusal is a decision about whether this request may cost money, and each is checked
 * BEFORE any IO. The ordering here is the security property, not an implementation detail.
 */
export function editorAdmission(input) {
  // `origin` is the REQUEST's own Origin header, not a body field — a payload cannot set it, and
  // it is what distinguishes two clients sharing one backend. Absent, `editionForRequest` yields
  // the base edition, which is the safe direction.
  const { env = {}, accountId = null, body = {}, origin = null } = input || {};
  input = input || {};
  input.origin = origin;

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
  // ── THE ID ALSO NAMES THE PASS (Roman 2026-11-07) ───────────────────────────────────────
  // MEASURED: this required strict equality with a 5-part id, while the client appends the PASS
  // MODE — ':craft', ':picturability', ':task:consistency' — because three independently
  // scheduled passes run on ONE draft revision and a shared id made the second and third look
  // like duplicate charges for the first. The result was 22 consecutive HTTP 409
  // operation_mismatch refusals, before any dispatch, reported upstream as empty completions.
  //
  // THE PREFIX IS STILL CHECKED EXACTLY. Account, story, scene and revision must match, so an
  // id pointed at different work is still refused. What is now permitted is a suffix that names
  // WHICH pass — and because the suffix is part of the id, idempotency gets STRONGER, not
  // weaker: a repeat of the SAME pass on the SAME revision still collides and is still refused
  // a second charge, while a different pass is correctly a different operation.
  //
  // A bare 5-part id (no mode) remains valid, so an older client is unaffected.
  const expectedOperationId = ['cplus-editor', String(accountId), String(storyId),
    'scene' + String(scene), String(revisionId)].join(':');
  const _opPassMode = (operationId === expectedOperationId)
    ? null
    : (operationId.startsWith(expectedOperationId + ':')
      ? operationId.slice(expectedOperationId.length + 1) : undefined);
  const _PASS_MODE_RE = /^(?:craft|picturability|task:[a-z0-9_-]{1,40})$/;
  if (_opPassMode === undefined || (_opPassMode !== null && !_PASS_MODE_RE.test(_opPassMode))) {
    return { ok: false, status: 409, error: 'operation_mismatch',
      detail: 'the operation id does not describe this account, story, scene, revision and pass' };
  }

  // ══ 3b. WHICH EDITION THIS DEPLOYMENT MAY PRODUCE (Roman 2026-11-08) ══════════════════════
  // The explicitness pass produces the ENHANCED edition of a passage. Which editions a build is
  // allowed to produce is a platform question, and platform selection is enforced HERE, on the
  // server, because the client cannot be trusted to describe its own distribution channel: an
  // App Store build, a web build and a test harness all speak the same API.
  //
  // THE DECISION IS AN ENVIRONMENT DECISION, NOT A REQUEST FIELD. No payload can ask for the
  // enhanced edition; the deployment either permits it or it does not. An App Store or other
  // restricted edition therefore receives its permitted BASE version, which is the full scene
  // Luna authored and the craft passes repaired — not a degraded one.
  //
  // IT DEFAULTS TO REFUSING. An unset variable means "this build does not produce enhanced
  // prose", so a deployment that was never configured cannot be probed into producing it, and a
  // new environment is restricted until somebody states otherwise.
  //
  // THE SCENE'S RATING IS NOT THE GATE, which is the mistake this is written to avoid. An
  // "R-rated" story setting describes what the reader asked for; it says nothing about what the
  // distribution channel permits, and treating it as a compliance guarantee is how restricted
  // builds end up shipping content they may not carry. `contentClass` below still selects the
  // MODEL; it does not authorize an edition.
  // GENERATION AND DELIVERY SHARE ONE DECISION — `editionForRequest` above, which is also what
  // /api/config hands the client. The origin travels with the admission input so a restricted
  // client cannot generate enhanced prose against a backend that also serves the website.
  if (_opPassMode === 'task:explicitness') {
    const ed = editionForRequest(env, input.origin);
    if (ed.edition !== 'enhanced') {
      return { ok: false, status: 403, error: 'enhanced_edition_not_permitted',
        editionWhy: ed.why,
        detail: 'this request may not receive the enhanced edition (' + ed.why + ': '
          + ed.detail + '). The scene publishes in its base edition, which is the complete '
          + 'authored and craft-repaired scene. Nothing was sent upstream and nothing was '
          + 'charged.' };
    }
  }

  // 4. SHAPE AND HARD BOUNDS.
  if (typeof system !== 'string' || typeof user !== 'string' || !system.trim() || !user.trim()) {
    return { ok: false, status: 400, error: 'request_required' };
  }
  if ((system.length + user.length) > MAX_INPUT_CHARS) {
    return { ok: false, status: 413, error: 'request_too_large',
      detail: `assembled request is ${system.length + user.length} chars; the cap is ${MAX_INPUT_CHARS}` };
  }

  // 5. WHICH PINNED CONFIGURATION. Required, never guessed: routing an explicit scene to a
  // moderating model is the harm this selection exists to prevent, so an absent or unrecognized
  // class is a refusal rather than a default.
  let cfg = editorConfigFor(body.contentClass);
  if (!cfg) {
    return { ok: false, status: 400, error: 'content_class_required',
      detail: 'declare contentClass as "general" or "explicit"; it selects a server-pinned '
        + 'editor configuration and cannot be inferred here' };
  }
  // ── A RUN-SCOPED CONFIGURATION OVERRIDE, ENV-GATED (Roman, authorized 2026-11-06) ────────
  // For the authorized twenty-scene run, Luna performs ALL THREE repair tasks including on
  // explicit drafts, with their content preserved. That cannot be expressed by declaring the
  // scene "general": mislabelling explicit material is the one thing this gate exists to
  // prevent, and the declaration stays TRUTHFUL. So the class is still declared and still
  // recorded; the model is overridden separately, visibly, and only where an operator has set
  // the variable.
  //
  // UNSET IN PRODUCTION AND IN EVERY DEPLOYED ENVIRONMENT, which is the whole safety property:
  // with no variable this block does nothing and the content class alone picks the model, byte
  // for byte as before. It also cannot be reached by a client — it is an environment decision,
  // not a request field, so no payload can ask for it.
  //
  // IF LUNA REFUSES OR FAILS, THAT IS THE RESULT. Nothing here falls back to Grok: the refusal
  // or the empty completion is returned and recorded as the outcome of the pass.
  const forced = String(env.CPLUS_EDITOR_FORCE_CONFIG || '').trim();
  let forcedFrom = null;
  if (forced) {
    const fc = editorConfigFor(forced);
    if (!fc) {
      return { ok: false, status: 500, error: 'policy_invalid',
        detail: 'CPLUS_EDITOR_FORCE_CONFIG must name a configured editor class' };
    }
    if (fc !== cfg) { forcedFrom = String(body.contentClass); cfg = fc; }
  }

  const outCap = Math.min(cfg.maxOutputTokens,
    Math.max(cfg.floorOutputTokens, Number(maxTokens) || 1200));
  return { ok: true, priceFortunes, dailyCap, expectedOperationId,
    model: cfg.model, config: cfg, contentClass: String(body.contentClass),
    // The declared class is preserved for the record even when the model was overridden, so a
    // receipt never implies the scene was general when it was not.
    configForcedFrom: forcedFrom || undefined, outCap,
    // THE RESERVATION, priced from the request we are actually about to send, at THIS
    // configuration's rates. Reasoning output is billed as output by both providers, so the
    // ceiling assumes it.
    reservedUsd: reserveUsd(system.length + user.length, outCap, cfg) };
}

export function reserveUsd(inputChars, outCap, cfg) {
  const c = cfg || EDITOR_CONFIGS.explicit;
  const inTok = Math.ceil(inputChars / CHARS_PER_TOKEN);
  const outTok = Math.ceil(outCap * REASONING_MULT);
  return (inTok * c.rateIn + outTok * c.rateOut) * SAFETY_MARGIN;
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
export function normalizeUsage(usage, cfg) {
  const _c = cfg || EDITOR_CONFIGS.explicit;
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
  const reasoning = reported === null ? 0 : reported;
  // ── THE PROVIDER'S OWN TOTAL IS THE BILLED OUTPUT, AND THE TWO CONVENTIONS DIFFER ───────
  // (Roman 2026-11-04, measured on saved receipts.) `completion + reasoning` was WRONG for one
  // of the two providers and the error is a double charge:
  //   · xAI  grok-4.3: prompt 15,070 · completion 703 · total 16,945 · reasoning 1,172.
  //          total − prompt = 1,875 = completion + reasoning → reasoning is OUTSIDE completion.
  //   · OpenAI gpt-6-luna: prompt 15,113 · completion 3,984 · total 19,097 · reasoning 3,150.
  //          total − prompt = 3,984 = completion EXACTLY → reasoning is INSIDE completion.
  // Adding reported reasoning to completion therefore over-billed every OpenAI reasoning call
  // by its whole reasoning count — $0.001575 on that one Luna receipt, and it would scale.
  //
  // `total − prompt` is correct for BOTH, because it is what the provider says it billed. The
  // reported reasoning count is kept for reporting and is no longer an addend.
  let outTok = completion;
  let reasoningShown = reasoning;
  let basis = 'completion_tokens (no total reported)';
  if (total !== null) {
    const impliedOut = total - inTok;
    if (impliedOut < completion) {
      return { ok: false, why: `incoherent usage: total ${total} < prompt ${inTok} + completion `
        + `${completion}` };
    }
    outTok = impliedOut;
    if (impliedOut === completion) {
      basis = 'total − prompt, which equals completion_tokens (reasoning is inside completion)';
    } else {
      // The excess over completion IS reasoning the provider billed outside it. Derived for the
      // RECEIPT — it is not added to outTok, which the total already accounts for.
      if (impliedOut - completion > reasoningShown) reasoningShown = impliedOut - completion;
      basis = 'total − prompt; the excess over completion_tokens is billed as reasoning';
    }
  } else if (reasoning > 0) {
    // No total to trust. Charge conservatively rather than risk under-billing.
    outTok = completion + reasoning;
    basis = 'completion_tokens + reported reasoning_tokens (no total to verify against)';
  }
  // ── CACHE WRITES COST MORE THAN INPUT, SO THEY ARE PRICED AS WRITES ────────────────────
  // (Roman 2026-11-04.) I previously charged cache-write tokens at the ordinary input rate and
  // called that conservative. It is the opposite: a standard 30-minute write is $2.50/MTok on
  // gpt-6.1-sol against a $2.00 input rate, and $0.125 against $0.10 on gpt-6-luna, so pricing
  // writes as input UNDERSTATES the bill. Both saved receipts carry 15,110 write tokens.
  //
  // Write tokens are inside `prompt_tokens`, so they are priced at the write rate INSTEAD of
  // the input rate, never in addition to it. Where no write rate is configured for a model,
  // writes fall back to the input rate and the basis says so rather than implying a figure.
  const cachedIn = pick(usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || 0;
  const cacheWrite = pick(usage.prompt_tokens_details
    && usage.prompt_tokens_details.cache_write_tokens) || 0;
  const plainIn = Math.max(0, inTok - cachedIn - cacheWrite);
  const writeRate = (typeof _c.rateCacheWrite === 'number') ? _c.rateCacheWrite : _c.rateIn;
  const readRate = (typeof _c.rateCacheRead === 'number') ? _c.rateCacheRead : _c.rateIn;
  const inputUsd = plainIn * _c.rateIn + cachedIn * readRate + cacheWrite * writeRate;
  return { ok: true, inTok, outTok, completion, reasoning: reasoningShown, basis,
    cachedInTok: cachedIn, cacheWriteTok: cacheWrite, plainInTok: plainIn,
    // Named per direction, because the two rates are configured independently and a missing one
    // means that side is priced as ordinary input — which UNDERSTATES a write and OVERSTATES a
    // read. Either way the receipt says which.
    cacheBasis: [
      (typeof _c.rateCacheWrite === 'number')
        ? 'writes priced at the published write rate'
        : 'no published cache-write rate configured for this model — writes priced as input',
      (typeof _c.rateCacheRead === 'number')
        ? 'reads priced at the published read rate'
        : 'no published cache-read rate configured for this model — reads priced as input'
    ].join('; '),
    // A CALCULATED COST, derived from the provider's usage block and published rates. It is not
    // a copy of a provider invoice.
    usd: inputUsd + outTok * _c.rateOut };
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
    // ── EVERY REPLY STATES WHETHER A PROVIDER WAS CONTACTED (Roman 2026-11-07) ─────────────
    // MEASURED: this route refused 22 consecutive calls with HTTP 503
    // {"error":"policy_not_configured","detail":"CPLUS_EDITOR_DAILY_CAP is unset..."} — a LOCAL
    // refusal, before any upstream dispatch. The caller could not tell that from a model that
    // answered with nothing, so it logged "empty reply" and HELD the reservation as unknown
    // provider spending. Both were wrong: no provider was contacted and nothing could have been
    // billed.
    //
    // The route is the only party that knows, so it says so, on every reply, additively. The
    // flag is set immediately before the upstream fetch and nowhere else — there are fifteen
    // refusal sites and a caller-side list of their error codes would drift from this file.
    let _upstreamDispatched = false;
    try {
      const _json0 = res.json && res.json.bind(res);
      if (_json0) {
        res.json = function (o) {
          return _json0((o && typeof o === 'object' && !Array.isArray(o))
            ? Object.assign({}, o, { _upstreamDispatched: _upstreamDispatched })
            : o);
        };
      }
    } catch (_) { /* a caller with an exotic res shape keeps the old behaviour */ }
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
    if (!sbUrl || !sbKey) return res.status(500).json({ error: 'server_not_configured' });
    // THE PROVIDER KEY IS CHECKED AFTER THE CONFIGURATION IS CHOSEN, below: the two paths read
    // different keys, and refusing for a missing xAI key on a general-prose call would be wrong.

    // THE ACCOUNT COMES FROM THE TOKEN.
    const auth = (req.headers && req.headers.authorization) || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'authentication_required' });
    const authClient = createClient(sbUrl, env.SUPABASE_ANON_KEY || sbKey);
    const { data: authData, error: authErr } = await authClient.auth.getUser(token);
    const accountId = authData && authData.user && authData.user.id;
    if (authErr || !accountId) return res.status(401).json({ error: 'invalid_session' });

    const verdict = editorAdmission({ env, accountId, body: req.body || {}, origin: req.headers && req.headers.origin });
    if (!verdict.ok) {
      log.warn(`[cplus-editor] refused ${verdict.error} (session=${accountId})`);
      return res.status(verdict.status).json({ error: verdict.error, detail: verdict.detail });
    }
    const { operationId, storyId, scene, revisionId, system, user, obligations } = req.body || {};
    const { priceFortunes, dailyCap, outCap, reservedUsd, config: cfg, contentClass } = verdict;
    // The key for THIS configuration's provider. Both are env-held and neither is ever logged.
    const providerKey = (cfg.keyEnv === 'XAI_API_KEY')
      ? (env.XAI_API_KEY || env.GROK_API_KEY)
      : env[cfg.keyEnv];
    if (!providerKey) {
      return res.status(500).json({ error: 'provider_not_configured',
        detail: `the ${contentClass} editor configuration needs ${cfg.keyEnv}` });
    }

    const supabase = createClient(sbUrl, sbKey);

    // ── ATOMIC ADMISSION: entitlement, quota and the priced reservation, in one transaction ──
    const { data: admitData, error: admitErr } = await supabase.rpc('cplus_editor_admit', {
      p_operation_id: operationId, p_account_id: accountId, p_story_id: String(storyId),
      p_scene: Number(scene), p_revision_id: String(revisionId), p_model: cfg.model,
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
          p_metadata: { model: cfg.model, contentClass, revision: String(revisionId) }
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
      // THE ENDPOINT, THE KEY, THE CAP FIELD AND THE EFFORT ALL COME FROM THE SELECTED
      // CONFIGURATION. Nothing is carried over from the other one: a reasoning model on Chat
      // Completions rejects `max_tokens` outright, so a shared field name would have made every
      // general-prose call a 400.
      const upstreamBody = { model: cfg.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
      upstreamBody[cfg.capField] = outCap;
      if (cfg.effort) upstreamBody.reasoning_effort = cfg.effort;
      _upstreamDispatched = true;   // from here on, a provider MAY have been billed
      const upstream = await doFetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerKey}` },
        body: JSON.stringify(upstreamBody),
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
    const u = normalizeUsage(body && body.usage, cfg);
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
      chargedFortunes: charged, model: cfg.model, contentClass, latencyMs: ms });
  };
}

export default createHandler();
