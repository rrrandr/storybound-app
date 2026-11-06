// ── INTEGRATION + DETERMINISTIC CONTROL, ESSENTIAL-BEAT CHECK ($0) ───────────────────────────
// WHAT THIS ESTABLISHES: that the PRODUCTION entry point (runOnFinalizedDraft) behaves correctly
// with ASYNCHRONOUS stubbed judge/repair/recheck responses — awaiting them, preserving successful
// local edits, reverting malformed or regressive ones, treating missing/malformed rechecks as
// unverified rather than successful, keeping concealed actions concealed, and never blocking
// publication. Plus extraction preservation on the SHIPPED app.js function.
//
// WHAT THIS DOES **NOT** ESTABLISH: that the semantic judge is accurate. Every verdict below is a
// STUB I wrote. Nothing here shows a model can tell `asserted_only` from `fulfilled`, recognise a
// foreclosed closing choice, or judge whether a passage delivers a viewpoint judgment.
//
// SCOPE LIMIT, STATED PLAINLY: app.js cannot be executed in node (it needs a DOM), so the call
// site inside callChat is verified by SOURCE ASSERTION (it exists, it is awaited, it assigns
// _result) plus `node --check`. The logic it calls is exercised directly here.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = '/Users/romantsukerman/storybound-app';
vm.runInThisContext(readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

const appSrc = readFileSync(ROOT + '/public/app.js', 'utf8');
const appLines = appSrc.split('\n');
const fnStart = appLines.findIndex((l) => /function _extractScene1PrewrittenExpansions\(text\)/.test(l));
const fnSrc = appLines.slice(fnStart, fnStart + 27).join('\n');
const shippedExtract = vm.runInThisContext(
  '(function(){ var window = { state: {} }; ' + fnSrc + ' return _extractScene1PrewrittenExpansions; })()'
);

const HAIKU = readFileSync(ROOT + '/_ab_writing_out/two_author_2026-10-14T21-51-40-390Z/haiku_scene.txt', 'utf8');
const GROK  = readFileSync(ROOT + '/_ab_writing_out/two_author_2026-10-15T04-35-05-320Z/grok_scene.txt', 'utf8');
const REQ   = readFileSync(ROOT + '/_ab_writing_out/haiku_chain_2026-10-14T21-46-17-643Z/scene1_AUTHOR_request.txt', 'utf8');

let PASS = 0, FAIL = 0;
const ok = (n, c, d) => { if (c) { PASS++; console.log('  PASS  ' + n + (d ? '  — ' + d : '')); }
  else { FAIL++; console.log('  FAIL  ' + n + (d ? '  — ' + d : '')); } };
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const tick = (v) => new Promise((r) => setTimeout(() => r(v), 1));   // forces a real await

console.log('=== ESSENTIAL-BEAT CHECK — INTEGRATION (async stubs) + DETERMINISTIC ($0) ===');
console.log('Stubbed verdicts throughout. Semantic accuracy is NOT under test.\n');

// ── A. EXTRACTION PRESERVATION, SHIPPED FUNCTION ─────────────────────────────────────────────
console.log('--- A. extraction preservation (shipped app.js function) ---');
{
  const out = shippedExtract(HAIKU);
  ok('Haiku: the closing decision survives the appendix',
    /toyed with the idea of letting the cards decide/.test(out), words(out) + ' words');
  ok('Haiku: branch text is not shown as prose',
    !/I asked for him/.test(out) && !/turned their faces away in unison/.test(out));
  ok('Haiku: no EXPANSION markers remain', !/EXPANSION/.test(out));
  ok('the micro-decision widget is left to its own stage', /<<\s*MICRO_EXPRESSION\s*>>/.test(out));
  ok('Grok: unchanged (nothing followed the appendix)',
    /letting the cards decide/.test(shippedExtract(GROK))
    && !/said the name of the memory she had just spent/.test(shippedExtract(GROK)));
  ok('an unclosed appendix still strips to end',
    shippedExtract('Body prose here.\n\n<<EXPANSION_A>>\nb1\n<<EXPANSION_B>>\nb2').trim() === 'Body prose here.');
}

// THE CURRENT reader-facing length, stated for the record. The old 914-word figure predates the
// bounded appendix strip and describes the TRUNCATED text — the version the reader no longer gets.
{
  const cur = EBC.readerFacing(HAIKU);
  console.log('  CURRENT reader-facing Haiku sample: ' + cur.length + ' chars / ' + words(cur)
    + ' words  (the pre-fix truncated figure was 914)');
  ok('the current extraction is longer than the pre-fix figure', words(cur) > 914);
  ok('and it ends on the recovered closing decision',
    /letting the cards decide\.?$/.test(cur.trim()));
}

// ── B. THE app.js CALL SITE (source assertion) ───────────────────────────────────────────────
console.log('\n--- B. production call site in app.js (source assertion, not execution) ---');
{
  ok('runOnFinalizedDraft is called from app.js',
    /await globalThis\.EssentialBeatCheck\.runOnFinalizedDraft\(/.test(appSrc));
  ok('the call is AWAITED', /_ebRes = await globalThis\.EssentialBeatCheck\.runOnFinalizedDraft/.test(appSrc));
  ok('its result can replace the draft', /_result = _ebRes\.text/.test(appSrc));
  // Position is measured against the awaited CALL, not any mention of the name — the adapter
  // block's comments reference runOnFinalizedDraft far earlier in the file.
  ok('it sits AFTER the appendix strip',
    appSrc.indexOf('_result = _extractScene1PrewrittenExpansions(_result)')
      < appSrc.indexOf('_ebRes = await globalThis.EssentialBeatCheck.runOnFinalizedDraft'));
  ok('it sits BEFORE scene persistence', appSrc.indexOf('runOnFinalizedDraft') < appSrc.indexOf('s.scenes.push(rec)'));
  ok('the host repair budget is passed in', /budgetClaim: \(typeof _repairBudgetStart/.test(appSrc));
  ok('essential beats come from the existing plot contract', /_scenePlotContract/.test(appSrc)
    && /hardBeats\.filter\(function \(b\) \{ return b && b\.id && b\.essential/.test(appSrc));
  ok('the blanket CAMERA-VISIBLE planner rule is gone',
    !/every beat MUST be a CAMERA-VISIBLE EVENT/.test(appSrc));
  ok('the planner now asks for evidenceKind', /"evidenceKind":"on_page_action\|discovered_evidence/.test(appSrc));
  ok('concealed actions are told to stay concealed',
    /Never require, hint at or explain the concealed act/.test(appSrc));
}

// ── C. INERT WITHOUT A JUDGE ─────────────────────────────────────────────────────────────────
console.log('\n--- C. self-gating ---');
{
  const beats = [{ id: 'b1', essential: true, evidenceKind: 'on_page_action' }];
  const noJudge = await EBC.runOnFinalizedDraft({ draft: HAIKU, beats, state: {} });
  ok('no judge wired → draft untouched, nothing ran',
    noJudge.ran === false && noJudge.text === HAIKU, noJudge.reason);
  const noBeats = await EBC.runOnFinalizedDraft({ draft: HAIKU, beats: [], state: {}, judgeFn: async () => [] });
  ok('no essential beats → draft untouched', noBeats.ran === false, noBeats.reason);
  const badJudge = await EBC.runOnFinalizedDraft({ draft: HAIKU, beats, state: {},
    judgeFn: async () => { await tick(); throw new Error('judge exploded'); } });
  ok('a throwing judge leaves the draft untouched', badJudge.text === HAIKU && badJudge.judgeUsable === false);
  ok('and every beat is reported unverified', (badJudge.unresolved || []).every((u) => u.status === 'unverified'));
}

// ── D. ASYNC REPAIR THROUGH THE PRODUCTION PATH ──────────────────────────────────────────────
console.log('\n--- D. async judge + async repair, via runOnFinalizedDraft ---');
const BEATS = [
  { id: 'band', essential: true, evidenceKind: 'on_page_action', region: null,
    description: 'she tears the mouth-band away and moves toward her ward',
    produces: ['mouth_band_removed'], dependsOn: [{ beat: 'sealed', reason: 'she must be sealed first' }] },
  { id: 'ending', essential: true, evidenceKind: 'on_page_action', region: 'closing',
    description: 'the scene ends on a choice that is still open' },
  { id: 'julian', essential: true, evidenceKind: 'concealed_action_with_visible_consequence',
    description: 'Julian acts to protect himself and it stays hidden',
    disclosure: { forbidUntilScene: 16 } }
];
{
  const reader = EBC.readerFacing(HAIKU);
  let judgeCalls = 0, revised = null;
  const judge = async ({ reader: r, revisionId }) => {
    await tick(); judgeCalls++;
    if (judgeCalls === 1) return [
      { id: 'band', status: 'partial', revisionId, actionPassage: 'I could tear it away', note: 'contemplated only' },
      { id: 'ending', status: 'missed', revisionId, note: 'no open choice in the reader-facing text' },
      { id: 'julian', status: 'fulfilled', revisionId, consequencePassage: 'Julian, standing too still at the edge of the clearing' }
    ];
    // recheck of the revision: band fixed, ending still missing
    return [
      { id: 'band', status: 'fulfilled', revisionId, actionPassage: 'I tore the band away and stepped toward her' },
      { id: 'ending', status: 'missed', revisionId },
      { id: 'julian', status: 'fulfilled', revisionId, consequencePassage: 'Julian, standing too still at the edge of the clearing' }
    ];
  };
  const state = {};
  const res = await EBC.runOnFinalizedDraft({ draft: HAIKU, beats: BEATS, state, judgeFn: judge,
    // The repair fills only the regions the APPLICATION authorized, by ref.
    reviseFn: async (brief) => { await tick(); revised = brief.regions.map((r) => r.ref).join(',');
      const band = brief.regions.find((r) => r.beatId === 'band');
      return { paragraphs: [{ ref: band.ref, op: band.op,
        text: 'I pressed my palms flat against the crimson grass. I tore the band away and stepped toward her.' }] }; } });

  ok('the judge was awaited twice (check + recheck)', judgeCalls === 2, 'calls=' + judgeCalls);
  ok('an async repair is accepted (not treated as unusable)', res.draftUsed === 'revised');
  ok('PARTIAL success is preserved — the band fix is kept', res.fixed.includes('band'),
    'fixed=' + JSON.stringify(res.fixed));
  // UPDATED 2026-10-16: the recheck is scoped to the repaired obligations plus previously
  // fulfilled ones in a touched paragraph, so 'ending' — neither repaired nor touched — is not
  // rechecked. The requirement is unchanged: it must be REPORTED unresolved and must not cause
  // the edit to be discarded. What changed is the honest reason.
  ok('the unfixed issue is reported, not used to discard the edit',
    res.unresolved.some((u) => u.id === 'ending'
      && /still failing|not rechecked — outside the edit/.test(u.reason)));
  ok('and an unrechecked obligation is never credited as fixed',
    !res.fixed.includes('ending'), 'fixed=' + JSON.stringify(res.fixed));
  ok('the recheck scope is reported', !!res.recheckScope
    && Array.isArray(res.recheckScope.beatIds));
  ok('the repaired text reaches the caller', /I tore the band away and stepped toward her/.test(res.text));
  ok('the branch appendix is re-attached unchanged',
    /<<EXPANSION_A>>/.test(res.text) && /mercy of not being seen/.test(res.text));
  ok('the concealed beat completed on its consequence alone', !res.unresolved.some((u) => u.id === 'julian'));
  ok('recheck status is recorded', res.recheckStatus === 'complete');
  ok('the allowance records a partial repair', state._essentialFixAllowance.outcome === 'partially_repaired');
}

// ── E. THE CLOSING PASSAGE IS EDITABLE WHEN IT IS THE BROKEN ONE ─────────────────────────────
console.log('\n--- E. closing protected only when unaffected ---');
{
  const greader = EBC.readerFacing(GROK);
  const grev = EBC.revisionId(greader);
  const beatsById = BEATS.reduce((m, b) => { m[b.id] = b; return m; }, {});
  const ev = EBC.evaluate({ draft: greader, alreadyExtracted: true, beats: BEATS, verdicts: [
    { id: 'ending', status: 'contradicted', revisionId: grev,
      actionPassage: 'or let the twisted wish complete', note: 'offers to prevent an already-delivered event' },
    { id: 'band', status: 'missed', revisionId: grev },
    { id: 'julian', status: 'fulfilled', revisionId: grev, consequencePassage: 'Julian stood at the edge of the gathering, perfectly still' }
  ] });
  const brief = EBC.buildBrief(ev, { beatsById });
  ok('a broken closing beat marks the closing EDITABLE', brief.editable.includes('closing'),
    JSON.stringify(brief.editable));
  ok('and the closing is NOT listed as preserved', brief.preserve.closing === null);
  ok('the unaffected opening IS preserved', typeof brief.preserve.opening === 'string' && brief.preserve.opening.length > 10);
  ok('the brief says why the closing is in scope', (brief.editableWhy || []).length > 0, JSON.stringify(brief.editableWhy));
  ok('the concealed beat carries a do-not-reveal instruction',
    /CONCEALED/.test((brief.items.find((i) => i.id === 'julian') || {}).mustNotReveal || '')
    || !brief.items.some((i) => i.id === 'julian'));

  // When nothing material touches the boundaries, both are preserved.
  const ev2 = EBC.evaluate({ draft: greader, alreadyExtracted: true,
    beats: [BEATS[0]], verdicts: [{ id: 'band', status: 'missed', revisionId: grev }] });
  const brief2 = EBC.buildBrief(ev2, { beatsById });
  ok('an unaffected closing stays preserved', typeof brief2.preserve.closing === 'string');
  ok('nothing is editable at the boundaries then', brief2.editable.length === 0);
}

// ── F. REVERT RULES ──────────────────────────────────────────────────────────────────────────
console.log('\n--- F. revert only on malformed or regressive revisions ---');
{
  const reader = EBC.readerFacing(HAIKU);
  const rev = EBC.revisionId(reader);
  const mk = (verdicts) => EBC.evaluate({ draft: reader, alreadyExtracted: true, beats: BEATS, verdicts });
  const base = mk([
    { id: 'band', status: 'missed', revisionId: rev },
    // occurrence is supplied because the judge now STATES what happened to a required act.
    // 'performed' here is the stub's answer, not an inference from the modal wording.
    { id: 'ending', status: 'fulfilled', revisionId: rev, occurrence: 'performed',
      actionPassage: 'I could tear it away' },
    { id: 'julian', status: 'fulfilled', revisionId: rev, consequencePassage: 'Julian, standing too still at the edge of the clearing' }
  ]);

  const s1 = {};
  const noEdits = await EBC.applyOnce({ evaluation: base, state: s1, sceneKey: 'k', fullDraft: HAIKU,
    ctx: { beatsById: BEATS.reduce((m, b) => { m[b.id] = b; return m; }, {}) },
    reviseFn: async () => { await tick(); return 'a whole rewritten scene as a string'; } });
  ok('a whole-scene string is NOT accepted as a repair', noEdits.draftUsed === 'original',
    noEdits.unresolved[0] && noEdits.unresolved[0].reason);
  ok('and still publishes', noEdits.published === true);
  ok('allowance records the failure', s1._essentialFixAllowance.outcome === 'repair_failed');

  const s2 = {};
  const markers = await EBC.applyOnce({ evaluation: base, state: s2, sceneKey: 'k', fullDraft: HAIKU,
    ctx: { beatsById: BEATS.reduce((m, b) => { m[b.id] = b; return m; }, {}) },
    reviseFn: async (brief) => [{ ref: brief.regions[0].ref, op: brief.regions[0].op,
      text: 'She hesitated. <<EXPANSION_A>>oops<<END_EXPANSION>>' }] });
  ok('an edit introducing control markers is refused', markers.draftUsed === 'original',
    (markers.editsRejected[0] || {}).reason);

  const s3 = {};
  const s3ctx = { beatsById: BEATS.reduce((m, b) => { m[b.id] = b; return m; }, {}) };
  const s3auth = EBC.authorizeRepairRegions(base, s3ctx.beatsById, EBC.paragraphsOf(HAIKU));
  const s3slot = s3auth.slots[0];
  const regressedFull = EBC.spliceAuthorized(HAIKU, EBC.paragraphsOf(HAIKU),
    [{ ref: s3slot.ref, op: s3slot.op, text: 'She waited.', beatId: s3slot.beatId }]).text;
  const regress = await EBC.applyOnce({ evaluation: base, state: s3, sceneKey: 'k', fullDraft: HAIKU,
    ctx: s3ctx,
    reviseFn: async (brief) => [{ ref: brief.regions[0].ref, op: brief.regions[0].op, text: 'She waited.' }],
    recheckFn: async () => EBC.evaluate({ draft: EBC.readerFacing(regressedFull), alreadyExtracted: true, beats: BEATS,
      verdicts: [
        { id: 'band', status: 'fulfilled', revisionId: EBC.revisionId(EBC.readerFacing(regressedFull)), occurrence: 'performed', actionPassage: 'She waited.' },
        { id: 'ending', status: 'missed' },
        { id: 'julian', status: 'fulfilled', consequencePassage: 'Julian, standing too still at the edge of the clearing' }
      ] }) });
  ok('an edit that REGRESSES a fulfilled beat is reverted', regress.draftUsed === 'original', regress.reverted);
  ok('the regression names the beat', /ending/.test(regress.reverted || ''));
  ok('allowance records the regression revert', s3._essentialFixAllowance.outcome === 'reverted_regression');
  ok('the reverted text is the ORIGINAL full draft', regress.text === HAIKU);
}

// ── G. RECHECK FAILURES ARE NEVER SUCCESS ────────────────────────────────────────────────────
console.log('\n--- G. missing / malformed / failed recheck → unverified ---');
{
  const reader = EBC.readerFacing(HAIKU);
  const rev = EBC.revisionId(reader);
  const ev = EBC.evaluate({ draft: reader, alreadyExtracted: true, beats: [BEATS[0]],
    verdicts: [{ id: 'band', status: 'missed', revisionId: rev }] });
  const good = async (brief) => [{ ref: brief.regions[0].ref, op: brief.regions[0].op,
    text: 'I tore it away and stepped toward her.' }];
  const ctx1 = { beatsById: { band: BEATS[0] } };

  for (const [label, recheckFn] of [
    ['missing', undefined],
    ['malformed', async () => ({ nonsense: true })],
    ['throwing', async () => { throw new Error('recheck down'); }],
    ['null', async () => null]
  ]) {
    const st = {};
    const r = await EBC.applyOnce({ evaluation: ev, state: st, sceneKey: 'k', fullDraft: HAIKU,
      ctx: ctx1, reviseFn: good, recheckFn });
    ok('a ' + label + ' recheck does NOT report success',
      r.fixed.length === 0 && r.unresolved.length === 1 && r.unresolved[0].status === 'unverified',
      'recheckStatus=' + r.recheckStatus + ' outcome=' + st._essentialFixAllowance.outcome);
  }
  const st2 = {};
  const r2 = await EBC.applyOnce({ evaluation: ev, state: st2, sceneKey: 'k', fullDraft: HAIKU, ctx: ctx1, reviseFn: good });
  ok('the safe edit is still applied while unverified', r2.draftUsed === 'revised');
}

// ── H. ONE CORRECTION MAXIMUM, NO LOOP ───────────────────────────────────────────────────────
console.log('\n--- H. one correction, no repair loop ---');
{
  const reader = EBC.readerFacing(HAIKU);
  const rev = EBC.revisionId(reader);
  const ev = EBC.evaluate({ draft: reader, alreadyExtracted: true, beats: [BEATS[0]],
    verdicts: [{ id: 'band', status: 'missed', revisionId: rev }] });
  const state = {};
  let revisions = 0, rechecks = 0;
  const run = () => EBC.applyOnce({ evaluation: ev, state, sceneKey: 'k', fullDraft: HAIKU,
    ctx: { beatsById: { band: BEATS[0] } },
    reviseFn: async (brief) => { revisions++; return [{ ref: brief.regions[0].ref,
      op: brief.regions[0].op, text: 'I tore it away.' }]; },
    recheckFn: async () => { rechecks++; return EBC.evaluate({ draft: reader,
      alreadyExtracted: true, beats: [BEATS[0]],
      verdicts: [{ id: 'band', status: 'missed' }] }); } });

  const first = await run();
  ok('one revision, one recheck', revisions === 1 && rechecks === 1);
  ok('a still-failing recheck does not trigger another repair', revisions === 1);
  ok('the edit is kept and the issue reported unresolved',
    first.draftUsed === 'revised' && first.unresolved.length === 1,
    first.unresolved[0] && first.unresolved[0].reason);
  const second = await run();
  ok('a SECOND correction is refused', second.correction === null && revisions === 1,
    second.unresolved[0] && second.unresolved[0].reason);
  ok('the re-author path cannot claim the same allowance',
    EBC.claimCorrection(state, 'k', 're_author').granted === false);
  const st2 = {};
  const refused = await EBC.applyOnce({ evaluation: ev, state: st2, sceneKey: 'k', fullDraft: HAIKU,
    budgetClaim: () => false, reviseFn: async () => { throw new Error('must not run'); } });
  ok('a host budget refusal yields no correction and is recorded',
    refused.correction === null && refused.unresolved.length === 1);
}

// ── K. APPLICATION-OWNED REPAIR REGIONS ──────────────────────────────────────────────────────
console.log('\n--- K. the application owns the repair scope; the model cannot name a location ---');
{
  const paras = EBC.paragraphsOf(HAIKU);
  ok('paragraphs carry backend-issued refs', paras[0].ref === 'P1' && paras.length > 5, paras.length + ' paragraphs');
  ok('metadata paragraphs are not prose',
    paras.filter((p) => /^\s*\[CHARACTERS:/.test(p.text)).every((p) => p.isProse === false));
  ok('marker paragraphs are not prose',
    paras.filter((p) => /<<MICRO_EXPRESSION>>/.test(p.text)).every((p) => p.isProse === false && p.why === 'control markers'));
  ok('the branch appendix is not prose',
    paras.filter((p) => /<<EXPANSION_A>>/.test(p.text)).every((p) => p.isProse === false));

  const reader = EBC.readerFacing(HAIKU);
  const rev = EBC.revisionId(reader);
  const beatsById = BEATS.reduce((m, b) => { m[b.id] = b; return m; }, {});
  const ev = EBC.evaluate({ draft: reader, alreadyExtracted: true, beats: BEATS, verdicts: [
    { id: 'band', status: 'partial', revisionId: rev, actionPassage: 'I could tear it away', note: 'contemplated only' },
    { id: 'ending', status: 'missed', revisionId: rev },
    { id: 'julian', status: 'fulfilled', revisionId: rev, consequencePassage: 'Julian, standing too still at the edge of the clearing' }
  ] });
  const auth = EBC.authorizeRepairRegions(ev, beatsById, paras);
  ok('every authorized slot names a failed requirement',
    auth.slots.length > 0 && auth.slots.every((s) => !!ev.byId[s.beatId] && ev.byId[s.beatId].material === true));
  ok('a fulfilled beat authorizes nothing', !auth.slots.some((s) => s.beatId === 'julian'));
  ok('the anchored failure authorizes its own paragraph',
    auth.slots.some((s) => s.beatId === 'band' && s.op === 'replace'));
  ok('the absent closing beat gets an application-chosen slot',
    auth.slots.some((s) => s.beatId === 'ending'), JSON.stringify(auth.slots.map((s) => s.ref + ':' + s.op)));
  ok('authorization covers only part of the prose',
    auth.authorizedCount < auth.proseCount, auth.authorizedCount + ' of ' + auth.proseCount + ' prose paragraphs');

  // THE GAP THAT WAS OPEN: a reply that names its own region is now refused.
  const wholeScene = EBC.validateRepairReply(
    [{ ref: paras.find((p) => p.isProse && !auth.slots.some((s) => s.ref === p.ref)).ref,
       op: 'replace', text: 'An entirely different scene.' }], auth.slots, paras);
  ok('an UNAUTHORIZED prose ref is refused', wholeScene.ok === false
    && wholeScene.rejected[0].code === EBC.CP_REJECT.UNAUTHORIZED, wholeScene.rejected[0].reason);
  const everyRef = EBC.validateRepairReply(
    paras.filter((p) => p.isProse).map((p) => ({ ref: p.ref, op: 'replace', text: 'rewritten.' })),
    auth.slots, paras);
  ok('a whole-scene rewrite is refused ref by ref',
    everyRef.items.length <= auth.slots.filter((s) => s.op === 'replace').length,
    everyRef.items.length + ' accepted of ' + paras.filter((p) => p.isProse).length + ' attempted');
  ok('the unauthorized ones are reported',
    everyRef.rejected.filter((r) => r.code === EBC.CP_REJECT.UNAUTHORIZED).length > 0);
  const nonProse = EBC.validateRepairReply(
    [{ ref: paras.find((p) => !p.isProse).ref, op: 'replace', text: 'nope' }], auth.slots, paras);
  ok('a non-prose ref is refused', nonProse.rejected[0].code === EBC.CP_REJECT.NON_PROSE);
  const unknown = EBC.validateRepairReply([{ ref: 'P999', op: 'replace', text: 'x' }], auth.slots, paras);
  ok('an unknown ref is refused', unknown.rejected[0].code === EBC.CP_REJECT.UNKNOWN);
  const dup = EBC.validateRepairReply([
    { ref: auth.slots[0].ref, op: auth.slots[0].op, text: 'one' },
    { ref: auth.slots[0].ref, op: auth.slots[0].op, text: 'two' }], auth.slots, paras);
  ok('a duplicated ref is refused', dup.rejected[0].code === EBC.CP_REJECT.DUPLICATE);
  const empty = EBC.validateRepairReply([{ ref: auth.slots[0].ref, op: auth.slots[0].op, text: '  ' }], auth.slots, paras);
  ok('an empty replacement is refused', empty.rejected[0].code === EBC.CP_REJECT.EMPTY);
  const markers = EBC.validateRepairReply(
    [{ ref: auth.slots[0].ref, op: auth.slots[0].op, text: 'x <<EXPANSION_A>>' }], auth.slots, paras);
  ok('replacement text with control markers is refused', markers.rejected[0].code === EBC.CP_REJECT.NON_PROSE);
  ok('a malformed reply is refused', EBC.validateRepairReply('not json', auth.slots, paras).code === EBC.CP_REJECT.MALFORMED);

  // The splice: byte preservation outside authorized regions.
  const bandSlot = auth.slots.find((s) => s.beatId === 'band');
  const good = EBC.validateRepairReply(
    [{ ref: bandSlot.ref, op: bandSlot.op, text: 'I tore the band away and stepped toward her.' }],
    auth.slots, paras);
  const spl = EBC.spliceAuthorized(HAIKU, paras, good.items);
  ok('the authorized replacement landed', /I tore the band away and stepped toward her\./.test(spl.text));
  ok('metadata headers survive', /^\[CHARACTERS:/m.test(spl.text));
  ok('the micro-decision widget survives intact',
    /<<MICRO_EXPRESSION>>\nSay it plainly — or let it show without words\?\n<<CONTINUE>>/.test(spl.text));
  ok('both stored branches survive byte-identical',
    /I asked for him—for your father—and Fate gave me a thing instead/.test(spl.text)
    && /giving me the mercy of not being seen/.test(spl.text));
  ok('the appendix terminator survives', /<<END_EXPANSION>>/.test(spl.text));
  const untouched = paras.filter((p) => p.ref !== bandSlot.ref);
  ok('every unauthorized paragraph is byte-identical in the result',
    untouched.every((p) => spl.text.indexOf(p.text) !== -1), untouched.length + ' paragraphs checked');

  const bc = EBC.branchConsistency(spl.text, spl.applied);
  ok('branch dependency is checked (advisory only)', bc.checked === true);
}

// ── M. CHARACTER+ COVERAGE AND DELIVERED TRACKING ────────────────────────────────────────────
console.log('\n--- M. Character+ coverage: delivered, deduped, echo vs broaden ---');
{
  // Credit is for delivery, not assignment.
  let L = [];
  const directed = EBC.cpCreditDelivery(L, { character: 'Julian', sceneUid: 's1', verification: 'directed' });
  ok('a merely DIRECTED depiction earns no credit', directed.outcome === 'ignored', directed.why);
  L = EBC.cpCreditDelivery(L, { character: 'Julian', sceneUid: 's1', issue: 1, verification: 'verified', mode: null }).ledger;
  ok('a delivered depiction is credited', L.length === 1);

  // Duplicate protection: retry / navigation / re-render.
  const again = EBC.cpCreditDelivery(L, { character: 'Julian', sceneUid: 's1', issue: 1, verification: 'verified' });
  ok('the same character+scene is not double-counted', again.ledger.length === 1 && again.outcome === 'replaced');
  const repaired = EBC.cpCreditDelivery(L, { character: 'Julian', sceneUid: 's1', issue: 1,
    verification: 'verified', provenance: 'repaired', mode: 'echo_reinterpret' });
  ok('a repair REPLACES that scene\'s record rather than adding a credit',
    repaired.ledger.length === 1 && repaired.ledger[0].provenance === 'repaired'
    && repaired.ledger[0].supersedes === 'authored');
  L = repaired.ledger;
  L = EBC.cpCreditDelivery(L, { character: 'Julian', sceneUid: 's4', issue: 1, verification: 'verified', mode: 'broaden' }).ledger;
  ok('a different scene does earn a second credit', L.length === 2);

  // Coverage obligations.
  const plan = EBC.cpCoveragePlan({ issue: 1, ledger: L, participants: [
    { label: 'Julian', participation: 'major' },
    { label: 'Seren', participation: 'minor' },
    { label: 'the presiding Dohkar', participation: 'major' },
    { label: 'Lirael', participation: 'major', isPC: true },
    { label: 'the gathered First Favored', participation: 'crowd' }
  ] });
  ok('a brand-new character owes an introduction',
    plan.obligations.some((o) => o.label === 'Seren' && o.kind === 'introduction'));
  ok('the PC is included in coverage, not exempt',
    plan.obligations.some((o) => o.isPC === true && o.label === 'Lirael'));
  ok('a crowd owes no individual characterization',
    plan.excluded.some((e) => e.label === 'the gathered First Favored'));
  ok('a recurring major with 2 delivered this issue is satisfied',
    plan.satisfied.some((s) => s.label === 'Julian' && s.wanted === 2), JSON.stringify(plan.satisfied));
  ok('an introduction is neither echo nor broaden',
    plan.obligations.filter((o) => o.kind === 'introduction').every((o) => o.mode === null));

  // Mode selection is evidence-driven, not a coin flip or alternation.
  const firstOnly = [{ character: 'X', sceneUid: 'a', issue: 1, verification: 'verified', mode: null }];
  ok('an unrevisited first impression is owed an ECHO',
    EBC.cpDepictionMode(firstOnly, firstOnly).mode === 'echo_reinterpret');
  const echoed = firstOnly.concat([{ character: 'X', sceneUid: 'b', issue: 1, verification: 'verified', mode: 'echo_reinterpret' }]);
  ok('once echoed and never broadened, BROADEN is next',
    EBC.cpDepictionMode(echoed, echoed).mode === 'broaden');
  const broad = echoed.concat([
    { character: 'X', sceneUid: 'c', issue: 1, verification: 'verified', mode: 'broaden' },
    { character: 'X', sceneUid: 'd', issue: 1, verification: 'verified', mode: 'broaden' }]);
  ok('more broadenings than echoes returns to ECHO',
    EBC.cpDepictionMode(broad, broad).mode === 'echo_reinterpret');
  ok('each mode choice states its evidence',
    typeof EBC.cpDepictionMode(broad, broad).why === 'string' && EBC.cpDepictionMode(broad, broad).why.length > 20);
  // Determinism: the same history always yields the same mode (no randomness).
  ok('mode selection is deterministic',
    new Set([1, 2, 3, 4, 5].map(() => EBC.cpDepictionMode(echoed, echoed).mode)).size === 1);

  // Both modes should appear across an issue where opportunities exist.
  const twoEchoers = [
    { character: 'A', sceneUid: 'a1', issue: 2, verification: 'verified', mode: null },
    { character: 'B', sceneUid: 'b1', issue: 2, verification: 'verified', mode: null }
  ];
  const plan2 = EBC.cpCoveragePlan({ issue: 2, ledger: twoEchoers, participants: [
    { label: 'A', participation: 'major' }, { label: 'B', participation: 'major' }] });
  const modes2 = new Set(plan2.obligations.map((o) => o.mode));
  ok('an all-echo issue is pushed to include a broadening',
    modes2.has('broaden') && modes2.has('echo_reinterpret'), JSON.stringify([...modes2]));

  // Lens scarcity must not cancel required coverage, and the two editors must not stack.
  const st = {};
  EBC.cpClaimRefs(st, 's1', ['P4', 'P7']);
  ok('repair claims its regions so the lens pass can skip them',
    EBC.cpRefClaimed(st, 's1', 'P4') === true && EBC.cpRefClaimed(st, 's1', 'P9') === false);
  ok('a claim is scene-scoped', EBC.cpRefClaimed(st, 's2', 'P4') === false);
  // Checked against CODE, not prose: the module's comments discuss scarcity on purpose.
  const ebCode = readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok('coverage never reads a lens budget', !/lensBudget|_lensBudget|lensDist|cgLensRate/i.test(ebCode));
  ok('coverage has no randomness at all', !/Math\.random/.test(ebCode));

  // The SHIPPED ledger recorder now dedupes too. Source assertion only: app.js's
  // _cpRecordManifestation depends on several closures and cannot be sliced out and
  // executed the way the extraction function can.
  ok('the shipped recorder scopes dedupe to the same scene',
    /if \(!_ex \|\| _ex\.sceneUid !== at\.sceneUid\) continue;/.test(appSrc));
  ok('a repair supersedes that scene even when the FACET changed',
    /if \(_isRepair\) \{ _dupAt = _di; break; \}/.test(appSrc)
    && /same scene, different facet, repaired/.test(appSrc));
  ok('a repair retires the scene\'s other records and decrements their counts',
    /repair retired/.test(appSrc) && /_xs\.verifiedCount = Math\.max\(0, \(_xs\.verifiedCount \|\| 1\) - 1\)/.test(appSrc));
  ok('a superseded record replaces rather than appends',
    /c\.manifestations\[_dupAt\] = _rec;/.test(appSrc));
  ok('the counts do not grow on a re-record',
    /ONE RECORD PER FACET PER SCENE/.test(appSrc)
    && /st\.manifestationCount = \(st\.manifestationCount \|\| 0\) \+ 1;/.test(appSrc.split('c.manifestations.push(_rec);')[1] || ''));
}

// ── L. CHARACTER+ ASSIGNMENTS BECOME ASSESSABLE BEATS ────────────────────────────────────────
console.log('\n--- L. Character+ assignments feed the same assessment ---');
{
  const skeleton = { character_plus: [
    { character: 'the presiding Dohkar', behavior: 'perceives the misalignment before the assembly does',
      character_revelation: 'he assumes his ear is the final measure',
      facet_truth: 'In questions of sacrifice he assumes his judgement carries an authority others have not earned.',
      pc_interpretation: 'he will not wait for Lirael to rule first',
      pc_lens_operation: 'EMOTIONAL_CONCLUSION_BEFORE_EVIDENCE',
      guardrails: 'do not let him voice the facet' },
    { character: 'Julian', behavior: 'stands too still at the edge', not_physically_present: false,
      facet_truth: 'He is protecting the worst hour of his life.' },
    { character: 'her mother', behavior: 'remembered warning', not_physically_present: true, mode: 'recalled' }
  ] };
  const beats = EBC.characterPlusBeats(skeleton);
  ok('one beat per assignment', beats.length === 3);
  ok('ids are stable and namespaced', beats[0].id === 'cplus:the_presiding_dohkar');
  ok('all are essential and kind=character_plus',
    beats.every((b) => b.essential === true && b.kind === 'character_plus'));
  ok('an on-stage assignment is an on_page_action', beats[0].evidenceKind === 'on_page_action');
  ok('a RECALLED introduction does not demand an on-stage act',
    beats[2].evidenceKind === 'internal_recognition' && beats[2].mode === 'recalled_or_reported');
  ok('the governing PC interpretation is carried', /will not wait for Lirael/.test(beats[0].pcInterpretation));
  ok('the viewpoint lens is carried', beats[0].viewpoint.lensOperation === 'EMOTIONAL_CONCLUSION_BEFORE_EVIDENCE');
  ok('the viewpoint bound forbids omniscience', /must not convert her inference into omniscient fact/.test(beats[0].viewpoint.bounded));
  // DISCLOSURE vs STYLE. An unsealed canonical facet is a style constraint, not a secret.
  ok('an unsealed canonical facet is NOT treated as a secret',
    beats[0].disclosure.sealed === false
    && /assumes his judgement carries an authority/.test(beats[0].disclosure.canonicalTruth));
  ok('it carries a style constraint, not a prohibition',
    /Do not paste this as narration/.test(beats[0].disclosure.styleConstraint));
  ok('and it PERMITS a grounded admission or another\'s observation',
    /grounded self-admission/.test(beats[0].disclosure.permitted)
    && /forbidden is the dossier, not the insight/.test(beats[0].disclosure.permitted));
  {
    // A genuinely sealed facet stays protected.
    const sealedBeats = EBC.characterPlusBeats({ character_plus: [
      { character: 'Julian', behavior: 'stands too still',
        facet_truth: 'He wished the sacrifice out of the public record.',
        guardrails: 'SEALED until the reveal — do not reveal, do not hint' }] });
    ok('a sealed facet IS protected as a secret',
      sealedBeats[0].disclosure.sealed === true
      && /may not reach the page in any form yet/.test(sealedBeats[0].disclosure.note));
    const sb = EBC.buildBrief(
      EBC.evaluate({ draft: EBC.readerFacing(HAIKU), alreadyExtracted: true, beats: sealedBeats,
        verdicts: [{ id: sealedBeats[0].id, status: 'missed',
          revisionId: EBC.revisionId(EBC.readerFacing(HAIKU)) }] }),
      { beatsById: { [sealedBeats[0].id]: sealedBeats[0] } });
    ok('a sealed beat\'s brief item carries a real prohibition',
      /^SEALED: /.test(sb.items[0].mustNotReveal || ''));
    ok('and no expression permission', !sb.items[0].expressionPermitted);
  }
  ok('the description rules out appearance and tells as sufficient',
    /not appearance, not an involuntary tell, not a label/.test(beats[0].description));

  // It reaches the brief with its viewpoint and disclosure intact.
  const reader = EBC.readerFacing(HAIKU);
  const rev = EBC.revisionId(reader);
  const beatsById = beats.reduce((m, b) => { m[b.id] = b; return m; }, {});
  const ev = EBC.evaluate({ draft: reader, alreadyExtracted: true, beats,
    verdicts: [{ id: 'cplus:the_presiding_dohkar', status: 'partial', revisionId: rev,
      actionPassage: 'The presiding Dohkar\'s attention sharpened', note: 'action present, no viewpoint judgment' }] });
  const brief = EBC.buildBrief(ev, { beatsById });
  const item = brief.items.find((i) => i.id === 'cplus:the_presiding_dohkar');
  ok('a Character+ failure becomes a brief item', !!item);
  ok('the item names the character', item.character === 'the presiding Dohkar');
  ok('the item carries the PC interpretation', /will not wait/.test(item.pcInterpretation));
  ok('the item carries the viewpoint bound', !!item.viewpoint && !!item.viewpoint.bounded);
  ok('an unsealed facet produces NO prohibition on the repair', item.mustNotReveal === null);
  ok('it produces a style note instead', /Do not paste this as narration/.test(item.styleNote || ''));
  ok('and tells the repair the insight MAY be expressed',
    /grounded self-admission/.test(item.expressionPermitted || ''));
  ok('unverified Character+ beats are not material',
    ev.material.length === 1 && ev.unverified.length === 2);

  // ── OWNERSHIP MOVED, AND THESE ASSERTIONS MOVED WITH IT (Roman 2026-10-16) ─────────────────
  // These two used to assert that Character+ beats were concatenated into the judge's beat set
  // (`_ebBeats = _ebBeats.concat(_ebCp)`). That is now deliberately false: the production owner
  // of Character+ is the DEDICATED EDITOR, and feeding the same obligations to the judge chain
  // as well would put two authorities on one scene's characterisation and charge for it twice.
  // The assertions now check the split rather than the old wiring.
  ok('Character+ no longer travels down the judge path',
    !/_ebBeats = _ebBeats\.concat\(_ebCp\)/.test(appSrc)
    && /CHARACTER\+ NO LONGER TRAVELS DOWN THIS PATH/.test(appSrc));
  ok('the judge path keeps PLOT hard beats only',
    /_ebPc\.hardBeats\.filter\(/.test(appSrc)
    && /What remains here is PLOT hard/.test(appSrc));
  ok('the dedicated editor owns Character+ and receives the same skeleton',
    /var _ebSk = \(window\.state && window\.state\.sceneSkeleton\) \|\| null;/.test(appSrc)
    && /editorPassOnFinalizedDraft\(\{/.test(appSrc)
    && /skeleton: \(_ebSk && _ebOwns\) \? _ebSk : null,/.test(appSrc));
  ok('and the editor path is driven by the coverage scheduler, not by the assignment alone',
    /_EBC\.cpCoveragePlan\(\{/.test(appSrc) && /coveragePlan: _cpPlan,/.test(appSrc));
  // Scene ownership travels with the authoring operation; the hash only binds a verdict
  // to a text VERSION. The earlier "first scene to claim these bytes wins" rule is gone.
  ok('scene identity is carried from the author request, not re-derived',
    /SCENE IDENTITY TRAVELS WITH THE AUTHORING OPERATION/.test(appSrc)
    && /state\._authoringScene = \{ ticket: 'auth#' \+ _cpAuthoringTicketSeq,/.test(appSrc));
  ok('the ticket is captured as a value at dispatch, not read from the slot later',
    /CAPTURE THE AUTHORING TICKET AT DISPATCH/.test(appSrc)
    && /var _authoring = _ebTicket \|\|/.test(appSrc));
  ok('an established cast identity is LINKED, never portfolio-generated',
    /DELIBERATELY ABSENT: authorProfile \/ cPlusFacets \/ psychology/.test(appSrc)
    && /refusing to mint an identity for a name the/.test(appSrc));
  ok('a declared role instance counts as an established identity',
    /A ROLE FIGURE IS ALSO AN ESTABLISHED IDENTITY/.test(appSrc)
    && /role:' \+ roleInst\.role_instance_id/.test(appSrc));
  ok('a facet-less PC depiction is credited by its assignment identity',
    /A DEPICTION WITHOUT A FACET IS STILL A DEPICTION/.test(appSrc)
    && /'assignment:' \+ _assignmentId/.test(appSrc));
  ok('a revision hash binds a verdict to a text version, not ownership',
    /A REVISION HASH BINDS A VERDICT TO A TEXT VERSION\. IT IS NOT OWNERSHIP\./.test(appSrc)
    && !/was already checked as scene/.test(appSrc));
  ok('delivery credit goes through the existing recorder, not direct writes',
    /_cpRecordManifestation\(_ent, \{/.test(appSrc)
    && /History is never written directly/.test(appSrc));
  ok('credit is earned by authored delivery as well as by repair',
    /repair\n                  \/\/ must not be the only route to credit/.test(appSrc)
    || /must not be the only route to credit/.test(appSrc));
  ok('the correction allowance is keyed per scene', /sceneKey: String\(\(window\.state && window\.state\.storyId\) \|\| ''\) \+ ':scene' \+ _ebScene/.test(appSrc));
  ok('the directive compares scene numbers on one convention',
    /THE COMPARISON MUST USE THE STAMP'S OWN CONVENTION/.test(appSrc)
    && /Math\.max\(\(Array\.isArray\(state\.scenes\) \? state\.scenes\.length : 0\),/.test(appSrc));
  ok('an internal ref is never presented as a character name',
    /AN INTERNAL REF IS NOT A CHARACTER NAME/.test(appSrc));
  ok('the PC is left as normalisation resolved her',
    /Leave every pc ref exactly as normalisation left it/.test(appSrc));
}

// ── I. EVIDENCE RULES BY KIND ────────────────────────────────────────────────────────────────
console.log('\n--- I. evidence rules by kind ---');
{
  const reader = EBC.readerFacing(HAIKU);
  const rev = EBC.revisionId(reader);
  const one = (beat, verdict) => EBC.evaluate({ draft: reader, alreadyExtracted: true,
    beats: [beat], verdicts: [verdict] }).findings[0];

  // UPDATED 2026-10-15. Previously a passing claim with only a consequence was inferred to be
  // asserted_only. Inference is no longer how that is decided: the judge STATES the occurrence,
  // so a claim with no quotation of the act is simply unevidenced — unverified — and
  // asserted_only is what occurrence:"asserted" produces. The distinction is kept, and is now
  // answered rather than guessed.
  ok('completion claimed with no quotation of the act → unverified, not a story defect',
    (() => { const f = one({ id: 'x', essential: true, evidenceKind: 'on_page_action' },
      { id: 'x', status: 'fulfilled', revisionId: rev, occurrence: 'performed',
        consequencePassage: 'The assembly drew the obvious inference' });
      return f.status === 'unverified' && f.material === false; })());
  ok('the same claim with occurrence:"asserted" → asserted_only, material',
    (() => { const f = one({ id: 'x', essential: true, evidenceKind: 'on_page_action' },
      { id: 'x', status: 'fulfilled', revisionId: rev, occurrence: 'asserted',
        actionPassage: 'let the room draw the only conclusion it could draw',
        consequencePassage: 'let the room draw the only conclusion it could draw' });
      return f.status === 'asserted_only' && f.material === true; })());
  ok('a concealed beat completes on consequence alone',
    one({ id: 'y', essential: true, evidenceKind: 'concealed_action_with_visible_consequence' },
      { id: 'y', status: 'fulfilled', revisionId: rev, consequencePassage: 'Julian, standing too still at the edge of the clearing' }).status === 'fulfilled');
  ok('revealing a concealed act is a disclosure breach',
    one({ id: 'y', essential: true, evidenceKind: 'concealed_action_with_visible_consequence' },
      { id: 'y', status: 'fulfilled', revisionId: rev, actionPassage: 'Julian, standing too still at the edge of the clearing' }).status === 'contradicted');
  ok('a paraphrase is unverified, not passed',
    one({ id: 'z', essential: true, evidenceKind: 'on_page_action' },
      { id: 'z', status: 'fulfilled', revisionId: rev, actionPassage: 'she tore it off and spoke' }).status === 'unverified');
  ok('a stale revision id is unverified',
    one({ id: 'z', essential: true, evidenceKind: 'on_page_action' },
      { id: 'z', status: 'fulfilled', revisionId: 'r-other-1', actionPassage: 'I could tear it away' }).status === 'unverified');
  ok('a malformed status is unverified',
    one({ id: 'z', essential: true, evidenceKind: 'on_page_action' },
      { id: 'z', status: 'looks_ok', revisionId: rev }).status === 'unverified');
  ok('unverified is not material (nothing to edit toward)',
    one({ id: 'z', essential: true, evidenceKind: 'on_page_action' },
      { id: 'z', status: 'looks_ok', revisionId: rev }).material === false);
}

// ── J. CHARACTER+ DIAGNOSTICS ARE ADVISORY ───────────────────────────────────────────────────
console.log('\n--- J. Character+ diagnostics are advisory only ---');
{
  const dohkar = (REQ.match(/VISIBLE ACTION — MUST OCCUR: He perceives[^\n]*/) || [''])[0];
  ok('the assignment text was located in the request', dohkar.length > 80);
  const gEcho = EBC.instructionEcho(GROK, dohkar, 8);
  ok('Grok reproduced the assignment wording', !!gEcho,
    gEcho ? gEcho.words + ' words' : 'none');
  ok('Haiku did not', !EBC.instructionEcho(HAIKU, dohkar, 8));
  ok('an echo carries an advisory caveat, not a verdict',
    typeof EBC.characterPlusEvidenceSignals('x').advisory === 'string');

  const sig = EBC.characterPlusEvidenceSignals('Julian stood at the edge of the gathering, perfectly still');
  ok('signals report what they see without judging',
    sig.containsTell === true && sig.containsChosenAct === false && !('tellOnly' in sig));
  const chosen = EBC.characterPlusEvidenceSignals('Julian answered before anyone finished questioning him');
  ok('a chosen act is reported as such', chosen.containsChosenAct === true);

  const cov = EBC.characterPlusCoverage(['Lirael', 'Seren', 'the presiding Dohkar'],
    ['Lirael', 'Julian', 'Seren', 'the presiding Dohkar']);
  ok('an unassigned required cast member is surfaced',
    cov.unassigned.length === 1 && cov.unassigned[0] === 'Julian');
  ok('coverage is framed as a planning gap, not a prose failure',
    /not a demonstrated characterisation failure/.test(cov.advisory));

  // No diagnostic may create a material finding on its own.
  const reader = EBC.readerFacing(GROK);
  const evNoVerdict = EBC.evaluate({ draft: reader, alreadyExtracted: true,
    beats: [{ id: 'dohkar_cplus', essential: true, kind: 'character_plus', evidenceKind: 'on_page_action' }],
    verdicts: [] });
  ok('an echo alone does not make a beat material', evNoVerdict.material.length === 0);
  ok('it is reported unverified, awaiting the judge', evNoVerdict.unverified.length === 1);
}

// ── N. THE ACTUAL INPUTS PRODUCED FOR THE REAL CAST (report, not assertions) ──────────────────
console.log('\n--- N. actual coverage inputs for First Sacrifice Issue 1 ---');
{
  // The cast as the frozen request declares it: PHYSICALLY PRESENT (request line 1055).
  const participants = [
    { label: 'Lirael', participation: 'major', isPC: true },
    { label: 'Seren', participation: 'major' },
    { label: 'Julian', participation: 'major' },
    { label: 'the presiding Dohkar', participation: 'minor' },
    { label: 'the gathered First Favored', participation: 'crowd' }
  ];
  console.log('  SCENE 1, nothing delivered yet:');
  EBC.cpCoveragePlan({ issue: 1, ledger: [], participants }).obligations.forEach((o) =>
    console.log('    ' + (o.isPC ? 'PC  ' : '    ') + o.label.padEnd(24) + o.kind.padEnd(13)
      + 'due=' + String(o.due).padEnd(14) + 'mode=' + (o.mode || '(first impression)')));
  EBC.cpCoveragePlan({ issue: 1, ledger: [], participants }).excluded.forEach((e) =>
    console.log('    --  ' + e.label.padEnd(24) + 'excluded — ' + e.why));

  // After scene 1 delivered all four introductions.
  let L2 = [];
  ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar'].forEach((c) => {
    L2 = EBC.cpCreditDelivery(L2, { character: c, sceneUid: 's1', issue: 1, ordinal: 1, verification: 'verified' }).ledger;
  });
  const mid = EBC.cpCoveragePlan({ issue: 1, ledger: L2, participants });
  console.log('  LATER IN ISSUE 1, after four delivered introductions:');
  mid.obligations.forEach((o) => console.log('    ' + (o.isPC ? 'PC  ' : '    ') + o.label.padEnd(24)
    + o.kind.padEnd(13) + (o.deliveredThisIssue + '/' + o.wanted).padEnd(6) + 'mode=' + o.mode));
  mid.obligations.forEach((o) => console.log('        why mode: ' + o.label + ' — ' + o.modeWhy));
  mid.satisfied.forEach((s) => console.log('    OK  ' + s.label.padEnd(24) + s.delivered + '/' + s.wanted + ' delivered'));
  ok('both modes appear across the issue where opportunities exist',
    new Set(mid.obligations.map((o) => o.mode)).size === 2,
    JSON.stringify([...new Set(mid.obligations.map((o) => o.mode))]));
  ok('the PC carries a recurring obligation like anyone else',
    mid.obligations.some((o) => o.isPC && o.kind === 'recurring'));
}

// ── O. BIBLE MATERIAL DERIVED FROM REAL AUTHORED CANON ───────────────────────────────────────
console.log('\n--- O. bible material, derived from the seed\'s own cPlusFacets ---');
{
  // The presiding Dohkar's REAL authored facets (app.js:134754+), field names and content as shipped.
  const dohkar = [
    { facet_id: 'presiding_dohkar_ritual_contempt', category: 'worldview',
      canonical_truth: 'Routine ceremony rarely deserves his full attention, and he makes little effort to disguise that judgment.',
      possible_pressures: [
        { text: 'a rite he has performed many times' },
        { text: 'a procedural step nobody checks' }],
      forbidden_restatements: [
        { forbid: 'bored by the (?:rite|ceremony|ritual)', why: 'that is the truth said out loud, not an act it can be inferred from' }] },
    { facet_id: 'presiding_dohkar_sacrificial_arrogance', category: 'contradiction',
      canonical_truth: 'In questions of sacrifice he assumes his judgement carries an authority that other people have not earned.',
      possible_pressures: [
        { text: 'an offering being named aloud' },
        { text: 'a cost he judges too small for what is being asked' },
        { text: 'a wish misaligning under his ear before the supervisor has ruled' }],
      forbidden_restatements: [{ forbid: 'oversteps|assumes authority', why: 'the truth named instead of performed' }] },
    { facet_id: 'presiding_dohkar_compulsive_pedagogy', category: 'habit',
      canonical_truth: 'With children he turns mistakes, questions and even play into lessons; teaching is his habitual form of attention.',
      possible_pressures: [{ text: 'a youth performing a rite for the first time' }],
      forbidden_restatements: [{ forbid: 'cannot help correcting', why: 'the habit named instead of performed' }] }
  ];
  const bib = EBC.cpBibleMaterial(dohkar);
  ok('material derives from canon with no model call', bib.ok === true && /no model call/.test(bib.derivation));
  ok('a FIRST IMPRESSION is chosen with circumstances it can appear in',
    !!bib.firstImpression && bib.firstImpression.circumstances.length >= 2,
    bib.firstImpression.facetId + ' · ' + bib.firstImpression.circumstances.length + ' circumstance(s)');
  ok('the first impression expresses an authored facet, not a new one',
    dohkar.some((f) => f.facet_id === bib.firstImpression.facetId
      && f.canonical_truth === bib.firstImpression.expressesFacet));
  ok('ECHO material revisits the SAME facet under a new condition',
    bib.echoMaterial.length >= 1 && bib.echoMaterial.every((e) => e.facetId === bib.firstImpression.facetId),
    bib.echoMaterial.length + ' echo condition(s)');
  ok('echo asks for a new implication rather than a rewording',
    /not the same reading in new words/.test(bib.echoMaterial[0].asks));
  ok('BROADENING material offers other grounded facets',
    bib.broadeningMaterial.length === 2
    && bib.broadeningMaterial.every((b) => b.facetId !== bib.firstImpression.facetId),
    bib.broadeningMaterial.map((b) => b.facetId).join(', '));
  ok('DISCLOSURE limits carry every canonical truth as unstated',
    bib.disclosureLimits.mustRemainUnstated.length === 3);
  ok('and carry the canon\'s own forbidden restatements with their reasons',
    bib.disclosureLimits.forbiddenRestatements.length === 3
    && bib.disclosureLimits.forbiddenRestatements.every((f) => f.pattern && f.why && f.facetId),
    JSON.stringify(bib.disclosureLimits.forbiddenRestatements.map((f) => f.facetId)));
  ok('no personality is overwritten — truths pass through verbatim',
    bib.disclosureLimits.mustRemainUnstated.every((t) => dohkar.some((f) => f.canonical_truth === t)));
  ok('a character with no facets is reported as an INPUT gap, not improvised',
    EBC.cpBibleMaterial([]).ok === false && /input gap/.test(EBC.cpBibleMaterial([]).why));
  ok('derivation is deterministic', EBC.cpBibleMaterial(dohkar).firstImpression.facetId
    === EBC.cpBibleMaterial(dohkar).firstImpression.facetId);

  console.log('  DERIVED, for the presiding Dohkar:');
  console.log('    FIRST IMPRESSION : ' + bib.firstImpression.facetId);
  bib.firstImpression.circumstances.forEach((c) => console.log('        when: ' + c));
  bib.echoMaterial.forEach((e) => console.log('    ECHO             : under "' + e.newCondition + '"'));
  bib.broadeningMaterial.forEach((b) => console.log('    BROADEN          : ' + b.facetId + ' (' + b.category + ')'));
  console.log('    DISCLOSURE       : ' + bib.disclosureLimits.mustRemainUnstated.length
    + ' truths unstated, ' + bib.disclosureLimits.forbiddenRestatements.length + ' forbidden restatements');
}

// ── P. THE CHAIN, AND THE PRODUCER CHANGES IT DEPENDS ON ─────────────────────────────────────
console.log('\n--- P. chain wiring (source assertions on app.js) ---');
{
  ok('1. continuation stage handoff: a validated planner stage fills an authored row with no stage',
    /authored row carried no stage/.test(appSrc)
    && /_cpGeneratedStage\[String\(_sceneN\)\]/.test(appSrc.split('var _asgGenStage = null;')[1] || ''));
  ok('   grounding is preserved — only a ref-validated stage qualifies',
    /this stage passed ref validation/.test(appSrc));
  ok('2. coverage plan is called from the continuation assignment producer',
    /EssentialBeatCheck\.cpCoveragePlan\(/.test(appSrc));
  // The ledger reader now admits TWO delivering tiers, because the dedicated editor writes no
  // verified records and a `verified`-only filter meant nothing it ever did could satisfy an
  // introduction. The tier travels on every row, so an operational record is never mistaken for
  // a judge-checked one.
  ok('   it reads the DELIVERED ledger, not plans',
    /ledger: _cpDeliveredFlat\(s\)/.test(appSrc)
    && /EssentialBeatCheck\.cpCountsAsDepiction\(m\)/.test(appSrc));
  ok('   and it carries the tier rather than flattening it to "verified"',
    /verification: m\.verification,/.test(appSrc)
    && /semanticallyVerified: m\.verification === 'verified',/.test(appSrc)
    && !/verification: 'verified' \}\);/.test(appSrc));
  ok('   the PC is a participant with isPC from the stage',
    /isPC: !!\(os && os\.kind === 'pc'\)/.test(appSrc));
  ok('3. the obligation selects the facet (bible → obligation → assignment)',
    /EssentialBeatCheck\.cpBibleMaterial\(facetsById\[cand\.id\]/.test(appSrc)
    && /_narrow = mine\.filter\(function \(o\) \{ return o\.facet_id === _bib\.firstImpression\.facetId/.test(appSrc));
  ok('   grounding outranks cadence — a mode with no grounded option does not invent one',
    /grounding outranks cadence/.test(appSrc));
  ok('4. the obligation travels onto the assignment',
    /THE OBLIGATION TRAVELS WITH THE ASSIGNMENT/.test(appSrc) && /coverage: \(function \(\)/.test(appSrc));
  ok('5. it reaches the AUTHOR directive',
    /THIS IS A RETURN, NOT A RESTATEMENT/.test(appSrc) && /THIS BROADENS/.test(appSrc));
  ok('6. it reaches the REPAIR brief',
    /owes: \(b\.coverage && b\.coverage\.kind === 'recurring'\)/.test(
      readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8')));
  ok('7. PC first-person modes are in the author directive',
    /SELF-PERCEPTION —/.test(appSrc) && /ADMISSION —/.test(appSrc)
    && /RATIONALISATION —/.test(appSrc) && /BLIND SPOT —/.test(appSrc)
    && /ANOTHER\\'S OBSERVATION, THEN HER RESPONSE/.test(appSrc));
  ok('   the observation mode is bounded: a claim, not established truth',
    /is a CLAIM, never established truth/.test(appSrc)
    && /Do NOT invent a prior relationship/.test(appSrc));
  ok('   player agency is preserved',
    /do NOT decide an action the player owns in order to characterise her/.test(appSrc));
  ok('   the old blanket ban on another character\'s read is gone',
    !/never as another character's read of her\. NEVER invent/.test(appSrc));
}

// ── Q. LOVE INTEREST FIRST DEPICTION = SOCIAL PROOF (standing rule, not one character) ───────
console.log('\n--- Q. LI first Character+ must be social proof + PC interpretation ---');
{
  const reader = EBC.readerFacing(HAIKU);
  const rev = EBC.revisionId(reader);
  const mk = (over) => EBC.characterPlusBeats({ character_plus: [Object.assign({
    character: 'Julian', isLI: true, first_mention: true,
    behavior: 'stands at the edge of the gathering',
    facet_truth: 'He is accustomed to being respected without asserting rank.',
    coverage: { kind: 'introduction' }
  }, over || {})] })[0];

  const li = mk();
  ok('an LI first depiction takes the social-proof rule',
    li.evidenceKind === 'social_proof_with_pc_interpretation' && li.requiresSocialProof === true);
  ok('it needs BOTH a response and an interpretation',
    EBC.EVIDENCE_RULES.social_proof_with_pc_interpretation.needsAction === true
    && EBC.EVIDENCE_RULES.social_proof_with_pc_interpretation.needsConsequence === true);
  ok('it does not require intimacy, rank, fame or a crowd',
    li.socialProof.doesNotRequire.length === 4
    && li.socialProof.doesNotRequire.join('|').includes('crowd'));
  ok('appearance / tells / attraction cannot satisfy it',
    li.socialProof.cannotBeSatisfiedBy.join('|').includes('appearance')
    && li.socialProof.cannotBeSatisfiedBy.join('|').includes('attractive'));

  // The rule is driven by the LI flag + obligation, not by a name.
  const nonLI = mk({ character: 'Seren', isLI: false });
  ok('a non-LI introduction is NOT forced into social proof',
    nonLI.evidenceKind === 'on_page_action' && !nonLI.requiresSocialProof);
  const liLater = mk({ first_mention: false, coverage: { kind: 'recurring', mode: 'broaden' } });
  ok('a LATER LI depiction need not keep staging social proof',
    liLater.evidenceKind === 'on_page_action' && !liLater.requiresSocialProof);
  const liRecalled = mk({ not_physically_present: true, mode: 'recalled' });
  ok('a recalled LI introduction is not asked to stage an on-stage response',
    liRecalled.evidenceKind === 'internal_recognition');

  // Evaluation: the deterministic floor.
  // UPDATED 2026-10-15. The judge now owes four NAMED social-proof components, an occurrence and
  // a facet answer. These cases test the FLOOR (who responds to whom, appearance vocabulary,
  // same-sentence spans), not the contract, so the helper fills the contract fields from the
  // passages under test and each case still exercises exactly what it did before. A case that
  // wants a component or an occurrence missing overrides it explicitly.
  const one = (verdict) => {
    const q = (x) => (x == null ? undefined : x);
    const full = Object.assign({
      id: li.id, revisionId: rev, occurrence: 'performed',
      characterPlusLanded: true, assignedFacetDelivered: true,
      facetQuote: q(verdict.consequencePassage || verdict.actionPassage),
      socialProof: {
        responder:      { named: 'the assembly', quote: q(verdict.actionPassage) },
        recipient:      { named: 'Julian',       quote: q(verdict.actionPassage) },
        response:       { named: 'they moved',   quote: q(verdict.actionPassage) },
        interpretation: { named: 'she read it',  quote: q(verdict.consequencePassage) } }
    }, verdict);
    return EBC.evaluate({ draft: reader, alreadyExtracted: true, beats: [li],
      verdicts: [full] }).findings[0];
  };
  ok('response + interpretation, both verbatim → fulfilled',
    one({ status: 'fulfilled',
      actionPassage: 'The gathered assembly began to move—not toward me, but away',
      consequencePassage: 'They felt it too. The wrongness.' }).status === 'fulfilled');
  ok('a response with no interpretation is not a pass',
    one({ status: 'fulfilled',
      actionPassage: 'The gathered assembly began to move—not toward me, but away' }).status === 'unverified');
  // WHO RESPONDS TO WHOM — and the detection is ADVISORY. A keyword miss must never override a
  // supported judgment, so nothing here changes a status.
  ok('a supported judgment is never overridden by the responder scan',
    one({ status: 'fulfilled',
      actionPassage: 'Julian, standing too still at the edge of the clearing',
      consequencePassage: 'They felt it too. The wrongness.' }).status === 'fulfilled');
  ok('the LI\'s own reaction is still FLAGGED as a signal',
    one({ status: 'fulfilled',
      actionPassage: 'Julian, standing too still at the edge of the clearing',
      consequencePassage: 'They felt it too. The wrongness.' })
      .socialProofSignals.responder.onlySubjectIsLI === true);
  ok('signals say plainly that they do not set the status',
    /do not set or change the status/.test(one({ status: 'fulfilled',
      actionPassage: 'Julian, standing too still at the edge of the clearing',
      consequencePassage: 'They felt it too. The wrongness.' }).socialProofSignals.note));
  // The two regression examples, on the signal itself.
  ok('"Heads turned toward Julian" reads as a response (metonymic responder)',
    EBC.socialProofResponder('Heads turned toward Julian', 'Julian', []).onlySubjectIsLI === false);
  ok('"Julian adjusted his sleeve" does not',
    EBC.socialProofResponder('Julian adjusted his sleeve', 'Julian', []).onlySubjectIsLI === true);
  ok('"every eye went to him" reads as a response',
    EBC.socialProofResponder('every eye in the clearing went to him', 'Julian', []).onlySubjectIsLI === false);
  ok('a THIRD PARTY\'S INVOLUNTARY reaction is NOT downgraded',
    one({ status: 'fulfilled',
      actionPassage: 'The gathered First Favored began to murmur—a soft susurration of alarm',
      consequencePassage: 'They felt it too. The wrongness.' }).status === 'fulfilled');
  ok('appearance vocabulary alone does not downgrade anything',
    one({ status: 'fulfilled', actionPassage: 'skin in a thousand shades',
      consequencePassage: 'They felt it too. The wrongness.' }).status === 'fulfilled');
  ok('appearance / tell words survive as ADVISORY signals only',
    (() => { const f = one({ status: 'fulfilled', actionPassage: 'skin in a thousand shades',
      consequencePassage: 'They felt it too. The wrongness.' });
      return !!f.socialProofSignals && f.socialProofSignals.advisory.containsAppearance === true
        && f.status === 'fulfilled'; })());
  ok('the response and the interpretation may be the SAME sentence',
    one({ status: 'fulfilled',
      actionPassage: 'The gathered assembly began to move—not toward me, but away',
      consequencePassage: 'The gathered assembly began to move—not toward me, but away' }).status === 'fulfilled');
  ok('a named bystander from the roster counts as a responder',
    EBC.socialProofResponder('Seren looked up at him and did not finish the line',
      'Julian', [{ label: 'Seren' }]).onlySubjectIsLI === false);
  ok('an involuntary reaction BY someone else is explicitly admitted',
    /An involuntary reaction by someone else IS social proof/.test(
      EBC.socialProofResponder('x', 'Julian', []).note));

  // The requirement reaches the targeted repair.
  const ev = EBC.evaluate({ draft: reader, alreadyExtracted: true, beats: [li],
    verdicts: [{ id: li.id, status: 'missed', revisionId: rev }] });
  const brief = EBC.buildBrief(ev, { beatsById: { [li.id]: li } });
  ok('the repair brief carries the social-proof requirement',
    brief.items[0].requiresSocialProof === true
    && /STAGED RESPONSE BY ANOTHER PERSON/.test(brief.items[0].socialProof.needs));
  ok('and carries the interpretation requirement',
    /her reading is the\s+Character\+/.test(brief.items[0].socialProof.thenPCInterprets));
  // The style default reaches the repair brief, not only the author request.
  ok('the brief says the response and her reading MAY share one sentence',
    /MAY OCCUPY THE SAME SENTENCE/.test(brief.items[0].socialProof.thenPCInterprets));
  ok('the brief prefers integration over appending a block',
    /Appending a block of new prose to the end of a paragraph is the last resort/.test(brief.style.preferIntegration));
  ok('the brief forbids staging then explaining',
    /do not add a sentence explaining what it meant/.test(brief.style.compression));
  ok('the brief preserves the doctrine\'s breadth (not action-only)',
    /IT NEED NOT BE AN ACTION/.test(brief.style.breadth)
    && /corrected assumption/.test(brief.style.breadth));
  ok('the brief permits observed-only or observer-only',
    /NO BEAT OWES EVERY FUNCTION/.test(brief.style.connection));
  ok('the brief forbids naming a new bystander',
    /Do NOT give a bystander a name/.test(brief.style.noNewCast));
  ok('the brief allows an implicit viewpoint',
    /She does not have to declare what she felt/.test(brief.style.implicitViewpoint));
  ok('no model-facing string carries a pasteable exemplar sentence',
    !/misalignment hit the gathering like a wave/i.test(JSON.stringify(brief)));

  // Grounded opportunities come from existing facets + this scene's facts.
  const sp = EBC.cpSocialProofOpportunities([
    { facet_id: 'julian_status_without_display', category: 'value',
      canonical_truth: 'He is accustomed to being respected without asserting rank.',
      possible_pressures: [
        { text: 'a peer the assembly defers to in his presence' },
        { text: 'a quiet room with nobody watching' }] }],
    { facts: [{ evidence_id: 'E7', pressureEligible: true,
        text: 'the assembly turns and two or three look to him before the presiding Dohkar' }] });
  ok('an opportunity is derived only from a condition involving others',
    sp.ok === true && sp.opportunities.length === 1
    && /assembly defers/.test(sp.opportunities[0].condition));
  ok('it is paired with the scene fact that can stage it',
    sp.opportunities[0].stageableFrom[0] === 'E7');
  ok('no qualifying condition is reported as an input gap, not invented',
    EBC.cpSocialProofOpportunities([{ facet_id: 'x', possible_pressures: [{ text: 'alone at night' }] }]).ok === false);

  // General path, not a Julian exception.
  ok('the author directive gates on the LI resolver, never a name',
    /\(_cpRowIsLI\(c\) && \(c\.first_mention \|\| \(c\.coverage && c\.coverage\.kind === 'introduction'\)\)\)/.test(appSrc)
    && !/Julian/.test((appSrc.match(/SOCIAL PROOF FIRST[\s\S]{0,1200}/) || [''])[0]));
  ok('the resolver works for a planner-supplied Scene-1 row too',
    /function _cpRowIsLI\(c\)/.test(appSrc)
    && /a Scene-1 row comes from the opening\s+\/\/ planner and carries no such field/.test(appSrc));
  ok('the beat builder accepts the LI name for planner-supplied rows',
    /var _liName = String\(opts\.liName \|\| ''\)\.trim\(\);/.test(
      readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8')));
  ok('the LI is identified from the story field, not hardcoded',
    /s\.loveInterestName \|\| s\.partnerName/.test(appSrc));
  ok('Julian\'s social proof is a staged response by others, at the late moment',
    /two or three of them look to JULIAN before they look to the presiding Dohkar/.test(appSrc)
    && /AT THIS MOMENT AND NOT BEFORE/.test(appSrc));
  ok('it reveals nothing about his wish and does not displace Seren',
    /nothing about what he wants/.test(appSrc) && /Do not let this displace Seren/.test(appSrc));
}

console.log('\n' + '='.repeat(72));
console.log('  ' + PASS + '/' + (PASS + FAIL) + (FAIL ? '  — FAILURES PRESENT' : '  PASS'));
console.log('  INTEGRATION + DETERMINISTIC ONLY. All verdicts were stubs.');
console.log('  Semantic-checker accuracy is UNTESTED. app.js call site verified by source assertion.');
console.log('='.repeat(72));
process.exit(FAIL ? 1 : 0);
