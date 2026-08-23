// CALIBRATION SET for the permission classifier.
//
// The classifier moved from 1/8 to 18/18 flagged on a single prompt edit, which means it was
// tracking the instruction rather than the text. Nothing may gate a rewrite until it agrees
// with hand labels on cases whose answers are known.
//
// PAIRED ON PURPOSE. For every action that appears here, there is a good use and a bad use —
// fingers tightening, a mouth moving, a map being smoothed, a ring being turned. Without the
// pairs the classifier can score well by learning "hand tightening = bad", which is just the
// body-part ban rebuilt inside a model.
//
// FALSE REMOVAL is the metric that matters most. Missing a tic costs a dull sentence; removing
// a real one costs the thing that makes a character feel alive.
//
// usage: node _tell_calibration.mjs
import { classify } from './_body_tell_report.mjs';

export const SET = [
  // ── fingers / hands ──
  { s: "Julian's fingers tightened around the letter as he read his father's name.", want: 'NOW' },
  { s: "Julian's fingers tightened as he thought about everything he had lost.", want: 'BAD' },
  { s: 'His fingers tightened.', want: 'BAD' },
  { s: 'His hand tightened around the glass because he was trying not to answer.', want: 'NOW' },
  { s: 'She reached for the broken clasp before she remembered she had given it away.', want: 'HISTORY' },
  { s: 'The cold made my fingers stiffen around the key.', want: 'ATMOSPHERE' },
  { s: 'My fingers trembled.', want: 'BAD' },
  { s: 'She wiped the blood from the blade before answering.', want: 'NOW' },

  // ── breath ──
  { s: 'My breath caught.', want: 'BAD' },
  { s: 'My breath caught when the door opened and it was not him.', want: 'NOW' },
  { s: 'I was still breathing the way he had taught me to before a rite.', want: 'HISTORY' },
  { s: 'The smoke thickened and I caught my breath.', want: 'ATMOSPHERE' },

  // ── eyes ──
  { s: 'His eyes darkened.', want: 'BAD' },
  { s: 'He read the wine label rather than look at the host.', want: 'NOW' },
  { s: 'She checked the exits before she sat down. Her mother had raised her to know where they were.', want: 'HISTORY' },
  { s: 'Her eyes softened with unspoken emotion.', want: 'BAD' },

  // ── mouth / jaw ──
  { s: "The Dohkar's mouth moved behind the band. He stopped when he realised everyone was watching.", want: 'NOW' },
  { s: "The Dohkar's mouth moved behind the band, a silent protest.", want: 'BAD' },
  { s: 'His jaw tightened when he was upset.', want: 'BAD' },
  { s: 'He stopped smiling when she said the name.', want: 'NOW' },

  // ── posture ──
  { s: 'She smoothed the edge of the map three times before handing it over. I knew she only did that when she was afraid of what came next.', want: 'HISTORY' },
  { s: 'She smoothed the edge of the map nervously.', want: 'BAD' },
  { s: 'His shoulders tensed.', want: 'BAD' },
  { s: 'Everyone noticed he never sat with his back to the door.', want: 'HISTORY' },

  // ── objects ──
  { s: 'He kept touching the ring all evening. I understood why only when the letter arrived the next morning.', want: 'DELAYED' },
  { s: 'Julian turned the ring. The metal caught the light.', want: 'BAD' },
  { s: 'Julian turned the ring when the councilwoman mentioned his father.', want: 'NOW' },
  { s: 'He set the glass down before replying. The last time he had kept holding it, he had broken it.', want: 'HISTORY' },
  { s: 'She would not touch the left-hand chair. Nobody explained it to me for another month.', want: 'DELAYED' },

  // ── feet / environment ──
  { s: 'My heel lifted once from the packed earth.', want: 'BAD' },
  { s: 'The packed earth shifted under my foot as the circle opened.', want: 'ATMOSPHERE' },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const items = await classify(SET.map((x, i) => `${i + 1}. ${x.s}`).join('\n'));
  const got = i => (items.find(x => x.n === i + 1) || {}).permission || '?';

  let ok = 0;
  const conf = {}, misses = [];
  SET.forEach((x, i) => {
    const g = got(i);
    (conf[x.want] = conf[x.want] || {})[g] = ((conf[x.want] || {})[g] || 0) + 1;
    if (g === x.want) ok++; else misses.push({ ...x, got: g, i });
  });

  // The two error classes are not symmetric.
  const falseRemoval = misses.filter(m => m.want !== 'BAD' && m.got === 'BAD');
  const missed = misses.filter(m => m.want === 'BAD' && m.got !== 'BAD');

  console.log(`\n${'═'.repeat(76)}\nPERMISSION CALIBRATION   ${ok}/${SET.length} correct (${Math.round(ok / SET.length * 100)}%)\n${'═'.repeat(76)}`);
  console.log(`\n  FALSE REMOVAL  ${falseRemoval.length}/${SET.filter(x => x.want !== 'BAD').length} good tells flagged BAD  ← the costly error`);
  console.log(`  MISSED         ${missed.length}/${SET.filter(x => x.want === 'BAD').length} subtitles let through`);

  if (falseRemoval.length) {
    console.log('\n  FALSE REMOVALS — these are the sentences that make characters feel alive:');
    for (const m of falseRemoval) console.log(`   ✗ want ${m.want.padEnd(10)} got BAD   ${m.s.slice(0, 92)}`);
  }
  if (missed.length) {
    console.log('\n  MISSED SUBTITLES:');
    for (const m of missed) console.log(`   · want BAD  got ${String(m.got).padEnd(10)} ${m.s.slice(0, 92)}`);
  }
  console.log('\n  CONFUSION (want → got):');
  for (const [w, gs] of Object.entries(conf)) {
    console.log(`   ${w.padEnd(11)} ${Object.entries(gs).map(([g, n]) => `${g}×${n}`).join('  ')}`);
  }
  console.log('\n  Gate readiness: false removal must be 0 before this may rewrite anything.\n');
}
