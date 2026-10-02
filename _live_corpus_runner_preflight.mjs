// PREFLIGHT FOR THE LIVE N-SCENE CORPUS RUNNER. Provider-free, $0.
//
// It SPAWNS THE REAL RUNNER rather than reimplementing any part of it. A preflight that models the
// runner's logic proves only that I can write the same bug twice; this one asserts on the runner's
// own exit codes, its own manifest, and its own captured files.
//
// What it must establish before a single dollar is quoted:
//   1. the runner REFUSES to dispatch without authorization, before launching a browser
//   2. --estimate-only quotes the reservation from the shared module and spends nothing
//   3. an insufficient ceiling is REFUSED before dispatch, not discovered during it
//   4. the proven loop still works end to end: gate, mount, latch, per-scene prose, verifier refs
//   5. the runner never writes the gate, the latch, or fixture prose into the app
import fs from 'fs';
import { spawnSync } from 'child_process';
import { R_SCENE, R_PLANNER, R_AUTHOR, R_VERIFIER } from './_live_spend_ledger.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== LIVE CORPUS RUNNER PREFLIGHT (provider-free, $0) ===\n');

const OUTDIR = '_live_corpus_out';
const runDirs = () => fs.existsSync(OUTDIR)
  ? fs.readdirSync(OUTDIR).filter(d => /^run_/.test(d)).sort() : [];
const run = (args) => {
  const r = spawnSync('node', ['_live_corpus_runner.mjs', ...args],
    { encoding: 'utf8', timeout: 900000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const newestDir = () => { const d = runDirs(); return d.length ? OUTDIR + '/' + d[d.length - 1] : null; };

// ── 1. THE ABORT BEFORE ANY DISPATCH ────────────────────────────────────────
console.log('1. no authorization, no dispatch — and no browser');
{
  const before = runDirs().length;
  const r = run(['--scenes', '3']);
  t('refuses with exit 2', r.code === 2, 'exit=' + r.code);
  t('names all three legitimate modes',
    /--estimate-only/.test(r.out) && /--dry-replay/.test(r.out) && /--authorize/.test(r.out));
  t('says plainly that it would dispatch real provider calls',
    /dispatches real provider calls/.test(r.out));
  t('created NO run directory — it refused before any setup',
    runDirs().length === before, 'dirs went ' + before + ' -> ' + runDirs().length);
}

console.log('\n1b. nonsense arguments are refused, not interpreted');
{
  t('--scenes 0 is refused', run(['--scenes', '0', '--dry-replay']).code === 2);
  t('--scenes 11 is refused (a CG issue is 10)', run(['--scenes', '11', '--dry-replay']).code === 2);
  t('an unknown --input-policy is refused',
    run(['--scenes', '2', '--dry-replay', '--input-policy', 'whatever']).code === 2);
}

// ── 2. THE ESTIMATE ─────────────────────────────────────────────────────────
console.log('\n2. --estimate-only quotes the SHARED reservation and spends nothing');
{
  const r = run(['--scenes', '3', '--estimate-only']);
  t('exits 0', r.code === 0, 'exit=' + r.code);
  const dir = newestDir();
  const est = JSON.parse(fs.readFileSync(dir + '/estimate.json', 'utf8'));
  t('the per-scene figure IS the shared module\'s R_SCENE',
    Math.abs(est.perScene - R_SCENE) < 1e-12, 'runner=' + est.perScene + ' module=' + R_SCENE);
  t('three scenes reserve exactly 3 x R_SCENE',
    Math.abs(est.reserved - R_SCENE * 3) < 1e-12, 'reserved=' + est.reserved);
  t('each stage figure matches the module',
    Math.abs(est.stages.planner - R_PLANNER) < 1e-12
    && Math.abs(est.stages.author - R_AUTHOR) < 1e-12
    && Math.abs(est.stages.verifier - R_VERIFIER) < 1e-12);
  t('it says nothing was dispatched and no browser launched',
    /no browser launched, nothing dispatched/.test(r.out));
  t('no response artefact was written', !fs.readdirSync(dir).some(f => /^s\d+_/.test(f)));
  t('no prose was captured — the loop never ran',
    !fs.readdirSync(dir).some(f => /_prose\.txt$/.test(f)));
}

// ── 3. AN INSUFFICIENT CEILING ──────────────────────────────────────────────
console.log('\n3. a ceiling below the reservation is REFUSED before dispatch');
{
  const r = run(['--scenes', '3', '--authorize', '0.01']);
  t('exits 3', r.code === 3, 'exit=' + r.code);
  t('states both figures', /REFUSED BEFORE DISPATCH/.test(r.out)
    && /exceeds the authorized \$0\.01/.test(r.out));
  const ref = JSON.parse(fs.readFileSync(newestDir() + '/refusal.json', 'utf8'));
  t('records that zero calls were dispatched', ref.dispatched === 0);
  t('the recorded reservation is the real one',
    Math.abs(ref.reserved - R_SCENE * 3) < 1e-12);
  t('no response artefact was written',
    !fs.readdirSync(newestDir()).some(f => /^s\d+_/.test(f)));
}

// ── 4. THE PROVEN LOOP, END TO END, PROVIDER-FREE ───────────────────────────
console.log('\n4. two scenes in DRY REPLAY — the loop, the capture, the ordering');
console.log('   (this launches a browser and walks the real production path; give it a minute)');
{
  const r = run(['--scenes', '2', '--dry-replay']);
  const dir = newestDir();
  const m = JSON.parse(fs.readFileSync(dir + '/manifest.json', 'utf8'));
  t('exits 0 with no failed per-scene check', r.code === 0, 'exit=' + r.code
    + ' checks=' + JSON.stringify(m.checks));
  t('the manifest records DRY REPLAY and zero authorization',
    m.mode === 'dry_replay' && m.authorized === 0);
  t('both scenes completed', m.completedScenes === 2, 'completed=' + m.completedScenes);

  const s1 = m.history[0], s2 = m.history[1];
  // PER-SCENE PROSE, from the app's own projection.
  t('scene 1 captured prose to its own file',
    fs.existsSync(dir + '/scene_01_prose.txt')
    && fs.readFileSync(dir + '/scene_01_prose.txt', 'utf8').length >= 40,
    'len=' + (fs.existsSync(dir + '/scene_01_prose.txt')
      ? fs.readFileSync(dir + '/scene_01_prose.txt', 'utf8').length : 'missing'));
  t('scene 2 captured prose to its own file',
    fs.existsSync(dir + '/scene_02_prose.txt')
    && fs.readFileSync(dir + '/scene_02_prose.txt', 'utf8').length >= 40);
  t('the manifest\'s prose lengths agree with the files on disk',
    s1.proseLen === fs.readFileSync(dir + '/scene_01_prose.txt', 'utf8').length
    && s2.proseLen === fs.readFileSync(dir + '/scene_02_prose.txt', 'utf8').length);

  // PLANNER BEFORE AUTHOR, within each scene.
  const order = (h) => h.stages.filter(x => /^(planner|author|verifier):/.test(x))
    .map(x => x.split(':')[0]);
  const o1 = order(s1), o2 = order(s2);
  t('scene 1 ran the planner before the author',
    o1.indexOf('planner') >= 0 && o1.indexOf('author') > o1.indexOf('planner'),
    JSON.stringify(o1));
  t('scene 2 ran the planner before the author',
    o2.indexOf('planner') >= 0 && o2.indexOf('author') > o2.indexOf('planner'),
    JSON.stringify(o2));
  // THE VERIFIER ADJUDICATES THE PREVIOUS SCENE, so it appears from scene 2 onward.
  t('no verifier call on scene 1 — there is nothing yet to adjudicate',
    o1.indexOf('verifier') === -1, JSON.stringify(o1));
  t('the verifier ran on scene 2', o2.indexOf('verifier') >= 0, JSON.stringify(o2));
  t('and it was asked about at least one sealed ref, parsed from its own request',
    s2.verifierRefs.length > 0, JSON.stringify(s2.verifierRefs));
  t('every ref it was asked about has the real proposal shape',
    s2.verifierRefs.every(x => /^prop:\d+:\d+$/.test(x)), JSON.stringify(s2.verifierRefs));

  // STATE MOVED, and the per-scene record carries the detail the study needs.
  t('facts grew across the boundary', s2.facts.length > s1.facts.length,
    s1.facts.length + ' -> ' + s2.facts.length);
  t('scene 2 recorded per-proposal verdicts', s2.verdicts.length > 0,
    JSON.stringify(s2.verdicts));
  t('the gate reading is recorded per scene', !!s1.gate && !!s2.gate);
  t('the input used is recorded per scene', !!(s1.input && s1.input.action)
    && !!(s2.input && s2.input.action));
  t('failures and app refusals are recorded per scene (empty is a value, not an absence)',
    Array.isArray(s1.blocked) && Array.isArray(s1.refusals)
    && Array.isArray(s2.blocked) && Array.isArray(s2.refusals));
  t('no duplicate-stage call was needed (none blocked)',
    m.blocked.filter(b => /same stage/.test(b.why)).length === 0,
    JSON.stringify(m.blocked));
  t('the input policy and its risk are both recorded',
    m.inputPolicy === 'neutral' && /confound H1/.test(m.inputPolicyNote));
  t('spend is reported as $0 for a provider-free run', /SPEND: \$0/.test(r.out));
}

// ── 5. THE RUNNER DOES NOT CHEAT ────────────────────────────────────────────
console.log('\n5. the runner writes no app state and holds no second copy of the money');
{
  // Strip comments so these scans cannot match their own explanatory prose.
  const src = fs.readFileSync('_live_corpus_runner.mjs', 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  t('never writes gateShown', !/gateShown\s*=[^=]/.test(src));
  t('never writes the submit latch', !/_stagedSubmitting\s*=[^=]/.test(src));
  t('never calls _commitScene directly', !/_commitScene\s*\(/.test(src));
  t('never writes a scene projection', !/_sbPersistSceneProjection/.test(src));
  t('never writes committed state or the register',
    !/_committedState\s*=\s*\{/.test(src) && !/_protectedRegisterIds\s*\(\)\s*\[/.test(src));
  t('reads prose only through the app\'s own projection accessor',
    /_sbLatestProseText/.test(src));
  // Needles built from halves so the scan cannot match itself.
  t('holds no second copy of the author reservation',
    !src.includes('worst(' + '240000, 8000)'));
  t('imports the reservation from the shared module',
    /from '\.\/_live_spend_ledger\.mjs'/.test(src));
  t('imports the stage classifier rather than rewriting it',
    /stageOf/.test(src) && /from '\.\/_replay_fixtures\.mjs'/.test(src)
    && !/FORBIDDEN INVENTIONS/.test(src));
  t('the live branch records every dispatch through the shared ledger',
    /ledger\.recordCost\(/.test(src));
  t('a dispatch is checked against the authorization BEFORE it goes out',
    /spentEstimate \+ est > AUTHORIZED/.test(src));
  t('one attempt per stage per scene is enforced in code',
    /blocked_duplicate/.test(src));
}

console.log('\n' + pass + '/' + (pass + fail) + ' preflight checks passed');
process.exit(fail ? 1 : 0);
