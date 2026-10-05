# Three closed reporting gaps — 2026-10-05

Scope, settled and not reopened: **ten story scenes including the fixed opening** (fixed Scene 1 +
generated Scenes 2–10), plus live OAS. OAS is not a scene. No eleventh scene is sought.

---

## 1. Two claims, now asserted separately

The completion check previously printed "ISSUE COMPLETE" after testing only that a projection
existed and that there were ≥9 records. It *collected* the production boundary values and never
tested them, so a counter disagreement could not fail anything.

```
CLAIM A — requested ten-scene corpus (fixed opening + generated 2-10): GENERATED
          (9 generated records, scene 10 projection accepted)
CLAIM B — production issue boundary reached: YES, off by the fixed opening
          (production position 9 of 10; a ten-scene issue whose first scene is fixed should read 9)
```

Both are asserted. A missing projection, a record count ≠ 9, or a production position that matches
neither `scenesPerIssue` nor `scenesPerIssue - 1` now **fails the run**.

### The count mismatch, traced

`turnCount` means **completed continuation turns** — deliberate and documented at `app.js:143046`:

> *turnCount = completed continuation turns; committing the mounted Scene 1 completes none, so it
> stays 0 and the first continuation is scene 2 (previously began at 1 → scene 3, plan row 2 skipped).*

The baked opening displays at `turnCount 0` and commits without incrementing (`app.js:143204`).
So a complete ten-scene issue ends at `turnCount 9`. **The mismatch is not in `turnCount`** — it is
that two different scene indices coexist:

| helper | formula | counts the fixed opening? |
|---|---|---|
| `_currentSceneNumber` (`app.js:134404`) | `turnCount + 2` (next scene) | **yes** |
| `_getSceneInIssue` (`app.js:87497`) | `((turnCount - 1) % per) + 1` | **no** |

`scenesPerIssue` for CG is 10 (`app.js:86537`) and *includes* the fixed opening, so dividing a
continuation count by it is off by one for the whole issue.

### Consequences, each verified at its call site

1. **Issue gating** — `_isLastSceneOfIssue` (`app.js:87536`) is `_getSceneInIssue() === scenesPerIssue`
   → `9 === 10` is **false at the true last scene**. It can only fire at `turnCount 10`, i.e. after an
   **eleventh** story scene. This drives the Submit swap to "Continue to Issue X.{N+1} (##F)", so the
   boundary and the next-issue charge land one scene late. This is the counter bug, **not** a reason to
   buy a scene.
2. **Scene planning** — the planner prompt (`app.js:234427`) prints `scene (inIssue + 1) of ~per` and
   derives EARLY/MID/LATE from `inIssue / per`. At the first continuation (`turnCount 0`,
   `_getSceneInIssue()` → 0) it says *"scene 1 of ~10: EARLY"* while planning story scene 2. The pacing
   band is shifted one scene early across the issue, so "LATE — deliver the horror or wonder here"
   arrives a scene late.
3. **Pacing fraction** (`app.js:203827`) — `(_getSceneInIssue() - 1) / (per - 1)` → 8/9 = 0.89 at the
   last scene, so a "final scene" ramp never reaches 1.0.
4. **FF canon budget** (`app.js:152122`) — `Math.max(1, _getSceneInIssue())` as the unit index carries
   the same shift.
5. **Reveal timing is NOT broken.** `_hnSealsInForce` resolves through `_currentSceneNumber`, which
   uses the opening-counted convention, so `unsealsAtScene` compares against the right scene number.
   That is precisely why the inconsistency matters: **reveals and issue gating disagree by one scene.**

Not changed here. The fix belongs in `_getSceneInIssue` (account for the fixed opening), never in
`turnCount`, and it moves a charging boundary — so it is Roman's call.

---

## 2. Preview provenance is now evidence, not wording

**Withdrawn:** the old classifier called anything that did not look like *title + ellipsis* a
"model preview" — including when `previewCached` was false. The OAS loop tested only that an input
was populated. Neither establishes model authorship.

The runner now records **every preview reply it serves**, parsed per card id (three-field and
four-field delimiter formats), and matches the submitted text against them:

| verdict | meaning |
|---|---|
| `matched-response` | identical to a preview reply served for *this* card, with the call number |
| `matched-cache` | identical to the app's cached preview for this card |
| `template-fallback` | both fields are the card id — the deck's own placeholder |
| `UNKNOWN` | nothing links it to a reply or cache entry — **stays unknown** |

Applied to **both** the OAS turns and the scene-end cards. A complete run reports e.g.
`matched-response — identical to the preview reply served for "boundary" on call 3`, and honestly
reports `UNKNOWN — no preview reply or cache entry for "" matches the submitted text (0 replies
recorded)` for the one card where the selection id was empty.

---

## 3. The $0.83 reservation and "that fits" are withdrawn

That figure extrapolated **planner + author receipts** from 2026-10-02. It excluded receiptless
verifier exposure, excluded live OAS, and priced none of today's additional calls, changed prompts
or retries.

**The actual call mix of a complete ten-scene run** (76 calls, measured from a provider-free run in
which the app builds every real prompt):

| model requested | calls | prompt chars |
|---|---|---|
| ministral-8b-2512 | 28 | 251,670 |
| gpt-4o-mini | 14 | 123,614 |
| grok-4-1-fast-non-reasoning | 10 | 186,348 |
| grok-4-1-fast-reasoning | 10 | 2,603,664 |
| (unspecified) | 8 | 104,377 |
| grok-4.20-0309-non-reasoning | 5 | 1,003,625 |
| mistral-small-latest | 1 | 4,971 |

By role: STRUCTURE_GENERATOR 42 · PRIMARY_AUTHOR 14 · unlabelled 11 · INTIMACY_SPECIALIST 8 ·
SPECIALIST_RENDERER 1.

**Runner's own estimate over that mix: $2.2657** — author calls only **$0.1736**, everything else
**$2.0921**. The non-author traffic is the bulk of the cost, and it is exactly what the old $0.83
excluded.

- **Expected cost:** not established. ≥ $2.27 on this mix, and that is a **floor**: prompt sizes in a
  fixture run are real, but completion sizes are fixture-small, so output cost is understated.
- **Reserved exposure:** the full estimate must be reserved, not the expected cost.
- **Retries:** one stale-retry per scene is configured (`app.js:240455`). This run needed zero tier
  escalations (every `[TIERED:*]` line was `attempt 1`), but one author escalation adds a full
  author call, and the earlier $1.50 run did escalate.
- **Cache savings are not assumed.** This run observed 0% cached tokens; a previous live run fell to
  10.4%. No discount is applied.

### Against the remaining authorization

| | |
|---|---|
| Remaining under the existing ceiling | **$0.9232852** |
| All-in floor for the proposed ten-scene run | **≥ $2.27** |

**The proposed run does not fit.** My earlier "that fits, with ~nine cents of headroom" was wrong by
more than 2×. Options, for Roman to choose — none taken:

1. Raise the ceiling to cover ≥ $2.27 plus retry headroom.
2. Shorten the corpus (a 3–4 scene run is the largest that plausibly fits $0.92, still unpriced).
3. Price the live OAS alone first, which is the cheapest unmeasured piece.

The real ledger is untouched: receipted **$0.5095313**, unresolved **$0.0671835**.
