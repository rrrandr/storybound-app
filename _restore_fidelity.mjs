// RESTORE FIDELITY PROBE — free. Diagnoses the branch harness's RESTORE MISMATCH.
//
// The branch test snapshots state after Scene 1 and resumes the second arm from it. The
// resume aborted because the re-stringified state did not hash to the origin. Rather than
// pay for another Scene 1 + arm to find out why, reproduce the whole shape with stubs and
// print which keys actually differ.
//
// usage: node _restore_fidelity.mjs
import { chromium } from 'playwright-core';
import crypto from 'crypto';

const sha = t => crypto.createHash('sha256').update(String(t || '')).digest('hex').slice(0, 12);
const STUB_PARA = 'The clearing held its breath. Seren named her sacrifice aloud and made the wish '
  + 'she had rehearsed, and Fate answered the words as spoken. The price was taken in the same '
  + 'breath. The assembly had gathered in a loose ring and no one spoke. I kept my hands still.';
const STUB_PROSE = Array(6).fill(STUB_PARA).join('\n\n');
const isAuthor = sys => /STORYBOUND ARCHITECTURE LAWS/.test(sys);
const isStateChange = sys => /"tactical_move"|state_change_precondition/.test(sys);
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
  const content = isAuthor(sys) ? STUB_PROSE : isStateChange(sys) ? STUB_SC : '{}';
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
console.log('[probe] scene 1 …');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 180000; w += 3000) { await page.waitForTimeout(3000); if ((await pageText()).length > 1200) break; }
await page.waitForTimeout(6000);

// SNAPSHOT — identical to the branch harness.
const snap = await page.evaluate(() => ({
  state: JSON.stringify(window.state),
  pages: JSON.stringify(window.StoryPagination.getPages() || []),
}));
const origin = sha(snap.state);
console.log(`  origin ${origin}  (${snap.state.length} chars)`);

// IMMEDIATE round-trip: restore with no turn in between. If this already mismatches, the
// defect is in the snapshot/restore itself, not in anything branch A did.
const immediate = await page.evaluate((s) => {
  const parsed = JSON.parse(s.state);
  Object.keys(window.state).forEach(k => { delete window.state[k]; });
  Object.assign(window.state, parsed);
  return JSON.stringify(window.state);
}, snap);
console.log(`  immediate round-trip ${sha(immediate)}  ${sha(immediate) === origin ? 'MATCH' : 'MISMATCH'}`);

// Now advance a turn, then restore — the real branch-harness sequence.
await page.evaluate(async () => {
  if (typeof window._fireLiteraryDeckExamine === 'function') { try { await window._fireLiteraryDeckExamine(); } catch (_) {} }
});
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const a = document.getElementById('actionInput'), b = document.getElementById('submitBtn');
  if (a) a.value = 'I tear the gossamer band from my mouth and run to Seren.';
  if (b) { b.disabled = false; b.click(); }
});
for (let w = 0; w < 180000; w += 3000) { await page.waitForTimeout(3000); if (await page.evaluate(() => window.state.turnCount) >= 1) break; }
await page.waitForTimeout(6000);

const diff = await page.evaluate((s) => {
  const parsed = JSON.parse(s.state);
  Object.keys(window.state).forEach(k => { delete window.state[k]; });
  Object.assign(window.state, parsed);
  const after = window.state;
  const j = v => { try { return JSON.stringify(v); } catch (_) { return '[unserializable]'; } };
  const keysBefore = Object.keys(parsed), keysAfter = Object.keys(after);
  const added = keysAfter.filter(k => !keysBefore.includes(k));
  const removed = keysBefore.filter(k => !keysAfter.includes(k));
  const changed = keysBefore.filter(k => keysAfter.includes(k) && j(parsed[k]) !== j(after[k]))
    .map(k => ({ key: k, before: String(j(parsed[k])).slice(0, 70), after: String(j(after[k])).slice(0, 70) }));
  const orderDiffers = keysBefore.join(',') !== keysAfter.join(',');
  return { restored: JSON.stringify(after), added, removed, changed, orderDiffers };
}, snap);

console.log(`\n  after-a-turn restore ${sha(diff.restored)}  ${sha(diff.restored) === origin ? 'MATCH' : 'MISMATCH'}`);
console.log(`  key order differs: ${diff.orderDiffers}`);
console.log(`  keys added: ${diff.added.length ? diff.added.join(', ') : 'none'}`);
console.log(`  keys removed: ${diff.removed.length ? diff.removed.join(', ') : 'none'}`);
console.log(`  values changed: ${diff.changed.length}`);
for (const c of diff.changed.slice(0, 12)) console.log(`    ${c.key}\n      before ${c.before}\n      after  ${c.after}`);
if (!diff.added.length && !diff.removed.length && !diff.changed.length && sha(diff.restored) !== origin)
  console.log('\n  Same keys and values, different hash => the difference is KEY ORDER only,\n'
    + '  which is not a causal difference. The guard should compare content, not the string.');
await browser.close();
