// VISIBLE-MAGIC DETECTOR — a JUDGE, not a pen. Reports; never rewrites.
//
// The wish core states "NOTHING VISIBLE HAPPENS (non-diegetic): a wish is spoken and reality
// does NOT flash, glow, surge, or sign", and the three-channels law confines physical
// anomaly to the OMEN. The narrow validation produced "Light flared beneath my palm, silver
// and thin as a new thread pulled through flesh" — the laws were delivered and lost to
// fantasy-visual reflex. This flags recurrences so the ⑤p contrast can be measured rather
// than assumed. It emits findings only (see feedback_validators_never_write).
//
// It cannot tell an omen from a twist by itself, so it reports MATCHES for a human read
// rather than declaring violations.
//
// usage: node _visible_magic_check.mjs <scene.txt> [more.txt ...]
import fs from 'fs';

// Visible light is NOT the violation — the omen is SUPPOSED to be seen. Two things make it
// wrong: the sign lands ON A PERSON (marking who acted), or it CARRIES INFORMATION
// (confirming, revealing, proving). Everything else is a legal omen. The earlier version
// flagged any glow, which would have condemned the channel the canon actually wants used.
const BODY  = '(?:palm|hand|fingers|wrist|arm|skin|chest|throat|veins?|face|temple)';
const POSS  = '(?:my|her|his|their|the)';
const VISIBLE = '(?:light|glow|glimmer|shimmer|radiance|gleam|luminous|luminesc\\w*|bright\\w*|shining|weave-script|script|mark|sigil|thread|warmth)';
const EMANATION = [
  // anything visible + an INSIDE-OUT preposition + a body part. Noun-agnostic on purpose.
  [new RegExp(`\\b${VISIBLE}\\b[^.]{0,70}?\\b(?:beneath|under|through|from|out of|inside|within)\\s+${POSS}\\s+${BODY}\\b`, 'i'), 'something visible emanates from inside a body'],
  // body part + any inflection of emitting
  [new RegExp(`${POSS}\\s+${BODY}\\b[^.]{0,40}?\\b(?:glow\\w*|shone|shining|shine[sd]?|lit up|burned with|blaz\\w+)\\b`, 'i'), 'body emits light'],
  // visible thing travelling across/along a body
  [new RegExp(`\\b${VISIBLE}\\b[^.]{0,50}?\\b(?:ros\\w+|rose|spread\\w*|crept|climb\\w+|rac\\w+|travel\\w*)\\b[^.]{0,30}?\\b(?:${POSS}\\s+${BODY}|the skin)\\b`, 'i'), 'visible thing travels a body'],
];

const PERSISTENCE = [
  [/\b(?:kept|still|would not stop)\s+(?:glowing|shining|burning)\b/i, 'the sign persists'],
  [/\bsteady and unmistakable\b/i, 'the sign is undeniable'],
];

const CARRIES_INFORMATION = [
  [/\b(?:the )?(?:light|glow|sign|mark)\b[^.]{0,50}\b(?:confirmed|proved|revealed|announced|testified|named|identified)\b/i, 'sign testifies'],
  [/\b(?:confirmed|proved|revealed) it in the only language\b/i, 'sign as evidence'],
  [/\b(?:everyone|the room|the assembly)\b[^.]{0,60}\b(?:knew|understood|saw)\b[^.]{0,40}\b(?:because of the|from the)\s+(?:light|glow|mark)\b/i, 'room reads the sign'],
];
const WISH_FINGERPRINT = [
  [/\b(?:sigil|stone|floor|blade|grass|air|mark)\b[^.]{0,50}\b(?:flared|glow\w*|lit|woke|pulsed)\b[^.]{0,60}\b(?:beneath|under|at|from)\s+(?:my|her|his|their)\s+(?:palm|hand|fingers|feet)\b/i, 'object lights up under the actor'],
  [/\b(?:glow\w*|light|sigil|mark)\b[^.]{0,90}\b(?:name|names|named|point|points|pointed|identif\w+|blame\w*)\b[^.]{0,40}\b(?:my|her|his|their)\s+(?:hand|part|doing)\b/i, 'the sign names who acted'],
  [/\b(?:assembly|room|witnesses|they)\b[^.]{0,60}\b(?:understood|knew|saw)\b[^.]{0,50}\b(?:mark|light|glow|sigil)\b/i, 'the room reads the sign'],
];
const PATTERNS = [...EMANATION, ...PERSISTENCE, ...CARRIES_INFORMATION, ...WISH_FINGERPRINT];


// Weave-Script is species anatomy, visible to everyone, and legal. It becomes a violation
// only when the prose lets the room READ it as proof a wish was made.
const WEAVE_LEGAL = /weave-?script/i;
const READS_AS_PROOF = /\b(?:understood|knew|saw|read)\b[^.]{0,60}\b(?:what|that)\b[^.]{0,40}\b(?:meant|had done|was her|interference|source)\b/i;

let total = 0;
for (const file of process.argv.slice(2)) {
  let t = '';
  try { t = fs.readFileSync(file, 'utf8'); } catch (_) { console.log(`  (cannot read ${file})`); continue; }
  const hits = [];
  for (const [rx, label] of PATTERNS) {
    const m = rx.exec(t);
    if (m) {
      const win = t.slice(Math.max(0, m.index - 120), m.index + 220);
      if (WEAVE_LEGAL.test(m[0]) && !READS_AS_PROOF.test(win)) continue;  // anatomy, telling nobody anything
      const i = Math.max(0, m.index - 70);
      hits.push({ label, quote: t.slice(i, m.index + 110).replace(/\s+/g, ' ').trim() });
    }
  }
  total += hits.length;
  console.log(`\n${file}  —  ${hits.length ? `${hits.length} match(es)` : 'clean'}`);
  for (const h of hits) console.log(`   [${h.label}]  …${h.quote}…`);
}
console.log(total
  ? `\n${total} match(es). Visible signs are legal ONLY as the omen, and the omen carries mood,\n`
    + 'never information. Read each in context: if it delivers the twist, it is the wrong channel.\n'
  : '\nNo visible-magic phrasing found.\n');
