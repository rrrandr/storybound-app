// Trap test for DELIVERED_TO_WRONG_LAYER. The detector reported clean on its first run,
// which is exactly when a detector is least trustworthy. Reconstruct the defect it was
// built for — FORBIDDEN INVENTIONS and the player-decision contract present in the
// planner, absent from the Author — and confirm it fires, then confirm it stays quiet
// when nobody received the directive at all (that is "unused", a different category).
import fs from 'fs';
import { DIRECTIVES, carries } from './_directive_registry.mjs';

const detect = (authorText, otherText) => DIRECTIVES.filter(d =>
  d.expect.includes('author') && !carries(authorText, d.probe) && carries(otherText, d.probe)
).map(d => d.name);

const dir = process.argv[2] || '_validate_out/payload_free';
const files = fs.readdirSync(dir).filter(f => /^payload_\d+\.txt$/.test(f))
  .sort((a, b) => fs.statSync(`${dir}/${a}`).size - fs.statSync(`${dir}/${b}`).size);
const author = fs.readFileSync(`${dir}/${files[files.length - 1]}`, 'utf8');

// Strip the two directives from the AUTHOR side only, leaving them in the planner —
// byte-for-byte the state the codebase was in before today's fix.
const strip = t => t.replace(/FORBIDDEN INVENTIONS/g, 'XX').replace(/PLAYER DECISION AT THE END/g, 'XX');
const planner = 'FORBIDDEN INVENTIONS: do not ... \nPLAYER DECISION AT THE END OF THIS SCENE: ...';

const cases = [
  ['pre-fix state (planner has it, author does not)', strip(author), planner, 2],
  ['post-fix state (author has it)',                  author,        planner, 0],
  ['nobody received it — "unused", not wrong-layer',  strip(author), '',      0],
];
let bad = 0;
for (const [name, a, o, want] of cases) {
  const hits = detect(a, o);
  const ok = hits.length === want;
  if (!ok) bad++;
  console.log(`  ${ok ? 'ok  ' : 'MISS'}  ${String(hits.length).padStart(2)} flagged (want ${want})  ${name}`);
  if (hits.length) console.log(`          ${hits.join(', ')}`);
}
console.log(bad ? `\n${bad} TRAP FAILURE(S)` : '\n3/3 — the detector catches the real defect and does not confuse it with unused');
process.exit(bad ? 1 : 0);
