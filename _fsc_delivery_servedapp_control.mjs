// SERVED-APP DELIVERY CONTROL. Provider-free: every network request is intercepted by the shared
// fail-closed gate (_e2e_network_gate.mjs) — nothing leaves the machine and nothing is spent. A
// request is either served a fixed, shape-faithful stub reply (see _fsc_stage_fixtures.json, built
// by _fsc_extract_stage_fixtures.mjs from a real recorded run) or, if it matches no registered
// stub, ABORTED and recorded in gate.unstubbed() — egress is impossible by construction either way.
//
// Drives the real served app, compiles a real consequence, runs the real generation funnel,
// identifies the TERMINAL AUTHOR request by its declared role and instruction markers — not by
// size or position — and proves the sealed consequence is present and whole in THAT request.
//
// SEEDED PATH (state._starterId = 'starter_first_sacrifice', set in section B below) makes
// _activeSeed/_activePlan resolve, so the real funnel now runs TWO upstream stages — the PC/LI
// body-bible generator and the SCENE-SPINE planner — before ever reaching the terminal author call.
// Both are stubbed below so the funnel actually completes instead of exhausting its 3-tier provider
// fallback and dying before the author. See _fsc_stage_fixtures.json for what each stub returns and
// where that content came from.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const fixtures = JSON.parse(fs.readFileSync('_fsc_stage_fixtures.json', 'utf8'));
['scenePlanner', 'authorGrok', 'pcBodyBible'].forEach((k) => {
  if (!fixtures[k] || typeof fixtures[k].content !== 'string' || !fixtures[k].content) {
    throw new Error('_fsc_stage_fixtures.json missing usable content for "' + k + '" — run _fsc_extract_stage_fixtures.mjs');
  }
});

// Same author-instruction markers section D uses to identify the terminal author request — defined
// once, here, so the stub discriminator and section D's own identification logic can never drift
// apart from each other.
const AUTHOR_MARKERS = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
  /screenplay-native|cinematic-romance writer|prose author/i];
function authorMarkCount(sysText) { return AUTHOR_MARKERS.reduce((n, rx) => n + (rx.test(sysText) ? 1 : 0), 0); }
function parsedBody(raw) { try { return JSON.parse(raw || '{}'); } catch (_) { return {}; } }
function sysTextOf(j) { const m = (j.messages || [])[0]; const c = m && m.content; return typeof c === 'string' ? c : ''; }

const browser = await chromium.launch();
const page = await browser.newPage();
if (process.env.FSC_DEBUG_CONSOLE) page.on('console', (msg) => { try { console.log('[PAGE] ' + msg.text()); } catch (_) {} });
const calls = [];

// Install FIRST — before page.goto, before anything else touches the page (permanent rule for
// every real-browser control in this repo, per the gate's own header comment).
const gate = await installFailClosedNetworkGate(page);

// One handler per path, all sharing the same body-content discriminator — the proxy endpoints are
// shared across stages (the body-bible stage, the planner, and the author all hit some of the same
// paths), so the path alone can never tell them apart; only the request's own system-message
// fingerprint can.
function stageStub(req) {
  const raw = (() => { try { return req.postData(); } catch (_) { return null; } })();
  const j = parsedBody(raw);
  const sysText = sysTextOf(j);
  const msgCount = (j.messages || []).length;
  calls.push({ url: req.url(), bytes: raw ? raw.length : 0, body: raw });

  // Terminal AUTHOR request — identified the SAME way section D identifies it below: declared role
  // (2-message chat turn) + instruction markers, never by size or endpoint. Served the real
  // recorded screenplay-author reply so downstream parsing (if the promise doesn't already resolve
  // via the timeout race) sees a real shape too.
  if (msgCount === 2 && authorMarkCount(sysText) >= 2) {
    return { content: fixtures.authorGrok.content };
  }
  // SCENE-SPINE planner — real recorded reply for this exact system-prompt fingerprint.
  if (/SCENE-SPINE planner/.test(sysText)) {
    return { content: fixtures.scenePlanner.content };
  }
  // PC/LI BODY BIBLE generator ("PROTAGONIST BODY BIBLE" / "LOVE-INTEREST BODY BIBLE") — not present
  // anywhere in the available recording (confirmed by _fsc_extract_stage_fixtures.mjs); a minimal
  // synthetic reply derived directly from the parser's own hard requirements is used instead — see
  // _fsc_stage_fixtures.json's pcBodyBible.derivation field for the exact citation.
  if (/BODY BIBLE/.test(sysText)) {
    return { content: fixtures.pcBodyBible.content };
  }
  // Anything else: no fingerprint match. Still served (never aborted — the gate's fail-closed
  // guarantee comes from every /api/** path being matched to THIS handler, not from aborting
  // unknowns), but with empty content — the app's own _callTieredProvider treats empty content as a
  // tier failure and advances/exhausts exactly as it would for a genuinely empty real reply. Nothing
  // here is invented as a plausible-looking payload for a stage this control does not recognize.
  return { content: '' };
}
gate.stub('/api/proxy', stageStub);
gate.stub('/api/mistral-proxy', stageStub);
gate.stub('/api/chatgpt-proxy', stageStub);

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscCompileAndPersist === 'function', { timeout: 20000 });

console.log('=== SERVED-APP DELIVERY CONTROL (fail-closed gate: matched requests stubbed, unmatched aborted — $0) ===\n');
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
const unstubbed = gate.unstubbed();
await browser.close();

// Identify the terminal author request by declared role + instruction markers, not by size. Same
// AUTHOR_MARKERS instance the stub discriminator above used — never a second, driftable copy.
const rows = calls.filter(c => c.body).map(c => {
  let role = null, msgs = null;
  try { const j = JSON.parse(c.body); role = j.role || null; msgs = (j.messages || []).length; } catch (_) {}
  return { url: c.url.replace('http://localhost:3000', ''), bytes: c.bytes, role, msgs, body: c.body,
    marks: AUTHOR_MARKERS.reduce((n, rx) => n + (rx.test(c.body) ? 1 : 0), 0),
    // NEW CONTRACT: the request must carry the BRIEF and must NOT carry the machine SPEC.
    hasBrief: briefAnchor ? c.body.indexOf(briefAnchor) >= 0 : false,
    hasOutcomeId: /OUTCOME: unm\./.test(c.body), hasBoundary: /EFFECT BOUNDARY/.test(c.body),
    hasBeatHeading: /AFTERMATH BEAT/.test(c.body),
    // CORRECTED (not relaxed) 2026-09-30. This used to test the bare substring
    // /FORBIDDEN INVENTIONS/, which is NOT unique to the machine spec: app.js:100511 emits its own
    // unrelated "FORBIDDEN INVENTIONS: do NOT introduce new NAMED characters..." scene constraint
    // into EVERY real author prompt, built from plan data and nothing to do with Fate. So the old
    // form was unsatisfiable against any real author request, and it only ever passed because the
    // unseeded shortcut never reached one — the same root cause as this control's original defect.
    // Now anchored on a bullet unique to _fscRenderBoundary (app.js:341355, one occurrence in the
    // whole file), so it still fails if the machine spec leaks, without firing on the collision.
    hasForbidden: /no cost or penalty beyond the one named above/.test(c.body),
    hasNotAffected: /NOT AFFECTED/.test(c.body), hasLirael: /LIRAEL IS AFFECTED/.test(c.body) };
});
const authorReqs = rows.filter(r => r.marks >= 2 && r.msgs === 2);
console.log('  provider calls attempted : ' + calls.length + '  (all stubbed — fail-closed gate, $0, nothing left the machine)');
console.log('  gate.unstubbed() (undeclared/aborted) : ' + unstubbed.length);
if (unstubbed.length) unstubbed.forEach(u => console.log('    ABORTED: ' + u.url + '  reason=' + u.reason));
console.log('  author-instruction requests identified by role+markers : ' + authorReqs.length);
// WHICH stages consumed the funnel. Without this the control could only say "0 author requests",
// never which upstream stage the funnel died in — the exact ambiguity that made a story-scope
// change look like a delivery regression. Diagnostics only; asserts nothing.
if (rows.length) {
  console.log('  funnel stages reached, in order:');
  rows.forEach(function (r, i) {
    var fp = '';
    try {
      var j = JSON.parse(r.body); var m = (j.messages || [])[0];
      fp = String((m && (m.content || m.text)) || '').replace(/\s+/g, ' ').slice(0, 110);
    } catch (_) {}
    console.log('    ' + (i + 1) + '. ' + r.url + '  role=' + (r.role || '-')
      + ' msgs=' + (r.msgs === null ? '-' : r.msgs) + ' bytes=' + r.bytes + ' markers=' + r.marks);
    if (fp) console.log('         sys: ' + fp);
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
  t('  it does NOT carry the machine spec\'s FORBIDDEN INVENTIONS bullets', terminal.hasForbidden === false);
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
