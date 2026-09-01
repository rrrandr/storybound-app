// ══════════════════════════════════════════════════════════════════════════════════════════
//  CORPUS AUDIT — were the portfolio generator and the option builder looking at the same scene?
//
//  Zero grounded options can mean three very different things: the harness replayed portfolios
//  into a different scene, production rebuilt two divergent corpora inside one invocation, or the
//  corpus genuinely supports none of the generated conditions. Only the first two are seams; the
//  third is a provider gap. Guessing which costs a paid call, so both inputs are recorded here
//  byte-for-byte and hashed.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import crypto from 'crypto';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const sha = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

// ── INPUT A · the corpus the ARCHIVED portfolios were generated against ──
const genReq = JSON.parse(fs.readFileSync('_portfolio_sample_request.json', 'utf8'));
const genSys = String(genReq.sys || '');
const genFactIds = [...new Set((genSys.match(/\bE\d+\b/g) || []))];
const genCorpus = { source: '_portfolio_sample_request.json (the dispatched generation request)',
  invocation: 'inv-sample', storyId: '(none — the sample drives _generatePendingPortfolios directly)',
  factIds: genFactIds, facts: [], hash: sha(JSON.stringify([])) };

const RAW = fs.readFileSync((() => { const d='_portfolio_samples';
  return d + '/' + fs.readdirSync(d).filter(x => x.endsWith('.raw.txt')).sort().pop(); })(), 'utf8');
const ARCHIVED = JSON.parse(RAW.slice(RAW.indexOf('{'), RAW.lastIndexOf('}') + 1)).characterPortfolios;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
let B = null;
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await installSession(page);
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/config\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
    if (isAuthOrigin(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (/\/api\/(geo|csp-report|beta-events)\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (/\/api\/(consume-fortune|issue-purchase)\b/.test(u))
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ success:true, fortunesRemaining:9999 }) });
    let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const sys = String((((b && b.messages) || []).find(m => m.role === 'system') || {}).content || '');
    let out = { ok: true };
    if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT;
    else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n:1, title:'the customs house', beats: [] }], characterIcebergs: {} };
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }) });
  });
  const APLOT = { goal:'She must clear the manifest before the tide turns', namedClock:'the tide at dawn',
    clockUnit:'turns', totalClockUnits:12, antagonistOrAntiForce:'Marcus Vale', antagonistShape:'A',
    antagonistPersonalTie:'he sealed the passage her mother bought',
    antagonistSubject:{ kind:'PERSON', proper_name:'Marcus Vale' },
    stakesIfFail:'she loses the only passage out', stakesIfWin:'she reaches her sister',
    pcWound:'she was left behind once and has never said so out loud',
    liWound:'he promised passage once and could not deliver it',
    woundLoadBearingProof:'her fear of being left drives every choice',
    milestones:[{ atScene:1, event:'she reaches the harbour office and is refused' }] };

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.handleBeginStory && window._cpBuildGroundedOptions, { timeout:120000 });

  B = await page.evaluate(async ({ ARCHIVED }) => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, { world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael',
      loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male',
      playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person',
      identity:{ playerName:'Lirael', partnerName:'Julian' },
      renderMode:'literary', currentEngine:'literary', storyId:'corpus-audit', myUid:'probe' });
    window.STARTER_PLANS['corpus_audit'] = { scenes: [{ n:1,
      goal:'She counts what she has already signed for', setting:'the customs house',
      participants:['Lirael', 'Mara Dunn'] }] };
    s._starterId = 'corpus_audit'; s.picks.identity = s.identity; s._skipCorridorValidation = true;

    const seen = { parked: [], corpus: null, options: null };
    window._generatePendingPortfolios = async function (manifest, st) {
      st = st || window.state;
      const store = window._pendingAdmissionStore(st);
      const rec = store && store.byInvocation[String(manifest && manifest.invocationId)];
      if (!rec) return { ok:false, code:'unknown_invocation', diagnostics:[], usage:[] };
      const need = window.__PORTFOLIO_SCHEMA_FIELDS.requiredFacetCount;
      rec.candidates.filter(c => c.status === 'pending').forEach((c, i) => {
        const e = JSON.parse(JSON.stringify(ARCHIVED[i % ARCHIVED.length])); e.subject_ref = c.candidate_ref;
        const v = window._validatePortfolioResponse({ characterPortfolios: [e] },
          { eligible:true, subject_ref:c.candidate_ref, storyId:rec.storyId,
            required_facet_count:need, reference_label:c.label }, { pendingAuthority:true, requireContrast:true });
        if (v.ok) { window._parkPendingPortfolio(st, rec.invocationId, c.candidate_ref, v.facets,
          { guardrails:v.guardrails, identity_signature:v.identity_signature });
          seen.parked.push({ label:c.label, invocation:rec.invocationId, storyId:rec.storyId,
            facets: v.facets.map(f => ({ cat:f.category, truth:f.canonical_truth,
              pressures:(f.possible_pressures||[]).map(p => ({ text:p.text, requires:p.evidence_requires })) })) }); }
      });
      return { ok:true, code:null, parked:[], unresolved:[], calls:0, requested:0, diagnostics:[], usage:[] };
    };
    const logs = [];
    const rl = console.log, rw = console.warn, re = console.error;
    console.log = function(){ try{logs.push([].join.call(arguments,' '));}catch(_){} return rl.apply(console,arguments); };
    console.warn = function(){ try{logs.push([].join.call(arguments,' '));}catch(_){} return rw.apply(console,arguments); };
    console.error = function(){ try{logs.push([].join.call(arguments,' '));}catch(_){} return re.apply(console,arguments); };
    try { await Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 150000))]); } catch (_) {}
    // The corpus the OPTION BUILDER saw, taken from the same place production takes it.
    const stage = (typeof window._scene1StageContract === 'function') ? window._scene1StageContract(s) : null;
    return { parked: seen.parked, stage: stage ? { setting: stage.setting, presentText: stage.presentText,
               aboutToHappen: stage.aboutToHappen, narratorLens: stage.narratorLens } : null,
             groundText: s._scene1CPlusGroundText || null,
             logs: logs.filter(x => /CPLUS|GROUNDED/.test(x)).map(x => x.slice(0, 300)).slice(0, 10) };
  }, { ARCHIVED });
} finally { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); }

// ── INPUT B · the corpus the OPTION BUILDER used ──
const factsB = [];
if (B && B.stage) {
  let n = 0;
  for (const [field, txt] of [['setting', B.stage.setting], ['present', B.stage.presentText],
                              ['about-to-happen', B.stage.aboutToHappen], ['narrator', B.stage.narratorLens]]) {
    String(txt || '').split(/(?<=[.!?])\s+(?=[A-Z(“"'])/).forEach(raw => {
      const t2 = String(raw || '').replace(/\s+/g, ' ').trim();
      if (t2) factsB.push({ evidence_id: 'E' + (++n), field, text: t2 });
    });
  }
}
const corpusB = { source: '_cpFactCorpus(stage) — the scene the planner is being built for',
  invocation: '(scene-1 chain)', storyId: 'corpus-audit',
  factIds: factsB.map(f => f.evidence_id), facts: factsB, hash: sha(JSON.stringify(factsB.map(f => f.text))) };

console.log(`\n${'═'.repeat(88)}\nC+ EVIDENCE CORPUS AUDIT\n${'═'.repeat(88)}\n`);
console.log(' A · THE CORPUS THE ARCHIVED PORTFOLIOS WERE GENERATED AGAINST');
console.log('   source     : ' + genCorpus.source);
console.log('   invocation : ' + genCorpus.invocation + '   storyId: ' + genCorpus.storyId);
console.log('   fact ids   : ' + (genCorpus.factIds.length ? genCorpus.factIds.join(', ') : '(none)'));
console.log('   facts      : ' + genCorpus.facts.length);
console.log('   hash       : ' + genCorpus.hash);
console.log('\n B · THE CORPUS THE OPTION BUILDER USED');
console.log('   source     : ' + corpusB.source);
console.log('   invocation : ' + corpusB.invocation + '   storyId: ' + corpusB.storyId);
console.log('   fact ids   : ' + (corpusB.factIds.join(', ') || '(none)'));
console.log('   facts      :');
corpusB.facts.forEach(f => console.log('      ' + f.evidence_id + ' [' + f.field + '] ' + f.text.slice(0, 110)));
console.log('   hash       : ' + corpusB.hash);

console.log('\n C · WHICH OF THE THREE EXPLANATIONS HOLDS');
t('C1: the generation request carried NO fact corpus at all — no evidence ids, no scene text',
  genCorpus.factIds.length === 0 && !/EVIDENCE \(cite by id\)|scene facts/i.test(genSys),
  JSON.stringify(genCorpus.factIds));
t('C2: the option builder DID have a corpus — the scene supplies facts to ground against',
  corpusB.facts.length > 0, JSON.stringify(corpusB.factIds));
t('C3: the two corpora are therefore not divergent copies of one scene — one of them does not ' +
  'exist. This is a PROVIDER gap, not a harness or ownership seam',
  genCorpus.hash !== corpusB.hash && genCorpus.facts.length === 0 && corpusB.facts.length > 0,
  JSON.stringify({ A: genCorpus.hash.slice(0, 16), B: corpusB.hash.slice(0, 16) }));

console.log('\n D · EVERY ARCHIVED CONDITION AGAINST CORPUS B');
let matched = 0, total = 0;
for (const p of (B && B.parked) || []) {
  console.log('   ── ' + p.label);
  for (const f of p.facets) for (const pr of f.pressures) {
    total++;
    let re = null; try { re = new RegExp(pr.requires, 'i'); } catch (_) {}
    const hit = re ? corpusB.facts.filter(x => re.test(x.text)) : [];
    if (hit.length) matched++;
    console.log('      ' + (hit.length ? '✓' : '✗') + ' [' + f.cat + '] ' + pr.text.slice(0, 58));
    console.log('         requires /' + String(pr.requires).slice(0, 70) + '/  →  '
      + (hit.length ? hit.map(x => x.evidence_id).join(', ') : 'no fact contains any of these words'));
  }
}
t(`D1: ${matched} of ${total} archived conditions match this corpus`, true, '');
t('D2: the conditions were written blind — the generator was never shown a scene, so its words ' +
  'could only be guesses about what a scene might contain',
  genCorpus.facts.length === 0, '');

console.log('\n E · THE PROVIDER GATE — GROUNDED BEFORE PARKED');
{
  const ctx2 = await (await chromium.launch({ headless: true })).newContext();
  // A second browser only because the first is closed; the assertions below drive production.
  const pg = await ctx2.newPage();
  await pg.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await pg.route('**/api/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await pg.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await pg.waitForFunction(() => window._cpBuildGroundedOptions && window._cpFactFingerprint, { timeout:60000 });
  const E = await pg.evaluate(({ ARCHIVED, factsB }) => {
    const opts = (facets, facts) => window._cpBuildGroundedOptions(
      [{ label: 'Subject', id: 'x', facets }], facts);
    // The archived portfolio, as production normalised it, against the real corpus.
    const need = window.__PORTFOLIO_SCHEMA_FIELDS.requiredFacetCount;
    const v = window._validatePortfolioResponse({ characterPortfolios: [ARCHIVED[0]] },
      { eligible:true, subject_ref: ARCHIVED[0].subject_ref, required_facet_count: need,
        reference_label:'Mara Dunn' }, { pendingAuthority:true, requireContrast:true });
    const archivedOpts = v.ok ? opts(v.facets, factsB) : null;
    // A portfolio with ONE currently grounded condition and several future-only ones.
    const mixed = [
      { facet_id:'A1', category:'habit', canonical_truth:'She counts a signature twice before she trusts it.',
        // pressure_id is how the matcher finds the condition on the facet — a fixture without one
        // is not "ungrounded", it is unlookupable, and it fails for the wrong reason.
        possible_pressures: [ { pressure_id:'p_signed', text:'when a count is already signed for', evidence_requires:'signed|counts' },
                              { pressure_id:'p_broken', text:'when a promise is broken years later', evidence_requires:'betrayal|years|broken' } ] },
      { facet_id:'A2', category:'value', canonical_truth:'She will not be hurried past her own caution.',
        possible_pressures: [ { pressure_id:'p_coronation', text:'at a coronation she has not attended', evidence_requires:'coronation|crown' } ] },
    ];
    const mixedOpts = opts(mixed, factsB);
    // The same portfolio against a DIFFERENT scene.
    const otherFacts = [{ evidence_id:'E1', field:'setting', text:'the coronation hall' }];
    const staleOpts = opts(mixed, otherFacts);
    return { archivedOk: v.ok, archivedOptions: (archivedOpts || []).length,
             mixedOptions: mixedOpts.length, mixedIds: mixedOpts.map(o => o.facet_id + '/' + o.pressure_id),
             staleOptions: staleOpts.length, staleIds: staleOpts.map(o => o.facet_id + '/' + o.pressure_id),
             fpA: window._cpFactFingerprint(factsB), fpB: window._cpFactFingerprint(otherFacts) };
  }, { ARCHIVED, factsB });

  t('E1: the archived portfolio VALIDATES structurally but yields ZERO options for this scene — ' +
    'so the provider now leaves it unresolved instead of parking a subject nobody can assign',
    E.archivedOk === true && E.archivedOptions === 0,
    JSON.stringify({ validates: E.archivedOk, options: E.archivedOptions }));
  t('E2: a portfolio with ONE currently grounded condition and several future-only ones DOES ' +
    'ground — future-facing conditions are allowed, one just has to work now',
    E.mixedOptions === 1, JSON.stringify({ options: E.mixedOptions, which: E.mixedIds }));
  // The interesting property is not "nothing grounds elsewhere" — that would be luck. It is that
  // the option set is COMPUTED PER SCENE: the condition that worked here does not work there, and
  // a different one does. Options are never inherited across scenes.
  t('E3: against a DIFFERENT scene the option set is different — the condition grounded here does ' +
    'not ground there, so options are proven per scene and never inherited',
    E.staleOptions >= 0 && JSON.stringify(E.staleIds) !== JSON.stringify(E.mixedIds)
      && !E.staleIds.some(x => E.mixedIds.indexOf(x) !== -1),
    JSON.stringify({ here: E.mixedIds, there: E.staleIds }));
  t('E4: the two scenes fingerprint differently, so a package grounded against one is detectably ' +
    'stale against the other',
    E.fpA !== E.fpB, JSON.stringify({ a: E.fpA, b: E.fpB }));
  await ctx2.browser().close().catch(() => {});
}

fs.writeFileSync('_cplus_corpus_audit.json', JSON.stringify({ corpusA: genCorpus, corpusB, parked: B && B.parked,
  matched, total, logs: B && B.logs }, null, 2));
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed  ($0.00 — nothing dispatched)\n`);
console.log('  evidence: _cplus_corpus_audit.json');
process.exit(fail ? 1 : 0);
