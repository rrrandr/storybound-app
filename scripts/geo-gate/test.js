// Deterministic geo-policy tests. No network, no Stripe, no API cost.
//   node scripts/geo-gate/test.js
'use strict';

// Ensure a clean baseline; each case sets exactly the env it needs.
const GEO_ENV = ['GEO_GATE_ENABLED', 'GEO_GATE_MODE', 'GEO_BLOCK_COUNTRIES', 'GEO_GATE_EVAL_IN_DEV', 'GEO_GATE_TEST_COUNTRY', 'VERCEL_ENV'];
function resetEnv(overrides) {
  GEO_ENV.forEach((k) => { delete process.env[k]; });
  Object.keys(overrides || {}).forEach((k) => { process.env[k] = overrides[k]; });
}

const G = require('../../config/geo-policy.js');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ FAIL:', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`); }

// ── normalizeCountryCode ──
resetEnv();
eq(G.normalizeCountryCode('sa'), 'SA', 'normalize lowercases→upper');
eq(G.normalizeCountryCode(' us '), 'US', 'normalize trims');
eq(G.normalizeCountryCode('USA'), null, 'normalize rejects 3-letter');
eq(G.normalizeCountryCode(''), null, 'normalize rejects empty');
eq(G.normalizeCountryCode(null), null, 'normalize rejects null');
eq(G.normalizeCountryCode('1A'), null, 'normalize rejects non-alpha');

// ── getGeoPolicy env parsing ──
resetEnv({ GEO_BLOCK_COUNTRIES: 'sa, ae ,KW,,bad3' });
const pol = G.getGeoPolicy();
eq(pol.enabled, true, 'default enabled=true');
eq(pol.mode, 'log', 'default mode=log');
eq(JSON.stringify(pol.blockList), JSON.stringify(['SA', 'AE', 'KW']), 'blockList normalized + junk dropped');

resetEnv({ GEO_GATE_ENABLED: 'false' });
eq(G.geoGateEnabled(), false, 'GEO_GATE_ENABLED=false disables');
resetEnv({ GEO_GATE_MODE: 'ENFORCE' });
eq(G.getGeoPolicy().mode, 'enforce', 'mode case-insensitive → enforce');

// ── isCountryBlocked ──
resetEnv({ GEO_BLOCK_COUNTRIES: 'SA,AE' });
eq(G.isCountryBlocked('sa'), true, 'blocked country (case-insensitive)');
eq(G.isCountryBlocked('US'), false, 'allowed country not blocked');
eq(G.isCountryBlocked('ZZ'), false, 'unlisted not blocked');
eq(G.isCountryBlocked(null), false, 'null not blocked');

// ── evaluateGeo decision matrix ──
const enforce = { GEO_GATE_MODE: 'enforce', GEO_BLOCK_COUNTRIES: 'SA,AE' };
const logmode = { GEO_GATE_MODE: 'log', GEO_BLOCK_COUNTRIES: 'SA,AE' };

resetEnv(enforce);
let d = G.evaluateGeo('SA', { isDev: false });
eq(d.decision, 'block', 'enforce + blocked → block'); eq(d.blocked, true, 'enforce block → blocked=true'); eq(d.reason, 'country_blocked', 'block reason');

resetEnv(enforce);
d = G.evaluateGeo('US', { isDev: false });
eq(d.decision, 'allow', 'enforce + allowed → allow'); eq(d.blocked, false, 'allowed → blocked=false'); eq(d.reason, 'country_allowed', 'allow reason');

resetEnv(logmode);
d = G.evaluateGeo('SA', { isDev: false });
eq(d.decision, 'log_only', 'log + blocked-country → log_only'); eq(d.blocked, false, 'log mode never enforces (blocked=false)'); eq(d.reason, 'country_blocked', 'log_only keeps country_blocked reason');

resetEnv(enforce);
d = G.evaluateGeo(null, { isDev: false });
eq(d.decision, 'unknown_allow', 'unknown country → unknown_allow'); eq(d.blocked, false, 'unknown → not blocked'); eq(d.reason, 'unknown_country', 'unknown reason');

resetEnv(enforce);
d = G.evaluateGeo('SA', { isDev: true });
eq(d.decision, 'dev_allow', 'dev bypass even for blocked country'); eq(d.blocked, false, 'dev → not blocked'); eq(d.reason, 'dev', 'dev reason');

resetEnv({ GEO_GATE_ENABLED: 'false', GEO_GATE_MODE: 'enforce', GEO_BLOCK_COUNTRIES: 'SA' });
d = G.evaluateGeo('SA', { isDev: false });
eq(d.decision, 'allow', 'disabled gate → allow even for blocked country'); eq(d.blocked, false, 'disabled → not blocked'); eq(d.reason, 'disabled', 'disabled reason');

// ── isDevEnv ──
resetEnv({ VERCEL_ENV: 'production' });
eq(G.isDevEnv(), false, 'production → not dev');
resetEnv({ VERCEL_ENV: 'preview' });
eq(G.isDevEnv(), true, 'preview → dev');
resetEnv({});
eq(G.isDevEnv(), true, 'unset VERCEL_ENV → dev');
resetEnv({ VERCEL_ENV: 'preview', GEO_GATE_EVAL_IN_DEV: 'true' });
eq(G.isDevEnv(), false, 'GEO_GATE_EVAL_IN_DEV forces non-dev in preview');

// ── readRequestCountry ──
resetEnv({ VERCEL_ENV: 'production' });
eq(G.readRequestCountry({ headers: { 'x-vercel-ip-country': 'gb' } }), 'GB', 'reads + normalizes header');
eq(G.readRequestCountry({ headers: {} }), null, 'no header → null');
eq(G.readRequestCountry(null), null, 'no req → null');
resetEnv({ VERCEL_ENV: 'production', GEO_GATE_TEST_COUNTRY: 'SA' });
eq(G.readRequestCountry({ headers: { 'x-vercel-ip-country': 'US' } }), 'US', 'test-country override ignored in production');
resetEnv({ GEO_GATE_TEST_COUNTRY: 'SA' }); // dev (VERCEL_ENV unset)
eq(G.readRequestCountry({ headers: { 'x-vercel-ip-country': 'US' } }), 'SA', 'test-country override applies in dev');

// ── freeAdultContentGateEnabled (stub, off by default) ──
resetEnv({});
eq(G.freeAdultContentGateEnabled(), false, 'free/adult gate off by default');
resetEnv({ GEO_GATE_FREE_ADULT_CONTENT: 'true' });
eq(G.freeAdultContentGateEnabled(), true, 'free/adult gate flag readable');

resetEnv();
console.log(`\nGEO-POLICY: ${pass} passed, ${fail} failed`);
if (fail) { console.error('RESULT: ✗ FAIL'); process.exit(1); }
console.log('RESULT: ✓ PASS — policy, decision matrix, dev bypass, request-country, stub flag all correct.');
