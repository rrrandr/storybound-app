// ── WHY THE REAL CAPTURED CITATIONS FAIL THE SHIPPED CHECKER ($0) ───────────────────────────
// Runs window._quoteIsInProse - the shipped checker, not a copy - against the ACTUAL evidence
// strings from wire/037_res.json and the ACTUAL prose the verifier judged. No substitutions.
import fs from 'fs';
import { chromium } from 'playwright-core';

const D = '_fs_live_out/run_2026-10-10T13-32-11-777Z';
const res = JSON.parse(fs.readFileSync(D + '/wire/037_res.json', 'utf8'));
let raw = String(res.choices[0].message.content || '');
raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
const v = JSON.parse(raw);
const fin = JSON.parse(fs.readFileSync(D + '/final.json', 'utf8'));
const PROSE = String(fin.texts[2].text);          // the scene whose ref is prop:3:3

const fields = {
  'per_proposal.evidence': v.per_proposal[0].evidence,
  'per_proposal.precondition_evidence': v.per_proposal[0].precondition_evidence,
  'slots.precondition_evidence': v.slots_check.precondition_evidence,
  'slots.actor_evidence': v.slots_check.actor_evidence,
  'slots.action_evidence': v.slots_check.action_evidence,
  'slots.target_evidence': v.slots_check.target_evidence,
  'slots.exit_state_evidence': v.slots_check.exit_state_evidence
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._quoteIsInProse === 'function', { timeout: 30000 });

const out = await page.evaluate((a) => {
  const rows = {};
  for (const k of Object.keys(a.fields)) {
    rows[k] = window._quoteIsInProse(a.fields[k], a.prose);
  }
  return rows;
}, { fields, prose: PROSE });

console.log('=== THE SHIPPED CHECKER ON THE ACTUAL CAPTURED CITATIONS ===\n');
for (const k of Object.keys(fields)) {
  const s = String(fields[k] || '');
  const hasLiteralEscape = /\\[nrt]/.test(s);
  console.log('  ' + (out[k] ? 'PASS' : 'FAIL') + '  ' + k.padEnd(36)
    + (hasLiteralEscape ? ' [contains LITERAL \\n escapes]' : ''));
}

// The hypothesis: the failures carry literal backslash-n two-character sequences, which the
// checker's \s+ collapse cannot touch because they are not whitespace.
const normalized = {};
for (const k of Object.keys(fields)) {
  normalized[k] = String(fields[k] || '').replace(/\\r\\n|\\n|\\r|\\t/g, ' ');
}
const out2 = await page.evaluate((a) => {
  const rows = {};
  for (const k of Object.keys(a.fields)) rows[k] = window._quoteIsInProse(a.fields[k], a.prose);
  return rows;
}, { fields: normalized, prose: PROSE });

console.log('\n=== THE SAME CITATIONS WITH LITERAL ESCAPE SEQUENCES TREATED AS WHITESPACE ===\n');
for (const k of Object.keys(fields)) {
  console.log('  ' + (out2[k] ? 'PASS' : 'FAIL') + '  ' + k);
}
const gained = Object.keys(fields).filter(k => !out[k] && out2[k]);
console.log('\nfields that verify only after normalization: '
  + (gained.length ? gained.join(', ') : 'none'));
console.log('fields still failing: '
  + (Object.keys(fields).filter(k => !out2[k]).join(', ') || 'none'));

await browser.close();
