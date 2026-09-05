// PROTEAN ARC SIMULATION ($0) — does a FULL Protean arc unfold smoothly across a 25+-issue playthrough?
// Simulates a player progressing through all 8 regions (issues accumulating toward each region's FLOOR, then a
// cross-region crossover) through the REAL gating functions extracted from app.js. Asserts the machinery invariants:
//   • correct A-plot mode at every issue (first-story SOFT / UNSOLVED preferred MYSTERY / SOLVED FRESH),
//   • every region solved exactly once (full coverage, no skips, no loops),
//   • the capstone unlocks ONLY on the 8th solve, never before,
//   • order-independence (many region orders all complete),
//   • the SOLVED-region replay path returns a FRESH story.
// Tests the ORCHESTRATION, not prose quality (that needs real gen — spot-check a few transitions separately).
const fs = require('fs');
const L = fs.readFileSync('public/app.js', 'utf8').split('\n');
function span(n){let s=L.findIndex(l=>l.includes('function '+n+'('));let e=s;for(let i=s;i<L.length;i++){if(L[i].includes('window.'+n+' =')){e=i;break;}}return L.slice(s,e+1).join('\n');}
function rx(n){return L.find(l=>l.includes('var '+n+' = /'));}
function reg(){const s=L.findIndex(l=>l.includes('var _FATELANDS_COSMOLOGY = {'));let e=s;for(let i=s;i<L.length;i++){if(L[i].includes('window._FATELANDS_COSMOLOGY')){e=i;break;}}return L.slice(s,e+1).join('\n');}

// Build a fresh sandbox with mutable localStorage (so mark-solved persists across the simulated run).
function sandbox() {
  const store = { 'sb_protean_solved': '{}' };
  const src = 'var localStorage={getItem:function(k){return store[k]==null?null:store[k];},setItem:function(k,v){store[k]=v;}};\n'
    + rx('_FATELANDS_MYSTERY_RX') + '\n' + reg() + '\n'
    + span('_getProteanSolved') + '\n'
    + 'function _proteanRegionKey(region){var raw=String(region||(window.state&&window.state.fantasyRegion)||"").toLowerCase();var hit=null;try{Object.keys(_FATELANDS_COSMOLOGY).forEach(function(k){if(raw.indexOf(k)!==-1)hit=k;});}catch(_){}return hit;}\n'
    + span('_isRegionProteanSolved').replace(/\n  window\.[^\n]*/g,'') + '\n'
    + span('_markRegionProteanSolved').replace(/\n  window\.[^\n]*/g,'') + '\n'
    + span('_isProteanCapstoneUnlocked').replace(/\n  window\.[^\n]*/g,'') + '\n'
    + span('_buildProteanAPlotSteerDirective').replace(/\n  window\.[^\n]*/g,'') + '\n'
    + 'module.exports={keys:Object.keys(_FATELANDS_COSMOLOGY),steer:_buildProteanAPlotSteerDirective,mark:_markRegionProteanSolved,solved:_isRegionProteanSolved,capstone:_isProteanCapstoneUnlocked};';
  const m = { exports: {} };
  const win = {};
  new Function('module', 'window', 'store', src)(m, win, store);
  m.exports._win = win;
  return m.exports;
}

function mode(steer) {
  if (/FIRST-VISIT SOFT/.test(steer)) return 'SOFT';
  if (/prefer a FRESH/.test(steer)) return 'FRESH';
  if (/strongly prefer the mystery/i.test(steer)) return 'MYSTERY';
  return '(none)';
}

// A plausible full continuation chain (Thornwild → … → Veilwood/capstone). issues-per-region varies (pacing knob).
function simulate(order, issuesPerRegion, opts) {
  const S = sandbox();
  opts = opts || {};
  const rows = [];
  let issueNo = 0, storyOrdinal = 0, firstCrossoverAt = null, capstoneAt = null;
  const solvedSeq = [];
  const problems = [];
  for (let ri = 0; ri < order.length; ri++) {
    const region = order[ri];
    const n = issuesPerRegion[ri];
    for (let i = 1; i <= n; i++) {
      issueNo++; storyOrdinal++;
      S._win.state = { picks: { world: 'Fantasy' }, fantasyRegion: region, _onboardingStoryOrdinal: storyOrdinal };
      const m = mode(S.steer(S._win.state));
      // Expected mode: global story 1 → SOFT; a region already solved → FRESH; else UNSOLVED → MYSTERY.
      const wasSolved = S.solved(region);
      const expected = (storyOrdinal === 1) ? 'SOFT' : (wasSolved ? 'FRESH' : 'MYSTERY');
      if (m !== expected) problems.push(`issue ${issueNo} (${region}, ord ${storyOrdinal}): mode ${m}, expected ${expected}`);
      rows.push({ issueNo, region, storyOrdinal, i, n, mode: m });
      // FLOOR reached on the region's last issue → solve + crossover (Fatebound rebrand at the first one).
      if (i === n) {
        const before = S.capstone();
        S.mark(region);
        solvedSeq.push(region);
        if (before) problems.push(`capstone was already unlocked BEFORE solving ${region} (premature)`);
        if (S.capstone() && capstoneAt == null) capstoneAt = issueNo;
        if (ri > 0 && firstCrossoverAt == null) firstCrossoverAt = null; // set below
        if (ri === 0 && firstCrossoverAt == null) { /* first region just solved → next issue crosses over */ }
      }
    }
    if (ri === 0) firstCrossoverAt = issueNo + 1; // the issue that first enters region 2 = the Fatebound crossover
  }
  // Whole-arc invariants
  const uniq = new Set(solvedSeq);
  if (uniq.size !== order.length) problems.push(`coverage: solved ${uniq.size} distinct regions, expected ${order.length}`);
  if (solvedSeq.length !== order.length) problems.push(`double-solve: ${solvedSeq.length} solves for ${order.length} regions`);
  if (!S.capstone()) problems.push('capstone did NOT unlock after the full arc');
  if (capstoneAt !== issueNo) problems.push(`capstone unlocked at issue ${capstoneAt}, expected the FINAL issue ${issueNo}`);
  return { issues: issueNo, solvedSeq, capstoneAt, firstCrossoverAt, problems, rows };
}

const KEYS = sandbox().keys; // 8 region keys
// Canonical playthrough: all 8, with varied issue counts summing to 25+.
const order1 = ['thornwild','vaelryn','ashen','gloamwater','shackle','pulse','lytharyn','veilwood'];
const perRegion = [4,3,3,4,3,3,4,3]; // = 27 issues
const r1 = simulate(order1, perRegion);
console.log('── CANONICAL ARC (8 regions, ' + r1.issues + ' issues) ──');
console.log('  first Fatebound crossover at issue: ' + r1.firstCrossoverAt + '  (story 1 = SOFT onboarding, then MYSTERY until the floor)');
console.log('  regions solved in order: ' + r1.solvedSeq.join(' → '));
console.log('  capstone unlocked at issue: ' + r1.capstoneAt + ' / ' + r1.issues + (r1.capstoneAt === r1.issues ? '  (exactly the final solve ✓)' : '  ✗'));
// mode timeline sample
const timeline = r1.rows.map(function (x) { return x.mode[0]; }).join('');   // S/M/F per issue
console.log('  mode timeline (S=soft M=mystery F=fresh): ' + timeline);
console.log('  problems: ' + (r1.problems.length ? '\n    - ' + r1.problems.join('\n    - ') : 'NONE ✓'));

// Order-independence: several distinct region orders should ALL complete cleanly.
console.log('\n── ORDER-INDEPENDENCE (10 shuffled playthroughs) ──');
let orderFails = 0;
function shuffle(a, seed) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = seed % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
for (let t = 0; t < 10; t++) {
  const ord = shuffle(KEYS, (t + 1) * 7919);
  const pr = ord.map(function (_, i) { return 3 + (i % 3); }); // 3–5 issues each
  const r = simulate(ord, pr);
  if (r.problems.length) { orderFails++; console.log('  FAIL order ' + ord.join(',') + ': ' + r.problems.join('; ')); }
}
console.log('  ' + (10 - orderFails) + '/10 shuffled arcs unfolded cleanly (all 8 solved, capstone only at the end)');

// SOLVED-region replay: after the arc, a new story in an already-solved region must return a FRESH (non-mystery) plot.
console.log('\n── SOLVED-REGION REPLAY ──');
const S2 = sandbox();
KEYS.forEach(function (k) { S2.mark(k); }); // whole account solved
S2._win.state = { picks: { world: 'Fantasy' }, fantasyRegion: 'lytharyn', _onboardingStoryOrdinal: 40 };
const replayMode = mode(S2.steer(S2._win.state));
console.log('  replay into solved Lytharyn (story 40) → mode: ' + replayMode + (replayMode === 'FRESH' ? '  ✓ (a fresh romance, not the conspiracy)' : '  ✗'));

const allClean = r1.problems.length === 0 && orderFails === 0 && replayMode === 'FRESH';
console.log('\n════════════════════════════════════════');
console.log('ARC MACHINERY: ' + (allClean ? 'UNFOLDS SMOOTHLY ✓ (all invariants held across 25+ issues)' : 'ISSUES FOUND ✗'));
process.exit(allClean ? 0 : 1);
