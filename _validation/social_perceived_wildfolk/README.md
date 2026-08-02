# Validation Corpus — "Perceived Nature of the Wildfolk" (Social Canon owner)

Permanent, executable evidence for the Social-perception migration (owner `_PERCEIVED_WILDFOLK` /
`_perceivedWildfolkForAuthor()` in `public/app.js`).

> **This corpus DEFINES the expected product behavior. Any prompt-assembly or routing change that
> ALTERS these results requires investigation before merge.** (Not documentation — an executable spec.)

## What the owner does
Answers **"What do different peoples believe the Wildfolk are?"** It is a **behavioral-constraint**
owner: it governs how the (live) Becoming-Field canon may be *voiced* — outsiders must NOT voice the
Field/Becoming/Keeper cosmology; their fear surfaces as mundane superstition (Thornbred, Brushborn,
Rot-touched, bloodline, cursed-place, moons). Wildfolk read outsiders knowingly. The asymmetry is the engine.

## The controlled scenario (constant across all tests)
Thornwild waystation, mixed room of Wildfolk + outsider travellers; an outsider publicly makes a
demeaning assumption about the Wildfolk character. Only PC/LI identity + who-is-insulted vary.

## Claim rubric (score each Present / Absent / Contradicted / Not-exercised)
- **C1** outsiders explain Wildfolk in MUNDANE terms (inbreeding/isolation/superstition), NEVER "monster"/Field.
- **C2** Wildfolk read outsiders better than vice-versa (calm/observational/pitying, not symmetric prejudice).
- **C3** First-Favored register ("Disfavored") — a SEPARATE owner; MUST stay unaffected by this one.
- **C4** conflict = incompatible world-models, not generic mutual hostility.

## Pass criteria (both halves)
1. **Author prompt** (the app's real per-turn heavy `fullSys`): owner present, **terminal** (position ~99%,
   nothing substantive after it), precedence clause present.
2. **Prose**: outsider stays on the mundane side — canonical slurs + superstition, **zero** Field/Becoming/Keeper cosmology.

## Artifacts (`artifacts/`)
| File | Stage | Shows |
|---|---|---|
| `scene_{1,2,3}_*.txt` | Phase 1 baseline (NO owner) | consistent FAILURE — outsiders voice Field cosmology ("the Field gets inside", "the Keepers mark them", "half-gone") |
| `p2_baseline_*` / `p2_injected_*` | Phase 2 A/B | injecting the owner flips outsider register to mundane ("brush"/"thornbred"), C3 unaffected, zero regression |
| `regression_scene.txt` | Build attempt 1 (owner buried @15%) | FALSIFIED — owner present but leak survived → placement matters |
| `turn2_scene.txt` + `turn2_obs.json` | FINAL — real literary TURN | PASS: `ownerTerminal:true`, `precedenceClause:true`, prose mundane-only ("Thornbred… the hall remembers… what the moons started") |

## How to rerun (harnesses in repo root; need `vercel dev` on :3000 + `playwright-core`)
- `_social_smoke.js`        — $0: is the social canon present in the assembled prompt? (baseline was DEAD)
- `_social_phase1.js`       — baseline scenes (canon-absent) → expect C1/C4 Contradicted
- `_social_phase2.js`       — lean-owner A/B → expect direct repair, C3 unaffected
- `_social_turn2.js`        — **the acceptance test**: real opening + real literary turn; sets `actionInput` +
  clicks `#submitBtn` (→ `mode=literary` → `[TIER-ROUTE] HEAVY`), intercepts the `/api/proxy` call whose body has
  BOTH `TURN INSTRUCTIONS` + the owner (the true author request), asserts owner terminal + scores the prose.

## Key gotchas (cost real time to learn)
- The literary author request is `_authorChatCapture(fullSys, "Action/Dialogue")` (app/self-exposed at
  `window.__lastAuthorPrompt.fullSys`, but only when `window.__dumpAuthorPrompt=true`). Do NOT identify it by
  "largest /api/proxy call" — that grabs a planner/skeleton/classifier sibling and gives a false negative.
- Literary is FORCE-ROUTED to HEAVY (`_useLite` block, "Option A") — there is no lite/alt author path for literary.
- Force Thornwild via ancestry alias `'darkwood'` (identityLock:false → species stays controlled by `picks.pcSpecies`).

## Out of scope (separate tickets)
- **Ticket B:** mirror the terminal owner into the speculative pre-warm path (283071) + stable literary-turn harness.
- **C3 First-Favored "Disfavored" register:** a distinct perspective-owner (proven separate by the A/B).
