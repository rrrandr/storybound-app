// Extracts readable prose from a captured CG author payload and writes it alongside the run's other
// artifacts. Written after the 2026-09-23 authorized run, where the live script assumed
// state.scenes[last] was a string and crashed on fs.writeFileSync when it turned out to be an
// object — the scene content was never lost (it is inside scene_a_result.json and the raw output),
// but the human-readable artifact the authorization asked for was not produced.
//
// usage: node _tempt_fate_extract_scene_text.mjs <raw_output.json> <out.txt>

import fs from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('usage: node _tempt_fate_extract_scene_text.mjs <raw_output.json> <out.txt>'); process.exit(2); }

const plan = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const beats = Array.isArray(plan.beats) ? plan.beats : [];
const lines = beats.map((b, i) => {
  const kind = b.kind || '?';
  const who = b.speaker ? String(b.speaker) : null;
  const text = b.text != null ? String(b.text) : '';
  const head = '[' + String(i).padStart(2, '0') + ' ' + kind + (who ? ' · ' + who : '') + ']';
  return head + '\n' + text;
});
const out = lines.join('\n\n');
fs.writeFileSync(outPath, out);
console.log('beats: ' + beats.length + '  ·  characters: ' + out.length);
console.log('microDecision: ' + JSON.stringify(plan.microDecision));
console.log('temptFateOutcome: ' + JSON.stringify(plan.temptFateOutcome));
console.log('written to ' + outPath);
