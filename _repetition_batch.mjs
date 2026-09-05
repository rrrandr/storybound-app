// CROSS-SCENE REPETITION — STABILITY BATCH (Roman 2026-07-26). Answers "is the clean 20% repetition
// rate stable, or a lucky single draw?" Runs N clean (deck-OFF) Fatelands 6-scene generations through
// the SAME harness/config, judges each with the cross-scene repetition metric, and reports the
// DISTRIBUTION (mean / median / stdev / min / max / per-run) — not a single number.
//
// The engine is stochastic (different region/A-plot each run), so these are same-CONFIG replicates,
// not same-seed. That is the honest ceiling of what the harness can give; the distribution still tells
// us whether the fixes reliably suppress repetition or just did so once.
//
//   node _repetition_batch.mjs [N=10] [concurrency=2]
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
const pexec = promisify(execFile);

const N = parseInt(process.argv[2] || '10', 10);
const CONC = parseInt(process.argv[3] || '2', 10);
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/564e636e-ec4e-4bd6-9260-4dce17cb1833/scratchpad/rep_batch';
try { fs.mkdirSync(OUTDIR, { recursive: true }); } catch (_) {}

function log(...a){ console.error(new Date().toISOString().slice(11,19), ...a); }

async function oneRun(i) {
  const outJson = `${OUTDIR}/run_${i}.json`;
  const genLog  = `${OUTDIR}/run_${i}.gen.log`;
  try {
    // 1) generate (deck-OFF is baked into _issue_gen_fatelands.js)
    await pexec('node', ['_issue_gen_fatelands.js'], {
      env: { ...process.env, TARGET: '6', MODE: 'literary', OUT: outJson, CONSOLE_OUT: `${OUTDIR}/run_${i}.tags.log` },
      maxBuffer: 64 * 1024 * 1024, timeout: 1500000
    }).catch(e => { fs.writeFileSync(genLog, String(e && e.stderr || e)); throw new Error('gen failed'); });
    const cap = (JSON.parse(fs.readFileSync(outJson, 'utf8')).capturedScenes) || 0;
    if (cap < 4) throw new Error('too few scenes (' + cap + ')');
    // 2) judge — parse the repeat line from the cross-scene judge's stdout
    const { stdout } = await pexec('node', ['_crossscene_legibility.mjs', outJson], { maxBuffer: 32 * 1024 * 1024, timeout: 300000 });
    const m = stdout.match(/pairs that REPEAT[^\n]*?(\d+)\/(\d+)\s+\((\d+)%\)/);
    const adv = stdout.match(/pairs that ADVANCE[^\n]*?(\d+)\/(\d+)/);
    const prog = (stdout.match(/progression\s*:\s*([A-Z]+)/) || [])[1] || '?';
    const pull = /cumulative pull\s*:\s*✓/.test(stdout);
    const intent = (stdout.match(/conveys intent\s*:\s*([A-Z]+)/) || [])[1] || 'n/a';
    if (!m) throw new Error('judge parse failed');
    return { i, ok: true, scenes: cap, repeatN: +m[1], pairs: +m[2], repeatPct: +m[3],
             advanceN: adv ? +adv[1] : null, progression: prog, pull, intent };
  } catch (e) {
    log(`run ${i}: ERROR ${e.message}`);
    return { i, ok: false, error: e.message };
  }
}

// concurrency pool
const results = new Array(N);
let cursor = 0;
async function worker(w) {
  while (cursor < N) {
    const i = cursor++;
    log(`run ${i + 1}/${N} starting (worker ${w})`);
    results[i] = await oneRun(i + 1);
    const r = results[i];
    log(`run ${i + 1}/${N} → ` + (r.ok ? `repeat ${r.repeatPct}% (${r.repeatN}/${r.pairs}) prog=${r.progression} pull=${r.pull} intent=${r.intent}` : `FAILED (${r.error})`));
    fs.writeFileSync(`${OUTDIR}/_progress.json`, JSON.stringify(results.filter(Boolean), null, 2));
  }
}
log(`STABILITY BATCH: N=${N} concurrency=${CONC} (clean deck-OFF, all fixes live)`);
await Promise.all(Array.from({ length: Math.min(CONC, N) }, (_, w) => worker(w + 1)));

// ── aggregate ──
const ok = results.filter(r => r && r.ok);
const pcts = ok.map(r => r.repeatPct).sort((a, b) => a - b);
const mean = pcts.length ? pcts.reduce((s, x) => s + x, 0) / pcts.length : NaN;
const median = pcts.length ? (pcts.length % 2 ? pcts[(pcts.length - 1) / 2] : (pcts[pcts.length / 2 - 1] + pcts[pcts.length / 2]) / 2) : NaN;
const variance = pcts.length ? pcts.reduce((s, x) => s + (x - mean) ** 2, 0) / pcts.length : NaN;
const stdev = Math.sqrt(variance);

console.log('\n════════════════ REPETITION STABILITY — N=' + N + ' (clean, deck-OFF, all fixes) ════════════════');
console.log('completed: ' + ok.length + '/' + N + (ok.length < N ? '  (' + (N - ok.length) + ' failed)' : ''));
console.log('\nrepeat% per run (sorted): [' + pcts.join(', ') + ']');
console.log('  mean   : ' + mean.toFixed(1) + '%');
console.log('  median : ' + median.toFixed(1) + '%');
console.log('  stdev  : ' + stdev.toFixed(1) + '  (variance ' + variance.toFixed(1) + ')');
console.log('  min    : ' + (pcts[0] ?? 'n/a') + '%   ·   max (worst): ' + (pcts[pcts.length - 1] ?? 'n/a') + '%');
console.log('\nreference: BASELINE (deck-ON, old planner) = 60%  ·  single clean run measured earlier = 20%');
console.log('\nper-run detail:');
ok.forEach(r => console.log('  run ' + r.i + ': repeat ' + r.repeatPct + '% (' + r.repeatN + '/' + r.pairs + ')  prog=' + r.progression + '  pull=' + (r.pull ? '✓' : '✗') + '  intent=' + r.intent));
const qual = { pullYes: ok.filter(r => r.pull).length, intentYes: ok.filter(r => r.intent === 'YES').length };
console.log('\nqualitative: cumulative-pull ✓ in ' + qual.pullYes + '/' + ok.length + '  ·  conveys-intent YES in ' + qual.intentYes + '/' + ok.length);
fs.writeFileSync(`${OUTDIR}/_batch_summary.json`, JSON.stringify({ N, CONC, mean, median, stdev, min: pcts[0], max: pcts[pcts.length - 1], runs: results.filter(Boolean) }, null, 2));
console.log('\nfull → ' + OUTDIR + '/_batch_summary.json');
