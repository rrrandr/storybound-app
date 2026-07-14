// Guard: cold-open fix (2026-07-14 meta-audit a). The Scene-1 structural-variance layers (macro
// skeleton, micro opening mode, LITERARY-OPENING license) were temperature-BLIND, so a random cold
// skeleton/mode/license ordered the author to open COLD even on HOT_CRISIS — surviving the trailing
// HOT directive (measured HOT→COLD 8/8). Fix: gate all three on _hotOpen (read from the memoized
// _pickOpeningTemperature, the same source the HOT-directive gate uses), pinning HOT to CONFRONTATION /
// Disruption-first / a HOT OPENING rule while leaving the COLD path's full random variance intact.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) _hotOpen is derived from the canonical (memoized) temperature selector, not a fresh roll.
A(src.includes("_pickOpeningTemperature(state)") && src.includes("=== 'HOT_CRISIS'") &&
  src.includes("const _hotOpen = (function () {"), '_hotOpen flag missing or not sourced from _pickOpeningTemperature');

// (2) Skeleton pins to CONFRONTATION under HOT, random otherwise.
A(src.includes("const selectedSkeleton = _hotOpen") && src.includes("m.tag === 'CONFRONTATION'"),
  'skeleton not temperature-gated to CONFRONTATION under HOT');

// (3) Micro opening mode pins to Disruption-first under HOT, random otherwise.
A(src.includes("const selectedOpening = _hotOpen") && src.includes("m.mode === 'Disruption-first'"),
  'micro opening mode not temperature-gated to Disruption-first under HOT');

// (4) The soft LITERARY-OPENING license is suppressed under HOT; a HOT OPENING rule replaces it.
A(src.includes("${(_isLiterary && !_hotOpen)") && src.includes("HOT OPENING: Open on the crisis already in motion"),
  'LITERARY-OPENING license not suppressed under HOT (no HOT OPENING arm)');

// (5) COLD path preserved — the random skeleton/mode fallbacks still exist (variance not destroyed).
A(src.includes("macroSkeletons[Math.floor(Math.random() * macroSkeletons.length)]") &&
  src.includes("openingModes[Math.floor(Math.random() * openingModes.length)]"),
  'COLD-path random variance was removed (should be preserved for non-HOT openings)');

// (6) PHASE 2 (2026-07-14): the three live always-on cold pulls the validation gen exposed are gated on HOT.
//   #1 _buildFatelandsGroundingDirective — first-paragraph framing routes strangeness THROUGH the crisis on HOT.
A(src.includes('On this HOT-CRISIS open the strangeness arrives INSIDE the live crisis'),
  'Fatelands grounding first-paragraph not gated on HOT (top cold pull)');
//   #2 buildWorldSensoryTextureDirective — establish-place front-loading relaxed on Scene-1 HOT (system-authority pull).
A(src.includes('var _hotWST = (!state.turnCount)') && src.includes('ground it THROUGH the live action (a place rendered by the person acting in it)'),
  'WorldSensoryTexture establish-place not gated on Scene-1 HOT');
//   #3 buildProseDensityConductorDirective — place-establishment carve-out front-loading relaxed on Scene-1 HOT.
A(src.includes('var _hotPD = (!state.turnCount)') && src.includes("(_hotPD ? ' (on this HOT-CRISIS open, delivered THROUGH the live action"),
  'Conductor place-establishment carve-out not gated on Scene-1 HOT');
//   Continuations/cold opens keep the originals (Scene-1-scoped via !state.turnCount on the system-message pulls).
A(src.includes('within the first ~2 paragraphs the reader must know WHERE') === false ||
  src.includes("Within the first ~2 paragraphs the reader must know WHERE this scene physically happens — the room or place, its dominant MATERIALS and the quality of its LIGHT. A scene that could be occurring anywhere has failed its opening."),
  'cold-open WorldSensoryTexture original (continuation/cold) path removed');

if (fail) process.exit(1);
console.log('PASS: Scene-1 skeleton/mode/opening-rule + the 3 live cold pulls (Fatelands grounding, WorldSensoryTexture, Conductor floor) are HOT-gated; COLD/continuation keep full variance; no re-roll mismatch.');
