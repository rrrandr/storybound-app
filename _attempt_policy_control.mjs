// THE ATTEMPT POLICY, proven without a provider. $0.
//
// The corpus runner's own flow cannot produce a retry after a COMPLETED response — the app
// re-judges its cached reply instead of re-requesting — so that branch is unreachable end to end
// and is proven here, at the one place the decision is defined.
import { classifyAttempt } from './_attempt_policy.mjs';
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
console.log('=== ATTEMPT POLICY CONTROL (provider-free, $0) ===\n');

console.log('1. a first attempt is allowed');
{
  const v = classifyAttempt({ completed: false, transportFails: 0, maxTransportRetries: 1 });
  t('allowed, attempt 1 of 2', v.allow === true && v.attempt === 1 && v.of === 2, JSON.stringify(v));
}

console.log('\n2. a COMPLETED response blocks every retry — the second-charge rule');
for (const cap of [0, 1, 2]) {
  const v = classifyAttempt({ completed: true, transportFails: 0, maxTransportRetries: cap });
  t('cap ' + cap + ': blocked as a duplicate',
    v.allow === false && v.outcome === 'blocked_duplicate', JSON.stringify(v));
}
{
  // Even with transport failures on record, a completed response still wins: the question was
  // answered once, and answering it again costs again.
  const v = classifyAttempt({ completed: true, transportFails: 1, maxTransportRetries: 1 });
  t('a completed response outranks a prior transport failure',
    v.allow === false && v.outcome === 'blocked_duplicate', JSON.stringify(v));
}

console.log('\n3. a transport failure may be retried, up to the cap');
{
  const v = classifyAttempt({ completed: false, transportFails: 1, maxTransportRetries: 1 });
  t('one failure, cap 1: allowed as attempt 2 of 2',
    v.allow === true && v.attempt === 2 && v.of === 2, JSON.stringify(v));
  const v2 = classifyAttempt({ completed: false, transportFails: 2, maxTransportRetries: 1 });
  t('two failures, cap 1: BLOCKED at the cap',
    v2.allow === false && v2.outcome === 'blocked_retry_cap', JSON.stringify(v2));
  const v3 = classifyAttempt({ completed: false, transportFails: 1, maxTransportRetries: 0 });
  t('cap 0 means no retry at all', v3.allow === false && v3.outcome === 'blocked_retry_cap',
    JSON.stringify(v3));
  const v4 = classifyAttempt({ completed: false, transportFails: 2, maxTransportRetries: 2 });
  t('cap 2 allows a third attempt', v4.allow === true && v4.attempt === 3 && v4.of === 3,
    JSON.stringify(v4));
  const v5 = classifyAttempt({ completed: false, transportFails: 3, maxTransportRetries: 2 });
  t('cap 2 blocks a fourth', v5.allow === false && v5.outcome === 'blocked_retry_cap');
}

console.log('\n4. the bound is unconditional — no input opens an unbounded retry');
{
  let worst = 0;
  for (const cap of [0, 1, 2]) {
    for (let f = 0; f <= 6; f++) {
      const v = classifyAttempt({ completed: false, transportFails: f, maxTransportRetries: cap });
      if (v.allow) worst = Math.max(worst, v.attempt);
      t('cap ' + cap + ', ' + f + ' failure(s): ' + (v.allow ? 'attempt ' + v.attempt : 'blocked'),
        v.allow ? v.attempt <= cap + 1 : true, JSON.stringify(v));
    }
  }
  t('no combination ever allows more attempts than cap+1', worst <= 3, 'worst=' + worst);
  const bad = classifyAttempt({ completed: false, transportFails: 0, maxTransportRetries: undefined });
  t('a missing cap refuses rather than defaulting to unlimited',
    bad.allow === false && bad.outcome === 'blocked_retry_cap', JSON.stringify(bad));
}

console.log('\n5. the runner uses this definition rather than its own copy');
{
  const fs = await import('fs');
  const src = fs.readFileSync('_fs_issue_corpus.mjs', 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  t('the corpus runner imports classifyAttempt',
    /import \{ classifyAttempt \} from '\.\/_attempt_policy\.mjs'/.test(src));
  t('and holds no second copy of the decision',
    !/transportFails > MAX_TRANSPORT_RETRIES/.test(src));
}

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
