// ══════════════════════════════════════════════════════════════════════════════════════════
//  REPLAY — the archived paid response, through production, for free.
//
//  A response that has already been bought is evidence that can be re-examined as often as the
//  contract changes. This drives the REAL parser, validator and normaliser over the preserved
//  raw body; it never contacts a provider and never touches the spend ledger. It exists so that
//  a fix to input sanitation is proven against the exact bytes that provoked it, instead of
//  against a fresh call that would cost money and answer a slightly different question.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';

// Defaults to the NEWEST immutable archive, never the fixed-path scratch file: a later dry or
// sentinel run rewrites (or clears) the fixed path, and the whole point of the archive is that a
// paid response cannot be destroyed by a free one. That is not hypothetical — the dry run taken
// minutes after the fourth sample cleared _portfolio_sample_raw.txt, and this replay reads the
// archived copy of the same bytes instead.
const newest = (ext) => {
  const dir = '_portfolio_samples';
  const f = fs.readdirSync(dir).filter(x => x.endsWith(ext)).sort().pop();
  if (!f) throw new Error('no archived sample with extension ' + ext);
  return dir + '/' + f;
};
// The archive holds paid responses only (the harness no longer files sentinel runs there), so
// "newest" is unambiguous. Pass a path explicitly to replay an older one.
const ARCHIVE = process.argv[2] || newest('.raw.txt');
const SRC = fs.readFileSync('public/app.js', 'utf8');
const RAW = fs.readFileSync(ARCHIVE, 'utf8');
const EV = JSON.parse(fs.readFileSync(newest('.evidence.json'), 'utf8'));
const lab = {}; (EV.manifest || []).forEach(x => lab[x.ref] = x.label);

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._validatePortfolioResponse, { timeout:60000 });

  console.log(`\n${'═'.repeat(84)}\nREPLAY — ${ARCHIVE} (already paid for; this run costs nothing)\n${'═'.repeat(84)}\n`);

  const R = await page.evaluate(({ RAW, lab }) => {
    // PRODUCTION'S OWN PARSE. The archived file is the model's message content exactly as the
    // batch received it, so the same slice-and-parse it performs is what runs here.
    const lb = RAW.indexOf('{'), rb = RAW.lastIndexOf('}');
    const parsed = JSON.parse(RAW.slice(lb, rb + 1));
    return (parsed.characterPortfolios || []).map(p => {
      const v = window._validatePortfolioResponse({ characterPortfolios: [p] },
        { eligible: true, subject_ref: p.subject_ref, required_facet_count: 5,
          reference_label: lab[p.subject_ref] }, { pendingAuthority: true, requireContrast: true });
      return { label: lab[p.subject_ref], ok: v.ok, code: v.code,
               errors: (v.errors || []).slice(0, 2),
               dropped: v.normalizations || [],
               facets: (v.facets || []).map(f => ({ d: f.dimension, cat: f.category,
                 truth: f.canonical_truth,
                 evidence: (f.possible_pressures || []).map(x => x.evidence_requires) })) };
    });
  }, { RAW, lab });

  console.log(' 1 · STRUCTURAL');
  R.forEach(r => console.log(`     ${r.label}: ${r.ok ? 'VALID' : 'rejected — ' + r.code + ' ' + JSON.stringify(r.errors)}`
    + (r.dropped.length ? `  · dropped ${r.dropped.length} literal(s)` : '')));
  t('1a: the archived paid response is 3/3 structurally valid under the current contract',
    R.length === 3 && R.every(r => r.ok), JSON.stringify(R.map(r => [r.label, r.ok, r.code])));
  t('1b: every subject still carries five facets — dropping literals never dropped a facet',
    R.every(r => r.facets.length === 5), JSON.stringify(R.map(r => r.facets.length)));

  console.log('\n 2 · WHAT WAS DROPPED, AND WHAT SURVIVED');
  const drops = R.flatMap(r => r.dropped.map(d => ({ who: r.label, ...d })));
  drops.forEach(d => console.log(`     ${d.who}  ${d.at}  "${d.literal}"  (${d.reason})`));
  const unsafe = drops.filter(d => d.reason === 'not_a_plain_word');
  const dupes  = drops.filter(d => d.reason === 'duplicate');
  t('2a: the four short literals that cost two subjects are dropped BY LITERAL, and every other ' +
    'drop is a deduplication — no other reason fired',
    unsafe.length === 4 && ['new','has','for'].every(w => unsafe.some(d => d.literal === w))
      && unsafe.length + dupes.length === drops.length,
    JSON.stringify({ unsafe: unsafe.map(d => d.literal), dupes: dupes.map(d => d.literal),
                     otherReasons: drops.filter(d => d.reason !== 'not_a_plain_word' && d.reason !== 'duplicate') }));
  const branches = R.flatMap(r => r.facets.flatMap(f => f.evidence.flatMap(e => e.split('|'))));
  t('2b: no UNSAFE literal reached the matcher — nothing was shortened, expanded, guessed at, or ' +
    'turned into a pattern',
    unsafe.every(d => !branches.includes(d.literal)),
    JSON.stringify(unsafe.filter(d => branches.includes(d.literal)).map(d => d.literal)));
  t('2b2: …while a DEDUPLICATED literal survives exactly once, because removing a repeat must ' +
    'not remove the word',
    dupes.every(d => branches.filter(b => b === d.literal).length >= 1)
      && R.every(r => r.facets.every(f => f.evidence.every(e => {
           const b = e.split('|'); return new Set(b).size === b.length; }))),
    JSON.stringify(dupes.map(d => [d.literal, branches.filter(b => b === d.literal).length])));
  t('2c: every surviving literal satisfies the four-character floor — the floor was not lowered',
    R.every(r => r.facets.every(f => f.evidence.every(e =>
      e.split('|').every(br => br.length >= 4)))),
    JSON.stringify(R.flatMap(r => r.facets.flatMap(f => f.evidence.flatMap(e => e.split('|'))))
      .filter(b => b.length < 4)));
  t('2d: the diagnostic carries literals and reasons only — no canonical truth, no psychology',
    drops.every(d => Object.keys(d).sort().join(',') === 'at,literal,reason,who')
      && drops.every(d => !R.some(r => r.facets.some(f => String(d.literal).length > 12
           && f.truth.indexOf(d.literal) !== -1 && d.literal === f.truth))),
    JSON.stringify(drops[0] || null));

  console.log('\n 3 · THE RAW EVIDENCE IS UNTOUCHED');
  const rawParsed = JSON.parse(RAW.slice(RAW.indexOf('{'), RAW.lastIndexOf('}') + 1));
  const rawWords = rawParsed.characterPortfolios.flatMap(p => p.facets.flatMap(f =>
    (f.applicability_conditions || []).flatMap(c => c.evidence_words || [])));
  t('3a: the archived file still contains every original token, dropped ones included — ' +
    'normalisation happens downstream of the evidence, never to it',
    ['new','has','for'].every(w => rawWords.includes(w)),
    JSON.stringify(rawWords.filter(w => w.length < 4)));

  console.log('\n 4 · THE FROZEN LITERARY SCORES ARE UNCHANGED');
  const FP = /\b(?:I|I'm|I'll|I'd|I've|me|my|mine|myself|we|we're|us|our|ours)\b/;
  const words = x => (x.trim().match(/[^\s]+/g) || []).length;
  const allTruths = R.flatMap(r => r.facets.map(f => f.truth));
  t('4a: 15 truths, none first person, all 8–22 words, none over 150 chars — the same scores ' +
    'recorded before this fix, so sanitation changed nothing a reader would see',
    allTruths.length === 15 && !allTruths.some(x => FP.test(x))
      && allTruths.every(x => words(x) >= 8 && words(x) <= 22 && x.length <= 150),
    JSON.stringify({ n: allTruths.length,
      badWords: allTruths.filter(x => words(x) < 8 || words(x) > 22).length,
      firstPerson: allTruths.filter(x => FP.test(x)).length }));
  t('4b: five distinct derived categories per subject',
    R.every(r => new Set(r.facets.map(f => f.cat)).size === 5),
    JSON.stringify(R.map(r => r.facets.map(f => f.cat))));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed  (replay — $0.00 spent)\n`);
await browser.close();
process.exit(fail ? 1 : 0);
