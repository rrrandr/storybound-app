// Price a SAVED {url, body} capture with the production cost guard. Provider-free, $0.
// Nothing is dispatched: this exists so a request already on disk can be priced without a boot
// and without a paid probe.
// Usage: SB_PRICE_FILE=<capture.json> node _price_saved_request.mjs
import fs from 'fs';
import { estimateUsd } from './_fsc_cost_guard.mjs';

const F = process.env.SB_PRICE_FILE;
if (!F) { console.error('set SB_PRICE_FILE'); process.exit(2); }
const cap = JSON.parse(fs.readFileSync(F, 'utf8'));
const body = cap.body || cap;
const url = cap.url || process.env.SB_PRICE_URL || '';

const chars = (body.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
const e = estimateUsd(body, body.preferredModel || body.model, url);

console.log('=== PRICING A SAVED REQUEST (provider-free, $0) ===');
console.log('file     : ' + F);
console.log('endpoint : ' + (url || '(none recorded)'));
console.log('messages : ' + (body.messages || []).length + '  chars ' + chars);
console.log('max_tokens=' + body.max_tokens + ' temperature=' + body.temperature
  + ' model=' + (body.preferredModel || body.model || '(unspecified)'));
if (!e || !e.bounded) {
  console.log('\nUNPRICEABLE — ' + ((e && e.refuseReason) || 'no estimate returned'));
  console.log('A dispatch that cannot be bounded is refused, not sent.');
  process.exit(1);
}
console.log('\npriced as ' + e.model + '  (' + e.resolvedBy + ')');
console.log('  promptTokens  ~' + e.promptTokens + '   ESTIMATE at chars/'
  + e.assumptions.CHARS_PER_TOKEN + ' — an approximation, not a tokenizer');
console.log('  reserved out  ~' + e.outTokens + '   (max_tokens x '
  + e.assumptions.REASONING_MULT + ', reasoning is not bounded by max_tokens)');
console.log('  raw           $' + e.raw.toFixed(6));
console.log('  RESERVATION   $' + e.estimate.toFixed(6) + '   (x '
  + e.assumptions.SAFETY_MARGIN + ' safety margin)');
console.log('\nThis is the RESERVATION the guard would hold before dispatch, not a measured cost.');
