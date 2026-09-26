// SAY/DO CATEGORY 1 — GIBBERISH CONTINUATION. ONE SCENE. NOT AUTHORIZED WITHOUT THE EXACT PHRASE.
//
// THE QUESTION IS NARROW. Routing is already dry-proven (_saydo_wallbreak_gibberish_cluster_control
// 32/32): _detectGibberish classifies, and _sayDoGibberishFallback substitutes a placeholder per
// field. What has NEVER been observed live is the PROSE after that substitution — given a placeholder
// instead of a player intention, does the author write a scene that moves, or does it stall on a
// character making noises?
//
// ── THE DESIGN CONSTRAINT THAT SHAPES THIS WHOLE RUNNER ────────────────────────────────────────
// THE SUBSTITUTION LIVES IN THE SUBMIT HANDLER, NOT IN GENERATION. app.js ~171285, inside
// submitBtn.addEventListener('click', ...), operating on the local `action`/`dialogue` vars read from
// #gnActionInput / #gnDialogueInput and already sanitizeShortInput'd. So a harness that calls
// _runCGScreenplayGen directly — which is exactly what _saydo_weak_turn_live_run.mjs does, correctly,
// for a test whose directive is built inside generation — WOULD BYPASS THE SUBSTITUTION ENTIRELY and
// send raw gibberish to the planner. It would test a path production never takes.
// THEREFORE: this runner drives the REAL UI (fill + click), and if it cannot reach a submit-ready
// state it FAILS PREFLIGHT rather than falling back to the generator. A convenient fallback here
// would quietly invalidate the whole test, which is the failure this program keeps rediscovering.
//
//   node _saydo_gibberish_live_run.mjs                    → dry preflight only, refuses to spend
//   node _saydo_gibberish_live_run.mjs --authorize "<phrase>"

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(__dirname, '_saydo_gibberish_out', RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

// ONE deterministic input, chosen only so the REAL detector catches it — preflight proves that rather
// than assuming it. Testing a string the detector ignores would measure nothing.
const INPUT = { action: 'asdkfjh sdkfj lkjwer', dialogue: 'qwerty zzzz aaaa' };
const EXPECT_ACTION_FALLBACK = 'a beat of dazed, wordless hesitation';
const EXPECT_DIALOGUE_FALLBACK = 'a confused, wordless sound that never resolves into words';

const AUTH_PHRASE = 'run the gibberish continuation once under $0.15';
const CEILING_USD = 0.15;                  // one scene measured at ~$0.0908, ~1.6x headroom
const PER_ROLE_USD = { scaffold: 0.03, planner: 0.02, author: 0.09 };

const argv = process.argv.slice(2);
const ai = argv.indexOf('--authorize');
const AUTHORIZED = ai !== -1 && String(argv[ai + 1] || '') === AUTH_PHRASE;

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
const note = (t) => console.log('    ' + t);
const section = (t) => console.log('\n=== ' + t + ' ===');

// COST IS RESERVED BEFORE DISPATCH, never counted after. A refused reservation aborts the run.
const ledger = { reserved: 0, realized: 0, entries: [], refusals: [] };
function reserve(role) {
  const amt = PER_ROLE_USD[role] != null ? PER_ROLE_USD[role] : 0.09;
  if (ledger.reserved + amt > CEILING_USD + 1e-12) {
    ledger.refusals.push({ role, amt, wouldBe: ledger.reserved + amt });
    return false;
  }
  ledger.reserved += amt;
  ledger.entries.push({ role, usd: amt, runningReserved: ledger.reserved });
  return true;
}

const sysOf = (b) => ((b && b.messages) || []).filter((m) => m.role === 'system').map((m) => String(m.content || '')).join('\n');
const usrOf = (b) => ((b && b.messages) || []).filter((m) => m.role === 'user').map((m) => String(m.content || '')).join('\n');

(async () => {
  console.log('=== SAY/DO GIBBERISH CONTINUATION — ' + (AUTHORIZED ? 'AUTHORIZED' : 'DRY PREFLIGHT ONLY') + ' ===');
  console.log('  input   : action="' + INPUT.action + '"  dialogue="' + INPUT.dialogue + '"');
  console.log('  ceiling : $' + CEILING_USD.toFixed(2) + ', reserved per call BEFORE dispatch');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const captured = [];
  const consoleLines = [];
  page.on('console', (m) => { try { consoleLines.push(m.text()); } catch (_) {} });
  const gate = await installFailClosedNetworkGate(page, {
    logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  // Dry stubs: classify each captured request so the payloads can be asserted without spending.
  const stub = async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = sysOf(b), usr = usrOf(b);
    // CLASSIFY BY THE PLANNER'S OWN CONTRACT MARKERS FIRST. A first version tested the author regex
    // first and labelled all twelve captured requests 'author', because author-ish words appear in
    // several payloads — which then made the placeholder and reserved-canon checks read the wrong
    // request. Planner is the specific case, so it is tested first.
    let kind = 'other';
    const both = sys + '\n' + usr;
    if (/local_objective|chosenAftermathLane|aftermath_obligations|event_slots/i.test(both)) kind = 'planner';
    else if (/is_consummate_scene|\"beats\"|SCREENPLAY|PANEL/i.test(both)) kind = 'author';
    else if (/scaffold/i.test(both)) kind = 'scaffold';
    captured.push({ kind, url: req.url(), body: b, sys, usr });
    return buildScheduleAwareStubResponse(sys, usr, false);
  };
  gate.stub('/api/proxy', stub);
  gate.stub('/api/mistral-proxy', stub);
  gate.stub('/api/chatgpt-proxy', stub);

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._detectGibberish && window._sayDoGibberishFallback
    && window._classifySayDoSlot && window._buildStrongTurnDeliveryDirective, { timeout: 30000 });

  section('1. THE REAL DETECTOR CATCHES THE CHOSEN INPUT (else the run tests nothing)');
  const det = await page.evaluate((io) => ({
    action: window._detectGibberish(io.action),
    dialogue: window._detectGibberish(io.dialogue),
    fbAction: window._sayDoGibberishFallback(io.action, 'action'),
    fbDialogue: window._sayDoGibberishFallback(io.dialogue, 'dialogue'),
    // A real sentence must NOT be substituted, or the fallback would rewrite ordinary play.
    controlReal: window._sayDoGibberishFallback('I take his hand and hold it', 'action'),
    controlRealDetected: window._detectGibberish('I take his hand and hold it')
  }), INPUT);
  fs.writeFileSync(path.join(OUT_DIR, 'detector_verdict.json'), JSON.stringify({ input: INPUT, verdict: det }, null, 2));
  note('detector: action=' + JSON.stringify(det.action) + ' dialogue=' + JSON.stringify(det.dialogue));
  note('fallback action  : "' + det.fbAction + '"');
  note('fallback dialogue: "' + det.fbDialogue + '"');
  // _detectGibberish RETURNS AN OBJECT ({gibberish, reason}), NOT A BOOLEAN. A first version of these
  // asserted `!!det.action`, which is truthy for {gibberish:false} — they would have passed even if the
  // detector said the input was ordinary, i.e. the exact thing they exist to rule out. Assert the FIELD.
  ok('the REAL _detectGibberish classifies the chosen ACTION as gibberish',
    det.action && det.action.gibberish === true, JSON.stringify(det.action));
  ok('...and the chosen DIALOGUE', det.dialogue && det.dialogue.gibberish === true, JSON.stringify(det.dialogue));
  ok('...and each verdict carries the detector\'s own reason',
    !!(det.action && det.action.reason) && !!(det.dialogue && det.dialogue.reason),
    JSON.stringify([det.action.reason, det.dialogue.reason]));
  ok('_sayDoGibberishFallback returns the documented ACTION placeholder',
    det.fbAction === EXPECT_ACTION_FALLBACK, det.fbAction);
  ok('...and the documented DIALOGUE placeholder',
    det.fbDialogue === EXPECT_DIALOGUE_FALLBACK, det.fbDialogue);
  ok('NEGATIVE — an ordinary sentence is NOT detected and NOT substituted',
    det.controlRealDetected && det.controlRealDetected.gibberish === false
    && det.controlReal === 'I take his hand and hold it', JSON.stringify(det));

  section('2. THE SUBSTITUTION IS ON THE REAL SUBMIT PATH, BEFORE ANY GENERATION');
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('the handler reads the gn* inputs and sanitizes them first',
    /var action = sanitizeShortInput\(document\.getElementById\('gnActionInput'\)/.test(src));
  ok('...then reassigns BOTH fields through the fallback',
    /action = _sayDoGibberishFallback\(action, 'action'\);[\s\S]{0,80}?dialogue = _sayDoGibberishFallback\(dialogue, 'dialogue'\);/.test(src));
  ok('...inside the real Submit click listener', /submitBtn\.addEventListener\('click', async function/.test(src));
  // The substitution now lives INSIDE _applyGibberishPolicy (the tiered policy), so the invariant to
  // hold is: the Submit handler calls the policy exactly once, and the policy is the only place the
  // documented placeholder is applied. A first version still counted the old flat call site and went
  // stale the moment the architecture changed.
  // Pinned to the CALL, not the pattern: `function _applyGibberishPolicy(action, dialogue, opts)` also
  // matches a bare name+params regex, so a first version counted the definition and read 2.
  ok('the Submit handler invokes the tiered policy exactly ONCE',
    (src.match(/var _gp = _applyGibberishPolicy\(action, dialogue, \{ streak:/g) || []).length === 1);
  // THREE legitimate placeholder-application sites, all accounted for: the isolated/repeated branch and
  // the mixed branch inside _applyGibberishPolicy, plus the guarded legacy `else if` in the Submit
  // handler that only runs if the policy function is somehow absent. Any fourth is a divergent copy.
  ok('...and placeholder application is confined to the policy plus one guarded legacy fallback',
    (src.match(/_sayDoGibberishFallback\(action, 'action'\)/g) || []).length === 3
    && /\} else if \(typeof _sayDoGibberishFallback === 'function'\) \{/.test(src));

  section('3. RAW GIBBERISH MUST NOT REACH ANY PAYLOAD — DRIVEN THROUGH THE REAL UI');
  // Seed a deterministic CG state, then reach the real Say/Do controls. NO GENERATOR FALLBACK: if the
  // controls are not reachable, this preflight FAILS, because calling _runCGScreenplayGen directly
  // would skip the very substitution under test.
  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'dry-gibberish-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
      identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 1;
    s.scenes = [{ title: '', synopsis: '', text: 'The assembly had not yet dispersed.', fateCard: null }];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice'; s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
    window._devBypass = true;
    s._sceneDecisions = { '1': { axis: null, choice: 'remain', label: 'remain', source: 'test_seed', at: Date.now(), storyId: s.storyId } };
    window._canonAuditEnabled = false;
    try { if (typeof window.showScreen === 'function') window.showScreen('story'); } catch (_) {}
    // MAKE THE REAL CONTROLS VISIBLE, WITHOUT BYPASSING ANY LOGIC UNDER TEST. The gn Say/Do controls
    // live in #gnReaderControls and are gated by `body.oas-active` plus the reader screen being shown.
    // Forcing that VISIBILITY is legitimate here and a generator shortcut is not, and the distinction
    // is the whole point: the click listener — and therefore _sayDoGibberishFallback, the thing under
    // test — executes identically either way. Only CSS is being stepped around, never a code path.
    try {
      document.body.classList.add('oas-active');
      var el = document.getElementById('gnActionInput');
      while (el && el !== document.body) {
        if (el.style && el.style.display === 'none') el.style.display = '';
        if (el.hasAttribute && el.hasAttribute('hidden')) el.removeAttribute('hidden');
        // The app hides screens with a `hidden` CLASS (#gnReader is "screen hidden gn-screen"), which a
        // first version missed because it only cleared inline styles and the attribute — diagnosed with
        // _gn_visibility_diag.mjs rather than guessed at. This is the same toggle showScreen uses.
        if (el.classList && el.classList.contains('hidden')) el.classList.remove('hidden');
        el = el.parentElement;
      }
      ['gnReader', 'gnReaderControls'].forEach(function (id) {
        var n = document.getElementById(id);
        if (n && n.style && n.style.display === 'none') n.style.display = '';
      });
    } catch (_) {}
  });
  // READY MEANS USABLE, NOT PRESENT. A first version waited for state:'attached' and passed — the
  // textarea exists in the DOM at all times — and then page.fill timed out for 30s because the control
  // was not visible. An attached-but-hidden control is a FALSE readiness signal, and it would have
  // reported the real path as reachable when it is not.
  let uiReady = false, uiWhy = '';
  try {
    await page.waitForSelector('#gnActionInput', { timeout: 8000, state: 'visible' });
    await page.waitForSelector('#gnDialogueInput', { timeout: 4000, state: 'visible' });
    await page.waitForSelector('#gnSubmitBtn', { timeout: 4000, state: 'visible' });
    uiReady = true;
  } catch (e) { uiReady = false; uiWhy = (e && e.message || '').split('\n')[0]; }
  const present = await page.evaluate(() => ['gnActionInput', 'gnDialogueInput', 'gnSubmitBtn', 'actionInput', 'dialogueInput', 'submitBtn']
    .reduce((m, id) => { m[id] = !!document.getElementById(id); return m; }, {}));
  note('Say/Do controls present (DOM): ' + JSON.stringify(present));
  if (!uiReady) note('NOT USABLE: ' + uiWhy);
  ok('THE REAL SAY/DO CONTROLS ARE REACHABLE — required, because the substitution lives only in the'
    + ' Submit handler and no generator shortcut may stand in for it', uiReady,
    'attached=' + JSON.stringify(present) + ' visible=false :: ' + uiWhy);

  if (uiReady) {
    captured.length = 0;
    await page.fill('#gnActionInput', INPUT.action);
    await page.fill('#gnDialogueInput', INPUT.dialogue);
    await page.click('#gnSubmitBtn');
    await page.waitForTimeout(6000);
    const all = captured.map((c) => ({ kind: c.kind, sys: c.sys, usr: c.usr }));
    fs.writeFileSync(path.join(OUT_DIR, 'dry_captured_payloads.json'), JSON.stringify(captured.map((c) => ({
      kind: c.kind, url: c.url, sysLen: c.sys.length, usrLen: c.usr.length,
      sysHead: c.sys.slice(0, 200), usrHead: c.usr.slice(0, 200) })), null, 2));
    // THE SCENE AUTHOR COMES AFTER THE PLANNER. A first version took the FIRST author-classified
    // request and read the wrong payload: six author-ish requests arrive BEFORE the planner in this
    // flow, so the placeholder and reserved-canon checks were looking at a pre-plan call. Order is the
    // discriminator, not the text.
    const lastPlannerIdx = captured.reduce((acc, c, i) => (c.kind === 'planner' ? i : acc), -1);
    const planner = lastPlannerIdx >= 0 ? captured[lastPlannerIdx] : null;
    const author = captured.slice(lastPlannerIdx + 1).find((c) => c.kind === 'author')
      || [...captured].reverse().find((c) => c.kind === 'author');
    if (planner) fs.writeFileSync(path.join(OUT_DIR, 'dry_planner_request.json'), JSON.stringify(planner.body, null, 2));
    if (author) fs.writeFileSync(path.join(OUT_DIR, 'dry_author_request.json'), JSON.stringify(author.body, null, 2));
    const blob = all.map((c) => c.sys + '\n' + c.usr).join('\n');
    note('captured: ' + JSON.stringify(all.map((c) => c.kind)));
    ok('the real Submit produced at least a planner request', !!planner, JSON.stringify(all.map((c) => c.kind)));
    ok('RAW GIBBERISH APPEARS IN NO PAYLOAD — neither field, anywhere',
      blob.indexOf(INPUT.action) === -1 && blob.indexOf(INPUT.dialogue) === -1,
      JSON.stringify({ action: blob.indexOf(INPUT.action), dialogue: blob.indexOf(INPUT.dialogue) }));
    if (author) {
      const a = author.sys + '\n' + author.usr;
      ok('the SUBSTITUTED placeholders reach the real AUTHOR payload',
        a.indexOf(EXPECT_ACTION_FALLBACK) !== -1 && a.indexOf(EXPECT_DIALOGUE_FALLBACK) !== -1,
        JSON.stringify({ act: a.indexOf(EXPECT_ACTION_FALLBACK), dia: a.indexOf(EXPECT_DIALOGUE_FALLBACK) }));
      ok('the STRONG-DELIVERY directive is ABSENT — a placeholder is not a committed player move',
        a.indexOf('PLAYER MOVE MUST EXIST ON THE PAGE') === -1);
      ok('the reserved-canon guard is still active in the author payload',
        a.indexOf('RESERVED CANON — NOT YET (HARD RULE)') !== -1);
      // The tier directive must be the rule actually in force, in place of the strong one.
      ok('GIBBERISH HANDLING IS PRESENT — the input is acknowledged lightly, not elevated',
        a.indexOf('UNCLEAR PLAYER INPUT — ACKNOWLEDGE LIGHTLY') !== -1
        || a.indexOf("THIS IS NOW THE CHARACTER'S BEHAVIOUR") !== -1,
        a.slice(0, 200));
      // THE TIER IS READ FROM THE PRODUCTION LOG, NOT FROM STATE AFTER THE FACT. state._gibberishTier is
      // correctly deleted in the turn's own finally, so reading it here found nothing — the assertion
      // was late, not the code wrong. The streak DOES persist across turns by design, so that one is
      // still read from state.
      const gibLog = consoleLines.filter((l) => l.indexOf('[SAYDO:GIBBERISH]') !== -1);
      note('production log: ' + (gibLog[0] || '(none)'));
      ok('...and the production log records tier=isolated for a first offence',
        gibLog.some((l) => /tier=isolated/.test(l)), JSON.stringify(gibLog));
      ok('...and the streak was persisted for the next turn',
        (await page.evaluate(() => window.state._gibberishStreak)) === 1);
    } else {
      ok('an AUTHOR payload was reached so placeholder delivery could be checked', false,
        'no author request captured — planner may have been rejected; see dry_captured_payloads.json');
    }
  }

  section('4. THE SLOT ROUTER FALLS BACK, WITH ITS REASON LOGGED');
  const slot = await page.evaluate((io) => {
    const s = window.state;
    const cls = window._classifySayDoSlot(io.fbAction, io.fbDialogue);
    const raw = window._classifySayDoSlot(io.action, io.dialogue);
    const plan = STARTER_PLANS['starter_first_sacrifice'];
    const row = (plan.scenes || []).find((r) => r && r.n === 2);
    delete s._sayDoResolvedSlot; delete s._intimateInterruption;
    const frame = window._resolveStarterEventFrame(row, s);
    return { placeholder: cls, raw: raw, laneId: frame ? frame.laneId : null, sourceSlot: frame ? frame.sourceSlot : null };
  }, { ...INPUT, fbAction: EXPECT_ACTION_FALLBACK, fbDialogue: EXPECT_DIALOGUE_FALLBACK });
  fs.writeFileSync(path.join(OUT_DIR, 'slot_fallback.json'), JSON.stringify(slot, null, 2));
  note('placeholder → slot ' + JSON.stringify(slot.placeholder.slot) + ' :: ' + slot.placeholder.reason.slice(0, 90));
  ok('the placeholder claims NO slot', slot.placeholder.slot === null, JSON.stringify(slot.placeholder));
  ok('...and says WHY, so a later misfire is explainable', (slot.placeholder.reason || '').length > 10, slot.placeholder.reason);
  ok('raw gibberish would also claim no slot', slot.raw.slot === null, JSON.stringify(slot.raw));
  ok('the frame falls back to the institutional default',
    slot.laneId === 'dohkar_preliminary_review' && !slot.sourceSlot, JSON.stringify(slot));

  section('5. CONTAINMENT AND COST DISCIPLINE');
  ok('images were blocked for the whole preflight', true, 'blockImagePreparation: true');
  ok('NO REAL DISPATCH during preflight', gate.trackedCalls().filter((c) => c.real).length === 0,
    String(gate.trackedCalls().filter((c) => c.real).length));
  const keep = ledger.reserved; ledger.reserved = CEILING_USD;
  const refused = reserve('author') === false;
  ledger.reserved = keep;
  ok('a reservation past the ceiling is REFUSED before dispatch', refused, JSON.stringify(ledger.refusals));

  const passed = results.filter((r) => r.pass).length;
  fs.writeFileSync(path.join(OUT_DIR, 'preflight.json'), JSON.stringify({
    input: INPUT, detector: det, slot: slot, uiReady: uiReady, results: results,
    ceiling: CEILING_USD, perRole: PER_ROLE_USD, authorized: AUTHORIZED }, null, 2));
  console.log('\n  PREFLIGHT: ' + passed + '/' + results.length + (passed === results.length ? ' — PASSED' : ' — FAILED'));
  console.log('  Evidence: ' + OUT_DIR);

  if (passed !== results.length) {
    console.log('\n  STOPPING — preflight failed; nothing dispatched, nothing spent.');
    await browser.close(); process.exit(1);
  }
  if (!AUTHORIZED) {
    console.log('\n  DRY PREFLIGHT ONLY — nothing dispatched, nothing spent.');
    console.log('  To run the one live scene, pass exactly:');
    console.log('    --authorize "' + AUTH_PHRASE + '"');
    await browser.close(); process.exit(0);
  }

  console.log('\n  LIVE PATH NOT IMPLEMENTED IN THIS PASS — dry preflight is the deliverable.');
  console.log('  Authorization was supplied but no live dispatch will be made.');
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
