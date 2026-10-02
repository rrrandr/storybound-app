// RENDER → COMMIT CHAIN CONTROL. Provider-free, $0. No fixture text is injected into _commitScene.
//
// WHAT RUN 13 EXPOSED. Scene 1 sealed and the author produced 27,558 bytes, but scene 2 issued NO
// verifier request: _commitScene returns early on `if (_pt.length < 40) return;` and its prevText
// comes from the render layer, which my harness never populated. The paid run tested the harness.
//
// THE CHAIN THIS TRACES, link by link, with a distinct assertion at each:
//     author response → rendered/persisted scene → commit-gate input → verifier dispatch
//
// HOW IT STAYS HONEST:
//   · the planner and author replies are run 13's REAL saved responses, replayed from artefacts —
//     not invented payloads;
//   · the prose enters through the AUTHOR'S response at the network boundary and travels the
//     production path. Nothing is handed to _commitScene directly, which is the one shortcut that
//     would hide the actual problem;
//   · scene advance goes through window._advanceStagedScene — the real production entry point that
//     the submit handler calls — NOT _runCGScreenplayGen, which run 13 used and which generates a
//     screenplay without completing or persisting the scene.
//
// WHAT WAS LEARNED FROM SOURCE FIRST (so this control knows where to look):
//   · the CG staged path DELIBERATELY skips StoryPagination.addPage ("CG has no page record —
//     staged mode skips the literary StoryPagination.addPage", app.js ~33693), so getAllContent()
//     is EXPECTED to be empty in CG mode and is reported, not asserted;
//   · CG prose is persisted by _sbPersistSceneProjection({kind:'beats'}) inside
//     _completeStagedSceneFromScreenplay (~239350), which _advanceStagedScene awaits (~227296);
//   · _commitScene's fallback _sbLatestProseText(state) reads exactly that projection.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const RUN13 = '_continuation_live_eval_out/run_2026-10-01T22-08-44-097Z';
const contentOf = (p) => {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return j.content || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
};
const PLANNER_CONTENT = contentOf(RUN13 + '/s1_response_planner_1.json');
const AUTHOR_CONTENT = contentOf(RUN13 + '/s1_response_author_2.json');
// A sentence that exists ONLY in that author response, used as the tracer through every link.
const TRACER = "The clerk's fingers crack the seal on the parchment I sent.";

// ── THE CHARACTER MEMORY EXTRACTOR, stubbed SHAPE-FAITHFULLY ────────────────────────────────
// The diagnostic found scene 2's first three provider requests were all this one stage, retried
// after each abort — and aborting it stopped the advance before the planner, so _commitScene never
// ran. This is the EXACT skeleton the prompt itself demands (app.js ~31922), with empty collections
// and null interpretation: ONE real shape, never a union, and it asserts no canon. An empty
// `characters`/`relations` is a legitimate answer — the scene introduces no named persistent
// supporting character — and `decisiveChange: null` keeps interpretation out.
const MEMORY_EXTRACTOR_REPLY = JSON.stringify({
  characters: [],
  scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.0 },
  sceneState: { setting: null, charactersPresent: [], protagonistStatus: null,
    decisiveChange: null, activeInterlocutor: null, protagonistAlone: false },
  relations: []
});
const STUBBED_STAGES = ['planner (run 13 recorded response)', 'author (run 13 recorded response)',
  'character memory extractor (shape-faithful skeleton)', 'runtime commit verifier (fixture verdict)'];

console.log('=== RENDER → COMMIT CHAIN (provider-free, $0) ===\n');
console.log('  replaying run 13\'s REAL responses: planner ' + PLANNER_CONTENT.length
  + ' chars, author ' + AUTHOR_CONTENT.length + ' chars');
console.log('  tracer sentence: ' + JSON.stringify(TRACER));
t('the tracer is present in the real author response', AUTHOR_CONTENT.indexOf(TRACER) >= 0);

const browser = await chromium.launch();
const page = await browser.newPage();
const seen = [];
let verifierReply = null;
// _commitScene logs [VERIFIER-INPUT] immediately before dispatching, and the adjudication loop logs
// [COMMIT]/[PENDING]/[PER-PROPOSAL]. Capturing console output localises exactly how far the gate got.
const logs = [];
let phaseMark = 0;
const allLogs = [];
page.on('console', (m) => {
  const txt = m.text();
  allLogs.push({ at: phaseMark, type: m.type(), txt });
  if (/\[VERIFIER-INPUT\]|\[COMMIT|\[PENDING\]|\[PER-PROPOSAL\]|\[ROLLBACK\]|\[COMMIT-SCENE/.test(txt)) logs.push(txt);
});
await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url();
  let raw = null; try { raw = req.postData(); } catch (_) {}
  if (!/\/api\/(proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy)/.test(url)) {
    try { await route.abort(); } catch (_) {} return;
  }
  let sys = '';
  try { const j = JSON.parse(raw || '{}'); sys = String((j.messages || [])[0]?.content || ''); } catch (_) {}
  const AUTHOR_MARK = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
    /screenplay-native|cinematic-romance writer|prose author/i].reduce((n, rx) => n + (rx.test(sys) ? 1 : 0), 0);
  const stage = /RUNTIME COMMIT verifier/.test(sys) ? 'verifier'
    : (/CHARACTER MEMORY EXTRACTOR/.test(sys) ? 'memory'
    : (AUTHOR_MARK >= 2 ? 'author'
    : (/SCENE-SPINE planner|SCENE planner/.test(sys) ? 'planner'
    : (/BODY BIBLE/.test(sys) ? 'bible' : 'other'))));
  seen.push({ stage, raw: raw || '', head: sys.slice(0, 180).replace(/\s+/g, ' ') });
  const give = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c }) });
  if (stage === 'planner') return give(PLANNER_CONTENT);
  if (stage === 'author') return give(AUTHOR_CONTENT);
  if (stage === 'memory') return give(MEMORY_EXTRACTOR_REPLY);
  if (stage === 'verifier') return give(JSON.stringify(verifierReply || { delivery: 'MISSED' }));
  try { await route.abort(); } catch (_) {}
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function'
  && typeof window._commitScene === 'function'
  && typeof window._sbLatestProseText === 'function', { timeout: 20000 });
t('the real production entry point is reachable', true);

// ── SETUP: a CG staged story, as the live runs used ─────────────────────────
const setup = await page.evaluate(() => {
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  delete window.state._starterId;
  window.state.storyId = 'story-chain';
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
  window.state.turnCount = 1;
  // THE MODE GATE, which my first attempt missed entirely: _isStagedMode() reads
  // state.renderMode (camelCase) === 'staged_story_mode', and _shouldUseCGScreenplayPath() is that
  // plus _cgScreenplayMode !== false. Without it _advanceStagedScene bails before generating and
  // ZERO stages dispatch — which is exactly what the first run of this control reported.
  // Run 13 never hit this because it called _runCGScreenplayGen directly, bypassing the gate — and
  // bypassing the scene COMPLETION that persists the prose. That is the whole defect in one line.
  window.state.renderMode = 'staged_story_mode';
  window.state._cgScreenplayMode = true;
  return {
    stagedMode: (typeof window._isStagedMode === 'function') ? !!window._isStagedMode() : null,
    cgPath: (typeof window._shouldUseCGScreenplayPath === 'function')
      ? !!window._shouldUseCGScreenplayPath() : null,
    renderMode: window.state.renderMode || null
  };
});
console.log('\n  staged mode: ' + JSON.stringify(setup.stagedMode)
  + '  CG screenplay path: ' + JSON.stringify(setup.cgPath));

// ── LINK 1: the author response reaches the app ─────────────────────────────
console.log('\nLINK 1 — the author response is produced and consumed');
await page.evaluate(async () => {
  try { await Promise.race([
    window._advanceStagedScene('I send sealed word to the commission that governs the toll road, '
      + 'demanding they open an investigation into the burning and summon everyone who profited from it.',
      'They will convene over this, and I will still be answering their questions a season from now.'),
    new Promise(r => setTimeout(r, 180000))]); } catch (_) {}
});
const s1 = await page.evaluate((TRACER) => {
  let pag = '';
  try { if (typeof StoryPagination !== 'undefined' && StoryPagination.getAllContent)
    pag = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); } catch (_) {}
  let proj = '';
  try { proj = String(window._sbLatestProseText(window.state) || ''); } catch (_) {}
  return {
    turnCount: window.state.turnCount,
    pagLen: pag.length, pagHasTracer: pag.indexOf(TRACER) >= 0,
    projLen: proj.length, projHasTracer: proj.indexOf(TRACER) >= 0,
    projHead: proj.slice(0, 160),
    scenes: (window.state.scenes || []).length,
    ledger: (((window.state._sceneLedger || {}).entries) || []).length,
    ctOutcome: (window.state._lastContinuationResult || {}).outcome || null,
    priorRef: (window.state._priorSceneStateChange || {}).proposalRef || null,
    priorSceneProposed: (window.state._priorSceneStateChange || {}).sceneProposed,
    pending: (window._pendingSealedForScene(window.state.turnCount) || []).map(p => ({ id: p.id, kind: p.kind })),
    facts: window._ensureCommittedState().facts.length
  };
}, TRACER);
const stages1 = seen.map(c => c.stage);
console.log('  stages dispatched: ' + JSON.stringify(stages1));
t('an AUTHOR request was issued', stages1.indexOf('author') >= 0, JSON.stringify(stages1));
t('  and a planner request before it', stages1.indexOf('planner') >= 0);
t('the continuation sealed from the real planner reply', s1.ctOutcome === 'sealed',
  JSON.stringify(s1.ctOutcome));
t('  both proposal kinds are pending', s1.pending.length === 2, JSON.stringify(s1.pending));
t('  nothing committed yet', s1.facts === 0, 'facts=' + s1.facts);

// ── LINK 2: the prose is on a surface the commit gate reads ────────────────
console.log('\nLINK 2 — the author prose reaches a surface _commitScene reads');
console.log('  StoryPagination.getAllContent(): ' + s1.pagLen + ' chars, tracer=' + s1.pagHasTracer);
console.log('  _sbLatestProseText(state):       ' + s1.projLen + ' chars, tracer=' + s1.projHasTracer);
console.log('  state.scenes=' + s1.scenes + '  sceneLedger entries=' + s1.ledger);
console.log('  projection head: ' + JSON.stringify(s1.projHead));
// StoryPagination is EXPECTED empty in CG mode (staged mode skips addPage by design), so it is
// reported and not asserted. The projection is the surface that must carry it.
t('_sbLatestProseText returns the scene prose', s1.projLen >= 40, 'len=' + s1.projLen);
t('  and it contains the EXACT author sentence', s1.projHasTracer === true,
  'tracer absent; head=' + JSON.stringify(s1.projHead));
t('  so the commit gate would clear its length-40 guard', s1.projLen >= 40);

// ── LINK 3 + 4: the commit gate receives it and dispatches the verifier ────
console.log('\nLINK 3+4 — scene 2 feeds it to _commitScene, which dispatches the verifier');
verifierReply = {
  delivery: 'DELIVERED', dominant_replacement: 'none', transition_position: 40,
  first_irreversible_position: 40,
  tableau: { setting: 'the chamber', charactersPresent: ['Wren'], protagonistStatus: 'waiting',
    decisiveChange: null, activeInterlocutor: null, protagonistAlone: true },
  per_proposal: (s1.pending || []).map(p => ({ ref: p.id, delivery: 'DELIVERED',
    evidence: "The clerk's fingers crack the seal on the parchment I sent." }))
};
const beforeVerifier = seen.filter(c => c.stage === 'verifier').length;
// ── THE HARNESS FIX ROMAN AUTHORISED: wait for the real rendered scene to mount ─────────────
// _advanceStagedScene latches state._stagedSubmitting and the comment at app.js ~227253 says it is
// "held until the next staged scene mounts (cleared in _renderStagedScene init)". If the mount
// never completes, the SECOND advance is blocked by that guard and dispatches nothing — which is
// precisely what the previous run showed: scene-2 stages [].
// This WAITS for the latch instead of clearing it. Force-clearing a production guard would be the
// shortcut that hides the problem; if it never clears, that is itself the finding.
const latch = await page.evaluate(() => ({ submitting: window.state._stagedSubmitting === true }));
console.log('\n  after scene 1, _stagedSubmitting = ' + latch.submitting
  + (latch.submitting ? '  → waiting for the scene to mount' : '  (clear — the scene mounted)'));
let cleared = !latch.submitting;
if (!cleared) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    cleared = await page.evaluate(() => window.state._stagedSubmitting !== true);
    if (cleared) break;
    await new Promise(r => setTimeout(r, 1000));
  }
}
t('the staged submit latch cleared — the scene 1 mount completed', cleared === true,
  'still latched after 60s: _renderStagedScene never ran, so the next advance is blocked');
// ── THE READER PROGRESSION, which is what actually gates submission ─────────────────────────
// _advanceStagedScene's Guard 1 is `if (active && !active.gateShown) return;` — and the previous
// run showed exactly that: "[STAGED:SUBMIT] Blocked — gate not yet open". gateShown only becomes
// true in _advanceStagedBeat when the reader reaches the LAST beat, which then calls
// _showStagedDecisionGate — the say/do gate at the end of the page. That matches how the product
// actually works: decisions are say/do entry and fate cards, not buttons mid-scene.
// So the harness READS THROUGH THE SCENE by calling the real window._advanceStagedBeat, resolving a
// micro-decision with the real window._resolveMicroDecision when one blocks the advance. Nothing is
// written into state; gateShown is never set by hand.
const progression = await page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const st = () => {
    const a = window.state._stagedActive || null;
    return a ? { beat: a.currentBeatIdx, last: (a.plan && a.plan.beats || []).length - 1,
      gateShown: !!a.gateShown, microShown: !!a.microShown } : null;
  };
  const before = st();
  if (!before) return { ok: false, why: 'no _stagedActive session', before: null };
  let micros = 0, steps = 0;
  for (let i = 0; i < 200; i++) {
    const cur = st();
    if (!cur || cur.gateShown) break;
    const prevBeat = cur.beat;
    try { window._advanceStagedBeat(); } catch (_) {}
    await sleep(60);
    const nxt = st();
    // Stuck on the same beat => a micro-decision overlay is holding it. Resolve it the way a click
    // does, with the real resolver.
    if (nxt && nxt.beat === prevBeat && !nxt.gateShown) {
      if (!nxt.microShown && typeof window._resolveMicroDecision === 'function') {
        try { window._resolveMicroDecision(0); micros++; } catch (_) {}
        await sleep(80);
      } else { await sleep(120); }
    }
    steps++;
  }
  return { ok: true, before, after: st(), steps, micros };
});
console.log('\n  READER PROGRESSION through scene 1\'s beats');
console.log('  ' + JSON.stringify(progression));
t('a staged session existed to read through', progression.ok === true,
  JSON.stringify(progression.why));
t('the reader reached the END of the scene and the say/do gate OPENED',
  !!(progression.after && progression.after.gateShown === true),
  JSON.stringify(progression.after));

// THE SECOND HARNESS FIX. _advanceStagedScene's FIRST gate is the scene decision: when
// _sceneDecisionNeeded() is true it calls _mountSceneDecisionPrompt(onChosen) and RETURNS. The
// prompt is real DOM — buttons #sceneDecisionA/#sceneDecisionB — whose click handler calls
// _recordSceneDecision and then re-enters _advanceStagedScene. Headless, nothing clicked it, so
// scene 2 dispatched NOTHING: the previous run's "scene-2 stages []" with a decision axis in the
// logs. The harness now CLICKS the real button, which is the actual reader action — the decision is
// never written into state directly.
phaseMark = 2;
await page.evaluate(() => {
  try { window._advanceStagedScene('I wait for the commission to answer.', 'Let them send for me.'); } catch (_) {}
});
const needsDecision = await page.evaluate(() => ({
  needed: (typeof window._sceneDecisionNeeded === 'function') ? !!window._sceneDecisionNeeded() : null,
  promptPresent: !!document.getElementById('sceneDecisionA')
}));
console.log('\n  scene decision needed: ' + JSON.stringify(needsDecision.needed)
  + '  prompt in DOM: ' + JSON.stringify(needsDecision.promptPresent));
let clicked = false;
if (needsDecision.promptPresent) {
  const deadline0 = Date.now() + 20000;
  while (Date.now() < deadline0) {
    try { await page.click('#sceneDecisionA', { timeout: 2000 }); clicked = true; break; }
    catch (_) { await new Promise(r => setTimeout(r, 500)); }
  }
  console.log('  clicked #sceneDecisionA: ' + clicked);
}
t('the scene-decision gate was satisfied by the real UI, not by writing state',
  !needsDecision.needed || clicked, 'prompt present=' + needsDecision.promptPresent);
// Now wait for the re-entered advance to reach the verifier.
{
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline && seen.filter(c => c.stage === 'verifier').length === beforeVerifier) {
    await new Promise(r => setTimeout(r, 1000));
  }
  await new Promise(r => setTimeout(r, 3000));
}
const vcalls = seen.filter(c => c.stage === 'verifier');
const stages2 = seen.map(c => c.stage);
console.log('  scene-2 stages: ' + JSON.stringify(stages2.slice(stages1.length)));
console.log('\n  ── SCENE 2 REQUESTS, in order, with system-prompt heads ──');
seen.slice(stages1.length).forEach((c, i) => {
  console.log('  [' + (i + 1) + '] stage=' + c.stage);
  console.log('      ' + JSON.stringify(c.head));
});
console.log('\n  ── SCENE 1 "other" requests, for comparison ──');
seen.slice(0, stages1.length).filter(c => c.stage === 'other').slice(0, 8).forEach((c, i) => {
  console.log('  s1 other[' + (i + 1) + '] ' + JSON.stringify(c.head.slice(0, 110)));
});
console.log('  commit-gate logs: ' + JSON.stringify(logs));
console.log('\n  ── EVERY console line during the scene-2 window ──');
allLogs.filter(l => l.at === 2).slice(0, 40).forEach(l =>
  console.log('   [' + l.type + '] ' + l.txt.slice(0, 150)));
console.log('  scene 1 prior ref: ' + JSON.stringify(s1.priorRef)
  + ' sceneProposed=' + JSON.stringify(s1.priorSceneProposed)
  + ' turnCount after s1=' + s1.turnCount);
console.log('  verifier requests: ' + vcalls.length + ' (was ' + beforeVerifier + ')');
t('THE COMMIT GATE DISPATCHED THE VERIFIER', vcalls.length > beforeVerifier,
  'verifier requests=' + vcalls.length);
const vraw = vcalls.length ? vcalls[vcalls.length - 1].raw : '';
t('  its payload carries the EXACT author sentence — the gate got the rendered prose',
  vraw.indexOf(TRACER) >= 0, 'tracer not in the verifier payload');
t('  and lists scene 1\'s sealed refs for judgement',
  (s1.pending || []).every(p => vraw.indexOf(p.id) >= 0),
  JSON.stringify((s1.pending || []).map(p => [p.id, vraw.indexOf(p.id) >= 0])));

const after = await page.evaluate(() => {
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  return { facts: cs.facts.map(f => ({ ref: f.proposalRef, prov: f.provenanceLink, scene: f.committedAtScene })),
    committedThrough: cs._committedThroughScene,
    adjudication: window.state._lastPerProposalAdjudication || null,
    activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
      .map(k => ({ id: k, label: reg[k].label, aliases: reg[k].aliases || [] })) };
});
console.log('\n  downstream of the dispatch (for the record)');
console.log('  adjudication: ' + JSON.stringify(after.adjudication && after.adjudication.verdicts));
console.log('  facts: ' + JSON.stringify(after.facts));
console.log('  activated: ' + JSON.stringify(after.activated));
t('the gate adjudicated scene 1\'s proposals', !!(after.adjudication
  && Object.keys(after.adjudication.verdicts || {}).length > 0),
  JSON.stringify(after.adjudication));
t('  committedThroughScene advanced', after.committedThrough != null,
  String(after.committedThrough));

// ── IDEMPOTENCY PROBE: PINNED vs the OLD SHAPE ──────────────────────────────
// Run 17's probe re-entered _commitScene with window.state._priorSceneStateChange AS IT STOOD
// AFTER scene 2's planning — by then pointing at a LATER scene's state_change. It therefore
// adjudicated a different scene against stale prose, dispatched a SECOND paid verifier call, and
// committed a new fact. And the assertion that should have caught it compared a verifier count to
// ITSELF, both read after the probe.
//
// Both shapes are exercised here, provider-free, PINNED FIRST so its assertions are uncontaminated.
console.log('\nIDEMPOTENCY — the PINNED probe (correct) and the OLD shape (the defect)');
const vBefore = seen.filter(c => c.stage === 'verifier').length;          // BASELINE, captured FIRST
const factsBefore = after.facts.map(f => f.ref).sort().join('|');
console.log('  baseline BEFORE re-entry: verifier calls=' + vBefore
  + ' factRefs=' + JSON.stringify(factsBefore));

const pinned = await page.evaluate(async () => {
  // THE REAL SCENE-1 PROSE, from the same surface _commitScene's own fallback reads. No fixture
  // text is handed in — that is the shortcut this whole control exists to avoid.
  const prose = String(window._sbLatestProseText(window.state) || '');
  // Pin scene 1's OWN proposals and scene number, from the sealed store rather than from live state.
  const st = (window.state._sealedProposals || { byId: {} }).byId;
  const all = Object.keys(st).map(k => st[k]);
  const sc = all.filter(x => x.kind === 'state_change').sort((a, b) => a.scene - b.scene)[0] || null;
  const ct = all.filter(x => x.kind === 'continuation').sort((a, b) => a.scene - b.scene)[0] || null;
  if (!sc || !ct) return { ok: false, why: 'could not pin scene 1 proposals' };
  const pinnedProposal = { event: sc.fact, proposalRef: sc.id, sceneProposed: sc.scene };
  await window._commitScene(prose, pinnedProposal, sc.scene);
  await window._commitScene(prose, pinnedProposal, sc.scene);
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  return { ok: true, pinnedScene: sc.scene, scRef: sc.id, ctRef: ct.id,
    facts: cs.facts.map(f => f.proposalRef).sort().join('|'),
    activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated').length,
    proseLen: prose.length };
});
const vAfterPinned = seen.filter(c => c.stage === 'verifier').length;
console.log('  pinned probe: ' + JSON.stringify(pinned));
t('the probe pinned scene 1\'s own proposals', pinned.ok === true, JSON.stringify(pinned.why));
t('  NO new verifier call', vAfterPinned === vBefore,
  'before=' + vBefore + ' after=' + vAfterPinned);
t('  NO new facts', pinned.facts === factsBefore,
  'before=' + factsBefore + ' after=' + pinned.facts);
t('  refs unchanged', pinned.facts === factsBefore);
t('  activated entity count unchanged', pinned.activated <= 1, 'activated=' + pinned.activated);

// THE OLD SHAPE, run deliberately to show it breaks. Its canon mutation is EXPECTED.
const oldShape = await page.evaluate(async () => {
  const prose = String(window._sbLatestProseText(window.state) || '');
  const p = window.state._priorSceneStateChange || null;
  const before = window._ensureCommittedState().facts.map(f => f.proposalRef).sort().join('|');
  await window._commitScene(prose, p, (p || {}).sceneProposed);
  const cs = window._ensureCommittedState();
  return { usedRef: (p || {}).proposalRef || null, usedScene: (p || {}).sceneProposed,
    before, after: cs.facts.map(f => f.proposalRef).sort().join('|') };
});
const vAfterOld = seen.filter(c => c.stage === 'verifier').length;
console.log('  OLD shape: ' + JSON.stringify(oldShape));
console.log('  verifier calls after the old shape: ' + vAfterOld);
t('THE OLD SHAPE IS DEMONSTRABLY WRONG — it targets a DIFFERENT proposal than scene 1\'s',
  oldShape.usedRef !== pinned.scRef,
  'old used ' + oldShape.usedRef + ', scene 1 state_change is ' + pinned.scRef);
t('  and it changes canon or re-calls the verifier, which a retry must not',
  oldShape.after !== oldShape.before || vAfterOld > vAfterPinned,
  'facts ' + oldShape.before + ' → ' + oldShape.after + ', verifier ' + vAfterPinned + ' → ' + vAfterOld);
t('  so the pinned form is not merely tidier, it is the only correct one',
  pinned.facts === factsBefore && (oldShape.after !== oldShape.before || vAfterOld > vAfterPinned));

await browser.close();

console.log('\nNO FIXTURE WAS HANDED TO _commitScene');
const self = fs.readFileSync('_render_to_commit_chain_control.mjs', 'utf8');
// WHAT MATTERS IS WHAT IS PASSED, NOT WHETHER IT IS CALLED. The idempotency probe legitimately
// re-enters _commitScene — that IS the retry under test. The prohibition is on handing it FIXTURE
// TEXT, which would hide whether the render path works. So: every call passes a `prose` variable,
// and every such variable is read from _sbLatestProseText — the surface _commitScene's own fallback
// uses — with no string literal anywhere near the call.
const commitCalls = (self.match(/window\._commitScene\([^)]*\)/g) || []);
t('every _commitScene call passes a prose VARIABLE, never a literal',
  commitCalls.length > 0 && commitCalls.every(c => /window\._commitScene\(prose,/.test(c)),
  JSON.stringify(commitCalls));
t('  and that prose is read from _sbLatestProseText, not constructed here',
  /const prose = String\(window\._sbLatestProseText\(window\.state\) \|\| ''\)/.test(self));
t('  no prose string literal is passed to it',
  !/window\._commitScene\(\s*['"`]/.test(self));
t('  it advances scenes through the real entry point', /window\._advanceStagedScene\(/.test(self));
t('  and the prose entered as the AUTHOR\'S response at the network boundary',
  /if \(stage === 'author'\) return give\(AUTHOR_CONTENT\)/.test(self));
t('  replaying run 13\'s real artefacts, not invented payloads',
  /_continuation_live_eval_out\/run_2026-10-01T22-08-44-097Z/.test(self));

console.log('\nSTAGES STUBBED IN THIS CONTROL (reported, not glossed)');
STUBBED_STAGES.forEach(x => console.log('   · ' + x));
console.log('   Everything else is production code: scene completion, projection persistence,');
console.log('   _sbLatestProseText, _commitScene, the adjudication loop, _commitTransition.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
