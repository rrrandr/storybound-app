import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._buildFantasySpeciesIntimacyDirective==='function',{timeout:30000});
const r=await p.evaluate(()=>{
  const S=window.state; S.picks=S.picks||{}; S.picks.world='Fantasy'; S.turnCount=0;
  const test=(species,region,mustContain)=>{
    S._playerSpecies=species; S._liSpecies=''; S.fantasyRegion=region||'';
    const out=window._buildFantasySpeciesIntimacyDirective()||'';
    return { species, region:region||'(none)', reaches: mustContain.every(m=>out.includes(m)), len: out.length, missing: mustContain.filter(m=>!out.includes(m)) };
  };
  return {
    ff:  test('First Favored', 'veilwood', ['THE 6TH SENSE','MAGIC-BLINDNESS','CEREMONY ROLE']),
    kw:  test('Kwisheen', 'gloamwater', ['ANATOMY: Exactly 8','chromatophore','capsule']),
    wild_outside: test('Wilder', 'lytharyn', ['THE BECOMING FIELD','HUMAN-PASSING RULE']),   // Wilder OUTSIDE Thornwild
    human_in_thornwild: test('Human', 'thornwild', ['THE BECOMING FIELD']),                    // should NOT get Wilder physiology
  };
});
const line=(t)=>`${t.species.padEnd(14)} @${t.region.padEnd(12)} → reaches=${t.reaches?'✓':'✗'} (${t.len}c)${t.missing.length?' MISSING '+JSON.stringify(t.missing):''}`;
console.log('First Favored :', line(r.ff),   r.ff.reaches?'✓':'✗ FAIL');
console.log('Kwisheen      :', line(r.kw),   r.kw.reaches?'✓':'✗ FAIL');
console.log('Wilder outside:', line(r.wild_outside), r.wild_outside.reaches?'✓ (region-independent)':'✗ FAIL');
console.log('Human@Thornwld:', line(r.human_in_thornwild), !r.human_in_thornwild.reaches?'✓ (region ≠ species: no Wilder physiology)':'✗ FAIL — region leaked species');
await b.close();process.exit(0);
