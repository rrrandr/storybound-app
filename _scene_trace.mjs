// _scene_trace.mjs — Roman 2026-08-08 PIVOT: trace ONE mismatched scene END-TO-END. No A/B, no stats.
// Reconstruct the real chain: planner-in → planner-out(transition) → author-in(prompt) → author-out(prose) → verifier.
// Method: page.route intercepts EVERY proxy call (relay-only, no behavior change), records req+resp in order, tagged
// by turnCount. This captures the transition the planner ACTUALLY emitted and the prompt the author ACTUALLY got —
// not a post-render state read (which the next-scene prewarm overwrites; that overwrite is exactly how "capture bug C"
// would fake a planner mismatch). Per-turn state snapshots check scene-number agreement across hops (state-desync D).
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = 'starter_first_sacrifice';
const N = 8;                      // scene 1 + 8 continuations — covers the mid-issue region where mismatches appeared
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/scene_trace.json';
const SCENE_TIMEOUT = 380000, CONT_TIMEOUT = 480000;
const PROXY_RE = /\/api\/[a-z]*-?proxy\b/;

const ACTIONS = [
  { act: 'I refuse to let the rite finish — I demand to know what the wish actually cost.', dia: 'Whose price is this? Say it before another word of the vow is spoken.' },
  { act: 'I press the one who blames me to admit it to my face, in front of everyone.', dia: 'You think I made that wish. Then name me. Here. Now.' },
  { act: 'I go looking for the truth of what happened the night the bond cracked.', dia: 'Someone here knows. I mean to find out who.' },
  { act: 'I put myself between the youth and the elders, whatever it costs me.', dia: 'You will not spend them to cover your own mistake.' },
  { act: 'I confront Julian directly and make him tell me what he did.', dia: 'No more shielding me. I want it from you, all of it.' },
  { act: 'I offer my own years to the binding if it will spare the youth.', dia: 'Take the price from me instead. I can carry it.' },
  { act: 'I search the archive for the record of the original wish.', dia: 'If it was written, it can be found. And I will find it.' },
  { act: 'I expose the one who truly made the forbidden wish, in the open.', dia: 'You let me carry your guilt for five years. That ends tonight.' }
];

const log = (...a) => console.log(...a);

// ---- Node-side capture buffers ----
const proxyTrace = [];   // {i, t, url, model, reqMessages:[{role,content}], respText, err}
const consoleTrace = []; // {t, text} — only the pipeline-structural tags
let proxyIdx = 0;

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();

// Relay-only proxy interception: replay the exact request upstream, record req+resp, fulfill with the real response.
// No params changed, no extra calls — the app sees identical behavior; we only observe.
await page.route(PROXY_RE, async (route) => {
  const i = ++proxyIdx;
  const t = Date.now();
  const url = route.request().url();
  let reqMessages = null, model = null;
  try {
    const pd = route.request().postData();
    if (pd) { const j = JSON.parse(pd); model = j.model || null; reqMessages = (j.messages || []).map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })); }
  } catch (_) {}
  try {
    const resp = await route.fetch();
    const body = await resp.text();
    let respText = null;
    try { const j = JSON.parse(body); respText = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || null; } catch (_) { respText = body.slice(0, 4000); }
    proxyTrace.push({ i, t, url, model, reqMessages, respText });
    await route.fulfill({ response: resp, body });
  } catch (e) {
    proxyTrace.push({ i, t, url, model, reqMessages, respText: null, err: String(e && e.message) });
    try { await route.continue(); } catch (_) { try { await route.abort(); } catch (__) {} }
  }
});

page.on('console', m => {
  const t = m.text();
  if (/\[STATE-CHANGE|\[COMMIT-SCENE|\[AUTHOR-PRIORITY|\[TRANSITION-POS|\[DELIVERY|\[ROLLBACK|pendingIntent|plotContract|milestone/i.test(t)) consoleTrace.push({ t: Date.now(), text: t.slice(0, 300) });
});
page.on('pageerror', e => consoleTrace.push({ t: Date.now(), text: 'PAGEERROR: ' + (e && e.message) }));

function snapshotState() {
  return page.evaluate(() => {
    const s = window.state;
    const clean = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const pages = (window.__capturedPages || []).map(clean).filter(t => t.length > 150);
    // Best-effort read of the planner-visible plot state. Field names per memory; guarded so unknowns don't throw.
    const pc = s._scenePlotContract || s._plotContract || null;
    return {
      turnCount: s.turnCount || 0,
      goal: s.aPlot && s.aPlot.goal,
      currentMilestone: (s.aPlot && (s.aPlot.currentMilestone || s.aPlot.milestone)) || (s._currentMilestone) || null,
      pendingIntent: s._pendingIntent || s.pendingIntent || null,
      priorSceneStateChange: s._priorSceneStateChange || null,
      committedFacts: (s._committedState && (s._committedState.facts || s._committedState)) || s._committedFacts || null,
      plotContractStateChange: pc && (pc.state_change || pc.stateChange || pc.transition || pc.event) || null,
      plotContractSetting: pc && (pc.setting || pc.location || pc.place) || null,
      lastProseTail: pages.length ? pages[pages.length - 1].slice(-600) : null,
      lastProseHead: pages.length ? pages[pages.length - 1].slice(0, 400) : null,
      sceneCount: pages.length
    };
  });
}

function writeOut(done, turnSnaps) {
  fs.writeFileSync(OUT, JSON.stringify({
    starter: STARTER, done,
    proxyCallCount: proxyTrace.length,
    // proxy calls: keep req/resp but trim gigantic author prompts’ NON-author messages for readability; keep full content.
    proxyTrace: proxyTrace.map(p => ({
      i: p.i, t: p.t, url: p.url.replace(/^https?:\/\/[^/]+/, ''), model: p.model,
      reqMessages: (p.reqMessages || []).map(m => ({ role: m.role, len: (m.content || '').length, content: m.content })),
      respText: p.respText, err: p.err || null
    })),
    consoleTrace, turnSnaps
  }, null, 1));
}

log(`\n=== SCENE TRACE — First Sacrifice, full per-call chain, ${N} continuations ===`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });

await page.evaluate(() => {
  const s = window.state;
  s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  window.__disableSpeculativePreload = true;
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

const turnSnaps = [];
turnSnaps.push({ label: 'after-scene-1', proxyIdxAt: proxyIdx, ...(await snapshotState()) });
writeOut(false, turnSnaps);
log(`[scene 1] captured — proxy calls so far: ${proxyIdx}`);

for (let i = 0; i < N; i++) {
  const A = ACTIONS[i] || ACTIONS[ACTIONS.length - 1];
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
  const proxyBefore = proxyIdx;
  log(`\n[cont ${i + 1}/${N}] turn ${before.turn} — "${A.act.slice(0, 50)}…"  (proxy@${proxyBefore})`);
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
  const snap = { label: `after-cont-${i + 1}`, action: A.act, proxyRange: [proxyBefore + 1, proxyIdx], ...(await snapshotState()) };
  turnSnaps.push(snap);
  writeOut(false, turnSnaps);
  log(`  → scenes=${snap.sceneCount} turn=${snap.turnCount} proxyCalls[${proxyBefore + 1}..${proxyIdx}]` + (ok ? '' : ' (FAILED — stopping)'));
  log(`     head: ${(snap.lastProseHead || '').slice(0, 90)}`);
  if (!ok) break;
}

writeOut(true, turnSnaps);
log(`\n=== DONE — ${proxyTrace.length} proxy calls, ${turnSnaps.length} snapshots → ${OUT} ===`);
await browser.close();
process.exit(0);
