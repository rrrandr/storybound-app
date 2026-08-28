// RELATION ENDPOINT STRICTNESS — a relations[] string must never mint a person.
//
// The 3B audit found that "Veilwood", "Marshal" and even the lowercase descriptor
// "the stranger" all became durable entities with real edges, and that a capitalised
// pronoun ("He said") produced ent:he. Capitalisation is not evidence of personhood —
// "Marshal" is capitalised, and no place-name heuristic can ever be complete.
//
// So endpoints resolve ONLY through identities that already exist: the relationship
// ledger, a character validated into the disclosure ledger, the structured PC/LI, or a
// structurally verified role placeholder. Lower recall is the correct trade — a dropped
// relation costs one edge; an invented person corrupts the graph permanently.
//
// usage: node _rel_endpoint_strictness.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  attempts.push({ paid: PAID.test(route.request().url()) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._relIngestRelations, { timeout: 40000 });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};

// Runs one relation against a fresh, story-owned ledger. `known` seeds the disclosure
// ledger, standing in for characters[] validated earlier in the same response.
const attempt = (prose, rel, known) => page.evaluate(({ prose, rel, known }) => {
  const s = window.state;
  s.storyId = 'strict_' + Math.floor(performance.now() * 1000);
  s._relationshipLedger = null; s._characterDisclosureLedger = {};
  s.pov = 'first_person'; s.name = 'Lirael'; s.playerName = 'Lirael';
  s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  // A "known" character is one VERIFIED ADMISSION has already processed, so the fixture drives
  // that step rather than hand-writing a v1 row. A hand-written row is now a LEGACY row, and a
  // legacy row is explicitly not authorization to resolve or create an identity.
  (known || []).forEach(n => { window._charLedgerApplyVerified({ name: n, present: true }, 1); });
  window._relSeedFromState();                            // materialise ledger + anchors
  const before = JSON.stringify(s._relationshipLedger);
  const res = window._relIngestRelations([rel], { prose, sceneUid: 'pg:s', pcViewpoint: true });
  const after = JSON.stringify(s._relationshipLedger);
  const L = s._relationshipLedger;
  return {
    accepted: res.accepted, dropped: res.dropped,
    unchanged: before === after,
    named: Object.keys(L.entities).filter(k => k.indexOf('ent:') === 0),
    roles: Object.keys(L.entities).filter(k => k.indexOf('role:') === 0),
    edges: Object.keys(L.edges).length,
    project: window._relProject('author')
  };
}, { prose, rel, known });

const rel = (from, to, type) => ({ quote: from + ' is my father', from, to: to || 'my father',
  type: type || 'parent_of', basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null });
const proseFor = n => '"' + n + ' is my father," Lirael said, and the hall went quiet at the words.';

console.log(`\n${'═'.repeat(82)}\nRELATION ENDPOINT STRICTNESS\n${'═'.repeat(82)}`);

// ── the four names from the audit must create nothing ──
console.log('\n NO DURABLE NODE FROM A BARE relations[] STRING');
for (const [label, name] of [['sentence-initial', 'Winter'], ['location', 'Veilwood'],
                             ['bare title', 'Marshal'], ['descriptor', 'the stranger']]) {
  const r = await attempt(proseFor(name), rel(name), []);
  const created = r.named.some(k => k.indexOf(name.toLowerCase()) !== -1);
  t(`${label} "${name}" creates no durable node`, !created && r.accepted === 0,
    `accepted=${r.accepted} named=${JSON.stringify(r.named)}`);
}

// ── rejection leaves the ledger byte-for-byte unchanged ──
console.log('\n TRANSACTIONAL ROLLBACK');
const rb = await attempt(proseFor('Veilwood'), rel('Veilwood'), []);
t('rejected relation leaves ledger byte-for-byte unchanged', rb.unchanged,
  `edges=${rb.edges} named=${JSON.stringify(rb.named)}`);
t('no orphan role placeholder survives rejection', rb.roles.length === 0, JSON.stringify(rb.roles));
t('no orphan edge version survives rejection', rb.edges === 0);

// ── capitalised pronouns ──
console.log('\n PRONOUNS ARE NEVER IDENTITIES');
const pr = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'pron'; s._relationshipLedger = null; s._characterDisclosureLedger = {};
  s.pov = 'first_person'; s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  window._relSeedFromState();
  window._relIngestRelations([
    { quote: 'He is my father', from: 'He', to: 'my father', type: 'parent_of',
      basis: 'asserted_on_page', assertedBy: 'He', addressedTo: null },
    { quote: 'They are my kin', from: 'They', to: 'my kin', type: 'kin_of',
      basis: 'asserted_on_page', assertedBy: 'She', addressedTo: 'Them' }
  ], { prose: '"He is my father," Lirael said. "They are my kin." She said it and no one moved at all.',
       sceneUid: 'pg:p', pcViewpoint: true });
  const L = s._relationshipLedger;
  return Object.keys(L.entities);
});
t('no he/she/they/them entity created',
  !pr.some(k => /^ent:(he|she|they|him|her|them|it|i|me|you)$/.test(k)), JSON.stringify(pr));

// ── the Corwin trio ──
console.log('\n RESOLUTION SOURCES');
const cValid = await attempt(proseFor('Corwin'), rel('Corwin'), ['Corwin']);
t('Corwin in validated characters[] → relation works', cValid.accepted === 1,
  `accepted=${cValid.accepted}`);
const cOnly = await attempt(proseFor('Corwin'), rel('Corwin'), []);
t('Corwin ONLY in relations[] → fails closed', cOnly.accepted === 0 && cOnly.unchanged,
  `accepted=${cOnly.accepted} unchanged=${cOnly.unchanged}`);
const cDurable = await page.evaluate(({ prose, rel }) => {
  const s = window.state;
  s.storyId = 'durable'; s._relationshipLedger = null; s._characterDisclosureLedger = {};
  s.pov = 'first_person'; s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  // Creation is EXPLICIT since the identity work: `{}` resolves and mints nothing. "Already
  // durable from an earlier scene" means the earlier scene created him, so the fixture must say so.
  window._relEntityForName('Corwin', { create: true });
  const res = window._relIngestRelations([rel], { prose, sceneUid: 'pg:d', pcViewpoint: true });
  return res.accepted;
}, { prose: proseFor('Corwin'), rel: rel('Corwin') });
t('existing durable Corwin resolves without characters[]', cDurable === 1, `accepted=${cDurable}`);

// ── role placeholders still work ──
console.log('\n ROLE PLACEHOLDERS UNAFFECTED');
const role = await attempt(
  '"Your father would kill us," Julian said to Lirael, and the lamp guttered between them.',
  { quote: 'Your father would kill us', from: 'your father', to: 'Lirael', type: 'parent_of',
    basis: 'asserted_on_page', assertedBy: 'Julian', addressedTo: 'Lirael' }, []);
t('PC role placeholder still resolves', role.accepted === 1 && role.roles.some(k => /role:pc:father/.test(k)),
  `accepted=${role.accepted} roles=${JSON.stringify(role.roles)}`);

// ── mixed batch: only the valid entry commits ──
console.log('\n MIXED BATCH');
const mixed = await page.evaluate(({ prose }) => {
  const s = window.state;
  s.storyId = 'mixed'; s._relationshipLedger = null; s._characterDisclosureLedger = {};
  s.pov = 'first_person'; s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  window._relSeedFromState();
  // Corwin is KNOWN because verified admission processed him, not because a row was poked in.
  window._charLedgerApplyVerified({ name: 'Corwin', present: true }, 1);
  const res = window._relIngestRelations([
    { quote: 'Veilwood is my father', from: 'Veilwood', to: 'my father', type: 'parent_of',
      basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null },
    { quote: 'Corwin is my father', from: 'Corwin', to: 'my father', type: 'parent_of',
      basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null }
  ], { prose, sceneUid: 'pg:m', pcViewpoint: true });
  const L = s._relationshipLedger;
  return { accepted: res.accepted, dropped: res.dropped,
    named: Object.keys(L.entities).filter(k => k.indexOf('ent:') === 0),
    project: window._relProject('author') };
}, { prose: '"Veilwood is my father," Lirael said. "Corwin is my father," Lirael said again that evening.' });
t('only the valid entry commits', mixed.accepted === 1 && mixed.dropped === 1,
  `accepted=${mixed.accepted} dropped=${mixed.dropped}`);
t('rejected entry left no node behind', !mixed.named.some(k => /veilwood/.test(k)), JSON.stringify(mixed.named));
t('valid entry is present', mixed.project.some(l => /Corwin/i.test(l)), mixed.project.join(' | '));

await browser.close();
console.log(`\n COST — ${attempts.length} intercepted, 0 issued, ${attempts.filter(a => a.paid).length} paid blocked.`);
console.log(`\n${'─'.repeat(82)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
