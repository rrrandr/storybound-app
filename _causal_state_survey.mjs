// CAUSAL STATE SURVEY — free. What emergent state actually EXISTS after a turn?
//
// The branch test's causal probe compared facts:null, crisis:null and the authored spine
// goal — two fields that were empty and one identical by construction. It could not have
// detected divergence. Before writing a replacement, find out which state is real and
// which of it actually MOVES when a turn is taken; a causal vector built from plausible-
// sounding field names would repeat the same mistake with more ceremony.
//
// Prints, for every top-level state key: whether it is populated, and whether it CHANGED
// across a turn. Only keys that change can carry a player's causal influence.
//
// usage: node _causal_state_survey.mjs
import { chromium } from 'playwright-core';

const STUB_PARA = 'The clearing held its breath. Seren named her sacrifice aloud and made the wish '
  + 'she had rehearsed, and Fate answered the words as spoken. The price was taken in the same breath. '
  + 'The assembly gathered in a loose ring and no one spoke. I kept my hands still.';
const STUB_PROSE = Array(6).fill(STUB_PARA).join('\n\n');
const isAuthor = sys => /STORYBOUND ARCHITECTURE LAWS/.test(sys);
const isSC = sys => /"tactical_move"|state_change_precondition/.test(sys);
const STUB_SC = JSON.stringify({
  tactical_move: 'Lirael steps between Seren and the Dohkar.',
  state_change_precondition: 'The assembly believes the rite can be closed cleanly.',
  state_change: 'The assembly now holds Lirael answerable.',
  forces_choice: 'forces Lirael to choose between naming the offering and taking the blame',
  branch_a: 'Names it.', branch_b: 'Takes the blame.',
});

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
await page.route('**/api/**', async route => {
  const r = route.request();
  if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  if (!(b.messages || []).length) return route.continue();
  const sys = String(b.messages.find(m => m.role === 'system')?.content || '');
  const content = isAuthor(sys) ? STUB_PROSE : isSC(sys) ? STUB_SC : '{}';
  let parsed = null; try { parsed = JSON.parse(content); } catch (_) {}
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    ok: true, content, ...(parsed || {}), canonical_instruction: content,
    _orchestration: { role: 'stub', model: 'stub', tier_used: 'stub', timestamp: '1970-01-01T00:00:00.000Z' },
    usage: null }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.STARTER_STORIES, { timeout: 90000 });
await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies']
    .forEach(k => s.picks[k] = def[k]);
  Object.assign(s, {
    world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
    access: 'sub', subscribed: true, fortunes: 9999999, previewActive: false,
    _skipCorridorValidation: true, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    _pcLookSkipped: true, pcLookLocked: true, renderMode: 'literary', currentEngine: 'literary',
  });
  s.picks.identity = s.identity;
  window._devBypass = true;
  if (typeof window.scheduleSpeculativePreload === 'function') window.scheduleSpeculativePreload = function () {};
});

const pageText = () => page.evaluate(() => (window.StoryPagination.getPages() || []).join('\n').replace(/<[^>]+>/g, '').trim());
const dump = () => page.evaluate(() => {
  const out = {};
  const j = v => { try { return JSON.stringify(v); } catch (_) { return '[circular]'; } };
  for (const k of Object.keys(window.state)) out[k] = j(window.state[k]);
  return out;
});

console.log('[survey] scene 1 …');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 180000; w += 3000) { await page.waitForTimeout(3000); if ((await pageText()).length > 1200) break; }
await page.waitForTimeout(6000);
const before = await dump();

console.log('[survey] taking a turn …');
await page.evaluate(async () => {
  if (typeof window._fireLiteraryDeckExamine === 'function') { try { await window._fireLiteraryDeckExamine(); } catch (_) {} }
});
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const a = document.getElementById('actionInput'), d = document.getElementById('dialogueInput'),
        b = document.getElementById('submitBtn');
  if (a) a.value = 'I tear the gossamer band from my mouth and run to Seren.';
  if (d) d.value = '"Stop — she does not know what she just offered."';
  if (b) { b.disabled = false; b.click(); }
});
for (let w = 0; w < 180000; w += 3000) { await page.waitForTimeout(3000); if (await page.evaluate(() => window.state.turnCount) >= 1) break; }
await page.waitForTimeout(6000);
const after = await dump();
await browser.close();

// Keys that MOVED across a turn are the only ones that can carry causal influence.
const moved = Object.keys(after).filter(k => before[k] !== after[k]);
const RELEVANT = /trust|suspic|relation|know|witness|secret|reveal|rite|protocol|violat|debt|sacrific|fate|bond|intim|arc|beat|fact|ledger|obligat|consequen|choice|decision|petition|tempt/i;

console.log(`\n${'═'.repeat(70)}`);
console.log(`STATE KEYS THAT MOVED ACROSS ONE TURN — ${moved.length} of ${Object.keys(after).length}`);
console.log('═'.repeat(70));
const hot = moved.filter(k => RELEVANT.test(k));
console.log(`\nCAUSALLY INTERESTING (name matches relationship/knowledge/world-state):\n`);
for (const k of hot) {
  const b = String(before[k] ?? 'undefined'), a = String(after[k] ?? 'undefined');
  console.log(`  ${k}`);
  console.log(`    before ${b.slice(0, 90)}`);
  console.log(`    after  ${a.slice(0, 90)}`);
}
console.log(`\nOTHER MOVED KEYS (${moved.length - hot.length}):`);
console.log('  ' + moved.filter(k => !RELEVANT.test(k)).join(', '));
// Named on purpose: a probe that reads these would report "no divergence" forever.
const dead = Object.keys(after).filter(k => RELEVANT.test(k) && (after[k] === 'null' || after[k] === undefined || after[k] === '{}' || after[k] === '[]'));
console.log(`\nRELEVANT-LOOKING BUT EMPTY — never use these in a causal probe:\n  ${dead.join(', ') || '(none)'}`);
