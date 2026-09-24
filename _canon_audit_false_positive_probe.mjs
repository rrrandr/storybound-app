// FALSE-POSITIVE PROBE — the deterministic canon check against the known-good planner corpus.
//
// 28 real planner proposals from the 14 retained ordinary Scene 2 runs. "Known-good" here means
// SUCCESSFULLY GENERATED, not human-approved — the same caution that applied to the adequacy
// corpus. Offline except for loading the real production functions in a page. Zero dispatches.
//
// usage: node _canon_audit_false_positive_probe.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '_canon_audit_control_out');
const CORPUS = JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures', 'known_good_planner_corpus.json'), 'utf8'));
const DURABLE = JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures', 'run_2026-09-24_02-11-02_scene_a', 'outcome_record.json'), 'utf8')).durableConsequences[0];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT, 'fp_gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildCanonPacket && window._canonDeterministicCheck, { timeout: 30000 });

  const out = await page.evaluate((a) => {
    window.state.storyId = 'fp-' + Date.now();
    window.state._starterId = 'starter_first_sacrifice';
    window.state._temptFateDurableConsequences = [a.DURABLE];
    const packet = window._buildCanonPacket(window.state);
    const asIs = [], withOrdinary = [];
    a.CORPUS.forEach((p, i) => {
      asIs.push({ i, r: window._canonDeterministicCheck(p, packet) });
      const q = JSON.parse(JSON.stringify(p));
      q.event_slots = Object.assign({}, q.event_slots || {}, { mechanism_grounding: 'ordinary' });
      withOrdinary.push({ i, r: window._canonDeterministicCheck(q, packet) });
    });
    // Which corpus plans ASSERT a visible magical effect, against the story's own negative truth?
    const negRx = /\bglow(?:s|ing|ed)?\b|\bshimmer\w*\b|\blight flares?\b|\bsurge of light\b|\bvisible burn\b|\bblaz\w+\b|\bradian\w+\b/i;
    const visual = a.CORPUS.map((p, i) => ({ i, sc: String(p.state_change || '') })).filter((x) => negRx.test(x.sc));
    return { packetFacts: packet.facts.length, negatives: packet.negatives.length,
      asIsRejected: asIs.filter((x) => x.r.decided).length, total: a.CORPUS.length,
      withOrdinaryRejected: withOrdinary.filter((x) => x.r.decided).length,
      visibleEffectPlans: visual };
  }, { CORPUS, DURABLE });

  console.log('FALSE-POSITIVE PROBE — deterministic canon check vs 28 known-good planner proposals\n');
  console.log('  canon packet: ' + out.packetFacts + ' facts, ' + out.negatives + ' negative\n');
  console.log('  AS RETAINED (no mechanism_grounding — they predate the field):');
  console.log('    rejected ' + out.asIsRejected + '/' + out.total + '  → ' + Math.round(100 * out.asIsRejected / out.total) + '%');
  console.log('    This is a SCHEMA-MIGRATION effect, not a canon judgement. Every pre-existing plan');
  console.log('    lacks a field the planner is only now asked for.\n');
  console.log('  WITH mechanism_grounding:"ordinary" injected (what the planner now returns):');
  console.log('    rejected ' + out.withOrdinaryRejected + '/' + out.total + '  → ' + Math.round(100 * out.withOrdinaryRejected / out.total) + '%');
  console.log('    This is the meaningful false-positive rate for the DETERMINISTIC layer.\n');
  console.log('  Corpus plans asserting a VISIBLE MAGICAL EFFECT, against this story\'s own');
  console.log('  negative truth ("a wish produces NO visible magical effect — no light, glow, surge, or sign"):');
  console.log('    ' + out.visibleEffectPlans.length + '/' + out.total + ' proposals');
  out.visibleEffectPlans.slice(0, 5).forEach((x) => console.log('      [' + x.i + '] ' + x.sc.slice(0, 150)));
  console.log('\n    These are NOT false positives — they are exactly what the semantic auditor exists');
  console.log('    to catch, and the deterministic layer cannot see them. "Known-good" meant');
  console.log('    successfully generated, never human-approved.');
  console.log('\n  real provider dispatches: ' + gate.realCalls().length);
  fs.writeFileSync(path.join(OUT, 'false_positive_probe.json'), JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => { console.error('PROBE ERROR:', e && e.stack || e); process.exit(2); });
