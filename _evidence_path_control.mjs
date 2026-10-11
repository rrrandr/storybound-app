// ── THE EVIDENCE PATH: A GENUINE DELIVERY CAN BE RECORDED, A PARAPHRASE STILL CANNOT ────────
// Driven through the SHIPPED window._adjudicateSceneProposals. Grounded in
// run_2026-10-10T13-32-11-777Z scene 3, where the verifier returned DELIVERED, the slot check
// PASSED with a verbatim exit quote, and the per_proposal evidence was a paraphrase - so nothing
// committed and COMMITTED WORLD STATE stayed [] for all ten scenes.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

// The real prose of scene 3, verbatim from final.json.
const PROSE = [
  "The clearing holds its breath around the Dohkar's crimson robes.",
  'The presiding Dohkar steps forward, voice cutting through the grass.',
  'THE PRESIDING DOHKAR: "Lirael, your conduct at this rite is under investigation."',
  'The words land like a hand on my shoulder.',
  'THE PRESIDING DOHKAR: "The Provast has demanded a review of your actions."',
  'Julian moves before the words finish settling.',
  'JULIAN: "This matter concerns me as well."',
  'THE PRESIDING DOHKAR: "While the inquiry proceeds you will remain under supervision."'
].join('\n\n');

// The quote the slot check actually returned, and the paraphrase the per_proposal entry gave.
const VERBATIM_EXIT = 'While the inquiry proceeds you will remain under supervision.';
const PARAPHRASE = 'The Dohkar placed Lirael under supervision while the inquiry proceeds.';

console.log('=== EVIDENCE PATH (provider-free, $0) ===\n');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._adjudicateSceneProposals === 'function',
  { timeout: 30000 });
t('the shipped window._adjudicateSceneProposals is present', true);

const run = (args) => page.evaluate((v) => {
  const pend = v.refs.map((ref) => ({ id: ref, kind: 'state_change', proposalRef: ref }));
  const per = v.refs.map((ref, i) => ({
    ref: ref, delivery: 'DELIVERED', reason: 'delivered',
    evidence: v.evidence[i],
    precondition_evidence: v.precondition[i]
  }));
  const out = window._adjudicateSceneProposals(pend, per, v.prose, {
    sharedSlots: { precondition_evidence: v.sharedPre, exit_state_evidence: v.sharedExit }
  });
  const vs = out && out.verdicts ? out.verdicts : {};
  return {
    committed: (out && out.committed) ? out.committed.slice() : [],
    verdicts: Object.keys(vs).map((k) => ({
      ref: k, commit: !!vs[k].commit, reason: vs[k].reason,
      why: (vs[k].why || []).join(' | ')
    }))
  };
}, args);

// 1. THE MEASURED CASE: one proposal, paraphrased per_proposal evidence, verbatim slot exit quote.
const sole = await run({ prose: PROSE, refs: ['prop:3:3'],
  evidence: [PARAPHRASE], precondition: [VERBATIM_EXIT],
  sharedPre: VERBATIM_EXIT, sharedExit: VERBATIM_EXIT });
console.log('      sole proposal -> ' + JSON.stringify(sole.verdicts));
t('a SOLE proposal whose slot exit quote IS verbatim now COMMITS',
  sole.committed.length === 1, JSON.stringify(sole));
t('and the record says the shared slot quote was used',
  /shared_slots_check/.test(JSON.stringify(sole.verdicts)), JSON.stringify(sole.verdicts));

// 2. NO verbatim quote anywhere -> refused, and named as UNVERIFIED rather than "did not happen".
const noQuote = await run({ prose: PROSE, refs: ['prop:3:3'],
  evidence: [PARAPHRASE], precondition: [VERBATIM_EXIT],
  sharedPre: VERBATIM_EXIT, sharedExit: PARAPHRASE });
console.log('      no verbatim   -> ' + JSON.stringify(noQuote.verdicts));
t('with NO verbatim quote anywhere, nothing commits',
  noQuote.committed.length === 0, JSON.stringify(noQuote));
t('and it is reported as evidence_unverifiable, NOT as the event not happening',
  noQuote.verdicts[0] && noQuote.verdicts[0].reason === 'evidence_unverifiable'
  && /not a finding that the event did not happen/.test(noQuote.verdicts[0].why),
  JSON.stringify(noQuote.verdicts));

// 3. TWO proposals: a shared quote cannot be attributed, so the fallback must NOT apply.
const multi = await run({ prose: PROSE, refs: ['prop:3:3', 'prop:3:4'],
  evidence: [PARAPHRASE, PARAPHRASE], precondition: [VERBATIM_EXIT, VERBATIM_EXIT],
  sharedPre: VERBATIM_EXIT, sharedExit: VERBATIM_EXIT });
console.log('      two proposals -> ' + JSON.stringify(multi.verdicts));
t('with TWO proposals the shared quote is NOT borrowed - nothing commits',
  multi.committed.length === 0, JSON.stringify(multi));
t('and the refusal says why a shared quote cannot be attributed',
  /multiple/.test(JSON.stringify(multi.verdicts)), JSON.stringify(multi.verdicts));

// 4. THE GATE IS NOT WEAKENED: a verbatim per_proposal quote still commits on its own.
const good = await run({ prose: PROSE, refs: ['prop:3:3'],
  evidence: ['Julian moves before the words finish settling.'], precondition: [VERBATIM_EXIT],
  sharedPre: VERBATIM_EXIT, sharedExit: VERBATIM_EXIT });
t('a VERBATIM per_proposal quote still commits on its own evidence',
  good.committed.length === 1 && /evidence=per_proposal/.test(JSON.stringify(good.verdicts)),
  JSON.stringify(good.verdicts));

// 5. AND A FABRICATED QUOTE IS STILL REFUSED.
const fake = await run({ prose: PROSE, refs: ['prop:3:3'],
  evidence: ['Lirael drew the blade and the clearing went silent.'], precondition: [VERBATIM_EXIT],
  sharedPre: VERBATIM_EXIT, sharedExit: PARAPHRASE });
t('an invented quote found nowhere in the prose is still refused',
  fake.committed.length === 0, JSON.stringify(fake.verdicts));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
