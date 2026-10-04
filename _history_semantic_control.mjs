// CODEX'S FINDINGS, PRESERVED AS REGRESSION CASES. Provider-free, $0.
//
// I claimed the note's claims were "checked against the rendered prose". They were checked for
// 60% WORD OVERLAP, which is not verification, and Codex broke it three ways. These cases stay
// in the suite permanently so the claim can never be made again without passing them.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const CASES = [
  { name: 'NEGATION REVERSAL',
    prose: 'Julian did not hand the writ to Lirael. He kept it in his sleeve and said nothing.',
    claim: 'Julian handed the writ to Lirael.' },
  { name: 'REVERSED TRANSFER DIRECTION',
    prose: 'Julian handed the writ to Lirael, and she closed her fingers around it.',
    claim: 'Lirael handed the writ to Julian.' },
  { name: 'ESCALATED OUTCOME',
    prose: 'The commission\'s clerk began reading the demand aloud to the seated members.',
    claim: 'The commission accepted the demand.' }
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._attachHistoryNote === 'function', { timeout: 30000 });

// ONE precise splitter shared by every case: the established portion is whatever precedes the
// first explicitly-unverified section. A labelled "PROPOSED OBLIGATIONS" heading is NOT
// established history, and an earlier version of this test wrongly counted it as such.
await page.evaluate(() => {
  window._hnEstablishedPortion = function (block) {
    const marks = ["[THE AUTHOR'S SUMMARY", '[PROPOSED OBLIGATIONS'];
    let cut = block.length;
    marks.forEach(m => { const i = block.indexOf(m); if (i >= 0 && i < cut) cut = i; });
    return block.slice(0, cut);
  };
});

console.log('=== SEMANTIC CONTROL — a summary is not a fact (provider-free, $0) ===\n');
console.log('1. A CONTRADICTED CLAIM MUST NOT BE PRESENTED AS SOMETHING THAT HAPPENED');
for (const c of CASES) {
  const r = await page.evaluate(({ prose, claim }) => {
    window.state._historyNotes = [];
    window.state.scenes = [{ uid: 'lit:sem', text: prose }];
    window._attachHistoryNote('lit:sem', { events: [{ text: claim }] }, prose);
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { block, established: window._hnEstablishedPortion(block) };
  }, c);
  t(c.name + ' is not stated as established history',
    !r.established.includes(c.claim),
    'presented as fact: ' + c.claim);
}

console.log('\n2. A KNOWLEDGE CLAIM CANNOT INVENT A DISCLOSURE');
{
  const r = await page.evaluate(() => {
    const prose = 'Julian said nothing about the wish. The assembly watched the Dohkar instead.';
    window.state._starterId = 'starter_first_sacrifice';   // the story that DECLARES this seal
    window.state._historyNotes = [];
    window.state.scenes = [{ uid: 'lit:know', text: prose }];
    window._attachHistoryNote('lit:know', {
      knowledge: { 'the assembly': 'knows Julian secretly countered the wish' } }, prose);
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { block, established: window._hnEstablishedPortion(block) };
  });
  t('an invented disclosure is NOT in established history',
    !/secretly countered/.test(r.established), 'Julian\'s secret was exposed through knowledge');
  // THE LIMITATION, ASSERTED RATHER THAN WISHED AWAY. The seal declares an id and a label; the
  // phrase "knows Julian secretly countered the wish" contains neither, so the screen does not
  // catch it and the claim IS carried as unverified summary. My earlier hardcoded phrase list
  // caught this one sentence and would have missed every rewording of it — replacing a real
  // mechanism with a lucky string match is not secrecy. This check therefore records WHERE the
  // protection actually ends.
  const leaked = /secretly countered/.test(r.block);
  console.log('     LIMITATION: the paraphrase ' + (leaked ? 'IS' : 'is not')
    + ' carried as unverified summary. Substring screening cannot recognise a reworded secret.');
  console.log('     THE AVAILABLE FIX IS STORY DATA, NOT CODE: sealedEvents already supports a');
  console.log('     markers[] field that _hnSealsInForce reads; starter_first_sacrifice declares');
  console.log('     none. Markers are a canon decision, so they are reported, not invented here.');
  t('it is at least never ESTABLISHED, on any path',
    !/secretly countered/.test(r.established),
    'a sealed secret reached established history');
}

console.log('\n3. AN OBLIGATION IS A PROPOSAL, NOT AN ESTABLISHED FACT');
{
  const r = await page.evaluate(() => {
    const prose = 'The room emptied without anyone saying what came next.';
    window.state._historyNotes = [];
    window.state.scenes = [{ uid: 'lit:ob', text: prose }];
    window._attachHistoryNote('lit:ob', {
      obligations: [{ text: 'Lirael swore before the commission to surrender The Answer.' }] }, prose);
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { established: window._hnEstablishedPortion(block), block };
  });
  t('an invented obligation is not stated as something that happened',
    !/swore before the commission/.test(r.established),
    'an auto-accepted obligation became history');
}

console.log('\n4. HOW AN OBLIGATION LEGITIMATELY CLOSES');
{
  const r = await page.evaluate(() => {
    window.state._historyNotes = [];
    window.state.scenes = [];
    const p1 = 'Lirael was told to answer for her conduct at the inquiry.';
    window.state.scenes.push({ uid: 'lit:o1', text: p1 });
    window._attachHistoryNote('lit:o1',
      { obligations: [{ id: 'ob-inquiry', text: 'Lirael must answer for her conduct at the inquiry.' }] }, p1);
    const before = window._openObligations(window.state).length;

    // A LATER NOTE CLAIMING RESOLUTION DOES NOT CLOSE IT — that is the Codex repair. The claim is
    // recorded and shown, but an author cannot retire its own obligations by assertion.
    const p2 = 'Lirael answered the inquiry in full, and the matter was closed.';
    window.state.scenes.push({ uid: 'lit:o2', text: p2 });
    window._attachHistoryNote('lit:o2', { resolves: ['ob-inquiry'] }, p2);
    const afterClaim = window._openObligations(window.state);

    // THE LEGITIMATE CLOSE: machinery entitled to settle it sets `resolved` on the obligation.
    window.state.scenes[0].historyNote.obligations[0].resolved = true;
    const afterSettled = window._openObligations(window.state).length;
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { before, afterClaimCount: afterClaim.length,
      flagged: !!(afterClaim[0] && afterClaim[0].claimedResolved), afterSettled, block };
  });
  t('the obligation was open after the first scene', r.before === 1, 'before=' + r.before);
  t('A NOTE CLAIMING RESOLUTION DOES NOT CLOSE IT', r.afterClaimCount === 1,
    'an author retired its own obligation by assertion');
  t('but the claim IS surfaced to the next planner', r.flagged);
  t('AND IT CLOSES when machinery entitled to settle it says so', r.afterSettled === 0,
    'there is no legitimate path to closing an obligation');
  t('once settled it stops being carried', !/answer for her conduct/.test(r.block));
}

console.log('\n5. CODEX ROUND 2 — the seal system, not a phrase list');
{
  const r = await page.evaluate(() => {
    // Put the story in First Sacrifice so its OWN sealedEvents apply, before the boundary.
    window.state._starterId = 'starter_first_sacrifice';
    const seals = window._hnSealsInForce(window.state);
    const prose = 'Julian said nothing. The chamber stayed quiet.';
    window.state._historyNotes = [];
    window.state.scenes = [{ uid: 'lit:seal', text: prose }];
    window._attachHistoryNote('lit:seal', {
      disclosures: [{ text: 'Julian used his wish to thwart Seren in secret.' }] }, prose);
    const note = window.state.scenes[0].historyNote;
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { sealCount: seals.length, sealIds: seals.map(x => x.id),
      paraphraseCarried: /thwart Seren/.test(JSON.stringify(note)),
      inEstablished: /thwart Seren/.test(window._hnEstablishedPortion(block)) };
  });
  console.log('     seals in force: ' + JSON.stringify(r.sealIds));
  t('the screen reads the STORY\'S OWN sealed events, not hardcoded phrases',
    r.sealCount > 0 && r.sealIds.includes('julian_counter_wish'),
    'no seals found: ' + JSON.stringify(r.sealIds));
  // HONEST: a paraphrase sharing no declared term DOES pass. That is reported, not hidden.
  t('a paraphrased secret is never ESTABLISHED (the limit is that it is still carried)',
    !r.inEstablished,
    'a paraphrased secret reached established history');
  console.log('     LIMITATION, as designed and reported: the paraphrase is '
    + (r.paraphraseCarried ? 'STILL CARRIED as unverified summary' : 'not carried')
    + ' — substring screening gives no semantic secrecy.');
}

console.log('\n6. THE REVEAL BOUNDARY IS RESPECTED');
{
  const r = await page.evaluate(() => {
    window.state._starterId = 'starter_first_sacrifice';
    const before = window._hnSealsInForce(window.state).some(x => x.id === 'julian_counter_wish');
    // Drive the REAL scene counter through state, not by swapping a window alias — callers hold
    // the closure reference, which is the same trap the kill switch exposed earlier.
    const savedTurn = window.state.turnCount, savedS1 = window.state._isScene1Build;
    window.state._isScene1Build = false;
    window.state.turnCount = 20;                               // past unsealsAtScene: 16
    const seen = (typeof window._currentSceneNumber === 'function')
      ? window._currentSceneNumber(window.state) : null;
    const after = window._hnSealsInForce(window.state).some(x => x.id === 'julian_counter_wish');
    window.state.turnCount = savedTurn; window.state._isScene1Build = savedS1;
    return { before, after, seen };
  });
  console.log('     scene number the production helper reports: ' + r.seen);
  t('sealed before its boundary', r.before === true);
  t('AND NO LONGER SEALED after the reveal scene', r.after === false,
    'the screen would keep censoring a reveal that has legitimately happened');
}

console.log('\n7. KNOWLEDGE IS NEVER ESTABLISHED BY AN UNRELATED QUOTE');
{
  const r = await page.evaluate(() => {
    const prose = 'The chamber was quiet for a long moment. Julian said nothing.';
    window.state._historyNotes = [];
    window.state.scenes = [{ uid: 'lit:k2', text: prose }];
    window._attachHistoryNote('lit:k2', {
      knowledge: { 'the assembly': { text: 'learned that the writ was forged',
        quote: 'The chamber was quiet for a long moment' } } }, prose);
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { est: window._hnEstablishedPortion(block), block };
  });
  t('NO "learned this on the page" claim is established from an unrelated quote',
    !/learned this on the page/.test(r.est) && !/assembly/.test(r.est),
    'quote existence was used to establish what a character knows');
  t('the knowledge claim is carried, explicitly as unverified',
    /knowledge, UNVERIFIED/.test(r.block) && /learned that the writ was forged/.test(r.block));
}

console.log('\n8. AN UNSUPPORTED RESOLUTION CANNOT DELETE AN OBLIGATION');
{
  const r = await page.evaluate(() => {
    window.state._historyNotes = [];
    window.state.scenes = [];
    const p1 = 'The writ was taken and not given back.';
    window.state.scenes.push({ uid: 'lit:r1', text: p1 });
    window._attachHistoryNote('lit:r1',
      { obligations: [{ id: 'return-writ', text: 'The writ must be returned to Lirael.' }] }, p1);
    const p2 = 'No one returned the writ.';
    window.state.scenes.push({ uid: 'lit:r2', text: p2 });
    window._attachHistoryNote('lit:r2', { resolves: ['return-writ'] }, p2);
    const open = window._openObligations(window.state);
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { count: open.length, flagged: !!(open[0] && open[0].claimedResolved), block };
  });
  t('THE OBLIGATION SURVIVES an unsupported resolution claim', r.count === 1,
    'an author erased an outstanding obligation by asserting it was met');
  t('and the context says the claim is unverified', r.flagged
    && /NOT verified/.test(r.block));
  t('OBLIGATION IDS ARE IN THE CONTEXT, so resolving by id is possible',
    /\[return-writ\]/.test(r.block),
    'the author is asked to resolve by id but never shown the ids');
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
