// Render the SAME First Favored LI (Kael) in TWO scenes to confirm color consistency + no forehead diamond.
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const BLOCK_TEXT = ['**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/gemini-proxy**', '**/api/proxy**', '**/api/orchestrator**'];
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/phase1';
const SCENES = [
  { file: 'ff_kael_A.png', camera: 'close_li', bg: 'a luminous Veilwood grove at golden hour, braided trees', light: 'golden_hour', wardrobe: 'gossamer robe' },
  { file: 'ff_kael_B.png', camera: 'medium_two_shot', bg: 'a moonlit Veilwood riverbank at night, glowing spiralgrass', light: 'low_cool', wardrobe: 'sheer gossamer tunic' }
];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK_TEXT) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  page.on('console', m => { const t = m.text(); if (/SCENE-CASE|status":"SUCCESS|FIRST FAVORED COLORS/i.test(t)) console.error('  >', t.slice(0, 110)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildStagedHeroPrompt === 'function' && typeof window._buildStagedRegionContract === 'function', { timeout: 40000 });

  let lockedColors = null;
  for (const sc of SCENES) {
    const res = await page.evaluate(async (sc) => {
      const s = window.state;
      s.gender = 'Female'; s.loveInterest = 'Male'; s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode';
      s.picks = { world: 'Fantasy', identity: { partnerName: 'Kael' } };
      s._playerSpecies = 'first_favored'; s._liSpecies = 'first_favored'; s.worldInstanceId = 'saga-1'; s.ffAppearance = s.ffAppearance || {};
      window._stagedFunnelBypass = true;
      s._stagedRegionContract = window._buildStagedRegionContract({ visualState: { background: sc.bg + ' — First Favored' }, phases: [] });
      const color = window._resolveFFAppearance('Kael');
      const vs = { background: sc.bg, camera: sc.camera, pc_visibility: 'back_only', li_position: 'standing_close', li_expression: 'tender', li_visibility: 'revealed', pc_wardrobe: 'traveling cloak', li_wardrobe: sc.wardrobe, lighting: sc.light, social_staging_mode: 'romance_eligible', _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 0 };
      const prompt = window._buildStagedHeroPrompt(vs, 0, {}) || '';
      let img = null; try { img = await window.generateImageWithFallback({ prompt, preAssembled: true, context: 'visualize', intent: 'scene', tier: 'Clean', costTier: 'hero', shape: 'square' }); } catch (e) {}
      return { color, img };
    }, sc);
    lockedColors = res.color;
    if (res.img) { const buf = String(res.img).startsWith('data:') ? Buffer.from(String(res.img).split(',')[1], 'base64') : Buffer.from(await (await fetch(res.img)).arrayBuffer()); fs.writeFileSync(path.join(OUTDIR, sc.file), buf); console.log('  SAVED ' + sc.file + ' (' + buf.length + ' bytes)'); }
    else console.log('  NO IMAGE ' + sc.file);
  }
  console.log('  Kael locked colors:', JSON.stringify(lockedColors));
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
