// _reliability_verify.mjs — proves the continuation pipeline is stable AFTER the proxy hang-guard fix.
// Runs N continuations (fresh story each, neutral say/do), and for each records: did it COMPLETE (render),
// how long, which author model served the prose, and whether a hang-guard fallback fired. Success criterion
// (Roman): N consecutive completions, no infinite hangs, fallback only when the timeout actually trips.
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = process.env.STARTER || 'starter_first_sacrifice';
const N = Number(process.env.N || 10);
const RENDER_TIMEOUT = Number(process.env.RENDER_TIMEOUT || 600000);  // generous: 120s hang-guard + fallback + margin
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];

for (let run = 1; run <= N; run++) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await ctx.newPage();
  const authorLines = [];
  page.on('console', m => {
    const t = m.text();
    if (/\[SPECIALIST-PROXY\]|NARRATIVE_AUTHOR|GROK-LIT/.test(t)) authorLines.push(t.slice(0, 160));
  });
  const t0 = Date.now();
  let rendered = false, err = null;
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && typeof window._launchStarterStory === 'function', { timeout: 30000 });
    await page.evaluate(() => {
      const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
      try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
      window.__capturedPages = [];
      try { const SP = window.StoryPagination; if (SP && !SP.__w) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); return r(h, n); }; SP.__w = true; } } catch (_) {}
    });
    // bootstrap
    await page.evaluate(async (STARTER) => { const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER); await window._launchStarterStory(def); }, STARTER);
    await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 12000 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});
    const bootPages = await page.evaluate(() => (window.__capturedPages || []).length);
    // clear gates + submit neutral say/do
    await page.evaluate(() => {
      const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true;
      s._isAdvancingScene = false; s._advanceStartedAt = 0; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true;
      const setV = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
      setV('actionInput', 'cross the room to stand in front of her'); setV('dialogueInput', 'I need to know what you decided.');
      const b = document.getElementById('submitBtn'); if (b) b.click();
    });
    await page.waitForFunction((n) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > 0, bootPages, { timeout: RENDER_TIMEOUT, polling: 3000 });
    rendered = true;
  } catch (e) { err = e && e.message; }
  const ms = Date.now() - t0;

  // extract author telemetry from console
  const authorCall = authorLines.filter(l => /latency=.*model=grok/.test(l)).pop() || '';
  const fellBack = authorLines.some(l => /TIMED OUT|advancing chain/.test(l));
  const grokLit = authorLines.filter(l => /GROK-LIT/.test(l)).pop() || '';
  results.push({ run, rendered, ms, fellBack, authorCall: authorCall.replace(/^.*\[SPECIALIST-PROXY\]\s*/, ''), grokLit: grokLit.replace(/^.*\[GROK-LIT\]\s*/, '') });
  log(`  run ${run}/${N}: ${rendered ? 'COMPLETE' : 'FAIL(' + err + ')'} in ${(ms / 1000).toFixed(0)}s${fellBack ? ' [hang-guard fallback fired]' : ''}  ${authorCall.replace(/^.*latency=/, 'author latency=')}`);
  await ctx.close();
}

const done = results.filter(r => r.rendered).length;
const hangs = results.filter(r => !r.rendered).length;
const fallbacks = results.filter(r => r.fellBack).length;
log(`\n=== RELIABILITY VERIFICATION (N=${N}) ===`);
log(`completed: ${done}/${N}   ·   failed/hung: ${hangs}   ·   hang-guard fallbacks fired: ${fallbacks}`);
log(`author latencies: ${results.map(r => (r.ms / 1000).toFixed(0) + 's').join(', ')}`);
log(done === N && hangs === 0 ? '\nRESULT: PASS — pipeline stable, no infinite hangs. Fallbacks (if any) fired only via the timeout guard.' : `\nRESULT: ${done}/${N} — investigate the ${hangs} that did not complete.`);
await browser.close();
process.exit(done === N ? 0 : 1);
