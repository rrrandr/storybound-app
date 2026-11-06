#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// ONE PROVIDER-BLOCKED CAPTURE, THROUGH THE ACTUAL CALLER AND THE ACTUAL HANDLER.
//
// WITHDRAWN CLAIM: I reported that _cplus_editor_provider_switch.mjs "drives the real dispatch
// with doFetch stubbed". It does not. That file exercises the exported helpers —
// editorAdmission, reserveUsd, normalizeUsage, editorConfigFor — and greps source text. It
// never invokes the handler, so it could not have caught the allowance mismatch below, and it
// supplied 6,000 directly rather than letting the ordinary path produce it.
//
// WHAT THIS DOES INSTEAD: the REAL pass builds the request (its own maxTokens, not a
// hand-written one), the REAL route handler receives it through createHandler's injected IO, and
// the upstream body is captured at the provider boundary. So the assertions are about the bytes
// that would actually leave: model, effort, cap field, cap value, and the priced reservation.
//
// THE MISMATCH THIS EXISTS TO PROVE CLOSED: editorPassOnFinalizedDraft asks for
// max(900, 420 × obligations + 400) = 2,080 for four obligations. The server's 6,000 was only a
// CEILING, so min(6000, 2080) admitted 2,080 — and the successful Luna call used 3,984 output
// tokens, which 2,080 would have truncated. General prose now receives 6,000 because the floor
// equals the ceiling for that configuration.
//
// NO PAID CALL. doFetch is replaced before the handler is built; no provider is reached and no
// key is read. Supabase is stubbed to admit, so the accounting path runs without a database.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import vm from 'node:vm';
import { createHandler } from './api/cplus-editor.js';

const ROOT = '/Users/romantsukerman/storybound-app';
vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

let pass = 0; const fails = [];
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ok    ' + label); }
  else { fails.push(label); console.log('  FAIL  ' + label + (extra ? '\n        ' + extra : '')); }
}

// ── THE STUBBED WORLD: a provider boundary that records, and a database that admits ────────
let captured = null;
const REPLY = (model) => ({
  ok: true, status: 200,
  json: async () => ({ model, choices: [{ index: 0, finish_reason: 'stop',
    message: { content: '{"decisions":[],"edits":[]}' } }],
    usage: { prompt_tokens: 15113, completion_tokens: 3984, total_tokens: 19097,
      prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 15110 },
      completion_tokens_details: { reasoning_tokens: 3150 } } })
});
function stubs(servedModel) {
  return {
    env: { CPLUS_EDITOR_ENABLED: 'true', CPLUS_EDITOR_PRICE_FORTUNES: '0',
      CPLUS_EDITOR_DAILY_CAP: '60', OPENAI_API_KEY: 'stub', XAI_API_KEY: 'stub',
      SUPABASE_URL: 'https://stub', SUPABASE_SERVICE_ROLE_KEY: 'stub' },
    log: { warn() {}, info() {}, error() {}, log() {} },
    fetch: async (url, init) => {
      captured = { url, body: JSON.parse(init.body) };
      return REPLY(servedModel);
    },
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'acct-1' } }, error: null }) },
      from: () => ({
        update: () => ({ eq: async () => ({ error: null }), error: null }),
        insert: async () => ({ error: null }),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
      // The admission RPC returns a ROW SET; its `outcome` is what the handler branches on.
      rpc: async (fn) => (fn === 'cplus_editor_admit')
        ? { data: [{ outcome: 'admitted', charged_fortunes: 0 }], error: null }
        : { data: [{ ok: true }], error: null }
    })
  };
}

// ── THE REAL REQUEST, FROM THE REAL PASS ───────────────────────────────────────────────────
// Four characters on stage, which is what produced the 2,080 figure on the live Sol scene.
const DRAFT = [
  'The bell over the door went off a half-beat late.', '',
  'Devrim set the ledger down where I could see the column he meant.', '',
  'Seren waited by the door for whichever of us moved first.', '',
  'The hallow-keeper read it before I did, and the reading stopped their hand mid-turn.'
].join('\n');
const roster = [{ label: 'Mira', kind: 'pc', isPC: true, participation: 'major' },
  { label: 'Devrim', kind: 'character', participation: 'major' },
  { label: 'Seren', kind: 'character', participation: 'major' },
  { label: 'the hallow-keeper', kind: 'character', participation: 'major' }];

// This mirrors the production caller in app.js: it takes the request the pass built and posts
// the same body shape, including the content class and the pass's OWN maxTokens.
async function runThroughHandler(contentClass, servedModel) {
  const dep = stubs(servedModel);
  const handler = createHandler(dep);
  let passedMaxTokens = null, routeStatus = null, routeBody = null;
  await EBC.editorPassOnFinalizedDraft({
    draft: DRAFT,
    coveragePlan: EBC.cpCoveragePlan({ issue: 1, ledger: [], attempts: [], sceneOrdinal: 2,
      participants: roster }),
    onStage: roster, skeleton: null, liName: 'Devrim', attempts: [], ledger: [],
    sceneOrdinal: 2, issue: 1, protectedPassages: [], roster,
    owner: { storyId: 'st-1', scene: 2, ticket: 't' },
    editorFn: async (c) => {
      passedMaxTokens = c.maxTokens;                 // what the ORDINARY path asks for
      const opId = EBC.cpEditorOperationId({ accountId: 'acct-1', storyId: 'st-1', scene: 2,
        revisionId: c.revisionId });
      const res = { code: null, payload: null, headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(c2) { this.code = c2; return this; },
        json(o) { this.payload = o; return this; } };
      await handler({ method: 'POST', headers: { authorization: 'Bearer tok' },
        body: { userId: 'acct-1', operationId: opId, storyId: 'st-1', scene: 2,
          revisionId: c.revisionId, system: c.sys, user: c.user,
          maxTokens: c.maxTokens, obligations: c.ids || null, contentClass } }, res);
      routeStatus = res.code; routeBody = res.payload;
      return { dispatched: false, reason: 'captured at the provider boundary' };
    } });
  return { passedMaxTokens, routeStatus, routeBody };
}

console.log('\n[1] GENERAL PROSE — THE ORDINARY PATH DELIVERS LUNA\'S TESTED ALLOWANCE');
{
  captured = null;
  const r = await runThroughHandler('general', 'gpt-6-luna');
  ok(r.passedMaxTokens === 2080,
    '1a: the ordinary pass still asks for 2,080 (420 × 4 + 400) — unchanged, and the mismatch',
    String(r.passedMaxTokens));
  ok(!!captured, '1b: the handler reached the provider boundary',
    JSON.stringify(r.routeBody).slice(0, 300));
  ok(captured.url.indexOf('api.openai.com') !== -1,
    '1c: outgoing endpoint is OpenAI Chat Completions', captured.url);
  ok(captured.body.model === 'gpt-6-luna', '1d: outgoing MODEL is gpt-6-luna',
    String(captured.body.model));
  ok(captured.body.reasoning_effort === 'medium', '1e: outgoing EFFORT is medium',
    String(captured.body.reasoning_effort));
  ok(captured.body.max_completion_tokens === 6000,
    '1f: outgoing ALLOWANCE is 6,000 — delivered, not merely permitted',
    String(captured.body.max_completion_tokens));
  ok(captured.body.max_tokens === undefined,
    '1g: and max_tokens is absent, which this model rejects');
  // ── MARKER UPDATED (Roman 2026-11-06) ────────────────────────────────────────────────────
  // This looked for 'PHYSICAL RECOGNIZABILITY', the opening line of CP_GROUNDING.block(). That
  // block moved to the PICTURABILITY pass when the two findings were split, so a general C+
  // pass stopped emitting it and this assertion has been stale since. The question is unchanged
  // — are these the real pass's messages rather than a hand-built request? — so it now reads a
  // marker the C+ system prompt actually carries: its own reply contract.
  ok(captured.body.messages.length === 2
    && captured.body.messages[0].content.indexOf('ONE DECISION PER OBLIGATION') !== -1,
    '1h: the messages are the pass\'s own, not a hand-built request');
}

console.log('\n[2] EXPLICIT PROSE — GROK\'S ALLOWANCE AND ENDPOINT ARE UNCHANGED');
{
  captured = null;
  const r = await runThroughHandler('explicit', 'grok-4.3');
  ok(captured.url.indexOf('api.x.ai') !== -1, '2a: outgoing endpoint is xAI', captured.url);
  ok(captured.body.model === 'grok-4.3', '2b: outgoing model is grok-4.3');
  ok(captured.body.max_tokens === 2080,
    '2c: the caller\'s own 2,080 is passed through unchanged — grok\'s behaviour is preserved',
    String(captured.body.max_tokens));
  ok(captured.body.max_completion_tokens === undefined,
    '2d: and no max_completion_tokens is sent to xAI');
  ok(captured.body.reasoning_effort === undefined,
    '2e: no effort field is sent on the explicit path');
}

console.log('\n[3] THE RESERVATION FOLLOWS WHAT IS ACTUALLY SENT');
{
  const { editorAdmission } = await import('./api/cplus-editor.js');
  const body = (cc) => ({ operationId: 'cplus-editor:acct-1:st-1:scene2:r1',
    storyId: 'st-1', scene: 2, revisionId: 'r1', contentClass: cc,
    system: 'S'.repeat(40000), user: 'U'.repeat(20000), maxTokens: 2080 });
  const env = { CPLUS_EDITOR_PRICE_FORTUNES: '0', CPLUS_EDITOR_DAILY_CAP: '60' };
  const g = editorAdmission({ env, accountId: 'acct-1', body: body('general') });
  const x = editorAdmission({ env, accountId: 'acct-1', body: body('explicit') });
  ok(g.outCap === 6000, '3a: general admission reserves against 6,000', String(g.outCap));
  ok(x.outCap === 2080, '3b: explicit admission reserves against the asked 2,080', String(x.outCap));
  // 15,000 input tokens + 6,000 × 1.5 × 1.2 output at Luna's rates.
  const expect = (15000 * 1e-7 + Math.ceil(6000 * 1.5) * 5e-7) * 1.2;
  ok(Math.abs(g.reservedUsd - expect) < 1e-9,
    '3c: and prices it at Luna\'s rates for the 6,000 it will send — $' + g.reservedUsd.toFixed(7),
    String(g.reservedUsd));
  ok(g.reservedUsd < x.reservedUsd,
    '3d: still far below the explicit path despite the larger allowance',
    'luna $' + g.reservedUsd.toFixed(6) + ' vs grok $' + x.reservedUsd.toFixed(6));
}

console.log('\n[4] SETTLEMENT PRICES CACHE WRITES AT THE WRITE RATE');
{
  const { normalizeUsage, editorConfigFor } = await import('./api/cplus-editor.js');
  // The real saved Luna usage block.
  const u = normalizeUsage({ prompt_tokens: 15113, completion_tokens: 3984, total_tokens: 19097,
    prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 15110 },
    completion_tokens_details: { reasoning_tokens: 3150 } }, editorConfigFor('general'));
  ok(u.ok && u.outTok === 3984, '4a: billed output is 3,984 (reasoning inside completion)');
  ok(u.cacheWriteTok === 15110 && u.plainInTok === 3,
    '4b: 15,110 write tokens and 3 ordinary input tokens', JSON.stringify(
      { write: u.cacheWriteTok, plain: u.plainInTok }));
  ok(Math.abs(u.usd - 0.00388105) < 1e-8,
    '4c: the calculated cost is $0.00388105 — writes at $0.125/MTok, not the $0.10 input rate',
    u.usd.toFixed(8));
  ok(/writes priced at the published write rate/.test(u.cacheBasis), '4d: and the basis names the rate used',
    u.cacheBasis);
  // ── THE READ RATE, CONFIGURED FOR FUTURE SETTLEMENTS ──────────────────────────────────
  // The saved Luna call had ZERO reads, so this changes nothing retrospectively. In production
  // the second pass on a story hits a warm cache, and $0.01/MTok against the $0.10 input rate
  // is a 10× difference that was being thrown away by pricing reads as input.
  const warm = normalizeUsage({ prompt_tokens: 15113, completion_tokens: 1000,
    total_tokens: 16113,
    prompt_tokens_details: { cached_tokens: 15110, cache_write_tokens: 0 },
    completion_tokens_details: { reasoning_tokens: 0 } }, editorConfigFor('general'));
  const expectWarm = 3 * 1e-7 + 15110 * 1e-8 + 1000 * 5e-7;
  ok(Math.abs(warm.usd - expectWarm) < 1e-10,
    '4e: a warm-cache call prices reads at $0.01/MTok, not the input rate — $'
      + warm.usd.toFixed(8), String(warm.usd));
  ok(warm.usd < (15113 * 1e-7 + 1000 * 5e-7),
    '4f: which is cheaper than charging reads as input, as it should be');
  // AND THE EXPLICIT PATH IS UNAFFECTED: no published xAI cache rate is configured, so its
  // reads stay at the input rate and the basis says so rather than implying a figure.
  const gx = normalizeUsage({ prompt_tokens: 15070, completion_tokens: 703, total_tokens: 16945,
    prompt_tokens_details: { cached_tokens: 128 },
    completion_tokens_details: { reasoning_tokens: 1172 } }, editorConfigFor('explicit'));
  ok(Math.abs(gx.usd - 0.023525) < 1e-6 && /no published cache-write rate/i.test(gx.cacheBasis),
    '4g: grok is unchanged and says no cache rate is configured for it', gx.cacheBasis);
}

console.log('\n' + (fails.length ? 'FAIL' : 'PASS') + '  ' + pass + ' checks, '
  + fails.length + ' failed');
for (const f of fails) console.log('  FAILED: ' + f);
console.log('\nNOT EXERCISED: either provider. The boundary is stubbed, so this proves the');
console.log('OUTGOING REQUEST and the settlement arithmetic — not that gpt-6-luna performs well');
console.log('on scenes beyond the one comparison it has run.');
process.exit(fails.length ? 1 : 0);
