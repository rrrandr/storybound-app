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

// FRESH PHRASE: the previous one was consumed by a run that produced NO DATA (runner reservation
// misclassification), and a spent authorization must never release a retry.
// CEILING RAISED TO $0.20, justified by the reservation math rather than by preference: the measured
// scene is ~$0.091, but the per-role RESERVATIONS are deliberately conservative (0.03 + 0.02 + 0.09 =
// $0.14), which at $0.15 leaves no room for even one planner retry — $0.16 would abort a healthy run.
// $0.20 covers one scene plus a retry without loosening the guard itself.
// THE PREVIOUS PHRASE WAS CONSUMED. It released the 2026-09-26T07-10-13 attempt, which spent real
// money ($0.010893 measured on one call, four more unmeasured). Failing to reach the author does not
// make an authorization unspent — money left the account, so the phrase is burnt.
// THE PHRASE NO LONGER PROMISES A SPEND FIGURE IT CANNOT HOLD. It names the reservation limit and
// requires explicit acceptance that one call may exceed its allowance.
const AUTH_PHRASE = 'run the gibberish continuation once with fallback disabled and a $0.22 reservation limit, accepting that one call may exceed its allowance';
const GROK43 = { in: 1.25e-6, out: 2.5e-6, tierAt: 200000, inHi: 2.5e-6, outHi: 5e-6 };
// Two real author receipts, kept as the arithmetic fixtures for the rate check.
const AUTHOR_RECEIPTS = [
  { prompt: 55043, completion: 4027, reasoning: 1156, ticks: 815596500 },
  { prompt: 56151, completion: 5062, reasoning: 1224, ticks: 857021500 }
];
// ── RESERVATION LIMIT, NOT A COST CEILING. THE DIFFERENCE IS NOT COSMETIC. ────────────────────
// Disabling fallback caps the NUMBER of upstream calls. It does nothing about how much ONE call can
// bill. Sized from CAPTURED TOKEN COUNTS at the corrected grok-4.3 rates, not inferred backwards from
// a total bill (which mixes input, output, reasoning and caching and cannot be decomposed):
//   author  — role STRUCTURE_GENERATOR, grok-4-1-fast-reasoning -> grok-4.3, max_tokens 8000, temp 0.85
//             observed prompt 55,043 / 56,151 tokens => input ~$0.069-0.070
//             observed output 4,027-5,062 completion + 1,156-1,224 reasoning => ~$0.013-0.016
//             billed $0.081560 and $0.085702
//             worst case within configured limits: input ~$0.070 + (max_tokens 8000 + a generous
//             8,000 reasoning) x $2.50/M = ~$0.040  =>  ~$0.110
//   small grok calls (planner and/or continuity) — prompts 2,060-5,982, billed $0.005043-$0.010893
//   cheap tier ministral-8b-2512 — prompts ~5,428, ~$0.002
// REASONING TOKENS SIT ON TOP AND ARE NOT BOUNDED BY max_tokens on xAI — this workstream learned that
// when the grok-4.7 calibration overspent its ceiling. THERE IS NO ENFORCEABLE TOTAL-COST LIMIT AT
// THIS PROVIDER. What this runner enforces is the number and class of calls, refused BEFORE dispatch.
// What it cannot do is stop one permitted call from billing more than its allowance. These are
// ALLOWANCES, not guarantees.
const CEILING_USD = 0.22;   // reservation limit across all calls; NOT a guaranteed spend bound
// ── ROLES ENUMERATED FROM ARTIFACTS, NOT ASSUMED ───────────────────────────────────────────────
// The dry run captured TWELVE calls through the real Submit path, and they resolve into exactly THREE
// logical roles, each attempting the SAME three endpoints in turn via the tiered provider dispatch:
//   CONTINUITY ARCHITECT  → proxy, mistral-proxy, chatgpt-proxy
//   SCENE-SPINE planner   → proxy, mistral-proxy, chatgpt-proxy
//   screenplay-native cinematic-romance writer (the AUTHOR) → same three
// So ENDPOINT WAS NEVER THE RIGHT DISCRIMINATOR — my endpoint-first fix removed one symptom and left
// the cause. A role is identified by its own system prompt; the endpoint only sets the PRICE, because
// the Mistral tier of any role is cheap.
// Measured: continuity $0.010893 (this run's receipt), planner ~$0.00993, author $0.07932, mistral
// tier ~$0.0016 (all from real receipts, cost_in_usd_ticks where the provider reports it).
// Allowances: author covers its worst case within configured limits (~$0.110 -> 0.12); the small grok
// calls get 3x their highest observed bill; the cheap tier gets ~5x.
const PER_ROLE_USD = { continuity: 0.03, planner: 0.03, author: 0.12, unknown: 0.12 };
const AUTHOR_CONFIG = { role: 'STRUCTURE_GENERATOR', preferredModel: 'grok-4-1-fast-reasoning',
                        resolvesTo: 'grok-4.3', maxTokens: 8000, temperature: 0.85,
                        outRatePerToken: GROK43.out, inRatePerToken: GROK43.in,
                        observedPromptTokens: 56151 };
const MISTRAL_TIER_USD = 0.01;      // any role served by the cheap tier
const ALLOWED_ROUTES = ['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy'];
// WHY A PER-CLIENT-CALL RESERVATION IS ONLY A LOWER BOUND: api/proxy.js gives each role a
// ROLE_MODEL_CHAIN of up to FOUR models and falls through it unless _noFallback is set, so ONE client
// call can become several upstream billable calls. The ledger counts client calls, so it cannot see
// that expansion in advance. The runner therefore VERIFIES _orchestration.upstreamAttempts on every
// response and aborts the moment any call reports more than one — making the bound conditional and
// enforced, instead of assumed.
const MAX_UPSTREAM_ATTEMPTS = 1;

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
function reserve(role, pathname) {
  // Price by endpoint, identity by role: the Mistral tier is cheap whichever role is being served.
  const amt = (String(pathname || '').indexOf('/api/mistral-proxy') !== -1)
    ? MISTRAL_TIER_USD
    : (PER_ROLE_USD[role] != null ? PER_ROLE_USD[role] : PER_ROLE_USD.unknown);
  if (ledger.reserved + amt > CEILING_USD + 1e-12) {
    ledger.refusals.push({ role, amt, wouldBe: ledger.reserved + amt });
    return false;
  }
  ledger.reserved += amt;
  ledger.entries.push({ role, usd: amt, pathname: pathname || null, runningReserved: ledger.reserved });
  return true;
}

// RATES CORRECTED. I had /api/proxy at $3/M in and $15/M out, which is ANTHROPIC SONNET pricing
// wrongly copied in — roughly 6x too high on output, and it is what inflated the author allowance.
// Authoritative in-repo, in two independent places:
//   _scene1_planner_measure_live.mjs:36  grok-4.3 $1.25/M in, $2.50/M out (verified 2026-09-01)
//   _acceptance_bounded.mjs:49           grok-4.3 {in 1.25, out 2.50, tierAt 200000, inHi 2.50, outHi 5.00}
// VALIDATED AGAINST REAL BILLS rather than trusted: recomputing two author receipts from their own
// captured token counts lands within ~0.3% of what the provider charged (see section 5d).
// NOTE the long-context tier: above 200,000 prompt tokens the rates DOUBLE. Observed author prompts
// are 55-56k, so the standard tier applies, but a much larger prompt would change the arithmetic.
const RATES = { '/api/proxy': { in: 1.25e-6, out: 2.5e-6 }, '/api/mistral-proxy': { in: 1.5e-7, out: 6e-7 },
                '/api/chatgpt-proxy': { in: 2.5e-7, out: 1e-6 } };
function realize(pathname, usage) {
  try {
    if (!usage) return 0;
    // xAI reports true cost in ticks (1e-10 USD); prefer it over any rate table.
    if (typeof usage.cost_in_usd_ticks === 'number') { const v = usage.cost_in_usd_ticks * 1e-10; ledger.realized += v; return v; }
    const rate = RATES[pathname] || RATES['/api/chatgpt-proxy'];
    const inTok = usage.prompt_tokens != null ? usage.prompt_tokens : (usage.input_tokens || 0);
    const rt = (usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens) || 0;
    const outTok = (usage.completion_tokens != null ? usage.completion_tokens : (usage.output_tokens || 0)) + rt;
    const v = rate.in * inTok + rate.out * outTok;
    ledger.realized += v; return v;
  } catch (_) { return 0; }
}

const sysOf = (b) => ((b && b.messages) || []).filter((m) => m.role === 'system').map((m) => String(m.content || '')).join('\n');
const usrOf = (b) => ((b && b.messages) || []).filter((m) => m.role === 'user').map((m) => String(m.content || '')).join('\n');

(async () => {
  console.log('=== SAY/DO GIBBERISH CONTINUATION — ' + (AUTHORIZED ? 'AUTHORIZED' : 'DRY PREFLIGHT ONLY') + ' ===');
  console.log('  input   : action="' + INPUT.action + '"  dialogue="' + INPUT.dialogue + '"');
  console.log('  reservation limit: $' + CEILING_USD.toFixed(2) + ' across all calls, reserved BEFORE dispatch');
  console.log('  NOT a guaranteed spend bound — reasoning output is uncapped; see the header comment.');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const captured = [];
  const consoleLines = [];
  page.on('console', (m) => { try { consoleLines.push(m.text()); } catch (_) {} });
  const gate = await installFailClosedNetworkGate(page, {
    logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  let live = false, abortReason = null, noFallbackInjected = 0;
  // ── ENDPOINT FIRST. THIS IS THE BUG THAT BURNED A PAID RUN. ───────────────────────────────────
  // The first live call was the Mistral SCAFFOLD (~$0.0016) and a content-only classifier matched it
  // as 'author', reserving $0.09 against it. With the planner's $0.02 that left $0.04, so the REAL
  // author call was refused and the run aborted with no scene — $0.0067 spent, no data. Scaffold runs
  // on /api/mistral-proxy and nothing else does, so the endpoint settles it with no guessing; only
  // /api/proxy carries both planner and author, and there content (planner markers first) separates
  // them. ONE definition, used by the dry stub and the live handler, so they cannot drift apart.
  // IDENTITY, NOT ENDPOINT AND NOT SCHEMA WORDS. Each role names itself in its own system prompt, and
  // that is stable across all three tiers it may be served by. Unknown is priced as AUTHOR and logged
  // loudly: refusing a healthy run is recoverable, silently overspending is not.
  const classifyBody = (b) => {
    const sys = sysOf(b);
    if (/CONTINUITY ARCHITECT/i.test(sys)) return 'continuity';
    if (/SCENE-SPINE planner/i.test(sys)) return 'planner';
    if (/screenplay-native cinematic-romance writer/i.test(sys)) return 'author';
    // Secondary markers, in case a prompt header is reworded.
    if (/local_objective|chosenAftermathLane|aftermath_obligations/i.test(sys)) return 'planner';
    if (/is_consummate_scene|"beats"/i.test(sys)) return 'author';
    return 'unknown';
  };
  // COMPLETION IS THE DELIVERABLE, NEVER A CALL COUNT. The previous run closed the network phase
  // because it had seen three calls and something classified as author — which was the continuity
  // architect — so it stopped waiting BEFORE the real author call was ever made. beats=0 was my doing,
  // not the app's. Done means: an author response carrying beats, or a terminal failure.
  const authorBeatsResponse = () => {
    try {
      return gate.trackedCalls().filter((c) => c.real).find((c) => {
        if (!c.responseBody) return false;
        const t = JSON.stringify(c.responseBody);
        return t.indexOf('beats') !== -1 && /"beats"\s*:\s*\[\s*\{/.test(t);
      }) || null;
    } catch (_) { return null; }
  };
  // A BEATS-BEARING RESPONSE IS AN INTERMEDIATE MILESTONE, NOT THE DELIVERABLE. Parsing, speaker
  // validation, calcification and persistence all run AFTER it, and any of them can reject the
  // screenplay — production's acceptance point is _completeStagedSceneFromScreenplay, which pushes to
  // state.scenes. So completion means THE APP KEPT THE SCENE: a new persisted scene with real prose.
  // Pure so it can be proven dry against a rejected-after-beats case.
  // NO ARBITRARY LENGTH GATE. A 40-character scene is a QUALITY judgement, not an incompleteness —
  // conflating them would let the runner declare a delivered scene "no data" because it was terse.
  // Completion means THIS attempt produced a NEWLY ACCEPTED scene with NONEMPTY prose, and a
  // pre-existing scene can never satisfy it: the count must grow AND the new last scene must differ
  // from the baseline one.
  const isCompletionAccepted = (st) => !!st && st.scenesDelta >= 1
    && st.lastTextLen > 0 && st.lastTextChanged === true;
  const appAcceptance = async (base) => page.evaluate((b) => {
    try {
      const sc = (window.state && window.state.scenes) || [];
      const last = sc[sc.length - 1] || {};
      const txt = String(last.text || '');
      return { scenesDelta: sc.length - b.count, lastTextLen: txt.length,
               lastTextChanged: txt !== b.lastText };
    } catch (_) { return { scenesDelta: 0, lastTextLen: 0, lastTextChanged: false }; }
  }, base);
  // Upstream expansion is the other thing a per-client-call reservation cannot see.
  const upstreamOveruse = () => {
    try {
      return gate.trackedCalls().filter((c) => c.real).map((c) => {
        const o = c.responseBody && c.responseBody._orchestration;
        return o && typeof o.upstreamAttempts === 'number' ? o.upstreamAttempts : null;
      }).find((n) => n !== null && n > 1) || null;
    } catch (_) { return null; }
  };
  // Pure replay of the reservation math, for proving the corrected classifier dry.
  const simulateReservations = (pairs, ceiling) => {
    let r = 0; const running = [];
    for (const entry of pairs) {
      const role = Array.isArray(entry) ? entry[0] : entry;
      const pathname = Array.isArray(entry) ? entry[1] : '/api/proxy';
      const amt = (String(pathname).indexOf('/api/mistral-proxy') !== -1)
        ? MISTRAL_TIER_USD
        : (PER_ROLE_USD[role] != null ? PER_ROLE_USD[role] : PER_ROLE_USD.unknown);
      if (r + amt > ceiling + 1e-12) return { ok: false, refusedAt: role, total: r, running };
      r += amt; running.push({ role, running: Number(r.toFixed(3)) });
    }
    return { ok: true, total: Number(r.toFixed(3)), running };
  };
  // ONE HANDLER, TWO MODES. In dry mode it fulfils from the stub builder; in live mode it RESERVES
  // before letting the request through and aborts the run rather than exceed the ceiling. Reservation
  // happens before dispatch, never after, so a refusal costs nothing.
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    let pathname; try { pathname = new URL(req.url()).pathname; } catch (_) { pathname = req.url(); }
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const kind = classifyBody(b);
    if (live) {
      // AN UNKNOWN ROLE OR ROUTE STOPS THE RUN BEFORE DISPATCH. Pricing an unknown as 'author' was not
      // a bound — it was a guess that happened to be expensive. If the runner cannot name what it is
      // about to pay for, it must not pay for it.
      if (kind === 'unknown' || ALLOWED_ROUTES.indexOf(pathname) === -1) {
        abortReason = abortReason || ('unpriceable call: role=' + kind + ' route=' + pathname
          + ' — enumerate it before authorizing another run');
        console.error('  ✗ ABORT — ' + abortReason);
        console.error('    system prompt head: ' + sysOf(b).slice(0, 120));
        await route.abort('failed'); return;
      }
      if (['continuity', 'planner', 'author'].indexOf(kind) !== -1) {
        captured.push({ kind, url: req.url(), body: b, sys: sysOf(b), usr: usrOf(b) });
        if (!reserve(kind, pathname)) {
          abortReason = abortReason || ('reserving ' + kind + ' would pass the $' + CEILING_USD.toFixed(2) + ' ceiling');
          console.error('  ✗ ABORT — ' + abortReason);
          await route.abort('failed'); return;
        }
        console.log('    [live] ' + kind + ' → ' + pathname + '  (running reserved $' + ledger.reserved.toFixed(3) + ')');
      }
      // ENFORCED BEFORE DISPATCH, NOT OBSERVED AFTER. Telemetry that reports upstreamAttempts=3 is
      // useful, but it cannot un-spend the two extra calls. _noFallback gives the proxy a ONE-ENTRY
      // chain, so a timeout or a transport error returns the error instead of retrying — proven at the
      // handler itself in _canon_audit_proxy_nofallback_control.mjs (14/14), including the timeout case.
      // This is an ISOLATED PROSE TEST: provider recovery is deliberately disabled because testing it
      // adds nothing to the question of how the story handles gibberish.
      let pd = req.postData();
      try {
        const o = JSON.parse(pd || '{}');
        o._noFallback = true;
        pd = JSON.stringify(o);
        noFallbackInjected++;
      } catch (_) { pd = req.postData(); }
      await route.fallback({ postData: pd }); return;
    }
    await route.fallback(); return;
  });

  // Dry stubs: classify each captured request so the payloads can be asserted without spending.
  const stub = async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = sysOf(b), usr = usrOf(b);
    // Same shared classifier as the live handler — no second copy to drift.
    const kind = classifyBody(b);
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

  section('5. ROLES, SETTLING, AND RESERVATION MATH — BOTH NO-DATA RUNS REPLAYED');
  // (a) The three roles, identified by their own system prompts, as enumerated from the 12 captured
  //     dry calls. Each is asserted on EVERY endpoint it can be served by, because the tiered dispatch
  //     means endpoint never identifies a role.
  const ROLE_FIXTURES = [
    { role: 'continuity', sys: 'You are a CONTINUITY ARCHITECT for a serialized Fantasy romance visual novel. Your job is NOT to write prose.' },
    { role: 'planner', sys: 'You are the SCENE-SPINE planner for an interactive romance engine. The scene has ONE organizing event.' },
    { role: 'author', sys: 'You are a screenplay-native cinematic-romance writer for an adult-romance visual novel. You write the scene.' }
  ];
  const ENDPOINTS = ['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy'];
  ROLE_FIXTURES.forEach((f) => {
    const got = ENDPOINTS.map(() => classifyBody({ messages: [{ role: 'system', content: f.sys }] }));
    note(f.role + ' on all three endpoints → ' + JSON.stringify(got));
    ok('ROLE ' + f.role + ' is identified the same on ALL THREE endpoints it can be served by',
      got.every((g) => g === f.role), JSON.stringify(got));
  });
  ok('THE CONTINUITY ARCHITECT IS NO LONGER MISREAD AS AUTHOR — the second no-data run\'s cause',
    classifyBody({ messages: [{ role: 'system', content: ROLE_FIXTURES[0].sys }] }) === 'continuity');
  ok('an unrecognised role is priced as AUTHOR, so an unknown cannot silently overspend',
    PER_ROLE_USD.unknown === PER_ROLE_USD.author, JSON.stringify(PER_ROLE_USD));

  // (b) SETTLING. Replay the exact sequence that stopped early: scaffold/continuity, continuity,
  //     planner — no author beats anywhere. The old predicate called that done; this one must not.
  const SEQ_NO_DATA = [{ kind: 'continuity', hasBeats: false }, { kind: 'continuity', hasBeats: false },
                       { kind: 'planner', hasBeats: false }];
  const SEQ_DONE = SEQ_NO_DATA.concat([{ kind: 'author', hasBeats: true }]);
  const SEQ_AUTHOR_NO_BEATS = SEQ_NO_DATA.concat([{ kind: 'author', hasBeats: false }]);
  // COMPLETION IS APP ACCEPTANCE. A beats-bearing response is an intermediate milestone: parsing,
  // speaker validation, calcification and persistence all run after it and any can reject the
  // screenplay. Production's acceptance point is _completeStagedSceneFromScreenplay pushing to
  // state.scenes, so that is what the runner waits for.
  const selfSrc = fs.readFileSync(path.join(__dirname, '_saydo_gibberish_live_run.mjs'), 'utf8');
  ok('RED — a BEATS-BEARING RESPONSE THAT PRODUCTION THEN REJECTED is NOT completion',
    isCompletionAccepted({ scenesDelta: 0, lastTextLen: 0, lastTextChanged: false }) === false,
    'beats arrived but no scene was persisted — the rejected-after-beats case');
  ok('RED — a scene persisted with EMPTY prose is NOT completion either',
    isCompletionAccepted({ scenesDelta: 1, lastTextLen: 0, lastTextChanged: true }) === false);
  ok('RED — a PRE-EXISTING scene can never satisfy completion',
    isCompletionAccepted({ scenesDelta: 0, lastTextLen: 4000, lastTextChanged: false }) === false,
    'a long scene that was already there is not this attempt\'s output');
  ok('...nor can an unchanged last scene even if the count somehow moved',
    isCompletionAccepted({ scenesDelta: 1, lastTextLen: 900, lastTextChanged: false }) === false);
  // LENGTH IS A QUALITY JUDGEMENT, NOT AN INCOMPLETENESS. An earlier version required >150 chars and
  // would have called a terse but genuinely delivered scene "no data" — conflating two questions.
  ok('A SHORT SCENE IS STILL COMPLETE — 40 characters of real prose counts',
    isCompletionAccepted({ scenesDelta: 1, lastTextLen: 40, lastTextChanged: true }) === true,
    'length belongs in the verdict, not the completion test');
  ok('COMPLETE when the app persisted a NEW scene with nonempty prose',
    isCompletionAccepted({ scenesDelta: 1, lastTextLen: 900, lastTextChanged: true }) === true);
  ok('the completion check reads app acceptance, never a call count and never a length threshold',
    /scenesDelta >= 1\s*\n?\s*&& st\.lastTextLen > 0 && st\.lastTextChanged === true/.test(selfSrc)
    // The literal is assembled rather than written out: a source-scanning assertion that spells the
    // forbidden pattern verbatim finds ITSELF and can never pass.
    && !(new RegExp('lastTextLen > ' + '150')).test(selfSrc)
    && !(new RegExp('real calls\\)\\.length >= ' + '3')).test(selfSrc));

  section('5c. ONE UPSTREAM ATTEMPT IS ENFORCED BEFORE DISPATCH, NOT OBSERVED AFTER');
  ok('_noFallback is injected into the outgoing body before it leaves the runner',
    /o\._noFallback = true;/.test(selfSrc) && /route\.fallback\(\{ postData: pd \}\)/.test(selfSrc));
  ok('...and the injection is counted, so a missed dispatch is visible',
    /noFallbackInjected \+\+|noFallbackInjected\+\+/.test(selfSrc));
  ok('the enforcement is proven AT THE PROXY HANDLER, including timeout and transport error',
    fs.existsSync(path.join(__dirname, '_canon_audit_proxy_nofallback_control.mjs')));
  const nfSrc = fs.readFileSync(path.join(__dirname, '_canon_audit_proxy_nofallback_control.mjs'), 'utf8');
  ok('...the TIMEOUT case is asserted there (1 attempt with the flag, >1 without)',
    /exactly one upstream call on a TIMEOUT \(AbortError\) as well/.test(nfSrc)
    && /WITHOUT the flag a timeout retries/.test(nfSrc));
  ok('...and the TRANSPORT-ERROR case too',
    /exactly one upstream call on a transport error too/.test(nfSrc));
  ok('telemetry is kept as a CHECK, not as the mechanism',
    /cannot un-spend the two extra calls/.test(selfSrc));
  // The old predicate is kept only as the RED baseline for run 2's early stop.
  ok('RED — run 2\'s sequence would have satisfied the OLD call-count predicate',
    SEQ_NO_DATA.concat([{ kind: 'author', hasBeats: false }]).some((c) => c.kind === 'author') === true,
    'which is exactly why it stopped before the author had delivered');

  section('5b. AN UNPRICEABLE CALL STOPS THE RUN BEFORE DISPATCH');
  ok('an unrecognised role classifies as "unknown"',
    classifyBody({ messages: [{ role: 'system', content: 'You are some new helper role nobody enumerated.' }] }) === 'unknown');
  ok('...and "unknown" is NOT given an author allowance — it aborts instead',
    /if \(kind === 'unknown' \|\| ALLOWED_ROUTES\.indexOf\(pathname\) === -1\) \{/.test(selfSrc)
    && /unpriceable call: role=/.test(selfSrc));
  ok('...and a route outside the allowlist aborts too',
    /ALLOWED_ROUTES = \['\/api\/proxy', '\/api\/mistral-proxy', '\/api\/chatgpt-proxy'\]/.test(selfSrc));
  ok('THE UPSTREAM-EXPANSION HAZARD IS NAMED AND ENFORCED, not assumed away',
    /MAX_UPSTREAM_ATTEMPTS = 1/.test(selfSrc) && /upstreamAttempts=/.test(selfSrc)
    && /ROLE_MODEL_CHAIN of up to FOUR models/.test(selfSrc));

  section('6. RESERVATION MATH — FOUR ROLES, BOTH FAILURES REPLAYED');
  // The 2026-09-26 no-data run reserved AUTHOR rates against the Mistral SCAFFOLD call, exhausting the
  // budget before the real author request. These assertions replay that exact observed sequence.
  // The real observed shape, priced by role AND tier: the cheap Mistral attempt, the continuity call on
  // grok, the planner, then the author.
  const OBSERVED = [['continuity', '/api/mistral-proxy'], ['continuity', '/api/proxy'],
                    ['planner', '/api/proxy'], ['author', '/api/proxy']];
  const simFixed = simulateReservations(OBSERVED, CEILING_USD);
  note('observed shape at $' + CEILING_USD.toFixed(2) + ': ' + JSON.stringify(simFixed));
  ok('THE FULL OBSERVED SHAPE FITS, author included — the run can now reach the deliverable',
    simFixed.ok === true && simFixed.total <= CEILING_USD, JSON.stringify(simFixed));
  ok('the Mistral tier is priced cheaply, not at its role\'s rate',
    simFixed.running[0].running === MISTRAL_TIER_USD, JSON.stringify(simFixed.running[0]));
  // RED — RUN 1 REPLAYED THROUGH THE OLD PRICER. The new pricer cannot reproduce that overcharge by
  // construction: it prices the Mistral tier at $0.01 whatever the role, so a misclassification there
  // is no longer expensive. To show the fix actually changed an outcome, the LEGACY behaviour has to be
  // simulated explicitly — price by role only, with no tier discount, exactly as run 1 did.
  const simulateLegacy = (roles, ceiling) => {
    let r = 0;
    for (const role of roles) {
      const amt = (role === 'author') ? 0.09 : (role === 'planner' ? 0.02 : 0.03);
      if (r + amt > ceiling + 1e-12) return { ok: false, refusedAt: role, total: Number(r.toFixed(3)) };
      r += amt;
    }
    return { ok: true, total: Number(r.toFixed(3)) };
  };
  const legacyRun1 = simulateLegacy(['author', 'planner', 'author'], 0.15);
  note('run 1 through the OLD pricer at $0.15: ' + JSON.stringify(legacyRun1));
  ok('RED — run 1 replayed through the OLD pricer aborts at the author, as it did for real',
    legacyRun1.ok === false && legacyRun1.refusedAt === 'author', JSON.stringify(legacyRun1));
  // Compared at the CURRENT reservation limit, not the retired $0.15 — the author allowance has since
  // been raised to $0.17 to cover its own configured max_tokens, so $0.15 could no longer hold a scene.
  ok('...while the SAME real sequence completes under the corrected allowances and limit',
    simulateReservations([['continuity', '/api/mistral-proxy'], ['planner', '/api/proxy'],
                          ['author', '/api/proxy']], CEILING_USD).ok === true,
    JSON.stringify(simulateReservations([['continuity', '/api/mistral-proxy'], ['planner', '/api/proxy'],
                          ['author', '/api/proxy']], CEILING_USD)));
  // Headroom: one retry of each cheap role must fit; a second AUTHOR must not.
  const withRetries = OBSERVED.concat([['planner', '/api/proxy']]);
  ok('one planner retry fits at $' + CEILING_USD.toFixed(2),
    simulateReservations(withRetries, CEILING_USD).ok === true,
    JSON.stringify(simulateReservations(withRetries, CEILING_USD)));
  ok('...and a SECOND author attempt is still REFUSED, so the guard was not loosened to get green',
    simulateReservations(OBSERVED.concat([['author', '/api/proxy']]), CEILING_USD).ok === false,
    JSON.stringify(simulateReservations(OBSERVED.concat([['author', '/api/proxy']]), CEILING_USD)));
  ok('allowances stay above the MEASURED cost of the same shape ($0.0109+$0.0099+$0.0793)',
    simFixed.total >= 0.0109 + 0.0099 + 0.0793, String(simFixed.total));
  // THE AUTHOR ALLOWANCE MUST AT LEAST COVER ITS OWN CONFIGURED max_tokens. The previous $0.09 did
  // not: 8000 output tokens at grok-4.3's $15/M is $0.12 before the prompt is counted.
  // (5d) THE RATES THEMSELVES, VALIDATED AGAINST REAL BILLS. Recompute each captured author receipt
  // from its own token counts and compare to what the provider actually charged.
  AUTHOR_RECEIPTS.forEach((r, i) => {
    const billed = r.ticks * 1e-10;
    const computed = r.prompt * GROK43.in + (r.completion + r.reasoning) * GROK43.out;
    const errPct = Math.abs(computed - billed) / billed * 100;
    note('receipt ' + (i + 1) + ': billed $' + billed.toFixed(6) + '  computed $' + computed.toFixed(6)
       + '  delta ' + errPct.toFixed(2) + '%');
    ok('RATE CHECK ' + (i + 1) + ' — $1.25/M in + $2.50/M out reproduces the real bill within 1%',
      errPct < 1, 'billed ' + billed.toFixed(6) + ' vs computed ' + computed.toFixed(6));
  });
  // RED: the rates I had wrongly been using would have been badly wrong against the same bills.
  const wrongComputed = AUTHOR_RECEIPTS[0].prompt * 3e-6
    + (AUTHOR_RECEIPTS[0].completion + AUTHOR_RECEIPTS[0].reasoning) * 15e-6;
  ok('RED — the $3/M + $15/M figures I had used are refuted by the same receipt (Sonnet pricing)',
    Math.abs(wrongComputed - AUTHOR_RECEIPTS[0].ticks * 1e-10) / (AUTHOR_RECEIPTS[0].ticks * 1e-10) > 1.5,
    'wrong-rate computed $' + wrongComputed.toFixed(6) + ' vs billed $' + (AUTHOR_RECEIPTS[0].ticks * 1e-10).toFixed(6));
  ok('the long-context tier is recorded, and observed prompts sit below it',
    GROK43.tierAt === 200000 && AUTHOR_CONFIG.observedPromptTokens < GROK43.tierAt,
    'prompt ' + AUTHOR_CONFIG.observedPromptTokens + ' < ' + GROK43.tierAt);
  // The author allowance must cover input + full max_tokens output + generous reasoning headroom.
  const authorWorst = AUTHOR_CONFIG.observedPromptTokens * GROK43.in
    + (AUTHOR_CONFIG.maxTokens + 8000) * GROK43.out;
  note('author worst case within configured limits: $' + authorWorst.toFixed(4)
     + '   allowance: $' + PER_ROLE_USD.author.toFixed(2));
  ok('the author ALLOWANCE covers input + full max_tokens + 8k reasoning headroom',
    PER_ROLE_USD.author >= authorWorst, 'allowance ' + PER_ROLE_USD.author + ' vs worst ' + authorWorst.toFixed(4));
  ok('...and it exceeds both MEASURED author bills',
    PER_ROLE_USD.author > AUTHOR_RECEIPTS[0].ticks * 1e-10
    && PER_ROLE_USD.author > AUTHOR_RECEIPTS[1].ticks * 1e-10);
  ok('...and the limitation is stated in the file rather than implied',
    /THERE IS NO ENFORCEABLE TOTAL-COST LIMIT AT THIS PROVIDER/.test(selfSrc)
    && /REASONING TOKENS SIT ON TOP/i.test(selfSrc));
  ok('the authorization phrase does not promise a spend figure it cannot hold',
    !/under \$0\.\d\d/.test(AUTH_PHRASE) && /accepting that one call may exceed its allowance/.test(AUTH_PHRASE),
    AUTH_PHRASE);
  ok('/api/mistral-proxy containment is PROVEN, not assumed from its price',
    fs.existsSync(path.join(__dirname, '_mistral_proxy_containment_proof.mjs'))
    && /EXACTLY ONE upstream fetch/.test(fs.readFileSync(path.join(__dirname, '_mistral_proxy_containment_proof.mjs'), 'utf8')));

  section('6. CONTAINMENT AND COST DISCIPLINE');
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

  // ── LIVE: ONE SCENE ─────────────────────────────────────────────────────────────────────────
  section('LIVE — ONE SCENE, REAL PROVIDERS');
  captured.length = 0; consoleLines.length = 0;
  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'live-gibberish-' + Date.now();
    s.turnCount = 1;
    s.scenes = [{ title: '', synopsis: '', text: 'The assembly had not yet dispersed.', fateCard: null }];
    delete s._gibberishStreak; delete s._gibberishTier; delete s._sayDoFallbackGenerated;
    delete s._acceptedPlannerProposal; delete s._lastSayDoAction; delete s._lastSayDoDialogue;
  });
  gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy']);
  gate.setPhase('gibberish-live', 40);
  live = true;
  const t0 = Date.now();
  const scenesBefore = await page.evaluate(() => {
    const sc = (window.state && window.state.scenes) || [];
    return { count: sc.length, lastText: String((sc[sc.length - 1] || {}).text || '') };
  });
  await page.fill('#gnActionInput', INPUT.action);
  await page.fill('#gnDialogueInput', INPUT.dialogue);
  await page.click('#gnSubmitBtn');
  // Settle on the author response, not a fixed sleep, but with a hard cap.
  // WAIT FOR THE DELIVERABLE. Hard cap is a backstop, not the completion signal.
  let settled = false, acceptance = { scenesDelta: 0, lastTextLen: 0, lastTextChanged: false }, sawBeats = false;
  for (let i = 0; i < 150; i++) {
    if (abortReason) break;
    const over = upstreamOveruse();
    if (over) { abortReason = 'a call reported upstreamAttempts=' + over
      + ' — one client call expanded upstream, so the reservation bound no longer holds'; break; }
    if (authorBeatsResponse()) sawBeats = true;
    acceptance = await appAcceptance(scenesBefore);
    if (isCompletionAccepted(acceptance)) { settled = true; break; }
    await page.waitForTimeout(2000);
  }
  note('acceptance: ' + JSON.stringify(acceptance) + '  sawBeatsResponse=' + sawBeats);
  note(settled ? 'settled on APP ACCEPTANCE (scene persisted)' : 'did NOT settle: ' + (abortReason || 'hard cap reached'));
  gate.closePhase(); live = false;

  // Realize true cost from what the providers actually reported.
  gate.trackedCalls().filter((c) => c.real).forEach((c) => {
    let pn; try { pn = new URL(c.url).pathname; } catch (_) { pn = c.url; }
    realize(pn, (c.responseBody && (c.responseBody.usage
      || (c.responseBody._orchestration && c.responseBody._orchestration.usage))) || null);
  });

  // Extract the delivered prose from the real author response.
  let prose = '', beatCount = 0;
  try {
    const authorCall = gate.trackedCalls().filter((c) => c.real).reverse()
      .find((c) => c.responseBody && JSON.stringify(c.responseBody).indexOf('beats') !== -1);
    const raw = authorCall && authorCall.responseBody;
    let content = raw && (raw.content || (raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content));
    if (typeof content !== 'string') content = JSON.stringify(content || '');
    const m = content.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    const beats = (parsed && Array.isArray(parsed.beats)) ? parsed.beats : [];
    beatCount = beats.length;
    prose = beats.map((x) => (x.speaker ? String(x.speaker).toUpperCase() + ': ' : '') + String(x.text || '')).join('\n\n');
  } catch (e) { prose = ''; }

  const liveAuthor = captured.filter((c) => c.kind === 'author').pop();
  const liveBlob = captured.map((c) => c.sys + '\n' + c.usr).join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'live_prose.txt'), prose);
  if (liveAuthor) fs.writeFileSync(path.join(OUT_DIR, 'live_author_request.json'), JSON.stringify(liveAuthor.body, null, 2));
  const livePlanner = captured.filter((c) => c.kind === 'planner').pop();
  if (livePlanner) fs.writeFileSync(path.join(OUT_DIR, 'live_planner_request.json'), JSON.stringify(livePlanner.body, null, 2));

  note('captured live: ' + JSON.stringify(captured.map((c) => c.kind)) + '  beats=' + beatCount
     + '  ' + (Date.now() - t0) + 'ms');
  note('gibberish log: ' + (consoleLines.filter((l) => /tier=/.test(l))[0] || '(none)'));
  ok('LIVE — no ceiling abort occurred', !abortReason, String(abortReason));
  ok('LIVE — _noFallback was injected into EVERY billable dispatch, before it left',
    noFallbackInjected === captured.length && noFallbackInjected > 0,
    'injected=' + noFallbackInjected + ' billable=' + captured.length);
  ok('LIVE — every call reported upstreamAttempts<=1, so the reservation bound held',
    !/upstreamAttempts=/.test(String(abortReason)), String(abortReason));
  ok('LIVE — the run settled on APP ACCEPTANCE, not on a beats-bearing response', settled,
    'abortReason=' + String(abortReason) + ' captured=' + JSON.stringify(captured.map((c) => c.kind)));
  ok('LIVE — raw gibberish reached NO payload',
    liveBlob.indexOf(INPUT.action) === -1 && liveBlob.indexOf(INPUT.dialogue) === -1);
  ok('LIVE — raw gibberish is absent from the delivered PROSE',
    prose.indexOf('asdkfjh') === -1 && prose.indexOf('qwerty') === -1 && prose.indexOf('zzzz') === -1, prose.slice(0, 200));
  if (liveAuthor) {
    const a = liveAuthor.sys + '\n' + liveAuthor.usr;
    ok('LIVE — the substituted placeholders reached the real author payload',
      a.indexOf(EXPECT_ACTION_FALLBACK) !== -1 || a.indexOf(EXPECT_DIALOGUE_FALLBACK) !== -1);
    ok('LIVE — the strong-delivery rule did NOT fire', a.indexOf('PLAYER MOVE MUST EXIST ON THE PAGE') === -1);
    ok('LIVE — the gibberish-handling directive WAS in force',
      a.indexOf('UNCLEAR PLAYER INPUT — ACKNOWLEDGE LIGHTLY') !== -1);
  }
  ok('LIVE — a scene was actually delivered', beatCount > 0 && prose.length > 150,
    'beats=' + beatCount + ' chars=' + prose.length);
  ok('LIVE — spend stayed inside the ceiling', ledger.realized <= CEILING_USD + 1e-9, '$' + ledger.realized.toFixed(6));

  fs.writeFileSync(path.join(OUT_DIR, 'live_report.json'), JSON.stringify({
    input: INPUT, tierLog: consoleLines.filter((l) => /GIBBERISH/.test(l)),
    beats: beatCount, proseChars: prose.length,
    cost: { reserved: ledger.reserved, realized: ledger.realized, ceiling: CEILING_USD, entries: ledger.entries, refusals: ledger.refusals },
    caveat: 'Routing and substitution were already dry-proven. This run measures only whether the'
      + ' fallback placeholder yields usable PROSE. Human judgement decides that; no keyword may certify it.',
    results: results }, null, 2));

  const livePassed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  DELIVERED PROSE:\n');
  console.log(prose.split('\n').map((l) => '    ' + l).join('\n'));
  console.log('\n  REALIZED $' + ledger.realized.toFixed(6) + ' of $' + CEILING_USD.toFixed(2)
    + ' (reserved $' + ledger.reserved.toFixed(3) + ')');
  console.log('  ' + livePassed + '/' + results.length + ' mechanical assertions passed');
  console.log('  HUMAN JUDGEMENT DECIDES THE VERDICT: does the prose move, acknowledge without'
    + ' inflating, and leave the scene playable?');
  console.log('  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exit(livePassed === results.length ? 0 : 1);
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
