// OWNERSHIP OF SUBMISSION PROVENANCE — against the SHIPPED functions. Provider-free, $0.
//
// My previous control used handwritten ownedBy/commitAccepts stand-ins, so it passed while the
// real _sceneLedgerCommit still (a) accepted attempt A's supplied snapshot with B active, because
// `_rp.attemptId != null` tests existence rather than equality, and (b) recovered a card from
// shared state when submissionProvenance was explicitly null. Both reproductions now run against
// PRODUCTION CODE, plus an async interleaving where the globals move while planning waits.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._sceneLedgerCommit === 'function'
  && typeof window._sceneLedgerGet === 'function', { timeout: 30000 }).catch(() => {});

const exported = await page.evaluate(() => ({
  commit: typeof window._sceneLedgerCommit, get: typeof window._sceneLedgerGet,
  capture: typeof window._captureSubmissionProvenance,
  currentAssist: typeof window._currentCardAssist
}));
console.log('shipped exports: ' + JSON.stringify(exported));
if (exported.commit !== 'function' || exported.get !== 'function') {
  console.log('\n  UNPROVEN — the shipped commit/get are not reachable; nothing below is asserted.');
  await browser.close(); process.exit(1);
}

// Drive the SHIPPED _sceneLedgerCommit with a controlled state, and read back the row it wrote.
const commitCG = (opts) => page.evaluate((o) => {
  const s = window.state;
  s.storyId = o.storyId;
  s._sceneLedger = null;                        // a clean ledger per case
  // The shared slots the old code could fall back to — deliberately LOADED with another
  // attempt's card, so any fallthrough shows up as that card appearing in the row.
  s._submissionProvenance = o.sharedSnapshot || null;
  s._cgGenAttempt = o.liveAttempt
    ? { id: o.liveAttempt, storyId: o.storyId, sceneIndex: (o.sceneNumber || 1) - 1, at: Date.now() }
    : null;
  s.fateOptions = o.fateOptions || null;
  s.fateSelectedIndex = (typeof o.fateSelectedIndex === 'number') ? o.fateSelectedIndex : -1;
  s.fateCommitted = !!o.fateCommitted;
  try {
    window._sceneLedgerCommit(s, {
      kind: 'cg', sceneNumber: o.sceneNumber,
      event: 'harness row', eventSource: 'harness',
      submissionProvenance: o.resultSnapshot === undefined ? null : o.resultSnapshot,
      generationIdentity: o.resultIdentity === undefined ? null : o.resultIdentity
    });
  } catch (e) { return { threw: String(e.message).slice(0, 80) }; }
  const L = window._sceneLedgerGet(s, false);
  const rows = (L && L.entries) ? L.entries : [];
  const r = rows[rows.length - 1] || null;
  return { row: r ? { kind: r.kind, scene: r.sceneNumber, assist: r.cardAssist || null } : null,
           rows: rows.length };
}, opts);

const STORY = 'story-ownership-1';
const CARD_A = { id: 'reversal', label: 'Reversal', index: 0 };
const CARD_B = { id: 'temptation', label: 'Temptation', index: 1 };
const SNAP_A = { storyId: STORY, sceneNumber: 3, attemptId: 'attempt-A', cardAssist: CARD_A };
const ID_B  = { storyId: STORY, attemptId: 'attempt-B', sceneIndex: 2 };   // scene 3
const ID_A  = { storyId: STORY, attemptId: 'attempt-A', sceneIndex: 2 };   // scene 3

console.log('\n=== REPRODUCTION 1: attempt A\'s snapshot, attempt B running ===');
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-B',
    resultSnapshot: SNAP_A, resultIdentity: ID_B,
    sharedSnapshot: { storyId: STORY, sceneNumber: 3, attemptId: 'attempt-B', cardAssist: CARD_B } });
  console.log('   row: ' + JSON.stringify(r.row));
  t('the shipped commit REFUSES attempt A\'s snapshot under identity B',
    !!r.row && r.row.assist === null, JSON.stringify(r.row));
  t('and it did not substitute B\'s shared card either',
    !r.row || !r.row.assist || r.row.assist.label !== 'Temptation', JSON.stringify(r.row));
}

console.log('\n=== REPRODUCTION 2: submissionProvenance explicitly NULL ===');
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-B',
    resultSnapshot: null, resultIdentity: ID_B,
    // shared state loaded, and a live selection too — neither may be consulted
    sharedSnapshot: { storyId: STORY, sceneNumber: 3, attemptId: 'attempt-B', cardAssist: CARD_B },
    fateOptions: [{ title: 'Reversal' }, { title: 'Temptation' }],
    fateSelectedIndex: 1, fateCommitted: true });
  console.log('   row: ' + JSON.stringify(r.row));
  t('an explicitly NULL result snapshot commits NO card', !!r.row && r.row.assist === null,
    JSON.stringify(r.row));
  t('shared state was not consulted to recover one',
    !r.row || r.row.assist === null, JSON.stringify(r.row));
}

console.log('\n=== THE POSITIVE, so the rule is not vacuous ===');
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: SNAP_A, resultIdentity: ID_A, sharedSnapshot: null });
  console.log('   row: ' + JSON.stringify(r.row));
  t('A\'s own snapshot under identity A IS recorded',
    !!r.row && !!r.row.assist && r.row.assist.label === 'Reversal', JSON.stringify(r.row));
}

console.log('\n=== SCENE AND STORY MUST ALSO AGREE ===');
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 5, liveAttempt: 'attempt-A',
    resultSnapshot: SNAP_A,                                     // snapshot says scene 3
    resultIdentity: { storyId: STORY, attemptId: 'attempt-A', sceneIndex: 4 },   // identity agrees
    sharedSnapshot: null });                                                     // with scene 5
  t('a scene-3 snapshot is refused when committing scene 5',
    !!r.row && r.row.assist === null, JSON.stringify(r.row));
}
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: { ...SNAP_A, storyId: 'another-story' }, resultIdentity: ID_A,
    sharedSnapshot: null });
  t('a snapshot whose story disagrees with its identity is refused', !!r.row && r.row.assist === null,
    JSON.stringify(r.row));
}
console.log('\n=== A MATCHING PAIR FROM ANOTHER STORY MUST NOT ATTACH HERE ===');
{
  // Snapshot AND identity agree with each other — and both belong to a DIFFERENT story. My earlier
  // "another story" case mismatched the pair, so the pair check caught it and the destination was
  // never consulted. This is the case Codex reproduced.
  const OTHER = 'story-elsewhere';
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: { storyId: OTHER, sceneNumber: 3, attemptId: 'attempt-A', cardAssist: CARD_A },
    resultIdentity: { storyId: OTHER, attemptId: 'attempt-A', sceneIndex: 2 },
    sharedSnapshot: null });
  console.log('   row: ' + JSON.stringify(r.row));
  t('a self-consistent pair from ANOTHER story records NO card in this story',
    !!r.row && r.row.assist === null, JSON.stringify(r.row));
}

console.log('\n=== THE GENERATION\'S OWN SCENE MUST BE THE COMMITTED SCENE ===');
{
  // The snapshot agrees with the committed scene; the GENERATION says it was planning scene 5.
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: { storyId: STORY, sceneNumber: 3, attemptId: 'attempt-A', cardAssist: CARD_A },
    resultIdentity: { storyId: STORY, attemptId: 'attempt-A', sceneIndex: 4 },   // scene 5
    sharedSnapshot: null });
  console.log('   row: ' + JSON.stringify(r.row));
  t('a generation identity for scene 5 records NO card in scene 3',
    !!r.row && r.row.assist === null, JSON.stringify(r.row));
}
{
  // And an identity with no scene index at all is not ownership either.
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: { storyId: STORY, sceneNumber: 3, attemptId: 'attempt-A', cardAssist: CARD_A },
    resultIdentity: { storyId: STORY, attemptId: 'attempt-A' },                  // no sceneIndex
    sharedSnapshot: null });
  t('an identity without a scene index records no card', !!r.row && r.row.assist === null,
    JSON.stringify(r.row));
}

console.log('\n=== A MISSING GENERATION IDENTITY IS NOT OWNERSHIP ===');
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: SNAP_A, resultIdentity: null, sharedSnapshot: null });
  t('without a generation identity, no card is recorded',
    !!r.row && r.row.assist === null, JSON.stringify(r.row));
}
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: SNAP_A, resultIdentity: { storyId: STORY, attemptId: null },
    sharedSnapshot: null });
  t('nor with an identity whose attempt is null', !!r.row && r.row.assist === null,
    JSON.stringify(r.row));
}
console.log('\n=== ABSENCE MUST NOT MASQUERADE AS AGREEMENT ===');
{
  // TWO EMPTY ATTEMPT IDS compared equal under the previous check, so a record with no attempt
  // identity at all satisfied a test meant to require one.
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: { storyId: STORY, sceneNumber: 3, attemptId: '', cardAssist: CARD_A },
    resultIdentity: { storyId: STORY, attemptId: '', sceneIndex: 2 },
    sharedSnapshot: null });
  console.log('   row: ' + JSON.stringify(r.row));
  t('two EMPTY attempt ids record NO card', !!r.row && r.row.assist === null, JSON.stringify(r.row));
}
{
  // Whitespace is not an identity either.
  const r = await commitCG({ storyId: STORY, sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: { storyId: STORY, sceneNumber: 3, attemptId: '   ', cardAssist: CARD_A },
    resultIdentity: { storyId: STORY, attemptId: '   ', sceneIndex: 2 },
    sharedSnapshot: null });
  t('whitespace-only attempt ids record NO card', !!r.row && r.row.assist === null,
    JSON.stringify(r.row));
}
{
  // ALL THREE STORY IDS MISSING compared equal as well, so the destination check passed vacuously.
  const r = await commitCG({ storyId: '', sceneNumber: 3, liveAttempt: 'attempt-A',
    resultSnapshot: { storyId: '', sceneNumber: 3, attemptId: 'attempt-A', cardAssist: CARD_A },
    resultIdentity: { storyId: '', attemptId: 'attempt-A', sceneIndex: 2 },
    sharedSnapshot: null });
  console.log('   row: ' + JSON.stringify(r.row));
  t('all three story ids MISSING records NO card', !!r.row && r.row.assist === null,
    JSON.stringify(r.row));
}

console.log('\n=== EXPLICITLY CARDLESS STAYS CARDLESS ===');
{
  const r = await commitCG({ storyId: STORY, sceneNumber: 4, liveAttempt: 'attempt-C',
    resultSnapshot: { storyId: STORY, sceneNumber: 4, attemptId: 'attempt-C', cardAssist: null },
    resultIdentity: { storyId: STORY, attemptId: 'attempt-C', sceneIndex: 3 },   // scene 4
    sharedSnapshot: { storyId: STORY, sceneNumber: 4, attemptId: 'attempt-C', cardAssist: CARD_B } });
  t('an owned-but-cardless snapshot commits NULL, not the shared card',
    !!r.row && r.row.assist === null, JSON.stringify(r.row));
}

// ── ASYNC INTERLEAVING: the globals move to B while A's planning is still waiting ────────────
console.log('\n=== COMPONENT DEMONSTRATION (not a production async-interleaving test) ===');
console.log('    It calls the shipped _captureSubmissionProvenance, but RECONSTRUCTS the');
console.log('    generation\'s identity capture, the provOut handoff and the ownership');
console.log('    comparison. It does NOT suspend and resume the real planner/generation wiring,');
console.log('    so it demonstrates the RULE under interleaving, not the wiring under it.');
{
  const r = await page.evaluate(async (o) => {
    const s = window.state;
    s.storyId = o.storyId;
    // A's generation begins and captures its identity BEFORE awaiting (what production now does).
    s._cgGenAttempt = { id: 'attempt-A', storyId: o.storyId, sceneIndex: 2, at: Date.now() };
    const capturedByA = (s._cgGenAttempt && s._cgGenAttempt.id != null
      && String(s._cgGenAttempt.storyId || '') === String(s.storyId || ''))
      ? String(s._cgGenAttempt.id) : null;
    // A's planner captures ITS snapshot, handed back through a local out-object.
    s.fateOptions = [{ title: 'Reversal' }];
    s.fateSelectedIndex = 0; s.fateCommitted = true;
    const provOut = {};
    provOut.snapshot = window._captureSubmissionProvenance(s, 'act', 'dia');
    // ...and WHILE A IS AWAITING, everything global moves on to B.
    await new Promise(res => setTimeout(res, 30));
    s._cgGenAttempt = { id: 'attempt-B', storyId: o.storyId, sceneIndex: 2, at: Date.now() };
    s.fateOptions = [{ title: 'Temptation' }];
    s.fateSelectedIndex = 0;
    s._submissionProvenance = window._captureSubmissionProvenance(s, 'act2', 'dia2');
    // A resumes and validates its OWN snapshot against its OWN pre-await identity.
    const spNow = provOut.snapshot;
    const owned = (spNow && capturedByA && String(spNow.attemptId || '') === capturedByA
      && String(spNow.storyId || '') === String(s.storyId || ''))
      ? { storyId: String(s.storyId || ''), sceneNumber: spNow.sceneNumber,
          attemptId: capturedByA, cardAssist: spNow.cardAssist || null }
      : null;
    return { capturedByA, aSnapshotAttempt: spNow && spNow.attemptId,
             aSnapshotCard: spNow && spNow.cardAssist ? spNow.cardAssist.label : null,
             sharedNowAttempt: s._submissionProvenance && s._submissionProvenance.attemptId,
             sharedNowCard: s._submissionProvenance && s._submissionProvenance.cardAssist
               ? s._submissionProvenance.cardAssist.label : null,
             ownedCard: owned && owned.cardAssist ? owned.cardAssist.label : null,
             ownedAttempt: owned && owned.attemptId };
  }, { storyId: STORY });
  console.log('   ' + JSON.stringify(r));
  t('A captured its identity before awaiting', r.capturedByA === 'attempt-A');
  t('A\'s own snapshot still belongs to A after the interleave',
    r.aSnapshotAttempt === 'attempt-A' && r.aSnapshotCard === 'Reversal', JSON.stringify(r));
  t('the shared slot has genuinely moved to B', r.sharedNowAttempt === 'attempt-B'
    && r.sharedNowCard === 'Temptation', JSON.stringify(r));
  t('A KEEPS ITS OWN CARD and does not adopt B\'s',
    r.ownedAttempt === 'attempt-A' && r.ownedCard === 'Reversal', JSON.stringify(r));
}

console.log('\n=== THE SHIPPED CG BRANCH HAS NO FALLTHROUGH ===');
const SRC = await page.evaluate(async () => (await (await fetch('/app.js')).text()));
t('the cg branch contains NO shared-state lookup and NO stamped-key fallback', (() => {
  const i = SRC.indexOf("if (kind === 'cg') {");
  if (i < 0) return false;
  // brace-match the branch so the check cannot drift past it
  let depth = 0, end = -1;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) {
    if (SRC[k] === '{') depth++;
    else if (SRC[k] === '}') { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end < 0) return false;
  const branch = SRC.slice(i, end);
  return !/\_submissionProvenanceFor/.test(branch)
    && !/key\.cardAssist/.test(branch)
    && !/opts\.cardAssist/.test(branch)
    && /return null;/.test(branch);
})(), 'the cg branch must not reach any fallback');
t('and it compares attempt EQUALITY, not existence', /_rpAtt !== _giAtt/.test(SRC));
t('after requiring every id to be NONEMPTY first',
  /a story id is missing/.test(SRC) && /an attempt id is missing/.test(SRC)
  && /\.trim\(\)/.test(SRC));
t('the planner hands its snapshot back through the caller\'s object',
  /provOut\.snapshot = _subProv/.test(SRC));
// A comment match proved nothing; this checks the STRUCTURE — the identity is assigned from
// _cgGenAttempt before the first await in the generator, and the post-await validation reads the
// out-object rather than shared state.
t('the generation assigns its attempt id BEFORE its first await',
  (() => {
    const fnStart = SRC.indexOf('async function _runCGScreenplayGenInner(');
    if (fnStart < 0) return false;
    const body = SRC.slice(fnStart, fnStart + 4000);
    const assign = body.indexOf('_genAttemptId = String(state._cgGenAttempt.id)');
    const firstAwait = body.indexOf('await ');
    return assign > 0 && firstAwait > 0 && assign < firstAwait;
  })(), 'the assignment must precede the first await in the generator body');
t('and the post-await validation reads the OUT OBJECT, not shared state',
  /var _spNow = _provOut\.snapshot;/.test(SRC)
  && !/var _spNow = state\._submissionProvenance/.test(SRC));
t('commit also validates the DESTINATION story and the generation scene',
  /identity story is not the destination story/.test(SRC)
  && /generation scene is not the committed scene/.test(SRC));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
