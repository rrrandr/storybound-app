// MULTI-SCENE HARNESS PROOF. Provider-free, $0. No generation, no paid calls.
//
// WHY THIS EXISTS. Roman's objection, and it is correct: three consecutive multi-scene attempts
// produced three HARNESS failures, each found only by spending —
//   run 13  void: no render layer, the verifier was never dispatched
//   run 14  void: my replay branch bypassed the seal gate
//   run 15  the verdict truncated into unparseable JSON
// Proposing an 18-scene corpus on that record is not credible. If the harness cannot survive FOUR
// scene boundaries for $0, it has no business attempting six per path for money.
//
// WHAT IT PROVES, per scene, across FOUR consecutive advances through the real production entry
// point: the mode gate holds, the planner and author are reached, the projection carries prose, a
// continuation seals, the beat progression reaches the say/do gate, and the NEXT scene's
// _commitScene adjudicates and commits the PREVIOUS scene's proposals — four times, without state
// corruption or drift.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS STUBBED, stated rather than glossed:
//   · planner and author          run 13's REAL recorded responses, replayed every scene
//   · character memory extractor  the contract's own skeleton
//   · runtime commit verifier     a DELIVERED verdict whose refs are PARSED OUT OF THE REQUEST, so
//                                 this harness never invents a proposal id
// Replaying the same author response every scene means every scene renders the SAME prose. That is
// adequate for a reliability test — the question is whether the machinery survives the boundaries —
// but it is NOT a creative-quality signal and nothing here should be read as one.
// ════════════════════════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const SCENES = 4;
// THE FIXTURES MOVED TO _replay_fixtures.mjs so the live runner replays the same corpus in its
// dry mode. plannerFor now THROWS on an unexpected recorded shape instead of exiting, so the
// caller decides; this harness still refuses rather than inventing a reply.
let plannerFor;
try {
  const fx = await import('./_replay_fixtures.mjs');
  plannerFor = (s) => { try { return fx.plannerFor(s); } catch (e) {
    console.error('REFUSED: could not vary the recorded planner reply — ' + (e && e.message));
    process.exit(4); } };
  var PLANNER_RAW = fx.PLANNER_RAW, AUTHOR = fx.AUTHOR, MEMORY = fx.MEMORY, TRACER = fx.TRACER,
    stageOf = fx.stageOf, refsFromVerifierRequest = fx.refsFromVerifierRequest,
    verifierVerdict = fx.verifierVerdict;
} catch (e) {
  console.error('REFUSED: replay fixtures unavailable — ' + (e && e.message));
  process.exit(4);
}

console.log('=== MULTI-SCENE HARNESS PROOF (provider-free, $0) ===\n');
console.log('  ' + SCENES + ' consecutive scenes through window._advanceStagedScene');
console.log('  replaying run 13: planner ' + PLANNER_RAW.length + ' chars, author '
  + AUTHOR.length + ' chars; a DISTINCT institution per scene so the identity guard is respected\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];          // { scene, stage }
const verifierSeen = [];   // { scene, refs, replyRefs }
let sceneNo = 1;
// Capture the app's own refusal messages per scene. The first two runs told me an advance was
// swallowed but not why; _advanceStagedScene's guards all log before returning.
const blocks = [];
page.on('console', (m) => {
  const txt = m.text();
  if (/\[STAGED:SUBMIT\]|\[STAGED:GUARD\]|Blocked/.test(txt)) blocks.push({ scene: sceneNo, txt });
});

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url();
  let raw = null; try { raw = req.postData(); } catch (_) {}
  if (!/\/api\/(proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy)/.test(url)) {
    try { await route.abort(); } catch (_) {} return;
  }
  let sys = '', usr = '';
  try { const j = JSON.parse(raw || '{}');
    sys = String((j.messages || [])[0]?.content || '');
    usr = String((j.messages || [])[1]?.content || ''); } catch (_) {}
  const stage = stageOf(sys);
  calls.push({ scene: sceneNo, stage });
  const give = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c }) });
  if (stage === 'planner') return give(plannerFor(sceneNo));
  if (stage === 'author') return give(AUTHOR);
  if (stage === 'memory') return give(MEMORY);
  if (stage === 'verifier') {
    // THE REFS COME OUT OF THE REQUEST. This harness never invents a proposal id; it answers
    // exactly what it was asked about, which is also the only way the reply can be adjudicated.
    const refs = refsFromVerifierRequest(usr);
    verifierSeen.push({ scene: sceneNo, refs });
    return give(verifierVerdict(refs));
  }
  try { await route.abort(); } catch (_) {}
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function'
  && typeof window._advanceStagedBeat === 'function', { timeout: 20000 });

await page.evaluate(() => {
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  delete window.state._starterId;
  window.state.storyId = 'story-multiscene';
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

// Read the scene through to the say/do gate, exactly as a reader does.
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
  return {
    turnCount: window.state.turnCount,
    proseLen: proj.length,
    facts: cs.facts.map(f => f.proposalRef),
    committedThrough: cs._committedThroughScene,
    pending: (window._pendingSealedForScene(window.state.turnCount) || []).map(p => p.kind),
    ctOutcome: (window.state._lastContinuationResult || {}).outcome || null,
    activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated').length,
    registerSize: Object.keys(reg).length,
    adjudicated: Object.keys(((window.state._lastPerProposalAdjudication || {}).verdicts) || {}).length
  };
});

const history = [];
for (let s = 1; s <= SCENES; s++) {
  sceneNo = s;
  console.log('── scene ' + s + '/' + SCENES);
  // ENSURE THE GATE IS OPEN AT THE MOMENT OF SUBMISSION, not minutes earlier. Run 3 of this control
  // showed "[STAGED:SUBMIT] Blocked — gate not yet open" on scene 3 even though its predecessor's
  // gate had been read as open: the scene's completion tail (hero/phase image work) mounts a FRESH
  // staged session whose gateShown starts false, so a gate read taken earlier goes stale. The fix
  // is to re-read the beats to the gate immediately before advancing — checking the precondition at
  // the point of use. gateShown is still never written by this harness.
  if (s > 1) {
    const gd = Date.now() + 120000;
    let open = false;
    while (Date.now() < gd) {
      open = await page.evaluate(() => {
        const a = window.state._stagedActive;
        return !!(a && a.gateShown);
      });
      if (open) break;
      await readToGate();
      await new Promise(r => setTimeout(r, 500));
    }
    t('  scene ' + s + ': the gate was OPEN at the moment of submission', open === true,
      'still closed — the advance would be refused');
  }
  await page.evaluate(({ a, d }) => {
    try { window._advanceStagedScene(a, d); } catch (_) {}
  }, { a: 'I send sealed word to the commission that governs the toll road.',
       d: 'They will convene over this.' });
  // WAIT FOR THE AUTHOR, THEN FOR THE SESSION TO MOUNT. The first run of this control read the
  // beats 2.5s after the author response and found NO staged session on scene 1 — the scene had not
  // mounted yet — and then the scene-2 advance was blocked by the still-latched _stagedSubmitting,
  // so scenes 2 and 4 dispatched only a memory call. Both waits are on real state, and neither
  // flag is written by this harness.
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline && !calls.some(c => c.scene === s && c.stage === 'author')) {
    await new Promise(r => setTimeout(r, 1000));
  }
  const mountDeadline = Date.now() + 120000;
  let mounted = false;
  while (Date.now() < mountDeadline) {
    mounted = await page.evaluate(() => {
      const a = window.state._stagedActive;
      return !!(a && a.plan && Array.isArray(a.plan.beats) && a.plan.beats.length > 0);
    });
    if (mounted) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  t('  scene ' + s + ': the staged scene MOUNTED', mounted === true, 'no _stagedActive.plan.beats');
  const gate = await readToGate();
  const snap = await snapshot();
  // AND WAIT FOR THE SUBMIT LATCH before the next advance, rather than clearing it.
  const latchDeadline = Date.now() + 90000;
  let latchClear = false;
  while (Date.now() < latchDeadline) {
    latchClear = await page.evaluate(() => window.state._stagedSubmitting !== true);
    if (latchClear) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  if (s < SCENES) t('  scene ' + s + ': submit latch cleared before the next advance',
    latchClear === true, 'still latched — the next advance would be blocked');
  history.push({ scene: s, gate, snap, latchClear,
    stages: calls.filter(c => c.scene === s).map(c => c.stage) });
  console.log('   stages: ' + JSON.stringify(history[s - 1].stages.filter(x => x !== 'bible' && x !== 'other')));
  console.log('   gate: ' + JSON.stringify(gate.after) + '  prose=' + snap.proseLen
    + '  pending=' + JSON.stringify(snap.pending) + '  facts=' + snap.facts.length
    + '  activated=' + snap.activated);
}
await browser.close();

// ── ASSERTIONS ──────────────────────────────────────────────────────────────
console.log('\n0. the app\'s own refusals, per scene');
if (!blocks.length) console.log('   none');
blocks.forEach(b => console.log('   [scene ' + b.scene + '] ' + b.txt.slice(0, 140)));

console.log('\n1. every scene reached the planner and the author');
history.forEach(h => {
  t('  scene ' + h.scene + ': planner dispatched', h.stages.indexOf('planner') >= 0,
    JSON.stringify(h.stages));
  t('  scene ' + h.scene + ': author dispatched', h.stages.indexOf('author') >= 0,
    JSON.stringify(h.stages));
});

console.log('\n2. every scene rendered prose onto the surface the commit gate reads');
history.forEach(h => {
  t('  scene ' + h.scene + ': projection >= 40 chars', h.snap.proseLen >= 40,
    'len=' + h.snap.proseLen);
});

console.log('\n3. every scene sealed a continuation and reached the say/do gate');
history.forEach(h => {
  t('  scene ' + h.scene + ': continuation sealed (its OWN new body)',
    h.snap.ctOutcome === 'sealed', JSON.stringify(h.snap.ctOutcome));
  t('  scene ' + h.scene + ': gate opened', !!(h.gate.after && h.gate.after.gateShown),
    JSON.stringify(h.gate.after));
});

console.log('\n4. each scene AFTER the first adjudicated the previous scene');
const vScenes = verifierSeen.map(v => v.scene);
console.log('   verifier dispatched on scenes: ' + JSON.stringify(vScenes));
t('a verifier ran on every scene from 2 onward',
  [2, 3, 4].every(s => vScenes.indexOf(s) >= 0), JSON.stringify(vScenes));
t('  each verifier call was given real proposal refs',
  verifierSeen.every(v => v.refs.length > 0), JSON.stringify(verifierSeen.map(v => v.refs.length)));
t('  and the refs were never repeated across scenes — no stale re-adjudication',
  (function () { const all = verifierSeen.flatMap(v => v.refs);
    return new Set(all).size === all.length; })(),
  JSON.stringify(verifierSeen.map(v => v.refs)));

console.log('\n5. canon grew monotonically, without duplication or corruption');
const factCounts = history.map(h => h.snap.facts.length);
console.log('   facts after each scene: ' + JSON.stringify(factCounts));
console.log('   activated after each scene: ' + JSON.stringify(history.map(h => h.snap.activated)));
console.log('   committedThrough: ' + JSON.stringify(history.map(h => h.snap.committedThrough)));
t('facts never decreased', factCounts.every((n, i) => i === 0 || n >= factCounts[i - 1]),
  JSON.stringify(factCounts));
t('facts grew after the first adjudication', factCounts[factCounts.length - 1] > 0,
  JSON.stringify(factCounts));
t('no duplicate fact refs at any point',
  history.every(h => new Set(h.snap.facts).size === h.snap.facts.length),
  JSON.stringify(history.map(h => h.snap.facts)));
t('committedThrough advanced monotonically',
  (function () { const c = history.map(h => h.snap.committedThrough).filter(x => x != null);
    return c.every((n, i) => i === 0 || n >= c[i - 1]); })(),
  JSON.stringify(history.map(h => h.snap.committedThrough)));
t('the entity register never shrank',
  history.every((h, i) => i === 0 || h.snap.registerSize >= history[i - 1].snap.registerSize),
  JSON.stringify(history.map(h => h.snap.registerSize)));

console.log('\n6. THE VERDICT ON HARNESS RELIABILITY');
const allGreen = fail === 0;
console.log('   ' + (allGreen
  ? SCENES + ' consecutive scenes survived every boundary with no harness failure.'
  : 'the harness broke before ' + SCENES + ' scenes — do NOT attempt a paid corpus.'));
console.log('   This is a RELIABILITY result only. Every scene replayed the SAME author response,');
console.log('   so the prose is identical scene to scene and NOTHING here says anything about');
console.log('   forward movement, circling or quality.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
