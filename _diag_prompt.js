const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof window._buildStagedHeroPrompt === 'function' && typeof window._buildStagedRegionContract === 'function', { timeout: 40000 });
  const r = await p.evaluate(() => {
    const s = window.state; s.gnArtist='ender_bond'; s.renderMode='staged_story_mode';
    s.picks={world:'Fantasy'}; s._playerSpecies='human'; s._liSpecies='kwisheen'; s.worldInstanceId='diag';
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState:{ background:'a bioluminescent tidal grotto, Gloamwater Bay, glowing coral — Kwisheen' }, phases:[] });
    const vs={ background:'a bioluminescent tidal grotto, Gloamwater Bay, glowing coral', camera:'wide_establishing', pc_visibility:'back_only', li_position:'standing_apart', li_expression:'curious', li_visibility:'revealed', pc_wardrobe:'sea-silk dress', li_wardrobe:'gem loincloth', lighting:'low_cool', social_staging_mode:'stranger_awkward', _phaseCharacters:['protagonist','li'], _phaseIdx:0 };
    const prompt = window._buildStagedHeroPrompt(vs,0,{})||'';
    const contract = s._stagedRegionContract && s._stagedRegionContract.textBlock || '';
    return {
      underwater: /UNDERWATER PHYSICS/.test(prompt),
      billow: /BILLOW and undulate/.test(prompt),
      scaled: /SCALED \/ pebbled cephalopod hide/.test(contract),
      adorn: /ADORNMENT \(HARD — Kwisheen are NOT nude\)/.test(contract),
      tenthair: /TENTACLE-DREADLOCKS/.test(contract),
      anchor: (window._gnSpeciesAnchorPaths||[]).map(x=>x&&x.path||x).join(',').includes('Octofolk')
    };
  });
  console.log(JSON.stringify(r,null,2));
  await b.close();
})();
