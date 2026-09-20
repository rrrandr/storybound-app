// CG/GN CONTINUATION PACING — ROOT CAUSE B — DRY CONTROL (Roman, 2026-09-20, fifth pass)
//
// Roman: "If Scene 2 is being prompted as ST1 with a hard 'under ~1000 words / short
// observational beats' ceiling, then Grok was basically being told to not write the kind of
// aftermath scene you wanted. That explains the thinness more cleanly than 'Grok can't do it.'"
//
// Confirmed via the real persisted request log (_scene2_repair_replay_sample_out/console_tail.txt):
// the real, failed Scene 2 generation carried "storyturn: ST1" — the SAME setup-pace, sub-1000-word
// register a genuine Scene 1 opener gets. Root cause: state.storyturn's real advancement is
// explicitly literary-only (advanceStoryturn()'s pacing-window clamp: "SCOPE: LITERARY path only...
// The CG/GN path tracks scene progression differently and is NOT verified here"), so a CG
// continuation can reach the author prompt with a stale/default ST1 that has nothing to do with
// what the scene actually needs.
//
// This is ROOT CAUSE B — separate from root cause A (the author contradicting binding planner/
// world facts, fixed and proven in _planner_author_contract_authority_control.mjs). Both are real,
// independent causes of the same failed Scene 2 capability test.
//
// Fix: _buildCGScreenplayUserPrompt (public/app.js) now overrides the density mode to a NEW,
// purpose-built 'CONT_AFTERMATH' register — LOCAL to this one prompt, never writing
// state.storyturn itself — whenever a continuation scene (sceneIndex > 0) has REAL committed
// aftermathTruths/reservedConstraints on its own accepted planner contract (the exact data root
// cause A's fix already forwards). A scene without that data (including every genuine Scene 1
// opener) is completely unaffected.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no new Scene 2 attempt):
//   FIXED    — the real failed Scene 2 fixture (storyturn ST1, sceneIndex 1, real aftermathTruths)
//              no longer gets SETUP PACE or the length ceiling; gets AFTERMATH/CONSEQUENCE PACE.
//   OPENING  — a genuine Scene 1 opener (sceneIndex 0, no plot contract) is completely unchanged —
//              still gets SETUP PACE and the length ceiling.
//   GENERIC  — a SYNTHETIC, non-First-Sacrifice continuation with its own aftermath data gets the
//              same override — proves this is not First-Sacrifice-specific plumbing.
//   UNCHANGED — a continuation scene with NO aftermath/reserved data (an ordinary scene without a
//              committed contract) behaves exactly as before — the fix is surgical, not a blanket
//              override for every continuation.
//   COEXIST  — root cause A's WORLD FACTS binding block (a separate function,
//              _buildPlotContractDirective) still renders correctly alongside this fix — the two
//              repairs don't interfere with each other.
//
// usage: node _cg_continuation_pacing_control.mjs
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
  await page.waitForFunction(() => typeof window._buildCGScreenplayUserPrompt === 'function' && typeof window._buildPlotContractDirective === 'function' && window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready, or _buildCGScreenplayUserPrompt not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('FIXED — the real failed Scene 2 fixture (storyturn ST1, real aftermathTruths) no longer gets SETUP PACE / the length ceiling');
  const fixedResult = await page.evaluate(() => {
    const scene2Row = window.STARTER_PLANS.starter_first_sacrifice.scenes.find((s) => s.n === 2);
    window.state = window.state || {};
    window.state.storyturn = 'ST1'; // the REAL observed value from the failed run
    window.state.storyLength = 'starter';
    window.state.picks = window.state.picks || {};
    window.state._scenePlotContract = { sceneIndex: 1, stateChange: {}, hardBeats: [], aftermathTruths: scene2Row.aftermathTruths, reservedConstraints: [] };
    const prompt = window._buildCGScreenplayUserPrompt(1, 'I keep my hands folded at my waist...', 'Then step forward, Julian.');
    return { prompt, storyturnAfter: window.state.storyturn };
  });
  ok('does NOT contain SETUP PACE', !/SETUP PACE/.test(fixedResult.prompt), fixedResult.prompt.slice(0, 400));
  ok('does NOT contain the HARD length ceiling', !/LENGTH CEILING \(HARD/.test(fixedResult.prompt), fixedResult.prompt.slice(0, 400));
  ok('DOES contain the new CONTINUATION — AFTERMATH/CONSEQUENCE PACE line', /CONTINUATION — AFTERMATH\/CONSEQUENCE PACE/.test(fixedResult.prompt), fixedResult.prompt.slice(0, 400));
  ok('the density line explicitly calls for dialogue, interiority, and a new choice (not suspended mood)', /DIALOGUE and INTERIORITY/.test(fixedResult.prompt) && /NEW pressure point or choice/.test(fixedResult.prompt), fixedResult.prompt.slice(0, 800));
  ok('state.storyturn itself is NEVER modified by this override — still ST1 after the call, unaffected for any other consumer', fixedResult.storyturnAfter === 'ST1', fixedResult.storyturnAfter);

  section('OPENING — a genuine Scene 1 opener (no plot contract) is completely unchanged — still SETUP PACE + length ceiling');
  const openingResult = await page.evaluate(() => {
    window.state._scenePlotContract = null;
    window.state.storyturn = 'ST1';
    window.state.storyLength = 'starter';
    return window._buildCGScreenplayUserPrompt(0, '', '');
  });
  ok('Scene 1 still gets SETUP PACE', /SETUP PACE/.test(openingResult), openingResult.slice(0, 400));
  ok('Scene 1 still gets the HARD length ceiling', /LENGTH CEILING \(HARD/.test(openingResult), openingResult.slice(0, 400));
  ok('Scene 1 does NOT get the new continuation-aftermath line', !/CONTINUATION — AFTERMATH\/CONSEQUENCE PACE/.test(openingResult), openingResult.slice(0, 400));

  section('GENERIC — a wholly synthetic, non-First-Sacrifice continuation with its own aftermath data gets the same override');
  const genericResult = await page.evaluate(() => {
    window.state._scenePlotContract = { sceneIndex: 4, stateChange: {}, hardBeats: [], aftermathTruths: [{ id: 'the_seal_is_borrowed', text: 'The Seal of Office was lent to Kaelen for this hearing only.' }], reservedConstraints: [] };
    window.state.storyturn = 'ST2';
    window.state.storyLength = 'taste';
    return window._buildCGScreenplayUserPrompt(4, 'x', 'y');
  });
  ok('a synthetic continuation for a different hypothetical story ALSO gets AFTERMATH/CONSEQUENCE PACE, not SETUP PACE — the mechanism is generic', /CONTINUATION — AFTERMATH\/CONSEQUENCE PACE/.test(genericResult) && !/SETUP PACE/.test(genericResult), genericResult.slice(0, 400));

  section('UNCHANGED — a continuation scene with NO aftermath/reserved data behaves exactly as before (surgical, not a blanket override)');
  const unchangedResult = await page.evaluate(() => {
    window.state._scenePlotContract = { sceneIndex: 3, stateChange: {}, hardBeats: [], aftermathTruths: [], reservedConstraints: [] };
    window.state.storyturn = 'ST2';
    window.state.storyLength = 'starter';
    return window._buildCGScreenplayUserPrompt(3, 'x', 'y');
  });
  ok('an ordinary continuation with no committed aftermath data still gets the OLD storyturn-driven SETUP PACE (ST2) behavior, unaffected by this fix', /SETUP PACE/.test(unchangedResult) && /LENGTH CEILING \(HARD/.test(unchangedResult), unchangedResult.slice(0, 400));

  section('COEXIST — root cause A\'s WORLD FACTS binding block (a separate function) still renders correctly alongside this fix');
  const coexistResult = await page.evaluate(() => {
    const scene2Row = window.STARTER_PLANS.starter_first_sacrifice.scenes.find((s) => s.n === 2);
    window.state._scenePlotContract = {
      sceneIndex: 1,
      stateChange: { precondition: 'x', event: 'the burn manifests', forces_choice: 'claim it or let Julian take it', tactical_move: '', branch_a: '', branch_b: '', sceneProposed: 1 },
      hardBeats: [], aftermathTruths: scene2Row.aftermathTruths, reservedConstraints: [],
    };
    return { systemBlock: window._buildPlotContractDirective(), userBlock: window._buildCGScreenplayUserPrompt(1, 'a', 'b') };
  });
  ok('the system-prompt WORLD FACTS binding block still renders (root cause A fix intact)', /WORLD FACTS[\s\S]{0,100}HARD — BINDING/.test(coexistResult.systemBlock) && /The Answer belongs to the Institution/.test(coexistResult.systemBlock), coexistResult.systemBlock.slice(0, 600));
  ok('the user-prompt AFTERMATH/CONSEQUENCE density override also fires for the same scene (root cause B fix intact)', /CONTINUATION — AFTERMATH\/CONSEQUENCE PACE/.test(coexistResult.userBlock), coexistResult.userBlock.slice(0, 400));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CG/GN CONTINUATION PACING CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
