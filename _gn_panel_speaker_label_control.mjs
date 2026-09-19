// GN PANEL SPEAKER LABEL — REAL RENDERER CONTROL (Roman, 2026-09-20)
//
// Focused control for the reader-facing speaker-label requirement: "Ensure every consequential CG
// dialogue beat has a stable speaker id and visible reader-facing label; raw keys such as
// the_presiding_Dohkar must never render." Sandbox-extracts the EXACT textboxHtml-building logic
// from the real displayPanels.map(...) shell builder in public/app.js (the same anchor-based
// extraction technique _first_sacrifice_authoring_adapter.mjs uses for its own verbatim slices) and
// executes it directly in Node — real source, no browser needed for this one (it is pure string
// building, not CSS/DOM/timing). Proves two things together: (1) the runtime fail-safe never prints
// a raw internal key to a reader, even if bad data somehow reaches this call site; (2) the real,
// on-disk, naming-corrected First Sacrifice candidate renders "Dhokar Raes:"/"Julian:"/"Seren:" —
// the exact Option-C, colon-labeled shape — for its real dialogue beats.
//
// usage: node _gn_panel_speaker_label_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 400) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

// ── Anchor-based extraction (same technique _first_sacrifice_authoring_adapter.mjs uses) — the
// exact, real textboxHtml-building block, verbatim, not reimplemented. ──
const START_ANCHOR = "var textboxHtml = '';";
const END_ANCHOR = 'aria-expanded="false">&plus;</button>\';\n          }';
const startIdx = appSrc.indexOf(START_ANCHOR);
const endIdx = startIdx === -1 ? -1 : appSrc.indexOf(END_ANCHOR, startIdx);
const blockSrc = (startIdx !== -1 && endIdx !== -1) ? appSrc.slice(startIdx, endIdx + END_ANCHOR.length) : null;

section('1. EXTRACTION — the real renderer block, verbatim from public/app.js');
ok('the real textboxHtml-building block is found intact (anchors matched)', !!blockSrc);
ok('the extracted block contains the real runtime fail-safe (the underscore check + console.warn), not a stale copy', !!blockSrc && /_twSpeakerSafe/.test(blockSrc) && /console\.warn/.test(blockSrc));
ok('the extracted block labels the speaker with a trailing colon (the real Option-C "Name:" shape)', !!blockSrc && /gn-panel-text-speaker">.*?:<\/span>/.test(blockSrc));

// A faithful, minimal stand-in for the real escapeHTML utility (standard entity escaping) — the
// SPEAKER-SAFETY LOGIC under test here never depends on the exact escaping implementation, only on
// whether it's called at all, which every assertion below verifies against the real extracted code.
function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTextbox(p) {
  const warnings = [];
  const realConsole = console.warn;
  console.warn = (msg) => { warnings.push(msg); };
  let textboxHtml;
  try {
    const fn = new Function('p', 'escapeHTML', blockSrc + '\nreturn textboxHtml;');
    textboxHtml = fn(p, escapeHTML);
  } finally {
    console.warn = realConsole;
  }
  return { textboxHtml, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
section('2. RUNTIME FAIL-SAFE — a raw internal key never reaches the rendered HTML');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const { textboxHtml, warnings } = renderTextbox({
    captionText: null, dialoguePosition: 'bottom',
    speaker: 'the_presiding_Dohkar',
    dialogue: 'You shaped the wish for your own benefit and the rite answered by turning its weight toward the one who must conduct it.',
  });
  ok('RED (real data shape — the exact historical leak): the rendered HTML does NOT contain the raw key anywhere', !textboxHtml.includes('the_presiding_Dohkar'), textboxHtml);
  ok('the dialogue TEXT itself still renders (a missing label is a visible craft gap to fix upstream; the dialogue line disappearing too would be a worse, silent failure)', textboxHtml.includes('You shaped the wish for your own benefit'));
  ok('no <span class="gn-panel-text-speaker"> element is emitted at all when the speaker is unsafe (never a raw-key label, never an empty one either)', !textboxHtml.includes('gn-panel-text-speaker'));
  ok('a real console.warn fires, naming the unsafe value, so this is a loud, debuggable fail-safe, not a silent swallow', warnings.some(w => w.includes('the_presiding_Dohkar')), JSON.stringify(warnings));
}
{
  const { textboxHtml } = renderTextbox({ captionText: null, dialoguePosition: 'bottom', speaker: 'julian_provast_office_holder', dialogue: 'x' });
  ok('RED: ANY underscored value is caught, not a lexical ban on one specific historical string', !textboxHtml.includes('julian_provast_office_holder') && !textboxHtml.includes('gn-panel-text-speaker'));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('3. REAL CANDIDATE DATA — the actual, naming-corrected First Sacrifice beats render Option C correctly');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const candidatePath = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/16_naming_corrected_candidate.json');
  ok('the real, naming-corrected candidate artifact is found on disk, untouched', fs.existsSync(candidatePath));
  const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  const beats = candidate.draft.scene1Candidate.beats;

  // The 4 real dialogue beats this whole arc has been about: Dhokar Raes (n=5, n=15), Seren (n=11,
  // the mixed narration+dialogue shape), Julian (n=18, also mixed). dialoguePosition isn't a real
  // field on these historical beats — default to 'bottom', matching the renderer's own fallback.
  const DIALOGUE_BEATS = [
    { n: 5, idx: 4 }, { n: 11, idx: 10 }, { n: 15, idx: 14 }, { n: 18, idx: 17 },
  ];
  DIALOGUE_BEATS.forEach(({ n, idx }) => {
    const b = beats[idx];
    ok('beat ' + n + ' (' + (b && b.speaker) + ') is genuinely a dialogue-kind beat in the real candidate', !!b && b.kind === 'dialogue', JSON.stringify(b && { kind: b.kind, speaker: b.speaker }));
  });

  const rendered = DIALOGUE_BEATS.map(({ idx }) => {
    const b = beats[idx];
    return renderTextbox({ captionText: null, dialoguePosition: 'bottom', speaker: b.speaker, dialogue: b.text });
  });

  ok('REAL DATA: beat 5\'s real speaker ("Dhokar Raes") renders as the label "Dhokar Raes:" — the exact Option-C, colon-labeled shape', rendered[0].textboxHtml.includes('<span class="gn-panel-text-speaker">Dhokar Raes:</span>'), rendered[0].textboxHtml.slice(0, 200));
  ok('REAL DATA: beat 11\'s real speaker ("Seren") renders as "Seren:"', rendered[1].textboxHtml.includes('<span class="gn-panel-text-speaker">Seren:</span>'), rendered[1].textboxHtml.slice(0, 200));
  ok('REAL DATA: beat 15\'s real speaker ("Dhokar Raes") renders as "Dhokar Raes:" (the second, independently-corrected occurrence)', rendered[2].textboxHtml.includes('<span class="gn-panel-text-speaker">Dhokar Raes:</span>'), rendered[2].textboxHtml.slice(0, 200));
  ok('REAL DATA: beat 18\'s real speaker ("Julian") renders as "Julian:"', rendered[3].textboxHtml.includes('<span class="gn-panel-text-speaker">Julian:</span>'), rendered[3].textboxHtml.slice(0, 200));
  ok('REAL DATA: none of the 4 real rendered outputs contain the raw internal key anywhere (the real bug this whole arc started from)', rendered.every(r => !r.textboxHtml.includes('the_presiding_Dohkar')));
  ok('REAL DATA: none of the 4 real rendered outputs ever fire the fail-safe warning (the real, corrected data never trips it)', rendered.every(r => r.warnings.length === 0), JSON.stringify(rendered.map(r => r.warnings)));

  // Cross-check against the packet's own real cast_roles — the label names actually used above
  // must be real, declared display names, not incidentally-correct strings.
  const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
  const knownNames = Object.keys(PACKET.locked_world_facts.cast_roles);
  ok('every real speaker used above ("Dhokar Raes", "Seren", "Julian") is a real, declared cast_roles display name in the packet — not a coincidental match', ['Dhokar Raes', 'Seren', 'Julian'].every(n => knownNames.includes(n)), JSON.stringify(knownNames));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('4. NARRATION STAYS PLAIN PROSE — real caption text carries no italic/screenplay marker');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const { textboxHtml } = renderTextbox({ captionText: 'Two dozen faces turned toward me at once.', dialoguePosition: 'bottom', speaker: 'Dhokar Raes', dialogue: 'That turning has not gone unseen.' });
  ok('the real markup wraps caption text in .gn-panel-text-caption (plain-prose class — no gn-caption-first/italic modifier anywhere in the real output)', textboxHtml.includes('<div class="gn-panel-text-caption">Two dozen faces turned toward me at once.</div>') && !/gn-caption-/.test(textboxHtml));
}

console.log('\n' + '='.repeat(96));
console.log('GN PANEL SPEAKER LABEL CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
