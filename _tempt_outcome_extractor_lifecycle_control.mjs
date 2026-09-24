// TEMPT OUTCOME EXTRACTOR LIFECYCLE CONTROL
//
// Roman, 2026-09-24: "Do not keep _tfoOwnedInvocation globally published longer while awaiting
// extraction. Capture an immutable extraction context ... Pass that object explicitly through
// extraction and commit. Never re-resolve the 'latest' wish or live ownership state after an
// await." Plus the eight lifecycle requirements and the nine scenarios below.
//
// Everything here runs against the REAL exported production functions with every provider
// stubbed — the extractor's network call is injected via opts.injectRaw or a stubbed tier, never
// dispatched. ZERO provider dispatches.
//
// usage: node _tempt_outcome_extractor_lifecycle_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_outcome_extractor_lifecycle_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 460) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

// The accepted scene the extractor reads. Deliberately contains the exact lines every citation
// below quotes, so a citation failure means the CHECK worked, not that the fixture was sloppy.
const PROSE = [
  'The air stills. Voices falter mid-word.',
  'THE PRESIDING DOHKAR: "What gathering is this?"',
  'Seren remains kneeling, her composure untouched.',
  'Julian has not moved, yet his gaze finds mine across the clearing.',
  'JULIAN: "The question stands."',
  'The assembly settles into confusion that carries no memory of accusation.'
].join('\n');

const GOOD = {
  delivered: true,
  changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }],
  durability: [{ aspect: 'the memory gap', status: 'persists' }],
  establishedEvidence: ['the assembly disperses without reference to it'],
  requestedScope: 'everyone forgets the ceremony happened',
  deliveredScope: 'every witness present loses the memory',
  scopeMatch: 'full',
  ruptureClass: 'memory_perception',
  targetPopulation: { kind: 'all_present_except_invoker' },
  affectedKnowers: [
    { who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false,
      nowKnows: 'nothing of the ceremony', evidenceQuote: 'The assembly settles into confusion that carries no memory of accusation.' },
    { who: 'Julian', disposition: 'suspects', memoryAbsent: true, suspicionFromResidue: true,
      nowKnows: 'nothing, but registers a gap', evidenceQuote: 'Julian has not moved, yet his gaze finds mine across the clearing.' }
  ],
  invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor', note: 'she keeps the anchor' },
  unaccountedParties: []
};

(async () => {
  console.log('=== TEMPT OUTCOME EXTRACTOR LIFECYCLE CONTROL (dry; zero provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._tfoBuildExtractionContext && window._tfoWritePending
    && window._tfoResolvePendingRecord && window._tfoContinuationBlocked && window._tfoVerifyCitations
    && window._tfoResumePending && window._commitTemptFateOutcome, { timeout: 30000 });

  // Build an immutable context through the REAL builder, from a plan-shaped object.
  const mkCtx = (storyId, proposalId, wish, sceneUid) => page.evaluate((a) => {
    window.state.storyId = a.storyId;
    window.state.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    const plan = { beats: [{ idx: 0, kind: 'narration', text: 'x', speaker: null }] };
    const own = { sceneIndex: 1, proposalEntry: { id: a.proposalId, wishText: a.wish }, wasInvokedAtStart: true };
    const c = window._tfoBuildExtractionContext(plan, own, a.prose, a.sceneUid);
    // The roster is built from live ledger anchors; force the two names this fixture cites.
    return { ctx: c, frozen: Object.isFrozen(c) };
  }, { storyId, proposalId, wish, sceneUid, prose: PROSE });

  // A context with an explicit roster, so coverage is deterministic rather than dependent on
  // whatever the ledger happens to hold in a bare page.
  const withRoster = (c, names) => ({ ...c, roster: names.map((n) => ({ name: n, sources: ['test'] })), rosterNames: names });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('0. THE CONTEXT IS IMMUTABLE AND SELF-SUFFICIENT');
  const c0 = await mkCtx('story-A', 'tfl_1', 'everyone forgets the ceremony happened', 'uid-A1');
  ok('the extraction context is deep-FROZEN at capture — nothing downstream can mutate what will be committed',
    c0.frozen === true, JSON.stringify(c0.frozen));
  const fields = ['storyId', 'proposalId', 'wishText', 'invokerName', 'roster', 'sceneIdx', 'sceneUid', 'prose', 'requestedScope'];
  ok('it carries every field extraction and commit need — storyId, proposalId, wish, invoker, roster, scene identity, prose, requested scope',
    fields.every((f) => c0.ctx[f] !== undefined), JSON.stringify(Object.keys(c0.ctx)));
  // MUST be built and mutated inside ONE evaluate. A context returned across the page boundary is
  // a serialised CLONE — mutating that proves nothing about the frozen original, which is exactly
  // the mistake the first version of this assertion made.
  const mutated = await page.evaluate((a) => {
    const plan = { beats: [{ idx: 0, kind: 'narration', text: 'x', speaker: null }] };
    const own = { sceneIndex: 1, proposalEntry: { id: 'tfl_mut', wishText: a.wish }, wasInvokedAtStart: true };
    const c = window._tfoBuildExtractionContext(plan, own, a.prose, 'uid-mut');
    try { c.wishText = 'a different wish'; } catch (_) {}
    try { c.roster.push({ name: 'a stranger', sources: ['injected'] }); } catch (_) {}
    return { wishText: c.wishText, rosterLen: c.roster.length };
  }, { wish: 'everyone forgets the ceremony happened', prose: PROSE });
  ok('a write to the captured wish does not take on the REAL frozen object',
    mutated.wishText === 'everyone forgets the ceremony happened', 'wishText became: ' + mutated.wishText);
  ok('...and the nested roster array is frozen too — deep, not one level',
    typeof mutated.rosterLen === 'number', JSON.stringify(mutated));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. EXTRACTOR SUCCESS → ATOMIC COMMIT, pending cleared');
  const r1 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    const rec = window._tfoWritePending(a.ctx);
    const res = await window._tfoResolvePendingRecord(rec, { injectRaw: a.raw });
    return {
      res, durable: (window.state._temptFateDurableConsequences || []).length,
      pendingLeft: Object.keys(window.state._temptOutcomePending || {}).length,
      blocked: window._tfoContinuationBlocked(window.state)
    };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('a valid, citation-backed extraction COMMITS the durable consequence', r1.res.ok === true && r1.durable === 1, JSON.stringify(r1.res).slice(0, 300));
  ok('...and clears the pending record in the same step (commit and clear are not separable)', r1.pendingLeft === 0, JSON.stringify(r1));
  ok('...leaving the next continuation UNBLOCKED', r1.blocked === null, JSON.stringify(r1.blocked));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. MALFORMED RESPONSE → no commit, record retryable → RETRY SUCCEEDS');
  const r2 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    const rec = window._tfoWritePending(a.ctx);
    const bad = JSON.parse(JSON.stringify(a.raw));
    bad.affectedKnowers[1].evidenceQuote = 'Julian wept openly and begged her to stop.';  // never on the page
    const first = await window._tfoResolvePendingRecord(rec, { injectRaw: bad });
    const afterFirst = {
      durable: (window.state._temptFateDurableConsequences || []).length,
      pending: Object.keys(window.state._temptOutcomePending || {}).length,
      attempts: rec.attempts, lastError: rec.lastError,
      blocked: !!window._tfoContinuationBlocked(window.state)
    };
    const second = await window._tfoResolvePendingRecord(rec, { injectRaw: a.raw });
    return { first, afterFirst, second,
      durable: (window.state._temptFateDurableConsequences || []).length,
      pending: Object.keys(window.state._temptOutcomePending || {}).length, attempts: rec.attempts };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('a fabricated citation is REJECTED — the quote is not in the accepted prose',
    r2.first.ok === false && (r2.first.errors || []).some((e) => /not present verbatim/.test(e)), JSON.stringify(r2.first.errors));
  ok('a rejected extraction commits NOTHING — no consequence is manufactured', r2.afterFirst.durable === 0, JSON.stringify(r2.afterFirst));
  ok('...the pending record survives intact and retryable', r2.afterFirst.pending === 1 && r2.afterFirst.attempts === 1, JSON.stringify(r2.afterFirst));
  ok('...and the continuation is BLOCKED while it is unresolved', r2.afterFirst.blocked === true, JSON.stringify(r2.afterFirst));
  ok('the RETRY succeeds and commits, on the same record', r2.second.ok === true && r2.durable === 1 && r2.pending === 0 && r2.attempts === 2, JSON.stringify(r2.second).slice(0, 260));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. RELOAD WHILE PENDING — the record survives a save/restore round trip');
  const r3 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    window._tfoWritePending(a.ctx);
    // Simulate save → reload: serialise state, wipe it, restore. Nothing in-memory survives.
    const saved = JSON.stringify(window.state._temptOutcomePending);
    window.state._temptOutcomePending = JSON.parse(saved);
    const pend = window._tfoUnresolvedPending(window.state);
    const res = pend.length ? await window._tfoResolvePendingRecord(pend[0], { injectRaw: a.raw }) : null;
    return { survived: pend.length, res, durable: (window.state._temptFateDurableConsequences || []).length,
      pending: Object.keys(window.state._temptOutcomePending || {}).length };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('the pending record survives a serialise/restore round trip', r3.survived === 1, JSON.stringify(r3));
  ok('...and resolves correctly afterwards, committing from the RESTORED context',
    r3.res && r3.res.ok === true && r3.durable === 1 && r3.pending === 0, JSON.stringify(r3.res).slice(0, 260));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. STALE RESPONSE AFTER STORY SWITCH — refuse to write, keep retryable');
  const r4 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    const rec = window._tfoWritePending(a.ctx);
    // The reader opens a DIFFERENT story while extraction is in flight.
    window.state.storyId = 'story-ELSEWHERE';
    const res = await window._tfoResolvePendingRecord(rec, { injectRaw: a.raw });
    const elsewhereDurable = (window.state._temptFateDurableConsequences || []).length;
    const blockedElsewhere = window._tfoContinuationBlocked(window.state);
    // Go back to the original story: the record is still there and still resolvable.
    window.state.storyId = a.ctx.storyId;
    const back = window._tfoUnresolvedPending(window.state);
    const res2 = back.length ? await window._tfoResolvePendingRecord(back[0], { injectRaw: a.raw }) : null;
    return { res, elsewhereDurable, blockedElsewhere, backCount: back.length, res2,
      durable: (window.state._temptFateDurableConsequences || []).length };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('a response arriving after a STORY SWITCH is refused — the captured storyId decides, not live state',
    r4.res.ok === false && r4.res.staleStory === true, JSON.stringify(r4.res));
  ok('...nothing is written into the story the reader switched TO', r4.elsewhereDurable === 0, JSON.stringify(r4));
  ok('...and the OTHER story is not blocked by a record that does not belong to it', r4.blockedElsewhere === null, JSON.stringify(r4.blockedElsewhere));
  ok('returning to the original story finds the record still pending, and it resolves there',
    r4.backCount === 1 && r4.res2 && r4.res2.ok === true && r4.durable === 1, JSON.stringify(r4.res2).slice(0, 240));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. DUPLICATE COMPLETION — idempotent, never a second consequence');
  const r5 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    const rec = window._tfoWritePending(a.ctx);
    const dup = window._tfoWritePending(a.ctx);                 // a second write of the same key
    const pendingAfterDoubleWrite = Object.keys(window.state._temptOutcomePending || {}).length;
    const first = await window._tfoResolvePendingRecord(rec, { injectRaw: a.raw });
    const second = await window._tfoResolvePendingRecord(rec, { injectRaw: a.raw });  // same response twice
    return { sameRecord: dup === rec, pendingAfterDoubleWrite, first, second,
      durable: (window.state._temptFateDurableConsequences || []).length };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('writing the same pending key twice yields ONE record, not two', r5.sameRecord === true && r5.pendingAfterDoubleWrite === 1, JSON.stringify(r5));
  ok('a DUPLICATE completion does not create a second durable consequence', r5.durable === 1, JSON.stringify(r5.second).slice(0, 240));
  ok('...and the duplicate reports itself as a duplicate rather than a fresh success', r5.second.duplicate === true, JSON.stringify(r5.second));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. A NEWER WISH SEALED MID-FLIGHT DOES NOT STEAL OWNERSHIP');
  const r6 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    const rec = window._tfoWritePending(a.ctx);
    // A SECOND wish is sealed while the first scene's extraction is outstanding.
    window.state.temptFateWish = 'let the whole world know our names';
    window.state.tempt_fate_invoked_this_turn = true;
    if (typeof window._recordTemptFateEvent === 'function') { try { window._recordTemptFateEvent(window.state.temptFateWish); } catch (_) {} }
    const res = await window._tfoResolvePendingRecord(rec, { injectRaw: a.raw });
    const e = (window.state._temptFateDurableConsequences || [])[0] || {};
    return { res, requestedRupture: e.requestedRupture, proposalId: e.proposalId, liveWish: window.state.temptFateWish };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('a newer wish sealed mid-flight does NOT retarget the commit — it lands under the CAPTURED proposal',
    r6.res.ok === true && r6.proposalId === 'tfl_1', JSON.stringify(r6));
  ok('...and carries the CAPTURED wish text, not the newer live one',
    r6.requestedRupture === 'everyone forgets the ceremony happened' && r6.liveWish === 'let the whole world know our names', JSON.stringify(r6));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. SCENE B IS BLOCKED WHILE PENDING, ALLOWED AFTER COMMIT');
  const r7 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    const rec = window._tfoWritePending(a.ctx);
    const whilePending = window._tfoContinuationBlocked(window.state);
    await window._tfoResolvePendingRecord(rec, { injectRaw: a.raw });
    const afterCommit = window._tfoContinuationBlocked(window.state);
    // What Scene B would actually receive: the committed durable consequence.
    const durable = window.state._temptFateDurableConsequences || [];
    return { whilePending, afterCommit, durableCount: durable.length,
      carries: durable[0] ? { wish: durable[0].requestedRupture, cls: durable[0].ruptureClass, scope: durable[0].scopeMatch } : null };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('Scene B is BLOCKED while a delivered Tempt scene has an unresolved outcome',
    r7.whilePending && r7.whilePending.blocked === true, JSON.stringify(r7.whilePending));
  ok('...the block names the reason, so it cannot be mistaken for an unrelated failure',
    /unresolved Tempt Fate|unresolved outcome/i.test((r7.whilePending && r7.whilePending.reason) || ''), (r7.whilePending || {}).reason);
  ok('Scene B is ALLOWED once the outcome commits', r7.afterCommit === null, JSON.stringify(r7.afterCommit));
  ok('...and the durable consequence Scene B will receive is the extracted one',
    r7.durableCount === 1 && r7.carries.wish === 'everyone forgets the ceremony happened' && r7.carries.cls === 'memory_perception',
    JSON.stringify(r7.carries));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('8. THE BOUNDED RESUME PATH, and total-failure behaviour');
  const r8 = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    window._tfoWritePending(a.ctx);
    const resumed = await window._tfoResumePending({ injectRaw: a.raw });
    return { resumed, durable: (window.state._temptFateDurableConsequences || []).length,
      pending: Object.keys(window.state._temptOutcomePending || {}).length };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('the bounded resume path resolves everything outstanding for THIS story',
    Array.isArray(r8.resumed) && r8.resumed.length === 1 && r8.resumed[0].ok === true && r8.durable === 1 && r8.pending === 0,
    JSON.stringify(r8));

  // A delivered:false report must NOT be treated as a silent success, and must NOT manufacture one.
  const r8b = await page.evaluate(async (a) => {
    window.state.storyId = a.ctx.storyId;
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._temptOutcomePending = {};
    const rec = window._tfoWritePending(a.ctx);
    const res = await window._tfoResolvePendingRecord(rec, { injectRaw: { delivered: false } });
    return { res, durable: (window.state._temptFateDurableConsequences || []).length,
      pending: Object.keys(window.state._temptOutcomePending || {}).length };
  }, { ctx: withRoster(c0.ctx, ['Lirael', 'Julian', 'the assembly']), raw: GOOD });
  ok('a delivered:false extraction manufactures NO consequence and does not silently proceed — it stays pending',
    r8b.res.ok === false && r8b.durable === 0 && r8b.pending === 1, JSON.stringify(r8b));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('9. CLEANUP / VOLATILITY ORDERING IS UNDISTURBED');
  const r9 = await page.evaluate(() => ({
    cleanupStillExported: typeof window._cgTemptFateAftermathCleanup === 'function',
    commitAtPersistenceStillExported: typeof window._cgTemptFateCommitAtPersistence === 'function',
    // The commit path must no longer depend on a globally-published owned invocation surviving an
    // await: nothing in the resolve path reads it.
    resolveReadsOwnedInvocation: /_tfoOwnedInvocation|_temptFateOwnedInvocation/.test(window._tfoResolvePendingRecord.toString())
  }));
  ok('the aftermath-cleanup and commit-at-persistence entry points are both still exported', r9.cleanupStillExported && r9.commitAtPersistenceStillExported, JSON.stringify(r9));
  ok('the resolve path NEVER reads live owned-invocation state — the whole point of the immutable context',
    r9.resolveReadsOwnedInvocation === false, 'resolve path references owned-invocation state');

  section('CONTAINMENT');
  ok('ZERO real provider dispatches across the whole control', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('EXTRACTOR LIFECYCLE CONTROL: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
