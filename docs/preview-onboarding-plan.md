# Preview Onboarding — Implementation Plan

> **Status (2026-07-03):** Phase 1 landed (see below). **Phase 2a landed** — dormant foundation in
> `app.js` (cache `20260703-preview-onboarding-p2`): `PREVIEW_CATALOG` (literary ×2 + FF live, CG
> `stub:true`) + load-time price-split invariant; predicates `_activePreviewProduct` /
> `_isPreviewActive` / `_isAtPreviewStop` / `_previewSliceCost` / `_previewContinueCost`; and dormant
> hooks folded into `_issuePricingApplies` (preview → issue-priced), `_isAtIssueCliffhanger`
> (preview stop rides the cliffhanger machinery), `_nextIssueLabel` / `_issueContinueCost` / the
> cliffhanger modal (preview-aware "Preview complete → Continue Issue One · Nf"). Syntax-checked.
>
> **Phase 2b LANDED (2026-07-03, cache `20260703-preview-onboarding-p2b`, syntax-checked):** live
> charge path for literary previews (FF ready in catalog, awaits Phase-3 content; CG stubbed).
> Added `_chargePreviewSlice('preview'|'continuation')` (dedicated, separate from issue purchases —
> Fork 7), `_resolvePreviewContinuationTier()` (reads `selectedTier`→`storyLength`→`'fling'` — Fork 8,
> never hard-coded), `_finalizePreviewContinuation()` (adopts real tier, marks Issue One paid, clears
> previewActive). Guard in `_chargeIssuePurchase` suppresses the normal Issue-1 charge while
> previewActive. Preview-continuation intercept in `_startNextIssueFromCliffhanger`. Activation +
> slice charge in `_launchStarterStory` (literary starters only; CG `stub` falls through). Preview
> fields cleared in `_resetStoryState`. Traced end-to-end: open→30F, scenes 1–10 free, stop→"Preview
> complete/Continue Issue One·30F", continue→30F + tier=Fling + Issue One paid, scenes 11–20 free,
> scene 20→normal Issue 2 @60F. Forks 7 & 8 RESOLVED.
>
> **FINDING:** `grantTasteBookFortune` (`TASTE_BOOK_GRANTS` +20/book) is **never invoked** — dead
> code. No double-grant conflict; its removal is pure cleanup, not urgent.
>
> **SEQUENCING CAVEAT (read before deploy):** preview charging is now LIVE. Until the DEFAULT-60
> migration is applied, a new account has 20F base and CANNOT afford the 30F preview → hard paywall.
> Apply `20260703_gift_60_fortunes.sql` before any real user hits this. Localhost QA with
> `window._devBypass` fakes the charge, so local testing is unblocked.
>
> **Phase 1:** DEFAULT-60 migration written (`supabase/migrations/20260703_gift_60_fortunes.sql`, NOT
> applied — apply WITH Phase-2 charging); first-cliffhanger +20 grant removed. Resolved: keep First
> Sacrifice (4-Book shelf), keep Day-2 grant, remove first-cliffhanger grant, gift via column default;
> `PREVIEW_CATALOG` naming; "one continuation" invariant; "book" un-banned.


## 1. Goal & mental model

Replace the "free starter books" onboarding with a **gifted-Fortunes + Previews** economy that
teaches the currency by spending it.

- A new user receives **60 gifted Fortunes**, up front, as a single flexible wallet. No staggered
  deposits, no waiting periods, no milestone drip.
- A **Preview** is the **front slice of a story's Issue One**, sold at a reduced entry price with an
  early cliffhanger inserted. It is **canonical** — the scenes are real and kept; continuing resumes
  the same story in place and completes Issue One.
- `previewPrice + continuationPrice == ISSUE_PRICING[format].fortuneCost` (the normal Issue One
  price) in every case. Previews are a payment split, not a discount and not a throwaway trailer.
- **Vocabulary (three tiers — "book" is NOT banned):** a **Book** is the object on the library shelf;
  the player picks one up. Inside it, the **Preview** is what your Fortunes unlock (the opening slice
  of Issue One). An **Issue** is serialized paid content. Honest flow: pick up a **Book** → unlock its
  **Preview** → finish **Issue One** → **Issue Two** → … The words to avoid are calling the Preview
  **"free"**, or blurring Preview/Issue paid content into "just a book." "Book" for the shelf object
  is correct and natural.

### Wallet calibration (why 60 works)
The shelf holds **four Books**: *The First Taste* (30F preview), *The First Sacrifice* (30F),
*Your Favorite Book/Movie/Show* — Famous Fate (10F), *Glass House* — CG (15F). 60F deliberately does
**not** buy every preview (that's 85F) — and that's the point: the wallet funds a **meaningful subset**
and forces a choice between breadth and depth:
- **Breadth** — Famous Fate + CG + one literary preview = 55F (a taste of all three formats), or
- **Depth** — complete one literary Issue One outright: 30 + 30 = **60F** (or FF Issue One: 10 + 50 = **60F**).
- CG Issue One (130F) can't be finished on the gift.
Every path lands on the "buy more Fortunes to keep going" moment. Variety-of-choice replaces
sample-everything — which is exactly why four tones sit on the shelf.

---

## 2. Core abstraction — the generic Preview descriptor (data, not code)

The engine must not know about "literary vs FF vs CG." It reads a descriptor. New formats
(Horror, Sci-Fi, Detective, Historical, …) ship as **data only**, zero engine changes.

Named `PREVIEW_CATALOG` (not `…_PRODUCTS`): this object is a **pricing/configuration contract**, not
runtime state — the name should read like config. (`PREVIEW_CONFIG` / `PREVIEW_DEFINITIONS` are equally
fine; pick one and keep it consistent.)

```js
// PREVIEW_CATALOG — canonical onboarding pricing contract. Pure data / config.
const PREVIEW_CATALOG = {
  literary: {
    format:            'literary',
    previewPrice:      30,
    previewStop:       { type: 'scene',        at: 10 },       // early cliffhanger inside Issue One
    continuationPrice: 30,
    continuationResume:{ type: 'scene',        from: 11 },
    // invariant: previewPrice + continuationPrice === ISSUE_PRICING.literary.fortuneCost (60)
  },
  famous_fate: {
    format:            'famous_fate',
    previewPrice:      10,
    previewStop:       { type: 'scene',        at: 3 },
    continuationPrice: 50,
    continuationResume:{ type: 'scene',        from: 4 },
    // 10 + 50 === Issue One (60)
  },
  cg: {
    format:            'cg',
    previewPrice:      15,
    previewStop:       { type: 'oas_interrupt', scene: 1, before: 'satisfaction' },
    continuationPrice: 115,
    continuationResume:{ type: 'scene',        from: 2 },
    // 15 + 115 === Issue One (130)
  },
};
```

### Design rules & invariants
1. **`previewStop` is a discriminated union**, not a scene number. Today two strategies exist:
   `{type:'scene', at:N}` (stop after scene N) and `{type:'oas_interrupt', scene, before}` (stop
   mid-scene inside the OAS loop). The engine dispatches on `previewStop.type` to a stop-evaluator.
   A new format reuses `scene` for free; only a genuinely novel stop shape adds a new type + one
   evaluator — never a new `if (format === …)`.
2. **Invariant — price split.** On boot, assert for every product:
   `previewPrice + continuationPrice === ISSUE_PRICING[format].fortuneCost`. A mispriced product
   fails loudly instead of silently over/undercharging.
3. **Invariant — exactly one continuation, ever.** A Preview has a single `continuation` that finishes
   Issue One, then the story is on normal issue pricing forever:
   `Preview → finish Issue One → Issue Two → …`. **Never** nested/chained previews
   (`Preview → mini-preview → finish-preview → Issue One`). The descriptor has no field for a second
   preview stage, and the `PreviewController` clears `previewActive` the moment continuation is charged,
   so a story can never re-enter preview state. This keeps the product mentally simple: one gate, one
   decision, then it's a normal serialized story.

Everything downstream (charge, stop, modal, resume) takes the descriptor as input. Adding a format
= adding one object to `PREVIEW_CATALOG` + authoring its opening scenes.

---

## 3. Economy changes

Current state (verified):
- New profile → `profiles.fortunes DEFAULT 20` (`supabase/migrations/20260504_unify_fortunes.sql:19`);
  created by bare insert at `app.js:7017`.
- Milestone grants: +20 first cliffhanger (`app.js:231386`), +20 day-2 (`app.js:7244`).
- Per-book grants: `TASTE_BOOK_GRANTS` +20 on open (`app.js:10434`), applied by
  `grantTasteBookFortune` (`app.js:10466`).
- Starters are a **free path**: `is_starter_story` skips the begin charge (`app.js:216021`) and
  `_issuePricingApplies` returns false for taste/starter (`app.js:76248`) → per-scene cost 0.

Changes:
1. **Gift = 60 up front.** Set the initial balance to 60 (column default → 60, or explicit grant on
   profile insert; see §9 for where). One place, one number.
2. **Remove the onboarding grants; keep Day-2 as retention.**
   - **Remove:** `TASTE_BOOK_GRANTS` per-book / first-open +20 grants (`app.js:10434`) — fully
     replaced by the 60F wallet. Their "+20F" copy goes too (§6). **Sequencing:** this system is
     entangled with the CG **commit-lock** (`commitOnOpen` / `state._committedTasteBookId`, callers at
     `app.js:10494, 98951`) and the starter-open flow, so it is **removed-and-replaced together with
     Phase-2 charging**, not deleted standalone (deleting now would strand the commit-lock).
   - **Keep (for now):** the **+20 Day-2 return grant** (`app.js:7244`). That's **retention, not
     onboarding** — a separate product decision to rebalance/remove later after looking at return
     rates. It fires the next calendar day, well clear of the preview conversion moment.
   - **Remove (RESOLVED):** the **+20 first-cliffhanger grant** (`app.js:231386`). It fires the instant
     the user hits a **preview** cliffhanger — handing back 20F *exactly at the conversion moment* we
     want them to feel the spend. Removed so the funnel bites. (Day-2 retention grant stays.)
3. **Previews are charged, not free.** Retire the `is_starter_story` free-path. A Preview is a
   priced product: opening it charges `previewPrice` via the existing
   `_chargeIssuePurchase`/`consume-fortune` path (`app.js:116061`, `api/consume-fortune.js`).
4. **Confirm-and-charge on the cover.** Opening a Preview shows a confirm CTA with its Fortune cost
   (HUD balance already renders via `updateFortuneDisplay`, `app.js:117105`); on confirm, charge and
   launch. Replaces `_launchStarterStory`'s straight-to-story behavior.
5. **Retire commit-on-open.** The old `glass_house_demo` `commitOnOpen:true` / "lose remaining F"
   model disappears — a Preview is a single up-front charge from a shared wallet, nothing "committed."

---

## 4. Engine changes

The stop-and-pause machinery already exists — the live **Issue Cliffhanger Paywall**
(`app.js:116132`): turnCount-derived, self-healing, with Fate-lock (`_lockFateForCliffhanger`),
durable markers (`state.cliffhangerPending` etc.), a "To be continued / Continue to Issue N" modal
(`_showIssueCliffhangerModal`, `app.js:116188`), and idempotent charge/refund. We ride it, with three
additions the split-Issue-One shape forces:

1. **Preview stop points at non-boundary scenes.** Today the cliffhanger fires only at
   `scenesPerIssue` (20 / 10). A Preview must stop at scene 10 (literary), scene 3 (FF), or a
   mid-scene OAS interrupt (CG) — all *inside* Issue One. Introduce a `PreviewController` that, when
   `state.previewActive`, evaluates `PREVIEW_CATALOG[format].previewStop` on each scene mount and
   feeds the existing predicates (`_isAtIssueCliffhanger`, the `buildSceneEndingDilemmaDirective`
   detonation directive at `app.js:76210`, the Fate-lock, the modal). The scene-boundary evaluator
   handles literary/FF; the OAS-interrupt evaluator handles CG.
   - **Guard against a double gate:** once the preview stop fires and continuation is purchased, the
     preview flag clears so the story plays through to Issue One's *real* boundary (scene 20 / 10)
     without a second preview gate. `issueIndexInRun` stays 1 across preview + continuation and only
     bumps to 2 at the true boundary.
2. **Split Issue One into two SKUs.** `_chargeIssuePurchase` today = one issue, one price (60 / 130).
   Now Issue One = `previewPrice` (entry) + `continuationPrice` (finish). Only Issue One is split;
   Issue Two onward stay single-charge at normal `ISSUE_PRICING` amounts. Continuation reuses the
   canonical resume flow (`_startNextIssueFromCliffhanger` / Flow A, `app.js:116246`) — **zero
   regeneration**, same `storyId`/state.
3. **CG OAS-interrupt stop.** CG preview ends *inside* scene 1's OAS loop — "forced interruption
   before satisfaction," not a fate-card cliffhanger. This is a bespoke stop evaluator
   (`previewStop.type === 'oas_interrupt'`). **Needs spec:** exactly which OAS beat counts as "before
   satisfaction" / the interrupt trigger — flagged in §9.

Modal: reskin the "To be continued" variant to a **"Preview Complete → Continue Issue One (Nf)"**
copy variant driven by `continuationPrice`. Current text/labels are hardcoded at
`app.js:116179 / 116197` (`_nextIssueLabel`); add a preview-mode branch rather than replacing them.

Cover badge: preview covers show a **"Preview"** badge; after continuation completes Issue One the
badge becomes "Issue One." Today the badge is `state.issueIsGenesis ? 'Genesis Edition'`
(`app.js:116867`) — add a preview state to that resolver.

---

## 5. Preview products / content

Current: two literary starters (`The First Taste` billionaire, `The First Sacrifice` fantasy,
`app.js:114102-114138`) + the CG Glass House demo (seed at `public/seeds/glass-house-demo.js`).

**Shelf lineup = four Books** (variety is the feature — the player instantly sees Storybound isn't
one kind of romance):

| Book | Format | Preview |
|---|---|---|
| **The First Taste** | Literary (billionaire) | scenes 1–10, 30F |
| **The First Sacrifice** | Literary (fantasy) | scenes 1–10, 30F |
| **Your Favorite Book, Movie, or Show** | Famous Fate | scenes 1–3, 10F |
| **Glass House** | CG | scene 1 + OAS interrupt, 15F |

- **Keep The First Sacrifice.** Two literary previews of different tone/archetype is a *feature*, not
  redundancy — it showcases range. Both bill from the same 60F wallet, so the economy is unaffected.
  (`PREVIEW_CATALOG` therefore keys on **book/product id**, not just format — two literary entries
  coexist; the descriptor is per-Book.)
- **CG Preview** → Glass House (seed exists), re-scoped to scene 1 + OAS interrupt.
- **Famous Fate Preview** → **net-new** authored opening (no FF starter exists today).

---

## 6. Copy / terminology rewrite (audit-driven, Phase 0)

**Vocabulary discipline (three tiers):** keep **Book** where it means the shelf object — do *not*
blanket-replace "book" with "Preview." Replace only where copy (a) says the experience is **"free"**,
(b) uses the removed **grant** framing, or (c) blurs the **Preview/Issue paid content** into "just a
book." So each audit hit needs a per-case judgment: *object* → keep "Book"; *unlockable experience* →
"Preview"; *paid serialized content* → "Issue." The "free starter book" framing appears in ~9
user-facing places plus config/seed docs. Grouped by fix:

**Drop "free" (Previews are paid):** FAQ `app.js:102384, 102392, 102436, 102438, 102440, 102458`;
concierge/topic seeds `app.js:273901, 273904, 276204, 276205, 276207, 276209`; paywall dismiss
`index.html:970`.

**Delete "+20 per starter / welcome-back" grant copy (grants removed):** FAQ `app.js:102382, 102436,
102440`; toasts `app.js:7259, 231399`; Treasury "Welcome bonuses" `app.js:101649-101650` +
`index.html:271-273`; CG seed config `glass-house-demo.js:15,28-30,47,107,297-306`.

**"book"/"starter book"/"demo" → "Preview":** STARTER_STORIES `app.js:114102-114138`; display-name
map `app.js:10701`; FAQ Q-titles `app.js:102384, 102457`; "(starter book)" catalog label
`app.js:274320`; the entire `glass-house-demo.js` "demo" vocabulary.

**Continuation CTA:** current post-cliffhanger CTA `app.js:98806` ("Continue the Story / 20 Fortunes
— $3") and seed drafts (`glass-house-demo.js:333,336`) are where "Continue Issue One (Nf)" wiring
lands.

**Pre-existing bugs to fix in-pass:** concierge `app.js:273904` says "*Two* starter books… plus one
additional" while FAQ says "*three*" — reconcile to the three-Preview lineup.

**Retire the stale per-turn modal:** `#fortuneDisclosureModal` ("One Fortune is sacrificed each
turn," `index.html:999`, fires `app.js:250278`) is inaccurate under issue/preview pricing and is
skipped under issue pricing anyway. Retire it; the concierge beat (§7) becomes the economy teacher.

---

## 7. Concierge onboarding beat

Wire the gift disclosure into the existing mask-ceremony completion seam at `app.js:277661`, right
after the "Ah, the {archetype}. Of course." acknowledgement (`_appendMessage('ai', …, {skipCCL})`,
board = `#conciergeDialogueScroll`). A timed beat between "Of course." (+400ms) and "Your shelf is
ready." (+3400ms):

> "Fate has placed **60 Fortunes** upon your shelf. Spend them as you wish — each Preview opens a
> door; step through, and the story asks more of you."

- Frames it as a **wallet**, not one-preview-each (matches the flexible-spend model).
- Teaches both halves: here's the gift, and this is how it's spent.
- The 60 appears in the HUD simultaneously so the number is seen, not just heard.

---

## 8. Phasing & dependencies

- **Phase 0 — Copy/terminology.** Fully scoped by the audit, no open decisions, no engine risk.
  Executable immediately. (Leave the milestone-grant *code* until Phase 1; delete only copy that the
  new model contradicts, or sequence copy right after Phase 1 to avoid a brief window where code
  grants F that copy no longer mentions.)
- **Phase 1 — Economy.** 60F gift; remove milestone + per-book grants; starters → charged Previews
  with confirm-and-charge cover.
- **Phase 2 — Preview engine.** `PREVIEW_CATALOG` descriptor + load-time invariant; `PreviewController`
  stop evaluators (scene + OAS-interrupt); split Issue-One charge; "Preview Complete" modal variant;
  preview cover badge.
- **Phase 3 — Products.** Re-scope First Taste + Glass House; author the new FF Preview; resolve
  First Sacrifice.
- **Phase 4 — Concierge beat.**

Suggested order: 1 → 0 → 2 → 3 → 4 (economy before copy so no window of code/copy disagreement),
or 0-first if we accept a short transitional window. Phase 2 depends on Phase 1's charge path.

---

## 9. Open decisions & risks (need answers before the phases they gate)

1. **Gift mechanism (Phase 1) — RECOMMENDED: migration, column `DEFAULT 20 → 60`.** The base balance
   already comes solely from the column default (no signup trigger exists), so bumping the default is
   the single-source, server-authoritative fix; it affects only new rows (existing users unaffected).
   The alternative — an explicit +40 top-up at client insert (`app.js:7017`) — is race-prone and leaves
   two sources of truth. Migration file written but **not applied** (user applies).
2. **CG OAS-interrupt spec (Phase 2/3):** define the exact "before satisfaction" interrupt trigger in
   the OAS loop. Needs CG/OAS domain input; this is the one genuinely novel stop shape.
3. *(RESOLVED — remove first-cliffhanger +20 grant; keep Day-2 retention grant. First Sacrifice: keep,
   two literary previews.)*
4. **Taste character modal (Phase 1/3):** `index.html:633` "fires on every Taste book open" (name /
   gender / pronouns). Does a Preview still collect this before charging, and in what order relative
   to confirm-and-charge?
7. **[BLOCKS 2b] Charge-split idempotency (Phase 2b):** the existing `_chargeIssuePurchase` idempotency
   keys on `issueIndex`, so Issue One = one charge. A preview splits Issue One into two charges
   (previewPrice at open + continuationPrice at the stop), both on issueIndex 1. RECOMMENDED design: a
   dedicated `_chargePreviewSlice('preview'|'continuation')` for the two slices, and have
   `_chargeIssuePurchase` short-circuit (charge nothing) while `previewActive && currentIssueIndex===1`
   so the normal issue-1 charge never fires; normal issue pricing resumes at Issue 2. Confirm this
   approach before wiring money.
8. **[BLOCKS 2b] Tier-on-continue (Phase 2b):** after the preview continuation finishes Issue One
   (scene 20 for literary), what is the story? The starter carries `length:'taste'` → `ISSUE_TIER_COUNT`
   has no taste entry → total issues = 0 → `_isFinalSceneOfFinalIssue` never true → the story would
   cliffhang forever, offering Issue 2, 3, … at full price with no finale. Options: (a) preview
   continuation ASSIGNS a real tier (e.g. `fling` = 2 issues) so the story has a defined arc and a
   finale; (b) Issue One is the whole product — end after scene 20, offer "make your own / continue"
   as a separate upsell; (c) leave open-ended series. Needs a product call.
5. **Server-side price enforcement (cross-cutting):** `/api/consume-fortune` charges whatever `amount`
   the client sends — no server price table (`ISSUE_PRICING` is client-side, flagged
   "server should mirror"). Preview/continuation prices inherit this trust-the-client posture. If we
   want the split-SKU pricing enforced, a server-side price table is the hardening target. Out of
   scope for the feature, worth a ticket.
6. **"One additional non-premium story of their choosing" (concierge `app.js:273904`)** and the
   Forbidden Library free-reads — out of scope, but the copy references them; confirm they survive
   unchanged under the new lineup.

---

## 10. What exists vs. what we build (quick reference)

**Reuse as-is:** turnCount scene-in-issue math; Fate-lock; durable self-healing cliffhanger markers;
idempotent charge/refund; canonical Flow-A resume (`_startNextIssueFromCliffhanger`); deterministic
issue labeling; HUD balance display; concierge dialogue board + mask-ceremony seam.

**Build:** `PREVIEW_CATALOG` descriptor + invariant; `PreviewController` (2 stop evaluators);
non-boundary preview gate wired into the cliffhanger predicates; split Issue-One charge; "Preview
Complete" modal variant; preview cover badge; confirm-and-charge cover CTA; 60F gift + grant removal;
FF preview content; concierge gift beat; full copy rewrite.
