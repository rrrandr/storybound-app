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
await page.route('**/api/**', async (route) => {
  const req = route.request();
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
});
// SETUP: reach the page the entrance lives on, through production's own reader navigation.
// showReaderPage re-adds frontispiece-active, whose CSS hides every sibling of the map, so the
// class is cleared LAST — otherwise the entrance is display:none and nothing can be clicked.
const toReader = async () => {
  await page.evaluate(() => {
    try { if (typeof window.dismissTitlePage === 'function') window.dismissTitlePage(); } catch (_) {}
    try { if (typeof window.showReaderPage === 'function') window.showReaderPage(2); } catch (_) {}
    const bc = document.getElementById('bookCoverPage'); if (bc) bc.classList.add('hidden');
    const bo = document.getElementById('bookObject'); if (bo) bo.classList.add('hidden');
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const sc = document.getElementById('storyContent');
    if (sc) { sc.classList.remove('hidden'); sc.classList.remove('frontispiece-active'); }
    window._frontispieceActive = false;
    const fp = document.getElementById('fatelandsFrontispiece'); if (fp) fp.classList.add('hidden');
  });
  await page.waitForTimeout(600);
};

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
  // A REAL card click must populate the VISIBLE fields. No substitute text, and no assertion
  // passes unless the card itself filled something.
  const emptyBefore = await page.evaluate(() => ({
    say: document.getElementById('bakedOASSay').value, do: document.getElementById('bakedOASDo').value }));
  t('the fields start empty', !emptyBefore.say && !emptyBefore.do, JSON.stringify(emptyBefore));
  await page.click('#bakedOASHand .fate-card, #bakedOASHand [data-card]', { timeout: 8000 });
  let filled = { say: '', do: '' };
  for (let i = 0; i < 20; i++) {
    filled = await page.evaluate(() => ({
      say: document.getElementById('bakedOASSay').value,
      do: document.getElementById('bakedOASDo').value }));
    if (filled.say || filled.do) break;
    await page.waitForTimeout(1000);
  }
  console.log('   card filled: ' + JSON.stringify({ say: filled.say.slice(0, 60), do: filled.do.slice(0, 60) }));
  t('THE CARD POPULATED THE ENTRANCE\'S OWN VISIBLE FIELDS',
    !!(filled.say || filled.do), JSON.stringify(filled));
  if (!(filled.say || filled.do)) {
    console.log('\n  the card did not fill the fields — the edit-and-submit path cannot be demonstrated');
    await browser.close(); process.exit(1);
  }
  // Now EDIT what the card suggested, by typing, as a reader would.
  const addition = ' And I still say I shaped nothing.';
  await page.click('#bakedOASSay');
  await page.keyboard.press('End');
  await page.keyboard.type(addition, { delay: 8 });
  const edited = await page.evaluate(() => document.getElementById('bakedOASSay').value);
  t('and the reader could EDIT it by typing', edited.endsWith(addition) && edited.length > addition.length,
    JSON.stringify(edited.slice(0, 80)));
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
  console.log('\n=== CANCEL THE GATE, THEN RETRY ===');
  // Force the gate to hold the submission by re-locking Genesis, then cancel it.
  await page.evaluate(() => { try { window.state._bakedGenesisUnlocked = false; } catch (_) {} });
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(2500);
  const held = await page.evaluate(() => ({
    dispatched: document.getElementById('bakedOASSubmitBtn').getAttribute('data-dispatched'),
    say: document.getElementById('bakedOASSay').value,
    oasOpen: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active) }));
  console.log('   after the gate held: ' + JSON.stringify({ ...held, say: held.say.slice(0, 40) }));
  t('the gate held the submission — no OAS opened', held.oasOpen === false);
  t('SUBMIT IS NOT LATCHED, so it can be retried', held.dispatched === null,
    'data-dispatched=' + held.dispatched);
  t('and the reader\'s answer is still in the field', held.say === expectSay);
  // Dismiss whatever modal the gate raised, unlock, and retry with a real click.
  await page.evaluate(() => {
    ['bakedUnlockModal', 'starterUnlockModal', 'payModal', 'genesisConfirmModal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('show'); el.classList.add('hidden'); }
    });
    try { window.state._bakedGenesisUnlocked = true; } catch (_) {}
  });
  await page.waitForTimeout(500);
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(6000);
  t('the RETRY dispatched exactly one OAS request', oasReqs.length === 1, 'count=' + oasReqs.length);
  t('with the preserved answer intact', oasReqs.length === 1 && oasReqs[0].whole.includes(expectSay));
  // A second click must not dispatch again.
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
  // Re-open the Book and let production put the words back.
  await optOut();
  const def2 = await findFSDef(page);
  await launchFS(page, def2); await optOut();
  await unlockFS(page, 'opening-flow'); await finalizePreview(page);
  await page.waitForTimeout(3000); await optOut();
  await toReader();
  // SIMULATED COMPLETED SIGN-IN. _restoreBakedEntryAfterAuth deliberately keeps the marker and
  // does nothing while still logged out ("the reader may have cancelled the sign-in"), so the
  // return leg needs a signed-in session to exercise at all. state.profileId is exactly what
  // production's own _isSignedIn reads; no production code is altered. Auth RESPONSES are
  // simulated here in the same way entitlement and payment responses are.
  const signedIn = await page.evaluate(() => {
    try { window.state.profileId = 'harness-profile-0001'; } catch (_) {}
    return !!(window.state && window.state.profileId);
  });
  console.log('   simulated signed-in session: ' + signedIn);
  await page.evaluate(() => { try { window._restoreBakedEntryAfterAuth(); } catch (_) {} });
  await page.waitForTimeout(2500);
  const restored = await page.evaluate(() => {
    const a = document.getElementById('bakedOASSay'), b = document.getElementById('bakedOASDo');
    return { say: a ? a.value : null, do: b ? b.value : null,
             onScreen: !!(a && a.getClientRects().length > 0) };
  });
  console.log('   restored: ' + JSON.stringify({ say: (restored.say || '').slice(0, 50) }));
  t('THE ANSWER IS BACK IN THE ENTRANCE after authentication', restored.say === expectSay,
    JSON.stringify(restored));
  t('the Do field came back too', restored.do === expectDo, JSON.stringify(restored.do));
  t('and it is on screen, where the reader left it', restored.onScreen === true);
  t('nothing was auto-submitted', oasReqs.length === 0, 'oas requests: ' + oasReqs.length);
  // Re-opening the Book re-arms the Genesis gate, which is correct: the reader has not paid yet.
  // Prove that FIRST — the gate still holds and the answer still survives — then unlock and submit.
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(3000);
  const h2 = await page.evaluate(() => ({
    say: document.getElementById('bakedOASSay').value,
    dispatched: document.getElementById('bakedOASSubmitBtn').getAttribute('data-dispatched') }));
  t('the entitlement gate still applies after the return', oasReqs.length === 0,
    'oas requests: ' + oasReqs.length);
  t('and the restored answer is STILL in the field, unlatched', h2.say === expectSay && h2.dispatched === null,
    JSON.stringify({ say: h2.say.slice(0, 40), dispatched: h2.dispatched }));
  await page.evaluate(() => {
    ['bakedUnlockModal', 'starterUnlockModal', 'payModal', 'genesisConfirmModal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('show'); el.classList.add('hidden'); }
    });
    try { window.state._bakedGenesisUnlocked = true; } catch (_) {}
  });
  await page.waitForTimeout(600);
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(7000);
  t('submitting after the unlock sends the restored answer, once',
    oasReqs.length === 1 && oasReqs[0].whole.includes(expectSay), 'count=' + oasReqs.length);
} else {
  console.log('\n=== SUBMIT ===');
  await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
  await page.waitForTimeout(6000);
  t('exactly one OAS request was made', oasReqs.length === 1, 'count=' + oasReqs.length);
  t('the reader\'s exact Say reached it intact', oasReqs.length === 1 && oasReqs[0].whole.includes(expectSay));
  if (expectDo) t('the reader\'s exact Do reached it intact',
    oasReqs.length === 1 && oasReqs[0].whole.includes(expectDo));
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
const dealt = await page.evaluate(async () => {
  try { window.dealFateCards({ force: true }); } catch (_) {}
  await new Promise(r => setTimeout(r, 1500));
  const m = window._activeCardMount();
  const cards = m ? Array.from(m.querySelectorAll('.fate-card, [data-card]')) : [];
  return { mount: m ? m.id : null, count: cards.length,
           onScreen: cards.filter(c => c.getClientRects().length > 0).length };
});
console.log('   scene-end deal: ' + JSON.stringify(dealt));
t('a scene-end hand deals into the reader\'s mount', dealt.count === 5, JSON.stringify(dealt));
t('and its cards are on screen', dealt.onScreen === 5, 'onScreen=' + dealt.onScreen);
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
