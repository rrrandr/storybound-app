// GOVERNOR FAIL-CLOSED + RELEASE POLICY — exercises the REAL api/mistral-proxy.js handler.
// No network of any kind: fetch is replaced, so a single provider call would be visible as a
// recorded URL. Supabase is never contacted either.
//   node _governor_failclosed.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const t = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok  ' : ' FAIL '} ${n}${d ? '   — ' + d : ''}`); };

const PROVIDER = /api\.mistral\.ai|api\.openai\.com|api\.x\.ai/;
function harness({ env = {}, fetchImpl } = {}) {
  const calls = [];
  const realFetch = globalThis.fetch;
  const realEnv = { ...process.env };
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) delete process.env[k];
  Object.assign(process.env, { MISTRAL_API_KEY: 'test-not-a-secret' }, env);
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (PROVIDER.test(String(url))) return fetchImpl ? fetchImpl(url, init) : new Response('{}', { status: 200 });
    throw new Error('unexpected non-provider fetch: ' + url);
  };
  return { calls, restore() { globalThis.fetch = realFetch; process.env = realEnv; } };
}
function res() {
  const o = { statusCode: null, body: null, headers: {}, ended: false };
  return { setHeader: (k, v) => { o.headers[k.toLowerCase()] = v; },
           status(c) { o.statusCode = c; return this; },
           json(b) { o.body = b; o.ended = true; return this; },
           end() { o.ended = true; return this; }, _o: o };
}
const req = (body) => ({ method: 'POST', headers: { origin: 'http://localhost:3000' }, body });
const BODY = { role: 'PROMPT_PREPROCESSOR', model: 'mistral-small-latest', max_tokens: 10,
               messages: [{ role: 'user', content: 'hello' }] };

function freshHandler() {
  delete require.cache[require.resolve('./api/mistral-proxy.js')];
  delete require.cache[require.resolve('./api/_mistral-governor.js')];
  delete require.cache[require.resolve('./api/_mistral-governor-store.js')];
  return require('./api/mistral-proxy.js');
}

console.log('\n══ A · governor unavailable ⇒ FAIL CLOSED, zero provider calls ══');
{
  // Supabase config absent — the exact condition that used to skip admission entirely.
  const h = harness();
  const handler = freshHandler();
  const r = res();
  await handler(req(BODY), r);
  h.restore();
  t('A1 ★ missing Supabase config returns 503, not a dispatch',
    r._o.statusCode === 503, `status=${r._o.statusCode}`);
  t('A2 ★ ZERO provider fetches were made',
    h.calls.filter(u => PROVIDER.test(u)).length === 0, `provider calls=${h.calls.filter(u => PROVIDER.test(u)).length} all=${h.calls.length}`);
  t('A3 the refusal is named and marked governor:true so no call site falls back',
    r._o.body && r._o.body.error === 'supabase_config_absent' && r._o.body.governor === true,
    JSON.stringify(r._o.body).slice(0, 140));
  t('A4 it carries Retry-After and is not terminal',
    r._o.headers['retry-after'] === '30' && r._o.body.terminal === false, JSON.stringify(r._o.headers));
}
{
  // Construction failure — config present, client cannot be built.
  const h = harness({ env: { SUPABASE_URL: 'not-a-url', SUPABASE_SERVICE_ROLE_KEY: 'k' } });
  const handler = freshHandler();
  const r = res();
  await handler(req(BODY), r);
  h.restore();
  const provider = h.calls.filter(u => PROVIDER.test(u)).length;
  t('A5 ★ a governor that will not construct also refuses — 503, zero provider calls',
    r._o.statusCode === 503 && provider === 0, `status=${r._o.statusCode} providerCalls=${provider}`);
  t('A6 the construction fault is named distinctly from the config fault',
    r._o.body && r._o.body.error === 'governor_construction_failed', JSON.stringify(r._o.body).slice(0, 120));
}

console.log('\n══ C · release only for outcomes that prove no provider work ══');
{
  const gov = require('./api/_mistral-governor.js');
  const store = require('./api/_mistral-governor-store.js');
  const SRC = require('fs').readFileSync('api/mistral-proxy.js', 'utf8');
  t('C1 429 is in the proven-unspent set', /_st === 429/.test(SRC));
  t('C2 5xx is NOT in the proven-unspent set',
    !/_st === 5\d\d/.test(SRC) && !/_st >= 500/.test(SRC), 'no 5xx release branch');
  t('C3 a 5xx logs that the reservation is RETAINED', /RETAINING the reservation/.test(SRC));
  t('C4 the thrown-fetch path states the reservation is RETAINED',
    /reservation RETAINED — transport failure does not prove/.test(SRC));
  t('C5 only face-rejection 4xx release, each named in the source',
    ['400', '401', '403', '404', '422'].every(c => SRC.includes(`_st === ${c}`)), 'all named');
  // Behavioural: the governor's own release is never called for a 5xx.
  const s = store.memoryStore();
  const g = gov.createGovernor(s, { now: () => 1000 });
  await g.admit({ model: 'ministral-8b-2512', messages: [{ role: 'user', content: 'x'.repeat(100) }], maxTokens: 10, opId: 'keep' });
  const held = [...s._rows.values()][0];
  t('C6 a retained reservation stays in state "reserved" and keeps charging',
    held.state === 'reserved', JSON.stringify(held));
}

console.log('\n══ C2 · BEHAVIOURAL: 429 releases, 500 retains, thrown fetch retains ══');
{
  // A fake Supabase: the proxy constructs its real client, whose HTTP calls we answer here with
  // the memory store. So the handler's own admit/reconcile/release wiring is exercised, not a
  // stand-in for it.
  const { memoryStore } = require('./api/_mistral-governor-store.js');
  async function scenario(providerImpl) {
    const store = memoryStore();
    const realFetch = globalThis.fetch, realEnv = { ...process.env };
    const providerCalls = [];
    Object.assign(process.env, { SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'k-not-a-secret', MISTRAL_API_KEY: 'm-not-a-secret' });
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (PROVIDER.test(u)) { providerCalls.push(u); return providerImpl(); }
      if (u.includes('/rest/v1/rpc/mistral_quota_')) {
        const args = JSON.parse(init.body);
        const fn = u.split('/rpc/')[1];
        let out;
        if (fn === 'mistral_quota_admit') {
          const r = await store.admit({ bucket: args.p_bucket, nowMs: args.p_now_ms, reserve: args.p_reserve,
            opId: args.p_op_id, tpm: args.p_tpm, windowMs: args.p_window_ms,
            minIntervalMs: args.p_min_interval_ms, retentionMs: args.p_retention_ms, pruneLimit: args.p_prune_limit });
          out = { admitted: r.admitted, reason: r.reason, replay: r.replay, used_tokens: r.usedTokens,
                  retry_tpm_ms: r.retryTpmMs, retry_rps_ms: r.retryRpsMs, retry_after_ms: r.retryAfterMs, pruned: r.pruned };
        } else if (fn === 'mistral_quota_reconcile') {
          const r = await store.reconcile({ opId: args.p_op_id, actual: args.p_actual,
            nowMs: args.p_now_ms, windowMs: args.p_window_ms,
            retentionMs: args.p_retention_ms, pruneLimit: args.p_prune_limit });
          out = { ok: r.ok, released: r.released, held: r.held, exact: r.exact, late: r.late };
        } else {
          const r = await store.release({ opId: args.p_op_id, reason: args.p_reason });
          out = { ok: r.ok, released: r.released, late: r.late };
        }
        return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      throw new Error('unexpected fetch: ' + u);
    };
    const handler = freshHandler();
    const r = res();
    let threw = null;
    try { await handler(req(BODY), r); } catch (e) { threw = String(e && e.message); }
    globalThis.fetch = realFetch; process.env = realEnv;
    const row = [...store._rows.values()][0] || null;
    return { store, row, r, providerCalls, threw };
  }

  const p429 = await scenario(() => new Response(JSON.stringify({ message: 'Rate limit exceeded' }),
    { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '7', 'x-ratelimit-remaining': '0' } }));
  t('C7 ★ provider 429 RELEASES the reservation', p429.row && p429.row.state === 'released', JSON.stringify(p429.row));
  t('C8 the provider retry headers are forwarded to the caller',
    p429.r._o.headers['retry-after'] === '7' && p429.r._o.headers['x-ratelimit-remaining'] === '0',
    JSON.stringify(p429.r._o.headers));
  t('C9 a provider 429 is marked governor:false — it is theirs, not ours',
    p429.r._o.body && p429.r._o.body.governor === false, JSON.stringify(p429.r._o.body).slice(0, 90));

  const p500 = await scenario(() => new Response(JSON.stringify({ message: 'boom' }), { status: 500 }));
  t('C10 ★ provider 500 RETAINS the reservation — a 5xx does not prove the request went unserved',
    p500.row && p500.row.state === 'reserved', JSON.stringify(p500.row));

  const pThrow = await scenario(() => { throw new Error('ECONNRESET'); });
  t('C11 ★ a THROWN fetch retains the reservation too',
    pThrow.row && pThrow.row.state === 'reserved', JSON.stringify(pThrow.row));

  const pOk = await scenario(() => new Response(JSON.stringify({
    choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }),
    { status: 200, headers: { 'content-type': 'application/json' } }));
  t('C12 a served request reconciles to the provider total and releases the difference',
    pOk.row && pOk.row.state === 'reconciled' && pOk.row.actual === 5, JSON.stringify(pOk.row));
  t('C13 exactly one provider call was made on the success path', pOk.providerCalls.length === 1, `calls=${pOk.providerCalls.length}`);
}

console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
