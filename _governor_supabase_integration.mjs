// ════════════════════════════════════════════════════════════════════════════════════════
//  MISTRAL QUOTA GOVERNOR — POST-APPLY SUPABASE INTEGRATION RUNNER (P1–P13)
//
//  THIS IS THE ACCEPTANCE GATE. Until this exits 0 against a real project, the governor is
//  unproven: every other suite tests a hand-written mirror of the PL/pgSQL, not the PL/pgSQL.
//  A PostgREST root listing showing the RPCs exist is NOT acceptance — it proves registration,
//  not behaviour.
//
//  IT TALKS ONLY TO SUPABASE. No model provider is contacted at any point, by any case.
//
//  IT IS SAFE TO RUN AGAINST THE LIVE PROJECT. Every row it writes is keyed to a bucket named
//  __itest_<runId>, which no real model maps to, so it can never perturb live accounting; and
//  it deletes its own rows in a finally block even when a case fails or the process throws.
//  Limits are passed to the RPC as parameters, so real model buckets are never touched.
//
//  CREDENTIALS ARE READ AT RUN TIME AND NEVER FROM A FILE. Nothing is picked up implicitly:
//  the runner refuses to start unless the variables are present in the environment.
//
//  usage:
//    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
//    SUPABASE_TEST_USER_JWT=... node _governor_supabase_integration.mjs [--rollback-drill]
// ════════════════════════════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_TEST_USER_JWT'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('REFUSING TO RUN — missing environment: ' + missing.join(', '));
  console.error('\nThis runner reads credentials from the ENVIRONMENT ONLY. It never loads .env.local,');
  console.error('so a run is always something you chose explicitly.\n');
  console.error('  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY — Supabase → Project Settings → API');
  console.error('  SUPABASE_TEST_USER_JWT — an access_token for any signed-in test user.');
  console.error('    P3 proves an AUTHENTICATED caller is denied; without a real user token that');
  console.error('    case cannot be proven, and this gate does not skip cases it cannot prove.');
  process.exit(2);
}
const URL_ = process.env.SUPABASE_URL.replace(/\/+$/, '');
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const UJWT = process.env.SUPABASE_TEST_USER_JWT;
const DRILL = process.argv.includes('--rollback-drill');

const RUN_ID = crypto.randomUUID().slice(0, 8);
const BUCKET = `__itest_${RUN_ID}`;
let opSeq = 0;
const op = (tag) => `__itest_${RUN_ID}_${String(++opSeq).padStart(3, '0')}_${tag}`;

let pass = 0, fail = 0;
const t = (name, ok, detail) => { ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '   — ' + detail : ''}`); };

const HDRS = (key, bearer) => ({ apikey: key, Authorization: 'Bearer ' + (bearer || key),
                                 'Content-Type': 'application/json', Accept: 'application/json' });
async function rpc(name, args, { key = SRK, bearer = null } = {}) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: HDRS(key, bearer), body: JSON.stringify(args) });
  let body = null; try { body = await r.json(); } catch (_) {}
  return { status: r.status, ok: r.ok, body };
}
async function table(method, qs, { key = SRK, bearer = null, body = null } = {}) {
  const r = await fetch(`${URL_}/rest/v1/mistral_quota_reservations${qs || ''}`, {
    method, headers: { ...HDRS(key, bearer), Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined });
  let b = null; try { b = await r.json(); } catch (_) {}
  return { status: r.status, ok: r.ok, body: b };
}

// The governor's own constants, read from source so the runner cannot drift from production.
const GOV = fs.readFileSync('api/_mistral-governor.js', 'utf8');
const WINDOW_MS = Number((GOV.match(/const WINDOW_MS = (\d+)/) || [])[1]);
const RETENTION_MS = WINDOW_MS * Number((GOV.match(/RETENTION_MS = WINDOW_MS \* (\d+)/) || [])[1]);
const PRUNE_LIMIT = Number((GOV.match(/const PRUNE_LIMIT = (\d+)/) || [])[1]);
const admitArgs = (o) => ({
  p_op_id: o.opId, p_bucket: o.bucket || BUCKET, p_now_ms: o.now, p_reserve: o.reserve,
  p_tpm: o.tpm ?? 1000000, p_window_ms: WINDOW_MS,
  p_min_interval_ms: o.minInterval ?? 0,
  p_retention_ms: o.retention ?? RETENTION_MS, p_prune_limit: o.pruneLimit ?? PRUNE_LIMIT });

const T0 = 1_800_000_000_000;   // fixed synthetic clock; the RPC takes now_ms, so no sleeping

console.log(`\n════ GOVERNOR SUPABASE INTEGRATION — run ${RUN_ID} ════`);
console.log(`  project: ${URL_}`);
console.log(`  bucket:  ${BUCKET}  (synthetic; no real model maps to it)`);
console.log(`  window=${WINDOW_MS}ms retention=${RETENTION_MS}ms pruneLimit=${PRUNE_LIMIT}\n`);

try {
  // ── P1 · RPC smoke, service role ──────────────────────────────────────────
  {
    const id = op('p1');
    const a = await rpc('mistral_quota_admit', admitArgs({ opId: id, now: T0, reserve: 100, tpm: 10000 }));
    t('P1a admit responds 200 with the documented shape',
      a.ok && a.body && a.body.admitted === true && typeof a.body.used_tokens === 'number',
      `status=${a.status} body=${JSON.stringify(a.body)}`);
    const rc = await rpc('mistral_quota_reconcile',
      { p_op_id: id, p_actual: 40, p_now_ms: T0, p_window_ms: WINDOW_MS, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT });
    t('P1b reconcile releases reserved − actual',
      rc.ok && rc.body.ok === true && rc.body.released === 60 && rc.body.exact === true, JSON.stringify(rc.body));
    const id2 = op('p1rel');
    await rpc('mistral_quota_admit', admitArgs({ opId: id2, now: T0 + 1, reserve: 100, tpm: 10000 }));
    const rl = await rpc('mistral_quota_release', { p_op_id: id2, p_reason: 'itest' });
    t('P1c release returns the full reservation',
      rl.ok && rl.body.ok === true && rl.body.released === 100, JSON.stringify(rl.body));
  }

  // ── P2/P3/P4 · permissions ────────────────────────────────────────────────
  for (const [label, key, bearer, code] of [['P2 anon', ANON, null, 'anon'], ['P3 authenticated', ANON, UJWT, 'auth']]) {
    const r = await rpc('mistral_quota_admit', admitArgs({ opId: op(code), now: T0, reserve: 1, tpm: 10000 }), { key, bearer });
    t(`${label} CANNOT execute mistral_quota_admit`,
      !r.ok && (r.status === 401 || r.status === 403 || r.status === 404),
      `status=${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    const rc = await rpc('mistral_quota_reconcile', { p_op_id: 'x', p_actual: 1 }, { key, bearer });
    const rl = await rpc('mistral_quota_release', { p_op_id: 'x', p_reason: 'x' }, { key, bearer });
    t(`${label} cannot execute reconcile or release either`,
      !rc.ok && !rl.ok, `reconcile=${rc.status} release=${rl.status}`);
  }
  for (const [label, key, bearer] of [['P4 anon', ANON, null], ['P4 authenticated', ANON, UJWT]]) {
    const r = await table('GET', '?select=op_id&limit=1', { key, bearer });
    t(`${label} cannot read the reservations table`,
      !r.ok || (Array.isArray(r.body) && r.body.length === 0),
      `status=${r.status} rows=${Array.isArray(r.body) ? r.body.length : 'n/a'}`);
  }

  // ── P5 · ★ concurrent first-row admission on an EMPTY bucket ──────────────
  // The case SELECT … FOR UPDATE cannot hold: with no row to lock, two callers both pass.
  for (const N of [2, 20]) {
    const b = `${BUCKET}_p5_${N}`;
    const results = await Promise.all(Array.from({ length: N }, (_, i) =>
      rpc('mistral_quota_admit', admitArgs({ opId: op(`p5_${N}_${i}`), bucket: b, now: T0, reserve: 600, tpm: 1000, minInterval: 0 }))));
    const admitted = results.filter(r => r.ok && r.body && r.body.admitted === true).length;
    t(`P5 ${N} simultaneous first requests on an empty bucket: exactly ONE admitted`,
      admitted === 1, `admitted=${admitted} of ${N}`);
    const sum = await table('GET', `?bucket=eq.${b}&select=reserved`);
    const total = (sum.body || []).reduce((a, r) => a + r.reserved, 0);
    t(`P5 ${N} the bucket never exceeds its limit`, total <= 1000, `stored=${total} limit=1000`);
  }

  // ── P6 · ★ cross-process contention ───────────────────────────────────────
  {
    const b = `${BUCKET}_p6`;
    const child = await new Promise((resolve) => {
      const code = `
        const args = ${JSON.stringify(admitArgs({ opId: op('p6_child'), bucket: b, now: T0, reserve: 700, tpm: 1000, minInterval: 0 }))};
        fetch(process.env.U + '/rest/v1/rpc/mistral_quota_admit', { method:'POST',
          headers:{apikey:process.env.K,Authorization:'Bearer '+process.env.K,'Content-Type':'application/json'},
          body: JSON.stringify(args) }).then(r=>r.json()).then(j=>{ console.log(JSON.stringify(j)); });`;
      const p = spawn(process.execPath, ['-e', code], { env: { ...process.env, U: URL_, K: SRK } });
      let out = ''; p.stdout.on('data', d => out += d);
      p.on('close', () => { try { resolve(JSON.parse(out.trim())); } catch (_) { resolve(null); } });
    });
    t('P6a a separate PROCESS can admit', child && child.admitted === true, JSON.stringify(child));
    const mine = await rpc('mistral_quota_admit', admitArgs({ opId: op('p6_parent'), bucket: b, now: T0 + 1, reserve: 700, tpm: 1000, minInterval: 0 }));
    t('P6b ★ this process SEES the other process’s spend and is refused',
      mine.ok && mine.body.admitted === false && mine.body.reason === 'tpm', JSON.stringify(mine.body));
  }

  // ── P7 · RPS boundaries, every configured interval ────────────────────────
  for (const [name, iv] of [['3B 12.5rps', 80], ['8B 3.13rps', 320], ['Small 1rps', 1000], ['14B 0.5rps', 2000]]) {
    const b = `${BUCKET}_p7_${iv}`;
    await rpc('mistral_quota_admit', admitArgs({ opId: op(`p7a_${iv}`), bucket: b, now: T0, reserve: 1, tpm: 1000000, minInterval: iv }));
    const early = await rpc('mistral_quota_admit', admitArgs({ opId: op(`p7b_${iv}`), bucket: b, now: T0 + iv - 1, reserve: 1, tpm: 1000000, minInterval: iv }));
    const onTime = await rpc('mistral_quota_admit', admitArgs({ opId: op(`p7c_${iv}`), bucket: b, now: T0 + iv, reserve: 1, tpm: 1000000, minInterval: iv }));
    t(`P7 ${name}: refused at ${iv - 1}ms, admitted at ${iv}ms`,
      early.body.admitted === false && early.body.reason === 'rps' && onTime.body.admitted === true,
      `early=${JSON.stringify(early.body)} onTime=${onTime.body.admitted}`);
    t(`P7 ${name}: the RPS wait is reported separately from TPM`,
      early.body.retry_rps_ms === 1 && early.body.retry_tpm_ms === null,
      `rps=${early.body.retry_rps_ms} tpm=${early.body.retry_tpm_ms}`);
  }

  // ── P8 · TPM refusal and its retry time ───────────────────────────────────
  {
    const b = `${BUCKET}_p8`;
    await rpc('mistral_quota_admit', admitArgs({ opId: op('p8a'), bucket: b, now: T0, reserve: 900, tpm: 1000, minInterval: 0 }));
    const over = await rpc('mistral_quota_admit', admitArgs({ opId: op('p8b'), bucket: b, now: T0 + 5000, reserve: 200, tpm: 1000, minInterval: 0 }));
    t('P8a a request that does not fit is refused on TPM',
      over.body.admitted === false && over.body.reason === 'tpm', JSON.stringify(over.body));
    t('P8b retry_tpm_ms is when the OLDEST row leaves the window',
      over.body.retry_tpm_ms === WINDOW_MS - 5000, `got ${over.body.retry_tpm_ms} expected ${WINDOW_MS - 5000}`);
    const after = await rpc('mistral_quota_admit', admitArgs({ opId: op('p8c'), bucket: b, now: T0 + WINDOW_MS + 1, reserve: 200, tpm: 1000, minInterval: 0 }));
    t('P8c admitted once the window has rolled past it', after.body.admitted === true, JSON.stringify(after.body));
  }

  // ── P9/P10 · reconcile releases; absent usage holds ───────────────────────
  {
    const b = `${BUCKET}_p9`, id = op('p9');
    await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0, reserve: 900, tpm: 1000, minInterval: 0 }));
    await rpc('mistral_quota_reconcile', { p_op_id: id, p_actual: 100, p_now_ms: T0, p_window_ms: WINDOW_MS, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT });
    const reuse = await rpc('mistral_quota_admit', admitArgs({ opId: op('p9b'), bucket: b, now: T0 + 1, reserve: 890, tpm: 1000, minInterval: 0 }));
    t('P9 ★ released capacity is genuinely reusable', reuse.body.admitted === true, JSON.stringify(reuse.body));

    const b2 = `${BUCKET}_p10`, id2 = op('p10');
    await rpc('mistral_quota_admit', admitArgs({ opId: id2, bucket: b2, now: T0, reserve: 900, tpm: 1000, minInterval: 0 }));
    const rc = await rpc('mistral_quota_reconcile', { p_op_id: id2, p_actual: null, p_now_ms: T0, p_window_ms: WINDOW_MS, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT });
    t('P10a absent usage releases nothing and is not exact',
      rc.body.ok === true && rc.body.released === 0 && rc.body.exact === false, JSON.stringify(rc.body));
    const held = await rpc('mistral_quota_admit', admitArgs({ opId: op('p10b'), bucket: b2, now: T0 + 1, reserve: 200, tpm: 1000, minInterval: 0 }));
    t('P10b ★ the conservative reservation still charges the bucket — unknown is not zero',
      held.body.admitted === false && held.body.reason === 'tpm', JSON.stringify(held.body));
  }

  // ── P11 · provider 429 release, and double release ────────────────────────
  {
    const b = `${BUCKET}_p11`, id = op('p11');
    await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0, reserve: 900, tpm: 1000, minInterval: 0 }));
    const rl = await rpc('mistral_quota_release', { p_op_id: id, p_reason: 'provider_429' });
    t('P11a release hands back the full reservation', rl.body.ok === true && rl.body.released === 900, JSON.stringify(rl.body));
    const again = await rpc('mistral_quota_admit', admitArgs({ opId: op('p11b'), bucket: b, now: T0 + 1, reserve: 900, tpm: 1000, minInterval: 0 }));
    t('P11b ★ capacity is immediately reusable after a provider refusal', again.body.admitted === true, JSON.stringify(again.body));
    const dbl = await rpc('mistral_quota_release', { p_op_id: id, p_reason: 'double' });
    t('P11c a double release credits nothing', dbl.body.ok === false && (dbl.body.released || 0) === 0, JSON.stringify(dbl.body));
  }

  // ── P12 · idempotent op id ────────────────────────────────────────────────
  {
    const b = `${BUCKET}_p12`, id = op('p12');
    await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0, reserve: 300, tpm: 100000, minInterval: 0 }));
    await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0 + 5000, reserve: 300, tpm: 100000, minInterval: 0 }));
    const rows = await table('GET', `?bucket=eq.${b}&select=op_id,reserved`);
    t('P12 a replayed op id stores ONE row and charges once',
      Array.isArray(rows.body) && rows.body.length === 1, `rows=${(rows.body || []).length}`);
  }

  // ── P14 · idempotency decided BEFORE rps/tpm ──────────────────────────────
  {
    const b = `${BUCKET}_p14`, id = op('p14');
    const a1 = await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0, reserve: 500, tpm: 1000, minInterval: 1000 }));
    t('P14a first admission', a1.body.admitted === true && a1.body.replay === false, JSON.stringify(a1.body));
    // SAME INSTANT, and the minimum interval is 1000 ms: the old order refused a replay on RPS
    // using its own prior row. It must now be answered from the row instead.
    const a2 = await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0, reserve: 500, tpm: 1000, minInterval: 1000 }));
    t('P14b ★ same-instant replay is admitted as a replay, not refused on RPS by its own row',
      a2.body.admitted === true && a2.body.replay === true, JSON.stringify(a2.body));
    t('P14c the replay reports current usage, not used+reserve as though it inserted',
      a2.body.used_tokens === 500, `used=${a2.body.used_tokens}`);
    const a3 = await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0 + 5000, reserve: 500, tpm: 1000, minInterval: 1000 }));
    t('P14d replay after time is still a stable replay', a3.body.replay === true && a3.body.admitted === true, JSON.stringify(a3.body));
    const rows = await table('GET', `?bucket=eq.${b}&select=op_id`);
    t('P14e all replays stored exactly ONE row', (rows.body || []).length === 1, `rows=${(rows.body||[]).length}`);
    const mm = await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0 + 6000, reserve: 999, tpm: 1000, minInterval: 1000 }));
    t('P14f ★ same op id with a different reserve is a named mismatch',
      mm.body.admitted === false && mm.body.reason === 'op_id_mismatch', JSON.stringify(mm.body));
    const rel = await rpc('mistral_quota_release', { p_op_id: id, p_reason: 'itest' });
    const a4 = await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0 + 7000, reserve: 500, tpm: 1000, minInterval: 1000 }));
    t('P14g a replay of a RELEASED reservation does not silently re-take capacity',
      rel.body.ok === true && a4.body.admitted === false && a4.body.reason === 'already_released', JSON.stringify(a4.body));
  }

  // ── P16 · ★ SAME op_id, DIFFERENT buckets, GENUINELY CONCURRENT ───────────
  // op_id is the table's PRIMARY KEY and is global; the bucket lock is not. Two first requests
  // with one id and two buckets used to take two different locks, both see no row, and both
  // insert — one hitting the PK and RAISING instead of returning op_id_mismatch. Fired with
  // Promise.all, not sequentially: a sequential pair cannot reproduce it, because the second
  // call would simply find the first one's row.
  //
  // This is the ONLY place the raise-vs-mismatch distinction can be proven. The in-process
  // mirror has a JS guard where the insert is and cannot produce a PK exception.
  {
    const shared = op('p16_shared');
    const mk = (bucket) => admitArgs({ opId: shared, bucket, now: T0, reserve: 100, tpm: 1000000, minInterval: 0 });
    const [ra, rb] = await Promise.all([
      rpc('mistral_quota_admit', mk(`${BUCKET}_p16a`)),
      rpc('mistral_quota_admit', mk(`${BUCKET}_p16b`))
    ]);
    const bodies = [ra.body, rb.body];
    const admitted = bodies.filter(b => b && b.admitted === true).length;
    const mismatched = bodies.filter(b => b && b.reason === 'op_id_mismatch').length;
    const raised = [ra, rb].filter(r => r.status >= 400 ||
      (r.body && (r.body.code || r.body.message) && r.body.admitted === undefined)).length;
    t('P16a ★ NEITHER concurrent call raised a SQL error',
      raised === 0, `statuses=${ra.status}/${rb.status} bodies=${JSON.stringify(bodies).slice(0, 220)}`);
    t('P16b ★ exactly ONE stable admission', admitted === 1, `admitted=${admitted}`);
    t('P16c ★ the loser received a NAMED op_id_mismatch', mismatched === 1,
      `mismatched=${mismatched} ${JSON.stringify(bodies).slice(0, 200)}`);
    const rows = await table('GET', `?op_id=eq.${shared}&select=op_id,bucket`);
    t('P16d ★ exactly ONE row exists for the shared op id — no double row',
      (rows.body || []).length === 1, `rows=${(rows.body || []).length}`);
    // And repeated concurrent bursts, since a race that survives once may not survive ten times.
    let anyRaise = 0, anyDouble = 0;
    for (let i = 0; i < 10; i++) {
      const id = op(`p16_burst_${i}`);
      const rs = await Promise.all([
        rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: `${BUCKET}_p16x`, now: T0 + i, reserve: 10, tpm: 1000000, minInterval: 0 })),
        rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: `${BUCKET}_p16y`, now: T0 + i, reserve: 10, tpm: 1000000, minInterval: 0 }))
      ]);
      if (rs.some(r => r.status >= 400)) anyRaise++;
      const rr = await table('GET', `?op_id=eq.${id}&select=op_id`);
      if ((rr.body || []).length !== 1) anyDouble++;
    }
    t('P16e ★ 10 concurrent same-op bursts: zero raises, zero double rows',
      anyRaise === 0 && anyDouble === 0, `raises=${anyRaise} doubleRows=${anyDouble}`);
  }

  // ── P15 · argument validation ─────────────────────────────────────────────
  {
    const b = `${BUCKET}_p15`;
    for (const [field, val] of [['p_reserve', 0], ['p_reserve', -1], ['p_tpm', 0],
                                ['p_window_ms', 0], ['p_min_interval_ms', -1], ['p_prune_limit', 0]]) {
      const args = { ...admitArgs({ opId: op('p15'), bucket: b, now: T0, reserve: 10, tpm: 1000 }), [field]: val };
      const r = await rpc('mistral_quota_admit', args);
      t(`P15 ${field}=${val} is refused as invalid_arguments`,
        r.status === 200 && r.body.admitted === false && r.body.reason === 'invalid_arguments',
        `status=${r.status} ${JSON.stringify(r.body).slice(0, 90)}`);
    }
    const id = op('p15neg');
    await rpc('mistral_quota_admit', admitArgs({ opId: id, bucket: b, now: T0, reserve: 100, tpm: 100000, minInterval: 0 }));
    const neg = await rpc('mistral_quota_reconcile', { p_op_id: id, p_actual: -5, p_now_ms: T0, p_window_ms: WINDOW_MS, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT });
    t('P15 ★ a NEGATIVE actual preserves the conservative reservation instead of reducing it',
      neg.body.ok === true && neg.body.released === 0 && neg.body.held === 100 && neg.body.exact === false,
      JSON.stringify(neg.body));
  }

  // ── P17 · reconcile prune arguments are validated (no live row may be deleted) ──
  // Reconcile pruned on `retention > 0` alone while admission also required retention > window.
  // retention=1 gave a one-millisecond horizon here: rows still inside the live 60 s window,
  // still charging the bucket, were deleted and their capacity silently reopened.
  {
    const b = `${BUCKET}_p17`;
    const live = op('p17_live'), target = op('p17_target');
    await rpc('mistral_quota_admit', admitArgs({ opId: live, bucket: b, now: T0, reserve: 5000, tpm: 1000000, minInterval: 0 }));
    await rpc('mistral_quota_admit', admitArgs({ opId: target, bucket: b, now: T0 + 1000, reserve: 100, tpm: 1000000, minInterval: 0 }));
    const BAD = [
      ['retention<=window', { p_now_ms: T0 + 2000, p_window_ms: WINDOW_MS, p_retention_ms: 1, p_prune_limit: PRUNE_LIMIT }],
      ['retention==window', { p_now_ms: T0 + 2000, p_window_ms: WINDOW_MS, p_retention_ms: WINDOW_MS, p_prune_limit: PRUNE_LIMIT }],
      ['prune_limit=0',     { p_now_ms: T0 + 2000, p_window_ms: WINDOW_MS, p_retention_ms: RETENTION_MS, p_prune_limit: 0 }],
      ['window=0',          { p_now_ms: T0 + 2000, p_window_ms: 0, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT }],
      ['now missing',       { p_window_ms: WINDOW_MS, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT }],
      ['window missing',    { p_now_ms: T0 + 2000, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT }],
    ];
    for (const [label, args] of BAD) {
      const r = await rpc('mistral_quota_reconcile', { p_op_id: target, p_actual: 40, ...args });
      t(`P17 ${label} → typed invalid_arguments, no prune`,
        r.status === 200 && r.body.ok === false && r.body.reason === 'invalid_arguments',
        `status=${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
      const rows = await table('GET', `?bucket=eq.${b}&select=op_id,actual,state`);
      const liveRow = (rows.body || []).find(x => x.op_id === live);
      const tgtRow = (rows.body || []).find(x => x.op_id === target);
      t(`P17 ${label} → ★ the LIVE reservation was not deleted and still charges`,
        !!liveRow && liveRow.state === 'reserved', JSON.stringify(liveRow));
      t(`P17 ${label} → the target is left UNTOUCHED (not reconciled)`,
        !!tgtRow && tgtRow.actual === null && tgtRow.state === 'reserved', JSON.stringify(tgtRow));
    }
    // Reconcile-only, no prune arguments at all, remains valid.
    const only = await rpc('mistral_quota_reconcile', { p_op_id: target, p_actual: 40 });
    t('P17 no prune args → reconcile-only is valid and releases the difference',
      only.body.ok === true && only.body.released === 60 && only.body.exact === true, JSON.stringify(only.body));
  }

  // ── LATE / PRUNED RESPONSE, AND BOUNDED DRAIN ─────────────────────────────
  {
    const b = `${BUCKET}_prune`, lateId = op('late');
    await rpc('mistral_quota_admit', admitArgs({ opId: lateId, bucket: b, now: T0, reserve: 10, tpm: 100000, minInterval: 0 }));
    // An admission far in the future prunes anything past the retention horizon.
    await rpc('mistral_quota_admit', admitArgs({ opId: op('pruner'), bucket: b, now: T0 + RETENTION_MS + 1000, reserve: 10, tpm: 100000, minInterval: 0 }));
    const gone = await table('GET', `?op_id=eq.${lateId}&select=op_id`);
    t('L1 the aged reservation was pruned by an ordinary admission', (gone.body || []).length === 0, `rows=${(gone.body||[]).length}`);
    const rc = await rpc('mistral_quota_reconcile', { p_op_id: lateId, p_actual: 5, p_now_ms: T0 + RETENTION_MS + 1000, p_window_ms: WINDOW_MS, p_retention_ms: RETENTION_MS, p_prune_limit: PRUNE_LIMIT });
    t('L2 ★ reconciling a pruned reservation returns late:true and does NOT error',
      rc.status === 200 && rc.body.ok === false && rc.body.late === true && rc.body.released === 0, JSON.stringify(rc.body));
    const back = await table('GET', `?op_id=eq.${lateId}&select=op_id`);
    t('L3 ★ …and does not re-insert the row', (back.body || []).length === 0, `rows=${(back.body||[]).length}`);
    const rl = await rpc('mistral_quota_release', { p_op_id: lateId, p_reason: 'provider_429_late' });
    t('L4 ★ releasing a pruned reservation credits nothing and does not error',
      rl.status === 200 && rl.body.ok === false, JSON.stringify(rl.body));
  }
  {
    // ── BOUNDED DRAIN, AND WHAT "BOUNDED" DOES NOT MEAN ──
    // Each admission removes at most PRUNE_LIMIT stale rows. That bounds the COST of a request;
    // it does not bound STORAGE, because rows are only removed when a later admission happens.
    // A bucket that goes quiet keeps its historical rows indefinitely. This proves the bound
    // per call AND that draining never disturbs live-window accounting.
    const b = `${BUCKET}_drain`;
    const stale = PRUNE_LIMIT + 50;
    const rows = Array.from({ length: stale }, (_, i) => ({
      op_id: `${op('drain')}_${i}`, bucket: b, reserved: 1, actual: null,
      state: 'reconciled', created_ms: T0, expires_at: new Date(T0).toISOString() }));
    for (let i = 0; i < rows.length; i += 200) await table('POST', '', { body: rows.slice(i, i + 200) });
    const now = T0 + RETENTION_MS + 1000;
    // A live row inside the window, to prove the drain leaves it alone.
    await rpc('mistral_quota_admit', admitArgs({ opId: op('drain_live'), bucket: b, now: now - 1000, reserve: 7, tpm: 100000, minInterval: 0 }));
    const first = await rpc('mistral_quota_admit', admitArgs({ opId: op('drain1'), bucket: b, now, reserve: 1, tpm: 100000, minInterval: 0 }));
    t('D1 one admission prunes at most PRUNE_LIMIT rows',
      first.body.pruned <= PRUNE_LIMIT, `pruned=${first.body.pruned} limit=${PRUNE_LIMIT}`);
    const left = await table('GET', `?bucket=eq.${b}&created_ms=lt.${now - RETENTION_MS}&select=op_id`);
    t('D2 ★ leftovers REMAIN until a later admission — the bound is on cost, not on storage',
      (left.body || []).length > 0, `stale rows still present=${(left.body||[]).length}`);
    const second = await rpc('mistral_quota_admit', admitArgs({ opId: op('drain2'), bucket: b, now: now + 1, reserve: 1, tpm: 100000, minInterval: 0 }));
    t('D3 the next admission drains the remainder, also within the bound',
      second.body.pruned <= PRUNE_LIMIT, `pruned=${second.body.pruned}`);
    t('D4 ★ draining never disturbed live-window accounting',
      typeof second.body.used_tokens === 'number' && second.body.used_tokens >= 7,
      `used=${second.body.used_tokens} (the 7-token live row must still count)`);
  }

  // ── P13 · rollback / recovery ─────────────────────────────────────────────
  {
    // Non-destructive by default: verify the rollback SQL names the EXACT signatures that
    // exist, so it cannot silently drop nothing. A DROP that matches no signature succeeds and
    // leaves the objects in place — a rollback that appears to work and did not.
    const plan = fs.readFileSync('_audit_out/governor_integration_plan.md', 'utf8');
    // DERIVED, NOT TRANSCRIBED. A hardcoded list is how these went stale: the migration's
    // signatures changed twice and the doc's did not. Read them out of the migration itself so
    // the two cannot drift apart again.
    const mig = fs.readFileSync('supabase/migrations/20260904_mistral_quota_governor.sql', 'utf8');
    const sigs = [...mig.matchAll(/GRANT EXECUTE ON FUNCTION public\.(mistral_quota_[a-z]+\([A-Z,]+\))/g)].map(m => m[1]);
    t('P13a the documented rollback names every CURRENT signature (derived from the migration)',
      sigs.length === 3 && sigs.every(sg => plan.includes(sg)),
      sigs.filter(sg => !plan.includes(sg)).join(' | ') || `all ${sigs.length} present`);
    // The DRILL ITSELF IS MANUAL, ON PURPOSE. Between the DROP and the re-apply the governor
    // does not exist, and a proxy deployed against it fails closed — i.e. a live project stops
    // serving Mistral for that interval. A test runner should not open that window on its own
    // schedule; a person should, knowing what is running. --rollback-drill prints the exact
    // steps rather than performing them.
    if (DRILL) {
      console.log('\n  ── P13b ROLLBACK / RECOVERY DRILL (manual; run these yourself) ──');
      console.log('   1. Confirm the objects exist:');
      console.log("        SELECT to_regclass('public.mistral_quota_reservations');   -- expect a non-NULL oid");
      console.log("        SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace");
      console.log("         WHERE n.nspname='public' AND proname LIKE 'mistral_quota_%';  -- expect 3 rows");
      console.log('   2. Run the rollback block from _audit_out/governor_integration_plan.md.');
      console.log('   3. Re-run the same two queries: to_regclass NULL, zero proc rows.');
      console.log('   4. Re-apply supabase/migrations/20260904_mistral_quota_governor.sql.');
      console.log('   5. Re-run THIS file with no flag. Acceptance must pass again.');
      console.log('   While steps 2–4 are in flight the governor is absent and the proxy fails');
      console.log('   closed: Mistral requests are refused, not silently unmetered.\n');
    }
  }
} catch (e) {
  fail++; console.error('\n RUNNER THREW: ' + (e && e.message));
} finally {
  // ── CLEAN UP OUR OWN ROWS, ALWAYS ──
  const del = await table('DELETE', `?bucket=like.${BUCKET}*`);
  const leftover = await table('GET', `?bucket=like.${BUCKET}*&select=op_id`);
  const n = Array.isArray(leftover.body) ? leftover.body.length : -1;
  console.log(`\n  cleanup: delete=${del.status} remaining test rows=${n}`);
  if (n !== 0) { fail++; console.log(' FAIL  cleanup left rows behind — remove them before trusting a later run'); }
}

console.log(`\n${fail === 0 ? 'ACCEPTANCE PASSED' : 'ACCEPTANCE FAILED'}: ${pass} passed, ${fail} failed`);
console.log(fail === 0
  ? '  The governor is proven against the real RPCs.'
  : '  The governor remains UNPROVEN.');
process.exit(fail === 0 ? 0 : 1);
