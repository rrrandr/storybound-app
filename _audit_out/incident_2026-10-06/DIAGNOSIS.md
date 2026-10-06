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

**What the preserved log establishes:** the functions were *succeeding upstream*.

```
[SPECIALIST-PROXY] latency=9350ms  model=grok-4.3 ... status=200   ✓ succeeded
[SPECIALIST-PROXY] latency=62350ms model=grok-4.3 ... status=200   ✓ succeeded
10 successful upstream calls logged · latencies 8,556ms – 62,350ms, median 13,133ms
```

So **real Grok calls completed and were billed** while the browser received error pages. That is
worse than "no real calls were made", and it is why the exposure cannot simply be written off.

**What the proxy's own response path does**, exercised with the upstream mocked
(`_proxy_response_path_control.mjs`, 8/8 — the real handler, `global.fetch` stubbed, no network):

- a healthy upstream → the handler returns HTTP 200 JSON **carrying the usage receipt** the runner
  needs. The response path itself is sound.
- an upstream that never settles → **the handler never returns and imposes no timeout of its own**.
  That is exactly the observed failure shape: the function cannot fail fast, cannot report, and the
  runtime is left to emit `NO_RESPONSE_FROM_FUNCTION`.

**The located gap is therefore application-level: the provider proxies have no upstream timeout or
abort.** A stalled or very slow provider call leaves the handler unable to respond at all.

**What is still not established**, and I am not guessing: whether all 29 failures were stalls, or
whether some completed responses were dropped by the runtime after the handler returned. The
preserved dev log covers only 10 calls — it had already rotated — so the other 19 cannot be
attributed either way.

**Not fixed:** adding a timeout/abort to the proxies changes live provider behaviour and could mask
genuine slowness. That is a product decision.

## Cost: what the numbers are and are not

**Withdrawn: $1.033023 as any kind of bound.** It is *retained estimated exposure* — requested
`max_tokens` × 1.5 × 1.2, no cache credit — for calls whose receipts could never be read. It is
neither a measured bill nor a proven upper bound on billing.

**Withdrawn: the Mistral figure as a receipt.** 11,113 tokens × published rate ≈ $0.0017 is an
*estimate computed from token counts*, not a dollar receipt from an invoice.

At least ten Grok calls completed upstream at `grok-4.3` rates, so real billing is **not** near
zero. The ledger stands untouched at **receipted $0.8383757 + unresolved $1.1072741 =
$1.9456497**. Per instruction, individual calls will be reconciled only against attributable
usage/billing evidence or proof they never dispatched — and additional authorization would not make
unknown charges disappear.

## Before any further story evaluation

1. **Decide the proxy timeout question** — without it, a slow provider silently burns authorization
   and returns nothing.
2. **Reconcile against real billing** when it is available; the xAI console is the ground truth for
   the ten logged calls.
3. `api/diag-slow.js` is a diagnostic left in place for the response-path question; delete it once
   settled.
