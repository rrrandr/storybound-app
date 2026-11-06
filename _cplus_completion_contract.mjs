#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// APPLIED IS NOT FULFILLED — THE CONTRACT, TESTED AGAINST THE SAVED PAID OUTPUTS.
//
// WHAT WENT WRONG. Two paid editor passes answered the presiding Dohkar's Character+ obligation
// with `decision: "edit"`. gpt-6.1-sol's edit was "thick violet hair brushing his narrow,
// pearl-grey face" and its own `why` said the edit "supplies only the missing physical
// grounding". The obligation was recorded as ANSWERED, because an EDIT discharged an obligation
// by existing: `chose[id]='edit'` plus any edit text naming that id, with nothing asking whether
// the text served the perception requirement. A KEEP had to prove both findings; an EDIT proved
// neither. Downstream the inserted sentence became the C+ manifestation and the character's
// introduction was credited to a line of hair colour.
//
// THE FIXTURES ARE THE REAL REPLIES. The scene, the quotes and the edits below are taken from
// _ab_writing_out/cplus_repair_2026-11-04T22-13-11-902Z (claude-haiku-5-5) and
// …T22-14-07-918Z (gpt-6.1-sol). Nothing is invented to make a point, and no provider is called.
//
// WHAT A QUOTATION CHECK PROVES. That the passage EXISTS in the finished scene. NOT that it
// means what the editor said it means — not that a line of dialogue addressed to someone is a
// relationship perception event. Every record this produces says semanticallyVerified: false,
// and these checks assert that it does.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = '/Users/romantsukerman/storybound-app';
vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

let pass = 0; const fails = [];
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ok    ' + label); }
  else { fails.push(label); console.log('  FAIL  ' + label + (extra ? '\n        ' + extra : '')); }
}

// ── THE REAL SCENE, the paragraphs both arms were given ────────────────────────────────────
const SAVED = ROOT + '/_ab_writing_out/cplus_repair_2026-11-04T22-14-07-918Z';
const ORIGINAL = fs.readFileSync(SAVED + '/before.txt', 'utf8');
const SOL_FINAL = fs.readFileSync(SAVED + '/after.txt', 'utf8');
const HAIKU_FINAL = fs.readFileSync(
  ROOT + '/_ab_writing_out/cplus_repair_2026-11-04T22-13-11-902Z/after.txt', 'utf8');
const ID = 'cplus:the_presiding_dohkar';

// The passages at issue, copied from the saved artifacts.
const SOL_INSERT = 'thick violet hair brushing his narrow, pearl-grey face';
const HAIKU_INSERT = 'his small fluid hands finally still';
const REBUKE = 'You are supervising her sacrifice. Do not add your own.';
const HANDS_ORIGINAL = 'his hands continuing their small, fluid movements beside his tunic';

console.log('\n[1] UNSUPPORTED GROUNDING-ONLY COMPLETION MUST NOT PASS');
{
  // gpt-6.1-sol's actual decision: edit, grounding claimed, NO perception passage offered.
  const r = EBC.cpAssessObligationCompletion({
    finalText: EBC.readerFacing(SOL_FINAL), groundingIds: [ID],
    claims: [{ id: ID, decision: 'edit', perception: null,
      perceptionWhy: 'this edit supplies only the missing physical grounding',
      grounding: SOL_INSERT, groundingBasis: 'scene',
      groundingWhy: 'thick violet hair and a narrow pearl-grey face' }]
  })[0];
  ok(r.grounding.supported === true,
    '1a: the grounding half IS supported — the description is in the finished scene');
  ok(r.perception.supported === false, '1b: the perception half is NOT supported');
  ok(r.complete === false && r.creditable === false,
    '1c: so the obligation is INCOMPLETE and NOT creditable', JSON.stringify(r));
  ok(/no perception passage was claimed/.test(r.why),
    '1d: and the reason names what is missing', r.why);

  // THE DELIVERY RECORD MUST REFUSE THE CREDIT, and must not file the description as the C+.
  const del = EBC.cpEditorDeliveryRecord({ completion: r, decision: 'edit',
    reader: EBC.readerFacing(SOL_FINAL), revisionId: 'r1' });
  ok(del.verification === 'directed',
    '1e: the delivery record stays DIRECTED, so the cadence does not advance', del.verification);
  ok(del.publishedPassage === null && del.perceptionPassage === null,
    '1f: NO Character+ manifestation is recorded — the appearance sentence is not promoted',
    JSON.stringify({ published: del.publishedPassage, perception: del.perceptionPassage }));
  ok(del.groundingPassage === SOL_INSERT,
    '1g: but the grounding passage IS retained, because that work really was done',
    String(del.groundingPassage));
}

console.log('\n[2] GROUNDING PLUS GENUINELY QUALIFYING EXISTING PERCEPTION MAY PASS');
{
  // The same edit, with the perception claim gpt-6.1-sol asserted in prose but never supplied as
  // a passage: the rebuke, which is UNCHANGED prose elsewhere in the scene. New text and
  // untouched prose carrying one finding each is the expected case, and no redundant new
  // characterization is asked for.
  const r = EBC.cpAssessObligationCompletion({
    finalText: EBC.readerFacing(SOL_FINAL), groundingIds: [ID],
    claims: [{ id: ID, decision: 'edit', perception: REBUKE,
      perceptionWhy: 'he judges her conduct to her face and she cannot answer',
      grounding: SOL_INSERT, groundingBasis: 'scene',
      groundingWhy: 'thick violet hair and a narrow pearl-grey face' }]
  })[0];
  ok(r.perception.supported === true && r.grounding.supported === true,
    '2a: both findings are supported — one by untouched prose, one by the new text');
  ok(r.complete === true && r.creditable === true,
    '2b: the obligation is COMPLETE and creditable', JSON.stringify(r));

  const del = EBC.cpEditorDeliveryRecord({ completion: r, decision: 'edit',
    reader: EBC.readerFacing(SOL_FINAL), revisionId: 'r1' });
  ok(del.verification === 'editor_reviewed', '2c: and the delivery record credits it');
  ok(del.perceptionPassage === REBUKE && del.groundingPassage === SOL_INSERT,
    '2d: BOTH supporting passages are retained, each against its own finding',
    JSON.stringify({ p: del.perceptionPassage, g: del.groundingPassage }));
  ok(del.perceptionPassage !== del.groundingPassage,
    '2e: and the description is never standing in for the Character+ manifestation');

  // ══ THE HONEST LIMIT, ASSERTED RATHER THAN ASSUMED ════════════════════════════════════
  // Everything above establishes that the rebuke EXISTS in the finished scene. Whether it is a
  // relationship perception event is a semantic question no quote check can answer, and the
  // records must not imply otherwise.
  ok(r.semanticallyVerified === false && del.semanticallyVerified === false,
    '2f: both records say semanticallyVerified: false — existence is checked, meaning is not');
  ok(/EXISTENCE of the evidence, not a judgment that it is good/.test(r.why),
    '2g: and the assessment says so in its own reason', r.why);
  ok(/their EXISTENCE is verified, their sufficiency is not/.test(del.basis),
    '2h: as does the delivery basis', del.basis);
}

console.log('\n[3] A QUOTE THE EDIT BROKE UP MUST NOT COUNT — BUT NOTHING WAS DELETED');
{
  // STATED PLAINLY, BECAUSE I GOT THIS WRONG TWICE. NEITHER PAID ARM REMOVED ANY CONTENT.
  // Both edits were INSERTIONS: gpt-6.1-sol added a clause inside the Dohkar's introduction and
  // claude-haiku-5-5 added one before his rebuke. The rebuke itself is intact in both finished
  // scenes, and so is his hand movement. My first fixture claimed Sol had overwritten the hands
  // (it had not) and my second described Haiku as having "removed" the rebuke (it had not).
  //
  // WHAT IS ACTUALLY TESTED HERE, which is the property the contract needs: a claim quoting a
  // CONTIGUOUS SPAN that the edit interrupted no longer matches the finished scene, because the
  // reader now receives different words in that position. That is the same mechanism that would
  // reject a genuinely deleted passage, and it is demonstrated on real output rather than on an
  // invented one.
  const SPAN = 'The Dohkar faced me. “You are supervising her sacrifice.';
  ok(EBC.quotePresent(SPAN, EBC.readerFacing(ORIGINAL)) === true,
    '3a: the span read contiguously in the draft both arms were given');
  ok(EBC.quotePresent(SPAN, EBC.readerFacing(HAIKU_FINAL)) === false,
    '3b: the insertion broke it up, so it does not read that way in the finished scene');
  ok(EBC.quotePresent('You are supervising her sacrifice. Do not add your own.',
    EBC.readerFacing(HAIKU_FINAL)) === true,
    '3c: AND THE REBUKE ITSELF IS PRESERVED — nothing was deleted');
  const r = EBC.cpAssessObligationCompletion({
    finalText: EBC.readerFacing(HAIKU_FINAL), groundingIds: [ID],
    claims: [{ id: ID, decision: 'edit', perception: SPAN,
      perceptionWhy: 'he turns on her and names the fault', grounding: HAIKU_INSERT,
      groundingBasis: 'scene', groundingWhy: 'the hands going still' }]
  })[0];
  ok(r.perception.supported === false && r.complete === false,
    '3d: a claim quoting the broken span does NOT count', JSON.stringify(r));
  ok(/no longer contiguous after an edit/.test(r.why), '3e: and the reason says why', r.why);
  // The same claim, quoting the rebuke as it still reads, DOES count — so this rejects stale
  // quotations without rejecting the passage itself.
  const r2 = EBC.cpAssessObligationCompletion({
    finalText: EBC.readerFacing(HAIKU_FINAL), groundingIds: [ID],
    claims: [{ id: ID, decision: 'edit',
      perception: 'You are supervising her sacrifice. Do not add your own.',
      perceptionWhy: 'he names the fault to her face', grounding: HAIKU_INSERT,
      groundingBasis: 'scene', groundingWhy: 'the hands going still' }]
  })[0];
  ok(r2.perception.supported === true,
    '3f: while the surviving passage, quoted as it now reads, DOES count');
  // AND AN INSERTION IS NEVER MISTAKEN FOR A REMOVAL: text an edit added around still counts,
  // which is what lets untouched prose carry a finding.
  ok(EBC.quotePresent(HANDS_ORIGINAL, EBC.readerFacing(SOL_FINAL)) === true,
    '3g: text gpt-6.1-sol inserted AROUND survives verbatim and still counts');
}

console.log('\n[3b] PRIOR-PUBLISHED EVIDENCE IS NOT REQUIRED TO RECUR IN THIS SCENE');
{
  // THE REGRESSION THIS CLOSES. The first version of the completion check tested every
  // grounding quote against the FINISHED SCENE. For basis "prior" that reintroduced the
  // per-scene description quota through the bookkeeping: a familiar character correctly left
  // undescribed would be denied credit BECAUSE the editor rightly did not re-describe them.
  const PRIOR = 'Julian stood with the long black hair pushed back off the jaw';
  const CORPUS = { 'cplus:julian': PRIOR + ', the silver Weave-Script bright along his '
    + 'slate-blue forearm.' };
  const SCENE = 'Julian said nothing, which was its own answer, and let the silence do it.';
  const claims = [{ id: 'cplus:julian', decision: 'keep',
    perception: 'Julian said nothing, which was its own answer',
    perceptionWhy: 'he lets the silence carry it',
    grounding: PRIOR, groundingBasis: 'prior', groundingWhy: 'the long black hair off the jaw' }];
  ok(EBC.quotePresent(PRIOR, SCENE) === false,
    '3b-a: the prior passage is legitimately ABSENT from this scene');
  const withCorpus = EBC.cpAssessObligationCompletion({ finalText: SCENE,
    groundingIds: ['cplus:julian'], claims, groundingCorpus: CORPUS })[0];
  ok(withCorpus.complete === true,
    '3b-b: checked against its person-linked source, the obligation COMPLETES',
    JSON.stringify(withCorpus));
  ok(withCorpus.grounding.verifiedAgainst === 'published_prose',
    '3b-c: and the record says where it was verified', withCorpus.grounding.verifiedAgainst);
  // THE CONTROL: the same claim with no corpus supplied cannot be verified and does not pass.
  const noCorpus = EBC.cpAssessObligationCompletion({ finalText: SCENE,
    groundingIds: ['cplus:julian'], claims })[0];
  ok(noCorpus.complete === false && /cannot be verified against its own source/.test(noCorpus.why),
    '3b-d: with no published prose on hand it is unverifiable, not assumed', noCorpus.why);
  // AND A FABRICATED PRIOR QUOTE STILL FAILS against the corpus that does exist.
  const fake = EBC.cpAssessObligationCompletion({ finalText: SCENE,
    groundingIds: ['cplus:julian'], groundingCorpus: CORPUS,
    claims: [Object.assign({}, claims[0], { grounding: 'Julian, scarred across both cheeks' })]
  })[0];
  ok(fake.complete === false && /NOT in that person's supplied published prose/.test(fake.why),
    '3b-e: a prior quote absent from that corpus is rejected', fake.why);
  // AND THE RECORDING PRESERVES IT: the recorder must not re-check a prior quote against the
  // current scene, which was the second half of the same regression.
  const del = EBC.cpEditorDeliveryRecord({ completion: withCorpus, decision: 'keep',
    reader: SCENE, revisionId: 'r1' });
  ok(del.verification === 'editor_reviewed' && del.groundingPassage === PRIOR,
    '3b-f: and the delivery record credits it, keeping the prior passage', JSON.stringify(del));
  ok(del.groundingVerifiedAgainst === 'published_prose',
    '3b-g: labelled as published prose, so its absence here is never read as a failure');
}

console.log('\n[4] THE TWO FINDINGS STAY SEPARATE — A GROUNDING EDIT STILL APPLIES');
{
  // claude-haiku-5-5's actual decision: edit, recognizable:false, no perception passage. Its
  // prose change is real and was applied; its obligation is not fulfilled by it.
  ok(HAIKU_FINAL.indexOf(HAIKU_INSERT) !== -1,
    '4a: the applied edit IS in the published scene — the prose improvement stands');
  const r = EBC.cpAssessObligationCompletion({
    finalText: EBC.readerFacing(HAIKU_FINAL), groundingIds: [ID],
    claims: [{ id: ID, decision: 'edit', perception: null,
      perceptionWhy: 'the edit makes his hands’ stillness a characterizing action',
      grounding: null, groundingBasis: null, groundingWhy: null }]
  })[0];
  ok(r.complete === false && r.creditable === false,
    '4b: and the obligation is still UNFULFILLED — applied is not fulfilled', JSON.stringify(r));
  ok(r.perception.supported === false && r.grounding.supported === false,
    '4c: with neither finding supported');

  // AN "unknown" GROUNDING BASIS SUPPORTS NOTHING. Uncertainty may leave prose alone; it may
  // never carry the grounding half of a creditable result.
  const u = EBC.cpAssessObligationCompletion({
    finalText: EBC.readerFacing(HAIKU_FINAL), groundingIds: [ID],
    claims: [{ id: ID, decision: 'keep', perception: REBUKE, perceptionWhy: 'he judges her',
      grounding: null, groundingBasis: 'unknown', groundingWhy: 'I cannot tell' }]
  })[0];
  ok(u.perception.supported === true && u.grounding.supported === false && u.complete === false,
    '4d: perception supported + grounding "unknown" is NOT a complete result', JSON.stringify(u));
}

console.log('\n[5] NO REDUNDANT CHARACTERIZATION IS DEMANDED');
{
  // A character the scene already satisfies on both findings completes on UNCHANGED prose alone,
  // with no edit at all. Julian, from the same saved run: his KEEP cited existing social proof
  // and his existing description.
  const JULIAN_PERCEPTION = 'three witnesses turned towards Julian before looking to the Dohkar';
  const JULIAN_GROUNDING = 'His long black hair lay against slate-blue shoulders';
  const r = EBC.cpAssessObligationCompletion({
    finalText: EBC.readerFacing(SOL_FINAL), groundingIds: ['cplus:julian'],
    claims: [{ id: 'cplus:julian', decision: 'keep', perception: JULIAN_PERCEPTION,
      perceptionWhy: 'the witnesses orient to him before the presiding authority',
      grounding: JULIAN_GROUNDING, groundingBasis: 'scene',
      groundingWhy: 'the long black hair against slate-blue shoulders' }]
  })[0];
  ok(r.complete === true && r.decision === 'keep',
    '5a: an untouched character completes on existing prose — no new writing required',
    JSON.stringify(r));
  ok(r.perception.passage !== r.grounding.passage,
    '5b: and the two findings are carried by two different existing passages');
}

console.log('\n[6] THE PASS REPORTS IT, AND AN INCOMPLETE EDIT IS NOT COUNTED AS ANSWERED');
{
  // End to end through the real pass with transport stubbed: a grounding-only edit must APPLY
  // and the obligation must come back in `unresolved`, not as a clean answer.
  // THE PC IS DUE TOO, so she is answered completely in both replies — otherwise her own
  // unanswered obligation would be the reason `unresolved` is populated and this check would
  // prove nothing about the edit under test.
  const DRAFT = [
    'The bell over the door went off a half-beat late.', '',
    'Devrim set the ledger down where I could see the column he meant.', '',
    'I kept my own hands flat on the counter, the ink still under my nails from the morning’s '
      + 'ledger, and did not reach for it.', '',
    'The hallow-keeper read it before I did, and the reading stopped their hand mid-turn.'
  ].join('\n');
  const MIRA_P = 'I kept my own hands flat on the counter';
  const MIRA_G = 'the ink still under my nails from the morning’s ledger';
  const miraDecision = (id) => ({ id: id, decision: 'keep',
    keptPassage: 'I kept my own hands flat on the counter, the ink still under my nails from '
      + 'the morning’s ledger, and did not reach for it',
    why: 'she will not be the one to reach first',
    perception: { passage: MIRA_P, why: 'she holds her hands still rather than reach' },
    grounding: { recognizable: true, basis: 'scene', evidence: MIRA_G,
      why: 'the ink under her nails' } });
  const roster = [{ label: 'Mira', kind: 'pc', isPC: true, participation: 'major' },
    { label: 'Devrim', kind: 'character', participation: 'major' }];
  let ids = null;
  const run = (fn) => EBC.editorPassOnFinalizedDraft({
    draft: DRAFT,
    coveragePlan: EBC.cpCoveragePlan({ issue: 1, ledger: [], attempts: [], sceneOrdinal: 2,
      participants: roster }),
    onStage: roster, skeleton: null, liName: 'Devrim', attempts: [], ledger: [],
    sceneOrdinal: 2, issue: 1, protectedPassages: [], roster,
    owner: { storyId: 'comp', scene: 2, ticket: 't' }, editorFn: fn });

  await run(async (c) => { ids = c.ids; return { dispatched: false, reason: 'captured' }; });
  const ID_D = (ids || []).filter((i) => /devrim/.test(i))[0];
  const ID_M = (ids || []).filter((i) => /mira/.test(i))[0];

  const res = await run(async () => ({ dispatched: true,
    usage: { prompt_tokens: 10, completion_tokens: 5 },
    content: JSON.stringify({ decisions: [
      miraDecision(ID_M),
      { id: ID_D, decision: 'edit', ref: 'P2',
        why: 'grounding only; I cannot point at a perception passage',
        perception: { passage: null, why: 'none available' },
        grounding: { recognizable: true, basis: 'scene',
          evidence: 'one scarred thumb flat on the figure', why: 'the scarred thumb' } }
    // ADDITIVE OP (Roman 2026-11-06): was a `replace`, which the Character+ craft pass no
    // longer offers. It was already additive — it re-emitted P2 verbatim and appended the
    // clause — so it is now the anchored insertion it was in substance. §6 still asks whether
    // a grounding-only edit APPLIES while its obligation stays unresolved.
    ], edits: [{ ref: 'P2', op: 'insert_at_anchor', forObligations: [ID_D],
      anchor: 'Devrim set the ledger down where I could see the column he meant.',
      text: 'He left one scarred thumb flat on the figure.' }] }) }));

  ok((res.applied || []).length === 1 && /scarred thumb/.test(res.text || ''),
    '6a: the grounding edit IS applied — the improvement reaches the reader',
    JSON.stringify(res.rejected));
  const comp = (res.completion || []).filter((c) => c.id === ID_D)[0] || null;
  ok(!!comp && comp.grounding.supported === true && comp.perception.supported === false,
    '6b: the pass reports grounding supported and perception unsupported',
    JSON.stringify(res.completion));
  ok(!!comp && comp.complete === false,
    '6c: so the obligation is not complete');
  ok(!!res.unresolved && (res.unresolved.obligations || []).indexOf(ID_D) !== -1,
    '6d: and it is reported UNRESOLVED despite the applied edit',
    JSON.stringify(res.unresolved));
  ok(/the prose improvement stands, the obligation does not/.test(res.unresolved.why),
    '6e: the pass says exactly that', res.unresolved.why);

  // AND THE COMPLETE CASE, through the same pass: both findings quoted from the finished scene.
  const res2 = await run(async () => ({ dispatched: true,
    usage: { prompt_tokens: 10, completion_tokens: 5 },
    content: JSON.stringify({ decisions: [
      miraDecision(ID_M),
      // THE TWO FINDINGS CARRIED BY TWO PARTS OF ONE PARAGRAPH: the perception is prose the
      // edit PRESERVED, the grounding is the clause it ADDED. This is the "unchanged and edited
      // prose working together" case, and it asks for no redundant characterization.
      { id: ID_D, decision: 'edit', ref: 'P2',
        why: 'his grounding is added; his perception is already on the page',
        perception: { passage: 'Devrim set the ledger down where I could see the column he meant',
          why: 'he set it where it could be read before anyone asked' },
        grounding: { recognizable: true, basis: 'scene',
          evidence: 'one scarred thumb flat on the figure', why: 'the scarred thumb' } }
    // ADDITIVE OP (Roman 2026-11-06): as above. This case is the stronger one for the change —
    // it is explicitly "untouched prose plus the new text carrying the two findings between
    // them", and an anchored insertion is exactly that arrangement: the perception passage is
    // prose the edit cannot touch, and the grounding passage is the sentence it adds.
    ], edits: [{ ref: 'P2', op: 'insert_at_anchor', forObligations: [ID_D],
      anchor: 'Devrim set the ledger down where I could see the column he meant.',
      text: 'He left one scarred thumb flat on the figure.' }] }) }));
  const comp2 = (res2.completion || []).filter((c) => c.id === ID_D)[0] || null;
  ok(!!comp2 && comp2.complete === true,
    '6f: and a supported pair COMPLETES — untouched prose plus the new text',
    JSON.stringify(res2.completion));
  ok(!res2.unresolved, '6g: with nothing left unresolved', JSON.stringify(res2.unresolved));
}

console.log('\n' + (fails.length ? 'FAIL' : 'PASS') + '  ' + pass + ' checks, '
  + fails.length + ' failed');
for (const f of fails) console.log('  FAILED: ' + f);
console.log('\nWHAT THESE CHECKS DO NOT ESTABLISH: that any quoted passage actually satisfies');
console.log('Character+. Every one of them tests that evidence EXISTS in the finished scene.');
console.log('Whether "You are supervising her sacrifice" is a relationship perception event is a');
console.log('reading, not a check — which is why every record says semanticallyVerified: false.');
process.exit(fails.length ? 1 : 0);
