// PAID-RUN WRAPPER — full log on disk, REAL exit status preserved. Spends nothing itself.
//
// WHY THIS EXISTS. Paid runs were being invoked as `node runner.mjs --authorize "..." | tail -60`.
// A pipe makes the shell report TAIL's status, not node's, and it truncates the run while it is
// happening. That hid a real failure twice: once it produced a confident "exit 0" for a harness that
// had actually exited non-zero, and once it clipped a paid Safe Mode run so the diagnosis had to be
// reconstructed from artifacts afterwards. Money was spent behind a status that was not real.
//
// This wrapper tees the child's output to a timestamped log under the repo, prints a tail for reading,
// and then EXITS WITH THE CHILD'S OWN CODE, so `$?` is the truth. Never pipe this either — it has
// nothing to hide and a pipe would defeat the point again.
//
//   node _paid_run.mjs <script.mjs> [args...]
//   node _paid_run.mjs _saydo_safemode_ab_run.mjs --authorize "<phrase>"

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('usage: node _paid_run.mjs <script.mjs> [args...]');
  process.exit(2);
}
const target = argv[0];
const targetPath = path.isAbsolute(target) ? target : path.join(__dirname, target);
if (!fs.existsSync(targetPath)) {
  console.error('PAID-RUN: no such script: ' + targetPath);
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_DIR = path.join(__dirname, '_paid_run_logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const logPath = path.join(LOG_DIR, path.basename(target, '.mjs') + '_' + stamp + '.log');
const log = fs.createWriteStream(logPath, { flags: 'a' });

// The authorization phrase is echoed to the log deliberately — a paid run must be auditable — but
// nothing here reads or forwards any API key.
log.write('# ' + new Date().toISOString() + '\n# node ' + target + ' ' + argv.slice(1).join(' ') + '\n\n');
console.log('PAID-RUN: ' + target + '  →  ' + logPath + '\n');

const child = spawn(process.execPath, [targetPath, ...argv.slice(1)], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
const tee = (stream) => { stream.on('data', (d) => { log.write(d); process.stdout.write(d); }); };
tee(child.stdout); tee(child.stderr);

child.on('close', (code, signal) => {
  const real = (code === null) ? ('signal ' + signal) : code;
  const footer = '\n# EXIT: ' + real + '\n';
  log.write(footer); log.end();
  console.log('\n' + '='.repeat(86));
  console.log('  PAID-RUN COMPLETE — full log: ' + logPath);
  console.log('  REAL EXIT STATUS: ' + real + (code === 0 ? '  (success)' : '  (FAILURE — do not report this run as clean)'));
  // Propagate the child's status so nothing downstream can mistake a failure for a pass.
  if (code === null) process.exit(1);
  process.exit(code);
});
