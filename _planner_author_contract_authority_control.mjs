// PLANNER → AUTHOR CONTRACT AUTHORITY — DRY CONTROL (Roman, 2026-09-20, fourth pass)
//
// Roman: "If the generator failed despite the planner contract already knowing The Answer was
// institutional, then a blind retry risks paying to sample the same failure mode. At minimum, the
// author step needs to be forced to treat the planner contract as binding, not inspirational."
//
// Root cause, traced (research fork, this session): the real Scene 2 planner objective was
// correctly validated and ACCEPTED with aftermath.the_answer_institutional === "kept" — then that
// fact was read ONCE, purely to validate, and discarded. state._scenePlotContract (the sole
// structured channel into the CG/literary author's prompt via _buildPlotContractDirective) never
// carried aftermathTruths or reserved-event text at all. The author didn't ignore a binding fact —
// it never received one. This control proves the fix, generically (not First-Sacrifice-only):
//
//   DELIVERY — a real aftermathTruth (First Sacrifice's, sourced from window.STARTER_PLANS, never
//     hand-typed) now reaches _buildPlotContractDirective's rendered output, under a "HARD —
//     BINDING" header, with the exact "may dramatize... may NOT invert/contradict" instruction.
//   GENERIC — a SYNTHETIC aftermathTruth (a different story's fact, invented for this test only)
//     renders the same way — proves the mechanism is not First-Sacrifice-specific plumbing.
//   RESERVED — a reserved-event constraint (not just aftermathTruths) also renders, labeled
//     distinctly ("do not deliver, name, or pre-empt").
//   ABSENCE — a plot contract with NO aftermathTruths/reserved (the normal case for most scenes)
//     renders NO binding-facts block at all — the addition is inert unless there's real data.
//   RED — reusing the already-proven _detectSceneAdequacyFailure: an author response that
//     contradicts a bound fact is still rejected before being treated as a valid full-scene
//     result — the safety net behind the prompt instruction, not a replacement for it.
//
// Fully dry: no provider calls, no image calls, no prose rewrite.
//
// usage: node _planner_author_contract_authority_control.mjs
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._buildPlotContractDirective === 'function' && typeof window._detectSceneAdequacyFailure === 'function' && window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('DELIVERY — the real First Sacrifice Scene 2 aftermathTruths (sourced from window.STARTER_PLANS) reach the rendered author prompt, HARD-labeled');
  const deliveryResult = await page.evaluate(() => {
    const scene2Row = window.STARTER_PLANS.starter_first_sacrifice.scenes.find((s) => s.n === 2);
    const realAftermathTruths = scene2Row.aftermathTruths; // read verbatim, never hand-typed here
    window.state = window.state || {};
    window.state._scenePlotContract = {
      sceneIndex: 2,
      stateChange: { precondition: 'the assembly has not yet judged her', event: 'the burn manifests, marking her as the Sacrificiant', forces_choice: 'claim it or let Julian take it as proof of guilt', tactical_move: '', branch_a: '', branch_b: '', sceneProposed: 2 },
      hardBeats: [],
      aftermathTruths: realAftermathTruths,
      reservedConstraints: [],
    };
    const rendered = window._buildPlotContractDirective();
    return { rendered, realAftermathTruths };
  });
  console.log('  · real aftermath truth ids used: ' + deliveryResult.realAftermathTruths.map((t) => t.id).join(', '));
  const answerTruth = deliveryResult.realAftermathTruths.find((t) => t.id === 'the_answer_institutional');
  ok('a "WORLD FACTS... HARD — BINDING" header is present in the rendered prompt', /WORLD FACTS[\s\S]{0,100}HARD — BINDING/.test(deliveryResult.rendered), deliveryResult.rendered);
  ok('the real aftermath truth text (the Answer\'s institutional ownership) is rendered VERBATIM', deliveryResult.rendered.includes(answerTruth.text), JSON.stringify({ expected: answerTruth.text, renderedSnippet: deliveryResult.rendered.slice(deliveryResult.rendered.indexOf('WORLD FACTS'), deliveryResult.rendered.indexOf('WORLD FACTS') + 800) }));
  ok('the instruction distinguishes dramatize/complicate (allowed) from invert/contradict (forbidden)', /dramatize.*complicate/i.test(deliveryResult.rendered) && /may NOT invert it, contradict it/i.test(deliveryResult.rendered), deliveryResult.rendered);
  ok('all 4 real aftermath truths for this scene are rendered, not just one', deliveryResult.realAftermathTruths.every((t) => deliveryResult.rendered.includes(t.text)), JSON.stringify(deliveryResult.realAftermathTruths.map((t) => t.id)));

  section('GENERIC — a SYNTHETIC aftermathTruth for a different hypothetical story renders identically — proves this is not First-Sacrifice-specific plumbing');
  const genericResult = await page.evaluate(() => {
    window.state._scenePlotContract = {
      sceneIndex: 5,
      stateChange: { precondition: 'the council has not yet ruled', event: 'the council rules against her petition', forces_choice: 'appeal publicly or accept the ruling', tactical_move: '', branch_a: '', branch_b: '', sceneProposed: 5 },
      hardBeats: [],
      aftermathTruths: [{ id: 'the_seal_is_borrowed', text: 'The Seal of Office was lent to Kaelen by the Archivist for this hearing only; it is not his to keep or pledge.' }],
      reservedConstraints: [],
    };
    return window._buildPlotContractDirective();
  });
  ok('a wholly synthetic, non-First-Sacrifice fact renders under the same binding header — the mechanism is generic', /WORLD FACTS[\s\S]{0,100}HARD — BINDING/.test(genericResult) && genericResult.includes('The Seal of Office was lent to Kaelen'), genericResult);

  section('RESERVED — a reserved-event constraint (distinct from aftermathTruths) also renders, labeled "do not pre-empt"');
  const reservedResult = await page.evaluate(() => {
    window.state._scenePlotContract = {
      sceneIndex: 2,
      stateChange: { precondition: 'x', event: 'y', forces_choice: '', tactical_move: '', branch_a: '', branch_b: '', sceneProposed: 2 },
      hardBeats: [],
      aftermathTruths: [],
      reservedConstraints: [{ id: 'price_identified', fromScene: 3, text: 'The sacrifice is taken or identified — the offered MEMORY lands', markers: [] }],
    };
    return window._buildPlotContractDirective();
  });
  ok('a reserved-event constraint renders labeled distinctly from aftermath facts ("do not deliver, name, or pre-empt")', /RESERVED for a LATER scene \(do not deliver, name, or pre-empt it here\)/.test(reservedResult) && reservedResult.includes('The sacrifice is taken or identified'), reservedResult);

  section('ABSENCE — a normal plot contract with NO aftermathTruths/reserved renders NO binding-facts block (inert unless there is real data)');
  const absenceResult = await page.evaluate(() => {
    window.state._scenePlotContract = {
      sceneIndex: 3,
      stateChange: { precondition: 'x', event: 'y', forces_choice: '', tactical_move: '', branch_a: '', branch_b: '', sceneProposed: 3 },
      hardBeats: [],
      aftermathTruths: [],
      reservedConstraints: [],
    };
    return window._buildPlotContractDirective();
  });
  ok('no "WORLD FACTS" block appears when there is nothing to bind — this is additive, not a forced block on every scene', !/WORLD FACTS/.test(absenceResult), absenceResult);

  section('RED — reusing _detectSceneAdequacyFailure: an author response that STILL contradicts a bound fact is rejected, not shipped');
  const contradictingAuthorOutput = {
    beats: [
      { idx: 0, text: 'The presiding Dohkar names a formal inquiry; Seren\'s family presses forward with recrimination.' },
      { idx: 1, text: 'Lirael turns to the Answer. "I claim the Answer as my sacrifice," she says.' },
      { idx: 2, text: 'The Dohkar steps forward and the assembly begins to disperse.' },
    ],
  };
  const redAuthorityResult = await page.evaluate(({ screenplay }) => window._detectSceneAdequacyFailure(screenplay, { starterId: 'starter_first_sacrifice' }), { screenplay: contradictingAuthorOutput });
  console.log('  · ' + JSON.stringify(redAuthorityResult));
  ok('a full-scene-structured author response that still contradicts the now-transmitted bound fact is rejected (failed:true, relic violation caught)', redAuthorityResult.failed === true && redAuthorityResult.checks.relicViolations.length === 1, JSON.stringify(redAuthorityResult));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('PLANNER → AUTHOR CONTRACT AUTHORITY CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
