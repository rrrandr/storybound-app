// MISTRAL QUOTA GOVERNOR — deterministic tests. Fake clock, real adapter boundary, no network.
//   node _mistral_governor.mjs
import { createRequire } from 'node:module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { createGovernor, OUTCOME, reservationFor, minIntervalMs, bucketOf, MODEL_LIMITS, WINDOW_MS, RETENTION_MS, PRUNE_LIMIT } = require('./api/_mistral-governor.js');
const { memoryStore, brokenStore } = require('./api/_mistral-governor-store.js');

let pass = 0, fail = 0;
const t = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok  ' : ' FAIL '} ${n}${d ? '   — ' + d : ''}`); };

// FAKE CLOCK. Nothing here sleeps; a minute passes by assignment.
function clock(start = 1_000_000) { let now = start; return { now: () => now, advance: (ms) => { now += ms; }, set: (v) => { now = v; } }; }
const msg = (n) => [{ role: 'user', content: 'x'.repeat(n) }];
const SMALL = 'mistral-small-latest', M8 = 'ministral-8b-2512', M14 = 'ministral-14b-2512';
let _op = 0; const op = () => 'op' + (++_op);

console.log('\n══ A · reservation and rate arithmetic ══');
t('A1 reservation = UTF-8 request bytes + max output tokens (conservative by construction)',
  reservationFor(msg(1000), 500) === 1500, `got ${reservationFor(msg(1000), 500)}`);
t('A2 multi-byte characters are counted as BYTES, not characters',
  reservationFor([{ role: 'user', content: 'é'.repeat(100) }], 0) === 200,
  `got ${reservationFor([{ role: 'user', content: 'é'.repeat(100) }], 0)}`);
t('A3 fractional 3.13 rps → 320 ms spacing (effective 3.125/s, UNDER the limit — never rounded up)',
  minIntervalMs(3.13) === 320, `got ${minIntervalMs(3.13)}`);
t('A4 fractional 0.5 rps → 2000 ms spacing, not a rounded-up 1/s',
  minIntervalMs(0.5) === 2000, `got ${minIntervalMs(0.5)}`);
t('A5 1 rps → 1000 ms', minIntervalMs(1) === 1000, `got ${minIntervalMs(1)}`);
t('A6 models sharing one provider bucket share one governor key',
  bucketOf('mistral-small-latest') === bucketOf('mistral-small-2603'),
  `${bucketOf('mistral-small-latest')} vs ${bucketOf('mistral-small-2603')}`);

console.log('\n══ A2 · limits are explicit, dated, and complete ══');
{
  const need = ['mistral-small-latest','mistral-small-2603','ministral-3b-2512','ministral-8b-2512','ministral-14b-2512'];
  t('A7 every model the proxy allowlists has a configured limit',
    need.every(m => MODEL_LIMITS[m]), need.filter(m => !MODEL_LIMITS[m]).join(',') || 'all present');
  t('A8 every entry carries tpm, rps, source and readOn — a half-filled row must fail closed',
    need.every(m => MODEL_LIMITS[m].tpm > 0 && MODEL_LIMITS[m].rps > 0 && MODEL_LIMITS[m].source && MODEL_LIMITS[m].readOn));
  t('A9 the account figures are the ones supplied, not defaults',
    MODEL_LIMITS['ministral-3b-2512'].tpm === 1300000 && MODEL_LIMITS['ministral-3b-2512'].rps === 12.5 &&
    MODEL_LIMITS['ministral-8b-2512'].tpm === 625000  && MODEL_LIMITS['ministral-8b-2512'].rps === 3.13 &&
    MODEL_LIMITS['ministral-14b-2512'].tpm === 937500 && MODEL_LIMITS['ministral-14b-2512'].rps === 0.5);
  t('A10 fractional rates → conservative intervals for all three',
    minIntervalMs(12.5) === 80 && minIntervalMs(3.13) === 320 && minIntervalMs(0.5) === 2000,
    `12.5→${minIntervalMs(12.5)} 3.13→${minIntervalMs(3.13)} 0.5→${minIntervalMs(0.5)}`);
  // A rate that divides exactly must not be inflated by the ceil().
  t('A11 an exact rate is not padded: 12.5/s → 80 ms is exactly 12.5/s, not 12.4',
    1000 / minIntervalMs(12.5) === 12.5, String(1000 / minIntervalMs(12.5)));
  t('A12 an inexact rate lands UNDER the allowance, never over',
    1000 / minIntervalMs(3.13) < 3.13 && 1000 / minIntervalMs(0.5) <= 0.5,
    `3.13→${(1000/minIntervalMs(3.13)).toFixed(4)}/s  0.5→${(1000/minIntervalMs(0.5)).toFixed(4)}/s`);
}

console.log('\n══ A3 · fractional admission behaviour, per model ══');
for (const [model, gapOk, gapBad] of [['ministral-3b-2512', 80, 79], ['ministral-8b-2512', 320, 319], ['ministral-14b-2512', 2000, 1999]]) {
  const c = clock(), g = createGovernor(memoryStore(), { now: c.now });
  await g.admit({ model, messages: msg(10), maxTokens: 0, opId: op() });
  c.advance(gapBad);
  const early = await g.admit({ model, messages: msg(10), maxTokens: 0, opId: op() });
  c.advance(gapOk - gapBad);
  const onTime = await g.admit({ model, messages: msg(10), maxTokens: 0, opId: op() });
  t(`A13 ${model}: refused at ${gapBad} ms, admitted at ${gapOk} ms`,
    early.outcome === OUTCOME.RPS && onTime.outcome === OUTCOME.ADMITTED,
    `${early.outcome} then ${onTime.outcome}`);
}

console.log('\n══ A4 · the SQL claims what it enforces (source check) ══');
{
  const sql = fs.readFileSync('supabase/migrations/20260904_mistral_quota_governor.sql', 'utf8');
  const fns = ['mistral_quota_admit', 'mistral_quota_reconcile', 'mistral_quota_release'];
  t('S1 every function fixes search_path',
    (sql.match(/SET search_path = pg_catalog, public/g) || []).length >= fns.length,
    `${(sql.match(/SET search_path = pg_catalog, public/g) || []).length} of ${fns.length}`);
  t('S2 ★ every function REVOKEs from PUBLIC — the default grant, not just anon/authenticated',
    fns.every(f => new RegExp('REVOKE ALL ON FUNCTION public\\.' + f + '[^;]*FROM PUBLIC').test(sql)),
    fns.filter(f => !new RegExp('REVOKE ALL ON FUNCTION public\\.' + f + '[^;]*FROM PUBLIC').test(sql)).join(',') || 'all revoked');
  t('S3 execute is granted to service_role and to nothing else',
    fns.every(f => new RegExp('GRANT EXECUTE ON FUNCTION public\\.' + f + '[^;]*TO service_role').test(sql)) &&
    !/GRANT EXECUTE[^;]*TO (anon|authenticated|PUBLIC)/.test(sql));
  t('S4 the table revokes PUBLIC and has RLS enabled',
    /REVOKE ALL ON public\.mistral_quota_reservations FROM PUBLIC/.test(sql) &&
    /ENABLE ROW LEVEL SECURITY/.test(sql));
  t('S5 the migration asserts its own security properties at apply time',
    /ASSERTION FAILED: %\(\) is EXECUTABLE BY PUBLIC/.test(sql) && /RAISE EXCEPTION/.test(sql));
  t('S6 admission takes an advisory lock BEFORE reading (the empty-row case)',
    sql.indexOf('pg_advisory_xact_lock') < sql.indexOf('SELECT COALESCE(SUM('),
    'lock precedes the aggregate read');
  t('S7 the migration is re-runnable', /CREATE TABLE IF NOT EXISTS/.test(sql) &&
    (sql.match(/CREATE OR REPLACE FUNCTION/g) || []).length === fns.length);
}

console.log('\n══ B · RPS admission ══');
{
  const c = clock(), g = createGovernor(memoryStore(), { now: c.now });
  const a = await g.admit({ model: M8, messages: msg(10), maxTokens: 10, opId: op() });
  t('B1 first request is admitted on an EMPTY store', a.outcome === OUTCOME.ADMITTED, a.outcome);
  c.advance(100);
  const b = await g.admit({ model: M8, messages: msg(10), maxTokens: 10, opId: op() });
  t('B2 a second request 100 ms later is refused on RPS', b.outcome === OUTCOME.RPS, b.outcome);
  t('B3 the RPS wait is reported separately and is the remaining interval',
    b.retryRpsMs === 220 && b.retryTpmMs === null, `rps=${b.retryRpsMs} tpm=${b.retryTpmMs}`);
  c.advance(220);
  const d = await g.admit({ model: M8, messages: msg(10), maxTokens: 10, opId: op() });
  t('B4 admitted exactly when the interval has elapsed', d.outcome === OUTCOME.ADMITTED, d.outcome);
}

console.log('\n══ C · TPM admission, rolling not bucketed ══');
{
  const c = clock(), g = createGovernor(memoryStore(), { now: c.now });
  // Small: 20,000 tpm, 1 rps. Four 5,000-token reservations fill the minute exactly.
  for (let i = 0; i < 4; i++) {
    const r = await g.admit({ model: SMALL, messages: msg(4000), maxTokens: 1000, opId: op() });
    t(`C1.${i} reservation ${i + 1} of 4 admitted`, r.outcome === OUTCOME.ADMITTED, r.outcome);
    c.advance(1000);
  }
  const over = await g.admit({ model: SMALL, messages: msg(4000), maxTokens: 1000, opId: op() });
  t('C2 the fifth is refused on TPM, not RPS', over.outcome === OUTCOME.TPM, over.outcome);
  // The four admissions land at t+0,1000,2000,3000 and the clock stands at t+4000, so the
  // oldest leaves the window 56,000 ms later. (An earlier version of this test asserted
  // 57,000 and was simply wrong about its own fixture.)
  t('C3 the TPM wait is when the OLDEST reservation rolls out of the window',
    over.retryTpmMs === 56000 && over.retryRpsMs === null, `tpm=${over.retryTpmMs} rps=${over.retryRpsMs}`);
  // ROLLING, NOT FIXED: advancing past the oldest entry frees exactly its share.
  c.advance(56000);
  const after = await g.admit({ model: SMALL, messages: msg(4000), maxTokens: 1000, opId: op() });
  t('C4 admitted once the oldest reservation leaves the ROLLING window', after.outcome === OUTCOME.ADMITTED, after.outcome);
}

console.log('\n══ D · over-budget request fails BEFORE dispatch ══');
{
  const c = clock(), g = createGovernor(memoryStore(), { now: c.now });
  // The real preprocessor: ~85 KB of prompt + 2,921 max tokens, against Small's 20,000.
  const big = await g.admit({ model: SMALL, messages: msg(85128), maxTokens: 2921, opId: op() });
  t('D1 a reservation larger than the model allowance is refused', big.outcome === OUTCOME.OVERSIZED, big.outcome);
  t('D2 no Retry-After is offered — waiting can never make it fit', big.retryAfterMs === null, String(big.retryAfterMs));
  t('D3 the refusal names the model and both numbers',
    big.model === SMALL && big.reserve === 88049 && big.limitTpm === 20000,
    `${big.model} reserve=${big.reserve} limit=${big.limitTpm}`);
  const ok8 = await g.admit({ model: M8, messages: msg(85128), maxTokens: 2921, opId: op() });
  t('D4 the SAME request is admitted on the 8B bucket — no substitution, just a different ask',
    ok8.outcome === OUTCOME.ADMITTED, ok8.outcome);
}

console.log('\n══ E · reconciliation releases unused capacity ══');
{
  const c = clock(), store = memoryStore(), g = createGovernor(store, { now: c.now });
  const id = op();
  const a = await g.admit({ model: M8, messages: msg(40000), maxTokens: 2000, opId: id });
  t('E1 admitted with the conservative reservation', a.outcome === OUTCOME.ADMITTED && a.reserve === 42000, `reserve=${a.reserve}`);
  const rec = await g.reconcile({ opId: id, usage: { prompt_tokens: 9000, completion_tokens: 1000 } });
  t('E2 reconciliation releases reservation − actual', rec.released === 32000 && rec.held === 10000 && rec.exact === true,
    `released=${rec.released} held=${rec.held}`);
  // Prove the released capacity is genuinely available: 62 × 10,000 would exceed 625,000 if
  // the original 42,000 were still held, and fits if it is not.
  c.advance(400);
  const probe = await g.admit({ model: M8, messages: msg(614999), maxTokens: 0, opId: op() });
  t('E3 ★ the released capacity is REALLY reusable — a 614,999-token request now fits',
    probe.outcome === OUTCOME.ADMITTED, `${probe.outcome} used=${probe.usedTokens}`);
}

console.log('\n══ F · absent usage stays conservatively charged ══');
{
  const c = clock(), g = createGovernor(memoryStore(), { now: c.now });
  const id = op();
  await g.admit({ model: M8, messages: msg(600000), maxTokens: 0, opId: id });
  const rec = await g.reconcile({ opId: id, usage: null });
  t('F1 a response with NO usage releases nothing', rec.released === 0 && rec.exact === false, JSON.stringify(rec));
  t('F2 the conservative amount is still held', rec.held === 600000, `held=${rec.held}`);
  c.advance(400);
  const blocked = await g.admit({ model: M8, messages: msg(30000), maxTokens: 0, opId: op() });
  t('F3 it keeps charging the bucket — unknown is not zero', blocked.outcome === OUTCOME.TPM, blocked.outcome);
  c.advance(WINDOW_ADVANCE());
  const freed = await g.admit({ model: M8, messages: msg(30000), maxTokens: 0, opId: op() });
  t('F4 …and is released only when the rolling window passes it', freed.outcome === OUTCOME.ADMITTED, freed.outcome);
}
function WINDOW_ADVANCE() { return 60000; }

console.log('\n══ G · provider 429 releases the reservation ══');
{
  const c = clock(), g = createGovernor(memoryStore(), { now: c.now });
  const id = op();
  await g.admit({ model: M8, messages: msg(600000), maxTokens: 0, opId: id });
  const rel = await g.release({ opId: id, reason: 'provider_429' });
  t('G1 release hands the full reservation back', rel.ok === true && rel.released === 600000, JSON.stringify(rel));
  c.advance(400);
  const next = await g.admit({ model: M8, messages: msg(600000), maxTokens: 0, opId: op() });
  t('G2 ★ capacity is immediately reusable — a call the provider refused must not keep charging',
    next.outcome === OUTCOME.ADMITTED, next.outcome);
  const again = await g.release({ opId: id, reason: 'double' });
  t('G3 a double release is a no-op, not a second credit', again.ok === false, JSON.stringify(again));
}

console.log('\n══ H · concurrency: same user and two users, one shared store ══');
{
  const c = clock(), store = memoryStore(), g = createGovernor(store, { now: c.now });
  // Same instant, same store — the empty-row first-request case the fortune migration named.
  const [x, y] = await Promise.all([
    g.admit({ model: M8, messages: msg(400000), maxTokens: 0, opId: op() }),
    g.admit({ model: M8, messages: msg(400000), maxTokens: 0, opId: op() })
  ]);
  const admitted = [x, y].filter(r => r.outcome === OUTCOME.ADMITTED).length;
  // At an IDENTICAL timestamp the minimum-interval check binds first, so the second request is
  // refused on RPS rather than TPM. Either reason is a correct refusal; what matters — and what
  // an in-process limiter cannot guarantee across instances — is that exactly one is admitted.
  t('H1 ★ two simultaneous first requests on an empty store: exactly ONE is admitted',
    admitted === 1, `admitted=${admitted} → ${x.outcome} / ${y.outcome}`);
  t('H1b the loser is refused for a stated reason, never silently dropped',
    [x, y].some(r => r.outcome === OUTCOME.RPS || r.outcome === OUTCOME.TPM),
    `${x.outcome} / ${y.outcome}`);
  // Two "instances" = two governor objects over ONE store. This is the property an in-process
  // limiter cannot have, and the reason the browser gate was rejected.
  // A FRESH shared store: the previous block's spend would otherwise refuse both and the test
  // would "pass" for the wrong reason.
  const shared = memoryStore();
  const c2 = clock(5_000_000), gA = createGovernor(shared, { now: c2.now }), gB = createGovernor(shared, { now: c2.now });
  // 400k + 400k = 800k against the 8B bucket's 625k, spaced 400 ms so RPS (320 ms) cannot be
  // what refuses the second — the refusal must come from spend the OTHER instance recorded.
  c2.advance(400);
  const p = await gA.admit({ model: M8, messages: msg(400000), maxTokens: 0, opId: op() });
  c2.advance(400);
  const q = await gB.admit({ model: M8, messages: msg(400000), maxTokens: 0, opId: op() });
  t("H2 ★ a SECOND instance sees the first instance spend",
    p.outcome === OUTCOME.ADMITTED && q.outcome === OUTCOME.TPM, `A=${p.outcome} B=${q.outcome}`);
  t('H3 the refusal reports the shared usage it saw, not a per-instance view',
    q.usedTokens >= 400000, `used=${q.usedTokens}`);
}

console.log('\n══ I · unconfigured limits and store outage both FAIL CLOSED ══');
{
  const c = clock(), g = createGovernor(memoryStore(), { now: c.now });
  // Every real model is now fully configured, so the fail-closed guard is tested by injecting
  // half-filled entries — the shape a careless edit would actually produce.
  MODEL_LIMITS['test-no-rps']    = { tpm: 900000, source: 'x', readOn: '2026-09-04' };
  MODEL_LIMITS['test-no-tpm']    = { rps: 3, source: 'x', readOn: '2026-09-04' };
  MODEL_LIMITS['test-undated']   = { tpm: 900000, rps: 3 };
  for (const [m, why] of [['test-no-rps','rps'], ['test-no-tpm','tpm'], ['test-undated','provenance']]) {
    const r = await g.admit({ model: m, messages: msg(10), maxTokens: 10, opId: op() });
    t(`I1.${why} an entry missing ${why} is REFUSED, not admitted on a guess`,
      r.outcome === OUTCOME.UNCONFIGURED, `${r.outcome} missing=${JSON.stringify(r.missing)}`);
  }
  delete MODEL_LIMITS['test-no-rps']; delete MODEL_LIMITS['test-no-tpm']; delete MODEL_LIMITS['test-undated'];
  const u14 = await g.admit({ model: M14, messages: msg(10), maxTokens: 10, opId: op() });
  t('I1b 14B is now fully configured and admits (0.5 rps, 937,500 tpm)',
    u14.outcome === OUTCOME.ADMITTED, u14.outcome);
  const un = await g.admit({ model: 'mistral-unknown-9x', messages: msg(10), maxTokens: 10, opId: op() });
  t('I2 an unknown model is refused', un.outcome === OUTCOME.UNCONFIGURED, un.outcome);
  const gb = createGovernor(brokenStore('db down'), { now: c.now });
  const d = await gb.admit({ model: M8, messages: msg(10), maxTokens: 10, opId: op() });
  t('I3 ★ a store outage FAILS CLOSED — an unknown budget never authorises a paid call',
    d.outcome === OUTCOME.STORE_DOWN, d.outcome);
  t('I4 MODEL_LIMITS is explicit; no limit is inferred from a name',
    Object.keys(MODEL_LIMITS).every(k => 'tpm' in MODEL_LIMITS[k] && 'rps' in MODEL_LIMITS[k]));
}

console.log('\n══ K · idempotency is decided before RPS/TPM ══');
{
  const c = clock(), store = memoryStore(), g = createGovernor(store, { now: c.now });
  const id = op('replay');
  const first = await g.admit({ model: M8, messages: msg(1000), maxTokens: 0, opId: id });
  t('K1 the first admission is admitted and not a replay',
    first.outcome === OUTCOME.ADMITTED, first.outcome);
  // SAME INSTANT. The old order evaluated RPS first, so a same-instant replay was refused by
  // its OWN prior row — a retry told the bucket was full by itself.
  const same = await store.admit({ bucket: bucketOf(M8), nowMs: c.now(), reserve: 1000, opId: id,
    tpm: 625000, windowMs: 60000, minIntervalMs: 320, retentionMs: 240000, pruneLimit: 500 });
  t('K2 ★ a replay at the SAME instant is admitted, not refused on RPS by its own row',
    same.admitted === true && same.replay === true, JSON.stringify(same));
  t('K3 the replay reports the CURRENT usage, not used+reserve as though it inserted',
    same.usedTokens === 1000, `used=${same.usedTokens} (one row of 1000, not 2000)`);
  t('K4 the replay stored no second row', store._rows.size === 1, `rows=${store._rows.size}`);
  // AFTER TIME, still inside retention.
  c.advance(5000);
  const later = await store.admit({ bucket: bucketOf(M8), nowMs: c.now(), reserve: 1000, opId: id,
    tpm: 625000, windowMs: 60000, minIntervalMs: 320, retentionMs: 240000, pruneLimit: 500 });
  t('K5 a replay after time is still a stable replay', later.admitted === true && later.replay === true, JSON.stringify(later));
  t('K6 …and still stores one row', store._rows.size === 1, `rows=${store._rows.size}`);
  // MISMATCH — same id, different request.
  const bad = await store.admit({ bucket: bucketOf(M8), nowMs: c.now(), reserve: 999, opId: id,
    tpm: 625000, windowMs: 60000, minIntervalMs: 320, retentionMs: 240000, pruneLimit: 500 });
  t('K7 ★ the same op id with a DIFFERENT reserve is a named mismatch, not an admission',
    bad.admitted === false && bad.reason === 'op_id_mismatch', JSON.stringify(bad));
  const badB = await store.admit({ bucket: 'other-bucket', nowMs: c.now(), reserve: 1000, opId: id,
    tpm: 625000, windowMs: 60000, minIntervalMs: 320, retentionMs: 240000, pruneLimit: 500 });
  t('K8 a different BUCKET with the same op id is also a mismatch',
    badB.admitted === false && badB.reason === 'op_id_mismatch', JSON.stringify(badB));
  // A RELEASED row must replay as released — capacity is not silently retaken.
  await g.release({ opId: id, reason: 'provider_429' });
  const afterRel = await store.admit({ bucket: bucketOf(M8), nowMs: c.now(), reserve: 1000, opId: id,
    tpm: 625000, windowMs: 60000, minIntervalMs: 320, retentionMs: 240000, pruneLimit: 500 });
  t('K9 a replay of a RELEASED reservation does not silently re-take capacity',
    afterRel.admitted === false && afterRel.reason === 'already_released', JSON.stringify(afterRel));
}

console.log('\n══ K2 · SAME op_id, DIFFERENT buckets, GENUINELY concurrent ══');
{
  // The race: op_id is the table's PRIMARY KEY and is global; the bucket lock is not. Two
  // first requests with one id and two buckets took two different locks, both saw no row, and
  // both inserted — one hitting the PK and RAISING instead of receiving op_id_mismatch.
  //
  // A single-threaded runtime cannot interleave on its own, so `yieldAt` forces the schedule:
  // both calls perform their lookup, then both continue. With the op lock the second cannot
  // reach its lookup until the first has finished; without it, both do.
  const args = (bucket) => ({ bucket, nowMs: 1000, reserve: 100, opId: 'shared-op',
    tpm: 1000000, windowMs: 60000, minIntervalMs: 0, retentionMs: 240000, pruneLimit: 500 });

  // ── MUTATION CONTROL FIRST: the bug must be reproducible, or the fix proves nothing ──
  let gate1; const held1 = new Promise(r => { gate1 = r; });
  let seen1 = 0;
  const ctl = memoryStore({ noOpLock: true, yieldAt: async (pt) => {
    if (pt === 'after-lookup') { seen1++; if (seen1 === 1) await held1; } } });
  const ctlRun = Promise.all([
    ctl.admit(args('bucket-A')).catch(e => ({ threw: String(e && e.message) })),
    ctl.admit(args('bucket-B')).catch(e => ({ threw: String(e && e.message) }))
  ]);
  await new Promise(r => setTimeout(r, 10)); gate1();
  const ctlOut = await ctlRun;
  const ctlAdmitted = ctlOut.filter(r => r.admitted === true).length;
  t('K10 ★ CONTROL BITES — without the op lock, both same-op admissions pass the lookup',
    seen1 === 2, `lookups reached before either finished = ${seen1}`);
  // WHAT THIS MIRROR CANNOT SHOW: the SQL failure mode is a PRIMARY KEY exception, and this
  // adapter has a JS guard where the insert would be. So the control proves the INTERLEAVING is
  // real and reachable; only P16 in _governor_supabase_integration.mjs can prove Postgres
  // answers with op_id_mismatch instead of raising.
  t('K11 ★ CONTROL — and the collision surfaces (a second row, or a mismatch discovered late)',
    ctlAdmitted !== 1 || ctlOut.some(r => r.reason === 'op_id_mismatch'),
    `admitted=${ctlAdmitted} outcomes=${ctlOut.map(r => r.reason || (r.admitted ? 'admitted' : r.threw)).join(' / ')}`);

  // ── WITH THE FIX ──
  let gate2; const held2 = new Promise(r => { gate2 = r; });
  let seen2 = 0;
  const store = memoryStore({ yieldAt: async (pt) => {
    if (pt === 'after-lookup') { seen2++; if (seen2 === 1) await held2; } } });
  const run = Promise.all([
    store.admit(args('bucket-A')).catch(e => ({ threw: String(e && e.message) })),
    store.admit(args('bucket-B')).catch(e => ({ threw: String(e && e.message) }))
  ]);
  await new Promise(r => setTimeout(r, 10));
  t('K12 ★ the op lock keeps the second call OUT of the lookup while the first holds it',
    seen2 === 1, `lookups reached while the first was in flight = ${seen2}`);
  gate2();
  const out = await run;
  const admitted = out.filter(r => r.admitted === true).length;
  const mismatched = out.filter(r => r.reason === 'op_id_mismatch').length;
  t('K13 ★ exactly ONE stable admission', admitted === 1, JSON.stringify(out.map(r => r.reason || (r.admitted ? 'admitted' : r.threw))));
  t('K14 ★ the loser receives a NAMED op_id_mismatch — not a SQL error, not a second row',
    mismatched === 1 && out.every(r => !r.threw), JSON.stringify(out));
  t('K15 ★ exactly one row exists for the shared op id', store._rows.size === 1, `rows=${store._rows.size}`);
  const only = [...store._rows.values()][0];
  t('K16 the surviving row belongs to whichever bucket won, and is internally consistent',
    (only.bucket === 'bucket-A' || only.bucket === 'bucket-B') && only.reserved === 100, JSON.stringify(only));
}

console.log('\n══ L2 · argument validation ══');
{
  const store = memoryStore();
  const base = { bucket: 'b', nowMs: 1000, reserve: 10, opId: 'v1', tpm: 100,
                 windowMs: 60000, minIntervalMs: 0, retentionMs: 240000, pruneLimit: 500 };
  for (const [field, value] of [['reserve', 0], ['reserve', -5], ['tpm', 0], ['windowMs', 0],
                                ['minIntervalMs', -1], ['retentionMs', 0], ['pruneLimit', 0]]) {
    const r = await store.admit({ ...base, [field]: value, opId: 'v_' + field + value });
    t(`V ${field}=${value} is refused as invalid_arguments, never admitted`,
      r.admitted === false && r.reason === 'invalid_arguments', JSON.stringify(r));
  }
  const s2 = memoryStore();
  await s2.admit({ ...base, opId: 'neg' });
  const neg = await s2.reconcile({ opId: 'neg', actual: -3 });
  t('V ★ a NEGATIVE actual preserves the conservative reservation instead of reducing it',
    neg.released === 0 && neg.held === 10 && neg.exact === false && neg.invalidActual === true, JSON.stringify(neg));
}

console.log('\n══ R · reconcile prune arguments are validated (no live row may be deleted) ══');
{
  // The defect: reconcile pruned on `retentionMs > 0` alone while ADMISSION also required
  // retention > window. A caller passing retention=1 had a one-millisecond horizon here, so
  // every row older than 1 ms — including reservations still inside the live 60 s window and
  // still charging the bucket — was deleted, silently reopening capacity in use.
  const mkStore = async () => {
    const st = memoryStore();
    // A live neighbour inside the window, charging 5,000, plus the row we will reconcile.
    await st.admit({ bucket: 'B', nowMs: 10_000, reserve: 5000, opId: 'live-neighbour',
      tpm: 1000000, windowMs: 60000, minIntervalMs: 0, retentionMs: 240000, pruneLimit: 500 });
    await st.admit({ bucket: 'B', nowMs: 11_000, reserve: 100, opId: 'target',
      tpm: 1000000, windowMs: 60000, minIntervalMs: 0, retentionMs: 240000, pruneLimit: 500 });
    return st;
  };
  const BAD = [
    ['retention <= window', { nowMs: 12_000, windowMs: 60000, retentionMs: 1, pruneLimit: 500 }],
    ['retention == window', { nowMs: 12_000, windowMs: 60000, retentionMs: 60000, pruneLimit: 500 }],
    ['prune limit 0',       { nowMs: 12_000, windowMs: 60000, retentionMs: 240000, pruneLimit: 0 }],
    ['prune limit -1',      { nowMs: 12_000, windowMs: 60000, retentionMs: 240000, pruneLimit: -1 }],
    ['window 0',            { nowMs: 12_000, windowMs: 0,     retentionMs: 240000, pruneLimit: 500 }],
    ['retention 0',         { nowMs: 12_000, windowMs: 60000, retentionMs: 0,      pruneLimit: 500 }],
    ['now missing',         { windowMs: 60000, retentionMs: 240000, pruneLimit: 500 }],
    ['window missing',      { nowMs: 12_000, retentionMs: 240000, pruneLimit: 500 }],
    ['retention missing',   { nowMs: 12_000, windowMs: 60000, pruneLimit: 500 }],
  ];
  for (const [label, args] of BAD) {
    const st = await mkStore();
    const before = st._rows.size;
    const r = await st.reconcile({ opId: 'target', actual: 40, ...args });
    t(`R ${label} → typed invalid_arguments, never a prune`,
      r.ok === false && r.reason === 'invalid_arguments', JSON.stringify(r));
    t(`R ${label} → ★ the LIVE reservation still exists and still charges`,
      st._rows.size === before && st._rows.get('live-neighbour')
      && st._rows.get('live-neighbour').state === 'reserved',
      `rows ${before}→${st._rows.size}`);
    t(`R ${label} → the target is left UNTOUCHED (not reconciled)`,
      st._rows.get('target') && st._rows.get('target').actual === null
      && st._rows.get('target').state === 'reserved',
      JSON.stringify(st._rows.get('target')));
  }
  // Reconcile-only (no prune arguments at all) remains valid.
  {
    const st = await mkStore();
    const r = await st.reconcile({ opId: 'target', actual: 40 });
    t('R none-supplied → reconcile-only is valid and releases the difference',
      r.ok === true && r.released === 60 && r.exact === true, JSON.stringify(r));
    t('R none-supplied → nothing was pruned', st._rows.size === 2, `rows=${st._rows.size}`);
  }
  // A correctly-argued prune still works and still spares a row that is genuinely live.
  // (An earlier version of this case called the t=10,000 row "live" while evaluating at
  // t=300,000 — by then it was 290 s old, far past both the window and retention, and the
  // governor was right to remove it. The fixture was wrong, not the code.)
  {
    const st = memoryStore();
    const NOW = 300_000;
    await st.admit({ bucket: 'B', nowMs: NOW - 1000, reserve: 5000, opId: 'really-live',
      tpm: 1000000, windowMs: 60000, minIntervalMs: 0, retentionMs: 240000, pruneLimit: 500 });
    await st.admit({ bucket: 'B', nowMs: NOW - 500, reserve: 100, opId: 'target',
      tpm: 1000000, windowMs: 60000, minIntervalMs: 0, retentionMs: 240000, pruneLimit: 500 });
    st._rows.set('ancient', { bucket: 'B', reserved: 1, actual: null, state: 'reconciled', createdMs: 0 });
    const r = await st.reconcile({ opId: 'target', actual: 40, nowMs: NOW,
      windowMs: 60000, retentionMs: 240000, pruneLimit: 500 });
    t('R valid args → prune runs and removes what is past retention',
      r.ok === true && r.pruned === 1 && !st._rows.has('ancient'), `pruned=${r.pruned}`);
    t('R valid args → ★ a row inside the live window is NOT deleted',
      st._rows.has('really-live') && st._rows.get('really-live').state === 'reserved',
      'live row survived a valid prune');
    t('R valid args → the reconcile itself still released the difference',
      r.released === 60 && r.exact === true, JSON.stringify(r));
  }
}

console.log('\n══ J · self-pruning and late responses ══');
{
  t('J1 retention is strictly greater than the admission window — pruning cannot reopen capacity',
    RETENTION_MS > WINDOW_MS, `retention=${RETENTION_MS} window=${WINDOW_MS}`);
  const c = clock(), store = memoryStore(), g = createGovernor(store, { now: c.now });
  const first = op();
  await g.admit({ model: M8, messages: msg(1000), maxTokens: 0, opId: first });
  t('J2 the reservation exists after admission', store._rows.size === 1, `rows=${store._rows.size}`);
  // Inside retention: still stored, even though it long since left the 60 s window.
  c.advance(WINDOW_MS + 1000);
  await g.admit({ model: M8, messages: msg(1000), maxTokens: 0, opId: op() });
  t('J3 a row past the WINDOW but inside RETENTION is kept (its response may still arrive)',
    store._rows.has(first), `rows=${store._rows.size}`);
  // Past retention: the next normal admission collects it. No cron involved.
  c.advance(RETENTION_MS);
  await g.admit({ model: M8, messages: msg(1000), maxTokens: 0, opId: op() });
  t('J4 ★ the next ordinary admission prunes it — retention is enforced on the normal path',
    !store._rows.has(first), `rows=${store._rows.size}`);
}
{
  // Pruning must never hand capacity back. Fill the bucket, let the rows age out of the window
  // but NOT past retention, and confirm the freed capacity comes from the window rolling —
  // then that pruning them later changes nothing.
  const c = clock(), store = memoryStore(), g = createGovernor(store, { now: c.now });
  await g.admit({ model: M8, messages: msg(600000), maxTokens: 0, opId: op() });
  c.advance(400);
  const blocked = await g.admit({ model: M8, messages: msg(600000), maxTokens: 0, opId: op() });
  t('J5 a full bucket refuses while the reservation is inside the window', blocked.outcome === OUTCOME.TPM, blocked.outcome);
  c.advance(WINDOW_MS);
  const freed = await g.admit({ model: M8, messages: msg(600000), maxTokens: 0, opId: op() });
  t('J6 capacity returns because the WINDOW rolled, not because anything was deleted',
    freed.outcome === OUTCOME.ADMITTED, freed.outcome);
}
{
  // ── A LATE PROVIDER RESPONSE, AFTER ITS RESERVATION WAS PRUNED ──
  const c = clock(), store = memoryStore(), g = createGovernor(store, { now: c.now });
  const late = op();
  await g.admit({ model: M8, messages: msg(500000), maxTokens: 0, opId: late });
  c.advance(RETENTION_MS + 1000);
  await g.admit({ model: M8, messages: msg(1000), maxTokens: 0, opId: op() });   // prunes `late`
  t('J7 the late reservation has been pruned', !store._rows.has(late));
  const before = store._rows.size;
  let threw = null, rec = null;
  try { rec = await g.reconcile({ opId: late, usage: { total_tokens: 12345 } }); } catch (e) { threw = String(e && e.message); }
  t('J8 ★ reconciling a pruned reservation does NOT throw', threw === null, threw || 'no throw');
  t('J9 ★ …returns late:true and releases nothing', rec && rec.ok === false && rec.late === true && rec.released === 0, JSON.stringify(rec));
  t('J10 ★ …and does not re-insert a row — no capacity is reopened in the present',
    store._rows.size === before, `before=${before} after=${store._rows.size}`);
  let threw2 = null, rel = null;
  try { rel = await g.release({ opId: late, reason: 'provider_429' }); } catch (e) { threw2 = String(e && e.message); }
  t('J11 ★ releasing a pruned reservation does not throw and credits nothing',
    threw2 === null && rel && rel.ok === false && rel.released === 0, threw2 || JSON.stringify(rel));
}
{
  // Bounded work: a backlog is collected across calls, never all in one.
  const c = clock(), store = memoryStore(), g = createGovernor(store, { now: c.now });
  for (let i = 0; i < PRUNE_LIMIT + 50; i++)
    store._rows.set('old' + i, { bucket: 'ministral-8b-2512', reserved: 1, actual: null, state: 'reconciled', createdMs: c.now() });
  c.advance(RETENTION_MS + 1000);
  await g.admit({ model: M8, messages: msg(10), maxTokens: 0, opId: op() });
  const left = [...store._rows.values()].filter(r => r.createdMs < c.now() - RETENTION_MS).length;
  t('J12 one call prunes at most PRUNE_LIMIT rows — bounded cost per request',
    left === 50, `stale rows remaining=${left} (expected 50)`);
  c.advance(400);
  await g.admit({ model: M8, messages: msg(10), maxTokens: 0, opId: op() });
  const left2 = [...store._rows.values()].filter(r => r.createdMs < c.now() - RETENTION_MS).length;
  t('J13 the remainder is collected by the following call', left2 === 0, `remaining=${left2}`);
}
{
  const sql = fs.readFileSync('supabase/migrations/20260904_mistral_quota_governor.sql', 'utf8');
  t('S15 ★ reconcile validates retention > window before any prune',
    /p_retention_ms <= p_window_ms/.test(sql.slice(sql.indexOf('FUNCTION public.mistral_quota_reconcile'))),
    'reconcile enforces the same invariant admission does');
  t('S16 reconcile takes p_window_ms as an INPUT rather than assuming it',
    /mistral_quota_reconcile\(\s*\n\s*p_op_id\s+TEXT,\s*\n\s*p_actual\s+INTEGER,\s*\n\s*p_now_ms\s+BIGINT[^)]*p_window_ms/.test(sql),
    'window is a parameter');
  t('S17 the grants name the six-argument reconcile signature',
    (sql.match(/mistral_quota_reconcile\(TEXT,INTEGER,BIGINT,INTEGER,INTEGER,INTEGER\)/g) || []).length === 2,
    `${(sql.match(/mistral_quota_reconcile\(TEXT,INTEGER,BIGINT,INTEGER,INTEGER,INTEGER\)/g) || []).length} grant/revoke sites`);
  t('S12 ★ the SQL takes the OP lock before the BUCKET lock — fixed order, no deadlock cycle',
    sql.indexOf("mistral_quota_op:' || p_op_id") < sql.indexOf("mistral_quota:' || p_bucket"),
    'op lock precedes bucket lock in admit');
  t('S13 reconcile and release take the op lock too, in the same order',
    (sql.match(/mistral_quota_op:/g) || []).length === 3,
    `${(sql.match(/mistral_quota_op:/g) || []).length} op-lock sites (admit, reconcile, release)`);
  t('S14 the insert carries no ON CONFLICT — the existing-row case returns before it',
    !/ON CONFLICT \(op_id\) DO NOTHING/.test(sql), 'no silent conflict swallow');
  t('S8 the SQL prunes INSIDE the advisory lock, after acquiring it',
    sql.indexOf('pg_advisory_xact_lock') < sql.indexOf('WITH doomed AS'), 'lock precedes prune');
  t('S9 the SQL refuses a retention horizon inside the window',
    /retention \(% ms\) must exceed the admission window/.test(sql));
  t('S10 the SQL bounds the prune with LIMIT',
    /LIMIT p_prune_limit/.test(sql));
  t('S11 reconcile and release both handle a pruned row without raising',
    /'late', true/.test(sql) && (sql.match(/'late', true/g) || []).length >= 2,
    `${(sql.match(/'late', true/g) || []).length} late-tolerant returns`);
}

console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
