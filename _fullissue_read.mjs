// _fullissue_read.mjs — generate ONE COMPLETE ISSUE of First Sacrifice through the REAL production pipeline
// (Roman 2026-08-08: the issue-level validation test). No cherry-picking, no hand-edits, no pipeline tampering
// beyond disarming the headless UI-advance gates. Deck onboarding LEFT ON (a real new user gets it). Progressive
// capture: writes the accumulated issue after every committed scene so a provider blip never loses prior scenes.
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 19;                    // scene 1 bootstrap + 19 continuations = 20 = one literary issue
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/fullissue_read.json';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;

// Varied, forward-driving, plausible player choices (a real reader engaging the First Sacrifice arc — never the
// same input twice, avoiding the constant-action looping confound).
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
  { act: 'I act on what I’ve learned and move to undo the misaligned wish.', dia: 'If the wish is wrong, then we set it right — now.' },
  { act: 'I test Julian’s loyalty by asking him to give up the thing he most protects.', dia: 'Prove it. Give me the one thing you swore you never would.' },
  { act: 'I take the consequence of the broken vow onto myself openly.', dia: 'Let it fall on me. I chose this the moment I stepped in.' },
  { act: 'I turn the accuser’s own evidence back against them.', dia: 'You brought this to ruin me. Watch what it does to you.' },
  { act: 'I make the choice I’ve been avoiding and commit to the bond with Julian.', dia: 'Then bind us. Whatever it costs, I choose it with eyes open.' },
  { act: 'I face what my choice has set in motion and refuse to look away.', dia: 'Whatever we’ve started, I will see it through to the end.' }
];

const log = (...a) => console.log(...a);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
const consoleRing = [];
const costLog = [];   // per-scene repair/regen/cost telemetry (the "fixing" signal)
page.on('console', m => {
  const t = m.text();
  consoleRing.push(`[${m.type()}] ${t.slice(0, 180)}`); if (consoleRing.length > 60) consoleRing.shift();
  if (/\[CALCIFIED-MOVE:REPAIR\]|\[REPAIR\]|regenerat|\brepair_(passed|failed)\b|\[SCENE-COST|\[PROMPT-PROFILE\]|TENSION GATE|re-?author|\[COMMIT-SCENE|\[DELIVERY/i.test(t)) costLog.push(t.slice(0, 200));
});
page.on('pageerror', e => consoleRing.push('PAGEERROR: ' + (e && e.message)));

function writeOut(g, done) {
  const perSceneSum = +((g.costs || []).reduce((a, c) => a + (c.total || 0), 0)).toFixed(4);
  const cumulative = +(g.cumulative || perSceneSum).toFixed(4);
  fs.writeFileSync(OUT, JSON.stringify({
    starter: STARTER, scenesCaptured: g.scenes.length, done, meta: g.meta,
    cost: {
      cumulative,                                                   // true grand total incl. one-time setup (_cumulativeAPICost)
      upfront_setup: +Math.max(0, cumulative - perSceneSum).toFixed(4),  // one-time bibles/aPlot/cover/anchor
      perSceneSum,
      perScene: g.costs || [],                                      // [{turn,total,text,image}] per scene (gen+repair bundled in text)
      lastScene: g.lastCost
    },
    costLog,   // [SCENE-COST]/[REPAIR]/regen telemetry — the generate-vs-fix breakdown + wasted/audit categories
    scenes: g.scenes
  }, null, 1));
}

log(`\n=== FULL-ISSUE READ — First Sacrifice, 20-scene literary issue, PRODUCTION pipeline ===`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.waitForFunction(() => typeof window._verifyDelivery === 'function', { timeout: 15000 }).catch(() => {});

await page.evaluate(() => {
  const s = window.state;
  s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  window.__disableSpeculativePreload = true;   // COST FIDELITY: the harness drives its own submit, so the speculatively-
  // preloaded next scene is DISCARDED — a dev-only ~2× waste a real user never pays. Disable it. (No __forceHeavyBuild —
  // use production tier routing so BOTH the prose read AND the cost reflect what a real First Sacrifice user actually gets.)
  // ESTABLISHED-USER PATH: the first-time deck onboarding (Scene 2 petition / Scene 3 tempt) gates the headless submit on
  // real fate-card UI clicks → can't drive it headless. Mark the account onboarded so this runs as a normal post-onboarding
  // First Sacrifice story (a real production path, and the representative test of SUSTAINED scene quality, not the tutorial).
  try { localStorage.setItem('sb_stories_onboarded', '1'); } catch (_) {}
  window._forceDeckMandate = false;
  // Only stub images (literary path shouldn't call them, defensive) + capture hook.
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

log(`[bootstrap] _launchStarterStory(${STARTER}) …`);
let bootErr = null;
try {
  await page.evaluate(async ({ STARTER, T }) => {
    const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
    if (!def) throw new Error('starter not found');
    await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T))]);
  }, { STARTER, T: SCENE_TIMEOUT });
} catch (e) { bootErr = e && e.message; }
log('[bootstrap] ' + (bootErr ? 'ERR ' + bootErr : 'ok'));
await page.waitForFunction(() => (Date.now() - (window.__lastPageAt || 0)) > 12000 && (window.__capturedPages || []).length >= 1 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => log('  (settle timeout — proceeding)'));

function grab() {
  return page.evaluate(() => {
    const s = window.state;
    const clean = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      scenes: (window.__capturedPages || []).map(clean).filter(t => t.length > 150),
      meta: { pc: s.playerName, li: s.loveInterestName, antagonist: s.aPlot && s.aPlot.antagonistOrAntiForce, goal: s.aPlot && s.aPlot.goal },
      costs: s._sceneCostsThisStory || [],
      lastCost: s._lastSceneAPICost || 0,
      cumulative: s._cumulativeAPICost || 0
    };
  });
}

let g = await grab();
writeOut(g, false);
log(`[scene 1] captured (${g.scenes.length} page(s))`);

for (let i = 0; i < N; i++) {
  const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
  log(`\n[cont ${i + 1}/${N}] turn ${before.turn} — "${A.act.slice(0, 52)}…"`);
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    if (attempt > 0) { log(`  retry ${attempt} (30s backoff)`); await page.waitForTimeout(30000); }
    await page.evaluate(() => { const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; s.hasSeenFortuneTurnDisclosure = true; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; });
    await page.evaluate(({ act, dia }) => { const sv = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; sv('actionInput', act); sv('dialogueInput', dia); }, A);
    try {
      await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
      const started = await page.waitForFunction(({ n, t }) => window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
      if (!started) throw new Error('submit BAILED');
      await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
      ok = true;
    } catch (e) { log('  fail: ' + (e && e.message)); }
  }
  await page.waitForTimeout(1500);
  g = await grab();
  writeOut(g, false);   // progressive capture
  log(`  → captured ${g.scenes.length} scenes total` + (ok ? '' : ' (continuation FAILED — stopping)'));
  if (!ok) break;
}

g = await grab();
writeOut(g, true);
log(`\n=== DONE — ${g.scenes.length} scenes captured → ${OUT} ===`);
log('meta: ' + JSON.stringify(g.meta));
await browser.close();
process.exit(0);
