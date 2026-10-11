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
    verifierSeen = { ref: ref, bytes: joined.length };
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
  await window._commitScene(PROSE, stateChange, 1);
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

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('evidence: _audit_out/history_chain/');
process.exit(fail ? 1 : 0);
