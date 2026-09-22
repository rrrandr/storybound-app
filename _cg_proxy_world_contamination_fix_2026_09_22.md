# CG Proxy-Action World-Contamination Fix (2026-09-22)

Roman, after Temptation attempt 11 (the first real, fully successful authored continuation
sample): "the coffee leak matters. That's not a prose taste issue; it's a world-contamination
issue in `pc_proxy_action` scaffold fields... Do not hard-code only 'coffee'; add a small
protected-modern-object guard with tests, and make it world-gated so modern stories are
unaffected." Instruction: trace the source, decide whether it's a template/model/stale-state/
author-side issue, add a generic world-gated guard, prove against attempt 11's real output as the
red fixture, add a modern-world green fixture, no prose edits, no resample, no provider calls.

## 1. Trace — where pc_proxy_action comes from

`pc_proxy_action` is 100% model-generated: it's a field the CG structural/screenplay author
(Grok-4.1-reasoning) emits per beat in its own JSON output. The app never invents it — the only
app-side handling (`public/app.js` PC PROXY ACTION VALIDATOR, ~line 229035) trims/nulls the raw
string and runs three diagnostic checks (internal-state language, echo-of-beat-text, frequency);
it never writes content into the field.

## 2. Source of the leak — a generic scaffold template, not model invention or stale state

The CG author's own system prompt (`_buildCGScreenplaySystemPrompt`, "PC PROXY ACTION RULES"
section) gives the model a "GOOD examples" worked list to imitate the SHAPE of a proxy action. One
static entry in that list is the literal string `"she didn't reach for the coffee"`. Attempt 11's
real, captured beat 19 `pc_proxy_action` is `"she didn't reach for the coffee"` — an exact,
character-for-character match. This is a generic scaffold-template leak: the model copied the
prompt's own literal worked example almost verbatim into a Fatelands scene, not something it
invented from scratch, not stale state carried over from another story, and not a separate
author-side module.

## 3. Real root cause — an existing, correct, world-gated guard was never wired into this prompt

The app already has a generic, world-gated anachronism guard — `buildColloquialismGuardDirective()`
— used by the literary/prose continuation author (3 call sites). It already explicitly bans
"coffee" by name: `"Modern food/drink names with no world equivalent (popcorn, pizza, coffee, soda,
etc.)"`, gated on `state.picks.world` and returning `''` unconditionally for `world === 'Modern'`.

`_buildCGScreenplaySystemPrompt` — the CG author's own ~1500-line system-prompt builder — never
called it. Zero references to `buildColloquialismGuardDirective`, `buildWorldPhysicsDirective`, or
`state.picks.world` existed anywhere in that function before this fix. The CG author path was
simply never told which world it was writing for, so its own literal "coffee" worked example went
completely unguarded.

## 4. Fixes — both in `public/app.js`, both dry

1. **`_buildCGScreenplaySystemPrompt`** now calls `buildColloquialismGuardDirective()` right after
   the PC PROXY ACTION RULES section, plus a new short WORLD REGISTER note explicitly reframing the
   GOOD examples as placeholders illustrating shape, not literal props to copy.
2. **New, small, non-exhaustive, world-gated deterministic guard** —
   `_cgWorldGuardModernObjectHit(text, world)` — wired as check (c) into the existing PC PROXY
   ACTION VALIDATOR. Diagnostic-only (logs `[CG:PROXY:WEAK]`, never rewrites — a validator that
   rewrites is a competing author). Term list is not "coffee"-only: covers a small food/drink + tech
   set (coffee, espresso, latte, cappuccino, soda, cola, pizza, popcorn, phone, cellphone,
   smartphone, laptop, computer, television, wifi, internet, microwave, elevator). Gated exactly
   like `buildColloquialismGuardDirective`: `!world || world === 'Modern'` → always returns `null`.

### A structural discovery made while wiring this in

`buildColloquialismGuardDirective` was originally defined inside a nested closure that only runs
once an actual literary continuation prompt is being built — never reached during a bare page load.
A `window.buildColloquialismGuardDirective = ...` export placed at that original position was
silently never set outside of a real generation, which would have made the CG-path fix dead code in
production (the CG author prompt is built from a different top-level function that runs
independently). Verified this empirically: a fresh page load left `window.buildColloquialismGuardDirective`
`undefined` even after `document.readyState === 'complete'`, while `window._buildCGScreenplaySystemPrompt`
— genuinely top-level — was already defined.

Fixed by relocating the function's definition itself to true top-level scope, directly beside
`_buildCGScreenplaySystemPrompt`'s own window assignment (both provably execute at script-load
time). The 3 pre-existing call sites in the literary/prose continuation prompt builder (which
reference the bare identifier, unchanged) still resolve correctly — they remain nested within the
same overarching top-level closure that now holds the relocated declaration, and a declaration
hoisted to an ancestor scope stays visible to every descendant closure that already referenced it.
Confirmed via `node --check` and a full regression sweep (below) that this did not disturb the
existing prose path.

`_cgWorldGuardModernObjectHit` itself was also moved to true top-level for the same reason (it was
originally drafted inside the per-scene plan-normalizer, which only runs during an actual
generation) — placed beside `_buildCGScreenplaySystemPrompt` too, consumed by the PC PROXY ACTION
VALIDATOR further down in the file via ordinary closure visibility.

## 5. Proof — `_cg_proxy_world_guard_control.mjs`, 15/15, fully dry

- **A (RED)** — attempt 11's own real, captured beat-19 text (`"she didn't reach for the coffee"`)
  is flagged under the real story's world (`'Fantasy'`), hit = `"coffee"`.
- **B** — non-exhaustive: a different modern-object term ("phone") is also caught.
- **C** — gated generically to non-Modern worlds, not just Fantasy: a Historical world also flags
  the same text.
- **D (GREEN/modern fixture)** — the identical literal text is NOT flagged under `'Modern'` —
  modern stories keep coffee-like objects fully allowed.
- **E** — no false positive on two already-accepted GOOD-example proxies ("the ring rotated once on
  her finger", "the breath caught and held") under Fantasy.
- **F** — empty/undefined world, empty/null text: never throws, never flags (custom/no-world
  stories stay safe).
- Case-insensitivity: "Coffee" capitalized mid-sentence still flags.
- **G** — the real `_buildCGScreenplaySystemPrompt()`, under a live Fantasy-world state, now
  contains both the colloquialism guard's own source-traced "coffee" ban text AND the new WORLD
  REGISTER placeholder note; the original "she didn't reach for the coffee" GOOD example is left in
  place (not deleted — the guard supersedes it via instruction, matching "no prose edits").
- **H** — under a Modern-world state, the guard block is absent from the prompt (unaffected,
  matching `buildColloquialismGuardDirective`'s own existing Modern short-circuit).

## 6. Full regression — zero collateral damage

- `_cg_proxy_world_guard_control.mjs`: 15/15 (new).
- `_relational_obligation_contract_control.mjs`: 47/47, unaffected.
- `_planner_function_gate_diagnosis_control.mjs`: attempts 6/9/10 unaffected (6 still correctly
  rejected, 9 and 10 still correctly pass); anti-gaming checks hold.
- `_scene2_aftermath_lane_control.mjs`: 22/22, unaffected.
- `_scene2_planner_function_gate_control.mjs`: 10/10, unaffected.
- `_scene2_lirael_defensive_path_lane_semantics_control.mjs`: 22/22, unaffected.
- `_continuity_spine_dry.mjs`: 69/80, identical 11 pre-existing failing test names (S6, N1, R2, G3,
  R2d, G2, G6, R3, R5, R5b, R6a), no new failures — confirms the `buildColloquialismGuardDirective`
  relocation did not disturb the literary/prose author path's 3 original call sites.

## What this does NOT do

- Does not touch the generated Temptation attempt 11 scene or its preserved artifacts
  (`report_temptation_attempt11.json`, `scene2_raw_response_temptation_attempt11.txt`) — read only,
  never edited.
- Does not resample or retry Temptation.
- Does not make any provider call.
- Does not claim the deterministic guard's small term list is exhaustive — it is explicitly
  non-exhaustive, covering the demonstrated failure category (modern food/drink + common tech
  nouns), not every possible anachronism.
- Does not attempt automatic "unless explicitly present in that story's canon" resolution — no
  runtime per-story canon-term registry exists to query. The guard function accepts only
  `(text, world)`; a future canon-allowlist parameter is a possible extension, not fabricated here.

## Status

Dry, uncommitted at time of writing. No provider or image calls. No candidate prose edits. Cache-
buster bumped (`?v=20260922j-cg-proxy-world-guard`).
