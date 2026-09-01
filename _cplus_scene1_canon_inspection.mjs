// ══════════════════════════════════════════════════════════════════════════════════════════
//  SCENE-1 CANON INSPECTION — IS THE ZERO-BYTE DELTA EARNED?
//
//  A fresh story has no manifestations. It does NOT follow that it has no canon to protect:
//  the PC, the LI, an antagonist and the seed cast can all carry authoritative LATENT facets
//  before a word is written, and the projection exists precisely to protect those through
//  prohibitions without disclosing them. If facets exist and the projection sees none, the
//  zero delta is a source-adapter or ordering defect wearing a success.
//
//  This inspects the REAL Scene-1 stage, at the seam the planner and author read from.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);
let escaped = 0;
await page.route('**/*', async route => {
  const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/.test(path)) escaped++;
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window._sceneStageContract && window._cpBuildEstablishedCanon, { timeout: 60000 });

const R = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor,
    dynamic: def.dynamic, _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    pov: 'first_person', identity: { playerName: 'Lirael', partnerName: 'Julian' },
    storyId: 'canon-inspect', turnCount: 0 });
  s._relationshipLedger = null;

  // THE REAL SEAM: production's own Scene-1 stage contract.
  const stage = window._sceneStageContract(s, 1);
  // The exposed accessor is READ-ONLY (it forwards create=false), so a null here is not a
  // harness slip — it is the state the projection actually runs against at Scene 1.
  const ledgerAtScene1 = window._relLedger();
  const L = ledgerAtScene1 || { entities: {} };

  // What the seed index itself holds, independently of any adapter.
  const seedIdx = (typeof window._seedFacetIndex === 'function') ? (window._seedFacetIndex(s) || {}) : {};

  const per = [];
  (stage.onStage || []).concat(stage.offStage || []).forEach(c => {
    if (!c || !c.id) return;
    const ent = (L.entities || {})[c.id] || null;
    const sources = ent ? window._cpCanonSources(ent, c.id, {}) : [];
    const canon = window._cpCanonFor(c.id, {});
    per.push({
      id: c.id, label: c.label || c.name,
      entityExists: !!ent,
      canonSourceCount: sources.length,
      canonForReturnedNull: canon === null,
      latentFacets: canon ? canon.allFacets.filter(f => f.disclosureStatus === 'latent').length : 0,
      latentProhibitions: canon ? canon.latentGuards.filter(g => g.humanGuards).length : 0,
      revealedFacets: canon ? canon.mustNotContradict.length : 0,
    });
  });

  // What the seed index says these people HAVE, by key and by label.
  const seedRows = Object.keys(seedIdx).map(k => ({
    key: k, label: seedIdx[k].label, facets: (seedIdx[k].facets || []).length,
    prohibitions: (seedIdx[k].facets || []).reduce((n, f) =>
      n + ((f.forbidden_restatements || []).length), 0),
  }));

  const model = window._cpBuildEstablishedCanon(stage, {});
  const view = window._cpCanonView(model, 'creative', {});
  const audit = window._cpCanonView(model, 'auditor_private', { budget: 100000 });
  const coverage = window._cpCanonCoverage(model);
  // Every raw matcher the model holds, so the assertions below can prove where each one goes.
  const rawGuards = [];
  model.entries.forEach(e => (e.allFacets || []).forEach(f =>
    (f.rawGuards || []).forEach(g => rawGuards.push(g))));
  const truths = [];
  model.entries.forEach(e => (e.allFacets || []).forEach(f => truths.push(f.truth)));
  return { ledgerExistsAtScene1: !!ledgerAtScene1,
           ledgerEntityCount: Object.keys((ledgerAtScene1 || {}).entities || {}).length,
           stageOk: stage.ok, stageFault: stage.fault,
           onStage: (stage.onStage || []).map(c => c.id),
           offStage: (stage.offStage || []).map(c => c.id || c.name),
           per, seedRows, protectedCount: model.entries.length,
           viewOk: view.ok, viewChars: (view.text || '').length, view: view.text || '',
           coverage: coverage, auditChars: (audit.text || '').length, auditText: audit.text || '',
           rawGuards: rawGuards, truths: truths,
           unrenderableLatent: view.unrenderableLatent || 0 };
});

fs.mkdirSync('_audit_out', { recursive: true });
fs.writeFileSync('_audit_out/scene1_canon_inspection.json', JSON.stringify(R, null, 2));

const L = console.log;
L(`\n${'═'.repeat(84)}\nSCENE-1 CANON INSPECTION — the real planner/author seam\n${'═'.repeat(84)}`);
L(` stage ok=${R.stageOk} onStage=${JSON.stringify(R.onStage)}`);
L(` relationship ledger at Scene 1: exists=${R.ledgerExistsAtScene1} entities=${R.ledgerEntityCount}`);
L(`\n SEED FACET INDEX (what authoritative canon exists before a word is written)`);
R.seedRows.forEach(r => L(`   ${r.key.padEnd(42)} "${r.label}"  facets=${r.facets} prohibitions=${r.prohibitions}`));
L(`\n PER STAGE SUBJECT`);
L(`   ${'id'.padEnd(42)} ent  srcs  null  latent  proh  revealed`);
R.per.forEach(p => L(`   ${String(p.id).padEnd(42)} ${p.entityExists ? ' ✔ ' : ' ✘ '} ${String(p.canonSourceCount).padStart(4)} ${p.canonForReturnedNull ? '  ✘ ' : '  ✔ '} ${String(p.latentFacets).padStart(6)} ${String(p.latentProhibitions).padStart(5)} ${String(p.revealedFacets).padStart(9)}`));
L(`\n protected-character count used by refusal logic : ${R.protectedCount}`);
L(` creative projection : ok=${R.viewOk} chars=${R.viewChars}`);
if (R.view) L(`\n${R.view}`);
L(`\n C+ CONTINUITY COVERAGE — counted is not protected (this projection only)`);
L(`   C+ canon-bearing subjects     : ${R.coverage.cplusCanonBearingSubjects}`);
L(`   creatively protected (C+)     : ${R.coverage.cplusCreativelyProtectedSubjects}`);
L(`   C+ auditor-only (unresolved)  : ${R.coverage.cplusAuditorOnlySubjects}`);
L(`   unrenderable latent facets    : ${R.coverage.cplusUnrenderableLatentFacets}`);
R.coverage.subjects.forEach(x => L(`     ${String(x.label).padEnd(24)} facets=${x.facets} authorSafe=${x.authorSafe} auditorOnly=${x.auditorOnly} → ${x.protection}`));

// ── THE ASSERTIONS THAT MATTER ──
const leakedRegex = /[\\(){}\[\]^$*+?]|\\w/.test(R.view);
const leakedTruth = R.truths.some(t => t && R.view.indexOf(t) !== -1);
const guardsInAudit = R.rawGuards.length > 0;
const truthsInAudit = R.truths.filter(t => t && R.auditText.indexOf(t) !== -1).length;
L(`\n ASSERTIONS`);
L(`   creative view carries NO regex syntax        : ${!leakedRegex ? '✓' : '✗ LEAK'}`);
L(`   creative view discloses NO latent truth      : ${!leakedTruth ? '✓' : '✗ LEAK'}`);
L(`   auditor_private carries the truths           : ${truthsInAudit}/${R.truths.length}`);
L(`   validated matchers exist for the gate        : ${guardsInAudit ? '✓ ' + R.rawGuards.length : '✗ none'}`);
L(`\n escaped requests: ${escaped}`);
L(`${'─'.repeat(84)}\n artifacts → _audit_out/scene1_canon_inspection.json\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(0);
