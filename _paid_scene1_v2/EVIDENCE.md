# Paid Scene-1 raw-first-draft compliance run — ABORTED BEFORE THE AUTHOR

**No Grok author call was made. No draft exists. The compliance rubric could not be applied.**

Spend: **~$0.041** across 14 escaped calls (13 prerequisite + 1 planner). Zero Grok author tokens.

## Request inventory — exactly what escaped

| kind | model | endpoint | in | out | $ |
|---|---|---|---|---|---|
| PREREQ ×12 | gpt-4o-mini | /api/chatgpt-proxy | 43,665 | 4,109 | 0.00903 |
| PREREQ | mistral-small-latest | /api/mistral-proxy | 359 | 127 | 0.00013 |
| PREREQ | (model unset) | /api/proxy | 20,043 | 1,142 | 0.02791 |
| PLANNER | mistral-small-latest | /api/mistral-proxy | 22,698 | 1,024 | 0.00402 |
| **AUTHOR** | — | — | — | — | **NONE** |

`AUTHOR` calls: **0**. Blocked-after-draft: 0. Second-author attempts: 0. Images blocked: 0.
Nothing was blocked because nothing got that far — the run aborted at skeleton validation.

The single largest line is the `/api/proxy` prerequisite at ~$0.028 (priced conservatively as
grok-4.3 because the request body carried no `model` key). That is the synopsis/A-plot leg, not
the scene author.

## Test conditions — verified

- `window._armA50` = `undefined`; `_buildA50ModeDirective()` returns `''`. **The full A/50 block is
  absent by design and was not delivered.** Not scored.
- HEAVY tier (`_hotFastActive() === false`), production `app.js` served unmodified, no
  instrumenter, no forced tier, **no prompt alteration**.
- Scene-1 surgical repair: zero surgical requests (see caveat below).
- Post-draft blocking was armed and never needed.

## Why it aborted — four faults, three of them technicalities

The planner returned a substantively sound plan: correct 4-person cast, correct canonical WHERE,
no invented identity, environment elements drawn from the seed's own setting text.

```
[SCENE1:SKELETON:INVALID] 4 faults
```

**1. C+ "Seren" — rejected [DIAGNOSIS] on one word.**

```
angle : "kneels with Veilweave gown catching the light, her throat bare and vulnerable"
reason: matched a diagnosis shape ("vulnerable")
```

The other three angles passed as renderable. This one is a concrete beat — *kneels*, *gown
catching the light*, *throat bare* — with a single trailing adjective that happens to be on the
lexical ban list. `_validateAngleConcreteness` is a documented heuristic-on-trial, and this is the
false-positive rate showing up on real output.

**2 & 3. E+ target and environment element — "not grounded", off by one morpheme.**

```
target    : "the long white weeping-willow veil-canopy draping down from the pale mated-pair trees"
authoritative WHERE
          : "...the long white weeping-willow veil-canopy DRAPES down from the pale mated-pair trees..."
```

`_targetInScene` requires every content token to appear, tolerating only simple plurals
(`/e?s$/`). Token-by-token result: **12 of 13 matched. The only failure was `draping` vs
`drapes`.** The target is the seed's own scenery, quoted almost verbatim, and was rejected on a
verb inflection.

**4. Fusion — "not a concrete interaction".**

```
beat: "lets her fingers trail along the veil's edge, feeling the weight of the ritual she is
       supposed to uphold"
```

The first clause is a concrete physical interaction; the second is interior. Borderline, and the
most defensible of the four, but it fires on a beat that does contain the required action.

## What this run actually established

Not a prose result — a **validator result**. The staging architecture held perfectly (canonical
setting, exact authorized cast, no invented identity, no solo violations — the solo validators
correctly did not apply to a 4-person stage). The binding constraint has moved: the post-planner
semantic heuristics are now what stops a good plan from reaching the author, and on this sample
three of the four rejections were lexical or morphological rather than substantive.

This is the pattern the project's own debugging law already names — bans are LEXICAL, so they
catch the shell rather than the move.

## Caveat on a precondition

`_scene1_surgical_retirement.mjs` currently reports 12 passed / 11 failed. I A/B'd it against the
pre-series `app.js` (`c063fee~1`) and it fails **identically**, so this is a pre-existing stale
harness, not a regression from this series — consistent with the file being uncommitted-modified
before the crash. The assertion that matters, `ZERO surgical model requests issued`, passes in
both runs, and the paid harness blocks all post-draft calls regardless.

## Artifacts

```
00_request_inventory.json      every attempted request, escaped or blocked, with usage
01_mistral_request_response.json  raw planner request + response bytes
02_reconciled_envelope.json    shipped reconciler output (moves: ["scene_skeleton↑"], fault: null)
03_resolved_spine_and_stage.json  resolved opening spine + stage contract
04_normalized_assignments.json    normalized C+/E+/fusion (null — aborted before assignment)
05_skeleton_directive.txt      empty — never rendered, no author call
06_grok_request.json           empty — never dispatched
07_grok_raw_response.json      empty — no response
```

Nothing patched, nothing rerun, nothing pushed, A/50 untouched.
