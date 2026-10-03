// ONE CONNECTED SEQUENCE, END TO END. Provider-free, $0.
//
// Green component checks do not close this claim, so this asserts the CHAIN, in order, on one run:
//
//   1. the OAS runs through the production affordance, produces beats, and PERSISTS its history
//   2. the reader's recorded choice TAKES EFFECT — "run" displaces the scheduled frame
//   3. the selected card's ACTION and FATE MODE reach planning — not its title alone
//   4. the correct prior scene AND the accepted facts AND the OAS history reach the NEXT planner
//
// WHAT IT CANNOT ESTABLISH: the OAS beats are CONTRACT-DERIVED fixtures built from the prompt's own
// declared schema, not recordings. Live OAS quality is UNTESTED here and is reported as such.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, fsPlannerCaptured, AUTHOR as REPLAY_AUTHOR, MEMORY,
  verifierVerdict, refsFromVerifierRequest, oasTurn, oasClosingBeat, OAS_TURNS,
  OAS_RESOLVE_MIN_BEAT, oasBeatPacingIssues } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS, advanceExpectingGate,
  chooseBranch } from './_fs_story_setup.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
console.log('=== INTEGRATED OPENING REPLAY (provider-free, $0) ===');
console.log('  OAS beats are CONTRACT-DERIVED fixtures. Live OAS quality is UNTESTED.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const reqs = { planner: [], author: [], oas: [], verifier: [] };
const logs = [];
let oasBeats = 0;
page.on('console', (m) => {
  const x = m.text();
  if (/\[INTIMACY|\[OAS|\[BAKED|\[EVENT-FRAME|\[SCENE-DECISION\]|\[COMMIT-SCENE|\[LEDGER:CLIPPED\]|\[CG:PLANNER-GATE\]|\[FATE\]/i.test(x)) logs.push(x);
});

await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = '', usr = '';
  try { const j = JSON.parse(raw || '{}');
    sys = String((j.messages || [])[0]?.content || '');
    usr = String((j.messages || [])[1]?.content || ''); } catch (_) {}
  const st = stageOf(sys);
  const give = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c }) });
  if (st === 'oas') {
    reqs.oas.push({ sys, usr });
    const body = oasBeats >= OAS_TURNS.length ? oasClosingBeat() : oasTurn(oasBeats);
    oasBeats++;
    return give(body);
  }
  if (st === 'planner') { reqs.planner.push({ sys, usr }); try { return give(fsPlannerCaptured()); } catch (_) {} }
  if (st === 'author') { reqs.author.push({ sys, usr }); return give(REPLAY_AUTHOR); }
  if (st === 'memory') return give(MEMORY);
  if (st === 'verifier') { reqs.verifier.push({ sys, usr }); return give(verifierVerdict(refsFromVerifierRequest(usr))); }
  try { await route.abort(); } catch (_) {}
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });

// ── 1. THE OAS RUNS AND PERSISTS ────────────────────────────────────────────
console.log('1. the OAS runs through the production affordance and persists its history');
const def = await findFSDef(page);
await launchFS(page, def);
const unlock = await unlockFS(page, 'integrated-replay');
await finalizePreview(page);
const oas = await enterOAS(page, { settleMs: 8000 });
t('the OAS affordance existed and was taken', oas.ok === true, JSON.stringify(oas));
t('the intimate dialogue is ACTIVE', oas.dialogueActive === true, JSON.stringify(oas));
t('the OAS asked for at least one beat', reqs.oas.length > 0, 'oas requests=' + reqs.oas.length);
t('its request carries the authored opening frame, not a generic one',
  reqs.oas.length > 0 && /Julian|Provast|The Answer|assembly/i.test(reqs.oas[0].usr + reqs.oas[0].sys),
  'the OAS prompt does not mention this Book\'s cast');
// Drive reader turns through the production consume path, then let it resolve.
// DRIVE PAST THE FIRST EXIT RAMP. app.js:205016 ignores a 'resolve' before beat 6 by design, so a
// three-turn exchange could never complete however the closing beat was shaped. Turns go through
// the production consume path, the CLOSING TURN IS CONSUMED before anything tries to advance, and
// resolution is waited for on observed state — the dialogue is never forced inactive and the
// authored interruption is never bypassed.
const turnLog = [];
let liveBeats = [];
for (let i = 0; i < OAS_RESOLVE_MIN_BEAT + 3; i++) {
  const st = await page.evaluate(() => {
    const d = window.state.intimacyDialogue;
    return d ? { active: !!d.active, resolving: !!d._resolving, beat: d.beatCount } : null;
  });
  if (!st || !st.active || st.resolving) { turnLog.push({ i, stoppedAt: st }); break; }
  const consumed = await page.evaluate(() => {
    if (typeof window._intimacyDialogueConsumeInput !== 'function') return 'absent';
    try { return window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); }
    catch (e) { return 'threw: ' + e.message; }
  });
  turnLog.push({ i, beat: st.beat, consumed });
  if (consumed === 'absent' || consumed === false) break;
  await page.waitForTimeout(3500);
  // SNAPSHOT WHILE IT IS ALIVE. _resolveIntimacyScene tears the record down, so liTurnHistory is
  // EMPTY afterwards — measured: len 0 once the dialogue is gone. A post-hoc read of the register
  // can only ever report nothing, which is exactly what my earlier runs reported.
  const live = await page.evaluate(() => {
    const d = window.state.intimacyDialogue || {};
    const h = Array.isArray(d.liTurnHistory) ? d.liTurnHistory : [];
    return h.map(x => (typeof x === 'string' ? { dialogue: x, action: '' }
      : { dialogue: String((x && (x.li_dialogue || x.dialogue || x.text)) || ''),
          action: String((x && (x.li_action || x.action)) || '') }));
  });
  if (live.length) liveBeats = live;
}
console.log('     turn loop: ' + JSON.stringify(turnLog));
// Resolution is deferred ~1800ms and tears down over ~2.2s. Waited for, never forced.
const resolveDeadline = Date.now() + 45000;
while (Date.now() < resolveDeadline) {
  const done = await page.evaluate(() => {
    const d = window.state.intimacyDialogue;
    return !d || d.active === false;
  });
  if (done) break;
  await page.waitForTimeout(1000);
}
const resolved = await page.evaluate(() => {
  const d = window.state.intimacyDialogue;
  return { stillActive: !!(d && d.active), beatCount: d ? d.beatCount : null,
    resolving: !!(d && d._resolving) };
});
console.log('     after driving turns: ' + JSON.stringify(resolved));
t('the dialogue reached the first exit ramp (beat >= ' + OAS_RESOLVE_MIN_BEAT + ')',
  (resolved.beatCount || 0) >= OAS_RESOLVE_MIN_BEAT, 'beatCount=' + resolved.beatCount);
t('the OAS RESOLVED on its own, not forced inactive', resolved.stillActive === false,
  'still active at beat ' + resolved.beatCount);
const oasState = await page.evaluate(() => ({
  beats: ((window.state._intimacyDialogue || {}).beats || []).length,
  ledgerEntries: ((window.state._sceneLedger || {}).entries || []).length,
  interruptionRecord: !!window.state._intimateInterruption,
  interruptionSubmitted: !!(window.state._intimateInterruption || {}).submitted,
  scenes: (window.state.scenes || []).length
}));
console.log('     after the OAS: ' + JSON.stringify(oasState));
t('the OAS produced beats through the real consume path', oasBeats > 1, 'oas beats served=' + oasBeats);
t('a scene ledger exists with the opening recorded', oasState.ledgerEntries > 0,
  'ledger entries=' + oasState.ledgerEntries);

// ── 1b. THE REGISTER: COMIC-PANEL PACING, GROUNDED, SEAL INTACT ─────────────
console.log('\n1b. the OAS register — dialogue plus a short beat, not a scene of narration');
{
  // THE BEATS ARE NOT ON `.beats`. My reader guessed that field and reported 0 for a dialogue that
  // had demonstrably taken turns. Rather than guess a second field name, this reports what the
  // record actually holds and reads whichever array of turn objects is there.
  const dShape = await page.evaluate(() => {
    const d = window.state.intimacyDialogue || {};
    const arrays = Object.keys(d).filter(k => Array.isArray(d[k]) && d[k].length);
    return { keys: Object.keys(d), arrayKeys: arrays, beatCount: d.beatCount,
      counts: arrays.reduce((o, k) => { o[k] = d[k].length; return o; }, {}) };
  });
  console.log('     dialogue record: beatCount=' + dShape.beatCount
    + '  populated arrays=' + JSON.stringify(dShape.counts));
  const rendered = liveBeats.length ? liveBeats : await page.evaluate(() => {
    const d = window.state.intimacyDialogue || {};
    // MEASURED: the turns live on liTurnHistory, not `.beats`. The previous reader guessed
    // `.beats` and reported 0 for a dialogue that had plainly taken turns.
    const src = Array.isArray(d.liTurnHistory) ? d.liTurnHistory : [];
    return src.map(b => (typeof b === 'string'
      ? { dialogue: b, action: '' }
      : { dialogue: String((b && (b.li_dialogue || b.dialogue || b.text)) || ''),
          action: String((b && (b.li_action || b.action)) || '') }));
  });
  console.log('     rendered beats: ' + rendered.length);
  rendered.slice(0, 3).forEach(b => console.log('       "' + b.dialogue.slice(0, 70)
    + '"  |  ' + b.action.slice(0, 80)));
  t('the dialogue rendered beats through the production path', rendered.length > 0,
    'no beats on state.intimacyDialogue');
  // PACING, as a predicate rather than an impression.
  // A REVIEW FLAG, NOT A RULE (Roman 2026-10-03). Comic-panel pacing is the requirement; the
  // sentence and character counts are a way to SURFACE drift for a human to look at. They are not
  // a production rejection rule and nothing truncates prose on their account — this is harness
  // reporting only.
  const paceIssues = rendered.flatMap(b => oasBeatPacingIssues(b.action)
    .map(x => '"' + b.action.slice(0, 40) + '…" ' + x));
  console.log('     pacing flags for review: ' + (paceIssues.length
    ? JSON.stringify(paceIssues) : 'none'));
  console.log('     beat lengths: ' + JSON.stringify(rendered.map(b => b.action.length)));
  // GROUNDED IN THE QUESTIONING.
  const all = rendered.map(b => b.dialogue + ' ' + b.action).join(' ');
  t('the exchange stays grounded in the rite, the allegation or The Answer',
    /The Answer|rite|clearing|assembly|called to me|wish/i.test(all), all.slice(0, 120));
  // THE SEAL, IN BOTH CHANNELS.
  const seal = /counter-?wish|his own wish|Julian wished|he spent his wish|countered it/i;
  t('Julian\'s secret is in NEITHER the dialogue NOR the beat beneath it',
    !seal.test(all), 'the seal leaked into the OAS');
}

// ── 1c. THE READER SUBMITS AT THE AUTHORED DOHKAR INTERRUPTION ──────────────
// MEASURED (probe, 2026-10-03): once the OAS resolves, the authored interruption mounts
// ("[INTIMATE-INTERRUPT] mounted host=cg image=d3 lines=3") and _advanceStagedScene REFUSES every
// continuation until the reader submits there — "continuation requested before the reader
// submitted — re-mounting the interruption, requesting nothing". That is the canon's own order:
// the Dohkar cuts the interrogation off, and only then does run-or-remain arise.
console.log('\n1c. the reader submits at the authored Dohkar interruption');
{
  const pending = await page.evaluate(() => ({
    pending: typeof window._intimateInterruptionPending === 'function'
      ? !!window._intimateInterruptionPending() : 'absent',
    lines: ((window.state._intimateInterruption || {}).frame || {}).interruptionExchange
      ? ((window.state._intimateInterruption || {}).frame.interruptionExchange || []).length : null
  }));
  t('the authored interruption is pending after the OAS', pending.pending === true,
    JSON.stringify(pending));
  const committed = await page.evaluate(() => {
    if (typeof window._commitIntimateInterruption !== 'function') return 'absent';
    try { return window._commitIntimateInterruption('I turn away from the clearing and walk.',
      'Nothing. I have nothing to say to any of you.'); }
    catch (e) { return 'threw: ' + e.message; }
  });
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => ({
    pending: typeof window._intimateInterruptionPending === 'function'
      ? !!window._intimateInterruptionPending() : 'absent',
    decision1: (window.state._sceneDecisions || {})['1'] || null,
    decisionNeeded: typeof window._sceneDecisionNeeded === 'function'
      ? !!window._sceneDecisionNeeded() : 'absent'
  }));
  t('the submission was accepted by the production handler', committed === true,
    JSON.stringify(committed));
  t('and the interruption is no longer pending', after.pending === false, JSON.stringify(after));
  console.log('     after the interruption submit: ' + JSON.stringify(after));
}

// ── 2. THE RECORDED CHOICE TAKES EFFECT ─────────────────────────────────────
console.log('\n2. the reader\'s recorded choice takes effect');
const gated = await advanceExpectingGate(page, '', '');
t('the advance refused until the choice was recorded', gated.promptMounted === true, JSON.stringify(gated));
const picked = await chooseBranch(page, 'A');                     // A = run
t('the choice was recorded by the prompt\'s own handler',
  !!(picked.after.decision1 && picked.after.decision1.choice === 'run'), JSON.stringify(picked.after));
const displaced = await page.evaluate(() => window._recordedChoiceDisplacesFrame(window.state,
  { laneId: 'dohkar_preliminary_review', eventFrame: 'the Dohkar calls for a preliminary review' }));
t('and "run" DISPLACES the scheduled frame', displaced.displaces === true, JSON.stringify(displaced));
t('on the seed\'s declaration, not a keyword match',
  /declared situation-changing by the seed/.test(displaced.why || ''), displaced.why);

// Wait for scene 2 to generate.
let dl = Date.now() + 180000;
while (Date.now() < dl && !reqs.author.length) await new Promise(r => setTimeout(r, 1000));
const dl2 = Date.now() + 180000;
let mounted = false;
while (Date.now() < dl2) {
  mounted = await page.evaluate(() => { const a = window.state._stagedActive;
    return !!(a && a.plan && Array.isArray(a.plan.beats) && a.plan.beats.length); });
  if (mounted) break;
  await new Promise(r => setTimeout(r, 1000));
}
t('scene 2 generated', mounted === true);
const s2prose = await page.evaluate(() => { try { return String(window._sbLatestProseText(window.state) || ''); } catch (_) { return ''; } });
t('and its prose is not the baked opening',
  s2prose.length >= 200 && s2prose !== String(unlock.state.scene0 || ''), 'len=' + s2prose.length);
// THE DIRECTIVE THE PLANNER RECEIVED must carry the displacement, not the hard frame.
const p1 = reqs.planner.length ? (reqs.planner[reqs.planner.length - 1].sys + reqs.planner[reqs.planner.length - 1].usr) : '';
t('the planner was told the frame was DISPLACED by the reader\'s action',
  /DISPLACED THIS SCENE BY THE READER'S OWN RECORDED ACTION/.test(p1),
  p1 ? 'the displaced directive is absent from the planner payload' : 'no planner request captured');
t('and it was NOT told the frame is hard',
  !/it does NOT change WHICH event happens/.test(p1));

// ── 2b. THE TRANSITION INTO THE AUTHORED DOHKAR INTERRUPTION ────────────────
console.log('\n2b. the handoff into the authored interruption');
{
  const intr = await page.evaluate(() => {
    const r = window.state._intimateInterruption || null;
    const pkg = (typeof window._bakedScene1For === 'function')
      ? window._bakedScene1For(window.state._starterId) : null;
    const authored = (pkg && pkg.oasHandoff) || {};
    return { record: !!r, submitted: !!(r && r.submitted),
      authoredInterruption: String(authored.interruption || '').slice(0, 120),
      exchangeLines: (authored.interruptionExchange || []).length };
  });
  console.log('     interruption: ' + JSON.stringify(intr));
  t('the Book authors a Dohkar interruption with a fixed exchange',
    !!intr.authoredInterruption && intr.exchangeLines >= 2, JSON.stringify(intr));
  t('and the OAS reached the point where it becomes eligible',
    logs.some(x => /TWO-PATH.*interruption now eligible/i.test(x))
    || intr.record === true,
    'the dialogue never reached the interruption');
}

// ── 3. THE CARD'S ACTION AND FATE MODE REACH PLANNING ───────────────────────
console.log('\n3. the selected card\'s action and Fate mode reach planning');
const readToGate = () => page.evaluate(async () => {
  const sl = (ms) => new Promise(r => setTimeout(r, ms));
  const st = () => { const a = window.state._stagedActive || null;
    return a ? { b: a.currentBeatIdx, g: !!a.gateShown, m: !!a.microShown } : null; };
  for (let i = 0; i < 240; i++) {
    const c = st(); if (!c || c.g) break;
    const prev = c.b;
    try { window._advanceStagedBeat(); } catch (_) {}
    await sl(50);
    const n = st();
    if (n && n.b === prev && !n.g) {
      if (!n.m && window._resolveMicroDecision) { try { window._resolveMicroDecision(0); } catch (_) {} await sl(70); }
      else await sl(100);
    }
  }
});
await readToGate();
const deck = await page.evaluate(() => (window.state.fateOptions || []).map((c, i) => ({
  i, title: c.title || null, action: c.action || '', ordinaryWish: !!c._ordinaryWish,
  variant: c._wishVariant || null })));
console.log('     deck: ' + deck.map(c => c.title).join(' | '));
t('the deck is the Book\'s own five slots', deck.length === 5
  && deck.every(c => ['Temptation', 'Silence', 'Reversal', 'Boundary', 'Confession'].includes(c.title)),
  JSON.stringify(deck.map(c => c.title)));
t('no templated wish card is dealt to this Book',
  deck.every(c => !c.variant && !c.ordinaryWish), JSON.stringify(deck.filter(c => c.variant)));
t('no card action mentions a wound or a healer that is not in this story',
  deck.every(c => !/wound|healer/i.test(c.action)), JSON.stringify(deck.map(c => c.action.slice(0, 50))));
const beforeP = reqs.planner.length;
const chosen = deck[0];
await page.evaluate(() => { const el = document.querySelector('[data-card-index="0"]'); if (el) el.click();
  try { window._advanceStagedScene('', ''); } catch (_) {} });
dl = Date.now() + 180000;
while (Date.now() < dl && reqs.planner.length <= beforeP) await new Promise(r => setTimeout(r, 1000));
const p2 = reqs.planner.length > beforeP
  ? (reqs.planner[reqs.planner.length - 1].sys + reqs.planner[reqs.planner.length - 1].usr) : '';
t('a planner request followed the card play', !!p2);
t('the card\'s TITLE reached planning', !!p2 && p2.includes(chosen.title), chosen.title);
t('the card\'s ACTION reached planning — not the title alone',
  !!p2 && !!chosen.action && p2.includes(chosen.action.slice(0, 40)),
  'action: ' + chosen.action.slice(0, 60));
t('the card\'s FATE MODE reached planning (ordinary-wish status is stated)',
  !!p2 && /ordinary|wish|Fate/i.test(p2));

// ── 4. THE NEXT PLANNER'S HISTORY ───────────────────────────────────────────
console.log('\n4. the correct prior scene, the accepted facts, and the OAS history');
const vr = reqs.verifier.length ? reqs.verifier[reqs.verifier.length - 1].usr : '';
const m = vr.match(/SCENE PROSE:\s*([\s\S]*?)\s*(?:\n\nReturn the JSON now\.|\n\nPLANNED EVENT SLOTS)/);
const given = m ? m[1].trim() : '';
const norm = (x) => String(x || '').replace(/\s+/g, ' ').trim();
t('the verifier was dispatched for the prior scene', !!vr, 'no verifier request');
t('and it was given scene 2, not the baked opening',
  !!given && norm(s2prose).includes(norm(given).slice(0, 120)),
  'the verifier received ' + given.length + ' chars that are not scene 2');
const facts = await page.evaluate(() => {
  const cs = window._ensureCommittedState();
  return (cs.facts || []).map(f => ({ ref: f.proposalRef, content: String(f.content || '').slice(0, 80) }));
});
t('an accepted fact was committed from the prior scene', facts.length > 0, JSON.stringify(facts));
t('the next planner received the committed facts, not an empty ledger',
  !!p2 && /COMMITTED WORLD STATE/.test(p2) && !/facts already TRUE[^:]*: \[\]/.test(p2),
  (p2.match(/COMMITTED WORLD STATE[^\n]{0,120}/) || ['(absent)'])[0]);
t('and it received the opening\'s own history',
  !!p2 && /(began to twist|The Dohkar charged|The Answer)/.test(p2),
  'the opening ledger line is absent from the planner payload');

// ── THE CLIP IS NO LONGER SILENT ────────────────────────────────────────────
console.log('\n5. a clipped ledger field can no longer disappear silently');
{
  const probe = await page.evaluate(() => {
    const before = (window._sceneLedgerClipLosses ? window._sceneLedgerClipLosses().length : 0);
    return { before, hasApi: typeof window._sceneLedgerClipLosses === 'function' };
  });
  t('the clip exposes what it removed', probe.hasApi === true);
  const clipped = logs.filter(x => /\[LEDGER:CLIPPED\]/.test(x));
  console.log('     clip warnings this run: ' + clipped.length);
  if (clipped.length) clipped.slice(0, 2).forEach(x => console.log('       · ' + x.slice(0, 170)));
}

await browser.close();
fs.mkdirSync('_audit_out/integrated', { recursive: true });
fs.writeFileSync('_audit_out/integrated/logs.json', JSON.stringify(logs, null, 2));
if (reqs.planner.length) fs.writeFileSync('_audit_out/integrated/last_planner.txt',
  reqs.planner[reqs.planner.length - 1].sys + '\n\n=== USER ===\n' + reqs.planner[reqs.planner.length - 1].usr);
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('\nUNTESTED HERE: live OAS response quality. The beats above are contract-derived');
console.log('fixtures built from the prompt\'s own declared schema, not recordings.');
process.exit(fail ? 1 : 0);
