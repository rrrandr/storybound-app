// AUDIT — does _buildActiveSceneEntities distort state by being called repeatedly?
//
// It runs inside _buildSceneAndPlotContext, which has seven production call sites across
// three audiences, so a single scene can invoke it many times. It writes
// _sceneEntityState[name] on every invocation. The question is whether those writes are
// IDEMPOTENT (same inputs → same stored value) or ACCUMULATIVE (each call moves the
// number), and whether caller order matters.
//
// Read-only audit: this measures behaviour, it does not change it.
//
// usage: node _entity_salience_audit.mjs
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
await page.waitForFunction(() => window.state && window.StoryboundOrchestration, { timeout: 40000 });

const out = [];
const log = (...a) => { console.log(...a); };

// PRESENT = named in the current prose (recompute path).
// ABSENT  = last seen two turns ago, not in prose (decay path).
const PROSE = 'Lord Theron waited by the shrine and Theron said nothing while the ash moved across the stones.';

const scenario = (calls, opts) => page.evaluate(({ calls, PROSE, opts }) => {
  const s = window.state;
  s.storyId = 'sal_audit';
  s.turnCount = 5;
  s._sceneEntityStoryId = 'sal_audit';
  s.npcSpecies = { 'Lord Theron': { species: 'human', confidence: 'canonical', sightings: 1 },
                   'Kestrel': { species: 'human', confidence: 'canonical', sightings: 1 } };
  s.secondaryCharacters = { antagonists: ['Kestrel'], rivals: [], observers: [] };
  s.liCandidates = [];
  s.scenes = [{ title: '', synopsis: '', text: PROSE, fateCard: null }];
  // Kestrel: present in the roster, NOT in prose, last seen at turn 3 → decay path.
  s._sceneEntityState = {
    'Kestrel': { lastSeenTurn: 3, salience: 0.80, role: 'antagonist', emotionalCharge: 'hostile' }
  };
  const O = window.StoryboundOrchestration;
  const before = JSON.stringify(s.npcSpecies);
  for (const aud of calls) { try { O.buildSceneAndPlotContext(s, { audience: aud }); } catch (_) {} }
  return {
    entState: JSON.parse(JSON.stringify(s._sceneEntityState)),
    npcSpeciesChanged: before !== JSON.stringify(s.npcSpecies),
    npcSpecies: JSON.parse(JSON.stringify(s.npcSpecies))
  };
}, { calls, PROSE, opts: opts || {} });

console.log(`\n${'═'.repeat(84)}\n_buildActiveSceneEntities — MUTATION AUDIT\n${'═'.repeat(84)}`);

// ── 1 build vs 7 builds in the SAME turn ──
const one = await scenario(['author']);
const seven = await scenario(['author', 'author', 'li', 'pc', 'pc', 'li', 'author']);
console.log('\n 1 BUILD vs 7 BUILDS (same turn, identical scene state)\n');
console.log('   entity      after 1 build      after 7 builds     drift');
console.log('   ' + '─'.repeat(66));
for (const name of Object.keys(one.entState)) {
  const a = one.entState[name].salience, b = seven.entState[name].salience;
  console.log(`   ${name.padEnd(12)} ${String(a.toFixed(6)).padEnd(18)} ${String(b.toFixed(6)).padEnd(18)}`
    + (Math.abs(a - b) > 1e-9 ? `✗ ${(b - a).toFixed(6)}` : 'none'));
  out.push({ name, one: a, seven: b, drift: b - a });
}

// ── caller ORDER ──
const fwd = await scenario(['author', 'pc', 'li']);
const rev = await scenario(['li', 'pc', 'author']);
console.log('\n CALLER ORDER (author→PC→LI vs LI→PC→author)\n');
let orderDiff = false;
for (const name of Object.keys(fwd.entState)) {
  const a = fwd.entState[name].salience, b = rev.entState[name].salience;
  const d = Math.abs(a - b) > 1e-9;
  if (d) orderDiff = true;
  console.log(`   ${name.padEnd(12)} fwd=${a.toFixed(6)}  rev=${b.toFixed(6)}  ${d ? '✗ DIFFERS' : 'same'}`);
}
console.log(`   → order ${orderDiff ? 'CHANGES' : 'does not change'} stored salience`
  + ' (same count either way, so this isolates order from call-count)');

// ── prompt-build mutations survive with no finalized scene ──
const nofinal = await scenario(['author']);
console.log('\n MUTATION WITHOUT A FINALIZED SCENE');
console.log(`   a single prompt build wrote ${Object.keys(nofinal.entState).length} entity record(s)`
  + ' with no scene finalized, no model call, and nothing rendered');
console.log(`   npcSpecies mutated by the context build: ${nofinal.npcSpeciesChanged ? '✗ YES' : 'no'}`);

// ── failed generation / retry ──
const failRetry = await page.evaluate(({ PROSE }) => {
  const s = window.state;
  s.storyId = 'sal_fail'; s.turnCount = 5; s._sceneEntityStoryId = 'sal_fail';
  s.npcSpecies = { 'Kestrel': { species: 'human', confidence: 'canonical', sightings: 1 } };
  s.secondaryCharacters = { antagonists: ['Kestrel'], rivals: [], observers: [] };
  s.liCandidates = []; s.scenes = [{ text: PROSE }];
  s._sceneEntityState = { 'Kestrel': { lastSeenTurn: 3, salience: 0.80, role: 'antagonist', emotionalCharge: '' } };
  const O = window.StoryboundOrchestration;
  O.buildSceneAndPlotContext(s, { audience: 'author' });          // attempt 1 — "fails"
  const afterFail = s._sceneEntityState['Kestrel'].salience;
  O.buildSceneAndPlotContext(s, { audience: 'author' });          // retry
  const afterRetry = s._sceneEntityState['Kestrel'].salience;
  // save/restore after prompt construction, before any finalization
  const clone = JSON.parse(JSON.stringify({ ...s }));
  return { afterFail, afterRetry,
    survivesSave: !!(clone._sceneEntityState && clone._sceneEntityState['Kestrel']),
    savedSalience: clone._sceneEntityState && clone._sceneEntityState['Kestrel'].salience };
}, { PROSE });
console.log('\n FAILED GENERATION + RETRY');
console.log(`   salience after failed attempt : ${failRetry.afterFail.toFixed(6)}  (started at 0.800000)`);
console.log(`   salience after retry          : ${failRetry.afterRetry.toFixed(6)}`);
console.log(`   → a failed generation ${failRetry.afterFail !== 0.8 ? 'LEAVES a mutation behind' : 'leaves nothing behind'}`);
console.log(`   → the retry ${failRetry.afterRetry !== failRetry.afterFail ? 'COMPOUNDS it further' : 'is idempotent'}`);
console.log('\n SAVE / RESTORE AFTER PROMPT BUILD, BEFORE FINALIZATION');
console.log(`   prompt-build-induced salience persists into the snapshot: `
  + `${failRetry.survivesSave ? '✗ YES' : 'no'} (${failRetry.savedSalience})`);

await browser.close();
console.log(`\n COST — ${attempts.length} intercepted, 0 issued, ${attempts.filter(a => a.paid).length} paid blocked.\n`);
