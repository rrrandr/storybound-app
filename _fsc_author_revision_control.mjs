// BOUNDED AUTHOR-REVISION RECOVERY CONTROL. Provider-free — the writer call is stubbed in-page and
// every network request is aborted. Nothing is spent.
//
// Proves, before any paid generation:
//   1. the repair brief contains ONLY the approved story brief, the failing beats, and plain
//      statements of what must change — no rule codes, no criterion names, no diagnostics;
//   2. the splice can touch ONLY the flagged beats;
//   3. the repaired plan is re-checked by the SAME full gate, and a still-bad repair is discarded;
//   4. exactly ONE call is made, ever;
//   5. a successful repair is marked recovery:'author_revision' for measurement, and that marker
//      reaches no canon field, no prompt and no UI.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
await page.route('**/api/**', async (route) => {
  let body = null; try { body = route.request().postData(); } catch (_) {}
  calls.push({ bytes: body ? body.length : 0, body });
  try { await route.abort(); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscAttemptAuthorRevision === 'function'
  && typeof window._launchStarterStory === 'function', { timeout: 20000 });

console.log('=== BOUNDED AUTHOR-REVISION RECOVERY (network aborted, writer stubbed, $0) ===\n');

console.log('A. NO deterministic local prose repair exists');
const src = fs.readFileSync('public/app.js', 'utf8');
t('the writer supplies the replacement text, not local code',
  /THE WRITER supplies the\s*\/\/ replacement text/.test(src) || /THE WRITER returns the replacement/.test(src));
t('the recovery is a model call, not a string substitution',
  /content: built\.sys/.test(src) && /content: built\.usr/.test(src)
  && /fetch\('\/api\/proxy'/.test(src));
// _authorFullScenePolicy is a THREE-TIER chain (grok → ministral → gpt-4o), so using it would have
// let one logical repair become three paid calls. The repair dispatches directly instead.
t('  and it does NOT go through the multi-tier policy chain',
  !/_authorFullScenePolicy\(built\.sys/.test(src));
t('  it reduces the chain to one entry with _noFallback',
  /_noFallback: true, roleTag: 'fate-revision'/.test(src));
t('the splice is restricted to flagged indices', /if \(i < 0 \|\| !allowed\[i\]/.test(src));
t('the repaired plan is re-checked by the SAME gate',
  /window\._fscAcceptProse\(next, sceneIndex\)/.test(src));
t('a still-failing repair is discarded', /reason: 'repair_still_rejected'/.test(src));

// Seal a consequence and build a scene that fails on two known lines.
const setup = await page.evaluate(async () => {
  const def = window.STARTER_STORIES.find(s => s.id === 'starter_first_sacrifice');
  await window._launchStarterStory(def);
  await new Promise(r => setTimeout(r, 1200));
  window._fscCompileAndPersist('I want this to have never happened.', { source: 'revision_control' });
  return !!window.state._fscActiveCompiled;
});
t('a consequence is sealed', setup);

const BAD = [
  'The crimson spiralgrass lies dark beneath my feet.',
  'Julian still holds the Answer.',
  'The Answer rests in his hands like a verdict not yet spoken.',   // failing line 2
  'Seren checks her hands as if she expects to find something.',
  'The presiding Dohkar stumbles on the closing words he has spoken a hundred times.',
  "The Dohkar's charge still hangs between us.",                    // failing line 5
  'I feel the weight of every eye that remains.',
  'I could claim what happened.',
  'Or I could let them keep their assumption.',
  'The choice is mine alone.'
];

console.log('\nB. the FAILING BEATS are located precisely');
const failing = await page.evaluate((b) => window._fscFailingBeats(
  { beats: b.map((x, i) => ({ idx: i, text: x })) }), BAD);
t('exactly two beats are flagged', failing.length === 2, JSON.stringify(failing.map(f => f.idx)));
t('  line 2 (Answer-as-judge)', failing.some(f => f.idx === 2 && f.reasons.includes('answer_as_judge')));
t('  line 5 (unpinned charge)', failing.some(f => f.idx === 5 && f.reasons.includes('unpinned_charge')));
t('  and no clean beat is flagged', failing.every(f => [2, 5].includes(f.idx)));

console.log('\nC. the REPAIR BRIEF carries only what it should');
const rb = await page.evaluate((b) => window._fscBuildRepairBrief(
  { beats: b.map((x, i) => ({ idx: i, text: x })) }), BAD);
t('a brief was built', !!rb);
const all = (rb.sys + '\n' + rb.usr);
t('it carries the approved compact story brief',
  all.indexOf('The rite concludes uninterrupted') >= 0);
t('it carries BOTH failing lines verbatim',
  all.indexOf('like a verdict not yet spoken') >= 0 && all.indexOf("Dohkar's charge still hangs") >= 0);
t('it states what must change, in plain language',
  all.indexOf('The Answer is not a judge and hands down nothing') >= 0
  && all.indexOf('No one has accused her of anything in words') >= 0);
t('it names NO rule code and NO criterion',
  !/answer_as_judge|unpinned_charge|\bC1\b|\bC2\b|\bC3\b|\bC4\b|criterion|acceptance gate/i.test(all),
  (all.match(/answer_as_judge|unpinned_charge|\bC[1-4]\b/gi) || []).join(','));
t('it leaks no machine-spec vocabulary',
  !/OUTCOME:|CEASES|NOW TRUE|EFFECT BOUNDARY|invokerScope|population\.|temporalOperation/.test(all));
t('it carries no clean beat', all.indexOf('spiralgrass lies dark') < 0);
t('it asks for JSON replacement text only', /Return ONLY a JSON array/.test(rb.sys));

console.log('\nD. ONE call, splice bounded, gate re-checked');
const run = await page.evaluate(async (b) => {
  const plan = { beats: b.map((x, i) => ({ idx: i, text: x })), visualState: {}, panels: [] };
  const out = {};
  // Stub the writer at the FETCH boundary. The revision now dispatches directly with _noFallback
  // rather than through the three-tier policy chain, so the stub must sit where the request is
  // actually made — and this also verifies the request carries _noFallback.
  const realFetch = window.fetch;
  const mk = (fn) => {
    window.__revCalls = 0; window.__revNoFallback = null; window.__revRoleTag = null;
    window.fetch = async (url, init) => {
      if (String(url).indexOf('/api/proxy') < 0) return realFetch(url, init);
      window.__revCalls++;
      let b = {}; try { b = JSON.parse(init.body); } catch (_) {}
      window.__revNoFallback = b._noFallback === true;
      window.__revRoleTag = b.roleTag || null;
      const content = fn(b);
      return { ok: true, status: 200, json: async () => ({
        choices: [{ message: { content } }], usage: null }) };
    };
  };

  // D1 — a GOOD repair: both lines fixed in canon-safe language.
  mk(() => JSON.stringify([
    { idx: 2, text: 'The Answer rests in his hands, and his hands have not moved.' },
    { idx: 5, text: 'The assembly’s suspicion rests on me all the same.' }
  ]));
  const good = await window._fscAttemptAuthorRevision(plan, 2);
  out.good = { ok: good.ok, calls: window.__revCalls, codes: good.codes,
    repairedIdx: good.repairedIdx,
    b2: good.ok ? good.plan.beats[2].text : null,
    b5: good.ok ? good.plan.beats[5].text : null,
    b0: good.ok ? good.plan.beats[0].text : null,
    marker: good.ok ? good.plan._fscRecovery : null,
    logged: (window.state._fscRecoveryLog || []).length };

  // D2 — a repair that STILL violates: must be discarded.
  mk(() => JSON.stringify([
    { idx: 2, text: 'The Answer waits in his hands like a jury.' },
    { idx: 5, text: 'The assembly’s suspicion rests on me.' }
  ]));
  const stillBad = await window._fscAttemptAuthorRevision(plan, 2);
  out.stillBad = { ok: stillBad.ok, reason: stillBad.reason, calls: window.__revCalls };

  // D3 — the writer tries to edit a line that was NOT flagged.
  mk(() => JSON.stringify([
    { idx: 2, text: 'The Answer rests in his hands, and his hands have not moved.' },
    { idx: 5, text: 'The assembly’s suspicion rests on me all the same.' },
    { idx: 0, text: 'THE WRITER REWROTE A CLEAN LINE.' }
  ]));
  const overreach = await window._fscAttemptAuthorRevision(plan, 2);
  out.overreach = { ok: overreach.ok, repairedIdx: overreach.repairedIdx,
    b0: overreach.ok ? overreach.plan.beats[0].text : null };

  // D4 — unparseable reply.
  mk(() => 'I have rewritten the lines for you, here they are in prose.');
  const junk = await window._fscAttemptAuthorRevision(plan, 2);
  out.junk = { ok: junk.ok, reason: junk.reason, calls: window.__revCalls };

  // D5 — the original plan object must be untouched throughout.
  out.originalIntact = plan.beats[2].text === b[2] && plan.beats[5].text === b[5];
  out.noFallback = window.__revNoFallback;
  out.roleTag = window.__revRoleTag;
  window.fetch = realFetch;
  return out;
}, BAD);

t('a GOOD repair is accepted', run.good.ok === true);
t('  exactly ONE call was made', run.good.calls === 1, String(run.good.calls));
t('  both flagged lines were replaced', run.good.repairedIdx.join(',') === '2,5');
t('  line 2 now states physical presence only', /hands have not moved/.test(run.good.b2));
t('  line 5 now states the assembly’s suspicion', /suspicion rests on me/.test(run.good.b5));
t('  a clean line is byte-identical', run.good.b0 === BAD[0]);
t('  marked recovery: author_revision', run.good.marker && run.good.marker.recovery === 'author_revision');
t('  with the rejected rule codes, for measurement',
  run.good.marker && run.good.marker.codes.includes('answer_as_judge')
  && run.good.marker.codes.includes('unpinned_charge'));
t('  and recorded in the internal recovery log', run.good.logged >= 1);

t('a repair that STILL violates is DISCARDED', run.stillBad.ok === false);
t('  with the reason named', run.stillBad.reason === 'repair_still_rejected', run.stillBad.reason);
t('  and still only ONE call', run.stillBad.calls === 1, String(run.stillBad.calls));

t('an edit to an UNFLAGGED line is dropped', run.overreach.ok === true
  && run.overreach.repairedIdx.join(',') === '2,5');
t('  the clean line is untouched', run.overreach.b0 === BAD[0], run.overreach.b0);

t('an unparseable reply is discarded', run.junk.ok === false);
t('  with the reason named', run.junk.reason === 'no_parseable_edits');
t('  and still only ONE call', run.junk.calls === 1);

t('the rejected plan object is never mutated in place', run.originalIntact === true);
t('the repair dispatches with _noFallback 2014 exactly ONE upstream attempt',
  run.noFallback === true);
t('  tagged fate-revision for cost attribution', run.roleTag === 'fate-revision');

console.log('\nE. the marker is measurement-only — not canon, not prompt, not UI');
const iso = await page.evaluate(() => {
  const plan = { beats: [{ idx: 0, text: 'Julian still holds the Answer and his hands have not moved.' }],
                 visualState: {}, panels: [] };
  plan._fscRecovery = { recovery: 'author_revision', codes: ['answer_as_judge'], repairedIdx: [0], at: Date.now() };
  // The marker must be INVISIBLE to the gate: the same plan with and without it must produce the
  // identical verdict. (A one-beat plan is rejected either way on the pending choice — that is the
  // gate working, and it is precisely why "accepted" alone would not have tested this.)
  const withMarker = window._fscAcceptProse(plan, 2);
  const bare = JSON.parse(JSON.stringify(plan)); delete bare._fscRecovery;
  const withoutMarker = window._fscAcceptProse(bare, 2);
  return {
    markerInvisible: JSON.stringify((withMarker.failures || []).map(f => f.kind))
                  === JSON.stringify((withoutMarker.failures || []).map(f => f.kind)),
    markerNeverAFailure: !(withMarker.failures || []).some(f => /author_revision|recovery/i.test(f.line || '')),
    // the author payload must not carry it
    payloadHasMarker: window._fscAttachToAuthorPayload('BASE.').indexOf('author_revision') >= 0,
    briefHasMarker: window._fscAuthorBriefBlock().indexOf('author_revision') >= 0,
    domHasMarker: /author_revision|recovery|revision/i.test(document.body.innerText || '')
  };
});
await browser.close();
t('the marker is INVISIBLE to the gate — identical verdict with and without it',
  iso.markerInvisible === true);
t('  and never appears as a failure line', iso.markerNeverAFailure === true);
t('the author payload carries no marker', iso.payloadHasMarker === false);
t('the compact brief carries no marker', iso.briefHasMarker === false);
t('nothing about the recovery is in the DOM', iso.domHasMarker === false);
// Asserting zero ATTEMPTS would be wrong — the app makes some during launch, and the route handler
// aborts them all. The real claim is that the REPAIR never went over the wire: it was served by the
// stub, so no captured request body carries the repair brief.
const wire = calls.filter(c => c.body).map(c => c.body).join('\n');
t('the repair brief never reached the network',
  wire.indexOf('THE LINES TO REWRITE') < 0 && wire.indexOf('WHAT MUST CHANGE') < 0);
t('  no request carries the fate-revision role tag', wire.indexOf('fate-revision') < 0);
console.log('  ' + calls.length + ' requests attempted during launch, all aborted; '
  + 'the writer was stubbed in-page');

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
