// THE REVISED FIRST SACRIFICE OPENING — ordinary pointer clicks and real typing. $0, no provider.
//
// Every provider stage is simulated. Nothing here says anything about live writing quality.
//
// WHAT COUNTS AS A DEMONSTRATION HERE: the entrance's own affordances (Examine, a fate card, the
// Say/Do fields, Submit) and the closing branch are driven ONLY by trusted Playwright pointer
// clicks and real typing. There is NO hidden-element click fallback: if an element is not
// genuinely on screen, the click fails and the check fails with it. Reader NAVIGATION to the page
// the entrance lives on is setup and uses production's own reader functions.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { stageOf, isProviderEndpoint, MEMORY, verifierVerdict, fsPlannerCaptured }
  from './_replay_fixtures.mjs';
// THE EXISTING SESSION FIXTURE (_test_session_env.mjs), not another authentication shortcut.
// _postFortuneCharge refuses BEFORE fetch when there is no Authorization header, and it builds
// that header from sb.auth.getSession(). supabase-js resolves getSession() from localStorage at
// load, so the session must be seeded via addInitScript before any page script runs — setting
// profileId and a balance afterwards cannot satisfy it. /api/config must also be served, or no
// auth client is constructed at all.
import { configBody, installSession, isAuthOrigin, installEntitledProfileStub } from './_test_session_env.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview } from './_fs_story_setup.mjs';

const ARM = process.argv[2] || 'typed';   // typed | card | auth | cancel | remain
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// A REAL captured author reply, so Scene 2 can actually be ACCEPTED rather than merely dispatched.
const AUTHOR_FIXTURE = (() => {
  const f = '_fs_live_out/run_2026-10-06T16-50-01-923Z/wire/029_res.json';
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const c = (j.choices || [{}])[0]?.message?.content || j.content;
  const p = JSON.parse(typeof c === 'string' ? c : '{}');
  if (!Array.isArray(p.beats) || p.beats.length < 4) throw new Error('author fixture has no beats');
  console.log('author fixture: captured reply, ' + p.beats.length + ' beats');
  return JSON.stringify(p);
})();
const FS_PLANNER = (() => { try { return fsPlannerCaptured(); }
  catch (e) { console.log('FS planner fixture UNAVAILABLE: ' + e.message); return null; } })();

const browser = await chromium.launch();
const page = await browser.newPage();
const oasReqs = [], sceneReqs = [], stages = [];
let fortuneCharges = 0;
// IDEMPOTENT CHARGE SIMULATION. Counting requests cannot tell a retry from a second purchase:
// consume_fortunes_v3 is keyed by operationId, so the same id must be answered as the SAME
// operation and must not debit twice. Every request's id is recorded.
const chargeOps = [];          // every request, in order
const debited = new Map();     // operationId -> the balance that operation produced
let balance = 9999999;
// Page console, so a refusal can be quoted instead of inferred from "no OAS appeared".
const consoleLines = [];
page.on('console', (m) => {
  const txt = m.text();
  if (/BAKED:SETUP|BAKED:GATE|FORTUNE|PREVIEW-SLICE|BAKED:RESUME|OAS:ENTRANCE|BAKED:OAS/.test(txt)) {
    consoleLines.push(m.type().toUpperCase() + ' ' + txt.slice(0, 190));
  }
});
page.on('pageerror', (e) => consoleLines.push('PAGEERROR ' + String(e.message).slice(0, 190)));
await installSession(page);
await page.route('**/*', async (route) => {
  const req = route.request();
  const url = req.url();
  // The auth client's own origin is unreachable by design; answer it locally.
  if (isAuthOrigin(url)) { try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {} return; }
  if (!/\/api\//.test(url)) { try { await route.continue(); } catch (_) {} return; }
  if (/\/api\/config\b/.test(url)) {
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); } catch (_) {}
    return;
  }
  if (/\/api\/(geo|csp-report|beta-events)\b/.test(url)) {
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
    return;
  }
  // PAYMENT RESPONSES ARE SIMULATED LOCALLY; the charge REQUEST is production's own, and it only
  // happens once a real session token is attached.
  if (/\/api\/consume-fortune/.test(req.url())) {
    fortuneCharges++;
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const opId = (b && (b.operationId || b.opId || b.operation_id)) || null;
    const amount = Number((b && (b.amount || b.fortunes)) || 0);
    chargeOps.push({ opId, amount });
    // IDEMPOTENT: a repeated operationId returns the FIRST result and debits nothing further.
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
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let msgs = []; try { msgs = (JSON.parse(raw || '{}').messages) || []; } catch (_) {}
  const sys = String((msgs[0] || {}).content || '');
  const whole = msgs.map(m => String(m.content || '')).join('\n');
  const stage = stageOf(sys);
  stages.push(stage);
  let body = '{}';
  if (stage === 'oas') {
    oasReqs.push({ whole });
    body = JSON.stringify({ li_dialogue: 'You answer me in front of them, then.',
      li_action: 'He does not lower The Answer.', li_next_prompt: 'Say it again, louder.',
      li_face_state: 'neutral', scene_state: (oasReqs.length >= 6 ? 'resolve' : 'continue'),
      scene_tone: 'tense', user_signal: 'engaged', temperature_shift: 0 });
  } else if (stage === 'author') { sceneReqs.push({ whole }); body = AUTHOR_FIXTURE; }
  else if (/5 contextual Say\/Do previews/i.test(sys)) {
    // THE FATE-CARD PREVIEW BATCH, in the exact pipe-delimited shape production parses (captured
    // from wire/003_res.json). Without this the generic '{}' fixture was written into the Say
    // field verbatim, which made a routing success look like a product defect.
    body = [
      'TEMPTATION ||| Grip the Answer tighter, leaning closer to Julian\'s face. ||| "What if I told you I did?"',
      'BOUNDARY ||| Step back, letting the Answer hang between us. ||| "I won\'t answer until I know what was done."',
      'CONFESSION ||| Turn the Answer so the assembly can see my hands shake. ||| "I wanted him to look at me."',
      'REVERSAL ||| Offer the Answer back to him, flat on both palms. ||| "Then you ask, and let them hear you."',
      'SILENCE ||| Close my mouth and hold his eyes. ||| ""'
    ].join('  \n');
  }
  else if (stage === 'planner') body = FS_PLANNER || '{}';
  else if (stage === 'memory') body = MEMORY;
  else if (stage === 'verifier') body = verifierVerdict([]);
  try { await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: body }) }); } catch (_) {}
});

const optOut = () => page.evaluate(() => {
  try { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; } catch (_) {}
  // A SIMULATED SIGNED-IN SESSION. Logged out, the reader is held at "Join The Masquerade" and the
  // book will not open at all, so no reader flow can be demonstrated. state.profileId is exactly
  // what production's own _isSignedIn reads; authentication RESPONSES are simulated here in the
  // same way entitlement and payment responses are. Nothing else about the gate is bypassed.
  try { window.state.profileId = 'harness-profile-0001'; } catch (_) {}
});
// SETUP: reach the page the entrance lives on, through production's own reader navigation.
// showReaderPage re-adds frontispiece-active, whose CSS hides every sibling of the map, so the
// class is cleared LAST — otherwise the entrance is display:none and nothing can be clicked.
const toReader = async () => {
  // READER NAVIGATION, through the reader's own page turns. Nothing is un-hidden by hand, no
  // `hidden` class is removed and no frontispiece state is set. #coverNextBtn is a trusted pointer
  // click; the remaining turns call window.StoryPagination.goToNextPage — the SAME function
  // production binds to #nextPageBtn, used where that button is not yet mounted.
  const log = [];
  await page.evaluate(() => {
    try {
      const g = document.getElementById('game');
      if (g && g.classList.contains('hidden') && typeof window.showScreen === 'function') {
        if (typeof window.stopLoading === 'function') { try { window.stopLoading(); } catch (_) {} }
        window.showScreen('game');
      }
    } catch (_) {}
  });
  for (let i = 0; i < 25; i++) {
    const st = await page.evaluate(() => {
      const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
      return { entrance: v('bakedOASExamineBtn') && v('bakedOASSubmitBtn'),
               cover: v('coverNextBtn'), next: v('nextPageBtn'),
               title: !!window._titlePageActive, front: !!window._frontispieceActive };
    });
    if (st.entrance) { log.push('entrance on screen after ' + i + ' turns'); break; }
    if (st.cover) { await page.click('#coverNextBtn', { timeout: 6000 }).catch(() => {}); log.push('cover(click)'); }
    else if (st.next) { await page.click('#nextPageBtn', { timeout: 6000 }).catch(() => {}); log.push('next(click)'); }
    else {
      await page.evaluate(() => {
        try {
          if (window._frontispieceActive && typeof window.dismissFatelandsFrontispiece === 'function') {
            window.dismissFatelandsFrontispiece();
          } else { window.StoryPagination.goToNextPage(); }
        } catch (_) {}
      });
      log.push(st.title ? 'title(pagination)' : st.front ? 'frontispiece(dismiss)' : 'page(pagination)');
      // Let an animated dismissal finish before deciding anything else.
      for (let w = 0; w < 12; w++) {
        const clear = await page.evaluate(() => {
          const sc = document.getElementById('storyContent');
          return !(sc && sc.classList.contains('frontispiece-active')) && !window._frontispieceActive;
        });
        if (clear) break;
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(1200);
  }
  console.log('   navigation: ' + log.join(' -> '));
};

await installEntitledProfileStub(page, { log: (m) => console.log('   ' + m) });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 }).catch(() => {});
const def = await findFSDef(page);
await optOut(); await launchFS(page, def); await optOut();
await unlockFS(page, 'opening-flow');
await finalizePreview(page);
await page.waitForTimeout(3000); await optOut();
await toReader();

console.log('ARM=' + ARM);
const onScreen = await page.evaluate(() => {
  const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
  return { examine: v('bakedOASExamineBtn'), say: v('bakedOASSay'), do: v('bakedOASDo'),
           submit: v('bakedOASSubmitBtn'), legacy: !!document.getElementById('bakedOASEnterBtn') };
});
console.log('on screen: ' + JSON.stringify(onScreen));
if (!onScreen.examine || !onScreen.submit) {
  console.log('\n  UNPROVEN — the entrance is not on screen, so no pointer interaction is possible.');
  await browser.close(); process.exit(1);
}

console.log('\n=== THE AUTHORED STAGING AND THE DECK PASSAGE ===');
const pageText = await page.evaluate(() => (document.getElementById('storyContent') || {}).textContent || '');
t('The Answer goes into ONE hand', /set it in my right hand/.test(pageText) && !/set it in my hands/.test(pageText));
t('Julian asks his question on the page', /What have you to say\?/.test(pageText));
t('the deck passage appears verbatim',
  /My other hand tightened around my great-grandmother’s tarot deck\. I didn’t remember bringing it\. I toyed with the idea of letting the cards decide\./.test(pageText));
t('the entrance is genuinely ON SCREEN', onScreen.examine && onScreen.say && onScreen.do && onScreen.submit);
t('the standalone Continue entrance is gone', !onScreen.legacy);

console.log('\n=== NO PLAYABLE HAND BEFORE EXAMINE — ACROSS EVERY MOUNT ===');
const before = await page.evaluate(() => {
  const MOUNTS = ['bakedOASHand', 'cardMount', 'gnCardMount', 'fateSpecialCards', 'gnFateSection'];
  const per = {}; let total = 0, clickable = 0;
  MOUNTS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) { per[id] = 'absent'; return; }
    const cards = el.querySelectorAll('.fate-card, [data-card]');
    per[id] = cards.length;
    total += cards.length;
    cards.forEach((c) => { if (c.getClientRects().length > 0) clickable++; });
  });
  return { per, total, clickable, examined: (window._sbEntranceRoute || {}).examined };
});
console.log('   mounts: ' + JSON.stringify(before.per));
t('NO playable card exists in ANY reader mount', before.total === 0, JSON.stringify(before.per));
t('and none is clickable anywhere', before.clickable === 0);
t('the entrance has not been examined yet', before.examined === false);

console.log('\n=== AFTER A TRUSTED CLICK ON EXAMINE ===');
await page.click('#bakedOASExamineBtn', { timeout: 8000 });
await page.waitForTimeout(2200);
const after = await page.evaluate(() => {
  const h = document.getElementById('bakedOASHand');
  const l = document.getElementById('bakedOASLocked');
  const cards = h ? Array.from(h.querySelectorAll('.fate-card, [data-card]')) : [];
  const locked = l ? Array.from(l.children) : [];
  return { count: cards.length, onScreen: cards.filter(c => c.getClientRects().length > 0).length,
    lockedLabels: locked.map(x => x.textContent.trim()),
    allUnavailable: locked.length > 0 && locked.every(x => x.getAttribute('data-locked') === '1'
      && x.getAttribute('aria-disabled') === 'true' && x.style.pointerEvents === 'none'
      && parseFloat(x.style.opacity) < 0.5 && /grayscale/.test(x.style.filter || '')),
    elsewhere: ['cardMount', 'gnCardMount'].reduce((n, id) => { const e = document.getElementById(id);
      return n + (e ? e.querySelectorAll('.fate-card, [data-card]').length : 0); }, 0) };
});
t('five ordinary Fate cards are dealt', after.count === 5, 'count=' + after.count);
t('and all five are ON SCREEN', after.onScreen === 5, 'onScreen=' + after.onScreen);
t('Petition Fate and Tempt Fate are shown', after.lockedLabels.join('|') === 'Petition Fate|Tempt Fate',
  JSON.stringify(after.lockedLabels));
t('and both are greyed out and unavailable', after.allUnavailable);
t('the hand went to the ENTRANCE, not another mount', after.elsewhere === 0);

console.log('\n=== THE READER\'S ANSWER ===');
let expectSay = '', expectDo = '';
if (ARM === 'card') {
  // THE FIXTURE'S OWN ACTION AND LINE, asserted into the RIGHT fields. The previous version only
  // checked that something appeared, which is how a reversed mapping passed: an ACTION was sitting
  // in the Say box and a LINE in the Do box.
  // The fixture's five cards, each an (ACTION, SPOKEN LINE) pair. Which card the shuffle offers
  // first is not fixed, so the assertion is that the filled fields match ONE card with its ACTION
  // in the Do field and its LINE in the Say field — role correctness, pinned to a single card.
  const FIXTURE_CARDS = [
    ['Grip the Answer tighter, leaning closer to Julian\'s face.', '"What if I told you I did?"'],
    ['Step back, letting the Answer hang between us.', '"I won\'t answer until I know what was done."'],
    ['Turn the Answer so the assembly can see my hands shake.', '"I wanted him to look at me."'],
    ['Offer the Answer back to him, flat on both palms.', '"Then you ask, and let them hear you."'],
    ['Close my mouth and hold his eyes.', '""']
  ];
  const strip = (x) => String(x || '').replace(/^"|"$/g, '').trim();
  const emptyBefore = await page.evaluate(() => ({
    say: document.getElementById('bakedOASSay').value, do: document.getElementById('bakedOASDo').value }));
  t('the fields start empty', !emptyBefore.say && !emptyBefore.do, JSON.stringify(emptyBefore));
  await page.click('#bakedOASHand [data-card-index="3"], #bakedOASHand .fate-card, #bakedOASHand [data-card]', { timeout: 8000 });
  let filled = { say: '', do: '' }, prev = null, stable = 0;
  for (let i = 0; i < 25; i++) {
    filled = await page.evaluate(() => ({
      say: document.getElementById('bakedOASSay').value,
      do: document.getElementById('bakedOASDo').value }));
    const sig = filled.say + '\u0000' + filled.do;
    if ((filled.say || filled.do) && sig === prev) { if (++stable >= 2) break; } else { stable = 0; }
    prev = sig;
    await page.waitForTimeout(700);
  }
  console.log('   card filled -> Say: ' + JSON.stringify(filled.say));
  console.log('                  Do: ' + JSON.stringify(filled.do));
  t('the card filled the entrance\'s own fields', !!(filled.say || filled.do), JSON.stringify(filled));
  const matchedCard = FIXTURE_CARDS.find(([act, line]) =>
    strip(filled.do) === strip(act) && strip(filled.say) === strip(line));
  const reversedCard = FIXTURE_CARDS.find(([act, line]) =>
    strip(filled.say) === strip(act) && strip(filled.do) === strip(line));
  if (reversedCard) console.log('   REVERSED: the action is in Say and the line is in Do');
  const sayIsLine = !!matchedCard, doIsAction = !!matchedCard;
  t('THE SPOKEN LINE went into the Say field, and the ACTION into the Do field — one card, '
    + 'correct roles', !!matchedCard,
    'Say=' + JSON.stringify(filled.say) + ' Do=' + JSON.stringify(filled.do)
    + (reversedCard ? ' — THESE ARE REVERSED' : ' — matches no fixture card'));
  t('and they are NOT reversed', !reversedCard);
  if (!sayIsLine || !doIsAction) {
    console.log('\n  the fields are not carrying their correct roles — stopping here');
    await browser.close(); process.exit(1);
  }
  const addition = ' And I still say I shaped nothing.';
  const sayBeforeEdit = filled.say;
  await page.click('#bakedOASSay');
  await page.keyboard.press('End');
  await page.keyboard.type(addition, { delay: 8 });
  const edited = await page.evaluate(() => document.getElementById('bakedOASSay').value);
  t('the reader could EDIT the spoken line by typing',
    edited === sayBeforeEdit + addition, JSON.stringify(edited));
  expectSay = edited; expectDo = filled.do;
} else {
  expectSay = 'I shaped nothing. Ask me properly.';
  expectDo = 'I keep my eyes on his.';
  await page.click('#bakedOASSay');
  await page.keyboard.type(expectSay, { delay: 6 });
  await page.click('#bakedOASDo');
  await page.keyboard.type(expectDo, { delay: 6 });
  const typed = await page.evaluate(() => ({
    say: document.getElementById('bakedOASSay').value, do: document.getElementById('bakedOASDo').value }));
  t('real typing reached the entrance fields', typed.say === expectSay && typed.do === expectDo,
    JSON.stringify(typed));
}

if (ARM === 'cancel') {
  console.log('\n=== CANCEL THROUGH "Not yet", THEN RETRY ===');
  // A signed-in session is needed for the gate to reach its confirm-and-charge screen at all
  // (logged out, the account IS the unlock and it routes to sign-in instead). state.profileId is
  // what production's own _isSignedIn reads; nothing else is set by hand.
  await page.evaluate(() => { try { window.state.profileId = 'harness-profile-0001'; } catch (_) {} });
  // Put the gate back in front of the reader by clearing the harness's earlier unlock, so the
  // real modal is raised. From here everything is the reader's own controls.
  // Put the gate back in front of the reader, and give the account a BALANCE. _chargePreviewSlice
  // declines locally when state.fortunes is short of the price, before it ever posts, so a wallet
  // the server would have reported is part of the simulated entitlement. Nothing unlocks the gate
  // by hand from here: the reader's own confirm button runs production's charge, and only the
  // charge RESPONSE is simulated.
  await page.evaluate(() => {
    try {
      window.state._bakedGenesisUnlocked = false;
    } catch (_) {}
  });
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  const modal = await page.evaluate(() => {
    const m = document.getElementById('bakedUnlockModal');
    const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
    return { shown: !!(m && m.classList.contains('show')), cancel: v('buCancelBtn'), go: v('buGoBtn'),
             cancelLabel: (document.getElementById('buCancelBtn') || {}).textContent };
  });
  console.log('   gate modal: ' + JSON.stringify(modal));
  t('the gate raised its own modal', modal.shown === true, JSON.stringify(modal));
  t('and offers "Not yet" on screen', modal.cancel === true && /Not yet/i.test(modal.cancelLabel || ''));
  await page.click('#buCancelBtn', { timeout: 8000 });     // the reader declines, for real
  await page.waitForTimeout(2000);
  const held = await page.evaluate(() => ({
    modalShown: !!(document.getElementById('bakedUnlockModal') || {}).classList?.contains('show'),
    dispatched: document.getElementById('bakedOASSubmitBtn').getAttribute('data-dispatched'),
    say: document.getElementById('bakedOASSay').value,
    oasOpen: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active) }));
  console.log('   after "Not yet": ' + JSON.stringify({ ...held, say: held.say.slice(0, 40) }));
  t('the modal closed on "Not yet"', held.modalShown === false);
  t('no OAS opened and nothing was charged', held.oasOpen === false && oasReqs.length === 0
    && fortuneCharges === 0, 'charges=' + fortuneCharges);
  t('SUBMIT IS NOT LATCHED, so it can be retried', held.dispatched === null,
    'data-dispatched=' + held.dispatched);
  t('and the reader\'s answer is still in the field', held.say === expectSay);
  // RETRY: submit again, and this time accept through the modal's own confirm button.
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2000);
  t('the gate raised the modal a second time', await page.evaluate(() =>
    !!(document.getElementById('bakedUnlockModal') || {}).classList?.contains('show')));
  const sessDiag = await page.evaluate(async () => {
    const out = { sbPresent: false, token: null, fortunes: window.state.fortunes,
                  previewActive: !!window.state.previewActive,
                  previewProductId: window.state.previewProductId || null,
                  profileId: window.state.profileId || null };
    try {
      const sb = window.sb || window._sb || window.supabase || null;
      out.sbPresent = !!(sb && sb.auth && sb.auth.getSession);
      if (out.sbPresent) {
        const r = await sb.auth.getSession();
        out.token = r && r.data && r.data.session ? String(r.data.session.access_token).slice(0, 18) : null;
      }
    } catch (e) { out.err = String(e.message).slice(0, 60); }
    return out;
  });
  console.log('   SESSION DIAG: ' + JSON.stringify(sessDiag));
  await page.click('#buGoBtn', { timeout: 8000 });
  await page.waitForTimeout(9000);
  console.log('   fortune charges simulated: ' + fortuneCharges);
  t('the RETRY dispatched exactly one OAS request', oasReqs.length === 1, 'count=' + oasReqs.length);
  t('with the preserved answer intact', oasReqs.length === 1 && oasReqs[0].whole.includes(expectSay));
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3000);
  t('and a further click does NOT dispatch a duplicate', oasReqs.length === 1, 'count=' + oasReqs.length);
} else if (ARM === 'auth') {
  console.log('\n=== SIGNING IN RELOADS THE PAGE — THE ANSWER MUST COME BACK ===');
  // Production's own stash, then a real reload, then production's own restore.
  const stashed = await page.evaluate(() => {
    try { window._stashBakedEntry(); } catch (_) {}
    const raw = localStorage.getItem('sb_baked_pending_entry');
    return raw ? JSON.parse(raw) : null;
  });
  console.log('   stashed: ' + JSON.stringify(stashed && { starterId: stashed.starterId,
    entranceSay: (stashed.entranceSay || '').slice(0, 40), entranceDo: (stashed.entranceDo || '').slice(0, 30) }));
  t('the stash carries the ENTRANCE fields, not just the old ones',
    !!(stashed && stashed.entranceSay === expectSay && stashed.entranceDo === expectDo),
    JSON.stringify(stashed));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 }).catch(() => {});
  const survived = await page.evaluate(() => {
    const raw = localStorage.getItem('sb_baked_pending_entry');
    return raw ? JSON.parse(raw) : null;
  });
  t('it SURVIVED the reload', !!(survived && survived.entranceSay === expectSay),
    JSON.stringify(survived && survived.entranceSay));

  // ── ONE FAITHFUL LIFECYCLE ──────────────────────────────────────────────────────────────────
  // The previous version launched, unlocked and finalized the Book AFTER the reload and THEN
  // called _restoreBakedEntryAfterAuth, which launches it AGAIN. The restore owns the re-open on
  // this path, so nothing is launched by hand here. Setup is NOT forced complete and the opener
  // is NOT invoked behind a failed initialization.
  await optOut();
  consoleLines.length = 0;
  const restoreRan = await page.evaluate(() => {
    try { return window._restoreBakedEntryAfterAuth(); } catch (e) { return 'threw: ' + e.message; }
  });
  console.log('   _restoreBakedEntryAfterAuth returned: ' + JSON.stringify(restoreRan));
  await page.waitForTimeout(6000);
  await optOut();
  const mounted = await page.evaluate(() => {
    const w = document.getElementById('bakedOASHandoff');
    const sc = document.getElementById('storyContent');
    return { handoffExists: !!w,
             handoffParent: w && w.parentElement ? (w.parentElement.id || w.parentElement.className) : null,
             submitExists: !!document.getElementById('bakedOASSubmitBtn'),
             storyContentHidden: !!(sc && sc.classList.contains('hidden')),
             scene1MountedAt: window.state._bakedScene1MountedAt || null,
             readerPages: (window.StoryPagination && window.StoryPagination.getPageCount)
               ? window.StoryPagination.getPageCount() : null };
  });
  console.log('   ENTRANCE AFTER RESTORE: ' + JSON.stringify(mounted));
  const whyHidden = await page.evaluate(() => {
    const w = document.getElementById('bakedOASHandoff');
    if (!w) return 'absent';
    const chain = [];
    let el = w;
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el);
      chain.push({ id: el.id || null, cls: (el.className || '').toString().slice(0, 36),
                   d: cs.display, v: cs.visibility, rects: el.getClientRects().length });
      el = el.parentElement;
    }
    const matched = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch (_) { continue; }
      for (const r of Array.from(rules || [])) {
        if (!r.selectorText || !r.style || !r.style.display) continue;
        try { if (w.matches(r.selectorText)) matched.push(r.selectorText + '{display:' + r.style.display + '}'); } catch (_) {}
      }
    }
    return { chain: chain.slice(0, 4), matched, inline: w.getAttribute('style') };
  });
  console.log('   WHY NOT VISIBLE: ' + JSON.stringify(whyHidden).slice(0, 520));
  for (let i = 0; i < 3; i++) {
    await toReader();
    const on = await page.evaluate(() => {
      const e = document.getElementById('bakedOASSubmitBtn');
      return !!(e && e.getClientRects().length > 0);
    });
    if (on) break;
    await page.waitForTimeout(2500);
  }
  const restored = await page.evaluate(() => {
    const a2 = document.getElementById('bakedOASSay'), b2 = document.getElementById('bakedOASDo');
    return { say: a2 ? a2.value : null, do: b2 ? b2.value : null,
             onScreen: !!(a2 && a2.getClientRects().length > 0),
             setupComplete: !!window.state._bakedSetupComplete,
             genesisUnlocked: !!window.state._bakedGenesisUnlocked,
             starterId: window.state._starterId || null };
  });
  console.log('   after restore: ' + JSON.stringify({ ...restored, say: (restored.say || '').slice(0, 44) }));
  t('the restore re-opened the Book itself', restored.starterId === 'starter_first_sacrifice');
  t('THE ANSWER IS BACK IN THE ENTRANCE after authentication', restored.say === expectSay,
    JSON.stringify((restored.say || '').slice(0, 60)));
  t('the Do field came back too', restored.do === expectDo, JSON.stringify(restored.do));
  t('and it is on screen, where the reader left it', restored.onScreen === true);
  t('nothing was auto-submitted', oasReqs.length === 0, 'oas requests: ' + oasReqs.length);

  // ── THE CONFIRM LEG, THROUGH THE READER'S OWN CONTROLS ──────────────────────────────────────
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  const gateUp = await page.evaluate(() => {
    const m = document.getElementById('bakedUnlockModal');
    const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
    return { shown: !!(m && m.classList.contains('show')), go: v('buGoBtn') };
  });
  t('the gate raised its own modal on return', gateUp.shown === true && gateUp.go === true,
    JSON.stringify(gateUp));
  consoleLines.length = 0;
  await page.click('#buGoBtn', { timeout: 8000 });
  for (let i = 0; i < 40 && oasReqs.length === 0; i++) await page.waitForTimeout(1000);
  await page.waitForTimeout(2000);

  const after1 = await page.evaluate(() => {
    const d = window.state.intimacyDialogue || null;
    const b2 = document.getElementById('bakedOASSubmitBtn');
    return { setupComplete: !!window.state._bakedSetupComplete,
             genesisUnlocked: !!window.state._bakedGenesisUnlocked,
             dialogue: !!d, dispatched: b2 ? b2.getAttribute('data-dispatched') : null,
             route: window._sbEntranceRoute ? 'present' : null,
             say: (document.getElementById('bakedOASSay') || {}).value };
  });
  console.log('   charge requests: ' + fortuneCharges + '  ops: ' + JSON.stringify(chargeOps));
  console.log('   distinct debits: ' + debited.size + '  balance: ' + balance);
  console.log('   after confirm: ' + JSON.stringify({ ...after1, say: (after1.say || '').slice(0, 40) }));
  const firstRefusal = consoleLines.find(l => /ABORTED|threw|PAGEERROR|not attempted|insufficient|declined/.test(l));
  console.log('   FIRST REFUSAL: ' + (firstRefusal || '(none captured)'));
  if (consoleLines.length) console.log('   setup trail: ' + JSON.stringify(consoleLines.slice(0, 6)));

  if (after1.dialogue) {
    t('the confirm opened the OAS', true);
    t('EXACTLY ONE charge request', fortuneCharges === 1, 'charges=' + fortuneCharges);
    t('and exactly one debited operation', debited.size === 1, 'debits=' + debited.size);
    t('one OAS dispatch with the preserved Say', oasReqs.length === 1 && oasReqs[0].whole.includes(expectSay));
    t('and the preserved Do', oasReqs.length === 1 && oasReqs[0].whole.includes(expectDo));
    await page.click('#bakedOASSubmitBtn', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3000);
    t('a further click dispatches NO duplicate', oasReqs.length === 1, 'count=' + oasReqs.length);
    t('and debits nothing further', debited.size === 1, 'debits=' + debited.size);
  } else {
    // INITIALIZATION REFUSED. This is the gate's DESIGNED behaviour, not a missing callback:
    // _unlockBakedGenesis runs deferred handleBeginStory, and if _bakedSetupComplete is still
    // false it logs ABORTED, returns false and never calls onUnlocked (app.js:143001-143011).
    console.log('   -> initialization did NOT complete; the gate correctly withheld the opener');
    t('the refusal was CAPTURED, not inferred', !!firstRefusal, JSON.stringify(consoleLines.slice(0, 4)));
    t('setup is reported incomplete, which is why the opener was withheld',
      after1.setupComplete === false, JSON.stringify(after1));
    t('Genesis stayed LOCKED, as the abort promises', after1.genesisUnlocked === false);
    t('the reader keeps their answer', after1.say === expectSay);
    t('Submit is unlatched for a retry', after1.dispatched === null);
    t('the entrance route is still live', after1.route === 'present');
    // RETRY: the same operation must not debit twice.
    const chargesBefore = fortuneCharges, debitsBefore = debited.size;
    await page.click('#bakedOASSubmitBtn', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const goAgain = await page.evaluate(() => {
      const e = document.getElementById('buGoBtn'); return !!(e && e.getClientRects().length > 0); });
    if (goAgain) {
      await page.click('#buGoBtn', { timeout: 8000 });
      for (let i = 0; i < 40 && oasReqs.length === 0; i++) await page.waitForTimeout(1000);
    }
    const after2 = await page.evaluate(() => ({
      dialogue: !!window.state.intimacyDialogue,
      setupComplete: !!window.state._bakedSetupComplete }));
    console.log('   RETRY -> ' + JSON.stringify({ ...after2, charges: fortuneCharges,
      debits: debited.size, ops: chargeOps.map(o => o.opId) }));
    t('the retry was possible through the real controls', goAgain === true);
    t('and it did NOT debit a second time — same operation id',
      debited.size === debitsBefore, 'debits ' + debitsBefore + ' -> ' + debited.size
      + ' requests ' + chargesBefore + ' -> ' + fortuneCharges);
    t('RETRY OPENED THE OAS with the preserved answer',
      after2.dialogue === true && oasReqs.length === 1
      && oasReqs[0].whole.includes(expectSay), 'dialogue=' + after2.dialogue
      + ' oas=' + oasReqs.length);
  }
} else {
  console.log('\n=== SUBMIT ===');
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(6000);
  t('exactly one OAS request was made', oasReqs.length === 1, 'count=' + oasReqs.length);
  t('the reader\'s exact Say reached it intact', oasReqs.length === 1 && oasReqs[0].whole.includes(expectSay));
  if (expectDo) t('the reader\'s exact Do reached it intact',
    oasReqs.length === 1 && oasReqs[0].whole.includes(expectDo));
  // ROLES, not just presence: the spoken line must arrive labelled as speech and the action as
  // action. A reversed mapping satisfies "both strings occur somewhere" perfectly well.
  if (oasReqs.length === 1 && expectDo) {
    const w = oasReqs[0].whole;
    const ctx = (needle) => {
      const i = w.indexOf(needle);
      return i < 0 ? null : w.slice(Math.max(0, i - 90), i).replace(/\s+/g, ' ');
    };
    const sayCtx = ctx(expectSay), doCtx = ctx(expectDo);
    console.log('   label before the SPOKEN line: ' + JSON.stringify((sayCtx || '').slice(-60)));
    console.log('   label before the ACTION:      ' + JSON.stringify((doCtx || '').slice(-60)));
    const SPEECH = /say|said|spoke|spoken|dialogue|line/i, ACTION = /\bdo\b|did|does|action|physical/i;
    t('the SPOKEN line is labelled as speech in the request',
      !!sayCtx && SPEECH.test(sayCtx) && !ACTION.test(sayCtx.slice(-28)), JSON.stringify((sayCtx||'').slice(-60)));
    t('the ACTION is labelled as action in the request',
      !!doCtx && ACTION.test(doCtx), JSON.stringify((doCtx||'').slice(-60)));
    t('and the two are not the same position', sayCtx !== doCtx);
  }
  t('no unrelated opener ran before it', oasReqs.length === 1);
  t('no Scene 2 request yet', sceneReqs.length === 0, 'scene requests: ' + sceneReqs.length);
}

if (ARM === 'auth' || ARM === 'cancel') {
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
  process.exit(fail ? 1 : 0);
}

console.log('\n=== THE INTERRUPTION, THEN RUN-OR-REMAIN ===');
for (let i = 0; i < 16; i++) {
  const st = await page.evaluate(() => !!document.getElementById('sceneDecisionPrompt'));
  if (st) break;
  await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} });
  await page.waitForTimeout(2500);
}
const atDec = await page.evaluate(() => {
  const r = window.state._intimateInterruption || {};
  const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
  return { decisionOnScreen: v('sceneDecisionPrompt'), submitted: !!r.submitted,
    noSubmit: !!r.completedWithoutSubmission, flow: !!r.noSubmitFlow, phase: r.phase,
    straySubmit: ['gnSubmitBtn', 'submitBtn'].some(v), strayCards: ['gnFateSection', 'cardMount'].some(v),
    dupExamine: v('bakedOASExamineBtn'), needed: window._sceneDecisionNeeded() };
});
t('run-or-remain is ON SCREEN as Scene 1\'s final decision', atDec.decisionOnScreen, JSON.stringify(atDec));
t('the interruption completed WITHOUT a fabricated submission',
  atDec.noSubmit === true && atDec.submitted === false);
t('and only because this encounter declared the opening flow', atDec.flow === true);
t('no post-interruption Submit is on screen', !atDec.straySubmit);
t('no second card step is on screen', !atDec.strayCards);
t('the deck intro and Examine gate are not repeated', !atDec.dupExamine);
t('the decision is still open', atDec.needed === true);
t('still no Scene 2 request before the branch', sceneReqs.length === 0, 'scene requests: ' + sceneReqs.length);

console.log('\n=== THE BRANCH, THROUGH AN ACCEPTED SCENE 2 ===');
const want = ARM === 'remain' ? 'remain' : 'run';
const btnId = await page.evaluate((w) => {
  for (const id of ['sceneDecisionA', 'sceneDecisionB']) {
    const el = document.getElementById(id);
    if (el && el.getAttribute('data-choice') === w) return id;
  }
  return null;
}, want);
t('the branch "' + want + '" is offered on screen', !!btnId, 'button=' + btnId);
await page.click('#' + btnId, { timeout: 8000 });
await page.waitForTimeout(28000);
const rec = await page.evaluate(() => window._sceneDecision(1));
console.log('   recorded: ' + JSON.stringify(rec));
t('the ACTUAL branch is recorded', rec && String(rec.choice).toLowerCase() === want, JSON.stringify(rec));
t('exactly one Scene 2 request was triggered', sceneReqs.length === 1, 'scene requests: ' + sceneReqs.length);
const disp = await page.evaluate(() => window._recordedChoiceDisplacesFrame(window.state, 'dohkar_preliminary_review'));
t('only the seed-declared displacing choice displaces the frame',
  want === 'run' ? disp.displaces === true : disp.displaces === false, JSON.stringify(disp));
if (sceneReqs.length) {
  t('the OAS archive reached the continuation context',
    /You answer me in front of them, then\./.test(sceneReqs[0].whole));
  t('the authored interruption reached it', /That is enough, Provast/.test(sceneReqs[0].whole));
}
// ACCEPTANCE, not merely dispatch.
const accepted = await page.evaluate(() => {
  const cg = (window.state.scenes || []).filter(x => x && String(x.uid || '').startsWith('cg:'));
  const last = cg[cg.length - 1] || null;
  const beats = last && Array.isArray(last.beats) ? last.beats.length : 0;
  const text = last ? String(last.text || '') : '';
  return { cgScenes: cg.length, beats, chars: text.length,
           isBakedOpening: /set it in my right hand/.test(text),
           sample: text.slice(0, 90) };
});
console.log('   scene 2: ' + JSON.stringify(accepted));
t('SCENE 2 WAS ACCEPTED — real prose was committed, not an empty plan',
  accepted.cgScenes >= 1 && accepted.chars > 400, JSON.stringify(accepted));
t('and it is not the baked opening replayed', accepted.isBakedOpening === false);
// A FUNCTIONING SCENE-END CARD: the entrance route is gone, so the reader's own mount must work.
const endCard = await page.evaluate(() => ({ route: window._sbEntranceRoute,
  inputs: (() => { const i = window._getActiveTurnInputs();
    return { act: i.actInput ? i.actInput.id : null, dia: i.diaInput ? i.diaInput.id : null }; })(),
  mount: (() => { const m = window._activeCardMount(); return m ? m.id : null; })() }));
console.log('   routing now: ' + JSON.stringify(endCard));
t('the entrance route was released after the OAS opened', endCard.route === null);
t('turn inputs route back to the reader\'s own fields',
  endCard.inputs.act && endCard.inputs.act !== 'bakedOASSay', JSON.stringify(endCard.inputs));
t('and the card mount is a reader mount again',
  endCard.mount && endCard.mount !== 'bakedOASHand', 'mount=' + endCard.mount);
// READ SCENE 2 TO ITS FINAL BEAT with the reader's own control, and let PRODUCTION offer the hand.
// The previous version called dealFateCards({force:true}) itself, which proves the mount resolves
// and nothing else: a reader who never reaches the last beat is never offered a hand at all.
// READ SCENE 2 WITH THE CONTROLS _wireStagedAdvance BINDS: #stagedNextBtn (click) and
// #stagedBeatReader (tap anywhere except .staged-next-btn / .staged-prev-btn / .staged-micro-opt /
// .staged-decision-gate). Clicking coordinates on the illustration proved nothing about reaching
// the last beat. currentBeatIdx, any micro-decision and any gate are observed as we go, and a
// refusal is captured verbatim rather than retried blindly.
const reading = [];
for (let i = 0; i < 40; i++) {
  const loading = await page.evaluate(() => {
    const e = document.getElementById('gnSceneLoading');
    return !!(e && e.getClientRects().length > 0);
  });
  if (!loading) { reading.push('scene built after ' + i + 's'); break; }
  await page.waitForTimeout(1000);
}
let dealt = { mount: null, count: 0, onScreen: 0, atEnd: false };
let lastState = null;
for (let i = 0; i < 60; i++) {
  const st = await page.evaluate(() => {
    const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
    const act = window.state._stagedActive || null;
    const beats = act && Array.isArray(act.beats) ? act.beats.length
                : (act && act.plan && Array.isArray(act.plan.beats) ? act.plan.beats.length : null);
    const m = window._activeCardMount();
    const cards = m ? Array.from(m.querySelectorAll('.fate-card, [data-card]')) : [];
    const nb = document.getElementById('stagedNextBtn');
    return {
      beatIdx: act && typeof act.currentBeatIdx === 'number' ? act.currentBeatIdx : null,
      beats: beats,
      nextBtn: v('stagedNextBtn'), nextDisabled: !!(nb && nb.disabled),
      beatReader: v('stagedBeatReader'),
      micro: Array.from(document.querySelectorAll('.staged-micro-opt'))
        .filter(x => x.getClientRects().length > 0).length,
      gate: Array.from(document.querySelectorAll('.staged-decision-gate'))
        .filter(x => x.getClientRects().length > 0
          && (x.textContent || '').trim().length > 0).length,
      mount: m ? m.id : null, count: cards.length,
      onScreen: cards.filter(c => c.getClientRects().length > 0).length
    };
  });
  lastState = st;
  if (st.onScreen > 0) { dealt = { ...st, atEnd: true };
    reading.push('hand offered at beat ' + st.beatIdx + '/' + st.beats); break; }
  // A micro-decision or a gate is its own offered control — take it rather than advancing past it.
  if (st.micro > 0) {
    await page.click('.staged-micro-opt', { timeout: 6000 })
      .catch((e) => reading.push('micro-opt refused: ' + String(e.message).split('\n')[0].slice(0, 60)));
    reading.push('micro-decision at beat ' + st.beatIdx);
  } else if (st.gate > 0) {
    // A GATE IS AN OFFERED CONTROL. Describe it, then take whatever it actually offers.
    const g = await page.evaluate(() => {
      const el = document.querySelector('.staged-decision-gate');
      if (!el) return null;
      const opts = Array.from(el.querySelectorAll('button, [role=button], .staged-gate-opt, a'))
        .filter(x => x.getClientRects().length > 0)
        .map(x => ({ id: x.id || null, cls: (x.className || '').toString().slice(0, 40),
                     txt: (x.textContent || '').trim().slice(0, 40) }));
      return { text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120), opts };
    });
    reading.push('gate at beat ' + st.beatIdx + ': ' + JSON.stringify(g && g.opts));
    if (g && g.opts.length) {
      await page.click('.staged-decision-gate button, .staged-decision-gate [role=button], '
        + '.staged-decision-gate .staged-gate-opt', { timeout: 6000 })
        .catch((e) => reading.push('gate option refused: ' + String(e.message).split('\n')[0].slice(0, 60)));
    } else {
      reading.push('GATE WITH NO OFFERED OPTION: ' + JSON.stringify(g && g.text));
      dealt = { ...st }; break;
    }
  } else if (st.nextBtn && !st.nextDisabled) {
    await page.click('#stagedNextBtn', { timeout: 6000 })
      .catch((e) => reading.push('#stagedNextBtn refused at beat ' + st.beatIdx + ': '
        + String(e.message).split('\n')[0].slice(0, 70)));
  } else if (st.beatReader) {
    await page.click('#stagedBeatReader', { timeout: 6000 })
      .catch((e) => reading.push('#stagedBeatReader refused at beat ' + st.beatIdx + ': '
        + String(e.message).split('\n')[0].slice(0, 70)));
  } else {
    reading.push('NEITHER CONTROL IS ON SCREEN at beat ' + st.beatIdx + '/' + st.beats
      + ' (nextBtn=' + st.nextBtn + ' disabled=' + st.nextDisabled + ' beatReader=' + st.beatReader + ')');
    dealt = { ...st }; break;
  }
  await page.waitForTimeout(700);
}
console.log('   reading scene 2: ' + reading.slice(0, 6).join(' | '));
console.log('   final beat state: ' + JSON.stringify(lastState));
t('Scene 2 could be READ to the point where a hand is offered', dealt.atEnd === true,
  JSON.stringify(dealt));
t('PRODUCTION offered the hand — it was not force-dealt', dealt.onScreen === 5,
  'onScreen=' + dealt.onScreen + ' count=' + dealt.count);
t('and it offered it in the reader\'s own mount', !!dealt.mount && dealt.mount !== 'bakedOASHand',
  'mount=' + dealt.mount);
if (dealt.onScreen === 5) {
  const inputsBefore = await page.evaluate(() => { const i = window._getActiveTurnInputs();
    return { a: i.actInput.value, d: i.diaInput.value }; });
  await page.click('#' + dealt.mount + ' .fate-card, #' + dealt.mount + ' [data-card]', { timeout: 8000 });
  let f2 = inputsBefore;
  for (let i = 0; i < 20; i++) {
    f2 = await page.evaluate(() => { const i2 = window._getActiveTurnInputs();
      return { a: i2.actInput.value, d: i2.diaInput.value }; });
    if (f2.a !== inputsBefore.a || f2.d !== inputsBefore.d) break;
    await page.waitForTimeout(1000);
  }
  t('THE SCENE-END CARD FILLS THE READER\'S SAY/DO',
    f2.a !== inputsBefore.a || f2.d !== inputsBefore.d,
    JSON.stringify({ before: inputsBefore, after: { a: (f2.a||'').slice(0,50), d: (f2.d||'').slice(0,50) } }));
}
await browser.close();
console.log('\nstages: ' + JSON.stringify(stages));
console.log('ALL entrance and branch interaction above used trusted pointer clicks and real typing;');
console.log('reader NAVIGATION to the page was setup via production reader functions.');
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
process.exit(fail ? 1 : 0);
