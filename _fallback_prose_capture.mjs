// _fallback_prose_capture.mjs — production-scale quality check of the FALLBACK author.
// Bootstraps a real story, submits one continuation, and prints the FULL rendered scene + garbage heuristics.
// Run this with the server's XAI_CALL_TIMEOUT_MS set very low (e.g. 1500) so the reasoning primary always
// times out and the prose is authored by the grok-4-1-fast-non-reasoning FALLBACK on the real ~80k-token
// production prompt — the exact condition Roman worried might garble. Read the output and judge coherence.
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const STARTER = process.env.STARTER || 'starter_first_sacrifice';
const RENDER_TIMEOUT = Number(process.env.RENDER_TIMEOUT || 600000);
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window._launchStarterStory === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  try { const SP = window.StoryPagination; if (SP && !SP.__w) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); return r(h, n); }; SP.__w = true; } } catch (_) {}
});
log('[bootstrap]…');
await page.evaluate(async (STARTER) => { const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER); await window._launchStarterStory(def); }, STARTER);
await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 12000 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});
const bootPages = await page.evaluate(() => (window.__capturedPages || []).length);
log('[continuation] submitting (reasoning primary will time out → non-reasoning fallback authors)…');
await page.evaluate(() => {
  const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true;
  s._isAdvancingScene = false; s._advanceStartedAt = 0; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true;
  const setV = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  setV('actionInput', 'cross the room to stand in front of her'); setV('dialogueInput', 'I need to know what you decided.');
  const b = document.getElementById('submitBtn'); if (b) b.click();
});
let ok = false;
try { await page.waitForFunction((n) => (window.__capturedPages || []).length > n, bootPages, { timeout: RENDER_TIMEOUT, polling: 3000 }); ok = true; } catch (e) { log('[FAIL] ' + (e && e.message)); }

const prose = await page.evaluate((n) => {
  const pages = window.__capturedPages || [];
  const html = pages[n] || pages[pages.length - 1] || '';
  return String(html).replace(/<br\s*\/?>(?=)/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}, bootPages);
const words = prose.trim().split(/\s+/); const wc = words.length;
const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / Math.max(1, wc);
const nonAscii = (prose.match(/[^\x00-\x7F]/g) || []).length / Math.max(1, prose.length);
const gibberish = words.filter(w => /[a-z]{20,}|(.)\1\1\1/i.test(w)).length;
log(`\n=== FALLBACK PROSE (production-size continuation) — rendered=${ok} ===`);
log(`words=${wc} · uniqueWordRatio=${uniqueRatio.toFixed(2)} · nonAsciiRatio=${nonAscii.toFixed(3)} · gibberishTokens=${gibberish}`);
log(`\n----- FULL SCENE -----\n${prose}\n----- END -----`);
await browser.close();
