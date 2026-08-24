// RELATION EXTRACTION (3B) — mocked-response tests. Zero paid calls.
//
// The disclosure request is intercepted at the network layer and answered with a
// crafted body, so the REAL extractor, the REAL verifier and the REAL ledger run while
// nothing is issued. Everything the model returns is advisory: a matching quote proves
// only that words appear in the scene, and a character can lie — so `asserted_on_page`
// means "asserted", never "true".
//
// usage: node _rel_extract_regression.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const attempts = [];
let nextBody = null, disclosureCalls = 0, lastMaxTokens = null, lastSys = '';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  const r = route.request(), url = r.url();
  attempts.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), paid: PAID.test(url) });
  if (/chatgpt-proxy/.test(url) && r.method() === 'POST') {
    let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) {}
    const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
    if (/CHARACTER MEMORY EXTRACTOR/i.test(sys)) {
      disclosureCalls++; lastMaxTokens = b && b.max_tokens; lastSys = sys;
      const body = nextBody === null
        ? { characters: [], scene: {}, sceneState: {} }
        : nextBody;
      if (body === 'HTTP_FAIL') return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: typeof body === 'string' ? body : JSON.stringify(body) }) });
    }
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._relIngestRelations, { timeout: 40000 });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};
const settle = () => page.waitForTimeout(650);

// Drive the REAL guarded path: the same hook, the same canonical sceneUid.
let uidN = 0;
async function ingest(prose, relations, opts) {
  // Endpoints resolve only through existing identities, so a fixture asserting a
  // relation about Maren must also report Maren in characters[] — which is what a
  // real extraction does.
  const chars = ((opts && opts.characters) || []).map(n => ({ name: n, present: true }));
  nextBody = { characters: chars, scene: {}, sceneState: {}, ...(relations !== undefined ? { relations } : {}) };
  const uid = (opts && opts.uid) || ('pg:test-' + (++uidN));
  await page.evaluate(({ prose, uid, storyId }) => {
    const s = window.state;
    if (storyId) { s.storyId = storyId; s._relationshipLedger = null; s._ledgerProcessedUids = {}; }
    s.pov = 'first_person'; s.name = 'Lirael'; s.playerName = 'Lirael';
    s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
    window._updateCharacterDisclosureLedgerForCurrent(prose, uid);
  }, { prose, uid, storyId: (opts && opts.storyId) || null });
  await settle();
  return uid;
}
const proj = aud => page.evaluate(a => window._relProject(a), aud);

console.log(`\n${'═'.repeat(80)}\nRELATION EXTRACTION (3B) — mocked\n${'═'.repeat(80)}`);

// ── prompt / token delta ──
console.log('\n PROMPT AND TOKEN DELTA');
await ingest('Lirael waited in the hall for a long while and nothing at all happened to her there.', undefined, { storyId: 'x0' });
t('relations block present in the system prompt', /RELATIONSHIPS EXPLICITLY STATED/.test(lastSys));
t('max_tokens raised 650 → 800', lastMaxTokens === 800, `got ${lastMaxTokens}`);
t('response WITHOUT relations still valid', disclosureCalls === 1);

// ── 1. named, verified speaker ──
console.log('\n 1. NAMED + VERIFIED SPEAKER');
const P1 = '"Lord Maren is my father," Lirael said, and the hall went very quiet around her words.';
await ingest(P1, [{ quote: 'Lord Maren is my father', from: 'Lord Maren', to: 'my father',
  type: 'parent_of', basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null }], { storyId: 'x1', characters: ['Lord Maren'] });
let a = await proj('author');
t('edge created from a verified named assertion', a.some(l => /lord maren/i.test(l)));
t('recorded as asserted_on_page', a.some(l => /asserted_on_page/.test(l)), a.join(' | '));

// ── 2. "your father" with a verified addressee ──
console.log('\n 2. UNNAMED "your father" + VERIFIED ADDRESSEE');
const P2 = '"Your father would kill us if he found out," Julian said to Lirael, and the lamp guttered between them.';
await ingest(P2, [{ quote: 'Your father would kill us if he found out', from: 'your father', to: 'Lirael',
  type: 'parent_of', basis: 'asserted_on_page', assertedBy: 'Julian', addressedTo: 'Lirael' }], { storyId: 'x2' });
a = await proj('author'); let pc = await proj('pc');
t('unnamed father edge exists', a.some(l => /father/.test(l)), a.join(' | '));
t('PC (verified addressee) knows it', pc.some(l => /father/.test(l)), pc.join(' | '));
t('label reads "your father" for the PC', pc.some(l => /your father/.test(l)));

// ── 3. same phrase, NO attributable addressee → fail closed ──
console.log('\n 3. NO ATTRIBUTION → FAIL CLOSED');
const P3 = 'Your father would kill us if he found out. The lamp guttered and no one owned the sentence.';
await ingest(P3, [{ quote: 'Your father would kill us if he found out', from: 'your father', to: 'Lirael',
  type: 'parent_of', basis: 'asserted_on_page', assertedBy: null, addressedTo: null }], { storyId: 'x3' });
a = await proj('author');
t('unbound possessive is NOT resolved', a.length === 0, `got ${a.length}: ${a.join(' | ')}`);

// ── 4. a LIE stays asserted_on_page, never promoted to truth ──
console.log('\n 4. A LIE IS STILL AN ASSERTION');
const P4 = '"Corwin is my brother," Julian said, lying easily to Lirael while the guards watched the door.';
await ingest(P4, [{ quote: 'Corwin is my brother', from: 'Corwin', to: 'my brother',
  type: 'sibling_of', basis: 'asserted_on_page', assertedBy: 'Julian', addressedTo: 'Lirael' }], { storyId: 'x4', characters: ['Corwin'] });
a = await proj('author');
t('assertion recorded', a.length >= 1, a.join(' | '));
t('basis is asserted_on_page, not a truth claim', a.every(l => !/seed_truth/.test(l)));
const asserter = await page.evaluate(() => {
  const L = window._relLedger(); let out = null;
  for (const k in L.edges) { const v = window._relActiveVersion(L.edges[k]); if (v && v.provenance.quote) out = v; }
  return out && { assertedBy: out.assertedBy, quote: out.provenance.quote, basis: out.basis };
});
t('speaker attributed on the version', !!(asserter && asserter.assertedBy), JSON.stringify(asserter));

// ── 5. inferred behavioural relation is author-only ──
console.log('\n 5. INFERRED IS AUTHOR-ONLY');
const P5 = 'He had raised her since the fire, and she still flinched when he reached past her for the lamp.';
await ingest(P5, [{ quote: 'He had raised her since the fire', from: 'Julian', to: 'Lirael',
  type: 'parent_of', basis: 'asserted_on_page', assertedBy: 'Julian', addressedTo: 'Lirael' }], { storyId: 'x5' });
a = await proj('author'); pc = await proj('pc'); let li = await proj('li');
t('behavioural description demoted to inferred', a.some(l => /inferred/.test(l)), a.join(' | '));
t('inferred edge hidden from PC and LI', pc.length === 0 && li.length === 0);

// ── 6. unknown type dropped ──
console.log('\n 6. UNKNOWN TYPE');
await ingest('"Maren is my nemesis," Lirael said, and she meant every syllable of it that evening.',
  [{ quote: 'Maren is my nemesis', from: 'Maren', to: 'Lirael', type: 'nemesis_of', basis: 'asserted_on_page',
     assertedBy: 'Lirael', addressedTo: null }], { storyId: 'x6' });
t('unknown relationship type dropped', (await proj('author')).length === 0);

// ── 7. malformed entry alongside valid character disclosure ──
console.log('\n 7. MALFORMED ENTRY IS ISOLATED');
nextBody = { characters: [{ name: 'Sera', present: true, newLayer: 'keeps the west ledger' }],
  scene: {}, sceneState: {},
  relations: [ null, { quote: 42 }, { from: 'A' },
    { quote: 'Sera is my sister', from: 'Sera', to: 'my sister', type: 'sibling_of',
      basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null } ] };
await page.evaluate(({ prose }) => {
  const s = window.state; s.storyId = 'x7'; s._relationshipLedger = null; s._ledgerProcessedUids = {};
  s.pov = 'first_person'; s.name = 'Lirael'; s.playerName = 'Lirael';
  window._updateCharacterDisclosureLedgerForCurrent(prose, 'pg:malformed');
}, { prose: '"Sera is my sister," Lirael said, and the west ledger stayed shut on the table between them.' });
await settle();
const disclosureOk = await page.evaluate(() => !!(window.state._characterDisclosureLedger || {})['sera']);
t('character disclosure still applied', disclosureOk);
t('valid relation still ingested', (await proj('author')).some(l => /sera/i.test(l)));
t('UID marked processed despite bad entries',
  await page.evaluate(() => !!(window.state._ledgerProcessedUids || {})['x7::pg:malformed']));

// ── 8. four-entry cap ──
console.log('\n 8. CAP');
const P8 = '"Ada is my sister," Lirael said. "Bea is my sister. Cyd is my sister. Dee is my sister. Eve is my sister."';
await ingest(P8, ['Ada', 'Bea', 'Cyd', 'Dee', 'Eve'].map(n => ({
  quote: n + ' is my sister', from: n, to: 'my sister', type: 'sibling_of',
  basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null })), { storyId: 'x8', characters: ['Ada','Bea','Cyd','Dee','Eve'] });
const capped = await proj('author');
t('at most 4 relations ingested', capped.length <= 4, `got ${capped.length}`);
t('the 5th was dropped', !capped.some(l => /eve/i.test(l)));

// ── 9/10/11. hooks, dedup, replacement CG UID ──
console.log('\n 9-11. HOOKS, DEDUP, CG REPLACEMENT');
const P9 = '"Maren is my father," Lirael said, and the hall went quiet as the guards turned toward her voice.';
const rel9 = [{ quote: 'Maren is my father', from: 'Maren', to: 'my father', type: 'parent_of',
  basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null }];
disclosureCalls = 0;
await ingest(P9, rel9, { storyId: 'x9', uid: 'pg:lit-1', characters: ['Maren'] });
const afterLit = disclosureCalls;
await ingest(P9, rel9, { uid: 'pg:lit-1', characters: ['Maren'] });                 // same UID again
t('literary hook ingested', (await proj('author')).some(l => /maren/i.test(l)));
t('same UID does not call the model again', disclosureCalls === afterLit, `calls=${disclosureCalls}`);
await ingest(P9, rel9, { uid: 'cg:plan-A', characters: ['Maren'] });                // CG UID
t('CG hook ingests under its own UID', disclosureCalls === afterLit + 1, `calls=${disclosureCalls}`);
await ingest(P9, rel9, { uid: 'cg:plan-B', characters: ['Maren'] });                // replacement plan
t('replacement CG UID ingests again', disclosureCalls === afterLit + 2, `calls=${disclosureCalls}`);

// ── retryability of a top-level failure ──
console.log('\n RETRYABILITY');
disclosureCalls = 0;
nextBody = 'HTTP_FAIL';
await page.evaluate(({ prose }) => {
  const s = window.state; s.storyId = 'xr'; s._ledgerProcessedUids = {};
  window._updateCharacterDisclosureLedgerForCurrent(prose, 'pg:retry');
}, { prose: P9 });
await settle();
t('failed response not marked processed',
  !(await page.evaluate(() => !!(window.state._ledgerProcessedUids || {})['xr::pg:retry'])));
nextBody = { characters: [], scene: {}, sceneState: {}, relations: rel9 };
await page.evaluate(({ prose }) => window._updateCharacterDisclosureLedgerForCurrent(prose, 'pg:retry'), { prose: P9 });
await settle();
t('retried and then marked processed',
  await page.evaluate(() => !!(window.state._ledgerProcessedUids || {})['xr::pg:retry']));

await browser.close();
console.log(`\n COST — ${attempts.length} intercepted, 0 issued, ${attempts.filter(x => x.paid).length} paid blocked.`);
console.log(`\n${'─'.repeat(80)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
