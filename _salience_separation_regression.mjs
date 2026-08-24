// SALIENCE SEPARATION — evidence is written once at finalization; decay is computed
// during projection and never stored.
//
// Before: _buildActiveSceneEntities recomputed AND wrote salience on every call, and the
// decay path read the value the previous call wrote while preserving the old last-seen
// marker. Seven prompt builds in one scene therefore applied decay seven times
// (0.80 -> 0.0019 instead of 0.338), pushing entities under SALIENCE_FLOOR and removing
// them from author context.
//
// Decay is not attached to turnCount: literary INCREMENTS it, CG ASSIGNS it, OAS never
// moves it. Finalized scenes get their own monotonic ordinal instead, and a REPLACEMENT
// plan at a CG slot reuses that slot's ordinal — replacing a scene is not the reader
// experiencing another one.
//
// usage: node _salience_separation_regression.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  attempts.push({ paid: PAID.test(route.request().url()) });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: '{"characters":[],"scene":{},"sceneState":{}}' }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window._sceneOrdinalFor, { timeout: 40000 });

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};
const settle = () => page.waitForTimeout(600);

const PROSE_A = 'Kestrel waited by the shrine and Kestrel said nothing while the ash moved over the stones.';
const PROSE_B = 'The north gate stood open by morning and the ash had not settled anywhere along the wall.';

const setup = () => page.evaluate(({ PROSE_A }) => {
  const s = window.state;
  s.storyId = 'sep'; s.turnCount = 1;
  s._sceneEntityState = {}; s._sceneEntityStoryId = 'sep';
  s._entityProcessedUids = {}; s._sceneChrono = null; s._sceneChronoCurrent = 0;
  s.npcSpecies = {}; s.liCandidates = [];
  s.secondaryCharacters = { antagonists: ['Kestrel'], rivals: [], observers: [] };
  s.scenes = [{ title: '', synopsis: '', text: PROSE_A, fateCard: null }];
  window._ingestSceneEntities(PROSE_A, 'pg:s1');     // finalized scene 1
  return JSON.parse(JSON.stringify(s._sceneEntityState));
}, { PROSE_A });

const builds = auds => page.evaluate(a => {
  const s = window.state, O = window.StoryboundOrchestration;
  const before = JSON.stringify(s._sceneEntityState);
  const beforeSpecies = JSON.stringify(s.npcSpecies);
  let last = null;
  for (const aud of a) { try { last = O.buildSceneAndPlotContext(s, { audience: aud }); } catch (_) {} }
  return { before, after: JSON.stringify(s._sceneEntityState),
    speciesBefore: beforeSpecies, speciesAfter: JSON.stringify(s.npcSpecies),
    ctxHasKestrel: /Kestrel/.test(String(last || '')) };
}, auds);

console.log(`\n${'═'.repeat(84)}\nSALIENCE SEPARATION\n${'═'.repeat(84)}`);

// ── projection writes nothing ──
console.log('\n PROJECTION IS PURE');
await setup();
const one = await builds(['author']);
t('one build mutates no entity state', one.before === one.after);
t('one build mutates no npcSpecies', one.speciesBefore === one.speciesAfter);
await setup();
const seven = await builds(['author', 'author', 'li', 'pc', 'pc', 'li', 'author']);
t('seven builds mutate no entity state', seven.before === seven.after);
t('seven builds == one build, byte-for-byte', seven.after === one.after,
  `1=${one.after}\n      7=${seven.after}`);
t('_recordNPCSighting no longer runs in the builder', seven.speciesBefore === seven.speciesAfter);

// ── caller order ──
await setup(); const fwd = await builds(['author', 'pc', 'li']);
await setup(); const rev = await builds(['li', 'pc', 'author']);
t('caller order has no effect on stored state', fwd.after === rev.after);

// ── evidence content ──
console.log('\n EVIDENCE WRITTEN ONCE AT FINALIZATION');
const ev = await setup();
t('finalized scene wrote evidence for the named entity', !!ev.Kestrel, JSON.stringify(ev));
t('evidence carries a chronological ordinal', ev.Kestrel && typeof ev.Kestrel.lastSeenOrdinal === 'number');
t('salience is the at-evidence value, not decayed', ev.Kestrel && ev.Kestrel.salience > 0.5,
  ev.Kestrel && String(ev.Kestrel.salience));
const speciesRecorded = await page.evaluate(() => !!(window.state.npcSpecies || {})['Kestrel']);
t('_recordNPCSighting ran at INGESTION instead', speciesRecorded);

// ── decay is computed, not stored ──
console.log('\n DECAY IS COMPUTED, NEVER STORED');
const decay = await page.evaluate(({ PROSE_B }) => {
  const s = window.state;
  const stored0 = s._sceneEntityState.Kestrel.salience;
  // three further finalized scenes that never mention Kestrel
  window._ingestSceneEntities(PROSE_B, 'pg:s2');
  window._ingestSceneEntities(PROSE_B, 'pg:s3');
  window._ingestSceneEntities(PROSE_B, 'pg:s4');
  const storedAfter = s._sceneEntityState.Kestrel.salience;
  const O = window.StoryboundOrchestration;
  const c1 = String(O.buildSceneAndPlotContext(s, { audience: 'author' }) || '');
  for (let i = 0; i < 6; i++) O.buildSceneAndPlotContext(s, { audience: 'author' });
  const c7 = String(O.buildSceneAndPlotContext(s, { audience: 'author' }) || '');
  return { stored0, storedAfter, ord: s._sceneChronoCurrent,
    seen: s._sceneEntityState.Kestrel.lastSeenOrdinal,
    sameProjection: c1 === c7 };
}, { PROSE_B });
t('stored salience unchanged by later scenes', decay.stored0 === decay.storedAfter,
  `${decay.stored0} → ${decay.storedAfter}`);
t('chronology advanced (3 more finalized scenes)', decay.ord === 4 && decay.seen === 1,
  `ord=${decay.ord} seen=${decay.seen}`);
t('projection identical after 1 vs 7 builds', decay.sameProjection);

// ── failed generation + retry ──
console.log('\n FAILED GENERATION AND RETRY');
await setup();
const fr = await page.evaluate(() => {
  const s = window.state, O = window.StoryboundOrchestration;
  const before = JSON.stringify(s._sceneEntityState);
  O.buildSceneAndPlotContext(s, { audience: 'author' });   // attempt (fails downstream)
  const afterFail = JSON.stringify(s._sceneEntityState);
  O.buildSceneAndPlotContext(s, { audience: 'author' });   // retry
  return { before, afterFail, afterRetry: JSON.stringify(s._sceneEntityState),
    chrono: JSON.stringify(s._sceneChrono) };
});
t('failed generation leaves no mutation', fr.before === fr.afterFail);
t('retry leaves no mutation', fr.before === fr.afterRetry);

// ── save/restore ──
console.log('\n SAVE / RESTORE');
const sr = await page.evaluate(() => {
  const s = window.state;
  const clone = JSON.parse(JSON.stringify({ ...s }));
  const savedSal = clone._sceneEntityState.Kestrel.salience;
  const savedOrd = clone._sceneEntityState.Kestrel.lastSeenOrdinal;
  s._sceneEntityState = clone._sceneEntityState; s._sceneChrono = clone._sceneChrono;
  const O = window.StoryboundOrchestration;
  const before = JSON.stringify(s._sceneEntityState);
  O.buildSceneAndPlotContext(s, { audience: 'author' });
  return { savedSal, savedOrd, stable: before === JSON.stringify(s._sceneEntityState) };
});
t('evidence survives save/restore', sr.savedSal > 0.5 && typeof sr.savedOrd === 'number',
  `sal=${sr.savedSal} ord=${sr.savedOrd}`);
t('restored evidence is not compounded by projection', sr.stable);

// ── chronology: literary, CG, replacement, rerender ──
console.log('\n CHRONOLOGY ORDINALS');
const chrono = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'chrono'; s._sceneChrono = null; s._sceneChronoCurrent = 0;
  s._cgSceneUidByIndex = { '0': { uid: 'cg:planA', sig: 'a' } };
  const litA = window._sceneOrdinalFor('pg:a');
  const litAAgain = window._sceneOrdinalFor('pg:a');       // rerender / restore
  const litB = window._sceneOrdinalFor('pg:b');
  const cgA = window._sceneOrdinalFor('cg:planA');
  // replacement plan at the SAME CG slot 0
  s._cgSceneUidByIndex['0'] = { uid: 'cg:planB', sig: 'b' };
  const cgB = window._sceneOrdinalFor('cg:planB');
  const cgNewSlot = (function () {
    s._cgSceneUidByIndex['1'] = { uid: 'cg:planC', sig: 'c' };
    return window._sceneOrdinalFor('cg:planC');
  })();
  return { litA, litAAgain, litB, cgA, cgB, cgNewSlot, current: s._sceneChronoCurrent };
});
t('new literary scene allocates the next ordinal', chrono.litA === 1 && chrono.litB === 2);
t('rerender / restore reuses the same ordinal', chrono.litAAgain === chrono.litA);
t('CG scene allocates its own ordinal', chrono.cgA === 3);
t('REPLACEMENT at the same CG slot reuses its ordinal (no extra decay)', chrono.cgB === chrono.cgA,
  `cgA=${chrono.cgA} cgB=${chrono.cgB}`);
t('a new CG slot does advance chronology', chrono.cgNewSlot === 4);

// ── end to end through the real seams ──
console.log('\n REAL SEAMS: NAVIGATION DOES NOTHING');
const navi = await page.evaluate(({ PROSE_A, PROSE_B }) => {
  const s = window.state, P = window.StoryPagination;
  s.storyId = 'seams'; s.turnCount = 0; s._sceneEntityState = {}; s._sceneEntityStoryId = 'seams';
  s._entityProcessedUids = {}; s._sceneChrono = null; s._sceneChronoCurrent = 0;
  s.npcSpecies = {}; s.secondaryCharacters = { antagonists: ['Kestrel'], rivals: [], observers: [] };
  s.scenes = []; P.clear();
  P.addPage('<p>' + PROSE_A + '</p>', true);
  return { after1: JSON.stringify(s._sceneEntityState) };
}, { PROSE_A, PROSE_B });
await settle();
await page.evaluate(({ PROSE_B }) => {
  window.StoryPagination.addPage('<p>' + PROSE_B + '</p>', true);
}, { PROSE_B });
// The second addPage animates (pages.length > 1) and the animated render defers
// triggerPostRenderHooks, so the ordinal must be read AFTER the settle.
await settle();
const navi2 = { chrono: await page.evaluate(() => window.state._sceneChronoCurrent) };
const beforeNav = await page.evaluate(() => JSON.stringify(window.state._sceneEntityState));
for (const i of [0, 1, 0]) { await page.evaluate(n => window.StoryPagination.goToPage(n), i); await settle(); }
const afterNav = await page.evaluate(() => JSON.stringify(window.state._sceneEntityState));
t('two finalized literary scenes each ingested once', navi2.chrono === 2, `chrono=${navi2.chrono}`);
t('back/forward navigation changes nothing', beforeNav === afterNav);

await browser.close();
console.log(`\n COST — ${attempts.length} intercepted, 0 issued, ${attempts.filter(a => a.paid).length} paid blocked.`);
console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
