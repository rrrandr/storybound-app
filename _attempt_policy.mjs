// WHEN MAY A STAGE BE DISPATCHED AGAIN? One definition, so the runners cannot disagree and so the
// decision is testable without a provider.
//
// THE DISTINCTION THAT COST A RUN. The FS corpus run dispatched the author, the fetch threw, and a
// blunt one-attempt rule then refused the app's two legitimate retries — a transient transport
// failure became a stopped issue at scene 2. The two cases are not the same:
//
//   a COMPLETED response already exists   -> a retry is a second charge for the same question.
//                                            BLOCKED, always. This is the rule that stops a
//                                            rejected planner being paid for three times.
//   the last attempt NEVER CAME BACK      -> the app is recovering from a transport failure, and
//                                            refusing it guarantees the scene cannot render.
//                                            ALLOWED, up to maxTransportRetries.
//
// BOUNDED, because "retry until it works" is how a capped run stops being capped — and because
// every dispatched attempt may have billed whether or not it answered, which is why the caller
// reserves (1 + maxTransportRetries) per stage and books a no-response attempt as unmeasured.
export const classifyAttempt = ({ completed, transportFails, maxTransportRetries }) => {
  const cap = Number(maxTransportRetries);
  const fails = Number(transportFails) || 0;
  if (completed) {
    return { allow: false, outcome: 'blocked_duplicate',
      why: 'a completed response already exists for this stage' };
  }
  if (!(cap >= 0)) {
    return { allow: false, outcome: 'blocked_retry_cap', why: 'no retry budget configured' };
  }
  if (fails > cap) {
    return { allow: false, outcome: 'blocked_retry_cap',
      why: 'transport retry cap reached (' + cap + ')' };
  }
  return { allow: true, outcome: 'dispatch', attempt: fails + 1, of: cap + 1,
    why: fails ? 'the previous attempt never returned' : 'first attempt' };
};
