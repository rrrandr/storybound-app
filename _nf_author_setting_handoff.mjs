#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE SETTING HANDOFF IN THE AUTHOR'S OWN REQUEST — PROVIDER-BLOCKED.
//
// WHY THIS EXISTS. _nf_input_delivery_controls.mjs section E captures the SKELETON PLANNER's
// outgoing body. That is not the author's request, and the author is where the contradictory
// clearing mandate was actually delivered in run_2026-11-02T19-03-47-893Z_29351. This drives the
// real literary #submitBtn through COMPLETE author-request assembly with every provider blocked,
// and asserts on the captured author packet:
//    · the scene's current assignment reaches it whole
//    · a PARSED setting is labelled a parse there, not issued as "REQUIRED SETTING (given"
//    · a CARRIED anchor does not command the opening sentence
//    · an INFERRED character mention is not "MUST BE PRESENT"
//
// IT IS DELIVERY VERIFICATION. The planner's own judgement is not exercised: nothing here says
// the real planner would choose the right place. One NORMALIZATION fixture is served because
// production BLOCKS the turn when normalization fails; the author request itself is captured and
// ABORTED. Nothing leaves the machine and nothing is billed.
//
// Usage:  node _nf_author_setting_handoff.mjs        (needs the dev server on :3000)
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const RUN = process.env.SB_RUN_DIR
  || '/Users/romantsukerman/storybound-diag/_nf_story_test_RUN3/run_2026-11-02T19-03-47-893Z_29351';
const OUT = '_nf_author_handoff_out';
fs.mkdirSync(OUT, { recursive: true });
let PASS = 0, FAIL = 0, INCONCLUSIVE = 0;
const FAILURES = [], INCONCLUSIVES = [];
const say = (m) => { console.log(m); fs.appendFileSync(OUT + '/RUN.log', m + '\n'); };
fs.writeFileSync(OUT + '/RUN.log', '');
const note = (l, v) => say('  ----  ' + l + ' :: ' + String(v).replace(/\n/g, ' ').slice(0, 300));
function check(label, ok, detail) {
  if (ok) { PASS++; say('  PASS  ' + label); }
  else { FAIL++; FAILURES.push(label); say('  FAIL  ' + label + (detail ? '  :: ' + String(detail).slice(0, 300) : '')); }
}
function inconclusive(label, why) {
  INCONCLUSIVE++; INCONCLUSIVES.push(label + ' — ' + why);
  say('  ????  ' + label + '\n        INCONCLUSIVE: ' + why);
}

// THE PRECEDING SCENE IS THE RUN'S OWN PROSE, as the reader read it. Not retyped.
const PRECEDING = fs.readFileSync(RUN + '/scene03.txt', 'utf8').trim();
// The anchor the previous scene's skeleton was built on — the clearing. Verbatim from the run's
// own scene-4 author request, so the carried-anchor case is the one that actually happened.
const REQ4 = fs.readFileSync(RUN + '/AUTHOR_REQUEST_scene4.json', 'utf8');
const CARRIED_ANCHOR = (REQ4.match(/must begin from this physical object or phenomenon: ([^\\"\n]{10,120})/) || [])[1]
  || 'the ceremony clearing ringed by mated-pair trunks';

// THE RUN'S OWN GENERATED SCAFFOLD AND ITS PLAN CONFIGURATION. run_2026-11-02T19-03-47 ran in
// FRESH-PLAN mode — its RUN.log line 2 is "PRE-LAUNCH FRESH-PLAN: rows 20 → 0 · seed registered:
// true · funded spine: true" — so the authored STARTER_PLANS rows were withheld and the Sol-served
// scaffold supplied every assignment. That configuration is reapplied here by the same existing
// mechanism (_nf_literary_playthrough.mjs → applyFreshPlanMode): rows emptied, SEED intact, and the
// scaffold taken from the saved checkpoint instead of generated (which would need a provider).
const CHECKPOINT = JSON.parse(JSON.parse(
  fs.readFileSync(RUN + '/STATE_after_scene3.json', 'utf8')).storage.sb_saved_story).stateSnapshot;
const SAVED_SCAFFOLD = CHECKPOINT.cgScaffold || null;

const ACTION = 'I keep my hand flat on the cloth and do not lift it.';
const DIALOGUE = 'Ask me here, then. I am not moving it for anyone.';

const PASSTHROUGH = /\/api\/(geo|csp-report|beta-events)\b/;
const calls = [];
const logs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('console', (m) => logs.push(m.text()));
page.on('pageerror', (e) => logs.push('[PAGEERROR] ' + (e && e.message)));
await installSession(page, makeSession());
await installEntitledProfileStub(page, { log: () => {} });

let normServed = 0;
await page.route('**/*', async (route) => {
  const req = route.request();
  const url = req.url();
  if (isAuthOrigin(url)) return route.fallback();
  if (/\/api\/config\b/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  }
  if (/\/api\/(consume-fortune|refund-fortune)/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
  }
  if (/\/api\/(img-proxy|bfl-kontext|image|grok-image|dashscope-image|visualize-flux)/.test(url)) {
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"images blocked"}' });
  }
  if (PASSTHROUGH.test(url) || !/\/api\//.test(url)) return route.fallback();
  let body = null;
  try { body = req.postData(); } catch (_) { body = null; }
  let parsed = {}; try { parsed = JSON.parse(body || '{}'); } catch (_) {}
  const role = String(parsed.role || '');
  calls.push({ url, method: req.method(), bytes: body ? body.length : 0, body, role });
  // ONE DECLARED FIXTURE, for the pass that BLOCKS the turn when it fails ("If normalization
  // fails, the action is blocked", app.js:18489). It echoes the reader's text unchanged, which is
  // the layer's own documented expected outcome — this test is not about the guard.
  if (role === 'NORMALIZATION') {
    normServed += 1;
    let txt = '';
    try { txt = String(JSON.parse(parsed.messages[parsed.messages.length - 1].content).user_text || ''); }
    catch (_) { txt = ''; }
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, canonical_instruction: txt, changed: false, substitutions: [] }) });
  }
  try { return await route.abort(); } catch (_) { return; }
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && Array.isArray(window.STARTER_STORIES), null, { timeout: 120000 });

// The literary run has no baked CG page; returning null for this tab is how the existing chain
// harness runs literary First Sacrifice. The shipped catalog entry is untouched.
await page.evaluate(() => {
  if (typeof window._bakedScene1For === 'function') {
    window.__realBakedScene1For = window._bakedScene1For;
    window._bakedScene1For = function () { return null; };
  }
});
const def = await page.evaluate(() => (window.STARTER_STORIES || [])
  .find((d) => d && d.id === 'starter_first_sacrifice') || null);
if (!def) { say('FATAL: starter_first_sacrifice is not in the shipped catalog'); await browser.close(); process.exit(1); }
await page.evaluate(async (d) => {
  try { await window._launchStarterStory(Object.assign({}, d, { render_mode: 'literary' })); }
  catch (e) { console.log('[LAUNCH] ' + e.message); }
}, def);
await page.waitForTimeout(8000);

// ── MOUNT THE PRECEDING SCENE AND INSTALL THE CARRIED-ANCHOR CONDITION ───────────────────
// The scene record goes in through production's own door (_sbPersistSceneProjection) and the page
// through StoryPagination.addPage, the same call the finalize path makes.
//
// turnCount = 2, so _currentSceneNumber(state) = 4: the scene about to be built is the one whose
// delivery failed in the run. The counter is set ONCE here, as the mounted history requires, and
// never adjusted afterwards to make a stamp match.
//
// THE SKELETON SLOT HOLDS THE PREVIOUS SCENE'S ANCHOR, which is the real condition: a single
// mutable slot carrying scene 3's clearing while scene 4 is assembled. _skeletonMeta.generatedAt
// equals turnCount so _isSkeletonValid() REUSES it and no generator call is needed — the anchor
// under test is the carried one, not a fixture's.
const mounted = await page.evaluate(({ openingText, anchor, scaffold }) => {
  const s = window.state;
  s.profileId = 'author-handoff-profile';
  s._bakedGenesisUnlocked = true; s.previewActive = false;
  s._issuePurchased = true; s._issuesPurchased = { 1: true };
  s.fortunes = 9999999; s.access = 'sub'; s.subscribed = true;
  s.hasSeenFortuneTurnDisclosure = true;
  s.picks = s.picks || {}; s.picks.world = 'Fantasy';
  if (!Array.isArray(s.scenes)) s.scenes = [];
  let rec = null, err = null;
  try {
    rec = window._sbPersistSceneProjection({ input: openingText, kind: 'body',
      title: 'The Reading', synopsis: 'Veyra Solin records the bond as intact and demands the sash.' });
  } catch (e) { err = 'persist threw: ' + e.message; }
  try { window.StoryPagination.addPage(openingText, true,
    rec && rec.uid ? rec.uid : undefined, { kind: 'body' }); } catch (e) { err = (err || '') + ' page: ' + e.message; }
  s.turnCount = 2;
  s.sceneSkeleton = {
    environment_anchor: anchor,
    environment_anchor_for: 3,                     // produced for the PREVIOUS scene
    environment_anchor_turn: s.turnCount,          // and its turn stamp MATCHES, on purpose
    environment_anchor_src: 'generated',
    structural_pacing: 'controlled tension', narrative_density: 'high', dialogue_ratio: 'balanced',
    beat_style: 'measured', tension_rhythm: 'escalating',
    staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON', role: 'protagonist' },
      { name: 'Julian', presence_mode: 'IN_PERSON', role: 'love interest' }],
    _builtForScene: 3,
  };
  s._skeletonMeta = { generatedAt: s.turnCount, sceneNumber: null, openingScene: false,
    relationship_phase: s.relationship_phase,
    storyturn: (s.narrativeState && s.narrativeState.storyturn_state) || s.storyturn || '',
    location: (s.physicalState && s.physicalState.location) || '',
    explicitAuth: !!s.explicitEmbodimentAuthorized };
  // THE RUN'S PLAN CONFIGURATION: authored rows withheld, seed intact, saved scaffold installed.
  const sp = (window.STARTER_PLANS || {})[s._starterId];
  const rowsBefore = (sp && Array.isArray(sp.scenes)) ? sp.scenes.length : 0;
  if (sp) { window.__withheldRows = sp.scenes; sp.scenes = []; }
  if (scaffold) s.cgScaffold = scaffold;
  s._sceneAssignment = null; s._issueOutline = null;
  return { recordWritten: !!(rec && rec.uid), err, turnCount: s.turnCount,
    rowsWithheld: rowsBefore + ' → ' + ((sp && sp.scenes) ? sp.scenes.length : '?'),
    seedAlive: !!(typeof window._activeSeed === 'function' && window._activeSeed(s)),
    scaffoldRows: s.cgScaffold
      ? (s.cgScaffold.issueArcs || []).reduce((n, a) => n + ((a.sceneOutline || []).length), 0) : 0,
    csn: window._currentSceneNumber ? window._currentSceneNumber(s) : null,
    skeletonValid: typeof window._isSkeletonValid === 'function' ? window._isSkeletonValid() : null,
    pages: window.StoryPagination.getPageCount() };
}, { openingText: PRECEDING, anchor: CARRIED_ANCHOR, scaffold: SAVED_SCAFFOLD });
say('mounted: ' + JSON.stringify(mounted));
check('the scene about to be built is 4, derived from the mounted counter alone',
  mounted.turnCount === 2 && mounted.csn === 4, JSON.stringify(mounted));
// _isSkeletonValid is closure-scoped and not exposed, so reuse is NOT asserted from state here;
// it is read off the captured packet below, where the anchor line names the scene it was made for.
note('_isSkeletonValid() readable from the page', String(mounted.skeletonValid));
note('the carried anchor', CARRIED_ANCHOR);
check('the run\'s plan configuration is reapplied: authored rows withheld, seed intact, saved scaffold installed',
  mounted.rowsWithheld === '20 → 0' && mounted.seedAlive === true && mounted.scaffoldRows >= 20,
  JSON.stringify(mounted));

// ── DRIVE THE REAL LITERARY SUBMIT ───────────────────────────────────────────────────────
const clickedAt = calls.length;
const clicked = await page.evaluate((inputs) => {
  const b = document.getElementById('submitBtn');
  if (!b) return { btn: false };
  const a = document.getElementById('actionInput');
  const d = document.getElementById('dialogueInput');
  if (a) { a.value = inputs.action; try { a.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {} }
  if (d) { d.value = inputs.dialogue; try { d.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {} }
  b.disabled = false; b.click();
  return { btn: true, typedAction: a ? a.value : null, typedDialogue: d ? d.value : null,
    modalsShown: ['fortuneDisclosureModal', 'issueCliffhangerModal', 'starterUnlockModal',
      'bakedUnlockConfirm', 'paywallModal', 'emergenceModal'].filter((id) => {
        const el = document.getElementById(id); return el && !el.classList.contains('hidden'); }) };
}, { action: ACTION, dialogue: DIALOGUE });
say('clicked the literary submit: ' + JSON.stringify(clicked));

for (let w = 0; w < 150000; w += 3000) {
  await page.waitForTimeout(3000);
  if (calls.slice(clickedAt).some((c) => /SCENE CONTINUATION \(HARD/.test(c.body || ''))) break;
}
await page.waitForTimeout(6000);

const after = calls.slice(clickedAt);
say('requests after the click: ' + after.length);
after.forEach((c, i) => say('  [' + i + '] ' + c.url + '  role=' + (c.role || '-') + '  ' + c.bytes + 'B'));
const authorCalls = after.filter((c) => /SCENE CONTINUATION \(HARD/.test(c.body || ''));
fs.writeFileSync(OUT + '/calls.json', JSON.stringify(after.map((c) => ({ url: c.url, role: c.role, bytes: c.bytes })), null, 2));
fs.writeFileSync(OUT + '/console.log', logs.join('\n'));
authorCalls.forEach((c, i) => fs.writeFileSync(OUT + '/author_request_' + i + '.json', c.body || ''));

check('COMPLETE author-request assembly was reached and captured', authorCalls.length > 0,
  after.length + ' requests after the click, none carrying the continuation contract');
if (!authorCalls.length) {
  say('gate-ish console lines:\n  '
    + logs.filter((l) => /GUARD|GATE|refus|denied|blocked|submit|ASSIGNMENT/i.test(l)).slice(-25).join('\n  '));
} else {
  // THE AUTHOR PACKET, DECODED — not the JSON envelope.
  const pkt = authorCalls.map((c) => {
    let p = {}; try { p = JSON.parse(c.body || '{}'); } catch (_) {}
    return (p.messages || []).map((m) => String(m.content || '')).join('\n');
  }).join('\n');
  fs.writeFileSync(OUT + '/AUTHOR_PACKET_DECODED.txt', pkt);
  say('author packet(s): ' + authorCalls.length + ' · roles=' + authorCalls.map((c) => c.role || '-').join(' → ')
    + ' · decoded chars=' + pkt.length);

  const asg = await page.evaluate(() => {
    const a = window.state && window.state._sceneAssignment;
    return a && { source: a.source, event: a.event, setting: a.setting, inferred: !!a._settingInferred,
      participants: a.participants, participantsInferred: !!a._participantsInferred,
      sceneNumber: a.sceneNumber };
  });
  note('the assignment the turn actually selected', JSON.stringify(asg));
  fs.writeFileSync(OUT + '/ASSIGNMENT.json', JSON.stringify(asg, null, 2));

  // ── 1. THE CURRENT ASSIGNMENT REACHES THE AUTHOR WHOLE ────────────────────────────────
  check('the author receives the scene\'s assigned event sentence, complete',
    !!(asg && asg.event) && pkt.includes(asg.event),
    (pkt.match(/THIS SCENE'S PURPOSE[^\n]{0,160}/) || pkt.match(/ASSIGNED EVENT[^\n]{0,160}/) || [''])[0]);
  check('and it is the assignment for scene 4, not another scene',
    !!asg && Number(asg.sceneNumber) === 4, 'sceneNumber=' + (asg && asg.sceneNumber));

  // ── 2. A PARSED SETTING IS NOT A MANDATE IN THE AUTHOR'S REQUEST ──────────────────────
  // MEASURED FIRST, THEN ASSERTED. The labelled "read by a text parser, which may be wrong" line
  // belongs to the SKELETON prompt (_buildSceneAssignmentBlock); the author's own request has no
  // setting field at all. So what must hold here is that the parse reaches the author as NOTHING —
  // no mandate, no staging to treat as given, and not named as this scene's place.
  if (asg && asg.setting && asg.inferred) {
    check('a PARSED setting is not issued to the author as "REQUIRED SETTING (given"',
      !/REQUIRED SETTING \(given/.test(pkt), (pkt.match(/REQUIRED SETTING[^\n]{0,120}/) || [''])[0]);
    check('…nor as any REQUIRED SETTING or SETTING: line at all',
      !/REQUIRED SETTING/.test(pkt) && !/\bSETTING:/.test(pkt),
      (pkt.match(/[^\n]*(REQUIRED SETTING|SETTING:)[^\n]*/) || [''])[0]);
    check('…nor as staging the author is told to treat as given',
      !/treat as given, not as suggestion/.test(pkt),
      (pkt.match(/[^\n]{0,80}treat as given[^\n]{0,80}/) || [''])[0]);
    const placeRe = new RegExp('(?:scene is|set in|takes place|location)[^.\\n]{0,40}'
      + asg.setting.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    check('…and the parsed value "' + asg.setting + '" is never named as this scene\'s place',
      !placeRe.test(pkt), (pkt.match(placeRe) || [''])[0]);
  } else {
    inconclusive('a PARSED setting is not issued to the author as a mandate',
      'this turn\'s assignment carries ' + (asg && asg.setting ? 'a SUPPLIED setting' : 'no setting')
      + ', so the parsed-setting case is not exercised here');
  }

  // ── 3. THE CARRIED ANCHOR DOES NOT COMMAND THE OPENING ────────────────────────────────
  check('the carried anchor reaches the author DEMOTED, not as an opening command',
    /SCENE ENVIRONMENT ANCHOR \(CARRIED OVER|SCENE ENVIRONMENT ANCHOR \(DEFERRED/.test(pkt),
    (pkt.match(/SCENE ENVIRONMENT ANCHOR[^\n]{0,120}/) || ['(no anchor line in the packet)'])[0]);
  check('…and no first-sentence mandate is issued from it anywhere in the packet',
    !/The first sentence must originate from this anchor/.test(pkt),
    (pkt.match(/[^\n]{0,60}first sentence must originate[^\n]{0,60}/) || [''])[0]);
  check('the anchor\'s own TEXT still reaches the author — demoted, not deleted',
    pkt.includes(CARRIED_ANCHOR), 'the anchor text is absent from the packet');

  // ── 4. AN INFERRED MENTION IS NOT A PRESENCE REQUIREMENT ──────────────────────────────
  // MUST BE PRESENT is likewise a SKELETON-prompt line; the author receives its cast through the
  // assignment sentence and the staged roster. So the question here is whether a presence
  // requirement is minted from a PARSE, and the answer is checked in the packet's own terms.
  if (asg && asg.participantsInferred) {
    check('an INFERRED character mention is not delivered to the author as a presence requirement',
      !/MUST BE PRESENT/.test(pkt), (pkt.match(/MUST BE PRESENT[^\n]{0,80}/) || [''])[0]);
  } else {
    inconclusive('an INFERRED character mention is not delivered as a presence requirement',
      'this turn\'s assignment supplies an AUTHORED participant list ('
      + JSON.stringify(asg && asg.participants) + '), so the inferred case is not exercised on this'
      + ' path; it is exercised against the emitter in _nf_input_delivery_controls.mjs');
    check('the AUTHORED participants do reach the author, inside the assignment itself',
      (asg.participants || []).every((n) => pkt.includes(String(n))),
      JSON.stringify(asg.participants));
  }
  check('no presence requirement is minted from a parse anywhere in the packet',
    !/MUST BE PRESENT/.test(pkt) || !!(asg && asg.participantsInferred === false),
    (pkt.match(/MUST BE PRESENT[^\n]{0,80}/) || [''])[0]);

  // ── 5. NO TWO PLACES COMMANDED AT ONCE ────────────────────────────────────────────────
  const mandates = (pkt.match(/must begin from this physical object or phenomenon: [^\n]{0,100}/g) || []);
  check('the author is commanded to open in AT MOST one place (measured: ' + mandates.length + ')',
    mandates.length === 0, mandates.join(' || '));
  const channels = (pkt.match(/[^\n]*(REQUIRED SETTING|SETTING:|ENVIRONMENT ANCHOR|STAGING \()[^\n]*/g) || []);
  note('every location channel in the author packet, for the record',
    channels.slice(0, 4).map((l) => l.trim().slice(0, 150)).join('  ||  '));
  check('the author\'s ONLY location channel is the demoted anchor',
    channels.length > 0 && channels.every((l) => /ENVIRONMENT ANCHOR \((CARRIED OVER|DEFERRED)/.test(l)),
    channels.length + ' channel line(s)');
}

say('');
say('========================================================================================');
say('  PASS ' + PASS + ' · FAIL ' + FAIL + ' · INCONCLUSIVE ' + INCONCLUSIVE);
if (FAILURES.length) say('  FAILURES:\n    · ' + FAILURES.join('\n    · '));
if (INCONCLUSIVES.length) say('  INCONCLUSIVE:\n    · ' + INCONCLUSIVES.join('\n    · '));
say('  These are the tested cases. They are not a statement about untested paths.');
say('  SCOPE: provider-blocked. ' + calls.length + ' /api requests recorded, '
  + normServed + ' NORMALIZATION fixture replies served, the author request captured and ABORTED.');
say('  This is DELIVERY verification: it does not show that the real planner would choose correctly.');
say('========================================================================================');
await browser.close();
process.exit(FAIL ? 1 : 0);
