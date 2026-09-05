// _author_ab.mjs — run the author A/B (Roman 2026-07-30): same HEAVY First-Sacrifice prompt authored by
// Grok-4.3 reasoning=high (cold+warm), Grok-4.3 reasoning=low, and Mistral Small 4 (mistral-small-2603).
// Reports measured tokens + $ + prose for a blind read. ~$0.20 (4 author calls). Uses window._authorModelABTest.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
page.on('console', m => { const t = m.text(); if (/\[AB\]|MODEL:SERVED|SPECIALIST-PROXY\] latency|MISTRAL-PROXY/.test(t)) log('  · ' + t.slice(0, 180)); });
page.on('pageerror', e => log('  PAGEERR ' + (e && e.message)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function' && typeof window._authorModelABTest === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  window.__forceHeavyBuild = true; window.__disableSpeculativePreload = true; window._forceDeckMandate = false;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; }
});
log('[boot] First Sacrifice (HEAVY, capturing prompt) …');
try { await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('boot to')), 360000))]); }); } catch (e) { log('[boot] ' + e.message); }
try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 10000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 90000, polling: 2000 }); } catch (_) {}

async function heavyCaptured() { return await page.evaluate(() => !!(window.state._lastHeavyAuditPrompt && window.state._lastHeavyAuditPrompt.system)); }
if (!(await heavyCaptured())) {
  // the HEAVY audit prompt is captured on the scene-2+ literary path — drive one continuation.
  log('[capture] Scene 1 did not capture HEAVY prompt — driving one continuation …');
  try { await page.waitForFunction(() => !window.state._isAdvancingScene && !window.state.isPreloadingNextScene && (Date.now() - (window.__lastPageAt || 0)) > 6000, {}, { timeout: 200000, polling: 2000 }); } catch (_) {}
  await page.evaluate(() => { const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true; s._petitionEmergenceFired = true; s._temptEmergenceFired = true; const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }; set('actionInput', 'press him on why the binding chose the two of you'); set('dialogueInput', 'What did you give up for this?'); });
  const before = await page.evaluate(() => ({ p: (window.__capturedPages || []).length, t: window.state.turnCount || 0 }));
  try {
    await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
    await page.waitForFunction(() => window.state._isAdvancingScene === true, {}, { timeout: 45000, polling: 1000 }).catch(() => {});
    await page.waitForFunction(({ p, t }) => { const a = window.state._isAdvancingScene === true; const pp = (window.__capturedPages || []).length; const tt = window.state.turnCount || 0; return !a && (pp > p || tt > t) && (Date.now() - (window.__lastPageAt || 0)) > 8000; }, { p: before.p, t: before.t }, { timeout: 420000, polling: 2500 });
  } catch (e) { log('[continuation] ' + e.message); }
}
const cap = await page.evaluate(() => ({ heavy: !!(window.state._lastHeavyAuditPrompt && window.state._lastHeavyAuditPrompt.system), heavyLen: (window.state._lastHeavyAuditPrompt && window.state._lastHeavyAuditPrompt.system || '').length }));
log('[capture] HEAVY prompt captured=' + cap.heavy + ' len=' + cap.heavyLen);
if (!cap.heavy) { log('[abort] no HEAVY prompt captured — cannot run A/B'); await browser.close(); process.exit(1); }

log('\n[AB] firing Grok-4.3 high(cold/warm) · Grok-4.3 low · Mistral-Small-4 …');
const result = await page.evaluate(async () => { try { return await window._authorModelABTest({ mistral: true }); } catch (e) { return { error: (e && e.message) || 'threw' }; } });
const rows = (result && result.rows) || [];

log('\n╔════════════════════════════════════════════════════════════════════════════╗');
log('║  AUTHOR A/B — same HEAVY First-Sacrifice prompt · cost measured, quality yours ║');
log('╚════════════════════════════════════════════════════════════════════════════╝');
log('config                            | served              | prompt_tok | cached | out_tok |    cost | ms     | prose_c');
rows.forEach(r => {
  if (r.error) { log((r.label || '?').padEnd(33) + ' | ERROR: ' + r.error); return; }
  log(String(r.label).padEnd(33) + ' | ' + String(r.served).padEnd(19) + ' | ' + String(r.promptTok).padStart(10) + ' | ' + String(r.cachedTok).padStart(6) + ' | ' + String(r.outTok).padStart(7) + ' | $' + String(r.costUsd).padStart(6) + ' | ' + String(r.ms).padStart(6) + ' | ' + String(r.chars).padStart(7));
});
// prose dump for the blind read
let prose = '';
rows.filter(r => !r.error && r.text).forEach(r => { prose += '\n\n════════════════════ ' + r.label + '  ($' + r.costUsd + ' · ' + r.chars + 'c · ' + r.ms + 'ms · served=' + r.served + ') ════════════════════\n\n' + r.text; });
fs.writeFileSync(`${OUT}/ab_prose.txt`, prose);
fs.writeFileSync(`${OUT}/ab_rows.json`, JSON.stringify(rows, null, 2));
log('\nprose → ' + OUT + '/ab_prose.txt   (blind read)');
// quick cost headline
const g = rows.find(r => /high \(cold\)/.test(r.label || '')), gl = rows.find(r => /reasoning=low/.test(r.label || '')), mi = rows.find(r => /Mistral/.test(r.label || ''));
if (g && mi && !g.error && !mi.error) log('\nCOST: Grok-high $' + g.costUsd + '  ·  Grok-low $' + (gl ? gl.costUsd : '?') + '  ·  Mistral-Small-4 $' + mi.costUsd + '   → Mistral is ' + (g.costUsd / mi.costUsd).toFixed(1) + '× cheaper than Grok-high on this scene');
await browser.close();
process.exit(0);
