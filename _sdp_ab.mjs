// _sdp_ab.mjs — Roman 2026-08-09: SITUATION-DRIVEN PLANNER A/B (the role-inversion test).
// Same First Sacrifice seed, same HERO player inputs (the sequence that produced "bond, brighter ×4" under the current
// contract), ONLY window._situationDrivenPlanner swapped (off = current milestone-anchored generator; on = situation
// generates the scene, milestone is a rejection constraint). BLIND: randomized label→flag, key withheld, NO flag names
// in stdout (fixes the prior leak). THE TEST (Roman): does the Hero sequence turn from "bond, but brighter" into
// "bond exposed → authorities react → escape/protect/choose" — i.e. does the DOMINANT SITUATION change scene-to-scene?
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 10;
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/sdp';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;

// HERO inputs — the exact sequence whose current-contract run gave "bond exposed, brighter each time" (facts 1→2→3→4,
// all DELIVERED, still repetitive). Identical across both A/B runs; the ONLY variable is the planner flag.
const ACTIONS = [
  { act: 'I put myself between the youth and the elders.', dia: 'Leave them out of this.' },
  { act: 'I shield the youth from the rite’s backlash.', dia: 'I’ve got you.' },
  { act: 'I offer to bear the cost so the youth is spared.', dia: 'Take it from me instead.' },
  { act: 'I move to protect the weakest person in the circle.', dia: 'No one touches them.' },
  { act: 'I stand for the youth when no one else will.', dia: 'I’ll speak for them.' },
  { act: 'I refuse to let anyone be harmed by this.', dia: 'Not while I’m standing here.' },
  { act: 'I place myself where the danger is greatest.', dia: '' },
  { act: 'I promise the youth I will get them out safely.', dia: 'I’ll get you out.' },
  { act: 'I take the risk onto myself to spare the others.', dia: 'Let it fall on me.' },
  { act: 'I guard the youth as the tension rises.', dia: '' }
];

const log = (...a) => console.log(...a);

async function runOnce(label, sdpOn) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const objectives = [], situations = [], verdicts = [];
  page.on('console', m => {
    const t = m.text();
    if (/\[STATE-CHANGE:EVENT\]/.test(t)) objectives.push(t.replace(/^.*\[STATE-CHANGE:EVENT\]\s*/, '').slice(0, 200));
    if (/\[SITUATION-PLANNER\]/.test(t)) situations.push(t.replace(/^.*\[SITUATION-PLANNER\]\s*/, '').slice(0, 220));
    if (/\[COMMIT-SCENE\]|\[ROLLBACK\]/.test(t)) verdicts.push(t.slice(0, 150));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
  await page.evaluate((sdpOn) => {
    const s = window.state;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__disableSpeculativePreload = true;
    window._situationDrivenPlanner = sdpOn === true;   // THE ONLY VARIABLE
    window._accomplishedEventContract = false; window._usePlanSpine = false;
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
  }, sdpOn);

  log(`[${label}] bootstrap …`);
  try {
    await page.evaluate(async ({ STARTER, T }) => {
      const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
      if (!def) throw new Error('starter not found');
      await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T))]);
    }, { STARTER, T: SCENE_TIMEOUT });
  } catch (e) { log(`[${label}] bootstrap ERR ` + (e && e.message)); }
  await page.waitForFunction(() => (Date.now() - (window.__lastPageAt || 0)) > 12000 && (window.__capturedPages || []).length >= 1 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});

  const grab = () => page.evaluate(() => {
    const s = window.state;
    const clean = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return { scenes: (window.__capturedPages || []).map(clean).filter(t => t.length > 150), facts: ((s._committedState && s._committedState.facts) || []).map(f => f.fact), cumulative: s._cumulativeAPICost || 0 };
  });

  for (let i = 0; i < N; i++) {
    const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
    const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      if (attempt > 0) await page.waitForTimeout(30000);
      await page.evaluate((sdp) => { const s = window.state; window._situationDrivenPlanner = sdp === true; window._accomplishedEventContract = false; window._usePlanSpine = false; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; }, sdpOn);
      await page.evaluate(({ act, dia }) => { const sv = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; sv('actionInput', act); sv('dialogueInput', dia); }, A);
      try {
        await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
        const started = await page.waitForFunction(({ n, t }) => window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
        if (!started) throw new Error('submit BAILED');
        await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
        ok = true;
      } catch (e) { log(`[${label}] cont ${i + 1} fail: ` + (e && e.message)); }
    }
    await page.waitForTimeout(1200);
    const g = await grab();
    log(`[${label}] cont ${i + 1}/${N} → scenes=${g.scenes.length} facts=${g.facts.length}` + (ok ? '' : ' (FAILED — stopping)'));
    if (!ok) break;
  }

  const g = await grab();
  await browser.close();
  return { scenes: g.scenes, facts: g.facts, objectives, situations, verdicts, cumulative: g.cumulative };
}

fs.mkdirSync(DIR, { recursive: true });
// BLIND: randomize which label gets the flag; NO flag name in stdout.
const flagOnLabel = (Math.random() < 0.5) ? 'run_1' : 'run_2';
log(`\n=== SITUATION-DRIVEN PLANNER A/B — First Sacrifice, HERO inputs, ${N} continuations (BLIND) ===`);
const out = {};
let total = 0;
for (const label of ['run_1', 'run_2']) {
  const r = await runOnce(label, label === flagOnLabel);
  out[label] = r; total += (r.cumulative || 0);
  fs.writeFileSync(`${DIR}/${label}.json`, JSON.stringify({ label, scenesCaptured: r.scenes.length, scenes: r.scenes }, null, 1));
  fs.writeFileSync(`${DIR}/trace_${label}.json`, JSON.stringify({ label, objectives: r.objectives, situations: r.situations, verdicts: r.verdicts, facts: r.facts }, null, 1));
}
fs.writeFileSync(`${DIR}/_key.json`, JSON.stringify({ flagOnLabel, note: flagOnLabel + ' = situation-driven planner ON; the other = current milestone-anchored contract' }, null, 1));

log(`\n=== DONE — total $${total.toFixed(3)} → ${DIR} ===`);
for (const label of ['run_1', 'run_2']) log(`  ${label}: scenes=${out[label].scenes.length} facts=${out[label].facts.length} objectives=${out[label].objectives.length}`);
const onRun = out[flagOnLabel];
log(`  SANITY (mechanism fired): flag-on run emitted ${onRun.situations.length} [SITUATION-PLANNER] line(s) (0 = did NOT fire).`);
log(`  BLIND READ: run_1.json, run_2.json  ·  KEY WITHHELD → _key.json (open only after reading)`);
log(`  (dominant-situation sequence + verdicts → trace_run_*.json; the test = does the SITUATION change scene-to-scene?)`);
process.exit(0);
