# Story Memory / History Notes — connection audit

Traced before proposing anything. No new memory channel was built.

## The updater — `_extractStoryMemory` (app.js:85442)

- **Exactly one call site:** `app.js:320060`, in the solo/literary continuation tail.
- **Fire-and-forget:** `_extractStoryMemory(raw).catch(() => {})` — never awaited, so the next
  scene can be planned before it has written anything.
- **Sees `plain.slice(-1500)`** — the LAST 1,500 characters of the scene.
- Self-gates on `state.turnCount < 1` and on `callChatGPT` being available.

## The scene window (app.js:84370)

- Keeps `trimmed.slice(0, 420)` — the FIRST ~420 characters of each of the last TWO scenes,
  cut back to a sentence boundary.
- So the extractor sees the END of a scene and the window keeps the BEGINNING.
  **A consequential event in the MIDDLE of a scene is in neither channel.**
  That is regression case 1, and it fails by construction rather than by accident.

## The consumers — `buildStoryMemoryDirective` (app.js:85787)

Exactly two:

| consumer | path |
|---|---|
| `app.js:314374` | the literary author |
| `app.js:322649` | `preloadNextScene`, the literary speculative preload |

Nothing else.

## Measured against real captured payloads

| payload | `[STORY MEMORY]` | `SCENE WINDOW` | `relationship_state` |
|---|---|---|---|
| SCENE-SPINE planner request (37,467 chars) | absent | absent | absent |
| CG author request | absent | absent | — |

## What this means

The capability is implemented and wired to roughly a quarter of the surface that needs it:
**updated only on the literary path, consumed only by the literary author.** The SCENE
PLANNER — which decides what the next scene *is* — never receives it on either path, and the
CG author never receives it at all. Baked openings and the OAS feed the scene ledger and the
`oasArchive`, not this system.

This is a reconnection problem, not a missing feature. The clipping is the second half:
compacting **by position** (first 420 / last 1,500) drops consequences rather than wording.

## Not established

Whether any of this caused the specific failures in the ten-scene run. Those were traced to
other causes — the verifier reading the baked opening, the lane regex, the posture contract,
the OAS being skipped. This audit stands on its own.

## Regression cases still to run

1. A consequential event in the MIDDLE of a scene (e.g. an object handed over at mid-scene).
2. An older unresolved decision, several scenes back.
