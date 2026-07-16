// Guard: Phase-2 step E — Petition/Tempt discover + act on a matching open bargain (cross-rail
// continuation), WITHOUT altering their Fortune guarantees or adding a sacrifice. Static check on the
// guarantee lines + in-browser behavioral check of _linkFateCardBargain / _resolveFateCardBargain.
const fs = require('fs');
const { chromium } = require('playwright-core');

const src = fs.readFileSync(require('path').join(__dirname, 'public/app.js'), 'utf8');
let staticFail = [];
// guarantees byte-present (unchanged by E)
if (!src.includes('TEMPT FATE IS NEVER REFUSED and NEVER DOWNGRADED')) staticFail.push('Tempt never-downgraded line missing/altered');
if (!src.includes('GRANTED (first petition, guaranteed): Fate HONORS this opening ask')) staticFail.push('Petition guaranteed-first line missing/altered');
// E helpers present, and the card rails do NOT add a native sacrifice (no resolveSacrifice/_fateChooseSacrifice inside the E block)
if (!/function _linkFateCardBargain|function _resolveFateCardBargain/.test(src)) staticFail.push('E helpers missing');
{
  const s = src.indexOf('function _linkFateCardBargain'); const e = src.indexOf('window._resolveFateCardBargain');
  const blk = (s >= 0 && e > s) ? src.slice(s, e) : '';
  if (/_recordDurableConsequence|resolveSacrifice\(|_fateChooseSacrifice/.test(blk)) staticFail.push('E block adds a native sacrifice to the card rails (must not)');
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._linkFateCardBargain === 'function' && typeof window._resolveFateCardBargain === 'function' && typeof window._findOrCreateFateBargain === 'function', { timeout: 45000 });

  const R = await page.evaluate(() => {
    const out = { fails: [] };
    const A = (c, m) => { if (!c) out.fails.push(m); };
    const s = window.state;
    const reset = () => { Object.assign(s, { world: 'Fantasy', turnCount: 0, fantasyRegion: 'the_shackle_isles' }); s.picks = Object.assign(s.picks || {}, { world: 'Fantasy' }); s._openFateBargains = []; s._durableFateConsequences = []; s._fateTollLedger = []; s._obligationLedger = []; };
    const C = window.classifyWishDisposition, FOC = window._findOrCreateFateBargain, LINK = window._linkFateCardBargain, RESV = window._resolveFateCardBargain;

    // (1) CROSS-RAIL continuation: ordinary → petition → tempt, all the same desire (love-family collapses)
    reset();
    const b1 = FOC(C('Fate, make her love me'), { rail: 'ordinary', sceneIdx: 0, text: 'Fate, make her love me' });
    const b2 = LINK('petition', 'I want her to love me', 1);
    A(b2 && b2.id === b1.id && b2.attemptCount === 2 && b2.rail === 'petition', 'petition did not continue the ordinary bargain (want same id, attempt 2, rail petition)');
    const b3 = LINK('tempt', 'Fate, let her love me', 2);
    A(b3 && b3.id === b1.id && b3.attemptCount === 3 && b3.rail === 'tempt', 'tempt did not continue the same bargain across rails (want attempt 3, rail tempt)');
    A(s._openFateBargains.length === 1, 'cross-rail continuation created extra bargains (want 1)');

    // (2) NO false hijack: a different desire → a separate bargain
    const nBefore = s._openFateBargains.length;
    const bx = LINK('tempt', 'make me rich beyond counting', 3);
    A(bx && bx.id !== b1.id && s._openFateBargains.length === nBefore + 1, 'a non-matching desire hijacked or failed to create a new bargain');

    // (3) TEMPT resolves the desire → stops being continuable
    reset();
    const t1 = LINK('tempt', 'Fate, make her love me', 0);
    RESV(t1, { rail: 'tempt', wishText: 'Fate, make her love me', sceneIdx: 0, outcome: 'landed' });
    A(t1.status === 'resolved', 'tempt win did not resolve the bargain');
    const t2 = LINK('tempt', 'Fate, make her love me', 1);
    A(t2 && t2.id !== t1.id, 'a RESOLVED desire was still matched (should start a fresh bargain)');

    // (4) PETITION withheld → stays continuable
    reset();
    const p1 = LINK('petition', 'Fate, make her love me', 0);
    RESV(p1, { rail: 'petition', wishText: 'Fate, make her love me', sceneIdx: 0, outcome: 'not_granted' });
    A(p1.status !== 'resolved', 'a withheld petition wrongly resolved (should stay continuable)');
    const p2 = LINK('petition', 'Fate, make her love me', 1);
    A(p2 && p2.id === p1.id && p2.attemptCount === p1.attemptCount, 'a withheld petition did not stay continuable');

    // (5) ledger receipts span rails
    reset();
    const g = LINK('petition', 'Fate, make her love me', 0);
    RESV(g, { rail: 'petition', wishText: 'Fate, make her love me', sceneIdx: 0, outcome: 'not_granted' });
    const g2 = LINK('tempt', 'Fate, make her love me', 1);
    RESV(g2, { rail: 'tempt', wishText: 'Fate, make her love me', sceneIdx: 1, outcome: 'landed' });
    const led = s._fateTollLedger || [];
    A(led.some(r => r.kind === 'bargain_receipt' && r.rail === 'petition') && led.some(r => r.kind === 'bargain_receipt' && r.rail === 'tempt'), 'ledger did not record receipts for both petition and tempt rails');
    return out;
  });

  const fails = staticFail.concat(R.fails);
  if (fails.length) { console.error('FAIL:\n - ' + fails.join('\n - ')); await browser.close(); process.exit(1); }
  console.log('PASS: Petition/Tempt continue a matching bargain across rails (Fortunes = leverage not reroll), do not hijack unrelated desires; tempt-win resolves + a resolved desire stops continuing, withheld petition stays continuable; ledger spans rails; guarantee lines byte-intact; no sacrifice added to card rails.');
  await browser.close();
})().catch(e => { console.error('GUARD FATAL', e && e.message); process.exit(1); });
