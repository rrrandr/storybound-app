// THE ACTUAL COMMAND SEQUENCE: preflight in its own process, then execution in a fresh one.
//
// WHY A DRIVER AND NOT A FLAG. The previous paid attempt ran preflight and execution in ONE process
// and the transition broke it: $0.17 of preflight reservations leaked into the execution ledger, and
// the scene preflight had just got accepted fired an image request during execution. Resetting a
// couple of variables is not a process boundary. Pending requests, timers, browser context and
// scenario state all have to go.
//
// Preflight must exit 0 or execution never starts. Execution runs the SAME implementation the paid run
// uses; --stub substitutes only the provider responses.
//
//   node _saydo_gibberish_run_sequence.mjs --stub                      → full proof, no spend
//   node _saydo_gibberish_run_sequence.mjs --authorize "<phrase>"      → paid, one scene

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(__dirname, '_saydo_gibberish_live_run.mjs');
const argv = process.argv.slice(2);
const STUB = argv.indexOf('--stub') !== -1;
const ai = argv.indexOf('--authorize');
const authArgs = ai !== -1 ? ['--authorize', String(argv[ai + 1] || '')] : [];

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_DIR = path.join(__dirname, '_saydo_gibberish_sequence_logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

function runPhase(label, args) {
  return new Promise((resolve) => {
    const logPath = path.join(LOG_DIR, label + '_' + stamp + '.log');
    const log = fs.createWriteStream(logPath, { flags: 'a' });
    console.log('\n──── ' + label.toUpperCase() + ' (own process) → ' + logPath);
    const child = spawn(process.execPath, [RUNNER, ...args], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
    const tee = (st) => st.on('data', (d) => { log.write(d); process.stdout.write(d); });
    tee(child.stdout); tee(child.stderr);
    child.on('close', (code, signal) => {
      log.write('\n# EXIT: ' + (code === null ? 'signal ' + signal : code) + '\n'); log.end();
      resolve({ code: code === null ? 1 : code, logPath });
    });
  });
}

(async () => {
  console.log('=== GIBBERISH RUN SEQUENCE — ' + (STUB ? 'STUBBED PROOF' : 'PAID EXECUTION') + ' ===');

  const pre = await runPhase('preflight', ['--phase', 'preflight']);
  if (pre.code !== 0) {
    console.error('\n✗ PREFLIGHT FAILED (exit ' + pre.code + ') — EXECUTION NOT STARTED. Nothing dispatched.');
    process.exit(1);
  }
  console.log('\n✓ preflight exited 0 and shut its context down; starting execution in a FRESH process');

  const exec = await runPhase('execute', ['--phase', 'execute', ...(STUB ? ['--stub'] : []), ...authArgs]);

  console.log('\n' + '='.repeat(86));
  console.log('  SEQUENCE COMPLETE');
  console.log('    preflight: exit ' + pre.code + '  (' + pre.logPath + ')');
  console.log('    execute  : exit ' + exec.code + '  (' + exec.logPath + ')');
  console.log('  REAL EXIT STATUS: ' + exec.code + (exec.code === 0 ? '  (success)' : '  (FAILURE — do not report as clean)'));
  process.exit(exec.code);
})();
