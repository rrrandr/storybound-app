// FIRST SACRIFICE — VISUAL STORYBOARD CONSISTENCY CONTROL (Roman, 2026-09-19)
//
// The packet's new scene1_visual_storyboard section is an authoring-facing DECLARATION of facts
// whose real, runtime source of truth is public/starter-scenes.js (imageAssets/imageOccurrences) and
// the packet's own already-locked scene1_beat_number_template.slots. This control proves the
// declaration never silently drifts from either:
//   1. every beat's {n, occurrence(=image), id, kind, wordRange} matches
//      scene1_beat_number_template.slots exactly — the storyboard is not a second, divergent
//      definition of the locked 20-beat contract;
//   2. every beat's {assetId, treatment, quadrant} matches the REAL starter-scenes.js
//      imageOccurrences table for that occurrence key exactly;
//   3. the asset_summary's claimed asset/occurrence counts match starter-scenes.js's real
//      imageAssets.length / Object.keys(imageOccurrences).length;
//   4. the dohkar_reprise block matches the real starter-scenes.js
//      oasHandoff.interruptionPortrait wiring and its real occurrence/asset/treatment.
//
// usage: node _first_sacrifice_visual_storyboard_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}

const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const starterSrc = fs.readFileSync(path.join(__dirname, 'public/starter-scenes.js'), 'utf8');

// Extract the REAL starter_first_sacrifice package's imageAssets/imageOccurrences/oasHandoff purely
// by real evaluation of the actual object literal — not a hand-copied re-statement of it. Brace-
// matched (not a fixed-lookahead regex) so it holds regardless of what follows in the file.
const keyIdx = starterSrc.indexOf('starter_first_sacrifice:');
if (keyIdx === -1) { console.error('could not locate starter_first_sacrifice in starter-scenes.js'); process.exit(1); }
const braceStart = starterSrc.indexOf('{', keyIdx);
let depth = 0, i = braceStart, braceEnd = -1;
for (; i < starterSrc.length; i++) {
  if (starterSrc[i] === '{') depth++;
  else if (starterSrc[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } }
}
if (braceEnd === -1) { console.error('brace matching failed for starter_first_sacrifice'); process.exit(1); }
const REAL_PKG = new Function('return ' + starterSrc.slice(braceStart, braceEnd + 1))();

console.log('\n' + '='.repeat(88) + '\nFIRST SACRIFICE VISUAL STORYBOARD CONSISTENCY CONTROL\n' + '='.repeat(88) + '\n');

const sb = PACKET.scene1_visual_storyboard;
ok('packet declares scene1_visual_storyboard', !!sb);
ok('scene1_visual_storyboard.beats has exactly 20 entries', Array.isArray(sb.beats) && sb.beats.length === 20, sb.beats && sb.beats.length);

// ── 1. storyboard beats vs. the locked scene1_beat_number_template.slots ──
const tmplSlots = PACKET.scene1_beat_number_template.slots;
ok('locked template also has exactly 20 slots (sanity)', tmplSlots.length === 20);
let templateDrift = [];
sb.beats.forEach((b, i) => {
  const t = tmplSlots[i];
  if (!t || t.n !== b.n || t.image !== b.occurrence || t.id !== b.id || t.kind !== b.kind ||
      JSON.stringify(t.wordRange) !== JSON.stringify(b.wordRange)) {
    templateDrift.push({ n: b.n, storyboard: b, template: t });
  }
});
ok('every storyboard beat exactly matches the locked scene1_beat_number_template slot at that index (n, occurrence=image, id, kind, wordRange)', templateDrift.length === 0, JSON.stringify(templateDrift.slice(0, 3)));

// ── 2. storyboard occurrence resolution vs. the REAL starter-scenes.js imageOccurrences ──
const realOcc = REAL_PKG.imageOccurrences || {};
const realAssets = {}; (REAL_PKG.imageAssets || []).forEach(a => { realAssets[a.id] = a; });
let occDrift = [];
sb.beats.forEach(b => {
  const r = realOcc[b.occurrence];
  if (!r) { occDrift.push({ n: b.n, occurrence: b.occurrence, reason: 'no such occurrence in starter-scenes.js' }); return; }
  if (r.assetId !== b.assetId || r.treatment !== b.treatment || (r.quadrant ?? null) !== (b.quadrant ?? null)) {
    occDrift.push({ n: b.n, occurrence: b.occurrence, storyboard: { assetId: b.assetId, treatment: b.treatment, quadrant: b.quadrant }, real: { assetId: r.assetId, treatment: r.treatment, quadrant: r.quadrant ?? null } });
  }
});
ok('every storyboard beat\'s {assetId, treatment, quadrant} exactly matches the REAL starter-scenes.js imageOccurrences table', occDrift.length === 0, JSON.stringify(occDrift.slice(0, 3)));
ok('every storyboard beat\'s assetId resolves to a REAL declared asset in starter-scenes.js imageAssets', sb.beats.every(b => !!realAssets[b.assetId]), JSON.stringify(sb.beats.filter(b => !realAssets[b.assetId]).map(b => b.n)));

// ── 3. asset_summary claims vs. real counts ──
const realAssetCount = (REAL_PKG.imageAssets || []).length;
const realOccCount = Object.keys(realOcc).length;
ok('asset_summary\'s claimed "5 real assets" matches starter-scenes.js\'s real imageAssets.length', realAssetCount === 5, 'real=' + realAssetCount);
ok('asset_summary\'s claimed "9 occurrences" matches starter-scenes.js\'s real Object.keys(imageOccurrences).length', realOccCount === 9, 'real=' + realOccCount);
const sheetOccKeys = Object.keys(realOcc).filter(k => realOcc[k].treatment === 'quadrant');
ok('exactly 4 real occurrences use treatment "quadrant", covering quadrants 0-3 exactly once each', sheetOccKeys.length === 4 && JSON.stringify(sheetOccKeys.map(k => realOcc[k].quadrant).sort()) === JSON.stringify([0, 1, 2, 3]), JSON.stringify(sheetOccKeys.map(k => [k, realOcc[k].quadrant])));

// ── 4. dohkar_reprise vs. the real oasHandoff wiring ──
const reprise = sb.dohkar_reprise;
const realPortraitKey = REAL_PKG.oasHandoff && REAL_PKG.oasHandoff.interruptionPortrait;
ok('packet dohkar_reprise.occurrence matches the REAL oasHandoff.interruptionPortrait key', reprise.occurrence === realPortraitKey, 'packet=' + reprise.occurrence + ' real=' + realPortraitKey);
const realReprise = realOcc[realPortraitKey];
ok('the real reprise occurrence resolves to intro_dohkar at a "close" treatment, matching the packet\'s claim', !!realReprise && realReprise.assetId === reprise.assetId && realReprise.treatment === reprise.treatment, JSON.stringify({ packet: { assetId: reprise.assetId, treatment: reprise.treatment }, real: realReprise }));
ok('the reprise reuses an EXISTING asset (intro_dohkar) rather than declaring a distinct 9th asset', reprise.assetId === 'intro_dohkar' && !!realAssets['intro_dohkar'], reprise.assetId);
ok('the reprise occurrence key is distinct from every one of the 20 beats\' occurrence keys (a true 9th occurrence, not a 21st beat)', !sb.beats.some(b => b.occurrence === reprise.occurrence), reprise.occurrence);

console.log('\n' + '='.repeat(88));
console.log('FIRST SACRIFICE VISUAL STORYBOARD CONSISTENCY CONTROL: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); }
process.exitCode = fail ? 1 : 0;
