// CONTINUATION-WINDOW EXPERIMENT — batch driver (Roman 2026-07-19)
//
// RUN #1 = INTERNAL VALIDITY ONLY. One pinned world config (whatever _issue_gen.js
// pins), one frozen INPUTS script, N independent replicate runs per arm. We are NOT
// testing generalization across stories here — that is run #2, and only after an arm wins.
//
// WHY REPLICATES: there is NO seed mechanism in this codebase. Nothing seeds or stubs
// Math.random anywhere, and api/proxy.js defaults temperature=0.7. Two runs of the SAME
// arm with the SAME scripted inputs still diverge. So arms cannot be diffed pairwise —
// each arm is a DISTRIBUTION and the comparison is distribution-vs-distribution.
//
//   node _contwindow_batch.js                      # 3 arms x 3 replicates x 20 scenes
//   REPLICATES=2 TARGET=12 node _contwindow_batch.js
//   ARMS=600,5500 node _contwindow_batch.js
//   DRY=1 node _contwindow_batch.js                # print the plan, generate nothing
//
// Requires localhost:3000 up. Output → ./_contwindow_out/<arm>_r<n>.json (+ .console.log)

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARMS = (process.env.ARMS || '600,5500,11000').split(',').map(s => s.trim()).filter(Boolean);
const REPLICATES = parseInt(process.env.REPLICATES, 10) || 3;
const TARGET = parseInt(process.env.TARGET, 10) || 20;
const DRY = process.env.DRY === '1';
const OUTDIR = process.env.OUTDIR || path.join(__dirname, '_contwindow_out');

const plan = [];
for (const arm of ARMS) for (let r = 1; r <= REPLICATES; r++) plan.push({ arm, r });

console.log('═══ CONTINUATION-WINDOW EXPERIMENT — RUN #1 (internal validity) ═══');
console.log(`arms=${ARMS.join(' / ')}  replicates=${REPLICATES}  scenes=${TARGET}`);
console.log(`total runs = ${plan.length}   total scenes = ${plan.length * TARGET}`);
console.log(`output → ${OUTDIR}`);
console.log('NOTE: no seeding exists — replicates are samples, not reproductions.\n');

if (DRY) { plan.forEach(p => console.log(`  would run: arm=${p.arm} replicate=${p.r}`)); process.exit(0); }

fs.mkdirSync(OUTDIR, { recursive: true });

// Interleave arms (a1r1, a2r1, a3r1, a1r2, …) rather than running all of one arm
// back to back. Any time-correlated drift — provider-side model updates, rate limiting,
// machine load — then hits all arms roughly equally instead of confounding one of them.
const order = [];
for (let r = 1; r <= REPLICATES; r++) for (const arm of ARMS) order.push({ arm, r });

const results = [];
for (let i = 0; i < order.length; i++) {
  const { arm, r } = order[i];
  const base = path.join(OUTDIR, `${arm}_r${r}`);
  const t0 = Date.now();
  console.log(`\n─── [${i + 1}/${order.length}] arm=${arm} replicate=${r} ───`);
  const res = spawnSync('node', ['_issue_gen.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
      MODE: 'literary', ARM: arm, TARGET: String(TARGET),
      OUT: `${base}.json`, CONSOLE_OUT: `${base}.console.log`,
      RUN_LABEL: `${arm}_r${r}`
    })
  });
  const secs = Math.round((Date.now() - t0) / 1000);
  let captured = 0;
  try { captured = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8')).capturedScenes || 0; } catch (_) {}
  const ok = res.status === 0 && captured >= Math.ceil(TARGET * 0.8);
  results.push({ arm, r, ok, captured, secs, status: res.status });
  console.log(`─── arm=${arm} r=${r} → ${ok ? 'OK' : 'INCOMPLETE'} scenes=${captured}/${TARGET} ${secs}s`);
}

console.log('\n═══ BATCH COMPLETE ═══');
console.table(results);
const bad = results.filter(x => !x.ok);
if (bad.length) {
  console.log(`\n⚠ ${bad.length}/${results.length} runs incomplete. A partial run is NOT a valid`);
  console.log('  replicate — repetition scales with scene count, so a short run looks artificially');
  console.log('  clean. Re-run the failures before scoring, or drop them explicitly.');
}
console.log(`\nnext:  node _contwindow_score.js ${OUTDIR}`);
