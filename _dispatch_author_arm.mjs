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
if (!REQ || !['grok', 'mistral'].includes(ARM)) {
  console.error('set SB_AUTHOR_REQ and SB_ARM=grok|mistral'); process.exit(2);
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
const meta = { arm: ARM, model: body.model || body.preferredModel, url, status, ms, failed,
  finish: (((parsed.choices || [])[0] || {}).finish_reason) || null,
  returnedModel: parsed.model || null, orchestration: orch, usage: parsed.usage || null,
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
  say('  usage: ' + JSON.stringify(meta.usage));
  say('  cost: ' + (measured ? ('receipt $' + measured.toFixed(6))
    : ('NO RECEIPT — retained $' + retained.toFixed(6))));
}
// THE PROSE, separated from technical material.
const content = (((parsed.choices || [])[0] || {}).message || {}).content || '';
fs.writeFileSync(OUT + '/content_raw.txt', content);
say('\n  raw content chars: ' + content.length);
say('  output: ' + OUT);
