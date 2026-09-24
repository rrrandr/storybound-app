# Reasoning Mistral as a canon-auditor candidate — PREPARED, NOT RUN

Prepared 2026-09-24. **Zero provider dispatches. $0 spent.** The run stays locked behind an exact
authorization phrase that this document does not constitute.

Evidence: `_canon_audit_reasoning_request_out/` (38/38), `_canon_audit_calibration_dry_out/` (60/60).

## 1. Verified from Mistral's official documentation, not inferred

| Question | Answer | Source |
|---|---|---|
| Does `mistral-small-2603` exist and is it current? | **Yes.** Mistral Small 4, v26.03, 256k ctx. Every earlier Small snapshot (-2506, -2503, -2501, -2409, -2402) is **deprecated**. | model card; models-overview deprecation table |
| Pin the snapshot or the alias? | **Snapshot.** Mistral's own lifecycle page: an alias "may expose you to silent updates in model behavior and pricing… pin your deployment to a specific version." | inference/model-lifecycle |
| Is `reasoning_effort` a real parameter? | **Yes** — `ChatCompletionRequest.reasoning_effort`, enum `none\|minimal\|low\|medium\|high\|xhigh`. | **openapi.yaml**, the authoritative schema |
| Is `high` a real value? | **Yes**, and one of only two the prose docs describe; recommended for agentic use. | studio/conversations/reasoning |
| Pricing | **$0.15/M in, $0.60/M out**, consistent across three official surfaces. | pricing/api · inference/pricing · model card |
| Separate reasoning family? | **Gone.** Magistral is deprecated; its retirement dates (2026-07-31) have passed and it appears on no current pricing page. Reasoning is a parameter on Small 4, not a model. | resources/deprecated/native-reasoning |

**Flagged as NOT verifiable from official sources:** whether thinking tokens bill separately. No
pricing page, model card or reasoning doc says. Chat `UsageInfo` exposes only
`prompt_tokens` / `completion_tokens` / `total_tokens` — **there is no `reasoning_tokens` field on
chat completions**, so thinking cannot be broken out of the usage object at all. This is exactly
why the ceiling stays at the conservative $0.02 rather than being tightened.

Also flagged: `minimal`, `low`, `medium`, `xhigh` are schema-valid but have **zero prose
documentation**. We use `high`, which is documented.

## 2. A real production defect found on the way

The instruction was to verify the proxy forwards the parameter. It does. **The client could not
send it.**

`_tieredProviderDispatch` forwarded only `model / messages / temperature / max_tokens`. There was
no path from `_callTieredProvider` to `reasoning_effort` at all — the proxy has accepted and
validated that parameter for weeks against a client that had no way to use it.

And the failure would have been **silent and expensive**. `/api/mistral-proxy` auto-defaults
`reasoning_effort=high` *only* for author-class payloads, which it detects by the
`STORYBOUND ARCHITECTURE LAWS` system prompt. The canon-audit prompt does not contain it. So the
request would have gone out with no reasoning parameter, been served as **ordinary, non-reasoning
Mistral Small 4**, returned a perfectly valid answer, cost full price — and been filed under
"reasoning Mistral REJECTED". Nothing would have errored.

Second defect, worse: with reasoning on, `choices[0].message.content` is an **array of blocks**
(`{type:'thinking'}`, `{type:'text'}`), not a string. The array is **truthy**, so the tier's
`hadContent` check passes and **no fallback fires** — the caller receives
`"[object Object],[object Object]"` as an apparent success.

Both fixed in one place each:
- `_tieredProviderDispatch(..., extra)` forwards `reasoning_effort`, settable per-tier or per-call.
  Omitting it sends no key at all, so every existing caller is byte-identical.
- `_flattenProviderContent` normalises the block array: text blocks concatenate into the string
  every consumer expects; the thinking trace is returned **separately** as `.thinking` rather than
  discarded or pasted into prose.

## 3. The control proves the wire, and it bites

`_canon_audit_reasoning_request_control.mjs` — **38/38, zero dispatches.** It captures the real
outgoing request body at the network boundary (twice, independently: the calibration route's own
log and the stub), and proves:

- the wire names **`mistral-small-2603`** and carries **`reasoning_effort: "high"`** explicitly;
- `max_tokens` on the wire is 2000, the bound the cost estimate rests on;
- the block-array reply flattens to the model's real JSON, with the thinking trace kept separate.

Every assertion is also run in its **negative** form, because an assertion nobody has watched go
red is not a control:

| Degradation | Result |
|---|---|
| `reasoning_effort` **stripped** | assertion REJECTS; live dispatch **aborted before the wire** |
| `reasoning_effort: "none"` (which the proxy would accept) | REJECTED |
| right reasoning, wrong model (`ministral-8b-2512`) | REJECTED and aborted |
| right body, wrong endpoint (`/api/chatgpt-proxy`) | REJECTED and aborted |
| Grok tier | aborted — no fallback exists |
| unflattened array | really does stringify to `[object Object]`, proven directly |

A missing parameter is **aborted pre-dispatch**, not merely noted afterwards — the whole point is
that money must not be spent measuring the wrong model.

## 4. The $0.02 ceiling, with its arithmetic

```
in   3000 tok x $0.15/M = $0.00045        (measured gpt-4o-mini run: ~2,200 in/fixture)
out  2000 tok x $0.60/M = $0.00120        (max_tokens, spent in full — worst case)
per call                = $0.00165
x 8 fixtures            = $0.013200       ceiling $0.020000
```

`max_tokens` is raised from 700 to 2000 for this candidate specifically: a prior in-repo probe
measured thinking inflating completion by 2.0–2.7x, and at 700 the thinking blocks could consume
the entire budget and truncate the JSON answer — producing eight invalid responses and another
inconclusive run. The reservation is priced at the **full** `max_tokens`, not an expected value,
because thinking bills as output and is invisible in the usage object.

$0.02 is kept rather than tightened to ~$0.014 precisely because thinking-token billing is
undocumented. A tighter bound would be asserting something Mistral does not state.

The authorization phrase names its own ceiling —
`run the reasoning-mistral canon auditor calibration once under $0.02` — so an authorization for
the $0.01 runs cannot silently release this one.

## 5. What the run will preserve, per fixture

Exact outgoing request body · served model as the provider reports it · reasoning effort as the
**proxy** reports having applied (not what we asked for) · full usage · thinking trace and its
length · response text · validation result · latency · **realized cost computed from real usage**.

The report also asserts model identity rather than assuming it: if any fixture was served by
another model, or at an effort other than `high`, `modelIdentityClean` goes false and the run is
declared not to describe the candidate it claims to.

## 6. Standing state, unchanged

- Production semantic auditor: **DISABLED**. Untouched by this pass.
- Deterministic canon checks: **active**.
- Routing order: **unchanged**. Reasoning Mistral is **not wired into production** and a passing
  calibration would qualify it only as a candidate fallback.
- Two candidates tested so far, both rejected: `ministral-8b-2512`, `gpt-4o-mini`.

Full suite green: 38/38 · 60/60 · 56/56 · 43/43 · 13/13 · 73/73 · 62/62 · 53/53 · 40/40 · 32/32 ·
30/30 · 29/29 · 22/22 · 20/20 · 17/17 · 16/16.

## 7. The caution worth carrying in

A prior in-repo evaluation of `mistral-small-2603` with `reasoning_effort: "high"` measured
**4.5x–17x latency** on author payloads and rejected it for that role. Cost was noise; latency was
the price. The canon-audit prompt is ~2,200 tokens rather than ~90,000, so the absolute latency
should be far smaller — but if reasoning Mistral passes on accuracy, **latency is the axis on which
it will still fail as a pre-author gate**, and the run records per-fixture latency for exactly that
reason.

Separately: both rejected candidates returned `violation` on **100% of green fixtures**. The
hypothesis that the *prompt* is the common factor remains untested, and remains the cheaper
experiment.
