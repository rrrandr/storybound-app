// AUTH RETURN and INITIALIZATION RECOVERY, from a genuinely LOCKED entrance. Provider-free, $0.
//
// Built on the corrected environment from _fs_locked_entrance_checkpoint.mjs (1c58b5d9): the
// existing session fixture, /api/config served, the entitled profiles row, and — the one that
// mattered — purchase_intents answered with ZERO ROWS so no phantom checkout recovery fires.
//
// NO unlock-then-relock, NO screen rescue, NO manually completed initialization, NO opt-out flag
// writes. Every reader action is a trusted pointer click. Each arm reports only what its own run
// exercised.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { stageOf, isProviderEndpoint, MEMORY, verifierVerdict, fsPlannerCaptured }
  from './_replay_fixtures.mjs';
import { configBody, installSession, isAuthOrigin, installEntitledProfileStub }
  from './_test_session_env.mjs';
import { findFSDef, launchFS } from './_fs_story_setup.mjs';

const ARM = process.argv[2] || 'auth';           // auth | setupchar | continuity
const OUT = '_audit_out/opening_recovery';
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const FS_PLANNER = (() => { try { return fsPlannerCaptured(); } catch (_) { return null; } })();
const AUTHOR_FIXTURE = (() => {
  const j = JSON.parse(fs.readFileSync('_fs_live_out/run_2026-10-06T16-50-01-923Z/wire/029_res.json', 'utf8'));
  const c = (j.choices || [{}])[0]?.message?.content || j.content;
  return typeof c === 'string' ? c : JSON.stringify(c);
})();

// ── MUTABLE HARNESS STATE ────────────────────────────────────────────────────────────────────
let failSetupKeys = [];        // system-prompt substrings to fail, for the injected failure
const setupReqs = [];          // every provider request seen while setup runs
const providerReqs = [];       // all provider requests, classified
const oasReqs = [];
const plannerReqs = [];
const chargeOps = [];
const debited = new Map();
let balance = 9999999;
let injectedFailures = 0;
const consoleAll = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => consoleAll.push(m.type().toUpperCase() + ' ' + m.text()));
page.on('pageerror', (e) => consoleAll.push('PAGEERROR ' + String(e.message)));

await installSession(page);
await page.route('**/*', async (route) => {
  const req = route.request(), url = req.url();
  if (isAuthOrigin(url)) { try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {} return; }
  if (!/\/api\//.test(url)) { try { await route.continue(); } catch (_) {} return; }
  if (/\/api\/config\b/.test(url)) { try { await route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); } catch (_) {} return; }
  if (/\/api\/(geo|csp-report|beta-events)\b/.test(url)) { try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {} return; }
  if (/\/api\/consume-fortune/.test(url)) {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const opId = (b && (b.operationId || b.opId || b.operation_id)) || null;
    const amount = Number((b && (b.amount || b.fortunes)) || 0);
    chargeOps.push({ opId, amount, at: Date.now() });
    if (opId && debited.has(opId)) {
      try { await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, fortunesRemaining: debited.get(opId), idempotent: true }) }); } catch (_) {}
      return;
    }
    balance -= (amount > 0 ? amount : 0);
    if (opId) debited.set(opId, balance);
    try { await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, fortunesRemaining: balance }) }); } catch (_) {}
    return;
  }
  if (!isProviderEndpoint(url)) { try { await route.abort(); } catch (_) {} return; }
  let msgs = []; try { msgs = (JSON.parse(req.postData() || '{}').messages) || []; } catch (_) {}
  const sys0 = String((msgs[0] || {}).content || '');
  const stage = stageOf(sys0);
  const head = sys0.replace(/\s+/g, ' ').slice(0, 90);
  const rec = { stage, head, chars: sys0.length, at: Date.now(), consoleAt: consoleAll.length };
  providerReqs.push(rec);
  if (window_setupRunning()) setupReqs.push(rec);
  // THE INJECTED FAILURE: fail only requests whose own system prompt was OBSERVED during the
  // successful setup control, so the arm cannot "fail" something setup never asks for.
  if (failSetupKeys.length && failSetupKeys.some((k) => sys0.includes(k))) {
    injectedFailures++;
    consoleAll.push('HARNESS injected failure for: ' + head);
    try { await route.fulfill({ status: 500, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness_injected_setup_failure' }) }); } catch (_) {}
    return;
  }
  let body = '{}';
  if (stage === 'oas') {
    oasReqs.push({ whole: msgs.map(m => String(m.content || '')).join('\n') });
    body = JSON.stringify({ li_dialogue: 'You answer me in front of them, then.',
      li_action: 'He does not lower The Answer.', li_next_prompt: 'Say it again, louder.',
      li_face_state: 'neutral',
      scene_state: (oasReqs.length >= 6 ? 'resolve' : 'continue'), scene_tone: 'tense',
      user_signal: 'engaged', temperature_shift: 0 });
  } else if (stage === 'author') body = AUTHOR_FIXTURE;
  else if (stage === 'planner') plannerReqs.push({ whole: msgs.map(m => String(m.content || '')).join('\n') });
  if (stage === 'planner') body = FS_PLANNER || '{}';
  else if (stage === 'memory') body = MEMORY;
  else if (stage === 'verifier') body = verifierVerdict([]);
  else if (stage === 'bible') body = JSON.stringify({ ok: true });
  try { await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: body }) }); } catch (_) {}
});
let _setupRunning = false;
function window_setupRunning() { return _setupRunning; }

await installEntitledProfileStub(page);
// ZERO ROWS for purchase_intents — the fix from 1c58b5d9. Registered last so it runs first.
const purchaseIntentReqs = [];
await page.route('**/sb-test.localhost/**', async (route) => {
  const req = route.request(), url = req.url();
  if (req.method() === 'GET' && /\/rest\/v1\/purchase_intents(\?|$)/.test(url)) {
    purchaseIntentReqs.push(url.slice(url.indexOf('purchase_intents')).slice(0, 90));
    try { await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Content-Range': '*/0' }, body: '[]' }); } catch (_) {}
    return;
  }
  try { await route.fallback(); } catch (_) {}
});

// ── REACH THE LOCKED ENTRANCE ────────────────────────────────────────────────────────────────
const ONBOARD = [
  { sel: '.skip-render-warn-btn[data-act="skip"]', what: '"Skip anyway"' },
  { sel: '#pcLookSkipBtn', what: 'look Skip' },
  { sel: '#liRenderSkipBtn', what: 'LI render Skip' }
];
const trail = [];
async function clearOverlays() {
  for (let r = 0; r < 6; r++) {
    let acted = false;
    for (const o of ONBOARD) {
      const vis = await page.evaluate((sel) => {
        const e = document.querySelector(sel); return !!(e && e.getClientRects().length > 0); }, o.sel);
      if (!vis) continue;
      await page.click(o.sel, { timeout: 6000 })
        .then(() => trail.push(o.what)).catch(() => trail.push(o.what + ' refused'));
      acted = true; await page.waitForTimeout(1200); break;
    }
    if (!acted) break;
  }
}
async function toEntrance(tag) {
  const log = [];
  for (let i = 0; i < 25; i++) {
    const st = await page.evaluate(() => {
      const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
      return { entrance: v('bakedOASExamineBtn') && v('bakedOASSubmitBtn'),
               cover: v('coverNextBtn'), next: v('nextPageBtn'), front: !!window._frontispieceActive };
    });
    if (st.entrance) { log.push('reached after ' + i + ' turns'); break; }
    await clearOverlays();
    if (st.cover) { await page.click('#coverNextBtn', { timeout: 6000 }).catch(() => {}); log.push('cover'); }
    else if (st.front) { await page.evaluate(() => { try { window.dismissFatelandsFrontispiece(); } catch (_) {} }); log.push('frontispiece');
      for (let w = 0; w < 12; w++) { if (await page.evaluate(() => !window._frontispieceActive)) break; await page.waitForTimeout(500); } }
    else if (st.next) { await page.click('#nextPageBtn', { timeout: 6000 }).catch(() => {}); log.push('next'); }
    else { log.push('no control'); break; }
    await page.waitForTimeout(1100);
  }
  console.log('   [' + tag + '] navigation: ' + (log.join(' -> ') || '(nothing needed)')
    + (trail.length ? '  overlays: ' + trail.join(', ') : ''));
  return page.evaluate(() => {
    const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
    return { onScreen: v('bakedOASExamineBtn') && v('bakedOASSubmitBtn'),
             locked: !window.state._bakedGenesisUnlocked,
             setupComplete: !!window.state._bakedSetupComplete };
  });
}

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function'
  && document.readyState === 'complete', { timeout: 45000 }).catch(() => {});
const def = await findFSDef(page);
await launchFS(page, def);
await page.waitForTimeout(4000);
const at0 = await toEntrance('fresh');
console.log('ARM=' + ARM + '  at the entrance: ' + JSON.stringify(at0));
if (!at0.onScreen) { console.log('\n  UNPROVEN — the locked entrance was not reached.'); await browser.close(); process.exit(1); }
t('the arm starts at a GENUINELY LOCKED entrance', at0.onScreen && at0.locked === true
  && at0.setupComplete === false, JSON.stringify(at0));
t('no phantom purchase intent', !consoleAll.some(l => /Found unresumed purchase intent/.test(l)));

// ── TYPE THE ANSWER, with real typing ────────────────────────────────────────────────────────
const SAY = 'I shaped nothing. Ask me properly.';
const DO  = 'I keep my eyes on his.';
await page.click('#bakedOASSay'); await page.keyboard.type(SAY, { delay: 6 });
await page.click('#bakedOASDo');  await page.keyboard.type(DO,  { delay: 6 });
const typed = await page.evaluate(() => ({
  say: document.getElementById('bakedOASSay').value, do: document.getElementById('bakedOASDo').value }));
t('real typing reached both fields', typed.say === SAY && typed.do === DO, JSON.stringify(typed));

const gateUp = async () => page.evaluate(() => {
  const m = document.getElementById('bakedUnlockModal');
  const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
  return { shown: !!(m && m.classList.contains('show')), go: v('buGoBtn'), cancel: v('buCancelBtn') };
});
const waitOutcome = async (ms = 60) => {
  for (let i = 0; i < ms; i++) {
    if (await page.evaluate(() => !!window.state.intimacyDialogue)) return 'opened';
    if (consoleAll.some(l => /\[BAKED:SETUP\] ABORTED/.test(l))) return 'aborted';
    await page.waitForTimeout(1000);
  }
  return 'pending';
};

if (ARM === 'auth') {
  console.log('\n=== AUTH RETURN — the answer must survive the reload and submit once ===');
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  const g = await gateUp();
  t('Submit raised the gate (the reader is locked)', g.shown === true, JSON.stringify(g));
  const stashed = await page.evaluate(() => {
    const raw = localStorage.getItem('sb_baked_pending_entry');
    return raw ? JSON.parse(raw) : null;
  });
  t('production stashed BOTH fields before the gate',
    !!(stashed && stashed.entranceSay === SAY && stashed.entranceDo === DO), JSON.stringify(stashed));
  t('nothing dispatched or charged yet', oasReqs.length === 0 && chargeOps.length === 0);

  // THE RELOAD a sign-in performs.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window._advanceStagedScene === 'function'
    && document.readyState === 'complete', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(6000);
  const restoredBy = await page.evaluate(() => ({
    marker: !!localStorage.getItem('sb_baked_pending_entry'),
    starterId: window.state._starterId || null,
    scene1: !!window.state._bakedScene1MountedAt }));
  console.log('   after reload, before any harness action: ' + JSON.stringify(restoredBy));
  const restoredLine = consoleAll.filter(l => /BAKED:RESUME/.test(l));
  console.log('   resume lines: ' + JSON.stringify(restoredLine.slice(0, 3)));
  t('PRODUCTION re-opened the Book on its own after the reload',
    restoredBy.starterId === 'starter_first_sacrifice' && restoredBy.scene1 === true,
    JSON.stringify(restoredBy));
  const back = await toEntrance('after reload');
  t('the entrance is on screen again', back.onScreen === true, JSON.stringify(back));
  const fields = await page.evaluate(() => ({
    say: (document.getElementById('bakedOASSay') || {}).value,
    do: (document.getElementById('bakedOASDo') || {}).value }));
  console.log('   restored fields: ' + JSON.stringify(fields));
  t('PRODUCTION restored the Say', fields.say === SAY, JSON.stringify(fields.say));
  t('and the Do', fields.do === DO, JSON.stringify(fields.do));
  t('nothing auto-submitted', oasReqs.length === 0, 'oas=' + oasReqs.length);

  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  const g2 = await gateUp();
  t('the gate raised its own modal on return', g2.shown === true && g2.go === true, JSON.stringify(g2));
  _setupRunning = true;
  await page.click('#buGoBtn', { timeout: 8000 });
  const out = await waitOutcome();
  _setupRunning = false;
  console.log('   outcome: ' + out + '  charges: ' + chargeOps.length + '  debits: ' + debited.size);
  t('confirming opened the OAS', out === 'opened', 'outcome=' + out);
  t('EXACTLY ONE first OAS dispatch', oasReqs.length === 1, 'oas=' + oasReqs.length);
  t('carrying the preserved Say', oasReqs.length === 1 && oasReqs[0].whole.includes(SAY));
  t('AND the preserved Do', oasReqs.length === 1 && oasReqs[0].whole.includes(DO));
  t('exactly one debited operation', debited.size === 1, 'debits=' + debited.size);
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3000);
  t('no duplicate dispatch', oasReqs.length === 1, 'oas=' + oasReqs.length);
}

if (ARM === 'continuity') {
  console.log('\n=== CONTINUITY: WHAT REACHES THE OUTGOING PLANNER REQUEST ===');
  _setupRunning = true;
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  await page.click('#buGoBtn', { timeout: 8000 });
  const o1 = await waitOutcome();
  _setupRunning = false;
  t('the OAS opened', o1 === 'opened', 'outcome=' + o1);
  // Drive the OAS to the authored interruption, then take the branch, so BOTH ledger rows exist.
  for (let i = 0; i < 16; i++) {
    if (await page.evaluate(() => !!document.getElementById('sceneDecisionPrompt'))) break;
    await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} });
    await page.waitForTimeout(2500);
  }
  const rows = await page.evaluate(() => {
    const L = window._sceneLedgerGet ? window._sceneLedgerGet(window.state, false) : null;
    return (L && L.entries ? L.entries : []).map(e => ({ kind: e.kind, scene: e.sceneNumber,
      card: e.card, assist: e.cardAssist || null,
      event: String(e.plannedEventFull || e.plannedEvent || '').slice(0, 70) }));
  });
  console.log('   ledger rows before the branch: ' + JSON.stringify(rows, null, 1).slice(0, 600));
  t('the authored opening row exists', rows.some(r => r.kind === 'baked'), JSON.stringify(rows.map(r => r.kind)));
  t('the interruption row exists too', rows.some(r => r.kind === 'oas_interrupt'),
    JSON.stringify(rows.map(r => r.kind)));
  const btnId = await page.evaluate(() => {
    for (const id of ['sceneDecisionA', 'sceneDecisionB']) {
      const el = document.getElementById(id);
      if (el && el.getAttribute('data-choice') === 'run') return id;
    } return null;
  });
  t('the branch is offered', !!btnId, 'btn=' + btnId);
  await clearOverlays();
  if (btnId) await page.click('#' + btnId, { timeout: 15000 });
  for (let i = 0; i < 40 && plannerReqs.length === 0; i++) await page.waitForTimeout(1000);
  console.log('   planner requests captured: ' + plannerReqs.length);
  t('a planner request went out', plannerReqs.length >= 1);
  if (plannerReqs.length) {
    const w = plannerReqs[0].whole;
    fs.writeFileSync(OUT + '/planner_continuity.txt', w);
    const has = (rx) => rx.test(w);
    console.log('   section present: ' + has(/ALREADY ON THE PAGE/));
    t('the bounded ledger section reached the planner', has(/ALREADY ON THE PAGE/));
    t('the authored opening is labelled as authored', has(/the authored opening established:/));
    t('OPENING FACT — the wish twisted', has(/began to twist/));
    t('OPENING FACT — the charge of shaping', has(/charged Lirael with shaping/));
    t('OPENING FACT — The Answer in her hand', has(/The Answer in her hand/));
    t('the interruption row is labelled as the opening ending', has(/the opening ended:/));
    t('INTERRUPTION FACT — the formal inquiry venue', has(/formal inquiry/i));
    // NO DUPLICATION of what the payload already carries.
    const count = (rx) => (w.match(rx) || []).length;
    console.log('   RECENT ONE-ON-ONE EXCHANGE blocks: ' + count(/RECENT ONE-ON-ONE EXCHANGE/g));
    t('the OAS exchange is not duplicated', count(/RECENT ONE-ON-ONE EXCHANGE/g) <= 1);
    t('the whole continuity spine was NOT appended', !has(/STORY LEDGER \(authoritative/));
    t('NOW: page … is not appended either', !has(/\n  NOW: page /));
    t('no planned event is presented as history', !has(/the authored opening established: *$/m));
  }
  fs.writeFileSync(OUT + '/continuity.json', JSON.stringify({ rows, planners: plannerReqs.length }, null, 2));
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
  process.exit(fail ? 1 : 0);
}

if (ARM === 'setupchar') {
  // SETUP CHARACTERIZATION. Not a failure test: it records what deferred initialization actually
  // requests on this path. The answer turned out to be "nothing", which is why the
  // response-failure test that was proposed does not apply here.
  console.log('\n=== SETUP CHARACTERIZATION — what does deferred initialization request? ===');
  console.log('--- step 1: a SUCCESSFUL setup control, to learn what setup actually requests');
  _setupRunning = true;
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  t('Submit raised the gate', (await gateUp()).shown === true);
  await page.click('#buGoBtn', { timeout: 8000 });
  const ctrlOut = await waitOutcome();
  _setupRunning = false;
  // WHICH REQUESTS BELONG TO SETUP — bounded by production's own lines, not by a hand-set window.
  const startIdx = consoleAll.findIndex(l => /\[BAKED:SETUP\] running deferred story initialization/.test(l));
  const doneIdx = consoleAll.findIndex(l => /\[BAKED:SETUP\] story initialization complete/.test(l));
  const inSetup = providerReqs.filter(r => startIdx >= 0 && doneIdx > startIdx
    && r.consoleAt >= startIdx && r.consoleAt <= doneIdx);
  console.log('   control outcome: ' + ctrlOut);
  console.log('   setup window: console[' + startIdx + '..' + doneIdx + ']');
  console.log('   provider calls DURING setup: ' + inSetup.length);
  inSetup.forEach((r, i) => console.log('     ' + (i + 1) + '. [' + r.stage + '] ' + r.chars + 'c :: ' + r.head));
  console.log('   all provider calls this run: ' + providerReqs.length);
  providerReqs.forEach((r, i) => console.log('     ' + (i + 1) + '. [' + r.stage + '] console@'
    + r.consoleAt + ' ' + r.chars + 'c :: ' + r.head.slice(0, 70)));
  t('THE CONTROL SUCCEEDED — setup completed and the OAS opened', ctrlOut === 'opened',
    'outcome=' + ctrlOut);
  t('production logged both setup boundaries', startIdx >= 0 && doneIdx > startIdx,
    'start=' + startIdx + ' done=' + doneIdx);
  // THE DECIDING QUESTION for a deterministic failure arm.
  // THE OBSERVED RESULT, not a defect: on First Sacrifice's baked path the character bibles are
  // committed locally, the plot comes from the seed, and the rest of generation is deferred or
  // suppressed — so deferred initialization asks nothing of a provider. A response-failure test
  // therefore has nothing to fail here. Recorded as a characteristic of this path.
  t('CHARACTERIZED: deferred initialization makes NO provider calls on this path',
    inSetup.length === 0, 'provider calls during setup: ' + inSetup.length
    + ' (a non-zero count would mean this path changed and a response-failure test becomes possible)');
  t('and the only call in the run is the OAS first turn, after setup completed',
    providerReqs.length === 1 && providerReqs[0].stage === 'oas'
    && providerReqs[0].consoleAt > doneIdx,
    JSON.stringify(providerReqs.map(r => r.stage + '@' + r.consoleAt)));
  fs.writeFileSync(OUT + '/setup_control.json', JSON.stringify(
    { ctrlOut, startIdx, doneIdx, inSetup, providerReqs }, null, 2));

}

fs.writeFileSync(OUT + '/' + ARM + '.console.log', consoleAll.join('\n'));
fs.writeFileSync(OUT + '/' + ARM + '.json', JSON.stringify(
  { at0, providerReqs, oas: oasReqs.length, chargeOps, debits: [...debited.keys()],
    purchaseIntentReqs, injectedFailures, trail }, null, 2));
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
process.exit(fail ? 1 : 0);
