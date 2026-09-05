// _debug_bloat.mjs — measure the entropy win (Roman 2026-07-30). Bootstrap + 1 scene of First Sacrifice
// with the speculative guard ON (cheap). Confirms: emergent stack dropped (mode=directed, PRE-COLLAPSE
// block absent), profanity block shrank, and captures the total prompt size + [DIRECTIVE-SIZES] ledger.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/debug_bloat';
fs.mkdirSync(OUT, { recursive: true });
const BASELINE_TOKENS = 82889;  // measured before the cuts (ignition_probe capture)
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
const authorPrompts = [];
page.on('request', req => { try { if (!/\/api\/(proxy|chatgpt-proxy)/.test(req.url())) return; const b = req.postData(); if (!b) return; const j = JSON.parse(b); const sys = (j.messages && j.messages[0] && j.messages[0].content) || ''; if (sys.length > 50000) authorPrompts.push({ len: sys.length, sys }); } catch (_) {} });
const dszLines = [];
page.on('console', m => { const t = m.text(); if (/\[DIRECTIVE-SIZES\]|\[EmergentLI\]|\[CANONICAL-CHARACTERS\]|\[CANONICAL-LI\]|WORLD PROFANITY|preCollapse/.test(t)) { if (/DIRECTIVE-SIZES/.test(t)) dszLines.push(t); log('  · ' + t.slice(0, 200)); } });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  window.STORYBOUND_DEBUG = true; window.__forceHeavyBuild = true; window.__disableSpeculativePreload = true; window._forceDeckMandate = false;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; }
});
log('[boot] First Sacrifice (speculative OFF, debug ON) …');
try { await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('boot to')), 360000))]); }); } catch (e) { log('[boot] ' + e.message); }
try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 10000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 90000, polling: 2000 }); } catch (_) {}

// drive one continuation to assemble the literary scene-2 author prompt (where the emergent/profanity blocks live)
async function settle() { try { await page.waitForFunction(() => !window.state._isAdvancingScene && !window.state.isPreloadingNextScene && (Date.now() - (window.__lastPageAt || 0)) > 6000, {}, { timeout: 200000, polling: 2000 }); } catch (_) {} }
await settle();
await page.evaluate(() => { const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true; s._petitionEmergenceFired = true; s._temptEmergenceFired = true; const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }; set('actionInput', 'press him on why the binding chose the two of you'); set('dialogueInput', 'What did you give up for this?'); });
const before = await page.evaluate(() => ({ p: (window.__capturedPages || []).length, t: window.state.turnCount || 0 }));
try {
  await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
  await page.waitForFunction(() => window.state._isAdvancingScene === true, {}, { timeout: 45000, polling: 1000 }).catch(() => {});
  await page.waitForFunction(({ p, t }) => { const a = window.state._isAdvancingScene === true; const pp = (window.__capturedPages || []).length; const tt = window.state.turnCount || 0; return !a && (pp > p || tt > t) && (Date.now() - (window.__lastPageAt || 0)) > 8000; }, { p: before.p, t: before.t }, { timeout: 420000, polling: 2500 });
} catch (e) { log('[scene2] ' + e.message); }

const st = await page.evaluate(() => ({ mode: window.state.loveInterestMode, liMode: window.state.liMode, ws: window.state.worldSubtype || (window.state.picks && window.state.picks.worldSubtype), canonLI: window.state.canonicalLI, liSpecies: window.state._liSpecies || null }));
const big = authorPrompts.sort((a, b) => b.len - a.len)[0];
const sys = (big && big.sys) || '';
const toks = Math.round(sys.length / 4);
// profanity block size: from "WORLD PROFANITY BAND" to the next ═══ header
const profM = sys.match(/WORLD PROFANITY BAND[\s\S]{0,6000}?(?=═══|\n\n[A-Z]{3,})/);
const profTok = profM ? Math.round(profM[0].length / 4) : 0;
const emergentPresent = /PRE-COLLAPSE LI ARCHETYPE FLAVOR|Each candidate expresses her assigned archetype/.test(sys);
const speciesCols = (sys.match(/First-Favored:|Kwisheen:/g) || []).length;

log('\n╔══════════════════════════════════════════════════════════════╗');
log('║  BLOAT / ENTROPY MEASUREMENT                                  ║');
log('╚══════════════════════════════════════════════════════════════╝');
log('worldSubtype=' + st.ws + '  loveInterestMode=' + st.mode + '/' + st.liMode + '  (expect directed — emergent gated)  · LI species=' + st.liSpecies);
log('canonical LI: ' + JSON.stringify(st.canonLI && { name: st.canonLI.name, mask: st.canonLI.mask, committed: st.canonLI.committed }));
log('');
log('TOTAL PROMPT:   ' + toks.toLocaleString() + ' tokens   (baseline was ' + BASELINE_TOKENS.toLocaleString() + ' → Δ ' + (toks - BASELINE_TOKENS).toLocaleString() + ', ' + Math.round(100 * (BASELINE_TOKENS - toks) / BASELINE_TOKENS) + '% smaller)');
log('EMERGENT STACK: ' + (emergentPresent ? '✗ STILL PRESENT (PRE-COLLAPSE block found)' : '✓ GONE (no pre-collapse archetype block)'));
log('PROFANITY BLOCK: ~' + profTok + ' tokens' + (profM ? '' : ' (block not found — may be absent)') + '   · species columns shipped: ' + speciesCols + ' (expect 0 for a human-only scene)');
if (dszLines.length) { log('\n[DIRECTIVE-SIZES] captured:'); dszLines.slice(0, 2).forEach(l => log('  ' + l.slice(0, 260))); }
if (big) fs.writeFileSync(`${OUT}/author_prompt.txt`, sys);
log('\nVERDICT: ' + ((!emergentPresent && st.mode !== 'emergent' && toks < BASELINE_TOKENS) ? '✓ entropy reduced — emergent gated, profanity trimmed, prompt smaller.' : '⚠ check the rows above.'));
await browser.close();
process.exit(0);
