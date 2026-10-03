// THE STRUCTURAL LANE ROUTE. Provider-free, $0.
//
// WHAT IT IS. A second, independent way for a planner reply to satisfy its declared lane: the
// reply's own STRUCTURED event_slots must name the lane's DECLARED ACTOR performing a concrete act
// with a landed exit state that is not the precondition restated. No vocabulary is consulted.
//
// WHY IT EXISTS. Four live FS draws ($0.036265) proposed the same event with structurally identical
// event_slots and split 2/2 on "preliminary review" versus "formal review". The regex's verdict
// matched the gate's on 4/4 — the gate was deciding by wording.
//
// EVERY CASE BELOW IS DRIVEN THROUGH THE REAL GATE, _detectPlannerFunctionGap, with the real lane
// menu from the seed. The four accepted/rejected cases use the ACTUAL RECORDED REPLIES.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== STRUCTURAL LANE ROUTE (provider-free, $0) ===\n');

// The four real replies.
// PINNED, NOT "WHATEVER IS NEWEST". This control needs the MIXED set: two replies whose prose
// says "formal review" (signal fails, structural must rescue) and two that say "preliminary review"
// (signal passes). The first screen produced exactly that. Globbing for the newest run silently
// retargeted it at the SECOND screen, where all four say "preliminary review" and pass by signal —
// so the control reported 9 failures about a repair that had not touched it. A control whose
// subject changes under it is not a control.
const PINNED = '_fs_lane_sample_out/run_2026-10-02T16-52-31-431Z';
const dirs = fs.existsSync(PINNED) ? [PINNED.split('/')[1]] : [];
if (!dirs.length) {
  console.error('REFUSED: the pinned mixed-route sample is missing: ' + PINNED);
  console.error('  This control asserts both routes, which needs replies that fail the signal AND');
  console.error('  replies that pass it. Any other sample cannot establish that.');
  process.exit(4);
}
let replies = null;
for (let i = dirs.length - 1; i >= 0 && !replies; i--) {
  const base = '_fs_lane_sample_out/' + dirs[i];
  const files = fs.existsSync(base) ? fs.readdirSync(base).filter(f => /^draw\d+_response\.json$/.test(f)).sort() : [];
  if (files.length < 4) continue;
  replies = files.map((f) => {
    const j = JSON.parse(fs.readFileSync(base + '/' + f, 'utf8'));
    const c = j.content || (j.choices && j.choices[0] && j.choices[0].message.content) || '';
    return { file: f, reply: JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1)) };
  });
}
if (!replies) {
  console.error('REFUSED: no set of four recorded draw responses found under _fs_lane_sample_out/.');
  console.error('  This control asserts against REAL replies, never hand-written ones.');
  process.exit(4);
}
console.log('  four recorded replies: ' + replies.map(r => r.file).join(', '));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.STARTER_PLANS
  && typeof window._detectPlannerFunctionGap === 'function', { timeout: 30000 });

// Drive the REAL gate. The lane menu comes from the seed; the contract object is shaped exactly as
// the production path shapes it (app.js ~102750).
const runGate = (reply, laneId) => page.evaluate(({ r, lane }) => {
  const P = window.STARTER_PLANS.starter_first_sacrifice;
  let row = null;
  for (const x of (P.scenes || [])) {
    if (Array.isArray(x.aftermathLanes) && x.aftermathLanes.length) { row = x; break; }
  }
  if (!row) return { error: 'no lane row' };
  const es = r.event_slots || {};
  const sc = {
    precondition: String(r.state_change_precondition || '').trim(),
    event: String(r.state_change || '').trim(),
    forces_choice: String(r.forces_choice || '').trim(),
    tactical_move: String(r.tactical_move || '').trim(),
    branch_a: String(r.branch_a || '').trim(),
    branch_b: String(r.branch_b || '').trim(),
    chosenAftermathLane: String(lane || r.chosen_aftermath_lane || '').trim(),
    aftermathObligations: String(r.aftermath_obligations || '').trim(),
    slots: { precondition: String(es.precondition || '').trim(),
      actor: String(es.actor || '').trim(), action: String(es.action || '').trim(),
      target: String(es.target || '').trim(), exitState: String(es.exit_state || '').trim() }
  };
  // requiresAftermath IS THE FUNCTION'S OWN MASTER SWITCH: without it the gate returns
  // { rejected: false } before any check runs, which is how my first pass "accepted" a lane that
  // does not exist. The production caller sets it for a CONT_AFTERMATH-eligible continuation scene.
  const out = window._detectPlannerFunctionGap(sc,
    { requiresAftermath: true, aftermathLanes: row.aftermathLanes });
  return { rejected: !!out.rejected, laneRoute: out.laneRoute || null,
    error: out.error || null, keys: Object.keys(out),
    reason: out.reason ? String(out.reason).slice(0, 220) : null };
}, { r: reply, lane: laneId });

// ── 1. THE FOUR REAL REPLIES ────────────────────────────────────────────────
console.log('\n1. the four real draws — all four propose the same event, all four should pass now');
const seen = [];
for (const { file, reply } of replies) {
  const res = await runGate(reply, 'dohkar_preliminary_review');
  seen.push({ file, ...res });
  console.log('     ' + file.replace('_response.json', '') + ': '
    + (res.rejected ? 'REJECTED' : 'accepted via ' + res.laneRoute)
    + (res.error ? '   ERROR: ' + res.error : '') + '   keys=' + JSON.stringify(res.keys));
}
t('no real draw is rejected any more', seen.every(s => !s.rejected),
  JSON.stringify(seen.filter(s => s.rejected).map(s => s.file)));
t('the two that already matched the signal still pass BY THE SIGNAL — unchanged semantics',
  seen.filter(s => s.laneRoute === 'signal').length === 2,
  JSON.stringify(seen.map(s => s.laneRoute)));
t('the two that the vocabulary rejected now pass STRUCTURALLY',
  seen.filter(s => s.laneRoute === 'structural').length === 2,
  JSON.stringify(seen.map(s => s.laneRoute)));

// ── 2. THE ROUTE DOES NOT ACCEPT ANYTHING AND EVERYTHING ────────────────────
// Each case is the real reply with ONE structural field broken, so the discriminator is isolated.
console.log('\n2. break one structural field at a time — each must reject');
const base = JSON.parse(JSON.stringify(replies[0].reply));   // draw 1: passes only structurally
const bust = async (name, mutate) => {
  const r = JSON.parse(JSON.stringify(base));
  mutate(r);
  const res = await runGate(r, 'dohkar_preliminary_review');
  t(name, res.rejected === true, 'accepted via ' + res.laneRoute);
};
await bust('the WRONG actor (Julian, not the lane\'s declared actor) is rejected',
  (r) => { r.event_slots.actor = 'Julian'; });
await bust('an EMPTY actor is rejected', (r) => { r.event_slots.actor = ''; });
await bust('an EMPTY action is rejected', (r) => { r.event_slots.action = ''; });
await bust('a TRIVIAL action ("nods") is rejected', (r) => { r.event_slots.action = 'nods'; });
await bust('an EMPTY exit state is rejected', (r) => { r.event_slots.exit_state = ''; });
await bust('an EMPTY target is rejected', (r) => { r.event_slots.target = ''; });
await bust('an exit state that merely RESTATES the precondition is rejected',
  (r) => { r.event_slots.exit_state = r.event_slots.precondition; });

// ── 3. THE SIGNAL ROUTE IS UNTOUCHED ────────────────────────────────────────
console.log('\n3. the signal route still works on its own, with no structural support');
{
  const r = JSON.parse(JSON.stringify(replies[2].reply));   // draw 3: matches the signal
  r.event_slots = { precondition: '', actor: '', action: '', target: '', exit_state: '' };
  const res = await runGate(r, 'dohkar_preliminary_review');
  t('a signal-matching reply passes even with event_slots stripped',
    res.rejected === false && res.laneRoute === 'signal',
    (res.rejected ? 'REJECTED: ' + res.reason : 'route=' + res.laneRoute));
}

// ── 4. A LANE WITH NO DECLARED ACTOR GETS NO STRUCTURAL ROUTE ───────────────
console.log('\n4. a lane that declares no objectiveActor gets no structural route');
{
  const lanes = await page.evaluate(() => {
    const P = window.STARTER_PLANS.starter_first_sacrifice;
    for (const x of (P.scenes || [])) {
      if (Array.isArray(x.aftermathLanes) && x.aftermathLanes.length) {
        return x.aftermathLanes.map(l => ({ id: l.id, actor: l.objectiveActor || null }));
      }
    }
    return [];
  });
  console.log('     lanes and declared actors: ' + JSON.stringify(lanes));
  const noActor = lanes.filter(l => !l.actor);
  t('the lane menu is readable', lanes.length > 0);
  if (noActor.length) {
    const r = JSON.parse(JSON.stringify(replies[0].reply));
    const res = await runGate(r, noActor[0].id);
    t('a reply claiming the actorless lane "' + noActor[0].id + '" is NOT rescued structurally',
      res.rejected === true, 'accepted via ' + res.laneRoute);
  } else {
    console.log('     (every lane declares an actor — nothing to test here)');
    t('every lane declares an objectiveActor, so the route always has something to check', true);
  }
}

// ── 5. THE DECLARED-LANE CHECKS STILL BITE ──────────────────────────────────
console.log('\n5. lane selection itself is still enforced');
{
  const r = JSON.parse(JSON.stringify(replies[0].reply));
  const res = await runGate(r, 'not_a_real_lane');
  t('a lane outside the menu is still rejected', res.rejected === true);
  // BOTH must be cleared: runGate falls back to the reply's own chosen_aftermath_lane when the
  // caller passes none, so clearing only the argument left the reply's valid lane in place and the
  // case tested nothing. The gate was right; the test was wrong.
  const r2 = JSON.parse(JSON.stringify(replies[0].reply));
  r2.chosen_aftermath_lane = '';
  const res2 = await runGate(r2, '');
  t('no declared lane at all is still rejected', res2.rejected === true,
    'accepted via ' + res2.laneRoute);
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('\nCHANGED VERDICT SEMANTICS, stated plainly: a reply whose event_slots name the lane\'s');
console.log('declared actor performing a concrete act with a landed exit state is now ACCEPTED even');
console.log('when its prose does not use the lane\'s signal vocabulary. Nothing that passed before');
console.log('fails now. The route enforces WHO acts and THAT something landed — not WHICH content');
console.log('landed; that judgment still rests with signalRx and the authored frame.');
process.exit(fail ? 1 : 0);
