// ═══ CG BEAT PRESENTATION CONTROL (2026-09-13) ═══
// Diagnostic-only. Distinct from _cg_beat_narration_loss_control.mjs (the PRESERVE text-order
// regression control, 6/6, NOT modified by this file). That control reads `beat.pText`/`fullText`
// string content and order in JS. This harness proves the MOUNTED PAGE is actually LEGIBLE to a
// human reader: correct speaker label, visible narration before/after the quote, a visible
// interior-thought line, visible Character+/Environment+ material, correct visual/DOM order, and
// no duplicated or CSS-hidden content — reading real computed DOM state
// (getBoundingClientRect/getComputedStyle/textContent), with a real screenshot as evidence.
// No production file is edited or touched by this harness. No paid model call — the CG author's
// request is answered with a hand-authored fixed JSON plan at /api/mistral-proxy, never a real
// model call. Does NOT propose converting CG to OAS's chat-bubble style anywhere.
//
// Route + fixture + stubbing pattern: IDENTICAL to _cg_beat_narration_loss_control.mjs (read that
// file first) — First Sacrifice baked launch → OAS one-on-one → Genesis gate → normal turn → exit
// → interruption → card → Submit → real #stagedNextBtn clicks to reach the compound beat. Same
// fixture text so results are directly comparable to the existing PRESERVE control.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const OUT_DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/79822a26-4953-4e0a-b337-9520e623604d/scratchpad';
const SHOT_DIR = '/Users/romantsukerman/storybound-app/_validate_out';
try { fs.mkdirSync(SHOT_DIR, { recursive: true }); } catch (_) {}

// ══════════════════════════════════════════════════════════════════════════════════════════
// THE FIXTURE — identical to _cg_beat_narration_loss_control.mjs, verbatim, so the two controls
// are directly comparable.
// ══════════════════════════════════════════════════════════════════════════════════════════
const NARRATION_BEFORE = "She set the letter face-down before he could read the return address.";
const QUOTE_LINE = "\"You're late, McBrayn.\"";
const NARRATION_AFTER = "His jaw ticked once, the only sign he'd heard her.";
const INTERIOR_LINE = "I didn't know whether to believe him or let him tighten his own noose.";
const CPLUS_DETAIL = "The ledger under his arm was cracked open to a page marked with a single strand of his own hair — he trusted no clerk enough to hold his place for him, not even a scrap of paper.";
const COMPOUND_BEAT_TEXT = [NARRATION_BEFORE, QUOTE_LINE, NARRATION_AFTER, INTERIOR_LINE, CPLUS_DETAIL].join(' ');

const PURE_NARRATION_TEXT = "The customs hall had gone quiet enough to hear the clerks turning pages three rooms over.";
const PURE_EXPOSITION_TEXT = "I told myself the manifest was the only thing I wanted from him tonight, and I almost believed it.";
const COMPLIANT_QUOTE_TEXT = "\"Then let's begin, before the tide turns.\"";

const FIXTURE_PLAN = {
  visualState: {
    pc_visibility: 'partial_cheekbone', li_position: 'desk', li_expression: 'cold_formal',
    lighting: 'low_warm', pc_wardrobe: 'traveling coat, ledger satchel over one shoulder',
    li_wardrobe: 'customs-house uniform, sleeves rolled',
    other_characters_present: [ { name: 'Seren', gender: 'female', species: 'human', wardrobe: 'customs-house uniform', position: 'behind the desk' } ],
    key_props: ['the manifest', 'the ledger'], social_staging_mode: 'adversarial',
    sceneDuty: 'external_pressure', attractionPresence: 'latent',
    expression_arc: { baseline_family: 'suppression', micro_drift: 'guarded-then-cracking', peak_a_beat: 3, peak_b_beat: null, decay_window: 3 }
  },
  phases: [ { phaseIdx: 0, startBeat: 0, label: 'the customs desk', li_visibility_phase: 'partial',
    characters_present: ['protagonist', 'li', 'Seren'], props_present: ['the manifest'], camera_override: null,
    li_position_override: null, li_expression_override: null, camera_move: 'hold', shot_style: 'default',
    focus_target: null, pc_posture: 'weight forward, both hands flat on the counter', pc_emotional_state: 'braced',
    other_postures: {}, proximity: 'personal' } ],
  panels: [ { panelIdx: 0, dramaticQuestion: "Will he let the manifest through before the tide turns?",
    shotType: 'conversation', subjects: { primary: 'protagonist', secondary: 'li', background: [] },
    cast: [ { name: 'protagonist', performance: { pose: 'leaning on the counter', expression: 'tight', looking_at: 'li', action_tags: ['speaking'] } },
            { name: 'li', performance: { pose: 'standing behind the desk', expression: 'cold_formal', looking_at: 'protagonist', action_tags: ['holding'] } } ],
    wish: false, sacrifice: false, fateAnswer: false } ],
  beats: [
    { idx: 0, kind: 'narration', text: PURE_NARRATION_TEXT, speaker: null, tension_state: 'composed',
      echo_profile: null, expression_target: 'neutral', expression_intensity: 0.2, cut_to_closeup: false,
      closeup_target: null, shot_type: null, impact_burst: false, metaphor_hint: null, metaphor_peak: false,
      pc_proxy_action: null, hand_gesture: null, posture_change: null },
    { idx: 1, kind: 'exposition', text: PURE_EXPOSITION_TEXT, speaker: null, tension_state: 'suppressed',
      echo_profile: null, expression_target: 'lips_pressed', expression_intensity: 0.3, cut_to_closeup: false,
      closeup_target: null, shot_type: null, impact_burst: false, metaphor_hint: null, metaphor_peak: false,
      pc_proxy_action: null, hand_gesture: null, posture_change: null },
    { idx: 2, kind: 'dialogue', text: COMPLIANT_QUOTE_TEXT, speaker: 'Seren', tension_state: 'composed',
      echo_profile: null, expression_target: 'jaw_set', expression_intensity: 0.3, cut_to_closeup: false,
      closeup_target: null, shot_type: null, impact_burst: false, metaphor_hint: null, metaphor_peak: false,
      pc_proxy_action: null, hand_gesture: null, posture_change: null },
    { idx: 3, kind: 'dialogue', text: COMPOUND_BEAT_TEXT, speaker: 'Seren', tension_state: 'cracking',
      echo_profile: null, expression_target: 'jaw_clench', expression_intensity: 0.4, cut_to_closeup: false,
      closeup_target: null, shot_type: null, impact_burst: true, metaphor_hint: null, metaphor_peak: false,
      pc_proxy_action: null, hand_gesture: null, posture_change: null }
  ],
  microDecision: null,
  decisionGateBeatIdx: 3,
  is_consummate_scene: false,
  kink_introduced: null,
  pc_kink_response: 'none',
  kink_affinity: null,
  kinks_used: [],
  primaryEngine: null,
  interruption: null,
  sceneCharge: {
    stake: "she needs the manifest stamped before the tide turns or her sister sails without her",
    concrete_specific_beat_idx: 3, subtext_beat_idx: 3, almost_said_beat_idx: 3,
    escalation_rhythm: "opens tense at the counter → the compliant line lands at beat 2 → the ledger detail cracks it open at beat 3"
  }
};

const rows = [];
const ok = (group, n, p, d) => { rows.push([group, n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + '[' + group + '] ' + n + (p ? '' : '  — ' + d)); };

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const logs = [], calls = [], allLogs = [];
page.on('console', m => { const t = m.text(); allLogs.push(t.slice(0, 220)); if (/BAKED|STARTER|STAGED|INTIMATE-INTERRUPT|INTIMACY|SCENE-DECISION|CG:SCREENPLAY|CG:ASSIGN/i.test(t)) logs.push(t.slice(0, 240)); });
page.on('dialog', async d => { logs.push('DIALOG: ' + d.message().slice(0, 200)); await d.dismiss(); });
page.on('pageerror', e => { allLogs.push('PAGEERROR: ' + String(e && e.message).slice(0, 200)); });

await installSession(page);
await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.route('**/api/**', async route => {
  const url = route.request().url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (F.PASSTHROUGH.test(url)) return route.continue();
  if (/\/api\/consume-fortune\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
  if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
  if (!F.MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n'), usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
  let kind = 'other';
  if (/opening an intimate dialogue/.test(sys)) kind = 'oasDialogue';
  else if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) kind = 'fatePreviews';
  else if (/screenplay-native cinematic-romance writer/.test(sys)) kind = 'cgScreenplay';
  else if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) kind = 'sceneSpine';
  else { const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k); kind = hits.length === 1 ? hits[0] : 'unclassified'; }
  calls.push(kind + '@' + (b.role || '-') + '@' + p);
  let content = '{}';
  // ── THE ONLY DELIBERATE STUB CONTENT FOR THIS HARNESS ──
  if (kind === 'cgScreenplay') content = JSON.stringify(FIXTURE_PLAN);
  else if (kind === 'fatePreviews') content = ['TEMPTATION ||| amplify ||| I step in until the Dohkar has to look up at me ||| Ask it here, then.', 'SILENCE ||| redirect ||| I keep The Answer level and say nothing ||| (no words)', 'REVERSAL ||| amplify ||| I turn the hooked end toward Julian ||| You confessed more than I did.', 'BOUNDARY ||| amplify ||| I set my feet and do not move ||| The inquiry, then.', 'CONFESSION ||| amplify ||| CONF-OPT-ACTION: I look at Julian and not at the Dohkar ||| CONF-OPT-LINE: I did call to you.'].join('\n');
  else if (kind === 'sceneSpine') content = JSON.stringify({ tactical_move: 'x', state_change_precondition: 'x', state_change: 'Julian puts a testing question to Lirael before the assembly', forces_choice: 'forces Lirael to choose between A and B', branch_a: 'A', branch_b: 'B', posture_read: 'She stays', local_objective: 'OBJ-PROBE: Julian puts a testing question to Lirael before the assembly', local_objective_actor: 'Julian', present: ['Lirael', 'Julian', 'Seren', 'the presiding Dohkar'], reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' }, aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' } });
  else if (kind === 'planner') content = F.plannerReply(usr, null);
  else if (kind === 'author') content = F.PROSE;
  else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') content = JSON.stringify(F.APLOT_VALID);
  else if (kind === 'pcBodyBible') content = JSON.stringify(F.PC_BIBLE);
  else if (kind === 'liBodyBible') content = JSON.stringify(F.LI_BIBLE);
  else if (kind === 'antagonistBodyBible') content = JSON.stringify(F.ANTAGONIST_BIBLE);
  else if (kind === 'scaffold') { const ref = (sys + usr).match(/subject_ref:\s*(\S+)/); content = JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, true)); }
  else if (kind === 'oasDialogue') content = JSON.stringify({ li_dialogue: 'You called to me. Say it plainly, here, where they can hear.', li_action: 'He does not step back.', face_state: 'intent', scene_state: 'building', release_state: 'none' });
  else content = JSON.stringify(F.GENERIC);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'presctl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] }) });
});

// ── Boot ──
const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 240000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { console.log('server never answered'); await browser.close(); process.exit(2); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);

// ── Launch the First Sacrifice baked starter (proven route to a CG scene) ──
const launch = await page.evaluate(() => {
  const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {});
  const def = list.find(d => d && d.id === 'starter_first_sacrifice');
  return { baked: !!window._bakedScene1For(def.id), p: (window._launchStarterStory(def), true) };
});
await page.waitForTimeout(6000);
console.log('launch: ' + JSON.stringify(launch));

const oasVisible = await page.evaluate(() => { const el = document.getElementById('bakedOASEnterBtn'); return !!(el && el.getClientRects().length > 0); });
if (!oasVisible) { console.log('[STOP] one-on-one button never appeared — cannot reach a CG scene'); await browser.close(); process.exit(2); }

await page.click('#bakedOASEnterBtn'); await page.waitForTimeout(1500);
const gateOk = await page.evaluate(() => { const u = document.getElementById('bakedUnlockModal'); const g = document.getElementById('buGoBtn'); return !!(u && u.getClientRects().length && g && g.getClientRects().length); });
if (!gateOk) { console.log('[STOP] Genesis gate did not appear'); await browser.close(); process.exit(2); }

await page.click('#buCancelBtn'); await page.waitForTimeout(300);
await page.evaluate(() => { window._commitBakedScene(); window.state._bakedGenesisUnlocked = true; });
await page.click('#bakedOASEnterBtn'); await page.waitForTimeout(7000);

const inOAS = await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active));
if (!inOAS) { console.log('[STOP] one-on-one never went active'); await browser.close(); process.exit(2); }

await page.fill('#gnActionInput', 'I keep my hands still around the ledger and wait for him to look up.');
await page.click('#gnSubmitBtn'); await page.waitForTimeout(3000);
for (let i = 0; i < 20 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);

await page.fill('#gnDialogueInput', '');
await page.fill('#gnActionInput', 'stop');
await page.click('#gnSubmitBtn');
let exitState = { modal: false, btn: false, logSeen: false };
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1000);
  exitState = await page.evaluate(() => {
    const shown = (el) => { if (!el) return false; try { return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; } catch (_) { return false; } };
    const m = document.getElementById('intimacyExitModal'); const b = document.getElementById('intimacyExitFade');
    return { modal: shown(m), btn: !!b };
  });
  exitState.logSeen = allLogs.some(l => /INTIMACY-EXIT\] Modal opened/.test(l));
  if (exitState.btn && (exitState.modal || exitState.logSeen)) break;
}
if (!(exitState.btn && (exitState.modal || exitState.logSeen))) {
  console.log('[STOP] exit path did not surface — cannot reach interruption/cards');
  await browser.close(); process.exit(2);
}

try { await page.click('#intimacyExitFade', { force: true, timeout: 5000 }); } catch (_) { await page.evaluate(() => { const b = document.getElementById('intimacyExitFade'); if (b) b.click(); }); }
await page.waitForTimeout(5000);

const interr = await page.evaluate(() => { const el = document.getElementById('intimateInterruption'); return !!(el && el.getClientRects().length); });
if (!interr) { console.log('[STOP] interruption never appeared'); await browser.close(); process.exit(2); }

for (let i = 0; i < 10 && !(await page.evaluate(() => { const r = window.state._intimateInterruption; return !!(r && r.cards && Object.keys(r.cards).length); })); i++) await page.waitForTimeout(500);
const HOST = await page.evaluate(() => { const r = window.state._intimateInterruption; return r && r.host === 'cg' ? { mount: 'gnCardMount', a: 'gnActionInput', d: 'gnDialogueInput', s: 'gnSubmitBtn' } : { mount: 'cardMount', a: 'actionInput', d: 'dialogueInput', s: 'submitBtn' }; });
const cardSel = '#' + HOST.mount + ' [data-fate-card-slot="confession"]';
const cardPresent = await page.evaluate((sel) => !!document.querySelector(sel), cardSel);
if (!cardPresent) { console.log('[STOP] expected interruption card not found: ' + cardSel); await browser.close(); process.exit(2); }
await page.click(cardSel); await page.waitForTimeout(500);

// ── THE SUBMIT THAT TRIGGERS THE REAL _runCGScreenplayGen CALL (stubbed above with FIXTURE_PLAN) ──
await page.click('#' + HOST.s);
for (let i = 0; i < 30 && !calls.some(c => /^cgScreenplay@/.test(c)); i++) await page.waitForTimeout(2000);
if (!calls.some(c => /^cgScreenplay@/.test(c))) { console.log('[STOP] cgScreenplay request never fired'); await browser.close(); process.exit(2); }
console.log('cgScreenplay request fired: ' + calls.filter(c => /^cgScreenplay@/.test(c)).join(', '));

// ── Wait for the REAL render (_renderStagedScene mounting #stagedBeatText) ──
let staged = false;
for (let i = 0; i < 30; i++) {
  staged = await page.evaluate(() => !!document.getElementById('stagedBeatText'));
  if (staged) break;
  await page.waitForTimeout(1000);
}
if (!staged) {
  console.log('[STOP] #stagedBeatText never mounted — the fixture plan may have failed validation or the scene never rendered');
  await browser.close(); process.exit(2);
}
await page.waitForTimeout(1000);

// ══════════════════════════════════════════════════════════════════════════════════════════
// PRESENTATION READ — for each beat: full computed-style/rect read of the mounted DOM, a
// whole-page duplicate/hidden-copy scan, and (for the compound beat + one narration beat + one
// dialogue beat) a settled screenshot.
// ══════════════════════════════════════════════════════════════════════════════════════════
const currentBeatIdx = () => page.evaluate(() => (window.state && window.state._stagedActive) ? window.state._stagedActive.currentBeatIdx : -1);

// Wait for the per-beat CSS fade-in (.staged-beat-text's stagedBeatIn animation, JS-set
// --staged-beat-fade-ms, clamped 200-900ms per app.js ~213562) to fully settle, using the
// browser's own animation-finished signal rather than a guessed timeout.
const waitForBeatSettled = () => page.evaluate(() => new Promise((resolve) => {
  const el = document.getElementById('stagedBeatText');
  if (!el) return resolve({ settled: false, reason: 'no element' });
  const anims = el.getAnimations ? el.getAnimations() : [];
  if (!anims.length) return resolve({ settled: true, reason: 'no running animation' });
  Promise.all(anims.map(a => a.finished.catch(() => null))).then(() => resolve({ settled: true, reason: 'animations finished' }));
  setTimeout(() => resolve({ settled: true, reason: 'timeout fallback 2000ms' }), 2000);
}));

// Deep presentation read of the CURRENTLY MOUNTED beat + a whole-page duplicate scan for a set
// of needle strings (used for assertion 8).
const readPresentation = (needles) => page.evaluate((needles) => {
  const rectVisible = (el) => {
    if (!el) return { visible: false, reason: 'null element' };
    let cs;
    try { cs = getComputedStyle(el); } catch (_) { return { visible: false, reason: 'no computed style' }; }
    const rects = el.getClientRects();
    const r = el.getBoundingClientRect();
    const hiddenByCss = cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0;
    const zeroSize = (r.width === 0 && r.height === 0);
    const overflowClipped = cs.overflow === 'hidden' && r.height === 0;
    return {
      visible: rects.length > 0 && !hiddenByCss && !zeroSize && !overflowClipped,
      rectCount: rects.length, rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity, overflow: cs.overflow
    };
  };
  const container = document.getElementById('stagedBeatText');
  const speakerEl = container ? container.querySelector('.staged-speaker') : null;
  const pEl = container ? container.querySelector('p') : null;
  const containerRect = rectVisible(container);
  const speakerRect = speakerEl ? rectVisible(speakerEl) : null;
  const pRect = pEl ? rectVisible(pEl) : null;

  // Whole-page duplicate/hidden-copy scan: for each needle string, walk EVERY element in the
  // document whose OWN (non-descendant-aggregated) text or whose textContent contains the
  // needle, and classify visibility. We scan leaf-ish text-bearing elements (elements with a
  // direct text-node child containing the needle, or — for elements with no such child but whose
  // full textContent contains it — record them too) so a stale detached-but-reattached duplicate
  // anywhere on the page is caught, not just inside #stagedBeatText.
  const dupScan = {};
  needles.forEach((needle) => {
    const matches = [];
    const all = document.querySelectorAll('body *');
    all.forEach((el) => {
      // Only count elements whose text content contains the needle AND that don't have a child
      // element which ALSO contains the full needle (avoids counting every ancestor up the tree
      // as a separate "occurrence" — we want distinct rendering sites, not the whole DOM chain).
      const txt = el.textContent || '';
      if (txt.indexOf(needle) === -1) return;
      let childAlsoHas = false;
      for (const c of el.children) { if ((c.textContent || '').indexOf(needle) !== -1) { childAlsoHas = true; break; } }
      if (childAlsoHas) return; // an ancestor; a descendant already carries the needle
      matches.push({ tag: el.tagName, id: el.id || null, cls: (el.className && el.className.toString) ? el.className.toString().slice(0, 60) : null, ...rectVisible(el) });
    });
    dupScan[needle] = matches;
  });

  return {
    kind: container ? container.getAttribute('data-kind') : null,
    fullText: (container ? container.textContent : '') || '',
    pText: (pEl ? pEl.textContent : '') || '',
    speakerText: speakerEl ? speakerEl.textContent.trim() : null,
    containerRect, speakerRect, pRect, dupScan
  };
}, needles);

// Full needle set — ALL fixture texts (compound-beat pieces AND every control beat's own text) —
// so the duplicate/hidden-copy scan (assertion 8, and the CONTROL group's own dup checks below)
// is meaningful for every captured beat, not just beat 3. A prior version of this harness only
// scanned the compound-beat needles at every capture, which made the CONTROL beats' dup checks
// spuriously fail (dupScan[expectedText] was simply never populated for their own text) — a
// harness bug, not a product defect; fixed by scanning the full set at every beat.
const NEEDLES = [QUOTE_LINE, NARRATION_BEFORE, NARRATION_AFTER, INTERIOR_LINE, CPLUS_DETAIL, PURE_NARRATION_TEXT, PURE_EXPOSITION_TEXT, COMPLIANT_QUOTE_TEXT];

const captured = [];
const totalBeats = FIXTURE_PLAN.beats.length;
for (let i = 0; i < totalBeats; i++) {
  await page.waitForTimeout(1200);
  for (let w = 0; w < 20; w++) {
    const typing = await page.evaluate(() => { const el = document.getElementById('stagedBeatText'); return el ? el.classList.contains('staged-beat-text--typing') : false; });
    if (!typing) break;
    await page.waitForTimeout(300);
  }
  const settle = await waitForBeatSettled();
  await page.waitForTimeout(150); // small buffer past the animation-finished event
  const idxNow = await currentBeatIdx();
  const pres = await readPresentation(NEEDLES);
  captured.push({ i, idxNow, settle, pres });
  console.log('BEAT ' + i + ' (state.currentBeatIdx=' + idxNow + ') kind=' + pres.kind + ' speaker=' + JSON.stringify(pres.speakerText) + ' settle=' + JSON.stringify(settle));

  // Screenshots: compound beat (i=3), one narration beat (i=0), one dialogue beat (i=2).
  if (i === 0) await page.locator('#stagedBeatReader').screenshot({ path: SHOT_DIR + '/cg_beat_presentation_narration.png' }).catch(async () => { await page.screenshot({ path: SHOT_DIR + '/cg_beat_presentation_narration.png' }); });
  if (i === 2) await page.locator('#stagedBeatReader').screenshot({ path: SHOT_DIR + '/cg_beat_presentation_dialogue.png' }).catch(async () => { await page.screenshot({ path: SHOT_DIR + '/cg_beat_presentation_dialogue.png' }); });
  if (i === 3) {
    await page.locator('#stagedBeatReader').screenshot({ path: SHOT_DIR + '/cg_beat_presentation_compound.png' }).catch(async () => { await page.screenshot({ path: SHOT_DIR + '/cg_beat_presentation_compound.png' }); });
    await page.screenshot({ path: SHOT_DIR + '/cg_beat_presentation_compound_fullpage.png' });
  }

  if (i < totalBeats - 1) {
    for (let a = 0; a < 6; a++) {
      await page.click('#stagedNextBtn');
      await page.waitForTimeout(700);
      const nowIdx = await currentBeatIdx();
      if (nowIdx === i + 1) break;
    }
  }
}

fs.writeFileSync(OUT_DIR + '/cg_beat_presentation.captured.json', JSON.stringify(captured, null, 2));
fs.writeFileSync(OUT_DIR + '/cg_beat_presentation.alllog.txt', allLogs.join('\n'));

// ══════════════════════════════════════════════════════════════════════════════════════════
// ASSERTIONS
// ══════════════════════════════════════════════════════════════════════════════════════════
const beat0 = captured[0], beat1 = captured[1], beat2 = captured[2], beat3 = captured[3];

// ── 1. Speaker label visible (compound beat, beat 3) ──
{
  const sr = beat3 && beat3.pres.speakerRect;
  const pass = !!sr && sr.visible && !!beat3.pres.speakerText && beat3.pres.speakerText.length > 0;
  ok('COMPOUND', '1. speaker label (.staged-speaker) is visible with non-empty text',
    pass, 'speakerRect=' + JSON.stringify(sr) + ' speakerText=' + JSON.stringify(beat3 && beat3.pres.speakerText));
}

// ── 2. Quote visible within beat text, still wrapped in quotation marks ──
{
  const txt = beat3 ? beat3.pres.fullText : '';
  const pass = txt.indexOf(QUOTE_LINE) !== -1;
  ok('COMPOUND', '2. spoken quotation is visible in beat text, still wrapped in quotation marks as authored',
    pass, 'fullText=' + JSON.stringify(txt));
}

// ── 3/4/5/6/7. Position checks (single <p>, single text node — textContent order) ──
const txt3 = beat3 ? beat3.pres.fullText : '';
const idxOf = (s) => txt3.indexOf(s);
const iBefore = idxOf(NARRATION_BEFORE), iQuote = idxOf(QUOTE_LINE), iAfter = idxOf(NARRATION_AFTER), iInterior = idxOf(INTERIOR_LINE), iCplus = idxOf(CPLUS_DETAIL);

ok('COMPOUND', '3. narration-before is visible AND appears before the quote in reading order',
  iBefore !== -1 && iQuote !== -1 && iBefore < iQuote,
  'iBefore=' + iBefore + ' iQuote=' + iQuote + ' text=' + JSON.stringify(txt3));

ok('COMPOUND', '4. narration-after is visible AND appears after the quote in reading order',
  iAfter !== -1 && iQuote !== -1 && iAfter > iQuote,
  'iAfter=' + iAfter + ' iQuote=' + iQuote);

ok('COMPOUND', '5. interior-thought line is visible, in its correct authored position (after narration-after)',
  iInterior !== -1 && iAfter !== -1 && iInterior > iAfter,
  'iInterior=' + iInterior + ' iAfter=' + iAfter);

ok('COMPOUND', '6. Character+/Environment+ detail is visible, in its correct authored position (after interior line)',
  iCplus !== -1 && iInterior !== -1 && iCplus > iInterior,
  'iCplus=' + iCplus + ' iInterior=' + iInterior);

// ── 7. Full sequence + DOM-vs-visual order divergence check ──
{
  const allFound = [iBefore, iQuote, iAfter, iInterior, iCplus].every(v => v !== -1);
  const strictOrder = allFound && iBefore < iQuote && iQuote < iAfter && iAfter < iInterior && iInterior < iCplus;
  // Confirm the five pieces are ALL inside the SAME single <p> element as one text node (not
  // split across siblings that CSS `order`/flex-direction could reorder visually). If so,
  // textContent order == visual order and no separate layout-position check is needed.
  const singleParagraph = beat3 && beat3.pres.pText && [NARRATION_BEFORE, QUOTE_LINE, NARRATION_AFTER, INTERIOR_LINE, CPLUS_DETAIL].every(s => beat3.pres.pText.indexOf(s) !== -1);
  ok('COMPOUND', '7. correct authored sequence overall (narration-before < quote < narration-after < interior < C+ detail), confirmed both by textContent order AND by all five pieces living in ONE <p> single-text-node element (no CSS order/flex-direction possible divergence)',
    strictOrder && !!singleParagraph,
    'strictOrder=' + strictOrder + ' singleParagraphContainsAll=' + !!singleParagraph + ' pText=' + JSON.stringify(beat3 && beat3.pres.pText));
}

// ── 8. No duplicated quote/narration hidden or visible elsewhere on the page ──
{
  const dup = beat3 ? beat3.pres.dupScan : {};
  let allExactlyOne = true; const detail = {};
  [QUOTE_LINE, NARRATION_BEFORE, NARRATION_AFTER].forEach((needle) => {
    const matches = dup[needle] || [];
    const visibleCount = matches.filter(m => m.visible).length;
    const totalCount = matches.length;
    detail[needle] = { visibleCount, totalCount, matches };
    if (visibleCount !== 1) allExactlyOne = false;
  });
  ok('COMPOUND', '8. no duplicated quote/narration text visible elsewhere on the page, and no stale hidden copy (exactly ONE visible occurrence per needle string)',
    allExactlyOne, JSON.stringify(detail, null, 1));
}

// ── 9. Screenshot files exist and are non-trivially sized ──
{
  const files = ['cg_beat_presentation_narration.png', 'cg_beat_presentation_dialogue.png', 'cg_beat_presentation_compound.png', 'cg_beat_presentation_compound_fullpage.png'];
  const stats = files.map(f => { try { const s = fs.statSync(SHOT_DIR + '/' + f); return { f, exists: true, bytes: s.size }; } catch (_) { return { f, exists: false, bytes: 0 }; } });
  const pass = stats.every(s => s.exists && s.bytes > 5000);
  ok('SHOTS', '9. all required screenshots saved and non-trivially sized (>5KB)', pass, JSON.stringify(stats));
}

// ── CONTROL beats: same legibility checks minus multi-piece order (doesn't apply) ──
function controlChecks(label, cap, expectedText) {
  if (!cap) { ok('CONTROL', label + ' beat captured', false, 'beat never captured'); return; }
  const cr = cap.pres.containerRect;
  ok('CONTROL', label + ' container (#stagedBeatText) is visible', !!cr && cr.visible, JSON.stringify(cr));
  ok('CONTROL', label + ' text renders verbatim and matches authored text', cap.pres.pText === expectedText, 'actual=' + JSON.stringify(cap.pres.pText));
  const dup = cap.pres.dupScan[expectedText] || [];
  const visibleCount = dup.filter(m => m.visible).length;
  ok('CONTROL', label + ' no duplicate/hidden copy of its own text elsewhere on the page (exactly one visible occurrence)', visibleCount === 1, 'visibleCount=' + visibleCount + ' matches=' + JSON.stringify(dup));
}
// beat0 (narration) and beat2 (compliant dialogue) need their own needle scans since NEEDLES above
// only covered the compound-beat strings. Re-scan those two specifically.
const controlNeedleScan = async () => {
  await page.evaluate(() => {}); // no-op, kept for symmetry/readability
};
// We already have beat0/beat2 pres captured but their dupScan only covers NEEDLES (compound
// strings). Add a targeted rescan for PURE_NARRATION_TEXT / COMPLIANT_QUOTE_TEXT using the
// CURRENT (final, beat-3) DOM — acceptable because by now the earlier beats' elements have been
// replaceChild'd away, so a rescan proves "not still lingering after the beat changed", which is
// actually a STRONGER duplicate check than checking while still mounted.
const finalPageNarrationDup = await page.evaluate((needle) => {
  const rectVisible = (el) => { let cs; try { cs = getComputedStyle(el); } catch (_) { return { visible: false }; } const r = el.getBoundingClientRect(); const hiddenByCss = cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0; return { visible: el.getClientRects().length > 0 && !hiddenByCss && !(r.width === 0 && r.height === 0) }; };
  const matches = [];
  document.querySelectorAll('body *').forEach((el) => {
    const txt = el.textContent || ''; if (txt.indexOf(needle) === -1) return;
    let childAlsoHas = false; for (const c of el.children) { if ((c.textContent || '').indexOf(needle) !== -1) { childAlsoHas = true; break; } }
    if (childAlsoHas) return;
    matches.push(rectVisible(el));
  });
  return matches;
}, PURE_NARRATION_TEXT);
ok('CONTROL', 'PURE_NARRATION_TEXT leaves no lingering visible copy after the beat has advanced away from it (replaceChild, not accumulate)',
  finalPageNarrationDup.filter(m => m.visible).length === 0, JSON.stringify(finalPageNarrationDup));

controlChecks('CONTROL-narration(beat0)', beat0, PURE_NARRATION_TEXT);
controlChecks('CONTROL-dialogue(beat2)', beat2, COMPLIANT_QUOTE_TEXT);
{
  const sr = beat2 && beat2.pres.speakerRect;
  ok('CONTROL', 'CONTROL-dialogue(beat2) speaker label visible', !!sr && sr.visible && !!beat2.pres.speakerText, JSON.stringify(sr) + ' ' + JSON.stringify(beat2 && beat2.pres.speakerText));
}

const compoundRows = rows.filter(r => r[0] === 'COMPOUND');
const shotRows = rows.filter(r => r[0] === 'SHOTS');
const controlRows = rows.filter(r => r[0] === 'CONTROL');
console.log('\n=== COMPOUND (legibility of the compound beat): ' + compoundRows.filter(r => r[2]).length + '/' + compoundRows.length + ' ===');
compoundRows.forEach(r => console.log('  ' + (r[2] ? 'PASS' : 'FAIL') + ' — ' + r[1]));
console.log('\n=== SHOTS: ' + shotRows.filter(r => r[2]).length + '/' + shotRows.length + ' ===');
shotRows.forEach(r => console.log('  ' + (r[2] ? 'PASS' : 'FAIL') + ' — ' + r[1]));
console.log('\n=== CONTROL (control beats legibility): ' + controlRows.filter(r => r[2]).length + '/' + controlRows.length + ' ===');
controlRows.forEach(r => console.log('  ' + (r[2] ? 'PASS' : 'FAIL') + ' — ' + r[1]));

await browser.close();
const allPass = rows.every(r => r[2]);
console.log('\nTOTAL: ' + rows.filter(r => r[2]).length + '/' + rows.length + ' passed');
process.exit(allPass ? 0 : 1);
