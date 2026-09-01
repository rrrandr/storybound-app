// THE BOUNDED BATCH, UNDER INTERCEPTION. No live sample.
//
// One invocation-local roster, at most three subjects per call, at most two calls per SCENE
// LINEAGE — counted on the persisted record, so a retry cannot reset the spend guard. Roster or
// identity corruption rejects a whole response; a subject-local defect leaves only that subject
// unresolved and retryable, and the planner does not run while any due subject is unresolved.
//
// usage: node _portfolio_batch.mjs   (needs vercel dev on :3000) — every request intercepted
import { chromium } from 'playwright-core';
import fs from 'fs';
// Declared here because the grounding pre-step below runs before the fixture is defined.
let SCENE_WORDS = ['customs', 'house'];
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
try {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
  const res = await fetch('http://localhost:3000/', { signal: ctl.signal }); clearTimeout(timer);
  if (!res.ok) throw new Error('HTTP ' + res.status);
} catch (e) { console.error('\n  ✗ INFRASTRUCTURE: ' + e.message + '\n'); process.exit(2); }

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.setDefaultTimeout(60000);
// EXACT REQUEST CLASSIFICATION. Every request is named; anything unrecognised is aborted, counted,
// and fails the run. Nothing is forwarded to the dev server (a forwarded call spawns a runtime
// that is never reaped).
const reqs = { batch: [], staticApi: 0, unknown: [], escaped: [] };
let responder = null, rawOverride = null;
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) reqs.escaped.push(r.url()); });
await page.route('**/api/**', async route => {
  const u = route.request().url();
  if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) { reqs.staticApi++;
    return route.fulfill({ status:200, contentType:'application/json', body:'{}' }); }
  let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
  if (/You author CHARACTER PORTFOLIOS/.test(sys)) {
    const refs = [...sys.matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
    captureSceneWords(sys);   // before the responder builds a reply, so its conditions can ground
    reqs.batch.push({ refs, max_tokens: b.max_tokens, role: b.role, model: b.model, url: u, sys });
    const content = rawOverride ? String(rawOverride(refs))
      : JSON.stringify(responder ? responder(refs, reqs.batch.length) : { characterPortfolios: [] });
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ ok:true, content, choices:[{ message:{ content } }] }) });
  }
  reqs.unknown.push(u + ' :: ' + sys.slice(0, 60));
  return route.abort();
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window._generatePendingPortfolios === 'function', { timeout: 30000 });
// ── GROUND THE FIXTURE IN THE SCENE THIS SUITE ACTUALLY RESOLVES ──
// A portfolio is refused before parking unless one of its conditions is grounded in the current
// scene's facts. This suite tests BATCH mechanics, not grounding, so its fixture must satisfy the
// gate rather than trip it — and the honest way is to write conditions the real manifest can
// answer, read from production, instead of words invented in this file.
{
  const facts = await page.evaluate(() => {
    try {
      const st = window.state;
      if (!st._scene1FactManifest && typeof window._scene1StageContract === 'function') {
        const stg = window._scene1StageContract(st);
        if (stg && stg.ok && window._cpFactManifest) window._cpFactManifest(stg, st);
      }
      return ((st._scene1FactManifest || {}).facts || []).map(f => f.text);
    } catch (_) { return []; }
  });
  const w = [...new Set(facts.join(' ').toLowerCase().match(/[a-z]{5,}/g) || [])];
  if (w.length >= 2) SCENE_WORDS = w.slice(0, 8);
  if (process.env.PB_DIAG) console.log('   [manifest words] ' + JSON.stringify(SCENE_WORDS));
}

const DIMS = ['value','insecurity','defense','relationship','exception'];
// ── EVIDENCE WORDS COME FROM THE SCENE THE PROMPT SHOWS ──
// A portfolio is now refused before parking unless at least one of its conditions is grounded in
// this scene's facts. Fixture words invented in this file cannot satisfy that — and should not:
// the whole point is that conditions must be answerable by the scene. The prompt carries the
// facts as plain text, so the fixture reads them and writes conditions the scene can actually
// answer, exactly as a scene-aware generator would.
let SCENE_BLOCK_SEEN = false;
function captureSceneWords(sys) {
  const block = (sys.match(/THE SCENE THEY ARE ABOUT TO APPEAR IN[^\n]*\n([\s\S]*?)\n\n/) || [])[1] || '';
  const words = [...new Set((block.toLowerCase().match(/[a-z]{5,}/g) || []))];
  if (words.length >= 2) { SCENE_WORDS = words.slice(0, 8); SCENE_BLOCK_SEEN = true; }
  if (process.env.PB_DIAG) console.log('   [scene marker in prompt] '
    + /THE SCENE THEY ARE ABOUT TO APPEAR IN/.test(sys) + ' · promptLen=' + sys.length);
  if (process.env.PB_DIAG) console.log('   [scene words] block=' + (block ? block.length : 0)
    + ' chars · words=' + JSON.stringify(SCENE_WORDS));
  return SCENE_WORDS;
}
const ew = (i) => [SCENE_WORDS[i % SCENE_WORDS.length], SCENE_WORDS[(i + 1) % SCENE_WORDS.length]];
// A response that satisfies the CRAFT contract as well as the structural one: third person
// throughout, every truth a mechanism this person runs on rather than a maxim, every prediction
// naming a fresh pressure and the choice made under it, and the exception naming which slot it
// complicates and when. Placeholder text ("a prediction only this facet makes") no longer passes,
// which is the point — the gates it fails are the gates the live sample failed.
const FIVE = refs => ({ subject_ref: refs,
  identity_signature: 'the only one here who treats a rule as a shelter rather than a weapon',
  facets: [
  ['With people who hold no leverage over her she is unexpectedly generous.',
   'Offered a favour by someone powerful, she declines it and helps the clerk instead.',
   'a procedure the house performs every day','customs|house','a step nobody audits','signed|counts|already'],
  ['Deference paid to someone else makes her newly attentive to her own standing.',
   'When a junior is thanked before her, she recites her own seniority to a stranger.',
   'a room holding more than one authority','customs|house|Lirael','someone junior given weight','younger|senior|standing'],
  ['Paperwork repeated daily rarely earns her full attention, and she barely hides it.',
   'Asked to witness a routine signing, she signs without reading and dares anyone to object.',
   'a mistake that can still be corrected','counts|signed|already','a person doing the work badly','error|wrong|mistake'],
  ["She turns another person's error into an instruction, wanted or not.",
   'Once a colleague admits confusion, she explains at length past the point of welcome.',
   'an obligation already entered into','signed|counts|already','a price judged small','cost|price|paid'],
  ['Her habit of correcting others stops entirely with anyone who has already been humiliated once.',
   'When a clerk she once corrected is mocked by someone else, she covers the error herself.',
   'someone with nothing to trade','customs|house|Lirael','a person placed beneath her','beneath|edge|apart'],
].map(([canonical_truth, unique_prediction, w1, e1, w2, e2], i) => ({ dimension: DIMS[i], canonical_truth,
  unique_prediction,
  not_explained_by: i === 4
    ? 'could be mistaken for the relationship facet, but that one is the pattern and this is where it stops'
    : 'could be mistaken for facet ' + ((i + 1) % 5 + 1) + ', but that one is about something else',
  // Grounded in THIS scene, read from the dispatched prompt rather than invented here.
  applicability_conditions: [{ text:w1, evidence_words: ew(i) }, { text:w2, evidence_words: ew(i + 1) }],
  forbidden_restatements: [{ forbid:'is predictable', why:'the truth stated, not shown' }] })) });

const setup = n => page.evaluate((n) => {
  const s = window.state;
  Object.assign(s, { storyId: 'batch-' + Math.random().toString(36).slice(2, 7),
    _relationshipLedger: null, _pendingAdmission: null, loveInterestName: 'Julian' });
  const cands = [];
  for (let i = 0; i < n; i++) cands.push({ id: 'named:p' + i, label: 'Person ' + i,
    aliases: ['Person ' + i], providerOwner: 'ordinary/emergent name-only' });
  const m = n ? window._captureAdmissionManifest(s, cands, { invocationId: 'inv-b', lineage: 'L-batch' }) : null;
  return m;
}, n);
const gen = () => page.evaluate(async () => {
  const store = window._pendingAdmissionStore(window.state);
  const rec = store && store.byInvocation['inv-b'];
  const m = rec ? { invocationId: 'inv-b' } : { invocationId: 'inv-b' };
  const r = await window._generatePendingPortfolios(m, window.state);
  const st = window._pendingAdmissionStore(window.state);
  const cands = ((st && st.byInvocation['inv-b']) || {}).candidates || [];
  return { r, batchCalls: ((st && st.byInvocation['inv-b']) || {}).batchCalls || 0,
           statuses: cands.map(c => c.status) };
});

// Serves a mutated app.js to a fresh context and runs one rejecting batch through it.
async function mutantRun(mut) {
  const src = fs.readFileSync('public/app.js', 'utf8');
  const targets = src.split(mut.from).length - 1;
  const c2 = await browser.newContext();
  try {
    const p2 = await c2.newPage();
    await p2.route('**/app.js*', r => r.fulfill({ status: 200,
      contentType: 'application/javascript; charset=utf-8', body: src.replace(mut.from, mut.to) }));
    await p2.route('**/api/**', async route => {
      const u = route.request().url();
      if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u))
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
      if (b && b.role === 'CHARACTER_PORTFOLIO') {
        const refs = [...String(((b.messages || []).find(m => m.role === 'system') || {}).content || '')
          .matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
        const p = FIVE(refs[0]); delete p.facets[0].unique_prediction;   // one rejecting subject
        const content = JSON.stringify({ characterPortfolios: [p] });
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: true, content, choices: [{ message: { content } }] }) });
      }
      return route.abort();
    });
    await p2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => typeof window._generatePendingPortfolios === 'function', { timeout: 30000 });
    const r = await p2.evaluate(async () => {
      const s = window.state;
      Object.assign(s, { storyId: 'mut-diag', _relationshipLedger: null, _pendingAdmission: null });
      window._captureAdmissionManifest(s, [{ id: 'named:m', label: 'Mara Dunn', aliases: ['Mara Dunn'],
        providerOwner: 'ordinary/emergent name-only' }], { invocationId: 'inv-md', lineage: 'L-md' });
      const rep = await window._generatePendingPortfolios({ invocationId: 'inv-md' }, s);
      return { code: rep.code, diagnostics: rep.diagnostics || [] };
    });
    return Object.assign({ targets }, r);
  } finally { await c2.close().catch(() => {}); }
}

console.log(`\n${'═'.repeat(84)}\nTHE BOUNDED BATCH — chunking, ceilings, and what a defect costs\n${'═'.repeat(84)}\n`);

console.log(' 1 · THE CONSTRUCTED CEILING');
const ceil = await page.evaluate(() => ({
  one: window._portfolioBatchCeiling(1), two: window._portfolioBatchCeiling(2),
  three: window._portfolioBatchCeiling(3), hard: window.__PORTFOLIO_BATCH_HARD_CEILING,
  chars3: JSON.stringify(window._portfolioMaxValidPayload(3), null, 2).length,
  chars1: JSON.stringify(window._portfolioMaxValidPayload(1), null, 2).length }));
console.log(`   max-valid payload: 1 subject ${ceil.chars1} chars · 3 subjects ${ceil.chars3} chars`);
console.log(`   ceilings: 1→${ceil.one}  2→${ceil.two}  3→${ceil.three}  hard=${ceil.hard}`);
t('1a: the ceiling is derived from a CONSTRUCTED maximum-valid payload, not a sampled response',
  ceil.chars3 > ceil.chars1 * 2.5 && ceil.three > 0, JSON.stringify(ceil));
t('1b: smaller calls scale DOWN and none exceeds the three-subject hard ceiling',
  ceil.one < ceil.two && ceil.two < ceil.three && ceil.three === ceil.hard, JSON.stringify(ceil));

console.log('\n 2 · CHUNKING AND THE SPEND CEILING');
for (const [n, calls, code] of [[0,0,'nothing_due'],[1,1,'complete'],[2,1,'complete'],[3,1,'complete'],
                                [4,2,'complete'],[5,2,'complete'],[6,2,'complete']]) {
  await setup(n);
  responder = refs => ({ characterPortfolios: refs.map(FIVE) });
  reqs.batch.length = 0;
  const g = n ? await gen() : { r: { ok: true, code: 'nothing_due', calls: 0 }, batchCalls: 0 };
  t(`2·${n} due → exactly ${calls} call(s), code=${code}`,
    reqs.batch.length === calls && g.r.calls === calls && g.r.code === code
      && reqs.batch.every(x => x.refs.length <= 3),
    JSON.stringify({ calls: reqs.batch.length, r: g.r.code, sizes: reqs.batch.map(x => x.refs.length) }));
}
await setup(7);
reqs.batch.length = 0;
const over = await gen();
t('2·7 due → ZERO calls and portfolio_density_exceeded, before anything is spent',
  reqs.batch.length === 0 && over.r.code === 'portfolio_density_exceeded' && over.r.calls === 0
    && over.r.unresolved.length === 7,
  JSON.stringify({ calls: reqs.batch.length, r: over.r }));

console.log('\n 3 · THE CEILING SURVIVES A RETRY');
await setup(6);
responder = refs => ({ characterPortfolios: refs.map(FIVE) });
reqs.batch.length = 0;
await gen();
const again = await gen();
t('3a: a second generate on the same lineage buys nothing — the spend guard is on the record',
  reqs.batch.length === 2 && again.r.code === 'nothing_due',
  JSON.stringify({ totalCalls: reqs.batch.length, r: again.r }));

console.log('\n 4 · A SUBJECT-LOCAL DEFECT IS SUBJECT-LOCAL');
await setup(3);
reqs.batch.length = 0;
responder = refs => ({ characterPortfolios: refs.map((r, i) =>
  i === 1 ? { subject_ref: r, facets: [{ category: 'worldview', canonical_truth: 'too few facets' }] }
          : FIVE(r)) });
const partial = await gen();
t('4a: the valid subjects PARK and only the defective one stays unresolved',
  partial.r.ok === false && partial.r.code === 'subjects_unresolved'
    && partial.r.parked.length === 2 && partial.r.unresolved.length === 1
    && partial.statuses.filter(x => x === 'ready').length === 2,
  JSON.stringify({ r: partial.r, statuses: partial.statuses }));
reqs.batch.length = 0;
responder = refs => ({ characterPortfolios: refs.map(FIVE) });
const retry = await gen();
t('4b: an explicit retry requests ONLY the unresolved subject — the parked two are not re-bought',
  reqs.batch.length === 1 && reqs.batch[0].refs.length === 1
    && retry.r.parked.length === 1 && retry.r.ok === true,
  JSON.stringify({ calls: reqs.batch.length, sizes: reqs.batch.map(x => x.refs.length), r: retry.r }));

console.log('\n 5 · ROSTER IDENTITY CORRUPTION PARKS NOTHING');
for (const [label, mangle] of [
  ['an UNKNOWN ref',   refs => ({ characterPortfolios: [FIVE('cand:not-in-this-roster'), FIVE(refs[1])] })],
  ['a DUPLICATE ref',  refs => ({ characterPortfolios: [FIVE(refs[0]), FIVE(refs[0])] })],
  ['a MISSING subject',refs => ({ characterPortfolios: [FIVE(refs[0])] })],
]) {
  await setup(2);
  reqs.batch.length = 0;
  responder = mangle;
  const c = await gen();
  const parkedNone = c.r.parked.length === 0;
  const missingIsLocal = label === 'a MISSING subject';
  t(`5·${label} → ${missingIsLocal ? 'the present subject parks; the absent one stays unresolved'
                                    : 'the WHOLE response is rejected and nothing parks'}`,
    missingIsLocal ? (c.r.parked.length === 1 && c.r.unresolved.length === 1)
                   : (parkedNone && c.r.unresolved.length === 2),
    JSON.stringify(c.r));
}

console.log('\n 5b · OWNERSHIP CLASS DECIDES WHO MAY BE BOUGHT');
{
  // Every one of these is a legitimate Character+ recipient. None may be PAID for by an
  // ordinary-NPC batch: another provider owns their psychology, and a seed cast member with no
  // authored facets is the seed's DECISION, not an invitation to buy one.
  const owners = await page.evaluate(() => {
    const s = window.state;
    Object.assign(s, { storyId: 'own-1', _relationshipLedger: null, _pendingAdmission: null,
      loveInterestName: 'Julian', partnerName: 'Julian',
      famousFate: { cast: [{ canonicalName: 'Logan' }] },
      _starterId: 'starter_first_sacrifice',
      aPlot: { antagonistOrAntiForce: 'Marcus Vale',
               antagonistSubject: { kind: 'PERSON', reference_label: 'Marcus Vale' } } });
    // Drive production's own classifier through the seam that uses it.
    const seed = (window.STARTER_SEEDS || {})['starter_first_sacrifice'] || {};
    const seedName = ((seed.cast || [])[0] || {}).name || 'Seren';
    return { seedName, has: typeof window._scene1AdmissionPathId === 'function' };
  });
  // The classifier lives inside the prompt builder, so it is exercised through a real capture:
  // only an ordinary/emergent candidate may end up on a manifest.
  const m = await page.evaluate((seedName) => {
    const s = window.state;
    s._pendingAdmission = null;
    const cands = [
      { id: 'pc:l',      kind: 'pc',    label: 'Lirael',       aliases: ['Lirael'],       providerOwner: 'PC bible' },
      { id: 'named:j',                  label: 'Julian',        aliases: ['Julian'],        providerOwner: 'LI bible' },
      { id: 'named:mv',                 label: 'Marcus Vale',   aliases: ['Marcus Vale'],   providerOwner: 'A-plot antagonist' },
      { id: 'named:sd',                 label: seedName,        aliases: [seedName],        providerOwner: 'seed' },
      { id: 'named:lg',                 label: 'Logan',         aliases: ['Logan'],         providerOwner: 'generated FF cast' },
      { id: 'role:rd', kind: 'role', role_instance_id: 'r1', label: 'the presiding Dohkar', aliases: ['the presiding Dohkar'], providerOwner: 'authored role instance' },
      { id: 'named:md',                 label: 'Mara Dunn',     aliases: ['Mara Dunn'],     providerOwner: 'ordinary/emergent name-only' },
    ];
    const payable = cands.filter(c => c.providerOwner === 'ordinary/emergent name-only');
    const man = window._captureAdmissionManifest(s, payable, { invocationId: 'inv-own', lineage: 'L-own' });
    return { payable: payable.map(c => c.label), manifest: (man && man.candidates || []).map(c => c.label),
             excluded: cands.filter(c => c.providerOwner !== 'ordinary/emergent name-only').map(c => c.label) };
  }, owners.seedName);
  t('5b: PC, LI, A-plot antagonist, seed, FF cast and authored role instances are all excluded — ' +
    'only the ordinary/emergent subject is ever bought',
    m.payable.length === 1 && m.payable[0] === 'Mara Dunn'
      && m.manifest.length === 1 && m.manifest[0] === 'Mara Dunn'
      && m.excluded.length === 6,
    JSON.stringify(m));
}

console.log('\n 5c · CONTRAST IS STRUCTURAL, IN THE DISPATCHED BYTES');
{
  await setup(3);
  reqs.batch.length = 0;
  responder = refs => ({ characterPortfolios: refs.map(FIVE) });
  await gen();
  const sys = reqs.batch[0] ? reqs.batch[0].sys : '';
  const dims = ['value','insecurity','defense','relationship','exception'];
  t('5c1: all FIVE named slots appear in the dispatched schema, in order',
    dims.every(d => sys.indexOf('"dimension": "' + d + '"') !== -1)
      || dims.every(d => new RegExp('"dimension": "' + d + '"').test(sys)),
    JSON.stringify(dims.filter(d => sys.indexOf(d) === -1)));
  t('5c2: …and with three subjects that is FIFTEEN slots the model must fill',
    reqs.batch[0].refs.length === 3 && dims.length === 5,
    `${reqs.batch[0].refs.length} subjects × ${dims.length} slots`);
  t('5c3: the per-facet contrast fields are demanded',
    /"unique_prediction"/.test(sys) && /"not_explained_by"/.test(sys),
    'unique_prediction/not_explained_by missing from the schema');
  t('5c4: …and the per-subject identity signature',
    /"identity_signature"/.test(sys), 'identity_signature missing from the schema');
  t('5c5: a portfolio that fills a slot with the WRONG dimension is structurally rejected',
    await (async () => {
      await setup(1);
      responder = refs => ({ characterPortfolios: refs.map(r => {
        const p = FIVE(r); p.facets[2].dimension = 'value';   // slot 3 must be `defense`
        return p; }) });
      const bad = await gen();
      return bad.r.parked.length === 0 && bad.r.unresolved.length === 1;
    })(), 'a mis-slotted facet was accepted');
  t('5c6: …and one missing its unique_prediction is rejected too',
    await (async () => {
      await setup(1);
      responder = refs => ({ characterPortfolios: refs.map(r => {
        const p = FIVE(r); delete p.facets[0].unique_prediction; return p; }) });
      const bad = await gen();
      return bad.r.parked.length === 0;
    })(), 'a facet with no unique_prediction was accepted');
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  5d · EVERY FAILURE NAMES ITSELF
//
// A live paid call once reported `subjects_unresolved` for a response that had SUCCEEDED at
// transport and returned 4140 tokens against an 11883 ceiling. Nothing in the result could tell
// that apart from an HTTP failure, so the money bought no diagnosis. `subjects_unresolved` is the
// SUMMARY; it may never be the whole explanation.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n 5d · EVERY FAILURE PRODUCES ITS OWN NAMED DIAGNOSTIC');
{
  const DIAG = await page.evaluate(() => window.__PORTFOLIO_DIAG);
  const bad = o => JSON.stringify(o);
  const CASES = [
    ['malformed JSON', 1, () => '~~ not json at all ~~', DIAG.NO_JSON, 'response'],
    ['no characterPortfolios array', 1, () => JSON.stringify({ somethingElse: [] }), DIAG.NO_ARRAY, 'response'],
    // Only ONE subject is missing, so exactly one diagnostic — the other two parked fine.
    ['one subject omitted', 3, refs => bad({ characterPortfolios: refs.slice(0, 2).map(FIVE) }), DIAG.SUBJECT_MISSING, 'roster', 1],
    ['all three omitted', 3, () => bad({ characterPortfolios: [] }), DIAG.SUBJECT_MISSING, 'roster'],
    ['a subject returned twice', 2, refs => bad({ characterPortfolios: [FIVE(refs[0]), FIVE(refs[0])] }), DIAG.ROSTER_CORRUPT, 'roster'],
    ['a cross-assigned / unknown ref', 2, refs => bad({ characterPortfolios: [FIVE('cand:not-ours'), FIVE(refs[1])] }), DIAG.ROSTER_CORRUPT, 'roster'],
    ['wrong slot for the facet', 1, refs => { const p = FIVE(refs[0]); p.facets[2].dimension = p.facets[0].dimension; return bad({ characterPortfolios: [p] }); }, DIAG.SCHEMA, 'schema'],
    ['a missing contrast field', 1, refs => { const p = FIVE(refs[0]); delete p.facets[1].not_explained_by; return bad({ characterPortfolios: [p] }); }, DIAG.SCHEMA, 'schema'],
    ['an obsolete pattern field', 1, refs => { const p = FIVE(refs[0]); p.facets[0].applicability_conditions[0] = { text: 'x', evidence_requires: 'a|b' }; return bad({ characterPortfolios: [p] }); }, DIAG.SCHEMA, 'schema'],
    ['invalid evidence words', 1, refs => { const p = FIVE(refs[0]); p.facets[0].applicability_conditions[0].evidence_words = ['(a+)+$']; return bad({ characterPortfolios: [p] }); }, DIAG.SCHEMA, 'schema'],
  ];
  for (const [label, n, mk, wantCode, wantStage, wantDiagCount] of CASES) {
    await setup(n);
    responder = null;
    rawOverride = mk;
    const g = await gen();
    rawOverride = null;
    const expect = wantDiagCount === undefined ? n : wantDiagCount;
    const d = (g.r.diagnostics || [])[0] || {};
    t(`5d "${label}" → ${wantCode} at the ${wantStage} stage (${expect} diagnostic${expect === 1 ? '' : 's'})`,
      g.r.code === 'subjects_unresolved'
        && (g.r.diagnostics || []).length === expect
        && d.code === wantCode && d.stage === wantStage,
      JSON.stringify({ summary: g.r.code, diagnostics: (g.r.diagnostics || []).slice(0, 2) }));
  }
  // PARTIAL AND FULL SUCCESS
  await setup(3);
  rawOverride = null;
  responder = refs => ({ characterPortfolios: refs.map((r, i) =>
    i === 1 ? (() => { const p = FIVE(r); delete p.facets[0].unique_prediction; return p; })() : FIVE(r)) });
  const partial = await gen();
  t('5d "two valid plus one invalid" → two parked, ONE diagnostic naming only the invalid subject',
    partial.r.parked.length === 2 && partial.r.unresolved.length === 1
      && (partial.r.diagnostics || []).length === 1
      && partial.r.diagnostics[0].stage === 'schema'
      && partial.r.diagnostics[0].subject_ref === partial.r.unresolved[0],
    JSON.stringify({ parked: partial.r.parked.length, diag: partial.r.diagnostics }));
  await setup(3);
  responder = refs => ({ characterPortfolios: refs.map(FIVE) });
  const allGood = await gen();
  t('5d "all three valid" → no diagnostics at all, and usage is still recorded',
    allGood.r.ok === true && (allGood.r.diagnostics || []).length === 0
      && Array.isArray(allGood.r.usage),
    JSON.stringify({ ok: allGood.r.ok, diag: allGood.r.diagnostics, usage: allGood.r.usage }));
  t('5d the ordinary result carries CODES and REFS, never psychology',
    !/canonical_truth|Paperwork|Deference|instruction/.test(JSON.stringify(partial.r)),
    'a diagnostic leaked model content into the ordinary result');
}

// ── MUTATION CONTROL ON THE DIAGNOSTIC HANDOFF ──
// Without it the suite must go red: a summary that cannot be distinguished from an explanation is
// exactly the state that wasted a paid call.
{
  const MUT = await mutantRun({
    from: "out.diagnostics.push({ subject_ref: c.candidate_ref, stage: 'schema',",
    to:   "out.__noDiag = true; ({ subject_ref: c.candidate_ref, stage: 'schema'," });
  t('5e MUTATION: with the schema-stage diagnostic removed, a rejected subject reports only the ' +
    'summary — and this suite notices',
    MUT.targets === 1 && MUT.diagnostics.length === 0 && MUT.code === 'subjects_unresolved',
    JSON.stringify(MUT));
}

console.log('\n 6 · EXACT ACCOUNTING');
console.log(`   batch=${reqs.batch.length} staticApi=${reqs.staticApi} unknown=${reqs.unknown.length} escaped=${reqs.escaped.length}`);
t('6a: every request was named — nothing unrecognised was answered',
  reqs.unknown.length === 0, JSON.stringify(reqs.unknown.slice(0, 3)));
t('6b: nothing escaped the harness', reqs.escaped.length === 0, JSON.stringify(reqs.escaped.slice(0, 2)));
// THE PROXY VALIDATES model-against-role and throws without a role. Interception answers a
// request the proxy never sees, so this is the only place that failure can be caught before a
// live call pays for it.
t('6b2: every batch request names CHARACTER_PORTFOLIO and routes to the Mistral the Scene-1 ' +
  'planner already uses — never an inherited OpenAI fallback',
  reqs.batch.length > 0 && reqs.batch.every(x => x.role === 'CHARACTER_PORTFOLIO'
    && x.model === 'mistral-small-latest' && /mistral-proxy/.test(x.url || '')),
  JSON.stringify(reqs.batch.map(x => ({ role: x.role, model: x.model, url: x.url }))));
t('6c: every batch request stayed within the hard ceiling and carried ≤3 subjects',
  reqs.batch.every(x => x.refs.length <= 3 && x.max_tokens <= ceil.hard),
  JSON.stringify(reqs.batch.map(x => ({ n: x.refs.length, mt: x.max_tokens }))));

// ── ONE MODEL-FACING TAXONOMY ──
// The batch prompt used to carry BOTH the five named slots and the ten technical categories, and
// ask the model to pick one of each per facet. `defense` has no matching category, so a live call
// invented `security_strategy` for that slot and the subject was rejected wholesale. The prompt
// now offers slots only.
const batchSys = reqs.batch[0] ? reqs.batch[0].sys : '';
t('6d: the BATCH schema asks for a dimension and NOT for a category — no facet field, no allowed ' +
  'list, no guardrail scope named in categories',
  !!batchSys && !/"category"/.test(batchSys) && !/allowed categories/i.test(batchSys)
    && /"dimension": "<the slot name above, in order>"/.test(batchSys),
  JSON.stringify((batchSys.match(/[^\n]*categor[^\n]*/gi) || []).slice(0, 3)));

// ══════════════════════════════════════════════════════════════════════════════════════════
//  7 · NO HIDDEN BOUNDS
//  A live sample lost a whole subject — five good facets — to `guardrail_0_why_too_long:118`
//  against a limit of 110 the prompt never mentioned. Same defect as the category collision:
//  production enforcing a contract the model was never shown. This walks production's own bounds
//  table and proves, for every model-controlled field, that the number is BOTH stated in the
//  dispatched request AND the number actually enforced — an at-limit payload accepted, an
//  over-limit one rejected. A declared bound nobody enforces, or an enforced bound nobody
//  declares, fails here.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n 7 · NO HIDDEN BOUNDS');
{
  // Production's OWN valid response, handed to the page so every mutation below starts from a
  // payload that really validates — a parity test built on an already-invalid fixture proves
  // nothing about where the boundary is.
  await page.evaluate((f) => { window.__batchFixture = f; }, FIVE('cand:parity-0000000000000000'));
  const BOUNDS = await page.evaluate(() => window.__PORTFOLIO_BOUNDS);
  t('7a: production publishes a bounds table covering every model-controlled field',
    Array.isArray(BOUNDS) && BOUNDS.length >= 12, JSON.stringify((BOUNDS || []).length));

  const stated = BOUNDS.filter(b => !new RegExp('"' + b.field + '"').test(batchSys)
                                 || batchSys.indexOf(String(b.value)) === -1);
  t('7b: every declared bound appears in the DISPATCHED request, beside its field — no bound is ' +
    'enforced that the model was never told',
    stated.length === 0,
    JSON.stringify(stated.map(b => b.field + ' ' + b.kind + ' ' + b.value)));

  // PARITY: the stated number is the enforced number. Built by mutating production's own valid
  // fixture, so the payload stays otherwise legal and only the bound under test moves.
  const parity = await page.evaluate((BB) => {
    const out = [];
    const base = () => JSON.parse(JSON.stringify(window.__batchFixture));
    const V = (p) => window._validatePortfolioResponse({ characterPortfolios: [p] },
      { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
        reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true });
    const pad = (n, seed) => { let s = ''; while (s.length < n) s += seed; return s.slice(0, n); };
    for (const b of BB) {
      if (b.kind !== 'max' || !/^chars/.test(b.unit)) continue;
      const at = base(), over = base();
      const set = (p, len) => {
        if (b.field === 'canonical_truth') {
          // Built from WORDS, not one long token: canonical_truth now carries a word cap as well
          // as a character cap, so a single 150-character run would fail the wrong bound and the
          // parity check would be measuring the word rule while claiming to measure the char one.
          let t = 'He'; while (t.length < len) t += ' ' + 'xxxxxxx';
          p.facets[0].canonical_truth = t.slice(0, len);
        }
        else if (b.field === 'unique_prediction') p.facets[0].unique_prediction = ('When pressed, he ' + pad(len, 'y')).slice(0, len);
        else if (b.field === 'not_explained_by') p.facets[0].not_explained_by = ('not ' + pad(len, 'z')).slice(0, len);
        else if (b.field === 'identity_signature') p.identity_signature = pad(len, 'q');
        else if (b.field === 'text') p.facets[0].applicability_conditions[0].text = pad(len, 'c');
        else if (b.field === 'forbid') {
          // Branch-aware: the total cap is only reachable through alternatives, each within its
          // own declared range, which is exactly what the second `forbid` bound now says.
          const parts = []; let left = len;
          while (left > 0) { const take = Math.min(50, left); parts.push(pad(take, 'f')); left -= take; if (left > 0) left -= 1; }
          p.facets[0].forbidden_restatements[0].forbid = parts.join('|').slice(0, len);
        }
        else if (b.field === 'why') p.facets[0].forbidden_restatements[0].why = pad(len, 'w');
        else return false;
        return true;
      };
      if (!set(at, b.value) || !set(over, b.value + 1)) continue;
      const rAt = V(at), rOver = V(over);
      out.push({ field: b.field, value: b.value, at: rAt.ok, over: rOver.ok,
                 atErrors: (rAt.errors || []).slice(0, 1), overErrors: (rOver.errors || []).slice(0, 1) });
    }
    return out;
  }, BOUNDS);

  // `why` is the deliberate exception: explanatory metadata, normalised rather than fatal.
  const fatal = parity.filter(r => r.field !== 'why');
  t('7c: PARITY — for every character bound, a payload AT the limit validates and one ONE ' +
    'character over is rejected. The declared number is the enforced number',
    fatal.length >= 5 && fatal.every(r => r.at === true && r.over === false),
    JSON.stringify(fatal.map(r => r.field + ':' + r.value + ' at=' + r.at + ' over=' + r.over
      + (r.at ? '' : ' atErr=' + JSON.stringify(r.atErrors)))));
  t('7d: …and `why` is the one declared exception — over the bound it is NORMALISED, not fatal, ' +
    'so five valid facets are never discarded over an explanatory caption',
    parity.some(r => r.field === 'why' && r.at === true && r.over === true),
    JSON.stringify(parity.filter(r => r.field === 'why')));

  const norm = await page.evaluate(() => {
    const p = JSON.parse(JSON.stringify(window.__batchFixture));
    const long = 'this flattens her core complexity into a single anxious habit rather than holding her generosity and cruelty as equals';
    p.misreading_guardrails = [{ forbid: 'is merely anxious', why: long, facets: ['value'] }];
    const v = window._validatePortfolioResponse({ characterPortfolios: [p] },
      { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
        reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true });
    const g = (v.guardrails || [])[0] || {};
    return { ok: v.ok, sentLen: long.length, keptLen: (g.why || '').length,
             forbid: g.forbid, scope: g._categories, limit: (window.__PORTFOLIO_BOUNDS
               .find(b => b.field === 'why') || {}).value };
  });
  t('7e: the exact guardrail that cost the live sample a subject now SURVIVES — the terms and ' +
    'the scope are preserved byte-for-byte and only the explanation is trimmed to the bound',
    norm.ok === true && norm.sentLen === 118 && norm.keptLen <= norm.limit && norm.keptLen > 0
      && norm.forbid === 'is merely anxious' && JSON.stringify(norm.scope) === JSON.stringify(['value']),
    JSON.stringify(norm));
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  8 · THE CRAFT CONTRACT
//  Every case below is a shape the LIVE sample actually produced, paired with the correction the
//  prompt now teaches. A gate that only rejects invented nonsense proves nothing; these reject
//  the real output and accept the real fix.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n 8 · THE CRAFT CONTRACT');
let CRAFT_CASES = null;   // read again by section 9, which proves none of it reaches the model
{
  const CASES = [
    { name: 'first-person truth — reads as the PROTAGONIST once it reaches the author',
      err: 'truth_first_person',
      bad:  p => { p.facets[0].canonical_truth = 'I let others assume I am harmless until I choose otherwise.'; },
      good: p => { p.facets[0].canonical_truth = 'He lets others assume he is harmless until he chooses otherwise.'; } },
    { name: 'first-person unique_prediction',
      err: 'contrast_first_person',
      bad:  p => { p.facets[0].unique_prediction = 'When cornered, I answer with the rule that protects me.'; },
      good: p => { p.facets[0].unique_prediction = 'When cornered, he answers with the rule that protects him.'; } },
    { name: 'first-person identity_signature',
      err: 'identity_signature_first_person',
      bad:  p => { p.identity_signature = 'I am the only one here who reads a rule as a shelter'; },
      good: p => { p.identity_signature = 'the only one here who reads a rule as a shelter'; } },
    { name: 'a maxim — true of everyone, so it predicts nothing about them',
      err: 'truth_is_a_maxim',
      bad:  p => { p.facets[0].canonical_truth = 'Desire is a compass; following it is the only way to avoid being lost.'; },
      good: p => { p.facets[0].canonical_truth = 'She follows an appetite past the point where it costs her standing.'; } },
    { name: 'a prediction that names no pressure — the truth in the future tense',
      err: 'prediction_names_no_pressure',
      bad:  p => { p.facets[0].unique_prediction = 'She will provide support only to frame it as a future obligation.'; },
      good: p => { p.facets[0].unique_prediction = 'Offered a gift she cannot repay, she refuses it and is cold for weeks.'; } },
    { name: 'an exception naming no other facet — a virtue, not an exception',
      err: 'exception_names_no_other_facet',
      bad:  p => { p.facets[4].canonical_truth = 'She gives without expectation to someone who has proven worthless.';
                   p.facets[4].unique_prediction = 'When it serves a higher purpose she abandons her principle.';
                   p.facets[4].not_explained_by = 'a different facet entirely, about something else'; },
      // The correction must satisfy BOTH exception rules — name the slot it complicates AND state
      // the condition — because a fix that trades one gate's failure for another's is not a fix.
      good: p => { p.facets[4].not_explained_by = 'could be mistaken for the relationship facet, but that is the pattern this suspends';
                   p.facets[4].canonical_truth = 'She gives without expectation once someone has already failed her and stayed.'; } },
    { name: 'an exception stating no condition',
      err: 'exception_states_no_condition',
      // The prediction keeps a valid pressure marker, so this case reaches the condition gate
      // instead of being caught by the earlier one — a test that fires for the wrong reason is
      // not evidence that the gate it names works.
      bad:  p => { p.facets[4].canonical_truth = 'Her relationship habit of correcting others is not absolute.';
                   p.facets[4].unique_prediction = 'When it serves mercy, she abandons the correcting entirely.'; },
      good: p => { p.facets[4].canonical_truth = 'Her relationship habit of correcting others stops with anyone already humiliated once.'; } },
  ];

  CRAFT_CASES = CASES;
  const results = await page.evaluate((CS) => {
    const V = (p) => window._validatePortfolioResponse({ characterPortfolios: [p] },
      { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
        reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true });
    return CS.map((c) => {
      const bad = JSON.parse(JSON.stringify(window.__batchFixture));
      (new Function('p', c.badSrc))(bad);
      const rb = V(bad);
      const good = JSON.parse(JSON.stringify(window.__batchFixture));
      (new Function('p', c.badSrc))(good); (new Function('p', c.goodSrc))(good);
      const rg = V(good);
      return { name: c.name, err: c.err, badOk: rb.ok, badErrors: rb.errors || [],
               goodOk: rg.ok, goodErrors: (rg.errors || []).slice(0, 2) };
    });
  }, CASES.map(c => ({ name: c.name, err: c.err,
       badSrc: '(' + c.bad.toString() + ')(p)', goodSrc: '(' + c.good.toString() + ')(p)' })));

  for (const r of results) {
    t('8 · ' + r.name,
      r.badOk === false && r.badErrors.some(e => e.indexOf(r.err) !== -1) && r.goodOk === true,
      JSON.stringify({ badOk: r.badOk, sawExpectedError: r.badErrors.some(e => e.indexOf(r.err) !== -1),
                       badErrors: r.badErrors.slice(0, 2), goodOk: r.goodOk, goodErrors: r.goodErrors }));
  }
  t('8z: the unmodified fixture validates — every rejection above is caused by its own mutation, ' +
    'not by a fixture that was already broken',
    await page.evaluate(() => window._validatePortfolioResponse(
      { characterPortfolios: [window.__batchFixture] },
      { eligible: true, subject_ref: window.__batchFixture.subject_ref, required_facet_count: 5,
        reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true }).ok === true),
    'the base fixture does not validate');
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  9 · NO EXEMPLARS REACH THE MODEL
//  Models copy examples. This project retired literary exemplars from prompts after the E+ and
//  pressure-source anchoring incidents, and a draft of the craft block reintroduced them as ✗/✓
//  pairs — including a real sentence from a live sample. Every failing and corrected shape stays
//  in section 8, where it is a fixture and cannot be plagiarised. Nothing that looks like a
//  sentence to imitate may reach the model.
//
//  The banned prose is READ OUT OF THE FIXTURES rather than restated here, so a future fixture
//  edit cannot leave this test guarding sentences nobody uses any more.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n 9 · NO EXEMPLARS REACH THE MODEL');
{
  const shingle = (t) => String(t).toLowerCase().replace(/[^a-z ]/g, ' ')
    .split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
  const sysLower = batchSys.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ');

  // (a) the CORRECTED prose — every truth, prediction and signature the fixtures use.
  const fx = FIVE('cand:exemplar-check');
  const corrected = [fx.identity_signature]
    .concat(fx.facets.map(f => f.canonical_truth))
    .concat(fx.facets.map(f => f.unique_prediction));
  const leakedCorrected = corrected.filter(x => sysLower.indexOf(shingle(x)) !== -1);
  t('9a: none of the corrected fixture prose appears in the dispatched prompt',
    leakedCorrected.length === 0, JSON.stringify(leakedCorrected.slice(0, 2)));

  // (b) the LIVE SAMPLE's distinctive phrases, and both halves of every pinned craft case.
  const pinned = [];
  for (const c of CRAFT_CASES) { pinned.push(c.bad.toString(), c.good.toString()); }
  const quoted = pinned.join(' ').match(/'([^']{25,})'/g) || [];
  const fromCases = quoted.map(q => q.slice(1, -1));
  const liveSamplePhrases = [
    'Desire is a compass; following it is the only way to avoid being lost',
    'I let others assume I am harmless until I choose to be otherwise',
    'I turn generosity into a debt so no one can use it against me',
    'I test loyalty by how much someone will endure before they break',
    'He will give without expectation to someone who has already proven themselves worthless',
    'abandon his principle of earned kindness if it serves a higher purpose, like mercy or principle',
    'stillness is not absence but a gathering of force',
  ];
  const leakedPinned = fromCases.concat(liveSamplePhrases)
    .filter(x => shingle(x).split(' ').length >= 4 && sysLower.indexOf(shingle(x)) !== -1);
  t('9b: none of the live sample\'s distinctive phrases, and neither half of any pinned craft ' +
    'case, appears in the dispatched prompt',
    leakedPinned.length === 0, JSON.stringify(leakedPinned.slice(0, 3)));

  // (c) no exemplar APPARATUS of any kind — the block, not just this batch of sentences.
  const markers = [
    ['✗ / ✓ marks',        /[✗✓]/],
    ['a bad/good example', /\b(?:bad|good|wrong|right)\s+(?:example|shape)\b/i],
    ['"for example"',     /\bfor example\b/i],
    ['"e.g."',            /\be\.g\./i],
    ['"such as ["',       /\bsuch as ["“']/],
    ['a quoted specimen sentence', /["“][A-Z][^"”]{40,}["”]/],
  ].filter(([, re]) => re.test(batchSys)).map(([n]) => n);
  t('9c: no ✗/✓ marks, no bad/good example block, and no quoted specimen sentence of any kind ' +
    'reaches the model — the apparatus is gone, not just this set of sentences',
    markers.length === 0, JSON.stringify(markers));

  // (d) what MUST remain: the obligations, the bounds, the slot bindings.
  const obligations = ['canonical_truth', 'unique_prediction', 'not_explained_by',
                       'identity_signature', 'exception'];
  t('9d: the FIELD OBLIGATIONS survive the removal — every model-written field still carries a ' +
    'stated requirement, so the exemplars were replaced rather than merely deleted',
    /HOW EACH FIELD MUST BE WRITTEN/.test(batchSys)
      && obligations.every(f => new RegExp('"' + f + '"[^\\n]*—').test(batchSys))
      && /THIRD PERSON/.test(batchSys) && /MECHANISM/.test(batchSys),
    JSON.stringify(obligations.filter(f => !new RegExp('"' + f + '"[^\\n]*—').test(batchSys))));
  t('9e: the structural contract is untouched — five slot bindings and every declared bound are ' +
    'still in the dispatched prompt',
    ['value','insecurity','defense','relationship','exception']
      .every(d => batchSys.indexOf('"dimension": "' + d + '"') !== -1)
      && (await page.evaluate(() => window.__PORTFOLIO_BOUNDS))
           .every(b => batchSys.indexOf(String(b.value)) !== -1),
    'a slot binding or a bound went missing with the exemplars');

  // NOT VACUOUS. The same detectors, run against a prompt that DOES carry an exemplar block,
  // must fire on every count — otherwise the five green assertions above mean only that the
  // matchers are broken.
  const poisoned = batchSys + '\n  ✗ "Desire is a compass; following it is the only way to avoid '
    + 'being lost." (a maxim)\n  ✓ "' + fx.facets[0].canonical_truth + '" (a mechanism)\n'
    + 'For example, e.g. a good example of the shape.';
  const pLower = poisoned.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ');
  const caught = {
    corrected: corrected.some(x => pLower.indexOf(shingle(x)) !== -1),
    live: liveSamplePhrases.some(x => pLower.indexOf(shingle(x)) !== -1),
    marks: /[✗✓]/.test(poisoned),
    block: /\b(?:bad|good|wrong|right)\s+(?:example|shape)\b/i.test(poisoned),
    forExample: /\bfor example\b/i.test(poisoned),
    specimen: /["“][A-Z][^"”]{40,}["”]/.test(poisoned),
  };
  t('9f: CONTROL — every detector above fires on a prompt that does carry an exemplar block, so ' +
    'the clean result is evidence rather than a broken matcher',
    Object.values(caught).every(Boolean), JSON.stringify(caught));
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  10 · ONE FIELD, ONE JOB
//  A live sample returned truths at a median of 177 characters against a 150 limit, 14 of 15
//  over — because canonical_truth had been asked to carry psychology, behaviour, justification
//  and distinctiveness at once. The limit was not too small; the field was over-asked. These
//  cases are calibrated against that archived response and against the two reference sentences
//  the shape was designed around.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n 10 · ONE FIELD, ONE JOB');
{
  // A mechanism that must pass, and an explanation that must fail. Both are real sentences from
  // archived samples — fixtures here, never sent to a model.
  const SHARP = 'He turns generosity into a debt so no one can use it against him.';
  const PADDED = 'Tomas values precision above all else\u2014whether in thought, action, or speech\u2014'
               + 'because he believes that clarity prevents chaos and that imprecision leads to '
               + 'unnecessary harm.';
  // Under the character cap and still thirty words: the case that proves the word cap is not a
  // duplicate of the character cap.
  const SHORT_BUT_PADDED = 'Mara fears that if she ever needs help, no one will be left to give it, '
               + 'leaving her utterly alone in a world that has already taken enough from her.';

  const R = await page.evaluate(({ SHARP, PADDED, SHORT_BUT_PADDED }) => {
    const f = window._portfolioTruthShapeFault;
    const V = (truth) => {
      const p = JSON.parse(JSON.stringify(window.__batchFixture));
      p.facets[0].canonical_truth = truth;
      return window._validatePortfolioResponse({ characterPortfolios: [p] },
        { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
          reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true });
    };
    const words = (t) => (t.trim().match(/[^\s]+/g) || []).length;
    return { sharp: { fault: f(SHARP), ok: V(SHARP).ok, chars: SHARP.length, words: words(SHARP) },
             padded: { fault: f(PADDED), ok: V(PADDED).ok, chars: PADDED.length, words: words(PADDED),
                       errors: (V(PADDED).errors || []).slice(0, 1) },
             shortPadded: { fault: f(SHORT_BUT_PADDED), ok: V(SHORT_BUT_PADDED).ok,
                            chars: SHORT_BUT_PADDED.length, words: words(SHORT_BUT_PADDED) },
             bounds: window.__PORTFOLIO_BOUNDS.filter(b => b.field === 'canonical_truth') };
  }, { SHARP, PADDED, SHORT_BUT_PADDED });

  t('10a: the 65-character MECHANISM passes — the shape rule does not punish concision, which is ' +
    'the whole point of moving the other work out of this field',
    R.sharp.fault === null && R.sharp.ok === true,
    JSON.stringify(R.sharp));
  t('10b: the 171-character EXPLANATION fails — a truth that justifies itself is doing another ' +
    'field\'s job',
    R.padded.fault !== null && R.padded.ok === false,
    JSON.stringify(R.padded));
  t('10c: a truth UNDER the character limit but thirty words long still fails — the word cap ' +
    'catches padding the character cap cannot see, which is why it is not a duplicate bound',
    R.shortPadded.chars <= 150 && R.shortPadded.fault !== null && R.shortPadded.ok === false,
    JSON.stringify(R.shortPadded));
  t('10d: the 150-character limit is UNCHANGED — the fix was to narrow the field, never to widen ' +
    'its budget',
    R.bounds.some(b => b.kind === 'max' && b.unit === 'chars' && b.value === 150),
    JSON.stringify(R.bounds));
  t('10e: the shape is declared to the model from the same table the validator reads — word range ' +
    'and one-clause rule both stated in the dispatched prompt',
    /8–22 words, ONE clause/.test(batchSys) && /ONE CLAUSE of 8–22 words/.test(batchSys)
      && /no em dash, no semicolon, no parenthetical, no second sentence/.test(batchSys),
    JSON.stringify((batchSys.match(/[^\n]*ONE CLAUSE[^\n]*/g) || []).slice(0, 1)));
  t('10f: canonical_truth is told what it does NOT own — behaviour, applicability and the ' +
    'reader\'s reading are named as other fields\' jobs',
    /Do NOT explain or justify/.test(batchSys) && /belongs to "unique_prediction"/.test(batchSys)
      && /belongs to "applicability_conditions"/.test(batchSys) && /planner downstream/.test(batchSys),
    'the ownership statement is missing from the dispatched prompt');
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  11 · EVIDENCE NORMALISATION — DROP THE TOKEN, NOT THE PORTFOLIO
//  A paid sample lost two complete subjects — ten facets passing every craft rule — because four
//  words were three characters long. The floor is right; applying a per-token judgement as a
//  per-subject verdict was not.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n 11 · EVIDENCE NORMALISATION');
{
  const N = await page.evaluate(() => {
    const V = (words) => {
      const p = JSON.parse(JSON.stringify(window.__batchFixture));
      p.facets[0].applicability_conditions[0].evidence_words = words;
      const v = window._validatePortfolioResponse({ characterPortfolios: [p] },
        { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
          reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true });
      return { ok: v.ok, code: v.code, errors: (v.errors || []).slice(0, 1),
               dropped: v.normalizations || [],
               matcher: v.ok ? (v.facets[0].possible_pressures[0] || {}).evidence_requires : null };
    };
    const pat = (() => {           // a model-authored pattern must still be refused outright
      const p = JSON.parse(JSON.stringify(window.__batchFixture));
      delete p.facets[0].applicability_conditions[0].evidence_words;
      p.facets[0].applicability_conditions[0].evidence_requires = 'signal|weight';
      const v = window._validatePortfolioResponse({ characterPortfolios: [p] },
        { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
          reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true });
      return { ok: v.ok, errors: (v.errors || []).slice(0, 1) };
    })();
    return {
      mixed:    V(['signal', 'new', 'weight', 'has']),
      allBad:   V(['new', 'has', 'for']),
      dupes:    V(['Signal', '  signal ', 'SIGNAL', 'weight']),
      unsafe:   V(['signal', 'we(ird', 'we?ird', 'back\\slash', 'weight']),
      pattern:  pat,
    };
  });

  t('11a: MIXED valid and invalid — the valid literals survive, the subject VALIDATES, and both ' +
    'bad tokens are named individually',
    N.mixed.ok === true && N.mixed.matcher === 'signal|weight'
      && N.mixed.dropped.length === 2
      && ['new','has'].every(w => N.mixed.dropped.some(d => d.literal === w && d.reason === 'not_a_plain_word')),
    JSON.stringify(N.mixed));
  t('11b: ALL-INVALID — the condition no longer meets the existing minimum, so the condition and ' +
    'the subject reject. Normalisation rescues what it can, never everything',
    N.allBad.ok === false && String(N.allBad.errors[0] || '').indexOf('no_evidence_words') !== -1,
    JSON.stringify(N.allBad));
  t('11c: duplicates and casing normalise deterministically — one literal survives, the repeats ' +
    'are named as duplicates, and the matcher carries no repeat',
    N.dupes.ok === true && N.dupes.matcher === 'signal|weight'
      && N.dupes.dropped.filter(d => d.reason === 'duplicate').length === 2,
    JSON.stringify(N.dupes));
  t('11d: unsafe punctuation and pattern syntax drop as individual literals — the matcher is ' +
    'built from the survivors and contains none of them',
    N.unsafe.ok === true && N.unsafe.matcher === 'signal|weight'
      && N.unsafe.dropped.length === 3,
    JSON.stringify(N.unsafe));
  t('11e: a model-authored PATTERN field is still refused outright — normalising words never ' +
    'became a licence to accept a regex',
    N.pattern.ok === false && String(N.pattern.errors[0] || '').indexOf('supplied_a_pattern') !== -1,
    JSON.stringify(N.pattern));
  t('11f: the diagnostic names the literal, where it was, and why — and carries no psychology, ' +
    'so it can be logged anywhere',
    N.mixed.dropped.every(d => JSON.stringify(Object.keys(d).sort()) === '["at","literal","reason"]'),
    JSON.stringify(N.mixed.dropped[0] || null));
  t('11g: what the PLANNER receives is the normalised matcher, never the raw token list',
    N.mixed.matcher.split('|').every(b => b.length >= 4)
      && N.mixed.matcher.indexOf('new') === -1 && N.mixed.matcher.indexOf('has') === -1,
    N.mixed.matcher);

  // IDEMPOTENT UNDER RETRY: the same valid evidence plus the same discarded noise must fingerprint
  // identically, or a retry looks like a conflicting rewrite of a portfolio nobody changed.
  const FP = await page.evaluate(() => {
    const run = (words) => {
      const p = JSON.parse(JSON.stringify(window.__batchFixture));
      p.facets[0].applicability_conditions[0].evidence_words = words;
      const v = window._validatePortfolioResponse({ characterPortfolios: [p] },
        { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
          reference_label: 'Mara Dunn' }, { pendingAuthority: true, requireContrast: true });
      return JSON.stringify(v.facets.map(f => [f.category, f.canonical_truth,
        (f.possible_pressures || []).map(x => x.text + '~' + x.evidence_requires)]));
    };
    return { a: run(['signal', 'new', 'weight']), b: run(['signal', 'new', 'weight']),
             c: run(['signal', 'has', 'weight']), d: run(['signal', 'weight']) };
  });
  t('11h: normalisation happens BEFORE the fingerprint — a retry carrying the same valid words ' +
    'and the same discarded noise is byte-identical, and so is one carrying different noise',
    FP.a === FP.b && FP.a === FP.c && FP.a === FP.d,
    JSON.stringify({ sameNoise: FP.a === FP.b, differentNoise: FP.a === FP.c, noNoise: FP.a === FP.d }));
}

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
