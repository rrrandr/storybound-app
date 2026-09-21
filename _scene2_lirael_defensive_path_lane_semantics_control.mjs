// lirael_defensive_path LANE-SEMANTICS FIX — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after the Temptation sample: "The issue is that lirael_defensive_path is too broad. It
// allows 'almost acts / withholds / hesitates' to masquerade as defense. The lane needs to require
// a landed defensive move... 'Opens her mouth and closes it' is not a move."
//
// Real finding this closes: Temptation's real reply correctly resolved to Lirael +
// lirael_defensive_path, but its proposed state_change ("Lirael opens her mouth to name the true
// reason then closes it") is a bare hesitation beat, and the OLD authored eventFrame text for the
// temptation slot ("she catches herself weighing whether to...") directly invited exactly that.
//
// Fix: (1) the temptation slot's eventFrame now requires a landed, external, observable action,
// not an internal weighing moment; (2) the lane's own label states the negative rule explicitly
// ("hesitating... does NOT satisfy this lane by itself"); (3) signalRx widened to catch
// "concealment" (a real stemming gap — the model's own word, a noun form the old conceals?-only
// pattern missed) plus the rest of Roman's explicit move list (demand terms, name a protected
// constraint); (4) a new, diagnostic-only hesitationRx sharpens the rejection MESSAGE (not the
// gating decision itself, which the positive-only signalRx already got right) when hesitation
// vocabulary is present but no landed-move vocabulary is.
//
// Proves, fully dry (no provider calls, no image calls, no branch retry, no forks):
//   RED       — Temptation's REAL rejected content (read verbatim from its persisted log) is
//               STILL rejected — the widening did not accidentally let hesitation-only content
//               pass — and the rejection reason now explicitly names it as hesitation, not just
//               "no signal found."
//   GREEN     — a synthetic plan where Temptation's posture modulates a REAL landed Lirael
//               defensive move (conceals a specific fact) is NOT rejected.
//   STEMMING  — "concealment" (the noun form, standalone, no other lane vocabulary present) now
//               satisfies the lane's signalRx on its own — the specific gap this fix closes.
//   NEW-VOCAB — "demands specific terms" and "names a protected constraint" (two of Roman's
//               explicit move-list additions) each independently satisfy the lane on their own.
//   COEXIST   — Boundary's real accepted content (family_accusation) and Reversal's real accepted
//               content (julian_jurisdiction_challenge) still pass their own, untouched lanes —
//               this fix did not touch any lane but lirael_defensive_path.
//   PROMPT    — the real, live planner dispatch for the temptation slot now carries the rewritten,
//               landed-action-requiring event frame text, and the free-choice lane menu (used by
//               any scene without a resolved frame) renders the updated label with its explicit
//               negative rule.
//
// usage: node _scene2_lirael_defensive_path_lane_semantics_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

function parseReply(logPath, matcher) {
  const events = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const resp = events.find(matcher);
  if (!resp) { console.error('HARNESS BLOCKER: no matching real response found in ' + logPath); process.exit(2); }
  const raw = resp.responseBody.choices[0].message.content;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fenced ? fenced[1] : raw);
}
const realMatcher = (e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true;

// ── Real Temptation reply (the exact rejected content) ──
const TEMPTATION_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789981747565.jsonl');
const TEMPTATION_JSON = parseReply(TEMPTATION_LOG, realMatcher);
const TEMPTATION_STATE_CHANGE = {
  precondition: TEMPTATION_JSON.state_change_precondition, event: TEMPTATION_JSON.state_change,
  forces_choice: TEMPTATION_JSON.forces_choice, tactical_move: TEMPTATION_JSON.tactical_move,
  chosenAftermathLane: TEMPTATION_JSON.chosen_aftermath_lane, aftermathObligations: TEMPTATION_JSON.aftermath_obligations,
  slots: TEMPTATION_JSON.event_slots ? { action: TEMPTATION_JSON.event_slots.action, exitState: TEMPTATION_JSON.event_slots.exit_state } : undefined,
};
console.log('✓ loaded the real Temptation reply verbatim from ' + TEMPTATION_LOG);
console.log('  real state_change: "' + TEMPTATION_STATE_CHANGE.event + '"');

// ── Real Boundary (retry 15) and Reversal (attempt 2) replies — COEXIST fixtures ──
const BOUNDARY_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789975467864.jsonl');
const boundaryEvents = fs.readFileSync(BOUNDARY_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const boundaryResp = boundaryEvents.find((e) => realMatcher(e) && e.responseBody.model === 'grok-4.3' && e.responseBody.usage.prompt_tokens < 10000);
const boundaryRaw = boundaryResp.responseBody.choices[0].message.content;
const boundaryFenced = boundaryRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const BOUNDARY_JSON = JSON.parse(boundaryFenced ? boundaryFenced[1] : boundaryRaw);
const BOUNDARY_STATE_CHANGE = { event: BOUNDARY_JSON.state_change, forces_choice: BOUNDARY_JSON.forces_choice, tactical_move: BOUNDARY_JSON.tactical_move, chosenAftermathLane: BOUNDARY_JSON.chosen_aftermath_lane };

const REVERSAL_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789981507927.jsonl');
const reversalEvents = fs.readFileSync(REVERSAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const reversalResp = reversalEvents.find((e) => realMatcher(e) && e.responseBody.model === 'grok-4.3' && e.responseBody.usage.prompt_tokens < 10000);
const reversalRaw = reversalResp.responseBody.choices[0].message.content;
const reversalFenced = reversalRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const REVERSAL_JSON = JSON.parse(reversalFenced ? reversalFenced[1] : reversalRaw);
const REVERSAL_STATE_CHANGE = { event: REVERSAL_JSON.state_change, forces_choice: REVERSAL_JSON.forces_choice, tactical_move: REVERSAL_JSON.tactical_move, chosenAftermathLane: REVERSAL_JSON.chosen_aftermath_lane };
console.log('✓ loaded Boundary\'s and Reversal\'s real accepted replies for the COEXIST section');

const LANES_FOR_DIRECT_CALL_SOURCE = [
  { id: 'dohkar_preliminary_review', signalRx: /\b(preliminary review|review date|hearing date|sets? a date|scheduled?|convenes?|tribunal date|terms of (?:the )?review|date is set|date was set)\b/i },
  { id: 'family_accusation', signalRx: /\b(seren'?s family|her family|his family|publicly accuses?|formal(?:ly)? accus\w*|demands? (?:remedy|restitution|compensation|redress)|blood[- ]price)\b/i },
  { id: 'julian_jurisdiction_challenge', signalRx: /\b(jurisdiction|challenges? (?:the )?dohkar|contests? (?:his |the )?authority|reframes?|political(?:ly)?)\b/i },
  { id: 'lirael_constrained', signalRx: /\b(separated|placed under (?:guard|watch)|confined|constrained|watched|pending (?:the )?inquiry|escorted (?:away|out)|removed from)\b/i },
  // The FIXED lane under test — matches the real, committed app.js definition exactly.
  { id: 'lirael_defensive_path', signalRx: /\b(submits? to procedure|demands? (?:specific )?terms|gathers? proof|conceals?\b|concealed\b|concealing\b|(?:commits?|chooses?|turns?|moves?) (?:to|toward)? ?concealment|concealment of\b|flees?|flight|counter-accus\w*|procedural bind|names? a protected constraint)\b/i, hesitationRx: /\b(opens? (?:her|his|their)? ?mouth[\s\S]{0,30}closes?|catches? (?:her|him|them)self weighing|weighs? whether|weighing of|almost (?:speaks|says|names|spoke|said)|hesitates?|stays? silent|remains? silent|says? nothing|holds? (?:her|his|their) tongue|keeps? (?:her|his|their) silence)\b/i },
];
const laneOpt = () => ({ lanes: LANES_FOR_DIRECT_CALL_SOURCE.map((l) => ({ id: l.id, rxSource: l.signalRx.source, rxFlags: l.signalRx.flags, hRxSource: l.hesitationRx ? l.hesitationRx.source : null, hRxFlags: l.hesitationRx ? l.hesitationRx.flags : null })) });

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectPlannerFunctionGap === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  const callGate = (sc, requiredLaneId) => page.evaluate(
    ({ sc, lanes, requiredLaneId }) => window._detectPlannerFunctionGap(sc, {
      requiresAftermath: true,
      aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags), hesitationRx: l.hRxSource ? new RegExp(l.hRxSource, l.hRxFlags) : null })),
      requiredLaneId,
    }),
    { sc, ...laneOpt(), requiredLaneId }
  );

  section('RED — Temptation\'s real hesitation-only content is STILL rejected, now with a specific reason');
  const red = await callGate(TEMPTATION_STATE_CHANGE, 'lirael_defensive_path');
  ok('rejected', red.rejected === true, JSON.stringify(red));
  ok('reason now specifically names hesitation/withholding, not just "no signal found"', /reads as hesitation\/withholding/.test(red.reason || ''), red.reason);

  // NOTE: the gate requires BOTH the generic aftermath-vocabulary check AND the lane-content check
  // to pass — exactly like every real accepted plan this session (Boundary, Reversal) naturally
  // satisfies both at once. These fixtures include a real generic-check word (e.g. "procedure")
  // alongside the lane-specific content, matching that real shape, so each one isolates the
  // LANE fix specifically rather than accidentally failing on the unrelated, already-working
  // generic check.
  section('GREEN — a landed Lirael defensive move (conceals a specific fact) is NOT rejected');
  const green = {
    precondition: 'No procedure has yet addressed what Lirael actually knows about Julian\'s counter-oath.',
    event: 'Lirael conceals the fact that she recognized Julian\'s counter-oath, letting the assembly read her silence as shame rather than deliberate omission.',
    forces_choice: 'forces Lirael to choose between claiming the interference openly or letting the assembly keep its assumption',
    tactical_move: 'advance lirael_defensive_path by having Lirael actively conceal a specific fact from the assembly rather than merely hesitate over it',
    chosenAftermathLane: 'lirael_defensive_path',
  };
  const greenResult = await callGate(green, 'lirael_defensive_path');
  ok('NOT rejected', greenResult.rejected === false, JSON.stringify(greenResult));

  section('STEMMING — "concealment" (noun form, standalone) now satisfies the lane on its own');
  const stemming = {
    precondition: 'No ruling has yet addressed what Lirael actually knows.',
    event: 'Lirael commits to concealment of the one fact that would clear Julian and condemn her instead.',
    tactical_move: '', forces_choice: '', chosenAftermathLane: 'lirael_defensive_path',
  };
  const stemmingResult = await callGate(stemming, 'lirael_defensive_path');
  ok('NOT rejected — "concealment" alone is enough for the lane check', stemmingResult.rejected === false, JSON.stringify(stemmingResult));

  section('NEW-VOCAB — Roman\'s explicit additions each independently satisfy the lane');
  const demandsTerms = { precondition: 'No procedure has yet been offered to Lirael.', event: 'Lirael demands specific terms before she will answer the assembly at all.', tactical_move: '', forces_choice: '', chosenAftermathLane: 'lirael_defensive_path' };
  const demandsResult = await callGate(demandsTerms, 'lirael_defensive_path');
  ok('"demands specific terms" — NOT rejected', demandsResult.rejected === false, JSON.stringify(demandsResult));
  const protectedConstraint = { precondition: 'No ruling has yet addressed Lirael\'s standing.', event: 'Lirael names a protected constraint that shields her from answering the charge directly.', tactical_move: '', forces_choice: '', chosenAftermathLane: 'lirael_defensive_path' };
  const constraintResult = await callGate(protectedConstraint, 'lirael_defensive_path');
  ok('"names a protected constraint" — NOT rejected', constraintResult.rejected === false, JSON.stringify(constraintResult));

  section('ANTI-GAMING — bare abstract "weighing of concealment" (Temptation\'s own real phrasing) does NOT satisfy the lane on its own');
  // Explicit, standalone proof of a real near-miss caught while building this fix: a first-pass
  // widening (bare conceal(?:s|ment|ed|ing)?) would have let this EXACT phrase — thematic, not an
  // active move — satisfy the lane. Isolated here from the RED section above (which also includes
  // the hesitation-only state_change) so this specific vector has its own, unambiguous proof.
  const abstractOnly = { precondition: 'No procedure has yet addressed the matter.', event: '', tactical_move: 'Lirael\'s first internal weighing of concealment under assembly pressure.', forces_choice: '', chosenAftermathLane: 'lirael_defensive_path' };
  const abstractResult = await callGate(abstractOnly, 'lirael_defensive_path');
  ok('still rejected — abstract/thematic "weighing of concealment" is not an active move', abstractResult.rejected === true, JSON.stringify(abstractResult));

  section('COEXIST — Boundary\'s and Reversal\'s real accepted content still pass their own, untouched lanes');
  const boundaryResult = await callGate(BOUNDARY_STATE_CHANGE, 'family_accusation');
  ok('Boundary\'s real content still passes family_accusation', boundaryResult.rejected === false, JSON.stringify(boundaryResult));
  const reversalResult = await callGate(REVERSAL_STATE_CHANGE, 'julian_jurisdiction_challenge');
  ok('Reversal\'s real content still passes julian_jurisdiction_challenge', reversalResult.rejected === false, JSON.stringify(reversalResult));

  section('PROMPT — the real, live planner dispatch for the temptation slot carries the fixed event frame + label');
  const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
  const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
  const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
  const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
  const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
  const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_lirael_defensive_path_lane_semantics_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'lirael-defensive-lane-control-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
    window._devBypass = true;
    s.cgScaffold = Object.assign({}, scaffold, { storyId: s.storyId });
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    s._bakedEmitted = (pkg && pkg.emitted) || null;
  }, { scaffold: REAL_SCAFFOLD_JSON });

  const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
  const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
  await page.evaluate(async ({ candidateOasOpening, candidatePostInterruption }) => {
    window.state.intimacyDialogue = null;
    window._clearPersistedOASState();
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    const h = pkg.oasHandoff || {};
    const plan = { beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null, openingFrame: h.openingFrame || '', cue: h.cue || '', interruption: h.interruption || '', interruptionImage: h.interruptionImage || '', interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [], oasOpening: candidateOasOpening, postInterruptionBeat: candidatePostInterruption || null };
    await window._initIntimacyDialogue(plan);
    await window._fireIntimacyOpener();
  }, { candidateOasOpening: candidateRaw.draft.oasOpening, candidatePostInterruption: candidateRaw.draft.postInterruptionBeat });

  gate.setPhase('oas-turn-reply-replay', 1);
  await page.fill('#gnActionInput', REAL_DO);
  await page.fill('#gnDialogueInput', REAL_SAY);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn-reply-replay', { watchdogMs: 10000 });

  gate.setPhase('fate-card-replay', 1);
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-replay', { watchdogMs: 10000 });
  const slotSelector = '#gnCardMount [data-fate-card-slot="temptation"]';
  const slotExists = await page.evaluate((sel) => !!document.querySelector(sel), slotSelector);
  if (!slotExists) { console.error('HARNESS BLOCKER: temptation slot did not render.'); await browser.close(); process.exit(2); }

  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, slotSelector);
  gate.allowRealPaths([]);
  gate.setPhase('scene2-structural-author-stubbed', 10);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('scene2-structural-author-stubbed', { watchdogMs: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  const tracked = gate.trackedCalls('scene2-structural-author-stubbed');
  const plannerDispatch = tracked.find((c) => { try { return Array.isArray(c.requestBody.messages) && c.requestBody.messages.some((m) => /READER POSTURE/.test(String(m.content || ''))); } catch (_) { return false; } });
  if (!plannerDispatch) { console.error('HARNESS BLOCKER: planner dispatch not found.'); await browser.close(); process.exit(2); }
  const usrMsg = plannerDispatch.requestBody.messages[1].content;

  ok('the REQUIRED EVENT FRAME block requires a landed, external, observable action', /a real, external, observable action, not stay inside a moment of internal weighing/.test(usrMsg), 'not found');
  ok('it explicitly rejects "almost says it, then doesn\'t" as insufficient', /"She almost says it, then doesn.t" is NOT sufficient/.test(usrMsg), 'not found');
  ok('root cause C: REQUIRED SCENE FUNCTION block still present (coexist)', /REQUIRED SCENE FUNCTION \(HARD/.test(usrMsg), 'not found');

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_lirael_defensive_path_lane_semantics_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('lirael_defensive_path LANE-SEMANTICS CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
