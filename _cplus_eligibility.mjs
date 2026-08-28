// C+ ELIGIBILITY SELECTOR — free, no model calls. WHO this scene gives an opportunity to.
//
// Decision ONE of three. It answers only "whom could this scene honestly reveal?" — never
// "is there a facet for them" (decision two, _facetSourceCoverage) and never "who gets the
// beat, in which mode" (decision three, which does not exist). The failures it sits between:
//   • requiring physical presence, which deletes the doctrine's own Waldorf concierge
//   • accepting mere cast membership, which licenses a beat invented from nothing
//   • guessing identity or delivery mode, which hands one person's psychology to another
//
// usage: node _cplus_eligibility.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nC+ ELIGIBILITY — identity and mention opportunities, no facets, no assignment\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
await page.route('**/api/**', r => PASSTHROUGH.test(r.request().url()) ? r.continue() : r.abort());
await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await page.waitForFunction(() => window._cPlusCandidateSet && window._cPlusEligibleCandidates
  && window._facetSourceCoverage && window.STARTER_SEEDS, { timeout:120000 });

// ══════════════════════════════════════════════════════════════════════════════════════
// 1 · THE WALDORF FIXTURE — the doctrine's own case, driven through the PURE selector
// "Not the Waldorf! Is that damned snooty concierge who mispronounces 'concierge' going to
// be there?" — one line, and we have the concierge. NOBODY HAD TO BE IN THE ROOM.
// ══════════════════════════════════════════════════════════════════════════════════════
const W = await page.evaluate(() => {
  const stage = {
    onStage: [{ id:'pc:ilse', label:'Ilse', kind:'pc', presence:'IN_PERSON', aliases:['Ilse'],
                source:'identity:state.name' }],
    // NOTE: stage.offStage records carry no aliases today — the selector uses the label
    // verbatim. This fixture supplies them explicitly to drive the alias path; 1g pins the
    // unaliased behaviour so the limitation is recorded rather than assumed away.
    offStage: [{ name:'the concierge', aliases:['the concierge','concierge'],
                 reason:'named in the scene mission, never staged — mention is not presence' }],
  };
  const sceneText = {
    setting: 'The Waldorf lobby, late afternoon. Otto\'s portrait still hangs over the bar.',
    presentText: 'ILSE alone at the bar.',
    aboutToHappen: 'Bertram arrives to collect on the debt in front of everyone, and Margarethe\'s name will come up.',
    narratorLens: 'She has not stopped thinking about Margarethe since the funeral.',
    eventText: '"Not the Waldorf! Is that damned snooty concierge who mispronounces \'concierge\' going to be there?"',
  };
  const roster = [
    { label:'Bertram',    aliases:['Bertram'],    source:'story roster' },   // aboutToHappen only
    { label:'Margarethe', aliases:['Margarethe'], source:'story roster' },   // aboutToHappen + narratorLens
    { label:'Otto',       aliases:['Otto'],       source:'story roster' },   // setting only
    { label:'Klaus',      aliases:['Klaus'],      source:'story roster' },   // never mentioned
  ];
  const r1 = window._cPlusCandidateSet({ sceneNumber:1, stage, sceneText, roster });
  const r2 = window._cPlusCandidateSet({ sceneNumber:2, stage, sceneText, roster });
  const noScene = window._cPlusCandidateSet({ stage, sceneText, roster });
  const bare = window._cPlusCandidateSet({ sceneNumber:1,
    stage: { onStage:[], offStage:[{ name:'the concierge', reason:'x' }] },
    sceneText, roster:[] });
  const byLabel = {};
  (r1.candidates || []).forEach(c => { byLabel[c.label] = c; });
  return { r1, r2, noScene, bare, byLabel };
});

t('1a: the concierge is a CANDIDATE though nobody put him in the room',
  !!W.byLabel['the concierge'] && W.byLabel['the concierge'].presenceStated === false,
  JSON.stringify(Object.keys(W.byLabel)));
t('1b: …his mode is REPORTED, read off the field that named him',
  W.byLabel['the concierge'] && W.byLabel['the concierge'].mode === 'REPORTED'
    && W.byLabel['the concierge'].opportunities[0].field === 'eventText',
  JSON.stringify(W.byLabel['the concierge'] && W.byLabel['the concierge'].opportunities));
t('1c: the evidence quotes the line that created the opportunity',
  /concierge/i.test((W.byLabel['the concierge'] || {}).opportunities[0].excerpt || ''),
  JSON.stringify((W.byLabel['the concierge'] || {}).opportunities));
t('1d: someone only the imminent event names is ANTICIPATED',
  W.byLabel['Bertram'] && W.byLabel['Bertram'].mode === 'ANTICIPATED',
  JSON.stringify(W.byLabel['Bertram']));
t('1e: someone only the setting names is REPORTED',
  W.byLabel['Otto'] && W.byLabel['Otto'].mode === 'REPORTED',
  JSON.stringify(W.byLabel['Otto']));
t('1f: a roster member the scene never mentions is DECLINED, not a candidate',
  !W.byLabel['Klaus'] && W.r1.declined.some(d => d.label === 'Klaus' && /membership is not an opportunity/.test(d.reason)),
  JSON.stringify(W.r1.declined));
t('1f2: …and the mention is the ONLY thing separating him from the concierge — both are absent',
  W.r1.absentCandidateCount === 4 && W.r1.declined.length === 1,
  JSON.stringify({ absent: W.r1.absentCandidateCount, declined: W.r1.declined }));
t('1g: an offStage record with no authored aliases matches only its exact label',
  W.bare.ok && W.bare.candidates.length === 0 && W.bare.declined.length === 1,
  'a bare label must not be silently expanded into aliases — that is invention, not resolution');
t('1h: all four modes are recognised in one scene',
  ['IN_PERSON','ANTICIPATED','RECALLED','REPORTED'].every(m => W.r1.modeOpportunityCounts[m] >= 1),
  JSON.stringify(W.r1.modeOpportunityCounts));
t('1i: no scene number is a FAULT, never an assumed scene 1',
  W.noScene.ok === false && /scene number/i.test(W.noScene.fault || ''),
  JSON.stringify(W.noScene.fault));

// ── PC OWNERSHIP — a Scene-1 rule, not a fact about her ──
console.log('');
t('2a: in Scene 1 the PC is ELIGIBLE but owned by pc_opening_fusion',
  W.byLabel['Ilse'] && W.byLabel['Ilse'].ownedBy === 'pc_opening_fusion'
    && W.byLabel['Ilse'].availableForOrdinaryCPlus === false,
  JSON.stringify(W.byLabel['Ilse']));
t('2b: …she is IN the candidate set, not deleted from it',
  W.r1.candidates.some(c => c.kind === 'pc'),
  'excluding her entirely would encode "never a C+ recipient" instead of "her Scene-1 beat is owned"');
t('2c: in scene 2 nothing owns her beat — she is an ordinary candidate',
  W.r2.candidates.filter(c => c.kind === 'pc')[0].ownedBy === null
    && W.r2.candidates.filter(c => c.kind === 'pc')[0].availableForOrdinaryCPlus === true,
  JSON.stringify(W.r2.candidates.filter(c => c.kind === 'pc')[0]));
t('2d: the ownership exclusion states its reason',
  /pc_opening_fusion/.test((W.byLabel['Ilse'] || {}).ownershipReason || ''),
  JSON.stringify((W.byLabel['Ilse'] || {}).ownershipReason));

// ══════════════════════════════════════════════════════════════════════════════════════
// 3 · EVERY OPPORTUNITY, NOT THE FIRST ONE
// Ranking ANTICIPATED over RECALLED over REPORTED was an invented precedence that made a
// delivery decision belonging to assignment. Eligibility returns all of them.
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('');
t('3a: someone the scene can reach two ways carries BOTH opportunities',
  W.byLabel['Margarethe'] && W.byLabel['Margarethe'].opportunities.length === 2
    && W.byLabel['Margarethe'].availableModes.join('|') === 'ANTICIPATED|RECALLED',
  JSON.stringify(W.byLabel['Margarethe'] && W.byLabel['Margarethe'].opportunities.map(o => o.field)));
t('3b: …and her single `mode` is UNRESOLVED — the choice belongs to assignment',
  W.byLabel['Margarethe'] && W.byLabel['Margarethe'].mode === null
    && W.byLabel['Margarethe'].modeStatus === 'unresolved-multiple',
  JSON.stringify({ mode: W.byLabel['Margarethe'] && W.byLabel['Margarethe'].mode,
                   status: W.byLabel['Margarethe'] && W.byLabel['Margarethe'].modeStatus }));
t('3c: exactly one mode DOES resolve — nothing to choose, nothing deferred',
  W.byLabel['Bertram'].modeStatus === 'single' && W.byLabel['Bertram'].mode === 'ANTICIPATED',
  JSON.stringify(W.byLabel['Bertram']));
t('3d: a staged person keeps IN_PERSON as an embodied STATE, not one option among many',
  W.byLabel['Ilse'].mode === 'IN_PERSON' && W.byLabel['Ilse'].modeStatus === 'stated'
    && W.byLabel['Ilse'].availableModes.join('|') === 'IN_PERSON',
  JSON.stringify(W.byLabel['Ilse'].availableModes));

const O = await page.evaluate(() => {
  // two opportunities, ONE mode: multiplicity is not the same as ambiguity
  return window._cPlusCandidateSet({ sceneNumber: 1,
    stage: { onStage: [], offStage: [] },
    sceneText: { setting: 'Otto\'s portrait over the bar.', eventText: 'Somebody asks about Otto.' },
    roster: [{ label: 'Otto', aliases: ['Otto'] }] }).candidates[0];
});
t('3e: two opportunities of the SAME mode still resolve to that one mode',
  O.opportunities.length === 2 && O.availableModes.join('|') === 'REPORTED'
    && O.mode === 'REPORTED' && O.modeStatus === 'single',
  JSON.stringify({ opps: O.opportunities.map(o => o.field), modes: O.availableModes, mode: O.mode }));

// ══════════════════════════════════════════════════════════════════════════════════════
// 4 · CANONICAL IDENTITY — supplied ids are preserved, collisions fail closed
// ══════════════════════════════════════════════════════════════════════════════════════
const I = await page.evaluate(() => {
  const sceneText = { aboutToHappen: 'The Dohkar will be asked to rule, and One and Two will both speak.' };
  // (a) the SAME canonical id arriving from two sources
  const mergedRes = window._cPlusCandidateSet({ sceneNumber: 1,
    stage: { onStage: [], offStage: [{ id:'role:first_sacrifice_presiding_dohkar', kind:'role',
                                       name:'the presiding Dohkar', aliases:['Dohkar'],
                                       reason:'set aside by the stage contract' }] },
    sceneText,
    roster: [{ id:'role:first_sacrifice_presiding_dohkar', kind:'role',
               label:'the presiding Dohkar', aliases:['presiding Dohkar'], source:'seed.roleInstances' }] });
  // (b) TWO canonical ids sharing an alias
  const clash = window._cPlusCandidateSet({ sceneNumber: 1,
    stage: { onStage: [], offStage: [{ id:'named:one', name:'One', aliases:['One','Shared'] }] },
    sceneText,
    roster: [{ id:'named:two', label:'Two', aliases:['Two','Shared'] }] });
  // (c) a staged record and a roster record that are the SAME id — one candidate, no conflict
  const sameAsStaged = window._cPlusCandidateSet({ sceneNumber: 1,
    stage: { onStage: [{ id:'named:julian', label:'Julian', kind:'named', aliases:['Julian'] }], offStage: [] },
    sceneText: { aboutToHappen: 'Julian says nothing.' },
    roster: [{ id:'named:julian', label:'Julian', aliases:['Julian'] }] });
  // (d) one id, two kinds
  const kindClash = window._cPlusCandidateSet({ sceneNumber: 1,
    stage: { onStage: [], offStage: [{ id:'named:x', kind:'named', name:'X', aliases:['X'] }] },
    sceneText: { aboutToHappen: 'X will be mentioned.' },
    roster: [{ id:'named:x', kind:'role', label:'X', aliases:['X'] }] });
  return { mergedRes, clash, sameAsStaged, kindClash };
});

console.log('');
t('4a: the same canonical id from offStage and roster is ONE merged candidate',
  I.mergedRes.candidates.length === 1 && I.mergedRes.candidates[0].id === 'role:first_sacrifice_presiding_dohkar',
  JSON.stringify(I.mergedRes.candidates.map(c => c.id)));
t('4b: …the supplied role-instance id survives UNCHANGED, never re-derived from the label',
  I.mergedRes.candidates[0].id === 'role:first_sacrifice_presiding_dohkar'
    && I.mergedRes.candidates[0].identityStatus === 'canonical',
  JSON.stringify({ id: I.mergedRes.candidates[0].id, status: I.mergedRes.candidates[0].identityStatus }));
t('4b2: …a label-derived id would have been role:the_presiding_dohkar — the test is not vacuous',
  I.mergedRes.candidates[0].id !== 'role:the_presiding_dohkar');
t('4c: …and the merge unions the aliases both sources carried',
  ['the presiding Dohkar','Dohkar','presiding Dohkar'].every(a => I.mergedRes.candidates[0].aliases.includes(a)),
  JSON.stringify(I.mergedRes.candidates[0].aliases));
t('4d: two canonical ids sharing an alias — NEITHER silently wins',
  I.clash.candidates.length === 0 && I.clash.declined.length === 2
    && I.clash.declined.every(d => /ambiguous identity/.test(d.reason)),
  JSON.stringify({ candidates: I.clash.candidates.map(c => c.id), declined: I.clash.declined }));
t('4d2: …and the collision is reported, not merely swallowed',
  I.clash.aliasConflicts.some(c => c.alias === 'shared' && c.ids.length === 2),
  JSON.stringify(I.clash.aliasConflicts));
t('4e: a roster record naming someone already staged is that person — one candidate, no conflict',
  I.sameAsStaged.candidates.length === 1 && I.sameAsStaged.candidates[0].presenceStated === true
    && I.sameAsStaged.aliasConflicts.length === 0,
  JSON.stringify({ n: I.sameAsStaged.candidates.length, conflicts: I.sameAsStaged.aliasConflicts }));
t('4f: one canonical id described as two KINDS is declined, not resolved by arrival order',
  I.kindClash.candidates.length === 0 && /role and named|named and role/.test(I.kindClash.declined[0].reason),
  JSON.stringify(I.kindClash.declined));
t('4g: a label-derived id is explicitly UNRESOLVED, never described as canonical',
  W.byLabel['the concierge'].identityStatus === 'unresolved'
    && W.byLabel['the concierge'].idSource === 'derived-from-label',
  JSON.stringify({ id: W.byLabel['the concierge'].id,
                   status: W.byLabel['the concierge'].identityStatus }));

// ══════════════════════════════════════════════════════════════════════════════════════
// 5 · THREE DECISIONS, THREE OWNERS
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('');
t('5a: no candidate carries a facet — eligibility never consults the facet index',
  W.r1.candidates.every(c => !('facets' in c) && !('facet_id' in c) && !('canonical_truth' in c)),
  JSON.stringify(Object.keys(W.r1.candidates[0])));
t('5b: no candidate carries prose or an assignment',
  W.r1.candidates.every(c => !('angle' in c) && !('beat' in c) && !('assigned' in c)),
  JSON.stringify(Object.keys(W.r1.candidates[0])));

// ══════════════════════════════════════════════════════════════════════════════════════
// 6 · THE LIVE ADAPTER on the real First Sacrifice seed
// ══════════════════════════════════════════════════════════════════════════════════════
const L = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { _starterId:'starter_first_sacrifice', is_starter_story:true,
    playerName:'the one who carries the story', name:'Lirael', loveInterestName:'Julian' });
  const live = window._cPlusEligibleCandidates(s, { sceneNumber: 1 });
  const scene14 = window._cPlusEligibleCandidates(s, { sceneNumber: 14 });
  const noNumber = window._cPlusEligibleCandidates(s, {});
  const cov1  = window._facetSourceCoverage(live.candidates, s, { sceneNumber: 1 });
  const cov14 = window._facetSourceCoverage(live.candidates, s, { sceneNumber: 14 });
  // ── WHAT THE SCENE NUMBER STILL GOVERNS (2026-08-28) ──
  // It no longer decides whether a person HAS psychology — only whether a bare profession word
  // is allowed to name him. So the wiring proof needs both records: one carrying the canonical
  // role_instance_id, one carrying only the word.
  const aliasOnly = [{ id: 'role:the_presiding_dohkar', label: 'the presiding Dohkar',
                       kind: 'role', aliases: ['Dohkar', 'the presiding Dohkar'] }];
  const canonical = [{ id: 'role:first_sacrifice_presiding_dohkar', label: 'the presiding Dohkar',
                       kind: 'role', aliases: ['Dohkar', 'the presiding Dohkar'] }];
  const covAlias14  = window._facetSourceCoverage(aliasOnly, s, { sceneNumber: 14 });
  const covAlias1   = window._facetSourceCoverage(aliasOnly, s, { sceneNumber: 1 });
  const covCanon14  = window._facetSourceCoverage(canonical, s, { sceneNumber: 14 });
  const liveDohkar  = (live.candidates || []).filter(c => /Dohkar/i.test(c.label || ''))[0] || null;
  // THE OWNERSHIP FIXTURE: strip the PC's facets and nobody else's. Ordinary coverage must not
  // notice — her Scene-1 beat was never an ordinary assignment's to make.
  const pc = window.STARTER_SEEDS.starter_first_sacrifice.cast.find(c => c.role === 'PC');
  const keep = pc.cPlusFacets;
  pc.cPlusFacets = [];
  const liveNoPc = window._cPlusEligibleCandidates(s, { sceneNumber: 1 });
  const covNoPc = window._facetSourceCoverage(liveNoPc.candidates, s, { sceneNumber: 1 });
  pc.cPlusFacets = keep;
  return { live, scene14, noNumber, cov1, cov14, covNoPc,
           covAlias14, covAlias1, covCanon14, liveDohkar,
           labels: (live.candidates || []).map(c => [c.label, c.mode, c.ownedBy]) };
});

console.log('');
t('6a: the real Scene-1 stage resolves to a candidate set',
  L.live.ok === true && L.live.candidates.length >= 4, JSON.stringify(L.live.fault || L.labels));
t('6b: Seren, Julian and the presiding Dohkar are all present candidates',
  ['Seren','Julian','the presiding Dohkar'].every(n =>
    L.live.candidates.some(c => c.label === n && c.mode === 'IN_PERSON')),
  JSON.stringify(L.labels));
t('6c: the PC resolves under the kernel placeholder and is owned by pc_opening_fusion',
  L.live.candidates.some(c => c.kind === 'pc' && c.label === 'Lirael'
    && c.ownedBy === 'pc_opening_fusion'), JSON.stringify(L.labels));
t('6c2: the roster does not duplicate the people the stage already carries',
  L.live.candidates.length === 4 && L.live.aliasConflicts.length === 0,
  JSON.stringify({ n: L.live.candidates.length, conflicts: L.live.aliasConflicts }));
t('6d: a later scene REFUSES rather than approximating a stage from the roster',
  L.scene14.ok === false && /no authoritative stage source/.test(L.scene14.fault || ''),
  JSON.stringify(L.scene14.fault));
t('6e: the adapter demands a scene number too',
  L.noNumber.ok === false && /scene number/i.test(L.noNumber.fault || ''),
  JSON.stringify(L.noNumber.fault));

// ══════════════════════════════════════════════════════════════════════════════════════
// 7 · COVERAGE MEASURES TWO POPULATIONS, AND ONLY ONE COULD EVER GATE A BEAT
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('');
t('7a: coverage is a SECOND call that consumes the candidate set',
  L.cov1.candidateSetSupplied === true && L.cov1.candidateCount === L.live.candidates.length,
  JSON.stringify({ supplied: L.cov1.candidateSetSupplied, n: L.cov1.candidateCount }));
t('7b: it reports BOTH populations explicitly',
  typeof L.cov1.candidateCount === 'number' && typeof L.cov1.ordinaryCount === 'number'
    && Array.isArray(L.cov1.uncovered) && Array.isArray(L.cov1.ordinaryUncovered),
  JSON.stringify({ all: L.cov1.candidateCount, ordinary: L.cov1.ordinaryCount }));
t('7c: the ownership-excluded PC is in the ACCOUNTING population, not the ordinary one',
  L.cov1.candidateCount === L.cov1.ordinaryCount + 1
    && L.cov1.ownershipExcluded.length === 1
    && L.cov1.ownershipExcluded[0].ownedBy === 'pc_opening_fusion',
  JSON.stringify(L.cov1.ownershipExcluded));
t('7d: every Scene-1 candidate has an authored facet today',
  L.cov1.coveredCount === L.cov1.candidateCount && L.cov1.uncovered.length === 0,
  JSON.stringify(L.cov1.uncovered));
t('7e: THE OWNERSHIP FIXTURE — the PC has no facet, every ordinary recipient does',
  L.covNoPc.uncovered.length === 1 && L.covNoPc.uncovered[0] === 'Lirael',
  JSON.stringify(L.covNoPc.uncovered));
t('7f: …and ordinary coverage does NOT fail — nothing ordinary was going to ask her',
  L.covNoPc.ordinaryUncovered.length === 0
    && L.covNoPc.ordinaryCoveredCount === L.covNoPc.ordinaryCount,
  JSON.stringify({ ordinaryUncovered: L.covNoPc.ordinaryUncovered,
                   covered: L.covNoPc.ordinaryCoveredCount, of: L.covNoPc.ordinaryCount }));
// ── 7g SPLIT (2026-08-28) ── It used to read "at scene 14 the Dohkar is uncovered", which
// asserted that a returning character LOSES his psychology. That is the bug, not the contract.
// What the scene number governs is ALIAS SCOPE, so the wiring proof is now stated on the record
// where the alias is all there is — and the canonical record proves the other half.
t('7g: the scene number REACHES the resolver — a bare PROFESSION WORD is uncovered at scene 14',
  L.covAlias14.uncovered.includes('the presiding Dohkar'),
  JSON.stringify(L.covAlias14.uncovered));
t('7g2: …and the same alias IS covered inside its authored scene',
  L.covAlias1.uncovered.length === 0, JSON.stringify(L.covAlias1.uncovered));
t('7g3: the SAME MAN by canonical role_instance_id keeps his portfolio at scene 14',
  L.covCanon14.uncovered.length === 0, JSON.stringify(L.covCanon14.uncovered));
t('7g4: the LIVE candidate builder stamps the authored identity, not a slug of the sentence',
  !!L.liveDohkar && L.liveDohkar.id === 'role:first_sacrifice_presiding_dohkar'
    && L.liveDohkar.role_instance_id === 'first_sacrifice_presiding_dohkar',
  JSON.stringify(L.liveDohkar && { id: L.liveDohkar.id, rid: L.liveDohkar.role_instance_id }));
t('7h: failing closed is STILL hard-disabled — a selector existing does not authorise it',
  L.cov1.safeToFailClosed === false && !!L.cov1.failClosedBlockedBy,
  JSON.stringify(L.cov1.failClosedBlockedBy));

await browser.close();
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
