// OAS TURN REPLY — LONG-CONTEXT RECLASSIFICATION + COST-ACCOUNTING FIX (Roman, 2026-09-20)
//
// The paired OAS quality sample (2026-09-19, real, paid) proved two things:
//   1. The live OAS turn-reply prompt is structurally oversized for Mistral Small — a real,
//      deterministic, TERMINAL governor 507 ("reservation_exceeds_model_allowance", reserved
//      103,176 tokens vs a 20,000 TPM allowance). Not a rate-limit fluke; a retry would fail
//      identically. Contradicts the earlier "Mistral Small legitimately admits this short,
//      tightly-contextual dialogue role" assumption — that held for the OPENER's shorter prompt,
//      not for turn-replies.
//   2. The cost-accounting helper undercounted the real Grok reply by ~7.5% — it only priced
//      usage.completion_tokens, omitting reasoning tokens (which Grok bills as output, same rate).
//      The provider's own usage.cost_in_usd_ticks (319521500 → $0.031952, real) disagreed with the
//      token-derived estimate (completion_tokens alone → $0.029742).
//
// Roman's corrections, implemented and proven here:
//   1. Live OAS turn replies (roleTag 'oas-turn', _handleIntimacyTurn) are now dispatched through
//      _authorFullScenePolicy (app.js ~5148) instead of callOASTurnLLM — Grok primary (the
//      existing noise/opening-turn sniffer still picks the reasoning vs fast Grok variant),
//      ministral-8b-2512 admission-gated fallback, gpt-4o terminal. Mistral Small is REMOVED from
//      this role's eligible chain entirely. The OAS OPENER's live-generated path (roleTag
//      'oas-opener', _fireIntimacyOpener) is UNCHANGED — still callOASTurnLLM, still Mistral-first
//      — its prompt is short and was never shown to be oversized.
//   2. estimateTextCost (app.js) now prefers usage.cost_in_usd_ticks when present (1 tick = 1e-10
//      USD, observed from the real 2026-09-19 response) and otherwise includes
//      completion_tokens_details.reasoning_tokens in the output estimate. The accumulator records
//      costSource ('provider_ticks' | 'estimated') alongside the preserved raw usage block.
//   3. This control itself is the ledger update for role-distinction: it proves the 4 OAS/full-
//      scene roles' real, current eligible chains against source and live (stubbed) dispatch —
//      see _oas_role_provider_ledger_2026_09_20.md for the human-readable version.
//
// Fully dry — stub lane only, no allowRealPaths; no real provider is ever reached.
// usage: node _oas_turn_reply_long_context_reclassification_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
const candidateOasOpening = candidateRaw.draft && candidateRaw.draft.oasOpening;
const candidatePostInterruption = candidateRaw.draft && candidateRaw.draft.postInterruptionBeat;

const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

// ── 1. SOURCE-LEVEL: the real app.js text, no re-implementation ──
const appJs = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
section('1. SOURCE — turn-reply dispatch reclassified; opener dispatch untouched; Mistral Small removed from the turn-reply region only');
{
  const turnAnchorStart = appJs.indexOf('LIVE OAS TURN REPLY — LONG-CONTEXT AUTHOR ROLE');
  const turnAnchorEnd = appJs.indexOf('console.log(\'[INTIMACY-DIALOGUE] LLM raw response (first 400 chars):\'', turnAnchorStart);
  ok('the turn-reply reclassification region exists in the real file', turnAnchorStart > -1 && turnAnchorEnd > turnAnchorStart, 'start=' + turnAnchorStart + ' end=' + turnAnchorEnd);
  const turnRegion = appJs.slice(turnAnchorStart, turnAnchorEnd);
  ok('the turn-reply region calls window._authorFullScenePolicy', turnRegion.includes('window._authorFullScenePolicy('), null);
  // Checks for an actual CALL (identifier immediately followed by "(", no whitespace — real JS
  // invocation syntax in this codebase) — not a bare substring. The region's own explanatory
  // comment legitimately names callOASTurnLLM in prose with a space before its parenthetical
  // aside ("callOASTurnLLM (which still serves...)"), which must NOT be mistaken for a call.
  ok('the turn-reply region does NOT actually CALL callOASTurnLLM (naming it in an explanatory comment is fine; invoking it is not)', !turnRegion.includes('callOASTurnLLM(') && !turnRegion.includes('.callOASTurnLLM;'), null);
  ok('the turn-reply region does NOT reference mistral-small-latest anywhere', !/mistral-small-latest/.test(turnRegion), null);
  ok('the turn-reply region passes roleTag: \'oas-turn\'', turnRegion.includes("roleTag: 'oas-turn'"), null);
  ok('the turn-reply region records state._lastOASTurnAuthor / _lastOASTurnAuthorModel / _lastOASTurnAuthorCache (ledger role-distinction)', turnRegion.includes('state._lastOASTurnAuthor =') && turnRegion.includes('state._lastOASTurnAuthorModel =') && turnRegion.includes('state._lastOASTurnAuthorCache ='), null);

  const openerAnchor = appJs.indexOf('AUTHORED OPENER (Roman, Option E, 2026-09-17)');
  const openerNextFnAnchor = appJs.indexOf('window._fireIntimacyOpener = _fireIntimacyOpener;', openerAnchor); // end of the whole function — a real, unambiguous boundary
  const openerCallSite = appJs.indexOf('window.StoryboundOrchestration.callOASTurnLLM;', openerAnchor);
  ok('the OPENER\'s live-generated dispatch is UNCHANGED — still calls callOASTurnLLM, and does so within _fireIntimacyOpener itself (scope correctly limited to turn replies only)', openerCallSite > openerAnchor && openerCallSite < openerNextFnAnchor, 'openerAnchor=' + openerAnchor + ' openerCallSite=' + openerCallSite + ' fnEnd=' + openerNextFnAnchor);
}

section('2. SOURCE — cost accounting: authoritative ticks preferred, reasoning tokens included in the fallback estimate, source preserved');
{
  const estFnStart = appJs.indexOf('function estimateTextCost(model, usage) {');
  const estFnEnd = appJs.indexOf('\n  }\n', estFnStart);
  const estRegion = appJs.slice(estFnStart, estFnEnd);
  ok('estimateTextCost checks usage.cost_in_usd_ticks before deriving anything from TEXT_PRICING', estRegion.indexOf('cost_in_usd_ticks') < estRegion.indexOf('_resolveTextPricingKey'), null);
  ok('estimateTextCost multiplies ticks by TEXT_COST_TICK_TO_USD (not a hand-rolled constant)', estRegion.includes('usage.cost_in_usd_ticks * TEXT_COST_TICK_TO_USD'), null);
  ok('estimateTextCost\'s fallback output-token count includes completion_tokens_details.reasoning_tokens', estRegion.includes('completion_tokens_details && usage.completion_tokens_details.reasoning_tokens'), null);
  const tickConstMatch = appJs.match(/var TEXT_COST_TICK_TO_USD = ([0-9.e-]+);/);
  ok('TEXT_COST_TICK_TO_USD is defined and equals the observed 1e-10 conversion', !!tickConstMatch && Number(tickConstMatch[1]) === 1e-10, tickConstMatch && tickConstMatch[1]);
  const addTextStart = appJs.indexOf('addText(model, usage, category) {');
  const addTextEnd = appJs.indexOf('\n          },\n', addTextStart);
  const addTextRegion = appJs.slice(addTextStart, addTextEnd);
  ok('addText computes and records costSource (\'provider_ticks\' | \'estimated\') alongside the preserved raw usage in the breakdown entry', addTextRegion.includes('const costSource') && addTextRegion.includes('usage, cost: c, costSource'), null);
}

// ── 2. BEHAVIORAL: real browser, real app, stubs only ──
(async () => {
let browser;
try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
const page = await (await browser.newContext()).newPage();

let mistralHandler = () => ({ __gateStatus: 500, error: 'SHOULD NEVER BE CALLED for the turn-reply role — Mistral Small was removed from its chain' });
let grokHandler = () => ({ choices: [{ message: { content: 'SHOULD NOT BE REACHED before configured' } }] });
let chatgptHandler = () => ({ content: 'SHOULD NOT BE REACHED' });

const gate = await installFailClosedNetworkGate(page);
gate.stub('/api/mistral-proxy', (req) => mistralHandler(req));
gate.stub('/api/proxy', (req) => grokHandler(req));
gate.stub('/api/chatgpt-proxy', (req) => chatgptHandler(req));
// '/api/deepseek-proxy' deliberately unregistered — _authorFullScenePolicy never uses it.

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._handleIntimacyTurn === 'function' && typeof window._bakedScene1For === 'function' && typeof window._clearPersistedOASState === 'function' && typeof window._authorFullScenePolicy === 'function' && typeof window._ensureSceneCostAcc === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 })
  .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });
console.log('\n✓ real app reached');

await page.evaluate(() => {
  const s = window.state;
  s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
  s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
  s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
  s.turnCount = 0; s.scenes = [];
  s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
  s._starterId = 'starter_first_sacrifice';
  s._pcLookSkipped = true;
  s._bakedGenesisUnlocked = true;
  window._devBypass = true;
});

async function mountFreshCandidateState() {
  await page.evaluate(async ({ candidateOasOpening, candidatePostInterruption }) => {
    window.state.intimacyDialogue = null;
    window._clearPersistedOASState();
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    const h = pkg.oasHandoff || {};
    const plan = {
      beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null,
      openingFrame: h.openingFrame || '', cue: h.cue || '',
      interruption: h.interruption || '', interruptionImage: h.interruptionImage || '',
      interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [],
      oasOpening: candidateOasOpening, postInterruptionBeat: candidatePostInterruption || null,
    };
    await window._initIntimacyDialogue(plan);
    await window._fireIntimacyOpener();
  }, { candidateOasOpening, candidatePostInterruption });
}

section('3. BEHAVIORAL — turn-reply dispatches to Grok, NEVER attempts mistral-small-latest');
{
  grokHandler = () => ({ choices: [{ message: { content: JSON.stringify({ li_dialogue: 'GROK-WON', li_action: '', li_face_state: 'closed_smile', li_next_prompt: '', user_signal: 'neutral', temperature_shift: 0, scene_state: 'continue', scene_tone: 'tender', primaryEngine: null, kink_introduced: null, pc_kink_response: 'none', kink_affinity: null, kinks_used: [] }) } }], usage: { prompt_tokens: 20000, completion_tokens: 60 } });
  await mountFreshCandidateState();
  const before = gate.calls().length;
  await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
  const calls = gate.calls().slice(before);
  const grokCall = calls.find((c) => { try { return new URL(c.url).pathname === '/api/proxy'; } catch (_) { return false; } });
  const mistralAttempted = calls.some((c) => { try { return new URL(c.url).pathname === '/api/mistral-proxy'; } catch (_) { return false; } });
  const authorState = await page.evaluate(() => ({ author: window.state._lastOASTurnAuthor, model: window.state._lastOASTurnAuthorModel }));
  ok('a real dispatch went to Grok (/api/proxy)', !!grokCall, JSON.stringify(calls.map((c) => c.url)));
  ok('zero attempts at Mistral (/api/mistral-proxy) — Grok won on the first tier, no fallback needed', mistralAttempted === false, JSON.stringify(calls.map((c) => c.url)));
  ok('state._lastOASTurnAuthor/_lastOASTurnAuthorModel correctly record the real winning provider (role-distinguishing ledger fields)', authorState.author === 'grok' && !!authorState.model, JSON.stringify(authorState));
}

section('4. BEHAVIORAL — when Grok fails, ministral-8b-2512 is the fallback (never mistral-small-latest)');
{
  grokHandler = () => ({ __gateStatus: 500, error: 'simulated Grok failure' });
  mistralHandler = (req) => {
    const body = JSON.parse(req.postData() || '{}');
    return { choices: [{ message: { content: JSON.stringify({ li_dialogue: 'MINISTRAL-WON:' + body.model, li_action: '', li_face_state: 'closed_smile', li_next_prompt: '', user_signal: 'neutral', temperature_shift: 0, scene_state: 'continue', scene_tone: 'tender', primaryEngine: null, kink_introduced: null, pc_kink_response: 'none', kink_affinity: null, kinks_used: [] }) } }], usage: { prompt_tokens: 20000, completion_tokens: 60 } };
  };
  await mountFreshCandidateState();
  const before = gate.calls().length;
  await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
  const calls = gate.calls().slice(before);
  const mistralCall = calls.find((c) => { try { return new URL(c.url).pathname === '/api/mistral-proxy'; } catch (_) { return false; } });
  const last = await page.evaluate(() => { const d = window.state.intimacyDialogue; const l = d.liTurnHistory[d.liTurnHistory.length - 1]; return l && l.liDialogue; });
  ok('the fallback tier dispatched to /api/mistral-proxy (the endpoint is shared — the MODEL is what must differ)', !!mistralCall, JSON.stringify(calls.map((c) => c.url)));
  ok('the model requested was ministral-8b-2512, NEVER mistral-small-latest', last === 'MINISTRAL-WON:ministral-8b-2512', JSON.stringify(last));
}

section('5. COST ACCOUNTING — authoritative ticks preferred; reasoning tokens included when ticks absent; source preserved');
{
  // 5a. Ticks present — authoritative, matches the real observed conversion exactly.
  grokHandler = () => ({ choices: [{ message: { content: JSON.stringify({ li_dialogue: 'TICKS-CASE', li_action: '', li_face_state: 'closed_smile', li_next_prompt: '', user_signal: 'neutral', temperature_shift: 0, scene_state: 'continue', scene_tone: 'tender', primaryEngine: null, kink_introduced: null, pc_kink_response: 'none', kink_affinity: null, kinks_used: [] }) } }], usage: { prompt_tokens: 23251, completion_tokens: 352, completion_tokens_details: { reasoning_tokens: 884 }, prompt_tokens_details: { cached_tokens: 192 }, cost_in_usd_ticks: 319521500 } });
  await mountFreshCandidateState();
  await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
  const acc1 = await page.evaluate(() => { const b = window._ensureSceneCostAcc().breakdown.text; return b[b.length - 1]; });
  const expectedTicksCost = 319521500 * 1e-10; // 0.03195215 exactly — not the rounded $0.031952 headline figure
  ok('with cost_in_usd_ticks present, the recorded cost matches it exactly (319521500 * 1e-10)', acc1 && Math.abs(acc1.cost - expectedTicksCost) < 1e-12, JSON.stringify(acc1 && { cost: acc1.cost, expectedTicksCost, costSource: acc1.costSource }));
  ok('costSource is recorded as provider_ticks', acc1 && acc1.costSource === 'provider_ticks', JSON.stringify(acc1 && acc1.costSource));
  ok('the raw usage block (including cost_in_usd_ticks) is preserved verbatim in the ledger entry', acc1 && acc1.usage && acc1.usage.cost_in_usd_ticks === 319521500, JSON.stringify(acc1 && acc1.usage));

  // 5b. No ticks — estimate must include reasoning tokens (this is the exact real-response shape
  // MINUS cost_in_usd_ticks, isolating the estimate-path fix).
  grokHandler = () => ({ choices: [{ message: { content: JSON.stringify({ li_dialogue: 'ESTIMATE-CASE', li_action: '', li_face_state: 'closed_smile', li_next_prompt: '', user_signal: 'neutral', temperature_shift: 0, scene_state: 'continue', scene_tone: 'tender', primaryEngine: null, kink_introduced: null, pc_kink_response: 'none', kink_affinity: null, kinks_used: [] }) } }], usage: { prompt_tokens: 23251, completion_tokens: 352, completion_tokens_details: { reasoning_tokens: 884 } } });
  await mountFreshCandidateState();
  await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
  const acc2 = await page.evaluate(() => { const b = window._ensureSceneCostAcc().breakdown.text; return b[b.length - 1]; });
  // grok-4-1-fast-reasoning: in=0.00000125, out=0.0000025. 23251*0.00000125 + (352+884)*0.0000025
  const expected = 23251 * 0.00000125 + (352 + 884) * 0.0000025;
  ok('without ticks, the estimate includes reasoning_tokens in the output price (matches hand-computed expected value)', acc2 && Math.abs(acc2.cost - expected) < 0.0000001, JSON.stringify(acc2 && { cost: acc2.cost, expected }));
  ok('costSource is recorded as estimated', acc2 && acc2.costSource === 'estimated', JSON.stringify(acc2 && acc2.costSource));
  const withoutReasoning = 23251 * 0.00000125 + 352 * 0.0000025;
  ok('the fix materially changes the result vs the old (reasoning-tokens-omitted) calculation — not a no-op fix', acc2 && Math.abs(acc2.cost - withoutReasoning) > 0.000001, JSON.stringify({ fixed: acc2 && acc2.cost, oldBuggy: withoutReasoning }));
}

await browser.close();

console.log('\n' + '='.repeat(100));
console.log('OAS TURN REPLY LONG-CONTEXT RECLASSIFICATION CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
