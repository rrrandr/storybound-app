// _destiny_live_trace.mjs — the ONE long-run PROOF (Roman): a live multi-scene generated story showing
//   Scene N: milestone M's event was NOT delivered (verifier MISSED)
//   _tickAPlot: M fired anyway (triggered on schedule) + wrote consequence C to the ledger
//   Scene N+k: the author's system prompt is CONDITIONED on C (the undelivered beat asserted forward)
// Observes (does not alter) each scene's author prompt via page.route passthrough. Milestone density is
// compressed (window._msTransitionDensityTest) so a beat fires every scene within a short run.
import fs from 'fs';
import { chromium } from 'playwright-core';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/momentum_out';
const N = Number(process.env.N || 6);
const CONT_TIMEOUT = Number(process.env.CONT_TIMEOUT || 420000);
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();

let curScene = 0;
const authorPrompts = [];   // { scene, systemPrompt }  (the fullSys the author saw)
const firedThisRun = [];    // console [A-PLOT] Milestone triggered lines, tagged by scene
page.on('console', m => {
  const t = m.text();
  const fired = t.match(/\[A-PLOT\] Milestone triggered at scene (\d+):\s*(\w+)\s*—\s*(.+)$/);
  if (fired) firedThisRun.push({ scene: curScene, atScene: Number(fired[1]), kind: fired[2], event: fired[3].trim() });
});
// OBSERVE author prompts (passthrough — no behavior change). Extract the consequence-ledger / R->A blocks
// (where an undelivered milestone's consequence gets asserted forward). Keep excerpts small.
function extractLedgerBlocks(sys) {
  const out = [];
  for (const re of [/CONSEQUENCE LEDGER[\s\S]{0,700}/gi, /R.?.?A RECIPROCITY[\s\S]{0,900}/gi, /ACTIVE RELATIONAL CONSEQUENCES[\s\S]{0,700}/gi, /PENDING A-PLOT MILESTONE[\s\S]{0,300}/gi]) {
    const m = sys.match(re); if (m) out.push(...m.map(x => x.slice(0, 900)));
  }
  return out;
}
for (const url of ['**/api/proxy', '**/api/chatgpt-proxy']) {
  await page.route(url, async route => {
    try { const b = JSON.parse(route.request().postData() || '{}'); const sys = (b.messages && b.messages[0] && b.messages[0].content) || '';
      if ((b.role === 'NARRATIVE_AUTHOR' || b.role === 'PRIMARY_AUTHOR') && sys.length > 4000) authorPrompts.push({ scene: curScene, role: b.role, ledgerBlocks: extractLedgerBlocks(sys) });
    } catch (_) {}
    return route.continue();
  });
}

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window._launchStarterStory === 'function', { timeout: 30000 });
await page.evaluate(() => {
  const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  window.__capturedPages = [];
  try { const SP = window.StoryPagination; if (SP && !SP.__w) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); return r(h, n); }; SP.__w = true; } } catch (_) {}
});
log('[bootstrap]…');
await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await window._launchStarterStory(def); });
await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 12000 && !window.state._isAdvancingScene, { timeout: 90000, polling: 2000 }).catch(() => {});
// compress milestone schedule so a beat fires every scene; report the plan
const plan = await page.evaluate(() => {
  window._msTransitionDensityTest = true;
  const a = window.state.aPlot;
  return { hasAplot: !!a, milestones: (a && a.milestones ? a.milestones.map(m => ({ atScene: m.atScene, kind: m.kind, event: (m.event || '').slice(0, 70), triggered: m.triggered })) : null) };
});
log('[aPlot milestones after bootstrap]: ' + JSON.stringify(plan.milestones, null, 1));
// Control only the TIMING (not the outcome): inject one plausible betrayal beat at scene 1 so a real
// milestone fires early — then the REAL author/verifier/downstream decide everything. If the real author
// misses it (likely), _tickAPlot still fires it and the consequence should condition scenes 2..N.
await page.evaluate(() => {
  const a = window.state.aPlot;
  if (a && Array.isArray(a.milestones)) a.milestones.unshift({
    atScene: 1, kind: 'crisis',
    event: 'the Love Interest publicly sides with the Warden against the PC',
    emotional_conductivity: "the PC's trust in the Love Interest is broken — she now sees him as complicit in the Warden's design",
    triggered: false
  });
});
log('[injected] a betrayal milestone at scene 1 (real author will attempt/miss it)');

const scenes = [];
for (let i = 1; i <= N; i++) {
  curScene = i;
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0, ledger: (window.state._relationalConsequenceLedger || []).length }));
  await page.evaluate(() => {
    const s = window.state; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true;
    s._isAdvancingScene = false; s._advanceStartedAt = 0; window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true;
    s.fate = s.fate || {}; if (!s.fate.pendingPetition) s.fate.pendingPetition = { _bypass: true };  // petition gate (turn1)
    const setV = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    setV('actionInput', 'stay close to them and press for the truth'); setV('dialogueInput', 'Tell me what really happened.');
    const b = document.getElementById('submitBtn'); if (b) b.click();
  });
  let ok = false;
  try { await page.waitForFunction(({ p, t }) => (window.__capturedPages || []).length > p || (window.state.turnCount || 0) > t, { p: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 }); ok = true; } catch (e) {}
  const after = await page.evaluate((p) => {
    const pages = window.__capturedPages || []; const html = pages[pages.length - 1] || '';
    const prose = String(html).replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    return { turn: window.state.turnCount, prose, ledger: (window.state._relationalConsequenceLedger || []).map(x => ({ consequence: (x.consequence || x.sourceMilestoneEvent || '').slice(0, 120), status: x.status, introducedAt: x.introducedAt })) };
  }, before.pages);
  const firedHere = firedThisRun.filter(f => f.scene === i);
  // verify delivery of each fired milestone's event against this scene's prose
  for (const f of firedHere) { try { f.verdict = (await page.evaluate(async ({ prose, ev }) => (await window._verifyDelivery(prose, ev)).delivery, { prose: after.prose, ev: f.event })); } catch (_) { f.verdict = 'ERR'; } }
  scenes.push({ i, ok, turn: after.turn, proseLen: after.prose.length, fired: firedHere, ledgerAfter: after.ledger });
  log(`  scene ${i}: ${ok ? 'rendered' : 'FAILED'} turn=${after.turn} proseLen=${after.prose.length} fired=${firedHere.map(f => f.kind + '[' + f.verdict + ']').join(',') || 'none'} ledger=${after.ledger.length}`);
}

// ── assemble the trace: an undelivered fired milestone whose CONSEQUENCE later conditions the author ──
const missedFired = scenes.flatMap(s => s.fired.filter(f => f.verdict === 'MISSED' || f.verdict === 'PARTIAL').map(f => ({ ...f, sceneRun: s.i })));
const traces = [];
for (const mf of missedFired) {
  // the consequence this milestone injected = the ledger entry that appeared AT its scene (delta vs prior scene)
  const sc = scenes.find(s => s.i === mf.sceneRun);
  const prior = scenes.find(s => s.i === mf.sceneRun - 1);
  const priorSet = new Set((prior ? prior.ledgerAfter : []).map(l => l.consequence));
  const injected = (sc ? sc.ledgerAfter : []).filter(l => !priorSet.has(l.consequence));
  for (const inj of injected) {
    const key = inj.consequence.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 5); // distinctive words of the consequence
    const laterPrompts = authorPrompts.filter(ap => ap.scene > mf.sceneRun && ap.ledgerBlocks.length);
    const hit = laterPrompts.find(ap => ap.ledgerBlocks.some(bl => { const b = bl.toLowerCase(); return key.filter(w => b.includes(w)).length >= 2; }));
    if (hit) { const bl = hit.ledgerBlocks.find(bl => { const b = bl.toLowerCase(); return key.filter(w => b.includes(w)).length >= 2; }); traces.push({ milestone: mf.event, kind: mf.kind, verdict: mf.verdict, sceneMissed: mf.sceneRun, consequenceInjected: inj.consequence, laterSceneConditioned: hit.scene, promptExcerpt: bl.slice(0, 400) }); }
  }
}

fs.writeFileSync(`${OUT}/destiny_trace.json`, JSON.stringify({ plan: plan.milestones, scenes, authorPrompts, traces }, null, 2));
log('\n=== DESTINY LIVE TRACE ===');
log(`milestones fired total: ${firedThisRun.length}; fired-but-MISSED: ${missedFired.length}; later-scene author-prompts observed: ${authorPrompts.length}`);
if (traces.length) {
  log('\n*** TRACE CAPTURED ***');
  traces.forEach(t => {
    log(`  MISSED @ scene ${t.sceneMissed}: milestone (${t.kind}) "${t.milestone}" fired but delivery=${t.verdict}`);
    log(`  INJECTED consequence: "${t.consequenceInjected}"`);
    log(`  -> CONDITIONED scene ${t.laterSceneConditioned} author prompt:`);
    log(`     "${t.promptExcerpt.replace(/\s+/g, ' ')}"`);
  });
} else {
  log('\nNo full trace auto-matched. Inspect destiny_trace.json — check: any fired-but-MISSED milestone + whether a later author prompt carries the consequence-ledger block (the grep may be too strict).');
}
await browser.close();
