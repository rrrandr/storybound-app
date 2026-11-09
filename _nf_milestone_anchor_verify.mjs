#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// MILESTONE ANCHOR — provider-free verification. NOTHING IS PAID, NO BROWSER.
//
// The change (Roman 2026-11-09): in _generateLiteraryPlotContract, `_curMs` no longer
// falls back to the first milestone with an event once every milestone has TRIGGERED.
//
// Checks:
//   1. a pending (untriggered) milestone still wins — and the FIRST pending one;
//   2. an all-triggered list produces NO milestone anchor (_curMs null, _v0 false),
//      so the planner takes the existing goal-only path;
//   3. an explicit scene assignment (authored plan row, generated outline row) still
//      replaces the generic milestone and gets the per-scene objective framing.
//
// The statements under test are EXTRACTED from public/app.js, not re-typed. The control
// is the pre-fix statement held as a fixed literal below, so the check does not depend on
// what HEAD happens to contain.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolved from this file's own location, so the check reads the app.js beside it — the
// working tree when run in place, or an extracted copy (e.g. the git index) when run there.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
// The statement as it stood before 2026-11-09. It anchored an all-triggered list to an
// already-triggered milestone; the control proves this check can tell the difference.
const LEGACY_STMT = '_curMs = _msArr.find(function (m) { return m && !m.triggered && m.event; }) || _msArr.find(function (m) { return m && m.event; }) || null;';
let PASS = 0, FAIL = 0;
const line = s => console.log(s);
const section = t => { line(''); line('='.repeat(78)); line(t); line('='.repeat(78)); };
function check(label, ok, detail) {
  if (ok) { PASS++; line('  PASS  ' + label); }
  else { FAIL++; line('  FAIL  ' + label + (detail !== undefined ? '  :: ' + String(detail).slice(0, 220) : '')); }
}

const work = fs.readFileSync(ROOT + '/public/app.js', 'utf8');

function fnBody(src) {
  const start = src.indexOf('async function _generateLiteraryPlotContract(');
  if (start < 0) throw new Error('_generateLiteraryPlotContract not found');
  return src.slice(start);
}
function selectionStmt(src) {
  const body = fnBody(src);
  const m = body.match(/^\s*_curMs = _msArr\.find\([^\n]*$/m);
  if (!m) throw new Error('milestone selection statement not found');
  return m[0].trim();
}
function between(src, a, b) {
  const i = src.indexOf(a); if (i < 0) throw new Error('marker not found: ' + a.slice(0, 60));
  const j = src.indexOf(b, i + a.length); if (j < 0) throw new Error('end marker not found: ' + b.slice(0, 60));
  return src.slice(i, j);
}

const ms = (event, triggered, atScene) => ({ event, triggered, atScene });
const runSelect = (stmt, msArr) => new Function('_msArr', 'var _curMs = null; ' + stmt + ' return _curMs;')(msArr);

const ALL_TRIGGERED = [ms('M1 the rite begins', true, 1), ms('M2 the wish twists', true, 3), ms('M3 the reckoning', true, 5)];
const MIXED = [ms('M1 the rite begins', true, 1), ms('', false, 2), ms('M3 the reckoning', false, 5), ms('M4 aftermath', false, 7)];

// ── PART 0 — the selection statement itself, and a control that bites ────────
section('PART 0 — the statement under test');
const workStmt = selectionStmt(work);
line('  app.js : ' + workStmt);
check('CONTROL BITES — the legacy statement anchors an all-triggered list to a triggered milestone',
  (() => { const r = runSelect(LEGACY_STMT, ALL_TRIGGERED); return !!(r && r.triggered === true); })(),
  JSON.stringify(runSelect(LEGACY_STMT, ALL_TRIGGERED)));
check('app.js does not contain the legacy statement', work.indexOf(LEGACY_STMT) === -1);

// ── PART 1 — a pending milestone still wins ──────────────────────────────────
section('PART 1 — a pending milestone still wins');
{
  const r = runSelect(workStmt, MIXED);
  check('first untriggered milestone WITH an event is selected', r && r.event === 'M3 the reckoning', JSON.stringify(r));
  check('an untriggered milestone with an empty event is skipped', r && r.event !== '', JSON.stringify(r));
  check('a triggered milestone earlier in the list is not selected', r && r.triggered === false, JSON.stringify(r));
  check('the first pending milestone wins over later pending ones',
    runSelect(workStmt, [ms('A first pending', false, 2), ms('B later pending', false, 4)]).event === 'A first pending');
}

// ── PART 2 — all triggered → no anchor → goal-only path ──────────────────────
section('PART 2 — all-triggered list produces no milestone anchor');
{
  const r = runSelect(workStmt, ALL_TRIGGERED);
  check('_curMs is null for an all-triggered list', r === null, JSON.stringify(r));
  check('_curMs is null for an empty list (pre-existing state, unchanged)', runSelect(workStmt, []) === null);
  check('_curMs is null when only event-less milestones are pending', runSelect(workStmt, [ms('', false, 1)]) === null);

  const v0Line = (fnBody(work).match(/^\s*var _v0 = [^\n]*$/m) || [''])[0].trim();
  check('_v0 is derived from _curMs', v0Line === 'var _v0 = !!(_mAnchorOn && _curMs);   // active only when there is a milestone to anchor to', v0Line);
  const v0Stmt = v0Line.replace(/\s*\/\/.*$/, '');   // the source line ends in a comment
  const v0 = new Function('_mAnchorOn', '_curMs', v0Stmt + '\nreturn _v0;')(true, r);
  check('_v0 is false → the "CURRENT MILESTONE (strategic anchor)" line and MILESTONE-EXEC are skipped', v0 === false);

  // The planner fallback text: `(_curMs && _curMs.event) || goal` — the existing goal-only path.
  const fb = fnBody(work).match(/'CURRENT MILESTONE \(distant TARGET[^\n]*JSON\.stringify\(\(_curMs && _curMs\.event\) \|\| goal\)/);
  check('planner fallback text reads `(_curMs && _curMs.event) || goal`', !!fb);
  const goal = 'Survive the issue with her name intact';
  check('with _curMs null the planner anchor resolves to the A-plot goal',
    ((r && r.event) || goal) === goal);
  check('_resolveObjectivePrecedence is handed the goal, not a triggered milestone',
    /_resolveObjectivePrecedence\(s, \(_curMs && _curMs\.event\) \|\| goal\)/.test(fnBody(work)));
}

// ── PART 3 — an explicit scene assignment still takes priority ───────────────
section('PART 3 — an explicit scene assignment still takes priority');
{
  const body = fnBody(work);
  const iSel = body.indexOf(workStmt);
  const iPlan = body.indexOf('_curMs = { event: _planScene.goal');
  const iOut = body.indexOf("var _asgOut = s._sceneAssignment;");
  check('order: milestone selection < authored-row override < outline-row override',
    iSel >= 0 && iPlan > iSel && iOut > iPlan, [iSel, iPlan, iOut].join(','));

  // Authored plan row: the real assignment statement, evaluated.
  const planStmt = between(body, '_curMs = { event: _planScene.goal', '_v0 = true;');
  const planFn = new Function('_curMs', '_planScene', '_openRow', '_effSpine', planStmt + ' return _curMs;');
  const planScene = { n: 4, goal: 'AUTHORED: Lirael is placed under review', requiredTruth: null, exitState: null,
                      participants: ['Lirael'], requiredTruths: null, presentGroups: null };
  [['all-triggered (null)', null], ['pending milestone', runSelect(workStmt, MIXED)]].forEach(([label, prior]) => {
    const r = planFn(prior, planScene, false, null);
    check('authored row replaces the generic anchor (' + label + ')', r && r.event === planScene.goal && r._fromPlan === true, JSON.stringify(r));
  });

  // Generated outline row: the real override block, evaluated.
  const outBlock = between(body, 'var _asgOut = s._sceneAssignment;', "      } catch (_) {}\n\n      // ═══ SCENE-SPINE v0");
  const outFn = new Function('s', '_curMs', 'console', outBlock + ' return _curMs;');
  const quiet = { log() {}, warn() {} };
  const asg = { source: 'issue-outline', event: 'OUTLINE: the ferryman impounds the tally-stick', sceneNumber: 4,
                stateChange: 'the tally is held', activeRoute: null, followsFrom: null, setsUp: null };
  [['all-triggered (null)', null], ['pending milestone', runSelect(workStmt, MIXED)]].forEach(([label, prior]) => {
    const s = { _sceneAssignment: asg, _spineConstraints: '' };
    const r = outFn(s, prior, quiet);
    check('outline assignment replaces the generic anchor (' + label + ')', r && r.event === asg.event && r._fromOutline === true, JSON.stringify(r));
    check('  and the author verbatim channel carries the same event (' + label + ')', s._spineEventVerbatim === asg.event, s._spineEventVerbatim);
  });
  {
    const authored = planFn(null, planScene, false, null);
    const r = outFn({ _sceneAssignment: asg, _spineConstraints: '' }, authored, quiet);
    check('outline row does NOT overturn an authored row', r === authored && r._fromPlan === true, JSON.stringify(r));
  }
  {
    const r = outFn({ _sceneAssignment: null, _spineConstraints: '' }, runSelect(workStmt, ALL_TRIGGERED), quiet);
    check('no assignment + all triggered → _curMs stays null (goal-only path)', r === null, JSON.stringify(r));
  }

  // The framing gate: an assignment gets the per-scene objective framing.
  const gate = (body.match(/var _scUsr = \(\(_curMs && \(_curMs\._fromPlan \|\| _curMs\._fromOutline\)\)/) || [null])[0];
  check('per-scene objective framing is gated on _fromPlan || _fromOutline', !!gate);
  const gateFn = new Function('_curMs', 'return !!(_curMs && (_curMs._fromPlan || _curMs._fromOutline));');
  check('assignment-derived anchor takes the "THIS SCENE\'S OBJECTIVE" branch', gateFn(outFn({ _sceneAssignment: asg, _spineConstraints: '' }, null, quiet)) === true);
  check('null anchor takes the "distant TARGET" goal-only branch', gateFn(null) === false);
}

line('');
line('RESULT: ' + PASS + ' passed, ' + FAIL + ' failed');
process.exit(FAIL ? 1 : 0);
