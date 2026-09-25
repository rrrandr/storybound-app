// RETROSPECTIVE RE-SCORE — offline, ZERO dispatches, $0.
//
// WHAT THIS IS AND IS NOT. It re-runs the CORRECTED v3 scorer over responses that were already
// paid for and preserved. It answers exactly one question: "how much of each model's red score was
// my bookkeeping rather than its judgement?"
//
// IT DOES NOT measure behaviour under the corrected v3 PACKET or PROMPT. Those models never saw
// that wording. grok-4.3 and claude-haiku-4-5 were both shown v2's false claim that an ev_ fact
// records what "LEFT INTACT" and "is still true", and both cited ev_0 accordingly. Re-scoring
// cannot un-show them a misleading packet — a corrected score here is a corrected LEDGER ENTRY,
// not a new experiment. Every historical strict score stands unchanged in its own report.
//
// usage: node _canon_audit_retrospective_rescore.mjs

import { loadFixtures, scoreFixture } from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, '_tempt_fate_fixtures');
const RUNS = [
  { label: 'ministral-8b-2512',            arm: 'v1', dir: 'canon_calibration_2026-09-24_18-22-08', strict: '0 greens / 1 red' },
  { label: 'gpt-4o-mini',                  arm: 'v1', dir: 'canon_calibration_2026-09-24_18-43-29', strict: '0 greens / 3 reds' },
  { label: 'gpt-4o-mini',                  arm: 'v2', dir: 'canon_calibration_2026-09-25_01-47-32', strict: '1 green  / 2 reds' },
  { label: 'grok-4.3 reasoning',           arm: 'v2', dir: 'canon_calibration_2026-09-25_02-07-53', strict: '4 greens / 2 reds' },
  { label: 'claude-haiku-4-5 thinking',    arm: 'v2', dir: 'canon_calibration_2026-09-25_02-36-54', strict: '4 greens / 2 reds' }
];

const { fixtures } = loadFixtures();
const byId = {}; fixtures.forEach((f) => { byId[f.id] = f; });

console.log('=== RETROSPECTIVE RE-SCORE (offline, zero dispatches, $0) ===');
console.log('Corrected v3 SCORER applied to responses produced under the OLD packet/prompt.');
console.log('This is a bookkeeping correction, NOT a measurement of v3 behaviour.\n');

const out = [];
for (const run of RUNS) {
  const dir = path.join(FIX, run.dir);
  if (!fs.existsSync(dir)) { console.log('  (missing) ' + run.dir); continue; }
  let caught = 0, unsupported = 0, greens = 0, reds = 0, changed = [];
  for (const fx of fixtures) {
    const p = path.join(dir, fx.id + '.json');
    if (!fs.existsSync(p)) continue;
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    const oldOutcome = (d.score && d.score.outcome) || 'n/a';
    // The packet AS SENT is preserved in the prompt; parse the id/text pairs back out of it so the
    // assertion predicate judges exactly what that model was actually shown.
    const sys = (d.result && d.result.prompt && d.result.prompt.sys) || '';
    const facts = [];
    const rx = /\[([a-z]+)_(\d+)\] ([^\n]*)/g;
    let m; while ((m = rx.exec(sys))) facts.push({ id: m[1] + '_' + m[2], kind: m[1], text: m[3] });
    const score = scoreFixture(fx, (d.result && d.result.validated) || { valid: false, errors: ['no response'] },
      (d.result && d.result.error) || null, { facts });
    if (fx.expect === 'violation') { reds++; if (score.outcome === 'caught') caught++; if (score.outcome === 'unsupported_finding') unsupported++; }
    else { greens++; if (score.outcome === 'correct_pass') greens = greens; }
    if (score.outcome !== oldOutcome) changed.push(fx.id + ': ' + oldOutcome + ' -> ' + score.outcome);
  }
  const greenPass = fixtures.filter((f) => f.expect === 'pass').filter((f) => {
    const p = path.join(dir, f.id + '.json'); if (!fs.existsSync(p)) return false;
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    return d.result && d.result.validated && d.result.validated.verdict === 'pass';
  }).length;
  console.log('  ' + (run.label + ' [' + run.arm + ']').padEnd(34)
    + 'STRICT AS RUN: ' + run.strict.padEnd(20)
    + 'RETROSPECTIVE: ' + greenPass + ' greens / ' + caught + ' reds'
    + (unsupported ? ('  (' + unsupported + ' still unsupported)') : ''));
  changed.forEach((c) => console.log('        changed  ' + c));
  out.push({ ...run, retrospective: { greens: greenPass, redsCaught: caught, unsupported }, changed });
}

fs.writeFileSync(path.join(__dirname, '_canon_audit_retrospective_rescore.json'), JSON.stringify(out, null, 2));
console.log('\n  NOT A v3 RESULT. These models were shown v2\'s false "ev_ ... is still true" wording;');
console.log('  the corrected packet cannot be applied retroactively to a response already given.');
console.log('  Historical strict scores stand unchanged in their own reports.');
