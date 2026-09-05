// CONTINUATION-WINDOW EXPERIMENT — scorer (Roman 2026-07-19)
//   node _contwindow_score.js [_contwindow_out]
//
// Deterministic only. NO LLM judge — every metric here reads engine state or does
// mechanical text analysis, so it costs $0 and has no opinion of its own. A prose
// judge is deliberately deferred until the deterministic metrics DISAGREE.
//
// Reports per-arm DISTRIBUTIONS (min–max across replicates), never single-story
// comparisons — the engine is stochastic and unseeded, so one story proves nothing.
//
// METRICS
//   repetition       cross-scene repeated 4-8 word shingles, normalized per 1k words.
//                    Normalized because runs vary in total output length (adaptive
//                    scene length + short runs), and a raw repeat COUNT grows with
//                    corpus size regardless of style. NB: the window is INPUT and
//                    repetition is measured on OUTPUT, so arm does not mechanically
//                    inflate this — normalization controls run-to-run length, not arm.
//   entity           staged_characters (planner INTENT) vs _continuityProbe
//                    .present_characters (what the extractor SAW). Engine state on
//                    both sides — no LLM opinion in the metric itself.
//   location         location_change.changed without transition_shown = an unmarked cut
//   window           realized continuation-window distribution (source / stop reason)

const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || path.join(__dirname, '_contwindow_out');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
if (!files.length) { console.error(`no .json runs in ${DIR}`); process.exit(1); }

const STOP = new Set('a an the of to and in on at for with from into over under as is are was were be been being it its this that these those he she they him her his hers their them i me my we us our you your by but or so if then than too very just about out up down'.split(/\s+/));
const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
const words = t => norm(t).split(' ').filter(Boolean);

function repetitionScore(scenes) {
  const map = {};
  let totalWords = 0;
  for (const sc of scenes) {
    const ws = words(sc.text); totalWords += ws.length;
    for (let n = 4; n <= 8; n++) {
      const seen = new Set();
      for (let i = 0; i + n <= ws.length; i++) seen.add(ws.slice(i, i + n).join(' '));
      for (const sh of seen) {
        if (sh.split(' ').filter(w => !STOP.has(w)).length < 2) continue;
        (map[sh] = map[sh] || new Set()).add(sc.idx);
      }
    }
  }
  let reps = Object.entries(map).filter(([, s]) => s.size >= 2)
    .map(([sh, s]) => ({ sh, scenes: [...s].sort((a, b) => a - b), n: sh.split(' ').length }));
  reps.sort((a, b) => b.n - a.n);
  const kept = [];
  for (const r of reps) {                                   // drop sub-shingles of a longer repeat
    const sig = r.scenes.join(',');
    if (!kept.some(k => k.sh.includes(r.sh) && k.scenes.join(',') === sig)) kept.push(r);
  }
  return { repeats: kept.length, totalWords,
           per1k: totalWords ? +(1000 * kept.length / totalWords).toFixed(2) : 0,
           top: kept.slice(0, 5).map(r => `${r.sh} [${r.scenes.join(',')}]`) };
}

// ENTITY CONTINUITY — cast persistence ACROSS the scene seam, from the probe alone.
//
// ORIGINAL DESIGN (staged_characters as planner INTENT vs probe as RESULT) is DEAD on the
// live path: _generateSceneSkeleton is only called from the legacy single-pass branch
// (app.js:272782, gated turnCount>0 && !explicitEmbodimentAuthorized), and the smoke test
// measured state.sceneSkeleton.staged_characters EMPTY on the branch that actually ran.
// An intent-vs-result metric with no intent side scores nothing.
//
// This replacement is also a better fit for the question. What the continuation window is
// supposed to buy is: does the author still know WHO WAS IN THE ROOM one scene ago? So
// compare probe[N-1] → probe[N] directly:
//   dropped     = IN_PERSON in N-1, then absent from N entirely (not even OFFSTAGE_REFERENCED)
//   spontaneous = IN_PERSON in N with no presence in N-1 AND no location change to explain it
// Both are cast-continuity failures the reader would feel. A location change legitimately
// excuses both directions, so those seams are skipped rather than penalized.
function entityScore(scenes, pcName) {
  const usable = scenes.filter(s => s.probeFresh && s.probe && Array.isArray(s.probe.present_characters));
  const skippedStale = scenes.length - usable.length;
  // EXCLUDE THE PROTAGONIST (found by smoke test): in first-person POV the PC is present
  // in every scene by definition, but the extractor lists her INCONSISTENTLY — the smoke
  // run had "Mara" absent from scene 2's probe and present in scene 3, which scored as a
  // spontaneous appearance and dragged a clean seam to 0.50. That is probe reporting
  // noise, not a continuity break, and it would have polluted every seam in the batch.
  const pc = String(pcName || '').toLowerCase().trim();
  const nameSet = (arr, modes) => new Set((arr || [])
    .filter(p => p && p.name && (!modes || modes.includes(p.presence_mode)))
    .map(p => String(p.name).toLowerCase().trim())
    .filter(n => n && n !== pc));
  let seams = 0, transitions = 0, dropped = 0, spontaneous = 0, carried = 0;
  for (let i = 1; i < usable.length; i++) {
    const prev = usable[i - 1], cur = usable[i];
    if (cur.idx !== prev.idx + 1) continue;                    // non-adjacent (a scene was excluded)
    const moved = !!(cur.probe.location_change && cur.probe.location_change.changed);
    if (moved) { transitions++; continue; }                    // a move excuses cast turnover
    seams++;
    const prevInPerson = nameSet(prev.probe.present_characters, ['IN_PERSON']);
    const curAny = nameSet(cur.probe.present_characters, null);
    const curInPerson = nameSet(cur.probe.present_characters, ['IN_PERSON']);
    const prevAny = nameSet(prev.probe.present_characters, null);
    for (const n of prevInPerson) { if (curAny.has(n)) carried++; else dropped++; }
    for (const n of curInPerson) { if (!prevAny.has(n)) spontaneous++; }
  }
  const denom = carried + dropped + spontaneous;
  return { seams, transitionsSkipped: transitions, skippedStale, carried, dropped, spontaneous,
           castContinuity: denom ? +(carried / denom).toFixed(3) : null };
}

function locationScore(scenes) {
  let changes = 0, unmarked = 0, scored = 0;
  for (const sc of scenes) {
    if (!sc.probeFresh) continue;
    const lc = sc.probe && sc.probe.location_change;
    if (!lc || typeof lc.changed === 'undefined') continue;
    scored++;
    if (lc.changed) { changes++; if (!lc.transition_shown) unmarked++; }
  }
  return { scenesScored: scored, changes, unmarked,
           markedRate: changes ? +((changes - unmarked) / changes).toFixed(3) : null };
}

const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;

function windowShape(run) {
  const d = (run.contWindow && run.contWindow.dist) || {};
  const samples = (run.contWindow && run.contWindow.samples) || [];
  const out = {}; let n = 0;
  for (const k of Object.keys(d)) { out[k] = d[k].n; n += d[k].n; }
  const chars = samples.map(s => s.chars).sort((a, b) => a - b);
  return { total: n, byKey: out, samples: chars,
           mean: chars.length ? Math.round(chars.reduce((a, b) => a + b, 0) / chars.length) : null,
           median: pct(chars, 0.5), p95: pct(chars, 0.95) };
}

// ── score every run ──
const runs = files.map(f => {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const scenes = (j.scenes || []).filter(s => (s.text || '').length > 200);
  const pcName = (j.meta && (j.meta.name || j.meta.playerName)) || '';
  return { file: f, arm: j.arm || 'unknown', label: j.runLabel || f, scenes: scenes.length, pcName,
           rep: repetitionScore(scenes), ent: entityScore(scenes, pcName),
           loc: locationScore(scenes), win: windowShape(j) };
});

const byArm = {};
runs.forEach(r => (byArm[r.arm] = byArm[r.arm] || []).push(r));

const range = vals => {
  const v = vals.filter(x => x !== null && x !== undefined && !Number.isNaN(x));
  if (!v.length) return 'n/a';
  const lo = Math.min(...v), hi = Math.max(...v);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return `${lo.toFixed(2)}–${hi.toFixed(2)} (mean ${mean.toFixed(2)}, n=${v.length})`;
};

console.log('═══ CONTINUATION-WINDOW — RUN #1 RESULTS ═══');
console.log('Distributions across replicates. Unseeded engine: read DIRECTION, not single runs.\n');

for (const arm of Object.keys(byArm).sort((a, b) => (+a || 0) - (+b || 0))) {
  const rs = byArm[arm];
  console.log(`── ARM ${arm}  (${rs.length} replicate${rs.length > 1 ? 's' : ''}) ──`);
  console.log(`   scenes/run      ${range(rs.map(r => r.scenes))}`);
  console.log(`   repetition/1k   ${range(rs.map(r => r.rep.per1k))}   ← lower is better`);
  console.log(`   cast continuity ${range(rs.map(r => r.ent.castContinuity))}   ← higher is better`);
  console.log(`   cast dropped    ${rs.reduce((a, r) => a + r.ent.dropped, 0)}  spontaneous ${rs.reduce((a, r) => a + r.ent.spontaneous, 0)}  over ${rs.reduce((a, r) => a + r.ent.seams, 0)} seams (${rs.reduce((a, r) => a + r.ent.transitionsSkipped, 0)} location moves excused)`);
  console.log(`   location marked ${range(rs.map(r => r.loc.markedRate))}`);
  // REALIZED continuation context — the configured arm is an intent, not a delivery.
  const pooled = rs.flatMap(r => r.win.samples).sort((a, b) => a - b);
  if (pooled.length) {
    const mean = Math.round(pooled.reduce((a, b) => a + b, 0) / pooled.length);
    console.log(`   REALIZED window  mean=${mean}  median=${pct(pooled, 0.5)}  p95=${pct(pooled, 0.95)}  (n=${pooled.length} scenes)`);
  } else {
    console.log('   REALIZED window  no samples — [CONT-WINDOW] never fired (stale app.js cache?)');
  }
  const stale = rs.reduce((a, r) => a + r.ent.skippedStale, 0);
  if (stale) console.log(`   ⚠ ${stale} scene(s) excluded — continuity probe never refreshed`);
  const shapes = {};
  rs.forEach(r => Object.entries(r.win.byKey).forEach(([k, n]) => { shapes[k] = (shapes[k] || 0) + n; }));
  console.log(`   window shape    ${Object.entries(shapes).map(([k, n]) => `${k}=${n}`).join('  ') || 'n/a'}`);
  console.log('');
}

// ── ARM SEPARATION CHECK ──────────────────────────────────────────────────────
// The configured window is an INTENT. If two arms deliver near-identical realized
// context (e.g. an 11k arm that keeps stopping at scene_cap around 5.8k), then any
// null result between them means "these were the same experiment", NOT "window size
// doesn't matter". Check this BEFORE interpreting anything else.
const armMeans = {};
for (const arm of Object.keys(byArm)) {
  const pooled = byArm[arm].flatMap(r => r.win.samples);
  if (pooled.length) armMeans[arm] = Math.round(pooled.reduce((a, b) => a + b, 0) / pooled.length);
}
const armKeys = Object.keys(armMeans).sort((a, b) => (+a || 0) - (+b || 0));
console.log('── ARM SEPARATION ──');
console.log(`   configured → realized:  ${armKeys.map(a => `${a}→${armMeans[a]}`).join('   ')}`);
let collapsed = false;
for (let i = 0; i + 1 < armKeys.length; i++) {
  const a = armKeys[i], b = armKeys[i + 1];
  const lo = Math.min(armMeans[a], armMeans[b]), hi = Math.max(armMeans[a], armMeans[b]);
  if (hi && (hi - lo) / hi < 0.25) {
    collapsed = true;
    console.log(`   ⚠ ARMS ${a} AND ${b} COLLAPSED — realized ${armMeans[a]} vs ${armMeans[b]} (<25% apart).`);
    console.log(`     These are effectively the SAME window. A null result between them is NOT`);
    console.log(`     evidence about window size. Check the stop reasons: if it is scene_cap,`);
    console.log(`     raise maxScenes; if ceiling, raise ceilChars; if ring_exhausted, the story`);
    console.log(`     simply has not accumulated enough prose yet at this scene count.`);
  }
}
if (!collapsed && armKeys.length > 1) console.log('   ✓ arms are meaningfully separated in realized context');
const totalScenes = runs.reduce((a, r) => a + r.scenes, 0);
const totalStale = runs.reduce((a, r) => a + r.ent.skippedStale, 0);
console.log(`   excluded scenes (stale probe): ${totalStale}/${totalScenes}\n`);

console.log('── READING THIS ──');
console.log('Predictions locked before the run (project_scene_continuation_window):');
console.log('  Claude: repetition FLAT 600→5500, RISING at 11000; continuity up then flat.');
console.log('  Roman:  continuity up 600→5500 w/ negligible repetition cost; 11000 = diminishing');
console.log('          continuity gains WITH measurable lexical reuse.');
console.log('Decision rule (Roman): quality decides. Cost/latency informational only.');
console.log('If repetition rises at 5500, the one-scene unit is WRONG — do not proceed to the');
console.log('regime run (explicit/OAS) on the current table.');
console.log('If ranges overlap heavily across arms, the honest answer is "no measurable effect');
console.log('at this n" — add replicates, do not squint at the means.');
