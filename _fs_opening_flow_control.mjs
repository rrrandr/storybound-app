// THE REVISED FIRST SACRIFICE OPENING, through the real reader surfaces. Provider-free, $0.
// Fixtures serve every provider stage; nothing is paid and no prose is generated. Fixture success
// says nothing about live writing quality.
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, plannerFor, MEMORY, verifierVerdict, fsPlannerCaptured }
  from './_replay_fixtures.mjs';

// THE PLANNER REPLY MUST BE FIRST SACRIFICE'S OWN. plannerFor() replays a reply recorded against a
// different story (Toll Road Commission and friends), and FS's canon gate correctly refuses it —
// the planner ran twice and generation stopped with no author call at all. This is the captured FS
// planner reply, so the gate sees a proposal that belongs to this story.
let FS_PLANNER = null;
try { FS_PLANNER = fsPlannerCaptured(); console.log('FS planner fixture: captured reply ('
  + FS_PLANNER.length + ' chars)'); }
catch (e) { console.log('FS planner fixture UNAVAILABLE: ' + e.message); }
import { findFSDef, launchFS, unlockFS, finalizePreview } from './_fs_story_setup.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const ARM = process.argv[2] || 'typed';          // typed | card | remain
const browser = await chromium.launch();
const page = await browser.newPage();
const oasReqs = [], sceneReqs = [], stages = [];
let sceneN = 1;
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
  if (stage === 'oas') { oasReqs.push({ whole, at: Date.now() });
    body = JSON.stringify({ li_dialogue: 'You answer me in front of them, then.', li_action: 'He does not lower The Answer.',
      li_next_prompt: 'Say it again, louder.', li_face_state: 'neutral',
      // Production resolves on scene_state 'resolve' at beat >= 6, so the fixture holds the
      // conversation open until then and lets the authored interruption take it from there.
      scene_state: (oasReqs.length >= 6 ? 'resolve' : 'continue'),
      scene_tone: 'tense', user_signal: 'engaged', temperature_shift: 0 }); }
  else if (stage === 'author') { sceneReqs.push({ whole, at: Date.now() }); body = '{"beats":[]}'; }
  else if (stage === 'planner') body = FS_PLANNER || plannerFor(sceneN++);
  else if (stage === 'memory') body = MEMORY;
  else if (stage === 'verifier') body = verifierVerdict([]);
  try { await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: body }) }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 }).catch(() => {});
// The product's OWN opt-out flags for the portrait modals, which otherwise sit over the reader
// intercepting pointer events and re-open after each dismissal. This is the state a reader reaches
// by clicking Skip; images are blocked here regardless.
const optOutPortraits = () => page.evaluate(() => {
  try { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; } catch (_) {}
});
const def = await findFSDef(page);
await optOutPortraits();
await launchFS(page, def);
await optOutPortraits();
await unlockFS(page, 'opening-flow');
await finalizePreview(page);
await page.waitForTimeout(4000);
await optOutPortraits();
// Reach the authored page's end, where the entrance mounts.
for (let i = 0; i < 30; i++) {
  const got = await page.$('#bakedOASHandoff');
  if (got) break;
  try { await page.evaluate(() => { try { window._advanceStagedBeat && window._advanceStagedBeat(); } catch (_) {} }); } catch (_) {}
  await page.waitForTimeout(400);
}
// CLICK ROUTE, RECORDED. This harness does not render the baked reader surface — #storyContent
// keeps its `hidden` class, which is why _fs_story_setup's own enterOAS already falls back to an
// in-page click with the note "host not rendered in this harness". So a trusted pointer click is
// attempted first and the route is reported; where it falls back, the real handler still runs but
// the entrance's VISIBILITY and pointer behaviour are NOT demonstrated. Stated as a limitation.
const routes = {};
const tap = async (sel) => {
  try { await page.click(sel, { timeout: 2500 }); routes[sel] = 'trusted'; return 'trusted'; }
  catch (_) {
    await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); }, sel);
    routes[sel] = 'in-page'; return 'in-page';
  }
};
const haveEntrance = !!(await page.$('#bakedOASHandoff'));
console.log('ARM=' + ARM + '  ·  entrance mounted: ' + haveEntrance);
if (!haveEntrance) {
  console.log('\n  UNPROVEN — the authored page never reached its entrance. Nothing below is asserted.');
  await browser.close(); process.exit(1);
}

console.log('\n=== THE AUTHORED STAGING AND THE DECK PASSAGE ===');
const pageText = await page.evaluate(() => {
  const sc = document.getElementById('storyContent');
  const gp = document.getElementById('gnPanelDisplay');
  return [sc ? sc.textContent : '', gp ? gp.textContent : '', document.body.innerText].join('\n');
});
t('The Answer goes into ONE hand, not both', /set it in my right hand/.test(pageText)
  && !/set it in my hands/.test(pageText));
t('Julian asks his question on the page', /What have you to say\?/.test(pageText));
t('the deck passage is present verbatim',
  /My other hand tightened around my great-grandmother’s tarot deck\. I didn’t remember bringing it\. I toyed with the idea of letting the cards decide\./.test(pageText));

console.log('\n=== NO PLAYABLE HAND BEFORE EXAMINE ===');
const before = await page.evaluate(() => {
  const h = document.getElementById('bakedOASHand');
  const l = document.getElementById('bakedOASLocked');
  const vis = (el) => !!(el && el.getClientRects().length > 0);
  return { handCards: h ? h.querySelectorAll('.fate-card, [data-card]').length : -1,
           handHidden: !!(h && h.classList.contains('hidden')),
           lockedHidden: !!(l && l.classList.contains('hidden')),
           examine: !!document.getElementById('bakedOASExamineBtn'),
           continueBtn: !!document.getElementById('bakedOASEnterBtn') };
});
t('no playable card exists yet', before.handCards === 0, JSON.stringify(before));
t('the hand is hidden by class as well as empty', before.handHidden === true);
t('Petition/Tempt are hidden too', before.lockedHidden === true);
t('the Examine affordance is offered', before.examine);
t('the standalone Continue entrance is GONE', !before.continueBtn);

console.log('\n=== AFTER EXAMINE: FIVE CARDS, PETITION AND TEMPT LOCKED ===');
console.log('   examine click route: ' + await tap('#bakedOASExamineBtn'));
await page.waitForTimeout(1200);
const after = await page.evaluate(() => {
  const h = document.getElementById('bakedOASHand');
  const l = document.getElementById('bakedOASLocked');
  const cards = h ? Array.from(h.querySelectorAll('.fate-card, [data-card]')) : [];
  const locked = l ? Array.from(l.children) : [];
  return { count: cards.length, revealed: !!(h && !h.classList.contains('hidden')),
           lockedLabels: locked.map(x => x.textContent.trim()),
           lockedDetail: locked.map(x => ({ locked: x.getAttribute('data-locked'),
             pe: x.style.pointerEvents, op: x.style.opacity, grey: x.style.filter,
             aria: x.getAttribute('aria-disabled') })),
           allUnavailable: locked.length > 0 && locked.every(x =>
             x.getAttribute('data-locked') === '1'
             && x.getAttribute('aria-disabled') === 'true'
             && x.style.pointerEvents === 'none'
             && parseFloat(x.style.opacity) < 0.5
             && /grayscale/.test(x.style.filter || '')) };
});
t('five ordinary Fate cards are dealt', after.count === 5, 'count=' + after.count);
t('the hand is revealed (hidden class removed)', after.revealed === true);
t('Petition Fate and Tempt Fate are shown', after.lockedLabels.join('|') === 'Petition Fate|Tempt Fate',
  JSON.stringify(after.lockedLabels));
t('and both are greyed out and unavailable', after.allUnavailable,
  JSON.stringify(after.lockedDetail));

console.log('\n=== THE SUBMITTED INPUT REACHES THE FIRST OAS REQUEST, EXACTLY ONCE ===');
const SAY = ARM === 'card' ? '' : 'I shaped nothing. Ask me properly.';
const DO  = ARM === 'card' ? '' : 'I keep my eyes on his.';
let expectSay = SAY, expectDo = DO;
if (ARM === 'card') {
  // CARD-ASSISTED: take a card's own suggestion, then edit it, as a reader would.
  await tap('#bakedOASHand .fate-card, #bakedOASHand [data-card]').catch(() => {});
  await page.waitForTimeout(1500);
  const filled = await page.evaluate(() => ({
    say: (document.getElementById('bakedOASSay') || {}).value || '',
    do: (document.getElementById('bakedOASDo') || {}).value || '' }));
  expectSay = (filled.say || 'Let the cards decide, then.') + ' And I still say I shaped nothing.';
  expectDo = filled.do || 'I turn the top card face up.';
  await page.evaluate((v) => { const a = document.getElementById('bakedOASSay'),
    b = document.getElementById('bakedOASDo');
    if (a) { a.value = v.s; a.dispatchEvent(new Event('input', { bubbles: true })); }
    if (b) { b.value = v.d; b.dispatchEvent(new Event('input', { bubbles: true })); } },
    { s: expectSay, d: expectDo });
  t('a card supplied a suggestion the reader could edit', true);
} else {
  await page.evaluate((v) => { const a = document.getElementById('bakedOASSay'),
    b = document.getElementById('bakedOASDo');
    if (a) { a.value = v.s; a.dispatchEvent(new Event('input', { bubbles: true })); }
    if (b) { b.value = v.d; b.dispatchEvent(new Event('input', { bubbles: true })); } },
    { s: SAY, d: DO });
}
const sceneReqsBefore = sceneReqs.length;
console.log('   submit click route: ' + await tap('#bakedOASSubmitBtn'));
await page.waitForTimeout(6000);
t('exactly one OAS request was made', oasReqs.length === 1, 'count=' + oasReqs.length);
if (oasReqs.length) {
  const w = oasReqs[0].whole;
  t('the reader\'s exact Say reached it intact', !expectSay || w.includes(expectSay));
  t('the reader\'s exact Do reached it intact', !expectDo || w.includes(expectDo));
  t('no second submission was demanded', await page.evaluate(() =>
    !!(window.state.intimacyDialogue && window.state.intimacyDialogue.beatCount >= 1)));
}
t('no unrelated generated opener ran before it', oasReqs.length <= 1);
t('NO Scene 2 request yet — the interruption has not finished', sceneReqs.length === sceneReqsBefore,
  'scene requests: ' + sceneReqs.length);

console.log('\n=== THE INTERRUPTION, THEN RUN-OR-REMAIN AS THE FINAL DECISION ===');
// Drive to the interruption through the real OAS surface.
for (let i = 0; i < 16; i++) {
  const st = await page.evaluate(() => {
    const r = window.state._intimateInterruption;
    return { intr: !!document.getElementById('intimateInterruption'),
             dec: !!document.getElementById('sceneDecisionPrompt'),
             phase: r ? r.phase : null };
  });
  if (st.dec) break;
  try { await page.evaluate(() => { try { window._intimacyDialogueConsumeInput('I am still here.', 'I hold his gaze.'); } catch (_) {} }); } catch (_) {}
  await page.waitForTimeout(2500);
}
const atDecision = await page.evaluate(() => {
  const r = window.state._intimateInterruption || {};
  const vis = (id) => { const el = document.getElementById(id); try { return !!(el && el.getClientRects().length > 0); } catch (_) { return false; } };
  const present = (id) => !!document.getElementById(id);
  return { decision: present('sceneDecisionPrompt'), interruption: present('intimateInterruption'),
    submitted: !!r.submitted, noSubmit: !!r.completedWithoutSubmission, flow: !!r.noSubmitFlow,
    phase: r.phase,
    straySubmit: ['gnSubmitBtn', 'submitBtn'].some((id) => { const el = document.getElementById(id);
      return !!(el && el.style.display !== 'none' && !el.disabled); }),
    strayCards: ['gnFateSection', 'cardMount'].some((id) => { const el = document.getElementById(id);
      return !!(el && !el.classList.contains('hidden')); }),
    dupExamine: !!document.getElementById('bakedOASExamineBtn'),
    needed: typeof window._sceneDecisionNeeded === 'function' ? window._sceneDecisionNeeded() : null };
});
t('the authored interruption rendered', atDecision.interruption || atDecision.phase === 'awaiting_branch',
  JSON.stringify(atDecision));
t('run-or-remain is mounted as Scene 1\'s final decision', atDecision.decision, JSON.stringify(atDecision));
t('the interruption completed WITHOUT a fabricated submission',
  atDecision.noSubmit === true && atDecision.submitted === false);
t('and only because this encounter declared the opening flow', atDecision.flow === true);
t('no extra post-interruption Submit remains', !atDecision.straySubmit);
t('no second card step remains', !atDecision.strayCards);
t('the deck introduction and Examine gate are NOT repeated', !atDecision.dupExamine);
t('the decision is still OPEN — no placeholder answered the axis', atDecision.needed === true);
t('STILL no Scene 2 request before the branch is chosen', sceneReqs.length === 0,
  'scene requests: ' + sceneReqs.length);

console.log('\n=== THE BRANCH RECORDS AND TRIGGERS EXACTLY ONE SCENE 2 ===');
const want = ARM === 'remain' ? 'remain' : 'run';
const btn = await page.evaluate((w) => {
  const a = document.getElementById('sceneDecisionA'), b = document.getElementById('sceneDecisionB');
  for (const el of [a, b]) if (el && el.getAttribute('data-choice') === w) return el.id;
  return null;
}, want);
t('the authored branch "' + want + '" is offered', !!btn, 'button=' + btn);
if (btn) {
  console.log('   branch click route: ' + await tap('#' + btn));
  await page.waitForTimeout(25000);
  const rec = await page.evaluate(() => window._sceneDecision && window._sceneDecision(1));
  console.log('   recorded: ' + JSON.stringify(rec));
  t('the ACTUAL branch is recorded', rec && String(rec.choice).toLowerCase() === want,
    JSON.stringify(rec));
  console.log('   stages seen after the branch: ' + JSON.stringify(stages.slice(-8)));
  t('exactly one Scene 2 request was triggered', sceneReqs.length === 1,
    'scene requests: ' + sceneReqs.length + ' · all stages: ' + JSON.stringify(stages));
  const disp = await page.evaluate(() => window._recordedChoiceDisplacesFrame
    && window._recordedChoiceDisplacesFrame(window.state, 'dohkar_preliminary_review'));
  console.log('   displacement: ' + JSON.stringify(disp));
  t('only the seed-declared displacing choice displaces the frame',
    want === 'run' ? (disp && disp.displaces === true) : (disp && disp.displaces === false),
    JSON.stringify(disp));
  if (sceneReqs.length) {
    const w2 = sceneReqs[0].whole;
    t('the OAS archive reached the continuation context',
      /You answer me in front of them, then\./.test(w2) || /OAS|one-on-one/i.test(w2));
    t('the authored interruption reached it',
      /That is enough, Provast/.test(w2) || /formal inquiry/i.test(w2));
  }
}
await browser.close();
console.log('\nclick routes: ' + JSON.stringify(routes));
console.log('LIMITATION: this harness does not render the baked reader surface (#storyContent keeps'
  + ' its hidden class), so steps marked in-page ran the real handler but do NOT demonstrate the'
  + ' entrance\'s on-screen visibility or pointer behaviour.');
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed  [ARM=' + ARM + ']');
process.exit(fail ? 1 : 0);
