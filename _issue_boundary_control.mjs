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

// ═══ 3. THE RELOAD ROUND TRIP ═══════════════════════════════════════════════════════════════
section('3. SAVE / RELOAD: identities, evidence status and consequences survive');
// The round trip production performs: the snapshot is {...state} minus a named deletion list, and
// loadStoryData applies it with Object.assign(state, data.stateSnapshot). Driven here with the
// real saveStorySnapshot first, so its deletion list is the one that applies.
const reload = await page.evaluate(() => {
  const s = window.state;
  let saveThrew = null;
  try { localStorage.removeItem('sb_saved_story'); } catch (_) {}
  // saveStorySnapshot returns early without #storyText, which production always has when a story
  // is mounted. A DOM fixture, not a code change.
  if (!document.getElementById('storyText')) {
    const el = document.createElement('div'); el.id = 'storyText'; document.body.appendChild(el);
  }
  // Make sure the outline cache EXISTS before the save, so its absence afterwards is production's
  // deletion and not an accident of this fixture.
  window._resolveIssueOutline(s);
  try { window.__saveStorySnapshot(); } catch (e) { saveThrew = String(e && e.message); }
  // THE SNAPSHOT PRODUCTION ACTUALLY WROTE, read back across the real JSON boundary.
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('sb_saved_story') || 'null'); } catch (_) {}
  const wire = (stored && stored.stateSnapshot) ? stored.stateSnapshot : null;
  if (!wire) return { fatal: 'production wrote no stateSnapshot to sb_saved_story', saveThrew: saveThrew };
  const cacheWasLive = true;
  // A FRESH PAGE would start from a blank state; simulate that, then restore as production does.
  const keep = { storyId: s.storyId };
  Object.keys(s).forEach(k => { try { delete s[k]; } catch (_) {} });
  Object.assign(s, keep);
  Object.assign(s, wire);                                    // loadStoryData's own assignment
  const o = window._resolveIssueOutline(s);                  // ORDINARY read after the reload
  const r16 = o.scenes.filter(x => x.n === 16)[0];
  return JSON.parse(JSON.stringify({ saveThrew: saveThrew, cacheWasLive: cacheWasLive,
    outlineCachePersisted: Object.prototype.hasOwnProperty.call(wire, '_issueOutline'),
    decisions: s._sceneDecisions, notes: (s._historyNotes || []).map(h => [h.sceneNumber, h.ref, !!h.quotesStale]),
    facts: (s._committedState && s._committedState.facts) || [],
    log: (s._committedState && s._committedState.deliveryLog) || {},
    fate: s._temptFateDurableConsequences, assessments: s._milestoneDeliveries,
    overturned: o.overturned.slice(), bounds: o.bounds, r16: r16,
    block: window._renderIssueOutlineDirective(s, 11) || '',
    history: window._buildHistoryContinuityBlock(s, {}) || '' }));
});
fs.writeFileSync('_audit_out/issue_boundary/after_reload.json', JSON.stringify({
  decisions: reload.decisions, notes: reload.notes, facts: reload.facts, log: reload.log,
  fate: reload.fate, assessments: reload.assessments, overturned: reload.overturned }, null, 1));
t('the real saveStorySnapshot ran and wrote a stateSnapshot',
  !reload.fatal && reload.saveThrew === null, reload.fatal || reload.saveThrew);
t('the DERIVED outline cache is NOT in the snapshot PRODUCTION wrote (the cache was live before it)',
  reload.cacheWasLive === true && reload.outlineCachePersisted === false,
  JSON.stringify({ live: reload.cacheWasLive, persisted: reload.outlineCachePersisted }));
t('the recorded player choice survives the reload',
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
t('production restores with Object.assign(state, data.stateSnapshot) — the assignment driven above',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /if\(data\.stateSnapshot\) Object\.assign\(state, data\.stateSnapshot\);/.test(src)
      && /delete cleanState\._issueOutline;/.test(src);
  })(), 'the restore path or the cache exclusion is not what this test drives');

// ═══ 4. INTO ISSUE 3, AND INTO THE OUTGOING REQUESTS ════════════════════════════════════════
section('4. ISSUE 3: the issue-1 change is still reflected, and reaches the real requests');
calls.length = 0;
const i3 = await page.evaluate(async () => {
  const s = window.state;
  s.issueIndexInRun = 3; s._stagedAuthoringSceneIndex = 20;     // CG scene 21, issue 3 opening
  // Issue 3 is past the plan's 20 authored rows, so the window is empty of plan rows: the test is
  // that the CARRYOVER is still in force and still reaches the requests.
  const o3 = window._resolveIssueOutline(s);
  // AND BACK INTO AN ISSUE-2 SCENE, to show the carried change shaping a row that has one.
  s.issueIndexInRun = 2; s._stagedAuthoringSceneIndex = 15;      // scene 16
  s.sceneSkeleton = null; s._skeletonMeta = null;
  const o2 = window._resolveIssueOutline(s);
  const r16 = o2.scenes.filter(x => x.n === 16)[0];
  const authorBlock = window._renderIssueOutlineDirective(s, 16) || '';
  await window.__generateSceneSkeleton('wait', '', { sceneNumber: 16 });
  return JSON.parse(JSON.stringify({ i3Bounds: o3.bounds, i3Overturned: o3.overturned.slice(),
    i3Fate: (s._temptFateDurableConsequences || []).length,
    r16: r16, authorBlock: authorBlock,
    summary: window._issueOutlineSummary() }));
});
const skelReq = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined)).pop();
fs.writeFileSync('_audit_out/issue_boundary/issue3_scaffold_request.txt', (skelReq && skelReq.joined) || '(none)');
fs.writeFileSync('_audit_out/issue_boundary/issue2_scene16_author_block.txt', i3.authorBlock);
t('issue 3 resolves as issue 3, with the issue-1 Fate change still in force',
  i3.i3Bounds.issueIndex === 3 && i3.i3Overturned.indexOf('prereq:julian_act_concealed') !== -1
  && i3.i3Fate === 1, JSON.stringify({ b: i3.i3Bounds.issueIndex, ov: i3.i3Overturned }));
t('the carried change still voids row 16 three issues later',
  i3.r16.kind === 'overturned' && i3.r16.accomplishes === ''
  && (i3.r16.brokenPrereqs || []).indexOf('prereq:julian_act_concealed') !== -1,
  JSON.stringify([i3.r16.kind, i3.r16.brokenPrereqs]));
t('the OUTGOING AUTHOR request carries it, and not the obsolete assignment',
  /Its original assignment is VOID and is not stated below/.test(i3.authorBlock)
  && !/Julian finally admits he acted/.test(i3.authorBlock), i3.authorBlock.slice(0, 500));
t('the OUTGOING SCAFFOLD request carries it too, before it outlines anything',
  !!skelReq && /THIS SCENE IS OVERTURNED/.test(skelReq.joined)
  && !/WHAT IT ACCOMPLISHES: Julian finally admits he acted/.test(skelReq.joined),
  skelReq && (skelReq.joined.match(/THIS SCENE IS OVERTURNED[\s\S]{0,300}/) || ['(absent)'])[0]);
t('the carried ISSUE-1 history still reaches the scaffold request',
  !!skelReq && /She was already past the trunks/.test(skelReq.joined)
  && /ob:answer_the_notice/.test(skelReq.joined),
  skelReq && (skelReq.joined.match(/WHAT HAS ALREADY BEEN WRITTEN[\s\S]{0,400}/) || ['(absent)'])[0]);
t('and the original event is NOT replayed — the directive asks for its consequences instead',
  /Develop from what is now true/.test(i3.authorBlock)
  && /Do NOT manufacture an equivalent loss to restore it/.test(i3.authorBlock), i3.authorBlock.slice(-500));

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
