// RELATIONSHIP LEDGER (3A) — free unit tests. No model calls; the ledger makes none.
//
// The case that drives the design: "Your father would kill us if he found out" has to
// work BEFORE the father is named. An unnamed relative is therefore a first-class node,
// scoped to anchor + kinship slot rather than to the literal phrase, and reconciled —
// not replaced — once the text names them.
//
// Multiplicity is the other trap. Two unnamed siblings must never merge just because
// they share a role noun; a singular slot like father is one node, but two different
// named fathers is a contradiction to record, not a merge to perform.
//
// usage: node _rel_ledger_regression.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  attempts.push({ url: route.request().url(), paid: PAID.test(route.request().url()) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._relAssert, { timeout: 40000 });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};
const run = fn => page.evaluate(fn);
const reset = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'rel_story_1'; s._relationshipLedger = null;
  s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  s.liHiddenAgendaContext = null; s.liCoverIdentity = null; s.liConversionRevealed = false;
});

console.log(`\n${'═'.repeat(80)}\nRELATIONSHIP LEDGER (3A)\n${'═'.repeat(80)}`);

// ── 1. "Lord Maren is my father." — named endpoint, asserted on page ──
console.log('\n 1. NAMED ASSERTION');
await reset();
const r1 = await run(() => {
  const pc = window._relPcId();
  const maren = window._relEntityForName('Lord Maren');
  window._relAssert({ from: maren, to: pc, type: 'parent_of', basis: 'asserted_on_page',
    knownTo: ['author', 'pc'], quote: 'Lord Maren is my father', assertedBy: pc, sceneUid: 'pg:1' });
  return { author: window._relProject('author'), pc: window._relProject('pc'), li: window._relProject('li') };
});
t('author sees the parent edge', r1.author.some(l => /Lord Maren/.test(l) && /parent of/.test(l)));
t('author line carries basis', r1.author.some(l => /asserted_on_page/.test(l)));
t('PC sees it (PC asserted it)', r1.pc.some(l => /Lord Maren/.test(l)));
t('LI does not (not in knownTo)', !r1.li.some(l => /Lord Maren/.test(l)));

// ── 2. "Your father would kill us." — UNNAMED relative must still work ──
console.log('\n 2. UNNAMED ROLE PLACEHOLDER');
await reset();
const r2 = await run(() => {
  const pc = window._relPcId();
  const dad = window._relRoleEntity(pc, 'father');
  window._relAssert({ from: dad, to: pc, type: 'parent_of', basis: 'asserted_on_page',
    knownTo: ['author', 'pc', 'li'], quote: 'Your father would kill us', sceneUid: 'pg:1' });
  const again = window._relRoleEntity(pc, 'father');   // same slot → same node
  return { id: dad, same: dad === again,
    author: window._relProject('author'), pc: window._relProject('pc'), li: window._relProject('li') };
});
t('unnamed father is a real node', !!r2.id && /^role:pc:father$/.test(r2.id), `id=${r2.id}`);
t('id is anchor+slot scoped, not the phrase', !/your|would kill/i.test(r2.id));
t('same singular slot resolves to the same node', r2.same);
t('PC label reads "your father"', r2.pc.some(l => /your father/.test(l)), r2.pc.join(' | '));
t('author label attributes the anchor', r2.author.some(l => /protagonist's father/.test(l)), r2.author.join(' | '));
t('LI sees it as "their father"', r2.li.some(l => /their father/.test(l)), r2.li.join(' | '));

// ── 3. an unnamed LI sibling later receiving a name ──
console.log('\n 3. RECONCILIATION');
await reset();
const r3 = await run(() => {
  const li = window._relLiId();
  const sib = window._relRoleEntity(li, 'brother', { ord: 'a' });
  window._relAssert({ from: sib, to: li, type: 'sibling_of', basis: 'asserted_on_page',
    knownTo: ['author', 'li'], quote: 'my brother', sceneUid: 'pg:1' });
  const before = window._relProject('author');
  const namedId = window._relReconcileRole(sib, 'Corwin', { sceneUid: 'pg:2' });
  const L = window._relLedger();
  const roleNode = L.entities[sib];
  const after = window._relProject('author');
  // provenance of the re-pointed edge must record where it came from
  let repointed = null;
  for (const k in L.edges) {
    const v = window._relActiveVersion(L.edges[k]);
    if (v && (v.from === namedId || v.to === namedId)) repointed = v;
  }
  return { before, after, namedId, superseded: roleNode && roleNode.supersededBy,
    keptHistory: !!(L.entities[namedId] && L.entities[namedId].wasRole || []).length,
    prov: repointed && repointed.provenance, knownTo: repointed && repointed.knownTo,
    supersedes: repointed && repointed.supersedes };
});
t('placeholder before naming', r3.before.some(l => /brother/.test(l)));
t('named after reconciliation', r3.after.some(l => /Corwin/.test(l)), r3.after.join(' | '));
t('placeholder superseded, not deleted', r3.superseded === r3.namedId);
t('role history preserved on the named node', r3.keptHistory);
t('provenance records the reconciliation', !!(r3.prov && r3.prov.reconciledFrom));
t('knowledge history survives', Array.isArray(r3.knownTo) && r3.knownTo.indexOf('li') !== -1);
t('new version supersedes the old', !!r3.supersedes);

// ── 4. two distinct unnamed siblings must NOT merge ──
console.log('\n 4. MULTIPLICITY');
await reset();
const r4 = await run(() => {
  const li = window._relLiId();
  const s1 = window._relRoleEntity(li, 'sister');
  const s2 = window._relRoleEntity(li, 'sister');
  const f1 = window._relRoleEntity(li, 'mother');
  const f2 = window._relRoleEntity(li, 'mother');
  return { s1, s2, distinct: s1 !== s2, f1, f2, singularSame: f1 === f2 };
});
t('two unnamed sisters are DISTINCT nodes', r4.distinct, `${r4.s1} vs ${r4.s2}`);
t('singular slot (mother) is ONE node', r4.singularSame);

// ── 5/6. cover persona + handler epistemics ──
console.log('\n 5-6. COVER PERSONA AND HANDLER');
await reset();
const r56 = await run(() => {
  const s = window.state;
  s.liCoverIdentity = 'a wandering archivist';
  s.liHiddenAgendaContext = { agendaType: 'EXTRACTION', handler: 'the Pale Marshal', conversionCriteria: [] };
  window._relSeedFromState();
  const pcId = window._relEntityForName('a wandering archivist');
  return { author: window._relProject('author'), li: window._relProject('li'), pc: window._relProject('pc'),
    personaKind: (window._relLedger().entities[pcId] || {}).kind };
});
t('5. persona is a SEPARATE entity, not merged into the LI', r56.personaKind === 'persona');
t('5. presents_as is author+LI only', r56.author.some(l => /presents as/.test(l)) && r56.li.some(l => /presents as/.test(l)));
t('5. PC never sees the presents_as link', !r56.pc.some(l => /presents as/.test(l)), r56.pc.join(' | '));
t('6. handler edge visible to author and LI', r56.author.some(l => /Pale Marshal/.test(l)) && r56.li.some(l => /Pale Marshal/.test(l)));
t('6. handler edge invisible to PC', !r56.pc.some(l => /Pale Marshal/.test(l)));

// ── 7. spouse → former spouse supersession ──
console.log('\n 7. SUPERSESSION');
await reset();
const r7 = await run(() => {
  const pc = window._relPcId();
  const other = window._relEntityForName('Ilesa');
  window._relAssert({ from: pc, to: other, type: 'spouse_of', basis: 'asserted_on_page', knownTo: ['author', 'pc'], sceneUid: 'pg:1' });
  const mid = window._relProject('author');
  window._relAssert({ from: pc, to: other, type: 'former_spouse_of', basis: 'asserted_on_page', knownTo: ['author', 'pc'], sceneUid: 'pg:4' });
  const after = window._relProject('author');
  const L = window._relLedger();
  let versions = 0, active = 0;
  for (const k in L.edges) { versions += L.edges[k].versions.length; if (window._relActiveVersion(L.edges[k])) active++; }
  return { mid, after, versions, active };
});
t('7. spouse active before', r7.mid.some(l => /spouse of/.test(l) && !/former/.test(l)));
t('7. former spouse active after', r7.after.some(l => /former spouse of/.test(l)));
t('7. no simultaneous spouse + former spouse',
  !r7.after.some(l => /(^|—) spouse of/.test(l) && !/former/.test(l)), r7.after.join(' | '));
t('7. two versions on ONE dyad edge', r7.versions === 2 && r7.active === 1, `versions=${r7.versions} active=${r7.active}`);

// ── 8. save/restore + cross-story reset ──
console.log('\n 8. PERSISTENCE AND OWNERSHIP');
const r8 = await run(() => {
  const s = window.state;
  const clone = JSON.parse(JSON.stringify({ ...s }));          // the cleanState spread
  const survived = !!(clone._relationshipLedger && Object.keys(clone._relationshipLedger.edges).length);
  s._relationshipLedger = clone._relationshipLedger;
  const afterRestore = window._relProject('author').length;
  // a DIFFERENT story must not inherit the graph
  s.storyId = 'rel_story_2';
  const leaked = window._relProject('author').length;
  return { survived, afterRestore, leaked };
});
t('8. ledger survives the state spread', r8.survived);
t('8. restored ledger still projects', r8.afterRestore > 0);
t('8. ownership stamp blocks cross-story reuse', r8.leaked === 0, `leaked ${r8.leaked} edge(s)`);

// ── 9. missing identity fails closed ──
console.log('\n 9. FAIL CLOSED');
const r9 = await run(() => {
  const s = window.state;
  s.storyId = null; s._relationshipLedger = null;
  const pc = window._relPcId();
  const e = window._relEntityForName('Nobody');
  const asserted = window._relAssert({ from: pc, to: 'ent:nobody', type: 'parent_of', basis: 'seed_truth' });
  const marked = window._relMarkSceneProcessed(null);
  const ledger = window._relLedger();
  s.storyId = 'rel_story_3';
  return { e, asserted, marked, ledger };
});
t('9. no storyId → no entity created', r9.e === null);
t('9. no storyId → assertion refused', r9.asserted === null);
t('9. no sceneUid → not marked processed', r9.marked === false);
t('9. no storyId → no ledger', r9.ledger === null);

// ── 10. projections omit unknown edges entirely ──
console.log('\n 10. UNKNOWN EDGES OMITTED');
await reset();
const r10 = await run(() => {
  const li = window._relLiId();
  const secret = window._relEntityForName('the Ninth Fold');
  window._relAssert({ from: li, to: secret, type: 'works_for', basis: 'inferred', knownTo: ['author', 'pc'], sceneUid: 'pg:1' });
  return { author: window._relProject('author'), pc: window._relProject('pc'), li: window._relProject('li') };
});
t('10. inferred edge is author-only regardless of requested knownTo', r10.author.length === 1 && r10.pc.length === 0 && r10.li.length === 0,
  `author=${r10.author.length} pc=${r10.pc.length} li=${r10.li.length}`);
t('10. omission is total — no placeholder text leaks', !r10.pc.join(' ').match(/Ninth Fold|hidden|secret|redacted/i));

// ── idempotency + unknown types ──
console.log('\n IDEMPOTENCY AND VOCABULARY');
await reset();
const rx = await run(() => {
  const pc = window._relPcId(), o = window._relEntityForName('Sera');
  const first = window._relMarkSceneProcessed('pg:9');
  const seen = window._relSceneProcessed('pg:9');
  const bogus = window._relAssert({ from: pc, to: o, type: 'nemesis_of_sorts', basis: 'seed_truth' });
  window._relAssert({ from: pc, to: o, type: 'ally_of', basis: 'asserted_on_page', knownTo: ['author'], sceneUid: 'pg:1' });
  window._relAssert({ from: pc, to: o, type: 'ally_of', basis: 'asserted_on_page', knownTo: ['author'], sceneUid: 'pg:2' });
  const L = window._relLedger();
  let versions = 0; for (const k in L.edges) versions += L.edges[k].versions.length;
  return { first, seen, bogus, versions };
});
t('scene marked processed once, observable', rx.first === true && rx.seen === true);
t('unknown relationship type is DROPPED', rx.bogus === null);
t('re-asserting the same type adds no version', rx.versions === 1, `versions=${rx.versions}`);

await browser.close();
console.log(`\n COST — ${attempts.length} request(s) intercepted, 0 issued, `
  + `${attempts.filter(a => a.paid).length} paid blocked. The ledger itself makes none.`);
console.log(`\n${'─'.repeat(80)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
