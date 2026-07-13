// Guard (Fable CG audit — A2-F5, premise-breaking): the billionaire Scene-1 user prompt hardcoded the LI
// placeholder name "Roman" into directive text AND co-shipped "the LI is the object of her wanting in the
// first 250 words" with the Scene-1 LI-ABSENT contract ("does not appear, not referenced by name"). Fix:
// (1) use liName (defaults to "the love interest"); (2) suppress the wanting assertion exactly when the
// LI-ABSENT condition holds in Scene 1.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) No LI-placeholder "Roman" left in the directive TEXT (authorship stamps "Roman 2026-..." are fine).
A(!src.includes('WANTING / NEEDING Roman'), 'wanting-block still hardcodes the LI placeholder "Roman"');
A(!src.includes('Roman is the object of her WANTING'), 'object-of-wanting line still hardcodes "Roman"');
A(!src.includes("what is Roman hiding"), 'truth-mystery line still hardcodes "Roman"');
A(!src.includes('besides the protagonist and Roman.'), 'cast-cap still hardcodes "Roman"');
A(!src.includes("naming Roman\\'s brother"), 'cast-cap forbidden-list still hardcodes "Roman"');

// (2) The blocks now use the LI reference (liName / neutral role).
A(src.includes("WANTING / NEEDING ' + liName + ' destabilizing her"), 'wanting-block does not use liName');
A(src.includes("' + liName + ' is the object of her WANTING"), 'object-of-wanting line does not use liName');
A(src.includes('besides the protagonist and the love interest.'), 'cast-cap does not use the neutral LI role reference');

// (3) The wanting assertion is suppressed exactly when the Scene-1 LI-ABSENT condition holds.
A(src.includes('var _liAbsentSc1 = (sceneIndex === 0) && ('), 'LI-absent Scene-1 signal not computed');
A(/_liDeferred\(state\)/.test(src) && src.includes("_scene1OpeningMode === 'grounded_entry'"), 'LI-absent condition does not match the LI-VISIBILITY contract');
A(src.includes("worldSubtype) || '') === 'billionaire_modern' && !_liAbsentSc1) {"), 'wanting-block not gated on !_liAbsentSc1');

// (4) The LI-VISIBILITY ABSENT contract still ships (the reconciliation counterpart).
A(src.includes('LI VISIBILITY (Scene 1 contract — HARD): ABSENT'), 'LI-VISIBILITY ABSENT contract missing');
A(src.includes('not referenced by name in the prose'), 'LI-absent "not referenced by name" clause missing');

if (fail) process.exit(1);
console.log('PASS: billionaire Scene-1 wanting-block uses liName (no "Roman" placeholder) and is suppressed exactly when the LI-ABSENT contract fires — the "object of her wanting in first 250 words" vs "LI absent / not named" contradiction is resolved.');
