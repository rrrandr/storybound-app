// THE SUBMISSION GATE, including the mixed valid/placeholder case Codex reproduced. $0.
import { canSubmit, isPlaceholder, isUsable, isDegenerate, IN_PAGE_PREDICATE }
  from './_oas_submission_guard.mjs';
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
const IDS = ['temptation', 'boundary', 'confession', 'reversal', 'silence'];
const A = 'I set The Answer down between us and do not let go.';
const D = 'Ask me whose hands shaped it.';

console.log('=== THE MIXED CASE: one valid field, one placeholder ===');
{
  const r = canSubmit('I step back.', 'Confession…', IDS);
  t('DO valid + SAY placeholder is REFUSED', r.ok === false, r.reason);
  t('and the reason names the offending field', /SAY=/.test(r.reason), r.reason);
}
{
  const r = canSubmit('Reversal…', D, IDS);
  t('DO placeholder + SAY valid is REFUSED', r.ok === false, r.reason);
  t('and the reason names that field', /DO=/.test(r.reason), r.reason);
}
console.log('');
console.log('=== PLACEHOLDER SHAPES ===');
t('a bare card title is a placeholder', isPlaceholder('Confession', IDS));
t('a card title with an ellipsis is a placeholder', isPlaceholder('Confession…', IDS));
t('an ellipsis alone is a placeholder', isPlaceholder('…', IDS));
t('a short trailing-off fragment is a placeholder', isPlaceholder('Reversal…', IDS));
t('real prose is NOT a placeholder', !isPlaceholder(A, IDS));
t('a long line that happens to end in an ellipsis is NOT a placeholder',
  !isPlaceholder('I hold his gaze and say nothing at all…', IDS));
console.log('');
console.log('=== DEGENERATE VALUES — the no-preview case ===');
// With no preview served the app supplied a real fallback SAY and DO = "{}", an unparsed JSON
// object. The first gate PASSED that, so "{}" would have reached the author as the reader's action.
t('"{}" is degenerate', isDegenerate('{}'));
t('"[]" and "null" are degenerate', isDegenerate('[]') && isDegenerate('null'));
t('punctuation alone is degenerate', isDegenerate('—') && isDegenerate('...'));
t('THE REAL NO-PREVIEW PAIR IS REFUSED: DO "{}" + a valid fallback SAY',
  canSubmit('{}', '"Not yet. Not like this."', IDS).ok === false,
  canSubmit('{}', '"Not yet. Not like this."', IDS).reason);
t('real prose is not degenerate', !isDegenerate(A) && !isDegenerate('mm'));
t('an empty field is not degenerate', !isDegenerate(''));

console.log('');
console.log('=== INTENTIONALLY EMPTY FIELDS STAY ALLOWED ===');
t('DO valid + SAY empty is allowed', canSubmit(A, '', IDS).ok === true);
t('DO empty + SAY valid is allowed', canSubmit('', D, IDS).ok === true);
t('the SILENCE pair (action + "mm") is allowed', canSubmit('I go still.', 'mm', IDS).ok === true);
t('both empty is refused', canSubmit('', '', IDS).ok === false,
  canSubmit('', '', IDS).reason);
t('empty is not itself a placeholder', !isPlaceholder('', IDS) && !isUsable('', IDS));
console.log('');
console.log('=== BOTH VALID ===');
t('two real fields are allowed', canSubmit(A, D, IDS).ok === true);
console.log('');
console.log('=== THE IN-PAGE COPY AGREES WITH THE MODULE ===');
const inPage = eval(IN_PAGE_PREDICATE);
const cases = [[A, D], ['I step back.', 'Confession…'], ['Reversal…', D], [A, ''], ['', D],
  ['', ''], ['I go still.', 'mm'], ['Confession…', 'Confession…'], ['…', A],
  ['{}', '"Not yet. Not like this."'], ['[]', D], [A, 'null'], ['—', D]];
let agree = 0;
for (const [a, d] of cases) {
  const m = canSubmit(a, d, IDS).ok, p = inPage(a, d, IDS);
  if (m === p) agree++;
  else console.log('    DISAGREE on ' + JSON.stringify([a, d]) + ': module=' + m + ' page=' + p);
}
t('the in-page predicate matches the module on every case', agree === cases.length,
  agree + '/' + cases.length);
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
