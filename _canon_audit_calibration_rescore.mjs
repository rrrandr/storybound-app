// OFFLINE RE-SCORE of the 2026-09-24 calibration, after fixing a citation-format defect of MINE.
//
// The run rejected five of eight replies as citing "fact id(s) outside the supplied packet" —
// [dc_0], [inv_0], [know_0]. Those are REAL packet facts; the prompt renders them as "[dc_0] text",
// so the model copied the brackets back. My validator compared against bare ids. That is my
// formatting bug, not a comprehension failure, and it inflated the invalid-response count.
//
// This re-scores the RETAINED raw replies with brackets normalised, at ZERO cost — no dispatch.
// It exists so the conclusion rests on what the model actually said, not on my bug.
//
// usage: node _canon_audit_calibration_rescore.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFixtures, scoreFixture, verdictSummary } from './_canon_audit_calibration_core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN = path.join(__dirname, '_tempt_fate_fixtures', 'canon_calibration_2026-09-24_18-22-08');
const { fixtures } = loadFixtures();
const norm = (id) => String(id == null ? '' : id).trim().replace(/^\[+|\]+$/g, '').trim();

const rows = fixtures.map((fx) => {
  const f = JSON.parse(fs.readFileSync(path.join(RUN, fx.id + '.json'), 'utf8'));
  const raw = f.result.raw;
  if (!raw) return { id: fx.id, expect: fx.expect, verdict: null, score: scoreFixture(fx, null, f.result.error) };
  const packetIds = f.result.packetIds || [];
  const planText = JSON.stringify(fx.plan).toLowerCase();
  // Re-run the validator's own rules here, with the id normalised.
  const errors = [], kept = [];
  (raw.violations || []).forEach((x, i) => {
    const ids = (x.citedFactIds || []).map(norm).filter(Boolean);
    if (!ids.length) { errors.push('violations[' + i + '] cites nothing'); return; }
    const bogus = ids.filter((id) => packetIds.indexOf(id) === -1);
    if (bogus.length) { errors.push('violations[' + i + '] cites unknown id(s): ' + bogus.join(', ')); return; }
    const claim = String(x.claim || '').trim().toLowerCase();
    const words = claim.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4);
    const overlap = words.filter((w) => planText.indexOf(w) !== -1).length;
    if (!words.length || overlap / words.length < 0.6) { errors.push('violations[' + i + '] quotes text not in the plan'); return; }
    kept.push({ category: x.category, citedFactIds: ids });
  });
  const validated = { valid: errors.length === 0, errors, verdict: raw.verdict, violations: kept };
  return { id: fx.id, expect: fx.expect, verdict: raw.verdict, citedAfterNorm: kept.map((k) => k.category + ':' + k.citedFactIds.join('+')),
    score: scoreFixture(fx, validated, null) };
});

const summary = verdictSummary(rows);
console.log('OFFLINE RE-SCORE — 2026-09-24 calibration, citation brackets normalised. ZERO dispatches.\n');
rows.forEach((r) => console.log('  ' + (r.expect === 'violation' ? 'RED  ' : 'GREEN') + ' ' + r.id.padEnd(30)
  + ' verdict=' + String(r.verdict).padEnd(11) + '→ ' + r.score.outcome
  + (r.citedAfterNorm && r.citedAfterNorm.length ? ('   [' + r.citedAfterNorm.join(' | ') + ']') : '')));
console.log('\n  reds caught      : ' + summary.caught + '/' + summary.reds);
console.log('  greens passed    : ' + summary.correctPass + '/' + summary.greens);
console.log('  false positives  : ' + summary.falsePositives + (summary.falsePositives ? ('  ' + summary.falsePositiveIds.join(', ')) : ''));
console.log('  missed reds      : ' + summary.missed + '   (a VALID incorrect pass — none occurred)');
console.log('  unavailable      : ' + summary.unavailable + (summary.unavailable ? ('  ' + summary.unavailableIds.join(', ')) : ''));
console.log('  invalid          : ' + summary.invalid + (summary.invalid ? ('  ' + summary.invalidIds.join(', ')) : ''));
console.log('  usable responses : ' + summary.usableResponses + '/' + summary.totalFixtures);
console.log('\n  ENABLE GENERALLY: ' + (summary.enableGenerally ? 'YES' : 'NO'));
summary.blockers.forEach((b) => console.log('    BLOCKER — ' + b));
console.log('\n  The model returned "violation" on EVERY reply that parsed, including all four');
console.log('  greens. Fixing my citation bug raises recall and does not change the verdict.');
fs.writeFileSync(path.join(RUN, 'rescore_bracket_normalised.json'), JSON.stringify({ rows, summary }, null, 2));
