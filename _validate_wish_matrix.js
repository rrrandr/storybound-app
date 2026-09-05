// Live validation — Phase 1 (internal causality). Loads the live app and, per matrix case, resets a
// Fatelands state and captures: the classification object, the author-facing directive the prose will
// render, and the four state objects (open bargains / durable consequences / ledger). No story-gen —
// this is the INTERNAL causality the reader-facing prose (Phase 2) must match. Image endpoints mocked.
const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._resolveOrdinaryWish === 'function' && typeof window._linkFateCardBargain === 'function', { timeout: 45000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    const reset = () => { Object.assign(s, { world: 'Fantasy', turnCount: 0, fantasyRegion: 'the_shackle_isles' }); s.picks = Object.assign(s.picks || {}, { world: 'Fantasy' }); s._openFateBargains = []; s._durableFateConsequences = []; s._fateTollLedger = []; s._obligationLedger = []; s.tempt_fate_invoked_this_turn = false; s.fate = { pendingPetition: null }; };
    const snap = (label, input, kind) => {
      const cls = window.classifyWishDisposition(input);
      const inv = window._detectOrdinaryWishInvocation(input, '');
      let directive = '';
      if (kind === 'ordinary') directive = window._resolveOrdinaryWish(input, '', s.turnCount || 0) || '';
      return {
        label, input, invoked: !!(inv && inv.invoked),
        classification: { governingDesire: cls.governingDesire, dominantOrder: cls.dominantOrder, secondaryOrders: cls.secondaryOrders, resistedOperation: cls.resistedOperation, disposition: cls.disposition },
        directive: directive.slice(0, 1400),
        openBargains: JSON.parse(JSON.stringify(s._openFateBargains || [])),
        durable: JSON.parse(JSON.stringify(s._durableFateConsequences || [])),
        ledgerLast: (s._fateTollLedger || []).slice(-1)[0] || null
      };
    };
    const cases = [];

    // 1. clean ordinary wish (no named sacrifice) — RESTORATION
    reset(); cases.push(snap('1-clean', 'Fate, close her wound. Take what it costs.', 'ordinary'));
    // 2. offered sacrifice may be rejected — TEMPORARY AID, offers hair
    reset(); cases.push(snap('2-offer-rejected', 'Take my hair and let me breathe underwater.', 'ordinary'));
    // 3. resisted Order → semantic warp — AGENCY, via "I wish"
    reset(); cases.push(snap('3-warp-agency', 'I wish he would love me.', 'ordinary'));
    // 4. false friend — negated wish must NOT invoke
    reset(); { const c = snap('4-false-friend', 'I do not wish him harm — I only want to warn him.', 'ordinary'); c.stateChanged = (s._openFateBargains.length + s._durableFateConsequences.length + (s._fateTollLedger || []).length) > 0; cases.push(c); }
    // 5. continuation not reroll — same desire twice
    reset(); window._resolveOrdinaryWish('I wish he would forgive me.', '', 0); cases.push(snap('5-continuation', 'I wish he would forgive me.', 'ordinary'));
    // 10. compound bargain — History dom + Identity + Agency
    reset(); cases.push(snap('10-compound', 'I wish I could bring my dead husband back exactly as he was, with all his memories, and make him forgive me.', 'ordinary'));
    // 6/7. card-rail leverage on an open ordinary bargain
    reset();
    window._resolveOrdinaryWish('I wish she would live.', '', 0);                       // open ordinary bargain (warp/distort)
    { const before = s._openFateBargains.length; const link = window._linkFateCardBargain('petition', 'please, I only want her to live', 1); cases.push({ label: '6-ordinary→petition', input: 'petition: please, I only want her to live', linkedBargainId: link && link.id, attemptCount: link && link.attemptCount, rail: link && link.rail, sameBargain: s._openFateBargains.length === before }); }
    { const link = window._linkFateCardBargain('tempt', 'Fate, she WILL live', 2); window._resolveFateCardBargain(link, { rail: 'tempt', wishText: 'Fate, she WILL live', sceneIdx: 2, outcome: 'landed' }); cases.push({ label: '7-ordinary→tempt', input: 'tempt: Fate, she WILL live', linkedAttempt: link && link.attemptCount, statusAfterWin: link && link.status, ledgerRails: (s._fateTollLedger || []).filter(r => r.kind === 'bargain_receipt').map(r => r.rail) }); }
    return cases;
  });

  fs.writeFileSync('/tmp/wish_matrix_phase1.json', JSON.stringify(R, null, 2));
  console.log('===== WISH MATRIX — PHASE 1 (internal causality) =====\n');
  for (const c of R) {
    if (c.classification) {
      console.log(`## ${c.label} — "${c.input}"`);
      console.log(`   invoked: ${c.invoked}${c.stateChanged !== undefined ? ' · stateChanged: ' + c.stateChanged : ''}`);
      console.log(`   class: desire="${c.classification.governingDesire}" dom=${c.classification.dominantOrder} sec=[${c.classification.secondaryOrders}] resisted=${c.classification.resistedOperation} disp=${c.classification.disposition}`);
      if (c.durable && c.durable.length) console.log(`   Fate TOOK: ${c.durable.map(d => d.type + '(' + (d.detail || '') + ')').join(', ')}`);
      if (c.openBargains && c.openBargains.length) console.log(`   bargain: attempt=${c.openBargains[c.openBargains.length-1].attemptCount} status=${c.openBargains[c.openBargains.length-1].status} escalation=${c.openBargains[c.openBargains.length-1].escalation}`);
      if (c.directive) console.log(`   DIRECTIVE: ${c.directive.replace(/\s+/g, ' ').slice(0, 600)}…`);
    } else {
      console.log(`## ${c.label} — ${c.input}`);
      console.log(`   ${JSON.stringify(c)}`);
    }
    console.log('');
  }
  console.log('full JSON → /tmp/wish_matrix_phase1.json');
  await browser.close();
})().catch(e => { console.error('FATAL', e && e.message); process.exit(1); });
