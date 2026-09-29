#!/usr/bin/env node
// FIRST SACRIFICE — ministral-8b-2512 as Mistral-fallback-tier compatibility check (Roman, 2026-09-16, fourth pass)
//
// Roman: do not shrink the Mistral fallback's 8,000-token contract yet. Check instead whether
// ministral-8b-2512 (much wider governor headroom than mistral-small-latest) can serve as the
// Mistral fallback at the SAME 8,000-token ceiling. Four conditions, all real, none assumed:
//   1. allowed by the real proxy (api/mistral-proxy.js allowlist)
//   2. has a real configured governor limit (api/_mistral-governor.js MODEL_LIMITS)
//   3. accepts the adapter's EXACT prompt at the full 8,000-token ceiling (real governor.admit())
//   4. has a current sourced pricing entry
// If all 4 hold, this reports Grok -> ministral-8b-2512 -> OpenAI as the corrected chain. If any
// fails, this reports the exact failure and stops there — no unilateral fallback-shrinking.
//
// Dry only — no fetch, no provider call, no packet/adapter write (this script only READS the
// adapter and packet; the packet is updated separately, after this result is reviewed).
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

const MODEL = 'ministral-8b-2512';
const results = {};
let allPass = true;
function check(label, cond, detail) {
  results[label] = { pass: !!cond, detail };
  if (!cond) allPass = false;
  console.log((cond ? '✓' : '✗') + ' ' + label + (detail ? ' — ' + detail : ''));
}

console.log('Checking ' + MODEL + ' as the Mistral-fallback tier, same 8,000-token ceiling as the current Grok/OpenAI tiers.\n');

// ── 1. Allowed by the real proxy ────────────────────────────────────────────────────────────
const proxySrc = fs.readFileSync(path.join(__dirname, 'api/mistral-proxy.js'), 'utf8');
const allowlistMatch = proxySrc.match(/const ALLOWED_MISTRAL_MODELS = \[([\s\S]*?)\];/);
const allowlistText = allowlistMatch ? allowlistMatch[1] : '';
const proxyAllows = new RegExp("'" + MODEL + "'").test(allowlistText);
check('1. allowed by the real proxy (api/mistral-proxy.js ALLOWED_MISTRAL_MODELS)', proxyAllows,
  proxyAllows ? 'present in the allowlist' : 'NOT in ALLOWED_MISTRAL_MODELS — every request naming it would be rejected at the proxy before reaching the governor');

// ── 2. Real configured governor limit ───────────────────────────────────────────────────────
const limits = MODEL_LIMITS[MODEL];
const hasRealLimit = !!(limits && limits.tpm > 0 && limits.rps > 0 && limits.source && limits.readOn);
check('2. has a real configured governor limit (api/_mistral-governor.js MODEL_LIMITS)', hasRealLimit,
  hasRealLimit ? JSON.stringify(limits) : 'missing or incomplete MODEL_LIMITS entry');

// ── 3. Accepts the adapter's EXACT prompt at the full 8,000-token ceiling ──────────────────
const chain = buildAuthoringFallbackChain(PACKET, buildFixedInputView());
const grokTier = chain[0]; // system+user prompt is IDENTICAL across all 3 tiers in the adapter
const g = createGovernor(memoryStore(), { now: () => Date.now() });
const admit = await g.admit({ model: MODEL, messages: grokTier.messages, maxTokens: 8000, opId: 'fs-adapter-ministral8b-fallback-compat' });
const admitted = admit.outcome === 'admitted';
check('3. accepts the adapter\'s exact prompt at the full 8,000-token ceiling (real governor.admit())', admitted,
  JSON.stringify(admit));

// ── 4. Current sourced pricing entry ────────────────────────────────────────────────────────
// Check this codebase's OWN TEXT_PRICING table first (disclosed gap if absent, not papered over).
const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
const inCodebasePricing = new RegExp("'" + MODEL + "':\\s*\\{\\s*in:").test(appSrc);
console.log('  (codebase TEXT_PRICING table has an entry for ' + MODEL + ': ' + inCodebasePricing + ' — this is a SEPARATE, disclosed gap; the codebase never priced this model even though it is proxy-allowed and governor-configured)');
// Externally sourced pricing, as supplied by Roman: Mistral's own model docs.
const EXTERNAL_PRICING = {
  in: 0.00000015, out: 0.00000015, // $0.15/MTok in, $0.15/MTok out
  sourceUrl: 'https://docs.mistral.ai/models/ministral-3-8b-25-12',
  sourceNote: 'Roman-supplied citation (2026-09-16): Mistral\'s own model docs — 256k context window, $0.15/M input AND output. Distinct from mistral-small-latest ($0.15 in / $0.60 out) — ministral-8b-2512 is cheaper on output.',
};
check('4. has a current sourced pricing entry', true,
  'NOT present in this codebase\'s own TEXT_PRICING table (disclosed gap) — but a current, dated external source was supplied: ' + EXTERNAL_PRICING.sourceUrl + ' ($' + (EXTERNAL_PRICING.in * 1e6).toFixed(2) + '/MTok in, $' + (EXTERNAL_PRICING.out * 1e6).toFixed(2) + '/MTok out)');

console.log('\n' + '='.repeat(70));
console.log(allPass ? 'ALL 4 CONDITIONS HOLD — ministral-8b-2512 is admissible as the Mistral-fallback tier at the full 8,000-token ceiling.'
  : 'NOT ALL CONDITIONS HOLD — do not adopt ministral-8b-2512 as specified; see the failing check(s) above.');

if (allPass) {
  const sysBytes = Buffer.byteLength(grokTier.messages[0].content, 'utf8');
  const usrBytes = Buffer.byteLength(grokTier.messages[1].content, 'utf8');
  const estInputTokens = Math.round((grokTier.messages[0].content.length + grokTier.messages[1].content.length) / 4);
  const inputCost = estInputTokens * EXTERNAL_PRICING.in;
  const outputCost = 8000 * EXTERNAL_PRICING.out;
  console.log('\nCorrected fallback tier (real numbers):');
  console.log('  model: ' + MODEL + ' | endpoint: /api/mistral-proxy | max_tokens: 8000 (UNCHANGED — no shrink) | temperature: 0.7 (unchanged from the mistral-small-latest spec)');
  console.log('  governor reservation: ' + admit.reserve + ' of ' + limits.tpm + ' TPM (' + Math.round(100 * admit.reserve / limits.tpm) + '% — real headroom, not a near-miss)');
  console.log('  max cost if this tier is the one that succeeds: $' + (inputCost + outputCost).toFixed(4) + ' (in $' + inputCost.toFixed(4) + ' + out $' + outputCost.toFixed(4) + ', externally sourced pricing)');
}
