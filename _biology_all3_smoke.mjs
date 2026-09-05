import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._buildFantasySpeciesIntimacyDirective==='function',{timeout:30000});
const r=await p.evaluate(()=>{
  const S=window.state; S.picks=S.picks||{}; S.picks.world='Fantasy'; S.turnCount=0;
  const at=(sp,rg)=>{S._playerSpecies=sp;S._liSpecies='';S.fantasyRegion=rg||'';return window._buildFantasySpeciesIntimacyDirective()||'';};
  const BLOB={'First Favored':11213,'Kwisheen':16425,'Wilder':36219};
  const check=(sp,rg,must,mustNot)=>{const o=at(sp,rg);return{sp,len:o.length,blob:BLOB[sp],reaches:must.every(m=>o.includes(m)),lean:!mustNot.some(m=>new RegExp(m,'i').test(o)),smaller:o.length<BLOB[sp]};};
  return {
    ff: check('First Favored','veilwood',['ALIGNMENT SENSE','MAGIC-BLINDNESS'],['Ceremony role','Becoming Field','Purge War','WRY']),
    kw: check('Kwisheen','gloamwater',['Exactly 8 major tentacles','CAPSULES','chromatophore'],['Syzygy','Thornwild origin','dirt-dragger','Squishies']),
    wl: check('Wilder','lytharyn',['physically human','PSYCHOLOGICALLY FIRST','GRADUAL'],['Becoming Field','Keeper','Purge War','Parasite']),
    wl_thornwild: at('Wilder','thornwild').includes('physically human'),  // region-independent
    human_thornwild: !at('Human','thornwild').includes('physically human') // region ≠ species
  };
});
const L=t=>`reaches=${t.reaches?'✓':'✗'} lean=${t.lean?'✓':'✗'} smaller=${t.smaller?'✓':'✗'} (${t.len}c vs ${t.blob}c blob)`;
console.log('First Favored:',L(r.ff), r.ff.reaches&&r.ff.lean&&r.ff.smaller?'PASS':'FAIL');
console.log('Kwisheen     :',L(r.kw), r.kw.reaches&&r.kw.lean&&r.kw.smaller?'PASS':'FAIL');
console.log('Wilder       :',L(r.wl), r.wl.reaches&&r.wl.lean&&r.wl.smaller?'PASS':'FAIL');
console.log('Wilder region-independent (Thornwild too):', r.wl_thornwild?'✓':'✗');
console.log('Human@Thornwild ≠ Wilder biology         :', r.human_thornwild?'✓':'✗');
await b.close();process.exit(0);
