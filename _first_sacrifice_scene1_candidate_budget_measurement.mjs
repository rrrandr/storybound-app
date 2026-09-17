#!/usr/bin/env node
// FIRST SACRIFICE — real prompt/completion budget measurement for the FULL-PACKAGE authoring
// contract (Roman, fourth redesign pass, 2026-09-17). Corrects the earlier OAS-only 2,500-token
// census, which no longer applies once the task includes a full ~20-beat candidate Scene 1.
//
// Real measurements only: real prompt byte size, real governor admit() against the Mistral
// fallback tier (the only tier with a local governor in this codebase), real per-token pricing
// already sourced this session. No provider call, no draft generation.
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
const sys = chain[0].messages[0].content, usr = chain[0].messages[1].content;
const sysBytes = Buffer.byteLength(sys, 'utf8'), usrBytes = Buffer.byteLength(usr, 'utf8');
const totalBytes = sysBytes + usrBytes;
const estInputTokens = Math.round((sys.length + usr.length) / 4);

console.log('Real constructed prompt: system=' + sysBytes + ' bytes, user=' + usrBytes + ' bytes, total=' + totalBytes + ' bytes (~' + estInputTokens + ' est. input tokens, chars/4 convention)');
console.log('max_tokens ceiling (identical across all 3 tiers): ' + chain[0].max_tokens);

// ── Real governor check on the Mistral fallback tier ──
const mistralTier = chain[1];
const g = createGovernor(memoryStore(), { now: () => Date.now() });
const admit = await g.admit({ model: mistralTier.billedModel, messages: mistralTier.messages, maxTokens: mistralTier.max_tokens, opId: 'fs-scene1-candidate-budget' });
const limits = MODEL_LIMITS[mistralTier.billedModel];
console.log('\n-- REAL GOVERNOR CHECK (ministral-8b-2512, the Mistral fallback tier) --');
console.log('MODEL_LIMITS: ' + JSON.stringify(limits));
console.log('admit({maxTokens:' + mistralTier.max_tokens + '}) = ' + JSON.stringify(admit));
if (admit.outcome === 'admitted') {
  console.log('✓ ADMITTED — reserve ' + admit.reserve + ' of ' + limits.tpm + ' TPM (' + Math.round(100 * admit.reserve / limits.tpm) + '%, real headroom).');
} else {
  console.log('⚠ REFUSED — ' + JSON.stringify(admit) + '. This would need to be resolved before authorizing the Mistral-fallback tier at this ceiling.');
}

// ── Real per-token pricing, as already sourced this session ──
const PRICING = {
  'grok-4.3': { in: 0.00000125, out: 0.0000025, cite: 'app.js:4779; consistent with https://docs.x.ai/developers/migration/may-15-retirement' },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015, cite: 'externally sourced: https://docs.mistral.ai/models/ministral-3-8b-25-12 (not yet in this codebase\'s own TEXT_PRICING table)' },
  'gpt-4o': { in: 0.0000025, out: 0.00001, cite: 'app.js:4765; consistent with https://developers.openai.com/api/docs/models/gpt-4o' },
};
console.log('\n-- COST CEILING PER TIER (worst case — full max_tokens billed; a real completion is typically well under this) --');
const rows = chain.map(t => {
  const model = t.billedModel || t.model;
  const p = PRICING[model];
  const inputCost = estInputTokens * p.in;
  const outputCost = t.max_tokens * p.out;
  return { tier: t.tier, provider: t.name, model, estInputTokens, maxOutputTokens: t.max_tokens, estInputCostUSD: +inputCost.toFixed(4), maxOutputCostUSD: +outputCost.toFixed(4), maxTierCostUSD: +(inputCost + outputCost).toFixed(4) };
});
console.table(rows);
const expected = rows[0].maxTierCostUSD;
const worst = rows.reduce((s, r) => s + r.maxTierCostUSD, 0);
console.log('\nEXPECTED-GROK-SUCCESS CEILING (1 call): max $' + expected.toFixed(4));
console.log('THREE-TIER-EXHAUSTION CEILING (3 calls): max $' + worst.toFixed(4));
console.log('\nNOTE: these remain CEILINGS (max_tokens-based), not measured completions — no provider call has been made for this full-package schema. The one real prior run (v2, OAS-only, 901 completion tokens for a MUCH smaller ask) is the only real completion-length data point available; a full ~1,400-word scene will use substantially more, but 6,000 tokens leaves wide margin even if the real completion runs 2-3x the earlier one.');
