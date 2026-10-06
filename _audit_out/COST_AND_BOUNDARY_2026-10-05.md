# Corrected boundary and cost report — 2026-10-05

Corpus scope unchanged: **ten story scenes including the fixed opening**. No eleventh scene is
generated or sought. No paid dispatch. Exposure and ceiling unchanged.

---

## 1. Corpus completion and the production boundary, reported separately

**Withdrawn:** "boundary reached: YES, off by the fixed opening." The assertion accepted position
**9 or 10**, which tolerated the defect instead of demonstrating a correct boundary.

The runner now reads **production's own predicate** — `_isLastSceneOfIssue()` — rather than
re-deriving a range. Current result:

```
CLAIM A — requested ten-scene corpus (fixed opening + generated 2-10): GENERATED
          (9 generated records, scene 10 projection accepted)
CLAIM B — production recognizes issue completion: NO
          (_isLastSceneOfIssue()=false; position 9 of 10 — production requires exactly 10)
*** FAILED — the corpus is complete but PRODUCTION DOES NOT RECOGNIZE ISSUE COMPLETION.
             This is the counter defect, NOT grounds to generate an eleventh scene.
```

**Ten story scenes generated: yes. Production recognizes issue completion: no.** The run fails on
Claim B, as it should.

### Where the correction applies, and where it does not

Measured directly against the live helpers:

| `turnCount` | `_getSceneInIssue()` | `_isLastSceneOfIssue()` | `_currentSceneNumber()` (next) |
|---|---|---|---|
| 9 | 9 | false | 11 |
| 10 | 10 | false | 12 |
| 20 | 20 | **true** | 22 |

(That probe ran with literary pricing, `scenesPerIssue` 20, so the boundary fires at `turnCount 20`.
For CG, `scenesPerIssue` is 10 and it fires at `turnCount 10`.)

- **Baked openings (this case).** The baked Scene 1 displays at `turnCount 0` and commits **without
  incrementing** (`app.js:143204`, `:143046` — *"committing the mounted Scene 1 completes none"*).
  Ten story scenes therefore end at `turnCount 9`, while the predicate needs 10. **Off by one.**
- **Non-baked stories.** Scene 1 is itself a generated continuation, so `turnCount` reaches 1 after
  scene 1 and the position tracks the story scene exactly. **Not affected.**
- **CG vs literary.** The same arithmetic, different `per` (10 vs 20). The defect follows the *baked
  opening*, not the mode — any CG/literary story that opens with a pre-authored scene inherits it.
- **Subsequent issues.** `((turnCount - 1) % per) + 1` carries the offset forward indefinitely: later
  issues have no fixed opening, so for a baked story **every** issue boundary lands one scene late,
  not just the first.

### The narrowly scoped product change (not made)

One helper: `_getSceneInIssue()` should account for a committed baked opening occupying slot 1 of
the first issue — e.g. add 1 when `_bakedPkgForActiveStory()` indicates the story began from a baked
package. `turnCount` must **not** be incremented; its meaning ("completed continuation turns") is
load-bearing for `handleBeginStory`'s fresh-story guard (`app.js:143208`).

Four consumers change behaviour if this is corrected, which is why it is Roman's call and not mine:
`_isLastSceneOfIssue` (**the Submit swap and the next-issue charge**), the planner's ISSUE POSITION
band (`app.js:234427`), the pacing fraction (`app.js:203827`), and the FF canon unit index
(`app.js:152122`). Reveal timing goes through `_currentSceneNumber` and is already correct — which is
the real symptom: **reveals and issue gating disagree by one scene.**

---

## 2. The cost memo, corrected

**Withdrawn — two wrong claims of mine:**

1. *"$2.27 is a floor because fixture completions are small."* **Wrong.** The estimator never reads
   completions. `_fsc_cost_guard.mjs:36` computes
   `outTokens = requested max_tokens × REASONING_MULT(1.5)`, then `× SAFETY_MARGIN(1.2)`, with
   `ASSUME_NO_CACHE = true`. It is a deliberately pessimistic **pre-dispatch reservation** figure for
   the observed call sequence — an upper-leaning estimate, not a minimum bill and not a guaranteed
   full-run bound.
2. *"author $0.17 vs everything else $2.09."* **Unreliable.** That summed the `PRIMARY_AUTHOR` role
   label, and this project also routes prose through `STRUCTURE_GENERATOR`. Role labels cannot
   establish which calls wrote scenes.

**Also corrected:** the guard's own `RATES` table lists **only three Grok models**, so every
Mistral, GPT and `grok-4.20` call was reserved at `WORST_RATE`. That is correct for a hard cap and
wrong for an estimate.

### Model-specific pricing assumptions (`public/app.js` TEXT_PRICING, $/token)

| model | in | out |
|---|---|---|
| grok-4.3 / grok-4-1-fast-* / grok-4.20 | 0.00000125 | 0.0000025 |
| gpt-4o-mini | 0.00000015 | 0.0000006 |
| gpt-4o | 0.0000025 | 0.00001 |
| mistral-small-latest | 0.00000015 | 0.0000006 |
| ministral-8b-2512 | 0.00000015 | 0.00000015 |

### Classified by actual function, from each prompt's own self-identification

Role labels are no longer used; the runner stamps every call with the function its prompt declares.

| function | calls | reserved |
|---|---|---|
| scene author | 10 | $1.2401 |
| OAS | 7 | $0.4640 |
| previews | 9 | $0.1656 |
| verifier/audit | 20 | $0.1576 |
| scene planner | 9 | $0.1181 |
| memory/canon | 8 | $0.0623 |
| scaffold | 1 | $0.0178 |
| OAS line-edit | 4 | $0.0047 |
| image/panel | 8 | (blocked — no image generation) |

| total over the observed 76-call sequence | |
|---|---|
| **As reserved** by the guard (uncached, max-output, ×1.5, ×1.2) | **$2.2302** |
| **Repriced** with per-model rates, same max-output assumptions | **$1.8691** |

**Neither is a measured bill.** Both scale with the *requested* completion budget, not with what a
model returns. The only measured figure available is the 2026-10-02 live run: **$0.5095313
receipted** for nine grok-4.3 scenes — but that run used a smaller call set than today's (no
continuation envelope, no history notes, fewer verifiers), so it is not a bound either.

### A fresh run costs more than any figure above

- **Setup is not included.** The measured run reported *"setup complete · exposure $0.000000"* with
  **zero** calls self-identifying as bibles/plots: the story's setup was already persisted. A fresh
  story regenerates it, and that cost is **unmeasured**.
- **OAS here was fixture-driven.** Live OAS is in the sequence (7 calls, $0.4640 reserved) but its
  real completion sizes are unmeasured.
- **Retries** add a full author call each. One stale-retry per scene is configured
  (`app.js:240455`); this run needed zero tier escalations, the earlier $1.50 run did escalate.
- **No cache discount is applied.** 0% observed here; 10.4% in a prior live run.

### Against the remaining authorization — the decision input

| | |
|---|---|
| Remaining under the existing ceiling | **$0.9232852** |
| Reserved exposure for the observed sequence (what the guard would hold) | **$2.2302** |
| Repriced estimate, same output assumptions | **$1.8691** |
| Fresh setup + live OAS completions | **unmeasured, additional** |

The reservation the guard would take **exceeds the remaining authorization**, so the run would be
refused at admission rather than part-way. I am not proposing a figure as "the bill" and not
claiming it fits.

---

## 3. Preview provenance requires the complete pair

**Withdrawn:** matching *either* action *or* dialogue. A repeated short line (the SILENCE
archetype's `"mm"`) could earn "identical to the preview" while the action differed completely.

Now required: **both submitted fields identical to the same preview record**, with
encounter / turn / card identity carried in the evidence string. Legitimately empty fields are
preserved — empty matches empty, never text. A one-field match is reported as
`UNKNOWN — ONE field matches a preview record and the other does not`, and a cache-only match says
plainly that the writing model is not established.

Current run: **14 `matched-response`**, **1 `UNKNOWN`** — the one being an OAS turn where no card id
was recorded, which is now reported as untraceable rather than counted as a model preview.
