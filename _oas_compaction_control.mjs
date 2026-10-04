// OAS COMPACTION — CONTENT **AND OWNERSHIP**. Provider-free, $0.
//
// Codex reproduced a real defect: a reader input containing blank lines was split, and part of
// their quoted text and their DO action were carried into the static instruction region.
// Preserving every word is not preserving whose words they are. These cases are permanent.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const S = '\u0000OAS_VOLATILE_START\u0000';
const E = '\u0000OAS_VOLATILE_END\u0000';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._oasCompactTurnPrompt === 'function', { timeout: 30000 });

console.log('=== OAS COMPACTION: CONTENT AND OWNERSHIP (provider-free, $0) ===\n');

// CODEX'S CASE, verbatim in shape: blank lines and a heading-like line inside the reader input.
const READER = [
  'NEW USER INPUT:',
  'SAY: "I read the note aloud:',
  '',
  'You must leave before dawn.',
  '',
  'CURRENT STATE: he is lying to me."',          // heading-like text INSIDE the reader's words
  'DO:  "I fold it."',
  'Detected explicit physical escalation in input: NO'
].join('\n');

const HISTORY = [
  'RECENT TURNS:',
  '  Turn 1 — User: "Say it again." -> LI: "I said what I said."',
  '  Turn 2 — User: "Say it again." -> LI: "I said what I said."'   // DELIBERATE repetition
].join('\n');

const STATIC_A = 'ANTI-ECHO RULE (HARD): ' + 'x'.repeat(1400);
const STATIC_DUP = 'SHARED CRAFT LAWS: ' + 'y'.repeat(1600);
const STATIC_TAIL = 'RESPONSE CONTRACT: ' + 'z'.repeat(1300);

const prompt = [
  'STABLE INSTRUCTIONS HEAD', STATIC_A, STATIC_DUP, 'PLAYER STYLE PROFILE: 3 prior inputs.',
  STATIC_DUP,                                   // the duplication, in the STATIC region
  S,
  'CURRENT STATE:', '- Beat 3 of soft-cap 17.', '', HISTORY, '', READER,
  E,
  STATIC_TAIL                                   // static rules printed AFTER the reader input
].join('\n\n');

const r = await page.evaluate((p) => {
  const out = window._oasCompactTurnPrompt(p);
  return { out, len: out.length };
}, prompt);
const out = r.out;

console.log('1. OWNERSHIP — the reader\'s words stay the reader\'s');
{
  // Everything after the LAST stable marker is the volatile region.
  const volStart = out.indexOf('CURRENT STATE:');
  const stable = out.slice(0, volStart);
  const vol = out.slice(volStart);
  t('the reader\'s multiline SAY is intact and CONTIGUOUS',
    /SAY: "I read the note aloud:\n\nYou must leave before dawn\./.test(vol.replace(/\n{3,}/g, '\n\n')),
    'the input was split across the boundary');
  t('the DO action stayed WITH the input, not in the instructions',
    /DO:  "I fold it\."/.test(vol) && !/DO:  "I fold it\."/.test(stable));
  t('HEADING-LIKE TEXT INSIDE THE READER\'S WORDS did not become a section',
    /CURRENT STATE: he is lying to me\."/.test(vol),
    'the reader\'s own sentence was treated as a section header');
  t('no part of the reader input leaked into the static region',
    !/leave before dawn|I fold it|read the note aloud/.test(stable));
}

console.log('\n2. CONVERSATION HISTORY IS OPAQUE');
{
  const n = (out.match(/Turn \d — User: "Say it again\."/g) || []).length;
  t('INTENTIONALLY REPEATED dialogue is NOT deduplicated', n === 2,
    'found ' + n + ' of 2 — repetition in history is meaningful, not waste');
  t('history order is unchanged',
    out.indexOf('Turn 1 —') < out.indexOf('Turn 2 —'));
}

console.log('\n3. STATIC DUPLICATION IS STILL REMOVED');
{
  const n = (out.match(/SHARED CRAFT LAWS:/g) || []).length;
  t('the duplicated INSTRUCTION block appears once', n === 1, 'found ' + n);
  // Compare the HEADERS, not a header plus the fixture's own line separator — the volatile
  // region keeps its internal spacing verbatim, so matching on it was my bug, not the code's.
  t('the static tail survived and moved into the prefix',
    /RESPONSE CONTRACT:/.test(out)
      && out.indexOf('RESPONSE CONTRACT:') < out.indexOf('CURRENT STATE:'));
}

console.log('\n4. ORDER AND MARKERS');
{
  t('no boundary markers leak into the prompt', !out.includes(S) && !out.includes(E));
  t('the stranded per-turn LINE moved to the tail',
    out.indexOf('PLAYER STYLE PROFILE:') > out.indexOf('RESPONSE CONTRACT:'));
  t('the volatile region is LAST',
    out.indexOf('I fold it') > out.indexOf('PLAYER STYLE PROFILE:'));
}

console.log('\n5. FAIL-SAFE — no markers means NO rewriting');
{
  const plain = 'INSTRUCTIONS\n\nNEW USER INPUT:\nSAY: "hello"\n\nmore text';
  const same = await page.evaluate((p) => window._oasCompactTurnPrompt(p), plain);
  t('a prompt without declared boundaries is returned byte-identical', same === plain,
    'the compactor fell back to parsing prose, which is the defect it replaced');
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
