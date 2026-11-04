#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// LATE-DELIVERY ACCOUNTING — PROVIDER-FREE.
//
// WHAT THIS IS FOR. The ten-scene run recorded unfinished work and never scheduled its recovery.
// Three accounting defects made recovery unrepresentable, all measured from that run's artifacts:
//   (1) the watch list was built from _activePlan(s).scenes (STARTER_PLANS[_starterId]) while the
//       ASSIGNMENTS came from the generated scaffold — so the list was empty for all ten scenes:
//       0 [MILESTONE-WATCH] lines, 0 _milestoneDeliveries records, against 16 prereq records from
//       the same block reading the same plan object's `prerequisites`.
//   (2) the accept guard discarded every target at or behind the cursor, so a row left outstanding
//       at its own scene could never afterwards be credited by anything.
//   (3) the author-packet bucket required a committed row to carry facts of its own, so a row
//       credited at a LATER scene vanished from the packet instead of being reported as established.
// A fourth was found by writing this suite's first version: the backward target was sent as
// text.slice(0, 180) while an accepted answer credits the WHOLE row. Row 6 is 279 characters and
// the tail is the part worth writing. No target is truncated now; the request is bounded by how
// MANY obligations it carries, dropping whole entries and naming them.
//
// WHAT IS TESTED: that a genuinely completed earlier obligation can LEAVE the owed set, through the
// REAL producer (section F: a controlled verifier reply driven through _commitScene) and the real
// consumers (section G), and survive a snapshot round trip (section H).
//
// SECTION K is the recovery DECISION: the existing planner is handed the scene's current assignment
// and ONE outstanding obligation — original assignment whole, plus whatever is already established
// there — and must answer incorporate / defer / retire. Planning an incorporation does NOT discharge
// the obligation (only a verified delivery does, through the producer section F exercises), deferral
// stays owed, and retirement is accepted only on a committed fact from a LATER scene, quoted
// verbatim. No selector was changed: nothing here chooses a scene's event.
//
// WHAT IS NOT TESTED, AND NOT CLAIMED: the planner's own request is never assembled or dispatched —
// section K checks the two production call sites at SOURCE and says so. No model judges anything.
// The SELECTION RANKING remains an experimental policy: section J prints both orderings with no
// pass/fail attached to which row either selects, and section K asserts only that both order the
// same owed set.
//
// THE CHECKPOINT IS NOT MANIPULATED. STATE_after_scene6.json is installed as saved. Its outstanding
// rows are 3 and 5; scene 6 has NO verdict yet because its assessment runs in the NEXT turn. That
// assessment is then added in its normal position using the run's OWN recorded verdict for scene 6,
// copied verbatim from STATE_after_scene10.json — nothing is invented, and rows 3 and 5 are left
// exactly as the checkpoint has them.
//
// PROVIDER CONTACT: every request is intercepted, same-origin included. The page itself is served;
// one local endpoint is FIXTURED for the commit verifier (a stubbed reply, nothing dispatched); every
// other /api request is ABORTED and counted. Nothing is billed.
//
// Usage:  node _nf_late_credit_accounting.mjs        (needs the dev server on :3000)
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const RUN = process.env.SB_RUN_DIR
  || '/Users/romantsukerman/storybound-diag/_nf_story_test_RUN3/run_2026-11-02T19-03-47-893Z_29351';
const OUT = '_nf_late_credit_out';

let PASS = 0, FAIL = 0, INCONCLUSIVE = 0;
const FAILURES = [], INCONCLUSIVES = [];
const line = (s) => console.log(s);
const section = (t) => { line(''); line('='.repeat(88)); line(t); line('='.repeat(88)); };
const note = (l, v) => line('  ----  ' + l + ' :: ' + String(v).replace(/\n/g, ' ').slice(0, 400));
function check(label, ok, detail) {
  if (ok) { PASS++; line('  PASS  ' + label); }
  else { FAIL++; FAILURES.push(label); line('  FAIL  ' + label + (detail ? '  :: ' + String(detail).slice(0, 400) : '')); }
}
function inconclusive(label, why) {
  INCONCLUSIVE++; INCONCLUSIVES.push(label + ' — ' + why);
  line('  ????  ' + label + '\n        INCONCLUSIVE: ' + why);
}

// ── THE PRESERVED RECORD ─────────────────────────────────────────────────────────────────
const snapAt = (n) => JSON.parse(JSON.parse(
  fs.readFileSync(RUN + '/STATE_after_scene' + n + '.json', 'utf8')).storage.sb_saved_story);
const CKPT = snapAt(6).stateSnapshot;                       // post-scene-6; scene 7 is next
const LATER = snapAt(10).stateSnapshot;                     // only to copy scene 6's own verdict
const SCENE6_VERDICT = LATER._committedState.deliveryLog['6'];
const ROW6_TEXT = String(SCENE6_VERDICT.milestoneText || '');

// ── SYNTHETIC PROSE, WRITTEN FOR THIS TEST ───────────────────────────────────────────────
// Not manuscript text and never offered as any. It exists so a controlled verifier reply has
// something real to cite: it completes row 6's WHOLE assignment, tail included — the repair
// finished, the join explained, the argument briefly funny, and him attentive unobserved.
// The bracketed label is stripped by _commitScene's own prose normalisation, so the text the
// verifier is given is clean narrative.
const SYNTH = '[SYNTHETIC TEST PROSE — NOT MANUSCRIPT]\n'
  + 'The cup came back together under my hands at the stall, and I set the last of the gold along '
  + 'the seam before I let him look at it. "That is the break," Julian said, and I made him hold '
  + 'the two halves while I showed him it was not. The potter cut that seam on purpose, I told '
  + 'him. A join you can see is a join that can be trusted; it is the invisible ones that fail '
  + 'quietly. He turned it over twice and said, with enormous seriousness, that he had spent '
  + 'fifteen years learning to distrust exactly the wrong things, and I laughed before I could '
  + 'stop myself, and then he laughed too, which neither of us had expected. The repair was '
  + 'finished and it held. Later the clearing emptied and he did not look away from the work; he '
  + 'stayed where he was, watching my hands with the same attention, and nobody was there to see '
  + 'him do it.';

let apiAttempts = 0, apiAborted = 0, apiFixtured = 0, pageServed = 0;
let VERIFIER_REPLY = null;
const verifierRequests = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
// EVERY request is decided here — same-origin included. The page and its assets are served; the
// commit verifier is fixtured; everything else is aborted and counted, so "zero provider
// dispatches" is a property of the interceptor rather than an assumption about hosts.
await ctx.route('**/*', (route) => {
  const url = route.request().url();
  const isApi = /\/api\//.test(url);
  if (!isApi) {
    if (url.startsWith(ORIGIN)) { pageServed += 1; return route.continue(); }
    apiAttempts += 1; apiAborted += 1; return route.abort();
  }
  apiAttempts += 1;
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String(((body.messages || [])[0] || {}).content || '');
  const usr = String(((body.messages || [])[1] || {}).content || '');
  if (/RUNTIME COMMIT verifier/i.test(sys) && VERIFIER_REPLY) {
    apiFixtured += 1;
    verifierRequests.push({ sys, usr, at: Date.now() });
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ model: 'ministral-8b-2512', resolvedModel: 'ministral-8b-2512',
        upstreamAttempts: 1, content: JSON.stringify(VERIFIER_REPLY),
        choices: [{ message: { content: JSON.stringify(VERIFIER_REPLY) } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cost_in_usd_ticks: 0 } }) });
  }
  apiAborted += 1; return route.abort();
});
const page = await ctx.newPage();

const outstandingOf = (rows) => rows
  .filter((r) => r.delivery === 'assessed_not_delivered' || r.delivery === 'partially_verified')
  .map((r) => r.n + ':' + r.delivery);

try {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window._milestoneWatchRows === 'function'
    && typeof window._milestoneWatchTargetOK === 'function'
    && typeof window._outlineDeliveryStatus === 'function'
    && typeof window._resolveIssueOutline === 'function'
    && typeof window._selectSceneAssignment === 'function'
    && typeof window._commitScene === 'function' && typeof window._sealProposal === 'function'
    && typeof window.__buildCommitSceneIdentity === 'function'
    && typeof window.__saveStorySnapshot === 'function', { timeout: 60000 });

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('A — THE CHECKPOINT, INSTALLED AS SAVED');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const installed = await page.evaluate((st) => {
    Object.assign(window.state, st);          // MUTATE, never replace (app.js binds `var state` once)
    const cs = window.state._committedState || {};
    return { turnCount: window.state.turnCount,
      logKeys: Object.keys(cs.deliveryLog || {}), through: cs._committedThroughScene,
      facts: (cs.facts || []).map((f) => ({ ref: f.proposalRef, storyScene: f.storyScene, ms: f.milestoneScene })),
      scaffoldRows: ((window.state.cgScaffold || {}).issueArcs || [])
        .reduce((a, x) => a + ((x.sceneOutline || []).length), 0),
      authoredRows: (((window.STARTER_PLANS || {})[window.state._starterId] || {}).scenes || []).length };
  }, CKPT);
  note('turnCount / committedThrough', installed.turnCount + ' / ' + installed.through);
  note('deliveryLog keys at the checkpoint', installed.logKeys.join(','));
  note('committed facts', JSON.stringify(installed.facts));
  note('generated scaffold rows / authored STARTER_PLANS rows in the page',
    installed.scaffoldRows + ' / ' + installed.authoredRows);
  check('the checkpoint has NO verdict for scene 6 — its assessment runs in the next turn',
    installed.logKeys.indexOf('6') === -1, installed.logKeys.join(','));
  check('and it does carry the earlier verdicts, rows 2-5', installed.logKeys.join(',') === '2,3,4,5',
    installed.logKeys.join(','));

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('B — THE WATCHED SET: SOURCE PARITY, WHOLE TARGETS, ELIGIBILITY');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // ARM 1 — THE RUN'S OWN CONFIGURATION: authored rows withheld, assignments from the generated
  // scaffold, reapplied through the same mechanism the run used.
  const withheld = await page.evaluate(() => {
    const sp = (window.STARTER_PLANS || {})[window.state._starterId];
    window.__withheldRows = sp.scenes; sp.scenes = [];
    return { rowsNow: ((window._activePlan(window.state) || {}).scenes || []).length,
      withheldCount: (window.__withheldRows || []).length };
  });
  check('PRECONDITION: the authored rows are withheld, as in the run',
    withheld.rowsNow === 0 && withheld.withheldCount === 20, JSON.stringify(withheld));
  const oldBuilder = await page.evaluate((wScene) => {
    const rows = ((window._activePlan(window.state) || {}).scenes) || [];
    return rows.filter((r) => r && Number(r.n) > wScene && String(r.goal || '').trim()).length;
  }, 7);
  if (oldBuilder === 0) {
    check('  RED CONTROL: the old plan-only source yields ZERO watched rows in this configuration —'
      + ' which is why the run produced no milestone observations at all', true);
  } else {
    inconclusive('  RED CONTROL: the old plan-only source yields zero rows',
      'it produced ' + oldBuilder + ', so this configuration does not demonstrate the defect');
  }
  const gen = await page.evaluate((wScene) => window._milestoneWatchRows(window.state, wScene), 7);
  note('source now', gen.source + '  rowsSeen=' + gen.rowsSeen);
  note('forward targets', gen.forward.map((f) => f.n).join(','));
  note('dropped whole (over cap or budget)', gen.dropped.join(',') || 'none');
  check('the rows come from the assignment\'s own source',
    /resolved issue outline/.test(gen.source) && gen.rowsSeen >= 20, JSON.stringify(gen.source));
  check('…and forward (early-delivery) watching still works there', gen.forward.length > 0,
    gen.forward.length + ' forward targets');
  // NO TARGET IS SHORTENED — the defect this section exists for.
  const fullTexts = await page.evaluate((wScene) => {
    const r = window._milestoneWatchRows(window.state, wScene);
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const byN = {}; (rio.scenes || []).forEach((x) => { byN[x.n] = String(x.accomplishes || ''); });
    return [].concat(r.backward, r.forward).map((e) => ({ n: e.n, sent: e.text.length,
      row: (byN[e.n] || '').length, whole: e.text === byN[e.n] }));
  }, 7);
  const truncated = fullTexts.filter((t) => !t.whole);
  note('target lengths sent vs row length', fullTexts.slice(0, 6)
    .map((t) => t.n + ':' + t.sent + '/' + t.row).join('  ') + (fullTexts.length > 6 ? '  …' : ''));
  check('EVERY watched target is the row\'s COMPLETE assignment, not a prefix',
    truncated.length === 0, JSON.stringify(truncated).slice(0, 300));
  check('…and at least one of them is longer than the old 180-character cut',
    fullTexts.some((t) => t.sent > 180), JSON.stringify(fullTexts.map((t) => t.sent)));

  // ARM 2 — AUTHORED PRECEDENCE, and eligibility applied to authored rows too.
  const authored = await page.evaluate((wScene) => {
    const sp = (window.STARTER_PLANS || {})[window.state._starterId];
    sp.scenes = window.__withheldRows;                       // put them back
    const r = window._milestoneWatchRows(window.state, wScene);
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const row9res = (rio.scenes || []).filter((x) => x.n === 9)[0] || null;
    const row9plan = (sp.scenes || []).filter((x) => Number(x.n) === 9)[0] || null;
    const sent9 = [].concat(r.backward, r.forward).filter((e) => e.n === 9)[0] || null;
    return { source: r.source, rowsSeen: r.rowsSeen, forward: r.forward.length,
      resolvedRow9: row9res ? String(row9res.accomplishes || '').slice(0, 80) : null,
      authoredRow9: row9plan ? String(row9plan.goal || '').slice(0, 80) : null,
      sent9: sent9 ? sent9.text.slice(0, 80) : null,
      sent9Whole: !!(sent9 && row9res && sent9.text === String(row9res.accomplishes || '')) };
  }, 7);
  note('with the authored rows restored, row 9 authored vs sent', JSON.stringify({
    authored: authored.authoredRow9, sent: authored.sent9 }));
  check('AUTHORED PRECEDENCE: the watched text for an authored row is the AUTHORED assignment',
    authored.sent9 !== null && authored.authoredRow9 !== null
    && authored.sent9 === authored.authoredRow9.slice(0, 80), JSON.stringify(authored).slice(0, 300));
  check('…carried whole, not cut', authored.sent9Whole === true);
  note('eligibility on both sources', 'rows now come from the resolver, which is where authored '
    + 'precedence lives, so kind:"overturned" is available for an authored row as well — the '
    + 'earlier version set resolved:null on that branch and skipped the exclusion entirely.');

  // ARM 3 — THE FOCUSED CONTROL: A DECLARED LATER ROW KEEPS ITS PRIORITY UNDER THE CAP.
  // `eventMarkers`/`reservedEvents` are declared on the AUTHORITATIVE row, not on the resolved one,
  // so mapping resolver-first dropped them and the "declared rows first" ordering matched nothing.
  // The declaration is now looked up by row number from that same authoritative row, while the
  // assignment text and the eligibility still come from the resolver.
  const declared = await page.evaluate((wScene) => {
    const sp = (window.STARTER_PLANS || {})[window.state._starterId];
    sp.scenes = window.__withheldRows;                       // the authored rows are the declaring source
    const r = window._milestoneWatchRows(window.state, wScene, { max: 2 });
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const rows = (rio.scenes || []).filter((x) => x && Number(x.n) > wScene
      && String(x.accomplishes || '').trim() && x.kind !== 'overturned');
    // WHAT THE DROPPED-METADATA MAPPING PRODUCED: no declared bucket at all, so nearest-first.
    const nearestFirst = rows.slice().sort((a, b) => a.n - b.n).slice(0, 2).map((x) => x.n);
    const planDecl = (sp.scenes || []).filter((x) => x && ((x.eventMarkers || []).length
      || (x.reservedEvents || []).length)).map((x) => Number(x.n));
    const byN = {}; (rio.scenes || []).forEach((x) => { byN[x.n] = String(x.accomplishes || ''); });
    return { forward: r.forward.map((f) => f.n), declaredBy: r.forward.map((f) => f.n + ':' + (f.declaredBy || '—')),
      nearestFirst, planDecl, laterRows: rows.map((x) => x.n), dropped: r.dropped,
      textsWhole: r.forward.every((f) => f.text === byN[f.n]),
      scaffoldDeclares: ((window.state.cgScaffold || {}).issueArcs || [])
        .reduce((a, x) => a.concat((x.sceneOutline || []).filter((q) => q
          && ((q.event_markers || []).length || (q.reserved_events || []).length)).map((q) => q.n)), []) };
  }, 10);
  note('authored rows that DECLARE an event', declared.planDecl.join(','));
  note('generated scaffold rows that declare one', declared.scaffoldDeclares.join(',') || 'none — '
    + 'this run\'s scaffold declares no events, which is why the authored rows are the source here');
  note('later rows available at scene 10', declared.laterRows.join(','));
  note('watched forward under a 2-row cap', declared.declaredBy.join('  '));
  note('dropped whole', declared.dropped.join(',') || 'none');
  const firstDeclaredLater = declared.planDecl.filter((n) => declared.laterRows.indexOf(n) !== -1)[0];
  check('DECLARED-ROW PRIORITY: under a 2-row cap the watched forward rows are DECLARED ones, not'
    + ' merely the nearest', declared.forward.length === 2
    && declared.forward.every((n) => declared.planDecl.indexOf(n) !== -1),
    JSON.stringify(declared.forward));
  check('…and the declaration is attributed to the authoritative row it was read from',
    declared.declaredBy.every((d) => /authored plan row/.test(d)), declared.declaredBy.join('  '));
  check('…while the assignment text still comes from the resolver, whole',
    declared.textsWhole === true);
  check('…and the nearer UNDECLARED rows are the ones dropped, named in `dropped`',
    declared.nearestFirst.some((n) => declared.forward.indexOf(n) === -1)
    && declared.nearestFirst.filter((n) => declared.forward.indexOf(n) === -1)
      .every((n) => declared.dropped.indexOf(n) !== -1),
    JSON.stringify({ nearestFirst: declared.nearestFirst, dropped: declared.dropped }));
  if (firstDeclaredLater != null && declared.nearestFirst.indexOf(firstDeclaredLater) === -1) {
    check('  RED CONTROL: the dropped-metadata mapping had no declared bucket, so nearest-first gave'
      + ' [' + declared.nearestFirst.join(',') + '] and declared row ' + firstDeclaredLater
      + ' lost its place under the same cap', true);
  } else {
    inconclusive('  RED CONTROL: a declared row loses its place without the metadata',
      'at scene 10 the nearest rows are already the declared ones, so this configuration cannot'
      + ' show the difference');
  }
  note('what the character budget is', 'it bounds the FORWARD entries. A still-owed BACKWARD entry'
    + ' is charged against it first, so it displaces forward rows, but it is EXEMPT and is never'
    + ' dropped — so the total a request carries can exceed the budget. It is not a hard limit on'
    + ' the request.');
  const budget = await page.evaluate((wScene) => {
    const r = window._milestoneWatchRows(window.state, wScene, { charBudget: 120 });
    return { budget: r.budget, backward: r.backward.map((b) => b.n + ':' + b.text.length),
      forward: r.forward.map((f) => f.n), dropped: r.dropped };
  }, 8);
  note('with a 120-character forward budget', JSON.stringify(budget).slice(0, 320));
  check('a still-owed row survives a forward budget far smaller than its own text',
    budget.backward.length > 0 && budget.budget.backwardChars > 120
    && budget.budget.backwardExemptFromBudget === true, JSON.stringify(budget.budget));
  check('…and the forward rows are the ones that give way',
    budget.forward.length === 0 && budget.dropped.length > 0,
    JSON.stringify({ forward: budget.forward, dropped: budget.dropped.length }));
  // Back to the run's configuration for the rest of the suite.
  await page.evaluate(() => {
    const sp = (window.STARTER_PLANS || {})[window.state._starterId];
    window.__withheldRows = sp.scenes; sp.scenes = [];
  });

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('C — THE OUTSTANDING ROWS THE CHECKPOINT ACTUALLY HAS');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const before6 = await page.evaluate((wScene) => {
    const r = window._milestoneWatchRows(window.state, wScene);
    const rio = window._resolveIssueOutline(window.state, { force: true });
    return { backward: r.backward.map((b) => b.n + ':' + b.owedAs),
      rows: (rio.scenes || []).map((x) => ({ n: x.n, delivery: x.delivery })) };
  }, 7);
  note('outstanding rows at the checkpoint', outstandingOf(before6.rows).join('  '));
  note('watched as still-owed (nearest first, capped at 2)', before6.backward.join('  '));
  check('the checkpoint\'s outstanding rows are 3 and 5, exactly as saved',
    outstandingOf(before6.rows).join(',') === '3:partially_verified,5:partially_verified',
    outstandingOf(before6.rows).join(','));
  check('the still-owed watch asks about the two NEAREST of them',
    before6.backward.join(',') === '5:partially_verified,3:partially_verified', before6.backward.join(','));

  // SCENE 6'S ASSESSMENT, IN ITS NORMAL NEXT-TURN POSITION, using the run's own verdict.
  const after6 = await page.evaluate(([v, wScene]) => {
    window.state._committedState.deliveryLog['6'] = v;
    const r = window._milestoneWatchRows(window.state, wScene);
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const b6 = r.backward.filter((b) => b.n === 6)[0] || null;
    return { backward: r.backward.map((b) => b.n + ':' + b.owedAs),
      rows: (rio.scenes || []).map((x) => ({ n: x.n, delivery: x.delivery })),
      row6: window._outlineDeliveryStatus(window.state, 6),
      row6Sent: b6 ? b6.text : null, row6Facts: b6 ? b6.verifiedFacts : null };
  }, [SCENE6_VERDICT, 8]);
  note('the run\'s own verdict for scene 6', 'aggregate=' + SCENE6_VERDICT.aggregateDelivery
    + ' milestoneAsked=' + SCENE6_VERDICT.milestoneAsked + ' milestone=' + SCENE6_VERDICT.milestoneDelivery
    + ' pending=' + JSON.stringify(SCENE6_VERDICT.pending));
  check('row 6 now reads CHECKED AND NOT DELIVERED', after6.row6.status === 'assessed_not_delivered',
    after6.row6.status);
  check('rows 3 and 5 are untouched by that', outstandingOf(after6.rows).join(',')
    === '3:partially_verified,5:partially_verified,6:assessed_not_delivered',
    outstandingOf(after6.rows).join(','));
  check('and the still-owed watch now asks about rows 6 and 5',
    after6.backward.join(',') === '6:assessed_not_delivered,5:partially_verified', after6.backward.join(','));
  // THE TAIL THAT WAS BEING CUT, named explicitly.
  note('row 6 length / what the old 180-character cut removed', ROW6_TEXT.length + ' chars — "'
    + ROW6_TEXT.slice(180) + '"');
  check('the still-owed target carries row 6 WHOLE, including the funny turn and the attentiveness',
    after6.row6Sent === ROW6_TEXT && /funny/.test(after6.row6Sent) && /attentive/.test(after6.row6Sent),
    String(after6.row6Sent).slice(-90));

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('D — WHICH TARGETS A SCENE MAY BE CREDITED FOR');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const asked = [6, 5, 9, 12];
  const T = (tgt, at) => page.evaluate(([t, a, k]) => window._milestoneWatchTargetOK(t, a, k), [tgt, at, asked]);
  const later = await T(9, 8), earlier = await T(6, 8), own = await T(8, 8), unasked = await T(4, 8);
  check('a LATER row that was asked about is creditable, as early delivery',
    later.ok === true && later.direction === 'early', JSON.stringify(later));
  check('an OUTSTANDING EARLIER row that was asked about is creditable, as late completion',
    earlier.ok === true && earlier.direction === 'late', JSON.stringify(earlier));
  check('the scene\'s OWN row is never a watch entry', own.ok === false, own.why);
  check('a row nobody asked about is still discarded', unasked.ok === false, unasked.why);
  const oldGuard = (tgt, at) => !(tgt > 0) || tgt <= at;
  if (oldGuard(6, 8)) {
    check('  RED CONTROL: the old guard discarded row 6 at scene 8 — late completion had no'
      + ' producer anywhere in the engine', true);
  } else {
    inconclusive('  RED CONTROL: the old guard discarded the late target', 'it did not');
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('E — THE EVIDENCE GATES (real helpers, real predicates)');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const SYNTH_TEXT = SYNTH.replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const QUOTE = 'The repair was finished and it held.';
  const QUOTE2 = 'he stayed where he was, watching my hands with the same attention, and nobody was there to see him do it';
  const gates = await page.evaluate(([prose, q, q2]) => ({
    realQuote: window.__evidenceVerifies(q, prose),
    secondQuote: window.__evidenceVerifies(q2, prose),
    pair: window.__evidenceVerifies([q, q2], prose),
    paraphrase: window.__evidenceVerifies('Lirael finished the repair and Julian understood the seam', prose),
    empty: window.__hasUsableEvidence(''),
    tooMany: window.__evidenceVerifies([q, q, q, q, q], prose),
  }), [SYNTH_TEXT, QUOTE, QUOTE2]);
  check('a VERBATIM span verifies', gates.realQuote === true && gates.secondQuote === true);
  check('an array of up to four verbatim spans verifies', gates.pair === true);
  check('a paraphrase does not', gates.paraphrase === false);
  check('an empty evidence value is unusable', gates.empty === false);
  check('more than four spans is refused', gates.tooMany === false);

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('F — THE REAL PRODUCER: A CONTROLLED VERIFIER REPLY THROUGH _commitScene');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // The reply is stubbed at the local endpoint; everything else is production. The prose is this
  // file's SYNTHETIC passage, mounted as a real page with a real scene identity, so the record is
  // produced with the page uid, unit hash and character count the engine computes — not asserted.
  const commitWith = async (reply, label) => {
    VERIFIER_REPLY = reply;
    verifierRequests.length = 0;
    const r = await page.evaluate(async ([prose, rowText, assignment]) => {
      const cs = window._ensureCommittedState();
      cs._committedThroughScene = 3;                    // as the checkpoint has it
      window.state._milestoneDeliveries = [];
      window.state._sceneAssignment = { event: assignment, source: 'issue-outline' };
      window.state._sealedProposals = { seq: 7, byId: {}, byInvocation: {} };
      const sealed = window._sealProposal({ kind: 'state_change',
        fact: 'Veyra runs the second accepted alignment method before the Dohkar', milestone: assignment, scene: 8 });
      const proposal = { event: 'Veyra runs the second accepted alignment method before the Dohkar',
        proposalRef: (sealed && sealed.id) || null, kind: 'state_change', storyScene: 8, slots: null };
      StoryPagination.addPage('<p>' + prose.replace(/\n/g, '</p><p>') + '</p>', true);
      const pageUid = StoryPagination.getCurrentPageUid();
      window._sceneLedgerCommit(window.state, { kind: 'scene', sceneNumber: 8, pageUid: pageUid,
        event: proposal.event });
      const ident = window.__buildCommitSceneIdentity(window.state, prose, null, 'pagination', 8);
      await window._commitScene(prose, proposal, 6, ident);
      const recs = (window.state._milestoneDeliveries || []).map((x) => ({
        milestoneScene: x.milestoneScene, atScene: x.atScene, direction: x.direction,
        accepted: x.accepted, why: x.why, status: x.status, pageUid: x.pageUid,
        unitKind: x.unitKind, unitId: x.unitId, unitHash: x.unitHash, unitChars: x.unitChars,
        superseded: x.superseded, scope: x.scope, participants: x.participants }));
      return { records: recs, row6: window._outlineDeliveryStatus(window.state, 6),
        identity: { pageUid: ident.pageUid, pageUidSource: ident.pageUidSource,
          unitId: ident.unitId, unitKind: ident.unitKind, unitHash: ident.unitHash,
          unitChars: ident.unitChars } };
    }, [SYNTH, ROW6_TEXT, 'Veyra runs a second accepted alignment method before the Dohkar; it also'
      + ' records the marriage intact while the visible thread leans toward Julian.']);
    note(label + ' — verifier requests fixtured', verifierRequests.length);
    return r;
  };

  const REPLY_BASE = {
    delivery: 'MISSED', transition_position: -1, first_irreversible_position: 40,
    milestone_delivery: 'MISSED', milestone_evidence: '',
    per_proposal: [], prereq_watch: [],
  };
  // (1) ACCEPTED COMPLETION of the still-owed row 6.
  const acceptedRun = await commitWith(Object.assign({}, REPLY_BASE, {
    milestone_watch: [{ n: 6, status: 'delivered_on_page', evidence: [QUOTE, QUOTE2],
      participants: ['Lirael', 'Julian'], scope: 'the promised repair is finished, the join explained, and he stays attentive unobserved' }],
  }), 'accepted arm');
  const req = verifierRequests[0] || { sys: '', usr: '' };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(OUT + '/ASSESSMENT_REQUEST.txt',
    '=== SYSTEM ===\n' + req.sys + '\n\n=== USER ===\n' + req.usr);
  note('the complete assessment request', (req.sys.length + req.usr.length) + ' chars, saved to '
    + OUT + '/ASSESSMENT_REQUEST.txt');
  check('the request carries the STILL-OWED header for an earlier row',
    /STILL-OWED MILESTONES/.test(req.usr), req.usr.slice(0, 120));
  check('…and row 6\'s COMPLETE assignment reaches the verifier, tail included',
    req.usr.indexOf(ROW6_TEXT) !== -1, 'row6 text present: ' + (req.usr.indexOf(ROW6_TEXT) !== -1));
  check('…and the already-established facts from that row are named as not-this-scene\'s delivery',
    /ALREADY ESTABLISHED from that scene/.test(req.usr) || after6.row6Facts.length === 0,
    String(after6.row6Facts));
  check('…and the scene\'s OWN assignment is still asked as its own question',
    /MILESTONE ASSIGNED FOR THIS SCENE/.test(req.usr));
  note('the record the real path produced', JSON.stringify(acceptedRun.records));
  note('the identity the engine computed', JSON.stringify(acceptedRun.identity));
  const rec6 = (acceptedRun.records || []).filter((r) => r.milestoneScene === 6)[0] || null;
  check('PRODUCER: the real accept path recorded the late completion',
    !!rec6 && rec6.accepted === true && rec6.direction === 'late' && rec6.atScene === 8,
    JSON.stringify(rec6));
  check('…with the real page identity the engine computed, not a fabricated one',
    !!rec6 && !!rec6.pageUid && rec6.pageUid === acceptedRun.identity.pageUid
    && !!rec6.unitHash && Number(rec6.unitChars) > 0, JSON.stringify(rec6 && {
      pageUid: rec6.pageUid, unitHash: rec6.unitHash, unitChars: rec6.unitChars }));
  check('…and row 6 leaves the owed set as a result',
    acceptedRun.row6.status === 'committed' && acceptedRun.row6.lateCredit
    && acceptedRun.row6.lateCredit.atScene === 8, JSON.stringify(acceptedRun.row6.status));

  // (2) NON-COMPLETION: the same request, answered "mentioned".
  const mentioned = await commitWith(Object.assign({}, REPLY_BASE, {
    milestone_watch: [{ n: 6, status: 'mentioned', evidence: QUOTE,
      participants: ['Lirael', 'Julian'], scope: 'referred to only' }],
  }), 'mentioned arm');
  const recM = (mentioned.records || []).filter((r) => r.milestoneScene === 6)[0] || null;
  check('NON-COMPLETION: "mentioned" is recorded and NOT accepted',
    !!recM && recM.accepted === false && /not completion/.test(String(recM.why)), JSON.stringify(recM));
  check('…and row 6 stays owed', mentioned.row6.status === 'assessed_not_delivered', mentioned.row6.status);

  // (3) REJECTED: completion claimed with evidence that is not in the prose.
  const unverifiable = await commitWith(Object.assign({}, REPLY_BASE, {
    milestone_watch: [{ n: 6, status: 'delivered_on_page',
      evidence: 'She finished the cup and he admitted he had misread the seam entirely',
      participants: ['Lirael', 'Julian'], scope: 'the repair is finished' }],
  }), 'unverifiable-evidence arm');
  const recU = (unverifiable.records || []).filter((r) => r.milestoneScene === 6)[0] || null;
  check('REJECTED: a completion claim whose quotation is not in the prose is refused',
    !!recU && recU.accepted === false && /verifies verbatim/.test(String(recU.why)), JSON.stringify(recU));
  check('…and row 6 stays owed', unverifiable.row6.status === 'assessed_not_delivered', unverifiable.row6.status);

  // (4) UNASKED ROW: a credit claimed for a row the engine did not ask about.
  const unaskedRun = await commitWith(Object.assign({}, REPLY_BASE, {
    milestone_watch: [{ n: 2, status: 'delivered_on_page', evidence: QUOTE,
      participants: ['Lirael'], scope: 'claimed for an unasked row' }],
  }), 'unasked-row arm');
  check('UNASKED: a credit for a row that was not on the list is discarded entirely',
    (unaskedRun.records || []).filter((r) => r.milestoneScene === 2).length === 0,
    JSON.stringify(unaskedRun.records));

  // Restore the accepted record for the consumer and persistence sections.
  const reinstated = await commitWith(Object.assign({}, REPLY_BASE, {
    milestone_watch: [{ n: 6, status: 'delivered_on_page', evidence: [QUOTE, QUOTE2],
      participants: ['Lirael', 'Julian'], scope: 'the promised repair is finished, the join explained, and he stays attentive unobserved' }],
  }), 'accepted arm, reinstated');
  check('PRECONDITION for the consumer section: the accepted record is in place',
    reinstated.row6.status === 'committed', reinstated.row6.status);
  // KEPT WHOLE, hashes included, so section K2 can reinstall THE REAL PRODUCER'S OWN RECORD
  // instead of a hand-built one. A disposition can only be taken while the row is still owed, so
  // K2 has to clear the record, take the decision, then put this exact object back.
  const fRecordKept = await page.evaluate(() => {
    const r = (window.state._milestoneDeliveries || []).filter((x) => x.milestoneScene === 6
      && x.accepted)[0] || null;
    window.state.__fRecord = r;
    return !!r;
  });
  check('…and the real producer\'s record is kept whole for the next-scene section', fRecordKept === true);

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('G — THE CONSUMERS OF AN ACCEPTED RECORD');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const consumed = await page.evaluate(() => {
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const row6 = (rio.scenes || []).filter((r) => r.n === 6)[0] || null;
    const a = window._selectSceneAssignment(window.state, 6);
    const directive = window._renderIssueOutlineDirective(window.state, 10) || '';
    return { rowDelivery: row6 && row6.delivery, rowLate: row6 && row6.lateCredit,
      assignment: a ? { source: a.source, event: String(a.event || '').slice(0, 60) } : null,
      rows: (rio.scenes || []).map((x) => ({ n: x.n, delivery: x.delivery })), directive };
  });
  check('the resolved outline carries the credit, with the crediting scene on the row',
    consumed.rowDelivery === 'committed' && consumed.rowLate && consumed.rowLate.atScene === 8,
    consumed.rowDelivery);
  check('the selector no longer offers row 6 as an assignment',
    consumed.assignment === null || !/cup/i.test(consumed.assignment.event),
    JSON.stringify(consumed.assignment));
  check('rows 3 and 5 are still outstanding — nothing else was retired',
    outstandingOf(consumed.rows).join(',') === '3:partially_verified,5:partially_verified',
    outstandingOf(consumed.rows).join(','));
  const owedBlock = consumed.directive.split('CHECKED AND NOT DELIVERED')[1] || '';
  check('the author packet puts row 6 under ESTABLISHED AND VERIFIED, with the completing quotation',
    /ESTABLISHED AND VERIFIED/.test(consumed.directive)
    && /scene 6 — completed at scene 8/.test(consumed.directive)
    && consumed.directive.indexOf(QUOTE.slice(0, 30)) !== -1,
    consumed.directive.split('\n').filter((l) => /scene 6/.test(l)).join(' | ').slice(0, 300));
  check('…and row 6 is NO LONGER in a still-owed bucket',
    !/– scene 6:/.test(owedBlock) && !/- scene 6:/.test(owedBlock),
    owedBlock.split('\n').slice(0, 4).join(' | ').slice(0, 300));
  note('the row-6 lines the author receives',
    consumed.directive.split('\n').filter((l) => /scene 6/.test(l)).join('  ||  ').slice(0, 380));
  fs.writeFileSync(OUT + '/AUTHOR_OUTLINE_BLOCK.txt', consumed.directive);

  // SEPARATION: `superseded` keeps its existing meaning. Setting the flag by hand proves only that
  // CONSUMERS respect it — not that editing prose raises it. _revalidateAssessments is what does
  // that, and it is NOT exercised here.
  const supersededOut = await page.evaluate(() => {
    window.state._milestoneDeliveries.forEach((r) => { if (r.milestoneScene === 6) r.superseded = true; });
    const st = window._outlineDeliveryStatus(window.state, 6);
    return { status: st.status, late: !!st.lateCredit };
  });
  check('CONSUMER TEST (flag set by hand): a record marked superseded stops crediting the row',
    supersededOut.status === 'assessed_not_delivered' && !supersededOut.late, JSON.stringify(supersededOut));
  note('what that does and does not show', 'it shows the consumer honours the flag. That EDITING '
    + 'PROSE raises the flag is a separate path (_revalidateAssessments on the next commit pass) '
    + 'and is not tested here.');
  await page.evaluate(() => {
    window.state._milestoneDeliveries.forEach((r) => { if (r.milestoneScene === 6) r.superseded = false; });
  });

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('H — SNAPSHOT ROUND TRIP');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const saved = await page.evaluate(() => {
    window.__saveStorySnapshot();
    const raw = localStorage.getItem('sb_saved_story');
    const snap = raw ? JSON.parse(raw) : null;
    const st = snap && snap.stateSnapshot;
    return { present: !!st, chars: (raw || '').length,
      records: ((st && st._milestoneDeliveries) || []).length,
      row6Record: ((st && st._milestoneDeliveries) || []).filter((r) => r.milestoneScene === 6 && r.accepted).length,
      outlineCacheDropped: !!st && st._issueOutline === undefined,
      logKeys: Object.keys(((st && st._committedState) || {}).deliveryLog || {}) };
  });
  note('snapshot', saved.chars + ' chars, ' + saved.records + ' assessment record(s)');
  check('the REAL snapshot writer persists the accepted late-credit record',
    saved.present && saved.row6Record === 1, JSON.stringify(saved));
  check('…and drops the derived outline cache, so the rebuild must come from the records',
    saved.outlineCacheDropped === true, String(saved.outlineCacheDropped));
  check('…and keeps the delivery log including scene 6', saved.logKeys.indexOf('6') !== -1,
    saved.logKeys.join(','));

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window._outlineDeliveryStatus === 'function'
    && typeof window._resolveIssueOutline === 'function', { timeout: 60000 });
  const resumed = await page.evaluate(() => {
    const raw = localStorage.getItem('sb_saved_story');
    const snap = raw ? JSON.parse(raw) : null;
    if (!snap || !snap.stateSnapshot) return { restored: false };
    Object.assign(window.state, snap.stateSnapshot);
    const sp = (window.STARTER_PLANS || {})[window.state._starterId];
    if (sp) { window.__withheldRows = sp.scenes; sp.scenes = []; }   // the run's configuration again
    const st = window._outlineDeliveryStatus(window.state, 6);
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const row6 = (rio.scenes || []).filter((r) => r.n === 6)[0] || null;
    const a = window._selectSceneAssignment(window.state, 6);
    return { restored: true, cacheWasAbsent: snap.stateSnapshot._issueOutline === undefined,
      status: st.status, late: st.lateCredit || null, rowDelivery: row6 && row6.delivery,
      assignment: a ? { source: a.source, event: String(a.event || '').slice(0, 60) } : null,
      outstanding: (rio.scenes || []).filter((r) => r.delivery === 'assessed_not_delivered'
        || r.delivery === 'partially_verified').map((r) => r.n + ':' + r.delivery) };
  });
  check('after a reload, the credit is rebuilt from the persisted records',
    resumed.restored && resumed.cacheWasAbsent && resumed.status === 'committed'
    && resumed.late && resumed.late.atScene === 8, JSON.stringify(resumed).slice(0, 300));
  check('…the resolved outline agrees', resumed.rowDelivery === 'committed', resumed.rowDelivery);
  check('…the selector still does not re-offer it',
    resumed.assignment === null || !/cup/i.test(resumed.assignment.event),
    JSON.stringify(resumed.assignment));
  check('…and rows 3 and 5 are still owed across that boundary',
    resumed.outstanding.join(',') === '3:partially_verified,5:partially_verified',
    resumed.outstanding.join(','));
  note('EXACTLY WHAT THIS ARM SHOWS', 'a SNAPSHOT ROUND TRIP: the real writer produced the payload, '
    + 'the page was reloaded so nothing in memory could answer, and the records were read back with '
    + 'the snapshot-level Object.assign that loadStoryData performs (app.js:123840). The Continue '
    + 'workflow — loadStoryData itself, its Supabase path and the UI around it — is NOT exercised.');

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('J — A RECOVERY DECISION ON THIS CHECKPOINT (printed; no policy is wired)');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // TWO HYPOTHESES, NEITHER ESTABLISHED. Both orderings are printed and NOTHING here passes or
  // fails on which row either one selects. "Oldest outstanding" selecting row 3 is not a
  // refutation of it; "explicit non-delivery first, then newest" is not a correction. Choosing
  // between them is a policy decision that has not been made.
  const decision = await page.evaluate(() => {
    window.state._milestoneDeliveries = [];                 // the owed set as of scene 7
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const owed = (rio.scenes || []).filter((r) => (r.delivery === 'assessed_not_delivered'
      || r.delivery === 'partially_verified') && r.kind !== 'overturned' && r.n < 7);
    const strength = (r) => (r.delivery === 'assessed_not_delivered' ? 0 : 1);
    const due = window._selectSceneAssignment(window.state, 7);
    return {
      owed: owed.map((r) => ({ n: r.n, delivery: r.delivery,
        verified: (r.verifiedFacts || []).map((f) => String(f.text).slice(0, 70)),
        assignment: String(r.accomplishes || '').slice(0, 130) })),
      hypothesisA: owed.slice().sort((a, b) => a.n - b.n).map((r) => r.n),
      hypothesisB: owed.slice().sort((a, b) => (strength(a) - strength(b)) || (b.n - a.n)).map((r) => r.n),
      due: due ? { source: due.source, event: String(due.event || '').slice(0, 120) } : null };
  });
  note('the due row for scene 7', decision.due ? (decision.due.source + ' — ' + decision.due.event) : 'none');
  decision.owed.forEach((r) => {
    note('owed row ' + r.n + ' (' + r.delivery + ')', r.assignment);
    if (r.verified.length) note('   already established there', r.verified.map((v) => '"' + v + '"').join(' · '));
  });
  note('HYPOTHESIS A — oldest outstanding first', decision.hypothesisA.join(' > '));
  note('HYPOTHESIS B — explicit non-delivery first, then newest', decision.hypothesisB.join(' > '));
  check('the owed set itself is a fact of the checkpoint: rows 3, 5 and 6',
    decision.owed.map((r) => r.n).join(',') === '3,5,6', decision.owed.map((r) => r.n).join(','));
  check('and the due row for scene 7 is unchanged by any of this',
    decision.due && decision.due.source === 'issue-outline' && /Augar|inventory/i.test(decision.due.event),
    JSON.stringify(decision.due));
  note('WHAT A HANDOFF COULD CARRY', 'the ORIGINAL ASSIGNMENT and the VERIFIED FACTS. The engine '
    + 'does NOT compute an unfinished remainder and nothing here pretends to: a handoff can name '
    + 'the assignment, name what is already established, and ask for a disposition — it cannot '
    + 'hand over "the part that is left" as though that were known.');

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('K — THE RECOVERY DECISION: PLANNER HANDOFF → RECORDED DISPOSITION → AUTHOR ASSIGNMENT');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // WHAT IS EXERCISED HERE: the real handoff builder, the real planner-facing renderer, the real
  // recorder (given a controlled reply), and the real author assignment renderer — on the
  // unchanged checkpoint, with the owed set section J just printed.
  //
  // WHAT IS NOT: the planner's own request is not assembled or dispatched, and no model judges
  // anything. Every "reply" below is a stub written by this file. The two call sites that put the
  // renderer's output into that request and the recorder onto the raw reply are checked at SOURCE
  // and labelled as such — a source check is not a dispatch.
  const hoff = await page.evaluate(() => {
    const h = window._recoveryHandoff(window.state, 7);
    const prev = window._recoveryRanking;
    window._recoveryRanking = 'oldest';
    const hOld = window._recoveryHandoff(window.state, 7);
    window._recoveryRanking = prev;
    return { h, hOld, owed: window._recoveryOwedRows(window.state, 7).map((r) => r.n + ':' + r.status) };
  });
  note('the owed set at scene 7', hoff.owed.join('  '));
  note('THE SCENE\'S CURRENT ASSIGNMENT', (hoff.h.due && hoff.h.due.source) + ' — '
    + String(hoff.h.due && hoff.h.due.event).slice(0, 120));
  note('RANKING "' + hoff.h.ranking + '" [' + hoff.h.rankingStatus + ']',
    'order ' + hoff.h.order.join(' > ') + ' → puts row ' + hoff.h.obligation.n);
  note('RANKING "' + hoff.hOld.ranking + '" [' + hoff.hOld.rankingStatus + ']',
    'order ' + hoff.hOld.order.join(' > ') + ' → puts row ' + hoff.hOld.obligation.n);
  note('NOTHING HERE PASSES OR FAILS ON WHICH ROW EITHER RANKING SELECTS', 'both are hypotheses. '
    + '"Oldest outstanding" is not refuted by selecting row 3, and the default is not established '
    + 'by selecting row 6. The default is switchable (window._recoveryRanking = "oldest") and is '
    + 'labelled EXPERIMENTAL in the prompt-free record it writes.');
  check('the handoff carries the scene\'s CURRENT assignment and ONE outstanding obligation',
    !!(hoff.h.due && hoff.h.due.event) && !!hoff.h.obligation
    && hoff.h.others.length === hoff.owed.length - 1, JSON.stringify(hoff.h.order));
  check('both rankings draw from the SAME owed set — they order it, they do not change it',
    hoff.h.order.slice().sort().join(',') === hoff.hOld.order.slice().sort().join(','),
    JSON.stringify([hoff.h.order, hoff.hOld.order]));
  check('the obligation is the row\'s ORIGINAL assignment, whole, with its recorded status',
    hoff.h.obligation.assignment.length > 100
    && ['assessed_not_delivered', 'partially_verified'].indexOf(hoff.h.obligation.status) !== -1,
    hoff.h.obligation.status + ' / ' + hoff.h.obligation.assignment.length + ' chars');

  const pBlock = await page.evaluate(() => {
    const h = window._recoveryHandoff(window.state, 7);
    return { text: window._renderRecoveryHandoffBlock(h), row: h.obligation.n,
      assignment: h.obligation.assignment, due: h.due.event,
      facts: h.obligation.verifiedFacts };
  });
  fs.writeFileSync(OUT + '/RECOVERY_PLANNER_BLOCK.txt', pBlock.text);
  note('the planner-facing block', pBlock.text.length + ' chars, saved to '
    + OUT + '/RECOVERY_PLANNER_BLOCK.txt');
  line(pBlock.text.split('\n').map((l) => '        ' + l).join('\n'));
  check('it states the CURRENT assignment and the ORIGINAL outstanding assignment together',
    pBlock.text.indexOf(JSON.stringify(pBlock.due)) !== -1
    && pBlock.text.indexOf(JSON.stringify(pBlock.assignment)) !== -1);
  check('…the original assignment is carried WHOLE, not cut',
    pBlock.text.indexOf(pBlock.assignment) !== -1);
  check('…it reports what is already established there, or says nothing is',
    pBlock.facts.length
      ? pBlock.facts.every((f) => pBlock.text.indexOf(f) !== -1)
      : /NOTHING from that assignment is recorded as established/.test(pBlock.text),
    JSON.stringify(pBlock.facts).slice(0, 200));
  check('…it does NOT claim to know the unfinished remainder',
    /does NOT compute "the part that is left"/.test(pBlock.text));
  check('…it offers exactly the three dispositions',
    /"incorporate"/.test(pBlock.text) && /"defer"/.test(pBlock.text) && /"retire"/.test(pBlock.text));
  check('…it says incorporating does NOT discharge the obligation',
    /DECIDING THIS DOES NOT DISCHARGE IT/.test(pBlock.text));
  check('…it says deferral keeps it owed and is not cancelling',
    /it is not cancelling/.test(pBlock.text));
  check('…and it separates the two things retirement needs: that the development HAPPENED and that'
    + ' it SUPERSEDES this obligation',
    /TWO THINGS ARE NOT|TWO THINGS ARE NEEDED AND THE FIRST IS NOT THE SECOND/.test(pBlock.text)
    && /quote the development VERBATIM from COMMITTED WORLD STATE/i.test(pBlock.text)
    && /A later fact about some other matter is not authority to cancel this one/.test(pBlock.text)
    && /recorded as a CLAIM and checked against the engine's own accepted/.test(pBlock.text),
    pBlock.text.split('\n').filter((l) => /retire/.test(l)).join(' | ').slice(0, 300));
  check('…and it carries the existing restrictions on payoffs, reader consequences and canon',
    /promised revelation, consequence or confrontation does NOT become unnecessary/.test(pBlock.text)
    && /canon requirement or a\s*disclosure constraint may never be dropped/.test(pBlock.text.replace(/\n\s+/g, ' ')),
    'restrictions present');

  // ── THE FOUR OUTCOMES, THROUGH THE REAL RECORDER ────────────────────────────────────────
  const decide = (reply, ranking) => page.evaluate(([rep, rk]) => {
    const prev = window._recoveryRanking;
    if (rk) window._recoveryRanking = rk;
    const h = window._recoveryHandoff(window.state, 7);
    const rec = window._acceptRecoveryDisposition(window.state, rep, h);
    window._recoveryRanking = prev;
    const owedAfter = window._recoveryOwedRows(window.state, 7).map((r) => r.n);
    const st = window._outlineDeliveryStatus(window.state, rec.row);
    const dir = window._renderIssueOutlineDirective(window.state, 7) || '';
    const asg = window._selectSceneAssignment(window.state, 7);
    return { rec, owedAfter, rowStatus: st.status, lateCredit: !!st.lateCredit, directive: dir,
      assignmentRecovery: (asg && asg.recovery) ? { row: asg.recovery.row,
        disposition: asg.recovery.disposition } : null,
      deliveries: (window.state._milestoneDeliveries || []).length };
  }, [reply, ranking || null]);
  const clearDecisions = () => page.evaluate(() => { window.state._recoveryDispositions = {}; });

  // (1) INCORPORATE — and the obligation must NOT be discharged by the decision.
  await clearDecisions();
  const inc = await decide({ recovery: { row: 6, disposition: 'incorporate',
    why: 'she is at the stall with the pieces already in his hands, so the repair finishes inside this scene\'s own confrontation' } });
  note('the record', JSON.stringify(inc.rec).slice(0, 460));
  check('INCORPORATE is recorded against the row it was asked about',
    inc.rec.disposition === 'incorporate' && inc.rec.row === hoff.h.obligation.n, JSON.stringify(inc.rec.disposition));
  check('…the record carries the original assignment and the verified facts, not a remainder',
    inc.rec.obligation === hoff.h.obligation.assignment
    && Array.isArray(inc.rec.verifiedFacts) && inc.rec.remainder === undefined);
  check('…the selection ranking is recorded as EXPERIMENTAL on the decision itself',
    /EXPERIMENTAL POLICY/.test(String(inc.rec.rankingStatus)), inc.rec.rankingStatus);
  check('PLANNING IT DOES NOT CLEAR IT: the row is still outstanding after the decision',
    inc.owedAfter.indexOf(inc.rec.row) !== -1 && inc.rowStatus !== 'committed' && !inc.lateCredit,
    JSON.stringify({ owed: inc.owedAfter, status: inc.rowStatus }));
  check('…and no delivery record was created by deciding',
    inc.deliveries === 0, inc.deliveries + ' _milestoneDeliveries records');
  const incLines = inc.directive.split('\n').filter((l) => /UNFINISHED WORK FROM SCENE|ORIGINAL ASSIGNMENT, WHOLE|ALREADY ESTABLISHED THERE|WHY IT IS BEING PICKED UP|own purpose above AND/.test(l));
  note('what the AUTHOR\'S ASSIGNMENT block now says', incLines.join('\n        ').slice(0, 900));
  fs.writeFileSync(OUT + '/RECOVERY_AUTHOR_BLOCK.txt', inc.directive);
  check('THE DECISION REACHES THE AUTHOR\'S ACTUAL ASSIGNMENT: the scene\'s own ASSIGNMENT block'
    + ' carries it', /HARD — this is the scene's ASSIGNMENT/.test(inc.directive)
    && new RegExp('THIS SCENE ALSO CARRIES UNFINISHED WORK FROM SCENE ' + inc.rec.row).test(inc.directive),
    incLines.join(' | ').slice(0, 300));
  check('…with the original assignment whole and the established part marked do-not-restage',
    inc.directive.indexOf(inc.rec.obligation) !== -1
    && (inc.rec.verifiedFacts.length
      ? /do NOT stage it again/.test(inc.directive)
      : /NOTHING of it is recorded as established/.test(inc.directive)));
  check('…and it does not demand two scenes\' worth of events',
    /the purpose above comes first and this stays\s+owed/.test(inc.directive.replace(/\n\s+/g, ' '))
    || /purpose above comes first and this stays owed/.test(inc.directive.replace(/\s+/g, ' ')));
  check('…the one normalization boundary carries the same decision',
    inc.assignmentRecovery && inc.assignmentRecovery.row === inc.rec.row
    && inc.assignmentRecovery.disposition === 'incorporate', JSON.stringify(inc.assignmentRecovery));

  // (1b) A SCENE WITH NO OUTLINE ROW OF ITS OWN still hears the decision. Without this the
  // disposition would vanish for exactly the stories most likely to need it.
  const noRow = await page.evaluate(() => {
    const beyond = 21;                               // this issue's outline has 20 rows
    const rio = window._resolveIssueOutline(window.state, { force: true });
    const hasRow = (rio.scenes || []).some((r) => r.n === beyond);
    const h = window._recoveryHandoff(window.state, beyond);
    window._acceptRecoveryDisposition(window.state, { recovery: { row: h.obligation.n,
      disposition: 'incorporate', why: 'carried into the scene that follows the inquiry' } }, h);
    return { hasRow, row: h.obligation.n, directive: window._renderIssueOutlineDirective(window.state, beyond) || '' };
  });
  check('PRECONDITION: scene 21 has no outline row', noRow.hasRow === false);
  check('a scene with NO outline row still receives the decision taken for it',
    new RegExp('UNFINISHED WORK FROM SCENE ' + noRow.row).test(noRow.directive)
    && /no outline row of its own/.test(noRow.directive),
    noRow.directive.split('\n').slice(0, 3).join(' | ').slice(0, 260));

  // (2) DEFER — still owed, and the author is told it is NOT this scene's work.
  await clearDecisions();
  const def = await decide({ recovery: { row: 6, disposition: 'defer',
    why: 'the Circle has her in the open and the stall is across the clearing; finishing the repair here would need the scene to move twice' } });
  check('DEFER is recorded as its own outcome, not a cancellation',
    def.rec.disposition === 'defer' && def.rec.downgradedFrom === null, JSON.stringify(def.rec.disposition));
  check('…the row stays owed', def.owedAfter.indexOf(def.rec.row) !== -1
    && def.rowStatus !== 'committed', JSON.stringify(def.owedAfter));
  check('…and the author is told to leave it alone rather than half-deliver it',
    /DELIBERATELY NOT THIS SCENE'S WORK/.test(def.directive)
    && /do NOT gesture at completing it/.test(def.directive),
    def.directive.split('\n').filter((l) => /STILL OWED FROM SCENE/.test(l)).join(' | ').slice(0, 200));

  // ── RETIREMENT: CHRONOLOGY AND QUOTATION ARE NOT SUPERSESSION ───────────────────────────
  // CORRECTED. The first version of this suite called the arm below a POSITIVE control: it retired
  // row 3's institutional challenge on a scene-5 committed fact about sash folds and relic
  // provenance, and it passed with why:"" as well. All that established was that the citation
  // existed, was verbatim and came later. Those are now NEGATIVE controls.
  const realFact = await page.evaluate(() => (window.state._committedState.facts || [])
    .map((f) => ({ fact: f.fact, storyScene: f.storyScene, ref: f.proposalRef })));
  note('the committed facts of this checkpoint', JSON.stringify(realFact));
  const later3 = realFact.filter((f) => Number(f.storyScene) > 3)[0];

  // (3) THE CORRECTED CASE: a REAL later committed fact, a stated reason, and no authority.
  await clearDecisions();
  const sashRetire = await decide({ recovery: { row: 3, disposition: 'retire',
    why: 'the relic\'s provenance is now the live question, which is what that row existed to open',
    superseded_by: later3.fact } }, 'oldest');
  note('the record', JSON.stringify(sashRetire.rec).slice(0, 620));
  check('NEGATIVE CONTROL: a genuine later fact about ANOTHER matter does NOT retire an earlier'
    + ' institutional challenge', sashRetire.rec.disposition === 'defer'
    && sashRetire.rec.downgradedFrom === 'retire' && sashRetire.rec.established === false,
    JSON.stringify(sashRetire.rec.disposition));
  check('…the citation IS recognised as an established development — evidence, separately recorded',
    sashRetire.rec.citedFactEstablished === true
    && sashRetire.rec.citedFact.atScene === Number(later3.storyScene)
    && sashRetire.rec.citedFact.isAuthority === false,
    JSON.stringify(sashRetire.rec.citedFact).slice(0, 220));
  check('…the planner\'s reason is recorded as a CLAIM, not as a finding',
    sashRetire.rec.supersessionClaim === sashRetire.rec.why && sashRetire.rec.supportedBy === null,
    JSON.stringify({ claim: !!sashRetire.rec.supersessionClaim, support: sashRetire.rec.supportedBy }));
  check('…the proposal is PRESERVED rather than discarded', !!sashRetire.rec.proposedRetirement
    && sashRetire.rec.proposedRetirement.heldAtScene === 7,
    JSON.stringify(sashRetire.rec.proposedRetirement).slice(0, 200));
  check('…the note says what is missing: evidence is not authority',
    /necessary evidence but not/.test(String(sashRetire.rec.note))
    && /is a claim, not a finding/.test(String(sashRetire.rec.note)),
    String(sashRetire.rec.note).slice(0, 220));
  check('…the row stays owed', sashRetire.owedAfter.indexOf(3) !== -1, sashRetire.owedAfter.join(','));
  check('…and the author is told the retirement is HELD, not granted',
    /A RETIREMENT WAS PROPOSED AND IS HELD, NOT GRANTED/.test(sashRetire.directive)
    && /not authority that this obligation/.test(sashRetire.directive),
    sashRetire.directive.split('\n').filter((l) => /HELD/.test(l)).join(' | ').slice(0, 300));

  // (3b) THE SAME CITATION WITH AN EMPTY REASON — which the first version also accepted.
  await clearDecisions();
  const emptyWhy = await decide({ recovery: { row: 3, disposition: 'retire', why: '',
    superseded_by: later3.fact } }, 'oldest');
  check('NEGATIVE CONTROL: the same citation with why:"" is not a retirement either',
    emptyWhy.rec.disposition === 'defer' && emptyWhy.rec.established === false
    && /states no reason/.test(String(emptyWhy.rec.note)), String(emptyWhy.rec.note).slice(0, 180));
  check('…and the row stays owed', emptyWhy.owedAfter.indexOf(3) !== -1);

  // (3c) A PARAPHRASE of the same committed fact is not even established evidence.
  await clearDecisions();
  const paraphrase = await decide({ recovery: { row: 3, disposition: 'retire',
    why: 'same reason, paraphrased citation',
    superseded_by: 'Julian said the relic was never on the list of recovered things' } }, 'oldest');
  check('NEGATIVE CONTROL: a paraphrase is not an established citation',
    paraphrase.rec.disposition === 'defer' && paraphrase.rec.citedFactEstablished === false,
    JSON.stringify({ d: paraphrase.rec.disposition, cited: paraphrase.rec.citedFactEstablished }));

  // (3d) A PROTECTED OBLIGATION CANNOT BE RETIRED AT ALL — the authored row 3 declares a required
  // world truth, a RESERVED event (a promised payoff) and a player decision. The restrictions
  // already existed in the author's PARTLY VERIFIED wording and nothing enforced them.
  await clearDecisions();
  const protArm = await page.evaluate(() => {
    const sp = (window.STARTER_PLANS || {})[window.state._starterId];
    sp.scenes = window.__withheldRows;
    const prev = window._recoveryRanking; window._recoveryRanking = 'oldest';
    const h = window._recoveryHandoff(window.state, 7);
    const block = window._renderRecoveryHandoffBlock(h);
    const rec = window._acceptRecoveryDisposition(window.state, { recovery: { row: h.obligation.n,
      disposition: 'retire', why: 'the threshold has been overtaken by the inquiry',
      superseded_by: (window.state._committedState.facts || [])
        .filter((f) => Number(f.storyScene) > h.obligation.n)[0].fact } }, h);
    window._recoveryRanking = prev;
    const owed = window._recoveryOwedRows(window.state, 7).map((r) => r.n);
    const dir = window._renderIssueOutlineDirective(window.state, 7) || '';
    window.__withheldRows = sp.scenes; sp.scenes = [];      // back to the run's configuration
    return { protections: h.obligation.protections, row: h.obligation.n, block, rec, owed, dir };
  });
  note('the protections the authored row declares', JSON.stringify(protArm.protections));
  check('PRECONDITION: the authored row the ranking selects declares protections',
    (protArm.protections || []).length >= 2, JSON.stringify(protArm.protections));
  check('the planner is not even OFFERED retirement for a protected obligation',
    /"retire" IS NOT AVAILABLE FOR THIS OBLIGATION/.test(protArm.block)
    && !/\|"retire"/.test(protArm.block.split('Return:')[1] || ''),
    (protArm.block.split('\n').filter((l) => /retire/.test(l))[0] || '').slice(0, 200));
  check('…and a retirement sent anyway is refused on the protection, not on the citation',
    protArm.rec.disposition === 'defer' && (protArm.rec.protectedBy || []).length >= 2
    && /may not be retired at all/.test(String(protArm.rec.note)),
    String(protArm.rec.note).slice(0, 200));
  check('…the row stays owed', protArm.owed.indexOf(protArm.row) !== -1, protArm.owed.join(','));
  check('…and the author is told it may not be retired',
    /AND IT MAY NOT BE RETIRED AT ALL/.test(protArm.dir),
    protArm.dir.split('\n').filter((l) => /MAY NOT BE RETIRED/.test(l)).join(' | ').slice(0, 220));

  // (4) A SUSPENSION IS NOT A CANCELLATION. `invalidatedPlans` covers obligations made
  // "IMPOSSIBLE, SUSPENDED or UNEXPLAINED" in one flat array, and its existing consumer
  // (_resolveObjectivePrecedence) makes a matching objective CONTINGENT. The first version of this
  // code accepted the same record as grounds for "do NOT deliver it and do NOT replace it", which
  // promotes a temporarily blocked development into a permanently dropped one. It is no longer
  // authority — it is reported, and the row stays owed.
  await clearDecisions();
  const suspended = await page.evaluate(() => {
    const prev = window._recoveryRanking; window._recoveryRanking = 'oldest';
    const h0 = window._recoveryHandoff(window.state, 7);
    const row = h0.obligation;
    window.state._temptFateDurableConsequences = [{ source: 'tempt', proposalId: 'test:rupture',
      requestedRupture: 'let the Circle never have convened', ruptureClass: 'history',
      scopeMatch: 'full', invalidatedPlans: [row.assignment], changed: [], establishedEvidence: [],
      openPossibilities: [], knowledgeStates: [] }];
    const h = window._recoveryHandoff(window.state, 7);
    const rec = window._acceptRecoveryDisposition(window.state, { recovery: { row: h.obligation.n,
      disposition: 'retire', why: 'the convening this row answered never happened',
      superseded_by: (window.state._committedState.facts || [])
        .filter((f) => Number(f.storyScene) > h.obligation.n).map((f) => f.fact)[0] } }, h);
    window._recoveryRanking = prev;
    const owed = window._recoveryOwedRows(window.state, 7).map((r) => r.n);
    const dir = window._renderIssueOutlineDirective(window.state, 7) || '';
    // backMax raised so the two-row nearest cap cannot hide the row; what is under test is
    // whether it is EXCLUDED as retired, not whether it fits the default cap.
    const watch = window._milestoneWatchRows(window.state, 8, { backMax: 6 }).backward.map((b) => b.n);
    return { rec, owed, dir, watch,
      support: window._recoverySupersessionSupport(window.state, h.obligation),
      signal: window._recoverySuspensionSignal(window.state, h.obligation),
      status: window._outlineDeliveryStatus(window.state, rec.row).status };
  });
  note('the record', JSON.stringify(suspended.rec).slice(0, 640));
  check('NEGATIVE CONTROL: a committed rupture record naming this obligation does NOT grant'
    + ' retirement', suspended.rec.disposition === 'defer'
    && suspended.rec.downgradedFrom === 'retire' && suspended.rec.established === false,
    JSON.stringify({ d: suspended.rec.disposition, est: suspended.rec.established }));
  check('…the support function returns NOTHING for it — that branch is gone',
    suspended.support === null, JSON.stringify(suspended.support));
  check('…but the record IS reported, labelled as not authority',
    !!suspended.signal && suspended.signal.isAuthority === false
    && /does NOT establish cancellation/.test(String(suspended.signal.meaning)),
    JSON.stringify(suspended.signal).slice(0, 220));
  check('…the row stays owed', suspended.owed.indexOf(suspended.rec.row) !== -1,
    suspended.owed.join(','));
  check('…the watch still asks about it, because it was not retired',
    suspended.watch.indexOf(suspended.rec.row) !== -1, suspended.watch.join(','));
  check('…and the author is told it is CONTINGENT, not cancelled',
    /makes it CONTINGENT — under review — and NOT cancelled/.test(suspended.dir)
    && /does not distinguish an obligation\s*that is SUSPENDED from one that is void/.test(suspended.dir.replace(/\n\s+/g, ' ')),
    suspended.dir.split('\n').filter((l) => /CONTINGENT/.test(l)).join(' | ').slice(0, 300));
  note('WHAT FOLLOWS FROM REMOVING THAT BRANCH', 'the ONLY remaining retirement authority is an '
    + 'accepted prerequisite invalidation, and the resolver already marks such a row '
    + 'kind:"overturned" before it can reach the owed set — so TODAY NO REACHABLE PATH GRANTS a '
    + 'retirement through this disposition. Every retirement proposal is recorded and HELD. The '
    + 'missing piece is a structural link from an accepted cancellation record to an outline row; '
    + 'inferring one from wording would be a language heuristic pretending to be authority.');
  await page.evaluate(() => { window.state._temptFateDurableConsequences = []; });

  // (5) NO ANSWER — absence of a disposition is not permission to drop it.
  await clearDecisions();
  await page.evaluate(() => { window.state._temptFateDurableConsequences = []; });
  const silent = await decide({ state_change: 'something else entirely' });
  check('A REPLY WITH NO DISPOSITION leaves the obligation owed and says so',
    silent.rec.disposition === 'defer' && silent.rec.downgradedFrom === 'none'
    && /no usable disposition came back/.test(String(silent.rec.note)),
    JSON.stringify(silent.rec.note).slice(0, 180));
  check('…and the row is still owed', silent.owedAfter.indexOf(silent.rec.row) !== -1);

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('K2 — THE NEXT SCENE: STATUS IS CONSISTENT, AND DELIVERY OUTRANKS THE DECISION');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // TWO SEPARATE DEFECTS THIS SECTION EXISTS FOR.
  //  (a) the first version rendered a disposition only at the scene that decided it, so the
  //      instruction vanished on the next turn while the earlier-row buckets went on reporting the
  //      row as owed by default;
  //  (b) the rendering read the DISPOSITION and never the CURRENT delivery, so an INCORPORATE at
  //      scene 7 followed by an accepted completion at scene 8 had scene 9 saying "STILL OWED …
  //      not recorded as completed" while _outlineDeliveryStatus said `committed`.
  // Every arm reads a LATER scene than the one that decided.
  //
  // THE ACCEPTED RECORD USED BELOW IS NOT FABRICATED: it is the exact record the REAL producer
  // created in section F, captured there and reinstalled here. It has to be reinstalled rather
  // than left in place because a disposition can only be taken while the row is still owed.
  const keptRec = await page.evaluate(() => {
    const r = window.state.__fRecord || null;
    return r ? { at: r.atScene, hash: r.unitHash, chars: r.unitChars, accepted: r.accepted,
      pageUid: r.pageUid, direction: r.direction } : null;
  });
  note('the record K2 reinstalls', JSON.stringify(keptRec));
  check('PRECONDITION: it is the REAL PRODUCER\'S record from section F — engine-computed identity,'
    + ' not a hand-built one', !!keptRec && keptRec.at === 8 && keptRec.accepted === true
    && !!keptRec.hash && Number(keptRec.chars) > 0 && keptRec.direction === 'late',
    JSON.stringify(keptRec));

  // ── ARM 1: INCORPORATE at scene 7, then a real accepted completion at scene 8 ──────────
  const incThenDone = await page.evaluate(() => {
    const S = window.state;
    S._recoveryDispositions = {}; S._temptFateDurableConsequences = []; S._milestoneDeliveries = [];
    const h = window._recoveryHandoff(S, 7);
    const row = h.obligation.n;
    window._acceptRecoveryDisposition(S, { recovery: { row, disposition: 'incorporate',
      why: 'it finishes inside this scene' } }, h);
    const before = { owed8: window._recoveryOwedRows(S, 8).map((r) => r.n),
      dir8: window._renderIssueOutlineDirective(S, 8) || '' };
    S._milestoneDeliveries = (S.__fRecord ? [S.__fRecord] : []);
    const st = window._outlineDeliveryStatus(S, row);
    return { row, before, status: st.status, lateAt: st.lateCredit && st.lateCredit.atScene,
      owed9: window._recoveryOwedRows(S, 9).map((r) => r.n),
      dir9: window._renderIssueOutlineDirective(S, 9) || '',
      suffix: window._recoveryStatusSuffix(S, row),
      carried: (window._renderRecoveryDirective(S, 9) || []).join('\n'),
      watch9: window._milestoneWatchRows(S, 9).backward.map((b) => b.n) };
  });
  note('row / status after the accepted completion', incThenDone.row + ' → '
    + incThenDone.status + ' (late at scene ' + incThenDone.lateAt + ')');
  check('CONTROL: before the completion, the incorporated row IS reported still owed at scene 8',
    incThenDone.before.owed8.indexOf(incThenDone.row) !== -1
    && new RegExp('scene ' + incThenDone.row + ': STILL OWED. Taken up at scene 7').test(incThenDone.before.dir8),
    incThenDone.before.dir8.split('\n').filter((l) => /Taken up at scene/.test(l)).join(' | ').slice(0, 220));
  check('PRECONDITION: the real accepted record makes it committed, credited at scene 8',
    incThenDone.status === 'committed' && incThenDone.lateAt === 8, incThenDone.status);
  check('DELIVERY OUTRANKS THE DECISION: scene 9 no longer calls the incorporated row outstanding',
    !/STILL OWED. Taken up at scene 7/.test(incThenDone.dir9)
    && !/not recorded as completed/.test(incThenDone.carried),
    incThenDone.carried.split('\n').slice(0, 3).join(' | ').slice(0, 300));
  check('…it is reported DELIVERED, with the decision kept as history',
    new RegExp('scene ' + incThenDone.row + ': DELIVERED and verified at scene 8').test(incThenDone.carried)
    && /incorporated at scene 7; that decision is history/.test(incThenDone.carried),
    incThenDone.carried.split('\n').filter((l) => /DELIVERED/.test(l)).join(' | ').slice(0, 300));
  check('…the per-row suffix says the same thing, so no consumer contradicts another',
    /NO LONGER OUTSTANDING: it was DELIVERED and verified at scene 8/.test(incThenDone.suffix)
    && /INCORPORATE recorded at scene 7 is history/.test(incThenDone.suffix),
    incThenDone.suffix.slice(0, 240));
  check('…it has left the owed set and the still-owed watch',
    incThenDone.owed9.indexOf(incThenDone.row) === -1
    && incThenDone.watch9.indexOf(incThenDone.row) === -1,
    'owed ' + incThenDone.owed9.join(',') + ' · watch ' + incThenDone.watch9.join(','));
  check('…and it is told NOT to be staged again',
    /must NOT be staged again/.test(incThenDone.carried));

  // ── ARM 2: DEFER at scene 7, then the same real accepted completion ────────────────────
  const defThenDone = await page.evaluate(() => {
    const S = window.state;
    S._recoveryDispositions = {}; S._milestoneDeliveries = [];
    const h = window._recoveryHandoff(S, 7);
    const row = h.obligation.n;
    window._acceptRecoveryDisposition(S, { recovery: { row, disposition: 'defer',
      why: 'the stall is across the clearing' } }, h);
    const owed8 = window._recoveryOwedRows(S, 8).map((r) => r.n);
    const dir8 = window._renderIssueOutlineDirective(S, 8) || '';
    S._milestoneDeliveries = (S.__fRecord ? [S.__fRecord] : []);
    return { row, owed8, dir8, owed9: window._recoveryOwedRows(S, 9).map((r) => r.n),
      carried: (window._renderRecoveryDirective(S, 9) || []).join('\n'),
      suffix: window._recoveryStatusSuffix(S, row),
      dir9: window._renderIssueOutlineDirective(S, 9) || '' };
  });
  check('CONTROL: before the completion, the deferred row IS reported still owed at scene 8',
    defThenDone.owed8.indexOf(defThenDone.row) !== -1
    && /STILL OWED, deferred at scene 7/.test(defThenDone.dir8),
    defThenDone.dir8.split('\n').filter((l) => /deferred at scene/.test(l)).join(' | ').slice(0, 220));
  check('DEFERRAL FOLLOWED BY COMPLETION is reported DELIVERED, not still owed',
    new RegExp('scene ' + defThenDone.row + ': DELIVERED and verified at scene 8').test(defThenDone.carried)
    && !/STILL OWED, deferred at scene 7/.test(defThenDone.dir9)
    && defThenDone.owed9.indexOf(defThenDone.row) === -1,
    defThenDone.carried.split('\n').filter((l) => /DELIVERED|STILL OWED/.test(l)).join(' | ').slice(0, 300));
  check('…and the deferral is kept as history, not erased',
    /deferred at scene 7; that decision is history/.test(defThenDone.carried),
    defThenDone.carried.split('\n')[0].slice(0, 220));

  // ── ARM 3: THE CONTROL WHERE NOTHING WAS COMPLETED — status must still be owed ─────────
  const nothingDone = await page.evaluate(() => {
    const S = window.state;
    S._recoveryDispositions = {}; S._milestoneDeliveries = [];
    const h7 = window._recoveryHandoff(S, 7);
    window._acceptRecoveryDisposition(S, { recovery: { row: h7.obligation.n,
      disposition: 'defer', why: 'the stall is across the clearing' } }, h7);
    const dir8 = window._renderIssueOutlineDirective(S, 8) || '';
    const h8 = window._recoveryHandoff(S, 8);
    return { row: h7.obligation.n, dir8,
      owed8: window._recoveryOwedRows(S, 8).map((r) => r.n),
      handoff8: h8 ? h8.order : null,
      watch8: window._milestoneWatchRows(S, 8).backward.map((b) => b.n),
      status: window._outlineDeliveryStatus(S, h7.obligation.n).status,
      suffix: window._recoveryStatusSuffix(S, h7.obligation.n),
      deliveries: (S._milestoneDeliveries || []).length };
  });
  fs.writeFileSync(OUT + '/RECOVERY_AUTHOR_BLOCK_NEXT_SCENE.txt', nothingDone.dir8);
  check('CONTROL, NO COMPLETION: deferred work REMAINS OWED at the next scene, with its reason',
    nothingDone.owed8.indexOf(nothingDone.row) !== -1
    && /STILL OWED, deferred at scene 7/.test(nothingDone.dir8)
    && /STILL OWED, deferred at scene 7/.test(nothingDone.suffix),
    nothingDone.suffix.slice(0, 200));
  check('…it is NOT labelled completed anywhere',
    nothingDone.status !== 'committed' && nothingDone.deliveries === 0
    && !/DELIVERED and verified/.test(nothingDone.dir8), nothingDone.status);
  check('…the next scene\'s handoff can put it again, and the watch still asks about it',
    (nothingDone.handoff8 || []).indexOf(nothingDone.row) !== -1
    && nothingDone.watch8.indexOf(nothingDone.row) !== -1,
    'handoff ' + (nothingDone.handoff8 || []).join(',') + ' · watch ' + nothingDone.watch8.join(','));
  check('…and the carried block is STATUS, not an instruction to act',
    /OBLIGATION STATUS CARRIED FORWARD/.test(nothingDone.dir8)
    && /this is STATUS, not an instruction to act/.test(nothingDone.dir8));

  // ── ARM 4: A HELD RETIREMENT STAYS OWED ACROSS THE TURN BOUNDARY ──────────────────────
  const heldNext = await page.evaluate(() => {
    const S = window.state;
    S._recoveryDispositions = {}; S._milestoneDeliveries = [];
    const prev = window._recoveryRanking; window._recoveryRanking = 'oldest';
    const h = window._recoveryHandoff(S, 7);
    const rec = window._acceptRecoveryDisposition(S, { recovery: { row: h.obligation.n,
      disposition: 'retire', why: 'the provenance question has overtaken it',
      superseded_by: (S._committedState.facts || [])
        .filter((f) => Number(f.storyScene) > h.obligation.n)[0].fact } }, h);
    window._recoveryRanking = prev;
    return { row: rec.row, held: !!rec.proposedRetirement,
      owed8: window._recoveryOwedRows(S, 8).map((r) => r.n),
      dir8: window._renderIssueOutlineDirective(S, 8) || '',
      suffix: window._recoveryStatusSuffix(S, rec.row) };
  });
  check('A HELD RETIREMENT is still owed at the next scene, and says the proposal is held',
    heldNext.held && heldNext.owed8.indexOf(heldNext.row) !== -1
    && /a retirement proposal is HELD, not granted/.test(heldNext.dir8)
    && /STILL OWED, deferred at scene 7/.test(heldNext.suffix),
    heldNext.suffix.slice(0, 220));
  await page.evaluate(() => { window.state._recoveryDispositions = {};
    window.state._temptFateDurableConsequences = []; });

  // ── THE TWO CALL SITES, CHECKED AT SOURCE AND LABELLED AS A SOURCE CHECK ────────────────
  const src = fs.readFileSync('public/app.js', 'utf8');
  const usrSite = /\+ \(\(function \(\) \{[\s\S]{0,400}_renderRecoveryHandoffBlock\(_recHandoff\)/.test(src);
  const acceptSite = /_acceptRecoveryDisposition\(s, _scP, _recHandoff\)/.test(src);
  const authorSite = /_renderRecoveryDirective\(s, n\)/.test(src);
  const schemaSite = /"recovery":\{ "row":0, "disposition":"incorporate\|defer\|retire"/.test(src);
  note('WHAT THIS LAST GROUP IS', 'a SOURCE check on where the production code calls these four '
    + 'functions. It shows the wiring exists; it does NOT dispatch a planner request, and it is not '
    + 'evidence that a real planner answers the question.');
  check('SOURCE: the planner payload concatenates the renderer\'s output', usrSite);
  check('SOURCE: the reply schema asks for the "recovery" object', schemaSite);
  const schemaFallback = /_recHandoff && _recHandoff\.obligation && String\(_scSys\)\.indexOf\('"recovery"'\) === -1/.test(src)
    && /var _scMessages = \[\{ role: 'system'/.test(src);
  check('SOURCE: and it is asked again at the single dispatch point, so the three flag-gated'
    + ' alternative planners that REPLACE the system prompt cannot drop the key while the question'
    + ' still reaches the planner', schemaFallback);
  check('SOURCE: the recorder is called with the RAW parsed reply (_scP), which is the only object'
    + ' that preserves unknown keys', acceptSite);
  check('SOURCE: the author\'s assignment renderer calls the recovery directive', authorSite);
  note('NOT WIRED TO ANY SELECTOR', 'no disposition changes _selectSceneAssignment\'s choice of '
    + 'event, writes to _milestoneDeliveries or _committedState, or alters a delivery status. The '
    + 'only state it writes is state._recoveryDispositions.');

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('SCOPE AND PROVIDER-FREE ATTESTATION');
  // ══════════════════════════════════════════════════════════════════════════════════════
  note('exercised', '_milestoneWatchRows / _milestoneWatchTargetOK / _commitScene (the real accept '
    + 'path, four arms) / __evidenceVerifies / __hasUsableEvidence / _outlineDeliveryStatus / '
    + '_resolveIssueOutline / _selectSceneAssignment / _renderIssueOutlineDirective / '
    + '__saveStorySnapshot / _sealProposal / __buildCommitSceneIdentity / _recoveryHandoff / '
    + '_recoveryOwedRows / _renderRecoveryHandoffBlock / _acceptRecoveryDisposition / '
    + '_recoverySupersedeEvidence / _renderRecoveryDirective');
  note('NOT exercised', 'the planner\'s own request assembly and dispatch (section K checks those '
    + 'two call sites at SOURCE only); the Continue workflow (loadStoryData and its UI); prose-edit '
    + 'invalidation (_revalidateAssessments raising `superseded`); and a real model\'s judgement — '
    + 'every verifier and planner reply here is a stub written by this file.');
  note('requests', 'page/assets served ' + pageServed + ' · /api attempted ' + (apiFixtured + (apiAttempts - apiAborted - apiFixtured >= 0 ? 0 : 0))
    + ' · fixtured ' + apiFixtured + ' · aborted ' + apiAborted + ' · total intercepted ' + apiAttempts);
  check('every /api request was either fixtured locally or aborted — zero provider dispatches',
    apiAttempts === apiAborted + apiFixtured, apiAttempts + ' = ' + apiAborted + ' + ' + apiFixtured);
  check('…and the fixtured ones are the commit verifier only', apiFixtured === 5,
    apiFixtured + ' fixtured replies (one per commit arm)');
} finally {
  await browser.close();
}

line('');
line('='.repeat(88));
line('  PASS ' + PASS + ' · FAIL ' + FAIL + ' · INCONCLUSIVE ' + INCONCLUSIVE);
for (const f of FAILURES) line('    FAILED: ' + f);
for (const i of INCONCLUSIVES) line('    INCONCLUSIVE: ' + i);
line('  These are the tested cases. They are not a statement about untested paths.');
line('='.repeat(88));
process.exit(FAIL ? 1 : 0);
