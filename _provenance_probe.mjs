// _provenance_probe.mjs — FREE. Captures BOTH the Scene-1 and Scene-2 Author payloads at the
// CURRENT build and answers Roman's provenance questions from delivered text, not source.
// Author stubbed. No prose bought.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);
const OUTDIR = '_validate_out/provenance';
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log('[preflight] output dir writable: ' + OUTDIR);

const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));
const STUB = 'The clearing held its breath. She said my name once. I did not answer.';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

let phase = 's1', got = { s1: null, s2: null };
await page.route('**/api/**', async route => {
  const r = route.request(); if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  if (isAuthor(sys, usr, b.model || b.preferredModel)) {
    if (!got[phase]) {
      got[phase] = sys + '\n=====USER=====\n' + usr;
      fs.writeFileSync(`${OUTDIR}/payload_${phase}.txt`, got[phase]);
      log(`  [${phase}] payload captured ${got[phase].length} chars`);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: STUB }) });
  }
  return route.continue();
});

let loaded = false;
for (let a = 1; a <= 3 && !loaded; a++) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.state && window.StoryPagination && window.STARTER_STORIES, { timeout: 90000 });
    loaded = true;
  } catch (e) { log('  load attempt ' + a + ' failed: ' + e.message.slice(0, 60)); }
}
if (!loaded) { await browser.close(); throw new Error('page never loaded'); }
await page.waitForTimeout(600);
await page.evaluate(() => {
  const s = window.state;
  window._devBypass = true; s.picks = s.picks || {};
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies'].forEach(k => s.picks[k] = def[k]);
  s.world = def.world; s.worldSubtype = def.worldSubtype; s.flavor = def.flavor; s.dynamic = def.dynamic;
  s._starterId = def.id; s.is_starter_story = true; s.immutableTitle = def.title;
  s.archetype = { primary: def.archetype, modifier: null };
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  s.loveInterest = 'Male'; s.liGender = 'male'; s.playerMask = 'OPEN_VEIN';
  s.storyLength = 'fling'; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
  s.previewActive = false; s._skipCorridorValidation = true; s.intensity = 'Steamy'; s.pov = 'first_person';
  s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.picks.identity = s.identity;
  s._pcLookSkipped = true; s.pcLookLocked = true; s.renderMode = 'literary'; s.currentEngine = 'literary';
  if (typeof window.scheduleSpeculativePreload === 'function') window.scheduleSpeculativePreload = function () {};
});
log('[probe] scene 1…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 600000 && !got.s1; w += 3000) await page.waitForTimeout(3000);
await page.waitForTimeout(9000);
phase = 's2';
await page.evaluate(() => {
  const s = window.state;
  s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
  s._petitionEmergenceFired = true; s._deckExamineFired = true;
});
await page.evaluate(() => {
  document.getElementById('actionInput').value = 'I try to explain what happened.';
  document.getElementById('dialogueInput').value = '';
  const b = document.getElementById('submitBtn'); b.disabled = false; b.click();
});
for (let w = 0; w < 600000 && !got.s2; w += 3000) await page.waitForTimeout(3000);
await page.waitForTimeout(4000);
await browser.close();

const S1 = got.s1 || '', S2 = got.s2 || '';
console.log('\n════ PROVENANCE ════');
console.log(`  scene1 payload: ${S1.length}   scene2 payload: ${S2.length}`);
const cnt = (t, re) => (t.match(re) || []).length;
const row = (n, re) => console.log(`  ${String(cnt(S1, re)).padStart(4)} | ${String(cnt(S2, re)).padStart(4)}   ${n}`);
console.log('\n   S1 |  S2   term (counts in the DELIVERED payload)');
row('"elder" (any case)', /\belders?\b/gi);
row('Dohkar', /Dohkar/gi);
row('Profer / Chayr / Fellor / Provast', /Profer|Chayr|Fellor|Provast/gi);
row('"Never use \\"Elder\\"" prohibition', /Never use "Elder"/gi);
row('father', /\bfather\b/gi);
row('abandon*', /abandon\w*/gi);
row('"left once" / left her', /left once|left her\b/gi);
row('lineage', /lineage/gi);
row('LI must exist as PHYSICAL SENSORY PERSON', /PHYSICAL, SENSORY PERSON/gi);
row('DESIRE-ORIENTED PERCEPTION', /DESIRE-ORIENTED/gi);
row('attraction_manifestation', /attraction_manifestation/gi);
row('WANTING vs APPRECIATING', /WANTING vs APPRECIATING/gi);
row('NOTICE FILTER', /NOTICE FILTER/gi);
row('LI TEXTURE BEAT', /LI TEXTURE BEAT/gi);
row('ISSUE 1 OWNERSHIP (Julian strongest charge)', /ISSUE 1 OWNERSHIP/gi);
row('RELATIONSHIP PRESENCE (narrowed rule)', /RELATIONSHIP PRESENCE/gi);
row('alignment-sense', /alignment.sense/gi);
row('mouth-band / seal', /mouth.band|SACRIFICIANT SEAL/gi);
row('remove/tear the band instruction', /tear (?:it|the band)|remove the (?:band|seal)|break the seal/gi);
row('no visible magical effect (canon)', /NO visible magical effect/gi);
row('PETITION FATE frozen closer', /Petition Fate" is inscribed/gi);
row('CONTEXTUAL WISH TURN', /CONTEXTUAL WISH TURN/gi);

console.log('\n──── BLOCKS PRESENT IN SCENE 2 BUT NOT SCENE 1 (headers) ────');
const heads = t => new Set((t.match(/^[ \t]*[A-Z][A-Z0-9 ,'"\-—/()&+.]{10,70}(?=:|\s—|\s\()/gm) || []).map(x => x.trim()));
const h1 = heads(S1), h2 = heads(S2);
const only2 = [...h2].filter(x => !h1.has(x)).slice(0, 45);
only2.forEach(x => console.log('  + ' + x.slice(0, 80)));
console.log(`\n  (${only2.length} shown; S1 headers ${h1.size}, S2 headers ${h2.size})`);
