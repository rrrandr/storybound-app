// CG READER PATH — the seven completion criteria. Provider-free, $0.
//
// ENTITLEMENT/PAYMENT RESPONSES SIMULATED. PURCHASING AND BILLING ARE NOT TESTED.
// No purchase occurs; no real account is read or mutated; no payment credential exists here.
//
// Reuses the PROVEN staged reader driver from the full-issue work (_fs_story_setup.mjs) with its
// mount/latch waits and decision gates. The author response — beats plus its history_note — is
// served at the NETWORK boundary and the application parses, renders, accepts and persists it.
// The harness asserts outcomes; it performs no step of the pipeline.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, oasTurn, oasClosingBeat, OAS_TURNS } from './_replay_fixtures.mjs';
import { setupStageOf, SETUP_RESPONSES } from './_reader_setup_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, advanceExpectingGate, chooseBranch }
  from './_fs_story_setup.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// TWO CONSECUTIVE SCENES. Scene 2's note carries a quote that the post-processing chain cannot
// have produced, so criterion 7 (a rewrite invalidating a quotation) is testable.
const SCENES = [
  // BEAT LENGTHS THE NEW CONTRACT PERMITS — a compact paragraph, a deliberate one-liner, and a
  // dialogue beat carrying JUST its line. Navigation is exercised on these, not on uniform stubs.
  { beats: [
      // FOUR sentences — the TOP of the permitted range. The earlier check only exercised two,
      // so navigation was never tested at the length the contract actually allows.
      { idx: 0, kind: 'narration', text: 'The chamber was quiet for a long moment, the kind of '
        + 'quiet that happens when a room has already decided something and is waiting to be told. '
        + 'Julian took the sealed writ from his sleeve and put it into Lirael\'s hands. She closed '
        + 'her fingers around it before she had decided to. The Dohkar did not look up from the '
        + 'table, and that was its own kind of answer.' },
      // THE SPEAKER'S ACTION IN ITS OWN ADJACENT NARRATION BEAT, per Roman's decision — not
      // folded into the dialogue beat, which would record it as spoken words.
      { idx: 1, kind: 'narration', text: 'The clerk rose, and the room rose with him.' },
      { idx: 2, kind: 'dialogue', speaker: 'The Presiding Dohkar',
        text: '"The ruling on the Sacrificiant\'s conduct is mine."' },
      { idx: 3, kind: 'narration', text: 'Nobody sat down again.' } ],
    history_note: {
      events: [{ text: 'Julian gave Lirael the sealed writ.', quote: 'put it into Lirael\'s hands' },
               { text: 'The commission accepted the demand.' }],
      obligations: [{ id: 'ob-scene1', text: 'Lirael must answer the demand.', owedBy: 'Lirael' }],
      knowledge: { 'the assembly': { text: 'learned the writ exists', quote: 'The chamber was quiet' } },
      resolves: [] } },
  { beats: [
      { text: 'She rose before the second page was finished.' },
      { text: 'Who signed it, she asked, and the clerk did not answer.' } ],
    history_note: {
      events: [{ text: 'Lirael interrupted and asked who signed the demand.',
                 quote: 'Who signed it, she asked' },
               // A QUOTE THAT IS NOT IN THIS SCENE'S PROSE — criterion 7.
               { text: 'The chandelier fell into the well.',
                 quote: 'the chandelier fell into the well' }],
      obligations: [], resolves: [] } }
];

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
let sceneIdx = 0, authorServed = 0, oasN = 0, serveNote = true, forceFail = false;
const plannerReqs = [], authorSys = [], setupServed = {}, unfixtured = [], plannerIds = [];

page.on('console', m => logs.push(m.text()));
page.on('pageerror', e => logs.push('PAGEERROR: ' + (e && e.message)));

await page.route('**/*', async (route) => {
  const u = route.request().url();
  if (/^https?:\/\//.test(u) && !/^https?:\/\/localhost:3000/.test(u)) { try { await route.abort(); } catch (_) {} return; }
  return route.fallback();
});

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url();
  if (/\/api\/config/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  }
  // ENTITLEMENT/PAYMENT SIMULATED — supplies the payment prerequisite ONLY.
  if (/consume-fortune|fortune|charge|pricing|entitle|storypass|subscription/i.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, charged: true, fortunesRemaining: 9999,
        balance: 9999, fortunes: 9999, entitled: true, eligible: true, storypassEligible: true }) });
  }
  if (!isProviderEndpoint(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}
  const stage = stageOf(sys);
  let role = ''; try { role = String(JSON.parse(raw || '{}').role || ''); } catch (_) {}

  if (stage === 'oas') {
    const b = oasN >= OAS_TURNS.length ? oasClosingBeat() : oasTurn(oasN); oasN++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: b }) });
  }
  // THE CG AUTHOR: the screenplay generator, told apart from the scaffold by its "panels" schema.
  if (/"panels"/.test(sys)) {
    authorSys.push(sys);
    if (forceFail) {   // criterion 6: a FAILED turn
      return route.fulfill({ status: 500, contentType: 'application/json',
        body: JSON.stringify({ error: 'harness: simulated author failure' }) });
    }
    const spec = SCENES[Math.min(sceneIdx, SCENES.length - 1)];
    const payload = serveNote ? spec : { beats: spec.beats };   // criterion 6: a response with NO note
    authorServed++; sceneIdx++;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: '```json\n' + JSON.stringify(payload) + '\n```' }) });
  }
  if (stage === 'planner') {
    plannerReqs.push(raw || '');
    // THE IDS COME FROM THE PROMPT ITSELF, not from guesses. The planner request lists its own
    // seed-owned ids ("AFTERMATH TRUTHS (seed-owned ids ... you MUST return \"kept\" for EACH id)"
    // and the reserved-event block), so the fixture reads them back and declares the required
    // status for each. Nothing is invented and the set adapts if the seed changes.
    let usr = ''; try { usr = String((JSON.parse(raw || '{}').messages || [])[1]?.content || ''); } catch (_) {}
    const all = sys + '\n' + usr;
    // Scan each block for snake_case ids however they are punctuated, and UNION with the ids the
    // validator has actually named in its refusals. Declaring a status for an id the validator
    // does not know is harmless; omitting one it does know is the failure being avoided.
    const idsIn = (block) => [...new Set((block.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) || []))];
    const KNOWN_AFTERMATH = ['twist_manifested', 'interrogation_interrupted',
      'the_answer_in_her_hands', 'the_answer_institutional', 'inquiry_authority_claimed',
      'dohkar_charge', 'inquiry_convened', 'words_honoured', 'price_unnamed'];
    const KNOWN_RESERVED = ['price_identified', 'julian_counter_wish', 'julian_obscuring_wishes'];
    const aftermath = {}, reserved = {};
    idsIn((all.match(/AFTERMATH TRUTHS[\s\S]{0,3000}/) || [''])[0]).concat(KNOWN_AFTERMATH)
      .forEach(id => { aftermath[id] = 'kept'; });
    idsIn((all.match(/RESERVED[\s\S]{0,3000}/) || [''])[0]).concat(KNOWN_RESERVED)
      .forEach(id => { reserved[id] = 'untouched'; });
    plannerIds.push({ aftermath: Object.keys(aftermath), reserved: Object.keys(reserved) });
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify({
        state_change: 'The inquiry formally opens against Lirael.',
        tactical_move: 'The clerk begins reading the demand aloud.',
        forces_choice: 'Answer now, or let it be read in full.',
        local_objective: 'Lirael tries to leave the chamber before the demand is read in full.',
        local_objective_actor: 'Lirael',
        posture_read: 'She is moving before anyone has finished speaking.',
        present: ['Lirael', 'Julian'],
        reserved: reserved,
        aftermath: aftermath,
        // The CG planner gate refuses to dispatch the author when BOTH aftermath_obligations and
        // event_slots.exit_state are empty — "no consequence of any kind (who reacts, what
        // changes)". This is the lane machinery, so the fixture names a lane and its consequence.
        scene_function_instantiated: 'the procedural lane: the inquiry starts moving against her',
        aftermath_obligations: 'The clerk records that she tried to leave; the commission must '
          + 'decide whether to compel her return, and her standing drops in front of witnesses.',
        chosen_aftermath_lane: 'dohkar_preliminary_review',
        lane_posture_modulation: 'Because she moved first, the review opens on her conduct rather '
          + 'than on the wish.',
        event_slots: {
          actor: 'the presiding Dohkar', action: 'calls for a preliminary review',
          target: 'Lirael',
          exit_state: 'Lirael is formally under review and cannot leave the chamber unremarked.',
          // Every event must declare how it is possible: "ordinary" means no wish-capability is
          // being claimed (app.js:102997 ff). Nothing in this scene is wish-worked.
          mechanism_grounding: 'ordinary'
        },
        mechanism_grounding: 'ordinary',
        must_land_moments: [] }) }) });
  }
  const st = setupStageOf(sys);
  if (st && SETUP_RESPONSES[st]) {
    setupServed[st] = (setupServed[st] || 0) + 1;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify(SETUP_RESPONSES[st]) }) });
  }
  if (role === 'STRUCTURE_GENERATOR') {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify({ thesis: 'the inquiry closes around her',
        issues: [], motifs: [], forbidden: [] }) }) });
  }
  unfixtured.push(sys.slice(0, 80).replace(/\s+/g, ' '));
  return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unfixtured' }) });
});

await page.addInitScript(() => {
  const session = { access_token: 'harness-session-token', user: { id: 'harness-reader' } };
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInAnonymously: async () => ({ data: { session, user: session.user }, error: null }) },
    from: () => ({ select() { return this; }, eq() { return this; }, order() { return this; },
      limit() { return this; }, single: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }), upsert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }), then: (r) => r({ data: [], error: null }) }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {} }) };
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });

console.log('=== CG READER PATH — SEVEN CRITERIA (provider-free, $0) ===');
console.log('ENTITLEMENT/PAYMENT RESPONSES SIMULATED. PURCHASING AND BILLING ARE NOT TESTED.\n');

await page.evaluate(() => { window.state.profileId = 'harness-reader'; window.state.fortunes = 9999;
  window.state.storypassEligible = true; });
const def = await findFSDef(page);
await launchFS(page, def);
await unlockFS(page, 'cg-reader-path');
await finalizePreview(page);
await page.waitForTimeout(3000);

console.log('SCENE 1 — the reader advances through the staged control');
const g1 = await advanceExpectingGate(page, 'I wait for the clerk to finish.', 'Who signed this?');
console.log('   gate: ' + JSON.stringify(g1));
if (g1.promptMounted) { const c = await chooseBranch(page, 'A'); console.log('   branch: ' + JSON.stringify(c).slice(0, 120)); }
await page.waitForTimeout(25000);

const r1 = await page.evaluate(() => {
  const dom = document.body ? document.body.innerText : '';
  const notes = (window.state._historyNotes || []);
  const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
  return { authorAsked: null, domHasMeta: /history_note|HISTORY_NOTE|UNVERIFIED|obligations/i.test(dom),
    cgCount: cg.length, lastUid: cg.length ? cg[cg.length - 1].uid : null,
    lastText: cg.length ? cg[cg.length - 1].text : '',
    notes: notes.map(n => ({ ref: n.ref, quoted: (n.quoted || []).map(q => q.quote),
      summary: (n.summary || []).map(x => x.text), obligations: (n.obligations || []).map(o => o.id) })) };
});
console.log('   author requests: ' + authorServed + '   cg scenes: ' + r1.cgCount
  + '   notes: ' + r1.notes.length);
if (plannerIds.length) console.log('   planner ids parsed from the prompt: '
  + JSON.stringify(plannerIds[plannerIds.length - 1]));
if (unfixtured.length) { console.log('   UNFIXTURED: ' + [...new Set(unfixtured)].slice(0, 4).join(' | ')); }

t('1. THE REAL AUTHOR REQUEST WAS MADE', authorServed > 0);
if (authorServed > 0) {
  t('1b. and it ASKS FOR THE NOTE', /history_note/.test(authorSys[0]));
  t('2. the response travelled through production parsing and acceptance',
    r1.cgCount > 0 && /put it into Lirael's hands/.test(r1.lastText));
  t('3. THE READER SEES PROSE WITHOUT METADATA', !r1.domHasMeta);
  t('4. the note is keyed to that exact accepted scene',
    r1.notes.length === 1 && r1.notes[0].ref === r1.lastUid,
    JSON.stringify(r1.notes.map(n => n.ref)) + ' vs ' + r1.lastUid);
}

// ── PAGE THROUGH THE SCENE'S BEATS, WHICH IS WHAT OPENS THE GATE ────────────────────────────
// "[STAGED:SUBMIT] Blocked — gate not yet open": the gate latches only once the reader has paged
// PAST THE LAST BEAT (app.js:226596, nextIdx > lastIdx). The harness therefore clicks the real
// next-page control until the gate shows, exactly as a reader does, instead of submitting into a
// closed gate and calling the result a failure.
async function pageToGate(page, maxClicks = 14) {
  for (let i = 0; i < maxClicks; i++) {
    const st = await page.evaluate(() => {
      const a = window.state._stagedActive || null;
      return { gateShown: !!(a && a.gateShown), beat: a ? a.currentBeatIdx : null,
        beats: a && a.plan && a.plan.beats ? a.plan.beats.length : null };
    });
    if (st.gateShown) return { ...st, clicks: i };
    const clicked = await page.evaluate(() => {
      const b = document.getElementById('gnNextPageBtn');
      if (b && !b.disabled) { b.click(); return 'button'; }
      if (typeof window._advanceStagedBeat === 'function') { window._advanceStagedBeat(); return 'handler'; }
      return null;
    });
    if (!clicked) return { ...st, clicks: i, stuck: true };
    await page.waitForTimeout(1200);
  }
  return await page.evaluate(() => {
    const a = window.state._stagedActive || null;
    return { gateShown: !!(a && a.gateShown), exhausted: true };
  });
}

// The staged session is created at mount and TORN DOWN between scenes, so a single probe can
// easily land on either side of it. Poll instead, and report what was actually seen.
let sawStaged = null;
for (let i = 0; i < 25; i++) {
  const snap = await page.evaluate(() => {
    const a = window.state._stagedActive;
    return a ? { beatIdx: a.currentBeatIdx, beats: a.plan && a.plan.beats ? a.plan.beats.length : null,
      gateShown: !!a.gateShown } : null;
  });
  if (snap) { sawStaged = snap; break; }
  await page.waitForTimeout(1500);
}
console.log('   staged session seen: ' + JSON.stringify(sawStaged));

const stagedProbe = await page.evaluate(() => {
  const a = window.state._stagedActive;
  const btn = document.getElementById('gnNextPageBtn');
  return { hasActive: !!a,
    activeKeys: a ? Object.keys(a).slice(0, 14) : null,
    beatIdx: a ? a.currentBeatIdx : null,
    beats: a && a.plan && a.plan.beats ? a.plan.beats.length : null,
    gateShown: a ? !!a.gateShown : null,
    nextBtn: btn ? { present: true, disabled: btn.disabled, visible: btn.offsetParent !== null } : null };
});
console.log('   staged session: ' + JSON.stringify(stagedProbe));
const gate1 = await pageToGate(page);
console.log('   paged to gate: ' + JSON.stringify(gate1));

console.log('\nSCENE 2 — a second consecutive scene through the same control');
plannerReqs.length = 0; authorSys.length = 0;
serveNote = true;
const g2 = await advanceExpectingGate(page, 'I ask who signed it.', 'Who signed this?');
if (g2.promptMounted) { await chooseBranch(page, 'A'); }
await page.waitForTimeout(25000);

const r2 = await page.evaluate(() => {
  const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
  const notes = (window.state._historyNotes || []);
  const dom = document.body ? document.body.innerText : '';
  return { cgCount: cg.length, uids: cg.map(x => x.uid),
    domHasMeta: /history_note|HISTORY_NOTE|UNVERIFIED|chandelier/i.test(dom),
    notes: notes.map(n => ({ ref: n.ref, quoted: (n.quoted || []).map(q => q.quote),
      summary: (n.summary || []).map(x => x.text) })) };
});
const plannerBody = plannerReqs.join('\n');
const authorBody = authorSys.join('\n');
console.log('   cg scenes now: ' + r2.cgCount + '   notes: ' + r2.notes.length);
console.log('   notes: ' + JSON.stringify(r2.notes));

// VACUITY GUARD. If no second scene generated, criteria 5 and 7 have nothing to measure and MUST
// NOT be scored — a check that passes because nothing happened is worse than a failure.
const secondSceneRan = r2.cgCount > 1;
if (!secondSceneRan) {
  console.log('   NOT MEASURED: no second scene generated, so criteria 5 and 7 have nothing to');
  console.log('   act on. Reported UNPROVEN rather than scored — a pass would only mean the');
  console.log('   pipeline stopped.');
}
if (secondSceneRan) {
t('5a. THE NEXT PLANNER RECEIVED THE PRIOR SCENE\'S HISTORY',
  /WHAT THE SCENES THEMSELVES SAY|put it into Lirael/.test(plannerBody),
  'the planner request carries no history from scene 1');
t('5b. AND SO DID THE NEXT AUTHOR',
  /WHAT THE SCENES THEMSELVES SAY|put it into Lirael/.test(authorBody),
  'the author request carries no history from scene 1');
t('5c. the first note belongs to the FIRST scene, not the second',
  r2.notes.length >= 1 && r2.notes[0].ref === r2.uids[0]);
t('7. A QUOTE THAT IS NOT IN THE ACCEPTED PROSE IS NOT ESTABLISHED',
  r2.notes.length >= 2
    ? !(r2.notes[1].quoted || []).some(q => /chandelier/.test(q))
    : true,
  'a quotation absent from the rendered scene was accepted as the scene\'s own words');
t('7b. and it never reaches the reader', !r2.domHasMeta);
}

console.log('\nSCENE 3 — a response with NO NOTE (distinct scenario: inheritance)');
// Page to the gate again — each scene latches its own.
for (let i = 0; i < 25; i++) {
  const seen = await page.evaluate(() => !!window.state._stagedActive);
  if (seen) break; await page.waitForTimeout(1500);
}
console.log('   paged to gate: ' + JSON.stringify(await pageToGate(page)));
const notesBefore = await page.evaluate(() => (window.state._historyNotes || []).length);
serveNote = false;
const g3 = await advanceExpectingGate(page, 'I stay where I am.', '');
if (g3.promptMounted) { await chooseBranch(page, 'A'); }
await page.waitForTimeout(22000);
const r3 = await page.evaluate(() => {
  const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
  const notes = (window.state._historyNotes || []);
  return { cgCount: cg.length, noteCount: notes.length, refs: notes.map(n => n.ref),
    lastUid: cg.length ? cg[cg.length - 1].uid : null };
});
console.log('   scenes: ' + r3.cgCount + '   notes: ' + r3.noteCount + ' (was ' + notesBefore + ')');
if (r3.cgCount > r2.cgCount) {
  t('6a. A RESPONSE WITH NO NOTE INHERITS NOTHING',
    !r3.refs.includes(r3.lastUid) || r3.noteCount === notesBefore,
    'a scene with no note of its own was given an earlier scene\'s note');
} else {
  console.log('   NOT MEASURED: the no-note turn produced no scene, so nothing could inherit.');
}

console.log('\nSCENE 4 — a FAILED attempt, then a SUCCESSFUL scene after it');
for (let i = 0; i < 25; i++) {
  const seen = await page.evaluate(() => !!window.state._stagedActive);
  if (seen) break; await page.waitForTimeout(1500);
}
console.log('   paged to gate: ' + JSON.stringify(await pageToGate(page)));
forceFail = true;
const notesBeforeFail = await page.evaluate(() => (window.state._historyNotes || []).length);
const g4 = await advanceExpectingGate(page, 'I turn to go.', '');
if (g4.promptMounted) { await chooseBranch(page, 'A'); }
await page.waitForTimeout(18000);
const r4 = await page.evaluate(() => ({
  noteCount: (window.state._historyNotes || []).length,
  pending: !!window.state._pendingLiteraryHistoryNote }));
// The failed turn is measurable even without a new scene: the question is whether a FAILURE can
// leave a note behind, and the answer is observable either way.
t('6b. A FAILED TURN ADDS NO NOTE', r4.noteCount === notesBeforeFail,
  'notes ' + notesBeforeFail + ' -> ' + r4.noteCount);
t('6c. and leaves no pending note behind to attach later', r4.pending === false);


console.log('\nSCENE 5 — a SUCCESSFUL scene immediately after the failed attempt');
for (let i = 0; i < 25; i++) {
  const seen = await page.evaluate(() => !!window.state._stagedActive);
  if (seen) break; await page.waitForTimeout(1500);
}
await pageToGate(page);
forceFail = false; serveNote = true;
// A DOWNSTREAM REWRITE THAT REMOVES A CITED EVENT. The note quotes a measurement, and the
// Fatelands unit sanitiser rewrites measurements in the accepted prose — so the quotation is
// valid against the DRAFT and invalid against what the reader got. If the stored note is checked
// against the final accepted prose, this claim must be demoted to unverified summary.
SCENES.push({
  beats: [{ text: 'She walked five miles along the inner wall before she stopped.' },
          { text: 'The clerk had not followed her.' }],
  history_note: {
    events: [{ text: 'She walked a long way along the wall.', quote: 'walked five miles along the inner wall' },
             { text: 'The clerk did not follow.', quote: 'The clerk had not followed her' }],
    obligations: [], resolves: [] }
});
sceneIdx = SCENES.length - 1;
const notesBeforeS5 = await page.evaluate(() => (window.state._historyNotes || []).length);
const g5 = await advanceExpectingGate(page, 'I walk the wall.', '');
if (g5.promptMounted) { await chooseBranch(page, 'A'); }
await page.waitForTimeout(25000);
const r5 = await page.evaluate(() => {
  const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
  const notes = (window.state._historyNotes || []);
  const last = notes[notes.length - 1] || null;
  const lastScene = cg[cg.length - 1] || null;
  return { scenes: cg.length, noteCount: notes.length,
    lastRef: last ? last.ref : null, lastUid: lastScene ? lastScene.uid : null,
    lastText: lastScene ? lastScene.text : '',
    quoted: last ? (last.quoted || []).map(q => q.quote) : [],
    summary: last ? (last.summary || []).map(x => x.text) : [] };
});
console.log('   scenes: ' + r5.scenes + '   notes: ' + r5.noteCount + ' (was ' + notesBeforeS5 + ')');
console.log('   accepted prose: ' + JSON.stringify(String(r5.lastText).slice(0, 150)));
console.log('   quoted: ' + JSON.stringify(r5.quoted));
console.log('   summary: ' + JSON.stringify(r5.summary));

if (r5.scenes > r3.cgCount) {
  t('6d. THE SCENE AFTER A FAILURE GETS ITS OWN NOTE, not the failed attempt\'s',
    r5.noteCount === notesBeforeS5 + 1 && r5.lastRef === r5.lastUid,
    'ref=' + r5.lastRef + ' uid=' + r5.lastUid);
  // The rewrite check only means something if a rewrite ACTUALLY happened.
  const rewritten = !/five miles/.test(String(r5.lastText));
  console.log('   did a downstream rewrite remove the cited text? ' + rewritten);
  if (rewritten) {
    t('7c. A QUOTE REMOVED BY A DOWNSTREAM REWRITE IS NOT ESTABLISHED',
      !r5.quoted.some(q => /five miles/.test(q))
        && r5.summary.some(x => /walked a long way/.test(x)),
      'the note was checked against the draft, not the accepted prose');
  } else {
    console.log('   NOT MEASURED: no downstream pass altered the cited text in this run, so there');
    console.log('   was no rewrite to invalidate the quotation. Criterion 7c stays UNPROVEN —');
    console.log('   the surviving quote below is correct behaviour, not evidence either way.');
  }
  t('7d. a quote that DID survive is still established',
    r5.quoted.some(q => /clerk had not followed/.test(q)));
} else {
  console.log('   NOT MEASURED: no scene generated after the failure.');
}

fs.mkdirSync('_audit_out/cgpath', { recursive: true });
fs.writeFileSync('_audit_out/cgpath/run1.json', JSON.stringify({ r1, r2, r3, r4, r5, logs: logs.slice(-110) }, null, 2));
if (plannerReqs.length) fs.writeFileSync('_audit_out/cgpath/planner2.txt', plannerReqs.join('\n---\n'));
if (authorSys.length) fs.writeFileSync('_audit_out/cgpath/author1.txt', authorSys[0]);
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
