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

const DIMS = ['value','insecurity','defense','relationship','exception'];
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
  applicability_conditions: [{ text:w1, evidence_words:e1.split('|') }, { text:w2, evidence_words:e2.split('|') }],
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
        if (b.field === 'canonical_truth') p.facets[0].canonical_truth = ('He ' + pad(len, 'x')).slice(0, len);
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

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
