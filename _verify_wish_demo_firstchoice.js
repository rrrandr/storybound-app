// Guard: step 5 — the demo first-choice spread (non-wish-heavy, ≤1 wish). Static structure on
// fatecards.js + behavioral detector-agreement: the wish card fires _detectOrdinaryWishInvocation; the
// four response cards must NOT (a physical/social action must not be misread as a wish).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const fc = fs.readFileSync(path.join(__dirname, 'public/fatecards.js'), 'utf8');
let sFail = [];
if (!/_fatelandsWishDemoOpenerFired\s*===\s*true/.test(fc)) sFail.push('demo branch not gated on _fatelandsWishDemoOpenerFired === true');
if (!/!\s*state\.turnCount|state\.turnCount\s*===\s*0|!state\.turnCount/.test(fc)) sFail.push('demo branch not first-choice-only (!turnCount)');
if (!/_fateWishIsFatelands\(/.test(fc)) sFail.push('demo branch not Fatelands-gated');
if (!/Your Own Hands/.test(fc) || !/What Fate Took/.test(fc) || !/What They Risked/.test(fc)) sFail.push('authored non-wish cards missing');
if (/id:\s*'(PetitionFate|TemptFate)'/.test(fc.slice(fc.indexOf('Your Own Hands') - 800, fc.indexOf('What They Risked') + 300))) sFail.push('a demo response card uses Petition/Tempt art (id)');

// The four non-wish card ACTION/dialogue strings (from the demo spread) + the authored wish fallback.
const nonWish = [
  ['I stop waiting for a miracle and throw my shoulder into the door, dragging us both clear.', 'Move — now, while we still can.'],
  ['I reach for them, catching their arm before they can turn away.', 'What did you just do? Look at me — what did you just do?'],
  ['I search their face for what\'s missing — I have to know what Fate took.', ''],
  ['I put myself between them and the altar, my voice low and level.', 'You should never have bargained. Do you even know what you\'ve lost?']
];
const wishCard = ['Fate, hear me — spare them what is coming. I offer the years I have not yet lived; take them if that is your price.', 'If the old bargains are real, then I make one now — take what it costs.'];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._detectOrdinaryWishInvocation === 'function', { timeout: 45000 });
  const R = await page.evaluate((data) => {
    const D = window._detectOrdinaryWishInvocation;
    return {
      wishFires: !!(D(data.wish[0], data.wish[1]) || {}).invoked,
      nonWishFires: data.nonWish.map(c => !!(D(c[0], c[1]) || {}).invoked)
    };
  }, { wish: wishCard, nonWish });
  await browser.close();
  const fails = sFail.slice();
  if (!R.wishFires) fails.push('the demo WISH card action does not fire the detector (would not resolve a wish)');
  R.nonWishFires.forEach((f, i) => { if (f) fails.push('non-wish response card #' + (i + 1) + ' FALSELY fires the wish detector (physical/social action misread as a wish): ' + nonWish[i][0].slice(0, 60)); });
  if (fails.length) { console.error('FAIL:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS: demo first-choice spread is flag+first-choice+Fatelands gated, 4 authored non-wish (neutral art) + exactly 1 wish; the wish card fires the detector and the four response cards do not.');
})().catch(e => { console.error('GUARD FATAL', e && e.message); process.exit(1); });
