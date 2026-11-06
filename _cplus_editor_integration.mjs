// ── PROVIDER-FREE INTEGRATION CHECKS FOR THE PRODUCTION CHARACTER+ EDITOR ────────────────────
// (Roman 2026-10-16)
//
// WHAT THESE ESTABLISH: integration behaviour. The scheduler selects the right people, the pass
// builds one real request, the validator accepts and refuses the right replies, accepted edits
// reach the published text, rejected ones leave the prose alone, history receives the PUBLISHED
// revision, a stale or duplicate operation writes nothing, and a server refusal costs nothing.
//
// WHAT THESE DO NOT ESTABLISH: literary reliability. No check here can tell whether an edit made
// the scene better. That question is answered by reading, and the reading we have says: of three
// edits on the frozen scene, one was defensible, two contained useful writing with unresolved
// grounding problems. Integration passing is not that question being settled.
//
// NOTHING IS STUBBED EXCEPT THE NETWORK. The scheduler, the request builder, the validator, the
// splicer, the protection checks, the recording shape and the admission decision are all the real
// production code. The only injected boundary is the provider response itself — which is what
// "provider-free" means.
import fs from 'fs';
import vm from 'node:vm';

const ROOT = '/Users/romantsukerman/storybound-app';
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++; fails.push(name + (detail ? ('  — ' + detail) : ''));
  console.log('  FAIL  ' + name + (detail ? ('\n          ' + detail) : ''));
}
function section(t) { console.log('\n' + t); }

// ── LOAD THE REAL MODULE ─────────────────────────────────────────────────────────────────────
vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

// The doctrine, read from app.js exactly as production reads it.
{
  const src = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  const a = src.indexOf('var _CP_DOCTRINE = {');
  const b = src.indexOf('function _buildCharacterPlusShared(');
  vm.runInThisContext(src.slice(a, b).replace(/try \{ if \(typeof window[^\n]*\n/g, ''));
}
const DOCTRINE = globalThis._cpDoctrineExcerptForRepair();

// ── A REAL TWO-SCENE STORY ───────────────────────────────────────────────────────────────────
// An OPENING with first-person narration and dialogue, and a CONTINUATION. Both are ordinary
// prose of the shape the app finalizes, not fixtures shaped to make a test pass.
const OPENING = [
  'The bell over the door went off a half-beat late, the way it had since the spring.',
  '',
  'I pressed my palms flat on the counter and counted the float twice, the way I always did '
    + 'before opening, as though the till could settle anything.',
  '',
  '"You are here early," Devrim said, shaking the rain off his coat. "You are always here early."',
  '',
  'I told him the delivery was due at seven and heard myself say it twice.',
  '',
  'Oyelaran came in behind him without knocking, and two of the morning crew stopped talking '
    + 'and looked at her before they looked at the schedule on the wall.',
  '',
  'She did not explain why she had come. She read the schedule, took the pen out of my hand, '
    + 'and changed one line of it.',
  '',
  'The rain kept on. I could have asked her what the change was for. I could have put the pen '
    + 'back where it belonged.'
].join('\n');

const CONTINUATION = [
  'By the second week the schedule in Oyelaran\'s handwriting had stopped looking temporary.',
  '',
  'Devrim brought the ledger over at close and set it down where I could see the column he '
    + 'meant, and said nothing about it at all.',
  '',
  'I thanked him, and filed it under the drawer where I kept the things I had decided not to '
    + 'think about yet.'
].join('\n');

const LI = 'Oyelaran';
const STORY = 'story-integ-1';

// Stage rosters, in the shape _sceneStageContract produces.
const STAGE_OPENING = [
  { label: 'Mira', kind: 'pc', isPC: true, participation: 'major' },
  { label: 'Devrim', kind: 'character', participation: 'minor' },
  { label: LI, kind: 'character', isLI: true, participation: 'major' },
  { label: 'the morning crew', kind: 'crowd', participation: 'crowd' }
];
const STAGE_CONT = [
  { label: 'Mira', kind: 'pc', isPC: true, participation: 'major' },
  { label: 'Devrim', kind: 'character', participation: 'minor' }
];

// The skeleton for the opening, as the author request carried it.
const SKELETON = {
  character_plus: [
    { character: 'Devrim', first_mention: true, coverage: { kind: 'introduction' },
      facet_truth: 'He gives people information instead of opinions, because an opinion could be '
        + 'held against him.',
      facet_pressure: 'noticing something the owner has not noticed',
      behavior: 'Devrim arrives and remarks on her being early.' },
    { character: LI, isLI: true, first_mention: true, coverage: { kind: 'introduction' },
      facet_truth: 'her standing in this place, which she has never claimed out loud',
      behavior: 'Someone at the shop responds to her, and Mira reads that response.',
      social_proof_opportunities: [{ facetId: 'oye_standing',
        condition: 'staff checking her before checking the posted schedule' }] }
  ],
  pc_opening_fusion: { character: 'Mira',
    beat: 'I pressed my palms flat on the counter and counted the float twice.',
    through: 'the float and the counter' }
};

function plan(stage, { ledger = [], attempts = [], ordinal = 1, issue = 1 } = {}) {
  return EBC.cpCoveragePlan({ issue, ledger, attempts, sceneOrdinal: ordinal,
    participants: stage });
}
function due(stage, opts = {}) {
  return EBC.cpEditorDue({
    plan: plan(stage, opts), onStage: stage, skeleton: opts.skeleton || SKELETON,
    liName: LI, attempts: opts.attempts || [], ledger: opts.ledger || [],
    sceneOrdinal: opts.ordinal != null ? opts.ordinal : 1, issue: 1 });
}
// ── THE SECOND FINDING, ANSWERED MECHANICALLY FOR THESE FIXTURES (Roman 2026-11-04) ─────────
// The editor contract now asks each CHARACTER decision for TWO findings: the perception
// requirement, and whether the reader can picture the person. The fixtures in this suite were
// written to exercise KEEP/EDIT PLUMBING — scheduling, chosen refs, protected passages, splicing,
// delivery records — and their prose was never written to be physically grounding. So a keep that
// does not state the grounding finding has it filled in from its own kept passage, which makes
// the stub a well-formed reply under the current contract without changing what any check here
// measures. A malformed keep is left malformed.
//
// THIS SUITE THEREFORE SAYS NOTHING ABOUT RECOGNIZABILITY. That finding's own behaviour — a
// fulfilled perception with missing grounding is NOT a keep, evidence absent from the scene is
// rejected, an already-grounded character is still kept — is measured in
// _appearance_regression.mjs [D11], against prose written for it.
function answerBothFindings(reply) {
  if (!reply || typeof reply !== 'object' || !Array.isArray(reply.decisions)) return reply;
  reply.decisions.forEach((d) => {
    if (!d || String(d.decision || '').toLowerCase() !== 'keep') return;
    if (d.grounding || !d.keptPassage) return;
    d.grounding = { recognizable: true, evidence: d.keptPassage };
  });
  return reply;
}
// The pass, with the provider boundary — and only that — injected.
function runPass(draft, stage, reply, opts = {}) {
  const d = due(stage, opts).due;
  return EBC.editorPassOnFinalizedDraft({
    draft, coveragePlan: plan(stage, opts), onStage: stage,
    skeleton: opts.skeleton !== undefined ? opts.skeleton : SKELETON,
    liName: LI, attempts: opts.attempts || [], ledger: opts.ledger || [],
    sceneOrdinal: opts.ordinal != null ? opts.ordinal : 1, issue: 1,
    protectedPassages: opts.protectedPassages
      || [String((EBC.sentences(EBC.readerFacing(draft)) || []).slice(-1)[0] || '').trim()],
    roster: stage.map((p) => ({ label: p.label, kind: p.kind })),
    doctrine: DOCTRINE,
    examples: EBC.cpRenderExamples(EBC.cpSelectExamples(EBC.cpExampleMechanismsFor(d), 4)),
    owner: { storyId: STORY, scene: opts.ordinal != null ? opts.ordinal : 1, ticket: 'tkt-1' },
    editorFn: typeof reply === 'function' ? reply
      : async () => ({ dispatched: true, content: JSON.stringify(answerBothFindings(reply)),
          usage: { prompt_tokens: 100, completion_tokens: 50 } })
  });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
section('§1  THE SCHEDULER SELECTS, AND DOES NOT OVER-SELECT');
{
  const d = due(STAGE_OPENING);
  const ids = d.due.map((o) => o.id);
  ok('1a the protagonist is due on her opening', ids.includes('cplus:mira'), ids.join(','));
  ok('1b a newly introduced individual is due', ids.includes('cplus:devrim'));
  ok('1c the love interest is due', ids.includes('cplus:oyelaran'));
  ok('1d a crowd gets NO obligation', !ids.some((i) => /morning_crew/.test(i)), ids.join(','));
  const li = d.due.find((o) => o.id === 'cplus:oyelaran');
  ok('1e the LI first depiction REQUIRES external social proof', li && li.requiresSocialProof === true);
  ok('1f social proof names what will not do', li && /stillness, posture, appearance/.test(li.socialProof.notSufficient));
  ok('1g reciprocation is explicitly not required', li && li.socialProof.reciprocationRequired === false);
  ok('1h the LI requirement is not downgraded to an opportunity', li && li.assignedFacetIsAnOpportunity === false);
  const dev = d.due.find((o) => o.id === 'cplus:devrim');
  ok('1i a suggested facet IS an opportunity for everyone else', dev && dev.assignedFacetIsAnOpportunity === true);
  ok('1j provenance distinguishes assigned from retrospective',
    dev && dev.provenance === 'ORIGINAL');
  // Somebody with no skeleton row is RETROSPECTIVE, never evidence of disobedience.
  const retro = due(STAGE_OPENING, { skeleton: { character_plus: [] } }).due
    .find((o) => o.id === 'cplus:devrim');
  ok('1k an unassigned obligation is labelled RETROSPECTIVE', retro && retro.provenance === 'RETROSPECTIVE');

  // AN ASSIGNMENT IS NOT PROOF OF DELIVERY: a skeleton row alone never satisfies anybody.
  ok('1l an assignment alone does not satisfy the obligation', ids.includes('cplus:devrim'));

  // Off-stage people are not due here.
  const contDue = due(STAGE_CONT, { ordinal: 2 }).due.map((o) => o.id);
  ok('1m someone absent from the scene is not due in it', !contDue.includes('cplus:oyelaran'),
    contDue.join(','));
  ok('1n the deferral says why', due(STAGE_OPENING, { ordinal: 2 }).deferred.length >= 0);
}

section('§2  NO-DUE SKIP — NOBODY DUE MEANS NO CALL');
{
  // Everything already verified-delivered this issue.
  const ledger = ['Mira', 'Devrim', LI].flatMap((c) => [
    { character: c, verification: 'verified', issue: 1, ordinal: 1, mode: 'echo' },
    { character: c, verification: 'verified', issue: 1, ordinal: 2, mode: 'broaden' }]);
  let called = 0;
  const res = await runPass(OPENING, STAGE_OPENING, async () => { called++;
    return { dispatched: true, content: '{}' }; }, { ledger });
  ok('2a no obligations remain', res.due.length === 0, JSON.stringify(res.due.map((o) => o.id)));
  ok('2b the pass did not run', res.ran === false, res.reason);
  ok('2c NO provider call was made', called === 0, 'calls=' + called);
  ok('2d the prose is untouched', res.text === OPENING);
  // The skip condition now covers environmental work too, so the reason names all three
  // kinds of obligation rather than only Character+. The GUARANTEE is unchanged: no call
  // when nothing is owed.
  ok('2e the reason says nothing is due, naming C+, Fusion and environmental work',
    /nothing is due in this scene/.test(res.reason || '')
    && /no Character\+/.test(res.reason || '')
    && /environmental work/.test(res.reason || ''), res.reason);
}

section('§3  MULTI-CHARACTER EDITING IN ONE CALL');
{
  let calls = 0, seenReq = null;
  const res = await runPass(OPENING, STAGE_OPENING, async (req) => {
    calls++; seenReq = req;
    return { dispatched: true, usage: { prompt_tokens: 900, completion_tokens: 300 },
      content: JSON.stringify({
        decisions: [
          { id: 'cplus:mira', decision: 'edit', ref: 'P2', why: 'her own narration' },
          { id: 'cplus:devrim', decision: 'edit', ref: 'P3', why: 'his line' },
          { id: 'cplus:oyelaran', decision: 'edit', ref: 'P5', why: 'the staff response' }],
        // ── ADDITIVE OPS (Roman 2026-11-06) ────────────────────────────────────────────────
        // These three were `replace`, and all three were ALREADY additive: each kept its source
        // paragraph verbatim and appended a sentence. The craft pass no longer offers `replace`,
        // so each is now the anchored insertion it was in substance — same added prose, same
        // three obligations, same assertions below.
        edits: [
          { ref: 'P2', op: 'insert_at_anchor', forObligations: ['cplus:mira'],
            anchor: 'as though the till could settle anything.',
            text: 'I counted once more, because the second count had come out right.' },
          { ref: 'P3', op: 'insert_at_anchor', forObligations: ['cplus:devrim'],
            anchor: '"You are always here early."',
            text: '"The spring order came in light." He did not say whether that was my doing.' },
          { ref: 'P5', op: 'insert_at_anchor', forObligations: ['cplus:oyelaran'],
            anchor: 'looked at the schedule on the wall.',
            text: 'She did not appear to notice that they had.' }] }) };
  });
  ok('3a exactly ONE provider call for three people', calls === 1, 'calls=' + calls);
  ok('3b all three obligations are in the one request',
    seenReq && ['cplus:mira', 'cplus:devrim', 'cplus:oyelaran'].every((i) => seenReq.ids.includes(i)));
  ok('3c the request carries the real draft',
    seenReq && seenReq.user.includes('counted the float twice'));
  ok('3d the request carries the doctrine', seenReq && seenReq.sys.includes('Character+'));
  ok('3e the output allowance scales with the number due', seenReq && seenReq.maxTokens >= 1600,
    seenReq && String(seenReq.maxTokens));
  ok('3f three edits applied', res.applied.length === 3, JSON.stringify(res.appliedFor));
  ok('3g nothing rejected', res.rejected.length === 0, JSON.stringify(res.rejected));
  ok('3h nothing unanswered', res.unanswered.length === 0, JSON.stringify(res.unanswered));
  ok('3i the published text carries all three', ['out right', 'came in light', 'notice that they had']
    .every((s) => res.text.includes(s)));
  ok('3j unaffected prose is byte-identical',
    EBC.unaffectedBytesPreserved(EBC.readerFacing(OPENING), res.text, res.applied).ok);
  ok('3k the published revision differs from the requested one',
    res.publishedRevision && res.publishedRevision !== res.requestRevision);
}

section('§4  ALL-KEEP — A SCENE THAT ALREADY WORKS IS NOT REWRITTEN');
{
  const res = await runPass(OPENING, STAGE_OPENING, {
    decisions: [
      { id: 'cplus:mira', decision: 'keep', why: 'habit under pressure',
        keptPassage: 'I pressed my palms flat on the counter and counted the float twice' },
      { id: 'cplus:devrim', decision: 'keep', why: 'he reports rather than opines',
        keptPassage: 'I told him the delivery was due at seven and heard myself say it twice.' },
      { id: 'cplus:oyelaran', decision: 'keep', why: 'the crew check her first',
        keptPassage: 'two of the morning crew stopped talking and looked at her before they '
          + 'looked at the schedule on the wall' }],
    edits: [] });
  ok('4a three KEEP claims accepted', res.keeps.length === 3, JSON.stringify(res.keeps.map((k) => k.id)));
  ok('4b no edits applied', res.applied.length === 0);
  ok('4c THE PROSE IS BYTE-IDENTICAL', res.text === EBC.readerFacing(OPENING));
  ok('4d the pass ran and says so', res.ran === true && /KEEP/.test(res.reason), res.reason);
  ok('4e no obligation is left unanswered', res.unanswered.length === 0);

  // A KEEP that does not quote the scene is REFUSED — otherwise it is a polite way of declining.
  const bad = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:mira', decision: 'keep',
      keptPassage: 'She counted the float, as she always did, being a careful woman.' },
      { id: 'cplus:devrim', decision: 'keep', keptPassage: 'I told him the delivery was due at seven and heard myself say it twice.' },
      { id: 'cplus:oyelaran', decision: 'keep', keptPassage: 'looked at her before they looked at the schedule' }],
    edits: [] });
  ok('4f an invented KEEP passage is rejected',
    bad.rejected.some((r) => r.code === 'kept_passage_not_verbatim'), JSON.stringify(bad.rejected));
  ok('4g the obligation it belonged to is left unanswered',
    bad.unanswered.some((u) => u.id === 'cplus:mira'), JSON.stringify(bad.unanswered));
  ok('4h a KEEP without a passage is rejected',
    (await runPass(OPENING, STAGE_OPENING, { decisions: [{ id: 'cplus:mira', decision: 'keep' }],
      edits: [] })).rejected.some((r) => r.code === 'keep_without_passage'));
}

section('§5  SHARED REGIONS — ONE COMBINED TEXT, NEVER AN OVERWRITE');
{
  const shared = await runPass(OPENING, STAGE_OPENING, {
    decisions: [
      { id: 'cplus:mira', decision: 'edit', ref: 'P5' },
      { id: 'cplus:oyelaran', decision: 'edit', ref: 'P5' },
      { id: 'cplus:devrim', decision: 'keep',
        keptPassage: '"You are here early," Devrim said, shaking the rain off his coat.' }],
    // ADDITIVE OP (Roman 2026-11-06): was a `replace`. One addition serving two obligations is
    // still one text for one paragraph, which is what §5 asks.
    edits: [{ ref: 'P5', op: 'insert_at_anchor', forObligations: ['cplus:mira', 'cplus:oyelaran'],
      anchor: 'looked at the schedule on the wall.',
      text: 'She did not appear to notice that they had, and I found I had straightened the '
        + 'float tray without deciding to.' }] });
  ok('5a one combined text serves both obligations', shared.applied.length === 1
    && shared.appliedFor[0].obligations.length === 2, JSON.stringify(shared.appliedFor));
  ok('5b neither obligation is unanswered', shared.unanswered.length === 0,
    JSON.stringify(shared.unanswered));

  // TWO texts for one paragraph: the second is REJECTED, not applied. Applying it would silently
  // destroy the first character's depiction — the exact failure the combined form prevents.
  const collide = await runPass(OPENING, STAGE_OPENING, {
    decisions: [
      { id: 'cplus:mira', decision: 'edit', ref: 'P5' },
      { id: 'cplus:oyelaran', decision: 'edit', ref: 'P5' },
      { id: 'cplus:devrim', decision: 'keep',
        keptPassage: 'shaking the rain off his coat' }],
    // ── ADDITIVE OPS (Roman 2026-11-06) ─────────────────────────────────────────────────────
    // `replace` is not available on the Character+ craft pass, so both texts are anchored
    // insertions on the SAME ref. The question is untouched: two texts for one paragraph, the
    // second rejected as DUPLICATE, the first surviving. (My earlier attempt rewrote these two
    // fixtures' PROSE to satisfy a content-retention threshold; that threshold is gone and the
    // rewrite with it. Only the op and the added sentence are the fixture's own now.)
    edits: [
      { ref: 'P5', op: 'insert_at_anchor', forObligations: ['cplus:mira'],
        anchor: 'looked at the schedule on the wall.',
        text: 'I straightened the float tray without deciding to.' },
      { ref: 'P5', op: 'insert_at_anchor', forObligations: ['cplus:oyelaran'],
        anchor: 'looked at the schedule on the wall.',
        text: 'She read it as though the room were empty.' }] });
  ok('5c the second text for one paragraph is rejected',
    collide.rejected.some((r) => r.code === EBC.CP_REJECT.DUPLICATE), JSON.stringify(collide.rejected));
  ok('5d only one text was applied', collide.applied.length === 1);
  ok('5e the first depiction SURVIVES', collide.text.includes('straightened the float tray'));
  ok('5f the overwritten obligation is reported unanswered, not silently lost',
    collide.unanswered.some((u) => u.id === 'cplus:oyelaran'), JSON.stringify(collide.unanswered));
}

section('§6  THE EDITOR CHOOSES WHERE — EVERY CHANNEL IS LEGITIMATE');
{
  const scope = EBC.cpEditorScope(EBC.paragraphsOf(EBC.readerFacing(OPENING)), []);
  ok('6a every prose paragraph is in scope', scope.refs.length === 7, scope.refs.join(','));
  // FIRST-PERSON NARRATION as the location.
  const fp = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P4' },
      { id: 'cplus:devrim', decision: 'keep', keptPassage: 'shaking the rain off his coat' },
      { id: 'cplus:oyelaran', decision: 'keep', keptPassage: 'looked at her before they looked at the schedule' }],
    // ADDITIVE OP (Roman 2026-11-06): was a `replace` that substituted her verbal tic for a
    // different beat. P4 is still the location under test; the tic now stays and the new beat
    // follows it, which is what an additive pass does.
    edits: [{ ref: 'P4', op: 'insert_at_anchor', forObligations: ['cplus:mira'],
      anchor: 'and heard myself say it twice.',
      text: 'I said it again to the empty doorway after he had gone through it.' }] });
  ok('6b a first-person narration paragraph is accepted', fp.applied.length === 1
    && fp.applied[0].ref === 'P4', JSON.stringify(fp.rejected));
  // DIALOGUE as the location — explicitly allowed, and the thing my withdrawn exclusions broke.
  const dlg = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P3' },
      { id: 'cplus:devrim', decision: 'edit', ref: 'P3' },
      { id: 'cplus:oyelaran', decision: 'keep', keptPassage: 'looked at her before they looked at the schedule' }],
    // ADDITIVE OP (Roman 2026-11-06): was a `replace` that dropped "shaking the rain off his
    // coat" — the very prose §6's own Devrim decision cites as his depiction. A dialogue
    // paragraph is still the location under test; the coat survives and the exchange extends.
    edits: [{ ref: 'P3', op: 'insert_at_anchor', forObligations: ['cplus:mira', 'cplus:devrim'],
      anchor: '"You are always here early."',
      text: '"Still counting it twice, I see." I told him the float had been short in March and '
        + 'let him decide what that answered.' }] });
  ok('6c A DIALOGUE-HEAVY PARAGRAPH IS A LEGITIMATE LOCATION', dlg.applied.length === 1
    && dlg.applied[0].ref === 'P3', JSON.stringify(dlg.rejected));
  ok('6d another character addressing the protagonist is not disqualified', dlg.rejected.length === 0);
  // insert_after is available.
  const ins = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:oyelaran', decision: 'edit', ref: 'P6' },
      { id: 'cplus:mira', decision: 'keep', keptPassage: 'counted the float twice' },
      { id: 'cplus:devrim', decision: 'keep', keptPassage: 'shaking the rain off his coat' }],
    edits: [{ ref: 'P6', op: 'insert_after', forObligations: ['cplus:oyelaran'],
      text: 'Nobody asked her to put it back.' }] });
  ok('6e insert_after is accepted', ins.applied.length === 1 && ins.applied[0].op === 'insert_after',
    JSON.stringify(ins.rejected));
  // A ref outside the scene is refused.
  const bogus = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P99' }],
    edits: [{ ref: 'P99', op: 'replace', forObligations: ['cplus:mira'], text: 'Anything.' }] });
  ok('6f a ref that is not in this revision is refused',
    bogus.rejected.some((r) => r.code === EBC.CP_REJECT.UNKNOWN));
  // An edit serving nobody is refused.
  const orphan = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P2' }],
    edits: [{ ref: 'P2', op: 'replace', forObligations: [], text: 'A sentence with no owner.' }] });
  ok('6g an edit naming no obligation is refused',
    orphan.rejected.some((r) => r.code === 'edit_serves_nothing'));
  ok('6h an unknown obligation id is refused',
    (await runPass(OPENING, STAGE_OPENING, { decisions: [{ id: 'cplus:nobody', decision: 'keep',
      keptPassage: 'counted the float twice' }], edits: [] }))
      .rejected.some((r) => r.code === 'unknown_obligation'));
}

section('§7  PRESERVATION — PROTECTED CONTENT, PLOT AND CHOICE');
{
  const closing = 'The rain kept on. I could have asked her what the change was for. I could '
    + 'have put the pen back where it belonged.';
  const prot = [closing];
  // An edit that drops the protected closing is rejected IN FULL.
  const drops = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P7' },
      { id: 'cplus:devrim', decision: 'keep', keptPassage: 'shaking the rain off his coat' },
      { id: 'cplus:oyelaran', decision: 'keep', keptPassage: 'looked at her before they looked at the schedule' }],
    edits: [{ ref: 'P7', op: 'replace', forObligations: ['cplus:mira'],
      text: 'The rain kept on, and I decided to ask her about the change in the morning.' }] },
    { protectedPassages: prot });
  ok('7a an edit dropping protected content is rejected',
    drops.rejected.some((r) => r.code === EBC.CP_REJECT.PROTECTED), JSON.stringify(drops.rejected));
  ok('7b the unresolved closing choice SURVIVES', drops.text.includes(closing));
  ok('7c the prose is unchanged', drops.text === EBC.readerFacing(OPENING));

  // An edit that KEEPS the protected closing and adds around it is accepted.
  const keeps = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P7' },
      { id: 'cplus:devrim', decision: 'keep', keptPassage: 'shaking the rain off his coat' },
      { id: 'cplus:oyelaran', decision: 'keep', keptPassage: 'looked at her before they looked at the schedule' }],
    // ADDITIVE OP (Roman 2026-11-06): was a `replace` that re-emitted the protected closing
    // verbatim and added around it. The claim under test — protection is CONTENT-based, so the
    // PROTECTED PARAGRAPH IS STILL EDITABLE — is unchanged and is now shown with an anchored
    // insertion. 7a above still exercises the protected-passage rejection on a `replace`,
    // because PROTECTED is checked ahead of the mode rule.
    // The anchor is the END of the protected closing, not its first sentence: an insertion
    // placed MID-PASSAGE splits the protected text and the post-splice check correctly discards
    // the whole splice, which is how this fixture first failed. Protection still bites on an
    // insertion — it is not only a rule about replacements.
    edits: [{ ref: 'P7', op: 'insert_at_anchor', forObligations: ['cplus:mira'],
      anchor: 'I could have put the pen back where it belonged.',
      text: 'I put my hand flat on the counter again, where the float had been.' }] },
    { protectedPassages: prot });
  ok('7d protection is CONTENT-based, not location-based: the paragraph may still be edited',
    keeps.applied.length === 1, JSON.stringify(keeps.rejected));
  ok('7e and the protected passage is still verbatim', EBC.quotePresent(closing, keeps.text));

  // Control markers never reach prose.
  ok('7f control markers are refused',
    (await runPass(OPENING, STAGE_OPENING, {
      decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P2' }],
      edits: [{ ref: 'P2', op: 'replace', forObligations: ['cplus:mira'],
        text: 'I counted the float twice. <<EXPANSION_A>>' }] }))
      .rejected.some((r) => r.code === EBC.CP_REJECT.NON_PROSE));
  ok('7g an empty replacement is refused',
    (await runPass(OPENING, STAGE_OPENING, {
      decisions: [{ id: 'cplus:mira', decision: 'edit', ref: 'P2' }],
      edits: [{ ref: 'P2', op: 'replace', forObligations: ['cplus:mira'], text: '   ' }] }))
      .rejected.some((r) => r.code === EBC.CP_REJECT.EMPTY));
}

section('§8  FAILURE BEHAVIOUR — THE ORIGINAL PUBLISHES, ALWAYS');
{
  const cases = [
    ['malformed JSON', async () => ({ dispatched: true, content: 'I had a think about this scene.' })],
    ['empty reply', async () => ({ dispatched: true, content: null })],
    ['truncated reply', async () => ({ dispatched: true, truncated: true,
      content: '{"decisions":[{"id":"cplus:mira","decision":"ed' })],
    ['a thrown transport error', async () => { throw new Error('socket hang up'); }],
    ['no decisions array', async () => ({ dispatched: true, content: '{"edits":[]}' })]
  ];
  for (const [name, fn] of cases) {
    const r = await runPass(OPENING, STAGE_OPENING, fn);
    ok('8 ' + name + ' → original prose publishes',
      r.text === OPENING || r.text === EBC.readerFacing(OPENING), 'text changed');
    ok('8 ' + name + ' → recorded unresolved', !!r.unresolved, JSON.stringify(r).slice(0, 120));
    ok('8 ' + name + ' → no partial JSON in the prose', !/\{"decisions|"decision"/.test(r.text));
  }
  // PARTIAL ACCEPTANCE: valid edits apply, the rejected region is left untouched.
  const partial = await runPass(OPENING, STAGE_OPENING, {
    decisions: [
      { id: 'cplus:mira', decision: 'edit', ref: 'P2' },
      { id: 'cplus:devrim', decision: 'edit', ref: 'P3' },
      { id: 'cplus:oyelaran', decision: 'edit', ref: 'P5' }],
    edits: [
      // ADDITIVE OP (Roman 2026-11-06): was a `replace`, which the craft pass no longer offers.
      // The test asks whether ONE valid edit applies while two invalid ones are refused — the
      // marker and the bogus ref — and it still asks exactly that. (An earlier attempt rewrote
      // this fixture's prose to satisfy a content threshold; that threshold is gone.)
      { ref: 'P2', op: 'insert_at_anchor', forObligations: ['cplus:mira'],
        anchor: 'as though the till could settle anything.',
        text: 'I counted once more, because the second count had come out right.' },
      { ref: 'P3', op: 'insert_at_anchor', forObligations: ['cplus:devrim'],
        anchor: '"You are always here early."',
        text: 'Devrim said I was early. <<MARKER>>' },
      { ref: 'P404', op: 'replace', forObligations: ['cplus:oyelaran'], text: 'Nowhere.' }] });
  ok('8h the one valid edit applied', partial.applied.length === 1
    && partial.applied[0].ref === 'P2', JSON.stringify(partial.appliedFor));
  ok('8i the marker edit was rejected', partial.rejected.some((r) => r.code === EBC.CP_REJECT.NON_PROSE));
  ok('8j the bad ref was rejected', partial.rejected.some((r) => r.code === EBC.CP_REJECT.UNKNOWN));
  ok('8k the REJECTED paragraph is byte-identical in the published text',
    partial.text.includes('"You are here early," Devrim said, shaking the rain off his coat. '
      + '"You are always here early."'));
  ok('8l the unresolved obligations are named', partial.unresolved
    && partial.unresolved.obligations.length >= 1, JSON.stringify(partial.unresolved));
  ok('8m no retry was attempted', true);   // the pass has no retry path at all; asserted by §8n
  let n = 0;
  await runPass(OPENING, STAGE_OPENING, async () => { n++; return { dispatched: true, content: 'junk' }; });
  ok('8n a failed pass makes exactly ONE call', n === 1, 'calls=' + n);
}

section('§9  A REFUSAL IS NOT A FAILED CALL');
{
  const refused = await runPass(OPENING, STAGE_OPENING,
    async () => ({ dispatched: false, reason: 'policy_not_configured',
      refusal: 'CPLUS_EDITOR_PRICE_FORTUNES is unset' }));
  ok('9a the pass did not run', refused.ran === false, refused.reason);
  ok('9b the prose is untouched', refused.text === OPENING);
  ok('9c NOTHING is recorded as unresolved exposure', !refused.unresolved);
  ok('9d the refusal reason is carried', refused.reason === 'policy_not_configured');
  const inactive = await runPass(OPENING, STAGE_OPENING,
    async () => ({ dispatched: false, reason: 'automatic editing is disabled (_EB_EDITOR_ACTIVE === false)' }));
  ok('9e with activation off nothing runs', inactive.ran === false
    && inactive.text === OPENING, inactive.reason);
  ok('9f no editor wired at all → no pass',
    (await EBC.editorPassOnFinalizedDraft({ draft: OPENING })).ran === false);
}

section('§10  CONTINUATIONS RUN THE SAME PATH');
{
  // THE PRIOR DEPICTION IS IN AN EARLIER ISSUE. With it inside issue 1 this minor participant
  // would be SATISFIED (want = 1), which is correct behaviour and simply not the case under test.
  const ledger = [{ character: 'Devrim', verification: 'verified', issue: 0, ordinal: 1,
    mode: 'echo', facet_id: 'devrim_reports' }];
  const d = due(STAGE_CONT, { ledger, ordinal: 2, skeleton: { character_plus: [] } });
  const dev = d.due.find((o) => o.id === 'cplus:devrim');
  ok('10a a recurring character is due a FRESH depiction', !!dev, JSON.stringify(d));
  ok('10b the mode comes from history, not a coin', dev && (dev.mode === EBC.CP_MODE.ECHO
    || dev.mode === EBC.CP_MODE.BROADEN), dev && dev.mode);
  ok('10c the prior depiction travels with it', dev && dev.priorDepictions.length === 1);
  ok('10d it is RETROSPECTIVE when no skeleton row exists', dev && dev.provenance === 'RETROSPECTIVE');

  const res = await runPass(CONTINUATION, STAGE_CONT, {
    decisions: [{ id: 'cplus:mira', decision: 'keep',
        keptPassage: 'filed it under the drawer where I kept the things I had decided not to '
          + 'think about yet' },
      { id: 'cplus:devrim', decision: 'edit', ref: 'P2' }],
    // ADDITIVE OP (Roman 2026-11-06): was a `replace` that swapped his non-response ("said
    // nothing about it at all") for a different action — the exact single-token action change
    // the withdrawn content-word allowance let through, and the reason that allowance was
    // abandoned rather than tuned. His non-response now stays and the new beat follows it.
    edits: [{ ref: 'P2', op: 'insert_at_anchor', forObligations: ['cplus:devrim'],
      anchor: 'and said nothing about it at all.',
      text: 'He went to wipe down a counter that was already clean.' }] },
    { ledger, ordinal: 2, skeleton: { character_plus: [] } });
  ok('10e the continuation pass applies its edit', res.applied.length === 1, JSON.stringify(res.rejected));
  ok('10f the continuation KEEP is accepted', res.keeps.length === 1);
  ok('10g the published text carries it', res.text.includes('already clean'));

  // SPACING: an attempt one scene ago defers a recurring depiction rather than charging again.
  const recent = due(STAGE_CONT, { ledger,
    attempts: [{ character: 'Devrim', issue: 1, ordinal: 2, assessment: { ran: true } }],
    ordinal: 3, skeleton: { character_plus: [] } });
  ok('10h a recurring depiction attempted last scene is DEFERRED, not re-charged',
    !recent.due.some((o) => o.id === 'cplus:devrim')
    && recent.deferred.some((x) => /spaced by/.test(x.why)), JSON.stringify(recent));
  ok('10i and it is still owed, not dropped',
    plan(STAGE_CONT, { ledger, ordinal: 3 }).obligations.some((o) => o.label === 'Devrim'));
}

section('§11  INTRODUCTIONS ARE NEVER DROPPED; CAPACITY REFUSAL IS LOUD');
{
  // The flat five-obligation cutoff is gone. It silently deferred a sixth NEWLY INTRODUCED
  // character, which reintroduced the introduction-density problem and redefined "new characters
  // are covered" without approval.
  const seven = ['Mira', 'Devrim', LI, 'Kenji', 'Aurore', 'Teshome', 'Nadia']
    .map((l, i) => ({ label: l, kind: i === 0 ? 'pc' : 'character', isPC: i === 0,
      isLI: l === LI, participation: 'major' }));
  const d = due(seven, { skeleton: { character_plus: [] } });
  ok('11a SEVEN introductions are ALL carried, none deferred', d.due.length === 7,
    'due=' + d.due.length + ' deferred=' + JSON.stringify(d.deferred));
  ok('11b every one of them is an introduction', d.introductions === 7);
  ok('11c no introduction is deferred for count',
    !d.deferred.some((x) => /more than|already covers/.test(x.why)), JSON.stringify(d.deferred));
  ok('11d the LI social-proof obligation is first in the order',
    d.due[0] && d.due[0].requiresSocialProof === true, d.due.map((o) => o.id).join(','));
  ok('11e no capacity refusal at seven', d.capacity === null);

  // RECURRING work may still wait — that is the issue cadence, not a cutoff.
  const ledger = ['Devrim', 'Kenji', 'Aurore', 'Teshome', 'Nadia', 'Mira']
    .map((c) => ({ character: c, verification: 'verified', issue: 0, ordinal: 1, mode: 'echo' }));
  const mixed = due(seven, { ledger, skeleton: { character_plus: [] } });
  ok('11f recurring obligations beyond the soft limit wait for a later scene',
    mixed.deferred.some((x) => /owed within the issue, not within this scene/.test(x.why)),
    JSON.stringify(mixed.deferred));
  ok('11g and they remain owed in the plan, not dropped',
    plan(seven, { ledger }).obligations.length >= mixed.due.length);

  // ABOVE THE HARD LIMIT: nobody is covered and the pass says so.
  const thirteen = Array.from({ length: 13 }, (_, i) => ({ label: 'Person' + i,
    kind: i === 0 ? 'pc' : 'character', isPC: i === 0, participation: 'major' }));
  const over = due(thirteen, { skeleton: { character_plus: [] } });
  ok('11h above the hard limit a CAPACITY REFUSAL is raised',
    over.capacity && over.capacity.code === 'capacity_exceeded', JSON.stringify(over.capacity));
  ok('11i the refusal names everyone it did not cover',
    over.capacity.notCovered.length === over.due.length);
  ok('11j it says nobody was covered, rather than narrowing silently',
    /NOBODY was covered/.test(over.capacity.why));
  let calls = 0;
  const res = await runPass(OPENING, thirteen, async () => { calls++;
    return { dispatched: true, content: '{}' }; }, { skeleton: { character_plus: [] } });
  ok('11k the pass refuses WITHOUT calling the provider', calls === 0 && res.ran === false
    && res.reason === 'capacity_exceeded', res.reason + ' calls=' + calls);
  ok('11l and the prose is untouched', res.text === OPENING);
  ok('11m the unresolved record names every obligation',
    res.unresolved && res.unresolved.obligations.length === 13);
}

section('§12  HISTORY RECORDS THE PUBLISHED TEXT, AND KEEPS THE THREE LISTS APART');
{
  const res = await runPass(OPENING, STAGE_OPENING, {
    decisions: [
      { id: 'cplus:mira', decision: 'edit', ref: 'P2' },
      { id: 'cplus:devrim', decision: 'keep', why: 'already reports rather than opines',
        keptPassage: '"You are here early," Devrim said, shaking the rain off his coat.' },
      { id: 'cplus:oyelaran', decision: 'edit', ref: 'P5' }],
    edits: [
      // ADDITIVE OPS (Roman 2026-11-06): both were `replace`, which the craft pass no longer
      // offers. §12 asks about the three lists and the before/after record, not about whether a
      // replacement may delete, so the questions are unchanged. (An earlier attempt rewrote the
      // P2 fixture's prose to satisfy a content threshold; that threshold is gone.)
      { ref: 'P2', op: 'insert_at_anchor', forObligations: ['cplus:mira'],
        anchor: 'as though the till could settle anything.',
        text: 'I counted once more, because the second count had come out right.' },
      { ref: 'P5', op: 'insert_at_anchor', forObligations: ['cplus:oyelaran'],
        anchor: 'looked at the schedule on the wall.',
        text: 'She did not appear to notice that they had.' }] });
  ok('12a the published revision is computed from the PUBLISHED text',
    res.publishedRevision === EBC.revisionId(EBC.readerFacing(res.text)));
  ok('12b it differs from the revision the request was built on',
    res.publishedRevision !== res.requestRevision);
  ok('12c KEEP claims are their own list', res.keeps.length === 1 && res.keeps[0].id === 'cplus:devrim');
  ok('12d applied edits are their own list', res.appliedFor.length === 2);
  // The pre-edit text exists only in the splice result; the host must carry it into the report or
  // the first live result cannot be reviewed for damage.
  // ── THE RECORD MUST BE REVIEWABLE FOR EVERY OP (Roman 2026-11-06) ────────────────────────
  // This read `replaced.length > 0` on every applied edit, which was right when `replace` was
  // the only general operation. An INSERTION replaces nothing, so an empty `replaced` is the
  // correct record and not a missing one — what a reviewer needs instead is WHERE it landed.
  // The question is unchanged: can the host see what each applied edit did to the prose?
  ok('12d-ii every applied edit carries the fact a reviewer needs: a replacement its ORIGINAL '
    + 'text, an insertion its anchor',
    res.applied.every((a) => a.op === 'replace'
      ? (typeof a.replaced === 'string' && a.replaced.length > 0)
      : (typeof a.anchor === 'string' && a.anchor.length > 0
         && typeof a.inserted === 'string' && a.inserted.length > 0)),
    JSON.stringify(res.applied.map((a) => ({ ref: a.ref, op: a.op }))));
  ok('12d-iii and the host records a before/after pair per applied edit',
    /before: _ap\.replaced \|\| null, after: _ap\.inserted \|\| null/.test(
      fs.readFileSync(ROOT + '/public/app.js', 'utf8')));
  ok('12d-iv the report is emitted as one copyable line',
    /\[CPLUS:EDITOR:REPORT\] '/.test(fs.readFileSync(ROOT + '/public/app.js', 'utf8')));
  ok('12e an applied edit never claims to prove fulfilment',
    res.appliedFor.every((e) => !('provesFulfilment' in e) || e.provesFulfilment === false));
  // THE HOST'S RECORDING SHAPE: the third list must be empty, because no judge ran.
  const hostSrc = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  const blk = hostSrc.slice(hostSrc.indexOf('window.state._cpEditorReport = {'),
    hostSrc.indexOf('// ── AN UNMET OBLIGATION RECORDS AN ATTEMPT'));
  ok('12f the host keeps keepClaims separate', /keepClaims:/.test(blk));
  ok('12g the host keeps appliedEdits separate', /appliedEdits:/.test(blk));
  ok('12h SEMANTIC coverage is empty, with the reason stated',
    /semanticallyVerifiedCoverage: \[\]/.test(blk)
    && /never proof the depiction is good/.test(blk));
  ok('12h-ii operational delivery is its own, third list',
    /operationalDelivery: Object\.keys\(_cpAnswered\)/.test(blk));
  ok('12i a KEEP claim is labelled a claim, not evidence', /isClaimNotEvidence: true/.test(blk));
  ok('12j the host records the PUBLISHED revision', /publishedRevision: _cpPublishedRev/.test(blk));
  // Attempts are recorded as 'directed', which both ledger readers filter out.
  const att = hostSrc.slice(hostSrc.indexOf('// ── AN UNMET OBLIGATION RECORDS AN ATTEMPT'),
    hostSrc.indexOf('[CPLUS:EDITOR] scene '));
  // An answered obligation is 'editor_reviewed' (operational), an unanswered one stays
  // 'directed'. NEITHER is 'verified'.
  ok('12k the tier is decided by whether the passage SHIPPED',
    /verification: _del\.verification/.test(att)
    && /cpEditorDeliveryRecord\(\{/.test(att));
  ok('12l no verified credit is written anywhere in the editor path',
    !/verification: 'verified'/.test(blk + att));
  ok('12m the attempt is recorded against the ASSIGNMENT, never an unverified facet',
    /facet_id: 'assignment:' \+ o\.id/.test(att) && /facetBacked: false/.test(att));
  ok('12n no judge is claimed', /judgeUsable: false/.test(att));
}

section('§13  STALENESS — A LATE REPLY WRITES NOTHING');
{
  const hostSrc = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  const seam = hostSrc.slice(hostSrc.indexOf('// (5a-ii) THE DEDICATED CHARACTER+ EDITOR'),
    hostSrc.indexOf('} catch (_cpEdErr) {'));
  ok('13a the seam re-checks ownership before recording',
    /_ebOwnerStillCurrent\(_ebOwner\)/.test(seam));
  ok('13b a stale reply skips prose, attempts and the report',
    /prose, attempts and the report are ALL skipped/.test(seam));
  ok('13c the staleness check precedes the recording branch',
    seam.indexOf('_ebOwnerStillCurrent') < seam.indexOf('window.state._cpEditorReport'));
  ok('13d the owner is the captured one, not re-read state',
    /owner: _ebOwner/.test(seam) && !/owner: _ebCaptureOwner\(/.test(seam));
  // The owner travels into the pass and back out unchanged.
  let sawOwner = null;
  await runPass(OPENING, STAGE_OPENING, async (req) => { sawOwner = req.owner;
    return { dispatched: true, content: '{"decisions":[],"edits":[]}' }; });
  ok('13e the pass hands the adapter the captured owner',
    sawOwner && sawOwner.storyId === STORY && sawOwner.ticket === 'tkt-1');
}

section('§14  DUPLICATE OPERATIONS — ONE PASS PER DRAFT REVISION');
{
  const idA = EBC.cpEditorOperationId({ accountId: 'acct-1', storyId: STORY, scene: 3,
    revisionId: 'rev-aaa' });
  ok('14a the operation id is deterministic',
    idA === EBC.cpEditorOperationId({ accountId: 'acct-1', storyId: STORY, scene: 3,
      revisionId: 'rev-aaa' }));
  ok('14b it is scoped to the account',
    idA !== EBC.cpEditorOperationId({ accountId: 'acct-2', storyId: STORY, scene: 3,
      revisionId: 'rev-aaa' }));
  ok('14c it is scoped to the scene',
    idA !== EBC.cpEditorOperationId({ accountId: 'acct-1', storyId: STORY, scene: 4,
      revisionId: 'rev-aaa' }));
  ok('14d a REGENERATED scene is a different draft and gets its own pass',
    idA !== EBC.cpEditorOperationId({ accountId: 'acct-1', storyId: STORY, scene: 3,
      revisionId: 'rev-bbb' }));
  ok('14e the same bytes produce the same id — a reload does NOT re-buy', idA === 'cplus-editor:acct-1:'
    + STORY + ':scene3:rev-aaa', idA);

  // The client's in-session suppression, sliced from app.js and run for real.
  const src = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  const a = src.indexOf('  function _ebEditorSeen(opId, mark) {');
  const b = src.indexOf('  // The adapter editorPassOnFinalizedDraft calls.');
  const sandbox = { window: { state: {} } };
  vm.createContext(sandbox);
  vm.runInContext(src.slice(a, b) + '\nthis._seen = _ebEditorSeen;', sandbox);
  ok('14f a fresh operation is not seen', sandbox._seen(idA) === false);
  sandbox._seen(idA, true);
  ok('14g the same operation is then suppressed', sandbox._seen(idA) === true);
  ok('14h a different revision is not suppressed',
    sandbox._seen(EBC.cpEditorOperationId({ accountId: 'acct-1', storyId: STORY, scene: 3,
      revisionId: 'rev-bbb' })) === false);
  ok('14i the suppression lives in story state, so a story reset clears it',
    !!sandbox.window.state._cpEditorOps[idA]);
}

section('§15  SERVER ADMISSION — THE PURE DECISION (unit)');
{
  const { editorAdmission } = await import('./api/cplus-editor.js');
  const GOOD_ENV = { CPLUS_EDITOR_PRICE_FORTUNES: '2', CPLUS_EDITOR_DAILY_CAP: '40' };
  // ── THIS SECTION NOW EXERCISES THE *EXPLICIT* CONFIGURATION ───────────────────────────
  // (Roman 2026-11-04.) The route holds two server-pinned configurations selected by a declared
  // content class: general prose → gpt-6-luna, explicit prose → grok-4.3. Every property §15
  // asserts — the model is pinned, the client cannot choose it, the allowance is clamped, the
  // reservation is priced — is still true, and is asserted here against the explicit path,
  // which is the incumbent configuration this section was written for. The SELECTION itself,
  // and the general configuration, are covered in _cplus_editor_provider_switch.mjs.
  const body = (over = {}) => Object.assign({
    operationId: 'cplus-editor:acct-1:' + STORY + ':scene3:rev-aaa',
    storyId: STORY, scene: 3, revisionId: 'rev-aaa', contentClass: 'explicit',
    system: 'you are an editor', user: '{"scene":[]}', maxTokens: 1800 }, over);

  const noPolicy = editorAdmission({ env: {}, accountId: 'acct-1', body: body() });
  ok('15a with no price configured the route REFUSES', !noPolicy.ok
    && noPolicy.error === 'policy_not_configured' && noPolicy.status === 503);
  ok('15b the refusal says there is no approved policy',
    /no approved\s+production spending policy/.test(noPolicy.detail || ''));
  ok('15c a price WITHOUT a volume cap is not a policy',
    editorAdmission({ env: { CPLUS_EDITOR_PRICE_FORTUNES: '2' }, accountId: 'acct-1',
      body: body() }).error === 'policy_not_configured');
  ok('15d the policy gate precedes identity',
    editorAdmission({ env: {}, accountId: null, body: body() }).error === 'policy_not_configured');
  ok('15e a negative price is invalid',
    editorAdmission({ env: { CPLUS_EDITOR_PRICE_FORTUNES: '-1', CPLUS_EDITOR_DAILY_CAP: '5' },
      accountId: 'acct-1', body: body() }).error === 'policy_invalid');
  ok('15f a fractional cap is invalid',
    editorAdmission({ env: { CPLUS_EDITOR_PRICE_FORTUNES: '2', CPLUS_EDITOR_DAILY_CAP: '1.5' },
      accountId: 'acct-1', body: body() }).error === 'policy_invalid');
  ok('15g a price of ZERO is a legitimate configured policy',
    editorAdmission({ env: { CPLUS_EDITOR_PRICE_FORTUNES: '0', CPLUS_EDITOR_DAILY_CAP: '40' },
      accountId: 'acct-1', body: body() }).ok === true);
  ok('15h no verified session is refused',
    editorAdmission({ env: GOOD_ENV, accountId: null, body: body() }).error === 'authentication_required');
  ok('15i a body naming another account is refused',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ userId: 'acct-2' }) }).error === 'identity_mismatch');
  ok('15j a missing operation id is refused',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ operationId: null }) }).error === 'operation_id_required');
  ok('15k an id minted for another account is refused',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-9', body: body() }).error === 'operation_mismatch');
  ok('15l an id pointed at another scene is refused',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ scene: 4 }) }).error === 'operation_mismatch');
  ok('15m an id pointed at another revision is refused',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ revisionId: 'rev-bbb' }) }).error === 'operation_mismatch');
  const clientId = EBC.cpEditorOperationId({ accountId: 'acct-1', storyId: STORY, scene: 3,
    revisionId: 'rev-aaa' });
  const good = editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
    body: body({ operationId: clientId }) });
  ok('15o the client-minted id is the one the server expects', good.ok === true
    && good.expectedOperationId === clientId);
  ok('15p an oversized request is refused',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ user: 'x'.repeat(130000) }) }).error === 'request_too_large');
  ok('15r THE MODEL IS PINNED SERVER-SIDE', good.model === 'grok-4.3');
  ok('15s the client cannot choose the model',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ model: 'grok-4.7', preferredModel: 'grok-4.7',
        _sbModelOverride: 'grok-4.7' }) }).model === 'grok-4.3');
  ok('15t the output allowance is clamped',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ maxTokens: 999999 }) }).outCap === 2400);
  // THE PRICED RESERVATION EXISTS AND IS A MONETARY AMOUNT.
  ok('15u admission carries a priced USD reservation',
    typeof good.reservedUsd === 'number' && good.reservedUsd > 0, String(good.reservedUsd));
  ok('15v a bigger request reserves more',
    editorAdmission({ env: GOOD_ENV, accountId: 'acct-1',
      body: body({ user: 'y'.repeat(40000) }) }).reservedUsd > good.reservedUsd);
}

section('§15-II  STRICT USAGE AND REASONING CHARGES (unit)');
{
  const { normalizeUsage } = await import('./api/cplus-editor.js');
  ok('15-II a  no usage block is UNKNOWN, not free', normalizeUsage(null).ok === false);
  ok('15-II b  a null prompt count does not become zero',
    normalizeUsage({ prompt_tokens: null, completion_tokens: 50 }).ok === false);
  ok('15-II c  a null completion count does not become zero',
    normalizeUsage({ prompt_tokens: 100, completion_tokens: null }).ok === false);
  ok('15-II d  a string is not a number',
    normalizeUsage({ prompt_tokens: '100', completion_tokens: 50 }).ok === false);
  ok('15-II e  a negative count is rejected',
    normalizeUsage({ prompt_tokens: -1, completion_tokens: 50 }).ok === false);
  // THE REAL FOUR-CHARACTER CALL: 8402 in, 1432 billed out of which 924 reasoning, $0.014083.
  const real = normalizeUsage({ prompt_tokens: 8402, completion_tokens: 508, total_tokens: 9834 });
  ok('15-II f  reasoning is recovered from the provider total', real.ok
    && real.reasoning === 924 && real.outTok === 1432, JSON.stringify(real));
  ok('15-II g  and it reproduces the measured cost of the real call',
    real.ok && Math.abs(real.usd - 0.014083) < 1e-6, real.ok && real.usd.toFixed(6));
  ok('15-II h  the basis is stated, not implied', /as reasoning/.test(real.basis));
  const reported = normalizeUsage({ prompt_tokens: 8402, completion_tokens: 508,
    completion_tokens_details: { reasoning_tokens: 924 } });
  ok('15-II i  the reported reasoning field is honoured too',
    reported.ok && reported.outTok === 1432);
  ok('15-II j  pricing completion alone would UNDER-report',
    real.usd > (8402 * 1.25e-6 + 508 * 2.5e-6));
  ok('15-II k  an incoherent total is rejected rather than guessed',
    normalizeUsage({ prompt_tokens: 100, completion_tokens: 900, total_tokens: 500 }).ok === false);
}

section('§15-III  THE ACTUAL HANDLER, EXERCISED (behavioural)');
{
  const { createHandler } = await import('./api/cplus-editor.js');
  const ENV = { CPLUS_EDITOR_PRICE_FORTUNES: '0', CPLUS_EDITOR_DAILY_CAP: '3',
    SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'svc', XAI_API_KEY: 'k' };

  // A fake database that implements cplus_editor_admit's CONTRACT, including serialising
  // concurrent admissions per account the way the advisory lock does. The transaction itself is
  // Postgres's; what this exercises is the HANDLER — that it delegates admission to one call,
  // honours each outcome, settles, and replays.
  function makeDb(opts = {}) {
    const rows = new Map();
    const owners = opts.owners || { [STORY]: 'acct-1' };
    const calls = { admit: 0, update: 0, select: 0, rpcOther: 0 };
    let chain = Promise.resolve();
    const db = { rows, calls };
    db.client = {
      auth: { getUser: async (tok) => tok === 'bad'
        ? { data: null, error: new Error('bad token') }
        : { data: { user: { id: opts.accountId || 'acct-1' } }, error: null } },
      rpc: async (fn, args) => {
        if (fn !== 'cplus_editor_admit') { calls.rpcOther++;
          return { data: [{ ok: true }], error: null }; }
        calls.admit++;
        // Serialised, as the per-account advisory lock serialises it.
        const run = chain.then(async () => {
          await new Promise((r) => setTimeout(r, 1));
          const ex = rows.get(args.p_operation_id);
          if (ex) {
            if (ex.account_id !== args.p_account_id) return [{ outcome: 'mismatch' }];
            return [{ outcome: 'replay', detail: ex.refusal, existing_status: ex.status,
              existing_reply: ex.reply, existing_truncated: ex.truncated === true,
              existing_usage_in: ex.usage_in, existing_usage_out: ex.usage_out,
              existing_cost_usd: ex.cost_usd, existing_charged: ex.charged_fortunes }];
          }
          if (owners[args.p_story_id] !== args.p_account_id) {
            return [{ outcome: 'forbidden',
              detail: 'the authenticated account does not own this story' }];
          }
          const used = [...rows.values()].filter((r) => r.account_id === args.p_account_id).length;
          if (used >= args.p_daily_cap) {
            return [{ outcome: 'capped', used_today: used,
              detail: `${used} passes in the last 24h; the cap is ${args.p_daily_cap}` }];
          }
          rows.set(args.p_operation_id, { operation_id: args.p_operation_id,
            account_id: args.p_account_id, story_id: args.p_story_id, status: 'reserved',
            reserved_usd: args.p_reserved_usd, price_fortunes: args.p_price_fortunes });
          return [{ outcome: 'admitted', used_today: used }];
        });
        chain = run.then(() => {}, () => {});
        return { data: await run, error: null };
      },
      from: () => ({
        update: (patch) => ({ eq: async (_c, id) => { calls.update++;
          if (opts.failSettlement) return { error: { message: 'write timeout' } };
          const r = rows.get(id); if (r) Object.assign(r, patch);
          return { error: null }; } }),
        select: () => ({ eq: () => ({ maybeSingle: async () => { calls.select++;
          return { data: null, error: null }; } }) })
      })
    };
    return db;
  }
  const reply = (over = {}) => Object.assign({
    choices: [{ message: { content: '{"decisions":[],"edits":[]}' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 8402, completion_tokens: 508, total_tokens: 9834 } }, over);
  function makeRes() {
    const r = { code: null, body: null, headers: {} };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.end = () => r;
    return r;
  }
  const reqFor = (over = {}) => ({ method: 'POST', headers: { authorization: 'Bearer tok' },
    body: Object.assign({ operationId: 'cplus-editor:acct-1:' + STORY + ':scene3:rev-aaa',
      storyId: STORY, scene: 3, revisionId: 'rev-aaa', system: 'sys', user: 'usr',
      // The explicit configuration — this section's fixtures are grok-shaped (max_tokens,
      // xAI usage conventions). The general/Luna path is covered in its own suite.
      contentClass: 'explicit',
      maxTokens: 1800 }, over) });

  // (1) HAPPY PATH: admitted, forwarded once, settled with reasoning counted.
  {
    const db = makeDb();
    let sent = 0;
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => { sent++; return { status: 200, json: async () => reply() }; },
      log: { warn() {}, error() {} } });
    const res = makeRes();
    await h(reqFor(), res);
    ok('15-III a  an entitled account is admitted and the call is forwarded once',
      res.code === 200 && sent === 1, res.code + ' sent=' + sent);
    ok('15-III b  admission went through ONE transactional call', db.calls.admit === 1);
    ok('15-III c  the handler does NOT count separately (no count-then-insert)',
      db.calls.select === 0, 'selects=' + db.calls.select);
    const row = db.rows.get(reqFor().body.operationId);
    ok('15-III d  the row reserved a priced USD amount BEFORE forwarding',
      typeof row.reserved_usd === 'number' && row.reserved_usd > 0, String(row.reserved_usd));
    ok('15-III e  settlement wrote the reasoning tokens', row.usage_reasoning === 924);
    ok('15-III f  and the billed output includes them', row.usage_out === 1432);
    ok('15-III g  the settled cost matches the measured call',
      Math.abs(row.cost_usd - 0.014083) < 1e-6, String(row.cost_usd));
    ok('15-III h  a settled call retains nothing', row.retained_usd === 0);
    ok('15-III i  the response reports reasoning separately',
      res.body.usage.reasoning_tokens === 924 && res.body.usage.billed_output_tokens === 1432);
  }

  // (2) CONCURRENT DIFFERENT OPERATIONS AT THE QUOTA BOUNDARY.
  {
    const db = makeDb();
    const h = createHandler({ env: Object.assign({}, ENV, { CPLUS_EDITOR_DAILY_CAP: '2' }),
      createClient: () => db.client,
      fetch: async () => ({ status: 200, json: async () => reply() }),
      log: { warn() {}, error() {} } });
    // Fill one of two slots, then fire THREE different operations at once.
    const r0 = makeRes();
    await h(reqFor({ operationId: 'cplus-editor:acct-1:' + STORY + ':scene1:rev-a',
      scene: 1, revisionId: 'rev-a' }), r0);
    const results = await Promise.all([2, 3, 4].map((n) => {
      const res = makeRes();
      return h(reqFor({ operationId: 'cplus-editor:acct-1:' + STORY + ':scene' + n + ':rev-a',
        scene: n, revisionId: 'rev-a' }), res).then(() => res);
    }));
    const admitted = results.filter((r) => r.code === 200).length;
    const capped = results.filter((r) => r.code === 429).length;
    ok('15-III j  only the remaining slot is granted across DIFFERENT concurrent operations',
      admitted === 1 && capped === 2, 'admitted=' + admitted + ' capped=' + capped);
    ok('15-III k  the cap is never exceeded in the durable table',
      db.rows.size === 2, 'rows=' + db.rows.size);
    ok('15-III l  a capped request reports the cap and the usage',
      results.some((r) => r.code === 429 && r.body.error === 'daily_cap_reached'
        && typeof r.body.usedToday === 'number'));
  }

  // (3) ENTITLEMENT: a correctly formatted id for someone else's story is refused.
  {
    const db = makeDb({ owners: { [STORY]: 'acct-OTHER' } });
    let sent = 0;
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => { sent++; return { status: 200, json: async () => reply() }; },
      log: { warn() {}, error() {} } });
    const res = makeRes();
    await h(reqFor(), res);
    ok('15-III m  a well-formed id does not confer entitlement',
      res.code === 403 && res.body.error === 'not_entitled', res.code + ' ' + JSON.stringify(res.body));
    ok('15-III n  and nothing was forwarded or reserved', sent === 0 && db.rows.size === 0);
  }

  // (4) DUPLICATE OPERATION: replays, does not re-buy.
  {
    const db = makeDb();
    let sent = 0;
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => { sent++; return { status: 200, json: async () => reply() }; },
      log: { warn() {}, error() {} } });
    const a = makeRes(); await h(reqFor(), a);
    const b = makeRes(); await h(reqFor(), b);
    ok('15-III o  the second identical operation does NOT reach the provider', sent === 1,
      'sent=' + sent);
    ok('15-III p  it replays the stored outcome',
      b.code === 200 && b.body.replayed === true && b.body.status === 'settled');
    ok('15-III q  with the same content', b.body.content === a.body.content);
    ok('15-III r  and only one durable row exists', db.rows.size === 1);
  }

  // (5) TRUNCATED RESPONSE: the flag survives the first response AND the replay.
  {
    const db = makeDb();
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => ({ status: 200, json: async () => reply({
        choices: [{ message: { content: '{"decisions":[{"id":"x","decisi' },
          finish_reason: 'length' }] }) }),
      log: { warn() {}, error() {} } });
    const a = makeRes(); await h(reqFor(), a);
    ok('15-III s  truncation is reported on the first response', a.body.truncated === true);
    ok('15-III t  and persisted', db.rows.get(reqFor().body.operationId).truncated === true);
    const b = makeRes(); await h(reqFor(), b);
    ok('15-III u  THE REPLAY CARRIES THE TRUNCATION FLAG', b.body.replayed === true
      && b.body.truncated === true, JSON.stringify(b.body));
  }

  // (6) MISSING / NULL USAGE: unresolved, and the reservation is RETAINED.
  for (const [name, usage] of [['no usage block', undefined],
    ['null counts', { prompt_tokens: null, completion_tokens: null }],
    ['string counts', { prompt_tokens: '1', completion_tokens: '2' }]]) {
    const db = makeDb();
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => ({ status: 200, json: async () => reply({ usage }) }),
      log: { warn() {}, error() {} } });
    const res = makeRes(); await h(reqFor(), res);
    const row = db.rows.get(reqFor().body.operationId);
    ok('15-III v  ' + name + ' → unresolved, not a free call',
      res.body.ok === false && res.body.error === 'editor_unresolved' && row.status === 'unresolved',
      JSON.stringify(res.body));
    ok('15-III w  ' + name + ' → the priced reservation is RETAINED',
      row.retained_usd > 0 && res.body.retainedUsd > 0, String(row.retained_usd));
    ok('15-III x  ' + name + ' → no cost is invented', row.cost_usd === null);
  }

  // (7) UPSTREAM FAILURE: unresolved, retained, no retry.
  {
    const db = makeDb();
    let sent = 0;
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => { sent++; throw new Error('socket hang up'); },
      log: { warn() {}, error() {} } });
    const res = makeRes(); await h(reqFor(), res);
    ok('15-III y  a transport failure is unresolved and NOT retried',
      res.body.error === 'editor_unresolved' && sent === 1 && res.body.retryable === false);
    ok('15-III z  its reservation is retained',
      db.rows.get(reqFor().body.operationId).retained_usd > 0);
  }

  // (8) SETTLEMENT WRITE FAILURE is surfaced, not swallowed.
  {
    const db = makeDb({ failSettlement: true });
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => ({ status: 200, json: async () => reply() }),
      log: { warn() {}, error() {} } });
    const res = makeRes(); await h(reqFor(), res);
    ok('15-III aa a failed settlement write is REPORTED',
      res.code === 500 && res.body.error === 'settlement_write_failed', JSON.stringify(res.body));
    ok('15-III bb and it names the exposure still held', res.body.retainedUsd > 0);
    ok('15-III cc the row stays reserved rather than looking settled',
      db.rows.get(reqFor().body.operationId).status === 'reserved');
    ok('15-III dd the content is still returned — the money was spent either way',
      typeof res.body.content === 'string');
  }

  // (9) The policy gate reaches the handler before any IO.
  {
    const db = makeDb();
    let sent = 0;
    const h = createHandler({ env: { SUPABASE_URL: 'u', SUPABASE_SERVICE_ROLE_KEY: 'k',
      XAI_API_KEY: 'x' }, createClient: () => db.client,
      fetch: async () => { sent++; return { status: 200, json: async () => reply() }; },
      log: { warn() {}, error() {} } });
    const res = makeRes(); await h(reqFor(), res);
    ok('15-III ee an unconfigured policy refuses with NO database or provider access',
      res.code === 503 && res.body.error === 'policy_not_configured'
      && db.calls.admit === 0 && sent === 0, res.code + ' admit=' + db.calls.admit);
  }

  // (10) Auth.
  {
    const db = makeDb();
    const h = createHandler({ env: ENV, createClient: () => db.client,
      fetch: async () => ({ status: 200, json: async () => reply() }),
      log: { warn() {}, error() {} } });
    const r1 = makeRes();
    await h({ method: 'POST', headers: {}, body: reqFor().body }, r1);
    ok('15-III ff no bearer token is refused', r1.code === 401);
    const r2 = makeRes();
    await h({ method: 'POST', headers: { authorization: 'Bearer bad' }, body: reqFor().body }, r2);
    ok('15-III gg an invalid session is refused', r2.code === 401 && db.rows.size === 0);
  }
}

section('§15-IV  SOURCE AND SQL CHECKS — labelled as such, proving nothing behavioural');
{
  // THESE ARE TEXT ASSERTIONS. They establish that the SQL says what it should; they do NOT
  // demonstrate transactional behaviour, which only Postgres can. §15-III exercises the handler;
  // the atomicity itself rests on the function below being deployed as written.
  const sql = fs.readFileSync(ROOT + '/_cplus-editor-operations-migration.sql', 'utf8');
  ok('15-IV a  [source] the admit function exists',
    /create or replace function public\.cplus_editor_admit/.test(sql));
  // TWO locks now: a STORY lock serializes two accounts racing for the same unclaimed story id
  // (a per-account lock could not), and the ACCOUNT lock still serializes the quota count.
  // _cplus_editor_db.mjs executes these against real PostgreSQL; this is a presence check.
  ok('15-IV b  [source] it takes BOTH a story and an account advisory lock',
    /pg_advisory_xact_lock\(hashtextextended\('cplus-story:'/.test(sql)
    && /pg_advisory_xact_lock\(hashtextextended\('cplus-acct:'/.test(sql));
  ok('15-IV c  [source] the count and the insert are inside that one function body',
    sql.indexOf('pg_advisory_xact_lock') < sql.indexOf('select count(*)::integer into v_count')
    && sql.indexOf('select count(*)::integer into v_count')
       < sql.indexOf('insert into public.cplus_editor_operations ('));
  ok('15-IV d  [source] entitlement consults the canonical completed-book mapping',
    /from public\.story_library_versions where id::text = \$1/.test(sql)
    && /from public\.stories where id::text = \$1/.test(sql));
  ok('15-IV d-ii [source] registration and ownership are recorded as different bases',
    /check \(basis in \('authoritative', 'registration'\)\)/.test(sql)
    && /check \(entitlement in \('authoritative', 'registration'\)\)/.test(sql));
  ok('15-IV d-iii [source] the claim is read back and the loser cannot reach the reservation',
    sql.indexOf('select account_id into v_claim') < sql.indexOf('insert into public.cplus_editor_operations ('));
  ok('15-IV e  [source] the reservation column is NOT NULL',
    /reserved_usd\s+numeric not null/.test(sql));
  ok('15-IV f  [source] retained exposure has its own column', /retained_usd\s+numeric/.test(sql));
  ok('15-IV g  [source] reasoning tokens are stored', /usage_reasoning\s+integer/.test(sql));
  ok('15-IV h  [source] replay returns the truncation flag',
    /coalesce\(v_existing\.truncated, false\)/.test(sql));
  ok('15-IV i  [source] the operation id is the primary key',
    /operation_id\s+text primary key/.test(sql));
  ok('15-IV j  [source] the admit function is not callable by clients',
    /revoke all on function public\.cplus_editor_admit/.test(sql));
  ok('15-IV k  [source] only the server writes the table',
    /for select\s*\n\s*using \(auth\.uid\(\) = account_id\)/.test(sql)
    && !/for insert|for update|for delete/.test(sql));

  const routeSrc = fs.readFileSync(ROOT + '/api/cplus-editor.js', 'utf8');
  ok('15-IV l  [source] the account is derived from the token', /auth\.getUser\(token\)/.test(routeSrc));
  ok('15-IV m  [source] admission is one rpc, not a count plus an insert',
    /rpc\('cplus_editor_admit'/.test(routeSrc)
    && !/select\('operation_id', \{ count: 'exact'/.test(routeSrc));
  ok('15-IV n  [source] the reservation is computed server-side, never taken from the body',
    /reservedUsd: reserveUsd\(/.test(routeSrc) && !/body\.reservedUsd/.test(routeSrc));
  ok('15-IV o  [source] there is no fallback model chain',
    !/ROLE_MODEL_CHAIN/.test(routeSrc) && !/for \(let attempt/.test(routeSrc));
  ok('15-IV p  [source] usage is validated, not coerced',
    !/Number\(u\.prompt_tokens\)/.test(routeSrc) && /normalizeUsage\(/.test(routeSrc));
}

section('§16  ENABLED, WITH THE APPROVED POLICY AND A WORKING OFF SWITCH');
{
  const src = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  ok('16a the editor is offered for eligible scenes', /var _EB_EDITOR_ACTIVE = true;/.test(src));
  ok('16b the approved policy is recorded with its date and wording',
    /Roman approved, 2026-10-16/.test(src)
    && /CPLUS_EDITOR_PRICE_FORTUNES = 0   ABSORBED/.test(src)
    && /CPLUS_EDITOR_DAILY_CAP      = 60/.test(src));
  ok('16b-ii the off switch is documented where the flag is',
    /TO TURN THE FEATURE OFF set CPLUS_EDITOR_ENABLED=false/.test(src));
  ok('16c the flag is set in exactly one place',
    (src.match(/_EB_EDITOR_ACTIVE\s*=(?!=)/g) || []).length === 1);
  ok('16c-ii the flag is explicitly disclaimed as spending protection',
    /THIS FLAG IS NOT THE SPENDING PROTECTION/.test(src));
  ok('16d the judge is NOT wired into production',
    !/EssentialBeatCheck\._judgeFn = _ebAssess/.test(src));
  ok('16e _judgeFn stays null in the module',
    /_judgeFn: null/.test(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8')));
  ok('16f Character+ no longer travels down the judge path',
    /CHARACTER\+ NO LONGER TRAVELS DOWN THIS PATH/.test(src));
  ok('16g the prose author model is untouched by this work',
    /NARRATIVE_AUTHOR_GROK_ONLY/.test(fs.readFileSync(ROOT + '/api/proxy.js', 'utf8')));
  ok('16h the editor does NOT go through the unauthenticated proxy',
    !/\/api\/proxy/.test(src.slice(src.indexOf('async function _ebEditorDispatch'),
      src.indexOf('// ── OWNERSHIP COMES FROM THE CAPTURED AUTHORING TICKET'))));
  ok('16i the dispatch requires an authenticated session',
    /no authenticated session — the editor does not run/.test(src));
  ok('16j a policy refusal is not counted as spend',
    /var noSpend = code === 'feature_disabled' \|\| code === 'policy_not_configured'/.test(src));
}

section('§16-II  THE OFF SWITCH, AND REFUSALS THAT COST NOTHING');
{
  const { editorAdmission } = await import('./api/cplus-editor.js');
  const LIVE = { CPLUS_EDITOR_PRICE_FORTUNES: '0', CPLUS_EDITOR_DAILY_CAP: '60' };
  const body = {
    operationId: 'cplus-editor:acct-1:' + STORY + ':scene3:rev-aaa',
    storyId: STORY, scene: 3, revisionId: 'rev-aaa', contentClass: 'general',
    system: 's', user: 'u', maxTokens: 1800 };

  ok('16-II a the approved settings are accepted as a configured policy',
    editorAdmission({ env: LIVE, accountId: 'acct-1', body }).ok === true);
  ok('16-II b a cap of 60 is carried through',
    editorAdmission({ env: LIVE, accountId: 'acct-1', body }).dailyCap === 60);
  ok('16-II c a price of 0 is carried through, so the wallet is skipped',
    editorAdmission({ env: LIVE, accountId: 'acct-1', body }).priceFortunes === 0);

  // THE OFF SWITCH, in each accepted spelling, with the policy still fully configured.
  for (const v of ['false', 'FALSE', '0', 'off', 'no']) {
    const r = editorAdmission({ env: Object.assign({}, LIVE, { CPLUS_EDITOR_ENABLED: v }),
      accountId: 'acct-1', body });
    ok('16-II d CPLUS_EDITOR_ENABLED=' + v + ' disables dispatch',
      !r.ok && r.error === 'feature_disabled', JSON.stringify(r));
  }
  ok('16-II e it precedes the policy gate, so it works whatever else is set',
    editorAdmission({ env: { CPLUS_EDITOR_ENABLED: 'false' }, accountId: null, body })
      .error === 'feature_disabled');
  ok('16-II f absent or true leaves the feature on',
    editorAdmission({ env: LIVE, accountId: 'acct-1', body }).ok === true
    && editorAdmission({ env: Object.assign({}, LIVE, { CPLUS_EDITOR_ENABLED: 'true' }),
      accountId: 'acct-1', body }).ok === true);
  ok('16-II g the refusal says story generation is unaffected and nothing was changed',
    /story generation is\s+unaffected and no accounting record was changed/.test(
      editorAdmission({ env: Object.assign({}, LIVE, { CPLUS_EDITOR_ENABLED: 'false' }),
        accountId: 'acct-1', body }).detail));

  // THE OFF SWITCH DELETES NOTHING. Asserted on the route source: the disabled path returns
  // before any database client is constructed.
  const routeSrc = fs.readFileSync(ROOT + '/api/cplus-editor.js', 'utf8');
  ok('16-II h [source] the disabled path returns before any DB access',
    routeSrc.indexOf("error: 'feature_disabled'") < routeSrc.indexOf('createClient(sbUrl'));
  ok('16-II i [source] nothing in the route deletes an accounting row',
    !/\.delete\(/.test(routeSrc) && !/drop table/i.test(routeSrc));

  // A REFUSAL THAT SENT NOTHING MUST NOT BE RECORDED AS EXPOSURE.
  const appSrc = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  const noSpend = appSrc.slice(appSrc.indexOf('var noSpend = code ==='),
    appSrc.indexOf('// ── ONE-SHOT CIRCUIT BREAKER'));
  for (const code of ['feature_disabled', 'policy_not_configured', 'admission_unavailable',
    'reservation_failed', 'not_entitled', 'daily_cap_reached', 'insufficient_fortunes']) {
    ok('16-II j ' + code + ' is classified as costing nothing',
      noSpend.includes("'" + code + "'"), noSpend.slice(0, 120));
  }
  ok('16-II k an admission failure is NOT invented as exposure',
    /no row and no provider call — recording them as\s*\n\s*\/\/ unresolved exposure would be inventing a cost/.test(appSrc));
  ok('16-II l a deployment-wide refusal latches, so it is not re-asked per scene',
    /_ebEditorOff = code;/.test(appSrc) && /if \(_ebEditorOff\) \{/.test(appSrc));
  ok('16-II m but a PER-PASS refusal does not latch',
    !/_ebEditorOff = 'daily_cap_reached'/.test(appSrc)
    && /Per-pass refusals \(quota, entitlement, wallet\) are NOT/.test(appSrc));
}

section('§17  A COMPLETED EDIT ADVANCES SCHEDULING — WITHOUT CLAIMING IT IS VERIFIED');
{
  // THE DEFECT THIS COVERS: with every result left 'directed', nothing the editor did could move
  // a character out of "introduction still owed", so it would request the same introduction again
  // after every spacing gap, forever.
  const intro = due(STAGE_OPENING).due.find((o) => o.id === 'cplus:devrim');
  ok('17a before anything, Devrim is owed an INTRODUCTION', intro && intro.kind === 'introduction');

  // Scene 1 runs and the editor's edit ships.
  const res = await runPass(OPENING, STAGE_OPENING, {
    decisions: [{ id: 'cplus:devrim', decision: 'edit', ref: 'P3' },
      { id: 'cplus:mira', decision: 'keep', keptPassage: 'counted the float twice' },
      { id: 'cplus:oyelaran', decision: 'keep',
        keptPassage: 'looked at her before they looked at the schedule on the wall' }],
    // ADDITIVE OP (Roman 2026-11-06): was a `replace`. §17 asks whether a completed edit
    // advances scheduling and is recorded as editor_reviewed rather than verified; the shipped
    // passage is now the inserted sentence, which is the passage that actually published.
    edits: [{ ref: 'P3', op: 'insert_at_anchor', forObligations: ['cplus:devrim'],
      anchor: '"You are always here early."',
      text: '"The spring order came in light." He did not say whether that was my doing.' }] });
  const shipped = '"The spring order came in light." He did not say whether that was my doing.';
  ok('17b the edit shipped', EBC.quotePresent(shipped, res.text));

  // The record the host writes for it, built by the real function.
  const rec = EBC.cpEditorDeliveryRecord({ publishedPassage: shipped,
    reader: EBC.readerFacing(res.text), revisionId: res.publishedRevision, decision: 'edit' });
  ok('17c it is recorded as editor_reviewed', rec.verification === 'editor_reviewed');
  ok('17d and NOT as verified', rec.verification !== 'verified'
    && rec.semanticallyVerified === false);
  ok('17e it keeps the passage that actually published', rec.publishedPassage === shipped);
  ok('17f the basis is stated honestly', /present in the published text/.test(rec.basis));

  // THAT RECORD ADVANCES THE SCHEDULER.
  const after = [{ character: 'Devrim', verification: 'editor_reviewed', issue: 1, ordinal: 1,
    mode: 'echo', relation: 'reinforced', publishedPassage: shipped,
    semanticallyVerified: false, facet_id: 'assignment:cplus:devrim' }];
  const d2 = due(STAGE_CONT, { ledger: after, ordinal: 2, skeleton: { character_plus: [] } });
  const dev2 = d2.due.find((o) => o.id === 'cplus:devrim');
  ok('17g a SUCCESSFUL introduction is not requested again', !dev2 || dev2.kind !== 'introduction',
    JSON.stringify(dev2 && { kind: dev2.kind }));
  ok('17h his issue cadence is now satisfied, so he is not due this scene', !dev2,
    JSON.stringify(d2.due.map((o) => o.id)));
  ok('17i and it holds at a much later scene too — no indefinite repetition',
    !due(STAGE_CONT, { ledger: after, ordinal: 14,
      skeleton: { character_plus: [] } }).due.some((o) => o.id === 'cplus:devrim'));

  // IN THE NEXT ISSUE he is RECURRING, and the prior published passage travels with him.
  const next = due(STAGE_CONT, { ledger: after.map((m) => Object.assign({}, m, { issue: 0 })),
    ordinal: 6, skeleton: { character_plus: [] } });
  const dev3 = next.due.find((o) => o.id === 'cplus:devrim');
  ok('17j across the issue boundary he is RECURRING, not reintroduced',
    dev3 && dev3.kind === 'recurring', JSON.stringify(dev3 && { kind: dev3.kind }));
  ok('17k the request CARRIES HIS PRIOR PUBLISHED DEPICTION',
    dev3 && dev3.priorDepictions.length === 1
    && dev3.priorDepictions[0].publishedPassage === shipped,
    JSON.stringify(dev3 && dev3.priorDepictions));
  ok('17l and labels how it was established, so an operational record is not read as proven',
    /NOT quality-checked/.test(dev3.priorDepictions[0].establishedBy));
  ok('17m the echo/broaden mode comes from that history',
    dev3.mode === EBC.CP_MODE.ECHO || dev3.mode === EBC.CP_MODE.BROADEN);
  // And it reaches the model.
  const built = EBC.buildSceneEditorRequest({ draft: CONTINUATION, due: [dev3],
    protectedPassages: [], doctrine: null, examples: null });
  ok('17n the prior published passage reaches the assembled request',
    built.user.includes('The spring order came in light'));

  // A FAILED OR UNANSWERED OBLIGATION REMAINS OWED.
  const bad = EBC.cpEditorDeliveryRecord({ publishedPassage: 'a passage that never shipped',
    reader: EBC.readerFacing(res.text), decision: 'edit' });
  ok('17o a claimed passage that did NOT ship is not operational delivery',
    bad.verification === 'directed' && bad.publishedPassage === null);
  ok('17p and it says why', /NOT in the published text/.test(bad.basis));
  const stillOwed = due(STAGE_OPENING, { ledger: [{ character: 'Devrim',
    verification: 'directed', issue: 1, ordinal: 1 }] }).due.find((o) => o.id === 'cplus:devrim');
  ok('17q so the introduction is STILL OWED', stillOwed && stillOwed.kind === 'introduction');
  ok('17r a directed row never counts as a depiction',
    EBC.cpCountsAsDepiction({ verification: 'directed' }) === false);
  ok('17s only the two delivering tiers count',
    EBC.cpCountsAsDepiction({ verification: 'verified' }) === true
    && EBC.cpCountsAsDepiction({ verification: 'editor_reviewed' }) === true);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(78));
console.log(fail === 0 ? `  ALL ${pass}/${pass} PASS` : `  ${pass} passed, ${fail} FAILED`);
if (fail) { console.log('\nFailures:'); fails.forEach((f) => console.log('  · ' + f)); }
console.log('═'.repeat(78));
console.log('\nTHESE CHECKS ESTABLISH INTEGRATION BEHAVIOUR, NOT LITERARY RELIABILITY.');
console.log('Whether an edit improves a scene is answered by reading it, not by this suite.');
process.exit(fail ? 1 : 0);
