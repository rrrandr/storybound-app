// CG CANDIDATE-ACCEPTANCE GATE — REAL RENDERER CONTROL (Roman, 2026-09-20)
//
// Proves the actual candidate-acceptance boundary now rejects a CG candidate before it is ever
// accepted, stored, or rendered — not just at render time. validateCGSpeakerDisplayNames is
// world-agnostic and was previously defined but never called from anything that produces a real
// candidate (see project_cg_speaker_validator_wiring_gap memory). It is now wired into
// _parseStructuredPanels — the single function all 3 real CG generation call sites funnel through
// — right after per-panel field normalization and before panel-count enforcement. A rejected
// candidate makes _parseStructuredPanels return null, which every call site already treats as
// "structured generation failed" and falls back to the existing prose-generation path — no new
// failure mode, just a new, correct reason to take the one that already exists.
//
// Sandbox-extracts the real, unmodified _parseStructuredPanels function body plus the real,
// unmodified validateCGSpeakerDisplayNames body (same anchor/regex-extraction technique as this
// repo's other dry app.js-function controls) and executes both together in Node — pure parsing +
// validation logic, no DOM/network/provider call needed.
//
// usage: node _cg_candidate_acceptance_gate_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

// ── Extract validateCGSpeakerDisplayNames (real source, same regex the sibling control uses) ──
const speakerFnMatch = appSrc.match(/function validateCGSpeakerDisplayNames\(beats, knownDisplayNames\) \{[\s\S]*?\n  window\.validateCGSpeakerDisplayNames = validateCGSpeakerDisplayNames;\n/);
const speakerFnSrc = speakerFnMatch ? speakerFnMatch[0] : '';

// ── Extract _parseStructuredPanels (real source, anchor-based — start of the function through its
// closing brace, located by matching brace depth from the known start anchor). ──
const START_ANCHOR = '  function _parseStructuredPanels(raw, sceneIndex) {';
const startIdx = appSrc.indexOf(START_ANCHOR);
let parseFnSrc = null;
if (startIdx !== -1) {
  let depth = 0, i = startIdx, started = false;
  for (; i < appSrc.length; i++) {
    const ch = appSrc[i];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) { i++; break; } }
  }
  parseFnSrc = appSrc.slice(startIdx, i);
}

section('1. EXTRACTION — both real functions found intact in public/app.js');
ok('validateCGSpeakerDisplayNames extracted', !!speakerFnSrc);
ok('_parseStructuredPanels extracted (brace-matched from its real start anchor)', !!parseFnSrc && /return parsed;/.test(parseFnSrc));
ok('the extracted _parseStructuredPanels body actually calls validateCGSpeakerDisplayNames before panel-count enforcement — this is the real wiring, not a re-implementation', !!parseFnSrc && /validateCGSpeakerDisplayNames\(parsed\.panels, null\)/.test(parseFnSrc) && parseFnSrc.indexOf('validateCGSpeakerDisplayNames(parsed.panels, null)') < parseFnSrc.indexOf('Panel count enforcement'));
ok('a rejected candidate returns null from inside the gate (the same failure value every real call site already falls back to prose on)', !!parseFnSrc && /if \(!_speakerGate\.ok\) \{[\s\S]*?return null;/.test(parseFnSrc));

// ── Minimal sandbox: real function sources, plus the small set of helpers/state _parseStructuredPanels
// references beyond parsing/validation itself (JSON repair, composition, cinematic direction, fate,
// APM tagging) — stubbed to no-ops/pass-through since this control is about the SPEAKER GATE placed
// ahead of them, not about re-testing those unrelated systems (already covered by their own controls).
function buildSandbox() {
  const lines = [];
  lines.push('var window = {};');
  lines.push('var console = { log: function(){}, warn: function(m){ __warnings.push(m); } };');
  lines.push('var state = { fateSelectedIndex: -1, fateOptions: null, _apmActiveMotif: false };');
  lines.push('function _tryParseJSON(t) { try { return JSON.parse(t); } catch (_) { return null; } }');
  lines.push('function _repairJSON(t) { return t; }');
  lines.push('function _validateComposition() { return true; }');
  lines.push('function _mapFateToComposition() { return null; }');
  lines.push('function _applyFateDirectional(c) { return c; }');
  lines.push('function _applyCinematicDirection() {}');
  lines.push('function _tagAPMRoles() {}');
  lines.push(speakerFnSrc);
  lines.push(parseFnSrc);
  lines.push('return { parse: _parseStructuredPanels, warnings: function(){ return __warnings; } };');
  const body = 'var __warnings = [];\n' + lines.join('\n');
  return new Function(body)();
}

function runCandidate(panels) {
  const sandbox = buildSandbox();
  const raw = JSON.stringify({ panels: panels });
  const result = sandbox.parse(raw, 0);
  return { result: result, warnings: sandbox.warnings() };
}

// ═══════════════════════════════════════════════════════════════════════════════
section('2. FIRST SACRIFICE — the real Dhokar Raes candidate is ACCEPTED');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const candidatePath = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/16_naming_corrected_candidate.json');
  const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  const allBeats = candidate.draft.scene1Candidate.beats;
  // A real CG generation call produces AT MOST 4 panels per scene (the pipeline's own hard
  // ceiling — see "HARD CEILING: 4 GENERATED IMAGES PER CG SCENE" in _parseStructuredPanels
  // itself); the 20-beat candidate is a richer prose-planning artifact, not what a single
  // generation call emits. Slice to the real candidate's 4 actual dialogue beats — n=5/11/15/18,
  // the exact ones this whole naming arc started from — as a realistic 4-panel test candidate.
  const realBeats = [allBeats[4], allBeats[10], allBeats[14], allBeats[17]];
  // Map the packet's real beat shape (kind/text) onto the live CG panel shape (dialogue/captionText)
  // _parseStructuredPanels actually normalizes — same mapping the renderer itself performs.
  const panels = realBeats.map(function (b) {
    return {
      camera: 'medium', emotion: 'tension', importance: 'medium',
      composition: { shot: 'medium', camera: 'eye_level', framing: 'two_shot', background: 'ceremony clearing', motion: 'none', subject_positions: [{ id: 'lirael', position: 'center', depth: 'foreground', facing: 'forward' }] },
      speaker: b.speaker,
      dialogue: b.kind === 'dialogue' ? b.text : null,
      captionText: b.kind === 'narration' ? b.text : null,
    };
  });
  const { result, warnings } = runCandidate(panels);
  ok('the real, naming-corrected First Sacrifice candidate is ACCEPTED (not rejected) at the acceptance boundary', !!result && Array.isArray(result.panels), result === null ? 'rejected — warnings: ' + JSON.stringify(warnings) : 'accepted');
  ok('every accepted panel keeps its real speaker value intact ("Dhokar Raes" appears, unmodified — a validator that rewrites would be a competing author)', !!result && result.panels.some(function (p) { return p.speaker === 'Dhokar Raes'; }));
  ok('no gate warning fired for the real, correct candidate', !warnings.some(function (w) { return /Rejected —/.test(w); }), JSON.stringify(warnings));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('3. RED — an underscored/raw internal key is rejected BEFORE acceptance');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const panels = [
    { camera: 'medium', emotion: 'tension', importance: 'high', composition: 'A wide ceremonial clearing at dawn, establishing shot', speaker: null, captionText: 'The rite began.' },
    { camera: 'close', emotion: 'tension', importance: 'medium', composition: 'A close shot on the presiding figure, dawn light', speaker: 'the_presiding_Dohkar', dialogue: 'Name the cost you bring to this rite.' },
  ];
  const { result, warnings } = runCandidate(panels);
  ok('the real historical leak (the_presiding_Dohkar) is REJECTED — _parseStructuredPanels returns null, the candidate is never accepted', result === null, result === null ? 'rejected (expected)' : 'WRONGLY ACCEPTED: ' + JSON.stringify(result.panels));
  ok('the rejection is logged with the offending value named — a loud, debuggable reject, not a silent drop', warnings.some(function (w) { return /Rejected —/.test(w) && /the_presiding_Dohkar/.test(w); }), JSON.stringify(warnings));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('4. RED — a dialogue beat with a missing speaker is rejected BEFORE acceptance');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const panels = [
    { camera: 'medium', emotion: 'tension', importance: 'high', composition: 'A wide ceremonial clearing at dawn, establishing shot', speaker: null, captionText: 'The rite began.' },
    { camera: 'close', emotion: 'tension', importance: 'medium', composition: 'A close shot, dawn light, tense expression', speaker: null, dialogue: 'You shaped the wish for your own benefit.' },
  ];
  const { result, warnings } = runCandidate(panels);
  ok('a consequential dialogue beat with NO speaker at all is REJECTED — an absent label is a hard reject, not something the renderer is left to paper over', result === null, result === null ? 'rejected (expected)' : 'WRONGLY ACCEPTED: ' + JSON.stringify(result.panels));
  ok('the rejection is logged as a missing_speaker violation', warnings.some(function (w) { return /Rejected —/.test(w) && /missing_speaker/.test(w); }), JSON.stringify(warnings));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('5. GREEN — non-dialogue narration remains valid (no speaker required, never flagged)');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const panels = [
    { camera: 'medium', emotion: 'calm', importance: 'high', composition: 'A wide dawn clearing, spiralgrass catching the light', speaker: null, captionText: 'Dawn light cut across the clearing in thin blades.' },
    { camera: 'wide', emotion: 'calm', importance: 'medium', composition: 'A second wide establishing shot of the gathered assembly', speaker: null, captionText: 'The assembly watched without sound.' },
  ];
  const { result, warnings } = runCandidate(panels);
  ok('a scene made entirely of narration (no speaker on any panel) is accepted cleanly', !!result && Array.isArray(result.panels));
  ok('no gate warning fires for narration-only panels', !warnings.some(function (w) { return /Rejected —/.test(w); }), JSON.stringify(warnings));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('6. GENERIC — the gate applies to ANY CG story, not only First Sacrifice');
// ═══════════════════════════════════════════════════════════════════════════════
{
  // A wholly unrelated, non-Fatelands story world — same gate, same behavior, no story-specific
  // wiring anywhere in the checked path (validateCGSpeakerDisplayNames(parsed.panels, null) never
  // references First Sacrifice, Fatelands, or any packet/cast-role registry).
  const rejectedPanels = [
    { camera: 'medium', emotion: 'tension', importance: 'high', composition: 'A rain-lit alley behind a jazz club, neon reflected in puddles', speaker: 'club_owner_internal_ref', dialogue: 'You shouldn’t have come back here.' },
  ];
  const acceptedPanels = [
    { camera: 'medium', emotion: 'tension', importance: 'high', composition: 'A rain-lit alley behind a jazz club, neon reflected in puddles', speaker: 'Marisol', dialogue: 'You shouldn’t have come back here.' },
  ];
  const rej = runCandidate(rejectedPanels);
  const acc = runCandidate(acceptedPanels);
  ok('a wholly unrelated non-Fatelands story’s internal-key speaker is rejected by the SAME gate', rej.result === null, JSON.stringify(rej));
  ok('the same unrelated story’s resolved display-name speaker ("Marisol") is accepted by the SAME gate — no First-Sacrifice-specific code path involved', !!acc.result && acc.result.panels[0].speaker === 'Marisol', JSON.stringify(acc));
}

console.log('\n' + '='.repeat(96));
console.log('CG CANDIDATE-ACCEPTANCE GATE CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
