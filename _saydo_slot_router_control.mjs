// ORDINARY SAY/DO → EXISTING eventFrameBySlot SLOT. Dry, zero dispatches, $0.
//
// THE DEFECT, STATED CORRECTLY. It was never "no lane exists" — an earlier note of mine said that and
// was wrong. The seed already authors the right lane shape: `boundary` is written for "Lirael's open,
// unretreating want is what draws Seren's family forward". The bug is that _resolveStarterEventFrame
// took its slot ONLY from _intimateInterruption.selectedSlot, which only the intimate-interruption
// FATE-CARD lifecycle populates. An ordinary CG Say/Do never enters that subsystem, so slot was null,
// defaultEventFrame won, and its laneId is 'dohkar_preliminary_review' — every non-institutional
// player move got answered with procedure. The paid Safe Mode rerun died on exactly this.
//
// usage: node _saydo_slot_router_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_saydo_slot_router_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const note = (t) => console.log('    ' + t);
const section = (t) => console.log('\n=== ' + t + ' ===');

// THE RED FIXTURE IS REAL: the exact Say/Do from the invalidated paid Safe Mode rerun.
const SAFEMODE_INPUT = {
  action: 'I pull him down onto the bed and start unbuckling his belt',
  dialogue: '"Stay. I want you tonight — all of it."'
};
const CASES = [
  { id: 'RED-safemode',   label: 'the retained Safe Mode adult input', io: SAFEMODE_INPUT, expect: 'boundary' },
  { id: 'advance',        label: 'a plainer sexual advance',
    io: { action: 'I kiss him and pull him closer', dialogue: '"I want you."' }, expect: 'boundary' },
  { id: 'weak',           label: 'a weak/uncertain input', io: { action: '', dialogue: "I don't know." }, expect: null },
  { id: 'weak-2',         label: 'another weak shape', io: { action: '', dialogue: 'whatever' }, expect: null },
  { id: 'relational',     label: 'a NONSEXUAL relational move',
    io: { action: 'I stand beside him where everyone can see it', dialogue: '"I trust him."' }, expect: null },
  { id: 'procedural',     label: 'a purely PROCEDURAL player move',
    io: { action: 'I ask that the matter be reviewed formally', dialogue: '"Let the assembly hear it."' }, expect: null },
  { id: 'confession',     label: 'an admission (existing slot)',
    io: { action: '', dialogue: '"It was me. I shaped the wish."' }, expect: 'confession' },
  { id: 'reversal',       label: 'an authority challenge (existing slot)',
    io: { action: '', dialogue: '"You have no right to rule on this."' }, expect: 'reversal' }
];

(async () => {
  console.log('=== SAY/DO SLOT ROUTER (dry, zero dispatches, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._classifySayDoSlot && window._resolveStarterEventFrame
    && window._detectWeakTurn && window._detectReservedContentBreach, { timeout: 30000 });

  section('1. CLASSIFICATION — NARROW, DETERMINISTIC, AND IT EXPLAINS ITSELF');
  const cls = await page.evaluate((cases) => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    const out = {};
    cases.forEach((c) => { out[c.id] = window._classifySayDoSlot(c.io.action, c.io.dialogue); });
    // Determinism: the same input twice must give the same answer (no model call, no randomness).
    out.__repeat = window._classifySayDoSlot(cases[0].io.action, cases[0].io.dialogue);
    return out;
  }, CASES);
  fs.writeFileSync(path.join(OUT_DIR, 'classification.json'), JSON.stringify(cls, null, 2));
  CASES.forEach((c) => {
    const got = cls[c.id];
    note(c.id + ' → ' + JSON.stringify(got.slot) + '  [' + got.confidence + ']  ' + got.reason.slice(0, 96));
    ok('CLASSIFY ' + c.id + ' (' + c.label + ') → ' + JSON.stringify(c.expect),
      got.slot === c.expect, JSON.stringify(got));
  });
  ok('every classification carries EVIDENCE or an explicit reason, so a misfire is explainable',
    CASES.every((c) => (cls[c.id].reason || '').length > 10), JSON.stringify(CASES.map((c) => cls[c.id].reason)));
  ok('deterministic — identical input, identical answer (no model call)',
    JSON.stringify(cls.__repeat) === JSON.stringify(cls['RED-safemode']));
  ok('WEAK INPUT IS EXCLUDED BY THE WEAK-TURN AUTHORITY, not by a separate guess',
    /weak turn/.test(cls.weak.reason) && /weak turn/.test(cls['weak-2'].reason),
    JSON.stringify([cls.weak.reason, cls['weak-2'].reason]));
  ok('...and the weak reason states WHY inflation is refused',
    /not a claim of unretreating want/.test(cls.weak.reason), cls.weak.reason);
  ok('the PROCEDURAL fallback explains that the institutional default is correct for it',
    /institutional default/.test(cls.procedural.reason), cls.procedural.reason);
  ok('the RELATIONAL fallback says no slot represents it, rather than forcing one',
    /no slot represented/.test(cls.relational.reason), cls.relational.reason);

  section('2. THE ROUTER — WHICH LANE THE PLANNER WOULD ACTUALLY BE REQUIRED TO USE');
  const routed = await page.evaluate((cases) => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    const plan = STARTER_PLANS['starter_first_sacrifice'];
    const row = (plan.scenes || []).find((r) => r && r.n === 2);   // the row that declares the menu
    const resolve = (slot) => {
      if (slot) s._sayDoResolvedSlot = slot; else delete s._sayDoResolvedSlot;
      delete s._intimateInterruption;
      const f = window._resolveStarterEventFrame(row, s);
      delete s._sayDoResolvedSlot;
      return f ? { laneId: f.laneId, sourceSlot: f.sourceSlot } : null;
    };
    const out = { baseline: resolve(null) };
    cases.forEach((c) => { out[c.id] = resolve(window._classifySayDoSlot(c.io.action, c.io.dialogue).slot); });
    // CARD PRECEDENCE: an explicit reader choice must outrank an inferred slot.
    s._sayDoResolvedSlot = 'boundary';
    s._intimateInterruption = { selectedSlot: 'reversal' };
    const contest = window._resolveStarterEventFrame(row, s);
    delete s._sayDoResolvedSlot; delete s._intimateInterruption;
    out.__cardWins = contest ? contest.laneId : null;
    return out;
  }, CASES);
  fs.writeFileSync(path.join(OUT_DIR, 'routing.json'), JSON.stringify(routed, null, 2));
  note('baseline (no slot) → ' + JSON.stringify(routed.baseline));
  ok('BASELINE UNCHANGED — with no classified slot the institutional default still wins',
    routed.baseline && routed.baseline.laneId === 'dohkar_preliminary_review', JSON.stringify(routed.baseline));
  note('RED-safemode → ' + JSON.stringify(routed['RED-safemode']));
  ok('RED — the retained Safe Mode input now resolves to the BOUNDARY lane, not the review lane',
    routed['RED-safemode'] && routed['RED-safemode'].laneId === 'family_accusation'
    && routed['RED-safemode'].sourceSlot === 'boundary', JSON.stringify(routed['RED-safemode']));
  ok('...and that is NO LONGER dohkar_preliminary_review — the exact bug that killed the paid run',
    routed['RED-safemode'].laneId !== 'dohkar_preliminary_review', JSON.stringify(routed['RED-safemode']));
  ok('a plainer sexual advance routes the same way', routed.advance
    && routed.advance.sourceSlot === 'boundary', JSON.stringify(routed.advance));
  ok('WEAK input stays on the institutional default — never promoted to boundary',
    routed.weak && routed.weak.laneId === 'dohkar_preliminary_review' && !routed.weak.sourceSlot,
    JSON.stringify(routed.weak));
  ok('PROCEDURAL input stays institutional, as it should',
    routed.procedural && routed.procedural.laneId === 'dohkar_preliminary_review', JSON.stringify(routed.procedural));
  ok('NONSEXUAL RELATIONAL input falls back to the default rather than borrowing boundary',
    routed.relational && routed.relational.laneId === 'dohkar_preliminary_review', JSON.stringify(routed.relational));
  ok('an admission routes through the seed\'s confession frame', routed.confession
    && routed.confession.sourceSlot === 'confession', JSON.stringify(routed.confession));
  ok('an authority challenge routes through the seed\'s reversal frame', routed.reversal
    && routed.reversal.sourceSlot === 'reversal', JSON.stringify(routed.reversal));
  ok('AN EXPLICIT READER FATE-CARD CHOICE OUTRANKS AN INFERRED SLOT',
    routed.__cardWins === 'julian_jurisdiction_challenge', JSON.stringify(routed.__cardWins));

  section('3. NO NEW LANE WAS INVENTED, AND NO "ANYTHING INTIMATE" BUCKET');
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  const laneIds = await page.evaluate(() => {
    const plan = STARTER_PLANS['starter_first_sacrifice'];
    const row = (plan.scenes || []).find((r) => r && r.n === 2);
    return { lanes: (row.aftermathLanes || []).map((l) => l.id),
             slots: Object.keys(row.eventFrameBySlot || {}) };
  });
  note('lanes: ' + JSON.stringify(laneIds.lanes));
  note('slots: ' + JSON.stringify(laneIds.slots));
  ok('the lane menu is still the seed\'s original five — nothing was added',
    laneIds.lanes.length === 5 && laneIds.lanes.indexOf('dohkar_preliminary_review') !== -1
    && !laneIds.lanes.some((l) => /sex|intima|erotic/i.test(l)), JSON.stringify(laneIds.lanes));
  ok('the slot set is still the seed\'s original five', laneIds.slots.length === 5,
    JSON.stringify(laneIds.slots));
  ok('the classifier only ever returns slots the seed already authors',
    CASES.every((c) => cls[c.id].slot === null || laneIds.slots.indexOf(cls[c.id].slot) !== -1),
    JSON.stringify(CASES.map((c) => cls[c.id].slot)));
  ok('no broad intimacy bucket: the want test requires a STRONG act or an explicit want-claim',
    /_SLOT_WANT_STRONG = [^\n]*unbuckl/.test(src) && !/intimate|arousal/i.test((src.match(/_SLOT_WANT_STRONG = [^\n]*/) || [''])[0]));

  section('4. THE OTHER TWO SYSTEMS STILL WORK');
  const downstream = await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    // buildPlayerImpactDirective must still receive the Say/Do after plan selection. IT READS
    // state._playerImpactRead (r.raw.do / r.raw.say) — NOT the _lastSayDo* stash. A first version of
    // this fixture set the stash and then reported the empty result as a regression; the fixture was
    // wrong, not the code. Drive the real input shape it actually consumes.
    s._lastSayDoAction = 'I pull him down onto the bed and start unbuckling his belt';
    s._lastSayDoDialogue = '"Stay. I want you tonight — all of it."';
    s._playerImpactRead = { raw: { do: s._lastSayDoAction, say: s._lastSayDoDialogue },
                            mustReact: true, class: ['off-script'] };
    let impact = null;
    try { impact = (typeof window.buildPlayerImpactDirective === 'function')
      ? window.buildPlayerImpactDirective() : 'NO_ACCESSOR'; } catch (e) { impact = 'ERR ' + e.message; }
    const impactCarriesSayDo = typeof impact === 'string'
      && impact.indexOf('unbuckling his belt') !== -1 && impact.indexOf('I want you tonight') !== -1;
    // Reserved-canon guard must still reject reserved markers before author dispatch.
    window._canonAuditEnabled = false;
    const reserved = window._detectReservedContentBreach({
      state_change: 'A preliminary review will convene in three days at the Open, where a Chayr and two Dohkars will hear the matter',
      event_slots: { actor: 'the presiding Dohkar', action: 'announces', target: 'the assembly',
        exit_state: 'scheduled', mechanism_grounding: 'ordinary' } }, s, 2);
    delete window._canonAuditEnabled;
    const weakDirective = window._buildWeakTurnRestraintDirective('', "I don't know.");
    delete s._lastSayDoAction; delete s._lastSayDoDialogue;
    delete s._playerImpactRead;
    return { impactType: typeof impact, impactLen: String(impact || '').length, reserved: reserved,
             impactCarriesSayDo: impactCarriesSayDo, weakLen: String(weakDirective || '').length };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'downstream.json'), JSON.stringify(downstream, null, 2));
  note('playerImpact: ' + downstream.impactType + ' len=' + downstream.impactLen + '  weakDirective len=' + downstream.weakLen);
  ok('buildPlayerImpactDirective still runs and still produces content after plan selection',
    downstream.impactType === 'string' && downstream.impactLen > 0,
    JSON.stringify(downstream));
  ok('...and it still carries the player\'s LITERAL Say/Do through to the author',
    downstream.impactCarriesSayDo === true, JSON.stringify(downstream));
  ok('RESERVED-CANON NON-REGRESSION — reserved markers are still rejected before author dispatch',
    !!downstream.reserved && (downstream.reserved.markers || []).length >= 2, JSON.stringify(downstream.reserved));
  ok('...and it still reports the schedule it judged against (due row 14)',
    downstream.reserved.dueScene === 14, JSON.stringify(downstream.reserved));
  ok('the weak-turn restraint still emits for a weak turn', downstream.weakLen > 0, String(downstream.weakLen));

  section('5. CONTAINMENT');
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
