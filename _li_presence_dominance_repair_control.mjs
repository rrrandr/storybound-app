// LI PRESENCE DOMINANCE — DETECTOR CONTROL (Roman, 2026-09-20)
//
// Roman: "Julian is present in Scene 2 but reads inert/blank because his beats rely on repeated
// negation/stillness forms... instead of readable emotional, strategic, or erotic pressure."
// "Flag repetitive inert-negation patterns when they become Julian's dominant mode... Controlled
// stillness is allowed, but it must read as pressure or feeling, not absence... distinguish the
// assembly from Julian."
//
// This is a DETECTOR control, not a rewrite: proves public/app.js's new, telemetry-only
// _detectLIPresenceDominance (never rewrites prose) against:
//   RED   — the REAL Scene 2 sample (run_1789884119160.jsonl / scene2_raw_response.txt, real cost
//           $0.0870534), used UNCHANGED as the red fixture. Must flag.
//   GREEN — a synthetic counter-example where Julian is still and near-silent but every beat
//           carries a felt anchor (jaw, restraint, a held gaze). Must NOT flag — controlled
//           stillness is not the violation.
//   GREEN — a synthetic counter-example where Julian is simply active/expressive (no negation
//           forms at all). Must NOT flag — the rule never requires chattiness, it also shouldn't
//           be confused for requiring it.
//   EXEMPT — the assembly's own beats in the REAL sample use near-identical stillness/negation-
//           adjacent forms ("goes still", "waits", "holds its breath") and must NEVER be counted
//           against Julian — collective presences are allowed to stay reactive/still.
//   GUARD — a sparse-presence case (one inert Julian beat only) must NOT flag — too few beats to
//           call it a "dominant mode"; that is a different problem from this rule's job.
//
// Fully dry: no provider calls, no image calls, no prose rewrite. Reads
// _scene2_repair_replay_sample_out/scene2_raw_response.txt UNCHANGED (never edited, never copied
// over) as the real-sample fixture source.
//
// usage: node _li_presence_dominance_repair_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 600) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── The real, preserved baseline sample — read verbatim, never modified ──
const REAL_SAMPLE_PATH = path.join(__dirname, '_scene2_repair_replay_sample_out', 'scene2_raw_response.txt');
const REAL_SCENE2 = JSON.parse(fs.readFileSync(REAL_SAMPLE_PATH, 'utf8'));
console.log('✓ loaded the real, preserved Scene 2 sample verbatim (' + REAL_SAMPLE_PATH + ') — unmodified, ' + REAL_SCENE2.beats.length + ' beats');

// ── REGRESSION FIXTURE (Roman 2026-09-20, second pass): the REAL, real-money repair candidate
// from the authorized $0.05 run — rejected by the FIRST version of this detector's anchor
// vocabulary. Extracted directly from the persisted request/response log, never hand-typed. This
// is the exact evidence the vocabulary widening above was built to address.
const REPAIR_RUN_LOG_PATH = path.join(__dirname, '_scene2_li_presence_repair_out', 'run_1789891242699.jsonl');
const repairRunEvents = fs.readFileSync(REPAIR_RUN_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const repairResponseEvent = repairRunEvents.find((e) => e.kind === 'response' && e.roleTag === 'li-presence-repair');
const REAL_REPAIR_COST_USD = repairResponseEvent.responseBody.usage.cost_in_usd_ticks * 1e-10;
const REAL_REPAIR_EDITS = JSON.parse(repairResponseEvent.responseBody.choices[0].message.content);
console.log('✓ loaded the real, rejected repair candidate verbatim (' + REPAIR_RUN_LOG_PATH + ') — real cost $' + REAL_REPAIR_COST_USD.toFixed(6) + ', ' + REAL_REPAIR_EDITS.length + ' edits');
// Reconstruct the repaired screenplay EXACTLY as _repairLIPresenceBeats itself would — apply
// ONLY to the named indices, copy everything else from the real baseline untouched.
const REPAIRED_CANDIDATE_SCENE2 = Object.assign({}, REAL_SCENE2, {
  beats: REAL_SCENE2.beats.map((b) => {
    const edit = REAL_REPAIR_EDITS.find((e) => e.idx === b.idx);
    return edit ? Object.assign({}, b, { text: edit.text }) : b;
  }),
});

// ── GREEN fixture 1: controlled, ANCHORED stillness — should NOT flag ──
const ANCHORED_STILLNESS_SCENE2 = {
  beats: [
    { idx: 0, text: 'Julian does not move, but the muscle in his jaw tightens, a leash he holds by will alone.' },
    { idx: 1, text: 'The assembly goes still.' },
    { idx: 2, text: "Julian's hands remain steady, though his knuckles whiten around the Answer." },
    { idx: 3, text: 'The assembly waits.' },
    { idx: 4, text: "Julian does not speak, but his gaze holds hers, and the restraint in it is its own kind of heat." },
    { idx: 5, text: 'The assembly holds its breath.' },
    { idx: 6, text: "Julian's gaze does not waver — fixed on her like he is counting the cost of looking away." },
  ],
};

// ── GREEN fixture 2: Julian simply active/expressive — no negation forms at all — should NOT flag ──
const ACTIVE_LI_SCENE2 = {
  beats: [
    { idx: 0, text: 'Julian steps forward, closing the distance between them.' },
    { idx: 1, text: 'The assembly goes still.' },
    { idx: 2, text: "Julian's voice drops, low enough that only she can hear it." },
    { idx: 3, text: 'The assembly waits.' },
    { idx: 4, text: 'Julian reaches for her hand and does not let go.' },
  ],
};

// ── GUARD fixture: sparse presence, one inert beat only — too few to call it "dominant" ──
const SPARSE_LI_SCENE2 = {
  beats: [
    { idx: 0, text: 'Julian does not move.' },
    { idx: 1, text: 'The assembly goes still.' },
    { idx: 2, text: 'Seren watches without flinching.' },
  ],
};

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectLIPresenceDominance === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or _detectLIPresenceDominance not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('RED — the real, unmodified Scene 2 sample must be flagged');
  const redResult = await page.evaluate(({ screenplay }) => window._detectLIPresenceDominance(screenplay, { liName: 'Julian' }), { screenplay: REAL_SCENE2 });
  console.log('  · ' + JSON.stringify(redResult));
  ok('the real sample IS flagged (a control is worthless until proven red)', redResult.flagged === true, JSON.stringify(redResult));
  ok('exactly 4 Julian-subject beats were found (matches the real, manually-verified count: idx 7, 11, 16, 22)', redResult.liBeatCount === 4, JSON.stringify(redResult));
  ok('all 4 are unanchored inert-negation forms (100% — "does not move/speak/waver", "remains steady")', redResult.flatCount === 4 && redResult.ratio === 1, JSON.stringify(redResult));
  ok('the flagged beats are exactly idx 7, 11, 16, 22 — not the object-glow beat (idx 0) or Lirael\'s own choice-weighing beat (idx 20)', JSON.stringify((redResult.flatBeats || []).map(b => b.idx).sort((a, b) => a - b)) === JSON.stringify([7, 11, 16, 22]), JSON.stringify(redResult.flatBeats));

  section('REGRESSION — the real, rejected repair candidate must now PASS under the widened anchor vocabulary');
  const regressionResult = await page.evaluate(({ screenplay }) => window._detectLIPresenceDominance(screenplay, { liName: 'Julian' }), { screenplay: REPAIRED_CANDIDATE_SCENE2 });
  console.log('  · ' + JSON.stringify(regressionResult));
  ok('the real repair candidate ("his focus locked" / "grip tight" / "his silence honed" / "eyes narrowed") is NOT flagged under the corrected vocabulary', regressionResult.flagged === false, JSON.stringify(regressionResult));
  ok('the real, unmodified baseline sample is STILL flagged (red fixture did not get accidentally weakened)', redResult.flagged === true, JSON.stringify(redResult));

  section('GREEN — controlled, ANCHORED stillness must NOT flag (stillness alone is not the violation)');
  const greenAnchoredResult = await page.evaluate(({ screenplay }) => window._detectLIPresenceDominance(screenplay, { liName: 'Julian' }), { screenplay: ANCHORED_STILLNESS_SCENE2 });
  console.log('  · ' + JSON.stringify(greenAnchoredResult));
  ok('anchored stillness (jaw / knuckles / held gaze / restraint alongside the negation forms) is NOT flagged', greenAnchoredResult.flagged === false, JSON.stringify(greenAnchoredResult));

  section('GREEN — an active, expressive LI (no negation forms) must NOT flag (chattiness is never required)');
  const greenActiveResult = await page.evaluate(({ screenplay }) => window._detectLIPresenceDominance(screenplay, { liName: 'Julian' }), { screenplay: ACTIVE_LI_SCENE2 });
  console.log('  · ' + JSON.stringify(greenActiveResult));
  ok('an actively-written LI is NOT flagged', greenActiveResult.flagged === false, JSON.stringify(greenActiveResult));

  section('EXEMPT — the real sample\'s own assembly beats never count against Julian');
  const assemblyLeak = (redResult.flatBeats || []).some((b) => /assembly/i.test(b.text));
  ok('none of the flagged beats mention "the assembly" — the collective is never counted against the LI', !assemblyLeak, JSON.stringify(redResult.flatBeats));
  const assemblyAsSubject = await page.evaluate(({ screenplay }) => window._detectLIPresenceDominance(screenplay, { liName: 'the assembly' }), { screenplay: REAL_SCENE2 });
  console.log('  · running the SAME detector with liName="the assembly" (to see what it WOULD find if aimed at the collective): ' + JSON.stringify(assemblyAsSubject));
  ok('the detector CAN see the assembly\'s 4 similarly-patterned stillness beats when explicitly aimed at it — proving the exemption is a deliberate subject-scoping choice for Julian\'s run, not blindness to the pattern itself', assemblyAsSubject.liBeatCount === 4, JSON.stringify(assemblyAsSubject));

  section('GUARD — sparse LI presence (one inert beat) must NOT flag (too few beats to call it "dominant")');
  const sparseResult = await page.evaluate(({ screenplay }) => window._detectLIPresenceDominance(screenplay, { liName: 'Julian' }), { screenplay: SPARSE_LI_SCENE2 });
  console.log('  · ' + JSON.stringify(sparseResult));
  ok('one inert beat alone (below minBeats) is NOT flagged', sparseResult.flagged === false, JSON.stringify(sparseResult));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('LI PRESENCE DOMINANCE DETECTOR CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');

  // ── FINALIZATION (Roman 2026-09-20): "if it passes, save it as the accepted repaired candidate
  // without another model call." Writes ONLY the already-paid, already-real content — no new
  // provider call, no hand-edited text. The candidate text is the same REAL_REPAIR_EDITS read
  // verbatim from the persisted log above; this just re-applies the SAME reconstruction
  // _repairLIPresenceBeats itself uses (replace named indices, copy everything else untouched)
  // and writes the result only because regressionResult.flagged === false.
  const REPAIR_OUT_DIR = path.join(__dirname, '_scene2_li_presence_repair_out');
  if (regressionResult.flagged === false) {
    const acceptedPath = path.join(REPAIR_OUT_DIR, 'scene2_repaired.json');
    fs.writeFileSync(acceptedPath, JSON.stringify(REPAIRED_CANDIDATE_SCENE2, null, 2));
    const finalReport = {
      at: new Date().toISOString(),
      source: 'revalidated dry under the widened LI-presence anchor vocabulary — NO new provider call',
      originalPaidRunLog: REPAIR_RUN_LOG_PATH,
      originalPaidCostUsd: REAL_REPAIR_COST_USD,
      originallyRejectedBy: 'v1 anchor vocabulary (too narrow — did not recognize "focus locked" / "silence honed" / "eyes narrowed")',
      acceptedUnder: 'v2 anchor vocabulary (this commit)',
      finalValidation: regressionResult,
      appliedEdits: REAL_REPAIR_EDITS,
      outputFile: acceptedPath,
    };
    fs.writeFileSync(path.join(REPAIR_OUT_DIR, 'report_final.json'), JSON.stringify(finalReport, null, 2));
    console.log('\n✓ ACCEPTED under the corrected detector — no new spend. Written to ' + acceptedPath);
  } else {
    console.log('\n✗ the real repair candidate STILL fails under the widened vocabulary — reason: ' + regressionResult.reason + '. Not saved. No new spend, no further action taken.');
  }

  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
