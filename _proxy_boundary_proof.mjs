// PROXY-BOUNDARY PROOF (no spend). Closes the gap between CLIENT INTENT (preferredModel on the wire) and
// what /api/proxy actually SENDS UPSTREAM. Steps:
//   1. Run the exact flag-on Modern Scene-1 dry path in the browser (dry harness's own run(), 'valid' mode,
//      window._grokOnlySceneAuthor = true) and retain the exact planner + author request bodies.
//   2. Replay those bodies through the REAL api/proxy.js handler in-process (byte-copy, import path only)
//      with a stubbed upstream fetch. The stub receives the body the proxy built IMMEDIATELY BEFORE its
//      upstream fetch — that body's `model` / `reasoning.effort` and the fetch URL are the assertion subject,
//      alongside the response's `_orchestration.model`.
//   3. Push the two Grok error classes the client harness used (503, empty content) plus a connection
//      failure through the same replay: the proxy must make exactly ONE upstream call per client request,
//      to api.x.ai only, model grok-4.3, and return the error to the client (whose own retry is the second
//      identical body — replayed too).
//   4. RED CONTROLS: mutate the proxy copy (a) so the resolver returns a non-Grok model, (b) so the upstream
//      host is not xAI. The client bodies are unchanged; the assertions must turn RED. A proof that stays
//      green under (a) or (b) would be passing on preferredModel alone.
// usage: node _proxy_boundary_proof.mjs   (dev server on :3000 for step 1; steps 2–4 are in-process)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass, detail }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '\n      ' + (detail || ''))); };
const red = (name, failedAsExpected, detail) => { results.push({ name, pass: failedAsExpected, detail, red: true }); console.log((failedAsExpected ? '  ✓ RED ' : '  ✗ RED-NOT-RED ') + name + (failedAsExpected ? '' : '\n      ' + (detail || ''))); };

// ── 1. exact client bodies from the flag-on dry path ─────────────────────────────────────────────
const dry = fs.readFileSync('_scene1_stage_order_dry.mjs', 'utf8');
const cut = dry.indexOf('const G = await run(');
const lib = dry.slice(0, cut).replace(/^await preflight\(\);\s*$/m, '') + '\nexport { run, modern, seeded, ok, results };\n';
fs.writeFileSync('_stage_order_lib.generated.mjs', lib);
const L = await import('./_stage_order_lib.generated.mjs');
const modernGrokOnly = () => { const s = window.state; window.__disableSpeculativePreload = true; window._grokOnlySceneAuthor = true;
  s.picks = Object.assign(s.picks || {}, { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'Billionaire', dynamic: 'Enemies', pov: 'first_person', length: 'fling', intensity: 'low', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Testa', partnerName: 'Rook' } });
  Object.assign(s, { world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies', archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null }, name: 'Testa', playerName: 'Testa', loveInterestName: 'Rook', partnerName: 'Rook', loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'low', pov: 'first_person', identity: { playerName: 'Testa', partnerName: 'Rook' }, renderMode: 'literary', currentEngine: 'literary', storyId: 'boundary-' + Math.random().toString(36).slice(2, 8), myUid: 'probe', _skipCorridorValidation: true });
  s.picks.identity = s.identity; };
const W = await L.run('flag-on Modern Scene 1 · body capture', modernGrokOnly, 'valid');
const plannerBodies = W.bodies.filter(x => x.kind === 'planner');
const authorBodies = W.bodies.filter(x => x.kind === 'author');
fs.writeFileSync('_validate_out/proxy_boundary_bodies.json', JSON.stringify({ planner: plannerBodies.map(x => ({ url: x.url, role: x.body.role, model: x.body.model, preferredModel: x.body.preferredModel, reasoningEffort: x.body.reasoningEffort, response_format: x.body.response_format, max_tokens: x.body.max_tokens, sysBytes: Buffer.byteLength(String((x.body.messages || []).find(m => m.role === 'system')?.content || '')), usrBytes: Buffer.byteLength(String((x.body.messages || []).find(m => m.role === 'user')?.content || '')) })), author: authorBodies.map(x => ({ url: x.url, role: x.body.role, model: x.body.model, preferredModel: x.body.preferredModel, max_tokens: x.body.max_tokens, convId: x.body.convId })) }, null, 2));
ok('B1 the flag-on dry path emitted exactly one planner body and one author body at the client boundary (page mounted)', plannerBodies.length === 1 && authorBodies.length === 1 && W.st.pages === 1, JSON.stringify({ planner: plannerBodies.length, author: authorBodies.length, pages: W.st.pages }));

// ── 2. the real proxy, in-process, with a stubbed upstream ───────────────────────────────────────
const SRC = path.join(ROOT, 'api', 'proxy.js');
const original = fs.readFileSync(SRC, 'utf8');
const sanitizerAbs = pathToFileURL(path.join(ROOT, 'api', '_sanitize-injection.js')).href;
const IMPORT_OLD = "import _sanitizeInjectionMod from './_sanitize-injection.js';";
const makeCopy = (name, mutate) => { let c = original.replace(IMPORT_OLD, `import _sanitizeInjectionMod from '${sanitizerAbs}';`); if (c === original) throw new Error('import line not found'); if (mutate) { const m = mutate(c); if (m === c) throw new Error('mutation did not apply: ' + name); c = m; } const p = path.join(ROOT, '_validate_out', `proxy.boundary-${name}.mjs`); fs.writeFileSync(p, c); return p; };
process.env.XAI_API_KEY = 'unit-test-placeholder';   // placeholder so the handler passes its key guard; not a credential
delete process.env.SB_FORCE_AUTHOR_MODEL;

let upstream = [];    // every upstream fetch the proxy attempts: { url, model, effort, response_format }
let script = [];      // per-call upstream behaviour
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  upstream.push({ url: String(url), model: body.model, effort: body.reasoning && body.reasoning.effort, response_format: body.response_format || null, max_tokens: body.max_tokens });
  const step = script[upstream.length - 1] || { status: 200, content: 'ok' };
  if (step.abort) return new Promise((_, reject) => { const e = new Error('connection failed'); e.name = 'TypeError'; setTimeout(() => reject(e), 5); });
  const payload = step.status === 200
    ? { id: 'u', object: 'chat.completion', model: body.model, choices: [{ index: 0, message: { role: 'assistant', content: step.content }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, completion_tokens_details: { reasoning_tokens: 0 } } }
    : { error: { message: 'upstream ' + step.status } };
  return { ok: step.status === 200, status: step.status, text: async () => JSON.stringify(payload) };
};
const mkRes = () => { const r = { statusCode: null, payload: null }; r.setHeader = () => {}; r.status = c => { r.statusCode = c; return r; }; r.json = p => { r.payload = p; return r; }; r.end = () => r; return r; };
const replay = async (handler, body, sc) => { upstream = []; script = sc || []; const res = mkRes(); await handler({ method: 'POST', headers: { origin: 'http://localhost:3000' }, body: JSON.parse(JSON.stringify(body)) }, res); return { res, upstream: upstream.slice() }; };
const isXai = u => /^https:\/\/api\.x\.ai\/v1\/chat\/completions$/.test(u);
const summary = r => ({ status: r.res.statusCode, upstreamCalls: r.upstream.length, upstream: r.upstream.map(u => ({ host: u.url.replace(/^https?:\/\/([^/]+).*/, '$1'), model: u.model, effort: u.effort, rf: u.response_format && u.response_format.type })), orchestrationModel: r.res.payload && r.res.payload._orchestration && r.res.payload._orchestration.model });

const { default: proxyReal } = await import(pathToFileURL(makeCopy('real', null)).href);
const pb = plannerBodies[0].body, ab = authorBodies[0].body;

const rp = await replay(proxyReal, pb);
ok('B2 PROXY BOUNDARY — OPENING_PLANNER body: exactly one upstream fetch, to api.x.ai, upstream body model=grok-4.3, effort=none, response_format=json_object; response _orchestration.model=grok-4.3',
  rp.upstream.length === 1 && isXai(rp.upstream[0].url) && rp.upstream[0].model === 'grok-4.3' && rp.upstream[0].effort === 'none' && rp.upstream[0].response_format && rp.upstream[0].response_format.type === 'json_object' && rp.res.statusCode === 200 && rp.res.payload._orchestration.model === 'grok-4.3' && rp.res.payload._orchestration.role === 'OPENING_PLANNER',
  JSON.stringify(summary(rp)));
const ra = await replay(proxyReal, ab);
ok('B3 PROXY BOUNDARY — NARRATIVE_AUTHOR_GROK_ONLY body (client sent preferredModel only, model=null): exactly one upstream fetch, to api.x.ai, upstream body model=grok-4.3; response _orchestration.model=grok-4.3',
  ra.upstream.length === 1 && isXai(ra.upstream[0].url) && ra.upstream[0].model === 'grok-4.3' && ra.res.statusCode === 200 && ra.res.payload._orchestration.model === 'grok-4.3' && ra.res.payload._orchestration.role === 'NARRATIVE_AUTHOR_GROK_ONLY' && (ab.model === undefined || ab.model === null) && ab.preferredModel === 'grok-4.3',
  JSON.stringify({ clientIntent: { model: ab.model === undefined ? 'undefined' : ab.model, preferredModel: ab.preferredModel }, proxy: summary(ra) }));
ok('B3b the author\'s resolved effort is HIGH (the shipped author setting; the client sets none, the single-entry chain resolves grok-4.3 → high) — recorded as the policy in force', ra.upstream[0].effort === 'high', JSON.stringify({ effort: ra.upstream[0].effort }));

// ── 3. the error classes through the same path: client attempt 1, then the client's identical retry ─
const errorCases = [['503', [{ status: 503 }]], ['empty content (200)', [{ status: 200, content: '' }]], ['connection failure', [{ abort: true }]]];
for (const [what, sc] of errorCases) {
  const a1 = await replay(proxyReal, ab, sc);
  const a2 = await replay(proxyReal, ab, sc);   // the client's ONE bounded retry = an identical body
  const both = [a1, a2];
  const everyXaiGrok = both.every(r => r.upstream.every(u => isXai(u.url) && u.model === 'grok-4.3'));
  const oneUpstreamEach = both.every(r => r.upstream.length === 1);
  const noSuccessLeaked = what === 'empty content (200)' ? both.every(r => r.res.statusCode === 200 && r.res.payload.choices[0].message.content === '') : both.every(r => r.res.statusCode !== 200);
  ok(`B4 error class "${what}" — attempt + retry: each client request = exactly ONE upstream fetch, both to api.x.ai model grok-4.3; nothing left the proxy toward any other host; the proxy returned the failure to the client (no fallback of its own)`,
    everyXaiGrok && oneUpstreamEach && noSuccessLeaked, JSON.stringify({ attempt1: summary(a1), attempt2: summary(a2) }));
}
// The planner error path too (503): one upstream call, xAI, grok-4.3, error returned.
const p503 = await replay(proxyReal, pb, [{ status: 503 }]);
ok('B4p OPENING_PLANNER 503: one upstream fetch to api.x.ai model grok-4.3, 503 returned to the client', p503.upstream.length === 1 && isXai(p503.upstream[0].url) && p503.upstream[0].model === 'grok-4.3' && p503.res.statusCode === 503, JSON.stringify(summary(p503)));

// ── 4. RED CONTROLS — the assertions must be pinned to the proxy's resolution, not to preferredModel ─
const assertGrok = (r) => r.upstream.length === 1 && isXai(r.upstream[0].url) && r.upstream[0].model === 'grok-4.3' && r.res.statusCode === 200 && r.res.payload._orchestration.model === 'grok-4.3';
// (a) resolver returns a non-Grok model name: every chain entry resolves through _resolveGrokModel's final return.
const { default: proxyMutModel } = await import(pathToFileURL(makeCopy('mut-model', c => c.replace("return { model: 'grok-4.3', effort };", "return { model: 'mutant-not-grok', effort };"))).href);
const mp = await replay(proxyMutModel, pb), ma = await replay(proxyMutModel, ab);
red('R-a resolver mutated to a non-Grok model → B2/B3 assertions FAIL for both roles while the client bodies still say preferredModel=grok-4.3', !assertGrok(mp) && !assertGrok(ma) && mp.upstream[0] && mp.upstream[0].model === 'mutant-not-grok' && ma.upstream[0].model === 'mutant-not-grok', JSON.stringify({ planner: summary(mp), author: summary(ma) }));
// (b) upstream host mutated away from xAI: the "nothing leaves toward another host" assertion must fail.
const { default: proxyMutHost } = await import(pathToFileURL(makeCopy('mut-host', c => c.replace("'https://api.x.ai/v1/chat/completions'", "'https://api.openai.com/v1/chat/completions'"))).href);
const hp = await replay(proxyMutHost, pb), ha = await replay(proxyMutHost, ab);
red('R-b upstream host mutated to api.openai.com → the xAI-only assertion FAILS for both roles (a request left toward another provider)', !assertGrok(hp) && !assertGrok(ha) && /openai\.com/.test(hp.upstream[0].url) && /openai\.com/.test(ha.upstream[0].url), JSON.stringify({ planner: summary(hp), author: summary(ha) }));
// (c) role mapping mutated away from the single Grok entry for the planner: the chain becomes the legacy 3-entry chain,
//     which STILL resolves to grok-4.3 (the proxy is structurally Grok-only) but with effort HIGH by default → the planner's
//     effort assertion fails. This documents that a role-mapping change cannot leave Grok at all in this proxy; only the
//     resolver/host can, which (a) and (b) cover.
const { default: proxyMutRole } = await import(pathToFileURL(makeCopy('mut-role', c => c.replace(/OPENING_PLANNER:\s*\[\s*'grok-4\.3'\s*\]/, "OPENING_PLANNER: ['grok-4-1-fast-reasoning', 'grok-4-1-fast-non-reasoning', 'grok-4.3']"))).href);
const rpm = await replay(proxyMutRole, Object.assign({}, pb, { reasoningEffort: undefined, preferredModel: undefined }));
red('R-c planner role chain mutated to the legacy 3-entry chain (client effort/preferredModel removed) → model STILL grok-4.3 (proxy is structurally Grok-only) but effort becomes high → the B2 effort assertion FAILS', rpm.upstream.length === 1 && rpm.upstream[0].model === 'grok-4.3' && rpm.upstream[0].effort === 'high', JSON.stringify(summary(rpm)));
ok('B5 the tested "real" copy differs from api/proxy.js by exactly one line (the sanitizer import)', original.split('\n').filter((l, i) => l !== fs.readFileSync(path.join(ROOT, '_validate_out', 'proxy.boundary-real.mjs'), 'utf8').split('\n')[i]).length === 1, '');

const fails = results.filter(x => !x.pass).length;
console.log(`\n${results.length} checks · ${results.length - fails} passed · ${fails} failed`);
fs.writeFileSync('_validate_out/proxy_boundary_proof.json', JSON.stringify({ at: new Date().toISOString(), results, clientBodies: JSON.parse(fs.readFileSync('_validate_out/proxy_boundary_bodies.json', 'utf8')) }, null, 2));
process.exit(fails ? 1 : 0);
