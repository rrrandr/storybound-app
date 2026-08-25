// COMMIT C — Mistral routing contract, verified against the ACTUAL upstream body.
//
// The defect: /api/mistral-proxy allowlisted only ['low','medium','high'], so a caller
// sending reasoning_effort:'none' had it coerced to null and dropped — and an author-class
// default could then switch reasoning to 'high'. Omitting the field is NOT the same as
// requesting none, so the skeleton route was never provably non-reasoning.
//
// This calls the handler directly with a stubbed global fetch, so the body Mistral WOULD
// have received is inspected. No network, no key, no model call.
//
// usage: node _mistral_reasoning_contract.mjs
import { pathToFileURL } from 'url';

process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test-key-not-used';
const handler = (await import(pathToFileURL(process.cwd() + '/api/mistral-proxy.js').href)).default;

let upstream = null, calls = 0;
globalThis.fetch = async (url, init) => {
  calls++;
  upstream = { url: String(url), body: JSON.parse((init && init.body) || '{}') };
  return {
    ok: true, status: 200,
    text: async () => JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
    json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] })
  };
};

const AUTHOR_SYS = ' ═══ STORYBOUND ARCHITECTURE LAWS — PHASE 1 ═══ laws follow';
function mkRes() {
  const r = { statusCode: 200, payload: null, headers: {} };
  r.status = c => { r.statusCode = c; return r; };
  r.json = p => { r.payload = p; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = () => r;
  return r;
}
async function call(body) {
  upstream = null; calls = 0;
  const res = mkRes();
  await handler({ method: 'POST', body, headers: {} }, res);
  return { res, upstream, calls };
}
const base = (extra = {}) => ({
  model: 'mistral-small-latest', temperature: 0.4, max_tokens: 1400,
  messages: [{ role: 'system', content: 'You define narrative skeletons.' },
             { role: 'user', content: 'plan the scene' }],
  ...extra
});

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
console.log(`\n${'═'.repeat(80)}\nMISTRAL REASONING / JSON-MODE CONTRACT\n${'═'.repeat(80)}\n`);

// 1. explicit none
let r = await call(base({ reasoning_effort: 'none' }));
t('explicit none forwarded upstream', r.upstream && r.upstream.body.reasoning_effort === 'none',
  JSON.stringify(r.upstream && r.upstream.body.reasoning_effort));

// 2. explicit high
r = await call(base({ reasoning_effort: 'high' }));
t('explicit high forwarded upstream', r.upstream && r.upstream.body.reasoning_effort === 'high');

// 3. absent + author-class → default applies
r = await call(base({ messages: [{ role: 'system', content: AUTHOR_SYS }, { role: 'user', content: 'x' }] }));
t('absent + author-class → default high', r.upstream && r.upstream.body.reasoning_effort === 'high',
  JSON.stringify(r.upstream && r.upstream.body.reasoning_effort));

// 4. absent + non-author → no field at all
r = await call(base());
t('absent + non-author → field omitted', r.upstream && !('reasoning_effort' in r.upstream.body));

// 5. THE REGRESSION: explicit none must survive an architecture-laws payload
r = await call(base({ reasoning_effort: 'none',
  messages: [{ role: 'system', content: AUTHOR_SYS }, { role: 'user', content: 'x' }] }));
t('explicit none SURVIVES an architecture-laws prompt',
  r.upstream && r.upstream.body.reasoning_effort === 'none',
  `got ${JSON.stringify(r.upstream && r.upstream.body.reasoning_effort)} — the author-class default must not override an explicit value`);

// 6. invalid → 400, and nothing dispatched
r = await call(base({ reasoning_effort: 'lowish' }));
t('invalid reasoning_effort → 400', r.res.statusCode === 400, `status ${r.res.statusCode}`);
t('invalid reasoning_effort → no upstream call', r.calls === 0);
t('400 body names the field', !!(r.res.payload && r.res.payload.error === 'invalid_reasoning_effort'),
  JSON.stringify(r.res.payload));

// 7. JSON mode forwarded
r = await call(base({ response_format: { type: 'json_object' } }));
t('response_format json_object forwarded', !!(r.upstream && r.upstream.body.response_format
  && r.upstream.body.response_format.type === 'json_object'));

// 8. invalid response_format → 400
r = await call(base({ response_format: { type: 'xml' } }));
t('invalid response_format → 400', r.res.statusCode === 400 && r.res.payload.error === 'invalid_response_format',
  `status ${r.res.statusCode} ${JSON.stringify(r.res.payload)}`);
t('invalid response_format → no upstream call', r.calls === 0);

// 9. combined, as the skeleton route will send it
r = await call(base({ reasoning_effort: 'none', response_format: { type: 'json_object' } }));
t('skeleton combination forwarded intact',
  r.upstream && r.upstream.body.reasoning_effort === 'none'
  && r.upstream.body.response_format.type === 'json_object'
  && r.upstream.body.model === 'mistral-small-latest'
  && r.upstream.body.max_tokens === 1400);

console.log(`\n  no network: every upstream call was intercepted in-process.`);
console.log(`\n${'─'.repeat(80)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
