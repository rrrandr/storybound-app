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
const R_VERIFIER = worst(10000, 300);
const PER_CASE = PLANNER_ONLY ? R_PLANNER : (R_PLANNER + R_AUTHOR + R_VERIFIER);
const ATTEMPTS = SAMPLES || CASES.length;
// Seal-gated reserves the WORST CASE: every one of the three planner draws, plus one author and
// one verifier, because a sealing draw may be the last one.
const reserved = SEAL_GATED
  ? (R_PLANNER * MAX_DRAWS + R_AUTHOR + R_VERIFIER)
  : PER_CASE * ATTEMPTS;
say('\nCHAIN RESERVATION (worst case per stage, no fallback doubling)');
say('  planner  : $' + R_PLANNER.toFixed(6));
if (!PLANNER_ONLY) {
  say('  author   : $' + R_AUTHOR.toFixed(6));
  say('  verifier : $' + R_VERIFIER.toFixed(6));
} else { say('  (--planner-only: author and verifier are not reserved and will be aborted)'); }
if (SEAL_GATED) {
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
      try { const j = JSON.parse(text); const ticks = j && j.usage && j.usage.cost_in_usd_ticks;
        if (typeof ticks === 'number') { measured += ticks * 1e-10;
          say('      measured $' + (ticks * 1e-10).toFixed(6) + ' (total $' + measured.toFixed(6) + ')'); }
      } catch (_) {}
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

const results = {};
const samples = [];
const draws = [];

if (SEAL_GATED) {
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

say('\n=== SPEND ===');
say('  running estimate : $' + spentEstimate.toFixed(6));
say('  MEASURED         : $' + measured.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2)
  + '  (' + ((measured / AUTHORIZED) * 100).toFixed(1) + '%)');

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
    say('MEASURED SPEND: $' + measured.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2));
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
  say('MEASURED SPEND: $' + measured.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2));
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
    say('MEASURED SPEND: $' + measured.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2));
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
say('MEASURED SPEND: $' + measured.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2));
say('Artefacts: ' + RUN);
process.exit(fail ? 1 : 0);
