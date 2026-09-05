// _encounter_verify.mjs — verify the STRANGER-SOFTENING → MANIFESTATION-FLOOR release (Roman 2026-07-30).
// Drives First Sacrifice through scene 3 (LI appears on-page in scene 2 → encounter UNMET→MET → scene 3
// prompt should switch branches). Per scene: force the gravity/desire audit (turnCount-gate bypassed) to
// measure affect, capture the author prompt, and check which branch (STRANGER SOFTENING vs MANIFESTATION
// FLOOR) shipped. Expect: affect drop closes + stranger-softening released once MET.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/encounter_verify';
fs.mkdirSync(OUT, { recursive: true });
const CONT_TIMEOUT = 420000;
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
const authorPrompts = [];
let sceneTag = 1;
let encounterFired = false;
page.on('request', req => { try { if (!/\/api\/(proxy|chatgpt-proxy)/.test(req.url())) return; const b = req.postData(); if (!b) return; const j = JSON.parse(b); const sys = (j.messages && j.messages[0] && j.messages[0].content) || ''; if (sys.length > 50000) authorPrompts.push({ scene: sceneTag, len: sys.length, role: j.role || j.preferredModel || '', stranger: /STRANGER SOFTENING/.test(sys), floor: /MANIFESTATION ANCHOR FLOOR/.test(sys), desireFirst: /DESIRE FIRST/.test(sys) }); } catch (_) {} });
page.on('console', m => { const t = m.text(); if (/\[LI-ENCOUNTER\]/.test(t)) encounterFired = true; if (/LI-ENCOUNTER|PAIR-DYNAMIC|SCENE1:DESIRE\]|STATE-CHANGE:EVENT|LI-FIRST-CONVO/.test(t)) log('  · ' + t.slice(0, 160)); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; }
  window._forceDeckMandate = false; window.__forceHeavyBuild = true; window._forceAudits = true;
});
log('[boot] First Sacrifice …');
try { await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('boot to')), 360000))]); }); } catch (e) { log('[boot] ' + e.message); }
try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 10000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 90000, polling: 2000 }); } catch (_) {}
// FORCE the strangers/UNMET start so the transition is tested deterministically (resolution is randomized;
// this run may have latched MET). Also force the presence proxy to ABSENT so the OLD gate would agree.
const forced = await page.evaluate(() => { window.state._liEncounterState = 'UNMET'; if (window.state.romanceEnginePlan) window.state.romanceEnginePlan.scene1Presence = 'ABSENT'; return { enc: window.state._liEncounterState, eng: window.state.romanceEnginePlan && window.state.romanceEnginePlan.romanceEngine || (window.state.aPlot && window.state.aPlot.romanceEngine) }; });
log('[forced] encounter=UNMET (deterministic transition test); ' + JSON.stringify(forced));

async function affectOf(label) {
  // force the gravity/desire audit on the latest scene prose (bypasses the turnCount===0 gate)
  const r = await page.evaluate(async () => {
    const pages = window.__capturedPages || []; const html = pages[pages.length - 1] || '';
    const prose = String(html).replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    let hot = null, verdict = null;
    try { window._forceAudits = true; const g = await window._auditSceneEmotionalGravity(prose, {}); } catch (_) {}
    return { enc: window.state._liEncounterState, turn: window.state.turnCount, proseLen: prose.length };
  });
  log(`  [affect ${label}] encounter=${r.enc} turn=${r.turn} (see [SCENE1:DESIRE] above for HOT%)`);
  return r;
}
async function settle() { try { await page.waitForFunction(() => !window.state._isAdvancingScene && !window.state.isPreloadingNextScene && (Date.now() - (window.__lastPageAt || 0)) > 6000, {}, { timeout: 200000, polling: 2000 }); } catch (_) {} }
async function drive(act, dia) {
  await settle();
  await page.evaluate(() => { const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true; s._petitionEmergenceFired = true; s._temptEmergenceFired = true; });
  await page.evaluate(({ a, d }) => { const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }; set('actionInput', a); set('dialogueInput', d); }, { a: act, d: dia });
  const before = await page.evaluate(() => ({ p: (window.__capturedPages || []).length, t: window.state.turnCount || 0 }));
  try {
    await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
    await page.waitForFunction(() => window.state._isAdvancingScene === true, {}, { timeout: 45000, polling: 1000 }).catch(() => {});
    await page.waitForFunction(({ p, t }) => { const a = window.state._isAdvancingScene === true; const pp = (window.__capturedPages || []).length; const tt = window.state.turnCount || 0; return !a && (pp > p || tt > t) && (Date.now() - (window.__lastPageAt || 0)) > 8000; }, { p: before.p, t: before.t }, { timeout: CONT_TIMEOUT, polling: 2500 });
  } catch (e) { log('  [drive] ' + e.message); }
}

log('\n=== SCENE 1 already rendered (bootstrap) ===');
await affectOf('scene1');
log('\n=== SCENE 2 (forced UNMET → expect STRANGER-SOFTENING; LI may appear on-page → MET post-render) ===');
sceneTag = 2;
await drive('press him on why the binding chose the two of you', 'What did you give up for this? Tell me the truth.');
await affectOf('scene2');
log('\n=== SCENE 3 (if MET now → expect MANIFESTATION FLOOR, not stranger-softening) ===');
sceneTag = 3;
await drive('close the distance and make him look at you', 'Say it to my face. What are we now?');
const s3 = await affectOf('scene3');

// analyze the captured NARRATIVE-AUTHOR prompts per scene
const authorOnly = authorPrompts.filter(p => p.len > 100000);
fs.writeFileSync(`${OUT}/prompts_summary.json`, JSON.stringify({ finalEncounter: s3.enc, encounterFired, prompts: authorOnly }, null, 2));
log('\n╔══════════════════════════════════════════════════════════╗');
log('║  ENCOUNTER-STATE TRANSITION VERIFICATION                 ║');
log('╚══════════════════════════════════════════════════════════╝');
log('forced start = UNMET · [LI-ENCOUNTER] fired = ' + encounterFired + ' · final encounter = ' + s3.enc);
log('captured author prompts (>100k) by scene:');
authorOnly.forEach(b => log('  scene' + b.scene + ' len=' + b.len + '  STRANGER-SOFTENING=' + (b.stranger ? 'YES' : 'no') + '  MANIFESTATION-FLOOR=' + (b.floor ? 'YES' : 'no')));
const early = authorOnly.find(p => p.stranger && !p.floor);          // an UNMET-era prompt (stranger only)
const late = authorOnly.slice().reverse().find(p => p.floor && !p.stranger); // a MET-era prompt (floor, no stranger)
let verdict;
if (encounterFired && s3.enc === 'MET' && late) verdict = '✓ TRANSITION WORKS — encounter latched UNMET→MET on the LI going on-page, and a later prompt switched to MANIFESTATION FLOOR (stranger-softening released).';
else if (encounterFired && s3.enc === 'MET') verdict = '~ encounter transitioned to MET (latch fired) but did not capture a clean floor-only prompt after — likely capture/timing; branch tags above are the truth.';
else if (s3.enc === 'UNMET') verdict = '⚠ LI never came on-page across these scenes (encounter stayed UNMET) — the transition could not fire; inspect [STATE-CHANGE] to see if the LI appeared.';
else verdict = '~ inspect the per-scene branch tags above.';
log('\nVERDICT: ' + verdict + (early ? '  (saw an UNMET-era stranger-softening prompt: scene' + early.scene + ')' : ''));
await browser.close();
process.exit(0);
