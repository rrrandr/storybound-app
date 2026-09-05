// _destiny_fracture_demo.mjs — reproducible DEMONSTRATION of the destiny fracture (no generation).
// Exercises the REAL code paths: a milestone scheduled at atScene=1 whose event was NOT delivered
// (CommittedState keeps pendingIntent, commits NO fact) still fires on schedule via _tickAPlot and
// writes its "consequence" into _relationalConsequenceLedger — which future scenes read as established
// relational reality (consumers @62356 "R→A reciprocity" + @66432 "consequence ledger still in play").
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext()).newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window._tickAPlot === 'function', { timeout: 30000 });

const r = await page.evaluate(() => {
  const s = window.state;
  // A scene-1 destiny beat: a public betrayal that Scene 12/18 would later echo.
  s.aPlot = { goal: 'expose the Warden', currentTurn: 0, milestones: [
    { atScene: 1, kind: 'crisis',
      event: 'Rowan publicly betrays Quinn to the Warden',
      emotional_conductivity: "Quinn's trust in Rowan shatters — she can no longer rely on him",
      triggered: false }
  ]};
  s.turnCount = 1;                     // the story has reached scene 1
  s._relationalConsequenceLedger = []; // clean ledger
  // The author did NOT deliver the betrayal (wrote something else). CommittedState reflects the truth:
  // no fact committed, the intent stays PENDING (the honest, delivery-gated track).
  s._committedState = { facts: [], tableau: null, pendingIntent: { proposed: 'Rowan publicly betrays Quinn to the Warden', sceneProposed: 1 } };

  // ── TICK the A-plot: fires any milestone with atScene <= turn, with NO delivery check ──
  window._tickAPlot();

  const m = s.aPlot.milestones[0];
  const ledger = s._relationalConsequenceLedger || [];
  const active = ledger.filter(x => x && (x.status === 'active' || x.status === 'weakened'));
  // ── CONSUMPTION: the SAME directive that rides into every continuation author's fullSys (_binl_relationalContinuity @277458) ──
  const consequenceText = (ledger[0] && (ledger[0].consequence || ledger[0].sourceMilestoneEvent)) || '';
  let directive = '';
  try { if (typeof window.buildRelationalContinuityDirective === 'function') directive = window.buildRelationalContinuityDirective() || ''; } catch (_) {}
  const directiveSurfacesIt = !!(consequenceText && directive && directive.toLowerCase().includes(consequenceText.toLowerCase().slice(0, 28)));
  return {
    directiveSurfacesIt,
    directiveExcerpt: directive.slice(0, 500),
    // DESTINY (schedule) track:
    milestone_triggered: m.triggered,
    ledger_entries: ledger.length,
    ledger_consequence: ledger[0] ? (ledger[0].consequence || ledger[0].sourceMilestoneEvent || null) : null,
    ledger_status: ledger[0] ? ledger[0].status : null,
    active_consequences_visible_to_future_scenes: active.length,
    // FACT (delivery) track — the honest truth the destiny track ignored:
    fact_committed: (s._committedState.facts || []).length,
    pendingIntent_still_open: !!(s._committedState.pendingIntent && s._committedState.pendingIntent.proposed)
  };
});
await browser.close();

console.log('\n=== DESTINY FRACTURE — REPRODUCIBLE DEMONSTRATION ===\n');
console.log('Setup: milestone "Rowan publicly betrays Quinn" scheduled at scene 1; author did NOT deliver it.\n');
console.log('DESTINY track (schedule-gated _tickAPlot):');
console.log('  milestone.triggered .............. ' + r.milestone_triggered + '   <- fired on schedule');
console.log('  ledger entries written ........... ' + r.ledger_entries);
console.log('  ledger consequence ............... ' + JSON.stringify(r.ledger_consequence));
console.log('  status (active => fed downstream) . ' + r.ledger_status + '  (' + r.active_consequences_visible_to_future_scenes + ' visible to future scenes)');
console.log('\nFACT track (delivery-gated CommittedState):');
console.log('  facts committed .................. ' + r.fact_committed + '   <- betrayal was NEVER delivered');
console.log('  pendingIntent still open ......... ' + r.pendingIntent_still_open + '   <- system KNOWS it did not happen');
console.log('\nCONSUMPTION (the harm — buildRelationalContinuityDirective rides into every continuation fullSys @277458):');
console.log('  directive surfaces the false consequence . ' + r.directiveSurfacesIt + '   <- later authors are TOLD the betrayal happened');
if (r.directiveExcerpt) console.log('  directive excerpt: "' + r.directiveExcerpt.replace(/\s+/g, ' ').trim() + '"');
const proven = r.milestone_triggered === true && r.ledger_entries > 0 && r.fact_committed === 0 && r.directiveSurfacesIt === true;
console.log('\nRESULT: ' + (proven
  ? 'DEMONSTRATED END-TO-END — undelivered milestone FIRES on schedule -> injects a FALSE consequence into the ledger -> that consequence is SURFACED by buildRelationalContinuityDirective, which rides into every continuation author fullSys, so later authors are told the betrayal happened -- WHILE the fact track correctly holds that it never did. Injection + consumption, no generation.'
  : 'PARTIAL — injection reproduced; check the CONSUMPTION line (buildRelationalContinuityDirective may need more state to render, e.g. LI name / turnCount).'));
