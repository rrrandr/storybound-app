// THE ROUTING INVARIANT — deterministic, free, no model calls.
//
//   For any scene where the SPINE declares a wish resolution, the Author payload must
//   contain WISH AUTHORING CORE + WISH ADJUDICATION, regardless of the wording of
//   currentCrisis, aPlot, title, synopsis, or generated prose.
//
// The title is deliberately set to "The Rite at Veilwood" — no wish-word anywhere in it.
// Under the old behaviour the gate text was " The First Sacrifice " (23 chars) at Scene 1
// and TWO SPACES at every continuation, so this test fails on the pre-fix build: that is
// the point of it. Nothing here calls a model.
//
// usage: node _gate_invariant.mjs
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._canonGateText
  && window._buildFatelandsWishCoreDirective && window._buildFatelandsWishAdjudicationDirective, { timeout: 90000 });

const CASES = [
  {
    name: 'spine declares the twist; title/crisis/aPlot say NOTHING',
    setup: {
      immutableTitle: 'The Rite at Veilwood', currentCrisis: '', aPlot: { goal: '', antagonistOrAntiForce: '' },
      sceneNumber: 2,
    },
    expect: { core: true, adjudication: true },
  },
  {
    name: 'scene 1 — spine goal is the source, not the title',
    setup: {
      immutableTitle: 'The Rite at Veilwood', currentCrisis: '', aPlot: { goal: '', antagonistOrAntiForce: '' },
      sceneNumber: 1,
    },
    expect: { core: true, adjudication: null },   // adjudication only where the spine resolves one
  },
  {
    name: 'NEGATIVE — no spine, no crisis, no wish words anywhere',
    setup: { immutableTitle: 'The Rite at Veilwood', currentCrisis: '', aPlot: { goal: '', antagonistOrAntiForce: '' },
             sceneNumber: null, killSpine: true },
    expect: { core: false, adjudication: false },
  },
];

let failed = 0;
for (const c of CASES) {
  const r = await page.evaluate(({ setup }) => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy';
    s.picks.synopsis = '';
    s._starterId = def ? def.id : 'starter_first_sacrifice';
    s.is_starter_story = true;
    Object.assign(s, {
      immutableTitle: setup.immutableTitle,
      currentCrisis: setup.currentCrisis,
      aPlot: setup.aPlot,
      turnCount: setup.sceneNumber ? setup.sceneNumber - 1 : 0,
    });
    if (setup.killSpine) { s._starterId = null; s.is_starter_story = false; s._spineEventVerbatim = ''; s._sceneAssignment = null; }
    const gateText = window._canonGateText(s);
    // The gate text is what each site appends; probe the builders with it directly.
    const core = window._buildFatelandsWishCoreDirective(gateText, false);
    const adj = window._buildFatelandsWishAdjudicationDirective(gateText, false);
    return { gateChars: gateText.length, gateSample: gateText.slice(0, 110),
             core: !!(core && core.length), adjudication: !!(adj && adj.length) };
  }, c);

  const checks = [];
  if (c.expect.core !== null) checks.push(['CORE', r.core === c.expect.core]);
  if (c.expect.adjudication !== null) checks.push(['ADJUDICATION', r.adjudication === c.expect.adjudication]);
  const ok = checks.every(([, v]) => v);
  if (!ok) failed++;
  console.log(`\n  ${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  console.log(`        gate text: ${r.gateChars} chars  "${r.gateSample}"`);
  console.log(`        CORE=${r.core}  ADJUDICATION=${r.adjudication}`
    + `   expected CORE=${c.expect.core}${c.expect.adjudication !== null ? ` ADJ=${c.expect.adjudication}` : ''}`);
}
await browser.close();
console.log(failed
  ? `\n${failed} INVARIANT FAILURE(S) — the spine does not control activation.\n`
  : '\nINVARIANT HOLDS — spine declares, canon activates, independent of prose wording.\n');
process.exit(failed ? 1 : 0);
