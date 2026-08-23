// CHARACTER+ RULES — ONE definition, read by every consumer.
//
// app.js:_buildCharacterPlusShared() is the authority. This module READS it rather than
// restating it, because the repair pass previously carried its own hand-written Character+
// definition with six ad-hoc examples — including mechanism A's ("Jess led with her
// décolletage") — and no rotation rule at all. Two definitions of one thing is how the
// repair pass ended up biased toward the exact beat the canonical rule exists to rotate away
// from. A copy would drift again; parsing cannot.
//
// THE MECHANISMS ARE EDITORIAL SLOTS, NOT INTERPRETATIONS. That is why they are a closed set
// and why nothing here infers a character thesis. "Jess uses sexuality to control
// perception" is a reading the system would then bend every future scene toward; "Jess has
// spent A and D" is a fact about what has been used up.
//
// usage: node _cplus_rules.mjs        (print what the consumers receive)
import fs from 'fs';

const APP = 'public/app.js';

export function loadMechanisms(file = APP) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(/lines\.push\('\s{2}([A-I]) · ([^']*)'\);/g)) {
    const [, letter, body] = m;
    const i = body.indexOf(':');
    out.push({ letter, axis: (i > 0 ? body.slice(0, i) : body).trim(), example: i > 0 ? body.slice(i + 1).trim() : '' });
  }
  if (out.length !== 9) {
    throw new Error(`_cplus_rules: expected 9 mechanisms in ${file}, found ${out.length}. `
      + 'The canonical block changed shape — fix the parser rather than forking the taxonomy.');
  }
  return out;
}

// ENVIRONMENT+ AXES. The same idea one level over: an object or place is revealed through a
// finite set of lenses, and the question for a repair pass is never "add a nice detail" but
// "which lens has this thing not been seen through yet?"
export const EPLUS_AXES = [
  { key: 'history',    axis: 'what happened here / to it', example: 'the old scratches where people waited for verdicts are gone' },
  { key: 'use',        axis: 'how it is actually used, versus how it was meant to be', example: 'every chair faces the door except the one at the head' },
  { key: 'damage',     axis: 'what broke and was not fixed', example: 'three of the four chairs match' },
  { key: 'ownership',  axis: 'whose it is, or was', example: 'the burn mark her father left exactly as it was' },
  { key: 'repair',     axis: 'what was mended, and what was left alone', example: 'the sword was re-gripped three times; the blade never touched' },
  { key: 'ritual',     axis: 'what is done here repeatedly', example: 'three shallow places worn where knees have pressed' },
  { key: 'absence',    axis: 'what is missing that should be there', example: 'nobody ever suggested replacing the fourth' },
];

// The rotation instruction, rendered from live state. Deliberately says WHAT IS SPENT and
// WHAT IS FREE, never why a character behaves as they do.
export function renderRotation(spent, available, kind = 'mechanism') {
  if (!spent.length) return '';
  return `  Recently used (do NOT repeat): ${spent.join(', ')}\n`
    + `  Prefer: ${available.join(', ') || '(all spent — deepen an earlier one instead of restating it)'}`;
}

export function renderMechanismMenu(letters) {
  const all = loadMechanisms();
  const pick = letters && letters.length ? all.filter(m => letters.includes(m.letter)) : all;
  return pick.map(m => `  ${m.letter} · ${m.axis}: ${m.example}`).join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = loadMechanisms();
  console.log(`\nCHARACTER+ MECHANISMS — parsed from ${APP} (${m.length}/9)\n`);
  for (const x of m) console.log(`  ${x.letter} · ${x.axis}`);
  console.log(`\nENVIRONMENT+ AXES (${EPLUS_AXES.length})\n`);
  for (const x of EPLUS_AXES) console.log(`  ${x.key.padEnd(10)} ${x.axis}`);
  console.log('');
}
