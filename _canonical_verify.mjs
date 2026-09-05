// _canonical_verify.mjs — verify the canonical LI identity flows end-to-end EXACTLY ONCE (Roman 2026-07-30).
// One First-Sacrifice bootstrap (Scene 1 only). Confirms: commit fires BEFORE the bible, the bible + author
// prompt use the committed name (not the 'the love interest' placeholder), the accessor returns it, and NO
// [CANONICAL-LI:FALLBACK] fires after commit. STORYBOUND_DEBUG on so fallbacks are loud.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/canonical_verify';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
const authorPrompts = [];
page.on('request', req => { try { if (!/\/api\/(proxy|chatgpt-proxy)/.test(req.url())) return; const b = req.postData(); if (!b) return; const j = JSON.parse(b); const sys = (j.messages && j.messages[0] && j.messages[0].content) || ''; if (sys.length > 50000) authorPrompts.push({ len: sys.length, sys }); } catch (_) {} });
const canonLines = [];
page.on('console', m => { const t = m.text(); if (/\[CANONICAL-LI|\[CANONICAL-CHARACTERS|LI-DESIRE-INTRO|LI-ENCOUNTER|LIT:SPINE/.test(t)) { canonLines.push(t); log('  · ' + t.slice(0, 170)); } });
page.on('pageerror', e => log('  PAGEERR ' + (e && e.message)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  window.STORYBOUND_DEBUG = true;  // make [CANONICAL-LI:FALLBACK] loud
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; }
});
log('[boot] First Sacrifice (STORYBOUND_DEBUG on) …');
try { await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('boot to')), 360000))]); }); } catch (e) { log('[boot] ' + e.message); }
try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 10000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 90000, polling: 2000 }); } catch (_) {}

// read the lineage endpoints
const state = await page.evaluate(() => {
  const s = window.state;
  const canon = s.canonicalLI || null;
  const accessorName = (typeof window.getCanonicalLoveInterest === 'function') ? window.getCanonicalLoveInterest(s).name : '(no accessor)';
  const bibleStr = s.liBodyBible ? JSON.stringify(s.liBodyBible) : '';
  return {
    canonicalLI: canon,
    accessorName,
    loveInterestName: s.loveInterestName,
    bibleHasPlaceholder: /the love interest/i.test(bibleStr),
    bibleHasCanonName: !!(canon && canon.name && new RegExp('\\b' + canon.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(bibleStr)),
    bibleKeys: s.liBodyBible ? Object.keys(s.liBodyBible).length : 0
  };
});

const bigPrompt = authorPrompts.sort((a, b) => b.len - a.len)[0];
const canonName = state.canonicalLI && state.canonicalLI.name;
const promptHasCanon = !!(bigPrompt && canonName && new RegExp('\\b' + canonName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(bigPrompt.sys));
const promptPlaceholderCount = bigPrompt ? (bigPrompt.sys.match(/the love interest/gi) || []).length : -1;
const fallbackFired = canonLines.some(l => /CANONICAL-LI:FALLBACK/.test(l));
const commitBeforeBible = (() => {
  const ci = canonLines.findIndex(l => /CANONICAL-CHARACTERS.*commit@pre-bible/.test(l));
  const bi = canonLines.findIndex(l => /LIT:SPINE.*awaiting/.test(l));
  return ci >= 0 && (bi < 0 || ci < bi);
})();

log('\n╔══════════════════════════════════════════════════════════════╗');
log('║  CANONICAL LI — END-TO-END LINEAGE VERIFICATION              ║');
log('╚══════════════════════════════════════════════════════════════╝');
log('canonicalLI            : ' + JSON.stringify(state.canonicalLI));
log('committed BEFORE bible? : ' + (commitBeforeBible ? '✓ (commit@pre-bible precedes LIT:SPINE await)' : '✗ — ORDERING STILL WRONG'));
log('LI Bible uses canon name: ' + (state.bibleHasCanonName ? '✓' : '✗') + '   · bible has placeholder "the love interest": ' + (state.bibleHasPlaceholder ? '✗ YES (bad)' : 'no ✓') + '   (bibleKeys=' + state.bibleKeys + ')');
log('author prompt uses canon: ' + (promptHasCanon ? '✓' : '✗') + '   · "the love interest" placeholder count in prompt: ' + promptPlaceholderCount);
log('accessor returns         : "' + state.accessorName + '"   (== canon "' + canonName + '": ' + (state.accessorName === canonName ? '✓' : '✗') + ')');
log('legacy loveInterestName  : "' + state.loveInterestName + '"  (mirrored: ' + (state.loveInterestName === canonName ? '✓' : '✗') + ')');
log('[CANONICAL-LI:FALLBACK]  : ' + (fallbackFired ? '✗ FIRED (fallback executed — investigate)' : 'never ✓'));
const pass = state.canonicalLI && state.canonicalLI.committed && commitBeforeBible && state.bibleHasCanonName && !state.bibleHasPlaceholder && promptHasCanon && state.accessorName === canonName && !fallbackFired;
log('\nVERDICT: ' + (pass ? '✓ ONE UNINTERRUPTED LINEAGE — commit→bible→prompt→accessor all use "' + canonName + '", no placeholder, no fallback. Safe to proceed to consumer migration.' : '⚠ lineage NOT clean — see the ✗ rows above.'));
fs.writeFileSync(`${OUT}/lineage.json`, JSON.stringify({ state, promptHasCanon, promptPlaceholderCount, fallbackFired, commitBeforeBible, pass }, null, 2));
if (bigPrompt) fs.writeFileSync(`${OUT}/author_prompt.txt`, bigPrompt.sys);
await browser.close();
process.exit(0);
