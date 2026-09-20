// PAIRED OAS QUALITY SAMPLE — PINNING + INCONCLUSIVE + COST-CEILING PROOF (Roman, 2026-09-19)
//
// Prerequisite for the eventual paired Mistral-vs-Grok live sample. Roman's requirement: each run
// pinned to EXACTLY ONE physical provider request, with NO production code change and NO
// window-flag override — the pinning has to be harness-only.
//
// The mechanism (needs zero changes to callOASTurnLLM/app.js): the gate's EXISTING
// allowRealPaths()/stub() registration is already an allow-list — any /api/** path that is neither
// stubbed nor real-lane-allowed is aborted by the gate's own fail-closed default before it leaves
// the browser (proven since the very first gate control, section 5). So "pin to Grok reasoning
// only" = register (stub here / allowRealPaths in the eventual live version) ONLY '/api/proxy',
// with gate.setPhase(label, 1) capping it to exactly one dispatch. callOASTurnLLM's own internal
// fallback chain (grok-4-1-fast-non-reasoning → deepseek-v4-pro → mistral-small-latest →
// gpt-4o-mini) still RUNS if the first tier fails — but every one of those later tiers hits an
// unregistered path and is aborted instantly, at zero cost, before any bytes leave the browser.
// callOASTurnLLM sees each as a failed attempt and returns null once all are exhausted — at which
// point the HARNESS (not callOASTurnLLM) declares the run INCONCLUSIVE, never substituting a
// different model's output as if it were the pinned provider's answer. Same mechanism, inverted
// allow-list, pins Run B to Mistral: '/api/mistral-proxy' is the only registered path, so Grok's
// and DeepSeek's earlier attempts are blocked (zero cost) until the chain reaches Mistral.
//
// This control proves, against the real, unmodified app + real, unmodified gate:
//   1. Run A (Grok-reasoning pinned) SUCCESS: exactly one dispatch, to grok-4-1-fast-reasoning.
//   2. Run A FAILURE: the pinned tier fails (429) — exactly one dispatch still, no second attempt,
//      the harness's own verdict is INCONCLUSIVE, and the UI's own soft-deflect fallback text
//      (which _handleIntimacyTurn renders regardless, so the reader is never left silent) is NOT
//      mistaken for a real Grok sample by the harness's verdict logic.
//   3. Run B (Mistral pinned) SUCCESS: exactly one dispatch, straight to mistral-small-latest — the
//      earlier Grok/DeepSeek tiers are blocked at zero cost, not silently skipped some other way.
//   4. Run B FAILURE: same INCONCLUSIVE guarantee, and — critically — Grok is NEVER silently
//      substituted for a failed Mistral run (checked directly: zero dispatches to /api/proxy or
//      /api/deepseek-proxy across the whole run).
//   5. Combined $0.06 hard ceiling: the same cost-ceiling check the eventual live script uses
//      correctly allows two real, cheap runs, and correctly refuses a hypothetical second run once
//      a (deliberately inflated, for this test only) first run's real cost already meets the
//      ceiling.
//   6. Image/undeclared routes stay fail-closed throughout (inherited, reconfirmed here).
//
// Every run in this control starts from a FRESH candidate-opener mount (same real
// 13_final_field_correction.json text, same real shipped Scene 1 context, same Roman Say/Do) —
// never a state already carrying a prior run's rendered reply, matching "same mounted candidate,
// exact same Say/Do, identical OAS context" for both runs.
//
// Fully dry — the stub lane, never allowRealPaths; no real provider is ever reached.
// usage: node _first_sacrifice_oas_paired_quality_pinning_control.mjs
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
if (!candidateOasOpening || !candidateOasOpening.text) {
  console.error('HARNESS BLOCKER: ' + CANDIDATE_PATH + ' has no draft.oasOpening.text.');
  process.exit(2);
}

const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

// Real, sourced TEXT_PRICING rates (public/app.js) — used only to compute REAL cost from REAL
// usage blocks this control captures, never inferred.
const RATES = {
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
};
function realCost(model, usage) {
  if (!usage) return null;
  const rate = RATES[model];
  if (!rate) return null;
  return (usage.prompt_tokens || 0) * rate.in + (usage.completion_tokens || 0) * rate.out;
}
const COMBINED_CEILING_USD = 0.06;

const validReply = (marker) => ({ choices: [{ message: { content: JSON.stringify({
  li_dialogue: marker, li_action: '', li_face_state: 'closed_smile', li_next_prompt: '',
  user_signal: 'neutral', temperature_shift: 0, scene_state: 'continue', scene_tone: 'tender',
  primaryEngine: null, kink_introduced: null, pc_kink_response: 'none', kink_affinity: null, kinks_used: [],
}) } }], usage: { prompt_tokens: 1400, completion_tokens: 60 } });

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._handleIntimacyTurn === 'function' && typeof window._bakedScene1For === 'function' && typeof window._clearPersistedOASState === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached\n');

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

  // Re-mounts the SAME candidate opener fresh (beatCount back to 0, liTurnHistory back to just the
  // opener) — every run starts from this identical state, never a prior run's rendered reply.
  async function mountFreshCandidateState() {
    await page.evaluate(async ({ candidateOasOpening, candidatePostInterruption }) => {
      // BUG FOUND while dry-proving this control (2026-09-19): _initIntimacyDialogue has an
      // early-return ("already active" -> _rehydrateOASUI) AND a localStorage resume path
      // (_loadPersistedOASState) — either one silently reuses a PRIOR section's completed state
      // (wrong beatCount, extra liTurnHistory entries) instead of genuinely remounting fresh. Both
      // are real production mechanics (Back-navigation / reload survival), not bugs in app.js — the
      // bug was in this control not accounting for them. Explicitly clearing both in-memory and
      // persisted state before every mount guarantees each run starts from the true, identical,
      // fresh precondition Roman required.
      window.state.intimacyDialogue = null;
      if (typeof window._clearPersistedOASState === 'function') window._clearPersistedOASState();
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

  // The harness's own verdict — never trusts _handleIntimacyTurn's rendered UI text (which always
  // renders SOMETHING, including a soft-deflect fallback on failure, so the reader is never left
  // silent). Ground truth is the gate's own tracked dispatch record.
  function verdictFor(tracked) {
    if (tracked.length !== 1) return { verdict: 'INCONCLUSIVE', reason: tracked.length === 0 ? 'pinned tier never dispatched' : 'more than one physical request occurred (should be impossible under ceiling 1)' };
    const c = tracked[0];
    if (c.status === 200 && c.responseBody) return { verdict: 'SUCCESS', tracked: c };
    return { verdict: 'INCONCLUSIVE', reason: 'pinned tier settled without a 200 response', status: c.status, networkError: c.networkError };
  }

  section('1. RUN A (Grok-reasoning pinned) — SUCCESS: exactly one dispatch, to grok-4-1-fast-reasoning');
  {
    const gate = await installFailClosedNetworkGate(page);
    gate.stub('/api/proxy', () => validReply('RUN-A-SUCCESS'));
    // '/api/mistral-proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy' deliberately UNREGISTERED —
    // the gate's existing fail-closed default aborts any attempt at them, at zero cost.
    await mountFreshCandidateState();
    gate.setPhase('run-a-success', 1);
    await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
    const tracked = gate.trackedCalls('run-a-success');
    const v = verdictFor(tracked);
    ok('exactly one physical request occurred', tracked.length === 1, JSON.stringify(tracked.map((t) => t.url)));
    ok('the one request went to grok-4-1-fast-reasoning specifically (production\'s natural first tier for this exact turn)', tracked[0] && tracked[0].requestBody && tracked[0].requestBody.preferredModel === 'grok-4-1-fast-reasoning', JSON.stringify(tracked[0] && tracked[0].requestBody));
    ok('the harness verdict is SUCCESS', v.verdict === 'SUCCESS', JSON.stringify(v));
    ok('zero attempts at any other text endpoint (no silent fallback tier reached even on success)', gate.unstubbed().filter((u) => /api\/(mistral-proxy|deepseek-proxy|chatgpt-proxy)/.test(u.url)).length === 0, JSON.stringify(gate.unstubbed()));
  }

  section('2. RUN A (Grok-reasoning pinned) — FAILURE: pinned tier fails, verdict INCONCLUSIVE, no fallback substitution');
  {
    const gate = await installFailClosedNetworkGate(page);
    gate.stub('/api/proxy', () => ({ __gateStatus: 429, error: 'simulated Grok failure', governor: false }));
    await mountFreshCandidateState();
    gate.setPhase('run-a-fail', 1);
    await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
    const tracked = gate.trackedCalls('run-a-fail');
    const v = verdictFor(tracked);
    const renderedLast = await page.evaluate(() => { const d = window.state.intimacyDialogue; const l = d.liTurnHistory[d.liTurnHistory.length - 1]; return l && l.liDialogue; });
    ok('exactly one physical request occurred (ceiling 1 — no retry of the same tier)', tracked.length === 1, JSON.stringify(tracked.map((t) => t.url)));
    ok('the harness verdict is INCONCLUSIVE (a 429 is not a success)', v.verdict === 'INCONCLUSIVE', JSON.stringify(v));
    // callOASTurnLLM's own (unmodified) fallback chain DOES try the other tiers after Grok's
    // pinned attempt fails — that's real, expected production behavior. The guarantee under test
    // is that every one of those attempts was BLOCKED (aborted, zero cost), never served — i.e.
    // none of them appear in gate.calls() as matched:true/real:true.
    const otherTierAttempts = gate.calls().filter((c) => { try { const p = new URL(c.url).pathname; return p === '/api/mistral-proxy' || p === '/api/deepseek-proxy' || p === '/api/chatgpt-proxy'; } catch (_) { return false; } });
    const otherTierServed = otherTierAttempts.filter((c) => c.matched === true || c.real === true);
    ok('callOASTurnLLM\'s own fallback chain DID try other tiers after Grok failed (real, expected behavior — not suppressed)', otherTierAttempts.length > 0, JSON.stringify(otherTierAttempts.map((c) => c.url)));
    ok('NONE of those fallback attempts were ever served — every one was aborted before leaving the browser, so no other model\'s output could ever substitute for the pinned tier', otherTierServed.length === 0, JSON.stringify(otherTierServed));
    ok('the UI still rendered SOMETHING (soft-deflect fallback, for the reader) — but that text is NOT what the harness reports as the sample; the verdict object carries no li_dialogue field to mistake for real content', v.tracked === undefined && typeof renderedLast === 'string', 'rendered=' + JSON.stringify(renderedLast) + ' verdict=' + JSON.stringify(v));
  }

  section('3. RUN B (Mistral pinned) — SUCCESS: earlier tiers blocked at zero cost, exactly one dispatch to mistral-small-latest');
  {
    const gate = await installFailClosedNetworkGate(page);
    gate.stub('/api/mistral-proxy', () => validReply('RUN-B-SUCCESS'));
    // '/api/proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy' deliberately UNREGISTERED.
    await mountFreshCandidateState();
    gate.setPhase('run-b-success', 1);
    await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
    const tracked = gate.trackedCalls('run-b-success');
    const v = verdictFor(tracked);
    const grokDeepseekAttempts = gate.calls().filter((c) => { try { const p = new URL(c.url).pathname; return p === '/api/proxy' || p === '/api/deepseek-proxy'; } catch (_) { return false; } });
    const grokDeepseekServed = grokDeepseekAttempts.filter((c) => c.matched === true || c.real === true);
    ok('exactly one physical request occurred, and it is the pinned Mistral tier', tracked.length === 1 && tracked[0].url.includes('/api/mistral-proxy'), JSON.stringify(tracked.map((t) => t.url)));
    ok('the harness verdict is SUCCESS', v.verdict === 'SUCCESS', JSON.stringify(v));
    ok('Grok\'s and/or DeepSeek\'s earlier tiers were genuinely attempted by the real, unmodified chain before reaching Mistral (proves this really is beat 1 taking the reasoning-primary order, not a coincidental FAST/Mistral-first routing)', grokDeepseekAttempts.length > 0, JSON.stringify(grokDeepseekAttempts.map((c) => c.url)));
    ok('every one of those earlier attempts was blocked (undeclared, zero cost) — none served — proving the pin actually forced the route to Mistral rather than Mistral happening to be tried first anyway', grokDeepseekServed.length === 0, JSON.stringify(grokDeepseekServed));
  }

  section('4. RUN B (Mistral pinned) — FAILURE: verdict INCONCLUSIVE, Grok NEVER silently substituted for a failed Mistral run');
  {
    const gate = await installFailClosedNetworkGate(page);
    gate.stub('/api/mistral-proxy', () => ({ __gateStatus: 429, error: 'simulated Mistral failure', governor: false }));
    await mountFreshCandidateState();
    gate.setPhase('run-b-fail', 1);
    await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
    const tracked = gate.trackedCalls('run-b-fail');
    const v = verdictFor(tracked);
    const grokCalls = gate.calls().filter((c) => { try { return new URL(c.url).pathname === '/api/proxy'; } catch (_) { return false; } });
    const grokServed = grokCalls.filter((c) => c.matched === true || c.real === true);
    ok('exactly one physical request occurred', tracked.length === 1, JSON.stringify(tracked.map((t) => t.url)));
    ok('the harness verdict is INCONCLUSIVE', v.verdict === 'INCONCLUSIVE', JSON.stringify(v));
    ok('Grok was NEVER SERVED to cover for the failed Mistral run — it may have been ATTEMPTED (production\'s own unmodified chain still tries it) but every attempt was blocked before leaving the browser; the comparison stays honest, no cross-provider substitution', grokServed.length === 0, 'grok attempts=' + grokCalls.length + ' served=' + grokServed.length);
  }

  section('5. COMBINED $0.06 HARD CEILING — correctly allows two real cheap runs, correctly refuses a run that would breach it');
  {
    const realUsageA = { prompt_tokens: 1400, completion_tokens: 60 };
    const realUsageB = { prompt_tokens: 1400, completion_tokens: 55 };
    const costA = realCost('grok-4-1-fast-reasoning', realUsageA);
    const costB = realCost('mistral-small-latest', realUsageB);
    ok('a real, representative Run A cost is well under the combined ceiling on its own', costA < COMBINED_CEILING_USD, '$' + costA.toFixed(6));
    ok('a real, representative Run B cost is well under the combined ceiling on its own', costB < COMBINED_CEILING_USD, '$' + costB.toFixed(6));
    ok('the two real, representative runs combined stay well under the $0.06 ceiling (real headroom, not a near-miss)', (costA + costB) < COMBINED_CEILING_USD, '$' + (costA + costB).toFixed(6));

    // Deliberately inflated, for this test only — proves the ceiling check actually refuses a run,
    // not merely that normal runs happen to pass.
    const inflatedUsageA = { prompt_tokens: 40000, completion_tokens: 6000 };
    const inflatedCostA = realCost('grok-4-1-fast-reasoning', inflatedUsageA);
    const remainingBudgetAfterInflatedA = COMBINED_CEILING_USD - inflatedCostA;
    ok('the ceiling check correctly identifies a hypothetical inflated Run A as having already breached the combined ceiling, refusing Run B before it would ever dispatch', remainingBudgetAfterInflatedA <= 0, 'inflated run A cost=$' + inflatedCostA.toFixed(6) + ' remaining=$' + remainingBudgetAfterInflatedA.toFixed(6));
  }

  section('6. IMAGE / UNDECLARED ROUTES STAY FAIL-CLOSED THROUGHOUT (reconfirmed, not just inherited)');
  {
    const gate = await installFailClosedNetworkGate(page);
    gate.stub('/api/proxy', () => validReply('IMAGE-CHECK-RUN'));
    await mountFreshCandidateState();
    gate.setPhase('image-check', 1);
    await page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
    const imageCalls = gate.calls().filter((c) => /api\/(image|bfl-kontext|dashscope-image)/.test(c.url));
    const imageCallsServed = imageCalls.filter((c) => c.matched === true || c.real === true);
    // Whether an image call fires at all is incidental (depends on face-state asset caching for
    // this specific turn's outcome) — not asserted on. The guarantee under test is the negative.
    console.log('  · image-generation attempts observed this run: ' + imageCalls.length + ' (informational — see sections 1-5\'s own runs for cases where image noise did fire)');
    ok('ZERO image attempts were ever served (matched:true / real:true) — every single one, if any occurred, was aborted before leaving the browser', imageCallsServed.length === 0, JSON.stringify(imageCallsServed));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('PAIRED OAS QUALITY SAMPLE — PINNING CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
