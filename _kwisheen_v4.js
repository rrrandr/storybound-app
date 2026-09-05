// Kwisheen render WITH the species anchors attached (as production does via _renderStagedPhaseImage),
// so the Octofolk reference + the updated canon (scaled/adorned/tentacle-hair) + underwater physics all apply.
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const BLOCK_TEXT = ['**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/gemini-proxy**', '**/api/proxy**', '**/api/orchestrator**'];
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/phase1';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK_TEXT) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  page.on('console', m => { const t = m.text(); if (/SCENE-CASE|status":"SUCCESS|SPECIES-STYLE|REF/i.test(t)) console.error('  >', t.slice(0, 110)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildStagedHeroPrompt === 'function' && typeof window._buildStagedRegionContract === 'function', { timeout: 40000 });
  const res = await page.evaluate(async () => {
    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male'; s.currentPrimaryLiId = 'li1';
    s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode'; s.picks = { world: 'Fantasy' };
    s._playerSpecies = 'human'; s._liSpecies = 'kwisheen'; s.worldInstanceId = 'saga-kw3';
    window._stagedFunnelBypass = true;
    const contract = window._buildStagedRegionContract({ visualState: { background: 'submerged in a bioluminescent tidal grotto, Gloamwater Bay, glowing coral and kelp — a fully tentacled Kwisheen in gem-and-shell adornment' }, phases: [] });
    s._stagedRegionContract = contract;
    // Attach the species anchors (Octofolk ref first) exactly as the render path would.
    if (contract && contract.anchorImages && contract.anchorImages.length) {
      window._gnSpeciesAnchorPaths = contract.anchorImages.map(p => ({ path: p, species: 'kwisheen', label: 'kwisheen anchor' }));
    }
    const attachedAnchors = (window._gnSpeciesAnchorPaths || []).map(x => (x && x.path || x).split('/').pop());
    const vs = { background: 'submerged deep in a bioluminescent tidal grotto, Gloamwater Bay, glowing coral, kelp, shafts of light', camera: 'wide_establishing', pc_visibility: 'back_only', li_position: 'standing_apart', li_expression: 'curious', li_visibility: 'revealed', pc_wardrobe: 'flowing sea-silk dress', li_wardrobe: 'gem-and-shell loincloth, scaled armor, beaded necklaces and gem pendants', lighting: 'low_cool', social_staging_mode: 'stranger_awkward', _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 0 };
    const prompt = window._buildStagedHeroPrompt(vs, 0, {}) || '';
    const hasUnderwater = /UNDERWATER PHYSICS/.test(prompt);
    let img = null; try { img = await window.generateImageWithFallback({ prompt, preAssembled: true, context: 'visualize', intent: 'scene', tier: 'Clean', costTier: 'hero', shape: 'square' }); } catch (e) {}
    return { img, attachedAnchors, hasUnderwater };
  });
  console.log('  attached anchors: ' + JSON.stringify(res.attachedAnchors));
  console.log('  underwater block in prompt: ' + res.hasUnderwater);
  if (res.img) { const buf = String(res.img).startsWith('data:') ? Buffer.from(String(res.img).split(',')[1], 'base64') : Buffer.from(await (await fetch(res.img)).arrayBuffer()); fs.writeFileSync(path.join(OUTDIR, 'kwisheen_v4.png'), buf); console.log('  SAVED kwisheen_v3.png (' + buf.length + ' bytes)'); }
  else console.log('  NO IMAGE');
  await browser.close();
})().catch(e => { console.error('ERROR:', e); process.exit(2); });
