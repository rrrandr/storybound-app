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

const ARM = process.argv[2] || 'auth';           // auth | setupchar | continuity | card | stale | commit | cardless
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
let failAuthor = false;
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
  } else if (stage === 'author') {
    if (failAuthor) {
      injectedFailures++;
      consoleAll.push('HARNESS failed the author call for this attempt');
      try { await route.fulfill({ status: 500, contentType: 'application/json',
        body: JSON.stringify({ error: 'harness_injected_author_failure' }) }); } catch (_) {}
      return;
    }
    body = AUTHOR_FIXTURE;
  }
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


// Reach the point where production offers the scene-end hand, with the reader's own controls.
async function reachSceneEndHand() {
  for (let i = 0; i < 40; i++) {
    const loading = await page.evaluate(() => {
      const e = document.getElementById('gnSceneLoading'); return !!(e && e.getClientRects().length > 0); });
    if (!loading) break;
    await page.waitForTimeout(1000);
  }
  let hand = { count: 0, onScreen: 0, mount: null };
  for (let i = 0; i < 60; i++) {
    hand = await page.evaluate(() => {
      const m = window._activeCardMount();
      const cards = m ? Array.from(m.querySelectorAll('.fate-card, [data-card]')) : [];
      return { mount: m ? m.id : null, count: cards.length,
               onScreen: cards.filter(c => c.getClientRects().length > 0).length };
    });
    if (hand.onScreen > 0) break;
    await clearOverlays();
    const adv = await page.evaluate(() => {
      const nb = document.getElementById('stagedNextBtn');
      if (nb && nb.getClientRects().length > 0 && !nb.disabled) return 'next';
      const br = document.getElementById('stagedBeatReader');
      if (br && br.getClientRects().length > 0) return 'reader';
      return null;
    });
    if (adv === 'next') await page.click('#stagedNextBtn', { timeout: 6000 }).catch(() => {});
    else if (adv === 'reader') await page.click('#stagedBeatReader', { timeout: 6000 }).catch(() => {});
    else break;
    await page.waitForTimeout(600);
  }
  return hand;
}
const settleInputs = async () => {
  let prev = null, stable = 0;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => { const i2 = window._getActiveTurnInputs();
      return i2.actInput.value + '\u0000' + i2.diaInput.value; });
    if (v === prev) { if (++stable >= 3) break; } else stable = 0;
    prev = v; await page.waitForTimeout(600);
  }
};
const typeOnly = async (txt) => {
  const ids = await page.evaluate(() => { const i = window._getActiveTurnInputs();
    return { a: i.actInput.id, d: i.diaInput.id }; });
  for (const id of [ids.a, ids.d]) {
    await page.click('#' + id);
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
  }
  await page.click('#' + ids.d);
  await page.keyboard.type(txt, { delay: 4 });
  return ids;
};
const committedFor = (sceneNumber) => page.evaluate((n) => {
  const L = window._sceneLedgerGet ? window._sceneLedgerGet(window.state, false) : null;
  const rows = (L && L.entries) ? L.entries : [];
  const r = rows.filter(e => Number(e.sceneNumber) === Number(n)).pop() || null;
  return r ? { kind: r.kind, scene: r.sceneNumber, card: r.card || null,
               assist: r.cardAssist || null } : null;
}, sceneNumber);


// EVERY ledger entry, so rows are matched on recorded identity rather than on a scene number read
// after completion (which reports the NEXT scene, not the one just planned).
const allRows = () => page.evaluate(() => {
  const L = window._sceneLedgerGet ? window._sceneLedgerGet(window.state, false) : null;
  return (L && L.entries ? L.entries : []).map(e => ({
    kind: e.kind, scene: e.sceneNumber, card: e.card || null, assist: e.cardAssist || null,
    act: String(e.act || ''), dia: String(e.dia || '') }));
});
const acceptedScenes = () => page.evaluate(() => (window.state.scenes || [])
  .filter(x => x && String(x.uid || '').startsWith('cg:'))
  .map(x => ({ uid: String(x.uid), chars: String(x.text || '').length })));

if (ARM === 'cardless') {
  console.log('\n=== CARDLESS: a FRESH hand, NEVER selected ===');
  // The opening submission itself is the cleanest never-selected case: the entrance's hand has not
  // been examined, so no card has ever been clicked in this story.
  const sel0 = await page.evaluate(() => ({ index: window.state.fateSelectedIndex,
    committed: !!window.state.fateCommitted,
    options: Array.isArray(window.state.fateOptions) ? window.state.fateOptions.length : 0 }));
  console.log('   selection before any card click: ' + JSON.stringify(sel0));
  t('NO CARD HAS EVER BEEN SELECTED in this story', sel0.index < 0,
    JSON.stringify(sel0) + ' — this arm requires a genuinely never-selected hand');
  _setupRunning = true;
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  await page.click('#buGoBtn', { timeout: 8000 });
  const o1 = await waitOutcome();
  _setupRunning = false;
  t('the OAS opened', o1 === 'opened', 'outcome=' + o1);
  for (let i = 0; i < 16; i++) {
    if (await page.evaluate(() => !!document.getElementById('sceneDecisionPrompt'))) break;
    await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} });
    await page.waitForTimeout(2500);
  }
  await clearOverlays();
  const b1 = await page.evaluate(() => {
    for (const id of ['sceneDecisionA', 'sceneDecisionB']) {
      const el = document.getElementById(id);
      if (el && el.getAttribute('data-choice') === 'run') return id;
    } return null; });
  if (b1) await page.click('#' + b1, { timeout: 15000 });
  for (let i = 0; i < 45 && plannerReqs.length === 0; i++) await page.waitForTimeout(1000);
  t('a planner request went out', plannerReqs.length >= 1, 'planners=' + plannerReqs.length);
  const selAtPlan = await page.evaluate(() => window.state.fateSelectedIndex);
  console.log('   selection at planning: ' + selAtPlan);
  console.log('   provenance: ' + JSON.stringify(
    consoleAll.filter(l => /SUBMISSION-PROVENANCE/.test(l)).slice(0, 3)));
  if (plannerReqs.length) {
    const w = plannerReqs[0].whole;
    fs.writeFileSync(OUT + '/planner_cardless.txt', w);
    t('AN UNSELECTED SUBMISSION CLAIMS NO CARD', !/Fate card played this turn/.test(w),
      'a card was claimed with nothing selected');
  }
  // And the committed rows must carry no identity either.
  const rows = await allRows();
  console.log('   rows: ' + JSON.stringify(rows.map(r => ({ k: r.kind, s: r.scene, a: r.assist }))));
  t('NO COMMITTED ROW CLAIMS A CARD', rows.every(r => !r.assist),
    JSON.stringify(rows.map(r => r.assist)));
  fs.writeFileSync(OUT + '/cardless.json', JSON.stringify({ sel0, selAtPlan, rows }, null, 2));
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
  process.exit(fail ? 1 : 0);
}

if (ARM === 'commit') {
  console.log('\n=== THE SIMPLEST POSITIVE, END TO END: planner identity == committed identity ===');
  _setupRunning = true;
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  await page.click('#buGoBtn', { timeout: 8000 });
  const o1 = await waitOutcome();
  _setupRunning = false;
  t('the OAS opened', o1 === 'opened', 'outcome=' + o1);
  for (let i = 0; i < 16; i++) {
    if (await page.evaluate(() => !!document.getElementById('sceneDecisionPrompt'))) break;
    await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} });
    await page.waitForTimeout(2500);
  }
  await clearOverlays();
  const b1 = await page.evaluate(() => {
    for (const id of ['sceneDecisionA', 'sceneDecisionB']) {
      const el = document.getElementById(id);
      if (el && el.getAttribute('data-choice') === 'run') return id;
    } return null; });
  if (b1) await page.click('#' + b1, { timeout: 15000 });
  const hand = await reachSceneEndHand();
  t('production offered the scene-end hand', hand.onScreen === 5, JSON.stringify(hand));
  if (hand.onScreen !== 5) { await browser.close(); console.log('\n' + pass + '/' + (pass+fail) + ' checks passed  [ARM=' + ARM + ']'); process.exit(1); }

  const rowsBefore = await allRows();
  const scenesBefore = await acceptedScenes();
  // SELECT a card, EDIT its suggestion, SUBMIT successfully.
  await page.click('#' + hand.mount + ' .fate-card, #' + hand.mount + ' [data-card]', { timeout: 8000 });
  await settleInputs();
  const picked = await page.evaluate(() => {
    const o = Array.isArray(window.state.fateOptions) ? window.state.fateOptions : [];
    const i = window.state.fateSelectedIndex;
    const c = (typeof i === 'number' && i >= 0) ? o[i] : null;
    return c ? String(c.title || c.name || c.archetype || c.label || '') : null; });
  t('a card is selected', !!picked, JSON.stringify(picked));
  const EDIT = ' And I am done being asked.';
  const ids = await page.evaluate(() => { const i = window._getActiveTurnInputs();
    return { a: i.actInput.id, d: i.diaInput.id }; });
  const origD = await page.evaluate((id) => document.getElementById(id).value, ids.d);
  await page.click('#' + ids.d);
  await page.keyboard.press('Meta+a');
  await page.keyboard.type(origD + EDIT, { delay: 4 });
  const pBefore = plannerReqs.length;
  await clearOverlays();
  await page.click('#gnSubmitBtn', { timeout: 15000 }).catch(async () => {
    await page.click('#submitBtn', { timeout: 8000 }).catch(() => {}); });
  for (let i = 0; i < 60 && plannerReqs.length === pBefore; i++) await page.waitForTimeout(1000);
  t('a planner request went out', plannerReqs.length > pBefore);
  const pw = plannerReqs.length > pBefore ? plannerReqs[plannerReqs.length - 1].whole : '';
  t('THE PLANNER RECEIVED THIS CARD', !!picked && pw.includes('Fate card played this turn')
    && pw.includes(picked), 'card=' + JSON.stringify(picked));
  t('and the reader\'s EDITED wording is what was submitted', pw.includes(EDIT.trim()));
  // Wait for the scene to be ACCEPTED, then match on recorded identity.
  let scenesAfter = scenesBefore, rowsAfter = rowsBefore;
  for (let i = 0; i < 70; i++) {
    scenesAfter = await acceptedScenes();
    rowsAfter = await allRows();
    if (scenesAfter.length > scenesBefore.length && rowsAfter.length > rowsBefore.length) break;
    await page.waitForTimeout(1000);
  }
  const newScenes = scenesAfter.filter(x => !scenesBefore.some(y => y.uid === x.uid));
  const newRows = rowsAfter.slice(rowsBefore.length);
  console.log('   handoff lines: ' + JSON.stringify(
    consoleAll.filter(l => /handed to commit/.test(l)).slice(-2)));
  console.log('   new accepted scene(s): ' + JSON.stringify(newScenes));
  console.log('   new ledger row(s): ' + JSON.stringify(newRows));
  t('AN ACCEPTED PROJECTION WAS ADDED', newScenes.length >= 1 && newScenes[0].chars > 400,
    JSON.stringify(newScenes));
  t('AND A CORRESPONDING LEDGER ROW WAS ADDED', newRows.length >= 1, JSON.stringify(newRows));
  const carrier = newRows.find(r => r.assist && (r.assist.label || r.assist.id)) || null;
  t('THE COMMITTED ROW RETAINS THE SAME IDENTITY THE PLANNER RECEIVED',
    !!carrier && !!picked && (carrier.assist.label === picked || carrier.assist.id === picked),
    'planner got ' + JSON.stringify(picked) + '; rows carry '
    + JSON.stringify(newRows.map(r => r.assist)));
  t('and the reader\'s own edited wording is in that row',
    !!carrier && (String(carrier.dia).indexOf(EDIT.trim()) >= 0
      || String(carrier.act).indexOf(EDIT.trim()) >= 0),
    'dia tail=' + JSON.stringify(String(carrier && carrier.dia || '').slice(-60)));
  fs.writeFileSync(OUT + '/commit.json', JSON.stringify(
    { picked, newScenes, newRows, handoff: consoleAll.filter(l => /handed to commit/.test(l)) }, null, 2));
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
  process.exit(fail ? 1 : 0);
}

if (ARM === 'stale') {
  console.log('\n=== FAILED CARD ATTEMPT -> TYPED-ONLY REPLACEMENT AT THE SAME SCENE ===');
  _setupRunning = true;
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  await page.click('#buGoBtn', { timeout: 8000 });
  const o1 = await waitOutcome();
  _setupRunning = false;
  t('the OAS opened', o1 === 'opened', 'outcome=' + o1);
  for (let i = 0; i < 16; i++) {
    if (await page.evaluate(() => !!document.getElementById('sceneDecisionPrompt'))) break;
    await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} });
    await page.waitForTimeout(2500);
  }
  await clearOverlays();
  const b1 = await page.evaluate(() => {
    for (const id of ['sceneDecisionA', 'sceneDecisionB']) {
      const el = document.getElementById(id);
      if (el && el.getAttribute('data-choice') === 'run') return id;
    } return null; });
  if (b1) await page.click('#' + b1, { timeout: 15000 });
  const hand = await reachSceneEndHand();
  t('production offered the scene-end hand', hand.onScreen === 5, JSON.stringify(hand));
  if (hand.onScreen !== 5) { await browser.close(); console.log('\n' + pass + '/' + (pass+fail) + ' checks passed  [ARM=' + ARM + ']'); process.exit(1); }

  const sceneAt = await page.evaluate(() => window._currentSceneNumber(window.state));
  console.log('   working at scene ' + sceneAt);

  // ── ATTEMPT 1: a card is played, and the attempt FAILS ──────────────────────────────────────
  await page.click('#' + hand.mount + ' .fate-card, #' + hand.mount + ' [data-card]', { timeout: 8000 });
  await settleInputs();
  const played1 = await page.evaluate(() => {
    const o = Array.isArray(window.state.fateOptions) ? window.state.fateOptions : [];
    const i = window.state.fateSelectedIndex;
    const c = (typeof i === 'number' && i >= 0) ? o[i] : null;
    return c ? String(c.title || c.name || c.archetype || c.label || '') : null; });
  t('a card is selected for the first attempt', !!played1, JSON.stringify(played1));
  const pBefore = plannerReqs.length;
  failAuthor = true;
  await clearOverlays();
  await page.click('#gnSubmitBtn', { timeout: 15000 }).catch(async () => {
    await page.click('#submitBtn', { timeout: 8000 }).catch(() => {}); });
  for (let i = 0; i < 50 && plannerReqs.length === pBefore; i++) await page.waitForTimeout(1000);
  await page.waitForTimeout(6000);
  failAuthor = false;
  const attempt1Planner = plannerReqs.length > pBefore ? plannerReqs[plannerReqs.length - 1].whole : '';
  t('the failed attempt still produced a planner request', plannerReqs.length > pBefore,
    'planners ' + pBefore + ' -> ' + plannerReqs.length);
  const provAtAttempt1 = consoleAll.filter(l => /SUBMISSION-PROVENANCE/.test(l)).pop() || '';
  console.log('   provenance at the failed attempt: ' + JSON.stringify(provAtAttempt1));
  t('and that request named the played card', !!played1 && attempt1Planner.includes(played1),
    'card=' + JSON.stringify(played1) + ' — provenance said ' + JSON.stringify(provAtAttempt1)
    + ', so fateCommitted was still false when THIS route planned');
  t('the author call was genuinely failed', injectedFailures > 0, 'injected=' + injectedFailures);
  const committedAfterFail = await committedFor(sceneAt);
  console.log('   after the failed attempt, committed row for scene ' + sceneAt + ': '
    + JSON.stringify(committedAfterFail));

  // ── ATTEMPT 2: the replacement submission for the SAME scene is TYPED ONLY ──────────────────
  await clearOverlays();
  const hand2 = await reachSceneEndHand();
  // ── A GENUINELY UNSELECTED SUBMISSION ──────────────────────────────────────────────────────
  // Retyping over a suggestion must NOT deselect the card — keeping "this began as a Reversal
  // suggestion" beside the player's edited words is the provenance we want. So the cardless case
  // needs a hand on which NO card was clicked. If a selection survives onto the fresh hand, look
  // for a real deselection control (clicking the selected card again is the only candidate the
  // deck offers); if none works, that is REPORTED as a limitation, not engineered around.
  let sel2 = await page.evaluate(() => ({ index: window.state.fateSelectedIndex,
    committed: !!window.state.fateCommitted }));
  console.log('   selection on the fresh hand: ' + JSON.stringify(sel2));
  let deselectRoute = 'fresh hand was already unselected';
  if (sel2.index >= 0) {
    const sel = '#' + hand2.mount + ' [data-card-index="' + sel2.index + '"]';
    const exists = await page.evaluate((q) => !!document.querySelector(q), sel);
    if (exists) {
      await page.click(sel, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const re = await page.evaluate(() => window.state.fateSelectedIndex);
      deselectRoute = (re < 0) ? 'clicking the selected card again cleared it'
                               : 'NO DESELECTION CONTROL FOUND — selection survived a second click';
      sel2 = await page.evaluate(() => ({ index: window.state.fateSelectedIndex,
        committed: !!window.state.fateCommitted }));
    } else { deselectRoute = 'the selected card is not on this hand'; }
  }
  console.log('   deselection: ' + deselectRoute + ' -> ' + JSON.stringify(sel2));
  const genuinelyCardless = sel2.index < 0;
  t('THE CARDLESS CASE COULD BE CONSTRUCTED', genuinelyCardless,
    deselectRoute + ' — selection is ' + JSON.stringify(sel2)
    + '; without a deselection control a genuinely unselected submission cannot be produced here');
  const REPL = 'I say it in my own words this time.';
  await typeOnly(REPL);
  console.log('   replacement selection state: ' + JSON.stringify(sel2));
  // CLEARING THE TEXT IS NOT DESELECTING THE CARD. fateSelectedIndex and fateCommitted survive a
  // reader retyping over the suggestion, so from production's point of view the card is still
  // played and this replacement is NOT "explicitly cardless". Recorded, because it decides what
  // the assertions below can honestly mean.

  const pBefore2 = plannerReqs.length;
  await clearOverlays();
  await page.click('#gnSubmitBtn', { timeout: 15000 }).catch(async () => {
    await page.click('#submitBtn', { timeout: 8000 }).catch(() => {}); });
  for (let i = 0; i < 60 && plannerReqs.length === pBefore2; i++) await page.waitForTimeout(1000);
  await page.waitForTimeout(8000);
  t('the replacement produced its own planner request', plannerReqs.length > pBefore2,
    'planners ' + pBefore2 + ' -> ' + plannerReqs.length);
  if (plannerReqs.length > pBefore2) {
    const w2 = plannerReqs[plannerReqs.length - 1].whole;
    fs.writeFileSync(OUT + '/planner_replacement.txt', w2);
    if (genuinelyCardless) {
      t('AN UNSELECTED SUBMISSION CLAIMS NO CARD', !/Fate card played this turn/.test(w2),
        'a card was claimed on a submission with no selection');
      t('and it does not name the abandoned attempt\'s card',
        !played1 || !w2.includes('Fate card played this turn: ' + played1));
    } else {
      console.log('   (the no-card assertions are SKIPPED — the submission was not cardless; a '
        + 'selection survived and editing deliberately does not clear it)');
    }
    t('the reader\'s own replacement wording is what was submitted', w2.includes(REPL));
  }
  const provLines = consoleAll.filter(l => /SUBMISSION-PROVENANCE/.test(l));
  console.log('   provenance trail: ' + JSON.stringify(provLines.slice(-4)));
  // ── ACCEPTED HISTORY: REQUIRE IT EXISTS BEFORE ASSERTING ANYTHING ABOUT IT ────────────────
  // "!after || !after.assist" passed VACUOUSLY when no row existed at all, and the trace moved
  // from scene 3 to scene 4 — so it never demonstrated a replacement at the SAME scene. Both are
  // now preconditions, reported rather than assumed.
  const sceneAfter = await page.evaluate(() => window._currentSceneNumber(window.state));
  const accepted = await page.evaluate(() => {
    const cg = (window.state.scenes || []).filter(x => x && String(x.uid || '').startsWith('cg:'));
    const last = cg[cg.length - 1] || null;
    return { cgScenes: cg.length, chars: last ? String(last.text || '').length : 0 };
  });
  const after = await committedFor(sceneAt);
  const afterNew = await committedFor(sceneAfter);
  console.log('   scene then/now: ' + sceneAt + ' -> ' + sceneAfter
    + '  accepted projection: ' + JSON.stringify(accepted));
  console.log('   row @' + sceneAt + ': ' + JSON.stringify(after)
    + '  row @' + sceneAfter + ': ' + JSON.stringify(afterNew));
  t('AN ACCEPTED PROJECTION EXISTS to reason about', accepted.cgScenes >= 1 && accepted.chars > 400,
    JSON.stringify(accepted));
  const sameScene = Number(sceneAfter) === Number(sceneAt);
  t('BOTH ATTEMPTS WERE AT THE SAME SCENE', sameScene,
    'first attempt at scene ' + sceneAt + ', replacement planned at scene ' + sceneAfter
    + ' — if these differ the replacement is a NEW scene, not a second attempt at the same one');
  const row = sameScene ? after : null;
  t('and that scene HAS a committed ledger row to inspect', !!row,
    'row @' + sceneAt + ' = ' + JSON.stringify(after));
  if (row) {
    t('ACCEPTED HISTORY CARRIES NO STALE CARD from the abandoned attempt',
      !row.assist || !played1 || (row.assist.label !== played1),
      JSON.stringify(row.assist));
  }
  fs.writeFileSync(OUT + '/stale.json', JSON.stringify(
    { sceneAt, played1, committedAfterFail, after, provLines, injectedFailures }, null, 2));
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
  process.exit(fail ? 1 : 0);
}

if (ARM === 'card') {
  console.log('\n=== CARD IDENTITY -> THE NEXT OUTGOING PLANNER REQUEST ===');
  // Get through the opening to a real scene-end submission. The opening turn is typed-only, which
  // is itself the first negative.
  _setupRunning = true;
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  await page.click('#buGoBtn', { timeout: 8000 });
  const o1 = await waitOutcome();
  _setupRunning = false;
  t('the OAS opened', o1 === 'opened', 'outcome=' + o1);
  for (let i = 0; i < 16; i++) {
    if (await page.evaluate(() => !!document.getElementById('sceneDecisionPrompt'))) break;
    await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} });
    await page.waitForTimeout(2500);
  }
  await clearOverlays();
  const b1 = await page.evaluate(() => {
    for (const id of ['sceneDecisionA', 'sceneDecisionB']) {
      const el = document.getElementById(id);
      if (el && el.getAttribute('data-choice') === 'run') return id;
    } return null; });
  if (b1) await page.click('#' + b1, { timeout: 15000 });
  for (let i = 0; i < 45 && plannerReqs.length === 0; i++) await page.waitForTimeout(1000);
  t('the opening produced a planner request', plannerReqs.length >= 1, 'planners=' + plannerReqs.length);
  // NEGATIVE 1 — the opening submission was TYPED-ONLY.
  const p1 = plannerReqs[0] ? plannerReqs[0].whole : '';
  t('TYPED-ONLY: no card is claimed in that request', !/Fate card played this turn/.test(p1));
  console.log('   provenance lines so far: ' + JSON.stringify(
    consoleAll.filter(l => /SUBMISSION-PROVENANCE/.test(l)).slice(0, 3)));

  // Read scene 2 to its end so production offers the hand, then PLAY A CARD and EDIT the wording.
  for (let i = 0; i < 40; i++) {
    const loading = await page.evaluate(() => {
      const e = document.getElementById('gnSceneLoading'); return !!(e && e.getClientRects().length > 0); });
    if (!loading) break;
    await page.waitForTimeout(1000);
  }
  let hand = { count: 0, onScreen: 0, mount: null };
  for (let i = 0; i < 60; i++) {
    hand = await page.evaluate(() => {
      const m = window._activeCardMount();
      const cards = m ? Array.from(m.querySelectorAll('.fate-card, [data-card]')) : [];
      return { mount: m ? m.id : null, count: cards.length,
               onScreen: cards.filter(c => c.getClientRects().length > 0).length,
               nextBtn: !!document.getElementById('stagedNextBtn'),
               reader: !!document.getElementById('stagedBeatReader') };
    });
    if (hand.onScreen > 0) break;
    await clearOverlays();
    const adv = await page.evaluate(() => {
      const nb = document.getElementById('stagedNextBtn');
      if (nb && nb.getClientRects().length > 0 && !nb.disabled) return 'next';
      const br = document.getElementById('stagedBeatReader');
      if (br && br.getClientRects().length > 0) return 'reader';
      return null;
    });
    if (adv === 'next') await page.click('#stagedNextBtn', { timeout: 6000 }).catch(() => {});
    else if (adv === 'reader') await page.click('#stagedBeatReader', { timeout: 6000 }).catch(() => {});
    else break;
    await page.waitForTimeout(600);
  }
  console.log('   scene-end hand: ' + JSON.stringify(hand));
  t('production offered the scene-end hand', hand.onScreen === 5, JSON.stringify(hand));
  if (hand.onScreen === 5) {
    const before = await page.evaluate(() => { const i = window._getActiveTurnInputs();
      return { a: i.actInput.value, d: i.diaInput.value }; });
    await page.click('#' + hand.mount + ' .fate-card, #' + hand.mount + ' [data-card]', { timeout: 8000 });
    let filled = before;
    for (let i = 0; i < 25; i++) {
      filled = await page.evaluate(() => { const i2 = window._getActiveTurnInputs();
        return { a: i2.actInput.value, d: i2.diaInput.value }; });
      if (filled.a !== before.a || filled.d !== before.d) break;
      await page.waitForTimeout(1000);
    }
    t('A REAL CARD CLICK filled the reader\'s Say/Do', filled.a !== before.a || filled.d !== before.d,
      JSON.stringify(filled));
    // The selection is not COMMITTED until the reader submits, so the identity is derivable at
    // PLANNING time — which is exactly where the capture runs. Taken from production's own line.
    const deckLabels = await page.evaluate(() => {
      const opts = Array.isArray(window.state.fateOptions) ? window.state.fateOptions : [];
      const i = window.state.fateSelectedIndex;
      const c = (typeof i === 'number' && i >= 0) ? opts[i] : null;
      return { index: i, committed: !!window.state.fateCommitted,
               label: c ? String(c.title || c.name || c.archetype || c.label || '') : null };
    });
    console.log('   selection at fill time: ' + JSON.stringify(deckLabels));
    t('a card is selected, with a label, before submitting',
      deckLabels.index >= 0 && !!deckLabels.label, JSON.stringify(deckLabels));
    // EDIT the wording — the reader's own words must stay authoritative.
    const EDIT = ' And I am done being asked.';
    let prevV = null, stableV = 0;
    for (let i = 0; i < 20; i++) {
      const v = await page.evaluate(() => { const i2 = window._getActiveTurnInputs();
        return i2.actInput.value + '\u0000' + i2.diaInput.value; });
      if (v === prevV) { if (++stableV >= 3) break; } else stableV = 0;
      prevV = v; await page.waitForTimeout(600);
    }
    const ids = await page.evaluate(() => { const i = window._getActiveTurnInputs();
      return { a: i.actInput.id, d: i.diaInput.id }; });
    const origD = await page.evaluate((id) => document.getElementById(id).value, ids.d);
    await page.click('#' + ids.d);
    await page.keyboard.press('Meta+a');          // select the suggestion
    await page.keyboard.type(origD + EDIT, { delay: 4 });   // and retype it, extended
    const edited = await page.evaluate((id) => document.getElementById(id).value, ids.d);
    t('the reader could EDIT the suggestion', edited === origD + EDIT,
      JSON.stringify(edited.slice(-70)));
    const plannersBefore = plannerReqs.length;
    await clearOverlays();
    await page.click('#gnSubmitBtn', { timeout: 15000 }).catch(async () => {
      await page.click('#submitBtn', { timeout: 8000 }).catch(() => {}); });
    for (let i = 0; i < 60 && plannerReqs.length === plannersBefore; i++) await page.waitForTimeout(1000);
    t('the submission produced the NEXT planner request', plannerReqs.length > plannersBefore,
      'planners ' + plannersBefore + ' -> ' + plannerReqs.length);
    if (plannerReqs.length > plannersBefore) {
      const w = plannerReqs[plannerReqs.length - 1].whole;
      fs.writeFileSync(OUT + '/planner_card.txt', w);
      const provLine = consoleAll.filter(l => /SUBMISSION-PROVENANCE/.test(l)).pop() || '';
      console.log('   provenance at planning: ' + JSON.stringify(provLine));
      const m = /- card (.+?)(?: - attempt .*)?$/.exec(provLine);
      const cap = m ? m[1].trim() : '';
      const lab = (cap && !/^none \(/.test(cap)) ? cap : (deckLabels.label || '');
      console.log('   looking for: ' + JSON.stringify(lab));
      t('THE CARD\'S IDENTITY REACHED THAT PLANNER REQUEST', /Fate card played this turn/.test(w),
        'no provenance line in the request');
      t('and it names THIS card', !!lab && w.includes(lab), 'label=' + JSON.stringify(lab));
      t('the reader\'s EDITED wording is what was submitted', w.includes(EDIT.trim()),
        'edit not found in the payload');
      t('the edited wording is still presented as the player\'s own',
        /Player dialogue: /.test(w) || /Player action: /.test(w));
    }
  }
  fs.writeFileSync(OUT + '/card.json', JSON.stringify(
    { planners: plannerReqs.length, hand,
      provenance: consoleAll.filter(l => /SUBMISSION-PROVENANCE/.test(l)) }, null, 2));
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
  process.exit(fail ? 1 : 0);
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
  // ── BEFORE THE INTERRUPTION ──────────────────────────────────────────────────────────────
  // Scoped to COMPLETED-HISTORY claims. An authored instruction that DESCRIBES a coming
  // interruption is not a history leak; a committed row asserting it already happened is.
  const beforeRows = await page.evaluate(() => {
    const L = window._sceneLedgerGet ? window._sceneLedgerGet(window.state, false) : null;
    return (L && L.entries ? L.entries : []).map(e => ({ kind: e.kind,
      event: String(e.plannedEventFull || e.plannedEvent || '') }));
  });
  const bakedBefore = beforeRows.find(r => r.kind === 'baked');
  console.log('   BEFORE the interruption — rows: ' + JSON.stringify(beforeRows.map(r => r.kind)));
  t('the opening row exists before the interruption', !!bakedBefore);
  t('no interruption row exists yet', !beforeRows.some(r => r.kind === 'oas_interrupt'),
    JSON.stringify(beforeRows.map(r => r.kind)));
  t('BEFORE: the opening row does NOT claim the interruption happened',
    !!bakedBefore && !/cut it off|cut the interrogation off/i.test(bakedBefore.event),
    JSON.stringify((bakedBefore && bakedBefore.event || '').slice(-90)));
  t('BEFORE: it does not claim the interrogation already happened either',
    !!bakedBefore && !/questioned her before all/i.test(bakedBefore.event),
    JSON.stringify((bakedBefore && bakedBefore.event || '').slice(-90)));
  t('BEFORE: it still records what Scene 1 did establish',
    !!bakedBefore && /began to twist/.test(bakedBefore.event)
    && /charged Lirael with shaping/.test(bakedBefore.event));
  if (plannerReqs.length) {
    const pw = plannerReqs[plannerReqs.length - 1].whole;
    t('BEFORE: no planner request claims the interruption as past history',
      !/the opening ended:/.test(pw), 'an oas_interrupt row reached a planner before it occurred');
  }
  // Drive the OAS to the authored interruption, then take the branch, so BOTH ledger rows exist.
  for (let i = 0; i < 16; i++) {
    if (await page.evaluate(() => !!document.getElementById('sceneDecisionPrompt'))) break;
    await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} });
    await page.waitForTimeout(2500);
  }
  // Now let the interruption arrive.
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
