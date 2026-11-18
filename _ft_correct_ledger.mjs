// THE CORRECTED LEDGER FOR THE FAILED PROSE ATTEMPT (Roman 2026-11-18)
//
// The run reported
//     SETTLED from real usage : $0.013944  (9 calls)
//     ESTIMATED, no receipt   : $0.033979  (4 calls)
//     HELD, outcome unknown   : $0.013131  (2 calls)
//     committed against the allowance: $0.061054 of $0.060000
// and it is all phantom. No provider was contacted:
//
//   · the stub's own tally: "served: setup 8, planner 1, scaffold 6, forwarded 0" — nothing
//     was forwarded to the live API, so no model call left the machine.
//   · the editor's egress proof: 2 attempts, both "redirected_to_loopback", sent to
//     http://localhost:3994/v1/chat/completions instead of api.openai.com.
//
// WHY IT SETTLED ANYWAY, and this is the defect worth keeping: the stub served the paid run's
// response bodies VERBATIM, and those bodies carry their original `usage` blocks. The runner
// settles from receipts, so it priced receipts belonging to calls made days earlier and
// attributed them to calls that never happened. A replayed body that still carries a receipt
// will be settled as though it billed.
//
// The preserved SB_REUSE_* arms avoid this by answering BEFORE the reservation and recording
// $0 explicitly; the stub answered AFTER it, with a receipt attached.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
const RUN = ROOT + '_ft_scene2_prose/LATEST/';
const KEEP = ROOT + '_ft_preserved_prose_attempt/';
fs.mkdirSync(KEEP, { recursive: true });

// ── THE EVIDENCE, READ NOT ASSUMED ───────────────────────────────────────────────────────
const stub = fs.readFileSync(ROOT + '_ft_scene2_prose_stub.log', 'utf8');
const forwarded = (stub.match(/\[STUB\] forward #/g) || []).length;
const tally = (stub.match(/\[STUB\] served: [^\n]*/) || [''])[0];
let editorProof = null;
try { editorProof = JSON.parse(fs.readFileSync(RUN + 'EDITOR_OFFLINE_PROOF.json', 'utf8')); } catch (_) {}
const egress = (editorProof && editorProof.egress) || [];
const egressOffMachine = egress.filter((e) => !/loopback/i.test(String(e.outcome || ''))
  && !/localhost|127\.0\.0\.1/.test(String(e.sentTo || '')));

const log = fs.readFileSync(ROOT + '_ft_scene2_prose.log', 'utf8');
const grab = (rx) => { const m = log.match(rx); return m ? m[1] : null; };
const reported = {
  settled: grab(/SETTLED from real usage\s*:\s*\$([0-9.]+)/),
  estimated: grab(/ESTIMATED, no receipt\s*:\s*\$([0-9.]+)/),
  held: grab(/HELD, outcome unknown\s*:\s*\$([0-9.]+)/),
  committed: grab(/committed against the allowance: \$([0-9.]+)/),
};

console.log('WHAT THE RUN REPORTED');
Object.entries(reported).forEach(([k, v]) => console.log('  ' + k.padEnd(11) + '$' + v));
console.log('\nWHAT ACTUALLY LEFT THE MACHINE');
console.log('  stub tally        : ' + tally.replace('[STUB] ', ''));
console.log('  stub forwards      : ' + forwarded);
console.log('  editor egress      : ' + egress.length + ' attempt(s), '
  + egressOffMachine.length + ' of them off-machine');
egress.slice(0, 3).forEach((e) => console.log('      ' + String(e.requested).slice(0, 44)
  + ' → ' + String(e.sentTo).slice(0, 44) + '  [' + e.outcome + ']'));

const zero = forwarded === 0 && egressOffMachine.length === 0;
console.log('\nCORRECTED LEDGER FOR THIS ATTEMPT');
console.log('  provider spend     : ' + (zero ? '$0.000000' : 'NOT ZERO — see above'));
console.log('  what was bought    : nothing. No prose, no page, no editor verdict.');
console.log('  the reported figures were receipts REPLAYED from the paid run’s saved bodies and');
console.log('  attributed to calls that never left the machine.');
if (!zero) { console.error('\n  REFUSING to record $0: something went off-machine.'); process.exit(2); }

// ── PRESERVE THE ARTIFACTS ───────────────────────────────────────────────────────────────
const files = ['requests.json', 'REQUESTS.jsonl', 'console.log', 'RUN.log',
  'EDITOR_OFFLINE_PROOF.json', 'DELIVERY.json', 'RESUMABLE_STATE.json', 'MANUSCRIPT.txt'];
const kept = [];
files.forEach((f) => {
  try { fs.copyFileSync(RUN + f, KEEP + f); kept.push(f); } catch (_) {}
});
['_ft_scene2_prose.log', '_ft_scene2_prose_stub.log', '_ft_scene2_prose_console.txt']
  .forEach((f) => { try { fs.copyFileSync(ROOT + f, KEEP + f.replace(/^_/, '')); kept.push(f); } catch (_) {} });

const record = {
  attempt: 'Scene 2 prose and finalization, 2026-11-18, $0.06 cap',
  outcome: 'FAILED — the harness stub answered the prose author from disk; no prose was generated',
  providerSpendUsd: 0,
  reportedByTheRun: reported,
  whyTheReportWasWrong: 'the stub served the paid run’s response bodies verbatim, including their '
    + 'usage receipts; the runner settles from receipts, so it priced calls that never left the machine',
  evidence: { stubForwards: forwarded, stubTally: tally.trim(),
    editorEgressAttempts: egress.length, editorEgressOffMachine: egressOffMachine.length,
    editorEgressOutcomes: egress.map((e) => e.outcome) },
  rootCause: 'the stub indexed the paid replies BY ROLE, and PRIMARY_AUTHOR is the role of both '
    + 'planning legs and of the prose author, so the author call was answered with the 14,611-byte '
    + 'scaffold reply in 5ms',
  preserved: kept,
};
fs.writeFileSync(KEEP + 'CORRECTED_LEDGER.json', JSON.stringify(record, null, 2));
fs.writeFileSync(ROOT + '_FT_PROSE_ATTEMPT_LEDGER.json', JSON.stringify(record, null, 2));
console.log('\n  preserved ' + kept.length + ' artifact(s) → _ft_preserved_prose_attempt/');
console.log('  record: _FT_PROSE_ATTEMPT_LEDGER.json');
