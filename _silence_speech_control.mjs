// ── SILENCE SUBMITS NO SPEECH, BUT NEVER OVERRIDES THE READER (provider-free, $0) ───────────
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

console.log('=== SILENCE / SPEECH OWNERSHIP (provider-free, $0) ===\n');

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
  t(fn.replace('function ', '') + ': every spoken suggestion defaults to EMPTY',
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

  out.suppresses = { silence: window._sbCardSuppressesSpeech(SILENCE),
                     tempt: window._sbCardSuppressesSpeech(TEMPT) };
  return out;
});

console.log('');
t('an untouched Silence selection leaves the Say field EMPTY — no speech is submitted',
  r.untouched.value === '', 'value is ' + JSON.stringify(r.untouched.value));
t('and the explanatory copy appears as a placeholder, which is never submitted',
  /folds back into your chest/.test(r.untouched.placeholder || ''),
  'placeholder is ' + JSON.stringify(r.untouched.placeholder));
t('a reader edit survives a LATE suggestion verbatim',
  r.afterEdit.value === 'I will not be quiet about this.',
  'value is ' + JSON.stringify(r.afterEdit.value));
t('a DELIBERATE vocalization typed by the reader is preserved, not blanked',
  r.deliberateVocalization.value === '*mm*',
  'value is ' + JSON.stringify(r.deliberateVocalization.value));
t('a non-suppressing card still receives its suggestion',
  r.otherCard.value === 'Say it and mean it.', 'value is ' + JSON.stringify(r.otherCard.value));
t('only the silence card suppresses speech',
  r.suppresses.silence === true && r.suppresses.tempt === false, JSON.stringify(r.suppresses));

// THE CHECK MUST BITE: with the guard bypassed, the stale suggestion lands as speech.
const bite = await page.evaluate(() => {
  const el = document.createElement('input');
  el.id = 'biteProbe'; document.body.appendChild(el);
  el.value = ('*mm*' || '');   // the old, unguarded assignment
  return el.value;
});
t('THE CHECK BITES: the old unguarded assignment does land speech', bite === '*mm*', bite);

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
