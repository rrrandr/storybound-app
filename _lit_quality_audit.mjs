// _lit_quality_audit.mjs — LITERARY-path quality audit (Roman 2026-08-07). Parallels the CG tests but for
// the prose engine. Reuses the PROVEN momentum-harness driver (bootstrap → settle → disarm onboarding gates
// → #submitBtn), drives a full ~10-scene issue with VARIED FORWARD-ADVANCING actions (the confound lesson:
// backward/constant actions manufacture looping), deck-scripting OFF (clean repetition signal). Captures full
// prose + per-scene plot-delivery verdict per scene for offline analysis of: repetition/loops, aimless
// plot/dialogue, Character+ per named character, environmental description.
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = process.env.STARTER || 'starter_first_sacrifice';   // Fatelands (rich world → env-desc + Character+); or starter_the_first_taste
const N = Number(process.env.N || 9);                               // continuations after Scene 1 → ~10 scenes
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/lit_audit.json';
const SCENE_TIMEOUT = 360000, CONT_TIMEOUT = 460000;

// FORWARD-ADVANCING actions (act/confront/seek/offer/commit — NOT re-read/remember). One per continuation.
const ACTIONS = [
  { act: 'I press him for the truth about the wish that was made, and refuse to let him deflect.', dia: 'No more half-answers. Tell me who made the wish, and what it cost.' },
  { act: 'I make my choice and step toward the danger instead of away from it.', dia: 'If this is on me now, then I face it — not hide from it.' },
  { act: 'I confront the one who blames me and demand they say it to my face.', dia: 'You think I did this. Say it plainly, here, now.' },
  { act: 'I seek out the place where it happened and search for what was left behind.', dia: 'Whatever the truth is, it is still here somewhere. I mean to find it.' },
  { act: 'I offer something of my own to change what is coming, whatever it costs me.', dia: 'Take it from me instead. I will pay the price if it spares them.' },
  { act: 'I stop waiting and force the confrontation into the open.', dia: 'We settle this now, in front of everyone. No more shadows.' },
  { act: 'I choose him over my own safety and commit to it out loud.', dia: 'I am not leaving you to this. Whatever happens, we go together.' },
  { act: 'I turn the trap back on the one who set it.', dia: 'You built this to break me. Watch it close on you instead.' },
  { act: 'I decide what I actually want, and I refuse to be talked out of it.', dia: 'I know my own mind now. This is the path I choose.' }
];

const log = (...a) => console.log(...a);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
const consoleRing = [], stateChangeEvents = [], authorLines = [], decalcMarks = [];
let _scSeq = 0;
page.on('console', m => {
  const t = m.text();
  consoleRing.push(`[${m.type()}] ${t.slice(0, 200)}`); if (consoleRing.length > 100) consoleRing.shift();
  const sc = t.match(/\[STATE-CHANGE:EVENT\]\s*scene=(-?\d+)\s*::\s*(.+)$/);
  if (sc) stateChangeEvents.push({ scene: Number(sc[1]), event: sc[2].trim(), seq: _scSeq++ });
  if (/PRIMARY_AUTHOR|grok|mistral|fell back|fallback|_promptTier|\[AUTHOR-MODEL\]/i.test(t)) authorLines.push(t.slice(0, 160));
  if (/\[INTRA-BEAT:DECALC\]|\[ONCE-TIC:REDUCE\]/i.test(t)) decalcMarks.push(t.slice(0, 200));
});
page.on('pageerror', e => consoleRing.push('PAGEERROR: ' + (e && e.message)));

log(`\n=== LITERARY QUALITY AUDIT — starter=${STARTER} N=${N} (deck-scripting OFF, forward actions) ===`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.waitForFunction(() => typeof window._verifyDelivery === 'function', { timeout: 15000 }).catch(() => {});

await page.evaluate(() => {
  const s = window.state;
  s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  // DECK-SCRIPTING OFF — isolate real planner/author quality (scripted Scene 1/2/3 closers contaminate the repetition metric)
  try { localStorage.setItem('sb_stories_onboarded', '1'); } catch (_) {}
  window._forceDeckMandate = false;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  try {
    const SP = window.StoryPagination;
    if (SP && typeof SP.addPage === 'function' && !SP.__wrapped) {
      const real = SP.addPage.bind(SP);
      SP.addPage = function (html, isNew) { try { window.__capturedPages.push(String(html || '')); window.__lastPageAt = Date.now(); } catch (_) {} return real(html, isNew); };
      SP.__wrapped = true;
    }
  } catch (_) {}
  window.__forceHeavyBuild = true;   // production HEAVY/Grok author (matches real momentum tier)
});

// ── bootstrap Scene 1 ──
log(`[bootstrap] _launchStarterStory(${STARTER}) …`);
let bootErr = null;
try {
  await page.evaluate(async ({ STARTER, T }) => {
    const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
    if (!def) throw new Error('starter def not found: ' + STARTER);
    await Promise.race([ window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T)) ]);
  }, { STARTER, T: SCENE_TIMEOUT });
} catch (e) { bootErr = e && e.message; }
const afterBoot = await page.evaluate(() => ({ turnCount: window.state.turnCount, pages: (window.__capturedPages || []).length }));
log(`[bootstrap] ${bootErr ? 'ERR ' + bootErr : 'ok'} — turn=${afterBoot.turnCount} pages=${afterBoot.pages}`);

log('[settle] waiting for bootstrap tail to quiesce …');
await page.waitForFunction(() => (Date.now() - (window.__lastPageAt || 0)) > 12000 && (window.__capturedPages || []).length >= 1 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => log('  (still active after 90s — proceeding)'));

// ── drive N continuations with VARIED forward actions ──
const scenes = [];
for (let i = 0; i < N; i++) {
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
  const beforeScSeq = _scSeq;
  const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
  log(`\n[cont ${i + 1}/${N}] turn ${before.turn} — "${A.act.slice(0, 50)}…"`);
  // disarm continuation + onboarding gates (proven set from the momentum harness)
  await page.evaluate(() => {
    const s = window.state;
    s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true;
    s._isAdvancingScene = false; s._advanceStartedAt = 0;
    window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true;
  });
  await page.evaluate(({ act, dia }) => {
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } };
    setVal('actionInput', act); setVal('dialogueInput', dia);
  }, A);
  let contErr = null;
  for (let attempt = 0; attempt < 2 && contErr === null; attempt++) {
    try {
      await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
      const started = await page.waitForFunction(({ n, t }) => window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
      if (!started) throw new Error('submit BAILED — gen never started');
      await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
      break;
    } catch (e) { contErr = e && e.message; log('  fail: ' + contErr + (attempt === 0 ? ' — retry once in 20s' : '')); if (attempt === 0) { await page.waitForTimeout(20000); contErr = null; } }
  }
  const scForThis = stateChangeEvents.filter(e => e.seq >= beforeScSeq && e.scene === before.turn);
  const targetEvent = scForThis.length ? scForThis[0].event : '';
  const rec = await page.evaluate(async ({ event }) => {
    const pages = window.__capturedPages || [];
    const html = pages[pages.length - 1] || '';
    const prose = String(html).replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    let v = { delivery: 'ERROR', transition_position: -1, dominant_replacement: 'none' };
    try { if (event) v = await window._verifyDelivery(prose, event); } catch (_) {}
    return { turn: window.state.turnCount || null, prose, plotTarget: event, delivery: v.delivery, transition_position: v.transition_position, dominant_replacement: v.dominant_replacement, proseLen: prose.length };
  }, { event: targetEvent });
  rec.action = A.act; rec.error = contErr || null;
  scenes.push(rec);
  log(`  turn=${rec.turn} len=${rec.proseLen} delivery=${rec.delivery} target="${String(rec.plotTarget).slice(0, 60)}"`);
  if (contErr) { log('  (continuation errored — stopping)'); break; }
}

// capture the Scene-1 prose (first captured page) + final state cast
const meta = await page.evaluate(() => {
  const s = window.state;
  const first = (window.__capturedPages || [])[0] || '';
  const scene1 = String(first).replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    scene1,
    cast: { pc: s.playerName, li: s.loveInterestName, antagonist: s.aPlot && s.aPlot.antagonistOrAntiForce, goal: s.aPlot && s.aPlot.goal },
    world: { world: s.world, worldSubtype: s.worldSubtype, flavor: s.flavor },
    bibles: { pc: s.pcBodyBible, li: s.liBodyBible }
  };
});

const out = { starter: STARTER, n: N, meta, scenes, decalcMarks, authorLines: authorLines.slice(-12), consoleTail: consoleRing.slice(-40) };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
log(`\n=== DONE — ${scenes.length} continuations, wrote ${OUT} ===`);
log(`author telemetry (tail): ${JSON.stringify(authorLines.slice(-4))}`);
await browser.close();
process.exit(0);
