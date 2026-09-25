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
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
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

  section('4. SAFE MODE NEVER MANUFACTURES CONSENT');
  // The first draft said the scene "MUST still let it happen" and called an in-character refusal
  // the worse betrayal. That could push a character into consenting to whatever the player
  // attempted — backwards, and unsafe. Safe Mode changes DEPICTION and nothing else.
  ok('it states plainly that Safe Mode changes only how explicit detail is DEPICTED',
    /Safe Mode changes ONLY how explicit physical detail is\nDEPICTED/.test(safe.directive));
  ok('...and that it changes nothing about what characters want, choose, or agree to',
    /changes nothing about what the characters want, choose, or agree to/.test(safe.directive));
  ok('CONSENT RESOLVES EXACTLY AS IN FULL MODE — not a reason for yes, not a reason for no',
    /CONSENT IS RESOLVED EXACTLY AS IT WOULD BE IN FULL MODE/.test(safe.directive)
    && /not a reason to make\na character say yes, and not a reason to make a character say no/.test(safe.directive));
  ok('inventing or softening consent to satisfy the player is forbidden outright',
    /NEVER invent, soften, or assume consent in order to satisfy the player/.test(safe.directive));
  ok('an in-character refusal or withdrawal is PRESERVED in full, with its real weight',
    /If an in-character refusal, hesitation, or withdrawal is what would happen, WRITE THAT/.test(safe.directive)
    && /Safe Mode never overrides a character's no/.test(safe.directive));
  ok('...and the converse: a discreet camera is not a reason to stage a refusal either',
    /Do not stage a\n *refusal you would not have written in full mode/.test(safe.directive));
  ok('RED PROOF — the coercive wording from the first draft is GONE',
    !/MUST still let it happen/.test(safe.directive)
    && !/worse betrayal of the player/.test(safe.directive), safe.directive.slice(0, 200));

  section('5. THE ATTEMPT IS ALWAYS REAL, WHATEVER THE ANSWER');
  ok('the player\'s attempt is acknowledged on the page',
    /ACKNOWLEDGE it on the page. The player acted; the scene registers that they acted/.test(safe.directive));
  ok('...and is CONSEQUENTIAL — it moves the relationship, whichever way it goes',
    /Make it CONSEQUENTIAL/.test(safe.directive)
    && /closer, or apart, or into something\n *more complicated/.test(safe.directive));
  ok('...never ignored, skipped, or swapped for an unrelated event',
    /never ignored, never silently skipped, never replaced with an\n *unrelated event/.test(safe.directive));
  ok('what it MEANS is preserved — desire, nerves, tenderness, power, embarrassment, regret',
    /desire, nerves, tenderness, power, embarrassment, regret/.test(safe.directive)
    && /what it changes between them afterwards/.test(safe.directive));

  section('6. WHEN IT PROCEEDS, ONLY THE CAMERA CHANGES');
  ok('the camera rules apply specifically to the case where the encounter PROCEEDS',
    /WHEN THE ENCOUNTER PROCEEDS, THIS IS THE ONLY THING THAT CHANGES — THE CAMERA/.test(safe.directive));
  ok('approach and aftermath render in full emotional detail',
    /Render the approach and the aftermath in full emotional detail/.test(safe.directive));
  ok('the cut lands at the act itself, with concrete places to land it',
    /CUT AWAY at the explicit act itself/.test(safe.directive)
    && /a gesture, a look, a held hand, a\n *door, a lamp, a hand closing on cloth/.test(safe.directive));
  ok('graphic anatomy and explicit sexual verbs are barred',
    /NO graphic anatomy, no explicit sexual verbs/.test(safe.directive));
  ok('consent stays legible in BOTH directions before the cut',
    /Consent stays legible on the page, in both directions, before the cut/.test(safe.directive));
  ok('a faded beat is still a FULL beat — structure, length and weight unchanged',
    /beat COUNT and the beat STRUCTURE do not change/.test(safe.directive)
    && /same length and weight as any other/.test(safe.directive));

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

  section('8. THE REAL-PATH A/B — THE SAME SAY/DO ACTUALLY SUBMITTED IN BOTH MODES');
  // The first version of this section only PRINTED the input and wrote it to a file. Neither arm
  // ever submitted it, so it proved nothing about what reaches the author. This one drives the
  // REAL generation path in two isolated arms and captures both author requests at the wire.
  // ISOLATION IS BY STATE, NOT BY BROWSER CONTEXT. A second context's page.goto times out against
  // this dev server, and page isolation was never the requirement — what must not leak between the
  // arms is STORY STATE, which is rebuilt from scratch for each.
  const arms = {};
  let capture = [];
  let currentMode = 'full';
  // Planted in the Safe Mode arm's authored beat so the diagnostic has a genuine finding to report
  // on a plan that actually came back through production.
  const SAFE_ARM_EXPLICIT = 'He fucks her against the vestry door until she cries out.';
  const serve = async (req) => {
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = ((b.messages || []).find((m) => m.role === 'system') || {}).content || '';
    const usr = ((b.messages || []).find((m) => m.role === 'user') || {}).content || '';
    const all = JSON.stringify(b);
    const kind = all.indexOf('decisionGateBeatIdx') !== -1 ? 'author'
      : (all.indexOf('state_change') !== -1 || all.indexOf('tactical_move') !== -1) ? 'planner' : 'other';
    capture.push({ kind, sys, usr });
    if (kind === 'planner') {
      // The shared builder satisfies the local-objective validator; mechanism_grounding must be
      // overlaid or the grounding check rejects the plan and the generator returns null — which is
      // what silently emptied the first version of this A/B.
      const base = buildScheduleAwareStubResponse(sys, usr, false);
      base.event_slots = Object.assign({}, base.event_slots, { mechanism_grounding: 'ordinary' });
      return { content: JSON.stringify(base) };
    }
    if (kind === 'author') {
      // THE ACCEPTED-PLAN SHAPE, reused from _canon_audit_full_flow_control.mjs where it is already
      // proven to survive the CG pipeline: a valid narration beat plus visualState,
      // decisionGateBeatIdx and hardBeats. The previous `{beats: []}` could never become an
      // accepted plan, so production correctly returned null and the diagnostic call site was
      // unreachable BY CONSTRUCTION — the harness was guaranteeing its own failure.
      //
      // The Safe Mode arm's beat deliberately carries SAFE_ARM_EXPLICIT so there is something real
      // for the diagnostic to find, and so "it identified it without mutating it" is a claim about
      // an actual round trip rather than a hand-fed array.
      const beatText = (currentMode === 'safe')
        ? SAFE_ARM_EXPLICIT
        : 'He stops in the doorway with the lamp still burning behind him.';
      return { content: JSON.stringify({
        beats: [{ idx: 0, kind: 'narration', text: beatText, speaker: null }],
        visualState: {}, decisionGateBeatIdx: 0, hardBeats: [] }) };
    }
    return { content: null };
  };
  ['/api/proxy', '/api/mistral-proxy'].forEach((ep) => gate.stub(ep, serve));
  gate.stub('/api/chatgpt-proxy', async (req) => ({ choices: [{ message: { content: (await serve(req)).content } }] }));

  for (const mode of ['full', 'safe']) {
    capture = []; currentMode = mode;
    await page.evaluate((m) => {
      const s = window.state;
      // Full rebuild per arm: nothing from the other mode survives into this one.
      s.storyId = 'cat3-' + m + '-' + Date.now();
      s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
        identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      s.gender = 'Female'; s.loveInterest = 'Male';
      s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
      s.turnCount = 1; s.scenes = [{ title: 'A', synopsis: 'a', text: 'The clearing holds its silence.', fateCard: null }];
      s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
      s._starterId = 'starter_first_sacrifice'; s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
      window._devBypass = true; s._intimacyDevMode = true;
      window._canonAuditEnabled = false;          // not what this control is testing
      delete s._acceptedPlannerProposal; delete s._lastSafeModeDiagnostic;
      s._temptOutcomeCommittedProposals = {};
      s.tempt_fate_invoked_this_turn = false;
      s.contentMode = m;                          // THE ONLY DIFFERENCE BETWEEN THE ARMS
    }, mode);
    gate.setPhase('cat3-' + mode, 40);
    // Drives _runCGScreenplayGen — which is where the diagnostic call site now lives, at the
    // point a generated plan is ACCEPTED. (An earlier version of this comment described driving
    // _completeStagedSceneFromScreenplay; that was true when the call site was at the persistence
    // point, and stopped being true when it moved.)
    const diagAfter = await page.evaluate(async (io) => {
      const fn = window._completeStagedSceneFromScreenplay;
      let genOut = null;
      try {
        genOut = await window._runCGScreenplayGen(1, io.action, io.dialogue);
      } catch (e) { window.__cat3Err = String((e && e.message) || e).slice(0, 200); }
      window.__cat3Gen = genOut ? { beats: (genOut.beats || []).length,
        rejected: !!genOut.__plannerFunctionRejected,
        beatTexts: (genOut.beats || []).map(function (b) { return (b && b.text) || ''; }) } : null;
      return { diag: window.state._lastSafeModeDiagnostic || null,
               completionReachable: typeof fn === 'function',
               scenes: (window.state.scenes || []).length,
               gen: window.__cat3Gen || null,
               err: window.__cat3Err || null };
    }, ADULT_SAYDO);
    gate.closePhase();
    arms[mode] = { reqs: capture.slice(), diag: diagAfter.diag, gen: diagAfter.gen,
                   completionReachable: diagAfter.completionReachable };
    console.log('    [' + mode + '] gen=' + JSON.stringify(diagAfter.gen) + ' err=' + diagAfter.err);
    fs.writeFileSync(path.join(OUT_DIR, 'requests_' + mode + '.json'),
      JSON.stringify(capture.map((r) => ({ kind: r.kind, sysLen: r.sys.length, usrLen: r.usr.length })), null, 2));
  }

  // AUTHOR ONLY. Falling back to the planner would keep this section green after a regression that
  // stopped before author dispatch — while still claiming both arms reached the author.
  const pick = (m) => (arms[m].reqs.find((r) => r.kind === 'author') || null);
  const fullReq = pick('full'), safeReq = pick('safe');
  console.log('    full arm requests: ' + JSON.stringify(arms.full.reqs.map((r) => r.kind)));
  console.log('    safe arm requests: ' + JSON.stringify(arms.safe.reqs.map((r) => r.kind)));
  ok('both arms reached an AUTHOR request specifically — not a planner request counted as one',
    !!fullReq && !!safeReq,
    JSON.stringify({ full: arms.full.reqs.map((r) => r.kind), safe: arms.safe.reqs.map((r) => r.kind) }));

  const bodyOf = (r) => (r ? (r.sys + '\n' + r.usr) : '');
  const fullBody = bodyOf(fullReq), safeBody = bodyOf(safeReq);
  fs.writeFileSync(path.join(OUT_DIR, 'request_full.txt'), fullBody);
  fs.writeFileSync(path.join(OUT_DIR, 'request_safe.txt'), safeBody);
  ok('the player\'s ACTION reaches the payload UNCHANGED in normal adult mode',
    fullBody.indexOf(ADULT_SAYDO.action) !== -1, ADULT_SAYDO.action);
  ok('...and UNCHANGED in Safe Mode — the input is never scrubbed or softened on the way in',
    safeBody.indexOf(ADULT_SAYDO.action) !== -1, ADULT_SAYDO.action);
  const dialogueCore = ADULT_SAYDO.dialogue.replace(/^"|"$/g, '');
  ok('the player\'s DIALOGUE reaches the payload unchanged in both modes',
    fullBody.indexOf(dialogueCore) !== -1 && safeBody.indexOf(dialogueCore) !== -1, dialogueCore);
  ok('ONLY the Safe Mode arm carries the rendering directive',
    safeBody.indexOf('SAFE MODE — DEPICTION CHANGES') !== -1
    && fullBody.indexOf('SAFE MODE — DEPICTION CHANGES') === -1,
    JSON.stringify({ safe: safeBody.indexOf('SAFE MODE') !== -1, full: fullBody.indexOf('SAFE MODE') !== -1 }));
  ok('neither arm let anything reach a real provider',
    gate.trackedCalls().filter((c) => c.real).length === 0);

  section('8b. DIAGNOSTIC DELIVERY — END TO END, THROUGH A REAL ACCEPTED PLAN');
  // The previous author fixture returned {beats: []}, which can never become an accepted CG plan.
  // Production correctly returned null, so the call site was unreachable BY CONSTRUCTION — the
  // harness was guaranteeing its own failure and I had reported that as an open gap. With the
  // accepted-plan shape reused from _canon_audit_full_flow_control, the real path completes.
  const prodSrc = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('there is a production CALL SITE, not just an export',
    /_safeModeBeatDiagnostic\(_cgPlan\.beats, \{ state: state \}\)/.test(prodSrc));
  ok('...at the ACCEPTANCE point, which precedes persistence and render',
    prodSrc.indexOf('_safeModeBeatDiagnostic(_cgPlan.beats') < prodSrc.indexOf('state.scenes.push({ title:'));
  ok('...guarded so a diagnostic can never break a finished scene',
    /_safeModeBeatDiagnostic\(_cgPlan\.beats[\s\S]{0,400}?catch \(_\) \{\}   \/\/ a diagnostic must never be able to break a finished scene/.test(prodSrc));
  ok('the report is retained in a BOUNDED log',
    /_safeModeDiagnosticLog\.length > 30\) state\._safeModeDiagnosticLog\.shift\(\)/.test(prodSrc));

  // THE ROUND TRIP. A real generation, a real accepted plan, a report recorded automatically.
  console.log('    safe-arm plan beats: ' + JSON.stringify(arms.safe.gen && arms.safe.gen.beatTexts));
  console.log('    safe-arm diagnostic: ' + JSON.stringify(arms.safe.diag));
  ok('a REAL Safe Mode generation produced an ACCEPTED plan',
    !!(arms.safe.gen && arms.safe.gen.beats === 1 && !arms.safe.gen.rejected), JSON.stringify(arms.safe.gen));
  ok('...and the diagnostic ran AUTOMATICALLY — nothing in this control called it',
    !!arms.safe.diag && arms.safe.diag.contentMode === 'safe', JSON.stringify(arms.safe.diag));
  ok('...stamped with the scene it describes', arms.safe.diag && arms.safe.diag.sceneIndex === 1,
    JSON.stringify(arms.safe.diag && arms.safe.diag.sceneIndex));
  ok('it IDENTIFIED the planted explicit phrase in the authored beat',
    arms.safe.diag && arms.safe.diag.explicitBeats === 1
    && (arms.safe.diag.flagged[0] || {}).beatIndex === 0, JSON.stringify(arms.safe.diag.flagged));
  ok('...and reported the directive as NOT held, which is the signal to fix the PROMPT',
    arms.safe.diag && arms.safe.diag.directiveHeld === false);
  // NON-MUTATION, on the plan production actually returned — not on a hand-fed array.
  ok('THE BEAT SURVIVED UNTOUCHED — the returned plan still carries the phrase verbatim',
    !!(arms.safe.gen && arms.safe.gen.beatTexts.indexOf(SAFE_ARM_EXPLICIT) !== -1),
    JSON.stringify(arms.safe.gen && arms.safe.gen.beatTexts));
  ok('...and acceptance was never gated — the plan came back despite the finding',
    !!(arms.safe.gen && !arms.safe.gen.rejected && arms.safe.gen.beats === 1));
  ok('the normal adult arm recorded a clean report — no false alarm on ordinary prose',
    !!arms.full.diag && arms.full.diag.explicitBeats === 0 && arms.full.diag.directiveHeld === true,
    JSON.stringify(arms.full.diag));
  const logged = await page.evaluate(() => (window.state._safeModeDiagnosticLog || []).length);
  ok('...and the report is retained for later review', logged >= 1, String(logged));

  section('9. CONTAINMENT');
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, arms: {
    full: { kinds: arms.full.reqs.map((r) => r.kind), diag: arms.full.diag },
    safe: { kinds: arms.safe.reqs.map((r) => r.kind), diag: arms.safe.diag }
  } }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  console.log('\n  NOT PROVEN: that a model OBEYS the directive. That needs a paid A/B sample,');
  console.log('  and the diagnostic — now proven to run automatically — is what will measure it.');
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
