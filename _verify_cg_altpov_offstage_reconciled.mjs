// Guard (Fable CG audit — A2-F12): the alt-POV system mandate said "FORBIDDEN: Inventing events that did
// not occur in the original" + "Most phase images REUSED", but the per-scene OFFSTAGE OVERRIDE tells the
// model to render the LI's PARALLEL location as a FRESH visual scene when he was absent from the original
// — technically imagery/events not in the original. Fix (Roman's rule: allow new OBSERVATIONS, not
// invented facts/offscreen EVENTS): carve the parallel-presence observation out of the FORBIDDEN,
// allow fresh offstage renders, and BOUND the override so it invents no new plot.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The blanket "Inventing events that did not occur" FORBIDDEN is reconciled to facts/events + carve-out.
A(!src.includes("push('- Inventing events that did not occur in the original')"), 'blanket "inventing events" FORBIDDEN still unqualified');
A(src.includes('Inventing new plot FACTS or EVENTS that did not occur in the original, or that change / contradict what happened'), 'FORBIDDEN not narrowed to plot facts/events');
A(src.includes('is a new OBSERVATION of established time, allowed as long as it introduces no new plot event and contradicts nothing'), 'parallel-presence observation carve-out missing');

// (2) VISUAL CANON allows FRESH renders for offstage scenes (not "most images reused" unconditionally).
A(src.includes('For scenes the POV character SHARED with the protagonist, most phase images are REUSED'), 'reuse rule not scoped to shared scenes');
A(src.includes('for a scene the POV character was OFFSTAGE for (see OFFSTAGE OVERRIDE), his parallel-location panels are FRESH renders'), 'offstage fresh-render exception missing');

// (3) OFFSTAGE OVERRIDE is BOUND: parallel presence/state = observation; no new plot facts/events.
A(src.includes('BOUND (HARD): show his PARALLEL PRESENCE and STATE'), 'OFFSTAGE OVERRIDE bound clause missing');
A(src.includes('do NOT invent new PLOT facts or offscreen EVENTS in his thread that advance, change, or contradict the original'), 'override does not forbid inventing offscreen plot events');
A(src.includes('His parallel thread is consistent with and subordinate to the original'), 'override does not subordinate the parallel thread to canon');

// (4) The impossible-omniscience FORBIDDEN is preserved (he still can't know the PC's scene).
A(src.includes("Granting the POV character impossible omniscience"), 'impossible-omniscience guard lost');

if (fail) process.exit(1);
console.log('PASS: alt-POV reconciled — the LI\'s offstage parallel presence is an allowed new OBSERVATION (fresh renders), while inventing new plot facts/offscreen EVENTS is still forbidden and the parallel thread stays subordinate to canon.');
