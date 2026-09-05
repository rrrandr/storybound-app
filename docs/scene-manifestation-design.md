# Scene Manifestation Layer — Architecture Design

**Status:** design (no code). Roman + Claude, 2026-07-25.
**Origin:** the consumption-funnel pilot (`_consumption_probe.js`, N=5) established that character bibles are **not payload-starved** — the opposite. The planner emits **~40 execution hooks per major character**; a typical Scene 1 affords a natural moment for **1–7**. Only 9% of emitted hooks even had an *opportunity* to surface, and of those only ~22% were *performed* and ~6% *memorable*. The blind "what will you remember about this character tomorrow?" readout was dominated by a template prop and plot beats — almost none of the 40 hooks reached reader memory.

**Therefore:** the fix is not more payload and not "spend harder." It is a **selection layer** — the planner becomes an editor that decides *which existing traits this specific scene naturally invites*, and hands the author a short, focused set. This is a **narrative-selection** problem, not summarization and not invention.

---

## The load-bearing principle: opportunity-driven, never plot-driven

The single failure mode that would ruin this layer is **author puppeteering** — selecting traits because the *plot* needs them ("Jessi becomes an ally, so suppress vanity, highlight charity"). That produces characters who bend to the story instead of people whose personalities collide with it.

**The firewall is structural, not just instructional:** the selector's input **physically excludes** plot goals, arc outcomes, antagonist plans, and "what this character becomes." It sees only three things — the character's traits, the scene's *situational* conditions, and the relationship register. It cannot puppeteer toward an outcome it cannot see.

The selector's question is never *"which traits should appear?"* It is:

> **"What opportunities does this scene naturally create, and which of this character's existing traits answer that invitation?"**

Opportunity → compatible trait(s) → one behavior. Plot need never enters.

### Scene truth is allowed; plot truth is not (the refined firewall)

The firewall excludes *plot* objectives, **not** *scene* objectives — they are different, and starving the selector of the scene's purpose would leave it surfacing traits with nowhere to land. A "persuasion scene / she needs to convince him to stay" is scene truth the selector **must** know; "she becomes the ally in Act III" is plot truth it must never see.

| **Allowed input (scene truth)** | **Forbidden input (plot truth)** |
| --- | --- |
| scene pressure / emotional temperature | future twists |
| relationship register | hidden reveals |
| interaction type (confrontation, seduction, negotiation…) | eventual role / who-becomes-what |
| conversation purpose / scene objective | plot destination |
| setting, witnesses, opportunity conditions | arc requirements |

### Output is behavioral OBJECTIVES, not trait labels

Authors don't write traits; they write moments. The manifest must emit **directly-writable behavioral objectives**, never labels:

- ✗ `Behavior: vanity` → ✓ `Behavior: before speaking, unconsciously find a way to display status`
- ✗ `Pressure: insecure` → ✓ `Pressure: when embarrassed, redirect attention toward appearance or social standing`

The second is something a novelist can execute in the next sentence. The first is a crossword clue.

### **Manifest behaviors are OBLIGATIONS, not suggestions**

This is the line that keeps the manifest from becoming one more ignored planning artifact. If the manifest says *"every compliment should carry a subtle status move"* and the character has ten lines, **at least one or two must actually do it.** The author-facing block states this in those terms — the manifest is a director's blocking, not a menu.

---

## Core model

### Traits are context-sensitive, organized in three activation layers

Rather than a flat list of 40, every behavioral hook is understood as conditional, on one of three layers (this maps cleanly onto the manifest's fields and onto scene pressure):

- **Layer 1 — Baseline grain.** The 1–2 traits that color *almost every* scene (sarcasm, shyness, meticulousness). Manifest regardless of conditions — they *are* the character's default register.
- **Layer 2 — Situational.** Traits that need a matching trigger (vanity, charity, bravery, jealousy). Activated only when the scene supplies the condition.
- **Layer 3 — Pressure/stress responses.** Traits that surface only under duress (drinks, lies, freezes, lashes out). Activated only when the scene is high-stress — which the compressed A-plot's pressure line already tells us.

This is not a rigid taxonomy to force onto every character; it's the *lens* the selector reasons with. A given character may be thin in one layer.

### The pipeline

```
Character hooks (layered)  +  Scene situational conditions  +  Relationship register
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                                 │
        (1) OPPORTUNITY DETECTION                         │  (plot goals/outcomes
            what does THIS scene invite?                  │   are NOT an input —
            [public scrutiny · status-competition ·       │   the firewall)
             visible-suffering · danger · intimacy ·      │
             temptation · moral-dilemma · confrontation · │
             idle-waiting]  ← blind to plot               │
                        ▼                                 │
        (2) TRAIT MATCHING                                │
            Layer-1 always + Layer-2 whose trigger the    │
            opportunities satisfy + Layer-3 iff high-     │
            pressure. Filtered THROUGH the relationship   ◄─┘
            register (same trait, different face).
                        ▼
        (3) MULTI-TRAIT COMPOSITION
            cluster COMPATIBLE activated traits; compose ONE
            behavior per cluster that reveals several at once.
                        ▼
        SCENE MANIFESTATION (2–4 shapes: visual / behavioral / speech / pressure)
```

---

## Answers to the eight design questions

**1. What information should the layer receive?**
- The character's behavioral hooks from the bible, **tagged by activation layer** (see Q5) — identity/appearance stays in the bible, untouched.
- The scene's **situational conditions**, drawn from data Storybound *already computes*: the scene skeleton's setting (public/private, crowd/intimate), the opening temperature (HOT/crisis vs calm), witness presence, and the **compressed A-plot's `pressure_sentence` / `emotional_consequence`** (the crisis *texture*) — **never its `goal` / `antagonistOrAntiForce` / arc fields.**
- The **relationship register** for each present pairing (ally · rival · love-interest · stranger · authority · dependent), from `pairDynamic`/romanceEngine for the PC–LI pair and NPC role otherwise.
- The **scene objective / interaction type** (persuasion, confrontation, seduction, rescue…) — *scene* truth, allowed and needed (see the firewall table above).
- **Explicitly excluded (the firewall):** *plot* truth only — future twists, hidden reveals, eventual role, plot destination, arc requirements. Scene objectives are NOT excluded.

**2. Algorithm to choose 2–4 behavioral manifestations.**
Opportunity-first, four steps: (a) map the scene's conditions to a small fixed **opportunity vocabulary**; (b) activate traits — Layer 1 always, Layer 2 whose triggers the opportunities satisfy, Layer 3 iff the pressure line reads high-stress; (c) **cluster compatible** activated traits; (d) compose one multi-trait behavior per cluster, capped at 2–4 total across visual/behavioral/speech/pressure. Ranking within (d) is by **trait-density** (how many compatible traits one action reveals) — deliberately *not* by plot relevance.

**3. How to prevent plot-driven characterization.**
Three redundant guards: (i) the **input exclusion** above — the selector never sees plot need; (ii) a hard selector rule: *"choose what the situation invites; you do not know and must not consider what this character becomes later";* (iii) a reject test — if a selection is only justifiable by "the story needs it," drop it. Opportunity→trait resonance is the *only* legal justification.

**4. How to detect opportunities inside a scene.**
Mostly a **re-read of existing scene metadata** into a fixed ~8–10-item opportunity vocabulary (public-scrutiny, status-competition, visible-suffering, physical-danger, intimacy, temptation, moral-dilemma, confrontation, idle/waiting, ceremony/formality). Because opening-temperature, crowd-presence, intimacy level, and the pressure texture are already computed, opportunity detection is cheap — near-deterministic classification, not fresh generation.

**5. Trigger metadata vs activation layers vs other.**
**Both, done cheaply and once.** At bible-generation (once per story, negligible cost, amortizes to nothing) enrich each behavioral hook with `{layer: 1|2|3, trigger: "<short condition phrase>"}`. That makes per-scene selection a transparent, partly-deterministic **match** (scene-opportunities ∩ trait-triggers) instead of re-deriving triggers every scene. The 3-layer tag doubles as the manifest's structure. We do **not** hand-author a global trigger ontology — the triggers are inferred per character at bible time from that character's own traits.

**6. How to prefer multi-trait behaviors.**
Composition explicitly prefers **one action expressing a cluster of 2–3 *compatible* traits** — "Jessi donates $10,000, then lingers just long enough to be sure everyone saw" (charity + vanity + status in a single beat) beats two separate single-trait beats. Compatibility = traits that admit a single plausible action without self-contradiction (vanity+charity: yes; cowardice+bravery: no). Cluster first, then compose; score by trait-density.

**7. What the payload to the author looks like (v1 = priority, not hide).**
Two ranked blocks, per character:

```
SCENE MANIFESTATION — HIGH PRIORITY (perform these; they should visibly emerge this scene)
  Visual:    straightens the designer jacket a half-beat before she speaks
  Behavior:  performs generosity — but only where it will be seen
  Speech:    compliments that quietly establish she is the superior one
  Pressure:  laughs off the embarrassment, then changes the subject fast
CHARACTER BIBLE — REFERENCE ONLY (global truths; do NOT express unless it naturally arises;
  items already covered by the manifest above are removed to avoid competition)
  … remaining, de-duplicated hooks …
```

Each manifestation is a **behavioral objective, phrased as a writable moment** (see the principle above) — a shape to build from, not a line to copy — and it is an **obligation**: the block tells the author these must visibly land. Redundancy is the *only* thing hidden in v1: a hook the manifest already spotlights is dropped from the reference block so the two don't compete.

**Scope (v1 blast radius):** the layer runs on **PC, LI, antagonist, and one major recurring NPC only** — never universal. Every other character is left exactly as today. If v1 works, expand; if it doesn't, the damage is contained to four characters behind an off-by-default flag.

**8. Integration without significant token increase.**
**Token-neutral to negative, and no new model pass:**
- Layer-tagging folds into the **existing** bible-generation call (once/story).
- Per-scene selection folds into an **existing** scene-planning pass (the Scene-1 compressor / scene skeleton already run) — no new call, so no new per-scene cost, consistent with the closed cost thread (setup is ~1¢/scene amortized).
- The manifest is ~4 short lines/character; demoting the 40-hook dump to a de-duplicated "reference only" block (v1) is roughly wash; the later hard-hide (v2) makes it a net **reduction**.

---

## Rollout — isolate one variable at a time

1. **v1 · Attention experiment (build first).** Full bible retained, manifest elevated to HIGH PRIORITY, remainder demoted to REFERENCE-ONLY with redundancy removed. Changes exactly one variable: **attention/priority**. Behind a default-OFF flag; A/B on the consumption funnel's *memorable* rate + the blind reader-memory readout, split Fatelands vs Modern.
2. **If v1 shows no lift →** the author prompt isn't honoring priority. The problem is the **author prompt**, not information volume — stop; do not hard-hide (it wouldn't have helped).
3. **If v1 lifts →** keep it. Only then test **v2 · hard-hide** to see whether the remaining bible is *actively* hurting (removing it should add little if v1 already worked — that's the informative comparison).
4. The Fatelands-vs-Modern split in the A/B doubles as the first read on the separate **modern-voice** question: if the manifest lifts Fatelands but not Modern, modern authoring has a deeper externalization problem the manifest can't fix, and that graduates to its own investigation.

**Design north star:** characters should feel like consistent people whose personalities *emerge from circumstance*, not NPCs picking from a checklist. Every mechanism above serves that — the opportunity-first firewall most of all.
