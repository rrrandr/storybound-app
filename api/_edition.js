// ══ CHANNEL, PERMISSION AND EDITION ════════════════════════════════════════════════════════════
// Roman 2026-11-08. ONE decision, used by /api/config (what a client may be SHOWN) and by
// /api/cplus-editor (what the server will PRODUCE), so the two cannot disagree. Reimplementing it
// in either place is how they would drift and a restricted client would end up with enhanced
// prose.
//
// A LEADING UNDERSCORE means this is a shared module, not a route — the convention
// api/_mistral-governor.js and api/_sanitize-injection.js already use. It imports nothing.
//
// ══ ORIGIN IS NOT AUTHORITY (corrected 2026-11-08) ════════════════════════════════════════════
// An earlier version of this file decided the platform from the request's `Origin` header. That
// was wrong, and not subtly: Origin is REQUEST METADATA. It is set by the caller's user agent, it
// is absent on most non-browser requests, and anything that can send an HTTP request can send
// `Origin: https://storybound.love`. Granting the enhanced edition on it means the permission is
// self-asserted by the party being permitted.
//
// PERMISSION NOW COMES FROM THE DEPLOYMENT'S OWN CHANNEL POLICY — environment variables, which
// only an operator can set:
//   STORYBOUND_CHANNEL         what this deployment IS: 'web' | 'restricted'. Unset ⇒ restricted.
//   STORYBOUND_ENHANCED_EDITION whether this deployment may produce/deliver enhanced prose at all.
// Both must agree for the enhanced edition. A restricted build is a SEPARATE DEPLOYMENT with
// STORYBOUND_CHANNEL unset or 'restricted', so it cannot be talked into the enhanced edition by
// any header, body field or client claim.
//
// WHAT ORIGIN IS STILL USED FOR, AND IT IS NOT PERMISSION. When a single deployment deliberately
// serves more than one channel, an operator can enumerate the web origins in
// STORYBOUND_WEB_ORIGINS; a request whose Origin is not on that list is then NARROWED to
// restricted. That direction is safe — metadata can only ever REDUCE what the deployment policy
// already allows, never extend it. With the list unset, the deployment's own channel applies to
// every request and Origin is ignored entirely.
//
// IT DEFAULTS TO RESTRICTED/BASE at every step: unset variables, an unknown channel value, a
// malformed list. A new environment is restricted until an operator says otherwise, and the
// failure mode costs a reader some explicitness rather than putting prose in front of a client
// that may not carry it.
//
// THE SCENE'S RATING IS NOT AN INPUT, and neither is any request BODY field: no payload can ask
// for the enhanced edition. "R-rated" describes what the reader asked for and says nothing about
// what the distribution channel permits.
//
// MODEL SELECTION IS A SEPARATE AXIS. `channel` picks WHICH MODEL starts an operation (the
// website OAS route is an intentional Grok exception); `edition` picks WHICH TEXT may be
// delivered. A fallback changes the model and never the edition — a Grok fallback on a restricted
// platform still produces the permitted BASE edition.

function normList(raw) {
  return String(raw || '').trim()
    ? String(raw).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : null;
}

// ── THE DEPLOYMENT'S OWN CHANNEL, FROM POLICY ONLY ───────────────────────────────────────────
// No request input of any kind reaches this function. It answers "what is this deployment?".
export function deploymentChannel(env) {
  const raw = String((env || {}).STORYBOUND_CHANNEL || '').trim().toLowerCase();
  if (raw === 'web') return { channel: 'web', why: 'deployment_channel_web' };
  if (!raw) return { channel: 'restricted', why: 'deployment_channel_unset' };
  if (raw === 'restricted') return { channel: 'restricted', why: 'deployment_channel_restricted' };
  // An unrecognised value is NOT guessed at: it narrows to restricted and says so, so a typo
  // cannot widen a deployment's permissions.
  return { channel: 'restricted', why: 'deployment_channel_unrecognised:' + raw };
}

// ── THE CHANNEL FOR ONE REQUEST ──────────────────────────────────────────────────────────────
// The deployment's channel, optionally NARROWED by request metadata when an operator has asked
// for that narrowing. Metadata can only reduce, never extend.
export function channelForRequest(env, origin) {
  const base = deploymentChannel(env);
  if (base.channel !== 'web') return base;        // already restricted; nothing to narrow
  const allowed = normList((env || {}).STORYBOUND_WEB_ORIGINS);
  if (!allowed) {
    // No multi-channel list configured, so this deployment serves ONE channel and the request's
    // Origin is irrelevant. This is the ordinary case.
    return { channel: 'web', why: 'deployment_channel_web', originConsulted: false };
  }
  const o = String(origin || '').trim().toLowerCase().replace(/\/$/, '');
  const match = !!o && (allowed.indexOf(o) !== -1
    || /^http:\/\/localhost(:\d+)?$/.test(o)
    || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(o));
  return match
    ? { channel: 'web', why: 'deployment_web_and_origin_listed', originConsulted: true, detail: o }
    : { channel: 'restricted', why: o ? 'narrowed_origin_not_listed' : 'narrowed_no_origin',
        originConsulted: true, detail: o || null };
}

// Retained name. The platform axis IS the channel; this is the accessor other code reads.
export function platformForRequest(env, origin) {
  const c = channelForRequest(env, origin);
  return { platform: c.channel, why: c.why, detail: c.detail || null,
    originConsulted: !!c.originConsulted };
}

// ── WHICH EDITION MAY BE DELIVERED ───────────────────────────────────────────────────────────
// Two conditions, both from deployment policy: the deployment must be permitted to produce
// enhanced prose AND its channel must be the website. The second is why a web deployment with
// the enhanced flag off still delivers base, and why a restricted deployment with the flag
// mistakenly on still delivers base.
export function editionForRequest(env, origin) {
  const e = env || {};
  const flag = String(e.STORYBOUND_ENHANCED_EDITION || '').trim().toLowerCase();
  const permitted = flag === 'true' || flag === '1' || flag === 'on' || flag === 'yes'
    || flag === 'web';
  if (!permitted) {
    return { edition: 'base', why: 'deployment_not_enhanced',
      detail: 'STORYBOUND_ENHANCED_EDITION is unset or off for this deployment' };
  }
  const c = channelForRequest(e, origin);
  if (c.channel !== 'web') {
    return { edition: 'base', why: c.why,
      detail: 'this request\'s channel is restricted (' + c.why + '), so only the base edition '
        + 'may be delivered — the enhanced flag alone does not grant it' };
  }
  return { edition: 'enhanced', why: 'deployment_web_and_enhanced', detail: c.detail || null };
}
