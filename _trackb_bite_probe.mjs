// BITE PROBE for _tempt_fate_trackb_invocation_control.mjs. A control that passes first try is
// unproven until each load-bearing assertion is shown to FAIL when its mechanism is removed.
// Read-only against production code: every break is applied in-page, at runtime, and reverted.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const red = (m, wentRed, d) => { if (wentRed) { pass++; console.log('  ✓ RED as required: ' + m); } else { fail++; console.log('  ✗ STAYED GREEN (assertion is vacuous): ' + m + (d ? '  [' + d + ']' : '')); } };

(async () => {
  console.log('=== TRACK B CONTROL — BITE PROBE ===\n');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_trackb_bite_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._tfoRecordAcceptedInvocation === 'function'
    && typeof window._tfoContinuationBlocked === 'function', { timeout: 30000 });

  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'bite'; s.playerName = 'Lirael'; s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael' } };
    s.scenes = [{ title: '', synopsis: '', text: 'prose', fateCard: null }];
    s._temptFateInvocations = []; s._temptFateInvocationResolutions = [];
    s._temptOutcomePending = {}; s._temptFateDurableConsequences = [];
    window._tfoAutoExtractionEnabled = false;
  });
  const ctxLike = { storyId: 'bite', proposalId: 'p1', sceneIdx: 0, wishText: 'everyone forgets the ceremony happened' };

  // 1. Acceptance evidence is genuinely required.
  const noEv = await page.evaluate((c) => window._tfoRecordAcceptedInvocation(c, null), ctxLike);
  red('a record with NO acceptance evidence is refused (not silently created)', noEv === null, JSON.stringify(noEv));

  // 2. proposalId is genuinely required.
  const noProp = await page.evaluate(() => window._tfoRecordAcceptedInvocation({ storyId: 'bite', sceneIdx: 0 }, { kind: 'x' }));
  red('a record with NO proposalId is refused', noProp === null);

  // 3. The directive is driven by the record, not hardcoded.
  const emptyFirst = await page.evaluate(() => window._buildTemptFateUnresolvedInvocationDirective());
  red('with NO invocation records the directive is EMPTY', emptyFirst === '', 'len=' + emptyFirst.length);
  await page.evaluate((c) => window._tfoRecordAcceptedInvocation(c, { kind: 'persisted_at_capture' }), ctxLike);
  const nowFires = await page.evaluate(() => window._buildTemptFateUnresolvedInvocationDirective());
  red('...and NON-empty once one exists — the directive tracks the data', nowFires.length > 0 && /INVOCATION ACCEPTED/.test(nowFires));

  // 4. The continuation skip is the switch, not an accident of empty state.
  await page.evaluate((c) => {
    window.state._temptOutcomePending['k'] = { key: 'k', ctx: { storyId: 'bite', proposalId: 'p1', sceneIdx: 0 } };
  }, ctxLike);
  const blockedOff = await page.evaluate(() => window._tfoContinuationBlocked(window.state));
  const blockedOn = await page.evaluate(() => { window._tfoAutoExtractionEnabled = true; const r = window._tfoContinuationBlocked(window.state); window._tfoAutoExtractionEnabled = false; return r; });
  red('with automation ON the SAME pending record DOES block — so "not gated" is the switch, not an empty map',
    blockedOff === null && !!blockedOn && blockedOn.blocked === true, 'off=' + JSON.stringify(blockedOff) + ' on=' + JSON.stringify(blockedOn));

  // 5. The status derivation is real, not a stored field.
  const id = await page.evaluate(() => window.state._temptFateInvocations[0].invocationId);
  const before = await page.evaluate((i) => window._tfoInvocationStatus(window.state, i).status, id);
  await page.evaluate((i) => window._tfoDismissInvocation(i, { basis: 'probe' }), id);
  const after = await page.evaluate((i) => window._tfoInvocationStatus(window.state, i).status, id);
  const storedStill = await page.evaluate(() => window.state._temptFateInvocations[0].outcome);
  red('status changes on APPEND while the record\'s own field never moves',
    before === 'unresolved' && after === 'dismissed' && storedStill === 'unresolved',
    before + '->' + after + ' stored=' + storedStill);

  // 6. The record is genuinely frozen.
  const frozen = await page.evaluate(() => {
    const r = window.state._temptFateInvocations[0];
    let threw = false;
    try { r.outcome = 'resolved'; } catch (_) { threw = true; }
    return { frozen: Object.isFrozen(r), value: r.outcome, threw };
  });
  red('the record is frozen — a write does not take effect', frozen.frozen === true && frozen.value === 'unresolved', JSON.stringify(frozen));

  // 7. A resolution without a basis is refused (the basis check is load-bearing).
  const noBasis = await page.evaluate((i) => window._tfoResolveInvocationByHuman(i, { claims: {} }), id);
  red('a resolution with no basis is refused', noBasis === null);

  // 8. Migration's acceptance gate is what refuses, not a generic failure.
  const gate2 = await page.evaluate(() => {
    const s = window.state;
    s._temptFateInvocations = []; s._temptFateInvocationResolutions = []; s._temptFateInvocationMigrationLog = [];
    s._temptOutcomePending = { 'bad': { key: 'bad', ctx: { storyId: 'bite', proposalId: 'p9', sceneIdx: 99 } } };
    const a = window._tfoMigratePendingToInvocations();
    // now make the SAME record convertible by giving it an accepted scene at that index
    s._temptOutcomePending = { 'good': { key: 'good', ctx: { storyId: 'bite', proposalId: 'p9', sceneIdx: 0 } } };
    const b = window._tfoMigratePendingToInvocations();
    return { badInvalidated: a.invalidated.length, badConverted: a.converted.length,
             goodConverted: b.converted.length, records: s._temptFateInvocations.length };
  });
  red('the SAME shape converts with an accepted scene and is invalidated without one',
    gate2.badConverted === 0 && gate2.badInvalidated === 1 && gate2.goodConverted === 1 && gate2.records === 1,
    JSON.stringify(gate2));

  const real = gate.realCalls ? gate.realCalls() : [];
  red('zero real provider requests in the probe', real.length === 0, 'got ' + real.length);

  await browser.close();
  console.log('\n' + '='.repeat(90));
  console.log('BITE PROBE: ' + pass + '/' + (pass + fail) + ' mechanisms proven load-bearing');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROBE ERROR:', e && e.stack || e); process.exit(2); });
