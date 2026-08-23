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

// SHAPE GUARD. Examples teach the AXIS, never the SURFACE FORM — and this is the same
// displacement seen everywhere else in this project: ban the heel and the model moves to the
// sole; ban glow on hands and it moves to the sigil; give an exemplar and it keeps the
// skeleton and swaps the nouns. Mechanism B's "Marcus asked how my mother was before he asked
// for the money. He always does it in that order." came back as "The Dohkar asked for Julian
// before he asked for my answer. He always did it in that order." — same idea, which is fine;
// same shape, which is not.
//
// Content words are blanked so only connective tissue and clause order remain, then any long
// shared run of that skeleton is an imitation regardless of subject matter.
const FUNCTION_WORDS = new Set(('a an the of to in on at and or but for with when while as if than then '
  + 'that this these those he she they it his her their my our your him them me us i we you '
  + 'is are was were be been being do does did done have has had will would could should '
  + 'not no never always usually once again before after until because so very just only even '
  + 'still yet already about into over under from by out up down off through').split(' '));

// Tense and number are surface, not shape: "he always DOES it in that order" and "he always
// DID it in that order" are the same skeleton. Content runs collapse to a single slot so a
// two-word noun phrase still aligns with a one-word one.
const LEMMA = { does: 'do', did: 'do', done: 'do', is: 'be', are: 'be', was: 'be', were: 'be',
  been: 'be', being: 'be', has: 'have', had: 'have', would: 'will', could: 'can' };
const skeleton = t => String(t).toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/)
  .filter(Boolean).map(w => (FUNCTION_WORDS.has(w) ? (LEMMA[w] || w) : '_'))
  .join(' ').replace(/(?:_ )+_/g, '_');

const grams = (t, n) => {
  const w = skeleton(t).split(' ');
  const out = [];
  for (let i = 0; i + n <= w.length; i++) {
    const g = w.slice(i, i + n);
    // A run of blanks and articles matches everything; require real connective tissue.
    if (g.filter(x => x !== '_' && !['the', 'a', 'an', 'of', 'to'].includes(x)).length >= 2) out.push(g.join(' '));
  }
  return out;
};

const SHAPE_N = 6;

// Returns the exemplar letter whose skeleton the text reuses, or null.
export function shapeEcho(text, mechanisms = loadMechanisms()) {
  const mine = new Set(grams(text, SHAPE_N));
  for (const m of mechanisms) {
    for (const g of grams(m.example, SHAPE_N)) if (mine.has(g)) return { letter: m.letter, shared: g };
  }
  return null;
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
