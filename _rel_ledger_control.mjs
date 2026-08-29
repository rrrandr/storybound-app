// POSITIVE CONTROL — is the relationship ledger sound, or is the regression fixture stale?
//
// _rel_ledger_regression fails 30/10 identically on this tree, on ae07d38 and on 65e614e — so it
// predates the portfolio work. Ten symptoms are not ten bugs; this drives the CURRENT production
// API once, end to end, and asks whether edges, versions, supersession and persistence actually
// work. If they do, the fixture is stale and says so by contrast.
//
// usage: node _rel_ledger_control.mjs   (needs vercel dev on :3000) — no model calls
import { chromium } from 'playwright-core';
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
try {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
  const res = await fetch('http://localhost:3000/', { signal: ctl.signal }); clearTimeout(timer);
  if (!res.ok) throw new Error('HTTP ' + res.status);
} catch (e) { console.error('\n  ✗ INFRASTRUCTURE: ' + e.message + '\n'); process.exit(2); }

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
let intercepted = 0, escaped = [];
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
await page.route('**/api/**', route => { intercepted++;
  return route.fulfill({ status:200, contentType:'application/json', body:'{}' }); });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._relAssert === 'function', { timeout: 30000 });

console.log(`\n${'═'.repeat(84)}\nRELATIONSHIP LEDGER — POSITIVE CONTROL ON THE CURRENT API\n${'═'.repeat(84)}\n`);

console.log(' 1 · THE STALE ASSUMPTION, STATED');
const stale = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { storyId: 'ctl-1', _relationshipLedger: null, loveInterestName: 'Julian' });
  return { withoutCreate: window._relEntityForName('Lord Maren'),
           withCreate: window._relEntityForName('Lord Maren', { create: true }) };
});
t('1a: _relEntityForName WITHOUT an explicit create returns null — it resolves, it does not mint',
  stale.withoutCreate === null, JSON.stringify(stale.withoutCreate));
t('1b: …and WITH create it returns a canonical id',
  typeof stale.withCreate === 'string' && stale.withCreate.length > 0, JSON.stringify(stale.withCreate));

console.log('\n 2 · THE CONTROL — create, ingest, version, restore');
const ctl = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { storyId: 'ctl-2', _relationshipLedger: null, loveInterestName: 'Julian' });
  // 1 · two canonical entities, explicitly
  const pc = window._relPcId();
  const maren = window._relEntityForName('Lord Maren', { create: true });
  // 2 · one verified relationship edge
  window._relAssert({ from: maren, to: pc, type: 'parent_of', basis: 'asserted_on_page',
    knownTo: ['author', 'pc'], quote: 'Lord Maren is my father', assertedBy: pc, sceneUid: 'pg:1' });
  const L1 = window._relLedger();
  const edgeKeys = Object.keys(L1.edges || {});
  const countActive = L => Object.keys(L.edges || {}).reduce((n, k) =>
    n + ((L.edges[k].versions || []).filter(v => !v.supersededBy && v.active !== false).length), 0);
  const countVersions = L => Object.keys(L.edges || {}).reduce((n, k) =>
    n + ((L.edges[k].versions || []).length), 0);
  const before = { entities: Object.keys(L1.entities || {}), edges: edgeKeys.length,
                   versions: countVersions(L1), active: countActive(L1),
                   authorLines: window._relProject('author') };
  // 3 · supersession: the same dyad, a later contradicting assertion. The type must be one
  // REL_TYPES actually declares — an unrecognised type is DROPPED, correctly, and a fixture that
  // uses one is measuring its own spelling rather than the ledger. (estranged_from is not a type.)
  window._relAssert({ from: maren, to: pc, type: 'guardian_of', basis: 'asserted_on_page',
    knownTo: ['author', 'pc'], quote: 'he raised me, whatever else he was', assertedBy: pc, sceneUid: 'pg:2' });
  const L2 = window._relLedger();
  const afterSupersede = { edges: Object.keys(L2.edges || {}).length,
                           versions: countVersions(L2), active: countActive(L2) };
  // 4 · serialise / restore, exactly as a save file does
  const wire = JSON.stringify(s._relationshipLedger);
  s._relationshipLedger = null;
  const wiped = window._relLedger(false);
  s._relationshipLedger = JSON.parse(wire);
  const L3 = window._relLedger();
  const after = { entities: Object.keys(L3.entities || {}), edges: Object.keys(L3.edges || {}).length,
                  versions: countVersions(L3), active: countActive(L3),
                  authorLines: window._relProject('author') };
  return { before, afterSupersede, after, wiped: wiped ? Object.keys(wiped.entities || {}).length : null,
           pc, maren, wireBytes: wire.length };
});
t('2a: two canonical entities exist and are distinct',
  ctl.before.entities.includes(ctl.pc) && ctl.before.entities.includes(ctl.maren) && ctl.pc !== ctl.maren,
  JSON.stringify({ pc: ctl.pc, maren: ctl.maren, entities: ctl.before.entities }));
t('2b: one ingested edge yields ONE edge with at least one version, and it is active',
  ctl.before.edges === 1 && ctl.before.versions >= 1 && ctl.before.active >= 1,
  JSON.stringify(ctl.before));
t('2c: the author projection renders it',
  ctl.before.authorLines.some(l => /Lord Maren/.test(l)),
  JSON.stringify(ctl.before.authorLines).slice(0, 200));
t('2d: a second declared relationship on the same dyad is recorded — a new version or a second ' +
  'typed edge, never silently dropped',
  (ctl.afterSupersede.versions > ctl.before.versions || ctl.afterSupersede.edges > ctl.before.edges)
    && ctl.afterSupersede.active >= 1,
  JSON.stringify({ before: ctl.before, after: ctl.afterSupersede }));
t('2e: after serialise/restore the entities, edge, versions and active count are unchanged',
  JSON.stringify(ctl.after.entities.sort()) === JSON.stringify(ctl.before.entities.sort())
    && ctl.after.edges === ctl.afterSupersede.edges
    && ctl.after.versions === ctl.afterSupersede.versions
    && ctl.after.active === ctl.afterSupersede.active,
  JSON.stringify({ before: ctl.afterSupersede, after: ctl.after }));
t('2f: …and the restored ledger still projects the edge',
  ctl.after.authorLines.some(l => /Lord Maren/.test(l)),
  JSON.stringify(ctl.after.authorLines).slice(0, 200));

console.log('\n 3 · WHAT THE BATCH WILL DEPEND ON — authorProfile and promoted facets survive');
const pf = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { storyId: 'ctl-3', _relationshipLedger: null, loveInterestName: 'Julian' });
  const id = window._relEntityForName('Mara Dunn', { create: true });
  const F = (category, truth) => ({ category, canonical_truth: truth,
    possible_pressures: [{ text: 'a procedure the house performs every day' }],
    forbidden_restatements: [] });
  const att = window._attachPortfolio(id, [
    F('worldview','Paperwork repeated daily rarely earns her full attention.'),
    F('insecurity','Deference paid to someone else makes her attentive to her standing.'),
    F('habit',"She turns another person's error into an instruction."),
    F('contradiction','On what a signature costs she assumes an unearned authority.'),
    F('value','With people who hold no leverage she is unexpectedly generous.')],
    { provenance: 'generated_cast' });
  const read = () => {
    const L = window._relLedger();
    const e = L.entities[id] || {};
    const ap = e.authorProfile || {};
    return { status: ap.status, provenance: ap.provenance, n: (ap.cPlusFacets || []).length,
             fingerprint: ap.fingerprint || null,
             selectable: (window._facetsForCharacter({ id, label: 'Mara Dunn', aliases: ['Mara Dunn'] },
               s, { sceneNumber: 2 }) || []).length,
             origins: [...new Set((window._facetsForCharacter({ id, label: 'Mara Dunn', aliases: ['Mara Dunn'] },
               s, { sceneNumber: 2 }) || []).map(f => f.origin))] };
  };
  const before = read();
  const wire = JSON.stringify(s._relationshipLedger);
  s._relationshipLedger = null;
  s._relationshipLedger = JSON.parse(wire);
  const after = read();
  return { att, before, after, id };
});
t('3a: a portfolio attaches and is selectable', pf.att.ok === true
  && pf.before.status === 'ready' && pf.before.n === 5 && pf.before.selectable === 5,
  JSON.stringify({ att: pf.att, before: pf.before }));
t('3b: authorProfile survives the ledger round trip — status, provenance, fingerprint, facet count',
  pf.after.status === pf.before.status && pf.after.provenance === pf.before.provenance
    && pf.after.n === pf.before.n && pf.after.fingerprint === pf.before.fingerprint,
  JSON.stringify({ before: pf.before, after: pf.after }));
t('3c: …and the promoted facets are still SELECTABLE after restore, as generated_cast',
  pf.after.selectable === 5 && JSON.stringify(pf.after.origins) === '["generated_cast"]',
  JSON.stringify(pf.after));

console.log('\n 4 · COST');
t('4a: the ledger makes no model calls; nothing escaped',
  escaped.length === 0, JSON.stringify(escaped.slice(0, 2)));
console.log(`   ${intercepted} request(s) intercepted, 0 issued`);

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
