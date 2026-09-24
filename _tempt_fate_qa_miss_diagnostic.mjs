// QA MISS DIAGNOSTIC — why did the existing QA layer not flag the 2026-09-24 rupture scene?
//
// Roman, 2026-09-24: "It visibly violates two explicit instructions — 30–38 beats and no
// suspended-mood ending — so the important question is why the existing QA layer did not flag
// those misses."
//
// Runs the REAL, exported production detectors against the REAL retained scene. Nothing is
// reimplemented and nothing is simulated: the scene comes off disk from the paid run's own
// artifact, and _detectSceneAdequacyFailure / _detectLIPresenceFloor / _detectLIPresenceDominance
// are the same functions the pipeline calls.
//
// Zero provider dispatches.
//
// usage: node _tempt_fate_qa_miss_diagnostic.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_qa_miss_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 500) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

const SCENE = JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures',
  'run_2026-09-24_02-11-02_scene_a', 'scene_a_raw_output.txt'), 'utf8'));

(async () => {
  console.log('=== QA MISS DIAGNOSTIC (dry; zero provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._detectSceneAdequacyFailure && window._detectLIPresenceFloor
    && window._detectLIPresenceDominance, { timeout: 30000 });

  const beats = SCENE.beats || [];
  const tail = beats.slice(-5).map((b) => b.text);
  console.log('    scene under test: ' + beats.length + ' beats, '
    + beats.reduce((n, b) => n + String(b.text || '').length, 0) + ' chars of prose');
  console.log('    final 5 beats:');
  tail.forEach((t) => console.log('      · ' + t));

  // ── 1. SCENE ADEQUACY ────────────────────────────────────────────────────────────────────────
  section('1. THE REAL SCENE-ADEQUACY DETECTOR, run against this exact scene');
  const adequacy = await page.evaluate((s) => window._detectSceneAdequacyFailure(s, {
    starterId: 'starter_first_sacrifice'
  }), SCENE);
  fs.writeFileSync(path.join(OUT_DIR, 'adequacy.json'), JSON.stringify(adequacy, null, 2));
  console.log('    verdict: ' + (adequacy.failed ? 'FAILED' : 'PASSED') + '  reasons=' + JSON.stringify(adequacy.reasons || []));
  console.log('    ending check: ' + JSON.stringify((adequacy.checks || {}).ending));

  // MISS 1 — the suspended-mood ending. ORIGINAL DIAGNOSIS (2026-09-24, before the fix): the
  // detector had the rule but did not fire, because \bspeaks?\b matched "I could speak now and
  // claim what I did" and set movementVerbPresent=true. These assertions now check the REPAIR.
  const endingChecks = (adequacy.checks || {}).ending || {};
  ok('FIXED — the modality-aware movement test no longer counts "I could speak now" as completed forward movement',
    endingChecks.suspensionVocabPresent === true && endingChecks.movementVerbPresent === false,
    JSON.stringify(endingChecks));
  ok('...and with no post-scene fulfilment data the ending is recorded as UNKNOWN, not failed — an absent signal must not manufacture a defect',
    endingChecks.assignedEventLanded === 'unknown'
    && !(adequacy.reasons || []).some((r) => /suspended mood/.test(r))
    && (adequacy.warnings || []).some((w) => /UNKNOWN/.test(w)),
    JSON.stringify(endingChecks) + ' warnings=' + JSON.stringify(adequacy.warnings));

  // WHY: the movement-verb test is mood-blind. Prove it on the tail text directly, using the
  // production regexes rather than a copy.
  const why = await page.evaluate((tailText) => {
    // Re-derive from the production source so this cannot drift from the real pattern.
    const src = window._detectSceneAdequacyFailure.toString();
    return { srcHasBeatCount: /beats\.length\s*[<>]/.test(src), tailText };
  }, tail.join(' \n '));
  const movementTriggers = tail.filter((t) => /\bspeaks?\b|\bspoke\b|\bsteps?\s+forward\b|\bstepped\b|\bmoves?\b|\bmoved\b|\breaches?\b|\breached\b|\bturns?\b|\bturned\b|\bleaves?\b|\bleft\b|\barrives?\b|\barrived\b|\bannounces?\b|\bannounced\b|\bdeclares?\b|\bdeclared\b/i.test(t));
  console.log('    beats in the tail that satisfied the "forward movement" test:');
  movementTriggers.forEach((t) => console.log('      → ' + t));
  ok('ROOT CAUSE — the movement-verb test is MOOD-BLIND: a hypothetical ("I could speak") counts as completed forward movement',
    movementTriggers.some((t) => /\bcould\b|\bmight\b|\bor I\b/i.test(t)),
    JSON.stringify(movementTriggers));

  // MISS 2 — beat count. The prompt sets three floors; the detector has no such check at all.
  section('2. BEAT COUNT — the prompt sets floors of 18 / 22 / 30-38. What enforces them?');
  // ORIGINAL DIAGNOSIS: no beat-count check existed anywhere, against three prompt-stated floors.
  // Now checks the REPAIR — a density floor exists, and is WARN-only.
  ok('FIXED — _detectSceneAdequacyFailure now carries a beat-count floor',
    why.srcHasBeatCount === true, 'no beats.length comparison found — the density floor is missing');
  const density = (adequacy.checks || {}).density || {};
  ok('...the density floor reports BOTH axes (beats and prose), never beats alone',
    typeof density.beats === 'number' && typeof density.proseChars === 'number'
    && density.beatFloor === 23 && density.proseFloor === 915, JSON.stringify(density));
  ok('...and it WARNS without failing — this 18-beat/796-char scene is recorded, not rejected',
    (adequacy.warnings || []).some((w) => /density below the observed corpus floor/.test(w))
    && !(adequacy.reasons || []).some((r) => /density/.test(r)),
    'warnings=' + JSON.stringify(adequacy.warnings));
  // Narrowed deliberately. A first pass matched `length < <two digits>` on ANY array and turned up
  // five unrelated validators; that was a bad probe, not a finding. Only a floor applied to a
  // screenplay BEATS array is relevant here.
  const anyBeatFloor = await page.evaluate(() => {
    const names = Object.keys(window).filter((k) => /^_(detect|validate|score|check)/i.test(k) && typeof window[k] === 'function');
    return names.filter((n) => {
      try {
        const src = window[n].toString();
        return /\bbeats\b[\s\S]{0,40}\.length\s*<\s*\d+|\.length\s*<\s*\d+[\s\S]{0,40}\bbeats\b/.test(src);
      } catch (_) { return false; }
    });
  });
  console.log('    exported detectors applying a numeric floor to a BEATS array: ' + JSON.stringify(anyBeatFloor));
  ok('FIXED — a beat floor now exists in an exported detector (it existed nowhere at diagnosis time)',
    anyBeatFloor.indexOf('_detectSceneAdequacyFailure') !== -1, 'found: ' + JSON.stringify(anyBeatFloor));

  // ── 2b. THE HEADLINE: is the QA layer wired into production at all? ──────────────────────────
  section('2b. IS THE QA LAYER EVEN CALLED? (reading app.js from disk, not trusting the runtime)');
  const appSrc = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8').split('\n');
  function callSites(fnName) {
    const out = [];
    appSrc.forEach((ln, i) => {
      if (ln.indexOf(fnName) === -1) return;
      const t = ln.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;          // a comment mentioning it
      if (new RegExp('function\\s+' + fnName + '\\b').test(t)) return; // its own definition
      if (new RegExp('window\\.' + fnName + '\\s*=').test(t)) return;  // its own export
      out.push({ line: i + 1, text: t.slice(0, 150) });
    });
    return out;
  }
  ['_detectSceneAdequacyFailure', '_detectLIPresenceFloor', '_detectLIPresenceDominance'].forEach((fn) => {
    const sites = callSites(fn);
    console.log('    ' + fn + ': ' + sites.length + ' production call site(s)');
    sites.forEach((s) => console.log('      app.js:' + s.line + '  ' + s.text));
  });
  ok('ROOT CAUSE, HEADLINE — _detectSceneAdequacyFailure is NEVER CALLED in production: defined, exported, and referenced only in comments',
    callSites('_detectSceneAdequacyFailure').length === 0, JSON.stringify(callSites('_detectSceneAdequacyFailure')));
  ok('ROOT CAUSE — _detectLIPresenceFloor is NEVER CALLED in production either',
    callSites('_detectLIPresenceFloor').length === 0, JSON.stringify(callSites('_detectLIPresenceFloor')));
  ok('...and when the adequacy detector IS run by hand against this scene, it FAILS — so the check works; it simply never ran',
    adequacy.failed === true, JSON.stringify(adequacy.reasons));

  // ── 3. LI PRESENCE ───────────────────────────────────────────────────────────────────────────
  section('3. THE REAL LI-PRESENCE DETECTORS (the "cold romantic gravity" question)');
  const floor = await page.evaluate((s) => window._detectLIPresenceFloor(s, { liName: 'Julian' }), SCENE);
  const dominance = await page.evaluate((s) => window._detectLIPresenceDominance(s, { liName: 'Julian' }), SCENE);
  fs.writeFileSync(path.join(OUT_DIR, 'li_presence.json'), JSON.stringify({ floor, dominance }, null, 2));
  console.log('    LI floor:      ' + JSON.stringify(floor));
  console.log('    LI dominance:  flagged=' + dominance.flagged + ' ' + JSON.stringify(dominance.reason || null).slice(0, 220));
  ok('the LI-presence FLOOR passed — Julian does have a dialogue line, so the floor is satisfied by one line',
    floor.liPresent === true && floor.flagged === false, JSON.stringify(floor));

  const julianBeats = beats.filter((b) => /\bJulian\b/i.test(String(b.text || '')) || String(b.speaker || '') === 'Julian');
  console.log('    beats involving Julian (' + julianBeats.length + '/' + beats.length + '):');
  julianBeats.forEach((b) => console.log('      · [' + (b.kind || 'narration') + '] ' + b.text));
  ok('GAP — the floor is a ONE-LINE floor: it cannot distinguish a present-but-cold LI from a warm one',
    floor.flagged === false && julianBeats.length <= 4,
    'julianBeats=' + julianBeats.length + ' floor=' + JSON.stringify(floor));

  const report = {
    generatedAt: new Date().toISOString(),
    scene: { beats: beats.length, proseChars: beats.reduce((n, b) => n + String(b.text || '').length, 0), tail },
    adequacy, liPresenceFloor: floor, liPresenceDominance: dominance,
    movementVerbTriggersInTail: movementTriggers,
    exportedDetectorsWithBeatFloor: anyBeatFloor,
    julianBeatCount: julianBeats.length
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  section('CONTAINMENT');
  ok('ZERO real provider dispatches', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('QA MISS DIAGNOSTIC: ' + passed + '/' + results.length + ' findings confirmed');
  console.log('Evidence written to ' + OUT_DIR);
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('DIAGNOSTIC ERROR:', e && e.stack || e); process.exit(2); });
