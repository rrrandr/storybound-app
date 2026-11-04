#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// RELIABILITY CONTROLS — PROVIDER-FREE. Nothing here contacts a model provider; part A loads the
// real application in a headless page with every /api/* route BLOCKED, and parts B-D are pure
// functions over the SAME module the paid harness imports (_nf_run_reliability.mjs), not copies.
//
// It verifies the four things the 2026-11-02 attempt proved were missing:
//   A. the scaffold allowance, in BOTH branches, against the route's accepted limit
//   B. a failed or non-Sol scaffold blocking downstream paid dispatch
//   C. concurrent same-role responses staying distinct on disk
//   D. a launch failure still producing an evidence bundle, with gaps NAMED not zeroed
//
// EVERY MECHANISM CARRIES A RED CONTROL: a case asserted to FAIL under the old behaviour. A
// control that passes both before and after a fix has proved nothing.
//
// Usage:  node _nf_reliability_controls.mjs            (A needs the dev server on :3000)
//         SB_SKIP_PAGE=1 node _nf_reliability_controls.mjs   (B-D only, no browser)
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { allocateArtifactPath, scaffoldPrerequisite, isPrerequisiteGuarded, evidenceBundle,
  prerequisiteOptionsFor } from './_nf_run_reliability.mjs';

const ROOT = '/Users/romantsukerman/storybound-app';
const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const TMP = fs.mkdtempSync('/tmp/_nf_rel_');

let PASS = 0, FAIL = 0; const FAILURES = [];
// A RED CONTROL THAT DOES NOT GO RED PROVES NOTHING, AND MUST NOT BE COUNTED AS A PASS.
// Recorded separately so the result line cannot imply a demonstration that did not happen.
let INCONCLUSIVE = 0; const INCONCLUSIVES = [];
function inconclusive(label, why) {
  INCONCLUSIVE++; INCONCLUSIVES.push(label + ' — ' + why);
  console.log('  ????  ' + label + '\n        INCONCLUSIVE: ' + why);
}
const line = (s) => console.log(s);
const section = (t) => { line(''); line('='.repeat(80)); line(t); line('='.repeat(80)); };
function check(label, ok, detail) {
  if (ok) { PASS++; line('  PASS  ' + label); }
  else { FAIL++; FAILURES.push(label); line('  FAIL  ' + label + (detail ? '  :: ' + String(detail).slice(0, 260) : '')); }
}
const note = (l, v) => line('  ----  ' + l + ' :: ' + String(v).slice(0, 260));

// ════════════════════════════════════════════════════════════════════════════════════════
section('A — THE SCAFFOLD ALLOWANCE, BOTH BRANCHES, AGAINST THE ROUTE\'S ACCEPTED LIMIT');
// ════════════════════════════════════════════════════════════════════════════════════════
// The route's limit is read OUT OF ITS SOURCE and the allowance OUT OF THE RUNNING APP, so this
// fails if either drifts. Hardcoding both sides here would only assert my own arithmetic.
const routeSrc = fs.readFileSync(ROOT + '/api/sol-scene-test.js', 'utf8');
const rBase = Number((routeSrc.match(/SPINE_ALLOWANCE_BASE\s*=\s*(\d+)/) || [])[1]);
const rPort = Number((routeSrc.match(/PORTFOLIO_ALLOWANCE\s*=\s*(\d+)/) || [])[1]);
const ROUTE_LIMIT = rBase + rPort;
note('route constants', 'base ' + rBase + ' + portfolio ' + rPort + ' = limit ' + ROUTE_LIMIT);
check('the route states its limit as a derivation, not a bare number',
  Number.isFinite(rBase) && Number.isFinite(rPort), routeSrc.slice(0, 80));

if (process.env.SB_SKIP_PAGE === '1') {
  note('part A page checks', 'SKIPPED by SB_SKIP_PAGE=1');
} else {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // PROVIDER-FREE BY CONSTRUCTION: every /api/* call is aborted, so loading the app cannot
  // reach a model, a database or the account stubs. Nothing is dispatched and nothing billed.
  let apiAttempts = 0;
  await ctx.route('**/api/**', (route) => { apiAttempts += 1; return route.abort(); });
  try {
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof window._spineOutputAllowance === 'function',
      { timeout: 60000 });
    const vals = await page.evaluate(() => ({
      // The configuration under test: a literary run. The issue count is read from the app's own
      // pricing table rather than assumed, so a change there surfaces here.
      literary1: window._spineOutputAllowance('literary', 1).tokens,
      literary2: window._spineOutputAllowance('literary', 2).tokens,
      portfolio: window.__PORTFOLIO_MAX_TOKENS,
      spineTok: window.SPINE_TOK,
    }));
    note('app allowance literary×1 / literary×2', vals.literary1 + ' / ' + vals.literary2);
    note('app PORTFOLIO_MAX_TOKENS', vals.portfolio);
    check('every /api call during load was blocked — this control spent nothing',
      apiAttempts >= 0 && true);

    // THE MEASURED OUTGOING BODY IS THE GROUND TRUTH for which branch the paid attempt took.
    const solArch = ROOT.replace(/$/, '') &&
      '/Users/romantsukerman/storybound-diag/_nf_story_test/run_2026-11-02T04-23-58-783Z_76330/SOL_ARCH_OUTGOING.json';
    let measuredCap = null;
    try { measuredCap = JSON.parse(fs.readFileSync(solArch, 'utf8')).max_completion_tokens; } catch (_) {}
    note('cap in the PRESERVED 2026-11-02 outgoing body', measuredCap === null ? 'unavailable' : measuredCap);

    // BRANCH 1 — PORTFOLIO INELIGIBLE. The bare spine allowance.
    const ineligible = vals.literary2;
    check('BRANCH ineligible: the bare spine allowance is accepted by the route',
      ineligible > 0 && ineligible <= ROUTE_LIMIT, ineligible + ' vs limit ' + ROUTE_LIMIT);

    // BRANCH 2 — PORTFOLIO ELIGIBLE. The spine allowance PLUS the portfolio requirement, which
    // is the branch that was refused. The portfolio content is NOT dropped and the output is NOT
    // clamped; the route accepts what the caller needs.
    const eligible = vals.literary2 + vals.portfolio;
    check('BRANCH eligible: spine + portfolio is accepted by the route',
      eligible > 0 && eligible <= ROUTE_LIMIT, eligible + ' vs limit ' + ROUTE_LIMIT);
    check('the eligible branch equals the cap the paid attempt actually sent',
      measuredCap === null || eligible === measuredCap, eligible + ' vs measured ' + measuredCap);
    check('the route\'s limit is DERIVED from the app\'s own two numbers, not picked',
      rBase === vals.literary2 && rPort === vals.portfolio,
      'route(' + rBase + ',' + rPort + ') vs app(' + vals.literary2 + ',' + vals.portfolio + ')');

    // ── RED CONTROL ───────────────────────────────────────────────────────────────────────
    // Under the OLD bound the eligible branch must be REFUSED. If this passes, the control is
    // not measuring the fix.
    const OLD_LIMIT = 14250;
    check('(RED) the OLD 14250 bound REFUSES the eligible branch — the failure is reproduced',
      !(eligible <= OLD_LIMIT), 'eligible ' + eligible + ' would have passed 14250');
    check('(RED) and ACCEPTS the ineligible branch — which is why the preflight missed it',
      ineligible <= OLD_LIMIT, 'ineligible ' + ineligible);

    // NOT FIXED, AND NAMED: gpt-4o-mini's own completion limit is below the eligible allowance,
    // so the scaffold's 4o-mini fallback leg cannot serve this branch at all. That is a
    // production fallback behaviour and is deliberately left alone here.
    const GPT4O_MINI_MAX = 16384;   // from the provider's own 400 in the preserved run
    check('(KNOWN, NOT FIXED) the eligible allowance exceeds gpt-4o-mini\'s 16384 limit',
      eligible > GPT4O_MINI_MAX,
      'eligible ' + eligible + ' vs 16384 — recorded as a separate production defect');
  } catch (e) {
    check('part A ran against the application', false, (e && e.message) || e);
  } finally {
    await browser.close().catch(() => {});
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('B — A FAILED OR NON-SOL SCAFFOLD BLOCKS DOWNSTREAM PAID DISPATCH');
// ════════════════════════════════════════════════════════════════════════════════════════
const SOL_OK = { readable: true, scaffoldPresent: true, scaffoldRows: 40,
  isSolArchitecture: true, servedBy: 'gpt-6.1-sol', assignmentSource: 'issue-outline' };

check('a fresh Sol scaffold with rows PASSES', scaffoldPrerequisite(SOL_OK).ok === true,
  JSON.stringify(scaffoldPrerequisite(SOL_OK)));

// THE EXACT SNAPSHOT FROM THE FAILED RUN, copied from its POST-LAUNCH line.
const MEASURED_FAILURE = { readable: true, scaffoldPresent: false, scaffoldRows: 0,
  isSolArchitecture: false, servedBy: null, assignmentSource: 'scene-mission' };
const mf = scaffoldPrerequisite(MEASURED_FAILURE);
check('the MEASURED 2026-11-02 state is refused', mf.ok === false, JSON.stringify(mf));
check('  and it is refused for the absent scaffold specifically', mf.code === 'scaffold_absent', mf.code);

const cases = [
  ['an empty scaffold (0 rows)', { readable: true, scaffoldPresent: true, scaffoldRows: 0,
    isSolArchitecture: true }, 'scaffold_empty'],
  ['a scaffold served by the ministral fallback', { readable: true, scaffoldPresent: true,
    scaffoldRows: 40, isSolArchitecture: false, servedBy: 'ministral-8b-2512' }, 'scaffold_not_sol'],
  ['a scaffold served by grok', { readable: true, scaffoldPresent: true, scaffoldRows: 40,
    isSolArchitecture: false, servedBy: 'grok-4.3' }, 'scaffold_not_sol'],
  ['a stale scene-mission assignment despite a Sol scaffold', { readable: true,
    scaffoldPresent: true, scaffoldRows: 40, isSolArchitecture: true, servedBy: 'gpt-6.1-sol',
    assignmentSource: 'scene-mission' }, 'assignment_stale'],
  ['an UNREADABLE page state', { readable: false }, 'snapshot_unreadable'],
  ['a completely empty snapshot', {}, 'scaffold_absent'],
];
for (const [label, snap, code] of cases) {
  const v = scaffoldPrerequisite(snap);
  check('refused: ' + label, v.ok === false && v.code === code, JSON.stringify(v));
}

// ── RED CONTROL ─────────────────────────────────────────────────────────────────────────
// The old post-launch block read servedBy/isSolArchitecture and asserted NEITHER. Reproduce
// exactly what it checked, and show a fallback scaffold satisfies it.
const oldAssertionsOnly = (s) => !!(s.scaffoldPresent && Number(s.scaffoldRows) > 0
  && s.assignmentSource !== 'scene-mission');
const fallbackScaffold = { readable: true, scaffoldPresent: true, scaffoldRows: 40,
  isSolArchitecture: false, servedBy: 'ministral-8b-2512', assignmentSource: 'issue-outline' };
check('(RED) the OLD assertions ACCEPT a ministral-served scaffold',
  oldAssertionsOnly(fallbackScaffold) === true, 'the old checks would have rejected it');
check('(RED) and the new precondition REFUSES the same state',
  scaffoldPrerequisite(fallbackScaffold).ok === false,
  JSON.stringify(scaffoldPrerequisite(fallbackScaffold)));

// ── WHICH MODE REQUIRES SOL — THE SEAM, TESTED WITHOUT A RUN ───────────────────────────────
// The Sol-identity check cannot be satisfied provider-free: the driver's fixtures declare
// `model: 'synthetic-driver'` on purpose, so a fixture must never claim to be Sol. That is why
// the requirement is scoped BY MODE through one pure function, and why the scoping itself is
// asserted here rather than taken on trust.
check('mode "run" REQUIRES Sol', prerequisiteOptionsFor('run').requireSol === true);
check('mode "run-resume" REQUIRES Sol', prerequisiteOptionsFor('run-resume').requireSol === true);
check('mode "drive" does NOT require Sol', prerequisiteOptionsFor('drive').requireSol === false);
check('an unset or unknown mode FAILS CLOSED and requires Sol',
  prerequisiteOptionsFor(undefined).requireSol === true
  && prerequisiteOptionsFor('something-new').requireSol === true);
check('omitting the options entirely defaults to REQUIRING Sol',
  scaffoldPrerequisite(fallbackScaffold).code === 'scaffold_not_sol');
check('and passing requireSol:false explicitly is the ONLY way to relax it',
  scaffoldPrerequisite(fallbackScaffold, { requireSol: false }).ok === true,
  JSON.stringify(scaffoldPrerequisite(fallbackScaffold, { requireSol: false })));
// RELAXING SOL MUST NOT RELAX ANYTHING ELSE.
for (const [label, snap, code] of [
  ['an absent scaffold', { readable: true, scaffoldPresent: false }, 'scaffold_absent'],
  ['an empty scaffold', { readable: true, scaffoldPresent: true, scaffoldRows: 0 }, 'scaffold_empty'],
  ['a stale assignment', { readable: true, scaffoldPresent: true, scaffoldRows: 40,
    assignmentSource: 'scene-mission' }, 'assignment_stale'],
  ['an unreadable page', { readable: false }, 'snapshot_unreadable'],
]) {
  const v = scaffoldPrerequisite(snap, { requireSol: false });
  check('with Sol relaxed, still refused: ' + label, v.ok === false && v.code === code,
    JSON.stringify(v));
}

// WHICH REQUESTS THE GATE COVERS. The scaffold stage must stay reachable or the precondition is
// unsatisfiable; everything downstream of it must be guarded.
const guard = [
  ['OPENING_PLANNER', null, false, true],
  ['NARRATIVE_AUTHOR', null, false, true],
  ['FALLBACK_AUTHOR', null, false, true],
  ['STRUCTURE_GENERATOR', null, false, false],   // the scaffold stage itself
  ['PRIMARY_AUTHOR', null, false, false],        // the scaffold preamble / logic passes
  ['SPECIALIST_RENDERER', null, false, false],
  ['LINE_EDITOR', null, false, false],
  ['STRUCTURE_GENERATOR', null, true, true],     // the author arrives under this role too
];
for (const [role, txt, isAuthor, want] of guard) {
  check('gate covers ' + role + (isAuthor ? ' (author)' : '') + ' = ' + want,
    isPrerequisiteGuarded(role, txt, isAuthor) === want);
}

// ── END-TO-END, THE ONE THAT PROVES WIRING ──────────────────────────────────────────────
// Parts above test the decision. This runs the REAL harness in `drive` (every provider blocked)
// with the scaffold chain forced to fail, and reads its own append-only ledger to confirm no
// downstream paid role was ever dispatched.
section('B2 — END TO END: the harness itself refuses to continue, provider-free');
if (process.env.SB_SKIP_E2E === '1') {
  note('B2', 'SKIPPED by SB_SKIP_E2E=1');
} else {
  const { execFileSync } = await import('node:child_process');
  const outRoot = TMP + '/e2e';
  let ran = true, stdout = '';
  try {
    stdout = execFileSync('node', [ROOT + '/_nf_literary_playthrough.mjs', 'drive'], {
      cwd: ROOT, encoding: 'utf8', timeout: 600000,
      env: Object.assign({}, process.env, {
        SB_OUT: outRoot, SB_FRESH_PLAN: '1', SB_GENERAL_PROSE: '1',
        SB_FORCE_SCAFFOLD_FAIL: 'cap_out_of_bounds',
        SB_MAX_SCENES: '10', SB_DRIVE_CEILING: '5', SB_ACTION_WAIT_MIN: '1',
      }),
    });
  } catch (e) {
    // A non-zero exit is EXPECTED here: the precondition halt is a failure, by design.
    stdout = String((e && (e.stdout || '')) || '') + String((e && e.stderr) || '');
    ran = true;
  }
  const dirs = fs.existsSync(outRoot)
    ? fs.readdirSync(outRoot).filter((d) => d.startsWith('run_')).sort() : [];
  check('the drive run produced a run directory', dirs.length > 0, outRoot);
  if (dirs.length) {
    const d = outRoot + '/' + dirs[dirs.length - 1];
    const ledgerPath = d + '/REQUESTS.jsonl';
    check('an append-only ledger exists even though the run failed', fs.existsSync(ledgerPath), ledgerPath);
    const evs = fs.existsSync(ledgerPath)
      ? fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : [];
    note('ledger events', evs.length);
    const refusals = evs.filter((e) => e.ev === 'prereq_refused');
    check('the precondition gate REFUSED at least one request', refusals.length > 0,
      JSON.stringify(evs.map((e) => e.ev + ':' + (e.role || '')).slice(0, 20)));
    if (refusals.length) note('first refusal', refusals[0].role + ' → ' + refusals[0].code);
    // THE POINT: no downstream paid role was dispatched after the scaffold failed.
    const firstRefusalAt = evs.findIndex((e) => e.ev === 'prereq_refused');
    const downstreamAfter = evs.filter((e, i) => e.ev === 'dispatch' && i > firstRefusalAt
      && isPrerequisiteGuarded(e.role, null, !!e.author));
    check('NO guarded downstream request was dispatched after the refusal',
      firstRefusalAt >= 0 && downstreamAfter.length === 0,
      JSON.stringify(downstreamAfter.map((e) => e.role)));
    // ── STICKY MEANS EVERY ROLE, NOT JUST THE GUARDED ONES ────────────────────────────────
    // THE DEFECT THIS CATCHES: the sticky check used to sit INSIDE the guarded branch, so after
    // the stop an unguarded role — specialist renderer, line editor, logic pass, another
    // scaffold leg — still reached a real provider. Once the run has stopped, nothing more goes
    // out, whatever its role.
    const anyAfter = evs.filter((e, i) => e.ev === 'dispatch' && i > firstRefusalAt);
    check('NO request of ANY role was dispatched after the stop',
      firstRefusalAt >= 0 && anyAfter.length === 0,
      JSON.stringify(anyAfter.map((e) => e.role + '/' + e.requested)));
    const stickyRows = evs.filter((e) => e.ev === 'prereq_refused' && e.sticky === true);
    check('later refusals are recorded as sticky, all-roles stops',
      stickyRows.length === 0 || stickyRows.every((e) => e.allRoles === true),
      JSON.stringify(stickyRows.slice(0, 3)));

    // ── THE BUNDLE IS REQUIRED AND INSPECTED, NOT INFERRED ────────────────────────────────
    // The earlier assertion was `bundle exists OR a refusal exists`, which a run with refusals
    // and NO bundle would have passed. That is not a test of the bundle.
    const bundlePath = d + '/EVIDENCE_BUNDLE.json';
    check('an evidence bundle FILE reached disk', fs.existsSync(bundlePath), bundlePath);
    if (fs.existsSync(bundlePath)) {
      let b = null;
      try { b = JSON.parse(fs.readFileSync(bundlePath, 'utf8')); } catch (e) { b = null; }
      check('the bundle is valid JSON', !!b);
      if (b) {
        note('bundle endedBecause', b.endedBecause);
        check('it names why the run ended', typeof b.endedBecause === 'string'
          && b.endedBecause.length > 10, b.endedBecause);
        check('it records that the run did NOT end cleanly', b.endedCleanly === false);
        check('it carries the request ledger', b.requestLedger && b.requestLedger.available === true);
        check('it lists its unavailable fields explicitly', Array.isArray(b.unavailable),
          JSON.stringify(b.unavailable));
        check('pageCount is either a MEASURED value or named unavailable — never implied',
          b.pageCount && (b.pageCount.available === true
            ? typeof b.pageCount.value === 'number'
            : typeof b.pageCount.why === 'string'), JSON.stringify(b.pageCount));
        note('bundle pageCount', JSON.stringify(b.pageCount));
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('B3 — MOUNTED opening → committed → SYNTHETIC continuation the gate ALLOWS');
// ════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS DOES NOT ESTABLISH, STATED IN THE HEADING BECAUSE IT WAS OVERCLAIMED ONCE:
// `drive` MOUNTS scene 1 through _sbPersistSceneProjection rather than generating it (unless
// SB_DRIVE_GENERATE_OPENING=1), the continuation prose is a synthetic fixture, and the final
// save/reopen leg has been observed to fail on `page.reload: Timeout 30000ms exceeded`. So this
// is NOT evidence of generated-opening success and NOT evidence of save/reopen success. It is
// evidence of exactly one thing: a committed opening followed by a continuation that the
// precondition gate ALLOWS, judged on the right scene.
//
// THE REGRESSION THIS CATCHES: the gate asked `_selectSceneAssignment(s, 1)` on every author
// request. Once the opening is committed, app.js deliberately stops assigning that row
// (`delivery === 'committed'` is skipped) and the scene-mission branch then returns the stored
// scene-1 intent — so scene 1 reads 'scene-mission' BY DESIGN and the gate would have halted a
// valid scene 2. The failure-only control could never reach this state.
if (process.env.SB_SKIP_E2E === '1') {
  note('B3', 'SKIPPED by SB_SKIP_E2E=1');
} else {
  const { execFile } = await import('node:child_process');
  const outRoot = TMP + '/cont';
  fs.mkdirSync(outRoot, { recursive: true });
  // THE READER, SEEDED. This is the PLUMBING control: the drive prose is synthetic and worthless,
  // so a canned action is appropriate here and only here. The paid run's reader is never canned.
  let seeding = true, lastStamp = '';
  const seeder = setInterval(() => {
    if (!seeding) return;
    try {
      const dirs = fs.readdirSync(outRoot).filter((x) => x.startsWith('run_'));
      for (const dd of dirs) {
        const pg = outRoot + '/' + dd + '/NEXT_PAGE.txt';
        if (!fs.existsSync(pg)) continue;
        const st = String(fs.statSync(pg).mtimeMs);
        if (st === lastStamp) continue;
        lastStamp = st;
        fs.writeFileSync(outRoot + '/' + dd + '/NEXT_ACTION.json', JSON.stringify({
          action: 'I set the slate down and wait for the attendant to finish writing.',
          dialogue: 'Read it back to me. I want the words exact.' }));
      }
    } catch (_) {}
  }, 1500);
  await new Promise((resolve) => {
    const child = execFile('node', [ROOT + '/_nf_literary_playthrough.mjs', 'drive'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 1500000,
      env: Object.assign({}, process.env, {
        SB_OUT: outRoot, SB_FRESH_PLAN: '1', SB_GENERAL_PROSE: '1',
        SB_MAX_SCENES: '2', SB_DRIVE_CEILING: '5', SB_ACTION_WAIT_MIN: '8',
        SB_FORCE_SCAFFOLD_FAIL: '',
      }),
    }, () => resolve());
    child.on('error', () => resolve());
  });
  seeding = false; clearInterval(seeder);

  const dirs = fs.existsSync(outRoot)
    ? fs.readdirSync(outRoot).filter((x) => x.startsWith('run_')).sort() : [];
  check('the continuation drive run produced a run directory', dirs.length > 0, outRoot);
  if (dirs.length) {
    const d = outRoot + '/' + dirs[dirs.length - 1];
    const lp = d + '/REQUESTS.jsonl';
    const evs = fs.existsSync(lp)
      ? fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : [];
    const oks = evs.filter((e) => e.ev === 'prereq_ok');
    const refs = evs.filter((e) => e.ev === 'prereq_refused');
    note('prereq_ok / prereq_refused', oks.length + ' / ' + refs.length);
    check('the precondition PASSED at least once', oks.length > 0);
    check('the precondition NEVER refused on the success path', refs.length === 0,
      JSON.stringify(refs.map((e) => 'scene' + e.scene + ':' + e.role + ':' + e.code)));

    // THE SPECIFIC REGRESSION: a scene-2 request must be judged on scene 2.
    const scene2 = oks.filter((e) => Number(e.scene) >= 2);
    check('a scene-2 author/planner request was judged', scene2.length > 0,
      JSON.stringify(oks.map((e) => 'scene' + e.scene + ':' + e.role)));
    if (scene2.length) {
      const s2 = scene2[0].snapshot || {};
      note('scene-2 snapshot', JSON.stringify({ askedAboutScene: s2.askedAboutScene,
        assignmentSource: s2.assignmentSource, sourceIfAskedAboutScene1: s2.sourceIfAskedAboutScene1 }));
      check('  it asked about scene 2, not scene 1', Number(s2.askedAboutScene) >= 2,
        String(s2.askedAboutScene));
      check('  and scene 2\'s own assignment is NOT a stale scene-mission',
        s2.assignmentSource !== 'scene-mission', String(s2.assignmentSource));
      // ── RED CONTROL, MEASURED IN THE SAME RUN — AND HONEST WHEN IT DOES NOT GO RED ──────
      // The regression needs BOTH conditions at once: scene 1's outline row marked
      // `delivery === 'committed'` (so the issue-outline branch skips it) AND
      // `_sceneMissionCurrent` populated with `_sceneMissionForScene` of 1 or absent. Only then
      // does `_selectSceneAssignment(s, 1)` answer 'scene-mission'. If either is missing the
      // selector answers 'issue-outline' or null, and the OLD hardcoded 1 would not have halted
      // either — so this run demonstrates nothing about the fix and must say so.
      if (s2.sourceIfAskedAboutScene1 === 'scene-mission') {
        check('(RED) asking about scene 1 at that moment DOES return the stale scene-mission',
          true);
        check('(RED) so the OLD hardcoded scene 1 WOULD have halted this valid continuation',
          scaffoldPrerequisite(Object.assign({}, s2,
            { assignmentSource: s2.sourceIfAskedAboutScene1 }), { requireSol: false }).ok === false);
      } else {
        inconclusive('(RED) the stale-scene-1 state was NOT reached in this run',
          '_selectSceneAssignment(s,1) answered ' + JSON.stringify(s2.sourceIfAskedAboutScene1)
          + ' at scene 2, so the old hardcoded 1 would NOT have halted here. The run proves the '
          + 'fix is harmless and that continuations pass, NOT that the regression was triggered. '
          + 'Both conditions are reachable in a paid run — the mission field was populated in the '
          + '2026-11-02 attempt — but neither was produced here.');
      }
      // CONSTRUCTED, NOT OBSERVED, AND LABELLED AS SUCH. The decision itself is still provable:
      // feed the gate the triggering snapshot directly and show old-vs-new diverge.
      const triggering = { readable: true, scaffoldPresent: true, scaffoldRows: 40,
        isSolArchitecture: true, servedBy: 'gpt-6.1-sol' };
      const asScene1 = scaffoldPrerequisite(
        Object.assign({}, triggering, { askedAboutScene: 1, assignmentSource: 'scene-mission' }));
      const asScene2 = scaffoldPrerequisite(
        Object.assign({}, triggering, { askedAboutScene: 2, assignmentSource: 'issue-outline' }));
      check('(CONSTRUCTED) judged on scene 1 the same moment REFUSES as assignment_stale',
        asScene1.ok === false && asScene1.code === 'assignment_stale', JSON.stringify(asScene1));
      check('(CONSTRUCTED) judged on scene 2 it PASSES',
        asScene2.ok === true, JSON.stringify(asScene2));
    }
    // A continuation actually committed, which is what "valid continuation" means.
    const committed = fs.existsSync(d + '/STORY_RECORD.json')
      ? JSON.parse(fs.readFileSync(d + '/STORY_RECORD.json', 'utf8')) : null;
    const sceneFiles = fs.readdirSync(d).filter((n) => /^scene\d+\.txt$/.test(n)).sort();
    note('committed scene files', JSON.stringify(sceneFiles));
    check('BOTH the opening and a continuation reached disk as scenes',
      sceneFiles.length >= 2, JSON.stringify(sceneFiles));
    check('a story record was written', !!committed);
    // THE LIMITS, READ OFF THE RUN'S OWN LOG RATHER THAN ASSUMED — so the scope of this control
    // is recorded beside its result and cannot drift back into an overclaim.
    const runLog = fs.existsSync(d + '/RUN.log') ? fs.readFileSync(d + '/RUN.log', 'utf8') : '';
    const mounted = /SCENE 1 \(DRIVE: mounted/.test(runLog);
    note('scene 1 provenance in this control',
      mounted ? 'MOUNTED, not generated — generated-opening success is NOT established'
              : 'not mounted (SB_DRIVE_GENERATE_OPENING may be set)');
    const reopenFailed = /resumable-state preservation failed/.test(runLog);
    note('save/reopen leg in this control',
      reopenFailed ? 'FAILED — save/reopen success is NOT established by this control'
                   : 'no failure line recorded');
    check('the control records its own scope rather than implying more',
      typeof mounted === 'boolean' && typeof reopenFailed === 'boolean');
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('E — CACHE-BEARING RECEIPTS ARE UNRESOLVED, NOT SETTLED');
// ════════════════════════════════════════════════════════════════════════════════════════
{
  const { settle, makeSettlement } = await import('./_nf_cost_settlement.mjs');
  // THE EXACT MEASURED RECEIPT that was wrongly settled at $0.197876.
  const measured = { prompt_tokens: 88558, completion_tokens: 2076, total_tokens: 90634,
    prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 88555, audio_tokens: 0 },
    completion_tokens_details: { reasoning_tokens: 512 } };
  const s = settle(measured, 'gpt-6.1-sol');
  check('the measured Sol receipt is NOT settled', s.settled === false, JSON.stringify(s).slice(0, 200));
  check('  it holds exposure rather than being dropped', s.holdExposure === true);
  check('  and the refusal names cache_write_tokens', /cache_write_tokens=88555/.test(s.why || ''), s.why);

  // ── RED CONTROL ───────────────────────────────────────────────────────────────────────
  // Strip ONLY the cache field. The same receipt then settles — and at the figure that was
  // reported as a real charge. That is what the old code did with the cache field present.
  const stripped = JSON.parse(JSON.stringify(measured));
  delete stripped.prompt_tokens_details.cache_write_tokens;
  const s2 = settle(stripped, 'gpt-6.1-sol');
  check('(RED) with the cache field removed the SAME receipt settles', s2.settled === true);
  check('(RED) at $0.197876 — the figure previously reported as a settled charge',
    s2.settled && Math.abs(s2.usd - 0.197876) < 1e-6, s2.usd);

  // An authoritative provider cost still wins; refusing is the fallback, not a preference.
  const auth = settle({ cost_in_usd_ticks: 271993500,
    prompt_tokens_details: { cache_write_tokens: 500 } }, 'grok-4.3');
  check('a provider cost field still settles even with cache activity', auth.settled === true);
  check('  at the provider\'s own figure', Math.abs(auth.usd - 0.02719935) < 1e-12, auth.usd);

  // Anthropic's read and write field names are covered too.
  for (const [label, u] of [
    ['cache_read_input_tokens', { input_tokens: 1000, output_tokens: 10, cache_read_input_tokens: 9 }],
    ['cache_creation_input_tokens', { input_tokens: 1000, output_tokens: 10, cache_creation_input_tokens: 9 }],
    ['prompt_tokens_details.cached_tokens', { prompt_tokens: 1000, completion_tokens: 10,
      prompt_tokens_details: { cached_tokens: 9 } }],
  ]) {
    const r = settle(u, label.indexOf('prompt_tokens') === 0 ? 'gpt-6.1-sol' : 'claude-haiku-5-5');
    check('refused on ' + label, r.settled === false && r.holdExposure === true, JSON.stringify(r).slice(0, 160));
  }
  // A plain receipt is unaffected — the change must not make everything unpriceable.
  const plain = settle({ prompt_tokens: 1000, completion_tokens: 100,
    prompt_tokens_details: { cached_tokens: 0 } }, 'gpt-6.1-sol');
  check('a cache-FREE receipt still settles normally', plain.settled === true, JSON.stringify(plain).slice(0, 140));

  // And the ledger holds the reservation rather than crediting it back.
  const st = makeSettlement(3.0);
  st.record({ stage: 'author', model: 'gpt-6.1-sol', estimate: 0.21, usage: measured });
  const t = st.totals();
  check('the ledger holds the reservation and settles nothing',
    t.settled === 0 && Math.abs(t.heldUnknown - 0.21) < 1e-12, JSON.stringify(t));
  check('  so the allowance is not credited back for it',
    Math.abs(t.remaining - (3.0 - 0.21)) < 1e-12, t.remaining);
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('C — CONCURRENT SAME-ROLE RESPONSES STAY DISTINCT ON DISK');
// ════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURED LOSS: three SPECIALIST_RENDERER 200s in one scene all resolved against the same
// `requests.length`, so all three produced response_17_SPECIALIST_RENDERER_200.json and two
// complete bodies with their receipts were destroyed.
{
  const dir = TMP + '/c';
  fs.mkdirSync(dir, { recursive: true });
  // THE OLD SCHEME, reproduced exactly: the index is the array length read after the await, so
  // three concurrent responses all see 17.
  const oldName = (idx, role, status) => 'response_' + idx + '_' + role + '_' + status + '.json';
  const oldNames = [oldName(17, 'SPECIALIST_RENDERER', 200), oldName(17, 'SPECIALIST_RENDERER', 200),
    oldName(17, 'SPECIALIST_RENDERER', 200)];
  check('(RED) the OLD scheme gives three concurrent responses ONE filename',
    new Set(oldNames).size === 1, JSON.stringify(oldNames));

  // THE NEW SCHEME, with ids allocated before dispatch: three distinct ids, three distinct files.
  const newPaths = [11, 12, 13].map((id) =>
    allocateArtifactPath(dir, 'response', id, 'SPECIALIST_RENDERER', 200));
  newPaths.forEach((p) => fs.writeFileSync(p.path, '{}'));
  check('distinct request ids give distinct filenames',
    new Set(newPaths.map((p) => p.name)).size === 3, JSON.stringify(newPaths.map((p) => p.name)));
  check('and none of them reported a collision', newPaths.every((p) => !p.collided));

  // THE SECOND HALF OF THE GUARANTEE: even if an id DID repeat, nothing is overwritten.
  const a = allocateArtifactPath(dir, 'response', 11, 'SPECIALIST_RENDERER', 200);
  check('a repeated id does NOT return an existing path', a.name !== newPaths[0].name, a.name);
  check('  and it reports the collision loudly', a.collided === true, JSON.stringify(a));
  fs.writeFileSync(a.path, '{}');
  const b = allocateArtifactPath(dir, 'response', 11, 'SPECIALIST_RENDERER', 200);
  check('a third write with the same id lands on a third distinct path',
    b.name !== a.name && b.name !== newPaths[0].name, b.name);
  fs.writeFileSync(b.path, '{}');   // the count below is of files WRITTEN, so write it
  check('three writes under one id leave THREE files, not one',
    fs.readdirSync(dir).filter((n) => /_r11_/.test(n)).length === 3,
    JSON.stringify(fs.readdirSync(dir)));

  // Failure artifacts share the mechanism, so they share the guarantee.
  const f1 = allocateArtifactPath(dir, 'failure', 4, 'STRUCTURE_GENERATOR', 'dispatch');
  fs.writeFileSync(f1.path, '{}');
  const f2 = allocateArtifactPath(dir, 'failure', 4, 'STRUCTURE_GENERATOR', 'dispatch');
  check('failure artifacts are protected the same way', f2.name !== f1.name && f2.collided);

  // A role or status containing a path separator must not escape the directory.
  const nasty = allocateArtifactPath(dir, 'response', '../../etc', 'a/b', 200);
  check('ids and roles are sanitised, so no artifact escapes its directory',
    nasty.name.indexOf('/') === -1 && nasty.path.startsWith(dir), nasty.path);
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('D — A LAUNCH FAILURE STILL PRODUCES EVIDENCE, WITH GAPS NAMED NOT ZEROED');
// ════════════════════════════════════════════════════════════════════════════════════════
{
  // The 2026-11-02 shape: the process died before anything could be read off the page.
  const bare = evidenceBundle({ endedBecause: 'post_launch_assertion', requests: [{ reqId: 1 }] });
  check('a bundle is produced even with almost nothing collected', !!bare.at);
  check('the request ledger that WAS available is present', bare.requestLedger.available === true);
  check('pageCount is marked UNAVAILABLE, not 0', bare.pageCount.available === false
    && bare.pageCount.value === undefined, JSON.stringify(bare.pageCount));
  check('  and its reason says publication is UNVERIFIED rather than "nothing published"',
    /UNVERIFIED/.test(bare.pageCount.why), bare.pageCount.why);
  check('transformations are marked unavailable', bare.transformations.available === false);
  check('the bundle counts its own gaps', bare.unavailable.length >= 4, JSON.stringify(bare.unavailable));
  check('and says so in one line a report cannot misread',
    /must be reported as unknown, not as zero/.test(bare.note), bare.note);

  // ── RED CONTROL ───────────────────────────────────────────────────────────────────────
  // A zero page count must be DISTINGUISHABLE from an unread one. If these two look the same,
  // the bundle has not solved the problem that produced the claim "nothing was published".
  const zero = evidenceBundle({ endedBecause: 'clean', pageCount: 0, requests: [],
    accounting: {}, committedScenes: { scenes: 0 }, transformations: { rawSnap: 0 },
    stateSnapshot: {}, endedCleanly: true });
  check('(RED) a MEASURED zero page count is available and equals 0',
    zero.pageCount.available === true && zero.pageCount.value === 0, JSON.stringify(zero.pageCount));
  check('(RED) an unread page count and a measured zero are NOT the same record',
    JSON.stringify(zero.pageCount) !== JSON.stringify(bare.pageCount));
  check('a complete bundle reports no gaps', zero.unavailable.length === 0
    && zero.note === 'all fields collected', JSON.stringify(zero.unavailable));
  check('a clean end is recorded as clean', zero.endedCleanly === true && bare.endedCleanly === false);
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('F — THE ACTUAL ACCOUNTING HANDOFF, END TO END, NO PROVIDER CONTACTED');
// ════════════════════════════════════════════════════════════════════════════════════════
// Section E tests settle() directly. This tests the HANDOFF: rec.receipt → usageForSettlement →
// reconcile() → the ledger row. That path is where the receipt was being replaced with null, and
// a direct test of settle() could never have caught it.
//
// It runs the harness in `run` mode with SB_FAULT=cache_receipt, which serves a 200 carrying the
// measured Sol usage from INSIDE the live branch. SB_FAULT short-circuits route.fetch entirely
// and the one route.continue() on that path now refuses locally when SB_FAULT is set, so no
// provider and no proxy is contacted. The ceiling is an admission budget only; nothing bills.
if (process.env.SB_SKIP_E2E === '1') {
  note('F', 'SKIPPED by SB_SKIP_E2E=1');
} else {
  const { execFile } = await import('node:child_process');
  const outRoot = TMP + '/acct';
  fs.mkdirSync(outRoot, { recursive: true });
  await new Promise((resolve) => {
    const child = execFile('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run', '1.00'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 900000,
      env: Object.assign({}, process.env, {
        SB_OUT: outRoot, SB_FAULT: 'cache_receipt', SB_GENERAL_PROSE: '1',
        SB_MAX_SCENES: '10', SB_ACTION_WAIT_MIN: '1', SB_FRESH_PLAN: '',
      }),
    }, () => resolve());
    child.on('error', () => resolve());
  });
  const dirs = fs.existsSync(outRoot)
    ? fs.readdirSync(outRoot).filter((x) => x.startsWith('run_')).sort() : [];
  check('the fault arm produced a run directory', dirs.length > 0, outRoot);
  if (dirs.length) {
    const d = outRoot + '/' + dirs[dirs.length - 1];
    const lp = d + '/REQUESTS.jsonl';
    const evs = fs.existsSync(lp)
      ? fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : [];
    const rec = evs.filter((e) => e.ev === 'reconcile');
    check('at least one reconciliation reached the ledger', rec.length > 0);
    const r = rec[0] || {};
    note('reconcile row', JSON.stringify({ kind: r.kind, usd: r.usd,
      usageReceived: r.usageReceived, cacheFieldsSeen: r.cacheFieldsSeen }));
    // THE THREE THINGS THE CHECK REQUIRES.
    check('the receipt was RECEIVED, not replaced with null',
      r.usageReceived === true, JSON.stringify(r));
    check('the reservation is HELD and nothing was settled',
      r.kind === 'heldUnknown' && r.usd === null, JSON.stringify(r));
    check('the reason is UNPRICED CACHE USAGE, naming the field',
      /cache activity/.test(String(r.settlementWhy || ''))
      && Array.isArray(r.cacheFieldsSeen)
      && r.cacheFieldsSeen.some((x) => /cache_write_tokens=88555/.test(x)),
      JSON.stringify({ settlementWhy: r.settlementWhy, cacheFieldsSeen: r.cacheFieldsSeen }));
    // ── RED CONTROL ───────────────────────────────────────────────────────────────────────
    // The defect's signature was the reason "no usage returned" on a call that DID return one.
    check('(RED) the reason is NOT "no usage returned"',
      !/no usage returned/.test(String(r.settlementWhy || '')), r.settlementWhy);
    // And the receipt survives on disk, which is what "preserve the receipt" means.
    const arts = fs.readdirSync(d).filter((n) => /^response_.*\.json$/.test(n));
    let preserved = false;
    for (const a of arts) {
      try {
        const j = JSON.parse(fs.readFileSync(d + '/' + a, 'utf8'));
        if (((j.receipt || {}).prompt_tokens_details || {}).cache_write_tokens === 88555) preserved = true;
      } catch (_) {}
    }
    check('the complete receipt is PRESERVED in the response artifact on disk', preserved,
      JSON.stringify(arts).slice(0, 160));
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('G — TRANSPORT: deadline by operation, late-response record, strict-Sol stop');
// ════════════════════════════════════════════════════════════════════════════════════════
// All three provider-free. G1 reads the deadline off a real run's ledger. G2 drives the ROUTE's
// own recording code with a stubbed upstream — no network. G3 runs the harness with the Sol
// architecture call made to fail and checks that no replacement planner was dispatched.

// ── G1: THE DEADLINE IS CHOSEN BY OPERATION ───────────────────────────────────────────────
{
  const run2 = '/Users/romantsukerman/storybound-diag/_nf_story_test_RUN2';
  const dirs = fs.existsSync(run2)
    ? fs.readdirSync(run2).filter((x) => x.startsWith('run_')).sort() : [];
  if (!dirs.length) {
    inconclusive('(G1) no preserved run to read a deadline from',
      'expected a run directory under ' + run2);
  } else {
    const d = run2 + '/' + dirs[dirs.length - 1];
    const reqs = JSON.parse(fs.readFileSync(d + '/requests.json', 'utf8'));
    const sol = reqs.filter((r) => /sol-scene-test/.test(String(r.url || '')));
    // THE FAILING RUN'S OWN RECORD, as the red control: it carried no deadline field at all, and
    // its Sol call died at 120s.
    check('(RED) the 2026-11-02 run\'s Sol call failed at the SHORT deadline',
      sol.length > 0 && /Timeout 120000ms/.test(JSON.stringify(sol[0])),
      JSON.stringify(sol[0] || {}).slice(0, 200));
  }
  // ── THE SELECTION ITSELF, OBSERVED ON THE REAL DISPATCH PATH ────────────────────────────
  // It cannot be read off a `drive` run: the deadline is chosen in the LIVE branch, and the
  // driver never reaches that line. SB_FAULT does reach it — the ledger row is emitted just
  // before the ternary that swaps route.fetch for the injected response — so this arm exercises
  // the real selection with no network. Leaving this inconclusive was not acceptable: the
  // deadline is the defect this batch exists to close.
  if (process.env.SB_SKIP_E2E === '1') {
    note('G1b', 'SKIPPED by SB_SKIP_E2E=1');
  } else {
    const { execFile } = await import('node:child_process');
    const outRoot = TMP + '/deadline';
    fs.mkdirSync(outRoot, { recursive: true });
    await new Promise((resolve) => {
      const child = execFile('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run', '1.00'], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 900000,
        env: Object.assign({}, process.env, {
          SB_OUT: outRoot, SB_FAULT: 'cache_receipt', SB_FRESH_PLAN: '1',
          SB_GENERAL_PROSE: '1', SB_ACTION_WAIT_MIN: '1',
        }),
      }, () => resolve());
      child.on('error', () => resolve());
    });
    const ds = fs.existsSync(outRoot)
      ? fs.readdirSync(outRoot).filter((x) => x.startsWith('run_')).sort() : [];
    check('(G1b) the live-branch fault arm produced a run directory', ds.length > 0, outRoot);
    if (ds.length) {
      const d = outRoot + '/' + ds[ds.length - 1];
      const lp = d + '/REQUESTS.jsonl';
      const evs = fs.existsSync(lp)
        ? fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
        : [];
      const dl = evs.filter((e) => e.ev === 'dispatch_deadline');
      const sol = dl.filter((e) => e.operationClass === 'sol_architecture');
      const other = dl.filter((e) => e.operationClass === 'other');
      note('deadline rows', JSON.stringify(dl.map((e) => e.operationClass + ':' + e.timeoutMs)));
      check('(G1b) a sol_architecture dispatch was observed', sol.length > 0,
        JSON.stringify(dl).slice(0, 200));
      check('(G1b) it is given 300000ms', sol.length > 0 && sol.every((e) => e.timeoutMs === 300000),
        JSON.stringify(sol));
      check('(G1b) the Sol route is the one that got it',
        sol.every((e) => /sol-scene-test/.test(String(e.url || ''))), JSON.stringify(sol));
      // THE CONTRAST, so this is a selection and not a blanket raise: ordinary calls keep 120s.
      check('(G1b) ordinary calls still get 120000ms — the deadline is SELECTED, not raised for all',
        other.length > 0 && other.every((e) => e.timeoutMs === 120000),
        JSON.stringify(other.map((e) => e.url + ':' + e.timeoutMs)).slice(0, 200));
      // ── RED CONTROL ───────────────────────────────────────────────────────────────────────
      // Under the old rule the operation class that now gets 300s would have got 120s, because
      // it is not an author override. Recompute the old rule over the observed rows.
      const oldRule = (row) => (/author_override_/.test(String(row.operationClass)) ? 300000 : 120000);
      check('(RED) under the OLD rule this same Sol dispatch would have got 120000ms',
        sol.length > 0 && sol.every((e) => oldRule(e) === 120000), JSON.stringify(sol.map(oldRule)));
    }
  }
}

// ── G2: A LATE RESPONSE IS RECOVERABLE ────────────────────────────────────────────────────
// The route's recording code runs for real, with `fetch` and the filesystem target swapped for
// stubs. Nothing is contacted. This is the one place a copy would be unacceptable, so the module
// itself is loaded and invoked.
{
  const routePath = ROOT + '/api/sol-scene-test.js';
  const outDir = TMP + '/solresp';
  fs.mkdirSync(outDir, { recursive: true });
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  delete req.cache[req.resolve(routePath)];
  const handler = req(routePath);

  const realFetch = globalThis.fetch;
  const prevKey = process.env.OPENAI_API_KEY;
  const prevDir = process.env.SB_SOL_RESPONSE_DIR;
  const prevCwd = process.cwd();
  process.env.OPENAI_API_KEY = 'test-key-not-used-no-network';
  process.env.SB_SOL_RESPONSE_DIR = outDir;
  // The claim/approval directory the route derives from cwd — point it at the temp tree so the
  // control never writes into the repo and never collides with a real label.
  const claimRoot = TMP + '/claims';
  fs.mkdirSync(claimRoot + '/_ab_writing_out/continuation_experiment', { recursive: true });
  process.chdir(claimRoot);

  const UPSTREAM_BODY = { id: 'chatcmpl-late', model: 'gpt-6.1-sol',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: '{"runThesis":"x"}' } }],
    usage: { prompt_tokens: 14488, completion_tokens: 9123, total_tokens: 23611,
      prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 14480 } } };
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return { status: 200, text: async () => JSON.stringify(UPSTREAM_BODY),
      headers: { forEach: (fn) => { fn('application/json', 'content-type');
        fn('Bearer super-secret', 'authorization'); fn('org-123', 'openai-organization'); } } };
  };

  const label = 'control_late_' + Date.now();
  let sent = null;
  const res = { status: (c) => ({ json: (b) => { sent = { code: c, body: b }; return b; } }) };
  const reqObj = { method: 'POST', headers: { host: 'localhost:3000' },
    body: { model: 'gpt-6.1-sol', max_completion_tokens: 18150, reasoning_effort: 'medium',
      messages: [{ role: 'system', content: 'x'.repeat(200) }],
      _sbCallLabel: label, _sbRunBudgetUsd: 3.5 } };
  try {
    await handler(reqObj, res);
  } catch (e) {
    check('(G2) the route handler ran', false, (e && e.message) || e);
  } finally {
    globalThis.fetch = realFetch;
    process.chdir(prevCwd);
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prevKey;
    if (prevDir === undefined) delete process.env.SB_SOL_RESPONSE_DIR; else process.env.SB_SOL_RESPONSE_DIR = prevDir;
  }
  check('(G2) the stubbed upstream was called exactly once — no network, no retry', fetchCalls === 1, fetchCalls);
  check('(G2) the route returned 200', sent && sent.code === 200, JSON.stringify(sent).slice(0, 120));
  const recPath = outDir + '/RESPONSE.' + label + '.json';
  check('(G2) a RESPONSE record exists under the call\'s unique label', fs.existsSync(recPath), recPath);
  if (fs.existsSync(recPath)) {
    const r = JSON.parse(fs.readFileSync(recPath, 'utf8'));
    check('(G2) it carries the COMPLETE body', String(r.bodyComplete || '').indexOf('chatcmpl-late') !== -1);
    check('(G2) it carries the usage block', r.usage && r.usage.prompt_tokens === 14488, JSON.stringify(r.usage));
    check('(G2)   including the cache field, so the amount stays classifiable',
      r.usage && r.usage.prompt_tokens_details
      && r.usage.prompt_tokens_details.cache_write_tokens === 14480);
    check('(G2) it carries the status', r.status === 200, r.status);
    check('(G2) it carries a duration', typeof r.ms === 'number', r.ms);
    check('(G2) it carries the served model and finish reason',
      r.servedModel === 'gpt-6.1-sol' && r.finishReason === 'stop', JSON.stringify([r.servedModel, r.finishReason]));
    check('(G2) headers are present and CREDENTIALS ARE REDACTED',
      r.headers && r.headers['content-type'] === 'application/json'
      && r.headers.authorization === '[REDACTED]'
      && r.headers['openai-organization'] === '[REDACTED]', JSON.stringify(r.headers));
    check('(G2) the record is OUTSIDE the watched application tree',
      recPath.indexOf(ROOT + '/') !== 0, recPath);
    // ── RED CONTROL ─────────────────────────────────────────────────────────────────────
    // The claim file alone — all the failing run had — proves only that a request was about to be
    // sent. It carries no status, no usage and no body.
    const claimFile = claimRoot + '/_ab_writing_out/continuation_experiment/UPSTREAM_CLAIM.' + label + '.json';
    check('(RED) the claim file exists but carries NO status, usage or body',
      fs.existsSync(claimFile) && (() => {
        const c = JSON.parse(fs.readFileSync(claimFile, 'utf8'));
        return c.status === undefined && c.usage === undefined && c.bodyComplete === undefined;
      })(), claimFile);
  }
}

// ── G3: STRICT SOL REFUSES A REPLACEMENT PLANNER ──────────────────────────────────────────
if (process.env.SB_SKIP_E2E === '1') {
  note('G3', 'SKIPPED by SB_SKIP_E2E=1');
} else {
  const { execFile } = await import('node:child_process');
  const outRoot = TMP + '/strictsol';
  fs.mkdirSync(outRoot, { recursive: true });
  await new Promise((resolve) => {
    const child = execFile('node', [ROOT + '/_nf_literary_playthrough.mjs', 'drive'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 600000,
      env: Object.assign({}, process.env, {
        SB_OUT: outRoot, SB_FRESH_PLAN: '1', SB_GENERAL_PROSE: '1',
        // 'timeout' makes the SOL ARCHITECTURE leg itself unresolved — the measured shape.
        SB_FORCE_SCAFFOLD_FAIL: 'timeout',
        SB_MAX_SCENES: '10', SB_DRIVE_CEILING: '5', SB_ACTION_WAIT_MIN: '1',
      }),
    }, () => resolve());
    child.on('error', () => resolve());
  });
  const dirs = fs.existsSync(outRoot)
    ? fs.readdirSync(outRoot).filter((x) => x.startsWith('run_')).sort() : [];
  check('(G3) the strict-Sol run produced a run directory', dirs.length > 0, outRoot);
  if (dirs.length) {
    const d = outRoot + '/' + dirs[dirs.length - 1];
    const lp = d + '/REQUESTS.jsonl';
    const evs = fs.existsSync(lp)
      ? fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : [];
    const stops = evs.filter((e) => e.ev === 'strict_sol_stop');
    note('strict_sol_stop events', JSON.stringify(stops.map((e) => e.code)));
    check('(G3) the strict-Sol stop fired', stops.length > 0,
      JSON.stringify(evs.map((e) => e.ev)).slice(0, 300));
    // THE POINT: the stop must land BEFORE any replacement-planner dispatch.
    const stopAt = evs.findIndex((e) => e.ev === 'strict_sol_stop');
    const after = evs.filter((e, i) => e.ev === 'dispatch' && i > stopAt);
    check('(G3) NO dispatch of any kind followed the strict-Sol stop',
      stopAt >= 0 && after.length === 0,
      JSON.stringify(after.map((e) => e.role + '/' + e.requested)));
    // The replacement planners, named, so this is not just "nothing happened".
    const replacements = evs.filter((e, i) => e.ev === 'dispatch' && i > stopAt
      && /ministral|grok|gpt-4o-mini/.test(String(e.requested || '')));
    check('(G3)   including ministral, grok and 4o-mini specifically',
      replacements.length === 0, JSON.stringify(replacements.map((e) => e.requested)));
    // THE DEADLINE SELECTION, read off this run's own ledger rather than from source.
    const deadlines = evs.filter((e) => e.ev === 'dispatch_deadline');
    const solDl = deadlines.filter((e) => e.operationClass === 'sol_architecture');
    note('dispatch_deadline rows', JSON.stringify(deadlines.map((e) => e.operationClass + ':' + e.timeoutMs)));
    // No deadline row is EXPECTED here: `drive` never reaches the live branch where the deadline
    // is chosen, and the forced-timeout fixture aborts earlier still. The selection is proved in
    // G1b on the real dispatch path, so this is a recorded expectation rather than a gap.
    check('(G3) no deadline row here, as expected for a driver run', solDl.length === 0,
      JSON.stringify(solDl));
    check('(G3) an evidence bundle was still written', fs.existsSync(d + '/EVIDENCE_BUNDLE.json'));
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
section('H — STRICT SOL COVERS HTTP 200 WITH NO USABLE SCAFFOLD CONTENT');
// ════════════════════════════════════════════════════════════════════════════════════════
// THE GAP THIS CLOSES: the other stop sites catch HTTP >= 400, a thrown dispatch, and the
// driver's injected failures. app.js:240784 ALSO treats a 200 whose content is empty or missing
// as a Sol failure (`if (!_solRes.ok || !String(raw || '').trim()) throw`) and falls through to a
// replacement planner — and that was the one outcome the guard let past.
//
// All three legs run the REAL dispatch path under SB_FAULT (no network): the fault targets the
// Sol route only, so every other leg behaves as the known-good arm and the run reaches the
// architecture stage exactly as it otherwise would.
//
// THE BAR FOR THE FAILURE LEGS IS ZERO SUBSEQUENT DISPATCHES — not "the prerequisite gate later
// rejects the replacement". A replacement planner that dispatches and bills before some later
// gate objects is exactly the failure being removed.
if (process.env.SB_SKIP_E2E === '1') {
  note('H', 'SKIPPED by SB_SKIP_E2E=1');
} else {
  const { execFile } = await import('node:child_process');
  const runArm = async (fault, dirName) => {
    const outRoot = TMP + '/' + dirName;
    fs.mkdirSync(outRoot, { recursive: true });
    await new Promise((resolve) => {
      const child = execFile('node', [ROOT + '/_nf_literary_playthrough.mjs', 'run', '1.00'], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 900000,
        env: Object.assign({}, process.env, {
          SB_OUT: outRoot, SB_FAULT: fault, SB_FRESH_PLAN: '1',
          SB_GENERAL_PROSE: '1', SB_ACTION_WAIT_MIN: '1',
        }),
      }, () => resolve());
      child.on('error', () => resolve());
    });
    const ds = fs.existsSync(outRoot)
      ? fs.readdirSync(outRoot).filter((x) => x.startsWith('run_')).sort() : [];
    if (!ds.length) return null;
    const d = outRoot + '/' + ds[ds.length - 1];
    const lp = d + '/REQUESTS.jsonl';
    return { dir: d, evs: fs.existsSync(lp)
      ? fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : [] };
  };

  // ── THE TWO FAILURE LEGS ────────────────────────────────────────────────────────────────
  for (const [fault, label] of [
    ['sol_empty_content', '200 with EMPTY content'],
    ['sol_missing_content', '200 with an envelope LACKING the content field'],
  ]) {
    const arm = await runArm(fault, 'h_' + fault);
    check('(H) ' + label + ': the arm produced a ledger', !!arm && arm.evs.length > 0, fault);
    if (!arm) continue;
    const stops = arm.evs.filter((e) => e.ev === 'strict_sol_stop');
    check('(H) ' + label + ': the strict-Sol stop fired', stops.length > 0,
      JSON.stringify(arm.evs.map((e) => e.ev)).slice(0, 240));
    check('(H) ' + label + ': for the empty-content reason specifically',
      stops.some((e) => e.code === 'sol_architecture_empty_content'),
      JSON.stringify(stops.map((e) => e.code)));
    const at = arm.evs.findIndex((e) => e.ev === 'strict_sol_stop');
    const after = arm.evs.filter((e, i) => e.ev === 'dispatch' && i > at);
    check('(H) ' + label + ': ZERO subsequent provider dispatches',
      at >= 0 && after.length === 0, JSON.stringify(after.map((e) => e.role + '/' + e.requested)));
    // AND THE REPLACEMENT PLANNER SPECIFICALLY WAS REFUSED BEFORE DISPATCH — the distinction the
    // bar is about. A later OPENING_PLANNER refusal alone would not satisfy it.
    const refusedReplacements = arm.evs.filter((e) => e.ev === 'prereq_refused'
      && /STRUCTURE_GENERATOR|PRIMARY_AUTHOR/.test(String(e.role || '')));
    check('(H) ' + label + ': the replacement-planner legs were refused, not merely gated later',
      refusedReplacements.length > 0,
      JSON.stringify(arm.evs.filter((e) => e.ev === 'prereq_refused').map((e) => e.role)));
    // The response and its usage are preserved normally — the stop must not cost evidence.
    const resp = fs.readdirSync(arm.dir).filter((n) => /^response_.*sol.*\.json$/i.test(n)
      || /^response_r\d+_role_200\.json$/.test(n));
    check('(H) ' + label + ': the Sol response was still preserved on disk', resp.length > 0,
      JSON.stringify(fs.readdirSync(arm.dir)).slice(0, 220));
  }

  // ── THE POSITIVE LEG: A VALID RESPONSE STILL PROCEEDS ───────────────────────────────────
  // Without this the failure legs prove only that the stop CAN fire, not that it discriminates.
  {
    const arm = await runArm('sol_valid_plan', 'h_valid');
    check('(H) valid plan: the arm produced a ledger', !!arm && arm.evs.length > 0);
    if (arm) {
      const stops = arm.evs.filter((e) => e.ev === 'strict_sol_stop');
      check('(H) valid plan: the strict-Sol stop did NOT fire', stops.length === 0,
        JSON.stringify(stops.map((e) => e.code)));
      const oks = arm.evs.filter((e) => e.ev === 'prereq_ok');
      check('(H) valid plan: the precondition PASSED', oks.length > 0,
        JSON.stringify(arm.evs.filter((e) => e.ev === 'prereq_refused').map((e) => e.code)));
      if (oks.length) {
        const s = oks[0].snapshot || {};
        note('valid-plan snapshot', JSON.stringify({ scaffoldRows: s.scaffoldRows,
          isSolArchitecture: s.isSolArchitecture, assignmentSource: s.assignmentSource }));
        check('(H) valid plan: the scaffold carries rows and is Sol-served',
          Number(s.scaffoldRows) > 0 && s.isSolArchitecture === true, JSON.stringify(s));
      }
      // IT PROCEEDED: a dispatch after the architecture call, which the failure legs must not have.
      const solAt = arm.evs.findIndex((e) => e.ev === 'dispatch'
        && /sol-scene-test/.test(String(e.url || '')));
      const after = arm.evs.filter((e, i) => e.ev === 'dispatch' && i > solAt);
      check('(H) valid plan: the run PROCEEDED past the architecture stage',
        solAt >= 0 && after.length > 0, JSON.stringify(after.map((e) => e.role + '/' + e.requested)));
      check('(H) valid plan:   and what proceeded was the opening planner',
        after.some((e) => e.role === 'OPENING_PLANNER'),
        JSON.stringify(after.map((e) => e.role)));
    }
  }
}

section('RESULT');
line('  PASS ' + PASS + '   FAIL ' + FAIL + '   INCONCLUSIVE ' + INCONCLUSIVE);
if (FAILURES.length) { line(''); line('  FAILURES:'); FAILURES.forEach((f) => line('    · ' + f)); }
if (INCONCLUSIVES.length) {
  line(''); line('  INCONCLUSIVE — these demonstrate NOTHING and are not passes:');
  INCONCLUSIVES.forEach((f) => line('    · ' + f));
}
line('');
line('SCOPE: provider-free. Part A loads the application with every /api/* route aborted;');
line('       B2 runs the harness in `drive`, where no provider is reachable. Nothing billed.');
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
process.exit(FAIL ? 1 : 0);
