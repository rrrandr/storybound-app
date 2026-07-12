# Romance Engine Ontology

**Status:** 1.1 — envelope + layers + litmus tests + Magic/Sacrifice first-principles locked. FOUR cells + emit split BUILT and **prose-VALIDATED** across two gen diffs (2026-07-12): (1) Vaelryn+Arcane-Binding moved OLD 50% oath / 50% bloodline → NEW 94% oath; (2) cross-pressure — `arcane_binding×the_veilwood` and `fated_blood×the_shackle_isles` both held flavor identity in the region's register (OLD arms ate/blurred the flavor). Pattern validated, not just Vaelryn. Remaining ~16 cells: cleared to populate.
**Purpose:** define the contract between the Romance Engine and the world model, so region and flavor stop being concatenated peers and become a hierarchy. This is the ontology; individual region×flavor cells are downstream of it.

---

## The four layers

```
Storybound Engine   — universal mechanics (Fate, Petition/Tempt, sacrifice system, editorial repair)
      ↓
Flavor              — WHAT kind of romance this is  (what forbids love)
      ↓
Region              — HOW this culture expresses/enforces that prohibition
      ↓
Story               — the specific instance  (this crisis, this LI, this oath, House Aster)
```

Each layer may only reach **down**, never sideways or up. The Story layer is not new
infrastructure — it already exists as runtime `state`. Naming it here makes explicit a
boundary that is currently implicit and routinely violated.

**One-line test of the whole model:**
- Flavor answers *"what forbids love?"*
- Region answers *"how does this culture ask that question / enforce that prohibition?"*
- Story answers *"whose, and about what, this time?"*

The flavor's `romance_question` never changes. The region changes how the world *asks* it.
The story changes *who is asking*.

### Layer responsibilities (who owns what)

| Layer | Owns |
|---|---|
| **Engine** | Fate · Petition · Tempt · sacrifice system · editorial repair · enforcement of `obstacle_elasticity` |
| **Flavor** | `prohibition` · `mechanic` · `romance_question` · `narrative_invariants` · `sacrifice.domains` · `obstacle_elasticity` (declares the value) |
| **Region** | institutions · aesthetics · enforcement · `social_consequence` · `cultural_framing` |
| **Story** | the actual oath · the actual prophecy · the actual curse · the actual house · the actual antagonist · the actual lovers |

`obstacle_elasticity` appears in two rows on purpose: the **Flavor declares** the value (arcane's
differs from cursed's), the **Engine enforces** it. It is a flavor-authored invariant that the
engine honors — like an interface a flavor implements. The Region never sees it.

---

## Magic & Sacrifice (Fatelands first principles — Engine layer)

> **Magic is never purchased. It is exchanged. Every spell permanently transforms the caster, and
> each culture has its own beliefs about which transformations are honorable, shameful, or forbidden.**

**The universal law, reframed.** Not "magic requires sacrifice" but: **magic requires
transformation; sacrifice is the mechanism by which the transformation is paid.** You do not spend
energy — you spend *self*. (Codifies the existing REALITY MODEL: *"Magic requires sacrifice — not
energy, not mana. Identity. No spell is free."* — app.js ~122113.)

**Engine-wide invariants (true in every region):**
- **No free magic.** No meaningful spell is free.
- **Proportional to permanence and improbability — not apparent scale.** The cost tracks how
  *permanent* and how *improbable* the change is, not how big it merely looks. Perfect lipstick all
  day → a hair. A healed paper cut → a drop of blood. A dying child restored → a finger, or twenty
  years of memory, or permanent colour-blindness. A castle from nothing → likely beyond what one
  person can pay. Making someone *genuinely* fall in love → impossible through Petition alone: Fate
  reaches the world only as luck, timing, and coincidence (it can arrange the *meeting*, never
  manufacture the *feeling*). This is what keeps the economy from collapsing into "bigger spell =
  bigger flesh payment." (Canon already ladders peripheral→core and flags premise-breaking wishes as
  cataclysmic-cost — app.js ~97744, ~67943.)
- **No stockpiling, outsourcing, or prepaying** — except through explicitly named world mechanics.
  A jar of fingernails is not a bank of sacrifices; the price is the *transformation at the moment of
  casting*, not a hoard of severed bits. Outsourcing exists only as **Law D** (sacrifice transferred
  from another) — and Law D is reviled and its practitioners hunted. Prepared/stored sacrifice-power
  exists only through named relic mechanics (e.g. Veilwood's charred Unbound-wood; legendary-sacrifice
  relics). Anything else is a loophole, not a rule.
- **Non-fungible.** Money may buy a *ritual*; it can never *be* the sacrifice. The price is always
  personal, transformative, paid in self — never fungible currency. (Even the "transactional"
  regions trade future-advantage / taken-identity, never coin.)
- **Legible.** The reader must understand *why this price fits this culture* (each sacrifice alters
  self / partner / political perception).
- **Permanent by default — never a clean refund.** Permanent under Law A (the default). Reclaimable
  only rarely and at further cost, returning distorted (Laws B/C), or once in a lifetime at the
  Syzygy. Never simply undone.

**Moral diversity (what makes it social, not mechanical).** Cultures disagree about *which*
sacrifices are honorable, shameful, or forbidden — but all agree no meaningful magic is free. A
Vaelryn noble is horrified someone gave a finger; a Shackle Isles captain thinks giving up a
cherished memory is cowardice. Same spell, same power, different morality.

**Ownership (fits the region/flavor split above):**
- **Flavor owns** the sacrifice **domains** native to it (`sacrifice.domains`; immutable — the
  Region reads, never edits).
- **Region owns** the sacrifice **culture**: which domains are honored, common, or taboo, how a
  sacrifice is interpreted, and its social consequence. (= `FATELANDS_SACRIFICE_CULTURE` per region.)

**Every region permits every domain — in principle.** Regions differ in *preference, honor, taboo,
and interpretation*, never in underlying possibility. A Vaelryn mage *can* sacrifice a finger — it's
just crude, dishonorable, hedge-magic-coded. A Shackle Isles mage *can* give up a cherished memory —
locals may read it as an evasive dodge of the "real" price. This is what gives regions their texture
without fracturing the magic into incompatible regional rulebooks: **one physics, many moralities.**

**Codifies — do not overwrite.** The Four Sacrifice Laws (A permanent / B rare-reclaim / C
distorted-reclaim / D transferred-reviled), the Syzygy reclaim window, the romantic-sincerity law
(*sincere binds cleanly, doubt twists*), and the peripheral→core escalation ladder. This section is
the first-principles *statement* of that machinery, not a replacement.

**Granularity.** The ten headline domains (flesh, memory, emotion, years, voice, shadow, name,
status, inheritance, reflection) are **categories**. Granular sacrifices — a hair, a tooth, a
night's sleep, the taste of umami, a stranger's face, the colour green — are **instances within**
those categories (mostly flesh / memory / reflection), not new domains. Keep the ten; let the
instances be texture.

---

## Non-goals (the durable constraints)

Negative constraints outlive positive schema. When a sixth flavor is added in two years,
these bullets will prevent more drift than any field definition. **A region may never:**

1. alter flavor **mechanics**
2. alter **pacing / topology**
3. remove **player options (strategies)** defined by the flavor
4. instantiate **story specifics** (proper nouns, a particular crisis/LI/oath)

(1–3) are the same principle — *region ⊥ mechanic* — stated three ways on purpose.
(4) is a different vector — *region ⊥ story-instance* — and guards against regional data
quietly becoming plot templates.

---

## Core envelope (uniform across all flavors)

```yaml
core:
  prohibition:          # the obstacle: what stands between them
  romance_question:     # internal; the dramatic question this flavor plays (one sentence)
  reader_experience:       # the felt guarantee (MUST differ from the question; if it can't, drop it)
  narrative_invariants: []      # inviolable prose rules  ← migrates from the *_HARD_CONSTRAINTS strings
  sacrifice:
    domains: []         # WHAT may be given (immutable; region reads, never edits)
  obstacle_elasticity:  # how far Storybound may bend this obstacle before the flavor stops being itself
  mechanic: {}          # POLYMORPHIC, flavor-private. No layer above Story may reference this.
```

Field rulings:

- **`obstacle_elasticity`** was promoted out of the per-flavor mechanic. It is not a mechanic —
  it is a contract with the rest of the engine: the maximum any system (Fate, Petition, Tempt,
  reroll, editorial repair, future mechanics) may soften the obstacle. Owned by Storybound, not
  the flavor. (Named for what it *is*, not for Fate; and deliberately **not** `canonical_elasticity`,
  to avoid collision with the FF "canon" subsystem.)
- **`strategies` is NOT promoted.** Every flavor has "player responses," but they are five
  different state machines (contractual moves vs responses-to-destiny vs responses-to-transformation
  vs responses-to-incomprehension vs responses-to-separation). They share only "the player has
  agency" — too weak a reason to elevate. They live inside `mechanic`. Non-goal (3) protects them
  there.
- **`mechanic` is a flavor-private namespace.** This *is* the structural boundary: a region cell
  has no reference to it, so it cannot touch pacing/topology/resolution by construction — not by
  a directive nobody can see.
- **`narrative_invariants`** is where the existing `*_HARD_CONSTRAINTS` content migrates.

---

## The five flavor cores (validated on paper)

The envelope was stress-tested against the two flavors *least* like a contract
(`the_inhuman`, `the_beyond`). Both sit in it cleanly with no forced `resolution` field —
that is the proof the ontology is real and not Arcane-Binding-shaped.

```yaml
arcane_binding:
  prohibition: a sworn or imposed magical contract with concrete terms
  romance_question: "What promise is worth breaking?"
  reader_experience: the pull of an obligation you agreed to and can no longer unswear
  narrative_invariants: [terms surfaced not vague, crossing a term flares consequence, doubt = broken vows / linguistic distortion]
  sacrifice: { domains: [Name, Voice, Shadow, Inheritance] }
  obstacle_elasticity: "temporary, localized — one act/decision; the geas itself persists"
  mechanic: { contract: { strategies: [amend, loophole, pay], escalation: contract-tightening } }

fated_blood:
  prohibition: lineage — blood and prophecy decide who you may love
  romance_question: "Is love stronger than destiny?"
  reader_experience: desire pressing against an inheritance you didn't choose
  narrative_invariants: [cost is dynastic not personal-affliction, blood reacts to intimacy, defiance defers destiny never breaks it]
  sacrifice: { domains: [Years, Inheritance, Emotion, Status] }
  obstacle_elasticity: "the arc may deviate for a scene, then pulls back into shape; destiny is deferred, not broken"
  mechanic: { destiny: { strategies: [defer, fulfill, accept, redirect], trajectory: self-correcting-arc } }

cursed:
  prohibition: an external affliction actively warping the self
  romance_question: "Can someone love what you're becoming?"
  reader_experience: a relationship you're fully inside before you see what it costs
  narrative_invariants: [zero unease in phases 1-3, the change emerges FROM intimacy, one recognized boundary crossed anyway]
  sacrifice: { domains: [Emotion, Years, Flesh, Status] }
  obstacle_elasticity: "the change may pause or recede for a scene; the Becoming resumes"
  mechanic: { becoming: { strategies: [endure, transform, integrate, succumb], phases: [attraction, comfort, dependence, distortion, realization], reversibility: partial, topology: [player, li, both, li_already_monstrous] } }

the_inhuman:
  prohibition: species / biological otherness between the lovers
  romance_question: "Can you love what you can't fully understand?"
  reader_experience: attraction across a gap that never entirely closes
  narrative_invariants: [asymmetry is sensory and concrete, communication is partial, otherness is never cured]
  sacrifice: { domains: [Reflection, Flesh, Shadow, Memory] }
  obstacle_elasticity: "the LI may pass-for-human briefly or one instinct may recede for one scene; the otherness returns"
  mechanic: { asymmetry: { strategies: [bridge, adapt, mistranslate, surrender-to-difference], axes: [sensory, anatomical, temporal, meaning] } }

the_beyond:
  prohibition: separation — death, planes, immortality, or time divides them
  romance_question: "Can love survive being apart?"
  reader_experience: presence and loss occupying the same moment
  narrative_invariants: [the boundary thins under intimacy, love persists across it not removes it, reunion returns altered]
  sacrifice: { domains: [Memory, Name, Emotion, Reflection] }
  obstacle_elasticity: "a visitation or thinning is possible for a scene; the separation reasserts"
  mechanic: { boundary: { strategies: [reach-across, wait, let-go, cross], kinds: [death, plane, immortality, time] } }
```

Note the mechanics are genuinely five different engines — `contract`, `destiny`, `becoming`,
`asymmetry`, `boundary`. That divergence is why `mechanic` must be polymorphic and why
`strategies`/`resolution` could never be a shared core field.

---

## The Region layer

### RegionContext — the read interface (treat as an API)

From a region cell's perspective, **only these core fields exist**:

```yaml
RegionContext:              # the ONLY core fields a region cell may read
  prohibition
  romance_question
  sacrifice_domains

# Explicitly unavailable (out of scope by construction):
#   mechanic
#   player_strategies
#   topology
#   pacing
#   narrative_invariants
#   obstacle_elasticity
```

A region that needs any field on the unavailable list is not a region — it is a new flavor,
or a bug in the flavor definition. The unavailable list is stronger than any paragraph of
explanation: it is the interface.

### Region cell schema (expression-only)

```yaml
<flavor>:
  <region>:
    obstacle_form:      # how this flavor's prohibition physically appears here
    enforcement:        # how the culture/institutions enforce it
    social_consequence: # what breaking it costs SOCIALLY (not the mechanic's cost)
    backdrop:           # the other affine flavor's pull, demoted to setting
    imagery:            # aesthetics, materials, motifs
    cultural_framing:   # one-liner: how THIS culture asks the flavor's romance_question (the per-cell QA anchor)
```

Every value must be a **type/category, never an instance**. "Ceremonial fealty oaths" — yes.
"The oath sworn to House Aster" — no; that is the Story layer's job.

### Region ↔ Story boundary (inventory vs selection)

The region owns the **institutional inventory**; the story owns the **selection**. This pattern
already exists correctly in code: `VAELRYN_HOUSES` is the region-canonical inventory (the five
houses are world-fact — Aurelion, Thornmere, Velar, Dathros, Merrowyn), and
`getVaelrynHousePresence()` performs the per-scene story selection. Region names the cast;
story casts the scene.

---

## Litmus tests (the QA gate every cell must pass)

Run these on any region×flavor cell before it ships.

**1. Flavor Identity Test.** Remove the region entirely — can you still immediately identify the
flavor? If not, the region has consumed the mechanic.

**2. Region Identity Test.** Hold the flavor constant, swap the region — does the *obstacle* stay
identical while only its *social expression* changes? If the obstacle changed, the region isn't
expressing, it's modifying.

**3. Mechanical Purity Test.** A region may never change: `prohibition` · `mechanic` · `pacing` ·
`topology` · `player_strategies` · `sacrifice.domains` · `obstacle_elasticity`. Wanting to change
any of them means you are creating a new flavor, not a region.
*(The RegionContext interface already makes the schema-reachable subset of this impossible to
violate by construction — the cell has no reference to those fields. Tests 1, 2, and 4 catch the
part structure can't: prose bleed.)*

**4. Swap Test.** Take `Arcane Binding × Vaelryn` → `Arcane Binding × Shackle Isles`. Everything
mechanical must survive the swap; only institutions, imagery, enforcement, and social consequence
may change. If the romance *plays* differently, the boundary has failed.

**These are prose-judgment tests, not keyword counts.** A lexical proxy (counting "oath/contract"
vs "blood/lineage" tokens) is a useful smell test but *fails where the region's instrument shares
vocabulary with the other flavor's mechanic* — e.g. Shackle Isles × Fated Blood renders the
bloodline-destiny mechanic through coercive *pacts/chains*, so a counter miscounts the instrument
imagery as "contract" even though the obstacle is the blood. Always read the OBSTACLE: *is the
mechanic the blood, or the pact?* — don't trust the tally. (Verified in the 2026-07-12 cross-pressure diff.)

---

## Migration path (this is not greenfield)

- `narrative_invariants` ← the existing `*_HARD_CONSTRAINTS` strings.
- Region cells ← deepen `FANTASY_FLAVOR_REGIONALIZATION` from a flat `manifestations` list into
  a region-keyed cell map (`byRegion: { … }`).
- Region selection already uses `FANTASY_REGION_FLAVOR_AFFINITY`; the ontology adds using it
  *after* selection (to key into the cell), which is its higher-value job.
- Emit change: split the current region block into **world-canon** (houses, geography, relics,
  sacrifice *currency* — stays as shared backdrop) and **obstacle-expression** (routed through the
  region cell). Do NOT wholesale-replace the region block.

---

## Open decisions / next steps

1. **Lock this envelope.** (Done in principle: `strategies` stays in `mechanic`;
   `obstacle_elasticity` promoted + renamed.)
2. ~~Draft the two Vaelryn cells~~ — DONE. `FANTASY_FLAVOR_REGIONALIZATION.{arcane_binding,fated_blood}.byRegion.vaelryn_reach` (app.js ~121923).
3. ~~Wire the emit split for Vaelryn only~~ — DONE. `buildFantasyWorldBlock` (app.js ~122522) emits a `REGIONAL EXPRESSION` block from the cell after the flavor block; the `backdrop` line demotes the region's own coding to scenery. Region-anchor world-canon block left intact (backdrop, per the "don't wholesale-replace" rule).
4. ~~The one paid experiment~~ — DONE, PASSED (2026-07-12). Controlled A/B (world-collision signals
   held constant, only the cell block varied), gpt-4o via `/api/chatgpt-proxy`, 3 pairs. Obstacle
   register shifted OLD 50% oath / 50% bloodline → NEW 94% oath; OLD rendered inherited-fate
   (Fated Blood drift), NEW rendered a sworn court-contract with lineage as backdrop. Model = gpt-4o
   (local proxy reaches OpenAI + Mistral, not Grok text); shift is large enough to expect transfer,
   but a Grok-author confirmation is the one remaining fidelity check.

5. **Cross-pressure validation** — DONE, PASSED (2026-07-12). Two maximally-adversarial cells
   prototyped + A/B'd: `arcane_binding × the_veilwood` (contract flavor in the strongest bloodline
   region) and `fated_blood × the_shackle_isles` (bloodline flavor in the strongest contract region).
   Both held flavor identity while expressing the region: Veilwood×AB read as a contract in an
   ancestral-forest register (ancestry as witness/backdrop); Shackle×FB read as bloodline-destiny with
   coercive pacts demoted to the instrument gripping the blood. In both OLD arms the region ate/blurred
   the flavor. Pattern validated, not just Vaelryn. (Lexical classifier proved unreliable for Shackle×FB
   — the pact-instrument shares "contract" vocab; the pass was confirmed by reading the obstacle.)

Now cleared to populate the full region×flavor matrix (~18 cells) on the same pattern.
