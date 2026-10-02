// PREFLIGHT FOR THE FS PLANNER CAPTURE. Provider-free, $0.
//
// It SPAWNS the real capture runner and asserts on that runner's exit codes and its own manifest.
// The question is not "does the code look right" but "can this run possibly spend more than one
// planner call", and the answer has to come from the runner's behaviour, not from my reading of it.
import fs from 'fs';
import { spawnSync } from 'child_process';
import { R_PLANNER } from './_live_spend_ledger.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== FS PLANNER CAPTURE PREFLIGHT (provider-free, $0) ===\n');

const OUTDIR = '_fs_planner_capture_out';
const runDirs = () => fs.existsSync(OUTDIR)
  ? fs.readdirSync(OUTDIR).filter(d => /^run_/.test(d)).sort() : [];
const newest = () => { const d = runDirs(); return d.length ? OUTDIR + '/' + d[d.length - 1] : null; };
const run = (args) => {
  const r = spawnSync('node', ['_fs_planner_capture.mjs', ...args],
    { encoding: 'utf8', timeout: 900000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

// ── 1. NO AUTHORIZATION, NO DISPATCH ────────────────────────────────────────
console.log('1. it refuses to run at all without an explicit mode');
{
  const before = runDirs().length;
  const r = run([]);
  t('refuses with exit 2', r.code === 2, 'exit=' + r.code);
  t('says it would dispatch a real provider call', /would dispatch a real provider call/.test(r.out));
  t('names the three legitimate modes',
    /--dry-replay/.test(r.out) && /--estimate-only/.test(r.out) && /--authorize/.test(r.out));
  t('created no run directory', runDirs().length === before);
}

// ── 2. THE RESERVATION IS ONE PLANNER CALL AND NOTHING ELSE ─────────────────
console.log('\n2. the reservation is exactly one planner call');
{
  const r = run(['--estimate-only']);
  t('exits 0', r.code === 0, 'exit=' + r.code);
  const est = JSON.parse(fs.readFileSync(newest() + '/estimate.json', 'utf8'));
  t('the reserved figure IS the shared module\'s R_PLANNER',
    Math.abs(est.reserved - R_PLANNER) < 1e-12,
    'runner=' + est.reserved + ' module=' + R_PLANNER);
  t('it is $0.017550 to six places', est.reserved.toFixed(6) === '0.017550', est.reserved.toFixed(6));
  t('the author is explicitly NOT reserved',
    /author, verifier, memory, scaffold: ABORTED/.test(r.out));
  t('no browser was launched', !fs.existsSync(newest() + '/manifest.json'));
}

// ── 3. A CEILING BELOW THE RESERVATION IS REFUSED BEFORE DISPATCH ───────────
console.log('\n3. an insufficient ceiling is refused before anything launches');
{
  const r = run(['--authorize', '0.001']);
  t('exits 3', r.code === 3, 'exit=' + r.code);
  t('states both figures', /REFUSED BEFORE DISPATCH/.test(r.out)
    && /exceeds the authorized \$0\.00/.test(r.out));
  const ref = JSON.parse(fs.readFileSync(newest() + '/refusal.json', 'utf8'));
  t('records zero dispatches', ref.dispatched === 0);
  t('no planner request was even built', !fs.existsSync(newest() + '/planner_request.json'));
}

// ── 4. THE DRY RUN: THE BLOCKER, EXERCISED FOR REAL ─────────────────────────
// The dry run serves the KNOWN-WRONG fixture, which is what makes the app reject the reply and
// retry — so the blocker is tested by the app's real retry behaviour, not by a simulation of it.
console.log('\n4. the one-attempt blocker, exercised by the app\'s own retries');
console.log('   (launches a browser and drives the real FS path; about a minute)');
{
  const r = run(['--dry-replay']);
  const dir = newest();
  const m = JSON.parse(fs.readFileSync(dir + '/manifest.json', 'utf8'));
  t('exits 0 with no failed check', r.code === 0, 'exit=' + r.code + ' ' + JSON.stringify(m.checks));
  t('the manifest records DRY REPLAY and zero authorization',
    m.mode === 'dry_replay' && m.authorized === 0);
  t('the reservation in the manifest is one planner call',
    Math.abs(m.reserved - R_PLANNER) < 1e-12);

  // THE CENTRAL CLAIM.
  const answered = m.calls.filter(c => c.stage === 'planner'
    && /dispatched_live|replayed_known_wrong_fixture/.test(c.outcome));
  t('EXACTLY ONE planner request was answered', answered.length === 1,
    JSON.stringify(m.calls.filter(c => c.stage === 'planner').map(c => c.outcome)));
  t('the app DID attempt a retry — so the blocker was really tested',
    m.blockedRetries > 0, 'blockedRetries=' + m.blockedRetries);
  t('every retry was blocked, none answered',
    m.calls.filter(c => c.stage === 'planner' && c.outcome === 'blocked_second_attempt').length
      === m.blockedRetries && m.blockedRetries >= 1);
  t('no live dispatch happened in dry mode',
    m.calls.every(c => c.outcome !== 'dispatched_live'));
  t('the author was never answered',
    m.calls.filter(c => c.stage === 'author' && c.outcome !== 'aborted').length === 0,
    JSON.stringify(m.calls.filter(c => c.stage === 'author')));
  t('the verifier was never answered',
    m.calls.filter(c => c.stage === 'verifier' && c.outcome !== 'aborted').length === 0);
  t('every non-planner provider stage was aborted',
    m.calls.filter(c => c.stage !== 'planner' && c.stage !== 'infrastructure')
      .every(c => c.outcome === 'aborted'),
    JSON.stringify(m.calls.filter(c => c.stage !== 'planner' && c.stage !== 'infrastructure')));

  // THE EVIDENCE IS PRESERVED WHETHER OR NOT THE REPLY WAS ACCEPTED.
  t('the planner REQUEST was written out', fs.existsSync(dir + '/planner_request.json'));
  t('the blocked retry\'s request was written out too',
    fs.existsSync(dir + '/blocked_second_request.json'));
  t('the stale-rejection reason was captured verbatim',
    fs.existsSync(dir + '/stale_reason.txt')
    && fs.readFileSync(dir + '/stale_reason.txt', 'utf8').length > 40,
    'len=' + (fs.existsSync(dir + '/stale_reason.txt')
      ? fs.readFileSync(dir + '/stale_reason.txt', 'utf8').length : 'missing'));
  t('the reason names the fields the FS planner contract wants',
    /local_objective/.test(fs.readFileSync(dir + '/stale_reason.txt', 'utf8')),
    fs.readFileSync(dir + '/stale_reason.txt', 'utf8').slice(0, 120));
  t('the recorded decision came from the product\'s axis',
    !!m.decision && !!m.axis && (m.decision.choice === 'run' || m.decision.choice === 'remain'),
    JSON.stringify(m.decision));
  t('spend is reported as $0', /SPEND: \$0/.test(r.out));
  console.log('     the app attempted ' + m.blockedRetries
    + ' retry/retries; 1 request answered, ' + m.blockedRetries + ' refused');
}

// ── 5. THE BOUND IS STRUCTURAL ──────────────────────────────────────────────
console.log('\n5. the spend bound is structural, not a promise in a comment');
{
  const src = fs.readFileSync('_fs_planner_capture.mjs', 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  const fetchSites = (src.match(/route\.fetch\(/g) || []).length;
  t('there is exactly ONE place that can reach the network', fetchSites === 1,
    fetchSites + ' route.fetch sites');
  t('the latch is set BEFORE that fetch can be reached',
    src.indexOf('plannerLiveUsed = true') < src.indexOf('route.fetch('),
    'latch at ' + src.indexOf('plannerLiveUsed = true') + ', fetch at ' + src.indexOf('route.fetch('));
  t('every non-planner stage returns before it',
    /if \(stage !== 'planner'\)/.test(src));
  t('the reservation is R_PLANNER alone, imported not recomputed',
    /const reserved = R_PLANNER;/.test(src)
    && /from '\.\/_live_spend_ledger\.mjs'/.test(src)
    && !src.includes('worst(' + '240000, 8000)'));
  t('the live branch records its cost through the shared ledger',
    /ledger\.recordCost\('planner'/.test(src));
  t('it never writes the gate or the latch',
    !/gateShown\s*=[^=]/.test(src) && !/_stagedSubmitting\s*=[^=]/.test(src));
}

console.log('\n' + pass + '/' + (pass + fail) + ' preflight checks passed');
process.exit(fail ? 1 : 0);
