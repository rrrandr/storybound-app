// READ SCENE 2 BACK OUT OF THE FINISHED SAVE (Roman 2026-11-18)
//
// Not from the draft and not from NEXT_PAGE.txt, but from the save the app would reopen:
// RESUMABLE_STATE.json → storage.sb_saved_story → the committed pages. That is the only copy
// that proves what a reader would actually see on reopening.
import fs from 'node:fs';

const RUN = '/Users/romantsukerman/storybound-app/_ft_scene2_prose/run_2026-11-18T09-59-30-240Z_65804/';
const st = JSON.parse(fs.readFileSync(RUN + 'RESUMABLE_STATE.json', 'utf8'));
const saved = JSON.parse(String((st.storage || {}).sb_saved_story || '{}'));
// The committed pages live at `storyPages` (with `storyPageUids` beside them), not `pages`.
const pages = saved.storyPages || [];

const plain = (h) => String(h || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n').trim();

const snap = saved.stateSnapshot || {};
console.log('the save holds ' + pages.length + ' page(s); turnCount ' + (snap.turnCount ?? '?')
  + ' \u00b7 title ' + JSON.stringify(saved.title || '(none)'));
// WHO ACTUALLY WROTE EACH PAGE, from the save's own authorship record.
console.log('\nthe save\u2019s own authorship record:');
(snap._proseAuthorship || []).forEach((a) => console.log('  ' + JSON.stringify(a).slice(0, 220)));

const last = pages[pages.length - 1] || {};
const body = plain(typeof last === 'string' ? last
  : (last.content || last.html || last.text || ''));
console.log('\n' + '═'.repeat(74));
console.log('THE PUBLISHED SCENE 2 — read back from the reopened save');
console.log('═'.repeat(74) + '\n');
console.log(body);
console.log('\n' + '═'.repeat(74));
console.log(body.length + ' characters · '
  + body.split(/\n\s*\n/).filter(Boolean).length + ' paragraphs');
fs.writeFileSync('/Users/romantsukerman/storybound-app/_FT_SCENE2_PUBLISHED.txt', body);

// The deck, in its two required places: inside the confrontation and at the open choice.
const paras = body.split(/\n\s*\n/).filter(Boolean);
const deckRx = /\bdeck\b|\bcards?\b/i;
const hits = paras.map((p, i) => (deckRx.test(p) ? i : -1)).filter((i) => i !== -1);
console.log('\nTHE DECK');
console.log('  mentioned in paragraph(s): ' + (hits.join(', ') || 'none') + ' of ' + paras.length);
console.log('  in the closing beat: ' + (hits.includes(paras.length - 1) ? 'YES' : 'no'));
console.log('  before the close too : ' + (hits.some((i) => i < paras.length - 1) ? 'YES' : 'no'));
hits.forEach((i) => {
  const m = paras[i].match(/[^.!?]*\b(deck|cards?)\b[^.!?]*[.!?]/i);
  if (m) console.log('    ¶' + i + ': ' + m[0].trim().slice(0, 200));
});
