// ── ONE SCENE-IDENTIFIED, REVISION-AWARE HISTORY SOURCE ACROSS THE CHAIN (provider-free, $0) ──
// Drives the SHIPPED functions with every provider route intercepted. Every model response here is
// CONSTRUCTED in this file and labelled as such. No provider is called; nothing is billed.
//
// FOUR DEFECTS THIS COVERS (reviewer, 25cf9e5e):
//   1. the Scene Scaffold never received the history-note block or the open obligations
//   2. the Issue Spine never reconciled future assignments against what was actually written,
//      and used the NUMBER of notes as evidence a particular scene existed
//   3. the formatter labelled notes by list position, so a scene-2 note read "scene 1"
//   4. a later prose revision left stale "verbatim" quotations presented as the scene's own words
import { chromium } from 'playwright-core';
import fs from 'fs';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + String(detail).slice(0, 800) : '')); }
};
const section = (n) => console.log('\n' + n);

// CONSTRUCTED scaffold reply — minimal, since this file is about history, not the outline shape.
const CONSTRUCTED_SCAFFOLD = {
  environment_anchor: 'the gap between two trunks where the assembly came in',
  structural_pacing: 'measured escalation', narrative_density: 'moderate',
  dialogue_ratio: 'dialogue-led', beat_style: 'procedure then reaction',
  tension_rhythm: 'rising with pauses',
  staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON', role: 'subject' }],
  interlocutor_placement: 'the presiding Dohkar — reads from a page he does not look up from',
  li_texture_beat: null, pc_body_callback: null, li_body_callback: null, antagonist_body_callback: null,
  environment_plus: { target: 'the gap between two trunks', axis: 'use' }, fusion: null,
  causal_outline: [{ beat: 'The Dohkar steps into the gap and will not let her pass' },
                   { beat: 'He reads her the notice', link: 'therefore', from: 1 }],
  stage_contract: { present: ['Lirael'] }
};

console.log('=== HISTORY CHAIN: SCENE IDENTITY, REVISION AWARENESS, SPINE RECONCILIATION ($0) ===');
console.log('Every model response in this file is CONSTRUCTED here and labelled as such.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
let verifierSeen = null;
let pageVerifierResp = null;
let rewriteDuringRequest = false;
let editDuringRequest = false;
let captureCommitProse = false;
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const joined = (body.messages || []).map(m => String(m.content || '')).join('\n');
  calls.push({ url, role: body.role, model: body.model || body.preferredModel, joined, bytes: joined.length });
  const reply = (c, m) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ model: m || 'constructed', resolvedModel: m || 'constructed',
      choices: [{ message: { content: c }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, cost_in_usd_ticks: 0 } }) });
  if (/mistral-proxy/.test(url) && /narrative skeletons/i.test(joined))
    return reply(JSON.stringify(CONSTRUCTED_SCAFFOLD), String(body.model || 'constructed'));
  // THE RUNTIME COMMIT VERIFIER. A CONSTRUCTED verdict in the shape the production contract asks
  // for, with evidence copied verbatim out of the prose the request actually carries, and the ref
  // copied from the request so nothing is invented.
  if (/RUNTIME COMMIT verifier/i.test(joined)) {
    const ref = (joined.match(/prop:\d+:\d+/) || [null])[0];
    verifierSeen = { ref: ref, bytes: joined.length, joined: joined };
    // THE WHOLE OUTGOING REQUEST. Asserting on the entire body rather than on an extracted prose
    // block is the stronger check: page A's text must appear NOWHERE in what the verifier is sent.
    if (captureCommitProse) submittedProse = joined;
    if (rewriteDuringRequest) { try { await page.evaluate(() => window.__ctlRewriteDuring && window.__ctlRewriteDuring()); } catch (_) {} }
    if (editDuringRequest) { try { await page.evaluate(() => window.__ctlEditPage && window.__ctlEditPage()); } catch (_) {} }
    if (pageVerifierResp) return reply(JSON.stringify(pageVerifierResp), 'constructed-verifier');
    return reply(JSON.stringify({
      delivery: 'DELIVERED',
      actual_exit_state: 'Julian has publicly claimed authority to convene the inquiry',
      slots_check: {
        actor_evidence: 'Julian stepped past the Dohkar',
        action_evidence: 'the inquiry was his to convene, and he would convene it',
        target_evidence: 'said it to the whole clearing',
        exit_state_evidence: '"A formal inquiry," he said. "I will preside."',
        precondition_evidence: 'the assembly heard every word of it where they stood on the spiralgrass'
      },
      per_proposal: ref ? [{ ref: ref, delivery: 'DELIVERED',
        evidence: 'the inquiry was his to convene, and he would convene it',
        precondition_evidence: 'the assembly heard every word of it where they stood on the spiralgrass',
        reason: 'delivered' }] : []
    }), 'constructed-verifier');
  }
  return reply('{}', 'constructed');
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._buildHistoryContinuityBlock === 'function'
  && typeof window._resolveIssueOutline === 'function', { timeout: 30000 });
await page.evaluate(() => {
  // A CONTROL HELPER that does what production does: the CURRENT page is recorded in the scene
  // ledger as the one that rendered scene n, and the identity is then built for that scene.
  window.__ctlResetLedger = function (s) { try { delete (s || window.state)._sceneLedger; } catch (_) {} };
  // MOUNT the prose as its own page, record its ownership, and build the identity for scene n.
  // Every _commitScene caller needs real ownership now: the gate refuses durable writes without
  // it, which is the point of the gate.
  window.__ctlMount = function (s, n, text) {
    StoryPagination.addPage('<p>' + String(text) + '</p>', true);
    var uid = StoryPagination.getCurrentPageUid();
    window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: n, pageUid: uid, event: 'ctl scene ' + n });
    return window.__buildCommitSceneIdentity(s, text, null, 'pagination', n);
  };
  window.__ctlOwn = function (s, n, text) {
    var uid = StoryPagination.getCurrentPageUid();
    window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: n, pageUid: uid, event: 'ctl scene ' + n });
    return window.__buildCommitSceneIdentity(s, text, null, 'pagination', n);
  };
  window.__ctlPageText = function () {
  return StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }; });

// ═══ 3. THE FORMATTER LABELS BY SCENE IDENTITY, NOT LIST POSITION ════════════════════════════
section('3. SCENE IDENTITY (the reviewer\'s reproduction: a scene-2 note labelled "scene 1")');
const ident = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'ctl-hist'; s._starterId = 'starter_first_sacrifice';
  s.currentEngine = 'graphic'; s.renderMode = 'cg'; s.storyLength = 'fling'; s.issueIndexInRun = 1;
  // CONSTRUCTED notes, in the v4 shape _attachHistoryNote writes. Exactly the reviewer's case:
  // the FIRST note in the list belongs to scene 2 and the SECOND to scene 5, with scene 1's note
  // absent. Position-derived labelling called them scenes 1 and 2.
  s._historyNotes = [
    { v: 4, ref: 'p:aaa', sceneUid: 'p:aaa', sceneNumber: 2, sceneNumberSource: 'ctl',
      quoted: [{ quote: 'The Dohkar turned his back on her in front of everyone.', kind: 'event', text: 'he refused her publicly' }],
      summary: [], knowledge: [], obligations: [], quotesStale: false },
    { v: 4, ref: 'p:bbb', sceneUid: 'p:bbb', sceneNumber: 5, sceneNumberSource: 'ctl',
      quoted: [{ quote: 'The record went into the box before the Chayr could read it.', kind: 'event', text: 'the record was moved' }],
      summary: [], knowledge: [], obligations: [], quotesStale: false }
  ];
  return window._buildHistoryContinuityBlock(s, {}) || '';
});
fs.mkdirSync('_audit_out/history_chain', { recursive: true });
fs.writeFileSync('_audit_out/history_chain/labels.txt', ident);
t('the scene-2 note is labelled scene 2, not scene 1',
  /scene 2 — the scene's own words: "The Dohkar turned his back/.test(ident) && !/scene 1 — the scene's own words/.test(ident),
  ident);
t('the scene-5 note is labelled scene 5, not scene 2',
  /scene 5 — the scene's own words: "The record went into the box/.test(ident), ident);
t('a note with no scene identity says so rather than being given a position number',
  await page.evaluate(() => {
    const s = window.state;
    s._historyNotes = [{ v: 4, ref: 'p:zzz', sceneUid: 'p:zzz', sceneNumber: null,
      quoted: [{ quote: 'Something happened.', kind: 'event', text: 'x' }],
      summary: [], knowledge: [], obligations: [], quotesStale: false }];
    const b = window._buildHistoryContinuityBlock(s, {}) || '';
    return /scene unknown \[p:zzz\]/.test(b) && !/scene 1 —/.test(b);
  }), 'an unidentified note was given a number');
t('the shipped attach records the scene number the caller supplies',
  await page.evaluate(() => {
    const s = window.state;
    s._historyNotes = []; s.scenes = [];
    window._attachHistoryNote('p:ccc', { events: [{ text: 'she refused to sign',
        quote: 'She signed nothing, and the page stayed between them.' }] },
      'She signed nothing, and the page stayed between them.', { sceneNumber: 4, sceneNumberSource: 'ctl' });
    const hn = s._historyNotes[0];
    return !!hn && hn.sceneNumber === 4 && hn.sceneNumberSource === 'ctl' && !!hn.proseHash;
  }), 'attach did not record the scene number');

// ═══ 4. A REVISION SUPERSEDES THE SCENE'S OWN QUOTATIONS ═════════════════════════════════════
section('4. REVISION AWARENESS: a rewrite supersedes the quotations checked against the old text');
const revised = await page.evaluate(() => {
  const s = window.state;
  s.scenes = []; s._historyNotes = []; s._temptOutcomePending = {};
  // A real scene record through the shipped projection API, then a real revision through it.
  const uid = window._sbMintSceneUid('ctl');
  const PROSE = 'She signed nothing, and the page stayed between them.';
  s.scenes.push({ uid: uid, text: PROSE,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(PROSE),
      revision: 0, provenance: 'api_built', builtAt: Date.now() } });
  window._attachHistoryNote(uid, { events: [{ text: 'she refused to sign', quote: PROSE }] },
    PROSE, { sceneNumber: 4, sceneNumberSource: 'ctl' });
  const before = window._buildHistoryContinuityBlock(s, {}) || '';
  // THE REWRITE removes the quoted sentence. _sbInvalidateDependentsOfScene is the shipped hook.
  const invalidated = window._sbInvalidateDependentsOfScene
    ? window._sbInvalidateDependentsOfScene(uid, s.scenes[0].projection.hash, 1)
    : (() => { throw new Error('hook not exposed'); })();
  const after = window._buildHistoryContinuityBlock(s, {}) || '';
  return JSON.parse(JSON.stringify({ before, after, invalidated,
    note: s._historyNotes[0] }));
});
fs.writeFileSync('_audit_out/history_chain/revision.txt',
  '--- BEFORE THE REVISION ---\n' + revised.before + '\n\n--- AFTER THE REVISION ---\n' + revised.after);
t('before the revision the quotation IS presented as the scene\'s own words',
  /the scene's own words: "She signed nothing, and the page stayed between them\."/.test(revised.before),
  revised.before || '(empty block)');
t('the revision marks the note stale and reports it as a dependent',
  revised.note.quotesStale === true && /hash .* -> revision 1/.test(String(revised.note.staleReason))
  && (revised.invalidated || []).some(x => /^historyNote:/.test(String(x))),
  JSON.stringify({ stale: revised.note.quotesStale, why: revised.note.staleReason, inv: revised.invalidated }));
t('after the revision the quotation is NO LONGER presented as the scene\'s own words',
  !/the scene's own words: "She signed nothing/.test(revised.after), revised.after);
t('...and is demoted to the unverified section as SUPERSEDED, with its reason, not deleted',
  /SUPERSEDED — this was quoted from a version of the scene that has since been revised/.test(revised.after)
  && /was quoted as: "She signed nothing, and the page stayed between them\."/.test(revised.after), revised.after);

// ═══ 1. THE SCAFFOLD RECEIVES THE SAME HISTORY ═══════════════════════════════════════════════
section('1. THE SCENE SCAFFOLD RECEIVES THE SHARED HISTORY BLOCK AND OPEN OBLIGATIONS');
calls.length = 0;
const scaf = await page.evaluate(async () => {
  const s = window.state;
  s.scenes = []; s._temptOutcomePending = {};
  s.sceneSkeleton = null; s._skeletonMeta = null;
  s._issueOutline = null; s._issueOutlineHistory = {};
  s._stagedAuthoringSceneIndex = 3;
  s._historyNotes = [
    { v: 4, ref: 'p:aaa', sceneUid: 'p:aaa', sceneNumber: 2, quotesStale: false,
      quoted: [{ quote: 'The Dohkar turned his back on her in front of everyone.', kind: 'event', text: 'he refused her publicly' }],
      summary: [{ kind: 'reading', text: 'the assembly took his side' }],
      knowledge: [{ who: 'Seren', text: 'knows Lirael was blamed' }],
      obligations: [{ id: 'ob:answer_the_notice', text: 'Lirael still owes the panel an answer' }] }
  ];
  await window.__generateSceneSkeleton('wait for the Dohkar', '', { sceneNumber: 4 });
  return true;
});
const skelReq = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined))[0];
fs.writeFileSync('_audit_out/history_chain/scaffold_request.txt', (skelReq && skelReq.joined) || '(none)');
t('the scaffold request carries the QUOTED section of the shared history block',
  !!skelReq && /WHAT THE SCENES THEMSELVES SAY — quoted verbatim/.test(skelReq.joined)
  && /scene 2 — the scene's own words: "The Dohkar turned his back/.test(skelReq.joined),
  skelReq && (skelReq.joined.match(/WHAT HAS ALREADY BEEN WRITTEN[\s\S]{0,700}/) || ['(absent)'])[0]);
t('...the UNVERIFIED summary section, kept distinct from the quotations',
  !!skelReq && /THE AUTHOR'S SUMMARY OF PRIOR SCENES — UNVERIFIED, NOT CANON/.test(skelReq.joined)
  && /knowledge, UNVERIFIED/.test(skelReq.joined), 'summary section absent');
t('...and the OPEN OBLIGATIONS, with their ids',
  !!skelReq && /PROPOSED OBLIGATIONS STILL OPEN/.test(skelReq.joined)
  && /ob:answer_the_notice/.test(skelReq.joined), 'obligations absent');
t('the scaffold is told to outline the CONSEQUENCES of that history, not repeat it',
  !!skelReq && /DO NOT OUTLINE A DEVELOPMENT THE QUOTED TEXT SHOWS ALREADY HAPPENED/.test(skelReq.joined)
  && /Outline the CONSEQUENCES of what is below/.test(skelReq.joined), 'instruction absent');
t('the SAME builder feeds the scaffold and the planner — one source, not a second copy',
  !!skelReq && skelReq.joined.includes(await page.evaluate(() =>
    (window._buildHistoryContinuityBlock(window.state, {}) || '').split('\n')[1] || 'x')),
  'the scaffold block is not the shared builder\'s output');

// ═══ 2. THE ISSUE SPINE RECONCILES AGAINST WHAT WAS ACTUALLY WRITTEN ═════════════════════════
section('2a. NOTE COUNT IS NOT SCENE IDENTITY');
const idEvid = await page.evaluate(() => {
  const s = window.state;
  s._committedState = null; s._issueOutline = null; s._issueOutlineHistory = {};
  s._stagedAuthoringSceneIndex = 5;                       // scene 6
  // FIVE notes, none of which identifies scene 3. The old test ("are there >= 3 notes?") called
  // scene 3 written on that basis alone.
  s._historyNotes = [1, 2, 4, 5, 7].map(n => ({ v: 4, ref: 'p:' + n, sceneUid: 'p:' + n, sceneNumber: n,
    quotesStale: false, quoted: [], summary: [], knowledge: [], obligations: [] }));
  const o = window._resolveIssueOutline(s, { force: true });
  return JSON.parse(JSON.stringify({ rows: o.scenes.filter(r => r.n <= 5).map(r => [r.n, r.delivery, r.deliveryEvidence]) }));
});
t('a scene with a note of its own is written_unassessed',
  idEvid.rows[1][1] === 'written_unassessed' && /belongs to scene 2/.test(idEvid.rows[1][2]),
  JSON.stringify(idEvid.rows[1]));
t('a scene with NO note of its own is NOT called written, even with five notes in the list',
  idEvid.rows[2][1] === 'not_written' && /no history note identifies scene 3/.test(idEvid.rows[2][2]),
  JSON.stringify(idEvid.rows[2]));

section('2b. A COMMITTED FACT IS NOT THE WHOLE ASSIGNMENT');
const partial = await page.evaluate(() => {
  const s = window.state;
  s._historyNotes = [];
  s._committedState = {
    facts: [{ fact: 'The presiding Dohkar declares the rite his to rule on', proposalRef: 'prop:1:1',
              provenanceLink: 'sealed', committedAtScene: 1, provenance: 'delivered' }],
    _committedThroughScene: 1,
    // This scene's OWN verdict did NOT record the planned event delivered.
    // Checked, nothing about this ROW'S milestone established: the fact carries no milestoneScene
    // and no DELIVERED aggregate was supplied.
    deliveryLog: { '1': { scene: 1, verifierReported: true, aggregateSupplied: true,
                          aggregateDelivery: 'MISSED', committed: [{ ref: 'prop:1:1' }], pending: {} } },
    pendingIntent: null, tableau: null
  };
  s._issueOutline = null; s._issueOutlineHistory = {};
  s._stagedAuthoringSceneIndex = 5;
  const o = window._resolveIssueOutline(s, { force: true });
  const r1 = o.scenes.filter(r => r.n === 1)[0];
  const block = window._renderIssueOutlineDirective(s, 6) || '';
  // Now the same facts WITH a delivered verdict.
  s._committedState.deliveryLog['1'].aggregateSupplied = true;
  s._committedState.deliveryLog['1'].aggregateDelivery = 'DELIVERED';
  s._issueOutline = null; s._issueOutlineHistory = {};
  const r1b = window._resolveIssueOutline(s, { force: true }).scenes.filter(r => r.n === 1)[0];
  return JSON.parse(JSON.stringify({ r1, block, r1b }));
});
fs.writeFileSync('_audit_out/history_chain/partial_verification.txt', partial.block);
t('a committed fact with NO delivered verdict yields partially_verified, not committed',
  partial.r1.delivery === 'partially_verified'
  && /the ROW'S ASSIGNMENT is not/.test(partial.r1.deliveryEvidence), JSON.stringify(partial.r1.deliveryEvidence));
t('the author is told the fact is established and the assignment is NOT',
  /PARTLY VERIFIED/.test(partial.block)
  && /its assignment: NOT established/.test(partial.block)
  && /"The presiding Dohkar declares the rite his to rule on"/.test(partial.block),
  (partial.block.match(/PARTLY VERIFIED[\s\S]{0,500}/) || [''])[0]);
t('with the scene\'s own verdict DELIVERED it becomes committed',
  partial.r1b.delivery === 'committed' && /verdict recorded the planned event DELIVERED/.test(partial.r1b.deliveryEvidence),
  JSON.stringify(partial.r1b.deliveryEvidence));

section('2c. A DEVELOPMENT VOLUNTEERED EARLY IS NOT STILL SCHEDULED AS A REVELATION');
const early = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 4;    // scene 6
  s._committedState = null; s._issueOutline = null; s._issueOutlineHistory = {};
  // CONSTRUCTED: scene 3's prose already said, in its own words, what scene 16 is scheduled to
  // reveal. The marker is the seed's own eventMarkers entry for row 16.
  s._historyNotes = [{ v: 4, ref: 'p:s3', sceneUid: 'p:s3', sceneNumber: 3, quotesStale: false,
    quoted: [{ quote: 'I bent the wish, Julian said, and did not look away when he said it.',
               kind: 'event', text: 'he admitted it' }],
    summary: [], knowledge: [], obligations: [] }];
  const o = window._resolveIssueOutline(s, { force: true });
  const r16 = o.scenes.filter(r => r.n === 16)[0];
  s.turnCount = 14; s._issueOutline = null;
  const block16 = window._renderIssueOutlineDirective(s, 16) || '';
  // And the scaffold must be told too, before it outlines anything.
  return JSON.parse(JSON.stringify({ r16, block16, summary: window._issueOutlineSummary().alreadyWrittenWarnings }));
});
fs.writeFileSync('_audit_out/history_chain/already_written.txt', early.block16);
t('the future row is FLAGGED from quote-backed prose in an earlier scene',
  !!early.r16.alreadyWritten && early.r16.alreadyWritten.length >= 1
  && early.r16.alreadyWritten[0].marker === 'i bent the wish'
  && early.r16.alreadyWritten[0].atScene === 3,
  JSON.stringify(early.r16.alreadyWritten));
t('the author is shown the quotation and told to write its consequences instead',
  /THIS DEVELOPMENT MAY ALREADY HAVE BEEN WRITTEN/.test(early.block16)
  && /scene 3 says: "I bent the wish, Julian said/.test(early.block16)
  && /write the CONSEQUENCES of it having happened/.test(early.block16),
  (early.block16.match(/MAY ALREADY HAVE BEEN WRITTEN[\s\S]{0,600}/) || [''])[0]);
t('...and told the flag is lexical, so an incidental match does not suppress a real revelation',
  /This is a lexical flag, not a verdict/.test(early.block16)
  && /If the match is incidental and the development has NOT actually occurred, deliver it as assigned/.test(early.block16),
  'the caveat is missing');
t('the lexical warnings are listed in the devtools summary, labelled as warnings',
  Array.isArray(early.summary) && early.summary.some(x => x.scene === 16 && x.tier === 'lexical warning'),
  JSON.stringify(early.summary));
t('a quotation from the SAME or a LATER scene does not flag the row',
  await page.evaluate(() => {
    const s = window.state;
    s._historyNotes = [{ v: 4, ref: 'p:s17', sceneUid: 'p:s17', sceneNumber: 17, quotesStale: false,
      quoted: [{ quote: 'I bent the wish, he said again.', kind: 'event', text: 'x' }],
      summary: [], knowledge: [], obligations: [] }];
    s._issueOutline = null; s._issueOutlineHistory = {};
    const r = window._resolveIssueOutline(s, { force: true }).scenes.filter(x => x.n === 16)[0];
    return !r.alreadyWritten;
  }), 'a later scene flagged an earlier row');
t('a STALE quotation does not flag the row either — superseded text is not evidence',
  await page.evaluate(() => {
    const s = window.state;
    s._historyNotes = [{ v: 4, ref: 'p:s3', sceneUid: 'p:s3', sceneNumber: 3, quotesStale: true,
      staleReason: 'revised',
      quoted: [{ quote: 'I bent the wish, Julian said.', kind: 'event', text: 'x' }],
      summary: [], knowledge: [], obligations: [] }];
    s._issueOutline = null; s._issueOutlineHistory = {};
    const r = window._resolveIssueOutline(s, { force: true }).scenes.filter(x => x.n === 16)[0];
    return !r.alreadyWritten;
  }), 'a superseded quotation flagged the row');
t('with no history at all, nothing is flagged',
  await page.evaluate(() => {
    const s = window.state;
    s._historyNotes = []; s._issueOutline = null; s._issueOutlineHistory = {};
    const o = window._resolveIssueOutline(s, { force: true });
    return o.scenes.every(r => !r.alreadyWritten);
  }), 'something was flagged with no history');

// ═══ 5. THE OUTLINE REFRESHES ITSELF — NO MANUAL CACHE CLEARING ANYWHERE BELOW ══════════════
section('5. AUTOMATIC REFRESH: history and delivery changes are noticed without forcing a rebuild');
// Every call in this section goes through the ORDINARY read path: _resolveIssueOutline(s) with no
// `force`, and NOTHING sets s._issueOutline = null. That is the reviewer's reproduction: the old
// cache key held no history or revision fingerprint, so the warning appeared only after a forced
// rebuild and then survived the quotation being superseded.
const refresh = await page.evaluate(async () => {
  const s = window.state;
  const PROSE = 'I bent the wish, Julian said, and did not look away when he said it.';
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 14;      // scene 16
  s._committedState = null; s._temptFateDurableConsequences = []; s._fpcActiveCompiled = null;
  s._sceneDecisions = { '1': { choice: 'run', label: 'x', at: Date.now(), storyId: s.storyId } };
  s._historyNotes = []; s.scenes = []; s._temptOutcomePending = {};
  delete s._issueOutline; delete s._issueOutlineHistory;      // one setup, then hands off

  const read = () => {
    const o = window._resolveIssueOutline(s);                 // ORDINARY read: no force
    const r = o.scenes.filter(x => x.n === 16)[0];
    return { warned: !!r.alreadyWritten, delivered: !!r.alreadyDelivered, key: o._key.length };
  };
  const step1 = read();                                       // no history yet

  // ATTACH through the shipped function, against a real scene record.
  const uid = window._sbMintSceneUid('ctl');
  s.scenes.push({ uid: uid, text: PROSE,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(PROSE), revision: 0,
      provenance: 'api_built', builtAt: Date.now() } });
  window._attachHistoryNote(uid, { events: [{ text: 'he admitted it', quote: PROSE }] },
    PROSE, { sceneNumber: 3, sceneNumberSource: 'ctl' });
  const step2 = read();                                       // must NOTICE the new note

  // INVALIDATE through the shipped revision hook.
  window._sbInvalidateDependentsOfScene(uid, s.scenes[0].projection.hash, 1);
  const step3 = read();                                       // must NOTICE the supersession
  return JSON.parse(JSON.stringify({ step1, step2, step3 }));
});
console.log('      ' + JSON.stringify(refresh));
t('with no history, the ordinary read reports no warning',
  refresh.step1.warned === false, JSON.stringify(refresh.step1));
t('attaching a note makes the ORDINARY read report the warning — no force, no manual clearing',
  refresh.step2.warned === true, JSON.stringify(refresh.step2));
t('superseding that quotation makes the ORDINARY read DROP the warning again',
  refresh.step3.warned === false, JSON.stringify(refresh.step3));

// ═══ 6. SCENE IDENTITY ACROSS NOTE, PROPOSAL, VERDICT AND SPINE ROW ═════════════════════════
section('6. ONE SCENE IDENTITY: the note, the seal, the verdict and the spine row agree');
const sealed = await page.evaluate(() => {
  const s = window.state;
  s.turnCount = 1;                                   // story scene 2 is being planned
  s._sealedProposals = null;
  // The SHIPPED seal, called the way the planner now calls it: turn counter for the id, and the
  // authoritative story scene stated separately.
  const rec = window._sealProposal
    ? window._sealProposal({ kind: 'state_change', fact: 'Julian publicly claims authority to convene the inquiry',
        milestone: 'm', scene: (s.turnCount || 0), storyScene: 2 })
    : null;
  return rec ? JSON.parse(JSON.stringify({ id: rec.id, turn: rec.scene, storyScene: rec.storyScene,
    prov: rec.storySceneProvenance })) : null;
});
t('the sealed id still mints from the turn counter (prop:1:*) — existing references keep resolving',
  !!sealed && /^prop:1:/.test(sealed.id) && sealed.turn === 1, JSON.stringify(sealed));
t('...while the record states the STORY scene separately, as 2',
  !!sealed && sealed.storyScene === 2 && sealed.prov === 'caller', JSON.stringify(sealed));
const bound = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 4;        // scene 6
  s._historyNotes = []; s.scenes = []; s._temptOutcomePending = {};
  // A committed fact in the shape _commitTransition now writes: the id carries the TURN (1) and
  // the record carries the STORY scene (2). The reviewer's exact live case.
  s._committedState = {
    facts: [{ fact: 'Julian publicly claims authority to convene the inquiry', proposalRef: 'prop:1:1',
              provenanceLink: 'sealed', committedAtScene: 1, storyScene: 2,
              storySceneProvenance: 'caller', provenance: 'delivered' }],
    _committedThroughScene: 2,
    deliveryLog: { '2': { scene: 2, storyScene: 2, turnScene: 1, keyProvenance: 'storyScene',
                          verifierReported: true, aggregateDelivery: 'DELIVERED',
                          committed: [{ ref: 'prop:1:1' }], pending: {} } },
    pendingIntent: null, tableau: null
  };
  delete s._issueOutline; delete s._issueOutlineHistory;
  const o = window._resolveIssueOutline(s);
  return JSON.parse(JSON.stringify({ r1: o.scenes.filter(r => r.n === 1)[0],
    r2: o.scenes.filter(r => r.n === 2)[0] }));
});
t('the fact sealed prop:1:1 is attributed to STORY SCENE 2, not scene 1',
  bound.r2.delivery === 'committed' && bound.r1.delivery !== 'committed',
  JSON.stringify([bound.r1.delivery, bound.r2.delivery, bound.r2.deliveryEvidence]));
t('and the verdict keyed by the story scene is the one that confirms it',
  /verdict recorded the planned event DELIVERED/.test(bound.r2.deliveryEvidence),
  bound.r2.deliveryEvidence);
t('a LEGACY fact with no storyScene is still placed, and SAYS the scene was inferred',
  await page.evaluate(() => {
    const s = window.state;
    s._committedState.facts = [{ fact: 'x', proposalRef: 'prop:1:9', provenanceLink: 'sealed',
      committedAtScene: 1, provenance: 'delivered' }];
    s._committedState.deliveryLog = {};
    delete s._issueOutline; delete s._issueOutlineHistory;
    const r = window._resolveIssueOutline(s).scenes.filter(x => x.n === 1)[0];
    return /scene INFERRED from the reference for a legacy fact carrying no storyScene/.test(r.deliveryEvidence);
  }), 'legacy inference not reported');

// ═══ 7. THE VERDICT DEFAULT, AND THE DELIVERY LOG'S FIELD NAMES ═════════════════════════════
section('7. "NOBODY LOOKED" IS NOT "IT DID NOT HAPPEN"');
const unreported = await page.evaluate(() => {
  const s = window.state;
  s._committedState = {
    facts: [], _committedThroughScene: 3, pendingIntent: null, tableau: null,
    // _delivery is INITIALISED to 'MISSED', so a scene whose verifier never reported used to be
    // logged as checked-and-not-delivered. The log now records verifierReported.
    deliveryLog: { '3': { scene: 3, storyScene: 3, verifierReported: false,
                          aggregateDelivery: null, committed: [], pending: {} } }
  };
  s._historyNotes = [];
  delete s._issueOutline; delete s._issueOutlineHistory;
  const o = window._resolveIssueOutline(s);
  return JSON.parse(JSON.stringify(o.scenes.filter(r => r.n === 3)[0]));
});
t('a scene whose verifier never reported is UNVERIFIED, not assessed_not_delivered',
  unreported.delivery === 'unverified' && /NO verifier verdict was reported/.test(unreported.deliveryEvidence),
  JSON.stringify([unreported.delivery, unreported.deliveryEvidence]));
t('the delivery log records per-proposal statuses under the id the adjudicator actually emits',
  await page.evaluate(() => {
    const s = window.state;
    s._committedState.deliveryLog = { '3': { scene: 3, verifierReported: true, aggregateDelivery: 'MISSED',
      committed: [], pending: { 'prop:1:4': { status: 'MISSED', reason: 'verified_not_delivered' } } } };
    delete s._issueOutline; delete s._issueOutlineHistory;
    const r = window._resolveIssueOutline(s).scenes.filter(x => x.n === 3)[0];
    return r.delivery === 'assessed_not_delivered'
      && /prop:1:4:MISSED\/verified_not_delivered/.test(r.deliveryEvidence)
      && /explicitly NOT delivered/.test(r.deliveryEvidence);
  }), 'per-proposal status not read');

// ═══ 8. A PHRASE INSIDE A COMMITTED FACT NEVER DELETES PLOT ═════════════════════════════════
section('8. LEXICAL MATCHING CANNOT VOID AN ASSIGNMENT (the reviewer\'s three constructed facts)');
// A committed fact is trustworthy AS THAT FACT. A phrase inside it is not evidence that a
// different event happened - not with the wrong speaker, and not inside a denial.
const lexical = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 14;       // scene 16
  s._historyNotes = []; s.scenes = []; s._temptOutcomePending = {};
  const run = (fact, milestoneScene) => {
    s._committedState = {
      facts: [{ fact: fact, proposalRef: 'prop:2:1', provenanceLink: 'sealed', committedAtScene: 2,
                storyScene: 3, storySceneProvenance: 'caller',
                milestoneScene: (milestoneScene === undefined ? null : milestoneScene),
                provenance: 'delivered' }],
      _committedThroughScene: 3,
      deliveryLog: { '3': { scene: 3, storyScene: 3, verifierReported: true, aggregateSupplied: true,
                            aggregateDelivery: 'DELIVERED', committed: [{ ref: 'prop:2:1' }], pending: {} } },
      pendingIntent: null, tableau: null
    };
    delete s._issueOutline; delete s._issueOutlineHistory;
    const r = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0];
    return { delivered: !!r.alreadyDelivered, warned: !!r.alreadyWritten,
             accomplishes: r.accomplishes, src: r.accomplishesSource };
  };
  return JSON.parse(JSON.stringify({
    denial: run('Julian refuses to say "I bent the wish" and denies intervening at all.'),
    wrongSpeaker: run('Seren says "I bent the wish"; Julian makes no admission of any kind.'),
    genuineNoLink: run('Julian says "I bent the wish" and admits intervening.'),
    linked: run('Julian says he did it, and does not offer a reason with it', 16)
  }));
});
fs.writeFileSync('_audit_out/history_chain/lexical_cannot_delete.json', JSON.stringify(lexical, null, 1));
t('a DENIAL containing the phrase does NOT void the assignment',
  lexical.denial.delivered === false && /Julian finally admits he acted/.test(lexical.denial.accomplishes),
  JSON.stringify(lexical.denial));
t('the WRONG SPEAKER saying the phrase does NOT void the assignment',
  lexical.wrongSpeaker.delivered === false && /Julian finally admits he acted/.test(lexical.wrongSpeaker.accomplishes),
  JSON.stringify(lexical.wrongSpeaker));
t('even a GENUINE-LOOKING match with no milestone link does NOT void it — it only warns',
  lexical.genuineNoLink.delivered === false && lexical.genuineNoLink.warned === true
  && /Julian finally admits he acted/.test(lexical.genuineNoLink.accomplishes),
  JSON.stringify(lexical.genuineNoLink));
t('all three are surfaced as WARNINGS, so the signal is not lost',
  lexical.denial.warned === true && lexical.wrongSpeaker.warned === true,
  JSON.stringify([lexical.denial.warned, lexical.wrongSpeaker.warned]));

// ═══ 9. THE STRUCTURAL LINK IS WHAT REPLANS ═════════════════════════════════════════════════
section('9. ONLY AN EXPLICIT MILESTONE LINK VOIDS AN ASSIGNMENT — a CONSUMER test, see section 12');
// SCOPE, STATED: the link below is CONSTRUCTED. It shows the resolver CONSUMING a cross-scene
// milestone link correctly. It does NOT show the running story producing one — section 12 traces
// that, and the answer is that no producer exists.
t('a committed fact SEALED AGAINST ROW 16\'S MILESTONE voids its assignment',
  lexical.linked.delivered === true && lexical.linked.accomplishes === ''
  && /already delivered at scene 3/.test(lexical.linked.src),
  JSON.stringify(lexical.linked));
const structural = await page.evaluate(() => {
  const s = window.state;
  const block = window._renderIssueOutlineDirective(s, 16) || '';
  // CONSTRUCTED approval of the drafted replacement, to show the replanning the link enables.
  const plan = window.STARTER_PLANS.starter_first_sacrifice;
  const row = plan.scenes.filter(r => r.n === 16)[0];
  const saved = row.onAlreadyDelivered;
  row.onAlreadyDelivered = Object.assign({}, saved, { provenance: 'approved_by_roman' });
  delete s._issueOutline;
  const o = window._resolveIssueOutline(s);
  const out = { withheld: block, approvedBlock: window._renderIssueOutlineDirective(s, 16) || '',
                approvedRow: o.scenes.filter(x => x.n === 16)[0] };
  row.onAlreadyDelivered = saved;
  return JSON.parse(JSON.stringify(out));
});
fs.writeFileSync('_audit_out/history_chain/replanned_scene16.txt',
  '--- DRAFT WITHHELD (default) ---\n' + structural.withheld
  + '\n\n--- REPLACEMENT APPROVED ---\n' + structural.approvedBlock);
t('the directive names the STRUCTURAL LINK, not a phrase',
  /the planner sealed this proposal against row 16's milestone/.test(structural.withheld)
  && /This is not a warning and not a guess/.test(structural.withheld), structural.withheld.slice(0, 600));
t('the obsolete assignment is GONE from the directive',
  !/Julian finally admits he acted/.test(structural.withheld)
  && !/Julian finally admits he acted/.test(structural.approvedBlock),
  (structural.withheld.match(/WHAT THIS SCENE ACCOMPLISHES[\s\S]{0,160}/) || ['(absent)'])[0]);
t('by default the drafted replacement is WITHHELD',
  /DRAFTED BUT NOT APPROVED, so it is withheld/.test(structural.withheld), 'quarantine missing');
t('APPROVED, the delivered event becomes a CONSEQUENTIAL NEW ASSIGNMENT',
  /what it has cost him since he made it/.test(structural.approvedRow.accomplishes || '')
  && /A replacement assignment IS authored/.test(structural.approvedBlock),
  JSON.stringify(structural.approvedRow.accomplishes));

// ═══ 10. SCENE IDENTITY THROUGH THE REAL PLANNER-TO-COMMIT HANDOFF ══════════════════════════
section('10. THE HANDOFF: the object the logger actually receives carries the identity');
const handoff = await page.evaluate(() => {
  const s = window.state;
  s.turnCount = 1;                       // story scene 2 is being planned
  s._sealedProposals = null;
  // The SHIPPED seal, as the planner now calls it.
  const sealed = window._sealProposal({ kind: 'state_change',
    fact: 'Julian publicly claims authority to convene the inquiry', milestone: 'row 2',
    scene: (s.turnCount || 0), storyScene: 2, milestoneScene: 2 });
  // THE HANDOFF, exactly as production performs it at the seal site: the reference AND the two
  // identity fields are written onto the object that becomes _priorSceneStateChange.
  const stateChange = { event: sealed.fact, proposalRef: sealed.id,
    storyScene: sealed.storyScene, milestoneScene: sealed.milestoneScene };
  s._priorSceneStateChange = stateChange;
  // AND the degraded case: an object carrying ONLY the reference, which is what broke before.
  const refOnly = { event: sealed.fact, proposalRef: sealed.id };
  const resolved = window._resolveSealedProposal ? window._resolveSealedProposal(refOnly.proposalRef) : null;
  return JSON.parse(JSON.stringify({ sealed: { id: sealed.id, turn: sealed.scene,
      storyScene: sealed.storyScene, milestoneScene: sealed.milestoneScene },
    handoff: { storyScene: stateChange.storyScene, milestoneScene: stateChange.milestoneScene },
    resolvedFromRefOnly: resolved ? { storyScene: resolved.storyScene, milestoneScene: resolved.milestoneScene } : null }));
});
t('the seal records the turn in its id and the STORY scene separately',
  /^prop:1:/.test(handoff.sealed.id) && handoff.sealed.turn === 1 && handoff.sealed.storyScene === 2,
  JSON.stringify(handoff.sealed));
t('the object the logger receives now CARRIES storyScene and milestoneScene',
  handoff.handoff.storyScene === 2 && handoff.handoff.milestoneScene === 2, JSON.stringify(handoff.handoff));
t('and a reference-only object still RESOLVES to the same identity from its seal',
  handoff.resolvedFromRefOnly && handoff.resolvedFromRefOnly.storyScene === 2
  && handoff.resolvedFromRefOnly.milestoneScene === 2, JSON.stringify(handoff.resolvedFromRefOnly));
t('production writes both fields onto the handoff object at the seal site',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /_stateChange\.proposalRef = _sealedProp\.id;[\s\S]{0,900}_stateChange\.storyScene = _sealedProp\.storyScene;[\s\S]{0,200}_stateChange\.milestoneScene = _sealedProp\.milestoneScene;/.test(src)
      && /state\._priorSceneStateChange = _stateChange;/.test(src);
  })(), 'the seal site does not write the identity onto the handoff object');
t('and the logger falls back to resolving the seal, not to the turn counter',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /RESOLVE FROM THE REFERENCED SEAL[\s\S]{0,600}_resolveSealedProposal\(prevProposal && prevProposal\.proposalRef\)/.test(src);
  })(), 'the logger has no seal-resolution fallback');

// ═══ 11. RECEIVING JSON IS NOT AN AGGREGATE VERDICT ═════════════════════════════════════════
section('11. A RESPONSE WITHOUT AN AGGREGATE VERDICT IS NOT AN EXPLICIT "MISSED"');
const agg = await page.evaluate(() => {
  const s = window.state;
  s._historyNotes = []; s.scenes = [];
  // Section 10 left turnCount at 1 (scene 3 being planned); scene 3 must be BEHIND us for its
  // delivery to be classified at all.
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 4;        // scene 6
  const run = (log) => {
    s._committedState = { facts: [], _committedThroughScene: 3, pendingIntent: null, tableau: null,
      deliveryLog: { '3': log } };
    delete s._issueOutline; delete s._issueOutlineHistory;
    const r = window._resolveIssueOutline(s).scenes.filter(x => x.n === 3)[0];
    return { delivery: r.delivery, evidence: r.deliveryEvidence };
  };
  return JSON.parse(JSON.stringify({
    // THE REVIEWER'S CASE: a per-proposal-only response. The commit pass initialiser read MISSED;
    // nothing supplied an aggregate.
    perPropOnly: run({ scene: 3, verifierReported: true, aggregateSupplied: false,
      aggregateDelivery: null, aggregateDefaulted: 'MISSED', committed: [],
      pending: { 'prop:2:1': { status: 'DELIVERED', reason: 'evidence_unverifiable' } } }),
    // An EXPLICIT aggregate MISSED, with no per-proposal statuses.
    explicitMissed: run({ scene: 3, verifierReported: true, aggregateSupplied: true,
      aggregateDelivery: 'MISSED', committed: [], pending: {} }),
    // A proposal explicitly NOT delivered.
    propMissed: run({ scene: 3, verifierReported: true, aggregateSupplied: false, aggregateDelivery: null,
      aggregateDefaulted: 'MISSED', committed: [],
      pending: { 'prop:2:1': { status: 'MISSED', reason: 'verified_not_delivered' } } }),
    // No verifier response at all.
    noResponse: run({ scene: 3, verifierReported: false, aggregateSupplied: false,
      aggregateDelivery: null, committed: [], pending: {} })
  }));
});
fs.writeFileSync('_audit_out/history_chain/aggregate_verdicts.json', JSON.stringify(agg, null, 1));
t('a per-proposal-only response with unverifiable evidence is UNVERIFIED, not not-delivered',
  agg.perPropOnly.delivery === 'unverified'
  && /NO aggregate verdict was supplied/.test(agg.perPropOnly.evidence)
  && /which is not a verdict/.test(agg.perPropOnly.evidence),
  JSON.stringify(agg.perPropOnly));
t('...and each proposal\'s own result is preserved in the evidence',
  /prop:2:1:DELIVERED\/evidence_unverifiable/.test(agg.perPropOnly.evidence), agg.perPropOnly.evidence);
t('an EXPLICITLY supplied aggregate MISSED still means not delivered',
  agg.explicitMissed.delivery === 'assessed_not_delivered'
  && /explicitly supplied aggregate MISSED/.test(agg.explicitMissed.evidence),
  JSON.stringify(agg.explicitMissed));
t('a proposal explicitly MISSED still means not delivered, aggregate or no aggregate',
  agg.propMissed.delivery === 'assessed_not_delivered'
  && /explicitly NOT delivered/.test(agg.propMissed.evidence), JSON.stringify(agg.propMissed));
t('no verifier response at all is UNVERIFIED',
  agg.noResponse.delivery === 'unverified' && /NO verifier verdict was reported/.test(agg.noResponse.evidence),
  JSON.stringify(agg.noResponse));
t('the commit pass records whether the aggregate was SUPPLIED, not just present',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /_dlAggSupplied = !!\(typeof _vP !== 'undefined' && _vP && _vP\.delivery != null/.test(src)
      && /aggregateSupplied: _dlAggSupplied,/.test(src)
      && /aggregateDelivery: _dlAggSupplied \? \(_delivery \|\| null\) : null,/.test(src);
  })(), 'the commit pass does not record aggregateSupplied');

// ═══ 12. WHO PRODUCES A CROSS-SCENE MILESTONE LINK? NOBODY — TRACED, NOT ASSUMED ════════════
section('12. THE PRODUCER TRACE: production cannot currently produce a cross-scene link');
const produced = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  s._sealedProposals = null; s._historyNotes = []; s.scenes = [];
  // THE SHIPPED SEAL, called exactly as production calls it: _curMs.atScene is the row the planner
  // selected, and the planner selects by p.n === _planSceneNum, i.e. the CURRENT scene.
  const atScene = 3, planSceneNum = 3;
  const rec = window._sealProposal({ kind: 'state_change', fact: 'something happens', milestone: 'm',
    scene: 1, storyScene: planSceneNum, milestoneScene: atScene });
  return JSON.parse(JSON.stringify({ storyScene: rec.storyScene, milestoneScene: rec.milestoneScene }));
});
t('planning scene 3 produces milestoneScene 3 — the row it is planning, never a later one',
  produced.storyScene === 3 && produced.milestoneScene === 3, JSON.stringify(produced));
t('the planner cannot select a row other than the scene being planned',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /_plan\.scenes\.find\(function \(p\) \{ return p && p\.n === _planSceneNum/.test(src)
      && /_curMs = \{ event: _planScene\.goal, atScene: _planScene\.n/.test(src);
  })(), 'row selection is not pinned to the planned scene');
t('a planner that DECLARES it touched a later row\'s reserved event is REJECTED, not recorded',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /if \(st !== 'untouched'\) why\.push\('reserved event ' \+ r\.id/.test(src);
  })(), 'the reserved-status check does not reject a touched declaration');
t('the production seal site records that no cross-scene producer exists, rather than implying one',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /NO PRODUCER EXISTS FOR A CROSS-SCENE LINK/.test(src)
      && /That is PREVENTION,\s*\n\s*\/\/\s*not recording/.test(src);
  })(), 'the trace is not recorded in the source');
t('so an unscheduled early event still gets ONLY the lexical warning — stated, not claimed closed',
  await page.evaluate(() => {
    const s = window.state;
    delete s._stagedAuthoringSceneIndex; s.turnCount = 14;      // scene 16
    s._committedState = { facts: [], _committedThroughScene: 0, pendingIntent: null, tableau: null, deliveryLog: {} };
    s._historyNotes = [{ v: 4, ref: 'p:s3', sceneUid: 'p:s3', sceneNumber: 3, quotesStale: false,
      quoted: [{ quote: 'I bent the wish, Julian said, and did not look away when he said it.', kind: 'event', text: 'x' }],
      summary: [], knowledge: [], obligations: [] }];
    delete s._issueOutline; delete s._issueOutlineHistory;
    const r = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0];
    return !!r.alreadyWritten && !r.alreadyDelivered && /Julian finally admits he acted/.test(r.accomplishes);
  }), 'an early event in prose was treated as more than a warning');

// ═══ 13. A COMPLETED SCENE REACHES THE NEXT PLANNER THROUGH THE REAL COMMIT PATH ════════════
section('13. THE REAL COMMIT PATH: window._commitScene, with the right identity and verdict');
let verifierReq = null;
const committed = await page.evaluate(async () => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 2;
  s._sealedProposals = null; s._historyNotes = []; s.scenes = [];
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  // THE SHIPPED SEAL, as the planner performs it for story scene 2 (turnCount 1 at that moment).
  const sealed = window._sealProposal({ kind: 'state_change',
    fact: 'Julian publicly claims authority to convene the inquiry',
    milestone: 'row 2', scene: 1, storyScene: 2, milestoneScene: 2 });
  // THE HANDOFF, as production performs it at the seal site.
  const stateChange = { event: sealed.fact, proposalRef: sealed.id,
    storyScene: sealed.storyScene, milestoneScene: sealed.milestoneScene,
    precondition: 'the assembly is still gathered', forces_choice: 'whether she answers him' };
  s._priorSceneStateChange = stateChange;
  s._committedState.pendingIntent = { milestone: 'row 2', proposed: sealed.fact,
    sceneProposed: 1, storyScene: 2 };
  const PROSE = 'Julian stepped past the Dohkar and said it to the whole clearing: the inquiry was his to '
    + 'convene, and he would convene it. "A formal inquiry," he said. "I will preside." Nobody contradicted him, '
    + 'and the assembly heard every word of it where they stood on the spiralgrass.';
  // THE REAL FUNCTION. prevSceneNum is the turn counter production passes (pendingIntent.sceneProposed).
  await window._commitScene(PROSE, stateChange, 1, window.__ctlMount(window.state, (stateChange && stateChange.storyScene) || 1, PROSE));
  const cs = s._committedState;
  return JSON.parse(JSON.stringify({
    facts: cs.facts, log: cs.deliveryLog, through: cs._committedThroughScene,
    pendingIntent: cs.pendingIntent
  }));
});
fs.writeFileSync('_audit_out/history_chain/real_commit.json',
  JSON.stringify({ verifierRequest: verifierSeen, result: committed }, null, 1));
t('the real path dispatched the runtime commit verifier, carrying the sealed ref',
  !!verifierSeen && verifierSeen.ref === 'prop:1:1', JSON.stringify(verifierSeen));
t('the REAL commit path committed the sealed fact',
  (committed.facts || []).length === 1 && committed.facts[0].proposalRef === 'prop:1:1'
  && /claims authority to convene the inquiry/.test(committed.facts[0].fact),
  JSON.stringify(committed.facts));
t('...carrying the STORY scene (2) and the MILESTONE link (2) from its seal',
  committed.facts[0].storyScene === 2 && committed.facts[0].milestoneScene === 2
  && committed.facts[0].storySceneProvenance === 'caller',
  JSON.stringify(committed.facts[0]));
t('the delivery log is keyed by the STORY scene, resolved through the handoff',
  !!committed.log && !!committed.log['2'] && committed.log['2'].storyScene === 2
  && committed.log['2'].turnScene === 1 && /storyScene via/.test(committed.log['2'].keyProvenance),
  JSON.stringify(committed.log));
t('...and records whether the aggregate verdict was SUPPLIED by the verifier',
  committed.log['2'].verifierReported === true && committed.log['2'].aggregateSupplied === true
  && committed.log['2'].aggregateDelivery === 'DELIVERED',
  JSON.stringify(committed.log['2']));
t('the per-proposal result is recorded under the id the adjudicator emits',
  (committed.log['2'].committed || []).some(c => c.ref === 'prop:1:1'),
  JSON.stringify(committed.log['2'].committed));
const reaches = await page.evaluate(() => {
  const s = window.state;
  // THE PLANNER'S OWN INPUT. The COMMITTED WORLD STATE line maps over _ensureCommittedState().facts;
  // this is that exact array, read through the shipped accessor.
  const facts = (window._ensureCommittedState ? window._ensureCommittedState() : s._committedState).facts;
  delete s._issueOutline; delete s._issueOutlineHistory;
  s.turnCount = 4;                                 // scene 6, so scene 2 is behind us
  const o = window._resolveIssueOutline(s);
  const r2 = o.scenes.filter(x => x.n === 2)[0];
  return JSON.parse(JSON.stringify({ plannerFacts: facts.map(f => f.fact), r2: r2,
    history: window._buildHistoryContinuityBlock(s, {}) || '',
    block: window._renderIssueOutlineDirective(s, 6) || '' }));
});
fs.writeFileSync('_audit_out/history_chain/reaches_next_planner.txt', reaches.block);
t('the committed fact is in the array the planner\'s COMMITTED WORLD STATE line maps over',
  reaches.plannerFacts.some(f => /claims authority to convene the inquiry/.test(f)),
  JSON.stringify(reaches.plannerFacts));
t('...and that line is built from that same accessor (source-level, the boundary this test stops at)',
  (() => {
    const src = fs.readFileSync('public/app.js', 'utf8');
    return /var _csGen = \(typeof _ensureCommittedState === 'function'\) \? _ensureCommittedState\(\)/.test(src)
      && /COMMITTED WORLD STATE[\s\S]{0,200}_csGen\.facts/.test(src);
  })(), 'the planner line does not read _ensureCommittedState().facts');
t('the outline classifies story scene 2 as COMMITTED, via the structural milestone link',
  reaches.r2.delivery === 'committed' && /verdict recorded the planned event DELIVERED/.test(reaches.r2.deliveryEvidence),
  JSON.stringify([reaches.r2.delivery, reaches.r2.deliveryEvidence]));
t('and the author is told the VERIFIED FACT, not the row\'s planned accomplishment',
  /ESTABLISHED AND VERIFIED/.test(reaches.block)
  && /"Julian publicly claims authority to convene the inquiry"/.test(reaches.block),
  (reaches.block.match(/ESTABLISHED AND VERIFIED[\s\S]{0,400}/) || ['(absent)'])[0]);

// ═══ 14. A PHRASE MATCH NO LONGER OVERTURNS A FATE PREREQUISITE ══════════════════════════════
section('14. FATE DETECTION: an unsupported phrase match warns, it does not overturn');
const fate = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 4;
  s._committedState = { facts: [], _committedThroughScene: 0, pendingIntent: null, tableau: null, deliveryLog: {} };
  s._historyNotes = []; s._fpcActiveCompiled = null;
  const run = (rec) => {
    s._temptFateDurableConsequences = rec ? [rec] : [];
    delete s._issueOutline; delete s._issueOutlineHistory;
    const o = window._resolveIssueOutline(s);
    const r16 = o.scenes.filter(x => x.n === 16)[0];
    return { overturned: o.overturned.slice(), atRisk: o.prereqsAtRisk.slice(),
             kind: r16.kind, accomplishes: r16.accomplishes,
             rowAtRisk: r16.prereqsAtRisk, block: window._renderIssueOutlineDirective(s, 16) || '' };
  };
  return JSON.parse(JSON.stringify({
    // THE WISH THAT WAS ASKED FOR carries the marker; the OUTCOME does not. Previously this
    // overturned the prerequisite on the request alone.
    requestOnly: run({ requestedRupture: 'let everyone know an outside hand touched the rite',
      sceneIdx: 5, changed: [{ subject: 'the clearing', whatChanged: 'nothing changed; the wish was refused' }] }),
    // THE OUTCOME carries the marker: a WARNING, and nothing is overturned.
    outcomeMatch: run({ requestedRupture: 'something else', sceneIdx: 5,
      changed: [{ subject: 'the assembly', whatChanged: 'now knows an outside hand touched the rite' }] }),
    // AN EXPLICIT DECLARATION: this and only this overturns.
    declared: run({ requestedRupture: 'x', sceneIdx: 5, changed: [],
      invalidatesPrereqs: ['prereq:julian_act_concealed'] }),
    none: run(null)
  }));
});
fs.writeFileSync('_audit_out/history_chain/fate_detection.json', JSON.stringify(fate, null, 1));
t('a marker in the REQUESTED WISH overturns nothing and does not even warn',
  fate.requestOnly.overturned.length === 0 && fate.requestOnly.atRisk.length === 0
  && fate.requestOnly.kind !== 'overturned',
  JSON.stringify(fate.requestOnly.overturned.concat(fate.requestOnly.atRisk)));
t('a marker in the DELIVERED OUTCOME raises a WARNING and overturns nothing',
  fate.outcomeMatch.overturned.length === 0
  && fate.outcomeMatch.atRisk.indexOf('prereq:julian_act_concealed') !== -1
  && fate.outcomeMatch.kind !== 'overturned',
  JSON.stringify({ ov: fate.outcomeMatch.overturned, ar: fate.outcomeMatch.atRisk, kind: fate.outcomeMatch.kind }));
t('...and the row KEEPS its assignment while the warning is stated as a warning',
  /Julian finally admits he acted/.test(fate.outcomeMatch.accomplishes)
  && /WARNING, NOT A VERDICT — a condition this scene depends on MAY have been changed/.test(fate.outcomeMatch.block)
  && /assignment stands as written/.test(fate.outcomeMatch.block),
  (fate.outcomeMatch.block.match(/WARNING, NOT A VERDICT[\s\S]{0,500}/) || [''])[0]);
t('an EXPLICIT invalidatesPrereqs declaration still overturns, as the only thing that may',
  fate.declared.overturned.indexOf('prereq:julian_act_concealed') !== -1
  && fate.declared.kind === 'overturned' && fate.declared.accomplishes === '',
  JSON.stringify({ ov: fate.declared.overturned, kind: fate.declared.kind }));
t('with no adjudicated record, nothing is overturned and nothing is at risk',
  fate.none.overturned.length === 0 && fate.none.atRisk.length === 0, JSON.stringify(fate.none.overturned));

// ═══ 15. THE MISSING PRODUCERS, BUILT ON THE EXISTING POST-PROSE ASSESSMENT ═════════════════
// No dedicated paid call: the runtime commit verifier already receives this scene's prose and
// already returns verbatim-quoted judgements, so it is asked two more questions. Every model
// response below is CONSTRUCTED in this file and labelled as such.
section('15a. THE REQUEST: the existing verifier is asked about later milestones and prerequisites');
const watchReq = await page.evaluate(async () => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  s._starterId = 'starter_first_sacrifice';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 2;
  s._sealedProposals = null; s._historyNotes = []; s.scenes = [];
  s._milestoneDeliveries = []; s._prereqInvalidations = [];
  s._temptFateDurableConsequences = [{ requestedRupture: 'let the truth out', sceneIdx: 2,
    changed: [{ subject: 'the assembly', whatChanged: 'heard a name it was not meant to hear' }] }];
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'The Dohkar serves Lirael notice',
    milestone: 'row 3', scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._priorSceneStateChange = sc;
  s._committedState.pendingIntent = { milestone: 'row 3', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  await (async () => { const _p = 'The Dohkar served her notice where the whole clearing could hear it, and then Julian said the thing nobody had asked him to say.';
    return window._commitScene(_p, sc, 1, window.__ctlMount(window.state, sc.storyScene || 1, _p)); })();
  return true;
});
t('the verifier request carries the WATCHED MILESTONES from later plan rows',
  !!verifierSeen && /WATCHED MILESTONES \(these belong to LATER scenes/.test(verifierSeen.joined)
  && /n 16 :: Julian finally admits he acted/.test(verifierSeen.joined),
  verifierSeen && (verifierSeen.joined.match(/WATCHED MILESTONES[\s\S]{0,400}/) || ['(absent)'])[0]);
t('...and the WATCHED PREREQUISITES, with the accepted Fate outcome as context only',
  !!verifierSeen && /WATCHED PREREQUISITES/.test(verifierSeen.joined)
  && /id prereq:julian_act_concealed/.test(verifierSeen.joined)
  && /ACCEPTED FATE OUTCOME IN FORCE \(context only — judge the PROSE\)/.test(verifierSeen.joined),
  verifierSeen && (verifierSeen.joined.match(/WATCHED PREREQUISITES[\s\S]{0,400}/) || ['(absent)'])[0]);
t('the contract names the statuses that are NOT completion',
  !!verifierSeen && /"mentioned" = referred to, recalled or predicted but not performed/.test(verifierSeen.joined)
  && /"denied" = someone states it did not or will not happen/.test(verifierSeen.joined)
  && /"hypothetical" = conditional, imagined, feared/.test(verifierSeen.joined)
  && /"private_only" = it happened where only the point-of-view character could know/.test(verifierSeen.joined)
  && /"requested_not_delivered", which is NOT invalidation/.test(verifierSeen.joined),
  'the status vocabulary is incomplete');
t('and that an unevidenced claim is DISCARDED by the engine',
  !!verifierSeen && /with no verbatim evidence is DISCARDED by the engine/.test(verifierSeen.joined),
  'the discard rule is missing');

section('15b. ACCEPTANCE: a mention, denial, hypothetical, private or unevidenced claim does NOT count');
const PROSE15 = 'Seren asked whether Julian could have bent the wish, and nobody answered her. '
  + '"I bent the wish," Julian said, in front of the Chayr and the two Dohkars and everyone else still standing on the spiralgrass. '
  + 'The record was moved out of the order the inquiry would have read it in, and the Chayr saw it happen.';
const accept = await page.evaluate(async (prose) => {
  const s = window.state;
  const run = async () => {
    s._sealedProposals = null; s._milestoneDeliveries = []; s._prereqInvalidations = [];
    s._committedState = { facts: [], tableau: null, pendingIntent: null };
    // A REAL scene record, so the assessment binds to a projection a rewrite can change.
    s.scenes = [];
    const uid = window._sbMintSceneUid('ctl');
    s.scenes.push({ uid: uid, text: prose,
      projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(prose), revision: 0,
        provenance: 'api_built', builtAt: Date.now() } });
    window.__ctlIdent = { storyId: s.storyId, sceneUid: uid,
      projectionHash: s.scenes[0].projection.hash, projectionRevision: 0,
      fullTextChars: prose.length, excerptChars: prose.length };
    const sealed = window._sealProposal({ kind: 'state_change', fact: 'The Dohkar serves Lirael notice',
      milestone: 'row 3', scene: 1, storyScene: 3, milestoneScene: 3 });
    const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
    s._priorSceneStateChange = sc;
    s._committedState.pendingIntent = { milestone: 'row 3', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
    await window._commitScene(prose, sc, 1, window.__ctlIdent);
    return { m: (s._milestoneDeliveries || []).slice(), p: (s._prereqInvalidations || []).slice() };
  };
  window.__ctlRun = run;
  return true;
}, PROSE15);
const cases = [
  ['mentioned', { n: 16, status: 'mentioned', evidence: 'Seren asked whether Julian could have bent the wish', participants: ['Seren'], scope: 'the clearing' }, false, 'is not completion'],
  ['denied', { n: 16, status: 'denied', evidence: 'nobody answered her', participants: ['Julian'], scope: 'the clearing' }, false, 'is not completion'],
  ['hypothetical', { n: 16, status: 'hypothetical', evidence: 'whether Julian could have bent the wish', participants: ['Julian'], scope: 'the clearing' }, false, 'is not completion'],
  ['private_only', { n: 16, status: 'private_only', evidence: 'nobody answered her', participants: ['Lirael'], scope: 'only Lirael' }, false, 'is not completion'],
  ['no evidence', { n: 16, status: 'delivered_on_page', evidence: '', participants: ['Julian'], scope: 'the clearing' }, false, 'verifies verbatim'],
  ['invented quote', { n: 16, status: 'delivered_on_page', evidence: 'Julian confessed everything to the panel', participants: ['Julian'], scope: 'the clearing' }, false, 'verifies verbatim'],
  ['no participants', { n: 16, status: 'delivered_on_page', evidence: '"I bent the wish," Julian said', participants: [], scope: 'the clearing' }, false, 'participants'],
  ['no scope', { n: 16, status: 'delivered_on_page', evidence: '"I bent the wish," Julian said', participants: ['Julian'], scope: '' }, false, 'scope'],
  ['own or earlier row', { n: 3, status: 'delivered_on_page', evidence: '"I bent the wish," Julian said', participants: ['Julian'], scope: 'the clearing' }, null, 'not recorded at all'],
  ['GENUINE', { n: 16, status: 'delivered_on_page', evidence: '"I bent the wish," Julian said', participants: ['Julian'], scope: 'the Chayr, two Dohkars and the assembly' }, true, 'accepted']
];
for (const [label, mw, expect, needle] of cases) {
  pageVerifierResp = { delivery: 'MISSED', milestone_watch: [mw], prereq_watch: [] };
  const got = await page.evaluate(() => window.__ctlRun());
  if (expect === null) {
    t('a milestone for THIS row or earlier is ' + needle,
      got.m.filter(r => r.milestoneScene === 3).length === 0,
      JSON.stringify(got.m.map(r => [r.milestoneScene, r.status])));
  } else {
    const rec = got.m[0];
    t('"' + label + '" -> accepted=' + expect + ' (' + needle + ')',
      !!rec && rec.accepted === expect && (expect || new RegExp(needle).test(rec.why)),
      JSON.stringify(rec));
  }
}
const prereqCases = [
  ['requested_not_delivered', { id: 'prereq:julian_act_concealed', status: 'requested_not_delivered', evidence: 'nobody answered her', participants: ['Lirael'], scope: 'nothing changed' }, false],
  ['still_holds', { id: 'prereq:julian_act_concealed', status: 'still_holds', evidence: 'nobody answered her', participants: ['Lirael'], scope: 'unchanged' }, false],
  ['GENUINE', { id: 'prereq:julian_act_concealed', status: 'invalidated_on_page', evidence: '"I bent the wish," Julian said', participants: ['Julian'], scope: 'the Chayr, two Dohkars and the assembly' }, true]
];
for (const [label, pw, expect] of prereqCases) {
  pageVerifierResp = { delivery: 'MISSED', milestone_watch: [], prereq_watch: [pw] };
  const got = await page.evaluate(() => window.__ctlRun());
  const rec = got.p[0];
  t('prereq "' + label + '" -> accepted=' + expect,
    !!rec && rec.accepted === expect, JSON.stringify(rec));
}

section('15c. PRODUCER -> STORED ASSESSMENT -> REVISED PLAN -> OUTGOING REQUESTS');
calls.length = 0;
pageVerifierResp = { delivery: 'MISSED',
  milestone_watch: [{ n: 16, status: 'delivered_on_page', evidence: '"I bent the wish," Julian said',
    participants: ['Julian'], scope: 'the Chayr, two Dohkars and the assembly' }],
  prereq_watch: [{ id: 'prereq:julian_act_concealed', status: 'invalidated_on_page',
    evidence: '"I bent the wish," Julian said', participants: ['Julian'],
    scope: 'the Chayr, two Dohkars and the assembly' }] };
const endToEnd = await page.evaluate(async (prose) => {
  const s = window.state;
  s._milestoneDeliveries = []; s._prereqInvalidations = [];
  await window.__ctlRun();
  // NOTHING IS CLEARED HERE. The resolver must notice the new assessments by itself.
  s.turnCount = 14;                                     // scene 16
  const o = window._resolveIssueOutline(s);
  const r16 = o.scenes.filter(x => x.n === 16)[0];
  const block16 = window._renderIssueOutlineDirective(s, 16) || '';
  // AND THE SCAFFOLD, which must receive the same revised purpose before it outlines anything.
  s.sceneSkeleton = null; s._skeletonMeta = null;
  s.currentEngine = 'graphic'; s.renderMode = 'cg'; s._stagedAuthoringSceneIndex = 15;
  s.issueIndexInRun = 2;                                // CG issue 2 = rows 11-20
  await window.__generateSceneSkeleton('wait', '', { sceneNumber: 16 });
  s.currentEngine = 'literary'; s.renderMode = 'literary'; delete s._stagedAuthoringSceneIndex;
  s.issueIndexInRun = 1;
  return JSON.parse(JSON.stringify({ stored: { m: s._milestoneDeliveries, p: s._prereqInvalidations },
    overturned: o.overturned.slice(), overturnedWhy: o.overturnedWhy, r16: r16, block16: block16,
    summary: window._issueOutlineSummary().assessments }));
}, PROSE15);
const skelReq15 = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined)).pop();
fs.writeFileSync('_audit_out/history_chain/producer_end_to_end.json', JSON.stringify(endToEnd, null, 1));
fs.writeFileSync('_audit_out/history_chain/producer_scaffold_request.txt', (skelReq15 && skelReq15.joined) || '(none)');
t('PRODUCER: the assessment is stored as accepted, with its evidence, participants and scope',
  (() => {
    const acc = endToEnd.stored.m.filter(r => r.accepted === true);
    return acc.length === 1 && acc[0].milestoneScene === 16 && acc[0].atScene === 3
      && (acc[0].participants || []).join() === 'Julian' && !!acc[0].scope;
  })(), JSON.stringify(endToEnd.stored.m.filter(r => r.accepted === true)));
t('REVISED PLAN: row 16 is ALREADY DELIVERED from that assessment, not from a phrase',
  !!endToEnd.r16.alreadyDelivered
  && /post-prose assessment of scene 3 found row 16's milestone delivered on the page/.test(endToEnd.r16.alreadyDelivered[0].link),
  JSON.stringify(endToEnd.r16.alreadyDelivered));
t('...and the row\'s obsolete assignment is gone',
  endToEnd.r16.accomplishes === '' && !/Julian finally admits he acted/.test(endToEnd.block16),
  endToEnd.r16.accomplishes);
t('FATE: the prerequisite is OVERTURNED from the assessment, with its scope recorded',
  endToEnd.overturned.indexOf('prereq:julian_act_concealed') !== -1
  && /post-prose assessment of scene 3: invalidated on the page \(participants: Julian; scope: the Chayr/.test(JSON.stringify(endToEnd.overturnedWhy)),
  JSON.stringify(endToEnd.overturnedWhy));
t('OUTGOING AUTHOR REQUEST: the directive cites the assessment, naming participants and scope',
  /HAS ALREADY BEEN DELIVERED AND COMMITTED/.test(endToEnd.block16)
  && /participants: Julian; scope: the Chayr, two Dohkars and the assembly/.test(endToEnd.block16),
  (endToEnd.block16.match(/ALREADY BEEN DELIVERED[\s\S]{0,500}/) || [''])[0]);
t('OUTGOING SCAFFOLD REQUEST: the scaffold is told the event is already delivered, before it outlines',
  !!skelReq15 && /ALREADY DELIVERED AND COMMITTED/.test(skelReq15.joined)
  && !/WHAT IT ACCOMPLISHES: Julian finally admits he acted/.test(skelReq15.joined),
  skelReq15 && (skelReq15.joined.match(/ALREADY DELIVERED AND COMMITTED[\s\S]{0,300}/) || ['(absent)'])[0]);
t('the resolver noticed the new assessments WITHOUT the cache being cleared',
  !!endToEnd.r16.alreadyDelivered, 'the cache was stale');
t('rejected observations are surfaced as uncertainty rather than silently dropped',
  Array.isArray(endToEnd.summary.milestoneDeliveries)
  && endToEnd.summary.milestoneDeliveries.some(x => x.accepted === true),
  JSON.stringify(endToEnd.summary));

section('15d. A REWRITE SUPERSEDES THE ASSESSMENT (same-length scene; the long-scene case is 16c)');
const supersede = await page.evaluate(() => {
  const s = window.state;
  const uid = s.scenes[0] && s.scenes[0].uid;
  const hash = s.scenes[0] && s.scenes[0].projection.hash;
  const inv = window._sbInvalidateDependentsOfScene(uid, hash, 1);
  s.turnCount = 14; delete s._issueOutline; delete s._issueOutlineHistory;
  const o = window._resolveIssueOutline(s);
  const r16 = o.scenes.filter(x => x.n === 16)[0];
  return JSON.parse(JSON.stringify({ inv: inv, stored: s._milestoneDeliveries,
    overturned: o.overturned.slice(), delivered: !!r16.alreadyDelivered,
    accomplishes: r16.accomplishes }));
});
t('revising the prose the evidence came from supersedes the assessment',
  (supersede.stored || []).length > 0 && supersede.stored[0].superseded === true
  && /was revised: hash/.test(String(supersede.stored[0].supersededReason))
  && (supersede.inv || []).some(x => /_milestoneDeliveries/.test(String(x))),
  JSON.stringify(supersede.stored && supersede.stored[0]));
t('...and the plan stops treating the event as delivered, WITHOUT the cache being cleared',
  supersede.delivered === false && /Julian finally admits he acted/.test(supersede.accomplishes),
  JSON.stringify([supersede.delivered, supersede.accomplishes]));
t('...and the prerequisite stops being overturned',
  supersede.overturned.indexOf('prereq:julian_act_concealed') === -1, JSON.stringify(supersede.overturned));

// ═══ 16. THE THREE STORAGE AND BINDING DEFECTS ══════════════════════════════════════════════
section('16a. EVICTION: negative observations must not erase an accepted conclusion');
// The reviewer's reproduction: one accepted record, then five rounds of eight negative
// observations, left 40 records and ZERO accepted. Durable conclusions are now bounded separately
// from diagnostic observations.
const evict = await page.evaluate(async () => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  s._starterId = 'starter_first_sacrifice';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 2;
  s._milestoneDeliveries = [{ milestoneScene: 16, atScene: 3, status: 'delivered_on_page',
    accepted: true, why: 'accepted', evidence: 'x', participants: ['Julian'], scope: 'the clearing',
    sceneUid: 'u:keep', projectionHash: 'hk', projectionRevision: 0, superseded: false, at: 1 }];
  s._prereqInvalidations = [{ prereqId: 'prereq:julian_act_concealed', atScene: 3,
    status: 'invalidated_on_page', accepted: true, why: 'accepted', evidence: 'x',
    participants: ['Julian'], scope: 'the clearing', sceneUid: 'u:keep', projectionHash: 'hk',
    projectionRevision: 0, superseded: false, at: 1 }];
  // FIFTY negative observations each — more than the reviewer's forty — pushed through the same
  // store the production trim runs on.
  for (let i = 0; i < 50; i++) {
    s._milestoneDeliveries.push({ milestoneScene: 17 + (i % 3), atScene: 4, status: 'not_present',
      accepted: false, why: 'status "not_present" is not completion', evidence: null,
      participants: [], scope: null, superseded: false, at: 100 + i });
    s._prereqInvalidations.push({ prereqId: 'prereq:investigation_open', atScene: 4,
      status: 'still_holds', accepted: false, why: 'status "still_holds" is not invalidation',
      evidence: null, participants: [], scope: null, superseded: false, at: 100 + i });
  }
  // THE PRODUCTION TRIM, reached by running a real commit pass.
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'x happens', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  await (async () => { const _p = 'A long enough passage of prose for the verifier to be asked about it at all, with more than forty characters.';
    return window._commitScene(_p, sc, 1, window.__ctlMount(window.state, sc.storyScene || 1, _p)); })();
  const m = s._milestoneDeliveries, q = s._prereqInvalidations;
  return JSON.parse(JSON.stringify({
    mTotal: m.length, mAccepted: m.filter(r => r.accepted).length,
    qTotal: q.length, qAccepted: q.filter(r => r.accepted).length }));
});
t('the accepted milestone conclusion SURVIVES 50 negative observations',
  evict.mAccepted >= 1, JSON.stringify(evict));
t('the accepted prerequisite conclusion SURVIVES them too',
  evict.qAccepted >= 1, JSON.stringify(evict));
t('and the diagnostic observations are still bounded, so the store does not grow forever',
  evict.mTotal <= 245 && evict.qTotal <= 245, JSON.stringify(evict));

section('16b. UNREQUESTED IDENTIFIERS: only what the watch list asked about is accepted');
pageVerifierResp = { delivery: 'MISSED',
  milestone_watch: [
    { n: 999, status: 'delivered_on_page', evidence: 'A long enough passage of prose',
      participants: ['Julian'], scope: 'everyone' },
    { n: 16, status: 'delivered_on_page', evidence: 'A long enough passage of prose',
      participants: ['Julian'], scope: 'everyone' }],
  prereq_watch: [
    { id: 'prereq:never_asked_about', status: 'invalidated_on_page', evidence: 'A long enough passage of prose',
      participants: ['Julian'], scope: 'everyone' },
    { id: 'prereq:julian_act_concealed', status: 'invalidated_on_page', evidence: 'A long enough passage of prose',
      participants: ['Julian'], scope: 'everyone' }] };
const unrequested = await page.evaluate(async () => {
  const s = window.state;
  s._milestoneDeliveries = []; s._prereqInvalidations = [];
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'y happens', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  await (async () => { const _p = 'A long enough passage of prose for the verifier to be asked about it at all, with more than forty characters.';
    return window._commitScene(_p, sc, 1, window.__ctlMount(window.state, sc.storyScene || 1, _p)); })();
  return JSON.parse(JSON.stringify({ m: s._milestoneDeliveries, q: s._prereqInvalidations }));
});
fs.writeFileSync('_audit_out/history_chain/unrequested_ids.json', JSON.stringify(unrequested, null, 1));
t('an UNREQUESTED milestone number is discarded, not stored at all',
  !unrequested.m.some(r => r.milestoneScene === 999), JSON.stringify(unrequested.m.map(r => r.milestoneScene)));
t('an UNREQUESTED prerequisite id is discarded, not stored at all',
  !unrequested.q.some(r => r.prereqId === 'prereq:never_asked_about'),
  JSON.stringify(unrequested.q.map(r => r.prereqId)));
t('the one that WAS on the watch list is still assessed normally',
  unrequested.m.some(r => r.milestoneScene === 16) && unrequested.q.some(r => r.prereqId === 'prereq:julian_act_concealed'),
  JSON.stringify([unrequested.m.map(r => r.milestoneScene), unrequested.q.map(r => r.prereqId)]));
pageVerifierResp = null;

section('16c. REWRITE PROTECTION ON A SCENE LONGER THAN THE 5,000-CHAR EXCERPT');
pageVerifierResp = { delivery: 'MISSED',
  milestone_watch: [{ n: 16, status: 'delivered_on_page',
    evidence: '"I bent the wish," Julian said, where the Chayr could hear him.',
    participants: ['Julian'], scope: 'the Chayr' }], prereq_watch: [] };
// The caller hands the verifier only the last 5,000 characters. The assessment used to hash THAT,
// while a rewrite invalidates against the hash of the COMPLETE projection — so for any longer
// scene the hashes never matched and the assessment survived the rewrite.
const longScene = await page.evaluate(async () => {
  const s = window.state;
  const FILLER = 'The clearing emptied by degrees, and the spiralgrass held the shape of where everyone had stood. ';
  const PROSE = FILLER.repeat(58) + ' "I bent the wish," Julian said, where the Chayr could hear him.';
  if (PROSE.length <= 5000) return { fatal: 'fixture prose is not longer than the excerpt: ' + PROSE.length };
  s.scenes = []; s._historyNotes = []; s._temptOutcomePending = {};
  s._milestoneDeliveries = []; s._prereqInvalidations = [];
  // A REAL scene record and projection, so the rewrite path has something to revise.
  const uid = window._sbMintSceneUid('ctl');
  s.scenes.push({ uid: uid, text: PROSE,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(PROSE), revision: 0,
      provenance: 'api_built', builtAt: Date.now() } });
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'z happens', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  // THE IDENTITY THE CALLER PASSES, exactly as production builds it from the projection.
  const ident = { storyId: s.storyId, sceneUid: uid,
    projectionHash: s.scenes[0].projection.hash, projectionRevision: 0,
    fullTextChars: PROSE.length, excerptChars: 5000 };
  await window._commitScene(PROSE.slice(-5000), sc, 1, ident);
  const rec = (s._milestoneDeliveries || [])[0] || null;
  const boundToFull = !!rec && rec.projectionHash === s.scenes[0].projection.hash
    && rec.excerptHash !== s.scenes[0].projection.hash;
  // NOW THE REWRITE, through the shipped hook, against the FULL projection hash.
  const inv = window._sbInvalidateDependentsOfScene(uid, s.scenes[0].projection.hash, 1);
  const after = (s._milestoneDeliveries || [])[0] || null;
  return JSON.parse(JSON.stringify({ proseLen: PROSE.length, rec: rec, boundToFull: boundToFull,
    inv: inv, after: after }));
});
pageVerifierResp = null;
fs.writeFileSync('_audit_out/history_chain/long_scene_rewrite.json', JSON.stringify(longScene, null, 1));
t('the fixture scene really is longer than the 5,000-character excerpt',
  !longScene.fatal && longScene.proseLen > 5000, longScene.fatal || String(longScene.proseLen));
t('the assessment is bound to the FULL projection hash, not to the excerpt it was shown',
  longScene.boundToFull === true
  && longScene.rec.excerptHash !== longScene.rec.projectionHash,
  JSON.stringify({ proj: longScene.rec && longScene.rec.projectionHash, exc: longScene.rec && longScene.rec.excerptHash }));
t('...and it carries the scene uid, the revision and the story',
  !!longScene.rec && !!longScene.rec.sceneUid && longScene.rec.projectionRevision === 0
  && !!longScene.rec.storyId, JSON.stringify(longScene.rec && { uid: longScene.rec.sceneUid, rev: longScene.rec.projectionRevision }));
t('the REAL rewrite path now supersedes it',
  longScene.after && longScene.after.superseded === true
  && (longScene.inv || []).some(x => /_milestoneDeliveries/.test(String(x))),
  JSON.stringify({ sup: longScene.after && longScene.after.superseded, inv: longScene.inv }));

section('16d. A REWRITE WHILE THE ASSESSMENT IS PENDING');
rewriteDuringRequest = true;
pageVerifierResp = { delivery: 'MISSED',
  milestone_watch: [{ n: 16, status: 'delivered_on_page', evidence: 'a line Julian says aloud',
    participants: ['Julian'], scope: 'the clearing' }], prereq_watch: [] };
const pending = await page.evaluate(async () => {
  const s = window.state;
  const PROSE = 'A passage long enough to be judged at all, with more than forty characters in it, and a line Julian says aloud.';
  s.scenes = []; s._milestoneDeliveries = []; s._prereqInvalidations = [];
  const uid = window._sbMintSceneUid('ctl');
  s.scenes.push({ uid: uid, text: PROSE,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(PROSE), revision: 0,
      provenance: 'api_built', builtAt: Date.now() } });
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'w happens', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  const ident = { storyId: s.storyId, sceneUid: uid, projectionHash: s.scenes[0].projection.hash,
    projectionRevision: 0, fullTextChars: PROSE.length, excerptChars: PROSE.length };
  // THE REWRITE HAPPENS WHILE THE REQUEST IS IN FLIGHT. The route handler below rewrites the
  // record before it answers, which is what a real concurrent revision does.
  window.__ctlRewriteDuring = function () {
    const rec = s.scenes[0];
    rec.text = PROSE + ' And then it was all different.';
    rec.projection = { v: 1, kind: 'ctl', hash: window._sbTextHash(rec.text), revision: 1,
      provenance: 'api_built', builtAt: Date.now(), previousHash: ident.projectionHash };
  };
  await window._commitScene(PROSE, sc, 1, ident);
  const rec = (s._milestoneDeliveries || [])[0] || null;
  return JSON.parse(JSON.stringify({ rec: rec,
    revisionNow: s.scenes[0].projection.revision }));
});
t('a rewrite DURING the request leaves the record rejected, not accepted',
  pending.revisionNow === 1 && !!pending.rec && pending.rec.accepted === false
  && /rewritten while the assessment was in flight/.test(String(pending.rec.why)),
  JSON.stringify(pending.rec && { accepted: pending.rec.accepted, why: pending.rec.why }));
rewriteDuringRequest = false; pageVerifierResp = null;
t('...and the plan does not treat it as delivered',
  await page.evaluate(() => {
    const s = window.state;
    s.turnCount = 14; delete s._issueOutline; delete s._issueOutlineHistory;
    const r = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0];
    return !r.alreadyDelivered;
  }), 'a stale assessment was consumed');

// ═══ 17. THE FOUR CORRECTIONS ═══════════════════════════════════════════════════════════════
section('17a. DURABLE CONCLUSIONS ARE COMPACTED BY TARGET, NEVER EVICTED BY COUNT');
// slice(-200) still deleted the first conclusion at record 201, and repeated assessments of ONE
// event consumed that allowance. Accepted records are now compacted by target instead.
const compact = await page.evaluate(async () => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  s._starterId = 'starter_first_sacrifice';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 2;
  const FIRST = { milestoneScene: 16, atScene: 3, status: 'delivered_on_page', accepted: true,
    why: 'accepted', evidence: 'the first one', participants: ['Julian'], scope: 'the clearing',
    sceneUid: 'u:first', projectionHash: 'h:first', projectionRevision: 0, superseded: false, at: 1 };
  s._milestoneDeliveries = [FIRST];
  // 260 MORE accepted records — past the old 200 ceiling — of which most are REPEAT assessments of
  // the same two targets, which is the case the reviewer named.
  for (let i = 0; i < 260; i++) {
    s._milestoneDeliveries.push({ milestoneScene: (i % 2) ? 17 : 18, atScene: 4,
      status: 'delivered_on_page', accepted: true, why: 'accepted', evidence: 'repeat ' + i,
      participants: ['Julian'], scope: 'the clearing', sceneUid: 'u:r', projectionHash: 'h:r',
      projectionRevision: 0, superseded: false, at: 100 + i });
  }
  s._prereqInvalidations = [];
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'x', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  await (async () => { const _p = 'A passage of prose long enough to be judged at all, with more than forty characters in it.';
    return window._commitScene(_p, sc, 1, window.__ctlMount(window.state, sc.storyScene || 1, _p)); })();
  const m = s._milestoneDeliveries;
  const kept16 = m.filter(r => r.milestoneScene === 16 && r.accepted);
  return JSON.parse(JSON.stringify({ total: m.length, accepted: m.filter(r => r.accepted).length,
    kept16: kept16, distinctTargets: Array.from(new Set(m.filter(r => r.accepted).map(r => r.milestoneScene))).sort(),
    occ17: (m.filter(r => r.milestoneScene === 17 && r.accepted)[0] || {}).occurrences }));
});
t('the FIRST accepted conclusion survives 260 newer accepted records',
  compact.kept16.length === 1 && compact.kept16[0].evidence === 'the first one',
  JSON.stringify({ kept: compact.kept16.length, total: compact.total }));
t('accepted storage is bounded by DISTINCT TARGETS, not by a count',
  compact.accepted === compact.distinctTargets.length && compact.accepted <= 5,
  JSON.stringify({ accepted: compact.accepted, targets: compact.distinctTargets }));
t('repeat assessments of one event fold into an occurrence count instead of consuming slots',
  Number(compact.occ17) >= 100, JSON.stringify(compact.occ17));

section('17b. OMITTED MEANS NOT ASSESSED, NEVER ABSENT');
pageVerifierResp = { delivery: 'MISSED', milestone_watch: [], prereq_watch: [] };
const unrep17 = await page.evaluate(async () => {
  const s = window.state;
  s._milestoneDeliveries = []; s._prereqInvalidations = [];
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'y', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  await (async () => { const _p = 'A passage of prose long enough to be judged at all, with more than forty characters in it.';
    return window._commitScene(_p, sc, 1, window.__ctlMount(window.state, sc.storyScene || 1, _p)); })();
  return JSON.parse(JSON.stringify({ m: s._milestoneDeliveries, p: s._prereqInvalidations,
    summary: window._issueOutlineSummary().assessments }));
});
pageVerifierResp = null;
fs.writeFileSync('_audit_out/history_chain/unrep17_watch.json', JSON.stringify(unrep17, null, 1));
t('a watched milestone the verifier did not mention is recorded as UNREPORTED, not absent',
  unrep17.m.length > 0 && unrep17.m.every(r => r.status === 'unreported' && r.accepted === false)
  && /NOT ASSESSED, which is not absence/.test(unrep17.m[0].why),
  JSON.stringify(unrep17.m.map(r => [r.milestoneScene, r.status])));
t('...and so is a watched prerequisite',
  unrep17.p.length > 0 && unrep17.p.every(r => r.status === 'unreported' && r.accepted === false),
  JSON.stringify(unrep17.p.map(r => [r.prereqId, r.status])));
t('row 16 is among the watched rows — every DECLARED row is covered, not the first eight',
  unrep17.m.some(r => r.milestoneScene === 16) && unrep17.m.some(r => r.milestoneScene === 18),
  JSON.stringify(unrep17.m.map(r => r.milestoneScene).sort((a, b) => a - b)));
t('the contract no longer says an omitted item is "absent"',
  !!verifierSeen && /ANYTHING YOU LEAVE OUT IS TREATED AS NOT ASSESSED/.test(verifierSeen.joined)
  && !/understood as absent/.test(verifierSeen.joined),
  verifierSeen && (verifierSeen.joined.match(/BOUND THE REPLY[\s\S]{0,420}/) || ['(absent)'])[0]);
t('and the unrep17 records are surfaced as uncertainty in the summary',
  Array.isArray(unrep17.summary.milestoneDeliveries)
  && unrep17.summary.milestoneDeliveries.some(x => x.status === 'unreported'),
  JSON.stringify(unrep17.summary.milestoneDeliveries && unrep17.summary.milestoneDeliveries.slice(0, 3)));

section('17c. THE REAL LITERARY CALLER: one named source, read the same way twice');
// The identity is built by the SHIPPED builder the caller now uses (_buildCommitSceneIdentity),
// with BOTH pagination and an older stored projection present — the exact configuration that made
// the first version report a rewrite that had not happened.
const litCaller = await page.evaluate(() => {
  const s = window.state;
  const PAGE = 'The clearing emptied by degrees. "I bent the wish," Julian said, where the Chayr could hear him, and nobody contradicted it.';
  const OLDER = 'An older projection text that is NOT what pagination currently holds.';
  // REAL pagination content, set through StoryPagination's own public setter.
  window.__ctlResetLedger(s);
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  StoryPagination.addPage('<p>' + PAGE + '</p>', true);
  // A SECOND page, so "every page joined" is demonstrably not the same string as the one page
  // the assessment is bound to.
  StoryPagination.addPage('<p>A second page that exists only so the joined contents differ.</p>', true);
  StoryPagination.goToPage(0);
  // AND an older scene projection sitting beside it, which _sbLatestProseText would prefer.
  s.scenes = [{ uid: window._sbMintSceneUid('ctl'), text: OLDER,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(OLDER), revision: 0, provenance: 'api_built' } }];
  // THE SHIPPED BUILDER, called the way the caller calls it on the literary branch (prevSrc
  // 'pagination', no prevUid).
  const ident = window.__ctlOwn(s, 3, PAGE);
  const unitNow = window._commitUnitText(s, ident);
  const allPagesJoined = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const latestProjection = window._sbLatestProseText(s) || '';
  return JSON.parse(JSON.stringify({ ident: ident, unitNow: unitNow,
    unitHashNow: window._sbTextHash(unitNow.text),
    allPagesHash: window._sbTextHash(allPagesJoined),
    latestProjectionHash: window._sbTextHash(latestProjection),
    sourcesDiffer: allPagesJoined !== latestProjection }));
});
t('the two MOVING sources really are different in this configuration',
  litCaller.sourcesDiffer === true && litCaller.allPagesHash !== litCaller.latestProjectionHash,
  JSON.stringify([litCaller.allPagesHash, litCaller.latestProjectionHash]));
t('the shipped builder binds to ONE NAMED PAGE, and hashes THAT page — not all pages joined',
  litCaller.ident.unitKind === 'page' && !!litCaller.ident.unitId
  && litCaller.ident.unitHash === litCaller.unitHashNow
  && litCaller.ident.unitHash !== litCaller.allPagesHash
  && litCaller.ident.unitHash !== litCaller.latestProjectionHash,
  JSON.stringify({ kind: litCaller.ident.unitKind, id: litCaller.ident.unitId,
    unit: litCaller.ident.unitHash, all: litCaller.allPagesHash, latest: litCaller.latestProjectionHash }));
t('...and it carries the page uid, with no projection hash for an unrecorded literary unit',
  litCaller.ident.projectionHash === null && litCaller.ident.sceneUid === null,
  JSON.stringify(litCaller.ident));

pageVerifierResp = { delivery: 'MISSED',
  milestone_watch: [{ n: 16, status: 'delivered_on_page',
    evidence: '"I bent the wish," Julian said, where the Chayr could hear him',
    participants: ['Julian'], scope: 'the Chayr' }], prereq_watch: [] };
const litNoFalse = await page.evaluate(async () => {
  const s = window.state;
  const PAGE = window.__ctlPageText();
  s._milestoneDeliveries = []; s._prereqInvalidations = []; s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'z', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  const ident = window.__ctlOwn(s, 3, PAGE);
  await window._commitScene(PAGE, sc, 1, ident);
  return JSON.parse(JSON.stringify({ rec: (s._milestoneDeliveries || []).filter(r => r.milestoneScene === 16)[0] || null }));
});
t('NO FALSE REWRITE: the unchanged page beside an older projection is accepted',
  !!litNoFalse.rec && litNoFalse.rec.accepted === true
  && litNoFalse.rec.unitKind === 'page',
  JSON.stringify(litNoFalse.rec && { acc: litNoFalse.rec.accepted, why: litNoFalse.rec.why }));

section('17d. A REAL EDIT DURING THE HELD REQUEST, AND A REAL EDIT AFTERWARDS');
// The edit is performed by the route handler WHILE the verifier request is in flight, through
// StoryPagination's own setter — not by pre-mismatching a hash.
editDuringRequest = true;
const litDuring = await page.evaluate(async () => {
  const s = window.state;
  const PAGE = window.__ctlPageText();
  s._milestoneDeliveries = []; s._prereqInvalidations = []; s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'z2', milestone: 'm',
    scene: 1, storyScene: 3, milestoneScene: 3 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 3, milestoneScene: 3 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 1, storyScene: 3 };
  const ident = window.__ctlOwn(s, 3, PAGE);
  window.__ctlEditPage = function () {
    // AN EDIT TO THE EXISTING PAGE, in place, keeping its uid — which is what rewriting a page is.
    // (Replacing the whole book with setAllContent mints a NEW page instead, and the old unit is
    // then merely ABSENT, which is correctly treated as unverifiable rather than as a rewrite.)
    var uids = StoryPagination.getPageUids(), pages = StoryPagination.getPages();
    var i = uids.indexOf(ident.unitId);
    pages[i] = '<p>Julian said nothing at all, and the Chayr waited for a word that never came, and the clearing emptied around the two of them without anybody saying anything further.</p>';
    StoryPagination.setPages(pages, uids);
  };
  await window._commitScene(PAGE, sc, 1, ident);
  return JSON.parse(JSON.stringify({ rec: (s._milestoneDeliveries || []).filter(r => r.milestoneScene === 16)[0] || null,
    refusal: (s._milestoneDeliveries || []).filter(r => r.status === 'unassessed')[0] || null,
    lastRefusal: s._lastCommitRefusal || null,
    pageNow: String((window._commitUnitText(s, ident) || {}).text || '').slice(-60) }));
});
editDuringRequest = false;
t('the identified page really was edited during the request, in place, via setPages',
  /without anybody saying anything further/.test(litDuring.pageNow), litDuring.pageNow);
t('the whole reply is REFUSED BEFORE ANY DURABLE WRITE, naming the unit and the hash transition',
  !litDuring.rec && !!litDuring.refusal && litDuring.refusal.accepted === false
  && litDuring.refusal.status === 'unassessed'
  && /refused before any durable write — the page [^ ]+ changed — narrative prose was (ADDED to|REMOVED from) it \(\d+ -> \d+ characters\) \(narrative hash h[^ ]+ -> h[^ )]+\) while the assessment was in flight/
       .test(String(litDuring.refusal.why)),
  JSON.stringify({ rec: litDuring.rec, refusal: litDuring.refusal }));

const litAfter = await page.evaluate(async () => {
  const s = window.state;
  // A CLEAN accepted record first, against the current page.
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  StoryPagination.addPage('<p>The clearing emptied. "I bent the wish," Julian said, where the Chayr could hear him.</p>', true);
  const PAGE = window.__ctlPageText();
  s._milestoneDeliveries = [{ milestoneScene: 16, atScene: 3, status: 'delivered_on_page',
    accepted: true, why: 'accepted', evidence: '"I bent the wish," Julian said',
    participants: ['Julian'], scope: 'the Chayr', pageUid: 'page:x',
    unitKind: 'page', unitId: StoryPagination.getCurrentPageUid(),
    unitHash: window._sbTextHash(PAGE), unitChars: PAGE.length,
    superseded: false, at: 1 }];
  const beforeEdit = !!s._milestoneDeliveries[0].superseded;
  // THE REAL POST-ASSESSMENT EDIT PATH: the page is edited IN PLACE through StoryPagination's
  // public setter, which has no invalidation hook of its own.
  const _uids = StoryPagination.getPageUids(), _pages = StoryPagination.getPages();
  const _i = _uids.indexOf(s._milestoneDeliveries[0].unitId);
  _pages[_i] = '<p>The clearing emptied by degrees. Julian said nothing at all, and the Chayr waited for a word that never came, and then they went their separate ways.</p>';
  StoryPagination.setPages(_pages, _uids);
  const straightAfterEdit = !!s._milestoneDeliveries[0].superseded;
  // THE PRODUCTION PATH THAT CATCHES IT: the next commit pass revalidates what is held.
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'z3', milestone: 'm',
    scene: 1, storyScene: 4, milestoneScene: 4 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 4, milestoneScene: 4 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 2, storyScene: 4 };
  const nowPage = window.__ctlPageText();
  const ident = window.__ctlOwn(s, 4, nowPage);
  await window._commitScene(nowPage, sc, 2, ident);
  const rec = s._milestoneDeliveries.filter(r => r.milestoneScene === 16)[0];
  s.turnCount = 14; delete s._issueOutline; delete s._issueOutlineHistory;
  const r16 = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0];
  return JSON.parse(JSON.stringify({ beforeEdit: beforeEdit, straightAfterEdit: straightAfterEdit,
    rec: rec, delivered: !!r16.alreadyDelivered, accomplishes: r16.accomplishes }));
});
t('StoryPagination\'s setter has NO invalidation hook of its own — stated, not papered over',
  litAfter.beforeEdit === false && litAfter.straightAfterEdit === false,
  JSON.stringify([litAfter.beforeEdit, litAfter.straightAfterEdit]));
t('the NEXT COMMIT PASS revalidates and supersedes the record whose page was edited',
  !!litAfter.rec && litAfter.rec.superseded === true
  && /page [^ ]+ changed — narrative prose was (ADDED to|REMOVED from) it/.test(String(litAfter.rec.supersededReason))
  && /detected by the commit pass/.test(String(litAfter.rec.supersededReason)),
  JSON.stringify(litAfter.rec && { sup: litAfter.rec.superseded, why: litAfter.rec.supersededReason }));
t('...and the plan stops treating the milestone as delivered',
  litAfter.delivered === false && /Julian finally admits he acted/.test(litAfter.accomplishes),
  JSON.stringify([litAfter.delivered, String(litAfter.accomplishes).slice(0, 50)]));
pageVerifierResp = null;

// ═══ 18. COMPACTION KEEPS INDEPENDENT SUPPORTS ══════════════════════════════════════════════
section('18. TWO SCENES SUPPORT ONE MILESTONE; REWRITING ONE LEAVES THE OTHER');
const supports = await page.evaluate(() => {
  const s = window.state;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 14;
  // TWO INDEPENDENT supports for row 16, read from two different scenes at two different hashes.
  s._milestoneDeliveries = [
    { milestoneScene: 16, atScene: 3, status: 'delivered_on_page', accepted: true, why: 'accepted',
      evidence: 'scene A evidence', participants: ['Julian'], scope: 'the clearing',
      sceneUid: 'u:A', projectionHash: 'h:A', projectionRevision: 0, superseded: false, at: 10 },
    { milestoneScene: 16, atScene: 5, status: 'delivered_on_page', accepted: true, why: 'accepted',
      evidence: 'scene B evidence', participants: ['Julian'], scope: 'the clearing',
      sceneUid: 'u:B', projectionHash: 'h:B', projectionRevision: 0, superseded: false, at: 20 }
  ];
  // THE PRODUCTION COMPACTION, reached by a real commit pass.
  s._prereqInvalidations = []; s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  s.scenes = [];
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'c1', milestone: 'm',
    scene: 1, storyScene: 6, milestoneScene: 6 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 6, milestoneScene: 6 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 4, storyScene: 6 };
  return { sc: sc, prose: 'A passage of prose long enough to be judged at all, with more than forty characters in it.' };
});
const supportsAfter = await page.evaluate(async (arg) => {
  const s = window.state;
  await window._commitScene(arg.prose, arg.sc, 4, window.__ctlMount(window.state, arg.sc.storyScene || 4, arg.prose));
  const afterCompaction = (s._milestoneDeliveries || []).filter(r => r.milestoneScene === 16 && r.accepted);
  // NOW REWRITE ONLY SCENE B, through the shipped hook.
  window._sbInvalidateDependentsOfScene('u:B', 'h:B', 1);
  const live = (s._milestoneDeliveries || []).filter(r => r.milestoneScene === 16 && r.accepted && !r.superseded);
  delete s._issueOutline; delete s._issueOutlineHistory;
  const r16 = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0];
  return JSON.parse(JSON.stringify({ afterCompaction: afterCompaction, live: live,
    delivered: !!r16.alreadyDelivered,
    citedScenes: (r16.alreadyDelivered || []).map(h => h.atScene) }));
}, supports);
t('compaction keeps BOTH independent supports, with their own scenes and evidence',
  supportsAfter.afterCompaction.length === 2
  && supportsAfter.afterCompaction.map(r => r.atScene).sort().join(',') === '3,5'
  && supportsAfter.afterCompaction.some(r => r.evidence === 'scene A evidence'),
  JSON.stringify(supportsAfter.afterCompaction.map(r => [r.atScene, r.evidence])));
t('rewriting scene B supersedes ONLY B — scene A remains live',
  supportsAfter.live.length === 1 && supportsAfter.live[0].atScene === 3
  && supportsAfter.live[0].evidence === 'scene A evidence',
  JSON.stringify(supportsAfter.live.map(r => [r.atScene, r.superseded])));
t('the conclusion REMAINS established on the surviving support',
  supportsAfter.delivered === true && supportsAfter.citedScenes.join() === '3',
  JSON.stringify({ delivered: supportsAfter.delivered, cited: supportsAfter.citedScenes }));
t('a SUPERSEDED newer record never displaces a valid older support for the same source',
  await page.evaluate(async () => {
    const s = window.state;
    s._milestoneDeliveries = [
      { milestoneScene: 17, atScene: 7, status: 'delivered_on_page', accepted: true, why: 'accepted',
        evidence: 'valid older', participants: ['Julian'], scope: 'x',
        sceneUid: 'u:S', projectionHash: 'h:S', projectionRevision: 0, superseded: false, at: 10 },
      { milestoneScene: 17, atScene: 7, status: 'delivered_on_page', accepted: true, why: 'accepted',
        evidence: 'superseded newer', participants: ['Julian'], scope: 'x',
        sceneUid: 'u:S', projectionHash: 'h:S', projectionRevision: 0, superseded: true, at: 99 }
    ];
    s._sealedProposals = null;
    s._committedState = { facts: [], tableau: null, pendingIntent: null };
    const sealed = window._sealProposal({ kind: 'state_change', fact: 'c2', milestone: 'm',
      scene: 1, storyScene: 8, milestoneScene: 8 });
    const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 8, milestoneScene: 8 };
    s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 6, storyScene: 8 };
    await (async () => { const _p = 'A passage of prose long enough to be judged at all, with more than forty characters in it.';
    return window._commitScene(_p, sc, 6, window.__ctlMount(window.state, sc.storyScene || 6, _p)); })();
    const kept = (s._milestoneDeliveries || []).filter(r => r.milestoneScene === 17 && r.accepted);
    return kept.length === 1 && kept[0].evidence === 'valid older' && kept[0].superseded === false;
  }), 'a superseded record displaced valid support');

// ═══ 19. ORDINARY PROGRESSION IS NOT A REWRITE ══════════════════════════════════════════════
section('19. ACCEPT FROM A, ADD B NORMALLY, COMMIT AGAIN — A MUST SURVIVE (both formats)');
// THE REGRESSION THIS CATCHES: revalidation followed a MOVING source. 'pagination' is every page
// joined, so appending a page changed the hash; 'projection' is the LATEST scene, so generating
// scene B changed the comparison for an assessment belonging to scene A. Normal continuation
// could therefore delete established milestones and Fate consequences from planning.
const cgProgress = await page.evaluate(async () => {
  const s = window.state;
  s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
  s.issueIndexInRun = 2;        // CG issue 2 = scenes 11-20, which is where row 16 lives
  const A = 'Scene A, in which Julian says the thing where the Chayr can hear him, at length enough to judge.';
  const B = 'Scene B, an entirely different later scene, which changes what the LATEST projection returns.';
  const uidA = window._sbMintSceneUid('ctlA');
  s.scenes = [{ uid: uidA, text: A,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(A), revision: 0, provenance: 'api_built' } }];
  // AN ACCEPTED ASSESSMENT bound to scene A, built by the SHIPPED builder.
  const identA = window.__buildCommitSceneIdentity(s, A, uidA, 'projection');
  s._milestoneDeliveries = [Object.assign({ milestoneScene: 16, atScene: 3,
    status: 'delivered_on_page', accepted: true, why: 'accepted',
    evidence: 'Julian says the thing', participants: ['Julian'], scope: 'the Chayr',
    superseded: false, at: 10 }, identA)];
  s._prereqInvalidations = [];
  // SCENE B IS ADDED NORMALLY. Nothing about A changes.
  const uidB = window._sbMintSceneUid('ctlB');
  s.scenes.push({ uid: uidB, text: B,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(B), revision: 0, provenance: 'api_built' } });
  const aUntouched = s.scenes[0].projection.hash === window._sbTextHash(A);
  // THE NEXT PRODUCTION COMMIT PASS.
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'pB', milestone: 'm',
    scene: 1, storyScene: 4, milestoneScene: 4 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 4, milestoneScene: 4 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 2, storyScene: 4 };
  await window._commitScene(B, sc, 2, window.__buildCommitSceneIdentity(s, B, uidB, 'projection'));
  const rec = s._milestoneDeliveries.filter(r => r.milestoneScene === 16)[0];
  s.turnCount = 14; s._stagedAuthoringSceneIndex = 13;   // CG scene 14 -> window 11-20
  delete s._issueOutline; delete s._issueOutlineHistory;
  const r16 = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0] || null;
  return JSON.parse(JSON.stringify({ aUntouched: aUntouched, rec: rec,
    delivered: !!(r16 && r16.alreadyDelivered) }));
});
t('CG: scene A really is untouched after scene B is added', cgProgress.aUntouched === true, '');
t('CG: adding scene B does NOT supersede the assessment bound to scene A',
  !!cgProgress.rec && cgProgress.rec.superseded !== true,
  JSON.stringify(cgProgress.rec && { sup: cgProgress.rec.superseded, why: cgProgress.rec.supersededReason }));
t('CG: ...and the milestone is still delivered in planning', cgProgress.delivered === true,
  String(cgProgress.delivered));

const litProgress = await page.evaluate(async () => {
  const s = window.state;
  s.renderMode = 'literary'; s.currentEngine = 'literary'; delete s._stagedAuthoringSceneIndex;
  s.issueIndexInRun = 1;        // literary issue 1 = scenes 1-20, which is where row 16 lives
  s.scenes = [];
  window.__ctlResetLedger(s);
  const A = 'Page A, in which Julian says the thing where the Chayr can hear him, at length enough to judge.';
  const B = 'Page B, a later scene on its own page, appended the way ordinary continuation appends one.';
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  StoryPagination.addPage('<p>' + A + '</p>', true);
  const uidA = StoryPagination.getCurrentPageUid();
  const identA = window.__ctlOwn(s, 3, A);
  s._milestoneDeliveries = [Object.assign({ milestoneScene: 16, atScene: 3,
    status: 'delivered_on_page', accepted: true, why: 'accepted',
    evidence: 'Julian says the thing', participants: ['Julian'], scope: 'the Chayr',
    superseded: false, at: 10 }, identA)];
  s._prereqInvalidations = [];
  // A NEW PAGE IS ADDED NORMALLY, exactly as continuation does at app.js:292274.
  StoryPagination.addPage('<p>' + B + '</p>', true);
  const uidB = StoryPagination.getCurrentPageUid();
  const pageAStillThere = StoryPagination.getPageUids().indexOf(uidA) >= 0;
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'pL', milestone: 'm',
    scene: 1, storyScene: 4, milestoneScene: 4 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 4, milestoneScene: 4 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 2, storyScene: 4 };
  await window._commitScene(B, sc, 2, window.__ctlOwn(s, 4, B));
  const rec = s._milestoneDeliveries.filter(r => r.milestoneScene === 16)[0];
  s.turnCount = 14; delete s._issueOutline; delete s._issueOutlineHistory;
  const r16 = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0] || {};
  return JSON.parse(JSON.stringify({ identA: identA, uidA: uidA, uidB: uidB,
    pageAStillThere: pageAStillThere, rec: rec, delivered: !!r16.alreadyDelivered }));
});
t('literary: page A is still present after page B is added, with distinct uids',
  litProgress.pageAStillThere === true && litProgress.uidA !== litProgress.uidB,
  JSON.stringify([litProgress.uidA, litProgress.uidB]));
t('literary: appending page B does NOT supersede the assessment bound to page A',
  !!litProgress.rec && litProgress.rec.superseded !== true,
  JSON.stringify(litProgress.rec && { sup: litProgress.rec.superseded, why: litProgress.rec.supersededReason }));
t('literary: ...and the milestone is still delivered in planning', litProgress.delivered === true,
  String(litProgress.delivered));

section('19b. THEN REWRITE A — ONLY A GOES, AND ANOTHER SUPPORT SURVIVES');
const rewriteA = await page.evaluate(async () => {
  const s = window.state;
  // A SECOND, INDEPENDENT support for the same row, on page C.
  const C = 'Page C, where the same admission is made again in front of a different witness entirely.';
  StoryPagination.addPage('<p>' + C + '</p>', true);
  const identC = window.__ctlOwn(s, 7, C);
  s._milestoneDeliveries.push(Object.assign({ milestoneScene: 16, atScene: 7,
    status: 'delivered_on_page', accepted: true, why: 'accepted',
    evidence: 'the same admission before another witness', participants: ['Julian'], scope: 'the Chayr',
    superseded: false, at: 20 }, identC));
  // REWRITE PAGE A IN PLACE, by its own uid, through StoryPagination's public setter.
  const uids = StoryPagination.getPageUids();
  const pages = StoryPagination.getPages();
  const iA = uids.indexOf(s._milestoneDeliveries[0].unitId || s._milestoneDeliveries[0].pageUid);
  pages[iA] = '<p>Page A, rewritten: Julian said nothing at all, and the Chayr waited for a word.</p>';
  StoryPagination.setPages(pages, uids);
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'pR', milestone: 'm',
    scene: 1, storyScene: 9, milestoneScene: 9 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 9, milestoneScene: 9 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 8, storyScene: 9 };
  await window._commitScene(C, sc, 8, window.__ctlOwn(s, 7, C));
  const recs = s._milestoneDeliveries.filter(r => r.milestoneScene === 16);
  s.turnCount = 14; delete s._issueOutline; delete s._issueOutlineHistory;
  const r16 = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0] || {};
  return JSON.parse(JSON.stringify({ recs: recs, iA: iA, delivered: !!r16.alreadyDelivered,
    cited: (r16.alreadyDelivered || []).map(h => h.atScene) }));
});
t('rewriting page A supersedes ONLY A\'s support, naming what changed',
  rewriteA.recs.filter(r => r.atScene === 3).every(r => r.superseded === true
    && /changed — narrative prose was (ADDED to|REMOVED from) it|its narrative prose was rewritten/
         .test(String(r.supersededReason))),
  JSON.stringify(rewriteA.recs.map(r => [r.atScene, r.superseded])));
t('page C\'s independent support is untouched',
  rewriteA.recs.filter(r => r.atScene === 7).every(r => r.superseded !== true),
  JSON.stringify(rewriteA.recs.map(r => [r.atScene, r.superseded])));
t('the conclusion remains established on page C alone',
  rewriteA.delivered === true && rewriteA.cited.join() === '7',
  JSON.stringify({ delivered: rewriteA.delivered, cited: rewriteA.cited }));

section('19c. MISSING HISTORICAL TEXT IS NOT A REWRITE');
const missing = await page.evaluate(async () => {
  const s = window.state;
  s._milestoneDeliveries = [{ milestoneScene: 18, atScene: 2, status: 'delivered_on_page',
    accepted: true, why: 'accepted', evidence: 'e', participants: ['Julian'], scope: 'x',
    unitKind: 'page', unitId: 'page:long-gone', unitHash: 'h:gone', unitChars: 120,
    pageUid: 'page:long-gone', superseded: false, at: 5 }];
  s._prereqInvalidations = [];
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'pM', milestone: 'm',
    scene: 1, storyScene: 11, milestoneScene: 11 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 11, milestoneScene: 11 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 10, storyScene: 11 };
  await (async () => { const _p = 'A passage of prose long enough to be judged at all, with more than forty characters.';
    return window._commitScene(_p, sc, 10, window.__ctlMount(window.state, sc.storyScene || 10, _p)); })();
  return JSON.parse(JSON.stringify({ rec: s._milestoneDeliveries.filter(r => r.milestoneScene === 18)[0] }));
});
t('a unit whose text is no longer available is UNVERIFIABLE, left in force — not superseded',
  !!missing.rec && missing.rec.superseded !== true,
  JSON.stringify(missing.rec && { sup: missing.rec.superseded, why: missing.rec.supersededReason }));

// ═══ 20. THE REAL CALLER SUBMITS ONLY THE UNIT IT BINDS TO ══════════════════════════════════
section('20. _generateLiteraryPlotContract: two pages, different events, one bound unit');
// THE PRODUCTION CALLER, not a helper. The literary branch sent the tail of getAllContent (every
// page joined) while binding the result to ONE page, so a quotation from page A could verify and
// become evidence owned by page B.
let submittedProse = null;
captureCommitProse = true;
const realCaller = await page.evaluate(async () => {
  const s = window.state;
  s.renderMode = 'literary'; s.currentEngine = 'literary'; delete s._stagedAuthoringSceneIndex;
  s.issueIndexInRun = 1; s.turnCount = 5; s.scenes = [];
  s._milestoneDeliveries = []; s._prereqInvalidations = []; s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  // TWO PAGES WITH DIFFERENT EVENTS. Page A contains the admission; page B does not.
  const A = 'Page A. "I bent the wish," Julian said in the clearing, where the Chayr could hear him say it.';
  const B = 'Page B. They walked the long way back along the seam, and neither of them mentioned the rite at all.';
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  // EACH PAGE RECORDS ITS OWNERSHIP AS IT MOUNTS, which is what production does at both
  // narrative addPage sites.
  StoryPagination.addPage('<p>' + A + '</p>', true);
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 3, pageUid: StoryPagination.getCurrentPageUid(), event: 'the admission' });
  StoryPagination.addPage('<p>' + B + '</p>', true);
  const uidB = StoryPagination.getCurrentPageUid();
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 4, pageUid: uidB, event: 'the walk back' });
  const joined = StoryPagination.getAllContent().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'the walk back', milestone: 'm',
    scene: 4, storyScene: 4, milestoneScene: 4 });
  s._priorSceneStateChange = { event: sealed.fact, proposalRef: sealed.id, sceneProposed: 4,
    storyScene: 4, milestoneScene: 4 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 4, storyScene: 4 };
  // THE REAL CALLER.
  try { await window._generateLiteraryPlotContract('they walk back', '', null, null, null); } catch (e) {}
  return JSON.parse(JSON.stringify({ uidB: uidB, joined: joined,
    pageA: A, pageB: B,
    lastSrc: s._lastCommitScenePrvSource || null,
    rec: (s._milestoneDeliveries || []).filter(r => r.milestoneScene === 16)[0] || null }));
});
captureCommitProse = false;
fs.writeFileSync('_audit_out/history_chain/real_caller_commit_request.txt',
  String(submittedProse == null ? '(nothing captured)' : submittedProse));
t('the real caller reached the commit verifier', submittedProse !== null,
  'no verifier request was captured from _generateLiteraryPlotContract');
t('the joined pages really do contain page A\'s admission',
  /I bent the wish/.test(realCaller.joined) && /walked the long way back/.test(realCaller.joined), '');
t('the OUTGOING REQUEST carries page B and page A\'s admission appears NOWHERE in it',
  submittedProse !== null && /walked the long way back/.test(submittedProse)
  && !/I bent the wish/.test(submittedProse),
  'submitted: ' + String(submittedProse).slice(0, 160));
t('...and the caller logged the narrowing to the bound unit',
  !!realCaller.lastSrc && realCaller.lastSrc.source === 'pagination',
  JSON.stringify(realCaller.lastSrc));
t('so a quotation from page A cannot become evidence owned by page B',
  !realCaller.rec || realCaller.rec.accepted !== true
  || !/I bent the wish/.test(String(realCaller.rec.evidence || '')),
  JSON.stringify(realCaller.rec && { acc: realCaller.rec.accepted, ev: realCaller.rec.evidence }));

section('20b. SUPPLEMENTARY MATERIAL IS NOT A REWRITE; ADDED NARRATIVE IS');
const suppVsProse = await page.evaluate(() => {
  const s = window.state;
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  const PROSE = '<p>The clearing emptied. "I bent the wish," Julian said, where the Chayr could hear him.</p>';
  StoryPagination.addPage(PROSE, true);
  const uid = StoryPagination.getCurrentPageUid();
  const ident = window.__ctlOwn(s, 3, '');
  const base = window._commitUnitText(s, ident).text;
  const setPage = (html) => {
    const uids = StoryPagination.getPageUids(), pages = StoryPagination.getPages();
    pages[uids.indexOf(uid)] = html;
    StoryPagination.setPages(pages, uids);
    return window._commitUnitText(s, ident).text;
  };
  // (a) AN ILLUSTRATION, exactly as app.js appends one.
  const withImg = setPage(PROSE + '<img src="x.png" class="story-image" alt="Vision" data-sb-supp="1">');
  // (b) A CHECKPOINT CARD, with its nested markup.
  const withBox = setPage(PROSE + '<div class="box" data-sb-supp="1" id="flingCheckpointBox">'
    + '<h3>This issue is complete.</h3><p>The story does not have to end here.</p>'
    + '<div><button>Continue this issue</button></div></div>');
  // (c) A TEMPT WHISPER.
  const withWhisper = setPage(PROSE + '<p class="tempt-whisper-line" data-sb-supp="1" data-force="dread">'
    + '<span class="tempt-whisper">Something is listening.</span></p>');
  // (d) NARRATIVE PROSE THAT CHANGES WHAT HAPPENED.
  const withNarrative = setPage(PROSE + '<p>Then he took it back, in front of all of them, '
    + 'and said he had never touched the wish at all.</p>');
  return JSON.parse(JSON.stringify({ base: base,
    img: withImg, box: withBox, whisper: withWhisper, narrative: withNarrative,
    identHash: ident.unitHash,
    changedByImg: window._commitUnitChangedForTest(ident, { found: true, text: withImg }),
    changedByBox: window._commitUnitChangedForTest(ident, { found: true, text: withBox }),
    changedByWhisper: window._commitUnitChangedForTest(ident, { found: true, text: withWhisper }),
    changedByNarrative: window._commitUnitChangedForTest(ident, { found: true, text: withNarrative }) }));
});
t('an ILLUSTRATION leaves the narrative text identical, so nothing is invalidated',
  suppVsProse.img === suppVsProse.base && suppVsProse.changedByImg === null,
  JSON.stringify({ changed: suppVsProse.changedByImg, text: suppVsProse.img.slice(-50) }));
t('a CHECKPOINT CARD, nested markup and all, leaves it identical too',
  suppVsProse.box === suppVsProse.base && suppVsProse.changedByBox === null,
  JSON.stringify({ changed: suppVsProse.changedByBox, text: suppVsProse.box.slice(-60) }));
t('a TEMPT WHISPER leaves it identical too',
  suppVsProse.whisper === suppVsProse.base && suppVsProse.changedByWhisper === null,
  JSON.stringify({ changed: suppVsProse.changedByWhisper }));
t('but ADDED NARRATIVE changes it and INVALIDATES, saying prose was added',
  suppVsProse.narrative !== suppVsProse.base
  && /narrative prose was ADDED to it \(\d+ -> \d+ characters\)/.test(String(suppVsProse.changedByNarrative)),
  JSON.stringify({ changed: suppVsProse.changedByNarrative }));

const narrInvalidates = await page.evaluate(async () => {
  const s = window.state;
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  const PROSE = '<p>The clearing emptied. "I bent the wish," Julian said, where the Chayr could hear him.</p>';
  StoryPagination.addPage(PROSE, true);
  const uidA = StoryPagination.getCurrentPageUid();
  const identA = window.__ctlOwn(s, 3, '');
  // A SECOND, INDEPENDENT support on another page and another scene, which must survive.
  StoryPagination.addPage('<p>Another page where the same admission is made before a different witness.</p>', true);
  const identC = window.__ctlOwn(s, 7, '');
  s._milestoneDeliveries = [
    Object.assign({ milestoneScene: 16, atScene: 3, status: 'delivered_on_page', accepted: true,
      why: 'accepted', evidence: 'I bent the wish', participants: ['Julian'], scope: 'the Chayr',
      superseded: false, at: 10 }, identA),
    Object.assign({ milestoneScene: 16, atScene: 7, status: 'delivered_on_page', accepted: true,
      why: 'accepted', evidence: 'before a different witness', participants: ['Julian'], scope: 'the Chayr',
      superseded: false, at: 20 }, identC)
  ];
  s._prereqInvalidations = [];
  // ADD NARRATIVE to page A only.
  const uids = StoryPagination.getPageUids(), pages = StoryPagination.getPages();
  pages[uids.indexOf(uidA)] = PROSE + '<p>Then he took it back, and said he had never touched it.</p>';
  StoryPagination.setPages(pages, uids);
  // THE PRODUCTION REVALIDATION PATH.
  const superseded = window._revalidateAssessments(s, 'the control');
  const recs = s._milestoneDeliveries.filter(r => r.milestoneScene === 16);
  s.turnCount = 14; s.issueIndexInRun = 1;
  delete s._issueOutline; delete s._issueOutlineHistory;
  const r16 = window._resolveIssueOutline(s).scenes.filter(x => x.n === 16)[0] || {};
  return JSON.parse(JSON.stringify({ superseded: superseded, recs: recs,
    delivered: !!r16.alreadyDelivered, cited: (r16.alreadyDelivered || []).map(h => h.atScene) }));
});
t('added narrative supersedes that page\'s support through the production revalidation',
  narrInvalidates.recs.filter(r => r.atScene === 3).every(r => r.superseded === true
    && /narrative prose was ADDED/.test(String(r.supersededReason))),
  JSON.stringify(narrInvalidates.recs.map(r => [r.atScene, r.superseded, r.supersededReason])));
t('...the OTHER unchanged unit\'s support is preserved',
  narrInvalidates.recs.filter(r => r.atScene === 7).every(r => r.superseded !== true),
  JSON.stringify(narrInvalidates.recs.map(r => [r.atScene, r.superseded])));
t('...and the conclusion stands on that surviving support',
  narrInvalidates.delivered === true && narrInvalidates.cited.join() === '7',
  JSON.stringify({ delivered: narrInvalidates.delivered, cited: narrInvalidates.cited }));

section('20c. TWO INDEPENDENT PAGE SUPPORTS NO LONGER FOLD INTO ONE');
// _sourceOf read fullTextHash, which this path no longer writes, so every literary record hashed
// to the same '?' source and compaction collapsed two independent supports.
const dedupe = await page.evaluate(async () => {
  const s = window.state;
  const before = s._milestoneDeliveries.filter(r => r.milestoneScene === 16).length;
  s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'dd', milestone: 'm',
    scene: 1, storyScene: 12, milestoneScene: 12 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, storyScene: 12, milestoneScene: 12 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 11, storyScene: 12 };
  await (async () => { const _p = 'A passage of prose long enough to be judged at all, with more than forty characters.';
    return window._commitScene(_p, sc, 11, window.__ctlMount(window.state, sc.storyScene || 11, _p)); })();
  // ACCEPTED SUPPORTS only: this pass also writes an `unreported` observation for row 16, which
  // is correct (the constructed reply names no entry for it) and is not a support.
  const after = s._milestoneDeliveries.filter(r => r.milestoneScene === 16 && r.accepted === true);
  return JSON.parse(JSON.stringify({ before: before,
    afterCount: after.length, scenes: after.map(r => r.atScene).sort(),
    sources: after.map(r => r.unitId || r.sceneUid || '?') }));
});
t('production compaction keeps BOTH page supports distinct (different unitIds)',
  dedupe.afterCount === 2 && dedupe.scenes.join() === '3,7'
  && dedupe.sources[0] !== dedupe.sources[1],
  JSON.stringify(dedupe));

// ═══ 21. OWNERSHIP IS THE SCENE'S, NOT THE READER'S ═════════════════════════════════════════
section('21. mount B, navigate back to A, assess B — identity and prose stay B');
// MEASURED DEFECT: the literary identity read getCurrentPageUid(), the page BEING VIEWED. Paging
// back to an earlier scene changed which page the assessment claimed to be about, and the new
// narrowing then confidently submitted that earlier page's prose.
captureCommitProse = true;
submittedProse = null;
const navOwnership = await page.evaluate(async () => {
  const s = window.state;
  s.renderMode = 'literary'; s.currentEngine = 'literary'; delete s._stagedAuthoringSceneIndex;
  s.issueIndexInRun = 1; s.turnCount = 5; s.scenes = [];
  s._milestoneDeliveries = []; s._prereqInvalidations = []; s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  window.__ctlResetLedger(s);
  const A = 'Page A for scene 3. "I bent the wish," Julian said in the clearing where the Chayr could hear it.';
  const B = 'Page B for scene 4. They walked the long way back along the seam and neither mentioned the rite.';
  StoryPagination.clear();
  // SCENE 3 MOUNTS ONTO ITS OWN PAGE, recorded in the scene ledger the way production records it.
  StoryPagination.addPage('<p>' + A + '</p>', true);
  const uidA = StoryPagination.getCurrentPageUid();
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 3, pageUid: uidA, event: 'the admission' });
  // SCENE 4 MOUNTS ONTO ITS OWN PAGE.
  StoryPagination.addPage('<p>' + B + '</p>', true);
  const uidB = StoryPagination.getCurrentPageUid();
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 4, pageUid: uidB, event: 'the walk back' });
  // THE READER NAVIGATES BACK TO PAGE A. The pending proposal is untouched.
  StoryPagination.goToPage(0);
  const viewedNow = StoryPagination.getCurrentPageUid();
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'the walk back', milestone: 'm',
    scene: 4, storyScene: 4, milestoneScene: 4 });
  s._priorSceneStateChange = { event: sealed.fact, proposalRef: sealed.id, sceneProposed: 4,
    storyScene: 4, milestoneScene: 4 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 4, storyScene: 4 };
  // THE REAL CALLER, with the reader parked on page A.
  try { await window._generateLiteraryPlotContract('they walk back', '', null, null, null); } catch (e) {}
  const ident = window.__buildCommitSceneIdentity(s, B, null, 'pagination', 4);
  return JSON.parse(JSON.stringify({ uidA: uidA, uidB: uidB, viewedNow: viewedNow, ident: ident,
    ownedBy3: window._sceneLedgerPageUidFor(s, 3), ownedBy4: window._sceneLedgerPageUidFor(s, 4) }));
});
captureCommitProse = false;
fs.writeFileSync('_audit_out/history_chain/nav_ownership_request.txt',
  String(submittedProse == null ? '(nothing captured)' : submittedProse));
t('the reader really is parked on page A while the proposal is scene 4\'s',
  navOwnership.viewedNow === navOwnership.uidA && navOwnership.uidA !== navOwnership.uidB,
  JSON.stringify({ viewed: navOwnership.viewedNow, A: navOwnership.uidA, B: navOwnership.uidB }));
t('the scene ledger owns each scene\'s page',
  navOwnership.ownedBy3 === navOwnership.uidA && navOwnership.ownedBy4 === navOwnership.uidB,
  JSON.stringify({ s3: navOwnership.ownedBy3, s4: navOwnership.ownedBy4 }));
t('the identity for scene 4 is page B, taken from the ledger and NOT from the viewed page',
  navOwnership.ident.pageUid === navOwnership.uidB
  && navOwnership.ident.unitId === navOwnership.uidB
  && /^scene_ledger:scene 4$/.test(String(navOwnership.ident.pageUidSource)),
  JSON.stringify({ pageUid: navOwnership.ident.pageUid, src: navOwnership.ident.pageUidSource }));
t('the OUTGOING request carries page B\'s prose and NOT page A\'s, despite A being on screen',
  submittedProse !== null && /walked the long way back/.test(submittedProse)
  && !/I bent the wish/.test(submittedProse),
  'submitted: ' + String(submittedProse).slice(0, 200));

section('21b. NO OWNED UNIT MEANS UNAVAILABLE, NEVER THE DISPLAYED PAGE');
const unowned = await page.evaluate(() => {
  const s = window.state;
  const viewed = StoryPagination.getCurrentPageUid();
  // Scene 9 has no ledger entry at all.
  const ident = window.__buildCommitSceneIdentity(s, 'some prose', null, 'pagination', 9);
  const identNoScene = window.__buildCommitSceneIdentity(s, 'some prose', null, 'pagination');
  return JSON.parse(JSON.stringify({ viewed: viewed, ident: ident, identNoScene: identNoScene }));
});
t('an unowned scene reports UNAVAILABLE and does NOT fall back to the displayed page',
  unowned.ident.pageUid === null && unowned.ident.unitId === null
  && unowned.ident.pageUid !== unowned.viewed
  && /^UNAVAILABLE — the scene ledger records no page for scene 9$/.test(String(unowned.ident.pageUidSource)),
  JSON.stringify({ pageUid: unowned.ident.pageUid, src: unowned.ident.pageUidSource }));
t('...so it is unbindable, which blocks durable acceptance rather than guessing',
  unowned.ident.unitHash === null, JSON.stringify(unowned.ident));
t('a caller that names no scene is UNAVAILABLE too, not "whatever is on screen"',
  unowned.identNoScene.pageUid === null
  && /^UNAVAILABLE — the caller named no scene/.test(String(unowned.identNoScene.pageUidSource)),
  JSON.stringify(unowned.identNoScene.pageUidSource));

section('21c. BOTH WHISPER WRITERS ARE DISPLAY MATERIAL');
const whispers = await page.evaluate(() => {
  const s = window.state;
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  const PROSE = '<p>The clearing emptied. "I bent the wish," Julian said, where the Chayr could hear him.</p>';
  StoryPagination.addPage(PROSE, true);
  const uid = StoryPagination.getCurrentPageUid();
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 31, pageUid: uid, event: 'e' });
  const ident = window.__buildCommitSceneIdentity(s, '', null, 'pagination', 31);
  const base = window._commitUnitText(s, ident).text;
  const setPage = (html) => {
    const uids = StoryPagination.getPageUids(), pages = StoryPagination.getPages();
    pages[uids.indexOf(uid)] = html;
    StoryPagination.setPages(pages, uids);
    return window._commitUnitText(s, ident).text;
  };
  // THE SHIPPED MARKUP of both writers, marked as production now emits it...
  const TEMPT = '<p class="tempt-whisper-line" data-sb-supp="1" data-force="dread" data-turn="4" data-mode="x">'
    + '<span class="tempt-whisper" data-action="tempt" role="button" tabindex="0">Something is listening.</span></p>';
  const PETITION = '<p class="petition-whisper-line" data-sb-supp="1" data-friction="stall" data-turn="4" data-mode="x">'
    + '<span class="petition-whisper" data-action="petition" role="button" tabindex="0">You could ask.</span></p>';
  // ...and UNMARKED, as already-saved stories hold it.
  const TEMPT_OLD = TEMPT.replace(' data-sb-supp="1"', '');
  const PETITION_OLD = PETITION.replace(' data-sb-supp="1"', '');
  const out = {
    base: base,
    tempt: setPage(PROSE + TEMPT),
    petition: setPage(PROSE + PETITION),
    temptOld: setPage(PROSE + TEMPT_OLD),
    petitionOld: setPage(PROSE + PETITION_OLD),
    both: setPage(PROSE + PETITION_OLD + TEMPT),
    prose: setPage(PROSE + '<p>Then he took it back and said he had never touched it at all.</p>')
  };
  out.changed = {};
  ['tempt', 'petition', 'temptOld', 'petitionOld', 'both', 'prose'].forEach(k => {
    out.changed[k] = window._commitUnitChangedForTest(ident, { found: true, text: out[k] });
  });
  return JSON.parse(JSON.stringify(out));
});
['tempt', 'petition', 'temptOld', 'petitionOld', 'both'].forEach(function (k) {
  t('a ' + k + ' whisper leaves the narrative text identical and invalidates nothing',
    whispers[k] === whispers.base && whispers.changed[k] === null,
    JSON.stringify({ changed: whispers.changed[k], tail: String(whispers[k]).slice(-70) }));
});
t('but a real prose change is still detected alongside them',
  whispers.prose !== whispers.base
  && /narrative prose was ADDED/.test(String(whispers.changed.prose)),
  JSON.stringify(whispers.changed.prose));

// ═══ 22. THE STORY SCENE, NOT THE TURN COUNTER ══════════════════════════════════════════════
section('22. sceneProposed 4 vs storyScene 6: ownership follows storyScene');
// MEASURED DEFECT: the caller passed _prevNum, derived from `sceneProposed` — the TURN COUNTER.
// The authoritative story-scene number is `storyScene`, which the seal preserves. My own earlier
// test made both numbers 4 and could not see the mismatch.
captureCommitProse = true;
submittedProse = null;
const twoNumbers = await page.evaluate(async () => {
  const s = window.state;
  s.renderMode = 'literary'; s.currentEngine = 'literary'; delete s._stagedAuthoringSceneIndex;
  s.issueIndexInRun = 1; s.turnCount = 5; s.scenes = [];
  s._milestoneDeliveries = []; s._prereqInvalidations = []; s._sealedProposals = null;
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  // BOTH PAGES PRESENT. Scene 4's page carries one event, scene 6's carries another.
  const P4 = 'The page that rendered STORY SCENE FOUR, in which the omen was read aloud and dismissed.';
  const P6 = 'The page that rendered STORY SCENE SIX, in which Julian prevented the inquiry from looking further.';
  StoryPagination.addPage('<p>' + P4 + '</p>', true);
  const uid4 = StoryPagination.getCurrentPageUid();
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 4, pageUid: uid4, event: 'the omen' });
  StoryPagination.addPage('<p>' + P6 + '</p>', true);
  const uid6 = StoryPagination.getCurrentPageUid();
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 6, pageUid: uid6, event: 'the concealment' });
  // THE READER IS LOOKING AT SCENE 4's PAGE, to prove navigation is irrelevant too.
  StoryPagination.goToPage(0);
  // A PRODUCTION-SHAPED PROPOSAL: the turn counter and the story scene DIFFER.
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'the concealment', milestone: 'm',
    scene: 4, storyScene: 6, milestoneScene: 6 });
  // THE HANDOFF CARRIES ONLY THE REFERENCE, so storyScene must be resolved FROM THE SEAL.
  s._priorSceneStateChange = { event: sealed.fact, proposalRef: sealed.id, sceneProposed: 4 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 4, storyScene: 6 };
  try { await window._generateLiteraryPlotContract('he says nothing', '', null, null, null); } catch (e) {}
  const identByCounter = window.__buildCommitSceneIdentity(s, P6, null, 'pagination', 4);
  const identByStory = window.__buildCommitSceneIdentity(s, P6, null, 'pagination', 6);
  return JSON.parse(JSON.stringify({ uid4: uid4, uid6: uid6,
    sealStoryScene: (window._resolveSealedProposal ? window._resolveSealedProposal(sealed.id) : {}).storyScene,
    handoffHasStoryScene: s._priorSceneStateChange.storyScene,
    viewed: StoryPagination.getCurrentPageUid(),
    byCounter: identByCounter.pageUid, byStory: identByStory.pageUid,
    lastSrc: s._lastCommitScenePrvSource || null }));
});
captureCommitProse = false;
fs.writeFileSync('_audit_out/history_chain/two_numbers_request.txt',
  String(submittedProse == null ? '(nothing captured)' : submittedProse));
t('the fixture really is production-shaped: the handoff has NO storyScene, the seal has 6',
  twoNumbers.handoffHasStoryScene === undefined && twoNumbers.sealStoryScene === 6,
  JSON.stringify({ handoff: twoNumbers.handoffHasStoryScene, seal: twoNumbers.sealStoryScene }));
t('the two numbers really do name DIFFERENT pages',
  twoNumbers.byCounter === twoNumbers.uid4 && twoNumbers.byStory === twoNumbers.uid6
  && twoNumbers.uid4 !== twoNumbers.uid6,
  JSON.stringify({ byCounter: twoNumbers.byCounter, byStory: twoNumbers.byStory }));
t('the reader is parked on scene 4\'s page, so navigation is not what decides it',
  twoNumbers.viewed === twoNumbers.uid4, JSON.stringify(twoNumbers.viewed));
t('the REAL caller submits SCENE 6\'s prose, resolved from the seal',
  submittedProse !== null && /STORY SCENE SIX/.test(submittedProse)
  && !/STORY SCENE FOUR/.test(submittedProse),
  'submitted: ' + String(submittedProse).slice(0, 200));

section('22b. A REFUSAL WRITES NOTHING DURABLE, EVEN WHEN THE REPLY SAYS DELIVERED');
// The reply below says DELIVERED and carries a clean milestone and prerequisite verdict. Nothing
// from it may be written when no unit owns the prose, or when the prose changed in flight.
const beforeState = await page.evaluate(() => {
  const s = window.state;
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  const PAGE = 'A page of prose long enough to be judged, in which the admission is made before the Chayr.';
  StoryPagination.addPage('<p>' + PAGE + '</p>', true);
  const uid = StoryPagination.getCurrentPageUid();
  window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 51, pageUid: uid, event: 'the admission' });
  // A PRE-EXISTING fact, delivery and invalidation that must all survive untouched.
  s._committedState = { facts: [{ scene: 50, event: 'an earlier committed fact', ref: 'prop:1:1' }],
                        tableau: null, pendingIntent: null };
  s._milestoneDeliveries = [{ milestoneScene: 12, atScene: 50, status: 'delivered_on_page',
    accepted: true, why: 'accepted', evidence: 'e', participants: ['Julian'], scope: 'x',
    unitKind: 'page', unitId: uid, unitHash: 'keep', unitChars: 10, superseded: false, at: 1 }];
  s._prereqInvalidations = [{ prereqId: 'prereq:investigation_open', atScene: 50,
    status: 'invalidated_on_page', accepted: true, why: 'accepted', evidence: 'e',
    participants: ['Julian'], scope: 'x', unitKind: 'page', unitId: uid, unitHash: 'keep',
    unitChars: 10, superseded: false, at: 1 }];
  return JSON.parse(JSON.stringify({ uid: uid, page: PAGE,
    facts: s._committedState.facts, md: s._milestoneDeliveries, pi: s._prereqInvalidations }));
});
pageVerifierResp = { delivery: 'DELIVERED',
  actual_exit_state: 'the admission has been made',
  slots_check: { actor_evidence: 'the admission is made', action_evidence: 'the admission is made',
                 target_evidence: 'before the Chayr', exit_state_evidence: 'before the Chayr',
                 precondition_evidence: 'a page of prose', occurred_this_scene: true },
  milestone_watch: [{ n: 16, status: 'delivered_on_page', evidence: 'the admission is made before the Chayr',
    participants: ['Julian'], scope: 'the Chayr' }],
  prereq_watch: [{ id: 'prereq:julian_act_concealed', status: 'invalidated_on_page',
    evidence: 'the admission is made before the Chayr', participants: ['Julian'], scope: 'the Chayr' }] };

const unownedRefusal = await page.evaluate(async (arg) => {
  const s = window.state;
  s._sealedProposals = null;
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'the admission', milestone: 'm',
    scene: 51, storyScene: 51, milestoneScene: 51 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, sceneProposed: 51, storyScene: 51 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 51, storyScene: 51 };
  // NO OWNED UNIT: scene 99 has no ledger entry, so the identity is UNAVAILABLE.
  const ident = window.__buildCommitSceneIdentity(s, arg.page, null, 'pagination', 99);
  await window._commitScene(arg.page, sc, 51, ident);
  return JSON.parse(JSON.stringify({ identSrc: ident.pageUidSource, bindable: !!ident.unitHash,
    facts: s._committedState.facts, pendingIntent: s._committedState.pendingIntent,
    through: s._committedState._committedThroughScene,
    acceptedMd: s._milestoneDeliveries.filter(r => r.accepted === true),
    acceptedPi: s._prereqInvalidations.filter(r => r.accepted === true),
    refusal: s._lastCommitRefusal }));
}, beforeState);
t('UNOWNED: no fact was committed, and the pre-existing fact is untouched',
  unownedRefusal.facts.length === 1 && unownedRefusal.facts[0].scene === 50,
  JSON.stringify(unownedRefusal.facts));
t('UNOWNED: the pending intent is PRESERVED for a later pass, not consumed',
  !!unownedRefusal.pendingIntent && unownedRefusal.pendingIntent.sceneProposed === 51,
  JSON.stringify(unownedRefusal.pendingIntent));
t('UNOWNED: no milestone delivery or prerequisite invalidation was accepted',
  unownedRefusal.acceptedMd.length === 1 && unownedRefusal.acceptedMd[0].milestoneScene === 12
  && unownedRefusal.acceptedPi.length === 1 && unownedRefusal.acceptedPi[0].prereqId === 'prereq:investigation_open',
  JSON.stringify({ md: unownedRefusal.acceptedMd.map(r => r.milestoneScene),
                   pi: unownedRefusal.acceptedPi.map(r => r.prereqId) }));
t('UNOWNED: the refusal is recorded as UNASSESSED and names why, with DELIVERED not treated as a verdict',
  !!unownedRefusal.refusal && /no unit owns this prose \(UNAVAILABLE — the scene ledger records no page for scene 99\)/
    .test(String(unownedRefusal.refusal.why)) && unownedRefusal.through == null,
  JSON.stringify(unownedRefusal.refusal));

editDuringRequest = true;
const rewriteRefusal = await page.evaluate(async (arg) => {
  const s = window.state;
  s._committedState = { facts: [{ scene: 50, event: 'an earlier committed fact', ref: 'prop:1:1' }],
                        tableau: null, pendingIntent: null };
  s._sealedProposals = null;
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'the admission', milestone: 'm',
    scene: 52, storyScene: 51, milestoneScene: 51 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, sceneProposed: 52, storyScene: 51 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 52, storyScene: 51 };
  const ident = window.__buildCommitSceneIdentity(s, arg.page, null, 'pagination', 51);
  // THE PAGE IS REWRITTEN IN PLACE WHILE THE REQUEST IS HELD.
  window.__ctlEditPage = function () {
    const uids = StoryPagination.getPageUids(), pages = StoryPagination.getPages();
    pages[uids.indexOf(ident.unitId)] = '<p>A completely different page of prose in which nothing at all was admitted to anybody.</p>';
    StoryPagination.setPages(pages, uids);
  };
  await window._commitScene(arg.page, sc, 52, ident);
  return JSON.parse(JSON.stringify({ bindable: !!ident.unitHash,
    facts: s._committedState.facts, pendingIntent: s._committedState.pendingIntent,
    acceptedMd: s._milestoneDeliveries.filter(r => r.accepted === true),
    acceptedPi: s._prereqInvalidations.filter(r => r.accepted === true),
    refusal: s._lastCommitRefusal }));
}, beforeState);
editDuringRequest = false;
pageVerifierResp = null;
t('REWRITTEN IN FLIGHT: the identity WAS bindable, so this is a stale return and not an unowned one',
  rewriteRefusal.bindable === true, String(rewriteRefusal.bindable));
t('REWRITTEN IN FLIGHT: no fact was committed although the reply said DELIVERED',
  rewriteRefusal.facts.length === 1 && rewriteRefusal.facts[0].scene === 50,
  JSON.stringify(rewriteRefusal.facts));
t('REWRITTEN IN FLIGHT: the pending intent is preserved',
  !!rewriteRefusal.pendingIntent && rewriteRefusal.pendingIntent.sceneProposed === 52,
  JSON.stringify(rewriteRefusal.pendingIntent));
t('REWRITTEN IN FLIGHT: nothing new was accepted into either store',
  rewriteRefusal.acceptedMd.length === 1 && rewriteRefusal.acceptedPi.length === 1,
  JSON.stringify({ md: rewriteRefusal.acceptedMd.length, pi: rewriteRefusal.acceptedPi.length }));
t('REWRITTEN IN FLIGHT: the refusal names the rewrite',
  !!rewriteRefusal.refusal
  && /changed — narrative prose was (ADDED to|REMOVED from) it|its narrative prose was rewritten/
       .test(String(rewriteRefusal.refusal.why)),
  JSON.stringify(rewriteRefusal.refusal));

// ═══ 23. PRESERVING A CONCLUSION vs ACCEPTING A NEW ONE ═════════════════════════════════════
section('23. a unit that has DISAPPEARED cannot authorize a new commit');
// MEASURED DEFECT: both of these returned null from _commitTargetUnusable, meaning usable — a
// literary page that existed at dispatch and was gone when the reply returned, and a CG scene
// whose projection had become unreadable. Missing evidence must not erase an established
// conclusion; it also must not authorize a new one.
const vanished = await page.evaluate(() => {
  const s = window.state;
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  const PAGE = 'A page of prose long enough to be judged, where the admission is made before the Chayr.';
  StoryPagination.addPage('<p>' + PAGE + '</p>', true);
  const ident = window.__ctlMount(s, 61, PAGE);
  const usableAtDispatch = window._commitTargetUnusable(ident);
  // THE PAGE DISAPPEARS — the reader starts a new book, the view is cleared, the uid is gone.
  StoryPagination.clear();
  const afterVanish = window._commitTargetUnusable(ident);
  // A CG SCENE whose record exists but whose projection has become unreadable.
  const uid = window._sbMintSceneUid('ctlP');
  const TXT = 'A CG scene projection long enough to be judged at all, with more than forty characters.';
  s.scenes = [{ uid: uid, text: TXT,
    projection: { v: 1, kind: 'ctl', hash: window._sbTextHash(TXT), revision: 0, provenance: 'api_built' } }];
  const cgIdent = window.__buildCommitSceneIdentity(s, TXT, uid, 'projection', 62);
  const cgAtDispatch = window._commitTargetUnusable(cgIdent);
  delete s.scenes[0].projection;                       // the projection becomes unreadable
  const cgAfter = window._commitTargetUnusable(cgIdent);
  return JSON.parse(JSON.stringify({ usableAtDispatch: usableAtDispatch, afterVanish: afterVanish,
    cgAtDispatch: cgAtDispatch, cgAfter: cgAfter }));
});
t('both targets were USABLE at dispatch — the fixtures are valid to begin with',
  vanished.usableAtDispatch === null && vanished.cgAtDispatch === null,
  JSON.stringify([vanished.usableAtDispatch, vanished.cgAtDispatch]));
t('a page that has DISAPPEARED refuses the arriving result',
  /^the page this reply was bound to can no longer be read \(page [^ ]+ is not in pagination\), so the arriving result cannot be checked/
    .test(String(vanished.afterVanish)), JSON.stringify(vanished.afterVanish));
t('a CG scene with no readable projection refuses it too',
  /^the scene [^ ]+ has no readable projection any more, so the arriving result cannot be checked/
    .test(String(vanished.cgAfter)), JSON.stringify(vanished.cgAfter));

section('23b. ...WHILE AN ESTABLISHED CONCLUSION IS STILL PRESERVED');
const preserved = await page.evaluate(() => {
  const s = window.state;
  // An ACCEPTED conclusion whose unit is no longer readable at all.
  s._milestoneDeliveries = [{ milestoneScene: 14, atScene: 9, status: 'delivered_on_page',
    accepted: true, why: 'accepted', evidence: 'e', participants: ['Julian'], scope: 'x',
    unitKind: 'page', unitId: 'pg:vanished', unitHash: 'h:gone', unitChars: 90,
    superseded: false, at: 1 }];
  s._prereqInvalidations = [{ prereqId: 'prereq:investigation_open', atScene: 9,
    status: 'invalidated_on_page', accepted: true, why: 'accepted', evidence: 'e',
    participants: ['Julian'], scope: 'x', unitKind: 'scene', unitId: 'u:vanished',
    sceneUid: 'u:vanished', projectionHash: 'h:gone', superseded: false, at: 1 }];
  const superseded = window._revalidateAssessments(s, 'the control');
  return JSON.parse(JSON.stringify({ superseded: superseded,
    md: s._milestoneDeliveries[0], pi: s._prereqInvalidations[0] }));
});
t('revalidation supersedes NOTHING when the evidence is merely out of reach',
  preserved.superseded.length === 0, JSON.stringify(preserved.superseded));
t('the established milestone delivery is still in force',
  preserved.md.accepted === true && preserved.md.superseded !== true,
  JSON.stringify({ acc: preserved.md.accepted, sup: preserved.md.superseded }));
t('the established prerequisite invalidation is still in force',
  preserved.pi.accepted === true && preserved.pi.superseded !== true,
  JSON.stringify({ acc: preserved.pi.accepted, sup: preserved.pi.superseded }));

section('23c. A VANISHED UNIT REFUSES THE WHOLE COMMIT, DELIVERED OR NOT');
pageVerifierResp = { delivery: 'DELIVERED',
  actual_exit_state: 'it happened',
  slots_check: { actor_evidence: 'the admission', action_evidence: 'the admission',
    target_evidence: 'the Chayr', exit_state_evidence: 'the Chayr',
    precondition_evidence: 'a page', occurred_this_scene: true },
  milestone_watch: [{ n: 16, status: 'delivered_on_page', evidence: 'the admission is made before the Chayr',
    participants: ['Julian'], scope: 'the Chayr' }],
  prereq_watch: [] };
editDuringRequest = true;
const vanishMidFlight = await page.evaluate(async () => {
  const s = window.state;
  window.__ctlResetLedger(s);
  StoryPagination.clear();
  const PAGE = 'A page of prose long enough to be judged, where the admission is made before the Chayr.';
  StoryPagination.addPage('<p>' + PAGE + '</p>', true);
  const ident = window.__ctlMount(s, 63, PAGE);
  s._committedState = { facts: [{ scene: 60, event: 'an earlier committed fact', ref: 'prop:1:1' }],
                        tableau: null, pendingIntent: null };
  s._milestoneDeliveries = []; s._prereqInvalidations = []; s._sealedProposals = null;
  const sealed = window._sealProposal({ kind: 'state_change', fact: 'the admission', milestone: 'm',
    scene: 63, storyScene: 63, milestoneScene: 63 });
  const sc = { event: sealed.fact, proposalRef: sealed.id, sceneProposed: 63, storyScene: 63 };
  s._committedState.pendingIntent = { milestone: 'm', proposed: sealed.fact, sceneProposed: 63, storyScene: 63 };
  // THE PAGE VANISHES WHILE THE REQUEST IS HELD.
  window.__ctlEditPage = function () { StoryPagination.clear(); };
  await window._commitScene(PAGE, sc, 63, ident);
  return JSON.parse(JSON.stringify({ facts: s._committedState.facts,
    pendingIntent: s._committedState.pendingIntent,
    acceptedMd: s._milestoneDeliveries.filter(r => r.accepted === true),
    refusal: s._lastCommitRefusal }));
});
pageVerifierResp = null;
editDuringRequest = false;
t('a unit that vanishes in flight commits NO fact although the reply said DELIVERED',
  vanishMidFlight.facts.length === 1 && vanishMidFlight.facts[0].scene === 60,
  JSON.stringify(vanishMidFlight.facts));
t('...accepts no milestone delivery',
  vanishMidFlight.acceptedMd.length === 0, JSON.stringify(vanishMidFlight.acceptedMd));
t('...preserves the pending intent, and names the unreadable unit',
  !!vanishMidFlight.pendingIntent
  && /can no longer be read/.test(String((vanishMidFlight.refusal || {}).why)),
  JSON.stringify(vanishMidFlight.refusal));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('evidence: _audit_out/history_chain/');
process.exit(fail ? 1 : 0);
