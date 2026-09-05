// _ignition_probe.mjs — PROMPT-AUTHORITY AUDIT for First Sacrifice (Roman 2026-07-30).
// Captures the ACTUAL assembled system prompt the author saw for a scene, then traces authority
// by character-position (salience) + conflicts. Answers: is the LI body bible populated (the
// kill-switch), does DESIRE-FIRST ship, and — of the competing authorities — what is the author
// most likely to obey? Probes PRODUCTION behavior (invariant runtime OFF).
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ignition_probe';
fs.mkdirSync(OUT, { recursive: true });
const CONT_TIMEOUT = 420000;
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
// ROBUST author-prompt capture: observe the actual author API requests + keep the large system prompts
// (the ~80k-token fullSys). Doesn't depend on _authorChatCapture reaching the literary path.
const authorPrompts = [];
page.on('request', req => {
  try {
    if (!/\/api\/(proxy|chatgpt-proxy)/.test(req.url())) return;
    const b = req.postData(); if (!b) return;
    const j = JSON.parse(b);
    const sys = (j.messages && j.messages[0] && j.messages[0].content) || '';
    const role = j.role || (j.preferredModel || '') || '';
    if (sys.length > 8000) authorPrompts.push({ len: sys.length, role: role, sys: sys, at: Date.now() });
  } catch (_) {}
});
page.on('console', m => { const t = m.text(); if (/\[STATE-CHANGE:EVENT\]|LI-DESIRE-INTRO|GRAVITY|DESIRE\]/.test(t)) log('  · ' + t.slice(0, 150)); });
page.on('pageerror', e => log('  PAGEERR ' + (e && e.message)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  const SP = window.StoryPagination;
  if (SP && typeof SP.addPage === 'function' && !SP.__wrapped) { const real = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return real(h, n); }; SP.__wrapped = true; }
  // returning-reader to reach scene 2 (audit: does NOT affect the desire DIRECTIVES) + heavy author + CAPTURE the author prompt
  window._forceDeckMandate = false; window.__forceHeavyBuild = true; window.__transitionRetryExperiment = true;   // → _authorChatCapture stores state._lastAuthorMessages
}, {});

log('[boot] launching First Sacrifice …');
try {
  await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('boot timeout')), 360000))]); });
} catch (e) { log('[boot] ' + (e && e.message)); }
try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 10000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 90000, polling: 2000 }); } catch (_) {}

// ── ELIGIBILITY snapshot (the kill-switch checks) ──
const elig = await page.evaluate(() => {
  const s = window.state;
  const liB = (typeof window._renderLIBodyBibleCompact === 'function') ? (window._renderLIBodyBibleCompact() || '') : '';
  const pcB = (typeof window._renderPCBodyBibleCompact === 'function') ? (window._renderPCBodyBibleCompact() || '') : '';
  const anB = (typeof window._renderAntagonistBodyBibleCompact === 'function') ? (window._renderAntagonistBodyBibleCompact() || '') : '';
  const nf = (typeof window.buildNoticeFilterDirective === 'function') ? (window.buildNoticeFilterDirective() || '') : '';
  return {
    loveInterestName: s.loveInterestName || null,
    liBodyBibleKeys: s.liBodyBible ? Object.keys(s.liBodyBible).length : 0,
    liCompactLen: liB.length, pcCompactLen: pcB.length, anCompactLen: anB.length,
    aPlotGoal: !!(s.aPlot && s.aPlot.goal), aPlotGoalText: (s.aPlot && s.aPlot.goal || '').slice(0, 100),
    romanceEngine: (s.pairDynamic && s.pairDynamic.romanceEngine) || (s.romanceEnginePlan && s.romanceEnginePlan.engine) || (s.aPlot && s.aPlot.romanceEngine) || null,
    dynamic: (s.picks && s.picks.dynamic) || null,
    noticeFilterLen: nf.length, noticeFilterHasDesireFirst: /DESIRE FIRST/.test(nf),
    ffCanonDesireYield: (typeof window._ffCanonDesireYield === 'function') ? !!window._ffCanonDesireYield('probe', s) : 'n/a',
    liDesireIntroScene: s._liDesireIntroScene, turnCount: s.turnCount
  };
});
log('[eligibility] ' + JSON.stringify(elig, null, 1));

// ── drive ONE continuation (scene 2) to assemble + capture the real author prompt ──
async function settle() { try { await page.waitForFunction(() => !window.state._isAdvancingScene && !window.state.isPreloadingNextScene && (Date.now() - (window.__lastPageAt || 0)) > 6000, {}, { timeout: 200000, polling: 2000 }); } catch (_) {} }
await settle();
await page.evaluate(() => { const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true; s._petitionEmergenceFired = true; s._temptEmergenceFired = true; });
await page.evaluate(() => { const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }; set('actionInput', 'press him on why the binding chose the two of you'); set('dialogueInput', 'What did you give up for this? Tell me the truth.'); });
const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
log('[scene2] submitting …');
try {
  await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
  await page.waitForFunction(() => window.state._isAdvancingScene === true, {}, { timeout: 45000, polling: 1000 }).catch(() => {});
  await page.waitForFunction(({ n, t }) => { const adv = window.state._isAdvancingScene === true; const p = (window.__capturedPages || []).length; const tc = window.state.turnCount || 0; return !adv && (p > n || tc > t) && (Date.now() - (window.__lastPageAt || 0)) > 8000; }, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 2500 });
} catch (e) { log('[scene2] ' + (e && e.message)); }

// ── pick the captured author prompts: the LARGEST is the full narrative-author fullSys ──
authorPrompts.sort((a, b) => b.len - a.len);
const liNameFull = elig.loveInterestName || '';
const cap = { sysLen: (authorPrompts[0] && authorPrompts[0].len) || 0, sys: (authorPrompts[0] && authorPrompts[0].sys) || '', liName: liNameFull };
log(`[captured] ${authorPrompts.length} author prompts >8k chars; largest=${cap.sysLen} chars (role=${(authorPrompts[0] && authorPrompts[0].role) || '?'})`);
fs.writeFileSync(`${OUT}/author_prompt.txt`, cap.sys);

// ── AUTHORITY TRACE (position = salience; near end = high recency) ──
const S = cap.sys; const N = S.length || 1;
const liName = (cap.liName || '').split(/\s+/)[0] || 'zzzz';
const findAll = (re) => { const out = []; let m; const r = new RegExp(re, 'gi'); while ((m = r.exec(S)) && out.length < 50) out.push(m.index); return out; };
const layer = (name, re, note) => { const pos = findAll(re); return { name, present: pos.length > 0, count: pos.length, firstPct: pos.length ? Math.round(100 * pos[0] / N) : null, lastPct: pos.length ? Math.round(100 * pos[pos.length - 1] / N) : null, note }; };

const layers = [
  layer('DESIRE-FIRST doctrine', 'DESIRE FIRST|NOTICE FILTER', 'the fix'),
  layer('Scene SPINE (state_change)', 'SCENE SPINE|THE STATE CHANGE|state_change', 'loud, self-declared supreme'),
  layer('Offstage-LI rule', 'OFFSTAGE', 'blocks embodiment?'),
  layer('Offstage RENDER-IN-HD', 'RENDER IN HD|REPUTATION|OFFSTAGE-BUT-KNOWN', 'offstage embodiment escape hatch'),
  layer('Collision/adversarial register', 'ADVERSARIAL|COLLISION|present-tense hostile', 'licenses clinical voice'),
  layer('Scene-1 description throttle', 'just enough|then MOVE|SCENE 1 SPECIAL', 'caps embodiment'),
  layer('FF canon / desire-yield', 'desire_yields|canon (?:is )?authoritative|CANON MODE', 'suppresses repairs'),
  layer('LI NAME (' + liName + ')', '\\b' + liName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'where + how often the LI is named')
];

let R = [];
const out = (...a) => { R.push(a.join(' ')); console.log(...a); };
out('\n╔════════════════════════════════════════════════════════════════════╗');
out('║  PROMPT-AUTHORITY TRACE — First Sacrifice, scene ' + (before.turn + 1) + ' (author input)          ║');
out('╚════════════════════════════════════════════════════════════════════╝');
out('KILL-SWITCH CHECKS:');
out('  LI body bible populated?  keys=' + elig.liBodyBibleKeys + '  compactLen=' + elig.liCompactLen + '  → ' + (elig.liCompactLen > 0 ? 'POPULATED ✓' : '✗ EMPTY — doctrine block would be omitted!'));
out('  aPlot.goal set?           ' + (elig.aPlotGoal ? '✓' : '✗') + '   engine=' + elig.romanceEngine + '  dynamic=' + elig.dynamic + '  ffDesireYield=' + elig.ffCanonDesireYield);
out('  buildNoticeFilterDirective() → len=' + elig.noticeFilterLen + '  hasDESIRE-FIRST=' + elig.noticeFilterHasDesireFirst);
out('  _liDesireIntroScene=' + elig.liDesireIntroScene + '  (null = relationship never ignited)');
out('');
out('AUTHORITY LAYERS in the ' + cap.sysLen + '-char prompt (pct = position; 100% = end/highest recency):');
out('  layer                             | present | count | first% | last%(recency) | note');
layers.forEach(l => out('  ' + l.name.padEnd(33) + ' |    ' + (l.present ? '✓' : '✗') + '    |  ' + String(l.count).padStart(3) + '  |  ' + String(l.firstPct == null ? '-' : l.firstPct).padStart(4) + '  |     ' + String(l.lastPct == null ? '-' : l.lastPct).padStart(4) + '       | ' + l.note));
out('');
// what is the author most likely to obey? highest-recency present authority wins attention
const present = layers.filter(l => l.present && l.name !== 'LI NAME (' + liName + ')');
present.sort((a, b) => b.lastPct - a.lastPct);
out('MOST-RECENT (highest-salience) authorities, in order the author encounters them LAST:');
present.slice(0, 5).forEach(l => out('  ' + String(l.lastPct).padStart(3) + '%  ' + l.name));
const df = layers.find(l => l.name === 'DESIRE-FIRST doctrine');
const sp = layers.find(l => l.name === 'Scene SPINE (state_change)');
out('');
out('VERDICT:');
if (elig.liCompactLen === 0) out('  ✗ ACTIVATION FAILURE — LI body bible EMPTY → DESIRE-FIRST doctrine block never shipped. Config/generation bug, not salience.');
else if (!df.present) out('  ✗ DESIRE-FIRST absent from the assembled prompt despite eligibility — trace why the block dropped.');
else out('  ✓ DESIRE-FIRST shipped (first@' + df.firstPct + '%). Spine last@' + (sp.present ? sp.lastPct : '-') + '% vs desire-first last@' + df.lastPct + '% → ' + (sp.present && sp.lastPct > df.lastPct ? 'SPINE out-saliences desire-first (later/more-recent). Collision confirmed.' : 'desire-first is at least as recent as the spine.'));
fs.writeFileSync(`${OUT}/AUTHORITY_TRACE.txt`, R.join('\n'));
log('\nwrote ' + OUT + '/AUTHORITY_TRACE.txt  +  author_prompt.txt');
await browser.close();
process.exit(0);
