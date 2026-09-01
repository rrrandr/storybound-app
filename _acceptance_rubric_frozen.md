# FROZEN ACCEPTANCE RUBRIC — bounded real Scene-1 integration

Frozen and committed BEFORE the harness can dispatch anything, so no threshold is chosen after
seeing output. Production's own validators are the authority for every structural claim.

## PERMITTED PAID DISPATCHES — exactly three

1. one Mistral CHARACTER_PORTFOLIO generation
2. one Mistral Scene-1 opening planner
3. one Grok author call

Option composition is BACKEND-ONLY and dispatches nothing. Everything else — setup generation,
bibles, A-plot, scaffold, canonicalizer, character sheets, r-plot, subplots, the post-author lane,
auditors, retries and fallbacks — is intercepted or aborted, and every one is counted by bucket.

## MECHANICAL GATES

- exactly 3 requests continue to a provider; any 4th is blocked at the route
- zero unknown requests, zero escaped requests
- no retry and no repair: a second attempt at any of the three is blocked, not answered
- each raw response persisted immediately, before any assertion
- the run stops after the author call

## ACCEPTANCE — all six

1. The fresh portfolio validates and grounds against owned, current-scene evidence.
2. The planner selects only a backend-offered option_id; facet, pressure and evidence are
   resolved from the backend record, never read from the reply.
3. The author receives the selected truth, condition, visible action and PC interpretation —
   and no portfolio internals, option ids, evidence ids, bridge or raw facet JSON.
4. C+, E+ and Fusion each survive into the final prose.
5. The final prose DEMONSTRATES the psychology rather than naming it: the canonical truth does
   not appear as a sentence, and the behaviour is shown.
6. The census is exact: three permitted paid dispatches, zero unknown, zero escaped.

## AUTHORISATION PRECONDITION

If the author route has no hard output-token ceiling, authorisation is REFUSED — a worst case
cannot be computed from an unbounded output, and a guard against an unbounded number is theatre.

## STOP CONDITION

Report and stop, pass or fail. No second run under this authorisation.
