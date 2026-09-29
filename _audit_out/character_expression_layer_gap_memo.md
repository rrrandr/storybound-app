# CHARACTER-EXPRESSION LAYER — ARCHITECTURE GAP MEMO · 2026-09-06

> **ANNOTATION 2026-09-06 (Roman's correction).** Ordinary Storybound stories have **no
> predetermined PC or LI**: the reader generates the PC (and optionally the LI) by selecting
> archetype, name, sex, ancestry, and the world stitches them in. The recommendation below to
> hand-author LI facets on all three starters (§4 row 1, §5 order (1), §9) is **withdrawn** for
> generated stories and narrowed to seed-name-locked LIs only. The corrected model — authoritative
> reader inputs, a bounded per-reader identity portfolio at genesis, scene-scoped
> provenance-stamped fail-closed facts/objects, optional LI absence, and the narrowed starter
> exception — is in `reader_owned_identity_model.md`. §§1–3 of this memo stand unchanged.

Recommendation only. Nothing here is built, no prompt changes, no data invented. Sources: the
Scene-1 stage contract (`app.js` 126952–127730), the option composer and continuation composer
(`128560–128760`), the fact corpus (`133090+`), the candidate/coverage selectors, the C+ chain notes
(`project_cplus_scene1_chain`, `project_npc_identity_substrate`), the cross-story memory policy
(`cross_story_memory_policy_v1.md`), and the v2 audits.

## 0 · What v2 established, and what it is not

v2 proved a method: the planner **selects** among backend-issued identities, facts and objects;
the backend **derives** the binding text; validators check ids, not prose. It works because First
Sacrifice authors three data blocks — `roleInstances[].cPlusFacets` (truths + conditions +
evidence patterns), per-beat `eventFacts` with participants, and `groundedObjects` with owners.
No other story has any of them, so v2 is a seeded-stage improvement for one book. The gap is not
the method; it is that the method has one data source and the rest of the product has none.

## 1 · How each population obtains identities, facts/options and props — today vs required

Vocabulary: **identity** = a canonical id the ledger recognises (`pc:…`, `named:…`,
`role:…`, `ent:…`). **Facts** = scene events attributed to a person (what an option can be
grounded on). **Options** = (truth, condition, evidence) welded by the backend. **Props** =
addressable objects with an owner. **Create** = may mint a new fact/identity/prop. **Select** =
may only choose among issued ids.

| population / stage | identity today | facts + options today | props today | who may CREATE | who may SELECT | gap |
|---|---|---|---|---|---|---|
| **PC** | `pc:<slug>` from the player name (`_resolvePcIdentity`) | facts only via seed/assignment `eventFacts` with `role: target`; PC has no facets — her expression is `pc_opening_fusion` + the archetype lens ops | owner of seed props only in First Sacrifice | nobody at runtime; seed/assignment author | planner (fusion beat, lens op) | PC "facts" exist only where an author wrote them; generated stories give her none |
| **LI** | `named:<slug>` from `loveInterestName`; ledger edge to PC | facets only if seeded (Julian); otherwise none — LI desire coding lives in prompt blocks, not facets | none | seed author; the LI body bible is generated but is *appearance*, not psychology | planner | the LI is the character the product most needs to express, and outside one seed he has no truths, conditions or facts a plan can cite |
| **named secondary** (Seren) | `named:<slug>` | seeded: facets + facts; otherwise: a slug minted from prose, "a name is not a ref" | seeded only | seed author | planner | unseeded secondaries are slugs with no record — C+ correctly fails closed |
| **Tier 1 = seeded starter Scene 1** (First Sacrifice) | roles resolved from `roleInstances` | full: facets, conditions, evidence patterns, eventFacts | `groundedObjects` + `owner_ref`/`head` | seed | planner | complete for one book; **the only population where v2 is active** |
| **Tier 2+ = seeded continuations** (scenes 2–20, `STARTER_PLANS[].scenes[n]`) | same roles | per-scene `eventFacts` where authored (`_selectSceneAssignment` reads `participants`, `eventFacts`); options composed by the **backend** (`backend_continuation`: it picks the option, the author owns expression — no planner act) | **none** — objects exist only as planner-declared free-text elements | plan author (per scene) | backend | no props, no owners, no E+ by id; C+ is backend-selected, which is right, but E+/fusion have no id substrate at all |
| **generated cast** (Marcus Vale via `generated_cast`) | `ent:<canonical>` minted by production from the A-plot antagonist; portfolio attached | portfolio facets (5) + the plan's `eventFacts` (one fact per scene in the test row); options composed from them | none | **the portfolio call** creates facets; the plan row creates facts | planner | facets exist only for the antagonist path; `relationship` and `emergent` providers are declared and empty (`264979`) |
| **assignment-owned stage** (fixed WHERE, stated participants, no seed) | participants stated by the row, aliases `authorized:false` | facts iff the row authors `eventFacts`; otherwise the event sentence grounds nothing (multi-owner monolith refused) | none | row author | planner | works exactly as far as the row is authored; most rows author a `goal` only (`project_scene_causal_contract_gap`) |
| **corridor / no-object stage** (planner-owned) | narrator only + established offstage people | none — the planner may not invent facts, so C+ is closed | planner-declared elements minted `O1…` as engagement objects, no owners | planner (elements only) | planner | correct fail-closed; no expression layer at all |
| **cross-story** | isolated by `storyId`; persona linking decided, not built | none carried | none | user (persona link, decided policy) | — | out of scope by decision; nothing here changes it |

**The create/select line, stated once:** *facts, identities and props are created by an author
(seed, plan row) or by one bounded backend call (portfolio); the planner and the author only ever
select among issued ids and express them.* v2 enforces that line on Scene 1 of one seed. The gap
memo's whole recommendation is to make the same line hold on every row of the table by giving
every population an issuer — not by giving the planner more freedom.

## 2 · Fail-closed when grounding is absent (unchanged, and made uniform)

Today: no facets → candidate withdrawn (C+ closed, story proceeds); no owned fact → no option;
no stage → C+ refused, scene proceeds; invalid skeleton → abort (valve opt-in). Proposed rule,
identical for every population: **an expression beat (C+, E+, fusion) is offered only when its
three inputs are issued — an identity id, an owned fact id, and (for E+/fusion) an object id. If
any is missing the beat is not offered, the reason is logged with the missing input named, and the
scene is authored without it.** No population gets a free-text fallback; no population gets a
new abort. This is the current doctrine, extended from "candidate" to "beat".

## 3 · Rendering author-visible text from canonical ids — without per-story or pronoun hacks

The `his sash` class exists because ownership is expressed in prose the planner writes. The
general fix is not a pronoun resolver; it is to stop asking for prose that carries ownership.

- **Objects render from the record.** Every object reference in a planner field is an id (`{O5}`),
  substituted after the identity scan with the record's canonical phrase. The planner writes the
  verb, never the noun phrase. (v2 did this for two beats; generalize to the opening beat and
  `visible_action` via the same `{Oid}` token.)
- **People render from the roster.** Same token for people: `{P:named:seren}` → the label the
  story uses; possessives become `{P:…}'s {O5}` — a possessive is then two ids, and *owner ≠
  possessor* is a deterministic check on ids, not on "his". Pronouns the planner writes are left
  alone: with the noun phrase gone from planner text, a stray "his" no longer attaches to an
  owned object anywhere the validator can see.
- **Ownership is data.** `owner_ref` on the object record; rendering appends nothing, the author
  gets the canonical phrase ("the officiating Sacrificiant's one ornamented ceremonial sash"),
  whose head already names the owner where the seed chose to.
- **What is rendered to the author is a projection of ids**: truth (from the record), condition
  (record), act (planner verb phrase with substituted ids), reading (planner), E+ (record phrase +
  planner change), fusion (planner verb phrase + substituted id). The author writes the prose. No
  story-specific strings anywhere in the validator; the validator knows ids and the records.

## 4 · Minimum data-contract additions (schema only, no values invented)

| addition | on | purpose | who authors |
|---|---|---|---|
| **WITHDRAWN for the LI of generated stories (2026-09-06, see `reader_owned_identity_model.md` §3): PC/LI facets are GENERATED per reader at genesis; only a seed-name-locked LI and world-side named secondaries are designer-authored.** `cPlusFacets` on the **LI** and **named secondaries** of every starter, in the existing facet shape (truth, `possible_pressures[]` with `evidence_requires`, forbidden restatements) | seed `roleInstances` | gives Tier 1/2+ their expressible people | seed author |
| per-scene `eventFacts[]` with participants on every `STARTER_PLANS` scene that is meant to carry C+ | plan rows | the only lawful fact source for continuations | plan author |
| `groundedObjects[]` with `object_id`, canonical phrase, `owner_ref`, `head` on any stage meant to carry E+/fusion by id; scene-scoped `objects` on plan rows for continuations | seed / plan rows | the E+ substrate outside Scene 1 | author |
| `gender` (or pronoun set) on role instances **only for rendering people by id** (`{P:…}` needs nothing; free prose does) — optional, not required by this design | seed | avoids nothing in the validator; this design does not need it | — |
| portfolio contract: `eventFacts` emitted alongside facets for a **generated** person (what the A-plot says they do this scene), participants required | `generated_cast` response | lets the composer ground a generated person's options without a plan row | the existing portfolio call, same bounded shape |

Nothing new is required of the planner beyond the tokens it already uses; nothing is required of
the author.

## 5 · Migration that preserves existing stories

- **Activation stays data-gated, exactly as v2 is now:** id contract iff the stage issues objects;
  option gating iff facets exist; nothing else changes for a stage without the data. Existing
  saves, corridor stories, First Taste and Glass House continue on the free-text path unchanged.
- **Order:** (1) ~~LI facets for the three starters~~ **WITHDRAWN 2026-09-06 — replaced by the per-reader identity portfolio (`reader_owned_identity_model.md` §3); seeded world-side cast facets only**;
  (2) `eventFacts` on the seeded continuation rows that already have goals; (3) objects with owners
  on the same rows; (4) `{P:…}`/`{Oid}` tokens for people and objects in the opening beat and
  `visible_action`, replacing the head-noun and possessive heuristics where ids exist; (5) the
  portfolio-emitted facts for generated cast. Each step ships behind the same data gate and is
  proven by replaying the frozen plans plus one control per population in the existing suite.
- **Nothing retroactive:** a story in flight keeps its stage authority (`_relLedger` story stamp,
  `cpAttemptId` ownership); a save that predates the data is a stage without the data.

## 6 · Multi-story acceptance matrix (what "done" would mean, per population)

| population | acceptance (all identity-pinned, control observed RED) |
|---|---|
| Tier 1 seeded Scene 1 | v2 as built: ≥ 4/6 real plans accepted on the fixed bar; blind read; the six suites green |
| Tier 2+ seeded continuation | a real scene N ≥ 2 commits a backend-selected C+ `{canonicalId, facet_id}` grounded on a row `eventFact`, E+ by object id from the row, author directive renders ids only; mutation: remove the row's fact → beat not offered, scene authored |
| LI (any starter) | the LI's first meaningful appearance carries a facet-grounded beat detected blind; mutation: LI facets removed → beat withdrawn, no prose fallback |
| named secondary, unseeded | slug never grounds; C+ closed with a logged reason; mutation: a name in prose alone must not create an identity |
| generated cast | portfolio facets + emitted facts → one option offered → one truth to the author (PART X shape) on a scene with no plan row; mutation: facts absent → no option |
| assignment-owned | rows with `eventFacts` ground; rows with `goal` only do not; both proven on the same row with the fact toggled |
| corridor / no-object | unchanged: no beat offered, no abort, no free text accepted (PART S) |
| cross-story | isolation holds (existing acceptance tests 1–6 in the policy) |

## 7 · Pricing and new-call consequences

- **Zero new provider calls** in this design. Facts, facets and props are authored data or ride
  the existing portfolio call (one `mistral-small` call per generated candidate today) with a
  slightly longer JSON response; options are composed by the backend; substitution is local.
- **Prompt bytes:** ids and canonical phrases replace free text; per stage the request shrinks
  slightly (v2 measured −900 B on Scene 1). Continuation rows that gain objects add ~100–300 B of
  object lines. No effect on the Small/Ministral admission class.
- **Author cost:** unchanged; the author payload is the same projection with better nouns.
- **Where cost could appear, and is not proposed:** a generated-facts call for *non-antagonist*
  generated people would be a new call per person; this memo does not recommend it. The lawful
  cheaper source is the plan row.

## 8 · Safe unchanged behaviour vs feature actually available

| | safe & unchanged today | feature actually available today | available after §4–§5 |
|---|---|---|---|
| Scene 1, First Sacrifice | free-text path if the seed data were removed | **yes** — full v2 (pending the 14B question) | same |
| Scene 1, other starters / corridor / Famous Fate | **yes** — old contract + repaired validators, proven green | no C+/E+/fusion by id; C+ closed unless a row authors facts | yes, per row, as data lands |
| seeded continuations | yes — backend-selected C+ where rows have facts | C+ partially (rows with facts); **no E+/fusion by id** | yes |
| LI expression | yes — prompt-block desire coding | no facet-grounded LI beat outside First Sacrifice | yes, once LI facets exist |
| generated cast | yes — antagonist path (PART X) | antagonist only | any generated person with emitted facts |
| ownership errors (`his sash`) | rendering safe (nothing crashes) | **can reach the author** on First Sacrifice | closed by `{P}`/`{O}` rendering, no pronoun logic |
| cross-story | yes — isolated | none | unchanged (separate policy) |

## 9 · Recommendation

Treat v2 as the reference implementation of the create/select line, not as a feature to roll
out. Do not spend on 14B again for a one-book path. Spend authoring time instead, in the order of
§5, ~~starting with LI facets on the three starters~~ (**WITHDRAWN 2026-09-06**: PC/LI data is reader-selected + generated, see `reader_owned_identity_model.md`) — the smallest data change that turns
the character-expression layer from one seed's property into the product's. Re-run the fixed
six-sample screen only when Tier 1 *and* one Tier 2+ row carry the data, so the run measures the
general layer rather than First Sacrifice again.
