# Measurement-path fixes before a replacement live run (2026-09-04)

## 1. The "PRIMARY_AUTHOR retries 20×" defect does not exist — my report was wrong

`PRIMARY_AUTHOR` is the **default value of the `role` parameter** of `callChatGPT`
(`orchestration-client.js:1376`, and again at 1380 for the two-arg form), on top of 57 explicit
call sites. So 20–21 dispatches carrying that label are 20–21 **different calls**, not one call
retried. I read a label collision as a retry storm and reported it as one.

Production's actual retry policy, at `orchestration-client.js:1610`:

```js
const _maxAttempts = options.retryOnTimeout ? 2 : 1;
```

At most **one** retry, and only for transient classes — timeout, 502, 503, 529. Rate limits are
explicitly excluded: *"429 rate-limits are NOT retried here (terminal)"* (line ~1712). There is
no unbounded retry path and no spend-safety defect here to fix.

The harness-side dispatch ceiling stays anyway (default 45, `CEILING=` to change). It is cheap
and it is the only backstop that exists while no provider-side cap is set.

## 2. The first live run did not measure this branch — it hit the live site

`route.fetch()` called with no `url` re-issues the request to its **original** URL and bypasses
the caller's own route handlers. The page origin was `https://storybound.love`, which is a live
deployment (`307`, Vercel, 216.198.79.1). Every model dispatch therefore left for production
instead of the local dev server. The local server log confirms it: **zero** proxy activity
during the run window.

That single fault explains both symptoms:

- **The three Mistral calls reported no usage** because they received redirects, not model
  responses. `api/mistral-proxy.js:241` forwards `data.usage` at the top level *and* under
  `_orchestration.usage` — the proxy instrumentation was never missing. The gap was mine.
- **The author never ran.** The failed Mistral responses drove the fallback cascade down to the
  terminal `gpt-4o-mini` author, which is what the six `PRIMARY_AUTHOR` dispatches were.

The prompts were built by local code (the page was served from the dev server), but the
dispatches, keys and proxy handlers were production's. It was a hybrid, and not the measurement
that was asked for.

It also means the run sent traffic to the live production site. That was not intended and not
disclosed in advance; it is now.

**Fixed:** `route.fetch({ url: DEV + pathname + search })`, so the local proxy handlers execute.

## 3. Ledger now covers every provider route

- Usage is searched across all proxy envelope shapes, including `_orchestration.usage`.
- Model id resolves from `respJson.model` **or** `_orchestration.model` (`api/proxy.js:505`)
  **or** the request body.
- Every record carries `httpStatus`, `parseError`, `respBytes` and `transportOk`. A call that
  failed at the transport is now visibly a **failed call**, not a call with unknown usage —
  conflating those is exactly what made three redirects look like a Mistral instrumentation gap.
- A dispatch whose provider cannot be resolved is recorded as `unresolved/api/<route>`, never
  bucketed as "unknown" beside real providers. An unattributed call is a hole in the ledger and
  now looks like one.
- Missing usage still stays **UNKNOWN**, never zero.

## 4. The boot-time auto-begin race was the harness lying to the app

The app was behaving correctly. The harness stubbed the Supabase origin with `{}`, and
supabase-js hands that back as a **truthy data row** — so the boot-time deferred-intent lookup
at `app.js:12583` found a "purchase intent", took the `CHECKOUT_RETURN` branch, and fired a
second `handleBeginStory()` on a 500 ms timer (`app.js:11686`) underneath the one already
running. That second entry re-hydrated the profile and reset access state mid-measurement.

Fixed, in the real authorized flow rather than around it:
- The Supabase stub returns `[]` with `content-range: */0` — what PostgREST returns for no rows,
  which `.maybeSingle()` reduces to `null`.
- Checkout-intent keys (`sb_baked_pending_entry`, `sb_ff_pending_entry`,
  `sb_pre_checkout_fortunes`, `sb_pending_op_*`) are cleared before any page script runs.
- The run waits for profile hydration to complete before staging access state, so hydration is
  no longer the last writer.
- `handleBeginStory` is wrapped and counted: more than one entry now **fails the proof** rather
  than being something to notice afterwards in a log.

## 5. Dry proof — 7/7 green, $0

48 dispatches, every one intercepted; nothing reached an unrouted origin.

```
  ok  exactly one handleBeginStory entry (no boot-time auto-begin race)   — entries=1
  ok  access state survived hydration   — subscribed=true fortunes=9999
  ok  the flow REACHES THE AUTHOR (NARRATIVE_AUTHOR dispatched)   — author dispatches=2
  ok  every model dispatch was intercepted — nothing reached an unrouted origin   — escaped=0
  ok  every dispatch completed at the transport (200 + parseable body)
  ok  every dispatch is attributed to a provider
  ok  the wire ledger saw at least as many calls as the in-app ledger   — wire=48 inApp=11
```

The dry envelope is now shape-faithful: it carries `_orchestration.model`, resolved from
production's own role→model table read out of `api/proxy.js` at load time. Before that fix the
mock omitted a field the real response carries, and the ledger could not attribute a single
`/api/proxy` call — it would have passed rehearsal and failed in the paid run.

`wire=48 inApp=11` is the coverage gap that justified wire accounting: the in-app ledger sees a
quarter of the dispatches in dry, and saw 1 of 12 in the live run.

**Known limit, stated rather than papered over:** the dry run still produces no prose. The
generic fixtures do not satisfy the ~21 downstream passes, so the scene does not finalize. The
bar set for this stage was *reaches the author*, and that is met and asserted. Whether the
scene completes end-to-end can only be established by the live run.

## Status

Awaiting authorization for one replacement live run. Nothing has been committed:
`public/orchestration-client.js` (all-provider ledger) and `_cold_scene1_cost_run.mjs` are
modified/untracked in the working tree.
