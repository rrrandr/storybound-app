// PERCEPTION AUDIT — did the scene ALLOCATE MEANING correctly?
//
// Supersedes _storybound_plus.mjs, which asked "did Character+ happen?" and reported zero
// beats as failure. Under the corrected hierarchy — conductor decides IF perception gets
// space, governor decides WHO earned it, Storybound+ decides HOW it works — a scene with
// zero beats can be entirely successful when pressure, action and consequence already carry
// the meaning. Counting beats measures the wrong thing.
//
// WHAT THIS TOOL DECIDES:  who exerts pressure, where interpretive attention landed,
//                          whether a beat has a chosen act and a cost.
// WHAT IT REFUSES TO DECIDE: the removal test, and whether a reading is CORRECT. A wrong
//                          reading that reveals the observer is a SUCCESS, not an error —
//                          no pattern can tell those apart, so both are handed to the human.
//
// usage: node _perception_audit.mjs <scene.txt> [--lens=OPEN_VEIN]
import fs from 'fs';

const CAST = [
  { name: 'Lirael', role: 'POV' }, { name: 'Julian', role: 'primary' },
  { name: 'Seren', role: 'primary' }, { name: 'Dohkar', role: 'secondary' },
];
const OTHERS = [[/\bold woman\b/i, 'old woman'], [/\bstranger\b/i, 'stranger'],
                [/\byoung man\b/i, 'young man'], [/\bcousin\b/i, 'cousin'],
                [/\bauditor\b/i, 'auditor'], [/\bassembly\b/i, 'the assembly']];
const OBJECTS = [[/\bveilwood\b/i, 'Veilwood'], [/\bspiralgrass\b/i, 'spiralgrass'],
                 [/\bweave-script\b/i, 'Weave-Script'], [/\b(tarot )?deck\b|\bcards?\b/i, 'the deck'],
                 [/\bband\b/i, 'the band'], [/\bsigil\b/i, 'sigil'], [/\bscar\b/i, 'a scar'],
                 [/\bsash\b/i, 'sash'], [/\bclearing\b/i, 'the clearing']];

// 1. PRESSURE = any force that changes another entity's available choices. Overt action is
// only one class; filling every silence removes the room's option to question you, which is
// why the first version scored Julian as a bystander while he was running the scene.
// Does this window contain dialogue attributable to the entity? Quote marks plus either a
// speech verb or the name adjacent to the quote.
const QUOTED = /[“"][^”"]{6,}[”"]/;
const SPEECH_VERB = /\b(said|asked|answered|replied|spoke|called|murmured|whispered|demanded|told)\b/i;
// Pressure carried INSIDE dialogue: a challenge, demand, verdict or ultimatum.
const DIALOGUE_PRESSURE = [
  /[“"][^”"]{0,120}\b(will you|explain|why did|who did|answer me|name what|tell them|you have|you broke|you must)\b/i,
  /[“"][^”"]{0,120}\?[”"]/,
];

const PRESSURE_CLASSES = [
  // EXTERNAL — force applied in the room: accusation, demand, threat, competition, and the
  // social kind (controlling silence, attention or status), which is force all the same.
  ['external', [...DIALOGUE_PRESSURE, /\b(?:demanded|accused|challenged|ordered|commanded|threatened|forbade|seized|blocked|struck|refused|interrupted|corrected)\b/i,
                /\bexplain yourself\b/i, /\b(?:will|must) (?:answer|explain|account)\b/i,
                /\bnever once let\b/i, /\b(?:filled|fills|filling) every silence\b/i,
                /\bbefore (?:anyone|they|he|she) (?:could|finished)\b/i, /\bspoke first\b/i, /\bcut across\b/i,
                /\bdid not (?:release|move|look away|lower)\b/i, /\bthe room (?:waited|went still|turned)\b/i]],
  // INTERNAL — temptation, memory, an unresolved choice, identity conflict. No antagonist
  // required: Mara alone with the letter is a pressure vector.
  ['internal', [/\b(?:chose|decided|made (?:her|him)self|let (?:it|him|her) (?:go|be)|did not (?:reread|look|answer|reach))\b/i,
                /\b(?:instead of|rather than) (?:reading|reaching|asking|saying|keeping)\b/i,
                /\bcould have\b[^.]{0,50}\bdid not\b/i, /\bturned away from\b/i, /\bfolded it away\b/i,
                /\bswallowed the\b/i, /\bkept (?:it|that) to (?:her|him)self\b/i, /\bremembered\b/i]],
  // RELATIONAL — someone whose regard matters: to impress, to not disappoint, to be seen by.
  ['relational', [/\b(?:wanted|needed) (?:him|her|them) to (?:see|believe|understand|forgive)\b/i,
                  /\bcould not bear (?:to|that|his|her)\b/i, /\bwhat (?:he|she|they) would think\b/i,
                  /\bin front of (?:him|her|them)\b/i, /\b(?:his|her|their) (?:regard|approval|opinion|judgement)\b/i,
                  /\bhad not looked away\b/i, /\bwatched (?:me|her|him) without\b/i]],
  // ENVIRONMENTAL — a place or object forcing a decision, or a history creating obligation.
  // A sword on a wall is nothing; a sword a father died believing his son a coward is pressure.
  ['speaks', [QUOTED]],
  ['environmental', [/\b(?:pressed|weighed|sat heavy|would not let|kept) (?:into|against|in) (?:my|her|his) (?:palm|hand|chest)\b/i,
                     /\bstill (?:in|against) (?:my|her|his) hand\b/i, /\bhad belonged to\b/i,
                     /\bhe had died believing\b/i, /\bnobody had (?:moved|touched|taken) it since\b/i,
                     /\bthe (?:room|place|ground) remembered\b/i]],
];
const ABSORBS = [/\b(?:could not|had to|was forced|swayed|staggered|knelt|failed to|missed|closed on nothing|no sound)\b/i,
                 /\b(?:accused|blamed|suspected|judged) (?:of|her|him|them)\b/i];

// MEANING THEFT — the narrator states the psychological truth before the protagonist earns
// it. Allowed when framed as the PC's BELIEF (she thought / it seemed to her); theft when
// asserted as fact. Probably the next failure mode after purple prose.
const INTERIOR = [/\b(?:desperate |deep |quiet |secret )?(?:need|fear|insecurity|shame|desperation|longing|vulnerability)\s+to\s+(?:appear|seem|look|be seen)\b/i,
                  /\bwas (?:afraid|insecure|desperate|ashamed|terrified) (?:of|that|to)\b/i,
                  /\bbecause (?:he|she|they) (?:feared|was afraid|hated himself|could not admit)\b/i,
                  /\b(?:revealing|betraying) (?:his|her|their) (?:fear|insecurity|shame|need)\b/i];
const BELIEF_FRAME = [/\b(?:thought|wondered|decided|guessed|suspected|read it as|took it for|it seemed to her|to her it|she was sure|she told herself)\b/i];

// 2/3. A Character+ beat: a CHOSEN act plus a cost or a stated perception goal.
const CHOSEN = [/\b(?:corrected|insisted|volunteered|arranged|staged|emphasi[sz]ed|displayed|concealed|offered|avoided|controlled|performed|rehearsed|practi[sc]ed|announced|repeated|adjusted|refreshed|smoothed|answered before|never once let|always waited|kept wearing)\b/i];
const COST   = [/\bcould not (?:risk|survive|bear|afford|admit)\b/i, /\bnever (?:once )?(?:pronounced|learned|been taught|replaced)\b/i,
                /\bthough (?:nobody|no one)\b/i, /\binstead of\b/i, /\bwanted (?:them|the room|everyone) to\b/i,
                /\bbefore (?:anyone|any of them|they|he|she) (?:could|finished|had|might)\b/i,
                /\bevery (?:silence|question|accusation|door|room)\b/i, /\bnever once\b/i,
                /\bthe way people do when\b/i, /\bso (?:that )?no one\b/i];
const INVOLUNTARY = [/\btrembl|\bshook\b|breath (?:caught|hitched)|\bflinch|muscle jumped|\bblushed?\b|\bwinced\b|\bswallowed\b|jaw (?:tightened|clenched)|\breflexiv|\binvoluntar|\bunconscious(?:ly)?\b|\bcould not help\b/i];

// 4. Description+: a permanent fact given a PC-specific meaning.
const PERMANENT = [/\b(?:always|never|had always|for generations|centuries|every year|still)\b/i];
const MEANING   = [/\bas (?:though|if)\b/i, /\bhad (?:learned|spent|forgotten|stopped)\b/i, /\brecorded\b/i,
                   /\brefused\b/i, /\bgrowing around\b/i, /\bwas not\b[^.]{0,50}\bit was\b/i];


// A vector enters the denominator only if it clears its class gate. Conservative by design.
const QUALIFY = {
  // A named or titled character who SPEAKS is owed a mask, pressure or not.
  speaks: { test: w => QUOTED.test(w) && (SPEECH_VERB.test(w) || true), why: 'a named or titled character speaks' },
  external: { test: w => true, why: 'attempts to alter another entity’s action or state' },
  internal: { test: w => true, why: 'a choice is being made or withheld' },
  // Proximity is not relational pressure. The PC's state must move because of them.
  relational: {
    test: w => /\b(?:could not bear|what (?:he|she|they) would think|in front of (?:him|her|them)|(?:his|her|their) (?:regard|approval|opinion|judgement)|wanted (?:him|her|them) to (?:see|believe|understand|forgive))\b/i.test(w),
    why: 'the PC’s choice or standing turns on their regard' },
  // The highest bar. A place is not pressure for being atmospheric or strange — it must
  // force a choice, constrain behaviour, or carry an inherited obligation.
  environmental: {
    test: w => /\b(?:had belonged to|died believing|nobody had (?:moved|touched|taken) it since|would not let (?:her|him|me)|the (?:room|place|ground) remembered|last thing .{0,30} touched)\b/i.test(w),
    why: 'forces a choice, constrains behaviour, or carries an obligation' },
};

const sentences = t => String(t).split(/(?<=[.!?"”])(?=[A-Z"“‘'])|(?<=[.!?"”])\s+/).map(x => x.trim()).filter(Boolean);
const any = (arr, t) => arr.some(r => r.test(t));

const file = process.argv.find(a => !a.startsWith('--') && a.endsWith('.txt'));
const lens = (process.argv.find(a => a.startsWith('--lens=')) || '=').split('=')[1] || '(not supplied)';
const t = fs.readFileSync(file, 'utf8');
const S = sentences(t);

const entities = [
  ...CAST.map(c => ({ label: c.name, role: c.role, rx: new RegExp(`\\b${c.name}\\b`) })),
  ...OTHERS.map(([rx, l]) => ({ label: l, role: 'incidental', rx })),
  ...OBJECTS.map(([rx, l]) => ({ label: l, role: 'object', rx })),
].filter(e => S.some(s => e.rx.test(s)));

console.log(`\n${'═'.repeat(80)}\nPERCEPTION AUDIT   ${file}\nLens: ${lens}\n${'═'.repeat(80)}`);

// ── 1. PRESSURE MAP ────────────────────────────────────────────────────────
console.log('\n1. PRESSURE MAP');
for (const e of entities) {
  const mine = [];
  S.forEach((sent, i) => {
    if (!e.rx.test(sent)) return;
    if (i > 0 && !CAST.some(c => c.name !== e.label && new RegExp(`\\b${c.name}\\b`).test(S[i - 1]))) mine.push(S[i - 1]);
    for (let k = i; k <= Math.min(i + 2, S.length - 1); k++) {
      if (k > i && CAST.some(c => c.name !== e.label && new RegExp(`\\b${c.name}\\b`).test(S[k]))) break;
      mine.push(S[k]);
    }
  });
  const allowed = e.role === 'object' ? ['environmental'] : ['speaks', 'external', 'internal', 'relational', 'environmental'];
  e.mineJoined = mine.join(' ');
  e.claims = [];
  for (const [n, pats] of PRESSURE_CLASSES) {
    if (!allowed.includes(n)) continue;
    const named = mine.filter(x => e.rx.test(x));
    const clean = mine.filter(x => !e.rx.test(x)
      && !entities.some(o => o.label !== e.label && o.rx.test(x)));
    const ev = named.find(x => any(pats, x)) || clean.find(x => any(pats, x));
    if (!ev) continue;
    const q = QUALIFY[n];
    e.claims.push({ cls: n, ev, ok: q.test(mine.join(' ')), why: q.why });
  }
  e.classes = e.claims.filter(c => c.ok).map(c => c.cls);
  e.rejected = e.claims.filter(c => !c.ok);
  e.absorbs = mine.some(s => any(ABSORBS, s));
  e.pressure = e.classes.length > 0 || e.absorbs;
  const v = e.classes.length ? 'APPLIES (' + e.classes.join('+') + ')' : e.absorbs ? 'absorbs' : 'present only';
  console.log(`   ${e.label.padEnd(14)} ${e.role.padEnd(11)} ${v}`);
}

// ── 2-4. ATTENTION + VALIDATION ────────────────────────────────────────────
const beats = [];
for (const e of entities) {
  const idx = S.map((s, i) => (e.rx.test(s) ? i : -1)).filter(i => i >= 0);
  for (const i of idx) {
    for (let k = i; k <= Math.min(i + 2, S.length - 1); k++) {
      if (k > i && CAST.some(c => c.name !== e.label && new RegExp(`\\b${c.name}\\b`).test(S[k]))) break;
      const w = S.slice(i, k + 1).join(' ');
      if (e.role === 'object') {
        if (any(PERMANENT, w) && any(MEANING, w)) { beats.push({ e, w, kind: 'Description+' }); break; }
      } else if (any(CHOSEN, w) && (any(COST, w) || any(MEANING, w))) {
        beats.push({ e, w, kind: 'Character+' }); break;
      } else if (any(INVOLUNTARY, w) && !any(CHOSEN, w)) {
        beats.push({ e, w, kind: 'tell (not a beat)' }); break;
      }
    }
  }
}
const seen = new Set();
const real = beats.filter(b => b.kind !== 'tell (not a beat)')
  .filter(b => (seen.has(b.w) ? false : seen.add(b.w)));
const tells = beats.filter(b => b.kind === 'tell (not a beat)');

console.log('\n2. ATTENTION ALLOCATION');
if (!real.length) console.log('   no interpretive beats — legitimate if pressure/action/consequence carried the scene');
for (const b of real) {
  const onPressure = b.e.pressure || b.e.role === 'object';
  console.log(`   ${onPressure ? 'ON pressure ' : 'on BYSTANDER'}  [${b.kind}] ${b.e.label}`);
}
const misallocated = real.filter(b => !b.e.pressure && b.e.role !== 'object');
if (misallocated.length) console.log(`   ⚠ ${misallocated.length} beat(s) spent on entities exerting no pressure`);

console.log('\n3/4. CANDIDATES — validate by hand');
for (const b of real) console.log(`   • [${b.kind} · ${b.e.label}] ${b.w.slice(0, 165)}`);
if (tells.length) {
  console.log('\n   TELLS (texture, not beats — involuntary, no chosen act):');
  for (const x of [...new Map(tells.map(x => [x.w, x])).values()].slice(0, 5))
    console.log(`   – [${x.e.label}] ${x.w.slice(0, 120)}`);
}

const theft = S.filter(x => any(INTERIOR, x) && !any(BELIEF_FRAME, x));
if (theft.length) {
  console.log('\nMEANING THEFT — the prose states the psychological truth before the PC earns it:');
  for (const x of theft.slice(0, 5)) console.log(`   ⚠ ${x.slice(0, 150)}`);
  console.log('   Reframe as a chosen behaviour, or as the PC\'s belief, and let the reader do the work.');
}
console.log(`\n${'─'.repeat(80)}`);
const vectors = entities.filter(e => e.classes.length > 0);
const disqualified = entities.filter(e => e.classes.length === 0 && e.rejected && e.rejected.length);
// Conversion is generous: 2 = full chosen-mask beat, 1 = acknowledged with some interpretive
// move, 0 = passed over. A partial read still beats none.
const TRAIT = [/\bwas (?:kind|cruel|careful|proud|patient|protective|meticulous|cautious)\b/i,
               /\b(?:always|never) (?:checked|arrived|sat|stood|carried)\b/i];
const level = e => real.some(b2 => b2.e.label === e.label) ? 2
  : (e.mineJoined && any(MEANING, e.mineJoined)) ? 1 : 0;
const revealed = e => {
  const w = e.mineJoined || '';
  if (real.some(b2 => b2.e.label === e.label)) return 'C) CHOSEN PERFORMANCE';
  if (any(TRAIT, w)) return 'B) trait';
  if (any(INVOLUNTARY, w)) return 'A) tell';
  return '— nothing spent';
};
console.log('\nPRESSURE VECTORS');
if (!vectors.length) console.log('   (none qualified)');
for (const e of vectors) {
  const c = e.claims.find(x => x.ok);
  console.log(`\n   ${e.label}\n     TYPE: ${e.classes.join('+')}\n     EVIDENCE: ${(c ? c.ev : '').slice(0, 96)}\n     SCENE REVEALED: ${revealed(e)}\n     CONVERSION: ${['0 ignored', '1 acknowledged, generic', '2 Storybound+'][level(e)]}`);
}
if (disqualified.length) {
  console.log('\n   NOT QUALIFIED (importance is not pressure):');
  for (const e of disqualified) {
    const r = e.rejected[0];
    console.log(`     ${e.label.padEnd(14)} claimed ${r.cls} — rejected: needs ${r.why}`);
  }
}
const scores = vectors.map(level);
const full = scores.filter(x => x === 2).length, part = scores.filter(x => x === 1).length;
console.log(`\n${'─'.repeat(80)}\nRESULT:`);
console.log(`   ${vectors.length} qualified force${vectors.length === 1 ? '' : 's'} entered.`);
console.log(`   ${full} converted to Storybound+, ${part} acknowledged generically.   (tells: ${tells.length})`);
console.log('   ' + (
  vectors.length === 0 ? 'No qualified pressure — no interpretive attention was owed. Correct.'
  : full === 0 && part === 0 ? 'Scene carried tension but missed the signature.'
  : full === 0 ? 'Forces were noticed but not read — generic attention, no masks.'
  : full < vectors.length ? 'Partial — some forces were read, others passed unexamined.'
  : 'Every qualified force was read.'));
console.log('\n5. REMOVAL TEST — yours, not the tool\'s. For each candidate above, delete the');
console.log('   protagonist\'s lens. If the observation still stands, it is description.');
console.log('   If it collapses, it is Storybound+.');
console.log('   A reading that is WRONG about the subject but revealing about the observer');
console.log('   is a SUCCESS. Do not mark it down.\n');
