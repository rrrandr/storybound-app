# Boundary decision note: what authorizes an issue transition?

**Status:** decision note. No implementation. `_invariantRuntimeV0` stays OFF. 2026-09-30.

Fifth and last of the planning thread. The frozen-per-issue hybrid is provisionally approved; this
settles the residual timer before any code.

---

## 0. The finding that reframes the question

**The issue boundary is a billing boundary, not a narrative one.** `scenesPerIssue` is the unit of sale:

```
literary: { scenesPerIssue: 20, fortuneCost:  60 }     app.js:86361
cg:       { scenesPerIssue: 10, fortuneCost: 130 }     app.js:86362
```

Crossing it does four things today (`_advanceToNextIssueIfNeeded`, `143194-143214`), and only the first
is commercial:

1. clears `_issuePurchaseStatus` / `_issuePurchaseOpId` / `_issuePurchasedAmount` **so the next
   `_chargeIssuePurchase` fires** — the code comment says the index is computed from `sceneIndex` "so the
   per-issue charge attributes to the correct issue";
2. auto-renders the prior issue's cover;
3. refreshes the back-cover synopsis;
4. ticks the Fatelands secret quest.

`_issuePricingApplies()` is **inverted-default true** (`87434`): everything except Taste/starter tiers is
issue-priced, including an empty or unknown tier. So this boundary governs essentially every real story.
(Taste returns 0 issues — `_getTotalIssuesForActiveTier`, `87310` — so free pilots never cross it.)

This kills option 3 outright, and it changes the shape of the answer.

## 1. The boundary currently does two unrelated jobs in one event

- **close a priced unit** — the reader bought 10 CG scenes for 130F;
- **(proposed) replace the destination catalogue** — which changes what can be selected next.

There is no reason these must be the same event. They are the same event today only because nothing else
ever needed a boundary.

## 2. The three options against the routes

Using CG (`scenesPerIssue = 10`).

| | Route A — return to a hearing at Scene 9 | Route B — unresolved pursuit past Scene 10 | Route C — war destroys the hearing near Scene 10 |
|---|---|---|---|
| **1. fixed scene count** | hearing becomes available with **one scene left** to use it, then the catalogue is replaced on schedule | the issue **terminates unresolved because a scene number arrived** — the exact failure we are removing | the escalation is **cut in half** by the billing boundary; its close is scheduled, not dramatic |
| **2. scene count as soft pacing signal** | hearing stays selectable at 9, 10, or later — catalogue persists until a terminal is selected | priced unit closes and the reader is charged; the **pursuit catalogue persists**; the unresolved terminal fires only when selected | `impossible` recorded and cited; alternate becomes available; the issue closes when alternate or unresolved terminal is **selected** |
| **3. canon-conditioned only** | works | works | works — but issue length becomes unbounded, so **the unit of sale breaks**: 30 scenes for one 130F charge, or a second charge after 3 |

**Option 1's specific flaw, stated precisely:** it makes the *unresolved terminal* fire on a schedule. An
unresolved ending is a legitimate outcome, but it must be declared and selected, not reached because
`sceneIndex` hit a multiple of 10. That is the scheduled-canon pattern in its last hiding place.

**Option 3 is not available.** It is not merely risky — it breaks billing, cover rendering, back-cover
synopsis, and the per-issue quest tick, all of which are keyed to the same scene-count boundary.

## 3. Recommendation — option 2, with the two jobs decoupled

**Keep the billing boundary exactly as it is. Give the catalogue its own boundary.**

- **Priced-unit boundary** — unchanged: `Math.floor(sceneIndex / scenesPerIssue) + 1`. Charge, cover,
  synopsis, quest tick. It is a packaging decision and scene count is the honest measure of it.
- **Catalogue epoch** — advances **only** when pre-author selection chooses a declared terminal
  (a terminal destination, or the declared unresolved terminal). Never on scene count.

Scene count becomes a **soft pacing signal**: crossing the priced boundary may make an issue-close
candidate or the unresolved terminal *relevant* — it may not select one.

Consequences, both of which are features:

- **A catalogue may outlive its priced unit.** Route B: the reader is charged for the next unit and keeps
  playing the pursuit; the catalogue carries forward. Advisory pressures from `issueArcs[i]` may advance
  on the paid schedule — they are prompt text and assert nothing — while the *selectable set* does not.
- **A catalogue may end before its priced unit.** Route A/C: a terminal is selected at scene 6; the
  catalogue epoch advances and the reader keeps the scenes already paid for, now running on the new
  catalogue.

**Keying consequence:** the branch board must key to the **catalogue epoch**, not to `arcIndex`. The prior
memo's `scaffoldRef.arcDigest` assumed the two moved together; they do not. This supersedes that detail —
everything else in that memo stands, including per-issue disposability and permanence living in canon.

## 4. Rule — catalogue generation is noncanonical, and that is enforced structurally

Catalogue generation may create **only possible destination families**. It may not assert a world fact,
commit an event, or become a canon source.

Enforcement, so this is not merely a promise:

- the catalogue is **data**: ids, statements, precondition references to canon atoms, named blockers,
  declared alternatives. It is never rendered to the author.
- **only a selected candidate's fact reaches the author, and it reaches it from the ledger, not from the
  catalogue.** A catalogue statement rendered into a brief would be prose asserting an unselected
  possibility as fact — the exact defect class already closed for Fate briefs.
- no canon store ever reads a catalogue field.

So a catalogue is a *menu*, and the ledger is the *record*. A menu item is not a meal.

## 5. Rule — cost and authorization, stated explicitly

**This adds a NEW billed provider call per issue transition. It does not extend an already-authorized
call.** Being explicit about why the cheaper option is unavailable:

- `_buildCGScaffold` is one existing call per `storyId` (`226104`). Folding all catalogues into it would
  cost nothing extra — but at story setup the later issues' canon does not exist yet, so the catalogues
  could not be derived from committed canon. That collapses the hybrid into story-setup-only authorship,
  which this thread already rejected.
- Therefore re-derivation requires a call at each issue boundary. One scaffold-class call per issue,
  reusing `_callTieredProvider('scaffold', …)` (`6351`).

Volume: one call per issue transition. Per story that is (total scenes ÷ `scenesPerIssue`) − 1, so it
scales with tier and format — CG at 10 scenes/issue incurs roughly twice the transitions of literary at
20 for the same scene count. Taste/starter tiers cross no boundary and incur none.

Authorization behaviour, per the standing rule that no automatic provider call ships without an explicit
decision:

- it must be **estimated and reserved before dispatch** through the existing cost guard, like the Fate
  calls;
- it must be **refusable**: if the call fails or is declined, the prior catalogue carries forward
  unchanged rather than the story proceeding with an empty set — fail to the last known good menu, never
  to no menu;
- it lands inside an already-monetized event (the reader is being charged 60F/130F at that same
  boundary), which is the defensible place for it commercially — but that is an argument for *where*, not
  a substitute for authorizing *whether*.

**This needs your explicit go as a new recurring cost before it is built.**

## 6. Smallest provider-free proof

The separation is the whole claim, so one control proves it:

> **An issue cannot transition its catalogue merely because its scene number changed.**
> Drive `sceneIndex` across a `scenesPerIssue` multiple with no terminal selected. Assert:
> 1. the catalogue epoch is **unchanged**;
> 2. the selectable destination set is **byte-identical** before and after;
> 3. the declared unresolved terminal did **not** fire;
> 4. `state.issueIndexInRun` **did** advance — the priced unit closed normally.
>
> Points 1–3 and point 4 must hold *simultaneously*. That is the decoupling, and a single assertion
> set that shows one advancing while the other does not is the proof.

Two companions:

- **catalogue generation commits nothing** — run it and assert `_committedStoryEvents` is unchanged and
  no board write occurred (rule §4);
- **a failed or declined catalogue call carries the prior catalogue forward** — assert the selectable set
  is non-empty and unchanged, never emptied (rule §5).

Each shown RED first.

---

## What this note settles and what it does not

**Settled:** the billing boundary stays scene-count-derived; the catalogue epoch is
selection-authorized; the board keys to the epoch; catalogues are noncanonical menus; the per-issue call
is new billed spend needing its own authorization.

**Not settled:** whether you authorize that recurring per-issue call. Until then the hybrid is approved
in shape only, and nothing should be built — including the board, which stays inert without a catalogue.
