// _channel_validation.mjs — Roman 2026-08-10: validate the planner→author→verifier CHANNEL is exact.
// NOT an A/B. Single config: _structuredEventHandoff + _situationDrivenPlanner ON. Drive ~8 continuations of First
// Sacrifice and capture the diagnostics — [EVENT-SLOTS] (planner), the author EVENT CONTRACT, [SLOT-CHECK] (verifier),
// and the [STATE-TRANSITION] chain (ENTRY → PLANNED_EXIT → ACTUAL_EXIT → MATCH). Question: does a planned semantic
// event arrive on the page unchanged (PASS), or does slot-drift get caught (FAIL→MISSED)? Yes/no engineering check.
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 8;
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/channel_validation.json';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;

const ACTIONS = [
  { act: 'I refuse to let the rite finish until I know what the wish cost.', dia: 'Whose price is this?' },
  { act: 'I put myself between the youth and the elders.', dia: 'Leave them out of this.' },
  { act: 'I confront the elder who blamed me, in front of everyone.', dia: 'Say it to my face.' },
  { act: 'I search for the truth of what cracked the bond.', dia: 'Someone here knows.' },
  { act: 'I offer to bear the cost myself.', dia: 'Take it from me instead.' },
  { act: 'I expose who really made the forbidden wish.', dia: 'That ends tonight.' },
  { act: 'I stand against the order that would silence this.', dia: 'You cannot unmake what I saw.' },
  { act: 'I act on what I have learned and move to set it right.', dia: 'If it is wrong, we fix it now.' }
];

const log = (...a) => console.log(...a);
const D = { eventSlots: [], slotChecks: [], stateTransitions: [], commits: [], planSituations: [] };

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
page.on('console', m => {
  const t = m.text();
  if (/\[EVENT-SLOTS\]/.test(t)) D.eventSlots.push(t.replace(/^.*\[EVENT-SLOTS\]\s*/, '').slice(0, 240));
  if (/\[SLOT-CHECK\]/.test(t)) D.slotChecks.push(t.replace(/^.*\[SLOT-CHECK\]\s*/, '').slice(0, 240));
  if (/\[STATE-TRANSITION\]/.test(t)) D.stateTransitions.push(t.replace(/^.*\[STATE-TRANSITION\]\s*/, '').slice(0, 300));
  if (/\[COMMIT\]|\[ROLLBACK\]/.test(t)) D.commits.push(t.slice(0, 140));
  if (/\[SITUATION-PLANNER\]/.test(t)) D.planSituations.push(t.replace(/^.*\[SITUATION-PLANNER\]\s*/, '').slice(0, 200));
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state;
  s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  window.__disableSpeculativePreload = true;
  window._structuredEventHandoff = true; window._situationDrivenPlanner = false; window._accomplishedEventContract = false; window._usePlanSpine = false;
  try { localStorage.setItem('sb_stories_onboarded', '1'); } catch (_) {}
  window._forceDeckMandate = false;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  try {
    const SP = window.StoryPagination;
    if (SP && typeof SP.addPage === 'function' && !SP.__wrapped) {
      const real = SP.addPage.bind(SP);
      SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return real(h, n); };
      SP.__wrapped = true;
    }
  } catch (_) {}
});

log('[bootstrap] …');
try {
  await page.evaluate(async ({ STARTER, T }) => {
    const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
    if (!def) throw new Error('starter not found');
    await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T))]);
  }, { STARTER, T: SCENE_TIMEOUT });
} catch (e) { log('[bootstrap] ERR ' + (e && e.message)); }
await page.waitForFunction(() => (Date.now() - (window.__lastPageAt || 0)) > 12000 && (window.__capturedPages || []).length >= 1 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});

for (let i = 0; i < N; i++) {
  const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    if (attempt > 0) await page.waitForTimeout(30000);
    await page.evaluate(() => { const s = window.state; window._structuredEventHandoff = true; window._situationDrivenPlanner = false; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; });
    await page.evaluate(({ act, dia }) => { const sv = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; sv('actionInput', act); sv('dialogueInput', dia); }, A);
    try {
      await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
      const started = await page.waitForFunction(({ n, t }) => window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
      if (!started) throw new Error('submit BAILED');
      await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
      ok = true;
    } catch (e) { log('  cont ' + (i + 1) + ' fail: ' + (e && e.message)); }
  }
  await page.waitForTimeout(1200);
  fs.writeFileSync(OUT, JSON.stringify(D, null, 1));   // progressive
  log('cont ' + (i + 1) + '/' + N + ' — slots=' + D.eventSlots.length + ' slotChecks=' + D.slotChecks.length + ' transitions=' + D.stateTransitions.length + (ok ? '' : ' (FAILED — stopping)'));
  if (!ok) break;
}

D.scenes = await page.evaluate(() => (window.__capturedPages || []).map(h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()).filter(t => t.length > 150));
fs.writeFileSync(OUT, JSON.stringify(D, null, 1));
await browser.close();

// ── CONFUSION TREE (where events are lost: planner-impossible vs author-dropped vs rendered) ──
// Parses the evidence-verifier [SLOT-CHECK] logs (PASS / FAIL→MISSED / IMPOSSIBLE-EVENT). MEASUREMENT, not a target.
var _pass = 0, _impossible = 0, _dropped = 0;
D.slotChecks.forEach(sc => {
  var isFail = /FAIL/.test(sc);
  if (!isFail && /\bPASS\b/.test(sc)) _pass++;
  else if (/IMPOSSIBLE-EVENT/.test(sc)) _impossible++;   // precondition/target absent → PLANNER produced an unstageable event
  else if (isFail) _dropped++;                            // stageable but the AUTHOR did not deliver it
});
var _checked = _pass + _impossible + _dropped;
var _stageable = _pass + _dropped;

log('\n=== CHANNEL VALIDATION (default planner + structured handoff) → ' + OUT + ' ===');
log('planner events emitted (with slots): ' + D.eventSlots.length + ' · verifier checks: ' + _checked + ' · prose scenes: ' + (D.scenes || []).length);
log('\nCONFUSION TREE (where events are lost — MEASUREMENT, not a number to optimize):');
log('  ' + _checked + ' checked');
log('  ├── ' + _impossible + ' impossible   (PLANNER: precondition/target absent — unstageable event)');
log('  └── ' + _stageable + ' stageable');
log('      ├── ' + _pass + ' rendered   (AUTHOR delivered it → PASS)');
log('      └── ' + _dropped + ' dropped    (AUTHOR failed a stageable event → FAIL)');
log('  transmission (rendered / checked): ' + (_checked ? Math.round(100 * _pass / _checked) : 0) + '%');
log('  author-render rate (rendered / stageable): ' + (_stageable ? Math.round(100 * _pass / _stageable) : 0) + '%');

log('\n=== THREE-REPRESENTATION VIEW (per scene index; planner-emit vs verifier-check may be off by one scene) ===');
const _nn = Math.max(D.eventSlots.length, D.slotChecks.length, (D.scenes || []).length);
for (let i = 0; i < _nn; i++) {
  log('\n--- scene index ' + i + ' ---');
  log('  PLANNER  : ' + (D.eventSlots[i] || '(none)'));
  log('  AUTHOR   : ' + (((D.scenes || [])[i] || '(none)').slice(0, 300)) + '…');
  log('  VERIFIER : ' + (D.slotChecks[i] || '(none)'));
  log('  TRANSITION: ' + (D.stateTransitions[i] || '(none)'));
}
process.exit(0);
