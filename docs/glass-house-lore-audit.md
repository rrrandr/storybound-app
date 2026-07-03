# Glass House — Chorus Lore Consistency Audit

**Guiding philosophy (Roman):** Glass House is *civilization adapting to a permanent miracle*, not "everyone crying all the time." Baseline = quiet awe / continuous gentle tears, calm faces, ordinary lives. Not post-apocalyptic. Not oppression.

**Verdict:** ~85% of this vision is **already canon and hard-enforced**. The physiology, the tear patches, the "functioning modern civilization" tone, and the "quiet awe not misery" baseline all exist and are heavily reinforced (including in the render pipeline). The real work is **(a) killing four legacy blocks that contradict the bible and get injected into prompts**, and **(b) adding lived-in social etiquette**, which is the one genuinely thin area.

---

## 1. What already exists (strong — do NOT rebuild)

**Tears physiology — fully canonized, gentle-not-sobbing.** Every reference frames tears as *continuous, physiological, calm, NOT emotional, NOT distress*:
- `app.js:12961-12968` WORLD_BIBLE "TEAR MANAGEMENT" — "continuous physiological tears — not emotional, not suppressible."
- `app.js:146665-146668` staged identity — "a CONSTANT GENTLE STREAM OF TEARS … faces remain calm or softly happy … the somatic bleed-through of neurochemical bliss."
- `app.js:132616-132625` / `246700-246702` render trait anchor — "always present, never optional … NOT people crying." Bans "exaggerated crying, distorted faces, melodrama."

**Tear patches — your belief is correct, they're canon (two named tiers).**
- `app.js:12964` CLEAR PATCHES — "Ultra-thin absorbent strips … Ubiquitous and normalized — analogous to bandages or skincare patches."
- `app.js:12965` HIGH-PATCHES — "stylized variant … Colored, tinted, or subtly luminous … personal expression, fashion, or mood signaling."
- `app.js:12966-12967` guardrails — "NOT mandatory … background-normal, not foreground-mechanical … Do NOT frame patches as treatment, cure, or medical intervention."
- Image alias registry `app.js:132916-132924` literally registers `'tear patches'` as an alias.
- Covered variants: clear/cosmetic ✓, fashion/luxury ("High") ✓. **Missing: athletic, children's.**

**Tone — "civilization continues" is explicit and enforced.**
- `app.js:12861` "Society is modern and functioning — cities resemble present-day cities."
- `app.js:12884-12887` environments = "apartments, cafés, trains, universities, offices, parks … Do NOT default to dystopian streets."
- `app.js:12506-12509` FLAVOR_HARD_CONSTRAINTS REQUIRES/FORBIDDEN — bans "authoritarian surveillance states … implanted empathy chips … If dystopian ruin tropes appear, flavor enforcement has failed."
- `seeds/glass-house-demo.js:95-98` strongest statements — "never frame Chorus as oppression … opt-in and beloved … they are happy … Glass House looks like the present-day modern world plus tear-streaked, patch-wearing happy people."

**Emotional baseline — "quiet awe" is the canon pole.**
- `app.js:12934` "NO judgement, NO jealousy, NO anger inside The Chorus … witnessing-without-evaluation."
- `app.js:160680` "feel WITNESSED, lovingly, by a million people … the GIFT of Chorus-state."
- `app.js:12866` "Grief is witnessed, not erased." No "hysteria/breakdown" framing exists anywhere.

**Render pipeline — the visual signature is a hard, style-overriding anchor.** `buildChorusTraitAnchor` (`app.js:132602-132632`) + a twin block at `246696-246706`, both citing `GlassHouse-ChorusAnchor.jpg` as authoritative, with REJECTION CRITERIA ("Reject if tears missing/minimal/decorative, or if effect reads as emotional crying"). Tears + pinprick pupils are enforced; patches are deliberately optional.

**Bible injection map** (so edits land in the right place):
| Block | Location | Role |
|---|---|---|
| `WORLD_BIBLE.glass_house` | app.js:12858 | Full bible (Scene 1 / Tier 1) |
| `GLASS_HOUSE_ANCHOR` | app.js:12979 | Compressed anchor (later turns) |
| `FLAVOR_HARD_CONSTRAINTS.glass_house` | app.js:12507 | REQUIRES/FORBIDDEN |
| `SYSTEMIC_PRESSURE_LINES.glass_house` | app.js:12488 | One-line "World Pressure" |
| `DYSTOPIA_FLAVORS.glass_house` | app.js:12308 | UI taxonomy + narrativeHook |
| `DYSTOPIA_FLAVOR_EFFECTS.glass_house` | app.js:120560 | Directive-layer "effect" line |
| `_diegeticNamingDirective` (glasshouse) | app.js:160641 | OAS intimacy naming rules |
| `the_chorus`/`clear_patches`/`high_patches` | app.js:132911 | Image overlays |
Concatenated via `getWorldRegistryEntry` (`app.js:13024-13056`) and the PRIMARY WORLD LENS builder (`app.js:123506-123525`).

---

## 2. Inconsistencies — FOUR legacy blocks contradict the bible AND get injected (the real bugs)

These directly pull tone toward the dystopian/hive pole the bible forbids. All four are live in prompts.

**I-1 — `DYSTOPIA_FLAVORS.glass_house` narrativeHook (`app.js:12312`).** Uses the exact things canon BANS:
> "**Neural implants** bind humanity into a shared field of sensation … Nothing is yours. To love privately, you must disconnect — and **disconnection is agony**. The most dangerous act is wanting someone for yourself."
Contradicts `12864` ("not an implant, not a chip, not hardware") and the FORBIDDEN list ("implanted empathy chips"). **This is the worst offender.**

**I-2 — `DYSTOPIA_FLAVOR_EFFECTS.glass_house` (`app.js:120560`), injected at `13049`.**
> "…Love becomes dangerous because **privacy becomes deviance**." — criminalizes privacy; dystopian register, not "socially marked."

**I-3 — `SYSTEMIC_PRESSURE_LINES.glass_house` (`app.js:12488`), injected as the World Pressure anchor.**
> "**You will never love alone — you will love us.**" — reads as hive-coercion ("you will love us"), at odds with "opt-in and beloved." (Tonal call — see proposed reframe.)

**I-4 — Sample intimacy register lines (`app.js:159230-159231`, `159420`).**
> "The Chorus is reading us… **Synchronize with me** anyway." / "**Resonance — there — yes. Let the signal go where it will.**"
These violate the OAS speech-register hard-constraints at `160645-160746` (which BAN techno-jargon like "sync your signal"). Internally self-contradictory sample lines.

**Structural flag (not necessarily a fix):** Glass House is filed under the `DYSTOPIA_FLAVORS` / `world:'dystopia'` taxonomy. The bible insists it's *not* dystopian. The category name is cosmetic/internal, but it's why the legacy dystopian framing keeps leaking in. Worth a naming rethink later; out of scope for this pass.

---

## 3. Concrete lore ADDITIONS (the genuinely thin areas)

**A-1 — Everyday etiquette microbeats (the main gap).** The *principle* of normalization exists ("not commented on unless relevant"), but zero concrete lived-etiquette. Add an EVERYDAY ETIQUETTE section to the bible:
> Tears are the default, so no one asks "why are you crying" — it is DRY eyes (a Solo) that draw a second glance. Offering someone a fresh patch is a small courtesy, like offering a mint. Wiping another person's tears with your thumb is reserved, unexpectedly intimate — a thing you do for someone you're close to. Public spaces quietly accommodate: patch dispensers by the door like hand-sanitizer, the soft "kind light" restaurants use to mute the shine on wet cheeks, matte napkins on every table. None of it is remarked on; it is simply how the world is.

**A-2 — Patch sub-variants.** Extend the patch canon (and the image alias registry) to include:
> everyday clear/skin-tone; expressive High-Patches; **athletic** wick-and-stay versions for sport and heat; **children's** patches in playful prints (people grow up wearing them); premium/designer lines. Background-normal, never foreground-mechanical.

**A-3 (optional) — "luminous eyes."** You mentioned it in the brief; it does NOT exist (the render vocab is "wet specular highlights," and "luminous" applies only to high-patches). Only add if you want it as an eye trait — otherwise leave, since the tears already carry the visual signature.

---

## 4. Prompt updates required (specific edits, with proposed text)

Each is a targeted string replace; none touch prose scenes.

- **I-1** `app.js:12312` — rewrite narrativeHook to the empathic-field framing (no implants; Solo is *marked*, not *agony*; tension = "can being chosen matter when everyone already understands you"). Also soften `12311` uiDescription.
- **I-2** `app.js:120560` — rewrite the effect line: exclusive love as the quiet rebellion against universal understanding; Solo socially marked, never criminal.
- **I-3** `app.js:12488` — reframe the pressure line (proposed: *"In The Chorus you are understood by everyone at once — so is being chosen by one person still enough?"*). Tonal; your call between keeping edge vs. removing coercion.
- **I-4** `app.js:159230-159231`, `159420` — replace techno-jargon sample lines with canon-register examples (modern English, sparse nouns), e.g. *"Close the aperture. Just us tonight."* / *"I don't want to share this. Is that terrible?"*

## 5. World bible edits required (additions)

- Add **EVERYDAY ETIQUETTE** section (A-1 text) into `WORLD_BIBLE.glass_house` near the TEAR MANAGEMENT block (`app.js:12961`), and a one-line compression into `GLASS_HOUSE_ANCHOR` (`app.js:12979`).
- Extend the patch lore (A-2) at `app.js:12964-12967` and add `athletic_patches` / `kids_patches` aliases to the image registry (`app.js:132916`).
- Optionally mirror the etiquette one-liner into `seeds/glass-house-demo.js` hardConstraints so the CG demo carries it.

---

## STATUS (2026-07-03) — applied vs held
**APPLIED** (cache `20260703-glasshouse-chorus-lore`, syntax-checked):
- **I-1** `app.js:12311-12313` — narrativeHook/uiDescription/eroticEngine rewritten to the empathic-field framing (no implants; Solo marked-not-agony; "exclusive love vs universal understanding").
- **I-4** `app.js:159230-159231` + `159420` — techno-jargon peak lines replaced with canon-register modern English ("The whole Field can feel us. I only want you to." / "Leave the aperture open — let all of them feel what you do to me." / "Open — all the way open. Let the whole Field feel this.").
- **A-1** EVERYDAY ETIQUETTE section added to `WORLD_BIBLE.glass_house` (after TEAR MANAGEMENT ~12968) + compressed clause into `GLASS_HOUSE_ANCHOR` (~12981).
- **A-2** PATCH LINES (athletic/children's/premium) added to the bible (~12965) + `athletic_patches`/`kids_patches` aliases in the image registry (~132924).

**I-2 APPLIED** (2026-07-03, cache `20260703-glasshouse-chorus-lore-2`) — real site was `app.js:120564` (`DYSTOPIA_FLAVOR_EFFECTS.glass_house`), "privacy becomes deviance" → "Exclusive love runs against the grain of universal understanding… Solo is socially marked, never criminal."

**I-3 KEPT AS-IS** (Roman's call — keep "You will never love alone — you will love us." for its seductive edge).

**CHORUS-CONNECTION CANON extended** (Roman, same pass): children are NOT Chorus-connected → children's tear patches REMOVED (bible PATCH LINES, anchor, `kids_patches` image alias all deleted; patch-wearing begins at adolescent alignment). Exclusions block (`app.js:12889-`) extended with the **overwhelm/taint mechanism**: a chaotic mind doesn't just fail to mesh — it bleeds into and OVERWHELMS the field, tainting others, while feeling no connection back (one-way drain). Added: psychedelic states (excluded, with sleeping/dreaming); CERTAIN PSYCHOPATHY/SOCIOPATHY (predatory noise, overwhelms without feeling back); and the **NOTABLE INCLUSION — DEMENTIA/ALZHEIMER'S** (CAN connect — forgetting is gentle, doesn't overwhelm; "forgets your name but never the warmth"). Deciding rule = does the mind OVERWHELM others, not whether it's "impaired."

## Recommendation
The **four inconsistency fixes (I-1…I-4)** are the high-value, near-objective part — they're active contradictions of the canonical bible, so aligning them is low-risk cleanup. I-1 and I-4 are clear-cut; I-2 and I-3 are mildly tonal (the pressure-line wording especially — worth your ear). The **additions (A-1, A-2)** are pure enrichment in the bible's established voice. Nothing here rewrites a single prose scene — it's all world-law and prompt text.
