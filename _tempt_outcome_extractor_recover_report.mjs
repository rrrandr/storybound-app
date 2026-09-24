// RECOVER THE EXTRACTOR-ONLY REPORT FROM A PRESERVED GATE LOG.
//
// The 2026-09-24 authorized run dispatched exactly once, got a 200, and the response was persisted
// to gate.jsonl before the runner hung on a bad waitForSettlement() argument (fixed). This rebuilds
// the report from that preserved evidence. It is OFFLINE — it reads files and dispatches nothing,
// so the authorized single call is not repeated.
//
// usage: node _tempt_outcome_extractor_recover_report.mjs <run-dir>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFixture, evaluateFindings, tierCost } from './_tempt_outcome_extractor_runner_core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_DIR = process.argv[2] || path.join(__dirname, '_tempt_fate_fixtures', 'extractor_only_2026-09-24_08-00-42');

const lines = fs.readFileSync(path.join(RUN_DIR, 'gate.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const dispatches = lines.filter((o) => o.kind === 'dispatch');
const responses = lines.filter((o) => o.kind === 'response');
const ctxFile = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'extraction_context.json'), 'utf8'));
const ctx = ctxFile.ctx;
const fx = readFixture();

const resp = responses[0] || {};
const body = resp.responseBody || {};
const content = body.content || (body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content) || '';
const usage = (body._orchestration && body._orchestration.usage) || null;
const model = (dispatches[0] && dispatches[0].requestBody && (dispatches[0].requestBody.model || dispatches[0].requestBody.preferredModel)) || null;

// Reproduce _extractTemptOutcome's own parse path EXACTLY — same order, same fallback regex.
let parsed = null, parseError = null;
try { parsed = JSON.parse(content); }
catch (e) {
  const m = String(content).match(/\{[\s\S]*\}/);
  if (!m) parseError = 'extractor reply was not JSON';
  else { try { parsed = JSON.parse(m[0]); } catch (e2) { parseError = e2.message; } }
}
if (parsed && parsed.temptFateOutcome) parsed = parsed.temptFateOutcome;

// Salvage-only: what the model APPEARS to have said, by closing the truncation. Never used for a
// commit — recorded so the content of a truncated reply can still be reviewed.
let salvaged = null, salvageNote = null;
if (!parsed) {
  let t = String(content).replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  for (let cut = t.length; cut > 0 && !salvaged; cut--) {
    if (t[cut - 1] !== ',' && t[cut - 1] !== '"' && t[cut - 1] !== '}' && t[cut - 1] !== ']') continue;
    for (const suffix of ['', '"}', '"}]}', '}]}', '}}', '}']) {
      try { salvaged = JSON.parse(t.slice(0, cut) + suffix); salvageNote = 'closed with "' + suffix + '" at ' + cut + '/' + t.length + ' chars'; break; } catch (_) {}
    }
  }
}

const report = {
  runId: path.basename(RUN_DIR),
  recoveredFrom: 'gate.jsonl (offline; no re-dispatch)',
  dispatches: dispatches.length,
  model, httpStatus: resp.status, elapsedMs: resp.elapsedMs, usage,
  realizedCostNote: 'reserved worst case for this tier: $' + (tierCost(model) || 0).toFixed(6),
  contentChars: content.length,
  markdownFenced: /^\s*```/.test(content),
  truncatedAtMaxTokens: !!(usage && usage.completion_tokens === 1400),
  parsedByProductionPath: !!parsed,
  parseError,
  salvaged, salvageNote,
  findings: parsed ? evaluateFindings(parsed, ctx.rosterNames) : (salvaged ? evaluateFindings(salvaged, ctx.rosterNames) : null),
  rosterNames: ctx.rosterNames,
  priorPaidRunCommitted: fx.priorCommitted
};
fs.writeFileSync(path.join(RUN_DIR, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(RUN_DIR, 'extractor_raw_response.txt'), content);
if (salvaged) fs.writeFileSync(path.join(RUN_DIR, 'extractor_salvaged_partial.json'), JSON.stringify(salvaged, null, 2));

console.log('RECOVERED REPORT — ' + report.runId);
console.log('  dispatches            : ' + report.dispatches + ' (' + model + ', HTTP ' + report.httpStatus + ', ' + Math.round(report.elapsedMs) + 'ms)');
console.log('  usage                 : ' + JSON.stringify(usage));
console.log('  content               : ' + report.contentChars + ' chars, markdown-fenced=' + report.markdownFenced);
console.log('  truncated at max_tokens: ' + report.truncatedAtMaxTokens);
console.log('  parsed by production  : ' + report.parsedByProductionPath + (parseError ? ('  (' + parseError + ')') : ''));
if (salvageNote) console.log('  salvage (review only) : ' + salvageNote);
if (report.findings) {
  console.log('\n  THE FIVE QUESTIONS (against salvaged content — NOT a commit):');
  Object.entries(report.findings).forEach(([k, v]) => console.log('    ' + k.padEnd(22) + ': ' + JSON.stringify(v)));
}
console.log('\n  written to ' + RUN_DIR);
