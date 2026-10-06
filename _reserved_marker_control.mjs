// RESERVED-CONTENT MARKERS: the venue "The Open" vs ordinary language. Provider-free, $0.
//
// Markers are harvested from the reserved truth as CAPITALISED words, lowercased, so the venue
// "The Open" arrives as the bare marker "open". Two rejected approaches are pinned here as
// permanent regressions:
//   BARE SUBSTRING  — blocked the live scene-7 proposal over "open doors"
//   CAPITALISATION  — failed BOTH ways: blocked sentence-initial "Open doors", and ALLOWED a
//                     genuinely convened inquiry written at lowercase "the open"
// The shipped rule reads the distinction off the reserved truth itself: the truth says the
// inquiry "would be HELD AT The Open", so this marker names a PLACE, and it counts only where the
// proposal also uses it as the head of a place phrase.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._reservedGroupsInForce === 'function'
  || typeof window.state === 'object', { timeout: 30000 }).catch(() => {});

// Drive the SHIPPED detector end to end where it is exported; otherwise exercise the shipped
// source's own matcher text, so what is tested is what was committed either way.
const probe = await page.evaluate(() => ({
  breach: typeof window._detectReservedContentBreach,
  groups: typeof window._reservedGroupsInForce
}));
console.log('shipped exports: ' + JSON.stringify(probe));

const SRC = await page.evaluate(async () => (await (await fetch('/app.js')).text()));
const seg = SRC.slice(SRC.indexOf('var _LOC_PREP ='), SRC.indexOf('for (var i = 0; i < groups.length; i++)'));
if (!seg || seg.length < 100) { console.log('FAIL: shipped matcher segment not found'); process.exit(1); }
const build = new Function('text', seg + '\n return _makeMarkerHit;');

// The reserved truth, verbatim from the seed (app.js:132698). "held at The Open" sits at index
// 317, which is why the group carries fullText and not the 180-char display slice.
const TRUTH = "LIRAEL’S FORMAL INQUIRY — WHERE AND WHEN: the presiding Dohkar has asserted "
  + "the rite and the ruling on the Sacrificiant’s conduct are his, and Julian has publicly "
  + "claimed authority to convene and preside over a formal inquiry (a Chayr and two Dohkars) into "
  + "Lirael. When that inquiry is formally convened, it would be held at The Open (the Fatelands’ "
  + "site for trials, treaties, coronations, and matters of comparable institutional gravity). It is "
  + "NOT yet convened, and its convening is LATE-ISSUE-1 content, not an early scene’s.";
const MARKERS = ['dohkar', 'open', 'chayr', 'lirael', 'julian'];
const fires = (text) => {
  const hit = build(text)(TRUTH);
  const hits = MARKERS.filter(hit);
  return { hits, fired: hits.length >= 2 };
};

console.log('\n=== TRUNCATION: the venue phrase must be visible to the classifier ===');
t('"held at The Open" is past the 180-char display slice', TRUTH.indexOf('held at The Open') > 180,
  'index ' + TRUTH.indexOf('held at The Open'));
t('and the classifier therefore needs fullText, which the group now carries',
  SRC.includes('fullText: txt') && SRC.includes('groups[i].fullText'));

console.log('\n=== THE TWO REPRODUCED FAILURES OF THE CAPITALISATION RULE ===');
{
  const r = fires("The Dohkar summons witnesses for preliminary review. Open doors let the sound reach the street.");
  t('sentence-initial "Open doors" is PERMITTED', !r.fired, JSON.stringify(r.hits));
}
{
  const r = fires("The Dohkar summons Lirael to the open for her formal inquiry.");
  t('lowercase "to the open" for an inquiry is BLOCKED', r.fired, JSON.stringify(r.hits));
}

console.log('\n=== THE ORIGINAL LIVE SCENE-7 PROPOSAL (wire/058_res.json) MUST PASS ===');
{
  const r = fires("The Dohkar's summons for review echoes through open doors into the streets. "
    + "Make the Dohkar's review summons public so rumors begin spreading through the city. "
    + "forces Lirael to choose between answering the public review or shielding the scar's truth");
  t('the captured preliminary-review proposal is PERMITTED', !r.fired, JSON.stringify(r.hits));
}

console.log('\n=== REAL PREMATURE STAGING MUST STILL BE REJECTED ===');
for (const [label, text] of [
  ['convened at the venue, capitalised', 'The Dohkar convenes the inquiry at The Open before a Chayr and two Dohkars.'],
  ['convened at the venue, lowercase',   'Lirael is summoned to the open to answer before the Dohkar.'],
  ['held at the venue',                  'The formal inquiry into Lirael is held at the Open this evening.'],
  ['the forbidden composition named',    'A Chayr and two Dohkars will sit on the matter.']
]) t('REJECTS: ' + label, fires(text).fired, JSON.stringify(fires(text).hits));

console.log('\n=== ORDINARY LANGUAGE MUST PASS ===');
for (const [label, text] of [
  ['open doors, mid-sentence',   "The Dohkar's summons echoes through open doors into the streets."],
  ['opened, past tense',         'The Dohkar opened the summons and read it aloud.'],
  ['opening, gerund',            'The Dohkar is opening the preliminary review this afternoon.'],
  ['open doors with a determiner','The Dohkar walked to the open doors and listened.'],
  ['an open question',           'The Dohkar leaves it an open question whether Lirael acted.'],
  ['out in the open air',        'The Dohkar waits with Lirael in the open air before the assembly.']
]) t('PERMITS: ' + label, !fires(text).fired, JSON.stringify(fires(text).hits));

console.log('\n=== NON-VENUE MARKERS STILL MATCH PLAINLY ===');
{
  const hit = build('two Dohkars sat with a Chayr')(TRUTH);
  t('dohkar matches, including its plural', hit('dohkar'));
  t('chayr matches', hit('chayr'));
  t('but not inside another word', !build('dohkarian customs')(TRUTH)('dohkar'));
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
