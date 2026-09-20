// CONTINUATION SCENE ADEQUACY — DETECTOR CONTROL (Roman, 2026-09-20, third pass)
//
// Roman's re-read of the accepted-but-unshipped Scene 2 repair candidate: "If that PDF is
// claiming to be full Scene 2, then no, it is not a success... The pipeline made it through the
// doorway, but it did not yet understand the room." Reframing: this is a FAILED CAPABILITY TEST
// for the generic continuation generator (Scenes 2-10), not a draft to hand-patch. First Sacrifice
// stays fully player-generated — no hand-authored Scene 2, here or ever.
//
// Proves public/app.js's new, telemetry-only _detectSceneAdequacyFailure (never rewrites prose)
// against:
//   RED   — the REAL, unmodified Scene 2 sample (scene2_raw_response.txt, real cost $0.0870534).
//           Must fail on all three sub-checks: no aftermath/procedure signal anywhere; the
//           Answer framed as Lirael's personal sacrifice (contradicting this same generation's
//           own accepted aftermath.the_answer_institutional==="kept"); ends on pure suspension
//           vocabulary with no completed forward movement.
//   GREEN — a synthetic, structurally adequate scene: real aftermath/procedure content, no relic
//           violation, ends on a completed action. Must NOT fail.
//   TARGETED — isolate each sub-check: a scene with everything else adequate but ONE specific
//           defect (relic violation only; suspension-only ending only) — must fail on exactly
//           that reason, not the others.
//   FLEXIBILITY — two DIFFERENT synthetic "adequate" scenes (different player branches, wholly
//           different content/wording) must BOTH pass — proving the checks key on structural
//           presence, never exact phrasing or a fixed scene shape.
//
// Fully dry: no provider calls, no image calls, no prose rewrite. Reads
// _scene2_repair_replay_sample_out/scene2_raw_response.txt UNCHANGED as the real-sample fixture.
//
// usage: node _scene2_continuation_adequacy_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const REAL_SAMPLE_PATH = path.join(__dirname, '_scene2_repair_replay_sample_out', 'scene2_raw_response.txt');
const REAL_SCENE2 = JSON.parse(fs.readFileSync(REAL_SAMPLE_PATH, 'utf8'));
console.log('✓ loaded the real, preserved Scene 2 sample verbatim (' + REAL_SAMPLE_PATH + ') — unmodified, ' + REAL_SCENE2.beats.length + ' beats');

// ── GREEN fixture: structurally adequate — real aftermath/procedure, no relic violation, ends on
// a completed action, not suspended mood. Deliberately DIFFERENT content/wording from the real
// sample (a different hypothetical player branch) — this is BRANCH A of the flexibility proof. ──
const ADEQUATE_SCENE_A = {
  beats: [
    { idx: 0, text: 'The presiding Dohkar raises a hand and the hall falls quiet.' },
    { idx: 1, text: 'Seren\'s mother pushes through the assembly, voice cracking with recrimination.' },
    { idx: 2, text: '"You will answer for what you did to my daughter," she says, and the crowd murmurs agreement.' },
    { idx: 3, text: 'The Dohkar names a formal inquiry — a Chayr and two Dohkars — and sets the date for three days hence.' },
    { idx: 4, text: 'Julian steps between Lirael and the assembly, his voice low but carrying.' },
    { idx: 5, text: '"The inquiry will hear her fairly," he says, "or it will hear from me."' },
    { idx: 6, text: 'The Dohkar\'s aide records the summons and the assembly begins to disperse, still murmuring.' },
    { idx: 7, text: 'Lirael turns to face Julian directly, and speaks first.' },
  ],
};

// ── GREEN fixture B: a wholly different adequate branch (different player choice: Lirael goes on
// the offensive instead of accepting judgment) — proves the checks don't force one scene shape. ──
const ADEQUATE_SCENE_B = {
  beats: [
    { idx: 0, text: 'Lirael laughs, sharp and short, and the sound stops the assembly cold.' },
    { idx: 1, text: '"Ask him," she says, turning to point at Julian, "what he confessed to, before you ask what I did."' },
    { idx: 2, text: 'The presiding Dohkar\'s expression hardens; this was not the shape the interrogation was supposed to take.' },
    { idx: 3, text: 'Seren\'s family exchanges glances — recrimination turning, for the first time, toward the Provast instead.' },
    { idx: 4, text: 'The Dohkar calls for order and declares the matter will go before a formal tribunal within the week.' },
    { idx: 5, text: 'Julian does not deny it. He meets her eyes and, for the first time, looks uncertain.' },
    { idx: 6, text: 'The assembly begins to separate into factions, already arguing procedure.' },
    { idx: 7, text: 'Lirael turns and walks toward the tribunal steps without waiting to be summoned.' },
  ],
};

// ── TARGETED fixture: adequate aftermath + ending, but the ONE specific relic violation ──
const RELIC_VIOLATION_ONLY_SCENE = {
  beats: [
    { idx: 0, text: 'The presiding Dohkar names a formal inquiry and sets a date for the tribunal.' },
    { idx: 1, text: 'Seren\'s family presses forward with recrimination in their voices.' },
    { idx: 2, text: 'Lirael turns to the Answer in Julian\'s hands. "I claim the Answer as my sacrifice," she says.' },
    { idx: 3, text: 'The Dohkar steps forward and the assembly begins to disperse.' },
  ],
};

// ── TARGETED fixture: adequate aftermath + no relic violation, but ends on pure suspension ──
const SUSPENSION_ENDING_ONLY_SCENE = {
  beats: [
    { idx: 0, text: 'The presiding Dohkar names a formal inquiry and Seren\'s family presses forward with recrimination.' },
    { idx: 1, text: 'A date is set for the tribunal, three days hence.' },
    { idx: 2, text: 'The assembly waits.' },
    { idx: 3, text: 'My hand remains half-raised between us.' },
    { idx: 4, text: 'The Answer waits for me to decide.' },
  ],
};

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectSceneAdequacyFailure === 'function' && typeof window.STARTER_PROTECTED_RELICS === 'object', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready, or _detectSceneAdequacyFailure/STARTER_PROTECTED_RELICS not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('RED — the real, unmodified Scene 2 sample must fail all three sub-checks');
  const redResult = await page.evaluate(({ screenplay }) => window._detectSceneAdequacyFailure(screenplay, { starterId: 'starter_first_sacrifice' }), { screenplay: REAL_SCENE2 });
  console.log('  · ' + JSON.stringify(redResult));
  ok('the real sample IS flagged failed (a control is worthless until proven red)', redResult.failed === true, JSON.stringify(redResult));
  ok('sub-check A (aftermath/procedure) correctly finds NOTHING — reads as an extended reaction beat', redResult.checks.aftermath.present === false, JSON.stringify(redResult.checks.aftermath));
  ok('sub-check B catches the real violation: "the Answer" framed as personal sacrifice (beat 19, "I can claim the Answer as my sacrifice")', redResult.checks.relicViolations.length === 1 && redResult.checks.relicViolations[0].id === 'the_answer' && /claim.*answer.*sacrifice/i.test(redResult.checks.relicViolations[0].matched), JSON.stringify(redResult.checks.relicViolations));
  ok('sub-check C catches the suspension-only ending (waits / holds its breath / half-raised, no completed movement)', redResult.checks.ending.suspensionVocabPresent === true && redResult.checks.ending.movementVerbPresent === false, JSON.stringify(redResult.checks.ending));

  section('GREEN — two DIFFERENT structurally adequate branches must BOTH pass (flexibility proof)');
  const greenA = await page.evaluate(({ screenplay }) => window._detectSceneAdequacyFailure(screenplay, { starterId: 'starter_first_sacrifice' }), { screenplay: ADEQUATE_SCENE_A });
  console.log('  · branch A: ' + JSON.stringify(greenA));
  ok('branch A (Lirael accepts judgment, tribunal named) is NOT flagged failed', greenA.failed === false, JSON.stringify(greenA));
  const greenB = await page.evaluate(({ screenplay }) => window._detectSceneAdequacyFailure(screenplay, { starterId: 'starter_first_sacrifice' }), { screenplay: ADEQUATE_SCENE_B });
  console.log('  · branch B: ' + JSON.stringify(greenB));
  ok('branch B (Lirael goes on the offensive, wholly different content) is ALSO NOT flagged failed', greenB.failed === false, JSON.stringify(greenB));
  ok('the two adequate branches have substantially different beat text — the checks did not force a common shape', ADEQUATE_SCENE_A.beats[1].text !== ADEQUATE_SCENE_B.beats[1].text, null);

  section('TARGETED — an otherwise-adequate scene with ONLY the relic-ownership violation fails on that reason alone');
  const relicOnly = await page.evaluate(({ screenplay }) => window._detectSceneAdequacyFailure(screenplay, { starterId: 'starter_first_sacrifice' }), { screenplay: RELIC_VIOLATION_ONLY_SCENE });
  console.log('  · ' + JSON.stringify(relicOnly));
  ok('fails, and specifically on the relic violation (aftermath present, ending has movement)', relicOnly.failed === true && relicOnly.checks.relicViolations.length === 1 && relicOnly.checks.aftermath.present === true, JSON.stringify(relicOnly));

  section('TARGETED — an otherwise-adequate scene ending on pure suspension fails on that reason alone');
  const suspensionOnly = await page.evaluate(({ screenplay }) => window._detectSceneAdequacyFailure(screenplay, { starterId: 'starter_first_sacrifice' }), { screenplay: SUSPENSION_ENDING_ONLY_SCENE });
  console.log('  · ' + JSON.stringify(suspensionOnly));
  ok('fails, and specifically on the suspension-only ending (aftermath present, no relic violation)', suspensionOnly.failed === true && suspensionOnly.checks.ending.suspensionVocabPresent === true && suspensionOnly.checks.relicViolations.length === 0 && suspensionOnly.checks.aftermath.present === true, JSON.stringify(suspensionOnly));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CONTINUATION SCENE ADEQUACY DETECTOR CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
