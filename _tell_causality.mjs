// TELL CAUSALITY — is a physical reaction standing in for a psychological cause?
//
// Not a ban list. Banning body parts has failed every time it has been tried here: ban the
// heel pressing and it lifts, ban fingers and it moves to a collar, ban the ring touch and it
// becomes a ring glance. The defect is not the body part. It is a tell with no reason to
// happen HERE, presented as a decoder ring — physical reaction = internal state.
//
// A tell is LICENSED when any one of these is true:
//   1. PRACTICAL CAUSE     — the action is doing something in the world
//                            ("she wiped the blood from the blade before answering")
//   2. SCENE TRIGGER       — a concrete thing in this scene set it off
//                            ("he stopped smiling when she said the name")
//   3. PERCEIVED BY ANOTHER— someone in the room could see and read it
//                            ("everyone noticed he never sat with his back to the door")
//
// Everything else is the model externalising emotion because a sentence needed texture.
// Note that the SAME tell may licitly recur if its CAUSE recurs — Julian touching the ring
// whenever his brother is mentioned is good writing. Ring-for-grief, then ring-for-fear, then
// ring-for-attraction is the AI pattern: one gesture, arbitrary emotions.
//
// usage: node _tell_causality.mjs <scene.txt> [more...]  [--v]
import fs from 'fs';

const BODY = '(?:heels?|foot|feet|fingers?|thumb|hand|hands|palm|jaw|mouth|lips?|shoulders?|throat|chest|ribs?|breath|pulse|stomach|eyes?|knuckles?|spine|neck)';
const REACT = '(?:lift\\w*|press\\w*|bounc\\w*|scrap\\w*|tighten\\w*|clench\\w*|curl\\w*|flex\\w*|twitch\\w*|shift\\w*|catch|caught|hitch\\w*|quicken\\w*|race[ds]?|racing|tremb\\w*|still\\w*|settle[ds]?|stiffen\\w*|loosen\\w*|drop\\w*|rose|risen|burn\\w*|knot\\w*|turn\\w*|brush\\w*|rub\\w*)';
const TELL = new RegExp(`\\b(?:my|his|her|their|the)\\s+${BODY}\\b[^.!?]{0,40}?\\b${REACT}\\b`, 'gi');

// L2 — a concrete thing in the scene set it off. Requires a STIMULUS, not a mood word.
const TRIGGER = /\b(?:when|as|after|the moment|at the sound of|at the sight of|the instant)\b[^.!?]{0,60}?\b(?:said|says|spoke|named|mentioned|asked|answered|entered|arrived|touched|reached|turned to|looked at|stepped|opened|struck|called|read|handed|drew)\b/i;
// L1 — the action is doing work in the world, not reporting an interior state.
const PRACTICAL = /\b(?:to (?:steady|hold|catch|open|close|lift|carry|push|pull|stop|keep)|before (?:answering|speaking|she|he|they|I)|so (?:that )?(?:it|they|he|she)|and (?:opened|closed|took|handed|set|placed|pulled|pushed))\b/i;
// L3 — someone else can see it and is reading it.
const PERCEIVED = /\b(?:noticed|saw|watched|caught me|read it|everyone|the room|they all|he saw|she saw)\b/i;
// The decoder-ring shape: the tell is glued to a named feeling.
const DECODER = /\b(?:fear|anger|grief|shame|dread|panic|relief|desire|guilt|rage|sorrow|anxiety|nerves?)\b/i;

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const verbose = process.argv.includes('--v');
let TOT = 0, UNL = 0, WORDS = 0;

for (const f of files) {
  let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
  // The tarot-deck closer is fixed template the app splices in, not author prose. STRIP THE
  // REGION rather than filtering sentences that mention a deck: the template is appended with
  // no separating space ("…waiting to be spoken.I realize that old tarot deck is still in my
  // hand."), so a sentence filter silently deletes the author's last real sentence with it —
  // which is how a run with a heel in it measured zero tells.
  t = t.replace(/I reali[sz]e that old tarot deck is still in my hand[\s\S]*$/i, '')
       .replace(/Reassuringly solid\. Present\./i, '');
  const sents = t.split(/(?<=[.!?"”])(?=[A-Z"“‘'])|(?<=[.!?"”])\s+/);
  const words = t.split(/\s+/).length; WORDS += words;
  const unlicensed = [];
  let tells = 0;
  for (const s of sents) {
    // Narrow deck exclusion: drop a tell whose OBJECT is the deck (an app mechanic), without
    // discarding the rest of the sentence around it.
    const hits = (s.match(TELL) || []).filter(h => !/\b(?:tarot|deck|cards?)\b/i.test(
      s.slice(Math.max(0, s.indexOf(h)), s.indexOf(h) + h.length + 24)));
    if (!hits.length) continue;
    tells += hits.length;
    // The licence may live in the same sentence or the one that follows the beat.
    const licensed = TRIGGER.test(s) || PRACTICAL.test(s) || PERCEIVED.test(s);
    if (!licensed) unlicensed.push({ s: s.trim(), decoder: DECODER.test(s) });
  }
  TOT += tells; UNL += unlicensed.length;
  console.log(`\n${f.replace(/^.*\//, '')}  ${words}w · ${tells} tell(s) · ${unlicensed.length} UNLICENSED`
    + `  (${(unlicensed.length / words * 1000).toFixed(2)}/1k)`);
  if (verbose) for (const u of unlicensed.slice(0, 4)) {
    console.log(`   ✗ ${u.decoder ? '[decoder-ring] ' : ''}${u.s.slice(0, 116)}`);
  }
}
console.log(`\n${'─'.repeat(70)}`);
console.log(`  ${TOT} tells across ${WORDS} words · ${UNL} unlicensed (${(UNL / WORDS * 1000).toFixed(2)}/1k words)`);
console.log('  A licensed tell has a practical cause, a scene trigger, or a witness.');
console.log('  Unlicensed means: nothing in the scene explains why this body, why now.\n');
