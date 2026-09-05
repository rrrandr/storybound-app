// _plan_spine_ab.mjs — Roman 2026-08-08 PHASE 0 A/B: same First Sacrifice story, twice, ONLY the planning
// source swapped (window._accomplishedEventContract off vs on). Everything downstream identical: same author, Character+,
// scene planner, player actions, routing, prompts. BLIND: which run (A/B) gets the flag is randomized and the
// key is withheld in run_KEY.json (do NOT open until the reading sheet is filled). Prose files carry NO flag
// info; [SCENE-CONTRACT:AEC]/commit logs go to separate trace_*.json (opened only AFTER the blind read).
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 14;                    // continuations per run (~8 scenes each given harness turn-pairing lag)
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;

// Identical forward-driving player actions for BOTH runs (a real reader engaging First Sacrifice).
const ACTIONS = [
  { act: 'I refuse to let the rite finish — I demand to know what the wish actually cost.', dia: 'Whose price is this? Say it before another word of the vow is spoken.' },
  { act: 'I press the one who blames me to admit it to my face, in front of everyone.', dia: 'You think I made that wish. Then name me. Here. Now.' },
  { act: 'I go looking for the truth of what happened the night the bond cracked.', dia: 'Someone here knows. I mean to find out who.' },
  { act: 'I put myself between the youth and the elders, whatever it costs me.', dia: 'You will not spend them to cover your own mistake.' },
  { act: 'I confront Julian directly and make him tell me what he did.', dia: 'No more shielding me. I want it from you, all of it.' },
  { act: 'I offer my own years to the binding if it will spare the youth.', dia: 'Take the price from me instead. I can carry it.' },
  { act: 'I search the archive for the record of the original wish.', dia: 'If it was written, it can be found. And I will find it.' },
  { act: 'I expose the one who truly made the forbidden wish, in the open.', dia: 'You let me carry your guilt for five years. That ends tonight.' },
  { act: 'I choose Julian over my own safety and say so aloud.', dia: 'Whatever comes for you comes for me. I am not leaving.' },
  { act: 'I bargain with the fate that governs the binding, on my own terms.', dia: 'If a price must be paid, then let me set what it buys.' },
  { act: 'I refuse the elders’ easy resolution and force the harder truth.', dia: 'A clean story is not the true one. I want the true one.' },
  { act: 'I reveal the secret I have kept since the night it happened.', dia: 'There is something none of you know. Listen.' },
  { act: 'I stand against the order that would silence this.', dia: 'You can unmake a wish. You cannot unmake what I saw.' },
  { act: 'I act on what I’ve learned and move to undo the misaligned wish.', dia: 'If the wish is wrong, then we set it right — now.' }
];

const log = (...a) => console.log(...a);

async function runOnce(label, usePlanSpine) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const aecLogs = [], stateChangeLogs = [], commitLogs = [], costLog = [];
  page.on('console', m => {
    const t = m.text();
    if (/\[PLAN-SPINE\]/.test(t)) aecLogs.push(t.slice(0, 200));
    if (/\[STATE-CHANGE:EVENT\]/.test(t)) stateChangeLogs.push(t.slice(0, 220));
    if (/\[COMMIT-SCENE|\[ROLLBACK|\[DELIVERY/.test(t)) commitLogs.push(t.slice(0, 200));
    if (/\[SCENE-COST/.test(t)) costLog.push(t.slice(0, 200));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
  await page.evaluate((usePlanSpine) => {
    const s = window.state;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__disableSpeculativePreload = true;
    window._accomplishedEventContract = usePlanSpine === true;   // THE ONLY VARIABLE
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
  }, usePlanSpine);

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
    return {
      scenes: (window.__capturedPages || []).map(clean).filter(t => t.length > 150),
      costs: s._sceneCostsThisStory || [], cumulative: s._cumulativeAPICost || 0
    };
  });

  for (let i = 0; i < N; i++) {
    const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
    const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      if (attempt > 0) { await page.waitForTimeout(30000); }
      await page.evaluate((ups) => { const s = window.state; window._accomplishedEventContract = ups === true; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; }, usePlanSpine);
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
    log(`[${label}] cont ${i + 1}/${N} → scenes=${g.scenes.length}` + (ok ? '' : ' (FAILED — stopping)'));
    if (!ok) break;
  }

  const g = await grab();
  await browser.close();
  return { scenes: g.scenes, costs: g.costs, cumulative: g.cumulative, aecLogs, stateChangeLogs, commitLogs, costLog };
}

// ── randomize A/B → flag assignment; withhold the key ──
const flagOnLabel = (Math.random() < 0.5) ? 'A' : 'B';
log(`\n=== ACCOMPLISHED-EVENT CONTRACT A/B — First Sacrifice, ${N} continuations/run, BLIND ===`);

const rA = await runOnce('A', flagOnLabel === 'A');
const rB = await runOnce('B', flagOnLabel === 'B');

// PROSE ONLY (blind) — no flag info
fs.writeFileSync(`${DIR}/run_A.json`, JSON.stringify({ run: 'A', scenesCaptured: rA.scenes.length, scenes: rA.scenes }, null, 1));
fs.writeFileSync(`${DIR}/run_B.json`, JSON.stringify({ run: 'B', scenesCaptured: rB.scenes.length, scenes: rB.scenes }, null, 1));
// Traces (open only AFTER the blind read)
fs.writeFileSync(`${DIR}/trace_A.json`, JSON.stringify({ run: 'A', aecLogs: rA.aecLogs, stateChangeLogs: rA.stateChangeLogs, commitLogs: rA.commitLogs, costs: rA.costs, cumulative: rA.cumulative, costLog: rA.costLog }, null, 1));
fs.writeFileSync(`${DIR}/trace_B.json`, JSON.stringify({ run: 'B', aecLogs: rB.aecLogs, stateChangeLogs: rB.stateChangeLogs, commitLogs: rB.commitLogs, costs: rB.costs, cumulative: rB.cumulative, costLog: rB.costLog }, null, 1));
// THE KEY (do not open until the reading sheet is filled)
fs.writeFileSync(`${DIR}/run_KEY.json`, JSON.stringify({ flagOnLabel, note: 'run ' + flagOnLabel + ' had window._accomplishedEventContract=TRUE (accomplished-event contract); the other ran the current state_change contract' }, null, 1));

// NEUTRAL sanity check — did the flag-on run actually inject the spine? (count only, no A/B label, no beat text)
const flagOnRun = flagOnLabel === 'A' ? rA : rB;
log(`\n=== DONE ===`);
log(`run A: ${rA.scenes.length} scenes, $${(rA.cumulative || 0).toFixed(3)}`);
log(`run B: ${rB.scenes.length} scenes, $${(rB.cumulative || 0).toFixed(3)}`);
log(`total: $${((rA.cumulative || 0) + (rB.cumulative || 0)).toFixed(3)}`);
log(`SANITY (mechanism fired): the flag-on run injected ${flagOnRun.aecLogs.length} accomplished-event-contract objective(s) across the run (expect ~scene count; 0 = mechanism did NOT fire → mapping bug).`);
log(`BLIND READ FILES: run_A.json, run_B.json  ·  KEY WITHHELD → run_KEY.json (open only after reading)`);
process.exit(0);
