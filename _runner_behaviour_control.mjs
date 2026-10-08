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

// FIXTURE RUNS NOW USE AN ISOLATED LEDGER, so this suite manipulates that one and can never
// disturb the record of real authorization spend.
const BUDGET = '_fs_live_out/BUDGET.fixture.json';
const LOCK = '_fs_live_out/BUDGET.fixture.lock';
const REAL_BUDGET = '_fs_live_out/BUDGET.json';
const realBefore = fs.readFileSync(REAL_BUDGET, 'utf8');
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
  // The refusal wording changed with exclusive ('wx') acquisition; match the behaviour, not a
  // stale sentence.
  t('a present lock refuses a second runner',
    locked.code === 3 && /is held|REFUSING TO RUN/.test(locked.out),
    'exit ' + locked.code + ': ' + locked.out.split('\n').filter(l => /REFUS|held/.test(l)).join(' | ').slice(0, 120));
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
  // The isolated fixture ledger starts at zero, so a small ceiling is no longer breached by the
  // first tiny fixture call. Prior exposure is seeded here so the ceiling is genuinely already
  // exceeded — which is the condition being tested.
  fs.writeFileSync(BUDGET, JSON.stringify({ ...good, receipted: 0.9, unresolved: 0.2 }, null, 2));
  const r = run({ SB_FIXTURES: '_runner_fixtures/ok.json', SB_CEILING: '1.00' }, 180000);
  fs.writeFileSync(BUDGET, JSON.stringify(good, null, 2));
  t('a ceiling below prior exposure halts before any dispatch',
    /HALTED BEFORE DISPATCH/.test(r.out), 'no halt was reported');
  t('and the halt names the prior-run exposure', /prior runs \$/.test(r.out));
}

restore();

// ── REGRESSION: ONE EXCHANGE IDENTITY ────────────────────────────────────────────────────────
// The defect this guards: the runner recorded its dispatch under i + 2 and matched the rendered
// reply under i + 2, but wrote the CLEANUP VERDICT under i + 1. Production logged "no usable
// result — raw turn shipped" for the turn that shipped unedited, while the record for the turn
// being matched kept accepted:null — which the strict matcher rejects, by design. The symptom was
// turns 4-6 reporting "no parsed OAS response for THIS turn supplied the rendered reply" while
// turns 1-3, which had no cleanup, attributed fine. The matcher was never wrong; the turn identity
// was. Three divergent expressions at three call sites is the bug class, so that is what is
// asserted: ONE identity, used for dispatch, cleanup verdict, rendered-response matching and
// reporting.
{
  const src = fs.readFileSync('_fs_live_sequence.mjs', 'utf8');
  const callSites = [
    ["setPreviewContext (dispatch)", /setPreviewContext\('opening OAS', ([^)]+)\)/g],
    ["noteCleanupVerdict (verdict)", /noteCleanupVerdict\('opening OAS', ([^,]+),/g],
    ["oasReplyRenderedFor (matching)", /oasReplyRenderedFor\('opening OAS', ([^,]+),/g]
  ];
  const loopArgs = [];
  callSites.forEach(([label, rx]) => {
    const args = [...src.matchAll(rx)].map((m) => m[1].trim());
    // The entrance is its own literal turn 1; the LOOP call sites are the ones that must agree.
    const inLoop = args.filter((a) => a !== '1');
    t(label + ' uses exactly one in-loop identity',
      inLoop.length > 0 && new Set(inLoop).size === 1,
      label + ' in-loop arguments were ' + JSON.stringify(inLoop));
    inLoop.forEach((a) => loopArgs.push(a));
  });
  t('dispatch, cleanup verdict and rendered-response matching share ONE identity',
    loopArgs.length >= 3 && new Set(loopArgs).size === 1,
    'the loop call sites disagree: ' + JSON.stringify([...new Set(loopArgs)]));
  t('and that identity is a single named binding, not a repeated expression',
    /^[A-Za-z_$][\w$]*$/.test(loopArgs[0] || ''),
    'the shared identity is the expression ' + JSON.stringify(loopArgs[0]));
  t('THE CHECK BITES: a bare "i + 1"/"i + 2" at any of those sites is refused',
    !loopArgs.some((a) => /i\s*[+]\s*\d/.test(a)),
    'an arithmetic expression is still used at a call site: ' + JSON.stringify(loopArgs));
  // The identity must also be the one REPORTED, or a passing run can still name the wrong turn.
  t('the reported turn number uses that same identity',
    new RegExp("for turn ' \\+ " + (loopArgs[0] || '\\0')).test(src),
    'the report line does not use ' + JSON.stringify(loopArgs[0]));
}

// THE REAL LEDGER MUST BE UNTOUCHED BY A FIXTURE SUITE.
t('the real authorization ledger was not modified by these tests',
  fs.readFileSync(REAL_BUDGET, 'utf8') === realBefore,
  'a fixture run wrote to the real budget file');
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
