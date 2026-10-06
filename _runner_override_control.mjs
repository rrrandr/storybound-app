// DOES THE RUNNER'S OWN CALL SITE REFUSE AN UNPRICED OVERRIDE? Provider-free, $0.
//
// Codex 2026-10-05: the estimator was repaired but the RUNNER still rebuilt a stripped body
// ({ messages, max_tokens }), so an _sbModelOverride of grok-4.7 was discarded before pricing —
// refused when the estimator was called directly, allowed through the runner. Testing the helper
// could never catch that. This exercises the caller's ARGUMENT CONSTRUCTION, as written in the
// runner source, and checks the refusal happens BEFORE route.fetch.
import fs from 'fs';
import { estimateUsd } from './_fsc_cost_guard.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const src = fs.readFileSync('_fs_live_sequence.mjs', 'utf8');

// ── 1. THE ARGUMENT CONSTRUCTION, LIFTED FROM THE RUNNER ───────────────────────────────────
// Take the real expression the runner uses to build the estimator's first argument and evaluate
// it against a request body. If the runner drops a field, this drops it too.
const m = src.match(/const quote = estimateUsd\(\{([\s\S]*?)\},\s*requested,\s*url\);/);
if (!m) { console.log('  FAIL could not find the estimator call site in the runner'); process.exit(1); }
const argExpr = '{' + m[1] + '}';
console.log('=== THE RUNNER\'S ACTUAL ARGUMENT CONSTRUCTION ===');
console.log('  ' + argExpr.replace(/\s+/g, ' ').slice(0, 200));
const buildArg = new Function('body', 'return (' + argExpr + ');');

const REQ = {
  messages: [{ role: 'system', content: 'x'.repeat(40000) }],
  max_tokens: 4000,
  model: 'grok-4-1-fast-reasoning',
  _sbModelOverride: 'grok-4.7'          // EXPERIMENT-ONLY, no published rate in this repo
};
const built = buildArg(REQ);
console.log('');
t('the runner carries _sbModelOverride into the estimator',
  built._sbModelOverride === 'grok-4.7',
  'built keys: ' + JSON.stringify(Object.keys(built)));

const viaRunner = estimateUsd(built, 'grok-4-1-fast-reasoning', 'http://x/api/proxy');
const viaDirect = estimateUsd(REQ, 'grok-4-1-fast-reasoning', 'http://x/api/proxy');
console.log('  through the runner\'s argument:  '
  + (viaRunner.bounded ? '$' + viaRunner.estimate.toFixed(6) + ' as ' + viaRunner.model : 'REFUSED'));
console.log('  with the full request body:     '
  + (viaDirect.bounded ? '$' + viaDirect.estimate.toFixed(6) + ' as ' + viaDirect.model : 'REFUSED'));
t('an unpriced override is REFUSED through the RUNNER\'S argument', viaRunner.bounded === false,
  viaRunner.bounded ? ('priced as ' + viaRunner.model + ' — the caller is still stripping it') : '');
t('the runner and a direct call now agree', viaRunner.bounded === viaDirect.bounded);

// ── 2. THE REFUSAL MUST PRECEDE route.fetch IN THE SOURCE ──────────────────────────────────
console.log('');
console.log('=== ORDER OF OPERATIONS IN THE RUNNER ===');
const iQuote = src.indexOf('const quote = estimateUsd(');
const iRefuse = src.indexOf('if (!quote.bounded)');
const iFetch = src.indexOf('route.fetch(');
console.log('  estimateUsd at ' + iQuote + ' · bounded-check at ' + iRefuse + ' · route.fetch at ' + iFetch);
t('the estimate is taken before the bounded check', iQuote > 0 && iRefuse > iQuote);
t('the bounded check precedes route.fetch', iFetch > 0 && iRefuse < iFetch,
  'a refusal after the request has left is not a refusal');
t('the refusal returns a 503 rather than letting the call through',
  /if \(!quote\.bounded\)[\s\S]{0,600}?status: 503/.test(src));
t('and it HALTS the run, so a refused dispatch is not silently retried',
  /if \(!quote\.bounded\)[\s\S]{0,300}?halted = true/.test(src));

// ── 3. A PRICED OVERRIDE STILL PASSES ──────────────────────────────────────────────────────
console.log('');
const okReq = Object.assign({}, REQ, { _sbModelOverride: 'grok-4.3' });
const okQuote = estimateUsd(buildArg(okReq), 'grok-4-1-fast-reasoning', 'http://x/api/proxy');
t('a PRICED override (grok-4.3) still passes through the runner\'s argument',
  okQuote.bounded === true && okQuote.model === 'grok-4.3',
  JSON.stringify({ bounded: okQuote.bounded, model: okQuote.model }));
const noOv = estimateUsd(buildArg(Object.assign({}, REQ, { _sbModelOverride: undefined })),
  'grok-4-1-fast-reasoning', 'http://x/api/proxy');
t('and an ordinary grok dispatch is unaffected', noOv.bounded && noOv.model === 'grok-4.3');

console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
