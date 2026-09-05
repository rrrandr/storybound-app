// Phase-1 render SET — the 3 new-behavior visual checks (MM concealment, professional posing, Kwisheen).
// COSTS REAL RENDER $ (~3 image-gen calls). Text LLM proxies blocked; funnel bypass on. Saves PNGs.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const BLOCK_TEXT = ['**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/gemini-proxy**', '**/api/proxy**', '**/api/orchestrator**'];
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/phase1';

const SCENES = [
  { file: 'mm_conceal.png', kind: 'modern',
    state: { gender: 'Female', loveInterest: 'Male', currentPrimaryLiId: 'li1' },
    vs: { background: 'a rain-streaked city rooftop at night, neon glow', camera: 'close_li', pc_visibility: 'back_only', li_position: 'standing_close', li_expression: 'guarded', li_visibility: 'shadowed', pc_wardrobe: 'charcoal coat', li_wardrobe: 'dark tailored suit', lighting: 'streetlamp', social_staging_mode: 'romance_eligible' } },
  { file: 'coworkers_pro.png', kind: 'modern',
    state: { gender: 'Female', loveInterest: 'Male', currentPrimaryLiId: 'li1' },
    vs: { background: 'a glass-walled corporate office, mid-afternoon', camera: 'medium_two_shot', pc_visibility: 'back_only', li_position: 'desk', li_expression: 'cold_formal', li_visibility: 'revealed', pc_wardrobe: 'grey blazer', li_wardrobe: 'navy suit', lighting: 'bright_cool', social_staging_mode: 'professional', attractionPresence: 'none' } },
  { file: 'kwisheen.png', kind: 'kwisheen',
    state: { gender: 'Female', loveInterest: 'Male', currentPrimaryLiId: 'li1', _playerSpecies: 'kwisheen' },
    vs: { background: 'a bioluminescent tidal grotto, Gloamwater Bay', camera: 'close_li', pc_visibility: 'back_only', li_position: 'standing_close', li_expression: 'curious', li_visibility: 'revealed', pc_wardrobe: 'diving wrap', li_wardrobe: 'iridescent membrane', lighting: 'low_cool', social_staging_mode: 'romance_eligible' } }
];

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK_TEXT) await page.route(p, r => r.fulfill({ status: 500, body: '{"error":"text-blocked"}' }));
  page.on('console', m => { const t = m.text(); if (/SCENE-CASE|STAGED:MM|status":"SUCCESS|status":"FAIL|\[Gemini\] Error|\[BFL.*Error/i.test(t)) console.error('  >', t.slice(0, 120)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildStagedHeroPrompt === 'function' && typeof window.generateImageWithFallback === 'function', { timeout: 40000 });

  for (const sc of SCENES) {
    console.log('\n  ── rendering', sc.file, '──');
    const res = await page.evaluate(async (sc) => {
      const s = window.state;
      s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode'; s.picks = s.picks || {};
      Object.assign(s, sc.state);
      window._stagedFunnelBypass = true;
      window._gnSpeciesAnchorPaths = null; s._stagedRegionContract = null;
      s.picks.world = sc.kind === 'modern' ? 'Modern' : 'Fantasy';
      if (sc.kind === 'kwisheen') {
        let c = null; try { c = window._buildStagedRegionContract({ visualState: { background: sc.vs.background + ' — Kwisheen, tentacle-bodied altered beings' }, phases: [] }); } catch (e) {}
        if (c && c.textBlock) { s._stagedRegionContract = c; if (c.anchorImages && c.anchorImages.length) window._gnSpeciesAnchorPaths = c.anchorImages.map(p => ({ path: p, species: 'kwisheen', label: 'kw' })); }
      }
      const vs = Object.assign({ _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 0 }, sc.vs);
      const prompt = window._buildStagedHeroPrompt(vs, 0, {}) || '';
      const concealed = sc.vs.li_visibility === 'shadowed';
      const coercedMM = concealed && !/CLOSE SHOT on the love interest/i.test(prompt);
      let img = null, err = null;
      try { img = await window.generateImageWithFallback({ prompt, preAssembled: true, context: 'visualize', intent: 'scene', tier: 'Clean', costTier: 'hero', shape: 'square' }); } catch (e) { err = e && e.message; }
      return { promptLen: prompt.length, coercedMM, img: img || null, err };
    }, sc);
    console.log('   promptLen=' + res.promptLen + (sc.vs.li_visibility === 'shadowed' ? ' | MM close_li coerced=' + res.coercedMM : '') + (res.err ? ' | ERR=' + res.err : ''));
    if (res.img) {
      let buf = String(res.img).startsWith('data:') ? Buffer.from(String(res.img).split(',')[1], 'base64') : Buffer.from(await (await fetch(res.img)).arrayBuffer());
      fs.writeFileSync(path.join(OUTDIR, sc.file), buf);
      console.log('   SAVED', sc.file, '(' + buf.length + ' bytes)');
    } else { console.log('   NO IMAGE'); }
  }
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
