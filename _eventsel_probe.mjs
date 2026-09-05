// _eventsel_probe.mjs — FREE trace of the SCENE-PLANNER's EVENT SELECTION.
// Captures the planner call's full INPUT (event-selection instructions + milestone + precondition +
// committed facts + setting/canon + participants) and its OUTPUT (chosen event, slots, branches),
// so we can answer: WHY was broadcast exposition selected? The planner call runs for real (cheap,
// gpt-4o-mini class) because its actual choice is the object of study. The PROSE AUTHOR is stubbed.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);

// WRITE PREFLIGHT — fail in second one, not minute ten.
const OUTDIR = '_validate_out/eventsel';
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log('[preflight] output dir writable: ' + OUTDIR);

const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));
const isScenePlanner = sys => /You are the SCENE-?SPINE planner|You are the SCENE planner for an interactive story engine/.test(sys);
const STUB = 'The stall smelled of wet rope and cold iron. I set my hand on the counter and waited for her to look up. She said my name once. I did not say hers.';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

const planner = [];
await page.route('**/api/**', async route => {
  const r = route.request(); if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  if (isAuthor(sys, usr, b.model || b.preferredModel))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: STUB }) });
  if (isScenePlanner(sys)) {                       // capture INPUT + real OUTPUT, pass through
    const resp = await route.fetch({ timeout: 0 });
    const body = await resp.text();
    let out = null;
    try { const j = JSON.parse(body); out = j.content || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || null; } catch (_) {}
    const rec = { model: b.model || b.preferredModel || null, sys, usr, out };
    planner.push(rec);
    fs.writeFileSync(`${OUTDIR}/planner_${planner.length}.json`, JSON.stringify(rec, null, 2));
    log(`  [planner call ${planner.length}] captured  sys=${sys.length} usr=${usr.length} out=${out ? out.length : 'null'}`);
    return route.fulfill({ response: resp, body });
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
  window._armSubtract = false; window._armExemplars = false; window._armA50 = false; window._armStaging = false;
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

log('[probe] begin story…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 480000; w += 3000) { await page.waitForTimeout(3000); if (planner.length) break; }
await page.waitForTimeout(8000);

// continuation turn — gates armed (preflight lesson)
await page.evaluate(() => {
  const s = window.state;
  s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
  s._petitionEmergenceFired = true; s._deckExamineFired = true;
});
const before = planner.length;
await page.evaluate(() => {
  document.getElementById('actionInput').value = 'I go to the market stall to pass the note.';
  document.getElementById('dialogueInput').value = '';
  const b = document.getElementById('submitBtn'); b.disabled = false; b.click();
});
for (let w = 0; w < 480000; w += 3000) { await page.waitForTimeout(3000); if (planner.length > before) break; }
await page.waitForTimeout(4000);
const ms = await page.evaluate(() => { const s=window.state; const j=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return String(v);}};
  return { curMilestone: j(s._currentMilestone||null), aPlotMilestones: j((s.aPlot&&s.aPlot.milestones)||null), planScene: j(s._sceneAssignment||null) }; });
fs.writeFileSync(OUTDIR+"/milestone.json", JSON.stringify(ms,null,2));
await browser.close();

log(`[probe] planner calls captured: ${planner.length}` + (planner.length ? '' : '  ⚠ PLANNER NEVER RAN'));
if (!planner.length) process.exit(2);

const P = planner[planner.length - 1];   // the continuation's selection
console.log('\n════ EVENT SELECTION TRACE ════');
console.log('model: ' + P.model + '   sys=' + P.sys.length + '   usr=' + P.usr.length);

console.log('\n──── CHOSEN OUTPUT ────');
try {
  const o = JSON.parse(String(P.out).replace(/```json?/gi, '').replace(/```/g, '').trim());
  for (const k of Object.keys(o)) console.log('  ' + k + ' = ' + JSON.stringify(o[k]).slice(0, 300));
} catch (_) { console.log(String(P.out).slice(0, 1400)); }

// What was the planner GIVEN? Pull the labelled context sections out of the user message.
console.log('\n──── INPUT CONTEXT (labelled sections found in the user message) ────');
const lines = P.usr.split('\n');
const heads = lines.map((l, i) => [i, l]).filter(([, l]) => /^[A-Z][A-Z \-_/&()0-9]{6,}:?\s*$|^[A-Z][A-Z \-_/&()0-9]{6,}:/.test(l.trim()));
for (const [i, l] of heads.slice(0, 40)) {
  const body = lines.slice(i + 1, i + 4).join(' ').replace(/\s+/g, ' ').trim();
  console.log('  • ' + l.trim().slice(0, 70) + (body ? '  →  ' + body.slice(0, 150) : ''));
}

console.log('\n──── DOES THE INPUT CONSTRAIN *HOW* THE EVENT HAPPENS? ────');
const probes = [
  ['milestone supplied', /MILESTONE/i],
  ['precondition / before-state', /precondition|still FALSE|BEFORE/i],
  ['target after-state', /exit ?state|after|becomes TRUE/i],
  ['setting / location available', /SETTING|LOCATION|where/i],
  ['participants / cast available', /PARTICIPANTS|CAST|PRESENT/i],
  ['canon / world constraints', /canon|world ?truth|constraint|FATELANDS/i],
  ['DRAMATIC CAUSATION required', /dramatic|caused by a (?:person|character)|who does it|agent|actor must/i],
  ['bans cheap exposition mechanisms', /announc|broadcast|proclamation|crier|loudspeaker|overheard|convenient/i],
  ['requires a HUMAN AGENT for the change', /a character must|someone must|by a person|agent of the change/i],
];
for (const [n, re] of probes) console.log('  ' + (re.test(P.sys + '\n' + P.usr) ? '✅ present' : '❌ ABSENT ') + '   ' + n);
console.log('\nfull records → ' + OUTDIR + '/planner_*.json');
