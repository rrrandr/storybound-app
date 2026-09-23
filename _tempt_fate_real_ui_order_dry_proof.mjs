// REAL UI ORDER — DRY PROOF (Roman, 2026-09-23, after the first authorized run bought nothing)
//
// Roman: "Before any new paid run, Claude should dry-prove the complete real UI order: choose
// Scene 1 decision → seal Tempt wish → submit Scene A, with every provider call stubbed/fail-closed.
// It must verify the decision persists, Scene A is no longer prompt-mounted, and no image/classifier
// call escapes the dry gate."
//
// WHY: the authorized run dispatched a classifier and a scaffold (both 200, $0.0011) and then hit
// app.js:233097 — a Scene-2+ request with no recorded opening decision mounts the decision prompt
// and returns WITHOUT generating. Every prior dry control missed this because they all call
// _runCGScreenplayGen directly and never drive a real Submit through that gate. This proof drives
// the EXACT click order the live script now performs, so the next paid run cannot fail the same way.
//
// SAFETY: no allowRealPaths is ever declared, so no provider path has a real lane at all. The three
// text endpoints are STUBBED (answered locally, route.continue() never called); image endpoints are
// neither stubbed nor allowed, so they hit the gate's fail-closed branch. The master assertion is
// empirical: gate.realCalls() must be EMPTY.
//
// usage: node _tempt_fate_real_ui_order_dry_proof.mjs   (dry; zero real provider dispatches)

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_real_ui_order_dry_proof_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true }); // never let a prior run's log stand in as this run's evidence
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Mirrors the live-run script exactly. 'remain' is Roman's chosen branch for the memory-erasure test.
const SCENE1_DECISION = 'remain';
const WISH_TEXT = 'everyone forgets the ceremony happened';

(async () => {
  console.log('=== REAL UI ORDER DRY PROOF — decision → seal → submit (zero real dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => { const t = m.text(); consoleLines.push({ text: t, at: Date.now() }); });

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  // ── STUBS. No allowRealPaths anywhere: nothing has a real lane, so nothing can escape. ──
  const classifierRequests = [];
  const sceneRequests = [];
  const parse = (req) => { try { return JSON.parse(req.postData() || '{}'); } catch (_) { return {}; } };
  // A request is the wish classifier if it carries the classifier's own distinctive instruction —
  // matched on the prompt the real _classifyWishCG builds (app.js ~199739), not on a guess.
  const isClassifier = (b) => JSON.stringify(b || {}).includes('classify whether a fate-card');

  gate.stub('/api/mistral-proxy', async (req) => { sceneRequests.push({ endpoint: 'mistral-proxy', body: parse(req) }); return { content: null }; });
  gate.stub('/api/proxy', async (req) => {
    const b = parse(req);
    sceneRequests.push({ endpoint: 'proxy', body: b });
    const sys = (b.messages || []).find((m) => m.role === 'system');
    const usr = (b.messages || []).find((m) => m.role === 'user');
    return { content: JSON.stringify(buildScheduleAwareStubResponse(sys && sys.content, usr && usr.content, true)) };
  });
  gate.stub('/api/chatgpt-proxy', async (req) => {
    const b = parse(req);
    // This ONE endpoint really does serve two different roles in production (the wish classifier and
    // the OpenAI terminal tier), so the stub dispatches on which role actually sent the request.
    // Each branch returns ONE real shape — this is not a shape union for a single caller.
    if (isClassifier(b)) {
      classifierRequests.push(b);
      return { choices: [{ message: { content: JSON.stringify({ scope: 'out_of_scope', reason: 'stubbed by the dry UI-order proof' }) } }] };
    }
    sceneRequests.push({ endpoint: 'chatgpt-proxy', body: b });
    const sys = (b.messages || []).find((m) => m.role === 'system');
    const usr = (b.messages || []).find((m) => m.role === 'user');
    return { choices: [{ message: { content: JSON.stringify(buildScheduleAwareStubResponse(sys && sys.content, usr && usr.content, true)) } }] };
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._renderBakedScene1 === 'function'
    && typeof window._sceneDecisionNeeded === 'function'
    && typeof window._mountSceneDecisionPrompt === 'function'
    && window.WishSequence, { timeout: 30000 });

  await page.evaluate(() => {
    window.state.storyId = 'uiorder-' + Date.now();
    window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
    window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
    window.state.turnCount = 0; window.state.scenes = [];
    window.state.subscribed = true; window.state.fortunes = 9999999; window.state.access = 'sub';
    window.state._starterId = 'starter_first_sacrifice';
    window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
    window._devBypass = true; window.state._intimacyDevMode = true;
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    window._renderBakedScene1({ id: 'starter_first_sacrifice' }, pkg);
  });
  await page.waitForFunction(() => { const s = document.getElementById('splashOverlay'); return !s || s.classList.contains('splash-done'); }, { timeout: 15000 }).catch(() => {});

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. STEP ONE — the Scene-1 reader decision, recorded by a REAL click');
  const needBefore = await page.evaluate(() => window._sceneDecisionNeeded());
  ok('the decision gate is genuinely ACTIVE before the click — this proof is exercising the real prerequisite, not a no-op', needBefore === true, 'needed=' + needBefore);

  const mounted = await page.evaluate(() => {
    window._mountSceneDecisionPrompt(null);
    const a = document.getElementById('sceneDecisionA'), b = document.getElementById('sceneDecisionB');
    return { mounted: !!(a && b), a: a && a.getAttribute('data-choice'), b: b && b.getAttribute('data-choice'), aLabel: a && a.textContent, bLabel: b && b.textContent };
  });
  ok('the real decision prompt mounted with both authored branches from the baked package', mounted.mounted === true, JSON.stringify(mounted));
  console.log('    axis: A="' + mounted.aLabel + '" (' + mounted.a + ')  |  B="' + mounted.bLabel + '" (' + mounted.b + ')');
  const btn = mounted.a === SCENE1_DECISION ? '#sceneDecisionA' : mounted.b === SCENE1_DECISION ? '#sceneDecisionB' : null;
  ok('the chosen branch "' + SCENE1_DECISION + '" matches one of the offered keys (not a guess that would silently pick the wrong scene)', !!btn, 'offered=' + mounted.a + '/' + mounted.b);
  if (!btn) { await browser.close(); process.exit(1); }
  await page.click(btn, { timeout: 8000 });

  const afterClick = await page.evaluate(() => ({ needed: window._sceneDecisionNeeded(), recorded: window.state._sceneDecisions || null }));
  ok('the click CLEARED the gate — _sceneDecisionNeeded() is now false', afterClick.needed === false, JSON.stringify(afterClick));
  ok('the recorded decision is the chosen branch, stored as structured state', JSON.stringify(afterClick.recorded || {}).includes(SCENE1_DECISION), JSON.stringify(afterClick.recorded));
  fs.writeFileSync(path.join(OUT_DIR, 'decision.json'), JSON.stringify({ mounted, afterClick }, null, 2));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. STEP TWO — seal the Tempt wish through the real zoom, and confirm the decision SURVIVES it');
  await page.click('.tempt-fate-card', { timeout: 8000 });
  await page.waitForSelector('.tempt-wish-columns', { timeout: 8000 });
  await page.click('.tempt-wish-columns', { timeout: 8000 });
  await page.fill('#temptZoomInput', WISH_TEXT);
  gate.setPhase('wish-classifier', 1);
  await page.click('.tempt-proceed-btn', { timeout: 8000 });
  await page.waitForTimeout(4000);
  const classifierTracked = gate.trackedCalls('wish-classifier');
  gate.closePhase();

  const afterSeal = await page.evaluate(() => ({
    needed: window._sceneDecisionNeeded(),
    wish: window.state.temptFateWish || null,
    invoked: !!window.state.tempt_fate_invoked_this_turn
  }));
  ok('the wish sealed through the real UI', afterSeal.wish === WISH_TEXT && afterSeal.invoked === true, JSON.stringify(afterSeal));
  ok('the classifier request was CAPTURED by the stub, not escaped — and it is genuinely the classifier', classifierRequests.length === 1 && classifierTracked.length === 1, 'stubbed=' + classifierRequests.length + ' tracked=' + classifierTracked.length);
  ok('THE DECISION PERSISTS through the Tempt seal — _sceneDecisionNeeded() is still false', afterSeal.needed === false, JSON.stringify(afterSeal));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. STEP THREE — submit Scene A, and prove it is NOT prompt-mounted this time');
  await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
  await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 8000 });
  await page.fill('#gnActionInput', 'Lirael closes her eyes for a long moment, then opens them again.');
  await page.fill('#gnDialogueInput', '');
  const consoleMarkBeforeSubmit = consoleLines.length;
  gate.setPhase('scene-A', 28);
  await page.click('#gnSubmitBtn', { timeout: 8000 });
  // Generation against stubs is fast, but give the full pipeline real room to run.
  await page.waitForFunction(() => (window.state.scenes || []).length >= 1, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  gate.closePhase();

  const afterSubmit = consoleLines.slice(consoleMarkBeforeSubmit);
  const refusalFired = afterSubmit.some((l) => /SCENE-DECISION.*requested before the reader's choice was recorded/.test(l.text));
  const sceneState = await page.evaluate(() => ({ scenes: (window.state.scenes || []).length, needed: window._sceneDecisionNeeded() }));
  fs.writeFileSync(path.join(OUT_DIR, 'after_submit_console.json'), JSON.stringify(afterSubmit, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'scene_requests.json'), JSON.stringify(sceneRequests.map((r) => ({ endpoint: r.endpoint, model: r.body && (r.body.model || r.body.preferredModel) })), null, 2));

  // THE DECISIVE ASSERTION: the refusal that killed the paid run must not fire.
  ok('Scene A is NOT prompt-mounted — the "[SCENE-DECISION] requested before the reader\'s choice was recorded" refusal that ended the paid run did NOT fire', refusalFired === false, JSON.stringify(afterSubmit.slice(0, 6)));
  ok('generation actually proceeded past the gate — real scene-role requests were dispatched to the stubs after Submit', sceneRequests.length >= 1, 'sceneRequests=' + sceneRequests.length);
  ok('Scene A rendered into state.scenes (the full dry pipeline completed, not merely passed the gate)', sceneState.scenes >= 1, JSON.stringify(sceneState));
  ok('the decision STILL persists after generation', sceneState.needed === false, JSON.stringify(sceneState));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. CONTAINMENT — nothing escaped the dry gate');
  const appImageAttempts = gate.unstubbed().filter((u) => /\/api\/(image|bfl-kontext|dashscope-image)/.test(u.url || ''));
  // OBSERVATION, reported rather than asserted: in THIS (healthy) flow the app made no image
  // attempt at all — no [WISH-SEQ] logs appear after Submit, so _prefireWishImage never ran. In the
  // paid run it DID fire, because the decision gate aborted generation early while the post-turn
  // hook still mounted the cinesequence. An "all attempts were blocked" assertion over an empty
  // list passes vacuously, so it is not counted as evidence here.
  console.log('    image attempts made by the app in this flow: ' + appImageAttempts.length + (appImageAttempts.length === 0 ? '  (none — see note in source; NOT treated as proof)' : ''));
  // THE CONTROL MUST BITE: probe each image endpoint deliberately, so this run proves the image lane
  // is closed under THIS gate configuration rather than inferring it from an absence.
  const IMAGE_PATHS = ['/api/image', '/api/bfl-kontext', '/api/dashscope-image'];
  const beforeProbe = gate.unstubbed().length;
  for (const p of IMAGE_PATHS) {
    await page.evaluate((pp) => fetch(pp, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'dry-proof containment probe' }) }).catch(() => {}), p);
  }
  await page.waitForTimeout(1500);
  const probed = gate.unstubbed().slice(beforeProbe);
  for (const p of IMAGE_PATHS) {
    ok('image endpoint ' + p + ' is closed under this run\'s gate — a deliberate probe was attempted and ABORTED before dispatch', probed.some((u) => (u.url || '').includes(p)), JSON.stringify(probed.map((u) => u.url)));
  }
  ok('ZERO real provider dispatches anywhere in this run — the empirical claim that does not rest on any reasoning above', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length + ' ' + JSON.stringify(gate.realCalls().map((c) => c.url)));

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('REAL UI ORDER DRY PROOF: ' + passed + '/' + results.length + ' passed');
  console.log('written to ' + OUT_DIR + '/');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('PROOF ERROR:', e && e.stack || e); process.exit(2); });
