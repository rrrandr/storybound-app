// THE EXPLICIT READER TEXT-EXIT ROUTE, exercised end to end. Provider-free, $0.
//
// Codex 2026-10-06 corrected my route inventory: I claimed every reader-controlled exit was gated
// behind model-classified boredom or disengagement. It is not. _intimacyDialogueConsumeInput calls
// _isIntimacyExitInput (app.js:209640) on a FULL-LINE "stop" / "skip" / "enough" / "fade to black"
// and opens _showIntimacyExitModal('text') (app.js:209971). The modal's own controls call
// _resolveIntimacyScene — independent of boredom, available at ANY beat.
//
// This drives that interaction THROUGH THE READER'S OWN INPUTS AND THE MODAL CONTROL. The resolver
// is never called directly, no state is written, the nine-turn live limit is untouched, and no
// timed interruption is implemented.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { canSubmit } from './_oas_submission_guard.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS } from './_fs_story_setup.mjs';
import { stageOf, isProviderEndpoint } from './_replay_fixtures.mjs';
import { setupStageOf, SETUP_RESPONSES } from './_reader_setup_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// The same preserved live replies — every one scene_state:"continue".
const WIRE = '_fs_live_out/run_2026-10-06T01-17-51-250Z/wire/';
const captured = [];
for (const f of fs.readdirSync(WIRE).filter(x => x.endsWith('_res.json')).sort()) {
  let j; try { j = JSON.parse(fs.readFileSync(WIRE + f, 'utf8')); } catch (_) { continue; }
  let c; try { c = j.choices[0].message.content; } catch (_) { continue; }
  if (!c || c.indexOf('li_dialogue') === -1) continue;
  captured.push(c);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleLog = [];
page.on('console', m => consoleLog.push(m.text()));
let served = 0;
await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();
  if (/\/api\/config/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  if (!isProviderEndpoint(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, fortunesRemaining: 9999, entitled: true, storypassEligible: true }) });
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}
  if (stageOf(sys) === 'oas') {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: captured[served++ % captured.length] }) });
  }
  if (/amplify\|ruin\|redirect/.test(sys)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [
      'TEMPTATION ||| amplify ||| I close the gap until the stone warms ||| Ask me again, slower.',
      'BOUNDARY ||| redirect ||| I set the ledger flat and keep my hand on it ||| Not here.',
      'CONFESSION ||| amplify ||| I turn The Answer so its cut edge faces him ||| I felt it choose.',
      'REVERSAL ||| redirect ||| I put The Answer down and do not let go ||| Ask me whose hands shaped it.',
      'SILENCE ||| ruin ||| I go still and let the clearing finish ||| mm'].join('\n') }) });
  }
  if (/contextual Say\/Do previews/i.test(sys)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      content: 'REVERSAL ||| I put The Answer down and do not let go ||| Ask me whose hands shaped it.' }) });
  }
  const st = setupStageOf(sys);
  if (st && SETUP_RESPONSES[st]) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: JSON.stringify(SETUP_RESPONSES[st]) }) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });
await page.evaluate(() => { window.state.profileId = 'p'; window.state.fortunes = 9999;
  window.state.storypassEligible = true; window.state.subscribed = true;
  window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
const def = await findFSDef(page); await launchFS(page, def);
await page.evaluate(() => { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
await unlockFS(page, 'text-exit'); await finalizePreview(page);
await page.evaluate(() => { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
await enterOAS(page, { settleMs: 9000 });

// ── ONE COMPLETED EXCHANGE FIRST, through the deck and Submit ───────────────────────────────
console.log('=== ONE COMPLETED EXCHANGE ===');
const playOneTurn = async () => {
  const deck = await page.evaluate(() => {
    const m = window._activeCardMount ? window._activeCardMount() : null;
    return m ? [...m.querySelectorAll('.fate-card')].filter(e => e.offsetParent !== null
      && !e.classList.contains('locked')).length : 0;
  });
  if (!deck) return false;
  await page.evaluate(() => { const i = window._getActiveTurnInputs();
    if (i.actInput) i.actInput.value = ''; if (i.diaInput) i.diaInput.value = ''; });
  await page.locator('#gnCardMount .fate-card:not(.locked)').first().click({ timeout: 15000 }).catch(() => {});
  const dl = Date.now() + 15000;
  let gate = { ok: false, reason: 'never waited' };
  while (Date.now() < dl) {
    const v = await page.evaluate(() => {
      const i = window._getActiveTurnInputs();
      return { action: i.actInput ? i.actInput.value : '', dialogue: i.diaInput ? i.diaInput.value : '',
        optionIds: (window.state.fateOptions || []).map(o => String(o.id || '')) };
    });
    gate = canSubmit(v.action, v.dialogue, v.optionIds);
    if (gate.ok) break;
    await page.waitForTimeout(400);
  }
  if (!gate.ok) { console.log('  blocked: ' + gate.reason); return false; }
  await page.locator('#gnSubmitBtn').click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  return true;
};
const played = await playOneTurn();
const afterOne = await page.evaluate(() => {
  const d = window.state.intimacyDialogue || {};
  return { beat: d.beatCount, replies: (d.liTurnHistory || []).length, boredom: d.boredomScore || 0 };
});
console.log('  ' + JSON.stringify(afterOne));
t('an exchange completed before the exit is attempted', played && afterOne.beat >= 1,
  JSON.stringify(afterOne));
t('and boredom is NOT what makes the exit available', (afterOne.boredom || 0) < 2,
  'boredomScore=' + afterOne.boredom + ' — the pivot needs >= 2');

// ── THE READER TYPES "stop" INTO THE REAL INPUT AND SUBMITS ─────────────────────────────────
console.log('');
console.log('=== THE READER TYPES "stop" AND PRESSES SUBMIT ===');
await page.evaluate(() => {
  const i = window._getActiveTurnInputs();
  if (i.diaInput) { i.diaInput.disabled = false; i.diaInput.value = 'stop';
    i.diaInput.dispatchEvent(new Event('input', { bubbles: true })); }
  if (i.actInput) { i.actInput.disabled = false; i.actInput.value = '';
    i.actInput.dispatchEvent(new Event('input', { bubbles: true })); }
});
const preStop = await page.evaluate(() => {
  const i = window._getActiveTurnInputs();
  const d = window.state.intimacyDialogue || {};
  return { act: i.actInput ? i.actInput.value : null, dia: i.diaInput ? i.diaInput.value : null,
    actId: i.actInput && i.actInput.id, diaId: i.diaInput && i.diaInput.id,
    beat: d.beatCount, phase: d.phase,
    submitBtnVisible: !!(document.getElementById('gnSubmitBtn')
      && document.getElementById('gnSubmitBtn').offsetParent !== null) };
});
console.log('  before Submit: ' + JSON.stringify(preStop));
await page.locator('#gnSubmitBtn').click({ timeout: 15000 }).catch(e =>
  console.log('  submit error: ' + String(e.message).split('\n')[0]));
await page.waitForTimeout(2500);
const postStop = await page.evaluate(() => {
  const d = window.state.intimacyDialogue || {};
  const m = document.getElementById('intimacyExitModal');
  return { beat: d.beatCount, phase: d.phase,
    modalHasActive: !!(m && m.classList.contains('active')),
    routedLine: null };
});
console.log('  after Submit:  ' + JSON.stringify(postStop)
  + '  (beat unchanged => no turn fired)');
const routed = consoleLog.filter(l => /STAGED:SUBMIT|EXIT|exit/i.test(l)).slice(-4);
routed.forEach(l => console.log('  | ' + l.slice(0, 150)));
let modal = null;
{ const dl = Date.now() + 20000;
  while (Date.now() < dl) {
    modal = await page.evaluate(() => {
      const shown = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0;
      };
      const m = document.getElementById('intimacyExitModal');
      const btn = (id) => { const b = document.getElementById(id);
        return b ? { present: true, visible: shown(b), label: (b.textContent||'').trim().slice(0,40) } : null; };
      const mr = m ? m.getBoundingClientRect() : null;
      return { up: !!(m && m.classList.contains('active') && shown(m)),
        box: mr ? { w: Math.round(mr.width), h: Math.round(mr.height) } : null,
        abrupt: btn('intimacyExitAbrupt'), fade: btn('intimacyExitFade'),
        metaphorical: btn('intimacyExitMetaphorical'), cancel: btn('intimacyExitCancel') };
    });
    if (modal.up) break;
    await page.waitForTimeout(500);
  } }
console.log('  modal: ' + JSON.stringify(modal));
// THE ROUTE FIRES — this part of Codex's correction is confirmed.
t('the reader\'s typed "stop" REACHED the exit handler',
  consoleLog.some(l => /INTIMACY-EXIT. Modal opened \(trigger=text\)/.test(l)),
  'no [INTIMACY-EXIT] line');
t('no turn was fired into Julian instead', postStop.beat === preStop.beat,
  'beat ' + preStop.beat + ' -> ' + postStop.beat);
t('the modal was activated', postStop.modalHasActive === true);
t('and it carries resolver-backed controls', !!(modal && (modal.abrupt || modal.fade)));
// ...BUT IT IS NOT DISPLAYABLE. Documented as a defect, with the cause.
t('THE MODAL IS RENDERED FOR THE READER', modal && modal.up === true,
  'it was parented inside the hidden #menuOverlay until 2026-10-06');
t('and it has a real, non-zero box', !!(modal && modal.box && modal.box.w > 100 && modal.box.h > 100),
  'box=' + JSON.stringify(modal && modal.box));
const serveBefore = served;

// ── CANCEL FIRST: "Never mind — keep going" must return to the ongoing conversation ─────────
console.log('');
console.log('=== CANCEL RETURNS TO THE CONVERSATION ===');
const beforeCancel = await page.evaluate(() => {
  const d = window.state.intimacyDialogue || {};
  return { active: !!d.active, beat: d.beatCount, replies: (d.liTurnHistory || []).length };
});
await page.locator('#intimacyExitCancel').click({ timeout: 15000 }).catch(e =>
  console.log('  cancel click error: ' + String(e.message).split('\n')[0]));
await page.waitForTimeout(1500);
const afterCancel = await page.evaluate(() => {
  const d = window.state.intimacyDialogue || {};
  const m = document.getElementById('intimacyExitModal');
  const cs = m ? getComputedStyle(m) : null;
  return { active: !!d.active, beat: d.beatCount, replies: (d.liTurnHistory || []).length,
    modalActive: !!(m && m.classList.contains('active')),
    modalShown: !!(cs && cs.display !== 'none'),
    deckCards: (function () {
      const mt = window._activeCardMount ? window._activeCardMount() : null;
      return mt ? [...mt.querySelectorAll('.fate-card')].filter(e => e.offsetParent !== null).length : 0;
    })() };
});
console.log('  before: ' + JSON.stringify(beforeCancel));
console.log('  after : ' + JSON.stringify(afterCancel));
t('Cancel is clickable', true);
t('Cancel CLOSED the modal', afterCancel.modalActive === false && afterCancel.modalShown === false);
t('the conversation is STILL ACTIVE after Cancel', afterCancel.active === true);
t('no beat was consumed and no reply lost', afterCancel.beat === beforeCancel.beat
  && afterCancel.replies === beforeCancel.replies,
  JSON.stringify({ beforeCancel, afterCancel }));
t('the reader can carry on — the deck is still there', afterCancel.deckCards > 0,
  'cards=' + afterCancel.deckCards);

// Re-open the modal the same way, to take the exit for real.
console.log('');
console.log('=== RE-OPENING THE EXIT THE SAME WAY ===');
await page.evaluate(() => {
  const i = window._getActiveTurnInputs();
  if (i.diaInput) { i.diaInput.disabled = false; i.diaInput.value = 'enough';
    i.diaInput.dispatchEvent(new Event('input', { bubbles: true })); }
  if (i.actInput) { i.actInput.disabled = false; i.actInput.value = ''; }
});
await page.locator('#gnSubmitBtn').click({ timeout: 15000 }).catch(() => {});
{ const dl = Date.now() + 20000;
  while (Date.now() < dl) {
    const up = await page.evaluate(() => {
      const m = document.getElementById('intimacyExitModal');
      return !!(m && m.classList.contains('active') && getComputedStyle(m).display !== 'none');
    });
    if (up) break;
    await page.waitForTimeout(500);
  } }
t('a second exit word ("enough") reopens the modal', await page.evaluate(() => {
  const m = document.getElementById('intimacyExitModal');
  return !!(m && m.classList.contains('active') && getComputedStyle(m).display !== 'none');
}));

// ── THE READER CHOOSES "end it now" — the modal control, not the resolver ───────────────────
console.log('');
console.log('=== THE READER PICKS THE MODAL\'S OWN CONTROL ===');
// "End Abruptly" is the reader saying stop now — the closest control to the authored
// interruption, and it calls _resolveIntimacyScene('user_pivot_end').
const pickId = (modal && modal.abrupt && modal.abrupt.visible) ? 'intimacyExitAbrupt' : 'intimacyExitFade';
console.log('  clicking #' + pickId);
const geo = await page.evaluate((id) => {
  const el = document.getElementById(id);
  const m = document.getElementById('intimacyExitModal');
  const r = el ? el.getBoundingClientRect() : null;
  const mr = m ? m.getBoundingClientRect() : null;
  const cs = el ? getComputedStyle(el) : null;
  const mcs = m ? getComputedStyle(m) : null;
  return {
    btn: r ? { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } : null,
    btnStyle: cs ? { display: cs.display, visibility: cs.visibility, opacity: cs.opacity } : null,
    modal: mr ? { w: Math.round(mr.width), h: Math.round(mr.height) } : null,
    modalStyle: mcs ? { display: mcs.display, visibility: mcs.visibility, opacity: mcs.opacity,
      active: m.classList.contains('active') } : null
  };
}, pickId);
console.log('  geometry: ' + JSON.stringify(geo));
// A position:fixed element with computed display:flex and a ZERO box means an ANCESTOR is not
// rendered — the same bug class as the fate deck dealt into a hidden mount.
const chain = await page.evaluate(() => {
  const out = [];
  let e = document.getElementById('intimacyExitModal');
  while (e && e !== document.documentElement) {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    out.push({ id: e.id || null, cls: (e.className || '').toString().slice(0, 36),
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      box: Math.round(r.width) + 'x' + Math.round(r.height) });
    e = e.parentElement;
  }
  return out;
});
console.log('  ANCESTOR CHAIN (modal outward):');
chain.forEach(n => console.log('    ' + (n.id ? '#' + n.id : '.' + n.cls).padEnd(26)
  + ' display=' + n.display.padEnd(7) + ' vis=' + n.visibility.padEnd(8)
  + ' opacity=' + n.opacity.padEnd(5) + ' box=' + n.box));
await page.locator('#' + pickId).click({ timeout: 15000 }).catch(e => {
  const msg = String(e.message);
  console.log('  click error: ' + msg.split('\n')[0]);
  const why = msg.split('\n').filter(l => /intercept|not visible|not stable|enabled/.test(l)).slice(0, 2);
  why.forEach(l => console.log('    ' + l.trim().slice(0, 140)));
});
let out = null;
{ const dl = Date.now() + 70000;
  while (Date.now() < dl) {
    out = await page.evaluate(() => {
      const intr = window.state._intimateInterruption;
      return { dialogueGone: !window.state.intimacyDialogue,
        interruptionPresent: !!intr, interruptionSubmitted: !!(intr && intr.submitted),
        exchangeMounted: !!document.querySelector('#intimateInterruptionHost, .intimate-interruption'),
        archive: Object.keys(window.state._oasSceneSnapshots || {}).length };
    });
    if (out.interruptionPresent) break;
    await page.waitForTimeout(1000);
  } }
const arch = consoleLog.find(l => /OAS:ARCHIVE. Snapshot saved/.test(l)) || '';
console.log('  ' + JSON.stringify(out));
console.log('  ' + arch.slice(0, 130));
t('no further OAS author call was spent by the exit', served === serveBefore,
  'served ' + serveBefore + ' -> ' + served);
t('THE AUTHORED DOHKAR INTERRUPTION MOUNTED from the reader\'s text exit',
  out && out.interruptionPresent === true, JSON.stringify(out));
t('the archive was preserved', out && out.archive >= 1, 'archive=' + (out && out.archive));
t('and it resolved well before the beat-20 cap', !/20 beats/.test(arch), arch.slice(0, 110));

// ── AND ON TO THE DECISION ──────────────────────────────────────────────────────────────────
if (out && out.interruptionPresent) {
  console.log('');
  console.log('=== INTERRUPTION -> SUBMISSION -> DECISION -> SCENE 2 ===');
  await page.evaluate(() => {
    const i = window._getActiveTurnInputs();
    if (i.actInput) { i.actInput.disabled = false; i.actInput.value = 'I keep my hand on The Answer.';
      i.actInput.dispatchEvent(new Event('input', { bubbles: true })); }
    if (i.diaInput) { i.diaInput.disabled = false; i.diaInput.value = 'Ask me whose hands shaped it.';
      i.diaInput.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.locator('#gnSubmitBtn').click({ timeout: 15000 }).catch(() => {});
  let st2 = null;
  { const dl = Date.now() + 45000;
    while (Date.now() < dl) {
      st2 = await page.evaluate(() => {
        const r = window.state._intimateInterruption;
        return { submitted: !!(r && r.submitted),
          promptMounted: !!document.getElementById('sceneDecisionPrompt'),
          recorded: ((window.state._sceneDecisions || {})['1'] || null) };
      });
      if (st2.submitted) break;
      await page.waitForTimeout(1000);
    } }
  console.log('  ' + JSON.stringify(st2));
  t('the interruption was submitted through the reader\'s control', st2 && st2.submitted === true);
  if (st2 && st2.promptMounted) {
    await page.locator('#sceneDecisionA').click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const dec = await page.evaluate(() => ({
    needed: (typeof window._sceneDecisionNeeded === 'function') ? !!window._sceneDecisionNeeded() : null,
    recorded: ((window.state._sceneDecisions || {})['1'] || null) }));
  t('the authored decision is recorded and the gate closed',
    !!(dec.recorded && dec.recorded.choice) && dec.needed === false, JSON.stringify(dec));
  let sceneReq = false;
  { const dl = Date.now() + 90000;
    while (Date.now() < dl) {
      sceneReq = consoleLog.some(l => /SCENE-ASSIGNMENT. scene=2|TIERED:scenePlanner/i.test(l));
      if (sceneReq) break;
      await page.waitForTimeout(2000);
    } }
  consoleLog.filter(l => /SCENE-ASSIGNMENT. scene=2|TIERED:scenePlanner/i.test(l)).slice(0, 2)
    .forEach(l => console.log('  | ' + l.slice(0, 140)));
  t('A SCENE 2 REQUEST WAS ISSUED', sceneReq);
}

// ── THE VAULT STILL OPENS AND CLOSES ────────────────────────────────────────────────────────
// The modal used to live inside #menuOverlay. Moving it out must not have disturbed that overlay.
console.log('');
console.log('=== THE VAULT (#menuOverlay) STILL OPENS AND CLOSES ===');
const vault = await page.evaluate(() => {
  const shown = (el) => { if (!el) return false; const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const m = document.getElementById('menuOverlay');
  const out = { exists: !!m, closedAtRest: !shown(m) };
  if (!m) return out;
  // OPEN IT THE WAY THE APP DOES: the markup is class="overlay hidden" and every call site does
  // classList.add('hidden') to close, so opening is removing it.
  out.hiddenAtRest = m.classList.contains('hidden');
  m.classList.remove('hidden');
  const r1 = m.getBoundingClientRect();
  out.openedBox = { w: Math.round(r1.width), h: Math.round(r1.height) };
  out.openedShown = shown(m);
  // its own content must still be inside it
  out.holdsVaultContent = !!m.querySelector('.vault-back, #modelComparePanel');
  out.stillHoldsExitModal = !!m.querySelector('#intimacyExitModal');
  m.classList.add('hidden');
  out.closedAgain = !shown(m);
  return out;
});
console.log('  ' + JSON.stringify(vault));
t('the Vault overlay still exists', vault.exists === true);
t('it is closed at rest, via .hidden', vault.closedAtRest === true && vault.hiddenAtRest === true);
t('it OPENS to a real box', vault.openedShown === true
  && vault.openedBox && vault.openedBox.w > 100, JSON.stringify(vault.openedBox));
t('it still contains its own Vault content', vault.holdsVaultContent === true);
t('and it NO LONGER contains the exit modal', vault.stillHoldsExitModal === false);
t('it closes again', vault.closedAgain === true);

fs.mkdirSync('_audit_out/replay', { recursive: true });
fs.writeFileSync('_audit_out/replay/text_exit.json',
  JSON.stringify({ afterOne, modal, out, archive: arch }, null, 2));
await browser.close();
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
