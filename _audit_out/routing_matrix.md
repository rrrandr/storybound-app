# Cold Scene 1 — model routing matrix (dry; no dispatch, no code)

## Read this first: the inventory is incomplete, and it cannot be completed from what exists

**No cold Scene 1 has ever run to completion.** The only valid dev-bound capture (Run 2,
2026-09-04T15:40–15:42Z, all 12 dispatches confirmed local) stopped when
`PROMPT_PREPROCESSOR` took two 429s. Everything downstream of the author — the post-author
editorial passes — has never executed in a valid capture. Rows below are marked
**[measured]** (Run 2, real usage) or **[dry]** (fixture rehearsal: real request sizes, no
real token counts, and call counts inflated by fixture rejection).

**A second gap blocks role-based routing outright.** `PRIMARY_AUTHOR` is the *default value*
of the `role` parameter of `callChatGPT` (`orchestration-client.js:1376`), not one call site.
Six distinct sites in Run 2 and 21 in the dry run report under that one label. **The capture
cannot tell them apart, so "route PRIMARY_AUTHOR to X" would move six unrelated calls
together.** Per-call-site labels are a prerequisite for this row, not a nicety.

## Verified model facts (from current docs, not memory)

| model ID | ctx | structured outputs | function calling | `reasoning_effort` | price /M |
|---|---|---|---|---|---|
| `mistral-small-2603` (Small 4) | 256k | yes | yes | **yes** — `"high"` \| `"none"` | not verified |
| `ministral-14b-2512` | 256k | yes | yes | **no** | $0.20 |
| `ministral-8b-2512` | 256k | yes | yes | **no** | $0.15 |
| `ministral-3b-2512` | 256k | yes | yes | **no** | $0.10 |

`reasoning_effort` accepts exactly `"high"` and `"none"`. It exists **only** on Mistral Small
and Medium; no Ministral model takes it. Per your instruction this is treated as a *mode*, not
a bucket: `mistral-small-2603` at `none` and at `high` share one 20,000 TPM / 1 RPS bucket.

**Blocking constraint discovered in our own proxy:** `api/mistral-proxy.js:85` rejects any
`response_format` whose type is not `json_object`. Every schema-constrained role we might move
to Mistral is therefore capped at JSON mode until that proxy is changed. That is a prerequisite,
not a routing decision.

## The matrix

| # | role (call site) | route | current model | request | output | reasoning? | output contract | proposed | effort |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `NORMALIZATION` ×2 **[measured]** | chatgpt-proxy | gpt-4o-mini | 1,891 / 1,890 tok (2nd: 1,792 cached) · 7.0 KB | 20 / 19 tok | no | short, deterministic | `ministral-3b-2512` | n/a |
| 2 | `PRIMARY_AUTHOR` ×6 — **six distinct sites, one label** **[measured]** | chatgpt-proxy | gpt-4o-mini | 1,392–14,932 tok · med 13.4 KB, max 70.3 KB | 167–1,791 tok | no | mixed; some `json_object` | **cannot propose — split the label first** | — |
| 3 | `STRUCTURE_GENERATOR` ×1 **[measured]** | /api/proxy | grok-4.3 | 21,849 tok (192 cached) · 79.1 KB | 1,247 visible + **761 reasoning** | **yes, demonstrably** | strict JSON plan | **keep on Grok** | leave unset |
| 4 | `NARRATIVE_AUTHOR` **[dry]** | /api/proxy | grok | ~355 KB ≈ 89k nominal | — | yes | long-form prose | **keep on Grok** | leave unset |
| 5 | `SPECIALIST_RENDERER` ×18 **[dry]** | /api/proxy | grok | med 2.2 KB ≈ 550 nominal | — | no | short render fragments | `ministral-8b-2512` | n/a |
| 6 | `PROMPT_PREPROCESSOR` ×2 **[measured — both 429]** | mistral-proxy | mistral-small-latest | **77.9 KB ≈ 19,465 nominal** | never returned | no | text | **blocked — see below** | — |
| 7 | `LINE_EDITOR` ×1 **[dry]** | mistral-proxy | mistral-small-latest | 4.7 KB ≈ 1,168 nominal | — | no | prose edit | `ministral-8b-2512` | n/a |

Nominal = UTF-8 bytes ÷ 4. A sizing bound for budgeting only — **not a token count**, and no
cost figure is derived from it.

## The two hard blockers

**1. `PROMPT_PREPROCESSOR` cannot fit its own bucket.** One request is ~19,465 nominal tokens
against a 20,000 TPM ceiling; the four Mistral calls in a scene total ~23,262. No scheduler
arranges 23k into a 20k/minute budget, and one request alone nearly exhausts the window. Moving
it to `ministral-14b-2512` (a separate per-model bucket, 256k context) only helps if that
bucket's TPM is materially larger — **which I cannot verify.** Your Limits page shows per-model
numbers; the docs publish none. **Prompt reduction is the required prerequisite either way.**

**2. The separate-bucket premise is unverified.** Mistral documents rate limits as listed *per
model*, which is what makes distribution possible in principle. The actual per-model TPM/RPS
figures for this account exist only on your Admin Limits page. Until you read off the numbers
for `ministral-3b/8b/14b-2512`, every distribution claim below is conditional.

## Recommendation

**Do not attempt to eliminate gpt-4o-mini yet.** Two of the three things that decision needs
are missing: the `PRIMARY_AUTHOR` label collision hides which six calls would move, and the
Ministral bucket sizes are unknown. Moving 52,310 measured OpenAI tokens per scene onto Mistral
buckets sight-unseen swaps a working route for a rate-limited one.

Ordered, each gated on the previous:

1. **Split the `PRIMARY_AUTHOR` label** — give each of the six sites its own role name. Free,
   no dispatch, and nothing else in this table can proceed without it.
2. **Read the per-model limits** for `ministral-3b/8b/14b-2512` off the Admin Limits page.
3. **Reduce the `PROMPT_PREPROCESSOR` prompt** below whichever bucket it targets. It is 77.9 KB
   for a preprocessing step; that is the anomaly, not the limit.
4. **Then** migrate rows 1, 5, 7 — the small, non-reasoning, low-contract rows — one bucket at
   a time. Keep rows 3 and 4 on Grok: row 3 is the only call that demonstrably used reasoning
   (761 tokens, unset effort), and row 4 is ~89k nominal, beyond any Mistral bucket in play.
5. **Do not** move any schema-constrained role until `api/mistral-proxy.js` accepts more than
   `json_object`.

## Dry acceptance plan

**Contract fixtures** — one per migrated role, asserting the *shape* the consumer parses
(fields, types, required keys), not prose. One real shape per fixture; a union of shapes
previously hid a live Scene-1 outage through 57 green assertions.

**Fallback** — every migrated role keeps its current model as fallback on 4xx/5xx. A 429 stays
terminal and is never retried; the point is not to provoke one. Fallback firing must be
recorded per call, so a "successful" run that silently ran entirely on fallbacks is visible.

**Per-bucket budgeting** — schedule against each *model's* bucket separately, using exact
reported usage with a nominal pre-reserve. Any single request whose reserve exceeds its bucket
is a **design error surfaced at build time**, not something to pace around at runtime.

**What one controlled post-change live Scene-1 run would be authorized to measure:**
- exact dispatch count by route and role, against a census frozen before dispatch;
- exact per-provider token usage at the wire, with missing usage recorded as unknown;
- per-bucket peak TPM and RPS, to confirm no bucket was approached;
- whether the scene **completes** — the thing no run has yet demonstrated;
- exact xAI cost, reconciled against the console.

It would **not** be authorized to compare prose quality; that needs the paired blind protocol
and is a separate decision.

---

# Update — real bucket limits supplied, and the label problem is far larger than reported

## Corrections to what I wrote above

**1. Seven `PRIMARY_AUTHOR` dispatches, not six.** Run 2 contains 7 (wire #2,3,4,5,7,8,9);
2 NORMALIZATION + 7 PRIMARY_AUTHOR = the 9 OpenAI calls already reported.

**2. Not six call sites — 67.** Parsing every `callChatGPT(...)` invocation by balancing
parentheses (the earlier same-line regex was wrong on multi-line calls): **67 sites resolve to
`PRIMARY_AUTHOR`** — 40 pass it explicitly, 22 default by omitting the argument, and the rest
pass an options object in the role position, which `orchestration-client.js:1379` shifts and
replaces with `PRIMARY_AUTHOR`. They sit in ~56 distinct enclosing scopes.

**3. "Prompt reduction is a required prerequisite" was wrong.** That claim was explicitly
conditional on unknown bucket sizes, and the condition has now resolved against it.

## The supplied per-model limits change the constraint entirely

| model | TPM | vs. one PROMPT_PREPROCESSOR request (~19,465 nominal) | vs. whole-scene Mistral load (~23,262) |
|---|---|---|---|
| `mistral-small-2603` | 20,000 | **97% of the bucket — does not fit** | **over budget** |
| `ministral-8b-2512` | 625,000 | 3.1% | 3.7% |
| `ministral-14b-2512` | 937,500 | 2.1% | 2.5% |
| `ministral-3b-2512` | 1,300,000 | 1.5% | 1.8% |

Even the *entire* measured OpenAI load of a scene — 52,310 tokens — is 4% of the 3B bucket.

**Throughput is no longer the binding constraint.** It was an artifact of everything sharing
Mistral Small's 20,000 TPM. Moving utility work to any Ministral bucket removes the ceiling by
one to two orders of magnitude. Prompt reduction on the 77.9 KB preprocessor is still worth
doing for cost and latency — but it is no longer a blocker, and I should not have called it one
without the numbers.

The remaining constraints are **quality/contract fit**, and `api/mistral-proxy.js:85` accepting
only `response_format.type === 'json_object'`.

## The separation cannot be done the obvious way

`role` is **not** a label. `api/chatgpt-proxy.js:228-231` uses it to select the model
(`getDefaultModel(role)`) and to authorise it (`validateModelForRole`, against
`ALLOWED_MODELS[role]`). Renaming a site's role is therefore a **routing change**, and an
unregistered role would be rejected outright.

Separation must use an **observability-only field** — a `callSite` string carried alongside
`role`, never read by model selection. The proxy destructures named keys and performs no
strict unknown-key rejection, so an extra field is inert there. Both ledgers already prefer
`role || profileLabel`, so a new field is one line in each reader.

**Static analysis cannot finish this job.** It yields 67 candidates; the capture says 7 fired.
Which 7 is a runtime fact, and nothing short of emitting the site identity at dispatch will
establish it. That is the next change — instrumentation, not routing.

## Revised recommendation

1. **Add a non-routing `callSite` field** at dispatch; leave `role` untouched. Then one dry
   fenced run attributes all 7 — free, no dispatch, no routing change.
2. **Then** decide per site. With buckets this large the question is no longer "does it fit"
   but "does a Ministral model meet this site's contract".
3. `PROMPT_PREPROCESSOR` → `ministral-14b-2512` is now viable on throughput alone (2.1% of
   bucket). Contract fit still needs a fixture.
4. Keep `STRUCTURE_GENERATOR` and `NARRATIVE_AUTHOR` on Grok, unchanged: the first is the only
   call that demonstrably spent reasoning tokens (761, effort unset), the second is ~89k nominal.
5. Nothing moves to Mistral that needs a JSON *schema* until the proxy accepts more than
   `json_object`.
