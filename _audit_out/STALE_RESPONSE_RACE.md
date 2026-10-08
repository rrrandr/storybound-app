# The author reply was discarded, not missing — causal trace (2026-10-08)

Provider-free reproduction through the ACTUAL runner. Production UNCHANGED.

## What the live run did

Two lines I omitted from my report are the whole story:

```
console.log:319  [INTIMACY-DIALOGUE] Rehydrate: dropping stale in-flight request
                 (age 0s, id 1791492488157-ejphkr)
console.log:338  [INTIMACY-DIALOGUE] Stale response (1791492488157-ejphkr) discarded
                 — current id: rehydrated-1791492488228
```

The request was replaced 71 ms after it started, while its fetch was still running. The reply
arrived 16 s later and the response handler rejected it — correctly, given the id it was comparing
against. The provider did nothing wrong: tier 1 returned HTTP 200 with 1049 usable characters.

## The false assumption, in the code's own words

`public/app.js:191950`, inside `_rehydrateOASUI`:

> If the persisted snapshot had `awaitingResponse=true`, the actual fetch died with the previous
> page load — no response will arrive for that request.

That holds for a request restored from `localStorage` after a reload. It is false for a request
started moments ago in this same page instance, which is what the entrance does. The guard at
`public/app.js:205333` then discards the reply exactly as designed.

## The caller, established from a stack rather than from timing

Harness-side wrapper around `_rehydrateOASUI` (no production logging added):

```
#1 awaiting=true age=69ms  1791494387283-zlfmym -> rehydrated-1791494387352
   *** REPLACED A LIVE REQUEST ***
      at wrapped (<anonymous>:12:29)
      at http://localhost:3000/app.js?v=20261008d-oas-deck:145250:26
```

`app.js:145250` is the deferred `gnReader` auto-resume — `setTimeout(_rehydrateOASUI, 80)` — which
fires 80 ms after entry, inside the entrance's own request window. It was a candidate; the stack
makes it the established caller.

## Fixture speed WAS concealing it — paired arms, one variable

Both arms are the same runner, same fixtures, same path; only the reply delay differs.

| arm | rehydration | result |
|---|---|---|
| `SB_REPLY_DELAY_MS=16000` | replaced a LIVE request, age 69 ms | reply discarded · deck never mounted · handoff failed |
| `SB_REPLY_DELAY_MS=0` | ran, but replaced nothing | entrance IS exchange 1 · six exchanges · STOPPING AS PLANNED |

A ~1 ms fixture reply lands before the 80 ms timer, so the race never opened. The live reply took
16 s and lost it every time.

## The narrow repair (proposed — NOT applied, production is frozen)

In `_rehydrateOASUI`, invalidate an awaiting request only when it cannot still complete, i.e. when
it was started before this page instance existed:

```js
if (d.awaitingResponse && (d.lastRequestStartedAt || 0) < performance.timeOrigin) {
  // started in a PREVIOUS page instance — its fetch died with that load
  ... existing drop + 'rehydrated-' sentinel ...
}
// otherwise: a request from THIS page instance is still in flight. Leave the identity alone.
```

- a reply from a genuinely obsolete request is STILL rejected: a restored request has
  `lastRequestStartedAt` from before `performance.timeOrigin` and is dropped as it is today;
- the stale-response guard at `app.js:205333` is untouched;
- nothing forces rendering and nothing in the harness bypasses navigation.

Open point worth deciding separately: whether the `gnReader` auto-resume should rebuild the UI at
all while a request is in flight, or defer until the reply is handled. The change above fixes the
discard; the redundant rebuild is a second question.

## Correction to my own earlier wording

I wrote that "nothing like it happens live" about the model-chain fallback. That overstates one
observation. The accurate claim: **this live invocation succeeded at tier 1** — one success does
not rule out future fallbacks.
