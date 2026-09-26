// RESERVED CANON — RELEASE CONDITION CONTROL. "Not yet" must not mean "never". Zero dispatches, $0.
//
// The reserved-content guard and the authoring directive both derive from `worldTruths`, which carry
// NO scene number. So once the inquiry was reserved it was reserved for all twenty scenes — including
// scene 4, the scene the seed WROTE for it ("A Chayr and two Dohkars formally open an inquiry into
// the PC"). A permanent ban is not a story rule.
//
// The due signal is seed-owned and pre-existing: a STARTER_PLANS row `n` carrying `reservedEvents`
// declares the event belonging to that row, and production has read it as `p.n > sceneNum` since
// 2026-09-11. This control proves the guard and the directive now both honour it, at real scene
// numbers, against the REAL First Sacrifice `inquiry_opened` reservation — no synthetic seed.
//
// usage: node _reserved_release_condition_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_reserved_release_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const note = (t) => console.log('    ' + t);
const section = (t) => console.log('\n=== ' + t + ' ===');

// The ACTUAL failing state_change from the paid weak-turn run, and the real offending prose line.
const RESERVED_PLAN = 'A preliminary review will convene in three days at the Open, where a Chayr and two Dohkars will hear the matter of the Sacrificiant\'s conduct';
const DEMAND_ONLY  = 'Julian demands that Lirael answer for her conduct, and the assembly takes it up';
// Scene 4's own authored goal — the thing the seed scheduled. This must be permitted AT scene 4.
const DUE_PLAN     = 'A Chayr and two Dohkars formally open a formal inquiry into Lirael, and the Chayr convenes it at the Open';
// Row 4's REVISED beat — early procedural pressure that convenes nothing. Must pass at scene 4.
const REVISED_ROW4 = 'The presiding Dohkar serves Lirael formal notice that her conduct at the rite is under investigation and names the restrictions she must keep while it runs';

(async () => {
  console.log('=== RESERVED CANON — RELEASE CONDITION (zero dispatches, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._reservedGroupsInForce && window._reservedReleaseFor
    && window._detectReservedContentBreach && window._buildReservedContentAuthoringDirective,
    { timeout: 30000 });

  section('1. THE DUE SIGNAL IS READ FROM REAL SEED DATA, NOT HARDCODED');
  const sig = await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    const groups = window._seedReservedMarkers(s);
    return { count: groups.length, first: groups[0] || null,
             release: groups[0] ? window._reservedReleaseFor(groups[0], s) : null };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'release_signal.json'), JSON.stringify(sig, null, 2));
  note('release: ' + JSON.stringify(sig.release));
  ok('First Sacrifice has exactly one reserved world-truth group', sig.count === 1, String(sig.count));
  ok('its release is resolved to the REAL reservedEvents id "inquiry_opened"',
    sig.release && sig.release.eventId === 'inquiry_opened', JSON.stringify(sig.release));
  ok('...scheduled at scene 14 — LATE Issue 1, taken from the plan ROW that carries it',
    sig.release && sig.release.dueScene === 14, JSON.stringify(sig.release));
  ok('...and it says WHICH structure supplied the number',
    /reservedEvents row n=14/.test((sig.release || {}).via || ''), (sig.release || {}).via);
  ok('the link was made lexically on >=2 of the seed\'s own markers',
    (sig.release.matchedMarkers || []).length >= 2, JSON.stringify(sig.release.matchedMarkers));

  section('2. THE FOUR STATES — DETERMINISTIC PLANNER/OBJECTIVE GATE');
  const four = await page.evaluate((f) => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    window._canonAuditEnabled = false;                 // free gate must stand alone
    const mk = (sc) => ({ state_change: sc, event_slots: { actor: 'the presiding Dohkar',
      action: 'announces', target: 'the assembly', exit_state: sc, mechanism_grounding: 'ordinary' } });
    const run = (sc, sceneNum) => {
      const plan = mk(sc);
      const breach = window._detectReservedContentBreach(plan, s, sceneNum);
      return { breach: breach ? { markers: breach.markers, dueScene: breach.dueScene,
        currentScene: breach.currentScene, eventId: breach.eventId } : null };
    };
    const out = {
      s1_early_reserved:  run(f.RESERVED_PLAN, 2),
      s2_early_pressure:  run(f.DEMAND_ONLY, 2),
      s3_due_reserved:    run(f.DUE_PLAN, 14),
      s3_due_oldplan:     run(f.RESERVED_PLAN, 14),
      s4_other_due_scene: run(f.RESERVED_PLAN, 3),
      at4_reserved:       run(f.RESERVED_PLAN, 4),
      at4_revised:        run(f.REVISED_ROW4, 4),
      at13_reserved:      run(f.RESERVED_PLAN, 13),
      inForceAt2: window._reservedGroupsInForce(s, 2),
      inForceAt3: window._reservedGroupsInForce(s, 3),
      inForceAt4: window._reservedGroupsInForce(s, 4),
      inForceAt13: window._reservedGroupsInForce(s, 13),
      inForceAt14: window._reservedGroupsInForce(s, 14)
    };
    delete window._canonAuditEnabled;
    return out;
  }, { RESERVED_PLAN, DEMAND_ONLY, DUE_PLAN, REVISED_ROW4 });
  fs.writeFileSync(path.join(OUT_DIR, 'four_states_gate.json'), JSON.stringify(four, null, 2));

  ok('STATE 1 — early scene (2) + reserved markers => REJECTED',
    !!four.s1_early_reserved.breach, JSON.stringify(four.s1_early_reserved));
  ok('...and the rejection reports the schedule it judged against (due 14, at 2)',
    four.s1_early_reserved.breach.dueScene === 14 && four.s1_early_reserved.breach.currentScene === 2,
    JSON.stringify(four.s1_early_reserved.breach));
  ok('STATE 2 — early scene (2) + demand/pressure only => ALLOWED',
    four.s2_early_pressure.breach === null, JSON.stringify(four.s2_early_pressure));
  ok('STATE 3 — DUE scene (14) + the reserved event => ALLOWED, the ban lifts',
    four.s3_due_reserved.breach === null, JSON.stringify(four.s3_due_reserved));
  ok('...including the exact plan text that was rejected at scene 2 — same words, now permitted',
    four.s3_due_oldplan.breach === null, JSON.stringify(four.s3_due_oldplan));
  ok('SCENE 4 NO LONGER RELEASES inquiry_opened — the old calendar is gone',
    four.inForceAt4.inForce.length === 1 && four.inForceAt4.released.length === 0,
    JSON.stringify(four.inForceAt4));
  ok('...so the OLD scene-4 formal-inquiry plan is now REJECTED at scene 4',
    !!four.at4_reserved.breach && four.at4_reserved.breach.dueScene === 14,
    JSON.stringify(four.at4_reserved));
  ok('...and the REVISED scene-4 beat (notice + restriction, nothing convened) is ALLOWED at scene 4',
    four.at4_revised.breach === null, JSON.stringify(four.at4_revised));
  ok('still reserved at 13, the scene before it is due — the boundary is exact',
    !!four.at13_reserved.breach && four.inForceAt13.inForce.length === 1,
    JSON.stringify(four.at13_reserved));
  ok('released at 14', four.inForceAt14.released.length === 1 && four.inForceAt14.inForce.length === 0,
    JSON.stringify(four.inForceAt14));
  ok('STATE 4 — at scene 3 (the DUE scene of a different real reservation, price_identified) the'
    + ' inquiry is STILL reserved', !!four.s4_other_due_scene.breach,
    JSON.stringify(four.s4_other_due_scene));
  note('in force @2: ' + four.inForceAt2.inForce.length + '  @3: ' + four.inForceAt3.inForce.length
     + '  @4: ' + four.inForceAt4.inForce.length + ' (released @4: ' + four.inForceAt4.released.length + ')');
  ok('release is scene-ordered: withheld at 2, 3, 4 and 13; released at 14',
    four.inForceAt2.inForce.length === 1 && four.inForceAt3.inForce.length === 1
    && four.inForceAt4.inForce.length === 1 && four.inForceAt13.inForce.length === 1
    && four.inForceAt14.inForce.length === 0,
    JSON.stringify([2, four.inForceAt2.inForce.length, 3, four.inForceAt3.inForce.length,
      4, four.inForceAt4.inForce.length, 13, four.inForceAt13.inForce.length, 14, four.inForceAt14.inForce.length]));

  section('3. THE FOUR STATES — AUTHORING DIRECTIVE (SAME SIGNAL)');
  const dir = await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    const at = (n) => window._buildReservedContentAuthoringDirective(n);
    const sysAt = (n) => {
      s._stagedAuthoringSceneIndex = n - 1;              // drive the REAL accessor, not an override
      let sys = ''; try { sys = window._buildCGScreenplaySystemPrompt() || ''; } catch (e) { sys = 'ERR ' + e.message; }
      delete s._stagedAuthoringSceneIndex;
      return sys;
    };
    return { d2: at(2), d3: at(3), d4: at(4), d13: at(13), d14: at(14),
             sys2: sysAt(2), sys4: sysAt(4), sys14: sysAt(14) };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'directive_scene2.txt'), dir.d2 || '(empty)');
  fs.writeFileSync(path.join(OUT_DIR, 'directive_scene4.txt'), dir.d4 || '(empty)');
  ok('STATE 1 — at scene 2 the author IS forbidden the reserved composition',
    dir.d2.length > 0 && /DO NOT name the body that would hear it/.test(dir.d2));
  ok('STATE 4 — at scene 3 it is STILL forbidden', dir.d3.length > 0);
  ok('at scene 4 it is STILL forbidden — the author follows the corrected calendar too',
    dir.d4.length > 0, JSON.stringify(dir.d4).slice(0, 200));
  ok('at scene 13 it is still forbidden', dir.d13.length > 0);
  ok('STATE 3 — at the DUE scene (14) the directive is EMPTY: the author is not forbidden its own scene',
    dir.d14 === '', JSON.stringify(dir.d14).slice(0, 300));
  ok('and that reaches the REAL CG author payload — block present at scene 2',
    dir.sys2.indexOf('RESERVED CANON — NOT YET (HARD RULE)') !== -1);
  ok('...still present at scene 4, where it used to vanish',
    dir.sys4.indexOf('RESERVED CANON — NOT YET (HARD RULE)') !== -1);
  ok('...and ABSENT from the real payload at scene 14, via the production scene accessor',
    dir.sys14.indexOf('RESERVED CANON') === -1);

  section('4. LITERARY AND CG SHARE THE RELEASE BEHAVIOUR BY CONSTRUCTION');
  // Not "latent so it does not matter": the literary opening must have the same lifecycle. Both
  // call sites invoke the SAME function with the SAME arity, so neither can have its own schedule.
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  const callSites = (src.match(/_buildReservedContentAuthoringDirective\(\s*\)/g) || []).length;
  ok('there is ONE definition of the directive — no literary-only variant',
    (src.match(/function _buildReservedContentAuthoringDirective/g) || []).length === 1);
  ok('both call sites call it with no scene override, so both inherit _currentSceneNumber',
    callSites === 2, String(callSites));
  ok('one definition of the release helper too — the gate and the directive cannot disagree',
    (src.match(/function _reservedGroupsInForce/g) || []).length === 1);
  ok('the directive resolves its scene through the shared accessor, not its own arithmetic',
    /_reservedGroupsInForce\(s, sceneNum\)/.test(src));
  ok('...and the helper falls back to _currentSceneNumber when no override is passed',
    /_currentSceneNumber\(s\) : 1\)/.test(src.replace(/\s+/g, ' ')) || /_currentSceneNumber === 'function'\) \? _currentSceneNumber\(s\)/.test(src));
  // A literary OPENING is scene 1 by the shared accessor, so it is before every due scene.
  const lit = await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s._isScene1Build = true; delete s._stagedAuthoringSceneIndex;
    const openingDirective = window._buildReservedContentAuthoringDirective();
    const openingInForce = window._reservedGroupsInForce(s);
    delete s._isScene1Build;
    s.turnCount = 12;                                    // literary continuation: turnCount + 2 = 14
    const contInForce = window._reservedGroupsInForce(s);
    const contDirective = window._buildReservedContentAuthoringDirective();
    delete s.turnCount;
    return { openingLen: openingDirective.length, openingScene: openingInForce.inForce[0] ? openingInForce.inForce[0].currentScene : null,
             contScene: (contInForce.released[0] || contInForce.inForce[0] || {}).currentScene,
             contInForce: contInForce.inForce.length, contLen: contDirective.length };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'literary_lifecycle.json'), JSON.stringify(lit, null, 2));
  note('literary: opening scene=' + lit.openingScene + ' dirLen=' + lit.openingLen
     + ' | continuation scene=' + lit.contScene + ' inForce=' + lit.contInForce + ' dirLen=' + lit.contLen);
  ok('a literary OPENING is scene 1 by the shared accessor, so the rule applies there',
    lit.openingScene === 1 && lit.openingLen > 0, JSON.stringify(lit));
  ok('a literary CONTINUATION at turnCount=12 resolves to scene 14 and RELEASES the event',
    lit.contScene === 14 && lit.contInForce === 0 && lit.contLen === 0, JSON.stringify(lit));

  section('5. NOTHING ELSE MOVED');
  const others = await page.evaluate(() => {
    const plan = STARTER_PLANS['starter_first_sacrifice'];
    const rows = (plan.scenes || []).filter((r) => r && Array.isArray(r.reservedEvents))
      .map((r) => ({ n: r.n, ids: r.reservedEvents.map((e) => e.id) }));
    return { rows, sealed: (plan.sealedEvents || []).map((e) => ({ id: e.id, unsealsAtScene: e.unsealsAtScene })),
             row4goal: (plan.scenes.find((r) => r && r.n === 4) || {}).goal || '',
             row14goal: (plan.scenes.find((r) => r && r.n === 14) || {}).goal || '',
             row19goal: (plan.scenes.find((r) => r && r.n === 19) || {}).goal || '',
             // Where is the panel first SEATED in person? That is what fixes the due date.
             chayrInPerson: (plan.scenes || []).filter((r) => r && r.stage
               && (r.stage.participants || []).some((pp) => pp && pp.ref === 'role:first_sacrifice_inquiry_chayr'
                    && pp.presence === 'IN_PERSON')).map((r) => r.n) };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'schedule_after.json'), JSON.stringify(others, null, 2));
  note('reserved rows: ' + JSON.stringify(others.rows));
  ok('price_identified is UNMOVED on row 3',
    others.rows.some((r) => r.n === 3 && r.ids.indexOf('price_identified') !== -1), JSON.stringify(others.rows));
  ok('inquiry_opened is on row 14 and NOWHERE else',
    others.rows.filter((r) => r.ids.indexOf('inquiry_opened') !== -1).map((r) => r.n).join() === '14',
    JSON.stringify(others.rows));
  ok('row 4 carries NO reservedEvents at all now',
    !others.rows.some((r) => r.n === 4), JSON.stringify(others.rows));
  ok('exactly TWO rows carry reservedEvents — nothing was added or dropped',
    others.rows.length === 2, JSON.stringify(others.rows));
  ok('both sealedEvents still unseal at 16 — untouched',
    others.sealed.length === 2 && others.sealed.every((e) => e.unsealsAtScene === 16), JSON.stringify(others.sealed));
  ok('row 4 no longer names the panel, the venue, or a convening',
    !/Chayr/.test(others.row4goal) && !/two Dohkars/.test(others.row4goal)
    && !/The Open/.test(others.row4goal) && !/formally open an inquiry/.test(others.row4goal),
    others.row4goal.slice(0, 260));
  ok('...and it is still an early pressure beat with notice and restriction',
    /under investigation/.test(others.row4goal) && /restrictions/.test(others.row4goal), others.row4goal.slice(0, 200));
  ok('row 14 now authors the convening it owns',
    /Chayr and two Dohkars/.test(others.row14goal) && /The Open/.test(others.row14goal), others.row14goal.slice(0, 200));
  ok('row 19 is back to its original goal — the wrong date left no residue',
    others.row19goal === 'She must decide whether to expose the truth or let history condemn her.', others.row19goal);
  // THE DATE IS DERIVED, NOT PREFERRED: releasing later than the first in-person seating would leave
  // that row staging a panel canon says is not constituted yet.
  note('Chayr seated IN_PERSON on rows: ' + JSON.stringify(others.chayrInPerson));
  ok('the due row IS the first row that seats the panel in person — no row stages it earlier',
    others.chayrInPerson.length > 0 && Math.min.apply(null, others.chayrInPerson) === 14,
    JSON.stringify(others.chayrInPerson));

  section('6. CONTAINMENT');
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
