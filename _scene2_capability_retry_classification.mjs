// SCENE 2 CAPABILITY RETRY — CLASSIFICATION (Roman, 2026-09-20)
//
// Classifies the real retry sample (run_1789930729650.jsonl) against _detectSceneAdequacyFailure —
// dry, zero additional cost, per the authorization sheet's own gate. Reads the real, persisted
// response content verbatim (never hand-typed) and reports the structured verdict as capability
// evidence, not "approved prose."
//
// usage: node _scene2_capability_retry_classification.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789930729650.jsonl');
const events = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const authorResponse = events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.model === 'grok-4.3');
const rawContent = authorResponse.responseBody.choices[0].message.content;
const fencedMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const screenplay = JSON.parse(fencedMatch ? fencedMatch[1] : rawContent);
const usage = authorResponse.responseBody.usage;
const costUsd = usage.cost_in_usd_ticks * 1e-10;

console.log('✓ loaded the real retry sample verbatim from ' + LOG_PATH);
console.log('  model: ' + authorResponse.responseBody.model + ' (requested grok-4-1-fast-reasoning)');
console.log('  finish_reason: ' + authorResponse.responseBody.choices[0].finish_reason);
console.log('  usage: prompt_tokens=' + usage.prompt_tokens + ' completion_tokens=' + usage.completion_tokens + ' reasoning_tokens=' + (usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens));
console.log('  real cost (provider ticks): $' + costUsd.toFixed(6));
console.log('  beats: ' + screenplay.beats.length + ', kinds used: ' + [...new Set(screenplay.beats.map((b) => b.kind))].join(', '));

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectSceneAdequacyFailure === 'function', { timeout: 20000 });
  const result = await page.evaluate((s) => window._detectSceneAdequacyFailure(s, { starterId: 'starter_first_sacrifice' }), screenplay);
  await browser.close();

  console.log('\n=== _detectSceneAdequacyFailure verdict ===');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n' + '='.repeat(80));
  console.log('CLASSIFICATION: ' + (result.failed ? 'FAILED adequacy — capability evidence, not approved prose' : 'PASSED adequacy — capability evidence, not approved prose'));
})();
