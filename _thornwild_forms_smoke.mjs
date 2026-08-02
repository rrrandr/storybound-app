import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._thornwildFormsForAuthor==='function',{timeout:30000});
const r=await p.evaluate(()=>{
  const S=window.state; S.picks=S.picks||{}; S.picks.world='Fantasy';
  const run=(setup)=>{S._curseRomanceMode=undefined;S.fantasyRegion='';S.picks.flavors=undefined;setup(S);return window._thornwildFormsForAuthor()||'';};
  const cursedMode = run(s=>{s._curseRomanceMode='player_becoming';});
  const thornwild  = run(s=>{s.fantasyRegion='thornwild';});
  const nonCursed  = run(s=>{s.fantasyRegion='veilwood';});
  const forms=['THE WEAVER','THE RELIQUARY','THE KEEPER','THE COMMONER','THE PARASITE','THE ABSOLVERS'];
  const laws=['compulsion cycle','RELIQUARY ≠ COMMONER','NEVER invent a generic monster'];
  return {
    allFormsReach: forms.every(m=>cursedMode.includes(m)),
    missingForms: forms.filter(m=>!cursedMode.includes(m)),
    lawsReach: laws.every(m=>cursedMode.includes(m)),
    cursedLen:cursedMode.length,
    thornwildReaches: forms.every(m=>thornwild.includes(m)),
    nonCursedEmpty: nonCursed==='',
    keys: Object.keys(window._THORNWILD_FORMS||{})
  };
});
console.log('cursed story → all 6 forms reach author:', r.allFormsReach?'✓':'✗ MISSING '+r.missingForms.join(','));
console.log('cursed story → cross-form laws reach   :', r.lawsReach?'✓':'✗');
console.log('footprint (minimum-to-stop-confab)     :', r.cursedLen+'c');
console.log('Thornwild region → forms reach         :', r.thornwildReaches?'✓':'✗');
console.log('non-cursed story → NO forms (no dump)  :', r.nonCursedEmpty?'✓':'✗ leaked');
console.log('owner registry keys                    :', r.keys.join(', '));
await b.close();process.exit(0);
