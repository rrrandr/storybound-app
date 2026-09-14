// ═══ CG BEAT NARRATION-LOSS RED CONTROL (2026-09-13) ═══
// Diagnostic-only. Proves (or disproves) the defect named in
// _audit_out/cg_beat_narration_preservation_audit.md: public/app.js ~213619-213636 discards
// everything in a `dialogue` beat's text except the first quoted span. No production file is
// edited here. No paid model call — the CG author's request (/api/chatgpt-proxy match on the
// screenplay-native system prompt) is answered with OUR fixed, hand-authored JSON plan.
//
// Route to a rendered CG scene: reuses _baked_screen_probe.mjs's proven launch → OAS one-on-one →
// Genesis gate → normal turn → exit → interruption → card → Submit chain (First Sacrifice baked
// starter), because that chain is ALREADY PROVEN to reach the real `_runCGScreenplayGen` call
// (see that script's V6). The only change here: the cgScreenplay stub answers with our fixture
// plan instead of '{}', and after Submit we drive the REAL beat-advance button
// (#stagedNextBtn) and read the REAL rendered DOM (#stagedBeatText) at each beat.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const OUT_DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/79822a26-4953-4e0a-b337-9520e623604d/scratchpad';

// ══════════════════════════════════════════════════════════════════════════════════════════
// THE FIXTURE — hand-authored, fixed, never a model call. Four beats: two controls (pure
// narration / pure exposition), one compliant dialogue beat (control), and ONE compound
// dialogue beat that bundles narration-before + quote + narration-after + interior line +
// a Character+-shaped detail — exactly the failure mode the audit names — into a SINGLE
// dialogue beat's `text` field, as if the model had bundled everything despite the schema's
// instruction not to.
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
    // A NAMED side character carries both dialogue beats below. The First Sacrifice baked
    // starter used to reach this render never populates state.playerName/loveInterestName the
    // way corridor-created stories do, so the 'protagonist'/'li' speaker tags resolve to null
    // and the renderer's own known-cast guard correctly (and independently of the beat-text
    // defect under test) suppresses their labels. A named character sidesteps that unrelated
    // resolution gap so the speaker-label assertions test what they're meant to test.
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
const page = await (await browser.newContext()).newPage();
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
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'redctl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] }) });
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

// ── Launch the First Sacrifice baked starter (proven route to a CG scene, see _baked_screen_probe.mjs) ──
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

// The charge itself is a Supabase RPC this headless session cannot complete — set the exact
// post-unlock state the gate sets, then use the gate's own button again (mirrors _baked_screen_probe.mjs).
await page.click('#buCancelBtn'); await page.waitForTimeout(300);
await page.evaluate(() => { window._commitBakedScene(); window.state._bakedGenesisUnlocked = true; });
await page.click('#bakedOASEnterBtn'); await page.waitForTimeout(7000);

const inOAS = await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active));
if (!inOAS) { console.log('[STOP] one-on-one never went active'); await browser.close(); process.exit(2); }

// A normal action turn first (production shape — the exit path is exercised only after at least
// one real turn in the prior probe; mirrored here for parity, not because this harness cares
// about that behavior).
await page.fill('#gnActionInput', 'I keep my hands still around the ledger and wait for him to look up.');
await page.click('#gnSubmitBtn'); await page.waitForTimeout(3000);
for (let i = 0; i < 20 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);

// Exit via the DO/action box (the SAY box live-wraps in curly quotes and the exit detector
// doesn't strip those — a pre-existing, unrelated finding recorded in _baked_screen_probe.mjs).
await page.fill('#gnDialogueInput', '');
await page.fill('#gnActionInput', 'stop');
await page.click('#gnSubmitBtn');
// V4's own check in _baked_screen_probe.mjs uses `btn: !!b` (mere DOM presence, not client
// rects — "its container reports no client rects mid-fade") plus the modal's visibility OR the
// log line. Mirrored here rather than a stricter rects check that would false-negative on timing.
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
  const dbg = await page.evaluate(() => { const d = window.state && window.state.intimacyDialogue; return d ? { active: d.active, awaiting: !!d.awaitingResponse, beats: d.beatCount, pending: d.pendingRequestId || null } : null; });
  console.log('dbg intimacyDialogue: ' + JSON.stringify(dbg));
  console.log(JSON.stringify(allLogs.filter(l => /INTIMACY|STAGED|EXIT/i.test(l)).slice(-40)));
  await browser.close(); process.exit(2);
}

try { await page.click('#intimacyExitFade', { force: true, timeout: 5000 }); } catch (_) { await page.evaluate(() => { const b = document.getElementById('intimacyExitFade'); if (b) b.click(); }); }
await page.waitForTimeout(5000);

const interr = await page.evaluate(() => { const el = document.getElementById('intimateInterruption'); return !!(el && el.getClientRects().length); });
if (!interr) { console.log('[STOP] interruption never appeared'); console.log(JSON.stringify(allLogs.slice(-20))); await browser.close(); process.exit(2); }

for (let i = 0; i < 10 && !(await page.evaluate(() => { const r = window.state._intimateInterruption; return !!(r && r.cards && Object.keys(r.cards).length); })); i++) await page.waitForTimeout(500);
const HOST = await page.evaluate(() => { const r = window.state._intimateInterruption; return r && r.host === 'cg' ? { mount: 'gnCardMount', a: 'gnActionInput', d: 'gnDialogueInput', s: 'gnSubmitBtn' } : { mount: 'cardMount', a: 'actionInput', d: 'dialogueInput', s: 'submitBtn' }; });
const cardSel = '#' + HOST.mount + ' [data-fate-card-slot="confession"]';
const cardPresent = await page.evaluate((sel) => !!document.querySelector(sel), cardSel);
if (!cardPresent) { console.log('[STOP] expected interruption card not found: ' + cardSel); await browser.close(); process.exit(2); }
await page.click(cardSel); await page.waitForTimeout(500);

// ── THE SUBMIT THAT TRIGGERS THE REAL _runCGScreenplayGen CALL (stubbed above with FIXTURE_PLAN) ──
await page.click('#' + HOST.s);
for (let i = 0; i < 30 && !calls.some(c => /^cgScreenplay@/.test(c)); i++) await page.waitForTimeout(2000);
if (!calls.some(c => /^cgScreenplay@/.test(c))) { console.log('[STOP] cgScreenplay request never fired'); console.log(JSON.stringify(calls)); await browser.close(); process.exit(2); }
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
  console.log(JSON.stringify(allLogs.filter(l => /STAGED|CG:SCREENPLAY|CG:ASSIGN|SCENE-DECISION/i.test(l)).slice(-30)));
  fs.writeFileSync(OUT_DIR + '/cg_beat_red_control.alllog.txt', allLogs.join('\n'));
  await browser.close(); process.exit(2);
}
await page.waitForTimeout(1000);

// ── Walk EVERY beat via the REAL #stagedNextBtn, reading the REAL rendered DOM at each ──
const captured = [];
const readBeat = () => page.evaluate(() => {
  const el = document.getElementById('stagedBeatText');
  if (!el) return null;
  const speakerEl = el.querySelector('.staged-speaker');
  return {
    kind: el.getAttribute('data-kind'),
    fullText: (el.textContent || '').trim(),
    speaker: speakerEl ? speakerEl.textContent.trim() : null,
    pText: (el.querySelector('p') ? el.querySelector('p').textContent : '').trim()
  };
});
const currentBeatIdx = () => page.evaluate(() => (window.state && window.state._stagedActive) ? window.state._stagedActive.currentBeatIdx : -1);
const totalBeats = FIXTURE_PLAN.beats.length;
for (let i = 0; i < totalBeats; i++) {
  // Wait for the current beat's typewriter (exposition beats type char-by-char) to finish.
  await page.waitForTimeout(1200);
  for (let w = 0; w < 20; w++) {
    const typing = await page.evaluate(() => { const el = document.getElementById('stagedBeatText'); return el ? el.classList.contains('staged-beat-text--typing') : false; });
    if (!typing) break;
    await page.waitForTimeout(300);
  }
  const idxNow = await currentBeatIdx();
  const b = await readBeat();
  captured.push(b);
  console.log('BEAT ' + i + ' (state.currentBeatIdx=' + idxNow + ') kind=' + (b && b.kind) + ' speaker=' + JSON.stringify(b && b.speaker) + ' pText=' + JSON.stringify(b && b.pText));
  if (idxNow !== i) console.log('  [WARN] state.currentBeatIdx (' + idxNow + ') does not match the expected fixture index (' + i + ') — see report');
  if (i < totalBeats - 1) {
    // KNOWN, PRE-EXISTING UI QUIRK (unrelated to the defect under test): when an exposition
    // beat's typewriter finishes NATURALLY (not via a click-to-fast-forward), app.js's
    // active._typewriterComplete reference is left set (only nulled on the fast-forward path,
    // ~app.js:213680). The NEXT click to #stagedNextBtn is then swallowed by
    // _advanceStagedBeat's `if (active._typewriterComplete) { active._typewriterComplete(); return; }`
    // guard (~app.js:213866) instead of advancing. Retry the click until state's own
    // currentBeatIdx actually moves, rather than assuming one click == one beat advance.
    for (let a = 0; a < 6; a++) {
      await page.click('#stagedNextBtn');
      await page.waitForTimeout(700);
      const nowIdx = await currentBeatIdx();
      if (nowIdx === i + 1) break;
    }
  }
}

fs.writeFileSync(OUT_DIR + '/cg_beat_red_control.captured.json', JSON.stringify(captured, null, 2));
fs.writeFileSync(OUT_DIR + '/cg_beat_red_control.alllog.txt', allLogs.join('\n'));

const nameDbg = await page.evaluate(() => ({
  playerName: window.state.playerName, loveInterestName: window.state.loveInterestName,
  normalizedPlayerKernel: window.state.normalizedPlayerKernel, normalizedPartnerKernel: window.state.normalizedPartnerKernel,
  rawPlayerName: window.state.rawPlayerName, rawPartnerName: window.state.rawPartnerName,
  resolvedPC: (typeof window._resolveStagedPlayerName === 'function') ? window._resolveStagedPlayerName() : '(fn missing)',
  resolvedLI: (typeof window._resolveStagedPartnerName === 'function') ? window._resolveStagedPartnerName() : '(fn missing)'
}));
console.log('nameDbg=' + JSON.stringify(nameDbg));
console.log('speakerLogs=' + JSON.stringify(allLogs.filter(l => /STAGED:RENDER\] speaker|no quoted line/i.test(l))));

// ══════════════════════════════════════════════════════════════════════════════════════════
// ASSERTIONS — UPDATED 2026-09-13: the discard this harness diagnosed is now FIXED (app.js
// ~213668, "DIALOGUE BEAT TEXT — PRESERVED, NOT REDUCED"). Group renamed RED → PRESERVE; these
// now assert the fix holds (all four pieces present, IN ORIGINAL ORDER) rather than that the loss
// reproduces. CONTROL group (unrelated beat kinds) is unchanged — still asserting no regression.
// ══════════════════════════════════════════════════════════════════════════════════════════
const beat0 = captured[0], beat1 = captured[1], beat2 = captured[2], beat3 = captured[3];

// PRESERVE-1: rendered text for the compound beat is the FULL authored text, not reduced to the quote.
const beat3PTextIsFull = !!beat3 && typeof beat3.pText === 'string' && beat3.pText.indexOf(NARRATION_BEFORE) !== -1
  && beat3.pText.indexOf(QUOTE_LINE) !== -1 && beat3.pText.indexOf(NARRATION_AFTER) !== -1;
ok('PRESERVE', 'PRESERVE-1 rendered text for the compound dialogue beat is the FULL authored text (not reduced to just the quote)',
  beat3PTextIsFull, 'actual pText=' + JSON.stringify(beat3 && beat3.pText));

// PRESERVE-2: all four pieces of authored text survive on the page for that beat, in their original order.
const beat3Present = {
  narrationBefore: !!beat3 && beat3.fullText.indexOf(NARRATION_BEFORE) !== -1,
  quote: !!beat3 && beat3.fullText.indexOf(QUOTE_LINE) !== -1,
  narrationAfter: !!beat3 && beat3.fullText.indexOf(NARRATION_AFTER) !== -1,
  interiorLine: !!beat3 && beat3.fullText.indexOf(INTERIOR_LINE) !== -1,
  cplusDetail: !!beat3 && beat3.fullText.indexOf(CPLUS_DETAIL) !== -1
};
const allPresent = beat3Present.narrationBefore && beat3Present.quote && beat3Present.narrationAfter && beat3Present.interiorLine && beat3Present.cplusDetail;
const idx = k => (!!beat3 && beat3.fullText.indexOf({narrationBefore: NARRATION_BEFORE, quote: QUOTE_LINE, narrationAfter: NARRATION_AFTER, interiorLine: INTERIOR_LINE, cplusDetail: CPLUS_DETAIL}[k]));
const inOrder = allPresent && idx('narrationBefore') < idx('quote') && idx('quote') < idx('narrationAfter')
  && idx('narrationAfter') < idx('interiorLine') && idx('interiorLine') < idx('cplusDetail');
ok('PRESERVE', 'PRESERVE-2 narration-before / quote / narration-after / interior line / C+ detail ALL appear in the rendered DOM for that beat, IN ORIGINAL AUTHORED ORDER',
  inOrder, 'present-map=' + JSON.stringify(beat3Present) + ' fullText=' + JSON.stringify(beat3 && beat3.fullText));

// PRESERVE-3: speaker label still renders correctly (this logic was already independent of the
// text-reduction step before the fix, and must remain unaffected by removing that step).
const beat3SpeakerOk = !!beat3 && !!beat3.speaker && beat3.speaker.length > 0;
ok('PRESERVE', 'PRESERVE-3 the speaker label still renders for the compound beat now that its full text is preserved',
  beat3SpeakerOk, 'actual speaker=' + JSON.stringify(beat3 && beat3.speaker));

// CONTROL-1: pure narration beat renders verbatim.
ok('CONTROL', 'CONTROL-1 pure narration beat renders its full text verbatim',
  !!beat0 && beat0.pText === PURE_NARRATION_TEXT, 'actual=' + JSON.stringify(beat0 && beat0.pText));

// CONTROL-2: pure exposition beat renders verbatim.
ok('CONTROL', 'CONTROL-2 pure exposition beat renders its full text verbatim',
  !!beat1 && beat1.pText === PURE_EXPOSITION_TEXT, 'actual=' + JSON.stringify(beat1 && beat1.pText));

// CONTROL-3: the compliant (quote-only) dialogue beat renders its quote correctly with its speaker label.
ok('CONTROL', 'CONTROL-3 compliant quote-only dialogue beat renders its quote + speaker label',
  !!beat2 && beat2.pText === COMPLIANT_QUOTE_TEXT && !!beat2.speaker,
  'actual pText=' + JSON.stringify(beat2 && beat2.pText) + ' speaker=' + JSON.stringify(beat2 && beat2.speaker));

const preserveRows = rows.filter(r => r[0] === 'PRESERVE');
const controlRows = rows.filter(r => r[0] === 'CONTROL');
const preservePassCount = preserveRows.filter(r => r[2]).length;
const controlPassCount = controlRows.filter(r => r[2]).length;
console.log('\n=== PRESERVE group (all expected to PASS now that the fix is applied): ' + preservePassCount + '/' + preserveRows.length + ' passed ===');
preserveRows.forEach(r => console.log('  ' + (r[2] ? 'PASS' : 'FAIL') + ' — ' + r[1]));
console.log('\n=== CONTROL group (all expected to PASS): ' + controlPassCount + '/' + controlRows.length + ' passed ===');
controlRows.forEach(r => console.log('  ' + (r[2] ? 'PASS' : 'FAIL') + ' — ' + r[1]));

await browser.close();

// Exit semantics: green requires BOTH groups clean — the fix holds (PRESERVE) AND nothing
// regressed (CONTROL). This harness's job is still to report reality: if PRESERVE ever fails
// again (a regression reintroducing the discard), this must go red, not silently pass.
const allSound = preservePassCount === preserveRows.length && controlPassCount === controlRows.length;
process.exit(allSound ? 0 : 1);
