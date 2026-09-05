// _scene1_deck_probe.mjs — FREE. Which Scene-1 path OWNS the deck introduction?
// Captures the real Scene-1 Author payload with ALL deck one-shots UNFIRED (previous probes
// force-set _deckExamineFired/_petitionEmergenceFired, marking the beats already spent), and
// resolves the ownership chain: scene dilemma → Grok bridge? → frozen discovery → deck thought → UI.
// Author is STUBBED. No prose generated.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);
const OUTDIR = '_validate_out/scene1deck';
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log('[preflight] output dir writable: ' + OUTDIR);

const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

const logs = [];
page.on('console', m => { const t = m.text(); if (/DECK_MANDATE|FATE-WHISPER|DECK/.test(t)) logs.push(t.slice(0, 160)); });

let payloads = [];
await page.route('**/api/**', async route => {
  const r = route.request(); if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  if (isAuthor(sys, usr, b.model || b.preferredModel)) {
    payloads.push({ sys, usr });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '[stub]' }) });
  }
  return route.continue();
});

let loaded = false;
for (let a = 1; a <= 3 && !loaded; a++) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.state && window.STARTER_STORIES, { timeout: 90000 });
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
  // DELIBERATELY NOT SET: _deckExamineFired, _petitionEmergenceFired, _forceDeckMandate
  if (typeof window.scheduleSpeculativePreload === 'function') window.scheduleSpeculativePreload = function () {};
});

const gate = await page.evaluate(() => {
  const s = window.state;
  let frame = null;
  try { frame = (typeof window._shouldMandateSceneOneDeckFrame === 'function') ? window._shouldMandateSceneOneDeckFrame() : 'NOT EXPOSED'; } catch (e) { frame = 'THREW: ' + e.message; }
  return { frame, fateMode: s.fateMode || null, storyId: s.storyId || null,
           fateAnchorPresent: !!s.fateAnchorPresent, sceneOneDeckAtEnd: !!s._sceneOneDeckAtEnd,
           deckExamineFired: !!s._deckExamineFired, petitionFired: !!s._petitionEmergenceFired };
});

log('[probe] begin story (Scene 1, deck one-shots UNFIRED)…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 600000 && !payloads.length; w += 3000) await page.waitForTimeout(3000);
const s1 = payloads[0] || null;
const post = await page.evaluate(() => ({ sceneOneDeckAtEnd: !!window.state._sceneOneDeckAtEnd, fateAnchorPresent: !!window.state.fateAnchorPresent }));
await browser.close();

if (!s1) { console.log('❌ SCENE 1 AUTHOR CALL NEVER FIRED'); process.exit(2); }
fs.writeFileSync(`${OUTDIR}/payload_scene1.txt`, s1.sys + '\n\n=====USER=====\n\n' + s1.usr);
const hay = s1.sys + '\n' + s1.usr;
const has = q => hay.includes(q);

console.log('\n════ SCENE-1 DECK OWNERSHIP PROBE ════');
console.log('  gate BEFORE begin: ' + JSON.stringify(gate));
console.log('  state AFTER begin: ' + JSON.stringify(post));
console.log('  payload sys=' + s1.sys.length + '  usr=' + s1.usr.length);

console.log('\n──── WHICH PATH OWNS IT ────');
const rows = [
  ['_shouldMandateSceneOneDeckFrame() → frame path', gate.frame === true],
  ['TAROT INTEGRATION REQUIREMENT (normal path)', has('TAROT INTEGRATION REQUIREMENT')],
  ['ENDING PARAGRAPH STRUCTURE (MANDATORY)', has('ENDING PARAGRAPH STRUCTURE')],
  ['PENULTIMATE = specific named dilemma', has('SPECIFIC NAMED dilemma')],
  ['ordering rule "Decision FIRST"', has('DO NOT swap the order')],
  ['PLACEHOLDER PROHIBITION', has('PLACEHOLDER PROHIBITION')],
  ['NO COOLDOWN BEFORE THE FATE CLOSER', has('NO COOLDOWN BEFORE THE FATE CLOSER')],
  ['_FATE_ANCHOR_INTRO seed-line present', /Seed-line \(paraphrase freely\)/.test(hay)],
];
for (const [n, v] of rows) console.log('  ' + (v ? '✅ present' : '❌ absent ') + '   ' + n);

console.log('\n──── FROZEN vs GENERATED ────');
const frozen = [
  ['frozen discovery "hand tightened around…deck"', 'My hand tightened around'],
  ['"I didn\'t remember bringing it"', "didn’t remember bringing it"],
  ['"let the cards decide" phrasing supplied', 'letting the cards decide'],
  ['generic motivation "find a way out" hard-coded', 'find a way out'],
  ['generic "if only"', 'If only'],
];
for (const [n, q] of frozen) console.log('  ' + (has(q) ? '⚠ IN PAYLOAD' : '✅ not present') + '   ' + n);

console.log('\n──── console (deck decisions) ────');
logs.slice(0, 10).forEach(l => console.log('  ' + l));
console.log('\nfull payload → ' + OUTDIR + '/payload_scene1.txt');
