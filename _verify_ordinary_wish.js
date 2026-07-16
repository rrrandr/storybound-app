// Guard: Phase-2 step D — ordinary Say/Do wish rail (invocation detector + resolver). Loads the LIVE
// app.js in a browser (so B/C/detectSacrifice/tables are all present) and calls window._detectOrdinary-
// WishInvocation / window._resolveOrdinaryWish against an in-place Fatelands state stub. No story-gen.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._detectOrdinaryWishInvocation === 'function' && typeof window._resolveOrdinaryWish === 'function', { timeout: 45000 });

  const R = await page.evaluate(() => {
    const out = { fails: [], notes: [] };
    const A = (c, m) => { if (!c) out.fails.push(m); };
    // mutate state IN PLACE (window.state === module state) so both views agree
    const reset = () => { const s = window.state; Object.assign(s, { world: 'Fantasy', turnCount: 0, fantasyRegion: 'the_shackle_isles' }); s.picks = Object.assign(s.picks || {}, { world: 'Fantasy' }); s._openFateBargains = []; s._durableFateConsequences = []; s._fateTollLedger = []; s._obligationLedger = []; s.tempt_fate_invoked_this_turn = false; s.fate = { pendingPetition: null }; };
    const D = window._detectOrdinaryWishInvocation, RES = window._resolveOrdinaryWish;

    // (1) detector INVOCATION FLOOR — FIELD-AWARE EXTERNALIZATION LAW.
    // "A whisper is enough; a thought is not." DIA (Say) = expressed by construction;
    // ACT (Do) fires only when the action EXTERNALIZES the wish (expression/manifest-
    // ation verb, or a Fate-address/offer/ritual). Bare/thought-framed Do wish = NO.
    reset();
    const inv = (a, d) => { const r = D(a, d); return !!(r && r.invoked); };
    const firesDo  = t => inv(t, '');   // wish in the ACT ("Do") field
    const firesSay = t => inv('', t);   // wish in the DIA ("Say") field

    // ── THE 10-ROW TABLE (act | dia | fires?) from the design law ──
    A( firesSay("I wish the guard would leave"),                                          'row1: spoken Say wish did NOT fire (should)');
    A(!firesDo ('I think, "I wish the guard would leave"'),                               'row2: internal-thought Do wish FIRED (should NOT)');
    A( firesDo ('I whisper, "I wish the guard would leave"'),                             'row3: whispered Do wish did NOT fire (should)');
    A(!firesDo ("I wish the guard would leave"),                                          'row4: bare unexpressed Do wish FIRED (should NOT)');
    A( firesDo ('I write "I wish for rain" in the ash'),                                  'row5: written Do wish did NOT fire (should)');
    A( firesDo ("I trace the old wishing-sign and mouth my wish for her to live"),        'row6: enacted/mouthed Do wish did NOT fire (should)');
    A( firesDo ("Fate, open the door"),                                                   'row7: Fate-address Do did NOT fire (should)');
    A(!firesDo ("I silently wish he would leave"),                                        'row8: unmanifested "silently wish" Do FIRED (should NOT)');
    A(!firesDo ('She said, "I wish you were dead"'),                                      'row9: 3rd-person recounted Do wish FIRED (should NOT)');
    A( firesDo ("Take my voice and let her live"),                                        'row10: offer/ritual Do act did NOT fire (should)');

    // ── recounting heuristic keys on THIRD-PERSON attribution ONLY ──
    A( firesDo ('I say, "I wish he would love me"'),                                      'floor: 1st-person "I say, \\"I wish…\\"" did NOT fire (PC externalizing — should)');
    A(!firesDo ('He told me, "I wish you were gone"'),                                    'floor: 3rd-person "He told me, \\"…\\"" FIRED (recounting — should NOT)');

    // ── DIA (Say) fires by construction; a matching BARE Do does NOT ──
    A( firesSay("I wish he would love me"),                                               'floor: Say "I wish he would love me" did NOT fire (should)');
    A(!firesDo ("I wish he would love me"),                                               'floor: bare Do "I wish he would love me" FIRED (should NOT — unexpressed)');
    A( firesDo ('I whisper, "I wish he would love me"'),                                  'floor: externalized Do "I whisper, \\"I wish…\\"" did NOT fire (should)');
    A(!firesDo ('I think, "I wish he would love me"'),                                    'floor: thought Do "I think, \\"I wish…\\"" FIRED (should NOT)');

    // ── "If only" = second operative construction: Say fires; bare Do does not ──
    A( firesSay("If only the door were open"),                                            'floor: Say "If only the door were open" did NOT fire (should)');
    A(!firesDo ("If only the door were open"),                                            'floor: bare Do "If only the door were open" FIRED (should NOT — unexpressed)');
    A( firesDo ('I mutter, "If only she could breathe"'),                                 'floor: externalized Do "I mutter, \\"If only…\\"" did NOT fire (should)');

    // ── STILL EXCLUDED regardless of field — 3rd-person, negation, non-request ──
    A(!firesSay("she wished for rain"),                                                   'floor: third-person "she wished for rain" fired (should NOT)');
    A(!firesSay("he wished he had stayed home"),                                          'floor: third-person "he wished he had stayed home" fired (should NOT)');
    A(!firesSay("I do not wish him harm"),                                                'floor: negated "I do not wish him harm" fired (should NOT)');
    A(!firesSay("I don't wish him harm"),                                                 'floor: negated "I don\'t wish him harm" fired (should NOT)');
    A(!firesSay("this is wishful thinking"),                                              'floor: "wishful thinking" fired (should NOT — no request)');
    A(!firesSay("make a wish"),                                                           'floor: "make a wish" fired (should NOT — not first-person)');

    // ── Fate-address / offer / ritual = external by nature → fire from the Do field ──
    A(firesDo("Fate, silence him — take my voice"),  'floor: address+offer did NOT fire (should)');
    A(firesDo("Fate, return him to me"),             'floor: bare Fate-address (no offer) did NOT fire (should)');
    A(firesDo("I'll offer my voice to Fate to save her"), 'floor: explicit offer-to-Fate did NOT fire (should)');

    // (2) Fate OVERRIDES the offer on a resisted Order (AGENCY: love → Fate takes elsewhere, warp)
    reset();
    const dir2 = RES("Fate, make her love me — take my blood", "", 0) || '';
    const dc2 = window.state._durableFateConsequences;
    A(dir2 && /SEMANTIC WARP|warp/i.test(dir2), 'resolve: love-wish did not warp');
    A(dir2 && /FATE DOES NOT TAKE WHAT WAS OFFERED|Fate (?:takes|reaches)/i.test(dir2), 'resolve: directive did not signal Fate choosing the sacrifice');
    A(dc2.length >= 1 && dc2[dc2.length - 1].type !== 'other' ? true : dc2.length >= 1, 'resolve: no durable consequence recorded for the love-wish');
    out.notes.push('love-wish durable type = ' + (dc2[dc2.length - 1] && dc2[dc2.length - 1].type));

    // (3) clean landing on a welcomed Order (RESTORATION heal)
    reset();
    const dir3 = RES("Fate, heal her wound — take my blood", "", 0) || '';
    A(dir3 && /LANDS CLEAN|lands clean|landed/i.test(dir3), 'resolve: heal-wish did not land clean');
    A(window.state._durableFateConsequences.length >= 1, 'resolve: heal-wish recorded no consequence');

    // (4) ledger receipt written
    reset();
    RES("Fate, heal her wound — take my blood", "", 0);
    const led = window.state._fateTollLedger, last = led[led.length - 1];
    A(last && last.kind === 'bargain_receipt' && last.rail === 'ordinary' && (last.severity === 0 || last.severity == null) && last.sacrificeTaken, 'ledger: receipt missing/malformed');

    // (5) anti-spam CONTINUATION — re-invoke a warping (stays-open) desire; one bargain, attempt 2
    reset();
    RES("Fate, make her love me", "", 0);                    // warps → status 'warped' (not resolved)
    const dir5 = RES("Fate, make her love me", "", 1) || '';  // re-attempt same desire → CONTINUATION
    const bars = window.state._openFateBargains;
    A(bars.length === 1, 'anti-spam: same desire made ' + bars.length + ' bargains (want 1 continuation)');
    A(bars[0] && bars[0].attemptCount === 2 && bars[0].escalation === 1, 'anti-spam: continuation did not deepen (attempt/escalation)');
    A(/CONTINUATION|again|escalat/i.test(dir5), 'anti-spam: directive did not mark the continuation');

    // (6) nearly-impossible (HISTORY) never LANDS CLEAN — it warps (refusal is vanishingly rare)
    reset();
    const dHist = RES("Fate, undo what happened yesterday — take my years", "", 0) || '';
    A(dHist && !/LANDS CLEAN|lands clean/i.test(dHist), 'nearly-impossible HISTORY wish LANDED CLEAN (should warp/refuse)');
    A(/warp|refus|translat|nearest/i.test(dHist), 'HISTORY wish produced neither warp nor refuse');
    return out;
  });

  R.notes.forEach(n => console.log('  note:', n));
  if (R.fails.length) { console.error('FAIL:\n - ' + R.fails.join('\n - ')); await browser.close(); process.exit(1); }
  console.log('PASS: field-aware floor holds (10-row table verified — Say wish EXPRESSED by construction; Do wish fires only when EXTERNALIZED via expression/manifestation verb or Fate-address/offer/ritual; bare/thought/silently Do wish does NOT fire; recounting keys on 3rd-person attribution only so "I whisper/say" fires; negation/non-request excluded); resolver warps resisted Orders, lands welcomed ones, Fate chooses the sacrifice, anti-spam continues-not-rerolls, ledger receipt written.');
  await browser.close();
})().catch(e => { console.error('GUARD FATAL', e && e.message); process.exit(1); });
