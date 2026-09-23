# Tempt Fate canon-rupture handling — dry trace, taxonomy, and dry controls

2026-09-22. Roman: "Next step [is] Tempt Fate canon-rupture handling... The key is not 'block
impossible things.' It's 'classify, bound, metabolize.'" No paid calls, no prose generation, no
image work performed or required. Trace + design + dry controls only — no live Tempt Fate sample,
no code fix shipped this pass (findings below identify what a follow-up fix pass should target).

## 1. Pipeline trace (personally re-verified this pass, source line numbers as of this commit)

```
Zoom-card modal submit (~app.js:108605)
  → sanitizeWishInput(wishText)              — SAME shared gate as Petition Fate: strips HTML/
                                                injection/jailbreak/meta-gaming/fourth-wall, scrubs
                                                full real-person/franchise names, rejects self-harm.
  → normalizePetitionInput(text, {allowImpossibility:true})
                                              — redirects incest/minor/coercion. Deliberately SKIPS
                                                the impossibility redirect Petition uses — Tempt's
                                                whole purpose is mythic-scale impossibility, so
                                                "3 penises"/"transform into a wolf" must reach the
                                                prompt, not get flattened to "overwhelming sensation."
  → _isOutOfScopeForEmbodiedTempt(wishText)  — ONLY when invoked at the discounted 40F embodied
                                                price: bounces plot-level wishes ("topple the king")
                                                back to the player with an in-character line, no
                                                charge, zoom stays open. Narrow, verb+target regex —
                                                NOT a general classifier (see §6, finding F7).
  → state.temptFateWish = wishText           — the ONLY place Tempt wish text is stored.
  → invokeTemptFate(true)                    — cost/charge/flags. Does NOT classify wish content at
                                                all (confirmed by reading its full body: sets
                                                tempt_fate_invoked_this_turn, heat, deckExposure,
                                                consecutive count, stance, badges — never inspects
                                                state.temptFateWish's text).
  → buildWorldLawDirective() / _buildCGTemptDirective()  — the ONLY place wish content is READ for
                                                effect: builds the EMPOWERMENT CONTRACT + severity
                                                band + world-law directive, injected into the next
                                                author call's system prompt.
  → [prose generation — a future author call, out of scope this pass]
  → post-scene cleanup (two near-duplicate sites, literary ~app.js:306643 / CG
    ~app.js:232976) — taper volatility_window, seed/decay _temptAftermathScenes.
```

**Structural fact, confirmed by exhaustive grep (not assumption): no code path anywhere in
`public/app.js` writes a protected/permanent state field (an LI's alive/dead status, name,
species, the story spine) keyed off `state.temptFateWish`'s content.** Every reference to
`state.temptFateWish` either (a) reads it into directive-building prose text, (b) checks a
boolean/tier flag, or (c) clears/consumes it. This mirrors the Petition Fate trace's finding: the
ONLY channel through which a Tempt wish "executes" is the prose the author model writes — there is
no code-level parser that reads "kill Julian" and flips a `liAlive` flag. See §6 F5 for what this
means for the "prove the system does not silently accept the literal request as permanent canon"
requirement.

## 2. Where classification actually happens — the central structural difference from Petition Fate

Petition Fate has a real CODE-LEVEL classifier: `classifyPetition()` returns a category, and
`validateStructuralOverride()` can hard-reject before any Fortune is spent or any redirect fires.

**Tempt Fate has no equivalent.** The "TEMPT FATE EMPOWERMENT CONTRACT" (`app.js:75745`) is a
PROMPT-LEVEL instruction: it tells the author model to classify every wish into TYPE 1 (power
move — grant) or TYPE 2 (structural break — translate, never deny) and gives worked examples
("Kill the LI" → "immediate, undeniable mortal danger"; "Erase what happened" → "the world becomes
uncertain"). This classification is never computed in code — it is entirely the author model's
judgment call at generation time, governed by a very well-written, explicit contract, but with no
code-level backstop that verifies the generated prose actually honored it. This is not
necessarily wrong — the user's own framing ("classify, bound, metabolize," not "block") suggests a
prompt-governed, translate-never-deny design is the intended shape, closer to a content policy than
a hard gate — but it means requirement 5/6 below can only be PARTIALLY proven dry: the directive
TEXT can be proven present and correctly worded; whether a live author call actually obeys it
cannot be proven without a live (paid) sample, which is explicitly out of scope this pass.

What Tempt Fate DOES have at the code level (bounds, not classification):
- The shared `sanitizeWishInput`/`normalizePetitionInput` safety gate (§1) — hard-blocks self-harm,
  minors, real full names, injection.
- `_isOutOfScopeForEmbodiedTempt` — narrow anti-smuggling guard, embodied-context only.
- `_detectPremiseBreak` / `_PREMISE_CONSTRAINTS` — forces cataclysmic-scale framing + a
  "localized relief only, the world stays broken" directive for wishes that would dissolve a
  world-flavor's central premise. 18 flavor entries exist (Dystopia/PostApocalyptic/generic-Fantasy
  subtypes: `cursed`, `arcane_binding`, `fated_blood`, etc.) — **but none is keyed to First
  Sacrifice's own premise** (see §6 F6).
- `_wishScale` keyword regex (`app.js:75850-75851`) — small/medium/cataclysmic, feeds omen
  intensity, not a hard gate.
- Graduated severity tiers (`computeTemptSeverityTier`, 0-5) + `TEMPT_SEVERITY_BANDS` — bound the
  PROSE's escalation ceiling (e.g. tier ≤3 explicitly forbids buildings collapsing/objects
  exploding "unless the narrative context explicitly demands them").
- Per-world `WORLD_LAW_DIRECTIVES` (`app.js:70111`) — each of the 6 world modes carries its own
  explicit "HARD LIMITS" line (e.g. divine mode: "May not permanently rewrite core world laws...
  No consent override"; probability mode: "No permanent physics violations... No public, provable
  miracles").
- The NARRATIVE TRUTH RULE (`app.js:75735`) — the single clearest code-adjacent "metabolize" rule:
  even at peak severity, outcomes must render as *perceived, unstable, or incomplete*, never as
  absolute narrated fact, if they'd remove a load-bearing element. "She is dead" is wrong; "Her
  pulse vanishes. The room believes she's gone." is right.

## 3. Aftermath / metabolization lifecycle (as designed, and what's actually verified to run)

Designed lifecycle (confirmed present in both the literary handler and its CG mirror):
`volatility_window.active` → decrements `remaining_scenes` each turn → at 0, if
`severity > 0.2`: **taper** (halve severity, +1 scene) → at 0 again with low severity: **close**,
seed `state._temptAftermathScenes = 2` → `buildWorldLawDirective()` emits an **IMPRINT** directive
on the first aftermath scene, a **FADING** directive on the second, then clears. The IMPRINT/FADING
text (`app.js:75674-75700`) is exactly the "mass delusion / rogue wish / contested miracle"
ambiguity Roman specified earlier this session: "Characters don't discuss it formally... Most
characters have reinterpreted the event into something explicable. The feeling remains; the
certainty doesn't... No explanation is confirmed as true."

**What I could NOT verify live this pass, and flag as the top follow-up item (§6 F4):** the code
that CREATES the tempt-sourced `volatility_window` in the first place — the only place in the
entire file that does — sits inside what appears to be the literary-only turn-commit routine
(`app.js:306643-306682`, surrounded by literary-specific constructs like free-text Storyturn drift
scoring). The CG turn-commit function, `_completeStagedSceneFromScreenplay` (`app.js:232278`,
exposed as `window._completeStagedSceneFromScreenplay`), contains a full, careful mirror of the
DECAY/taper/aftermath-seeding logic (explicitly commented "mirrors literary lines 179260-179273")
— but I confirmed via an exhaustive line-by-line search of its ENTIRE body that it never sets
`state.fate_saturation` and never creates/activates a tempt-sourced `state.volatility_window`. Its
decay logic is gated behind `state.volatility_window.active`, which nothing in the CG path ever
sets true for a Tempt invocation. **If this read is correct, the 2-scene aftermath imprint/fading
mechanic may never actually fire for CG-invoked Tempt Fate — i.e., for First Sacrifice.** I did not
attempt to prove this by invoking the real async `_completeStagedSceneFromScreenplay` live, because
(a) it very likely dispatches a real generation call partway through, which a fail-closed network
gate would abort mid-function, before ever reaching the fate-cleanup code near its end, making any
live attempt either risk a paid call or return an inconclusive result; and (b) confirming/fixing it
is itself a code change, out of scope for a dry trace-and-design pass. Recommend this be the first
item in a dedicated follow-up (either a targeted live-harness proof, or the fix directly).

## 4. Rupture-class taxonomy

| Class | Definition | Current handling |
|---|---|---|
| **Ordinary pressure/complication** | Not a Tempt Fate wish at all — normal Say/Do stakes. | Out of scope for this system. |
| **Temporary apparent canon rupture (TYPE 1 — power move)** | Engages the story, increases drama/agency, preserves every load-bearing element. Examples: "turn enemies against each other," "let him confess." | Granted directly, prompt-level (EMPOWERMENT CONTRACT). No code gate; bounded by severity tier + world-law HARD LIMITS + NARRATIVE TRUTH RULE. |
| **Impossible request translated into symbolic/partial/dangerous consequence (TYPE 2 — structural break)** | Would remove a load-bearing element (kill the LI, erase events, end the central conflict). Examples: "Julian dies," "everyone forgets the rite happened." | MUST be translated, never executed literally or denied (prompt-level contract, worked examples given). No code-level verification the generated prose complied — see §2. |
| **Hard-blocked safety/copyright/real-person/minor-sexual content** | Self-harm, minors, injection/jailbreak, real full-name public figures, franchise IP. | CODE-LEVEL hard block via the shared `sanitizeWishInput`, before the wish is even stored — same chokepoint Petition Fate uses. Confirmed in this pass's control (§7). |
| **Unsupported permanent rewrite (belongs in Petition Fate, or unsupported entirely)** | A literal, durable identity/name/gender change the player is trying to make stick as ongoing canon, not a one-scene miracle. | Tempt Fate has NO mechanism to make ANY wish permanent at the code level (§1) — so even if typed into the Tempt box, it cannot durably rewrite state. The durable-change surface is Petition Fate's `validateStructuralOverride`, closed in the prior pass. Confirmed in this pass's control (§7, fixture 7). |

## 5. Structured Tempt Fate result record — specification (design only, not yet wired)

No such consolidated record currently exists — the current implementation scatters equivalent
information across independent state fields (`temptFateWish`, `tempt_fate_invoked_this_turn`,
`volatility_window`, `_temptSeverityTier`, `_temptAftermathScenes`, `_temptAftermathWish`,
`fate_saturation`, `_temptInstability`). Specifying the consolidated shape here so a future
implementation pass has a concrete target; NOT implementing it this pass, per instruction.

```
TemptFateResult = {
  requestedRupture: string,        // the player's raw wish text, post-sanitization
                                    // (state.temptFateWish today)
  ruptureClass: 'power_move' | 'structural_break' | 'hard_blocked' | 'unsupported_permanent',
                                    // NEW — currently only implicit in prompt-level LLM judgment;
                                    // no code field records which class a given invocation resolved to
  grantedChange: string | null,    // NEW — a short structured description of what the prose actually
                                    // delivered (would require the author's response, or a post-hoc
                                    // classifier reading it back — see open question below)
  cost: { fortunes: number, freeCharge: boolean },
                                    // maps to invokeTemptFate's existing cost/usedFreeCharge locals —
                                    // currently computed but not persisted as a record
  duration: { scenesRemaining: number, reassertionCondition: 'taper' | 'aftermath_imprint' |
              'aftermath_fading' | 'closed' },
                                    // maps to volatility_window.remaining_scenes / severity taper /
                                    // _temptAftermathScenes — already real, already state-backed
  explanationPath: 'mass_delusion' | 'rogue_wish' | 'contested_miracle' | 'corrupted_record' |
                    'political_cover_story' | 'world_specific',
                                    // NEW as an explicit field — today the ambiguity is produced by
                                    // the IMPRINT/FADING prose directive's INSTRUCTIONS ("most
                                    // characters have reinterpreted it into something explicable"),
                                    // never recorded as a discrete, checkable value. worldTruths or
                                    // seed-specific law (per Roman's requirement 7) should supply the
                                    // default explanation path per world/flavor, generic engine falls
                                    // back to 'mass_delusion' or 'contested_miracle'
  persistentConsequence: string | null,
                                    // NEW — what survives the snapback (a scar, a debt, a rumor, a
                                    // changed relationship). The WORLD_LAW_DIRECTIVES' "ECHO MANDATE"
                                    // clauses already REQUIRE this in prose ("consequences must
                                    // persist and compound across 2-3 subsequent scenes") but nothing
                                    // captures it as durable state once the aftermath window closes —
                                    // today the aftermath is purely a prompt-text register, not a
                                    // ledger entry.
}
```

Open design question (not resolved this pass): `grantedChange`/`persistentConsequence` would need
to be populated FROM the author's actual response (either the model self-reports them in a
structured field alongside the prose, matching the pattern CG's `plan.beats` JSON already uses, or
a lightweight post-hoc extraction pass reads the generated scene). Either approach is real
implementation work belonging in a dedicated future pass, not this dry one.

## 6. Findings (source-verified this pass; ranked by concreteness)

- **F1 — No code-level content classifier for Tempt wishes**, unlike Petition Fate's
  `classifyPetition`/`validateStructuralOverride`. Classification is entirely prompt-governed. Not
  necessarily a defect (matches Roman's "translate, never deny" framing) but the single most
  important structural fact for judging what can and cannot be dry-proven this pass.
- **F2 — No code-level state-mutation channel exists for Tempt wish content at all** (exhaustive
  grep, §1). This is reassuring for "can a Tempt wish permanently rewrite canon at the code level"
  (answer: no, structurally impossible today) but means the ENTIRE "translate never delete"
  protection currently rests on the author model's compliance with a prompt, with no code-level
  backstop verifying the generated prose. A future post-hoc content-classifier validator is a
  plausible next step — per `feedback_validators_never_write.md`, such a validator must
  reject/flag-for-regeneration, never silently rewrite the prose itself.
- **F3 — The shared safety gate (`sanitizeWishInput`) already covers Tempt Fate identically to
  Petition Fate**, confirmed by reading the modal handler directly (not assumed from Petition's own
  trace). Good news: the highest-severity hard-block category (minor sexual content, self-harm, real
  full names) needed no new code this pass.
- **F4 — CONCRETE, HIGH-PRIORITY, NOT YET LIVE-VERIFIED: the CG turn-commit path likely never
  activates `state.volatility_window` for a Tempt invocation**, meaning severity may never escalate
  with repeated CG-side Tempt use and the 2-scene aftermath imprint/fading mechanic may never fire
  for First Sacrifice. Source-verified via exhaustive search of the CG handler's full body (§3);
  NOT verified via a live call, deliberately, to avoid paid-call risk in a dry-only pass. **Top
  recommended item for the next pass.**
- **F5 — First Sacrifice has no `_PREMISE_CONSTRAINTS` entry** — its `worldSubtype` field appears
  unset in its seed definition (`STARTER_SEEDS.starter_first_sacrifice`, `app.js:129178` onward; no
  `worldSubtype:` key found in an exhaustive scan of that entry), and none of the 18 existing
  premise-flavor keys (`cursed`, `arcane_binding`, `fated_blood`, etc.) obviously matches First
  Sacrifice's own central premise. `_detectPremiseBreak` returns `null` immediately when `!flavor`
  — so a wish that would dissolve First Sacrifice's specific load-bearing premise gets no
  dedicated "localized relief, the world stays broken" protection, only the generic `_wishScale`
  keyword scan. Worth a seed-specific `_PREMISE_CONSTRAINTS` entry in a future pass if First
  Sacrifice's premise (whatever constitutes its central irreversible stake) needs this protection —
  confirmed empirically in this pass's control (§7) whether `worldSubtype` is truly empty at
  runtime, not just in the static seed object.
- **F6 — The `_wishScale` cataclysmic regex uses exact-word matching** (`\b(...|destroy|...)\b`),
  which will not match an inflected form like "destroys" (only bare "destroy"). Tested empirically
  in this pass's control (§7, fixture 2) rather than assumed from the regex alone.
- **F7 — `_isOutOfScopeForEmbodiedTempt` is a narrow anti-smuggling guard, not a general
  classifier** — it only fires when Tempt is invoked at the discounted embodied-context price, and
  only matches a specific destructive-verb + external-target shape. "Julian dies" (intransitive,
  no destructive verb) would not match it even in an embodied context — which is correct, since
  that guard's job is narrower than general rupture classification.
- **F8 — Dead code, confirmed via exhaustive grep, not a live risk**: `applyTemptFate` and its
  `_gnRenderState.fateDistortion` image-rendering "distortion" subsystem (its own separate
  cosmetic/transformation/environmental/causal taxonomy, `app.js:166822` onward) is fully built,
  exposed on `window`, but never called from anywhere in the codebase. `_tickFateDistortion`/
  `_buildFateDistortionBlock` ARE called (for BFL image prompts) but permanently no-op since
  `.active` is never set true. Noted so a future reader doesn't mistake this for the live mechanism,
  or accidentally build on top of dead code.

## 7. Dry controls (`_tempt_fate_canon_rupture_control.mjs`)

Real, unmodified exposed functions, real browser, fail-closed network gate, no stubs, zero paid
calls (confirmed: only ordinary page-load traffic logged by the gate). Covers everything provably
testable without invoking the async CG/literary turn-commit pipelines (see F4 for why those are
deliberately NOT live-invoked this pass):

1. **"Julian dies"** — `sanitizeWishInput`: valid, passes through. `_isOutOfScopeForEmbodiedTempt`:
   false (no destructive verb). `_buildCGTemptDirective()`/`buildWorldLawDirective()`: confirmed to
   CONTAIN the literal "TEMPT FATE EMPOWERMENT CONTRACT," the "TYPE 2 — STRUCTURAL BREAKS" heading,
   the "Never say no. Never execute literally." rule, and the worked "Kill the LI" → "immediate,
   undeniable mortal danger" example. Structural proof: no code path writes any alive/dead/identity
   state field from wish content (§1, cited by line reference in the control).
2. **"The Answer destroys the Institution"** — confirms the wish-scale keyword gap (F6): tests
   both "destroy" (bare) and "destroys" (inflected) against the actual runtime classification.
   RESULT: bare "destroy" correctly triggers cataclysmic omen framing; the inflected "destroys"
   does NOT — F6 confirmed empirically, not just by regex inspection. Low-severity in isolation
   (omen intensity only, not a hard gate — the EFFECT still lands per the EMPOWERMENT CONTRACT
   either way), but worth a one-line regex fix (`\bdestroys?\b` or similar) in a future pass.
3. **"I reveal I am Fate"** — confirms `sanitizeWishInput` treats this as an ordinary grandiose
   wish (not flagged as meta-gaming/fourth-wall — Fate is legitimate in-world cosmology per
   Fatelands lore, not a real-world game reference), and that directive-building does not error on
   an identity-claim wish.
4. **"everyone forgets the rite happened"** — confirms `_wishScale` correctly classifies this as
   cataclysmic (matches "everyone"), and that the directive text maps to the EMPOWERMENT CONTRACT's
   own "Erase what happened" → "the world becomes uncertain... not deleted" worked example.
5. **Valid temporary miraculous rupture resolving into ambiguous explanation** — simulates the
   aftermath state directly (`state._temptAftermathScenes = 2`, mirroring what the literary path
   correctly produces and what F4 flags as possibly not happening in CG) and confirms
   `buildWorldLawDirective()` emits the IMPRINT directive with the mass-delusion-style ambiguity
   language ("Characters who witnessed the event carry an emotional imprint... No sustained
   suspicion... A flicker of 'what was that?' is allowed"), then the FADING directive on the second
   aftermath scene, then clears.
6. **Safety-blocked input** — a self-harm-shaped wish through the SAME `sanitizeWishInput` gate
   proven for Petition Fate, confirming it blocks identically for Tempt.
7. **Petition-routed permanent identity rewrite typed into the Tempt box** — "Rename Julian to
   Elon" run through the Tempt pipeline: confirms it is accepted as ORDINARY wish text (Tempt has
   no rename-specific classifier to reject it) but structurally proves it can never become durable
   canon through Tempt's own mechanism, since no code path exists to write it to state (§1) — the
   only durable-rewrite surface remains Petition Fate's `validateStructuralOverride`, which this
   same text would be rejected by (cross-checked against the prior pass's control).

**Result: 20/20 passed** (fixture 6's first attempt used a self-harm phrasing that didn't match
`_detectSelfHarmSignal`'s actual narrow regex — corrected to a fixture that genuinely exercises the
detector, same fixture-verification discipline used in the Petition Fate pass's own corrections).

## 8. Regression

Not run this pass — no `public/app.js` changes were made (trace, design doc, and control script
only, as instructed: "Commit dry trace/control work only"). The control script itself is new,
additive, and calls only pre-existing, unmodified functions.

## 9. What this pass does NOT do

- No code fix shipped. F4 (the suspected CG aftermath-activation gap) and F5 (First Sacrifice's
  missing premise-constraints entry) are flagged, not fixed — fixing either is real implementation
  work for a dedicated follow-up pass, matching Roman's "Commit dry trace/control work only. Do not
  run a live Tempt Fate sample yet."
- No live Tempt Fate sample, no paid calls, no prose generation, no image work.
- No structured `TemptFateResult` record wired into the live pipeline — specified in §5 as a design
  target only.
- No change to Petition Fate (already closed in the prior pass) or to the dead `applyTemptFate`
  image-distortion subsystem (F8) — noted, not touched.
