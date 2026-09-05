// _causal_probe.mjs — FREE production causality capture. Runs the REAL seeded planning path
// (no injected STARTER_PLANS), stubs the prose author, and extracts ONLY the causal scene data.
// Answers the 7 ownership questions: is the causal material authored upstream and dropped,
// or never authored at all? No prose bought, no schema changed.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);
const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));
const STUB = 'The stall smelled of wet rope and cold iron. I set my hand on the counter and waited for her to look up, and when she did I understood the answer would not be the one I wanted. She said my name once. I did not say hers.';

// WRITE PREFLIGHT — prove the output path exists and is writable BEFORE any expensive work.
// Three runs this session collected their data and then threw it away at a final write; the fix
// is to fail in the first second, not the tenth minute. See feedback_preflight_stateful_gates.
const OUTDIR = '_validate_out/realgates';
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log('[preflight] output dir writable: ' + OUTDIR);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

let payloads = [], phase = 'init';
await page.route('**/api/**', async route => {
  const r = route.request(); if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  if (isAuthor(sys, usr, b.model || b.preferredModel)) {
    payloads.push({ phase, sys, usr });
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

// PRODUCTION PATH — real seeded starter, NOTHING injected into STARTER_PLANS.
await page.evaluate(() => {
  const s = window.state;
  window._armSubtract=false; window._armExemplars=false; window._armA50=false; window._armStaging=false;
  
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

log('[probe] begin story (production planning path, author stubbed)…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 600000 && !payloads.length; w += 3000) await page.waitForTimeout(3000);
log('[probe] scene-1 author payloads captured: ' + payloads.length + (payloads.length ? '' : '  ⚠ SCENE 1 NEVER RAN'));
await page.waitForTimeout(8000);

// REAL continuation turn. Plan/seed/aPlot are UNTOUCHED — only the stateful turn gates are
// preflighted, because the first probe run clicked submit against closed gates and no author
// call fired at all (HARNESS FAILURE — TURN DID NOT RUN, not a delivery finding).
payloads = []; phase = 'cont';
const gates = await page.evaluate(() => {
  const s = window.state;
  const before = { turnCount: s.turnCount, cliff: s._cliffhangerContinueAuthorized,
                   adv: s._isAdvancingScene, pages: (window.StoryPagination.getPages() || []).join('').length };
  s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;

  return before;
});
log('[probe] pre-turn state: ' + JSON.stringify(gates));
await page.evaluate(() => {
  document.getElementById('actionInput').value = 'I go to the market stall to pass the note.';
  document.getElementById('dialogueInput').value = '';
  const b = document.getElementById('submitBtn'); b.disabled = false; b.click();
});
for (let w = 0; w < 600000 && !payloads.length; w += 3000) await page.waitForTimeout(3000);
const cont = payloads[0] || null;
log("[probe] continuation author payloads captured: "+payloads.length+(cont?"":"  ⚠ TURN DID NOT RUN"));
await page.waitForTimeout(4000);

// ── dump the causal structures while the page is still alive ──
const dump = await page.evaluate(() => {
  const s = window.state, out = {};
  const j = v => { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return String(v); } };
  try { out.sceneNumber = window._currentSceneNumber ? window._currentSceneNumber(s) : null; } catch (e) { out.sceneNumber = 'ERR'; }
  try { const p = window._activePlan ? window._activePlan(s) : null;
        out.planScenes = p && Array.isArray(p.scenes) ? j(p.scenes.slice(0, 6)) : null;
        out.planKeys = p ? Object.keys(p) : null; } catch (e) { out.planScenes = 'ERR ' + e.message; }
  try { out.assignmentLive = window._selectSceneAssignment ? j(window._selectSceneAssignment(s, out.sceneNumber)) : null; } catch (e) { out.assignmentLive = 'ERR ' + e.message; }
  out.assignmentStored = j(s._sceneAssignment || null);
  out.spineEventVerbatim = j(s._spineEventVerbatim || null);
  out.spineStaging = j(s._spineStaging || null);
  out.sceneSkeleton = j(s.sceneSkeleton || null);
  out.sceneIntent = j(s.sceneIntent || null);
  out.sceneMissionCurrent = j(s._sceneMissionCurrent || null);
  try { const seed = window._activeSeed ? window._activeSeed(s) : null;
        out.seedKeys = seed ? Object.keys(seed) : null;
        out.seedWorldTruths = seed && seed.worldTruths ? j(seed.worldTruths).slice(0, 4) : null; } catch (e) { out.seedKeys = 'ERR'; }
  out.aPlotKeys = s.aPlot ? Object.keys(s.aPlot) : null;
  out.aPlot = j(s.aPlot || null);
  out.narrativeState = j(s.narrativeState || null);
  out.scenePlotContract = j(s._scenePlotContract || null);
  out.priorSceneStateChange = j(s._priorSceneStateChange || null);
  return out;
});
await browser.close();

const grab = (hay, start, len) => { const i = hay.indexOf(start); return i < 0 ? null : hay.slice(i, i + len).replace(/\s+/g, ' '); };
const hay = cont ? cont.sys + '\n' + cont.usr : '';
const delivered = {
  SPINE_EVENT: grab(hay, 'SPINE EVENT — MUST STAGE', 420),
  SCENE_INTENT: grab(hay, 'SCENE INTENT:', 420),
  SCENE_SPINE: grab(hay, 'SCENE SPINE — THE STATE CHANGE', 420),
};
fs.writeFileSync('_validate_out/realgates/probe.json', JSON.stringify({ dump, delivered, contSys: cont ? cont.sys.length : null }, null, 2));
if (cont) fs.writeFileSync('_validate_out/realgates/payload_cont.txt', cont.sys + '\n\n=====USER=====\n\n' + cont.usr);

// ── the seven questions, answered mechanically ──
const A = dump.assignmentLive && typeof dump.assignmentLive === 'object' ? dump.assignmentLive : {};
const planScene = Array.isArray(dump.planScenes) ? dump.planScenes.find(p => p && p.n === dump.sceneNumber) : null;
const has = v => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && !v.length);
const anyKey = (o, re) => o && typeof o === 'object' ? Object.keys(o).filter(k => re.test(k)) : [];

console.log('\n════ PRODUCTION CAUSAL CAPTURE ════');
console.log('scene number: ' + dump.sceneNumber + '   assignment source: ' + (A.source || 'NONE'));
console.log('\n── authored plan scene for this scene number ──');
console.log(planScene ? JSON.stringify(planScene, null, 2) : '  (no plan scene matched this number)');
console.log('\n── sceneAssignment after _selectSceneAssignment ──');
console.log(JSON.stringify(dump.assignmentLive, null, 2));
console.log('\n── delivered to Author ──');
for (const [k, v] of Object.entries(delivered)) console.log(`  ${k}: ${v ? v.slice(0, 300) : '❌ ABSENT'}`);
console.log('\n── skeleton / intent ──');
console.log('  environment_anchor: ' + JSON.stringify(dump.sceneSkeleton && dump.sceneSkeleton.environment_anchor));
console.log('  sceneIntent: ' + JSON.stringify(dump.sceneIntent));

console.log('\n════ THE SEVEN QUESTIONS ════');
const ev = String(A.event || (planScene && planScene.goal) || '');
const stageable = /\b(pass|hand|give|take|open|close|enter|leave|walk|run|strike|cut|burn|break|throw|pull|push|arrive|deliver|show|steal|kill|kiss|meet|carry|drop|sign|read aloud|announce)\b/i.test(ev);
console.log(`1. spine event stageable external action?   ${stageable ? '✅ YES' : '❌ NO — internal/thematic'}   «${ev.slice(0, 90)}»`);
console.log(`2. stateChange populated upstream?          plan.exitState=${JSON.stringify(planScene && (planScene.exitState ?? null))}  plan.state_change=${JSON.stringify(planScene && (planScene.state_change ?? null))}  →  assignment.stateChange=${JSON.stringify(A.stateChange ?? null)}`);
console.log(`3. concrete WANT upstream?                  plan keys matching /want|goal|purpose|motiv/: ${JSON.stringify(anyKey(planScene, /want|goal|purpose|motiv/i))}`);
console.log(`4. concrete OBSTACLE upstream?              plan keys matching /obstacle|block|oppos|resist|conflict/: ${JSON.stringify(anyKey(planScene, /obstacle|block|oppos|resist|conflict/i))}`);
console.log(`5. concrete CONSEQUENCE upstream?           plan keys matching /stake|conseq|cost|fail|risk/: ${JSON.stringify(anyKey(planScene, /stake|conseq|cost|fail|risk/i))}`);
console.log(`6. prior facts available upstream?          seed keys: ${JSON.stringify(dump.seedKeys)}`);
console.log(`   plan scene keys (ALL): ${JSON.stringify(planScene ? Object.keys(planScene) : null)}`);
console.log(`7. conflicting location from skeleton?      assignment.setting=${JSON.stringify(A.setting ?? null)}${A._settingInferred ? '(INFERRED)' : ''}  vs  environment_anchor=${JSON.stringify(dump.sceneSkeleton && dump.sceneSkeleton.environment_anchor)}`);
console.log('\nfull dump → _validate_out/realgates/probe.json');
