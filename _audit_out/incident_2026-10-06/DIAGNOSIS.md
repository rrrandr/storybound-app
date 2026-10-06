# The void run: diagnosis and the missing stop — 2026-10-06

No paid dispatch. **Unresolved exposure left intact.** Evidence preserved under
`_audit_out/incident_2026-10-06/` (29 wire responses, calls.json, console.log, the dev log as it
stood) **before** anything was restarted.

---

## The failure that mattered was mine: the runner kept spending

The response handler caught the failed JSON parse, retained the estimate, and **passed the error
back to the app** — which then ran its fallback chain and took further turns. 29 calls were
dispatched against a response path returning nothing usable, each one reserving budget. The budget
guard worked; **an infrastructure stop was missing.**

**Fixed.** One shared detector, reached by both the live and fixture response paths — the first
version lived only in the live branch and the demonstration dispatched 84 calls straight past it.
On `NO_RESPONSE_FROM_FUNCTION` / `FUNCTION_INVOCATION_*` it preserves the body, records endpoint,
HTTP status, content type, timing and any request identifiers to `infra_failure.json`, keeps every
outstanding reservation, and refuses all further provider dispatches.

Demonstrated by injecting the runtime error page as the first unmatched reply:

```
*** STOPPING — INFRASTRUCTURE FAILURE — the local function did not return a usable response
    on call 22 (/api/proxy, 3ms). The upstream call MAY ALREADY BE BILLED.
    0 reservation(s) still outstanding, $0.000000 in flight — RETAINED, not released.
call refused after the infrastructure failure: ministral-8b-2512 (/api/mistral-proxy)
call refused after the infrastructure failure: grok-4-1-fast-reasoning (/api/proxy)
call refused after the infrastructure failure: gpt-4o-mini (/api/chatgpt-proxy)
call refused after the infrastructure failure: gpt-4o (/api/chatgpt-proxy)
```

**84 dispatched before the fix → 22 dispatched, 11 refused after.** Fallback tiers are refused in
the harness only; GPT/Mistral fallback in normal production operation is untouched.

## "Text rendered" is no longer counted as a model exchange

The void run counted five "completed exchanges" that were the app's own fallback. The preserved
console says so plainly:

```
[INTIMACY-DIALOGUE] using soft-deflect fallback (LLM call failed)
```

An exchange now counts toward the six only when **no fallback was logged for that turn**. A turn
that fell back is announced and excluded, the artefacts carry `modelBackedReplies` alongside the
rendered count, and two fallbacks with zero model-backed replies halt the run. The placeholder
guard checks the *submitted input*; it never established authorship of the reply, and is not
treated as doing so.

---

## Diagnosis: what is located, and what is not

**Withdrawn: "environment, not product."** I said that without locating the failure.

**Also withdrawn: my `maxDuration` hypothesis.** The provider proxies declare no `maxDuration` and
real calls measured 8.5–62s, so I expected the runtime to be cutting them off. **Disproven:**
`api/diag-slow.js`, sleeping through the same dev runtime, returns HTTP 200 JSON at 2s, 9s, 12s,
20s and **40s**. Duration alone does not drop a response.

**What the preserved log shows — and what it does NOT attribute.** The log contains ten successful
upstream calls:

```
[SPECIALIST-PROXY] latency=9350ms  model=grok-4.3 ... status=200   ✓ succeeded
[SPECIALIST-PROXY] latency=62350ms model=grok-4.3 ... status=200   ✓ succeeded
10 successful upstream calls · latencies 8,556ms – 62,350ms, median 13,133ms
```

**Corrected: these are NOT established as ten charges for this incident.** The log carries **no
timestamps and no request identifiers** (`grep` for `x-vercel-id`/`request-id`/`req_`: 0 hits), so
nothing ties those lines to the 29 failed responses of this run rather than to earlier activity in
the same log. They establish successful upstream calls *somewhere in that log*, and no more. I
previously presented them as ten attributable charges for the void run; that attribution was not
supported.

What remains true: successful upstream calls did occur, so real billing for the period is **not**
near zero — which is why the exposure is retained rather than written off. The size and the
attribution are both open.

### Withdrawn: "the provider proxies have no upstream timeout"

**They have one.** `api/proxy.js:179` is
`XAI_CALL_TIMEOUT_MS = Number(process.env.XAI_CALL_TIMEOUT_MS) || 90000`, and the call site wraps
**both** the `fetch` and the subsequent `response.text()` in an `AbortController` firing at that
bound. My earlier test waited **six seconds against a ninety-second timeout** and concluded there
was none — and its mock ignored the abort signal entirely, so it would have hung even when a real
abort fired. That test could not support the claim.

**Tested properly** (`_proxy_response_path_control.mjs`, 10/10 — the real handler, `global.fetch`
stubbed to honour `signal`, `XAI_CALL_TIMEOUT_MS` overridden to 1200ms):

```
bound 1200ms | outcome: returned | elapsed 4808ms | signal seen true | aborted true
[SPECIALIST-PROXY] Model grok-4.20-0309-non-reasoning TIMED OUT after 1202ms — advancing chain
... all four models in the chain time out and the handler RETURNS
```

The proxy passes the signal, the timeout fires, the chain advances, and the handler returns. A
healthy upstream returns HTTP 200 JSON **carrying the usage receipt** the runner needs. **No second
timeout is being added and no provider policy is being changed.**

### The real-runtime verification, and what it does not show

Importing the handler with a fabricated `res` tests handler behaviour, not delivery.
`_runtime_delivery_control.mjs` (11/11) exercises **the actual endpoints over HTTP through the
running local runtime**, on paths that return *before* any upstream call (`api/proxy.js:248`
non-POST, `:280` missing messages) — so it is provider-free by construction:

```
/api/proxy  POST no messages -> HTTP 400 application/json {"error":"Messages array is required"}
  request identifiers: {"server":"Vercel","x-vercel-id":"dev1::dev1::an7vg-1791270166853-..."}
/api/chatgpt-proxy -> HTTP 405 handler body    /api/mistral-proxy -> HTTP 405 handler body
```

Those are **smoke tests only** — they return before any upstream work.

**And my second attempt was not the Vercel test either.** `_runtime_upstream_mocked_control.mjs`
creates its own `http.createServer` with a handwritten response adapter, which **removes the very
runtime under suspicion**. It is now labelled a handler-over-HTTP test, and its "the void run's
latency band" claim is withdrawn — those historical logs were never attributed to the void run.

### The Vercel response path, finally tested

`_vercel_runtime_mock_control.mjs` (17/17) starts an **isolated `vercel dev`** on its own port with
`NODE_OPTIONS=--require ./_mock_upstream_preload.cjs`, so the upstream mock is installed **in the
function worker itself** and Vercel's own request/response handling is preserved end to end. The
preload answers `api.x.ai` and **throws on every other external host**.

**The mock is proven installed before any valid request is sent:**

```
/api/diag-mock -> {"mockInstalled":true,"upstreamCalls":0,"denied":[],"pid":52756,"delayMs":0}
```

**Then, through the real Vercel path:**

```
HTTP 200 | application/json | 1103ms | x-vercel-id: dev1::dev1::b979g-1791272443270-...
body: {"id":"chatcmpl-vercel-mock","model":"grok-4.3",...}
  the mocked reply content survived · the USAGE RECEIPT survived · marker proves the mock served it

and with a 12s upstream delay:
HTTP 200 | 13090ms | x-vercel-id: dev1::dev1::8078c-1791272497188-...
  delivered, receipt intact, not the runtime error page
```

One finding about the runtime itself: **each request runs in its own worker process** (probe pids
52756 → 52762), so an in-worker counter cannot be read across requests. My first assertions assumed
a shared process; the conclusive evidence is the mock's own `chatcmpl-vercel-mock` marker in the
body, which no provider can produce.

**So a response is received, processed and delivered through the actual Vercel runtime, including at
12 seconds. The incident is still not reproduced and still unexplained.** My earlier "located gap"
stays withdrawn, and I am claiming no cause.

## Positive evidence replaces absence-of-fallback counting

The previous counter incremented whenever its console pattern did **not** match, so a missed log
line read as success. A turn is now model-backed only on positive evidence: an OAS-stage response
**received and parsed** for *that encounter and turn*, carrying a usable `li_dialogue`/`li_action`,
**and** the app rendering a new reply from it. Keyed by identity, so an unrelated successful call
cannot vouch for a turn. No dollar receipt is required.

Identity is **captured at dispatch** and carried into the recorder — reading the mutable context at
response time credited a late reply to the current turn. The field-name regex is **gone**:
malformed content that merely mentions `li_dialogue` is not a parsed reply. And the recorded
response must be shown to have **supplied the rendered turn**: the **complete dialogue+action
pair** must equal the rendered turn's pair, with normalization limited to display-layer forms
(unicode quotes/dashes, collapsed whitespace, case). The first matcher accepted **either field** and
**substrings** — Codex reproduced both false positives, a generic shared action and `"the Duke"`
matching `"I never told the Duke."` — and those are now permanent negative cases.

```
model reply RECEIVED AND RENDERED for turn 1 — call 7, matched on dialogue — counts toward the six
```

`_oas_reply_evidence_control.mjs` (16/16) covers the three reproduced defects as named negatives: a
late prior-turn response (does not count for the later turn, still counts for its own), malformed
content containing the field names (truncated JSON, prose, non-string and empty typed fields, an
unparseable envelope — none are evidence), and a rejected response followed by application fallback
(the rendered fallback text does not match the received response, so it does not count).

And the negative case, where the OAS returns HTTP 200 with no reply in it:

```
*** NOT A MODEL EXCHANGE — no OAS reply was received and parsed for this turn. ***
*** STOPPING — the app fell back 2 time(s) with ZERO model-backed replies ***
7 calls dispatched  (instead of running on)
```

## Before any further story evaluation

1. **The cause is still unknown.** The full response path now passes provider-free with the
   upstream mocked in-process, at the incident's own latency band — so no timeout or policy change
   is warranted on the evidence, and the difference between that pass and the incident is not yet
   identified.
2. **Reconcile against real billing** when available — the xAI console is ground truth. Nothing in
   this report attributes a specific number of charges to this run.
3. `api/diag-slow.js` and the two diagnostic controls are left in place for the open response-path
   question; delete them once settled.
