// FATE-PREVIEW BATCH — PROVIDER POLICY control (Roman, 2026-09-16)
//
// Proves generateIntimateFatePreviewsBatch (public/orchestration-client.js) now follows the SAME
// shared Mistral-primary -> Grok-fallback -> terminal-OpenAI policy as every other tiered role
// (PC/LI bible, pairBond, rplot, scaffold, rplotAudit, antagonistBodyBible), replacing its former
// bespoke Grok-primary -> Mistral-fallback-only chain (the reverse order, no terminal tier). The
// delimiter parser (_parseBatchFatePreview) and 5-card contract are UNCHANGED — only which
// provider serves the request, in which order, changes (via _callTieredProvider's new, additive,
// backward-compatible `validateContent` hook).
//
// Drives the REAL window.StoryboundOrchestration.generateIntimateFatePreviewsBatch() and REAL
// window._callTieredProvider directly (same "direct call to the real backend function under
// test" pattern this repo's own proofs already use — bypasses only the unrelated UI click chain
// needed to REACH this function via the OAS, not the mechanism under test). Every /api/** route
// is intercepted and stubbed locally; nothing ever reaches a real provider.
//
// usage: node _fate_preview_batch_provider_policy_control.mjs   (dev server on :3000)
import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 700) : '')); };
const section = (t) => console.log('\n=== ' + t + ' ===');

const VALID_BATCH_TEXT = [
  'TEMPTATION ||| amplify ||| I close the distance between us ||| Don\'t make me wait.',
  'SILENCE ||| redirect ||| I let the look between us land ||| (no words)',
  'REVERSAL ||| amplify ||| I take her hand and hold it still ||| Stay there.',
  'BOUNDARY ||| ruin ||| I step back from the mark ||| Not yet.',
  'CONFESSION ||| amplify ||| I say the part I have not said ||| I haven\'t stopped thinking about this.',
].join('\n');

async function runScenario(label, { failMistral = false, failGrok = false, failOpenAI = false, mistralUnparsable = false } = {}) {
  section('SCENARIO: ' + label);
  const tierLog = [];
  const requestOrder = [];
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await installSession(page);
  await page.route('**/sb-test.localhost/**', route => {
    const accept = route.request().headers()['accept'] || '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: /vnd\.pgrst\.object\+json/.test(accept) ? 'null' : '[]' });
  });
  await installEntitledProfileStub(page, { log: () => {} });

  await page.route('**/api/**', async route => {
    const req = route.request(); const url = req.url(); const p = new URL(url).pathname;
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });

    if (/\/api\/mistral-proxy\b/.test(p)) {
      requestOrder.push('mistral');
      if (failMistral) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_mistral_failure' }) });
      if (mistralUnparsable) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'this is not a delimited card reply at all' } }] }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: VALID_BATCH_TEXT } }], usage: { prompt_tokens: 10, completion_tokens: 10 } }) });
    }
    if (/\/api\/proxy\b/.test(p) && !/\/api\/(chatgpt|mistral|deepseek)-proxy\b/.test(p)) {
      requestOrder.push('grok');
      if (failGrok) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_grok_failure' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: VALID_BATCH_TEXT } }], usage: { prompt_tokens: 10, completion_tokens: 10 } }) });
    }
    if (/\/api\/chatgpt-proxy\b/.test(p)) {
      requestOrder.push('openai');
      if (failOpenAI) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_openai_failure' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: VALID_BATCH_TEXT, usage: { prompt_tokens: 10, completion_tokens: 10 } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 60000 && !up) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await page.waitForFunction(() => window.StoryboundOrchestration && typeof window.StoryboundOrchestration.generateIntimateFatePreviewsBatch === 'function' && typeof window._callTieredProvider === 'function', null, { timeout: 30000 });
      up = true;
    } catch (_) { await page.waitForTimeout(2000); }
  }
  if (!up) { ok(label + ': server ready + functions present', false); await browser.close(); return null; }

  // Minimal, direct call — real function, real state object, no UI click chain (unrelated to the
  // provider-policy mechanism under test).
  await page.evaluate(() => { window.state = window.state || {}; window.state.storyId = 'fate-preview-policy-test-' + Date.now(); window._providerTierLog = []; });
  const result = await page.evaluate(async () => {
    try {
      const cards = await window.StoryboundOrchestration.generateIntimateFatePreviewsBatch();
      return { ok: true, cards, tierLog: (window._providerTierLog || []).filter(r => r.role === 'fatePreviews') };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e), tierLog: (window._providerTierLog || []).filter(r => r.role === 'fatePreviews') };
    }
  });
  await browser.close();
  return { result, requestOrder };
}

// ══════════════════════════════════════════════════════════════════════════════════
{
  const { result, requestOrder } = await runScenario('1-mistral-success (normal case)', {});
  ok('1: exactly ONE physical request, hits Mistral (primary tier)', requestOrder.length === 1 && requestOrder[0] === 'mistral', JSON.stringify(requestOrder));
  ok('1: real 5-card result returned, all 5 archetypes present', result.ok && result.cards && ['temptation','silence','reversal','boundary','confession'].every(k => !!result.cards[k]), JSON.stringify(result.cards));
  ok('1: _providerTierLog shows attempt#1=mistral/primary, no fallback', result.tierLog.length === 1 && result.tierLog[0].tier === 'primary' && result.tierLog[0].provider === 'mistral', JSON.stringify(result.tierLog));
}

// ══════════════════════════════════════════════════════════════════════════════════
{
  const { result, requestOrder } = await runScenario('2-mistral-fail-then-grok-success', { failMistral: true });
  ok('2: exactly 2 physical requests — mistral (fails) then grok (fallback)', requestOrder.length === 2 && requestOrder[0] === 'mistral' && requestOrder[1] === 'grok', JSON.stringify(requestOrder));
  ok('2: real 5-card result returned via the grok fallback', result.ok && result.cards && Object.keys(result.cards).length === 5, JSON.stringify(result.cards));
  ok('2: _providerTierLog shows attempt#1=mistral/primary (failed) then attempt#2=grok/fallback with a real fallbackReason',
    result.tierLog.length === 2 && result.tierLog[1].tier === 'fallback' && result.tierLog[1].provider === 'grok' && !!result.tierLog[1].fallbackReason,
    JSON.stringify(result.tierLog));
}

// ══════════════════════════════════════════════════════════════════════════════════
{
  const { result, requestOrder } = await runScenario('3-mistral-unparsable-then-grok-success (validateContent proof)', { mistralUnparsable: true });
  ok('3: Mistral returned real HTTP content but UNPARSABLE — still advances to Grok (not just empty-content triggers fallback)',
    requestOrder.length === 2 && requestOrder[0] === 'mistral' && requestOrder[1] === 'grok', JSON.stringify(requestOrder));
  ok('3: real 5-card result returned via grok after the unparsable mistral reply', result.ok && result.cards && Object.keys(result.cards).length === 5, JSON.stringify(result.cards));
}

// ══════════════════════════════════════════════════════════════════════════════════
{
  const { result, requestOrder } = await runScenario('4-mistral-and-grok-fail-then-openai-terminal-success', { failMistral: true, failGrok: true });
  ok('4: exactly 3 physical requests — mistral, grok, openai (terminal), in order', requestOrder.length === 3 && requestOrder.join(',') === 'mistral,grok,openai', JSON.stringify(requestOrder));
  ok('4: real 5-card result returned via the terminal OpenAI tier', result.ok && result.cards && Object.keys(result.cards).length === 5, JSON.stringify(result.cards));
  ok('4: _providerTierLog shows all 3 tiers in order, each with a real fallbackReason from the prior failure',
    result.tierLog.length === 3 && result.tierLog[2].tier === 'terminal' && result.tierLog[2].provider === 'openai' && !!result.tierLog[1].fallbackReason && !!result.tierLog[2].fallbackReason,
    JSON.stringify(result.tierLog));
}

// ══════════════════════════════════════════════════════════════════════════════════
{
  const { result, requestOrder } = await runScenario('5-all-three-fail (clean named failure, not a silent null)', { failMistral: true, failGrok: true, failOpenAI: true });
  ok('5: exactly 3 physical requests attempted (the declared ceiling), never more', requestOrder.length === 3, JSON.stringify(requestOrder));
  ok('5: generateIntimateFatePreviewsBatch returns null (its own established contract) — not a thrown exception the caller must catch', result.ok === true && result.cards === null, JSON.stringify(result));
  ok('5: _providerTierLog shows all 3 tiers attempted and failed', result.tierLog.length === 3, JSON.stringify(result.tierLog));
}

console.log('\n' + '='.repeat(70));
console.log(`FATE-PREVIEW BATCH PROVIDER POLICY CONTROL: ${results.filter(r=>r.pass).length}/${results.length} passed`);
if (!results.every(r => r.pass)) process.exitCode = 1;
