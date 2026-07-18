// $0 CASTING LIBRARY v1 — persistent visual memory for recurring characters.
// Proves: (1) a recurring NPC establishes identity from a render already paid for,
// (2) that identity is reused on later panels, (3) a better later render supersedes a
// weaker earlier one automatically — plus the governing rule that identity references
// condition MORPHOLOGY, never expression. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._castingConsiderPanel === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const reset = () => { const l = window._castingLib(); Object.keys(l).forEach(k => delete l[k]); return l; };
    let lib = reset();

    // Confidence model: a close-up of a primary subject beats a wide establishing silhouette.
    const establishingPhase = { phaseIdx: 0, _storyboardDoc: { composition: 'wide establishing shot of the drowned ruins', primarySubject: 'the raider' }, _panel: { hierarchy: { primary: 'the raider' }, shotType: 'discovery' } };
    const closeThreatPhase = { phaseIdx: 2, _storyboardDoc: { composition: 'tight close-up on the raider, predator framing', primarySubject: 'the raider' }, _panel: { hierarchy: { primary: 'the raider' }, shotType: 'combat' } };
    const vs = { camera: '', other_characters_present: [{ name: 'Kesh', species: 'kwisheen' }] };
    const confWide = window._castingIdentityConfidence(establishingPhase, vs, 'Kesh');
    const confClose = window._castingIdentityConfidence(closeThreatPhase, vs, 'Kesh');

    // (1) ESTABLISH — a first acceptable panel casts the character (no extra render).
    const r1 = window._castingConsiderPanel('Kesh', 'data:img/close1', confClose, 'scene1_phase2', { tier: 'SESSION' });
    const castNow = lib['kesh'];

    // rejection: a below-threshold (wide silhouette) panel is NOT an acceptable source.
    lib = reset();
    const rReject = window._castingConsiderPanel('Kesh', 'data:img/wide', confWide, 'scene1_phase0', {});
    const wideRejected = rReject.action === 'reject' && !lib['kesh'];

    // (3) PROMOTION — order-independent: seed a WEAK ref, then a STRONGER later panel supersedes it.
    lib = reset();
    window._castingConsiderPanel('Kesh', 'data:img/weak', 70, 'scene1_phase1', {});   // weak first
    const beforePromote = lib['kesh'].url;
    const rPromote = window._castingConsiderPanel('Kesh', 'data:img/strong', 96, 'scene1_phase4', {}); // stronger later
    const afterPromote = lib['kesh'].url;
    const promoted = rPromote.action === 'promote' && beforePromote === 'data:img/weak' && afterPromote === 'data:img/strong' && lib['kesh'].confidence === 96;
    // never DEMOTE — a subsequent weaker panel does not replace a stronger reference.
    const rKeep = window._castingConsiderPanel('Kesh', 'data:img/weaker', 60, 'scene1_phase5', {});
    const noDemote = rKeep.action === 'keep' && lib['kesh'].url === 'data:img/strong';
    // a LOCKED reference is never auto-promoted.
    lib['kesh'].locked = true;
    const rLocked = window._castingConsiderPanel('Kesh', 'data:img/betterstill', 99, 'scene1_phase6', {});
    const lockRespected = rLocked.action === 'keep' && lib['kesh'].url === 'data:img/strong';

    // (2) REUSE — resolve returns an identity anchor, counts the reuse, and the label is
    //     IDENTITY-ONLY (morphology + recognition traits; explicitly NOT expression/pose).
    lib = reset();
    window._castingConsiderPanel('Kesh', 'data:img/strong', 96, 'scene1_phase4', {});
    const anchor = window._castingResolveAnchor('Kesh');
    const reuseCounts = lib['kesh'].timesUsed === 1;
    const anchorHasUrl = !!(anchor && anchor.url === 'data:img/strong');
    const labelIdentityOnly = !!(anchor && /face|skull|jaw|eye-spacing|species|tentacle-topology|recognition traits/i.test(anchor.label));
    const labelForbidsExpression = !!(anchor && /do not copy[^.]*expression|not[^.]*expression|expression[^.]*pose/i.test(anchor.label.toLowerCase()) && /pose/i.test(anchor.label));
    const unknownResolvesNull = window._castingResolveAnchor('Nobody') === null;

    // TIER — recurrence drives retention.
    const tierWorld = window._castingTierFor(4) === 'WORLD';
    const tierSession = window._castingTierFor(2) === 'SESSION';
    const tierTransient = window._castingTierFor(1) === 'TRANSIENT';

    // SIGNIFICANT-NPC filter — PC/LI are Canon-cast; only other named characters are harvested.
    const npcYes = window._castingIsSignificantNPC({ name: 'Kesh', species: 'kwisheen' }) === true;
    const npcNoPC = window._castingIsSignificantNPC({ name: 'protagonist' }) === false;
    const npcNoLI = window._castingIsSignificantNPC({ name: 'Soren', isLI: true }) === false;
    const npcNoUnnamed = window._castingIsSignificantNPC({ species: 'guard' }) === false;

    // CASTING LINT — recurring char without a reference, low-confidence ref, and never-reused ref.
    reset();
    const lintNoRef = window._castingLint({ 'King': 3 }); // appears 3× but never cast
    const catchesNoRef = lintNoRef.warnings.some(w => /no identity reference/i.test(w));
    reset();
    window._castingConsiderPanel('King', 'data:img/lowk', 62, 'p1', {}); // cast at low confidence
    const lintLow = window._castingLint({ 'King': 3 });
    const catchesLowConf = lintLow.warnings.some(w => /confidence is low/i.test(w));
    const lintNeverUsed = window._castingLint({ 'King': 3 }); // never resolved → timesUsed 0
    const catchesNeverReused = lintNeverUsed.warnings.some(w => /never reused/i.test(w));

    return {
      confWide, confClose, closeBeatsWide: confClose > confWide + 20,
      castNow: r1.action === 'cast' && !!castNow && castNow.url === 'data:img/close1',
      wideRejected, promoted, noDemote, lockRespected,
      reuseCounts, anchorHasUrl, labelIdentityOnly, labelForbidsExpression, unknownResolvesNull,
      tierWorld, tierSession, tierTransient,
      npcYes, npcNoPC, npcNoLI, npcNoUnnamed,
      catchesNoRef, catchesLowConf, catchesNeverReused
    };
  });

  await browser.close();

  const checks = [
    ['confidence: a close-up primary panel scores far above a wide establishing shot', R.closeBeatsWide],
    ['ESTABLISH: a first acceptable panel casts the NPC (no extra render)', R.castNow],
    ['reject: a below-threshold wide silhouette is NOT stored as an identity source', R.wideRejected],
    ['PROMOTE: a stronger later panel supersedes a weaker earlier reference (order-independent)', R.promoted],
    ['never demote: a subsequent weaker panel does not replace a stronger reference', R.noDemote],
    ['a locked reference is never auto-promoted', R.lockRespected],
    ['REUSE: resolve returns the harvested URL and counts the reuse', R.reuseCounts && R.anchorHasUrl],
    ['identity-only anchor: label conditions morphology + recognition traits', R.labelIdentityOnly],
    ['identity-not-expression: label explicitly forbids copying expression/pose', R.labelForbidsExpression],
    ['unknown character resolves to null (falls back to Canon text)', R.unknownResolvesNull],
    ['tiers: 3+ appearances=WORLD, 2=SESSION, 1=TRANSIENT', R.tierWorld && R.tierSession && R.tierTransient],
    ['significant-NPC filter admits named NPC, rejects PC/LI/unnamed', R.npcYes && R.npcNoPC && R.npcNoLI && R.npcNoUnnamed],
    ['LINT: catches a recurring character with no reference', R.catchesNoRef],
    ['LINT: catches a low-confidence reference that should be superseded', R.catchesLowConf],
    ['LINT: catches a reference that was harvested but never reused', R.catchesNeverReused]
  ];

  let pass = 0, fail = 0;
  console.log('\n  CASTING LIBRARY v1 — persistent visual memory  ($0)\n  ' + '─'.repeat(62));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · confidence: wide=' + R.confWide + ' close=' + R.confClose);
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
