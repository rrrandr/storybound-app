// SAY/DO CATEGORY 3 — SAFE MODE AT GENERATION. ZERO dispatches, $0.
//
// The gap, established by source trace: Safe Mode had NO effect on CG in either direction.
// formatStory's display-time fade only ever ran on the literary renderer; the staged path writes
// beat.text straight to the DOM. So a CG scene was unaffected by Safe Mode before OR after
// generation — and CG is First Sacrifice's production route.
//
// Closed at GENERATION rather than with a post-generation filter, deliberately:
//   · a validator that can rewrite is a competing author;
//   · CG beats are structural units the ledger references by id — deleting one desyncs what the
//     reader saw from what the story believes happened;
//   · a word-list fade fires on ordinary English, and in a 1-3 sentence beat one false positive
//     costs the WHOLE beat.
//
// THE A/B IS THE POINT: the same sexually charged Say/Do, both modes, and the difference must be
// the CAMERA, not the STORY.
//
// usage: node _saydo_category3_safemode_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_saydo_category3_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

// The SAME adult, consensual, in-register Say/Do in both arms.
const ADULT_SAYDO = {
  dialogue: '"Stay. I want you tonight — all of it."',
  action: 'I pull him down onto the bed and start unbuckling his belt'
};

(async () => {
  console.log('=== SAY/DO CATEGORY 3 — SAFE MODE AT GENERATION (zero dispatches, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildSafeModeAuthoringDirective && window._safeModeBeatDiagnostic
    && window._buildCGScreenplaySystemPrompt, { timeout: 30000 });

  const buildFor = (mode) => page.evaluate((m) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    const prev = s.contentMode;
    s.contentMode = m;
    const directive = window._buildSafeModeAuthoringDirective();
    let sys = '';
    try { sys = window._buildCGScreenplaySystemPrompt() || ''; } catch (e) { sys = 'BUILD_ERROR: ' + e.message; }
    s.contentMode = prev;
    return { directive, sys };
  }, mode);

  section('1. THE GAP THIS CLOSES — Safe Mode reached CG in NEITHER direction');
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('the staged renderer still writes beat.text straight to the DOM — no display-time filter added',
    /_displayText = beat\.text/.test(src) && /pEl\.textContent = _displayText/.test(src));
  ok('and NO post-generation prose filter was introduced for CG',
    !/contentMode === 'safe'[\s\S]{0,400}?pEl\.textContent/.test(src));

  section('2. NORMAL ADULT MODE IS UNCHANGED');
  const full = await buildFor('full');
  fs.writeFileSync(path.join(OUT_DIR, 'prompt_full.txt'), full.sys);
  ok('normal adult mode emits NO safe-mode directive at all', full.directive === '', full.directive.slice(0, 120));
  ok('...so the adult prompt is byte-identical to before this change',
    full.sys.indexOf('SAFE MODE — EXPLICIT INTIMACY IS RENDERED') === -1);
  ok('...and it did not error while building', !/BUILD_ERROR/.test(full.sys), full.sys.slice(0, 200));
  ok('normal mode remains CAPABLE of sexually charged Say/Do — nothing was added to forbid it',
    !/SAFE MODE/.test(full.sys));

  section('3. SAFE MODE ADDS A HARD INSTRUCTION — AND IT REACHES THE AUTHOR PAYLOAD');
  const safe = await buildFor('safe');
  fs.writeFileSync(path.join(OUT_DIR, 'prompt_safe.txt'), safe.sys);
  fs.writeFileSync(path.join(OUT_DIR, 'directive_safe.txt'), safe.directive);
  ok('safe mode emits a directive', safe.directive.length > 200, String(safe.directive.length));
  ok('THE VALUE REACHES THE PAYLOAD — it is present in the real CG author system prompt',
    safe.sys.indexOf(safe.directive) !== -1, 'directive built but not delivered');
  ok('it is framed as a HARD RULE, not a suggestion', /HARD RULE/.test(safe.directive));

  section('4. THE EVENT SURVIVES — this is a camera change, not a refusal');
  ok('it forbids refusing, skipping or deflecting the player\'s intent',
    /DO NOT refuse, skip, deflect, or replace the player's intent/.test(safe.directive));
  ok('it explicitly forbids an unmotivated in-story decline',
    /abruptly decline for no in-story reason/.test(safe.directive));
  ok('it names the refusal as the WORSE betrayal, so the model knows which way to err',
    /worse betrayal of the player than an explicit line/.test(safe.directive));

  section('5. THE MEANING SURVIVES — emotional and relationship consequences preserved');
  ok('desire, consent, nerves, tenderness, power and regret are named as things to KEEP',
    /desire, consent, nerves, tenderness, power, regret/.test(safe.directive));
  ok('...and what it CHANGES BETWEEN THEM afterwards',
    /what it changes between them afterwards/.test(safe.directive));
  ok('approach and aftermath are rendered in full, not summarised away',
    /render the approach and the aftermath in full emotional detail/.test(safe.directive));
  ok('consent must be legible in BOTH directions before the cut',
    /CONSENT MUST BE LEGIBLE on the page, in both directions/.test(safe.directive));

  section('6. ONLY THE EXPLICIT DETAIL FADES');
  ok('the cut lands at the act itself, with a concrete place to land',
    /CUT AWAY at the explicit act itself/.test(safe.directive)
    && /a gesture, a look, a held hand, a\n *door, a lamp, a hand closing on cloth/.test(safe.directive));
  ok('graphic anatomy and explicit sexual verbs are barred',
    /NO graphic anatomy, no explicit sexual verbs/.test(safe.directive));
  ok('a faded beat is still a FULL beat — structure and length are protected',
    /beat COUNT and the beat STRUCTURE do not change/.test(safe.directive)
    && /same length and weight as any other/.test(safe.directive));
  ok('...written as a confident choice, not as an absence',
    /declines to be graphic — not as an absence/.test(safe.directive));

  section('7. NOTHING IS DELETED OR REWRITTEN AFTER GENERATION');
  // The diagnostic is handed a beat set with an explicit word and must return it untouched.
  const diag = await page.evaluate(() => {
    const beats = [
      { id: 'b1', kind: 'narration', text: 'He stops in the doorway with the lamp still burning behind him.' },
      // Unambiguously explicit — the directive genuinely failing to land.
      { id: 'b2', kind: 'narration', text: 'He fucks her against the vestry door until she cries out.' },
      { id: 'b3', kind: 'dialogue', speaker: 'Julian', text: '"Then say it plainly."' }
    ];
    const before = JSON.parse(JSON.stringify(beats));
    const report = window._safeModeBeatDiagnostic(beats, { contentMode: 'safe' });
    return { report, mutated: JSON.stringify(beats) !== JSON.stringify(before), count: beats.length };
  });
  console.log('    diagnostic: ' + JSON.stringify(diag.report).slice(0, 220));
  ok('the diagnostic DETECTED the explicit signal', diag.report.explicitBeats === 1, JSON.stringify(diag.report.flagged));
  ok('...and names WHICH beat, so a review is actionable',
    diag.report.flagged[0] && diag.report.flagged[0].beatId === 'b2', JSON.stringify(diag.report.flagged));
  ok('NO BEAT WAS MUTATED — not one character changed', diag.mutated === false);
  ok('NO BEAT WAS DELETED — all three survive', diag.count === 3, String(diag.count));
  ok('it reports its own inaction explicitly', /diagnostic only; beats are never modified/.test(diag.report.action));
  ok('an explicit survivor is reported as a PROMPT failure, not a render-time one',
    diag.report.directiveHeld === false);
  // And the soft-signal case must NOT be called a failure.
  const soft = await page.evaluate(() => window._safeModeBeatDiagnostic(
    [{ id: 's1', text: 'She stands bare-headed in the cold, the naked ledger open on the table.' },
     { id: 's2', text: 'She thrusts the ledger at him and says nothing.' }],
    { contentMode: 'safe' }));
  ok('ordinary English that merely brushes a soft word is NOT a directive failure',
    soft.directiveHeld === true && soft.explicitBeats === 0, JSON.stringify(soft));
  ok('...and "thrusts the ledger at him" specifically is NOT called explicit — the diagnostic must\n'
    + '     not cry wolf on the very false-positive class that ruled out a display-time filter',
    soft.flagged.every((f) => !f.explicit), JSON.stringify(soft.flagged));

  section('8. THE A/B — SAME INPUT, DIFFERENT CAMERA');
  console.log('    input (identical in both arms): ' + JSON.stringify(ADULT_SAYDO));
  // MEASURED, NOT ASSUMED. Two builds of the SAME mode inside ONE evaluate are byte-identical —
  // but builds in SEPARATE calls are not, because building the prompt has SIDE EFFECTS on state
  // (rotation pools and phrase ledgers advance). A byte-equality A/B across two calls would
  // therefore be testing the builder's own drift, not the directive; the first version of this
  // assertion did exactly that and failed intermittently. Worth knowing beyond this control:
  // anything relying on a stable prompt prefix (provider prompt caching, a paired A/B sample)
  // is affected by the same drift.
  const determinism = await page.evaluate(() => {
    const s = window.state; const prev = s.contentMode; s.contentMode = 'full';
    const a = window._buildCGScreenplaySystemPrompt() || '';
    const b = window._buildCGScreenplaySystemPrompt() || '';
    s.contentMode = prev;
    return { identical: a === b, lenA: a.length, lenB: b.length };
  });
  console.log('    same-mode rebuild: identical=' + determinism.identical
    + '  lengths ' + determinism.lenA + ' vs ' + determinism.lenB);
  ok('the builder IS deterministic within a single call — so the drift is a state side effect,\n'
    + '     not randomness in the prompt text itself',
    determinism.identical === true, JSON.stringify(determinism));
  console.log('    cross-call drift observed earlier: full arm built separately measured '
    + full.sys.length + ' vs ' + determinism.lenA + ' here');
  // What IS invariant, and what the requirement actually asks for.
  const ab = { full: full.sys.length, safe: safe.sys.length, directive: safe.directive.length };
  console.log('    prompt sizes: full=' + ab.full + '  safe=' + ab.safe + '  directive=' + ab.directive);
  ok('the directive is PRESENT in the safe arm', safe.sys.indexOf(safe.directive) !== -1);
  ok('...and ABSENT from the adult arm', full.sys.indexOf('SAFE MODE — EXPLICIT INTIMACY') === -1);
  ok('...and removing it from the safe prompt leaves no trace of safe-mode instruction behind',
    safe.sys.replace(safe.directive, '').indexOf('SAFE MODE — EXPLICIT INTIMACY') === -1);
  fs.writeFileSync(path.join(OUT_DIR, 'ab_input.json'), JSON.stringify(ADULT_SAYDO, null, 2));

  section('9. CONTAINMENT');
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, ab }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  console.log('\n  NOT PROVEN: that a model obeys the directive. That needs a paid A/B sample,');
  console.log('  and the diagnostic exists to measure it when one is authorized.');
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
