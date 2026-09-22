// PLANNER-FUNCTION-GATE DIAGNOSIS — DRY, READ-ONLY (Roman, 2026-09-22)
//
// Roman, after attempts 6 and 9 both reached [CG:PLANNER-GATE] REJECTED: "diagnose whether the
// gate is correct or too strict... Do not widen regexes by default. First explain what concrete
// story event the plan actually proposed... Fix only if the gate is demonstrably wrong. If the
// plan is genuinely weak, leave the gate alone and say so."
//
// Pulls the EXACT real planner replies from attempts 6 and 9 (already-paid, persisted logs), builds
// the SAME stateChange-shaped object the real code builds from each reply (matching app.js's own
// construction, field-for-field), and calls the REAL, unmodified window._detectPlannerFunctionGap
// against each — the actual gate function, not a reimplementation. Reports the exact rejection
// reason and the concrete event each plan actually proposed, side by side, for a judgment call.
//
// usage: node _planner_function_gate_diagnosis_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ATTEMPT6_REPLY = JSON.parse(fs.readFileSync('/tmp/_attempt6_planner_reply.json', 'utf8'));
const ATTEMPT9_REPLY = JSON.parse(fs.readFileSync('/tmp/_attempt9_planner_reply_check.json', 'utf8'));

// Matches app.js's own _stateChange construction (line ~100390-100479) field-for-field, from a
// raw planner reply object — the SAME normalization the real code applies before the gate ever
// sees it (including .slots from event_slots, which the gate reads for its lane-content check).
function buildStateChangeFromReply(scP) {
  return {
    precondition: String(scP.state_change_precondition || '').trim(),
    event: String(scP.state_change || '').trim(),
    forces_choice: String(scP.forces_choice || '').trim(),
    tactical_move: String(scP.tactical_move || '').trim(),
    branch_a: String(scP.branch_a || '').trim(),
    branch_b: String(scP.branch_b || '').trim(),
    chosenAftermathLane: String(scP.chosen_aftermath_lane || '').trim(),
    lanePostureModulation: String(scP.lane_posture_modulation || '').trim(),
    pressureSource: String(scP.pressure_source || '').trim(),
    institutionalActor: String(scP.institutional_actor || '').trim(),
    liPressureActor: String(scP.li_pressure_actor || '').trim(),
    aftermathObligations: String(scP.aftermath_obligations || '').trim(),
    slots: scP.event_slots ? {
      precondition: String(scP.event_slots.precondition || '').trim(),
      actor: String(scP.event_slots.actor || '').trim(),
      action: String(scP.event_slots.action || '').trim(),
      target: String(scP.event_slots.target || '').trim(),
      exitState: String(scP.event_slots.exit_state || '').trim(),
    } : undefined,
  };
}

const ATTEMPT6_SC = buildStateChangeFromReply(ATTEMPT6_REPLY);
const ATTEMPT9_SC = buildStateChangeFromReply(ATTEMPT9_REPLY);

// The reader's final submitted Say/Do for BOTH attempts (Temptation, sanitized per this session's
// fix — action sanitizes to empty since the raw card action was the bare "**" artifact; dialogue
// keeps the clean quoted line) — matches opts.posture at the real call site (state._scenePosture,
// the SAME value _detectPlannerFunctionGap's echo-check reads).
const REAL_POSTURE = { action: '', dialogue: '"Let the wind of your breath unravel me, as I’ve unraveled yours by oath."' };

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_planner_function_gate_diagnosis_control_out.jsonl') });
  // No stubs registered deliberately — this control never drives a turn/submit and never expects
  // any /api/** call; any such call would be a genuine harness bug (fail-closed abort surfaces it).

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._detectPlannerFunctionGap === 'function' && typeof window.STARTER_PLANS !== 'undefined', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, window._detectPlannerFunctionGap (the REAL, unmodified gate) confirmed present\n');

  // Pull First Sacrifice's OWN real aftermathLanes array + the event-frame resolver's requiredLaneId
  // for the temptation slot, straight from the loaded seed — not retyped, not assumed.
  const seedData = await page.evaluate(() => {
    const plan = window.STARTER_PLANS && window.STARTER_PLANS['starter_first_sacrifice'];
    const row = plan && Array.isArray(plan.scenes) ? plan.scenes.find((s) => s && s.n === 2) : null;
    if (!row) return null;
    return {
      aftermathLanesCount: Array.isArray(row.aftermathLanes) ? row.aftermathLanes.length : 0,
      laneIds: Array.isArray(row.aftermathLanes) ? row.aftermathLanes.map((l) => l.id) : [],
      requiredLaneId: (row.eventFrameBySlot && row.eventFrameBySlot.temptation && row.eventFrameBySlot.temptation.laneId) || null,
    };
  });
  console.log('✓ First Sacrifice scene 2 row: ' + JSON.stringify(seedData) + '\n');
  if (!seedData || !seedData.aftermathLanesCount) { console.error('HARNESS BLOCKER: could not locate scene 2\'s aftermathLanes row in the real loaded seed.'); await browser.close(); process.exit(2); }

  // CRITICAL: the lane objects carry live RegExp values (signalRx/executesRx/etc.) — these do NOT
  // survive a round-trip out of the browser and back in through page.evaluate's own JSON-based
  // argument serialization (a RegExp comes back as {} on the Node side, silently breaking every
  // .test() call). The lane lookup therefore happens ENTIRELY INSIDE this single page.evaluate,
  // reading window.STARTER_PLANS directly, live, in-browser — only the plain sc/posture data
  // (never a regex) crosses the Node↔browser boundary.
  for (const [label, reply, sc] of [['ATTEMPT 6', ATTEMPT6_REPLY, ATTEMPT6_SC], ['ATTEMPT 9', ATTEMPT9_REPLY, ATTEMPT9_SC]]) {
    console.log('='.repeat(100));
    console.log(label + ' — what the plan actually proposed (verbatim from the real reply)');
    console.log('='.repeat(100));
    console.log('  chosen_aftermath_lane:     ' + reply.chosen_aftermath_lane);
    console.log('  tactical_move:             ' + reply.tactical_move);
    console.log('  state_change (the event):  ' + reply.state_change);
    console.log('  forces_choice:             ' + reply.forces_choice);
    console.log('  event_slots.actor:         ' + (reply.event_slots && reply.event_slots.actor));
    console.log('  event_slots.action:        ' + (reply.event_slots && reply.event_slots.action));
    console.log('  event_slots.target:        ' + (reply.event_slots && reply.event_slots.target));
    console.log('  event_slots.exit_state:    ' + (reply.event_slots && reply.event_slots.exit_state));
    console.log('  aftermath_obligations:     ' + reply.aftermath_obligations);
    console.log('  li_pressure_actor:         ' + (reply.li_pressure_actor || '(absent)'));
    console.log('  lane_posture_modulation:   ' + reply.lane_posture_modulation);

    const gateResult = await page.evaluate(({ sc, posture, requiredLaneId }) => {
      const plan = window.STARTER_PLANS['starter_first_sacrifice'];
      const laneRow = plan.scenes.find((s) => s && s.n === 2);
      return window._detectPlannerFunctionGap(sc, {
        requiresAftermath: true,
        posture: posture,
        aftermathLanes: laneRow.aftermathLanes,   // the REAL, live lane objects with working RegExps — never left the browser
        requiredLaneId: requiredLaneId,
      });
    }, { sc: sc, posture: REAL_POSTURE, requiredLaneId: seedData.requiredLaneId });

    console.log('\n  --- REAL GATE RESULT (window._detectPlannerFunctionGap, unmodified) ---');
    console.log('  rejected: ' + gateResult.rejected);
    if (gateResult.rejected) {
      console.log('  reason:   ' + gateResult.reason);
      if (gateResult.echoMatch) console.log('  echoMatch: "' + gateResult.echoMatch + '"');
    }
    console.log('  aftermathVocabPresent: ' + gateResult.aftermathVocabPresent);
    console.log('  echoDiagnostic: ' + JSON.stringify(gateResult.echoDiagnostic));
    console.log('');
  }

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_planner_function_gate_diagnosis_control_out.jsonl')); } catch (_) {}
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
