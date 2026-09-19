// FULL-SCENE PROSE AUTHOR — GROK-PRIMARY ROUTING POLICY CONTROL (Roman, 2026-09-19)
//
// Dry proof of the new routing policy: Grok primary for EVERY scene (no premium/connecting tier
// gate), ministral-8b-2512 the ONLY fallback (admission-gated against its real, sourced 625,000
// TPM governor allowance — api/_mistral-governor.js), gpt-4o terminal (only after both genuinely
// fail), Mistral Small never in this chain, Grok caching tracked as eligible/hit/miss (never a
// promised discount), and no silent literary fallback — a genuine 3-tier exhaustion throws a
// labeled, inspectable error instead of a bare null.
//
// Sandbox-extracts the real, unmodified source (_isGovernorRefusal + the shared policy block,
// public/app.js) and executes it in Node with a mocked global fetch + StoryboundOrchestration —
// no real network call, no provider call, no image call. Also anchor-extracts the real call
// sites (CG screenplay chain, bounded repair, literary author) to prove they actually invoke the
// shared policy and that Mistral Small / DeepSeek are structurally absent from this role.
//
// usage: node _full_scene_author_routing_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
const orchSrc = fs.readFileSync(path.join(__dirname, 'public/orchestration-client.js'), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════════
section('1. EXTRACTION — the real routing-policy block, verbatim from public/app.js');
// ═══════════════════════════════════════════════════════════════════════════════
const START = 'async function _isGovernorRefusal(res) {';
const END = 'window._authorFullScenePolicy = _authorFullScenePolicy;';
const startIdx = appSrc.indexOf(START);
const endIdx = startIdx === -1 ? -1 : appSrc.indexOf(END, startIdx);
const blockSrc = (startIdx !== -1 && endIdx !== -1) ? appSrc.slice(startIdx, endIdx + END.length) : null;
ok('the real routing-policy block is found intact', !!blockSrc);
ok('the block never references mistral-small-latest (Mistral Small must never appear in this role)', !!blockSrc && !/mistral-small/i.test(blockSrc), 'found mistral-small reference');
ok('the block never references a DeepSeek endpoint (dropped from the 3-tier policy)', !!blockSrc && !/deepseek/i.test(blockSrc));
ok('ministral-8b-2512 IS present (the real fallback model)', !!blockSrc && /ministral-8b-2512/.test(blockSrc));
ok('the sourced 625,000 TPM ceiling is present, matching api/_mistral-governor.js MODEL_LIMITS', !!blockSrc && /625000/.test(blockSrc));

// Cross-check against the REAL server-side governor file — the ceiling used above must match the
// actual configured value, not a copied-then-drifted constant.
const governorSrc = fs.readFileSync(path.join(__dirname, 'api/_mistral-governor.js'), 'utf8');
const govMatch = governorSrc.match(/'ministral-8b-2512':\s*\{\s*tpm:\s*(\d+)/);
ok('the real server governor file confirms ministral-8b-2512 tpm=625000 (not just asserted in app.js)', !!govMatch && govMatch[1] === '625000', govMatch ? govMatch[1] : 'no match found');

function makeSandbox() {
  const calls = [];
  const fetchLog = [];
  let fetchImpl = null; // set per-test
  const win = {
    StoryboundOrchestration: { callChatGPT: null },
    state: {},
  };
  const globalFetch = async (url, opts) => { fetchLog.push({ url, body: opts && opts.body ? JSON.parse(opts.body) : null }); return fetchImpl(url, opts); };
  const body = 'var window = arguments[0]; var fetch = arguments[1]; var console = arguments[2];\n' + blockSrc + '\nreturn { _authorFullScenePolicy: _authorFullScenePolicy, _ministral8bGovernorAdmits: _ministral8bGovernorAdmits, _classifyGrokCacheObservation: _classifyGrokCacheObservation, _fullSceneCacheEligible: _fullSceneCacheEligible, _isGovernorRefusal: _isGovernorRefusal, MINISTRAL_8B_TPM_LIMIT: MINISTRAL_8B_TPM_LIMIT };';
  const fn = new Function(body);
  const quietConsole = { log: () => {}, warn: () => {}, error: () => {} };
  const sandbox = fn(win, globalFetch, quietConsole);
  return { sandbox, win, fetchLog, setFetch: (f) => { fetchImpl = f; } };
}

// ═══════════════════════════════════════════════════════════════════════════════
section('2. GROK IS PRIMARY FOR EVERY SCENE — no tier gate, no branching');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const { sandbox, fetchLog, setFetch } = makeSandbox();
  setFetch(async (url) => {
    if (String(url).indexOf('/api/proxy') !== -1) {
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'grok prose (ordinary scene)' } }], usage: { prompt_tokens: 1000, completion_tokens: 200 } }) };
    }
    throw new Error('unexpected fetch: ' + url);
  });
  const r = await sandbox._authorFullScenePolicy('system prompt (ordinary/connecting scene)', 'user turn', { roleTag: 'test-ordinary' });
  ok('an ORDINARY (non-premium) scene is authored by Grok — no Mistral-first branch exists anymore', r.provider === 'grok', JSON.stringify(r));
  ok('exactly one fetch call was made (Grok succeeded on the first attempt)', fetchLog.length === 1, JSON.stringify(fetchLog));
}
{
  // Same call shape, no signal distinguishing "premium" from "ordinary" is even accepted by the
  // function — proving structurally there is no tier input to branch on.
  const { sandbox, fetchLog, setFetch } = makeSandbox();
  setFetch(async (url) => {
    if (String(url).indexOf('/api/proxy') !== -1) return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'grok prose (tentpole scene)' } }], usage: {} }) };
    throw new Error('unexpected fetch: ' + url);
  });
  const r = await sandbox._authorFullScenePolicy('system prompt (tentpole/climax scene)', 'user turn', { roleTag: 'test-premium' });
  ok('a "premium-shaped" scene is ALSO authored by Grok, via the identical code path (same function, no tier argument exists to differ)', r.provider === 'grok');
}

// ═══════════════════════════════════════════════════════════════════════════════
section('3. MINISTRAL-8B ADMISSION GATE — real 625,000 TPM ceiling, mirrors api/_mistral-governor.js');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const { sandbox } = makeSandbox();
  ok('the real, sourced ceiling is exactly 625,000 (ministral-8b-2512, api/_mistral-governor.js)', sandbox.MINISTRAL_8B_TPM_LIMIT === 625000);
  // The real, previously-measured CG screenplay payload size on record: ≈205k bytes
  // (_first_sacrifice_scene2_call_census_2026_09_19.md §3, citing author_routing_policy_v2.md).
  const realCgPayload = 'x'.repeat(205000);
  const admitsReal = sandbox._ministral8bGovernorAdmits([{ role: 'system', content: realCgPayload }], 8000);
  ok('the REAL, previously-measured ~205k-byte CG screenplay payload IS admitted by ministral-8b-2512 (205,000 + 8,000 = 213,000 ≤ 625,000) — the exact case Mistral Small could never serve (20,000 TPM)', admitsReal.admits === true, JSON.stringify(admitsReal));
  const oversized = sandbox._ministral8bGovernorAdmits([{ role: 'system', content: 'x'.repeat(700000) }], 8000);
  ok('a genuinely oversized prompt (700k bytes) is correctly NOT admitted', oversized.admits === false, JSON.stringify(oversized));
}
{
  // Grok fails → ministral admission passes (small prompt) → ministral serves it.
  const { sandbox, fetchLog, setFetch } = makeSandbox();
  setFetch(async (url) => {
    if (String(url).indexOf('/api/proxy') !== -1) return { ok: false, status: 500, json: async () => ({}) };
    if (String(url).indexOf('/api/mistral-proxy') !== -1) {
      const body = JSON.parse((fetchLog[fetchLog.length - 1] || {}).body ? JSON.stringify(fetchLog[fetchLog.length - 1].body) : '{}');
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ministral prose' } }], model: 'ministral-8b-2512', usage: { prompt_tokens: 500, completion_tokens: 100 } }) };
    }
    throw new Error('unexpected fetch: ' + url);
  });
  const r = await sandbox._authorFullScenePolicy('short system prompt', 'short user turn', { roleTag: 'test-fallback' });
  ok('when Grok fails and the prompt is small enough to admit, ministral-8b-2512 serves it (never Mistral Small)', r.provider === 'ministral' && r.model === 'ministral-8b-2512', JSON.stringify(r));
  const ministralCalls = fetchLog.filter(c => String(c.url).indexOf('/api/mistral-proxy') !== -1);
  ok('the real dispatched request body names model="ministral-8b-2512", never "mistral-small-latest"', ministralCalls.length === 1 && ministralCalls[0].body.model === 'ministral-8b-2512', JSON.stringify(ministralCalls));
}
{
  // Grok fails → prompt is oversized → ministral is SKIPPED (never dispatched) → straight to gpt-4o.
  const { sandbox, win, fetchLog, setFetch } = makeSandbox();
  win.StoryboundOrchestration.callChatGPT = async () => 'gpt-4o terminal prose';
  setFetch(async (url) => {
    if (String(url).indexOf('/api/proxy') !== -1) return { ok: false, status: 500, json: async () => ({}) };
    throw new Error('ministral should never be dispatched for an oversized prompt: ' + url);
  });
  const r = await sandbox._authorFullScenePolicy('x'.repeat(700000), 'user turn', { roleTag: 'test-oversized' });
  ok('an oversized prompt skips ministral entirely (zero /api/mistral-proxy calls) and reaches gpt-4o terminal', r.provider === 'openai' && !fetchLog.some(c => String(c.url).indexOf('/api/mistral-proxy') !== -1), JSON.stringify({ provider: r.provider, fetches: fetchLog.map(c => c.url) }));
  ok('the skip is recorded in attempts with the real reserve/limit numbers, not silently dropped', r.attempts.some(a => a.provider === 'ministral' && a.skipped === true && a.limitTpm === 625000), JSON.stringify(r.attempts));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('4. GOVERNOR-REFUSAL FAILOVER — a live ministral refusal escalates to gpt-4o, never aborts');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const { sandbox, win, setFetch } = makeSandbox();
  win.StoryboundOrchestration.callChatGPT = async () => 'gpt-4o terminal prose (after governor refusal)';
  setFetch(async (url) => {
    if (String(url).indexOf('/api/proxy') !== -1) return { ok: false, status: 500, json: async () => ({}) };
    if (String(url).indexOf('/api/mistral-proxy') !== -1) {
      return { ok: false, status: 429, clone: function () { return this; }, json: async () => ({ governor: true }) };
    }
    throw new Error('unexpected fetch: ' + url);
  });
  const r = await sandbox._authorFullScenePolicy('small system prompt', 'user turn', { roleTag: 'test-governor-refusal' });
  ok('a genuine live governor refusal (429 + governor:true) on ministral escalates to gpt-4o terminal — never aborts the whole attempt', r.provider === 'openai', JSON.stringify(r));
  ok('the governor refusal is recorded distinctly in attempts (governorRefused:true), not conflated with an ordinary outage', r.attempts.some(a => a.provider === 'ministral' && a.governorRefused === true), JSON.stringify(r.attempts));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('5. NO SILENT LITERARY FALLBACK — total exhaustion is a labeled, inspectable error');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const { sandbox, win, setFetch } = makeSandbox();
  win.StoryboundOrchestration.callChatGPT = async () => '';
  setFetch(async (url) => {
    if (String(url).indexOf('/api/proxy') !== -1) return { ok: false, status: 500, json: async () => ({}) };
    if (String(url).indexOf('/api/mistral-proxy') !== -1) return { ok: false, status: 500, json: async () => ({}) };
    throw new Error('unexpected fetch: ' + url);
  });
  let threw = null, caught = null;
  try { await sandbox._authorFullScenePolicy('system prompt', 'user turn', { roleTag: 'test-exhaustion' }); }
  catch (e) { threw = e; caught = e && e._attempts; }
  ok('when all 3 tiers genuinely fail, the function THROWS (never silently returns a fabricated/null-shaped success)', !!threw, threw ? 'ok, threw: ' + threw.message : 'did NOT throw');
  ok('the thrown error carries the real, inspectable per-tier attempt log — a caller can distinguish "all 3 genuinely failed" from any other outcome, never a silent guess', Array.isArray(caught) && caught.length === 3, JSON.stringify(caught));
  ok('the 3 attempts are grok, ministral, openai in that exact order — the policy the caller committed to', Array.isArray(caught) && caught[0].provider === 'grok' && caught[1].provider === 'ministral' && caught[2].provider === 'openai', JSON.stringify(caught));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('6. GROK CACHE — eligible / hit / miss, never a promised discount');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const { sandbox } = makeSandbox();
  ok('a proper [system, ..., user-last] shape is cache-ELIGIBLE (structural judgment only)', sandbox._fullSceneCacheEligible([{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }]) === true);
  ok('a shape with no system message is NOT cache-eligible', sandbox._fullSceneCacheEligible([{ role: 'user', content: 'y' }]) === false);
  ok('a shape where the LAST message is not the user turn is NOT cache-eligible (per-turn material must sit at the end)', sandbox._fullSceneCacheEligible([{ role: 'user', content: 'y' }, { role: 'system', content: 'x' }]) === false);
}
{
  const { sandbox } = makeSandbox();
  const hit = sandbox._classifyGrokCacheObservation({ prompt_tokens: 90000, cache_read_input_tokens: 85000 });
  ok('a real usage block reporting cached_tokens > 0 is labeled an observed HIT', hit.observed === 'hit' && hit.cachedTokens === 85000, JSON.stringify(hit));
  const miss = sandbox._classifyGrokCacheObservation({ prompt_tokens: 90000, cache_read_input_tokens: 0 });
  ok('a real usage block reporting zero cached tokens is labeled an observed MISS — not silently treated as ineligible', miss.observed === 'miss', JSON.stringify(miss));
  const missAlt = sandbox._classifyGrokCacheObservation({ prompt_tokens: 90000, prompt_tokens_details: { cached_tokens: 0 } });
  ok('the OpenAI-shape cached-token field (prompt_tokens_details.cached_tokens) is also read correctly for a MISS', missAlt.observed === 'miss', JSON.stringify(missAlt));
  const unmeasured = sandbox._classifyGrokCacheObservation(null);
  ok('no usage block at all is labeled UNMEASURED — never guessed as hit or miss', unmeasured.observed === 'unmeasured', JSON.stringify(unmeasured));
}
{
  // End-to-end: a successful Grok call's cache classification reaches the returned result object.
  const { sandbox, setFetch } = makeSandbox();
  setFetch(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'prose' } }], usage: { prompt_tokens: 90000, cache_read_input_tokens: 84000 } }) }));
  const r = await sandbox._authorFullScenePolicy('sys', 'usr', {});
  ok('a real successful Grok response\'s cache observation reaches the caller — eligible:true, observed:"hit", real cachedTokens figure (never a flat discount %)', r.cache.eligible === true && r.cache.observed === 'hit' && r.cache.cachedTokens === 84000, JSON.stringify(r.cache));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('7. REAL CALL SITES — CG screenplay, bounded repair, and literary author all actually wire to the policy');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const cgAnchorIdx = appSrc.indexOf('_authorFullScenePolicy(_sharedSys, userPrompt, { maxTokens: 8000');
  ok('the real CG screenplay generator (_runCGScreenplayGenInner) calls the shared policy for its default (non-grok-only) path', cgAnchorIdx !== -1);
  const cgChainRegion = appSrc.slice(appSrc.indexOf('FULL-SCENE PROSE AUTHOR — Grok primary for EVERY scene (Roman, 2026-09-19 policy) ──\n      // Replaces the old complex/premium/connecting'), appSrc.indexOf('if (!response) {\n        console.warn(\'[CG:SCREENPLAY] all providers failed'));
  ok('the real CG screenplay chain region no longer references mistral-small-latest or a DeepSeek endpoint', cgChainRegion.length > 0 && !/mistral-small-latest/.test(cgChainRegion) && !/deepseek-proxy/.test(cgChainRegion), 'region length ' + cgChainRegion.length);

  const repairAnchorIdx = appSrc.indexOf("_authorFullScenePolicy(sys, usr, { maxTokens: 600");
  ok('the real bounded-repair function (_repairViaMistral) calls the shared policy instead of a direct Mistral Small fetch', repairAnchorIdx !== -1);
  const repairRegion = appSrc.slice(appSrc.indexOf('async function _repairViaMistral'), appSrc.indexOf('async function _repairViaMistral') + 3000);
  ok('the real bounded-repair function region no longer POSTs directly to mistral-small-latest', !/model:\s*'mistral-small-latest'/.test(repairRegion));

  const litAnchorIdx = orchSrc.indexOf('window._authorFullScenePolicy(messages, { maxTokens: _maxTokens');
  ok('the real literary author (_grokLiteraryAuthor, orchestration-client.js) calls the shared policy for its default (non-grok-only) path', litAnchorIdx !== -1);
  const litRegion = orchSrc.slice(orchSrc.indexOf('async function _grokLiteraryAuthor'), orchSrc.indexOf('async function _grokLiteraryAuthor') + 4000);
  ok('the real literary author region no longer branches on _isPremiumAuthorScene/_isComplexAuthorMode to choose Mistral Small as primary for non-premium scenes', !/_smallAuthor\s*=\s*_smallAuthorEnabled/.test(litRegion));
}

console.log('\n' + '='.repeat(100));
console.log('FULL-SCENE AUTHOR ROUTING POLICY CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
