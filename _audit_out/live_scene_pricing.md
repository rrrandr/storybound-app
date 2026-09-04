# ONE CURRENT-PIPELINE SCENE 1 — PRICING

Measured 2026-09-04 against `public/app.js` @ `7128a99`. **Nothing was dispatched.** Every route
was fulfilled locally; the figures come from intercepted request payloads, not from a run.

**No live run is authorised.** See §5.

## 1 · The census is 34 calls, not 26

An earlier count of 26 counted only *classified* kinds. Full instrumentation records **34
dispatches**, of which **9 reach xAI** — not the single author call implied earlier.

Raw per-call data: `_audit_out/author_request_shape.json` (role, model, max_tokens, byte counts;
no prose).

## 2 · Bounded — 25 calls, OpenAI + Mistral

| | |
|---|---|
| input | **$0.092850650** |
| output | **$0.030429400** |
| **total** | **$0.123280050** |

`gpt-4o-mini` ×20 · `mistral-small-latest` ×4 · `gpt-4o` ×1.
`max_tokens` is a genuine ceiling on these routes, so this is a real maximum.

Rates read 2026-09-04: gpt-4o-mini $0.15 / $0.60 · gpt-4o $2.50 / $10.00 ·
mistral-small-latest $0.15 / $0.60, per million tokens.

## 3 · Unbounded — 9 calls, xAI

`grok-4.3`: $1.25 / $2.50 per M under 200k prompt tokens; $2.50 / $5.00 at or above.

```
input        $0.954536250   bounded — prompt sizes are measured
visible out  $0.043800000   max_tokens bounds ONLY the visible completion
reasoning    UNBOUNDED — not limited by any request parameter
known floor  $0.998336250
```

| role | kind | input tok | max_tokens |
|---|---|---:|---:|
| NARRATIVE_AUTHOR | author | 326,942 | 2400 |
| STRUCTURE_GENERATOR | aplotGenerator | 78,208 | 3000 |
| SPECIALIST_RENDERER | pa_reparagraph | 6,945 | 4000 |
| SPECIALIST_RENDERER | pa_perception | 6,919 | 3600 |
| NARRATIVE_AUTHOR | pa_lineEditor | 4,808 | 900 |
| SPECIALIST_RENDERER | pa_bannedPhrase ×2 | 3,587 each | 500 |
| SPECIALIST_RENDERER | pa_continuation ×2 | ~2,845 each | 110 |

The author request alone is **326,942 input tokens**, crossing the 200k line into the higher
tier — most of the xAI input cost is that one call.

## 4 · The number

```
ALL-IN KNOWN FLOOR : $1.121616300
ALL-IN MAXIMUM     : unbounded
```

xAI's model documentation states prices per million tokens but does not say whether reasoning
tokens bill as output, nor whether `max_tokens` bounds them. The floor is defensible; the ceiling
is not assertable from published material, so none is claimed here.

## 5 · The gate, and the rule for lifting it

**No live run until an xAI account/project spend cap exists, set by the account owner.** It is the
only mechanism that bounds the exposure where it is actually billed. The two alternatives were
considered and rejected: `reasoning_effort: 'none'` changes author behaviour, so the scene
produced would not be the scene production makes — which defeats the purpose; and accepting
unbounded spend on trust is not a bound.

When a cap is provided, the all-in maximum is computed by this rule and no other:

- **cap applies exclusively to xAI** → all-in maximum = **cap + $0.123280050**
- **cap applies more broadly** → all-in maximum = **the cap**, reported as the total

## 6 · How these numbers were produced

Temporary measurement instrumentation in `_scene1_skeleton_delivery.mjs`, behind
`SB_AUTHOR_SHAPE=1`, recording each intercepted dispatch's role, model, max_tokens and request
byte count, then reverted. It is **not committed**: this report and its data file are the record.
Reproducing it means re-adding a recorder at the suite's route handler where `kind` is computed.

Token counts use 1 token per UTF-8 byte plus 200 protocol overhead — deliberately over-counting,
which is the correct direction for a bound.
