// ── ONE AUTHOR ARM, FROM THE FROZEN REQUEST ─────────────────────────────────────────────────
// Dispatches a SAVED literary author request once, to one model, with containment proven rather
// than assumed. No boot, no setup, no planner, no repair: the frozen messages are reused byte for
// byte so every arm writes from the identical assignment.
//
// CONTAINMENT, PER ROUTE:
//   · /api/proxy (Grok) runs a MODEL CHAIN and will retry the same model up to three times for ONE
//     client request. Intercepting at the browser proves nothing — api/proxy.js says so itself. So
//     `_noFallback: true` is INJECTED, which reduces the chain to one entry, and the returned
//     _orchestration.upstreamAttempts is checked afterwards.
//   · /api/mistral-proxy has NO chain and exactly one upstream fetch, with the governor admitting
//     or refusing before it. Nothing to pin; the structure is the control, and the governor's
//     verdict is reported.
//
// Usage:
//   SB_AUTHOR_REQ=<saved request> SB_ARM=grok|mistral [SB_MODEL=ministral-8b-2512]
//   SB_CAP=<usd> SB_PRIOR=<usd> [SB_DRY=1] node _dispatch_author_arm.mjs
import fs from 'fs';
import { estimateUsd } from './_fsc_cost_guard.mjs';

const REQ = process.env.SB_AUTHOR_REQ;
const ARM = String(process.env.SB_ARM || '').toLowerCase();
const MODEL = process.env.SB_MODEL || null;
const CAP = Number(process.env.SB_CAP || 0);
const PRIOR = Number(process.env.SB_PRIOR || 0);
const DRY = process.env.SB_DRY === '1';
if (!REQ || !['grok', 'mistral', 'anthropic'].includes(ARM)) {
  console.error('set SB_AUTHOR_REQ and SB_ARM=grok|mistral|anthropic'); process.exit(2);
}
if (!DRY && !(CAP > 0)) { console.error('live dispatch needs SB_CAP'); process.exit(2); }

const cap0 = JSON.parse(fs.readFileSync(REQ, 'utf8'));
const frozen = cap0.body;
const OUT = '_ab_writing_out/arm_' + ARM + (MODEL ? '_' + MODEL : '') + '_'
  + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(OUT, { recursive: true });
const say = (m) => { console.log(String(m)); };

// ── THE BODY, PER ROUTE. The MESSAGES are never touched. ────────────────────────────────────
let url, body;
if (ARM === 'grok') {
  url = cap0.url;
  body = JSON.parse(JSON.stringify(frozen));
  body._noFallback = true;   // containment: one upstream attempt, not a three-entry chain
} else if (ARM === 'anthropic') {
  url = (cap0.url || '').replace(/\/api\/[a-z-]+$/, '/api/anthropic-proxy');
  // The route performs Anthropic's required conversion itself: messages with role 'system' are
  // lifted into the top-level `system` field and the rest mapped to user/assistant turns. So the
  // FROZEN messages pass through unchanged, roles intact, which is what keeps this arm comparable.
  //   · model is the pinned allowlisted identifier;
  //   · max_tokens explicit (the route defaults to 2000);
  //   · temperature carried across — honoured only because thinking is OFF;
  //   · thinking_budget_tokens OMITTED => thinking off, per the route's own contract;
  //   · one upstream fetch, no chain: containment is structural, as with Mistral.
  body = {
    messages: frozen.messages,
    model: MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: frozen.max_tokens,
    role: 'PRIMARY_AUTHOR'
  };
  // TEMPERATURE IS NOT UNIVERSALLY ACCEPTED HERE, and this is a PROVIDER REQUIREMENT, not a tuning
  // choice. Haiku 4.5 takes it; Sonnet 5.5 rejects the request outright with
  //   400 "`temperature` is deprecated for this model."
  // (observed, request_id req_011CfyW4G5QFpTuUQMApm4dc). Nothing is generated and nothing is
  // billed on that rejection, but the arm does not run either. So temperature is sent only to the
  // models that accept it, and its omission is DISCLOSED rather than silent — a difference in
  // sampling settings between arms that the comparison has to carry openly.
  const isClaude5 = /^claude-(sonnet|opus|haiku|fable|mythos)-5/.test(String(body.model));
  if (!isClaude5) {
    body.temperature = frozen.temperature;
  } else {
    // THE DOCUMENTED WAY to stop a Claude 5 model spending its whole max_tokens on up-front
    // thinking. With NO tools in the request, thinking.type 'between_tools' yields text without
    // up-front thinking. thinking.type 'disabled' is REJECTED by Sonnet 5.5, and the manual
    // budget_tokens mode is not accepted past the 4.6 generation, so neither is used.
    body.thinking_type = 'between_tools';
    body.effort = 'high';
  }
} else {
  url = (cap0.url || '').replace(/\/api\/[a-z-]+$/, '/api/mistral-proxy');
  // Provider-specific settings, disclosed rather than implied:
  //   · model is explicit (the endpoint otherwise DEFAULTS to mistral-medium-latest, which is
  //     unpriced here and absent from the governor);
  //   · max_tokens is explicit (the endpoint defaults to 500, which would truncate a scene);
  //   · temperature is carried across from the frozen request;
  //   · reasoning_effort is DELIBERATELY OMITTED — no Ministral model accepts it, as the earlier
  //     three-author comparison recorded;
  //   · role selects the governor bucket.
  body = {
    messages: frozen.messages,
    model: MODEL || 'ministral-8b-2512',
    max_tokens: frozen.max_tokens,
    temperature: frozen.temperature,
    role: 'PRIMARY_AUTHOR'
  };
}
fs.writeFileSync(OUT + '/request.json', JSON.stringify({ url, body }, null, 2));

const msgChars = (body.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
const frozenChars = (frozen.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
say('=== AUTHOR ARM: ' + ARM + (MODEL ? ' / ' + MODEL : '') + ' ===');
say('frozen request : ' + REQ);
say('endpoint       : ' + url);
say('messages       : ' + (body.messages || []).length + '  chars ' + msgChars
  + (msgChars === frozenChars ? '  (IDENTICAL to the frozen request)' : '  *** DIFFERS FROM FROZEN ***'));
say('max_tokens=' + body.max_tokens + ' temperature=' + body.temperature
  + ' model=' + (body.model || body.preferredModel || '(endpoint default)'));
if (ARM === 'grok') {
  say('_noFallback    : ' + (body._noFallback === true)
    + '   (api/proxy.js reduces the chain to ONE entry when set)');
} else if (ARM === 'anthropic') {
  say('thinking        : ' + (body.thinking_type
    ? ('type=' + body.thinking_type + '  effort=' + body.effort
       + '  (no tools in this request => text without up-front thinking)')
    : 'budget_tokens OMITTED (manual mode; not accepted past 4.6)'));
  say('temperature     : ' + (body.temperature != null
    ? (body.temperature + ' (accepted by this model)')
    : 'OMITTED — this model rejects it as deprecated (provider requirement, disclosed)'));
  say('conversion      : system messages -> top-level `system`; turns -> user/assistant (done by the route)');
  say('containment     : one upstream fetch, single allowlisted model, no chain');
} else {
  say('reasoning_effort: OMITTED (no Ministral model accepts it)');
  say('containment    : api/mistral-proxy has no model chain and one upstream fetch;'
    + ' the governor admits or refuses before it');
}
if (msgChars !== frozenChars) { say('\n*** ABORT — the messages differ from the frozen request. ***'); process.exit(4); }

const e = estimateUsd(body, body.model || body.preferredModel, url);
if (!e || !e.bounded) {
  say('\nUNPRICEABLE — ' + ((e && e.refuseReason) || 'no estimate') + '\nRefusing to dispatch.');
  process.exit(5);
}
say('\npriced as ' + e.model + '  (' + e.resolvedBy + ')');
say('  promptTokens ~' + e.promptTokens + '  ESTIMATE at chars/' + e.assumptions.CHARS_PER_TOKEN
  + ' — an approximation, not a tokenizer');
say('  RESERVATION  $' + e.estimate.toFixed(6));
if (DRY) { say('\nDRY — nothing dispatched.  ' + OUT); process.exit(0); }
if (PRIOR + e.estimate > CAP) {
  say('\nHALTED BEFORE DISPATCH — $' + PRIOR.toFixed(6) + ' + $' + e.estimate.toFixed(6)
    + ' would exceed the cap $' + CAP.toFixed(6));
  process.exit(6);
}

const t0 = Date.now();
let txt = '', status = 0, failed = null;
try {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  status = r.status; txt = await r.text();
} catch (err) { failed = String(err && err.message); }
const ms = Date.now() - t0;
fs.writeFileSync(OUT + '/response_raw.json', txt || JSON.stringify({ error: failed }));

let parsed = {}; try { parsed = JSON.parse(txt); } catch (_) {}
const ticks = parsed.usage && parsed.usage.cost_in_usd_ticks;
const measured = (typeof ticks === 'number' && ticks > 0) ? ticks * 1e-10 : 0;
const retained = measured ? 0 : e.estimate;
const orch = parsed._orchestration || null;
const usage = parsed.usage || null;
const inTok = usage ? (usage.prompt_tokens ?? usage.input_tokens ?? null) : null;
const outTok = usage ? (usage.completion_tokens ?? usage.output_tokens ?? null) : null;
const meta = { arm: ARM, model: body.model || body.preferredModel, url, status, ms, failed,
  finish: (ARM === 'anthropic')
    ? (parsed.stop_reason || null)
    : ((((parsed.choices || [])[0] || {}).finish_reason) || null),
  returnedModel: parsed.model || (orch && orch.model) || null,
  orchestration: orch, usage, inTok, outTok,
  thinkingChars: (orch && orch.thinking_chars != null) ? orch.thinking_chars : null,
  noFallbackSent: ARM === 'grok' ? (body._noFallback === true) : null,
  upstreamAttempts: orch ? orch.upstreamAttempts : null,
  estimated: e.estimate, measured, retained };
fs.writeFileSync(OUT + '/meta.json', JSON.stringify(meta, null, 2));

say('\n── RESULT ──');
if (failed) say('  DISPATCH FAILED: ' + failed + ' — reservation RETAINED $' + e.estimate.toFixed(6));
else {
  say('  status=' + status + '  ' + ms + 'ms  finish=' + meta.finish);
  say('  served model=' + meta.returnedModel + '  upstreamAttempts=' + meta.upstreamAttempts);
  if (orch) say('  orchestration: ' + JSON.stringify(orch));
  say('  usage: ' + JSON.stringify(meta.usage) + '  -> in=' + meta.inTok + ' out=' + meta.outTok);
  if (meta.thinkingChars != null) say('  thinking chars returned: ' + meta.thinkingChars);
  say('  cost: ' + (measured ? ('receipt $' + measured.toFixed(6))
    : ('NO RECEIPT — retained $' + retained.toFixed(6))));
}
// THE PROSE, separated from technical material.
// SHAPE DIFFERS BY ROUTE, and reading the wrong one reports a successful scene as EMPTY.
// api/anthropic-proxy.js returns { content, thinking, usage:{input_tokens,output_tokens},
// stop_reason, _orchestration }. Grok/Mistral return OpenAI-style choices[].message.content.
const content = (ARM === 'anthropic')
  ? String(parsed.content || '')
  : ((((parsed.choices || [])[0] || {}).message || {}).content || '');
fs.writeFileSync(OUT + '/content_raw.txt', content);
say('\n  raw content chars: ' + content.length);
say('  output: ' + OUT);
