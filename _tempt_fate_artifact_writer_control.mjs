// ARTIFACT-WRITER CONTROL — proves the live-run script's artifact writer handles the REAL
// state.scenes[last] shape, using the RETAINED response from the 2026-09-23 paid run.
//
// Roman: "Also dry-fix the harness artifact writer so it handles the real state.scenes[last] object
// shape and reaches safeExit. Prove this with the retained response; do not rerun the provider
// merely to test file output."
//
// Zero network of any kind: this reads the retained artifacts off disk.
//
// usage: node _tempt_fate_artifact_writer_control.mjs

import { sceneToText } from './_tempt_fate_scene_text.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RETAINED = path.join(__dirname, '_tempt_fate_memory_erasure_live_run_out', 'scene_a_result.json');
const OUT_DIR = path.join(__dirname, '_tempt_fate_artifact_writer_control_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 300) : '')); };

console.log('=== ARTIFACT-WRITER CONTROL (retained response; zero network) ===\n');

const retained = JSON.parse(fs.readFileSync(RETAINED, 'utf8'));
const scene = retained.renderedSceneText;

// THE CONTROL MUST BITE: if the retained value were already a string, this would prove nothing.
ok('the retained scene really is an OBJECT, not a string — the exact shape that crashed the paid run',
  scene !== null && typeof scene === 'object' && !Array.isArray(scene), 'typeof=' + typeof scene);
ok('it carries the real keys observed in the paid run ({title, synopsis, text, fateCard})',
  !!(scene && typeof scene.text === 'string'), Object.keys(scene || {}).join(','));

// Reproduce the ORIGINAL failure, so the fix is measured against a real reproduction.
let originalThrew = null;
try { fs.writeFileSync(path.join(OUT_DIR, 'original_behaviour.txt'), scene); }
catch (e) { originalThrew = e && e.code; }
ok('the ORIGINAL code path (passing the object straight to fs.writeFileSync) reproduces the exact crash: ERR_INVALID_ARG_TYPE',
  originalThrew === 'ERR_INVALID_ARG_TYPE', 'threw=' + originalThrew);

// The fix.
const text = sceneToText(scene);
let fixedThrew = null;
try { fs.writeFileSync(path.join(OUT_DIR, 'scene_a_rendered_text.txt'), text); }
catch (e) { fixedThrew = e && e.message; }
ok('the FIXED writer produces a string and writes without throwing', fixedThrew === null && typeof text === 'string', 'threw=' + fixedThrew);
ok('the written text is the real scene prose, not a JSON dump of the wrapper object',
  text.length > 200 && text.indexOf('"synopsis"') === -1, 'len=' + text.length + ' head=' + JSON.stringify(text.slice(0, 80)));

// Every other shape the writer can legitimately receive.
ok('a plain string passes through unchanged', sceneToText('already text') === 'already text');
ok('null/undefined become an empty string rather than throwing', sceneToText(null) === '' && sceneToText(undefined) === '');
ok('a beats-array plan is joined into readable prose', sceneToText({ beats: [{ text: 'one' }, { text: 'two' }] }) === 'one\n\ntwo');
ok('an unrecognised object degrades to JSON rather than throwing', sceneToText({ odd: 1 }).indexOf('"odd"') !== -1);

// The consequence that actually mattered: the crash happened AFTER Scene A settled and preempted
// safeExit. With writes that cannot throw, the run reaches its clean exit path.
ok('the writer cannot throw for any of the shapes above — so an artifact write can no longer preempt safeExit',
  results.filter((r) => !r.pass).length === 0);

fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
const passed = results.filter((r) => r.pass).length;
console.log('\n' + '='.repeat(100));
console.log('ARTIFACT-WRITER CONTROL: ' + passed + '/' + results.length + ' passed');
console.log('written to ' + OUT_DIR + '/');
process.exitCode = results.every((r) => r.pass) ? 0 : 1;
