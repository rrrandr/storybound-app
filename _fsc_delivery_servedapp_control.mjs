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
  window.state._starterId = 'starter_first_sacrifice';
  // Deliberately leave every legacy carrier unset: no weave, no OAS budget, no active scenario.
  delete window.state._fateScenarioWeave; delete window.state._fateOASBudget;
  const rec = window._fscCompileAndPersist('I want to disappear.', { source: 'servedapp_control' });
  const attached = window._fscAttachToAuthorPayload('SYSTEM PROMPT BASE.');
  const brief = window._fscAuthorBriefBlock();
  return { outcomeId: rec.outcomeId,
    // NEW CONTRACT: the BRIEF is delivered; the machine SPEC never is.
    attachedHasBrief: !!brief && attached.indexOf(brief.trim().slice(0, 48)) >= 0,
    attachedHasOutcomeId: attached.indexOf('OUTCOME: ' + rec.outcomeId) >= 0,
    attachedHasSpecHeading: attached.indexOf('EFFECT BOUNDARY') >= 0,
    specStillRendered: (window._fscPromptBlock() || '').length > 400,
    assertOnAttached: window._fscAssertDelivered(attached),
    assertOnBase: window._fscAssertDelivered('SYSTEM PROMPT BASE.'),
    digest: window._fscBoundaryDigest(window._fscPromptBlock()) };
});
t('a consequence compiles with no weave state', indep.outcomeId === 'unm.the_turning_forgotten');
t('attach delivers the BRIEF into a bare payload', indep.attachedHasBrief);
t('attach does NOT deliver the machine spec heading', indep.attachedHasSpecHeading === false);
t('attach does NOT deliver the outcome id', indep.attachedHasOutcomeId === false);
t('the machine spec is still rendered, for scoring', indep.specStillRendered === true);
t('assertion PASSES on the attached payload', indep.assertOnAttached.ok === true,
  JSON.stringify(indep.assertOnAttached.problems));
t('assertion FAILS on a payload without it', indep.assertOnBase.ok === false);
t('failure reason is absent_from_payload',
  indep.assertOnBase.problems[0].reason === 'absent_from_payload', JSON.stringify(indep.assertOnBase.problems[0]));
t('a stable digest is produced', /^fsb[a-z0-9]+:\d+$/.test(indep.digest), indep.digest);

console.log('\nC. an ALTERED payload is rejected');
// The BRIEF is what must arrive whole now, so alteration is tested against it.
const altered = await page.evaluate(() => {
  const brief = window._fscAuthorBriefBlock();
  const lines = brief.split('\n').filter(l => l.trim().length > 20);
  const truncated = 'BASE\n' + lines.slice(0, 1).join('\n');            // first line only
  // Reword the FIRST line, which is always one of the required anchors, whatever the outcome.
  const reworded = 'BASE\n' + brief.replace(lines[0].slice(0, 30), 'SOMETHING ELSE ENTIRELY HERE.');
  return { truncated: window._fscAssertDelivered(truncated),
           reworded: window._fscAssertDelivered(reworded),
           briefAnchor: brief.trim().slice(0, 48),
           whole: window._fscAssertDelivered('BASE\n' + brief) };
});
const briefAnchor = altered.briefAnchor;
t('the whole brief passes', altered.whole.ok === true, JSON.stringify(altered.whole.problems));
t('a truncated brief is rejected', altered.truncated.ok === false);
t('  reason is partial_in_payload', altered.truncated.problems[0].reason === 'partial_in_payload',
  JSON.stringify(altered.truncated.problems[0]));
t('a reworded brief is rejected', altered.reworded.ok === false);

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
    // NEW CONTRACT: the request must carry the BRIEF and must NOT carry the machine SPEC.
    hasBrief: briefAnchor ? c.body.indexOf(briefAnchor) >= 0 : false,
    hasOutcomeId: /OUTCOME: unm\./.test(c.body), hasBoundary: /EFFECT BOUNDARY/.test(c.body),
    hasBeatHeading: /AFTERMATH BEAT/.test(c.body), hasForbidden: /FORBIDDEN INVENTIONS/.test(c.body),
    hasNotAffected: /NOT AFFECTED/.test(c.body), hasLirael: /LIRAEL IS AFFECTED/.test(c.body) };
});
const authorReqs = rows.filter(r => r.marks >= 2 && r.msgs === 2);
console.log('  provider calls attempted : ' + calls.length + '  (all aborted)');
console.log('  author-instruction requests identified by role+markers : ' + authorReqs.length);
// WHICH stages consumed the funnel. Without this the control could only say "0 author requests",
// never which upstream stage the funnel died in — the exact ambiguity that made a story-scope
// change look like a delivery regression. Diagnostics only; asserts nothing.
if (rows.length) {
  console.log('  funnel stages reached, in order:');
  rows.forEach(function (r, i) {
    console.log('    ' + (i + 1) + '. ' + r.url + '  role=' + (r.role || '-')
      + ' msgs=' + (r.msgs === null ? '-' : r.msgs) + ' bytes=' + r.bytes + ' markers=' + r.marks);
  });
}

t('at least one terminal author request was made', authorReqs.length > 0);
if (authorReqs.length) {
  const terminal = authorReqs.sort((a, b) => b.bytes - a.bytes)[0];
  console.log('  TERMINAL: ' + terminal.bytes + ' bytes  role=' + terminal.role + '  ' + terminal.url);
  t('TERMINAL AUTHOR REQUEST carries the author BRIEF', terminal.hasBrief,
    'bytes=' + terminal.bytes);
  t('  it does NOT carry the outcome id', terminal.hasOutcomeId === false);
  t('  it does NOT carry the EFFECT BOUNDARY heading', terminal.hasBoundary === false);
  t('  it does NOT carry the AFTERMATH BEAT heading', terminal.hasBeatHeading === false);
  t('  it does NOT carry FORBIDDEN INVENTIONS', terminal.hasForbidden === false);
  t('  it does NOT carry the NOT AFFECTED scope', terminal.hasNotAffected === false);
  t('  it does NOT state LIRAEL IS AFFECTED', terminal.hasLirael === false);
  t('EVERY author request carries the brief, not just one',
    authorReqs.every(r => r.hasBrief),
    authorReqs.filter(r => !r.hasBrief).length + ' without it');
  t('NO author request carries any machine-spec heading',
    authorReqs.every(r => !r.hasBoundary && !r.hasOutcomeId && !r.hasBeatHeading),
    authorReqs.filter(r => r.hasBoundary || r.hasOutcomeId).length + ' leaking');
}
t('no delivery failure was recorded during a healthy run', gen.deliveryFailure === null,
  JSON.stringify(gen.deliveryFailure));

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
