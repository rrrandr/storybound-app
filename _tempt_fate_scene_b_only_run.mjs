// SCENE-B-ONLY TEMPT FATE CONTINUATION — from the preserved 09-24 committed Scene A.
//
// Roman, 2026-09-24: "Use the last ACTUALLY COMMITTED Scene A rupture exactly as generated, even
// though its scope record was imperfect. The question is now whether an ordinary continuation
// genuinely lives with that durable change."
//
// Hydrates byte-for-byte from the fixture. Does NOT regenerate, repair, reinterpret or hand-author
// Scene A's outcome. Sets no new Tempt invocation and creates no extractor pending record.
//
//   --dry                      stubs every provider; proves hydration + preconditions. Default.
//   --authorize "<phrase>"     the one authorized live continuation.
//
// WHAT IS RECONSTRUCTED, AND WHAT IS NOT — stated plainly, because the instruction was to stop
// rather than fabricate:
//   byte-for-byte from preserved evidence — Scene A's accepted scene object {title, synopsis,
//     text, fateCard}; the durable consequence; the owned ledger proposal.
//   deterministic replay — the baked Scene 1 and the recorded Scene-1 decision ('remain'), via the
//     same production path the original run used.
//   NOT reconstructed — Scene A's transient planner scaffolding (_scenePlotContract,
//     _sceneObjectives, _priorSceneStateChange for row 2). It was never preserved. Scene B builds
//     its own for row 3, and this run records that difference rather than fabricating the missing
//     state.

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, '_tempt_fate_fixtures', 'run_2026-09-24_02-11-02_scene_a');
const AUTH_PHRASE = 'run one scene-b-only tempt fate continuation under $0.20';
const CAP_USD = 0.20;
const SCENE_B_CEILING = 26;
const NEUTRAL_DO = 'Lirael takes a slow breath and steps back from the center of the clearing.';

const argv = process.argv.slice(2);
const authIdx = argv.indexOf('--authorize');
const LIVE = authIdx !== -1 && String(argv[authIdx + 1] || '') === AUTH_PHRASE;
const DRY = !LIVE;
if (authIdx !== -1 && !LIVE) { console.error('REFUSING — authorization phrase did not match exactly.'); process.exit(3); }

// ── SOURCED RATES, verbatim from public/app.js TEXT_PRICING (~4764-4811) ────────────────────
const PRICING = {
  'gpt-4o-mini': { i: 1.5e-7, o: 6e-7 }, 'gpt-4o': { i: 2.5e-6, o: 1e-5 },
  'grok-4-1-fast-reasoning': { i: 1.25e-6, o: 2.5e-6 }, 'grok-4-1-fast-non-reasoning': { i: 1.25e-6, o: 2.5e-6 },
  'mistral-small-latest': { i: 1.5e-7, o: 6e-7 }, 'ministral-8b-2512': { i: 1.5e-7, o: 1.5e-7 },
  'grok-4.20-0309-non-reasoning': { i: 1.25e-6, o: 2.5e-6 }
};
const TOK = { author: { i: 9000, o: 1600 }, scenePlanner: { i: 2500, o: 420 }, commitVerifier: { i: 5200, o: 280 },
  gravityAudit: { i: 2200, o: 1400 }, plannerLegacyFallback: { i: 2500, o: 420 },
  sceneAmbient: { i: 4000, o: 12 }, characterDisclosure: { i: 3000, o: 1100 } };
const TIERS = { scenePlanner: ['grok-4-1-fast-non-reasoning', 'ministral-8b-2512', 'gpt-4o'],
  commitVerifier: ['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini'], gravityAudit: ['ministral-8b-2512'],
  author: ['grok-4-1-fast-reasoning', 'ministral-8b-2512', 'gpt-4o'], plannerLegacyFallback: ['mistral-small-latest'],
  sceneAmbient: ['grok-4.20-0309-non-reasoning'], characterDisclosure: ['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini'] };
const roleCost = (r) => TIERS[r].reduce((n, m) => n + PRICING[m].i * TOK[r].i + PRICING[m].o * TOK[r].o, 0);
const GEN = ['scenePlanner', 'plannerLegacyFallback', 'commitVerifier', 'gravityAudit', 'author'];
const POST = ['sceneAmbient', 'characterDisclosure'];
const genUsd = GEN.reduce((n, r) => n + roleCost(r), 0);
const postUsd = POST.reduce((n, r) => n + roleCost(r), 0);
const SCENE_B_WORST = genUsd + postUsd + genUsd;      // generation + post-scene + one bounded retry
const SCENE_B_REQS = GEN.reduce((n, r) => n + TIERS[r].length, 0) * 2 + POST.reduce((n, r) => n + TIERS[r].length, 0);

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const OUT_DIR = path.join(__dirname, DRY ? '_tempt_fate_scene_b_dry_out' : path.join('_tempt_fate_fixtures', 'scene_b_' + RUN_ID));
if (!DRY && fs.existsSync(OUT_DIR)) { console.error('REFUSING — output directory already exists: ' + OUT_DIR); process.exit(4); }
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
const persist = (n, o) => fs.writeFileSync(path.join(OUT_DIR, n), JSON.stringify(o, null, 2));
const writeText = (n, t) => fs.writeFileSync(path.join(OUT_DIR, n), String(t == null ? '' : t));

const checks = [];
const ok = (name, pass, detail) => {
  checks.push({ name, pass: !!pass, detail: pass ? undefined : String(detail || '').slice(0, 300) });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 300) : ''));
  return !!pass;
};
const stop = (why) => { console.error('\nSTOPPING — ' + why + '\n(no dispatch made)'); persist('preflight_failure.json', { why, checks }); process.exit(5); };

(async () => {
  console.log('=== SCENE-B-ONLY TEMPT FATE CONTINUATION — ' + (DRY ? 'DRY (stubbed)' : 'LIVE, AUTHORIZED') + ' ===');

  // ── LOAD THE PRESERVED EVIDENCE. Missing anything → stop, never fabricate. ─────────────────
  const need = ['scene_a_result.json', 'outcome_record.json', 'scene_a_rendered_text.txt'];
  for (const f of need) if (!fs.existsSync(path.join(FIX, f))) stop('required fixture artifact missing: ' + f);
  const aResult = JSON.parse(fs.readFileSync(path.join(FIX, 'scene_a_result.json'), 'utf8'));
  const aOutcome = JSON.parse(fs.readFileSync(path.join(FIX, 'outcome_record.json'), 'utf8'));
  const renderedText = fs.readFileSync(path.join(FIX, 'scene_a_rendered_text.txt'), 'utf8');

  const sceneA = aResult.renderedSceneText;
  const durable = (aOutcome.durableConsequences || [])[0];
  const proposal = aOutcome.ownedProposal;

  console.log('\n── preflight: reconstructability ──');
  if (!ok('Scene A\'s accepted scene object is preserved {title, synopsis, text, fateCard}',
    sceneA && typeof sceneA.text === 'string' && sceneA.text.length > 0, JSON.stringify(Object.keys(sceneA || {})))) stop('Scene A scene object unusable');
  if (!ok('...and its text matches the separately preserved rendered prose byte-for-byte',
    sceneA.text.trim() === renderedText.trim(), 'scene.text len=' + sceneA.text.length + ' rendered len=' + renderedText.length)) stop('Scene A prose disagrees between artifacts');
  if (!ok('the durable consequence is preserved and was COMMITTED',
    !!durable && aOutcome.committed === true && durable.proposalId === 'tfl_1', JSON.stringify({ committed: aOutcome.committed, id: durable && durable.proposalId }))) stop('no committed durable consequence');
  if (!ok('the owned ledger proposal is preserved', !!proposal && proposal.id === 'tfl_1', JSON.stringify(proposal && proposal.id))) stop('no owned proposal');
  console.log('    Scene A prose: ' + sceneA.text.length + ' chars · durable: ' + durable.ruptureClass + '/' + durable.scopeMatch);

  console.log('\n── preflight: budget ──');
  console.log('    Scene B worst case  $' + SCENE_B_WORST.toFixed(6) + '  (' + SCENE_B_REQS + ' requests)');
  console.log('    hard cap            $' + CAP_USD.toFixed(6));
  if (!ok('the Scene B census and reservation fit inside the $0.20 hard cap', SCENE_B_WORST <= CAP_USD,
    '$' + SCENE_B_WORST.toFixed(6) + ' > $' + CAP_USD.toFixed(6))) stop('Scene B worst case exceeds the authorized cap');
  if (!ok('the phase-gate ceiling equals the census request count exactly', SCENE_B_CEILING === SCENE_B_REQS,
    'ceiling=' + SCENE_B_CEILING + ' census=' + SCENE_B_REQS)) stop('cap/census mismatch');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctxB.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  if (DRY) {
    const plan = (isTempt) => ({ beats: [{ idx: 0, kind: 'narration', text: 'The clearing holds its silence.', speaker: null, tension_state: 'composed' }],
      visualState: {}, is_consummate_scene: false, hardBeats: [], decisionGateBeatIdx: 0 });
    gate.stub('/api/mistral-proxy', async () => ({ content: null }));
    gate.stub('/api/proxy', async () => ({ content: JSON.stringify(plan()) }));
    gate.stub('/api/chatgpt-proxy', async () => ({ choices: [{ message: { content: JSON.stringify(plan()) } }] }));
  } else {
    // TEXT ONLY. Image endpoints are never allowed, and blockImagePreparation additionally aborts
    // any image-shaped body that reaches an allowed text path.
    gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy', '/api/specialist-proxy']);
  }

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._renderBakedScene1 && window._mountSceneDecisionPrompt
    && window._cgTemptFateCommitAtPersistence && window._tfoUnresolvedPending, { timeout: 30000 });

  // ── DETERMINISTIC REPLAY: baked Scene 1 + the recorded Scene-1 decision ────────────────────
  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'scene-b-only-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
                identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
    window._devBypass = true; s._intimacyDevMode = true;
    window._renderBakedScene1({ id: 'starter_first_sacrifice' }, window._bakedScene1For('starter_first_sacrifice'));
  });
  await page.waitForFunction(() => { const s = document.getElementById('splashOverlay'); return !s || s.classList.contains('splash-done'); }, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window._mountSceneDecisionPrompt(null));
  const keys = await page.evaluate(() => ({ a: document.getElementById('sceneDecisionA').getAttribute('data-choice'), b: document.getElementById('sceneDecisionB').getAttribute('data-choice') }));
  await page.click(keys.a === 'remain' ? '#sceneDecisionA' : '#sceneDecisionB', { timeout: 8000 });

  // ── HYDRATE SCENE A BYTE-FOR-BYTE. No regeneration, no repair, no reinterpretation. ────────
  const hydrated = await page.evaluate((a) => {
    const s = window.state;
    s.scenes = [JSON.parse(JSON.stringify(a.sceneA))];
    s.turnCount = 1;
    s._temptFateLedger = [JSON.parse(JSON.stringify(a.proposal))];
    s._temptFateDurableConsequences = [JSON.parse(JSON.stringify(a.durable))];
    s._temptOutcomeCommittedProposals = {}; s._temptOutcomeCommittedProposals[a.durable.proposalId] = true;
    // No new invocation, no pending extraction.
    s.tempt_fate_invoked_this_turn = false;
    delete s.temptFateWish;
    s._temptOutcomePending = {};
    delete s._tfoOwnedInvocation;
    return {
      scenes: s.scenes.length, sceneTextLen: s.scenes[0].text.length,
      durable: s._temptFateDurableConsequences,
      ledger: s._temptFateLedger,
      committed: Object.keys(s._temptOutcomeCommittedProposals),
      pending: Object.keys(s._temptOutcomePending), invoked: !!s.tempt_fate_invoked_this_turn
    };
  }, { sceneA, durable, proposal });

  console.log('\n── preflight: hydrated state ──');
  ok('Scene A\'s prose is in state byte-for-byte', hydrated.sceneTextLen === sceneA.text.length, hydrated.sceneTextLen + ' vs ' + sceneA.text.length);
  ok('exactly ONE durable consequence, identical to the committed fixture',
    hydrated.durable.length === 1 && JSON.stringify(hydrated.durable[0]) === JSON.stringify(durable), 'mismatch');
  ok('the owned proposal is restored identically', JSON.stringify(hydrated.ledger[0]) === JSON.stringify(proposal), 'mismatch');
  ok('the proposal is marked already-committed', hydrated.committed.length === 1 && hydrated.committed[0] === 'tfl_1', JSON.stringify(hydrated.committed));
  if (!ok('NO new Tempt invocation is set', hydrated.invoked === false, 'invoked=' + hydrated.invoked)) stop('a Tempt invocation is live');
  if (!ok('NO extractor pending record exists', hydrated.pending.length === 0, JSON.stringify(hydrated.pending))) stop('a pending extraction exists');

  // ── PREFLIGHT: the extractor cannot fire on an ordinary continuation ───────────────────────
  const extractorProbe = await page.evaluate(() => {
    const before = Object.keys(window.state._temptOutcomePending || {}).length;
    // An ORDINARY continuation's ownership shape: not invoked at start. Run the REAL function.
    const plan = { beats: [{ idx: 0, kind: 'narration', text: 'x', speaker: null }],
      __temptOwnership: { wasInvokedAtStart: false, proposalEntry: null, pendingOutcome: null, sceneIndex: 2 } };
    const r1 = window._cgTemptFateCommitAtPersistence(plan);
    // And the harder case: an ordinary continuation where the model hallucinates an outcome.
    const plan2 = { beats: [{ idx: 0, kind: 'narration', text: 'x', speaker: null }],
      __temptOwnership: { wasInvokedAtStart: false, proposalEntry: { id: 'tfl_1' }, pendingOutcome: { delivered: true }, sceneIndex: 2 } };
    const r2 = window._cgTemptFateCommitAtPersistence(plan2);
    return { before, r1: r1, r2: r2, after: Object.keys(window.state._temptOutcomePending || {}).length,
      durableAfter: (window.state._temptFateDurableConsequences || []).length };
  });
  console.log('\n── preflight: extractor containment ──');
  if (!ok('an ordinary continuation writes NO extractor pending record', extractorProbe.after === 0, JSON.stringify(extractorProbe))) stop('the extractor could fire on Scene B');
  if (!ok('...even when the model returns a hallucinated outcome on that continuation', extractorProbe.r2 === null, JSON.stringify(extractorProbe.r2))) stop('a hallucinated outcome created a pending record');
  ok('...and the already-committed consequence is untouched', extractorProbe.durableAfter === 1, 'durable=' + extractorProbe.durableAfter);

  if (checks.some((c) => !c.pass)) stop('a preflight check failed');
  persist('preflight.json', { checks, sceneBWorstUsd: SCENE_B_WORST, capUsd: CAP_USD, requests: SCENE_B_REQS, hydrated });
  persist('durable_before.json', hydrated.durable);
  writeText('scene_a_hydrated_prose.txt', sceneA.text);

  // ── THE CONTINUATION ───────────────────────────────────────────────────────────────────────
  console.log('\n── Scene B: neutral Say/Do, real Submit ──');
  console.log('    DO: "' + NEUTRAL_DO + '"');
  console.log('    SAY: (empty)');
  await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
  await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 10000 });
  await page.fill('#gnActionInput', NEUTRAL_DO);
  await page.fill('#gnDialogueInput', '');

  gate.setPhase('scene-B', SCENE_B_CEILING);
  await page.click('#gnSubmitBtn', { timeout: 10000 });
  console.log('    Submit clicked — waiting on real settlement.');
  await gate.waitForSettlement('scene-B', { watchdogMs: 20000, onWatchdog: (ms) => console.log('    ...still pending, ' + Math.round(ms / 1000) + 's') }).catch((e) => console.log('    settlement wait ended: ' + (e && e.message)));
  const tracked = gate.trackedCalls('scene-B');
  gate.closePhase();

  const after = await page.evaluate(async () => {
    const start = Date.now(), startLen = (window.state.scenes || []).length;
    while (Date.now() - start < 12000) { if ((window.state.scenes || []).length > startLen) break; await new Promise((r) => setTimeout(r, 200)); }
    const caps = window.state._sceneCaptures || {};
    const k = Object.keys(caps).map(Number).sort((a, b) => a - b);
    const last = k.length ? caps[k[k.length - 1]] : null;
    return {
      scenesLen: (window.state.scenes || []).length,
      sceneB: (window.state.scenes || []).length >= 2 ? window.state.scenes[window.state.scenes.length - 1] : null,
      capture: last ? { sysPrompt: last.sysPrompt, userPrompt: last.userPrompt, originalOutput: last.originalOutput, originalModel: last.originalModel } : null,
      invokedDuringB: !!window.state.tempt_fate_invoked_this_turn,
      durableAfter: window.state._temptFateDurableConsequences || [],
      pendingAfter: Object.keys(window.state._temptOutcomePending || {})
    };
  }).catch((e) => ({ error: String(e && e.message) }));

  const priced = tracked.map((t) => {
    const m = (t.requestBody && (t.requestBody.model || t.requestBody.preferredModel)) || null;
    return { url: t.url, model: m, status: t.status, elapsedMs: t.elapsedMs };
  });
  persist('scene_b_tracked_calls.json', priced);
  persist('scene_b_result.json', after);
  persist('durable_after.json', after.durableAfter);
  writeText('scene_b_planner_and_author_system_prompt.txt', (after.capture && after.capture.sysPrompt) || '');
  writeText('scene_b_user_prompt.txt', (after.capture && after.capture.userPrompt) || '');
  writeText('scene_b_raw_output.txt', (after.capture && after.capture.originalOutput) || '');
  writeText('scene_b_rendered_text.txt', (after.sceneB && after.sceneB.text) || '');
  fs.writeFileSync(path.join(OUT_DIR, 'console_log.jsonl'), consoleLines.map((l) => JSON.stringify({ t: l })).join('\n'));

  console.log('\n' + '='.repeat(90));
  console.log('  dispatches       : ' + tracked.length + ' of ' + SCENE_B_CEILING + ' permitted');
  console.log('  Scene B delivered: ' + (after.scenesLen >= 2) + (after.sceneB ? (' (' + after.sceneB.text.length + ' chars)') : ''));
  console.log('  new invocation   : ' + after.invokedDuringB + '   (must be false)');
  console.log('  durable outcomes : ' + (after.durableAfter || []).length + '   (must stay 1)');
  console.log('  pending extracts : ' + JSON.stringify(after.pendingAfter) + '   (must be empty)');
  console.log('\n  NO semantic verdict is rendered here. The five review questions are a human call.');
  console.log('  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exitCode = 0;
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
