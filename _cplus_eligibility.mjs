// C+ ELIGIBILITY SELECTOR — free, no model calls. WHO this scene gives an opportunity to.
//
// Decision ONE of three. It answers only "whom could this scene honestly reveal?" — never
// "is there a facet for them" (decision two, _facetSourceCoverage) and never "who gets the
// beat" (decision three, which does not exist). The two failures it exists between:
//   • requiring physical presence, which deletes the doctrine's own Waldorf concierge
//   • accepting mere cast membership, which licenses a beat invented from nothing
//
// usage: node _cplus_eligibility.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nC+ ELIGIBILITY — identity and mention mode, no facets, no assignment\n${'═'.repeat(88)}\n`);

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
    setting: 'The Waldorf lobby, late afternoon.',
    presentText: 'ILSE alone at the bar.',
    aboutToHappen: 'Bertram arrives to collect on the debt in front of everyone.',
    narratorLens: 'She has not stopped thinking about Margarethe since the funeral.',
    eventText: '"Not the Waldorf! Is that damned snooty concierge who mispronounces \'concierge\' going to be there?"',
  };
  const roster = [
    { label:'Bertram',    aliases:['Bertram'],    source:'story roster' },
    { label:'Margarethe', aliases:['Margarethe'], source:'story roster' },
    { label:'Otto',       aliases:['Otto'],       source:'story roster' },   // never mentioned
  ];
  const r1 = window._cPlusCandidateSet({ sceneNumber:1, stage, sceneText, roster });
  const r2 = window._cPlusCandidateSet({ sceneNumber:2, stage, sceneText, roster });
  const noScene = window._cPlusCandidateSet({ stage, sceneText, roster });
  // an offStage record with NO aliases: only its exact label can match
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
t('1b: …and his mode is REPORTED, read off the field that named him',
  W.byLabel['the concierge'] && W.byLabel['the concierge'].mode === 'REPORTED'
    && W.byLabel['the concierge'].evidence[0].field === 'eventText',
  JSON.stringify(W.byLabel['the concierge'] && W.byLabel['the concierge'].evidence));
t('1c: the evidence quotes the line that created the opportunity',
  /concierge/i.test((W.byLabel['the concierge'] || {}).evidence[0].excerpt || ''),
  JSON.stringify((W.byLabel['the concierge'] || {}).evidence));
t('1d: someone the imminent event names is ANTICIPATED',
  W.byLabel['Bertram'] && W.byLabel['Bertram'].mode === 'ANTICIPATED'
    && W.byLabel['Bertram'].evidence[0].field === 'aboutToHappen',
  JSON.stringify(W.byLabel['Bertram']));
t('1e: someone only the narrator\'s own framing holds is RECALLED',
  W.byLabel['Margarethe'] && W.byLabel['Margarethe'].mode === 'RECALLED'
    && W.byLabel['Margarethe'].evidence[0].field === 'narratorLens',
  JSON.stringify(W.byLabel['Margarethe']));
t('1f: a roster member the scene never mentions is DECLINED, not a candidate',
  !W.byLabel['Otto'] && W.r1.declined.some(d => d.label === 'Otto' && /membership is not an opportunity/.test(d.reason)),
  JSON.stringify(W.r1.declined));
t('1f2: …and the decline is the ONLY thing separating him from the concierge — both are absent',
  W.r1.absentCandidateCount === 3 && W.r1.declined.length === 1,
  JSON.stringify({ absent: W.r1.absentCandidateCount, declined: W.r1.declined.length }));
t('1g: an offStage record with no authored aliases matches only its exact label',
  W.bare.ok && W.bare.candidates.length === 0 && W.bare.declined.length === 1,
  'a bare label must not be silently expanded into aliases — that is invention, not resolution');
t('1h: all four modes are recognised in one scene',
  ['IN_PERSON','ANTICIPATED','RECALLED','REPORTED'].every(m => W.r1.modeCounts[m] >= 1),
  JSON.stringify(W.r1.modeCounts));
t('1i: no scene number is a FAULT, never an assumed scene 1',
  W.noScene.ok === false && /scene number/i.test(W.noScene.fault || ''),
  JSON.stringify(W.noScene.fault));

// ── PC OWNERSHIP — a Scene-1 rule, not a fact about her ──
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
// 3 · THREE DECISIONS, THREE OWNERS — the selector must not do the other two
// ══════════════════════════════════════════════════════════════════════════════════════
t('3a: no candidate carries a facet — eligibility never consults the facet index',
  W.r1.candidates.every(c => !('facets' in c) && !('facet_id' in c) && !('canonical_truth' in c)),
  JSON.stringify(Object.keys(W.r1.candidates[0])));
t('3b: no candidate carries prose or an assignment',
  W.r1.candidates.every(c => !('angle' in c) && !('beat' in c) && !('assigned' in c)),
  JSON.stringify(Object.keys(W.r1.candidates[0])));

// ══════════════════════════════════════════════════════════════════════════════════════
// 4 · THE LIVE ADAPTER on the real First Sacrifice seed
// ══════════════════════════════════════════════════════════════════════════════════════
const L = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { _starterId:'starter_first_sacrifice', is_starter_story:true,
    playerName:'the one who carries the story', name:'Lirael', loveInterestName:'Julian' });
  const live = window._cPlusEligibleCandidates(s, { sceneNumber: 1 });
  const scene14 = window._cPlusEligibleCandidates(s, { sceneNumber: 14 });
  const noNumber = window._cPlusEligibleCandidates(s, {});
  // DECISION TWO, as a SEPARATE call taking decision one's output.
  const cov1  = window._facetSourceCoverage(live.candidates, s, { sceneNumber: 1 });
  const cov14 = window._facetSourceCoverage(live.candidates, s, { sceneNumber: 14 });
  return { live, scene14, noNumber, cov1, cov14,
           labels: (live.candidates || []).map(c => [c.label, c.mode, c.ownedBy]) };
});

console.log('');
t('4a: the real Scene-1 stage resolves to a candidate set',
  L.live.ok === true && L.live.candidates.length >= 4, JSON.stringify(L.live.fault || L.labels));
t('4b: Seren, Julian and the presiding Dohkar are all present candidates',
  ['Seren','Julian','the presiding Dohkar'].every(n =>
    L.live.candidates.some(c => c.label === n && c.mode === 'IN_PERSON')),
  JSON.stringify(L.labels));
t('4c: the PC resolves under the kernel placeholder and is owned by pc_opening_fusion',
  L.live.candidates.some(c => c.kind === 'pc' && c.label === 'Lirael'
    && c.ownedBy === 'pc_opening_fusion'), JSON.stringify(L.labels));
t('4d: a later scene REFUSES rather than approximating a stage from the roster',
  L.scene14.ok === false && /no authoritative stage source/.test(L.scene14.fault || ''),
  JSON.stringify(L.scene14.fault));
t('4e: the adapter demands a scene number too',
  L.noNumber.ok === false && /scene number/i.test(L.noNumber.fault || ''),
  JSON.stringify(L.noNumber.fault));

t('5a: coverage is a SECOND call that consumes the candidate set',
  L.cov1.candidateSetSupplied === true && L.cov1.candidateCount === L.live.candidates.length,
  JSON.stringify({ supplied: L.cov1.candidateSetSupplied, n: L.cov1.candidateCount }));
t('5b: every Scene-1 candidate has an authored facet today',
  L.cov1.coveredCount === L.cov1.candidateCount && L.cov1.uncovered.length === 0,
  JSON.stringify(L.cov1.uncovered));
t('5c: the scene number REACHES the facet index — at scene 14 the Dohkar is uncovered',
  L.cov14.uncovered.includes('the presiding Dohkar'),
  JSON.stringify(L.cov14.uncovered));
t('5d: failing closed is STILL hard-disabled — a selector existing does not authorise it',
  L.cov1.safeToFailClosed === false && !!L.cov1.failClosedBlockedBy,
  JSON.stringify(L.cov1.failClosedBlockedBy));

await browser.close();
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
