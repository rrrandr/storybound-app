// SCENE 2 DENSITY BASELINE — the distribution the 18-beat rupture scene should be judged against.
//
// Roman, 2026-09-24: "There are already multiple retained real ordinary Scene 2 outputs from
// Boundary, Reversal, Temptation, Silence, and Confession. That is a better baseline than one more
// paid sample." Correct — and no paid call is needed, which is why this exists.
//
// STRATIFICATION. Every sample below is the SAME author model (grok-4-1-fast-reasoning) at the
// SAME ceiling (max_tokens 8000), generated 2026-09-20 → 2026-09-24. Ordinary continuations and
// Tempt ruptures are reported separately but are otherwise directly comparable: same model, same
// prompt era, same scene slot (First Sacrifice Scene 2).
//
// It also runs the REAL production QA detectors across every sample — the ones proven in
// _tempt_fate_qa_miss_diagnostic.mjs to have zero production call sites. That turns "would the QA
// layer have caught this?" into a measured rate over 16 real scenes instead of an opinion.
//
// Zero provider dispatches. Reads retained artifacts only.
//
// usage: node _scene2_density_baseline_distribution.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_scene2_density_baseline_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
const REPLAY = path.join(__dirname, '_scene2_repair_replay_sample_out');
const FIX = path.join(__dirname, '_tempt_fate_fixtures');

// Distinct generations only. Byte-identical duplicates from the census are excluded by name:
//   silence_attempt1 == silence, confession_attempt1 == confession,
//   _tempt_fate_memory_erasure_live_run_out == run_2026_09_23_scene_a_no_commit (same storyId/run)
const SAMPLES = [
  { id: 'boundary',             kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response.txt'),                     report: path.join(REPLAY, 'report.json') },
  { id: 'boundary_retry2',      kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_retry2.txt') },
  { id: 'boundary_retry3',      kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_retry3.txt') },
  { id: 'boundary_retry4',      kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_retry4.txt') },
  { id: 'boundary_retry13',     kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_retry13.txt'),             report: path.join(REPLAY, 'report_retry13.json') },
  // retry15's report claims the call "never settled"; the harness documents that as a gate
  // response-correlation incident. The raw output is real, so the scene counts; its report does not.
  { id: 'boundary_retry15',     kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_retry15.txt') },
  { id: 'reversal',             kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_reversal.txt'),            report: path.join(REPLAY, 'report_reversal.json') },
  { id: 'temptation',           kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_temptation.txt'),          report: path.join(REPLAY, 'report_temptation.json') },
  { id: 'temptation_a5',        kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_temptation_attempt5.txt'), report: path.join(REPLAY, 'report_temptation_attempt5.json') },
  { id: 'temptation_a11',       kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_temptation_attempt11.txt'),report: path.join(REPLAY, 'report_temptation_attempt11.json') },
  { id: 'silence',              kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_silence.txt'),             report: path.join(REPLAY, 'report_silence.json') },
  { id: 'silence_a2',           kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_silence_attempt2.txt'),    report: path.join(REPLAY, 'report_silence_attempt2.json') },
  { id: 'silence_a3',           kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_silence_attempt3.txt'),    report: path.join(REPLAY, 'report_silence_attempt3.json') },
  { id: 'confession',           kind: 'ordinary', file: path.join(REPLAY, 'scene2_raw_response_confession.txt'),          report: path.join(REPLAY, 'report_confession.json') },
  { id: 'RUPTURE 09-23 pre-fix',  kind: 'rupture', file: path.join(FIX, 'run_2026_09_23_scene_a_no_commit', 'scene_a_raw_output.txt'), report: path.join(FIX, 'run_2026_09_23_scene_a_no_commit', 'report.json') },
  { id: 'RUPTURE 09-24 post-fix', kind: 'rupture', file: path.join(FIX, 'run_2026-09-24_02-11-02_scene_a', 'scene_a_raw_output.txt'), report: path.join(FIX, 'run_2026-09-24_02-11-02_scene_a', 'report.json') }
];

// INTERIORITY — a declared heuristic, not a production definition. A narration beat (never a
// dialogue beat) carrying a first-person cognition/affect marker. Reported as such; it is used only
// to compare samples against EACH OTHER under one consistent rule, never as an absolute standard.
const INTERIORITY_RX = /\bI\s+(?:know|knew|think|thought|feel|felt|wonder|wondered|want|wanted|remember|remembered|understand|understood|realise|realised|realize|realized|expect|expected|fear|feared|hope|hoped|could|should|would|must|am|was)\b|\bmy\s+(?:chest|throat|stomach|pulse|breath|hands?|mind|thoughts?|heart)\b/;
// Completed forward movement, MODALITY-AWARE — the fix the production regex lacks.
const MOVEMENT_RX = /\b(?:speaks?|spoke|steps?\s+forward|stepped|moves?|moved|reaches?|reached|turns?|turned|leaves?|left|arrives?|arrived|announces?|announced|declares?|declared)\b/i;
const MODAL_RX = /\b(?:could|might|would|may|should|must|want\s+to|going\s+to|about\s+to)\b/i;

function authorUsage(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) return null;
  try {
    const r = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let found = null;
    (function walk(n) {
      if (!n || typeof n !== 'object' || found) return;
      if (n.maxTokens === 8000 || (n.requestBody && n.requestBody.max_tokens === 8000)) {
        const u = n.usage || (n.responseBody && n.responseBody.usage) || null;
        if (u) { found = u; return; }
      }
      Object.keys(n).forEach((k) => walk(n[k]));
    })(r);
    if (!found) {
      // Fall back to the largest completion_tokens in the report — the author call dwarfs the rest.
      let best = null;
      (function walk(n) {
        if (!n || typeof n !== 'object') return;
        if (typeof n.completion_tokens === 'number' && (!best || n.completion_tokens > best.completion_tokens)) best = n;
        Object.keys(n).forEach((k) => walk(n[k]));
      })(r);
      found = best;
    }
    return found;
  } catch (_) { return null; }
}

(async () => {
  console.log('=== SCENE 2 DENSITY BASELINE (dry; zero provider dispatches) ===');
  console.log('All samples: grok-4-1-fast-reasoning, max_tokens 8000, First Sacrifice Scene 2, 2026-09-20 → 09-24.\n');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._detectSceneAdequacyFailure && window._detectLIPresenceFloor, { timeout: 30000 });

  const rows = [];
  for (const s of SAMPLES) {
    if (!fs.existsSync(s.file)) { console.log('  !! missing: ' + s.file); continue; }
    let scene;
    try { scene = JSON.parse(fs.readFileSync(s.file, 'utf8')); }
    catch (e) { console.log('  !! unparseable: ' + s.id + ' — ' + e.message.slice(0, 80)); continue; }
    const beats = Array.isArray(scene.beats) ? scene.beats : [];
    const prose = beats.reduce((n, b) => n + String((b && b.text) || '').length, 0);
    const dialogue = beats.filter((b) => b && (b.kind === 'dialogue' || b.dialogue)).length;
    const interiority = beats.filter((b) => b && b.kind !== 'dialogue' && INTERIORITY_RX.test(String(b.text || ''))).length;
    const tail = beats.slice(-5).map((b) => String((b && b.text) || ''));
    // Ending: does ANY of the last five beats land a NON-modal completed action?
    const landsAction = tail.some((t) => MOVEMENT_RX.test(t) && !MODAL_RX.test(t));
    const qa = await page.evaluate((sc) => ({
      adequacy: window._detectSceneAdequacyFailure(sc, { starterId: 'starter_first_sacrifice' }),
      li: window._detectLIPresenceFloor(sc, { liName: 'Julian' })
    }), scene);
    const usage = authorUsage(s.report);
    rows.push({
      id: s.id, kind: s.kind, beats: beats.length, prose, perBeat: Math.round(prose / Math.max(beats.length, 1)),
      dialogue, interiority, landsAction,
      completionTokens: usage ? usage.completion_tokens : null,
      reasoningTokens: usage && usage.completion_tokens_details ? usage.completion_tokens_details.reasoning_tokens
        : (usage && usage.reasoning_tokens) || null,
      adequacyFailed: qa.adequacy.failed, adequacyReasons: qa.adequacy.reasons || [],
      liFlagged: qa.li.flagged, liDialogue: qa.li.hasDialogue, liAnchored: qa.li.hasAnchoredBeat
    });
  }

  const ord = rows.filter((r) => r.kind === 'ordinary');
  const rup = rows.filter((r) => r.kind === 'rupture');
  const stat = (arr, k) => {
    const v = arr.map((r) => r[k]).filter((n) => typeof n === 'number').sort((a, b) => a - b);
    if (!v.length) return null;
    return { min: v[0], max: v[v.length - 1], median: v[Math.floor(v.length / 2)], mean: Math.round(v.reduce((a, b) => a + b, 0) / v.length) };
  };

  console.log('sample                    kind      beats  prose  /beat  dlg  intr  lands?  cmplTok  rsnTok  ADEQ  LI');
  console.log('-'.repeat(112));
  rows.forEach((r) => console.log(
    r.id.padEnd(26) + r.kind.padEnd(10)
    + String(r.beats).padStart(5) + String(r.prose).padStart(7) + String(r.perBeat).padStart(7)
    + String(r.dialogue).padStart(5) + String(r.interiority).padStart(6)
    + (r.landsAction ? '  yes ' : '  NO  ').padStart(8)
    + String(r.completionTokens == null ? '—' : r.completionTokens).padStart(9)
    + String(r.reasoningTokens == null ? '—' : r.reasoningTokens).padStart(8)
    + (r.adequacyFailed ? '  FAIL' : '  pass') + (r.liFlagged ? '  FLAG' : '  ok')
  ));

  console.log('\n--- ORDINARY BASELINE (n=' + ord.length + ') ---');
  ['beats', 'prose', 'perBeat', 'dialogue', 'interiority'].forEach((k) => {
    const st = stat(ord, k);
    if (st) console.log('  ' + k.padEnd(12) + 'min ' + String(st.min).padStart(5) + '   median ' + String(st.median).padStart(5) + '   mean ' + String(st.mean).padStart(5) + '   max ' + String(st.max).padStart(5));
  });
  console.log('  endings that land a non-modal action: ' + ord.filter((r) => r.landsAction).length + '/' + ord.length);
  console.log('  adequacy FAILED:                      ' + ord.filter((r) => r.adequacyFailed).length + '/' + ord.length);
  console.log('  LI floor FLAGGED:                     ' + ord.filter((r) => r.liFlagged).length + '/' + ord.length);
  console.log('  LI present but NO anchored beat:      ' + ord.filter((r) => !r.liAnchored).length + '/' + ord.length);

  console.log('\n--- RUPTURE RUNS (n=' + rup.length + ') ---');
  rup.forEach((r) => {
    const b = stat(ord, 'beats'), p = stat(ord, 'perBeat');
    const below = r.beats < b.min, pBelow = r.perBeat < p.min;
    console.log('  ' + r.id + ': ' + r.beats + ' beats (ordinary range ' + b.min + '–' + b.max + ')' + (below ? '  ← BELOW the entire ordinary range' : '  — inside the ordinary range')
      + ', ' + r.perBeat + ' ch/beat (range ' + p.min + '–' + p.max + ')' + (pBelow ? '  ← BELOW' : ''));
  });

  fs.writeFileSync(path.join(OUT_DIR, 'distribution.json'), JSON.stringify({ rows, ordinaryStats: {
    beats: stat(ord, 'beats'), prose: stat(ord, 'prose'), perBeat: stat(ord, 'perBeat'),
    dialogue: stat(ord, 'dialogue'), interiority: stat(ord, 'interiority')
  } }, null, 2));

  console.log('\n=== CONTAINMENT ===');
  console.log('  real provider dispatches: ' + gate.realCalls().length);
  await browser.close();
  console.log('\nWritten to ' + OUT_DIR);
  process.exitCode = gate.realCalls().length === 0 ? 0 : 1;
})().catch((e) => { console.error('ERROR:', e && e.stack || e); process.exit(2); });
