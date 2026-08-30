#!/usr/bin/env node
/**
 * verify-fortune-security — the authenticated, atomic, user-bound Fortune wallet.
 *
 * Scope is deliberately narrow: the deduction path and the privileges around it.
 * No pricing, no starter economy, no baked scenes — those ship separately, once
 * the authored Scene 1 packages exist.
 *
 * The endpoint tests run THE REAL HANDLER with an injected Supabase factory, and
 * the RPC behind it is a transcription of consume_fortunes_v3. A hand-written
 * model of a server is only ever as accurate as the author's belief about it,
 * which is exactly how the claim-before-deduct defect stayed hidden.
 *
 * Run: node scripts/verify-fortune-security.mjs   (npm run verify:security)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app      = readFileSync(join(ROOT, 'public', 'app.js'), 'utf8');
const endpoint = readFileSync(join(ROOT, 'api', 'consume-fortune.js'), 'utf8');
const rpc      = readFileSync(join(ROOT, 'supabase', 'migrations', '20260830_atomic_fortune_operations.sql'), 'utf8');

let failures = 0, checks = 0;
function ok(cond, name, detail) {
  checks++;
  if (cond) { console.log(`  ok   ${name}`); return true; }
  failures++;
  console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`);
  return false;
}
function eq(actual, expected, name) {
  return ok(actual === expected, name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
/** Comments removed, so an assertion cannot be satisfied by prose. */
function codeOf(t) {
  return String(t || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
console.log('\n── the 90F grant ──');
const migration = readFileSync(join(ROOT, 'supabase', 'migrations', '20260830_gift_90_fortunes.sql'), 'utf8');
ok(/ALTER COLUMN fortunes SET DEFAULT 90/.test(migration), 'migration sets the column default to 90');
ok(/profiles/.test(migration), 'migration targets public.profiles');
ok(!/UPDATE public\.profiles\s+SET fortunes/i.test(migration),
  'migration does NOT backfill — existing users receive no second grant');
ok(codeOf(app).includes('_WELCOME_GIFT_FORTUNES = 90'), 'the client mirror reads 90');
// Idempotency is structural: one row per account, inserted only when absent.
const hydrate = app.slice(app.indexOf('async function hydrateProfile('), app.indexOf('function hydrateState('));
ok(/if \(!profile\) \{[\s\S]*?insert\(\{ id: userId \}\)/.test(hydrate),
  'the profile row is inserted only when none exists (one grant per account)');
ok(!/insert\(\{ id: userId, fortunes/.test(hydrate),
  'the client never supplies a balance on insert — the server default is authoritative');
// No client-side path may credit the wallet on login.
// The wallet IS credited elsewhere — checkout returns, refunds for failed
// generations, dev-console grants — and all of those are legitimate. What must
// never happen is a credit on the LOGIN path, which is what would hand a
// returning user a second grant. So scan that path specifically.
// Scope to the two hydration functions themselves. A wider slice sweeps in the
// checkout-return credit, which is a real purchase landing and must stay.
const hydrateFns = app.slice(app.indexOf('async function hydrateProfile('),
                             app.indexOf('function hydrateState(')) +
                   app.slice(app.indexOf('function hydrateState('),
                             app.indexOf('function hydrateState(') + 6000);
const bootCredits = codeOf(hydrateFns).match(/state\.fortunes\s*=\s*\(state\.fortunes \|\| 0\)\s*\+/g) || [];
ok(bootCredits.length === 0, 'the login / profile-hydration path never adds to the wallet',
  `found ${bootCredits.length} credit(s) in hydrateProfile/hydrateState`);
ok(/state\.fortunes = profile\.fortunes/.test(codeOf(app)),
  'login ADOPTS the server balance rather than computing one');
// The legacy per-book +20F grant: present as dead code, but must never be invoked.
const gtCalls = (codeOf(app).match(/grantTasteBookFortune\(/g) || []).length;
const gtDecl  = (codeOf(app).match(/function grantTasteBookFortune\(/g) || []).length;
const gtExport= (codeOf(app).match(/window\.grantTasteBookFortune\s*=/g) || []).length;
ok(gtCalls - gtDecl === 0, 'the legacy per-book +20F grant is never called',
  `${gtCalls} mention(s), ${gtDecl} declaration(s), ${gtExport} export(s) — a call would exceed the declaration count`);

console.log('\n── the REAL endpoint, exercised directly ──');
// Not a model of the endpoint — the endpoint. Its Supabase factory is injected,
// and the RPC behind it is a faithful transcription of consume_fortunes_v3
// (claim and deduction inseparable). A model of a server is only ever as good as
// the author's belief about it, which is how the original defect survived.
const { handleConsumeFortune } = await import(join(ROOT, 'api', 'consume-fortune.js'));

function supabaseStub(world) {
  return function createClient() {
    return {
      auth: {
        async getUser(token) {
          const uid = world.tokens[token];
          return uid ? { data: { user: { id: uid } }, error: null }
                     : { data: { user: null }, error: { message: 'bad token' } };
        }
      },
      async rpc(name, args) {
        world.rpcCalls.push({ name, args });
        if (name !== 'consume_fortunes_v3') return { data: null, error: { message: 'unknown rpc ' + name } };

        // ── consume_fortunes_v3, transcribed ──
        // The awaits are not decoration: they are the interleaving points a real
        // transaction has. Without the advisory lock two concurrent calls
        // genuinely both deduct here, which is what makes the race testable
        // rather than merely asserted. world.advisoryLock=false removes the lock
        // so the test can prove it is the thing preventing the double charge.
        const release = world.advisoryLock === false ? (() => {}) : await world.lockOperation(args.p_operation_id);
        try {
          await null;                                   // yield: another call may run
          if (world.rpcThrows) return { data: null, error: { message: 'boom' } };

          const op = world.ops.get(args.p_operation_id);
          if (op) {
            const mismatch = op.user_id !== args.p_user_id || op.amount !== args.p_amount
              || (op.context || '') !== (args.p_context || '')
              || (op.story_id || '') !== (args.p_story_id || '');
            if (mismatch) return { data: [{ source: 'operation_mismatch', fortunes: 0 }], error: null };
            if (op.status === 'succeeded') return { data: [{ source: 'duplicate', fortunes: op.balance_after }], error: null };
            if (op.status === 'unverified') return { data: [{ source: 'operation_unverified', fortunes: 0 }], error: null };
          }
          const bal = world.users[args.p_user_id];
          if (bal == null) return { data: [{ source: 'not_found', fortunes: 0 }], error: null };
          await null;                                   // yield: the window the race used
          if (bal < args.p_amount) return { data: [{ source: 'insufficient', fortunes: bal }], error: null };
          world.users[args.p_user_id] = bal - args.p_amount;
          world.ops.set(args.p_operation_id, {
            user_id: args.p_user_id, amount: args.p_amount, context: args.p_context,
            story_id: args.p_story_id, status: 'succeeded', balance_after: world.users[args.p_user_id]
          });
          return { data: [{ source: 'consumed', fortunes: world.users[args.p_user_id] }], error: null };
        } finally { release(); }
      },
      from() { return { select(){ return this; }, eq(){ return this; }, async maybeSingle(){ return { data: null }; }, async insert(){ return { data: null }; } }; }
    };
  };
}

async function callEndpoint(world, { auth, body }) {
  process.env.SUPABASE_URL = 'http://stub';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service';
  process.env.SUPABASE_ANON_KEY = 'stub-anon';
  const req = { method: 'POST', headers: { origin: 'http://localhost', ...(auth ? { authorization: auth } : {}) }, body };
  let statusCode = 0, payload = null;
  const res = { setHeader(){}, status(c){ statusCode = c; return this; }, json(p){ payload = p; return this; }, end(){ return this; } };
  await handleConsumeFortune(req, res, { createClient: supabaseStub(world) });
  return { status: statusCode, body: payload };
}
function newWorld(users) {
  const w = {
    users: { ...users }, ops: new Map(),
    tokens: { 'tok-a': 'user-a', 'tok-b': 'user-b' },
    rpcCalls: [], rpcThrows: false,
    advisoryLock: true,          // modelling pg_advisory_xact_lock(hashtextextended(op_id))
    _locks: new Map()
  };
  // Transaction-scoped lock keyed by operation id: a second holder waits for the
  // first to release, exactly as the advisory lock makes it wait for the commit.
  w.lockOperation = async (opId) => {
    while (w._locks.get(opId)) await w._locks.get(opId);
    let release;
    const held = new Promise(res => { release = res; });
    w._locks.set(opId, held);
    return () => { w._locks.delete(opId); release(); };
  };
  return w;
}

{ const w = newWorld({ 'user-a': 90 });
  const r = await callEndpoint(w, { body: { amount: 60, context: 'c', operationId: 'op1' } });
  eq(r.status, 401, 'endpoint: no token → 401');
  eq(w.users['user-a'], 90, 'endpoint: nothing charged without a token'); }

{ const w = newWorld({ 'user-a': 90, 'user-b': 90 });
  const r = await callEndpoint(w, { auth: 'Bearer tok-a', body: { userId: 'user-b', amount: 60, context: 'c', operationId: 'op1' } });
  eq(r.status, 403, 'endpoint: body userId ≠ session → 403');
  eq(r.body.error, 'user_mismatch', 'endpoint: reported as user_mismatch');
  eq(w.users['user-b'], 90, "endpoint: the named account's wallet is untouched"); }

{ const w = newWorld({ 'user-a': 90 });
  const r = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c' } });
  eq(r.status, 400, 'endpoint: a charge without an operation id → 400');
  eq(w.users['user-a'], 90, 'endpoint: and nothing is charged'); }

{ const w = newWorld({ 'user-a': 90 });
  const a = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  eq(a.status, 200, 'endpoint: a valid charge succeeds');
  eq(w.users['user-a'], 30, 'endpoint: 60F deducted');
  const b = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  eq(b.status, 200, 'endpoint: the identical retry succeeds');
  ok(b.body.duplicate === true, 'endpoint: ...as a replay');
  eq(w.users['user-a'], 30, 'endpoint: and charges nothing further'); }

{ const w = newWorld({ 'user-a': 90, 'user-b': 90 });
  await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  const r = await callEndpoint(w, { auth: 'Bearer tok-b', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  eq(r.status, 409, "endpoint: another account replaying the id → 409");
  eq(w.users['user-b'], 90, 'endpoint: the replayer is neither charged nor granted'); }

{ const w = newWorld({ 'user-a': 200 });
  await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  const amt = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 130, context: 'c', operationId: 'op1', storyId: 's1' } });
  eq(amt.status, 409, 'endpoint: same id, different amount → 409');
  const ctx = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'other', operationId: 'op1', storyId: 's1' } });
  eq(ctx.status, 409, 'endpoint: same id, different context → 409');
  const sty = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's2' } });
  eq(sty.status, 409, 'endpoint: same id, different story → 409');
  eq(w.users['user-a'], 140, 'endpoint: no mismatched replay moved the balance'); }

{ const w = newWorld({ 'user-a': 20 });
  const r = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  eq(r.status, 403, 'endpoint: insufficient balance → 403');
  eq(w.ops.size, 0, 'endpoint: an insufficient charge records NO claim');
  const again = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  eq(again.status, 403, 'endpoint: the retry is still refused — never paid, never replayable'); }

{ const w = newWorld({ 'user-a': 90 }); w.rpcThrows = true;
  const r = await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  eq(r.status, 500, 'endpoint: a failed deduction → 500');
  eq(w.ops.size, 0, 'endpoint: and leaves no claim behind');
  eq(w.users['user-a'], 90, 'endpoint: and no money moved');
  ok(r.body.retryable === true, 'endpoint: the failure is marked retryable'); }

{ const w = newWorld({ 'user-a': 90 });
  await callEndpoint(w, { auth: 'Bearer tok-a', body: { amount: 60, context: 'c', operationId: 'op1', storyId: 's1' } });
  ok(w.rpcCalls.every(c => c.name === 'consume_fortunes_v3'),
    'endpoint: the deduction goes through the atomic v3 RPC only');
  eq(w.rpcCalls[0].args.p_user_id, 'user-a', 'endpoint: the RPC receives the AUTHENTICATED id'); }

console.log('\n── two simultaneous calls ──');
// Genuinely concurrent: both promises are started before either is awaited, and
// the RPC yields at the points a real transaction would. Remove the lock and
// these fail — see the mutation evidence.

const both = (world, a, b) => Promise.all([callEndpoint(world, a), callEndpoint(world, b)]);
const req = (over = {}) => ({ auth: 'Bearer tok-a',
  body: { amount: 60, context: 'c', operationId: 'op-race', storyId: 's1', ...over } });

{ // identical operation + user ⇒ one deduction, one replay
  const w = newWorld({ 'user-a': 90 });
  const [r1, r2] = await both(w, req(), req());
  eq(w.users['user-a'], 30, 'identical concurrent: charged exactly once');
  eq(w.ops.size, 1, 'identical concurrent: one operation row');
  ok(r1.status === 200 && r2.status === 200, 'identical concurrent: both callers succeed');
  eq([r1, r2].filter(r => r.body.duplicate === true).length, 1,
    'identical concurrent: exactly one of them is a replay');
}

{ // same operation, different user ⇒ one charge, one mismatch
  const w = newWorld({ 'user-a': 90, 'user-b': 90 });
  const [r1, r2] = await both(w, req(), { auth: 'Bearer tok-b', body: { ...req().body } });
  const charged = [w.users['user-a'], w.users['user-b']].filter(v => v === 30).length;
  eq(charged, 1, 'different users, same id: exactly ONE account was charged');
  eq([r1, r2].filter(r => r.status === 409).length, 1, '...and the other got operation_mismatch');
  eq(w.ops.size, 1, '...leaving one operation row');
  const owner = [...w.ops.values()][0].user_id;
  eq(w.users[owner], 30, '...which belongs to the account that actually paid');
}

{ // same operation, different amount ⇒ one charge, one mismatch
  const w = newWorld({ 'user-a': 200 });
  const [r1, r2] = await both(w, req({ amount: 60 }), req({ amount: 130 }));
  const statuses = [r1.status, r2.status].sort();
  eq(statuses.join(','), '200,409', 'different amounts, same id: one succeeds, one is rejected');
  ok(w.users['user-a'] === 140 || w.users['user-a'] === 70,
    'different amounts: exactly one deduction happened', `balance ${w.users['user-a']}`);
  eq(w.ops.size, 1, 'different amounts: one operation row');
  eq([...w.ops.values()][0].amount, 200 - w.users['user-a'],
    'the surviving row describes the charge that actually happened');
}

{ // same operation, different context ⇒ one charge, one mismatch
  const w = newWorld({ 'user-a': 200 });
  const [r1, r2] = await both(w, req({ context: 'c' }), req({ context: 'other' }));
  eq([r1.status, r2.status].sort().join(','), '200,409', 'different contexts, same id: one rejected');
  eq(w.users['user-a'], 140, 'different contexts: exactly one deduction');
}

{ // same operation, different story ⇒ one charge, one mismatch
  const w = newWorld({ 'user-a': 200 });
  const [r1, r2] = await both(w, req({ storyId: 's1' }), req({ storyId: 's2' }));
  eq([r1.status, r2.status].sort().join(','), '200,409', 'different stories, same id: one rejected');
  eq(w.users['user-a'], 140, 'different stories: exactly one deduction');
}

{ // insufficient first, funded retry ⇒ one eventual charge
  const w = newWorld({ 'user-a': 20 });
  const first = await callEndpoint(w, req());
  eq(first.status, 403, 'insufficient → refused');
  eq(w.ops.size, 0, 'insufficient → no claim');
  w.users['user-a'] = 90;                       // they top up
  const second = await callEndpoint(w, req());
  eq(second.status, 200, 'funded retry succeeds');
  eq(w.users['user-a'], 30, 'funded retry charges exactly once');
  eq(w.ops.size, 1, 'funded retry claims exactly once');
}

{ // RPC failure, then retry ⇒ one eventual charge
  const w = newWorld({ 'user-a': 90 });
  w.rpcThrows = true;
  const first = await callEndpoint(w, req());
  eq(first.status, 500, 'RPC failure → 500');
  eq(w.ops.size, 0, 'RPC failure → no claim survives');
  w.rpcThrows = false;
  const second = await callEndpoint(w, req());
  eq(second.status, 200, 'the retry succeeds');
  eq(w.users['user-a'], 30, 'charged exactly once across the failure and the retry');
}

{ // a quarantined pre-v3 claim never replays as paid
  const w = newWorld({ 'user-a': 90 });
  w.ops.set('legacy-op', { user_id: 'user-a', amount: 60, context: 'c', story_id: 's1',
                           status: 'unverified', balance_after: null });
  const r = await callEndpoint(w, { auth: 'Bearer tok-a',
    body: { amount: 60, context: 'c', operationId: 'legacy-op', storyId: 's1' } });
  eq(r.status, 409, 'a pre-v3 claim is refused, not replayed');
  eq(r.body.error, 'operation_unverified', '...and is reported as needing reconciliation');
  eq(w.users['user-a'], 90, '...and neither charges nor grants');
}

console.log('\n── legacy rows are quarantined, not promoted ──');
ok(/ADD COLUMN IF NOT EXISTS status\s+text NOT NULL DEFAULT 'unverified'/.test(rpc),
  'existing operation rows default to unverified, never succeeded');
ok(/SET status = 'unverified'[\s\S]{0,200}balance_after IS NULL/.test(rpc),
  'a re-run re-quarantines anything v3 did not write');
// Pin the GUARD, not the return line — a mutation that makes the branch
// unreachable leaves the string in place and would otherwise pass.
ok(/IF v_op\.status = 'unverified' THEN[\s\S]{0,600}?RETURN QUERY SELECT 'operation_unverified'/.test(rpc),
  'an unverified claim is caught by its own guard and refused');
ok(/operation_unverified/.test(endpoint), '...and the endpoint surfaces it distinctly');
{
  // It must also be unreachable as a paid replay: the succeeded check comes
  // first, and nothing between them can fall through to the charge path.
  const succIdx = rpc.indexOf("IF v_op.status = 'succeeded' THEN");
  const unvIdx  = rpc.indexOf("IF v_op.status = 'unverified' THEN");
  ok(succIdx > -1 && unvIdx > succIdx, 'the succeeded and unverified branches are both present, in order');
}
ok(!/UPDATE public\.fortune_operations[\s\S]{0,300}created_at BETWEEN/.test(rpc),
  'the migration does NOT bulk-promote legacy rows on a time window');
ok(/ALTER TABLE public\.fortune_ledger[\s\S]{0,120}operation_id/.test(rpc),
  'the ledger gains operation_id so future reconciliation is deterministic');
ok(/operation_id\)\s*\n\s*VALUES[\s\S]{0,300}p_operation_id\)/.test(rpc),
  'v3 writes the operation id into the ledger');
ok(/PERFORM pg_advisory_xact_lock\(hashtextextended\(p_operation_id, 0\)\)/.test(rpc),
  'the RPC serializes on the operation id BEFORE the lookup');
{
  const lockPos = rpc.indexOf('pg_advisory_xact_lock');
  const lookupPos = rpc.indexOf('SELECT * INTO v_op');
  const profilePos = rpc.indexOf('FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE');
  ok(lockPos > -1 && lockPos < lookupPos && lookupPos < profilePos,
    'order is: advisory lock → operation lookup → profile lock');
}

console.log('\n── the RPC is not reachable as a public API ──');
// A SECURITY DEFINER function that takes p_user_id is a wallet with a door on
// it. These tests derive a privilege model FROM the migration and then attempt
// the call as each role, so removing a REVOKE fails here rather than in
// production.

/** Which roles may execute a function, according to the migration text. */
function privilegesFor(fnName) {
  // The DO block sweeps a name list; the explicit signatures above it are the
  // documented contract. Both must name the function for it to be locked.
  const swept = new RegExp(`'${fnName}'`).test(rpc) &&
                /REVOKE ALL ON FUNCTION %s FROM anon/.test(rpc) &&
                /REVOKE ALL ON FUNCTION %s FROM authenticated/.test(rpc) &&
                /REVOKE ALL ON FUNCTION %s FROM PUBLIC/.test(rpc);
  const grantsService = /GRANT EXECUTE ON FUNCTION %s TO service_role/.test(rpc);
  return { anon: !swept, authenticated: !swept, service_role: swept ? grantsService : true, swept };
}

/** Attempt an RPC as a role, honouring that model. */
function rpcAs(role, fnName) {
  const priv = privilegesFor(fnName);
  if (!priv[role]) return { error: { code: '42501', message: `permission denied for function ${fnName}` } };
  return { data: [{ source: 'consumed', fortunes: 0 }], error: null };
}

for (const fn of ['consume_fortunes_v3', 'consume_fortunes_v2', 'consume_fortunes',
                  'grant_welcome_milestone', 'grant_purchase_fortunes']) {
  for (const role of ['anon', 'authenticated']) {
    const r = rpcAs(role, fn);
    ok(r.error && r.error.code === '42501',
      `${fn}: direct RPC as ${role} is DENIED`,
      r.error ? '' : 'the call succeeded — the function is publicly executable');
  }
  ok(!rpcAs('service_role', fn).error, `${fn}: the server (service_role) may still call it`);
}

// The sweep must actually name every balance-mutating function.
for (const fn of ['consume_fortunes_v3', 'consume_fortunes_v2', 'consume_fortunes',
                  'grant_welcome_milestone', 'grant_purchase_fortunes']) {
  ok(new RegExp(`'${fn}'`).test(rpc), `the lockdown names ${fn}`);
}
ok(/REVOKE ALL ON FUNCTION %s FROM PUBLIC/.test(rpc), 'the sweep revokes from PUBLIC');
ok(/REVOKE ALL ON FUNCTION %s FROM anon/.test(rpc), 'the sweep revokes from anon');
ok(/REVOKE ALL ON FUNCTION %s FROM authenticated/.test(rpc), 'the sweep revokes from authenticated');
ok(/GRANT EXECUTE ON FUNCTION %s TO service_role/.test(rpc), 'the sweep grants service_role');
ok(/RAISE WARNING 'only % fortune function\(s\) locked down/.test(rpc),
  'the migration warns if it locked down suspiciously few functions');

// Revoking is only safe because the browser calls none of these.
{
  const clientRpcs = [...codeOf(app).matchAll(/\bsb\.rpc\(\s*'([a-z_]+)'/g)].map(m => m[1]);
  const locked = ['consume_fortunes', 'consume_fortunes_v2', 'consume_fortunes_v3',
                  'grant_welcome_milestone', 'grant_purchase_fortunes'];
  const collisions = clientRpcs.filter(n => locked.includes(n));
  eq(collisions.length, 0,
    'the browser calls none of the locked functions directly (so the REVOKEs break nothing)',
    `client RPCs: ${clientRpcs.join(', ') || 'none'}`);
}

console.log('\n── create and lock down are one transaction ──');

/**
 * Split SQL into statements, respecting $$ / $function$ quoted bodies, single
 * quotes, and -- comments. Comments matter: this migration documents its
 * explicit REVOKE signatures in comment lines that END IN SEMICOLONS, and a
 * splitter that honours those chops statements apart in the middle.
 */
function splitSql(sql) {
  const out = []; let buf = '', i = 0, tag = null;
  while (i < sql.length) {
    if (tag) {
      if (sql.startsWith(tag, i)) { buf += tag; i += tag.length; tag = null; }
      else buf += sql[i++];
      continue;
    }
    if (sql.startsWith('--', i)) {                     // line comment: copy, never parse
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl + 1;
      buf += sql.slice(i, end); i = end; continue;
    }
    if (sql[i] === "'") {                              // string literal
      let j = i + 1;
      while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) j += (sql[j] === "'" ? 2 : 1);
      buf += sql.slice(i, j + 1); i = j + 1; continue;
    }
    const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
    if (m) { tag = m[0]; buf += tag; i += tag.length; continue; }
    if (sql[i] === ';') { buf += ';'; out.push(buf.trim()); buf = ''; i++; continue; }
    buf += sql[i++];
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Apply the migration's statements with Postgres transaction semantics: work
 * inside BEGIN…COMMIT is discarded if any statement raises. Enough to answer the
 * only question that matters here — after a failed privilege sweep, does
 * consume_fortunes_v3 still exist, and is it locked?
 */
function runMigration(sql, { failOn } = {}) {
  const db = { durable: new Set(), locked: new Set() };
  let inTxn = false, staged = null, stagedLock = null, aborted = false;
  const begin = () => { inTxn = true; staged = new Set(db.durable); stagedLock = new Set(db.locked); };
  const commit = () => { db.durable = staged; db.locked = stagedLock; inTxn = false; staged = null; };
  const rollback = () => { inTxn = false; staged = null; stagedLock = null; aborted = true; };

  for (const st of splitSql(sql)) {
    const head = st.replace(/^\s*(--[^\n]*\n\s*)*/, '');       // skip leading comments
    try {
      if (/^BEGIN\s*;/i.test(head)) { begin(); continue; }
      if (/^COMMIT\s*;/i.test(head)) { commit(); continue; }
      const target = inTxn ? staged : db.durable;
      const lockTarget = inTxn ? stagedLock : db.locked;
      if (/CREATE OR REPLACE FUNCTION public\.consume_fortunes_v3/i.test(head)) {
        target.add('consume_fortunes_v3');                      // PUBLIC-executable by default
        continue;
      }
      if (/^DO\s*\$/i.test(head) && /REVOKE ALL ON FUNCTION/i.test(head)) {
        if (failOn === 'sweep') throw new Error('sweep failed');
        // The sweep can only secure a function that exists at this point.
        if (target.has('consume_fortunes_v3')) lockTarget.add('consume_fortunes_v3');
        else if (/RAISE EXCEPTION 'consume_fortunes_v3 not found/.test(head)) throw new Error('v3 missing');
        continue;
      }
    } catch (e) {
      if (inTxn) { rollback(); break; }
      aborted = true; break;
    }
  }
  return { exists: db.durable.has('consume_fortunes_v3'), locked: db.locked.has('consume_fortunes_v3'), aborted };
}

{ // the happy path
  const r = runMigration(rpc);
  ok(r.exists, 'a successful migration leaves consume_fortunes_v3 in place');
  ok(r.locked, '...and locked down');
  ok(!r.aborted, '...with no abort');
}

{ // THE DEFECT: the sweep fails after the function is created
  const r = runMigration(rpc, { failOn: 'sweep' });
  ok(r.aborted, 'a failed privilege sweep aborts the migration');
  ok(!r.exists,
    'a failed sweep leaves NO consume_fortunes_v3 behind — it cannot survive as a publicly executable function',
    'v3 was committed despite the failure: the sweep is outside the transaction');
  ok(!r.locked, '...and nothing is reported as locked');
}

{ // the same migration with COMMIT hoisted above the sweep — must be caught
  const hoisted = (() => {
    const stmts = splitSql(rpc);
    const commitIdx = stmts.findIndex(x => /^COMMIT\s*;/im.test(x.replace(/^\s*(--[^\n]*\n\s*)*/, '')));
    const sweepIdx = stmts.findIndex(x => /^DO\s*\$/im.test(x.replace(/^\s*(--[^\n]*\n\s*)*/, '')) && /REVOKE ALL ON FUNCTION/i.test(x));
    if (commitIdx === -1 || sweepIdx === -1 || commitIdx < sweepIdx) return null;   // already broken
    const reordered = stmts.slice();
    const [commitStmt] = reordered.splice(commitIdx, 1);
    reordered.splice(sweepIdx, 0, commitStmt);
    return reordered.join('\n');
  })();
  ok(hoisted !== null, 'the sweep currently precedes COMMIT (so the hoist is a real mutation)');
  if (hoisted) {
    const r = runMigration(hoisted, { failOn: 'sweep' });
    ok(r.exists === true,
      'sanity: hoisting COMMIT above the sweep DOES leave v3 committed after a failure');
    ok(r.locked === false, 'sanity: ...and unlocked — which is the exposure being prevented');
  }
}

// Structural: the ordering itself, and v3 being fatal rather than advisory.
{
  const commitPos = rpc.search(/^COMMIT;/m);
  const sweepPos  = rpc.search(/^DO \$\$/m);
  const createPos = rpc.indexOf('CREATE OR REPLACE FUNCTION public.consume_fortunes_v3');
  ok(createPos > -1 && sweepPos > createPos && commitPos > sweepPos,
    'order is: CREATE v3 → privilege sweep → COMMIT',
    `create@${createPos} sweep@${sweepPos} commit@${commitPos}`);
}
ok(/IF v_v3 IS NULL THEN\s*\n\s*RAISE EXCEPTION/.test(rpc),
  'a missing v3 raises an EXCEPTION, not a warning');
ok(/has_function_privilege\('public', v_v3, 'EXECUTE'\)[\s\S]{0,120}RAISE EXCEPTION/.test(rpc),
  'the sweep VERIFIES v3 is no longer PUBLIC-executable, and aborts if it is');
for (const role of ['anon', 'authenticated']) {
  ok(new RegExp(`has_function_privilege\\('${role}', v_v3, 'EXECUTE'\\)[\\s\\S]{0,140}RAISE EXCEPTION`).test(rpc),
    `...and that ${role} cannot execute it either`);
}
ok(/RAISE WARNING 'only % fortune function\(s\) locked down/.test(rpc),
  'a missing LEGACY function only warns (tolerated, unlike v3)');

console.log('\n── the migration is self-sufficient on a fresh database ──');
// Production was missing fortune_operations entirely when this shipped: the
// 20260325 migration had never been applied. A migration that ALTERs a table it
// does not create is only safe where migration history is complete, and this
// project's is not.
ok(/CREATE TABLE IF NOT EXISTS public\.fortune_operations/.test(rpc),
  'the migration creates fortune_operations if it is absent');
{
  const createPos = rpc.indexOf('CREATE TABLE IF NOT EXISTS public.fortune_operations');
  const alterPos  = rpc.indexOf('ALTER TABLE public.fortune_operations\n  ADD COLUMN');
  const beginPos  = rpc.search(/^BEGIN;/m);
  const commitPos = rpc.search(/^COMMIT;/m);
  ok(createPos > beginPos && createPos < alterPos && alterPos < commitPos,
    'bootstrap runs inside the transaction, before the ALTER that depends on it');
}
// The bootstrap must match the original schema or the two definitions drift.
{
  const orig = readFileSync(join(ROOT, 'supabase', 'migrations', '20260325_create_fortune_operations.sql'), 'utf8');
  for (const col of ['operation_id text PRIMARY KEY', 'user_id', 'context', 'amount', 'created_at']) {
    ok(rpc.includes(col.split(' ')[0]) && orig.includes(col.split(' ')[0]),
      `bootstrap and 20260325 agree on ${col.split(' ')[0]}`);
  }
  ok(/idx_fortune_operations_created_at/.test(rpc) && /idx_fortune_operations_created_at/.test(orig),
    'the created_at index is restored by the migration, not left to a manual fix');
}
ok(/ALTER TABLE public\.fortune_operations ENABLE ROW LEVEL SECURITY/.test(rpc),
  'RLS is enabled on fortune_operations');
ok(/REVOKE ALL ON TABLE public\.fortune_operations FROM PUBLIC/.test(rpc),
  'the table is revoked from PUBLIC');
for (const role of ['anon', 'authenticated']) {
  ok(new RegExp(`REVOKE ALL ON TABLE public\\.fortune_operations FROM ${role}`).test(rpc),
    `the table is revoked from ${role}`);
}
ok(/GRANT ALL ON TABLE public\.fortune_operations TO service_role/.test(rpc),
  'service_role retains table access (the server routes depend on it)');
{
  const rlsPos = rpc.indexOf('ALTER TABLE public.fortune_operations ENABLE ROW LEVEL SECURITY');
  const commitPos = rpc.search(/^COMMIT;/m);
  ok(rlsPos > -1 && rlsPos < commitPos,
    'the table lockdown is inside the transaction too — no window where the table is open');
}

console.log('\n── the TTL claim is honest ──');
ok(/NO TTL JOB EXISTS/.test(rpc),
  'the migration states plainly that no cleanup schedule is installed');
const opsMigration = readFileSync(join(ROOT, 'supabase', 'migrations', '20260325_create_fortune_operations.sql'), 'utf8');
ok(/^--\s*SELECT cron\.schedule/m.test(opsMigration),
  'and that is true: the only cron statement in the repo is commented out');
ok(!/(?<!NO )TTL cleanup, so the set drains on its own/.test(rpc),
  'the earlier false claim that rows drain automatically is gone');
// Tolerant of the comment's line wrapping ("still\n-- retry:").
ok(/MUST NOT delete rows a client might still[\s\S]{0,12}retry/.test(rpc) &&
   /SECOND REAL CHARGE/.test(rpc),
  'any future cleanup is warned not to run inside the client retry window');

console.log('\n── the endpoint and RPC match this contract ──');
ok(!/from\('fortune_operations'\)[\s\S]{0,200}\.insert\(/.test(endpoint),
  'the endpoint no longer claims the operation itself (the RPC owns it)');
ok(/consume_fortunes_v3/.test(endpoint), 'the endpoint calls the atomic v3 RPC');
ok(/auth\.getUser\(token\)/.test(endpoint), 'the endpoint derives the account from the token');
ok(/authedUserId/.test(endpoint) && !/p_user_id: userId\b/.test(endpoint),
  'the RPC is called with the AUTHENTICATED id, never the body id');
ok(/user_mismatch/.test(endpoint), 'a body userId that disagrees with the session is rejected');
ok(/operation_id_required/.test(endpoint), 'an operation id is mandatory');
ok(/operation_mismatch/.test(rpc) && /operation_mismatch/.test(endpoint),
  'a replay with mismatched owner or facts is rejected end to end');
ok(/IF v_op\.status = 'succeeded' THEN\s*\n\s*RETURN QUERY SELECT 'duplicate'/.test(rpc),
  'RPC: ONLY a succeeded operation replays as duplicate');
for (const [field, pattern] of [
  ['user',    /v_op\.user_id IS DISTINCT FROM p_user_id/],
  ['amount',  /v_op\.amount IS DISTINCT FROM p_amount/],
  ['context', /coalesce\(v_op\.context, ''\)\s*IS DISTINCT FROM coalesce\(p_context, ''\)/],
  ['story',   /coalesce\(v_op\.story_id, ''\) IS DISTINCT FROM coalesce\(p_story_id, ''\)/],
]) ok(pattern.test(rpc), `RPC: a replay is bound to the ${field}`);
ok(/SELECT \* INTO v_op FROM public\.fortune_operations[\s\S]{0,120}FOR UPDATE/.test(rpc),
  'RPC: the operation row is locked so concurrent retries cannot both charge');
ok(/INSERT INTO public\.fortune_operations[\s\S]{0,400}'succeeded'/.test(rpc),
  'the claim is written in the same transaction as the deduction');
ok(/IF v_fortunes < p_amount THEN[\s\S]{0,400}RETURN QUERY SELECT 'insufficient'/.test(rpc),
  'an insufficient balance records nothing');
ok(codeOf(app).includes('_postFortuneCharge'), 'every charge goes through the authenticated poster');
eq((codeOf(app).match(/fetch\('\/api\/consume-fortune'/g) || []).length, 1,
  'exactly one place issues the charge request');


console.log('\n── the client charges only through the authenticated poster ──');
ok(codeOf(app).includes('function _postFortuneCharge('), 'the authenticated poster exists');
eq((codeOf(app).match(/fetch\('\/api\/consume-fortune'/g) || []).length, 1,
  'exactly one place issues the charge request');
{
  const poster = app.slice(app.indexOf('async function _postFortuneCharge('),
                           app.indexOf('window._postFortuneCharge'));
  ok(/Authorization'\] = 'Bearer '/.test(poster), 'it attaches the session token');
  ok(/no session token — charge not attempted/.test(poster),
    'and refuses to send an unauthenticated charge');
}
{
  // v3 rejects a charge with no operationId, so every site must carry one.
  const calls = [...codeOf(app).matchAll(/_postFortuneCharge\(\s*\{[\s\S]{0,400}?\}\s*\)/g)].map(m => m[0]);
  ok(calls.length >= 5, `every charge site routes through the poster (${calls.length} found)`);
  const missing = calls.filter(c => !/operationId/.test(c));
  eq(missing.length, 0, 'every charge site supplies an operationId', missing.join('\n---\n'));
}
{
  // The browser must never reach a locked RPC or the operations table.
  const clientRpcs = [...codeOf(app).matchAll(/\bsb\.rpc\(\s*'([a-z_]+)'/g)].map(m => m[1]);
  const locked = ['consume_fortunes', 'consume_fortunes_v2', 'consume_fortunes_v3',
                  'grant_welcome_milestone', 'grant_purchase_fortunes'];
  eq(clientRpcs.filter(n => locked.includes(n)).length, 0,
    'the browser calls no locked RPC directly', `client RPCs: ${clientRpcs.join(', ')}`);
  ok(!/from\('fortune_operations'\)/.test(codeOf(app)),
    'the browser never touches fortune_operations directly');
}

console.log('\n── this build carries none of the deferred baked-scene feature ──');
eq((codeOf(app).match(/_baked[A-Za-z]/g) || []).length, 0, 'no baked-scene runtime in app.js');
ok(!readFileSync(join(ROOT, 'public', 'index.html'), 'utf8').includes('starter-scenes.js'),
  'index.html does not reference the deferred starter-scenes.js');

console.log(`\n${failures ? `✗ ${failures} of ${checks} checks FAILED` : `✓ all ${checks} checks passed`}\n`);
process.exit(failures ? 1 : 0);
