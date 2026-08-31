// SAMPLE HYGIENE — the harness must own no part of the contract.
//
// The first Mistral sample hand-copied the schema, the category list and the evidence rules, and
// so tested a contract production had already stopped sending. Every subject came back invalid for
// reasons that were the harness's fault, and the run proved nothing about what ships. A copied
// contract does not announce itself when it drifts; this does.
//
// Free, static, no browser. Reads production for the literals rather than listing them.
import fs from 'fs';
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

const APP = fs.readFileSync('public/app.js', 'utf8');
const SAMPLE_FILES = ['_portfolio_mistral_sample.mjs'];

// Production's own literals, read out of the source — never listed here.
const grabArray = (name) => {
  const m = APP.match(new RegExp('window\\.' + name + '\\s*=\\s*([^;]+);'));
  if (!m) return null;
  const lit = APP.match(new RegExp(name.replace('__', '_').replace(/^_/, 'var _') + '\\s*=\\s*\\[([^\\]]+)\\]'));
  return lit ? lit[1].split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : null;
};
const CATEGORIES = (APP.match(/var _CPLUS_FACET_CATEGORIES = \[([\s\S]*?)\];/) || [])[1]
  ?.split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) || [];
const FIELDS = (APP.match(/perFacet: \[([\s\S]*?)\]/) || [])[1]
  ?.split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) || [];
const DIMS = (APP.match(/PORTFOLIO_CONTRAST_DIMENSIONS = \[([\s\S]*?)\n  \];/) || [])[1]
  ?.match(/key: '([a-z_]+)'/g)?.map(x => x.replace(/key: '|'/g, '')) || [];

console.log(`\n${'═'.repeat(84)}\nSAMPLE HYGIENE — the contract lives in production, not in the harness\n${'═'.repeat(84)}\n`);
console.log(`   production declares: ${CATEGORIES.length} categories · ${FIELDS.length} per-facet fields · ${DIMS.length} dimensions`);
t('0: production publishes its own contract for tests to read',
  CATEGORIES.length >= 8 && FIELDS.length >= 5 && DIMS.length === 5,
  JSON.stringify({ CATEGORIES: CATEGORIES.length, FIELDS: FIELDS.length, DIMS: DIMS.length }));

for (const f of SAMPLE_FILES) {
  const src = fs.readFileSync(f, 'utf8');
  // A quoted occurrence is a COPY. Reading the same word out of production is not.
  const quoted = (w) => new RegExp(`['"\`]${w}['"\`]`).test(src);
  const copiedCats = CATEGORIES.filter(quoted);
  const copiedFields = FIELDS.filter(quoted);
  const copiedDims = DIMS.filter(quoted);
  t(`${f}: no category name is hard-coded`, copiedCats.length === 0, JSON.stringify(copiedCats));
  t(`${f}: no facet schema field is hard-coded`, copiedFields.length === 0, JSON.stringify(copiedFields));
  t(`${f}: no contrast dimension is hard-coded`, copiedDims.length === 0, JSON.stringify(copiedDims));
  t(`${f}: no evidence field name is hard-coded`,
    !quoted('evidence_words') && !quoted('evidence_requires'), 'an evidence field is quoted here');
  t(`${f}: no prompt clause is copied`,
    !/You author CHARACTER PORTFOLIOS|PORTFOLIO SUBJECTS|allowed categories/.test(src),
    'a prompt clause appears in the harness');
  t(`${f}: no validation logic is reimplemented`,
    !/_portfolioPatternOk|PORTFOLIO_MAX_|required_facet_count\s*[:=]|characterPortfolios\s*\./.test(src),
    'the harness appears to validate structure itself');
  t(`${f}: it calls production's generator rather than building a request`,
    /_generatePendingPortfolios/.test(src) && !/messages:\s*\[/.test(src),
    'the harness builds its own request body');
  t(`${f}: it reads the contract from production at runtime`,
    /__PORTFOLIO_SCHEMA_FIELDS/.test(src) && /__CPLUS_FACET_CATEGORIES/.test(src)
      && /__PORTFOLIO_CONTRAST_DIMENSIONS/.test(src),
    'the harness does not read production\'s published contract');
}
// ── THE LEDGER IS IDEMPOTENT BY PROVIDER REQUEST ID ──
// Token counts are not an identity: two calls can legitimately spend the same, and replaying one
// response must never bill twice. The append is keyed on the provider's own request id.
{
  const src = fs.readFileSync('_portfolio_mistral_sample.mjs', 'utf8');
  t('ledger: the append is keyed on the provider request id, not on token counts',
    /c\.requestId === rid/.test(src) && /requestId: rid/.test(src),
    'the ledger dedupe does not use a provider request id');
  t('ledger: only a real dispatch may append — a dry or sentinel run cannot',
    /!DRY && !SENTINEL/.test(src.slice(src.indexOf('THE LEDGER IS PART OF THE EVIDENCE'),
                                       src.indexOf('THE LEDGER IS PART OF THE EVIDENCE') + 1400)),
    'a free run could append to the spend ledger');

  const L = JSON.parse(fs.readFileSync('_portfolio_spend_ledger.json', 'utf8'));
  const ids = L.calls.map(c => c.requestId).filter(Boolean);
  t('ledger: no recorded request id appears twice',
    new Set(ids).size === ids.length, JSON.stringify(ids));
  const cost = (x) => (x.prompt_tokens / 1e6) * L.rates[x.model].in
                    + (x.completion_tokens / 1e6) * L.rates[x.model].out;
  const recomputed = L.calls.reduce((n, x) => n + cost(x), 0);
  t('ledger: the stored total equals the sum of its own lines — the guard reads a figure that ' +
    'was never hand-edited away from its evidence',
    Math.abs(recomputed - L.total) < 1e-12,
    JSON.stringify({ stored: L.total, recomputed }));
}

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
