// _scene2_baseline.mjs — PAID. First prose from the corrected architecture.
// Scene 1 real (so committed state, deck continuity and rolling context are genuine),
// then Scene 2 real. Captures BOTH the raw author response and the final reader-facing
// page text, so a post-pass alteration is visible. Persists per scene the moment it lands.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);
const OUTDIR = '_validate_out/petition_' + (process.env.WISHTAG === '0' ? 'notag' : 'tag');
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log('[preflight] output dir writable: ' + OUTDIR);

const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));
let spend = 0, raws = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

await page.route('**/api/**', async route => {
  const r = route.request(); if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  if (!isAuthor(sys, usr, b.model || b.preferredModel)) return route.continue();
  try { fs.writeFileSync(`${OUTDIR}/payload_${raws.length + 1}.txt`, sys + '\n=====USER=====\n' + usr); } catch (_) {}
  // FREE PETITION PROOF: the Author is stubbed, but everything downstream — post-stack,
  // render, settle, finalization — runs exactly as in production. $0.
  const TAG = '\n\n<<WISH: If Fate really listened I would ask it to give me the morning back. No. I would ask it to tell me what she thought she was giving me.>>';
  // SCENE-AWARE STUB: only the SCENE-2 author response carries the tag, so the production hop
  // (Scene-2 author -> Scene-2 capture -> Scene-2 composer) is what gets exercised. The earlier
  // stub tagged every response, which accidentally tested Scene-1 capture -> Scene-2 composer.
  const _isScene2 = /Petition Fate" is inscribed|emit it as the LAST line/.test(sys + usr);
  const STUBP = 'The accusation hung in the clearing and no one moved. I got two fingers under the band at my cheek and pulled it down off my mouth. "It was not her wish that failed," I said, loud enough to carry. Someone near the rail repeated it to someone behind them.'
      + ((process.env.WISHTAG === '0' || !_isScene2) ? '' : TAG);
  try { console.log('[STUB] scene2=' + _isScene2 + ' tagged=' + (process.env.WISHTAG !== '0' && _isScene2)); } catch (_) {}
  const bodyTxt = JSON.stringify({ content: STUBP });
  const resp = { status: () => 200, headers: () => ({ 'content-type': 'application/json' }) };
  try {
    const j = JSON.parse(bodyTxt);
    const c = j.choices?.[0]?.message?.content ?? j.content;
    const txt = Array.isArray(c) ? c.filter(x => x && x.type === 'text').map(x => x.text).join('') : String(c || '');
    if (txt && txt.length > 200) {
      raws.push(txt);
      fs.writeFileSync(`${OUTDIR}/raw_author_${raws.length}.txt`, txt);   // persist IMMEDIATELY
      log(`  [author response ${raws.length}] ${txt.length} chars captured`);
    }
  } catch (_) {}
  return route.fulfill({ status: 200, contentType: 'application/json', body: bodyTxt });
});
page.on('console', m => { const t = m.text(); const mm = t.match(/Finalized: \$([0-9.]+)/); if (mm) spend += parseFloat(mm[1]);
  if (/SCENE1-FRAME|SCENE-FRAME|petition closer|\[WISH\]/i.test(t)) { try { fs.appendFileSync(`${OUTDIR}/finalizer.log`, t.slice(0,200)+'\n'); } catch(_){} } });

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

const pageText = () => page.evaluate(() => (window.StoryPagination.getPages() || []).join('\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim());

log('[baseline] SCENE 1 — real generation…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 900000; w += 4000) { await page.waitForTimeout(4000); if ((await pageText()).length > 1200) break; }
await page.waitForTimeout(12000);
const s1 = await pageText();
fs.writeFileSync(`${OUTDIR}/scene1_final.txt`, s1);
log(`  scene 1 final: ${s1.length} chars   spend=$${spend.toFixed(3)}`);

// arm the turn gates (deck one-shots are the Submit gate; without them the turn cannot run)
await page.evaluate(() => {
  const s = window.state;
  s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
  s._petitionEmergenceFired = true; s._deckExamineFired = true;
});
const beforeLen = s1.length, rawsBefore = raws.length;

log('[baseline] SCENE 2 — real generation…');
await page.evaluate(() => {
  document.getElementById('actionInput').value = 'I try to explain what happened.';
  document.getElementById('dialogueInput').value = '';
  const b = document.getElementById('submitBtn'); b.disabled = false; b.click();
});
for (let w = 0; w < 900000; w += 4000) { await page.waitForTimeout(4000); if (raws.length > rawsBefore) break; }
// SETTLE ON THE REAL CONDITION: page text must GROW past scene 1 and then hold steady for two reads.
// The previous run slept 15s, read too early, and captured scene 1 twice as "scene 2".
let all = '', prev = -1, stable = 0, settled = false;
for (let w = 0; w < 300000; w += 5000) {
  await page.waitForTimeout(5000);
  all = await pageText();
  if (all.length > beforeLen && all.length === prev) { if (++stable >= 2) { settled = true; break; } }
  else stable = 0;
  prev = all.length;
}
if (!settled) log(`  ⚠ UNSETTLED — page text ${all.length} vs scene1 ${beforeLen}; scene 2 render may be incomplete`);
else log('  settled: page text stable at ' + all.length);
const s2 = all.length > beforeLen ? all.slice(beforeLen).trim() : all;
fs.writeFileSync(`${OUTDIR}/scene2_final.txt`, s2);
fs.writeFileSync(`${OUTDIR}/all_final.txt`, all);
await browser.close();

log(`  scene 2 final: ${s2.length} chars`);
console.log('\n════ BASELINE CAPTURE ════');
console.log(`  scene 1: ${s1.length} chars   scene 2: ${s2.length} chars`);
console.log(`  raw author responses captured: ${raws.length}`);
console.log(`  total spend: $${spend.toFixed(3)}`);
console.log(`  → ${OUTDIR}/scene1_final.txt · scene2_final.txt · raw_author_*.txt`);
