// $0 POSTMORTEM — intent-vs-result on the finished image. The governing question: "if I hid the prose,
// could I correctly CAPTION this panel?" A Kresh cut-in that renders Mira is an objective failure the
// deterministic lints can't see. The comparison is deterministic; the OBSERVED side is a vision pass
// (paid) — with no observed result the postmortem returns null, never faked. Runs against localhost:3000.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._postmortem === 'function' && typeof window._buildPostmortemIntent === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const canon = { kresh: { displayName: 'Kresh', species: 'kwisheen', recognitionTraits: ['ember scaled hide', 'tentacle mane', 'six-tentacle body'] } };
    const keshPanel = { hierarchy: { primary: 'Kresh' }, wishOutcome: 'twisted' };
    const sbDoc = { frozenMoment: 'Kresh, warning crimson rippling', visualQuestion: 'who is this?' };

    // ── INTENT extraction (the expected side) ──
    const intent = window._buildPostmortemIntent(keshPanel, sbDoc, canon);
    const intentOk = intent.expectedPrimarySubject === 'Kresh' && intent.recognitionTraits.length === 3 && intent.species === 'kwisheen' && intent.wishBurst === 'twisted';

    // ── no observed result → null score (never faked from the intent) ──
    const noObs = window._postmortem(keshPanel, null, { canon: canon, sbDoc: sbDoc });
    const nullWhenNoVision = noObs.score === null && /vision pass/i.test(noObs.note);

    // ── observed MATCHES intent → all pass ──
    const good = window._postmortem(keshPanel, {
      primarySubject: 'Kresh', recognitionTraitsVisible: ['ember scaled hide', 'a tentacle mane', 'six tentacles'], species: 'kwisheen', burst: 'twisted red'
    }, { canon: canon, sbDoc: sbDoc });
    const allPass = good.score === 100 && good.failures.length === 0;

    // ── THE cut-in bug: intent Kresh, but the render shows MIRA → subject-match FAILS ──
    const wrongSubject = window._postmortem(keshPanel, {
      primarySubject: 'Mira', recognitionTraitsVisible: [], species: 'human', burst: null
    }, { canon: canon, sbDoc: sbDoc });
    const catchesWrongSubject = wrongSubject.failures.some(f => /primary subject matches intent/i.test(f.name)) && wrongSubject.score < 100;

    // ── recognition traits missing → fail ──
    const noTraits = window._postmortem(keshPanel, {
      primarySubject: 'Kresh', recognitionTraitsVisible: ['a face'], species: 'kwisheen', burst: 'twisted red'
    }, { canon: canon, sbDoc: sbDoc });
    const catchesMissingTraits = noTraits.failures.some(f => /recognition traits/i.test(f.name));

    // ── wish burst mismatch (intent twisted, render shows a clean gold burst) → fail ──
    const burstMismatch = window._postmortem(keshPanel, {
      primarySubject: 'Kresh', recognitionTraitsVisible: ['ember scaled hide', 'a tentacle mane', 'six tentacles'], species: 'kwisheen', burst: 'clean golden'
    }, { canon: canon, sbDoc: sbDoc });
    const catchesBurstMismatch = burstMismatch.failures.some(f => /wish burst/i.test(f.name));

    // ── an EVENT panel: intent = "the rift", render shows two people glaring → subject fail ──
    const eventPanel = { hierarchy: { primary: 'the collapsing rift' }, eventLed: true };
    const eventFail = window._postmortem(eventPanel, { primarySubject: 'two people glaring' }, { canon: canon, sbDoc: { frozenMoment: 'the coral seals the passage' } });
    const catchesEventNotShown = eventFail.failures.some(f => /primary subject/i.test(f.name));

    return { intentOk, nullWhenNoVision, allPass, catchesWrongSubject, catchesMissingTraits, catchesBurstMismatch, catchesEventNotShown };
  });

  await browser.close();

  const checks = [
    ['INTENT: extracts expected subject + recognition traits + species + wish outcome', R.intentOk],
    ['no observed result → score null (requires a vision pass, never faked)', R.nullWhenNoVision],
    ['observed matches intent → all checks pass (score 100)', R.allPass],
    ['CAPTION TEST: a Kresh panel that renders Mira → subject-match FAILS (the cut-in bug)', R.catchesWrongSubject],
    ['catches missing recognition traits', R.catchesMissingTraits],
    ['catches a wish-burst mismatch (intent twisted, render clean)', R.catchesBurstMismatch],
    ['catches an event panel that rendered a face-off instead of the event', R.catchesEventNotShown]
  ];

  let pass = 0, fail = 0;
  console.log('\n  POSTMORTEM — intent vs result ("could I caption this without the prose?")  ($0)\n  ' + '─'.repeat(66));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(66) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
