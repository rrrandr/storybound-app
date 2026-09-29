> **PARKED 2026-09-06 (priority reset).** Every starter cast/stage in this sheet is an explicit PLACEHOLDER; do not
> fill it now and do not invent it. v2's First-Sacrifice-only path is experimental, not a launch gate.
# CHARACTER DATA — AUTHORING WORKSHEET (three starters) · 2026-09-06

> **REINSTATED FOR STARTERS — 2026-09-06 (second correction).** Starter Books are prebuilt corridor
> experiences: the reader inhabits the Book's PC, LI, cast, world and opening and selects nothing
> at entry. So the **starter sections of this sheet (§2, §3, §4) are valid again as BASELINE
> authoring** — filled by hand, or pre-generated once at bake time and designer-approved, then
> frozen with provenance `baseline`. The withdrawal below applies only to reader-generated
> **corridor** stories, which this sheet never covered. Two additions the baseline now needs per
> Book: PC/LI **identity attributes as data** (name, sex, pronouns, species, body baseline — the
> First Sacrifice PC row has none today) and, for every scene after 1, room for **authorized
> change events** (Tempt Fate) to append facets/objects without rewriting earlier rows. Lifecycle
> and prerequisites: `starter_identity_lifecycle.md`. Claude still authors none of the values.

> **WITHDRAWN IN PART — 2026-09-06 (Roman's correction).** This sheet assumed a designer-authored
> PC and LI for every starter. That is wrong for ordinary Storybound stories: **the reader
> generates the PC (and optionally the LI) by selecting archetype, name, sex, ancestry**, and the
> world stitches them in. Consequences for this sheet:
> - **§3 (First Taste) and §4 (Glass House): withdrawn.** They have no seeded cast; their PC and LI
>   are reader-generated. Do not fill PC/LI identity or LI facets for them. Only a designer-authored
>   *stage* (setting, world-side present people, objects) is a legitimate question there — open
>   question 8 in `reader_owned_identity_model.md`.
> - **§2 (First Sacrifice): stands only for the world-side cast and stage** (Julian is
>   seed-name-locked, Seren, the Dohkar, `sceneOne`, plan rows). The PC remains player-named and
>   player-sexed; nothing about her is to be authored here.
> - **§5 checklist: the "LI facets on all three" criterion is void.** PC/LI facets for generated
>   stories come from a bounded per-reader identity portfolio at genesis (`reader_owned_identity_model.md` §3).
> - The shapes in §1 remain correct; who *fills* them changed.

**Purpose.** The next real work is authoritative character data, not another model run. This sheet
collects, per starter, the four things the expression layer consumes: **identities, character-owned
facts/options, per-scene events, owned objects** — in the exact shapes the code already reads
(`roleInstances[].cPlusFacets`, `eventFacts[]`, `groundedObjects[]`, `STARTER_PLANS[].scenes[]`).

**Rule for this document.** Nothing marked `AUTHOR:` has been written by Claude. Every prefilled
value is quoted from the repo (`public/app.js` starter defs, seed, plans). Where the repo is
silent the field is blank on purpose. Famous Fate is excluded: the player names the world.

**What "done" means for the 14B test to be meaningful:** Tier 1 (Scene 1) **and one Tier 2+
continuation row** carry all four blocks for **at least one starter other than First Sacrifice**,
plus the LI facets on all three (REINSTATED 2026-09-06 as baseline data — hand or pre-generated, approved).

---

## 0 · Inventory — what exists today (read from the repo, not authored)

| starter | identities in defs | facets | Scene-1 stage (`sceneOne`) | plan rows with `eventFacts` | owned objects |
|---|---|---|---|---|---|
| The First Sacrifice (`starter_first_sacrifice`) | PC (player-named; "Lirael" in tests), Julian (LI), Seren, the presiding Dohkar; later rows name the Chayr and an investigating role | Dohkar 5 facets, Seren + Julian facets present (Julian offered 0 options in Scene 1 — no fact about him there) | yes — setting, present, narrator, 4 eventFacts, 7 objects (O4/O5 owned by PC) | n1 (3), n2 (1), n4 (3), n5 (2), n10 (1), n14 (1), n16 (1); **rows 3, 6–9, 11–13, 15, 17–20 have none**; no row has a `setting` or objects | Scene 1 only |
| The First Taste (`starter_the_first_taste`) | none named. Def: world Modern / small_town, flavor Billionaire, dynamic Enemies, tone Earnest, POV First, archetype BEAUTIFUL_RUIN; synopsis "A masked gala. A stranger whose voice you almost recognize. One night to decide whether power is something you take — or something you surrender." | none | none (baked placeholder Scene 1) | no plan | none |
| Glass House (`starter_glass_house`) | none named. Def: world Glass House; synopsis "A society that loves out loud, together — until you feel the one thing you are forbidden to feel alone." World canon exists (`GLASS_HOUSE_CANON`, `WORLD_BIBLE.glass_house`, `docs/glass-house-lore-audit.md`) — world, not people | none | none (baked placeholder Scene 1) | no plan | none |

---

## 1 · The shapes (copy exactly; the code reads these field names)

```js
// IDENTITY — one per person the story can express (roleInstances)
{ role_instance_id: '<starter>_<role>',            // stable across scenes; NEVER a slug from prose
  matches: ['<label>', '<alias>'],                 // how the scene text names them
  cPlusFacets: [ /* see FACET */ ] }

// FACET — one canonical truth + the conditions that make it show
{ facet_id: '<person>_<truth_slug>', category: 'worldview|insecurity|habit|contradiction|value',
  canonical_truth: '<one sentence, EVIDENCE-shaped: what a reader could infer, never a label>',
  possible_pressures: [
    { text: '<the condition under which this truth surfaces>',
      evidence_requires: '<regex of words a FACT (and the planner\'s act) must contain to establish it>' } ],
  forbidden_restatements: [ { forbid: '<regex of the truth said out loud>', why: '<why that is telling, not showing>' } ] }

// EVENT FACT — one attributable beat; the ONLY thing an option can be grounded on
{ text: '<what this person does/says in THIS scene, one sentence, camera-recordable>',
  participants: [ { ref: 'pc:self' | 'named:<slug>' | 'role:<role_instance_id>', role: 'actor|speaker|subject|target', label: '<label>' } ] }
//   grounding roles = actor | speaker | subject. A fact with two grounding owners grounds neither.

// OBJECT — addressable, owned
{ object_id: 'O<n>', name: '<canonical phrase the author will see verbatim>', owner_ref: 'pc' | 'all' | 'role:<id>' | 'named:<slug>' | null, head: '<one noun>' }
//   the object must also be NAMED in the scene text the author reads (setting / present / narrator, or the row's setting)

// PLAN ROW (STARTER_PLANS[<starter>].scenes[n])
{ n: <scene>, goal: '<one sentence: the irreversible change>', setting: '<WHERE, fixed>',
  participants: ['<label>', …],            // physically on stage
  eventFacts: [ /* EVENT FACT × 1–3 */ ],
  objects: [ /* OBJECT × 2–3 */ ] }       // ← PROPOSED field (gap memo §4); not consumed by code yet
```

**Authoring rules (from the project's standing doctrine, applied here):**
1. A truth is EVIDENCE, not a claim: "he reads the wine label because it is easier than the host's face", never "he is avoidant".
2. `evidence_requires` is what a FACT must contain to prove the condition **and** what the planner's ACT must contain to enact it — write it with both in mind (nouns of the fact + verbs of the act).
3. One fact, one owner. If two people act, write two facts.
4. Objects the story expresses through must be named in the scene text the author reads; give every personal object an `owner_ref` and a `head`.
5. Nothing that reaches the author may state the truth; the forbidden restatement is how you say what "stating it" looks like.
6. Mark, per scene, whether character expression matters there. Not every scene needs a beat; a scene with nobody under pressure is a correct plan.

---

## 2 · THE FIRST SACRIFICE — complete what exists

### 2.1 Identities (exist — confirm, do not restate)
PC `pc:self` (player-named) · LI `named:julian` · `named:seren` · `role:first_sacrifice_presiding_dohkar` · later: the Chayr, the investigating role (ids as in rows 4–5). `AUTHOR:` any secondary who recurs after Scene 1 and lacks a role instance: ______

### 2.2 LI facets — Julian (the gap that matters most)
Julian has facets on record but **no fact about him in Scene 1** (he is "at the edge, perfectly still, here only as an observer"), so he is offered no option there. Decide:
- `AUTHOR:` Is Julian meant to carry a Scene-1 beat? If yes, one Scene-1 `eventFact` with `role: actor|subject` about him that a camera could record without breaking "observer": ______
- `AUTHOR:` For rows 5, 9, 10, 14, 16 (his rows): one fact each already exists on 5/10/14/16 — confirm each fact's `evidence_requires` on the facet it should establish: ______

### 2.3 Rows to complete for Tier 2+ (pick ONE row first; the first run needs one)
Suggested by existing goals, not by Claude's preference — the author chooses: **n5** ("Julian quietly prevents the investigation…", 2 facts exist), **n10** ("Julian denies involvement — but not convincingly", 1 fact), **n16** ("Julian finally admits he acted", 1 fact).
For the chosen row, `AUTHOR:` `setting` (currently empty on every row) ______ · `objects` (2–3, with owners) ______ · confirm `participants` presence modes ______ · one more fact if the scene turns on two people ______

### 2.4 Seed hygiene (already decided, not yet edited)
- 1A and 2A are applied (OPT-10; sash in narrator). `AUTHOR:` confirm the wording of the new pressure text is canon you stand behind: ______
- `AUTHOR:` should any object be added to the Scene-1 list now that the sash is named? ______

---

## 3 · THE FIRST TASTE — baseline authoring (REINSTATED 2026-09-06; see top banner)

Existing frame only: Modern, small town, Billionaire flavor, Enemies dynamic, first person, BEAUTIFUL_RUIN archetype, synopsis above. No cast names, no facets, no plan, no objects, baked Scene 1 is a placeholder.

### 3.1 Identities
- PC: `pc:self` (player-named). `AUTHOR:` her role in the town / the gala (one line, no psychology): ______
- LI: `AUTHOR:` label(s) the scene uses before his name is known ("the stranger", …) and the canonical name once known: ______ → `named:<slug>`
- `AUTHOR:` up to two named secondaries who recur (host, rival, confidant…), each with `role_instance_id`: ______

### 3.2 Facets — LI first, PC-facing secondaries second
For the LI: `AUTHOR:` 2–3 facets in the FACET shape (truth as evidence; conditions with `evidence_requires`; forbidden restatements). ______
For each secondary: `AUTHOR:` 1–2 facets. ______

### 3.3 Scene 1 stage (`sceneOne`) — the baked Scene 1 will be authored by you; this is its data twin
`AUTHOR:` `setting` (one paragraph, physical, what the author may use) ______ · `present` (who is physically on stage, with the rule "name X early") ______ · `narrator` (what the PC is doing/obliged to do; what covers or restrains her) ______ · `aboutToHappen` (the beat sequence, each beat one event) ______ · `eventFacts` (1–4, one owner each) ______ · `groundedObjects` (3–7; every one NAMED in the text above; owners) ______

### 3.4 Tier 2+ rows (`STARTER_PLANS.starter_the_first_taste.scenes`)
`AUTHOR:` goals for n1–n20 (one irreversible change each) ______ · mark the scenes where expression matters ______ · for the FIRST such row: `setting`, `participants`, `eventFacts`, `objects` ______

---

## 4 · GLASS HOUSE — baseline authoring (REINSTATED 2026-09-06; see top banner)

Existing frame: world bible and canon are strong (Chorus, tears physiology, patches, "civilization continues", contemporary register). **No named people exist in the starter data.**

### 4.1 Identities
- PC: `pc:self`. `AUTHOR:` her standing inside the Chorus at Scene 1 (one line, no psychology) ______
- LI: `AUTHOR:` canonical name → `named:<slug>`; the label before the name is known ______
- `AUTHOR:` secondaries who recur (a witness, a chorister, family…), `role_instance_id` each ______

### 4.2 Facets
`AUTHOR:` LI 2–3 facets; secondaries 1–2 each. Note the world constraint the audit records: **no judgement, no jealousy, no anger inside the Chorus** — conditions must be shaped so a truth surfaces *within* that (what is felt alone; what is witnessed). ______

### 4.3 Scene 1 stage (`sceneOne`)
`AUTHOR:` `setting` ______ · `present` ______ · `narrator` ______ · `aboutToHappen` ______ · `eventFacts` ______ · `groundedObjects` (tear patches are a canon object class and already an image alias — whether one is an owned object here is your call) ______

### 4.4 Tier 2+ rows
`AUTHOR:` goals n1–n20 ______ · scenes where expression matters ______ · first such row fully authored (`setting`, `participants`, `eventFacts`, `objects`) ______

---

## 5 · Minimum set before the 14B test is meaningful (checklist)

| item | First Sacrifice | First Taste | Glass House |
|---|---|---|---|
| LI facets (2–3) | exist (seed-name-locked LI) — confirm Scene-1 fact decision (§2.2) | AUTHOR (baseline: hand or pre-generated, approved) | AUTHOR (baseline: hand or pre-generated, approved) |
| Scene-1 `sceneOne` with facts + owned objects | exists | AUTHOR | AUTHOR |
| one Tier 2+ row with setting + facts + objects | AUTHOR (n5 / n10 / n16) | AUTHOR | AUTHOR |
| secondaries with role instances | exist | AUTHOR | AUTHOR |

The `objects` field on plan rows is the one shape the code does not read yet (gap memo §4). Authoring it
now costs nothing and is what the Tier 2+ E+/fusion path will consume once the loader is extended;
until then those rows still ground C+ through their facts.

**Not part of this sheet:** any change to prompts, validators, routing, or the seed data itself. This is
the form; the truths are yours.
