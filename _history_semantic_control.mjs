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
    window.state.scenes = [{ uid: 'lit:know', text: prose }];
    window._attachHistoryNote('lit:know', {
      knowledge: { 'the assembly': 'knows Julian secretly countered the wish' } }, prose);
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { block, established: window._hnEstablishedPortion(block) };
  });
  t('an invented disclosure is NOT in established history',
    !/secretly countered/.test(r.established), 'Julian\'s secret was exposed through knowledge');
  t('and it does not leak into the block at all, in any section',
    !/secretly countered/.test(r.block),
    'a sealed secret must not ride into planning context on an unverified channel');
}

console.log('\n3. AN OBLIGATION IS A PROPOSAL, NOT AN ESTABLISHED FACT');
{
  const r = await page.evaluate(() => {
    const prose = 'The room emptied without anyone saying what came next.';
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

console.log('\n4. AN OBLIGATION CAN ACTUALLY BE RESOLVED LATER');
{
  const r = await page.evaluate(() => {
    window.state.scenes = [];
    const p1 = 'Lirael was told to answer for her conduct at the inquiry.';
    window.state.scenes.push({ uid: 'lit:o1', text: p1 });
    window._attachHistoryNote('lit:o1',
      { obligations: [{ id: 'ob-inquiry', text: 'Lirael must answer for her conduct at the inquiry.' }] }, p1);
    const before = window._openObligations(window.state).length;
    const p2 = 'Lirael answered the inquiry in full, and the matter was closed.';
    window.state.scenes.push({ uid: 'lit:o2', text: p2 });
    window._attachHistoryNote('lit:o2', { resolves: ['ob-inquiry'] }, p2);
    const after = window._openObligations(window.state).length;
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { before, after, stillListed: /answer for her conduct/.test(block) };
  });
  t('the obligation was open after the first scene', r.before === 1, 'before=' + r.before);
  t('A LATER SCENE RESOLVES IT — it does not stay open forever',
    r.after === 0, 'after=' + r.after + '; appending a note left the old obligation open');
  t('and it stops being carried into the context', !r.stillListed);
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
