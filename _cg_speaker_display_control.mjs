// GENERIC CG SPEAKER-DISPLAY-NAME VALIDATOR — CONSISTENCY + FUNCTIONAL CONTROL (Roman, 2026-09-20)
//
// validateCGSpeakerDisplayNames (public/app.js) is a WORLD-AGNOSTIC, reject-only guard against a
// real, found bug class: a CG panel's dialogue renderer prints a beat's `speaker` field to the
// reader verbatim, with no display-name resolution step — First Sacrifice's own authoring packet
// independently produced "the_presiding_Dohkar" (an internal cast_roles key) as a literal speaker
// value, which reached a real, on-disk candidate unresolved. This control proves the generic
// mechanism itself (not First-Sacrifice-specific) using the SAME sandbox-extraction technique as
// this repo's other dry app.js-function controls (real source, executed in Node, no browser, no
// network). Also proves it fires correctly on First Sacrifice's own real, on-disk artifacts —
// the pre-correction candidate fails, the naming-corrected one passes.
//
// usage: node _cg_speaker_display_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════════
section('1. SANDBOX EXTRACTION — real function source, executed in Node, no browser');
// ═══════════════════════════════════════════════════════════════════════════════
const fnMatch = appSrc.match(/function validateCGSpeakerDisplayNames\(beats, knownDisplayNames\) \{[\s\S]*?\n  window\.validateCGSpeakerDisplayNames = validateCGSpeakerDisplayNames;\n/);
ok('validateCGSpeakerDisplayNames is found intact in public/app.js', !!fnMatch);
const fnBody = fnMatch ? fnMatch[0] : '';
ok('the real function is world-agnostic — its body never references _fatelandsFantasyWorldGate or state (unlike every sibling Fatelands mechanism it is colocated with)', !/_fatelandsFantasyWorldGate|\bstate\./.test(fnBody), fnBody.slice(0, 200));

function makeSandbox() {
  const body = 'var window = {};\n' + fnBody + '\nreturn window;';
  return new Function(body)();
}
const win = makeSandbox();
ok('validateCGSpeakerDisplayNames is exposed on window (same convention as every other utility in this file)', typeof win.validateCGSpeakerDisplayNames === 'function');
const validateCGSpeakerDisplayNames = win.validateCGSpeakerDisplayNames;

// ═══════════════════════════════════════════════════════════════════════════════
section('2. STRUCTURAL CHECK — underscored/internal-key speaker values are rejected regardless of registry');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const beats = [{ speaker: 'the_presiding_Dohkar', text: 'x' }];
  const r = validateCGSpeakerDisplayNames(beats, null);
  ok('RED: an underscored speaker is rejected even with NO known-cast registry supplied (structural check alone)', r.ok === false && r.violations.some(v => v.rule === 'internal_key' && /the_presiding_Dohkar/.test(v.detail)), JSON.stringify(r));
}
{
  const beats = [{ speaker: 'julian_provast_office_holder', text: 'x' }];
  const r = validateCGSpeakerDisplayNames(beats, ['Lirael', 'Seren', 'Julian']);
  ok('RED: ANY underscored value is rejected, not a lexical ban on one specific string', r.ok === false && r.violations.some(v => v.rule === 'internal_key'));
}
{
  const beats = [{ speaker: null, text: 'narration' }, { speaker: undefined, text: 'more narration' }];
  const r = validateCGSpeakerDisplayNames(beats, ['Lirael']);
  ok('GREEN (scope discipline): null/undefined speaker (narration) is never flagged', r.ok === true, JSON.stringify(r));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('3. UNRESOLVED CAST REFERENCE — a plain (non-underscored) but undeclared speaker is still rejected');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const beats = [{ speaker: 'the presiding Dohkar', text: 'x' }]; // no underscore, but not a real declared name
  const r = validateCGSpeakerDisplayNames(beats, ['Lirael', 'Seren', 'Julian', 'Dhokar Raes']);
  ok('RED: a plain-English but undeclared speaker reference is rejected as unresolved — "not underscored" alone is not sufficient', r.ok === false && r.violations.some(v => v.rule === 'unresolved_reference'), JSON.stringify(r));
}
{
  const beats = [{ speaker: 'Dhokar Raes', text: 'x' }];
  const r = validateCGSpeakerDisplayNames(beats, ['Lirael', 'Seren', 'Julian', 'Dhokar Raes']);
  ok('GREEN: a declared real display name passes cleanly', r.ok === true, JSON.stringify(r));
}
{
  const beats = [{ speaker: 'A masked figure', text: 'x', anonymousSpeakerDeclared: true }];
  const r = validateCGSpeakerDisplayNames(beats, ['Lirael']);
  ok('GREEN: an explicitly-declared anonymous/masked speaker (anonymousSpeakerDeclared:true) bypasses the unresolved-reference check', r.ok === true, JSON.stringify(r));
}
{
  const beats = [{ speaker: 'a_masked_figure', text: 'x', anonymousSpeakerDeclared: true }];
  const r = validateCGSpeakerDisplayNames(beats, ['Lirael']);
  ok('RED: anonymousSpeakerDeclared bypasses ONLY the unresolved-reference check, never the underscored-internal-key check — an anonymous speaker still needs a real display-shaped label', r.ok === false && r.violations.some(v => v.rule === 'internal_key'), JSON.stringify(r));
}
{
  const beats = [{ speaker: 'Unknown Voice', text: 'x' }];
  const r = validateCGSpeakerDisplayNames(beats, null);
  ok('GREEN: with NO registry supplied at all, an unregistered-but-plain speaker name is accepted (structural-only mode — the caller opts into resolution by supplying a registry)', r.ok === true, JSON.stringify(r));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('4. BOTH REGISTRY SHAPES ACCEPTED — flat array AND {id: {displayName}} object');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const beats = [{ speaker: 'Dhokar Raes', text: 'x' }];
  const flatArrayResult = validateCGSpeakerDisplayNames(beats, ['Lirael', 'Seren', 'Julian', 'Dhokar Raes']);
  const registryObjectResult = validateCGSpeakerDisplayNames(beats, {
    lirael: { displayName: 'Lirael' }, seren: { displayName: 'Seren' }, julian: { displayName: 'Julian' }, dhokar_raes: { displayName: 'Dhokar Raes' },
  });
  ok('GREEN: a flat array of display names resolves correctly', flatArrayResult.ok === true, JSON.stringify(flatArrayResult));
  ok('GREEN: a registry object keyed by internal id with .displayName fields ALSO resolves correctly (same real name, different caller shape)', registryObjectResult.ok === true, JSON.stringify(registryObjectResult));
}
{
  // A registry object whose values are themselves already plain display-name strings (no
  // .displayName wrapper) falls back to using the KEY as the display name — supports a caller
  // whose registry is keyed directly by display name (First Sacrifice's own real cast_roles shape).
  const beats = [{ speaker: 'Julian', text: 'x' }];
  const r = validateCGSpeakerDisplayNames(beats, { Lirael: { role: 'PC' }, Seren: { role: 'Graduant' }, Julian: { role: 'LI' } });
  ok('GREEN: a registry object keyed directly by display name (values without .displayName, e.g. First Sacrifice\'s real cast_roles shape) resolves via the key itself', r.ok === true, JSON.stringify(r));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('5. REAL DATA — the actual First Sacrifice on-disk artifacts, before and after the naming correction');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
  const knownNames = Object.keys(PACKET.locked_world_facts.cast_roles);
  ok('sanity: the real packet\'s cast_roles now includes "Dhokar Raes" as a real display-name key', knownNames.includes('Dhokar Raes'), JSON.stringify(knownNames));

  const preCorrectionPath = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/13_final_field_correction.json');
  const preCorrection = JSON.parse(fs.readFileSync(preCorrectionPath, 'utf8'));
  const preResult = validateCGSpeakerDisplayNames(preCorrection.draft.scene1Candidate.beats, knownNames);
  ok('REAL DATA: the actual, on-disk 13_final_field_correction.json (pre-naming-correction, untouched) genuinely fails the generic validator — real confirmation this is a real bug, not a theoretical one', preResult.ok === false && preResult.violations.some(v => v.rule === 'internal_key' && /the_presiding_Dohkar/.test(v.detail)), JSON.stringify(preResult));

  const postCorrectionPath = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/16_naming_corrected_candidate.json');
  const postCorrection = JSON.parse(fs.readFileSync(postCorrectionPath, 'utf8'));
  const postResult = validateCGSpeakerDisplayNames(postCorrection.draft.scene1Candidate.beats, knownNames);
  ok('REAL DATA: the naming-corrected candidate (16_naming_corrected_candidate.json, real mechanical field rename, no provider call) passes the generic validator cleanly', postResult.ok === true, JSON.stringify(postResult));
}

console.log('\n' + '='.repeat(96));
console.log('CG SPEAKER-DISPLAY-NAME VALIDATOR CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
