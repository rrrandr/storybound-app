// Guard: setting-description detector (2026-07-14 meta-audit c/④). People had detectors; the PLACE had
// none, so ④'s setting floor was prompt-only. _settingDescriptionCheck mirrors _pcDescriptionCheck:
// scan the first ~2 paragraphs for a MATERIAL noun AND a LIGHT-quality token, batch-track fail + floor,
// and it is wired into the final-prose finalize path so it actually measures shipped output.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The detector is defined and exported.
A(src.includes('function _settingDescriptionCheck(prose, stage) {'), '_settingDescriptionCheck not defined');
A(src.includes('window._settingDescriptionCheck = _settingDescriptionCheck;'), '_settingDescriptionCheck not exported');

const start = src.indexOf('function _settingDescriptionCheck(prose, stage) {');
const body = start >= 0 ? src.slice(start, start + 3000) : '';

// (2) It scans the first ~2 paragraphs (establishment window), not the whole prose.
A(body.includes("prose.split(/\\n\\s*\\n/)") && body.includes('paras.slice(0, 2)'),
  'detector does not scope to the first ~2 paragraphs');

// (3) Two signals: material AND light-quality; floor = both, conservative fail = neither.
A(body.includes('var MATERIAL =') && body.includes('var LIGHT ='), 'MATERIAL/LIGHT regexes missing');
A(body.includes('var hasPlace = hasMaterial && hasLight;'), 'floor (material AND light) not computed');
A(body.includes('var fail = !hasMaterial && !hasLight;'), 'conservative fail (neither present) not computed');

// (4) Batch-tracked to its own key with both fail and floor, mirroring sb_pc_desc_failrate.
A(body.includes("'sb_setting_desc_failrate'"), 'setting batch key missing');
A(body.includes('floor: hasPlace ? 1 : 0') && body.includes("'[GEN-FAIL:SETTING:FINAL]"),
  'floor tracking or [GEN-FAIL:SETTING:FINAL] log missing');

// (5) Actually WIRED into the final-prose finalize path (else it measures nothing — the meta-audit lesson).
A(src.includes("window._settingDescriptionCheck(text, 'final')"),
  'detector not invoked on final prose (would be dead like the audit warned)');

if (fail) process.exit(1);
console.log('PASS: _settingDescriptionCheck measures material+light in the first ~2¶, batch-tracks fail+floor, and is wired into the final-prose path.');
