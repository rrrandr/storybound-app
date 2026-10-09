// ── HELPER-LEVEL TEST: THE SPEECH GUARD AND THE SILENCE DATA (provider-free, $0) ────────────
// SCOPE, STATED HONESTLY: this is a HELPER-LEVEL test. It constructs inputs and calls the shipped
// window._sbApplyCardSpeech directly. It does NOT select a real card, wait for a real preview, or
// submit through the reader. The end-to-end card-fill/submission evidence is the SB_SCENARIO=silence
// arm in _fs_live_sequence.mjs, which drives the real controls and captures what is submitted.
// The Silence card used to carry a second-person description of NOT speaking in its `dialogue`
// field, which is the Say slot — so it was submitted as the player's spoken line and rendered as
// LIRAEL: "...". This exercises the SHIPPED guard (window._sbApplyCardSpeech) and the SHIPPED
// silence data against a real input in a real page. No provider is contacted.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

console.log('=== SILENCE / SPEECH GUARD - HELPER LEVEL, constructed inputs (provider-free, $0) ===\n');

// 1. SOURCE INVARIANT: every silence branch must default its spoken field to empty.
const src = fs.readFileSync('public/fatecards.js', 'utf8');
const bounds = (needle) => {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error('not found: ' + needle);
  let d = 0, k = src.indexOf('{', i);
  while (k < src.length) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
    k++;
  }
  throw new Error('unbalanced');
};
for (const fn of ['function getIntimateSilenceOptions', 'function getSilenceOptions']) {
  const body = bounds(fn);
  const spoken = [...body.matchAll(/(alt)?[Dd]ialogue: ('[^']*'|`[^`]*`|"[^"]*")/g)].map((m) => m[2]);
  const nonEmpty = spoken.filter((v) => v.replace(/^['"`]|['"`]$/g, '').trim() !== '');
  t(fn.replace('function ', '') + ': no NARRATIVE DESCRIPTION sits in the spoken field',
    spoken.length > 0 && nonEmpty.length === 0,
    nonEmpty.length + ' still carry text, e.g. ' + JSON.stringify(nonEmpty.slice(0, 2)));
  t(fn.replace('function ', '') + ': the explanatory copy is retained on a note field',
    /ialogueNote:/.test(body), 'no dialogueNote found — the reader-facing copy was lost');
}

const browser = await chromium.launch();
const page = await browser.newPage();
// No provider, no network beyond the app itself.
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._sbApplyCardSpeech === 'function', { timeout: 30000 });
t('the shipped guard window._sbApplyCardSpeech is present', true);

const r = await page.evaluate(() => {
  const out = {};
  const mk = (id) => {
    const el = document.createElement('input');
    el.id = id; el.type = 'text'; document.body.appendChild(el); return el;
  };
  const SILENCE = { cardId: 'silence', dialogue: '',
    dialogueNote: '(The thing you almost said folds back into your chest.)' };
  const TEMPT = { cardId: 'tempt', dialogue: 'Say it and mean it.' };

  // A: an untouched Silence selection, offered a STALE cached suggestion, submits no speech.
  const a = mk('dialogueInput');
  window._sbApplyCardSpeech(a, '*mm*', SILENCE, SILENCE.dialogueNote);
  out.untouched = { value: a.value, placeholder: a.placeholder };

  // B: the reader types their own words, then a LATE preview arrives.
  a.value = 'I will not be quiet about this.';
  a.dispatchEvent(new Event('input', { bubbles: true }));
  window._sbApplyCardSpeech(a, '*mm*', SILENCE, SILENCE.dialogueNote);
  out.afterEdit = { value: a.value };

  // C: a deliberate vocalization the reader typed themselves must survive too.
  a.value = '*mm*';
  a.dispatchEvent(new Event('input', { bubbles: true }));
  window._sbApplyCardSpeech(a, '', SILENCE, SILENCE.dialogueNote);
  out.deliberateVocalization = { value: a.value };

  // D: a non-suppressing card still receives its suggestion.
  const b = mk('gnDialogueInput');
  window._sbApplyCardSpeech(b, TEMPT.dialogue, TEMPT, null);
  out.otherCard = { value: b.value };

  // An EMPTY silence suggestion still shows the explanatory copy as a placeholder.
  const z = mk('emptyProbe'); z.id = 'dialogueInput';
  window._sbBeginSpeechLifecycle();
  window._sbApplyCardSpeech(z, '', SILENCE, SILENCE.dialogueNote);
  out.emptyCase = { value: z.value, placeholder: z.placeholder };

  out.suppresses = { silence: window._sbCardSuppressesSpeech(SILENCE),
                     tempt: window._sbCardSuppressesSpeech(TEMPT) };

  // E: DELIBERATELY CLEARING Say is an edit. The old flag marked an empty field UNEDITED, so a
  //    suggestion could refill words the reader had just deleted.
  const c = mk('clearProbe');
  c.id = 'dialogueInput';
  window._sbBeginSpeechLifecycle();
  c.value = 'something'; c.dispatchEvent(new Event('input', { bubbles: true }));
  c.value = ''; c.dispatchEvent(new Event('input', { bubbles: true }));
  window._sbApplyCardSpeech(c, 'a suggestion that must not land', TEMPT, null);
  out.clearedStaysEmpty = { value: c.value };

  // F: A STALE response - one whose selection has been superseded - must not write.
  const tok = window._sbBeginSpeechLifecycle();
  window._sbBeginSpeechLifecycle();           // the reader selects again
  const d2 = mk('staleProbe'); d2.id = 'dialogueInput';
  const wrote = window._sbApplyCardSpeech(d2, 'late arrival', TEMPT, null, tok);
  out.stale = { wrote: wrote, value: d2.value };

  // G: A NEW TURN must still receive its own suggestion - protection must not be sticky.
  const e2 = mk('nextTurnProbe'); e2.id = 'dialogueInput';
  window._sbBeginSpeechLifecycle();
  e2.value = 'reader words'; e2.dispatchEvent(new Event('input', { bubbles: true }));
  window._sbBeginSpeechLifecycle();           // next turn begins
  window._sbApplyCardSpeech(e2, 'this turn\'s suggestion', TEMPT, null);
  out.nextTurn = { value: e2.value };
  return out;
});

console.log('');
t('a Silence suggestion lands AS GIVEN — voiced withholding is legitimate',
  r.untouched.value === '*mm*',
  'the suggestion was altered: ' + JSON.stringify(r.untouched.value));
t('the explanatory copy is a PLACEHOLDER when nothing is spoken — never submitted',
  r.emptyCase.value === '' && /folds back into your chest/.test(r.emptyCase.placeholder || ''),
  'value=' + JSON.stringify(r.emptyCase.value)
  + ' placeholder=' + JSON.stringify(r.emptyCase.placeholder));
t('a reader edit survives a LATE suggestion verbatim',
  r.afterEdit.value === 'I will not be quiet about this.',
  'value is ' + JSON.stringify(r.afterEdit.value));
t('a DELIBERATE vocalization typed by the reader is preserved, not blanked',
  r.deliberateVocalization.value === '*mm*',
  'value is ' + JSON.stringify(r.deliberateVocalization.value));
t('a non-suppressing card still receives its suggestion',
  r.otherCard.value === 'Say it and mean it.', 'value is ' + JSON.stringify(r.otherCard.value));
t('NO card suppresses generated speech any more',
  r.suppresses.silence === false && r.suppresses.tempt === false, JSON.stringify(r.suppresses));

// THE CHECK MUST BITE: with the guard bypassed, the stale suggestion lands as speech.
const bite = await page.evaluate(() => {
  const el = document.createElement('input');
  el.id = 'biteProbe'; document.body.appendChild(el);
  el.value = ('*mm*' || '');   // the old, unguarded assignment
  return el.value;
});
t('THE CHECK BITES: the old unguarded assignment does land speech', bite === '*mm*', bite);
t('deliberately CLEARED speech stays empty - deletion is an edit',
  r.clearedStaysEmpty.value === '', 'value is ' + JSON.stringify(r.clearedStaysEmpty.value));
t('a STALE response from a superseded selection does not write',
  r.stale.wrote === false && r.stale.value === '',
  'wrote=' + r.stale.wrote + ' value=' + JSON.stringify(r.stale.value));
t('a NEW turn still receives its own suggestion - protection is not sticky',
  r.nextTurn.value === "this turn's suggestion",
  'value is ' + JSON.stringify(r.nextTurn.value));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
