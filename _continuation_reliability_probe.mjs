// _continuation_reliability_probe.mjs — RELIABILITY investigation (NOT momentum).
//
// Goal: find WHY a literary continuation stalls BEFORE the PRIMARY_AUTHOR call. The momentum harness is
// frozen; this is a separate infra probe. It wraps window.fetch to trace every /api call's start/end +
// keeps an in-flight registry, then submits ONE continuation and — instead of waiting the full timeout —
// polls the in-flight set and reports any request that started and never finished (the hang), with its
// role/model/url/age. Deterministic bug (0/3 same stage) → one reproduction should pinpoint it.
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STARTER = process.env.STARTER || 'starter_first_sacrifice';
const STALL_REPORT_AFTER = Number(process.env.STALL_AFTER || 45000);   // report in-flight calls older than this
const MAX_WAIT = Number(process.env.MAX_WAIT || 120000);               // give up after this
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
const consoleRing = [];
page.on('console', m => { const t = m.text(); consoleRing.push(t.slice(0, 200)); if (consoleRing.length > 120) consoleRing.shift(); });
page.on('pageerror', e => consoleRing.push('PAGEERROR: ' + (e && e.message)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window._launchStarterStory === 'function', { timeout: 30000 });

// ── instrument fetch BEFORE any generation, so every /api call is traced ──
await page.evaluate(() => {
  window.__fetchLog = []; window.__inflight = {}; let seq = 0;
  const real = window.fetch;
  window.fetch = function (url, opts) {
    const id = ++seq; let role = '', model = '', mode = '';
    try { const b = JSON.parse((opts && opts.body) || '{}'); role = b.role || ''; model = b.model || b.preferredModel || ''; mode = b.mode || ''; } catch (e) {}
    const rec = { id, url: String(url), role, model, mode, start: Date.now(), end: null, status: null, err: null };
    window.__fetchLog.push(rec); window.__inflight[id] = rec;
    return real.apply(this, arguments).then(r => { rec.end = Date.now(); rec.status = r.status; delete window.__inflight[id]; return r; },
      e => { rec.end = Date.now(); rec.err = String(e && e.message); delete window.__inflight[id]; throw e; });
  };
  // account + image stub + capture + gate bypass flags
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  try { const SP = window.StoryPagination; if (SP && !SP.__w) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); return r(h, n); }; SP.__w = true; } } catch (_) {}
});

log(`\n=== CONTINUATION RELIABILITY PROBE — starter=${STARTER} ===`);
log('[bootstrap] launching starter story…');
let bootErr = null;
try {
  await page.evaluate(async (STARTER) => {
    const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
    if (!def) throw new Error('no starter def');
    await window._launchStarterStory(def);
  }, STARTER);
} catch (e) { bootErr = e && e.message; }
// settle the bootstrap tail
try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 12000 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }); } catch (_) {}
const boot = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, fetches: (window.__fetchLog || []).length }));
log(`[bootstrap] done — pages=${boot.pages}, bootstrap fetches=${boot.fetches}${bootErr ? ' (err: ' + bootErr + ')' : ''}`);

// mark the fetch boundary: continuation fetches are those after this count
const preContinuationFetchCount = boot.fetches;

// clear onboarding/consent gates, set inputs, submit
await page.evaluate(({ act, dia }) => {
  const s = window.state;
  s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true;
  s._isAdvancingScene = false; s._advanceStartedAt = 0;
  window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true;
  const setV = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  setV('actionInput', act); setV('dialogueInput', dia);
}, { act: process.env.SAYDO_ACT || 'cross the room to stand in front of her', dia: process.env.SAYDO_DIA || 'I need to know what you decided.' });
log('[continuation] clicking #submitBtn + tracing fetches…');
await page.evaluate(() => { const b = document.getElementById('submitBtn'); if (b) b.click(); });

// poll: watch for the scene to render OR a hung fetch to surface
const t0 = Date.now();
let done = false, reportedHang = false;
while (Date.now() - t0 < MAX_WAIT) {
  const snap = await page.evaluate((preCount) => {
    const now = Date.now();
    const inflight = Object.values(window.__inflight || {}).map(r => ({ role: r.role, model: r.model, mode: r.mode, url: r.url, ageMs: now - r.start }));
    const contFetches = (window.__fetchLog || []).slice(preCount).map(r => ({ role: r.role, model: r.model, mode: r.mode, status: r.status, err: r.err, ms: (r.end || now) - r.start, done: r.end != null }));
    const rendered = (window.__capturedPages || []).length;
    const lastConsole = null;
    return { inflight, contFetches, rendered, turn: window.state.turnCount };
  }, preContinuationFetchCount);

  if (snap.rendered > boot.pages || snap.turn > 0) {
    log(`\n[RESULT] continuation RENDERED (reached author + beyond). turn=${snap.turn}. This attempt did NOT stall.`);
    log('  continuation fetches:'); snap.contFetches.forEach(f => log(`    ${f.done ? 'ok ' : 'INFLIGHT'} ${String(f.role || f.mode || '?').padEnd(20)} ${String(f.model || '').padEnd(28)} ${f.status || f.err || ''} ${f.ms}ms`));
    done = true; break;
  }
  // any request in-flight longer than the stall threshold = the hang
  const hung = snap.inflight.filter(r => r.ageMs > STALL_REPORT_AFTER);
  if (hung.length && !reportedHang) {
    reportedHang = true;
    log(`\n[HANG DETECTED] ${hung.length} request(s) in-flight > ${Math.round(STALL_REPORT_AFTER / 1000)}s — this is the stall:`);
    hung.forEach(r => log(`  ⛔ role=${r.role || '(none)'} mode=${r.mode || ''} model=${r.model || ''} url=${r.url} age=${Math.round(r.ageMs / 1000)}s`));
    log(`\n  ALL continuation fetches so far (${snap.contFetches.length}):`);
    snap.contFetches.forEach(f => log(`    ${f.done ? 'done' : 'INFLIGHT'} role=${(f.role || f.mode || '?')} model=${(f.model || '')} ${f.done ? (f.status || f.err) + ' ' + f.ms + 'ms' : 'age ' + f.ms + 'ms'}`));
    log(`\n  → The INFLIGHT call above never returns = the reliability bug. (role/model tells you which upstream.)`);
  }
  await new Promise(r => setTimeout(r, 4000));
}

// ALWAYS dump the full continuation-fetch picture + post-submit console (the definitive diagnostic)
const final = await page.evaluate((preCount) => {
  const now = Date.now();
  return {
    contFetches: (window.__fetchLog || []).slice(preCount).map(r => ({ role: r.role, model: r.model, mode: r.mode, url: (r.url || '').replace(/^https?:\/\/[^/]+/, ''), status: r.status, err: r.err, ms: (r.end || now) - r.start, done: r.end != null })),
    inflight: Object.values(window.__inflight || {}).map(r => ({ role: r.role, model: r.model, mode: r.mode, url: (r.url || '').replace(/^https?:\/\/[^/]+/, ''), ageMs: now - r.start })),
    rendered: (window.__capturedPages || []).length, turn: window.state.turnCount, advancing: window.state._isAdvancingScene
  };
}, preContinuationFetchCount);
log(`\n=== FINAL DIAGNOSTIC ===`);
log(`rendered=${final.rendered} (boot had ${boot.pages}) · turn=${final.turn} · _isAdvancingScene=${final.advancing}`);
log(`continuation fetches AFTER submit: ${final.contFetches.length}`);
final.contFetches.forEach(f => log(`  ${f.done ? 'done' : 'INFLIGHT'}  role=${(f.role || f.mode || '?')}  model=${(f.model || '-')}  ${f.url}  ${f.done ? (f.status || f.err) + ' ' + f.ms + 'ms' : 'age ' + f.ms + 'ms'}`));
if (!final.contFetches.length) log('  ⚠ ZERO continuation fetches — the hang is BEFORE any network call (a sync/modal/non-fetch await right after [PLAYER-IMPACT]).');
if (final.inflight.length) { log(`in-flight (never returned): ${final.inflight.length}`); final.inflight.forEach(r => log(`  ⛔ role=${r.role || r.mode || '?'} model=${r.model || '-'} ${r.url} age=${Math.round(r.ageMs / 1000)}s`)); }
log(`\npost-submit console (last 20):`); consoleRing.slice(-20).forEach(l => log('   · ' + l));
await browser.close();
