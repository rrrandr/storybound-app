# READER-OWNED IDENTITY MODEL — corrected architecture · 2026-09-06

> **ANNOTATION 2026-09-06 (second correction).** This model applies to **corridor (reader-generated)
> stories only.** Starter Books are the other population: the reader inhabits a prebuilt PC/LI/world
> and selects nothing at entry; Petition / Tempt Fate may alter PC/LI identity attributes after
> Scene 1, never the world/genre/flavor. §6 below and open questions 1–2 are **superseded** by
> `starter_identity_lifecycle.md`; the "starter overrides are defects" framing in §1 point 5 and §2
> is **withdrawn** — for a starter, the def *is* the identity.

Correction from Roman, 2026-09-06: **ordinary Storybound stories have no predetermined PC or LI.**
The reader generates the PC (and optionally the LI) by selecting archetype, name, sex, ancestry,
then enters a world; the world must stitch those characters into its setting and generate the
story around them. The previous worksheet (`character_data_authoring_worksheet.md`) and gap memo
(`character_expression_layer_gap_memo.md` §4 row 1, §5 order (1), §9) recommended hand-authoring
LI facets on all three starters. **That recommendation is withdrawn** for generated stories and
narrowed for starters (§6 below). This document is recommendation only: no code, no calls, no
character or story truth invented. Every claim about the pipeline cites `public/app.js`.

---

## 1 · The pipeline as it actually runs (audit, reads only)

| step | what happens | reader-owned input read | where |
|---|---|---|---|
| **Intake (corridor)** | picks: world, worldSubtype, tone, flavor, dynamic, pov, length, intensity; PC mask (`playerMaskCardGrid`), LI archetype "Storybeau" (`archetypeCardGrid`); casting line: `playerNameInput`, `playerGender`, `ancestryInputPlayer`, `partnerNameInput`, `loveInterestGender`, `ancestryInputLI` | all of them | UI ids; `state.picks.*`; `state.gender` (PC sex), `state.loveInterest` (LI sex), `state.picks.identity{playerName, partnerName, displayPlayerName, displayPartnerName}` (99127 shape) |
| **Ancestry → region/species** | ancestry text resolves to a region (and, when the text locks an identity, a species) via `_resolveCanonicalPCSpecies`; the species card grid appears only for Fantasy + `the_inhuman` | ancestry text, species pick | 147649–147670, 47526, 40616 |
| **PC identity commit** | first non-placeholder of `state.playerName` → `state.name` → `state.identity.playerName` → `state.picks.identity.playerName`; minted `pc:<slug>` | name | `_pcIdentityCandidates` / `_resolvePcIdentity` (~128440) |
| **LI identity commit** | `commitCanonicalLoveInterest`: explicit → **seed nameLock** → corridor partner name → `_proposeLIName` gender-pool proposal; `state.canonicalLI` immutable; mask from `archetype.primary` | partner name, LI sex, Storybeau | 22694–22720, `_seedLIName` 128354 |
| **Stitch: body bibles** | `_generatePCBodyBible` / `_generateLIBodyBible`, fire-and-forget, once per story, gpt-4o-mini; PC main prompt reads `picks.world`, `picks.worldSubtype`, `state.playerMask`; LI main prompt reads `state.loveInterest` (sex) + `picks.world` | mask, world, LI sex, display name (`_pcBibleSubject` 251860) | 251856+, 253150–253452; scheduled at 96047, 215677, 224150 |
| **Stitch: plot** | `generateAPlot` reads mask, dynamic, flavor, archetype; `_generateRPlot` reads pairDynamic, mask, LI sex, archetype, aPlot; `_buildPlanningRomanceContext` reads picks, pairDynamic, aPlot, romanceEnginePlan | mask, Storybeau, dynamic, LI sex | 61719+, 260469+, 260318+ |
| **Generated cast portfolio** | `CHARACTER_PORTFOLIO` (mistral-small) issues facets per `candidate_ref`; the `generated_cast` provider covers the A-plot antagonist; `relationship` / `emergent` providers are declared and empty; **PC and LI are not portfolio candidates** | none | 132120–132420 |
| **Scene 1 / plan** | seeded starter: `sceneOne` + `roleInstances` (First Sacrifice only); everything else: planner-owned stage, free-text contract | — | 126190+, stage contract 126952–127730 |
| **Continuation lock** | Issue 2 re-locks `picks.identity`, archetype, PC sex, LI sex from the finished book | carried forward | 99127–99140 |

**What this audit establishes**

1. The reader's inputs already are the identity source for ordinary stories. Name, sex, ancestry,
   mask and Storybeau reach the commits and the stitch. Nothing in the intake is a placeholder for
   designer-authored people.
2. Generated PC/LI *psychology already exists per story* (body bibles, rPlot, aPlot roles) but lives
   as **prompt-block prose**, not as issuable facts. That is why the expression layer has "no LI
   facets" outside First Sacrifice: not because nobody authored them, but because the per-reader
   generation never enters the facet/option contract. The earlier worksheet misread this as an
   authoring gap.
3. **No ordinary path yields "no LI."** A blank partner name is resolved by `_proposeLIName`
   (genesis is never left unresolved); `famousFate.romance.noLoveInterest` exists only for Famous
   Fate (`ffPartnerMode === 'none'`, 247955/247963) and `_noRomance` consumers key on it (60235).
   `_liNameOrNeutral` yields a nameless role-noun LI, not an absent one.
4. Two stitch paths ignore the reader's world/sex: the body-bible **reroll** passes hardcode
   `"billionaire-modern world"` for the PC (252512) and `"billionaire-modern world; male love
   interest"` for the LI (253441, 253447). The main prompts read the picks; the repair passes do
   not. Reported, not fixed (adjacent defect, its own decision).
5. Starter launch **overrides** two reader picks: `state.archetype = {primary: def.archetype}` and
   pcSpecies/liSpecies from the def. The per-book prefs modal (`TASTE_BOOK_DEFAULT_PREFS`, 12133)
   defaults PC Female / LI Male and lets the reader change any field, while the First Sacrifice
   seed **name-locks the LI to "Julian"** (126202) and leaves the PC player-named (126190,
   `nameLock: false`).

---

## 2 · Authoritative inputs — who owns what

| datum | owner | authority | notes |
|---|---|---|---|
| PC name, sex, pronouns | **reader** | authoritative, immutable for the story | placeholder-name fallback is a kernel label, never a designer name |
| PC ancestry → region (→ species when locked) | reader (text) → resolver | authoritative once resolved; resolver may not override an identity lock | species grid only in `the_inhuman` |
| PC mask (archetype) | reader | authoritative | starters currently override it (§6) |
| LI presence | reader | **must become** an authoritative input (`liMode: 'none'`) — today only Famous Fate has it | §5 |
| LI name | reader, or proposal if blank | authoritative once committed; a proposal is provenance `proposed`, not `reader` | seed nameLock outranks it today (§6) |
| LI sex, LI ancestry, Storybeau | reader | authoritative | LI sex is read by the LI bible and rPlot; ancestry-LI reaches species only |
| World, subtype, tone, flavor, dynamic, pov, length, intensity | reader (selects among designer-authored options) | authoritative selection; option content is designer-authored | |
| World canon (physics, cultures, relics, species truths, forbidden facts) | **world designers** | authoritative; the AI never invents a replacement | seed / canon registries |
| World-side cast for a seeded starter (Julian, Seren, the Dohkar), `sceneOne`, `groundedObjects`, plan spine | **world designers** | authoritative for that starter only | the one legitimate hand-authored cast |
| PC/LI psychology, tells, wounds, relationship facts | **generated per reader**, bounded, inside the reader's picks | provenance `generated:<call>`; scene-scoped; never designer-authored for ordinary stories | today: body bibles + rPlot; not yet facets |
| Antagonist / secondary generated cast facets | generated (portfolio) | already provenance-stamped per `candidate_ref` | existing model to copy |

Rule: **a designer authors the world and, for a seeded starter, the world-side cast. Everything
about the PC — and the LI unless a seed name-locks one — is selected or generated per reader.**

---

## 3 · Where bounded PC / optional-LI portfolio data must be created

The create/select line from the gap memo stands; only the *issuer* for PC and LI changes. It is
not a seed author. It is **one bounded generation at genesis**, keyed to the reader's picks:

- **Point of creation:** immediately after the identity commits (`_resolvePcIdentity`,
  `commitCanonicalLoveInterest`) and before the first plan/skeleton call — the same moment the body
  bibles are scheduled today (96047 / 215677 / 224150). One call per person, or one call for both,
  gpt-4o-mini/mistral-small class, once per story, cached on state like the bibles.
- **Inputs (all reader-owned or world-authored):** name, sex, pronouns, ancestry/region/species,
  mask (PC) or Storybeau (LI), world + subtype + flavor + dynamic, world canon relevant to that
  region/species. Nothing else.
- **Output shape:** the existing facet shape (`cPlusFacets`: truth-as-evidence,
  `possible_pressures[].evidence_requires`, forbidden restatements) so the composer, normaliser,
  validators and renderer need no new consumer. This converts psychology the stitch already
  generates into something an option can be grounded on.
- **Bound:** the portfolio may create character truths; it may **not** create world truths, named
  third parties, owned objects with world significance, or events. Those come from the world (seed)
  or from the per-scene fact issuance (§4).
- **Provenance:** every facet carries `{ storyId, subject_ref: 'pc:<slug>' | 'named:<slug>',
  provenance: 'generated:identity_portfolio', inputs_hash }`. The existing portfolio record already
  stamps `storyId` and `subject_ref`; PC/LI entries follow the same record.
- **Re-generation:** only if the inputs hash changes (a reader edits the casting line before
  Scene 1). Continuations re-lock identity (99127) and reuse the record.

---

## 4 · Scene-scoped, provenance-stamped, fail-closed

- **Facts are scene-scoped.** For a generated story the planner does not author facts (unchanged
  law). A per-scene fact issuer (the plan row for seeded stories; for generated stories the plot
  step that already decides what happens this scene) emits `eventFacts` with participants, exactly
  as plan rows do. A PC/LI option exists in a scene only if that scene issued a fact the person
  owns. No fact, no option, no beat — the same closure v2 enforces for the Dohkar.
- **Objects are scene-scoped.** A generated PC/LI may own objects only if the scene issues them
  (`object_id`, canonical phrase, `owner_ref: 'pc' | 'named:<slug>'`, `head`). The planner selects
  ids; it never mints. Absent an issued object list the stage is planner-owned free text, exactly
  as today.
- **Provenance on every issued item:** `provenance: 'reader' | 'seed' | 'generated:<call>' |
  'proposed'`, `storyId`, and for facts/objects `scene_n`. A consumer may refuse by provenance
  (e.g. the author payload never receives a `proposed` name as if the reader chose it; a
  cross-story consumer refuses anything not stamped with its `storyId`).
- **Fail-closed per beat, not per scene.** Missing PC facet → no PC C+ beat; missing LI facet →
  no LI beat; missing object → no E+/fusion by id. The scene still authors from the stage. The
  opt-in valve and default abort for an *invalid* skeleton are unchanged.
- **The author sees expression, never provenance labels** — same as v2: names substituted after
  the identity scan, no ids or `generated:` markers in author-visible text.

---

## 5 · Optional LI absence — how it must work

Today the ordinary corridor cannot express "no LI" (§1 point 3). The model requires:

1. `liMode: 'none'` as an authoritative reader input alongside `'emergent' | 'directed'`, set from
   the casting line (the Famous Fate `partnerMode === 'none'` is the existing precedent and its
   consumers, keyed on `noLoveInterest`, show which blocks already know how to stand down).
2. Every LI consumer fails closed on `'none'`: `commitCanonicalLoveInterest` commits no
   `canonicalLI` (no proposal); the LI body bible, rPlot's pair dynamic, the Storybeau archetype
   lens, `_liNameOrNeutral`, the LI-presence rules in the stage contract, and the romance
   continuity blocks all short-circuit rather than substitute a role-noun LI.
3. Absence is provenance too: `liMode: 'none'` is stamped on the story record and re-locked on
   continuation, so Issue 2 cannot re-propose a partner.

Which blocks currently assume an LI exists is a code audit not yet done; the list above is what
the reads in §1 touched, not a complete inventory.

---

## 6 · Is the three-starter exception genuinely different? — **SUPERSEDED 2026-09-06: yes, entirely; see `starter_identity_lifecycle.md`** (table kept for the record)

| aspect | ordinary generated story | seeded starter (First Sacrifice as built) | genuinely different? |
|---|---|---|---|
| PC | reader-generated end to end | reader-named (`nameLock: false`), sex/pronouns from the per-book prefs modal | **no** — the PC stays reader-owned; the seed must stitch her, not define her |
| LI | reader-selected or proposed | **name-locked** to a designer-authored world-side character (Julian) with authored facets | **yes** — the LI is part of the authored world cast; this is the one place LI facets are legitimately designer-authored |
| mask / Storybeau / species | reader | overridden by the starter def at launch | different today; whether that override is intended is an open question (§8) |
| secondaries, stage, objects, spine | none authored; generated per story | authored `roleInstances`, `sceneOne`, `groundedObjects`, `STARTER_PLANS` | **yes** — world-side, correctly designer-owned |
| First Taste, Glass House | — | no seed cast, no `sceneOne`, planner-owned Scene 1 | **not different from generated stories today**; the withdrawn worksheet wrongly proposed authoring their PC/LI |

So the exception is real but narrower than the worksheet assumed: **a seeded starter may
pre-author the world-side cast (including a name-locked LI) and the stage; it never pre-authors
the PC, and First Taste / Glass House have no seeded cast at all and therefore no exception.**

---

## 7 · Authored by world designers vs generated/selected per reader (the line, stated once)

**World designers author:** world canon and forbidden facts; the option sets the reader selects
from (masks, Storybeaus, worlds, flavors, dynamics, species); for a seeded starter only, the
world-side cast with facets, the Scene-1 stage with owned objects, the plan spine with per-scene
facts, and the LI **if** the seed name-locks one.

**Selected or generated per reader:** the PC entirely (name, sex, pronouns, ancestry, mask, and
the bounded facet portfolio derived from them); the LI presence, name, sex, ancestry, Storybeau
and portfolio unless a seed locks the LI; every PC/LI scene fact and owned object, issued per
scene, provenance-stamped, fail-closed.

---

## 8 · Exact open questions (decisions, not for Claude to invent)

1. ~~**Seed nameLock vs reader LI sex.**~~ **WITHDRAWN 2026-09-06 — starter readers select no LI sex.** First Sacrifice locks the LI to "Julian" while the prefs
   modal lets the reader set LI sex. Which wins, and is the seeded LI's sex fixed canon or
   reader-selectable with the name regenerated?
2. ~~**Starter override of mask / Storybeau / species.**~~ **WITHDRAWN 2026-09-06 — the def is the starter identity; not a defect.** Intended (the starter *is* the archetype
   pairing) or a defect against reader ownership?
3. **`liMode: 'none'` for ordinary stories** — in scope for the product now, or later? It is a
   new authoritative input and a consumer-by-consumer stand-down audit.
4. **Issuer of per-scene facts for generated stories.** Which existing step (the A-plot scene
   row, the situation planner, or a new bounded step) owns `eventFacts` issuance? The law is only
   that the planner and author never mint them.
5. **Bound of the identity portfolio.** May it name a PC's *belongings* (a scene-independent owned
   object) or only truths? Recommendation: truths only; objects are issued per scene.
6. **Proposal provenance.** When the reader leaves the partner name blank, is the proposed name
   presented to the reader for confirmation before genesis, or accepted silently as today?
7. **Body-bible reroll hardcoding** (`billionaire-modern`, `male love interest`) — fix now as a
   separate decision, or fold into the portfolio conversion?
8. **First Taste / Glass House Scene 1.** Since they have no seeded cast, do they receive a
   designer-authored *stage* (setting, world-side present people, objects) with the PC/LI stitched
   in, or remain fully generated? Only a stage would be designer-authored either way.

---

## 9 · Disposition of prior documents

- `character_data_authoring_worksheet.md`: §3 and §4 (First Taste, Glass House PC/LI identities and
  LI facets) **withdrawn**; §2 (First Sacrifice) stands only for world-side cast and stage; the
  "LI facets on all three" completion criterion is void.
- `character_expression_layer_gap_memo.md`: §4 row 1, §5 order (1) and §9 annotated as superseded
  by this document; §§1–3 (create/select line, fail-closed per beat, render from ids) unchanged.
- Nothing under `public/`, `api/` or the seed changed. No provider was called. Valve opt-in,
  drafts unapplied, 14B disabled.
