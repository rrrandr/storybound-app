// THE ACTUAL RUNNER, EXERCISED. Provider-free, $0.
//
// These are not a model of the runner's logic — they RUN _fs_live_sequence.mjs with SB_FIXTURES
// set, so every budget rule, gate, deadline and sequencing decision under test is the same code
// a paid run uses. No provider traffic leaves the process.
import fs from 'fs';
import { execFileSync } from 'child_process';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const BUDGET = '_fs_live_out/BUDGET.json';
const LOCK = '_fs_live_out/BUDGET.lock';
const saveBudget = fs.existsSync(BUDGET) ? fs.readFileSync(BUDGET, 'utf8') : null;
const restore = () => { if (saveBudget) fs.writeFileSync(BUDGET, saveBudget);
  try { fs.unlinkSync(LOCK); } catch (_) {} };

const run = (env, timeoutMs = 240000) => {
  try {
    return { out: execFileSync('node', ['_fs_live_sequence.mjs'],
      { env: { ...process.env, ...env }, encoding: 'utf8', timeout: timeoutMs,
        stdio: ['ignore', 'pipe', 'pipe'] }), code: 0 };
  } catch (e) {
    return { out: (e.stdout || '') + (e.stderr || ''), code: e.status == null ? -1 : e.status };
  }
};

console.log('=== RUNNER BEHAVIOUR — the real implementation (provider-free, $0) ===\n');

console.log('1. THE BUDGET FAILS CLOSED');
{
  fs.renameSync(BUDGET, BUDGET + '.bak');
  const missing = run({ SB_FIXTURES: '_runner_fixtures/ok.json' }, 60000);
  fs.renameSync(BUDGET + '.bak', BUDGET);
  t('a MISSING ledger refuses the run', missing.code === 2 && /REFUSING TO RUN/.test(missing.out),
    'exit ' + missing.code);
  t('and says why rather than restarting exposure at zero',
    /cannot assume\s*\n?\s*zero prior exposure|zero prior exposure/.test(missing.out));

  const good = fs.readFileSync(BUDGET, 'utf8');
  fs.writeFileSync(BUDGET, '{ this is not json');
  const bad = run({ SB_FIXTURES: '_runner_fixtures/ok.json' }, 60000);
  fs.writeFileSync(BUDGET, good);
  t('a MALFORMED ledger refuses the run', bad.code === 2 && /malformed/.test(bad.out),
    'exit ' + bad.code);
}

console.log('\n2. CONCURRENT RUNNERS CANNOT SHARE THE AUTHORIZATION');
{
  fs.writeFileSync(LOCK, JSON.stringify({ pid: 999999, at: Date.now() }));
  const locked = run({ SB_FIXTURES: '_runner_fixtures/ok.json' }, 60000);
  try { fs.unlinkSync(LOCK); } catch (_) {}
  t('a present lock refuses a second runner', locked.code === 3 && /BUDGET.lock exists/.test(locked.out),
    'exit ' + locked.code);
}

console.log('\n3. OUTSTANDING RESERVATIONS SURVIVE INTERRUPTION');
{
  const good = JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
  const crashed = { ...good, outstanding: [{ n: 1, estimate: 0.25, model: 'grok-4.3', at: Date.now() }] };
  fs.writeFileSync(BUDGET, JSON.stringify(crashed, null, 2));
  const r = run({ SB_FIXTURES: '_runner_fixtures/ceiling.json', SB_CEILING: '3.00' }, 120000);
  fs.writeFileSync(BUDGET, JSON.stringify(good, null, 2));
  t('an unsettled reservation from a crash is carried as exposure',
    /never settled/.test(r.out) && /\$0\.250000 carried/.test(r.out),
    r.out.split('\n').filter(l => /settled|carried/.test(l)).join(' | ').slice(0, 160));
}

console.log('\n4. THE CEILING STOPS DISPATCH');
{
  const good = JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
  const r = run({ SB_FIXTURES: '_runner_fixtures/ok.json', SB_CEILING: '0.01' }, 180000);
  fs.writeFileSync(BUDGET, JSON.stringify(good, null, 2));
  t('a ceiling below prior exposure halts before any dispatch',
    /HALTED BEFORE DISPATCH/.test(r.out), 'no halt was reported');
  t('and the halt names the prior-run exposure', /prior runs \$/.test(r.out));
}

restore();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
