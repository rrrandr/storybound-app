// ─────────────────────────────────────────────────────────────────────────────
// Storybound geo-gate policy (Roman 2026-07-10)
//
// Reasonable-effort, COUNTRY-based compliance gate for adult content + payment
// access. This is NOT a language gate — Arabic / Korean / Japanese / etc. stay
// available by language preference; the gate only cares about country and, at
// the money path, the Stripe BILLING country.
//
// NOT LEGAL ADVICE. The block list is env-configurable and empty by default —
// this file builds the MECHANISM, not a hard-coded legal conclusion. Populate
// GEO_BLOCK_COUNTRIES (reviewed with counsel) to activate blocking.
//
// CommonJS on purpose: api/*.js (ESM, Vercel-compiled) default-import this, and
// the deterministic node test (`scripts/geo-gate/test.js`, CJS) require()s it.
//
// Env vars:
//   GEO_GATE_ENABLED       = 'true' | 'false'         (default true — mechanism active)
//   GEO_GATE_MODE          = 'log'  | 'enforce'       (default 'log'  — observe, don't block)
//   GEO_BLOCK_COUNTRIES    = 'SA,AE,KW,...'            (default empty — nothing blocked)
//   GEO_GATE_EVAL_IN_DEV   = 'true'                    (force evaluation in dev/preview; else dev = allow)
//   GEO_GATE_TEST_COUNTRY  = 'SA'                      (dev-only override for the request country)
//   GEO_GATE_FREE_ADULT_CONTENT = 'true' | 'false'    (default false — optional free/adult gen gate, unwired)
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ISO-3166 alpha-2 → uppercase two-letter code, or null if not a plausible code.
function normalizeCountryCode(cc) {
  if (cc == null) return null;
  const s = String(cc).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

function _envBool(name, dflt) {
  const v = process.env[name];
  if (v == null || v === '') return dflt;
  return String(v).trim().toLowerCase() === 'true';
}

// Live-read (never cached) so the deterministic tests can mutate process.env between cases.
function getGeoPolicy() {
  const enabled = _envBool('GEO_GATE_ENABLED', true);
  const mode = String(process.env.GEO_GATE_MODE || 'log').trim().toLowerCase() === 'enforce' ? 'enforce' : 'log';
  const blockList = String(process.env.GEO_BLOCK_COUNTRIES || '')
    .split(',')
    .map(normalizeCountryCode)
    .filter(Boolean);
  return { enabled, mode, blockList };
}

function geoGateEnabled() {
  return getGeoPolicy().enabled;
}

function isCountryBlocked(cc) {
  const n = normalizeCountryCode(cc);
  if (!n) return false;
  return getGeoPolicy().blockList.indexOf(n) !== -1;
}

// dev/preview → allow, UNLESS GEO_GATE_EVAL_IN_DEV forces real evaluation.
// Unset VERCEL_ENV (plain local node) is treated as dev.
function isDevEnv() {
  if (_envBool('GEO_GATE_EVAL_IN_DEV', false)) return false;
  return String(process.env.VERCEL_ENV || 'development') !== 'production';
}

// Country for a serverless request: Vercel's edge geo header, or a dev-only override.
// Never reads or returns the raw IP.
function readRequestCountry(req) {
  try {
    const override = process.env.GEO_GATE_TEST_COUNTRY;
    if (override && isDevEnv()) return normalizeCountryCode(override);
    const h = (req && req.headers) || {};
    const raw = h['x-vercel-ip-country'] || h['X-Vercel-IP-Country'] || (req && req.geo && req.geo.country) || null;
    return normalizeCountryCode(raw);
  } catch (_) { return null; }
}

// Pure decision. `opts.isDev` and `opts.policy` are injectable so tests stay deterministic.
//
// decision ∈ allow | block | log_only | unknown_allow | dev_allow
// reason   ∈ country_allowed | country_blocked | unknown_country | disabled | dev
// `blocked` = will this request actually be ENFORCED-blocked right now (enabled + enforce + on list).
function evaluateGeo(country, opts) {
  opts = opts || {};
  const policy = opts.policy || getGeoPolicy();
  const cc = normalizeCountryCode(country);
  const base = { enabled: policy.enabled, mode: policy.mode, country: cc };

  if (!policy.enabled) return Object.assign(base, { blocked: false, decision: 'allow', reason: 'disabled' });
  if (opts.isDev)      return Object.assign(base, { blocked: false, decision: 'dev_allow', reason: 'dev' });
  if (!cc)             return Object.assign(base, { blocked: false, decision: 'unknown_allow', reason: 'unknown_country' });

  const onList = policy.blockList.indexOf(cc) !== -1;
  if (!onList)         return Object.assign(base, { blocked: false, decision: 'allow', reason: 'country_allowed' });

  // On the block list: enforce → hard block; log → would-block (observed only).
  if (policy.mode === 'enforce') return Object.assign(base, { blocked: true, decision: 'block', reason: 'country_blocked' });
  return Object.assign(base, { blocked: false, decision: 'log_only', reason: 'country_blocked' });
}

// Optional, OFF by default: a future server-side gate for free/adult generation.
// Only the flag lives here now — nothing is wired to it (payment gate is the priority).
function freeAdultContentGateEnabled() {
  return _envBool('GEO_GATE_FREE_ADULT_CONTENT', false);
}

// Structured server log line — country code + decision only, NEVER the raw IP or card data.
function geoLog(event, decision, extra) {
  try {
    const rec = {
      country: (decision && decision.country) || null,
      decision: (decision && decision.decision) || null,
      mode: (decision && decision.mode) || null,
      reason: (decision && decision.reason) || null,
    };
    if (extra && typeof extra === 'object') Object.keys(extra).forEach((k) => { rec[k] = extra[k]; });
    console.log('[GEO-GATE]', event, JSON.stringify(rec));
  } catch (_) {}
}

module.exports = {
  normalizeCountryCode,
  getGeoPolicy,
  geoGateEnabled,
  isCountryBlocked,
  isDevEnv,
  readRequestCountry,
  evaluateGeo,
  freeAdultContentGateEnabled,
  geoLog,
};
