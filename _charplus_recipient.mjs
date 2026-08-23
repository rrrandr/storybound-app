// CHARACTER+ RECIPIENT — who got the beat, not just whether one fired.
//
// The narrow validation changed the diagnosis: Character+ was NOT absent. It fired on the
// old woman ("recognition of a debt she had not chosen to carry" — a worldview, which is
// the bar) while Julian, the load-bearing character, got description plus inference. That
// is a ROUTING question, not a trigger question, and the two have opposite fixes. This
// reports the recipient and their importance so the distinction is measurable.
//
// Report-only. Never rewrites (see feedback_validators_never_write).
//
// usage: node _charplus_recipient.mjs <scene.txt> [more.txt ...]
import fs from 'fs';

// Importance comes from the seed's cast, not from frequency in the prose — a character can
// be mentioned often and still be scenery.
const CAST = [
  { name: 'Lirael', importance: 'POV' },
  { name: 'Julian', importance: 'primary (love interest)' },
  { name: 'Seren',  importance: 'primary (ward)' },
  { name: 'Dohkar', importance: 'secondary (office)' },
];
const INCIDENTAL = [/\bold woman\b/i, /\bstranger\b/i, /\bguest\b/i, /\bmother\b/i, /\bsenior\b/i];

// A Character+ beat is a PERCEPTION EVENT that licenses an inference about how the person
// reads the world — not an emotion label and not a physical description.
const INFERENCE = [
  /\bas (?:though|if)\b/i, /\brecognition of\b/i, /\bthe kind of \w+ who\b/i,
  /\bnever missed\b/i, /\bthe way (?:he|she|they)\b/i, /\bhad not chosen\b/i,
  /\bwho had\b[^.]{0,60}\b(?:learned|decided|always|never)\b/i,
  /\bhardened into\b/i, /\bas someone who\b/i,
];
const DESCRIPTION_ONLY = [/\bhair\b/i, /\beyes\b/i, /\bskin\b/i, /\bwore\b/i, /\bcurtained\b/i];

const sentences = t => String(t)
  .split(/(?<=[.!?"”])(?=[A-Z"“‘'])|(?<=[.!?"”])\s+/)
  .map(x => x.trim()).filter(Boolean);

for (const file of process.argv.slice(2)) {
  let t = '';
  try { t = fs.readFileSync(file, 'utf8'); } catch (_) { console.log(`  (cannot read ${file})`); continue; }
  const sents = sentences(t);
  console.log(`\n${'═'.repeat(74)}\n${file}\n${'═'.repeat(74)}`);
  console.log('  character        importance                 Character+  evidence');

  const check = (label, importance, test) => {
    const mine = sents.filter(test);
    const hit = mine.find(s => INFERENCE.some(rx => rx.test(s)));
    const descOnly = !hit && mine.some(s => DESCRIPTION_ONLY.some(rx => rx.test(s)));
    const verdict = hit ? 'YES' : descOnly ? 'desc-only' : mine.length ? 'no' : 'absent';
    console.log(`  ${label.padEnd(16)} ${importance.padEnd(26)} ${verdict.padEnd(11)} `
      + (hit ? `"${hit.trim().slice(0, 78)}…"` : mine.length ? `(${mine.length} mention(s))` : ''));
    return { label, importance, verdict };
  };

  const rows = [];
  for (const c of CAST) rows.push(check(c.name, c.importance, s => new RegExp(`\\b${c.name}\\b`).test(s)));
  for (const rx of INCIDENTAL) {
    const label = rx.source.replace(/\\b/g, '').replace(/[^a-z ]/gi, '');
    if (sents.some(s => rx.test(s))) rows.push(check(label, 'incidental', s => rx.test(s)));
  }

  const primaryMissed = rows.filter(r => /primary/.test(r.importance) && r.verdict !== 'YES');
  const incidentalHit = rows.filter(r => r.importance === 'incidental' && r.verdict === 'YES');
  console.log('  ' + '─'.repeat(70));
  if (incidentalHit.length && primaryMissed.length) {
    console.log('  ROUTING SIGNAL — a beat fired for an incidental character while '
      + primaryMissed.map(r => r.label).join(', ') + ' went without.');
    console.log('  That is a priority/budget problem, not a missing-trigger problem.');
  } else if (!rows.some(r => r.verdict === 'YES')) {
    console.log('  TRIGGER SIGNAL — no Character+ beat fired for anyone in this scene.');
  } else {
    console.log('  Beats landed on the cast that carries the scene.');
  }
}
