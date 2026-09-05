import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._buildFantasySpeciesIntimacyDirective==='function'&&typeof window._speciesBiologyForAuthor==='function',{timeout:30000});
const r=await p.evaluate(()=>{
  const S=window.state; S.picks=S.picks||{}; S.picks.world='Fantasy'; S.turnCount=0;
  const at=(species,region)=>{S._playerSpecies=species;S._liSpecies='';S.fantasyRegion=region||'';return window._buildFantasySpeciesIntimacyDirective()||'';};
  const ffV=at('First Favored','veilwood'), ffL=at('First Favored','lytharyn');
  return {
    ff_reaches:['ALIGNMENT SENSE','MAGIC-BLINDNESS','DERMAL TRUTH'].every(m=>ffV.includes(m)),
    ff_len:ffV.length,
    ff_region_indep: ffV===ffL,               // FF biology identical regardless of region
    ff_no_cursemech: !/BECOMING FIELD|Purge War|Keeper|Ceremony/i.test(ffV),  // lean: no curse/social/regional lore
    ff_slice: ffV.slice(0,120)
  };
});
console.log('FF reaches author (lean): ', r.ff_reaches?'✓':'✗ FAIL', '('+r.ff_len+'c vs 11213c blob →', r.ff_len<3000?'SMALLER ✓':'NOT smaller ✗'+')');
console.log('FF region-independent:     ', r.ff_region_indep?'✓':'✗ FAIL');
console.log('FF excludes curse/social:  ', r.ff_no_cursemech?'✓ (no Becoming/Keeper/PurgeWar/Ceremony)':'✗ leaked non-biology');
console.log('  sample:', JSON.stringify(r.ff_slice));
await b.close();process.exit(0);
