// MM concealment re-test: does the reverse-OTS conceal the male LI's face when shot_style=ots_char
// is set alongside li_visibility=shadowed? Renders TWO variants to isolate the cause. ~2 renders.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const BLOCK_TEXT = ['**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/gemini-proxy**', '**/api/proxy**', '**/api/orchestrator**'];
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/phase1';

const VARIANTS = [
  { file: 'mm_otschar.png', shot: 'ots_char' },   // reverse-OTS should fire → face concealed
  { file: 'mm_otspc.png',   shot: 'ots_pc' }       // occlusion variant → PC head occludes his face
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK_TEXT) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  page.on('console', m => { const t = m.text(); if (/REVERSE OVER|OCCLUSION VARIANT|STAGED:MM|status":"SUCCESS/i.test(t)) console.error('  >', t.slice(0, 110)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildStagedHeroPrompt === 'function', { timeout: 40000 });

  for (const v of VARIANTS) {
    console.log('\n  ── ' + v.file + ' (shot_style=' + v.shot + ') ──');
    const res = await page.evaluate(async (v) => {
      const s = window.state;
      s.gender = 'Female'; s.loveInterest = 'Male'; s.currentPrimaryLiId = 'li1';
      s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode'; s.picks = { world: 'Modern' };
      window._stagedFunnelBypass = true; window._gnSpeciesAnchorPaths = null; s._stagedRegionContract = null;
      const vs = { background: 'a rain-streaked city rooftop at night, neon glow', camera: 'close_li', pc_visibility: 'back_only', li_position: 'standing_close', li_expression: 'guarded', li_visibility: 'shadowed', pc_wardrobe: 'charcoal coat', li_wardrobe: 'dark tailored suit', lighting: 'streetlamp', social_staging_mode: 'romance_eligible', _phaseShotStyle: v.shot, _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 0 };
      const prompt = window._buildStagedHeroPrompt(vs, 0, {}) || '';
      const hasReverseOTS = /REVERSE OVER-THE-SHOULDER/i.test(prompt);
      const hasOcclusion = /OTS_PC OCCLUSION VARIANT/i.test(prompt);
      const mmDoNotRender = /protagonist's full face/i.test(prompt);
      let img = null; try { img = await window.generateImageWithFallback({ prompt, preAssembled: true, context: 'visualize', intent: 'scene', tier: 'Clean', costTier: 'hero', shape: 'square' }); } catch (e) {}
      return { hasReverseOTS, hasOcclusion, mmDoNotRender, img };
    }, v);
    console.log('   reverseOTS-directive=' + res.hasReverseOTS + ' | occlusion-directive=' + res.hasOcclusion + ' | MM-face-guard=' + res.mmDoNotRender);
    if (res.img) { const buf = String(res.img).startsWith('data:') ? Buffer.from(String(res.img).split(',')[1], 'base64') : Buffer.from(await (await fetch(res.img)).arrayBuffer()); fs.writeFileSync(path.join(OUTDIR, v.file), buf); console.log('   SAVED ' + v.file + ' (' + buf.length + ' bytes)'); }
    else console.log('   NO IMAGE');
  }
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
