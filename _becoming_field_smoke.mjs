import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._becomingFieldForAuthor==='function',{timeout:30000});
const r=await p.evaluate(()=>{
  const S=window.state; S.picks=S.picks||{}; S.picks.world='Fantasy';
  const run=(setup)=>{S._curseRomanceMode=undefined;S.fantasyRegion='';S.picks.flavors=undefined;setup(S);return window._becomingFieldForAuthor()||'';};
  const cursedMode = run(s=>{s._curseRomanceMode='player_becoming';});
  const thornwild  = run(s=>{s.fantasyRegion='thornwild';});
  const nonCursed  = run(s=>{s.fantasyRegion='veilwood';});
  const must=['TRANSFORMATION PRINCIPLE','ANTI-TROPE','LOVE IS NOT A CURE','RE-EXPOSURE'];
  return {
    cursedReaches: must.every(m=>cursedMode.includes(m)), cursedLen:cursedMode.length,
    thornwildReaches: must.every(m=>thornwild.includes(m)),
    nonCursedEmpty: nonCursed==='' 
  };
});
console.log('cursed story → mechanics reach author:', r.cursedReaches?'✓':'✗', '('+r.cursedLen+'c, lean)');
console.log('Thornwild region → mechanics reach   :', r.thornwildReaches?'✓':'✗');
console.log('non-cursed story → NO mechanics      :', r.nonCursedEmpty?'✓ (not dumped everywhere)':'✗ leaked');
await b.close();process.exit(0);
