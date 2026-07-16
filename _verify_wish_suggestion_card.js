// Guard: Phase-2 step F — ordinary-wish candidate in the five Say/Do suggestion cards. Static checks on
// fatecards.js (machinery, Fatelands gate, ranked-not-forced, "Ask Fate to X. Offer Y." offer-not-trade
// wording) + in-browser check that a representative generated bargain action fires the step-D detector
// while the refusal-to-risk does not.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const fc = fs.readFileSync(path.join(__dirname, 'public/fatecards.js'), 'utf8');
let fail = [];
const S = (c, m) => { if (!c) fail.push(m); };

// (1) machinery + Fatelands gate + weighting present
S(/_fateWishIsFatelands/.test(fc) && /_fateWishScoreSalience/.test(fc) && /_fateWishBuildCandidates/.test(fc), 'wish-candidate machinery missing');
S(/function buildFateDeck/.test(fc) && /_fateWishScoreSalience/.test(fc.slice(fc.indexOf('function buildFateDeck'))), 'buildFateDeck does not score salience (weighting) — inclusion must not be unconditional');
S(/_fateWishIsFatelands\(/.test(fc), 'Fatelands gate not applied');
// (2) offer-not-trade wording present; the ONLY "Trade X to <verb> Y" occurrence is a comment
S(/Ask Fate to /.test(fc) && /I offer /.test(fc) && /take it, if that is your price/.test(fc), 'offer wording ("Ask Fate to X … I offer … take it, if that is your price") missing');
{
  const tradeLines = fc.split('\n').filter(l => /Trade .* to (close|heal|save|end)/i.test(l));
  S(tradeLines.length === 0 || tradeLines.every(l => l.trim().startsWith('//')), 'a real card uses the forbidden "Trade X to <verb> Y" wording (must be offer, not trade)');
}
// (3) wish cards prefill verbatim + skip generateFatePreview (so the invocation isn't rewritten out of detector range)
S(/_fateWishCandidate/.test(fc), 'wish cards not flagged (_fateWishCandidate) for verbatim prefill');
// (4) not a forced slot: a ranked pool that can yield 0 wish cards (archetypes can out-rank)
S(/slice\(0,\s*5\)/.test(fc), 'deck no longer returns a bounded top-5 (ranked pool)');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._detectOrdinaryWishInvocation === 'function', { timeout: 45000 });

  const R = await page.evaluate(() => {
    const D = window._detectOrdinaryWishInvocation;
    // representative generated actions (from the F template shapes)
    const bargainActions = [
      'Fate, heal her wound. I offer the memory of my first kiss — take it, if that is your price.',
      'Fate, save her life. I offer seven years of my life — take it, if that is your price.',
      'Fate, show me the truth. I offer the sound of my own name — take it, if that is your price.'
    ];
    const refusalAction = 'Turn from the old temptation and gather her up. Run for the healer — your own two hands will have to be enough.';
    const out = { bargainFires: bargainActions.map(a => { const r = D(a, ''); return !!(r && r.invoked); }), refusalFires: !!(D(refusalAction, '') || {}).invoked };
    return out;
  });

  if (!R.bargainFires.every(Boolean)) fail.push('a generated BARGAIN card action did not clear the detector hard floor: ' + JSON.stringify(R.bargainFires));
  if (R.refusalFires) fail.push('the REFUSAL card action fired the wish detector (it should be inert)');

  await browser.close();
  if (fail.length) { console.error('FAIL:\n - ' + fail.join('\n - ')); process.exit(1); }
  console.log('PASS: wish candidate is Fatelands-gated + salience-weighted (not forced), worded as an OFFER not a trade, prefills verbatim; generated bargain actions clear the step-D hard floor while the refusal-to-risk stays inert.');
})().catch(e => { console.error('GUARD FATAL', e && e.message); process.exit(1); });
