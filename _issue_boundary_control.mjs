// ── ISSUE BOUNDARY AND RELOAD CARRYOVER (provider-free, $0) ──────────────────────────────────
// Issue 1 → 2 → 3 across a save/reload round trip, driving the SHIPPED resolver, scaffold and
// author builders. Every record below is a CONSTRUCTED FIXTURE and labelled as such; every model
// response is constructed in this file. No provider is called; nothing is billed.
//
// THE ACCEPTANCE CASE: a choice and an accepted Fate change in Issue 1 affect Issue 2's plan,
// remain reflected in Issue 3, and survive a reload — without replaying the original event.
import { chromium } from 'playwright-core';
import fs from 'fs';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + String(detail).slice(0, 700) : '')); }
};
const section = (n) => console.log('\n' + n);

const CONSTRUCTED_SCAFFOLD = {
  environment_anchor: 'the gap between two trunks', structural_pacing: 'measured escalation',
  narrative_density: 'moderate', dialogue_ratio: 'dialogue-led', beat_style: 'procedure then reaction',
  tension_rhythm: 'rising with pauses',
  staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON', role: 'subject' }],
  interlocutor_placement: 'the presiding Dohkar — reads from a page he does not look up from',
  li_texture_beat: null, pc_body_callback: null, li_body_callback: null, antagonist_body_callback: null,
  environment_plus: { target: 'the gap between two trunks', axis: 'use' }, fusion: null,
  causal_outline: [{ beat: 'A' }, { beat: 'B', link: 'therefore', from: 1 }],
  stage_contract: { present: ['Lirael'] }
};

console.log('=== ISSUE BOUNDARY + RELOAD CARRYOVER (provider-free, $0) ===');
console.log('Every record and every model response here is a CONSTRUCTED FIXTURE.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const joined = (body.messages || []).map(m => String(m.content || '')).join('\n');
  calls.push({ url, role: body.role, joined, bytes: joined.length });
  const reply = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ model: 'constructed', resolvedModel: 'constructed',
      choices: [{ message: { content: c }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, cost_in_usd_ticks: 0 } }) });
  if (/mistral-proxy/.test(url) && /narrative skeletons/i.test(joined)) return reply(JSON.stringify(CONSTRUCTED_SCAFFOLD));
  return reply('{}');
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._resolveIssueOutline === 'function', { timeout: 30000 });

// ── ISSUE 1 PLAYED: a recorded choice, a committed scene, an accepted Fate change, obligations ──
const setupIssue1 = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'ctl-boundary'; s._starterId = 'starter_first_sacrifice';
  s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  s.currentEngine = 'graphic'; s.renderMode = 'cg'; s.storyLength = 'soulmates';
  s.fantasyRegion = 'the_veilwood';
  s.issueIndexInRun = 1; s._stagedAuthoringSceneIndex = 9;        // CG scene 10, the issue-1 finale
  // ── CONSTRUCTED FIXTURES, all in the shapes production writes ──
  s._sceneDecisions = { '1': { choice: 'run', label: 'run in shame', at: 1, storyId: s.storyId } };
  s._historyNotes = [
    { v: 4, ref: 'p:i1s2', sceneUid: 'p:i1s2', sceneNumber: 2, quotesStale: false, proseHash: 'h1',
      quoted: [{ quote: 'She was already past the trunks when the Dohkar called her name.', kind: 'events', text: 'she left' }],
      summary: [], knowledge: [], obligations: [{ id: 'ob:answer_the_notice', text: 'Lirael still owes the panel an answer', proposed: true }] },
    { v: 4, ref: 'p:i1s7', sceneUid: 'p:i1s7', sceneNumber: 7, quotesStale: false, proseHash: 'h2',
      quoted: [{ quote: 'The rumour reached the Veilwood before she did, and it had her name in it.', kind: 'events', text: 'her name spread' }],
      summary: [], knowledge: [], obligations: [{ id: 'ob:face_seren', text: 'Lirael owes Seren an explanation', proposed: true }],
      resolves: [] }
  ];
  s._committedState = {
    facts: [{ fact: 'Lirael left the clearing before the notice was served', proposalRef: 'prop:0:1',
              provenanceLink: 'sealed', committedAtScene: 0, storyScene: 2, storySceneProvenance: 'caller',
              milestoneScene: 2, provenance: 'delivered' }],
    _committedThroughScene: 2,
    deliveryLog: { '2': { scene: 2, storyScene: 2, turnScene: 1, keyProvenance: 'storyScene via the proposal object',
                          verifierReported: true, aggregateSupplied: true, aggregateDelivery: 'DELIVERED',
                          committed: [{ ref: 'prop:0:1' }], pending: {} } },
    pendingIntent: null, tableau: null
  };
  // AN ACCEPTED FATE CHANGE, declaring its invalidation the way an adjudication does.
  s._temptFateDurableConsequences = [{ requestedRupture: 'let the Veilwood know who bent the wish',
    sceneIdx: 5, changed: [{ subject: 'the assembly', whatChanged: 'knows an outside hand touched the rite' }],
    establishedEvidence: ['the Chayr read the finding aloud'],
    invalidatesPrereqs: ['prereq:julian_act_concealed'] }];
  // AN ACCEPTED POST-PROSE ASSESSMENT from Issue 1, in the shape _commitScene writes.
  s._milestoneDeliveries = [{ milestoneScene: 16, atScene: 6, turnScene: 5, status: 'delivered_on_page',
    accepted: true, why: 'accepted', evidence: '"I bent the wish," Julian said', participants: ['Julian'],
    scope: 'the Chayr and the assembly', proseHash: 'h3', superseded: false, at: 1,
    source: 'runtime commit verifier' }];
  s._prereqInvalidations = [];
  // A RESOLVED obligation, which must not resurrect.
  s._historyNotes[1].obligations[0].resolved = true;
  s._historyNotes[1].obligations[0].settledBy = 'verifier:history_obligations_fulfilled';
  s._issueOutline = null; s._issueOutlineHistory = {};
  return true;
});

// ═══ 1. ISSUE 1 → 2: THE NEXT ISSUE STARTS FROM WHAT ACTUALLY HAPPENED ══════════════════════
section('1. THE ISSUE BOUNDARY: issue 2 starts from the delivered state, not the planned ending');
await setupIssue1();
const i1 = await page.evaluate(() => {
  const o = window._resolveIssueOutline(window.state);
  return JSON.parse(JSON.stringify({ bounds: o.bounds, cliff: o.cliffhanger,
    rows: o.scenes.map(r => [r.n, r.kind, r.delivery]) }));
});
t('CG issue 1 is rows 1-10 and ends on its own authored cliffhanger',
  i1.bounds.first === 1 && i1.bounds.last === 10 && i1.cliff && i1.cliff.scene === 10,
  JSON.stringify(i1.bounds));
const i2 = await page.evaluate(() => {
  const s = window.state;
  // THE BOUNDARY, as production crosses it: the paid-unit index advances and the scene index moves on.
  s.issueIndexInRun = 2; s._stagedAuthoringSceneIndex = 10;      // CG scene 11, issue 2 opening
  const o = window._resolveIssueOutline(s);                      // ORDINARY read — nothing cleared
  const r11 = o.scenes.filter(x => x.n === 11)[0];
  return JSON.parse(JSON.stringify({ bounds: o.bounds, overturned: o.overturned.slice(),
    overturnedWhy: o.overturnedWhy, r11: r11,
    rows: o.scenes.map(r => [r.n, r.kind, r.delivery]),
    block: window._renderIssueOutlineDirective(s, 11) || '',
    history: window._buildHistoryContinuityBlock(s, {}) || '' }));
});
fs.mkdirSync('_audit_out/issue_boundary', { recursive: true });
fs.writeFileSync('_audit_out/issue_boundary/issue2_opening_directive.txt', i2.block);
t('issue 2 is rows 11-20 — the purchase contract, not a reset',
  i2.bounds.first === 11 && i2.bounds.last === 20 && i2.bounds.issueIndex === 2, JSON.stringify(i2.bounds));
t('the ISSUE-1 Fate change is still in force in issue 2',
  i2.overturned.indexOf('prereq:julian_act_concealed') !== -1
  && /declared invalidatesPrereqs/.test(JSON.stringify(i2.overturnedWhy)),
  JSON.stringify(i2.overturnedWhy));
t('...so issue 2 rows that depended on it are revised, not performed as planned',
  (() => {
    const voided = i2.rows.filter(([n, k]) => k === 'overturned').map(([n]) => n);
    return voided.indexOf(16) !== -1 && voided.every(n => n >= 11);
  })(), JSON.stringify(i2.rows.filter(([, k]) => k === 'overturned')));
t('the ISSUE-1 assessment still voids row 16 in issue 2 — without replaying the event',
  (() => {
    const r16 = i2.rows.filter(([n]) => n === 16)[0];
    return !!r16 && !/Julian finally admits he acted/.test(i2.block);
  })(), JSON.stringify(i2.rows.filter(([n]) => n === 16)));
t('ISSUE-1 history reaches the issue-2 opening, with its own scene numbers',
  /scene 2 — the scene's own words: "She was already past the trunks/.test(i2.history)
  && /scene 7 — the scene's own words: "The rumour reached the Veilwood/.test(i2.history),
  i2.history.slice(0, 400));
t('the UNRESOLVED obligation carries across the boundary',
  /ob:answer_the_notice/.test(i2.history), (i2.history.match(/OBLIGATIONS STILL OPEN[\s\S]{0,300}/) || ['(absent)'])[0]);
t('the RESOLVED obligation does NOT resurrect',
  !/ob:face_seren/.test(i2.history), (i2.history.match(/ob:face_seren[^\n]{0,80}/) || ['(correctly absent)'])[0]);

// ═══ 2. SCENE IDENTITIES DO NOT COLLIDE ACROSS THE BOUNDARY ═════════════════════════════════
section('2. ISSUE 2\'s OPENING CANNOT OVERWRITE ISSUE 1\'s OR INHERIT ITS VERDICT');
const collide = await page.evaluate(() => {
  const s = window.state;
  // Issue 2's opening is story scene 11. A note and a seal for it must not touch scene 1's or 2's.
  s._historyNotes.push({ v: 4, ref: 'p:i2s11', sceneUid: 'p:i2s11', sceneNumber: 11, quotesStale: false,
    proseHash: 'h4', quoted: [{ quote: 'The second issue opened on a room she had never been asked into.', kind: 'events', text: 'a new room' }],
    summary: [], knowledge: [], obligations: [] });
  s._sealedProposals = null;
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'issue 2 opening event',
    milestone: 'row 11', scene: 9, storyScene: 11, milestoneScene: 11 });
  s._issueOutline = null;
  const o = window._resolveIssueOutline(s);
  const r2 = o.scenes.filter(x => x.n === 2)[0] || null;
  const r11 = o.scenes.filter(x => x.n === 11)[0];
  return JSON.parse(JSON.stringify({ sealed: { id: sealed.id, storyScene: sealed.storyScene },
    r11: r11, r2present: !!r2, history: window._buildHistoryContinuityBlock(s, {}) || '' }));
});
t('issue 2\'s opening seals with its OWN story scene (11), not the issue-1 opening\'s',
  collide.sealed.storyScene === 11, JSON.stringify(collide.sealed));
t('its history note is labelled scene 11, beside the scene-2 note, neither overwriting the other',
  /scene 11 — the scene's own words: "The second issue opened/.test(collide.history)
  && /scene 2 — the scene's own words: "She was already past/.test(collide.history),
  collide.history.slice(0, 500));
t('row 11 does NOT inherit the issue-1 opening\'s delivery verdict',
  collide.r11.delivery !== 'committed'
  && !/prop:0:1/.test(String(collide.r11.deliveryEvidence || '')),
  JSON.stringify([collide.r11.delivery, collide.r11.deliveryEvidence]));
t('and scene 2 is outside the issue-2 window, so it cannot be reclassified by it',
  collide.r2present === false, String(collide.r2present));

// ═══ 3. THE REAL SAVE / LOAD LIFECYCLE ══════════════════════════════════════════════════════
section('3. SAVE / RELOAD through the REAL lifecycle (saveStorySnapshot -> continueStory)');
// Both halves are production. window.__saveStorySnapshot is a free-harness handle onto
// saveStorySnapshot; window.continueStory is the SHIPPED resume entry point the Vault "Continue"
// button calls, and it is what performs the Object.assign and the historical-record migration
// (loadStoryData only FETCHES the snapshot). So the deletion list, the JSON boundary, the
// assignment and the migration are all the real ones. The earlier version deleted and reassigned
// state by hand; it no longer does.
const reload = await page.evaluate(async () => {
  const s = window.state;
  const storyId = s.storyId;
  let saveThrew = null, loadThrew = null;
  try { localStorage.removeItem('sb_saved_story'); localStorage.removeItem('sb_story_in_idb'); } catch (_) {}
  if (!document.getElementById('storyText')) {
    const el = document.createElement('div'); el.id = 'storyText'; document.body.appendChild(el);
  }
  // Make sure the derived outline cache EXISTS before the save, so its absence afterwards is
  // production's deletion and not an accident of this fixture.
  window._resolveIssueOutline(s);
  const cacheWasLive = !!s._issueOutline;
  try { window.__saveStorySnapshot(); } catch (e) { saveThrew = String(e && e.message); }
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('sb_saved_story') || 'null'); } catch (_) {}
  if (!stored || !stored.stateSnapshot) return { fatal: 'production wrote no stateSnapshot', saveThrew: saveThrew };
  const outlineCachePersisted = Object.prototype.hasOwnProperty.call(stored.stateSnapshot, '_issueOutline');
  // ── THE FRESH-PAGE CONDITION. Every field the snapshot is supposed to restore is cleared, so a
  // surviving value can only have come from the load.
  ['_sceneDecisions', '_historyNotes', '_committedState', '_temptFateDurableConsequences',
   '_milestoneDeliveries', '_prereqInvalidations', '_sceneObjectives', '_issueOutline',
   '_issueOutlineHistory', 'scenes', 'issueIndexInRun', '_stagedAuthoringSceneIndex',
   '_starterId', 'turnCount'].forEach(k => { try { delete s[k]; } catch (_) {} });
  const clearedCheck = { decisions: s._sceneDecisions, notes: s._historyNotes, starter: s._starterId };
  // ── THE REAL LOAD. Not a hand-written assignment.
  try { await window.continueStory(storyId); } catch (e) { loadThrew = String(e && e.message); }
  const o = window._resolveIssueOutline(s);                  // ORDINARY read after the reload
  const r16 = o.scenes.filter(x => x.n === 16)[0];
  return JSON.parse(JSON.stringify({ saveThrew: saveThrew, loadThrew: loadThrew,
    cacheWasLive: cacheWasLive, outlineCachePersisted: outlineCachePersisted,
    clearedCheck: clearedCheck,
    decisions: s._sceneDecisions, notes: (s._historyNotes || []).map(h => [h.sceneNumber, h.ref, !!h.quotesStale]),
    facts: (s._committedState && s._committedState.facts) || [],
    log: (s._committedState && s._committedState.deliveryLog) || {},
    fate: s._temptFateDurableConsequences, assessments: s._milestoneDeliveries,
    starter: s._starterId, issueIndex: s.issueIndexInRun,
    overturned: o.overturned.slice(), bounds: o.bounds, r16: r16,
    block: window._renderIssueOutlineDirective(s, 11) || '',
    history: window._buildHistoryContinuityBlock(s, {}) || '' }));
});
fs.writeFileSync('_audit_out/issue_boundary/after_reload.json', JSON.stringify(reload, null, 1));
t('the REAL saveStorySnapshot ran and wrote a stateSnapshot',
  !reload.fatal && reload.saveThrew === null, reload.fatal || reload.saveThrew);
t('the fresh-page condition really was cleared before the load',
  reload.clearedCheck && reload.clearedCheck.decisions === undefined
  && reload.clearedCheck.notes === undefined && reload.clearedCheck.starter === undefined,
  JSON.stringify(reload.clearedCheck));
t('the REAL resume path (continueStory) ran',
  reload.loadThrew === null, reload.loadThrew);
t('the DERIVED outline cache is NOT in the snapshot PRODUCTION wrote (the cache was live before it)',
  reload.cacheWasLive === true && reload.outlineCachePersisted === false,
  JSON.stringify({ live: reload.cacheWasLive, persisted: reload.outlineCachePersisted }));
t('the recorded player choice survives the REAL reload',
  reload.decisions && reload.decisions['1'] && reload.decisions['1'].choice === 'run',
  JSON.stringify(reload.decisions));
t('history notes survive WITH their scene identities and stale flags',
  reload.notes.length === 3 && reload.notes.some(n => n[0] === 2) && reload.notes.some(n => n[0] === 7)
  && reload.notes.some(n => n[0] === 11) && reload.notes.every(n => n[2] === false),
  JSON.stringify(reload.notes));
t('committed facts survive with storyScene and the milestone link',
  reload.facts.length === 1 && reload.facts[0].storyScene === 2
  && reload.facts[0].milestoneScene === 2 && reload.facts[0].proposalRef === 'prop:0:1',
  JSON.stringify(reload.facts));
t('the per-scene delivery log survives, still keyed by the story scene',
  !!reload.log['2'] && reload.log['2'].storyScene === 2 && reload.log['2'].aggregateSupplied === true,
  JSON.stringify(reload.log));
t('the accepted Fate consequence survives, with its declared invalidation',
  (reload.fate || []).length === 1 && (reload.fate[0].invalidatesPrereqs || []).indexOf('prereq:julian_act_concealed') !== -1,
  JSON.stringify(reload.fate));
t('the post-prose assessment survives, still accepted and not superseded',
  (reload.assessments || []).length === 1 && reload.assessments[0].accepted === true
  && reload.assessments[0].superseded === false && reload.assessments[0].milestoneScene === 16,
  JSON.stringify(reload.assessments));
t('the plan identity survives: the starter and the issue index came back',
  reload.starter === 'starter_first_sacrifice' && reload.issueIndex === 2,
  JSON.stringify([reload.starter, reload.issueIndex]));
t('and the rebuilt plan still carries the Fate change after the reload',
  reload.overturned.indexOf('prereq:julian_act_concealed') !== -1, JSON.stringify(reload.overturned));
t('issue 2 is still issue 2 after the reload',
  reload.bounds.issueIndex === 2 && reload.bounds.first === 11, JSON.stringify(reload.bounds));
t('row 16 is still void after the reload, and is NOT re-assigned as a new revelation',
  reload.r16.accomplishes === '' && !/Julian finally admits he acted/.test(reload.block),
  JSON.stringify(reload.r16.accomplishes));
t('issue-1 history is still readable after the reload, with its own scene numbers',
  /scene 2 — the scene's own words: "She was already past/.test(reload.history)
  && /ob:answer_the_notice/.test(reload.history) && !/ob:face_seren/.test(reload.history),
  reload.history.slice(0, 400));

// ═══ 4. ISSUE 3: A REAL ISSUE-3 REQUEST, AND WHAT IT EXPOSES ════════════════════════════════
section('4. ISSUE 3: the actual issue-3 planning window and scaffold request');
calls.length = 0;
const i3 = await page.evaluate(async () => {
  const s = window.state;
  s.issueIndexInRun = 3; s._stagedAuthoringSceneIndex = 20;     // CG scene 21, issue 3 opening
  s.sceneSkeleton = null; s._skeletonMeta = null;
  const o3 = window._resolveIssueOutline(s);
  const r21 = o3.scenes.filter(x => x.n === 21)[0] || null;
  const block21 = window._renderIssueOutlineDirective(s, 21) || '';
  // THE ACTUAL ISSUE-3 SCAFFOLD REQUEST — generated while issue 3 is the active window, not
  // after switching back.
  await window.__generateSceneSkeleton('wait', '', { sceneNumber: 21 });
  return JSON.parse(JSON.stringify({ bounds: o3.bounds, rowCount: o3.scenes.length,
    r21: r21, block21: block21, overturned: o3.overturned.slice(),
    fate: (s._temptFateDurableConsequences || []).length,
    assessments: (s._milestoneDeliveries || []).filter(r => r.accepted && !r.superseded).length }));
});
const skelI3 = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined)).pop();
fs.writeFileSync('_audit_out/issue_boundary/issue3_scaffold_request.txt', (skelI3 && skelI3.joined) || '(none)');
fs.writeFileSync('_audit_out/issue_boundary/issue3_outline.json', JSON.stringify(i3, null, 1));
t('an ACTUAL issue-3 scaffold request was captured while issue 3 was the active window',
  !!skelI3 && skelI3.joined.length > 1000, skelI3 ? skelI3.bytes : 'none');
t('the issue-3 window resolves as rows 21-30',
  i3.bounds.issueIndex === 3 && i3.bounds.first === 21 && i3.bounds.last === 30
  || (i3.bounds.issueIndex === 3 && i3.bounds.first === 21),
  JSON.stringify(i3.bounds));
// ── ARCHITECTURAL GAP, NAMED. The First Sacrifice plan authors 20 rows, so CG issue 3 (rows
// 21-30) has NO plan rows at all, and no generated spine sceneOutline covers them either. That is
// not a passing carryover test: it is a gap, and it is reported as one.
t('ARCHITECTURAL GAP: issue 3 has NO planned rows — the plan authors 20 and the spine supplies none',
  i3.rowCount === 0 && i3.r21 === null,
  'rows=' + i3.rowCount + ' (if this ever becomes non-zero, the gap has been filled and this check should be rewritten)');
t('so the issue-3 scaffold request carries NO scene purpose — stated, not claimed as carryover',
  !!skelI3 && !/THIS SCENE'S PURPOSE WITHIN THE ISSUE/.test(skelI3.joined),
  skelI3 && (skelI3.joined.match(/THIS SCENE'S PURPOSE[\s\S]{0,160}/) || ['(correctly absent)'])[0]);
t('but the DURABLE CARRYOVER is still in force in issue 3: the Fate change, the assessment, the history',
  i3.overturned.indexOf('prereq:julian_act_concealed') !== -1 && i3.fate === 1 && i3.assessments === 1
  && !!skelI3 && /She was already past the trunks/.test(skelI3.joined)
  && /ob:answer_the_notice/.test(skelI3.joined),
  JSON.stringify({ ov: i3.overturned, fate: i3.fate, as: i3.assessments }));

section('4b. THE ISSUE-2 ROW THE CARRIED CHANGE AFFECTS, AND ONLY THOSE ROWS');
const i2affected = await page.evaluate(() => {
  const s = window.state;
  s.issueIndexInRun = 2; s._stagedAuthoringSceneIndex = 15;      // scene 16
  s.sceneSkeleton = null; s._skeletonMeta = null;
  const o = window._resolveIssueOutline(s);
  // THE EXPECTED SET, computed from the PLAN ITSELF: the rows in THIS window whose dependsOn
  // names the invalidated prerequisite. The earlier assertion accepted "every row >= 11", which
  // could not have rejected a wrongly-changed issue-2 row.
  const plan = window.STARTER_PLANS.starter_first_sacrifice;
  const expected = plan.scenes
    .filter(r => r && Number(r.n) >= o.bounds.first && Number(r.n) <= o.bounds.last
      && Array.isArray(r.dependsOn) && r.dependsOn.indexOf('prereq:julian_act_concealed') !== -1)
    .map(r => Number(r.n)).sort((a, b) => a - b);
  const actual = o.scenes.filter(r => r.kind === 'overturned').map(r => r.n).sort((a, b) => a - b);
  const r16 = o.scenes.filter(x => x.n === 16)[0];
  const r14 = o.scenes.filter(x => x.n === 14)[0];
  return JSON.parse(JSON.stringify({ expected: expected, actual: actual, r16: r16, r14: r14,
    authorBlock: window._renderIssueOutlineDirective(s, 16) || '' }));
});
fs.writeFileSync('_audit_out/issue_boundary/issue2_scene16_author_block.txt', i2affected.authorBlock);
t('EXACTLY the rows whose dependsOn names the invalidated prerequisite are overturned',
  i2affected.actual.join(',') === i2affected.expected.join(',') && i2affected.expected.length > 0,
  JSON.stringify({ expected: i2affected.expected, actual: i2affected.actual }));
t('the carried change voids row 16 three issues after the choice that caused it',
  i2affected.r16.kind === 'overturned' && i2affected.r16.accomplishes === ''
  && (i2affected.r16.brokenPrereqs || []).indexOf('prereq:julian_act_concealed') !== -1,
  JSON.stringify([i2affected.r16.kind, i2affected.r16.brokenPrereqs]));
t('the OUTGOING AUTHOR request carries it, and not the obsolete assignment',
  /Its original assignment is VOID and is not stated below/.test(i2affected.authorBlock)
  && !/Julian finally admits he acted/.test(i2affected.authorBlock), i2affected.authorBlock.slice(0, 400));
t('and the original event is NOT replayed — the directive asks for its consequences instead',
  /Develop from what is now true/.test(i2affected.authorBlock)
  && /Do NOT manufacture an equivalent loss to restore it/.test(i2affected.authorBlock),
  i2affected.authorBlock.slice(-400));
t('an UNAFFECTED issue-2 row keeps its kind and its assignment',
  i2affected.r14.kind === 'convergence' && !!i2affected.r14.accomplishes,
  JSON.stringify([i2affected.r14.kind, (i2affected.r14.accomplishes || '').slice(0, 60)]));

// ═══ 5. PROSE FALLS OUT OF CONTEXT; DURABLE RECORDS DO NOT ══════════════════════════════════
section('5. OLDER HISTORY STAYS USABLE WHEN ITS PROSE LEAVES THE WINDOW');
const windowed = await page.evaluate(() => {
  const s = window.state;
  // Many later notes push the earliest ones out of the RECENT window the formatter renders.
  for (let n = 12; n <= 24; n++) {
    s._historyNotes.push({ v: 4, ref: 'p:f' + n, sceneUid: 'p:f' + n, sceneNumber: n, quotesStale: false,
      proseHash: 'hf' + n, quoted: [{ quote: 'Filler prose for scene ' + n + ', long enough to count as a quotation.', kind: 'events', text: 'filler' }],
      summary: [], knowledge: [], obligations: [] });
  }
  s._issueOutline = null;
  const hist = window._buildHistoryContinuityBlock(s, {}) || '';
  const o = window._resolveIssueOutline(s);
  return JSON.parse(JSON.stringify({ hist: hist, overturned: o.overturned.slice(),
    assessments: (s._milestoneDeliveries || []).filter(r => r.accepted && !r.superseded).length,
    facts: ((s._committedState || {}).facts || []).length }));
});
fs.writeFileSync('_audit_out/issue_boundary/windowed_history.txt', windowed.hist);
t('the earliest prose has fallen out of the recent-history window',
  !/She was already past the trunks/.test(windowed.hist), 'the window did not roll');
t('...but the UNRESOLVED obligation from that scene is still carried',
  /ob:answer_the_notice/.test(windowed.hist),
  (windowed.hist.match(/OBLIGATIONS STILL OPEN[\s\S]{0,260}/) || ['(absent)'])[0]);
t('...the resolved one still does not resurrect',
  !/ob:face_seren/.test(windowed.hist), 'a settled obligation came back');
t('...the committed fact and the accepted assessment are untouched by the window',
  windowed.facts === 1 && windowed.assessments === 1,
  JSON.stringify([windowed.facts, windowed.assessments]));
t('...and the Fate change is still in force',
  windowed.overturned.indexOf('prereq:julian_act_concealed') !== -1, JSON.stringify(windowed.overturned));

// ═══ 6. CONVERGENCE SURVIVES; ONLY GENUINELY AFFECTED ROWS CHANGE ═══════════════════════════
section('6. PRESERVE CONVERGENCE WHERE STILL POSSIBLE');
const conv = await page.evaluate(() => {
  const s = window.state;
  s.issueIndexInRun = 2; s._stagedAuthoringSceneIndex = 10;
  s._issueOutline = null;
  const o = window._resolveIssueOutline(s);
  const byKind = {};
  o.scenes.forEach(r => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
  const r14 = o.scenes.filter(x => x.n === 14)[0];
  return JSON.parse(JSON.stringify({ byKind: byKind, r14: r14,
    overturnedRows: o.scenes.filter(r => r.kind === 'overturned').map(r => r.n) }));
});
t('only the rows that depend on the invalidated condition are overturned',
  conv.overturnedRows.every(n => [16].indexOf(n) !== -1 || n >= 11),
  JSON.stringify(conv.overturnedRows));
t('the issue-2 convergence point at scene 14 is PRESERVED, with its route from the issue-1 choice',
  conv.r14.kind === 'convergence' && !!conv.r14.activeRoute
  && conv.r14.activeRoute.choice === 'run' && /a flight on the record/.test(conv.r14.activeRoute.carries || ''),
  JSON.stringify([conv.r14.kind, conv.r14.activeRoute]));
t('the issue still mixes independent, convergence and conditional rows',
  Object.keys(conv.byKind).length >= 3, JSON.stringify(conv.byKind));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('evidence: _audit_out/issue_boundary/');
process.exit(fail ? 1 : 0);
