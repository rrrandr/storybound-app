// _aplot_contamination_audit.mjs — FREE. Which generic-aPlot-derived values actually REACH the
// Author on a seeded First Sacrifice continuation? Delivery is PROVEN by matching the aPlot value
// against the captured payload from the SAME run (aPlot regenerates per run, so cross-run matching
// would lie). No inference from source references. No prose generated.
import fs from 'fs';

const RUN = process.argv[2] || '_validate_out/authority';
const probe = JSON.parse(fs.readFileSync(`${RUN}/probe.json`, 'utf8'));
const payload = fs.readFileSync(`${RUN}/payload_cont.txt`, 'utf8');
const aPlot = probe.dump.aPlot || {};
const seedKeys = probe.dump.seedKeys || [];

// ── delivery test: any distinctive 6-word shingle of the value present in the payload ──
const norm = t => String(t).replace(/\s+/g, ' ').trim();
function delivered(val) {
  const t = norm(val);
  if (t.length < 20) return null;                    // too short to attribute
  const w = t.split(' ');
  for (let i = 0; i + 6 <= w.length; i += 3) {
    const sh = w.slice(i, i + 6).join(' ');
    if (sh.length > 25 && payload.includes(sh)) return sh;
  }
  return false;
}

// ── known parallel-story material invented by generic generateAPlot (absent from the seed) ──
const PARALLEL = [
  ['heritage secret', /heritage secret/i],
  ['Syzygy', /syzygy/i],
  ['former lover / ex', /former lover|his ex\b|ex-lover/i],
  ['father / her father\'s name', /her father|father'?s name/i],
  ['wish that brought Julian into her life', /brought \w+ into her life/i],
  ['community square', /community square/i],
  ['sister', /\bsister\b/i],
  ['village', /\bvillage\b/i],
];

const rows = [];
for (const [k, v] of Object.entries(aPlot)) {
  if (typeof v === 'string') rows.push({ field: k, text: v });
  else if (Array.isArray(v)) v.forEach((e, i) => {
    if (typeof e === 'string') rows.push({ field: `${k}[${i}]`, text: e });
    else if (e && typeof e === 'object' && e.event) rows.push({ field: `${k}[${i}].event`, text: e.event });
  });
}

const live = [];
for (const r of rows) {
  const d = delivered(r.text);
  if (d) live.push({ ...r, shingle: d });
}

console.log('════ A-PLOT CONTAMINATION AUDIT — seeded First Sacrifice continuation ════');
console.log(`run: ${RUN}   aPlot string-bearing fields: ${rows.length}   DELIVERED to Author: ${live.length}\n`);

console.log('consumer (aPlot field)          | delivered | contaminated | text');
console.log('-'.repeat(110));
for (const r of live.sort((a, b) => a.field.localeCompare(b.field))) {
  const hits = PARALLEL.filter(([, re]) => re.test(r.text)).map(([n]) => n);
  console.log(`${r.field.padEnd(31)} | ✅ proven | ${(hits.length ? '⚠ ' + hits.join(',') : 'clean').padEnd(12)} | ${norm(r.text).slice(0, 120)}`);
}

console.log('\n──── NOT delivered (present in aPlot, no payload match) ────');
const dead = rows.filter(r => !live.find(l => l.field === r.field));
console.log('  ' + dead.map(r => r.field).join(' · '));

console.log('\n──── PARALLEL-STORY MATERIAL IN THE PAYLOAD (regardless of source) ────');
for (const [n, re] of PARALLEL) {
  const m = payload.match(new RegExp('.{0,70}' + re.source + '.{0,70}', 'gi'));
  console.log(`  ${(m ? '⚠ ' + m.length + ' hit(s)' : '✅ absent').padEnd(12)}  ${n}`);
  if (m) m.slice(0, 2).forEach(x => console.log('        …' + norm(x)));
}

console.log('\n──── SEED REPLACEMENT AVAILABILITY ────');
console.log('  seed keys present: ' + JSON.stringify(seedKeys));
const MAP = {
  personalStakePC: 'seed.dramaticTruth / seed.cast[PC].bio',
  personalStakeLI: 'seed.cast[LI].bio',
  pcWound: 'seed.cast[PC].bio (apprentice, terrified of failing publicly)',
  liWound: 'seed.cast[LI].bio',
  antagonistOrAntiForce: 'seed.issue / seed.dramaticTruth (no authored antagonist field)',
  stakesIfFail: 'NO authored equivalent — would need authoring',
  stakesIfWin: 'NO authored equivalent — would need authoring',
  readerQuestion: 'seed.dramaticTruth',
  desireQuestion: 'romance engine (not seed)',
};
for (const r of live) if (MAP[r.field.replace(/\[.*/, '')]) console.log(`  ${r.field.padEnd(28)} → ${MAP[r.field.replace(/\[.*/, '')]}`);
