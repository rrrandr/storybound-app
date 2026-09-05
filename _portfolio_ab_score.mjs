// STRUCTURAL VERDICTS + SIMILARITY, on the blinded outputs. Reads _portfolio_ab_raw.json only.
// It must never open _portfolio_ab_KEY.json.
import { chromium } from 'playwright-core';
import fs from 'fs';
const SRC_FILE = process.argv[2] || '_portfolio_ab_raw.json';
const src = JSON.parse(fs.readFileSync(SRC_FILE, 'utf8'));
// A single-sample file has {content}; the A/B file has {A:{content},B:{content}}.
const raw = src.A ? src : { A: { status: src.status, usage: src.usage, content: src.content } };
const REFS = { 'cand:AB-present-0001': 'Mara Dunn', 'cand:AB-absent-0002': 'Tomas Reyne',
               'cand:AB-recurring-0003': 'Halden Roe' };
const EVIDENCE = {
  'cand:AB-present-0001': 'weighhouse ledger clause number waits protagonist find herself says again',
  'cand:AB-absent-0002': 'anticipated harbour office morning composing what she will say',
  'cand:AB-recurring-0003': 'storm-lantern recurring manifest read tonight waits until morning' };
const words = t => new Set(String(t||'').toLowerCase().match(/[a-z]{4,}/g) || []);
const jac = (a,b) => { const A=words(a), B=words(b); if(!A.size||!B.size) return 0;
  let i=0; A.forEach(x=>{ if(B.has(x)) i++; }); return i / (A.size + B.size - i); };

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._validatePortfolioResponse === 'function', { timeout: 30000 });

const report = {};
const ARMS = src.A ? ['A','B'] : ['A'];
for (const arm of ARMS) {
  const out = { status: raw[arm].status, usage: raw[arm].usage, parsed: null, subjects: {}, note: null };
  let parsed = null;
  try { const c = raw[arm].content || ''; const l=c.indexOf('{'), r=c.lastIndexOf('}');
        parsed = JSON.parse(c.slice(l, r+1)); } catch (e) { out.note = 'INVALID JSON — this arm FAILS'; }
  if (parsed && !Array.isArray(parsed.characterPortfolios)) { out.note = 'no characterPortfolios array — this arm FAILS'; parsed = null; }
  out.parsed = !!parsed;
  if (parsed) {
    out.returned = parsed.characterPortfolios.length;
    for (const ref of Object.keys(REFS)) {
      const entry = parsed.characterPortfolios.filter(x => x && x.subject_ref === ref)[0];
      if (!entry) { out.subjects[REFS[ref]] = { present: false }; continue; }
      const v = await page.evaluate(({ entry, ref }) => {
        const r = window._validatePortfolioResponse({ characterPortfolios: [entry] },
          { eligible: true, subject_ref: ref, storyId: 'x', required_facet_count: 5, reference_label: 'x' },
          { pendingAuthority: true });
        return { ok: r.ok, code: r.code, errors: (r.errors || []).slice(0, 4), n: (r.facets || []).length };
      }, { entry, ref });
      const truths = (entry.facets || []).map(f => f.canonical_truth || '');
      const cats = [...new Set((entry.facets || []).map(f => f.category))];
      // pairwise similarity among this subject's own truths
      let maxPair = 0, sumPair = 0, pairs = 0;
      for (let i=0;i<truths.length;i++) for (let j=i+1;j<truths.length;j++) {
        const s = jac(truths[i], truths[j]); maxPair = Math.max(maxPair, s); sumPair += s; pairs++; }
      // conditions that merely restate the supplied evidence
      const conds = (entry.facets||[]).flatMap(f => (f.applicability_conditions||[]).map(c => c.text||''));
      const echo = conds.filter(c => jac(c, EVIDENCE[ref]) > 0.25);
      out.subjects[REFS[ref]] = { present: true, valid: v.ok, code: v.code, errors: v.errors,
        facets: truths.length, categories: cats.length,
        selfSimilarityMax: +maxPair.toFixed(3), selfSimilarityMean: pairs ? +(sumPair/pairs).toFixed(3) : 0,
        conditionsEchoingEvidence: echo.length, conditionCount: conds.length,
        guardrails: (entry.misreading_guardrails || []).length, truths };
    }
    // cross-subject contamination
    const all = Object.keys(REFS).map(ref => {
      const e = parsed.characterPortfolios.filter(x => x && x.subject_ref === ref)[0];
      return (e && (e.facets||[]).map(f => f.canonical_truth || '')) || []; });
    let xMax = 0, xSum = 0, xN = 0;
    for (let a=0;a<all.length;a++) for (let b=a+1;b<all.length;b++)
      for (const t1 of all[a]) for (const t2 of all[b]) { const s = jac(t1,t2); xMax=Math.max(xMax,s); xSum+=s; xN++; }
    out.crossSubjectMax = +xMax.toFixed(3);
    out.crossSubjectMean = xN ? +(xSum/xN).toFixed(3) : 0;
  }
  report[arm] = out;
}
fs.writeFileSync(SRC_FILE.replace('_raw', '_structural'), JSON.stringify(report, null, 2));
for (const arm of ARMS) {
  const o = report[arm];
  console.log(`\n══ OUTPUT ${arm} ══  HTTP ${o.status} · in ${o.usage.prompt_tokens} / out ${o.usage.completion_tokens} tokens`);
  if (o.note) { console.log('   ' + o.note); continue; }
  console.log(`   portfolios returned: ${o.returned}/3 · cross-subject similarity max ${o.crossSubjectMax} mean ${o.crossSubjectMean}`);
  for (const [name, s] of Object.entries(o.subjects)) {
    if (!s.present) { console.log(`   ${name.padEnd(16)} ABSENT — subject-local failure`); continue; }
    console.log(`   ${name.padEnd(16)} valid=${s.valid ? 'YES' : 'NO (' + s.code + ')'} facets=${s.facets} cats=${s.categories} `
      + `selfSim max ${s.selfSimilarityMax} mean ${s.selfSimilarityMean} · conds echoing evidence ${s.conditionsEchoingEvidence}/${s.conditionCount} · guardrails ${s.guardrails}`);
    if (!s.valid) console.log(`        errors: ${JSON.stringify(s.errors)}`);
  }
}
await browser.close();
