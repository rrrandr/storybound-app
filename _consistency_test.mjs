// _consistency_test.mjs — REGRESSION SUITE (Roman 2026-07-31): prove scene serialization is DETERMINISTIC,
// not lucky, and measure the COMMUNICATION layer with naive-reader comprehension. Generate the First
// Sacrifice opening N times on Grok (grounding on, temp unchanged), judge each for a scene FINGERPRINT
// (location / Julian role / youth role / incident / tone) + 7 naive-reader comprehension questions.
// Aggregate: consistency % + per-question comprehension %. Re-run after any change to catch regressions.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const N = parseInt(process.argv[2] || '12', 10);
const log = (...a) => console.log(...a);
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
page.on('pageerror', e => log('  PAGEERR ' + (e && e.message)));

async function genOpening() {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._launchStarterStory === 'function', { timeout: 30000 });
  await page.evaluate(() => {
    const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__forceHeavyBuild = true; window.__disableSpeculativePreload = true; window._forceDeckMandate = false; window.__disableSeedGrounding = false;
    window._smallAuthorEnabled = false; window._smallAuthorForceAll = false; // force Grok
    try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
    window.__capturedPages = []; window.__lastPageAt = 0;
    const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; }
  });
  try { await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('to')), 300000))]); }); } catch (_) {}
  try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 9000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 150000, polling: 2000 }); } catch (_) {}
  const d = await page.evaluate(() => ({ pages: window.__capturedPages || [] }));
  return (d.pages || []).map(strip).filter(p => p && p.length > 40).join('\n\n———\n\n');
}

const JUDGE = `You audit ONE Scene-1 opening for CONSISTENCY and first-time-reader COMPREHENSION. Return ONLY JSON:
{
  "fingerprint": { "location": "<one short phrase: where it physically is>", "julianRole": "<Julian's role/position in one phrase, or 'absent/off-page' if only named>", "youthRole": "<the youth's role in one phrase>", "incident": "<the initiating event in one phrase>", "tone": "<one word: ceremony | celebration | crisis | horror | battle | trial | other>" },
  "comprehension": {
    "whatIsFirstFavored": {"answerable": true/false, "answer": "<what a first-timer learns from THIS scene, or ''>"},
    "whyYouthKneeling": {"answerable": true/false, "answer": ""},
    "whyEveryoneWatching": {"answerable": true/false, "answer": ""},
    "whyJulianMatters": {"answerable": true/false, "answer": ""},
    "narratorJob": {"answerable": true/false, "answer": ""},
    "whatIfWrongCall": {"answerable": true/false, "answer": ""},
    "whyPublic": {"answerable": true/false, "answer": ""}
  }
}
Judge as a reader who has NEVER seen this world — 'answerable' is TRUE only if THIS scene actually conveys it, NOT if you infer it from outside knowledge. Be strict. No commentary, no code fences.`;

async function judge(prose) {
  return await page.evaluate(async ({ prose, JUDGE }) => {
    try {
      const res = await fetch('/api/chatgpt-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ messages: [{ role: 'system', content: JUDGE }, { role: 'user', content: 'OPENING:\n\n' + prose }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o', temperature: 0, max_tokens: 1600, jsonMode: true }) });
      if (!res.ok) return 'ERR http ' + res.status;
      const data = await res.json();
      return (data && data.content) || (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'ERR';
    } catch (e) { return 'ERR ' + (e && e.message); }
  }, { prose, JUDGE });
}

const runs = [];
for (let i = 0; i < N; i++) {
  const prose = await genOpening();
  let parsed = null; const raw = await judge(prose);
  try { parsed = JSON.parse(String(raw).replace(/```json?/gi, '').replace(/```/g, '').trim()); } catch (_) {}
  runs.push({ i, prose, parsed });
  const f = parsed && parsed.fingerprint || {};
  log(`[${i + 1}/${N}] loc="${f.location || '?'}" · julian="${f.julianRole || '?'}" · tone=${f.tone || '?'} · incident="${(f.incident || '?').slice(0, 40)}"`);
}

const fp = runs.map(r => r.parsed && r.parsed.fingerprint).filter(Boolean);
const tones = {}; fp.forEach(f => { const t = (f.tone || '?').toLowerCase().trim(); tones[t] = (tones[t] || 0) + 1; });
const julianPresent = fp.filter(f => !/absent|off|shadow|memory|named only|only named/i.test(f.julianRole || 'absent')).length;
const ceremonyLoc = fp.filter(f => /cerem|clearing|veil|rite|gather|grove|glade|square|moss|forest|wood/i.test(f.location || '')).length;
const compQs = ['whatIsFirstFavored', 'whyYouthKneeling', 'whyEveryoneWatching', 'whyJulianMatters', 'narratorJob', 'whatIfWrongCall', 'whyPublic'];
const comp = {}; compQs.forEach(q => { comp[q] = runs.filter(r => r.parsed && r.parsed.comprehension && r.parsed.comprehension[q] && r.parsed.comprehension[q].answerable).length; });
const parsedOK = fp.length;

log('\n════ CONSISTENCY (Grok, N=' + N + ', parsed ' + parsedOK + ') ════');
log('tone distribution: ' + JSON.stringify(tones));
log('ceremony-location: ' + ceremonyLoc + '/' + parsedOK + ' (' + Math.round(ceremonyLoc / parsedOK * 100) + '%)');
log('Julian on-page (not off/named-only): ' + julianPresent + '/' + parsedOK + ' (' + Math.round(julianPresent / parsedOK * 100) + '%)');
log('\n════ COMPREHENSION (naive reader, answerable %) ════');
compQs.forEach(q => log('  ' + q + ': ' + comp[q] + '/' + parsedOK + ' (' + Math.round(comp[q] / parsedOK * 100) + '%)'));

fs.writeFileSync(`${OUT}/consistency_test.json`, JSON.stringify(runs, null, 2));
let rep = 'CONSISTENCY + COMPREHENSION REGRESSION (Grok, N=' + N + ', parsed ' + parsedOK + ')\n\n' +
  'tone: ' + JSON.stringify(tones) + '\nceremony-location: ' + Math.round(ceremonyLoc / parsedOK * 100) + '%\nJulian-on-page: ' + Math.round(julianPresent / parsedOK * 100) + '%\n\n' +
  'comprehension (answerable %):\n' + compQs.map(q => '  ' + q + ': ' + Math.round(comp[q] / parsedOK * 100) + '%').join('\n') +
  '\n\n════ fingerprints ════\n' + runs.map(r => `[${r.i}] ${JSON.stringify((r.parsed && r.parsed.fingerprint) || { PARSE: 'FAIL' })}`).join('\n');
fs.writeFileSync(`${OUT}/consistency_test.txt`, rep);
log('\nsaved → ' + OUT + '/consistency_test.txt');
await browser.close();
process.exit(0);
