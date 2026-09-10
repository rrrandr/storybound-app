// OPENING_PLANNER ROUTE — PROXY UNIT CONTROLS (no network). Drives api/proxy.js's handler with a stubbed
// global fetch and asserts the upstream body and the attempt count for the Scene-1 opening planner role.
// The handler is imported from a byte-copy whose ONLY change is the sanitizer import path (the file is
// ESM inside a CJS package, so it cannot be imported in place). usage: node _proxy_opening_planner_unit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'api', 'proxy.js');
const OUT_DIR = path.join(ROOT, '_validate_out');
const COPY = path.join(OUT_DIR, 'proxy.unit-copy.mjs');
const original = fs.readFileSync(SRC, 'utf8');
const sanitizerAbs = pathToFileURL(path.join(ROOT, 'api', '_sanitize-injection.js')).href;
const copy = original.replace("import _sanitizeInjectionMod from './_sanitize-injection.js';", `import _sanitizeInjectionMod from '${sanitizerAbs}';`);
if (copy === original) throw new Error('sanitizer import line not found — copy would not be faithful');
fs.writeFileSync(COPY, copy);
// Placeholder so the handler passes its "key configured" guard. Not a credential.
process.env.XAI_API_KEY = 'unit-test-placeholder';
delete process.env.SB_FORCE_AUTHOR_MODEL;

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '\n      ' + (detail || ''))); };

let calls = [];
let script = [];   // per-call upstream behaviour: { status, body } | { abort:true }
globalThis.fetch = async (url, init) => {
  const step = script[calls.length] || { status: 200, body: okBody() };
  calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
  if (step.abort) {
    return new Promise((_, reject) => { init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); }); });
  }
  return { ok: step.status >= 200 && step.status < 300, status: step.status, text: async () => JSON.stringify(step.body) };
};
const okBody = (extra) => ({ id: 'u', object: 'chat.completion', model: 'grok-4.3', choices: [{ index: 0, message: { role: 'assistant', content: '{"opening_spine":{}}' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 81234, completion_tokens: 812, total_tokens: 82046, completion_tokens_details: { reasoning_tokens: 0 } }, ...(extra || {}) });

const { default: handler } = await import(pathToFileURL(COPY).href);
const mkRes = () => { const r = { headers: {}, statusCode: null, payload: null }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (p) => { r.payload = p; return r; }; r.end = () => r; return r; };
const call = async (body, sc) => { calls = []; script = sc || []; const res = mkRes(); await handler({ method: 'POST', headers: { origin: 'http://localhost:3000' }, body }, res); return res; };
const plannerReq = (extra) => ({ role: 'OPENING_PLANNER', model: 'grok-4.3', preferredModel: 'grok-4.3', temperature: 0.4, max_tokens: 2400, reasoningEffort: 'none', response_format: { type: 'json_object' },
  messages: [{ role: 'system', content: 'You are the scene-structure planner for the OPENING scene.' }, { role: 'user', content: 'STORY CONTEXT …' }], ...(extra || {}) });

// P1 — happy path: one upstream call with the exact body the decision specifies
let r = await call(plannerReq());
const b1 = calls[0] && calls[0].body;
ok('P1 OPENING_PLANNER → exactly ONE upstream call to api.x.ai with model grok-4.3, reasoning.effort none, response_format json_object, max_tokens 2400',
  r.statusCode === 200 && calls.length === 1 && /api\.x\.ai\/v1\/chat\/completions/.test(calls[0].url) && b1.model === 'grok-4.3' && b1.reasoning && b1.reasoning.effort === 'none' && b1.response_format && b1.response_format.type === 'json_object' && b1.max_tokens === 2400,
  JSON.stringify({ status: r.statusCode, calls: calls.length, body: b1 && { model: b1.model, reasoning: b1.reasoning, rf: b1.response_format, mt: b1.max_tokens } }));
ok('P1b usage block passes through verbatim (reasoning_tokens visible to the client) and _orchestration names the role',
  r.payload && r.payload.usage && r.payload.usage.completion_tokens_details && r.payload.usage.completion_tokens_details.reasoning_tokens === 0 && r.payload.usage.prompt_tokens === 81234 && r.payload._orchestration && r.payload._orchestration.role === 'OPENING_PLANNER' && r.payload._orchestration.model === 'grok-4.3',
  JSON.stringify(r.payload && { usage: r.payload.usage, orch: r.payload._orchestration }));

// P2 — 503: propagated, ONE upstream call, no chain advance
r = await call(plannerReq(), [{ status: 503, body: { error: { message: 'upstream busy' } } }]);
ok('P2 upstream 503 → ONE upstream call, 503 returned to the client (the client owns the single retry)', calls.length === 1 && r.statusCode === 503, JSON.stringify({ calls: calls.length, status: r.statusCode }));
// P3 — 429: same
r = await call(plannerReq(), [{ status: 429, body: { error: { message: 'rate limited' } } }]);
ok('P3 upstream 429 → ONE upstream call, 429 returned', calls.length === 1 && r.statusCode === 429, JSON.stringify({ calls: calls.length, status: r.statusCode }));
// P4 — 400 (model-class error): the chain has ONE entry so it is exhausted after one call
r = await call(plannerReq(), [{ status: 400, body: { error: { message: 'bad request' } } }]);
ok('P4 upstream 400 → chain exhausted after ONE call (single-entry chain), 400 with chainTried [grok-4.3]', calls.length === 1 && r.statusCode === 400 && r.payload && Array.isArray(r.payload.chainTried) && r.payload.chainTried.length === 1 && r.payload.chainTried[0] === 'grok-4.3', JSON.stringify({ calls: calls.length, status: r.statusCode, chain: r.payload && r.payload.chainTried }));
// P5 — hang: the guard aborts, and with one chain entry the proxy returns 504 after ONE call
r = await call(plannerReq({ __xaiTimeoutMs: 20 }), [{ abort: true }]);
ok('P5 upstream hang → hang guard trips, ONE call, 504 (no second hidden attempt)', calls.length === 1 && r.statusCode === 504, JSON.stringify({ calls: calls.length, status: r.statusCode }));
// P6 — invalid response_format is refused BEFORE any upstream call
r = await call(plannerReq({ response_format: { type: 'text' } }));
ok('P6 response_format other than json_object → 400 before any upstream call', calls.length === 0 && r.statusCode === 400 && r.payload && r.payload.error === 'invalid_response_format', JSON.stringify({ calls: calls.length, status: r.statusCode, err: r.payload && r.payload.error }));
// P7 — callers that omit response_format send an unchanged upstream body
r = await call({ role: 'RENDERER', temperature: 0.7, max_tokens: 300, messages: [{ role: 'system', content: 'render' }, { role: 'user', content: 'x' }] });
ok('P7 a caller that omits response_format gets an upstream body WITHOUT it (other routes unchanged)', calls.length >= 1 && !('response_format' in calls[0].body) && r.statusCode === 200, JSON.stringify({ keys: calls[0] && Object.keys(calls[0].body) }));
// P8 — the effort default for the planner name would be HIGH; the client's explicit 'none' is what makes it none
r = await call(plannerReq({ reasoningEffort: undefined }));
ok('P8 without the client effort the same role would resolve to effort high — proving the "none" is an explicit client decision, not a default', calls.length === 1 && calls[0].body.reasoning && calls[0].body.reasoning.effort === 'high', JSON.stringify(calls[0] && calls[0].body.reasoning));
// P9 — the copy differs from api/proxy.js by the import line only
const diffLines = original.split('\n').filter((l, i) => l !== copy.split('\n')[i]).length;
ok('P9 the tested copy differs from api/proxy.js by exactly one line (the sanitizer import path)', diffLines === 1, 'diff lines=' + diffLines);

const fails = results.filter(x => !x.pass).length;
console.log('\n' + results.length + ' checks · ' + (results.length - fails) + ' passed · ' + fails + ' failed');
fs.writeFileSync(path.join(OUT_DIR, 'proxy_opening_planner_unit.json'), JSON.stringify(results, null, 2));
process.exit(fails ? 1 : 0);
