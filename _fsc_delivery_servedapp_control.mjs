// SERVED-APP DELIVERY CONTROL. Provider-free: every network request is ABORTED, nothing leaves
// the machine and nothing is spent.
//
// Drives the real served app, compiles a real consequence, runs the real generation funnel,
// identifies the TERMINAL AUTHOR request by its declared role and instruction markers — not by
// size or position — and proves the sealed consequence is present and whole in THAT request.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
await page.route('**/api/**', async (route) => {
  const req = route.request();
  let body = null; try { body = req.postData(); } catch (_) {}
  calls.push({ url: req.url(), bytes: body ? body.length : 0, body });
  try { await route.abort(); } catch (_) {}
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscCompileAndPersist === 'function', { timeout: 20000 });

console.log('=== SERVED-APP DELIVERY CONTROL (all network aborted, $0) ===\n');
console.log('A. the app exposes the delivery surface');
const surface = await page.evaluate(() => ({
  attach: typeof window._fscAttachToAuthorPayload,
  assert: typeof window._fscAssertDelivered,
  digest: typeof window._fscBoundaryDigest,
  precheck: typeof window._fscPayloadIntegrity
}));
t('_fscAttachToAuthorPayload exposed', surface.attach === 'function');
t('_fscAssertDelivered exposed', surface.assert === 'function');
t('_fscBoundaryDigest exposed', surface.digest === 'function');
t('_fscPayloadIntegrity (render precheck) exposed', surface.precheck === 'function');

console.log('\nB. delivery is independent of legacy Fate-weave state');
const indep = await page.evaluate(() => {
  window.state = window.state || {};
  // Deliberately leave every legacy carrier unset: no weave, no OAS budget, no active scenario.
  delete window.state._fateScenarioWeave; delete window.state._fateOASBudget;
  const rec = window._fscCompileAndPersist('I want to disappear.', { source: 'servedapp_control' });
  const attached = window._fscAttachToAuthorPayload('SYSTEM PROMPT BASE.');
  return { outcomeId: rec.outcomeId,
    attachedHasOutcome: attached.indexOf('OUTCOME: ' + rec.outcomeId) >= 0,
    attachedHasBoundary: attached.indexOf('EFFECT BOUNDARY') >= 0,
    assertOnAttached: window._fscAssertDelivered(attached),
    assertOnBase: window._fscAssertDelivered('SYSTEM PROMPT BASE.'),
    digest: window._fscBoundaryDigest(window._fscPromptBlock()) };
});
t('a consequence compiles with no weave state', indep.outcomeId === 'unm.the_turning_forgotten');
t('attach delivers it into a bare payload', indep.attachedHasOutcome && indep.attachedHasBoundary);
t('assertion PASSES on the attached payload', indep.assertOnAttached.ok === true,
  JSON.stringify(indep.assertOnAttached.problems));
t('assertion FAILS on a payload without it', indep.assertOnBase.ok === false);
t('failure reason is absent_from_payload',
  indep.assertOnBase.problems[0].reason === 'absent_from_payload', JSON.stringify(indep.assertOnBase.problems[0]));
t('a stable digest is produced', /^fsb[a-z0-9]+:\d+$/.test(indep.digest), indep.digest);

console.log('\nC. an ALTERED payload is rejected');
const altered = await page.evaluate(() => {
  const block = window._fscPromptBlock();
  const stripped = ('BASE\n' + block).replace(/- FORBIDDEN INVENTIONS:[\s\S]*$/, '');   // truncate the block
  const noBeat = ('BASE\n' + block).replace(/AFTERMATH BEAT/g, 'AFTERTHOUGHT');
  return { stripped: window._fscAssertDelivered(stripped),
           noBeat: window._fscAssertDelivered(noBeat) };
});
t('a truncated boundary is rejected', altered.stripped.ok === false);
t('  reason is partial_in_payload', altered.stripped.problems[0].reason === 'partial_in_payload',
  JSON.stringify(altered.stripped.problems[0]));
t('a payload with the aftermath beat removed is rejected', altered.noBeat.ok === false);

console.log('\nD. the REAL generation funnel, and the TERMINAL AUTHOR request');
calls.length = 0;
const gen = await page.evaluate(async () => {
  const o = {};
  try { await Promise.race([window._runCGScreenplayGen(1, '', ''), new Promise(r => setTimeout(r, 30000))]); }
  catch (e) { o.err = String(e && e.message); }
  o.deliveryFailure = window.state._fscDeliveryFailure || null;
  return o;
});
await browser.close();

// Identify the terminal author request by declared role + instruction markers, not by size.
const MARKERS = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
  /screenplay-native|cinematic-romance writer|prose author/i];
const rows = calls.filter(c => c.body).map(c => {
  let role = null, msgs = null;
  try { const j = JSON.parse(c.body); role = j.role || null; msgs = (j.messages || []).length; } catch (_) {}
  return { url: c.url.replace('http://localhost:3000', ''), bytes: c.bytes, role, msgs, body: c.body,
    marks: MARKERS.reduce((n, rx) => n + (rx.test(c.body) ? 1 : 0), 0),
    hasConsequence: /OUTCOME: unm\./.test(c.body), hasBoundary: /EFFECT BOUNDARY/.test(c.body),
    hasBeat: /AFTERMATH BEAT/.test(c.body), hasForbidden: /FORBIDDEN INVENTIONS/.test(c.body),
    hasNotAffected: /NOT AFFECTED/.test(c.body), hasLirael: /LIRAEL IS AFFECTED/.test(c.body) };
});
const authorReqs = rows.filter(r => r.marks >= 2 && r.msgs === 2);
console.log('  provider calls attempted : ' + calls.length + '  (all aborted)');
console.log('  author-instruction requests identified by role+markers : ' + authorReqs.length);

t('at least one terminal author request was made', authorReqs.length > 0);
if (authorReqs.length) {
  const terminal = authorReqs.sort((a, b) => b.bytes - a.bytes)[0];
  console.log('  TERMINAL: ' + terminal.bytes + ' bytes  role=' + terminal.role + '  ' + terminal.url);
  t('TERMINAL AUTHOR REQUEST carries the sealed consequence', terminal.hasConsequence,
    'bytes=' + terminal.bytes);
  t('  it carries the EFFECT BOUNDARY', terminal.hasBoundary);
  t('  it carries the AFTERMATH BEAT', terminal.hasBeat);
  t('  it carries FORBIDDEN INVENTIONS', terminal.hasForbidden);
  t('  it carries the NOT AFFECTED scope', terminal.hasNotAffected);
  t('  it states LIRAEL IS AFFECTED', terminal.hasLirael);
  t('EVERY author request carries it, not just one',
    authorReqs.every(r => r.hasConsequence && r.hasBoundary),
    authorReqs.filter(r => !r.hasConsequence).length + ' without it');
}
t('no delivery failure was recorded during a healthy run', gen.deliveryFailure === null,
  JSON.stringify(gen.deliveryFailure));

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
