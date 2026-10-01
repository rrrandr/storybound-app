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
import { gradeDurable, gradeHandler } from './_continuation_durable_grader.mjs';

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
const reserved = PER_CASE * CASES.length;
say('\nCHAIN RESERVATION (worst case per stage, no fallback doubling)');
say('  planner  : $' + R_PLANNER.toFixed(6));
if (!PLANNER_ONLY) {
  say('  author   : $' + R_AUTHOR.toFixed(6));
  say('  verifier : $' + R_VERIFIER.toFixed(6));
} else { say('  (--planner-only: author and verifier are not reserved and will be aborted)'); }
say('  per case : $' + PER_CASE.toFixed(6) + '  x ' + CASES.length + ' case(s)');
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

const runCase = async (C) => {
  const calls = [];
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
    if (spentEstimate + est > AUTHORIZED) {
      say('    [GUARD] ABORT ' + stage + ' — would exceed authorization');
      try { await route.abort(); } catch (_) {} return;
    }
    spentEstimate += est;
    say('    [DISPATCH] ' + stage + '  ' + (raw || '').length + 'ch  est $' + est.toFixed(6));
    write(C.id + '_request_' + stage + '_' + (calls.length + 1) + '.json', raw || '');
    try {
      const FT = stage === 'author' ? 300000 : (stage === 'planner' ? 120000 : 90000);
      const resp = await route.fetch({ timeout: FT });
      const text = await resp.text();
      write(C.id + '_response_' + stage + '_' + (calls.length + 1) + '.json', text);
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

  const setup = await page.evaluate(() => {
    window._continuationProposalSchema = true;            // EXPLICIT OPT-IN
    window.state = window.state || {};
    // ── A CORRIDOR / ORIGINAL STORY. No _starterId, so no seed and no plan, so NO authored row
    // owns this scene. The first two-case run targeted First Sacrifice scene 2, where an authored
    // row DOES own the objective and `_usePlanSpine` makes the plan win outright — both cases
    // returned the seed's row-2 goal and dynamic canon could not be evaluated. This also exercises
    // the universal (no-seed) path, which the register audit flagged as unverified.
    delete window.state._starterId;
    window.state.storyId = 'live-corridor-' + Date.now();
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
  });
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
        return { id: e.id, kind: e.kind, label: e.label, aliases: e.aliases || [], prov: e.provenance }; })
  }));
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
  let envelope = null;
  if (pc) {
    const content = contentOf(pc.response);
    write(C.id + '_planner_content.txt', content);
    try { const m = content.match(/\{[\s\S]*\}/); if (m) envelope = JSON.parse(m[0]); } catch (_) {}
  }
  // PROSE IS EXTRACTED FOR EVERY CASE, not only when a change was proposed — a null-change run
  // must still confirm the scene rendered. Previously this sat inside the hasChange branch and so
  // never ran on the two runs that mattered.
  const authorResp = calls.filter(c => c.stage === 'author' && c.response).pop() || null;
  const prose = authorResp ? contentOf(authorResp.response) : '';
  if (prose) write(C.id + '_prose.txt', prose);
  write(C.id + '_state_after.json', after);
  write(C.id + '_envelope.json', envelope || {});
  return { calls, setup, after, envelope, prose,
    author: authorResp,
    authorReq: calls.filter(c => c.stage === 'author').pop() || null };
};

const results = {};
for (const C of CASES) {
  say('\n──────── CASE ' + C.id + ': ' + C.label + ' ────────');
  say('  posture: ' + JSON.stringify(C.action));
  try { results[C.id] = await runCase(C); }
  catch (e) { say('  CASE ABORTED: ' + (e && e.message)); results[C.id] = null; }
}

say('\n=== SPEND ===');
say('  running estimate : $' + spentEstimate.toFixed(6));
say('  MEASURED         : $' + measured.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2)
  + '  (' + ((measured / AUTHORIZED) * 100).toFixed(1) + '%)');

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
