# Per-site inventory — 49 dry dispatches, fully attributed

**Dry fenced capture only. No live run, no routing change, no proxy change, no prompt change,
no commit.** Production is byte-identical to committed `6462d31`: the browser pacing gate, the
in-payload `callSite` field and the in-app all-provider ledger have all been reverted
(`public/app.js` sha `e06958b61ac78ea0`).

## How attribution was obtained

A **harness-only fetch observer**, injected via `addInitScript` from
`_cold_scene1_cost_run.mjs`. It reads the URL, body byte length, role, model, `response_format`
and `max_tokens`, derives a stack chain, then calls native fetch **with the original arguments**.
It mutates no body, no header, no role, no routing, no timing. It exists in no shipped file.

This was necessary because the in-payload approach covered 8 of 49: **41 dispatches are raw
`fetch()` calls in app.js that never touch `callChatGPT`.** `fetch` is the only complete point.

A single stack frame is not an identity — `callChat` (app.js:271622) fans many callers through
one line. Chains keep up to four frames, which separates every case observed.

**Result: 49 of 49 dispatches attributed, to 38 distinct call sites.** Proof run: 10/10 green.

## Dry ≠ live. These are different runs and must not be merged.

| | dry (this capture) | valid live (Run 2) |
|---|---|---|
| dispatches | 49 | 12 |
| PRIMARY_AUTHOR | 22 across 20 sites | 7, sites unknown |
| token counts | none real (fixtures return 1) | real |
| completed? | reaches the author | stopped at Mistral 429 |

Dry counts are inflated by fixture rejection and the branches taken differ. **Nothing here says
which seven sites fired live.** Establishing that needs a live run, which is not authorised.
Request sizes below are real (the harness built real prompts); **output sizes are the declared
`max_tokens` ceiling, not measured output.**

## Inventory by role

| role | sites | dispatches | request range | JSON | current model |
|---|---|---|---|---|---|
| PRIMARY_AUTHOR | **20** | 22 | 3,363–70,345 B | 1 site `json_object` | gpt-4o-mini (19 sites), **gpt-4o (1 site)** |
| SPECIALIST_RENDERER | 10 | 19 | 1,676–7,021 B | none | grok (9 sites), mistral-small (1) |
| NARRATIVE_AUTHOR | 2 | 2 | 4,876 / **365,568 B** | none | grok |
| NORMALIZATION | 2 | 2 | 7,002 B | none | gpt-4o-mini |
| STRUCTURE_GENERATOR | 1 | 1 | 77,631 B | none | grok |
| PROMPT_PREPROCESSOR | 1 | 1 | **85,128 B** | **`json_object`** | mistral-small-latest |
| LINE_EDITOR | 1 | 1 | 4,670 B | none | mistral-small-latest |
| *(unlabelled)* | 1 | 1 | 3,529 B | none | mistral-small-latest |

**Only two sites in the whole scene declare a structured-output contract**, and both use
`json_object` — which `api/mistral-proxy.js` already accepts. No site requests a JSON *schema*.
The proxy's `json_object`-only restriction therefore blocks nothing currently in this path.

## Candidate replacement classes

Classes only — a class is a hypothesis to be tested by fixture, never a decision.

**A · Mechanical, small, unstructured → `ministral-3b-2512` candidates**
`SPECIALIST_RENDERER` ×19 across 10 sites, 1.7–7.0 KB, `max_tokens` 110–4,000. Short render
fragments, no structured contract. Largest cluster in the scene and the clearest class.
Sites incl. `app.js:307810<-272438<-272446<-*` (×10), `app.js:54961<-55044<-*` (×5).

**B · Medium utility, unstructured → `ministral-8b-2512` candidates**
`NORMALIZATION` ×2 (7.0 KB, `max_tokens` 500) at `app.js:16951<-254611` and `<-254626`;
`LINE_EDITOR` (4.7 KB) at `app.js:4989<-5012<-268730<-269933`; the unlabelled Mistral call
(3.5 KB). Small, bounded, already non-premium.

**C · Large, structured → `ministral-8b-2512` vs `ministral-14b-2512`, decided by fixture**
`PROMPT_PREPROCESSOR`, **85,128 B** (≈21.3k nominal), `json_object`, at
`app.js:264162<-264232<-267127`. Throughput is settled — 2.3% of the 14B bucket, 3.4% of 8B —
so the choice is purely contract quality. Note it is *larger* here than the 77,860 B seen
earlier; size varies with story state, which the fixture must reflect.

**D · Large PRIMARY_AUTHOR cluster → no class yet**
Six sites at 18.8–70.3 KB, all `gpt-4o-mini`, all free-text, mostly via
`app.js:251745` and `app.js:253266`. These are the bulk of the OpenAI load. They need
individual contract review before any class is assigned — size alone does not tell us whether a
Ministral model holds the line.

**E · Keep on Grok, unchanged**
`NARRATIVE_AUTHOR` (365,568 B ≈ 91k nominal) and `STRUCTURE_GENERATOR` (77,631 B) — the only
call that demonstrably spent reasoning tokens live (761, effort unset).

**F · `generateVoiceAnchor` — a separate quality decision, NOT an OpenAI→Mistral migration**
`app.js:81645`, reached via `269820`, 5,095 B, `max_tokens` 400. **The only `gpt-4o` call in the
scene.** Its own comment states the model was chosen deliberately: *"Use GPT-4o (not mini) for
higher-quality anchor generation — runs once per story."* Someone already decided mini was not
good enough here. Moving it is a question about voice-anchor quality, to be answered by
comparative evaluation on its own terms. It should not be swept into a cost migration, and it
is once per story — the cheapest row in the table to leave alone.

## What this does not establish

- Which seven sites fired in the valid live run.
- Real output sizes for any site (dry fixtures return 1 token).
- Whether any Ministral model meets any of these contracts — no contract fixture has been run.
