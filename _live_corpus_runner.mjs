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
import { plannerFor, AUTHOR as REPLAY_AUTHOR, MEMORY, stageOf, refsFromVerifierRequest, isProviderEndpoint,
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
const BRANCH = strArg('--branch', 'defy');

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
const reserved = R_SCENE * SCENES;
say('\nRESERVATION (worst case per stage, from _live_spend_ledger.mjs)');
reservationLines().forEach(say);
say('  × ' + SCENES + ' scene(s) = $' + reserved.toFixed(6));
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
  if (/\[STAGED:SUBMIT\]|\[STAGED:GUARD\]|Blocked/.test(txt)) refusals.push({ scene: sceneNo, txt });
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
    if (stage === 'planner') { try { return give(plannerFor(sceneNo)); }
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
const history = [];
for (let s = 1; s <= SCENES; s++) {
  sceneNo = s;
  say('\n── scene ' + s + '/' + SCENES);
  // THE GATE IS CHECKED AT THE POINT OF USE. A scene's completion tail mounts a FRESH staged
  // session whose gateShown starts false, so a reading taken earlier goes stale and the advance is
  // silently refused with "[STAGED:SUBMIT] Blocked — gate not yet open".
  if (s > 1) {
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
    if (!open) { say('  ABORTING the loop: submitting into a closed gate measures nothing.'); break; }
  }
  const inp = inputFor(s);
  await page.evaluate(({ a, d }) => { try { window._advanceStagedScene(a, d); } catch (_) {} },
    { a: inp.action, d: inp.dialogue });

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
  t('scene ' + s + ': prose captured from the app projection (>=40 chars)',
    (snap.prose || '').length >= 40, 'proseLen=' + (snap.prose || '').length);

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
    proseLen: (snap.prose || '').length,
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
  if (h.refusals.length) say('   app said : ' + JSON.stringify(h.refusals));
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

say('\n' + pass + '/' + (pass + fail) + ' per-scene checks passed'
  + (history.length < SCENES ? '   (loop stopped at scene ' + history.length + ' of ' + SCENES + ')' : ''));
process.exit(fail ? 1 : 0);
