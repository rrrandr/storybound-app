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

if (fail) process.exit(1);
console.log('PASS: Scene-1 skeleton/mode/opening-rule are temperature-gated — HOT pins hot, COLD keeps full variance; no re-roll mismatch.');
