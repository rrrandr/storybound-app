#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE PRODUCTION EDITOR'S PROVIDER SWITCH, VERIFIED WITHOUT PAID CALLS.
//
// gpt-6-luna becomes the C+ repair editor for GENERAL prose; grok-4.3 keeps EXPLICIT prose,
// because the editor rewrites text and a moderating model will refuse or soften sexually
// explicit prose the reader paid for — the harm `_proseModerationHot` was built to prevent on
// the Claude polish path.
//
// WHAT THIS FILE DOES AND DOES NOT DO — corrected (Roman 2026-11-04). It exercises the EXPORTED
// HELPERS — editorAdmission, reserveUsd, normalizeUsage, editorConfigFor — and greps source
// text. It does NOT invoke the handler and does NOT stub `doFetch`, so it cannot see the bytes
// that would leave, and it could not catch the allowance mismatch between what the pass asks for
// and what the server admits. I previously described it as driving the real dispatch; that was
// wrong. The outgoing request is captured through the actual caller and the actual handler in
// _cplus_editor_outgoing_capture.mjs, which is where that claim belongs.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import vm from 'node:vm';
import { editorAdmission, reserveUsd, normalizeUsage, editorConfigFor }
  from './api/cplus-editor.js';

let pass = 0; const fails = [];
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ok    ' + label); }
  else { fails.push(label); console.log('  FAIL  ' + label + (extra ? '\n        ' + extra : '')); }
}

const ENV = { CPLUS_EDITOR_ENABLED: 'true', CPLUS_EDITOR_PRICE_FORTUNES: '0',
  CPLUS_EDITOR_DAILY_CAP: '60' };
const BASE = { userId: 'acct-1', storyId: 'st-1', scene: 3, revisionId: 'r1abc-5499',
  system: 'S'.repeat(40000), user: 'U'.repeat(20000), maxTokens: 2080,
  operationId: 'cplus-editor:acct-1:st-1:scene3:r1abc-5499' };
const admit = (extra) => editorAdmission({ env: ENV, accountId: 'acct-1',
  body: Object.assign({}, BASE, extra) });

console.log('\n[1] THE CONTENT CLASS SELECTS A SERVER-PINNED CONFIGURATION');
{
  const g = admit({ contentClass: 'general' });
  const x = admit({ contentClass: 'explicit' });
  ok(g.ok && g.model === 'gpt-6-luna', '1a: general prose → gpt-6-luna', JSON.stringify(g));
  ok(x.ok && x.model === 'grok-4.3', '1b: explicit prose → grok-4.3 (unchanged)', JSON.stringify(x));
  // THE FIELD IS REQUIRED. Guessing wrong on an explicit scene is the one outcome to avoid.
  const none = admit({});
  ok(!none.ok && none.error === 'content_class_required',
    '1c: an absent class is REFUSED, never defaulted', JSON.stringify(none));
  const bogus = admit({ contentClass: 'spicy' });
  ok(!bogus.ok && bogus.error === 'content_class_required',
    '1d: an unrecognized class is refused too');
  // THE CLIENT CANNOT NAME A MODEL, A PROVIDER, A RATE OR AN ALLOWANCE.
  const inject = admit({ contentClass: 'general', model: 'gpt-4o', url: 'http://evil',
    rateIn: 0, maxOutputTokens: 999999 });
  ok(inject.ok && inject.model === 'gpt-6-luna' && inject.outCap <= 6000,
    '1e: model/url/rate/allowance fields on the request are ignored', JSON.stringify(inject));
}

console.log('\n[2] THE TESTED LUNA CONFIGURATION IS USED, NOT GROK\'S');
{
  const g = admit({ contentClass: 'general', maxTokens: 6000 });
  const x = admit({ contentClass: 'explicit', maxTokens: 6000 });
  ok(g.outCap === 6000, '2a: general prose gets the tested 6,000-token allowance', String(g.outCap));
  ok(x.outCap === 2400, '2b: explicit prose keeps grok\'s 2,400 bound', String(x.outCap));
  ok(editorConfigFor('general').capField === 'max_completion_tokens',
    '2c: and it sends max_completion_tokens — a reasoning model rejects max_tokens');
  ok(editorConfigFor('explicit').capField === 'max_tokens',
    '2d: while the explicit path still sends max_tokens');
  ok(editorConfigFor('general').effort === 'medium', '2e: medium reasoning effort is pinned');
  ok(editorConfigFor('general').url.indexOf('api.openai.com') !== -1
    && editorConfigFor('explicit').url.indexOf('api.x.ai') !== -1,
    '2f: the endpoints are per configuration — grok\'s is not carried over');
  ok(editorConfigFor('general').keyEnv === 'OPENAI_API_KEY',
    '2g: as is the key it reads');
  // THE RESERVATION USES THIS MODEL'S RATES, which is a 12× difference on output.
  const rg = reserveUsd(60000, 6000, editorConfigFor('general'));
  const rx = reserveUsd(60000, 6000, editorConfigFor('explicit'));
  ok(rg < rx / 5, '2h: the general reservation is priced at Luna\'s rates, not grok\'s',
    'luna $' + rg.toFixed(6) + ' vs grok $' + rx.toFixed(6));
}

console.log('\n[3] TOKEN ACCOUNTING — THE DOUBLE CHARGE IS GONE');
{
  // THE REAL SAVED RECEIPTS, both conventions.
  const LUNA = { prompt_tokens: 15113, completion_tokens: 3984, total_tokens: 19097,
    prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 15110 },
    completion_tokens_details: { reasoning_tokens: 3150 } };
  const GROK = { prompt_tokens: 15070, completion_tokens: 703, total_tokens: 16945,
    prompt_tokens_details: { cached_tokens: 128 },
    completion_tokens_details: { reasoning_tokens: 1172 } };
  const ul = normalizeUsage(LUNA, editorConfigFor('general'));
  const ux = normalizeUsage(GROK, editorConfigFor('explicit'));
  ok(ul.ok && ul.outTok === 3984,
    '3a: OpenAI — reasoning is INSIDE completion, so billed output is 3,984 not 7,134',
    JSON.stringify(ul));
  ok(ux.ok && ux.outTok === 1875,
    '3b: xAI — reasoning is OUTSIDE completion, so billed output stays 1,875',
    JSON.stringify(ux));
  // 3 ordinary input tokens + 15,110 cache WRITES at $0.125/MTok + 3,984 output at $0.50/MTok.
  // Writes cost MORE than input, so pricing them as input understated this by $0.0017.
  ok(Math.abs(ul.usd - 0.00388105) < 1e-9,
    '3c: and the Luna calculated cost is $0.00388105, with writes at the write rate',
    String(ul.usd));
  ok(Math.abs(ux.usd - 0.023525) < 1e-6,
    '3d: while the grok receipt is unchanged at $0.023525', String(ux.usd));
  ok(ul.reasoning === 3150 && ux.reasoning === 1172,
    '3e: the reasoning counts are still reported, just no longer added twice');
  ok(ul.cacheWriteTok === 15110 && ux.cachedInTok === 128,
    '3f: cache reads and writes are carried on the receipt', JSON.stringify(
      { lunaWrite: ul.cacheWriteTok, grokRead: ux.cachedInTok }));
  // A MISSING USAGE BLOCK IS STILL UNRESOLVED, NOT FREE.
  ok(normalizeUsage(null, editorConfigFor('general')).ok === false,
    '3g: a missing usage block remains UNRESOLVED, never a $0 settlement');
  ok(normalizeUsage({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 12 },
    editorConfigFor('general')).ok === false,
    '3h: and incoherent totals are still refused');
}

console.log('\n[4] THE SPENDING AND SCOPE PROTECTIONS ARE UNTOUCHED');
{
  const noPolicy = editorAdmission({ env: {}, accountId: 'acct-1',
    body: Object.assign({}, BASE, { contentClass: 'general' }) });
  ok(!noPolicy.ok, '4a: with no policy configured the route still refuses', JSON.stringify(noPolicy));
  const off = editorAdmission({ env: Object.assign({}, ENV, { CPLUS_EDITOR_ENABLED: 'false' }),
    accountId: 'acct-1', body: Object.assign({}, BASE, { contentClass: 'general' }) });
  ok(!off.ok, '4b: the off switch still works');
  const big = admit({ contentClass: 'general', system: 'S'.repeat(200000) });
  ok(!big.ok && big.error === 'request_too_large', '4c: the input bound still bites');
  const wrongOp = admit({ contentClass: 'general', operationId: 'cplus-editor:someone:else:scene9:rX' });
  ok(!wrongOp.ok && wrongOp.error === 'operation_mismatch',
    '4d: the operation identity check still bites');
  const empty = admit({ contentClass: 'general', system: '  ' });
  ok(!empty.ok && empty.error === 'request_required', '4e: and an empty request is refused');
}

console.log('\n[5] THE EXPLICIT GATE IS READ FROM ONE DEFINITION');
{
  // The client declares the class from the SAME predicate the prose path uses, so "explicit"
  // cannot drift between the two.
  const SRC = fs.readFileSync('./public/app.js', 'utf8');
  const site = SRC.slice(SRC.indexOf("fetch('/api/cplus-editor'"),
    SRC.indexOf("fetch('/api/cplus-editor'") + 2000);
  ok(/contentClass:/.test(site), '5a: the dispatch site declares a content class');
  ok(/_proseModerationHot/.test(site),
    '5b: and derives it from the existing moderation gate, not a second definition');
  ok(/catch \(_\) \{ return 'explicit'/.test(site),
    '5c: an unreadable state falls to the SAFE side (grok), never to the moderating model');
  // And the gate itself still means what it meant.
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(SRC.slice(SRC.indexOf('window._proseModerationHot = function'),
    SRC.indexOf('window._finalizeSceneProseParity')), ctx);
  const hot = ctx.window._proseModerationHot;
  ok(hot({ eroticMode: 'CARNAL' }) === true, '5d: CARNAL is explicit');
  ok(hot({ intimacyDialogue: { active: true } }) === true, '5e: live intimacy is explicit');
  ok(hot({ eroticMode: 'VISCERAL' }) === false,
    '5f: sensual prose is NOT explicit — it goes to Luna, as before it went to grok');
}

console.log('\n' + (fails.length ? 'FAIL' : 'PASS') + '  ' + pass + ' checks, '
  + fails.length + ' failed');
for (const f of fails) console.log('  FAILED: ' + f);
console.log('\nNOT EXERCISED: a real dispatch to either provider. No paid call was made, so this');
console.log('proves the SELECTION, the request shape, the rates and the accounting — not that');
console.log('gpt-6-luna performs well on scenes other than the one comparison it has run.');
process.exit(fails.length ? 1 : 0);
