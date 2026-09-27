// PROVENANCE TRACE — read-only. Reconstructs the THREE candidate texts for one accepted scene and
// compares them against the artifact the harness captured from state.scenes[last].
import fs from 'node:fs';
const D = '/Users/romantsukerman/storybound-app/_tempt_fate_fixtures/run_2026-09-24_02-11-02_scene_a/';
const plan = JSON.parse(fs.readFileSync(D + 'scene_a_raw_output.txt', 'utf8'));
const rendered = fs.readFileSync(D + 'scene_a_rendered_text.txt', 'utf8');
const extractorProse = fs.readFileSync(
  '/Users/romantsukerman/storybound-app/_tempt_fate_fixtures/extractor_only_2026-09-27_06-02-49/extractor_user_prompt.txt',
  'utf8').replace(/^THE ACCEPTED SCENE:\n\n/, '').trim();

// (A) proseAssembled, as public/app.js:237072 builds it at state.scenes.push
const label = (b) => {
  if (!b || b.kind !== 'dialogue' || !b.speaker || typeof b.speaker !== 'string') return '';
  let sp = b.speaker.trim(), name = sp;
  if (sp === 'protagonist') name = 'Lirael';
  else if (sp === 'li') name = 'Julian';
  name = String(name).trim(); if (!name) return '';
  if (new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:', 'i').test(String(b.text || '').trim())) return '';
  return name.toUpperCase() + ': ';
};
const A = plan.beats.map((b) => label(b) + (b.text || '')).join('\n\n');
// (B) the post-acceptance re-sync, public/app.js:237444 — beat text ONLY, no label
const B = plan.beats.map((b) => (b && b.text) || '').join('\n\n');
// (C) _extractCGSceneText — what the extractor was actually fed
const C = (() => {
  const parts = [];
  plan.beats.forEach((b) => {
    if (!b) return;
    const t = (typeof b.text === 'string' && b.text.trim()) ? b.text.trim() : '';
    if (t) parts.push(t);
    if (typeof b.dialogue === 'string' && b.dialogue.trim()) {
      const sp = (typeof b.speaker === 'string' && b.speaker.trim()) ? b.speaker.trim() + ': ' : '';
      parts.push(sp + '"' + b.dialogue.trim() + '"');
    }
  });
  return parts.join('\n').trim();
})();

const norm = (s) => String(s).replace(/\r\n/g, '\n').trim();
const show = (n, s) => console.log('  ' + n.padEnd(46) + ' len=' + String(s.length).padEnd(6)
  + ' labels=' + (/^[A-Z][A-Z .''-]*: /m.test(s) ? 'YES' : 'no ')
  + ' rawMarkers=' + (/<<|>>/.test(s) ? 'YES' : 'no '));

console.log('=== THE THREE CANDIDATE TEXTS FOR ONE ACCEPTED SCENE ===');
show('(A) proseAssembled @ state.scenes.push  :237072', A);
show('(B) re-sync overwrite of .text          :237444', B);
show('(C) _extractCGSceneText (fed to extractor)', C);
show('    captured state.scenes[last] artifact', rendered);
show('    prose the extractor actually received', extractorProse);

console.log('\n=== WHICH CANDIDATE MATCHES THE CAPTURED state.scenes[last]? ===');
console.log('  (A) === captured : ' + (norm(A) === norm(rendered)));
console.log('  (B) === captured : ' + (norm(B) === norm(rendered)));
console.log('  (C) === captured : ' + (norm(C) === norm(rendered)));
console.log('\n=== WHAT THE EXTRACTOR GOT vs THE READER TEXT ===');
console.log('  extractor prose === captured reader text : ' + (norm(extractorProse) === norm(rendered)));
console.log('  extractor prose === (C)                  : ' + (norm(extractorProse) === norm(C)));
console.log('  byte delta vs reader text                : ' + (norm(rendered).length - norm(extractorProse).length) + ' chars');

console.log('\n=== OFFSET FEASIBILITY: can every beat be located in candidate (A)? ===');
let cursor = 0, ok = 0, ambiguous = [];
plan.beats.forEach((b, i) => {
  const lab = label(b), body = (b.text || '');
  const seg = lab + body;
  const at = A.indexOf(seg, cursor);
  const uniq = A.split(seg).length - 1;
  if (at === -1) { ambiguous.push('beat ' + i + ': NOT FOUND'); return; }
  ok++;
  if (uniq > 1) ambiguous.push('beat ' + i + ': text occurs ' + uniq + 'x (non-unique — needs sequential cursor, not search)');
  cursor = at + seg.length + 2;
});
console.log('  beats locatable by sequential construction: ' + ok + '/' + plan.beats.length);
console.log('  label present on dialogue beats: ' + plan.beats.filter((b) => label(b)).length
  + ' of ' + plan.beats.filter((b) => b.kind === 'dialogue').length + ' dialogue beats');
if (ambiguous.length) ambiguous.forEach((a) => console.log('  ! ' + a));
else console.log('  no ambiguity: every beat maps to exactly one [start,end) in (A)');
