// Guard: under-description fix (2026-07-14 meta-audit c). PICTURABILITY_MANDATE_NOT_LANDING sat ~100%
// because the people-mandate read as a BUDGET ("up to ~2 sentences, no more") the author resolved
// DOWNWARD, and the Conductor suppressed setting-establishment on low-charge scenes. Fix: (③) restate
// the mandate as a countable FLOOR in the detector's own terms — a gestalt PLUS a SILHOUETTE ANCHOR
// (hair OR build), which is exactly what _liDescriptionCheck/_pcDescriptionCheck key on (hasSilhouette);
// reconcile the conflicting "ONE stroke per person" number; (④a) carve the place-establishment floor out
// of the Conductor's charge budget.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// ③ (1) An explicit floor clause stated as a minimum, naming the silhouette anchor.
A(src.includes('DESCRIPTION QUOTA (HARD FLOOR — a MINIMUM to hit, never a budget to spend down).'),
  'description-quota FLOOR clause missing');
A(src.includes('SILHOUETTE ANCHOR — their HAIR, or their BUILD / frame / shoulders'),
  'floor does not name the silhouette anchor (hair OR build) the detector keys on');

// ③ (2) The LI + PC layer-2 now require the silhouette anchor (not eyes/face alone).
A(src.includes('at least ONE SILHOUETTE ANCHOR — his HAIR, or his BUILD'), 'LI layer-2 not converted to require a silhouette anchor');
A(src.includes('at least ONE SILHOUETTE ANCHOR — her HAIR, or her BUILD'), 'PC layer-2 not converted to require a silhouette anchor');

// ③ (3) The ceiling-framed BUDGET lines are reframed as FLOOR+ceiling (no lingering "no more" budget-only framing).
A(src.includes('The FLOOR is {gestalt + silhouette anchor}'), 'AMOUNT/floor reframing missing');
A(!src.includes('BUDGET: spend up to ~2 sentences on him in total this scene — 2–3 aspects, no more.'),
  'old ceiling-only LI BUDGET line still present');
A(!src.includes('BUDGET: spend up to ~2 sentences on her in total this scene. That is enough; it is also the minimum.'),
  'old ceiling-only PC BUDGET line still present');

// ③ (4) The conflicting flat "ONE stroke per person" number is reconciled.
A(!src.includes("mood, the gap between how they want to be seen and how they are). ONE stroke per person, woven INTO the action"),
  'flat "ONE stroke per person" contradiction not reconciled');
A(src.includes('NAMED PRINCIPALS (the LI, the PC, sustained NPCs) meet the importance-scaled establishment below AND the picturability floor'),
  'CharacterDescription not reconciled to the scaled quota + floor');

// ④a Conductor carve-out — place-establishment exempt from the charge budget.
A(src.includes('EXEMPT FROM THIS BUDGET — THE PLACE-ESTABLISHMENT FLOOR') &&
  src.includes('Suppress the interpreting, not the seeing.'),
  'Conductor place-establishment carve-out missing');
const condIdx = src.indexOf('EXEMPT FROM THIS BUDGET — THE PLACE-ESTABLISHMENT FLOOR');
const gaugeIdx = src.indexOf("GAUGE THIS SCENE\\'S CHARGE, then ration");
A(condIdx >= 0 && gaugeIdx >= 0 && condIdx < gaugeIdx, 'carve-out must precede the charge-rationing bullets so it is read first');

if (fail) process.exit(1);
console.log('PASS: people-picturability restated as a silhouette-anchor FLOOR (detector-aligned), the "ONE stroke" contradiction reconciled, and setting-establishment carved out of the Conductor budget.');
