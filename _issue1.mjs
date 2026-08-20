// _scene2_baseline.mjs — PAID. First prose from the corrected architecture.
// Scene 1 real (so committed state, deck continuity and rolling context are genuine),
// then Scene 2 real. Captures BOTH the raw author response and the final reader-facing
// page text, so a post-pass alteration is visible. Persists per scene the moment it lands.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);
const OUTDIR = '_validate_out/issue1';
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
  try { fs.appendFileSync(`${OUTDIR}/author_calls.jsonl`, JSON.stringify({ n: raws.length+1, model: b.model || b.preferredModel || null, temperature: b.temperature ?? null, max_tokens: b.max_tokens ?? null })+'\n'); } catch (_) {}
  const resp = await route.fetch({ timeout: 0 });   // REAL generation
  const bodyTxt = await resp.text();
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
  return route.fulfill({ response: resp, body: bodyTxt });
});
page.on('console', m => { const t = m.text(); const mm = t.match(/Finalized: \$([0-9.]+)/); if (mm) spend += parseFloat(mm[1]);
  if (/SCENE1-FRAME|SCENE-FRAME|fallback composed|captured fragment|DECK_MANDATE|HOT-RENDER|HOT-OPENER|LI-PROOF|PC-PICT|openingTemperature|PAYLOAD-PREFLIGHT|AUTHORITY-VIOLATION|SCENE1-GATE|SCENE-BUDGET|CONTRACT|PEN-OFF/i.test(t)) { try { fs.appendFileSync(OUTDIR + '/finalizer.log', t.slice(0,200)+'\n'); } catch(_){} } });

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
  window.__rawSnap = [];
  window.__textSnap = [];   // Scene-1 owners report here
  window.__cheapEditTrace = [];
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
const LBL='scene1';
try { const _cap = await page.evaluate(() => {
  const rs = window.__rawSnap || [];
  const last = rs.length ? rs[rs.length-1] : null;
  return { lastAfter: last ? String(last.after||'') : '', lastLabel: last ? last.label : null,
           priorSceneText: String((window.state&&window.state._priorSceneText)||''),
           ringTail: String(((window.state&&window.state._sceneTextRing)||[]).slice(-1)[0]||{}).slice(0,0) ||
                     (((window.state&&window.state._sceneTextRing)||[]).slice(-1)[0]||{}).text || '' };
});
fs.writeFileSync(OUTDIR + '/capture_' + LBL + '.json', JSON.stringify(_cap,null,1));
log('  [' + LBL + '] lastWriter=' + _cap.lastLabel + ' len=' + _cap.lastAfter.length); } catch(e){ log('  capture failed: '+e.message); }
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
let _snapGlobal = null;
try { _snapGlobal = await page.evaluate(() => (window.__rawSnap||[]).map(r => ({ sid:r.sid, label:r.label, cls:r.mutationClass, changed:r.changed,
  beforeLen:(r.before||'').length, afterLen:(r.after||'').length,
  beforeNl:((r.before||'').match(/\n/g)||[]).length, afterNl:((r.after||'').match(/\n/g)||[]).length,
  beforeP:((r.before||'').match(/P\d /g)||[]).length, afterP:((r.after||'').match(/P\d /g)||[]).length })));
  fs.writeFileSync(OUTDIR + '/rawsnap.json', JSON.stringify(_snapGlobal,null,1));
  try {
    const _rt = await page.evaluate(() => ({
      violations: (window.state && window.state._authorityViolations) || [],
      preflight:  (window.state && window.state._payloadPreflight) || [],
      reports:    (window.state && window.state._validatorReports) || [] }));
    fs.writeFileSync(OUTDIR + '/runtime.json', JSON.stringify(_rt,null,1));
    log('  runtime — authority violations: ' + _rt.violations.length +
        ' · preflight hits: ' + _rt.preflight.length + ' · validator reports: ' + _rt.reports.length);
  } catch (e) { log('  runtime dump failed: ' + e.message); }
  try {
    const _ts = await page.evaluate(() => ({
      text:(window.__textSnap||[]).map(r=>({site:r.site,label:r.label,cls:r.mutationClass,
        before:String(r.before||''),after:String(r.after||'')})),
      cheap:(window.__cheapEditTrace||[]) }));
    fs.writeFileSync(OUTDIR + '/textsnap.json', JSON.stringify(_ts.text,null,1));
    fs.writeFileSync(OUTDIR + '/cheaptrace.json', JSON.stringify(_ts.cheap,null,1));
    log('  __textSnap: ' + _ts.text.length + ' (changed ' + _ts.text.filter(r=>r.before&&r.before!==r.after).length + ')  cheapEdits: ' + _ts.cheap.length);
  } catch (e) { log('  textSnap dump failed: ' + e.message); }
  try {
    const _full = await page.evaluate(() => (window.__rawSnap||[]).filter(r=>r.changed)
      .map(r => ({ sid:r.sid, label:r.label, before:String(r.before||''), after:String(r.after||'') })));
    fs.writeFileSync(OUTDIR + '/rawsnap_full.json', JSON.stringify(_full,null,1));
    log('  full-text changed records: ' + _full.length);
  } catch (e) { log('  full snap failed: ' + e.message); }
  log('  rawSnap records: ' + _snapGlobal.length); } catch (e) { log('  rawSnap dump failed: ' + e.message); }
const LBL2='scene2';
try { const _cap = await page.evaluate(() => {
  const rs = window.__rawSnap || [];
  const last = rs.length ? rs[rs.length-1] : null;
  return { lastAfter: last ? String(last.after||'') : '', lastLabel: last ? last.label : null,
           priorSceneText: String((window.state&&window.state._priorSceneText)||''),
           ringTail: String(((window.state&&window.state._sceneTextRing)||[]).slice(-1)[0]||{}).slice(0,0) ||
                     (((window.state&&window.state._sceneTextRing)||[]).slice(-1)[0]||{}).text || '' };
});
fs.writeFileSync(OUTDIR + '/capture_' + LBL2 + '.json', JSON.stringify(_cap,null,1));
log('  [' + LBL2 + '] lastWriter=' + _cap.lastLabel + ' len=' + _cap.lastAfter.length); } catch(e){ log('  capture failed: '+e.message); }

// ══ SCENE 3 ══════════════════════════════════════════════════════════════
const beforeLen3 = all.length, rawsBefore3 = raws.length;
await page.evaluate(() => { const s = window.state;
  s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
  s._petitionEmergenceFired = true; s._deckExamineFired = true; });
log('[issue] SCENE 3 — real generation…');
await page.evaluate(() => {
  document.getElementById('actionInput').value = 'I follow the thread the wish opened.';
  document.getElementById('dialogueInput').value = '';
  const btn = document.getElementById('submitBtn'); btn.disabled = false; btn.click();
});
for (let w = 0; w < 900000; w += 4000) { await page.waitForTimeout(4000); if (raws.length > rawsBefore3) break; }
let all3 = '', prev3 = -1, stable3 = 0;
for (let w = 0; w < 300000; w += 5000) {
  await page.waitForTimeout(5000); all3 = await pageText();
  if (all3.length > beforeLen3 && all3.length === prev3) { if (++stable3 >= 2) break; } else stable3 = 0;
  prev3 = all3.length;
}
try {
  const _t3 = await page.evaluate(() => ({
    text:(window.__textSnap||[]).map(r=>({site:r.site,label:r.label,before:String(r.before||''),after:String(r.after||'')})),
    full:(window.__rawSnap||[]).filter(r=>r.changed).map(r=>({label:r.label,before:String(r.before||''),after:String(r.after||'')})),
    rt:{ violations:(window.state&&window.state._authorityViolations)||[],
         preflight:(window.state&&window.state._payloadPreflight)||[],
         reports:(window.state&&window.state._validatorReports)||[] } }));
  fs.writeFileSync(OUTDIR + '/scene3_textsnap.json', JSON.stringify(_t3.text,null,1));
  fs.writeFileSync(OUTDIR + '/scene3_rawsnap_full.json', JSON.stringify(_t3.full,null,1));
  fs.writeFileSync(OUTDIR + '/scene3_runtime.json', JSON.stringify(_t3.rt,null,1));
} catch (e) { log('  scene3 dump failed: ' + e.message); }
const s3 = all3.length > beforeLen3 ? all3.slice(beforeLen3).trim() : all3;
fs.writeFileSync(`${OUTDIR}/scene3_final.txt`, s3);
log(`  scene 3 final: ${s3.length} chars`);

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

// provenance dump — appended at end of script, no control-flow surgery
try {
  const _snapPath = OUTDIR + '/rawsnap.json';
  if (typeof _snapGlobal !== 'undefined' && _snapGlobal) fs.writeFileSync(_snapPath, JSON.stringify(_snapGlobal, null, 1));
} catch (_) {}
