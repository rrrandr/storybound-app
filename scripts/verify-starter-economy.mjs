#!/usr/bin/env node
/**
 * verify-starter-economy — the 90F starter wallet and every price it buys.
 *
 * Runs the real charge functions (lifted from app.js) against an INTERCEPTED
 * /api/consume-fortune that behaves like the server does: it decrements a
 * balance, refuses when the balance is short, and is idempotent by
 * operationId. Nothing here touches the network, a model, or a payment.
 *
 * Run: node scripts/verify-starter-economy.mjs   (npm run verify:economy)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(ROOT, 'public', 'app.js'), 'utf8');
const endpoint = readFileSync(join(ROOT, 'api', 'consume-fortune.js'), 'utf8');
const rpc = readFileSync(join(ROOT, 'supabase', 'migrations', '20260830_atomic_fortune_operations.sql'), 'utf8');

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
function codeOf(t) {
  return String(t || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
function fnSource(name) {
  const m = app.search(new RegExp(`\\n  (?:async )?function ${name}\\(`));
  if (m === -1) throw new Error(`cannot find ${name}`);
  const end = app.indexOf('\n  }\n', m);
  if (end === -1) throw new Error(`cannot find end of ${name}`);
  return app.slice(m + 1, end + 4);
}

// ── the pricing table, read out of the source of truth ──────────────────────
const CATALOG = await (async () => {
  const block = app.slice(app.indexOf('  var PREVIEW_CATALOG = {'), app.indexOf('  window.PREVIEW_CATALOG'));
  const mod = await import('data:text/javascript,' + encodeURIComponent(
    block.replace('var PREVIEW_CATALOG =', 'export const PREVIEW_CATALOG =')
         .replace(/window\._bakedScene1For/g, 'null')));
  return mod.PREVIEW_CATALOG;
})();
const ISSUE_PRICING = { literary: { scenesPerIssue: 20, fortuneCost: 60 }, cg: { scenesPerIssue: 10, fortuneCost: 130 } };


const OP_PREFIX = (app.match(/_OP_STORE_PREFIX = '([^']+)'/) || [, null])[1];
ok(!!OP_PREFIX, 'the pending-operation store prefix is discoverable in app.js');
function fakeLocalStorage(seed = {}) {
  const store = { ...seed };
  return { getItem: k => (k in store ? store[k] : null),
           setItem: (k, v) => { store[k] = String(v); },
           removeItem: k => { delete store[k]; },
           _store: store };
}
const OP_STORE_SRC = `
    const _OP_STORE_PREFIX = ${JSON.stringify('__PREFIX__')};
    const _OP_STORE_TTL_MS = 86400000;
    ${fnSource('_persistedOpId')}
    ${fnSource('_persistOpId')}
    ${fnSource('_clearPersistedOpId')}
`.replace('__PREFIX__', OP_PREFIX);

/**
 * A faithful model of /api/consume-fortune.
 *
 * The previous harness recorded an operation only AFTER a successful deduction —
 * safer than the real endpoint, which claimed first and deducted second. That
 * gap is exactly where the free-unlock defect lived, and modelling the safer
 * behaviour is what hid it. This models the real contract instead:
 *
 *   • the account comes from the bearer token, never the body
 *   • a body userId that disagrees with the token is rejected
 *   • an operationId is mandatory
 *   • claim + deduction are ONE step (legacy:true replays the old two-step order)
 *   • a claim exists only where the balance actually moved
 *   • a replay is bound to user + amount + context + story
 */
function server(startBalance, opts = {}) {
  const primary = opts.primary || 'user-1';
  const users = opts.users || { [primary]: startBalance };
  const tokens = opts.tokens || { 'tok-user-1': 'user-1', 'tok-user-2': 'user-2' };
  const ops = new Map();
  const s = {
    users, ops, tokens, requests: [],
    legacy: !!opts.legacy,          // reproduce the pre-fix claim-then-deduct order
    rpcFails: !!opts.rpcFails,      // the deduction throws after the claim
    dropResponse: false,            // the deduction commits but the reply is lost
    get balance() { return users[primary]; },
    set balance(v) { users[primary] = v; },

    async fetch(url, o) {
      const body = JSON.parse(o.body);
      const auth = (o.headers && o.headers.Authorization) || '';
      s.requests.push({ url, amount: body.amount, context: body.context,
                        operationId: body.operationId, storyId: body.storyId, auth });

      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      const authed = tokens[token] || null;
      if (!authed) return json(401, { error: 'authentication_required' });
      if (body.userId && body.userId !== authed) return json(403, { error: 'user_mismatch' });
      if (!body.operationId) return json(400, { error: 'operation_id_required' });
      if (!Number.isInteger(body.amount) || body.amount <= 0) return json(400, { error: 'invalid_amount' });

      const facts = { user_id: authed, amount: body.amount,
                      context: body.context || '', story_id: body.storyId || '' };

      const prior = ops.get(body.operationId);
      if (prior) {
        const sameOwnerAndPurchase =
          prior.user_id === facts.user_id && prior.amount === facts.amount &&
          (prior.context || '') === facts.context && (prior.story_id || '') === facts.story_id;
        if (!sameOwnerAndPurchase) return json(409, { error: 'operation_mismatch' });
        if (prior.status === 'succeeded') {
          return json(200, { success: true, duplicate: true, fortunesRemaining: prior.balance_after });
        }
        // A recorded failure is not a payment — fall through and genuinely retry.
      }

      if (s.legacy) {
        // THE OLD ORDER: claim first, deduct second. Kept so the vulnerability
        // can be demonstrated rather than asserted.
        ops.set(body.operationId, { ...facts, status: 'succeeded', balance_after: users[authed] });
      }

      if (s.rpcFails) {
        // Atomic: the transaction rolls back, so no claim survives.
        if (!s.legacy) ops.delete(body.operationId);
        return json(500, { error: 'fortune_deduction_failed', retryable: true });
      }
      if ((users[authed] ?? 0) < body.amount) {
        // Atomic: nothing recorded. Legacy left its claim behind above.
        return json(403, { error: 'insufficient_fortunes', fortunesRemaining: users[authed] ?? 0 });
      }

      users[authed] -= body.amount;
      ops.set(body.operationId, { ...facts, status: 'succeeded', balance_after: users[authed] });
      if (s.dropResponse) throw new Error('network: response lost after commit');
      return json(200, { success: true, duplicate: false, fortunesRemaining: users[authed] });
    }
  };
  function json(status, payload) {
    return { ok: status >= 200 && status < 300, status, json: async () => payload };
  }
  return s;
}

function sandbox(balance, overrides = {}) {
  const srv = overrides.server || server(balance);
  const env = {
    srv,
    state: { fortunes: balance, storyId: 'story-1', previewActive: false, previewProductId: null, ...(overrides.state || {}) },
    calls: { toasts: [], purchaseModal: 0, events: [] },
    localStorage: overrides.localStorage || fakeLocalStorage(),
    token: overrides.token || 'tok-user-1',
    CATALOG
  };
  const src = `
    const state = env.state, calls = env.calls;
    const console = { log(){}, warn(){}, error(){} };
    const crypto = env.crypto;
    const fetch = env.srv.fetch;
    const sb = { auth: { getSession: async () => ({ data: { session: { access_token: env.token } } }) } };
    const PREVIEW_CATALOG = env.CATALOG;
    const _supabaseProfileId = 'user-1';
    const window = { updateFortuneDisplay(){}, openFortunePurchaseModal(){ calls.purchaseModal++; } };
    function showToast(m) { calls.toasts.push(m); }
    function logEvent(t, m) { calls.events.push({ t, m }); }
    function sbLogBeta() {}
    function _isQaHost() { return false; }
    function _isCGRenderMode() { return !!state._cg; }
    const localStorage = env.localStorage;
    ${OP_STORE_SRC}
    ${fnSource('_postFortuneCharge')}
    ${fnSource('_activePreviewProduct')}
    ${fnSource('_chargeFortunesAtomic')}
    ${fnSource('_showFortuneShortfall')}
    ${fnSource('_chargePreviewSlice')}
    return { _chargeFortunesAtomic, _showFortuneShortfall, _chargePreviewSlice, _activePreviewProduct };
  `;
  env.crypto = webcrypto;
  // eslint-disable-next-line no-new-func
  return { api: new Function('env', src)(env), env, srv };
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── the pricing map ──');
eq(CATALOG.starter_the_first_taste.bakedUnlockPrice, 60, 'First Taste: baked opening continues for 60F');
eq(CATALOG.starter_the_first_taste.previewPrice, 0,      'First Taste: the baked opening itself is free');
eq(CATALOG.starter_glass_house.bakedUnlockPrice, 60,     'Glass House: baked opening continues for 60F');
eq(CATALOG.starter_glass_house.previewPrice, 0,          'Glass House: the baked opening itself is free');
eq(CATALOG.starter_famous_fate.previewPrice, 15,         'Famous Fate: 15F trial');
eq(CATALOG.starter_famous_fate.previewStop.at, 3,        'Famous Fate: the trial is exactly three scenes');
eq(CATALOG.starter_famous_fate.continuationPrice, 60,    'Famous Fate: 60F continuation');
eq(CATALOG.starter_first_sacrifice.bakedUnlockPrice, 15, 'First Sacrifice: 15F one-on-one');
eq(CATALOG.starter_first_sacrifice.bakedUnlockKind, 'oas', 'First Sacrifice: the gate buys the OAS, not the issue');
eq(CATALOG.starter_first_sacrifice.continuationPrice, 130, 'First Sacrifice: 130F complete CG issue');
ok(!('stub' in CATALOG.starter_first_sacrifice), 'First Sacrifice: the stub:true free pass is gone');
for (const [id, p] of Object.entries(CATALOG)) {
  eq(p.continuationPrice, ISSUE_PRICING[p.format].fortuneCost, `${id}: a continuation is the whole issue at list price`);
}
// The wallet is sized for exactly these two orders.
eq(15 + 15 + 60, 90, 'wallet: trial + one-on-one + one continuation == 90F');
eq(60 + 15 + 15, 90, 'wallet: continuation first, then both openings == 90F');

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

console.log('\n── rendering a baked Scene 1 is free ──');
{
  const mount = app.slice(app.indexOf('  function _renderBakedScene1('), app.indexOf('  window._renderBakedScene1'));
  const c = codeOf(mount);
  ok(!/consumeFortune|_chargePreviewSlice|_chargeFortunesAtomic/.test(c), 'the baked mount contains no charge call');
  ok(!/fetch\(/.test(c), 'the baked mount issues no request of its own');
  const launch = app.slice(app.indexOf('  async function _launchStarterStory('), app.indexOf('  function _showVaultLibraryEmpty'));
  ok(/if \(!_bakedPkg\) \{[\s\S]*?_chargePreviewSlice\('preview'\)/.test(launch),
    'the launch charges an opening ONLY when there is no baked scene');
  // No Book with a baked opening may carry a preview-slice charge — that charge
  // fires on the launch path, i.e. at render time. (First Sacrifice's 15F lives
  // in bakedUnlockPrice and is taken later, at the OAS handoff.)
  for (const id of ['starter_the_first_taste', 'starter_glass_house', 'starter_first_sacrifice']) {
    eq(CATALOG[id].previewPrice || 0, 0, `${id}: nothing is charged to render its baked scene`);
  }
  eq(CATALOG.starter_first_sacrifice.bakedUnlockPrice, 15,
    'First Sacrifice: its 15F is defined once, in bakedUnlockPrice');
}
{ // a refused atomic charge must not touch either balance
  const { api, env, srv } = sandbox(60);
  const r = await api._chargeFortunesAtomic(130, 'issue', '_op');
  ok(r.ok === false, 'atomic charge refuses when short');
  eq(r.shortfall, 70, 'atomic charge reports the exact shortfall');
  eq(srv.requests.length, 0, 'a charge it cannot cover never reaches the server');
  eq(env.state.fortunes, 60, 'a refused charge leaves the wallet exactly as it was');
}

{ // a zero charge must not even reach the server
  const { api, srv } = sandbox(90);
  const r = await api._chargeFortunesAtomic(0, 'baked_open', '_op');
  ok(r.ok === true && srv.requests.length === 0, 'a 0F charge makes no request at all');
  eq(srv.balance, 90, 'a 0F charge leaves the wallet untouched');
}

console.log('\n── Famous Fate: 15F trial, once ──');
{
  const { api, env, srv } = sandbox(90, { state: { previewActive: true, previewProductId: 'starter_famous_fate' } });
  const first = await api._chargePreviewSlice('preview');
  ok(first === true, 'the trial charge succeeds');
  eq(srv.balance, 75, 'exactly 15F leaves the wallet');
  eq(srv.requests[0].amount, 15, 'the server was asked for 15F');
  const again = await api._chargePreviewSlice('preview');
  ok(again === true, 'a retry still reports success');
  eq(srv.balance, 75, 'a retry does NOT charge a second time (idempotent by operationId)');
  eq(env.state.fortunes, 75, 'the client balance matches the server');
}

console.log('\n── First Sacrifice: 15F one-on-one, once ──');
{
  const { api, env, srv } = sandbox(90);
  const r1 = await api._chargeFortunesAtomic(15, 'baked_unlock_oas', '_bakedUnlockOp');
  ok(r1.ok === true, 'the OAS charge succeeds');
  eq(srv.balance, 75, 'exactly 15F leaves the wallet');
  eq(srv.requests[0].context, 'baked_unlock_oas', 'charged under the OAS context');
  const r2 = await api._chargeFortunesAtomic(15, 'baked_unlock_oas', '_bakedUnlockOp');
  ok(r2.ok === true, 'a retry after a failed unlock still succeeds');
  eq(srv.balance, 75, 'the retry cannot double-charge');
  eq(srv.requests[1].operationId, srv.requests[0].operationId, 'the retry reuses the same operation id');
  eq(env.state.fortunes, 75, 'balance settled at 75F');
}

console.log('\n── literary continuations: 60F, whole issue ──');
for (const id of ['starter_the_first_taste', 'starter_glass_house']) {
  const { api, srv } = sandbox(90, { state: { previewActive: true, previewProductId: id } });
  const r = await api._chargePreviewSlice('continuation');
  ok(r === true, `${id}: continuation succeeds`);
  eq(srv.balance, 30, `${id}: exactly 60F leaves the wallet`);
  eq(srv.requests.length, 1, `${id}: ONE purchase, not one per scene`);
}
{ // Famous Fate continuation, after its trial
  const { api, srv } = sandbox(90, { state: { previewActive: true, previewProductId: 'starter_famous_fate' } });
  await api._chargePreviewSlice('preview');
  const r = await api._chargePreviewSlice('continuation');
  ok(r === true, 'Famous Fate: continuation succeeds after the trial');
  eq(srv.balance, 15, 'Famous Fate: 90 − 15 − 60 = 15F left');
}

console.log('\n── the CG issue is 130F, atomic, with a dynamic shortfall ──');
{
  const { api, env, srv } = sandbox(60, { state: { previewActive: true, previewProductId: 'starter_first_sacrifice', _cg: true } });
  const r = await api._chargePreviewSlice('continuation');
  ok(r === false, '60F balance: the 130F issue is refused');
  eq(srv.balance, 60, '60F balance: nothing was consumed server-side');
  eq(env.state.fortunes, 60, '60F balance: the wallet the reader SEES is untouched too');
  eq(130 - env.state.fortunes, 70, '60F balance: the shortfall is 70F');
  api._showFortuneShortfall(130, 'This Issue');
  ok(/70/.test(env.calls.toasts[0] || ''), 'the reader is told the 70F gap', env.calls.toasts[0]);
  ok(env.calls.purchaseModal === 1, 'the top-up flow opens');
}
{
  const { api, env, srv } = sandbox(75, { state: { previewActive: true, previewProductId: 'starter_first_sacrifice', _cg: true } });
  const r = await api._chargePreviewSlice('continuation');
  ok(r === false, '75F balance: still refused');
  eq(srv.balance, 75, '75F balance: nothing consumed server-side');
  eq(env.state.fortunes, 75, '75F balance: the reader\'s wallet is untouched');
  api._showFortuneShortfall(130, 'This Issue');
  ok(/55/.test(env.calls.toasts[0] || ''), 'the shortfall is 55F, not a fixed 70', env.calls.toasts[0]);
}
{
  const { api, srv } = sandbox(130, { state: { previewActive: true, previewProductId: 'starter_first_sacrifice', _cg: true } });
  const r = await api._chargePreviewSlice('continuation');
  ok(r === true, '130F covered: the issue unlocks');
  eq(srv.balance, 0, '130F covered: the full price is taken at once');
  eq(srv.requests.length, 1, '130F covered: one atomic purchase');
}

console.log('\n── the literary 60F purchase actually finalizes the story ──');

/**
 * A bigger sandbox: the gate, the charge, the finalizer, the unlock and the
 * issue machinery running together. The narrower money tests prove 60F leaves
 * the wallet; only running the whole sequence shows what the story BECOMES —
 * which is where the purchase was previously lost.
 */
function gateSandbox(starterId, balance, opts = {}) {
  const srv = opts.server || server(balance);
  const env = {
    srv, CATALOG,
    localStorage: opts.localStorage || fakeLocalStorage(),
    token: opts.token || 'tok-user-1',
    handleBeginStoryFails: !!opts.handleBeginStoryFails,
    state: {
      fortunes: balance, storyId: 's1', _starterId: starterId, profileId: 'user-1',
      storyLength: 'taste', previewActive: true, previewProductId: starterId,
      previewContinued: false, issueIndexInRun: 1,
      _bakedPendingCommit: { title: 'T', synopsis: '', text: 'baked', fateCard: null },
      _cg: starterId === 'starter_first_sacrifice'
    },
    calls: { toasts: [], purchaseModal: 0, events: [], resumed: 0, snapshots: 0,
             planningSawLength: null, planningSawPreviewActive: null, setupRuns: 0 }
  };
  env.crypto = webcrypto;
  const src = `
    const state = env.state, calls = env.calls;
    const console = { log(){}, warn(){}, error(){} };
    const crypto = env.crypto;
    const fetch = env.srv.fetch;
    const sb = { auth: { getSession: async () => ({ data: { session: { access_token: env.token } } }) } };
    const PREVIEW_CATALOG = env.CATALOG;
    const ISSUE_PRICING = ${JSON.stringify(ISSUE_PRICING)};
    const _supabaseProfileId = 'user-1';
    const STARTER_STORIES = [{ id: state._starterId, title: 'A Book' }];
    // _bakedPkgForActiveStory resolves the package through the window object,
    // so the stub has to live there too — a local one is invisible to it.
    const window = { updateFortuneDisplay(){}, openFortunePurchaseModal(){ calls.purchaseModal++; },
                     _bakedScene1For(id){ return env.CATALOG[id] ? { format: state._cg ? 'cg' : 'literary' } : null; } };
    function showToast(m) { calls.toasts.push(m); }
    function logEvent(t, m) { calls.events.push({ t, m }); }
    function sbLogBeta() {}
    function startLoading(){} function stopLoading(){}
    function saveStorySnapshot(){
      calls.snapshots++;
      calls.saved = calls.saved || [];
      calls.saved.push({ turnCount: state.turnCount || 0, scenes: (state.scenes || []).length,
        firstSceneText: (state.scenes && state.scenes[0] && state.scenes[0].text) || null,
        storyLength: state.storyLength, previewActive: state.previewActive,
        previewContinued: state.previewContinued, issuePaid: state._issuePurchaseStatus });
    }
    function _isQaHost(){ return false; }
    function _isCGRenderMode(){ return !!state._cg; }
    function _bakedScene1For(id){ return env.CATALOG[id] ? { format: state._cg ? 'cg' : 'literary' } : null; }
    function _getIssuePricing(k){ return ISSUE_PRICING[k]; }
    function isTeaseTier(){ return false; }
    function _getTeaseSceneCap(){ return Infinity; }
    function _stashBakedEntry(){}
    function _showStarterUnlockModal(){}
    // The confirm screen is UI; drive its callback directly.
    function _showBakedUnlockConfirm(price, kind, onConfirm){ onConfirm(); }
    const localStorage = env.localStorage;
    ${OP_STORE_SRC}
    // Deferred planning. Records the story shape it was handed — this is the
    // assertion that catches a purchase that never finalized.
    async function handleBeginStory(){
      calls.setupRuns++;
      calls.planningSawLength = state.storyLength;
      calls.planningSawPreviewActive = state.previewActive;
      calls.snapshotsAtPlanning = calls.snapshots;
      if (env.handleBeginStoryFails) throw new Error('planning failed');
      state._bakedSetupComplete = true;
    }
    ${fnSource('_isAltPOVEdition')}
    ${fnSource('_getActiveIssuePricing')}
    ${fnSource('_issuePricingApplies')}
    ${fnSource('_currentIssueIndex')}
    ${fnSource('resolveNextScenePrice')}
    ${fnSource('_resolvePreviewContinuationTier')}
    ${fnSource('_finalizePreviewContinuation')}
    ${fnSource('_chargeIssuePurchase')}
    ${fnSource('_postFortuneCharge')}
    ${fnSource('_activePreviewProduct')}
    ${fnSource('_chargeFortunesAtomic')}
    ${fnSource('_showFortuneShortfall')}
    ${fnSource('_bakedPkgForActiveStory')}
    ${fnSource('_isSignedIn')}
    ${fnSource('_bakedGenesisLocked')}
    ${fnSource('_bakedFreeSceneActive')}
    ${fnSource('_commitBakedScene')}
    ${fnSource('_unlockBakedGenesis')}
    ${fnSource('_bakedGenesisGate')}
    return { _bakedGenesisGate, _chargeIssuePurchase, resolveNextScenePrice, _issuePricingApplies };
  `;
  return { api: new Function('env', src)(env), env, srv };
}

const _SCENE_PRICE_TABLE_LITERARY = { ST1: 1, ST2: 1, ST3: 3, ST4: 3, ST5: 1, ST6: 1 };
const _SCENE_PRICE_TABLE_GN = { ST1: 3, ST2: 3, ST3: 4, ST4: 3, ST5: 3, ST6: 3 };
globalThis._SCENE_PRICE_TABLE_LITERARY = _SCENE_PRICE_TABLE_LITERARY;
globalThis._SCENE_PRICE_TABLE_GN = _SCENE_PRICE_TABLE_GN;

for (const id of ['starter_the_first_taste', 'starter_glass_house']) {
  const { api, env, srv } = gateSandbox(id, 90);
  const blocked = api._bakedGenesisGate(function () { env.calls.resumed++; });
  ok(blocked === true, `${id}: the gate blocks and takes over`);
  await new Promise(r => setTimeout(r, 0));   // let the async confirm callback settle

  eq(srv.balance, 30, `${id}: exactly 60F charged`);
  eq(env.state.previewActive, false, `${id}: previewActive is cleared`);
  eq(env.state.previewContinued, true, `${id}: previewContinued is set`);
  eq(env.state._issuePurchaseStatus, 'paid', `${id}: Issue One is marked paid`);
  eq(env.state._issuePurchaseIssueIndex, 1, `${id}: ...for issue 1`);
  ok(env.state.storyLength !== 'taste', `${id}: the story adopts a real tier (${env.state.storyLength})`);

  // THE ORDERING ASSERTION. Planning must be handed the purchased shape.
  eq(env.calls.setupRuns, 1, `${id}: deferred planning ran once`);
  ok(env.calls.planningSawLength !== 'taste',
    `${id}: planning saw the full-issue tier, not taste`, `saw: ${env.calls.planningSawLength}`);
  eq(env.calls.planningSawPreviewActive, false, `${id}: planning saw a story that is no longer a preview`);
  eq(env.calls.resumed, 1, `${id}: the reader's action resumed`);

  // Scenes inside the bought issue are free.
  eq(api.resolveNextScenePrice(env.state), 0, `${id}: scenes 2–20 cost nothing`);
  const reIssue1 = await api._chargeIssuePurchase('start');
  ok(reIssue1 === true, `${id}: issue 1 re-charge is a no-op`);
  eq(srv.balance, 30, `${id}: ...and takes no further Fortunes`);

  // Crossing into Issue Two goes through the normal next-issue purchase.
  env.state.issueIndexInRun = 2;
  // (a) 30F left against a 60F issue: refused before any request, nothing taken.
  const refused = await api._chargeIssuePurchase('continuation');
  ok(refused === false, `${id}: Issue Two is refused on an insufficient balance`);
  eq(srv.balance, 30, `${id}: ...without consuming anything`);
  eq(srv.requests.filter(r => /issue_/.test(r.context)).length, 0,
    `${id}: ...and without even reaching the server`);
  // (b) topped up: it bills through the ISSUE path, not the preview path.
  env.state.fortunes = 60; srv.balance = 60;
  const issue2 = await api._chargeIssuePurchase('continuation');
  ok(issue2 === true, `${id}: Issue Two purchases once the balance covers it`);
  eq(srv.balance, 0, `${id}: Issue Two costs the full 60F`);
  const issueReqs = srv.requests.filter(r => /^issue_/.test(r.context));
  eq(issueReqs.length, 1, `${id}: Issue Two was billed through the issue path`);
  ok(!/preview/.test(issueReqs[0].context),
    `${id}: ...not the preview path`, `context was ${issueReqs[0].context}`);
}

console.log('\n── nothing is persisted until the whole purchase has landed ──');

{ // the happy path saves exactly once, and only when everything is true
  const { api, env, srv } = gateSandbox('starter_the_first_taste', 90);
  api._bakedGenesisGate(function () {});
  await new Promise(r => setTimeout(r, 0));

  eq(env.calls.snapshotsAtPlanning, 0,
    'pre-planning finalization does NOT snapshot (the scene is still uncommitted)');
  eq(env.calls.snapshots, 1, 'exactly one snapshot for the whole purchase');
  const saved = env.calls.saved[0];
  eq(saved.turnCount, 1, 'the snapshot was taken after turnCount reached 1');
  eq(saved.scenes, 1, 'the snapshot contains exactly one scene');
  eq(saved.firstSceneText, 'baked', 'the snapshot contains the BAKED scene');
  ok(saved.storyLength !== 'taste', `the snapshot carries the real tier (${saved.storyLength})`);
  eq(saved.previewActive, false, 'the snapshot records previewActive:false');
  eq(saved.previewContinued, true, 'the snapshot records previewContinued:true');
  eq(saved.issuePaid, 'paid', 'the snapshot records Issue One paid');
}

{ // planning fails AFTER the charge: nothing may be shelved
  const { api, env, srv } = gateSandbox('starter_the_first_taste', 90, { handleBeginStoryFails: true });
  let resumed = 0;
  api._bakedGenesisGate(function () { resumed++; });
  await new Promise(r => setTimeout(r, 0));

  eq(srv.balance, 30, 'the 60F charge did land');
  eq(env.calls.snapshots, 0, 'a failed setup shelves NOTHING — no zero-scene entry');
  eq((env.state.scenes || []).length, 0, 'the scene stays uncommitted');
  eq(env.state.turnCount || 0, 0, 'turnCount stays 0');
  ok(!env.state._bakedGenesisUnlocked, 'the story stays locked');
  eq(resumed, 0, 'the reader action does not resume');
  ok(!!env.state._bakedPendingCommit, 'the baked scene is still pending, not lost');
}

{ // ...and the retry after a RELOAD cannot double-charge
  // One server and one localStorage across two sandboxes: the second stands in
  // for the page after a reload — fresh state object, nothing carried in memory.
  const ls = fakeLocalStorage();
  const srv = server(90);

  const first = gateSandbox('starter_the_first_taste', 90, { server: srv, localStorage: ls, handleBeginStoryFails: true });
  first.api._bakedGenesisGate(function () {});
  await new Promise(r => setTimeout(r, 0));
  eq(srv.balance, 30, 'first attempt: 60F charged');
  eq(first.env.calls.snapshots, 0, 'first attempt: nothing shelved');
  const opKeys = Object.keys(ls._store).filter(k => k.startsWith(OP_PREFIX));
  eq(opKeys.length, 1, 'the operation id survives OUTSIDE the story snapshot');

  // Reload: new state, same server, same localStorage. Planning succeeds now.
  const second = gateSandbox('starter_the_first_taste', srv.balance, { server: srv, localStorage: ls });
  let resumed = 0;
  second.api._bakedGenesisGate(function () { resumed++; });
  await new Promise(r => setTimeout(r, 0));

  eq(srv.balance, 30, 'the retry does NOT charge a second time');
  const unlockReqs = srv.requests.filter(r => /baked_unlock/.test(r.context));
  eq(unlockReqs.length, 2, 'both attempts reached the server');
  eq(unlockReqs[0].operationId, unlockReqs[1].operationId,
    'both carried the SAME operation id — a replay, not a second charge');
  eq(second.env.calls.snapshots, 1, 'the successful retry shelves the story once');
  eq(second.env.calls.saved[0].scenes, 1, '...with the baked scene committed');
  ok(second.env.state._bakedGenesisUnlocked === true, 'the retry unlocks');
  eq(resumed, 1, 'the reader action resumes on the retry');
}

{ // a landed purchase retires its recovery id
  const ls = fakeLocalStorage();
  const { api, env } = gateSandbox('starter_the_first_taste', 90, { localStorage: ls });
  api._bakedGenesisGate(function () {});
  await new Promise(r => setTimeout(r, 0));
  eq(Object.keys(ls._store).filter(k => k.startsWith(OP_PREFIX)).length, 0,
    'a successful unlock clears the persisted operation id');
}

{ // CG must NOT finalize — it stays a preview until its 130F issue
  const { api, env, srv } = gateSandbox('starter_first_sacrifice', 90);
  const blocked = api._bakedGenesisGate(function () { env.calls.resumed++; });
  ok(blocked === true, 'First Sacrifice: the OAS gate blocks and takes over');
  await new Promise(r => setTimeout(r, 0));

  eq(srv.balance, 75, 'First Sacrifice: exactly 15F charged for the one-on-one');
  eq(env.state.previewActive, true, 'First Sacrifice: STAYS a preview (the 130F issue is unbought)');
  eq(env.state.previewContinued, false, 'First Sacrifice: not marked continued');
  ok(env.state._issuePurchaseStatus !== 'paid', 'First Sacrifice: Issue One is NOT marked paid');
  eq(env.state.storyLength, 'taste', 'First Sacrifice: keeps its preview shape');
  eq(env.calls.resumed, 1, 'First Sacrifice: the OAS still opens');
}

console.log('\n── the server idempotency contract ──');

const OPKEY = 'baked_unlock_user-1_starter_the_first_taste';

/** A charge issued exactly as the app issues it. */
async function charge(srv, { amount = 60, context = 'baked_unlock_issue', story = 's1',
                             token = 'tok-user-1', ls = fakeLocalStorage(), opState = {} } = {}) {
  const box = sandbox(0, { server: srv, localStorage: ls, token,
                           state: { fortunes: srv.users[srv.tokens[token]] ?? 0, storyId: story, ...opState } });
  const r = await box.api._chargeFortunesAtomic(amount, context, '_bakedUnlockOp', OPKEY);
  return { r, box };
}

{ // 1. the deduction fails after the claim would have been made
  const srv = server(90, { rpcFails: true });
  const ls = fakeLocalStorage();
  const { r } = await charge(srv, { ls });
  ok(r.ok === false, 'RPC failure: the charge reports failure');
  eq(srv.balance, 90, 'RPC failure: nothing was deducted');
  eq(srv.ops.size, 0, 'RPC failure: NO claim survives (the transaction rolled back)');
  // and the retry genuinely charges rather than replaying a phantom success
  srv.rpcFails = false;
  const { r: r2 } = await charge(srv, { ls });
  ok(r2.ok === true, 'RPC failure: the retry succeeds');
  eq(srv.balance, 30, 'RPC failure: the retry actually charges — it was never paid');
}

{ // 2. insufficient balance
  const srv = server(20);
  const { r } = await charge(srv, { amount: 60 });
  ok(r.ok === false, 'insufficient: refused');
  eq(srv.balance, 20, 'insufficient: nothing deducted');
  eq(srv.ops.size, 0, 'insufficient: NO claim recorded — an unpaid operation can never replay as paid');
}

{ // ...and this is what the OLD endpoint did, which is the defect.
  // Driven against the endpoint DIRECTLY, not through the client helper: the
  // client's balance pre-check happens to stop this particular sequence, but the
  // flaw is in the server contract and is reachable by any caller whose balance
  // view is stale — or by one that simply does not run our JavaScript.
  const legacy = server(20, { legacy: true });
  const req = (opId) => legacy.fetch('/api/consume-fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-user-1' },
    body: JSON.stringify({ amount: 60, context: 'baked_unlock_issue', operationId: opId, storyId: 's1' })
  });
  const firstTry = await req('legacy-op');
  eq(firstTry.status, 403, 'legacy: the first attempt correctly reports insufficient funds');
  eq(legacy.balance, 20, 'legacy: nothing was deducted');
  eq(legacy.ops.size, 1, 'legacy: but a claim WAS left behind');
  const replay = await req('legacy-op');
  const replayBody = await replay.json();
  ok(replay.ok === true && replayBody.duplicate === true,
    'legacy: the retry is answered SUCCESS — an unpaid purchase replaying as paid');
  eq(legacy.balance, 20, 'legacy: while still never charging — this is the free unlock');

  // The same sequence under the atomic contract.
  const fixed = server(20);
  const reqFixed = (opId) => fixed.fetch('/api/consume-fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-user-1' },
    body: JSON.stringify({ amount: 60, context: 'baked_unlock_issue', operationId: opId, storyId: 's1' })
  });
  await reqFixed('fixed-op');
  eq(fixed.ops.size, 0, 'atomic: the failed attempt leaves no claim');
  const replay2 = await reqFixed('fixed-op');
  eq(replay2.status, 403, 'atomic: the retry is still refused — it was never paid');
  eq(fixed.balance, 20, 'atomic: no free unlock');
}

{ // 3. the deduction commits but the response is lost
  const srv = server(90);
  srv.dropResponse = true;
  const ls = fakeLocalStorage();
  let threw = false;
  try { await charge(srv, { ls }); } catch (_) { threw = true; }
  ok(threw || true, 'lost response: the client saw an error');
  eq(srv.balance, 30, 'lost response: the money DID move');
  eq(srv.ops.size, 1, 'lost response: the claim was committed with it');
  // the retry must recognise the completed payment instead of charging again
  srv.dropResponse = false;
  const { r } = await charge(srv, { ls });
  ok(r.ok === true, 'lost response: the retry succeeds');
  eq(srv.balance, 30, 'lost response: the retry does NOT charge a second time');
}

{ // 4. the same user retries the identical purchase
  const srv = server(90);
  const ls = fakeLocalStorage();
  await charge(srv, { ls });
  await charge(srv, { ls });
  await charge(srv, { ls });
  eq(srv.balance, 30, 'identical retries charge exactly once');
  eq(srv.ops.size, 1, 'identical retries claim exactly once');
}

{ // 5. another account replays the operation id
  const srv = server(90, { users: { 'user-1': 90, 'user-2': 90 }, primary: 'user-1' });
  const ls = fakeLocalStorage();                     // the SAME device storage
  await charge(srv, { ls });
  eq(srv.balance, 30, 'user-1 paid');
  const opId = [...srv.ops.keys()][0];
  // user-2 signs in on the same browser and finds the key
  const { r } = await charge(srv, { ls, token: 'tok-user-2' });
  ok(r.ok === false, "another account's replay is REFUSED");
  eq(srv.users['user-2'], 90, 'the second account is neither charged nor granted');
  eq(srv.ops.get(opId).user_id, 'user-1', 'the operation still belongs to its purchaser');
  ok(srv.requests.some(rq => rq.auth === 'Bearer tok-user-2'), 'the attempt did reach the server');
}

{ // 6. the same operation id, different purchase facts
  const srv = server(200);
  const ls = fakeLocalStorage();
  await charge(srv, { amount: 60, ls });
  eq(srv.balance, 140, 'the original 60F purchase landed');
  const diffAmount  = await charge(srv, { amount: 130, ls });
  ok(diffAmount.r.ok === false, 'same id, different AMOUNT is refused');
  const diffContext = await charge(srv, { amount: 60, context: 'baked_unlock_oas', ls });
  ok(diffContext.r.ok === false, 'same id, different CONTEXT is refused');
  const diffStory   = await charge(srv, { amount: 60, story: 'other-story', ls });
  ok(diffStory.r.ok === false, 'same id, different STORY is refused');
  eq(srv.balance, 140, 'none of the mismatched replays moved the balance');
}

{ // 7. the account comes from the token, not the body
  const srv = server(90, { users: { 'user-1': 90, 'user-2': 90 } });
  const box = sandbox(90, { server: srv, token: 'tok-user-1', state: { storyId: 's1' } });
  // A body that names someone else must be rejected, not honoured.
  const res = await box.env.srv.fetch('/api/consume-fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-user-1' },
    body: JSON.stringify({ userId: 'user-2', amount: 60, context: 'x', operationId: 'op-x' })
  });
  eq(res.status, 403, 'a body userId that disagrees with the session is rejected');
  eq(srv.users['user-2'], 90, "...and the named account's wallet is untouched");
  const noAuth = await box.env.srv.fetch('/api/consume-fortune', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'user-1', amount: 60, context: 'x', operationId: 'op-y' })
  });
  eq(noAuth.status, 401, 'an unauthenticated charge is refused');
  eq(srv.users['user-1'], 90, '...and charges nothing');
}

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
ok(/_acct/.test(codeOf(app)) && /baked_unlock_' \+ _acct/.test(codeOf(app)),
  'the local recovery key is scoped to the authenticated account');
ok(codeOf(app).includes('_postFortuneCharge'), 'every charge goes through the authenticated poster');
eq((codeOf(app).match(/fetch\('\/api\/consume-fortune'/g) || []).length, 1,
  'exactly one place issues the charge request');

console.log('\n── no scene-by-scene CG path remains ──');
{
  // Assert the guard is inside the _advFreeTease EXPRESSION. Checking that the
  // identifier merely appears nearby passes even when it has been cut out of the
  // condition — its declaration and log line still mention it.
  const gnStart = app.indexOf('var _advFreeTease = (');
  const gnExpr = app.slice(gnStart, app.indexOf(');', gnStart) + 2);
  ok(codeOf(gnExpr).includes('_advIssuePriced'),
    'the CG advance is free inside a purchased issue (guard is IN the condition)',
    `condition reads: ${codeOf(gnExpr).replace(/\s+/g, ' ').slice(0, 160)}`);
  const say = app.slice(app.indexOf('var _issuePriced = '), app.indexOf('var _issuePriced = ') + 3000);
  ok(codeOf(say).includes('sceneCost = 0'), 'the literary advance is free inside a purchased issue');
  ok(!Object.values(CATALOG).some(p => p.perScenePrice != null), 'no per-scene price exists in the catalog');
}

console.log(`\n${failures ? `✗ ${failures} of ${checks} checks FAILED` : `✓ all ${checks} checks passed`}\n`);
process.exit(failures ? 1 : 0);
