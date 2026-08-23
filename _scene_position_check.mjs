// SCENE POSITION — free verification. Content, polarity, and inertness.
//
// The block must (a) name the right spent beats for each scene, (b) never fire on scene 1,
// (c) stay silent for a story whose spine declares no step ranges — otherwise it would
// start constraining stories it was never written for.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._buildScenePositionBlock && window.STARTER_STORIES, { timeout: 90000 });

const r = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {}; s.picks.world = 'Fantasy';
  s._starterId = def ? def.id : 'starter_first_sacrifice';
  s.is_starter_story = true;
  const at = tc => { s.turnCount = tc; return window._buildScenePositionBlock(s); };
  const out = { scene: {} };
  // _currentSceneNumber returns turnCount + 2 on this path, so turnCount -1/0/1 => scenes 1/2/3.
  out.scene[1] = at(-1); out.scene[2] = at(0); out.scene[3] = at(1);
  s._starterId = null; s.is_starter_story = false;            // no authored spine
  out.noSpine = window._buildScenePositionBlock(s);
  return out;
});
await browser.close();

let bad = 0;
const show = (label, txt) => {
  console.log(`\n── ${label} ──`);
  console.log(txt ? txt.replace(/^/gm, '  ') : '  (empty)');
};
show('scene 1 — must be EMPTY (nothing spent yet)', r.scene[1]);
if (r.scene[1]) { bad++; console.log('  FAIL — fired on scene 1'); }

show('scene 2 — spent 1-4, job 5-6', r.scene[2]);
if (!/wish spoken aloud/.test(r.scene[2] || '') || !/twist manifesting/.test(r.scene[2] || '')) {
  bad++; console.log('  FAIL — wrong spent/job set');
}
if (/twist manifesting[\s\S]*?✓/.test((r.scene[2] || '').split('THIS SCENE')[0] || '')) {
  bad++; console.log('  FAIL — a job beat is listed as spent');
}

show('scene 3 — spent 1-6, job 7', r.scene[3]);
if (!/price taken or identified/.test(r.scene[3] || '') || !/witness landing the irony/.test(r.scene[3] || '')) {
  bad++; console.log('  FAIL — wrong spent/job set');
}

show('no authored spine — must be EMPTY (inert for other stories)', r.noSpine);
if (r.noSpine) { bad++; console.log('  FAIL — fired without an authored step range'); }

console.log(bad ? `\n${bad} FAILURE(S)\n` : '\nOK — correct beats, silent on scene 1, inert without a spine.\n');
process.exit(bad ? 1 : 0);
