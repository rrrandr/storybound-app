# STARTER IDENTITY LIFECYCLE — authored baseline → authorized change → future scenes · 2026-09-06

Second correction from Roman (2026-09-06), relayed after the reader-owned-identity memo:
**starter Books are hand-authored or pre-generated corridor experiences.** A new reader chooses a
Book and *inhabits* its prebuilt PC, LI, identities, world and opening; they do **not** select
name, LI, sex or ancestry at entry. After Scene 1, **Petition / Tempt Fate may change PC/LI
identity attributes, never the story world, genre or flavor.** Reader-generated identity (the
previous memo) is the **corridor** population, not the starters. This memo supersedes
`reader_owned_identity_model.md` §6 and open questions 1–2, and reinstates the starter sections of
`character_data_authoring_worksheet.md` as *baseline* authoring. Recommendation only: no code, no
calls, no starter canon invented. **§5 updated 2026-09-06 with Roman's explicit answers.** Every pipeline claim cites `public/app.js` unless noted.

> **PRIORITY RESET 2026-09-06 (Roman, authorized).** Every starter's cast and stage is an **explicit
> PLACEHOLDER** (all three baked Scene-1 packages are placeholder prose; only First Sacrifice has seed
> data, and it is a test fixture, not approved canon). **Do not wait for starter cast records and do not
> invent starter canon.** The contract-v2 First-Sacrifice-only data path is **EXPERIMENTAL, not a launch
> gate.** The uncommitted seed / v2 / routing work is **PARKED**: not broadened, 14B not enabled, no
> provider calls. Focus moves to the **generic story engine** — the shared live author path for every
> story path (starter, corridor, assignment-owned, continuation, Issue boundary, Library copy). See
> `_audit_out/author_path_continuity_spine.md`.

---

## 0 · LAUNCH-CRITICAL CONTINUITY SPINE (Roman, 2026-09-06 — the priority statement)

The existing Mythic Couple and sacrifice mechanisms are **not substitutes**: one has the wrong
trigger and resets at Issue 2; the other is Fatelands-only and non-durable. The only reusable idea
is their **restraint** — reputation affects the world naturally, never repeated every scene.

1. **Freeze** each starter's approved baseline cast and body bible.
2. **Reconcile** authorized Petition / Tempt Fate changes into future canon.
3. **Wire** that reconciled canon into every future scene directive.
4. **Persist** it through saves, Issue boundaries, and Forbidden Library copies.
5. **Add durable deed-level reputation** with public/private and recurrence semantics.

Until this exists, Storybound cannot reliably honor its most compelling promise: that readers'
bargains actually change the story. Map to §4: 1 → items 1–2; 2 → items 3–4; 3 → item 5 (+5b);
4 → item 6; 5 → item 4b. Nothing built.

## 1 · Does the code match the corrected model? Yes, with two legacy inconsistencies.

| claim | code | verdict |
|---|---|---|
| Starter opens on an authored Scene 1, identical for every reader | `public/starter-scenes.js` header: "Every starter Book EXCEPT Famous Fate opens on a hand-authored Scene 1 … identical for every reader … `prose` is FINAL, never passes through validators"; `_renderBakedScene1` (134652) mounts it verbatim; all packages still `placeholder` | **matches** |
| Reader selects nothing at entry | `_launchStarterStory` (134832) copies world/subtype/tone/flavor/dynamic/pov, species and archetype **from the def**, sets `storyLength='taste'`, locks the title; it captures no name, sex or LI. `showTasteCharacterModal` (12186) is defined and **never called**. `_bakedGenesisGate` (134335) is the unlock/charge modal only | **matches** — the earlier memo's "starter overrides mask/Storybeau/species" framing is **withdrawn**: the def *is* the identity |
| World/genre/flavor never change after entry | picks are def-locked; Tempt Fate world laws are keyed by world (`WORLD_TEMPT_FATE_MODE`, 68369) and never rewrite picks | **matches** |
| Post-Scene-1 authorized change exists | Tempt Fate resolution records `_recordDurableConsequence({type, detail, sceneIdx, bargainId})` (184085; callers 184739/184750) into `state._durableFateConsequences`, `permanent: true`, id `fc_<scene>_<n>_<type>`. Types: `voice_lost, memory_lost, years_taken, identity_altered, sense_lost, bond_lost, luck_spent, boon_gained, open_debt, other`. Currencies include the PC's **name → `identity_altered`** (singular, taken once) and **blood / hair / tooth / flesh** (repeatable) — 184503–184512 | **matches**: identity and body attributes are exactly what Fate may take |
| Petition changes identity attributes | `activateCouplePetitionVector` (95673) sets a per-scene steering vector and partner-sensitivity bias; `_matchLIFromPetitionText` (50710) only auto-focuses an LI in a list UI. **No identity mutation found** | Petition today steers; it does not alter identity. **DECIDED 2026-09-06 (Roman): Petition MAY alter identities and physical descriptions, same as Tempt Fate** — the code is behind the product model here |

**Legacy inconsistencies (report, not fix):**
- The First Sacrifice seed PC row is `nameLock: false` with the comment "player-named via the
  casting line" (126190), and the launch comment says "Only the Starring/Featuring casting line
  picks up the player's character name" (134878–134880). In the baked flow no casting line runs,
  so **the starter PC currently has no data-level name** — her name exists only wherever the
  authored prose says it. The LI is `nameLock: true` ("Julian", 126202).
- `TASTE_BOOK_DEFAULT_PREFS` (12133, PC Female / LI Male, "user can change any field") belongs to
  the dead modal; it is not the model.

---

## 2 · The lifecycle, as it must run

```
AUTHORED BASELINE (per starter, identical for every reader; provenance 'baseline')
   PC + LI + world-side cast: identity attributes (name, sex, pronouns, species, body baseline),
   facets, Scene-1 stage (facts, owned objects), plan spine
        │  Scene 1 = baked prose, FINAL, never regenerated
        ▼
AUTHORIZED CHANGE EVENT (post-Scene-1; writers = Petition AND Tempt Fate; subject = ANY character)
   { id, subject_ref, attribute, before, after, detail, sceneIdx, bargainId|petitionId, permanent, provenance:'tempt_fate'|'petition' }
   attributes include name, sex, voice, hair/colour, body type, height, body, memory, romance/bond (closed set, §5 Q4)
        │  applies FROM sceneIdx FORWARD only
        ▼
RECONCILED PORTFOLIO (baseline + every change ≤ current scene)
   facets appended (provenance 'change:<id>'), body baseline updated, owned objects issued/retired,
   never a rewrite of an earlier scene's text, facts or objects
        │
        ▼
ALL FUTURE SCENE CONTRACTS (Tier 2+, continuations, Issue 2+)
   C+ / E+ / fusion compose ONLY from the reconciled portfolio; fail-closed per beat
        │
        ▼
PERSISTENCE: change events + reconciled portfolio travel with the story (saves, every later Issue, AND the Forbidden Library copy)
```

**Where the chain is broken today (audit):**

| link | state | evidence |
|---|---|---|
| authored baseline as *data* | First Sacrifice only (seed `roleInstances`, `sceneOne`, `groundedObjects`, plan facts); First Taste / Glass House: prose placeholders, no cast data | seed inventory; `starter-scenes.js` |
| change event recorded | **yes**, provenance-stamped (id, sceneIdx, bargainId) | 184085–184101 |
| change event has a subject / attribute | **no** — `detail` is a sentence ("Fate took the PC's <currency>"); no `subject_ref`, no structured attribute | 184094–184100, 184739 |
| change reaches the author | **no** — `_buildDurableFateConsequenceDirective` exists and is marked "NOT wired into any prompt yet" (~184130) | comment in code |
| change reaches PC/LI body bibles | **no** — bibles are generated once per `storyId::subject` (`_bodyBibleScopeKey`), nulled only on story reset (80650/80657); no regeneration path | 251856+, `_bodyBibleOnce` |
| change reaches facets / portfolio / stage contract | **no** — no consumer of `_durableFateConsequences` outside Tempt Fate's own de-dup (184508) | grep |
| change survives into Issue 2 | **not found** — the continuation lock (99127) carries names, sexes, archetype; no carry of `_durableFateConsequences` or bibles was found | grep |
| earlier scenes never rewritten | **holds** — Scene 1 is verbatim; prior scene text is not regenerated | design |

So the recorded event is real and correctly stamped, and nothing downstream reads it. An
authorized change (the PC's name taken, a voice lost, flesh taken) can be contradicted by the very
next scene, and is forgotten by the next issue.

---

## 2b · MANDATORY LIFECYCLE REQUIREMENT (Roman, 2026-09-06)

An **authorized Petition or Tempt Fate change to any character's name, appearance, memory,
station, powers, voice / body / identity, relationships, or other durable canon MUST:**

1. update that character's **reconciled portfolio and body bible** (facets, body baseline, owned
   objects, relationship edges) at the scene of the change, with provenance
   (`change:<id>`, writer, `sceneIdx`);
2. **persist forward** across **all later scenes, Issues, saves, and Forbidden Library copies**;
3. **never rewrite already-read pages** — text, facts and objects of scenes `< sceneIdx` are
   immutable; the change applies from its scene forward.

A ledger write alone does not satisfy this. The requirement is met only when the changed value
demonstrably reaches the next scene's contract and the author payload, survives a save/reload,
survives the Issue boundary, and survives the Library copy (the wiring-proof standard).

**Fame / infamy / reputation is a durable consequence of the same class.** Public, memorable,
frequent Tempt Fate use by the PC must become a durable **reputation consequence**:

- **socially legible in later scenes** — strangers and institutions may know of the deed; a
  remembered public epithet (e.g. *"Parter of Seas"*) may be coined **in-story** and thereafter
  used by others;
- with **provenance** (which bargain/petition, which scene), **publicity** (private / witnessed /
  public; who saw it; how far it travelled), and **recurrence** semantics (how many public uses;
  which deeds are remembered; fame vs infamy valence);
- **available to scene contracts and author directives** as a source the planner may draw on and
  NPCs may react to, **without forcing every scene to mention it** (a contact-point discipline,
  not a per-scene mandate).

## 2c · Audit — is any fame / infamy / reputation mechanism already there?

Standard applied: *implemented* = state written AND read into a live author payload;
*dormant* = written or built but not read by any live path; *absent* = nothing. Ledger writes
alone are not "working."

| mechanism | what it is | written by | read by (live?) | persists | verdict against §2b |
|---|---|---|---|---|---|
| **Mythic Couple status** `state._mythicCoupleStatus` `{active, sealedAtScene, wishText, pcName, liName}` (183340–183700) | story-wide "the world knows this couple" flag with NPC-reaction distribution (~20 % ignorant, skeptical, joke, …), world-appropriate legend medium, quote bank, forget/reverse wish | **only** an explicit Tempt wish whose text matches "make us mythic / famous / remembered" (`_detectMythicCoupleWish`) | **yes, live:** heavy main prompt inline block (301206 → 301720), intimacy turn prompt (189632), CG screenplay (217253/217600), SD renderer (`orchestration-client.js:3113`), **and the lite compact Tempt block** (70605: "MYTHIC COUPLE active: NPCs treat X & Y as legendary") | in-story saves: yes (`saveStorySnapshot` spreads whole state, no delete); **Issue boundary: no** — cleared by story reset (80613); Library copy: no evidence | **IMPLEMENTED, but for a different trigger and unit.** Wish-text-triggered, binary, couple-level. No publicity/witness input, no recurrence count, no epithet, no per-character record, no fame-vs-infamy valence, does not survive Issue 2. Its *rendering discipline* (NPC contact points, reaction distribution, "not every scene") is the right pattern to reuse. |
| **Sacrifice reputation** `state._sacrificeReputation` `{history[≤10] of {alignment, magnitude, distortion}, profile ∈ clean / uncertain / fractured / dangerous_petitioner}` (26382–26398) | Fatelands-only reputation of the PC *as a petitioner*, derived from a rolling window of sacrifice acts | `resolveSacrifice` on detected sacrifice acts in **ordinary** turns (`_isFatelandsWorld && !_isPetitionOrTemptTurn`, 297885+) — **not** on Petition/Tempt turns | `buildSacrificeDirective` → `_sacrificeDirective` → `sceneDirectives` (298360) on the main turn builder; emits observer-reaction lines per profile (26525+) | in-story saves yes; **rolling window drops history past 10**; reset per story (80698); Issue/Library: no | **IMPLEMENTED, narrow and non-durable.** Publicity is *classified* (`_resolveSacrificeVisibility` → public / witnessed / private + witnesses, 26051–26059) but **only feeds the taboo check** (26336); the history entry stores **no visibility**. No epithet, no deed memory, no persistence, Fantasy-only, excludes the very Tempt turns the requirement targets. |
| **Durable Fate consequences** `state._durableFateConsequences` (184085+) | provenance-stamped permanent PC costs (name, voice, sense, memory, years, flesh…) | Tempt Fate resolution | `_buildDurableFateConsequenceDirective` exists, **"NOT wired into any prompt yet"** (~184130); only reader is Tempt's own de-dup (184508) | saves yes; Issue/Library no | **DORMANT** (writer without reader). |
| **Tempt ledger in the lite block** `state._temptFateLedger` (70606–70612) | "Tempt debts on the books: N invocation(s); the most recent (…) must keep costing" | Tempt seal | lite compact Tempt block, live | saves yes; Issue no | **IMPLEMENTED as private recurrence** (a count + last wish). It is debt, not fame: no publicity, no social legibility, no deed memory. |
| **Reincarnation legend score** `echo.legend_score`, `_detectLegendaryMoment` (311782+) | cross-story "Legend" points for *echo souls* (reincarnated characters), +5 per LLM-classified legendary moment at story end | end-of-story classifier call | **UI cards only** (312198, 312341) | in the echo record | **DORMANT for prose** — never reaches a payload; concerns imported echoes, not the PC's in-story reputation. |
| **REPUTATION_COLLAPSE** crisis shape + 8 subtypes (51476, 53894+) | an A-plot *threat* shape ("social exposure as a person / act") | plot selection | plot directive | per story | **Not a reputation record.** A pressure shape, not a consequence of anything the PC did with Fate. |
| `OFFSTAGE_REPUTATION` presence mode (260548, 262207) | the LI "known of" while offstage | planner | author | — | LI presence mode; not fame. |
| `HISTORICAL_REPUTATION_LAW` (140779) | static prose law for historical/Famous Fate worlds ("private actions may become public") | constant | block append (141108) | — | **Instruction, not state.** |
| `getLegendarySacrificeRumor` (16559) | rotating world-lore rumor line | — | **no callers** | — | **DEAD**; world lore, not PC fame. |
| earned epithet / deed-name / moniker generator | — | — | — | — | **ABSENT.** No state, no generator, no directive; the two "byname"/"epithet" hits are unrelated (entity lookup, group-individuation text). |

**Verdict.** Nothing implements §2b's reputation consequence. What exists is: a wish-triggered,
couple-level legibility flag with the right NPC discipline (Mythic Couple); a publicity classifier
whose output is not stored (sacrifice visibility); a private recurrence count (Tempt ledger); and
provenance-stamped durable costs that no prompt reads. **Absent:** publicity + recurrence
accumulation per deed, fame/infamy valence, in-story epithet coining and reuse, a per-character
reputation record, and any persistence across Issues or into the Library.

### Prerequisites added by §2b (annotations to §4; not built)

- **§4 item 3 — attribute scope widened** to: name, appearance (hair/colour, body type, height,
  marks), memory, **station**, **powers**, voice / body / identity, **relationships**, and
  "other durable canon"; the closed vocabulary must cover all of these or the reducer cannot
  carry them faithfully.
- **§4 item 4 — reducer output must include the body bible** (or body baseline) whenever the
  attribute is physical, and relationship edges (`_relationshipLedger`) whenever it is relational.
- **§4 item 6 — persistence scope now includes saves explicitly** (already carried by whole-state
  snapshot for the raw ledgers; the *reconciled* portfolio must be carried too), the Issue
  boundary (story reset currently clears all three ledgers: 80613 / 80630 / 80698), and the Library
  copy.
- **New item 4b — reputation consequence record.** One append-only record per public deed:
  `{ id, subject_ref (PC), source_event_id (bargain/petition), sceneIdx, deed_summary,
  publicity: { visibility: private|witnessed|public, witnesses[], reach: local|regional|world },
  valence: fame|infamy|ambiguous, recurrence_index, epithet: { text, coined_scene, provenance:
  'in-story' } | null }`. Input: the existing `_resolveSacrificeVisibility` classification
  (extended to Petition/Tempt turns) plus the Tempt ledger's recurrence; **the epithet is coined
  in prose by the author and captured back with provenance, never invented by the reducer.**
- **New item 5b — exposure directive, not a mandate.** A contract-facing block listing the PC's
  live reputation (deeds, reach, epithet if any) that the planner may draw on and NPC contact
  points may react to, with the Mythic Couple distribution discipline (a share of NPCs ignorant,
  skeptical, joking) and a hard rule that no scene is *required* to mention it. The Mythic Couple
  flag becomes one entry in this record rather than a parallel system.
- **New controls (§4 item 7):** (f) three public Tempt uses at scenes *k, k+2, k+4* → record has
  three entries with rising `recurrence_index`, publicity from the classifier, no epithet until
  prose coins one; (g) an epithet coined in scene *k* prose is captured with provenance and offered
  (not forced) at scene *k+1*; (h) a *private* Tempt use adds no reputation entry; (i) save/reload,
  Issue 2 lock and Library copy each carry the record byte-identically; (j) scene *k−1* artifacts
  unchanged. All dry, zero provider calls.

## 3 · Body-bible reroll hardcoding — reclassified

The reroll passes hardcode `"billionaire-modern world"` (PC, 252512) and `"billionaire-modern
world; male love interest"` (LI, 253441/253447). They fire **only inside the initial generation**
(`_generatePCBodyBibleUncached` body-tell family diversity loop), at story start.

- **Does it violate an authorized post-Scene-1 change? No.** No change event ever reaches the
  bibles (§2), so there is nothing for the reroll to violate. The defect is upstream of that.
- **What it is:** a **baseline stitch defect** on a reroll pass — for First Sacrifice and Glass
  House (worlds fixed by the def, not billionaire-modern) a rerolled bible is briefed for the
  wrong world; for First Taste it is coincidentally right. For corridor stories it also ignores
  the reader's LI sex.
- **Under the corrected model it is moot for starters** if the starter PC/LI body baseline
  becomes *authored or pre-generated baseline data*, identical for every reader, instead of a
  per-reader runtime generation. Today every reader of the same Book gets a different body bible
  for the same prebuilt PC, which already contradicts "identical for every reader."
- Disposition: its own decision (adjacent defect). Not a prerequisite of §4 if the baseline
  becomes data; a one-line fix if runtime bibles stay for corridor stories.

---

## 4 · Exact implementation prerequisites (not built; in dependency order)

1. **Baseline cast record per starter, as data.** For each of the three Books: PC and LI identity
   attributes (name, sex, pronouns, species, body baseline), `roleInstances` with `cPlusFacets`
   for PC, LI and recurring world-side cast, `sceneOne` facts and `groundedObjects` with
   `owner_ref`/`head`, plan rows with per-scene `eventFacts` (+ proposed `objects`). Provenance
   `baseline`. **Source is Roman's decision: hand-authored, or pre-generated once at bake time and
   designer-approved, then frozen.** Claude authors none of it. First Sacrifice is the reference;
   its PC row needs the name and sex it currently lacks at data level.
2. **Retire the casting-line assumptions for starters:** seed PC `nameLock` semantics, the
   launch comment, the dead prefs modal and its defaults — so no path can ask a starter reader for
   name/sex or override the baseline. (Corridor keeps its casting line; two populations.)
3. **Structured change event.** *(scope widened by §2b — see its annotations)* Extend the durable-consequence entry with `subject_ref` (**any
   character**: `pc:<slug>` | `named:<slug>` | `role:<id>` | `ent:<id>`), `attribute` drawn from a
   **closed structured vocabulary** that the reducer can faithfully carry (§5 Q4 — the current
   Fate-currency list is neither complete nor authoritative; decided members so far: name, sex,
   voice, hair/colour, body type, height, other body, memory, romance/bond), `before`/`after`
   where an attribute has a value, and `provenance: 'tempt_fate' | 'petition'` with the bargain
   or petition id. Keep id, `sceneIdx`, `permanent`. **Decided: Petition emits change events too**
   (today it cannot — a new writer, same record). **Duplicate-name rule (decided):** a change that
   produces a duplicate name is story material — acknowledged and resolved in-story, or left
   persistently awkward (Joe / Joseph) — and is **never silently normalized** by the reducer,
   renderer or any validator.
4. **One reducer, one reconciled portfolio.** *(must also update the body bible and relationship edges — §2b)* On append: derive a facet (truth-as-evidence,
   pressures with `evidence_requires`) and, when the attribute is physical, an updated body
   baseline; issue or retire owned objects; stamp everything `change:<id>`; never touch facts,
   objects or text of scenes `< sceneIdx`. The reconciled portfolio is the *only* thing scene
   contracts read. **Romance impossibility (decided):** when a change makes romance with the
   current LI impossible, the reducer records that and the story may **retarget the romance to a
   new character or open a multi-LI / suitor choice** — the canonical-LI commit therefore needs a
   provenance-stamped re-commit path (today `state.canonicalLI` is immutable, 22694+).
5. **Scene contracts consume the reconciled portfolio.** Stage contract, `_cpComposeOptions`,
   `_cpFactCorpus`, E+/fusion object issuance and the renderer take baseline + changes ≤ current
   scene for seeded Scene 1 and every Tier 2+ / continuation row; the durable directive gets
   wired to the author. Fail-closed per beat: no baseline → no C+/E+ for that person; a change
   event without `subject_ref` → logged, not applied.
6. **Persistence (decided scope; saves + Issue boundary + Library — §2b).** Change events and the reconciled portfolio travel with
   saves, into **every later Issue** (the Issue 2 lock at 99127 alongside names/sexes/archetype),
   **and into the Forbidden Library copy**; bibles (or body baseline) travel with them. Today none
   of this is carried. Constraint: the Library anonymizes protagonist and LI names (114114,
   320608) — anonymization must be applied *on top of* the reconciled portfolio so a changed name
   is renamed consistently rather than reverted.
7. **Controls before any spend.** (a) frozen First Sacrifice run: baseline facets reach the
   payload byte-identically to today; (b) mutation: record `identity_altered` (name) at scene *k*
   → scene *k+1* contract carries the new name and the facet, scene *k−1* artifacts are
   byte-identical; (c) mutation: `voice_lost` → next body baseline/bible lacks the voice tell and
   the author directive names the loss; (d) Issue 2 lock replay carries the events; (e) a change
   event missing `subject_ref` is logged and no contract changes. All on the existing dry suite;
   zero provider calls.
8. **Reroll hardcoding** — separate decision (§3).

Launch-critical, per the correction: items 1, 4, 5 (portfolio conversion, per-scene fact and
object issuance, C+/E+/fusion on the prebuilt cast). Items 3, 6, 7 are what makes a post-Scene-1
change survive. Nothing here needs 14B, a route change, or a new call for starters if the
baseline is frozen data.

---

## 5 · Decisions (Roman, 2026-09-06) — three unresolved items remain, everything else is implementation

**Decided on 2026-09-06 (explicit):** Petition and Tempt Fate may both alter identities and physical
descriptions (name, hair/colour, body type, height, sex, voice, body, memory, romance), targeting
**any character**. Romance made impossible → retarget to a new character or a multi-LI / suitor
choice. Duplicate names are story material (acknowledged/resolved or persistently awkward,
Joe / Joseph), **never silently normalized**. Authorized changes persist into later **Issues and
Forbidden Library copies**. "Attribute vocabulary" = the closed structured set the reducer can
faithfully carry; the current Fate-currency list is **not** complete or authoritative — its
enumeration is an implementation task, not a product question. Baseline source = hand-authored
**or** pre-generated once, then editorially approved and frozen.

**The three items that remain (Roman's own framing, 2026-09-06):**

| # | item | status |
|---|---|---|
| 1 | **Starter baseline canon** — prebuilt PC/LI names, bodies, pronouns etc. per Book | **Method adopted, values pending:** no form to fill. Once each Scene 1 is final, **extract those facts once, review them, freeze them** as that Book's baseline (provenance `baseline:extracted-approved`). The values exist only when the prose is final; Claude authors none. |
| 2 | **What a name-changing Fate consequence means** — new name, nameless, or old name kept as alias / "which Joe?" awkwardness | **Adopted: an in-story consequence choice at the moment it happens; no universal answer today.** Implementation consequence: the change event carries which of the three was chosen (`after`, `alias`, or `nameless`) so later scenes honor it; the reducer never picks silently. |
| 3 | **Stage-1 structure for First Taste and Glass House** (facts, cast, owned objects) | **Recommendation standing, not yet decided by Roman:** finalize the Scene-1 prose, one-time extraction into structured facts / cast / objects, approve, freeze — avoids duplicating canon in prose and data. Alternative on record: structured authoring alongside the prose. **Note:** the method adopted for item 1 *is* this extraction, applied to identity attributes; unless identity extraction and stage extraction are meant to differ, adopting 1 settles 3. |

Everything else in §4 (structured event, reducer, contract consumption, persistence, controls,
vocabulary enumeration) is a later implementation task, not an unanswered product question.

---

## 6 · Disposition

- `reader_owned_identity_model.md`: §§2–5 stand **for corridor stories only**; §6 and open
  questions 1–2 superseded by this memo (annotated in place).
- `character_data_authoring_worksheet.md`: starter sections **reinstated** as baseline authoring
  (hand or pre-generated, designer-approved); the withdrawal now applies only to reader-generated
  corridor stories, which the sheet never covered.
- Nothing under `public/`, `api/` or the seed changed; no provider called; valve opt-in, drafts
  unapplied, 14B disabled.
