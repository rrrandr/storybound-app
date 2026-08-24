// NPC ROSTER INGESTION MIGRATION — acceptance evidence.
//
// _autoExtractNPCsFromProse used to run inside _buildSceneAndPlotContext: a context READ
// that mutated state.npcSpecies, across seven call sites and three audiences, several
// times per scene, on whatever prose slice the builder happened to hold. It now runs once
// per finalized scene from the two output seams, on the exact prose those seams supply,
// keyed by the canonical sceneUid with its OWN processed set — lexical ingestion is free
// and synchronous, paid disclosure extraction is neither, and they fail independently.
//
// The controlling test is the roster DIFF: the finalized path must register exactly what
// the old direct call registered on identical prose. Anything else is a behaviour change
// wearing a refactor's clothes.
//
// usage: node _npc_ingest_migration.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  attempts.push({ url: route.request().url(), paid: PAID.test(route.request().url()) });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: '{"characters":[],"scene":{},"sceneState":{}}' }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._ingestSceneEntities, { timeout: 40000 });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};
const settle = () => page.waitForTimeout(600);

const LIT = 'Lord Theron waited by the shrine. "You are late," Theron said, and the ash moved. '
  + 'Anjali said nothing at all, and then Anjali laughed once, which was worse. '
  + 'The Pierre stood dark behind them and the packed earth held the cold.';
const CG = 'Corwin said the gate was open. "Then we go," Corwin said. '
  + 'Marshal Vey watched from the wall and Vey did not move at all while they argued.';

console.log(`\n${'═'.repeat(82)}\nNPC INGESTION MIGRATION\n${'═'.repeat(82)}`);

// ── 1. ROSTER DIFF: old direct call vs new finalized path, identical prose ──
console.log('\n 1. ROSTER PARITY (old extractor vs finalized path)');
const diff = await page.evaluate(({ lit, cg }) => {
  const s = window.state;
  const roster = () => Object.keys(s.npcSpecies || {}).sort();
  const runOld = prose => {
    s.storyId = 'old'; s.npcSpecies = {}; s._entityProcessedUids = {};
    window._autoExtractNPCsFromProse(prose, s);      // the pre-migration invocation
    return roster();
  };
  const runNew = (prose, uid) => {
    s.storyId = 'new'; s.npcSpecies = {}; s._entityProcessedUids = {};
    window._ingestSceneEntities(prose, uid);          // the finalized-seam invocation
    return roster();
  };
  return {
    litOld: runOld(lit), litNew: runNew(lit, 'pg:lit'),
    cgOld: runOld(cg), cgNew: runNew(cg, 'cg:plan-A')
  };
}, { lit: LIT, cg: CG });
t('literary roster identical', JSON.stringify(diff.litOld) === JSON.stringify(diff.litNew),
  `old=${JSON.stringify(diff.litOld)} new=${JSON.stringify(diff.litNew)}`);
t('CG roster identical', JSON.stringify(diff.cgOld) === JSON.stringify(diff.cgNew),
  `old=${JSON.stringify(diff.cgOld)} new=${JSON.stringify(diff.cgNew)}`);
t('rosters are non-empty (the diff is meaningful)', diff.litNew.length > 0 && diff.cgNew.length > 0,
  `lit=${JSON.stringify(diff.litNew)} cg=${JSON.stringify(diff.cgNew)}`);
console.log(`      literary → ${JSON.stringify(diff.litNew)}`);
console.log(`      CG       → ${JSON.stringify(diff.cgNew)}`);

// ── 2. a literary continuation ingests ITS OWN prose ──
console.log('\n 2. CONTINUATION INGESTS ITS OWN PROSE');
// NOTE: the second addPage animates (pages.length > 1), and the animated render path
// defers triggerPostRenderHooks — so each page needs a settle before its effect is
// observable. Reading synchronously here measured the hook before it had run.
await page.evaluate(({ lit }) => {
  const s = window.state, P = window.StoryPagination;
  s.storyId = 'cont'; s.npcSpecies = {}; s._entityProcessedUids = {}; s.scenes = []; s.turnCount = 0;
  s.renderMode = 'literary';
  P.clear();
  P.addPage('<p>' + lit + '</p>', true);           // Scene 1 — fires the seam
  s.turnCount = 1; s.scenes.push({ title: '', synopsis: '', text: lit, fateCard: null });
}, { lit: LIT });
await settle();
const afterScene1 = await page.evaluate(() => Object.keys(window.state.npcSpecies || {}).sort());
await page.evaluate(({ cg }) => {
  const s = window.state;
  s.turnCount++;
  window.StoryPagination.addPage('<p>' + cg + '</p>', true);   // continuation — no scenes.push
}, { cg: CG });
await settle();
const cont = { afterScene1, afterCont: await page.evaluate(() => Object.keys(window.state.npcSpecies || {}).sort()) };
t('Scene 1 registered its own names', cont.afterScene1.some(n => /Theron|Anjali/.test(n)),
  JSON.stringify(cont.afterScene1));
t('continuation registered CONTINUATION names, not just Scene 1',
  cont.afterCont.some(n => /Corwin|Vey/.test(n)), JSON.stringify(cont.afterCont));

// ── 3. context-builder calls no longer mutate the roster ──
console.log('\n 3. CONTEXT BUILDER IS READ-ONLY W.R.T. THE ROSTER');
const ro = await page.evaluate(({ lit }) => {
  const s = window.state;
  s.storyId = 'ro'; s.npcSpecies = {}; s._entityProcessedUids = {};
  s.scenes = [{ title: '', synopsis: '', text: lit, fateCard: null }];
  const before = JSON.stringify(Object.keys(s.npcSpecies || {}).sort());
  const beforeEnt = JSON.stringify(s._sceneEntityState || {});
  const O = window.StoryboundOrchestration;
  let calls = 0;
  for (const aud of ['author', 'author', 'li', 'pc', 'pc', 'li', 'author']) {
    try { O.buildSceneAndPlotContext(s, { audience: aud }); calls++; } catch (_) {}
  }
  return { calls, before, after: JSON.stringify(Object.keys(s.npcSpecies || {}).sort()),
    entChanged: beforeEnt !== JSON.stringify(s._sceneEntityState || {}) };
}, { lit: LIT });
t('seven context builds ran', ro.calls === 7, `ran ${ro.calls}`);
t('ZERO roster mutation across all seven', ro.before === ro.after, `${ro.before} → ${ro.after}`);
console.log(`      note: _sceneEntityState salience still written by _buildActiveSceneEntities`
  + ` (changed=${ro.entChanged}) — separate concern, out of scope this commit`);

// ── 4-8. idempotency, persistence, ownership, retryability, CG replacement ──
console.log('\n 4-8. IDEMPOTENCY, PERSISTENCE, OWNERSHIP, RETRY');
const guard = await page.evaluate(({ lit, cg }) => {
  const s = window.state;
  s.storyId = 'g1'; s.npcSpecies = {}; s._entityProcessedUids = {};
  const first = window._ingestSceneEntities(lit, 'pg:g');
  const second = window._ingestSceneEntities(lit, 'pg:g');       // same UID
  const marked = !!s._entityProcessedUids['g1::pg:g'];
  // save/restore membership through the cleanState spread
  const clone = JSON.parse(JSON.stringify({ ...s }));
  const survived = !!(clone._entityProcessedUids && clone._entityProcessedUids['g1::pg:g']);
  s._entityProcessedUids = clone._entityProcessedUids;
  const afterRestore = window._ingestSceneEntities(lit, 'pg:g');  // must stay deduped
  // cross-story: a new story must not inherit membership
  s.storyId = 'g2';
  const crossStory = window._ingestSceneEntities(lit, 'pg:g');
  // fail closed, then retryable
  s.storyId = null;
  const noStory = window._ingestSceneEntities(lit, 'pg:h');
  s.storyId = 'g3'; s._entityProcessedUids = {};
  const noUid = window._ingestSceneEntities(lit, null);
  const shortProse = window._ingestSceneEntities('too short', 'pg:h');
  const retried = window._ingestSceneEntities(lit, 'pg:h');
  // CG replacement UID at the same slot
  s.storyId = 'g4'; s.npcSpecies = {}; s._entityProcessedUids = {};
  const cgA = window._ingestSceneEntities(cg, 'cg:plan-A');
  const cgB = window._ingestSceneEntities(cg, 'cg:plan-B');
  return { first: !!first, second: second === null, marked, survived, afterRestore: afterRestore === null,
    crossStory: !!crossStory, noStory: noStory === null, noUid: noUid === null,
    shortProse: shortProse === null, retried: !!retried, cgA: !!cgA, cgB: !!cgB };
}, { lit: LIT, cg: CG });
t('4. ingests once per UID', guard.first && guard.second && guard.marked);
t('5. membership survives save/restore and stays deduped', guard.survived && guard.afterRestore);
t('6. cross-story does NOT inherit membership', guard.crossStory);
t('7. missing storyId fails closed', guard.noStory);
t('7. missing sceneUid fails closed', guard.noUid);
t('7. unusable prose fails closed', guard.shortProse);
t('7. failed identity stays retryable', guard.retried);
t('8. replacement CG UID ingests independently', guard.cgA && guard.cgB);

// ── back/forward navigation and restore must not re-ingest ──
console.log('\n NAVIGATION');
await page.evaluate(({ lit }) => {
  const s = window.state, P = window.StoryPagination;
  s.storyId = 'nav'; s.npcSpecies = {}; s._entityProcessedUids = {};
  P.clear();
  P.addPage('<p>' + lit + '</p>', true);
}, { lit: LIT });
await settle();
await page.evaluate(({ cg }) => window.StoryPagination.addPage('<p>' + cg + '</p>', true), { cg: CG });
await settle();
const afterMount = await page.evaluate(() => Object.keys(window.state._entityProcessedUids).length);
for (const i of [0, 1, 0]) {
  await page.evaluate(n => window.StoryPagination.goToPage(n), i);
  await settle();
}
const nav = { afterMount, afterNav: await page.evaluate(() => Object.keys(window.state._entityProcessedUids).length) };
t('two pages → two processed entries', nav.afterMount === 2, `got ${nav.afterMount}`);
t('A→B→A navigation adds none', nav.afterNav === 2, `got ${nav.afterNav}`);

await browser.close();
console.log(`\n COST — ${attempts.length} intercepted, 0 issued, ${attempts.filter(a => a.paid).length} paid blocked.`);
console.log(`\n${'─'.repeat(82)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
