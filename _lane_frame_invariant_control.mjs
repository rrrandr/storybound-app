// THE AUTHORED-FRAME INVARIANT. Provider-free, $0.
//
// THE PROPERTY, stated once: EVERY authored event frame must satisfy the declared signal of the
// lane it resolves to. A frame is the instruction the product hands the planner as what to write.
// A lane's signalRx is what the gate judges the planner by. If a frame does not satisfy its own
// lane's signal, then a planner that follows the instruction faithfully — in the instruction's own
// words — is REJECTED for doing so, and the gate is punishing obedience.
//
// MEASURED, NOT HYPOTHETICAL. Four live FS planner draws ($0.036265) split 2/2 on nothing but
// "formal review" versus "preliminary review" for the same proposed event, and the regex's verdict
// matched the gate's on 4/4. All three authored frames for dohkar_preliminary_review — including
// defaultEventFrame — failed that lane's own signal.
//
// THE FIX DIRECTION IS THE DATA, NOT THE CLASSIFIER (Roman 2026-10-02): do not widen the regex
// loosely. A looser pattern accepts more vocabulary from the planner too, which is how a lexical
// check decays into no check at all. The authored frames are instructions we own; they should
// instruct in the vocabulary the gate requires. The gate's verdict semantics are untouched.
//
// This control enumerates every lane on every plan row and every frame that resolves to it, so a
// new lane or a reworded frame cannot quietly reintroduce the contradiction.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== AUTHORED-FRAME / LANE-SIGNAL INVARIANT (provider-free, $0) ===\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.STARTER_PLANS, { timeout: 30000 });

// Enumerate IN THE PAGE, against the live objects: every starter, every plan row that declares a
// lane menu, every frame anywhere in that row carrying a laneId + eventFrame, tested against the
// lane's own signalRx. The regex is never retyped here.
const report = await page.evaluate(() => {
  const out = { starters: [], pairs: [], lanesWithoutFrames: [], framesWithoutLane: [] };
  const plans = window.STARTER_PLANS || {};
  Object.keys(plans).forEach((starterId) => {
    const P = plans[starterId];
    if (!P || !Array.isArray(P.scenes)) return;
    out.starters.push(starterId);
    P.scenes.forEach((row) => {
      const lanes = Array.isArray(row && row.aftermathLanes) ? row.aftermathLanes : null;
      if (!lanes || !lanes.length) return;
      // Collect every { laneId, eventFrame } object nested anywhere in the row.
      const frames = [];
      const walk = (obj, path) => {
        if (!obj || typeof obj !== 'object') return;
        if (typeof obj.laneId === 'string' && typeof obj.eventFrame === 'string') {
          frames.push({ path: path || 'frame', laneId: obj.laneId, text: obj.eventFrame });
          return;
        }
        Object.keys(obj).forEach((k) => {
          if (k === 'aftermathLanes') return;        // the menu itself holds labels, not frames
          walk(obj[k], path ? path + '.' + k : k);
        });
      };
      walk(row, '');
      lanes.forEach((lane) => {
        if (!lane || !lane.id) return;
        const mine = frames.filter((f) => f.laneId === lane.id);
        if (!mine.length) {
          out.lanesWithoutFrames.push({ starterId, scene: row.n, laneId: lane.id,
            hasSignal: !!lane.signalRx });
          return;
        }
        mine.forEach((f) => {
          let matches = null;
          if (lane.signalRx) { lane.signalRx.lastIndex = 0; matches = lane.signalRx.test(f.text); }
          out.pairs.push({ starterId, scene: row.n, laneId: lane.id, framePath: f.path,
            hasSignal: !!lane.signalRx, matches,
            signalSource: lane.signalRx ? String(lane.signalRx) : null,
            excerpt: f.text.slice(0, 200) });
        });
      });
      frames.forEach((f) => {
        if (!lanes.some((l) => l && l.id === f.laneId)) {
          out.framesWithoutLane.push({ starterId, scene: row.n, framePath: f.path, laneId: f.laneId });
        }
      });
    });
  });
  return out;
});
await browser.close();

console.log('1. the enumeration found something to check');
t('at least one starter plan was read', report.starters.length > 0, JSON.stringify(report.starters));
t('at least one lane/frame pair exists', report.pairs.length > 0, 'pairs=' + report.pairs.length);
console.log('     starters: ' + JSON.stringify(report.starters));
console.log('     lane/frame pairs: ' + report.pairs.length);

console.log('\n2. every frame resolves to a lane that exists in its row\'s menu');
t('no frame points at a lane absent from the menu', report.framesWithoutLane.length === 0,
  JSON.stringify(report.framesWithoutLane));

console.log('\n3. THE INVARIANT — every authored frame satisfies its own lane\'s signal');
const withSignal = report.pairs.filter((p) => p.hasSignal);
const violations = withSignal.filter((p) => p.matches === false);
withSignal.forEach((p) => {
  console.log('     ' + (p.matches ? 'ok   ' : 'VIOLATES ') + p.laneId + '  ←  ' + p.framePath
    + '  (scene ' + p.scene + ')');
});
t('every lane in a menu declares a signal',
  report.pairs.every((p) => p.hasSignal),
  JSON.stringify(report.pairs.filter((p) => !p.hasSignal).map((p) => p.laneId)));
t('NO authored frame violates its own lane\'s signal', violations.length === 0,
  violations.length + ' violation(s): '
  + JSON.stringify(violations.map((v) => v.laneId + ' ← ' + v.framePath)));
if (violations.length) {
  console.log('\n     THE VIOLATIONS, in full — a planner following these is rejected for it:');
  violations.forEach((v) => {
    console.log('       · ' + v.laneId + ' ← ' + v.framePath);
    console.log('         signal : ' + String(v.signalSource).slice(0, 170));
    console.log('         frame  : ' + v.excerpt);
  });
}

// REPORTED, NOT ASSERTED. A menu lane with no authored frame is reachable only on the free-choice
// path: when the reader's card deterministically resolves a lane, any other lane is rejected before
// the signal check runs. That may well be intentional, and I have no evidence it is wrong. A
// control that stays permanently red for a design decision trains people to ignore it, so this is
// surfaced and left to the author rather than failed.
console.log('\n4. lanes with a signal but no authored frame (reported, not asserted)');
if (report.lanesWithoutFrames.length) {
  report.lanesWithoutFrames.forEach((l) => console.log('     · ' + l.laneId
    + '  (scene ' + l.scene + ', signal declared: ' + l.hasSignal + ') — no frame resolves to it, '
    + 'so it is reachable only where the lane is a free choice'));
} else {
  console.log('     none — every menu lane has at least one authored frame');
}

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
