// TIER-1 VALIDATION — conspiracy → A-plot skeleton derivation (Roman 2026-07-23).
// The CHEAPEST meaningful test: generate ONE Fatelands A-plot (NO prose scenes) and dump the
// conspiracy skeleton that fed it beside the resulting aPlot JSON, so you can eyeball whether
// goal/antagonist/milestones actually DERIVE from the regional conspiracy stage.
//
//   node _conspiracy_aplot_probe.js                 # region-native → thornwild regional
//   REGION=vaelryn_reach node _conspiracy_aplot_probe.js
//   N=3 node _conspiracy_aplot_probe.js             # 3 A-plots, same config → variety check (Tier 2, plan-level)
//
// Requires localhost:3000. Output → /tmp/conspiracy_aplot_probe.json
// COST: N A-plot LLM calls (one generateAPlot each). No scene prose. Cheap.

const { chromium } = require('playwright-core');
const fs = require('fs');
const REGION = process.env.REGION || 'the_thornwild';
const N = parseInt(process.env.N, 10) || 1;
const OUT = process.env.OUT || '/tmp/conspiracy_aplot_probe.json';
const log = (...a) => console.error(...a);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  // Block image gen (500, not abort — abort wedges retry loops).
  for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**'])
    await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
  page.on('console', m => { const t = m.text(); if (/\[CONSPIRACY|CONSPIRACY-AUDIT|A-PLOT|APLOT/i.test(t)) log('  pg>', t.slice(0, 400)); });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100
    && typeof window._selectFatelandsMystery === 'function'
    && typeof window.initAPlot === 'function'
    && typeof window._buildConspiracyApBlock === 'function', { timeout: 40000 });

  const results = [];
  for (let i = 0; i < N; i++) {
    const rec = await page.evaluate(async (cfg) => {
      const s = window.state;
      // VARY per iteration so the semantic ties (LI-role←dynamic) can actually diverge — this
      // mirrors real stories (different dynamics/LIs), and is what the Tier-2 tuning is FOR.
      const DYN = ['enemies_to_lovers', 'forbidden_love', 'second_chance'];
      const LIN = ['Corvin', 'Aldric', 'Wren'];
      const dyn = DYN[cfg.i % DYN.length], li = LIN[cfg.i % LIN.length];
      // Minimal Fatelands config — enough for conspiracy selection + A-plot gen.
      s.picks = s.picks || {};
      s.picks.world = 'Fantasy'; s.world = 'Fantasy';
      s.picks.dynamic = dyn; s.dynamic = dyn;
      s.fantasyRegion = cfg.region;
      s.storyLength = 'fling'; s.tier = 'fling';
      s.loveInterestName = li; s.name = 'Sable'; s.pov = 'first_person';
      s.turnCount = 0; s.issueIndexInRun = 1;
      s.archetype = s.archetype || { primary: 'DARK_VICE' };
      // Fresh conspiracy each iteration so N>1 samples variety: force re-selection.
      s.storyId = 'probe_' + cfg.i + '_' + cfg.region;              // vary the deterministic pick + generator across iterations
      // Force A-PLOT SPINE mode so the probe tests the PREMISE-BINDING path (background stories
      // intentionally DON'T derive from the conspiracy — that's the mode working, not a failure).
      window.__conspiracyAplotForce = 'aplot';
      s._fatelandsSecretQuest = window._emptyFatelandsSecretQuest();
      window._selectFatelandsMystery();
      const skeleton = window._buildConspiracyApBlock();
      // Generate the A-plot ONLY (no scene prose).
      let genErr = null;
      try { await window.initAPlot({ tier: s.storyLength, force: true }); }
      catch (e) { genErr = (e && e.message) || String(e); }
      const ap = s.aPlot || {};
      const C = s._fatelandsSecretQuest || {};
      const reg = C.regional || {};
      const M = (window._FATELANDS_MYSTERIES || {})[reg.key] || {};
      const curStage = (M.stages || [])[reg.stageIndex] || {};
      return {
        region: cfg.region,
        selectedRegional: reg.key,
        currentStage: { q: curStage.q, a: curStage.a, inv: curStage.inv, rel: curStage.rel },
        skeletonFed: !!skeleton,
        skeleton: skeleton,
        genErr,
        aplot: {
          goal: ap.goal, namedClock: ap.namedClock,
          antagonistOrAntiForce: ap.antagonistOrAntiForce, antagonistShape: ap.antagonistShape,
          antagonistPersonalTie: ap.antagonistPersonalTie,
          stakesIfFail: ap.stakesIfFail, stakesIfWin: ap.stakesIfWin,
          milestones: (ap.milestones || []).map(m => ({ kind: m.kind, atScene: m.atScene, event: m.event })),
          cliffhangerHook: ap.cliffhangerHook
        }
      };
    }, { region: REGION, i });
    log(`\n[probe ${i + 1}/${N}] regional=${rec.selectedRegional} skeletonFed=${rec.skeletonFed} goal="${(rec.aplot.goal || '').slice(0, 90)}"`);
    results.push(rec);
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ region: REGION, n: N, results }, null, 2));
  log(`\nWROTE ${OUT}`);
})().catch(e => { console.error('PROBE-ERR', e.message); process.exit(1); });
