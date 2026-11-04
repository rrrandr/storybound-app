// TEMPORARY, ISOLATED, LOCALHOST-ONLY route for ONE authorized gpt-6.1-sol call.
// Delete after use. No production code paths reach this file.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED = ['gpt-6.1-sol'];
const PLAYTHROUGH = true;
// ── TEST-ONLY ADMISSION LIMIT (Roman, authorized 2026-10-31) ─────────────────────────
// The DEFAULT stays 0.30 — unchanged, and that is what any caller without the variable
// gets. The execution test sets SB_SOL_PER_CALL_CAP_TEST=0.35 because the author prompt
// grows ~7,300 chars per scene and the projected scene-13 request prices at $0.2968,
// three tenths of a cent under the default limit. This raises the ADMISSION limit only:
// no token allowance changes, the cap the caller requests is still 4,000, and this route
// remains localhost-only with its label, run-budget and single-use claim intact.
const PER_CALL_CAP = (function () {
  var t = Number(process.env.SB_SOL_PER_CALL_CAP_TEST);
  return (isFinite(t) && t > 0 && t <= 0.35) ? t : 0.30;
})();
const RATE = { in: 2.0, out: 10.0 };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  // REFUSE anywhere but a local dev host.
  const host = String((req.headers && req.headers.host) || '');
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  if (!isLocal) return res.status(403).json({ error: 'localhost_only', host });
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    return res.status(403).json({ error: 'not_in_deployed_env', env: process.env.VERCEL_ENV });
  }

  const label = String((req.body && req.body._sbCallLabel) || '');
  const dryRun = !!(req.body && req.body.dry_run_body === true);
  const body = Object.assign({}, req.body);
  delete body._sbCallLabel;
  delete body.dry_run_body;

  if (!ALLOWED.includes(String(body.model))) {
    return res.status(400).json({ error: 'disallowed_model', received: String(body.model),
      detail: 'this route serves only: ' + ALLOWED.join(', ') });
  }
  if (!Array.isArray(body.messages) || !body.messages.length) {
    return res.status(400).json({ error: 'missing_messages' });
  }
  // gpt-6.1-sol REQUIRES max_completion_tokens; max_tokens is an unsupported_parameter (measured).
  if (body.max_tokens != null) {
    return res.status(400).json({ error: 'wrong_cap_param',
      detail: 'gpt-6.1-sol requires max_completion_tokens, not max_tokens' });
  }
  // ── ACCEPTANCE LIMIT RAISED 8000 → 14250 (Roman, authorized 2026-10-31) ─────────────
  // ONLY the acceptance limit moves. The caller still requests its own allowance, and the
  // planning comparison requests exactly 14250 — the frozen spine request's own ceiling —
  // so Sol receives the same output allowance as every other arm instead of being capped
  // at 8000 and reported as a planning failure for a route limit. Every other safeguard
  // is untouched: localhost-only, PER_CALL_CAP, the call label and the run-budget check.
  // At 14250 with this comparison's ~13.7k-token input, the priced ceiling is ~$0.17,
  // which still clears PER_CALL_CAP on its own.
  //
  // ── 14250 → 18150, RECONCILED WITH THE CALLER'S OWN ALLOWANCE (2026-11-02) ──────────
  // MEASURED: the 2026-11-02 attempt was refused HERE with {"error":"cap_out_of_bounds",
  // "cap":18150}. 14250 was never the configuration's fixed requirement — it is what
  // app.js's `_spineOutputAllowance('literary', 2)` returns on its own (raw 11,400 × 1.25
  // headroom). When a portfolio subject is present, app.js:240726 adds PORTFOLIO_MAX_TOKENS
  // (3,900) for content the scaffold genuinely has to carry, giving 18,150. That addition is
  // a legitimate, dynamically activated requirement, so the correct reconciliation is to
  // ACCEPT the allowance the caller needs — NOT to clamp the output and NOT to drop the
  // portfolio content to fit an older bound.
  //
  // DERIVED, NOT PICKED. _nf_reliability_controls.mjs reads both numbers out of public/app.js
  // and fails if either drifts from this bound, so the two cannot diverge silently again.
  //
  // THIS CHANGES THE PRICED CEILING, SO IT IS A PAID-CONFIGURATION CHANGE AND IS RE-QUOTED
  // RATHER THAN APPLIED QUIETLY. The measured outgoing body at 18,150 with its ~14,160-token
  // input priced at $0.209820, against $0.167024 at 14,250. PER_CALL_CAP IS NOT TOUCHED:
  // 0.2098 still clears the 0.30 default on its own, so that safeguard keeps the same bite.
  const SPINE_ALLOWANCE_BASE = 14250;   // _spineOutputAllowance('literary', 2).tokens
  const PORTFOLIO_ALLOWANCE = 3900;     // PORTFOLIO_MAX_TOKENS, public/app.js:149466
  const CAP_LIMIT = SPINE_ALLOWANCE_BASE + PORTFOLIO_ALLOWANCE;   // 18150
  const cap = Number(body.max_completion_tokens);
  if (!(cap > 0 && cap <= CAP_LIMIT)) {
    return res.status(400).json({ error: 'cap_out_of_bounds', cap, limit: CAP_LIMIT,
      derivation: 'spine allowance ' + SPINE_ALLOWANCE_BASE
        + ' + portfolio ' + PORTFOLIO_ALLOWANCE });
  }

  const chars = JSON.stringify(body.messages).length;
  const ceiling = ((chars / 4) * RATE.in + cap * RATE.out) / 1e6;
  if (ceiling > PER_CALL_CAP) {
    return res.status(400).json({ error: 'over_per_call_cap', ceiling, cap: PER_CALL_CAP });
  }

  // ── PLAYTHROUGH MODE (set at install time) ────────────────────────────────────────────
  // The opening body is assembled by the app at runtime, so there is nothing to pre-hash. The
  // control becomes a RUN BUDGET carried on the request, checked against this call's own priced
  // ceiling, plus a RECORDED fingerprint of the exact bytes dispatched. Disclosed, not quiet.
  if (PLAYTHROUGH) {
    const runBudget = Number(req.body && req.body._sbRunBudgetUsd);
    if (!Number.isFinite(runBudget) || runBudget <= 0) {
      return res.status(400).json({ error: 'missing_run_budget',
        detail: 'playthrough mode requires _sbRunBudgetUsd on every request' });
    }
    if (ceiling > runBudget) {
      return res.status(400).json({ error: 'over_run_budget', ceiling, runBudget });
    }
  }
  if (!label) return res.status(400).json({ error: 'missing_call_label' });
  const dir = path.join(process.cwd(), '_ab_writing_out', 'continuation_experiment');
  const apprPath = path.join(dir, 'APPROVAL.' + label + '.json');

  // ── THE PROVIDER REQUEST, CONSTRUCTED FROM SUPPORTED FIELDS ONLY ──────────────────────
  // The app's body carries its own dispatcher's metadata. Forwarding it upstream is both a leak
  // and a 400 risk on this model class, so the request is BUILT rather than passed through:
  // _sbRunBudgetUsd, _sbCallLabel, preferredModel and role stay local. temperature is omitted
  // deliberately — gpt-6.1-sol is a reasoning model and rejects unsupported parameters, which is
  // the same class of failure as max_tokens.
  const upstreamBody = { model: body.model, messages: body.messages, max_completion_tokens: cap };
  if (body.reasoning_effort) upstreamBody.reasoning_effort = body.reasoning_effort;
  if (body.response_format) upstreamBody.response_format = body.response_format;
  // ── CACHE CONTROLS, FORWARDED (2026-10-30) ────────────────────────────────────────────
  // SUPPORTED BY CHAT COMPLETIONS for gpt-5.6 and later: `prompt_cache_key`,
  // `prompt_cache_options` ({ mode: 'explicit' to suppress the implicit breakpoint, ttl,
  // where the reference currently lists '30m' as the only supported value), and, inside
  // message content blocks, `prompt_cache_breakpoint` (max 4 per request). They were absent
  // upstream only because THIS ROUTE builds the request from a fixed field list, so whatever
  // the caller sent was dropped. That is an adapter limitation, not an endpoint one — no API
  // migration is needed to use them.
  //
  // Forwarded, not invented: nothing is defaulted. With no cache options on the request the
  // body goes up exactly as before and caching stays implicit. `prompt_cache_breakpoint` is
  // not listed because it lives inside message content blocks, which already travel with
  // body.messages untouched.
  if (body.prompt_cache_key) upstreamBody.prompt_cache_key = body.prompt_cache_key;
  if (body.prompt_cache_options) upstreamBody.prompt_cache_options = body.prompt_cache_options;
  const forwardedKeys = Object.keys(upstreamBody);
  const droppedKeys = Object.keys(body).filter((k) => forwardedKeys.indexOf(k) === -1);

  // ── THE FINGERPRINT, COMPUTED BEFORE ANYTHING USES IT ─────────────────────────────────
  // It was previously declared AFTER the audit write that referenced it, so the write threw a
  // ReferenceError inside a swallowing try/catch and the audit record was silently never made.
  // It fingerprints the bytes that actually LEAVE, not the body that arrived.
  const sha = crypto.createHash('sha256').update(JSON.stringify(upstreamBody)).digest('hex');

  if (PLAYTHROUGH) {
    // NO APPROVAL FILE IS READ, COMPARED OR REQUIRED. A failure to record is REPORTED, not
    // swallowed: an audit record that might be missing is not an audit record.
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'DISPATCHED_SHA.' + label + '.json'),
        JSON.stringify({ label, sha256: sha, chars, ceiling, droppedKeys,
          at: new Date().toISOString() }, null, 2));
    } catch (e) {
      return res.status(500).json({ error: 'audit_record_unwritable', detail: String(e && e.message) });
    }
  } else {
    if (!fs.existsSync(apprPath)) return res.status(403).json({ error: 'no_approval_on_file', label });
    let appr = null;
    try { appr = JSON.parse(fs.readFileSync(apprPath, 'utf8')); }
    catch (e) { return res.status(500).json({ error: 'approval_unreadable' }); }
    if (sha !== appr.bodySha256) {
      return res.status(403).json({ error: 'body_does_not_match_approval',
        expected: appr.bodySha256, actual: sha });
    }
  }

  if (dryRun) {
    return res.status(200).json({ dry_run: true,
      approvalMatched: !PLAYTHROUGH, playthroughMode: PLAYTHROUGH, dispatchedSha256: sha,
      apiKeyPresent: !!process.env.OPENAI_API_KEY,
      upstream_body_shape: { model: upstreamBody.model, max_completion_tokens: cap,
        reasoning_effort: upstreamBody.reasoning_effort || null,
        forwardedKeys, droppedKeys,
        messages: upstreamBody.messages.map((m) => ({ role: m.role, chars: String(m.content || '').length })) },
      repricedCeilingUsd: ceiling, perCallCapUsd: PER_CALL_CAP });
  }

  // KEY CHECK BEFORE THE CLAIM. If this ran after, a missing key would burn the single-use
  // claim and the label could never be dispatched again.
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'missing_api_key' });

  // SINGLE USE: an exclusive claim file. A second attempt with the same label cannot dispatch.
  const claimPath = path.join(dir, 'UPSTREAM_CLAIM.' + label + '.json');
  try { fs.closeSync(fs.openSync(claimPath, 'wx')); }
  catch (e) { return res.status(409).json({ error: 'label_already_claimed', label }); }
  fs.writeFileSync(claimPath, JSON.stringify({ label, sha256: sha, at: new Date().toISOString() }));
  const startedAt = Date.now();
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(upstreamBody),
  });
  const text = await upstream.text();
  const ms = Date.now() - startedAt;
  let data = null; try { data = JSON.parse(text); } catch (e) {}

  // ── THE RESPONSE IS RECORDED ON THE SERVER BEFORE IT IS RETURNED (Roman 2026-11-02) ────────
  // MEASURED: on 2026-11-02 the browser stopped waiting at 120s while this function was still
  // running. Only UPSTREAM_CLAIM existed afterwards — a record that a request was ABOUT to be
  // sent, which says nothing about what came back. If the provider answered a second later, that
  // answer (and whatever it cost) was unrecoverable: it went to a closed socket and nowhere else.
  //
  // A DISPATCH CLAIM IS NOT A RESPONSE RECORD. This writes the complete body, the usage block,
  // the status, redacted headers and the duration under the call's unique label, BEFORE the
  // return — so a late answer survives a client that has given up.
  //
  // WRITTEN OUTSIDE THE WATCHED APPLICATION TREE. `dir` above sits under the repo, which
  // `vercel dev` watches; adding large response bodies there feeds the file-watcher load that
  // has produced `spawn EBADF`. SB_SOL_RESPONSE_DIR overrides; the default is a sibling diag
  // directory. A failure to record is reported in the payload, never silently swallowed.
  let responseRecord = null;
  try {
    const outDir = process.env.SB_SOL_RESPONSE_DIR
      || path.join(path.dirname(process.cwd()), 'storybound-diag', 'sol_route_responses');
    fs.mkdirSync(outDir, { recursive: true });
    const hdrs = {};
    try {
      upstream.headers.forEach((v, k) => {
        hdrs[k] = /authorization|api[-_]?key|cookie|set-cookie|token|secret|openai-organization/i.test(k)
          ? '[REDACTED]' : v;
      });
    } catch (_) {}
    const file = path.join(outDir, 'RESPONSE.' + label + '.json');
    fs.writeFileSync(file, JSON.stringify({
      label, sha256: sha,
      at: new Date().toISOString(), ms,
      status: upstream.status,
      headers: hdrs,
      usage: (data && data.usage) || null,
      servedModel: (data && data.model) || null,
      finishReason: (data && data.choices && data.choices[0] && data.choices[0].finish_reason) || null,
      bodyComplete: text,              // the COMPLETE body, unabridged, whatever the status
      bodyParsed: !!data,
      requestChars: chars,
      pricedCeilingUsd: ceiling,
      capRequested: cap,
    }, null, 2));
    responseRecord = file;
  } catch (e) {
    responseRecord = 'WRITE_FAILED: ' + String(e && e.message);
  }

  if (upstream.status !== 200) {
    return res.status(upstream.status).json({ error: 'upstream_error', provider_status: upstream.status,
      details: data || String(text).slice(0, 600), _responseRecord: responseRecord, _ms: ms });
  }
  return res.status(200).json({ _upstreamRaw: data, _label: label,
    _responseRecord: responseRecord, _ms: ms });
};
