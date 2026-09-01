# PROSE PIPELINE TRACE — where the canon auditor must sit

Read off `window.__proseSnap` / `__rawSnap` owner tags and their call sites, not from memory.

## Every prose-MUTATING owner in the codebase

| owner | call sites | notes |
|---|---|---|
| `_cheapLineEdit`         | 20 | the workhorse; tension-gate and hook-gate enforcement loops |
| `_targetedSceneEdit`     | 10 | Scene-1 structural edits (tentpole/LI-engine rewrites) |
| `_proseLineEdit`         | 2  | |
| `_preserveObligations`   | 3  | |
| `_repairViaMistral`      | 1  | |
| `_grokLineEdit`          | 1  | |
| `_mistralRepairPass`     | 2  | inside `_grokLiteraryAuthor` (orchestration-client) |

## The tail of the Scene-1 pipeline, in execution order

    …301033  _cheapLineEdit(raw, _hookEnforcement, 'hook-gate')      ← hook gate loop (≤2 attempts)
     301058  _applyEnergyBoostInline(raw, fullSys)
     301331  runVoiceAnchorCalibration(raw)
     301338  _regenWithContinuityFix(raw, fullSys, act, dia, …)      ← LAST prose mutation
     ------------------------------------------------------------------ prose is final here
     301343  _updateSceneWindow(raw)
     301344  _updateFateSeeds(raw)
     301345  _updateMotifLedger(raw)
     301349  _updateRelationshipVector(raw)
     301360  _updateNarrativeGravity(raw)
     301361  _updateRelationshipGravity(raw)

Everything from `_updateSceneWindow` on READS `raw` to update state. Nothing after
`_regenWithContinuityFix` changes the bytes.

## Consequence for placement

The initial canon audit must sit immediately **after `_regenWithContinuityFix`** and before the
first state-update reader. Auditing earlier — after the author, or after the hook gate — would
approve bytes that `_applyEnergyBoostInline`, `runVoiceAnchorCalibration` or the continuity fix
then rewrite: an approval of prose nobody ships. Three separate passes run after the author, and
each is a model call that can introduce a contradiction the auditor already cleared.

Repair then becomes the LAST prose mutation, after which only deterministic validation and the
verification audit may run.

## Why this is not the post-render disclosure extractor

`_updateCharacterDisclosureLedgerForCurrent` fires from `triggerPostRenderHooks()`, called
straight after `container.appendChild(currentPage)` — the reader already has the page. It can
diagnose; it can never prevent. It keeps its job (disclosure memory) and is not used here.
