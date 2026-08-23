// STORYBOUND+ EVALUATOR — did a signature moment happen, and to what?
//
// Replaces the character-only metric, which would miss half of Storybound+. Reports three
// things: WHO got a Character+ beat, WHAT got a Description+ beat, and which candidates
// look generic enough that another archetype could have produced them.
//
// DELIBERATE LIMIT: "could another archetype have noticed this?" is a judgment, not a
// pattern. The tool surfaces candidates and flags suspected generics; it does not rule.
// An instrument that reports confidently on something it cannot observe is the failure
// mode that cost this project two wrong verdicts today.
//
// usage: node _storybound_plus.mjs <scene.txt> [--lens=OPEN_VEIN]

import fs from 'fs';

const CAST = [
  { name: 'Lirael', importance: 'POV' },
  { name: 'Julian', importance: 'primary (love interest)' },
  { name: 'Seren',  importance: 'primary (ward)' },
  { name: 'Dohkar', importance: 'secondary (office)' },
];
const INCIDENTAL = [[/\bold woman\b/i, 'old woman'], [/\bstranger\b/i, 'stranger'],
                    [/\bguest\b/i, 'guest'], [/\byoung man\b/i, 'young man']];

// Things that can carry a Description+ beat in this world.
const THINGS = [
  [/\bveilwood\b/i, 'Veilwood'], [/\bspiralgrass\b/i, 'spiralgrass'], [/\bweave-script\b/i, 'Weave-Script'],
  [/\b(tarot )?deck\b/i, 'the deck'], [/\bcards?\b/i, 'a card'], [/\b(gossamer )?band\b/i, 'the mouth-band'],
  [/\bsigil\b/i, 'sigil'], [/\bsash\b/i, 'sash'], [/\bclearing\b/i, 'the clearing'],
  [/\bcanopy|willows?\b/i, 'the canopy'], [/\bstone\b/i, 'stone'], [/\bthreshold|doorway\b/i, 'threshold'],
  [/\bletter\b/i, 'letter'], [/\bsword|blade\b/i, 'blade'], [/\bscar\b/i, 'scar'],
];

// CHARACTER+ REQUIRES AGENCY. The old patterns (as if / had learned / had spent) scored the
// TELL shape — trembling hands, caught breath — which the directive now explicitly bans, and
// would have scored a correct performance beat as a miss. Four signal classes, matching the
// directive: a chosen act, a perception goal, a cost, and the PC's reading.
const AGENCY = [
  /\b(?:corrected|insisted|volunteered|arranged|staged|emphasi[sz]ed|displayed|concealed|offered|avoided|controlled|performed|rehearsed|practi[sc]ed|announced|repeated|refused to)\b/i,
  /\bnever (?:once )?(?:let|allowed|entered|called it|looked|sat|spoke first)\b/i,
  /\b(?:always|every time) (?:waited|stood|arrived|answered|chose)\b/i,
];
const PERCEPTION_GOAL = [
  /\b(?:wanted|needed) (?:them|everyone|anyone|people|the room) to (?:believe|think|see|remember|forget)\b/i,
  /\b(?:tried|meant) to (?:seem|appear|look like)\b/i,
  /\bthe (?:posture|air|manner) of someone who\b/i,
  /\bmaintained the (?:image|impression)\b/i,
  /\bso (?:that )?no one (?:would|could) (?:see|know|guess)\b/i,
  /\bthe way people do when they have\b/i,
];
const COST = [
  /\bbecause (?:he|she|they) could not (?:risk|survive|bear|afford)\b/i,
  /\bit cost (?:him|her|them)\b/i, /\bwhat it (?:protected|required|foreclosed)\b/i,
  /\bhad never (?:once )?(?:pronounced|learned|been taught|had)\b/i,
  /\bcould not (?:survive|admit|say) (?:the|another|it)\b/i,
  /\bexcept (?:his|her|their) (?:own )?\w+’s\b/i,
];
// Involuntary reactions. Ordinary characterisation and welcome as texture, but they are NOT
// Character+ unless attached to a deliberate act in the same window.
const INVOLUNTARY = [
  /\btrembl|\bshook\b|\bshaking\b/i, /\bbreath (?:caught|hitched)\b/i, /\bflinch/i,
  /\bmuscle jumped\b/i, /\bblushed?\b/i, /\btears?\b/i, /\bhesitat/i, /\bwinced\b/i,
  /\bjaw (?:tightened|clenched)\b/i, /\bswallowed\b/i,
];
// Description+ keeps its own shape: object -> history -> lens. A thing cannot perform.
const INTERPRETIVE = [
  /\bas (?:though|if)\b/i, /\bhad (?:learned|spent|never|always|forgotten|stopped)\b/i,
  /\brecorded\b/i, /\brefused\b/i, /\bremembered\b/i, /\bgrowing around\b/i,
  /\bnever (?:learned|meant|once)\b/i, /\bwas not\b[^.]{0,50}\bit was\b/i,
];
const GENERIC = [
  /\b(moonlight|starlight|dappled light|golden light)\b/i, /\bancient (?:and )?(?:beautiful|silent|proud)\b/i,
  /\bwhispered? of\b/i, /\bseemed to (?:breathe|watch|wait)\b/i, /\bas old as\b/i,
];
const anyOf = (arr, t) => arr.some(r => r.test(t));

const sentences = t => String(t)
  .split(/(?<=[.!?"”])(?=[A-Z"“‘'])|(?<=[.!?"”])\s+/)
  .map(x => x.trim()).filter(Boolean);

const lensArg = (process.argv.find(a => a.startsWith('--lens=')) || '').split('=')[1] || '(not supplied)';

for (const file of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  let t = '';
  try { t = fs.readFileSync(file, 'utf8'); } catch (_) { console.log(`  (cannot read ${file})`); continue; }
  const sents = sentences(t);
  console.log(`\n${'═'.repeat(78)}\nSTORYBOUND+ RECIPIENTS   ${file}\nLens: ${lensArg}\n${'═'.repeat(78)}`);

  const found = { char: [], desc: [], generic: [] };
  const tells = [];
  const scan = (label, importance, rx, bucket) => {
    const idxs = sents.map((s, i) => (rx.test(s) ? i : -1)).filter(i => i >= 0);
    const mine = idxs.map(i => sents[i]);
    let hit = null;
    for (const i of idxs) {
      for (let k = i; k <= Math.min(i + 2, sents.length - 1); k++) {
        // Stop the window at another named character, so a beat is never mis-attributed.
        if (k > i && CAST.some(c => c.name !== label && new RegExp(`\\b${c.name}\\b`).test(sents[k]))) break;
        const w = sents.slice(i, k + 1).join(' ');
        const isChar = bucket === found.char;
        const ok = isChar
          ? ((anyOf(AGENCY, w) || anyOf(PERCEPTION_GOAL, w)) && (anyOf(COST, w) || anyOf(PERCEPTION_GOAL, w) || anyOf(INTERPRETIVE, w)))
          : anyOf(INTERPRETIVE, w);
        if (ok) {
          const from = sents.slice(i, k + 1).findIndex(x => anyOf(AGENCY, x) || anyOf(PERCEPTION_GOAL, x));
          hit = sents.slice(i + (isChar && from > 0 ? from : 0), k + 1).join(' ');
          break;
        }
        if (isChar && anyOf(INVOLUNTARY, w) && !anyOf(AGENCY, w)) {
          const first = sents[i];
          const mine = first.search(new RegExp(`\\b${label}\\b`, 'i'));
          const earlier = CAST.some(c => {
            if (c.name.toLowerCase() === label.toLowerCase()) return false;
            const at = first.search(new RegExp(`\\b${c.name}\\b`, 'i'));
            return at >= 0 && at < mine;
          });
          if (!earlier && !tells.some(x => x.quote === first)) tells.push({ label, quote: first });
        }
      }
      if (hit) break;
    }
    if (hit) {
      bucket.push({ label, importance, quote: hit });
      if (GENERIC.some(r => r.test(hit))) found.generic.push({ label, quote: hit });
    }
    return { label, importance, verdict: hit ? 'YES' : mine.length ? 'no' : 'absent', n: mine.length };
  };

  console.log('\nCHARACTER+');
  for (const c of CAST) {
    const r = scan(c.name, c.importance, new RegExp(`\\b${c.name}\\b`), found.char);
    console.log(`  ${c.name.padEnd(14)} ${c.importance.padEnd(26)} ${r.verdict}`);
  }
  for (const [rx, label] of INCIDENTAL) {
    if (!sents.some(s => rx.test(s))) continue;
    const r = scan(label, 'incidental', rx, found.char);
    console.log(`  ${label.padEnd(14)} ${'incidental'.padEnd(26)} ${r.verdict}`);
  }

  console.log('\nDESCRIPTION+');
  let anyThing = false;
  for (const [rx, label] of THINGS) {
    if (!sents.some(s => rx.test(s))) continue;
    anyThing = true;
    const r = scan(label, 'object/place', rx, found.desc);
    console.log(`  ${label.padEnd(20)} ${r.verdict}${r.verdict === 'no' ? `   (${r.n} mention(s), no interpretive move)` : ''}`);
  }
  if (!anyThing) console.log('  (no tracked object or place appeared)');

  console.log('\nCANDIDATE SIGNATURE MOMENTS — judge each by hand:');
  const all = [...found.char, ...found.desc];
  if (!all.length) console.log('  (none)');
  for (const h of all) console.log(`  • [${h.label}] ${h.quote.slice(0, 150)}`);

  if (tells.length) {
    console.log('\nTELLS FOUND (ordinary characterisation — NOT Character+, no deliberate act):');
    for (const t2 of tells.slice(0, 6)) console.log(`  – [${t2.label}] ${t2.quote.slice(0, 120)}`);
  }
  console.log('\n' + '─'.repeat(78));
  const primaryHit = found.char.some(h => /primary/.test(h.importance));
  if (!all.length) console.log('  NO STORYBOUND+ MOMENT. Neither surface fired.');
  else {
    console.log(`  Character+ beats: ${found.char.length}   Description+ beats: ${found.desc.length}`);
    if (!primaryHit && found.char.length) console.log('  ROUTING: beats landed only on non-primary characters.');
    if (found.generic.length) {
      console.log('  SUSPECTED GENERIC (could belong to any story, any protagonist):');
      for (const g of found.generic) console.log(`    ✗ [${g.label}] ${g.quote.slice(0, 120)}`);
    }
  }
  console.log('\n  THE TEST (yours, not the tool\'s): could another archetype have noticed this exact');
  console.log('  thing this way? If yes it is generic. If no, it is Storybound+.');
}
