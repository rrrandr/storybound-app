// CANON PACKET POLARITY DIAGNOSTIC — measures the packet, not a model. ZERO dispatches, $0.
//
// WHY THIS EXISTS. Two auditor candidates from different vendors (ministral-8b-2512 and
// gpt-4o-mini) each returned "violation" on 100% of the green fixtures. I recorded a hypothesis
// that the shared PROMPT was the common factor and that it was biased toward finding violations.
// Reading the retained replies makes that hypothesis MOSTLY WRONG and replaces it with something
// narrower and measurable, which is what this script measures:
//
//   The prompt already says, in as many words, "Ordinary human action is ALWAYS allowed and is
//   never a violation: speaking, lying, refusing, arriving... do not flag it." So the bias is not
//   a missing permission clause. What the models actually did was cite a SPECIFIC supplied fact —
//   and in the two clearest cases, that fact was a DESCRIPTIVE world truth wearing a `neg_` id.
//
// `neg_` is assigned by _CANON_NEGATIVE_RX, a SUBSTRING match for NO/NOT/NEVER/cannot/... So a
// costume note reading "(just cloth, part of their ceremonial sash; NO orb, NO bead, NO gag)"
// is filed as a NEGATIVE, handed to a model under an id literally prefixed "neg", in a task whose
// framing question is "does the plan assert anything the supplied canon does not support?".
// gpt-4o-mini then cited exactly that fact to block Julian lifting a torn mouth-band, reasoning
// that the band "is not described as being capable of being torn". Ministral cited the same fact
// on a different green. That is not a model being stupid; that is a mislabelled packet.
//
// This script measures the defect with the REAL production classifier and the REAL packet builder,
// and re-reads the REAL retained replies. It asserts nothing about what a fixed prompt would do —
// that cannot be known without a paid run, and this script buys nothing.
//
// usage: node _canon_packet_polarity_diagnostic.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { loadFixtures } from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_packet_polarity_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const RUNS = {
  'ministral-8b-2512': path.join(__dirname, '_tempt_fate_fixtures', 'canon_calibration_2026-09-24_18-22-08'),
  'gpt-4o-mini': path.join(__dirname, '_tempt_fate_fixtures', 'canon_calibration_2026-09-24_18-43-29')
};

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  console.log('=== CANON PACKET POLARITY DIAGNOSTIC (zero dispatches, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildCanonPacket && window._CANON_NEGATIVE_RX && window.STARTER_SEEDS, { timeout: 30000 });

  section('1. WHAT `neg_` ACTUALLY CLASSIFIES — measured with the REAL production regex');
  // Every world truth the classifier files as a NEGATIVE, with the token that triggered it and the
  // text around that token. No judgement is applied here; the strings are the evidence.
  const classified = await page.evaluate(() => {
    const seed = window.STARTER_SEEDS['starter_first_sacrifice'];
    const rx = window._CANON_NEGATIVE_RX;
    return (seed.worldTruths || []).map((t, i) => {
      const m = String(t).match(rx);
      return { i, negative: !!m, token: m ? m[0] : null,
        at: m ? m.index : -1,
        context: m ? String(t).slice(Math.max(0, m.index - 45), m.index + 55) : null,
        head: String(t).slice(0, 90) };
    });
  });
  const negs = classified.filter((c) => c.negative);
  console.log('    world truths: ' + classified.length + '   classified NEGATIVE: ' + negs.length);
  fs.writeFileSync(path.join(OUT_DIR, 'classification.json'), JSON.stringify(classified, null, 2));
  ok('the real classifier is reachable and did classify the real seed corpus',
    classified.length > 10 && negs.length > 0, classified.length + '/' + negs.length);

  // The measurable, non-judgemental signal: a fact whose ONLY trigger is a token inside a
  // PARENTHETICAL or a "NO x, NO y" enumeration is describing a thing, not forbidding conduct.
  const incidental = negs.filter((c) => /^[^()]*\([^)]*$/.test(String(c.context).slice(0, c.context.indexOf(c.token) + 1))
    || /\bNO\b[^.;]{0,24},\s*NO\b/i.test(c.context));
  console.log('\n    NEGATIVE-classified facts whose trigger sits in a descriptive parenthetical or a'
    + '\n    "NO x, NO y" enumeration (describing a thing, not forbidding conduct):');
  incidental.forEach((c) => console.log('      [neg? idx ' + c.i + '] token "' + c.token + '" … ' + JSON.stringify(c.context)));
  ok('AT LEAST ONE supposedly-negative fact is triggered by a purely DESCRIPTIVE token',
    incidental.length > 0, 'none found — the hypothesis would be dead here');

  section('2. THE MISLABELLED FACT IS THE ONE THE MODELS ACTUALLY CITED');
  // Build the real packet for the real green fixture and find the fact the models blamed.
  const { fixtures, durable } = loadFixtures();
  const green = fixtures.find((f) => f.id === 'green_mundane_invention');
  const packet = await page.evaluate((a) => {
    const s = window.state; s.storyId = 'diag-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [a.durable];
    const p = window._buildCanonPacket(s, { proposal: a.plan });
    return { facts: p.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text })), truncated: p.truncated };
  }, { durable, plan: green.plan });
  fs.writeFileSync(path.join(OUT_DIR, 'green_mundane_invention_packet.json'), JSON.stringify(packet, null, 2));
  const neg1 = packet.facts.find((f) => f.id === 'neg_1');
  ok('neg_1 exists in the real packet for this green fixture', !!neg1);
  ok('neg_1 is the SACRIFICIANT SEAL fact — a costume/role description, not a prohibition on conduct',
    !!neg1 && /SACRIFICIANT SEAL/i.test(neg1.text) && /just cloth/i.test(neg1.text), neg1 && neg1.text.slice(0, 120));
  ok('and its negative trigger really is the costume parenthetical "NO orb, NO bead, NO gag"',
    !!neg1 && /NO orb, NO bead, NO gag/.test(neg1.text));
  ok('nothing in neg_1 forbids a band being torn, produced, or lifted — the plan it was used to block',
    !!neg1 && !/torn|tear|lift|produce/i.test(neg1.text), neg1 && neg1.text.slice(0, 200));

  section('3. BOTH MODELS, INDEPENDENTLY, CITED A DESCRIPTIVE FACT TO BLOCK A GREEN');
  const citedOnGreens = {};
  for (const [model, dir] of Object.entries(RUNS)) {
    citedOnGreens[model] = [];
    for (const fx of fixtures.filter((f) => f.expect === 'pass')) {
      const p = path.join(dir, fx.id + '.json');
      if (!fs.existsSync(p)) continue;
      const d = JSON.parse(fs.readFileSync(p, 'utf8'));
      const v = (d.result && d.result.validated) || {};
      (v.violations || []).forEach((x) => {
        (x.citedFactIds || []).forEach((id) => {
          const clean = String(id).trim().replace(/^\[+|\]+$/g, '');
          citedOnGreens[model].push({ fixture: fx.id, category: x.category, id: clean, why: x.why });
        });
      });
    }
    console.log('    ' + model + ':');
    citedOnGreens[model].forEach((c) => console.log('      ' + c.fixture.padEnd(28) + c.category.padEnd(24) + c.id));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'green_citations.json'), JSON.stringify(citedOnGreens, null, 2));
  const bothCitedNeg = Object.values(citedOnGreens).every((rows) => rows.some((r) => /^neg_/.test(r.id)));
  ok('BOTH models cited a neg_-prefixed fact as grounds for blocking a legitimate plan',
    bothCitedNeg, JSON.stringify(citedOnGreens).slice(0, 300));
  const gptBand = (citedOnGreens['gpt-4o-mini'] || []).find((r) => r.fixture === 'green_mundane_invention');
  ok('gpt-4o-mini\'s stated reason is absence-as-prohibition against that descriptive fact',
    !!gptBand && /not described as being capable/i.test(gptBand.why), gptBand && gptBand.why);

  section('4. A SECOND, SEPARATE DEFECT — SURVIVING EVIDENCE NEVER REACHES THE PACKET');
  // A durable consequence records what a rupture LEFT INTACT (establishedEvidence) and what remains
  // open (openPossibilities). For green_confusion_records the surviving written record IS the
  // authorisation: the plan turns on a LEDGER disagreeing with memory. Both models instead reasoned
  // "the assembly remembers nothing, so it cannot read the ledger" — collapsing record into memory.
  // They had no fact saying the record survived, because the packet never carries one.
  const evidenceProbe = await page.evaluate((a) => {
    const s = window.state; s.storyId = 'diag2-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    const d = JSON.parse(JSON.stringify(a.durable));
    s._temptFateDurableConsequences = [d];
    const p = window._buildCanonPacket(s, { proposal: a.plan });
    return { establishedEvidence: d.establishedEvidence || [], openPossibilities: d.openPossibilities || [],
      packetText: p.facts.map((f) => f.text).join('\n') };
  }, { durable, plan: fixtures.find((f) => f.id === 'green_confusion_records').plan });
  console.log('    the committed record stores establishedEvidence: '
    + JSON.stringify(evidenceProbe.establishedEvidence).slice(0, 220));
  const reached = evidenceProbe.establishedEvidence.filter((e) =>
    evidenceProbe.packetText.includes(String(e).slice(0, 40)));
  ok('the committed consequence DOES record surviving evidence',
    evidenceProbe.establishedEvidence.length > 0, JSON.stringify(evidenceProbe.establishedEvidence));
  ok('DEFECT — none of that surviving evidence reaches the canon packet the auditor sees',
    evidenceProbe.establishedEvidence.length > 0 && reached.length === 0,
    'reached: ' + JSON.stringify(reached));

  section('5. A THIRD DEFECT — THE CATEGORY MENU DROPS THE QUALIFIERS');
  const prompt = await page.evaluate((a) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [a.durable];
    const p = window._buildCanonPacket(s, { proposal: a.plan });
    return window._buildCanonAuditPrompt(a.plan, p).sys;
  }, { durable, plan: green.plan });
  fs.writeFileSync(path.join(OUT_DIR, 'prompt_as_sent.txt'), prompt);
  ok('the prompt DOES already carry an explicit ordinary-action permission clause '
    + '(so "the prompt lacks a permission clause" was the WRONG hypothesis)',
    /Ordinary human action is ALWAYS allowed/.test(prompt));
  ok('the "Flag ONLY" rule DOES state the qualifier for rewritten history',
    /history rewritten when no committed rupture rewrote it/i.test(prompt));
  // ...but the menu the model picks from at output time is bare.
  const menu = (prompt.match(/CATEGORIES:.*/) || [''])[0];
  console.log('    menu as sent: ' + menu);
  ok('DEFECT — the CATEGORIES menu lists bare names with NO qualifier, and it sits next to the '
    + 'output schema where the model actually chooses',
    /CATEGORIES:/.test(menu) && !/committed rupture/i.test(menu), menu);
  const misapplied = [];
  for (const [model, dir] of Object.entries(RUNS)) {
    const p = path.join(dir, 'green_tempt_history_rewrite.json');
    if (!fs.existsSync(p)) continue;
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    ((d.result && d.result.validated || {}).violations || []).forEach((x) => {
      if (x.category === 'rewritten_history') misapplied.push({ model, why: x.why });
    });
  }
  ok('and a model DID apply rewritten_history to a plan CONFORMING to a committed rewrite — '
    + 'exactly the case the qualifier excludes',
    misapplied.length > 0, JSON.stringify(misapplied).slice(0, 300));

  section('6. CONTAINMENT');
  ok('zero provider dispatches — this diagnostic buys nothing',
    gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, classified, citedOnGreens }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' diagnostic assertions held');
  if (passed !== results.length) console.log('  NOT HELD: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  console.log('  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('DIAGNOSTIC ERROR:', e && e.stack || e); process.exit(2); });
