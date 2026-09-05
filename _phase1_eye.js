// Phase-1 FEASIBILITY render — ONE real image to confirm capture works before scaling.
// COSTS REAL RENDER $ (image endpoints are OPEN). Text LLM proxies are blocked (we supply the
// prompt; funnel bypass on → no 4o call), so only ~1 image-gen call fires (~$0.04-0.06).
// Builds a First Favored close-up with the DE-NEGATED ear contract, verifies the ear text is
// actually in the assembled prompt ($0) and only THEN renders. Saves the image for inspection.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// Block TEXT LLM proxies only — leave IMAGE endpoints (/api/image, /api/bfl-kontext, /api/visualize-flux) OPEN.
const BLOCK_TEXT = ['**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/gemini-proxy**', '**/api/proxy**', '**/api/orchestrator**'];
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/phase1';

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  let imgHits = 0;
  for (const p of BLOCK_TEXT) await page.route(p, r => r.fulfill({ status: 500, body: '{"error":"text-blocked"}' }));
  for (const p of ['**/api/image**', '**/api/bfl-kontext**', '**/api/visualize-flux**', '**/api/grok-image**']) await page.route(p, r => { imgHits++; r.continue(); });
  page.on('console', m => { const t = m.text(); if (/\[GEMINI:SCENE-CASE\]|\[STAGED:|provider|\[Gemini\] |\[BFL|SPECIAL_SPECIES/i.test(t)) console.error('  >', t.slice(0, 130)); });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildStagedHeroPrompt === 'function' && typeof window.generateImageWithFallback === 'function' && typeof window._buildStagedRegionContract === 'function', { timeout: 40000 });

  const res = await page.evaluate(async () => {
    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male'; s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode';
    s.picks = s.picks || {}; s.picks.world = 'Fantasy';
    s._playerSpecies = 'first_favored';
    window._stagedFunnelBypass = true; // full fixed prompt reaches the model

    // Build the region/species contract (the de-negated ear text lives here).
    const plan = { visualState: { background: 'a luminous Veilwood grove at dusk, First Favored figures among braided trees' }, phases: [] };
    let contract = null;
    try { contract = window._buildStagedRegionContract(plan); } catch (e) {}
    let usedReal = !!(contract && contract.textBlock && /first favored/i.test(contract.textBlock));
    if (!usedReal) {
      // Fallback: inject the current first_favored species contract text directly so the render
      // still tests the DE-NEGATED prompt even if the resolver didn't fire for our synthetic plan.
      contract = {
        regionLabel: 'Veilwood', speciesKeys: ['first_favored'], anchorImages: [],
        textBlock: '═══ SCENE WORLD CONTRACT ═══\nSPECIES: FIRST FAVORED (canonical anatomy — match anchor proportions exactly):\n- EYES: pupils are FOUR-POINTED CONCAVE DIAMONDS (smooth inward-curving sides), solid black, centered. Iris luminous gold.\n- EARS: HALF human size, rounded, human-shaped, flush to skull. Visible earlobes, smooth curved helix, softly rounded tips.\n- SKIN: smooth, luminous, with faint internal Weave-Script glow.\n- BUILD: high cheekbones, athletic perfectly-proportioned Olympic-athlete build, taller than human, ethereal.\nSPECIES ANTI-DEFAULTS (HARD): Pupils are four-pointed concave diamonds, solid black. Ears are small, rounded, human-shaped, close to the skull. Skin stays luminous with Weave-Script glow throughout.\n═══ END SCENE WORLD CONTRACT ═══'
      };
    }
    s._stagedRegionContract = contract;
    if (Array.isArray(contract.anchorImages) && contract.anchorImages.length) window._gnSpeciesAnchorPaths = contract.anchorImages.map(p => ({ path: p, species: 'first_favored', label: 'ff anchor' }));

    // Build the hero prompt: LI = First Favored, close on the face so ears are visible.
    const vs = { background: 'a luminous Veilwood grove at dusk', camera: 'close_li', pc_visibility: 'back_only', li_position: 'standing_close', li_expression: 'tender', li_visibility: 'revealed', pc_wardrobe: 'traveling cloak', li_wardrobe: 'gossamer drapery', lighting: 'golden_hour', social_staging_mode: 'romance_eligible', _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 0 };
    const prompt = window._buildStagedHeroPrompt(vs, 0, {}) || '';
    const earTextInPrompt = /softly rounded tips|ears? are small, rounded|HALF human size, rounded/i.test(prompt);

    // GUARD: only spend on a render if the de-negated ear text is actually in the prompt.
    if (!earTextInPrompt) return { rendered: false, usedReal, earTextInPrompt, promptLen: prompt.length, note: 'ear text missing — NOT rendering' };

    let img = null, err = null;
    try {
      img = await window.generateImageWithFallback({ prompt, preAssembled: true, context: 'visualize', intent: 'scene', tier: 'Clean', costTier: 'hero', shape: 'square' });
    } catch (e) { err = e && e.message; }
    return { rendered: !!img, usedReal, earTextInPrompt, promptLen: prompt.length, imgKind: img ? (String(img).slice(0, 24)) : null, imgLen: img ? String(img).length : 0, err, _img: img };
  });

  console.log('\n  setup:', JSON.stringify({ rendered: res.rendered, usedRealContract: res.usedReal, earTextInPrompt: res.earTextInPrompt, promptLen: res.promptLen, imgKind: res.imgKind, imgLen: res.imgLen, err: res.err }, null, 0));

  // Save the image if we got one.
  if (res._img) {
    let buf = null;
    if (String(res._img).startsWith('data:')) {
      buf = Buffer.from(String(res._img).split(',')[1], 'base64');
    } else {
      try { const r = await fetch(res._img); buf = Buffer.from(await r.arrayBuffer()); } catch (e) { console.error('  fetch failed:', e.message); }
    }
    if (buf) { const f = path.join(OUTDIR, 'ff_eye.png'); fs.writeFileSync(f, buf); console.log('  SAVED:', f, '(' + buf.length + ' bytes)'); }
  }
  console.log('  image-endpoint hits:', imgHits);
  await browser.close();
  process.exit(res.rendered ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
