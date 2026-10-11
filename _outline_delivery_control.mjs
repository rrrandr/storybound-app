// ── CONVERGENCE, DELIVERY TRUTH, AND THE REAL AUTHOR REQUEST (provider-free, $0) ────────────
// Drives the SHIPPED generators with every provider route intercepted and inspects the ACTUAL
// OUTGOING REQUESTS, not prompt fragments assembled by this file. Every model response here is
// CONSTRUCTED in this file and labelled as such. No provider is called; nothing is billed.
//
// WHAT THE PREVIOUS CONTROL GOT WRONG (reviewer, e61e5b43): it called __generateSceneSkeleton
// itself and then rendered a prompt fragment, which proves only that an already-populated
// scaffold can be rendered. Production never populated one on the CG path. Here the CG generator
// populates it, and the author request is read off the wire.
import { chromium } from 'playwright-core';
import fs from 'fs';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + String(detail).slice(0, 800) : '')); }
};
const section = (n) => console.log('\n' + n);

// ── CONSTRUCTED MODEL RESPONSES ─────────────────────────────────────────────────────────────
// 1. The SCENE SCAFFOLD. 21 causal developments (the CG contract asks 20-24), and it STOPS at the
//    reserved decision: nothing here has her sign.
const SCAFFOLD_BEATS = [
  ['The presiding Dohkar steps into the gap between the trunks and will not let Lirael pass', null],
  ['He tells her to stand where the assembly can still see her', 'therefore'],
  ['Lirael asks what this is; he unfolds a page instead of answering', 'therefore'],
  ['He reads the notice aloud: her conduct at the rite is under investigation', 'therefore'],
  ['Lirael says the wish twisted before she moved; he does not look up from the page', 'but'],
  ['She asks who will hear the matter; he declines to say', 'but'],
  ['The refusal tells her it has not been decided, which is worse', 'therefore'],
  ['He names the first restriction: she may supervise no rite', 'therefore'],
  ['Lirael says Seren is her ward and asks who will take her; he does not answer that either', 'but'],
  ['He names the second restriction: she may not leave the Veilwood', 'therefore'],
  ['Seren starts toward her across the spiralgrass and her mother pulls her back', 'therefore'],
  ['Lirael tries to speak to Seren and the Dohkar moves to block the line of sight', 'but'],
  ['He tells her that speaking to the Graduant is now also a breach', 'therefore'],
  ['Lirael asks who demanded the review', 'therefore'],
  ['He says Julian did, and says it as though it settles something', 'therefore'],
  ['Lirael looks for Julian among the dispersing assembly and does not find him', 'therefore'],
  ['She understands he did not come to say it to her himself', 'therefore'],
  ['An older Dohkar she has worked under for two years looks away from her', 'therefore'],
  ['The presiding Dohkar holds out the page and a stylus for her acknowledgement', 'therefore'],
  ['He tells her refusing to sign is itself recorded', 'but'],
  ['The page stays between them, and the assembly stops pretending not to watch', 'therefore'],
];
const CONSTRUCTED_SCAFFOLD = {
  environment_anchor: 'the gap between two trunks where the assembly came in',
  structural_pacing: 'measured escalation', narrative_density: 'moderate',
  dialogue_ratio: 'dialogue-led', beat_style: 'procedure then reaction',
  tension_rhythm: 'rising with pauses',
  staged_characters: [
    { name: 'Lirael', presence_mode: 'IN_PERSON', role: 'the subject of the notice' },
    { name: 'the presiding Dohkar', presence_mode: 'IN_PERSON', role: 'serves the notice' },
    { name: 'Seren', presence_mode: 'IN_PERSON', role: 'pulled away from her' },
    { name: 'Julian', presence_mode: 'OFFSTAGE_REFERENCED', role: 'named as demanding the review' },
  ],
  interlocutor_placement: 'the presiding Dohkar — the authority who ruled on the rite, who reads from a page he does not look up from',
  li_texture_beat: 'beat 16: she catches herself remembering Julian setting The Answer down with both hands and not letting go of it',
  pc_body_callback: 'beat 3 — stress_tic (the gossamer band she has nothing to do with now)',
  li_body_callback: null, antagonist_body_callback: null,
  environment_plus: { target: 'the gap between two trunks', axis: 'use' },
  fusion: null,
  causal_outline: SCAFFOLD_BEATS.map(([beat, link], i) => (link ? { beat, link, from: i } : { beat })),
  stage_contract: { present: ['Lirael', 'the presiding Dohkar', 'Seren'] },
};

// 2. The SCENE PLANNER's accepted objective, in the shape production validates.
const CONSTRUCTED_PLANNER = {
  posture_read: 'she waits for the authority rather than leaving',
  local_objective: 'The presiding Dohkar serves Lirael formal notice in the gap between the trunks',
  local_objective_actor: 'the presiding Dohkar',
  present: ['Lirael', 'the presiding Dohkar', 'Seren'],
  state_change: 'Lirael is formally under investigation and restricted',
  state_change_precondition: 'Lirael has not yet been told her conduct is under investigation',
  forces_choice: 'whether to sign the acknowledgement or refuse it',
  event_slots: {
    precondition: 'the presiding Dohkar is present in the scene',
    actor: 'the presiding Dohkar', action: 'serves formal notice of investigation',
    target: 'Lirael', exit_state: 'Lirael is formally under investigation and restricted',
    mechanism_grounding: 'ordinary',
  },
};

console.log('=== CONVERGENCE, DELIVERY TRUTH, REAL AUTHOR REQUEST (provider-free, $0) ===');
console.log('Every model response in this file is CONSTRUCTED here and labelled as such.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const msgs = body.messages || [];
  const joined = msgs.map(m => String(m.content || '')).join('\n');
  calls.push({ url, role: body.role, model: body.model || body.preferredModel, joined, bytes: joined.length });
  const reply = (content, model) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ model: model || 'constructed', resolvedModel: model || 'constructed',
      upstreamAttempts: 1, choices: [{ message: { content: content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, cost_in_usd_ticks: 0 } }) });
  // SCENE SCAFFOLD
  if (/mistral-proxy/.test(url) && /narrative skeletons/i.test(joined))
    return reply(JSON.stringify(CONSTRUCTED_SCAFFOLD), 'mistral-small-latest');
  // SCENE PLANNER
  if (/local_objective|SCENE SPINE PLANNER|state_change_precondition/i.test(joined) && /OPEN ROW|local_objective/i.test(joined))
    return reply(JSON.stringify(CONSTRUCTED_PLANNER), 'grok-4.3');
  // CANON AUDIT
  if (/canon|verdict/i.test(joined) && /violation|cannot_decide/i.test(joined))
    return reply(JSON.stringify({ verdict: 'pass', violations: [] }), 'grok-4.3');
  // THE CG AUTHOR — captured, then answered with a minimal valid payload.
  if (/STORYBOUND ARCHITECTURE LAWS|beats/i.test(joined) && joined.length > 20000)
    return reply(JSON.stringify({ beats: [{ kind: 'narration', text: 'The page stayed between them.' }] }), 'grok-4.3');
  return reply('{}', 'constructed');
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._resolveIssueOutline === 'function'
  && typeof window._runCGScreenplayGen === 'function', { timeout: 30000 });

const baseState = (over) => page.evaluate((o) => {
  const s = window.state;
  s.storyId = 'ctl-v2';
  s._starterId = 'starter_first_sacrifice';
  s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  s.currentEngine = 'graphic'; s.renderMode = 'cg'; s.storyLength = 'fling';
  s.fantasyRegion = 'the_veilwood';
  s.issueIndexInRun = 1;
  s._issueOutline = null; s._issueOutlineHistory = {};
  s._sceneDecisions = null; s._sceneObjectives = null;
  s._committedState = null; s._historyNotes = [];
  s._temptFateDurableConsequences = [];
  s.sceneSkeleton = null; s._skeletonMeta = null;
  s._scenePlotContract = null; s._sceneAssignment = null; s._spineEventVerbatim = '';
  s.cgScaffold = null;
  Object.keys(o || {}).forEach(k => { s[k] = o[k]; });
  return true;
}, over || {});

// ═══ 1. DELIVERY TRUTH — A PLANNED EVENT IS NEVER "DELIVERED" BECAUSE ITS NUMBER PASSED ═════
section('1. DELIVERY TRUTH (the v1 regression): no scene history at all');
await baseState({ _stagedAuthoringSceneIndex: 5 });   // scene 6
const empty = await page.evaluate(() => {
  const o = window._resolveIssueOutline(window.state, { force: true });
  return JSON.parse(JSON.stringify({
    perRow: o.scenes.map(r => [r.n, r.delivery]),
    commit: o.commitEvidence,
    block: window._renderIssueOutlineDirective(window.state, 6) || ''
  }));
});
t('with NO commit record and NO history, NOTHING earlier is called delivered or committed',
  empty.perRow.filter(([n, d]) => n < 6 && (d === 'committed' || d === 'delivered')).length === 0,
  JSON.stringify(empty.perRow));
t('those scenes are classified not_written, and said to be NOT history',
  empty.perRow.filter(([n, d]) => n < 6).every(([, d]) => d === 'not_written')
  && /NO RECORD THESE WERE PRODUCED/.test(empty.block) && /They are NOT history/.test(empty.block),
  JSON.stringify(empty.perRow.filter(([n]) => n < 6)));
t('and the author is never told to treat them as established',
  !/ALREADY DELIVERED EARLIER IN THIS ISSUE/.test(empty.block)
  && !/ESTABLISHED AND VERIFIED/.test(empty.block), empty.block.slice(0, 400));

section('1b. DELIVERY TRUTH — the four classes, each from its own real evidence');
const classes = await page.evaluate(() => {
  const s = window.state;
  // CONSTRUCTED delivery records, in the shapes _commitTransition and _commitScene write.
  s._committedState = {
    facts: [{ fact: 'The presiding Dohkar declares the rite his to rule on', proposalRef: 'prop:1:1',
              provenanceLink: 'sealed', committedAtScene: 1, provenance: 'delivered' }],
    _committedThroughScene: 3,
    pendingIntent: { lastStatus: 'MISSED', lastReason: 'verified_not_delivered' },
    tableau: null
  };
  s._historyNotes = [{ ref: 'u1' }, { ref: 'u2' }, { ref: 'u3' }, { ref: 'u4' }];
  s._issueOutline = null; s._issueOutlineHistory = {};
  const o = window._resolveIssueOutline(s, { force: true });
  return JSON.parse(JSON.stringify({
    rows: o.scenes.filter(r => r.n <= 6).map(r => [r.n, r.delivery, r.deliveryEvidence]),
    block: window._renderIssueOutlineDirective(s, 6) || ''
  }));
});
fs.mkdirSync('_audit_out/outline_v2', { recursive: true });
fs.writeFileSync('_audit_out/outline_v2/delivery_classes.json', JSON.stringify(classes, null, 1));
t('scene 1 is COMMITTED, from a committed fact carrying its scene number',
  classes.rows[0][1] === 'committed' && /committed fact at scene 1/.test(classes.rows[0][2]),
  JSON.stringify(classes.rows[0]));
t('scenes 2-3 are ASSESSED AND NOT DELIVERED — checked, no fact, status MISSED',
  classes.rows[1][1] === 'assessed_not_delivered' && classes.rows[2][1] === 'assessed_not_delivered',
  JSON.stringify(classes.rows.slice(1, 3)));
t('scene 4 is WRITTEN BUT UNCHECKED (4 accepted units exist, commit-scene assessed only through 3)',
  classes.rows[3][1] === 'written_unassessed' && /has not assessed it \(through=3\)/.test(classes.rows[3][2]),
  JSON.stringify(classes.rows[3]));
t('scene 5 is NOT WRITTEN — there is no accepted unit for it, so it is not history either',
  classes.rows[4][1] === 'not_written', JSON.stringify(classes.rows[4]));
t('only the committed one is stated as established history',
  /ESTABLISHED AND VERIFIED[\s\S]{0,400}scene 1:/.test(classes.block)
  && !/ESTABLISHED AND VERIFIED[\s\S]{0,400}scene 2:/.test(classes.block),
  (classes.block.match(/EARLIER IN THIS ISSUE[\s\S]{0,700}/) || [''])[0]);
t('the undelivered ones are stated as STILL OWED, not suppressed',
  /CHECKED AND NOT DELIVERED/.test(classes.block) && /It is STILL OWED/.test(classes.block),
  'missing');
t('the unchecked ones are stated as uncertain',
  /WRITTEN BUT UNCHECKED/.test(classes.block) && /Do not assert them as established facts/.test(classes.block),
  'missing');
t('a committed row is SNAPSHOTTED so a later recompute cannot rewrite history',
  await page.evaluate(() => {
    const s = window.state;
    const before = window._resolveIssueOutline(s, { force: true }).scenes.filter(r => r.n === 1)[0];
    // Mutate the live plan row's resolution inputs, then recompute.
    s._sceneDecisions = { '1': { choice: 'intervene', label: 'x', at: Date.now(), storyId: s.storyId } };
    const after = window._resolveIssueOutline(s, { force: true }).scenes.filter(r => r.n === 1)[0];
    return before.accomplishes === after.accomplishes && before.changes === after.changes;
  }), 'a committed row moved');

// ═══ 2. A DECISION IS RESOLVED ONLY BY AN ACTUAL CHOICE ═════════════════════════════════════
section('2. A PASSED SCENE NUMBER IS NOT A DECISION');
const dec = await page.evaluate(() => {
  const s = window.state;
  s._committedState = null;                      // no delivery evidence in this section
  s._issueOutlineHistory = {};
  s._sceneDecisions = null; s._sceneObjectives = null; s._issueOutline = null;
  s._stagedAuthoringSceneIndex = 11;              // scene 12, well past the scene-1 decision
  const noChoice = window._resolveIssueOutline(s, { force: true });
  s._sceneDecisions = { '1': { choice: 'intervene', label: 'tear the band', at: Date.now(), storyId: s.storyId } };
  s._issueOutline = null;
  const withChoice = window._resolveIssueOutline(s, { force: true });
  return JSON.parse(JSON.stringify({
    noChoiceHorizon: noChoice.horizon, noChoiceR1: noChoice.scenes.filter(r => r.n === 1)[0].decision,
    withHorizon: withChoice.horizon, withR1: withChoice.scenes.filter(r => r.n === 1)[0].decision
  }));
});
t('scene 1 past, no recorded choice → its decision is NOT resolved and it is the horizon',
  dec.noChoiceR1.resolved === false && dec.noChoiceHorizon === 1, JSON.stringify(dec));
t('recording the actual choice resolves it and moves the horizon on',
  dec.withR1.resolved === true && dec.withR1.choice === 'intervene' && dec.withHorizon !== 1,
  JSON.stringify({ r1: dec.withR1, horizon: dec.withHorizon }));

// ═══ 3. CONVERGENCE — TWO ROUTES, ONE DESTINATION, DIFFERENT CONSEQUENCES ═══════════════════
section('3. CONVERGENCE: two player routes reach the same point carrying different costs');
const conv = await page.evaluate(() => {
  const s = window.state;
  const run = (choice) => {
    s._sceneDecisions = choice ? { '1': { choice: choice, label: choice, at: Date.now(), storyId: s.storyId } } : null;
    s._issueOutline = null; s._issueOutlineHistory = {};
    s._stagedAuthoringSceneIndex = 3;          // scene 4
    const o = window._resolveIssueOutline(s, { force: true });
    return { row4: o.scenes.filter(r => r.n === 4)[0], row14: o.scenes.filter(r => r.n === 14)[0],
             block: window._renderIssueOutlineDirective(s, 4) || '', horizon: o.horizon };
  };
  return JSON.parse(JSON.stringify({ intervene: run('intervene'), remain: run('remain_bound'), none: run(null) }));
});
fs.writeFileSync('_audit_out/outline_v2/convergence_intervene.txt', conv.intervene.block);
fs.writeFileSync('_audit_out/outline_v2/convergence_remain.txt', conv.remain.block);
t('scene 4 is the SAME convergence destination on both routes',
  conv.intervene.row4.kind === 'convergence' && conv.remain.row4.kind === 'convergence'
  && conv.intervene.row4.accomplishes === conv.remain.row4.accomplishes
  && conv.intervene.row4.changes === conv.remain.row4.changes,
  JSON.stringify([conv.intervene.row4.kind, conv.remain.row4.kind,
    conv.intervene.row4.accomplishes === conv.remain.row4.accomplishes]));
t('but the ROUTE differs, and each route is selected by the recorded choice',
  conv.intervene.row4.activeRoute && conv.remain.row4.activeRoute
  && conv.intervene.row4.activeRoute.choice === 'intervene'
  && conv.remain.row4.activeRoute.choice === 'remain_bound'
  && conv.intervene.row4.activeRoute.how !== conv.remain.row4.activeRoute.how,
  JSON.stringify([conv.intervene.row4.activeRoute, conv.remain.row4.activeRoute]));
t('and what she CARRIES into it differs — convergence does not reset the choice',
  conv.intervene.row4.activeRoute.carries !== conv.remain.row4.activeRoute.carries
  && /eyewitness memory/.test(conv.intervene.row4.activeRoute.carries)
  && /did not come/.test(conv.remain.row4.activeRoute.carries),
  JSON.stringify([conv.intervene.row4.activeRoute.carries, conv.remain.row4.activeRoute.carries]));
t('the author request states the route AND what it costs her',
  /THE ROUTE THE PLAYER PUT HER ON: She broke witness protocol/.test(conv.intervene.block)
  && /SHE ARRIVES CARRYING THIS, and it must stay visible/.test(conv.intervene.block)
  && /THE ROUTE THE PLAYER PUT HER ON: She held the line/.test(conv.remain.block),
  (conv.intervene.block.match(/THE ROUTE[\s\S]{0,400}/) || [''])[0]);
// Scene 14 is outside the CG issue-1 window (rows 1-10) by design, so the later convergence point
// is checked in the LITERARY window, where it is in scope.
const conv14 = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 2;
  const run = (choice) => {
    s._sceneDecisions = { '1': { choice: choice, label: choice, at: Date.now(), storyId: s.storyId } };
    s._issueOutline = null; s._issueOutlineHistory = {};
    const o = window._resolveIssueOutline(s, { force: true });
    return o.scenes.filter(r => r.n === 14)[0];
  };
  const out = { intervene: run('intervene'), remain: run('remain_bound') };
  s.currentEngine = 'graphic'; s.renderMode = 'cg';
  return JSON.parse(JSON.stringify(out));
});
t('the later convergence point (scene 14) also carries route-specific entry',
  conv14.intervene.activeRoute && conv14.remain.activeRoute
  && conv14.intervene.activeRoute.how !== conv14.remain.activeRoute.how
  && conv14.intervene.kind === 'convergence',
  JSON.stringify([conv14.intervene.activeRoute, conv14.remain.activeRoute]));
t('with NO choice recorded, both routes are offered and neither is taken',
  !conv.none.row4.activeRoute && conv.none.row4.routes && conv.none.row4.routes.length === 2
  && /ROUTES TO THIS POINT \(the player has not yet taken one; do not assume either\)/.test(conv.none.block),
  JSON.stringify(conv.none.row4.activeRoute));

section('3b. AN UNANSWERED DECISION DOES NOT LEAVE THE ISSUE UNPLANNED');
const horizonPlan = await page.evaluate(() => {
  const s = window.state;
  s._sceneDecisions = null; s._sceneObjectives = null;
  s._issueOutline = null; s._issueOutlineHistory = {};
  s._stagedAuthoringSceneIndex = 0;            // scene 1 — the first decision is here
  const o = window._resolveIssueOutline(s, { force: true });
  return JSON.parse(JSON.stringify({ horizon: o.horizon,
    kinds: o.scenes.map(r => [r.n, r.kind, r.conditional]),
    block: window._renderIssueOutlineDirective(s, 1) || '' }));
});
t('independent events and convergence points past the horizon stay PLANNED',
  horizonPlan.kinds.filter(([n, k, c]) => n > horizonPlan.horizon && (k === 'independent' || k === 'convergence') && c === true).length === 0,
  JSON.stringify(horizonPlan.kinds.filter(([n, , c]) => n > horizonPlan.horizon && c)));
t('only CONDITIONAL rows past the horizon are marked conditional',
  horizonPlan.kinds.filter(([n, , c]) => n > horizonPlan.horizon && c).every(([, k]) => k === 'conditional'),
  JSON.stringify(horizonPlan.kinds.filter(([n, , c]) => n > horizonPlan.horizon && c)));
t('the author is told the plan continues past the unanswered decision, not that it stops',
  /The issue is still planned past it: independent events still happen and the convergence points above still stand/.test(horizonPlan.block)
  && /What you may NOT do is assert which answer she gave/.test(horizonPlan.block),
  (horizonPlan.block.match(/UNANSWERED DECISION[\s\S]{0,500}/) || [''])[0]);

// ═══ 4. AN ADJUDICATED INTERVENTION OVERTURNS A DESTINATION — AND ONLY ITS DEPENDENTS ═══════
section('4. DISRUPTION: an adjudicated intervention invalidates a prerequisite');
const overturn = await page.evaluate(() => {
  const s = window.state;
  // LITERARY window, so all 20 rows are in scope. In the CG window (rows 1-10) only the in-window
  // dependents can be affected — which is correct, not a gap.
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 4;        // scene 6
  s._committedState = null;
  s._sceneDecisions = { '1': { choice: 'intervene', label: 'x', at: Date.now(), storyId: s.storyId } };
  s._temptFateDurableConsequences = [];
  s._issueOutline = null; s._issueOutlineHistory = {};
  const before = window._resolveIssueOutline(s, { force: true });
  // A CONSTRUCTED adjudicated Tempt record, in the shape _buildTemptFateDurableConsequenceDirective
  // reads, declaring which named prerequisite it invalidated. Nothing is inferred from its prose.
  s._temptFateDurableConsequences = [{
    requestedRupture: 'let the Veilwood know who actually bent the wish', sceneIdx: 5,
    changed: [{ subject: 'the assembly', whatChanged: 'knows an outside hand touched the rite' }],
    invalidatesPrereqs: ['prereq:julian_act_concealed']
  }];
  const after = window._reviseIssueOutlineForMove(s, 'adjudicated Tempt Fate outcome');
  return JSON.parse(JSON.stringify({
    beforeKinds: before.scenes.map(r => [r.n, r.kind]),
    afterKinds: after.scenes.map(r => [r.n, r.kind]),
    overturnedRows: after.scenes.filter(r => r.kind === 'overturned').map(r => r.n),
    diff: after.lastRevision,
    block16: (() => { s.turnCount = 14; s._issueOutline = null;
      return window._renderIssueOutlineDirective(s, 16) || ''; })()
  }));
});
fs.writeFileSync('_audit_out/outline_v2/overturned_scene16.txt', overturn.block16);
t('the rows that DEPEND on the invalidated prerequisite become overturned',
  overturn.overturnedRows.join(',') === '8,9,10,16', JSON.stringify(overturn.overturnedRows));
t('and NOTHING else changes kind — the rest of Fate\'s trajectory stands',
  overturn.beforeKinds.filter(([n, k], i) => overturn.afterKinds[i][1] !== k)
    .every(([n]) => [8, 9, 10, 16].indexOf(n) !== -1),
  JSON.stringify(overturn.beforeKinds.filter(([n, k], i) => overturn.afterKinds[i][1] !== k)));
t('the revision report names the overturned rows',
  (overturn.diff.overturned || []).join(',') === '8,9,10,16', JSON.stringify(overturn.diff));
t('the author is told not to perform the old plan and not to manufacture a replacement loss',
  /OVERTURNED — a prerequisite this scene needed has been invalidated/.test(overturn.block16)
  && /do NOT manufacture an equivalent loss to restore it/.test(overturn.block16)
  && /prereq:julian_act_concealed/.test(overturn.block16),
  (overturn.block16.match(/WHAT KIND OF DEVELOPMENT[\s\S]{0,500}/) || [''])[0]);

// ═══ 5. THE CLIFFHANGER IS SELECTED AND CARRIED ═════════════════════════════════════════════
section('5. THE RECORDED CHOICE IS CARRIED INTO THE CLIFFHANGER');
const cliff = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';   // literary issue 1 = rows 1-20
  s._temptFateDurableConsequences = [];
  const at = (n) => { delete s._stagedAuthoringSceneIndex; s.turnCount = n - 2;
    s._issueOutline = null; s._issueOutlineHistory = {};
    return { o: window._resolveIssueOutline(s, { force: true }), block: window._renderIssueOutlineDirective(s, n) || '' }; };
  s._sceneDecisions = { '1': { choice: 'intervene', label: 'x', at: Date.now(), storyId: s.storyId } };
  const undecided = at(20);
  s._sceneDecisions['19'] = { choice: 'expose', label: 'expose what Julian did', at: Date.now(), storyId: s.storyId };
  const decided = at(20);
  s._sceneDecisions['19'] = { choice: 'conceal', label: 'let it stand', at: Date.now(), storyId: s.storyId };
  const other = at(20);
  s._sceneDecisions['19'] = { choice: 'something_else', label: 'x', at: Date.now(), storyId: s.storyId };
  const bogus = at(20);
  return JSON.parse(JSON.stringify({
    undecided: { c: undecided.o.cliffhanger, block: undecided.block },
    decided: { c: decided.o.cliffhanger, block: decided.block },
    other: { c: other.o.cliffhanger, block: other.block },
    bogus: { c: bogus.o.cliffhanger }
  }));
});
fs.writeFileSync('_audit_out/outline_v2/cliffhanger_selected.txt', cliff.decided.block);
t('undecided: both possibilities are offered, neither selected',
  cliff.undecided.c.selected === null && cliff.undecided.c.decided === false
  && /do not pick for them, and do not blend the two/.test(cliff.undecided.block)
  && /if "expose"/.test(cliff.undecided.block) && /if "conceal"/.test(cliff.undecided.block),
  JSON.stringify(cliff.undecided.c.selected));
t('recording "expose" SELECTS that branch and copies its event into the cliffhanger',
  cliff.decided.c.selected === 'expose' && /puts Julian's act on the inquiry's record/.test(cliff.decided.c.event || ''),
  JSON.stringify({ selected: cliff.decided.c.selected, event: (cliff.decided.c.event || '').slice(0, 80) }));
t('...and carries its NEXT-ISSUE PREDICAMENT',
  /Institution is now prosecuting a broken taboo/.test(cliff.decided.c.issue2Predicament || ''),
  (cliff.decided.c.issue2Predicament || '').slice(0, 120));
t('...and the author request shows the chosen outcome and predicament, not the alternatives',
  /the player has chosen "expose"/.test(cliff.decided.block)
  && /the next issue opens on/i.test(cliff.decided.block)
  && !/if "conceal"/.test(cliff.decided.block),
  (cliff.decided.block.match(/CLIFFHANGER[\s\S]{0,700}/) || [''])[0]);
t('recording "conceal" selects the OTHER branch',
  cliff.other.c.selected === 'conceal' && /lets the record stand/.test(cliff.other.c.event || ''),
  JSON.stringify(cliff.other.c.selected));
t('an unmatched recorded choice is REPORTED, never guessed',
  cliff.bogus.c.selected === null && /matches no authored branch/.test(cliff.bogus.c.selectionProblem || ''),
  JSON.stringify(cliff.bogus.c));
t('the authored cliffhanger outcomes are marked as proposals pending review',
  cliff.decided.c.provenance === 'authored_proposal_pending_review', cliff.decided.c.provenance);

// ═══ 6. THE ISSUE BOUNDARY IS RECONCILED, NOT LOGGED ════════════════════════════════════════
section('6. THE PURCHASE CONTRACT DECIDES WHERE THE ISSUE ENDS, AND THE PLOT ENDS THERE TOO');
const bnd = await page.evaluate(() => {
  const s = window.state;
  const read = (engine, issue, scene) => {
    s.currentEngine = engine; s.renderMode = engine === 'graphic' ? 'cg' : 'literary';
    s.issueIndexInRun = issue;
    if (engine === 'graphic') s._stagedAuthoringSceneIndex = scene - 1; else { delete s._stagedAuthoringSceneIndex; s.turnCount = scene - 2; }
    s._issueOutline = null; s._issueOutlineHistory = {};
    const o = window._resolveIssueOutline(s, { force: true });
    return { bounds: o.bounds, cliff: o.cliffhanger, last: o.scenes[o.scenes.length - 1].n,
             block: window._renderIssueOutlineDirective(s, o.bounds.last) || '' };
  };
  return JSON.parse(JSON.stringify({ cg1: read('graphic', 1, 10), cg2: read('graphic', 2, 20), lit1: read('literary', 1, 20) }));
});
fs.writeFileSync('_audit_out/outline_v2/boundary_cg_issue1.txt', bnd.cg1.block);
t('CG issue 1 spans rows 1-10 — the shipped 10-scene purchase contract, unchanged',
  bnd.cg1.bounds.first === 1 && bnd.cg1.bounds.last === 10 && bnd.cg1.bounds.per === 10,
  JSON.stringify(bnd.cg1.bounds));
t('and it HAS a cliffhanger at scene 10, so the plot ends where the reader\'s issue ends',
  !!bnd.cg1.cliff && bnd.cg1.cliff.scene === 10 && /denies it to her face/.test(bnd.cg1.cliff.event || ''),
  JSON.stringify(bnd.cg1.cliff && { scene: bnd.cg1.cliff.scene, src: bnd.cg1.cliff.source }));
t('that cliffhanger names the predicament the NEXT CG issue opens inside',
  /next issue opens with both of them acting on that/.test(bnd.cg1.cliff.issue2Predicament || ''),
  (bnd.cg1.cliff.issue2Predicament || '').slice(0, 120));
t('CG issue 2 spans rows 11-20 and ends on the scene-20 cliffhanger',
  bnd.cg2.bounds.first === 11 && bnd.cg2.bounds.last === 20 && bnd.cg2.cliff.scene === 20,
  JSON.stringify(bnd.cg2.bounds));
t('literary issue 1 spans rows 1-20 — its own 20-scene contract, also unchanged',
  bnd.lit1.bounds.first === 1 && bnd.lit1.bounds.last === 20 && bnd.lit1.bounds.per === 20
  && bnd.lit1.cliff.scene === 20, JSON.stringify(bnd.lit1.bounds));
t('the mapping is reported as a mapping (rows -> issues), not as a disagreement',
  !!bnd.cg1.bounds.mapping && bnd.cg1.bounds.mapping.issuesSpanned === 2
  && bnd.cg1.bounds.mapping.nativeMode === 'literary',
  JSON.stringify(bnd.cg1.bounds.mapping));

// ═══ 7. THE REAL CG AUTHOR REQUEST, OFF THE WIRE ════════════════════════════════════════════
section('7. PRODUCTION CG GENERATION: the scaffold is generated and the author request captured');
await baseState({});
calls.length = 0;
const cgRun = await page.evaluate(async () => {
  const s = window.state;
  s.turnCount = 3;                      // three scenes behind us
  s._historyNotes = [{ ref: 'a' }, { ref: 'b' }, { ref: 'c' }];
  s._committedState = { facts: [{ fact: 'The presiding Dohkar declares the rite his to rule on',
      proposalRef: 'prop:1:1', provenanceLink: 'sealed', committedAtScene: 1, provenance: 'delivered' }],
    _committedThroughScene: 3, pendingIntent: { lastStatus: 'DELIVERED', lastReason: 'delivered' }, tableau: null };
  s._sceneDecisions = { '1': { choice: 'intervene', label: 'tear the band', at: Date.now(), storyId: s.storyId } };
  s._issueOutline = null; s._issueOutlineHistory = {};
  // A CONSTRUCTED accepted plot contract, in the shape the planner writes at app.js ~103434 —
  // because this control is testing the SCAFFOLD + AUTHOR boundary, not the planner.
  s._scenePlotContract = { sceneIndex: 3,
    stateChange: { event: 'The presiding Dohkar serves Lirael formal notice in the gap between the trunks',
      precondition: 'Lirael has not yet been told her conduct is under investigation',
      forces_choice: 'whether to sign the acknowledgement or refuse it',
      slots: { precondition: 'the presiding Dohkar is present in the scene',
               actor: 'the presiding Dohkar', action: 'serves formal notice of investigation',
               target: 'Lirael', exitState: 'Lirael is formally under investigation and restricted' } },
    hardBeats: [{ description: 'the notice is served and acknowledgement is demanded' }],
    aftermathTruths: [], reservedConstraints: [] };
  window._structuredEventHandoff = true;
  try { await window._runCGScreenplayGen(3, 'wait for the Dohkar', ''); } catch (e) { return 'threw: ' + (e && e.message); }
  return { builtForScene: s.sceneSkeleton && s.sceneSkeleton._builtForScene,
           developments: (s.sceneSkeleton && s.sceneSkeleton.causal_outline || []).length };
});
const scaffoldReq = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined))[0];
const authorReq = calls.filter(c => c.bytes > 20000 && /STORYBOUND ARCHITECTURE LAWS|beats/i.test(c.joined)
  && !/narrative skeletons/i.test(c.joined)).pop();
fs.writeFileSync('_audit_out/outline_v2/REAL_cg_scaffold_request.txt', (scaffoldReq && scaffoldReq.joined) || '(none captured)');
fs.writeFileSync('_audit_out/outline_v2/REAL_cg_author_request.txt', (authorReq && authorReq.joined) || '(none captured)');
console.log('      CG run: ' + JSON.stringify(cgRun) + '  calls=' + calls.length);
t('PRODUCTION CG generation issued a SCENE SCAFFOLD request (it never did before)',
  !!scaffoldReq, calls.map(c => (c.role || '?') + ':' + c.bytes).join(' '));
t('...for THIS scene, and the returned outline landed on the scaffold',
  cgRun && cgRun.builtForScene === 4 && cgRun.developments === 21, JSON.stringify(cgRun));
t('the scaffold request carried the scene purpose, the Veilwood canon and the reserved decision',
  !!scaffoldReq && /THIS SCENE'S PURPOSE WITHIN THE ISSUE/.test(scaffoldReq.joined)
  && /VEILWOOD GEOGRAPHY \(canon/.test(scaffoldReq.joined)
  && /RESERVED FOR THE PLAYER \(HARD\)/.test(scaffoldReq.joined)
  && /whether to sign the acknowledgement or refuse it/.test(scaffoldReq.joined),
  scaffoldReq && (scaffoldReq.joined.match(/RESERVED FOR THE PLAYER[\s\S]{0,300}/) || ['(no reserved block)'])[0]);
t('and it asked for 20-24 causal developments (CG), with no literary count and no action quota',
  !!scaffoldReq && /An ARRAY of 20-24 objects/.test(scaffoldReq.joined)
  && !/At least HALF the entries/.test(scaffoldReq.joined) && !/10-14/.test(scaffoldReq.joined),
  scaffoldReq && (scaffoldReq.joined.match(/An ARRAY of [^.]{0,40}/) || [''])[0]);
t('an OUTGOING CG AUTHOR request was captured off the wire',
  !!authorReq && authorReq.bytes > 20000, authorReq ? authorReq.bytes : 'none');
t('the REAL author request carries the scene purpose within the issue',
  !!authorReq && /THIS SCENE'S PURPOSE WITHIN ISSUE 1 \(scene 4 of 10/.test(authorReq.joined),
  authorReq && (authorReq.joined.match(/THIS SCENE'S PURPOSE[\s\S]{0,200}/) || ['(absent)'])[0]);
t('the REAL author request carries all 21 causal developments from the generated scaffold',
  !!authorReq && SCAFFOLD_BEATS.every(([b]) => authorReq.joined.includes(b)),
  authorReq ? SCAFFOLD_BEATS.filter(([b]) => !authorReq.joined.includes(b)).map(([b]) => b).join(' | ') : 'no request');
t('the REAL author request carries the route the player put her on, with its cost',
  !!authorReq && /THE ROUTE THE PLAYER PUT HER ON: She broke witness protocol/.test(authorReq.joined)
  && /SHE ARRIVES CARRYING THIS/.test(authorReq.joined), 'route absent');
t('the REAL author request states delivery truth per class, and only scene 1 as established',
  !!authorReq && /ESTABLISHED AND VERIFIED/.test(authorReq.joined)
  && /scene 1: THE WISH/.test(authorReq.joined)
  && !/ESTABLISHED AND VERIFIED[\s\S]{0,300}scene 3:/.test(authorReq.joined),
  authorReq && (authorReq.joined.match(/EARLIER IN THIS ISSUE[\s\S]{0,600}/) || ['(absent)'])[0]);
t('the REAL author request carries the Veilwood geography canon',
  !!authorReq && /VEILWOOD GEOGRAPHY \(canon/.test(authorReq.joined), 'canon absent');
t('the obsolete milestone paragraph is absent from the real request',
  !!authorReq && !/NOT staging authority, NOT the event to render/.test(authorReq.joined)
  && !/do NOT try to accomplish the whole milestone in one scene/.test(authorReq.joined),
  authorReq && (authorReq.joined.match(/.{0,80}milestone.{0,160}/i) || [''])[0]);
t('the generated outline does NOT resolve the reserved player decision',
  !/\bshe signs\b|\bsigns the acknowledgement\b|\brefuses to sign\b/i.test(
    SCAFFOLD_BEATS.map(([b]) => b).join(' ')),
  SCAFFOLD_BEATS.map(([b]) => b).filter(b => /sign/i.test(b)).join(' | '));

// ═══ 8. THE LITERARY PATH RENDERS THE OUTLINE AFTER ITS SKELETON IS GENERATED ═══════════════
section('8. THE LITERARY ORDERING DEFECT');
const lit = await page.evaluate(async () => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 2;        // scene 4
  s.sceneSkeleton = null; s._skeletonMeta = null; s._issueOutline = null;
  // BEFORE the skeleton exists, the plot-contract block must NOT carry a causal outline.
  const beforeContract = window._buildPlotContractDirective() || '';
  const beforeSkel = (typeof window.buildSkeletonDirective === 'function') ? (window.buildSkeletonDirective() || '') : '';
  await window.__generateSceneSkeleton('wait for the Dohkar', '', { sceneNumber: 4 });
  const afterSkel = (typeof window.buildSkeletonDirective === 'function') ? (window.buildSkeletonDirective() || '') : '';
  const afterContract = window._buildPlotContractDirective() || '';
  // STALENESS: a skeleton built for scene 4 must not be rendered while assembling scene 5.
  s.turnCount = 3;                                             // scene 5
  const staleSkel = (typeof window.buildSkeletonDirective === 'function') ? (window.buildSkeletonDirective() || '') : '';
  return { beforeContract, beforeSkel, afterSkel, afterContract, staleSkel,
           builtFor: s.sceneSkeleton && s.sceneSkeleton._builtForScene };
});
fs.writeFileSync('_audit_out/outline_v2/literary_skeleton_block.txt', lit.afterSkel);
t('before the skeleton exists, NO causal outline is claimed anywhere',
  !/CAUSAL OUTLINE/.test(lit.beforeContract) && !/CAUSAL OUTLINE/.test(lit.beforeSkel),
  'an outline appeared with no skeleton');
t('the literary skeleton block carries the causal outline once it is generated',
  /CAUSAL OUTLINE — THE DRAMATIC SEQUENCE/.test(lit.afterSkel)
  && SCAFFOLD_BEATS.every(([b]) => lit.afterSkel.includes(b)),
  SCAFFOLD_BEATS.filter(([b]) => !lit.afterSkel.includes(b)).map(([b]) => b).join(' | '));
t('the CG-only plot-contract copy is NOT emitted on the literary path (no double render)',
  !/CAUSAL OUTLINE/.test(lit.afterContract), lit.afterContract.slice(0, 200));
t('a skeleton built for another scene is REFUSED rather than rendered stale',
  !/CAUSAL OUTLINE/.test(lit.staleSkel) && lit.builtFor === 4, 'stale outline rendered');

// ── PRESERVE THE EVIDENCE ───────────────────────────────────────────────────────────────────
fs.writeFileSync('_audit_out/outline_v2/call_shapes.json', JSON.stringify(
  calls.map(c => ({ url: c.url, role: c.role, model: c.model, bytes: c.bytes })), null, 1));
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('evidence: _audit_out/outline_v2/  (REAL_cg_author_request.txt is an intercepted outgoing request)');
process.exit(fail ? 1 : 0);
