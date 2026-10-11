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
    deliveryLog: { '1': { scene: 1, aggregateDelivery: 'MISSED', committed: [{ ref: 'prop:1:1' }], pending: {} } },
    pendingIntent: null, tableau: null
  };
  s._issueOutline = null; s._issueOutlineHistory = {};
  s._stagedAuthoringSceneIndex = 5;
  const o = window._resolveIssueOutline(s, { force: true });
  const r1 = o.scenes.filter(r => r.n === 1)[0];
  const block = window._renderIssueOutlineDirective(s, 6) || '';
  // Now the same facts WITH a delivered verdict.
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
  return JSON.parse(JSON.stringify({ r16, block16, summary: window._issueOutlineSummary().alreadyWritten }));
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
t('the pending flags are listed in the devtools summary',
  Array.isArray(early.summary) && early.summary.some(x => x.scene === 16), JSON.stringify(early.summary));
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

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('evidence: _audit_out/history_chain/');
process.exit(fail ? 1 : 0);
