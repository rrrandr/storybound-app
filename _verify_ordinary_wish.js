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

    // (1) detector INVOCATION FLOOR — REVERSED rule: first-person "I wish …"+outcome FIRES.
    reset();
    const fires = t => { const r = D(t, ''); return !!(r && r.invoked); };
    // FLIPPED — casual first-person "I wish" is now a valid invocation (Fatelands danger)
    A(fires("God, I wish he'd shut up"), 'floor: first-person "I wish he\'d shut up" did NOT fire (should, reversed rule)');
    A(fires("I wish he were here"), 'floor: first-person "I wish he were here" did NOT fire (should, reversed rule)');
    A(fires("I wish he would stop talking"), 'floor: agency "I wish he would stop talking" did NOT fire (should, reversed rule)');
    A(fires('I wish I hadn\'t said "I wish"'), 'floor: compound "I wish I hadn\'t said..." did NOT fire (leading clause is genuine)');
    // "If only …" is the SECOND operative construction — fires like "I wish"
    A(fires("If only the door were open"), 'floor: "If only the door were open" did NOT fire (second operative construction)');
    A(fires("If only she could breathe"), 'floor: "If only she could breathe" did NOT fire (If only construction)');
    // STILL EXCLUDED — third-person narration, negation, non-request, command-to-another
    A(!fires("she wished for rain"), 'floor: third-person "she wished for rain" fired (should NOT)');
    A(!fires("he wished he had stayed home"), 'floor: third-person "he wished he had stayed home" fired (should NOT)');
    A(!fires("I do not wish him harm"), 'floor: negated "I do not wish him harm" fired (should NOT)');
    A(!fires("I don't wish him harm"), 'floor: negated "I don\'t wish him harm" fired (should NOT)');
    A(!fires("this is wishful thinking"), 'floor: "wishful thinking" fired (should NOT — no request)');
    A(!fires("make a wish"), 'floor: command "make a wish" fired (should NOT — not first-person)');
    A(!fires('She said, "I wish you were dead"'), 'floor: recounted quoted wish fired (should NOT — attributed to another)');
    // Existing (b) invocation paths still fire
    A(fires("Fate, silence him — take my voice"), 'floor: address+offer did NOT fire (should)');
    A(fires("Fate, return him to me"), 'floor: bare Fate-address (no offer) did NOT fire (should)');
    A(fires("I'll offer my voice to Fate to save her"), 'floor: explicit offer-to-Fate did NOT fire (should)');
    A(fires("Take my voice and let her live"), 'floor: imperative offer "take my voice" did NOT fire (should)');

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
  console.log('PASS: invocation floor holds (first-person "I wish"+outcome FIRES; third-person/negated/recounted/non-request excluded; deliberate Fate-address/offer still fires); resolver warps resisted Orders, lands welcomed ones, Fate chooses the sacrifice, anti-spam continues-not-rerolls, ledger receipt written.');
  await browser.close();
})().catch(e => { console.error('GUARD FATAL', e && e.message); process.exit(1); });
