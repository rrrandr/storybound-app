// ONCE-PER-SCENE TEMPT GUARD — the eleven lifecycle proofs. Zero provider dispatches.
//
// The guard is a CONCURRENCY BOUNDARY: two rapid attempts must not both pass before either reaches the
// ledger, and a cancelled or failed payment must not permanently consume the scene's allowance.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

(async () => {
  console.log('=== ONCE-PER-SCENE TEMPT GUARD (zero provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_guard_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._temptGuardAcquire === 'function'
    && typeof window._temptGuardRelease === 'function' && typeof window._temptGuardSeal === 'function'
    && typeof window._temptGuardScopeKey === 'function' && typeof window._temptGuardStatus === 'function'
    && typeof window._sbPersistSceneProjection === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  // NO FUNCTION STUBS. The cost dependencies (consumeFortune, consumeFortuneFavorCharge,
  // openFortunePurchaseModal, getTemptFateCost) are IIFE-scoped, so a window.* stub would not shadow
  // them — it would silently test nothing. Instead the REAL paths are driven:
  //   • ACCEPTED       — state._temptGrantsFreeCredit, the real onboarding free-credit path, which
  //                      bypasses every cost branch and is consumed on use exactly as in production;
  //   • FAILED PAYMENT — the real consumeFortune, which genuinely fails here ("no session token"),
  //                      taking the real burn-failure branch;
  //   • NO BALANCE     — state.fortunes below the real cost, taking the real purchase-modal branch;
  //   • CONFIRM        — window.confirm IS a global, so it is the one thing that can be, and is, stubbed.
  // "No cost path ran" is then proven from the REAL cost path's own console output
  // ("[Fortune] Operation start:"), not from a spy on a function the code never calls.
  await page.evaluate(() => {
    window.__confirmCalls = 0;
    window.confirm = function () { window.__confirmCalls++; return window.__stub_confirm !== false; };
  });
  const costStarts = () => consoleLines.filter((l) => /\[Fortune\] Operation start:/.test(l)).length;
  const modalOpens = () => consoleLines.filter((l) => /Redirecting legacy fortune modal/.test(l)).length;

  async function baseline(opts) {
    await page.evaluate((o) => {
      const s = window.state;
      s.storyId = o.storyId || 'guard-story';
      s.fortunes = o.fortunes != null ? o.fortunes : 500;
      s.scenes = []; s._temptSceneGuard = {}; s._fateInvocationSeq = [];
      s._temptFateLedger = null; s._temptGuardActiveReservation = null; s._temptGuardModalArmed = null;
      s._temptGrantsFreeCredit = false; s.tempt_fate_invoked_this_turn = false;
      s.temptFateWish = ''; s.consecutive_tempt_fate_count = 0; s.turnCount = 1;
      s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
      window.__stub_confirm = true; window.__confirmCalls = 0;
      if (o.freeCredit) s._temptGrantsFreeCredit = true;
      if (o.withScene) {
        window._sbPersistSceneProjection({ kind: 'body', input: 'An accepted scene.' });
      }
    }, opts || {});
  }
  // The REAL invocation path, then the REAL seal point, exactly as the zoom flow runs them.
  const invokeAndSeal = async (wish) => page.evaluate(async (w) => {
    const accepted = (await window.invokeTemptFate(true)) === true;
    if (!accepted) return { accepted: false, sealed: null };
    window.state.temptFateWish = w;
    const entry = window._recordTemptFateEvent(w);
    const sealed = window._temptGuardSeal(window.state._temptGuardActiveReservation, entry && entry.id);
    return { accepted: true, sealed: sealed };
  }, wish);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. Double-click / racing attempts — the concurrency boundary');
  await baseline({ withScene: true, freeCredit: true });
  {
    const before = costStarts();
    const r = await page.evaluate(async () => {
      const p1 = window.invokeTemptFate(true), p2 = window.invokeTemptFate(true);   // NO await between
      const [a, b] = await Promise.all([p1, p2]);
      return { a: a === true, b: b === true, guard: JSON.parse(JSON.stringify(window.state._temptSceneGuard)) };
    });
    ok('exactly ONE attempt was accepted', (r.a ? 1 : 0) + (r.b ? 1 : 0) === 1, JSON.stringify({ a: r.a, b: r.b }));
    ok('exactly ONE guard entry exists', Object.keys(r.guard).length === 1);
    ok('the REAL cost path was not entered twice', costStarts() - before <= 1, 'starts=' + (costStarts() - before));
    const seq = await page.evaluate(() => {
      const e = window._recordTemptFateEvent('everyone forgets');
      window._temptGuardSeal(window.state._temptGuardActiveReservation, e && e.id);
      return { ledger: window.state._temptFateLedger.length, seq: window.state._fateInvocationSeq.length };
    });
    ok('one ledger entry and ONE shared Fate-sequence entry', seq.ledger === 1 && seq.seq === 1, JSON.stringify(seq));
    ok('the declined attempt was logged as declined', consoleLines.some((l) => /TEMPT-GUARD\] declined/.test(l)));
  }

  section('2. Cancelled confirmation, then retry in the SAME scene');
  await baseline({ withScene: true });
  {
    const r = await page.evaluate(async () => {
      window.__stub_confirm = false;
      const first = await window.invokeTemptFate(false);          // real confirm dialog, declined
      const afterCancel = window._temptGuardStatus(window.state);
      const ledgerAfter = (window.state._temptFateLedger || []).length;
      window.state._temptGrantsFreeCredit = true;                 // real free-credit path for the retry
      const retry = await window.invokeTemptFate(false);
      return { first: first === true, afterCancel, ledgerAfter, retry: retry === true,
        confirmCalls: window.__confirmCalls, status: window._temptGuardStatus(window.state) };
    });
    ok('the real confirm dialog was reached and declined', r.confirmCalls >= 1 && r.first === false);
    ok('the reservation was RELEASED — the allowance is free again', r.afterCancel === 'free', r.afterCancel);
    ok('...and no ledger entry was created by the cancellation', r.ledgerAfter === 0, String(r.ledgerAfter));
    ok('a retry IN THE SAME SCENE succeeds — a cancellation does not cost the player their scene', r.retry === true);
    ok('the retry left the guard pending, awaiting its seal', r.status === 'pending', r.status);
  }

  section('3. Failed payment (real consumeFortune failure), then retry');
  await baseline({ withScene: true });
  {
    const before = costStarts();
    const r = await page.evaluate(async () => {
      const first = await window.invokeTemptFate(true);           // real burn fails: no session token
      const armed = !!window.state._temptGuardModalArmed;
      const during = await window.invokeTemptFate(true);          // held while the failure modal is up
      window.closeFortunePurchaseModal();
      const afterClose = window._temptGuardStatus(window.state);
      window.state._temptGrantsFreeCredit = true;
      const retry = await window.invokeTemptFate(true);
      return { first: first === true, armed, during: during === true, afterClose,
        retry: retry === true, ledger: (window.state._temptFateLedger || []).length };
    });
    ok('the REAL cost path ran and the deduction failed', costStarts() - before >= 1 && r.first === false);
    ok('...and the reservation is HELD, armed for the modal, not released on the spot', r.armed === true);
    ok('...so a second attempt during the failure modal is still declined', r.during === false);
    ok('closing the modal releases it', r.afterClose === 'free', r.afterClose);
    ok('a retry then succeeds in the same scene', r.retry === true);
    ok('no ledger entry was created by the failure', r.ledger === 0, String(r.ledger));
  }

  section('4. First Tempt pending + Petition in the same scene');
  await baseline({ withScene: true, freeCredit: true });
  {
    const r = await page.evaluate(async () => {
      const t = await window.invokeTemptFate(true);
      const statusMid = window._temptGuardStatus(window.state);
      const pet = window._fateSequenceAppend('petition', window._temptGuardScopeKey(window.state), 'pet-1');
      const seqAfterPet = JSON.parse(JSON.stringify(window.state._fateInvocationSeq));
      window._temptGuardRelease(window.state._temptGuardActiveReservation, 'test_cancel');
      return { t: t === true, statusMid, pet, seqAfterPet,
        seqAfterCancel: JSON.parse(JSON.stringify(window.state._fateInvocationSeq)),
        statusAfter: window._temptGuardStatus(window.state) };
    });
    ok('the Tempt is pending, not sealed', r.statusMid === 'pending');
    ok('a Petition in the SAME scene is permitted while the Tempt is pending', !!r.pet && r.pet.mechanic === 'petition');
    ok('...and enters the SHARED monotonic Fate sequence', r.seqAfterPet.length === 1 && r.seqAfterPet[0].seq === 1);
    ok('the unsealed Tempt contributed NO sequence entry — a pending Tempt is not yet a fact',
      r.seqAfterPet.filter((e) => e.mechanic === 'tempt').length === 0);
    ok('cancelling the Tempt leaves the Petition entry untouched', JSON.stringify(r.seqAfterCancel) === JSON.stringify(r.seqAfterPet));
    ok('...and the scene allowance is free again', r.statusAfter === 'free');
  }

  section('4b. Modal-open double attempt, then cancel permits retry');
  await baseline({ withScene: true, fortunes: 0 });
  {
    const m0 = modalOpens(), c0 = costStarts();
    const r = await page.evaluate(async () => {
      const first = await window.invokeTemptFate(true);           // insufficient balance -> real modal
      const statusDuring0 = window._temptGuardStatus(window.state);
      const second = await window.invokeTemptFate(true);          // DURING the modal
      const statusDuring = window._temptGuardStatus(window.state);
      return { first: first === true, second: second === true, statusDuring0, statusDuring };
    });
    const m1 = modalOpens(), c1 = costStarts();
    ok('the first attempt opened the REAL purchase modal and was not accepted', r.first === false && m1 - m0 === 1, 'modalOpens=' + (m1 - m0));
    ok('the reservation is HELD while the modal is open — a modal is a WAITING state', r.statusDuring0 === 'pending', r.statusDuring0);
    ok('a SECOND attempt during the modal is rejected', r.second === false);
    ok('...before entering any cost path — no second modal, no deduction attempt', m1 - m0 === 1 && c1 - c0 === 0,
      JSON.stringify({ modals: m1 - m0, costStarts: c1 - c0 }));
    const after = await page.evaluate(async () => {
      window.closeFortunePurchaseModal();
      const statusAfter = window._temptGuardStatus(window.state);
      window.state._temptGrantsFreeCredit = true;
      const retry = await window.invokeTemptFate(true);
      return { statusAfter, retry: retry === true };
    });
    ok('closing the modal releases the reservation', after.statusAfter === 'free', after.statusAfter);
    ok('...and a retry in the same scene then succeeds', after.retry === true);
  }

  section('4c. Bootstrap scope — no accepted prose scene');
  {
    await baseline({ withScene: false, storyId: 'bootstrap-story', freeCredit: true });
    const r = await page.evaluate(async () => {
      const key0 = window._temptGuardScopeKey(window.state);
      const first = await window.invokeTemptFate(true);
      const e = window._recordTemptFateEvent('a wish');
      window._temptGuardSeal(window.state._temptGuardActiveReservation, e && e.id);
      window.state._temptGrantsFreeCredit = true;
      const second = await window.invokeTemptFate(true);
      window.state.scenes = [{ uid: 'oas:x', title: '', synopsis: '', text: '', fateCard: null, oasArchive: { a: 1 },
        projection: { v: 1, kind: 'archive', hash: window._sbTextHash(''), revision: 0, provenance: 'archive_entry' },
        attributionSidecar: null, attributionAvailable: false }];
      const keyArchiveOnly = window._temptGuardScopeKey(window.state);
      const third = await window.invokeTemptFate(true);
      const rec = window._sbPersistSceneProjection({ kind: 'body', input: 'First prose scene.' });
      const keyAfter = window._temptGuardScopeKey(window.state);
      window.state._temptGrantsFreeCredit = true;
      const afterAccept = await window.invokeTemptFate(true);
      return { key0, first: first === true, second: second === true, keyArchiveOnly,
        third: third === true, keyAfter, uid: rec.uid, afterAccept: afterAccept === true };
    });
    ok('with no prose scene the key is the per-story bootstrap sentinel', r.key0 === 'scene:bootstrap:bootstrap-story', r.key0);
    ok('one Tempt is allowed under the sentinel', r.first === true);
    ok('a second is REJECTED', r.second === false);
    ok('an ARCHIVE-only scenes array is still bootstrap — an archive is not prose', r.keyArchiveOnly === r.key0, r.keyArchiveOnly);
    ok('...and the block still holds there', r.third === false);
    ok('accepting the first PROSE scene moves the key to that scene uid', r.keyAfter === r.uid, r.keyAfter + ' vs ' + r.uid);
    ok('...and the allowance is free again', r.afterAccept === true);
  }

  section('4d. SERVED-UI proof — the real Tempt Fate button');
  await baseline({ withScene: true, fortunes: 0 });
  {
    const present = await page.evaluate(() =>
      !!document.querySelector('.meta-stance[onclick="window.setMetaStance(\'seduce\')"]'));
    ok('the real Tempt Fate button exists in the served DOM (index.html:2274)', present === true);
    const m0 = modalOpens(), c0 = costStarts();
    // A real DOM click on the real element, firing its real onclick. Dispatched via .click() because the
    // stance row is not visible in this harness state; the handler path is identical.
    const st = await page.evaluate(async () => {
      const b = document.querySelector('.meta-stance[onclick="window.setMetaStance(\'seduce\')"]');
      b.click(); await new Promise((r) => setTimeout(r, 60));
      const s1 = window._temptGuardStatus(window.state);
      b.click(); await new Promise((r) => setTimeout(r, 60));
      return { s1, s2: window._temptGuardStatus(window.state) };
    });
    const m1 = modalOpens(), c1 = costStarts();
    ok('the first real click opened the purchase modal and HELD the reservation', m1 - m0 === 1 && st.s1 === 'pending',
      JSON.stringify({ modals: m1 - m0, status: st.s1 }));
    ok('a SECOND real click during the modal entered no cost path — no second modal, no deduction',
      m1 - m0 === 1 && c1 - c0 === 0, JSON.stringify({ modals: m1 - m0, costStarts: c1 - c0 }));
    ok('...and the reservation is still held, not doubled', st.s2 === 'pending', st.s2);
    const retry = await page.evaluate(async () => {
      window.closeFortunePurchaseModal();
      const freed = window._temptGuardStatus(window.state);
      window.state._temptGrantsFreeCredit = true;
      const b = document.querySelector('.meta-stance[onclick="window.setMetaStance(\'seduce\')"]');
      b.click(); await new Promise((r) => setTimeout(r, 80));
      return { freed, status: window._temptGuardStatus(window.state) };
    });
    ok('cancelling frees the allowance', retry.freed === 'free', retry.freed);
    ok('...and a real retry click is accepted', retry.status === 'pending', retry.status);
  }

  section('5. Accepted Tempt + rejected second Tempt');
  await baseline({ withScene: true, freeCredit: true });
  {
    const r0 = await page.evaluate(async () => {
      const first = await window.invokeTemptFate(true);
      const e = window._recordTemptFateEvent('w');
      window._temptGuardSeal(window.state._temptGuardActiveReservation, e && e.id);
      return { first: first === true, status: window._temptGuardStatus(window.state) };
    });
    ok('the first is accepted and the guard reports SEALED', r0.first === true && r0.status === 'sealed', r0.status);
    const m0 = modalOpens(), c0 = costStarts();
    const r = await page.evaluate(async () => {
      const before = JSON.stringify({ scenes: window.state.scenes.length, ledger: window.state._temptFateLedger.length,
        seq: window.state._fateInvocationSeq.length, fortunes: window.state.fortunes,
        freeCredit: !!window.state._temptGrantsFreeCredit });
      const second = await window.invokeTemptFate(true);
      const after = JSON.stringify({ scenes: window.state.scenes.length, ledger: window.state._temptFateLedger.length,
        seq: window.state._fateInvocationSeq.length, fortunes: window.state.fortunes,
        freeCredit: !!window.state._temptGrantsFreeCredit });
      return { second: second === true, before, after };
    });
    ok('the second is rejected', r.second === false);
    ok('NO Fortune charge attempt and NO purchase action for the duplicate',
      costStarts() - c0 === 0 && modalOpens() - m0 === 0, JSON.stringify({ costStarts: costStarts() - c0, modals: modalOpens() - m0 }));
    ok('NO ledger entry, NO sequence entry, NO fortune change, NO free credit consumed', r.before === r.after,
      r.before + ' -> ' + r.after);
  }

  section('6. Save / reload after acceptance');
  {
    const r = await page.evaluate(() => {
      const snap = JSON.stringify({ g: window.state._temptSceneGuard, q: window.state._fateInvocationSeq, s: window.state.scenes });
      const restored = JSON.parse(snap);
      window.state._temptSceneGuard = restored.g; window.state._fateInvocationSeq = restored.q; window.state.scenes = restored.s;
      return { status: window._temptGuardStatus(window.state), seq: window.state._fateInvocationSeq.map((e) => e.seq) };
    });
    ok('the guard survives a snapshot round trip and still reports SEALED', r.status === 'sealed', r.status);
    ok('...and the shared sequence numbers are unchanged', JSON.stringify(r.seq) === JSON.stringify([1]), JSON.stringify(r.seq));
    const again = await page.evaluate(async () => {
      window.state._temptGrantsFreeCredit = true;
      return (await window.invokeTemptFate(true)) === true;
    });
    ok('a Tempt after reload is still declined for that scene', again === false);
  }

  section('7. Scene revision retains the block; a NEW scene does not');
  {
    const r = await page.evaluate(async () => {
      const uid = window.state.scenes[0].uid;
      const before = window.state.scenes[0].projection.revision;
      window._sbReviseSceneProjection(uid, { kind: 'body', input: 'An accepted scene, revised.' });
      const rec = window._sbSceneByUid(uid).record;
      window.state._temptGrantsFreeCredit = true;
      const afterRevision = await window.invokeTemptFate(true);
      const newRec = window._sbPersistSceneProjection({ kind: 'body', input: 'A second accepted scene.' });
      window.state._temptGrantsFreeCredit = true;
      const afterNewScene = await window.invokeTemptFate(true);
      return { uidSame: rec.uid === uid, revBumped: rec.projection.revision === before + 1,
        afterRevision: afterRevision === true, afterNewScene: afterNewScene === true };
    });
    ok('the revision bumped the revision and KEPT the uid', r.uidSame && r.revBumped);
    ok('the block is RETAINED through the revision — the uid is the key, not the hash', r.afterRevision === false);
    ok('a NEW scene with a NEW uid is permitted — the block is scene-scoped, not permanent', r.afterNewScene === true);
  }

  section('8. Release is identity-matched');
  {
    const r = await page.evaluate(() => {
      window.state._temptSceneGuard = {};
      const a = window._temptGuardAcquire();
      const wrong = window._temptGuardRelease('tgr_not_the_one', 'stale');
      const stillPending = window._temptGuardStatus(window.state);
      const right = window._temptGuardRelease(a.reservationId, 'correct');
      return { acquired: a.ok, wrong, stillPending, right, after: window._temptGuardStatus(window.state) };
    });
    ok('a stale reservationId cannot release a newer reservation', r.wrong === false && r.stillPending === 'pending');
    ok('the matching id releases it', r.right === true && r.after === 'free');
  }

  section('9. Containment');
  {
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider dispatches', real.length === 0, 'got ' + real.length);
    ok('the guard never threw during seal', !consoleLines.some((l) => /TEMPT-GUARD\] seal threw/.test(l)));
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('TEMPT SCENE GUARD CONTROL: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
