import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._buildFantasySpeciesIntimacyDirective==='function',{timeout:30000});
const r=await p.evaluate(()=>{
  const S=window.state; S.picks=S.picks||{}; S.picks.world='Fantasy'; S.turnCount=0;
  const run=(pc,li)=>{S._playerSpecies=pc;S._liSpecies=li;S.fantasyRegion='veilwood';const o=window._buildFantasySpeciesIntimacyDirective()||'';return (o.match(/SPECIES BIOLOGY — /g)||[]).length;};
  return {
    samePC_LI: run('First Favored','First Favored'),          // expect 1 block (deduped)
    diffPC_LI: run('First Favored','Kwisheen'),               // expect 2 blocks (PC + LI)
    liReaches: run('Human','Wilder'),                         // PC Human (no entry) + LI Wilder → 1 block (LI reaches)
  };
});
console.log('PC==LI species → blocks:', r.samePC_LI, r.samePC_LI===1?'✓ (deduped)':'✗');
console.log('PC≠LI species → blocks :', r.diffPC_LI, r.diffPC_LI===2?'✓ (both consume)':'✗');
console.log('LI-only (Wilder LI)    :', r.liReaches, r.liReaches===1?'✓ (LI biology reaches author)':'✗');
await b.close();process.exit(0);
