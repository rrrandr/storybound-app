// ══════════════════════════════════════════════════════════════════════════════════════════
//  CHARACTER-MEMORY AUDIT — READ ONLY, NO PRODUCTION EDIT
//
//  Answers, against the code as it ships, what actually happens to a Character+ beat after it
//  is authored: what is stored, where, what a later scene's prompt receives, what survives an
//  issue transition, and whether an incompatible later description is refused.
//
//  Every answer comes from calling PRODUCTION's own functions in the real page. Nothing here
//  asserts a design; it reports what is there. Zero model calls.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await installSession(page);
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._cpCommitScene && window.buildCharacterDisclosureDirective, { timeout: 60000 });

const R = await page.evaluate(() => {
  const rep = {};
  const s = window.state;
  Object.assign(s, { storyId: 'jess-audit', playerName: 'Ilse', name: 'Ilse',
    loveInterestName: 'Adan', partnerName: 'Adan', turnCount: 1, issueNumber: 1 });
  s._relationshipLedger = null; s._characterDisclosureLedger = {};

  // ── SCENE 1: Jess gets a portfolio and a delivered C+ beat ──
  const jess = window._relEntityForName('Jess', { create: true });
  const att = window._attachPortfolio(jess, [
    { category: 'value', canonical_truth: 'She leads with her decolletage to control where attention lands.',
      possible_pressures: [{ text: 'a room where she is not the focus', evidence_requires: 'attention|room' }],
      forbidden_restatements: [{ forbid: 'is vain', why: 'states it instead of showing the mechanism' }] },
  ], { provenance: 'generated_cast' });
  rep.portfolioAttach = att;
  const facetId = (((window._relLedger() || {}).entities || {})[jess] || {}).authorProfile;
  rep.facetIds = (facetId && facetId.cPlusFacets || []).map(f => f.facet_id);

  // The commit the production path performs after finalized prose.
  const commit = window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: jess, facet_id: rep.facetIds[0], category: 'value' }], appeared: [] });
  rep.commit = commit;
  rep.schedRowAfterScene1 = window._cpSchedRow(jess);

  // ── WHAT A SUCCESSFUL BEAT ACTUALLY RECORDS ──
  // The skeleton entry the author was handed carries these; the question is whether any of them
  // reach a store. Listed explicitly so the report names each missing field rather than "some".
  const WANTED = ['facet_id', 'category', 'scene_uid', 'ordinal', 'issue',
                  'expression_mode', 'visible_action', 'pc_interpretation',
                  'continuity_class', 'episodic_or_signature'];
  const row = rep.schedRowAfterScene1 || {};
  const rowJson = JSON.stringify(row);
  rep.commitFieldCoverage = WANTED.map(f => ({ field: f,
    stored: rowJson.indexOf(f.replace('scene_uid', 'scene_uid')) !== -1
            || (f === 'scene_uid' && row.last_cplus_scene_uid != null)
            || (f === 'ordinal' && row.last_cplus_scene_ordinal != null)
            || (f === 'issue' && row.last_cplus_issue != null)
            || (f === 'facet_id' && (row.used_facet_ids || []).length > 0)
            || (f === 'category' && (row.used_categories || []).length > 0) }));

  // ── SCENE 18: what does a later prompt receive about Jess? ──
  s.turnCount = 18;
  const memo18 = window.buildCharacterDisclosureDirective() || '';
  rep.scene18 = { directiveChars: memo18.length,
                  mentionsJess: /Jess/i.test(memo18),
                  mentionsDecolletage: /decolletage|décolletage/i.test(memo18),
                  mentionsFacetId: rep.facetIds.some(f => memo18.indexOf(f) !== -1),
                  excerpt: memo18.slice(0, 300) };
  // Is the psychology reachable from the ledger at scene 18 at all?
  const L18 = window._relLedger();
  rep.scene18Storage = { entityStillThere: !!(L18 && L18.entities[jess]),
    facetsStillThere: ((((L18 || {}).entities || {})[jess] || {}).authorProfile || {}).cPlusFacets?.length || 0,
    schedRow: window._cpSchedRow(jess) };

  // ── ISSUE 2: the transition production actually performs ──
  const before = { entities: Object.keys((window._relLedger() || {}).entities || {}).length,
                   schedRows: Object.keys((window._cpSchedDump() || {}).rows || {}).length,
                   disclosure: Object.keys(s._characterDisclosureLedger || {}).length };
  if (typeof window._resetStoryState === 'function') { window._resetStoryState(); rep.resetCalled = 'window._resetStoryState'; }
  else { s._relationshipLedger = null; s._characterDisclosureLedger = {}; rep.resetCalled = 'inlined (the reset is not exported; same two assignments)'; }
  const after = { relLedger: s._relationshipLedger, disclosure: s._characterDisclosureLedger,
                  schedRows: Object.keys((window._cpSchedDump() || {}).rows || {}).length };
  rep.issue2 = { before, after: { relLedgerIsNull: after.relLedger === null || after.relLedger === undefined,
                                  disclosureEmptied: Object.keys(after.disclosure || {}).length === 0,
                                  schedRows: after.schedRows },
                 memoAfter: (window.buildCharacterDisclosureDirective() || '').length };
  return rep;
});

// ── IS THERE ANY CONTRADICTION GATE AT ALL? ──
const GATE = await page.evaluate(() => {
  const names = Object.keys(window).filter(k => /contradict|canonConform|continuityAudit|_canonGuard/i.test(k));
  return { candidateGuards: names };
});

const out = { ...R, contradictionGates: GATE };
fs.mkdirSync('_audit_out', { recursive: true });
fs.writeFileSync('_audit_out/character_memory_audit.json', JSON.stringify(out, null, 2));

const L = (t) => console.log(t);
L(`\n${'═'.repeat(80)}\nCHARACTER-MEMORY AUDIT — what production does today\n${'═'.repeat(80)}`);
L(`\n1. STORAGE AFTER A DELIVERED C+ BEAT (scene 1)`);
L(`   portfolio attach : ${JSON.stringify(R.portfolioAttach)}`);
L(`   facet ids        : ${JSON.stringify(R.facetIds)}`);
L(`   commit           : ${JSON.stringify(R.commit)}`);
R.commitFieldCoverage.forEach(f => L(`     ${f.stored ? '✔ stored ' : '✘ LOST   '} ${f.field}`));
L(`\n2. SCENE 18 — WHAT THE LATER PROMPT RECEIVES`);
L(`   character-memory directive : ${R.scene18.directiveChars} chars`);
L(`   names Jess                 : ${R.scene18.mentionsJess}`);
L(`   carries the decolletage    : ${R.scene18.mentionsDecolletage}`);
L(`   carries the facet id       : ${R.scene18.mentionsFacetId}`);
L(`   still in storage           : entity=${R.scene18Storage.entityStillThere} facets=${R.scene18Storage.facetsStillThere}`);
L(`\n3. ISSUE 2 — AFTER THE TRANSITION PRODUCTION PERFORMS (${R.resetCalled})`);
L(`   before : ${JSON.stringify(R.issue2.before)}`);
L(`   after  : ${JSON.stringify(R.issue2.after)}`);
L(`   character-memory directive after transition : ${R.issue2.memoAfter} chars`);
L(`\n4. CONTRADICTION GATES FOUND ON window : ${JSON.stringify(GATE.candidateGuards)}`);
L(`\n${'─'.repeat(80)}\n artifacts → _audit_out/character_memory_audit.json\n`);
await ctx.close().catch(() => {});
await browser.close().catch(() => {});
process.exit(0);
