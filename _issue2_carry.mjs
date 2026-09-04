// ══════════════════════════════════════════════════════════════════════════════════════════
//  ISSUE 2 CARRY — DOES CHARACTER MEMORY SURVIVE THE BOUNDARY?
//
//  The carry block in startBook2 restored the ledgers only when
//      String(state.storyId) === String(_carriedRel._ledgerStoryId)
//  and _resetStoryState() runs immediately before it, nulling storyId and minting a fresh
//  crypto.randomUUID(). The comparison was therefore unsatisfiable: Issue 2 logged
//  "NOT carried" every time and opened with nobody known.
//
//  A second loss sat behind it: _relLedger() discards any ledger whose L.storyId does not match
//  the current story, so even a restored ledger died on the next read.
//
//  This drives the REAL startBook2, over a ledger built by the REAL continuation commit path.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import vm from 'node:vm';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 620) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const MUT = process.env.SB_MUT || '';
let body = SRC, targets = null;
if (MUT) {
  // '@@AND@@' joins independent replacements so one arm can force a condition AND remove the
  // guard that handles it — the only way to control for an intermittent race deterministically.
  const froms = MUT.split('@@AND@@').map(m => m.split('@@TO@@')[0]);
  const tos = MUT.split('@@AND@@').map(m => m.split('@@TO@@')[1] ?? '');
  const counts = froms.map(f => body.split(f).length - 1);
  if (!counts.every(c => c === 1)) {
    console.error(`\n  MUTATION MARKERS NOT UNIQUE: ${JSON.stringify(counts)}\n`); process.exit(2);
  }
  targets = counts.join(',');
  froms.forEach((f, i) => { body = body.replace(f, tos[i]); });
  // PARSE THE MUTATED BYTES BEFORE SERVING. A malformed injection makes the page never
  // initialize, and the only symptom is an opaque waitForFunction timeout.
  try { new vm.Script(body, { filename: 'i2-mutated.js' }); }
  catch (e) { console.error(`\n  MUTATED SOURCE DOES NOT PARSE: ${String((e && e.message) || e)}\n`); process.exit(2); }
}

const PLANNER_REPLY = JSON.stringify({
  environment_anchor: 'the salt-stiffened ledger rope across the harbour counter',
  structural_pacing: 'compressed', narrative_density: 'medium', dialogue_ratio: 'balanced',
  beat_style: 'escalating', tension_rhythm: 'rising', interlocutor_placement: 'across the counter',
  li_texture_beat: 'he squares the ledger without being asked',
  pc_body_callback: 'decision', li_body_callback: 'opening', antagonist_body_callback: null,
  staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
  environment_plus: { target: 'the harbour counter', axis: 'use' }, fusion: null
});
const DISCLOSURE_REPLY = JSON.stringify({
  characters: [{ name: 'the presiding Dohkar', present: true, relationshipToPC: null, newLayer: null, vehicle: 'none' }],
  scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.0 },
  sceneState: { setting: 'the harbour office', charactersPresent: ['the presiding Dohkar'] }
});

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const escaped = [], logs = [];
await installSession(page);
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let payload = ''; try { payload = route.request().postData() || ''; } catch (_) {}
  const reply = /charactersPresent|relationshipToPC/.test(payload) ? DISCLOSURE_REPLY : PLANNER_REPLY;
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, content: reply,
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: reply } }] }) });
});
await page.route('**/app.js*', r => r.fulfill({ status: 200,
  contentType: 'application/javascript; charset=utf-8', body }));
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
page.on('console', m => { const x = m.text(); if (/ISSUE-CONTINUITY|BOOK2|CPLUS/i.test(x)) logs.push(x.slice(0, 260)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 200)));
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.startBook2 && window.__generateSceneSkeleton, { timeout: 60000 });

// ══ BUILD REAL MEMORY: a grounded continuation beat, committed through the mounted page ══
const BEFORE = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'issue2-carry-src', turnCount: 3, scenes: ['a', 'b', 'c'], sceneSkeleton: null,
    issueNumber: 1, book_number: 1, series_id: 'series-carry',
    main_characters_locked: true, picks: { world: def.world, tone: 'romantic', flavor: 'x', genre: 'romance' },
    intensity: 'medium', immutableTitle: 'The First Sacrifice' });
  s._relationshipLedger = null;
  await window.__generateSceneSkeleton('she pushes past the clerk', 'I need the manifest cleared.', {});
  const cp = ((s.sceneSkeleton || {}).character_plus || [])[0] || null;
  if (!cp) return { cp: null };
  const prose = 'The harbour office was colder than the street. ' + cp.character + ' '
    + cp.verification_target + ', and I watched it happen without saying anything at all.';
  window.StoryPagination.addPage('<p>' + prose + '</p>', true, 'issue2-uid-1', { invocationId: 'inv-i2' });
  let store = {};
  for (let i = 0; i < 200; i++) {
    const L = window._relLedger(false); const r = {};
    Object.keys((L && L.entities) || {}).forEach(k => {
      const e = L.entities[k], c = e && e.cplusContinuity;
      if (c && Array.isArray(c.manifestations) && c.manifestations.length) {
        r[k] = c.manifestations.map(m => ({ facet_id: m.facet_id, verification: m.verification }));
      }
    });
    if (Object.keys(r).length) { store = r; break; }
    await new Promise(res => setTimeout(res, 25));
  }
  return { cp, store, storyId: s.storyId, ledgerStamp: (s._relationshipLedger || {}).storyId,
           entities: Object.keys((s._relationshipLedger || {}).entities || {}) };
});
ok('I1 a REAL grounded continuation beat committed before the boundary — this test carries memory, not an empty object',
   !!BEFORE.cp && Object.keys(BEFORE.store || {}).length > 0
   && Object.values(BEFORE.store).some(ms => ms.some(m => m.verification === 'verified')),
   `cp=${BEFORE.cp && BEFORE.cp.character} store=${JSON.stringify(BEFORE.store)}`);

// ══ THE REAL TRANSITION ══
const AFTER = await page.evaluate(async () => {
  const s = window.state;
  s.nextIssueAvailable = true; s.continuationPurchaseRequired = false;
  let threw = null;
  try { await window.startBook2(); } catch (e) { threw = String((e && e.message) || e); }
  await new Promise(r => setTimeout(r, 300));
  const L = s._relationshipLedger || null;
  // A SECOND, INDEPENDENT READ. _relLedger() re-validates the stamp and discards a mismatch, so
  // "restored" is only real if it survives the next read the app makes.
  const afterRead = window._relLedger(false);
  return { threw, storyId: s.storyId,
           ledgerStamp: L && L.storyId,
           entitiesRaw: Object.keys((L && L.entities) || {}),
           entitiesAfterRead: Object.keys((afterRead && afterRead.entities) || {}),
           manifestations: Object.keys((afterRead && afterRead.entities) || {}).reduce((a, k) => {
             const c = afterRead.entities[k].cplusContinuity;
             if (c && c.manifestations && c.manifestations.length) {
               a[k] = c.manifestations.map(m => ({ facet_id: m.facet_id, verification: m.verification }));
             }
             return a; }, {}),
           bookNumber: s.book_number };
});
ok('I2 startBook2 completed without throwing',
   !AFTER.threw, String(AFTER.threw));
ok('I3 ★ the transition really did mint a NEW storyId — the condition the old guard compared against',
   !!AFTER.storyId && AFTER.storyId !== BEFORE.storyId,
   `before=${BEFORE.storyId} after=${AFTER.storyId}`);
ok('I4 ★ the character ledger SURVIVED the issue boundary',
   AFTER.entitiesRaw.length > 0 && BEFORE.entities.every(e => AFTER.entitiesRaw.indexOf(e) !== -1),
   `before=${JSON.stringify(BEFORE.entities)} after=${JSON.stringify(AFTER.entitiesRaw)}`);
ok('I5 ★ …and it was RE-STAMPED to the new story, so the next _relLedger() read does not discard it',
   AFTER.ledgerStamp === AFTER.storyId && AFTER.entitiesAfterRead.length === AFTER.entitiesRaw.length,
   `stamp=${AFTER.ledgerStamp} storyId=${AFTER.storyId} afterRead=${JSON.stringify(AFTER.entitiesAfterRead)}`);
// THE EXACT BEAT, NOT "SOME". `some verified manifestation` would pass on any character with any
// facet — including one this test never created, and including a beat the new issue wrote itself.
// What has to survive is the specific canonical id and facet the Issue 1 commit produced.
const carriedRow = AFTER.manifestations[BEFORE.cp && BEFORE.cp.canonicalId];
ok('I6 ★ the EXACT Issue 1 canonicalId + facet_id survives the boundary, still marked verified',
   !!BEFORE.cp && !!carriedRow
   && carriedRow.some(m => m.facet_id === BEFORE.cp.facet_id && m.verification === 'verified'),
   `issue1=${BEFORE.cp && BEFORE.cp.canonicalId}/${BEFORE.cp && BEFORE.cp.facet_id} `
   + `carried=${String(JSON.stringify(carriedRow)).slice(0, 220)} all=${String(JSON.stringify(AFTER.manifestations)).slice(0, 260)}`);
ok('I7 the transition logged a CARRY, not a refusal',
   logs.some(l => /ISSUE-CONTINUITY.*carried the character ledgers/.test(l))
   && !logs.some(l => /ISSUE-CONTINUITY.*NOT carried/.test(l)),
   JSON.stringify(logs.filter(l => /ISSUE-CONTINUITY/.test(l))));
ok('I8 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));


// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE OTHER SIDE OF THE LINE — startNewInWorld CARRIES NOTHING
//  Same-cast continuation and a genuinely new story are different transitions. The first must
//  keep verified memory through any number of id remints; the second must open with nobody
//  known and no canon artifact from the story before it.
// ══════════════════════════════════════════════════════════════════════════════════════════
const NW = await page.evaluate(async ([dohkar, facet]) => {
  const s = window.state;
  // Rebuild a populated story: entities, a verified manifestation, and every canon artifact the
  // C+ work introduced. If any of these survive, a stranger's history has entered a new story.
  s.storyId = 'newworld-src';
  s._relationshipLedger = { v: 1, storyId: s.storyId, processed: {}, entities: {}, edges: {}, seq: 0 };
  const L = window._relLedger(true);
  L.entities[dohkar] = { id: dohkar, kind: 'role', label: 'the presiding Dohkar', aliases: ['the presiding Dohkar'] };
  window._cpCommitScene({ sceneUid: 'nw-1', ordinal: 2, issue: 1, semanticStatus: 'contradiction',
    published: true, delivered: [{ canonicalId: dohkar, facet_id: facet, category: 'value', verified: true }],
    appeared: [] });
  s._cpGeneratedStage = { '4': { ok: true, storyId: s.storyId, provenance: 'planner_stage',
    participants: [{ ref: dohkar, presence: 'IN_PERSON', label: 'the presiding Dohkar' }], eventFacts: [] } };
  s._cpCanonSequenceResults = { 'cpa:old': { storyId: s.storyId, attemptId: 'cpa:old',
    semanticStatus: 'contradiction', publishedWithConflict: true, consumed: false } };
  s._cpCanonSnapshot = { storyId: s.storyId, sceneNumber: 1, attemptId: 'cpa:old', text: 'OLD-CANON', ok: true };
  s._cpAttemptId = 'cpa:old';
  s._cpDirectedBeats = [{ facet_id: facet }];
  s._cpContinuationContract = { sceneNumber: 4, ok: true };

  const before = {
    entities: Object.keys(L.entities),
    manifestations: ((L.entities[dohkar].cplusContinuity || {}).manifestations || [])
      .map(m => ({ facet_id: m.facet_id, verification: m.verification })),
    genStage: !!s._cpGeneratedStage, results: Object.keys(s._cpCanonSequenceResults || {}).length,
    snapshot: !!s._cpCanonSnapshot, attemptId: s._cpAttemptId, storyId: s.storyId };

  let threw = null;
  try { await window.startNewInWorld(); } catch (e) { threw = String((e && e.message) || e); }
  await new Promise(r => setTimeout(r, 300));

  const L2 = window._relLedger(false);
  return { threw, before, after: {
    storyId: s.storyId,
    ledgerRaw: Object.keys(((s._relationshipLedger || {}).entities) || {}),
    ledgerRead: Object.keys(((L2 || {}).entities) || {}),
    genStage: s._cpGeneratedStage, results: s._cpCanonSequenceResults,
    snapshot: s._cpCanonSnapshot, attemptId: s._cpAttemptId,
    directed: s._cpDirectedBeats, contract: s._cpContinuationContract,
    carryAdopt: s._relLedgerCarryAdopt } };
}, ['role:first_sacrifice_presiding_dohkar', 'f:nw']);

ok('N1 the fixture really was populated — a verified manifestation existed before the transition',
   NW.before.manifestations.some(m => m.facet_id === 'f:nw' && m.verification === 'verified')
   && NW.before.entities.indexOf('role:first_sacrifice_presiding_dohkar') !== -1,
   JSON.stringify(NW.before));
ok('N2 startNewInWorld completed and minted a different story',
   !NW.threw && NW.after.storyId && NW.after.storyId !== NW.before.storyId,
   `threw=${NW.threw} before=${NW.before.storyId} after=${NW.after.storyId}`);
ok('N3 ★ the character ledger did NOT carry — the new story opens with nobody known',
   NW.after.ledgerRead.indexOf('role:first_sacrifice_presiding_dohkar') === -1
   && NW.after.ledgerRaw.indexOf('role:first_sacrifice_presiding_dohkar') === -1,
   `raw=${JSON.stringify(NW.after.ledgerRaw)} read=${JSON.stringify(NW.after.ledgerRead)}`);
ok('N4 ★ no canon artifact survived — generated stage, verdict map, snapshot, attempt id, beats, contract',
   !NW.after.genStage && !NW.after.results && !NW.after.snapshot && !NW.after.attemptId
   && !(NW.after.directed && NW.after.directed.length) && !NW.after.contract,
   JSON.stringify({ genStage: NW.after.genStage, results: NW.after.results,
                    snapshot: NW.after.snapshot, attemptId: NW.after.attemptId,
                    directed: NW.after.directed, contract: NW.after.contract }));
ok('N5 ★ and no carry was ARMED — the adopt flag belongs to the same-cast path only',
   !NW.after.carryAdopt, `carryAdopt=${JSON.stringify(NW.after.carryAdopt)}`);

// A stale generated stage keyed by scene number must not be readable under a different story.
const NW2 = await page.evaluate((dohkar) => {
  const s = window.state;
  s.storyId = 'other-story';
  s._cpGeneratedStage = { '4': { ok: true, storyId: 'the-previous-story', provenance: 'planner_stage',
    participants: [{ ref: dohkar, presence: 'IN_PERSON', label: 'x' }], eventFacts: [] } };
  const st = window._sceneStageContract(s, 4);
  return { ok: !!(st && st.ok), source: st && st.source, fault: st && st.fault };
}, 'role:first_sacrifice_presiding_dohkar');
ok('N6 ★ a generated stage from ANOTHER story is not authoritative here — it is keyed by scene number, so it is checked by story too',
   NW2.ok === false || !/^generated:/.test(String(NW2.source)),
   JSON.stringify(NW2));

console.log(`\n  newWorld : before=${JSON.stringify(NW.before.entities)} → after=${JSON.stringify(NW.after.ledgerRead)}`);
console.log(`  artifacts: ${JSON.stringify({ genStage: NW.after.genStage, results: NW.after.results, snapshot: NW.after.snapshot, attemptId: NW.after.attemptId })}`);
console.log(`  foreignStage: ${JSON.stringify(NW2)}`);

console.log('\n' + out.join('\n'));
console.log(`\n  before : story=${BEFORE.storyId} entities=${JSON.stringify(BEFORE.entities)}`);
console.log(`  after  : story=${AFTER.storyId} stamp=${AFTER.ledgerStamp} entities=${JSON.stringify(AFTER.entitiesRaw)}`);
console.log(`  carried: ${BEFORE.cp && BEFORE.cp.canonicalId} / ${BEFORE.cp && BEFORE.cp.facet_id} → ${String(JSON.stringify(carriedRow))}`);
console.log(`  logs   : ${JSON.stringify(logs.filter(l => /ISSUE-CONTINUITY/.test(l)))}`);
if (MUT) console.log(`  MUTATION: targets=${targets}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
