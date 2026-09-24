// RUPTURE OBJECTIVE PRECEDENCE + CAPABILITY GROUNDING CONTROL
//
// The failed Scene B (2026-09-24): a committed memory rupture declared
// invalidatedPlans ["the formal inquiry cannot be justified without memory of the events"], and the
// planner was still handed First Sacrifice's seed row-3 goal "THE PRICE AND THE THRESHOLD" as
// MANDATORY. It proposed that the presiding Dohkar "draws the memory of the accusation from Seren's
// mind" — reintroducing an erased memory so it could be removed again, giving a Dohkar who had
// asked "What gathering is this?" specific knowledge of the forgotten accusation, and inventing a
// mind-extraction capability no world truth grants.
//
// Two structural causes, both fixed here:
//   1. invalidatedPlans was written to canon and read by NOTHING — advisory prompt text only.
//   2. Rupture precedence only ever displaced the deterministic aftermath lane on an OPEN row. A
//      fixed seed goal could not be displaced by anything.
//
// RED FIXTURE is the REAL planner response from that run, byte-for-byte off disk.
// Zero provider dispatches.
//
// usage: node _rupture_objective_precedence_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_rupture_objective_precedence_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
const SCENE_B_DIR = path.join(__dirname, '_tempt_fate_fixtures', 'scene_b_2026-09-24_08-41-30');
const FIX_A = path.join(__dirname, '_tempt_fate_fixtures', 'run_2026-09-24_02-11-02_scene_a');

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 460) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

// THE REAL RED FIXTURE — the planner response that produced the failed Scene B.
const RED = JSON.parse(fs.readFileSync(path.join(SCENE_B_DIR, 'scene_b_planner_response.json'), 'utf8'));
// The real committed consequence it ignored.
const DURABLE = JSON.parse(fs.readFileSync(path.join(FIX_A, 'outcome_record.json'), 'utf8')).durableConsequences[0];

(async () => {
  console.log('=== RUPTURE OBJECTIVE PRECEDENCE CONTROL (dry; zero provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._tfoInvalidatedPlanIndex
    && window._resolveObjectivePrecedence && window._detectUngroundedCapability, { timeout: 30000 });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. invalidatedPlans NOW PARTICIPATES IN OBJECTIVE SELECTION (req 7)');
  const idx = await page.evaluate((d) => {
    window.state.storyId = 'prec-' + Date.now();
    window.state._temptFateDurableConsequences = [d];
    return window._tfoInvalidatedPlanIndex(window.state);
  }, DURABLE);
  ok('the REAL committed consequence is indexed as carrying invalidated plans',
    idx.any === true && idx.entries.length === 1, JSON.stringify(idx).slice(0, 240));
  ok('...and it carries the exact plan the rupture invalidated, verbatim from canon',
    idx.entries[0].invalidatedPlans.some((p) => /formal inquiry cannot be justified/.test(p)),
    JSON.stringify(idx.entries[0].invalidatedPlans));
  ok('...along with the replanning inputs — what changed, who knows what, surviving evidence, open possibilities',
    Array.isArray(idx.entries[0].changed) && Array.isArray(idx.entries[0].knowledgeStates)
    && Array.isArray(idx.entries[0].establishedEvidence) && Array.isArray(idx.entries[0].openPossibilities),
    JSON.stringify(Object.keys(idx.entries[0])));

  // The RED state: this is what the old code did — nothing.
  const readers = await page.evaluate(() => {
    const src = window._resolveObjectivePrecedence.toString();
    return { readsInvalidated: /invalidatedPlans/.test(window._tfoInvalidatedPlanIndex.toString()),
             precedenceUsesIndex: /_tfoInvalidatedPlanIndex/.test(src) };
  });
  ok('objective precedence is DERIVED from the invalidatedPlans index, not from prompt text',
    readers.readsInvalidated && readers.precedenceUsesIndex, JSON.stringify(readers));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. A SCHEDULED OBJECTIVE IS DEMOTED, NOT DELETED (req 1, 2, 4)');
  const GOAL = 'THE PRICE AND THE THRESHOLD — step 7, then escalation. (A) The sacrifice is taken or identified — the offered MEMORY...';
  const prec = await page.evaluate((g) => window._resolveObjectivePrecedence(window.state, g), GOAL);
  fs.writeFileSync(path.join(OUT_DIR, 'precedence_directive.txt'), prec.directive);
  ok('with a committed invalidating rupture the scheduled objective is CONTINGENT, not mandatory',
    prec.mode === 'contingent', prec.mode);
  ok('the directive names the scheduled objective under review rather than silently dropping it',
    prec.directive.indexOf('THE PRICE AND THE THRESHOLD') !== -1, prec.directive.slice(0, 200));
  ok('...quotes what the rupture actually invalidated, from the committed record',
    /formal inquiry cannot be justified/.test(prec.directive));
  ok('...forbids restoring an erased fact so the scheduled beat can happen anyway — the exact Scene B failure',
    /NOT quietly restore a fact the rupture removed/.test(prec.directive));
  ok('...keeps history historical and reopens only future plans (req 2)',
    /HISTORY IS NOT REOPENED/.test(prec.directive) && /already read still happened/.test(prec.directive));
  ok('...supplies the generic replanning inputs instead of a hand-authored replacement (req 3)',
    /WHAT CHANGED/.test(prec.directive) && /SURVIVING EVIDENCE/.test(prec.directive) && /OPEN POSSIBILITIES/.test(prec.directive));
  // req 6 — a valid green outcome may involve these, but none may be mandatory.
  ok('...PRESCRIBES NOTHING — confusion, contradictory records, a suspended proceeding and a noticed inconsistency are offered as available, never required (req 6)',
    /NOTHING IS PRESCRIBED HERE/.test(prec.directive) && /none is required/.test(prec.directive),
    prec.directive.slice(-320));

  // NEGATIVE CONTROL — no rupture, or a rupture that invalidated nothing, changes nothing at all.
  const noRupture = await page.evaluate((g) => {
    window.state._temptFateDurableConsequences = [];
    return window._resolveObjectivePrecedence(window.state, g);
  }, GOAL);
  ok('NEGATIVE CONTROL — with no committed rupture the objective stays MANDATORY and the directive is empty',
    noRupture.mode === 'mandatory' && noRupture.directive === '', JSON.stringify(noRupture));
  const emptyInv = await page.evaluate((d) => {
    const c = JSON.parse(JSON.stringify(d)); c.invalidatedPlans = [];
    window.state._temptFateDurableConsequences = [c];
    return window._resolveObjectivePrecedence(window.state, 'x');
  }, DURABLE);
  ok('...and a committed rupture that invalidated NOTHING also leaves the objective mandatory',
    emptyInv.mode === 'mandatory', JSON.stringify(emptyInv));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. GENERIC ACROSS RUPTURE CLASSES AND PLAN KINDS (req 8)');
  const classes = await page.evaluate((d) => {
    const mk = (cls, inv) => { const c = JSON.parse(JSON.stringify(d)); c.ruptureClass = cls; c.invalidatedPlans = [inv]; return c; };
    const out = {};
    [['materialization_possession', 'the auction of the relic cannot proceed — it is no longer the house\'s to sell'],
     ['identity_reputation', 'the endorsement hearing is moot now that her name carries a different weight'],
     ['relationship_social', 'the betrothal negotiation has no parties willing to sit'],
     ['history_rewrite', 'the memorial procession commemorates an event that no longer occurred']].forEach(([cls, inv]) => {
      window.state._temptFateDurableConsequences = [mk(cls, inv)];
      const r = window._resolveObjectivePrecedence(window.state, 'some scheduled objective');
      out[cls] = { mode: r.mode, quotesPlan: r.directive.indexOf(inv.slice(0, 30)) !== -1 };
    });
    return out;
  }, DURABLE);
  Object.entries(classes).forEach(([cls, r]) => {
    ok('a ' + cls + ' rupture can strand a different kind of future plan', r.mode === 'contingent' && r.quotesPlan, JSON.stringify(r));
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. THE REAL RED FIXTURE — the planner response that produced the failed Scene B (req 5, 6)');
  console.log('    state_change: "' + RED.state_change + '"');
  const WORLD = ['A Fatelands wish produces no visible magical effect; the world simply reorganises around it.',
                 'The First Sacrifice rite is a social and institutional proceeding, not a magical machine.',
                 'A Dohkar presides over rites and rules on their conduct.'];
  const red = await page.evaluate((a) => window._detectUngroundedCapability(a.RED, { worldTruths: a.WORLD, affordances: [], canonFacts: [] }), { RED, WORLD });
  fs.writeFileSync(path.join(OUT_DIR, 'red_fixture_result.json'), JSON.stringify({ RED, red }, null, 2));
  ok('RED — the real planner proposal is REJECTED before any author dispatch',
    red.flagged === true, JSON.stringify(red));
  ok('...because it declared no mechanism_grounding for a supernatural capability',
    red.reasons.some((r) => /declares no mechanism_grounding/.test(r)), JSON.stringify(red.reasons));

  // A grounding that is merely ASSERTED, citing nothing the story supplied, is also rejected.
  const invented = await page.evaluate((a) => window._detectUngroundedCapability(
    Object.assign({}, a.RED, { mechanism_grounding: 'Dohkars possess the inherited faculty of thoughtdrawing' }),
    { worldTruths: a.WORLD, affordances: [], canonFacts: [] }), { RED, WORLD });
  ok('...and an INVENTED grounding citing nothing in the world truths is rejected too',
    invented.flagged === true && invented.reasons.some((r) => /appears nowhere in this story/.test(r)), JSON.stringify(invented.reasons));

  // GREEN — ordinary events pass, and so does a genuinely grounded capability.
  const greens = await page.evaluate((a) => {
    const v = (p) => window._detectUngroundedCapability(p, { worldTruths: a.WORLD, affordances: ['the assembly may be formally dismissed'], canonFacts: [] });
    return {
      // req 6's allowed shapes — none of which the directive makes mandatory.
      confusion: v({ state_change: 'The assembly disperses without anyone able to say why it convened', event_slots: { actor: 'the assembly', action: 'disperses', target: 'none', mechanism_grounding: 'ordinary' } }),
      contradiction: v({ state_change: 'The registrar\'s ledger records a rite that nobody present remembers attending', event_slots: { actor: 'the registrar', action: 'reads the ledger aloud', target: 'the assembly', mechanism_grounding: 'ordinary' } }),
      suspended: v({ state_change: 'The presiding Dohkar suspends the proceeding, unable to state its cause', event_slots: { actor: 'the presiding Dohkar', action: 'suspends', target: 'the proceeding', mechanism_grounding: 'A Dohkar presides over rites and rules on their conduct.' } }),
      julianNotices: v({ state_change: 'Julian names the gap aloud and asks Lirael what she is not saying', event_slots: { actor: 'Julian', action: 'asks', target: 'Lirael', mechanism_grounding: 'ordinary' } })
    };
  }, { WORLD });
  ok('GREEN — a scene of unexplained confusion passes (ordinary capability)', greens.confusion.flagged === false, JSON.stringify(greens.confusion.reasons));
  ok('GREEN — a contradictory physical record passes', greens.contradiction.flagged === false, JSON.stringify(greens.contradiction.reasons));
  ok('GREEN — a suspended proceeding passes, grounded in the Dohkar\'s REAL authority', greens.suspended.flagged === false, JSON.stringify(greens.suspended.reasons));
  ok('GREEN — Julian noticing an inconsistency and speaking passes', greens.julianNotices.flagged === false, JSON.stringify(greens.julianNotices.reasons));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. THE PLANNER IS ACTUALLY ASKED FOR THE FIELD, AND THE GATE IS WIRED');
  const appSrc = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('mechanism_grounding is a REQUIRED key in the real planner event_slots schema',
    /"mechanism_grounding":"REQUIRED/.test(appSrc), 'not found in the planner schema');
  ok('the schema forbids inventing a capability to make an event possible',
    /may NOT invent a capability, power, faculty or supernatural mechanism/.test(appSrc));
  ok('the grounding gate is wired to REJECT before the author dispatch',
    /ungrounded capability: /.test(appSrc) && /_plannerGroundingRejection/.test(appSrc));
  ok('the precedence directive is wired into the real planner prompt build',
    /PLANNER:PRECEDENCE/.test(appSrc) && /_resolveObjectivePrecedence\(s,/.test(appSrc));

  section('CONTAINMENT');
  ok('ZERO real provider dispatches', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('RUPTURE OBJECTIVE PRECEDENCE CONTROL: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
