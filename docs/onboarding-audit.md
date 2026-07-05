# New-User Onboarding Audit (2026-07-04)

> **STATUS (2026-07-04, fix pass 1 — cache `20260704-onboarding-oneshot`, syntax-checked):**
> **P0-1 FIXED** — onboarding is now one-shot: persisted `onboardingComplete` (localStorage
> `sb_onboarding_complete` = same-device immediate; `profiles.onboarding_complete` = cross-device),
> set at ceremony completion, gates the ceremony arming in `_navigateToVaultWithStarter`, hydrated at
> profile load (sets `maskSelected=true` when complete). Migration
> `supabase/migrations/20260704_onboarding_state.sql` (adds `onboarding_complete` +
> `onboarding_gift_granted`, backfills existing rows true). **P1-7 (gift gate) FIXED + reframed per
> Roman:** the "Fate placed N Fortunes" line now keys off the `onboarding_gift_granted` flag ("has this
> account ever received the onboarding wallet?"), announces the FIXED 60, shows once, then persists the
> flag — robust to spends/refunds/promos, no balance coupling. **Roman's audit refinements applied:**
> P1-1 (Genesis-before-defined) DOWNGRADED to non-issue (natural language acquisition; confirm card is
> the definition — not worth engineering). P1-3 (Continue-Reading hides cost) ELEVATED — will get the
> price on the button in the copy sweep. **NEXT:** apply BOTH migrations (`20260703_gift_60_fortunes`
> + `20260704_onboarding_state`) [user, server], then the P1 copy sweep as one commit, then the
> literary+FF walkthrough, then enable Glass House Genesis.


Three-angle audit (comprehension / logic-bugs / copy-consistency) of the flow: signup → pact →
library-first routing → mask ceremony → concierge → four-Book shelf → Genesis pickup → confirm-charge
→ read → Genesis Complete. Pricing is fully consistent (verified). The problems cluster in
**onboarding state (never completes)**, **the migration dependency**, and **in-flow comprehension**.

---

## P0 — Broken / blocking (fix before ANY real onboarding test)

### P0-1. Onboarding never completes — every reload re-runs the whole ceremony (ROOT BUG)
There is **no persisted "onboarding complete" signal anywhere.**
- `state.maskSelected` is **session-only** — never saved, never hydrated (`app.js:15640` init; set true only in-memory at ~`278673`). No localStorage, no profile column.
- `libraryFirstOnboarding` is **hardcoded `true` forever** (`app.js:15586`), never mutated.
- Every boot with legal gates satisfied (i.e. **every returning user**) hits `_navigateToVaultWithStarter` (`app.js:9973`, `10853`), which re-arms `state._maskCeremonyPending=true` (~`114548`). On reload both `!maskSelected` and `_maskCeremonyPending` are true → `_startMaskCeremony()` fires again (~`115872`).

**Impact:** ANY user — even one with dozens of saved stories — hard-refreshes and is (a) re-routed to `vaultLibraryScreen` instead of their content, and (b) forced through the full mask curtain ceremony again. This is the exact re-fire the other tab saw; that tab fixed a *symptom* (the gift line) — the disease (re-route + re-ceremony on every reload) is untouched. **This is the single most important finding.**
*Fix:* persist an onboarding-complete flag (localStorage + a `profiles` column), set it when the ceremony finishes, and gate both the routing and the ceremony on it. Returning users route to their library/continue, not the ritual.

### P0-2. New free user is hard-blocked at the first literary Genesis (migration dependency)
The `20260703_gift_60_fortunes.sql` migration (DEFAULT 20→60) is "run in the SQL editor" and **may not be applied.** If unapplied, a new user has **20F**. The First Taste / First Sacrifice Genesis cost **30F** each → `_chargePreviewSlice` returns false → `showToast('Not enough Fortunes')` + fortune-purchase modal **seconds into onboarding.** (They *can* still open Famous Fate at 10F and Glass House at 15F/stub-free, so it's not 100% dead — but the two flagship literary books throw a paywall.)
*Fix:* apply the migration (the standing dependency finally biting), and/or make the client tolerant of the pre-migration window.

---

## P1 — Real confusion / inconsistency (fix before launch)

### P1-1. "Genesis" is spoken before it's defined
The confirm card is *meant* to be the first explanation ("Genesis" eyebrow over "The opening chapters of this story."). But the **concierge says it earlier**, during the mask ceremony, undefined: *"Each Book opens with its **Genesis**; step through…"* (`app.js:278729`). A zero-knowledge user hears the coined term with no anchor. *(This is my line from this session — the ordering is my miss.)*

### P1-2. "Issue One" is never defined in-flow
First appears on the confirm card note (`app.js:75724` "…complete Issue One") *before the user has read a scene*, then again at "Genesis Complete · Complete Issue One" (`~116743`). What an Issue is — and that Genesis is the *front slice* of Issue One — is explained **only in the FAQ** (user-initiated). The Genesis↔Issue relationship is never surfaced in the flow.

### P1-3. "Continue Reading" hides its cost (CTA inconsistency)
The Genesis-Complete button reads just **"Continue Reading"** (`~116744`); the 30F cost is only in the small grey subtitle. But the confirm card puts the price **on** the button ("Proceed — 30✦"). Two consecutive purchase surfaces disagree — a user reading only the button may think it's free. *Easy fix: put the cost on the button ("Continue Reading — 30✦").*

### P1-4. Glass House is the odd Book out — "Preview" wording + skips the Genesis card
- Shelf subtitle is stale: **"A Cinegraphic Preview"** (`app.js:114525`) — the only Book still saying "Preview" while the other three route through a "Genesis" card.
- `stub:true` (`~75585`) makes Glass House **skip the confirm-and-charge card entirely** and direct-launch free (`~113283`). So it's a *different, free, unframed* experience — directly contradicting the concierge's "Each Book opens with its Genesis." (The stub is intentional pending CG-launch verification, but the UX contradiction is real now.)

### P1-5. Two stale concierge knowledge lines still say "free / a taste / three"
`app.js:276025` and `276027` (the "what can I read/shape" branches) still say *"you start with 'The First Taste' and 'The First Sacrifice,' plus one more non-premium story… All three are a taste… shape for free."* Contradicts the four-Book / Genesis / paid-from-gift model everywhere else. *These are the load-bearing copy bugs.*

### P1-6. The library tour is wrong for a new user — and silently offered
- `LIBRARY_TOUR[0]` (`app.js:277961`): *"These are your books. Each one is a story you've already opened."* — FALSE on first visit (they've opened nothing). Line 2 "continue writing where you left off" is likewise wrong.
- The tour offer is **silent**: `_offerLibraryTour` opens the panel with no spoken line, but arms "yes = start tour." The user is never told a tour exists, yet a stray "yes" launches it.

### P1-7. Gift-line gate has gaps (introduced by the other tab's fix)
`_isFreshGift = !subscribed && _f === 60` (`~278725`):
- If the migration isn't applied, a genuine new user has 20 → `20===60` false → **the welcome-gift line never plays at all** (the fix that stopped subscribers seeing it now silently swallows it for real new users too).
- Any spend + refresh → balance ≠ 60 → skipped.
- Exact `===` coupling to a mutable server default is brittle (change the default → line silently dies). A range/`>=` check or a server-provided `isFreshGift` flag is safer.

---

## P2 — Polish / latent

- **Widget missing on `modeSelect`** — the library-first "Start New Story" routes there; a funded user sees no balance (`_showWidget` list omits it, `~117981`).
- **Famous Fate fragility** — `_openFamousFateEntry` early-returns if `authorshipChoiceMade` is true (`~210718`). Cold-boot onboarding is fine (it's false), but if any prior corridor interaction set it in-session, tapping the FF book **silently no-ops** (no toast, no modal). Not reset on library entry.
- **CG launch unverified** — Glass House direct-launches with `render_mode:'staged_story_mode'`; code self-flags "end-to-end CG-demo launch still needs a verification pass."
- **Competing issue-boundary copy** — `#arcCompleteOverlay` (`index.html:806`) says "Issue Complete / Begin Next Issue" vs the JS modal's "Genesis Complete / Continue Reading." Confirm they can't both surface for the same moment.
- **Legacy "free" wording** — `paywallCancelLibrary` "Peruse free books…" (`index.html:970`) + Taste-Tier hint "free-tier" (`index.html:825`).
- **"A Famous Fate" subtitle** — undefined jargon on the shelf, next to a title that gives no hint it opens a name-your-fandom form.
- **`previewLabel` values say "preview"** (`~75582`) — dormant (never rendered), a latent trap if wired.
- **glass-house-demo.js seed** — `fortuneGrant:20` / "Begin demo — 20F" vs live 15✦; verify it's not on the launch path.
- **FAQ "first three stories"** (`~102821`) — likely means the 3 authored deck-bearing books (FF excluded); confirm intentional or reword to avoid colliding with "four Books."

---

## What's actually GOOD (verified, don't touch)
- **Pricing is fully consistent** across confirm card / catalog / continuation / FAQ / ISSUE_PRICING (30+30, 10+50, 15+115; scene counts 10/3/1). Load-time invariant asserts the split.
- **No double-charge** — `_chargeIssuePurchase` short-circuits while a preview is active on Issue 1.
- **previewActive leak guarded** — cleared in `resetForNewStory`; FF flag cleared on form-cancel.
- **Widget now shows in both library screens** (the other tab's fix holds).
- **The three Fortune-display surfaces** (widget / Treasury / gift line) agree.

---

## Recommended fix order
1. **P0-1** (onboarding-complete persistence) — the root bug; everything else is noise until returning users stop re-entering the ritual.
2. **P0-2** (apply the 60F migration).
3. **P1 copy quick wins** (clear-cut, low-risk): P1-3 (cost on "Continue Reading"), P1-4 (Glass House subtitle), P1-5 (two stale concierge lines), P1-6 (tour first line + make the offer spoken).
4. **P1 design calls** (need a decision): P1-1 (Genesis-before-defined — soften the concierge line, or add a one-clause gloss), P1-2 (introduce "Issue" in-flow), P1-7 (harden the gift gate to a range / server flag).
5. **P2** as cleanup.
