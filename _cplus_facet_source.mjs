// C+ FACET SOURCE — free, no model calls. The psychological source, addressed by identity.
//
// The defect this exists to prevent: the planner receives NAMES and is asked for specific
// psychology, so it manufactures "her breath hitches". A facet record gives every C+ assignment
// a citable source — and a character with no authored facet must produce a DECLINE, never an
// invention.
//
// usage: node _cplus_facet_source.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nC+ FACET SOURCE — authored psychology, resolvable by canonical identity\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
await page.route('**/api/**', r => PASSTHROUGH.test(r.request().url()) ? r.continue() : r.abort());
await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await page.waitForFunction(() => window._seedFacetIndex && window._facetsForCharacter && window.STARTER_SEEDS, { timeout:120000 });

const R = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { _starterId:'starter_first_sacrifice', is_starter_story:true,
    playerName:'Lirael', name:'Lirael', loveInterestName:'Julian' });
  const idx = window._seedFacetIndex(s);
  const byLabel = (label, id, aliases) => window._facetsForCharacter({ id, label, aliases: aliases || [label] }, s);
  return { idx,
    seren:  byLabel('Seren', 'named:seren'),
    julian: byLabel('Julian', 'named:julian'),
    pc:     byLabel('Lirael', 'pc:lirael'),
    dohkar: byLabel('the presiding Dohkar', 'role:the_presiding_dohkar'),
    dohkarByAlias: byLabel('Dohkar', 'role:dohkar', ['Dohkar']),
    unknown: byLabel('a guest', 'named:a_guest'),
    cats: window._CPLUS_FACET_CATEGORIES };
});

// ── the tracer: the characterization that was authored and never delivered ──
t('1a: Seren resolves to authored facets', R.seren.length === 3, JSON.stringify(R.seren.map(f => f.facet_id)));
t('1b: her performative empathy is one of them, from canon',
  R.seren.some(f => f.facet_id === 'seren_goodness_needs_witness' && /needs her goodness to be seen/i.test(f.canonical_truth)),
  JSON.stringify(R.seren.map(f => f.canonical_truth.slice(0, 50))));
t('1c: her three facets are genuinely distinct, not one truth split three ways',
  new Set(R.seren.map(f => f.category)).size === 3,
  JSON.stringify(R.seren.map(f => [f.facet_id, f.category])));
t('1d: every facet carries its own source_character_id',
  R.seren.every(f => f.source_character_id === 'named:seren'));

// ── the role instance, and the scoping that keeps it out of the profession ──
t('2a: the presiding Dohkar resolves by canonical id', R.dohkar.length === 1, JSON.stringify(R.dohkar.map(f => f.facet_id)));
t('2b: his contempt is the authored facet',
  R.dohkar.some(f => f.facet_id === 'presiding_dohkar_ritual_contempt' && /cannot be bothered to pretend/i.test(f.canonical_truth)));
t('2c: he resolves by alias too ("Dohkar" as the planner spells it)',
  R.dohkarByAlias.length === 1 && R.dohkarByAlias[0].facet_id === 'presiding_dohkar_ritual_contempt');
t('2d: the record is a ROLE INSTANCE, not the Dohkar profession',
  Object.keys(R.idx).some(k => R.idx[k].role_instance_id === 'first_sacrifice_presiding_dohkar'));
t('2e: it carries NO characterization from the doctrine\'s other Dohkar (Raes)',
  !R.dohkar.some(f => /debt coming due|bad luck/i.test(f.canonical_truth)));

// ── LI and PC ──
// Julian's drafted facets proposed NEW canonical motives for the LI rather than projecting
// authored bio text, so they are held for Roman's approval. [] is the correct state.
t('3a: Julian resolves to NO facets — his are held for canon approval',
  R.julian.length === 0, JSON.stringify(R.julian.map(f => f.facet_id)));
t('3b: the PC has facets too — she is the OBSERVED party elsewhere',
  R.pc.length === 2 && R.pc.every(f => f.source_character_id === 'pc:lirael'),
  JSON.stringify(R.pc.map(f => f.facet_id)));

// ── the decline path: no source means no C+, never an invention ──
t('4a: an unknown character resolves to NO facets', R.unknown.length === 0, JSON.stringify(R.unknown));
t('4b: no two characters share a facet_id',
  (() => { const all = [...R.seren, ...R.julian, ...R.pc, ...R.dohkar].map(f => f.facet_id);
           return all.length === new Set(all).size; })());
t('4c: every facet_id is unique across the whole seed index',
  (() => { const all = Object.values(R.idx).flatMap(e => e.facets.map(f => f.facet_id));
           return all.length === new Set(all).size; })());

// ── shape ──
t('5a: every category is from the doctrine\'s own ten',
  Object.values(R.idx).flatMap(e => e.facets).every(f => R.cats.includes(f.category)),
  JSON.stringify(R.cats));
t('5b: possible_pressures are applicability conditions, never prose to copy',
  Object.values(R.idx).flatMap(e => e.facets).every(f =>
    Array.isArray(f.possible_pressures) && f.possible_pressures.every(p => p.split(/\s+/).length <= 12)));
t('5c: every facet declares a canonical_truth', 
  Object.values(R.idx).flatMap(e => e.facets).every(f => f.canonical_truth && f.canonical_truth.length > 30));

// ══════════════════════════════════════════════════════════════════════════════════════
// 6 · SOURCE HARDENING — the five failures a naive index makes
// ══════════════════════════════════════════════════════════════════════════════════════
const H = await page.evaluate(() => {
  const s = window.state;
  const out = {};
  // (a) placeholder playerName + real name — the kernel case the stage contract handles
  Object.assign(s, { playerName: 'the one who carries the story', name: 'Lirael' });
  out.pcIdentity = window._resolvePcIdentity(s);
  out.pcFacets = window._facetsForCharacter({ id: 'pc:lirael', label: 'Lirael', aliases: ['Lirael'] }, s);
  // the stage contract MUST still resolve under that same fixture — the extraction that
  // introduced this test also broke it, and only the outer catch hid the throw.
  const st1 = window._scene1StageContract(s) || {};
  out.stageOk = st1.ok; out.stageFault = st1.fault || null; out.stagePcName = st1.pcName || null;
  Object.assign(s, { playerName: 'Lirael', name: 'Lirael' });
  // (b) scene scope — the Dohkar belongs to scene 1 only
  const dohkarRec = { id: 'role:x', label: 'Dohkar', aliases: ['Dohkar'] };
  out.dohkarScene1  = window._facetsForCharacter(dohkarRec, s, { sceneNumber: 1 });
  out.dohkarScene14 = window._facetsForCharacter(dohkarRec, s, { sceneNumber: 14 });
  // and the scope must follow the SUPPLIED number, not turnCount
  s.turnCount = 0;
  out.dohkarScopeIsSupplied = window._facetsForCharacter(dohkarRec, s, { sceneNumber: 14 }).length;
  // (c) ambiguity fails closed — driven through the PURE resolver with constructed data,
  //     because _facetsForCharacter closes over its own index and ignores any window swap.
  const twoRecords = {
    'named:one': { canonical_id:'named:one', label:'One', aliases:['One','SharedAlias'],
                   facets:[{ facet_id:'f_one', category:'value', canonical_truth:'x', source_character_id:'named:one' }] },
    'named:two': { canonical_id:'named:two', label:'Two', aliases:['Two','SharedAlias'],
                   facets:[{ facet_id:'f_two', category:'fear', canonical_truth:'y', source_character_id:'named:two' }] },
  };
  out.ambiguous = window._resolveFacetIndexEntry(
    { id:'named:zzz', label:'SharedAlias', aliases:['SharedAlias'] }, twoRecords);
  // control: a UNIQUE alias against the same index must still resolve, so 6e cannot pass by
  // the resolver simply being broken.
  out.unambiguous = window._resolveFacetIndexEntry(
    { id:'named:zzz', label:'Two', aliases:['Two'] }, twoRecords);
  // and the first-match behaviour this replaced WOULD have returned one of them
  out.firstMatchWouldHaveReturned = Object.keys(twoRecords).filter(k =>
    twoRecords[k].aliases.map(a => a.toLowerCase()).includes('sharedalias')).length;
  // (d) the aggregate provider set, and whether failing closed is safe yet
  out.coverage = window._facetSourceCoverage(null, s);
  // A candidate set the SELECTOR would produce: an on-stage person, an ABSENT one who still
  // qualifies (the Waldorf-concierge shape), and someone with no facet at all.
  out.coverageWithSet = window._facetSourceCoverage([
    { id: 'named:seren',  label: 'Seren',  aliases: ['Seren'] },
    { id: 'role:absent',  label: 'Dohkar', aliases: ['Dohkar'] },   // absent-but-in-scope
    { id: 'named:nobody', label: 'A Guest', aliases: ['A Guest'] }, // no facet
  ], s);
  // (e) an invalid category is dropped, not recast
  out.badCategory = (() => {
    const seed = window.STARTER_SEEDS.starter_first_sacrifice;
    const cast = seed.cast.find(c => c.name === 'Seren');
    const keep = cast.cPlusFacets;
    cast.cPlusFacets = keep.concat([{ facet_id: 'bogus_cat', category: 'vibes',
      canonical_truth: 'a truth long enough to pass the length check for canonical truths' }]);
    const got = window._facetsForCharacter({ id: 'named:seren', label: 'Seren', aliases: ['Seren'] }, s);
    cast.cPlusFacets = keep;
    return got.map(f => [f.facet_id, f.category]);
  })();
  return out;
});

t('6a: a placeholder playerName does not hide the PC — identity resolves to the real name',
  H.pcIdentity && H.pcIdentity.v === 'Lirael' && H.pcIdentity.src === 'state.name',
  JSON.stringify(H.pcIdentity));
t('6b: …and her facets still resolve under the kernel placeholder',
  H.pcFacets.length === 2, JSON.stringify(H.pcFacets.map(f => f.facet_id)));
t('6c: the Scene-1 presiding Dohkar resolves in scene 1',
  H.dohkarScene1.length === 1 && H.dohkarScene1[0].facet_id === 'presiding_dohkar_ritual_contempt');
t('6d: a DIFFERENT Dohkar later in the story inherits nothing',
  H.dohkarScene14.length === 0, JSON.stringify(H.dohkarScene14.map(f => f.facet_id)));
t('6e: two records sharing an alias fail CLOSED, never first-match',
  Array.isArray(H.ambiguous) && H.ambiguous.length === 0, JSON.stringify(H.ambiguous));
t('6e2: …and the test is not vacuous — first-match WOULD have returned a record',
  H.firstMatchWouldHaveReturned === 2,
  `only ${H.firstMatchWouldHaveReturned} record(s) carried the shared alias — the ambiguity never existed`);
t('6e3: …while a UNIQUE alias against the same index still resolves',
  Array.isArray(H.unambiguous) && H.unambiguous.length === 1 && H.unambiguous[0].facet_id === 'f_two',
  JSON.stringify(H.unambiguous));
t('6f: the source is an AGGREGATE, with the seed as one provider among four',
  H.coverage.providers.length >= 4 && H.coverage.providers.some(p => p.id === 'seed' && p.live),
  JSON.stringify(H.coverage.providers));
t('6g: given a candidate set, coverage measures exactly THAT set — absent members included',
  H.coverageWithSet.candidateSetSupplied === true
    && H.coverageWithSet.candidateCount === 3
    && H.coverageWithSet.coveredCount === 2
    && H.coverageWithSet.uncovered.length === 1,
  JSON.stringify(H.coverageWithSet));
t('6g2: failing closed is HARD-DISABLED until a canonical selector exists',
  H.coverage.safeToFailClosed === false && !!H.coverage.failClosedBlockedBy,
  JSON.stringify({ safe: H.coverage.safeToFailClosed, blockedBy: H.coverage.failClosedBlockedBy }));
t('6g3: coverage does NOT discover eligibility — it needs a candidate set',
  H.coverage.candidateSetSupplied === false && H.coverage.uncovered === null,
  'coverage must take the C+ candidate set from the selector, not derive it from on-stage presence');
t('6k: the Dohkar scene scope follows the SUPPLIED scene number, not turnCount',
  H.dohkarScopeIsSupplied === 0,
  'turnCount said scene 1 but sceneNumber:14 was supplied — the supplied value must win');
// ── THE STAGE CONTRACT ITSELF, under the fixture that broke it ──
t('6i: _scene1StageContract resolves OK under the kernel/Lirael fixture',
  H.stageOk === true, JSON.stringify({ ok: H.stageOk, fault: H.stageFault, pcName: H.stagePcName }));
t('6j: …and it resolves the PC to the real name, not the kernel',
  H.stagePcName === 'Lirael', JSON.stringify(H.stagePcName));
t('6h: an invalid category is DROPPED, not silently recast to value',
  !H.badCategory.some(([id]) => id === 'bogus_cat') && H.badCategory.length === 3,
  JSON.stringify(H.badCategory));

// ══════════════════════════════════════════════════════════════════════════════════════
// 7 · MERGE SEMANTICS — driven through the pure _mergeFacetIndexes with constructed data
// The aggregation shipped with three bugs and zero tests: provenance stamped on the record
// instead of the facet, a conflicted id resurrectable by a third provider, and identity
// metadata silently inheriting whichever record arrived first.
// ══════════════════════════════════════════════════════════════════════════════════════
const M = await page.evaluate(() => {
  const F = (id, truth, cat) => ({ facet_id: id, category: cat || 'value', canonical_truth: truth,
                                   possible_pressures: [], source_character_id: 'named:x' });
  const rec = (facets, label) => ({ 'named:x': { canonical_id:'named:x', label: label || 'X',
                                                 aliases:['X'], facets: facets } });
  const merge = window._mergeFacetIndexes;
  return {
    // (a) distinct ids from two providers → both kept, each with its own provenance
    distinct: merge([
      { providerId:'seed',         index: rec([F('f_a','truth A')]) },
      { providerId:'relationship', index: rec([F('f_b','truth B')]) },
    ])['named:x'],
    // (b) same id, conflicting truths → neither kept
    conflict: merge([
      { providerId:'seed',         index: rec([F('f_a','truth A')]) },
      { providerId:'relationship', index: rec([F('f_a','a DIFFERENT truth')]) },
    ])['named:x'],
    // (c) a third provider cannot resurrect the conflicted id
    resurrect: merge([
      { providerId:'seed',         index: rec([F('f_a','truth A')]) },
      { providerId:'relationship', index: rec([F('f_a','a DIFFERENT truth')]) },
      { providerId:'emergent',     index: rec([F('f_a','yet another truth')]) },
    ])['named:x'],
    // (d) same id, identical truth → deduped once, all provenance retained
    identical: merge([
      { providerId:'seed',         index: rec([F('f_a','truth A')]) },
      { providerId:'relationship', index: rec([F('f_a','truth A')]) },
    ])['named:x'],
    // (e) incompatible identity metadata for one canonical id → visible failure
    identity: merge([
      { providerId:'seed',         index: rec([F('f_a','truth A')], 'Seren') },
      { providerId:'relationship', index: rec([F('f_b','truth B')], 'Someone Else') },
    ])['named:x'],
  };
});

console.log('');
t('7a: distinct facet ids from two providers are BOTH retained',
  M.distinct.facets.length === 2, JSON.stringify(M.distinct.facets.map(f => f.facet_id)));
t('7b: …each stamped with the provider that supplied it',
  M.distinct.facets.find(f => f.facet_id === 'f_a').provider === 'seed' &&
  M.distinct.facets.find(f => f.facet_id === 'f_b').provider === 'relationship',
  JSON.stringify(M.distinct.facets.map(f => [f.facet_id, f.provider])));
t('7c: one facet id defined two different ways → NEITHER is retained',
  M.conflict.facets.length === 0, JSON.stringify(M.conflict.facets.map(f => [f.facet_id, f.canonical_truth])));
t('7d: a THIRD provider cannot resurrect the conflicted id',
  M.resurrect.facets.length === 0, JSON.stringify(M.resurrect.facets.map(f => [f.facet_id, f.provider])));
t('7e: an identical definition from two providers dedupes to ONE facet',
  M.identical.facets.length === 1, JSON.stringify(M.identical.facets.map(f => f.facet_id)));
t('7f: …retaining BOTH sources as provenance',
  (M.identical.facets[0].sources || []).includes('seed') &&
  (M.identical.facets[0].sources || []).includes('relationship'),
  JSON.stringify(M.identical.facets[0].sources));
t('7g: incompatible identity metadata for one canonical id FAILS VISIBLY',
  M.identity.identity_conflict === true && M.identity.facets.length === 0,
  JSON.stringify({ conflict: M.identity.identity_conflict, label: M.identity.label,
                   facets: M.identity.facets.length }));

await browser.close();
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
