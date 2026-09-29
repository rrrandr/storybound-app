// A3 FLAKE REPRO — drives the non-object and wrong-shape stage_contract controls repeatedly through the dry
// harness's OWN run() (sliced verbatim, nothing re-implemented) and records, per run: race outcome
// (resolved / rejected / timeout180s), duration, fatal, pages, planner/author counts, refunds, dialogs,
// and the handler's last log lines. The invariant under test: a malformed or non-object contract NEVER
// mounts a page, NEVER reaches the author, and ALWAYS yields a NAMED schema failure — not silence.
// usage: REPS=4 node _a3_repro.mjs   (dev server on :3000; no provider calls — every /api/** is answered locally)
import fs from 'node:fs';
const REPS = Number(process.env.REPS || 4);
const dry = fs.readFileSync('_scene1_stage_order_dry.mjs', 'utf8');
const cut = dry.indexOf("const G = await run(");
if (cut < 0) throw new Error('scenario section not found');
const lib = dry.slice(0, cut).replace(/^await preflight\(\);\s*$/m, '') + '\nexport { run, modern, seeded, ok, results };\n';
fs.writeFileSync('_stage_order_lib.generated.mjs', lib);
const L = await import('./_stage_order_lib.generated.mjs');

const rows = [];
const one = async (mode, i) => {
  const r = await L.run(`repro ${mode} #${i}`, L.modern, mode);
  const named = /stage_contract rejected \((absent|malformed:[a-z_]+|whole_contract_rejected|no_participants|[a-z_:]+)\)/.test(String(r.st.fatal));
  const cnt = re => r.logs.filter(l => re.test(l)).length;
  const row = { mode, i, raceOutcome: r.raceOutcome, threw: r.threw, durationMs: r.durationMs, pastGuard: cnt(/Past _beginStoryInProgress guard/), dupIgnored: cnt(/Already in progress/), checkoutAuto: cnt(/CHECKOUT_RETURN/), fatal: r.st.fatal, named, pages: r.st.pages, genStage: r.st.genStage,
    planner: r.plannerCount, author: r.authorCount, refunds: r.refunds.length, dialogs: r.dialogs.length, lastLogs: r.logs.slice(-5).map(l => l.slice(0, 160)) };
  rows.push(row);
  const ok = row.named && row.pages === 0 && row.author === 0 && row.refunds >= 1 && row.raceOutcome !== 'timeout180s';
  console.log((ok ? '  ✓ ' : '  ✗ ') + `${mode} #${i}: race=${row.raceOutcome} ${row.durationMs}ms pastGuard=${row.pastGuard} dupIgnored=${row.dupIgnored} checkoutAuto=${row.checkoutAuto} fatal=${String(row.fatal).slice(0, 90)} pages=${row.pages} author=${row.author} refunds=${row.refunds}`);
  if (!ok) row.lastLogs.forEach(l => console.log('      ' + l));
  if (process.env.SHOW_CHECKOUT === '1') r.logs.filter(l => /CHECKOUT_RETURN|Past _beginStoryInProgress|Already in progress/.test(l)).forEach(l => console.log('      · ' + l.slice(0, 200)));
  return ok;
};
let pass = 0, total = 0;
for (let i = 1; i <= REPS; i++) { total++; if (await one('stringNested', i)) pass++; }
for (let i = 1; i <= Math.max(1, Math.floor(REPS / 2)); i++) { total++; if (await one('malformedNested', i)) pass++; }
fs.writeFileSync('_validate_out/a3_repro.json', JSON.stringify(rows, null, 2));
console.log(`\n${total} runs · ${pass} held the invariant · ${total - pass} did not`);
process.exit(pass === total ? 0 : 1);
