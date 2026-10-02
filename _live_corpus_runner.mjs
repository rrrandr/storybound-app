// LIVE N-SCENE CORPUS RUNNER.
//
// The instrument the creative-quality study needs, and the one thing neither existing runner can
// do: N consecutive scenes with the planner, author and runtime commit verifier all LIVE.
//   _continuation_live_eval.mjs   dispatches live, but caps at two scenes
//   _multi_scene_harness_proof.mjs  walks four scenes, but REPLAYS every response
//
// IT REUSES THE PROVEN LOOP, not a fresh one. The four-scene proof found three harness defects by
// failing (a swallowed advance, a stale mount read, a correctly-rejected repeated institution), and
// its fixes are the three waits below: the gate is checked AT THE POINT OF USE, the mount is waited
// for on real state, and the submit latch is waited for rather than cleared. None of gateShown,
// _stagedSubmitting or _stagedActive is ever written by this runner.
//
// NOTHING DISPATCHES WITHOUT AUTHORIZATION. --estimate-only prints the reservation and exits before
// the browser launches. Without --estimate-only and without --authorize <usd>, it refuses.
//
// PER-STAGE BUDGET DISCIPLINE
//   · live stages are planner, author, verifier — nothing else
//   · the memory extractor is REPLAYED and reserves nothing; bible/other are aborted
//   · ONE ATTEMPT PER STAGE PER SCENE: a second call of the same stage in the same scene is
//     BLOCKED and recorded, never retried into more spend
//   · every dispatch is checked against the remaining authorization BEFORE it goes out
//
// Usage:
//   node _live_corpus_runner.mjs --scenes 3 --estimate-only
//   node _live_corpus_runner.mjs --scenes 3 --dry-replay          (provider-free, $0)
//   node _live_corpus_runner.mjs --scenes 3 --authorize 0.46
import fs from 'fs';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';
import { R_PLANNER, R_AUTHOR, R_VERIFIER, R_SCENE, makeSpendLedger, reservationLines }
  from './_live_spend_ledger.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, readAxis, advanceExpectingGate,
  chooseBranch } from './_fs_story_setup.mjs';
import { plannerFor, fsPlannerCaptured, AUTHOR as REPLAY_AUTHOR, MEMORY, stageOf, refsFromVerifierRequest, isProviderEndpoint,
  verifierVerdict } from './_replay_fixtures.mjs';

const ARG = process.argv.slice(2);
const numArg = (flag, dflt) => { const i = ARG.indexOf(flag);
  return i >= 0 ? Number(ARG[i + 1]) : dflt; };
const strArg = (flag, dflt) => { const i = ARG.indexOf(flag);
  return i >= 0 ? String(ARG[i + 1]) : dflt; };

const SCENES = numArg('--scenes', 3);
const ESTIMATE_ONLY = ARG.includes('--estimate-only');
const DRY_REPLAY = ARG.includes('--dry-replay');
const AUTHORIZED = numArg('--authorize', null);
const INPUT_POLICY = strArg('--input-policy', 'neutral');
// STORY: `fs` is First Sacrifice, the Book the study is about — baked scene 1, the decision prompt,
// the real branch handler. `synthetic` is the bare staged story the four-scene proof established,
// kept as a RELIABILITY FIXTURE only: it answers "does the machinery survive N boundaries", never
// "is the prose any good on the Book we ship".
const STORY = strArg('--story', 'fs');
// REPLAY A SPECIFIC RECORDED PLANNER REPLY. The live FS smoke test stopped before the author and
// the dry path did NOT reproduce it, which means the difference was in the reply, not in being
// live — and that run PRESERVED its reply. Pointing dry mode at that file turns a paid mystery into
// a free experiment. Any path here must be a recorded response file; nothing is authored.
const PLANNER_FIXTURE = strArg('--planner-fixture', null);
// For FS the arm maps onto the product's own axis. A and B are its two buttons; C takes the SAME
// axis choice as B and diverges in say/do, because the axis is binary and no third button exists.
const ARM = strArg('--arm', 'A');
const BRANCH = strArg('--branch', 'defy');   // synthetic story only

if (!['fs', 'synthetic'].includes(STORY)) {
  console.error('REFUSED: --story must be fs or synthetic.');
  process.exit(2);
}
if (STORY === 'fs' && !['A', 'B', 'C'].includes(ARM)) {
  console.error('REFUSED: --arm must be A, B or C.');
  process.exit(2);
}
if (!(SCENES >= 1 && SCENES <= 10)) {
  console.error('REFUSED: --scenes must be 1..10 (a CG issue is 10 scenes).');
  process.exit(2);
}
if (!['neutral', 'branch-consistent'].includes(INPUT_POLICY)) {
  console.error('REFUSED: --input-policy must be neutral or branch-consistent.');
  process.exit(2);
}
// THE ABORT BEFORE ANY DISPATCH. Three ways to run: estimate, dry replay, or authorized.
if (!ESTIMATE_ONLY && !DRY_REPLAY && !(AUTHORIZED > 0)) {
  console.error('REFUSED: this run dispatches real provider calls.');
  console.error('  node _live_corpus_runner.mjs --scenes ' + SCENES + ' --estimate-only');
  console.error('  node _live_corpus_runner.mjs --scenes ' + SCENES + ' --dry-replay');
  console.error('  node _live_corpus_runner.mjs --scenes ' + SCENES + ' --authorize <usd>');
  process.exit(2);
}
const LIVE = !ESTIMATE_ONLY && !DRY_REPLAY;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN = '_live_corpus_out/run_' + stamp;
fs.mkdirSync(RUN, { recursive: true });
const say = (s) => { console.log(s); fs.appendFileSync(RUN + '/log.txt', s + '\n'); };
const write = (n, s) => fs.writeFileSync(RUN + '/' + n,
  typeof s === 'string' ? s : JSON.stringify(s, null, 2));

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; say('  ok   ' + n); }
  else { fail++; say('  FAIL ' + n + (d ? '  — ' + d : '')); } };

say('=== LIVE N-SCENE CORPUS RUNNER ===');
say('  scenes       : ' + SCENES);
say('  mode         : ' + (ESTIMATE_ONLY ? 'ESTIMATE ONLY ($0, no browser)'
  : (DRY_REPLAY ? 'DRY REPLAY (provider-free, $0)' : 'LIVE, authorized $' + AUTHORIZED.toFixed(2))));
say('  branch       : ' + BRANCH);
say('  input policy : ' + INPUT_POLICY);
say('  output       : ' + RUN);

// ── THE RESERVATION, from the one module that defines it ────────────────────
// FS'S SCENE 1 IS NOT GENERATED. It is a fixed authored package, displayed and committed with ZERO
// provider calls (measured: _fs_scene1_preflight.mjs). So an N-scene FS path buys N-1 generated
// scenes, and reserving N would over-reserve by a whole scene. The synthetic story generates every
// scene including the first, so there it is N.
const LIVE_SCENES = (STORY === 'fs') ? Math.max(0, SCENES - 1) : SCENES;
const reserved = R_SCENE * LIVE_SCENES;
say('\nRESERVATION (worst case per stage, from _live_spend_ledger.mjs)');
reservationLines().forEach(say);
if (STORY === 'fs') {
  say('  scene 1 is FS\'s BAKED package — fixed, authored, ZERO provider calls, not reserved');
  say('  × ' + LIVE_SCENES + ' GENERATED scene(s) of ' + SCENES + ' = $' + reserved.toFixed(6));
} else {
  say('  × ' + LIVE_SCENES + ' scene(s) = $' + reserved.toFixed(6));
}
say('  the memory extractor is REPLAYED in every mode and reserves nothing');
if (LIVE && reserved > AUTHORIZED) {
  say('\nREFUSED BEFORE DISPATCH: reserved $' + reserved.toFixed(6)
    + ' exceeds the authorized $' + AUTHORIZED.toFixed(2));
  write('refusal.json', { reserved, authorized: AUTHORIZED, scenes: SCENES, dispatched: 0 });
  process.exit(3);
}
if (LIVE) say('  within authorization — $' + (AUTHORIZED - reserved).toFixed(6) + ' headroom');
if (ESTIMATE_ONLY) {
  say('\nESTIMATE ONLY — no browser launched, nothing dispatched. $0 spent.');
  write('estimate.json', { scenes: SCENES, perScene: R_SCENE, reserved,
    stages: { planner: R_PLANNER, author: R_AUTHOR, verifier: R_VERIFIER } });
  process.exit(0);
}

// ── PLAYER INPUT ────────────────────────────────────────────────────────────
// A DESIGN CHOICE THAT SHAPES THE STUDY, recorded in the manifest rather than left implicit.
// `neutral`: every scene after the branch point takes the SAME input on every path, so any
//   divergence downstream is attributable to the branch decision alone. Cleanest attribution, but
//   a passive input repeated six times could itself induce stalling — which would confound H1.
// `branch-consistent`: in-character inputs per path. More realistic, but then a path differs from
//   another in six ways, not one, and H2 stops being a clean comparison.
// The study's preregistration must state which was used. Default is `neutral`.
const BRANCH_INPUTS = {
  comply: { action: 'I hold the line. I keep the gossamer band on and I do not move from the witness row.',
    dialogue: 'Nothing. I am a witness. I hold.' },
  defy: { action: 'I tear the gossamer band off my wrist and go to Seren before the wish finishes turning.',
    dialogue: 'Seren, stop — take it back, take the words back now.' },
  withdraw: { action: 'I say nothing, step back out of the witness row, and walk out of the assembly.',
    dialogue: 'Nothing. I leave before anyone can ask me to answer for her.' }
};
const NEUTRAL = { action: 'I take stock of where this leaves me and keep moving.',
  dialogue: 'Nothing yet. I want to see what they do next.' };
const inputFor = (scene) => {
  if (scene === 1) return BRANCH_INPUTS[BRANCH] || BRANCH_INPUTS.defy;
  return INPUT_POLICY === 'neutral' ? NEUTRAL : (BRANCH_INPUTS[BRANCH] || BRANCH_INPUTS.defy);
};

// ── SPEND ────────────────────────────────────────────────────────────────────
// Read a recorded provider response file and return its content string. Throws rather than
// falling back: a fixture that silently resolves to something else is how a harness lies.
const recordedPlannerReply = (path) => {
  const j = JSON.parse(fs.readFileSync(path, 'utf8'));
  const c = j.content
    || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  if (!c || c.indexOf('{') < 0) throw new Error('no planner content in ' + path);
  return c;
};

const ledger = makeSpendLedger(say);
let spentEstimate = 0;
const RES_OF = { planner: R_PLANNER, author: R_AUTHOR, verifier: R_VERIFIER };

const browser = await chromium.launch();
const page = await browser.newPage();

let sceneNo = 1;
const calls = [];          // { scene, stage, outcome }
const blocked = [];        // { scene, stage, why }
const verifierSeen = [];   // { scene, refs }
const refusals = [];       // the app's own console refusals
page.on('console', (m) => {
  const txt = m.text();
  // WIDE, AND THAT IS THE POINT. The live FS smoke run stopped before the author and the reason was
  // NOT in this log, because the filter was [STAGED:SUBMIT]|[STAGED:GUARD]|Blocked and the app
  // reports planner adjudication under [CG:…], [OBJECTIVE:REJECTED] and [CONTINUATION:…]. The app
  // had said why and the harness discarded it — the same narrow-filter mistake already fixed in
  // _fs_scene1_preflight.mjs and _fs_planner_capture.mjs and not carried here. $0.020578 bought a
  // result that could not be diagnosed.
  if (/\[STAGED|\[CG|\[OBJECTIVE:REJECTED\]|\[CONTINUATION|\[SCENE-DECISION\]|\[INTIMATE|\[PREVIEW|\[BAKED|\[TIERED|Blocked|reject|stale|refus/i
    .test(txt)) refusals.push({ scene: sceneNo, txt });
});

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url();
  let raw = null; try { raw = req.postData(); } catch (_) {}
  if (!isProviderEndpoint(url)) {
    try { await route.abort(); } catch (_) {} return;
  }
  let sys = '', usr = '', body = null;
  try { body = JSON.parse(raw || '{}');
    sys = String((body.messages || [])[0]?.content || '');
    usr = String((body.messages || [])[1]?.content || ''); } catch (_) {}
  const stage = stageOf(sys);
  const give = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c }) });

  // The memory extractor is replayed in EVERY mode. It is not part of the question this runner
  // measures, and replaying it keeps its cost out of the reservation honestly rather than by hope.
  if (stage === 'memory') { calls.push({ scene: sceneNo, stage, outcome: 'replayed' }); return give(MEMORY); }
  if (stage === 'bible' || stage === 'other') {
    calls.push({ scene: sceneNo, stage, outcome: 'aborted' });
    try { await route.abort(); } catch (_) {} return;
  }

  // ONE ATTEMPT PER STAGE PER SCENE. A retry is a second charge for the same question; this runner
  // blocks it and records it rather than quietly paying twice.
  const already = calls.some(c => c.scene === sceneNo && c.stage === stage
    && (c.outcome === 'dispatched' || c.outcome === 'replayed'));
  if (already) {
    blocked.push({ scene: sceneNo, stage, why: 'second attempt at the same stage in one scene' });
    calls.push({ scene: sceneNo, stage, outcome: 'blocked_duplicate' });
    try { await route.abort(); } catch (_) {} return;
  }

  if (DRY_REPLAY) {
    calls.push({ scene: sceneNo, stage, outcome: 'replayed' });
    if (stage === 'planner') {
      // FS's CG planner wants a different reply shape from the synthetic story's continuation
      // envelope — local_objective, local_objective_actor, posture_read, present, reserved,
      // aftermath. Serving the synthetic fixture on the FS path draws "[OBJECTIVE:REJECTED] no
      // local_objective…", a FIXTURE failure that reads like a product one. fsPlannerCaptured()
      // throws rather than falling back, so that can no longer happen silently.
      try {
        if (PLANNER_FIXTURE) return give(recordedPlannerReply(PLANNER_FIXTURE));
        return give(STORY === 'fs' ? fsPlannerCaptured() : plannerFor(sceneNo));
      }
      catch (e) { say('  REFUSED: ' + e.message); try { await route.abort(); } catch (_) {} return; } }
    if (stage === 'author') return give(REPLAY_AUTHOR);
    if (stage === 'verifier') {
      const refs = refsFromVerifierRequest(usr);
      verifierSeen.push({ scene: sceneNo, refs });
      return give(verifierVerdict(refs));
    }
    try { await route.abort(); } catch (_) {} return;
  }

  // ── LIVE ──
  const est = estimateUsd(body || { messages: [], max_tokens: 0 },
    (body && body.model) || 'grok-4-1-fast-reasoning').estimate || RES_OF[stage] || 0;
  if (spentEstimate + est > AUTHORIZED) {
    say('    [BUDGET] blocking ' + stage + ' on scene ' + sceneNo + ' — $'
      + est.toFixed(6) + ' would exceed the authorized $' + AUTHORIZED.toFixed(2)
      + ' (committed so far $' + spentEstimate.toFixed(6) + ')');
    blocked.push({ scene: sceneNo, stage, why: 'would exceed authorization' });
    calls.push({ scene: sceneNo, stage, outcome: 'blocked_budget' });
    try { await route.abort(); } catch (_) {} return;
  }
  spentEstimate += est;
  say('    [DISPATCH] ' + stage + ' scene ' + sceneNo + ' — estimated $' + est.toFixed(6)
    + ' (committed $' + spentEstimate.toFixed(6) + ' of $' + AUTHORIZED.toFixed(2) + ')');
  if (stage === 'verifier') verifierSeen.push({ scene: sceneNo, refs: refsFromVerifierRequest(usr) });
  calls.push({ scene: sceneNo, stage, outcome: 'dispatched' });
  let resp = null;
  try { resp = await route.fetch(); } catch (e) {
    say('    [DISPATCH] ' + stage + ' FAILED in transit — ' + (e && e.message));
    try { await route.abort(); } catch (_) {} return;
  }
  const text = await resp.text();
  write('s' + sceneNo + '_' + stage + '.json', text);
  ledger.recordCost(stage, text, est);
  return route.fulfill({ status: resp.status(), contentType: 'application/json', body: text });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function'
  && typeof window._advanceStagedBeat === 'function', { timeout: 20000 });

// ── BRINGING UP THE STORY ───────────────────────────────────────────────────
let fsAxis = null, fsSetup = null;
if (STORY === 'fs') {
  // THE REAL FS SEQUENCE, from _fs_story_setup.mjs — the same module the FS preflight uses, so the
  // runner and the preflight cannot disagree about what the path is. Every step is production code.
  say('\nBRINGING UP FIRST SACRIFICE (the Book the study is about)');
  const def = await findFSDef(page);
  if (!def) { say('REFUSED: starter_first_sacrifice is not in STARTER_STORIES.'); process.exit(4); }
  const mount = await launchFS(page, def);
  t('FS scene 1 mounted from its baked package', !!mount.mountedAt);
  t('and it cost nothing — no provider call to display it',
    calls.filter(c => c.stage === 'planner' || c.stage === 'author').length === 0,
    JSON.stringify(calls));
  const unlock = await unlockFS(page, 'corpus-runner');
  t('the production unlock committed scene 1 as scenes[0]',
    unlock.returned === true && unlock.state.sceneCount === 1,
    JSON.stringify(unlock.returned) + ' scenes=' + unlock.state.sceneCount);
  const fin = await finalizePreview(page);
  t('the preview was finalized through the production function',
    fin.ran === true && fin.after.previewActive === false, JSON.stringify(fin));
  fsAxis = await readAxis(page);
  t('the authored decision axis is readable', !!fsAxis, JSON.stringify(fsAxis));
  say('  axis: "' + (fsAxis && fsAxis.axis) + '"');
  fsSetup = { mount, unlock: unlock.state, finalize: fin, axis: fsAxis };
} else {
  // THE SYNTHETIC RELIABILITY FIXTURE. Bare staged story, every scene generated. It is NOT the
  // Book and answers no question about its prose.
  say('\nBRINGING UP THE SYNTHETIC RELIABILITY FIXTURE (not First Sacrifice)');
  await page.evaluate(() => {
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-livecorpus';
    window.state.world = 'Fatelands';
    window.state.worldSubtype = 'arcane_binding';
    window.state.picks = { flavor: 'Arcane Binding', world: 'Fatelands' };
    window.state.storyLength = 'fling';
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state.turnCount = 1;
    window.state.renderMode = 'staged_story_mode';
    window.state._cgScreenplayMode = true;
  });
}

// Read the scene through to the say/do gate, exactly as a reader does. gateShown is never written.
const readToGate = () => page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const st = () => { const a = window.state._stagedActive || null;
    return a ? { beat: a.currentBeatIdx, last: (a.plan && a.plan.beats || []).length - 1,
      gateShown: !!a.gateShown, microShown: !!a.microShown } : null; };
  if (!st()) return { ok: false, why: 'no staged session' };
  let micros = 0;
  for (let i = 0; i < 200; i++) {
    const cur = st(); if (!cur || cur.gateShown) break;
    const prev = cur.beat;
    try { window._advanceStagedBeat(); } catch (_) {}
    await sleep(50);
    const nxt = st();
    if (nxt && nxt.beat === prev && !nxt.gateShown) {
      if (!nxt.microShown && typeof window._resolveMicroDecision === 'function') {
        try { window._resolveMicroDecision(0); micros++; } catch (_) {}
        await sleep(70);
      } else await sleep(100);
    }
  }
  return { ok: true, after: st(), micros };
});

const snapshot = () => page.evaluate(() => {
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  let proj = ''; try { proj = String(window._sbLatestProseText(window.state) || ''); } catch (_) {}
  const verdicts = ((window.state._lastPerProposalAdjudication || {}).verdicts) || {};
  return {
    prose: proj,
    turnCount: window.state.turnCount,
    facts: cs.facts.map(f => ({ ref: f.proposalRef, content: f.content || null })),
    committedThrough: cs._committedThroughScene,
    pending: (window._pendingSealedForScene(window.state.turnCount) || []).map(p => p.kind),
    ctOutcome: (window.state._lastContinuationResult || {}).outcome || null,
    activatedLabels: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
      .map(k => reg[k].label || k),
    registerSize: Object.keys(reg).length,
    verdicts: Object.keys(verdicts).map(k => ({ ref: k, delivery: verdicts[k].delivery || null,
      reason: verdicts[k].reason || null }))
  };
});

// ── THE SCENE LOOP, as proven by the four-scene harness ─────────────────────
// FS ARMS MAP ONTO THE PRODUCT'S OWN AXIS. A and B are its two buttons. C takes the SAME button as
// B and diverges only in the words the reader then types, because the axis is binary — there is no
// third button and no reader can take a third axis choice.
const FS_ARMS = {
  A: { button: 'A', action: 'I turn away from the clearing and walk, and I do not look at any of them.',
       dialogue: 'Nothing. I have nothing to say to any of you.' },
  B: { button: 'B', action: 'I stay where I am and keep my eyes on Julian, waiting to see what he does next.',
       dialogue: 'I am still here. Say the rest of it.' },
  C: { button: 'B', action: 'I stay, and I say out loud what everyone in this clearing is pretending not to know.',
       dialogue: 'Say whose wish it really was. Say it where they can all hear you.' }
};
const fsInputFor = (scene) => {
  if (scene === 2) return FS_ARMS[ARM];                       // the divergence point
  return INPUT_POLICY === 'neutral' ? NEUTRAL : FS_ARMS[ARM]; // later scenes
};

const history = [];
// WHY THE LOOP STOPPED, if it did. An early stop with no recorded reason is what made the live
// smoke run unreadable; this is written into the manifest either way.
let stopReason = null;
for (let s = 1; s <= SCENES; s++) {
  sceneNo = s;
  say('\n── scene ' + s + '/' + SCENES);

  // FS SCENE 1 IS ALREADY ON THE PAGE. It is the baked package, displayed and committed by the
  // setup above with zero provider calls. There is nothing to advance into and nothing to buy, so
  // the loop records it and moves on. Treating it as a generated scene would both over-reserve and
  // overwrite the authored opening the study scores as its baseline.
  if (STORY === 'fs' && s === 1) {
    const snap0 = await snapshot();
    const prose0 = String((fsSetup && fsSetup.unlock && fsSetup.unlock.scene0) || snap0.prose || '');
    write('scene_01_prose.txt', prose0);
    t('scene 1: the BAKED opening was captured (>=200 chars)', prose0.length >= 200,
      'len=' + prose0.length);
    t('scene 1: it cost nothing — no planner, no author',
      calls.filter(c => c.scene === 1 && (c.stage === 'planner' || c.stage === 'author')).length === 0);
    history.push({ scene: 1, baked: true, input: null, gate: null, latchClear: true,
      proseLen: prose0.length, proseText: prose0, stages: [], verifierRefs: [], facts: snap0.facts,
      activatedLabels: snap0.activatedLabels, verdicts: snap0.verdicts,
      committedThrough: snap0.committedThrough, pending: snap0.pending, ctOutcome: snap0.ctOutcome,
      blocked: [], refusals: [] });
    say('   BAKED opening: ' + prose0.length + ' chars, no dispatch');
    continue;
  }

  // THE DECISION GATE, satisfied through the product's own handler. On FS the first advance out of
  // scene 1 REFUSES until the reader's choice is recorded: _advanceStagedScene mounts the two-button
  // prompt and requests nothing. The prompt's handler records the choice AND fires the resume, so
  // the continuation is requested by production code rather than by a second call from here.
  if (STORY === 'fs' && s === 2) {
    const gatedAdv = await advanceExpectingGate(page,
      'placeholder — the gate must refuse this', 'placeholder');
    t('scene 2: the advance REFUSED until the choice was recorded',
      gatedAdv.promptMounted === true, JSON.stringify(gatedAdv));
    t('scene 2: and it dispatched nothing while unrecorded',
      calls.filter(c => c.stage === 'planner' || c.stage === 'author').length === 0,
      JSON.stringify(calls.filter(c => c.stage === 'planner' || c.stage === 'author')));
    const picked = await chooseBranch(page, FS_ARMS[ARM].button);
    t('scene 2: the choice was recorded by the prompt\'s own handler',
      !!(picked.after.decision1 && picked.after.decision1.choice), JSON.stringify(picked.after));
    say('   arm ' + ARM + ' -> button ' + FS_ARMS[ARM].button + ' -> recorded '
      + JSON.stringify(picked.after.decision1 && picked.after.decision1.choice)
      + '  [click via ' + picked.route + ']');
    // The resume the prompt fired IS the continuation request. Fall through to the waits below
    // rather than advancing again, which would be a second request for the same scene.
  }

  // THE GATE IS CHECKED AT THE POINT OF USE. A scene's completion tail mounts a FRESH staged
  // session whose gateShown starts false, so a reading taken earlier goes stale and the advance is
  // silently refused with "[STAGED:SUBMIT] Blocked — gate not yet open".
  if (s > 1 && !(STORY === 'fs' && s === 2)) {
    const gd = Date.now() + 120000;
    let open = false;
    while (Date.now() < gd) {
      open = await page.evaluate(() => { const a = window.state._stagedActive;
        return !!(a && a.gateShown); });
      if (open) break;
      await readToGate();
      await new Promise(r => setTimeout(r, 500));
    }
    t('scene ' + s + ': the gate was OPEN at the moment of submission', open === true,
      'still closed — the advance would be refused');
    if (!open) {
      stopReason = 'scene ' + s + ': the say/do gate never opened, so the advance would be refused. '
        + 'The previous scene did not reach its gate.';
      say('  ABORTING the loop: submitting into a closed gate measures nothing.');
      say('  STOP REASON: ' + stopReason);
      break;
    }
  }
  const inp = (STORY === 'fs') ? fsInputFor(s) : inputFor(s);
  if (!(STORY === 'fs' && s === 2)) {
    await page.evaluate(({ a, d }) => { try { window._advanceStagedScene(a, d); } catch (_) {} },
      { a: inp.action, d: inp.dialogue });
  }

  // Wait for the AUTHOR to answer, then for the session to MOUNT — both on real state.
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline && !calls.some(c => c.scene === s && c.stage === 'author'
    && (c.outcome === 'dispatched' || c.outcome === 'replayed'))) {
    await new Promise(r => setTimeout(r, 1000));
  }
  const mountDeadline = Date.now() + 180000;
  let mounted = false;
  while (Date.now() < mountDeadline) {
    mounted = await page.evaluate(() => { const a = window.state._stagedActive;
      return !!(a && a.plan && Array.isArray(a.plan.beats) && a.plan.beats.length > 0); });
    if (mounted) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  t('scene ' + s + ': the staged scene MOUNTED', mounted === true, 'no _stagedActive.plan.beats');

  const gate = await readToGate();
  const snap = await snapshot();
  // PER-SCENE PROSE CAPTURE, from the app's own projection. No fixture text is ever written into
  // _commitScene: if the projection is empty, that is the finding.
  write('scene_' + String(s).padStart(2, '0') + '_prose.txt', snap.prose || '');
  // THE STRONG ASSERTION, carried over from the FS preflight. A length-only check PASSED on the
  // live smoke run while the projection was still the 7,699-byte baked opening — the run looked
  // 12/14 while having generated nothing. A generated scene's prose must be non-empty AND
  // byte-different from the baked scene 1, or there is no generated scene.
  const proseNow = String(snap.prose || '');
  t('scene ' + s + ': prose captured from the app projection (>=40 chars)',
    proseNow.length >= 40, 'proseLen=' + proseNow.length);
  // SCOPED TO FS, and the scoping is the point. On First Sacrifice scene 1 is a FIXED baked
  // package, so a later scene whose projection equals it means nothing was generated — that is the
  // failure this assertion exists to catch, and it caught it on the live run.
  //
  // On the SYNTHETIC fixture it is not a failure at all: every scene replays ONE recorded author
  // response, so identical prose scene to scene is the documented artifact (see the four-scene
  // proof's own header). Asserting against it flagged the fixture working as designed — my
  // regression, introduced when I carried the FS assertion over without carrying its precondition.
  if (STORY === 'fs' && s > 1) {
    const baked = String((history[0] && history[0].proseText) || '');
    const isStale = !!baked && proseNow === baked;
    t('scene ' + s + ': the prose is NOT the baked opening — the projection is not stale',
      proseNow.length > 0 && !isStale,
      isStale ? 'IDENTICAL to the baked opening (' + baked.length + ' chars) — nothing was generated'
        : 'len=' + proseNow.length);
    if (isStale && !stopReason) {
      stopReason = 'scene ' + s + ': the projection was still the baked opening — no generated prose';
    }
  } else if (s > 1) {
    say('   (synthetic fixture: prose equal to an earlier scene is expected — one replayed author'
      + ' response — so no staleness assertion applies here)');
  }

  // Wait for the submit latch rather than clearing it.
  const latchDeadline = Date.now() + 120000;
  let latchClear = false;
  while (Date.now() < latchDeadline) {
    latchClear = await page.evaluate(() => window.state._stagedSubmitting !== true);
    if (latchClear) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  if (s < SCENES) t('scene ' + s + ': submit latch cleared before the next advance',
    latchClear === true, 'still latched — the next advance would be blocked');

  const stages = calls.filter(c => c.scene === s);
  history.push({ scene: s, input: inp, gate: gate.after || null, latchClear,
    proseLen: (snap.prose || '').length, proseText: String(snap.prose || ''),
    stages: stages.map(c => c.stage + ':' + c.outcome),
    verifierRefs: (verifierSeen.find(v => v.scene === s) || {}).refs || [],
    facts: snap.facts, activatedLabels: snap.activatedLabels, verdicts: snap.verdicts,
    committedThrough: snap.committedThrough, pending: snap.pending, ctOutcome: snap.ctOutcome,
    blocked: blocked.filter(b => b.scene === s),
    refusals: refusals.filter(r => r.scene === s).map(r => r.txt) });
  const h = history[history.length - 1];
  say('   stages   : ' + JSON.stringify(h.stages.filter(x => !/^(bible|other):/.test(x))));
  say('   prose    : ' + h.proseLen + ' chars   facts: ' + h.facts.length
    + '   activated: ' + h.activatedLabels.length + '   verdicts: ' + h.verdicts.length);
  if (h.verifierRefs.length) say('   verifier asked about: ' + JSON.stringify(h.verifierRefs));
  if (h.blocked.length) say('   BLOCKED  : ' + JSON.stringify(h.blocked));
  if (h.refusals.length) {
    // COUNT PLUS A SAMPLE. Dumping the whole array inline turned one dry run's log into 220KB and
    // made it unreadable; the full list is in manifest.json, where it belongs.
    say('   app said : ' + h.refusals.length + ' line(s); notable:');
    h.refusals.filter(x => /REJECT|stale|Blocked|refus|not accepted/i.test(x)).slice(0, 6)
      .forEach(x => say('       · ' + x.slice(0, 180)));
  }
}
await browser.close();

// ── WHAT HAPPENED, per scene ────────────────────────────────────────────────
say('\n── PER-SCENE RESULT TABLE');
say('  scene | prose | facts | activated | verdicts | refs | stages');
history.forEach(h => say('  ' + String(h.scene).padStart(5) + ' | '
  + String(h.proseLen).padStart(5) + ' | ' + String(h.facts.length).padStart(5) + ' | '
  + String(h.activatedLabels.length).padStart(9) + ' | '
  + String(h.verdicts.length).padStart(8) + ' | ' + String(h.verifierRefs.length).padStart(4)
  + ' | ' + h.stages.filter(x => !/^(bible|other):/.test(x)).join(',')));

const manifest = {
  mode: DRY_REPLAY ? 'dry_replay' : 'live',
  story: STORY,
  plannerFixture: PLANNER_FIXTURE,
  arm: (STORY === 'fs') ? ARM : null,
  armButton: (STORY === 'fs') ? FS_ARMS[ARM].button : null,
  axis: fsAxis,
  fsSetup,
  bakedScene1: STORY === 'fs',
  liveScenes: LIVE_SCENES,
  storyNote: STORY === 'fs'
    ? 'First Sacrifice: scene 1 is the FIXED baked package (zero provider calls) and scenes 2+ are '
      + 'generated. The scene-1 decision is recorded through the product\'s own two-button prompt.'
    : 'SYNTHETIC RELIABILITY FIXTURE — not First Sacrifice. Every scene is generated from bare '
      + 'state. It measures whether the machinery survives N boundaries and says NOTHING about the '
      + 'prose of the Book we ship.',
  scenes: SCENES, branch: BRANCH, inputPolicy: INPUT_POLICY,
  inputPolicyNote: INPUT_POLICY === 'neutral'
    ? 'Scenes after the branch point take an IDENTICAL neutral input on every path, so downstream '
      + 'divergence is attributable to the branch decision alone. Risk: a passive input repeated '
      + 'every scene could itself induce stalling, which would confound H1.'
    : 'Each scene takes an in-character input for this path. More realistic, but paths then differ '
      + 'in many ways rather than one, which weakens H2 as a comparison.',
  authorized: LIVE ? AUTHORIZED : 0,
  reserved, perScene: R_SCENE,
  stageReservations: { planner: R_PLANNER, author: R_AUTHOR, verifier: R_VERIFIER },
  completedScenes: history.length,
  stopReason,
  stoppedEarly: history.length < SCENES,
  // THE SEAL OUTCOME PER SCENE, stated rather than left to be inferred from counts.
  sealOutcome: history.map(h => ({ scene: h.scene,
    pending: h.pending || [], facts: (h.facts || []).length,
    activated: (h.activatedLabels || []).length,
    verdicts: h.verdicts || [], refs: h.verifierRefs || [],
    continuationOutcome: h.ctOutcome || null })),
  stageOrder: history.map(h => ({ scene: h.scene, stages: h.stages })),
  gateStates: history.map(h => ({ scene: h.scene, gate: h.gate, latchClear: h.latchClear })),
  history, blocked,
  checks: { pass, fail }
};
write('manifest.json', manifest);

if (LIVE) {
  const rep = ledger.spendReport(AUTHORIZED);
  manifest.spend = rep;
  write('manifest.json', manifest);
} else {
  say('\nSPEND: $0 — nothing was dispatched (' + manifest.mode + ').');
}

if (stopReason) say('\nSTOPPED EARLY: ' + stopReason);
// EVERY APP REFUSAL, in order. These are what the live smoke run threw away.
const allRefusals = history.reduce((a, h) => a.concat((h.refusals || []).map(x => 's' + h.scene + ' ' + x)), []);
if (allRefusals.length) {
  say('\nWHAT THE APP SAID (' + allRefusals.length + ' line(s), in order):');
  allRefusals.slice(0, 25).forEach(x => say('  · ' + x.slice(0, 190)));
  if (allRefusals.length > 25) say('  … ' + (allRefusals.length - 25) + ' more in manifest.json');
}
say('\n' + pass + '/' + (pass + fail) + ' per-scene checks passed'
  + (history.length < SCENES ? '   (loop stopped at scene ' + history.length + ' of ' + SCENES + ')' : ''));
process.exit(fail ? 1 : 0);
