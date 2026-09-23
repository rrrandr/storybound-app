# Tempt Fate durable consequences — dry design + wiring

2026-09-22. Roman: "Tempt Fate can violate the local rules; the local world then has to process the
violation through its own metaphysics, institutions, suspicions, and costs... The biggest
actionable gap is durable consequence plumbing for Tempt Fate, not a blunt premise-protection
regex. I'd have Claude build that next, dry-only... without collapsing Tempt Fate into ordinary
Fatelands wish doctrine." No paid calls, no prose generation, no image work.

## 1. Trace: the existing Durable Fate Consequences mechanism (LAYER 2)

- **Stores durable changes**: `state._durableFateConsequences`, an array; entries carry
  `{id, type, detail, sceneIdx, bargainId, permanent:true}`. Written by
  `_recordDurableConsequence(spec)` (`app.js` ~189517).
- **Reaches future prompts**: `_buildDurableFateConsequenceDirective()` (~189562) renders the list
  as `"PERMANENT WISH-COSTS ALREADY PAID... TRUE and NEVER restored — do not undo, heal, or forget
  them"`, and is called inside `_buildContinuitySpineBlock` (~130567), whose output is confirmed
  (this session) to reach the actual payload: `if (durableLine) lines.push(durableLine);`. It also
  participates in that function's early-return guard and its PROTECTED-content budget accounting —
  i.e., it's a first-class, always-considered input, not an afterthought.
- **Why its only call sites are the unpaid ordinary-wish path**: both real calls to
  `_recordDurableConsequence` (~190170/190181, confirmed by source read) sit inside
  `_resolveOrdinaryWish(act, dia, sceneIdx)` — the "I wish..." in-dialogue pipeline that runs
  `classifyWishDisposition` (Eight Orders), picks a cost band, and has Fate literally choose a
  sacrifice from the PC's body/memory/bond. Tempt Fate was simply never plumbed into this — its own
  cost is transparent Fortunes, not a hidden body-sacrifice, so it was never a natural fit for THIS
  specific recorder, and nothing else was ever built for it. Confirmed via `project_reputation_consequence_requirement.md` (12 days old, independently re-verified this session): "durable PRICE
  ledger `_durableFateConsequences` (Tempt ordinary rail only)."
- **What shape is safe to reuse**: the PATTERN (a small array of structured entries, a single
  recorder function, a single directive builder, wired into the shared continuity-spine payload,
  additive-only) is exactly right and reusable. The CONTENT shape is not — ordinary consequence
  `type`s (`hand`, `eye`, `memory`, `open_debt`, etc.) describe a body-sacrifice cost, not a
  world-rupture's shape, permanence, or investigability. Reusing the array itself would also
  silently re-introduce Roman's explicit "do not collapse the two doctrines" concern (a Tempt entry
  sitting in the same list as an ordinary wish's body-sacrifice, read by the same directive, framed
  the same way).

## 2. The Tempt Fate durable consequence record (design)

A new, SEPARATE record shape, `app.js` ~189650 onward, LAYER 2b — never merged into LAYER 2:

```
TemptFateDurableConsequence = {
  id, source: 'tempt',                 // distinguishes every entry from ordinary-wish LAYER 2
  requestedRupture: string,            // the raw wish text
  outcome: { shape: 'granted'|'translated', description: string },
                                        // 'granted' = TYPE 1 power move; 'translated' = TYPE 2
                                        // structural break, mirroring the Empowerment Contract's
                                        // own worked examples ("Kill the LI" -> mortal danger).
                                        // Descriptive only — never gates or blocks; Tempt Fate
                                        // always resolves.
  permanenceDepth: 'temporary'|'lasting'|'foundational',
                                        // collapses the Wish Archaeology doctrine's Four Depths
                                        // (TRANSIENT/LINGERING/ANCHORED/FOUNDATIONAL) into the
                                        // three tiers Roman asked for this pass.
  explanationPressure: string,         // what the local world must eventually offer some account
                                        // of (generic default: "Fate cannot be examined; only
                                        // ordinary evidence can confirm or unravel it").
  residueClues: [string...],           // generic (not story-specific) clue-shape templates, keyed
                                        // by rupture category.
  noticers: [string...],               // who might notice/contest/investigate/exploit/misremember,
                                        // derived from the same mass/social/intimate scale the
                                        // Tempt Fate Callback Ledger already uses.
  futureObligation: string,            // the BINDING sentence a future prompt receives.
  sceneIdx, bargainId, permanent: boolean
}
```

## 3. Wiring (the smallest dry path)

- **Recorder**: `_recordTemptFateDurableConsequence(wishText, opts)` (~189813) — purely additive to
  `state._temptFateDurableConsequences`; never writes any protected/canon field (no character
  name/alive/identity mutation). Structural proof in the control (§5, "NO protected/canon state
  field was touched").
- **Gate**: `_temptWishWarrantsDurableConsequence(wishText, premiseFlavor)` (~189640) — fires on
  ANY of: a cataclysmic keyword (reusing `buildWorldLawDirective`'s own `_wishScale` trigger set),
  `_classifyTemptScale === 'mass'` (the Callback Ledger's own signal), `_detectPremiseBreak`
  firing, OR the wish falling into one of three named story-bearing rupture CATEGORIES (memory /
  death-or-removal / materialization) — added because none of Roman's three worked examples are
  reliably "mass"-scale or cataclysmic by keyword alone (a targeted, named-object wish classifies
  as `social`, not `mass` — correctly, since it doesn't affect the whole world — but is still
  exactly the kind of change this record exists for). A harmless flourish matches none of these and
  correctly leaves no record.
- **Call site**: wired at the SAME Tempt seal point the Callback Ledger already uses (`app.js`
  ~108894, right after `_recordTemptFateEvent(wishText)` in the shared literary+CG zoom-card submit
  handler) — one call site, gated, covering both render modes identically.
- **Persistence**: added to `_resetStoryState`'s per-story reset (`state._temptFateDurableConsequences = []`, alongside `_durableFateConsequences`), and to the Issue-boundary carry-forward
  block (`_temptDurableJson` capture/restore, mirroring `_durableJson`/`_temptLedgerJson` exactly)
  — so it survives Issue transitions the same way ordinary durable consequences and the Tempt
  ledger already do. Regular in-story saves already carry it for free (`saveStorySnapshot` spreads
  the whole state object).
- **Directive**: `_buildTemptFateDurableConsequenceDirective()` (~189940) — wired into
  `_buildContinuitySpineBlock` alongside (not merged with) the existing `durable`/`durableLine`
  variables: a parallel `temptDurable`/`temptDurableLine` pair, included in the same early-return
  guard, PROTECTED-length budget calculation, and `lines.push` sequence. This is the SAME function
  that already reliably reaches both literary and CG author prompts.

## 4. Two real regex-inflection bugs found and fixed while proving fixture 1

The first attempt at fixture 1 ("Tempt Fate materializes The Answer in Lirael's hand temporarily")
failed to warrant a durable record at all. Traced to the exact-word-boundary inflection bug this
session already found once (F6, the `\bdestroy\b` vs "destroys" gap): `_temptRuptureCategoryFromText`'s materialization regex was `\bmateriali[sz]e\b`, which cannot match "materializes" (the
trailing "s" breaks the `\b` word boundary). Fixed to `materiali[sz]es?` plus `\w*` endings on the
other verbs in that group, and applied the same `\w*`-ending fix to `_classifyTemptRuptureShape`'s
and the death-category regex's bare `kill`/`destroy`/`erase`/`forget` forms, so inflected forms
("killed", "destroys", "erased", "forgot") aren't silently missed. Confirmed empirically via the
control, not assumed from regex inspection.

## 5. A genuine, separate gap found in ORDINARY wish doctrine — flagged, not fixed

Building fixture 5 ("an ordinary Fatelands wish attempting the same thing") with the natural
phrasing "I wish everyone forgot the ceremony happened" returned `classifyWishDisposition`'s SAFE
fallback (`dominantOrder: 'RESTORATION'`, `disposition: 'welcomes'`) — i.e., the ordinary-wish
Eight-Orders classifier read a memory-erasure wish as innocuous. Traced to `WISH_ORDER_SIGNALS`
(`app.js` ~105797): HISTORY's patterns are narrowly shaped around resurrection/undoing-death/
time-reversal ("undo/unmake/erase the past/death/war/accident/what happened"), and AGENCY's require
an object-of-"make" shape ("make them forget"); neither matches subject-first "everyone forgot X
happened" phrasing. This is a real, separate defect in a DIFFERENT system (ordinary Fatelands wish
doctrine's own classifier) — **not fixed this pass**, per the explicit instruction not to touch
ordinary wish doctrine and the standing adjacent-defect-is-a-separate-decision discipline. The
control's fixture was corrected to "make everyone forget..." phrasing (which the classifier does
correctly resist) to still prove the intended point (§6, section 5) without silently masking the
finding — the discovery is documented here instead.

## 6. Proof (`_tempt_fate_durable_consequences_control.mjs`, 31/31)

Real, unmodified exposed functions only. Fail-closed network gate confirms zero `/api/**` traffic —
genuinely zero paid calls.

1. **"Tempt Fate materializes The Answer in Lirael's hand temporarily"** — warrants a record
   (materialization category); `outcome.shape: 'granted'`; `permanenceDepth: 'temporary'` (the wish
   says so); materialization-shaped residue clues; directive contains the raw wish text and the
   explicit "NOT ordinary Fatelands wish doctrine" label; **no protected/canon state field touched**
   (`loveInterestName`/`canonicalLI`/`playerName`/`aPlot` snapshotted before and after, byte-identical).
2. **"everyone forgets the ceremony happened"** — warrants a record (triple-redundant: memory
   category, cataclysmic keyword, mass scale); `outcome.shape: 'translated'`; `permanenceDepth:
   'lasting'` (default); residue clues include the exact "wasn't it today" shape Roman described
   and a records/institution-mismatch clue; noticers name institutions/investigators; explanation
   pressure cites the "Fate cannot testify, only ordinary evidence" doctrine from the earlier
   permanence trace.
3. **"Julian dies"** — warrants a record (death/removal category); `outcome.shape: 'translated'`,
   description explicitly says "mortal danger... rather than a confirmed death"; **without** an
   explicit story-structure signal, `permanenceDepth` is NEVER `'foundational'` (defaults to
   `'lasting'`) — proving casual permanent removal is not the default; **with** an explicit
   `storyStructureAllowsPermanent` signal, it CAN reach `'foundational'` — proving the "unless
   explicitly allowed by story structure" escape hatch is real, reachable code, not dead scaffolding.
4. **Harmless dramatic flourish** — does not warrant a record; the array stays empty; the directive
   is empty.
5. **Ordinary Fatelands wish, same intent** — `classifyWishDisposition` (the real, code-level Eight
   Orders classifier) recognizes it as a resisted Order (AGENCY); disposition is not "welcomes";
   calling it never touches `state._temptFateDurableConsequences` — the two pipelines are
   structurally separate, proven by state, not by function names.
6. **Reaches future prompts as a binding fact** — the real `_buildContinuitySpineBlock` (same
   function ordinary durable consequences already reach) includes the Tempt entry, carries the
   "must not be silently reverted" binding language, and is clearly labeled as its own DURABLE
   CONSEQUENCES section, distinguishable from free prose.
7. **No silent growth** — an ordinary Say/Do turn with no Tempt activity leaves the array untouched.

## 7. Regression

`_relational_obligation_contract_control.mjs` 47/47 · `_planner_function_gate_diagnosis_control.mjs`
unaffected · `_cg_proxy_world_guard_control.mjs` 15/15 · `_cg_causal_link_legibility_control.mjs`
25/25 · `_confession_frame_confessing_party_control.mjs` 16/16 · `_scene2_aftermath_lane_control.mjs`
22/22 · `_scene2_planner_function_gate_control.mjs` 10/10 (one transient navigation timeout on the
first batch run, confirmed clean on immediate re-run — server hiccup, not a regression) ·
`_scene2_lirael_defensive_path_lane_semantics_control.mjs` 22/22 · `_saydo_safety_gate_control.mjs`
24/24 · `_saydo_wallbreak_gibberish_cluster_control.mjs` 32/32 ·
`_petition_identity_rewrite_gate_control.mjs` 23/23 · `_tempt_fate_canon_rupture_control.mjs` 20/20
· `_tempt_fate_volatility_activation_control.mjs` 19/19 ·
`_tempt_fate_imprint_lifecycle_control.mjs` 19/19 · `_continuity_spine_dry.mjs` (80-check baseline)
— result appended to the commit body once the background run completes (expected unchanged: 69
passed / 11 pre-existing-failed).

## 8. What this pass does NOT do

- Does not touch `WISH_ORDER_SIGNALS`/`classifyWishDisposition` (§5's finding) — ordinary wish
  doctrine's own coverage gap, flagged for a separate future decision.
- Does not touch premise-protection or the cataclysmic-regex inflection gap from the original
  canon-rupture pass, beyond the two narrow, control-proven inflection fixes in the NEW Tempt
  durable-consequence classifiers themselves (§4) — those are this pass's own new code, not the
  pre-existing `_wishScale`/`validateStructuralOverride` regexes.
- Does not implement a post-hoc mechanism to read ACTUAL author output and reconcile it against the
  record's `outcome.description` (still an open design question from the earlier canon-rupture
  doc) — the record's `outcome` field is a doctrinal PROJECTION computed at seal time, not a report
  of rendered prose.
- No live Tempt Fate sample, no paid calls, no prose generation, no image work.
