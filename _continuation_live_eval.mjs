// LIVE OPT-IN CONTINUATION EVALUATION — THREE CASES, ONE SCENE EACH.
//
// REQUIRES --authorize <usd>. Nothing dispatches without it.
//
// THE QUESTION IS PLANNER JUDGEMENT, not whether the pipeline works (that is proven provider-free:
// envelope 42/42, harvest 68/68, flag gate 34/34, pending boundary 35/35).
//
// Same story, same scaffold, same scene position — ONLY the reader's posture differs:
//   CASE A  "I say nothing..."        a quiet aftermath; a durable change is NOT warranted
//   CASE B  "I burn the archive..."   a destructive act with the opposition left UNNAMED, so
//                                     scene_local is the correct answer (measured, run 4)
//   CASE C  "I send sealed word..."   a petition to a governing commission with an expectation
//                                     spanning later scenes, so a CONTINUING body is required
//
// PRE-REGISTERED EXPECTATIONS (stated before any dispatch, per feedback_pre_register_verdict):
//   A: envelope present · canon_change null · introduces [] · outcome none · zero facts
//   B: scene_local + null, OR durable + an identified referent — consistency, not canon output
//   C: durable · a structured institution/collective · future_relevance + aliases · no planner ids
//      · no established entity silently redefined
// A planner that proposes a change for A, or declines one for B, is a REPORTABLE FINDING either
// way — the point is to measure judgement, not to confirm a hope.
//
// Usage:
//   node _continuation_live_eval.mjs --estimate-only
//   node _continuation_live_eval.mjs --authorize 1.00
import fs from 'fs';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';
import { gradeDurable, gradeHandler, classifySample } from './_continuation_durable_grader.mjs';

const ARG = process.argv.slice(2);
const ESTIMATE_ONLY = ARG.includes('--estimate-only');
const AUTH_IDX = ARG.indexOf('--authorize');
const AUTHORIZED = AUTH_IDX >= 0 ? Number(ARG[AUTH_IDX + 1]) : null;
if (!ESTIMATE_ONLY && !(AUTHORIZED > 0)) {
  console.error('REFUSED: this run dispatches real provider calls.');
  console.error('  node _continuation_live_eval.mjs --estimate-only');
  console.error('  node _continuation_live_eval.mjs --authorize <usd>');
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN = '_continuation_live_eval_out/run_' + stamp;
fs.mkdirSync(RUN, { recursive: true });
const write = (n, s) => fs.writeFileSync(RUN + '/' + n, typeof s === 'string' ? s : JSON.stringify(s, null, 2));
const say = (s) => { console.log(s); fs.appendFileSync(RUN + '/log.txt', s + '\n'); };

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; say('  ok   ' + n); }
  else { fail++; say('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const ALL_CASES = [
  { id: 'A-null', label: 'QUIET AFTERMATH (expect canon_change: null)',
    action: 'I say nothing and let it stand.',
    dialogue: 'Nothing. I will not give them a word.' },
  { id: 'B-pressure', label: 'DESTRUCTIVE ACT (expect a justified new pressure, or an explicit null)',
    action: 'I burn the toll-house and ride for the river.',
    dialogue: 'Let whoever governs this place come and find me.' },
  // CASE C (Roman, 2026-10-01): the posture that REQUIRES a continuing body. Run 4 showed B cannot
  // produce a `durable` answer by construction — its dialogue has the PLAYER decline to name the
  // opposition, so scene_local was correct there. This action does the opposite: it addresses a
  // governing commission directly and states an expectation that spans later scenes, so there IS
  // a continuing referent and leaving it unnamed would be the wrong answer.
  { id: 'C-durable', label: 'PETITION A GOVERNING BODY (expect pressure_scope: durable)',
    action: 'I send sealed word to the commission that governs the toll road, demanding they open '
      + 'an investigation into the burning and summon everyone who profited from it.',
    dialogue: 'They will convene over this, and I will still be answering their questions a season from now.' }
];
// --case <id> runs one case. Both run by default. Selection matters because a full chain's
// worst-case reservation is larger than a planner-only one, and the ceiling decides what fits.
const CASE_IDX = ARG.indexOf('--case');
const WANTED = CASE_IDX >= 0 ? String(ARG[CASE_IDX + 1]) : null;
const PLANNER_ONLY = ARG.includes('--planner-only');
const CASES = WANTED ? ALL_CASES.filter(c => c.id === WANTED) : ALL_CASES;
if (WANTED && !CASES.length) { console.error('unknown --case ' + WANTED); process.exit(2); }

// ── RELIABILITY SAMPLING (Roman 2026-10-01) ─────────────────────────────────────────────────
// "This is now a measurement question, not another contract edit." N identical planner-only
// attempts at ONE case, classified into four buckets. Deliberately built INTO this runner rather
// than as a parallel script, so the prompt, story, posture and model path are byte-identical to
// the single-case runs 5-7 by construction instead of by resemblance.
// Parsed BEFORE the --samples validation so that combining the two modes reports the real reason
// (two different experiments) rather than a downstream complaint about --planner-only.
const SEAL_GATED = ARG.includes('--seal-gated');
const MAX_DRAWS = 3;
const SAMPLES_IDX = ARG.indexOf('--samples');
const SAMPLES = SAMPLES_IDX >= 0 ? Number(ARG[SAMPLES_IDX + 1]) : 0;
if (SEAL_GATED && SAMPLES_IDX >= 0) {
  console.error('REFUSED: --seal-gated and --samples are different experiments and cannot be combined.');
  console.error('  --samples measures the path-rate DISTRIBUTION (one draw per sample, no retries).');
  console.error('  --seal-gated tests the BOUNDARY (up to ' + MAX_DRAWS + ' draws, author gated on a seal).');
  process.exit(2);
}
if (SAMPLES_IDX >= 0 && !(SAMPLES >= 1 && SAMPLES <= 20)) {
  console.error('--samples takes an integer 1-20'); process.exit(2);
}
if (SAMPLES && !PLANNER_ONLY) {
  console.error('REFUSED: sampling requires --planner-only (no author or verifier dispatch).');
  process.exit(2);
}
if (SAMPLES && !WANTED) {
  console.error('REFUSED: sampling needs exactly one --case; a distribution across cases is not one.');
  process.exit(2);
}

// ── SEAL-GATED BOUNDARY MODE (Roman 2026-10-01) ─────────────────────────────────────────────
// Run 11 paid $0.0745 for an author call on a draw that never sealed, so the six boundary checks
// could not execute. The planner costs ~$0.0035 and the author ~$0.075 — twenty times more — so
// the author is dispatched ONLY after a valid durable seal exists.
//
// STRICTLY SEPARATE FROM THE PATH-RATE EXPERIMENT. --samples measured the distribution under
// "exactly one planner call, no retries", and that measurement is finished (durable 7/9). This
// mode has a different purpose and says so: up to three draws, every draw and its outcome logged,
// and the path outcomes still reported so nothing is hidden. The two modes are mutually exclusive.
if (SEAL_GATED && PLANNER_ONLY) {
  console.error('REFUSED: --seal-gated exists to reach the AUTHOR; --planner-only would defeat it.');
  process.exit(2);
}
if (SEAL_GATED && !WANTED) {
  console.error('REFUSED: --seal-gated needs exactly one --case.');
  process.exit(2);
}

// ── TWO-SCENE ACTIVATION / IDEMPOTENCY MODE (Roman 2026-10-01) ──────────────────────────────
// Scene 1 seals and renders both proposal kinds; scene 2 OPENS by adjudicating scene 1's pending
// proposals through the real _commitScene, which is where activation and idempotency actually
// happen. Implies --seal-gated for scene 1: paying for an author on a draw that never sealed would
// leave scene 2 with nothing to adjudicate.
const TWO_SCENE = ARG.includes('--two-scene');
// ── VERIFIER-ONLY (Roman 2026-10-01): "keep verifier judgment as the only live provider step".
// The planner, the author and the character-memory extractor are all PROVEN by the free chain
// control, so replaying them from run 13's recorded artefacts isolates the ONE remaining unknown —
// whether the live verifier correctly adjudicates real rendered prose — and collapses the cost from
// two full scenes to a single verifier call.
const LIVE_VERIFIER_ONLY = ARG.includes('--live-verifier-only');
// ── NARROW CONTINUATION (Roman 2026-10-02) ──────────────────────────────────────────────────
// Run 16's continuation was judged PARTIAL — a LEGITIMATE verdict. The verifier cited the clerk
// acknowledging the demand and judged the broader claim ("the commission has received a formal
// demand to open an investigation") only begun. So the activation test needs a continuation fact
// whose SCOPE the prose can fully satisfy, per Roman: "the clerk acknowledges receipt of the
// demand" rather than the broader institutional claim.
//
// This narrows ONE FIELD of run 13's recorded planner reply — canon_change.content — and leaves
// the rest, including the institution and its aliases, exactly as the real planner produced them.
// It is a LABELLED FIXTURE MODIFICATION, reported in the run output, not a pretence that a planner
// said this. A PARTIAL verdict on it remains a legitimate outcome and is never forced to DELIVERED.
const NARROW_CONTINUATION = ARG.includes('--narrow-continuation');
// ALIGNED to what the captured prose actually stages (Roman 2026-10-02). The previous value,
// "The commission's clerk acknowledges receipt of the sealed demand.", asserted a COMPLETED receipt
// the author never staged: the prose has the clerk BEGIN reading, and run 18's verifier said exactly
// that — reason "incomplete_rendering", precondition "The clerk clears his throat once and begins
// to read." Three runs across two scopes produced the same verdict, so the fact now claims only the
// act the prose states verbatim. Agreement of fact / purpose / pressure / anchor / completed action
// is proven in _continuation_alignment_preflight.mjs (26/26).
const NARROW_FACT = 'The Toll Road Commission\'s clerk begins reading the sealed demand aloud in the chamber.';
if (NARROW_CONTINUATION && !LIVE_VERIFIER_ONLY) {
  console.error('REFUSED: --narrow-continuation modifies the REPLAYED planner reply, so it requires'
    + ' --live-verifier-only.');
  process.exit(2);
}
if (LIVE_VERIFIER_ONLY && !TWO_SCENE) {
  console.error('REFUSED: --live-verifier-only only applies to --two-scene.');
  process.exit(2);
}
if (TWO_SCENE && SAMPLES_IDX >= 0) {
  console.error('REFUSED: --two-scene and --samples are different experiments.');
  process.exit(2);
}
if (TWO_SCENE && PLANNER_ONLY) {
  console.error('REFUSED: --two-scene must reach the author and the verifier.');
  process.exit(2);
}
if (TWO_SCENE && !WANTED) {
  console.error('REFUSED: --two-scene needs exactly one --case.');
  process.exit(2);
}

say('=== LIVE CONTINUATION EVALUATION — ' + CASES.length + ' CASE(S) ===');
say('    authorized: ' + (ESTIMATE_ONLY ? 'ESTIMATE ONLY ($0)' : '$' + AUTHORIZED.toFixed(2)));
say('    output: ' + RUN);
say('\nPRE-REGISTERED EXPECTATIONS (before any dispatch)');
say('  A-null     : envelope present, canon_change null, introduces [], outcome none, 0 facts');
say('  BOTH       : pressure_scope returned as "scene_local" or "durable", and the payload AGREES'
  + ' with it — durable identifies its referent, scene_local proposes no canon.');
// REVISED, pre-dispatch: B is no longer scored on producing canon. Its dialogue is deliberately
// the Corridor phrasing, and the contract now declares an unnamed continuing pressure a legitimate
// common answer — so scoring scene_local as a failure would score B against the very ambiguity
// this fix removed. Both branches are acceptable; consistency is what is measured.
say('  B-pressure : EITHER scene_local + null (nothing sealed, 0 facts, recorded non-durable)');
say('               OR durable + an identified referent (sealed, at most 1 fact, sealed provenance)');
say('  C-durable  : pressure_scope durable, >=1 structured introduced institution/collective with');
say('               future_relevance and aliases, NO planner-supplied ids, and no established');
say('               entity silently redefined. Graded by _continuation_durable_grader.mjs, whose');
say('               every criterion is proven RED in _continuation_durable_grading_control.mjs.');
say('  Either surprise is a reportable finding, not a failure to explain away.');

// ── chain reservation for BOTH cases, before the first request ───────────────
const worst = (chars, out) => estimateUsd({ messages: [{ content: 'x'.repeat(chars) }], max_tokens: out },
  'grok-4-1-fast-reasoning').estimate;
// FALLBACK MULTIPLIER DROPPED TO 1 on measured evidence: the two-case run dispatched exactly one
// call per stage with no tier fallback, so x2 was reserving for a contingency that did not occur.
// Still a worst-case per-stage estimate, just not a doubled one.
const R_PLANNER = worst(30000, 1400);
const R_AUTHOR = worst(240000, 8000);
// 900 OUTPUT TOKENS, tracking the raised verifier budget. This read 300 — the value max_tokens had
// before per_proposal existed — so after raising the cap to 700 the reservation would have
// under-reserved the one stage this run actually pays for. Roman asked for the reservation to be
// updated alongside the bound; this is that update.
const R_VERIFIER = worst(10000, 900);   // tracks the verifier's max_tokens, raised for the guard fields
const PER_CASE = PLANNER_ONLY ? R_PLANNER : (R_PLANNER + R_AUTHOR + R_VERIFIER);
const ATTEMPTS = SAMPLES || CASES.length;
// Seal-gated reserves the WORST CASE: every one of the three planner draws, plus one author and
// one verifier, because a sealing draw may be the last one.
// TWO SCENES, conservatively: Roman fixed this at ~$0.297300 and said to keep it unchanged until
// more author measurements exist, so it is TWO FULL SCENES at the untightened per-stage figures —
// not the seal-gated shape, and not reduced by the two author measurements now in hand.
const reserved = (TWO_SCENE && LIVE_VERIFIER_ONLY)
  ? R_VERIFIER
  : TWO_SCENE
  ? (PER_CASE * 2)
  : (SEAL_GATED ? (R_PLANNER * MAX_DRAWS + R_AUTHOR + R_VERIFIER) : PER_CASE * ATTEMPTS);
say('\nCHAIN RESERVATION (worst case per stage, no fallback doubling)');
say('  planner  : $' + R_PLANNER.toFixed(6));
if (!PLANNER_ONLY) {
  say('  author   : $' + R_AUTHOR.toFixed(6));
  say('  verifier : $' + R_VERIFIER.toFixed(6));
} else { say('  (--planner-only: author and verifier are not reserved and will be aborted)'); }
if (TWO_SCENE && LIVE_VERIFIER_ONLY) {
  if (NARROW_CONTINUATION) {
    say('  NARROW CONTINUATION: the replayed planner reply has ONE field edited —');
    say('    canon_change.content → ' + JSON.stringify(NARROW_FACT));
    say('    A LABELLED FIXTURE EDIT, so the continuation\'s scope matches what the prose stages.');
    say('    A PARTIAL verdict on it stays a legitimate outcome and is never forced to DELIVERED.');
  }
  say('  TWO-SCENE, VERIFIER-ONLY: the planner, author and memory extractor are REPLAYED from');
  say('             run 13 artefacts and the shape-faithful skeleton. The ONLY live provider call');
  say('             is the RUNTIME COMMIT VERIFIER: $' + R_VERIFIER.toFixed(6));
  say('             Everything else in the chain is already proven provider-free (23/23).');
} else if (TWO_SCENE) {
  say('  TWO-SCENE: two full scenes at $' + PER_CASE.toFixed(6) + ' each');
  say('             scene 1 seals + renders; scene 2 opens by adjudicating scene 1 via _commitScene');
  say('             author gated on a seal in scene 1 (seal-gated semantics)');
} else if (SEAL_GATED) {
  say('  SEAL-GATED: ' + MAX_DRAWS + ' planner draw(s) reserved at $' + R_PLANNER.toFixed(6)
    + ' each = $' + (R_PLANNER * MAX_DRAWS).toFixed(6));
  say('              + one author + one verifier, dispatched ONLY after a valid durable seal');
} else {
  say('  per case : $' + PER_CASE.toFixed(6) + '  x ' + ATTEMPTS
    + (SAMPLES ? ' identical sample(s) of ' + WANTED : ' case(s)'));
}
say('  TOTAL    : $' + reserved.toFixed(6));
if (!ESTIMATE_ONLY && reserved > AUTHORIZED) {
  say('\nREFUSED BEFORE DISPATCH: reserved $' + reserved.toFixed(6) + ' exceeds $' + AUTHORIZED.toFixed(2));
  process.exit(3);
}
if (ESTIMATE_ONLY) { say('\nESTIMATE ONLY — nothing dispatched. $0 spent.'); process.exit(0); }
say('  within authorization — $' + (AUTHORIZED - reserved).toFixed(6) + ' headroom');

// ── ZERO-COST PREFLIGHT GATE. Refuses to dispatch unless the test story has no authored
// objective and the continuation path is live. The first two-case run was mis-targeted at
// First Sacrifice scene 2, where an authored row owns the objective, so both cases returned the
// seed's row-2 goal and dynamic canon could not be evaluated. This gate makes that mistake
// impossible to repeat by accident.
if (!ARG.includes('--skip-preflight')) {
  const { execFileSync } = await import('node:child_process');
  say('\nPREFLIGHT GATE (provider-free, $0): _corridor_continuation_preflight.mjs');
  try {
    execFileSync(process.execPath, ['_corridor_continuation_preflight.mjs'], { stdio: 'pipe' });
    say('  preflight PASSED — the target story has no authored objective and the path is active.');
  } catch (e) {
    say('  preflight FAILED — refusing to dispatch. Run it directly to see which precondition is unmet.');
    say('  (override with --skip-preflight only if you have a deliberate reason.)');
    process.exit(5);
  }
}

let spentEstimate = 0, measured = 0;
// ── COST ACCOUNTING WITH MISSING RECEIPTS (Roman 2026-10-01) ────────────────────────────────
// ministral-8b returns no `cost_in_usd_ticks`, so the runtime commit verifier billed real money in
// runs 15 and 16 while MEASURED read $0.000000. A missing receipt is UNMEASURED, never free, and
// reporting it as $0 understates spend. Every dispatch without a receipt is recorded here with its
// estimate and its model, and the summary reports measured, unmeasured and TOTAL EXPOSURE.
const unreceipted = [];          // [{ stage, model, estimate }]
const unmeasuredTotal = () => unreceipted.reduce((n, u) => n + u.estimate, 0);
const recordCost = (stage, text, est, model) => {
  let ticks = null;
  try { const j = JSON.parse(text); ticks = j && j.usage && j.usage.cost_in_usd_ticks; } catch (_) {}
  if (typeof ticks === 'number') {
    measured += ticks * 1e-10;
    say('        measured $' + (ticks * 1e-10).toFixed(6) + ' (receipted; total measured $'
      + measured.toFixed(6) + ')');
    return;
  }
  unreceipted.push({ stage, model: model || 'unknown', estimate: est });
  say('        NO RECEIPT from ' + (model || 'unknown') + ' — UNMEASURED, estimated $'
    + est.toFixed(6) + ' (this is NOT $0; total unmeasured $' + unmeasuredTotal().toFixed(6) + ')');
};
const modelOf = (text) => {
  try { const j = JSON.parse(text);
    return (j && j._orchestration && j._orchestration.model) || (j && j.model) || null; } catch (_) { return null; }
};

const runCase = async (C, sampleIx, opts) => {
  const O = opts || {};
  const calls = [];
  // SEAL GATE. Set only in --seal-gated mode. The author is the expensive stage, so it is held
  // until the handler has actually SEALED a continuation proposal. No seal, no author call.
  let authorGateVerdict = null;
  // ONE ATTEMPT PER SAMPLE, NO RETRIES (Roman). A second planner request inside the same sample is
  // ABORTED and recorded, so an app-level retry cannot quietly turn five samples into six draws.
  let plannerDispatched = 0, retriesBlocked = 0;
  const tag = (sampleIx == null) ? C.id : (C.id + '_s' + sampleIx);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    let raw = null; try { raw = req.postData(); } catch (_) {}
    if (!/\/api\/(proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy)/.test(url)) {
      try { await route.abort(); } catch (_) {} return;
    }
    let body = null; try { body = JSON.parse(raw || '{}'); } catch (_) {}
    const sys = (body && body.messages && body.messages[0] && String(body.messages[0].content)) || '';
    const est = estimateUsd(body || { messages: [] }, (body && body.model) || 'grok-4-1-fast-reasoning').estimate;
    const stage = /SCENE-SPINE planner|SCENE planner/.test(sys) ? 'planner'
      : (/RUNTIME COMMIT verifier/.test(sys) ? 'verifier'
      : (/screenplay-native|cinematic-romance writer|FORBIDDEN INVENTIONS/.test(sys) ? 'author' : 'other'));
    if (stage === 'other') { try { await route.abort(); } catch (_) {} return; }
    if (PLANNER_ONLY && stage !== 'planner') {
      say('    [PLANNER-ONLY] aborting ' + stage + ' — not reserved in this run');
      try { await route.abort(); } catch (_) {} return;
    }
    if ((SAMPLES || O.oneAttempt) && stage === 'planner' && plannerDispatched >= 1) {
      retriesBlocked++;
      say('    [ONE-ATTEMPT] aborting a SECOND planner request in this draw — no retries');
      try { await route.abort(); } catch (_) {} return;
    }
    // ── THE GATE. Checked against LIVE state at the moment the author request appears, never
    // against the planner's own claim: a continuation-kind seal must exist in the store. A
    // rejected or scene_local reply leaves none, and the author is aborted unpaid.
    if (O.gateAuthorOnSeal && stage === 'author') {
      let sealed = null;
      try {
        sealed = await page.evaluate(() => {
          const st = (window.state && window.state._sealedProposals) || null;
          if (!st) return null;
          const rec = Object.keys(st.byId).map(k => st.byId[k])
            .filter(x => x && x.kind === 'continuation')[0] || null;
          return rec ? { id: rec.id, fact: String(rec.fact || '').slice(0, 80),
            pending: (rec.pendingEntities || []).length } : null;
        });
      } catch (_) { sealed = null; }
      if (!sealed) {
        authorGateVerdict = 'no-seal';
        say('    [SEAL-GATE] NO continuation seal — aborting the author UNPAID');
        try { await route.abort(); } catch (_) {} return;
      }
      authorGateVerdict = 'sealed';
      say('    [SEAL-GATE] continuation seal present (' + sealed.id + ', '
        + sealed.pending + ' pending entity) — releasing the author');
    }
    if (spentEstimate + est > AUTHORIZED) {
      say('    [GUARD] ABORT ' + stage + ' — would exceed authorization');
      try { await route.abort(); } catch (_) {} return;
    }
    spentEstimate += est;
    if (stage === 'planner') plannerDispatched++;
    say('    [DISPATCH] ' + stage + '  ' + (raw || '').length + 'ch  est $' + est.toFixed(6));
    write(tag + '_request_' + stage + '_' + (calls.length + 1) + '.json', raw || '');
    try {
      const FT = stage === 'author' ? 300000 : (stage === 'planner' ? 120000 : 90000);
      const resp = await route.fetch({ timeout: FT });
      const text = await resp.text();
      write(tag + '_response_' + stage + '_' + (calls.length + 1) + '.json', text);
      recordCost(stage, text, est, modelOf(text));
      calls.push({ stage, request: raw, response: text });
      await route.fulfill({ response: resp });
    } catch (e) {
      say('      dispatch error: ' + (e && e.message));
      calls.push({ stage, request: raw, response: null, error: String(e && e.message) });
      try { await route.abort(); } catch (_) {}
    }
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._processContinuationProposal === 'function', { timeout: 20000 });

  const setup = await page.evaluate((_fixedStoryId) => {
    window._continuationProposalSchema = true;            // EXPLICIT OPT-IN
    window.state = window.state || {};
    // ── A CORRIDOR / ORIGINAL STORY. No _starterId, so no seed and no plan, so NO authored row
    // owns this scene. The first two-case run targeted First Sacrifice scene 2, where an authored
    // row DOES own the objective and `_usePlanSpine` makes the plan win outright — both cases
    // returned the seed's row-2 goal and dynamic canon could not be evaluated. This also exercises
    // the universal (no-seed) path, which the register audit flagged as unverified.
    delete window.state._starterId;
    // FIXED under sampling: a varying id would mean the five "identical" prompts were not.
    window.state.storyId = _fixedStoryId || ('live-corridor-' + Date.now());
    window.state.world = 'Fatelands';
    window.state.worldSubtype = 'arcane_binding';
    window.state.picks = { flavor: 'Arcane Binding', world: 'Fatelands' };
    window.state.storyLength = 'fling';
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._activeContinuationSeal = null;
    window.state._lastContinuationResult = null;
    window.state.turnCount = 2;
    const j = window._proposeNewEntity({ kind: 'named', label: 'Julian', aliases: ['the Provast'] });
    return { enabled: window._continuationSchemaEnabled(), julianId: j.ok ? j.entity.id : null,
      ledgerBefore: Object.keys((window.state._relationshipLedger || { entities: {} }).entities),
      // FULL records, not just ids: "no existing canon silently redefined" is a field-level claim.
      ledgerBeforeFull: Object.keys((window.state._relationshipLedger || { entities: {} }).entities)
        .map(k => { const e = window.state._relationshipLedger.entities[k];
          return { id: e.id, kind: e.kind, label: e.label, aliases: e.aliases || [] }; }) };
  }, SAMPLES ? 'live-corridor-sampling-fixed' : null);
  if (!setup.enabled) { await browser.close(); throw new Error('opt-in flag not set'); }

  await page.evaluate(async ({ a, d }) => {
    try { await Promise.race([window._runCGScreenplayGen(1, a, d),
      new Promise(r => setTimeout(r, 420000))]); } catch (_) {}
  }, { a: C.action, d: C.dialogue });

  const after = await page.evaluate(() => ({
    facts: window._ensureCommittedState().facts,
    ctResult: window.state._lastContinuationResult,
    seal: window.state._activeContinuationSeal,
    sealed: window.state._sealedProposals
      ? Object.keys(window.state._sealedProposals.byId).map(k => window.state._sealedProposals.byId[k]) : [],
    // Scene-local pressures are recorded, never entities. Harvested so a scene_local verdict can
    // be checked against what the handler actually wrote, not inferred from the reply alone.
    localPressures: (window.state._sceneLocalPressures || [])
      .map(p => ({ scope: p.scope, durable: p.durable, text: p.text })),
    ledger: Object.keys((window.state._relationshipLedger || { entities: {} }).entities)
      .map(k => { const e = window.state._relationshipLedger.entities[k];
        // aliases included so the durable grader can compare established records field-by-field.
        return { id: e.id, kind: e.kind, label: e.label, aliases: e.aliases || [], prov: e.provenance }; }),
    sceneCard: window.state._sceneStateCard || null
  }));

  // IDEMPOTENCY PROBE. Replays _commitTransition against the SAME sealed id and measures whether a
  // second delivery duplicates the fact or the entity. Run ONLY when a fact already exists: if the
  // natural flow has not committed yet, a "replay" would be the FIRST commit and would prove
  // nothing about retries, so it is recorded as untestable instead of faked.
  const replay = await page.evaluate(() => {
    try {
      const cs = window._ensureCommittedState();
      const ct = (window.state._sealedProposals
        ? Object.keys(window.state._sealedProposals.byId)
            .map(k => window.state._sealedProposals.byId[k])
            .filter(x => x && x.kind === 'continuation')[0] : null) || null;
      if (!ct) return { tested: false, why: 'no continuation seal' };
      if (!cs.facts.length) return { tested: false, why: 'nothing was committed by the natural flow — nothing to retry' };
      const L = window.state._relationshipLedger || { entities: {} };
      const before = Object.keys(L.entities).length;
      window._commitTransition(ct.id, 'replay_probe', window.state.turnCount || 0);
      window._commitTransition(ct.id, 'replay_probe', window.state.turnCount || 0);
      const L2 = window.state._relationshipLedger || { entities: {} };
      return { tested: true, facts: window._ensureCommittedState().facts.length,
        activated: Object.keys(L2.entities).filter(k => L2.entities[k].provenance === 'continuation_activated').length,
        ledgerSizeBefore: before, ledgerSize: Object.keys(L2.entities).length };
    } catch (e) { return { tested: false, why: String(e && e.message) }; }
  });
  await browser.close();

  // SHAPE-AWARE EXTRACTION, one place. Providers return either a flat {content} (the proxy's own
  // shape) or the OpenAI {choices:[{message:{content}}]} shape — the last author response used the
  // latter, and an ad-hoc check that read only `.content` reported 0 prose chars for a scene that
  // had in fact rendered 17,907.
  const contentOf = (responseText) => {
    try {
      const j = JSON.parse(responseText);
      return String((j && j.content)
        || (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content)
        || '');
    } catch (_) { return ''; }
  };
  const pc = calls.filter(c => c.stage === 'planner' && c.response).pop() || null;
  const pcAny = calls.filter(c => c.stage === 'planner').pop() || null;
  let envelope = null;
  // TRANSPORT FACTS, recorded separately from the envelope so a failed transport can never be
  // attributed to the planner. Run 9's proxy returned NO_RESPONSE_FROM_FUNCTION and the classifier
  // called it an envelope violation.
  const transport = { dispatched: !!pcAny, responded: !!pc,
    error: (pcAny && pcAny.error) || null, content: '', bodySnippet: '' };
  if (pc) {
    const content = contentOf(pc.response);
    transport.content = content;
    transport.bodySnippet = String(pc.response || '').slice(0, 200);
    write(tag + '_planner_content.txt', content);
    try { const m = content.match(/\{[\s\S]*\}/); if (m) envelope = JSON.parse(m[0]); } catch (_) {}
  } else if (pcAny) {
    transport.bodySnippet = String(pcAny.error || 'no response body').slice(0, 200);
  }
  // PROSE IS EXTRACTED FOR EVERY CASE, not only when a change was proposed — a null-change run
  // must still confirm the scene rendered. Previously this sat inside the hasChange branch and so
  // never ran on the two runs that mattered.
  const authorResp = calls.filter(c => c.stage === 'author' && c.response).pop() || null;
  const prose = authorResp ? contentOf(authorResp.response) : '';
  if (prose) write(tag + '_prose.txt', prose);
  write(tag + '_state_after.json', after);
  write(tag + '_envelope.json', envelope || {});
  return { calls, setup, after, envelope, prose, plannerDispatched, retriesBlocked, transport, replay,
    authorGateVerdict,
    plannerRequest: (calls.filter(c => c.stage === 'planner').pop() || {}).request || '',
    author: authorResp,
    authorReq: calls.filter(c => c.stage === 'author').pop() || null };
};

// ── TWO-SCENE RUN ───────────────────────────────────────────────────────────────────────────
// ONE browser session, because scene 2 must inherit scene 1's sealed store, _priorSceneStateChange
// and rendered prose — the three things _commitScene reads. Two separate runCase() calls would
// each open and close their own browser and lose exactly that.
//
// Stage policy: scene 1's author is gated on a seal (paying it on a non-sealing draw leaves scene 2
// nothing to adjudicate); scene 2's VERIFIER is released, because it IS the test; scene 2's author
// is aborted, since no check needs it and the planner — which does — runs before it.
// Run 13's recorded planner and author responses, and the character-memory extractor's own
// declared skeleton (app.js ~31922) — ONE real shape, empty collections, null interpretation, no
// canon asserted. Used only under --live-verifier-only.
const RUN13_DIR = '_continuation_live_eval_out/run_2026-10-01T22-08-44-097Z';
const recordedContent = (f) => {
  try {
    const j = JSON.parse(fs.readFileSync(RUN13_DIR + '/' + f, 'utf8'));
    return j.content || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  } catch (_) { return ''; }
};
const REPLAY_PLANNER = (function () {
  const raw = recordedContent('s1_response_planner_1.json');
  if (!NARROW_CONTINUATION) return raw;
  // Narrow exactly one field, in place, and fail loudly rather than silently replaying the broad
  // fact if the shape is not what we expect.
  try {
    const i = raw.indexOf('{'), j = raw.lastIndexOf('}');
    const obj = JSON.parse(raw.slice(i, j + 1));
    if (!obj.canon_change || typeof obj.canon_change.content !== 'string') {
      throw new Error('recorded reply has no canon_change.content to narrow');
    }
    const before = obj.canon_change.content;
    obj.canon_change.content = NARROW_FACT;
    console.log('[NARROW-CONTINUATION] canon_change.content replaced (LABELLED FIXTURE EDIT)');
    console.log('   was: ' + JSON.stringify(before));
    console.log('   now: ' + JSON.stringify(NARROW_FACT));
    return JSON.stringify(obj);
  } catch (e) {
    console.error('REFUSED: could not narrow the recorded planner reply — ' + (e && e.message));
    process.exit(4);
  }
})();
const REPLAY_AUTHOR = recordedContent('s1_response_author_2.json');
const MEMORY_SKELETON = JSON.stringify({
  characters: [],
  scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.0 },
  sceneState: { setting: null, charactersPresent: [], protagonistStatus: null,
    decisiveChange: null, activeInterlocutor: null, protagonistAlone: false },
  relations: []
});

const runTwoScene = async (C) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const calls = [];
  let phase = 1, plannerThisDraw = 0, retriesBlocked = 0, authorGate = null;

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    let raw = null; try { raw = req.postData(); } catch (_) {}
    if (!/\/api\/(proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy)/.test(url)) {
      try { await route.abort(); } catch (_) {} return;
    }
    let body = null; try { body = JSON.parse(raw || '{}'); } catch (_) {}
    const sys = (body && body.messages && body.messages[0] && String(body.messages[0].content)) || '';
    const est = estimateUsd(body || { messages: [] }, (body && body.model) || 'grok-4-1-fast-reasoning').estimate;
    const stage = /RUNTIME COMMIT verifier/.test(sys) ? 'verifier'
      : (/CHARACTER MEMORY EXTRACTOR/.test(sys) ? 'memory'
      : (/SCENE-SPINE planner|SCENE planner/.test(sys) ? 'planner'
      : (/screenplay-native|cinematic-romance writer|FORBIDDEN INVENTIONS/.test(sys) ? 'author' : 'other')));
    // THE MEMORY EXTRACTOR IS SERVED, NEVER ABORTED. Aborting it stalled scene 2 before the planner
    // (its three retries were the only requests that got through), so it is answered with its own
    // declared skeleton at $0.
    if (stage === 'memory') {
      say('      [REPLAY] memory extractor — shape-faithful skeleton, $0');
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: MEMORY_SKELETON }) });
    }
    // VERIFIER-ONLY: the planner and author are replayed from run 13's recordings, so the verifier
    // judgement is the sole live provider step.
    if (LIVE_VERIFIER_ONLY && (stage === 'planner' || stage === 'author')) {
      // THE SEAL GATE STILL RUNS, even though the replay is free. My first version returned here
      // before the gate, so authorGate stayed null, sealedOk was false, and the run reported
      // "BOUNDARY UNTESTED — no draw sealed" on three draws that had all SEALED. The gate is
      // evaluated for its verdict and the reply is then served at $0 either way.
      if (stage === 'author' && phase === 1) {
        let sealed = null;
        try {
          sealed = await page.evaluate(() => {
            const st = (window.state && window.state._sealedProposals) || null;
            if (!st) return null;
            const rec = Object.keys(st.byId).map(k => st.byId[k])
              .filter(x => x && x.kind === 'continuation')[0] || null;
            return rec ? rec.id : null;
          });
        } catch (_) { sealed = null; }
        authorGate = sealed ? 'sealed' : 'no-seal';
        say('      [SEAL-GATE] ' + (sealed ? ('seal ' + sealed + ' — author replay released')
          : 'no continuation seal — author replay withheld'));
        if (!sealed) { try { await route.abort(); } catch (_) {} return; }
      }
      const body = stage === 'planner' ? REPLAY_PLANNER : REPLAY_AUTHOR;
      say('      [REPLAY] ' + stage + ' — run 13 recorded response (' + body.length + ' chars), $0');
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: body }) });
    }
    if (stage === 'other') { try { await route.abort(); } catch (_) {} return; }

    if (stage === 'planner' && plannerThisDraw >= 1) {
      retriesBlocked++;
      say('      [ONE-ATTEMPT] aborting a SECOND planner request in this draw');
      try { await route.abort(); } catch (_) {} return;
    }
    if (stage === 'author' && phase === 2) {
      say('      [TWO-SCENE] aborting scene 2 author — no check needs it');
      try { await route.abort(); } catch (_) {} return;
    }
    if (stage === 'author' && phase === 1) {
      let sealed = null;
      try {
        sealed = await page.evaluate(() => {
          const st = (window.state && window.state._sealedProposals) || null;
          if (!st) return null;
          const rec = Object.keys(st.byId).map(k => st.byId[k])
            .filter(x => x && x.kind === 'continuation')[0] || null;
          return rec ? rec.id : null;
        });
      } catch (_) { sealed = null; }
      if (!sealed) {
        authorGate = 'no-seal';
        say('      [SEAL-GATE] no continuation seal — aborting the author UNPAID');
        try { await route.abort(); } catch (_) {} return;
      }
      authorGate = 'sealed';
      say('      [SEAL-GATE] seal ' + sealed + ' — releasing the author');
    }
    if (spentEstimate + est > AUTHORIZED) {
      say('      [GUARD] ABORT ' + stage + ' — would exceed authorization');
      try { await route.abort(); } catch (_) {} return;
    }
    spentEstimate += est;
    if (stage === 'planner') plannerThisDraw++;
    say('      [DISPATCH] s' + phase + ' ' + stage + '  ' + (raw || '').length + 'ch  est $' + est.toFixed(6));
    write('s' + phase + '_request_' + stage + '_' + (calls.length + 1) + '.json', raw || '');
    try {
      const FT = stage === 'author' ? 300000 : (stage === 'planner' ? 120000 : 90000);
      const resp = await route.fetch({ timeout: FT });
      const text = await resp.text();
      write('s' + phase + '_response_' + stage + '_' + (calls.length + 1) + '.json', text);
      recordCost(stage, text, est, modelOf(text));
      calls.push({ phase, stage, request: raw, response: text });
      await route.fulfill({ response: resp });
    } catch (e) {
      say('        dispatch error: ' + (e && e.message));
      calls.push({ phase, stage, request: raw, response: null, error: String(e && e.message) });
      try { await route.abort(); } catch (_) {}
    }
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._commitScene === 'function', { timeout: 20000 });
  const setup = await page.evaluate(() => {
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'live-twoscene-fixed';
    window.state.world = 'Fatelands';
    window.state.worldSubtype = 'arcane_binding';
    window.state.picks = { flavor: 'Arcane Binding', world: 'Fatelands' };
    window.state.storyLength = 'fling';
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state._activeContinuationSeal = null;
    window.state._lastContinuationResult = null;
    window.state.turnCount = 2;
    // THE MODE GATE: _isStagedMode() reads state.renderMode (camelCase). Without it
    // _advanceStagedScene bails before generating and nothing dispatches.
    window.state.renderMode = 'staged_story_mode';
    window.state._cgScreenplayMode = true;
    return { enabled: window._continuationSchemaEnabled(),
      staged: (typeof window._isStagedMode === 'function') ? !!window._isStagedMode() : null };
  });
  if (!setup.enabled) { await browser.close(); throw new Error('opt-in flag not set'); }

  // ── SCENE 1, up to MAX_DRAWS draws until something seals ──────────────────
  let s1 = null;
  for (let d = 1; d <= MAX_DRAWS; d++) {
    say('\n  ── scene 1, draw ' + d + '/' + MAX_DRAWS);
    plannerThisDraw = 0; authorGate = null;
    // THE REAL PRODUCTION ENTRY POINT. Run 13 called _runCGScreenplayGen, which bypasses the mode
    // gate AND the scene completion that persists the projection — so the commit gate had no prose
    // to read. _advanceStagedScene awaits _completeStagedSceneFromScreenplay, which persists it.
    await page.evaluate(async ({ a, dlg }) => {
      try { await Promise.race([window._advanceStagedScene(a, dlg),
        new Promise(r => setTimeout(r, 420000))]); } catch (_) {}
    }, { a: C.action, dlg: C.dialogue });
    s1 = await page.evaluate(() => ({
      ctResult: window.state._lastContinuationResult || null,
      sealedKinds: window.state._sealedProposals
        ? Object.keys(window.state._sealedProposals.byId).map(k => window.state._sealedProposals.byId[k].kind) : [],
      pending: (window._pendingSealedForScene(window.state.turnCount) || []).map(p => ({ id: p.id, kind: p.kind })),
      priorRef: (window.state._priorSceneStateChange || {}).proposalRef || null,
      facts: window._ensureCommittedState().facts.length
    }));
    draws.push({ d, scope: null, outcome: s1.ctResult && s1.ctResult.outcome, gate: authorGate });
    say('    handler=' + JSON.stringify(s1.ctResult && s1.ctResult.outcome)
      + ' authorGate=' + JSON.stringify(authorGate)
      + ' pending=' + JSON.stringify(s1.pending.map(p => p.kind)));
    if (s1.ctResult && s1.ctResult.outcome === 'sealed' && authorGate === 'sealed') break;
    if (d === MAX_DRAWS) { s1.exhausted = true; }
  }
  const sealedOk = !!(s1 && s1.ctResult && s1.ctResult.outcome === 'sealed' && authorGate === 'sealed');
  // PROSE CAPTURE, corrected. The old version returned 0 chars on a run where _commitScene
  // demonstrably received 2,163 chars — it preferred StoryPagination, which is EMPTY BY DESIGN in
  // CG staged mode ("CG has no page record — staged mode skips the literary
  // StoryPagination.addPage"), and a falsy-but-defined '' short-circuited the projection fallback.
  // It now reads the projection FIRST, which is the surface _commitScene's fallback uses, and
  // reports both so a zero is attributable rather than mysterious.
  const prose1pair = await page.evaluate(() => {
    let proj = '', pag = '';
    try { proj = String(window._sbLatestProseText(window.state) || ''); } catch (_) {}
    try { if (typeof StoryPagination !== 'undefined' && StoryPagination.getAllContent)
      pag = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); } catch (_) {}
    return { proj, pag };
  });
  const prose1 = prose1pair.proj || prose1pair.pag || '';
  say('    scene 1 prose: projection=' + prose1pair.proj.length + ' chars, StoryPagination='
    + prose1pair.pag.length + ' chars (empty by design in CG staged mode)');
  if (prose1) write('s1_prose.txt', prose1);

  let s2 = null, repeat = null, progression = null, aliasResolution = null;
  if (sealedOk) {
    // ── READ SCENE 1 THROUGH ITS FINAL BEAT ──────────────────────────────────
    // _advanceStagedScene's Guard 1 is `if (active && !active.gateShown) return;`, and gateShown
    // only becomes true inside _advanceStagedBeat at the LAST beat, which then shows the say/do
    // gate. Without this, scene 2 is blocked with "[STAGED:SUBMIT] Blocked — gate not yet open"
    // and the commit gate never runs. gateShown is NEVER set by hand and no latch is cleared —
    // the scene is read, which is what a reader does.
    say('\n  ── reading scene 1 through to the say/do gate');
    progression = await page.evaluate(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const st = () => {
        const a = window.state._stagedActive || null;
        return a ? { beat: a.currentBeatIdx, last: (a.plan && a.plan.beats || []).length - 1,
          gateShown: !!a.gateShown, microShown: !!a.microShown } : null;
      };
      const before = st();
      if (!before) return { ok: false, why: 'no _stagedActive session' };
      let micros = 0;
      for (let i = 0; i < 200; i++) {
        const cur = st();
        if (!cur || cur.gateShown) break;
        const prevBeat = cur.beat;
        try { window._advanceStagedBeat(); } catch (_) {}
        await sleep(60);
        const nxt = st();
        if (nxt && nxt.beat === prevBeat && !nxt.gateShown) {
          if (!nxt.microShown && typeof window._resolveMicroDecision === 'function') {
            try { window._resolveMicroDecision(0); micros++; } catch (_) {}
            await sleep(80);
          } else { await sleep(120); }
        }
      }
      return { ok: true, before, after: st(), micros };
    });
    say('    ' + JSON.stringify(progression));

    // ── SCENE 2 — opens by adjudicating scene 1 through the REAL _commitScene ──
    say('\n  ── scene 2 (adjudicates scene 1)');
    phase = 2; plannerThisDraw = 0;
    await page.evaluate(() => { window.state.turnCount = (window.state.turnCount || 2) + 1; });
    await page.evaluate(({ a, dlg }) => {
      try { window._advanceStagedScene(a, dlg); } catch (_) {}
    }, { a: 'I wait for the commission to answer.', dlg: 'Let them send for me.' });
    // wait for the commit gate to dispatch the verifier (or give up)
    {
      const deadline = Date.now() + 300000;
      while (Date.now() < deadline && !calls.some(c => c.phase === 2 && c.stage === 'verifier')) {
        await new Promise(r => setTimeout(r, 1000));
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    s2 = await page.evaluate(() => {
      const cs = window._ensureCommittedState();
      const reg = window._protectedRegisterIds();
      return {
        facts: cs.facts.map(f => ({ fact: f.fact, ref: f.proposalRef, prov: f.provenanceLink,
          scene: f.committedAtScene })),
        committedThrough: cs._committedThroughScene,
        adjudication: window.state._lastPerProposalAdjudication || null,
        registerLabels: Object.keys(reg).map(k => String(reg[k].label || '')),
        activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
          .map(k => ({ id: k, label: reg[k].label, aliases: reg[k].aliases || [] })),
        sceneCard: window.state._sceneStateCard || null
      };
    });
    // ── ALIASES MUST RESOLVE, captured from the live register ────────────────
    aliasResolution = await page.evaluate(() => {
      const reg = window._protectedRegisterIds();
      const act = Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')[0] || null;
      if (!act) return null;
      const e = reg[act];
      const res = (x) => { const v = window._deliveryAnchorAliases(x);
        return { name: x, ok: !!v.ok, id: v.entityId || null }; };
      return { activatedId: act, label: res(e.label),
        aliases: (e.aliases || []).map(res) };
    });

    // ── IDEMPOTENCY through the real path, re-entered twice ──────────────────
    // ── IDEMPOTENCY, PINNED (repaired after run 17) ─────────────────────────
    // The old probe re-entered with window.state._priorSceneStateChange AS IT STOOD after scene 2's
    // planning — by then a LATER scene's state_change. It therefore adjudicated a DIFFERENT scene
    // against stale prose, dispatched a SECOND PAID verifier call, and committed a new fact. It now
    // pins SCENE 1's own proposals from the sealed store and passes the matching scene number.
    // The verifier BASELINE is captured BEFORE re-entry: the old assertion compared a count to
    // itself, both read afterwards, and passed with a second verifier call in the same log.
    const vBeforeRepeat = calls.filter(c => c.stage === 'verifier').length;
    const factsBeforeRepeat = (R_s2factRefs => R_s2factRefs)((s2 && s2.facts || []).map(f => f.ref).sort().join('|'));
    say('\n  ── re-entering _commitScene on SCENE 1\'s pinned proposals, twice');
    say('    baseline before re-entry: verifier calls=' + vBeforeRepeat
      + ' factRefs=' + JSON.stringify(factsBeforeRepeat));
    repeat = await page.evaluate(async () => {
      // The prose comes from the same surface _commitScene's own fallback reads — never a fixture.
      const prose = String(window._sbLatestProseText(window.state) || '');
      const st = (window.state._sealedProposals || { byId: {} }).byId;
      const all = Object.keys(st).map(k => st[k]);
      const sc = all.filter(x => x.kind === 'state_change').sort((a, b) => a.scene - b.scene)[0] || null;
      const ct = all.filter(x => x.kind === 'continuation').sort((a, b) => a.scene - b.scene)[0] || null;
      if (!sc) return { ok: false, why: 'could not pin scene 1 state_change' };
      const before = window._ensureCommittedState().facts.map(f => f.proposalRef).sort().join('|');
      const pinnedProposal = { event: sc.fact, proposalRef: sc.id, sceneProposed: sc.scene };
      await window._commitScene(prose, pinnedProposal, sc.scene);
      await window._commitScene(prose, pinnedProposal, sc.scene);
      const cs = window._ensureCommittedState();
      const reg = window._protectedRegisterIds();
      return { ok: true, pinnedScene: sc.scene, scRef: sc.id, ctRef: ct ? ct.id : null,
        proseLen: prose.length, before,
        facts: cs.facts.length, refs: cs.facts.map(f => f.proposalRef).sort().join('|'),
        activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated').length };
    });
    repeat.vBefore = vBeforeRepeat;
    repeat.vAfter = calls.filter(c => c.stage === 'verifier').length;
  }
  const plannerReqs = calls.filter(c => c.stage === 'planner');
  await browser.close();
  return { calls, s1, s2, repeat, sealedOk, prose1, retriesBlocked, authorGate, progression,
    aliasResolution,
    s2PlannerRequest: (plannerReqs.filter(c => c.phase === 2).pop() || {}).request || '' };
};

const results = {};
const samples = [];
const draws = [];

if (TWO_SCENE) {
  const C = CASES[0];
  say('\n──────── TWO-SCENE ACTIVATION / IDEMPOTENCY — CASE ' + C.id + ' ────────');
  say('  posture: ' + JSON.stringify(C.action));
  say('  scene 1 seals + renders (author gated on a seal); scene 2 OPENS by adjudicating scene 1');
  say('  through the real _commitScene. Scene 2\'s author is aborted — no check needs it.');
  const R = await runTwoScene(C);

  say('\n=== SCENE 1 ===');
  t('a continuation proposal sealed in scene 1',
    !!(R.s1 && R.s1.ctResult && R.s1.ctResult.outcome === 'sealed'),
    JSON.stringify(R.s1 && R.s1.ctResult && R.s1.ctResult.why));
  if (!R.sealedOk) {
    // REPORT THE ACTUAL REASON. An earlier version printed "no draw sealed" unconditionally, which
    // contradicted its own draw log on a run where every draw sealed.
    const anySealed = draws.some(d => d.outcome === 'sealed');
    say('\n  BOUNDARY UNTESTED.');
    if (anySealed) {
      say('  A draw DID seal (' + draws.filter(d => d.outcome === 'sealed').length + '/' + draws.length
        + '), but the author gate never recorded a release, so scene 2 was not attempted.');
      say('  That is a HARNESS condition, not a planner or system outcome: ' + JSON.stringify(draws));
    } else {
      say('  No draw sealed a durable proposal, so scene 2 had nothing to adjudicate. NOT a failure');
      say('  of the system or the planner; the gate withheld the author every time.');
    }
    write('twoscene.json', { verdict: 'boundary_untested', draws, measured, authorized: AUTHORIZED });
    say('\n' + pass + '/' + (pass + fail) + ' harness assertions passed');
    say('MEASURED (receipted): $' + measured.toFixed(6)
  + (unreceipted.length ? '  |  UNMEASURED estimated: $' + unmeasuredTotal().toFixed(6)
    + ' across ' + unreceipted.length + ' call(s)' : '')
  + '  |  TOTAL EXPOSURE: $' + (measured + unmeasuredTotal()).toFixed(6)
  + ' of $' + AUTHORIZED.toFixed(2));
    say('Artefacts: ' + RUN);
    process.exit(0);
  }
  t('  the author was released only because a seal existed', R.authorGate === 'sealed');
  t('  BOTH proposal kinds were pending after scene 1',
    (R.s1.pending || []).length === 2, JSON.stringify(R.s1.pending));
  t('  and NOTHING was committed by scene 1', R.s1.facts === 0, 'facts=' + R.s1.facts);
  t('  scene 1 rendered prose', (R.prose1 || '').length > 200, 'len=' + (R.prose1 || '').length);

  say('\n=== SCENE 2 — adjudication through the real _commitScene ===');
  const verifierCalls = R.calls.filter(c => c.phase === 2 && c.stage === 'verifier');
  t('scene 2 issued a RUNTIME COMMIT VERIFIER request', verifierCalls.length >= 1,
    'verifier calls=' + verifierCalls.length);
  const vreq = verifierCalls.length ? String(verifierCalls[0].request || '') : '';
  t('  its payload listed BOTH sealed refs for judgement',
    (R.s1.pending || []).every(p => vreq.indexOf(p.id) >= 0),
    JSON.stringify((R.s1.pending || []).map(p => [p.id, vreq.indexOf(p.id) >= 0])));
  say('  adjudication: ' + JSON.stringify(R.s2.adjudication && R.s2.adjudication.verdicts));
  // THE REASON AND THE PRECONDITION SOURCE, per proposal. Run 17's PARTIAL arrived with no reason
  // attached, which is why it could only be classified as indeterminate. These are the fields that
  // make a non-delivery diagnosable, so they are printed per proposal rather than buried in the
  // verdict blob.
  const _vd = (R.s2.adjudication && R.s2.adjudication.verdicts) || {};
  say('\n  — per-proposal verdict detail —');
  Object.keys(_vd).forEach(function (ref) {
    const v = _vd[ref];
    say('    ' + ref + ' (' + v.kind + '): status=' + v.status
      + ' reason=' + JSON.stringify(v.reason || null)
      + ' precondition=' + JSON.stringify(v.preconditionSource || null)
      + (v.downgraded ? ' DOWNGRADED' : '')
      + ' commit=' + v.commit);
    if (v.why && v.why.length) say('      why: ' + JSON.stringify(v.why));
  });
  say('  facts: ' + JSON.stringify(R.s2.facts));
  const ctRef = ((R.s1.pending || []).filter(p => p.kind === 'continuation')[0] || {}).id;
  const scRef = ((R.s1.pending || []).filter(p => p.kind === 'state_change')[0] || {}).id;
  const ctFact = R.s2.facts.filter(f => f.ref === ctRef)[0] || null;
  t('each proposal got its OWN verdict', !!(R.s2.adjudication
    && R.s2.adjudication.verdicts[ctRef] && R.s2.adjudication.verdicts[scRef]),
    JSON.stringify(R.s2.adjudication));
  if (ctFact) {
    t('the CONTINUATION committed its own exact sealed record',
      ctFact.prov === 'sealed' && ctFact.scene === (R.s1.pending.length ? 2 : ctFact.scene),
      JSON.stringify(ctFact));
    t('  exactly one fact per sealed ref — no duplicates',
      new Set(R.s2.facts.map(f => f.ref)).size === R.s2.facts.length,
      JSON.stringify(R.s2.facts.map(f => f.ref)));
    t('THE INSTITUTION IS IN THE ACTIVE REGISTER',
      R.s2.activated.length === 1, JSON.stringify(R.s2.activated));
    t('  with its sealed aliases', R.s2.activated.length === 1
      && (R.s2.activated[0].aliases || []).length >= 1, JSON.stringify(R.s2.activated));
    t('  and the NEXT planner payload names it',
      R.s2.activated.length === 1
      && R.s2PlannerRequest.indexOf(String(R.s2.activated[0].label)) >= 0,
      'label=' + (R.s2.activated.length ? R.s2.activated[0].label : '?'));
    t('  while carrying NO pending-entity machinery',
      !/ent:stage:\d+/.test(R.s2PlannerRequest),
      (R.s2PlannerRequest.match(/ent:stage:\d+/) || [''])[0]);
    // ALIASES RESOLVE, not merely appear. The institution must be referencable by every declared
    // natural form AND by its canonical label, all to the same entity — that is what makes a later
    // scene able to say "the commission" and mean this body.
    if (R.aliasResolution) {
      say('  alias resolution: ' + JSON.stringify(R.aliasResolution));
      t('  every declared alias resolves to the activated entity',
        R.aliasResolution.aliases.length > 0
        && R.aliasResolution.aliases.every(a => a.ok && a.id === R.aliasResolution.activatedId),
        JSON.stringify(R.aliasResolution));
      t('  and the canonical label resolves to the same entity',
        R.aliasResolution.label && R.aliasResolution.label.ok
        && R.aliasResolution.label.id === R.aliasResolution.activatedId,
        JSON.stringify(R.aliasResolution.label));
    } else t('  alias resolution was captured', false, 'no aliasResolution recorded');
  } else {
    say('  the continuation did NOT commit — recording the verdict rather than asserting success');
    t('a continuation verdict was recorded', !!(R.s2.adjudication
      && R.s2.adjudication.verdicts[ctRef]), JSON.stringify(R.s2.adjudication));
    t('  and nothing was activated without it', R.s2.activated.length === 0,
      JSON.stringify(R.s2.activated));
  }
  // VALUES, NOT KEY NAMES. The old assertion matched /decisiveChange/ against the card JSON and
  // tripped on the DETERMINISTIC card's own decisiveChange FIELD, which is permanently null by
  // design — the same over-broad-scan class as matching "TIER 2" inside a prompt. What must be
  // absent is verifier-authored CONTENT, so the card's model-interpretation fields are asserted
  // NULL and the fact texts are checked for interpretation vocabulary.
  const card2 = R.s2.sceneCard || null;
  t('the scene card is deterministic', !card2 || card2.source === 'deterministic',
    JSON.stringify(card2 && card2.source));
  // EMPTY IS THE RIGHT VALUE FOR A LIST. My first version demanded `== null` for every field and
  // tripped on charactersPresent: [] — which is the correct deterministic value for a list, not a
  // leak. The property that matters is that no field carries verifier-authored CONTENT, so a scalar
  // must be null and a list must be empty.
  const SCALAR_FIELDS = ['decisiveChange', 'protagonistStatus', 'activeInterlocutor', 'setting',
    'dominantReplacement'];
  const LIST_FIELDS = ['charactersPresent'];
  t('  no model-interpretation SCALAR on it carries content',
    !card2 || SCALAR_FIELDS.every(k => card2[k] == null),
    JSON.stringify(card2 && SCALAR_FIELDS.map(k => [k, card2[k]])));
  t('  and no model-interpretation LIST on it has entries',
    !card2 || LIST_FIELDS.every(k => !Array.isArray(card2[k]) || card2[k].length === 0),
    JSON.stringify(card2 && LIST_FIELDS.map(k => [k, card2[k]])));
  t('no committed fact carries verifier interpretation vocabulary',
    !/atmosphere|relationship_dialogue|internal_monologue|world_exposition|different_event/
      .test(JSON.stringify(R.s2.facts)), JSON.stringify(R.s2.facts).slice(0, 160));

  say('\n=== IDEMPOTENCY — _commitScene re-entered twice on the same scene ===');
  t('the probe pinned scene 1\'s own proposals', !!(R.repeat && R.repeat.ok),
    JSON.stringify(R.repeat && R.repeat.why));
  t('  on the matching scene number', !!(R.repeat && R.repeat.pinnedScene != null),
    JSON.stringify(R.repeat && R.repeat.pinnedScene));
  t('  with the real projection prose', !!(R.repeat && R.repeat.proseLen >= 40),
    'proseLen=' + (R.repeat && R.repeat.proseLen));
  t('NO NEW VERIFIER CALL', !!(R.repeat && R.repeat.vAfter === R.repeat.vBefore),
    'before=' + (R.repeat && R.repeat.vBefore) + ' after=' + (R.repeat && R.repeat.vAfter));
  t('  NO new facts — refs unchanged', !!(R.repeat && R.repeat.refs === R.repeat.before),
    'before=' + (R.repeat && R.repeat.before) + ' after=' + (R.repeat && R.repeat.refs));
  t('  no duplicate refs', !!(R.repeat
    && new Set(R.repeat.refs.split('|')).size === R.repeat.refs.split('|').length),
    JSON.stringify(R.repeat && R.repeat.refs));
  t('  the activated entity count did not change', !!(R.repeat && R.repeat.activated <= 1),
    JSON.stringify(R.repeat && R.repeat.activated));

  write('twoscene.json', { verdict: 'boundary_tested', draws, s1: R.s1, s2: R.s2,
    repeat: R.repeat, measured, authorized: AUTHORIZED });
  say('\n' + pass + '/' + (pass + fail) + ' assertions passed');
  say('MEASURED (receipted): $' + measured.toFixed(6)
  + (unreceipted.length ? '  |  UNMEASURED estimated: $' + unmeasuredTotal().toFixed(6)
    + ' across ' + unreceipted.length + ' call(s)' : '')
  + '  |  TOTAL EXPOSURE: $' + (measured + unmeasuredTotal()).toFixed(6)
  + ' of $' + AUTHORIZED.toFixed(2));
  say('Artefacts: ' + RUN);
  process.exit(fail ? 1 : 0);
} else if (SEAL_GATED) {
  // ── THE BOUNDARY TEST ───────────────────────────────────────────────────────────────────────
  // Up to MAX_DRAWS planner draws, one request each, no retries. Every draw is logged with its
  // outcome whether it seals or not. The author is released on the FIRST valid durable seal and
  // never dispatched otherwise. A planner response is never reused and a seal is never fabricated:
  // each draw is an independent request against fresh state, and the gate reads the live store.
  const C = CASES[0];
  say('\n──────── SEAL-GATED BOUNDARY TEST — CASE ' + C.id + ': ' + C.label + ' ────────');
  say('  posture: ' + JSON.stringify(C.action));
  say('  up to ' + MAX_DRAWS + ' planner draws, one request each, no retries.');
  say('  the author is dispatched ONLY after a valid durable seal, and at most once.');
  say('  NOT a path-rate measurement — that experiment is complete (durable 7/9). Draw outcomes');
  say('  are logged here so this run hides nothing, but no rate is computed from them.');
  let sealedDraw = null;
  for (let d = 1; d <= MAX_DRAWS; d++) {
    say('\n  ── draw ' + d + '/' + MAX_DRAWS);
    let R = null;
    try { R = await runCase(C, d, { oneAttempt: true, gateAuthorOnSeal: true }); }
    catch (e) { say('    DRAW ERRORED: ' + (e && e.message)); }
    const E = R && R.envelope;
    const outcome = (R && R.after && R.after.ctResult && R.after.ctResult.outcome) || null;
    const gate = (R && R.authorGateVerdict) || null;
    const respHash = R ? (R.calls.filter(c => c.stage === 'planner' && c.response).pop() || {}).response : null;
    draws.push({ d, scope: E ? E.pressure_scope : null, outcome, gate,
      responseLen: respHash ? String(respHash).length : 0,
      why: (R && R.after && R.after.ctResult && R.after.ctResult.why) || [] });
    say('    pressure_scope : ' + JSON.stringify(E && E.pressure_scope));
    say('    handler        : ' + JSON.stringify(outcome));
    say('    author gate    : ' + JSON.stringify(gate));
    if (outcome === 'sealed' && gate === 'sealed') { sealedDraw = R; break; }
    if (outcome === 'sealed' && gate !== 'sealed') {
      say('    (sealed but the author never appeared — recorded, not retried)');
      sealedDraw = R; break;
    }
    say('    → no seal; this draw cost one planner call and NO author call');
  }
  if (sealedDraw) results[C.id] = sealedDraw;
  else {
    say('\n  BOUNDARY UNTESTED — none of the ' + MAX_DRAWS + ' draws sealed a durable proposal.');
    say('  This is NOT a failure of the system or of the planner: a coherent scene_local answer is');
    say('  a legitimate outcome, and the gate correctly withheld the author every time. The');
    say('  boundary checks simply had nothing to run against.');
    results[C.id] = null;
  }
} else if (SAMPLES) {
  // ── THE RELIABILITY MEASUREMENT ─────────────────────────────────────────────────────────────
  // Five identical attempts. The question is the DISTRIBUTION, so no sample is retried, rescued,
  // or re-rolled, and a sample that errors is recorded as a sample rather than skipped.
  const C = CASES[0];
  say('\n──────── SAMPLING ' + SAMPLES + ' x CASE ' + C.id + ': ' + C.label + ' ────────');
  say('  posture: ' + JSON.stringify(C.action));
  say('  fixed storyId, one attempt per sample, no retries, no author/verifier dispatch.');
  for (let i = 1; i <= SAMPLES; i++) {
    say('\n  ── sample ' + i + '/' + SAMPLES);
    let R = null;
    try { R = await runCase(C, i); }
    catch (e) { say('    SAMPLE ERRORED: ' + (e && e.message)); }
    samples.push({ i, R });
    if (R) {
      const E = R.envelope;
      say('    pressure_scope : ' + JSON.stringify(E && E.pressure_scope));
      say('    canon_change   : ' + (E && E.canon_change ? 'present' : 'null'));
      say('    introduces     : ' + ((E && Array.isArray(E.introduces)) ? E.introduces.length : 'n/a'));
      say('    derivation     : ' + ((E && typeof E.derivation === 'string' && E.derivation.trim()) ? 'present' : 'absent'));
      // ALIASES, printed per sample. The pre-registration for the 3-sample check names "nonempty,
      // collision-free aliases", and a seal alone only IMPLIES that (the validator rejects both
      // faults) — printing the actual arrays makes it visible instead of inferred.
      say('    aliases        : ' + JSON.stringify((E && Array.isArray(E.introduces))
        ? E.introduces.map(x => (x && x.aliases) || null) : null));
      say('    handler        : ' + JSON.stringify(R.after && R.after.ctResult && R.after.ctResult.outcome));
      if (R.retriesBlocked) say('    retries blocked: ' + R.retriesBlocked);
    }
  }
} else {
  for (const C of CASES) {
    say('\n──────── CASE ' + C.id + ': ' + C.label + ' ────────');
    say('  posture: ' + JSON.stringify(C.action));
    try { results[C.id] = await runCase(C); }
    catch (e) { say('  CASE ABORTED: ' + (e && e.message)); results[C.id] = null; }
  }
}

const spendReport = () => {
  const un = unmeasuredTotal();
  const exposure = measured + un;
  say('\n=== SPEND ===');
  say('  running estimate   : $' + spentEstimate.toFixed(6));
  say('  MEASURED (receipts): $' + measured.toFixed(6));
  if (unreceipted.length) {
    say('  UNMEASURED         : $' + un.toFixed(6) + ' estimated across ' + unreceipted.length
      + ' call(s) with NO receipt — NOT $0:');
    unreceipted.forEach(u => say('      · ' + u.stage + ' on ' + u.model
      + ' — estimated $' + u.estimate.toFixed(6)));
  } else {
    say('  UNMEASURED         : none — every dispatch returned a receipt');
  }
  say('  TOTAL EXPOSURE     : $' + exposure.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2)
    + '  (' + ((exposure / AUTHORIZED) * 100).toFixed(1) + '%)');
  if (unreceipted.length) {
    say('  (exposure, not spend: the unmeasured part is this runner\'s own estimate, and the');
    say('   provider console is the only ground truth for it)');
  }
};
spendReport();

// ── THE DISTRIBUTION REPORT (sampling mode) ─────────────────────────────────
if (SAMPLES) {
  const crypto = await import('node:crypto');
  const sha = (x) => crypto.createHash('sha256').update(String(x || '')).digest('hex').slice(0, 16);

  // WAS IT ACTUALLY THE SAME PROMPT? Reported as a measured fact, not assumed from using one code
  // path. If the assembled planner requests differ, the distribution is not a distribution of one
  // prompt and must not be read as one.
  const hashes = samples.map(s2 => s2.R ? sha(s2.R.plannerRequest) : 'ERRORED');
  const uniq = Array.from(new Set(hashes.filter(h => h !== 'ERRORED')));
  say('\n=== PROMPT IDENTITY ===');
  say('  assembled planner request hashes: ' + JSON.stringify(hashes));
  t('every sample sent a BYTE-IDENTICAL planner request', uniq.length === 1,
    uniq.length + ' distinct payload(s) — the samples are not of one prompt');

  say('\n=== ONE ATTEMPT PER SAMPLE ===');
  const dispatches = samples.map(s2 => s2.R ? s2.R.plannerDispatched : 0);
  const blocked = samples.reduce((n, s2) => n + (s2.R ? s2.R.retriesBlocked : 0), 0);
  say('  planner dispatches per sample: ' + JSON.stringify(dispatches));
  t('no sample dispatched more than one planner call', dispatches.every(n => n <= 1),
    JSON.stringify(dispatches));
  say('  retry attempts blocked: ' + blocked + (blocked ? '  (recorded, not re-rolled)' : ''));
  t('no author or verifier call was dispatched',
    samples.every(s2 => !s2.R || !s2.R.calls.some(c => c.stage !== 'planner' && c.response)));

  say('\n=== DISTRIBUTION ===');
  const buckets = { valid_durable: 0, valid_scene_local: 0, incoherent: 0, envelope_violation: 0, void: 0 };
  const paths = { durable: 0, scene_local: 0, none: 0 };
  const rows = [];
  samples.forEach(s2 => {
    if (!s2.R) { buckets.void++; paths.none++;
      rows.push({ i: s2.i, bucket: 'void', path: null, why: ['the sample errored before a reply'] }); return; }
    const c = classifySample(s2.R.envelope, s2.R.after, s2.R.setup.ledgerBeforeFull, s2.R.transport);
    buckets[c.bucket] = (buckets[c.bucket] || 0) + 1;
    paths[c.pathChosen || 'none'] = (paths[c.pathChosen || 'none'] || 0) + 1;
    rows.push({ i: s2.i, bucket: c.bucket, path: c.pathChosen, why: c.why });
  });
  rows.forEach(r2 => say('  sample ' + r2.i + ': ' + r2.bucket.toUpperCase()
    + ' (path=' + JSON.stringify(r2.path) + ')'
    + (r2.why && r2.why.length ? '\n      why: ' + JSON.stringify(r2.why) : '')));
  // ── REFUSAL. An aggregate that mixes model data with transport failures is not a measurement:
  // the denominator is wrong and the void samples read as non-compliance. So no rate is printed
  // at all while any sample is void — the run must be re-dispatched instead.
  if (buckets.void > 0) {
    say('\n  DISTRIBUTION REFUSED — ' + buckets.void + ' of ' + SAMPLES + ' sample(s) are VOID');
    say('  A void sample is a TRANSPORT failure, not a planner outcome. No rate is computed from a');
    say('  partial set: the denominator would be wrong and the void samples would read as');
    say('  non-compliance by a model that was never reached. Re-dispatch the whole check.');
    say('  (non-void outcomes, for diagnosis only, NOT a distribution: '
      + 'durable=' + buckets.valid_durable + ' scene_local=' + buckets.valid_scene_local
      + ' incoherent=' + buckets.incoherent + ' envelope_violation=' + buckets.envelope_violation + ')');
    t('every sample reached the planner', false,
      buckets.void + ' void sample(s) — nothing is measured');
    write('distribution.json', { refused: true, voidCount: buckets.void, samples: rows, buckets,
      hashes, dispatches, blocked, measured, authorized: AUTHORIZED });
    say('\n' + pass + '/' + (pass + fail) + ' harness assertions passed');
    say('MEASURED (receipted): $' + measured.toFixed(6)
  + (unreceipted.length ? '  |  UNMEASURED estimated: $' + unmeasuredTotal().toFixed(6)
    + ' across ' + unreceipted.length + ' call(s)' : '')
  + '  |  TOTAL EXPOSURE: $' + (measured + unmeasuredTotal()).toFixed(6)
  + ' of $' + AUTHORIZED.toFixed(2));
    say('Artefacts: ' + RUN);
    process.exit(1);
  }
  say('\n  valid durable      : ' + buckets.valid_durable + '/' + SAMPLES);
  say('  valid scene-local  : ' + buckets.valid_scene_local + '/' + SAMPLES);
  say('  incoherent/rejected: ' + buckets.incoherent + '/' + SAMPLES);
  say('  envelope violations: ' + buckets.envelope_violation + '/' + SAMPLES);
  say('  void (transport)   : ' + buckets.void + '/' + SAMPLES);
  // ALIAS COMPLIANCE, scored only over the samples that actually proposed something durable.
  const durableSamples = samples.filter(s2 => s2.R && s2.R.envelope
    && s2.R.envelope.pressure_scope === 'durable'
    && Array.isArray(s2.R.envelope.introduces) && s2.R.envelope.introduces.length);
  if (durableSamples.length) {
    say('\n=== ALIAS COMPLIANCE (durable samples only) ===');
    durableSamples.forEach(s2 => {
      const al = s2.R.envelope.introduces.map(x => (x && Array.isArray(x.aliases))
        ? x.aliases.filter(a => typeof a === 'string' && a.trim()) : []);
      say('  sample ' + s2.i + ': ' + JSON.stringify(al));
    });
    t('every durable sample declares a NON-EMPTY alias list for each introduced entity',
      durableSamples.every(s2 => s2.R.envelope.introduces.every(x => Array.isArray(x && x.aliases)
        && x.aliases.filter(a => typeof a === 'string' && a.trim()).length > 0)),
      JSON.stringify(durableSamples.map(s2 => ({ i: s2.i,
        aliases: s2.R.envelope.introduces.map(x => (x && x.aliases) || null) }))));
    // COLLISION-FREE is proven by the HANDLER: the identity guard rejects a colliding label or
    // alias, so a sealed durable proposal cannot carry one. Asserted through that, and said so.
    t('  and every durable sample that sealed is therefore collision-free (the guard refuses otherwise)',
      durableSamples.every(s2 => {
        const o = s2.R.after && s2.R.after.ctResult && s2.R.after.ctResult.outcome;
        return o === 'sealed' || o === 'rejected';
      }), 'outcomes=' + JSON.stringify(durableSamples.map(s2 =>
        s2.R.after && s2.R.after.ctResult && s2.R.after.ctResult.outcome)));
  }

  say('\n  PATH CHOSEN (the actual question, blurred by the buckets alone):');
  say('    durable path     : ' + (paths.durable || 0) + '/' + SAMPLES);
  say('    scene_local path : ' + (paths.scene_local || 0) + '/' + SAMPLES);
  say('    no parseable path: ' + (paths.none || 0) + '/' + SAMPLES);
  // COMPLETENESS, not decoration: if the three path lines do not account for every sample, the
  // tally is hiding one and the distribution above must not be read as complete.
  t('the path tally accounts for every sample',
    (paths.durable || 0) + (paths.scene_local || 0) + (paths.none || 0) === SAMPLES,
    JSON.stringify(paths));
  t('the bucket tally accounts for every sample',
    buckets.valid_durable + buckets.valid_scene_local + buckets.incoherent
      + buckets.envelope_violation + buckets.void === SAMPLES, JSON.stringify(buckets));
  say('\n  NOTE: n=' + SAMPLES + '. A rate from five draws has a wide interval; this measures'
    + ' whether the planner is RELIABLE, and only a clean sweep either way is decisive at this n.');
  write('distribution.json', { samples: rows, buckets, paths, hashes, dispatches, blocked,
    measured, authorized: AUTHORIZED });
  say('\n' + pass + '/' + (pass + fail) + ' harness assertions passed');
  say('MEASURED (receipted): $' + measured.toFixed(6)
  + (unreceipted.length ? '  |  UNMEASURED estimated: $' + unmeasuredTotal().toFixed(6)
    + ' across ' + unreceipted.length + ' call(s)' : '')
  + '  |  TOTAL EXPOSURE: $' + (measured + unmeasuredTotal()).toFixed(6)
  + ' of $' + AUTHORIZED.toFixed(2));
  say('Artefacts: ' + RUN);
  process.exit(0);
}

// ── SEAL-GATED DRAW LOG ─────────────────────────────────────────────────────
if (SEAL_GATED) {
  say('\n=== DRAW LOG (every draw, sealing or not) ===');
  draws.forEach(dr => say('  draw ' + dr.d + ': scope=' + JSON.stringify(dr.scope)
    + ' handler=' + JSON.stringify(dr.outcome) + ' authorGate=' + JSON.stringify(dr.gate)
    + ' plannerResponseBytes=' + dr.responseLen
    + (dr.why && dr.why.length ? '\n      why: ' + JSON.stringify(dr.why) : '')));
  t('no draw exceeded one planner request', draws.length <= MAX_DRAWS, 'draws=' + draws.length);
  // A reused response would show up as two draws with byte-identical response lengths AND no
  // independent fetch; lengths are logged so a reader can see each draw answered separately.
  t('every draw that reached the planner got its own response',
    draws.every(dr => dr.responseLen > 0 || dr.outcome === null),
    JSON.stringify(draws.map(dr => dr.responseLen)));
  const sealedDraws = draws.filter(dr => dr.outcome === 'sealed');
  t('the author was released only on a sealed draw',
    draws.every(dr => dr.gate !== 'sealed' || dr.outcome === 'sealed'),
    JSON.stringify(draws.map(dr => ({ d: dr.d, outcome: dr.outcome, gate: dr.gate }))));
  t('the author was never dispatched without a seal',
    draws.every(dr => dr.outcome === 'sealed' || dr.gate !== 'sealed'),
    JSON.stringify(draws.map(dr => dr.gate)));
  if (!sealedDraws.length) {
    say('\n=== VERDICT: BOUNDARY UNTESTED ===');
    say('  ' + draws.length + ' draw(s), none sealed. The author was withheld every time, so the');
    say('  six boundary checks had nothing to run against. Reported as UNTESTED, not failed.');
    write('draws.json', { seal_gated: true, verdict: 'boundary_untested', draws, measured,
      authorized: AUTHORIZED });
    say('\n' + pass + '/' + (pass + fail) + ' harness assertions passed');
    say('MEASURED (receipted): $' + measured.toFixed(6)
  + (unreceipted.length ? '  |  UNMEASURED estimated: $' + unmeasuredTotal().toFixed(6)
    + ' across ' + unreceipted.length + ' call(s)' : '')
  + '  |  TOTAL EXPOSURE: $' + (measured + unmeasuredTotal()).toFixed(6)
  + ' of $' + AUTHORIZED.toFixed(2));
    say('Artefacts: ' + RUN);
    process.exit(0);
  }
  write('draws.json', { seal_gated: true, verdict: 'boundary_tested', draws, measured,
    authorized: AUTHORIZED });
}

// ── scoring, per pre-registration ────────────────────────────────────────────
const env = (id) => results[id] && results[id].envelope;
// FIVE KEYS since the persistence fix (2026-10-01). `pressure_scope` is what this run exists to
// measure, so it is scored, not merely printed.
const ENV_KEYS = ['scene_purpose', 'forward_pressure', 'pressure_scope', 'canon_change', 'introduces'];

for (const C of CASES) {
  const R = results[C.id]; const E = env(C.id);
  say('\n=== CASE ' + C.id + ' — ENVELOPE COMPLIANCE ===');
  t(C.id + ': a planner reply was parsed', !!E);
  if (!E) continue;
  const present = ENV_KEYS.filter(k => Object.prototype.hasOwnProperty.call(E, k));
  say('  envelope keys returned : ' + JSON.stringify(present));
  say('  scene_purpose    : ' + JSON.stringify(E.scene_purpose || null));
  say('  forward_pressure : ' + JSON.stringify(E.forward_pressure || null));
  say('  pressure_scope   : ' + JSON.stringify(E.pressure_scope || null));
  say('  canon_change     : ' + JSON.stringify(E.canon_change || null));
  say('  introduces       : ' + JSON.stringify(E.introduces || null));
  t('  all five envelope keys returned', present.length === 5, JSON.stringify(present));
  t('  scene_purpose is non-empty', typeof E.scene_purpose === 'string' && !!E.scene_purpose.trim());
  t('  forward_pressure is non-empty', typeof E.forward_pressure === 'string' && !!E.forward_pressure.trim());
  t('  introduces is an array', Array.isArray(E.introduces));
  // THE MEASUREMENT THIS RUN EXISTS FOR. Neither value is a better answer than the other; what is
  // scored is whether the planner USES the distinction and stays consistent with its own choice.
  const scope = E.pressure_scope;
  t('  pressure_scope is one of the two contract literals',
    scope === 'scene_local' || scope === 'durable', JSON.stringify(scope));
  if (scope === 'durable') {
    const identified = (Array.isArray(E.introduces) && E.introduces.length > 0)
      || (Array.isArray(E.existingRefs) && E.existingRefs.length > 0);
    t('  durable: the continuing referent IS identified (introduces[] or existingRefs[])', identified,
      'introduces=' + JSON.stringify(E.introduces) + ' existingRefs=' + JSON.stringify(E.existingRefs));
  } else if (scope === 'scene_local') {
    t('  scene_local: no canon was proposed alongside it',
      !(E.canon_change && typeof E.canon_change === 'object')
      && !(Array.isArray(E.introduces) && E.introduces.length),
      'canon_change=' + JSON.stringify(E.canon_change) + ' introduces=' + JSON.stringify(E.introduces));
  }
  t('  the handler did NOT reject it as a persistence violation',
    !(R.after.ctResult && R.after.ctResult.persistenceViolation === true),
    JSON.stringify(R.after.ctResult && R.after.ctResult.why));
  // DERIVATION, scored for EVERY case as the biconditional the contract now states. Run 6 met all
  // five pass criteria and was refused for this field alone; it is printed and graded from here on
  // so that outcome can never again be invisible until the handler verdict.
  say('  derivation       : ' + JSON.stringify(E.derivation || null));
  const _proposesDurable = !!(E.canon_change && typeof E.canon_change === 'object')
    || (Array.isArray(E.introduces) && E.introduces.length > 0);
  if (_proposesDurable) {
    t('  derivation is present (something durable is proposed, so it is owed)',
      typeof E.derivation === 'string' && !!E.derivation.trim(), JSON.stringify(E.derivation));
  } else {
    say('  (nothing durable proposed — derivation is correctly not owed)');
  }
  t('  no planner-supplied durable id',
    !(E.canon_change && E.canon_change.id) && !(E.introduces || []).some(x => x && x.id));

  const hasChange = !!(E.canon_change && typeof E.canon_change === 'object');
  const hasIntro = Array.isArray(E.introduces) && E.introduces.length > 0;
  say('\n  handler result : ' + JSON.stringify(R.after.ctResult));
  say('  committed facts: ' + JSON.stringify(R.after.facts.map(f => ({ fact: f.fact, link: f.provenanceLink }))));

  if (C.id === 'A-null') {
    t('  PRE-REGISTERED: canon_change is null', !hasChange,
      hasChange ? 'proposed a change for a quiet scene: ' + JSON.stringify(E.canon_change) : '');
    t('  PRE-REGISTERED: introduces is empty', !hasIntro, JSON.stringify(E.introduces));
    t('  outcome is none', R.after.ctResult && R.after.ctResult.outcome === 'none',
      JSON.stringify(R.after.ctResult));
    t('  ZERO facts activated', R.after.facts.length === 0, 'facts=' + R.after.facts.length);
    // SCOPED to continuation seals. The store also holds the scene's own authored STATE_CHANGE
    // seal for the commit gate — a different mechanism, correctly present on every scene. The
    // first run reported "sealed=1" here and that was my assertion conflating the two kinds.
    const ctSeals = R.after.sealed.filter(s => s.kind === 'continuation');
    t('  no CONTINUATION proposal was sealed', ctSeals.length === 0,
      'continuation seals=' + ctSeals.length + ' of ' + R.after.sealed.length + ' total');
    t('  (the authored state_change seal is present, as it should be)',
      R.after.sealed.some(s => s.kind === 'state_change'),
      JSON.stringify(R.after.sealed.map(s => s.kind)));
  } else if (C.id === 'C-durable') {
    // CASE C. The pass criteria are Roman's, and they are graded by the SHARED module that
    // _continuation_durable_grading_control.mjs proved RED fixture by fixture — so this run cannot
    // repeat run 4's near-miss of paying for a measurement the harness did not make.
    // The reply is graded on its own first; the handler is graded separately afterwards, so a
    // validator bug cannot launder a bad reply into a pass or a good one into a failure.
    say('  PRE-REGISTERED PASS CRITERIA (Roman): pressure_scope durable · >=1 structured introduced'
      + ' institution/collective · future relevance and aliases · no planner-supplied IDs ·'
      + ' no existing canon silently redefined');
    say('\n  — reply grading —');
    gradeDurable(E, R.after, R.setup.ledgerBeforeFull).forEach(c => t('  ' + c.name, c.ok, c.detail));
    say('\n  — handler grading —');
    gradeHandler(E, R.after, R.setup.ledgerBeforeFull).forEach(c => t('  ' + c.name, c.ok, c.detail));
    const rec = R.after.sealed.filter(s => s.kind === 'continuation')[0] || null;
    if (rec) say('  sealed fact: ' + JSON.stringify(rec.fact));
    if (PLANNER_ONLY) {
      say('  (planner-only: author aborted — the sealed fact reaching Grok and rendering as prose'
        + ' remain UNPROVEN live; that is the full-chain test, not this one)');
    } else if (rec) {
      // ── THE FULL CHAIN (Roman's six checks) ────────────────────────────────────────────────
      // Only reached when the author and verifier actually ran. Everything here is about what
      // crossed a boundary, not about planner judgement.
      const AP = (R.authorReq && R.authorReq.request) || '';
      const aliases = ((R.after.sealed.filter(s => s.kind === 'continuation')[0] || {}).pendingEntities || [])
        .reduce((acc, e) => acc.concat([e.label]).concat(e.aliases || []), []).filter(Boolean);
      say('\n  — 1. the proposal sealed WITH aliases —');
      t('  pending entities carry a non-empty alias set', aliases.length >= 2, JSON.stringify(aliases));

      say('\n  — 2. the author receives ONLY reader-facing material —');
      t('  an author request was dispatched', !!AP, 'no author request captured');
      t('  the sealed fact reached it', AP.indexOf(String(rec.fact).slice(0, 48)) >= 0);
      t('    under the already-true heading', /CONTINUATION — ALREADY TRUE/.test(AP));
      t('    with the scene purpose', AP.indexOf(String(E.scene_purpose || '').slice(0, 40)) >= 0);
      t('    and the forward pressure', AP.indexOf(String(E.forward_pressure || '').slice(0, 40)) >= 0);
      [['entity id', /ent:stage:\d+/], ['proposal id', /prop:\d+:\d+/], ['posture hash', /ph-[a-z0-9-]+/],
       ['pressure_scope', /pressure_scope/], ['derivation key', /"derivation"/],
       ['tier/basis vocabulary', /causal_chain|declared_high_authority|"tier"/],
       ['schema field names', /existingRefs|canon_change|pendingEntities|future_relevance/]
      ].forEach(([n, rx]) => {
        const m = AP.match(rx);
        t('    NO ' + n + ' in the author payload', !m, m ? 'found "' + m[0] + '"' : '');
      });

      say('\n  — 3. the prose renders the commission and the demand —');
      say('  prose chars: ' + R.prose.length);
      t('  prose was produced', R.prose.length > 200, 'len=' + R.prose.length);
      const aliasHit = aliases.filter(a => {
        try { return new RegExp('(^|[^A-Za-z0-9])' + String(a).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          + '($|[^A-Za-z0-9])', 'i').test(R.prose); } catch (_) { return false; }
      });
      t('  the body is named in the prose by a CONTROLLED name', aliasHit.length > 0,
        'none of ' + JSON.stringify(aliases) + ' appears in the prose');
      say('    names used: ' + JSON.stringify(aliasHit));
      t('  the demand/petition is rendered', /demand|petition|sealed (?:word|letter)|investigat/i.test(R.prose),
        'no demand language found in the prose');

      say('\n  — 4. delivery activates the EXACT sealed fact —');
      t('  exactly one fact is committed', R.after.facts.length === 1, 'facts=' + R.after.facts.length);
      if (R.after.facts.length) {
        t('    byte-identical to the sealed content', R.after.facts[0].fact === rec.fact,
          JSON.stringify([R.after.facts[0].fact, rec.fact]));
        t('    carrying sealed provenance', R.after.facts[0].provenanceLink === 'sealed',
          String(R.after.facts[0].provenanceLink));
        t('    and referencing this proposal', R.after.facts[0].proposalRef === rec.id,
          String(R.after.facts[0].proposalRef));
      }
      t('  the entity entered the active ledger',
        R.after.ledger.some(x => x.prov === 'continuation_activated'),
        JSON.stringify(R.after.ledger.map(x => x.prov)));

      say('\n  — 5. no verifier or tableau text became canon —');
      const factText = JSON.stringify(R.after.facts);
      [['verifier field names', /decisiveChange|dominant_replacement|slots_check|protagonistStatus/],
       ['tableau', /tableau/i], ['delivery verdict', /DELIVERED|PARTIAL|MISSED/]
      ].forEach(([n, rx]) => {
        const m = factText.match(rx);
        t('  NO ' + n + ' in committed canon', !m, m ? 'found "' + m[0] + '"' : '');
      });
      t('  every committed fact is sealed-provenance',
        R.after.facts.every(f => f.provenanceLink === 'sealed'),
        JSON.stringify(R.after.facts.map(f => f.provenanceLink)));
      t('  the scene card carries no model interpretation',
        !R.after.sceneCard || R.after.sceneCard.source === 'deterministic',
        JSON.stringify(R.after.sceneCard && R.after.sceneCard.source));

      say('\n  — 6. a RETRY duplicates neither the entity nor the fact —');
      const rep = R.replay || null;
      if (rep && rep.tested) {
        say('    replayed _commitTransition twice on the same sealed id');
        t('  still exactly one fact', rep.facts === 1, 'facts=' + rep.facts);
        t('  still exactly one activated entity', rep.activated === 1, 'activated=' + rep.activated);
        t('  and the ledger did not grow', rep.ledgerSize === rep.ledgerSizeBefore,
          'before=' + rep.ledgerSizeBefore + ' after=' + rep.ledgerSize);
      } else {
        // NOT a pass. _commitTransition is wired into the DELIVERED branch keyed on the PREVIOUS
        // scene, so a single-scene run seals but never commits — and a retry check against an
        // uncommitted proposal would be testing the function, not the pipeline.
        say('    RETRY CHECK NOT PERFORMED: ' + ((rep && rep.why) || 'no replay data'));
        t('  the retry check could run (needs a committed fact, i.e. a SECOND scene)', false,
          (rep && rep.why) || 'no replay data');
      }
    }
  } else {
    // PRE-REGISTRATION REVISED FOR THE PERSISTENCE CONTRACT (2026-10-01), before dispatch.
    // The old expectation — "a change or an introduction was proposed" — is no longer a valid
    // test. Case B's dialogue is deliberately the Corridor phrasing ("let whoever governs this
    // place come"), and the contract now states outright that an unnamed continuing pressure is a
    // LEGITIMATE, COMMON answer. Scoring B as a failure for answering scene_local would be scoring
    // it against the ambiguity we just removed. So BOTH branches are acceptable outcomes and the
    // run measures CONSISTENCY, not canon production. Recorded here so the verdict cannot drift
    // after the reply is read.
    say('  B is scored on consistency, not on producing canon: scene_local+null and'
      + ' durable+identified are BOTH pre-registered as acceptable.');
    t('  PRE-REGISTERED: the scope and the payload agree',
      (scope === 'scene_local' && !hasChange && !hasIntro)
      || (scope === 'durable' && (hasChange || hasIntro)),
      'scope=' + JSON.stringify(scope) + ' hasChange=' + hasChange + ' hasIntro=' + hasIntro);
    if (scope === 'scene_local') {
      t('  scene_local: nothing was sealed', !R.after.sealed.some(s => s.kind === 'continuation'),
        JSON.stringify(R.after.sealed.map(s => s.kind)));
      t('  scene_local: ZERO facts activated', R.after.facts.length === 0,
        'facts=' + R.after.facts.length);
      const lp = R.after.localPressures || [];
      t('  scene_local: recorded as explicitly non-durable',
        lp.length >= 1 && lp[lp.length - 1].durable === false, JSON.stringify(lp));
    }
    if (hasChange || hasIntro) {
      t('  the handler SEALED it', R.after.ctResult && R.after.ctResult.outcome === 'sealed',
        JSON.stringify(R.after.ctResult));
      const rec = R.after.sealed.filter(s => s.kind === 'continuation')[0] || null;
      t('  a CONTINUATION-kind seal exists (not the state_change seal)', !!rec,
        JSON.stringify(R.after.sealed.map(s => s.kind)));
      if (rec) {
        say('  sealed fact: ' + JSON.stringify(rec.fact));
        // The author stage is ABORTED on --planner-only, so its absence is the design, not a
        // defect. Note what this run therefore does NOT establish rather than scoring it.
        if (PLANNER_ONLY) {
          say('  (planner-only: author aborted — the sealed fact reaching Grok is STILL UNPROVEN'
            + ' live and remains the open question)');
        } else if (R.authorReq && R.authorReq.request) {
          t('  the sealed fact reached the author payload',
            R.authorReq.request.indexOf(String(rec.fact).slice(0, 50)) >= 0);
          t('    with no entity id', !/ent:stage:\d+/.test(R.authorReq.request));
          t('    with no proposal id', !/prop:\d+:\d+/.test(R.authorReq.request));
        } else t('  an author request was dispatched', false, 'no author request captured');
        t('  at most ONE fact activated', R.after.facts.length <= 1, 'facts=' + R.after.facts.length);
        if (R.after.facts.length === 1) {
          t('    it is sealed-provenance', R.after.facts[0].provenanceLink === 'sealed');
          t('    and byte-identical to the sealed content', R.after.facts[0].fact === rec.fact);
        }
      }
    }
  }
  // PROSE, asserted for EVERY case — a null-change scene must still render. But ONLY on a full
  // run: --planner-only deliberately ABORTS the author request, so asserting prose there would
  // report a false failure against a stage this run never paid for and never dispatched. The
  // honest planner-only statement is that prose is out of scope, printed and not scored.
  say('\n  prose chars: ' + R.prose.length);
  if (PLANNER_ONLY) {
    say('  (planner-only: the author call was aborted by design — prose NOT scored, and this run'
      + ' is therefore NOT evidence about rendering)');
  } else {
    t('  the scene rendered prose', R.prose.length > 200, 'len=' + R.prose.length);
  }

  // no unplanned canon, both cases
  const planned = R.after.sealed.flatMap(p => (p.pendingEntities || []).map(e => e.id));
  const unplanned = R.after.ledger.filter(e => R.setup.ledgerBefore.indexOf(e.id) === -1
    && planned.indexOf(e.id) === -1 && e.prov !== 'continuation_activated' && e.kind !== 'named');
  t('  no unplanned entity entered the ledger', unplanned.length === 0, JSON.stringify(unplanned));
  t('  every fact carries sealed provenance',
    R.after.facts.every(f => f.provenanceLink === 'sealed'),
    JSON.stringify(R.after.facts.map(f => f.provenanceLink)));
}

write('verdict.json', { pass, fail, measured, spentEstimate, authorized: AUTHORIZED,
  cases: Object.keys(results).map(k => ({ id: k, envelope: env(k),
    ctResult: results[k] && results[k].after.ctResult,
    facts: results[k] && results[k].after.facts })) });
say('\n' + pass + '/' + (pass + fail) + ' assertions passed');
say('MEASURED (receipted): $' + measured.toFixed(6)
  + (unreceipted.length ? '  |  UNMEASURED estimated: $' + unmeasuredTotal().toFixed(6)
    + ' across ' + unreceipted.length + ' call(s)' : '')
  + '  |  TOTAL EXPOSURE: $' + (measured + unmeasuredTotal()).toFixed(6)
  + ' of $' + AUTHORIZED.toFixed(2));
say('Artefacts: ' + RUN);
process.exit(fail ? 1 : 0);
