#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE RECOVERY HANDOFF BOUNDARY — ONE FULLY PROVIDER-BLOCKED CONTINUATION.
//
// WHY THIS EXISTS. The accounting suite's section K tests the recovery helpers directly and
// checks the two production call sites at SOURCE. That is honest but it is not the boundary:
// it never shows the planner's REQUEST carrying the recovery question, and it never shows the
// AUTHOR'S REQUEST carrying the decision. This harness closes that:
//
//   1. the post-scene-6 checkpoint is installed as the browser's own saved story and resumed
//      through PRODUCTION'S Continue workflow (window.continueStory), not by Object.assign;
//   2. one turn is submitted through the real Submit control;
//   3. the SCENE-SPINE planner request is CAPTURED, and answered with a controlled reply that
//      goes back through production's own parser — the recorder is never called directly;
//   4. the complete outgoing AUTHOR request is CAPTURED and ABORTED.
//
// PROVIDER CONTACT: every request is intercepted. The page and its assets are served; each
// model door is answered from a labelled local fixture; everything unmatched is ABORTED and
// counted. Nothing is billed.
//
// WHAT THIS DOES NOT SHOW: that a real model answers the recovery question well, or anything
// about the quality of a recovery scene. Every reply here is a stub written by this file.
//
// usage: node _nf_recovery_boundary.mjs            (needs the dev server on :3000)
//        RECOVERY_DISPOSITION=defer|retire|none node _nf_recovery_boundary.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const RUN = process.env.SB_RUN_DIR
  || '/Users/romantsukerman/storybound-diag/_nf_story_test_RUN3/run_2026-11-02T19-03-47-893Z_29351';
const DISPOSITION = process.env.RECOVERY_DISPOSITION || 'incorporate';
const OUT = '_nf_recovery_boundary_out';
fs.mkdirSync(OUT, { recursive: true });

let PASS = 0, FAIL = 0, INCONCLUSIVE = 0;
const FAILURES = [], INCONCLUSIVES = [];
const line = (s) => console.log(s);
const section = (t) => { line(''); line('='.repeat(88)); line(t); line('='.repeat(88)); };
const note = (l, v) => line('  ----  ' + l + ' :: ' + String(v).replace(/\n/g, ' ').slice(0, 400));
function check(label, ok, detail) {
  if (ok) { PASS++; line('  PASS  ' + label); }
  else { FAIL++; FAILURES.push(label); line('  FAIL  ' + label + (detail ? '  :: ' + String(detail).slice(0, 400) : '')); }
}
function inconclusive(label, why) {
  INCONCLUSIVE++; INCONCLUSIVES.push(label + ' — ' + why);
  line('  ????  ' + label + '\n        INCONCLUSIVE: ' + why);
}

// ── THE PRESERVED CHECKPOINT, INSTALLED AS THE BROWSER'S OWN STORAGE ────────────────────
const STATE6 = JSON.parse(fs.readFileSync(RUN + '/STATE_after_scene6.json', 'utf8'));
const STORAGE = STATE6.storage;
const SAVE = JSON.parse(STORAGE.sb_saved_story);
const STORY_ID = SAVE.storyId;
const LATER = JSON.parse(JSON.parse(
  fs.readFileSync(RUN + '/STATE_after_scene10.json', 'utf8')).storage.sb_saved_story).stateSnapshot;
const SCENE6_VERDICT = LATER._committedState.deliveryLog['6'];

// ── FIXTURE PROSE (synthetic, written for this file; never offered as manuscript) ────────
const PROSE = [
  '[SYNTHETIC TEST PROSE — NOT MANUSCRIPT]',
  'The clearing had emptied by the time I got the question out, and Julian answered it the way a '
  + 'man answers something he has rehearsed alone.',
  'He said my father had been his charge, and that the inquiry had closed with nothing written '
  + 'down, and he let me watch him say it.',
  'I told him what the revelation wishes cost: three names I could not recover and two files that '
  + 'ended mid-sentence.',
  'He did not look away. That was the part I had not planned for.',
].join('\n\n');

const ROW6_TEXT = String(SCENE6_VERDICT.milestoneText || '');
const calls = [];
const doors = [];
const commitReqs = [];
let plannerReqs = [], authorReqs = [], aborted = [], pageServed = 0;
let plannerAnswered = 0;

const RECOVERY_BY_MODE = {
  incorporate: { disposition: 'incorporate',
    why: 'she is already at the stall with the pieces in his hands, so the repair finishes inside this confrontation' },
  defer: { disposition: 'defer',
    why: 'the Circle has her in the open and the stall is across the clearing' },
  retire: { disposition: 'retire',
    why: 'the provenance question has overtaken the repair entirely',
    superseded_by: 'Julian traces the long-set folds under Lirael\'s hand and states the relic was never listed among recovered possessions.' },
  none: null,
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// THE CHECKPOINT IS INSTALLED UNCHANGED. An earlier version of this harness pre-inserted scene
// 6's verdict into the delivery log; it no longer does. The turn's own commit pass assesses scene
// 6 in its normal next-turn position and establishes that verdict itself.
await page.addInitScript(([storage]) => {
  try {
    Object.keys(storage).forEach((k) => { try { localStorage.setItem(k, storage[k]); } catch (_) {} });
  } catch (_) {}
  try { window._forceDeckMandate = false; } catch (_) {}
}, [STORAGE]);

await installSession(page, makeSession());
await installEntitledProfileStub(page, {});

const envelope = (url, b, payload) => (/mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
  ? { id: 'fx', object: 'chat.completion', model: b && b.model, usage: {},
      _orchestration: { role: b && b.role, model: b && b.model },
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
  : { ok: true, content: payload, choices: [{ message: { content: payload } }] });

const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards|telemetry)\b/;
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                '/api/refund-fortune': { success: true, fortunesRemaining: 9999 } };

// EVERY request is decided here. Nothing reaches a provider.
await ctx.route('**/*', async (route) => {
  const req = route.request();
  const full = req.url();
  const url = full.replace(/^https?:\/\/[^/]+/, '');
  if (!/\/api\//.test(url)) {
    if (full.startsWith(ORIGIN)) { pageServed += 1; return route.continue(); }
    aborted.push({ url: url.slice(0, 120), why: 'off-origin non-api' });
    return route.abort();
  }
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(full)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (STATIC.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (IMAGE.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==' }) });
  }
  const lk = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (lk) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[lk]) });

  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const msgs = (b && b.messages) || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  const both = sys + usr;
  const role = String((b && b.role) || '?');
  const rec = { role, url, sys: sys.length, usr: usr.length, model: (b && b.model) || null,
    door: null, answered: false };
  calls.push(rec);
  const give = (payload, door) => {
    rec.answered = true; rec.door = door; doors.push({ door, role });
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(envelope(url, b, payload)) });
  };

  // ── THE SCENE-SPINE PLANNER: CAPTURED, then answered with a controlled reply ───────────
  if (/You are the SCENE-SPINE planner/.test(sys)) {
    plannerAnswered += 1;
    const n = plannerReqs.length + 1;
    const fname = `PLANNER_REQUEST_${n}.txt`;
    fs.writeFileSync(OUT + '/' + fname,
      `=== SCENE-SPINE PLANNER · role=${role} · model=${b && b.model}\n\n`
      + `=== SYSTEM (${sys.length} chars) ===\n${sys}\n\n=== USER (${usr.length} chars) ===\n${usr}\n`);
    plannerReqs.push({ sys, usr, file: fname });
    const rowMatch = usr.match(/STILL OWED — assigned at scene (\d+)/);
    const row = rowMatch ? Number(rowMatch[1]) : 6;
    const reply = {
      tactical_move: 'make him answer for the inventory history in front of her',
      state_change_precondition: 'Julian has not said aloud that he was her father\'s Chayr',
      state_change: 'Julian names himself as Augar\'s Chayr while she holds the ledger page',
      forces_choice: 'forces Lirael to choose between pressing him for the closed file or protecting him from the Circle',
      branch_a: 'she presses him for the closed file in front of a witness',
      branch_b: 'she shields him and takes the question to the Circle herself',
      event_slots: { precondition: 'Julian is present in the scene', actor: 'Julian',
        action: 'names himself as Augar\'s Chayr', target: 'Lirael',
        exit_state: 'Lirael now knows Julian was her father\'s Chayr',
        mechanism_grounding: 'ordinary' },
      mechanism_grounding: 'ordinary',
    };
    const r = RECOVERY_BY_MODE[DISPOSITION];
    if (r) reply.recovery = Object.assign({ row }, r);
    return give(JSON.stringify(reply), 'SCENE_SPINE_PLANNER(captured+answered)');
  }

  // ── THE AUTHOR: CAPTURED AND ABORTED ──────────────────────────────────────────────────
  const isAuthorShape = (b && b.author === true)
    || /YOU ARE WRITING AS S\. TORY BOUND|STORYBOUND ARCHITECTURE LAWS|THIS IS THE LAST PROSE IN THE SCENE/i.test(both);
  if (isAuthorShape && both.length > 20000) {
    const n = authorReqs.length + 1;
    const fname = `AUTHOR_REQUEST_${n}.txt`;
    fs.writeFileSync(OUT + '/' + fname,
      `=== CONTINUATION AUTHOR · role=${role} · model=${b && b.model}\n\n`
      + `=== SYSTEM (${sys.length} chars) ===\n${sys}\n\n=== USER (${usr.length} chars) ===\n${usr}\n`);
    authorReqs.push({ sys, usr, role, file: fname });
    rec.door = 'AUTHOR(captured+aborted)';
    doors.push({ door: 'AUTHOR(captured+aborted)', role });
    return route.abort();
  }

  // ── EVERY OTHER DOOR, answered from a labelled fixture ────────────────────────────────
  if (/canonicalization and normalization engine for Storybound|archetypal distillation/.test(both)) {
    return give(JSON.stringify({ canonical_instruction: usr.slice(0, 120), changed: false,
      rejection_reason: null, substitutions: [] }), 'NORMALIZATION');
  }
  if (/CHARACTER MEMORY EXTRACTOR/.test(both)) {
    return give(JSON.stringify({
      characters: [{ name: 'Julian', present: true, relationshipToPC: null, newLayer: null, vehicle: 'none', framing: null }],
      scene: { chargeTier: 'high', interpretiveDensity: 'measured', loadedSentenceRatio: 0.3 },
      sceneState: { setting: 'the emptied ceremony clearing', charactersPresent: ['Lirael', 'Julian'],
        protagonistStatus: 'still holding the ledger page', decisiveChange: 'he answered',
        activeInterlocutor: 'Julian', protagonistAlone: false },
      relations: [] }), 'MEMORY_EXTRACTOR');
  }
  if (/RUNTIME COMMIT verifier/i.test(sys)) {
    // A CONTROLLED RECONSTRUCTION, NOT A RESPONSE REPLAY. The provider's original reply for this
    // assessment was not preserved; what the run preserved is the VERDICT the engine derived from
    // it. This fixture rebuilds a reply whose fields reproduce that verdict — aggregate MISSED,
    // milestone PARTIAL, the recorded evidence spans, and one per-proposal MISSED with reason
    // incomplete_rendering — so the commit pass reaches the same classification. It is this file's
    // construction, labelled as such; it is not what the model said. Any other scene gets a
    // neutral reply that asserts nothing.
    const n2 = commitReqs.length + 1;
    fs.writeFileSync(OUT + '/COMMIT_VERIFIER_REQUEST_' + n2 + '.txt',
      `=== SYSTEM ===\n${sys}\n\n=== USER ===\n${usr}\n`);
    const asksRow6 = usr.indexOf(ROW6_TEXT.slice(0, 120)) !== -1;
    commitReqs.push({ asksRow6, usr: usr.length });
    const refs = [...usr.matchAll(/\bprop:\d+:\d+\b/g)].map((m) => m[0]);
    if (asksRow6) {
      return give(JSON.stringify({ delivery: SCENE6_VERDICT.aggregateDelivery,
        transition_position: -1, first_irreversible_position: 40,
        milestone_delivery: SCENE6_VERDICT.milestoneDelivery,
        milestone_evidence: SCENE6_VERDICT.milestoneEvidence,
        per_proposal: refs.slice(0, 1).map((r2) => ({ ref: r2, delivery: 'MISSED',
          evidence: '', precondition_evidence: '', reason: 'incomplete_rendering' })),
        prereq_watch: [], milestone_watch: [] }),
        'COMMIT_VERIFIER(controlled reconstruction of the recorded scene-6 verdict)');
    }
    return give(JSON.stringify({ delivery: 'MISSED', transition_position: -1,
      first_irreversible_position: 40, milestone_delivery: 'MISSED', milestone_evidence: '',
      per_proposal: [], prereq_watch: [], milestone_watch: [] }), 'COMMIT_VERIFIER(neutral)');
  }
  if (/narrative skeletons for fiction scenes|CAUSAL_OUTLINE/.test(both)) {
    return give(JSON.stringify({
      environment_anchor: 'the emptied ceremony clearing',
      structural_pacing: 'tightening', narrative_density: 'close', dialogue_ratio: 'measured',
      beat_style: 'pressure then answer', tension_rhythm: 'rising',
      staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON', role: 'protagonist' },
        { name: 'Julian', presence_mode: 'IN_PERSON', role: 'love_interest' }],
      interlocutor_placement: 'he is close enough to be answered',
      causal_outline: [{ beat: 'she asks about the inventory history' },
        { beat: 'he names himself as her father\'s Chayr', link: 'therefore', from: 1 },
        { beat: 'she decides what to do with it', link: 'therefore', from: 2 }],
    }), 'SKELETON');
  }
  // A generic JSON-shaped answer for the remaining support doors, labelled by role. These are
  // not the boundary under test; they exist so the turn can reach the planner and the author.
  if (/Return ONLY JSON|Output STRICT JSON|respond with JSON|JSON ONLY/i.test(both)) {
    return give(JSON.stringify({ ok: true, notes: [], beats: [], characters: [], items: [],
      hardBeats: [], lines: [], panels: [], summary: 'fixture' }), 'GENERIC_JSON(' + role + ')');
  }
  // PROSE-shaped support doors (line editor, specialist renderer, synopsis).
  return give(PROSE, 'GENERIC_PROSE(' + role + ')');
});

let resumed = null, submitted = 'not attempted', installed = null;
try {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.continueStory === 'function'
    && typeof window._recoveryHandoff === 'function', { timeout: 60000 });

  section('A — THE CHECKPOINT IS RESUMED BY PRODUCTION\'S OWN CONTINUE WORKFLOW');
  installed = await page.evaluate(() => {
    const raw = localStorage.getItem('sb_saved_story');
    const sv = raw ? JSON.parse(raw) : null;
    return { present: !!sv, storyId: sv && sv.storyId,
      logKeys: Object.keys(((sv && sv.stateSnapshot && sv.stateSnapshot._committedState) || {}).deliveryLog || {}),
      turnCount: sv && sv.stateSnapshot && sv.stateSnapshot.turnCount };
  });
  note('the installed save', JSON.stringify(installed));
  check('the preserved checkpoint is in the browser\'s own storage, UNCHANGED — no scene-6 verdict'
    + ' has been inserted, so the turn\'s own assessment must establish it',
    installed.present && installed.storyId === STORY_ID
    && installed.logKeys.join(',') === '2,3,4,5', JSON.stringify(installed.logKeys));

  // ── RUN3'S PLANNING CONFIGURATION, RESTORED BEFORE CONTINUE ────────────────────────────
  // The preserved run was driven in FRESH-PLAN mode: the authored STARTER_PLANS rows are withheld
  // so the GENERATED scaffold supplies every assignment. Resuming without that is not just
  // "another valid configuration" — the authored row 6 (a wish-discovery) and the generated row 6
  // (the cup repair) are different obligations that share a number, so the run's recorded scene-6
  // verdict would be attached to an assignment it was never about. The seed and the saved
  // generated scaffold are untouched; only the authored row list is withheld, exactly as the run
  // did it (app.js:144955 reads STARTER_PLANS[_starterId]).
  const withheld = await page.evaluate((starter) => {
    const sp = (window.STARTER_PLANS || {})[starter];
    if (!sp || !Array.isArray(sp.scenes)) return { ok: false, why: 'no authored plan for ' + starter };
    window.__withheldRows = sp.scenes;
    sp.scenes = [];
    return { ok: true, withheldCount: (window.__withheldRows || []).length,
      rowsNow: (sp.scenes || []).length,
      seedPresent: !!((window.STARTER_SEEDS || {})[starter]) };
  }, SAVE.stateSnapshot._starterId);
  note('fresh-plan withholding, applied BEFORE Continue', JSON.stringify(withheld));
  check('the authored rows are withheld before the resume, as the preserved run had them',
    withheld.ok === true && withheld.withheldCount === 20 && withheld.rowsNow === 0,
    JSON.stringify(withheld));
  check('…and the seed is NOT withheld — only the authored row list is',
    withheld.seedPresent === true, String(withheld.seedPresent));

  resumed = await page.evaluate(async (id) => {
    try { await Promise.race([window.continueStory(id), new Promise((r) => setTimeout(r, 90000))]); }
    catch (e) { return { ok: false, threw: String(e && e.message) }; }
    const S = window.state || {};
    S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
    S.storypassEligible = true; S.storyLength = 'novella';
    window._forceDeckMandate = false;
    const h = window._recoveryHandoff(S, (S.turnCount || 0) + 2);
    return { ok: true, storyId: S.storyId, turnCount: S.turnCount, renderMode: S.renderMode,
      starter: S._starterId, hasSubmit: !!document.getElementById('submitBtn'),
      sceneNext: (S.turnCount || 0) + 2,
      owed: window._recoveryOwedRows(S, (S.turnCount || 0) + 2).map((r) => r.n + ':' + r.status),
      handoffRow: h && h.obligation ? h.obligation.n : null,
      ranking: h && h.ranking, rankingStatus: h && h.rankingStatus };
  }, STORY_ID);
  note('the resume', JSON.stringify(resumed));
  check('the REAL Continue workflow restored the story (window.continueStory → loadStoryData)',
    !!(resumed && resumed.ok && resumed.storyId === STORY_ID && resumed.turnCount === 5),
    JSON.stringify(resumed));
  check('…and after that resume there IS an outstanding obligation for the next scene',
    !!(resumed && resumed.handoffRow) && (resumed.owed || []).length >= 2,
    JSON.stringify(resumed && resumed.owed));
  note('the selection ranking in force', resumed && (resumed.ranking + '  [' + resumed.rankingStatus + ']'));
  check('the Submit control is present, so a real turn can be submitted',
    !!(resumed && resumed.hasSubmit));

  if (resumed && resumed.ok && resumed.hasSubmit) {
    section('B — ONE TURN, SUBMITTED THROUGH THE REAL CONTROL');
    submitted = await page.evaluate(async () => {
      const S = window.state;
      S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
      S.storypassEligible = true; S.storyLength = 'novella';
      window._forceDeckMandate = false;
      const a = document.getElementById('actionInput');
      if (a) a.value = 'I ask Julian how he knew the relic was never on the inventory';
      const d = document.getElementById('dialogueInput'); if (d) d.value = '';
      const btn = document.getElementById('submitBtn');
      if (!btn) return 'no submit control';
      btn.disabled = false; btn.click();
      await new Promise((r) => setTimeout(r, 240000));
      return 'clicked';
    });
    note('submit', submitted);
  }
} catch (err) {
  line('HARNESS ERROR: ' + (err && err.message));
} finally {
  const after = await page.evaluate(() => {
    const S = window.state || {};
    const st = (n) => { try { const x = window._outlineDeliveryStatus(S, n); return n + ':' + x.status; } catch (_) { return n + ':?'; } };
    let owed = [];
    try { owed = window._recoveryOwedRows(S, 7).map((r) => r.n + ':' + r.status); } catch (_) {}
    return { dispositions: S._recoveryDispositions || {}, turnCount: S.turnCount,
      rowStatuses: [2, 3, 4, 5, 6].map(st), owedAt7: owed,
      deliveryLog: Object.keys(((S._committedState || {}).deliveryLog) || {}),
      verdict6: (((S._committedState || {}).deliveryLog) || {})['6'] || null,
      milestoneDeliveries: (S._milestoneDeliveries || []).length };
  }).catch(() => ({ dispositions: {}, turnCount: null }));
  // THE SOURCE PROBE, taken while the page is still open. The row it asks about is read out of the
  // captured planner request, so nothing here depends on which row the ranking selected.
  const askedRowLive = plannerReqs.length
    ? Number((plannerReqs[0].usr.match(/STILL OWED — assigned at scene (\d+)/) || [])[1]) : 0;
  const srcData = await page.evaluate((askedRow) => {
    const S = window.state || {};
    const arcs = ((S.cgScaffold || {}).issueArcs) || [];
    const bd = (typeof window._issueOutlineBounds === 'function') ? window._issueOutlineBounds(S) : null;
    const arc = arcs.length ? ((bd && arcs[bd.issueIndex - 1]) || arcs[arcs.length - 1]) : null;
    const rowOf = (n) => (((arc && arc.sceneOutline) || []).filter((r) => Number(r.n) === Number(n))[0] || null);
    const authoredOf = (n) => ((window.__withheldRows || []).filter((r) => Number(r.n) === Number(n))[0] || null);
    const dueScene = (S.turnCount || 0) + 2;
    let a = null;
    try { a = window._selectSceneAssignment(S, dueScene); } catch (_) {}
    const dueRow = rowOf(dueScene), askRow = rowOf(askedRow), askAuth = authoredOf(askedRow);
    return { dueScene, dueSource: a && a.source, dueEvent: a && a.event,
      dueScaffoldText: dueRow ? String(dueRow.accomplishes || '') : null,
      askedScaffoldText: askRow ? String(askRow.accomplishes || '') : null,
      askedAuthoredText: askAuth ? String(askAuth.goal || '') : null,
      authoredStillWithheld: (((window.STARTER_PLANS || {})[S._starterId] || {}).scenes || []).length === 0 };
  }, askedRowLive).catch(() => ({}));
  globalThis.__src = srcData;
  fs.writeFileSync(OUT + '/SOURCE_PROBE.json', JSON.stringify(srcData, null, 2));
  fs.writeFileSync(OUT + '/DISPOSITIONS.json', JSON.stringify(after, null, 2));
  fs.writeFileSync(OUT + '/CALLS.json', JSON.stringify(calls, null, 2));
  globalThis.__after = after;
  await browser.close();
}

const after = globalThis.__after || { dispositions: {} };

section('B2 — THE ASSIGNMENTS COME FROM THE GENERATED SCAFFOLD, WHOLE');
// Both rows that matter here — the DUE row and the OUTSTANDING row the ranking selected — must be
// the GENERATED scaffold's own, carried complete. Which row the ranking picks is not asserted: the
// row is read out of the captured request.
if (!plannerReqs.length) {
  inconclusive('the assignments come from the generated scaffold',
    'no planner request was captured, so there is nothing to read the rows out of');
} else {
  const askedRow0 = Number((plannerReqs[0].usr.match(/STILL OWED — assigned at scene (\d+)/) || [])[1]);
  const askedText0 = (plannerReqs[0].usr.match(/Its ORIGINAL assignment, whole: "([^"]+)"/) || [])[1];
  const dueText0 = (plannerReqs[0].usr.match(/THIS SCENE'S CURRENT ASSIGNMENT, restated so the two are decided together: "([^"]+)"/) || [])[1];
  const src = globalThis.__src || {};
  note('the due row', src.dueScene + ' · source "' + src.dueSource + '"');
  note('the outstanding row the ranking selected', askedRow0);
  check('the DUE row\'s assignment comes from the generated outline, not an authored plan row',
    src.dueSource === 'issue-outline', String(src.dueSource));
  check('…and the planner received it WHOLE — identical to the generated scaffold\'s own text',
    !!dueText0 && dueText0 === src.dueScaffoldText,
    'sent ' + (dueText0 || '').length + ' vs scaffold ' + String(src.dueScaffoldText || '').length);
  check('the SELECTED OUTSTANDING row\'s assignment is also the generated scaffold\'s own, whole',
    !!askedText0 && askedText0 === src.askedScaffoldText,
    'sent ' + (askedText0 || '').length + ' vs scaffold ' + String(src.askedScaffoldText || '').length);
  check('…and it is NOT the authored row of the same number — the two are different obligations',
    !!src.askedAuthoredText && src.askedScaffoldText !== src.askedAuthoredText
    && askedText0 !== src.askedAuthoredText,
    'authored: ' + String(src.askedAuthoredText || '').slice(0, 90));
  note('the authored row of that number, withheld', String(src.askedAuthoredText).slice(0, 160));
  check('…and the authored rows were still withheld at the end of the turn',
    src.authoredStillWithheld === true, String(src.authoredStillWithheld));
}

section('C — THE PLANNER REQUEST CARRIES THE RECOVERY QUESTION');
note('planner requests captured', plannerReqs.length);
if (!plannerReqs.length) {
  inconclusive('the planner request carries the recovery question',
    'no SCENE-SPINE planner request was dispatched in this run, so nothing could be captured');
} else {
  const p = plannerReqs[0];
  note('planner request size', 'sys ' + p.sys.length + ' + usr ' + p.usr.length + ' chars → '
    + OUT + '/' + p.file);
  const blk = (p.usr.split('OUTSTANDING WORK FROM AN EARLIER SCENE')[1] || '').slice(0, 2600);
  if (blk) line(('OUTSTANDING WORK FROM AN EARLIER SCENE' + blk).split('\n')
    .map((l) => '        ' + l).join('\n'));
  check('the OUTGOING planner request asks what this scene does about the outstanding obligation',
    /OUTSTANDING WORK FROM AN EARLIER SCENE — DECIDE WHAT THIS SCENE DOES ABOUT IT/.test(p.usr));
  check('…it states this scene\'s CURRENT assignment and the ORIGINAL outstanding assignment',
    /THIS SCENE'S CURRENT ASSIGNMENT, restated so the two are decided together/.test(p.usr)
    && /STILL OWED — assigned at scene \d+ and recorded/.test(p.usr));
  check('…it reports what is already established at that row, or that nothing is',
    /ALREADY ESTABLISHED AT THAT SCENE|NOTHING from that assignment is recorded as established/.test(p.usr));
  check('…it does not claim to know the unfinished remainder',
    /does NOT compute "the part that is left"/.test(p.usr));
  check('…and the reply SCHEMA asks for the disposition',
    /"recovery"/.test(p.sys) && /incorporate\|defer\|retire/.test(p.sys + p.usr));
}

section('D — THE DECISION WAS RECORDED BY PRODUCTION, FROM THAT REPLY');
note('dispositions in state after the turn', JSON.stringify(after.dispositions));
note('row statuses after the turn', (after.rowStatuses || []).join('  '));
note('owed set at scene 7 after the turn', (after.owedAt7 || []).join('  '));
note('delivery log keys after the turn', (after.deliveryLog || []).join(','));
note('scene 6 verdict after the turn', after.verdict6 ? ('asked=' + after.verdict6.milestoneAsked
  + ' milestone=' + after.verdict6.milestoneDelivery + ' aggregate=' + after.verdict6.aggregateDelivery
  + ' committed=' + JSON.stringify(after.verdict6.committed)) : 'none');
const recs = Object.keys(after.dispositions || {}).map((k) => after.dispositions[k]);
if (!recs.length) {
  inconclusive('production recorded the disposition from its own parser',
    'no disposition reached state._recoveryDispositions in this run');
} else {
  const r = recs[0];
  check('production recorded a disposition WITHOUT this harness calling the recorder — it came'
    + ' from the planner reply through production\'s own parser',
    !!r && Number(r.decidedAtScene) === (resumed && resumed.sceneNext),
    JSON.stringify({ row: r.row, at: r.decidedAtScene, d: r.disposition }));
  // THE CLAIM IS CONSISTENCY, NOT WHICH ROW WON. The row is read out of the OUTGOING planner
  // request that was actually captured, so nothing here depends on the experimental ranking
  // selecting any particular obligation.
  const askedRow = plannerReqs.length
    ? Number((plannerReqs[0].usr.match(/STILL OWED — assigned at scene (\d+)/) || [])[1]) : null;
  note('the row the OUTGOING request asked about', askedRow);
  note('the row the pre-turn handoff would have selected', resumed && resumed.handoffRow);
  check('…the row recorded is the row the OUTGOING request asked about',
    askedRow != null && Number(r.row) === askedRow, r.row + ' vs ' + askedRow);
  if (askedRow !== (resumed && resumed.handoffRow)) {
    note('WHY THOSE TWO DIFFER', 'the turn\'s own commit pass re-assesses the PREVIOUS scene before '
      + 'the planner runs, so the owed set the planner sees is the one after that assessment. '
      + 'Nothing here asserts which row either ordering picks.');
  }
  if (DISPOSITION === 'none') {
    check('…A REPLY WITH NO "recovery" KEY leaves the obligation owed and records WHY, rather than'
      + ' dropping it silently', r.disposition === 'defer' && r.downgradedFrom === 'none'
      && /no usable disposition came back/.test(String(r.note)), String(r.note).slice(0, 180));
  } else if (DISPOSITION === 'incorporate') {
    check('…INCORPORATE was recorded as sent', r.disposition === 'incorporate', r.disposition);
  } else if (DISPOSITION === 'defer') {
    check('…DEFER was recorded as sent', r.disposition === 'defer', r.disposition);
  } else if (DISPOSITION === 'retire') {
    check('…the RETIREMENT was NOT granted on a citation alone — it is held as a deferral',
      r.disposition === 'defer' && r.downgradedFrom === 'retire' && r.established === false,
      JSON.stringify({ d: r.disposition, from: r.downgradedFrom, est: r.established }));
  }
  check('…and the record carries the experimental ranking that selected the row',
    /EXPERIMENTAL POLICY/.test(String(r.rankingStatus)), String(r.rankingStatus));
}

section('E — THE OUTGOING AUTHOR REQUEST CARRIES THE DECISION');
note('author requests captured', authorReqs.length);
if (!authorReqs.length) {
  inconclusive('the author request carries the decision',
    'no author request was dispatched in this run, so nothing could be captured');
} else {
  const a = authorReqs[authorReqs.length - 1];
  const t = a.sys + '\n' + a.usr;
  note('author request size', 'sys ' + a.sys.length + ' + usr ' + a.usr.length + ' chars (role '
    + a.role + ') → ' + OUT + '/' + a.file);
  const want = DISPOSITION === 'incorporate' ? /THIS SCENE ALSO CARRIES UNFINISHED WORK FROM SCENE \d+/
    : DISPOSITION === 'retire' ? /STILL OWED FROM SCENE \d+, AND DELIBERATELY NOT THIS SCENE'S WORK/
      : /STILL OWED FROM SCENE \d+, AND DELIBERATELY NOT THIS SCENE'S WORK/;
  const hit = t.match(want);
  const ctx2 = hit ? t.slice(Math.max(0, t.indexOf(hit[0]) - 200), t.indexOf(hit[0]) + 1400) : '';
  if (ctx2) line(ctx2.split('\n').map((l) => '        ' + l).join('\n'));
  check('the decision reaches the AUTHOR\'S OWN ASSIGNMENT BLOCK in the outgoing request',
    !!hit && /HARD — this is the scene's ASSIGNMENT/.test(t),
    (t.split('\n').filter((l) => /UNFINISHED WORK|DELIBERATELY NOT THIS SCENE/.test(l))[0] || '(absent)').slice(0, 200));
  // THE SAME STRING, END TO END: parsed out of the OUTGOING PLANNER request and required
  // verbatim in the OUTGOING AUTHOR request. Nothing is matched against a literal in this file.
  const askedText = plannerReqs.length
    ? (plannerReqs[0].usr.match(/Its ORIGINAL assignment, whole: "([^"]+)"/) || [])[1] : null;
  note('the obligation text the planner was given', String(askedText).slice(0, 180));
  check('…with the SAME original assignment the planner was given, carried verbatim into the'
    + ' author request', !!askedText && t.indexOf(askedText) !== -1,
    askedText ? 'len ' + askedText.length : 'not parsed');
  if (DISPOSITION === 'incorporate') {
    check('…and it does not demand two scenes\' worth of events',
      /the purpose above comes first and this stays owed/.test(t.replace(/\s+/g, ' ')));
    check('…and it says writing it here does not settle it',
      /owed until a scene is verified to have delivered it/.test(t.replace(/\s+/g, ' ')));
  } else {
    check('…and the author is told not to half-deliver it',
      /do NOT gesture at completing it/.test(t));
  }
  fs.writeFileSync(OUT + '/AUTHOR_ASSIGNMENT_BLOCK.txt',
    (t.split('THIS SCENE\'S PURPOSE WITHIN')[1] || t).slice(0, 12000));
}

section('SCOPE AND PROVIDER-FREE ATTESTATION');
const answered = calls.filter((c) => c.answered).length;
const capturedOnly = calls.filter((c) => !c.answered).length;
note('doors answered from local fixtures', answered);
note('requests captured and aborted', capturedOnly);
note('off-origin requests aborted', aborted.length);
note('page/asset responses served', pageServed);
note('door inventory', [...new Set(doors.map((d) => d.door))].join(' · '));
note('commit-verifier requests', commitReqs.map((c) => (c.asksRow6 ? 'row6' : 'other')).join(','));
check('every /api request was answered from a local fixture or captured-and-aborted — zero'
  + ' provider dispatches', answered + capturedOnly === calls.length,
  answered + ' + ' + capturedOnly + ' vs ' + calls.length);
note('NOT exercised', 'a real model\'s judgement — every reply here is a stub written by this '
  + 'file; the quality of a recovery scene; and anything about whether the planner would choose '
  + 'the disposition a reader would want.');

line('');
line('='.repeat(88));
line('  PASS ' + PASS + ' · FAIL ' + FAIL + ' · INCONCLUSIVE ' + INCONCLUSIVE
  + '   (disposition mode: ' + DISPOSITION + ')');
for (const f of FAILURES) line('    FAILED: ' + f);
for (const i of INCONCLUSIVES) line('    INCONCLUSIVE: ' + i);
line('  These are the tested cases. They are not a statement about untested paths.');
line('='.repeat(88));
process.exit(FAIL ? 1 : 0);
