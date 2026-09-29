#!/usr/bin/env node
// FIRST SACRIFICE — Grok→Ministral-8B→OpenAI authoring cost/call census (Roman, 2026-09-16, fourth pass)
//
// CORRECTION HISTORY (disclosed, not erased):
//   Pass 1: modeled as Mistral-primary structural call (WRONG — this is prose authoring).
//   Pass 2: modeled as the live CG-screenplay tentpole chain, Grok→DeepSeek→GPT-4o, copied
//           verbatim from public/app.js:227745-227749. Roman REJECTED this: DeepSeek is not an
//           approved provider in Storybound's policy, and this canonical one-time fixed-prose
//           authoring task has its OWN approved chain, distinct from the live tentpole route.
//   Pass 3: the APPROVED chain became GROK PRIMARY -> MISTRAL-SMALL FALLBACK (only after Grok
//           genuinely fails) -> OPENAI TERMINAL (only after both fail). A real governor check
//           found mistral-small-latest REFUSED at the required 8,000-token ceiling (reserve
//           20,120 > its 20,000 TPM allowance).
//   Pass 4 (this one): rather than shrink the 8,000-token contract, checked ministral-8b-2512 as
//           the fallback instead (625,000 TPM allowance). All 4 required conditions verified true
//           — see _first_sacrifice_ministral8b_fallback_compat_check.mjs. Chain is now GROK
//           PRIMARY -> MINISTRAL-8B FALLBACK -> OPENAI TERMINAL, 8,000-token ceiling UNCHANGED on
//           every tier. No DeepSeek anywhere.
//
// Dry only — no fetch, no provider call. This chain's Mistral tier IS subject to the real
// api/_mistral-governor.js check (Grok/OpenAI have no local governor in this codebase); that
// check is run below, not skipped, since Mistral is reached on a genuine Grok failure and its
// admissibility at the full ceiling is exactly what pass 3 found could NOT be assumed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createGovernor, MODEL_LIMITS } = require('./api/_mistral-governor.js');
const { memoryStore } = require('./api/_mistral-governor-store.js');
const { buildFixedInputView, buildAuthoringFallbackChain } = await import('./_first_sacrifice_authoring_adapter.mjs');
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));

const chain = buildAuthoringFallbackChain(PACKET, buildFixedInputView());
const sys = chain[0].messages[0].content;
const usr = chain[0].messages[1].content;
const sysChars = sys.length, usrChars = usr.length, totalChars = sysChars + usrChars;
// This codebase's own established estimation convention (app.js:227666, [CG:PROMPT-SIZES]):
// "Token est = chars/4" — reused here verbatim, not a newly invented heuristic. Identical prompt
// text is sent to all 3 tiers (same messages array), so this one estimate applies to every tier.
const estInputTokens = Math.round(totalChars / 4);

// ── Real published per-token list prices, WITH their exact in-codebase citation (date + source),
// copied verbatim from app.js TEXT_PRICING — not re-derived, not rounded further. Where the
// in-code comment does not carry an explicit URL, that gap is disclosed rather than papered over
// with a fabricated link. ──
const PRICING_SOURCES = {
  'grok-4.3': {
    in: 0.00000125, out: 0.0000025,
    citedAt: 'public/app.js:4779 (TEXT_PRICING)',
    sourceNote: 'Codebase comment: "xAI\'s published grok-4.3 cached:input ratio" (app.js:4772) + 2026-08-16 verification that api/proxy.js:_resolveGrokModel bills every grok-* alias at the grok-4.3 rate. Confirmed consistent with the official source Roman supplied (2026-09-16): https://docs.x.ai/developers/migration/may-15-retirement',
  },
  'ministral-8b-2512': {
    in: 0.00000015, out: 0.00000015,
    citedAt: 'NOT in this codebase\'s own TEXT_PRICING table (disclosed gap — see the ministral-8b fallback compat check)',
    sourceNote: 'Externally sourced (Roman, 2026-09-16): Mistral\'s own model docs, https://docs.mistral.ai/models/ministral-3-8b-25-12 — 256k context window, $0.15/MTok input AND output (cheaper on output than mistral-small-latest\'s $0.15/$0.60).',
  },
  'gpt-4o': {
    in: 0.0000025, out: 0.00001,
    citedAt: 'public/app.js:4765 (TEXT_PRICING)',
    sourceNote: 'Codebase comment: "calibrated to ACTUAL models in use as of 2026-05" (app.js:4749). Confirmed consistent with the official source Roman supplied (2026-09-16): https://developers.openai.com/api/docs/models/gpt-4o',
  },
};

function costRow(tier) {
  const modelKey = tier.billedModel || tier.model;
  const p = PRICING_SOURCES[modelKey];
  const inputCost = estInputTokens * p.in;
  const outputCost = tier.max_tokens * p.out; // WORST-CASE: full max_tokens consumed; a real completion is typically well under this ceiling
  return {
    tier: tier.tier, provider: tier.name, model: modelKey,
    inputTokenReservation: estInputTokens, outputTokenReservation: tier.max_tokens,
    estInputCostUSD: +inputCost.toFixed(4), maxOutputCostUSD: +outputCost.toFixed(4),
    maxTierCostUSD: +(inputCost + outputCost).toFixed(4),
    pricingCitedAt: p.citedAt,
  };
}

const rows = chain.map(costRow);

console.log('APPROVED CHAIN (Roman, third pass): Grok primary -> Mistral fallback (only after Grok fails) -> OpenAI terminal (only after both fail). No DeepSeek.');
console.log('\nReal constructed prompt (identical across all 3 tiers): system=' + sysChars + ' chars, user=' + usrChars + ' chars, total=' + totalChars + ' chars');
console.log('Input token reservation (chars/4 convention, app.js:227666): ~' + estInputTokens + ' tokens');
console.log('\n-- MODEL IDENTIFIERS, RESERVATIONS, AND PRICING SOURCES --');
chain.forEach((t, i) => {
  const p = PRICING_SOURCES[t.billedModel || t.model];
  console.log('\nTier ' + (i + 1) + ' (' + t.tier + '): ' + t.name);
  console.log('  exact model identifier: ' + (t.billedModel || t.model) + (t.preferredModel ? ' (requested as "' + t.preferredModel + '", resolved server-side — api/proxy.js:_resolveGrokModel)' : ''));
  console.log('  endpoint: ' + (t.endpoint || 'callChatGPT (Anthropic/OpenAI proxy dispatch)'));
  console.log('  max INPUT token reservation: ~' + estInputTokens + ' (est., chars/4)');
  console.log('  max OUTPUT token reservation: ' + t.max_tokens);
  console.log('  temperature: ' + t.temperature + ' | timeoutMs: ' + t.timeoutMs);
  console.log('  pricing: $' + (p.in * 1e6).toFixed(2) + '/MTok in, $' + (p.out * 1e6).toFixed(2) + '/MTok out — cited at ' + p.citedAt);
  console.log('  pricing source note: ' + p.sourceNote);
});

console.log('\n-- PER-TIER MAX COST IF THAT TIER IS THE ONE THAT SUCCEEDS (worst case — full max_tokens billed) --');
console.table(rows);

const expectedCase = rows[0]; // Grok succeeds on the first attempt — the real code's normal case
console.log('\nEXPECTED-GROK-SUCCESS CEILING (tier 1 only, 1 physical call): max $' + expectedCase.maxTierCostUSD + ' (likely lower — max_tokens is a ceiling, not the real completion length)');

const worstCase = rows.reduce((sum, r) => sum + r.maxTierCostUSD, 0);
console.log('THREE-TIER EXHAUSTION CEILING (Grok fails, Mistral fails, GPT-4o succeeds — 3 physical calls): max $' + worstCase.toFixed(4));
console.log('  Caveat, disclosed not hidden: a FAILING call may still incur partial/zero cost depending on the specific failure mode (a timeout after the model already generated output vs. an immediate HTTP error) — this ceiling assumes each failed tier bills its full estimated input + a full max_tokens output, which is deliberately the PESSIMISTIC bound, not a measured number (no such measurement is possible without an actual failing call).');

console.log('\n-- REAL GOVERNOR CHECK ON THE MISTRAL FALLBACK TIER (ministral-8b-2512 — the only tier a local governor exists for) --');
const mistralTier = chain[1];
const mistralLimits = MODEL_LIMITS[mistralTier.billedModel];
const g = createGovernor(memoryStore(), { now: () => Date.now() });
const mistralAdmit = await g.admit({ model: mistralTier.billedModel, messages: mistralTier.messages, maxTokens: mistralTier.max_tokens, opId: 'fs-adapter-mistral-fallback-census' });
console.log('model=' + mistralTier.billedModel + ' | real MODEL_LIMITS=' + JSON.stringify(mistralLimits));
console.log('admit({ maxTokens: ' + mistralTier.max_tokens + ' }) = ' + JSON.stringify(mistralAdmit));
if (mistralAdmit.outcome === 'admitted') {
  console.log('✓ Mistral fallback tier (ministral-8b-2512) is ADMITTED at the full, UNCHANGED 8,000-token ceiling — ' + mistralAdmit.reserve + ' of ' + mistralLimits.tpm + ' TPM (' + Math.round(100 * mistralAdmit.reserve / mistralLimits.tpm) + '%, real headroom, not a near-miss). This replaces mistral-small-latest, which was refused at this same ceiling (reserve 20,120 > its 20,000 TPM) — see the superseded record in the packet; the 8,000-token contract was NOT shrunk.');
} else {
  console.log('⚠ ' + mistralTier.billedModel + ' at max_tokens=' + mistralTier.max_tokens + ' would be REFUSED by the real governor — ' + JSON.stringify(mistralAdmit) + '. Unexpected: this model was verified admissible in _first_sacrifice_ministral8b_fallback_compat_check.mjs; re-check for drift before proceeding.');
}

console.log('\n-- POLICY NOTES --');
console.log('DeepSeek is EXCLUDED from this chain by Roman\'s explicit instruction — not an approved Storybound provider for this task, even though it appears in the live CG-tentpole route elsewhere in the app.');
console.log('Mistral (ministral-8b-2512) is reached ONLY after a genuine Grok failure (empty response, thrown error, or timeout) — not tried in parallel, not tried speculatively.');
console.log('Maximum physical calls: 3. Sequential, one attempt per tier, no per-tier retry (traced from public/app.js:227929, the same for-loop structure that governs the live route, applied here to this 3-tier approved list instead).');
console.log('No literary fallback — per Roman\'s standing instruction, this one-time authoring pass simply fails and is reported as failed if all 3 approved tiers are exhausted.');
