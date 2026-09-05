// _seed_opening_eval.mjs — VERIFY the three plumbing-leak fixes on the First Sacrifice OPENING,
// generated with BOTH Grok-4.3 (thinking) AND Mistral Small (Roman 2026-07-31). Grounding ON for
// both. Auto-checks: LI committed "Julian" from seed · LI species First Favored · no "a friend"
// placeholder · no "Soren" phantom · seed block present. ~2 opening gens.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const log = (...a) => console.log(...a);
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const CONFIGS = [
  { label: 'Grok-4.3 (thinking)', smallEnabled: false, forceSmall: false },
  { label: 'Mistral-Small-4',     smallEnabled: true,  forceSmall: true }
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
let served = [];
page.on('console', m => { const t = m.text(); if (/MODEL:SERVED/.test(t)) served.push(t.slice(0, 140)); if (/CANONICAL-CHARACTERS|\[STARTER\]/.test(t)) log('  · ' + t.slice(0, 150)); });
page.on('pageerror', e => log('  PAGEERR ' + (e && e.message)));

async function runOpening(cfg) {
  served = [];
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._launchStarterStory === 'function', { timeout: 30000 });
  await page.evaluate((cfg) => {
    const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__forceHeavyBuild = true; window.__disableSpeculativePreload = true; window._forceDeckMandate = false;
    window.__disableSeedGrounding = false;             // grounding ON for all verification runs
    window._smallAuthorEnabled = cfg.smallEnabled;     // false ⇒ force Grok everywhere
    window._smallAuthorForceAll = cfg.forceSmall;      // true  ⇒ force Mistral Small even on Scene 1
    try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
    window.__capturedPages = []; window.__lastPageAt = 0;
    const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; }
  }, cfg);
  log('[boot] First Sacrifice OPENING · author=' + cfg.label + ' (grounding ON) …');
  try { await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('boot to')), 360000))]); }); } catch (e) { log('[boot] ' + e.message); }
  try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 10000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 180000, polling: 2000 }); } catch (_) {}
  const d = await page.evaluate(() => ({
    pages: window.__capturedPages || [],
    liName: (window.state.canonicalLI && window.state.canonicalLI.name) || '',
    liSource: (window.state.canonicalLI && window.state.canonicalLI.source) || '',
    pcSpecies: window.state._playerSpecies || '(unset→Human)', liSpecies: window.state._liSpecies || '(unset)',
    liSpeciesSource: window.state._liSpeciesSource || '', seedDirLen: (typeof window._buildSeedContextDirective === 'function') ? window._buildSeedContextDirective().length : -1
  }));
  const prose = (d.pages || []).map(strip).filter(p => p && p.length > 40).join('\n\n———\n\n');
  const checks = {
    li_is_julian: /\bjulian\b/i.test(d.liName) && d.liSource === 'seed',
    li_species_ff: /first favored/i.test(d.liSpecies),
    pc_species_ff: /first favored/i.test(d.pcSpecies),
    no_a_friend: !/\ba friend\b/i.test(prose),
    no_soren: !/\bsoren\b/i.test(prose),
    seed_block_present: d.seedDirLen > 0
  };
  return { cfg: cfg.label, ...d, prose, checks, served: served.slice(0, 6) };
}

const runs = [];
for (const cfg of CONFIGS) {
  const r = await runOpening(cfg);
  runs.push(r);
  const pass = Object.entries(r.checks).map(([k, v]) => (v ? '✓' : '✗') + k).join(' ');
  log(`[${r.cfg}] LI="${r.liName}"(${r.liSource}) · PC=${r.pcSpecies} · LI=${r.liSpecies}(${r.liSpeciesSource}) · seed=${r.seedDirLen}c\n         ${pass}`);
}

let out = '';
for (const r of runs) {
  out += '\n════════════════════ ' + r.cfg + ' (grounding ON, plumbing fixes) ════════════════════\n' +
    `LI=${r.liName}(${r.liSource}) · PC species=${r.pcSpecies} · LI species=${r.liSpecies}(${r.liSpeciesSource}) · seed-block=${r.seedDirLen}c\n` +
    'CHECKS: ' + Object.entries(r.checks).map(([k, v]) => (v ? '✓ ' : '✗ ') + k).join('  ') + '\n\n' +
    (r.prose || '(no prose)') + '\n';
}
fs.writeFileSync(`${OUT}/seed_verify.txt`, out);
fs.writeFileSync(`${OUT}/seed_verify.json`, JSON.stringify(runs, null, 2));
log('\nsaved → ' + OUT + '/seed_verify.txt');
await browser.close();
process.exit(0);
